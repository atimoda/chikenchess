import { Vector3 } from 'three'
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
