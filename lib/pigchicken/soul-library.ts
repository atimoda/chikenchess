// The library of souls. The catalogue is fixed, not drawn at random: the same alien, state and family of
// instrument always give the same soul (an entry), and a few rare ones have a recipe of their own (a note, a
// weapon, a species). What the note was and what killed it do not make new entries: they are traits the player
// collects inside each one. The collection (what a player has found) lives in this browser.
//
// - SOUL_ENTRIES: 8 species x 5 families alive, 7 x 5 dead (the dragon leaves no undead), the chick, the rare ones.
// - entryOf: the entry a soul is (a rare recipe first, in the list's order; else the one of its species, state and
//   family). Its look (a shape by the family, colours by the species) and how it flies come from the entry.
// - recordSoul / mergeCollections: the collection only grows (first capture, how many, notes and weapons seen).
// - How a soul flies when let out and what it does then (its help, its hindering) are its entry's: its class's
//   numbers with the entry's own over them (entryFollowParams, entryActParams).
// - Each entry takes after one real bird of the Guia de pássaros (lib/pigchicken/bird-guide.ts): `bird`, the code's
//   rule (inspirationOf) unless its sheet names another. recipeText says how a soul like it is made.
// - The sheets: the game's catalogue is the code's with data/pigchicken/default-souls.json over it ("Salvar no game"),
//   and an admin's browser may keep a draft over the code's. setSoulEntries says which one is in use.
import DEFAULTS_FILE from '../../data/pigchicken/default-souls.json'
import { liveDefault, onGameDefault } from '../game-defaults'
import { guideBird, inspirationOf, isGuideBird } from './bird-guide'
import { UNDEAD_LOOK } from './birds'
import { SOUL_ACT_RANGES, SOUL_HELPS, SOUL_HINDERS, soulActBase, type SoulActParams } from './soul-acts'
import { SOUL_CLASSES, SOUL_FOLLOW_DEFAULTS, SOUL_FOLLOW_RANGES, SOUL_PATTERNS, SOUL_SIDES, soulClassOf, type SoulClassId, type SoulFollowParams } from './soul-follow'
import { CHICK_SOUL_COLOR, originOf, soulRarity, type SoulNote, type SoulOrigin, type SoulRarity, type SoulShot, type SoulSpecies, type SoulState, type SoulWeapon } from './souls'

export const SOUL_SPECIES_ORDER: readonly SoulSpecies[] = ['horde', 'jelly', 'lantern', 'shell', 'twin', 'mini', 'drum', 'dragon', 'chick']
export const SOUL_SHOT_ORDER: readonly SoulShot[] = ['wind', 'strings', 'keys', 'percussion', 'rebate']
export const SOUL_NOTE_ORDER: readonly SoulNote[] = ['tonic', 'consonant', 'tension', 'leading', 'outside']
export const SOUL_WEAPON_ORDER: readonly SoulWeapon[] = ['blast', 'bullet', 'arrow', 'impact']
// of: how its name reads after a soul's ("Assobio de Lanterna", "Eco da Horda")
export const SOUL_SPECIES: Record<SoulSpecies, { name: string; of: string; color: string }> = {
  horde: { name: 'Horda', of: 'da Horda', color: '#7bd88f' },
  jelly: { name: 'Água-viva', of: 'de Água-viva', color: '#c77dff' },
  lantern: { name: 'Lanterna', of: 'de Lanterna', color: '#ff7a59' },
  shell: { name: 'Casco', of: 'de Casco', color: '#6a994e' },
  twin: { name: 'Gêmeos', of: 'de Gêmeos', color: '#4cc9f0' },
  mini: { name: 'Mini', of: 'de Mini', color: '#f72585' },
  drum: { name: 'Tambor', of: 'de Tambor', color: '#c1121f' },
  dragon: { name: 'Dragão', of: 'de Dragão', color: '#ffb703' },
  chick: { name: 'Pintinho', of: 'de Pintinho', color: CHICK_SOUL_COLOR },
}
export const SOUL_STATES: Record<SoulState, string> = { alive: 'Viva', dead: 'Morta' }
// alive / dead: what a soul of that family is called
export const SOUL_SHOTS: Record<SoulShot, { name: string; alive: string; dead: string }> = {
  wind: { name: 'Sopro', alive: 'Assobio', dead: 'Suspiro' },
  strings: { name: 'Cordas', alive: 'Acorde', dead: 'Lamento' },
  keys: { name: 'Teclas', alive: 'Tecla', dead: 'Réquiem' },
  percussion: { name: 'Percussão', alive: 'Batuque', dead: 'Chocalho' },
  rebate: { name: 'Rebate', alive: 'Eco', dead: 'Assombro' },
}
// the drawing of a soul: one for each family (the pixel art is in components/pigchicken/draw/souls.ts) and the chick's.
// pixel: the size of one pixel of it (px); flap: wing beats a second
export type SoulShape = SoulShot | 'chick'
export const SOUL_SHAPES: Record<SoulShape, { name: string; pixel: number; flap: number }> = {
  wind: { name: 'Rabo comprido', pixel: 3, flap: 12 },
  strings: { name: 'Topete', pixel: 4, flap: 7 },
  keys: { name: 'Barriga de teclas', pixel: 4, flap: 8 },
  percussion: { name: 'Gorducha', pixel: 4, flap: 9 },
  rebate: { name: 'Coruja', pixel: 5, flap: 5 },
  chick: { name: 'Pintinho', pixel: 3, flap: 10 },
}
export const SOUL_NOTES: Record<SoulNote, string> = { tonic: 'Tônica', consonant: 'Consonante', tension: 'Tensão', leading: 'Sensível', outside: 'Fora da escala' }
export const SOUL_WEAPONS: Record<SoulWeapon, string> = { blast: 'Explosão', bullet: 'Bala', arrow: 'Flecha', impact: 'Impacto' }
export const SOUL_RARITIES: Record<SoulRarity, { name: string; color: string }> = {
  common: { name: 'Comum', color: '#93a79a' }, uncommon: { name: 'Incomum', color: '#7bd88f' },
  rare: { name: 'Rara', color: '#4cc9f0' }, legendary: { name: 'Lendária', color: '#ffb703' },
}

// what a rare one asks for: every axis named must be one of the listed (an axis left out: any)
export type SoulRecipe = { species?: readonly SoulSpecies[]; state?: SoulState; shot?: readonly SoulShot[]; note?: readonly SoulNote[]; weapon?: readonly SoulWeapon[] }
// halo: the eye glows (the dead ones', and a few rare ones')
export type SoulLook = { shape: SoulShape; pixel: number; body: string; wing: string; belly: string; beak: string; eye: string; halo: boolean }
export type SoulEntry = {
  id: string; name: string
  species: SoulSpecies | null // null: a rare one any species can be
  state: SoulState; shot: SoulShot | null
  rarity: SoulRarity
  cls: SoulClassId // how it flies when let out (lib/pigchicken/soul-follow.ts)
  look: SoulLook
  bird: string // the real bird it takes after (a GuideBird's id): its "Inspiration"
  follow?: Partial<SoulFollowParams> // its own numbers over its class's
  act?: Partial<SoulActParams> // what it does let out (lib/pigchicken/soul-acts.ts): its own over its class's
  recipe?: SoulRecipe // a rare one
}

// ---------- colours ----------
const channels = (hex: string) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const toward = (hex: string, to: number, k: number) => '#' + channels(hex).map(c => Math.round(c + (to - c) * k).toString(16).padStart(2, '0')).join('')
// a bird in one colour: darker wings, a pale belly
export const soulPalette = (color: string) => ({ body: color, wing: toward(color, 0, 0.32), belly: toward(color, 255, 0.55), beak: '#ffb347' })
const EYE = '#101018'
// a living one wears its species' colour; a dead one is grey, and its eye glows in that colour
const baseLook = (species: SoulSpecies, state: SoulState, shape: SoulShape): SoulLook => (state === 'dead'
  ? { shape, pixel: SOUL_SHAPES[shape].pixel, ...UNDEAD_LOOK, eye: SOUL_SPECIES[species].color, halo: true }
  : { shape, pixel: SOUL_SHAPES[shape].pixel, ...soulPalette(SOUL_SPECIES[species].color), eye: EYE, halo: false })

// ---------- what a sheet may hold: anything else is dropped or brought inside its limits ----------
export const SOUL_PIXEL = { min: 2, max: 8 }
export const SOUL_NAME_MAX = 40
export const SOUL_RARES_MAX = 40
const has = <T extends string>(of: Record<T, unknown>, v: unknown): v is T => typeof v === 'string' && Object.prototype.hasOwnProperty.call(of, v)
const cleanName = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, SOUL_NAME_MAX) : null)
export const SOUL_LOOK_COLOURS = ['body', 'wing', 'belly', 'beak', 'eye'] as const
function cleanLook(raw: unknown, base: SoulLook): SoulLook {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>, out = { ...base }
  if (has(SOUL_SHAPES, r.shape)) out.shape = r.shape
  if (typeof r.pixel === 'number' && Number.isFinite(r.pixel)) out.pixel = Math.max(SOUL_PIXEL.min, Math.min(SOUL_PIXEL.max, Math.round(r.pixel)))
  for (const k of SOUL_LOOK_COLOURS) { const v = r[k]; if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) out[k] = v.toLowerCase() }
  if (typeof r.halo === 'boolean') out.halo = r.halo
  return out
}
function cleanFollow(raw: unknown): Partial<SoulFollowParams> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>, out: Partial<SoulFollowParams> = {}
  for (const k of Object.keys(SOUL_FOLLOW_RANGES) as (keyof typeof SOUL_FOLLOW_RANGES)[]) {
    const v = r[k], range = SOUL_FOLLOW_RANGES[k]
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(range.min, Math.min(range.max, v))
  }
  if (has(SOUL_SIDES, r.side)) out.side = r.side
  if (has(SOUL_PATTERNS, r.pattern)) out.pattern = r.pattern
  return Object.keys(out).length ? out : undefined
}
function cleanAct(raw: unknown): Partial<SoulActParams> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>, out: Partial<SoulActParams> = {}
  for (const k of Object.keys(SOUL_ACT_RANGES) as (keyof typeof SOUL_ACT_RANGES)[]) {
    const v = r[k], range = SOUL_ACT_RANGES[k]
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.max(range.min, Math.min(range.max, v))
  }
  if (has(SOUL_HELPS, r.help)) out.help = r.help
  if (has(SOUL_HINDERS, r.hinder)) out.hinder = r.hinder
  if (typeof r.poopSpare === 'boolean') out.poopSpare = r.poopSpare
  return Object.keys(out).length ? out : undefined
}
function some<T extends string>(raw: unknown, order: readonly T[]): T[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const got = order.filter(x => raw.includes(x))
  return got.length ? got : undefined
}
// a recipe as the catalogue keeps it: each axis in its order; one that asks for a weapon asks for a dead soul
export function cleanRecipe(raw: unknown): SoulRecipe {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>, out: SoulRecipe = {}
  const species = some(r.species, SOUL_SPECIES_ORDER.filter(x => x !== 'chick')), weapon = some(r.weapon, SOUL_WEAPON_ORDER)
  const shot = some(r.shot, SOUL_SHOT_ORDER), note = some(r.note, SOUL_NOTE_ORDER)
  if (species) out.species = species
  if (weapon) out.state = 'dead'; else if (r.state === 'alive' || r.state === 'dead') out.state = r.state
  if (shot) out.shot = shot
  if (note) out.note = note
  if (weapon) out.weapon = weapon
  return out
}

// ---------- the catalogue ----------
const baseId = (species: SoulSpecies, state: SoulState, shot: SoulShot | null) => (species === 'chick' ? 'chick' : `${species}.${state}.${shot ?? 'wind'}`)
function baseEntry(species: SoulSpecies, state: SoulState, shot: SoulShot): SoulEntry {
  const s = SOUL_SHOTS[shot]
  const id = baseId(species, state, shot)
  return {
    id, name: `${state === 'alive' ? s.alive : s.dead} ${SOUL_SPECIES[species].of}`, species, state, shot,
    rarity: soulRarity(originOf(species, state, { note: 'tonic' })), cls: soulClassOf({ species, shot }),
    look: baseLook(species, state, shot), bird: inspirationOf({ id, species, state, shot }),
  }
}
// a rare one: its shape is its family's unless it says another, its colours come from `body` unless it says others
// a rare one as the sheets keep it, and as an entry (what its recipe fixes is its species, state and family)
// (bird: only when it is not the one the code's rule gives it)
export type SoulRare = { id: string; name: string; rarity: SoulRarity; cls: SoulClassId; look: SoulLook; bird?: string; follow?: Partial<SoulFollowParams>; act?: Partial<SoulActParams>; recipe: SoulRecipe }
const rareLook = (shape: SoulShape, body: string): SoulLook => ({ shape, pixel: SOUL_SHAPES[shape].pixel, ...soulPalette(body), beak: '#fff3b0', eye: EYE, halo: false })
const rareAxes = (r: Pick<SoulRare, 'id' | 'recipe'>) => ({
  id: r.id, species: r.recipe.species?.length === 1 ? r.recipe.species[0] : null, state: r.recipe.state ?? 'alive' as SoulState, shot: r.recipe.shot?.length === 1 ? r.recipe.shot[0] : null,
})
const rareEntry = (r: SoulRare): SoulEntry => ({
  ...rareAxes(r), name: r.name, rarity: r.rarity, cls: r.cls, look: r.look, bird: r.bird ?? inspirationOf(rareAxes(r)), ...(r.follow ? { follow: r.follow } : {}), ...(r.act ? { act: r.act } : {}), recipe: r.recipe,
})
const asRare = (e: SoulEntry): SoulRare => ({ id: e.id, name: e.name, rarity: e.rarity, cls: e.cls, look: e.look, ...(e.bird !== inspirationOf(rareAxes({ id: e.id, recipe: e.recipe ?? {} })) ? { bird: e.bird } : {}), ...(e.follow ? { follow: e.follow } : {}), ...(e.act ? { act: e.act } : {}), recipe: e.recipe ?? {} })
function rare(id: string, name: string, rarity: SoulRarity, asks: SoulRecipe, body: string, over: Partial<SoulLook> & { cls?: SoulClassId } = {}): SoulEntry {
  const recipe = cleanRecipe(asks), shot = recipe.shot?.length === 1 ? recipe.shot[0] : null
  const { cls, ...look } = over
  return rareEntry({ id: `rare.${id}`, name, rarity, cls: cls ?? soulClassOf({ species: 'horde', shot }), look: { ...rareLook(look.shape ?? shot ?? 'wind', body), ...look }, recipe })
}
// the rare ones, the most particular first: a soul is the first one whose recipe it fits
export const RARE_SOULS: readonly SoulEntry[] = [
  rare('fenix', 'Fênix', 'legendary', { species: ['dragon'], state: 'alive', note: ['tonic'] }, '#ff5400', { shape: 'strings', pixel: 5, wing: '#c1121f', belly: '#ffd23f', cls: 'patrol' }),
  rare('dragao-desafinado', 'Dragão Desafinado', 'legendary', { species: ['dragon'], state: 'alive', note: ['outside'] }, '#9d4edd', { shape: 'rebate', pixel: 6, belly: '#ffb703', cls: 'lazy' }),
  rare('vaga-lume', 'Vaga-lume', 'rare', { species: ['lantern'], state: 'alive', shot: ['wind'], note: ['tension'] }, '#3a5a40', { belly: '#d9ed92', eye: '#d9ed92', halo: true }),
  rare('metronomo', 'Metrônomo', 'rare', { species: ['drum'], state: 'alive', shot: ['percussion'], note: ['tonic'] }, '#e9c46a'),
  rare('gemea-ma', 'Gêmea Má', 'rare', { species: ['twin'], state: 'dead', weapon: ['impact'], note: ['outside', 'leading'] }, '#3a0ca3', { shape: 'keys', eye: '#ff3b3b', halo: true, cls: 'escort' }),
  rare('alma-blue', 'Alma Blue', 'rare', { state: 'alive', shot: ['strings'], note: ['outside'] }, '#3f6fd9'),
  rare('quase-la', 'Quase Lá', 'rare', { state: 'alive', shot: ['keys'], note: ['leading'] }, '#ff99c8'),
  rare('bumerangue', 'Bumerangue', 'rare', { state: 'alive', shot: ['rebate'], note: ['tonic'] }, '#f4a261'),
  rare('desafinada', 'Desafinada', 'rare', { state: 'alive', shot: ['wind'], note: ['outside'] }, '#b5e48c', { wing: '#ff006e' }),
  rare('flechada', 'Flechada', 'rare', { state: 'dead', weapon: ['arrow'], note: ['tonic'] }, '#2a9d8f', { shape: 'strings', eye: '#ffffff', halo: true, cls: 'patrol' }),
  rare('estilhaco', 'Estilhaço', 'legendary', { state: 'dead', weapon: ['blast'], note: ['outside'] }, '#ff006e', { shape: 'percussion', pixel: 5, eye: '#ffd23f', halo: true, cls: 'rhythm' }),
  rare('bala-perdida', 'Bala Perdida', 'rare', { state: 'dead', weapon: ['bullet'], note: ['leading'] }, '#adb5bd', { shape: 'wind', eye: '#4cc9f0', halo: true, cls: 'lazy' }),
]
// the ones the rule makes: their ids, species, states and families never change
const BASE_SOULS: readonly SoulEntry[] = [
  ...SOUL_SPECIES_ORDER.filter(s => s !== 'chick').flatMap(species => [
    ...SOUL_SHOT_ORDER.map(shot => baseEntry(species, 'alive', shot)),
    ...(species === 'dragon' ? [] : SOUL_SHOT_ORDER.map(shot => baseEntry(species, 'dead', shot))),
  ]),
  { id: 'chick', name: 'Pintinho', species: 'chick', state: 'alive', shot: null, rarity: 'common', cls: 'chick', look: baseLook('chick', 'alive', 'chick'), bird: inspirationOf({ id: 'chick', species: 'chick', state: 'alive', shot: null }) },
]
export const CODE_SOUL_ENTRIES: readonly SoulEntry[] = [...BASE_SOULS, ...RARE_SOULS]

// ---------- the sheets: what an admin changed over the code's catalogue ----------
// A soul of the rule keeps its id, species, state and family; its sheet holds only what differs from the code's. The
// rare ones are a list of their own, kept whole once anything in it differs from the code's.
export type SoulSheet = { name?: string; rarity?: SoulRarity; cls?: SoulClassId; look?: Partial<SoulLook>; bird?: string; follow?: Partial<SoulFollowParams>; act?: Partial<SoulActParams> }
export type SoulsFile = { sheets?: Record<string, SoulSheet>; rares?: SoulRare[] }
function cleanRare(raw: unknown, taken: Set<string>): SoulRare | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const id = typeof r.id === 'string' && /^rare\.[a-z0-9-]{1,40}$/.test(r.id) ? r.id : null, name = cleanName(r.name)
  if (!id || !name || taken.has(id)) return null
  taken.add(id)
  const recipe = cleanRecipe(r.recipe), shot = recipe.shot?.length === 1 ? recipe.shot[0] : null, follow = cleanFollow(r.follow), act = cleanAct(r.act)
  return {
    id, name, rarity: has(SOUL_RARITIES, r.rarity) ? r.rarity : 'rare', cls: has(SOUL_CLASSES, r.cls) ? r.cls : soulClassOf({ species: 'horde', shot }),
    look: cleanLook(r.look, rareLook(shot ?? 'wind', '#9aa0a8')), ...(isGuideBird(r.bird) && r.bird !== inspirationOf(rareAxes({ id, recipe })) ? { bird: r.bird } : {}), ...(follow ? { follow } : {}), ...(act ? { act } : {}), recipe,
  }
}
/** The code's catalogue with a sheets file over it (whatever it holds: the unknown is dropped). */
export function soulEntriesOver(file: unknown): SoulEntry[] {
  const f = (file && typeof file === 'object' && !Array.isArray(file) ? file : {}) as { sheets?: unknown; rares?: unknown }
  const sheets = (f.sheets && typeof f.sheets === 'object' && !Array.isArray(f.sheets) ? f.sheets : {}) as Record<string, unknown>
  const base = BASE_SOULS.map(e => {
    const s = sheets[e.id]
    if (!s || typeof s !== 'object') return e
    const r = s as Record<string, unknown>, follow = cleanFollow(r.follow), act = cleanAct(r.act)
    return { ...e, name: cleanName(r.name) ?? e.name, rarity: has(SOUL_RARITIES, r.rarity) ? r.rarity : e.rarity, cls: has(SOUL_CLASSES, r.cls) ? r.cls : e.cls, look: cleanLook(r.look, e.look), bird: isGuideBird(r.bird) ? r.bird : e.bird, ...(follow ? { follow } : {}), ...(act ? { act } : {}) }
  })
  if (!Array.isArray(f.rares)) return [...base, ...RARE_SOULS]
  const taken = new Set<string>()
  return [...base, ...f.rares.slice(0, SOUL_RARES_MAX).map(r => cleanRare(r, taken)).filter((r): r is SoulRare => !!r).map(rareEntry)]
}
// the same whatever the order of its keys
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x)) ?? ''
/** The sheets file of a catalogue (what "Salvar no game" writes): only what differs from the code's. */
export function soulsFile(entries: readonly SoulEntry[]): SoulsFile {
  const out: SoulsFile = {}, sheets: Record<string, SoulSheet> = {}
  for (const code of BASE_SOULS) {
    const e = entries.find(x => x.id === code.id)
    if (!e || e === code) continue
    const s: SoulSheet = {}, look: Partial<SoulLook> = {}
    if (e.name !== code.name) s.name = e.name
    if (e.rarity !== code.rarity) s.rarity = e.rarity
    if (e.cls !== code.cls) s.cls = e.cls
    for (const k of Object.keys(code.look) as (keyof SoulLook)[]) if (e.look[k] !== code.look[k]) (look as Record<string, unknown>)[k] = e.look[k]
    if (Object.keys(look).length) s.look = look
    if (e.bird !== code.bird) s.bird = e.bird
    if (e.follow && Object.keys(e.follow).length) s.follow = e.follow
    if (e.act && Object.keys(e.act).length) s.act = e.act
    if (Object.keys(s).length) sheets[code.id] = s
  }
  if (Object.keys(sheets).length) out.sheets = sheets
  const rares = entries.filter(e => e.recipe).map(asRare)
  if (canon(rares) !== canon(RARE_SOULS.map(asRare))) out.rares = rares
  return out
}
/** Why a sheets file is not valid (an unknown soul or field, a value the game would change), or null. */
export function soulsFileProblem(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'O arquivo precisa ser um objeto.'
  for (const k of Object.keys(value)) if (k !== 'sheets' && k !== 'rares') return `${k}: campo desconhecido.`
  const v = value as { sheets?: unknown; rares?: unknown }, back = soulsFile(soulEntriesOver(value))
  if ('sheets' in v) {
    if (!v.sheets || typeof v.sheets !== 'object' || Array.isArray(v.sheets)) return 'sheets: precisa ser um objeto com um campo por alma.'
    for (const [id, sheet] of Object.entries(v.sheets)) {
      if (!BASE_SOULS.some(e => e.id === id)) return `sheets.${id}: alma desconhecida.`
      if (canon(back.sheets?.[id]) !== canon(sheet)) return `sheets.${id}: campo desconhecido, valor inválido ou igual ao do código.`
    }
  }
  if ('rares' in v) {
    if (!Array.isArray(v.rares)) return 'rares: precisa ser uma lista.'
    const want = back.rares ?? RARE_SOULS.map(asRare)
    for (let i = 0; i < v.rares.length; i++) if (canon(want[i]) !== canon(v.rares[i])) return `rares[${i}]: campo desconhecido, valor inválido ou id repetido.`
    if (want.length !== v.rares.length) return 'rares: lista inválida.'
  }
  return null
}

/** The game's catalogue: the code's, with data/pigchicken/default-souls.json over it. */
export const SOUL_ENTRIES: readonly SoulEntry[] = liveDefault('souls', DEFAULTS_FILE, soulEntriesOver)
// the catalogue in use: the game's, or an admin's draft. What a soul is, how it looks and how it flies read it;
// the version tells whoever keeps something worked out from it that it changed
let live: readonly SoulEntry[] = SOUL_ENTRIES, version = 0
export const soulEntries = () => live
export const soulCatalogVersion = () => version
export function setSoulEntries(list: readonly SoulEntry[]) { if (list !== live) { live = list; version++ } }
// a new catalogue saved in the game changes the one in use unless an admin's draft is open
onGameDefault('souls', () => { if (live === SOUL_ENTRIES) version++ })

// (a recipe that asks for nothing is nobody's)
const fits = (r: SoulRecipe, o: SoulOrigin) =>
  Object.keys(r).length > 0 && (!r.species || r.species.includes(o.species)) && (!r.state || r.state === o.state) && (!r.shot || (!!o.shot && r.shot.includes(o.shot))) &&
  (!r.note || (!!o.note && r.note.includes(o.note))) && (!r.weapon || (!!o.weapon && r.weapon.includes(o.weapon)))
// the entry a soul is. One nobody saw the instrument of counts as a wind one (it flies like one); a dead dragon
// (there is none) would be the living one.
export function entryOf(o: SoulOrigin, entries: readonly SoulEntry[] = live): SoulEntry {
  const found = o.species === 'chick' ? null : entries.find(e => e.recipe && fits(e.recipe, o))
  if (found) return found
  const want = baseId(o.species, o.state, o.shot)
  return entries.find(e => e.id === want) ?? entries.find(e => e.id === baseId(o.species, 'alive', o.shot)) ?? entries[0]
}

// the colour of its glow: its eye's when that glows, its body's otherwise
export const entryColor = (e: SoulEntry) => (e.look.halo ? e.look.eye : e.look.body)
const CODE_LOOKS = new Map(CODE_SOUL_ENTRIES.map(e => [e.id, e.look]))
/** How a soul of this entry looks in the world. A rare one is its sheet. One of the rule wears the alien it was (a
 * living one its colour, a dead one the colour of the note in its eye), except in what its sheet painted over the code's. */
export function entryLookFor(e: SoulEntry, color: string): SoulLook {
  if (e.recipe) return e.look
  const code = CODE_LOOKS.get(e.id) ?? e.look, worn: Partial<SoulLook> = e.state === 'dead' ? { eye: color } : soulPalette(color)
  const out = { ...e.look }
  for (const k of SOUL_LOOK_COLOURS) { const v = worn[k]; if (v && e.look[k] === code[k]) out[k] = v }
  return out
}
// how it flies when let out: its class's numbers, with its own over them
export const entryFollowParams = (e: SoulEntry): SoulFollowParams => ({ ...SOUL_FOLLOW_DEFAULTS, ...SOUL_CLASSES[e.cls].params, ...e.follow })
// what it does then, for her and against her: its class's and its state's numbers (soulActBase), with its own over them
export const entryActBase = (e: SoulEntry): SoulActParams => soulActBase(e.cls, e.state, e.rarity, e.species)
export const entryActParams = (e: SoulEntry): SoulActParams => ({ ...entryActBase(e), ...e.act })

// ---------- traits: the notes and the weapons an entry can be found with ----------
const traits = new WeakMap<readonly SoulEntry[], Map<string, { notes: SoulNote[]; weapons: SoulWeapon[] }>>()
function traitTable(entries: readonly SoulEntry[]) {
  let table = traits.get(entries)
  if (table) return table
  const seen = new Map<string, { notes: Set<SoulNote>; weapons: Set<SoulWeapon> }>()
  for (const species of SOUL_SPECIES_ORDER) for (const state of ['alive', 'dead'] as const) {
    if (species === 'chick' || (species === 'dragon' && state === 'dead')) continue
    for (const shot of SOUL_SHOT_ORDER) for (const note of SOUL_NOTE_ORDER) for (const weapon of state === 'dead' ? SOUL_WEAPON_ORDER : [null]) {
      const e = entryOf({ species, state, shot, note, weapon }, entries)
      const at = seen.get(e.id) ?? { notes: new Set(), weapons: new Set() }
      at.notes.add(note); if (weapon) at.weapons.add(weapon)
      seen.set(e.id, at)
    }
  }
  table = new Map([...seen].map(([id, t]) => [id, { notes: SOUL_NOTE_ORDER.filter(n => t.notes.has(n)), weapons: SOUL_WEAPON_ORDER.filter(w => t.weapons.has(w)) }]))
  traits.set(entries, table)
  return table
}
// (an entry no soul can be has none; so does the chick)
export const entryTraits = (e: SoulEntry, entries: readonly SoulEntry[] = live) => traitTable(entries).get(e.id) ?? { notes: [], weapons: [] }
export const entryClassName = (e: SoulEntry) => SOUL_CLASSES[e.cls].name

// ---------- the recipe: how a soul like this one is made, in words ----------
const or = (names: string[]) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} ou ${names[names.length - 1]}` : names[0])
const RECIPE_SHOTS: Record<SoulShot, string> = { wind: 'um instrumento de Sopro', strings: 'um instrumento de Cordas', keys: 'um instrumento de Teclas', percussion: 'um instrumento de Percussão', rebate: 'notas de alien rebatidas com um golpe' }
const RECIPE_WEAPONS: Record<SoulWeapon, string> = { blast: 'uma explosão', bullet: 'uma arma de fogo', arrow: 'uma flecha', impact: 'um golpe' }
const RECIPE_NOTES: Record<SoulNote, string> = { tonic: 'a tônica', consonant: 'uma consonante (terça ou quinta)', tension: 'uma nota de tensão', leading: 'a sensível (sétima)', outside: 'uma nota fora da escala' }
/** What to do to get a soul of this entry: which alien, how it has to die (by music or by a weapon), with which
 * family of instrument and, for a rare one, on which note. */
export function recipeText(e: SoulEntry): string {
  if (e.species === 'chick') return 'Capture um pintinho com o Passaguá.'
  const r: SoulRecipe = e.recipe ?? { species: e.species ? [e.species] : undefined, state: e.state, shot: e.shot ? [e.shot] : undefined }
  const who = r.species?.length ? `um alien ${or(r.species.map(s => SOUL_SPECIES[s].name))}` : 'um alien qualquer'
  const play = r.shot?.length ? or(r.shot.map(s => RECIPE_SHOTS[s])) : 'qualquer instrumento'
  const note = r.note?.length ? `, com a última nota sendo ${or(r.note.map(n => RECIPE_NOTES[n]))}` : ''
  const net = 'capture o pássaro com o Passaguá'
  if (r.state === 'dead') return `Mate ${who} com ${r.weapon?.length ? or(r.weapon.map(w => RECIPE_WEAPONS[w])) : 'qualquer arma'}, ressuscite-o tocando ${play}${note} e ${net}.`
  if (r.state === 'alive') return `Encha a harmonia de ${who} tocando ${play}${note} e ${net}.`
  return `Encha a harmonia de ${who}, vivo ou morto, tocando ${play}${note} e ${net}.`
}
/** the real bird an entry takes after */
export const entryBird = (e: SoulEntry) => guideBird(e.bird)

// ---------- the collection ----------
// n: how many were caught; at: when the first one was (ms); notes, weapons: the ones seen so far
export type SoulFound = { n: number; at: number; notes: SoulNote[]; weapons: SoulWeapon[] }
export type SoulCollection = Record<string, SoulFound>

// a soul caught: its entry counts one more and keeps its note and its weapon. first: the entry is new;
// trait: it is not, but the note or the weapon is.
export function recordSoul(col: SoulCollection, soul: SoulOrigin, now: number, entries: readonly SoulEntry[] = live) {
  const entry = entryOf(soul, entries), was = col[entry.id]
  const notes = was ? was.notes.slice() : [], weapons = was ? was.weapons.slice() : []
  let trait = false
  if (soul.note && !notes.includes(soul.note)) { notes.push(soul.note); trait = !!was }
  if (soul.weapon && !weapons.includes(soul.weapon)) { weapons.push(soul.weapon); trait = !!was }
  return { col: { ...col, [entry.id]: { n: (was?.n ?? 0) + 1, at: was?.at ?? now, notes, weapons } }, entry, first: !was, trait }
}
// two copies of a collection (this browser's and the account's) into one: nothing found is ever lost. The server
// merges the same way (supabase/migrations/202611110001_pigchicken_souls.sql)
export function mergeCollections(a: SoulCollection, b: SoulCollection): SoulCollection {
  const out: SoulCollection = {}
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id], y = b[id]
    if (!x || !y) { const one = (x ?? y) as SoulFound; out[id] = { ...one, notes: one.notes.slice(), weapons: one.weapons.slice() }; continue }
    // (a date that is not known, 0, never takes the place of one that is)
    out[id] = {
      n: Math.max(x.n, y.n), at: x.at > 0 && y.at > 0 ? Math.min(x.at, y.at) : Math.max(x.at, y.at),
      notes: SOUL_NOTE_ORDER.filter(n => x.notes.includes(n) || y.notes.includes(n)), weapons: SOUL_WEAPON_ORDER.filter(w => x.weapons.includes(w) || y.weapons.includes(w)),
    }
  }
  return out
}
// whatever was stored, as a collection (unknown notes and weapons dropped; entries the catalogue no longer has are
// kept: they may come back)
export function normalizeCollection(raw: unknown): SoulCollection {
  const out: SoulCollection = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== 'object' || id.length > 80) continue
    const f = v as Partial<SoulFound>
    const n = Math.floor(Number(f.n)), at = Number(f.at)
    if (!(n >= 1)) continue
    out[id] = {
      n, at: Number.isFinite(at) && at > 0 ? at : 0,
      notes: SOUL_NOTE_ORDER.filter(x => Array.isArray(f.notes) && f.notes.includes(x)),
      weapons: SOUL_WEAPON_ORDER.filter(x => Array.isArray(f.weapons) && f.weapons.includes(x)),
    }
  }
  return out
}
export function collectionProgress(col: SoulCollection, entries: readonly SoulEntry[] = live) {
  let found = 0, stars = 0, allStars = 0
  for (const e of entries) {
    const t = entryTraits(e, entries), f = col[e.id]
    allStars += t.notes.length + t.weapons.length
    if (!f) continue
    found++; stars += t.notes.filter(n => f.notes.includes(n)).length + t.weapons.filter(w => f.weapons.includes(w)).length
  }
  return { found, total: entries.length, stars, allStars }
}

// ---------- this browser's copy ----------
const STORE = 'pigchicken-souls-v1'
const EVENT = 'pigchicken-souls'
// the same for two collections that hold the same, whatever the order of their entries
export const collectionKey = (col: SoulCollection) => JSON.stringify(Object.keys(col).sort().map(id => [id, col[id].n, col[id].at, col[id].notes, col[id].weapons]))
export function loadCollection(): SoulCollection {
  try { return normalizeCollection(JSON.parse(window.localStorage.getItem(STORE) || 'null')?.found) } catch { return {} }
}
export function saveCollection(col: SoulCollection) {
  try { window.localStorage.setItem(STORE, JSON.stringify({ found: col, _v: 1 })) } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(EVENT)) } catch { /* ignore */ }
}
export function subscribeCollection(onChange: (col: SoulCollection) => void) {
  const handler = () => onChange(loadCollection())
  window.addEventListener(EVENT, handler); window.addEventListener('storage', handler)
  return () => { window.removeEventListener(EVENT, handler); window.removeEventListener('storage', handler) }
}
// a soul just caught goes into this browser's collection; says what is new about it
export function collectSoul(soul: SoulOrigin, now = Date.now()) {
  const r = recordSoul(loadCollection(), soul, now)
  saveCollection(r.col)
  return r
}

// ---------- editing the sheets (the admin's editor): every change gives a whole new catalogue, cleaned ----------
const tidy = (entries: readonly SoulEntry[]) => soulEntriesOver(soulsFile(entries))
export const changeEntry = (entries: readonly SoulEntry[], id: string, change: (e: SoulEntry) => SoulEntry) => tidy(entries.map(e => (e.id === id ? change(e) : e)))
// an entry back to the game's (a rare one the game does not have stays as it is)
export const resetEntry = (entries: readonly SoulEntry[], id: string) => { const was = SOUL_ENTRIES.find(e => e.id === id); return was ? tidy(entries.map(e => (e.id === id ? was : e))) : entries.slice() }
// a new rare one, a copy of `from` when given, placed first (the first recipe that fits wins); null: no room for more
export function addRare(entries: readonly SoulEntry[], from?: SoulEntry | null): { entries: SoulEntry[]; id: string } | null {
  if (entries.filter(e => e.recipe).length >= SOUL_RARES_MAX) return null
  let n = 1, id = 'rare.nova'
  while (entries.some(e => e.id === id)) id = `rare.nova-${++n}`
  const made: SoulEntry = from
    ? { ...from, id, name: `${from.name} ${n + 1}`.slice(0, SOUL_NAME_MAX), recipe: from.recipe ?? cleanRecipe({ species: from.species ? [from.species] : undefined, state: from.state, shot: from.shot ? [from.shot] : undefined }) }
    : rareEntry({ id, name: n > 1 ? `Nova rara ${n}` : 'Nova rara', rarity: 'rare', cls: 'sentinel', look: rareLook('wind', '#9aa0a8'), recipe: { state: 'alive', note: ['outside'] } })
  const at = entries.findIndex(e => e.recipe)
  return { entries: tidy([...entries.slice(0, at < 0 ? entries.length : at), made, ...entries.slice(at < 0 ? entries.length : at)]), id }
}
export const removeRare = (entries: readonly SoulEntry[], id: string) => tidy(entries.filter(e => !(e.recipe && e.id === id)))
// a rare one a place up (-1) or down (1) among the rare ones
export function moveRare(entries: readonly SoulEntry[], id: string, by: -1 | 1) {
  const i = entries.findIndex(e => e.recipe && e.id === id), j = i + by
  if (i < 0 || j < 0 || j >= entries.length || !entries[j].recipe) return entries.slice()
  const out = entries.slice(); [out[i], out[j]] = [out[j], out[i]]
  return tidy(out)
}

// an admin's draft of the sheets, in this browser (none: the game's catalogue)
const SHEETS_STORE = 'pigchicken-soul-sheets-v1'
const SHEETS_EVENT = 'pigchicken-soul-sheets'
export function loadSoulEntries(): readonly SoulEntry[] {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SHEETS_STORE) || 'null')
    if (saved && typeof saved === 'object') return soulEntriesOver(saved)
  } catch { /* storage unavailable */ }
  return SOUL_ENTRIES
}
// (a draft that is the game's catalogue again is no draft: the game's later changes reach this browser)
export function saveSoulEntries(entries: readonly SoulEntry[]) {
  const file = soulsFile(entries)
  try {
    if (canon(file) === canon(soulsFile(SOUL_ENTRIES))) window.localStorage.removeItem(SHEETS_STORE)
    else window.localStorage.setItem(SHEETS_STORE, JSON.stringify(file))
  } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent(SHEETS_EVENT)) } catch { /* ignore */ }
}
export function subscribeSoulEntries(onChange: (entries: readonly SoulEntry[]) => void) {
  const handler = () => onChange(loadSoulEntries())
  window.addEventListener(SHEETS_EVENT, handler); window.addEventListener('storage', handler)
  return () => { window.removeEventListener(SHEETS_EVENT, handler); window.removeEventListener('storage', handler) }
}
