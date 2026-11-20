const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { intersectsView, trajectoryVisible, needsTrajectory, patioPixelRatio, zoomedView } = loadTs('lib/pigchicken/viewport.ts')
const { chickenPlatformLines, chickenPlatformRects, setPlatformWorldOffset } = loadTs('lib/chicken/platform-geometry.ts')
const { createFrameGate } = loadTs('lib/game-frame.ts')
const { createCollisionOcclusion } = loadTs('lib/chicken/collision-occlusion.ts')
const { createSceneryWind } = loadTs('lib/pigchicken/scenery-wind.ts')

test('wind composes signed gusts by area, expires and cancels without a per-frame loop', () => {
  const timers = new Map(), nearby = [], distant = []
  const wind = createSceneryWind((callback, ms) => {
    const id = Symbol()
    timers.set(id, { callback, ms })
    return id
  }, id => timers.delete(id))
  wind.watch(100, value => nearby.push(value))
  const stopWatching = wind.watch(900, value => distant.push(value))
  const cancel = wind.gust({ strength: 6, durationMs: 850, fromX: 0, toX: 400 })
  assert.equal(nearby.at(-1), 6)
  assert.equal(distant.at(-1), 0)
  wind.gust({ strength: 5, durationMs: 50_000 })
  assert.equal(nearby.at(-1), 8)
  assert.equal(distant.at(-1), 5)
  assert.deepEqual([...timers.values()].map(t => t.ms), [850, 30_000])
  cancel()
  assert.equal(nearby.at(-1), 5)
  wind.gust({ strength: -3, durationMs: 400, fromX: 80, toX: 120 })
  assert.equal(nearby.at(-1), 2)
  stopWatching()
  const size = distant.length
  ;[...timers.values()].at(-1).callback()
  assert.equal(nearby.at(-1), 5)
  wind.clear()
  assert.equal(nearby.at(-1), 0)
  assert.equal(distant.length, size)
  assert.equal(timers.size, 0)
})

test('collision occlusion cuts intersecting slopes and walls only behind the mask', () => {
  const { clip } = createCollisionOcclusion([{ depth: 5, polygon: [[20, 20], [80, 20], [80, 80], [20, 80]] }])
  const node = {}
  const slope = clip(node, 'slope', 4, 0, 100, 100, 0)
  assert.deepEqual(slope, [[0, .2], [.8, 1]])
  assert.equal(clip(node, 'slope', 4, 0, 100, 100, 0), slope)
  assert.deepEqual(clip(node, 'wall', 4, 50, 0, 50, 100), [[0, .2], [.8, 1]])
  assert.deepEqual(clip(node, 'covered', 4, 30, 50, 70, 50), [])
  assert.equal(clip(node, 'base', 4, 0, 80, 100, 80), null)
  assert.equal(clip(node, 'sky', 4, 0, 10, 100, 10), null)
  assert.equal(clip(node, 'slope', 5, 0, 100, 100, 0), null)
  assert.equal(clip(node, 'front', 6, 0, 100, 100, 0), null)
})

test('overlapping masks merge their cuts and keep visible gaps of concave shapes', () => {
  const { clip } = createCollisionOcclusion([
    { depth: 2, polygon: [[10, 10], [50, 10], [50, 40], [40, 40], [40, 20], [20, 20], [20, 40], [10, 40]] },
    { depth: 3, polygon: [[45, 15], [60, 15], [60, 40], [45, 40]] },
  ])
  assert.deepEqual(clip({}, 'floor', 1, 0, 30, 100, 30), [[0, .1], [.2, .4], [.6, 1]])
})

test('the shared FPS gate keeps native rates up to 240 Hz and caps higher rates', () => {
  const sample = (hz, limited) => {
    const gate = createFrameGate()
    let delivered = 0
    for (let i = 0; i < hz * 5; i++) {
      if (gate(Math.round(i * 10000 / hz) / 10, limited)) delivered++
    }
    return delivered / 5
  }
  for (const hz of [60, 120, 144, 240]) assert.equal(sample(hz, true), hz)
  for (const hz of [250, 360, 500]) assert.equal(sample(hz, true), 240)
  assert.equal(sample(360, false), 360)
  const gate = createFrameGate()
  assert.equal(gate(0, true), true)
  assert.equal(gate(1, true), false)
  assert.equal(gate(1, false), true)
  assert.equal(gate(2, true), true)
  assert.equal(gate(3000, true), true)
  assert.equal(gate(3001, true), false)
})

test('render culling keeps viewport edges, crossing trails and overlapping explosions', () => {
  const view = { x: 7000, y: 200, w: 1024, h: 768 }
  assert.equal(intersectsView({ x: 8024, y: 250, w: 20, h: 20 }, view), true)
  assert.equal(intersectsView({ x: 8100, y: 250, w: 20, h: 20 }, view), false)
  assert.equal(intersectsView({ x: 8100, y: 250, w: 20, h: 20 }, view, 192), true)
  assert.equal(intersectsView({ x: 6800, y: 300, w: 400, h: 1 }, view), true)
  assert.equal(intersectsView({ x: 6800, y: 50, w: 400, h: 400 }, view), true)
  assert.equal(intersectsView({ x: 7200, y: -400, w: 100, h: 100 }, view), false)
})

test('zoomed clipping maps to the full screen below the header and preserves newly visible objects', () => {
  const width = 1000, height = 800, top = 60
  for (const zoom of [0.5, 0.75, 1, 2.5]) {
    const view = zoomedView(width, height, zoom, top)
    const screenX = x => width / 2 + (x - width / 2) * zoom
    const screenY = y => height / 2 + (y - height / 2) * zoom
    assert.ok(Math.abs(screenX(view.x)) < 1e-9)
    assert.ok(Math.abs(screenX(view.x + view.w) - width) < 1e-9)
    assert.ok(Math.abs(screenY(view.y) - top) < 1e-9)
    assert.ok(Math.abs(screenY(view.y + view.h) - height) < 1e-9)
  }
  // A zombie at y=1000 and a projectile to the right were outside the old unzoomed rectangle,
  // but fit entirely on screen at 50%. Their lower parts must not be clipped or culled.
  const view = zoomedView(width, height, 0.5, top)
  assert.equal(intersectsView({ x: 450, y: 825, w: 90, h: 175 }, view), true)
  assert.ok(view.y + view.h >= 1000)
  assert.equal(intersectsView({ x: 1300, y: 400, w: 30, h: 30 }, view), true)
  assert.equal(intersectsView({ x: 1600, y: 400, w: 30, h: 30 }, view), false)
})

test('optional trajectories wake for visible paths/landings and preserve the bow reload endpoint', () => {
  assert.equal(trajectoryVisible('off', true, true), false)
  assert.equal(trajectoryVisible('hold', false, true), false)
  assert.equal(trajectoryVisible('holdAim', false, true), true)
  assert.equal(trajectoryVisible('hold', true, false), true)
  assert.equal(trajectoryVisible('always', false, false), true)
  for (const kind of ['laser', 'bow', 'impact', 'grenade']) {
    assert.equal(needsTrajectory(kind, false, false), false, kind)
    assert.equal(needsTrajectory(kind, true, false), true, kind)
  }
  assert.equal(needsTrajectory('impact', false, true), true)
  assert.equal(needsTrajectory('grenade', false, true), true)
  assert.equal(needsTrajectory('laser', false, true), false)
  assert.equal(needsTrajectory('bow', false, true), false)
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

test('editor overlays follow the camera again when the stage changes size with the camera still', () => {
  const { followCamera, moveLiveCamera } = loadTs('lib/pigchicken/live-camera.ts')
  const old = global.window, listeners = new Map()
  global.window = { innerWidth: 1000, innerHeight: 800, addEventListener: (k, f) => listeners.set(k, f), removeEventListener: k => listeners.delete(k) }
  const el = { style: {} }
  let stop
  try {
    moveLiveCamera(300, 50, 2)
    stop = followCamera(el)
    assert.equal(el.style.transform, 'translate3d(-1100px,-300px,0) scale(2)')
    global.window.innerWidth = 700 // the editor's dock takes 300px
    listeners.get('resize')()
    assert.equal(el.style.transform, 'translate3d(-950px,-300px,0) scale(2)')
  } finally {
    stop?.(); moveLiveCamera(0, 0, 1)
    assert.equal(listeners.size, 0)
    global.window = old
  }
})

test('layers that follow the camera are only slid at 100% zoom (no redraw per fraction of a pixel) and redrawn at other zooms', () => {
  const { followCamera, followParallax, followDepth, moveLiveCamera, worldTransform } = loadTs('lib/pigchicken/live-camera.ts')
  const old = global.window, listeners = new Map()
  global.window = { innerWidth: 1000, innerHeight: 800, addEventListener: (k, f) => listeners.set(k, f), removeEventListener: k => listeners.delete(k) }
  const front = { style: {} }, layer = { style: {} }, far = { style: {} }, flat = { style: {} }
  const stops = []
  try {
    stops.push(followCamera(front), followParallax(layer, 0.9), followDepth(far, 0.5), followDepth(flat, 0))
    moveLiveCamera(123.37, 4.21)
    // a 3D translate at zoom 1 too: the compositor slides the follower's layer, already painted
    assert.equal(front.style.transform, 'translate3d(-123.37px,4.21px,0)')
    assert.equal(worldTransform(123.37, 4.21, 1), front.style.transform)
    for (const el of [front, layer, far]) assert.equal(el.style.willChange, 'transform')
    assert.equal(flat.style.willChange, '', 'a layer that never moves keeps no hint')
    moveLiveCamera(130, 4.21, 1.5)
    assert.match(front.style.transform, /scale\(1\.5\)$/)
    for (const el of [front, layer, far]) assert.equal(el.style.willChange, '', 'another zoom: drawn again at its sharpness')
    moveLiveCamera(130, 4.21, 1)
    for (const el of [front, layer, far]) assert.equal(el.style.willChange, 'transform')
  } finally {
    stops.forEach(stop => stop()); moveLiveCamera(0, 0, 1)
    global.window = old
  }
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
    assert.equal(layer.style.transform, 'translate3d(6300px,0px,0)')
    // inside the zoomed world a parallax layer only gives back depth × the camera's travel, never a second zoom
    moveLiveCamera(7000, 100, 2)
    assert.equal(layer.style.transform, 'translate3d(6300px,-90px,0)')
    moveLiveCamera(7000, 0, 1)
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

test('house surfaces share a parsed collider without joining the sill and lintel', () => {
  const el = { dataset: { chickenLine: '0,30 50,3 100,30|20,60 40,60|20,76 40,76' } }
  const lines = chickenPlatformLines(el)
  assert.deepEqual(lines, [[[0, 30], [50, 3], [100, 30]], [[20, 60], [40, 60]], [[20, 76], [40, 76]]])
  assert.equal(chickenPlatformLines(el), lines)
  el.dataset.chickenLine = '0,12 100,12'
  assert.deepEqual(chickenPlatformLines(el), [[[0, 12], [100, 12]]])
})

test('custom tree climbable lines are cached independently of their one-way floors', () => {
  const { chickenPlatformWalls } = loadTs('lib/chicken/platform-geometry.ts')
  const el = { dataset: { chickenWalls: '20,80 30,5|45,80 36,5', chickenLine: '30,5 36,5' } }
  const walls = chickenPlatformWalls(el)
  assert.deepEqual(walls, [[[20, 80], [30, 5]], [[45, 80], [36, 5]]])
  assert.equal(chickenPlatformWalls(el), walls)
  el.dataset.chickenWalls = '21,80 30,5'
  assert.deepEqual(chickenPlatformWalls(el), [[[21, 80], [30, 5]]])
  delete el.dataset.chickenWalls
  assert.equal(chickenPlatformWalls(el), null)
})
