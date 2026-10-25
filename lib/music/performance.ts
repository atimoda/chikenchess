import type { Instrument } from './model'
import { DEFAULT_ARRANGEMENT, arrangementPosition, pieceSection, pieceStep, type Arrangement } from './arrangement'

/** Compiler-only form derived from the global arrangement. Never persisted. */
export interface Performance {
  restart: boolean
  steps: {beats:number;variation:number;transpose:number;active:boolean;fill?:{variation:number;beats:number}}[]
}

/** Square brackets preserve the intended total length, unlike slow angle groups. */
/** Fill banks follow the section banks when indices are used: steps.length + n for the n-th fill. */
export function performancePattern(performance: Performance, indices = false, beatsPerBar = 4) {
  const beats = performance.steps.reduce((sum, step) => sum + step.beats, 0)
  let fills = 0
  const steps = performance.steps.map((step, index) => {
    const main = `${indices ? index : step.variation}`
    if (!step.fill) return `${main}@${step.beats}`
    const fill = indices ? performance.steps.length + fills++ : step.fill.variation
    return `${main}@${step.beats - step.fill.beats} ${fill}@${step.fill.beats}`
  })
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
  const plan = arrangement ?? DEFAULT_ARRANGEMENT
  const position = arrangementPosition(plan,cycle,beatsPerBar)
  const step = pieceStep(instrument,pieceSection(instrument,plan,position.index),override)
  return { variation:step.variation, present:step.active,
    phase: (instrument.arrangement?.restart ?? false) ? position.progress * position.section.beats / beatsPerBar : cycle }
}
