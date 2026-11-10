const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const inv = loadTs('lib/pigchicken/inventory.ts')
const { createCombat: newCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
// these cases are about the items: every instrument with just its primary scale (the scales have their own case below)
const ONE_SCALE = structuredClone(DEFAULT_ITEMS)
Object.values(ONE_SCALE).forEach(d => { d.scales = ['primary'] })
const createCombat = () => { const c = newCombat(); c.setItems(ONE_SCALE); return c }

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const step = (c, over = {}) => c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...over }, [], 1000, () => {})
const names = c => c.inventory.map(o => o ? o.item : null)

test('number-row inventory shortcuts map 0 to the tenth item', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => inv.inventorySlotFromCode(`Digit${n}`)), [1, 2, 3, 4, 5, 6, 7, 8, 9])
  assert.equal(inv.inventorySlotFromCode('Digit0'), 10)
  assert.equal(inv.inventorySlotFromCode('Numpad0'), null)
  assert.equal(inv.inventorySlotFromCode('Key0'), null)

  const c = createCombat()
  const { RACK_ITEM_IDS } = loadTs('lib/pigchicken/items.ts')
  RACK_ITEM_IDS.slice(0, 10).forEach(id => c.give(id))
  const tenth = c.inventory[9].item
  step(c, { slot: inv.inventorySlotFromCode('Digit0') })
  assert.equal(c.current, 9)
  assert.equal(c.held.item, tenth)
})

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

test('the Pátio sets the limit (up to 25, all of it by default): a full inventory has no empty slot', () => {
  assert.equal(inv.INVENTORY_MAX, 25)
  assert.equal(createCombat().inventoryLimit, 25)
  const c = createCombat()
  c.setInventoryLimit(13)
  const ids = ['pistol', 'smg', 'rifle', 'pump', 'sniper', 'launcher', 'grenade', 'bow', 'flute', 'sax', 'trumpet', 'guitar', 'violin', 'keys']
  ids.forEach(id => c.give(id))
  assert.equal(c.inventory.length, 13)
  assert.ok(c.inventory.every(Boolean))
  assert.ok(!names(c).includes('keys'))
  assert.equal(c.hoverSwaps, true)
  // lowering it keeps what she carries; raising it brings the empty slot back
  c.setInventoryLimit(5); assert.equal(c.inventory.length, 13); assert.ok(c.inventory.every(Boolean))
  c.setInventoryLimit(99); assert.equal(c.inventoryLimit, 25); assert.equal(c.inventory.length, 14); assert.equal(c.inventory[13], null)
  c.setInventoryLimit(0); assert.equal(c.inventoryLimit, 1)
  // every item there is fits in the default 25
  const { RACK_ITEM_IDS } = loadTs('lib/pigchicken/items.ts')
  const all = createCombat(); RACK_ITEM_IDS.forEach(id => all.give(id))
  assert.equal(all.inventory.filter(Boolean).length, RACK_ITEM_IDS.length)
})

test('the wheel: equal slices, the first at the top, clockwise', () => {
  const up = -Math.PI / 2
  assert.equal(inv.wheelSliceAt(up, 5), 0)
  assert.equal(inv.wheelSliceAt(0, 4), 1) // right
  assert.equal(inv.wheelSliceAt(Math.PI / 2, 4), 2) // down
  assert.equal(inv.wheelSliceAt(Math.PI, 4), 3) // left
  assert.equal(inv.wheelSliceAt(up + 0.01, 1), 0)
  for (let n = 1; n <= 25; n++) for (let i = 0; i < n; i++) assert.equal(inv.wheelSliceAt(inv.wheelSliceCenter(i, n), n), i)
  assert.equal(inv.slotCount(0), 1); assert.equal(inv.slotCount(24), 25); assert.equal(inv.slotCount(25), 25)
  assert.equal(inv.slotCount(12, 13), 13); assert.equal(inv.slotCount(13, 13), 13); assert.equal(inv.slotCount(15, 13), 15)
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

test('the looks stack up per dose and coexist: buddha doses and fizz doses are counted separately', () => {
  const { lookDoses } = loadTs('lib/pigchicken/combat.ts')
  const c = createCombat()
  assert.deepEqual({ ...lookDoses(c.effects) }, { buddha: 0, fizz: 0 })
  for (let i = 0; i < 3; i++) c.give('maryjane')
  c.give('cok')
  step(c, { slot: 1 }); for (let i = 0; i < 40; i++) step(c)
  step(c, { fire: true, firePressed: true })
  for (let i = 0; i < 60; i++) step(c)
  step(c, { fire: true, firePressed: true })
  assert.deepEqual({ ...lookDoses(c.effects) }, { buddha: 2, fizz: 0 })
  for (let i = 0; i < 60; i++) step(c)
  step(c, { slot: 2 }); for (let i = 0; i < 40; i++) step(c)
  step(c, { fire: true, firePressed: true })
  // Cok is the latest dose, but the buddha doses are still counted: neither look cancels the other
  assert.equal(c.effect.look, 'fizz')
  assert.deepEqual({ ...lookDoses(c.effects) }, { buddha: 2, fizz: 1 })
})

test('Maryjane is called Bear Gummy and keeps its id', () => {
  const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
  assert.equal(DEFAULT_ITEMS.maryjane.name, 'Bear Gummy')
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
  c.setInventoryLimit(13)
  c.give('maryjane')
  for (const id of ITEM_IDS.filter(id => id !== 'wing' && id !== 'maryjane').slice(0, 12)) c.give(id)
  assert.equal(c.inventory.length, 13)
  c.pickups.push({ id: 999, owned: { item: 'maryjane', ammo: 1, durability: 0 }, x: 0, y: 0, vy: 0, resting: true, noPick: 0 })
  step(c, { grab: true })
  assert.equal(c.inventory.find(o => o.item === 'maryjane').ammo, 2)
  assert.equal(c.pickups.length, 0)
})

test('melee picks up a new item into a free slot without equipping it', () => {
  const c = createCombat()
  c.give('pistol')
  c.pickups.push({ id: 901, owned: { item: 'flute', ammo: 12, durability: 0 }, x: 0, y: 0, vy: 0, resting: true, noPick: 0 })
  step(c, { melee: true })
  assert.deepEqual(names(c), ['flute', 'pistol', null])
  assert.equal(c.current, 1)
  assert.equal(c.held.item, 'pistol')
  assert.equal(c.pickups.length, 0)
})

test('melee leaves a new item on the ground when there is no free slot', () => {
  const c = createCombat()
  c.setInventoryLimit(2)
  c.give('flute'); c.give('pistol')
  c.pickups.push({ id: 902, owned: { item: 'rifle', ammo: 45, durability: 0 }, x: 0, y: 0, vy: 0, resting: true, noPick: 0 })
  step(c, { melee: true })
  assert.deepEqual(names(c), ['flute', 'pistol'])
  assert.equal(c.held.item, 'pistol')
  assert.equal(c.pickups.length, 1)
  assert.equal(c.pickups[0].id, 902)
  step(c, { grab: true })
  assert.equal(c.held.item, 'rifle')
  assert.equal(c.pickups.some(p => p.owned.item === 'pistol'), true)
})

test('the melee hit area picks up a new item it touches beyond her body reach, without equipping it', () => {
  const c = createCombat()
  c.give('pistol')
  c.pickups.push({ id: 903, owned: { item: 'flute', ammo: 12, durability: 0 }, x: 100, y: 0, vy: 0, resting: true, noPick: 0 })
  c.pickups.push({ id: 904, owned: { item: 'rifle', ammo: 45, durability: 0 }, x: -100, y: 0, vy: 0, resting: true, noPick: 0 })
  step(c, { melee: true })
  assert.equal(c.pickups.length, 2, 'out of body reach: only the blow can take it')
  for (let i = 0; i < 10; i++) step(c)
  assert.deepEqual(names(c), ['flute', 'pistol', null])
  assert.equal(c.held.item, 'pistol')
  assert.deepEqual(c.pickups.map(p => p.id), [904], 'the item behind her, outside the arc, stays')
})

test('the melee hit area leaves the item on the floor when there is no free slot', () => {
  const c = createCombat()
  c.setInventoryLimit(1)
  c.give('pistol')
  c.pickups.push({ id: 905, owned: { item: 'flute', ammo: 12, durability: 0 }, x: 100, y: 0, vy: 0, resting: true, noPick: 0 })
  step(c, { melee: true })
  for (let i = 0; i < 10; i++) step(c)
  assert.deepEqual(names(c), ['pistol'])
  assert.deepEqual(c.pickups.map(p => p.id), [905])
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
  c.setInventoryLimit(13)
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

test('three groups: instruments, weapons, then sports tools, consumables and utilities; a new item ends its group', () => {
  assert.equal(inv.itemGroup('bat', false), 2); assert.equal(inv.itemGroup('passagua', false), 2)
  assert.equal(inv.itemGroup('maryjane', false), 2); assert.equal(inv.itemGroup('pistol', false), 1); assert.equal(inv.itemGroup('flute', true), 0)
  const c = createCombat()
  c.give('bat'); c.give('pistol'); c.give('maryjane'); c.give('flute'); c.give('rifle'); c.give('sax')
  assert.deepEqual(names(c), ['flute', 'sax', 'pistol', 'rifle', 'bat', 'maryjane', null])
  assert.deepEqual(c.inventoryGroups, [0, 0, 1, 1, 2, 2, 2])
})

test('dragging a slot moves it before / after another, joining that group; the held item stays held', () => {
  const c = createCombat()
  c.give('flute'); c.give('pistol'); c.give('rifle'); c.give('bat')
  step(c, { slot: 3 }); assert.equal(c.held.item, 'rifle')
  // the bat goes before the pistol: it is a weapon now
  step(c, { move: { from: 3, to: 1, after: false } })
  assert.deepEqual(names(c), ['flute', 'bat', 'pistol', 'rifle', null])
  assert.deepEqual(c.inventoryGroups, [0, 1, 1, 1, 2])
  assert.equal(c.held.item, 'rifle'); assert.equal(c.current, 3)
  // the rifle (held) after the flute: an instrument, still in the wing
  step(c, { move: { from: 3, to: 0, after: true } })
  assert.deepEqual(names(c), ['flute', 'rifle', 'bat', 'pistol', null])
  assert.deepEqual(c.inventoryGroups, [0, 0, 1, 1, 2])
  assert.equal(c.held.item, 'rifle')
  // onto the empty slot: the end of the last group
  step(c, { move: { from: 0, to: 4, after: false } })
  assert.deepEqual(names(c), ['rifle', 'bat', 'pistol', 'flute', null])
  assert.deepEqual(c.inventoryGroups, [0, 1, 1, 2, 2])
  // empty hands stay empty
  step(c, { deselect: true }); step(c, { move: { from: 0, to: 2, after: true } })
  assert.equal(c.held, null); assert.deepEqual(names(c), ['bat', 'pistol', 'rifle', 'flute', null])
  // nothing moves for a slot that is not an item
  step(c, { move: { from: 4, to: 0, after: false } }); assert.deepEqual(names(c), ['bat', 'pistol', 'rifle', 'flute', null])
})

test('an item taken again goes back to its own group, at its end', () => {
  const c = createCombat()
  c.give('flute'); c.give('pistol')
  step(c, { move: { from: 1, to: 0, after: false } })
  assert.deepEqual(c.inventoryGroups, [0, 0, 2])
  c.give('sax'); assert.deepEqual(names(c), ['pistol', 'flute', 'sax', null])
  // thrown and picked up again: a weapon again
  step(c, { slot: 1 }); step(c, { throwHeld: true }); for (let i = 0; i < 40; i++) step(c, { throwHeld: true }); step(c, { throwReleased: true })
  assert.ok(!names(c).includes('pistol'))
  const p = c.thrown[0]?.owned ?? c.pickups[0]?.owned
  assert.equal(p.item, 'pistol')
  c.thrown.splice(0); c.pickups.splice(0)
  c.pickups.push({ id: 999, owned: p, x: 0, y: 0, vy: 0, resting: true, noPick: 0 })
  step(c, { grab: true })
  assert.deepEqual(names(c), ['flute', 'sax', 'pistol', null]); assert.deepEqual(c.inventoryGroups, [0, 0, 1, 2])
})

test('Próximo instrumento / arma / utilitário cycle their group in the bar order, starting at its first from elsewhere', () => {
  const c = createCombat()
  c.give('flute'); c.give('sax'); c.give('pistol'); c.give('rifle'); c.give('bat')
  const seen = g => { step(c, { groupPick: g }); return c.held?.item ?? null }
  // holding the bat (utilities): the instruments start at the first
  assert.deepEqual([seen(0), seen(0), seen(0)], ['flute', 'sax', 'flute'])
  assert.deepEqual([seen(1), seen(1), seen(1)], ['pistol', 'rifle', 'pistol'])
  // the utilities pass by the empty slot (empty hands), then back to the first
  assert.deepEqual([seen(2), seen(2), seen(2)], ['bat', null, 'bat'])
  step(c, { deselect: true }); assert.equal(seen(1), 'pistol')
  // with empty hands, Próximo utilitário goes on to the first utility
  step(c, { deselect: true }); assert.equal(seen(2), 'bat')
  // no weapon: Próxima arma works as Próximo item; no instrument: Próximo instrumento as Item anterior
  const d = createCombat(); d.give('flute')
  step(d, { groupPick: 1 }); assert.equal(d.held, null)
  step(d, { groupPick: 1 }); assert.equal(d.held.item, 'flute')
  const e = createCombat(); e.give('pistol'); e.give('bat')
  step(e, { groupPick: 0 }); assert.equal(e.held.item, 'pistol')
  step(e, { groupPick: 0 }); assert.equal(e.held, null)
  // dragged items belong to the group they were dropped in
  step(c, { move: { from: 4, to: 0, after: false } }); step(c, { deselect: true })
  assert.deepEqual([seen(0), seen(0)], ['bat', 'flute'])
  // a press in the same frame as the next / previous item: those win (one switch per frame)
  step(c, { slot: 1 }); step(c, { pick: 1, groupPick: 2 }); assert.equal(c.held.item, 'flute')
  inv.groupStep([0, 0, 1], 5, 2) === -1 || assert.fail('empty group')
})

test('the wheel goes through an instrument’s scales first, each with its weapon’s reload, then the next item', () => {
  const c = newCombat()
  c.give('pistol'); c.give('flute')
  step(c, { slot: 1 }); assert.equal(c.held.item, 'flute'); assert.equal(c.scale.id, 'primary')
  c.sounds.length = 0
  step(c, { pick: 1 }); assert.equal(c.held.item, 'flute'); assert.equal(c.scale.id, 'fifths')
  assert.deepEqual(c.sounds.find(s => s.kind === 'scale'), { kind: 'scale', item: 'pistol' })
  step(c, { pick: 1 }); assert.equal(c.scale.id, 'tension')
  step(c, { pick: 1 }); assert.equal(c.held.item, 'pistol')
  // back: arriving at the flute from after it starts at its last scale
  step(c, { pick: -1 }); assert.equal(c.held.item, 'flute'); assert.equal(c.scale.id, 'tension')
  step(c, { pick: -1 }); assert.equal(c.scale.id, 'fifths')
  // a number key keeps the scale it was on
  step(c, { slot: 2 }); step(c, { slot: 1 }); assert.equal(c.scale.id, 'fifths')
})
