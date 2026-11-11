const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { newTremolo, stepTremolo, aimLanePos, TREMOLO_FRETTED_MAX } = loadTs('lib/pigchicken/tremolo.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')

const pool = [48, 52, 55, 60, 64, 67, 72] // a chord over two octaves, 7 lanes
const upAt = pos => (pos / (pool.length - 1)) * 2 - 1 // the aim height for a lane position

test('a still aim plays the plain lane note', () => {
  for (const fretless of [false, true]) {
    const s = newTremolo()
    let p
    for (let i = 0; i < 60; i++) p = stepTremolo(s, pool, upAt(3.2), 0.016, 1, fretless)
    assert.ok(Math.abs(p - 60) < 0.01, `${fretless}: ${p}`)
  }
})

test('shaking inside a lane bends a fretted note, never past its own degree', () => {
  const s = newTremolo()
  stepTremolo(s, pool, upAt(3), 0.016, 0.5, false)
  let lo = Infinity, hi = -Infinity
  for (let i = 0; i < 120; i++) {
    const p = stepTremolo(s, pool, upAt(3 + (i % 8 < 4 ? 0.4 : -0.4)), 0.016, 0.5, false)
    lo = Math.min(lo, p); hi = Math.max(hi, p)
  }
  assert.ok(hi > 60.1 && lo < 59.9, `${lo}..${hi}`)
  assert.ok(hi <= 60 + TREMOLO_FRETTED_MAX && lo >= 60 - TREMOLO_FRETTED_MAX)
})

test('more tremolo bends more; zero never bends', () => {
  const swing = amount => {
    const s = newTremolo(); let hi = 60
    stepTremolo(s, pool, upAt(3), 0.016, amount, false)
    for (let i = 0; i < 4; i++) hi = Math.max(hi, stepTremolo(s, pool, upAt(3.3), 0.016, amount, false))
    return hi - 60
  }
  assert.equal(swing(0), 0)
  assert.ok(swing(0.6) > swing(0.2))
})

test('a fretted note jumps to the next lane clean; a fretless one slides there', () => {
  const f = newTremolo()
  stepTremolo(f, pool, upAt(3), 0.016, 1, false)
  assert.equal(stepTremolo(f, pool, upAt(4), 0.016, 1, false), 64)
  const v = newTremolo()
  stepTremolo(v, pool, upAt(3), 0.016, 1, true)
  const first = stepTremolo(v, pool, upAt(4), 0.016, 1, true)
  assert.ok(first > 60 && first < 64, `slides: ${first}`)
  let p
  for (let i = 0; i < 100; i++) p = stepTremolo(v, pool, upAt(4), 0.016, 1, true)
  assert.ok(Math.abs(p - 64) < 0.01)
})

test('defaults: violin the most and fretless; harp, tambourine and keys off', () => {
  const t = id => DEFAULT_ITEMS[id].tremolo
  for (const id of ['harp', 'tambourine', 'keys']) assert.equal(t(id), 0, id)
  for (const id of ['flute', 'guitar', 'sax', 'trumpet']) assert.ok(t(id) > 0 && t(id) < t('violin'), id)
  assert.equal(DEFAULT_ITEMS.violin.fretless, true)
  assert.equal(DEFAULT_ITEMS.guitar.fretless, false)
  assert.equal(aimLanePos(1, 7), 6)
})

test('a note always starts in tune, even right after the aim moved', () => {
  for (const fretless of [false, true]) {
    const s = newTremolo()
    // the aim sweeps across the fan with nothing playing, then the note starts mid-lane
    for (let i = 0; i <= 20; i++) stepTremolo(s, pool, upAt(i * 0.17), 0.016, 1, fretless, false)
    assert.equal(stepTremolo(s, pool, upAt(3.4), 0.016, 1, fretless, true), 60, `${fretless}`)
    // only moving after the start bends it
    assert.ok(stepTremolo(s, pool, upAt(3.1), 0.016, 1, fretless, true) < 60)
  }
})

test('the limit caps the bend each way', () => {
  const s = newTremolo()
  stepTremolo(s, pool, upAt(3), 0.016, 1, false, true, 0.2)
  const p = stepTremolo(s, pool, upAt(3.45), 0.016, 1, false, true, 0.2)
  assert.ok(Math.abs(p - 60.2) < 1e-9, `${p}`)
  assert.equal(DEFAULT_ITEMS.violin.tremoloRange, 2)
  assert.equal(DEFAULT_ITEMS.flute.tremoloRange, 0.5)
})

test('every degree of turn bends the same, near the horizon or pointing high up', () => {
  const even = Array.from({ length: 13 }, (_, i) => 48 + 2 * i) // whole tones: the same interval everywhere
  const up = d => Math.sin(d * Math.PI / 180)
  const bendAfter = (fromDeg, toDeg) => {
    const s = newTremolo()
    stepTremolo(s, even, up(fromDeg), 0.016, 1, false, true, 3)
    const p = stepTremolo(s, even, up(toDeg), 0.016, 1, false, true, 3)
    return p - even[Math.round(aimLanePos(up(toDeg), even.length))]
  }
  const flat = bendAfter(0, 2), steep = bendAfter(60, 62)
  assert.ok(flat > 0.05 && Math.abs(flat - steep) < 0.02, `${flat} vs ${steep}`)
})

const vol = loadTs('lib/pigchicken/aim-volume.ts')
test('volume by distance: min close, max far, no change with both points together', () => {
  assert.equal(vol.aimVolume(0.3, 1, 0), 0.3)
  assert.equal(vol.aimVolume(0.3, 1, 1), 1)
  assert.equal(vol.aimVolume(0.6, 0.6, 0.2), 0.6)
  assert.equal(vol.aimReach({ px: vol.VOLUME_REACH * 2 }), 1)
  assert.equal(vol.aimReach({ px: vol.VOLUME_REACH / 2 }), 0.5)
  assert.equal(vol.aimReach({ stick: 0.25 }), 0.25)
  assert.equal(vol.aimReach({ px: 60, radius: 120 }), 0.5)
  assert.equal(vol.aimReach({ px: 300, radius: 120 }), 1)
  assert.equal(vol.aimReach({}), 1)
  for (const id of ['flute', 'sax', 'trumpet', 'guitar', 'violin', 'keys', 'tambourine', 'harp']) {
    assert.ok(DEFAULT_ITEMS[id].volMin < DEFAULT_ITEMS[id].volMax, id)
  }
  assert.equal(DEFAULT_ITEMS.pistol.volMin, DEFAULT_ITEMS.pistol.volMax)
})

test('an instrument blow plays the note of the fan lane she aims at', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const blowAt = angle => {
    const c = createCombat(), played = []
    c.setMusicOut({ note: (v, m) => played.push(m), hold: () => null, drum: () => {} })
    const step = (input = {}) => c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
      { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
      [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
    c.give('flute'); step({ slot: 1 }); played.length = 0
    for (let i = 0; i < 40; i++) step({ melee: i === 0 })
    return { c, played }
  }
  const low = blowAt(Math.PI / 2 - 0.01), high = blowAt(-Math.PI / 2 + 0.01)
  assert.ok(low.played.length >= 1 && high.played.length >= 1)
  assert.ok(Math.min(...high.played) > Math.max(...low.played) - 1, `${low.played} / ${high.played}`)
  assert.notEqual(low.played[0], high.played[0])
})

test('natural vibrato: one per item, passed with every note; the beam waves with it and with the bend', () => {
  assert.equal(DEFAULT_ITEMS.violin.vibrato, 1)
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const c = createCombat(), vibs = []
  c.setMusicOut({ note: (v, m, at, dur, vel, fade, vib) => vibs.push(vib), hold: (v, m, vib) => { vibs.push(vib); return { setPitch() {}, stop() {} } }, drum: () => {} })
  const step = (input = {}, angle = 0) => c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
  c.give('violin'); step({ slot: 1 }); vibs.length = 0
  step({ fire: true, firePressed: true }); step({ fire: true })
  assert.deepEqual(vibs, [1])
  assert.equal(c.beam.bend, 0)
  step({ fire: true }, -0.05)
  assert.ok(Math.abs(c.beam.bend) > 0, 'the beam knows the bend')
  const { beamWave } = loadTs('components/pigchicken/draw/effects.ts')
  assert.equal(beamWave(1, 0), 3)
  assert.equal(beamWave(0, 0), 1)
  assert.ok(beamWave(1, 0.5) > beamWave(1, 0.1))
})
