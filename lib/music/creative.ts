import { METER_IDS } from './meter'
import { arrangementSchema, pieceArrangementSchema, migrateGlobalArrangement, DEFAULT_ARRANGEMENT, pieceSection, type Arrangement } from './arrangement'
import { STYLE_PROFILES } from './kit-profiles/catalog'
import { pianoRollSchema } from './piano-roll'
import { z } from 'zod'
import { DEFAULT_MOVEMENT, DELAY_TIMES, INSTRUMENT_ROLES, LFO_SHAPES, LFO_TARGETS, instrumentFor, piecesFromHistory, type DelayTime } from './model'
import type { MusicSnapshot } from './runtime-types'
import { sampleAsset } from './sample-banks'
import dusseldorfMidi from '../../public/presets/dusseldorf-original.json'
import manchesterJazz from '../../public/presets/manchester-1999.json'
import { kitReactionsSchema, migrateKitReactions, REACTION_PRESET_REVISION } from './reactions'
import { HARMONY_PLAN_IDS } from './harmony'

export const SOUNDS = ['sbd', 'sine', 'triangle', 'square', 'sawtooth', 'supersaw', 'white', 'pink', 'brown'] as const
export { ROOTS, scaleForCreativeSession, SCALE_INTERVALS as SCALES, SCALE_LABELS } from './scales'
import { ROOTS, SCALE_NAMES, scaleForCreativeSession } from './scales'

const finite = (min: number, max: number) => z.number().finite().min(min).max(max)
const sourceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('synth') }),
  z.object({ kind: z.literal('sample'), bank: z.string().max(80), asset: z.string().max(80), variant: finite(0, 127).int(), pitched: z.boolean() }),
]).superRefine((source, ctx) => {
  if (source.kind === 'sample' && !sampleAsset(source)?.variants[source.variant]) ctx.addIssue({ code: 'custom', message: 'Sample bank, sound or articulation does not exist.' })
})
const rangeFrequencySchema = z.enum(['fixed', 'loop', 'section', 'note']).optional()
const octaveRangeSchema = z.union([
  z.object({ first: finite(0, 7).int(), second: finite(0, 7).int(), frequency: rangeFrequencySchema }),
  z.object({ min: finite(0, 7).int(), max: finite(0, 7).int(), frequency: rangeFrequencySchema }).transform(({ min, max, frequency }) => ({ first: min, second: max, ...(frequency ? { frequency } : {}) })),
]).optional()
const parameterRangeSchema = (max: number) => z.object({ first: finite(0, max), second: finite(0, max), frequency: rangeFrequencySchema }).optional()
export const instrumentSchema = z.object({
  name: z.string().trim().min(1).max(60).transform(name => name.replace(/\s*·\s*[a-h][1-8]$/i, '')), behavior: z.enum(['pulse', 'phrase', 'sustain']),
  sound: z.enum(SOUNDS),
  octave: finite(0, 7).int(), gain: finite(0, 1), attack: finite(0.001, 2),
  octaveRange: octaveRangeSchema,
  driveRange: parameterRangeSchema(10), reverbRange: parameterRangeSchema(1), swingRange: parameterRangeSchema(.5),
  lpfRange: z.object({ first: finite(20, 20000), second: finite(20, 20000), frequency: rangeFrequencySchema }).optional(),
  release: finite(0.01, 2), lpf: finite(20, 20000), hpf: finite(0, 20000),
  decay: finite(0.01, 2).optional(), sustain: finite(0, 1).optional(), clip: finite(0.01, 1).optional(),
  pianoRolls: z.array(pianoRollSchema).min(1).max(8),
  arrangement: pieceArrangementSchema,
  distortion: finite(0,10).optional(), distortionMix: finite(0,1).optional(), playChance: finite(0,1).optional(), pitchEnvelope: finite(-24,24).optional(), pitchAttack: finite(.001,2).optional(), extraSwing: finite(0,.5).optional(),
  selectedVariation: z.number().int().min(0).max(7).optional(),
  loopEnabled: z.boolean().optional(),
  source: sourceSchema.optional(),
  resonance: finite(0, 30).optional(), filterEnv: finite(-8, 8).optional(), filterAttack: finite(.001, 2).optional(), filterDecay: finite(.01, 2).optional(),
  delayTime: z.enum(Object.keys(DELAY_TIMES) as [DelayTime, ...DelayTime[]]).optional(), delayFeedback: finite(0, .9).optional(),
  lfoTarget: z.enum(LFO_TARGETS).optional(), lfoRate: finite(.05, 20).optional(), lfoUnit: z.enum(['hz', 'bars']).optional(), lfoDepth: finite(0, 1).optional(), lfoShape: z.enum(LFO_SHAPES).optional(),
  vibrato: finite(0, 12).optional(), vibratoDepth: finite(0, 2).optional(), fmIndex: finite(0, 10).optional(), fmRatio: finite(.5, 8).optional(),
  unison: finite(1, 7).int().optional(), detune: finite(0, 1).optional(), spread: finite(0, 1).optional(),
  sampleLoop: z.boolean().optional(), loopStart: finite(0, 1).optional(), loopEnd: finite(0, 1).optional(),
  duckSource: z.string().regex(/^[a-h][12]$/).optional(), duckDepth: finite(0, 1).optional(), duckRelease: finite(.02, .6).optional(),
  role: z.enum(INSTRUMENT_ROLES).optional(),
})
export const effectsSchema = z.object({
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
  /** Taken off the Creative board: the instrument stays in the kit, the piece is not drawn nor played. */
  removed: z.boolean().optional(),
})
/** Extra Creative board piece that plays the instrument of `source` (one of the 32 kit pieces). */
const extraPieceSchema = z.object({
  id: z.string().regex(/^x:\d{1,5}$/), source: z.string().regex(/^[wb]:[a-h][1-8]$/),
  square: z.string().regex(/^[a-h][1-8]$/), active: z.boolean(),
})
export const creativeSchema = z.object({
  reactions: kitReactionsSchema,
  reactionPresetRevision: z.string().max(80).default(REACTION_PRESET_REVISION),
  harmony: z.enum(HARMONY_PLAN_IDS).default('kit'),
  catalogRevision: z.string().max(80).optional(),
  version: z.literal(7), name: z.string().trim().min(1).max(80),
  cityId: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  bpm: finite(30, 240), meter: z.enum(METER_IDS).default('4/4'), volume: finite(0, 1), root: z.enum(ROOTS),
  scale: z.enum(SCALE_NAMES),
  arrangement: arrangementSchema,
  pieces: z.array(pieceSchema).length(32),
  extras: z.array(extraPieceSchema).max(64).optional(),
  instruments: z.record(instrumentSchema), effects: z.record(effectsSchema), mappings: z.record(mappingSchema),
}).superRefine((data, ctx) => {
  const initial = piecesFromHistory([])
  const placed = [...data.pieces.filter(p => !p.removed).map(p => p.square), ...(data.extras ?? []).map(p => p.square)]
  if (new Set(placed).size !== placed.length || new Set(data.pieces.map(p => p.id)).size !== 32) {
    ctx.addIssue({ code: 'custom', message: 'Each piece needs a unique id and square.' })
  }
  const extraIds = (data.extras ?? []).map(p => p.id)
  if (new Set(extraIds).size !== extraIds.length || (data.extras ?? []).some(p => !data.pieces.some(base => base.id === p.source))) {
    ctx.addIssue({ code: 'custom', message: 'Each extra piece needs a unique id and one of the kit pieces as source.' })
  }
  for (const p of data.pieces) {
    const original = initial.find(x => x.id === p.id)
    if (!original || original.slot !== p.slot || original.origin !== p.origin || original.color !== p.color || original.type !== p.type || !data.instruments[p.id] || !data.effects[p.id] || !data.mappings[p.id]) {
      ctx.addIssue({ code: 'custom', message: `Configuração incompleta ou identidade inválida: ${p.id}.` })
    }
  }
  for (const map of [data.instruments, data.effects, data.mappings]) {
    if (Object.keys(map).length !== 32) ctx.addIssue({ code: 'custom', message: 'The kit must set up exactly 32 pieces.' })
  }
  for (const instrument of Object.values(data.instruments)) {
    const entries = instrument.arrangement.sections
    if (Object.keys(entries).length !== data.arrangement.sections.length || data.arrangement.sections.some(s => !Object.hasOwn(entries,s.id) || (entries[s.id].variation ?? 0) >= instrument.pianoRolls.length)) {
      ctx.addIssue({code:'custom', message:'Each piece must reference every global section and existing MIDI bank.'})
    }
  }
})
export type CreativeSession = z.infer<typeof creativeSchema>
export const CREATIVE_STORAGE = 'chickenchess:creative:v5'

export function createCreativeSession(): CreativeSession {
  const pieces = piecesFromHistory([])
  return creativeSchema.parse({
    version: 7, name: 'My electronic kit', bpm: 118, meter: '4/4', volume: 0.75, root: 'C', scale: 'Pentatônica menor', arrangement: globalThis.structuredClone(DEFAULT_ARRANGEMENT), pieces,
    instruments: Object.fromEntries(pieces.map(p => [p.id, { ...instrumentFor(p), arrangement:{restart:false,sections:{'section-a':{variation:0,transpose:0,active:true}}} }])),
    effects: Object.fromEntries(pieces.map(p => [p.id, { gain: 1, pitch: 1, pan: 0, delay: 0, reverb: 0.12, decay: 0.15 }])),
    mappings: Object.fromEntries(pieces.map(p => [p.id, { ...DEFAULT_MOVEMENT }])),
  })
}

export type CreativeBoardPiece = Omit<CreativeSession['pieces'][number], 'removed'> & { /** Kit piece whose instrument this piece plays. */ instrumentId: string }

/** Pieces on the Creative board: the kit pieces still placed, then the extras placed from the palette. */
export function creativeBoardPieces(session: CreativeSession): CreativeBoardPiece[] {
  const placed = session.pieces.filter(p => !p.removed).map(({ removed: _removed, ...p }) => ({ ...p, instrumentId: p.id }))
  const extras = (session.extras ?? []).flatMap(extra => {
    const source = session.pieces.find(p => p.id === extra.source)
    if (!source) return []
    const { removed: _removed, ...base } = source
    return [{ ...base, id: extra.id, square: extra.square, active: extra.active, instrumentId: source.id }]
  })
  return [...placed, ...extras]
}

/** Updates square/active of the placed pieces, whether kit pieces or extras. */
export function mapCreativeBoardPieces(session: CreativeSession, update: (piece: CreativeBoardPiece) => { square?: string; active?: boolean } | null): CreativeSession {
  const board = new Map(creativeBoardPieces(session).map(piece => [piece.id, piece]))
  const apply = <T extends { id: string }>(item: T) => {
    const piece = board.get(item.id)
    const patch = piece && update(piece)
    return patch ? { ...item, ...patch } : item
  }
  return { ...session, pieces: session.pieces.map(p => p.removed ? p : apply(p)), extras: session.extras?.map(apply) }
}

export function creativeSnapshot(session: CreativeSession, playing: boolean, solo: string | readonly string[] | null = null): MusicSnapshot {
  const soloIds = typeof solo === 'string' ? [solo] : [...(solo ?? [])]
  const board = creativeBoardPieces(session)
  // Extras share their source's instrument, effects and movement map under their own id.
  const borrow = <T,>(map: Record<string, T>) => session.extras?.length ? { ...map, ...Object.fromEntries(session.extras.map(extra => [extra.id, map[extra.source]])) } : map
  return {
    title: session.name, bpm: session.bpm, meter: session.meter, volume: session.volume, playing,
    arrangement: session.arrangement,
    harmony: session.harmony,
    soloId: soloIds.length === 1 ? soloIds[0] : null,
    soloIds: soloIds.length ? soloIds : undefined,
    scale: scaleForCreativeSession(session),
    pieces: board.map(({ instrumentId: _instrumentId, ...p }) => ({ ...p, origin: p.origin as MusicSnapshot['pieces'][number]['origin'], square: p.square as MusicSnapshot['pieces'][number]['square'], active: p.active && (!soloIds.length || soloIds.includes(p.id)) })),
    instruments: borrow(session.instruments), effects: borrow(session.effects), mappings: borrow(session.mappings),
  }
}

export function moveCreativePiece(session: CreativeSession, id: string, square: string): CreativeSession {
  if (!/^[a-h][1-8]$/.test(square)) return session
  const piece = creativeBoardPieces(session).find(p => p.id === id)
  if (!piece || piece.square === square) return session
  // Occupied destinations swap pieces: moving never loses a piece.
  return mapCreativeBoardPieces(session, p => p.id === id ? { square, active: true } : p.square === square ? { square: piece.square } : null)
}

/** Takes a piece off the board. A kit piece keeps its instrument for the palette; an extra is dropped. */
export function removeCreativePiece(session: CreativeSession, id: string): CreativeSession {
  if (session.extras?.some(extra => extra.id === id)) return { ...session, extras: session.extras.filter(extra => extra.id !== id) }
  return { ...session, pieces: session.pieces.map(p => p.id === id && !p.removed ? { ...p, removed: true, active: false } : p) }
}

/**
 * Drops a palette piece (the instrument of kit piece `sourceId`) on `square`, replacing whatever is
 * there. The kit piece itself comes back if it was off the board; otherwise an extra copy is added.
 * A side keeps a single king, so a king from the palette moves that side's king instead.
 */
export function placeCreativePiece(session: CreativeSession, sourceId: string, square: string): { session: CreativeSession; id: string } {
  const source = session.pieces.find(p => p.id === sourceId)
  if (!source || !/^[a-h][1-8]$/.test(square)) return { session, id: sourceId }
  const board = creativeBoardPieces(session)
  const king = source.type === 'k' ? board.find(p => p.type === 'k' && p.color === source.color) : undefined
  const occupant = board.find(p => p.square === square)
  let next = occupant && occupant.id !== king?.id ? removeCreativePiece(session, occupant.id) : session
  if (king) return { session: mapCreativeBoardPieces(next, p => p.id === king.id ? { square, active: true } : null), id: king.id }
  if (source.removed) return { session: { ...next, pieces: next.pieces.map(p => p.id === sourceId ? { ...p, removed: false, square, active: true } : p) }, id: sourceId }
  const id = `x:${Math.max(0, ...(next.extras ?? []).map(extra => Number(extra.id.slice(2)))) + 1}`
  next = { ...next, extras: [...(next.extras ?? []), { id, source: sourceId, square, active: true }] }
  return { session: next, id }
}

/** Every kit piece back on its starting square; extras leave the board. */
export function resetCreativePositions(session: CreativeSession): CreativeSession {
  return { ...session, pieces: session.pieces.map(({ removed: _removed, ...p }) => ({ ...p, square: p.origin })), extras: [] }
}

export function parseCreativeSession(text: string): CreativeSession {
  // Explicit note banks are larger than the retired compact text format.
  // Individual banks still cap duration and note count in pianoRollSchema.
  if (text.length > 2_000_000) throw new Error('Kit file too large.')
  const data = JSON.parse(text)
  // Text-era imports are intentionally simplified; no old pattern engine survives.
  if ([1, 2, 3, 4].includes(data?.version)) {
    data.version = 5
    data.sectionPattern ??= '0'
    for (const piece of data.pieces ?? []) {
      const instrument = data.instruments?.[piece.id]
      if (!instrument) continue
      const fallback = instrumentFor(piece).pianoRolls
      const count = Math.max(1, Math.min(8, instrument.pianoRolls?.length ?? instrument.phrases?.length ?? 1))
      instrument.pianoRolls = Array.from({ length: count }, (_, index) => instrument.pianoRolls?.[index] ?? fallback[index % fallback.length])
    }
  }
  // Kits from before the global set stored every rule; keep only what was authored.
  if (data && (!data.reactions || !Array.isArray(data.reactions.overrides))) {
    data.reactions = migrateKitReactions(data.reactions, data.reactionPresetRevision)
    data.reactionPresetRevision = REACTION_PRESET_REVISION
  }
  // Repair the old factory timeline: <...> already spans 16 cycles; /16
  // accidentally stretched it to 256. Preserve other authored timelines.
  if (data?.sectionPattern === '<0@4 1@4 2@4 1@4>/16') data.sectionPattern = '[0@4 1@4 2@4 1@4]/16'
  if (data?.version === 5) {
    migrateGlobalArrangement(data)
    data.version = 6
  }
  // Earlier kits always played section degrees even with another plan selected.
  // Migrate once; v7 can persist an explicit plan without deleting those degrees.
  if (data?.version === 6) {
    if (data.arrangement?.sections?.some((section: { harmony?: number[] }) => section.harmony?.length)) data.harmony = 'kit'
    data.version = 7
  }
  restoreCatalogSectionTypes(data)
  return creativeSchema.parse(data)
}

// Kits saved before the closed section vocabulary carry automatic letters. Sections
// still matching a catalog id recover the curated type; other text is normalized by the schema.
function restoreCatalogSectionTypes(data: Record<string, any>) {
  const catalog: { id: string; label: string }[] | undefined = data?.cityId === manchesterJazz.cityId ? manchesterJazz.arrangement.sections
    : STYLE_PROFILES[data?.cityId]?.sectionLabels?.map((label, index) => ({ id: `section-${String.fromCharCode(97 + index)}`, label }))
  for (const section of data?.arrangement?.sections ?? []) {
    if (typeof section?.label !== 'string' || !/^[A-Z]$/.test(section.label)) continue
    const match = catalog?.find(item => item.id === section.id)
    if (match) section.label = match.label
  }
}

/** Stable identities keep piece assignments attached when sections move or rename. */
export function updateCreativeArrangement(session: CreativeSession, next: Arrangement): CreativeSession {
  const arrangement = arrangementSchema.parse(next)
  return {...session,arrangement,instruments:Object.fromEntries(Object.entries(session.instruments).map(([id,instrument]) => [id,{...instrument,
    arrangement:{restart:instrument.arrangement.restart,sections:Object.fromEntries(arrangement.sections.map((section,index) => [section.id,
      Object.hasOwn(instrument.arrangement.sections,section.id) ? instrument.arrangement.sections[section.id] : pieceSection({...instrument,arrangement:undefined},arrangement,index)]))},
  }]))}
}

/** Explicit MIDI study; clone so edits never mutate the bundled preset. */
export function createDusseldorfSession(): CreativeSession {
  return parseCreativeSession(JSON.stringify(dusseldorfMidi))
}
