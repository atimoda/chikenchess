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
  const { heldItemPose } = loadTs('lib/pigchicken/held-pose.ts')
  const c = createCombat()
  c.give('pistol'); c.give('rifle')
  const first = c.held.item
  step(c, { throwHeld: true }); step(c, { throwHeld: true })
  assert.ok(c.throwCharge > 0)
  step(c, { throwHeld: true, slot: 1 })
  assert.notEqual(c.held.item, first)
  assert.equal(c.throwCharge, 0)
  assert.equal(c.throwVoid, true)
  assert.equal(heldItemPose(c, 0).throwing, false)
  assert.equal(heldItemPose(c, 0).itemKey, c.held.item)
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

test('consumables go after the weapons; Fire uses the dose and puts its effect on her, the effects adding up', () => {
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
  // Cok adds to it: -22% final speed, +33% acceleration, multiplied with Maryjane's; the latest dose's curve and look
  for (let i = 0; i < 45; i++) step(c)
  step(c, { slot: 3 }); for (let i = 0; i < 40; i++) step(c)
  step(c, { fire: true, firePressed: true })
  assert.equal(c.effect.item, 'cok'); assert.ok(Math.abs(c.effect.speed - 1.33 * 0.78) < 1e-9); assert.equal(c.effect.accel, 1.33); assert.equal(c.effect.curve, 'linear')
  assert.deepEqual(c.effects.map(e => e.item), ['maryjane', 'cok'])
  // Maryjane ends first (it started earlier); then only Cok is left
  const mj = c.effects[0].left
  for (let t = 0; t < mj + 0.05; t += 0.016) step(c)
  assert.deepEqual(c.effects.map(e => e.item), ['cok']); assert.equal(c.effect.speed, 0.78)
  // it wears off
  const left = c.effect.left
  for (let t = 0; t < left + 0.1; t += 0.016) step(c)
  assert.equal(c.effect, null)
})

test('several doses of the same consumable multiply its effect, each with its own time', () => {
  const c = createCombat()
  for (let i = 0; i < 3; i++) c.give('maryjane')
  step(c, { fire: true, firePressed: true })
  for (let i = 0; i < 60; i++) step(c)
  step(c, { fire: true, firePressed: true })
  assert.equal(c.effects.length, 2)
  assert.ok(Math.abs(c.effect.speed - 1.33 * 1.33) < 1e-9)
  assert.ok(c.effects[0].left < c.effects[1].left)
})

test('each local player has their own effect', () => {
  const c = createCombat()
  c.give('maryjane'); step(c, { fire: true, firePressed: true })
  assert.equal(c.effect.item, 'maryjane')
  c.use('p2'); assert.equal(c.effect, null)
  c.use('p1'); assert.equal(c.effect.item, 'maryjane')
})

test('consumables stack up to 13 Maryjanes and 3 Coks in one slot each, with no reload refill', () => {
  const c = createCombat()
  for (let i = 0; i < 20; i++) { c.give('maryjane'); c.give('cok') }
  assert.deepEqual(names(c), ['maryjane', 'cok', null])
  assert.deepEqual(c.inventory.slice(0, 2).map(o => o.ammo), [13, 3])
  step(c, { slot: 1 }); for (let i = 0; i < 50; i++) step(c)
  step(c, { fire: true, firePressed: true })
  assert.equal(c.held.ammo, 12)
  assert.equal(c.consumption.item, 'maryjane')
  c.use('p2'); assert.equal(c.consumption, null); c.use('p1')
  assert.equal(c.consumption.item, 'maryjane')
  for (let i = 0; i < 60; i++) step(c, { reload: true })
  assert.equal(c.consumption, null)
  assert.equal(c.held.ammo, 12)
  c.give('maryjane'); assert.equal(c.held.ammo, 13)
})

test('a ground consumable tops up an existing stack even with all inventory slots occupied', () => {
  const { ITEM_IDS } = loadTs('lib/pigchicken/items.ts')
  const c = createCombat()
  c.give('maryjane')
  for (const id of ITEM_IDS.filter(id => id !== 'wing' && id !== 'maryjane').slice(0, 12)) c.give(id)
  assert.equal(c.inventory.length, 13)
  c.pickups.push({ id: 999, owned: { item: 'maryjane', ammo: 1, durability: 0 }, x: 0, y: 0, vy: 0, resting: true, noPick: 0 })
  step(c, { grab: true })
  assert.equal(c.inventory.find(o => o.item === 'maryjane').ammo, 2)
  assert.equal(c.pickups.length, 0)
})

test('grenade-family items rest at the hand and proportional Fire uses Throw pullback', () => {
  const { heldItemPose } = loadTs('lib/pigchicken/held-pose.ts')
  for (const item of ['grenade', 'tambourine', 'bow', 'harp']) {
    const c = createCombat(); c.give(item)
    const rest = heldItemPose(c, 0)
    assert.equal(rest.atHand, item === 'grenade' || item === 'tambourine')
    for (let i = 0; i < 15; i++) step(c, { fire: true, firePressed: i === 0 })
    const charging = heldItemPose(c, 0)
    assert.ok(charging.kick > rest.kick + 6, item)
    assert.ok(c.fireCharge > 0, item)
  }
  const c = createCombat(); c.give('grenade')
  for (let i = 0; i < 15; i++) step(c, { throwHeld: true })
  assert.ok(heldItemPose(c, 0).kick > 6)
  assert.equal(heldItemPose(c, 0).angle, c.throwAngle)
})

test('throwing a grenade-family item can use the hand origin without moving the melee origin', () => {
  const c = createCombat(); c.give('grenade')
  const run = over => c.step(0.016, body, { x: 0, y: 0 }, { x: 20, y: -20 }, 0,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...over },
    [], 1000, () => {}, { world: false, throwOrigin: { x: 50, y: -30 } })
  run({ throwHeld: true }); run({ throwReleased: true })
  assert.equal(c.thrown[0].x, 50); assert.equal(c.thrown[0].y, -30)
})

test('consumables throw their stack without consuming a dose or activating an effect', () => {
  const { heldItemPose } = loadTs('lib/pigchicken/held-pose.ts')
  for (const item of ['maryjane', 'cok']) {
    const c = createCombat(); c.give(item); c.give(item)
    assert.equal(heldItemPose(c, 0).atHand, true)
    for (let i = 0; i < 15; i++) step(c, { throwHeld: true })
    const pose = heldItemPose(c, 0)
    assert.ok(pose.pull > 6)
    assert.equal(pose.consumable.upright, item === 'cok' ? -90 : 0)
    assert.equal(c.effect, null)
    assert.equal(c.held.ammo, 2)
    step(c, { throwReleased: true })
    assert.equal(c.thrown.length, 1)
    assert.equal(c.thrown[0].owned.item, item)
    assert.equal(c.thrown[0].owned.ammo, 2)
    assert.equal(c.effect, null)
    assert.equal(c.held, null)
  }
})

test('food and liquid consumption emit their own sound, once per dose', () => {
  for (const [item, kind] of [['maryjane', 'eat'], ['cok', 'drink']]) {
    const c = createCombat(); c.give(item); c.sounds.length = 0
    step(c, { fire: true, firePressed: true })
    assert.deepEqual(c.sounds.map(s => s.kind), [kind])
    for (let i = 0; i < 10; i++) step(c, { fire: true })
    assert.deepEqual(c.sounds.map(s => s.kind), [kind])
  }
})

test('tambourine Fire releases an explosive musical note and keeps the instrument', () => {
  const c = createCombat(); c.give('tambourine')
  for (let i = 0; i < 20; i++) step(c, { fire: true, firePressed: i === 0 })
  step(c)
  assert.equal(c.bullets.length, 1)
  assert.ok(c.bullets[0].note?.sym)
  assert.ok(c.bullets[0].fuse > 0)
  assert.ok(c.bullets[0].explode > 0)
  assert.equal(c.held.item, 'tambourine')
  assert.equal(c.thrown.length, 0)
})

test('Shift reverses Next item on press, without a second switch when the modifier changes while held', () => {
  const { quickSwitchStep } = loadTs('lib/pigchicken/inventory.ts')
  assert.equal(quickSwitchStep({ nextItem: true }, {}, false), 1)
  assert.equal(quickSwitchStep({ nextItem: true }, {}, true), -1)
  assert.equal(quickSwitchStep({ nextItem: true }, { nextItem: true }, true), 0)
  assert.equal(quickSwitchStep({ nextItem: true }, { nextItem: true }, false), 0)
  assert.equal(quickSwitchStep({ prevItem: true }, {}, true), -1)
  assert.equal(quickSwitchStep({ nextItem: true, prevItem: true }, {}, false), -1)
  const c=createCombat();c.give('flute');c.give('pistol')
  step(c,{slot:1})
  step(c,{pick:quickSwitchStep({nextItem:true},{},true)})
  assert.equal(c.held,null,'reverse from first item wraps through empty hands')
  step(c,{pick:quickSwitchStep({nextItem:true},{},false)})
  assert.equal(c.held.item,'flute')
})

test('every throwable item marks its Throw pose without changing its launch angle; proportional Fire is separate', () => {
  const {DEFAULT_ITEMS, RACK_ITEM_IDS}=loadTs('lib/pigchicken/items.ts')
  const {heldItemPose}=loadTs('lib/pigchicken/held-pose.ts')
  for(const item of RACK_ITEM_IDS.filter(id => DEFAULT_ITEMS[id].throwSpeed > 0)){
    const c=createCombat();c.give(item)
    for(let i=0;i<15;i++)step(c,{throwHeld:true})
    const pose=heldItemPose(c,0)
    assert.equal(pose.throwing,true,item)
    assert.equal(pose.angle,c.throwAngle,item)
    step(c,{throwReleased:true})
    assert.equal(c.throwAngle,0,item)
    assert.ok(c.thrown[0].vx>0 && c.thrown[0].vy>0,item+' still launches horizontally before gravity')
  }
  const c=createCombat();c.give('grenade')
  for(let i=0;i<15;i++)step(c,{fire:true,firePressed:i===0})
  assert.ok(heldItemPose(c,0).pull>0)
  assert.equal(heldItemPose(c,0).throwing,false)
})

test('deselect leaves every item intact, wins simultaneous actions and isolates local players', () => {
  const c = createCombat()
  c.give('pistol'); c.give('flute'); c.give('maryjane')
  const before = structuredClone(c.inventory)
  step(c, { deselect: true, slot: 1, pick: 1, fire: true, firePressed: true, melee: true, grab: true })
  assert.equal(c.held, null)
  assert.deepEqual(c.inventory, before)
  assert.equal(c.swing, null)
  assert.equal(c.consumption, null)
  c.use('p2'); c.give('rifle'); assert.equal(c.held.item, 'rifle')
  c.use('p1'); assert.equal(c.held, null)
  step(c, { pick: 1 }); assert.equal(c.held.item, 'flute')
})

test('deselect works with all 13 slots and cycling/pickup never skips or exceeds capacity', () => {
  const c = createCombat()
  const ids = ['pistol', 'smg', 'rifle', 'pump', 'sniper', 'launcher', 'grenade', 'bow', 'flute', 'sax', 'trumpet', 'guitar', 'violin']
  ids.forEach(id => c.give(id))
  const before = structuredClone(c.inventory)
  step(c, { deselect: true }); assert.equal(c.held, null)
  assert.deepEqual(c.inventory, before)
  step(c, { pick: 1 }); assert.equal(c.current, 0)
  step(c, { deselect: true }); step(c, { pick: -1 }); assert.equal(c.current, 12)
  step(c, { deselect: true })
  c.pickups.push({ id: 999, owned: { item: 'keys', ammo: 10, durability: 100 }, x: 0, y: 0, vy: 0, resting: true, noPick: 0 })
  step(c, { grab: true })
  assert.equal(c.held, null); assert.equal(c.pickups.length, 1)
  assert.deepEqual(c.inventory, before)
  step(c, { slot: 1 }); step(c, { grab: true })
  assert.equal(c.inventory.length, 13); assert.equal(c.held.item, 'keys')
})

test('deselect cancels Throw and charge Fire; releasing later neither throws nor consumes', () => {
  for (const item of ['pistol', 'grenade', 'cok']) {
    const c = createCombat(); c.give(item)
    step(c, { throwHeld: true }); assert.ok(c.throwCharge > 0)
    step(c, { deselect: true, throwHeld: true })
    assert.equal(c.held, null); assert.equal(c.throwCharge, 0); assert.equal(c.throwVoid, true)
    step(c, { throwHeld: true, slot: 1 }); assert.equal(c.throwCharge, 0)
    step(c, { throwReleased: true })
    assert.equal(c.thrown.length, 0)
    assert.equal(c.inventory.filter(Boolean).length, 1)
  }
  const c = createCombat(); c.give('grenade')
  step(c, { fire: true, firePressed: true }); assert.ok(c.fireCharge > 0)
  step(c, { deselect: true, fire: true }); step(c)
  assert.equal(c.fireCharge, 0); assert.equal(c.bullets.length, 0)
  assert.equal(c.peck, null)
})

test('deselect stops the consumption pose while keeping the dose spent and its effect', () => {
  const c = createCombat(); c.give('maryjane'); c.give('maryjane')
  step(c, { fire: true, firePressed: true })
  assert.ok(c.consumption); assert.equal(c.held.ammo, 1)
  step(c, { deselect: true })
  assert.equal(c.consumption, null); assert.equal(c.held, null)
  assert.equal(c.effect.item, 'maryjane')
  assert.equal(c.inventory.find(Boolean).ammo, 1)
})

test('after a throw she holds the item before the thrown one (the new first when it was the first)', () => {
  const c = createCombat()
  c.give('flute'); c.give('pistol'); c.give('maryjane'); c.give('cok')
  assert.deepEqual(names(c), ['flute', 'pistol', 'maryjane', 'cok', null])
  step(c, { slot: 3 }); for (let i = 0; i < 20; i++) step(c)
  assert.equal(c.held.item, 'maryjane')
  step(c, { throwHeld: true }); step(c, { throwReleased: true })
  assert.deepEqual(names(c), ['flute', 'pistol', 'cok', null])
  assert.equal(c.held.item, 'pistol')
  step(c, { slot: 1 }); for (let i = 0; i < 20; i++) step(c)
  step(c, { throwHeld: true }); step(c, { throwReleased: true })
  assert.equal(c.held.item, 'pistol')
})
