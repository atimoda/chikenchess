const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')

const store = new Map()
global.window = {
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  dispatchEvent: () => true, addEventListener() {}, removeEventListener() {},
}
const lib = loadTs('lib/pigchicken/song-library.ts')
const ed = loadTs('lib/pigchicken/song-edit.ts')
const stageLib = loadTs('lib/pigchicken/note-stage.ts')
const music = loadTs('lib/pigchicken/music.ts')

const song = () => structuredClone(lib.BUILTIN_SONGS[0])
const firstBeat = a => Math.min(...a.notes.map(n => n.beat))

test('moving aliens: in time, and across lanes inside the fan', () => {
  const s = song(), lanes = ed.laneNotes(s)
  const moved = ed.moveAliens(s, [0], 2, 1)
  assert.deepEqual(moved.aliens[0].notes.map(n => n.beat), s.aliens[0].notes.map(n => n.beat + 2))
  s.aliens[0].notes.forEach((n, i) => assert.equal(moved.aliens[0].notes[i].midi, lanes[Math.min(lanes.length - 1, ed.laneOf(lanes, n.midi) + 1)]))
  assert.equal(moved.aliens[1], s.aliens[1], 'the others stay')
  const top = ed.moveAliens(s, [0], 0, 99)
  assert.ok(top.aliens[0].notes.every(n => n.midi === lanes[lanes.length - 1]), 'kept inside the fan')
  // one note of an alien, its notes kept in order
  const one = ed.moveNote(s, 0, 0, 10, 0)
  assert.deepEqual(one.aliens[0].notes.map(n => n.beat), [1, 2, 3, 4, 6, 10])
})

test('adding and taking out: an alien of four notes, a note, the last note takes its alien', () => {
  const s = song(), lanes = ed.laneNotes(s)
  const r = ed.addAlien(s, 40, lanes[2], { species: 'lantern', variant: 'lantern' })
  assert.equal(r.index, s.aliens.length)
  assert.deepEqual(r.song.aliens[r.index].notes, [40, 41, 42, 43].map(beat => ({ beat, midi: lanes[2] })))
  const plus = ed.addNote(r.song, r.index, 41.5, lanes[3])
  assert.equal(plus.aliens[r.index].notes.length, 5)
  assert.equal(ed.addNote(plus, r.index, 41.5, lanes[3]).aliens[r.index].notes.length, 5, 'the same note twice is one')
  let x = r.song
  for (let k = 0; k < 4; k++) x = ed.removeNote(x, r.index, 0)
  assert.equal(x.aliens.length, s.aliens.length)
})

test('a pause opens room (everything after it goes later), and closing it brings it back', () => {
  const s = { ...song(), lines: [{ beat: 20, who: 'gongo', text: 'Oi', secs: 2, place: 'banner', blip: true }] }
  const r = ed.insertPause(s, 16, 2)
  assert.deepEqual(r.song.pauses, [{ beat: 16, bars: 2, silent: false }])
  s.aliens.forEach((a, i) => assert.equal(firstBeat(r.song.aliens[i]), firstBeat(a) >= 16 ? firstBeat(a) + 8 : firstBeat(a)))
  assert.equal(r.song.lines[0].beat, 28)
  // longer: what comes after it goes later again
  const longer = ed.setPauseBars(r.song, 0, 3)
  assert.equal(firstBeat(longer.aliens[2]), 16 + 12)
  assert.equal(longer.pauses[0].beat, 16, 'the pause itself stays')
  // deleting it closes the room
  const back = ed.removeItems(longer, { aliens: [], lines: [], pauses: [0] })
  assert.deepEqual(back.aliens.map(firstBeat), s.aliens.map(firstBeat))
  assert.equal(back.lines[0].beat, 20)
  assert.equal(stageLib.songEnd(r.song), Math.max(stageLib.songEnd(s) + 8))
})

test('copy and paste at the cursor; another key keeps each note in its lane', () => {
  const s = song()
  const clip = ed.copyItems(s, { aliens: [0, 1], lines: [], pauses: [] })
  assert.equal(firstBeat(clip.aliens[0]), 0, 'from the first beat among them')
  const r = ed.pasteClip(s, clip, 64)
  assert.equal(r.song.aliens.length, s.aliens.length + 2)
  assert.deepEqual(r.sel.aliens, [s.aliens.length, s.aliens.length + 1])
  assert.equal(firstBeat(r.song.aliens[s.aliens.length]), 64)
  const before = ed.laneNotes(s)
  const t = ed.retune(s, 57, 'minorPenta')
  const after = ed.laneNotes(t)
  assert.equal(t.music.zone.root, 57); assert.equal(t.music.zone.scale, 'minorPenta'); assert.equal(t.music.zone.chordScale, 'minor')
  s.aliens.forEach((a, i) => a.notes.forEach((n, k) => assert.equal(after.indexOf(t.aliens[i].notes[k].midi), before.indexOf(n.midi))))
})

test('pauses and lines are kept when saved, and cleaned', () => {
  const raw = { ...song(), id: 'x', pauses: [{ beat: 8, bars: 99, silent: true }, { beat: 'no' }], lines: [{ beat: 4, who: 'alien:jelly-x', text: 'a'.repeat(500), secs: 99, place: 'balao' }, { beat: 2, who: 'ninguém', text: 'Oi', place: 'chão', blip: false }] }
  const s = lib.normalizeSong(raw)
  assert.deepEqual(s.pauses, [{ beat: 8, bars: 16, silent: true }])
  assert.equal(s.lines.length, 2)
  assert.deepEqual(s.lines[0], { beat: 2, who: 'narrador', text: 'Oi', secs: 3, place: 'banner', blip: false })
  assert.equal(s.lines[1].who, 'alien:jelly-x'); assert.equal(s.lines[1].text.length, lib.LINE_TEXT_MAX); assert.equal(s.lines[1].secs, 20)
  assert.equal(lib.normalizeSong(song()).pauses, undefined, 'none: nothing saved')
})

// the stage, driven like the game
function rig(sg) {
  const st = stageLib.createNoteStage()
  st.setSongs([sg])
  const conductor = music.createConductor()
  const targets = [], fired = [], sounds = []
  const tick = (dt = 1 / 60, extra = {}) => {
    conductor.setZone(st.music?.zone ?? conductor.zone)
    conductor.step(dt)
    st.step(dt, {
      targets, music: conductor, sceneL: 1920, sceneW: 1920, groundY: 930, inside: true, center: { x: 2900, y: 860 },
      discHit: false, resetHit: false, busy: false, events: [], fire: n => fired.push(n), clearShots() {},
      incoming: 0, fx: { burst() {}, text() {} }, push() {}, sound: s => sounds.push(s), ...extra,
    })
  }
  return { st, conductor, targets, fired, sounds, tick }
}

test('the lines are said on their beat, typed letter by letter with a blip; a silent pause quiets the background', () => {
  const sg = { ...song(), aliens: [{ species: 'jelly', notes: [{ beat: 12, midi: 62 }] }], pauses: [{ beat: 0, bars: 2, silent: true }], lines: [{ beat: 1, who: 'gongo', text: 'Bem-vinda ao templo', secs: 3, place: 'balao', blip: true }] }
  const r = rig(sg)
  r.tick(1 / 60, { discHit: true })
  for (let i = 0; i < 60 * 8 && Number.isNaN(r.st.state.t0); i++) r.tick()
  const spb = 60 / sg.music.zone.bpm
  while (r.conductor.time < r.st.state.t0 + 0.5 * spb) r.tick()
  assert.equal(r.st.silent, true, 'in the silent pause')
  assert.equal(r.st.state.talk.length, 0)
  while (r.conductor.time < r.st.state.t0 + 1 * spb + 0.3) r.tick()
  const t = r.st.state.talk[0]
  assert.ok(t && t.name === 'Gongo' && t.place === 'balao' && t.over, 'over the gong')
  assert.ok(t.shown > 0 && t.shown < t.text.length, `typing (${t.shown})`)
  assert.ok(r.sounds.some(s => s.kind === 'blip' && s.voice === 'bells'))
  while (r.conductor.time < r.st.state.t0 + 9 * spb) r.tick()
  assert.equal(r.st.silent, false, 'the pause is over')
  assert.equal(r.st.state.talk.length, 0, 'gone after its time')
})

test('"Tocar daqui": the draft from a bar, the aliens before it don\'t come, and no record', () => {
  const sg = song()
  const r = rig(lib.BUILTIN_SONGS[0])
  r.st.playDraft(sg, 17.5) // from bar 5 (beat 16)
  r.tick()
  assert.equal(r.st.state.phase, 'playing'); assert.equal(r.st.state.from, 16); assert.equal(r.st.state.draft, true)
  for (let i = 0; i < 60 * 8 && Number.isNaN(r.st.state.t0); i++) r.tick()
  const spb = 60 / sg.music.zone.bpm
  // beat 16 - the intro bars at its first bar line
  assert.ok(Math.abs((r.conductor.time - r.st.state.t0) / spb - (16 - sg.introBars * 4)) < 0.1)
  while (r.conductor.time < r.st.state.t0 + 30 * spb) r.tick()
  assert.ok(r.fired.length > 0)
  assert.ok(r.fired.every(n => n.arriveAt >= r.st.state.t0 + 16 * spb - 1e-6), 'nothing from before bar 5')
  r.st.halt(); r.tick()
  assert.equal(r.st.state.phase, 'idle')
})
