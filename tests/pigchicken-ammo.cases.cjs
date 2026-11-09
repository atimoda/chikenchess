const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS, WEAPON_IDS, INSTRUMENT_IDS, MELEE_IDS, loadItems } = loadTs('lib/pigchicken/items.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const step = (c, over = {}, dt = 0.016) => c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...over }, [], 1000, () => {})
const wait = (c, s) => { for (let t = 0; t < s - 1e-9; t += 0.01) step(c, {}, 0.01) }
const press = c => { step(c, { fire: true, firePressed: true }); step(c, {}); wait(c, 0.3) }

test('weapons and instruments never break; instruments and the taco refill gradually, guns do not', () => {
  for (const id of [...MELEE_IDS, ...WEAPON_IDS, ...INSTRUMENT_IDS]) assert.equal(DEFAULT_ITEMS[id].durability, 0, id)
  for (const id of INSTRUMENT_IDS) { assert.ok(DEFAULT_ITEMS[id].refillTime > 0, id); assert.equal(DEFAULT_ITEMS[id].autoReload, true, id) }
  for (const id of WEAPON_IDS) assert.equal(DEFAULT_ITEMS[id].refillTime, 0, id)
  for (const id of [...MELEE_IDS, ...WEAPON_IDS, ...INSTRUMENT_IDS]) assert.ok(DEFAULT_ITEMS[id].refillAmount >= 1, id)
  const bat = DEFAULT_ITEMS.bat
  assert.deepEqual([bat.meleeOnly, bat.mag, bat.autoReload, bat.refillTime], [true, 8, true, 0.5])
})

test('weapon and instrument defaults match the live PigChicken tuning', () => {
  for (const id of ['pistol', 'smg', 'rifle', 'pump', 'sniper', 'launcher', 'flute', 'sax', 'trumpet', 'guitar', 'violin']) {
    assert.equal(DEFAULT_ITEMS[id].chargeTime, 0.1, `${id} charge`)
  }
  assert.equal(DEFAULT_ITEMS.sniper.speed, 4000)
  assert.equal(DEFAULT_ITEMS.grenade.range, 3000)
  assert.deepEqual([DEFAULT_ITEMS.flute.rate, DEFAULT_ITEMS.flute.mag, DEFAULT_ITEMS.flute.throwCharge], [13, 60, 0.3])
  assert.deepEqual([DEFAULT_ITEMS.sax.burst, DEFAULT_ITEMS.sax.recoilPush, DEFAULT_ITEMS.sax.weight, DEFAULT_ITEMS.sax.turnRate], [6, 100, 0.75, 120])
  assert.deepEqual([DEFAULT_ITEMS.trumpet.reloadTime, DEFAULT_ITEMS.trumpet.refillTime, DEFAULT_ITEMS.trumpet.recoilPush], [0.2, 0.25, 790])
  assert.deepEqual([DEFAULT_ITEMS.guitar.rate, DEFAULT_ITEMS.guitar.burst, DEFAULT_ITEMS.guitar.mag, DEFAULT_ITEMS.guitar.reloadTime, DEFAULT_ITEMS.guitar.refillTime, DEFAULT_ITEMS.guitar.refillAmount, DEFAULT_ITEMS.guitar.range, DEFAULT_ITEMS.guitar.pellets, DEFAULT_ITEMS.guitar.spreadBase, DEFAULT_ITEMS.guitar.turnRate], [17, 5, 60, 0.2, 0.55, 4, 850, 2, 20, 0])
  assert.deepEqual([DEFAULT_ITEMS.violin.speed, DEFAULT_ITEMS.violin.weight, DEFAULT_ITEMS.violin.turnRate], [4000, 0.6, 420])
  assert.deepEqual([DEFAULT_ITEMS.keys.rate, DEFAULT_ITEMS.keys.burst, DEFAULT_ITEMS.keys.chargeTime, DEFAULT_ITEMS.keys.mag, DEFAULT_ITEMS.keys.size, DEFAULT_ITEMS.keys.hitscan], [1, 4, 0.25, 33, 12, true])
  assert.deepEqual([DEFAULT_ITEMS.tambourine.range, DEFAULT_ITEMS.tambourine.size], [3000, 12])
})

test('gradual auto reload: one shot back per interval while not playing, firing restarts the count', () => {
  const c = createCombat(); c.give('flute')
  const mag = DEFAULT_ITEMS.flute.mag
  press(c); press(c); press(c)
  // three shots, each followed by 0.3 s of rest: not enough for a refill in between
  assert.equal(c.held.ammo, mag - 3)
  wait(c, 0.25); assert.equal(c.held.ammo, mag - 2)
  wait(c, 0.5); assert.equal(c.held.ammo, mag - 1)
  wait(c, 2); assert.equal(c.held.ammo, mag)
})

test('guns keep their manual magazine: no gradual reload by default', () => {
  const c = createCombat(); c.give('pistol')
  press(c); press(c)
  wait(c, 3)
  assert.equal(c.held.ammo, DEFAULT_ITEMS.pistol.mag - 2)
})

test('the taco spends one blow per swing; empty it clicks dry and reloads on its own', () => {
  const items = structuredClone(DEFAULT_ITEMS); items.bat.refillTime = 0
  const c = createCombat(); c.setItems(items); c.give('bat')
  for (let i = 0; i < 8; i++) { step(c, { melee: true }); wait(c, 0.4) }
  assert.equal(c.held.ammo, 0)
  assert.ok(c.reloading > 0)
  c.sounds.length = 0
  step(c, { fire: true, firePressed: true })
  assert.ok(c.sounds.some(s => s.kind === 'dry'))
  assert.ok(!c.sounds.some(s => s.kind === 'swing'), 'no new swing while reloading')
  wait(c, items.bat.reloadTime + 0.1)
  assert.equal(c.held.ammo, 8)
})

test('items saved before v6 take the new defaults unless they were tuned', () => {
  const previous = globalThis.window
  let saved = { _v: 5, pistol: { durability: 40 }, flute: { durability: 30 }, bat: { mag: 0, reloadTime: 1.1 } }
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
  try {
    const out = loadItems()
    assert.equal(out.pistol.durability, 0)
    assert.equal(out.flute.durability, 30)
    assert.equal(out.bat.mag, 8); assert.equal(out.bat.reloadTime, DEFAULT_ITEMS.bat.reloadTime)
    saved = { _v: 6, pistol: { durability: 40 }, bat: { mag: 0 } }
    const now = loadItems()
    assert.equal(now.pistol.durability, 40); assert.equal(now.bat.mag, 0)
  } finally { globalThis.window = previous }
})
