const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')

// the library's storage without a browser: a tiny localStorage and events
const store = new Map()
const listeners = new Map()
global.window = {
  localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
  dispatchEvent: e => { (listeners.get(e.type) ?? []).forEach(fn => fn(e)); return true },
  addEventListener: (t, fn) => listeners.set(t, [...(listeners.get(t) ?? []), fn]),
  removeEventListener: (t, fn) => listeners.set(t, (listeners.get(t) ?? []).filter(f => f !== fn)),
}

const lib = loadTs('lib/pigchicken/song-library.ts')
const cover = loadTs('lib/pigchicken/song-cover.ts')
const stageLib = loadTs('lib/pigchicken/note-stage.ts')
const temple = loadTs('lib/pigchicken/temple.ts')
const music = loadTs('lib/pigchicken/music.ts')

test('a song saved comes back the same; one without aliens or an id is dropped, numbers are clamped', () => {
  const s = lib.BUILTIN_SONGS[0]
  const back = lib.normalizeSong(JSON.parse(JSON.stringify({ ...s, builtin: false })))
  assert.deepEqual(back.aliens, s.aliens)
  assert.deepEqual(back.music.zone, s.music.zone)
  assert.deepEqual(back.fan.content, s.fan.content)
  assert.equal(back.fan.centerY, s.fan.centerY)
  assert.deepEqual(back.cover, lib.DEFAULT_COVER)
  assert.equal(lib.normalizeSong({ id: 'x', aliens: [] }), null)
  assert.equal(lib.normalizeSong({ aliens: s.aliens }), null)
  const odd = lib.normalizeSong({ id: 'odd', music: { zone: { bpm: 9999, id: 'mine' } }, aliens: [{ species: 'nope', move: 'fly', angle: 450, notes: [{ beat: 1, midi: 300 }, { beat: 'x' }] }], cover: { style: 'grade', bg: 'red' } })
  assert.equal(odd.music.zone.bpm, 200); assert.equal(odd.music.zone.id, 'templo-mine', 'the temple plays it')
  assert.equal(odd.aliens[0].species, 'jelly'); assert.equal(odd.aliens[0].move, undefined); assert.equal(odd.aliens[0].angle, 90)
  assert.deepEqual(odd.aliens[0].notes, [{ beat: 1, midi: 127 }])
  assert.equal(odd.cover.style, 'grade'); assert.equal(odd.cover.bg, lib.DEFAULT_COVER.bg)
})

test('the library: the code\'s songs, then the ones saved here; the campaign is picked by default; records kept', () => {
  store.clear()
  let l = lib.loadLibrary()
  assert.equal(l.picked, lib.CAMPAIGN_ID)
  assert.deepEqual(l.songs.map(s => s.id), ['teste'])
  let seen = 0
  const off = lib.subscribeLibrary(() => seen++)
  const copy = lib.saveSongAs(l, l.songs[0], 'Minha Música')
  assert.equal(copy.id, 'minha-musica'); assert.equal(copy.builtin, false); assert.equal(copy.music.zone.id, 'templo-minha-musica')
  l = lib.loadLibrary()
  assert.equal(l.picked, 'minha-musica', 'the copy is picked')
  assert.equal(l.songs.length, 2)
  assert.ok(seen > 0, 'the panel and the game hear it')
  assert.equal(lib.saveSongAs(l, copy, 'Minha Música').id, 'minha-musica-2', 'ids stay unique')
  l = lib.loadLibrary()
  assert.equal(lib.recordScore('minha-musica', 1000, 0.8), true)
  assert.equal(lib.recordScore('minha-musica', 900, 0.9), false, 'only a better score')
  assert.deepEqual(lib.loadLibrary().records['minha-musica'], { score: 1000, accuracy: 0.8 })
  lib.deleteSong(l, 'teste')
  assert.equal(lib.loadLibrary().songs.length, 3, "the code's can't be deleted")
  lib.pickSong('minha-musica-2'); l = lib.loadLibrary()
  lib.deleteSong(l, 'minha-musica-2')
  l = lib.loadLibrary()
  assert.equal(l.songs.length, 2); assert.equal(l.picked, lib.CAMPAIGN_ID, 'deleting the one picked picks the campaign')
  off()
})

test('the numbers the jukebox shows', () => {
  const s = lib.BUILTIN_SONGS[0]
  assert.equal(lib.keyName(62), 'Ré'); assert.equal(lib.keyName(57), 'Lá')
  assert.equal(lib.clock(75), '1:15')
  assert.ok(Math.abs(lib.songSeconds(s) - lib.songBeats(s) * 60 / 96) < 1e-9)
  assert.equal(lib.songId('Ação Rápida!', []), 'acao-rapida')
  assert.equal(lib.songId('campanha', []), 'campanha-2', 'never the campaign')
})

test('the cover is drawn from the sequence: a dot per note, inside the record (Sulco) or the grid (Grade)', () => {
  const s = lib.BUILTIN_SONGS[0]
  const n = stageLib.noteCount(s)
  const sulco = cover.coverArt(s, 'sulco', 'grau')
  assert.equal(sulco.dots.length, n); assert.equal(sulco.paths.length, s.aliens.length)
  for (const d of sulco.dots) {
    const r = Math.hypot(d.x - 0.5, d.y - 0.5)
    assert.ok(r >= cover.SULCO_IN - 1e-9 && r <= cover.SULCO_OUT + 1e-9, `on the record (${r})`)
    assert.ok(music.DEGREE_COLORS.includes(d.color))
  }
  const grade = cover.coverArt(s, 'grade', 'mono')
  assert.ok(grade.dots.every(d => d.x >= 0.08 && d.x <= 0.92 && d.y >= 0.08 && d.y <= 0.92 && d.color === '#f4f1e8'))
  assert.equal(grade.rows, Math.ceil((stageLib.songEnd(s) + 1) / 16))
  // a long rest is an empty ring; a variation with a second note draws both
  const rest = { ...s, aliens: [{ species: 'jelly', move: 'still', notes: [{ beat: 0, midi: 62 }] }, { species: 'twin', variant: 'twin-tercas', move: 'still', notes: [{ beat: 20, midi: 62 }] }] }
  const art = cover.coverArt(rest, 'sulco', 'zona')
  assert.equal(art.rings.length, 1)
  assert.equal(art.dots.length, 3)
  assert.ok(art.dots.every(d => d.color === s.music.zone.color))
})

test('each sequencer keeps its own pick (else the one picked last); the Gongo do Templo asks for it, or the campaign plays', () => {
  store.clear()
  let l = lib.loadLibrary()
  lib.saveSongAs(l, l.songs[0], 'Outra')
  lib.openJukebox('vitrola:v1')
  lib.pickSong('teste')
  l = lib.loadLibrary()
  assert.equal(lib.pickOf(l, 'vitrola:v1'), 'teste', 'its own pick')
  assert.equal(lib.pickOf(l, 'jukebox:j1'), 'teste', 'one never picked from plays the one picked last')
  lib.pickSong('outra', 'jukebox:j1'); l = lib.loadLibrary()
  assert.equal(lib.pickOf(l, 'jukebox:j1'), 'outra')
  assert.equal(lib.pickOf(l, 'vitrola:v1'), 'teste', 'the other keeps its own')
  assert.equal(lib.mergeLibrary([], 'teste', {}, { 'jukebox:x': 'nope' }).picks['jukebox:x'], undefined, 'a pick of a song gone is dropped')
  // the panel asks the game with the sequencer it was opened for
  let play = null
  const off = lib.onPlaySong((id, device) => { play = { id, device } })
  lib.playSongNow('outra')
  assert.deepEqual(play, { id: 'outra', device: 'vitrola:v1' })
  off()
  lib.openJukebox(null)
  // the temple: with a song picked, the gong's strikes call it instead of starting the campaign
  const t = temple.createTemple(7), conductor = music.createConductor(), targets = []
  let asked = 0
  const io = over => ({ targets, music: conductor, sceneL: 1920, groundY: 930, inside: true, body: { x: 2200, y: 930, scale: 1 }, boxes: [], gongHit: false, firePressed: false, beats: [], fx: { burst() {}, text() {} }, hurt() {}, sound() {}, ...over })
  for (let i = 0; i < temple.GONG_FIRST; i++) t.step(1 / 60, io({ gongHit: true, song: () => asked++ }))
  assert.equal(asked, 1); assert.equal(t.state.phase, 'idle'); assert.equal(t.state.gongHits, 0)
  // Tocar with the campaign picked starts it at once
  t.step(1 / 60, io({ start: true }))
  assert.equal(t.state.phase, 'intro')
})
