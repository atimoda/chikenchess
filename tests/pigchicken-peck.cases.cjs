const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS, ITEM_IDS, RACK_ITEM_IDS, loadItems } = loadTs('lib/pigchicken/items.ts')
const { peckPose, PECK_CONTACT } = loadTs('lib/pigchicken/peck.ts')
const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, boxes = [], dt = 0.016) {
  c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    boxes, 1000, () => {}, { world: false, peckOrigin: { x: 0, y: 0 } })
}
function hold(c, angle = 0) {
  step(c, { fire: true, firePressed: true }, angle)
  for (let i = 0; i < 10; i++) step(c, { fire: true }, angle)
}
function finish(c, boxes = []) { for (let i = 0; i < 20; i++) step(c, {}, 0, boxes) }

test('empty Fire retracts the neck, release strikes once and returns; Golpe keeps the wing slap', () => {
  const c = createCombat(); c.addTarget(80, 30)
  const t = c.targets[0], hp = t.hp
  hold(c)
  assert.equal(c.peck.thrust, 0); assert.equal(c.peck.pull, DEFAULT_ITEMS.peck.peckPull)
  assert.equal(t.hp, hp); assert.equal(c.swing, null)
  step(c)
  assert.equal(t.hp, hp)
  finish(c)
  assert.equal(t.hp, hp - DEFAULT_ITEMS.peck.meleeDamage)
  assert.equal(c.peck, null); assert.equal(c.swing, null); assert.equal(c.bullets.length, 0)
  step(c, { melee: true })
  assert.equal(c.swing.wing, true)
})

test('release uses the current aim in all directions, not the press direction', () => {
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const c = createCombat()
    c.addTarget(Math.cos(angle) * 75, Math.sin(angle) * 75 + 10)
    c.targets[0].w = 18; c.targets[0].h = 20
    const hp = c.targets[0].hp
    hold(c, angle + Math.PI)
    step(c, {}, angle); finish(c)
    assert.equal(c.targets[0].hp, hp - DEFAULT_ITEMS.peck.meleeDamage)
  }
})

test('out of range and behind solid scenery cannot be pecked; buttons can', () => {
  for (const [x, boxes] of [[170, []], [85, [{ l: 35, r: 45, t: -100, b: 100 }]]]) {
    const c = createCombat(); c.addTarget(x, 30)
    const hp = c.targets[0].hp
    hold(c); step(c, {}, 0, boxes); finish(c, boxes)
    assert.equal(c.targets[0].hp, hp)
  }
  const c = createCombat(); c.addButton(70, 10, 'gong', 20, 20)
  hold(c); step(c); finish(c)
  assert.deepEqual(c.pressed, ['gong'])
})

test('selection, UI cancellation and Golpe cancel preparation without a delayed release strike', () => {
  for (const cancel of [{ cancelFire: true }, { melee: true }, { slot: 1 }]) {
    const c = createCombat(); c.give('pistol'); step(c, { slot: 2 }); hold(c)
    step(c, { fire: true, ...cancel })
    assert.equal(c.peck, null)
    step(c); finish(c)
    assert.equal(c.peck, null)
    assert.equal(c.bullets.length, 0)
  }
})

test('equipping and returning to empty hands while Fire remains held does not prepare another peck', () => {
  const c = createCombat(); c.give('pistol'); step(c, { slot: 2 }); hold(c)
  step(c, { fire: true, slot: 1 }); step(c, { fire: true, slot: 2 }); step(c)
  assert.equal(c.peck, null)
  finish(c)
  assert.equal(c.peck, null)
})

test('each local player owns their preparation, aim and return; cooldown requires a fresh press', () => {
  const c = createCombat()
  const items = structuredClone(DEFAULT_ITEMS); items.peck.meleeCooldown = 0.5; c.setItems(items)
  hold(c, Math.PI)
  c.use('p2'); assert.equal(c.peck, null); hold(c, -Math.PI / 2)
  c.use('p1'); assert.equal(c.peck.angle, Math.PI); step(c, {}, Math.PI)
  c.use('p2'); assert.equal(c.peck.thrust, 0); assert.equal(c.peck.angle, -Math.PI / 2)
  c.use('p1'); finish(c)
  step(c, { fire: true, firePressed: true }); assert.equal(c.peck, null)
  for (let i = 0; i < 35; i++) step(c, { fire: true })
  assert.equal(c.peck, null)
  step(c); hold(c); assert.ok(c.peck)
})

test('Bicada has its own configurable sheet, never occupies an inventory slot or rack', () => {
  assert.ok(ITEM_IDS.includes('peck')); assert.ok(!RACK_ITEM_IDS.includes('peck'))
  const c = createCombat(); c.give('peck'); assert.deepEqual(c.inventory, [null])
  const items = structuredClone(DEFAULT_ITEMS)
  items.peck.meleeDamage = 27; items.peck.meleeRange = 150; items.peck.peckPull = 20
  c.setItems(items); c.addTarget(130, 30)
  const hp = c.targets[0].hp
  hold(c); assert.equal(c.peck.pull, 20); step(c); finish(c)
  assert.equal(c.targets[0].hp, hp - 27)
  const peak = peckPose({ angle: 1, pull: 20, reach: 150, t: PECK_CONTACT, time: 1, hit: false })
  assert.equal(peak.thrust, 1)
  assert.equal(peckPose({ angle: 1, pull: 20, reach: 150, t: 1, time: 1, hit: true }).thrust, 0)
})


test('button down publishes aim immediately and preparation keeps following without damage', () => {
  const c = createCombat(); c.addTarget(70, 10)
  const hp = c.targets[0].hp
  step(c, { fire: true, firePressed: true }, -Math.PI / 2)
  assert.equal(c.peck.angle, -Math.PI / 2)
  assert.equal(c.peck.thrust, 0)
  for (const angle of [Math.PI, Math.PI / 3, -Math.PI / 4, 0]) {
    step(c, { fire: true }, angle)
    assert.equal(c.peck.angle, angle)
    assert.equal(c.targets[0].hp, hp)
  }
})

test('new defaults migrate old untouched Bicada values and preserve saved custom parameters', () => {
  const previous = globalThis.window
  let saved = { _v: 3, peck: { meleeRange: 105, meleeArc: 30, meleeCooldown: 0.4, meleeTime: 0.24 } }
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
  try {
    const d = loadItems().peck
    assert.deepEqual([d.peckPull, d.meleeDamage, d.meleeRange, d.meleeArc, d.meleeCooldown, d.meleeTime, d.meleePush], [38, 12, 85, 160, 0.1, 0.16, 220])
    saved.peck = { meleeRange: 120, meleeArc: 90, meleeCooldown: 0.25, meleeTime: 0.3 }
    const custom = loadItems().peck
    for (const [key, value] of Object.entries(saved.peck)) assert.equal(custom[key], value)
    saved = { _v: 4, peck: { meleeRange: 105, meleeArc: 30, meleeCooldown: 0.4, meleeTime: 0.24 } }
    const recent = loadItems().peck
    for (const [key, value] of Object.entries(saved.peck)) assert.equal(recent[key], value)
  } finally { globalThis.window = previous }
})

test('the Bicada hit area picks up a new item it touches beyond her body reach, without equipping it', () => {
  const c = createCombat()
  const reach = DEFAULT_ITEMS.peck.meleeRange
  assert.ok(reach - 4 > 70, 'the test item has to be out of body reach')
  c.pickups.push({ id: 911, owned: { item: 'flute', ammo: 12, durability: 0 }, x: reach - 4, y: 14, vy: 0, resting: true, noPick: 0 })
  c.pickups.push({ id: 912, owned: { item: 'rifle', ammo: 45, durability: 0 }, x: -(reach - 4), y: 14, vy: 0, resting: true, noPick: 0 })
  hold(c)
  assert.equal(c.pickups.length, 2)
  finish(c)
  assert.deepEqual(c.inventory.filter(Boolean).map(o => o.item), ['flute'])
  assert.equal(c.held, null, 'hands stay empty')
  assert.deepEqual(c.pickups.map(p => p.id), [912], 'the item behind her stays')
  assert.ok(c.peckZone === null)
})

test('letting a Bicada go also stores the item offered at her body', () => {
  const c = createCombat()
  c.pickups.push({ id: 913, owned: { item: 'flute', ammo: 12, durability: 0 }, x: -30, y: 0, vy: 0, resting: true, noPick: 0 })
  hold(c)
  assert.equal(c.pickups.length, 1, 'holding Fire does not take it')
  step(c)
  assert.deepEqual(c.inventory.filter(Boolean).map(o => o.item), ['flute'])
  assert.equal(c.held, null)
  assert.ok(c.peckZone, 'the peck still goes out')
})

test('the Bicada chips the Grade de blocos like a wing blow, once per peck, with its own damage', () => {
  const c = createCombat(), blows = []
  c.setMine({ note: () => null, shot: () => null, blast: () => {}, shock: () => {}, blow: (x, y, angle, arc, reach, damage, music, by) => blows.push({ x, y, angle, reach, damage, music, by }) })
  hold(c, 0.5); assert.equal(blows.length, 0)
  step(c, {}, 0.5); finish(c)
  assert.deepEqual(blows, [{ x: 0, y: 0, angle: 0.5, reach: DEFAULT_ITEMS.peck.meleeRange, damage: DEFAULT_ITEMS.peck.meleeDamage, music: false, by: 'p1' }])
})
