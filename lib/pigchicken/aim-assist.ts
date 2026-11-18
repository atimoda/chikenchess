// Aim Assist (Itens → Música → Aim Assist, `ItemDef.aimAssist`, 0 to 100%): an instrument's shot that leaves with
// an enemy in the same cell of its scale's drawing as the aim (lib/pigchicken/instrument-scales.ts, `cellAt`) turns
// toward that enemy, by the slider's share (100%: right at it; 0: off). With nobody in that cell it goes where the
// aim is. Pure: the combat (lib/pigchicken/combat.ts) says who is where and fires.
// Angles are screen radians (0 = right, π/2 = down).

const TAU = Math.PI * 2

// the turn from `from` to `to`, the short way round (−π…π)
export function turnTo(from: number, to: number) {
  return ((((to - from + Math.PI) % TAU) + TAU) % TAU) - Math.PI
}

// `p` of the way from one angle to another (0: from, 1: to)
export const blendAngle = (from: number, to: number, p: number) => from + turnTo(from, to) * Math.max(0, Math.min(1, p))

// where to point a shot of this speed (px/s), falling `g` px/s² (0: a straight line), to go through (dx, dy) from
// where it leaves: the low arc; straight at it when no arc gets there
export function arcAngle(dx: number, dy: number, speed: number, g: number) {
  const straight = Math.atan2(dy, dx), x = Math.abs(dx), up = -dy
  if (!(g > 0) || !(speed > 0) || x < 1e-6) return straight
  const v2 = speed * speed, disc = v2 * v2 - g * (g * x * x + 2 * up * v2)
  if (disc < 0) return straight
  const a = Math.atan((v2 - Math.sqrt(disc)) / (g * x))
  return Math.atan2(-Math.sin(a), Math.sign(dx) * Math.cos(a))
}

// the one the assist goes for: among those in the aim's cell (cellOf the place of each; an empty cell never
// matches), the nearest to `ref` (the aim's point, or where the shot leaves)
export function assistPick<T extends { x: number; y: number }>(list: readonly T[], cell: string, cellOf: (o: T) => string, ref: { x: number; y: number }): T | null {
  if (!cell) return null
  let best: T | null = null, bestD = Infinity
  for (const o of list) {
    if (cellOf(o) !== cell) continue
    const d = Math.hypot(o.x - ref.x, o.y - ref.y)
    if (d < bestD) { bestD = d; best = o }
  }
  return best
}

// ---------- Bullet Magnetism ----------
// An alien variation's "Bullet Magnetism" (lib/pigchicken/alien-catalog.ts, 0 to 1 here): it bends toward itself
// what the players shoot and rebate. Below 1 the pull reaches m × MAGNET_REACH px and is stronger the closer it
// passes (turning at most m × MAGNET_TURN rad/s, right at it); at 1 it reaches everything and turns it straight at
// itself. The one that pulls is the one at 1 nearest it, else the strongest pull there.
export const MAGNET_REACH = 1600
export const MAGNET_TURN = 10
export type Magnet = { x: number; y: number; m: number }

export function magnetAt<T extends Magnet>(list: readonly T[], x: number, y: number): { magnet: T; pull: number } | null {
  let full: T | null = null, fullD = Infinity, best: T | null = null, bestPull = 0
  for (const g of list) {
    if (!(g.m > 0)) continue
    const d = Math.hypot(g.x - x, g.y - y)
    if (g.m >= 1) { if (d < fullD) { fullD = d; full = g } continue }
    const pull = g.m * (1 - d / (g.m * MAGNET_REACH))
    if (pull > bestPull) { bestPull = pull; best = g }
  }
  if (full) return { magnet: full, pull: 1 }
  return best ? { magnet: best, pull: bestPull } : null
}

// the velocity bent toward the magnet over dt (its speed kept)
export function magnetSteer(vx: number, vy: number, x: number, y: number, list: readonly Magnet[], dt: number): { vx: number; vy: number } | null {
  const at = magnetAt(list, x, y)
  if (!at) return null
  const speed = Math.hypot(vx, vy)
  if (speed < 1e-6) return null
  const a = Math.atan2(vy, vx), to = Math.atan2(at.magnet.y - y, at.magnet.x - x)
  const diff = turnTo(a, to), max = at.pull >= 1 ? Math.PI : MAGNET_TURN * at.pull * dt
  const na = a + Math.max(-max, Math.min(max, diff))
  return { vx: Math.cos(na) * speed, vy: Math.sin(na) * speed }
}
