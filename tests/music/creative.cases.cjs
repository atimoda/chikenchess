const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs } = loadTs('lib/music/runtime.ts')
const patterns = loadTs('lib/music/pattern-library.ts')
const creative = loadTs('lib/music/creative.ts')

test('creative session configures all 32 persistent voices and starts silent', () => {
  const lab = creative.createCreativeSession()
  assert.equal(lab.pieces.length, 32)
  assert.equal(Object.keys(lab.instruments).length, 32)
  assert.equal(Object.keys(lab.effects).length, 32)
  assert.equal(Object.keys(lab.mappings).length, 32)
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

test('creative patterns accept useful mini-notation and reject abusive expansion or code', () => {
  assert.equal(creative.hasPatternBudget('<[0 ~] [2 4]>*2'), true)
  assert.equal(creative.hasPatternBudget('[0,2,4]/2'), true)
  assert.equal(creative.hasPatternBudget('0*8*8'), false)
  assert.equal(creative.hasPatternBudget('window.alert(1)'), false)
  assert.throws(() => creative.parseCreativeSession(JSON.stringify({ ...creative.createCreativeSession(), name: '' })))
})

test('version 1 creative kits migrate their quiet mix exactly once', () => {
  const current = creative.createCreativeSession()
  const legacy = { ...current, version: 1, volume: 0.65, instruments: Object.fromEntries(Object.entries(current.instruments).map(([id, instrument]) => [id, { ...instrument, gain: 0.2 }])) }
  const migrated = creative.parseCreativeSession(JSON.stringify(legacy))
  assert.equal(migrated.version, 4)
  assert.equal(migrated.sectionPattern, '0')
  assert.ok(Math.abs(migrated.volume - 0.728) < 1e-9)
  assert.ok(Math.abs(migrated.instruments['w:b1'].gain - 0.28) < 1e-9)
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(migrated)), migrated)
})

test('reference recipes stay inside the safe notation and creative instrument schema', () => {
  assert.equal(patterns.PATTERN_RECIPES.length, 9)
  for (const recipe of patterns.PATTERN_RECIPES) {
    assert.equal(creative.hasPatternBudget(recipe.notes), true, recipe.id)
    const lab = creative.createCreativeSession()
    lab.instruments['w:b1'] = { ...lab.instruments['w:b1'], ...recipe.instrument, behavior: recipe.behavior, notes: recipe.notes }
    assert.deepEqual(creative.parseCreativeSession(JSON.stringify(lab)), lab)
  }
})

test('invalid automation or sample IDs cannot be saved as city kits', () => {
  const lab = creative.createDusseldorfSession()
  const invalid = patch => JSON.stringify({ ...lab, instruments: { ...lab.instruments, 'w:e1': { ...lab.instruments['w:e1'], ...patch } } })
  assert.throws(() => creative.parseCreativeSession(invalid({ source: { kind: 'sample', bank: 'unknown', asset: 'kick', variant: 0, pitched: false } })))
  assert.throws(() => creative.parseCreativeSession(invalid({ automations: { lpf: { kind: 'pattern', patterns: ['1000*20000'] } } })))
  assert.throws(() => creative.parseCreativeSession(invalid({ automations: { gain: { kind: 'pattern', patterns: ['window.alert(1)'] } } })))
  assert.throws(() => creative.parseCreativeSession(invalid({ automations: { pan: { kind: 'ramp', min: 0, max: 2, cycles: 4 } } })))
})
