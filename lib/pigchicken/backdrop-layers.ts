// The layers of the Pátio's scenery far behind (components/pigchicken/parallax.tsx): their depths, which ones a Pátio
// shows, the mountain ranges' crest, and how a Poste or Torre is pinned to a fixed point of one of them
// (LayoutElement.backdrop). Pure: no DOM.
//
// A parallax layer slides depth × the camera's travel from the camera at (0, 0) on both axes, while scenery in a depth
// of its own (LayoutElement.depth) slides vertically from the camera's resting height, which changes with the screen.
// A pinned element follows its layer's rule instead, so it stays on the same point of that layer on every screen:
// its x and y are the layer's own world point with the camera at (0, 0).
import { WORLD_GROUND_Y } from './world'
import { ridge, type Ridge } from './mountain-draw'
import { MOUNTAIN_LIFT, type MountainParams } from './mountains'
import { msg } from '../i18n'

const G = WORLD_GROUND_Y
// how far down every layer reaches below the horizon (zoomed all the way out, the camera never shows its foot)
export const BACKDROP_BOTTOM = G + 4000
// how far past the world's left edge the layers start, and how much they reach past its right edge (the widest screen)
export const BACKDROP_PAD_L = 1600, BACKDROP_PAD_R = 4200
// a layer's width in its own units: what the camera can reveal of it over the whole world
export const backdropLayerW = (worldW: number, p: number) => Math.ceil(worldW * (1 - p)) + BACKDROP_PAD_L + BACKDROP_PAD_R

// Zoomed out farther than 50% (Configurações do Pátio → Zoom), the camera may show the whole world at once, and a
// layer slides past its ends: it then repeats, mirrored, this many times on each side (none for the usual range).
// The farthest it slides with an end of the world in view: half the world, plus half of the widest screen.
export function backdropCopies(worldW: number, p: number, zoomMin: number) {
  if (zoomMin >= 0.5) return 0
  const need = Math.max(p * worldW / 2 - BACKDROP_PAD_L, p * (worldW / 2 + 1800) - BACKDROP_PAD_R)
  return need > 0 ? Math.ceil(need / backdropLayerW(worldW, p)) : 0
}

// how far up a layer's drawing reaches: it starts at the world's top (y = 0) and grows upward to hold anything drawn
// higher (a tall range, the sun's glow), so only the Pátio's own frame ever cuts it, never the layer's box
export const backdropLayerTop = (highestY: number) => Math.min(0, Math.floor(highestY) - 8)

// the ranges, in the order Cordilheiras adds them (the usual three first, then one behind and two in between):
// depth, seed, base (their feet), peaks' height, roughness, sampling step, the haze. Drawn back to front.
export const MOUNTAIN_RANGES = [
  { p: 0.82, seed: 3, base: 720, amp: 190, rough: 1.3, step: 24, hazeTop: 560, haze: 0.7 },
  { p: 0.66, seed: 7, base: 790, amp: 160, rough: 1.7, step: 24, hazeTop: 680, haze: 0.55 },
  { p: 0.48, seed: 19, base: 860, amp: 90, rough: 1.1, step: 32, hazeTop: 790, haze: 0.35 },
  { p: 0.9, seed: 23, base: 680, amp: 230, rough: 1.0, step: 24, hazeTop: 500, haze: 0.8 },
  { p: 0.74, seed: 29, base: 755, amp: 175, rough: 1.5, step: 24, hazeTop: 620, haze: 0.62 },
  { p: 0.57, seed: 37, base: 825, amp: 120, rough: 1.4, step: 28, hazeTop: 735, haze: 0.45 },
] as const

// a range's crest and outline, as the backdrop draws it (layer units: x from the layer's left, y the world's)
export type RangeShape = Pick<MountainParams, 'height' | 'lift' | 'rough' | 'shape' | 'peak'>
export function rangeRidge(worldW: number, i: number, m: RangeShape): Ridge {
  const r = MOUNTAIN_RANGES[i]
  const w = backdropLayerW(worldW, r.p), amp = r.amp * m.height / 100, seed = r.seed + m.shape * 101, up = m.lift * MOUNTAIN_LIFT.unit
  return ridge(w, seed, r.base - up, amp, r.rough * m.rough / 100, m.peak === 'wave' ? r.step : 16, m.peak, BACKDROP_BOTTOM)
}

// the crest's height at a layer x (between its samples)
export function crestY(crest: readonly [number, number][], x: number) {
  if (!crest.length) return null
  if (x <= crest[0][0]) return crest[0][1]
  for (let i = 1; i < crest.length; i++) {
    const [xa, ya] = crest[i - 1], [xb, yb] = crest[i]
    if (x <= xb) return xb === xa ? Math.min(ya, yb) : ya + (yb - ya) * (x - xa) / (xb - xa)
  }
  return crest[crest.length - 1][1]
}

// the tree lines: where their ground starts (the far one is a filled band from there down)
export const FOREST_FAR = { p: 0.34, top: G - 42 }, FOREST_NEAR = { p: 0.2, top: G - 6 }
export const SUN_DEPTH = 0.97, CLOUD_DEPTH = 0.9

export type BackdropLayerId = 'sun' | 'clouds' | 'range0' | 'range1' | 'range2' | 'range3' | 'range4' | 'range5' | 'forestFar' | 'forestNear'
export const BACKDROP_DEPTH: Record<BackdropLayerId, number> = {
  sun: SUN_DEPTH, clouds: CLOUD_DEPTH,
  range0: MOUNTAIN_RANGES[0].p, range1: MOUNTAIN_RANGES[1].p, range2: MOUNTAIN_RANGES[2].p,
  range3: MOUNTAIN_RANGES[3].p, range4: MOUNTAIN_RANGES[4].p, range5: MOUNTAIN_RANGES[5].p,
  forestFar: FOREST_FAR.p, forestNear: FOREST_NEAR.p,
}
export const isBackdropLayer = (v: unknown): v is BackdropLayerId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(BACKDROP_DEPTH, v)

// "Montanhas 1"… (the numbers are part of the text, each one translated whole)
const RANGE_LABELS = [msg('Montanhas 1'), msg('Montanhas 2'), msg('Montanhas 3'), msg('Montanhas 4'), msg('Montanhas 5'), msg('Montanhas 6')]
export type BackdropLayer = { id: BackdropLayerId; label: string; depth: number }
// the layers this Pátio shows, the farthest first: the sky with the sun, the clouds (when there are any), the ranges
// (Montanhas → Cordilheiras, numbered from the back) and the tree lines (Mata ao longe)
export function backdropLayers(o: { mountains: Pick<MountainParams, 'show' | 'ranges'>; clouds: boolean; forest: boolean }): BackdropLayer[] {
  const out: BackdropLayer[] = [{ id: 'sun', label: msg('Céu e sol'), depth: SUN_DEPTH }]
  if (o.clouds) out.push({ id: 'clouds', label: msg('Nuvens'), depth: CLOUD_DEPTH })
  if (o.mountains.show) {
    const ranges = MOUNTAIN_RANGES.slice(0, o.mountains.ranges).map((r, i) => ({ i, p: r.p })).sort((a, b) => b.p - a.p)
    ranges.forEach(({ i, p }, k) => out.push({ id: `range${i}` as BackdropLayerId, label: ranges.length > 1 ? RANGE_LABELS[k] : msg('Montanhas'), depth: p }))
  }
  if (o.forest) out.push({ id: 'forestFar', label: msg('Mata ao longe'), depth: FOREST_FAR.p }, { id: 'forestNear', label: msg('Mata perto'), depth: FOREST_NEAR.p })
  return out
}

// where a thing standing at layer-world x rests on a layer, with the camera at (0, 0): on a range, its crest;
// on a tree line, its ground; null on the sky and the clouds (it keeps its height there)
export function backdropGround(id: BackdropLayerId, x: number, worldW: number, m: RangeShape): number | null {
  if (id === 'forestFar') return FOREST_FAR.top
  if (id === 'forestNear') return FOREST_NEAR.top
  if (!id.startsWith('range')) return null
  const i = Number(id.slice(5))
  return crestY(rangeRidge(worldW, i, m).crest, x + BACKDROP_PAD_L)
}

// the camera's offset of something in a depth (live-camera's depthOffset): from the camera's resting height, or,
// pinned to a backdrop layer, from the camera at 0
export type DepthOffset = (depth: number, pinned: boolean) => { x: number; y: number }

// a new depth for an element (a plain one, or a backdrop layer's when `backdrop` is given; 0 back on the ground),
// keeping it where it is on the screen now; with `seat`, pinned to a range or a tree line, its foot goes down (or up)
// onto that layer's ground below its centre, a fixed point of the layer
export function moveToDepth<T extends { x: number; y: number; w: number; h: number; depth?: number; backdrop?: BackdropLayerId }>(
  el: T, to: { depth: number; backdrop?: BackdropLayerId }, offset: DepthOffset, seat?: { worldW: number; mountains: RangeShape },
): T {
  const depth = to.backdrop ? BACKDROP_DEPTH[to.backdrop] : to.depth
  const a = offset(el.depth ?? 0, !!el.backdrop), b = offset(depth, !!to.backdrop)
  const { backdrop: _b, depth: _d, ...rest } = el
  const out = { ...rest, x: el.x + a.x - b.x, y: el.y + a.y - b.y } as T
  if (depth > 0) out.depth = depth
  if (!to.backdrop) return out
  out.backdrop = to.backdrop
  const ground = seat ? backdropGround(to.backdrop, out.x + out.w / 2, seat.worldW, seat.mountains) : null
  if (ground !== null) out.y = ground - out.h
  return out
}
