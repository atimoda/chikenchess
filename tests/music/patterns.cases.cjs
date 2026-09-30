const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, renderMusicCode, compileVoice, compileVoiceVariations } = loadTs('lib/music/runtime.ts')
const patterns = loadTs('lib/music/pattern-library.ts')
const creative = loadTs('lib/music/creative.ts')
const cityKits = loadTs('lib/music/city-kits.ts')

test('loop voices use four shared effect buses while previews remain isolated', () => {
  const kit = cityKits.defaultCityKit('detroit')
  const snapshot = creative.creativeSnapshot(kit, true)
  snapshot.pieces = snapshot.pieces.map(piece => ({ ...piece, active: true }))
  const voices = voiceSpecs(snapshot, null)
  assert.deepEqual([...new Set(voices.map(voice => voice.orbit))].sort(), [0, 1, 2, 3])
  assert.deepEqual([...new Set(voices.filter(v => v.piece.color === 'w').map(v => v.orbit))].sort(), [0, 1])
  assert.deepEqual([...new Set(voices.filter(v => v.piece.color === 'b').map(v => v.orbit))].sort(), [2, 3])
  const piece = snapshot.pieces.find(piece => piece.id === 'w:b1')
  const preview = voiceSpecs(snapshot, { id: piece.id, square: piece.square, mode: 'manual' }).find(v => v.piece.id === piece.id)
  assert.equal(preview.orbit, 64 + piece.slot)
})

test('continuous performances use pick with the same events as global-phase masks', async () => {
  const api = await strudel()
  const kit = cityKits.defaultCityKit('dusseldorf')
  const voice = voiceSpecs(creative.creativeSnapshot(kit, true), null).find(v => v.performance && !v.performance.restart)
  assert.ok(voice)
  const plan = voice.performance
  const selector = loadTs('lib/music/performance.ts').performancePattern(plan, true)
  const banks = plan.steps.map(step => {
    if (!step.active) return api.silence
    let bank = compileVoice(api, { ...voice, performance: undefined, sectionPattern: String(step.variation) })
    if (!voice.unpitched && step.transpose) bank = bank.transpose(step.transpose)
    return bank
  })
  const reference = api.stack(...banks.map((bank, index) => bank.mask(api.mini(selector).withValue(value => Number(value) === index))))
  const values = pattern => pattern.queryArc(0, 24).map(hap => ({
    begin: Number(hap.whole?.begin ?? hap.part.begin), end: Number(hap.whole?.end ?? hap.part.end),
    note: hap.value.note, n: hap.value.n, gain: hap.value.gain, cutoff: hap.value.cutoff,
    pan: hap.value.pan, room: hap.value.room,
  })).sort((a, b) => a.begin - b.begin || a.end - b.end || String(a.note ?? a.n).localeCompare(String(b.note ?? b.n)))
  assert.deepEqual(values(compileVoice(api, voice)), values(reference))
  const code = renderMusicCode(creative.creativeSnapshot(kit, true), null)
  assert.match(code, /return pick\(\[/)
  assert.doesNotMatch(code, /\.mask\(mini\([^)]*\)\.withValue\(v => Number\(v\) ===/)
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

test('extra swing delays the authored offbeats once and exported Strudel keeps the same onsets', async () => {
  const api = await strudel()
  const kit = creative.createCreativeSession()
  kit.pieces.forEach(piece => { piece.active = piece.id === 'w:b1' })
  Object.assign(kit.instruments['w:b1'], {
    phrases: ['~'], performance: undefined, groove: undefined, automations: undefined, mask: undefined,
    pianoRolls: [{ bars: 1, notes: Array.from({ length: 8 }, (_, index) => ({
      start: (index + (index % 2 ? .12 : 0)) / 8, duration: .05, degree: index, velocity: 1,
    })) }],
  })
  const snapshot = () => creative.creativeSnapshot(kit, true)
  const onsets = pattern => pattern.queryArc(0, 1).filter(hap => hap.hasOnset()).map(hap => Number(hap.whole.begin)).sort((a, b) => a - b)
  const straight = onsets(compileVoice(api, voiceSpecs(snapshot(), null)[0]))
  assert.ok(Math.abs(straight[1] - .14) < 1e-8, 'the kit timing is already swung')
  kit.instruments['w:b1'].extraSwing = .25
  const voice = voiceSpecs(snapshot(), null)[0]
  const shifted = onsets(compileVoice(api, voice))
  assert.ok(Math.abs(shifted[1] - .17125) < 1e-8, 'the knob adds its delay to the authored offbeat')
  assert.equal(shifted[0], straight[0])
  assert.equal(shifted[2], straight[2])
  const code = renderMusicCode(snapshot(), null)
  assert.match(code, /\.swingBy\(0\.25,4\)/)
  const expression = code.split('\n').filter(line => !line.startsWith('//') && !line.startsWith('setcps(') && !line.startsWith('samples(')).join('\n')
  const exported = Function('api', `with(api){return (${expression})}`)(api)
  assert.deepEqual(onsets(exported), shifted)
  const manual = voiceSpecs(snapshot(), { id: 'w:b1', square: 'b1', mode: 'manual' }).find(candidate => candidate.manual)
  assert.equal(onsets(compileVoice(api, manual))[0], 0, 'manual board audition stays immediate')
  kit.instruments['w:b1'].performance = { restart: true, steps: [{ beats: 4, variation: 0, transpose: 0, active: true }] }
  const arranged = voiceSpecs(snapshot(), null)[0]
  const arrangedCode = renderMusicCode(snapshot(), null)
  const arrangedExpression = arrangedCode.split('\n').filter(line => !line.startsWith('//') && !line.startsWith('setcps(') && !line.startsWith('samples(')).join('\n')
  const arrangedExport = Function('api', `with(api){return (${arrangedExpression})}`)(api)
  assert.deepEqual(onsets(arrangedExport), onsets(compileVoice(api, arranged)), 'the arrangement applies the added swing once')
})

test('unpitched samples ignore the instrument pitch slide while keeping their rhythm controls', async () => {
  const api = await strudel()
  const kit = cityKits.defaultCityKit('ibiza')
  const piece = kit.pieces.find(candidate => kit.instruments[candidate.id].source?.kind === 'sample' && !kit.instruments[candidate.id].source.pitched)
  assert.ok(piece)
  kit.pieces.forEach(candidate => { candidate.active = candidate.id === piece.id })
  Object.assign(kit.instruments[piece.id], { pitchEnvelope: 7, pitchAttack: .2, extraSwing: .25 })
  const voice = voiceSpecs(creative.creativeSnapshot(kit, true), null)[0]
  assert.equal(voice.unpitched, true)
  assert.equal(voice.controls.penv, undefined)
  assert.equal(voice.controls.patt, undefined)
  assert.ok(compileVoice(api, voice).queryArc(0, 4).some(hap => hap.hasOnset()))
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
