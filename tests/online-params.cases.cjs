const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
const { combineOnlineKits } = loadTs('lib/music/online-kit.ts')
const { parsePieceParams } = loadTs('lib/online/piece-params.ts')

function params() {
  const white = defaultCityKit('dusseldorf')
  const black = defaultCityKit('nyc')
  assert.ok(black, 'fixture city must exist')
  const combined = combineOnlineKits(white, black, white)
  return { pieceId: 'b:e7', instrument: combined.instruments['b:e7'], effects: combined.effects['b:e7'] }
}

test('remote team params accept MIDI remapped to the common context without rewriting it', () => {
  const source = params()
  const original = structuredClone(source)
  const parsed = parsePieceParams(source, 'dusseldorf')
  assert.deepEqual(parsed.instrument.arrangement, source.instrument.arrangement)
  assert.equal(parsed.pieceId, 'b:e7')
  assert.deepEqual(source, original)
})

test('invalid remote section IDs and missing common sections are rejected before publication', () => {
  const source = params()
  const firstId = Object.keys(source.instrument.arrangement.sections)[0]
  source.instrument.arrangement.sections.invented = source.instrument.arrangement.sections[firstId]
  delete source.instrument.arrangement.sections[firstId]
  assert.throws(() => parsePieceParams(source, 'dusseldorf'), /shared context/)
  delete source.instrument.arrangement.sections.invented
  assert.throws(() => parsePieceParams(source, 'dusseldorf'), /shared context/)
})

test('remote assignments and variation pins must reference existing MIDI banks', () => {
  const source = params()
  const firstId = Object.keys(source.instrument.arrangement.sections)[0]
  source.instrument.pianoRolls = source.instrument.pianoRolls.slice(0, 1)
  source.instrument.arrangement.sections[firstId].variation = 1
  assert.throws(() => parsePieceParams(source), /Unknown MIDI variation/)
  for (const section of Object.values(source.instrument.arrangement.sections)) section.variation = 0
  source.instrument.selectedVariation = 1
  assert.throws(() => parsePieceParams(source), /Unknown MIDI variation/)
})
