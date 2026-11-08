// Keep the movement angle, choosing a force on the ellipse defined by the axis limits.
// Screen coordinates: negative y is up. Neutral movement adds no extra impulse.
export function directionalJumpImpulse(direction: { x: number; y: number }, horizontal: number, vertical: number) {
  const length = Math.hypot(direction.x, direction.y)
  if (length <= 0.0001) return { x: 0, y: 0 }
  const x = direction.x / length
  const y = direction.y / length
  if ((horizontal <= 0 && Math.abs(x) > 0.0001) || (vertical <= 0 && Math.abs(y) > 0.0001)) return { x: 0, y: 0 }
  const inverseForce = Math.hypot(horizontal > 0 ? x / horizontal : 0, vertical > 0 ? y / vertical : 0)
  if (inverseForce === 0) return { x: 0, y: 0 }
  const force = Math.min(1, length) / inverseForce
  return { x: x * force, y: y * force }
}

/** A quick release starts at 2×; the configured maximum is reached linearly. */
export function shockingAirMultiplier(elapsed: number, duration: number, maximum: number) {
  const progress = Math.max(0, Math.min(1, elapsed / Math.max(0.1, duration)))
  return 2 + (maximum - 2) * progress
}

/** Called only during an airborne hold; the threshold affects velocity once. */
export function advanceShockingAirCharge(elapsed: number, applied: boolean, dt: number, duration: number, verticalMultiplier: number) {
  const next = elapsed + Math.max(0, dt)
  const crossed = !applied && next >= Math.max(0.1, duration)
  return { elapsed: next, applied: applied || crossed, velocityMultiplier: crossed ? verticalMultiplier : 1 }
}
