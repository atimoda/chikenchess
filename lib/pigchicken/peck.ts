// Shared timing/pose for the beak strike. Distances are screen pixels, angles screen radians.
export type Peck = { angle: number; pull: number; reach: number; t: number; time: number; hit: boolean }
export type PeckPose = { angle: number; pull: number; reach: number; thrust: number }
export const PECK_CONTACT = 0.28
export function peckPose(p: Peck): PeckPose {
  const t = Math.min(1, p.t / p.time)
  const thrust = t < PECK_CONTACT ? t / PECK_CONTACT : (1 - t) / (1 - PECK_CONTACT)
  return { angle: p.angle, pull: p.pull * (1 - t), reach: p.reach, thrust: Math.max(0, thrust) }
}
