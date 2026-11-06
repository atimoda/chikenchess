const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
const swing = loadTs('lib/pigchicken/swing.ts')
const fan = loadTs('lib/pigchicken/fan.ts')
const shots = loadTs('lib/pigchicken/note-shots.ts')
const stageLib = loadTs('lib/pigchicken/note-stage.ts')
const music = loadTs('lib/pigchicken/music.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, dt = 0.016) {
  c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
}
const run = (c, s, angle = 0) => { for (let t = 0; t < s; t += 0.016) step(c, {}, angle) }
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps
const DEG = Math.PI / 180

// ---------- the fan ----------
test("the songs' fan: two octaves of the scale over the upper half circle, low on her left, high on her right", () => {
  const f = fan.songFan(62, 'majorPenta')
  const notes = fan.fanNotes(f)
  assert.deepEqual(notes, [62, 64, 66, 69, 71, 74, 76, 78, 81, 83])
  assert.equal(fan.fanLaneAt(f, -179 * DEG), 0)
  assert.equal(fan.fanLaneAt(f, -1 * DEG), 9)
  assert.equal(fan.fanLaneAt(f, -100 * DEG), 4)
  assert.equal(fan.fanNoteAt(f, 90 * DEG), null, 'below her is outside the fan')
  // each note comes from its own lane and plays itself back
  notes.forEach(m => assert.equal(fan.fanNoteAt(f, fan.fanAngleOf(f, m)), m))
  assert.equal(fan.fanLanes(f, () => 0).length, 10)
})

test('a fan can be mirrored, open to 360°, have given notes, silent lanes and wider lanes', () => {
  const mirrored = { open: 180, start: 90, dir: -1, mirrored: true, centerY: 0, content: { kind: 'notes', notes: [60, 62, 64, 65] } }
  // only the height counts: up-left and up-right are the same lane
  assert.equal(fan.fanLaneAt(mirrored, -30 * DEG), fan.fanLaneAt(mirrored, -150 * DEG))
  assert.equal(fan.fanNoteAt(mirrored, 80 * DEG), 60)
  assert.equal(fan.fanNoteAt(mirrored, -80 * DEG), 65)
  const circle = { open: 360, start: 0, dir: 1, mirrored: false, centerY: 0, content: { kind: 'notes', notes: [60, null, 67, 72] }, widths: [3, 1, 1, 1] }
  for (let a = -180; a < 180; a += 7) assert.ok(fan.fanLaneAt(circle, a * DEG) >= 0)
  assert.equal(fan.fanLaneAt(circle, 100 * DEG), 0, 'the first lane is three times as wide')
  assert.equal(fan.fanNoteAt(circle, 200 * DEG), null, 'a silent lane')
  const lanes = fan.fanLanes(circle)
  assert.ok(near(Math.abs(lanes[0].a1 - lanes[0].a0), Math.PI))
})

// ---------- note shots ----------
test('a rebate is judged against the arrival time with the temple windows', () => {
  assert.equal(shots.judgeNote(0.05), 'perfect')
  assert.equal(shots.judgeNote(-0.1), 'good')
  assert.equal(shots.judgeNote(0.2), 'fora')
  assert.ok(shots.inSector(0, 0, 0, Math.PI / 2, 100, 80, 10, 5))
  assert.ok(!shots.inSector(0, 0, 0, Math.PI / 2, 100, -80, 10, 5), 'not behind')
  assert.ok(!shots.inSector(0, 0, 0, Math.PI / 2, 100, 140, 0, 5), 'not out of reach')
  const v = shots.aimShot(0, 0, 300, 400, 2)
  assert.ok(near(v.vx * 2, 300) && near(v.vy * 2, 400), 'it gets there in the time asked')
})

// a note coming at her from the right that should arrive `late` s after the blow lands
function noteAtTheBlow(c, late) {
  const d = DEFAULT_ITEMS.wing
  const hit = c.music.time + 0.016 + d.meleeTime * swing.SWING_PHASES.prep
  return c.fireNoteShot({ x: 60, y: 0, vx: 0, vy: 0, midi: 62, color: '#fff', size: 8, glow: 0.5, arriveAt: hit + late, source: 'test' })
}

test('any melee blow rebates a note in its arc: judged, played and sent off where she aims', () => {
  for (const [late, grade] of [[0.02, 'perfect'], [0.1, 'good'], [0.25, 'fora']]) {
    const c = createCombat()
    const n = noteAtTheBlow(c, late)
    step(c, { melee: true })
    run(c, 0.2, -Math.PI / 2)
    const ev = c.noteEvents.find(e => e.kind === 'rebate')
    assert.ok(ev, `rebated (${grade})`)
    assert.equal(ev.grade, grade)
    assert.equal(n.state, 'rebated')
    assert.ok(n.vy < 0 && Math.abs(n.vx) < 1, 'it flies where she aims now (up)')
  }
})

test('the ambience can set the note a rebate plays; without one it plays the note sequenced', () => {
  const c = createCombat()
  c.setNoteEnv(() => ({ base: 74, rule: 'ambiente-taco' }))
  noteAtTheBlow(c, 0)
  step(c, { melee: true }); run(c, 0.2)
  assert.equal(c.noteEvents.find(e => e.kind === 'rebate').midi, 74)
  const d = createCombat()
  noteAtTheBlow(d, 0)
  step(d, { melee: true }); run(d, 0.2)
  assert.equal(d.noteEvents.find(e => e.kind === 'rebate').midi, 62)
})

test('a note nobody rebates is missed; the peck only cancels it', () => {
  const c = createCombat()
  const n = c.fireNoteShot({ x: 400, y: -400, vx: 0, vy: 0, midi: 62, color: '#fff', size: 8, glow: 0.5, arriveAt: c.music.time + 0.1, source: 'test' })
  run(c, 0.1 + shots.NOTE_LATE + 0.05)
  assert.equal(n.state, 'missed')
  assert.deepEqual(c.noteEvents.map(e => e.kind), ['miss'])
  run(c, 0.7)
  assert.equal(c.noteShots.length, 0, 'it fades away')

  const p = createCombat()
  step(p, { fire: true, firePressed: true })
  for (let i = 0; i < 8; i++) step(p, { fire: true })
  step(p); step(p)
  p.fireNoteShot({ x: 60, y: 0, vx: 0, vy: 0, midi: 62, color: '#fff', size: 8, glow: 0.5, arriveAt: p.music.time + 0.05, source: 'test' })
  step(p)
  assert.deepEqual(p.noteEvents.map(e => e.kind), ['parry'])
  assert.equal(p.noteShots.length, 0)
})

test('a rebated note that hits an alien fills its harmony: two of them turn it into a bird', () => {
  const c = createCombat()
  c.targets.push({ id: 99, kind: 'alien', home: 0, x: 400, y: 20, w: 48, h: 40, hp: 30, maxHp: 30, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'fly', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#c77dff' } })
  const a = c.targets[0]
  for (let k = 0; k < 2; k++) {
    noteAtTheBlow(c, 0)
    step(c, { melee: true }); run(c, 1.2)
  }
  assert.equal(a.state, 'converted')
})

// ---------- the note stage ----------
const { createNoteStage, TEST_SONG, pathAt, spawnBeat, CONTACT_R, ARRIVE_R, noteCount, accuracy } = stageLib

test('the five movements: in to touch her, across, round her, in waves, or still', () => {
  const base = { theta: -Math.PI / 2, r0: 400, ts: 0, tEnd: 4, tMid: 2, zig: { amp: 50, period: 2 }, turn: Math.PI / 2, pass: 200, side: 1 }
  const r = p => Math.hypot(p.dx, p.dy)
  const straight = { ...base, mode: 'straight' }
  assert.ok(near(r(pathAt(straight, 0, 0.5)), 400))
  assert.ok(near(r(pathAt(straight, 4, 0.5)), CONTACT_R))
  assert.ok(near(pathAt(straight, 2, 0.5).dx, 0), 'straight in')
  const spiral = pathAt({ ...base, mode: 'spiral' }, 4, 0.5)
  assert.ok(near(Math.atan2(spiral.dy, spiral.dx), 0), 'a quarter turn round her')
  const zig = pathAt({ ...base, mode: 'zigzag' }, 0.25, 0.5)
  assert.ok(Math.abs(zig.dx) > 30, 'off to the side')
  const pass = { ...base, mode: 'pass' }
  assert.ok(near(r(pathAt(pass, 2, 0.5)), 200), 'closest halfway')
  assert.ok(r(pathAt(pass, 0, 0.5)) > 300 && r(pathAt(pass, 4, 0.5)) > 300)
  const still = { ...base, mode: 'still' }
  assert.ok(Math.abs(r(pathAt(still, 3, 0.5)) - 400) < 8)
  assert.ok(pathAt(still, 5, 0.5).dy < -500, 'and off it goes when its notes are done')
})

function stageRig(over = {}) {
  const st = createNoteStage()
  const conductor = music.createConductor()
  const targets = [], fired = [], sounds = [], events = []
  const io = (extra = {}) => ({
    targets, music: conductor, sceneL: 1920, sceneW: 1920, groundY: 930, inside: true, center: { x: 2900, y: 860 },
    discHit: false, resetHit: false, busy: false, events: events.splice(0), fire: n => fired.push(n), clearShots() {},
    incoming: 0, fx: { burst() {}, text() {} }, push() {}, sound: s => sounds.push(s), ...over, ...extra,
  })
  const tick = (dt = 1 / 60, extra = {}) => {
    conductor.setZone(st.music?.zone ?? conductor.zone)
    conductor.step(dt)
    st.step(dt, io(extra))
  }
  return { st, conductor, targets, fired, sounds, events, tick }
}

test('the disc plays the song: its clock starts after the intro, aliens come in and fire their notes in time', () => {
  const { st, conductor, targets, fired, tick } = stageRig()
  tick(1 / 60, { discHit: true })
  assert.equal(st.state.phase, 'playing')
  for (let i = 0; i < 60 * 6 && Number.isNaN(st.state.t0); i++) tick()
  assert.equal(conductor.zone.id, TEST_SONG.music.zone.id)
  const spb = 60 / TEST_SONG.music.zone.bpm
  // beat 0 is a bar line, after the intro bars
  while (conductor.time < st.state.t0) tick()
  const into = conductor.beat % 4
  assert.ok(into < (1 / 60) / spb + 1e-6 || 4 - into < 1e-6, `on the bar line (${into})`)
  // run the song; every note it fires should reach the ring in its lane when the song wants it
  const first = TEST_SONG.aliens[0]
  while (conductor.time < st.state.t0 + spawnBeat(first) * spb) tick()
  tick()
  assert.equal(st.state.aliens.length, 1)
  assert.ok(targets.some(t => t.data?.note))
  while (conductor.time < st.state.t0 + 8 * spb) tick()
  const firstNotes = fired.slice(0, first.notes.length)
  assert.equal(firstNotes.length, first.notes.length)
  firstNotes.forEach((n, i) => {
    assert.ok(near(n.arriveAt, st.state.t0 + first.notes[i].beat * spb, 1e-9))
    assert.equal(n.midi, first.notes[i].midi)
  })
})

test("a note's flight takes it to the ring, in the lane of its pitch, at its time", () => {
  const firedAt = []
  const rig = stageRig({ fire: n => { firedAt.push(rig.conductor.time); rig.fired.push(n) } })
  rig.tick(1 / 60, { discHit: true })
  while (rig.fired.length < 6) rig.tick()
  rig.fired.forEach((n, i) => {
    const t = n.arriveAt - firedAt[i]
    const x = n.x + n.vx * t, y = n.y + n.vy * t
    const c = { x: 2900, y: 860 }
    assert.ok(near(Math.hypot(x - c.x, y - c.y), ARRIVE_R, 1.5), `on the ring (${Math.hypot(x - c.x, y - c.y)})`)
    assert.equal(fan.fanNoteAt(TEST_SONG.fan, Math.atan2(y - c.y, x - c.x)), n.midi)
  })
})

test('rebates score with the combo, misses lower the afinação, an alien that comes in touches her', () => {
  const { st, conductor, targets, fired, events, tick } = stageRig()
  tick(1 / 60, { discHit: true })
  while (fired.length < 3) tick()
  const shot = n => ({ ...n, id: 0, state: 'incoming', t: 0 })
  events.push({ kind: 'rebate', shot: shot(fired[0]), grade: 'perfect', off: 0, player: 'p1', midi: fired[0].midi })
  events.push({ kind: 'rebate', shot: shot(fired[1]), grade: 'good', off: 0.1, player: 'p1', midi: fired[1].midi })
  tick()
  assert.equal(st.state.score, 300 + 150)
  assert.equal(st.state.combo, 2)
  events.push({ kind: 'miss', shot: shot(fired[2]) })
  tick()
  assert.equal(st.state.combo, 0)
  assert.ok(near(st.state.afina, 1 - stageLib.AFINA_MISS))
  // the first alien reaches her two beats after its last note
  const spb = 60 / TEST_SONG.music.zone.bpm
  const id = st.state.aliens[0].id
  while (conductor.time < st.state.t0 + (6 + stageLib.AFTER_BEATS) * spb + 0.05) tick()
  assert.ok(!targets.some(t => t.id === id), 'gone after touching her')
  assert.equal(st.state.judge?.grade ?? 'contact', 'contact')
})

test('aliens shot down or turned into birds score and fire no more; the song ends when they are all gone', () => {
  const { st, conductor, targets, fired, tick } = stageRig()
  tick(1 / 60, { discHit: true })
  const spb = 60 / TEST_SONG.music.zone.bpm
  while (st.state.aliens.length === 0) tick()
  const a = targets.find(t => t.id === st.state.aliens[0].id)
  a.state = 'converted'; a.deadT = 0.001
  tick()
  assert.equal(st.state.counts.birds, 1)
  assert.ok(st.state.score >= stageLib.BIRD_POINTS)
  const before = fired.length
  // let the whole song play with every alien turned into a bird as soon as it comes in
  for (let i = 0; i < 60 * 40 && st.state.phase === 'playing'; i++) {
    targets.forEach(t => { if (t.data?.note && t.state !== 'converted') { t.state = 'converted'; t.deadT = 0.001 } })
    tick()
  }
  assert.equal(st.state.phase, 'done')
  assert.equal(st.state.counts.birds, TEST_SONG.aliens.length)
  assert.ok(fired.length - before < noteCount(TEST_SONG))
  assert.ok(conductor.time > st.state.t0 + 30 * spb)
})

test('notes that get through can lose the song; the reset stone stops it; the campaign keeps the disc quiet', () => {
  const { st, fired, events, tick } = stageRig()
  tick(1 / 60, { discHit: true })
  while (fired.length < 1) tick()
  for (let k = 0; k < Math.ceil(1 / stageLib.AFINA_MISS); k++) events.push({ kind: 'miss', shot: { ...fired[0], id: 0, state: 'missed', t: 0 } })
  tick()
  assert.equal(st.state.phase, 'failed')
  const b = stageRig()
  b.tick(1 / 60, { discHit: true })
  for (let k = 0; k < stageLib.RESET_NEED; k++) b.tick(1 / 60, { resetHit: true })
  assert.equal(b.st.state.phase, 'idle')
  const c = stageRig()
  c.tick(1 / 60, { discHit: true, busy: true })
  assert.equal(c.st.state.phase, 'idle')
  assert.ok(c.sounds.some(s => s.kind === 'dull'))
})

test("the stage's note rule: the fan by where the note is around her, or the note sequenced", () => {
  const { st, tick } = stageRig()
  tick(1 / 60, { discHit: true })
  const c = st.state.center
  const ang = fan.fanAngleOf(TEST_SONG.fan, 81)
  const shot = { x: c.x + Math.cos(ang) * 70, y: c.y + Math.sin(ang) * 70, midi: 62, source: 'stage' }
  assert.equal(st.noteFor(shot), 81)
  assert.equal(st.noteFor({ ...shot, source: 'other' }), null)
  assert.equal(accuracy({ perfect: 2, good: 1, fora: 1, miss: 1 }, 5), (2 + 0.6 + 0.2) / 5)
})
