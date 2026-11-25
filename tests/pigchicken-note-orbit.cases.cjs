const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const orb = loadTs('lib/pigchicken/note-orbit.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS, hangOf, itemsOver } = loadTs('lib/pigchicken/items.ts')
const { INSTRUMENT_SCALES } = loadTs('lib/pigchicken/instrument-scales.ts')
const { cleanShot } = loadTs('lib/pigchicken/net-world.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const input = (fire, pressed = fire) => ({ fire, firePressed: pressed, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 })
const step = (c, fire, angle = 0, dt = 0.016) => c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle, input(fire), [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
const FAN = { x: 0, y: 0, r: 100 }
const TAU = Math.PI * 2

// a combat with the Hangdrum in hand (patch: its numbers), its layer at FAN, and the sounds it plays
function hang(patch = {}) {
  const c = createCombat(), played = []
  c.setItems({ ...DEFAULT_ITEMS, hangdrum: { ...DEFAULT_ITEMS.hangdrum, quantize: false, spreadBase: 0, spreadMax: 0, spreadShot: 0, ...patch } })
  c.give('hangdrum')
  c.setMusicOut({ note: (voice, midi) => { const h = { voice, midi, stopped: null, setPitch() {}, stop(f) { h.stopped = f } }; played.push(h); return h }, hold: () => null, drum: () => {} })
  c.setScaleFan(FAN)
  return { c, played }
}
// the ball's place (the hang's own layout, with the item's numbers) and a shot aimed right at its middle
function ballOf(c, i) {
  const d = DEFAULT_ITEMS.hangdrum, lay = INSTRUMENT_SCALES.hang.layout(c.music, { octave: d.octave, hang: hangOf(d) }), f = lay.fields[i]
  return { f, angle: Math.atan2(f.y, f.x), reach: Math.hypot(f.x, f.y) }
}
function playOn(c, i, frames = 1) {
  const { angle, reach } = ballOf(c, i)
  c.setAimReach(reach, 'point')
  step(c, true, angle)
  for (let k = 1; k < frames; k++) step(c, false, angle)
}
// wait out the gun's cooldown between two presses
const rest = (c, n = 20) => { for (let k = 0; k < n; k++) step(c, false, 0) }

test('Giro na bola: 0 is off, 1..60 s, then Duração da nota and ∞', () => {
  assert.equal(orb.spinLabel(0), 'Desligado')
  assert.equal(orb.spinLabel(12), '12 s')
  assert.equal(orb.spinLabel(orb.SPIN_NOTE), 'Duração da nota')
  assert.equal(orb.spinLabel(orb.SPIN_FOREVER), '∞')
  assert.equal(orb.spinSeconds(0, 1.5), 0)
  assert.equal(orb.spinSeconds(30, 1.5), 30)
  assert.equal(orb.spinSeconds(orb.SPIN_NOTE, 1.5), 1.5)
  assert.equal(orb.spinSeconds(orb.SPIN_FOREVER, 1.5), Infinity)
  assert.equal(orb.cleanSpin(99), orb.SPIN_FOREVER)
  assert.equal(orb.cleanSpin(-3), 0)
})

test('defaults: the Hangdrum spins for its note\'s length and cuts the same ball; the others do not spin', () => {
  assert.equal(DEFAULT_ITEMS.hangdrum.hangSpin, orb.SPIN_NOTE)
  assert.equal(DEFAULT_ITEMS.hangdrum.hangTravel, true)
  assert.equal(DEFAULT_ITEMS.hangdrum.hangChoke, true)
  assert.equal(DEFAULT_ITEMS.flute.hangSpin, 0)
  assert.equal(DEFAULT_ITEMS.flute.hangChoke, false)
  // the checkboxes and the slider are kept with the item
  const saved = itemsOver({ hangdrum: { hangSpin: 12, hangTravel: false, hangChoke: false } })
  assert.equal(saved.hangdrum.hangSpin, 12)
  assert.equal(saved.hangdrum.hangTravel, false)
  assert.equal(saved.hangdrum.hangChoke, false)
})

test('the orbit: a travelling note chases the ball, then goes round it once per beat', () => {
  const o = orb.newOrbit({ x: 0.5, y: 0, r: 0.2 }, 3, { seconds: 10, bpm: 120, travel: true, speed: 1000, aim: 0 })
  assert.equal(o.arrived, false)
  assert.ok(Math.abs(o.speed - TAU * 2) < 1e-9, '120 bpm: two turns a second')
  const ball = orb.ballAt(FAN, o)
  assert.deepEqual([ball.x, ball.y], [50, 0])
  assert.ok(Math.abs(ball.r - 20 * orb.ORBIT_FILL) < 1e-9)
  let pos = { x: -200, y: 0 }
  for (let k = 0; k < 60 && !o.arrived; k++) pos = orb.stepOrbit(o, pos, ball, 0.016)
  assert.ok(o.arrived, 'it got there')
  for (let k = 0; k < 30; k++) {
    pos = orb.stepOrbit(o, pos, ball, 0.016)
    assert.ok(Math.abs(Math.hypot(pos.x - ball.x, pos.y - ball.y) - ball.r) < 1e-6, 'on the orbit')
  }
  // the ding turns at half the speed
  assert.ok(Math.abs(orb.orbitSpeed(120, true) - TAU) < 1e-9)
  // its time over, it is gone; so is one whose ball jumped away (a portal)
  const short = orb.newOrbit({ x: 0, y: 0, r: 0.3 }, 0, { seconds: 0.05, bpm: 100, travel: false, speed: 500, aim: 0 })
  assert.ok(orb.stepOrbit(short, { x: 0, y: 0 }, { x: 0, y: 0, r: 10 }, 0.016))
  assert.equal(orb.stepOrbit(short, { x: 0, y: 0 }, { x: 0, y: 0, r: 10 }, 0.05), null)
  const jumper = orb.newOrbit({ x: 0, y: 0, r: 0.3 }, 0, { seconds: 10, bpm: 100, travel: false, speed: 500, aim: 0 })
  assert.ok(orb.stepOrbit(jumper, { x: 0, y: 0 }, { x: 0, y: 0, r: 10 }, 0.016))
  assert.equal(orb.stepOrbit(jumper, { x: 0, y: 0 }, { x: orb.ORBIT_JUMP + 1, y: 0, r: 10 }, 0.016), null)
})

test('notes on the same ball spread out evenly round it', () => {
  let p = [0, 0.1, 0.2]
  for (let k = 0; k < 400; k++) p = orb.spreadPhases(p, 0.016)
  const gaps = p.map(v => ((v % TAU) + TAU) % TAU).sort((a, b) => a - b).map((v, i, a) => (i ? v - a[i - 1] : null)).slice(1)
  for (const g of gaps) assert.ok(Math.abs(g - TAU / 3) < 1e-3, `gap ${g}`)
})

test('a note played on a ball goes there and spins round it, following her', () => {
  const { c } = hang({ hangSpin: 30 })
  const { f } = ballOf(c, 2)
  playOn(c, 2, 120)
  assert.equal(c.bullets.length, 1)
  const b = c.bullets[0], mid = { x: f.x * 100, y: f.y * 100 }, r = f.r * 100 * orb.ORBIT_FILL
  assert.ok(b.orbit && b.orbit.arrived)
  assert.ok(Math.abs(Math.hypot(b.x - mid.x, b.y - mid.y) - r) < 1e-6, 'on the ball\'s orbit')
  // she walks: the ball (and the note) go with her
  c.setScaleFan({ x: 300, y: 0, r: 100 })
  step(c, false, 0)
  assert.ok(Math.abs(Math.hypot(b.x - mid.x - 300, b.y - mid.y) - r) < 1e-6, 'round the ball where it is now')
})

test('not travelling, it is born on the ball; Giro off, it flies straight as before; the gap is a slap that goes straight', () => {
  {
    const { c } = hang({ hangSpin: 30, hangTravel: false })
    const { f } = ballOf(c, 1)
    playOn(c, 1)
    const b = c.bullets[0]
    assert.ok(b.orbit.arrived)
    assert.ok(Math.hypot(b.x - f.x * 100, b.y - f.y * 100) <= f.r * 100, 'already on its ball')
  }
  {
    const { c } = hang({ hangSpin: 0 })
    playOn(c, 1)
    assert.equal(c.bullets[0].orbit, undefined)
  }
  {
    const { c } = hang({ hangSpin: 30 })
    const { angle } = ballOf(c, 1), lay = ballOf(c, 0)
    // between the ding and the first row, off any ball
    c.setAimReach(lay.f.r + 0.01, 'point')
    step(c, true, angle)
    assert.equal(c.bullets[0].note.voice, 'hangSlap')
    assert.equal(c.bullets[0].orbit, undefined)
  }
})

test('Duração da nota: it spins as long as the note; a timed one for its seconds', () => {
  for (const [spin, seconds] of [[orb.SPIN_NOTE, DEFAULT_ITEMS.hangdrum.noteLen], [3, 3]]) {
    const { c } = hang({ hangSpin: spin, hangTravel: false })
    playOn(c, 1)
    for (let t = 0; t < seconds - 0.1; t += 0.05) step(c, false, 0, 0.05)
    assert.equal(c.bullets.length, 1, `still spinning before ${seconds} s`)
    for (let t = 0; t < 0.3; t += 0.05) step(c, false, 0, 0.05)
    assert.equal(c.bullets.length, 0, `gone after ${seconds} s`)
  }
})

test('Cada nota interrompe a anterior: a note on the same ball cuts the last one there; other balls ring together', () => {
  const { c, played } = hang({ hangSpin: orb.SPIN_FOREVER })
  playOn(c, 1); rest(c)
  playOn(c, 2); rest(c)
  assert.equal(c.bullets.length, 2, 'two balls, two notes spinning')
  assert.ok(played.every(h => h.stopped === null), 'nothing cut yet')
  playOn(c, 1); rest(c)
  assert.equal(c.bullets.length, 2, 'the first one on that ball is gone')
  assert.equal(played[0].stopped, 0.04, 'its sound cut short')
  assert.equal(played[1].stopped, null, 'the other ball still rings')
  // off: they pile up on the ball
  const off = hang({ hangSpin: orb.SPIN_FOREVER, hangChoke: false })
  playOn(off.c, 1); rest(off.c); playOn(off.c, 1); rest(off.c)
  assert.equal(off.c.bullets.length, 2)
  assert.ok(off.played.every(h => h.stopped === null))
})

test('a spinning note that hits someone is gone, like any note', () => {
  const { c } = hang({ hangSpin: orb.SPIN_FOREVER, hangTravel: false })
  const { f } = ballOf(c, 1)
  playOn(c, 1)
  c.addTarget(f.x * 100, f.y * 100 + 60)
  for (let k = 0; k < 120 && c.bullets.length; k++) step(c, false, 0)
  assert.equal(c.bullets.length, 0)
})

test('online: the others get the orbit round her chicken, and its end', () => {
  const { c } = hang({ hangSpin: orb.SPIN_FOREVER })
  c.setNetOn(true)
  playOn(c, 1)
  const sent = c.netShots.find(s => s.k === 'b')
  assert.ok(Array.isArray(sent.ob) && sent.ob.length === 9)
  const clean = cleanShot(JSON.parse(JSON.stringify(sent)), DEFAULT_ITEMS)
  assert.deepEqual(clean.ob.slice(0, 3), sent.ob.slice(0, 3))
  assert.equal(cleanShot({ ...sent, ob: [1, 2] }, DEFAULT_ITEMS).ob, undefined, 'a bad orbit is dropped')
  assert.deepEqual(cleanShot({ k: 'ox', i: 'hangdrum', c: 7 }, DEFAULT_ITEMS), { k: 'ox', i: 'hangdrum', c: 7 })
  // another browser (pid 4), its chicken at (1000, 0)
  const r = createCombat()
  r.setNetBodies([{ x: 1000, y: 0, pid: 4 }])
  r.addRemoteShots([{ ...clean, x: 1000, y: 0 }], undefined, 4)
  const b = r.bullets[0]
  assert.ok(b.remote && b.orbit)
  const dx = clean.ob[0], dy = clean.ob[1], rad = clean.ob[2]
  for (let k = 0; k < 120; k++) step(r, false, 0)
  assert.ok(Math.abs(Math.hypot(b.x - 1000 - dx, b.y - dy) - rad) < 1e-6, 'round the ball on her chicken there')
  r.addRemoteShots([{ k: 'ox', i: 'hangdrum', c: clean.ob[5] }], undefined, 4)
  step(r, false, 0)
  assert.equal(r.bullets.length, 0, 'it ended there too')
  // here, when it ends, the others are told
  rest(c)
  c.netShots.length = 0
  playOn(c, 1)
  assert.ok(c.netShots.some(s => s.k === 'ox' && s.c === sent.ob[5]), 'the cut one is announced')
})
