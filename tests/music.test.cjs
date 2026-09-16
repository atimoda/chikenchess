const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const Module = require('node:module')
const moduleCache = new Map()
// Compile the pure domain modules without loading browser/audio dependencies.
function loadTs(relative) {
  const file = path.resolve(__dirname, '..', relative)
  if (moduleCache.has(file)) return moduleCache.get(file).exports
  const mod = new Module(file, module)
  moduleCache.set(file, mod)
  mod.filename = file
  mod.paths = module.paths
  const original = mod.require.bind(mod)
  mod.require = name => name === '../performance' ? { isConstrainedDevice: () => false } : name.startsWith('.') && fs.existsSync(path.resolve(path.dirname(file), `${name}.ts`)) ? loadTs(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(file), `${name}.ts`))) : original(name)
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file)
  return mod.exports
}
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, renderMusicCode, compileVoice, compileVoiceVariations, MusicRuntime } = loadTs('lib/music/runtime.ts')
const patterns = loadTs('lib/music/pattern-library.ts')
const creative = loadTs('lib/music/creative.ts')
const state = (history = []) => ({ pieces: model.piecesFromHistory(history), scale: ['C4','Eb4','F4','G4','Bb4'], bpm: 118, volume: 0.8, playing: true, effects: {} })

let realStrudel
async function strudel() {
  if (!realStrudel) {
    // Only the bundle's DOM event listeners are stubbed. Pattern parsing,
    // composition, timeline selection and event queries use the shipped ESM.
    const previousWindow = globalThis.window, previousDocument = globalThis.document
    globalThis.window = { addEventListener() {}, removeEventListener() {} }
    globalThis.document = { addEventListener() {}, removeEventListener() {}, dispatchEvent() {} }
    try { realStrudel = await import('@strudel/web/dist/index.mjs'); realStrudel.miniAllStrings() }
    finally {
      if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow
      if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument
    }
  }
  return realStrudel
}

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

test('Düsseldorf formation coordinates phrase banks and entrances on one timeline', () => {
  const lab = creative.createDusseldorfSession()
  const voices = voiceSpecs(creative.creativeSnapshot(lab, true), null)
  assert.equal(lab.version, 4)
  assert.equal(lab.cityId, 'dusseldorf')
  assert.equal(lab.bpm, 122)
  assert.equal(lab.root, 'C#')
  assert.equal(lab.sectionPattern, '[0@4 1@4 2@4 1@4]/16')
  assert.equal(voices.length, 16)
  assert.equal(lab.pieces.filter(piece => piece.active && piece.color === 'w').length, 16)
  assert.equal(lab.pieces.some(piece => piece.active && piece.color === 'b'), false)
  assert.equal(voices.filter(voice => ['w:b1', 'w:c1', 'w:d1'].includes(voice.piece.id)).every(voice => voice.phrases.length === 3), true)
  assert.equal(voices.filter(voice => voice.groove).length, 8)
  assert.equal(voices.find(voice => voice.piece.id === 'w:a2').mask, undefined)
  assert.equal(voices.find(voice => voice.piece.id === 'w:d1').mask, undefined)
  assert.equal(lab.instruments['w:b1'].name, 'Baixo supersaw')
  assert.deepEqual(lab.instruments['b:b8'], lab.instruments['w:b1'])
  assert.deepEqual(lab.instruments['b:d8'], lab.instruments['w:d1'])
  const code = renderMusicCode(creative.creativeSnapshot(lab, true), null)
  assert.match(code, /pickRestart/)
  assert.match(code, /Lead de resposta/)
})

test('an activated Düsseldorf queen keeps the city lead loop during gameplay', () => {
  const lab = creative.createDusseldorfSession()
  const snapshot = {
    ...creative.creativeSnapshot(lab, true),
    pieces: model.piecesFromHistory(['e4', 'e5', 'Qh5']),
  }
  const queen = voiceSpecs(snapshot, null).find(voice => voice.piece.id === 'w:d1')
  assert.ok(queen)
  assert.equal(queen.instrument.name, 'Lead de resposta')
  assert.equal(queen.mask, undefined)
  assert.match(renderMusicCode(snapshot, null), /w:d1 · Lead de resposta/)
})

test('solo makes a late-arriving Düsseldorf voice audible immediately', () => {
  const lab = creative.createDusseldorfSession()
  lab.instruments['w:d1'].mask = '<~@12 x@4>/16'
  const snapshot = creative.creativeSnapshot(lab, true, 'w:d1')
  const voices = voiceSpecs(snapshot, null)
  assert.equal(voices.length, 1)
  assert.equal(voices[0].piece.id, 'w:d1')
  assert.equal(voices[0].mask, undefined)
  assert.doesNotMatch(renderMusicCode(snapshot, null), /\.mask\(/)
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

test('real Strudel switches the shared A/B/C/B timeline every four cycles', async () => {
  const api = await strudel()
  const lab = creative.createDusseldorfSession()
  const timeline = api.mini(lab.sectionPattern)
  assert.deepEqual([0, 4, 8, 12, 16].map(cycle => timeline.queryArc(cycle, cycle + .001)[0].value), [0, 1, 2, 1, 0])
  const old = { ...lab, version: 3, sectionPattern: '<0@4 1@4 2@4 1@4>/16' }
  assert.equal(creative.parseCreativeSession(JSON.stringify(old)).sectionPattern, lab.sectionPattern)
})

test('a king can play unpitched samples and a pawn can play a pitched melody', async () => {
  const api = await strudel()
  const lab = creative.createDusseldorfSession()
  lab.instruments['w:e1'] = { ...lab.instruments['w:a2'] }
  lab.instruments['w:a2'] = { ...lab.instruments['w:d1'], source: { kind: 'sample', bank: 'chicken-electro-v1', asset: 'bell', variant: 1, pitched: true }, notes: '0 2 4 2', phrases: undefined, octave: 4 }
  const snapshot = creative.creativeSnapshot(lab, true)
  const king = voiceSpecs(snapshot, null).find(v => v.piece.id === 'w:e1')
  const pawn = voiceSpecs(snapshot, null).find(v => v.piece.id === 'w:a2')
  const hits = compileVoice(api, king).queryArc(0, 1)
  assert.equal(hits.length, 4)
  assert.ok(hits.every(h => h.value.note === undefined && h.value.n === 0))
  assert.deepEqual(compileVoice(api, pawn).queryArc(0, 1).map(h => h.value.note), [61, 64, 68, 64])
  const changedScale = { ...snapshot, scale: ['D4','E4','F4','G4','A4','Bb4','C5'] }
  const newKing = voiceSpecs(changedScale, null).find(v => v.piece.id === 'w:e1')
  assert.deepEqual(compileVoice(api, newKing).queryArc(0, 1).map(h => h.value), hits.map(h => h.value))
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(lab)), JSON.parse(JSON.stringify(lab)))
})

test('groove lanes keep complementary timing and accents with any active subset', async () => {
  const api = await strudel()
  const lab = creative.createDusseldorfSession()
  const snapshot = creative.creativeSnapshot(lab, true)
  const specs = voiceSpecs(snapshot, null)
  const onsets = voice => compileVoice(api, voice).queryArc(0, 1).filter(h => h.hasOnset()).map(h => Number(h.whole.begin))
  assert.deepEqual(onsets(specs.find(v => v.piece.id === 'w:a2')), [0, .25, .5, .75])
  assert.deepEqual(onsets(specs.find(v => v.piece.id === 'w:b2')), [.25, .75])
  const hats = compileVoice(api, specs.find(v => v.piece.id === 'w:c2')).queryArc(0, 1)
  assert.equal(hats.length, 8)
  assert.deepEqual(hats.map(h => h.value.velocity), [1, .4, .7, .4, 1, .4, .7, .4])
  const solo = voiceSpecs(creative.creativeSnapshot(lab, true, 'w:c2'), null)[0]
  assert.deepEqual(onsets(solo), onsets(specs.find(v => v.piece.id === 'w:c2')))
})

test('automation scales gain and changes filters without adding note attacks', async () => {
  const api = await strudel()
  const lab = creative.createCreativeSession()
  lab.pieces.find(p => p.id === 'w:b1').active = true
  lab.instruments['w:b1'] = { ...lab.instruments['w:b1'], notes: '0*4', gain: .5, automations: {
    gain: { kind: 'pattern', patterns: ['1 .5 .75 .5', '.5 1 .5 .75'] },
    lpf: { kind: 'ramp', min: 400, max: 2000, cycles: 1 },
  } }
  lab.sectionPattern = '<0 1>'
  const voice = voiceSpecs(creative.creativeSnapshot(lab, true), null)[0]
  const pattern = compileVoice(api, voice)
  const events = pattern.queryArc(0, 1)
  assert.equal(events.length, 4)
  assert.deepEqual(events.map(h => h.value.gain), [.5, .25, .375, .25])
  assert.deepEqual(events.map(h => h.value.cutoff), [400, 800, 1200, 1600])
  assert.deepEqual(pattern.queryArc(1, 2).map(h => h.value.gain), [.25, .5, .25, .375])
})

test('all Düsseldorf sections compile using the real Strudel bundle', async () => {
  const api = await strudel()
  const lab = creative.createDusseldorfSession()
  for (const voice of voiceSpecs(creative.creativeSnapshot(lab, true), null)) {
    const pattern = compileVoice(api, voice)
    const events = pattern.queryArc(0, 16)
    assert.ok(events.length > 0, voice.instrument.name)
    assert.ok(events.every(h => Number.isFinite(Number(h.value.gain))), voice.instrument.name)
    assert.ok(events.length < 2048, voice.instrument.name)
  }
})

test('variation previews show all banks, track section restarts and cache clock-only updates', async () => {
  const api = await strudel()
  const kit = creative.createDusseldorfSession()
  const voice = voiceSpecs(creative.creativeSnapshot(kit, true), null).find(v => v.piece.id === 'w:d1')
  const preview = compileVoiceVariations(api, { ...voice, phrases: ['60*4', '62*4', '64*4'], groove: undefined, automations: undefined })
  const first = preview(.5)
  assert.equal(first.length, 3)
  assert.equal(first.filter(v => v.active).length, 1)
  assert.equal(first[0].cursor, .5)
  assert.ok(first[0].events.every(e => e.note === 60))
  assert.ok(first[1].events.every(e => e.note === 62))
  assert.ok(first[2].events.every(e => e.note === 64))
  assert.equal(preview(.75)[0].events, first[0].events)
  const second = preview(4.25)
  assert.equal(second.find(v => v.active).index, 1)
  assert.equal(second[1].cursor, .25)
  assert.equal(preview(8.75).find(v => v.active).index, 2)
  assert.equal(preview(12.5).find(v => v.active).index, 1)
  const percussion = voiceSpecs(creative.creativeSnapshot(kit, true), null).find(v => v.piece.id === 'w:a2')
  assert.equal(compileVoiceVariations(api, percussion)(0).length, 3)
  const mixed = compileVoiceVariations(api, { ...voice, phrases: ['60*4', '62*4'], sectionPattern: '[0 1 2 3]/4',
    groove: { rhythms: ['x', 'x*2', 'x*3'], accents: ['1'] }, automations: undefined })(3.25)
  assert.equal(mixed.length, 6) // Two phrases and three rhythms have six combinations.
  assert.equal(mixed.find(v => v.active).index, 3)
  assert.ok(mixed[3].events.every(e => e.note === 62))
})

test('variation preview keeps continuous notes aligned when only a groove or automation restarts', async () => {
  const api = await strudel()
  const kit = creative.createDusseldorfSession()
  const voice = { ...voiceSpecs(creative.creativeSnapshot(kit, true), null).find(v => v.piece.id === 'w:d1'),
    notes: '<60 64>', phrases: ['<60 64>'], sectionPattern: '[0 1]/2', groove: undefined, mask: undefined,
    automations: { gain: { kind: 'pattern', patterns: ['1', '.5'] } } }
  const preview = compileVoiceVariations(api, voice)
  assert.equal(preview(1.25).find(v => v.active).events[0].note, 64)
  assert.equal(preview(2.25).find(v => v.active).events[0].note, 60)
})

test('invalid automation or sample IDs cannot be saved as city kits', () => {
  const lab = creative.createDusseldorfSession()
  const invalid = patch => JSON.stringify({ ...lab, instruments: { ...lab.instruments, 'w:e1': { ...lab.instruments['w:e1'], ...patch } } })
  assert.throws(() => creative.parseCreativeSession(invalid({ source: { kind: 'sample', bank: 'unknown', asset: 'kick', variant: 0, pitched: false } })))
  assert.throws(() => creative.parseCreativeSession(invalid({ automations: { lpf: { kind: 'pattern', patterns: ['1000*20000'] } } })))
  assert.throws(() => creative.parseCreativeSession(invalid({ automations: { gain: { kind: 'pattern', patterns: ['window.alert(1)'] } } })))
  assert.throws(() => creative.parseCreativeSession(invalid({ automations: { pan: { kind: 'ramp', min: 0, max: 2, cycles: 4 } } })))
})

test('sample registry points to small valid local WAV files with explicit tuning', () => {
  const { SAMPLE_BANKS, sampleRegistration } = loadTs('lib/music/sample-banks.ts')
  let total = 0
  for (const bank of SAMPLE_BANKS) {
    let bankBytes = 0
    for (const asset of bank.assets) for (const [variant, data] of asset.variants.entries()) {
    const file = fs.readFileSync(path.resolve(__dirname, '../public', data.file.slice(1)))
    total += file.length
    bankBytes += file.length
    assert.equal(file.toString('ascii', 0, 4), 'RIFF')
    assert.equal(file.toString('ascii', 8, 12), 'WAVE')
    assert.equal(file.readUInt16LE(22), 1)
    assert.ok(sampleRegistration({ kind: 'sample', bank: bank.id, asset: asset.id, variant, pitched: true }).map)
    }
    assert.ok(bankBytes < 500_000, `${bank.id}: each bank stays below 500 KB`)
  }
  assert.ok(total < 1_200_000, 'three sample banks stay below 1.2 MB; assets load on demand')
})

test('Manchester 1999 has a curated four-section band with audible queens and gentle swung eighths', async () => {
  const api = await strudel()
  const { createManchesterJazzKit } = loadTs('lib/music/manchester-kit.ts')
  const kit = createManchesterJazzKit()
  const snapshot = creative.creativeSnapshot(kit, true)
  const voices = voiceSpecs({ ...snapshot, pieces: snapshot.pieces.map(p => ({ ...p, active: true })) }, null)
  assert.equal(kit.bpm, 123)
  assert.deepEqual([0, 4, 12, 16, 24].map(n => api.mini(kit.sectionPattern).queryArc(n, n + .001)[0].value), [0, 1, 2, 3, 0])
  const pcs = new Set([7, 9, 10, 0, 2, 4, 5])
  for (const voice of voices) for (const section of ['0', '1', '2', '3']) {
    const events = compileVoice(api, { ...voice, sectionPattern: section }).queryArc(0, 4)
    assert.ok(events.length > 0 && events.length < 100, `${voice.key}/${section}: active voice produces a bounded loop`)
    for (const event of events) {
      assert.ok(event.value.gain > 0 && event.value.gain < 1)
      if (!voice.unpitched) assert.ok(pcs.has(Number(event.value.note) % 12), `${voice.key}: shared G Dorian`)
    }
  }
  const hat = voices.find(v => v.piece.id === 'w:c2')
  const onsets = [...new Set(compileVoice(api, { ...hat, sectionPattern: '0' }).queryArc(0, 1).filter(h => h.hasOnset()).map(h => Number(h.whole.begin)))].sort((a, b) => a - b)
  assert.ok(Math.abs(onsets[1] - 5 / 36) < 1e-8, 'second eighth is delayed by the shared 5:4 weighting')
  assert.equal(onsets[2], .25, 'quarter-note pulse remains stable')
  assert.notDeepEqual(kit.instruments['w:b1'].phrases, kit.instruments['w:g1'].phrases, 'bass and reply are complementary')
})

test('Manchester eras share geography but keep separate kits and save keys', () => {
  const { getCityById, getCityEras } = loadTs('lib/cities-data.ts')
  const { defaultCityKit, cityKitStorageKey, EDITABLE_CITY_KITS } = loadTs('lib/music/city-kits.ts')
  const old = getCityById('manchester'), jazz = getCityById('manchester-1999')
  assert.deepEqual(getCityEras(jazz).map(c => c.year), [1988, 1999])
  assert.deepEqual(old.geoCoordinates, jazz.geoCoordinates)
  assert.notEqual(cityKitStorageKey(old.id), cityKitStorageKey(jazz.id))
  assert.equal(defaultCityKit(jazz.id).name, 'Manchester 1999 · Northern Jazz Breaks')
  assert.equal(EDITABLE_CITY_KITS.find(c => c.id === jazz.id).name, 'Manchester · 1999')
})

test('playback monitor distinguishes inactive, rhythmic rest and section rest', async () => {
  const api = await strudel()
  const lab = creative.createCreativeSession()
  lab.pieces.find(p => p.id === 'w:b1').active = true
  lab.instruments['w:b1'] = { ...lab.instruments['w:b1'], notes: '0 ~', mask: '[x ~]/2' }
  let seconds = .2
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: seconds }) }
  runtime.scheduler = { started: true, lastBegin: 0, lastTick: 0, latency: 0, cps: 1 }
  runtime.state = creative.creativeSnapshot(lab, true)
  runtime.voices = new Map(voiceSpecs(runtime.state, null).map(v => [v.key, v]))
  runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'note')
  assert.equal(runtime.monitor.getSnapshot().tracks['w:e1'].status, 'inactive')
  seconds = .75; runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'rest')
  seconds = 1.2; runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'masked')
})

test('before audio unlock the monitor preserves active versus inactive state', () => {
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.update(creative.creativeSnapshot(creative.createDusseldorfSession(), false))
  assert.equal(runtime.monitor.getSnapshot().tracks['w:d1'].status, 'paused')
  assert.equal(runtime.monitor.getSnapshot().tracks['b:d8'].status, 'inactive')
  runtime.dispose()
})

test('pattern edits and an empty active band preserve the running transport', async () => {
  const api = await strudel()
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  const scheduler = { started: true, lastBegin: 8, lastTick: 16, latency: 0, cps: .5, setCps(value) { this.cps = value }, setPattern() {}, start() { assert.fail('must not restart') }, stop() { assert.fail('must not stop while playing') } }
  runtime.scheduler = scheduler
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: 17 }), getSuperdoughAudioController: () => ({ nodes: {}, getOrbit: () => ({ output: { gain: { setTargetAtTime() {} } } }) }) }
  runtime.update(state(['Nf3']))
  const cycle = runtime.monitor.getSnapshot().cycle
  runtime.update({ ...state(['Nf3']), effects: { 'w:g1': { gain: .5 } } })
  assert.equal(runtime.monitor.getSnapshot().cycle, cycle)
  runtime.update(state())
  assert.equal(runtime.monitor.getSnapshot().running, true)
  assert.equal(runtime.monitor.getSnapshot().cycle, cycle)
})

test('city kit persistence round-trips sources, automation and shared grooves', () => {
  const cityKits = loadTs('lib/music/city-kits.ts')
  const lab = creative.createDusseldorfSession()
  lab.instruments['w:e1'] = { ...lab.instruments['w:a2'] }
  lab.instruments['w:b1'].automations.pan = { kind: 'pattern', patterns: ['.2 .8'] }
  const memory = new Map([[cityKits.cityKitStorageKey('dusseldorf'), JSON.stringify(lab)]])
  const previous = globalThis.window
  globalThis.window = { localStorage: { getItem: key => memory.get(key) ?? null } }
  try {
    const loaded = cityKits.loadCityKit('dusseldorf')
    assert.deepEqual(loaded, JSON.parse(JSON.stringify(lab)))
    assert.equal(loaded.instruments['w:e1'].source.asset, 'kick')
    assert.equal(loaded.instruments['w:e1'].groove.lane, 'kick')
    memory.set(cityKits.cityKitStorageKey('dusseldorf'), 'invalid')
    assert.equal(cityKits.loadCityKit('dusseldorf').version, 4)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('every city has a reproducible, distinct kit with roles independent of chess type', () => {
  const { cities } = loadTs('lib/cities-data.ts')
  const { defaultCityKit, EDITABLE_CITY_KITS } = loadTs('lib/music/city-kits.ts')
  const { createRandomCityKit } = loadTs('lib/music/random-kit.ts')
  assert.deepEqual(EDITABLE_CITY_KITS.map(c => c.id), cities.map(c => c.id))
  const fingerprints = new Set(), kingBehaviors = new Set()
  for (const city of cities) {
    const kit = defaultCityKit(city.id)
    assert.deepEqual(kit, defaultCityKit(city.id))
    assert.equal(kit.cityId, city.id)
    assert.equal(kit.pieces.filter(p => p.active).length, 16)
    assert.ok(kit.pieces.filter(p => p.active).every(p => p.color === 'w'))
    assert.deepEqual(creative.parseCreativeSession(JSON.stringify(kit)), JSON.parse(JSON.stringify(kit)))
    fingerprints.add(JSON.stringify(kit.instruments))
    kingBehaviors.add(kit.instruments['w:e1'].behavior)
    for (const color of ['w', 'b']) {
      const instruments = kit.pieces.filter(p => p.color === color).map(p => kit.instruments[p.id])
      assert.equal(instruments.length,16)
      assert.equal(instruments.filter(i=>i.behavior==='pulse').length,city.id==='vienna'?0:8)
      assert.ok(instruments.some(i=>i.behavior==='phrase'))
      assert.ok(instruments.every(i=>i.performance||city.id==='manchester-1999'))
    }
    const variant = createRandomCityKit(city, 'test-variation')
    assert.notDeepEqual(kit.instruments, variant.instruments)
    assert.deepEqual(variant, createRandomCityKit(city, 'test-variation'))
    assert.deepEqual(kit, defaultCityKit(city.id)) // reroll must not mutate the factory kit
  }
  assert.equal(fingerprints.size, cities.length)
  assert.ok(kingBehaviors.size > 1)
  assert.equal(defaultCityKit('unknown'), null)
})

test('every city voice produces bounded, in-scale Strudel events in every section', async () => {
  const api = await strudel()
  const { cities } = loadTs('lib/cities-data.ts')
  const { createRandomCityKit } = loadTs('lib/music/random-kit.ts')
  for (const city of cities) for (const seed of ['01', 'test-variation']) {
    const kit = createRandomCityKit(city, seed)
    const snapshot = creative.creativeSnapshot(kit, true)
    const pitchClasses = new Set(creative.SCALES[kit.scale].map(n => (creative.ROOTS.indexOf(kit.root) + n) % 12))
    const voices = voiceSpecs({ ...snapshot, pieces: snapshot.pieces.map(p => ({ ...p, active: true })) }, null)
    for (const voice of voices) for (const section of ['0', '1', '2']) {
      const events = compileVoice(api, { ...voice, sectionPattern: section }).queryArc(0, 4)
      const label = `${city.id}/${seed}/${voice.piece.id}/section${section}`
      assert.ok(events.length > 0 && events.length <= 128, `${label}: audible, bounded density`)
      for (const { value } of events) {
        for (const key of ['gain', 'cutoff', 'pan', 'room', 'delay']) assert.ok(Number.isFinite(Number(value[key])), `${label}: ${key}`)
        assert.ok(value.gain > 0 && value.gain < 1, `${label}: gain`)
        if (!voice.unpitched) assert.ok(pitchClasses.has(((Number(value.note) % 12) + 12) % 12), `${label}: in scale`)
      }
    }
  }
})

test('all city kits obey move, capture and temporary check activation in games', () => {
  const { cities } = loadTs('lib/cities-data.ts')
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  for (const city of cities) {
    const snapshot = creative.creativeSnapshot(defaultCityKit(city.id), true)
    const gameVoices = history => voiceSpecs({ ...snapshot, pieces: model.gameMusicStateFromHistory(history).pieces }, null)
    assert.equal(gameVoices([]).length, 0) // Creative's active flags never leak into the game
    assert.equal(gameVoices(['e4']).length, 1)
    assert.ok(gameVoices(['e4', 'd5', 'exd5']).every(v => v.piece.id !== 'b:d7'))
    assert.equal(gameVoices(['e4', 'd5', 'Bb5+']).filter(v => v.piece.color === 'w').length, 16)
    assert.equal(gameVoices(['e4', 'd5', 'Bb5+', 'c6']).filter(v => v.piece.color === 'w').length, 2)
  }
})

test('saved kits override each city independently, with safe defaults for corrupt or mismatched saves', () => {
  const { cities } = loadTs('lib/cities-data.ts')
  const { createRandomCityKit } = loadTs('lib/music/random-kit.ts')
  const { loadCityKit, defaultCityKit, cityKitStorageKey } = loadTs('lib/music/city-kits.ts')
  const memory = new Map(), previous = globalThis.window
  globalThis.window = { localStorage: { getItem: key => memory.get(key) ?? null } }
  try {
    for (const city of cities) {
      const custom = createRandomCityKit(city, 'saved-custom')
      memory.set(cityKitStorageKey(city.id), JSON.stringify(custom))
      assert.deepEqual(loadCityKit(city.id), JSON.parse(JSON.stringify(custom)))
    }
    for (const city of cities) {
      memory.set(cityKitStorageKey(city.id), '{invalid')
      assert.deepEqual(loadCityKit(city.id), defaultCityKit(city.id))
      const other = cities.find(c => c.id !== city.id)
      memory.set(cityKitStorageKey(city.id), JSON.stringify(defaultCityKit(other.id)))
      assert.deepEqual(loadCityKit(city.id), defaultCityKit(city.id))
    }
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('pausing while the audio clock starts leaves playback and its monitor stopped', async () => {
  const api = await strudel()
  let finishStart
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.scheduler = {
    started: false, lastBegin: 0, lastTick: 0, latency: 0, cps: .5,
    setCps(value) { this.cps = value }, setPattern() {},
    start() { this.started = true; return new Promise(resolve => { finishStart = resolve }) },
    stop() { this.started = false },
  }
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: 0 }), getSuperdoughAudioController: () => ({ nodes: {} }) }
  runtime.update(state())
  assert.equal(runtime.monitor.getSnapshot().running, true)
  runtime.update({ ...state(), playing: false })
  // Completion may race with the pause. The completion path must recheck state.
  runtime.scheduler.started = true
  finishStart()
  await Promise.resolve()
  assert.equal(runtime.scheduler.started, false)
  assert.equal(runtime.monitor.getSnapshot().running, false)
  runtime.dispose()
})

test('check activates only the attacking team temporarily and restores moved voices on escape', () => {
  const history = ['e4', 'd5', 'Bb5+']
  const checked = model.gameMusicStateFromHistory(history)
  assert.equal(checked.attackingColor, 'w')
  assert.equal(checked.pieces.filter(p => p.color === 'w' && p.active).length, 16)
  assert.equal(checked.pieces.filter(p => p.color === 'b' && p.active).length, 1)
  assert.equal(checked.pieces.find(p => p.id === 'w:e1').activation, 'check')
  assert.equal(model.piecesFromHistory(history).find(p => p.id === 'w:e1').active, false)
  const escaped = model.gameMusicStateFromHistory([...history, 'c6'])
  assert.equal(escaped.attackingColor, null)
  assert.equal(escaped.pieces.filter(p => p.color === 'w' && p.active).length, 2)
  assert.equal(escaped.pieces.find(p => p.id === 'w:e1').active, false)
  assert.deepEqual(model.gameMusicStateFromHistory(history), checked) // Undo/redo reconstruct the overlay.
})

test('black check does not resurrect captured voices and mate still obeys transport pause', () => {
  const checked = model.gameMusicStateFromHistory(['d4', 'e5', 'dxe5', 'Bb4+'])
  assert.equal(checked.attackingColor, 'b')
  assert.equal(checked.pieces.filter(p => p.color === 'b' && p.active).length, 15)
  assert.equal(checked.pieces.some(p => p.id === 'b:e7'), false)
  const mate = model.gameMusicStateFromHistory(['f3', 'e5', 'g4', 'Qh4#'])
  assert.equal(mate.checkmate, true)
  assert.equal(voiceSpecs({ ...state(), pieces: mate.pieces, playing: false }, null).length, 0)
})

test('check bypasses entry masks for all attackers without altering the saved kit', () => {
  const kit = creative.createDusseldorfSession()
  kit.instruments['w:e2'].mask = '~'
  kit.instruments['w:e1'].mask = '~'
  const during = model.gameMusicStateFromHistory(['e4', 'd5', 'Bb5+'])
  const snapshot = { ...creative.creativeSnapshot(kit, true), pieces: during.pieces }
  for (const id of ['w:e2', 'w:e1']) assert.equal(voiceSpecs(snapshot, null).find(v => v.piece.id === id).mask, undefined)
  assert.equal(kit.instruments['w:e2'].mask, '~')
})

async function manualRuntime() {
  const api = await strudel()
  let pattern, time = 0, patternUpdates = 0
  const attacks = []
  const nodes = {}
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.scheduler = { started: true, lastBegin: 0, lastTick: 0, latency: 0, cps: .5, setCps(v) { this.cps = v }, setPattern(v) { pattern = v; patternUpdates++ }, stop() { this.started = false } }
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: time }), getSuperdoughAudioController: () => ({ nodes, getOrbit: id => nodes[id] ??= { disconnect() {}, output: { gain: { setTargetAtTime() {} } } } }), webaudioOutput: async hap => { attacks.push(hap.value) } }
  runtime.unlock = async () => {}
  return { runtime, attacks, pattern: () => pattern, patternUpdates: () => patternUpdates, advance: seconds => { time = seconds; runtime.publishFrame() } }
}

test('crossing squares during manual play does not resubmit unchanged accompaniment', async () => {
  const { runtime, attacks, patternUpdates } = await manualRuntime()
  runtime.update(state(['Nf3', 'Nc6']))
  assert.equal(patternUpdates(), 1)
  runtime.audition('w:g1', 'f3'); await Promise.resolve()
  assert.equal(patternUpdates(), 2) // suspend the held piece's loop
  for (const square of ['f4', 'g4', 'h4', 'h5', 'g5']) {
    runtime.audition('w:g1', square); await Promise.resolve()
  }
  assert.equal(attacks.length, 6)
  assert.equal(patternUpdates(), 2)
  runtime.endAudition()
  assert.equal(patternUpdates(), 3)
  runtime.dispose()
})

test('drag suspends that voice, triggers once per entered square and restores its loop', async () => {
  const { runtime, attacks, pattern, advance } = await manualRuntime()
  runtime.update(state(['Nf3', 'Nc6']))
  runtime.audition('w:g1', 'f3')
  await Promise.resolve()
  assert.equal(attacks.length, 1)
  assert.ok(pattern().queryArc(0, 16).every(h => h.value.ccVoice === 'b:b8:loop'))
  runtime.audition('w:g1', 'f3'); await Promise.resolve()
  assert.equal(attacks.length, 1)
  runtime.audition('w:g1', 'g4'); await Promise.resolve()
  assert.equal(attacks.length, 2)
  assert.notEqual(attacks[0].note, attacks[1].note)
  advance(10)
  assert.equal(attacks.length, 2)
  assert.equal(runtime.monitor.getSnapshot().tracks['w:g1'].status, 'rest')
  runtime.endAudition()
  assert.ok(pattern().queryArc(0, 4).some(h => h.value.ccVoice === 'w:g1:loop'))
  runtime.dispose()
})

test('cancelled loading gestures stay silent; the dedicated audition button still plays the phrase', async () => {
  const { runtime, attacks, pattern } = await manualRuntime()
  runtime.update(state())
  runtime.audition('w:e1', 'e1')
  runtime.endAudition()
  await Promise.resolve()
  assert.equal(attacks.length, 0)
  assert.equal(pattern().queryArc(0, 8).length, 0)
  runtime.audition('w:e1', 'e1', 'pattern')
  await Promise.resolve()
  assert.ok(pattern().queryArc(0, 4).length > 0)
  runtime.endAudition()
  assert.equal(pattern().queryArc(0, 8).length, 0)
  runtime.dispose()
})

test('city flight ends above the selected world pin, even from the opposite side', () => {
  const { Vector3, Quaternion } = require('three')
  const { cityDirection, cityFlightPose } = loadTs('lib/globe-navigation.ts')
  const pin = cityDirection(51.23, 6.78).applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 1.5))
  const from = pin.clone().normalize().multiplyScalar(-6)
  for (const progress of [0, .25, .5, .75, 1]) {
    const pose = cityFlightPose(from, new Vector3(0, 1, 0), pin, progress)
    assert.ok(pose.position.length() >= 2.25 - 1e-8)
    assert.ok(pose.position.toArray().every(Number.isFinite))
  }
  const end = cityFlightPose(from, new Vector3(0, 1, 0), pin, 1)
  assert.ok(end.position.clone().normalize().distanceTo(pin.clone().normalize()) < 1e-8)
  assert.ok(Math.abs(end.position.length() - 2.25) < 1e-8)
})

test('vector coastlines and globe grid remain above the sphere without joining separate paths', () => {
  const { coastlineSegments, globeGridSegments, pinIsBehindGlobe } = loadTs('lib/globe-geography.ts')
  const { Vector3 } = require('three')
  assert.equal(coastlineSegments('<path d="M0,512 M1024,512"/>').length, 0)
  const coastline = coastlineSegments(fs.readFileSync(path.resolve(__dirname, '../public/world_map_contours.svg'), 'utf8'))
  const grid = globeGridSegments()
  assert.ok(coastline.length > 1000 && coastline.length < 150000)
  for (const positions of [coastline, grid]) for (let i = 0; i < positions.length; i += 6) {
    const a = new Vector3(...positions.slice(i, i + 3)), b = new Vector3(...positions.slice(i + 3, i + 6))
    assert.ok(a.add(b).multiplyScalar(.5).length() > 2)
  }
  assert.equal(pinIsBehindGlobe(new Vector3(0, 0, 2), new Vector3(0, 0, 5)), false)
  assert.equal(pinIsBehindGlobe(new Vector3(0, 0, -2), new Vector3(0, 0, 5)), true)
  assert.equal(pinIsBehindGlobe(new Vector3(2, 0, 0), new Vector3(0, 0, 5)), true)
})

test('team mixer routes each side independently and quartz lock overrides prepared fine pitch', () => {
  const { TeamMixer, createTeamMixes, resolveDeckClock } = loadTs('lib/music/team-mixer.ts')
  const node = () => ({ connections: [], frequency: {}, Q: {}, gain: { value: 0, setTargetAtTime(value) { this.value = value } }, connect(to) { this.connections.push(to) }, disconnect() { this.connections = [] } })
  const destination = node(), analyser = node()
  const mixer = new TeamMixer({ currentTime: 5, destination, createBiquadFilter: node, createGain: node }, analyser)
  const whiteOrbit = node(), blackOrbit = node()
  whiteOrbit.connect(destination)
  mixer.connect(whiteOrbit, 'w'); mixer.connect(blackOrbit, 'b')
  assert.deepEqual(whiteOrbit.connections, [mixer.sides.w.bass])
  assert.deepEqual(blackOrbit.connections, [mixer.sides.b.bass])
  const values = createTeamMixes(); values.w.bass = -9; values.w.gain = .4
  mixer.update(values)
  assert.equal(mixer.sides.w.bass.gain.value, -9)
  assert.equal(mixer.sides.b.bass.gain.value, 0)
  assert.equal(mixer.sides.w.output.gain.value, .4)
  assert.deepEqual(mixer.sides.w.output.connections, [destination, analyser])
  assert.deepEqual(resolveDeckClock(120, 118, 5, false), { bpm: 126, tuning: 1.05 })
  assert.deepEqual(resolveDeckClock(120, 118, 5, true), { bpm: 118, tuning: 1 })
  assert.deepEqual(resolveDeckClock(120, 118, -8, true), { bpm: 118, tuning: 1 })
  mixer.dispose()
  assert.equal(mixer.sides.w.output.connections.length, 0)
})

test('fine pitch changes synth tuning and sample speed consistently across both teams', () => {
  const kit = creative.createDusseldorfSession()
  const snapshot = creative.creativeSnapshot(kit, true)
  snapshot.pieces = snapshot.pieces.map(p => ({ ...p, active: true }))
  const normal = voiceSpecs(snapshot, null), shifted = voiceSpecs({ ...snapshot, tuning: 1.05 }, null)
  for (let i = 0; i < normal.length; i++) {
    if (normal[i].unpitched) assert.ok(Math.abs(shifted[i].controls.speed / normal[i].controls.speed - 1.05) < 1e-8)
    else {
      const firstNote = s => Number(s.match(/\d+(\.\d+)?/)[0])
      assert.ok(Math.abs(firstNote(shifted[i].notes) - firstNote(normal[i].notes) - 12 * Math.log2(1.05)) < 1e-8)
    }
  }
})

test('reaction ledger detects castling, captures, depleted families, thresholds, promotions and undo', () => {
  const { reactionContext }=loadTs('lib/music/reactions.ts')
  const ids=c=>c.events.map(e=>e.trigger)
  const castling=reactionContext(['O-O','O-O-O'],4,'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
  assert.deepEqual(ids(castling),['firstCastle','secondCastle'])
  for(const [symbol,event] of [['q','queenCapture'],['n','noKnights'],['r','noRooks'],['b','noBishops']]){
    const c=reactionContext(['Rxa8+'],2,`${symbol}6k/1p6/8/8/8/8/8/R6K w - - 0 1`)
    for(const name of ['firstCapture','capture',event,'minimumOne','minimumBoth'])assert.ok(ids(c).includes(name),name)
    assert.equal(c.events.find(e=>e.trigger==='minimumOne').color,'b')
    if(symbol==='q')assert.ok(ids(c).includes('noQueens'))
  }
  const fen='7k/P7/8/8/8/8/8/7K w - - 0 1'
  assert.ok(ids(reactionContext(['a8=Q+'],4,fen)).includes('promotion'))
  assert.ok(ids(reactionContext(['a8=N'],4,fen)).includes('underpromotion'))
  const ep=['e4','a6','e5','d5','exd6']
  assert.ok(ids(reactionContext(ep)).includes('enPassant'))
  assert.ok(!ids(reactionContext(ep.slice(0,-1))).includes('enPassant'))
  const mate=reactionContext(['f3','e5','g4','Qh4#'])
  assert.ok(mate.states.some(e=>e.trigger==='mate'&&e.color==='b'))
  const repeat=['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8','Nf3','Nf6']
  assert.ok(ids(reactionContext(repeat)).includes('quiet'))
  assert.ok(reactionContext(repeat).states.some(e=>e.trigger==='repetition'))
})

test('kit reactions round-trip, restore base, expire and never accumulate on rerender', () => {
  const { applyReactions, reactionsSchema }=loadTs('lib/music/reactions.ts')
  const kit=creative.createCreativeSession(), base=creative.creativeSnapshot(kit,true)
  const config=reactionsSchema.parse({minimumPieces:4,rules:[{id:'test',trigger:'queenCapture',enabled:true,target:'both',duration:2,actions:[{type:'bpm',value:10},{type:'transpose',value:2},{type:'variation',value:2},{type:'gain',value:-20}]}]})
  const context={ply:5,states:[],events:[{trigger:'queenCapture',color:'w',ply:5}]}
  const first=applyReactions(base,config,context)
  assert.equal(first.snapshot.bpm,base.bpm*1.1)
  assert.equal(first.snapshot.scale[0],'D4')
  assert.equal(first.snapshot.sectionOverrides['w:d1'],2)
  assert.deepEqual(first,applyReactions(base,config,context))
  assert.equal(applyReactions(base,config,{...context,ply:7}).snapshot.bpm,base.bpm)
  assert.equal(base.scale[0],'C4')
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify({...kit,reactions:config})).reactions,config)
  assert.throws(()=>reactionsSchema.parse({...config,rules:[{...config.rules[0],actions:[{type:'bpm',value:500}]}]}))
})

test('check reaction is removable and side actions preserve the opponent; relative preserves pitch classes', () => {
  const { applyReactions, reactionsSchema, defaultReactions }=loadTs('lib/music/reactions.ts')
  const kit=creative.createCreativeSession(), base=creative.creativeSnapshot(kit,true)
  const context={ply:0,states:[{trigger:'check',color:'b',ply:0}],events:[]}
  const result=applyReactions(base,{minimumPieces:4,rules:defaultReactions()},context)
  assert.equal(result.snapshot.pieces.filter(p=>p.active).length,16)
  assert.ok(result.snapshot.pieces.filter(p=>p.active).every(p=>p.color==='b'))
  assert.equal(applyReactions(base,{minimumPieces:4,rules:[]},context).snapshot.pieces.filter(p=>p.active).length,0)
  const config=reactionsSchema.parse({rules:[{...defaultReactions()[0],actions:[{type:'gain',value:50},{type:'variation',value:1}]}]})
  const scoped=applyReactions(base,config,context).snapshot
  assert.equal(scoped.effects['w:d1'].gain,base.effects['w:d1'].gain)
  assert.equal(scoped.effects['b:d8'].gain,base.effects['b:d8'].gain*1.5)
  const major={...base,scale:['C4','D4','E4','F4','G4','A4','B4']}
  const relative=reactionsSchema.parse({rules:[{...defaultReactions()[0],target:'both',actions:[{type:'relative'}]}]})
  const minor=applyReactions(major,relative,context).snapshot
  assert.equal(minor.scale[0],'A4')
  assert.deepEqual([...minor.scale].sort(),[...major.scale].sort())
})

test('transposition across C retains direction and octave and does not retune drum samples', () => {
  const {applyReactions,reactionsSchema}=loadTs('lib/music/reactions.ts')
  const kit=creative.createDusseldorfSession(),base=creative.creativeSnapshot(kit,true)
  base.scale=['C4','D4','E4','F4','G4','A4','B4']
  const context={ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]}
  const first=s=>Number(voiceSpecs(s,null).find(v=>v.piece.id==='w:b1').notes.match(/-?\d+(?:\.\d+)?/)[0])
  for(const shift of [-12,-1,2,12]){
    const config=reactionsSchema.parse({rules:[{id:'transpose',trigger:'opening',target:'both',enabled:true,duration:1,actions:[{type:'transpose',value:shift}]}]})
    const result=applyReactions(base,config,context).snapshot
    assert.equal(first(result)-first(base),shift)
    assert.equal(result.effects['w:a2'].pitch,base.effects['w:a2'].pitch)
  }
})

test('expanded scales round-trip in kits and rules and produce bounded Strudel notes', async () => {
  const { SCALE_INTERVALS } = loadTs('lib/music/scales.ts')
  const { reactionsSchema, applyReactions } = loadTs('lib/music/reactions.ts')
  const engine = await strudel()
  assert.deepEqual(SCALE_INTERVALS.Aeolian, SCALE_INTERVALS['Menor natural'])
  for (const [scale, intervals] of Object.entries(SCALE_INTERVALS)) {
    assert.equal(intervals[0], 0)
    assert.ok(intervals.every((n,i)=>Number.isInteger(n)&&n<12&&(i===0||n>intervals[i-1])))
    const kit=creative.createDusseldorfSession(); kit.scale=scale
    assert.equal(creative.parseCreativeSession(JSON.stringify(kit)).scale,scale)
    const config=reactionsSchema.parse({rules:[{id:'scale',trigger:'opening',enabled:true,quantize:true,target:'both',duration:2,actions:[{type:'scale',scale}]}]})
    const snapshot=applyReactions(creative.creativeSnapshot(kit,true),config,{ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]}).snapshot
    assert.equal(snapshot.scale.length,intervals.length)
    const voice=voiceSpecs(snapshot,null).find(v=>v.piece.id==='w:b1')
    const haps=compileVoice(engine,voice).queryArc(0,4)
    assert.ok(haps.length>0,scale)
    assert.ok(haps.every(h=>Number.isFinite(Number(h.value.note))),scale)
  }
})

test('timed reaction snapshots hold both entry and return without freezing unrelated base edits', () => {
  const { reactionsSchema, reactionEntries, applyReactions }=loadTs('lib/music/reactions.ts')
  const config=reactionsSchema.parse({rules:[{id:'q',trigger:'queenCapture',enabled:true,quantize:true,target:'both',duration:1,actions:[{type:'bpm',value:10}]}]})
  const idle={ply:0,states:[],events:[]}, hit={ply:1,states:[],events:[{trigger:'queenCapture',color:'w',ply:1}]}
  const base=creative.creativeSnapshot(creative.createDusseldorfSession(),true)
  const before=reactionEntries(config,idle), active=reactionEntries(config,hit)
  assert.equal(applyReactions(base,config,hit,before).snapshot.bpm,base.bpm)
  assert.equal(applyReactions(base,config,hit,active).snapshot.bpm,base.bpm*1.1)
  assert.equal(applyReactions({...base,bpm:100},config,{...hit,ply:2},active).snapshot.bpm,110.00000000000001)
  const expired=reactionEntries(config,{...hit,ply:2})
  assert.equal(applyReactions(base,config,{...hit,ply:2},expired).snapshot.bpm,base.bpm)
  assert.equal(creative.parseCreativeSession(JSON.stringify({...creative.createCreativeSession(),reactions:config})).reactions.rules[0].quantize,true)
  const old=JSON.parse(JSON.stringify(config));delete old.rules[0].quantize
  assert.equal(reactionsSchema.parse(old).rules[0].quantize,false)
})

test('audio tempo map integrates ramps exactly and preserves phase when interrupted', () => {
 const {TempoMap}=loadTs('lib/music/transport.ts'),t=new TempoMap(120,10)
 assert.equal(t.timeAt(1),12)
 t.change(1,180,4)
 assert.equal(t.bpmAt(3),150)
 for(const c of [0,1,1.5,3,5,7])assert.ok(Math.abs(t.cycleAt(t.timeAt(c))-c)<1e-8)
 const before=t.timeAt(2.5);t.change(2.5,90,2)
 assert.equal(t.timeAt(2.5),before)
 assert.equal(t.bpmAt(4.5),90)
 assert.ok(Math.abs(t.cycleAt(t.timeAt(7))-7)<1e-8)
})

test('audio scheduler switches before the downbeat query and schedules through a BPM ramp', async () => {
 const {MusicTransport}=loadTs('lib/music/transport.ts');let now=0,switched=false
 const scheduled=[],boundaries=[]
 const api=await strudel()
 const transport=new MusicTransport({getTime:()=>now,latency:.18,onError:e=>{throw e},onBoundary:c=>{boundaries.push(c);if(c===1){switched=true;transport.setCps(180/240,2);transport.setPattern(api.note('72*4'))}},onTrigger:(h,d,duration,cps,time)=>scheduled.push({note:h.value.note,cycle:Number(h.whole.begin),time,duration,cps})})
 await transport.setPattern(api.note('60*4'));await transport.start()
 for(now=.025;now<7;now+=.025)transport.tick()
 transport.stop()
 assert.ok(switched)
 const downbeat=scheduled.find(n=>n.cycle===1)
 assert.equal(Number(downbeat.note),72)
 assert.ok(Math.abs(downbeat.time-2.03)<1e-8)
 assert.ok(scheduled.every(n=>n.duration>0))
 assert.equal(new Set(scheduled.map(n=>n.cycle)).size,scheduled.length)
 assert.ok(scheduled.find(n=>n.cycle===2).cps>scheduled.find(n=>n.cycle===1).cps)
})

test('queued rules coalesce, cancel stale events, and apply independently at audio boundaries', () => {
 const {ReactionQueue}=loadTs('lib/music/reaction-queue.ts'),{reactionsSchema}=loadTs('lib/music/reactions.ts')
 const q=new ReactionQueue(),idle={ply:0,states:[],events:[]},active={ply:0,states:[{trigger:'check',color:'w',ply:0}],events:[]}
 const config=reactionsSchema.parse({rules:[{id:'check',trigger:'check',enabled:true,quantize:true,target:'both',duration:1,actions:[{type:'bpm',value:10,rampBars:4}]}]})
 q.update(config,idle,false,0,'a');q.update(config,active,true,.2,'a')
 assert.equal(q.pending.get('check').cycle,1)
 q.update(config,idle,true,.8,'a');assert.equal(q.pending.size,0)
 q.update(config,active,true,.9,'a');assert.equal(q.advance(.99).changed,false)
 assert.deepEqual(q.advance(1),{changed:true,bars:4});assert.equal(q.entries.get('check').hit.color,'w')
 q.update(config,idle,true,1.4,'a');assert.equal(q.entries.get('check').hit.color,'w')
 q.advance(2);assert.equal(q.entries.get('check').hit,undefined)
 q.update(config,active,true,2.5,'a');q.update(config,idle,false,2.6,'a');assert.equal(q.pending.size,0)
})

test('editable notes keep their durations and independent loop lengths in real Strudel', async () => {
 const api=await strudel(),kit=creative.createDusseldorfSession()
 kit.instruments['w:b1'].pianoRolls=[{bars:.75,notes:[{start:0,duration:.125,degree:0,velocity:.7}]}]
 kit.instruments['w:b1'].selectedVariation=0
 const parsed=creative.parseCreativeSession(JSON.stringify(kit))
 const v=voiceSpecs(creative.creativeSnapshot(parsed,true),null).find(v=>v.piece.id==='w:b1')
 const hits=compileVoice(api,v).queryArc(0,3).filter(h=>h.hasOnset())
 assert.deepEqual(hits.map(h=>Number(h.whole.begin)),[0,.75,1.5,2.25])
 assert.ok(hits.every(h=>Number(h.whole.end.sub(h.whole.begin))===.125))
 assert.ok(renderMusicCode(creative.creativeSnapshot(parsed,true),null).includes('timeCat('))
 const {resizeRoll}=loadTs('lib/music/piano-roll.ts')
 assert.deepEqual(resizeRoll({bars:2,notes:[{start:.5,duration:1,degree:0,velocity:1},{start:1.5,duration:.5,degree:2,velocity:1}]},1).notes,[{start:.5,duration:.5,degree:0,velocity:1}])
})

test('fixed variation plays its whole multi-bar phrase instead of restarting every bar', async () => {
 const api=await strudel(),kit=creative.createDusseldorfSession(),id='w:b1'
 Object.assign(kit.instruments[id],{notes:'0',phrases:['0','<0 2 4 6>'],selectedVariation:1,groove:undefined,automations:undefined,mask:undefined})
 const voice=voiceSpecs(creative.creativeSnapshot(kit,true),null).find(v=>v.piece.id===id)
 const pitches=compileVoice(api,voice).queryArc(0,4).map(h=>Number(h.value.note))
 assert.equal(new Set(pitches).size,4)
})

test('state inversion also transforms edited degrees without mutating the saved roll', () => {
 const {reactionsSchema,applyReactions}=loadTs('lib/music/reactions.ts')
 const kit=creative.createDusseldorfSession(),id='w:b1'
 kit.instruments[id].pianoRolls=[{bars:1,notes:[{start:0,duration:.25,degree:3,velocity:.8}]}]
 const config=reactionsSchema.parse({rules:[{id:'invert',trigger:'opening',enabled:true,target:'both',duration:1,actions:[{type:'invert'}]}]})
 const result=applyReactions(creative.creativeSnapshot(kit,true),config,{ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]})
 assert.equal(result.snapshot.instruments[id].pianoRolls[0].notes[0].degree,-3)
 assert.equal(kit.instruments[id].pianoRolls[0].notes[0].degree,3)
})

test('two-finger screen rotation projects globe landmarks in the same direction', () => {
 const THREE=require('three')
 for(const gesture of [-Math.PI/6,Math.PI/6]){
  const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.set(0,0,5);camera.lookAt(0,0,0);camera.updateMatrixWorld()
  const marker=new THREE.Vector3(1,0,0),before=marker.clone().project(camera)
  camera.up.applyAxisAngle(camera.position.clone().normalize(),gesture);camera.lookAt(0,0,0);camera.updateMatrixWorld()
  const after=marker.clone().project(camera),screenDelta=Math.atan2(-after.y,after.x)-Math.atan2(-before.y,before.x)
  assert.ok(Math.abs(screenDelta-gesture)<1e-8)
 }
})

test('section form preserves asymmetric lengths, silence, transpose and restart selection', async () => {
 const api=await strudel(),kit=creative.createCreativeSession()
 const instrument=kit.instruments['w:b1']
 Object.assign(instrument,{notes:'0 1',phrases:['0 1','2 3'],pianoRolls:undefined,automations:undefined,mask:undefined,groove:undefined,performance:{restart:true,steps:[{beats:3,variation:0,transpose:0,active:true},{beats:5,variation:1,transpose:-5,active:true},{beats:2,variation:0,transpose:0,active:false}]}})
 kit.pieces.forEach(p=>p.active=p.id==='w:b1')
 const voice=voiceSpecs(creative.creativeSnapshot(kit,true),null)[0],pattern=compileVoice(api,voice)
 const events=pattern.queryArc(0,2.5).filter(h=>h.hasOnset())
 assert.ok(events.some(h=>Number(h.whole.begin)===.75),'second phrase restarts at the 3-beat boundary')
 assert.equal(pattern.queryArc(2,2.5).length,0,'muted section has no notes')
 const expected=compileVoice(api,{...voice,performance:undefined,sectionPattern:'1'}).queryArc(0,.1)[0].value.note-5
 assert.equal(events.find(h=>Number(h.whole.begin)===.75).value.note,expected)
 assert.equal(voiceSpecs({...creative.creativeSnapshot(kit,true),sectionOverrides:{'w:b1':1}},null)[0].performance,undefined)
 instrument.selectedVariation=0
 assert.equal(voiceSpecs(creative.creativeSnapshot(kit,true),null)[0].performance,undefined)
})

test('per-note slide uses canonical pattack and pan overrides after global controls', async () => {
 const api=await strudel(),kit=creative.createCreativeSession()
 kit.pieces.forEach(p=>p.active=p.id==='w:b1')
 Object.assign(kit.instruments['w:b1'],{phrases:['0'],groove:undefined,automations:undefined,mask:undefined,performance:undefined,pitchEnvelope:2,pitchAttack:.1,pianoRolls:[{bars:1,notes:[{start:0,duration:.5,degree:0,velocity:.7,slide:-3,slideSeconds:.6,pan:.49},{start:.5,duration:.5,degree:2,velocity:1}]}]})
 const snapshot=creative.creativeSnapshot(kit,true),events=compileVoice(api,voiceSpecs(snapshot,null)[0]).queryArc(0,1)
 assert.equal(events[0].value.penv,-3);assert.equal(events[0].value.pattack,.6);assert.equal(events[0].value.pan,.49)
 assert.equal(events[1].value.penv,2);assert.equal(events[1].value.pattack,.1)
 assert.equal(events[0].value.ccSlide,undefined)
})

test('curated collection has finite, bounded events across all banks and full forms',async()=>{
 const api=await strudel(),{cities}=loadTs('lib/cities-data.ts'),{defaultCityKit}=loadTs('lib/music/city-kits.ts')
 for(const city of cities){
  const kit=defaultCityKit(city.id),snapshot=creative.creativeSnapshot(kit,true)
  for(const voice of voiceSpecs({...snapshot,pieces:snapshot.pieces.map(p=>({...p,active:true}))},null)){
   for(let section=0;section<voice.phrases.length;section++){
    const events=compileVoice(api,{...voice,performance:undefined,mask:undefined,sectionPattern:String(section)}).queryArc(0,8)
    assert.ok(events.length>0,`${city.id}/${voice.key}/${section} has music`)
    for(const h of events){assert.ok(Number.isFinite(h.value.gain));if(!voice.unpitched)assert.ok(Number.isFinite(Number(h.value.note)))}
   }
   const pattern=compileVoice(api,voice),bars=voice.performance?voice.performance.steps.reduce((n,s)=>n+s.beats/4,0):16
   for(let cycle=0;cycle<bars;cycle++)assert.ok(pattern.queryArc(cycle,cycle+1).length<=128,`${city.id}/${voice.key}: density`)
  }
 }
})

test('catalog migration backs up once and preserves subsequent edits, including restored old kits',()=>{
 const {loadCityKit,previousCityKit,cityKitStorageKey}=loadTs('lib/music/city-kits.ts'),{STYLE_REVISION}=loadTs('lib/music/styled-kits.ts')
 const old=creative.createDusseldorfSession(),memory=new Map([[cityKitStorageKey('dusseldorf'),JSON.stringify(old)]]),previous=globalThis.window
 globalThis.window={localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}}
 try{
  const current=loadCityKit('dusseldorf');assert.equal(current.catalogRevision,STYLE_REVISION)
  assert.deepEqual(previousCityKit('dusseldorf'),JSON.parse(JSON.stringify(old)))
  current.name='Personal';memory.set(cityKitStorageKey('dusseldorf'),JSON.stringify(current));assert.equal(loadCityKit('dusseldorf').name,'Personal')
  const restored={...old,catalogRevision:STYLE_REVISION};memory.set(cityKitStorageKey('dusseldorf'),JSON.stringify(restored));assert.equal(loadCityKit('dusseldorf').name,old.name)
  assert.deepEqual(previousCityKit('dusseldorf'),JSON.parse(JSON.stringify(old)))
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous}
})

test('Mouth Breather study preserves guitar layers, chromatic falls and drum-specific tracks',async()=>{
 const api=await strudel(),kit=creative.parseCreativeSession(fs.readFileSync(path.join(__dirname,'../public/presets/mouth-breather.json'),'utf8'))
 assert.equal(kit.bpm,215);assert.equal(kit.scale,'Chromatic');assert.equal(kit.pieces.filter(p=>p.active).length,6)
 const g=kit.instruments['w:d1'];assert.equal(g.performance.steps.length,17);assert.equal(g.performance.steps.reduce((n,s)=>n+s.beats,0),488)
 assert.ok(g.pianoRolls[0].notes.some(n=>n.pan===.49));assert.deepEqual(g.pianoRolls[1].notes.map(n=>n.degree).sort((a,b)=>a-b),[-8,-1,4])
 assert.ok(g.pianoRolls[1].notes.every(n=>n.slide===-3&&n.slideSeconds===.6))
 for(const voice of voiceSpecs(creative.creativeSnapshot(kit,true),null)){
  const pattern=compileVoice(api,voice)
  for(let cycle=0;cycle<122;cycle++)assert.ok(pattern.queryArc(cycle,cycle+1).length<=128)
 }
})

test('exported Strudel matches compiled note timing, slide and form through an entire study',async()=>{
 const api=await strudel(),kit=creative.parseCreativeSession(fs.readFileSync(path.join(__dirname,'../public/presets/mouth-breather.json'),'utf8'))
 const snapshot=creative.creativeSnapshot(kit,true),code=renderMusicCode(snapshot,null)
 const expression=code.slice(code.indexOf('\nstack(')+1)
 const exported=new Function(...Object.keys(api),`return ${expression}`)(...Object.values(api))
 const actual=api.stack(...voiceSpecs(snapshot,null).map(v=>compileVoice(api,v)))
 const normalize=hs=>hs.filter(h=>h.hasOnset()).map(h=>JSON.stringify([Number(h.whole.begin),Number(h.whole.end),h.value.note??null,h.value.s,h.value.penv??null,h.value.pattack??null,h.value.pan,h.value.velocity])).sort()
 for(let bar=0;bar<122;bar++)assert.deepEqual(normalize(exported.queryArc(bar,bar+1)),normalize(actual.queryArc(bar,bar+1)),`bar ${bar}`)
})

test('study arrangement matches the supplied G/B/D score timing and chromatic pitches',async()=>{
 const api=await strudel(),score=api.mini('<G@3 [G,D]@6 [G,D,B]@6 [G:1,D]@3 [G,D,B]@3 [G:1,D]@3 [G,D,B]@3 [G:0:-5,D,B:0:-5]@3 [G:0:-7,D,B:0:-7]@3 [D,B]@6 [G,D,B]@3 ~ [G,D,B]@6 [G:0:-5,D,B:0:-5]@3 [G:0:-7,D,B:0:-7]@3 D@3 ~@3>/16')
 const column=(pat,i)=>pat.withValue(v=>Array.isArray(v)?v[i]??0:i===0?v:0)
 const source=(part,patterns)=>{const selected=score.filterValues(v=>v[0]===part);return api.pickRestart(patterns,column(selected,1)).transpose(column(selected,2)).fast(8)}
 const structure=api.mini('<x!4 ~!2 x!9 x@3 x!6>')
 const g0=api.stack(api.note('<48@9 49 48@2>'),api.mini('<55 53@2 55@4 53 55 56 55 53>').add('<0,5>').note()).struct(structure)
 const g1=api.mini('<[48,55,60]@3 ~@45>').add(-8).note()
 const b=api.note('<36!3 36@2 ~ 36!3 <[37 41 37] [36 41 43]>@3>')
 const kit=creative.parseCreativeSession(fs.readFileSync(path.join(__dirname,'../public/presets/mouth-breather.json'),'utf8'))
 const voices=voiceSpecs(creative.creativeSnapshot(kit,true),null)
 const normalize=hs=>hs.filter(h=>h.hasOnset()).map(h=>JSON.stringify([Number(h.whole.begin),Number(h.whole.end),h.value.note])).sort()
 for(const [id,pattern] of [['w:d1',source('G',[g0,g1])],['w:b1',source('B',[b])]]){
  const actual=compileVoice(api,voices.find(v=>v.piece.id===id))
  for(let bar=0;bar<122;bar++)assert.deepEqual(normalize(actual.queryArc(bar,bar+1)),normalize(pattern.queryArc(bar,bar+1)),`${id} bar ${bar}`)
 }
})

test('study drum parts retain each onset from the supplied mixed drum pattern',async()=>{
 const api=await strudel(),kit=creative.parseCreativeSession(fs.readFileSync(path.join(__dirname,'../public/presets/mouth-breather.json'),'utf8'))
 const drumPattern=api.s('<[bd ~ bd sd ~ bd!2 ~!2 bd sd ~ bd ~!2 bd sd bd ~ bd sd ~ bd ~],oh*12,cr*2>/24').fast(8)
 for(const [id,sound] of [['w:a2','bd'],['w:b2','sd'],['w:c2','oh'],['w:d2','cr']]){
  const expected=drumPattern.queryArc(0,3).filter(h=>h.hasOnset()&&h.value.s===sound).map(h=>[Number(h.whole.begin),Number(h.whole.end)])
  assert.deepEqual(kit.instruments[id].pianoRolls[0].notes.map(n=>[n.start,n.start+n.duration]),expected)
 }
})
