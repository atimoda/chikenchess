import type { ParameterRange } from './model'
import type { VoiceSpec } from './runtime-types'

export type LoopClock = { total: number; loops: number; restart: boolean; steps: { start: number; end: number; bars: number; offset: number; variation: number }[] }

/** Unique loop ordinal on the transport clock, including section re-entries. */
export function loopOrdinal(cycle: number, clock: LoopClock) {
  const local = ((cycle % clock.total) + clock.total) % clock.total
  const step = clock.steps.find(step => local < step.end) ?? clock.steps[clock.steps.length - 1]
  if (!clock.restart) return Math.floor(cycle / step.bars) * 8 + step.variation
  return Math.floor(cycle / clock.total) * clock.loops + step.offset + Math.floor((local - step.start + 1e-9) / step.bars)
}

export function loopClockCode(clock: LoopClock) {
  return `const c=${JSON.stringify(clock)}; const t=Number(time); const local=((t%c.total)+c.total)%c.total; const step=c.steps.find(s=>local<s.end)||c.steps[c.steps.length-1]; const index=c.restart?Math.floor(t/c.total)*c.loops+step.offset+Math.floor((local-step.start+1e-9)/step.bars):Math.floor(t/step.bars)*8+step.variation;`
}

const variationBars = (voice: VoiceSpec, index: number) => {
  return voice.manual ? 1 : voice.pianoRolls[index % voice.pianoRolls.length].bars
}

/** Shared recipe for the compiler and export: no random draws on UI renders. */
export function loopRange(voice: VoiceSpec, range: ParameterRange, target: 'drive' | 'reverb' | 'swing' | 'octave' | 'lpf') {
  const index = /^\d+$/.test(voice.sectionPattern) ? Number(voice.sectionPattern) : 0
  // Each explicit MIDI bank owns its complete loop duration.
  const bars = variationBars(voice, index)
  const offset = { drive: 101, reverb: 211, swing: 307, octave: 401, lpf: 503 }[target]
  let start = 0, loops = 0
  const steps = voice.performance?.steps.map(step => {
    const bars = variationBars(voice, step.variation)
    const duration = step.beats / (voice.beatsPerBar ?? 4)
    const result = { start, end: start + duration, bars, offset: loops, variation: step.variation }
    start += duration; loops += Math.ceil(duration / bars)
    return result
  })
  const clock: LoopClock | undefined = steps ? { total: start, loops, steps, restart: voice.performance!.restart } : undefined
  const selection = !clock && !voice.manual && !/^\d+$/.test(voice.sectionPattern) && voice.pianoRolls.length > 1
    ? { pattern: voice.sectionPattern, bars: voice.pianoRolls.map((_, index) => variationBars(voice, index)), restart: false } : undefined
  return { min: Math.min(range.first, range.second), max: Math.max(range.first, range.second),
    bars, seed: (voice.piece.slot + 1) * 409 + offset + index * 17, clock, selection }
}
