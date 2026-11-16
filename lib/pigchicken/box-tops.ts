// Where something falling lands on a box (an item lying around, a thrown one, a grenade, a zombie). A plain box has
// one top, its own; a shaped one (Chão, Parede: `topsAt`) has the lines of its outline that face up, which are
// rarely at the top of the box around it.
type TopBox = { l: number; t: number; r: number; occludedAt?: (x: number, y: number) => boolean; topsAt?: (x: number) => number[] }

// the heights (y) at which a point going down along x comes into the box, from the highest down
export function boxTops(box: TopBox, x: number): number[] {
  if (x < box.l || x > box.r) return []
  if (box.topsAt) return box.topsAt(x)
  return box.occludedAt?.(x, box.t) ? [] : [box.t]
}

// the top a point crosses falling from prevY to y along x, or null
export function crossedTop(box: TopBox, x: number, prevY: number, y: number): number | null {
  for (const t of boxTops(box, x)) if (prevY <= t && y >= t) return t
  return null
}

// the first box of the list with a top crossed like that, and where
export function landing<B extends TopBox>(boxes: readonly B[], x: number, prevY: number, y: number, ok?: (box: B) => boolean): { box: B; y: number } | null {
  for (const box of boxes) {
    if (ok && !ok(box)) continue
    const t = crossedTop(box, x, prevY, y)
    if (t !== null) return { box, y: t }
  }
  return null
}

// the heights at which a vertical line at x comes into a closed outline going down (its lines that face up)
export function outlineTops(poly: readonly (readonly [number, number])[], x: number): number[] {
  const ys: number[] = []
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[i], [bx, by] = poly[j]
    if ((ax > x) !== (bx > x)) ys.push(ay + ((x - ax) * (by - ay)) / (bx - ax))
  }
  ys.sort((a, b) => a - b)
  return ys.filter((_, i) => i % 2 === 0)
}
