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

test('reading: a SysEx event does not throw the track off, and a chunk of another kind is skipped', () => {
  // a GM reset (F0 len … F7) before the notes, as many files have it: the notes keep their beats
  const sysex = [0, 0xf0, 5, 0x7e, 0x7f, 9, 1, 0xf7]
  const withSysex = smf([[sysex, ...note(0, 1, 60), ...note(0, 2, 62)], [[0, 0xf0, 3, 0x41, 0x10, 0xf7], ...note(1, 3, 40)]])
  const f = midi.parseMidi(withSysex)
  assert.deepEqual(f.tracks.map(t => t.notes.map(n => [n.beat, n.midi])), [[[1, 60], [2, 62]], [[3, 40]]])
  assert.equal(f.beats, 3.5)
  // an unknown chunk between the header and the tracks
  const plain = smf([note(0, 0, 60)])
  const extra = new Uint8Array([...plain.subarray(0, 14), ...Buffer.from('XFIH'), 0, 0, 0, 2, 1, 2, ...plain.subarray(14)])
  assert.deepEqual(midi.parseMidi(extra).tracks[0].notes.map(n => n.midi), [60])
})

test('generating a full song: steady drums do not take every place, and a long song keeps its end', () => {
  // 64 bars: kick and snare on every beat, hats on every eighth, a bass and a melody
  const bars = 64
  const drums64 = Array.from({ length: bars * 4 }, (_, i) => [...note(9, i, i % 2 ? 38 : 36, 0.1), ...note(9, i + 0.5, 42, 0.1)]).flat()
  const bass64 = Array.from({ length: bars * 2 }, (_, i) => note(1, i * 2 + 1.5, [45, 40, 41, 43][i % 4], 1)).flat()
  const mel64 = Array.from({ length: bars * 4 }, (_, i) => note(0, i + 0.5, A_MIN[(i * 5) % A_MIN.length], 0.4)).flat()
  const f = midi.parseMidi(smf([[tempo(120), ...mel64], bass64, drums64]))
  const tracks = f.tracks.map(t => ({ index: t.index, on: true, variant: midi.defaultVariant(t, f.tracks) }))
  for (const difficulty of ['facil', 'medio']) {
    const { song } = midi.generateSong(f, { name: 'x', tracks, difficulty })
    const notesOf = re => song.aliens.filter(a => re.test(a.variant)).reduce((s, a) => s + a.notes.length, 0)
    const all = notesOf(/./), drumsN = notesOf(/^drum|chocalho/)
    assert.ok(drumsN < all * 0.6, `${difficulty}: the drums share the places (${drumsN} of ${all})`)
    assert.ok(notesOf(/flauta/) > 0 && notesOf(/baixo/) > 0, `${difficulty}: the melody and the bass come in`)
    assert.ok(song.aliens.length > 40, `${difficulty}: a full song has many aliens (${song.aliens.length})`)
    assert.ok(Math.max(...song.aliens.flatMap(a => a.notes.map(n => n.beat))) >= (bars - 2) * 4, `${difficulty}: to the end`)
  }
  // 300 bars of 8 sparse tracks: more aliens than the library keeps at first, grouped again so the end stays
  const sparse = Array.from({ length: 8 }, (_, k) => Array.from({ length: 300 }, (_, i) => note(k, i * 4 + k * 0.5, 60 + k * 2, 0.3)).flat())
  const long = midi.parseMidi(smf(sparse))
  const lt = long.tracks.map(t => ({ index: t.index, on: true, variant: 'jelly' }))
  const r = midi.generateSong(long, { name: 'x', tracks: lt, difficulty: 'insano' })
  assert.ok(r.song.aliens.length <= lib.SONG_ALIENS_MAX)
  assert.equal(r.dropped, 0, 'every note is kept')
  assert.ok(Math.max(...r.song.aliens.flatMap(a => a.notes.map(n => n.beat))) >= 299 * 4, 'the end is not cut off')
})
