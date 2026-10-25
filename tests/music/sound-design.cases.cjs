const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs, renderMusicCode, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const cityKits = loadTs('lib/music/city-kits.ts')

const allActive = kit => { const snapshot = creative.creativeSnapshot(kit, true); snapshot.pieces = snapshot.pieces.map(piece => ({ ...piece, active: true })); return snapshot }
const withInstrument = (snapshot, id, patch) => ({ ...snapshot, instruments: { ...snapshot.instruments, [id]: { ...snapshot.instruments[id], ...patch } } })
const voiceOf = (snapshot, id) => voiceSpecs(snapshot, null).find(voice => voice.piece.id === id)
const firstValue = pattern => pattern.queryArc(0, 8).find(event => event.hasOnset()).value

test('kits without sound-design fields keep their exact voices', () => {
  const kit = cityKits.defaultCityKit('detroit')
  const parsed = creative.creativeSchema.parse(JSON.parse(JSON.stringify(kit)))
  assert.equal(JSON.stringify(voiceSpecs(allActive(parsed), null)), JSON.stringify(voiceSpecs(allActive(kit), null)))
  for (const voice of voiceSpecs(allActive(kit), null)) {
    assert.equal(voice.panLfo, undefined); assert.equal(voice.duck, undefined); assert.equal(voice.ownBus, undefined)
    assert.ok(voice.orbit < 4)
  }
})

test('sound-design fields survive the session schema and reach Superdough controls', async () => {
  const api = await strudel()
  const kit = cityKits.defaultCityKit('detroit')
  const id = 'w:a1'
  const design = { resonance: 12, filterEnv: 3, filterAttack: .02, filterDecay: .3, vibrato: 5, vibratoDepth: .4, lfoTarget: 'lpf', lfoDepth: .5, lfoRate: 2, lfoUnit: 'bars', lfoShape: 'triangle' }
  const session = creative.creativeSchema.parse({ ...kit, instruments: { ...kit.instruments, [id]: { ...kit.instruments[id], ...design } } })
  for (const [key, value] of Object.entries(design)) assert.equal(session.instruments[id][key], value)
  const voice = voiceOf(allActive(session), id)
  assert.equal(voice.controls.lpq, 12)
  assert.deepEqual([voice.controls.lpenv, voice.controls.lpattack, voice.controls.lpdecay], [3, .02, .3])
  assert.deepEqual([voice.controls.lpsync, voice.controls.lpshape], [.5, 'tri'])
  assert.ok(Math.abs(voice.controls.lpdepth - .9) < 1e-9)
  if (!voice.unpitched) assert.deepEqual([voice.controls.vib, voice.controls.vibmod], [5, .4])
  const value = firstValue(compileVoice(api, voice))
  assert.equal(value.resonance, 12); assert.equal(value.lpenv, 3); assert.equal(value.lpsync, .5)
  assert.match(renderMusicCode(allActive(session), null), /\.lpq\(12\)\.lpenv\(3\)/)
  assert.throws(() => creative.creativeSchema.parse({ ...kit, instruments: { ...kit.instruments, [id]: { ...kit.instruments[id], resonance: 40 } } }))
})

test('FM and unison apply only to synths, sample loops only to samples', () => {
  const kit = cityKits.defaultCityKit('detroit')
  const snapshot = allActive(kit)
  const ids = Object.keys(snapshot.instruments)
  const synthId = ids.find(id => snapshot.instruments[id].source?.kind !== 'sample')
  const sampleId = ids.find(id => snapshot.instruments[id].source?.kind === 'sample')
  const patch = { fmIndex: 4, fmRatio: 3, sound: 'supersaw', unison: 3, detune: .3, spread: .8, sampleLoop: true, loopStart: .2, loopEnd: .6 }
  if (synthId) {
    const synth = voiceOf(withInstrument(snapshot, synthId, patch), synthId).controls
    assert.deepEqual([synth.fmi, synth.fmh, synth.unison, synth.detune, synth.spread, synth.loop], [4, 3, 3, .3, .8, undefined])
  }
  if (sampleId) {
    const sample = voiceOf(withInstrument(snapshot, sampleId, patch), sampleId).controls
    assert.deepEqual([sample.fmi, sample.unison, sample.loop, sample.loopBegin, sample.loopEnd], [undefined, undefined, 1, .2, .6])
    assert.equal(voiceOf(withInstrument(snapshot, sampleId, { sampleLoop: true, loopStart: .7, loopEnd: .3 }), sampleId).controls.loop, undefined)
  }
})

test('a custom delay line moves the piece to its own bus and follows the tempo', () => {
  const snapshot = allActive(cityKits.defaultCityKit('detroit'))
  const plain = voiceOf(snapshot, 'w:c1')
  const voice = voiceOf(withInstrument(snapshot, 'w:c1', { delayTime: '1/16', delayFeedback: .6 }), 'w:c1')
  assert.equal(voice.orbit, 32 + voice.piece.slot); assert.equal(voice.ownBus, true)
  assert.ok(Math.abs(voice.controls.delaytime - 60 / snapshot.bpm * .25) < 1e-12)
  assert.equal(voice.controls.delayfeedback, .6)
  assert.ok(plain.orbit < 4); assert.equal(plain.controls.delayfeedback, undefined)
})

test('sidechain: the source hit ducks the listening bus of its own team, black mirrors white', async () => {
  const api = await strudel()
  let snapshot = allActive(cityKits.defaultCityKit('detroit'))
  for (const id of ['w:d2', 'b:d7']) snapshot = withInstrument(snapshot, id, { duckSource: 'e2', duckDepth: .8, duckRelease: .2 })
  const voices = voiceSpecs(snapshot, null)
  const find = id => voices.find(voice => voice.piece.id === id)
  assert.equal(find('w:d2').orbit, 32 + find('w:d2').piece.slot)
  assert.deepEqual(find('w:e2').duck, { orbits: [find('w:d2').orbit], depth: [.8], release: [.2] })
  assert.deepEqual(find('b:e7').duck, { orbits: [find('b:d7').orbit], depth: [.8], release: [.2] })
  assert.equal(find('w:d2').duck, undefined)
  const hit = firstValue(compileVoice(api, find('w:e2')))
  assert.deepEqual([hit.duckorbit, hit.duckdepth, hit.duckattack], [[find('w:d2').orbit], [.8], [.2]])
  assert.match(renderMusicCode(snapshot, null), /duckorbit: \[\d+\]/)
  // With its own source silent, the listener follows the other team's source.
  const quiet = { ...snapshot, pieces: snapshot.pieces.map(piece => piece.id === 'w:e2' ? { ...piece, active: false } : piece) }
  const fallback = voiceSpecs(quiet, null).find(voice => voice.piece.id === 'b:e7').duck
  assert.equal(fallback.orbits.length, 2)
})

test('pan LFO sweeps around the board pan as a Strudel signal', async () => {
  const api = await strudel()
  const base = allActive(cityKits.defaultCityKit('detroit'))
  const onsets = voice => compileVoice(api, voice).queryArc(0, 4).filter(event => event.hasOnset()).length
  const busiest = voiceSpecs(base, null).filter(voice => voice.piece.color === 'w').sort((a, b) => onsets(b) - onsets(a))[0].piece.id
  const snapshot = withInstrument(base, busiest, { lfoTarget: 'pan', lfoDepth: .6, lfoRate: 4, lfoUnit: 'bars' })
  const voice = voiceOf(snapshot, busiest)
  assert.equal(voice.panLfo.period, 4)
  const pans = compileVoice(api, voice).queryArc(0, 4).filter(event => event.hasOnset() && event.value.ccPan === undefined).map(event => event.value.pan)
  assert.ok(Math.max(...pans) - Math.min(...pans) > .2, `pan should move, got ${pans}`)
  assert.ok(pans.every(pan => pan >= 0 && pan <= 1))
  assert.match(renderMusicCode(snapshot, null), /\.pan\(sine\.range\(/)
})
