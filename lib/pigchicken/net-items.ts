// The items lying in the world, online: the lobby owner's browser keeps them all (the layout's, the racks', the Baús'
// loot and whatever anyone drops) and tells the others where they are; the others draw copies, ask the owner for the
// one their player takes and hand it what their players drop. Pure functions on the combat's lists; the sync
// (lib/pigchicken/net-world-sync.ts) moves them through the game server's "items" message.
import type { ItemId } from './items'
import type { Owned, Pickup } from './combat'
import { cageCap, newCage } from './cages'
import { soulFromWho, soulWho, type NetSoulWho } from './net-souls'

// an item as it travels: what it is and how it is (ammo, wear, size, a Gaiola's souls)
export type NetOwned = { i: ItemId; a: number; d: number; s?: number; c?: [number, NetSoulWho[]] }
// one item on the ground: [owner's id, what it is, x, y, 1 resting, s it cannot be taken yet, how fast it falls]
export type NetItem = [number, NetOwned, number, number, number, number, number]
// a drop handed to the owner: what, where, how fast it falls, s it cannot be taken
export type NetDrop = [NetOwned, number, number, number, number]
// the message: l (the owner's whole list), t (takes asked of the owner: the items' ids), g (the owner gives them: id
// and what it is), n (the owner says no: they are gone), d (drops handed to the owner)
export type NetItemsMsg = { l?: NetItem[]; t?: number[]; g?: [number, NetOwned][]; n?: number[]; d?: NetDrop[] }

export const NET_ITEMS_MAX = 200
export const ITEM_TAKE_WAIT = 1.5 // s an item asked for stays hidden waiting for the answer
const LIMIT = 1e6
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const cap = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const r1 = (v: number) => Math.round(v * 10) / 10

export function ownedOut(o: Owned): NetOwned {
  const out: NetOwned = { i: o.item, a: r1(o.ammo), d: r1(o.durability) }
  if (o.scale !== undefined && o.scale !== 1) out.s = r1(o.scale)
  if (o.cage) out.c = [o.cage.cap, o.cage.souls.slice(0, 64).map(soulWho)]
  return out
}

/** what another browser says an item is (null: not an item); ids: where new souls take theirs from */
export function ownedIn(v: unknown, items: Record<string, unknown>, nextId: () => number): Owned | null {
  const o = v as NetOwned | null
  if (!o || typeof o !== 'object' || typeof o.i !== 'string' || !(o.i in items) || !num(o.a) || !num(o.d)) return null
  const owned: Owned = { item: o.i, ammo: cap(o.a, 0, 100000), durability: cap(o.d, -1, 100000) }
  if (num(o.s)) owned.scale = cap(o.s, 0.1, 10)
  if (Array.isArray(o.c) && o.c.length === 2 && Array.isArray(o.c[1])) {
    const cage = newCage(cageCap(o.c[0]))
    for (const w of o.c[1].slice(0, cage.cap)) { const s = soulFromWho(w, nextId()); if (s) cage.souls.push(s) }
    owned.cage = cage
  }
  return owned
}

/** the owner's items as they go out (a Gaiola's souls only by count would lose them, so they go whole) */
export function exportItems(pickups: readonly Pickup[]): NetItem[] {
  return pickups.slice(0, NET_ITEMS_MAX).map(p => [p.id, ownedOut(p.owned), Math.round(p.x), Math.round(p.y), p.resting ? 1 : 0, r1(p.noPick), p.resting ? 0 : Math.round(p.vy)])
}

/** a key that changes when anything the others see changes */
export const itemsKey = (l: readonly NetItem[]) => JSON.stringify(l)

export type NetItemIn = { id: number; raw: NetOwned; key: string; x: number; y: number; vy: number; resting: boolean; noPick: number }
/** the owner's list as it arrived: the items whose shape is right (what each one is is read only when it changes) */
export function cleanItems(v: unknown, items: Record<string, unknown>): NetItemIn[] {
  if (!Array.isArray(v)) return []
  const out: NetItemIn[] = []
  for (const e of v.slice(0, NET_ITEMS_MAX)) {
    if (!Array.isArray(e) || e.length < 6 || !num(e[0]) || !num(e[2]) || !num(e[3]) || Math.abs(e[2]) > LIMIT || Math.abs(e[3]) > LIMIT) continue
    const o = e[1] as NetOwned | null
    if (!o || typeof o !== 'object' || typeof o.i !== 'string' || !(o.i in items)) continue
    out.push({ id: e[0], raw: o, key: JSON.stringify(o), x: e[2], y: e[3], vy: num(e[6]) ? cap(e[6], -3000, 3000) : 0, resting: !!e[4], noPick: num(e[5]) ? cap(e[5], 0, 5) : 0 })
  }
  return out
}

export function cleanDrops(v: unknown, items: Record<string, unknown>, nextId: () => number): { owned: Owned; x: number; y: number; vy: number; noPick: number }[] {
  if (!Array.isArray(v)) return []
  const out: { owned: Owned; x: number; y: number; vy: number; noPick: number }[] = []
  for (const e of v.slice(0, 32)) {
    if (!Array.isArray(e) || e.length < 5 || ![e[1], e[2], e[3], e[4]].every(num) || Math.abs(e[1]) > LIMIT || Math.abs(e[2]) > LIMIT) continue
    const owned = ownedIn(e[0], items, nextId)
    if (owned) out.push({ owned, x: e[1], y: e[2], vy: cap(e[3], -3000, 3000), noPick: cap(e[4], 0, 5) })
  }
  return out
}

const keys = new WeakMap<Pickup, string>()
/**
 * The owner's list on a browser that does not own the lobby: its copies follow it (same object for the same item,
 * so what is offered to a player stays offered), new ones appear, gone ones leave, and anything of its own lying
 * there goes (the owner has the layout's items; this browser hands it its drops). `hidden`: the ones asked for;
 * `make`: what an item is (ownedIn), read again only when it changes.
 */
export function importItems(pickups: Pickup[], list: readonly NetItemIn[], hidden: ReadonlySet<number>, newId: () => number, make: (raw: NetOwned) => Owned | null) {
  const byMirror = new Map<number, Pickup>()
  for (const p of pickups) if (p.mirror !== undefined) byMirror.set(p.mirror, p)
  const next: Pickup[] = []
  for (const e of list) {
    if (hidden.has(e.id)) continue
    let p = byMirror.get(e.id)
    if (!p || keys.get(p) !== e.key) {
      const owned = make(e.raw)
      if (!owned) continue
      if (p) p.owned = owned
      else p = { id: newId(), owned, x: e.x, y: e.y, vy: e.vy, resting: e.resting, noPick: e.noPick, mirror: e.id }
      keys.set(p, e.key)
    }
    p.x = e.x; p.y = e.y; p.resting = e.resting; p.noPick = e.noPick; p.vy = e.resting ? 0 : e.vy
    next.push(p)
  }
  pickups.splice(0, pickups.length, ...next)
}

/** the ids of a take, a no or a give (lists of numbers / of [id, item]) as they arrived */
export const cleanIds = (v: unknown): number[] => (Array.isArray(v) ? v.slice(0, 16).filter(num) : [])
export const cleanGives = (v: unknown): [number, unknown][] => (Array.isArray(v) ? v.slice(0, 16).filter((g): g is [number, unknown] => Array.isArray(g) && g.length === 2 && num(g[0])) : [])
