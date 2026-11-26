const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const gf = loadTs('lib/pigchicken/gliss-float.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
const hud = loadTs('lib/pigchicken/note-hud.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const input = (fire, pressed = fire) => ({ fire, firePressed: pressed, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 })
const step = (c, fire, angle = 0, dt = 0.016) => c.step(dt, body, { x: 0, y: -40 }, { x: 20, y: -40 }, angle, input(fire, false), [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
const press = (c, angle = 0) => c.step(0.016, body, { x: 0, y: -40 }, { x: 20, y: -40 }, angle, input(true, true), [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
const DEG = Math.PI / 180

// the Harpa de Lira in hand (patch: its numbers) and the notes it plays
function harp(patch = {}) {
  const c = createCombat(), played = []
  c.setItems({ ...DEFAULT_ITEMS, harp: { ...DEFAULT_ITEMS.harp, quantize: false, spreadBase: 0, spreadMax: 0, spreadShot: 0, spreadMove: 0, spreadAir: 0, aimAssist: 0, ...patch } })
  c.give('harp')
  c.setMusicOut({ note: (voice, midi, at, len, vel) => { played.push({ voice, midi, vel }); return null }, hold: () => null, drum: () => {} })
  c.setAimReach(1, 'point')
  return { c, played }
}
const floating = c => c.bullets.filter(b => b.float)
const flying = c => c.bullets.filter(b => !b.float)

test('rungs: four across the lane from 30% of the radius, each two steps up the arpeggio', () => {
  assert.equal(gf.rungAt(0), 0)
  assert.equal(gf.rungAt(0.3), 0)
  assert.equal(gf.rungAt(0.5), 1)
  assert.equal(gf.rungAt(0.7), 2)
  assert.equal(gf.rungAt(0.9), 3)
  assert.equal(gf.rungAt(5), 3)
  assert.deepEqual([0.2, 0.5, 0.7, 1].map(gf.rungStep), [0, 2, 4, 6])
  assert.ok(gf.rungEdge(1) > gf.RUNG_FROM && gf.rungEdge(gf.GLISS_RUNGS) === 1)
})

test('the main note\'s speed grows with the aim\'s reach', () => {
  assert.equal(gf.reachSpeed(0), gf.REACH_SPEED_MIN)
  assert.equal(gf.reachSpeed(1), 1)
  assert.equal(gf.reachSpeed(9), 1)
  assert.ok(gf.reachSpeed(0.5) > gf.reachSpeed(0.2))
})

test('a floating note settles round her shoulder, sinks slowly and only so far', () => {
  const f = gf.newFloat(0, 20, 0, 0.5)
  for (let k = 0; k < 60; k++) gf.stepFloat(f, 1 / 60)
  const r1 = Math.hypot(f.dx, f.dy)
  assert.ok(r1 > gf.FLOAT_RADIUS * 0.6 && r1 < gf.FLOAT_RADIUS * 1.5, `near her (${r1})`)
  const y1 = f.dy
  for (let k = 0; k < 60 * 20; k++) gf.stepFloat(f, 1 / 60)
  assert.ok(f.dy > y1, 'it sank')
  assert.ok(f.dy - y1 <= gf.FLOAT_DROP + 12, 'not past its drop')
  // the spots are apart from each other
  const homes = [0, 1, 2, 3].map(k => gf.floatHome(k, 0, 0.5))
  for (let a = 0; a < homes.length; a++) for (let b = a + 1; b < homes.length; b++) assert.ok(Math.hypot(homes[a].x - homes[b].x, homes[a].y - homes[b].y) > 20)
})

test('launched: along the main note, a few degrees off at most, a little slower', () => {
  for (const seed of [0, 0.5, 1]) {
    const v = gf.launchVelocity(0.3, 1000, seed), a = Math.atan2(v.vy, v.vx), s = Math.hypot(v.vx, v.vy)
    assert.ok(Math.abs(a - 0.3) <= gf.FLOAT_JITTER * DEG + 1e-9)
    assert.ok(s >= 1000 * (gf.FLOAT_SPEED - gf.FLOAT_SPEED_VARY) - 1e-6 && s <= 1000 * (gf.FLOAT_SPEED + gf.FLOAT_SPEED_VARY) + 1e-6)
  }
})

test('holding Atirar still plays nothing; dragging the aim plays each note it goes into, floating round her', () => {
  const { c, played } = harp()
  press(c, -10 * DEG)
  for (let k = 0; k < 40; k++) step(c, true, -10 * DEG)
  assert.equal(played.length, 0, 'no arpeggio by itself')
  assert.equal(floating(c).length, 0)
  // up the leque: every new lane is a note of the arpeggio
  for (let k = 1; k <= 40; k++) step(c, true, (-10 - 2 * k) * DEG)
  assert.ok(played.length >= 2, `notes while dragging (${played.length})`)
  assert.ok(played.length <= gf.FLOAT_MAX)
  assert.equal(floating(c).length, played.length, 'one floating note each')
  assert.ok(floating(c).every(b => b.size < DEFAULT_ITEMS.harp.size), 'smaller than the main note')
  assert.deepEqual(c.gliss, { spent: played.length, max: gf.FLOAT_MAX })
  // in and out inside the same lane: the rungs change the note too
  const { c: c2, played: p2 } = harp()
  c2.setAimReach(0.1, "point"); press(c2, 0)
  for (const r of [0.55, 0.7, 0.9]) { c2.setAimReach(r, "point"); step(c2, true, 0) }
  assert.equal(p2.length, 3)
  assert.ok(p2[0].midi < p2[1].midi && p2[1].midi < p2[2].midi, 'up the arpeggio')
})

test('let go: the main note and the floating ones fly the same way; far aim flies faster', () => {
  const run = reach => {
    const { c } = harp()
    c.setAimReach(reach, 'point')
    press(c, 0)
    for (let k = 1; k <= 30; k++) step(c, true, -1.5 * k * DEG)
    for (let k = 0; k < 60; k++) step(c, true, -45 * DEG)
    const n = floating(c).length
    step(c, false, -45 * DEG)
    return { c, n }
  }
  const far = run(1)
  assert.equal(floating(far.c).length, 0, 'none left floating')
  const shots = flying(far.c)
  assert.equal(shots.length, far.n + 1)
  const main = shots.find(b => b.size === DEFAULT_ITEMS.harp.size)
  const ma = Math.atan2(main.vy, main.vx)
  for (const b of shots) assert.ok(Math.abs(Math.atan2(b.vy, b.vx) - ma) <= gf.FLOAT_JITTER * DEG + 1e-6, 'parallel')
  assert.ok(shots.filter(b => b !== main).every(b => b.damage < main.damage), 'the small ones hit softer')
  const near = run(0)
  const mainNear = flying(near.c).find(b => b.size === DEFAULT_ITEMS.harp.size)
  assert.ok(Math.hypot(main.vx, main.vy) > Math.hypot(mainNear.vx, mainNear.vy) * 2, 'the far aim is faster')
})

test('the charge called off: the floating notes vanish', () => {
  const { c } = harp()
  press(c, 0)
  for (let k = 1; k <= 20; k++) step(c, true, -2 * k * DEG)
  assert.ok(floating(c).length > 0)
  c.give('flute')
  c.cycle?.(1)
  // a frame with no charge on (another item in the wing, or the charge reset)
  c.step(0.016, body, { x: 0, y: -40 }, { x: 20, y: -40 }, 0, { ...input(false, false), pick: 1 }, [], 1000, () => {}, {})
  step(c, false)
  assert.equal(floating(c).length, 0)
})

test('the ring at the reticle: a row of dots over the horizon, one going out per note spent', () => {
  for (let j = 0; j < 7; j++) assert.ok(hud.glissSlot(j, 7).y < 0, 'over the horizon')
  const v = hud.newNoteView()
  const frame = spent => ({ owned: v, look: hud.noteLook('harp', DEFAULT_ITEMS.harp), ammo: 10, reload: 0, refill: 0, amount: 1, charge: 0.5, firing: true, color: '#ff0000', slap: false, aim: 0, spin: 0, cadence: 0, away: [], out: 0, special: null, wake: false, gliss: { spent, max: 7 } })
  hud.stepNoteView(v, frame(0), 0.016)
  const before = v.bits.length
  hud.stepNoteView(v, frame(2), 0.016)
  assert.equal(v.bits.length - before, 2)
  assert.ok(v.bits.slice(-2).every(b => b.vy < 0), 'they float up')
})
