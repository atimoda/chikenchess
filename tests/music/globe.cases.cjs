const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('../helpers/music.cjs')

test('city flight ends above the selected world pin, even from the opposite side', () => {
  const { Vector3, Quaternion } = require('three')
  const { cityDirection, cityFlightPose } = loadTs('lib/globe-navigation.ts')
  const pin = cityDirection(51.23, 6.78).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 1.5))
  const from = pin.clone().normalize().multiplyScalar(-6)
  for (const progress of [0, .25, .5, .75, 1]) {
    const pose = cityFlightPose(from, new Vector3(0, 1, 0), pin, progress)
    assert.ok(pose.position.length() >= 2.25 - 1e-8)
    assert.ok(pose.position.toArray().every(Number.isFinite))
  }
  const end = cityFlightPose(from, new Vector3(0, 1, 0), pin, 1)
  assert.ok(end.position.clone().normalize().distanceTo(pin.clone().normalize()) < 1e-8)
  assert.ok(Math.abs(end.position.length() - 2.25) < 1e-8)
})

test('vector coastlines and globe grid remain above the sphere without joining separate paths', () => {
  const { coastlineSegments, globeGridSegments, pinIsBehindGlobe } = loadTs('lib/globe-geography.ts')
  const { Vector3 } = require('three')
  assert.equal(coastlineSegments('<path d="M0,512 M1024,512"/>').length, 0)
  const coastline = coastlineSegments(fs.readFileSync(path.resolve('public/world_map_contours.svg'), 'utf8'))
  const grid = globeGridSegments()
  assert.ok(coastline.length > 1000 && coastline.length < 150000)
  for (const positions of [coastline, grid]) for (let i = 0; i < positions.length; i += 6) {
    const a = new Vector3(...positions.slice(i, i + 3)), b = new Vector3(...positions.slice(i + 3, i + 6))
    assert.ok(a.add(b).multiplyScalar(.5).length() > 2)
  }
  assert.equal(pinIsBehindGlobe(new Vector3(0, 0, 2), new Vector3(0, 0, 5)), false)
  assert.equal(pinIsBehindGlobe(new Vector3(0, 0, -2), new Vector3(0, 0, 5)), true)
  assert.equal(pinIsBehindGlobe(new Vector3(2, 0, 0), new Vector3(0, 0, 5)), true)
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
