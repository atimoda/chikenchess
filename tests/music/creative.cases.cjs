const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')
const { voiceSpecs } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const { noteRoll } = loadTs('lib/music/piano-roll.ts')
const { DEFAULT_ARRANGEMENT, arrangementSchema } = loadTs('lib/music/arrangement.ts')

test('creative session configures all 32 persistent voices and starts silent', () => {
  const lab = creative.createCreativeSession()
  assert.equal(lab.pieces.length, 32)
  assert.equal(Object.keys(lab.instruments).length, 32)
  assert.equal(Object.keys(lab.effects).length, 32)
  assert.equal(Object.keys(lab.mappings).length, 32)
  assert.equal(lab.harmony, 'kit')
  assert.equal(lab.version, 7)
  assert.deepEqual(lab.arrangement, DEFAULT_ARRANGEMENT)
  for (const field of ['sectionPattern', 'harmonicSequences']) assert.equal(Object.hasOwn(lab, field), false, field)
  assert.equal(Object.hasOwn(lab, 'grooves'), false)
  for (const instrument of Object.values(lab.instruments)) {
    assert.ok(instrument.pianoRolls.length > 0)
    assert.ok(instrument.pianoRolls.every(roll => roll && Array.isArray(roll.notes)))
    for (const field of ['notes', 'phrases', 'pianoOnly', 'mask', 'groove', 'automations', 'performance']) assert.equal(Object.hasOwn(instrument, field), false, field)
  }
  assert.equal(voiceSpecs(creative.creativeSnapshot(lab, true), null).length, 0)
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(lab)), JSON.parse(JSON.stringify(lab)))
})

test('creative movement activates a voice and swaps occupied squares without losing identities', () => {
  const lab = creative.createCreativeSession()
  const moved = creative.moveCreativePiece(lab, 'w:b1', 'e4')
  assert.equal(moved.pieces.find(p => p.id === 'w:b1').square, 'e4')
  assert.equal(moved.pieces.find(p => p.id === 'w:b1').active, true)
  const swapped = creative.moveCreativePiece(moved, 'w:b1', 'e7')
  assert.equal(swapped.pieces.find(p => p.id === 'w:b1').square, 'e7')
  assert.equal(swapped.pieces.find(p => p.id === 'b:e7').square, 'e4')
  assert.equal(new Set(swapped.pieces.map(p => p.square)).size, 32)
})

test('creative global sections require bounded musical time while banks require explicit MIDI', () => {
  assert.ok(arrangementSchema.safeParse({ sections: [{ id: 'intro', label: 'Intro', beats: 3 }, { id: 'theme', label: 'Theme', beats: 5 }] }).success)
  for (const beats of [0, -1, Infinity, NaN]) assert.equal(arrangementSchema.safeParse({ sections: [{ id: 'a', label: 'A', beats }] }).success, false)
  assert.throws(() => creative.parseCreativeSession(JSON.stringify({ ...creative.createCreativeSession(), name: '' })))
  for (const pianoRolls of [undefined, [], [null], ['0*4']]) {
    const lab = creative.createCreativeSession()
    lab.instruments['w:b1'].pianoRolls = pianoRolls
    assert.throws(() => creative.parseCreativeSession(JSON.stringify(lab)))
  }
})

test('creative kits persist two independently movable octave range endpoints', () => {
  const lab = creative.createCreativeSession()
  lab.instruments['w:b1'].octaveRange = { first: 5, second: 2 }
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(lab)).instruments['w:b1'].octaveRange, { first: 5, second: 2 })
  const invalid = range => JSON.stringify({ ...lab, instruments: { ...lab.instruments, 'w:b1': { ...lab.instruments['w:b1'], octaveRange: range } } })
  assert.deepEqual(creative.parseCreativeSession(invalid({ min: 2, max: 5 })).instruments['w:b1'].octaveRange, { first: 2, second: 5 })
  assert.throws(() => creative.parseCreativeSession(invalid({ first: 0, second: 8 })))
})

test('version 1 through 4 imports preserve explicit rolls and seed missing text banks once', () => {
  const current = creative.createCreativeSession()
  const authored = { bars: 2, notes: [{ start: .5, duration: .25, degree: -3, velocity: .6, slide: 2, slideSeconds: .3, pan: .8 }] }
  for (const version of [1, 2, 3, 4]) {
    const legacy = structuredClone(current)
    legacy.version = version
    delete legacy.arrangement
    legacy.sectionPattern = '0'
    for (const instrument of Object.values(legacy.instruments)) delete instrument.arrangement
    legacy.volume = .65
    legacy.grooves = { old: {} }
    Object.assign(legacy.instruments['w:b1'], { pianoRolls: [authored, null], phrases: ['0', 'window.alert(1)'], notes: '0*20000', gain: .2, pianoOnly: true, mask: '~', groove: {}, automations: {} })
    Object.assign(legacy.instruments['w:g1'], { pianoRolls: undefined, phrases: ['9', '8'] })
    const migrated = creative.parseCreativeSession(JSON.stringify(legacy))
    assert.equal(migrated.version, 7)
    assert.deepEqual(migrated.arrangement.sections.map(section => section.beats), [4])
    assert.deepEqual(migrated.instruments['w:b1'].pianoRolls, [authored, current.instruments['w:b1'].pianoRolls[0]])
    assert.deepEqual(migrated.instruments['w:g1'].pianoRolls, [current.instruments['w:g1'].pianoRolls[0], current.instruments['w:g1'].pianoRolls[0]])
    assert.equal(migrated.volume, .65)
    assert.equal(migrated.instruments['w:b1'].gain, .2)
    assert.equal(Object.hasOwn(migrated, 'grooves'), false)
    for (const field of ['notes', 'phrases', 'pianoOnly', 'mask', 'groove', 'automations']) assert.equal(Object.hasOwn(migrated.instruments['w:b1'], field), false, field)
    assert.deepEqual(creative.parseCreativeSession(JSON.stringify(migrated)), migrated)
  }
})

test('explicit cells preserve rests, chords and gate; empty banks round-trip without fallback', () => {
  const lab = creative.createCreativeSession()
  const roll = noteRoll([0, null, [2, 4], -1], 2, .5)
  assert.deepEqual(roll.notes.map(note => [note.start, note.duration, note.degree, note.velocity]), [[0,.25,0,1],[1,.25,2,1],[1,.25,4,1],[1.5,.25,-1,.7]])
  lab.instruments['w:b1'].pianoRolls = [roll, noteRoll([])]
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(lab)), lab)
})

test('invalid MIDI articulation or sample IDs cannot be saved as city kits', () => {
  const lab = creative.createDusseldorfSession()
  const invalid = patch => JSON.stringify({ ...lab, instruments: { ...lab.instruments, 'w:e1': { ...lab.instruments['w:e1'], ...patch } } })
  assert.throws(() => creative.parseCreativeSession(invalid({ source: { kind: 'sample', bank: 'unknown', asset: 'kick', variant: 0, pitched: false } })))
  for (const patch of [{ degree: 49 }, { velocity: 1.1 }, { pan: 2 }, { slide: 25 }, { slideSeconds: 0 }, { duration: 2 }, { start: -1 }]) {
    const roll = noteRoll([0]); Object.assign(roll.notes[0], patch)
    assert.throws(() => creative.parseCreativeSession(invalid({ pianoRolls: [roll] })))
  }
  assert.throws(() => creative.parseCreativeSession(invalid({ pianoRolls: Array.from({ length: 9 }, () => noteRoll([0])) })))
  assert.throws(() => creative.parseCreativeSession(invalid({ pianoRolls: [{ bars: 1, notes: Array.from({ length: 129 }, () => ({ start: 0, duration: .25, degree: 0, velocity: .8 })) }] })))
  const text = JSON.stringify(lab)
  assert.deepEqual(creative.parseCreativeSession(text.padEnd(2_000_000, ' ')), lab)
  assert.throws(() => creative.parseCreativeSession(text.padEnd(2_000_001, ' ')), /Arquivo de kit muito grande/)
})
