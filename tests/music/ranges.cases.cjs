const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const creative = loadTs('lib/music/creative.ts')
const { voiceSpecs, compileVoice, renderMusicCode } = loadTs('lib/music/runtime.ts')

function fixture() {
  const kit = creative.updateCreativeArrangement(creative.createCreativeSession(), { sections: [
    { id: 'a', label: 'Intro', beats: 16 }, { id: 'b', label: 'Verse', beats: 16 },
  ] })
  kit.pieces.forEach(piece => { piece.active = piece.id === 'w:b1' })
  Object.assign(kit.instruments['w:b1'], {
    behavior: 'phrase',
    pianoRolls: [{ bars: 4, notes: Array.from({ length: 32 }, (_, index) => ({ start: index / 8, duration: .0625, degree: 0, velocity: .8 })) }],
    arrangement: { restart: true, sections: { a: { variation: 0, transpose: 0 }, b: { variation: 0, transpose: 0 } } },
    driveRange: { first: 2, second: .5, frequency: 'loop' }, reverbRange: { first: .04, second: .2, frequency: 'loop' },
    swingRange: { first: .01, second: .08, frequency: 'loop' }, lpfRange: { first: 400, second: 4000, frequency: 'loop' }, octaveRange: undefined,
  })
  return kit
}

function exported(api, snapshot, preview = null) {
  const expression = renderMusicCode(snapshot, preview).split('\n')
    .filter(line => !line.startsWith('//') && !line.startsWith('setcps(') && !line.startsWith('samples(')).join('\n')
  return Function('api', `with(api){return (${expression})}`)(api)
}

const eventValues = (pattern, start = 0, end = 16) => pattern.queryArc(start, end).filter(hap => hap.hasOnset())
  .map(hap => ({ time: Number(hap.whole.begin), end: Number(hap.whole.end), note: hap.value.note,
    room: hap.value.room, distort: hap.value.distort, distortvol: hap.value.distortvol, cutoff: hap.value.cutoff })).sort((a, b) => a.time - b.time || a.note - b.note)

test('S holds for the whole section, including multiple loops, and draws again on same-bank re-entry', async () => {
  const api = await strudel(), kit = fixture(), inst = kit.instruments['w:b1']
  inst.pianoRolls[0].bars = 1; inst.pianoRolls[0].notes = inst.pianoRolls[0].notes.slice(0, 8)
  kit.arrangement.sections.forEach(section => { section.beats = 20 })
  for (const key of ['driveRange', 'reverbRange', 'swingRange', 'lpfRange']) inst[key].frequency = 'section'
  inst.octaveRange = { first: 2, second: 5, frequency: 'section' }
  const snapshot = creative.creativeSnapshot(kit, true), pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  for (const [from, to] of [[0, 5], [5, 10]]) {
    const events = eventValues(pattern, from, to)
    for (const key of ['room', 'distort', 'note', 'cutoff']) assert.equal(new Set(events.map(event => event[key])).size, 1)
  }
  assert.notEqual(eventValues(pattern, 0, 1)[0].room, eventValues(pattern, 5, 6)[0].room)
  assert.notEqual(eventValues(pattern, 0, 1)[0].cutoff, eventValues(pattern, 5, 6)[0].cutoff)
  assert.deepEqual(eventValues(exported(api, snapshot)), eventValues(pattern))
})

test('N draws per original attack, keeps chord notes together, and is stable across monitor-sized queries', async () => {
  const api = await strudel(), kit = fixture(), inst = kit.instruments['w:b1']
  for (const key of ['driveRange', 'reverbRange', 'swingRange', 'lpfRange']) inst[key].frequency = 'note'
  inst.octaveRange = { first: 2, second: 5, frequency: 'note' }
  inst.pianoRolls[0].notes = inst.pianoRolls[0].notes.flatMap(note => [note, { ...note, degree: 2 }])
  const snapshot = creative.creativeSnapshot(kit, true), pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  const events = eventValues(pattern)
  const { degreeToMidi } = loadTs('lib/music/model.ts')
  const interval = degreeToMidi(2, snapshot.scale, inst.octave) - degreeToMidi(0, snapshot.scale, inst.octave)
  assert.equal(events.length, 256)
  assert.ok(new Set(events.map(event => event.room)).size > 16)
  assert.ok(new Set(events.map(event => event.distort)).size > 16)
  assert.ok(new Set(events.map(event => event.cutoff)).size > 16)
  assert.ok(events.every(event => event.cutoff >= 400 && event.cutoff <= 4000))
  const pairs = new Map()
  for (const event of events) {
    const pair = pairs.get(event.time)
    if (pair) { assert.equal(event.room, pair.room); assert.equal(event.distort, pair.distort); assert.equal(event.cutoff, pair.cutoff); assert.equal(event.note - pair.note, interval) }
    else pairs.set(event.time, event)
  }
  const chunks = Array.from({ length: 512 }, (_, index) => eventValues(pattern, index / 32, (index + 1) / 32)).flat()
  assert.deepEqual(chunks, events, 'scheduler windows do not lose or duplicate swung onsets')
  assert.deepEqual(eventValues(pattern), events, 'repeated monitor queries never consume new draws')
  assert.deepEqual(eventValues(exported(api, snapshot)), events)
})

test('S follows global section boundaries with both pinned and rule-forced MIDI variations', async () => {
  const api = await strudel(); let kit = fixture()
  kit = creative.updateCreativeArrangement(kit, { sections: [{ id: 'a', label: 'Intro', beats: 16 }, { id: 'b', label: 'Verse', beats: 32 }, { id: 'c', label: 'Chorus', beats: 16 }] })
  const inst = kit.instruments['w:b1']
  inst.swingRange = { first: 0, second: 0 }
  inst.reverbRange.frequency = 'section'; inst.driveRange.frequency = 'section'
  inst.pianoRolls.push(structuredClone(inst.pianoRolls[0]))
  for (const section of kit.arrangement.sections) inst.arrangement.sections[section.id].variation = section.id === 'b' ? 1 : 0
  let snapshot = creative.creativeSnapshot(kit, true), pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  const rooms = (from, to) => new Set(eventValues(pattern, from, to).map(event => event.room))
  assert.equal(rooms(0, 4).size, 1); assert.equal(rooms(4, 12).size, 1); assert.equal(rooms(12, 16).size, 1)
  assert.notEqual([...rooms(0, 4)][0], [...rooms(12, 16)][0])
  assert.deepEqual(eventValues(exported(api, snapshot)), eventValues(pattern))
  inst.selectedVariation = 1; snapshot = creative.creativeSnapshot(kit, true); pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  assert.equal(rooms(0, 4).size, 1); assert.equal(rooms(4, 12).size, 1); assert.equal(rooms(12, 16).size, 1)
  assert.notEqual([...rooms(0, 4)][0], [...rooms(12, 16)][0])
  assert.deepEqual(eventValues(exported(api, snapshot)), eventValues(pattern))
  snapshot = { ...snapshot, sectionOverrides: { 'w:b1': 0 } }; pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  assert.equal(rooms(0, 4).size, 1); assert.equal(rooms(4, 12).size, 1); assert.equal(rooms(12, 16).size, 1)
  assert.notEqual([...rooms(0, 4)][0], [...rooms(12, 16)][0])
  assert.deepEqual(eventValues(exported(api, snapshot)), eventValues(pattern))
})

test('explicit L octave holds for the loop and a missing frequency defaults to N', async () => {
  const api = await strudel(), kit = fixture(), inst = kit.instruments['w:b1']
  inst.swingRange = { first: 0, second: 0 }; inst.octaveRange = { first: 1, second: 7, frequency: 'loop' }
  let snapshot = creative.creativeSnapshot(kit, true), pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  for (let loop = 0; loop < 3; loop++) assert.equal(new Set(eventValues(pattern, loop * 4, loop * 4 + 4).map(event => event.note)).size, 1)
  assert.deepEqual(eventValues(exported(api, snapshot)), eventValues(pattern))
  delete inst.octaveRange.frequency; snapshot = creative.creativeSnapshot(kit, true); pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  assert.ok(new Set(eventValues(pattern, 0, 4).map(event => event.note)).size > 1)
  assert.deepEqual(eventValues(exported(api, snapshot)), eventValues(pattern))
  for (const key of ['driveRange', 'reverbRange', 'swingRange', 'lpfRange']) delete inst[key].frequency
  snapshot = creative.creativeSnapshot(kit, true); pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  const events = eventValues(pattern, 0, 4)
  assert.ok(new Set(events.map(event => event.room)).size > 1)
  assert.ok(new Set(events.map(event => event.distort)).size > 1)
  assert.ok(new Set(events.map(event => event.cutoff)).size > 1)
  assert.deepEqual(eventValues(exported(api, snapshot), 0, 4), events)
})

test('fixed frequency keeps the first endpoint for every range target', async () => {
  const api = await strudel(), kit = fixture(), inst = kit.instruments['w:b1']
  inst.driveRange = { first: 1.3, second: 2.8, frequency: 'fixed' }
  inst.reverbRange = { first: .1, second: .3, frequency: 'fixed' }
  inst.swingRange = { first: .01, second: .2, frequency: 'fixed' }
  inst.lpfRange = { first: 1200, second: 8000, frequency: 'fixed' }
  inst.octaveRange = { first: inst.octave - 1, second: inst.octave + 1, frequency: 'fixed' }
  const snapshot = creative.creativeSnapshot(kit, true), pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  const events = eventValues(pattern)
  assert.ok(events.length > 0)
  assert.ok(events.every(event => event.distort === 1.3 && event.room === .1 && event.cutoff === 1200))
  const baseKit = structuredClone(kit); delete baseKit.instruments['w:b1'].octaveRange
  const base = eventValues(compileVoice(api, voiceSpecs(creative.creativeSnapshot(baseKit, true), null)[0]))
  const shift = (inst.octave - 1 - inst.octave) * 12
  assert.deepEqual(events.map(event => event.note), base.map(event => event.note + shift))
  assert.deepEqual(eventValues(exported(api, snapshot)), events)
})

test('range frequencies persist, equal limits stay fixed, and manual attacks stay immediate', async () => {
  const api = await strudel(), kit = fixture(), inst = kit.instruments['w:b1']
  for (const frequency of ['fixed', 'loop', 'section', 'note']) {
    inst.driveRange = { first: 0, second: 0, frequency }; inst.reverbRange = { first: .1, second: .1, frequency }
    inst.swingRange = { first: .1, second: .1, frequency }; inst.octaveRange = { first: 3, second: 3, frequency }
    inst.lpfRange = { first: 1200, second: 1200, frequency }
    assert.deepEqual(creative.parseCreativeSession(JSON.stringify(kit)), JSON.parse(JSON.stringify(kit)))
    const snapshot = creative.creativeSnapshot(kit, true), voice = voiceSpecs(snapshot, null)[0]
    assert.ok(eventValues(compileVoice(api, voice)).every(event => event.distort === undefined && event.distortvol === undefined && event.room === .1 && event.cutoff === 1200))
    const manual = voiceSpecs(snapshot, { id: 'w:b1', square: 'b1', mode: 'manual' })[0]
    assert.equal(eventValues(compileVoice(api, manual), 0, 1)[0].time, 0)
  }
  inst.reverbRange.frequency = 'frame'
  assert.throws(() => creative.parseCreativeSession(JSON.stringify(kit)))
})

test('LPF ranges are optional, accept reversed endpoints and validate both limits and frequency', () => {
  const kit = fixture(), instrument = kit.instruments['w:b1']
  delete instrument.lpfRange
  assert.equal(creative.parseCreativeSession(JSON.stringify(kit)).instruments['w:b1'].lpfRange, undefined)
  for (const frequency of [undefined, 'fixed', 'loop', 'section', 'note']) {
    instrument.lpfRange = { first: 20000, second: 20, ...(frequency ? { frequency } : {}) }
    assert.deepEqual(creative.parseCreativeSession(JSON.stringify(kit)).instruments['w:b1'].lpfRange, instrument.lpfRange)
  }
  for (const patch of [{ first: 19 }, { first: 20001 }, { second: 19 }, { second: 20001 }, { frequency: 'frame' }]) {
    instrument.lpfRange = { first: 400, second: 4000, ...patch }
    assert.throws(() => creative.parseCreativeSession(JSON.stringify(kit)))
  }
})

test('LPF reactions suspend only the target range and restore its deterministic draws on expiry', async () => {
  const api = await strudel(), kit = fixture(), id = 'w:b1'
  const { applyReactions, reactionsSchema } = loadTs('lib/music/reactions.ts')
  const base = creative.creativeSnapshot(kit, true)
  kit.instruments['b:b8'].lpfRange = { first: 6000, second: 12000, frequency: 'note' }
  const before = JSON.stringify(kit)
  const config = reactionsSchema.parse({ rules: [{ id: 'filter', trigger: 'capture', target: 'actor', enabled: true,
    duration: 1, actions: [{ type: 'lpf', value: 750 }] }] })
  const context = { ply: 1, states: [], events: [{ trigger: 'capture', color: 'w', ply: 1 }] }
  const active = applyReactions(base, config, context).snapshot
  assert.equal(active.instruments[id].lpfRange, undefined)
  assert.deepEqual(active.instruments['b:b8'].lpfRange, base.instruments['b:b8'].lpfRange)
  for (const range of ['driveRange', 'reverbRange', 'swingRange']) assert.deepEqual(active.instruments[id][range], base.instruments[id][range])
  const activeEvents = eventValues(compileVoice(api, voiceSpecs(active, null)[0]))
  assert.ok(activeEvents.length > 0 && activeEvents.every(event => event.cutoff === 750))
  assert.deepEqual(eventValues(exported(api, active)), activeEvents)
  const expired = applyReactions(base, config, { ...context, ply: 3 }).snapshot
  assert.deepEqual(expired.instruments[id].lpfRange, base.instruments[id].lpfRange)
  assert.deepEqual(eventValues(compileVoice(api, voiceSpecs(expired, null)[0])), eventValues(compileVoice(api, voiceSpecs(base, null)[0])))
  assert.equal(JSON.stringify(kit), before)
})

test('LPF previews respect the optional square cap and unfiltered previews retain the full range', async () => {
  const api = await strudel(), kit = fixture(), id = 'w:b1'
  const instrument = kit.instruments[id]
  instrument.lpf = 1000
  instrument.lpfRange = { first: 12000, second: 18000, frequency: 'note' }
  for (const mode of [undefined, 'manual']) {
    const preview = { id, square: 'b1', ...(mode ? { mode } : {}) }
    kit.mappings[id].previewFilter = false
    let snapshot = creative.creativeSnapshot(kit, true), voice = voiceSpecs(snapshot, preview)[0]
    assert.equal(voice.previewFilterLimit, undefined)
    const unfiltered = eventValues(compileVoice(api, voice), 0, 4)
    assert.ok(unfiltered.length > 0 && unfiltered.every(event => event.cutoff >= 12000 && event.cutoff <= 18000))
    assert.ok(new Set(unfiltered.map(event => event.cutoff)).size > 1)
    if (!mode) assert.deepEqual(eventValues(exported(api, snapshot, preview), 0, 4), unfiltered)
    assert.ok(compileVoice(api, voice).queryArc(0, 4).every(h => h.value.lpf === h.value.cutoff))
    kit.mappings[id].previewFilter = true
    snapshot = creative.creativeSnapshot(kit, true); voice = voiceSpecs(snapshot, preview)[0]
    assert.equal(voice.previewFilterLimit, 2600)
    const capped = eventValues(compileVoice(api, voice), 0, 4)
    assert.ok(capped.length > 0 && capped.every(event => event.cutoff === 2600))
    if (!mode) assert.deepEqual(eventValues(exported(api, snapshot, preview), 0, 4), capped)
    assert.ok(compileVoice(api, voice).queryArc(0, 4).every(h => h.value.lpf === 2600 && h.value.cutoff === 2600))
    const loop = voiceSpecs(snapshot, null)[0]
    assert.equal(loop.previewFilterLimit, undefined)
    assert.ok(eventValues(compileVoice(api, loop), 0, 4).every(event => event.cutoff >= 12000 && event.cutoff <= 18000))
  }
})

test('N swing preserves dense-note order and section frequencies work in continuous plans', async () => {
  const api = await strudel(), kit = fixture(), inst = kit.instruments['w:b1']
  inst.arrangement.restart = false; kit.arrangement.sections.forEach(section => { section.beats = 12 })
  inst.swingRange = { first: 0, second: .5, frequency: 'note' }; inst.reverbRange.frequency = 'section'
  inst.pianoRolls = [{ bars: 1, notes: Array.from({ length: 32 }, (_, i) => ({ start: i / 32, duration: 1 / 64, degree: i, velocity: .8 })) }]
  const snapshot = creative.creativeSnapshot(kit, true), pattern = compileVoice(api, voiceSpecs(snapshot, null)[0])
  const events = eventValues(pattern, 0, 1)
  assert.equal(events.length, 32)
  assert.deepEqual(events.map(event => event.note), [...events.map(event => event.note)].sort((a, b) => a - b))
  assert.equal(new Set(eventValues(pattern, 0, 3).map(event => event.room)).size, 1)
  assert.notEqual(eventValues(pattern, 0, 1)[0].room, eventValues(pattern, 3, 4)[0].room)
  assert.deepEqual(eventValues(exported(api, snapshot)), eventValues(pattern))
})

test('Drive, Reverb and Swing hold throughout a four-bar loop and change on section re-entry', async () => {
  const api = await strudel(), kit = fixture()
  const snapshot = creative.creativeSnapshot(kit, true)
  const voice = voiceSpecs(snapshot, null)[0]
  const actual = compileVoice(api, voice), code = exported(api, snapshot)
  const values = pattern => pattern.queryArc(0, 24).filter(hap => hap.hasOnset()).map(hap => ({
    time: Number(hap.whole.begin), note: hap.value.note, room: hap.value.room, distort: hap.value.distort, distortvol: hap.value.distortvol,
  })).sort((a, b) => a.time - b.time)
  assert.deepEqual(values(code), values(actual), 'range clocks and note timing match exported Strudel')
  const rooms = new Set(), drives = new Set(), swings = new Set(), cutoffs = new Set()
  for (let loop = 0; loop < 6; loop++) {
    const events = actual.queryArc(loop * 4, (loop + 1) * 4).filter(hap => hap.hasOnset())
    assert.equal(events.length, 32)
    assert.equal(new Set(events.map(hap => hap.value.room)).size, 1, 'one reverb value for the whole loop')
    assert.equal(new Set(events.map(hap => hap.value.distort)).size, 1, 'one drive value for the whole loop')
    assert.equal(new Set(events.map(hap => hap.value.cutoff)).size, 1, 'one LPF value for the whole loop')
    assert.ok(events.every(hap => hap.value.room >= .04 && hap.value.room <= .2))
    assert.ok(events.every(hap => hap.value.distort >= .5 && hap.value.distort <= 2))
    assert.ok(events.every(hap => hap.value.cutoff >= 400 && hap.value.cutoff <= 4000))
    rooms.add(events[0].value.room); drives.add(events[0].value.distort)
    cutoffs.add(events[0].value.cutoff)
    const offsets = events.filter((_, index) => index % 2 === 1).map(hap => Math.round((Number(hap.whole.begin) % .25) * 1e8))
    assert.equal(new Set(offsets).size, 1, 'the same swing offset applies to every offbeat')
    swings.add(offsets[0])
  }
  assert.ok(rooms.size > 1 && drives.size > 1 && swings.size > 1 && cutoffs.size > 1)
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(kit)), JSON.parse(JSON.stringify(kit)))
})

test('coincident endpoints are fixed, zero Drive keeps unity level and invalid ranges are rejected', async () => {
  const api = await strudel(), kit = fixture()
  Object.assign(kit.instruments['w:b1'], { driveRange: { first: 0, second: 0 }, reverbRange: { first: .1, second: .1 }, swingRange: { first: 0, second: 0 } })
  const snapshot = creative.creativeSnapshot(kit, true), voice = voiceSpecs(snapshot, null)[0]
  const events = compileVoice(api, voice).queryArc(0, 8).filter(hap => hap.hasOnset())
  assert.ok(events.every(hap => hap.value.distort === undefined && hap.value.distortvol === undefined && hap.value.room === .1), 'Drive zero bypasses the DSP node and its level')
  for (const [target, first] of [['driveRange', 10.1], ['reverbRange', 1.1], ['swingRange', .51], ['lpfRange', 19], ['lpfRange', 20001]]) {
    const invalid = fixture(); invalid.instruments['w:b1'][target].first = first
    assert.throws(() => creative.parseCreativeSession(JSON.stringify(invalid)))
  }
})

test('continuous plans and shared timelines use the selected loop duration and preserve export equivalence', async () => {
  const api = await strudel(), kit = fixture()
  const instrument = kit.instruments['w:b1']
  instrument.arrangement.restart = false
  kit.arrangement.sections[0].beats = 12
  kit.arrangement.sections[1].beats = 12
  const rooms = pattern => [0, 1, 2, 3, 4, 5, 6, 7, 8].map(bar => pattern.queryArc(bar, bar + .1)[0].value.room)
  let snapshot = creative.creativeSnapshot(kit, true), actual = compileVoice(api, voiceSpecs(snapshot, null)[0])
  let values = rooms(actual)
  assert.deepEqual(values.slice(0, 4), Array(4).fill(values[0]), 'continuous four-bar loops are not reset by three-bar section changes')
  assert.notEqual(values[0], values[4])
  assert.deepEqual(rooms(exported(api, snapshot)), values)
  instrument.pianoRolls.push({ bars: 2, notes: Array.from({ length: 16 }, (_, index) => ({ start: index / 8, duration: .0625, degree: 0, velocity: .8 })) })
  kit.arrangement.sections.forEach(section => { section.beats = 16 })
  instrument.arrangement.sections.b.variation = 1
  snapshot = creative.creativeSnapshot(kit, true); actual = compileVoice(api, voiceSpecs(snapshot, null)[0]); values = rooms(actual)
  assert.equal(values[4], values[5]); assert.equal(values[6], values[7]); assert.notEqual(values[4], values[6])
  assert.deepEqual(rooms(exported(api, snapshot)), values)
})

test('authored harmony changes roots by bar without changing percussion or manual pitch', async () => {
  const api = await strudel(), kit = fixture()
  kit.harmony = 'kit'; kit.arrangement.sections[0].harmony = [0, 3, 4, 0]
  const snapshot = creative.creativeSnapshot(kit, true), voice = voiceSpecs(snapshot, null)[0]
  const { degreeToMidi } = loadTs('lib/music/model.ts')
  const expected = kit.arrangement.sections[0].harmony.map(degree => degreeToMidi(degree, snapshot.scale, voice.instrument.octave))
  const pattern = compileVoice(api, voice)
  assert.deepEqual([0, 1, 2, 3].map(bar => pattern.queryArc(bar, bar + .1)[0].value.note), expected)
  const manual = voiceSpecs(snapshot, { id: 'w:b1', square: 'b1', mode: 'manual' })[0]
  assert.equal(compileVoice(api, manual).queryArc(0, .1)[0].value.note, expected[0])
  const pulseKit = fixture(); pulseKit.arrangement = structuredClone(kit.arrangement)
  pulseKit.instruments['w:b1'].source = { kind: 'sample', bank: 'chicken-percussion-v1', asset: 'kick', variant: 0, pitched: false }
  assert.ok(compileVoice(api, voiceSpecs(creative.creativeSnapshot(pulseKit, true), null)[0]).queryArc(0, 4).every(hap => hap.value.note === undefined))
})

test('sample maps encode sharp filenames while preserving real local file paths', () => {
  const { sampleRegistration, sampleUrl } = loadTs('lib/music/sample-banks.ts')
  const registration = sampleRegistration({ kind: 'sample', bank: 'chicken-band-v1', asset: 'tenor-sax', variant: 0, pitched: true })
  assert.ok(registration.files.some(file => file.includes('#')))
  assert.ok(JSON.stringify(registration.map).includes('%23'))
  assert.ok(Object.values(Object.values(registration.map)[0]).every(file => !file.includes('#')))
  assert.equal(sampleUrl('/samples/a#3 take?.wav'), '/samples/a%233%20take%3F.wav')
  assert.deepEqual(Object.keys(Object.values(registration.map)[0]), ['c4', 'e4', 'f#4', 'c5', 'e5', 'f#5'], 'sax maps use sounding concert pitch, not filename octaves')
  const bass = sampleRegistration({ kind: 'sample', bank: 'chicken-guitars-v1', asset: 'bass', variant: 0, pitched: true })
  assert.deepEqual(Object.keys(Object.values(bass.map)[0]), ['c1', 'e1', 'g1', 'c2'])
})

test('all 68 city presets retain their authored bank order and contrasting harmonic paths', () => {
  const { cities } = loadTs('lib/cities-data.ts'), { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  for (const city of cities) {
    const kit = defaultCityKit(city.id)
    if (['venice-1725','copenhagen-1869','paris-1913'].includes(city.id)) {
      assert.equal(kit.arrangement.sections.length, 12)
      assert.equal(kit.harmony, 'kit')
      assert.ok(kit.arrangement.sections.every(section => section.harmony?.length === 8))
      assert.ok(Object.values(kit.instruments).every(instrument => instrument.pianoRolls.length === 8))
      continue // Full chromatic phrases and compiled pitch paths covered by the concert tests.
    }
    if (['leipzig-1723','vienna','vienna-1825'].includes(city.id)) {
      const order = [0,1,6,2,3,4,2,5,6,7]
      assert.equal(kit.arrangement.sections.length, 10)
      for (const instrument of Object.values(kit.instruments)) {
        assert.equal(instrument.pianoRolls.length, 8)
        assert.deepEqual(kit.arrangement.sections.map((section,index)=>instrument.arrangement.sections[section.id].variation ?? order[index]),order)
      }
      continue
    }
    if (city.id === 'buenos-aires-1940') {
      // Tango 1913: Tema A returns as the reprise; rests stay silent; fills use bank 7.
      const order = [0, 1, 2, 3, 4, 5, 1, 6]
      assert.equal(kit.harmony, 'kit')
      assert.deepEqual(kit.arrangement.sections.map(section => section.harmony.length), [8, 8, 8, 8, 8, 8, 8, 4])
      for (const instrument of Object.values(kit.instruments)) {
        assert.deepEqual(kit.arrangement.sections.map((section, index) => instrument.arrangement.sections[section.id].variation ?? order[index]), order, instrument.name)
        assert.ok(Object.values(instrument.arrangement.sections).every(step => step.fill === undefined || step.fill === 7))
      }
      continue // Harmony, sound and the chan-chan are covered in kits.cases.cjs.
    }
    if (city.id === 'goa') {
      assert.equal(kit.arrangement.sections.length, 9)
      assert.ok(Object.values(kit.instruments).every(instrument => instrument.pianoRolls.length === 8))
      assert.deepEqual(kit.arrangement.sections.map(section => section.id), ['section-a', 'section-b', 'section-g', 'section-d', 'section-c', 'section-h', 'section-e', 'section-i', 'section-f'])
      continue // Three new scenes combine per-instrument banks, covered in kits.cases.cjs.
    }
    const expanded = ['nyc', 'ibiza', 'manchester', 'london', 'dusseldorf', 'chicago', 'tokyo', 'saopaulo', 'bristol'].includes(city.id)
    const order = expanded ? (['manchester', 'saopaulo'].includes(city.id) ? [0, 1, 6, 3, 2, 4, 7, 5] : [0, 1, 6, 3, 2, 7, 4, 5]) : [0, 1, 2, 3, 4, 5]
    for (const instrument of Object.values(kit.instruments)) {
      const banks = instrument.pianoRolls.length
      assert.equal(banks, order.length, `${city.id}/${instrument.name}: authored banks`)
      // A section with no variation is an authored rest; every other one plays its own scene.
      assert.deepEqual(kit.arrangement.sections.map((section, index) => instrument.arrangement.sections[section.id].variation ?? order[index]), order)
    }
    if (city.id !== 'manchester-1999') {
      assert.equal(kit.arrangement.sections.length, order.length)
      if (expanded) {
        assert.ok(kit.arrangement.sections.every(section => section.harmony?.length === 4))
        assert.ok(new Set(kit.arrangement.sections.map(section => section.harmony.join(','))).size > 1, `${city.id}: contrasting harmonic paths`)
        continue
      }
      // Electronic World kits voice their chords absolutely (static harmony), so they carry no section sequences.
      if (kit.harmony === 'static' && kit.arrangement.sections.every(section => !section.harmony)) continue
      assert.equal(kit.arrangement.sections[4].harmony.length, 4)
      assert.notDeepEqual(kit.arrangement.sections[4].harmony, kit.arrangement.sections[5].harmony, `${city.id}: contrasting E/F harmonic paths`)
    }
  }
})
