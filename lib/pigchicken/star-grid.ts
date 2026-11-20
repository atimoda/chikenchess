// Estrela: the 12 notes laid on a grid of hexagons shaped as a six-pointed star (lib/pigchicken/instrument-scales.ts,
// `StarScale`). Pure geometry and pitch, no sound and no drawing.
//
// The grid: flat-topped hexagons in columns; a cell is (c, v): its column and its height in half rows (c + v is
// even). Its six neighbours are (±1, ±1) and (0, ±2). The star's middle is a lattice point and its tips are `arm`
// "long steps" away (the steps of the 30°-off directions: (±1, ±3) and (±2, 0)), so the tips point at 0°, 60°… on
// the screen. The column through the middle (c = 0) is not played: it is the mirror's axis.
//
// The pitch: every one of the 12 directions out of the middle is an interval, by its angle from straight up (k × 30°,
// k = 0…6): k semitones per step (up: the axis' own note, 30°: semitones, 60°: whole tones, 90°: minor thirds, 120°:
// major thirds, 150°: fourths, down: tritones). On the right of the axis the notes go up from the axis' note, on
// the left they go down by as much: the left half is the right one's mirror (a major chord on one side, its minor
// twin on the other), and a cell between two of those directions walks along both (a steps of one, b of the other:
// a·k + b·(k+1) semitones). With the axis on D (the piano's own mirror: its black and white keys are symmetric
// around D and G♯), the star with arms of 8 covers about seven octaves, the grand piano's range.
// Coordinates: the star's tips at radius 1 (the aim's reach); screen axes (x right, y down).

export const STAR_ARM_MIN = 4, STAR_ARM_MAX = 10, STAR_ARM_DEFAULT = 8

export type StarCell = {
  index: number
  c: number; v: number // lattice place (column, half rows)
  x: number; y: number // its middle (tips at radius 1)
  semis: number // semitones from the axis' note: up on the right, down on the left
  black: boolean // a black key of the piano
}
export type StarGrid = { arm: number; size: number; cells: StarCell[]; at: Map<string, number> }

const SQ3 = Math.sqrt(3)
// the rays out of the middle on the right half, from straight up (k = 0) to straight down (k = 6), as lattice steps
const RAYS: readonly [number, number][] = [[0, -2], [1, -3], [1, -1], [2, 0], [1, 1], [1, 3], [0, 2]]
const BLACK = new Set([1, 3, 6, 8, 10])
const pc = (m: number) => ((m % 12) + 12) % 12

/** Semitones from the axis' note of the cell (c, v): positive on the right, the mirror on the left. */
export function starSemis(c: number, v: number): number {
  if (c === 0) return v < 0 ? 0 : 6 * (v / 2)
  const side = Math.sign(c), x = Math.abs(c)
  for (let k = 0; k < 6; k++) {
    const [c0, v0] = RAYS[k], [c1, v1] = RAYS[k + 1], det = c0 * v1 - v0 * c1
    const a = (x * v1 - v * c1) / det, b = (c0 * v - v0 * x) / det
    if (a >= -1e-9 && b >= -1e-9) return side * Math.round(a * k + b * (k + 1))
  }
  return 0
}

// the hexagons' size (centre to corner) when the tips are at radius 1
export const starHexSize = (arm: number) => 1 / (3 * arm)
const placeOf = (c: number, v: number, s: number) => ({ x: 1.5 * s * c, y: (SQ3 / 2) * s * v })

// inside the hexagram whose tips are at radius 1: one of its two triangles (each edge 1/2 from the middle)
function inStar(x: number, y: number) {
  const tri = (deg: number[]) => deg.every(d => x * Math.cos(d) + y * Math.sin(d) <= 0.5 + 1e-6)
  const r = Math.PI / 180
  return tri([60 * r, 180 * r, 300 * r]) || tri([0, 120 * r, 240 * r])
}

const cache = new Map<number, StarGrid>()
/** The star with arms of `arm` long steps (cached): its cells, top to bottom and left to right. */
export function starGrid(arm = STAR_ARM_DEFAULT): StarGrid {
  const n = Math.max(STAR_ARM_MIN, Math.min(STAR_ARM_MAX, Math.round(arm) || STAR_ARM_DEFAULT))
  const hit = cache.get(n)
  if (hit) return hit
  const s = starHexSize(n), cells: StarCell[] = [], at = new Map<string, number>()
  for (let v = -3 * n; v <= 3 * n; v++) {
    for (let c = -2 * n; c <= 2 * n; c++) {
      if (c === 0 || (c + v) % 2 !== 0) continue
      const p = placeOf(c, v, s)
      if (!inStar(p.x, p.y)) continue
      const semis = starSemis(c, v)
      at.set(`${c},${v}`, cells.length)
      cells.push({ index: cells.length, c, v, x: p.x, y: p.y, semis, black: BLACK.has(pc(semis + 2)) })
    }
  }
  const grid = { arm: n, size: s, cells, at }
  cache.set(n, grid)
  return grid
}

/** The cell a point is on (tips at radius 1): -1 outside the star or on the axis' column. */
export function starCellAt(g: StarGrid, x: number, y: number): number {
  const s = g.size, c0 = Math.round(x / (1.5 * s)), vy = y / ((SQ3 / 2) * s)
  let best = -1, bestD = Infinity, bestKey = ''
  for (let c = c0 - 1; c <= c0 + 1; c++) {
    let v0 = Math.round(vy)
    if ((c + v0) % 2 !== 0) v0 += vy > v0 ? 1 : -1
    for (const v of [v0 - 2, v0, v0 + 2]) {
      const p = placeOf(c, v, s), d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (d < bestD) { bestD = d; best = c; bestKey = `${c},${v}` }
    }
  }
  if (best === 0) return -1
  return g.at.get(bestKey) ?? -1
}

/** The nearest cell of the star to a point (a stick pushed out of the star still lands on its edge). */
export function starNearest(g: StarGrid, x: number, y: number): number {
  const on = starCellAt(g, x, y)
  if (on >= 0) return on
  let best = 0, bestD = Infinity
  for (const cell of g.cells) { const d = (cell.x - x) ** 2 + (cell.y - y) ** 2; if (d < bestD) { bestD = d; best = cell.index } }
  return best
}

/**
 * The cells a point moving from (x0, y0) to (x1, y1) goes through, in order (the first one included), with -1 where
 * it crosses the axis or leaves the star: a drag in one frame touches every cell on its way.
 */
export function starPath(g: StarGrid, x0: number, y0: number, x1: number, y1: number): number[] {
  const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.min(400, Math.ceil(len / (g.size * 0.4))))
  const out: number[] = []
  for (let i = 0; i <= n; i++) {
    const k = starCellAt(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)
    if (out[out.length - 1] !== k) out.push(k)
  }
  return out
}

/** Where (x, y, tips at radius 1) the aim's angle and reach point. */
export const starPoint = (angle: number, reach: number) => ({ x: Math.cos(angle) * reach, y: Math.sin(angle) * reach })

/**
 * Sitting at the Piano de cauda, the star (radius `r`, tips at radius 1) is centred at (x, y) unless that leaves it
 * out of `screen` (the part of the screen it may use): then it slides in and, bigger than the screen, shrinks until
 * it fits whole.
 */
export function fitStar(x: number, y: number, r: number, screen: { l: number; t: number; r: number; b: number } | null) {
  if (!screen) return { x, y, r }
  const w = screen.r - screen.l, h = screen.b - screen.t
  const k = w > 0 && h > 0 ? Math.min(r, w / 2, h / SQ3) : r, hy = (SQ3 / 2) * k
  return { x: Math.max(screen.l + k, Math.min(screen.r - k, x)), y: Math.max(screen.t + hy, Math.min(screen.b - hy, y)), r: k }
}
