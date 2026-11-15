const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const items = loadTs('lib/pigchicken/items.ts')
const { DEFAULT_ITEMS, MELEE_IDS, isStaff } = items
const pose = loadTs('lib/pigchicken/staff-pose.ts')
const { heldItemPose } = loadTs('lib/pigchicken/held-pose.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const DT = 0.01
function step(c, input = {}, angle = 0) {
  c.step(DT, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
}
const run = (c, s, input = {}) => { for (let t = 0; t < s - 1e-9; t += DT) step(c, input) }
function holding(item, change) {
  const set = structuredClone(DEFAULT_ITEMS)
  if (change) change(set[item])
  const c = createCombat()
  c.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} })
  c.setItems(set); c.give(item); step(c, { slot: 1 })
  return { c, d: set[item] }
}
// Atirar held for `s` seconds, then let go
const charge = (c, s) => { step(c, { fire: true, firePressed: true }); run(c, s, { fire: true }); step(c) }
const alien = (c, x = 60, hp = 500) => { const t = { id: 900 + c.targets.length, kind: 'alien', home: 0, x, y: 15, w: 40, h: 30, hp, maxHp: hp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'fly', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#c77dff' } }; c.targets.push(t); return t }

test('the staffs are the items only for hitting; the others have no strong blow', () => {
  assert.deepEqual(Object.keys(DEFAULT_ITEMS).filter(id => isStaff(DEFAULT_ITEMS[id])).sort(), MELEE_IDS.slice().sort())
  const c = createCombat(); c.give('pistol'); step(c, { slot: 1 })
  step(c, { fire: true, firePressed: true })
  assert.equal(c.heavyCharging, false)
})

test('Atirar with a staff charges while held and hits only when let go', () => {
  const { c, d } = holding('bat')
  step(c, { fire: true, firePressed: true })
  assert.equal(c.swing, null, 'a press does not hit')
  assert.equal(c.heavyCharging, true)
  run(c, d.heavyCharge / 2, { fire: true })
  assert.equal(c.swing, null)
  assert.ok(Math.abs(c.heavyCharge - 0.5) < 0.03, 'half of the charge')
  step(c)
  assert.ok(c.swing && c.swing.heavy, 'the strong blow leaves on the release')
  assert.equal(c.heavyCharging, false)
  assert.equal(c.swing.kind, d.heavyKind)
  assert.equal(c.swing.time, d.heavyTime)
  assert.equal(c.swing.damage, d.heavyDamage)
  assert.equal(c.swing.push, d.heavyPush)
})

test('the longer the charge, the further and the bigger, up to the limits of the item', () => {
  const reach = s => { const { c } = holding('bat'); charge(c, s); return c.swing }
  const d = DEFAULT_ITEMS.bat
  const tap = reach(0), half = reach(d.heavyCharge / 2), full = reach(d.heavyCharge), over = reach(d.heavyCharge * 3)
  assert.ok(tap.charge < 0.05 && Math.abs(tap.range - d.heavyRange) < 2, 'a tap: its own reach')
  assert.ok(Math.abs(tap.size - 1) < 0.02)
  assert.ok(half.range > tap.range && half.range < full.range)
  assert.ok(half.size > tap.size && half.size < full.size)
  assert.ok(Math.abs(full.range - d.heavyRange * d.heavyReachMax) < 1e-6)
  assert.ok(Math.abs(full.size - d.heavySizeMax) < 1e-6)
  assert.ok(Math.abs(full.reach - (d.heavyRange * d.heavyReachMax + d.length * d.heavySizeMax)) < 1e-6, 'the staff is bigger too')
  assert.ok(Math.abs(full.trail.width - d.heavyTrailWidth * d.heavySizeMax) < 1e-6)
  assert.equal(over.range, full.range, 'never past the limit')
  assert.equal(over.size, full.size)
  // limits of 1 make the charge change nothing
  const { c } = holding('bat', b => { b.heavyReachMax = 1; b.heavySizeMax = 1 })
  charge(c, d.heavyCharge)
  assert.equal(c.swing.range, d.heavyRange)
  assert.equal(c.swing.size, 1)
})

test('the strong blow has its own numbers; Golpe keeps the quick blow and its combo', () => {
  const { c, d } = holding('bat', b => { b.heavyDamage = 77; b.heavyPush = 900; b.heavyArc = 90; b.heavyKind = 'spin' })
  const t = alien(c)
  step(c, { melee: true })
  assert.ok(c.swing && !c.swing.heavy)
  assert.equal(c.swing.kind, d.combo[0].kind)
  assert.equal(c.swing.time, d.meleeTime)
  run(c, d.meleeTime + 0.05)
  assert.equal(t.hp, 500 - d.meleeDamage)
  charge(c, 0.1)
  assert.equal(c.swing.kind, 'spin')
  assert.equal(c.swing.arc, Math.PI * 2)
  run(c, d.heavyTime)
  assert.equal(t.hp, 500 - d.meleeDamage - 77)
  // the quick blow after a strong one starts its combo over
  run(c, d.heavyCooldown + 0.05)
  step(c, { melee: true })
  assert.equal(c.swing.kind, d.combo[0].kind)
})

test('Golpe, another item, empty hands and the interface call the charge off without hitting', () => {
  let h = holding('bat')
  step(h.c, { fire: true, firePressed: true }); run(h.c, 0.2, { fire: true })
  step(h.c, { fire: true, melee: true })
  assert.ok(h.c.swing && !h.c.swing.heavy, 'the quick blow comes out')
  assert.equal(h.c.heavyCharging, false)
  run(h.c, h.d.meleeTime + 0.3, { fire: true })
  step(h.c)
  assert.equal(h.c.swing, null, 'letting go afterwards hits nothing')

  h = holding('bat'); h.c.give('pistol')
  step(h.c, { slot: h.c.inventory.findIndex(o => o && o.item === 'bat') + 1 })
  step(h.c, { fire: true, firePressed: true }); run(h.c, 0.2, { fire: true })
  step(h.c, { fire: true, slot: h.c.inventory.findIndex(o => o && o.item === 'pistol') + 1 })
  assert.equal(h.c.heavyCharging, false)
  step(h.c, { slot: h.c.inventory.findIndex(o => o && o.item === 'bat') + 1 })
  step(h.c)
  assert.ok(!h.c.swing || !h.c.swing.heavy, 'back on the staff with the button let go: no strong blow')

  h = holding('bat')
  step(h.c, { fire: true, firePressed: true }); run(h.c, 0.2, { fire: true })
  step(h.c, { cancelFire: true })
  assert.equal(h.c.swing, null)
  assert.equal(h.c.heavyCharging, false)

  h = holding('bat')
  step(h.c, { fire: true, firePressed: true }); run(h.c, 0.2, { fire: true })
  step(h.c, { fire: true, deselect: true })
  step(h.c)
  assert.equal(h.c.swing, null)
})

test('a strong blow of the taco spends one blow when it leaves; empty, it clicks dry and does not charge', () => {
  const { c, d } = holding('bat', b => { b.refillTime = 0; b.mag = 2 })
  step(c, { fire: true, firePressed: true }); run(c, 0.1, { fire: true })
  assert.equal(c.held.ammo, 2, 'charging spends nothing')
  step(c)
  assert.equal(c.held.ammo, 1)
  run(c, d.heavyTime + d.heavyCooldown)
  charge(c, 0.05)
  assert.equal(c.held.ammo, 0)
  run(c, 0.1)
  assert.ok(c.reloading > 0, 'emptied, it reloads on its own')
  c.sounds.length = 0
  step(c, { fire: true, firePressed: true })
  assert.ok(c.sounds.some(s => s.kind === 'dry'))
  assert.equal(c.heavyCharging, false)
})

test('the interval of a strong blow holds the next blow and the next charge', () => {
  const { c, d } = holding('bat', b => { b.heavyCooldown = 0.5; b.heavyTime = 0.2 })
  charge(c, 0.05)
  const first = c.swing
  step(c, { melee: true })
  assert.equal(c.swing, first, 'Golpe waits for the interval')
  step(c, { fire: true, firePressed: true }); run(c, 0.2, { fire: true })
  assert.equal(c.heavyCharge, 0, 'held during the interval: the charge has not started')
  run(c, 0.3 + d.heavyCharge / 2, { fire: true })
  assert.ok(c.heavyCharge > 0.4 && c.heavyCharge < 0.6)
})

test('the Passaguá hurts and pushes what it does not catch, when it has damage', () => {
  // as it comes: no damage, nothing is hurt (and no impact is shown)
  let h = holding('passagua')
  let t = alien(h.c)
  step(h.c, { melee: true }); run(h.c, h.d.meleeTime)
  assert.equal(t.hp, 500); assert.equal(t.vx, 0)
  // 1 of damage and a push: aliens (and zombies, dummies) take both, with the quick blow and with the strong one
  h = holding('passagua', p => { p.meleeDamage = 1; p.meleePush = 300; p.heavyDamage = 5; p.heavyPush = 600 })
  t = alien(h.c)
  step(h.c, { melee: true }); run(h.c, h.d.meleeTime)
  assert.equal(t.hp, 499)
  assert.ok(t.vx > 0, 'pushed away from her')
  const z = { id: 990, kind: 'zombie', home: 0, x: -60, y: 15, w: 40, h: 60, hp: 50, maxHp: 50, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'walk', animT: 0 }
  h.c.targets.push(z)
  run(h.c, 0.2)
  step(h.c, { fire: true, firePressed: true }, Math.PI); step(h.c, {}, Math.PI); for (let i = 0; i < 50; i++) step(h.c, {}, Math.PI)
  assert.equal(z.hp, 45)
  assert.ok(z.vx < 0)
})

test('what the Passaguá catches is caught, never hurt or pushed', () => {
  const { c, d } = holding('passagua', p => { p.meleeDamage = 1; p.meleePush = 300 })
  c.setView(-1000, 1000)
  c.give('cage')
  const bird = { kind: 'bird', x: 40, y: 0, vx: 0, vy: 0, homeX: 40, homeY: 0, color: '#c77dff', t: 0, bird: null }
  c.critters.push(bird)
  const t = alien(c, 60)
  step(c, { melee: true })
  for (let i = 0; i < 40; i++) { bird.x = 40; bird.y = 0; step(c) }
  assert.equal(c.critters.length, 0, 'the bird is caught')
  assert.equal(c.abductions.length + c.capturedSouls, 1)
  assert.equal(t.hp, 499, 'and the alien beside it takes the blow')
  assert.ok(d.meleeTime > 0)
})

test('the staff is carried in its pose and wound back as the strong blow charges', () => {
  const d = DEFAULT_ITEMS.bat
  const rest = pose.staffPose(d, 0)
  assert.deepEqual([rest.x, rest.y, rest.angle, rest.gripX, rest.gripY], [d.staffX, d.staffY, d.staffAngle, d.gripX, d.gripY])
  const full = pose.staffPose(d, 1)
  assert.ok(Math.abs(full.x - d.windX) < 1e-9 && Math.abs(full.y - d.windY) < 1e-9)
  assert.ok(Math.abs(full.angle - d.windAngle) < 1e-9, 'sin(0) = 0: no sway at time 0')
  const half = pose.staffPose(d, 0.5)
  assert.ok(half.x < rest.x && half.x > full.x, 'on its way back')
  assert.ok(pose.windEase(0.5) > 0.5, 'back fast at first')
  // carried, it leans a little with the aim; charged, the whole pose turns with it around her shoulder
  assert.ok(pose.staffPose(d, 0, 1).angle > rest.angle && pose.staffPose(d, 0, -1).angle < rest.angle)
  assert.equal(pose.staffPose(d, 0, 1).x, rest.x)
  const up = pose.staffPose(d, 1, -Math.PI / 2)
  assert.ok(Math.abs(up.x - d.windY) < 1e-9 && Math.abs(up.y + d.windX) < 1e-9, 'a quarter turn')
  assert.ok(Math.abs(up.angle - (d.windAngle - 90)) < 1e-9)
  // it sways while it charges and trembles when full
  assert.notEqual(pose.staffPose(d, 0.5, 0, 200).angle, half.angle)
  assert.equal(pose.staffPose(d, 0, 0, 200).angle, rest.angle)
  // the aim's elevation, in her body's frame
  assert.ok(Math.abs(pose.aimElevation(Math.PI, -1)) < 1e-9)
  assert.ok(pose.aimElevation(-Math.PI / 4, 1) < 0 && pose.aimElevation(-3 * Math.PI / 4, -1) < 0)
  assert.equal(pose.aimElevation(Math.PI, 1), Math.PI / 2 * Math.sign(pose.aimElevation(Math.PI, 1)), 'kept to her front half')
  assert.equal(pose.unwrapAngle(170, -175), -190)
  assert.equal(pose.unwrapAngle(-100, -135), -100)
})

test('the held pose hands the staff to the rig: carried, charging, and leaving a strong blow from the charged pose', () => {
  const { c, d } = holding('bat')
  let p = heldItemPose(c, 0, null, 1)
  assert.equal(p.atHand, true)
  assert.deepEqual([p.staff.x, p.staff.y, p.staff.angle], [d.staffX, d.staffY, d.staffAngle])
  step(c, { fire: true, firePressed: true }); run(c, d.heavyCharge + 0.1, { fire: true })
  p = heldItemPose(c, 0, null, 1)
  assert.ok(Math.abs(p.staff.x - d.windX) < 1e-6 && Math.abs(p.staff.angle - d.windAngle) < 1e-6)
  step(c)
  p = heldItemPose(c, 0, null, 1)
  assert.ok(Math.abs(p.staff.x - d.windX) < 1e-6, 'the blow leaves from the charged pose')
  run(c, d.heavyTime * 0.5)
  p = heldItemPose(c, 0, null, 1)
  assert.equal(p.staff.x, d.staffX, 'and comes back to the carried one')
  // a Throw takes it to the hand like any other item
  run(c, 1)
  run(c, 0.2, { throwHeld: true })
  assert.equal(heldItemPose(c, 0, null, 1).staff, null)
  // the other items have no staff pose
  const g = createCombat(); g.give('pistol'); step(g, { slot: 1 })
  assert.equal(heldItemPose(g, 0, null, 1).staff, null)
})

test('the new numbers are saved with the item and checked in the defaults file', () => {
  const file = items.itemsDefaultsFile(DEFAULT_ITEMS)
  for (const k of ['gripX', 'staffX', 'staffAngle', 'windX', 'windAngle', 'heavyDamage', 'heavyCharge', 'heavyReachMax', 'heavySizeMax', 'heavyKind', 'heavyTrailWidth']) assert.ok(k in file.bat, k)
  assert.equal(items.itemsFileProblem(file), null)
  assert.notEqual(items.itemsFileProblem({ bat: { heavyKind: 'sideways' } }), null)
  assert.notEqual(items.itemsFileProblem({ bat: { heavyReachMax: 0.5 } }), null)
  assert.equal(items.itemsFileProblem({ passagua: { heavyKind: 'flat', windAngle: -200, heavyReachMax: 2 } }), null)
})
