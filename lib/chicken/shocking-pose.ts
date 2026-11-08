/** Authored joint angles, in degrees relative to each parent bone. */
export function shockingAirLegPose(elapsed: number, duration: number, maximumBend: number, released: boolean) {
  if (released) return { front: { leg: -80, tib: 0, shin: 0 }, back: { leg: 80, tib: 0, shin: 0 } }
  const progress = Math.max(0, Math.min(1, elapsed / Math.max(.1, duration)))
  const bend = Math.max(0, maximumBend) * (.5 + .5 * progress)
  const spread = bend * .5
  return { front: { leg: -spread, tib: bend, shin: -bend * .5 }, back: { leg: spread, tib: -bend, shin: bend * .5 } }
}
