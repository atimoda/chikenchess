const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const tf = loadTs('lib/pigchicken/transforms.ts')
const { DEFAULT_ITEMS, ITEM_IDS } = loadTs('lib/pigchicken/items.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const swing = loadTs('lib/pigchicken/swing.ts')
const stageLib = loadTs('lib/pigchicken/note-stage.ts')
const fan = loadTs('lib/pigchicken/fan.ts')

// C major, the C major chord, 120 bpm (0.5 s a beat)
const C = { root: 60, steps: [0, 2, 4, 5, 7, 9, 11], chord: [60, 64, 67], spb: 0.5, combo: 0, angle: 0, byAngle: (a, oct) => 72 + oct * 12, rand: () => 0.99 }
const note = (midi = 64) => ({ midi, at: 0, dur: 0.4, vel: 0.8, voice: 'bells' })
const run = (chain, c = C, n = note()) => tf.applyChain([n], chain, c)
const T = (kind, mode, n, chance = 1) => ({ ...tf.newTransform(kind, chance), ...(mode !== undefined ? { mode } : {}), ...(n !== undefined ? { n } : {}) })
const midis = out => out.map(o => o.midi)
const near = (a, b) => Math.abs(a - b) < 1e-9

test('pitch: transpose by degrees or semitones, octaves, a fixed note, the chord, the mirror, a walk, the aim', () => {
  assert.deepEqual(midis(run([T('transpose', 'degree', 2)])), [67], 'a third up in the scale: E → G')
  assert.deepEqual(midis(run([T('transpose', 'degree', 4)])), [71], 'a fifth: E → B')
  assert.deepEqual(midis(run([T('transpose', 'semitone', -1)])), [63])
  assert.deepEqual(midis(run([T('octave', 'fixed', 1)])), [76])
  assert.deepEqual(midis(run([T('octave', 'random', 2)], { ...C, rand: () => 0.0 })), [40])
  assert.deepEqual(midis(run([T('fixed', undefined, 55)])), [55])
  assert.deepEqual(midis(run([T('snapChord')], C, note(65))), [64], 'F → E of the chord')
  assert.deepEqual(midis(run([T('mirror')], C, note(64))), [57], 'E, two degrees above C, mirrors to A, two degrees below')
  assert.deepEqual(midis(run([T('walk', undefined, 1)], { ...C, rand: () => 0 })), [62])
  assert.deepEqual(midis(run([T('byAngle', undefined, 1)])), [84])
})

test('scale: keep the degree and change the scale (parallel, relative, diminished)', () => {
  assert.deepEqual(midis(run([T('parallel', 'parallel')])), [63], 'E in C major is the third: Eb in C minor')
  assert.deepEqual(midis(run([T('scale', 'dorian')], C, note(69))), [69])
  assert.deepEqual(midis(run([T('parallel', 'relative')], C, note(60))), [57], 'the tonic of A minor')
  assert.equal(run([T('parallel', 'diminished')]).length, 1)
})

test('voices: double, chords on top of the note, a second voice in thirds or sixths', () => {
  const d = run([T('double', undefined, 2)])
  assert.deepEqual(d.map(o => o.at), [0, 0.25])
  assert.deepEqual(midis(run([T('voices', 'triad')], C, note(60))), [60, 64, 67])
  assert.deepEqual(midis(run([T('voices', 'power')], C, note(60))), [60, 67])
  assert.deepEqual(midis(run([T('voices', 'seventh')], C, note(60))), [60, 64, 67, 71])
  assert.deepEqual(midis(run([T('counter', 'thirds', 1)], C, note(60))), [60, 64])
  assert.deepEqual(midis(run([T('counter', 'sixths', -1)], C, note(60))), [60, 52])
})

test('rhythm: arpeggios, echoes, ratchets and pushes, all in the beat', () => {
  const arp = run([T('voices', 'triad'), T('arpeggio', 'down', 0.75)], C, note(60))
  assert.deepEqual(midis(arp), [67, 64, 60])
  assert.ok(near(arp[1].at, 0.125) && near(arp[2].at, 0.25))
  const echo = run([T('echo', 'dotted', 2)])
  assert.deepEqual(echo.map(o => o.at), [0, 0.375, 0.75])
  assert.ok(echo[2].vel < echo[1].vel && echo[1].vel < echo[0].vel)
  const r = run([T('ratchet', undefined, 4)])
  assert.equal(r.length, 4); assert.ok(near(r[3].at, 3 * 0.5 / 8))
  assert.ok(near(run([T('shift', 'offbeat')])[0].at, 0.25))
})

test('ornaments, glissando and the blue note', () => {
  const app = run([T('ornament', 'appoggiatura')])
  assert.deepEqual(midis(app), [65, 64]); assert.ok(app[1].at > 0)
  assert.equal(run([T('ornament', 'trill')]).length, 5)
  const gl = run([T('gliss', 'up', 3)], C, note(60))
  assert.deepEqual(midis(gl), [55, 57, 59, 60])
  assert.deepEqual(midis(run([T('blue', 'third')])), [63.5], 'the third bent a quarter tone down')
  assert.deepEqual(midis(run([T('blue', 'seventh')])), [64], 'not a seventh: left alone')
})

test('sound and game: timbre, drums, dynamics, the combo', () => {
  assert.equal(run([T('timbre', 'harp')])[0].voice, 'harp')
  const drum = run([T('drum', 'taiko', 0)])
  assert.equal(drum.length, 1); assert.equal(drum[0].drum, 'taiko')
  assert.equal(run([T('drum', 'jingle', 1)]).length, 2, 'or added to the note')
  assert.ok(run([T('dynamics', 'accent')])[0].vel > 0.8)
  assert.ok(near(run([T('dynamics', 'staccato')])[0].dur, 0.4 * 0.35))
  assert.deepEqual(midis(run([T('combo', 'octave', 8)], { ...C, combo: 17 })), [88])
  assert.deepEqual(midis(run([T('combo', 'octave', 8)], { ...C, combo: 3 })), [64])
})

test('each step happens with its chance; a chain is capped', () => {
  assert.deepEqual(midis(run([T('octave', 'fixed', 1, 0.5)], { ...C, rand: () => 0.7 })), [64])
  assert.deepEqual(midis(run([T('octave', 'fixed', 1, 0.5)], { ...C, rand: () => 0.2 })), [76])
  const many = run(Array(8).fill(T('double', undefined, 1)))
  assert.ok(many.length <= tf.NOTES_MAX)
})

test("a note's rule says whose transformations count, and in which order", () => {
  const chain = [T('transpose', 'degree', 1)]
  const env = { base: 69, fit: { root: 60, steps: [0, 2, 4, 7, 9] } } // the C pentatonic, forcing A
  const play = rule => midis(tf.rebateSound(note(64), rule, chain, env, C))
  assert.deepEqual(play('travada'), [64])
  assert.deepEqual(play('taco'), [65], 'F: the taco alone may leave the pentatonic')
  assert.deepEqual(play('taco-ambiente'), [64], 'F fitted to the pentatonic goes to the nearest note, E')
  assert.deepEqual(play('ambiente'), [69])
  assert.deepEqual(play('ambiente-taco'), [71], 'A, then the taco: B')
  assert.ok(tf.REBATE_RULES.some(r => r.value === tf.DEFAULT_RULE))
})

test('saved chains are checked: unknown steps dropped, numbers kept in range', () => {
  assert.equal(tf.cleanTransform({ kind: 'nope' }), null)
  const t = tf.cleanTransform({ kind: 'echo', chance: 3, n: 99, mode: 'triplet' })
  assert.deepEqual([t.chance, t.n, t.mode], [1, 6, 'triplet'])
  assert.equal(tf.cleanTransform({ kind: 'echo', mode: 'what' }).mode, 'dotted')
  const { loadItems } = loadTs('lib/pigchicken/items.ts')
  const previous = globalThis.window
  try {
    const saved = { _v: 5, flute: { rebateChain: [{ kind: 'octave', chance: 1, n: -1, mode: 'fixed' }, { kind: 'bad' }] } }
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const it = loadItems()
    assert.deepEqual(it.flute.rebateChain.map(t => [t.kind, t.n]), [['octave', -1]])
    assert.deepEqual(it.sax.rebateChain, DEFAULT_ITEMS.sax.rebateChain)
  } finally { globalThis.window = previous }
})

test("every item's rebate has the plan's defaults", () => {
  const kinds = id => DEFAULT_ITEMS[id].rebateChain.map(t => t.mode ? `${t.kind}:${t.mode}` : t.kind)
  assert.deepEqual(kinds('wing'), ['dynamics:soft'])
  assert.deepEqual(kinds('bat'), ['dynamics:accent'])
  assert.deepEqual(kinds('flute'), ['octave:fixed'])
  assert.deepEqual(kinds('sax'), ['transpose:degree'])
  assert.deepEqual(kinds('trumpet'), ['voices:power'])
  assert.deepEqual(kinds('guitar'), ['voices:triad', 'arpeggio:up'])
  assert.deepEqual(kinds('violin'), ['gliss:up', 'dynamics:legato'])
  assert.deepEqual(kinds('keys'), ['voices:seventh'])
  assert.deepEqual(kinds('tambourine'), ['ratchet', 'drum:jingle'])
  assert.deepEqual(kinds('harp'), ['voices:triad', 'arpeggio:up'])
  assert.deepEqual(kinds('pistol'), ['dynamics:staccato'])
  assert.deepEqual(kinds('smg'), ['ratchet'])
  assert.deepEqual(kinds('rifle'), ['transpose:degree'])
  assert.deepEqual(kinds('pump'), ['voices:cluster'])
  assert.deepEqual(kinds('sniper'), ['octave:fixed', 'dynamics:staccato'])
  assert.deepEqual(kinds('launcher'), ['echo:dotted'])
  assert.deepEqual(kinds('grenade'), ['octave:random'])
  assert.deepEqual(kinds('bow'), ['counter:thirds'])
  assert.equal(DEFAULT_ITEMS.sniper.rebateSnap, 0); assert.equal(DEFAULT_ITEMS.bow.rebateSnap, 0)
  assert.ok(DEFAULT_ITEMS.pump.rebateSnap > DEFAULT_ITEMS.wing.rebateSnap)
  assert.ok(ITEM_IDS.includes('bat'))
  assert.equal(DEFAULT_ITEMS.bat.mag, 8); assert.equal(DEFAULT_ITEMS.bat.meleeOnly, true); assert.equal(DEFAULT_ITEMS.bat.rebateTok, true)
})

// ---------- in the combat ----------
const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, dt = 0.016) {
  c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
}
const wait = (c, s, angle = 0) => { for (let t = 0; t < s; t += 0.016) step(c, {}, angle) }
function rebate(c, item, { angle = 0, midi = 64, input = { melee: true } } = {}) {
  const d = item ? DEFAULT_ITEMS[item] : DEFAULT_ITEMS.wing
  const hit = c.music.time + 0.016 + d.meleeTime * swing.SWING_PHASES.prep
  const n = c.fireNoteShot({ x: 60, y: 0, vx: 0, vy: 0, midi, color: '#fff', size: 8, glow: 0.5, arriveAt: hit, source: 'test' })
  step(c, input, angle)
  wait(c, 0.15, angle)
  return { n, ev: c.noteEvents.find(e => e.kind === 'rebate') }
}
function holding(item) {
  const c = createCombat(), played = [], drums = []
  c.setMusicOut({ note: (voice, midi, at, dur, vel) => played.push({ voice, midi, at, dur, vel }), hold: () => null, drum: (kind, at, vel) => drums.push({ kind, at, vel }) })
  if (item) { c.give(item); step(c, { slot: 1 }) }
  return { c, played, drums }
}

test("a rebate plays what the item's chain makes of the note: the flute an octave up, the trumpet a power chord", () => {
  const f = holding('flute')
  const { ev } = rebate(f.c, 'flute', { midi: 62 })
  assert.deepEqual(ev.notes.map(o => o.midi), [74])
  assert.ok(f.played.some(p => p.midi === 74 && p.voice === 'flute'))
  const t = holding('trumpet')
  assert.deepEqual(rebate(t.c, 'trumpet', { midi: 60 }).ev.notes.map(o => o.midi), [60, 67])
})

test('the Taco: only for hitting (Atirar is its strong blow, let go to hit), a wooden tok and a faster rebate', () => {
  const b = holding('bat')
  step(b.c, { fire: true, firePressed: true })
  assert.equal(b.c.swing, null, 'Atirar held only charges')
  step(b.c, {})
  assert.ok(b.c.swing && !b.c.swing.wing && b.c.swing.heavy, 'letting go swings the bat')
  wait(b.c, 0.5)
  const { n } = rebate(b.c, 'bat')
  assert.ok(b.drums.some(d => d.kind === 'wood'), 'tok')
  const w = holding(null)
  const { n: m } = rebate(w.c, null)
  assert.ok(Math.hypot(n.vx, n.vy) > Math.hypot(m.vx, m.vy) * 1.5)
})

test("the snap pulls a rebated note toward the nearest character within the item's angle", () => {
  const add = c => c.targets.push({ id: 7, kind: 'alien', home: 0, x: 600, y: -150, w: 40, h: 40, hp: 30, maxHp: 30, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'fly', animT: 0, data: { kind: 'temple' } })
  const w = holding(null); add(w.c)
  const { n } = rebate(w.c, null)
  assert.ok(n.vy < -1, 'pulled up toward the alien')
  const s = holding('sniper'); add(s.c)
  const { n: m } = rebate(s.c, 'sniper')
  assert.ok(Math.abs(m.vy) < 1, 'the sniper has no snap')
})

test("in the stage the fan fixes the note and the taco ornaments it (unless the alien's rule says otherwise)", () => {
  const st = stageLib.createNoteStage()
  st.state.phase = 'playing'
  const c = st.state.center
  const ang = fan.fanAngleOf(stageLib.TEST_SONG.fan, 74)
  const shot = { x: c.x + Math.cos(ang) * 70, y: c.y + Math.sin(ang) * 70, midi: 62, source: st.source }
  const env = st.noteEnv(shot)
  assert.equal(env.base, 74)
  assert.equal(env.rule, 'ambiente-taco')
  assert.equal(st.noteEnv({ ...shot, rule: 'travada' }).rule, 'travada')
  const flute = tf.rebateSound(note(62), env.rule, DEFAULT_ITEMS.flute.rebateChain, env, C)
  assert.deepEqual(midis(flute), [86])
})
