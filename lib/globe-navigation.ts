import { MathUtils, Quaternion, Vector3 } from 'three'

/** Counter-move a screen-space popup so its net idle travel is one third of its pin. */
export function popupStandbyCompensation(anchorDelta: number) {
  return anchorDelta * -2 / 3
}

export function cityDirection(lat: number, lng: number, radius = 2) {
  const phi = MathUtils.degToRad(90 - lat), theta = MathUtils.degToRad(lng + 180)
  return new Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta))
}

/** Camera distance from a sphere's center at which it covers the whole viewport, corners included. */
export function sphereFillDistance(radius: number, fovDegrees: number, aspect: number, margin = .9) {
  const halfDiagonal = Math.atan(Math.tan(MathUtils.degToRad(fovDegrees) / 2) * Math.hypot(1, aspect))
  return radius * margin / Math.sin(halfDiagonal)
}

/** Travel around the surface, then dive towards the pin until `endGap` above it, including a rotated globe. */
export function cityFlightPose(from: Vector3, up: Vector3, pin: Vector3, progress: number, endGap = .25) {
  const t = Math.max(0, Math.min(1, progress))
  const eased = t * t * (3 - 2 * t)
  const rotation = new Quaternion().setFromUnitVectors(from.clone().normalize(), pin.clone().normalize())
  const turn = new Quaternion().slerp(rotation, eased)
  // Blend linear and geometric approach so the final dive keeps a steady
  // apparent zoom instead of collapsing into the last frames.
  const fromGap = Math.max(endGap, from.length() - pin.length())
  const gap = MathUtils.lerp(MathUtils.lerp(fromGap, endGap, eased), fromGap * (endGap / fromGap) ** eased, eased)
  return {
    position: from.clone().normalize().applyQuaternion(turn).multiplyScalar(pin.length() + gap),
    up: up.clone().applyQuaternion(turn),
  }
}
