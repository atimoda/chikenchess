// Superdough controls for the optional sound-design fields of an instrument.
// Every field is opt-in: an instrument without them produces the controls it always did.
import { DELAY_TIMES, type Instrument, type LfoShape } from './model'

export interface PanLfo { period: number; depth: number; shape: LfoShape; center: number }
export interface DuckTrigger { orbits: number[]; depth: number[]; release: number[] }

/** Strudel continuous signals for each LFO shape. */
export const LFO_SIGNALS: Record<LfoShape, 'sine' | 'tri' | 'saw' | 'square'> = { sine: 'sine', triangle: 'tri', saw: 'saw', square: 'square' }
const SUPERDOUGH_SHAPES: Record<LfoShape, string> = { sine: 'sine', triangle: 'tri', saw: 'saw', square: 'square' }

/** LFO period in cycles (one cycle is one bar). Hz follows the current tempo. */
export function lfoPeriod(instrument: Instrument, cps: number) {
  const rate = instrument.lfoRate ?? 1
  return instrument.lfoUnit === 'hz' ? cps / Math.max(.05, rate) : Math.max(1 / 16, Math.min(16, rate))
}

/** True when the piece needs its own effect bus: a custom delay line or a sidechain target. */
export function needsOwnBus(instrument: Instrument) {
  const customDelay = instrument.delayTime !== undefined || instrument.delayFeedback !== undefined
  return customDelay || isDucked(instrument)
}
export const isDucked = (instrument: Instrument) => !!instrument.duckSource && (instrument.duckDepth ?? .7) > 0

export function soundDesignControls(instrument: Instrument, options: { bpm: number; beatsPerBar: number; unpitched: boolean; sample: boolean }) {
  const controls: Record<string, number | string> = {}
  const cps = options.bpm / (60 * options.beatsPerBar)
  if (instrument.resonance) controls.lpq = instrument.resonance
  if (instrument.filterEnv) Object.assign(controls, { lpenv: instrument.filterEnv, lpattack: instrument.filterAttack ?? .005, lpdecay: instrument.filterDecay ?? .14 })
  if (instrument.delayTime) controls.delaytime = 60 / options.bpm * DELAY_TIMES[instrument.delayTime]
  if (instrument.delayFeedback !== undefined) controls.delayfeedback = instrument.delayFeedback
  if (!options.unpitched && instrument.vibrato && instrument.vibratoDepth) Object.assign(controls, { vib: instrument.vibrato, vibmod: instrument.vibratoDepth })
  if (!options.sample && instrument.fmIndex) Object.assign(controls, { fmi: instrument.fmIndex, fmh: instrument.fmRatio ?? 2 })
  if (!options.sample && instrument.sound === 'supersaw') {
    if (instrument.unison !== undefined) controls.unison = instrument.unison
    if (instrument.detune !== undefined) controls.detune = instrument.detune
    if (instrument.spread !== undefined) controls.spread = instrument.spread
  }
  if (options.sample && instrument.sampleLoop) {
    const start = instrument.loopStart ?? 0, end = instrument.loopEnd ?? 1
    if (end > start) Object.assign(controls, { loop: 1, loopBegin: start, loopEnd: end })
  }
  const depth = instrument.lfoDepth ?? 0
  if (instrument.lfoTarget && depth > 0) {
    const period = lfoPeriod(instrument, cps), shape = SUPERDOUGH_SHAPES[instrument.lfoShape ?? 'sine']
    // Superdough's filter LFO swings ±depth/2 of the cutoff, so 1.8 reaches ±90 %.
    if (instrument.lfoTarget === 'lpf') Object.assign(controls, { lpsync: 1 / period, lpdepth: depth * 1.8, lpshape: shape })
    if (instrument.lfoTarget === 'gain') Object.assign(controls, { tremolosync: 1 / period, tremolodepth: depth, tremoloshape: shape })
    if (instrument.lfoTarget === 'pitch' && !options.unpitched) Object.assign(controls, { vib: cps / period, vibmod: depth * 2 })
  }
  return controls
}

export function panLfo(instrument: Instrument, center: number, bpm: number, beatsPerBar: number): PanLfo | undefined {
  const depth = instrument.lfoDepth ?? 0
  if (instrument.lfoTarget !== 'pan' || depth <= 0) return undefined
  return { period: lfoPeriod(instrument, bpm / (60 * beatsPerBar)), depth, shape: instrument.lfoShape ?? 'sine', center }
}

/** The same team's piece standing on the ducked piece's source slot (black mirrors white). */
export function duckSourceId(piece: { color: 'w' | 'b' }, slot: string) {
  return `${piece.color}:${piece.color === 'w' ? slot : `${slot[0]}${9 - Number(slot[1])}`}`
}
