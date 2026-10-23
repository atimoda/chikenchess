import { z } from 'zod'
import type { Instrument } from './model'
import type { Performance } from './performance'
import { beatsPerBar } from './meter'

const sectionSchema = z.object({
  id: z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().trim().min(1).max(40),
  beats: z.number().finite().min(.25).max(64),
  harmony: z.array(z.number().int().min(-14).max(14)).min(1).max(8).optional(),
})
export const arrangementSchema = z.object({ sections: z.array(sectionSchema).min(1).max(24) }).superRefine((plan, ctx) => {
  if (new Set(plan.sections.map(s => s.id)).size !== plan.sections.length) ctx.addIssue({code:'custom', message:'Section ids must be unique.'})
  if (plan.sections.reduce((sum, s) => sum + s.beats, 0) > 512) ctx.addIssue({code:'custom', message:'Arrangement limited to 512 beats.'})
})
export const pieceSectionSchema = z.object({
  variation: z.number().int().min(0).max(7), transpose: z.number().int().min(-24).max(24).default(0), active: z.boolean().default(true),
})
export const pieceArrangementSchema = z.object({ restart: z.boolean().default(true), sections: z.record(pieceSectionSchema) })
export type Arrangement = z.infer<typeof arrangementSchema>
export type PieceArrangement = z.infer<typeof pieceArrangementSchema>
export const DEFAULT_ARRANGEMENT: Arrangement = {sections:[{id:'section-a',label:'A',beats:4}]}

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
  return entries && Object.hasOwn(entries,id) ? entries[id] : {variation:index % instrument.pianoRolls.length,transpose:0,active:true}
}

/** Duration is derived, never saved again on an instrument. Pins replace MIDI only. */
export function piecePerformance(instrument: Instrument, plan: Arrangement, override?: number): Performance {
  return {restart:instrument.arrangement?.restart ?? false,steps:plan.sections.map((section,index) => {
    const step = pieceSection(instrument,plan,index)
    return {...step,beats:section.beats,variation:(override ?? instrument.selectedVariation ?? step.variation) % instrument.pianoRolls.length}
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
  const plan: Arrangement = {sections:legacy.map((step,index) => ({id:`section-${index+1}`,label:String.fromCharCode(65+index),beats:step.beats,
    ...(data.harmonicSequences?.[index] ? {harmony:data.harmonicSequences[index]} : {})}))}
  data.arrangement = arrangementSchema.parse(plan)
  for (const instrument of instruments) {
    instrument.arrangement = {restart:instrument.performance?.restart ?? false, sections:Object.fromEntries(plan.sections.map((section,index) => {
      const step = instrument.performance?.steps[index % instrument.performance.steps.length]
      return [section.id,{variation:(step?.variation ?? legacy![index].variation) % instrument.pianoRolls.length,transpose:step?.transpose ?? 0,active:step?.active ?? true}]
    }))}
    delete instrument.performance
  }
  delete data.sectionPattern
  delete data.harmonicSequences
}
