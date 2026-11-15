// Captured souls. A bird the Passaguá catches (a living one, an undead one or a chick) is a soul with an identity:
// where it came from and how. Four things make it: the species of the alien it was, whether it is alive (its
// harmony filled up) or dead (killed, then brought back by notes), the family of the instrument whose note finished
// it and what that note is in the key. A dead one also remembers the kind of weapon that killed it.
// Each player keeps theirs in their Gaiolas (lib/pigchicken/cages.ts), each a stack: the last one in is the first one out.
// Pure data and functions; the combat (lib/pigchicken/combat.ts) fills it in.
import type { BirdId } from './birds'
import type { CageState } from './cages'

export type SoulSpecies = 'horde' | 'jelly' | 'lantern' | 'shell' | 'twin' | 'mini' | 'drum' | 'dragon' | 'chick'
export type SoulState = 'alive' | 'dead'
// the family of the instrument whose note finished it (rebate: an alien's note sent back by a blow)
export type SoulShot = 'wind' | 'strings' | 'keys' | 'percussion' | 'rebate'
// what that note is in the zone's key
export type SoulNote = 'tonic' | 'consonant' | 'tension' | 'leading' | 'outside'
// the kind of blow that killed it (dead ones only)
export type SoulWeapon = 'blast' | 'bullet' | 'arrow' | 'impact'
export type SoulRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

// shot, note: null when nobody saw them (a chick, a bird that came from another browser)
export type SoulOrigin = { species: SoulSpecies; state: SoulState; shot: SoulShot | null; note: SoulNote | null; weapon: SoulWeapon | null }
// what an alien gathers while it is hit, before it is a bird
export type SoulMark = { shot?: SoulShot | null; note?: SoulNote | null; weapon?: SoulWeapon | null }
// color: the alien's (alive), the note's that brought it back (dead); bird: the drawing it flies as (null: a chick)
// chick: a chick's style (lib/chicken/chick-art.ts), so it is the same chick when it is let out
export type Soul = SoulOrigin & { id: number; rarity: SoulRarity; color: string; bird: BirdId | null; chick?: number }

const SPECIES: readonly SoulSpecies[] = ['horde', 'jelly', 'lantern', 'shell', 'twin', 'mini', 'drum', 'dragon', 'chick']
export const CHICK_SOUL_COLOR = '#ffd23f'

// the species of an alien by its data (the temple's and the songs' carry theirs; the rows' aliens are the horde)
export function soulSpecies(data: unknown): SoulSpecies {
  const d = data as { kind?: string; species?: string } | null | undefined
  if (d?.kind !== 'temple' || !d.species) return 'horde'
  if (d.species === 'dragonHead') return 'dragon'
  return (SPECIES as readonly string[]).includes(d.species) && d.species !== 'chick' ? d.species as SoulSpecies : 'horde'
}

const ITEM_SHOT: Record<string, SoulShot> = {
  flute: 'wind', sax: 'wind', trumpet: 'wind', guitar: 'strings', violin: 'strings', harp: 'strings', keys: 'keys', tambourine: 'percussion', hangdrum: 'percussion', rebate: 'rebate',
}
const VOICE_SHOT: Record<string, SoulShot> = {
  flute: 'wind', sax: 'wind', trumpet: 'wind', guitar: 'strings', violin: 'strings', pizz: 'strings', harp: 'strings', guzheng: 'strings', keys: 'keys', bells: 'percussion', hang: 'percussion', handpan: 'percussion', hangSteel: 'percussion', hangSlap: 'percussion',
}
// by the item that played the note ('rebate': a note sent back); without it, by the note's voice
export function shotClass(by: string | null | undefined, voice?: string | null): SoulShot | null {
  return (by && ITEM_SHOT[by]) || (voice && VOICE_SHOT[voice]) || null
}

// the note in the key (root: any octave; steps: the scale's semitones from it). A bent note (a quarter tone off)
// or one the scale does not have is outside
export function noteClass(midi: number, root: number, steps: readonly number[]): SoulNote {
  const off = (((midi - root) % 12) + 12) % 12, near = Math.round(off) % 12
  if (Math.abs(off - Math.round(off)) > 0.2 || !steps.includes(near)) return 'outside'
  if (near === 0) return 'tonic'
  if (near === 3 || near === 4 || near === 7) return 'consonant'
  if (near === 10 || near === 11) return 'leading'
  return 'tension'
}

const ITEM_WEAPON: Record<string, SoulWeapon> = {
  launcher: 'blast', grenade: 'blast', pistol: 'bullet', smg: 'bullet', rifle: 'bullet', pump: 'bullet', sniper: 'bullet', bow: 'arrow',
}
// everything else is a blow: the bat, the wing, the beak, something thrown
export const weaponClass = (item: string | null | undefined): SoulWeapon => (item && ITEM_WEAPON[item]) || 'impact'

export function originOf(species: SoulSpecies, state: SoulState, mark?: SoulMark | null): SoulOrigin {
  return { species, state, shot: mark?.shot ?? null, note: mark?.note ?? null, weapon: state === 'dead' ? mark?.weapon ?? 'impact' : null }
}

// rarity: every axis adds points
export const RARITY_POINTS = {
  species: { dragon: 3, lantern: 1, twin: 1 } as Partial<Record<SoulSpecies, number>>,
  note: { tension: 1, leading: 2, outside: 3 } as Partial<Record<SoulNote, number>>,
  dead: 1,
}
// the points each level starts at
export const RARITY_AT: [number, SoulRarity][] = [[5, 'legendary'], [2, 'rare'], [1, 'uncommon'], [0, 'common']]
export function soulRarity(o: SoulOrigin): SoulRarity {
  const points = (RARITY_POINTS.species[o.species] ?? 0) + (o.note ? RARITY_POINTS.note[o.note] ?? 0 : 0) + (o.state === 'dead' ? RARITY_POINTS.dead : 0)
  return RARITY_AT.find(([at]) => points >= at)?.[1] ?? 'common'
}

export const newSoul = (id: number, origin: SoulOrigin, color: string, bird: BirdId | null): Soul => ({ ...origin, id, rarity: soulRarity(origin), color, bird })

// ---------- abduction: a caught soul flies to its owner's Gaiola, and counts when it gets there ----------
export const ABDUCT_TIME = 0.55
export const ABDUCT_GAP = 0.08 // several caught at once leave one after the other
// (x, y): where it was caught (world px); t: s on its way (negative: still waiting its turn); cage: the Gaiola of
// its owner's it goes into (lib/pigchicken/cages.ts), which keeps a place for it
export type Abduction = { soul: Soul; owner: string; x: number; y: number; t: number; cage: CageState | null }

// a step of every abduction; the ones that arrived leave the list, in the order they were caught
export function stepAbductions(list: Abduction[], dt: number): Abduction[] {
  const done: Abduction[] = []
  for (let i = 0; i < list.length;) {
    const a = list[i]
    a.t += dt
    if (a.t >= ABDUCT_TIME) { done.push(a); list.splice(i, 1) } else i++
  }
  return done
}

// where it is on its way (k: 0 at the catch, 1 at the Gaiola): pulled up first, then faster and faster, shrinking
export function abductPoint(from: { x: number; y: number }, to: { x: number; y: number }, k: number): { x: number; y: number; scale: number } {
  const u = Math.max(0, Math.min(1, k)), e = u * u
  const cx = from.x + (to.x - from.x) * 0.2, cy = Math.min(from.y, to.y) - 70
  const a = (1 - e) * (1 - e), b = 2 * (1 - e) * e, c = e * e
  return { x: a * from.x + b * cx + c * to.x, y: a * from.y + b * cy + c * to.y, scale: 1 - 0.7 * e }
}

// ---------- scared off: a bird a Passaguá could not keep (its player carries no Gaiola) goes in the same quick flight
// to somewhere else in sight, a wire when there is one ----------
// (x, y) → (tx, ty): world px; t: s on its way; land: puts the bird back in the world there
export type Scare = { soul: Soul; x: number; y: number; tx: number; ty: number; t: number; land: () => void }
export function stepScares(list: Scare[], dt: number) {
  for (let i = 0; i < list.length;) {
    const s = list[i]
    s.t += dt
    if (s.t >= ABDUCT_TIME) { list.splice(i, 1); s.land() } else i++
  }
}
// a point of the box far from `from`: the farthest of a few tries
export function farSpot(box: { l: number; r: number; t: number; b: number }, from: { x: number; y: number }, rand: () => number = Math.random): { x: number; y: number } {
  let best = { x: from.x, y: from.y }, far = -1
  for (let i = 0; i < 10; i++) {
    const x = box.l + rand() * Math.max(0, box.r - box.l), y = box.t + rand() * Math.max(0, box.b - box.t), d = Math.hypot(x - from.x, y - from.y)
    if (d > far) { far = d; best = { x, y } }
  }
  return best
}
