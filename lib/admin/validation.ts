import { z } from 'zod'
import type { AdminEntry } from './catalog'
import { cities } from '../cities-data'
import { CAMPAIGNS } from '../campaigns'
import { RANK_TIERS } from '../game-progression'
import moveMessages from '../../data/ui/move-messages.json'
import { creativeSchema, SOUNDS, ROOTS, parseCreativeSession } from '../music/creative'
import { SCALE_NAMES } from '../music/scales'
import { HARMONY_PLAN_IDS } from '../music/harmony'
import { METER_IDS } from '../music/meter'
import { createStyledCityKit } from '../music/styled-kits'
import type { StyleProfile } from '../music/kit-profiles/types'

const hasControl = (value: string, multiline = false) => [...value].some(character => { const code = character.codePointAt(0)!; return (code < 32 || code === 127) && !(multiline && [9, 10, 13].includes(code)) })
const text = z.string().min(1).max(4000).refine(value => value.trim().length > 0 && !hasControl(value, true), 'Texto vazio ou com caracteres de controle.')
const list = z.array(text).min(1).max(500)
const exactMap = (keys: string[], value: z.ZodTypeAny) => z.object(Object.fromEntries(keys.map(key => [key, value]))).strict()
const finite = z.number().finite()
const range = z.object({ first: finite, second: finite, frequency: z.enum(['fixed', 'loop', 'section', 'note']).optional() }).strict()
const optionalNumbers = Object.fromEntries(['swing', 'gate', 'octave', 'gain', 'attack', 'decay', 'sustain', 'release', 'clip', 'lpf', 'hpf', 'distortion', 'distortionMix', 'pitchEnvelope', 'pitchAttack'].map(key => [key, finite.optional()]))
const partSchema = z.object({
  role: z.enum(['rhythm', 'bass', 'harmony', 'melody', 'response', 'texture']), name: text,
  behavior: z.enum(['pulse', 'phrase', 'sustain']),
  source: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('synth'), sound: z.enum(SOUNDS) }).strict(),
    z.object({ kind: z.literal('sample'), bank: z.enum(['electro', 'jazz', 'world', 'strings', 'keys', 'synths', 'drums', 'sambaReggae', 'classical', 'band', 'percussion', 'guitars']), asset: text, variant: z.number().int().min(0).max(127).optional(), pitched: z.boolean().optional() }).strict(),
  ]),
  patterns: z.array(z.string().min(1).max(16000).refine(value => value.trim().split(/\s+/).every(token => token === '.' || /^-?\d+(,-?\d+)*$/.test(token)), 'Use graus inteiros, acordes separados por vírgula e ponto para pausas.')).min(1).max(8),
  bars: z.union([finite.positive().max(64), z.array(finite.positive().max(64)).min(1).max(8)]).optional(),
  ...optionalNumbers,
  lpfRange: range.optional(), driveRange: range.optional(), reverbRange: range.optional(), swingRange: range.optional(),
  arrangement: z.object({ active: z.array(z.boolean()).max(24).optional(), variations: z.array(z.number().int().min(0).max(7)).max(24).optional(), transpose: z.array(finite).max(24).optional(), restart: z.boolean().optional() }).strict().optional(),
  effects: z.object(Object.fromEntries(['gain', 'pitch', 'pan', 'delay', 'reverb', 'decay'].map(key => [key, finite.optional()]))).strict().optional(),
  mapping: z.object({ fileDegrees: finite.optional(), rankDegrees: finite.optional(), panWidth: finite.optional(), previewFilter: z.boolean().optional() }).strict().optional(),
}).strict()
export const styleProfileSchema = z.object({
  name: text, bpm: finite.min(30).max(240), meter: z.enum(METER_IDS).optional(), root: z.enum(ROOTS), scale: z.enum(SCALE_NAMES), harmony: z.enum(HARMONY_PLAN_IDS),
  harmonicSequences: z.array(z.array(finite).min(1).max(64)).max(24).optional(), swing: finite.min(0).max(.5),
  sections: z.array(finite.min(.25).max(64)).min(1).max(24), parts: z.array(partSchema).length(16), reference: text, url: z.string().url(),
}).strict()

export function validateAdminValue(entry: AdminEntry, value: unknown): void {
  switch (entry.kind) {
    case 'strings': list.parse(value); break
    case 'string-groups': exactMap(entry.id === 'city-intros' ? cities.map(city => city.id) : Object.keys(moveMessages), entry.id === 'city-intros' ? list.min(3).max(32) : list).parse(value); break
    case 'text-map': exactMap(cities.map(city => city.id), text).parse(value); break
    case 'campaigns': {
      const result = z.array(z.object({ id: z.string(), name: text }).strict()).length(CAMPAIGNS.length).parse(value)
      if (new Set(result.map(item => item.id)).size !== CAMPAIGNS.length || result.some(item => !CAMPAIGNS.some(campaign => campaign.id === item.id))) throw new Error('Preserve todos os IDs das campanhas, sem duplicar.')
      break
    }
    case 'ranks': {
      const result = z.array(z.object({ minPoints: z.number(), title: text }).strict()).length(RANK_TIERS.length).parse(value)
      if (result.some((item, index) => item.minPoints !== RANK_TIERS[index].minPoints)) throw new Error('Edite os títulos mantendo a ordem e os limites de pontuação.')
      break
    }
    case 'names': {
      const words = z.array(z.string().min(1).max(12).refine(word => word === word.trim() && !hasControl(word), 'Termo inválido ou com espaços nas extremidades.')).min(1).max(5000).superRefine((items, ctx) => {
        if (new Set(items).size !== items.length) ctx.addIssue({ code: 'custom', message: 'Remova os termos repetidos nesta categoria.' })
      })
      const data = z.object({ title: words, adjective: words, noun: words, epithet: words }).strict().parse(value)
      const max = (items: string[]) => Math.max(...items.map(word => [...word].length))
      if (max(data.title) + max(data.noun) + Math.max(max(data.adjective) + 6, max(data.epithet) + 2) > 40) throw new Error('Uma combinação pode exceder os 40 caracteres do nome.')
      break
    }
    case 'music-profile': {
      const profile = styleProfileSchema.parse(value) as unknown as StyleProfile
      const city = cities.find(item => item.id === entry.cityId)
      if (!city) throw new Error('Cidade não encontrada.')
      createStyledCityKit(city, profile)
      break
    }
    case 'music-preset': {
      creativeSchema.parse(value)
      const kit = parseCreativeSession(JSON.stringify(value))
      if (entry.cityId && kit.cityId !== entry.cityId) throw new Error('Preserve a cidade deste preset.')
      break
    }
  }
}

export function adminValidationMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues.map(issue => `${issue.path.join('.') || 'JSON'}: ${issue.message}`).join('\n')
  return error instanceof Error ? error.message : 'Conteúdo inválido.'
}
