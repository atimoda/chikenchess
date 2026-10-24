const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, renderMusicCode, compileVoice } = loadTs('lib/music/runtime.ts')
const { noteRoll } = loadTs('lib/music/piano-roll.ts')
const creative = loadTs('lib/music/creative.ts')
const cityKits = loadTs('lib/music/city-kits.ts')
const { arrangementPosition, pieceSection } = loadTs('lib/music/arrangement.ts')
const withSections = (kit, beats) => creative.updateCreativeArrangement(kit, { sections: beats.map((value,index) => ({ id: `s${index}`, label: ['Intro','Verse','Chorus','Bridge','Outro'][index % 5], beats: value })) })

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

test('play chance compiles with Strudel degradeBy, exports the same control and leaves manual hits intact', async () => {
  const api = await strudel()
  const kit = cityKits.defaultCityKit('detroit')
  const piece = kit.pieces.find(candidate => candidate.active)
  const snapshot = creative.creativeSnapshot(kit, true)
  const instrument = snapshot.instruments[piece.id]
  const voice = voiceSpecs(snapshot, null).find(candidate => candidate.piece.id === piece.id)
  const events = pattern => pattern.queryArc(0, 16).filter(event => event.hasOnset())
  assert.equal(events(compileVoice(api, { ...voice, instrument: { ...instrument, playChance: 0 } })).length, 0)
  const fullChance = compileVoice(api, { ...voice, instrument: { ...instrument, playChance: 1 } })
  const legacyDefault = compileVoice(api, { ...voice, instrument: { ...instrument, playChance: undefined } })
  assert.deepEqual(events(fullChance), events(legacyDefault))

  const partial = { ...snapshot, instruments: { ...snapshot.instruments, [piece.id]: { ...instrument, playChance: .4 } } }
  assert.match(renderMusicCode(partial, null), /\.degradeBy\(0\.6\)/)
  const manual = voiceSpecs({ ...snapshot, instruments: { ...snapshot.instruments, [piece.id]: { ...instrument, playChance: 0 } } }, { id: piece.id, square: piece.square, mode: 'manual' }).find(candidate => candidate.piece.id === piece.id)
  assert.ok(events(compileVoice(api, manual)).length > 0)
})

test('continuous performances use pick with the same events as global-phase masks', async () => {
  const api = await strudel()
  const kit = cityKits.defaultCityKit('dusseldorf')
  // Current presets restart sections; the editor still supports continuous plans.
  const id = kit.pieces.find(piece => piece.active && kit.instruments[piece.id].arrangement).id
  kit.instruments[id].arrangement.restart = false
  delete kit.instruments[id].reverbRange
  delete kit.instruments[id].driveRange
  delete kit.instruments[id].swingRange
  const voice = voiceSpecs(creative.creativeSnapshot(kit, true), null).find(v => v.piece.id === id)
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

test('Düsseldorf formation coordinates explicit MIDI banks and entrances on one timeline', () => {
  const lab = creative.createDusseldorfSession()
  const voices = voiceSpecs(creative.creativeSnapshot(lab, true), null)
  assert.equal(lab.version, 7)
  assert.equal(lab.cityId, 'dusseldorf')
  assert.equal(lab.bpm, 122)
  assert.equal(lab.root, 'C#')
  assert.deepEqual(lab.arrangement.sections.map(section=>section.beats), [16,16,16,16])
  assert.deepEqual(lab.arrangement.sections.map(section=>lab.instruments['w:b1'].arrangement.sections[section.id].variation),[0,1,2,1])
  assert.equal(voices.length, 16)
  assert.equal(lab.pieces.filter(piece => piece.active && piece.color === 'w').length, 16)
  assert.equal(lab.pieces.some(piece => piece.active && piece.color === 'b'), false)
  assert.ok(voices.filter(voice => ['w:b1', 'w:c1', 'w:d1'].includes(voice.piece.id)).every(voice => voice.pianoRolls.length === 3))
  assert.ok(voices.every(voice => voice.pianoRolls.length >= 1 && voice.pianoRolls.every(roll => roll && Array.isArray(roll.notes))))
  for (const voice of voices) for (const field of ['notes', 'phrases', 'mask', 'groove', 'automations']) assert.equal(Object.hasOwn(voice, field), false, field)
  assert.equal(lab.instruments['w:b1'].name, 'Baixo supersaw')
  assert.deepEqual(lab.instruments['b:b8'], lab.instruments['w:b1'])
  assert.deepEqual(lab.instruments['b:d8'], lab.instruments['w:d1'])
  const code = renderMusicCode(creative.creativeSnapshot(lab, true), null)
  assert.ok(code.includes('[0@16 1@16 2@16 3@16]/16'))
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
  assert.deepEqual(queen.instrument.pianoRolls, lab.instruments['w:d1'].pianoRolls)
  assert.match(renderMusicCode(snapshot, null), /w:d1 · Lead de resposta/)
})

test('solo isolates a Düsseldorf voice and preserves its authored section entrances', async () => {
  const api = await strudel()
  const lab = withSections(creative.createDusseldorfSession(),[48,16])
  lab.instruments['w:d1'].arrangement = { restart: true, sections: {s0:{variation:null,transpose:0},s1:{variation:1,transpose:0}} }
  const snapshot = creative.creativeSnapshot(lab, true, 'w:d1')
  const voices = voiceSpecs(snapshot, null)
  assert.equal(voices.length, 1)
  assert.equal(voices[0].piece.id, 'w:d1')
  assert.deepEqual(voices[0].performance, {restart:true,steps:[{beats:48,variation:0,transpose:0,active:false},{beats:16,variation:1,transpose:0,active:true}]})
  assert.ok(voices[0].pianoRolls[0].notes.length > 0)
  const pattern = compileVoice(api, voices[0])
  assert.equal(pattern.queryArc(0, 12).length, 0)
  assert.ok(pattern.queryArc(12, 16).some(h => h.hasOnset()))
  const manual = voiceSpecs(snapshot, { id: 'w:d1', square: 'd1', mode: 'manual' })[0]
  assert.ok(compileVoice(api, manual).queryArc(0, 1).some(h => h.hasOnset()))
})

test('real Strudel switches the shared A/B/C/B timeline every four cycles', async () => {
  const api = await strudel()
  const lab = creative.createDusseldorfSession()
  assert.deepEqual([0,4,8,12,16].map(cycle=>pieceSection(lab.instruments['w:b1'],lab.arrangement,arrangementPosition(lab.arrangement,cycle).index).variation),[0,1,2,1,0])
  const old = structuredClone(lab);old.version=3;old.sectionPattern='<0@4 1@4 2@4 1@4>/16';delete old.arrangement
  for(const instrument of Object.values(old.instruments))delete instrument.arrangement
  const migrated=creative.parseCreativeSession(JSON.stringify(old))
  assert.deepEqual(migrated.arrangement.sections.map(section=>section.beats),[16,16,16,16])
  const voice=voiceSpecs(creative.creativeSnapshot(migrated,true),null).find(v=>v.piece.id==='w:b1')
  assert.ok(compileVoice(api,voice).queryArc(12,13).length>0)
})

test('a king can play unpitched samples and a pawn can play a pitched melody', async () => {
  const api = await strudel()
  const lab = withSections(creative.createDusseldorfSession(),[16])
  lab.instruments['w:e1'] = { ...lab.instruments['w:a2'], pianoRolls: [noteRoll([0, 0, 0, 0])] }
  lab.instruments['w:a2'] = { ...lab.instruments['w:d1'], source: { kind: 'sample', bank: 'chicken-electro-v1', asset: 'bell', variant: 1, pitched: true }, pianoRolls: [noteRoll([0, 2, 4, 2])], octave: 4 }
  const snapshot = creative.creativeSnapshot(lab, true)
  const king = voiceSpecs(snapshot, null).find(v => v.piece.id === 'w:e1')
  const pawn = voiceSpecs(snapshot, null).find(v => v.piece.id === 'w:a2')
  const hits = compileVoice(api, king).queryArc(0, 1)
  assert.equal(hits.length, 4)
  assert.ok(hits.every(h => h.value.note === undefined && h.value.n === 0))
  assert.deepEqual(compileVoice(api, pawn).queryArc(0, 1).sort((a,b)=>Number(a.whole.begin)-Number(b.whole.begin)).map(h => h.value.note), [61, 64, 68, 64])
  const changedScale = { ...snapshot, scale: ['D4','E4','F4','G4','A4','Bb4','C5'] }
  const newKing = voiceSpecs(changedScale, null).find(v => v.piece.id === 'w:e1')
  assert.deepEqual(compileVoice(api, newKing).queryArc(0, 1).map(h => h.value), hits.map(h => h.value))
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(lab)), JSON.parse(JSON.stringify(lab)))
})

test('explicit drum rolls keep complementary timing and accents with any active subset', async () => {
  const api = await strudel()
  const lab = creative.createDusseldorfSession()
  const snapshot = creative.creativeSnapshot(lab, true)
  const specs = voiceSpecs(snapshot, null)
  const onsets = voice => compileVoice(api, voice).queryArc(0, 1).filter(h => h.hasOnset()).map(h => Number(h.whole.begin)).sort((a,b)=>a-b)
  assert.deepEqual(onsets(specs.find(v => v.piece.id === 'w:a2')), [0, .25, .5, .75])
  assert.deepEqual(onsets(specs.find(v => v.piece.id === 'w:b2')), [.25, .75])
  const hats = compileVoice(api, specs.find(v => v.piece.id === 'w:c2')).queryArc(0, 1).sort((a,b)=>Number(a.whole.begin)-Number(b.whole.begin))
  assert.equal(hats.length, 8)
  assert.deepEqual(hats.map(h => h.value.velocity), [1, .4, .7, .4, 1, .4, .7, .4])
  const solo = voiceSpecs(creative.creativeSnapshot(lab, true, 'w:c2'), null)[0]
  assert.deepEqual(onsets(solo), onsets(specs.find(v => v.piece.id === 'w:c2')))
})

test('explicit MIDI accents scale velocity without adding attacks and static LPF stays fixed', async () => {
  const api = await strudel()
  const lab = withSections(creative.createCreativeSession(),[4,4])
  lab.pieces.find(p => p.id === 'w:b1').active = true
  const banks = [[1, .5, .75, .5], [.5, 1, .5, .75]].map(velocities => {
    const roll = noteRoll([0, 0, 0, 0])
    roll.notes.forEach((note, index) => { note.velocity = velocities[index] })
    return roll
  })
  lab.instruments['w:b1'] = { ...lab.instruments['w:b1'], pianoRolls: banks, gain: .5, lpf: 1200 }
  lab.instruments['w:b1'].arrangement.sections.s1.variation=1
  const voice = voiceSpecs(creative.creativeSnapshot(lab, true), null)[0]
  const pattern = compileVoice(api, voice)
  const events = pattern.queryArc(0, 1).sort((a, b) => Number(a.whole.begin) - Number(b.whole.begin))
  assert.equal(events.length, 4)
  assert.deepEqual(events.map(h => h.value.velocity), [1, .5, .75, .5])
  assert.ok(events.every(h => h.value.gain === .5 && h.value.cutoff === 1200))
  assert.deepEqual(pattern.queryArc(1, 2).sort((a, b) => Number(a.whole.begin) - Number(b.whole.begin)).map(h => h.value.velocity), [.5, 1, .5, .75])
})

test('extra swing delays the authored offbeats once and exported Strudel keeps the same onsets', async () => {
  const api = await strudel()
  const kit = creative.createCreativeSession()
  kit.pieces.forEach(piece => { piece.active = piece.id === 'w:b1' })
  Object.assign(kit.instruments['w:b1'], {
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
  kit.instruments['w:b1'].arrangement.restart = true
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

test('explicit banks select the authored variation at each section restart', async () => {
  const api = await strudel()
  const kit = creative.createDusseldorfSession()
  const voice = { ...voiceSpecs(creative.creativeSnapshot(kit, true), null).find(v => v.piece.id === 'w:d1'),
    pianoRolls: [60, 62, 64].map(pitch => noteRoll([pitch, pitch, pitch, pitch])), performance: undefined, harmonic:undefined, sectionPattern:'[0@4 1@4 2@4 1@4]/16' }
  const pattern = compileVoice(api, voice)
  for (const [cycle, pitch] of [[.5,60],[4.25,62],[8.75,64],[12.5,62],[16,60]]) {
    const events = pattern.queryArc(cycle, cycle + .01)
    assert.ok(events.length > 0)
    assert.ok(events.every(h => h.value.note === pitch))
  }
  const pinned = compileVoice(api, { ...voice, sectionPattern: '2' })
  assert.ok(pinned.queryArc(0,16).every(h => h.value.note === 64))
})

test('empty MIDI banks stay silent and manual audition still has an explicit note', async () => {
  const api = await strudel()
  const kit = creative.createDusseldorfSession()
  kit.pieces.forEach(piece => { piece.active = piece.id === 'w:d1' })
  Object.assign(kit.instruments['w:d1'], { pianoRolls: [noteRoll([])] })
  for(const section of Object.values(kit.instruments['w:d1'].arrangement.sections))section.variation=0
  const snapshot = creative.creativeSnapshot(kit, true)
  assert.deepEqual(compileVoice(api, voiceSpecs(snapshot, null)[0]).queryArc(0, 8), [])
  const manual = voiceSpecs(snapshot, { id: 'w:d1', square: 'd1', mode: 'manual' })[0]
  assert.equal(manual.pianoRolls[0].notes.length, 1)
  assert.ok(compileVoice(api, manual).queryArc(0, 1).some(h => h.hasOnset()))
  const facade = loadTs('lib/music/runtime.ts')
  for (const name of ['preparePianoRoll', 'prepareVoiceVariations', 'compileVoiceVariations']) assert.equal(Object.hasOwn(facade, name), false, name)
})

test('explicit L octave range chooses one seeded register per MIDI loop and exported Strudel matches', async () => {
  const api = await strudel()
  const kit = creative.createCreativeSession()
  kit.pieces.forEach(piece => { piece.active = piece.id === 'w:b1' })
  Object.assign(kit.instruments['w:b1'], { pianoRolls: [noteRoll([0, 1, 2, 3])], octave: 2, octaveRange: { first: 4, second: 1, frequency: 'loop' } })
  const snapshot = creative.creativeSnapshot(kit, true)
  const voice = voiceSpecs(snapshot, null)[0]
  const baseVoice = { ...voice, instrument: { ...voice.instrument, octaveRange: undefined } }
  const actual = compileVoice(api, voice)
  const base = compileVoice(api, baseVoice)
  const registerByBar = new Set()
  for (let loop = 0; loop < 12; loop++) {
    const events = actual.queryArc(loop, loop + 1).filter(event => event.hasOnset())
    const baseEvents = base.queryArc(loop, loop + 1).filter(event => event.hasOnset())
    assert.equal(events.length, 4)
    assert.equal(baseEvents.length, 4)
    const offsetsInLoop = new Set(events.map((event, index) => event.value.note - baseEvents[index].value.note))
    assert.equal(offsetsInLoop.size, 1, `loop ${loop} uses one octave for every note`)
    const offset = [...offsetsInLoop][0]
    assert.equal(Math.abs(offset % 12), 0)
    assert.ok(offset >= -12 && offset <= 24)
    registerByBar.add(offset)
  }
  assert.ok(registerByBar.size > 1, 'different loops can select different octaves')

  const code = renderMusicCode(snapshot, null)
  assert.match(code, /"frequency":"loop"/)
  const expression = code.split('\n').filter(line => !line.startsWith('//') && !line.startsWith('setcps(') && !line.startsWith('samples(')).join('\n')
  const exported = Function('api', `with(api){return (${expression})}`)(api)
  const pitches = pattern => pattern.queryArc(0, 12).filter(event => event.hasOnset())
    .map(event => [Number(event.whole.begin), event.value.note]).sort((a, b) => a[0] - b[0])
  assert.deepEqual(pitches(exported), pitches(actual))
})
