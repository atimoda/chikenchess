const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Module = require('node:module')
let patterns
// Compile the pure domain modules without loading browser/audio dependencies.
function loadTs(relative) {
  const file = path.resolve(__dirname, '..', relative)
  const mod = new Module(file, module)
  mod.filename = file
  mod.paths = module.paths
  const original = mod.require.bind(mod)
  mod.require = name => name === './model' ? model : name === './pattern-library' ? patterns : name === '../performance' ? { isConstrainedDevice: () => false } : original(name)
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file)
  return mod.exports
}
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, renderMusicCode } = loadTs('lib/music/runtime.ts')
patterns = loadTs('lib/music/pattern-library.ts')
const creative = loadTs('lib/music/creative.ts')
const state = (history = []) => ({ pieces: model.piecesFromHistory(history), scale: ['C4','Eb4','F4','G4','Bb4'], bpm: 118, volume: 0.8, playing: true, effects: {} })

test('all 32 instruments start inactive, no hidden accompaniment', () => {
  const s = state()
  assert.equal(s.pieces.length, 32)
  assert.equal(voiceSpecs(s, null).length, 0)
})
test('audition of inactive piece does not activate it or change the board', () => {
  const s = state()
  const voices = voiceSpecs(s, { id: 'w:b1', square: 'e4' })
  assert.equal(voices.length, 1)
  assert.equal(voices[0].preview, true)
  assert.equal(s.pieces.find(p => p.id === 'w:b1').square, 'b1')
  assert.equal(voiceSpecs(s, null).length, 0)
})
test('an active audition replaces its loop, then restores it', () => {
  const s = state(['Nf3'])
  const before = voiceSpecs(s, null)
  assert.equal(voiceSpecs(s, { id: 'w:b1', square: 'c3' }).length, 2)
  const preview = voiceSpecs(s, { id: 'w:g1', square: 'g5' })
  assert.equal(preview.length, 1)
  assert.equal(preview[0].preview, true)
  assert.deepEqual(voiceSpecs(s, null), before)
})
test('capture preserves attacker identity and instrument across files', () => {
  const s = state(['e4', 'd5', 'exd5'])
  assert.equal(s.pieces.length, 31)
  assert.equal(s.pieces.some(p => p.id === 'b:d7'), false)
  const pawn = s.pieces.find(p => p.id === 'w:e2')
  assert.equal(pawn.square, 'd5')
  assert.equal(model.instrumentFor(pawn).name, 'Tom')
  assert.equal(voiceSpecs(s, null).length, 1)
})
test('en passant removes the captured voice on its actual square', () => {
  const s = state(['e4','a6','e5','d5','exd6'])
  assert.equal(s.pieces.some(p => p.id === 'b:d7'), false)
  assert.equal(s.pieces.find(p => p.id === 'w:e2').square, 'd6')
})
test('castling activates and relocates both identities', () => {
  const s = state(['e4','e5','Nf3','Nc6','Bc4','Bc5','O-O'])
  assert.equal(s.pieces.find(p => p.id === 'w:e1').square, 'g1')
  const rook = s.pieces.find(p => p.id === 'w:h1')
  assert.equal(rook.square, 'f1')
  assert.equal(rook.active, true)
})
test('promotion keeps the pawn identity and switches its instrument role', () => {
  const s = state(['a4', 'h5', 'a5', 'h4', 'a6', 'h3', 'axb7', 'hxg2', 'bxa8=Q'])
  const promoted = s.pieces.find(p => p.id === 'w:a2')
  assert.equal(promoted.square, 'a8')
  assert.equal(promoted.type, 'q')
  assert.equal(promoted.active, true)
  assert.equal(model.instrumentFor(promoted).name, 'Melodia principal')
  assert.equal(s.pieces.some(p => p.id === 'b:a8'), false)
})
test('history rebuild restores captured voice and activation on undo/redo', () => {
  const history = ['e4','d5','exd5']
  assert.equal(state(history.slice(0, 2)).pieces.find(p => p.id === 'b:d7').active, true)
  assert.deepEqual(state(history), state([...history]))
})
test('degrees wrap through the shared scale, including negative degrees and roots crossing C', () => {
  assert.equal(model.degreeToMidi(-1, ['C4','D4','E4','F4','G4','A4','B4'], 4), 59)
  assert.equal(model.degreeToMidi(3, ['G4','A4','B4','C5','D5'], 4), 72)
})
test('rhythmic multipliers survive note conversion; identity effects survive moves', () => {
  const s = state(['c4'])
  s.effects['w:c2'] = { gain: 0.5, pitch: 1, pan: 0, delay: 0, reverb: 0, decay: 0.1 }
  const voice = voiceSpecs(s, null)[0]
  assert.equal(voice.notes, '36*8')
  assert.equal(voice.controls.gain, 0.125)
  assert.match(renderMusicCode(s, null), /note\("36\*8"\)/)
})
test('pause silences accompaniment but still allows temporary audition', () => {
  const s = { ...state(['e4']), playing: false }
  assert.equal(voiceSpecs(s, null).length, 0)
  assert.equal(voiceSpecs(s, {id:'w:e2', square:'e4'}).length, 1)
})

test('creative session configures all 32 persistent voices and starts silent', () => {
  const lab = creative.createCreativeSession()
  assert.equal(lab.pieces.length, 32)
  assert.equal(Object.keys(lab.instruments).length, 32)
  assert.equal(Object.keys(lab.effects).length, 32)
  assert.equal(Object.keys(lab.mappings).length, 32)
  assert.equal(voiceSpecs(creative.creativeSnapshot(lab, true), null).length, 0)
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(lab)), lab)
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
  assert.equal(migrated.version, 3)
  assert.equal(migrated.sectionPattern, '0')
  assert.ok(Math.abs(migrated.volume - 0.728) < 1e-9)
  assert.ok(Math.abs(migrated.instruments['w:b1'].gain - 0.28) < 1e-9)
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(migrated)), migrated)
})

test('Düsseldorf formation coordinates phrase banks and entrances on one timeline', () => {
  const lab = creative.createDusseldorfSession()
  const voices = voiceSpecs(creative.creativeSnapshot(lab, true), null)
  assert.equal(lab.version, 3)
  assert.equal(lab.sectionPattern, '<0@4 1@4 2@4 1@4>/16')
  assert.equal(voices.length, 6)
  assert.equal(voices.every(voice => voice.phrases.length === 3), true)
  assert.equal(voices.find(voice => voice.piece.id === 'w:a2').mask, undefined)
  assert.equal(voices.find(voice => voice.piece.id === 'w:d1').mask, '<~@12 x@4>/16')
  const code = renderMusicCode(creative.creativeSnapshot(lab, true), null)
  assert.match(code, /pickRestart/)
  assert.match(code, /\.mask\("<~@12 x@4>\/16"\)/)
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
