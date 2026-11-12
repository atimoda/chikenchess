const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('../helpers/music.cjs')

test('city flight dives until the pin core fills the viewport, even from the opposite side', () => {
  const { Vector3, Quaternion } = require('three')
  const { cityDirection, cityFlightPose, sphereFillDistance } = loadTs('lib/globe-navigation.ts')
  const pin = cityDirection(51.23, 6.78).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 1.5))
  const from = pin.clone().normalize().multiplyScalar(-6)
  for (const aspect of [16 / 9, 9 / 19.5]) {
    const endGap = sphereFillDistance(.04, 45, aspect)
    // The sphere's silhouette must reach past the viewport's corner.
    const halfDiagonal = Math.atan(Math.tan(Math.PI / 8) * Math.hypot(1, aspect))
    assert.ok(Math.asin(.04 / endGap) > halfDiagonal)
    let previousGap = Infinity
    for (const progress of [0, .25, .5, .75, .9, 1]) {
      const pose = cityFlightPose(from, new Vector3(0, 1, 0), pin, progress, endGap)
      const gap = pose.position.length() - 2
      assert.ok(gap >= endGap - 1e-8 && gap <= previousGap + 1e-8)
      assert.ok(pose.position.toArray().every(Number.isFinite))
      previousGap = gap
    }
    const end = cityFlightPose(from, new Vector3(0, 1, 0), pin, 1, endGap)
    assert.ok(end.position.clone().normalize().distanceTo(pin.clone().normalize()) < 1e-8)
    assert.ok(Math.abs(end.position.length() - 2 - endGap) < 1e-8)
  }
})

test('vector coastlines and grid dots remain above the sphere', () => {
  const { coastlineSegments, globeGridPoints, pinIsBehindGlobe } = loadTs('lib/globe-geography.ts')
  const { pinGridCells } = loadTs('lib/globe-pin-grid.ts')
  const { Vector3 } = require('three')
  assert.equal(coastlineSegments('<path d="M0,512 M1024,512"/>').length, 0)
  const coastline = coastlineSegments(fs.readFileSync(path.resolve('public/world_map_contours.svg'), 'utf8'))
  const dots = globeGridPoints()
  assert.ok(coastline.length > 1000 && coastline.length < 150000)
  assert.equal(dots.length, pinGridCells().length * 3)
  for (let i = 0; i < coastline.length; i += 6) {
    const a = new Vector3(...coastline.slice(i, i + 3)), b = new Vector3(...coastline.slice(i + 3, i + 6))
    assert.ok(a.add(b).multiplyScalar(.5).length() > 2)
  }
  for (let i = 0; i < dots.length; i += 3) assert.ok(Math.abs(new Vector3(...dots.slice(i, i + 3)).length() - 2.008) < 1e-5)
  assert.equal(pinIsBehindGlobe(new Vector3(0, 0, 2), new Vector3(0, 0, 5)), false)
  assert.equal(pinIsBehindGlobe(new Vector3(0, 0, -2), new Vector3(0, 0, 5)), true)
  assert.equal(pinIsBehindGlobe(new Vector3(2, 0, 0), new Vector3(0, 0, 5)), true)
})

test('pin grid has 33% more rows and equatorial columns with fewer columns near the poles', () => {
  const { pinGridCells, pinGridColumnCount, PIN_GRID_LATITUDE_ROWS, PIN_GRID_EQUATOR_COLUMNS } = loadTs('lib/globe-pin-grid.ts')
  const cells = pinGridCells()
  const latitudes = new Set(cells.map(cell => cell.lat))
  assert.equal(PIN_GRID_LATITUDE_ROWS, 48)
  assert.equal(PIN_GRID_EQUATOR_COLUMNS, 96)
  assert.equal(latitudes.size, PIN_GRID_LATITUDE_ROWS)
  assert.equal(pinGridColumnCount(0), PIN_GRID_EQUATOR_COLUMNS)
  assert.ok(pinGridColumnCount(86.25) < pinGridColumnCount(51.5))
  assert.equal(new Set(cells.map(cell => `${cell.lat}:${cell.lng}`)).size, cells.length)
})

test('nearby locations take separate grid dots while eras keep one pin', () => {
  const { placePinsOnGrid, pinGridCells } = loadTs('lib/globe-pin-grid.ts')
  const exact = { lat: 51.5, lng: -0.1 }
  const assigned = placePinsOnGrid([
    { id: 'first', geoCoordinates: exact },
    { id: 'era', geoCoordinates: exact },
    { id: 'neighbor', geoCoordinates: { lat: 51.6, lng: -0.2 } },
  ])
  const cellKeys = new Set(pinGridCells().map(cell => `${cell.lat}:${cell.lng}`))
  assert.deepEqual(assigned.first, assigned.era)
  assert.notDeepEqual(assigned.first, assigned.neighbor)
  for (const point of Object.values(assigned)) assert.ok(cellKeys.has(`${point.lat}:${point.lng}`))

  const { cities } = loadTs('lib/cities-data.ts')
  const locations = new Set(cities.map(city => `${city.geoCoordinates.lat}:${city.geoCoordinates.lng}`))
  const pins = new Set(cities.map(city => `${city.pinCoordinates.lat}:${city.pinCoordinates.lng}`))
  assert.equal(locations.size, 50)
  assert.equal(pins.size, locations.size)
})

test('two-finger screen rotation projects globe landmarks in the same direction', () => {
 const THREE=require('three')
 for(const gesture of [-Math.PI/6,Math.PI/6]){
  const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld()
  const marker=new THREE.Vector3(1,0,0),before=marker.clone().project(camera)
  camera.up.applyAxisAngle(camera.position.clone().normalize(),gesture);camera.lookAt(0,0,0);camera.updateMatrixWorld()
  const after=marker.clone().project(camera),screenDelta=Math.atan2(-after.y,after.x)-Math.atan2(-before.y,before.x)
  assert.ok(Math.abs(screenDelta-gesture)<1e-8)
 }
})

test('standby popup travels one third of its pin while globe speed stays unchanged', () => {
  const { popupStandbyCompensation } = loadTs('lib/globe-navigation.ts')
  const pinTravel = 12
  assert.equal(pinTravel + popupStandbyCompensation(pinTravel), 4)
})

test('popup stays at most 50 pixels beyond the globe circumference', () => {
  const { clampPopupToGlobe } = loadTs('lib/globe-geography.ts')
  const circle = { x: 400, y: 300, radius: 200 }
  const panel = { width: 288, height: 450 }
  const outside = clampPopupToGlobe({ x: 700, y: 100 }, panel, circle)
  const closestX = Math.max(outside.x, Math.min(circle.x, outside.x + panel.width))
  const closestY = Math.max(outside.y, Math.min(circle.y, outside.y + panel.height))
  assert.ok(Math.abs(Math.hypot(closestX - circle.x, closestY - circle.y) - 250) < 1e-8)
  assert.deepEqual(clampPopupToGlobe({ x: 500, y: 200 }, panel, circle), { x: 500, y: 200 })
})

test('constrainPopupPosition adapts limits when viewport and globe circle resize', () => {
  const { constrainPopupPosition } = loadTs('lib/globe-geography.ts')
  const panel = { width: 288, height: 450 }

  // Initial large desktop viewport: 1280x800, globe centered at (640, 400) radius 240
  const largeCircle = { x: 640, y: 400, radius: 240 }
  const largeViewport = { left: 0, top: 0, right: 1280, bottom: 800 }

  // Placed at x=800 (fits in large viewport and near globe edge)
  const posInLarge = constrainPopupPosition({ x: 800, y: 300 }, panel, largeCircle, largeViewport)
  assert.equal(posInLarge.x, 800)

  // Resized smaller viewport: 700x600, globe centered at (350, 300) radius 160
  const smallCircle = { x: 350, y: 300, radius: 160 }
  const smallViewport = { left: 0, top: 0, right: 700, bottom: 600 }

  // Same requested x=800 now exceeds new viewport and resized globe limit
  const posInSmall = constrainPopupPosition({ x: 800, y: 300 }, panel, smallCircle, smallViewport)
  // Must be clamped to the new resized viewport boundary with 12px padding
  assert.equal(posInSmall.x, smallViewport.right - panel.width - 12)
})

test('constrainPopupPosition allows free movement across widescreen without globe tethering', () => {
  const { constrainPopupPosition } = loadTs('lib/globe-geography.ts')
  const panel = { width: 288, height: 450 }
  const widescreen = { left: 0, top: 0, right: 1920, bottom: 1080 }
  const globe = { x: 960, y: 540, radius: 260 }

  // Positioned far to the right, far beyond globe.radius + 50
  const farRight = constrainPopupPosition({ x: 1600, y: 200 }, panel, globe, widescreen)
  assert.equal(farRight.x, 1600)
  assert.equal(farRight.y, 200)

  // Positioned far to the left
  const farLeft = constrainPopupPosition({ x: 30, y: 50 }, panel, globe, widescreen)
  assert.equal(farLeft.x, 30)
  assert.equal(farLeft.y, 50)

  // Dragged past right viewport boundary: clamped to viewport border with 12px padding
  const offRight = constrainPopupPosition({ x: 2000, y: 200 }, panel, globe, widescreen)
  assert.equal(offRight.x, widescreen.right - panel.width - 12)
  assert.equal(offRight.y, 200)
})
