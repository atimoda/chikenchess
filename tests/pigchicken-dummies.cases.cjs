const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const dm = loadTs('lib/pigchicken/dummies.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const idle = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
const step = (c, dt = 0.016) => c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, idle, [], 1000, () => {})
// a projectile flying into the dummy at x = 500 (a note when `note` is given)
const shoot = (c, damage, note) => c.bullets.push({
  x: 470, y: 940, vx: 900, vy: 0, dist: 0, damage, pierce: 0, hits: new Set(), size: 3, drop: 0, range: 2000,
  item: note ? 'flute' : 'pistol', t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0,
  ...(note ? { note: { midi: 72, color: '#ff0', sym: '♪', wave: 0, phase: 0, voice: 'flute' }, ghost: true } : {}),
})
const hit = (c, damage, note) => { shoot(c, damage, note); for (let i = 0; i < 4; i++) step(c); for (let i = 0; i < 12; i++) step(c) }
const make = (params) => {
  const c = createCombat(), notes = []
  c.setMusicOut({ note: (voice, midi) => notes.push(midi), hold: () => null, drum: () => {} })
  const id = c.addTarget(500, 1000, params)
  return { c, notes, t: c.targets.find(t => t.id === id), id }
}

test('stages follow the share of life: whole, scratched, cracked, falling apart, wrecked', () => {
  assert.deepEqual([100, 80, 75, 50, 26, 25, 1, 0].map(hp => dm.dummyStage(hp, 100)), [4, 4, 3, 2, 2, 1, 1, 0])
})

test('the answer climbs the scale and gets in tune as the stage improves', () => {
  const scale = [0, 2, 4, 7, 9]
  const pool = []; for (let o = 0; o < 10; o++) scale.forEach(s => pool.push(24 + o * 12 + s))
  const walk = (from, n) => { let i = pool.findIndex(m => m >= from); return pool[Math.max(0, Math.min(pool.length - 1, i + n))] }
  const m = [0, 1, 2, 3, 4].map(s => dm.dummyAnswerMidi(s, walk))
  for (let i = 1; i < m.length; i++) assert.ok(m[i] > m[i - 1])
  assert.ok(m[4] - m[0] >= 12, 'the wrecked one is much lower')
  const off = m.map(x => Math.abs(x - Math.round(x)))
  for (let i = 1; i < off.length; i++) assert.ok(off[i] < off[i - 1])
  assert.equal(off[4], 0)
})

test('params are per dummy and cleaned; a new total life keeps the share of life', () => {
  const { c, t, id } = make({ message: '  oi  ', maxHp: 40 })
  assert.deepEqual(t.dummy.params, { message: 'oi', maxHp: 40 })
  assert.equal(t.hp, 40)
  hit(c, 20)
  assert.equal(t.hp, 20)
  assert.ok(c.setDummyParams(id, { maxHp: 200 }))
  assert.equal(t.maxHp, 200); assert.equal(t.hp, 100); assert.equal(t.dummy.params.message, 'oi')
  assert.equal(dm.cleanDummyParams({ maxHp: 99999 }).maxHp, dm.DUMMY_HP_RANGE.max)
  assert.equal(dm.cleanDummyParams({ maxHp: 'x' }).maxHp, dm.DUMMY_DEFAULTS.maxHp)
})

test('destroyed: it stays wrecked (no respawn), shows its tip, and answers hits low and out of tune', () => {
  const { c, t, notes } = make({ message: 'dica', maxHp: 50 })
  hit(c, 30); assert.equal(t.dummy.stage, 2)
  hit(c, 30)
  assert.equal(t.hp, 0); assert.equal(t.dummy.stage, 0); assert.equal(t.deadT, 0)
  assert.ok(t.dummy.tipT > 7)
  for (let i = 0; i < 400; i++) step(c, 0.05)
  assert.equal(t.hp, 0, 'still wrecked after 20 s'); assert.equal(t.dummy.tipT, 0)
  notes.length = 0
  hit(c, 30)
  assert.equal(t.hp, 0)
  assert.ok(t.dummy.tipT > 0, 'a hit on the wreck shows the tip again')
  assert.ok(notes.length > 0 && notes[0] !== Math.round(notes[0]), 'out of tune')
})

test('notes mend it stage by stage, and the answer rises', () => {
  const { c, t, notes } = make({ message: 'dica', maxHp: 100 })
  hit(c, 150); assert.equal(t.dummy.stage, 0)
  notes.length = 0; hit(c, 1)
  const low = notes[0]
  hit(c, 30, true); assert.equal(t.hp, 30); assert.equal(t.dummy.stage, 2)
  notes.length = 0; hit(c, 1)
  assert.ok(notes[0] > low)
  hit(c, 200, true); assert.equal(t.hp, 100); assert.equal(t.dummy.stage, 4)
  notes.length = 0; hit(c, 1)
  assert.equal(notes[0], Math.round(notes[0]), 'whole again: in tune')
})
