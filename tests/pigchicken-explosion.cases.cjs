const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { explosionImpulse } = loadTs('lib/pigchicken/explosion.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
const body = { x: 100, y: 100, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const input = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
const tick = c => c.step(0.016, body, body, body, 0, input, [], 1000, () => {})
function detonate(c, item, force) {
  c.bullets.push({ x: 100, y: 100, vx: 0, vy: 0, dist: 0, damage: 0, pierce: 0, hits: new Set(), size: 1, drop: 0, range: 10000,
    item, t: 0, explode: 150, explodeDamage: 10, explodePush: force, fuse: 0.001, bounce: 0,
    ...(DEFAULT_ITEMS[item].instrument ? { note: { midi: 60, color: '#fff', sym: '♪', wave: 0, phase: 0, voice: 'keys' }, ring: 0 } : {}) })
  tick(c)
}

test('radial impulse points away, weakens toward the edge, and zero disables it', () => {
  const point = (x, y) => ({ l: x, r: x, t: y, b: y })
  assert.deepEqual(explosionImpulse(0, 0, 100, 1000, point(0, -50)), { x: 0, y: -500 })
  assert.deepEqual(explosionImpulse(0, 0, 100, 1000, point(50, 0)), { x: 500, y: 0 })
  assert.equal(explosionImpulse(0, 0, 100, 1000, point(100, 0)), null)
  assert.equal(explosionImpulse(0, 0, 100, 0, point(0, 0)), null)
  assert.deepEqual(explosionImpulse(0, 0, 100, 1000, point(0, 0)), { x: 0, y: -1000 })
})

test('all four explosives push the owner and other local players, including musical bursts', () => {
  for (const item of ['launcher', 'grenade', 'keys', 'tambourine']) {
    const c = createCombat(), own = [], other = [], far = []
    c.setBlastActors([
      { box: { l: 70, r: 90, t: 0, b: 110 }, push: (x, y) => own.push({ x, y }) },
      { box: { l: 120, r: 140, t: 0, b: 110 }, push: (x, y) => other.push({ x, y }) },
      { box: { l: 1000, r: 1100, t: 0, b: 100 }, push: (x, y) => far.push({ x, y }) },
    ])
    detonate(c, item, DEFAULT_ITEMS[item].explodePush)
    assert.equal(own.length, 1, item); assert.ok(own[0].x < 0 && own[0].y < 0, item)
    assert.equal(other.length, 1, item); assert.ok(other[0].x > 0 && other[0].y < 0, item)
    assert.equal(far.length, 0, item)
    assert.ok(DEFAULT_ITEMS[item].explodePush >= 900)
  }
})

test('zero force keeps damage but produces no radial motion; shots retain their force snapshot', () => {
  const c = createCombat(), pushes = []
  c.setBlastActors([{ box: { l: 95, r: 105, t: 0, b: 100 }, push: (x, y) => pushes.push({ x, y }) }])
  c.addTarget(160, 120)
  const t = c.targets[0], hp = t.hp
  detonate(c, 'launcher', 0)
  assert.equal(pushes.length, 0); assert.equal(t.blast, undefined); assert.ok(t.hp < hp)
  detonate(c, 'launcher', 500)
  assert.equal(pushes.length, 1); assert.equal(pushes[0].y, -500)
  assert.ok(t.blast.vx > 0 && t.blast.vy < 0)
  assert.ok(t.y < 120)
  for (let i = 0; i < 180; i++) tick(c)
  assert.ok(Math.abs(t.y - 120) < 1)
})
