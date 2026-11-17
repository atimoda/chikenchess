// What a Zona does to the bodies inside it besides the music: its gravity (the Earth's, or a planet's, the Moon's or
// the Sun's), its time (slow motion: everything inside lives on a slower clock) and the x-ray look. Pure: the Parquinho asks, for each body, what the zone where it stands does
// (zoneEffectsAt), the chicken engine and the combat apply it, and the canvas draws the x-ray.
import type { ZoneBox } from './sound-zones'

// surface gravity as a share of the Earth's (NASA's planetary fact sheet: m/s² ÷ 9.81), in the order the tag goes
// through them: from the Earth outwards, then the Sun and the inner planets back to the Earth
export const GRAVITIES = [
  { id: 'earth', label: 'Terra', g: 1 },
  { id: 'moon', label: 'Lua', g: 0.165 },
  { id: 'mars', label: 'Marte', g: 0.379 },
  { id: 'jupiter', label: 'Júpiter', g: 2.528 },
  { id: 'saturn', label: 'Saturno', g: 1.065 },
  { id: 'uranus', label: 'Urano', g: 0.886 },
  { id: 'neptune', label: 'Netuno', g: 1.137 },
  { id: 'sun', label: 'Sol', g: 27.94 },
  { id: 'mercury', label: 'Mercúrio', g: 0.377 },
  { id: 'venus', label: 'Vênus', g: 0.905 },
] as const
export type GravityId = typeof GRAVITIES[number]['id']
export const isGravity = (v: unknown): v is GravityId => typeof v === 'string' && GRAVITIES.some(p => p.id === v)
export const gravityOf = (id: GravityId | undefined) => GRAVITIES.find(p => p.id === id) ?? GRAVITIES[0]
export const nextGravity = (id: GravityId | undefined): GravityId => GRAVITIES[(GRAVITIES.indexOf(gravityOf(id)) + 1) % GRAVITIES.length].id
// "Lua · 17%": the place and its gravity as a share of the Earth's
export const gravityLabel = (id: GravityId | undefined) => { const p = gravityOf(id); return `${p.label} · ${Math.round(p.g * 100)}%` }

// the zone's time, in percent of the normal (100: normal; below it, slow motion). Whatever is inside — the chickens,
// the shots, the items, the enemies — moves, animates and counts down its times by this share of each frame: a jump
// or an arrow keeps the shape of its arc, only slower. The music keeps its tempo
export const ZONE_TIME = { min: 10, max: 200, step: 5, initial: 100 } as const
// the steps of the tag: from normal down to a tenth, back to normal
export const TIME_STEPS = [100, 50, 25, 10] as const
export const nextZoneTime = (t: number | undefined) => { const v = t ?? 100; return TIME_STEPS.find(s => s < v) ?? 100 }
export const zoneTimeLabel = (t: number | undefined) => `tempo ${t ?? 100}%`

// what the zone at a point does to a body there: the factor on its gravity, on its time and whether it shows in x-ray
export type ZoneEffects = { gravity: number; time: number; xray: boolean }
export const NO_EFFECTS: ZoneEffects = { gravity: 1, time: 1, xray: false }
const inside = (b: ZoneBox, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h
// the zones as the Pátio plays them now (set every frame by the Parquinho), for what draws the bodies apart from it
// (the online players' chickens)
let live: readonly ZoneBox[] = []
export const setLiveZones = (zones: readonly ZoneBox[]) => { live = zones }
export const liveZoneEffectsAt = (x: number, y: number) => zoneEffectsAt(live, x, y)
// the zone that wins there (the highest priority; the later one among equals), whether or not it changes the music
export function zoneEffectsAt(zones: readonly ZoneBox[], x: number, y: number): ZoneEffects {
  let best: ZoneBox | null = null
  for (const z of zones) if (inside(z, x, y) && (!best || z.zone.priority >= best.zone.priority)) best = z
  if (!best) return NO_EFFECTS
  const g = gravityOf(best.zone.gravity).g, time = (best.zone.time ?? 100) / 100, xray = !!best.zone.xray
  return g === 1 && time === 1 && !xray ? NO_EFFECTS : { gravity: g, time, xray }
}
