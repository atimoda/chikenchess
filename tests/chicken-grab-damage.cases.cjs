const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { grabDamageStep } = loadTs('lib/chicken/grab-damage.ts')
const { CHICKEN_PARAMS } = loadTs('lib/chicken/params.ts')
const { CHICKEN_PARAM_META } = loadTs('lib/chicken/param-meta.ts')
const { speciesParams } = loadTs('lib/chicken/species.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')

test('grabbed, she holds on until the damage taken reaches the limit', () => {
  let hit = grabDamageStep(0, 2, 5)
  assert.deepEqual(hit, { taken: 2, drop: false })
  hit = grabDamageStep(hit.taken, 2, 5)
  assert.deepEqual(hit, { taken: 4, drop: false })
  hit = grabDamageStep(hit.taken, 1, 5)
  assert.deepEqual(hit, { taken: 5, drop: true })
  // one strong blow is enough
  assert.equal(grabDamageStep(0, 80, 5).drop, true)
})

test('a limit of 0 lets any blow take her off; a blow without damage never adds up', () => {
  assert.equal(grabDamageStep(0, 0, 0).drop, true)
  assert.deepEqual(grabDamageStep(3, 0, 5), { taken: 3, drop: false })
  assert.deepEqual(grabDamageStep(3, -10, 5), { taken: 3, drop: false })
  assert.deepEqual(grabDamageStep(0, NaN, 5), { taken: 0, drop: false })
})

test('the chickens fall off a grab with little damage, and the setting is in Agarrar', () => {
  assert.equal(CHICKEN_PARAMS.clingDropDamage, 5)
  // any shot or blast of the default items is enough, alone
  const weakest = Math.min(...Object.values(DEFAULT_ITEMS).map(d => Math.max(d.damage, d.explodeDamage)).filter(v => v > 0))
  assert.ok(CHICKEN_PARAMS.clingDropDamage <= weakest, `weakest ${weakest}`)
  const meta = CHICKEN_PARAM_META.find(m => m.key === 'clingDropDamage')
  assert.equal(meta.group, 'Agarrar'); assert.equal(meta.label, 'Cair do grab após'); assert.equal(meta.min, 0)
  // the chicks read the same limit
  assert.equal(speciesParams('chick', CHICKEN_PARAMS).clingDropDamage, CHICKEN_PARAMS.clingDropDamage)
})

test('a blast hands the players its damage, fading to the edge like the push', () => {
  const c = createCombat(), near = [], half = []
  c.setBlastActors([
    { box: { l: 95, r: 105, t: 0, b: 100 }, push: (x, y, damage) => near.push(damage) },
    { box: { l: 175, r: 185, t: 90, b: 110 }, push: (x, y, damage) => half.push(damage) },
  ])
  const body = { x: 100, y: 100, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const input = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
  c.bullets.push({ x: 100, y: 100, vx: 0, vy: 0, dist: 0, damage: 0, pierce: 0, hits: new Set(), size: 1, drop: 0, range: 10000,
    item: 'launcher', t: 0, explode: 150, explodeDamage: 10, explodePush: 800, fuse: 0.001, bounce: 0 })
  c.step(0.016, body, body, body, 0, input, [], 1000, () => {})
  assert.equal(near.length, 1); assert.ok(Math.abs(near[0] - 10) < 1e-6)
  assert.equal(half.length, 1); assert.ok(Math.abs(half[0] - 5) < 1e-6)
  // the bomb of a block (Campo minado)
  near.length = 0
  c.boom(100, 100, 150, 40, 600)
  assert.equal(near.length, 1); assert.ok(Math.abs(near[0] - 40) < 1e-6)
})
