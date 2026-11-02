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

test('vertical camera: still on a tall screen, follows her on a short one', () => {
  // desktop 963 px tall, ground strip 30 px: the whole world fits, the camera never moves
  const tall = world.cameraYRange(933)
  assert.equal(tall.hi, tall.lo)
  assert.equal(world.cameraYStep(tall.lo, { worldY: 300, groundScreen: 933, viewTop: 65, dt: 1, lag: 6 }), tall.lo)
  // phone held upright: ground kept 578 px from the top; jumping high raises the camera, but never past the world's top
  const short = world.cameraYRange(578)
  assert.ok(short.hi > short.lo)
  const up = world.cameraYStep(short.lo, { worldY: 300, groundScreen: 578, viewTop: 65, dt: 1, lag: 6 })
  assert.ok(up > short.lo && up <= short.hi)
  // standing on the ground: the ground stays at its place
  assert.equal(world.cameraYStep(short.lo, { worldY: world.WORLD_GROUND_Y, groundScreen: 578, viewTop: 65, dt: 1, lag: 6 }), short.lo)
})
