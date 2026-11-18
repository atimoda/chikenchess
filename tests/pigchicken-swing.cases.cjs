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
// a combo blow with the plain duration, block and reach
const blow = (kind, arc, more = {}) => ({ ...swing.comboBlow(kind, arc), ...more })

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
  items.wing.combo = [blow('spin', 360), blow('flat', 300)]
  items.wing.comboWindow = 0.1
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

test('two blows of the same direction can cover different angles', () => {
  const c = createCombat()
  const items = structuredClone(DEFAULT_ITEMS)
  items.wing.combo = [blow('down', 45), blow('down', 270), blow('up', 90)]
  c.setItems(items)
  const got = []
  for (let i = 0; i < 4; i++) { step(c, { melee: true }); got.push([c.swing.kind, Math.round(c.swing.arc * 180 / Math.PI)]); run(c, 0.02) }
  assert.deepEqual(got, [['down', 45], ['down', 270], ['up', 90], ['down', 45]])
})

test('the default combos keep the arcs the blows had before each one had its own', () => {
  const arcs = id => DEFAULT_ITEMS[id].combo.map(s => `${s.kind}:${s.arc}`).join()
  assert.equal(arcs('wing'), 'down:120,up:120,flat:120,spin:360')
  assert.equal(arcs('pistol'), 'down:110,up:110,flat:110,spin:360')
  assert.equal(arcs('bat'), 'down:150,up:150,flat:200,spin:360')
  assert.equal(arcs('passagua'), 'down:150,up:150,flat:190,spin:360')
  assert.equal(arcs('mjolnir'), 'down:150,up:150,flat:200,spin:360')
  for (const d of Object.values(DEFAULT_ITEMS)) assert.ok(!('meleeArcUp' in d) && !('meleeArcFlat' in d), d.id)
})

test('the combo is saved and checked when loading; older saves get their arcs per direction', () => {
  const { loadItems } = loadTs('lib/pigchicken/items.ts')
  const previous = globalThis.window
  try {
    let saved = { _v: 4, pistol: { combo: ['up', 'spin', 'down'], comboWindow: 0.8, meleeArc: 60, meleeArcUp: 200 }, smg: { combo: ['up', 'nope'] }, rifle: { combo: [] }, bat: { meleeArcFlat: 250 } }
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let it = loadItems()
    assert.deepEqual(it.pistol.combo, [blow('up', 200), blow('spin', 360), blow('down', 60)])
    assert.equal(it.pistol.comboWindow, 0.8)
    assert.deepEqual(it.smg.combo, DEFAULT_ITEMS.smg.combo)
    assert.deepEqual(it.rifle.combo, DEFAULT_ITEMS.rifle.combo)
    assert.deepEqual(it.bat.combo.map(s => s.arc), [150, 150, 250, 360], 'an old arc with no combo saved goes to the default order')
    saved = { _v: 10, pistol: { combo: [{ kind: 'flat', arc: 500 }, { kind: 'spin', arc: 90 }, { kind: 'up', arc: 135 }] }, smg: { combo: [{ kind: 'up' }] }, rifle: { combo: ['up'] } }
    it = loadItems()
    assert.deepEqual(it.pistol.combo, [blow('flat', 360), blow('spin', 360), blow('up', 135)])
    assert.deepEqual(it.smg.combo, DEFAULT_ITEMS.smg.combo, 'a blow with no angle is not a combo')
    assert.deepEqual(it.rifle.combo, [blow('up', 110)], 'a bare direction takes the item\'s arc for it')
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

// Golpe with Atirar held: the blow interrupts firing and a held Atirar fires again once it ends
const armedWith = (id) => { const c = createCombat(); c.give(id); step(c, { slot: 1 }); return c }

test('point-and-click Golpe: on by default, the reach of the next blow, null when the item turns it off', () => {
  assert.ok(Object.values(DEFAULT_ITEMS).every(d => d.pointClick === true))
  const c = createCombat()
  const items = structuredClone(DEFAULT_ITEMS)
  c.setItems(items)
  step(c)
  const w = items.wing, first = w.combo[0]
  assert.equal(c.pointClickReach(1), w.meleeRange * first.reach, 'empty hand: the wing alone')
  const armed = armedWith('pistol')
  const p = DEFAULT_ITEMS.pistol
  assert.equal(armed.pointClickReach(2), p.meleeRange * p.combo[0].reach + p.length * 2 * p.combo[0].reach, 'the item reaches its length further')
  items.wing.pointClick = false
  c.setItems(items)
  assert.equal(c.pointClickReach(1), null)
})

const ammo = (c) => c.inventory[0].ammo
const hold = (c, s, extra = {}) => { for (let t = 0; t < s; t += 0.016) step(c, { fire: true, ...extra }) }

test('a Golpe pressed while an automatic weapon fires stops the shots until it ends, then they go on', () => {
  const c = armedWith('smg')
  step(c, { fire: true, firePressed: true }); hold(c, 0.1)
  assert.ok(ammo(c) < DEFAULT_ITEMS.smg.mag, 'firing')
  step(c, { fire: true, melee: true })
  assert.ok(c.swing, 'the blow starts with Atirar held')
  const during = ammo(c)
  hold(c, DEFAULT_ITEMS.smg.meleeTime - 0.04)
  assert.equal(ammo(c), during, 'no shot while the blow moves')
  hold(c, 0.2)
  assert.ok(ammo(c) < during, 'still held when it ends: firing again')
})

test('after the Golpe a held semi-automatic shoots again once; letting go during the blow does not', () => {
  const c = armedWith('pistol')
  step(c, { fire: true, firePressed: true })
  const first = ammo(c)
  step(c, { fire: true, melee: true }); hold(c, DEFAULT_ITEMS.pistol.meleeTime + 0.05)
  assert.equal(ammo(c), first - 1, 'one new shot when the blow ends')
  hold(c, 0.3)
  assert.equal(ammo(c), first - 1, 'held, it does not keep shooting (semi)')
  const g = armedWith('pistol')
  step(g, { fire: true, firePressed: true })
  const left = ammo(g)
  step(g, { fire: true, melee: true }); hold(g, 0.05)
  run(g, DEFAULT_ITEMS.pistol.meleeTime + 0.1)
  assert.equal(ammo(g), left, 'released during the blow: nothing fires')
})

test('a Golpe cancels a charge without shooting it, and a held button charges again afterwards', () => {
  // (the Pandeiro: the Granada never runs out, so its ammo would not tell a throw)
  const c = armedWith('tambourine')
  step(c, { fire: true, firePressed: true }); hold(c, 0.3)
  assert.ok(c.fireCharge > 0)
  const before = ammo(c)
  step(c, { fire: true, melee: true }); step(c, { fire: true })
  assert.equal(c.fireCharge, 0, 'charge called off')
  assert.equal(ammo(c), before, 'and nothing thrown')
  hold(c, DEFAULT_ITEMS.tambourine.meleeTime + 0.1)
  assert.ok(c.fireCharge > 0, 'charging again')
  step(c)
  assert.equal(ammo(c), before - 1, 'let go: it throws')
})

test('each combo blow has its own duration, reach and block on the next blow', () => {
  const c = createCombat()
  const items = structuredClone(DEFAULT_ITEMS)
  items.wing.combo = [blow('down', 90, { time: 2, reach: 1.5 }), blow('up', 90, { cooldown: 0.5 }), blow('flat', 90)]
  c.setItems(items)
  step(c, { melee: true })
  assert.ok(Math.abs(c.swing.time - items.wing.meleeTime * 2) < 1e-9, 'twice as slow')
  assert.ok(Math.abs(c.swing.reach - items.wing.meleeRange * 1.5) < 1e-9, 'and reaching further')
  step(c, { melee: true })
  assert.equal(c.swing.kind, 'up')
  assert.ok(Math.abs(c.swing.time - items.wing.meleeTime) < 1e-9 && Math.abs(c.swing.reach - items.wing.meleeRange) < 1e-9)
  // blocked for 0.5 s from the start of the second blow: pressing does nothing, and the window does not run out meanwhile
  run(c, 0.3); step(c, { melee: true })
  assert.equal(c.swing?.kind ?? 'up', 'up')
  assert.equal(c.swing?.combo ?? 1, 1)
  run(c, 0.25); step(c, { melee: true })
  assert.equal(c.swing.kind, 'flat', 'the combo carries on once the block ends')
})

test('an item\'s reach multiplier stretches the wing and the item together', () => {
  const c = createCombat(); c.give('bat')
  const items = structuredClone(DEFAULT_ITEMS)
  items.bat.combo = [blow('down', 150, { reach: 2 })]
  c.setItems(items)
  step(c, { melee: true })
  assert.ok(Math.abs(c.swing.reach - (items.bat.meleeRange + items.bat.length) * 2) < 1e-9)
})

test('a blow relative to the aim goes up when she aims above the horizon and down otherwise', () => {
  assert.equal(swing.blowKind('aim', -0.4), 'up')
  assert.equal(swing.blowKind('aim', 0.4), 'down')
  assert.equal(swing.blowKind('aim', 0), 'down')
  assert.equal(swing.blowKind('aim', Math.PI + 0.3), 'up', 'aiming left and up')
  assert.equal(swing.blowKind('flat', -1), 'flat')
  const c = createCombat()
  const items = structuredClone(DEFAULT_ITEMS)
  items.wing.combo = [blow('aim', 100)]
  c.setItems(items)
  step(c, {}, -0.5); step(c, { melee: true }, -0.5)
  assert.deepEqual([c.swing.kind, c.swing.dir], ['up', -1])
  step(c, {}, 0.5); step(c, { melee: true }, 0.5)
  assert.deepEqual([c.swing.kind, c.swing.dir], ['down', 1])
})

test('the strong blow can be relative to the aim too', () => {
  const c = createCombat(); c.give('bat')
  const items = structuredClone(DEFAULT_ITEMS)
  items.bat.heavyKind = 'aim'
  c.setItems(items)
  step(c, { fire: true, firePressed: true }, -0.6)
  for (let t = 0; t < 0.3; t += 0.016) step(c, { fire: true }, -0.6)
  step(c, {}, -0.6)
  assert.ok(c.swing?.heavy, 'the strong blow left')
  assert.equal(c.swing.kind, 'up')
})

test('saved blows keep their duration, block and reach inside the limits; older ones get the plain numbers', () => {
  const { loadItems } = loadTs('lib/pigchicken/items.ts')
  const previous = globalThis.window
  try {
    const saved = { _v: 10, pistol: { heavyKind: 'aim', combo: [{ kind: 'aim', arc: 90, time: 9, cooldown: -1, reach: 1.5 }, { kind: 'up', arc: 135 }, { kind: 'down', arc: 60, time: 'x' }] } }
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const it = loadItems()
    assert.deepEqual(it.pistol.combo, [blow('aim', 90, { time: 4, cooldown: 0, reach: 1.5 }), blow('up', 135), blow('down', 60)])
    assert.equal(it.pistol.heavyKind, 'aim')
    for (const d of Object.values(DEFAULT_ITEMS)) for (const s of d.combo) assert.deepEqual([s.time, s.cooldown, s.reach], [1, 0, 1], d.id)
  } finally { globalThis.window = previous }
})

test('the combo window bar hears the main player\'s blows only while something listens', () => {
  const c = createCombat()
  const items = structuredClone(DEFAULT_ITEMS)
  items.wing.combo = [blow('down', 90, { cooldown: 0.6 })]; items.wing.comboWindow = 0.7
  c.setItems(items)
  const heard = []
  const stop = swing.subscribeComboBlow(e => heard.push(e))
  step(c, { melee: true })
  assert.deepEqual(heard, [{ busy: 0.6, window: 0.7 }])
  stop()
  run(c, 1); step(c, { melee: true })
  assert.equal(heard.length, 1)
})
