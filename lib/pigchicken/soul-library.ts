// The library of souls. The catalogue is fixed, not drawn at random: the same alien, state and family of
// instrument always give the same soul (an entry), and a few rare ones have a recipe of their own (a note, a
// weapon, a species). What the note was and what killed it do not make new entries: they are traits the player
// collects inside each one. The collection (what a player has found) lives in this browser.
//
// - SOUL_ENTRIES: 8 species x 5 families alive, 7 x 5 dead (the dragon leaves no undead), the chick, the rare ones.
// - entryOf: the entry a soul is (a rare recipe first, in the list's order; else the one of its species, state and
//   family). Its look (a shape by the family, colours by the species) and how it flies come from the entry.
// - recordSoul / mergeCollections: the collection only grows (first capture, how many, notes and weapons seen).
import { UNDEAD_LOOK } from './birds'
import { SOUL_CLASSES, SOUL_FOLLOW_DEFAULTS, soulClassOf, type SoulClassId, type SoulFollowParams } from './soul-follow'
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
  follow?: Partial<SoulFollowParams> // its own numbers over its class's
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

// ---------- the catalogue ----------
const baseId = (species: SoulSpecies, state: SoulState, shot: SoulShot | null) => (species === 'chick' ? 'chick' : `${species}.${state}.${shot ?? 'wind'}`)
function baseEntry(species: SoulSpecies, state: SoulState, shot: SoulShot): SoulEntry {
  const s = SOUL_SHOTS[shot]
  return {
    id: baseId(species, state, shot), name: `${state === 'alive' ? s.alive : s.dead} ${SOUL_SPECIES[species].of}`, species, state, shot,
    rarity: soulRarity(originOf(species, state, { note: 'tonic' })), cls: soulClassOf({ species, shot }),
    look: baseLook(species, state, shot),
  }
}
// a rare one: its shape is its family's unless it says another, its colours come from `body` unless it says others
function rare(id: string, name: string, rarity: SoulRarity, recipe: SoulRecipe, body: string, over: Partial<SoulLook> & { cls?: SoulClassId } = {}): SoulEntry {
  const shot = recipe.shot?.length === 1 ? recipe.shot[0] : null
  const { cls, ...look } = over, shape = look.shape ?? shot ?? 'wind'
  return {
    id: `rare.${id}`, name, species: recipe.species?.length === 1 ? recipe.species[0] : null, state: recipe.state ?? 'alive', shot, rarity,
    cls: cls ?? soulClassOf({ species: 'horde', shot }),
    look: { shape, pixel: SOUL_SHAPES[shape].pixel, ...soulPalette(body), beak: '#fff3b0', eye: EYE, halo: false, ...look }, recipe,
  }
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
export const SOUL_ENTRIES: readonly SoulEntry[] = [
  ...SOUL_SPECIES_ORDER.filter(s => s !== 'chick').flatMap(species => [
    ...SOUL_SHOT_ORDER.map(shot => baseEntry(species, 'alive', shot)),
    ...(species === 'dragon' ? [] : SOUL_SHOT_ORDER.map(shot => baseEntry(species, 'dead', shot))),
  ]),
  { id: 'chick', name: 'Pintinho', species: 'chick', state: 'alive', shot: null, rarity: 'common', cls: 'chick', look: baseLook('chick', 'alive', 'chick') },
  ...RARE_SOULS,
]

const fits = (r: SoulRecipe, o: SoulOrigin) =>
  (!r.species || r.species.includes(o.species)) && (!r.state || r.state === o.state) && (!r.shot || (!!o.shot && r.shot.includes(o.shot))) &&
  (!r.note || (!!o.note && r.note.includes(o.note))) && (!r.weapon || (!!o.weapon && r.weapon.includes(o.weapon)))
// the entry a soul is. One nobody saw the instrument of counts as a wind one (it flies like one); a dead dragon
// (there is none) would be the living one.
export function entryOf(o: SoulOrigin, entries: readonly SoulEntry[] = SOUL_ENTRIES): SoulEntry {
  const found = o.species === 'chick' ? null : entries.find(e => e.recipe && fits(e.recipe, o))
  if (found) return found
  const want = baseId(o.species, o.state, o.shot)
  return entries.find(e => e.id === want) ?? entries.find(e => e.id === baseId(o.species, 'alive', o.shot)) ?? entries[0]
}

// the colour of its glow: its eye's when that glows, its body's otherwise
export const entryColor = (e: SoulEntry) => (e.look.halo ? e.look.eye : e.look.body)
// how it flies when let out: its class's numbers, with its own over them
export const entryFollowParams = (e: SoulEntry): SoulFollowParams => ({ ...SOUL_FOLLOW_DEFAULTS, ...SOUL_CLASSES[e.cls].params, ...e.follow })

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
export const entryTraits = (e: SoulEntry, entries: readonly SoulEntry[] = SOUL_ENTRIES) => traitTable(entries).get(e.id) ?? { notes: [], weapons: [] }
export const entryClassName = (e: SoulEntry) => SOUL_CLASSES[e.cls].name

// ---------- the collection ----------
// n: how many were caught; at: when the first one was (ms); notes, weapons: the ones seen so far
export type SoulFound = { n: number; at: number; notes: SoulNote[]; weapons: SoulWeapon[] }
export type SoulCollection = Record<string, SoulFound>

// a soul caught: its entry counts one more and keeps its note and its weapon. first: the entry is new;
// trait: it is not, but the note or the weapon is.
export function recordSoul(col: SoulCollection, soul: SoulOrigin, now: number, entries: readonly SoulEntry[] = SOUL_ENTRIES) {
  const entry = entryOf(soul, entries), was = col[entry.id]
  const notes = was ? was.notes.slice() : [], weapons = was ? was.weapons.slice() : []
  let trait = false
  if (soul.note && !notes.includes(soul.note)) { notes.push(soul.note); trait = !!was }
  if (soul.weapon && !weapons.includes(soul.weapon)) { weapons.push(soul.weapon); trait = !!was }
  return { col: { ...col, [entry.id]: { n: (was?.n ?? 0) + 1, at: was?.at ?? now, notes, weapons } }, entry, first: !was, trait }
}
// two copies of a collection (this browser's and the account's) into one: nothing found is ever lost
export function mergeCollections(a: SoulCollection, b: SoulCollection): SoulCollection {
  const out: SoulCollection = {}
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id], y = b[id]
    if (!x || !y) { const one = (x ?? y) as SoulFound; out[id] = { ...one, notes: one.notes.slice(), weapons: one.weapons.slice() }; continue }
    out[id] = { n: Math.max(x.n, y.n), at: Math.min(x.at, y.at), notes: [...new Set([...x.notes, ...y.notes])], weapons: [...new Set([...x.weapons, ...y.weapons])] }
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
export function collectionProgress(col: SoulCollection, entries: readonly SoulEntry[] = SOUL_ENTRIES) {
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
