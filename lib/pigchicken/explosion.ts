// Shared radial blast physics. Coordinates and speed are world px and px/s.
export type BlastBox = { l: number; r: number; t: number; b: number }
export function explosionImpulse(x: number, y: number, radius: number, strength: number, box: BlastBox) {
  if (radius <= 0 || strength <= 0) return null
  const nearX = Math.max(box.l, Math.min(box.r, x)), nearY = Math.max(box.t, Math.min(box.b, y))
  const distance = Math.hypot(nearX - x, nearY - y)
  if (distance >= radius) return null
  const dx = (box.l + box.r) / 2 - x, dy = (box.t + box.b) / 2 - y
  const length = Math.hypot(dx, dy), force = strength * (1 - distance / radius)
  return length > 0.001 ? { x: dx / length * force, y: dy / length * force } : { x: 0, y: -force }
}

// NPCs keep their normal AI/formation underneath a temporary ballistic displacement.
export type BlastMotion = { x: number; y: number; vx: number; vy: number }
export function stepBlastMotion(m: BlastMotion, dt: number) {
  m.x += m.vx * dt; m.y += m.vy * dt
  m.vx *= Math.exp(-3 * dt)
  if (m.y < 0 || m.vy < 0) m.vy += 1800 * dt
  else { m.y *= Math.exp(-8 * dt); m.vy *= Math.exp(-8 * dt) }
  if (m.y >= 0 && m.vy > 0) { m.y = 0; m.vy = 0 }
  if (Math.abs(m.vx) < 20) m.x *= Math.exp(-2 * dt)
}
