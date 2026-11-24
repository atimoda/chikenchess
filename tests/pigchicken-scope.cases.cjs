const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const sc = loadTs('lib/pigchicken/scope.ts')
const { DEFAULT_ITEMS, itemsOver } = loadTs('lib/pigchicken/items.ts')
const { cameraYStep } = loadTs('lib/pigchicken/world.ts')
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps

test('the Sniper has a luneta by default; the violin (made from the Sniper) and the other weapons do not', () => {
  const s = DEFAULT_ITEMS.sniper
  assert.equal(s.scope, true)
  assert.ok(s.scopePan > 0 && s.scopeView > 1 && s.scopeReach > 1 && s.lensSize > 0 && s.lensZoom > 1)
  for (const id of ['violin', 'pistol', 'rifle', 'bow']) assert.equal(DEFAULT_ITEMS[id].scope, false, id)
})

test('each item keeps its own luneta numbers (another sniper can differ) and saved values are clamped', () => {
  const out = itemsOver({ rifle: { scope: true, lensSize: 90, lensZoom: 99, scopeView: 0.2 } })
  assert.equal(out.rifle.scope, true)
  assert.equal(out.rifle.lensSize, 90)
  assert.equal(out.rifle.lensZoom, 8)
  assert.equal(out.rifle.scopeView, 1)
  assert.equal(out.sniper.lensSize, DEFAULT_ITEMS.sniper.lensSize)
})

test('aiming goes in only with Atirar held on a shooting item with a luneta', () => {
  const d = DEFAULT_ITEMS.sniper
  assert.equal(sc.scopeOn(d, true, true), true)
  assert.equal(sc.scopeOn(d, true, false), false)
  assert.equal(sc.scopeOn(d, false, true), false)
  assert.equal(sc.scopeOn({ ...d, scope: false }, true, true), false)
  assert.equal(sc.scopeOn({ ...d, meleeOnly: true }, true, true), false)
})

test('it eases in over scopeTime and back out, and 0 s is instant', () => {
  let k = 0
  for (let i = 0; i < 5; i++) k = sc.scopeStep(k, true, 0.3, 0.03)
  assert.ok(near(k, 0.5))
  for (let i = 0; i < 20; i++) k = sc.scopeStep(k, true, 0.3, 0.03)
  assert.equal(k, 1)
  k = sc.scopeStep(k, false, 0.3, 0.15)
  assert.ok(near(k, 0.5))
  assert.equal(sc.scopeStep(0.4, true, 0, 0.016), 1)
  assert.equal(sc.scopeStep(0.4, false, 0, 0.016), 0)
})

test('the camera zooms out by scopeView, never past the whole Pátio, and leans along the aim', () => {
  const d = { ...DEFAULT_ITEMS.sniper, scopeView: 1.5, scopePan: 400 }
  assert.equal(sc.scopeZoom(1, d, 0), 1)
  assert.ok(near(sc.scopeZoom(1, d, 1), 1 / 1.5))
  assert.ok(near(sc.scopeZoom(0.8, d, 1), 0.8 / 1.5))
  assert.equal(sc.scopeZoom(1, d, 1, 0.9), 0.9)
  assert.equal(sc.scopeZoom(1, null, 1), 1)
  const right = sc.scopeLean(d, 1, 0), up = sc.scopeLean(d, 1, -Math.PI / 2)
  assert.ok(near(right.x, 400) && near(right.y, 0))
  assert.ok(near(up.x, 0) && near(up.y, -400))
  assert.deepEqual(sc.scopeLean({ ...d, scopePan: 0 }, 1, 0), { x: 0, y: 0 })
  assert.equal(sc.leanWithin(500, 100, 300), 300)
  assert.equal(sc.leanWithin(-500, 100, 300), -100)
  assert.equal(sc.leanWithin(50, -10, -10), 0)
})

test('the stick reticle reaches scopeReach × farther; the lupa grows in with the aim', () => {
  const d = { ...DEFAULT_ITEMS.sniper, scopeReach: 3, lensSize: 80, lensZoom: 3 }
  assert.equal(sc.scopeReachAt(d, 0), 1)
  assert.equal(sc.scopeReachAt(d, 1), 3)
  assert.equal(sc.lensAt(d, 0), null)
  const full = sc.lensAt(d, 1)
  assert.equal(full.r, 80); assert.equal(full.zoom, 3); assert.equal(full.alpha, 1)
  assert.equal(sc.lensAt({ ...d, lensSize: 0 }, 1), null)
  assert.equal(sc.lensAt({ ...d, lensZoom: 1 }, 1), null)
})

test('the vertical lean lifts the camera target within its range', () => {
  const base = { worldY: 400, groundScreen: 800, viewTop: 60, dt: 1, lag: 1, top: -3000 }
  const still = cameraYStep(0, base)
  assert.equal(cameraYStep(0, { ...base, lift: 0 }), still)
  assert.equal(cameraYStep(0, { ...base, lift: 120 }), still + 120)
})
