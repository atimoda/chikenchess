// The life of the Zonas sonoras that have walls (life > 0): the notes bounce off their edges, each bounce takes a
// point, and at 0 the zone changes by its pattern (applyZoneChange) and its life fills again. Runtime only: each
// browser keeps its own, the Pátio's saved zone is not touched, and editing a zone starts it over. The Parquinho
// plays the zones as they are here; the "Zonas sonoras" layer reads them to show the live values and the life bar.
import { applyZoneChange, type SoundZoneParams, type ZoneBox } from './sound-zones'

export type ZoneLive = { src: SoundZoneParams; zone: SoundZoneParams; hp: number; deaths: number }
const live = new Map<string, ZoneLive>()
const listeners = new Set<() => void>()
let version = 0
const emit = () => { version++; listeners.forEach(f => f()) }

// for useSyncExternalStore
export const zoneLiveStore = {
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } },
  version: () => version,
  get: (id: string) => live.get(id),
}

// the zones as they play now: the saved ones with the changes their deaths made (a saved zone that changed, or a
// new one, starts over)
export function liveZones(zones: ZoneBox[]): ZoneBox[] {
  let changed = false
  const seen = new Set<string>()
  const out = zones.map(z => {
    seen.add(z.id)
    let s = live.get(z.id)
    if (!s || s.src !== z.zone) { s = { src: z.zone, zone: z.zone, hp: z.zone.life, deaths: 0 }; live.set(z.id, s); changed = true }
    return s.zone === z.zone ? z : { ...z, zone: s.zone }
  })
  for (const id of [...live.keys()]) if (!seen.has(id)) { live.delete(id); changed = true }
  if (changed) emit()
  return out
}

const inside = (b: ZoneBox, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h

// a note going from (px, py) to (x, y) through the wall of a zone with life, in or out: the zone and whether it
// bounces sideways (the face it crossed; through a corner, the axis it crossed later)
export function zoneWallHit(zones: ZoneBox[], px: number, py: number, x: number, y: number): { box: ZoneBox; flipX: boolean } | null {
  for (let i = zones.length - 1; i >= 0; i--) {
    const b = zones[i]
    if (!b.zone.life) continue
    const was = inside(b, px, py)
    if (was === inside(b, x, y)) continue
    const o = was ? { x, y } : { x: px, y: py } // the point outside
    const l = b.x, r = b.x + b.w, t = b.y, bt = b.y + b.h
    const side = o.x < l || o.x > r, top = o.y < t || o.y > bt
    const flipX = side && (!top || Math.abs(o.x - (o.x < l ? l : r)) <= Math.abs(o.y - (o.y < t ? t : bt)))
    return { box: b, flipX }
  }
  return null
}

// a note hit a zone's wall: a point less; the changed zone when it died (null otherwise)
export function hitZone(id: string, rnd: () => number = Math.random): SoundZoneParams | null {
  const s = live.get(id)
  if (!s || !s.zone.life) return null
  s.hp -= 1
  let died: SoundZoneParams | null = null
  if (s.hp <= 0) { s.zone = applyZoneChange(s.zone, s.zone.change, rnd); s.hp = s.zone.life; s.deaths++; died = s.zone }
  emit()
  return died
}

export function resetZoneLife() { live.clear(); emit() }
