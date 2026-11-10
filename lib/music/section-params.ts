// Per-section sound parameters of a piece. A section stores only the values it changes;
// everything else follows the instrument ("All"). No React, AudioContext or Strudel here.
import { z } from 'zod'
import type { Instrument } from './model'
import type { SquareEffects } from '../types'

const finite = (min: number, max: number) => z.number().finite().min(min).max(max)
const bounds = (min: number, max: number) => z.object({ first: finite(min, max), second: finite(min, max) })

/** Fields a section may change. Bus-level settings (delay time/feedback, sidechain), the role,
 * the pitch multiplier, octaves, swing and the board movement stay on the whole instrument. */
export const sectionParamsSchema = z.object({
  gain: finite(0, 1), attack: finite(.001, 2), decay: finite(.01, 2), sustain: finite(0, 1), release: finite(.01, 2), clip: finite(.01, 1),
  pitchEnvelope: finite(-24, 24), pitchAttack: finite(.001, 2),
  lpfRange: bounds(20, 20000), hpf: finite(0, 20000), fxGain: finite(0, 2), fxPan: finite(-1, 1), reverbRange: bounds(0, 1),
  playChance: finite(0, 1), delay: finite(0, 1), driveRange: bounds(0, 10),
  resonance: finite(0, 30), filterEnv: finite(-8, 8), filterAttack: finite(.001, 2), filterDecay: finite(.01, 2),
  lfoTarget: z.enum(['none', 'lpf', 'gain', 'pan', 'pitch']), lfoRate: finite(.05, 20), lfoUnit: z.enum(['hz', 'bars']), lfoDepth: finite(0, 1),
  lfoShape: z.enum(['sine', 'triangle', 'saw', 'square']),
  vibrato: finite(0, 12), vibratoDepth: finite(0, 2), fmIndex: finite(0, 10), fmRatio: finite(.5, 8),
  unison: finite(1, 7).int(), detune: finite(0, 1), spread: finite(0, 1), sampleLoop: z.boolean(), loopStart: finite(0, 1), loopEnd: finite(0, 1),
}).partial()
export type SectionParams = z.infer<typeof sectionParamsSchema>
export type SectionParamKey = keyof SectionParams
export type SectionBounds = { lpf?: [number, number]; reverb?: [number, number]; drive?: [number, number] }

const pair = (range?: { first: number; second: number }): [number, number] | undefined => range ? [Math.min(range.first, range.second), Math.max(range.first, range.second)] : undefined

/** The instrument and effects a section plays with, plus the range limits it replaces. */
export function sectionSound(instrument: Instrument, fx: SquareEffects | undefined, params: SectionParams) {
  const { fxGain, fxPan, delay, decay, lpfRange, reverbRange, driveRange, lfoTarget, ...rest } = params
  const sound: Instrument = { ...instrument, ...rest }
  if (lfoTarget !== undefined) sound.lfoTarget = lfoTarget === 'none' ? undefined : lfoTarget
  if (decay !== undefined) sound.decay = decay
  const effects = fx ? { ...fx, ...(fxGain !== undefined ? { gain: fxGain } : {}), ...(fxPan !== undefined ? { pan: fxPan } : {}),
    ...(delay !== undefined ? { delay } : {}), ...(decay !== undefined ? { decay } : {}), ...(rest.hpf !== undefined && fx.hpf !== undefined ? { hpf: rest.hpf } : {}) } : undefined
  const limits: SectionBounds = {}
  if (lpfRange) limits.lpf = pair(lpfRange)
  if (reverbRange) limits.reverb = pair(reverbRange)
  if (driveRange) limits.drive = pair(driveRange)
  return { instrument: sound, fx: effects, bounds: limits }
}

/** True when a section changes anything. */
export const hasSectionParams = (params?: SectionParams): params is SectionParams => !!params && Object.keys(params).length > 0

/** States & Events rules win over sections: a rule that sets a value removes the sections' own. */
export function withoutSectionParams(instrument: Instrument, keys: readonly SectionParamKey[]): Instrument {
  const sections = instrument.arrangement?.sections
  if (!sections || !Object.values(sections).some(step => keys.some(key => step.params?.[key] !== undefined))) return instrument
  return { ...instrument, arrangement: { ...instrument.arrangement!, sections: Object.fromEntries(Object.entries(sections).map(([id, step]) => {
    if (!step.params) return [id, step]
    const params = { ...step.params }
    for (const key of keys) delete params[key]
    const { params: _old, ...rest } = step
    return [id, hasSectionParams(params) ? { ...rest, params } : rest]
  })) } }
}

/** A gain rule scales each section's Extra gain the same way it scales the instrument's. */
export function scaleSectionGain(instrument: Instrument, scale: (gain: number) => number): Instrument {
  const sections = instrument.arrangement?.sections
  if (!sections || !Object.values(sections).some(step => step.params?.fxGain !== undefined)) return instrument
  return { ...instrument, arrangement: { ...instrument.arrangement!, sections: Object.fromEntries(Object.entries(sections).map(([id, step]) =>
    [id, step.params?.fxGain !== undefined ? { ...step, params: { ...step.params, fxGain: scale(step.params.fxGain) } } : step])) } }
}

// Values that mean "off" for fields the instrument leaves undefined when off.
const OFF: Partial<Record<SectionParamKey, number | string | boolean>> = { resonance: 0, filterEnv: 0, vibrato: 0, fmIndex: 0, lfoTarget: 'none', sampleLoop: false }
const SECTION_KEYS = new Set(Object.keys(sectionParamsSchema.shape))

/** Translates an edit of the instrument or its effects into the section fields it changes.
 * Fields a section can't change are dropped. */
export function sectionPatch(instrument: Partial<Instrument> = {}, effects: Partial<SquareEffects> = {}): SectionParams {
  const patch: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(instrument)) {
    if (!SECTION_KEYS.has(key)) continue
    const range = value as { first: number; second: number } | undefined
    patch[key] = value === undefined ? OFF[key as SectionParamKey] : key.endsWith('Range') ? { first: range!.first, second: range!.second } : value
  }
  if (effects.gain !== undefined) patch.fxGain = effects.gain
  if (effects.pan !== undefined) patch.fxPan = effects.pan
  if (effects.delay !== undefined) patch.delay = effects.delay
  if (effects.decay !== undefined) patch.decay = effects.decay
  if (effects.hpf !== undefined) patch.hpf = effects.hpf
  if (effects.reverb !== undefined) patch.reverbRange = { first: effects.reverb, second: effects.reverb }
  if (effects.lpf !== undefined) patch.lpfRange = { first: effects.lpf, second: effects.lpf }
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as SectionParams
}

/** What the editor shows for a section: the instrument with the section's values on top.
 * Ranged knobs keep the instrument's L/S/N choice. */
export function sectionView<F extends Partial<SquareEffects>>(instrument: Instrument, effects: F, params: SectionParams = {}) {
  const own = sectionSound(instrument, effects as unknown as SquareEffects, params)
  const range = (key: 'lpfRange' | 'reverbRange' | 'driveRange') => params[key] ? { ...params[key]!, ...(instrument[key]?.frequency ? { frequency: instrument[key]!.frequency } : {}) } : instrument[key]
  return { instrument: { ...own.instrument, lpfRange: range('lpfRange'), reverbRange: range('reverbRange'), driveRange: range('driveRange') },
    effects: { ...effects, ...own.fx } as F }
}

/** Sets or clears (undefined) section fields of one piece's section. */
export function withSectionParams(instrument: Instrument, sectionId: string, change: { [K in SectionParamKey]?: SectionParams[K] | undefined },
  fallback: { variation: number | null; transpose: number }): NonNullable<Instrument['arrangement']> {
  const arrangement = instrument.arrangement ?? { restart: false, sections: {} }
  const step = arrangement.sections[sectionId] ?? fallback
  const params: Record<string, unknown> = { ...step.params, ...change }
  for (const key of Object.keys(params)) if (params[key] === undefined) delete params[key]
  const { params: _old, ...rest } = step
  return { ...arrangement, sections: { ...arrangement.sections, [sectionId]: Object.keys(params).length ? { ...rest, params: params as SectionParams } : rest } }
}
