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
