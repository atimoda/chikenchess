// The online Pátio's shared floor and dummies, as data: the items lying on the floor and the life of the layout's
// training dummies are the lobby owner's. Its browser sends them ("world": p and d); the others draw copies of the
// items (grabbing one asks the owner, which grants it to that browser alone) and follow the dummies' life. Pure
// functions on the combat's lists, used by lib/pigchicken/net-world-sync.ts and the tests.
import type { Combat, Pickup, Target } from './combat'
import type { ItemId } from './items'
import { netIdFor, type NetAsk } from './net-world'

// one item on the floor: [id, item, ammo, durability, x, y, resting, noPick, rack]
export type NetPickup = [number, string, number, number, number, number, number, number, string]
// one layout dummy: [element id, life]
export type NetDummy = [string, number]

const r1 = (v: number) => Math.round(v * 10) / 10
const r2 = (v: number) => Math.round(v * 100) / 100
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const LIMIT = 200_000

/** the owner's side: every item on its floor, with its lobby id (and the rack it belongs to) */
export function exportPickups(pickups: readonly Pickup[], racks: Combat['racks'], pid: number): NetPickup[] {
  const rackOf = new Map<number, string>()
  for (const r of racks) if (r.pickupId !== undefined && r.key) rackOf.set(r.pickupId, r.key)
  return pickups.map(p => {
    const id = p.net ??= netIdFor(pid, p.id)
    return [id, p.owned.item, r2(p.owned.ammo), r2(p.owned.durability), r1(p.x), r1(p.y), p.resting ? 1 : 0, r2(p.noPick), rackOf.get(p.id) ?? p.rack ?? '']
  })
}

/** the others' side: the owner's items become copies (by lobby id) that glide to where the owner has them */
export function importPickups(pickups: Pickup[], list: unknown, items: Record<string, unknown>) {
  if (!Array.isArray(list)) return
  const byNet = new Map<number, Pickup>()
  for (const p of pickups) if (p.mirror && p.net !== undefined) byNet.set(p.net, p)
  const seen = new Set<number>()
  for (const e of list.slice(0, 400)) {
    if (!Array.isArray(e) || e.length < 9) continue
    const [id, item, ammo, durability, x, y, resting, noPick, rack] = e as NetPickup
    if (![id, ammo, durability, x, y, noPick].every(num) || typeof item !== 'string' || !(item in items) || Math.abs(x) > LIMIT || Math.abs(y) > LIMIT) continue
    let p = byNet.get(id)
    if (!p) {
      p = { id, net: id, mirror: true, owned: { item: item as ItemId, ammo, durability }, x, y, vy: 0, resting: !!resting, noPick }
      pickups.push(p); byNet.set(id, p)
    }
    p.owned.item = item as ItemId; p.owned.ammo = ammo; p.owned.durability = durability
    p.resting = !!resting; p.noPick = Math.max(0, Math.min(5, noPick)); p.rack = typeof rack === 'string' && rack ? rack.slice(0, 80) : undefined
    p.netX = x; p.netY = y
    if (Math.hypot(p.x - x, p.y - y) > 300) { p.x = x; p.y = y }
    seen.add(id)
  }
  for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; if (p.mirror && p.net !== undefined && !seen.has(p.net)) pickups.splice(i, 1) }
}

/** the owner's side: the life of each layout dummy */
export const exportDummies = (targets: readonly Target[]): NetDummy[] =>
  targets.filter(t => t.dummy && t.netKey).map(t => [t.netKey!, r1(t.hp)])

/** the others' side: each dummy takes the owner's life (its stage and effects follow) */
export function importDummies(combat: Pick<Combat, 'netDummy'>, list: unknown) {
  if (!Array.isArray(list)) return
  for (const e of list.slice(0, 400)) if (Array.isArray(e) && typeof e[0] === 'string' && num(e[1])) combat.netDummy(e[0], e[1])
}

/** an ask from another browser, checked (it comes through the server) */
export function cleanAsk(a: unknown, items: Record<string, { mag?: number; durability?: number } | undefined>): NetAsk | null {
  const o = a as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return null
  const at = (keys: string[]) => keys.every(k => num(o[k]) && Math.abs(o[k] as number) < LIMIT)
  switch (o.k) {
    case 'take': return num(o.id) && typeof o.pl === 'string' && o.pl.length <= 40 ? { k: 'take', id: o.id, pl: o.pl } : null
    case 'drop': {
      const w = o.o as Record<string, unknown> | null
      if (!w || typeof w !== 'object' || typeof w.item !== 'string' || !items[w.item] || !num(w.ammo) || !num(w.durability) || !at(['x', 'y', 'vy', 'n'])) return null
      const def = items[w.item]!
      const ammo = Math.max(0, Math.min(Math.max(99, def.mag ?? 0), w.ammo)), durability = Math.max(0, Math.min(Math.max(1, def.durability ?? 0), w.durability))
      return { k: 'drop', o: { item: w.item as ItemId, ammo, durability }, x: o.x as number, y: o.y as number, vy: Math.max(-2000, Math.min(2000, o.vy as number)), r: o.r ? 1 : 0, n: Math.max(0, Math.min(3, o.n as number)) }
    }
    case 'gong': case 'reset': case 'start': return { k: o.k }
    case 'judge': return o.g === 'perfect' || o.g === 'good' || o.g === 'miss' ? { k: 'judge', g: o.g } : null
    case 'hurt': case 'parry': return at(['x', 'y']) ? { k: o.k, x: o.x as number, y: o.y as number } : null
  }
  return null
}

// a browser takes an item only near one of its chickens (a basic check against grabbing from afar)
export const TAKE_REACH = 360
export const nearAny = (x: number, y: number, bodies: readonly { x: number; y: number }[]) => bodies.some(b => Math.abs(b.x - x) < TAKE_REACH && Math.abs(b.y - y) < TAKE_REACH)
