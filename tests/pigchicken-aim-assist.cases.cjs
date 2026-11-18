const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const aa = loadTs('lib/pigchicken/aim-assist.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
const { INSTRUMENT_SCALES } = loadTs('lib/pigchicken/instrument-scales.ts')
const { BUILTIN_VARIANTS, normalizeVariant, variantData } = loadTs('lib/pigchicken/alien-catalog.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const input = (fire, pressed = fire) => ({ fire, firePressed: pressed, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 })
const step = (c, fire, angle = 0, pressed) => c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle, input(fire, pressed), [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps
// a wall of a closed block standing at x = 300 (what the Grade de blocos answers)
function wallAt300(c, bounce = false) {
  const counted = []
  c.setMine({
    note: (px, py, x, y, by) => { if ((px < 300) !== (x < 300)) { if (by) counted.push({ x, by }); return { flipX: true, bounce, color: '#00f' } } return null },
    shot: () => null, blast: () => {}, shock: () => {}, blow: () => {},
  })
  return counted
}
const withItem = (c, id, patch) => { c.setItems({ ...DEFAULT_ITEMS, [id]: { ...DEFAULT_ITEMS[id], ...patch } }); c.give(id) }

test('the Teclado bursts on the wall of a closed block, and its line ends there', () => {
  for (const bounce of [false, true]) {
    const c = createCombat(), counted = wallAt300(c, bounce)
    c.give('keys')
    let ends = []
    for (let i = 0; i < 4 && !ends.length; i++) { step(c, i === 1); ends = c.tracers.map(t => t.x2) }
    assert.equal(ends.length, 1, 'one straight line')
    assert.ok(ends[0] > 280 && ends[0] < 300, `it ends at the wall, not ${ends[0]}`)
    assert.ok(counted.length >= 1, 'its note counted on the block')
  }
})

test('the violin beam stops on a closed block and counts a note there every sixteenth', () => {
  const c = createCombat(), counted = wallAt300(c)
  c.give('violin')
  for (let i = 0; i < 40; i++) step(c, true, 0, i === 0)
  assert.ok(c.beam && c.beam.x2 < 300 && c.beam.x2 > 280, 'the beam ends on the wall')
  // 40 frames of 16 ms = 0.64 s: at 120 bpm a sixteenth is 0.125 s
  assert.ok(counted.length >= 4 && counted.length <= 7, `${counted.length} notes`)
  assert.ok(counted.every(n => n.by === 'p1'))
})

test('a scale cell: same region, same key; charts by sector and ring, strings by string', () => {
  const q = (angle, reach) => ({ angle, reach, set: 'chord', octave: 0, span: 2 })
  const music = createCombat().music
  const fifths = INSTRUMENT_SCALES.fifths
  assert.equal(fifths.cellAt(music, q(-Math.PI / 2, 0.9)), fifths.cellAt(music, q(-Math.PI / 2 + 0.1, 3)))
  assert.notEqual(fifths.cellAt(music, q(-Math.PI / 2, 0.9)), fifths.cellAt(music, q(-Math.PI / 2, 0.3)), 'other ring')
  const strings = INSTRUMENT_SCALES.strings
  assert.equal(strings.cellAt(music, q(0, 0.1)), strings.cellAt(music, q(0, 1)), 'the whole string')
  assert.equal(INSTRUMENT_SCALES.drums.cellAt(music, q(0, 1)), '', 'the kit has no cells')
})

test('Aim Assist: arcs and blends; at 100% the shot goes right at the enemy in the cell, at 0 where the aim is', () => {
  assert.ok(near(aa.blendAngle(0.1, -0.1, 0.5), 0))
  assert.ok(near(aa.blendAngle(3, -3, 1), 2 * Math.PI - 3), 'the short way round (past π, not back through 0)')
  // a falling shot aims above a target level with it
  assert.ok(aa.arcAngle(500, 0, 1000, 900) < 0)
  assert.ok(near(aa.arcAngle(500, 0, 1000, 0), 0))
  for (const [assist, expect] of [[100, true], [0, false]]) {
    const c = createCombat()
    withItem(c, 'flute', { aimAssist: assist, spreadBase: 6, scales: ['fifths'] })
    c.setScaleFan({ x: 0, y: 0, r: 100 })
    c.setAimReach(1, 'point')
    // the enemy is in the aim's sector (straight up, ±15°), off the aim's own line
    c.addTarget(-80, -500)
    const t = c.targets[0], cy = t.y - t.h / 2
    step(c, true, -Math.PI / 2)
    const b = c.bullets[0]
    const toward = Math.atan2(cy, -80), went = Math.atan2(b.vy, b.vx)
    assert.equal(near(went, toward, 1e-6), expect, `assist ${assist}`)
  }
})

test('Aim Assist: nobody in the aim\'s cell, the shot goes where the aim is', () => {
  const c = createCombat()
  withItem(c, 'flute', { aimAssist: 100, spreadBase: 0, spreadMax: 0, spreadShot: 0, scales: ['fifths'] })
  c.setScaleFan({ x: 0, y: 0, r: 100 })
  c.setAimReach(1, 'point')
  c.addTarget(500, 0) // to her right: another sector
  step(c, true, -Math.PI / 2)
  const b = c.bullets[0]
  assert.ok(near(Math.atan2(b.vy, b.vx), -Math.PI / 2, 1e-9))
})

test('Bullet Magnetism: the strongest pull bends, 100% turns straight at the nearest one at 100%', () => {
  assert.equal(aa.magnetAt([{ x: 0, y: 0, m: 0.2 }], 2000, 0), null, 'out of its reach')
  const far = { x: 1000, y: 0, m: 1 }, close = { x: 100, y: 0, m: 1 }
  assert.equal(aa.magnetAt([far, close, { x: 10, y: 0, m: 0.9 }], 0, 0).magnet, close, 'the nearest at 100% wins')
  const v = aa.magnetSteer(100, 0, 0, 0, [{ x: 0, y: 500, m: 1 }], 0.016)
  assert.ok(near(v.vx, 0, 1e-9) && near(v.vy, 100, 1e-9), 'straight at it, the same speed')
  const w = aa.magnetSteer(100, 0, 0, 0, [{ x: 0, y: 100, m: 0.3 }], 0.016)
  assert.ok(w.vy > 0 && w.vy < 10 && near(Math.hypot(w.vx, w.vy), 100, 1e-9), 'a little bend')
})

test('Bullet Magnetism in flight: a shot past an alien at 100% comes to it; the catalogue carries it', () => {
  const ima = BUILTIN_VARIANTS.find(v => v.id === 'shell-ima')
  assert.equal(ima.magnet, 100)
  const avg = BUILTIN_VARIANTS.reduce((n, v) => n + v.magnet, 0) / BUILTIN_VARIANTS.length
  assert.ok(avg > 0 && avg < 33, `average ${avg}`)
  assert.equal(normalizeVariant({ id: 'x', species: 'mini', magnet: 250 }).magnet, 100)
  const c = createCombat()
  withItem(c, 'pistol', { spreadBase: 0, spreadMax: 0, spreadShot: 0 })
  c.addTrainingAlien(200, -300, { w: 50, h: 40, hp: 400, data: variantData(ima) })
  const a = c.targets[0], hp = a.hp
  step(c, true, 0)
  for (let i = 0; i < 90; i++) step(c, false, 0)
  assert.ok(a.hp < hp, 'the shot aimed to her right hit the alien above')
})
