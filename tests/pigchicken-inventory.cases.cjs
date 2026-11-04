const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const inv = loadTs('lib/pigchicken/inventory.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const step = (c, over = {}) => c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...over }, [], 1000, () => {})
const names = c => c.inventory.map(o => o ? o.item : null)

test('the inventory shows only her items plus one empty slot, grouped: instruments, weapons, others', () => {
  const c = createCombat()
  assert.deepEqual(names(c), [null])
  c.give('pistol'); c.give('flute'); c.give('rifle'); c.give('guitar')
  assert.deepEqual(names(c), ['flute', 'guitar', 'pistol', 'rifle', null])
  // she holds the last item taken, wherever its group put it
  assert.equal(c.held.item, 'guitar')
  assert.equal(c.current, 1)
})

test('quick switch cycles through the items and one empty slot, then back to the first', () => {
  const c = createCombat()
  c.give('pistol'); c.give('flute')
  const seen = []
  for (let i = 0; i < 4; i++) { step(c, { pick: 1 }); seen.push(c.held?.item ?? null) }
  assert.deepEqual(seen, ['pistol', null, 'flute', 'pistol'])
  // an exact slot past the shown ones does nothing
  step(c, { slot: 1 }); assert.equal(c.held.item, 'flute')
  step(c, { slot: 9 }); assert.equal(c.held.item, 'flute')
})

test('at most 13 items: a full inventory has no empty slot', () => {
  const c = createCombat()
  const ids = ['pistol', 'smg', 'rifle', 'pump', 'sniper', 'launcher', 'grenade', 'bow', 'flute', 'sax', 'trumpet', 'guitar', 'violin', 'keys']
  ids.forEach(id => c.give(id))
  assert.equal(c.inventory.length, inv.INVENTORY_MAX)
  assert.ok(c.inventory.every(Boolean))
  assert.ok(!names(c).includes('keys'))
  assert.equal(c.hoverSwaps, true)
})

test('the wheel: equal slices, the first at the top, clockwise', () => {
  const up = -Math.PI / 2
  assert.equal(inv.wheelSliceAt(up, 5), 0)
  assert.equal(inv.wheelSliceAt(0, 4), 1) // right
  assert.equal(inv.wheelSliceAt(Math.PI / 2, 4), 2) // down
  assert.equal(inv.wheelSliceAt(Math.PI, 4), 3) // left
  assert.equal(inv.wheelSliceAt(up + 0.01, 1), 0)
  for (let n = 1; n <= 13; n++) for (let i = 0; i < n; i++) assert.equal(inv.wheelSliceAt(inv.wheelSliceCenter(i, n), n), i)
  assert.equal(inv.slotCount(0), 1); assert.equal(inv.slotCount(12), 13); assert.equal(inv.slotCount(13), 13)
})

test('each local player has their own items (loadouts) in the same world', () => {
  const c = createCombat()
  c.give('pistol')
  c.use('p2')
  assert.deepEqual(names(c), [null])
  c.give('flute')
  assert.deepEqual(names(c), ['flute', null])
  c.use('p1')
  assert.deepEqual(names(c), ['pistol', null])
  assert.equal(c.held.item, 'pistol')
  c.use('p2')
  assert.equal(c.held.item, 'flute')
  // a step of another player leaves the shared world alone
  c.addTarget(500, 1000)
  const before = c.targets[0].x
  step(c)
  c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }, [], 1000, () => {}, { world: false })
  assert.equal(c.targets[0].x, before)
  c.use('p1')
  c.drop('p2')
  c.use('p2')
  assert.deepEqual(names(c), [null])
})

test('switching items while a throw charges calls the throw off until the button is let go', () => {
  const c = createCombat()
  c.give('pistol'); c.give('rifle')
  const first = c.held.item
  step(c, { throwHeld: true }); step(c, { throwHeld: true })
  assert.ok(c.throwCharge > 0)
  step(c, { throwHeld: true, slot: 1 })
  assert.notEqual(c.held.item, first)
  assert.equal(c.throwCharge, 0)
  assert.equal(c.throwVoid, true)
  // still held: no charge; let go: nothing is thrown
  step(c, { throwHeld: true }); assert.equal(c.throwCharge, 0)
  const held = c.held.item
  step(c, { throwReleased: true })
  assert.equal(c.thrown.length, 0)
  assert.equal(c.held.item, held)
  assert.equal(c.throwVoid, false)
  // the next press throws as usual
  step(c, { throwHeld: true }); step(c, { throwReleased: true })
  assert.equal(c.thrown.length, 1)
})

test('each local player keeps their own throw angle', () => {
  const c = createCombat()
  c.give('pistol')
  const at = (angle, over) => c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...over }, [], 1000, () => {})
  at(-1, { throwHeld: true })
  c.use('p2'); at(Math.PI, {}); c.use('p1')
  assert.equal(c.throwAngle, -1)
})

test('consumables go after the weapons; Fire uses the dose and puts its effect on her, the newest replacing the old one', () => {
  const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
  const c = createCombat()
  c.give('maryjane'); c.give('pistol'); c.give('flute'); c.give('cok')
  assert.deepEqual(names(c), ['flute', 'pistol', 'maryjane', 'cok', null])
  assert.equal(c.effect, null)
  // Maryjane: the buddha state, +33% final speed, eased start (slow, then fast)
  step(c, { slot: 3 }); for (let i = 0; i < 20; i++) step(c)
  step(c, { fire: true, firePressed: true })
  assert.equal(c.effect.item, 'maryjane'); assert.equal(c.effect.look, 'buddha')
  assert.equal(c.effect.speed, 1.33); assert.equal(c.effect.curve, 'superIn'); assert.equal(c.effect.accel, 1)
  assert.equal(c.effect.total, DEFAULT_ITEMS.maryjane.effectTime)
  // the one dose is gone: so is the item, her hands are empty
  assert.deepEqual(names(c), ['flute', 'pistol', 'cok', null])
  assert.equal(c.held, null)
  // Cok replaces it: -22% final speed, +33% acceleration
  step(c, { fire: false }); step(c, { slot: 3 }); for (let i = 0; i < 40; i++) step(c)
  step(c, { fire: true, firePressed: true })
  assert.equal(c.effect.item, 'cok'); assert.equal(c.effect.speed, 0.78); assert.equal(c.effect.accel, 1.33); assert.equal(c.effect.curve, 'linear')
  // it wears off
  const left = c.effect.left
  for (let t = 0; t < left + 0.1; t += 0.016) step(c)
  assert.equal(c.effect, null)
})

test('each local player has their own effect', () => {
  const c = createCombat()
  c.give('maryjane'); step(c, { fire: true, firePressed: true })
  assert.equal(c.effect.item, 'maryjane')
  c.use('p2'); assert.equal(c.effect, null)
  c.use('p1'); assert.equal(c.effect.item, 'maryjane')
})
