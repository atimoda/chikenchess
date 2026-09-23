import { Camera, Vector3 } from 'three'
import { cityDirection } from './globe-navigation'

function segment(out: number[], from: Vector3, to: Vector3, radius: number) {
  const steps = Math.max(1, Math.ceil(from.angleTo(to) / .04))
  let previous = from
  for (let i = 1; i <= steps; i++) {
    const next = from.clone().lerp(to, i / steps).normalize().multiplyScalar(radius)
    out.push(...previous.toArray(), ...next.toArray())
    previous = next
  }
}

// The local Natural Earth SVG contains only M/L paths. Convert its vector
// coordinates directly to globe lines, avoiding raster texture enlargement.
export function coastlineSegments(svg: string, radius = 2.013) {
  const out: number[] = []
  for (const path of svg.matchAll(/<path\s+d="([^"]+)"/g)) {
    let previous: Vector3 | undefined
    for (const point of path[1].matchAll(/([ML])([\d.-]+),([\d.-]+)/g)) {
      const next = cityDirection(90 - Number(point[3]) / 1024 * 180, Number(point[2]) / 2048 * 360 - 180, radius)
      if (point[1] === 'L' && previous) segment(out, previous, next, radius)
      previous = next
    }
  }
  return new Float32Array(out)
}

export function globeGridSegments(radius = 2.008) {
  const out: number[] = []
  for (let lat = -75; lat <= 75; lat += 15) for (let lng = -180; lng < 180; lng += 3) {
    segment(out, cityDirection(lat, lng, radius), cityDirection(lat, lng + 3, radius), radius)
  }
  for (let lng = -180; lng < 180; lng += 15) for (let lat = -90; lat < 90; lat += 3) {
    segment(out, cityDirection(lat, lng, radius), cityDirection(lat + 3, lng, radius), radius)
  }
  return new Float32Array(out)
}

export function pinIsBehindGlobe(pin: Vector3, camera: Vector3) {
  return pin.dot(camera) <= pin.lengthSq()
}

/** Keeps a popup's nearest edge within maxGap pixels of the globe silhouette. */
export function clampPopupToGlobe(
  position: { x: number; y: number },
  popup: { width: number; height: number },
  globe: { x: number; y: number; radius: number },
  maxGap = 50,
) {
  const nearestX = Math.max(position.x, Math.min(globe.x, position.x + popup.width))
  const nearestY = Math.max(position.y, Math.min(globe.y, position.y + popup.height))
  const dx = nearestX - globe.x
  const dy = nearestY - globe.y
  const distance = Math.hypot(dx, dy)
  const limit = globe.radius + maxGap
  if (distance <= limit || distance === 0) return position
  const correction = (distance - limit) / distance
  return { x: position.x - dx * correction, y: position.y - dy * correction }
}

/** Returns the sphere's silhouette point closest to a pin's projected direction. */
export function nearestGlobeSilhouettePoint(
  center: Vector3,
  pin: Vector3,
  camera: Camera,
  radius: number,
  viewport: { width: number; height: number },
) {
  const cameraPosition = new Vector3().setFromMatrixPosition(camera.matrixWorld)
  const toCamera = cameraPosition.sub(center)
  const distance = toCamera.length()
  if (distance <= radius) return null

  const projectedCenter = center.clone().project(camera)
  const projectedPin = pin.clone().project(camera)
  const screenX = (projectedPin.x - projectedCenter.x) * viewport.width
  const screenY = (projectedPin.y - projectedCenter.y) * viewport.height
  const cameraRight = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
  const cameraUp = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
  const screenDirection = cameraRight.multiplyScalar(screenX).add(cameraUp.multiplyScalar(screenY))
  if (screenDirection.lengthSq() < 1e-12) screenDirection.copy(cameraRight)
  screenDirection.normalize()

  const towardCamera = toCamera.normalize()
  return center.clone()
    .addScaledVector(towardCamera, radius * radius / distance)
    .addScaledVector(screenDirection, radius * Math.sqrt(1 - radius * radius / (distance * distance)))
}
