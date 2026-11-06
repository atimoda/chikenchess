const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
const swing = loadTs('lib/pigchicken/swing.ts')
const temple = loadTs('lib/pigchicken/temple.ts')
const music = loadTs('lib/pigchicken/music.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, dt = 0.016) {
  c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
}
const run = (c, s) => { for (let t = 0; t < s; t += 0.016) step(c) }

test('a swing goes through preparação, golpe, continuação and recuperação', () => {
  const time = 0.4
  assert.equal(swing.swingPhase(0.05, time).phase, 'prep')
  assert.equal(swing.swingPhase(0.11, time).phase, 'strike')
  assert.equal(swing.swingPhase(0.15, time).phase, 'follow')
  assert.equal(swing.swingPhase(0.3, time).phase, 'recover')
  assert.equal(swing.swingPhase(0.41, time).phase, 'done')
  const sweep = Math.PI / 2
  assert.ok(swing.swingProgress(0.09, time, sweep) < 0, 'winds back first')
  assert.ok(Math.abs(swing.swingProgress(0.14, time, sweep) - sweep) < 1e-9, 'the golpe covers the arc')
  assert.ok(swing.swingProgress(0.3, time, sweep) > sweep, 'and carries on past it')
  const sw = { angle: 0, arc: sweep, dir: 1, kind: 'down', t: 0.02, time, range: 80 }
  assert.ok(swing.swingPose(sw).blend > 0 && swing.swingPose(sw).blend < 1)
  assert.equal(swing.swingPose({ ...sw, t: 0.12 }).blend, 1)
  assert.equal(swing.swingPose({ ...sw, t: 0.5 }).blend, 0)
})

test('the horizontal blow passes behind her and then in front', () => {
  const sw = { angle: 0, arc: Math.PI / 2, dir: 1, kind: 'flat', time: 0.4, range: 80 }
  assert.equal(swing.swingPose({ ...sw, t: 0.1 }).behind, true)
  assert.equal(swing.swingPose({ ...sw, t: 0.3 }).behind, false)
})

test('the blow hits when the golpe starts, not when the button is pressed', () => {
  const c = createCombat(); c.addTarget(60, 30)
  const t = c.targets[0], hp = t.hp
  step(c, { melee: true })
  assert.equal(t.hp, hp)
  assert.equal(c.swing.hit, false)
  run(c, DEFAULT_ITEMS.wing.meleeTime * swing.SWING_PHASES.prep + 0.02)
  assert.equal(t.hp, hp - DEFAULT_ITEMS.wing.meleeDamage)
  assert.ok(c.swing.hits === 1 && c.swing.impacts.length === 1)
})

test('blows in a row go down, up, horizontal and spin, and start over after a pause', () => {
  const c = createCombat()
  const kinds = []
  for (let i = 0; i < 5; i++) { step(c, { melee: true }); kinds.push(c.swing.kind); run(c, DEFAULT_ITEMS.wing.meleeCooldown + 0.02) }
  assert.deepEqual(kinds, ['down', 'up', 'flat', 'spin', 'down'])
  run(c, 1.5)
  step(c, { melee: true })
  assert.equal(c.swing.kind, 'down')
})

test('the spin hits all around her', () => {
  const c = createCombat()
  for (let i = 0; i < 3; i++) { step(c, { melee: true }); run(c, DEFAULT_ITEMS.wing.meleeCooldown + 0.02) }
  c.addTarget(-60, 30)
  const t = c.targets[0], hp = t.hp
  step(c, { melee: true })
  assert.equal(c.swing.kind, 'spin')
  run(c, 0.1)
  assert.equal(t.hp, hp - DEFAULT_ITEMS.wing.meleeDamage)
})

test("the trail is the item's: thickness, colour, duration, curls; an instrument tints it with the chord", () => {
  const c = createCombat()
  c.give('pistol'); step(c, { slot: 1 })
  step(c, { melee: true })
  assert.equal(c.swing.trail.color, DEFAULT_ITEMS.pistol.trailColor)
  assert.equal(c.swing.trail.width, DEFAULT_ITEMS.pistol.trailWidth)
  const g = createCombat(); g.give('guitar'); step(g, { slot: 1 })
  step(g, { melee: true })
  assert.notEqual(g.swing.trail.color, DEFAULT_ITEMS.guitar.trailColor)
  // the swing stays until the trail has dissolved, but the wing is back at rest when the move ends
  assert.equal(c.swing.life, swing.swingLife(c.swing.time, c.swing.trail.time))
})

test('a peck cancels a damaging projectile in its cone, in a little cloud', () => {
  const c = createCombat()
  assert.equal(c.parry(50, 0), false)
  step(c, { fire: true, firePressed: true })
  for (let i = 0; i < 8; i++) step(c, { fire: true })
  step(c) // let go: the beak goes out
  step(c); step(c)
  assert.equal(c.parry(-60, 0), false, 'not behind her')
  assert.equal(c.parry(60, 0), true)
  run(c, 0.02)
  assert.equal(c.puffs.length, 1)
  run(c, 0.6)
  assert.equal(c.puffs.length, 0)
  assert.equal(c.parry(60, 0), false, 'only while the beak is out')
})

test('a temple bomb a peck cancels does not hurt her', () => {
  const t = temple.createTemple(7)
  const conductor = music.createConductor()
  const targets = [], sounds = []
  let hurt = 0
  const io = (over = {}) => ({
    targets, music: conductor, sceneL: 1920, groundY: 930, inside: true, body: { x: 2220, y: 930, scale: 1 }, boxes: [],
    gongHit: false, firePressed: false, beats: [], fx: { burst() {}, text() {} }, hurt() { hurt++ }, sound: s => sounds.push(s), ...over,
  })
  for (let i = 0; i < 5; i++) { conductor.step(1 / 60); t.step(1 / 60, io({ gongHit: true })) }
  for (let i = 0; i < 60 * 4; i++) { conductor.step(1 / 60); t.step(1 / 60, io({ parry: () => false })) }
  t.state.bombs.length = 0; t.state.invuln = 0
  const hearts = t.state.hearts
  t.state.bombs.push({ x: 2220, y: 900, vx: 0, vy: 0, kind: 'orb', t: 0 })
  t.step(1 / 60, io({ parry: () => true }))
  assert.equal(t.state.bombs.length, 0)
  assert.equal(t.state.hearts, hearts)
  assert.equal(hurt, 0)
})

test('each item has its own combo: order, window and the hit arc of each blow', () => {
  const c = createCombat()
  const items = structuredClone(DEFAULT_ITEMS)
  items.wing.combo = ['spin', 'flat']
  items.wing.comboWindow = 0.1
  items.wing.meleeArcFlat = 300
  c.setItems(items)
  const kinds = []
  for (let i = 0; i < 3; i++) { step(c, { melee: true }); kinds.push(c.swing.kind); run(c, items.wing.meleeTime + 0.15) }
  // 0.15 s after each blow ends: longer than the 0.1 s window, so every blow starts over
  assert.deepEqual(kinds, ['spin', 'spin', 'spin'])
  items.wing.comboWindow = 0.5; c.setItems(items)
  run(c, 1)
  kinds.length = 0
  for (let i = 0; i < 3; i++) { step(c, { melee: true }); kinds.push([c.swing.kind, Math.round(c.swing.arc * 180 / Math.PI)]); run(c, items.wing.meleeCooldown + 0.02) }
  assert.deepEqual(kinds, [['spin', 360], ['flat', 300], ['spin', 360]])
})

test('the combo order is saved and checked when loading', () => {
  const { loadItems } = loadTs('lib/pigchicken/items.ts')
  const previous = globalThis.window
  try {
    let saved = { _v: 4, pistol: { combo: ['up', 'spin'], comboWindow: 0.8, meleeArcUp: 200 }, smg: { combo: ['up', 'nope'] }, rifle: { combo: [] } }
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const it = loadItems()
    assert.deepEqual(it.pistol.combo, ['up', 'spin'])
    assert.equal(it.pistol.comboWindow, 0.8); assert.equal(it.pistol.meleeArcUp, 200)
    assert.deepEqual(it.smg.combo, DEFAULT_ITEMS.smg.combo)
    assert.deepEqual(it.rifle.combo, DEFAULT_ITEMS.rifle.combo)
  } finally { globalThis.window = previous }
})

test('golpes have no interval: a new blow interrupts the one still going and starts right away', () => {
  for (const id of Object.keys(DEFAULT_ITEMS)) if (id !== 'peck') assert.equal(DEFAULT_ITEMS[id].meleeCooldown, 0, id)
  const c = createCombat(); c.addTarget(60, 30)
  const t = c.targets[0], hp = t.hp
  step(c, { melee: true })
  const first = c.swing
  step(c, { melee: true })
  assert.notEqual(c.swing, first, 'a new swing, in the middle of the first one')
  assert.equal(c.swing.kind, 'up', 'and the combo carries on')
  assert.ok(c.swing.t < 0.02)
  run(c, DEFAULT_ITEMS.wing.meleeTime * swing.SWING_PHASES.prep + 0.02)
  assert.equal(t.hp, hp - DEFAULT_ITEMS.wing.meleeDamage, 'only the new blow lands')
})

test('items saved with an interval between blows go back to none (the Bicada keeps its own)', () => {
  const { loadItems } = loadTs('lib/pigchicken/items.ts')
  const previous = globalThis.window
  try {
    let saved = { _v: 4, pistol: { meleeCooldown: 0.45 }, wing: { meleeCooldown: 0.8 }, peck: { meleeCooldown: 0.3 } }
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let it = loadItems()
    assert.deepEqual([it.pistol.meleeCooldown, it.wing.meleeCooldown, it.peck.meleeCooldown], [0, 0, 0.3])
    saved = { ...saved, _v: 5 }
    it = loadItems()
    assert.deepEqual([it.pistol.meleeCooldown, it.wing.meleeCooldown], [0.45, 0.8], 'set again after the change, it stays')
  } finally { globalThis.window = previous }
})

test('an item can turn the interruption off: a blow pressed mid-move then waits for it to end', () => {
  assert.ok(Object.values(DEFAULT_ITEMS).every(d => d.meleeInterrupt === true))
  const c = createCombat()
  const items = structuredClone(DEFAULT_ITEMS)
  items.wing.meleeInterrupt = false
  c.setItems(items)
  step(c, { melee: true })
  const first = c.swing
  step(c, { melee: true })
  assert.equal(c.swing, first, 'still the first blow')
  run(c, items.wing.meleeTime)
  step(c, { melee: true })
  assert.notEqual(c.swing, first, 'once it is over, the next one goes')
})
