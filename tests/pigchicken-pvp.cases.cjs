// Dano entre jogadores (Configurações do Pátio): the players' shots, blows and throws hurt the other players
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
const { normalizePatioSettings, patioPvp, patioSettingsAtDefault, patioSettingsDefaultsFile } = loadTs('lib/pigchicken/patio-settings.ts')
const body = { x: 0, y: 100, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const input = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
const tick = c => c.step(0.016, body, body, body, 0, input, [], 1000, () => {})

// p1 stands at the left, p2 in the way of the shot; each push is recorded with its damage
function world(pvp) {
  const c = createCombat(), got = { p1: [], p2: [] }
  c.setBlastActors([
    { id: 'p1', box: { l: -20, r: 20, t: 0, b: 110 }, push: (x, y, d) => got.p1.push({ x, y, d }) },
    { id: 'p2', box: { l: 120, r: 160, t: 0, b: 110 }, push: (x, y, d) => got.p2.push({ x, y, d }) },
  ])
  c.setPvp(pvp)
  return { c, got }
}
const shot = (o = {}) => ({ x: 30, y: 60, vx: 1500, vy: 0, dist: 0, damage: 12, pierce: 0, hits: new Set(), size: 2, drop: 0, range: 10000,
  item: 'pistol', t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0, by: 'p1', ...o })

test('off, a shot goes through the other player', () => {
  const { c, got } = world(false)
  c.bullets.push(shot())
  for (let i = 0; i < 10; i++) tick(c)
  assert.equal(got.p2.length, 0)
})

test('on, a shot hurts the other player once, pushes away from the shooter and stops', () => {
  const { c, got } = world(true)
  c.bullets.push(shot())
  for (let i = 0; i < 10; i++) tick(c)
  assert.equal(got.p2.length, 1)
  assert.equal(got.p2[0].d, 12)
  assert.ok(got.p2[0].x > 0 && got.p2[0].y < 0)
  assert.equal(got.p1.length, 0)
  assert.equal(c.bullets.length, 0)
})

test('a shot never hurts the one who fired it', () => {
  const { c, got } = world(true)
  c.bullets.push(shot({ x: -10, vx: 600, by: 'p1' }))
  tick(c)
  assert.equal(got.p1.length, 0)
})

test('another browser\'s shot hurts the players here with its item\'s damage', () => {
  const { c, got } = world(true)
  c.bullets.push(shot({ damage: 0, remote: true, by: undefined }))
  for (let i = 0; i < 10; i++) tick(c)
  assert.equal(got.p2.length, 1)
  assert.equal(got.p2[0].d, DEFAULT_ITEMS.pistol.damage)
})

test('an instrument\'s note never hurts a player', () => {
  const { c, got } = world(true)
  c.bullets.push(shot({ item: 'keys', note: { midi: 60, color: '#fff', sym: '♪', wave: 0, phase: 0, voice: 'keys' } }))
  for (let i = 0; i < 10; i++) tick(c)
  assert.equal(got.p2.length, 0)
})

test('a thrown item hurts the other player, not the one who threw it', () => {
  const { c, got } = world(true)
  c.thrown.push({ x: 0, y: 60, vx: 900, vy: 0, spin: 0, angle: 0, owned: { item: 'pistol', ammo: 1 }, damage: 20, hit: false, by: 'p1' })
  for (let i = 0; i < 12; i++) tick(c)
  assert.equal(got.p1.length, 0)
  assert.equal(got.p2.length, 1)
  assert.equal(got.p2[0].d, 20)
})

test('the Pátio keeps the switch, and Reverter para o padrão turns it off', () => {
  assert.equal(patioPvp(undefined), false)
  assert.deepEqual(normalizePatioSettings({ pvp: true }), { pvp: true })
  assert.equal(normalizePatioSettings({ pvp: 1 }), undefined)
  assert.equal(patioPvp(normalizePatioSettings({ pvp: true })), true)
  assert.equal(patioSettingsDefaultsFile({ pvp: true }, 3).pvp, true)
  assert.equal(patioPvp(patioSettingsAtDefault({ pvp: true }, 3)), false)
})

test('a blow with the wing hurts the other player in its reach, once', () => {
  for (const pvp of [false, true]) {
    const c = createCombat(), got = []
    c.setBlastActors([
      { id: 'p1', box: { l: -20, r: 20, t: 0, b: 110 }, push: () => assert.fail('the one who hit') },
      { id: 'p2', box: { l: 30, r: 70, t: 0, b: 110 }, push: (x, y, d) => got.push({ x, y, d }) },
    ])
    c.setPvp(pvp)
    const at = { x: 0, y: 60 }, press = { ...input, melee: true }
    c.step(0.016, body, at, at, 0, press, [], 1000, () => {})
    for (let i = 0; i < 60; i++) c.step(0.016, body, at, at, 0, input, [], 1000, () => {})
    assert.equal(got.length, pvp ? 1 : 0)
    if (pvp) { assert.ok(got[0].d > 0); assert.ok(got[0].x > 0) }
  }
})
