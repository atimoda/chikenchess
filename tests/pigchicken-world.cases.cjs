const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const world = loadTs('lib/pigchicken/world.ts')

test('the world is the same on every screen: platforms are in fixed units', () => {
  const a = world.worldPlatforms(4)
  assert.equal(a.length, 18)
  // nothing in the layout depends on the screen; the first shelf keeps its desktop size
  assert.deepEqual(a[0], { id: 'pq0-0', x: 154, y: world.WORLD_GROUND_Y - 307 - 29, w: 1651, h: 29 })
  assert.equal(world.SHELF_TOP, a[0].y)
  a.forEach(p => assert.ok(p.y + p.h <= world.WORLD_GROUND_Y && p.y >= 0, p.id))
  assert.equal(world.sceneAt(1919), 0); assert.equal(world.sceneAt(1920), 1)
})

test('vertical camera: still on a tall screen on the ground floor, rises with her above y = 500 up to 3000 px higher', () => {
  // desktop 963 px tall, ground strip 30 px: the ground floor fits, the camera stays while she is below y = 500
  const tall = world.cameraYRange(933)
  assert.equal(tall.hi - tall.lo, world.WORLD_GROUND_Y - world.WORLD_TOP)
  assert.equal(world.WORLD_TOP, -3000)
  assert.equal(world.cameraYStep(tall.lo, { worldY: 600, groundScreen: 933, viewTop: 65, dt: 1, lag: 6 }), tall.lo)
  // above y = 500 the camera keeps her where y = 500 was
  assert.equal(world.cameraYStep(tall.lo, { worldY: 300, groundScreen: 933, viewTop: 65, dt: 1, lag: 6 }), tall.lo + 200)
  // never past the world's top: it stops once the ceiling reaches the header's bottom
  const capped = world.cameraYRange(933, world.WORLD_TOP, 65)
  assert.equal(capped.hi + world.WORLD_TOP, 65)
  assert.equal(world.cameraYStep(tall.lo, { worldY: -5000, groundScreen: 933, viewTop: 65, dt: 1, lag: 6 }), capped.hi)
  // phone held upright: ground kept 578 px from the top; jumping high raises the camera, but never past the world's top
  const short = world.cameraYRange(578)
  assert.ok(short.hi > short.lo)
  const up = world.cameraYStep(short.lo, { worldY: 600, groundScreen: 578, viewTop: 65, dt: 1, lag: 6 })
  assert.ok(up > short.lo && up <= short.hi)
  // standing on the ground: the ground stays at its place
  assert.equal(world.cameraYStep(short.lo, { worldY: world.WORLD_GROUND_Y, groundScreen: 578, viewTop: 65, dt: 1, lag: 6 }), short.lo)
})

test('vertical camera follows the Pátio height limit', () => {
  // a 1500-unit Pátio: the ceiling is at y = -570; the camera stops with it under the header
  const top = world.WORLD_GROUND_Y - 1500
  const r = world.cameraYRange(933, top, 65)
  assert.equal(r.hi + top, 65)
  assert.equal(world.cameraYStep(r.lo, { worldY: -5000, groundScreen: 933, viewTop: 65, dt: 1, lag: 6, top }), r.hi)
  // lower than the screen: the camera never rises
  const low = world.cameraYRange(933, world.WORLD_GROUND_Y - 600, 65)
  assert.equal(low.hi, low.lo)
  const settings = loadTs('lib/pigchicken/patio-settings.ts')
  assert.equal(settings.patioWorldTop(undefined), world.WORLD_TOP)
  assert.equal(settings.patioWorldTop({ height: 1500 }), top)
  assert.deepEqual(settings.normalizePatioSettings({ screens: 12, height: 50 }), { screens: 8, height: 400 })
  assert.equal(settings.normalizePatioSettings({}), undefined)
  assert.equal(settings.patioScreens(undefined, 6), 6)
  assert.equal(settings.patioScreens({ screens: 2 }, 6), 2)
})

test('follow camera looks ahead to the side she faces, and slides over when she turns', () => {
  const camera = loadTs('lib/pigchicken/camera.ts')
  const base = { mode: 'follow', viewW: 1000, worldW: 8000, dt: 1, deadband: 0, lag: 60 }
  // she is at x 3000: centred with no lead, 200 px left of the centre with a lead of 200 to the right
  assert.equal(camera.cameraStep(2500, { ...base, worldX: 3000 }), 2500)
  assert.equal(camera.cameraStep(2500, { ...base, worldX: 3000, lead: 200 }), 2700)
  assert.equal(camera.cameraStep(2500, { ...base, worldX: 3000, lead: -200 }), 2300)
  // the lead eases toward the side she faces, never past it
  let lead = 200
  lead = camera.leadStep(lead, -1, 200, 2, 0.1)
  assert.ok(lead < 200 && lead > -200)
  for (let i = 0; i < 200; i++) lead = camera.leadStep(lead, -1, 200, 2, 0.1)
  assert.equal(lead, -200)
  assert.equal(camera.leadStep(0, 1, 0, 2, 0.1), 0)
})

test('zoomed follow keeps the player visible and its crop inside the world', () => {
  const { cameraStep, cameraXRange } = loadTs('lib/pigchicken/camera.ts')
  const viewW = 1000, worldW = 8000, zoom = 2.5
  const range = cameraXRange(viewW, worldW, zoom)
  assert.equal((range.lo + viewW / 2) - viewW / (2 * zoom), 0)
  assert.equal((range.hi + viewW / 2) + viewW / (2 * zoom), worldW)
  for (const worldX of [40, 1800, 4000, 7960]) {
    const cam = cameraStep(0, { mode: 'follow', worldX, viewW, worldW, zoom, dt: 1 / 60, deadband: 180, lag: 2, lead: 200 })
    const screenX = viewW / 2 + (worldX - cam - viewW / 2) * zoom
    assert.ok(screenX >= 0 && screenX <= viewW, `player ${worldX} is visible at ${screenX}`)
    assert.ok(cam >= range.lo && cam <= range.hi)
  }
})
