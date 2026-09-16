// Resolve a game/Creative snapshot to per-piece control values, without querying Strudel.
import { performancePattern } from './performance'
import { DEFAULT_MOVEMENT, degreeToMidi, instrumentFor } from './model'
import { sampleRegistration } from './sample-banks'
import type { MusicSnapshot, Preview, VoiceSpec } from './runtime-types'

export function voiceSpecs(state: MusicSnapshot, preview: Preview | null): VoiceSpec[] {
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
    const toMidiPattern = (notes: string) => notes.replace(/(^|[\s[<,])(-?\d+)/g, (_, prefix, degree) => `${prefix}${unpitched ? 0 : degreeToMidi(Number(degree) + offset, state.scale, instrument.octave) + 12 * Math.log2(pitch)}`)
    // Board performance plays a single scale degree, not the sequence/groove.
    const phrases = (manual ? ['0'] : instrument.phrases?.length ? instrument.phrases : [instrument.notes]).map(toMidiPattern)
    const notes = phrases[0]
    const lpf = Math.min(fx?.lpf ?? instrument.lpf, audition && mapping.previewFilter ? 800 + Number(square[1]) * 1800 : 20000)
    const performance = !manual && state.sectionOverrides?.[piece.id]===undefined && instrument.selectedVariation===undefined ? instrument.performance : undefined
    return {
      performance,
      key: `${piece.id}:${audition ? 'preview' : 'loop'}`, piece, square, preview: audition, manual,
      orbit: piece.slot + (audition ? 64 : 0), notes,
      phrases,
      pianoRolls: manual ? undefined : instrument.pianoRolls?.map(roll=>roll?{...roll,notes:roll.notes.map(n=>({...n,degree:Number(toMidiPattern(String(n.degree)))}))}:null),
      sectionPattern: performance ? performancePattern(performance) : state.sectionOverrides?.[piece.id] !== undefined ? String(state.sectionOverrides[piece.id]) : instrument.selectedVariation !== undefined ? String(instrument.selectedVariation) : state.sectionPattern ?? '0',
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
