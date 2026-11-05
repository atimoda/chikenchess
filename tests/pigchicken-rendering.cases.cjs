const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { intersectsView, trajectoryVisible, needsTrajectory, patioPixelRatio } = loadTs('lib/pigchicken/viewport.ts')
const { chickenPlatformRects, setPlatformWorldOffset } = loadTs('lib/chicken/platform-geometry.ts')

test('render culling keeps viewport edges, crossing trails and overlapping explosions', () => {
  const view = { x: 7000, y: 200, w: 1024, h: 768 }
  assert.equal(intersectsView({ x: 8024, y: 250, w: 20, h: 20 }, view), true)
  assert.equal(intersectsView({ x: 8100, y: 250, w: 20, h: 20 }, view), false)
  assert.equal(intersectsView({ x: 8100, y: 250, w: 20, h: 20 }, view, 192), true)
  assert.equal(intersectsView({ x: 6800, y: 300, w: 400, h: 1 }, view), true)
  assert.equal(intersectsView({ x: 6800, y: 50, w: 400, h: 400 }, view), true)
  assert.equal(intersectsView({ x: 7200, y: -400, w: 100, h: 100 }, view), false)
})

test('optional trajectories wake for visible paths/landings and preserve the bow reload endpoint', () => {
  assert.equal(trajectoryVisible('off', true, true), false)
  assert.equal(trajectoryVisible('hold', false, true), false)
  assert.equal(trajectoryVisible('holdAim', false, true), true)
  assert.equal(trajectoryVisible('hold', true, false), true)
  assert.equal(trajectoryVisible('always', false, false), true)
  for (const kind of ['laser', 'bow', 'impact', 'grenade']) {
    assert.equal(needsTrajectory(kind, false, false, false), false, kind)
    assert.equal(needsTrajectory(kind, true, false, false), true, kind)
  }
  assert.equal(needsTrajectory('impact', false, true, false), true)
  assert.equal(needsTrajectory('grenade', false, true, false), true)
  assert.equal(needsTrajectory('laser', false, true, false), false)
  assert.equal(needsTrajectory('bow', false, false, true), true)
  assert.equal(needsTrajectory('impact', false, false, true), false)
})

test('canvas budget limits touch/lite devices while retaining the desktop DPR cap', () => {
  assert.equal(patioPixelRatio(2, true), 1)
  assert.equal(patioPixelRatio(3, false), 2)
  assert.equal(patioPixelRatio(1.5, false), 1.5)
})

test('local chickens share native measurements per frame; world boxes follow camera without DOM reads', () => {
  const old = global.document
  const world = {}, reads = { native: 0, world: 0 }
  const native = { isConnected: true, dataset: {}, getBoundingClientRect() { reads.native++; return { left: 10, top: 20, right: 110, bottom: 50, width: 100, height: 30 } } }
  const platform = { isConnected: true, dataset: { chickenWorldBox: '7300,500,300,40' }, closest: () => world, getBoundingClientRect() { reads.world++; throw Error('world bounds must not require layout') } }
  global.document = { querySelectorAll: () => [native, platform] }
  try {
    setPlatformWorldOffset(world, -7000, -192)
    const a = chickenPlatformRects(10000), b = chickenPlatformRects(10000)
    assert.equal(a, b)
    assert.deepEqual(a[1].rect, { left: 300, top: 308, right: 600, bottom: 348, width: 300, height: 40 })
    assert.deepEqual(reads, { native: 1, world: 0 })
    chickenPlatformRects(10016)
    assert.equal(reads.native, 2)
    // A camera change during the same animation frame invalidates the snapshot.
    setPlatformWorldOffset(world, -7100, -292)
    assert.equal(chickenPlatformRects(10016)[1].rect.left, 200)
    assert.equal(chickenPlatformRects(10016)[1].rect.top, 208)
    platform.dataset.chickenWorldBox = '7400,550,200,60'
    const edited = chickenPlatformRects(10032)[1].rect
    assert.equal(edited.left, 300); assert.equal(edited.top, 258); assert.equal(edited.width, 200)
    assert.equal(reads.world, 0)
    platform.isConnected = false
    assert.equal(chickenPlatformRects(10048).length, 1)
  } finally { global.document = old }
})

test('scenery visibility uses camera/parallax bounds, wakes on return/resize, and unregisters cleanly', () => {
  const { watchCameraRegion, moveLiveCamera, followParallax } = loadTs('lib/pigchicken/live-camera.ts')
  const old = global.window, listeners = new Map()
  global.window = { innerWidth: 1024, innerHeight: 768, addEventListener: (k, f) => listeners.set(k, f), removeEventListener: k => listeners.delete(k) }
  const node = () => ({ attrs: {}, style: {}, getAttribute(k) { return this.attrs[k] }, setAttribute(k, v) { this.attrs[k] = v } })
  const tree = node(), cloud = node(), layer = node()
  let stopTree, stopCloud, stopLayer
  try {
    stopTree = watchCameraRegion(tree, { x: 8000, y: 300, w: 300, h: 400 })
    assert.equal(tree.attrs['data-patio-visible'], 'false')
    moveLiveCamera(7000, 0)
    assert.equal(tree.attrs['data-patio-visible'], 'true')
    moveLiveCamera(7000, 2000)
    assert.equal(tree.attrs['data-patio-visible'], 'false')
    moveLiveCamera(7000, 0)
    stopCloud = watchCameraRegion(cloud, { x: 500, y: 100, w: 300, h: 100 }, .9)
    assert.equal(cloud.attrs['data-patio-visible'], 'true')
    stopLayer = followParallax(layer, .9)
    assert.equal(layer.style.transform, 'translate(6300px, 0px)')
    moveLiveCamera(6800, 0)
    assert.equal(tree.attrs['data-patio-visible'], 'true') // 192px prefetch margin
    global.window.innerWidth = 400
    listeners.get('resize')()
    assert.equal(tree.attrs['data-patio-visible'], 'false')
    moveLiveCamera(0, 0)
    assert.equal(tree.attrs['data-patio-visible'], 'false')
  } finally {
    stopTree?.(); stopCloud?.(); stopLayer?.()
    assert.equal(listeners.size, 0)
    global.window = old
  }
})
