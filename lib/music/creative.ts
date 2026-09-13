import { z } from 'zod'
import { DEFAULT_MOVEMENT, instrumentFor, piecesFromHistory } from './model'
import { patternRecipe } from './pattern-library'
import type { MusicSnapshot } from './runtime'
import { AUTOMATION_TARGETS, hasControlPatternBudget } from './automation'
import { sampleAsset } from './sample-banks'
import { electronicGrooves } from './grooves'
import { reactionsSchema } from './reactions'

export const SOUNDS = ['sbd', 'sine', 'triangle', 'square', 'sawtooth', 'supersaw', 'white', 'pink', 'brown'] as const
export const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export const SCALES = {
  'Pentatônica menor': [0, 3, 5, 7, 10],
  'Pentatônica maior': [0, 2, 4, 7, 9],
  'Maior': [0, 2, 4, 5, 7, 9, 11],
  'Menor natural': [0, 2, 3, 5, 7, 8, 10],
  'Dórica': [0, 2, 3, 5, 7, 9, 10],
  'Mixolídia': [0, 2, 4, 5, 7, 9, 10],
} as const

const finite = (min: number, max: number) => z.number().finite().min(min).max(max)
// A deliberately bounded subset of mini-notation; never arbitrary JavaScript.
// Cap nested speed multipliers before asking Strudel to expand a pattern.
export function hasPatternBudget(notes: string) {
  if (!notes.trim() || notes.length > 512 || !/^[\d\s\-~[\]<>,*/!@]+$/.test(notes)) return false
  if ((notes.match(/\d+/g) ?? []).some(n => Number(n) > 48)) return false
  let expansions = 1
  for (const match of notes.matchAll(/([*!])\s*(\d+(?:\.\d+)?)/g)) {
    expansions *= Number(match[2])
    if (expansions > 32) return false
  }
  return !/[*/!@]\s*0(?:\D|$)/.test(notes)
}

export function hasMaskBudget(mask: string) {
  return /^[xX\d~\s[\]<>*/!@]+$/.test(mask) && hasControlPatternBudget(mask.replace(/[xX]/g, '1').replace(/~/g, '0'), 0, 1)
}

export const automationSchema = z.record(z.enum(['gain', 'lpf', 'pan', 'room', 'delay']), z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pattern'), patterns: z.array(z.string()).min(1).max(4) }),
  z.object({ kind: z.literal('sine'), min: z.number().finite(), max: z.number().finite(), cycles: finite(0.25, 32) }),
  z.object({ kind: z.literal('ramp'), min: z.number().finite(), max: z.number().finite(), cycles: finite(0.25, 32) }),
])).superRefine((automations, ctx) => {
  for (const [key, value] of Object.entries(automations)) {
    const bounds = AUTOMATION_TARGETS[key as keyof typeof AUTOMATION_TARGETS]
    const valid = value.kind === 'pattern'
      ? value.patterns.every(pattern => hasControlPatternBudget(pattern, bounds.min, bounds.max))
      : [value.min, value.max].every(n => n >= bounds.min && n <= bounds.max)
    if (!valid) ctx.addIssue({ code: 'custom', message: `${bounds.label}: use valores entre ${bounds.min} e ${bounds.max}, sem código JavaScript.`, path: [key] })
  }
})
const grooveSchema = z.object({ name: z.string().min(1).max(80), lanes: z.record(z.object({
  name: z.string().min(1).max(60),
  rhythms: z.array(z.string().refine(hasMaskBudget)).min(1).max(4),
  accents: z.array(z.string().refine(p => hasControlPatternBudget(p, 0, 1))).min(1).max(4),
})).refine(lanes => Object.keys(lanes).length > 0 && Object.keys(lanes).length <= 16) })
const sourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('synth') }),
  z.object({ kind: z.literal('sample'), bank: z.string().max(80), asset: z.string().max(80), variant: finite(0, 127).int(), pitched: z.boolean() }),
]).superRefine((source, ctx) => {
  if (source.kind === 'sample' && !sampleAsset(source)?.variants[source.variant]) ctx.addIssue({ code: 'custom', message: 'Banco, som ou articulação de sample inexistente.' })
})
const instrumentSchema = z.object({
  name: z.string().trim().min(1).max(60).transform(name => name.replace(/\s*·\s*[a-h][1-8]$/i, '')), behavior: z.enum(['pulse', 'phrase', 'sustain']),
  sound: z.enum(SOUNDS), notes: z.string().refine(hasPatternBudget, 'Use graus, pausas e grupos; limite repetições a 32 e graus a ±48.'),
  octave: finite(0, 7).int(), gain: finite(0, 1), attack: finite(0.001, 2),
  release: finite(0.01, 2), lpf: finite(20, 20000), hpf: finite(0, 20000),
  decay: finite(0.01, 2).optional(), sustain: finite(0, 1).optional(), clip: finite(0.01, 1).optional(),
  phrases: z.array(z.string().refine(hasPatternBudget, 'Variação inválida.')).min(1).max(4).optional(),
  mask: z.string().refine(hasMaskBudget, 'Máscara inválida.').optional(),
  source: sourceSchema.optional(), automations: automationSchema.optional(),
  groove: z.object({ groove: z.string().max(80), lane: z.string().max(80) }).optional(),
})
const effectsSchema = z.object({
  gain: finite(0, 2), pitch: finite(0.5, 2), pan: finite(-1, 1),
  delay: finite(0, 1), reverb: finite(0, 1), decay: finite(0.01, 2),
})
const mappingSchema = z.object({
  fileDegrees: finite(-4, 4), rankDegrees: finite(-4, 4), panWidth: finite(0, 1), previewFilter: z.boolean(),
})
const pieceSchema = z.object({
  id: z.string().regex(/^[wb]:[a-h][1-8]$/), slot: finite(0, 31).int(),
  origin: z.string().regex(/^[a-h][1-8]$/), square: z.string().regex(/^[a-h][1-8]$/),
  type: z.enum(['p', 'n', 'b', 'r', 'q', 'k']), color: z.enum(['w', 'b']), active: z.boolean(),
})
export const creativeSchema = z.object({
  reactions: reactionsSchema,
  version: z.literal(4), name: z.string().trim().min(1).max(80),
  cityId: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  bpm: finite(30, 240), volume: finite(0, 1), root: z.enum(ROOTS),
  scale: z.enum(['Pentatônica menor', 'Pentatônica maior', 'Maior', 'Menor natural', 'Dórica', 'Mixolídia']),
  sectionPattern: z.string().refine(hasPatternBudget, 'Timeline inválida.'),
  pieces: z.array(pieceSchema).length(32),
  instruments: z.record(instrumentSchema), effects: z.record(effectsSchema), mappings: z.record(mappingSchema),
  grooves: z.record(grooveSchema).refine(g => Object.keys(g).length <= 8).default({}),
}).superRefine((data, ctx) => {
  const initial = piecesFromHistory([])
  if (new Set(data.pieces.map(p => p.square)).size !== 32 || new Set(data.pieces.map(p => p.id)).size !== 32) {
    ctx.addIssue({ code: 'custom', message: 'Cada peça precisa de uma identidade e casa únicas.' })
  }
  for (const p of data.pieces) {
    const original = initial.find(x => x.id === p.id)
    if (!original || original.slot !== p.slot || original.origin !== p.origin || original.color !== p.color || original.type !== p.type || !data.instruments[p.id] || !data.effects[p.id] || !data.mappings[p.id]) {
      ctx.addIssue({ code: 'custom', message: `Configuração incompleta ou identidade inválida: ${p.id}.` })
    }
  }
  for (const map of [data.instruments, data.effects, data.mappings]) {
    if (Object.keys(map).length !== 32) ctx.addIssue({ code: 'custom', message: 'O kit precisa configurar exatamente 32 peças.' })
  }
  for (const instrument of Object.values(data.instruments)) {
    if (instrument.groove && !data.grooves[instrument.groove.groove]?.lanes[instrument.groove.lane]) ctx.addIssue({ code: 'custom', message: `Trilha de groove ausente: ${instrument.name}.` })
  }
})
export type CreativeSession = z.infer<typeof creativeSchema>
export const CREATIVE_STORAGE = 'chickenchess:creative:v1'

export function createCreativeSession(): CreativeSession {
  const pieces = piecesFromHistory([])
  return creativeSchema.parse({
    version: 4, name: 'Meu kit eletrônico', bpm: 118, volume: 0.75, root: 'C', scale: 'Pentatônica menor', sectionPattern: '0', pieces, grooves: electronicGrooves(),
    instruments: Object.fromEntries(pieces.map(p => [p.id, { ...instrumentFor(p) }])),
    effects: Object.fromEntries(pieces.map(p => [p.id, { gain: 1, pitch: 1, pan: 0, delay: 0, reverb: 0.12, decay: 0.15 }])),
    mappings: Object.fromEntries(pieces.map(p => [p.id, { ...DEFAULT_MOVEMENT }])),
  })
}

export function creativeSnapshot(session: CreativeSession, playing: boolean, soloId: string | null = null): MusicSnapshot {
  return {
    title: session.name, bpm: session.bpm, volume: session.volume, playing,
    sectionPattern: session.sectionPattern,
    grooves: session.grooves,
    soloId,
    scale: scaleForCreativeSession(session),
    pieces: session.pieces.map(p => ({ ...p, origin: p.origin as MusicSnapshot['pieces'][number]['origin'], square: p.square as MusicSnapshot['pieces'][number]['square'], active: p.active && (!soloId || soloId === p.id) })),
    instruments: session.instruments, effects: session.effects, mappings: session.mappings,
  }
}

export function scaleForCreativeSession(session: Pick<CreativeSession, 'root' | 'scale'>) {
  const rootIndex = ROOTS.indexOf(session.root)
  return SCALES[session.scale].map(interval => `${ROOTS[(rootIndex + interval) % 12]}4`)
}

export function moveCreativePiece(session: CreativeSession, id: string, square: string): CreativeSession {
  if (!/^[a-h][1-8]$/.test(square)) return session
  const piece = session.pieces.find(p => p.id === id)
  if (!piece || piece.square === square) return session
  // Occupied destinations swap pieces: experiments never lose a configured voice.
  return { ...session, pieces: session.pieces.map(p => p.id === id ? { ...p, square, active: true } : p.square === square ? { ...p, square: piece.square } : p) }
}

export function parseCreativeSession(text: string): CreativeSession {
  if (text.length > 150_000) throw new Error('Arquivo de kit muito grande.')
  const data = JSON.parse(text)
  if (data?.version === 1) {
    data.version = 2
    data.volume = Math.min(1, Number(data.volume) * 1.12)
    for (const instrument of Object.values(data.instruments ?? {}) as Array<{ gain?: number }>) {
      if (typeof instrument.gain === 'number') instrument.gain = Math.min(1, instrument.gain * 1.4)
    }
  }
  if (data?.version === 2) {
    data.version = 3
    data.sectionPattern = '0'
  }
  if (data?.version === 3) {
    data.version = 4
    data.grooves = electronicGrooves()
  }
  // Repair the old factory timeline: <...> already spans 16 cycles; /16
  // accidentally stretched it to 256. Preserve other authored timelines.
  if (data?.sectionPattern === '<0@4 1@4 2@4 1@4>/16') data.sectionPattern = '[0@4 1@4 2@4 1@4]/16'
  return creativeSchema.parse(data)
}

const DUSSELDORF_CORE_IDS = ['w:a2', 'w:b2', 'w:c2', 'w:b1', 'w:c1', 'w:d1'] as const

function mirroredBlackId(whiteId: string) {
  const square = whiteId.slice(2)
  return `b:${square[0]}${9 - Number(square[1])}`
}

export function createDusseldorfSession(): CreativeSession {
  const session = createCreativeSession()
  const instruments = { ...session.instruments }
  const effects = { ...session.effects }

  function configure(id: typeof DUSSELDORF_CORE_IDS[number], recipeId: string, name: string, phrases: string[], mask?: string) {
    const recipe = patternRecipe(recipeId)
    if (!recipe) throw new Error(`Receita ausente: ${recipeId}`)
    const configured = { ...instruments[id], ...recipe.instrument, name, behavior: recipe.behavior, notes: phrases[0], phrases, mask }
    instruments[id] = configured
    instruments[mirroredBlackId(id)] = { ...configured }
  }

  configure('w:a2', 'elliptical-kick', 'Bumbo elíptico', [
    '<[0 ~ 0 0] [0 ~ [0 0] 0]>',
    '<0 ~ 0 [0 0]>',
    '<[0 ~ 0 ~] [0 0 ~ 0]>',
  ])
  configure('w:b2', 'elliptical-backbeat', 'Caixa elíptica', [
    '~ 0 ~ 0',
    '<[~ 0 ~ 0] [~ 0 [~ 0] 0]>',
    '~ [0 ~] ~ [0 0]',
  ])
  configure('w:c2', 'elliptical-hats', 'Chimbal elíptico', [
    '0*8',
    '<[0 0 [0 0] 0] [0 [0 0] 0 [0 0]]>*2',
    '<[0 0 [0 0] 0] [[0 0] 0 [0 0] [0 0]]>*2',
  ], '<~@4 x@12>/16')
  configure('w:b1', 'elliptical-bass', 'Baixo supersaw', [
    '<[0 ~ ~ -1 2 ~ ~ -1] [0 0 3 ~ ~ 0 4 ~]>*2',
    '<[0 ~ 0 2] [0 4 ~ 2]>',
    '<[7 7 [4 6] 7] [9 9 [6 7] 11] [~ 9 12 12]>*2',
  ], '<~@4 x@12>/16')
  configure('w:c1', 'bonespurs-harmony', 'Pad harmônico', [
    '<[-3,0] [-4,0] [-2,0]>/4',
    '<[0,2,4] [0,3,4]>/2',
    '<[2,4,6] [-3,-1,1] [5,7,9] [4,7,8]>/2',
  ], '<~@8 x@8>/16')
  configure('w:d1', 'bennington-lead', 'Lead de resposta', [
    '<[~ [4 3] 2 ~] [[2 4] ~ 3 [2 ~]]>',
    '<[~ ~ 2 2] [3 4 [5 6] 7] [~ 4 3 4] [5 6 [7 8] ~]>*2',
    '<[~ 7 ~ 5] [4 ~ [3 2] ~]>*2',
  ])

  effects['w:a2'] = { ...effects['w:a2'], reverb: 0.06 }
  effects['w:b2'] = { ...effects['w:b2'], reverb: 0.2 }
  effects['w:c2'] = { ...effects['w:c2'], reverb: 0.08, pan: 0.15 }
  effects['w:b1'] = { ...effects['w:b1'], reverb: 0.16, pan: -0.12 }
  effects['w:c1'] = { ...effects['w:c1'], reverb: 0.38, pan: 0.1 }
  effects['w:d1'] = { ...effects['w:d1'], reverb: 0.3, delay: 0.22, pan: -0.08 }
  for (const id of DUSSELDORF_CORE_IDS) {
    const blackId = mirroredBlackId(id)
    effects[blackId] = { ...effects[id] }
  }

  const assets = ['kick', 'snare', 'hat', 'clap', 'tom', 'open-hat', 'rim', 'shaker']
  const lanes = ['kick', 'snare', 'hat', 'clap', 'tom', 'open', 'rim', 'shaker']
  for (const [index, asset] of assets.entries()) {
    const id = `w:${'abcdefgh'[index]}2`
    const next = { ...instruments[id], source: { kind: 'sample' as const, bank: 'chicken-electro-v1', asset, variant: 0, pitched: false },
      groove: { groove: 'motorik', lane: lanes[index] }, notes: '0', phrases: undefined, mask: undefined,
      gain: [0.65, 0.48, 0.28, 0.28, 0.38, 0.25, 0.3, 0.24][index],
      attack: 0.001, release: 0.05, sustain: 1, clip: 1, lpf: 18000, hpf: 0 }
    instruments[id] = next
    instruments[mirroredBlackId(id)] = { ...next }
  }
  for (const id of ['w:b1', 'b:b8']) {
    instruments[id] = { ...instruments[id], mask: undefined, automations: {
      gain: { kind: 'pattern', patterns: ['1 .65 .85 .65', '1 .8 .6 .9', '.9 .65 1 .7'] },
      lpf: { kind: 'sine', min: 900, max: 2400, cycles: 8 },
    } }
  }
  for (const id of ['w:c1', 'b:c8']) instruments[id] = { ...instruments[id], mask: undefined }

  return creativeSchema.parse({
    ...session,
    name: 'Düsseldorf · Electro 01',
    cityId: 'dusseldorf',
    bpm: 122,
    root: 'C#',
    scale: 'Menor natural',
    sectionPattern: '[0@4 1@4 2@4 1@4]/16',
    // The lab starts with the complete white team so the whole city kit can be
    // auditioned immediately. Gameplay still activates each identity only after
    // its first move.
    pieces: session.pieces.map(piece => ({ ...piece, active: piece.color === 'w' })),
    instruments,
    effects,
  })
}
