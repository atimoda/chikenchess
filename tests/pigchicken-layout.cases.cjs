const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const world = loadTs('lib/pigchicken/world.ts')
const L = loadTs('lib/pigchicken/layout.ts')

test('the default layout is the Pátio the code always drew: same platform boxes and ids', () => {
  const lay = L.defaultLayout()
  const plat = lay.elements.filter(e => e.kind === 'platform' || e.kind === 'pillar')
  const old = world.worldPlatforms(L.LAYOUT_MAX_SCREENS)
  assert.equal(plat.length, old.length)
  old.forEach(p => {
    const e = plat.find(x => x.id === p.id)
    assert.ok(e, p.id)
    assert.deepEqual({ x: e.x, y: e.y, w: e.w, h: e.h }, { x: p.x, y: p.y, w: p.w, h: p.h })
    assert.equal(e.solid, true); assert.equal(e.shots, true); assert.equal(e.notes, false); assert.equal(e.layer, 'scene')
  })
  // trees in front, half see-through, never solid; racks, horde buttons and five dummies with their tips
  const trees = lay.elements.filter(e => e.kind === 'pine' || e.kind === 'blossom')
  assert.equal(trees.length, L.defaultTrees(L.LAYOUT_MAX_SCREENS).length)
  trees.forEach(t => { assert.equal(t.layer, 'frontGhost'); assert.equal(t.solid, false) })
  assert.equal(lay.elements.filter(e => e.kind === 'rack').length, 16)
  assert.equal(lay.elements.filter(e => e.kind === 'button').length, 4)
  const dummies = lay.elements.filter(e => e.kind === 'dummy')
  assert.equal(dummies.length, 5)
  dummies.forEach(d => { assert.ok(d.params.message.length > 0); assert.equal(d.y + d.h, world.WORLD_GROUND_Y) })
  // a narrower world hides what is past its last scene
  assert.ok(L.elementsInWorld(lay, 1).every(e => e.x + e.w / 2 < world.SCENE_W))
})

test('layouts from storage are cleaned: unknown kinds dropped, turns snapped, the game things never turn or collide', () => {
  const lay = L.normalizeLayout({ elements: [
    { kind: 'castle', x: 0, y: 0 },
    { id: 'a', kind: 'platform', x: 10, y: 20, w: 3, h: 50, rot: 50, layer: 'nowhere', solid: false, notes: true, opacity: 3 },
    { id: 'a', kind: 'dummy', x: 0, y: 0, w: 46, h: 112, rot: 90, layer: 'front', solid: true, params: { message: 'x'.repeat(400), maxHp: 99999 } },
    { id: 'r', kind: 'rack', params: { item: 'banana' } },
  ] })
  assert.equal(lay.elements.length, 3)
  const [p, d, r] = lay.elements
  assert.equal(p.rot, 45); assert.equal(p.layer, 'scene'); assert.equal(p.w, L.ELEMENT_DEFS.platform.minW); assert.equal(p.solid, false); assert.equal(p.notes, true); assert.equal(p.opacity, 1)
  assert.notEqual(d.id, 'a') // duplicate ids get a new one
  assert.equal(d.rot, 0); assert.equal(d.layer, 'scene'); assert.equal(d.solid, false)
  assert.equal(d.params.message.length, 280); assert.equal(d.params.maxHp, 1000)
  assert.equal(r.params.item, 'pistol')
  assert.equal(L.normalizeLayout({ nope: 1 }), null)
})

test('turned elements: 90° swaps the box, 45° is a ramp whose upper edges are floors', () => {
  const el = { x: 0, y: 0, w: 200, h: 40, rot: 90 }
  assert.deepEqual(L.elementBounds(el), { x: 80, y: -80, w: 40, h: 200 })
  assert.equal(L.elementFloorLine(el), null)
  const ramp = { x: 0, y: 0, w: 200, h: 40, rot: 45 }
  const b = L.elementBounds(ramp)
  assert.ok(Math.abs(b.w - b.h) < 0.01 && Math.abs(b.w - 240 / Math.SQRT2) < 0.01)
  const pts = L.elementFloorLine(ramp).split(' ').map(p => p.split(',').map(Number))
  assert.equal(pts.length, 3)
  // from the left edge over the top to the right edge
  assert.ok(Math.abs(pts[0][0]) < 0.11 && Math.abs(pts[2][0] - b.w) < 0.11 && Math.abs(pts[1][1]) < 0.11)
})

test('combat boxes follow each element\'s collisions', () => {
  const mk = (o) => L.normalizeElement({ kind: 'platform', x: 0, y: 100, w: 100, h: 20, ...o })
  const boxes = L.layoutBoxes([mk({ id: 'p' }), mk({ id: 'g', solid: false, shots: false }), mk({ id: 'n', solid: false, shots: false, notes: true }), L.normalizeElement({ kind: 'dummy', x: 0, y: 0 })])
  assert.equal(boxes.length, 2)
  assert.deepEqual(boxes.map(b => [b.solid, b.shots, b.notes]), [[true, true, false], [false, false, true]])
})

test('a new element is centred where it was dropped, with its kind\'s defaults', () => {
  const e = L.createElement('pine', 1000, 500)
  assert.equal(e.x + e.w / 2, 1000); assert.equal(e.y + e.h / 2, 500)
  assert.equal(e.layer, 'frontGhost'); assert.ok(Number.isInteger(e.params.seed))
  const rack = L.createElement('rack', 0, 0, { item: 'violin' })
  assert.equal(rack.params.item, 'violin')
})
