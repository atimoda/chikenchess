const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const G = loadTs('lib/pigchicken/star-grid.ts')
const P = loadTs('lib/pigchicken/star-play.ts')
const { INSTRUMENT_SCALES, STAR_SCALE, STAR_AXIS, cleanScales } = loadTs('lib/pigchicken/instrument-scales.ts')
const { DEFAULT_ITEMS, FIXED_IDS } = loadTs('lib/pigchicken/items.ts')
const { createConductor } = loadTs('lib/pigchicken/music.ts')

const DT = 1 / 60
const pc = m => ((m % 12) + 12) % 12

test('Estrela: each direction out of the middle is an interval, the left half the mirror of the right', () => {
  // right half, one step: 30° semitone, 60° whole tone, 90° minor third, 120° major third, 150° fourth
  assert.deepEqual([[1, -3], [1, -1], [2, 0], [1, 1], [1, 3]].map(([c, v]) => G.starSemis(c, v)), [1, 2, 3, 4, 5])
  // the left half goes down by as much
  assert.deepEqual([[-1, -3], [-1, -1], [-2, 0], [-1, 1], [-1, 3]].map(([c, v]) => G.starSemis(c, v)), [-1, -2, -3, -4, -5])
  // a cell between two directions walks both: 7 semitones-steps and 1 whole-tone-step = 9 semitones down
  assert.equal(G.starSemis(-8, -22), -9)
  // the arms of 8 reach the tips: fourths to the lower right go up 40 semitones
  assert.equal(G.starSemis(8, 24), 40)
})

test('Estrela: a hexagram of cells without the axis column; a point finds its cell and a drag every cell on its way', () => {
  const g = G.starGrid(8)
  assert.equal(g.cells.length, 416)
  assert.ok(g.cells.every(c => c.c !== 0))
  for (const c of g.cells) assert.equal(G.starCellAt(g, c.x, c.y), c.index)
  // the tips are at radius 1, the axis' column and the outside are not played
  assert.ok(g.cells.some(c => Math.abs(Math.hypot(c.x, c.y) - 1) < 1e-9))
  assert.equal(G.starCellAt(g, 0, 0.3), -1)
  assert.equal(G.starCellAt(g, 0.9, 0.9), -1)
  // the nearest cell for a point off the star (a stick pushed out of it)
  assert.ok(G.starNearest(g, 0.9, 0.9) >= 0)
  // a drag across the middle crosses the axis (-1) and touches every cell in a row
  const path = G.starPath(g, -0.3, 0.02, 0.3, 0.02)
  assert.ok(path.includes(-1))
  assert.ok(path.filter(k => k >= 0).length >= 10)
  // fewer, bigger cells with shorter arms
  assert.ok(G.starGrid(4).cells.length < g.cells.length)
})

test('Estrela as a scale: the axis is D, black keys are dark, the zone scale is lit and every cell plays', () => {
  const music = createConductor(), s = INSTRUMENT_SCALES.star
  assert.equal(s, STAR_SCALE)
  assert.equal(s.label, 'Estrela')
  assert.equal(STAR_AXIS, 62)
  const keys = s.layout(music, { octave: 0 })
  assert.equal(keys.length, s.grid.cells.length)
  // the black keys are exactly the sharps / flats, both sides symmetric around D
  keys.forEach(k => assert.equal(k.black, [1, 3, 6, 8, 10].includes(pc(k.midi))))
  // the first zone is C major: the notes of its scale are the lit ones
  const steps = new Set([0, 2, 4, 5, 7, 9, 11].map(x => pc(music.zone.root + x)))
  if (music.zone.scale === 'major') keys.forEach(k => assert.equal(k.inScale, steps.has(pc(k.midi))))
  // seven octaves, about the grand piano's range
  const lo = Math.min(...keys.map(k => k.midi)), hi = Math.max(...keys.map(k => k.midi))
  assert.ok(lo <= 21 && hi >= 104, `${lo}..${hi}`)
  // the aim: one step right of the middle is a minor third over the axis' note
  const right = s.grid.cells.find(c => c.c === 2 && c.v === 0)
  assert.equal(s.noteFor(music, { angle: 0, reach: Math.hypot(right.x, right.y), set: 'scale', octave: 0, span: 2 }), 65)
  assert.equal(s.noteFor(music, { angle: Math.PI, reach: Math.hypot(right.x, right.y), set: 'scale', octave: 0, span: 2 }), 59)
  // any instrument can turn it on
  assert.deepEqual(cleanScales(['star', 'primary']), ['primary', 'star'])
})

test('Estrela hands: a press plays its cell, a drag the cells it goes into, nothing without the press held', () => {
  const g = G.starGrid(8), hand = P.newStarHand()
  const hit = (x, y) => G.starCellAt(g, x, y), path = (a, b, c, d) => G.starPath(g, a, b, c, d)
  const a = g.cells.find(c => c.c === 2 && c.v === 0), b = g.cells.find(c => c.c === 6 && c.v === 0)
  assert.deepEqual(P.stepStarHand(hand, a, false, false, hit, path), [])
  assert.deepEqual(P.stepStarHand(hand, a, true, true, hit, path), [a.index])
  assert.deepEqual(P.stepStarHand(hand, a, true, false, hit, path), [])
  const drag = P.stepStarHand(hand, b, true, false, hit, path)
  assert.equal(drag[drag.length - 1], b.index)
  assert.ok(drag.length >= 2 && !drag.includes(a.index))
  // let go and pressed again on the same cell: it plays again
  P.stepStarHand(hand, b, false, false, hit, path)
  assert.deepEqual(P.stepStarHand(hand, b, true, true, hit, path), [b.index])
})

test('Estrela dynamics: by the body, and sitting by the binds as if she moved', () => {
  assert.equal(P.bodyDynamic('brood', 0), 'ppp')
  assert.equal(P.bodyDynamic('brood', 80), 'pp')
  assert.equal(P.bodyDynamic('crouch', 0), 'p')
  assert.equal(P.bodyDynamic('idle', 0), 'mp')
  assert.equal(P.bodyDynamic('walk', 100), 'mp')
  assert.equal(P.bodyDynamic('run', 300), 'mf')
  assert.equal(P.bodyDynamic('jump', 0), 'f')
  assert.equal(P.bodyDynamic('fly', 0), 'ff')
  const b = o => ({ ...P.NO_MOVES, ...o })
  assert.equal(P.bindDynamic(b({ brood: true }), 0), 'ppp')
  assert.equal(P.bindDynamic(b({ brood: true, walk: true }), 0), 'pp')
  assert.equal(P.bindDynamic(b({ crouch: true }), 0), 'p')
  assert.equal(P.bindDynamic(b({}), 0), 'mp')
  assert.equal(P.bindDynamic(b({ run: true }), 0), 'mf')
  assert.equal(P.bindDynamic(b({ jump: true }), 0.1), 'f')
  assert.equal(P.bindDynamic(b({ jump: true }), 0.5), 'ff')
  const v = P.DYNAMICS.map(d => P.DYNAMIC_VEL[d])
  assert.ok(v.every((x, i) => i === 0 || x > v[i - 1]))
})

test('Correr accumulator: a burst, a cascade on the slide, triplets while brooding that stop when Chocar ends', () => {
  const beat = 0.6
  const fill = run => { [60, 64, 67, 64].forEach((midi, i) => P.recordRun(run, { index: i, midi, vel: 0.5 })) }
  // burst: every distinct note at once
  let run = P.newStarRun()
  P.stepStarRun(run, { run: true, crouch: false, brood: false }, 0, beat)
  fill(run)
  let out = P.stepStarRun(run, { run: false, crouch: false, brood: false }, 1, beat)
  assert.deepEqual(out.map(n => n.midi).sort(), [60, 64, 67])
  assert.ok(out.every(n => n.at === 0))
  // nothing is kept when Correr is not held
  P.recordRun(run, { index: 9, midi: 70, vel: 0.5 })
  assert.equal(run.notes.length, 0)
  // cascade: in order, a 32nd note apart
  run = P.newStarRun()
  P.stepStarRun(run, { run: true, crouch: false, brood: false }, 0, beat)
  fill(run)
  const got = []
  for (let t = 1; t < 2; t += DT) got.push(...P.stepStarRun(run, { run: false, crouch: true, brood: false }, t, beat).map(n => ({ ...n, t: t + n.at })))
  assert.deepEqual(got.map(n => n.midi), [60, 64, 67, 64])
  assert.ok(Math.abs((got[1].t - got[0].t) - beat * P.CASCADE_STEP) < 0.02)
  // triplets while brooding; leaving Chocar stops the rest
  run = P.newStarRun()
  P.stepStarRun(run, { run: true, crouch: false, brood: false }, 0, beat)
  fill(run)
  const tri = []
  tri.push(...P.stepStarRun(run, { run: false, crouch: false, brood: true }, 1, beat))
  for (let t = 1 + DT; t < 1.25; t += DT) tri.push(...P.stepStarRun(run, { run: false, crouch: false, brood: true }, t, beat))
  assert.equal(tri.length, 2) // at 0 and at a third of a beat (0.2 s)
  for (let t = 1.25; t < 3; t += DT) tri.push(...P.stepStarRun(run, { run: false, crouch: false, brood: false }, t, beat))
  assert.equal(tri.length, 2)
})

test('Piano de cauda: sits on the Estrela; a click plays, Pular keeps her seated, Golpe gets her up, Correr bursts', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const F = loadTs('lib/pigchicken/fixed-instruments.ts')
  const L = loadTs('lib/pigchicken/layout.ts')
  assert.ok(FIXED_IDS.includes('grandpiano'))
  assert.deepEqual(DEFAULT_ITEMS.grandpiano.scales, ['star'])
  assert.equal(DEFAULT_ITEMS.grandpiano.voice, 'grandPiano')
  assert.equal(F.seatKeepsJump('grandpiano'), true)
  assert.equal(F.seatKeepsJump('pedalharp'), false)
  assert.equal(L.ELEMENT_DEFS.grandpiano.group, 'Música')
  const c = createCombat(); c.setItems(structuredClone(DEFAULT_ITEMS))
  const notes = []
  c.setMusicOut({ note: (voice, midi, at, len, vel) => notes.push({ voice, midi, vel }), hold: () => null, drum() {} })
  c.give('flute')
  const seat = c.addSeat('p1', 'grandpiano', 500, 0, 1), spot = F.seatSpot(seat)
  const ctl = o => ({ fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...o })
  const step = (o = {}) => c.step(DT, { x: spot.x, y: 0, face: 1, scale: 1, grounded: true, state: 'seat', vx: 0 }, { x: spot.x, y: -60 }, { x: spot.x, y: -60 }, 0, ctl(o), [], 0, () => {})
  step()
  step({ grab: true })
  assert.equal(c.seated, seat)
  assert.equal(c.scale.id, 'star')
  const cell = STAR_SCALE.grid.cells.find(k => k.c === 2 && k.v === 0)
  const hand = { angle: 0, reach: Math.hypot(cell.x, cell.y), kind: 'point' }
  c.setStringHands([hand, null])
  assert.equal(c.starHands[0], cell.index)
  // a click: its note at the standing dynamic (mp), flying off
  const before = c.bullets.length
  notes.length = 0
  step({ fire: true, firePressed: true, moves: { ...P.NO_MOVES } })
  assert.deepEqual(notes.map(n => [n.voice, Math.round(n.midi)]), [['grandPiano', 65]])
  assert.ok(Math.abs(notes[0].vel - P.DYNAMIC_VEL.mp) < 1e-9)
  assert.equal(c.bullets.length, before + 1)
  assert.ok(c.starAge(cell.index) < 0.1)
  // a gamepad trigger at a quarter: it plays, softer
  notes.length = 0
  step({ moves: { ...P.NO_MOVES } })
  c.setStringHands([{ angle: 0, reach: Math.hypot(cell.x, cell.y), kind: 'stick' }, null])
  step({ fireDepth: 0.25, moves: { ...P.NO_MOVES } })
  assert.equal(notes.length, 1)
  assert.ok(Math.abs(notes[0].vel - P.DYNAMIC_VEL.mp * 0.25) < 1e-9)
  // Correr held: the note goes into the run (at mf); let go: the burst plays it again
  step({ moves: { ...P.NO_MOVES } })
  notes.length = 0
  c.setStringHands([hand, null])
  step({ moves: { ...P.NO_MOVES, run: true } })
  step({ fire: true, firePressed: true, moves: { ...P.NO_MOVES, run: true } })
  assert.deepEqual(c.starRun, [cell.index])
  step({ moves: { ...P.NO_MOVES, run: false } })
  assert.equal(notes.length, 2)
  assert.ok(Math.abs(notes[0].vel - P.DYNAMIC_VEL.mf) < 1e-9)
  // Golpe gets her up (Pular does not: the engine keeps her seated, see seatKeepsJump)
  step({ melee: true })
  assert.equal(c.seated, null)
})
