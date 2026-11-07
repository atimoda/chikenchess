const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')

global.window = { localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, dispatchEvent: () => true, addEventListener() {}, removeEventListener() {} }
const midi = loadTs('lib/pigchicken/midi-song.ts')
const lib = loadTs('lib/pigchicken/song-library.ts')
const ed = loadTs('lib/pigchicken/song-edit.ts')

// a tiny Standard MIDI File writer: tracks of [tick, bytes] events
const vlq = n => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out }
function smf(tracks, { ppq = 480, format = 1 } = {}) {
  const chunk = (tag, body) => [...Buffer.from(tag), (body.length >>> 24) & 255, (body.length >> 16) & 255, (body.length >> 8) & 255, body.length & 255, ...body]
  const head = chunk('MThd', [0, format, 0, tracks.length, ppq >> 8, ppq & 255])
  const body = tracks.flatMap(evs => {
    let last = 0
    const bytes = evs.sort((a, b) => a[0] - b[0]).flatMap(([t, ...b]) => { const d = t - last; last = t; return [...vlq(d), ...b] })
    return chunk('MTrk', [...bytes, 0, 0xff, 0x2f, 0])
  })
  return new Uint8Array([...head, ...body])
}
const note = (ch, beat, m, len = 0.5, vel = 100, ppq = 480) => [[beat * ppq, 0x90 | ch, m, vel], [(beat + len) * ppq, 0x80 | ch, m, 0]]
const name = s => [0, 0xff, 0x03, s.length, ...Buffer.from(s)]
const tempo = bpm => { const us = Math.round(60e6 / bpm); return [0, 0xff, 0x51, 3, us >> 16, (us >> 8) & 255, us & 255] }

// a melody in A minor (8 bars, eighth notes), a bass, and drums (kick, snare, hats)
const A_MIN = [57, 59, 60, 62, 64, 65, 67, 69, 72]
const melody = [tempo(240), name('Melodia'), ...Array.from({ length: 64 }, (_, i) => note(0, i / 2, A_MIN[(i * 3) % A_MIN.length])).flat()]
const bass = [name('Baixo'), [0, 0xc0 | 1, 33], ...Array.from({ length: 16 }, (_, i) => note(1, i * 2, [45, 40, 41, 43][i % 4], 1.5)).flat()]
const drums = Array.from({ length: 32 }, (_, i) => [...note(9, i, i % 2 ? 38 : 36, 0.1), ...note(9, i + 0.5, 42, 0.1)]).flat()
const file = smf([melody, bass, drums])

test('reading a .mid: tracks by channel, names, the tempo, notes in beats', () => {
  const f = midi.parseMidi(file)
  assert.equal(f.bpm, 240)
  assert.deepEqual(f.tracks.map(t => [t.name, t.drums, t.notes.length]), [['Melodia', false, 64], ['Baixo', false, 16], ['Bateria', true, 64]])
  assert.equal(f.tracks[0].notes[1].beat, 0.5); assert.equal(f.tracks[1].notes[0].dur, 1.5)
  assert.equal(f.tracks[1].program, 33)
  // running status and note-on with velocity 0 as note-off
  const rs = smf([[[0, 0x90, 60, 90], [240, 60, 0], [240, 62, 90], [480, 62, 0]]], { format: 0 })
  assert.deepEqual(midi.parseMidi(rs).tracks[0].notes.map(n => [n.beat, n.midi, n.dur]), [[0, 60, 0.5], [0.5, 62, 0.5]])
  assert.throws(() => midi.parseMidi(new Uint8Array([1, 2, 3])), /não é MIDI/)
  assert.throws(() => midi.parseMidi(smf([[name('x')]])), /não tem notas/)
})

test('the key is found, and each track gets a variation (drums by piece)', () => {
  const f = midi.parseMidi(file)
  assert.deepEqual(midi.detectKey(f.tracks), { root: 9, minor: true })
  assert.deepEqual(f.tracks.map(t => midi.defaultVariant(t, f.tracks)), ['lantern-flauta', 'jelly-baixo', midi.DRUMS_BY_PIECE])
})

test('generating: a fast tempo read at half, the density of the difficulty, lanes of the fan, aliens of 5 to 15 notes', () => {
  const f = midi.parseMidi(file)
  const tracks = f.tracks.map(t => ({ index: t.index, on: true, variant: midi.defaultVariant(t, f.tracks) }))
  const easy = midi.generateSong(f, { name: 'Do MIDI', tracks, difficulty: 'facil' })
  const hard = midi.generateSong(f, { name: 'Do MIDI', tracks, difficulty: 'insano' })
  const s = hard.song
  assert.equal(s.music.zone.bpm, 120, '240 is read at half')
  assert.equal(s.music.zone.root % 12, 9); assert.equal(s.music.zone.scale, 'minorPenta')
  assert.ok(easy.kept < hard.kept, `easy keeps fewer (${easy.kept} < ${hard.kept})`)
  assert.equal(easy.kept + easy.dropped, hard.kept + hard.dropped)
  const lanes = ed.laneNotes(s)
  for (const song of [easy.song, s]) {
    for (const a of song.aliens) {
      assert.ok(a.notes.length >= 1 && a.notes.length <= 15)
      assert.ok(a.notes.every(n => lanes.includes(n.midi)), 'every note on a lane')
    }
    // never two notes on the same lane closer than the gap
    const all = song.aliens.flatMap(a => a.notes).sort((x, y) => x.beat - y.beat)
    const gap = midi.DIFFICULTIES.find(d => d.value === (song === s ? 'insano' : 'facil')).gap
    const last = new Map()
    for (const n of all) { assert.ok(n.beat - (last.get(n.midi) ?? -99) >= gap - 1e-9); last.set(n.midi, n.beat) }
    // no more notes in a second than the difficulty's
    const nps = Math.floor(midi.DIFFICULTIES.find(d => d.value === (song === s ? 'insano' : 'facil')).nps)
    const spb = 60 / song.music.zone.bpm
    for (const n of all) assert.ok(all.filter(m => m.beat >= n.beat && (m.beat - n.beat) * spb < 1 - 1e-9).length <= nps)
  }
  // the drums by piece (alone, so the hats are not crowded out): the kick low, the hats high
  const kit = midi.generateSong(f, { name: 'x', tracks: tracks.map(t => ({ ...t, on: t.index === 2 })), difficulty: 'insano' }).song
  const kick = kit.aliens.find(a => a.variant === 'drum-bumbo'), hat = kit.aliens.find(a => a.variant === 'mini-chocalho')
  assert.ok(kick && hat)
  assert.ok(Math.max(...kick.notes.map(n => n.midi)) < Math.min(...hat.notes.map(n => n.midi)))
  // it is a song the library keeps
  const back = lib.normalizeSong(JSON.parse(JSON.stringify({ ...s, id: 'x' })))
  assert.equal(back.aliens.length, s.aliens.length)
  // only some bars, and no track: an error
  const part = midi.generateSong(f, { name: 'x', tracks, difficulty: 'insano', fromBar: 2, bars: 2 })
  assert.ok(Math.max(...part.song.aliens.flatMap(a => a.notes.map(n => n.beat))) < 8)
  assert.throws(() => midi.generateSong(f, { name: 'x', tracks: tracks.map(t => ({ ...t, on: false })), difficulty: 'facil' }), /pelo menos uma faixa/)
})
