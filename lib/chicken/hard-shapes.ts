// Closed outlines (`data-chicken-shape`: the Pátio's Chãos and Paredes and any "Objeto duro") for the chicken's
// engine: each edge is a floor (its outside faces up, at most 45° from flat), a ceiling (faces down) or a wall
// (steeper). On a hard outline every edge is solid and its walls also stop her walking or flying through.
type Pt = readonly number[]

export type ShapeEdge = { i: number; a: Pt; b: Pt; kind: 'floor' | 'ceil' | 'wall'; n: [number, number] }

export function shapeEdges(points: readonly Pt[]): ShapeEdge[] {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length]
    area += a[0] * b[1] - b[0] * a[1]
  }
  // clockwise on the screen (y down): the outside of an edge (dx, dy) is (dy, -dx)
  const sign = area >= 0 ? 1 : -1
  const out: ShapeEdge[] = []
  points.forEach((a, i) => {
    const b = points[(i + 1) % points.length]
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy)
    if (len < 1e-6) return
    const n: [number, number] = [(sign * dy) / len, (-sign * dx) / len]
    const kind = Math.abs(dy) > Math.abs(dx) ? 'wall' : n[1] < 0 ? 'floor' : 'ceil'
    out.push({ i, a, b, kind, n })
  })
  return out
}

export function polygonContains(poly: readonly Pt[], x: number, y: number) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[j]
    if ((ay > y) !== (by > y) && x < ax + ((bx - ax) * (y - ay)) / (by - ay)) inside = !inside
  }
  return inside
}

// the part of an edge above the ground line (null when none of it is)
export function clipAboveGround(a: Pt, b: Pt, groundY: number): [Pt, Pt] | null {
  if (a[1] >= groundY && b[1] >= groundY) return null
  if (a[1] <= groundY && b[1] <= groundY) return [a, b]
  const t = (groundY - a[1]) / (b[1] - a[1])
  const cut = [a[0] + (b[0] - a[0]) * t, groundY]
  return a[1] < groundY ? [a, cut] : [cut, b]
}

export type HardWall = { ax: number; ay: number; bx: number; by: number; wall: boolean; ceil?: boolean; hardN?: readonly number[] }

// Walking or flying sideways into a hard wall: the x she can reach from `prevX` towards `x` with her body between
// `top` and `bottom` (screen y) and `radius` of room, or null when nothing stops her. She is never pushed further
// out than she already was, so meeting a wall inside the radius only stops her there.
export function blockHardWalls(segs: readonly HardWall[], prevX: number, x: number, top: number, bottom: number, radius: number): number | null {
  let out = x, hit = false
  for (const sg of segs) {
    const n = sg.hardN
    if (!n || !sg.wall || sg.ceil || Math.abs(n[0]) < 1e-6) continue
    const y0 = Math.max(top, Math.min(sg.ay, sg.by)), y1 = Math.min(bottom, Math.max(sg.ay, sg.by))
    if (y1 <= y0) continue
    const at = (y: number) => sg.ax + ((sg.bx - sg.ax) * (y - sg.ay)) / ((sg.by - sg.ay) || 1e-9)
    const xa = at(y0), xb = at(y1)
    if (n[0] > 0) {
      // the solid is on the left: she stays on the right
      const wallX = Math.max(xa, xb)
      if (prevX < wallX - 0.5) continue
      const limit = Math.min(prevX, wallX + radius)
      if (out < limit) { out = limit; hit = true }
    } else {
      const wallX = Math.min(xa, xb)
      if (prevX > wallX + 0.5) continue
      const limit = Math.max(prevX, wallX - radius)
      if (out > limit) { out = limit; hit = true }
    }
  }
  return hit ? out : null
}
