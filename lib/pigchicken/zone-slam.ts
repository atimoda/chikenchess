// The scenes' zone strip under the main ground is stepped on: a player who lands on the ground from the air holding
// Chocar (a "slam", lib/chicken/engine.ts takeSlam) moves the parameter under them to its next value, like a click on
// that tag in the editor. Pure: what each tag moves to, which tag is under a point and the slam's message from the
// game loop (components/pigchicken/parquinho.tsx) to the zones' layer (components/pigchicken/music-zones-layer.tsx),
// which measures its tags and saves the change.
import { ZONE_PRIORITY, normalizeSoundZone, type SoundZoneParams } from './sound-zones'
import { ZONE_BPM, ZONE_LIFE, ZONE_STEP } from './zone-changes'
import { nextGravity, nextZoneTime } from './zone-physics'

// one per tag of a zone's label (zone-tags.tsx), in its order; "name" opens the zone's panel and has no next value
export type ZoneTagKey = 'name' | keyof typeof ZONE_STEP | 'bpm' | 'priority' | 'life' | 'gravity' | 'time' | 'xray'

// the sliders step through the list in tens (the priority one at a time), back to the start after the end
const cycle = (v: number, min: number, max: number, step: number) => {
  const next = Math.floor((v + step) / step) * step
  return next > max ? min : Math.max(min, next)
}

// the zone with the tag's next value (the same as a click on it); null for the name
export function nextZoneTag(zone: SoundZoneParams, key: ZoneTagKey): SoundZoneParams | null {
  let patch: Partial<SoundZoneParams>
  if (key === 'name') return null
  if (key === 'bpm') patch = { bpm: cycle(zone.bpm, ZONE_BPM.min, ZONE_BPM.max, 10) }
  else if (key === 'priority') patch = { priority: cycle(zone.priority, ZONE_PRIORITY.min, ZONE_PRIORITY.max, 1) }
  else if (key === 'life') patch = { life: cycle(zone.life, ZONE_LIFE.min, ZONE_LIFE.max, 10) }
  else if (key === 'gravity') patch = { gravity: nextGravity(zone.gravity) }
  else if (key === 'time') patch = { time: nextZoneTime(zone.time) }
  else if (key === 'xray') patch = { xray: zone.xray ? undefined : true }
  else patch = ZONE_STEP[key](zone)
  return normalizeSoundZone({ ...zone, ...patch })
}

// the scene whose zone holds world x (xs: sceneEdgeList), -1 outside them
export function sceneAtX(xs: number[], x: number) {
  for (let s = 0; s + 1 < xs.length; s++) if (x >= xs[s] && x < xs[s + 1]) return s
  return -1
}

// A tag laid out in the world: its left and right ends and its top (the strip's tags may wrap into rows)
export type TagSpan = { key: ZoneTagKey; l: number; r: number; top: number }
// how far from a tag a slam still steps on it (the gaps between tags, a foot on its edge)
export const SLAM_REACH = 16

// the tag under a slam at x: the top row's (the one against the ground), the one x falls in, or else the nearest
// within SLAM_REACH; null past the tags
export function tagUnder(tags: TagSpan[], x: number): TagSpan | null {
  if (!tags.length) return null
  const top = Math.min(...tags.map(t => t.top))
  let best: TagSpan | null = null, bestD = Infinity
  for (const t of tags) {
    if (t.top > top + 4) continue
    const d = x < t.l ? t.l - x : x > t.r ? x - t.r : 0
    if (d < bestD) { best = t; bestD = d }
  }
  return bestD <= SLAM_REACH ? best : null
}

// the slams of this frame, from the game loop to whoever shows the strip (nothing listens when the layer is off)
type SlamListener = (x: number) => void
const listeners = new Set<SlamListener>()
export function onZoneSlam(fn: SlamListener) { listeners.add(fn); return () => { listeners.delete(fn) } }
export function zoneSlam(x: number) { listeners.forEach(fn => fn(x)) }
