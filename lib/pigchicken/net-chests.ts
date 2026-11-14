// The Baús in the online Pátio (lib/pigchicken/chests.ts), as data. Pure, so the browser and the tests use the same
// code; lib/pigchicken/net-world-sync.ts moves it through the game server.
//
// - Whoever opens a Baú opens it right away (its key, its souls, its items) and tells everyone ("chests" with o: 1):
//   the others open it too, with the animation and the sound, but no items come out for them.
// - The lobby's owner also sends every Baú open in its world, and for how long (every 2 s and when someone joins):
//   a browser that joined late sees them open, the timers of the ones that close again line up with the owner's and
//   one the owner has shut is shut here too (unless it was opened here a moment ago and the news is on its way).
import type { Chest } from './combat'

export const NET_CHESTS_MAX = 64
// [the Baú's element id, seconds since it opened]
export type NetChest = [string, number]
export type NetChests = { l: NetChest[]; o?: 1 }

// the Baús open in this world
export function exportOpenChests(chests: readonly Chest[]): NetChest[] {
  return chests.filter(c => c.open).slice(0, NET_CHESTS_MAX).map(c => [c.id, Math.round(c.t * 10) / 10])
}

// what came from the server, checked
export function cleanNetChests(raw: unknown): NetChests | null {
  const r = raw as { l?: unknown; o?: unknown } | null
  if (!r || typeof r !== 'object' || !Array.isArray(r.l) || r.l.length > NET_CHESTS_MAX) return null
  const l: NetChest[] = []
  for (const e of r.l) {
    if (!Array.isArray(e) || typeof e[0] !== 'string' || !e[0] || e[0].length > 64) continue
    const t = typeof e[1] === 'number' && Number.isFinite(e[1]) ? Math.max(0, Math.min(3600, e[1])) : 0
    l.push([e[0], t])
  }
  return r.o === 1 ? { l, o: 1 } : { l }
}

type ChestWorld = { chests: readonly Chest[]; openNetChest(id: string, t: number): void; closeNetChest(id: string): void }

// a message from another browser: the Baús it opened (o) open here; the owner's whole list also shuts the ones it
// does not have open, except the ones `recent` says were opened here a moment ago
export function applyNetChests(world: ChestWorld, msg: NetChests, fromOwner: boolean, recent: (id: string) => boolean) {
  for (const [id, t] of msg.l) world.openNetChest(id, t)
  if (msg.o || !fromOwner) return
  const open = new Set(msg.l.map(e => e[0]))
  for (const c of world.chests) if (c.open && !open.has(c.id) && !recent(c.id)) world.closeNetChest(c.id)
}
