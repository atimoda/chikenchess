// Chãos e Paredes: elements whose shape is a polygon of points around the whole object (its top, its sides and
// its back), drawn with a biome (ground) or a wall style. The same outline is the art and the collider; with
// "Objeto duro" (`LayoutElement.hard`) the characters cannot pass through it from any side.
//
// The points are stored in percent of the element's box (0–100), like the houses' outlines, so resizing the box
// stretches the shape. Editing a point refits the box around the outline (`fitSurface`).
import { SCENE_W, WORLD_GROUND_Y } from './world'
import { VILLAGE_RIDGE, type RidgePoint } from './village'
import { msg } from '../i18n'

export type SurfacePoint = [x: number, y: number]
export const GROUND_BIOMES = ['village', 'meadow', 'desert', 'snow', 'volcanic', 'moon', 'mars'] as const
export type GroundBiome = (typeof GROUND_BIOMES)[number]
export const WALL_STYLES = ['brick', 'stone', 'wood'] as const
export type WallStyle = (typeof WALL_STYLES)[number]
export type SurfaceKind = 'ground' | 'wall'
export type SurfaceParams = { style: GroundBiome | WallStyle; points: SurfacePoint[] }

export const SURFACE_STYLE_LABELS: Record<GroundBiome | WallStyle, string> = {
  village: msg('Rocha da Vila'), meadow: msg('Campo'), desert: msg('Deserto'), snow: msg('Neve'), volcanic: msg('Vulcânico'), moon: msg('Lua'), mars: msg('Marte'),
  brick: msg('Tijolos'), stone: msg('Pedra'), wood: msg('Madeira'),
}

export const SURFACE_MIN_POINTS = 3
export const SURFACE_MAX_POINTS = 64

// a gentle hill: the top rises and falls, the sides and the back close it
const GROUND_SHAPE: SurfacePoint[] = [[0, 12], [28, 0], [62, 8], [100, 2], [100, 100], [0, 100]]
const WALL_SHAPE: SurfacePoint[] = [[0, 0], [100, 0], [100, 100], [0, 100]]

export const surfaceStyles = (kind: SurfaceKind): readonly (GroundBiome | WallStyle)[] => kind === 'ground' ? GROUND_BIOMES : WALL_STYLES

export function defaultSurface(kind: SurfaceKind, style?: string): SurfaceParams {
  const styles = surfaceStyles(kind)
  return {
    style: styles.includes(style as GroundBiome & WallStyle) ? style as GroundBiome | WallStyle : styles[0],
    points: (kind === 'ground' ? GROUND_SHAPE : WALL_SHAPE).map(p => [...p] as SurfacePoint),
  }
}

const pct = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 1000) / 1000

export function normalizeSurface(kind: SurfaceKind, raw: unknown): SurfaceParams {
  const r = (raw && typeof raw === 'object' ? raw : {}) as { style?: unknown; points?: unknown }
  const base = defaultSurface(kind, typeof r.style === 'string' ? r.style : undefined)
  const list = r.points
  if (!Array.isArray(list) || list.length < SURFACE_MIN_POINTS || list.length > SURFACE_MAX_POINTS) return base
  const points: SurfacePoint[] = []
  for (const p of list) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(n => typeof n === 'number' && Number.isFinite(n))) return base
    points.push([pct(p[0]), pct(p[1])])
  }
  return { style: base.style, points }
}

type Box = { x: number; y: number; w: number; h: number }

// the outline in world units
export const surfacePolygon = (box: Box, surface: SurfaceParams): SurfacePoint[] =>
  surface.points.map(([x, y]) => [box.x + (x * box.w) / 100, box.y + (y * box.h) / 100])

// twice the signed area: positive when the points go clockwise on the screen (y grows downwards)
export function polygonArea2(poly: readonly (readonly [number, number])[]) {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]
    a += ax * by - bx * ay
  }
  return a
}

export function polygonContains(poly: readonly (readonly [number, number])[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[j]
    if ((ay > y) !== (by > y) && x < ax + ((bx - ax) * (y - ay)) / (by - ay)) inside = !inside
  }
  return inside
}

// The edges whose outside faces up (at most 45° from flat): the walkable top, drawn with the biome's cap.
export function surfaceTopEdges(poly: readonly SurfacePoint[]): [SurfacePoint, SurfacePoint][] {
  const sign = polygonArea2(poly) >= 0 ? 1 : -1
  const out: [SurfacePoint, SurfacePoint][] = []
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]
    const dx = b[0] - a[0], dy = b[1] - a[1]
    // outward normal (dy, -dx) for a clockwise outline: up means a negative y
    if (Math.abs(dy) <= Math.abs(dx) && -dx * sign < 0) out.push([a, b])
  })
  return out
}

const r1 = (v: number) => Math.round(v * 10) / 10

// The box around an outline given in world units, and the outline in percent of it. The box keeps the kind's
// minimum size (the outline then sits at its top-left).
export function fitSurface(world: readonly SurfacePoint[], minW: number, minH: number): Box & { points: SurfacePoint[] } {
  const xs = world.map(p => p[0]), ys = world.map(p => p[1])
  const x = r1(Math.min(...xs)), y = r1(Math.min(...ys))
  const w = r1(Math.max(minW, Math.max(...xs) - x)), h = r1(Math.max(minH, Math.max(...ys) - y))
  return { x, y, w, h, points: world.map(([px, py]) => [pct(((px - x) / w) * 100), pct(((py - y) / h) * 100)]) }
}

// the edge nearest to a point (world units) and where on it: `edge` i joins point i and point i + 1
export function nearestSurfaceEdge(poly: readonly SurfacePoint[], x: number, y: number) {
  let best = { edge: -1, point: [x, y] as SurfacePoint, dist: Infinity }
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]
    const dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2)) : 0
    const p: SurfacePoint = [a[0] + dx * t, a[1] + dy * t]
    const dist = Math.hypot(p[0] - x, p[1] - y)
    if (dist < best.dist) best = { edge: i, point: p, dist }
  })
  return best
}

// a new point on edge `edge` (after point `edge`); null when the outline is full
export function insertSurfacePoint(world: readonly SurfacePoint[], edge: number, point: SurfacePoint): SurfacePoint[] | null {
  if (world.length >= SURFACE_MAX_POINTS || edge < 0 || edge >= world.length) return null
  return [...world.slice(0, edge + 1), point, ...world.slice(edge + 1)]
}

// a point taken out; null when only the minimum is left
export function removeSurfacePoint(world: readonly SurfacePoint[], index: number): SurfacePoint[] | null {
  if (world.length <= SURFACE_MIN_POINTS || index < 0 || index >= world.length) return null
  return world.filter((_, i) => i !== index)
}

// ---------- the Vila dos Telhados' ground: the old fixed "Chão da Vila", now an element ----------

export const VILLAGE_GROUND_ID = 'village-ground'
// the rock goes a little under the floor so the world's ground never shows a gap under it
export const VILLAGE_ROCK_BOTTOM = WORLD_GROUND_Y + 10

// scene-local box and outline of the village's rocky slope from its ridge (the old `layout.terrain`)
export function villageGround(ridge: readonly RidgePoint[] = VILLAGE_RIDGE) {
  const first = ridge[0], last = ridge[ridge.length - 1]
  const world: SurfacePoint[] = [...ridge.map(([x, y]) => [x, y] as SurfacePoint), [last[0], VILLAGE_ROCK_BOTTOM], [first[0], VILLAGE_ROCK_BOTTOM]]
  const fit = fitSurface(world, 40, 24)
  return { x: Math.min(fit.x, SCENE_W), y: fit.y, w: fit.w, h: fit.h, surface: { style: 'village' as const, points: fit.points } }
}
