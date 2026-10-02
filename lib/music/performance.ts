import type { Instrument } from './model'
import { DEFAULT_ARRANGEMENT, arrangementPosition, pieceSection, type Arrangement } from './arrangement'

/** Compiler-only form derived from the global arrangement. Never persisted. */
export interface Performance {
  restart: boolean
  steps: {beats:number;variation:number;transpose:number;active:boolean}[]
}

/** Square brackets preserve the intended total length, unlike slow angle groups. */
export function performancePattern(performance: Performance, indices = false, beatsPerBar = 4) {
  const beats = performance.steps.reduce((sum, step) => sum + step.beats, 0)
  const steps = performance.steps.map((step, index) => `${indices ? index : step.variation}@${step.beats}`)
  return `[${steps.join(' ')}]/${beats / beatsPerBar}`
}

export function performancePosition(performance: Performance, cycle: number, beatsPerBar = 4) {
  const total = performance.steps.reduce((sum, step) => sum + step.beats, 0)
  const time = ((cycle * beatsPerBar) % total + total) % total
  let start = 0
  for (let index = 0; index < performance.steps.length; index++) {
    const step = performance.steps[index]
    if (time < start + step.beats) return {index, step, progress: (time - start) / step.beats}
    start += step.beats
  }
  return {index: 0, step: performance.steps[0], progress: 0}
}

/** Editor phase from authored data; drawing a piano roll never compiles audio patterns. */
export function variationPosition(instrument: Instrument, section: number, cycle: number, beatsPerBar = 4, override?: number, arrangement?: Arrangement) {
  const count = instrument.pianoRolls.length
  const plan = arrangement ?? DEFAULT_ARRANGEMENT
  const position = arrangementPosition(plan,cycle,beatsPerBar)
  const step = pieceSection(instrument,plan,position.index)
  const variation = ((override ?? instrument.selectedVariation ?? step.variation) % count + count) % count
  return { variation, present:step.active,
    phase: (instrument.arrangement?.restart ?? false) ? position.progress * position.section.beats / beatsPerBar : cycle }
}
