// Where a bird may land besides the wires: the trees (their branches and the top of their crowns), the top of the
// platforms and roofs, and the top of some objects. Each place is a short straight line the perch world treats like a
// wire with no sag (lib/pigchicken/bird-perch.ts): the birds find a free spot on it, sit there and sidestep along it.
// A thing in a parallax depth of its own carries its depth, so the line moves with it as the wires do. Pure: no DOM.
import { houseRoof } from './houses'
import { oldTreePerches } from './old-trees'
import { elementCorners, type ElementKind, type LayoutElement } from './layout'
import { treeGeometry, type TreePoint } from './trees'
import type { PerchLine, PerchPlace } from './bird-perch'
import { WORLD_GROUND_Y } from './world'

type El = Pick<LayoutElement, 'id' | 'kind' | 'x' | 'y' | 'w' | 'h' | 'rot' | 'hidden' | 'opacity' | 'depth' | 'backdrop' | 'params'>

// what counts as an object, and how much of its top the birds use (% of its width, centred)
const OBJECTS: Partial<Record<ElementKind, number>> = { pole: 50, tower: 40, chalkboard: 90, gong: 60, jukebox: 70, vitrola: 70, chest: 70, dummy: 60 }
const PLATFORMS: ElementKind[] = ['platform', 'terrace', 'pillar', 'wall']
export const PERCH_PLACE = {
  minLen: 14, // px: a line shorter than this holds no bird
  inset: 6, // px kept free at each end of a platform's top
  minTree: 120, // px: a tree lower than this (a bush far away) is too small for a bird
  perTree: 10, // lines a tree gives at most
  roofSlope: 1, // a roof's piece steeper than this (rise over run) is not a place to sit
  floor: 24, // px above the ground: a platform's top lower than this is the floor, not a place to land
}

// a point given in % of the element's box, in the world (turned with the element, mirrored when it is flipped)
function at(el: El, flip: boolean) {
  const a = (el.rot * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a), cx = el.x + el.w / 2, cy = el.y + el.h / 2
  return ([x, y]: readonly [number, number]): [number, number] => {
    const dx = ((flip ? 50 - x : x - 50) / 100) * el.w, dy = ((y - 50) / 100) * el.h
    return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]
  }
}

/** Every place to land the layout gives (the wires are apart: powerSpans). */
export function perchLines(elements: readonly El[]): PerchLine[] {
  const out: PerchLine[] = []
  for (const el of elements) {
    if (el.hidden || el.opacity < 0.3) continue
    const d = el.depth ?? 0, pin = el.backdrop ? { pin: true } : {}
    let n = 0
    const add = (place: PerchPlace, a: readonly [number, number], b: readonly [number, number]) => {
      // left to right, so a bird sidesteps the same way on every line
      const [l, r] = a[0] <= b[0] ? [a, b] : [b, a]
      if (Math.hypot(r[0] - l[0], r[1] - l[1]) < PERCH_PLACE.minLen) return
      if (place === 'platform' && !d && Math.min(l[1], r[1]) > WORLD_GROUND_Y - PERCH_PLACE.floor) return
      out.push({ id: `${place}:${el.id}:${n++}`, group: place, place, a: { x: l[0], y: l[1], d, ...pin }, b: { x: r[0], y: r[1], d, ...pin }, sag: 0, wire: 0, depth: d, floor: false })
    }
    if (el.kind === 'tree' && el.params.tree) {
      if (el.h < PERCH_PLACE.minTree) continue
      const tree = el.params.tree, to = at(el, tree.flip), g = treeGeometry(tree)
      const lines: [TreePoint, TreePoint][] = []
      // the top of each tuft of the crown, then the outer half of each branch
      for (const c of g.crowns) lines.push([[c.x - c.rx * 0.65, c.y - c.ry * 0.52], [c.x + c.rx * 0.65, c.y - c.ry * 0.52]])
      for (const b of g.branches) if (b.length >= 2) lines.push([b[b.length - 2], b[b.length - 1]])
      // the highest ones first (a tree with many tufts keeps its top)
      lines.sort((p, q) => Math.min(p[0][1], p[1][1]) - Math.min(q[0][1], q[1][1]))
      for (const [p, q] of lines.slice(0, PERCH_PLACE.perTree)) add('tree', to(p), to(q))
    } else if (el.kind === 'pine' || el.kind === 'blossom') {
      if (el.h < PERCH_PLACE.minTree) continue
      // the top of each pad of a pine, of each cloud of flowers of a plum tree (the highest first)
      const to = at(el, !!el.params.flip), tops = oldTreePerches(el.kind, el.params.seed ?? 1).sort((p, q) => p[0][1] - q[0][1])
      for (const [p, q] of tops.slice(0, PERCH_PLACE.perTree)) add('tree', to(p), to(q))
    } else if (el.kind === 'house' && el.params.house) {
      const to = at(el, false), roof = houseRoof(el.params.house)
      for (let i = 1; i < roof.length; i++) {
        const p = roof[i - 1], q = roof[i], run = Math.abs(q[0] - p[0]) * el.w, rise = Math.abs(q[1] - p[1]) * el.h
        if (run > 0 && rise / run <= PERCH_PLACE.roofSlope) add('platform', to(p), to(q))
      }
    } else if (PLATFORMS.includes(el.kind)) {
      // the sides that face up, whichever way it was turned
      const pts = elementCorners(el), cx = el.x + el.w / 2, cy = el.y + el.h / 2
      for (let i = 0; i < 4; i++) {
        const p = pts[i], q = pts[(i + 1) % 4], len = Math.hypot(q[0] - p[0], q[1] - p[1])
        if (len < PERCH_PLACE.inset * 4) continue
        // its normal, away from the middle
        let nx = (q[1] - p[1]) / len, ny = -(q[0] - p[0]) / len
        if (nx * ((p[0] + q[0]) / 2 - cx) + ny * ((p[1] + q[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny }
        if (ny > -0.6) continue
        const k = PERCH_PLACE.inset / len
        add('platform', [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k], [q[0] - (q[0] - p[0]) * k, q[1] - (q[1] - p[1]) * k])
      }
    } else {
      const share = OBJECTS[el.kind]
      if (share === undefined) continue
      const half = (el.w * share) / 200, cx = el.x + el.w / 2
      add('object', [cx - half, el.y], [cx + half, el.y])
    }
  }
  return out
}
