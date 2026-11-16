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
    // (an edge meant at 45° stays a floor or a ceiling whatever its points lost in the sums that brought them here)
    const kind = Math.abs(dy) > Math.abs(dx) * (1 + 1e-6) + 1e-6 ? 'wall' : n[1] < 0 ? 'floor' : 'ceil'
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

export type HardWall = { ax: number; ay: number; bx: number; by: number; wall: boolean; ceil?: boolean; hardN?: readonly number[]; fused?: string; join?: string }

// Walking or flying sideways into a hard wall: the x she can reach from `prevX` towards `x` with her body between
// `top` and `bottom` (screen y) and `radius` of room, or null when nothing stops her. She is never pushed further
// out than she already was, so meeting a wall inside the radius only stops her there. `feet` (screen y): the walls
// of the fused boxes (a room's, see below) and of what is joined to them stop her down to there, for there is never
// a step to take over them.
export function blockHardWalls(segs: readonly HardWall[], prevX: number, x: number, top: number, bottom: number, radius: number, feet?: number): number | null {
  let out = x, hit = false
  for (const sg of segs) {
    const n = sg.hardN
    if (!n || !sg.wall || sg.ceil || Math.abs(n[0]) < 1e-6) continue
    const y0 = Math.max(top, Math.min(sg.ay, sg.by)), y1 = Math.min(feet !== undefined && (sg.fused || sg.join) ? feet : bottom, Math.max(sg.ay, sg.by))
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

// ---------- fused boxes ----------

// Hard boxes built side by side as one solid (`data-chicken-fused="<group>"`, upright rectangles: the walls of a
// block of the Grade de blocos and the plugs of the narrow gaps between two blocks). Read one by one they would
// leave surfaces where there is none (a wall's back against the next box, the end of a face inside a corner), and
// she would climb over them into the solid. So each of their faces keeps only the stretches with no other fused box
// right in front of them, and the faces of one group that go on along the same line become a single one. Whatever
// else crosses a fused box (a platform of the Pátio through a room's wall) ends at it: the stretch inside is cut out.
// A hard outline of any shape can be joined to them (`data-chicken-join`: the slanted wall of a block's cut corner,
// what fills a cut corner for a body too big for the gap beside it): it is part of the same solid, so a face of
// theirs or of its own with another of these outlines, or a fused box, right in front of its middle is no surface.
export type FusedBox = { id: string; group: string; left: number; top: number; right: number; bottom: number }
export type JoinedShape = { id: string; poly: number[][]; left: number; top: number; right: number; bottom: number }
type FusedFace = {
  id: string; ax: number; ay: number; bx: number; by: number; len: number; anchorX: number; clipOffset?: number
  wall: boolean; ceil?: boolean; hardN?: number[]; fused?: string; join?: string; cross?: { key: string; reach: number }
}

// the pieces of another collider's line left outside the fused boxes (a line along a box's edge stays whole); the
// pieces are named and measured like the ones an object in front cuts (`~n`, `clipOffset` from the line's start)
// the stretch of the line from (ax, ay) to (ax + dx, ay + dy) inside a box, as fractions of it (the box a little
// smaller, so that a line along its edge is outside), or null
function insideBox(q: FusedBox, ax: number, ay: number, dx: number, dy: number): [number, number] | null {
  const l = q.left + 0.5, r = q.right - 0.5, t = q.top + 0.5, b = q.bottom - 0.5
  if (Math.max(ax, ax + dx) <= l || Math.min(ax, ax + dx) >= r || Math.max(ay, ay + dy) <= t || Math.min(ay, ay + dy) >= b) return null
  let t0 = 0, t1 = 1
  for (const [p, d] of [[-dx, ax - l], [dx, r - ax], [-dy, ay - t], [dy, b - ay]]) {
    if (Math.abs(p) < 1e-9) { if (d < 0) return null }
    else if (p < 0) t0 = Math.max(t0, d / p)
    else t1 = Math.min(t1, d / p)
  }
  return t1 > t0 ? [t0, t1] : null
}
// whether the straight way from one point to another goes through a fused box: she never takes it in one go (a
// ceiling grabbed over the room's own, a wall or a step behind a wall)
export function crossesFused(boxes: readonly FusedBox[], x0: number, y0: number, x1: number, y1: number) {
  const dx = x1 - x0, dy = y1 - y0
  const hit = (ox: number, oy: number) => boxes.some(q => insideBox(q, x0 + ox, y0 + oy, dx, dy))
  if (hit(0, 0)) return true
  // right along the line where two boxes touch there is solid on both sides (along one box's edge, only on one)
  const len = Math.hypot(dx, dy) || 1, nx = (-dy / len) * 0.75, ny = (dx / len) * 0.75
  return hit(nx, ny) && hit(-nx, -ny)
}
function cutInside<T extends FusedFace>(seg: T, boxes: readonly FusedBox[]): T[] {
  if (seg.id.startsWith('screen:')) return [seg]
  const dx = seg.bx - seg.ax, dy = seg.by - seg.ay, inside: number[][] = []
  for (const q of boxes) {
    const cut = insideBox(q, seg.ax, seg.ay, dx, dy)
    if (cut) inside.push([cut[0] * seg.len, cut[1] * seg.len])
  }
  if (!inside.length) return [seg]
  inside.sort((a, b) => a[0] - b[0])
  const out: T[] = [], ux = dx / seg.len, uy = dy / seg.len
  const base = seg.id.replace(/~\d+$/, ''), nth = (Number(/~(\d+)$/.exec(seg.id)?.[1] ?? -1) + 2) * 100
  const keep = (from: number, to: number) => {
    if (to - from < 4) return
    out.push({
      ...seg, id: out.length ? `${base}~${nth + out.length}` : seg.id, len: to - from, clipOffset: (seg.clipOffset ?? 0) + from,
      ax: seg.ax + ux * from, ay: seg.ay + uy * from, bx: seg.ax + ux * to, by: seg.ay + uy * to,
    })
  }
  let at = 0
  for (const [a, b] of inside) { if (a > at) keep(at, a); at = Math.max(at, b) }
  if (at < seg.len) keep(at, seg.len)
  return out
}

// the faces of the fused boxes and of the joined outlines that are left with one of the joined outlines (or, for
// an outline's face, a fused box) right in front of their middle
function buried<T extends FusedFace>(seg: T, boxes: readonly FusedBox[], joins: readonly JoinedShape[]) {
  const n = seg.hardN
  if (!n || (!seg.fused && !seg.join)) return false
  const x = (seg.ax + seg.bx) / 2 + n[0] * 1.5, y = (seg.ay + seg.by) / 2 + n[1] * 1.5
  if (seg.join && boxes.some(q => x > q.left && x < q.right && y > q.top && y < q.bottom)) return true
  return joins.some(j => j.id !== seg.join && x > j.left && x < j.right && y > j.top && y < j.bottom && polygonContains(j.poly, x, y))
}

export function fuseFaces<T extends FusedFace>(segs: T[], boxes: readonly FusedBox[], joins: readonly JoinedShape[] = []): T[] {
  if (!boxes.length && !joins.length) return segs
  const groups = new Map(boxes.map(b => [b.id, b.group]))
  // a face, or a stretch of one: along x when it is flat, along y when it is upright
  type Part = { seg: T; flat: boolean; from: number; to: number; key: string; cut: boolean; gone?: boolean }
  const parts: (T | Part)[] = [], lines = new Map<string, Part[]>()
  for (const seg of segs) {
    const n = seg.hardN, flat = seg.ay === seg.by
    if (!seg.fused) { parts.push(...cutInside(seg, boxes)); continue }
    if (!n || (!flat && seg.ax !== seg.bx)) { parts.push(seg); continue }
    const lo = flat ? Math.min(seg.ax, seg.bx) : Math.min(seg.ay, seg.by), hi = lo + seg.len
    // what the other fused boxes cover of the line just in front of the face
    const px = seg.ax + n[0], py = seg.ay + n[1]
    const covered = boxes
      .filter(q => q.id !== seg.fused && (flat ? py > q.top && py < q.bottom : px > q.left && px < q.right))
      .map(q => (flat ? [q.left, q.right] : [q.top, q.bottom])).sort((a, b) => a[0] - b[0])
    const free: number[][] = []
    let at = lo
    for (const [a, b] of covered) {
      if (a > at) free.push([at, Math.min(a, hi)])
      at = Math.max(at, b)
      if (at >= hi) break
    }
    if (at < hi) free.push([at, hi])
    const line = flat ? seg.ay : seg.ax, facing = flat ? n[1] : n[0]
    const key = `${groups.get(seg.fused)}|${flat ? 'h' : 'v'}|${line.toFixed(2)}|${facing > 0 ? 1 : -1}|${seg.wall ? 1 : 0}${seg.ceil ? 1 : 0}|${seg.cross ? `${seg.cross.key},${seg.cross.reach}` : ''}`
    for (const [from, to] of free) {
      if (to - from < 4) continue
      const whole = from <= lo + 1e-6 && to >= hi - 1e-6
      // joined to the stretches of its group already on this line that it touches
      const same = lines.get(key) ?? []
      lines.set(key, same)
      let part: Part | null = null
      for (const old of same) {
        if (old.gone || from > old.to + 0.5 || to < old.from - 0.5) continue
        if (!part) { old.from = Math.min(old.from, from); old.to = Math.max(old.to, to); old.cut = true; part = old }
        else { part.from = Math.min(part.from, old.from); part.to = Math.max(part.to, old.to); old.gone = true }
      }
      if (!part) { part = { seg, flat, from, to, key, cut: !whole }; same.push(part); parts.push(part) }
    }
  }
  const out: T[] = [], used = new Map<string, number>()
  for (const p of parts) {
    if (!('seg' in p)) { out.push(p); continue }
    if (p.gone) continue
    const { seg } = p, k = used.get(seg.id) ?? 0
    used.set(seg.id, k + 1)
    if (!p.cut && !k) { out.push(seg); continue }
    // the same way round as the face it came from
    const forward = p.flat ? seg.bx >= seg.ax : seg.by >= seg.ay, a = forward ? p.from : p.to, b = forward ? p.to : p.from
    const next = { ...seg, id: k ? `${seg.id}~${k}` : seg.id, len: p.to - p.from, ...(p.flat ? { ax: a, bx: b } : { ay: a, by: b }) }
    next.anchorX = next.ax
    delete next.clipOffset
    out.push(next)
  }
  return joins.length ? out.filter(seg => !buried(seg, boxes, joins)) : out
}
