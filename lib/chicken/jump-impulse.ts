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
