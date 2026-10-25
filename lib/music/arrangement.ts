import { z } from 'zod'
import type { Instrument } from './model'
import type { Performance } from './performance'
import { beatsPerBar } from './meter'

/** Closed vocabulary for global section names, in the order offered by the editor. */
export const SECTION_TYPES = ['Intro', 'Verse', 'Pre-Chorus', 'Chorus', 'Post-Chorus', 'Hook', 'Bridge', 'Interlude', 'Turnaround', 'Solo', 'Drop', 'Break', 'Outro'] as const
export type SectionType = typeof SECTION_TYPES[number]
export const DEFAULT_SECTION_TYPE: SectionType = 'Verse'

const SECTION_ALIASES: Record<string, SectionType> = {
  introducao: 'Intro', introduction: 'Intro', verso: 'Verse', estrofe: 'Verse', prerefrao: 'Pre-Chorus', refrao: 'Chorus',
  posrefrao: 'Post-Chorus', gancho: 'Hook', ponte: 'Bridge', interludio: 'Interlude', breakdown: 'Break', quebra: 'Break',
  final: 'Outro', coda: 'Outro', encerramento: 'Outro',
}
const sectionKey = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '')

export function isSectionType(value: unknown): value is SectionType {
  return typeof value === 'string' && (SECTION_TYPES as readonly string[]).includes(value)
}

/** Free-text labels saved before the closed vocabulary keep a recognizable type; anything else becomes Verse. */
export function normalizeSectionLabel(value: unknown): SectionType {
  if (isSectionType(value)) return value
  const key = typeof value === 'string' ? sectionKey(value) : ''
  return SECTION_TYPES.find(type => sectionKey(type) === key) ?? SECTION_ALIASES[key] ?? DEFAULT_SECTION_TYPE
}

const sectionSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  label: z.preprocess(normalizeSectionLabel, z.enum(SECTION_TYPES)),
  beats: z.number().finite().min(.25).max(64),
  harmony: z.array(z.number().int().min(-14).max(14)).min(1).max(8).optional(),
})
export const arrangementSchema = z.object({ sections: z.array(sectionSchema).min(1).max(24) }).superRefine((plan, ctx) => {
  if (new Set(plan.sections.map(s => s.id)).size !== plan.sections.length) ctx.addIssue({code:'custom', message:'Section ids must be unique.'})
  if (plan.sections.reduce((sum, s) => sum + s.beats, 0) > 512) ctx.addIssue({code:'custom', message:'Arrangement limited to 512 beats.'})
})
// A piece is present in a section when that section names one of its MIDI
// variations; null leaves it silent there. Kits saved with the retired
// `active` checkbox migrate on read: unchecked sections become null.
export const pieceSectionSchema = z.object({
  variation: z.number().int().min(0).max(7).nullable(), transpose: z.number().int().min(-24).max(24).default(0),
  /** Variation played in the section's last bar, leading into the next section. */
  fill: z.number().int().min(0).max(7).optional(),
  active: z.boolean().optional(),
}).transform(({ active, ...step }) => active === false ? { ...step, variation: null } : step)
export const pieceArrangementSchema = z.object({ restart: z.boolean().default(true), sections: z.record(pieceSectionSchema) })
export type Arrangement = z.infer<typeof arrangementSchema>
export type PieceArrangement = z.infer<typeof pieceArrangementSchema>
export type PieceSection = z.infer<typeof pieceSectionSchema>
export const DEFAULT_ARRANGEMENT: Arrangement = {sections:[{id:'section-a',label:DEFAULT_SECTION_TYPE,beats:4}]}

/** Return the section's exact downbeat, including fractional/compound pulses. */
export function sectionStartCycle(plan: Arrangement, id: string, pulses = 4) {
  const index = plan.sections.findIndex(section => section.id === id)
  if (index < 0) return undefined
  return plan.sections.slice(0, index).reduce((sum, section) => sum + section.beats, 0) / pulses
}

/** End of the section containing this (possibly already scheduled) cycle. */
export function sectionEndCycle(plan: Arrangement, cycle: number, pulses = 4) {
  const position = arrangementPosition(plan, cycle, pulses)
  return cycle + (1 - position.progress) * position.section.beats / pulses
}

/** One clock for every piece; a transport cycle is one bar, not one section. */
export function arrangementPosition(plan: Arrangement, cycle: number, pulses = 4) {
  const total = plan.sections.reduce((sum, s) => sum + s.beats, 0)
  const time = ((cycle * pulses) % total + total) % total
  let start = 0
  for (let index = 0; index < plan.sections.length; index++) {
    const section = plan.sections[index]
    if (time < start + section.beats) return {index, section, progress:(time-start)/section.beats}
    start += section.beats
  }
  return {index:0,section:plan.sections[0],progress:0}
}

export function pieceSection(instrument: Instrument, plan: Arrangement, index: number) {
  const entries = instrument.arrangement?.sections, id = plan.sections[index].id
  return entries && Object.hasOwn(entries,id) ? entries[id] : {variation:index % instrument.pianoRolls.length,transpose:0}
}

/** A pinned tab always plays; otherwise the section's variation decides presence.
 * A rule override replaces only the bank, so an empty section stays silent. */
export function pieceStep(instrument: Instrument, step: PieceSection, override?: number) {
  const count = instrument.pianoRolls.length
  const variation = override ?? instrument.selectedVariation ?? step.variation ?? 0
  return {variation:(variation % count + count) % count,transpose:step.transpose,active:instrument.selectedVariation !== undefined || step.variation !== null}
}

/** Duration is derived, never saved again on an instrument. */
export function piecePerformance(instrument: Instrument, plan: Arrangement, override?: number, pulses = 4): Performance {
  const count = instrument.pianoRolls.length
  return {restart:instrument.arrangement?.restart ?? false,steps:plan.sections.map((section,index) => {
    const authored = pieceSection(instrument,plan,index), step = pieceStep(instrument,authored,override)
    // A fill needs a section longer than its bar; a pinned tab or a rule override plays straight through.
    const fill = authored.fill !== undefined && step.active && override === undefined && instrument.selectedVariation === undefined && section.beats > pulses
      ? {variation:authored.fill % count,beats:pulses} : undefined
    return {...step,beats:section.beats,...(fill ? {fill} : {})}
  })}
}

// Import-only bridge. No retired timeline or per-piece duration reaches playback.
// For divergent authored forms the first timed piece supplies the shared duration;
// each piece retains its assignments by index. Factories had aligned forms.
export function migrateGlobalArrangement(data: Record<string, any>) {
  const instruments = Object.values(data.instruments ?? {}) as Record<string, any>[]
  const timed = instruments.find(instrument => instrument.performance?.steps?.length)
  let legacy = timed?.performance.steps as {beats:number;variation:number}[] | undefined
  if (!legacy) {
    const text = data.sectionPattern === '<0@4 1@4 2@4 1@4>/16' ? '[0@4 1@4 2@4 1@4]/16' : data.sectionPattern
    const match = /^\[([\d@.\s]+)\]\/([\d.]+)$/.exec(text ?? '')
    const weights = match?.[1].trim().split(/\s+/).map(token => /^(\d+)@([\d.]+)$/.exec(token))
    if (match && weights?.every(Boolean)) {
      const total = weights.reduce((sum, token) => sum + Number(token![2]), 0)
      legacy = weights.map(token => ({variation:Number(token![1]),beats:Number(token![2]) / total * Number(match[2]) * beatsPerBar(data.meter)}))
    }
  }
  legacy ??= [{beats:4,variation:Number(data.sectionPattern) || 0}]
  const plan: Arrangement = {sections:legacy.map((step,index) => ({id:`section-${index+1}`,label:DEFAULT_SECTION_TYPE,beats:step.beats,
    ...(data.harmonicSequences?.[index] ? {harmony:data.harmonicSequences[index]} : {})}))}
  data.arrangement = arrangementSchema.parse(plan)
  for (const instrument of instruments) {
    instrument.arrangement = {restart:instrument.performance?.restart ?? false, sections:Object.fromEntries(plan.sections.map((section,index) => {
      const step = instrument.performance?.steps[index % instrument.performance.steps.length]
      return [section.id,{variation:step?.active === false ? null : (step?.variation ?? legacy![index].variation) % instrument.pianoRolls.length,transpose:step?.transpose ?? 0}]
    }))}
    delete instrument.performance
  }
  delete data.sectionPattern
  delete data.harmonicSequences
}
