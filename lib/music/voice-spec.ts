// Resolve a game/Creative snapshot to per-piece control values, without querying Strudel.
import { performancePattern } from './performance'
import { DEFAULT_ARRANGEMENT, piecePerformance } from './arrangement'
import { beatsPerBar } from './meter'
import { DEFAULT_MOVEMENT, degreeToMidi, instrumentFor } from './model'
import { sampleRegistration } from './sample-banks'
import type { MusicSnapshot, Preview, VoiceSpec } from './runtime-types'
import { HARMONY_PLANS, harmonyFrame, type HarmonyPlanId } from './harmony'
import { duckSourceId, isDucked, needsOwnBus, panLfo, soundDesignControls } from './sound-design'

// Desktop loops share four effect buses; constrained devices use one per team.
// Preview voices stay isolated so cancelling a gesture can remove its exact tail.
function effectOrbit(piece: { color: 'w' | 'b'; slot: number }, audition: boolean, effectBuses: 2 | 4) {
  if (audition) return 64 + piece.slot
  if (effectBuses === 2) return piece.color === 'w' ? 0 : 1
  return (piece.color === 'w' ? 0 : 2) + piece.slot % 2
}
// Custom delay lines and sidechain targets own a bus, so their settings never leak to peers.
const OWN_BUS = 32, OWN_BUS_LIMIT = 6

function chordVoicings(plan: HarmonyPlanId, scale: readonly string[], octave: number, offset: number, pitch: number, roots?: readonly number[]) {
  const degrees=roots??HARMONY_PLANS[plan].degrees
  let previous:number[]|undefined
  return degrees.map((_,section)=>{
    const frame=harmonyFrame(plan,scale,section,roots?.[section])
    const root=frame.chordIntervals
      ? frame.chordIntervals.map(interval=>degreeToMidi(frame.degree+offset,scale,octave)+interval+12*Math.log2(pitch))
      : frame.chordDegrees.map(degree=>degreeToMidi(degree+offset,scale,octave)+12*Math.log2(pitch))
    const inversions=Array.from({length:root.length},(_,index)=>[...root.slice(index),...root.slice(0,index).map(note=>note+12)]).flatMap(notes=>[-12,0,12].map(shift=>notes.map(note=>note+shift)))
    const center=degreeToMidi(frame.degree+offset,scale,octave)+12*Math.log2(pitch)+4
    const voiced=inversions.reduce((best,candidate)=>{
      const movement=previous?candidate.reduce((sum,n,i)=>sum+Math.abs(n-previous![i]),0):Math.abs(candidate.reduce((a,b)=>a+b,0)/candidate.length-center)
      const bestMovement=previous?best.reduce((sum,n,i)=>sum+Math.abs(n-previous![i]),0):Math.abs(best.reduce((a,b)=>a+b,0)/best.length-center)
      return movement<bestMovement?candidate:best
    })
    previous=voiced
    return voiced
  })
}

export function voiceSpecs(state: MusicSnapshot, preview: Preview | null, effectBuses: 2 | 4 = 4): VoiceSpec[] {
  let ownBuses = 0
  const specs: VoiceSpec[] = state.pieces.filter(p => (state.playing && p.active) || p.id === preview?.id).map(piece => {
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
    const toMidi = (degree: number, harmonyOffset=0) => unpitched ? 0 : degreeToMidi(degree + offset + harmonyOffset, state.scale, instrument.octave) + 12 * Math.log2(pitch)
    // Board performance plays a single scale degree, not the MIDI sequence.
    const sourceRolls = manual ? [{bars:1,notes:[{start:0,duration:1,degree:0,velocity:1}]}] : instrument.pianoRolls
    const harmonyPlan=state.harmony??'static'
    const plan = state.arrangement ?? DEFAULT_ARRANGEMENT
    const roots = plan.sections.map((_,index) => HARMONY_PLANS[harmonyPlan].degrees[index % HARMONY_PLANS[harmonyPlan].degrees.length])
    const melodic = !manual && !unpitched && instrument.behavior !== 'pulse'
    const generatedChords=!manual&&!unpitched&&instrument.behavior==='sustain'&&harmonyPlan!=='static'&&harmonyPlan!=='kit'
      ? chordVoicings(harmonyPlan,state.scale,instrument.octave,offset,pitch,roots):undefined
    const lpf = Math.min(fx?.lpf ?? instrument.lpf, audition && mapping.previewFilter ? 800 + Number(square[1]) * 1800 : 20000)
    const ownBus = !audition && needsOwnBus(instrument) && ownBuses < OWN_BUS_LIMIT && ++ownBuses > 0
    const design = soundDesignControls(instrument, { bpm: state.bpm, beatsPerBar: beatsPerBar(state.meter), unpitched, sample: source?.kind === 'sample' })
    if (!ownBus) { delete design.delaytime; delete design.delayfeedback }
    const pan = Math.max(0, Math.min(1, 0.5 + ((square.charCodeAt(0) - 97) / 7 - 0.5) * mapping.panWidth + (fx?.pan ?? 0) / 2))
    const performance = manual ? undefined : piecePerformance(instrument,plan,state.sectionOverrides?.[piece.id],beatsPerBar(state.meter))
    const harmonic = melodic ? {pulses:beatsPerBar(state.meter),sections:plan.sections.map((section,index) => {
      const step = performance!.steps[index]
      // The fill bar harmonizes with its section: its notes join the section's map.
      const roll = step.fill ? {...sourceRolls[step.variation],notes:[...sourceRolls[step.variation].notes,...sourceRolls[step.fill.variation].notes]} : sourceRolls[step.variation]
      const sequence = harmonyPlan === 'kit' ? section.harmony ?? [0] : [roots[index]]
      return {beats:section.beats,transpose:step.transpose,notes:sequence.map(root => Object.fromEntries(roll.notes.map(note => [String(Math.round(toMidi(note.degree)*1e6)),
        generatedChords ? generatedChords[index] : [toMidi(note.degree,root)]])))}
    })} : undefined
    return {
      performance,
      harmonic,
      beatsPerBar: beatsPerBar(state.meter),
      key: `${piece.id}:${audition ? 'preview' : 'loop'}`, piece, square, preview: audition, manual,
      previewFilterLimit: audition && mapping.previewFilter ? 800 + Number(square[1]) * 1800 : undefined,
      orbit: ownBus ? OWN_BUS + piece.slot : effectOrbit(piece, audition, effectBuses),
      ...(ownBus ? { ownBus: true } : {}),
      ...(manual ? {} : { panLfo: panLfo(instrument, pan, state.bpm, beatsPerBar(state.meter)) }),
      pianoRolls: sourceRolls.map(roll => ({...roll,notes:(generatedChords ? [...new Map(roll.notes.map(note=>[note.start,note])).values()] : roll.notes).map(note=>({...note,degree:toMidi(note.degree)}))})),
      sectionPattern: performance ? performancePattern(performance, false, beatsPerBar(state.meter)) : '0',
      instrument,
      unpitched,
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
        pan,
        room: fx?.reverb ?? 0.12,
        delay: fx?.delay ?? 0,
        delaytime: 60 / state.bpm * 0.75,
        ...design,
      },
    }
  })
  return withSidechain(specs)
}

/** Each sidechain source hit ducks the buses of the pieces that listen to it. */
function withSidechain(specs: VoiceSpec[]) {
  const loops = specs.filter(voice => !voice.preview)
  const byId = new Map(loops.map(voice => [voice.piece.id, voice]))
  const triggers = new Map<string, { orbits: number[]; depth: number[]; release: number[] }>()
  for (const target of loops) {
    if (!target.ownBus || !isDucked(target.instrument)) continue
    const slot = target.instrument.duckSource!
    const own = duckSourceId(target.piece, slot), other = duckSourceId({ color: target.piece.color === 'w' ? 'b' : 'w' }, slot)
    const source = byId.get(own) ?? byId.get(other)
    if (!source || source === target) continue
    const trigger = triggers.get(source.key) ?? { orbits: [], depth: [], release: [] }
    trigger.orbits.push(target.orbit); trigger.depth.push(target.instrument.duckDepth ?? .7); trigger.release.push(target.instrument.duckRelease ?? .18)
    triggers.set(source.key, trigger)
  }
  return triggers.size ? specs.map(voice => triggers.has(voice.key) ? { ...voice, duck: triggers.get(voice.key) } : voice) : specs
}
