import { loopRange, type LoopClock } from './loop-ranges'
import type { RangeFrequency } from './model'
import type { VoiceSpec, StrudelPattern } from './runtime-types'

type Target = 'drive' | 'reverb' | 'swing' | 'octave' | 'lpf'
interface EventRange { target: Target; min: number; max: number; seed: number; frequency: RangeFrequency; bars: number; clock?: LoopClock; selection?: { pattern: string; bars: number[]; restart: boolean } }
interface RangeConfig { ranges: EventRange[]; beats: number; octave: number; mix: number }

/** Octave, S/N effects and filter ranges are resolved at the original attack. */
export function eventRangeConfig(voice: VoiceSpec): RangeConfig {
  const ranges: EventRange[] = []
  for (const target of ['drive', 'reverb', 'swing', 'octave', 'lpf'] as const) {
    const range = voice.instrument[target === 'drive' ? 'driveRange' : target === 'reverb' ? 'reverbRange' : target === 'swing' ? 'swingRange' : target === 'lpf' ? 'lpfRange' : 'octaveRange']
    if (!range || (target !== 'lpf' && (!range.frequency || (target !== 'octave' && range.frequency === 'loop')))) continue
    if (target === 'octave' && voice.unpitched || target === 'swing' && voice.manual) continue
    const recipe = loopRange(voice, range, target)
    if (target === 'lpf' && voice.previewFilterLimit !== undefined) { recipe.min = Math.min(recipe.min, voice.previewFilterLimit); recipe.max = Math.min(recipe.max, voice.previewFilterLimit) }
    ranges.push({ target, ...recipe, frequency: range.frequency ?? 'loop' })
  }
  return { ranges, beats: voice.beatsPerBar ?? 4, octave: voice.instrument.octave, mix: voice.instrument.distortionMix ?? .25 }
}

/** Self-contained on purpose: this exact function is embedded in exported Strudel.
 * Values belong to the original onset, not query windows or React renders. Chords share a draw.
 * Swing expands the query backwards then clips shifted parts, so small scheduler windows
 * neither lose nor duplicate delayed attacks. No mutable random generator or transport writes.
 */
export function eventRangePattern(pattern: StrudelPattern, config: RangeConfig, selector?: StrudelPattern): StrudelPattern {
  const random = (seed: number, index: number) => {
    let hash = (Math.round(index * 1048576) ^ Math.imul(seed, 0x9e3779b1)) >>> 0
    hash = Math.imul(hash ^ hash >>> 16, 0x21f0aaad)
    hash = Math.imul(hash ^ hash >>> 15, 0x735a2d97)
    return ((hash ^ hash >>> 15) >>> 0) / 4294967296
  }
  const sample = (range: EventRange, time: number) => {
    let index = time
    if (range.frequency !== 'note') {
      const clock = range.clock
      if (clock) {
        const local = ((time % clock.total) + clock.total) % clock.total
        const stepIndex = clock.steps.findIndex(step => local < step.end)
        const step = clock.steps[stepIndex < 0 ? clock.steps.length - 1 : stepIndex]
        index = range.frequency === 'section' ? Math.floor(time / clock.total) * clock.steps.length + stepIndex
          : clock.restart ? Math.floor(time / clock.total) * clock.loops + step.offset + Math.floor((local - step.start + 1e-9) / step.bars)
          : Math.floor(time / step.bars) * 8 + step.variation
      } else if (selector) {
        const section = selector.queryArc(time, time + .000001)[0]
        const start = Number(section?.whole?.begin ?? 0)
        const selection = range.selection
        const variation = selection ? Number(section?.value ?? 0) % selection.bars.length : 0
        index = range.frequency === 'section' ? start : selection
          ? selection.restart ? Math.floor(start * 4096) + Math.floor((time - start) / selection.bars[variation]) * 8 + variation
            : Math.floor(time / selection.bars[variation]) * selection.bars.length + variation
          : Math.floor(time / range.bars)
      } else index = range.frequency === 'section' ? 0 : Math.floor(time / range.bars)
    }
    const unit = random(range.seed, index)
    return range.target === 'octave' ? range.min + Math.min(range.max - range.min, Math.floor(unit * (range.max - range.min + 1)))
      : range.min + unit * (range.max - range.min)
  }
  const swing = config.ranges.find(range => range.target === 'swing')
  const margin = swing ? swing.max / (2 * config.beats) : 0
  const Pattern = pattern.constructor as new (query: (state: any) => any[]) => StrudelPattern
  return new Pattern(state => {
    const span = state.span
    const expanded = margin ? state.withSpan((arc: any) => new arc.constructor(arc.begin.sub(margin), arc.end.add(margin))) : state
    const haps = pattern.query(expanded)
    const starts = swing?.frequency === 'note' ? [...new Set<number>(haps.map((hap: any) => Number(hap.whole?.begin ?? hap.part.begin)))].sort((a, b) => a - b) : []
    const nextAttack = new Map(starts.slice(0, -1).map((time, index) => [time, starts[index + 1]]))
    return haps.flatMap((hap: any) => {
      const time = Number(hap.whole?.begin ?? hap.part.begin)
      let delay = 0
      let changed = hap.withValue((original: any) => {
        const value = { ...original }
        for (const range of config.ranges) {
          const amount = sample(range, time)
          if (range.target === 'lpf') { value.lpf = amount; value.cutoff = amount }
          if (range.target === 'reverb') value.room = amount
          if (range.target === 'drive') {
            if (amount === 0) { delete value.distort; delete value.distortvol }
            else { value.distort = amount; value.distortvol = config.mix }
          }
          if (range.target === 'octave' && value.note !== undefined) value.note = Number(value.note) + (amount - config.octave) * 12
          if (range.target === 'swing' && ((time * config.beats) % 1 + 1) % 1 >= .5 - 1e-9) delay = amount / (2 * config.beats)
        }
        return value
      })
      if (swing?.frequency === 'note' && nextAttack.has(time)) delay = Math.min(delay, (nextAttack.get(time)! - time) * .49)
      if (delay) changed = changed.withSpan((arc: any) => arc.withTime((time: any) => time.add(delay)))
      const part = changed.part.intersection(span)
      if (!part) return []
      return [new hap.constructor(changed.whole, part, changed.value, changed.context)]
    })
  })
}
