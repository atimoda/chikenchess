export type CollisionPoint = readonly [number, number]
type Interval = [number, number]
export type CollisionMask = { depth: number; polygon: readonly CollisionPoint[] }
type Bounds = { left: number; right: number; top: number; bottom: number }
const EPS = 1e-7

function containsInterior(x: number, y: number, polygon: CollisionMask['polygon']) {
  let inside = false
  for (let i = 0; i < polygon.length; i++) {
    const [ax, ay] = polygon[i], [bx, by] = polygon[(i + 1) % polygon.length]
    if (Math.abs((x - ax) * (by - ay) - (y - ay) * (bx - ax)) < EPS &&
        x >= Math.min(ax, bx) - EPS && x <= Math.max(ax, bx) + EPS &&
        y >= Math.min(ay, by) - EPS && y <= Math.max(ay, by) + EPS) return false
    if ((ay > y) !== (by > y) && x < ax + (bx - ax) * (y - ay) / (by - ay)) inside = !inside
  }
  return inside
}

function occludedIntervals(ax: number, ay: number, bx: number, by: number, polygon: CollisionMask['polygon']) {
  const dx = bx - ax, dy = by - ay
  const cuts = [0, 1]
  for (let i = 0; i < polygon.length; i++) {
    const [px, py] = polygon[i], [qx, qy] = polygon[(i + 1) % polygon.length]
    const ex = qx - px, ey = qy - py
    const det = dx * ey - dy * ex
    if (Math.abs(det) < EPS) continue
    const u = ((px - ax) * dy - (py - ay) * dx) / det
    const t = ((px - ax) * ey - (py - ay) * ex) / det
    if (u >= -EPS && u <= 1 + EPS && t > EPS && t < 1 - EPS) cuts.push(t)
  }
  cuts.sort((a, b) => a - b)
  const covered: Interval[] = []
  for (let i = 1; i < cuts.length; i++) {
    const start = cuts[i - 1], end = cuts[i], mid = (start + end) / 2
    if (end - start > EPS && containsInterior(ax + dx * mid, ay + dy * mid, polygon)) covered.push([start, end])
  }
  return covered
}

type Cached = { coords: [number, number, number, number]; depth: number; visible: Interval[] | null }

// Cache world-space fractions, so camera motion and multiple chickens reuse the same cuts.
export function createCollisionOcclusion(masks: CollisionMask[]) {
  if (!masks.length) return null
  const bounded = masks.map(({ depth, polygon }) => {
    const xs = polygon.map(p => p[0]), ys = polygon.map(p => p[1])
    const bounds: Bounds = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) }
    return { depth, polygon, bounds }
  })
  const cache = new WeakMap<Element, Map<string, Cached>>()
  function clip(node: Element, id: string, depth: number, ax: number, ay: number, bx: number, by: number): Interval[] | null {
    let entries = cache.get(node)
    if (!entries) { entries = new Map(); cache.set(node, entries) }
    const old = entries.get(id)
    if (old?.depth === depth && Math.abs(old.coords[0] - ax) < EPS && Math.abs(old.coords[1] - ay) < EPS &&
        Math.abs(old.coords[2] - bx) < EPS && Math.abs(old.coords[3] - by) < EPS) return old.visible

    const left = Math.min(ax, bx), right = Math.max(ax, bx), top = Math.min(ay, by), bottom = Math.max(ay, by)
    const covered: Interval[] = []
    for (const mask of bounded) {
      const b = mask.bounds
      if (mask.depth > depth && b.left < right && b.right > left && b.top < bottom && b.bottom > top) {
        covered.push(...occludedIntervals(ax, ay, bx, by, mask.polygon))
      }
    }
    let visible: Interval[] | null = null
    if (covered.length) {
      visible = []
      let cursor = 0
      covered.sort(([a], [b]) => a - b)
      for (const [start, end] of covered) {
        if (start > cursor + EPS) visible.push([cursor, start])
        cursor = Math.max(cursor, end)
      }
      if (cursor < 1 - EPS) visible.push([cursor, 1])
    }
    entries.set(id, { coords: [ax, ay, bx, by], depth, visible })
    return visible
  }
  function forBox(depth: number, { l, r, t, b }: { l: number; r: number; t: number; b: number }) {
    const masks = bounded.filter(mask => {
      const q = mask.bounds
      return mask.depth > depth && q.left < r && q.right > l && q.top < b && q.bottom > t
    })
    if (!masks.length) return undefined
    return (x: number, y: number) => masks.some(({ bounds, polygon }) =>
      x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom && containsInterior(x, y, polygon))
  }
  return { clip, forBox }
}

export type CollisionOcclusion = ReturnType<typeof createCollisionOcclusion>
