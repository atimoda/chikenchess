import { MathUtils, Quaternion, Vector3 } from 'three'

export function cityDirection(lat: number, lng: number, radius = 2) {
  const phi = MathUtils.degToRad(90 - lat), theta = MathUtils.degToRad(lng + 180)
  return new Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta))
}

/** Travel around the surface, then towards the pin, including a rotated globe. */
export function cityFlightPose(from: Vector3, up: Vector3, pin: Vector3, progress: number) {
  const t = Math.max(0, Math.min(1, progress))
  const eased = t * t * (3 - 2 * t)
  const rotation = new Quaternion().setFromUnitVectors(from.clone().normalize(), pin.clone().normalize())
  const turn = new Quaternion().slerp(rotation, eased)
  return {
    position: from.clone().normalize().applyQuaternion(turn).multiplyScalar(MathUtils.lerp(from.length(), pin.length() + .25, eased)),
    up: up.clone().applyQuaternion(turn),
  }
}
