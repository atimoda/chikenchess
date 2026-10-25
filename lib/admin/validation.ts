import { z } from 'zod'
import type { AdminEntry } from './catalog'
import { cities } from '../cities-data'
import { CAMPAIGNS } from '../campaigns'
import { RANK_TIERS } from '../game-progression'
import moveMessages from '../../data/ui/move-messages.json'
import { creativeSchema, instrumentSchema, SOUNDS, ROOTS, parseCreativeSession } from '../music/creative'
import { SOUND_DESIGN_KEYS, type SoundDesignKey } from '../music/model'
import { SCALE_NAMES } from '../music/scales'
import { HARMONY_PLAN_IDS } from '../music/harmony'
import { METER_IDS } from '../music/meter'
import { SECTION_TYPES } from '../music/arrangement'
import { createStyledCityKit } from '../music/styled-kits'
import { isProfileToken } from '../music/profile-tokens'
import { prepareOfficialCityKit } from '../music/city-kits'
import { kitReactionsSchema, reactionsSchema } from '../music/reactions'
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
    z.object({ kind: z.literal('sample'), bank: z.enum(['electro', 'jazz', 'world', 'strings', 'keys', 'synths', 'drums', 'sambaReggae', 'classical', 'band', 'percussion', 'guitars', 'psytrance', 'machines', 'electronic']), asset: text, variant: z.number().int().min(0).max(127).optional(), pitched: z.boolean().optional() }).strict(),
  ]),
  patterns: z.array(z.string().min(1).max(16000).refine(value => value.trim().split(/\s+/).every(isProfileToken), 'Use graus inteiros, acordes separados por vírgula, ponto para pausas e as marcas ! \' ? * ~ _ < >.')).min(1).max(8),
  bars: z.union([finite.positive().max(64), z.array(finite.positive().max(64)).min(1).max(8)]).optional(),
  ...optionalNumbers,
  lpfRange: range.optional(), driveRange: range.optional(), reverbRange: range.optional(), swingRange: range.optional(),
  arrangement: z.object({ active: z.array(z.boolean()).max(24).optional(), variations: z.array(z.number().int().min(0).max(7)).max(24).optional(), transpose: z.array(finite).max(24).optional(), fills: z.array(z.number().int().min(0).max(7).nullable()).max(24).optional(), restart: z.boolean().optional() }).strict().optional(),
  effects: z.object(Object.fromEntries(['gain', 'pitch', 'pan', 'delay', 'reverb', 'decay'].map(key => [key, finite.optional()]))).strict().optional(),
  mapping: z.object({ fileDegrees: finite.optional(), rankDegrees: finite.optional(), panWidth: finite.optional(), previewFilter: z.boolean().optional() }).strict().optional(),
  design: instrumentSchema.pick(Object.fromEntries(SOUND_DESIGN_KEYS.map(key => [key, true])) as Record<SoundDesignKey, true>).partial().strict().optional(),
}).strict()
export const styleProfileSchema = z.object({
  name: text, bpm: finite.min(30).max(240), meter: z.enum(METER_IDS).optional(), root: z.enum(ROOTS), scale: z.enum(SCALE_NAMES), harmony: z.enum(HARMONY_PLAN_IDS),
  harmonicSequences: z.array(z.array(finite).min(1).max(64)).max(24).optional(), swing: finite.min(0).max(.5),
  sections: z.array(finite.min(.25).max(64)).min(1).max(24), sectionLabels: z.array(z.enum(SECTION_TYPES)).min(1).max(24), parts: z.array(partSchema).length(16), reactions: kitReactionsSchema.optional(), reference: text, url: z.string().url(),
}).strict().refine(profile => profile.sectionLabels.length === profile.sections.length, 'Informe um tipo de seção para cada duração.')

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
    case 'bots': {
      const botSchema = z.object({
        id: text,
        name: text,
        kind: z.enum(['pure', 'chicken']),
        skill: finite.int().min(0).max(20),
        alwaysBestMove: z.boolean(),
        delaySeconds: finite.min(0.5).max(30),
        powerUsePercent: finite.min(0).max(100),
        freezeMinThreatPawns: finite.min(0).max(100),
        freezeCooldownMoves: finite.int().min(0).max(100),
        shieldMinPiecePawns: finite.min(0).max(100),
        shieldCooldownMoves: finite.int().min(0).max(100),
        powerMinGainPawns: finite.min(0).max(100),
        powerReserveEggs: finite.int().min(0).max(100),
        worstFloorPawns: finite.min(-100).max(100),
        worstMaxLossPawns: finite.min(0).max(100),
        eggTarget: finite.int().min(0).max(100),
        worstCooldownMoves: finite.int().min(0).max(100),
      }).strict()
      const result = z.array(botSchema).min(1).max(32).parse(value)
      if (new Set(result.map(item => item.id)).size !== result.length) throw new Error('IDs dos bots não podem repetir.')
      break
    }
    case 'egg-rewards': {
      const tier = z.object({ minLegalMoves: finite.int().min(0).max(256), moves: finite.int().min(0).max(10) }).strict()
      const result = z.object({
        maxMatchEggs: finite.int().min(1).max(999),
        rankedMovesByLegalMoves: z.array(tier).min(1).max(16),
        squareEggsHoldSeconds: finite.min(0).max(30),
        squareEggsFadeSeconds: finite.min(0).max(30),
      }).strict().parse(value)
      const minimums = result.rankedMovesByLegalMoves.map(item => item.minLegalMoves)
      if (new Set(minimums).size !== minimums.length) throw new Error('Cada faixa precisa de um número mínimo de lances diferente.')
      if (!minimums.includes(0)) throw new Error('Inclua uma faixa com minLegalMoves 0, para posições com poucos lances.')
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
    case 'music-reactions': {
      const raw = z.object({ minimumPieces: z.unknown(), rules: z.array(z.unknown()) }).strict().parse(value)
      const result = reactionsSchema.parse(raw)
      if (new Set(result.rules.map((rule: { id: string }) => rule.id)).size !== result.rules.length) throw new Error('IDs das regras não podem repetir.')
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

/** Validates a Creative kit sent by Save DB and returns the city's official kit to write. */
export function validateOfficialKit(cityId: unknown, value: unknown, revision: string) {
  if (typeof cityId !== 'string' || !cities.some(city => city.id === cityId)) throw new Error('Cidade não encontrada.')
  creativeSchema.parse(value)
  return prepareOfficialCityKit(parseCreativeSession(JSON.stringify(value)), cityId, revision)
}
