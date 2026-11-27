// What lies in the owner's world for everyone, online: the items on the floor (lib/pigchicken/net-items.ts) and the
// life of the layout's training dummies. It travels in the game server's "share" message: the owner's goes to everyone
// else (or to the browser it answers), another browser's (its takes, its drops, its hits on the dummies) to the owner
// only. lib/pigchicken/net-world-sync.ts sends and reads it.
import type { NetItemsMsg } from './net-items'

// dm: the dummies, by the layout element's id: from the owner, the life of each; from another browser, how much its
// hits took (−) or gave (+) since it last said
export type NetShareMsg = { items?: NetItemsMsg; dm?: [string, number][] }

const DUMMIES_MAX = 64
/** the dummies' list as it arrived: [key, number] pairs with a short key and a number in range */
export function cleanDummies(v: unknown): [string, number][] {
  if (!Array.isArray(v)) return []
  const out: [string, number][] = []
  for (const e of v.slice(0, DUMMIES_MAX)) {
    if (!Array.isArray(e) || typeof e[0] !== 'string' || e[0].length > 80 || typeof e[1] !== 'number' || !Number.isFinite(e[1]) || Math.abs(e[1]) > 100000) continue
    out.push([e[0], e[1]])
  }
  return out
}
