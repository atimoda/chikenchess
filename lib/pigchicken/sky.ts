// The Pátio's sky and light (Configurações do Pátio → Céu e luz), saved with each Pátio in `settings.sky`.
// hour: 0 to 24, places the sun (or the moon) and, with `follow`, picks the sky's colours from a day of keyframes.
// stops: the gradient from the top of the sky (0) to the horizon (1), when the colours do not follow the hour.
// The rest are 0 to 100: sun size and glow, how many clouds, the texture over the sky, the haze toward the horizon,
// how dark the scenery turns against the light (contraluz) and how much the hour lights the Pátio's scenery.
// radial (0 to 100) curves the bands into rings around a centre under the sun (0: straight bands); radialX
// (-100 to 100) moves that centre sideways and radialY (0 to 100) sinks it below the horizon (flatter, wider rings).
// sunColor: the sun's colour ('' follows the hour); glowSize: how far its radiant glow reaches (30 to 300%).
// sunSoft (0 to 100): the disc's edge, from crisp to a blob that melts into its glow; glowColor: the glow's own
// colour ('' the sun's); sunX (-100 to 100) moves the sun sideways and sunLift (-100 to 100) raises or sinks it from
// where the hour puts it. glow goes to 200 (a halo that covers the sky around the sun).
// radialSun: the rings' centre is the sun itself (radialX and radialY then move it from there) and radialSize
// (20 to 300%) is the rings' size: the horizon's colour at the sun, the top's colour at the outer ring.
// The texture (Textura = how strong): texScale 25 to 400% (the tile's size), texStreak and texGrain 0 to 100 (the
// long horizontal streaks and the fine grain; 50 is the usual), texBlend how it mixes with the sky ('soft' soft-light,
// 'overlay', 'multiply' darkens, 'screen' lightens).
// starCount, starSize (0/30 to 300%) and starGlow (0 to 200%): how many stars, how big, how bright (the hour still
// decides when they show, unless starsAlways: then at any hour, as bright as night). The mountains and the clouds have their own settings (mountains.ts, clouds.ts).
// A Pátio without `sky` keeps the classic dusk the code always drew (classicLook).

export type SkyStop = { at: number; color: string }
export type SkyParams = {
  hour: number; follow: boolean; stops: SkyStop[]
  sunSize: number; glow: number; clouds: number; texture: number; haze: number; silhouette: number; light: number
  forest: boolean; radial: number; radialX: number; radialY: number
  sunColor: string; glowSize: number; starCount: number; starSize: number; starGlow: number; starsAlways: boolean
  sunSoft: number; glowColor: string; sunX: number; sunLift: number; radialSun: boolean; radialSize: number
  texScale: number; texStreak: number; texGrain: number; texBlend: SkyBlend
}
export type SkyBlend = 'soft' | 'overlay' | 'multiply' | 'screen'
export const SKY_BLENDS: { id: SkyBlend; label: string; css: string }[] = [
  { id: 'soft', label: 'Suave', css: 'soft-light' }, { id: 'overlay', label: 'Forte', css: 'overlay' },
  { id: 'multiply', label: 'Escurece', css: 'multiply' }, { id: 'screen', label: 'Clareia', css: 'screen' },
]
export const SKY_TEX_SCALE = { min: 25, max: 400, step: 5 } as const

export const SKY_HOUR = { min: 0, max: 24, step: 0.1 } as const
export const SKY_STOPS = { min: 2, max: 8 } as const
export const SKY_PCT = { min: 0, max: 100, step: 1 } as const
export const SKY_SUN = { min: 10, max: 100, step: 1 } as const
export const SKY_RADIAL_X = { min: -100, max: 100, step: 1 } as const
export const SKY_SCALE = { min: 30, max: 300, step: 5 } as const
export const SKY_GLOW = { min: 0, max: 200, step: 1 } as const
export const SKY_RADIAL_SIZE = { min: 20, max: 300, step: 5 } as const
// world units per step of sunX and sunLift
export const SKY_SUN_MOVE = { x: 12, y: 6 } as const
export const SKY_STAR_COUNT = { min: 0, max: 300, step: 5 } as const
export const SKY_STAR_GLOW = { min: 0, max: 200, step: 5 } as const

// ---------- colours ----------
const HEX = /^#[0-9a-f]{6}$/i
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const toHex = (c: number[]) => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')
export function mix(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b), k = clamp(t, 0, 1)
  return toHex(A.map((v, i) => v + (B[i] - v) * k))
}
export function hsl(h: number, s: number, l: number) {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100
  const k = (n: number) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return toHex([f(0) * 255, f(8) * 255, f(4) * 255])
}
const luma = (hex: string) => { const [r, g, b] = rgb(hex); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 }

// the colour of a gradient at t (0 top, 1 horizon)
export function stopColor(stops: SkyStop[], t: number) {
  if (t <= stops[0].at) return stops[0].color
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i]
    if (t <= b.at) return mix(a.color, b.color, b.at === a.at ? 1 : (t - a.at) / (b.at - a.at))
  }
  return stops[stops.length - 1].color
}

// ---------- a day of keyframes ----------
// stops top → horizon, the sun's colour, the light on the scenery (brightness, saturation, warmth) and the stars
type Key = { h: number; c: string[]; sun: string; b: number; s: number; warm: number; stars: number }
const KEYS: Key[] = [
  { h: 0, c: ['#03040c', '#070b1e', '#0e1633', '#1a2346', '#2a3152'], sun: '#dfe6ff', b: 0.4, s: 0.55, warm: 0, stars: 1 },
  { h: 4.8, c: ['#05071a', '#141a3d', '#2e2b58', '#5b3f6e', '#8f5a72'], sun: '#ffd0c0', b: 0.5, s: 0.65, warm: 0.05, stars: 0.6 },
  { h: 5.9, c: ['#1b2350', '#40407a', '#8a5a8c', '#e0857a', '#ffc38a'], sun: '#ffd7a0', b: 0.68, s: 0.85, warm: 0.25, stars: 0.1 },
  { h: 7.2, c: ['#3d6fb8', '#6f9ad0', '#a9c2df', '#f2d2b4', '#ffe2b8'], sun: '#fff1cf', b: 0.9, s: 0.95, warm: 0.12, stars: 0 },
  { h: 10, c: ['#2f6fcf', '#4f8de0', '#7fb0ea', '#b5d4f2', '#dbeaf7'], sun: '#fffbe8', b: 1, s: 1, warm: 0, stars: 0 },
  { h: 15, c: ['#2c64bd', '#4c86d6', '#86b2e3', '#cfdbe4', '#f2e2c6'], sun: '#fff6dc', b: 0.97, s: 1, warm: 0.08, stars: 0 },
  { h: 17, c: ['#3b5aa4', '#7a7fb8', '#e0a07a', '#f7c26a', '#ffe08a'], sun: '#fff0b0', b: 0.85, s: 1.05, warm: 0.3, stars: 0 },
  { h: 18.2, c: ['#2a2f6e', '#6b3c86', '#d2546e', '#f68a3c', '#ffc94a'], sun: '#ffe7a0', b: 0.64, s: 1.1, warm: 0.35, stars: 0 },
  { h: 19, c: ['#141a44', '#3a2a66', '#7a3a76', '#d0606a', '#f59a5a'], sun: '#ffb070', b: 0.48, s: 0.95, warm: 0.3, stars: 0.15 },
  { h: 20.3, c: ['#070a24', '#14194a', '#2a2f6e', '#4c4682', '#7a5f8e'], sun: '#e8dcff', b: 0.42, s: 0.7, warm: 0.05, stars: 0.6 },
  { h: 24, c: ['#03040c', '#070b1e', '#0e1633', '#1a2346', '#2a3152'], sun: '#dfe6ff', b: 0.4, s: 0.55, warm: 0, stars: 1 },
]
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
function keyAt(hour: number): Key {
  const h = ((hour % 24) + 24) % 24
  let i = 1
  while (i < KEYS.length - 1 && KEYS[i].h < h) i++
  const a = KEYS[i - 1], b = KEYS[i], t = (h - a.h) / (b.h - a.h)
  return { h, c: a.c.map((c, k) => mix(c, b.c[k], t)), sun: mix(a.sun, b.sun, t), b: lerp(a.b, b.b, t), s: lerp(a.s, b.s, t), warm: lerp(a.warm, b.warm, t), stars: lerp(a.stars, b.stars, t) }
}
const evenStops = (c: string[]): SkyStop[] => c.map((color, i) => ({ at: Math.round((i / (c.length - 1)) * 100) / 100, color }))
export const hourStops = (hour: number) => evenStops(keyAt(hour).c)

export const SKY_DEFAULT: SkyParams = {
  hour: 18.2, follow: true, stops: hourStops(18.2), sunSize: 45, glow: 65, clouds: 45, texture: 25, haze: 50, silhouette: 70, light: 60,
  forest: true, radial: 0, radialX: 0, radialY: 0,
  sunColor: '', glowSize: 100, starCount: 100, starSize: 100, starGlow: 100, starsAlways: false,
  sunSoft: 0, glowColor: '', sunX: 0, sunLift: 0, radialSun: false, radialSize: 100,
  texScale: 100, texStreak: 50, texGrain: 50, texBlend: 'soft',
}

// ---------- cleaning ----------
const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? clamp(v, a, b) : d
const pct = (v: unknown, d: number) => Math.round(num(v, d, 0, 100))
export function normalizeStops(raw: unknown): SkyStop[] | null {
  if (!Array.isArray(raw)) return null
  const out = raw.slice(0, SKY_STOPS.max).flatMap(s => {
    const r = s as { at?: unknown; color?: unknown }
    return r && typeof r.color === 'string' && HEX.test(r.color) ? [{ at: Math.round(num(r.at, 0, 0, 1) * 1000) / 1000, color: r.color.toLowerCase() }] : []
  }).sort((a, b) => a.at - b.at)
  return out.length >= SKY_STOPS.min ? out : null
}
export function normalizeSky(raw: unknown): SkyParams | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>, d = SKY_DEFAULT
  const hour = Math.round(num(r.hour, d.hour, 0, 24) * 10) / 10
  const follow = r.follow !== false
  return {
    hour, follow, stops: normalizeStops(r.stops) ?? hourStops(hour),
    sunSize: Math.round(num(r.sunSize, d.sunSize, SKY_SUN.min, SKY_SUN.max)), glow: Math.round(num(r.glow, d.glow, SKY_GLOW.min, SKY_GLOW.max)), clouds: pct(r.clouds, d.clouds),
    texture: pct(r.texture, d.texture), haze: pct(r.haze, d.haze), silhouette: pct(r.silhouette, d.silhouette), light: pct(r.light, d.light),
    forest: r.forest !== false, radial: pct(r.radial, d.radial),
    radialX: Math.round(num(r.radialX, d.radialX, SKY_RADIAL_X.min, SKY_RADIAL_X.max)), radialY: pct(r.radialY, d.radialY),
    sunColor: typeof r.sunColor === 'string' && HEX.test(r.sunColor) ? r.sunColor.toLowerCase() : '',
    glowSize: Math.round(num(r.glowSize, d.glowSize, SKY_SCALE.min, SKY_SCALE.max)),
    starCount: Math.round(num(r.starCount, d.starCount, SKY_STAR_COUNT.min, SKY_STAR_COUNT.max)),
    starSize: Math.round(num(r.starSize, d.starSize, SKY_SCALE.min, SKY_SCALE.max)),
    starGlow: Math.round(num(r.starGlow, d.starGlow, SKY_STAR_GLOW.min, SKY_STAR_GLOW.max)), starsAlways: r.starsAlways === true,
    sunSoft: pct(r.sunSoft, d.sunSoft), glowColor: typeof r.glowColor === 'string' && HEX.test(r.glowColor) ? r.glowColor.toLowerCase() : '',
    sunX: Math.round(num(r.sunX, d.sunX, SKY_RADIAL_X.min, SKY_RADIAL_X.max)), sunLift: Math.round(num(r.sunLift, d.sunLift, SKY_RADIAL_X.min, SKY_RADIAL_X.max)),
    radialSun: r.radialSun === true, radialSize: Math.round(num(r.radialSize, d.radialSize, SKY_RADIAL_SIZE.min, SKY_RADIAL_SIZE.max)),
    texScale: Math.round(num(r.texScale, d.texScale, SKY_TEX_SCALE.min, SKY_TEX_SCALE.max)),
    texStreak: pct(r.texStreak, d.texStreak), texGrain: pct(r.texGrain, d.texGrain),
    texBlend: SKY_BLENDS.some(b => b.id === r.texBlend) ? r.texBlend as SkyBlend : d.texBlend,
  }
}

// ---------- randomize: a sky of harmonious bands and a dramatic hour ----------
export function randomSky(rand: () => number = Math.random, keep?: Partial<SkyParams>): SkyParams {
  const between = (a: number, b: number) => a + rand() * (b - a)
  // mostly sunrise and sunset, sometimes deep night or full day
  const roll = rand()
  const hour = Math.round((roll < 0.4 ? between(17, 20.2) : roll < 0.7 ? between(5.2, 7.4) : roll < 0.85 ? between(20.5, 23.5) : between(9, 16)) * 10) / 10
  const warm = between(0, 60), cool = warm + between(170, 260) // horizon hue and the top's, across the wheel
  const n = 3 + Math.floor(rand() * 5)
  const night = hour > 20.4 || hour < 5
  const stops: SkyStop[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    // a little jitter on the positions, kept in order: thin bands and wide ones
    const at = i === 0 ? 0 : i === n - 1 ? 1 : clamp(t + between(-0.4, 0.4) / n, 0.05, 0.95)
    const hue = lerp(cool, warm + 360, Math.pow(t, between(0.7, 1.6))) + between(-14, 14)
    const light = night ? lerp(6, between(22, 38), t) : lerp(between(14, 32), between(58, 74), Math.pow(t, 0.8))
    const sat = between(45, 90)
    stops.push({ at: Math.round(at * 100) / 100, color: hsl(hue, sat, light) })
  }
  stops.sort((a, b) => a.at - b.at)
  return {
    ...SKY_DEFAULT, ...keep, hour, follow: false, stops,
    sunSize: Math.round(between(25, 90)), glow: Math.round(between(35, 100)), clouds: Math.round(between(0, 90)),
    texture: Math.round(between(0, 60)), texScale: Math.round(between(60, 200) / 5) * 5, texStreak: Math.round(between(20, 85)), texGrain: Math.round(between(15, 70)), haze: Math.round(between(20, 85)), silhouette: Math.round(between(40, 100)),
    light: keep?.light ?? SKY_DEFAULT.light, forest: rand() < 0.75,
    // half the time the bands curve round the sun
    radial: rand() < 0.5 ? 0 : Math.round(between(20, 90)), radialX: Math.round(between(-40, 40)), radialY: Math.round(between(0, 60)),
  }
}

// ---------- what the backdrop draws ----------
export type SkyLook = {
  stops: SkyStop[]; space: string // the gradient, and the colour far above it
  // x: sideways from its usual place (world units); soft: 0 a crisp disc, 1 a blob; glowColor: the halo's colour
  sun: { x: number; y: number; r: number; color: string; glowColor: string; soft: number; glow: number; glowSize: number; opacity: number }
  moon: { y: number; opacity: number }
  horizonGlow: number // 0 to 1: the light along the horizon under the sun
  stars: number; starCount: number; starSize: number // how visible (0 to 1), how many and how big (1 = usual)
  night: number // how dark the sky is for the night's lights (0 day to 1 night), whatever Estrelas says: the Aurora
  clouds: { amount: number; lit: string; shade: string; opacity: number }
  // the landscape's far ranges and tree lines, back to front, and the haze at their feet
  ranges: [string, string, string]; trees: [string, string]; haze: string; hazeAmount: number
  texture: number; forest: boolean
  // the texture's tile size (1 = usual), streaks and grain (0.5 = usual) and CSS blend mode
  textureLook: { scale: number; streak: number; grain: number; blend: string }
  // the bands' curvature (0 straight, 1 round) and where their centre sits: x in sky heights from under the sun,
  // y in sky heights below the horizon; sun: the centre is the sun itself (x and y move it from there); size: the
  // rings' size (1 = usual)
  radial: { amount: number; x: number; y: number; sun: boolean; size: number }
  // the CSS filter on the Pátio's scenery (the hour's light and the contraluz); 'none' when it changes nothing
  scenery: string
  // the colour things turn against the light, and the horizon it fades into (postes, torres, far scenery)
  silhouette: string; horizon: string
}

// the sun's height over the horizon: 1 at noon, 0 at 6 h and 18.5 h, below it at night
export const sunElevation = (hour: number) => Math.sin(Math.PI * (hour - 6) / 12.5)
export const SUN_HORIZON_Y = 840

// the classic dusk the Pátio always had
export function classicLook(): SkyLook {
  return {
    stops: [{ at: 0, color: '#0a0f20' }, { at: 0.27, color: '#121a33' }, { at: 0.54, color: '#222a48' }, { at: 0.75, color: '#3d3f5c' }, { at: 0.88, color: '#5e5468' }, { at: 1, color: '#7a6670' }],
    space: '#04060f',
    sun: { x: 0, y: 640, r: 54, color: '#f1d8bc', glowColor: '#f1d8bc', soft: 0, glow: 0.82, glowSize: 1, opacity: 1 }, moon: { y: 0, opacity: 0 }, horizonGlow: 0, stars: 0, starCount: 1, starSize: 1, night: 0.6,
    clouds: { amount: 1, lit: '#d9d3e2', shade: '#b79fa6', opacity: 1 },
    ranges: ['#4d4d68', '#3d3f58', '#30344a'], trees: ['#282d41', '#212637'], haze: '#6a5c6c', hazeAmount: 1,
    texture: 0, forest: true, textureLook: { scale: 1, streak: 0.5, grain: 0.5, blend: 'soft-light' }, radial: { amount: 0, x: 0, y: 0, sun: false, size: 1 }, scenery: 'none', silhouette: '#0b0a12', horizon: '#7a6670',
  }
}

// the landscape lit by day (before haze and contraluz), back to front
const LAND = ['#7d93b3', '#5f7a8c', '#4f6e57', '#3d5b40', '#2f4a32']

export function skyLook(p: SkyParams | undefined): SkyLook {
  if (!p) return classicLook()
  const k = keyAt(p.hour)
  const stops = p.follow ? evenStops(k.c) : p.stops
  const top = stops[0].color, horizon = stops[stops.length - 1].color
  const nearHorizon = stopColor(stops, 0.8)
  const e = sunElevation(p.hour)
  const sil = p.silhouette / 100, light = p.light / 100, haze = p.haze / 100
  // the scenery's light: the hour's brightness, toward black against the light
  const bright = lerp(1, k.b, light) * (1 - sil * 0.9 * clamp(1.15 - Math.abs(e), 0.35, 1))
  const sat = lerp(1, k.s, light) * (1 - sil * 0.7)
  const warm = k.warm * light * (1 - sil * 0.5)
  const filter = Math.abs(bright - 1) < 0.01 && Math.abs(sat - 1) < 0.01 && warm < 0.01 ? 'none'
    : `brightness(${bright.toFixed(3)}) saturate(${sat.toFixed(3)}) sepia(${warm.toFixed(3)})`
  const silhouette = mix(mix(top, '#000000', 0.82), horizon, 0.06)
  const dark = clamp(1 - k.b + sil * 0.85, 0, 1)
  const land = LAND.map(c => mix(c, silhouette, dark))
  const hazeTo = mix(nearHorizon, horizon, 0.5)
  const away = [0.72, 0.55, 0.38, 0.24, 0.12].map(f => f * (0.3 + haze))
  const scen = land.map((c, i) => mix(c, hazeTo, away[i]))
  const sunOn = clamp((e + 0.15) * 4, 0, 1)
  // the night's darkness: by the hour's key, or by how dark the top of the sky is
  const night = clamp(Math.max(k.stars, clamp(0.35 - luma(top) * 2, 0, 1)) * (p.follow ? 1 : clamp(1 - luma(top) * 4, 0, 1)), 0, 1)
  return {
    stops, space: mix(top, '#000000', 0.65),
    sun: { x: p.sunX * SKY_SUN_MOVE.x, y: SUN_HORIZON_Y - e * 640 - p.sunLift * SKY_SUN_MOVE.y, r: p.sunSize * 1.4, color: p.sunColor || k.sun, glowColor: p.glowColor || p.sunColor || k.sun, soft: p.sunSoft / 100, glow: p.glow / 100, glowSize: p.glowSize / 100, opacity: sunOn },
    moon: { y: SUN_HORIZON_Y - sunElevation(p.hour - 12.5) * 560, opacity: clamp((-e - 0.05) * 3, 0, 1) * 0.9 },
    horizonGlow: Math.min(1, p.glow / 100) * clamp(1 - Math.abs(e) * 2.2, 0, 1),
    stars: clamp((p.starsAlways ? 1 : night) * p.starGlow / 100, 0, 1), night,
    starCount: p.starCount / 100, starSize: p.starSize / 100,
    clouds: { amount: p.clouds / 100, lit: mix(mix(p.sunColor || k.sun, '#ffffff', 0.35), nearHorizon, 0.35), shade: mix(stopColor(stops, 0.35), silhouette, 0.25), opacity: 1.6 },
    ranges: [scen[0], scen[1], scen[2]], trees: [scen[3], scen[4]], haze: hazeTo, hazeAmount: haze * 1.2,
    texture: p.texture / 100, forest: p.forest,
    textureLook: { scale: p.texScale / 100, streak: p.texStreak / 100, grain: p.texGrain / 100, blend: SKY_BLENDS.find(b => b.id === p.texBlend)?.css ?? 'soft-light' }, radial: { amount: p.radial / 100, x: p.radialX / 100 * 1.4, y: p.radialY / 100 * 1.2, sun: p.radialSun, size: p.radialSize / 100 }, scenery: filter, silhouette, horizon,
  }
}

// a CSS gradient for the sky div: `top` is the div's top in world y; the stops span from y0 to the horizon y1
export function skyGradient(look: SkyLook, top: number, y0: number, y1: number) {
  const at = (y: number) => `${Math.round(y - top)}px`
  return `linear-gradient(to bottom, ${look.space} 0, ${look.space} ${at(y0 - 2400)}, ${look.stops.map(s => `${s.color} ${at(y0 + s.at * (y1 - y0))}`).join(', ')})`
}

// The same bands curved into rings (Curvatura): a CSS radial gradient, or null when the bands are straight.
// top: the div's top in world y; y0 and y1 as in skyGradient; cx: the x under the sun in the div's own pixels.
// The ring through the horizon is an ellipse rx × ry with ry from the centre up to y0; rx shrinks from 14 × ry
// (almost straight) to 0.7 × ry (taller than wide) as the curvature grows. With radial.sun the centre is the sun
// (sunY: its y in the same units as y0 and y1, by default the look's own) and the bands run from the horizon's
// colour at the sun out to the top's colour at 75% of the sky's height; radial.size scales the rings either way.
export function skyRadial(look: SkyLook, top: number, y0: number, y1: number, cx: number, sunY = look.sun.y, unit = 1) {
  const a = look.radial.amount
  if (a <= 0) return null
  const h = y1 - y0, onSun = look.radial.sun
  const x = cx + look.sun.x * unit + look.radial.x * h, cy = (onSun ? sunY : y1) + look.radial.y * h
  const base = onSun ? h * 0.75 : cy - y0
  const ry = base * look.radial.size, rx = ry * lerp(14, 0.7, Math.pow(a, 0.6))
  // a band's ring, as a fraction of the outer one
  const ring = (y: number) => onSun ? (y1 - y) / h : (cy - y) / base
  const at = (y: number) => `${(ring(y) * 100).toFixed(2)}%`
  const bands = [...look.stops].reverse().map(s => `${s.color} ${at(y0 + s.at * h)}`)
  return `radial-gradient(${Math.round(rx)}px ${Math.round(ry)}px at ${Math.round(x)}px ${Math.round(cy - top)}px, ${bands.join(', ')}, ${look.space} ${at(y0 - 2400)})`
}

// a short reading of the hour: "18:12"
export const hourLabel = (h: number) => {
  const m = Math.round((((h % 24) + 24) % 24) * 60)
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
