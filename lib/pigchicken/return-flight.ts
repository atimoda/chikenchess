// The curve of a staff thrown that comes back (Martelo de Thor): how much its path bends, and to which side, from
// where its owner aims while it flies. Pure: the combat flies it (lib/pigchicken/combat.ts).
//
// A side is the way the path turns (1: its angle grows, -1: it falls). On the way out it is the staff's heading that
// turns; on the way back it is the line from its owner to it that swings the same way, so the two legs make a loop.

const DEG = Math.PI / 180
// the aim this far from where it was thrown to bends the path the most
export const CURVE_FULL = 35 * DEG
// closer than this the aim does not choose a side: the path keeps the side it had
export const CURVE_DEAD = 4 * DEG
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

/** the side a throw turns to before its owner steers it: out over the line she aims along, back under it */
export const curveSide = (launch: number) => (Math.cos(launch) >= 0 ? 1 : -1)
/**
 * Where it heads as it leaves her wing: half of its least bend away from where she aims, so that with nobody steering
 * its way out ends on the line she aimed along.
 */
export const launchDir = (launch: number, min: number) => launch - curveSide(launch) * Math.max(0, min) * DEG * 0.5

/**
 * How much the path bends right now (radians over a whole leg, never less than `min` nor more than `max` degrees)
 * and to which side: the side its owner turned the aim to since the throw, the more the further she turned it.
 * `off`: the aim now less where it was thrown to; `side`: the side it bent to until now.
 */
export function steerCurve(off: number, side: number, min: number, max: number) {
  const d = wrap(off), lo = Math.max(0, min) * DEG, hi = Math.max(lo, max * DEG)
  const to = Math.abs(d) < CURVE_DEAD ? side : Math.sign(d)
  return { side: to, curve: Math.max(lo, hi * Math.max(0, Math.min(1, (Math.abs(d) - CURVE_DEAD) / (CURVE_FULL - CURVE_DEAD)))) }
}

/**
 * The way out with nobody steering: points every `stride` px from (x, y), `reach` px long, bending `min` degrees in
 * all to its first side and ending on the line of `launch`.
 */
export function outPath(x: number, y: number, launch: number, reach: number, min: number, stride = 12) {
  const points = [{ x, y }], turn = reach > 0 ? (curveSide(launch) * Math.max(0, min) * DEG) / reach : 0
  let dir = launchDir(launch, min)
  for (let r = 0; r < reach - 1e-6; r += stride) {
    const s = Math.min(stride, reach - r)
    // half the turn before the step and half after: the points stay on the arc
    dir += turn * s * 0.5; x += Math.cos(dir) * s; y += Math.sin(dir) * s; dir += turn * s * 0.5
    points.push({ x, y })
  }
  return points
}
