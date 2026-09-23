// Resolve a game/Creative snapshot to per-piece control values, without querying Strudel.
import { performancePattern } from './performance'
import { beatsPerBar } from './meter'
import { DEFAULT_MOVEMENT, degreeToMidi, instrumentFor } from './model'
import { sampleRegistration } from './sample-banks'
import type { MusicSnapshot, Preview, VoiceSpec } from './runtime-types'
import { HARMONY_PLANS, harmonyFrame, type HarmonyPlanId } from './harmony'

const gcd = (a:number,b:number):number => b ? gcd(b,a%b) : a
const lcm = (a:number,b:number) => a / gcd(a,b) * b

// Desktop loops share four effect buses; constrained devices use one per team.
// Preview voices stay isolated so cancelling a gesture can remove its exact tail.
function effectOrbit(piece: { color: 'w' | 'b'; slot: number }, audition: boolean, effectBuses: 2 | 4) {
  if (audition) return 64 + piece.slot
  if (effectBuses === 2) return piece.color === 'w' ? 0 : 1
  return (piece.color === 'w' ? 0 : 2) + piece.slot % 2
}

function chordVoicings(plan: HarmonyPlanId, scale: readonly string[], octave: number, offset: number, pitch: number) {
  const degrees=HARMONY_PLANS[plan].degrees
  let previous:number[]|undefined
  return degrees.map((_,section)=>{
    const frame=harmonyFrame(plan,scale,section)
    const root=frame.chordDegrees.map(degree=>degreeToMidi(degree+offset,scale,octave)+12*Math.log2(pitch))
    const inversions=[root,[root[1],root[2],root[0]+12],[root[2],root[0]+12,root[1]+12]].flatMap(notes=>[-12,0,12].map(shift=>notes.map(note=>note+shift)))
    const center=degreeToMidi(frame.degree+offset,scale,octave)+12*Math.log2(pitch)+4
    const voiced=inversions.reduce((best,candidate)=>{
      const movement=previous?candidate.reduce((sum,n,i)=>sum+Math.abs(n-previous![i]),0):Math.abs(candidate.reduce((a,b)=>a+b,0)/3-center)
      const bestMovement=previous?best.reduce((sum,n,i)=>sum+Math.abs(n-previous![i]),0):Math.abs(best.reduce((a,b)=>a+b,0)/3-center)
      return movement<bestMovement?candidate:best
    })
    previous=voiced
    return voiced
  })
}

function chordPattern(pattern:string,notes:readonly number[]){
  const chord=`[${notes.join(',')}]`, placeholders:string[]=[]
  const collapsed=pattern.replace(/\[\s*-?\d+(?:\s*,\s*-?\d+)+\s*\]/g,()=>{const key=`__CHORD_${placeholders.length}__`;placeholders.push(key);return key})
  return collapsed.replace(/(^|[\s[<,])(-?\d+)/g,(_,prefix)=>`${prefix}${chord}`).replace(/__CHORD_\d+__/g,chord)
}

export function voiceSpecs(state: MusicSnapshot, preview: Preview | null, effectBuses: 2 | 4 = 4): VoiceSpec[] {
  return state.pieces.filter(p => (state.playing && p.active) || p.id === preview?.id).map(piece => {
    const audition = piece.id === preview?.id
    const manual = audition && preview?.mode === 'manual'
    const square = audition ? preview!.square : piece.square
    const instrument = state.instruments?.[piece.id] ?? instrumentFor(piece)
    const mapping = state.mappings?.[piece.id] ?? DEFAULT_MOVEMENT
    const fx = state.effects[piece.id]
    const advance = piece.color === 'w' ? Number(square[1]) - Number(piece.origin[1]) : Number(piece.origin[1]) - Number(square[1])
    const fileOffset = square.charCodeAt(0) - piece.origin.charCodeAt(0)
    const degreeLimit = state.mappings?.[piece.id] ? 12 : 4
    const offset = instrument.behavior === 'pulse' ? 0 : Math.max(-degreeLimit, Math.min(degreeLimit, Math.round(fileOffset * mapping.fileDegrees + Math.floor(advance * mapping.rankDegrees))))
    const source = instrument.source
    const unpitched = source?.kind === 'sample' && !source.pitched
    const pitch = (fx?.pitch ?? 1) * (state.tuning ?? 1)
    const toMidiPattern = (notes: string, harmonyOffset=0) => notes.replace(/(^|[\s[<,])(-?\d+)/g, (_, prefix, degree) => `${prefix}${unpitched ? 0 : degreeToMidi(Number(degree) + offset + harmonyOffset, state.scale, instrument.octave) + 12 * Math.log2(pitch)}`)
    // Board performance plays a single scale degree, not the sequence/groove.
    const sourcePhrases = manual ? ['0'] : instrument.phrases?.length ? instrument.phrases : [instrument.notes]
    const sourceRolls = manual ? undefined : instrument.pianoRolls
    const harmonyPlan=state.harmony??'static'
    const harmony = manual || unpitched || instrument.behavior==='pulse' ? [0] : HARMONY_PLANS[harmonyPlan].degrees
    const generatedChords=!manual&&!unpitched&&instrument.behavior==='sustain'&&harmonyPlan!=='static'
      ? chordVoicings(harmonyPlan,state.scale,instrument.octave,offset,pitch):undefined
    const sourceBanks=Math.max(sourcePhrases.length,sourceRolls?.length??0,1)
    const bankCount=Math.min(24,lcm(sourceBanks,harmony.length))
    const phrases=Array.from({length:bankCount},(_,index)=>generatedChords
      ? chordPattern(sourcePhrases[index%sourcePhrases.length],generatedChords[index%generatedChords.length])
      : toMidiPattern(sourcePhrases[index%sourcePhrases.length],harmony[index%harmony.length]))
    const notes = phrases[0]
    const lpf = Math.min(fx?.lpf ?? instrument.lpf, audition && mapping.previewFilter ? 800 + Number(square[1]) * 1800 : 20000)
    const performance = !manual && state.sectionOverrides?.[piece.id]===undefined && instrument.selectedVariation===undefined ? instrument.performance : undefined
    return {
      performance,
      beatsPerBar: beatsPerBar(state.meter),
      key: `${piece.id}:${audition ? 'preview' : 'loop'}`, piece, square, preview: audition, manual,
      orbit: effectOrbit(piece, audition, effectBuses), notes,
      phrases,
      pianoRolls: sourceRolls&&Array.from({length:bankCount},(_,index)=>{const roll=sourceRolls[index%sourceRolls.length];if(!roll)return null
        if(generatedChords){
          const chord=generatedChords[index%generatedChords.length]
          const onsets=[...new Map(roll.notes.map(note=>[note.start,note])).values()]
          return {...roll,notes:onsets.flatMap(note=>chord.map(degree=>({...note,degree})))}
        }
        return {...roll,notes:roll.notes.map(n=>({...n,degree:Number(toMidiPattern(String(n.degree),harmony[index%harmony.length]))}))}
      }),
      sectionPattern: performance ? performancePattern(performance, false, beatsPerBar(state.meter)) : state.sectionOverrides?.[piece.id] !== undefined ? String(state.sectionOverrides[piece.id]) : instrument.selectedVariation !== undefined ? String(instrument.selectedVariation) : state.sectionPattern ?? '0',
      // A solo should be audible immediately, even when the arrangement mask
      // normally holds this layer back until a later section.
      mask: audition || state.soloId === piece.id || piece.checkEnsemble ? undefined : instrument.mask,
      instrument,
      unpitched,
      groove: !manual && instrument.groove ? state.grooves?.[instrument.groove.groove]?.lanes[instrument.groove.lane] : undefined,
      automations: instrument.automations,
      controls: {
        ...(instrument.distortion ? {distort:`${instrument.distortion}:${instrument.distortionMix??.25}`} : {}),
        ...(!unpitched && instrument.pitchEnvelope ? {penv:instrument.pitchEnvelope,patt:instrument.pitchAttack??.15} : {}),
        s: source?.kind === 'sample' ? sampleRegistration(source).sound : instrument.sound,
        ...(unpitched ? { speed: pitch } : {}),
        gain: instrument.gain * (fx?.gain ?? 1),
        attack: instrument.attack, decay: fx?.decay ?? instrument.decay ?? 0.15,
        sustain: instrument.sustain ?? (instrument.behavior === 'pulse' ? 0 : 0.55),
        release: instrument.release,
        // Percussion gates are short even when the rhythmic cell lasts a beat.
        clip: manual ? 1 : instrument.clip ?? (instrument.behavior === 'pulse' ? 0.12 : instrument.behavior === 'sustain' ? 0.95 : 0.7),
        lpf, hpf: fx?.hpf ?? instrument.hpf,
        pan: Math.max(0, Math.min(1, 0.5 + ((square.charCodeAt(0) - 97) / 7 - 0.5) * mapping.panWidth + (fx?.pan ?? 0) / 2)),
        room: fx?.reverb ?? 0.12,
        delay: fx?.delay ?? 0,
        delaytime: 60 / state.bpm * 0.75,
      },
    }
  })
}
