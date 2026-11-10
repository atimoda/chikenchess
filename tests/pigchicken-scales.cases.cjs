const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { INSTRUMENT_SCALES, sectorAt, ringAt, cleanScales, scaleAt, regionNotes } = loadTs('lib/pigchicken/instrument-scales.ts')
const { scaleStep, arrivalScale } = loadTs('lib/pigchicken/inventory.ts')
const { DEFAULT_ITEMS, INSTRUMENT_IDS, INSTRUMENT_WEAPON } = loadTs('lib/pigchicken/items.ts')
const { createConductor } = loadTs('lib/pigchicken/music.ts')

const UP = -Math.PI / 2, RIGHT = 0
const pc = m => ((m % 12) + 12) % 12

test('sectors start straight up and go clockwise; half a stick is the inner ring, all the way the outer', () => {
  assert.equal(sectorAt(UP), 0)
  assert.equal(sectorAt(UP + Math.PI / 6), 1)
  assert.equal(sectorAt(RIGHT), 3)
  assert.equal(sectorAt(Math.PI / 2), 6)
  assert.equal(ringAt(0.5), 0)
  assert.equal(ringAt(1), 1)
})

test('Ciclo de quintas: Dó on top outside, Lám inside; Sol one sector clockwise', () => {
  const s = INSTRUMENT_SCALES.fifths, music = createConductor()
  assert.equal(s.regionAt(UP, 1).label, 'Dó')
  assert.equal(s.regionAt(UP, 0.5).label, 'Lám')
  assert.equal(s.regionAt(UP + Math.PI / 6, 1).label, 'Sol')
  assert.equal(s.regions().length, 24)
  const q = { angle: UP + Math.PI / 6, reach: 1, set: 'chord', octave: 0, span: 2 }
  const base = s.noteFor(music, q)
  assert.equal(pc(base), 7)
  assert.ok(Math.abs(base - 60) <= 6)
  assert.deepEqual(new Set(s.pool(music, q).map(pc)), new Set([7, 11, 2]))
  assert.equal(pc(s.walk(music, base, 1, 'chord', q.angle, q.reach)), 11)
})

test('Tensão e resolução: dissonant chords in the middle, their resolution in the balls around', () => {
  const s = INSTRUMENT_SCALES.tension
  for (let k = 0; k < 12; k++) {
    const a = UP + k * Math.PI / 6
    const t = s.regionAt(a, 0.3), r = s.regionAt(a, 0.9)
    assert.equal(t.kind, 'tension'); assert.equal(r.kind, 'resolution')
    // every tension has a tritone; every resolution is a plain triad
    const iv = new Set(t.chord.map(c => pc(c)))
    assert.ok([...iv].some(x => iv.has(pc(x + 6))), t.label)
    assert.equal(r.chord.length, 3)
    // the tension leans into the resolution's root: a semitone or a fifth above it
    assert.ok(regionNotes(t, 48, 72).some(m => pc(m - r.root) === 11 || pc(m - r.root) === 7), t.label)
  }
  assert.equal(s.regionAt(UP, 0.3).label, 'Si°7')
})

test('the primary scale is the conductor, untouched', () => {
  const music = createConductor(), s = INSTRUMENT_SCALES.primary
  const q = { angle: -1, reach: 0.2, set: 'scale', octave: 0, span: 2 }
  assert.equal(s.noteFor(music, q), music.noteFor(-1, 'scale', 0, 2))
  assert.deepEqual(s.pool(music, q), music.aimPool('scale', 0, 2))
})

test('the wheel goes through an instrument’s scales before the next item', () => {
  assert.equal(scaleStep(3, 0, 1), 1)
  assert.equal(scaleStep(3, 2, 1), null)
  assert.equal(scaleStep(3, 0, -1), null)
  assert.equal(scaleStep(3, 2, -1), 1)
  assert.equal(scaleStep(1, 0, 1), null)
  assert.equal(arrivalScale(3, 1), 0)
  assert.equal(arrivalScale(3, -1), 2)
})

test('instruments start with the three scales and a weapon for the reload sound; lists are cleaned', () => {
  for (const id of INSTRUMENT_IDS) {
    assert.deepEqual(DEFAULT_ITEMS[id].scales, ['primary', 'fifths', 'tension'])
    assert.ok(INSTRUMENT_WEAPON[id] && !DEFAULT_ITEMS[INSTRUMENT_WEAPON[id]].instrument)
  }
  assert.deepEqual(DEFAULT_ITEMS.pistol.scales, ['primary'])
  assert.deepEqual(cleanScales(['tension', 'x', 'primary', 'tension']), ['primary', 'tension'])
  assert.equal(cleanScales([]), null)
  assert.equal(scaleAt(['primary', 'fifths'], 9).id, 'fifths')
  assert.equal(scaleAt(undefined, 2).id, 'primary')
})
