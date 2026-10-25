/* global __dirname */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTs, strudel, memoryStorage } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const { arrangementPosition } = loadTs('lib/music/arrangement.ts')
const fixtureDirectory = path.resolve(__dirname, '..')

test('sample registry points to small valid local WAV files with explicit tuning', () => {
  const { SAMPLE_BANKS, sampleRegistration } = loadTs('lib/music/sample-banks.ts')
  let total = 0
  for (const bank of SAMPLE_BANKS) {
    let bankBytes = 0
    for (const asset of bank.assets) for (const variant of asset.variants.keys()) {
    const registration = sampleRegistration({ kind: 'sample', bank: bank.id, asset: asset.id, variant, pitched: true })
    for (const sampleFile of registration.files) {
      // Each sample ships as Ogg Opus plus an AAC twin; a browser downloads one of them.
      assert.match(sampleFile, /\.ogg$/)
      const file = fs.readFileSync(path.resolve(fixtureDirectory, '../public', sampleFile.slice(1)))
      const twin = fs.readFileSync(path.resolve(fixtureDirectory, '../public', sampleFile.slice(1).replace(/\.ogg$/, '.m4a')))
      total += Math.max(file.length, twin.length)
      bankBytes += Math.max(file.length, twin.length)
      assert.equal(file.toString('ascii', 0, 4), 'OggS')
      assert.equal(file.toString('ascii', 28, 36), 'OpusHead')
      assert.equal(twin.toString('ascii', 4, 8), 'ftyp')
    }
    assert.ok(registration.map)
    }
    const budgets = { 'chicken-classical-v1': 1_500_000, 'chicken-band-v1': 500_000,
      'chicken-guitars-v1': 550_000, 'chicken-percussion-v1': 250_000 }
    const bankLimit = budgets[bank.id] ?? 200_000
    assert.ok(bankBytes < bankLimit, `${bank.id}: bank stays within its audio budget`)
  }
  assert.equal(SAMPLE_BANKS.length, 14)
  assert.ok(total < 15_000_000, 'recorded banks keep the lazy-loaded catalog below 15 MB')
  assert.equal(fs.readdirSync(path.resolve(fixtureDirectory, '../public/samples'), { recursive: true }).filter(file => String(file).endsWith('.wav')).length, 0, 'no WAV left in the catalog')
})

test('Classical campaigns use recorded multisamples, articulations and dedicated mix profiles', () => {
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const { sampleRegistration } = loadTs('lib/music/sample-banks.ts')
  const { CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
  for (const city of ['leipzig-1723', 'vienna-1825']) {
    const kit = defaultCityKit(city)
    assert.equal(kit.catalogRevision, CITY_STYLE_REVISIONS[city])
    assert.match(kit.catalogRevision, /midi/)
    const instruments = Object.values(kit.instruments)
    assert.ok(instruments.length >= 16)
    assert.ok(instruments.every(instrument => instrument.source?.bank === 'chicken-classical-v1'))
    assert.ok(new Set(instruments.map(instrument => instrument.source.asset)).size >= 7)
    assert.deepEqual(kit.arrangement.sections.map(section => instruments[0].arrangement.sections[section.id].variation), [0, 1, 2, 3, 4, 5])
  }
  const piano = sampleRegistration({ kind: 'sample', bank: 'chicken-classical-v1', asset: 'violin-sustain', variant: 0, pitched: true })
  const forte = sampleRegistration({ kind: 'sample', bank: 'chicken-classical-v1', asset: 'violin-sustain', variant: 1, pitched: true })
  assert.equal(piano.files.length, 5)
  assert.equal(forte.files.length, 5)
  assert.notDeepEqual(piano.files, forte.files, 'dynamic variants load distinct recorded layers')
  assert.equal(sampleRegistration({ kind: 'sample', bank: 'chicken-classical-v1', asset: 'violin-pizzicato', variant: 3, pitched: true }).files.length, 4)
})

test('Salvador 1992 assigns brass to knights and rooks over complementary surdos', () => {
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  const kit = defaultCityKit('salvador-1992')
  const city = cities.find(item => item.id === 'salvador-1992')
  assert.equal(kit.meter, '4/4')
  assert.deepEqual(city.campaigns, ['brazilian'])
  assert.match(city.image, /^https:\/\//)
  for (const id of ['w:b1', 'w:g1']) assert.equal(kit.instruments[id].source.asset, 'trompete')
  for (const id of ['w:a1', 'w:h1']) assert.equal(kit.instruments[id].source.asset, 'trombone')
  for (const instrument of Object.values(kit.instruments)) assert.equal(instrument.source.bank, 'chicken-samba-reggae-v2')
  const { sampleRegistration } = loadTs('lib/music/sample-banks.ts')
  assert.equal(sampleRegistration(kit.instruments['w:b1'].source).files.length, 3, 'trumpet uses three recorded notes')
  assert.equal(sampleRegistration(kit.instruments['w:a1'].source).files.length, 3, 'trombone uses three recorded notes')
  const onsets = id => kit.instruments[id].pianoRolls[0].notes.map(note => note.start)
  assert.deepEqual(onsets('w:a2'), [0, .5], 'fundo anchors the first and third beats')
  assert.deepEqual(onsets('w:b2'), [.25, .75], 'meio fills the second and fourth beats')
  assert.equal(kit.instruments['w:b1'].arrangement.sections[kit.arrangement.sections[0].id].variation, null)
  assert.notEqual(kit.instruments['w:b1'].arrangement.sections[kit.arrangement.sections[1].id].variation, null)
})

test('new timbre banks reach the intended city styles', () => {
  const { cities } = loadTs('lib/cities-data.ts')
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const recent = new Set(['chicken-strings-v1', 'chicken-keys-v1', 'chicken-synths-v1', 'chicken-drums-v1', 'chicken-samba-reggae-v2', 'chicken-classical-v1', 'chicken-band-v1', 'chicken-guitars-v1', 'chicken-percussion-v1', 'chicken-psytrance-v1'])
  for (const city of cities) {
    const sources = Object.values(defaultCityKit(city.id).instruments).map(instrument => instrument.source)
    assert.ok(sources.some(source => source?.kind === 'sample' && recent.has(source.bank)), `${city.id}: new timbre`)
  }
  const banksFor = city => new Set(Object.values(defaultCityKit(city).instruments).flatMap(instrument => instrument.source?.kind === 'sample' ? [instrument.source.bank] : []))
  assert.ok(banksFor('san-diego-1999').has('chicken-guitars-v1'))
  assert.ok(banksFor('london-1970').has('chicken-keys-v1'))
  assert.ok(banksFor('berkeley-2004').has('chicken-percussion-v1'))
  assert.ok(banksFor('tokyo').has('chicken-synths-v1'))
  const leadPalette = city => Object.values(defaultCityKit(city).instruments).filter(i => i.behavior === 'phrase').map(i => `${i.source.bank}/${i.source.asset}`)
  assert.notDeepEqual(leadPalette('san-diego-1999'), leadPalette('paris-1945'), 'rock and jazz retain different recorded melodic palettes')
})

test('Manchester 1999 has a curated six-section band with audible queens and gentle swung eighths', async () => {
  const api = await strudel()
  const { createManchesterJazzKit } = loadTs('lib/music/manchester-kit.ts')
  const kit = createManchesterJazzKit()
  const snapshot = creative.creativeSnapshot(kit, true)
  const voices = voiceSpecs({ ...snapshot, pieces: snapshot.pieces.map(p => ({ ...p, active: true })) }, null)
  assert.equal(kit.bpm, 123)
  assert.deepEqual([0, 4, 12, 16, 20, 24, 32].map(n => arrangementPosition(kit.arrangement,n).index), [0, 1, 2, 3, 4, 5, 0])
  const pcs = new Set([7, 9, 10, 0, 2, 4, 5])
  for (const voice of voices) for (const section of ['0', '1', '2', '3']) {
    const events = compileVoice(api, { ...voice, performance: undefined, sectionPattern: section }).queryArc(0, 4)
    assert.ok(events.length > 0 && events.length < 100, `${voice.key}/${section}: active voice produces a bounded loop`)
    for (const event of events) {
      assert.ok(event.value.gain > 0 && event.value.gain < 1)
      if (!voice.unpitched) assert.ok(pcs.has(Number(event.value.note) % 12), `${voice.key}: shared G Dorian`)
    }
  }
  const hat = voices.find(v => v.piece.id === 'w:c2')
  const onsets = [...new Set(compileVoice(api, { ...hat, performance: undefined, sectionPattern: '0' }).queryArc(0, 1).filter(h => h.hasOnset()).map(h => Number(h.whole.begin)))].sort((a, b) => a - b)
  assert.ok(Math.abs(onsets[1] - 5 / 36) < 1e-8, 'second eighth is delayed by the shared 5:4 weighting')
  assert.equal(onsets[2], .25, 'quarter-note pulse remains stable')
  assert.notDeepEqual(kit.instruments['w:b1'].pianoRolls, kit.instruments['w:g1'].pianoRolls, 'bass and reply are complementary')
})

test('Manchester 1999 keeps its main bass through sparse sections and reserves the reply for the full band', async () => {
  const api = await strudel()
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const kit = defaultCityKit('manchester-1999')
  const snapshot = creative.creativeSnapshot(kit, true)
  const voices = voiceSpecs(snapshot, null)
  const main = voices.find(voice => voice.piece.id === 'w:b1')
  const reply = voices.find(voice => voice.piece.id === 'w:g1')
  const count = (voice, from, to) => compileVoice(api, voice).queryArc(from, to).filter(event => event.hasOnset()).length
  assert.ok(count(main, 0, 4) > 0, 'the main bass supports section A')
  assert.ok(count(main, 10, 13) > 0, 'the main bass supports section C')
  assert.equal(count(reply, 0, 4), 0, 'the bass reply leaves space in section A')
  assert.ok(count(reply, 4, 10) > 0, 'the bass reply enters in section B')
  assert.equal(count(reply, 10, 13), 0, 'the bass reply leaves space in section C')
})

test('Düsseldorf and New Orleans leave their featured voices room in later sections', async () => {
  const api = await strudel()
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const voicesFor = cityId => voiceSpecs(creative.creativeSnapshot(defaultCityKit(cityId), true), null)
  const events = (voices, id, from, to) => compileVoice(api, voices.find(voice => voice.piece.id === id)).queryArc(from, to).filter(event => event.hasOnset()).length

  const dusseldorf = voicesFor('dusseldorf')
  assert.ok(events(dusseldorf, 'w:g1', 0, 4) > 0, 'the diode sequence introduces section A')
  assert.equal(events(dusseldorf, 'w:g1', 8, 10), 0, 'the diode sequence leaves section C')
  assert.ok(events(dusseldorf, 'w:d1', 8, 10) > 0, 'the flute carries section C')

  const newOrleans = voicesFor('new-orleans-1953')
  for (const id of ['w:e1', 'w:f1']) {
    assert.ok(events(newOrleans, id, 4, 10) > 0, `${id} answers in section B`)
    assert.equal(events(newOrleans, id, 14, 20), 0, `${id} leaves section D`)
  }
  assert.ok(events(newOrleans, 'w:g2', 14, 20) > 0, 'the trumpet takes the final section')
})

test('Goa 1994 ships an official psytrance kit with its own palette, articulations and reactions', () => {
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const { OFFICIAL_CITY_KITS } = loadTs('lib/music/official-kits.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  const goa = cities.find(city => city.id === 'goa')
  assert.deepEqual(goa.campaigns, ['electronic-history'])
  assert.ok(Object.hasOwn(OFFICIAL_CITY_KITS, 'goa'), 'the official kit replaces the profile default')
  const kit = defaultCityKit('goa')
  assert.equal(kit.bpm, 145)
  assert.equal(kit.root, 'E')
  assert.equal(kit.scale, 'Phrygian dominant')
  assert.equal(kit.catalogRevision, 'goa-2026-10-25-midi-v1')
  const white = kit.pieces.filter(piece => piece.color === 'w').map(piece => kit.instruments[piece.id])
  assert.ok(white.filter(instrument => instrument.source?.bank === 'chicken-psytrance-v1').length >= 15, 'psytrance bank carries the band')
  const byName = name => white.find(instrument => instrument.name === name)
  const roll = (name, bank) => byName(name).pianoRolls[bank].notes
  assert.ok(roll('Acid squelch', 3).some(note => note.slide !== undefined), '303 slides')
  assert.ok(roll('Palma psy', 5).some(note => note.ratchet === 2), 'clap roll into the peak')
  assert.deepEqual(roll('Arpejo FM', 1).slice(0, 6).map(note => note.velocity), [1, .58, .58, 1, .58, .58], 'three-against-four accents')
  assert.equal(roll('Riser de ruído', 0)[0].start + roll('Riser de ruído', 0)[0].duration, 8, 'riser lands on the boundary')
  assert.equal(byName('Baixo rolante').pianoRolls[0].notes.length, 12, 'kick-bass-bass-bass sixteenths')
  assert.equal(byName('Lead Hallucinogen').arrangement.sections['section-a'].variation, null, 'the queen lead waits for the verse')
  for (const trigger of ['opening', 'check', 'capture', 'quiet', 'endgame']) assert.ok(kit.reactions.overrides.includes(trigger), trigger)
  assert.equal(kit.reactions.rules.find(rule => rule.trigger === 'opening').actions[0].scale, 'Phrygian')
})

test('Phrygian dominant is a named scale with a parallel minor mode', () => {
  const { SCALE_INTERVALS, identifyPitchCollection, scaleForCreativeSession } = loadTs('lib/music/scales.ts')
  const { shiftScale } = loadTs('lib/music/scale-shift.ts')
  assert.deepEqual(SCALE_INTERVALS['Phrygian dominant'], [0, 1, 4, 5, 7, 8, 10])
  const notes = scaleForCreativeSession({ root: 'E', scale: 'Phrygian dominant' })
  assert.deepEqual(notes, ['E4', 'F4', 'G#4', 'A4', 'B4', 'C4', 'D4'])
  assert.equal(identifyPitchCollection(notes).scale, 'Phrygian dominant')
  assert.equal(identifyPitchCollection(shiftScale(notes, 'parallel').scale).scale, 'Phrygian')
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

test('city kit persistence round-trips sources, MIDI articulation and global/piece arrangements', () => {
  const cityKits = loadTs('lib/music/city-kits.ts')
  const lab = cityKits.defaultCityKit('dusseldorf')
  lab.instruments['w:e1'] = { ...lab.instruments['w:a2'] }
  Object.assign(lab.instruments['w:b1'].pianoRolls[0].notes[0], { pan: .2, slide: 3, slideSeconds: .4, velocity: .6 })
  const memory = new Map([['chickenchess:music:midi-v5', '1'], [cityKits.cityKitStorageKey('dusseldorf'), JSON.stringify(lab)]])
  const previous = globalThis.window
  globalThis.window = { localStorage: memoryStorage(memory) }
  try {
    const loaded = cityKits.loadCityKit('dusseldorf')
    assert.deepEqual(loaded, JSON.parse(JSON.stringify(lab)))
    assert.deepEqual(loaded.instruments['w:e1'].source, lab.instruments['w:a2'].source)
    assert.deepEqual(loaded.instruments['w:e1'].pianoRolls, lab.instruments['w:a2'].pianoRolls)
    assert.deepEqual(loaded.arrangement,lab.arrangement)
    assert.deepEqual(loaded.instruments['w:b1'].arrangement, lab.instruments['w:b1'].arrangement)
    memory.set(cityKits.cityKitStorageKey('dusseldorf'), 'invalid')
    assert.equal(cityKits.loadCityKit('dusseldorf').version, 7)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('kit library keeps one user kit per city and releases a moved kit previous city', () => {
  const { updateKitLibrary } = loadTs('lib/music/city-kits.ts')
  const first = { ...creative.createCreativeSession(), name: 'Primeiro', cityId: 'berlin' }
  const second = { ...creative.createCreativeSession(), name: 'Segundo', cityId: 'berlin' }
  const replaced = updateKitLibrary([first], second)
  assert.equal(replaced.kits.find(kit => kit.name === 'Primeiro').cityId, undefined)
  assert.equal(replaced.kits.find(kit => kit.name === 'Segundo').cityId, 'berlin')
  assert.deepEqual(replaced.releasedCityIds, [])
  const moved = updateKitLibrary(replaced.kits, { ...second, cityId: 'paris' })
  assert.equal(moved.kits.find(kit => kit.name === 'Segundo').cityId, 'paris')
  assert.deepEqual(moved.releasedCityIds, ['berlin'])
})

test('every city has a reproducible, distinct kit with roles independent of chess type', () => {
  const { cities } = loadTs('lib/cities-data.ts')
  const { defaultCityKit, EDITABLE_CITY_KITS } = loadTs('lib/music/city-kits.ts')
  const { createRandomCityKit } = loadTs('lib/music/random-kit.ts')
  const { REACTION_PRESET_REVISION } = loadTs('lib/music/reactions.ts')
  const { OFFICIAL_CITY_KITS } = loadTs('lib/music/official-kits.ts')
  assert.deepEqual(EDITABLE_CITY_KITS.map(c => c.id), cities.map(c => c.id))
  const fingerprints = new Set(), kingBehaviors = new Set()
  for (const city of cities) {
    const kit = defaultCityKit(city.id)
    assert.deepEqual(kit, defaultCityKit(city.id))
    assert.equal(kit.cityId, city.id)
    assert.equal(kit.reactionPresetRevision, REACTION_PRESET_REVISION)
    // Profile kits follow the global set; an official kit may own some triggers.
    if (!Object.hasOwn(OFFICIAL_CITY_KITS, city.id)) assert.deepEqual(kit.reactions, { overrides: [], rules: [] })
    assert.equal(kit.pieces.filter(p => p.active).length, 16)
    assert.ok(kit.pieces.filter(p => p.active).every(p => p.color === 'w'))
    assert.deepEqual(creative.parseCreativeSession(JSON.stringify(kit)), JSON.parse(JSON.stringify(kit)))
    fingerprints.add(JSON.stringify(kit.instruments))
    kingBehaviors.add(kit.instruments['w:e1'].behavior)
    for (const color of ['w', 'b']) {
      const instruments = kit.pieces.filter(p => p.color === color).map(p => kit.instruments[p.id])
      assert.equal(instruments.length,16)
      const pulseCount=instruments.filter(i=>i.behavior==='pulse').length
      assert.ok(pulseCount<16)
      assert.ok(instruments.some(i=>i.behavior==='phrase'))
      assert.ok(instruments.some(i=>i.behavior==='sustain'))
      assert.ok(instruments.every(i=>kit.arrangement.sections.every(section=>i.arrangement.sections[section.id])))
    }
    const variant = createRandomCityKit(city, 'test-variation')
    assert.notDeepEqual(kit.instruments, variant.instruments)
    assert.deepEqual(variant, createRandomCityKit(city, 'test-variation'))
    assert.equal(variant.version, 7)
    assert.equal(Object.hasOwn(variant, 'grooves'), false)
    for (const instrument of Object.values(variant.instruments)) {
      assert.ok(instrument.pianoRolls.length >= 1 && instrument.pianoRolls.length <= 8)
      assert.ok(instrument.pianoRolls.every(roll => roll && roll.notes.length <= 128))
      for (const field of ['notes', 'phrases', 'pianoOnly', 'mask', 'groove', 'automations','performance']) assert.equal(Object.hasOwn(instrument, field), false, `${city.id}: ${field}`)
    }
    assert.deepEqual(kit, defaultCityKit(city.id)) // reroll must not mutate the factory kit
  }
  assert.equal(fingerprints.size, cities.length)
  assert.ok(kingBehaviors.size > 1)
  assert.equal(defaultCityKit('unknown'), null)
})

test('curated arrangements vary density, timbre and harmonic direction by city', () => {
  const { cities, getCityById } = loadTs('lib/cities-data.ts')
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  assert.equal(cities.length, 61)
  assert.equal(new Set(cities.map(city => `${city.geoCoordinates.lat}:${city.geoCoordinates.lng}`)).size, 44)
  const jozi = getCityById('johannesburg')
  assert.equal(jozi.year, 1994)
  assert.match(jozi.genre, /Kwaito/)
  for (const city of cities) {
    const kit = defaultCityKit(city.id)
    const white = kit.pieces.filter(piece => piece.color === 'w')
    const instruments = white.map(piece => kit.instruments[piece.id])
    const density = kit.arrangement.sections.map(section => instruments.filter(instrument => instrument.arrangement.sections[section.id].variation !== null).length)
    const timbres = new Set(instruments.map(instrument => instrument.source?.kind === 'sample'
      ? `${instrument.source.bank}/${instrument.source.asset}/${instrument.source.variant}`
      : `synth/${instrument.sound}`))
    assert.ok(new Set(density).size > 1, `${city.id}: section density changes`)
    assert.ok(new Set(instruments.map(instrument => instrument.name)).size >= 10, `${city.id}: authored roles`)
    assert.ok(timbres.size >= 4, `${city.id}: timbral palette`)
    assert.notEqual(kit.harmony, 'static', `${city.id}: harmonic plan`)
  }
  const johannesburg = defaultCityKit('johannesburg')
  assert.equal(johannesburg.bpm, 108)
  assert.match(johannesburg.name, /Jozi/)
  assert.ok(Object.values(johannesburg.instruments).some(instrument => instrument.name.includes('Piano township')))
  assert.ok(Object.values(johannesburg.instruments).some(instrument => instrument.name.includes('Guitarra mbaqanga')))
})

test('every stage belongs to its intended campaign without sharing progression IDs', () => {
  const {cities}=loadTs('lib/cities-data.ts')
  const {CAMPAIGNS,citiesInCampaign}=loadTs('lib/campaigns.ts')
  assert.equal(new Set(cities.map(city=>city.id)).size,cities.length)
  assert.ok(cities.every(city=>city.campaigns.length>0))
  assert.deepEqual(CAMPAIGNS.map(c=>citiesInCampaign(cities,c.id).length),[13,6,3,14,9,4,12])
  assert.deepEqual(cities.find(city=>city.id==='manchester-1999').campaigns,['world-ballads'])
  assert.deepEqual(cities.find(city=>city.id==='vienna').campaigns,['classical'])
})

test('recent city stories name only the style and give a city-free poetic opening', () => {
  const { cities } = loadTs('lib/cities-data.ts')
  const ids = ['manchester-1999', 'johannesburg', 'buenos-aires-1940', 'dublin-1990', 'new-orleans-1953',
    'san-diego-1999', 'london-1970', 'berkeley-2004', 'new-york-1961', 'san-francisco-1993', 'paris-1945',
    'columbus-2013', 'new-york-1930', 'jacksonville-1974', 'chicago-1958', 'goa']
  for (const id of ids) {
    const city = cities.find(item => item.id === id)
    assert.ok(city, `${id}: stage exists`)
    assert.doesNotMatch(city.genre, /(?:3\/4|6\/8|12\/8|[IV]+[–-][IV]+)/, `${id}: title describes a style, not meter or chords`)
    assert.ok(city.description.length > 80, `${id}: description gives cultural context`)
    assert.ok(city.introPhrases.length >= 4, `${id}: at least three intro lines precede the entry button`)
    for (const phrase of city.introPhrases) {
      assert.ok(!phrase.toLowerCase().includes(city.name.toLowerCase()), `${id}: intro omits the city name`)
      assert.ok(!phrase.includes(String(city.year)), `${id}: intro omits the year`)
    }
  }
})

test('the new songs place their defining phrases inside each notated bar', () => {
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const onsets = (cityId, voiceName) => {
    const kit = defaultCityKit(cityId)
    const instrument = Object.values(kit.instruments).find(i => i.name === voiceName)
    assert.ok(instrument, `${cityId}: ${voiceName}`)
    assert.equal(instrument.pianoRolls[0].bars, 1)
    return [...new Set(instrument.pianoRolls[0].notes.map(note => Math.round(note.start * 12) / 12))]
  }
  assert.deepEqual(onsets('buenos-aires-1940', 'Acorde no dois'), [1 / 3])
  assert.deepEqual(onsets('buenos-aires-1940', 'Acorde no três'), [2 / 3])
  assert.deepEqual(onsets('dublin-1990', 'Flauta do cais'), [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6])
  assert.deepEqual(onsets('new-orleans-1953', 'Piano que rola'), [0, 1 / 4, 1 / 2, 3 / 4])
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
      // Random kits thin the band per section; a voice absent from a section is silent by design.
      const sectionId = kit.arrangement.sections[Number(section)]?.id
      if (sectionId && kit.instruments[voice.piece.id].arrangement.sections[sectionId]?.variation === null) continue
      const events = compileVoice(api, { ...voice, performance: undefined, sectionPattern: section }).queryArc(0, 4)
      const label = `${city.id}/${seed}/${voice.piece.id}/section${section}`
      assert.ok(events.length > 0 && events.length <= 128, `${label}: audible, bounded density (${events.length})`)
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
  const memory = new Map([['chickenchess:music:midi-v5', '1']]), previous = globalThis.window
  globalThis.window = { localStorage: memoryStorage(memory) }
  try {
    for (const city of cities) {
      const custom = { ...createRandomCityKit(city, 'saved-custom'), catalogRevision: defaultCityKit(city.id).catalogRevision }
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

test('blocked browser storage still loads bundled MIDI kits and retries the reset after recovery', () => {
  const { loadCityKit, defaultCityKit, resetLegacyMusicStorage } = loadTs('lib/music/city-kits.ts')
  const fallback = defaultCityKit('dusseldorf'), marker = 'chickenchess:music:midi-v5'
  const previous = globalThis.window
  try {
    for (const operation of ['localStorage', 'getItem', 'length', 'key', 'removeItem', 'setItem']) {
      const memory = new Map([['chickenchess:creative:v1', 'legacy']])
      const storage = memoryStorage(memory)
      let blockedCalls = 0
      const blocked = () => { blockedCalls++; throw new Error(`Blocked storage: ${operation}`) }
      globalThis.window = { localStorage: storage }
      if (operation === 'localStorage') Object.defineProperty(globalThis.window, 'localStorage', { get: blocked })
      else if (operation === 'length') Object.defineProperty(storage, 'length', { get: blocked })
      else storage[operation] = blocked
      assert.doesNotThrow(() => resetLegacyMusicStorage(), operation)
      assert.deepEqual(loadCityKit('dusseldorf'), fallback, operation)
      assert.ok(blockedCalls >= 2, `${operation}: direct reset and loading both reach the blocked operation`)
      assert.equal(memory.has(marker), false, `${operation}: failed reset remains retryable`)
      globalThis.window = { localStorage: memoryStorage(memory) }
      assert.doesNotThrow(() => resetLegacyMusicStorage(), `${operation}: storage recovered`)
      assert.equal(memory.has('chickenchess:creative:v1'), false)
      assert.equal(memory.get(marker), '1')
    }
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('curated collection has finite, bounded events across all banks and full forms',async()=>{
 const api=await strudel(),{cities}=loadTs('lib/cities-data.ts'),{defaultCityKit}=loadTs('lib/music/city-kits.ts')
 for(const city of cities){
  const kit=defaultCityKit(city.id),snapshot=creative.creativeSnapshot(kit,true)
  for(const voice of voiceSpecs({...snapshot,pieces:snapshot.pieces.map(p=>({...p,active:true}))},null)){
   for(let section=0;section<voice.pianoRolls.length;section++){
    const events=compileVoice(api,{...voice,performance:undefined,sectionPattern:String(section)}).queryArc(0,8)
    if(voice.pianoRolls[section].notes.length)assert.ok(events.length>0,`${city.id}/${voice.key}/${section} has music`)
    else assert.equal(events.length,0,`${city.id}/${voice.key}/${section}: authored empty MIDI stays silent`)
    for(const h of events){assert.ok(Number.isFinite(h.value.gain));if(!voice.unpitched)assert.ok(Number.isFinite(Number(h.value.note)))}
   }
   const pattern=compileVoice(api,voice),bars=voice.performance?voice.performance.steps.reduce((n,s)=>n+s.beats/4,0):16
   for(let cycle=0;cycle<bars;cycle++)assert.ok(pattern.queryArc(cycle,cycle+1).length<=128,`${city.id}/${voice.key}: density`)
  }
 }
})

test('catalog refresh replaces a stale v5 city slot directly and preserves unrelated edits',()=>{
 const {loadCityKit,defaultCityKit,KIT_LIBRARY_STORAGE,cityKitStorageKey}=loadTs('lib/music/city-kits.ts')
 const current=defaultCityKit('dusseldorf'),old={...current,catalogRevision:'old-midi-revision',name:'Old city'}
 const other={...defaultCityKit('paris'),name:'Paris pessoal'},loose={...creative.createCreativeSession(),name:'My loose MIDI'}
 const memory=new Map([['chickenchess:music:midi-v5','1'],[cityKitStorageKey('dusseldorf'),JSON.stringify(old)],[cityKitStorageKey('paris'),JSON.stringify(other)],[KIT_LIBRARY_STORAGE,JSON.stringify([loose])]]),previous=globalThis.window
 globalThis.window={localStorage:memoryStorage(memory)}
 try{
  assert.deepEqual(loadCityKit('dusseldorf'),current)
  assert.deepEqual(JSON.parse(memory.get(cityKitStorageKey('dusseldorf'))),JSON.parse(JSON.stringify(current)))
    assert.deepEqual(loadCityKit('paris'),JSON.parse(JSON.stringify(other)))
  assert.equal(memory.get(KIT_LIBRARY_STORAGE),JSON.stringify([loose]))
  assert.equal([...memory.keys()].some(key=>key.includes(':backup:')),false)
  current.name='Personal';memory.set(cityKitStorageKey('dusseldorf'),JSON.stringify(current));assert.equal(loadCityKit('dusseldorf').name,'Personal')
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous}
})

test('one-time MIDI reset removes only legacy music slots and preserves profile and v5 library', () => {
  const { resetLegacyMusicStorage, KIT_LIBRARY_STORAGE, CITY_KIT_STORAGE_PREFIX } = loadTs('lib/music/city-kits.ts')
  const profileKey = 'chikenchess_player', campaignKey = 'chikenchess_campaign'
  const profile = JSON.stringify({ name: 'Tester', eggs: 42, completedCityIds: ['berlin'] })
  const memory = new Map([
    ['chickenchess:creative:v1', '{broken legacy'],
    ['chickenchess:creative:v1:kits', '[]'],
    [`${CITY_KIT_STORAGE_PREFIX}manchester-1999`, 'old city'],
    [`${CITY_KIT_STORAGE_PREFIX}backup:old:dusseldorf`, 'old backup'],
    [creative.CREATIVE_STORAGE, 'new MIDI session'],
    [KIT_LIBRARY_STORAGE, 'new MIDI library'],
    [profileKey, profile],
    [campaignKey, 'legacy campaign progress'],
    ['unrelated:preference', 'keep'],
  ])
  const previous = globalThis.window
  globalThis.window = { localStorage: memoryStorage(memory) }
  try {
    resetLegacyMusicStorage()
    assert.equal(memory.has('chickenchess:creative:v1'), false)
    assert.equal(memory.has('chickenchess:creative:v1:kits'), false)
    assert.equal([...memory.keys()].some(key=>key.startsWith(CITY_KIT_STORAGE_PREFIX)), false)
    assert.equal(memory.get('chickenchess:music:midi-v5'), '1')
    assert.equal(memory.get(creative.CREATIVE_STORAGE), 'new MIDI session')
    assert.equal(memory.get(KIT_LIBRARY_STORAGE), 'new MIDI library')
    assert.equal(memory.get(profileKey), profile)
    assert.equal(memory.get(campaignKey), 'legacy campaign progress')
    assert.equal(memory.get('unrelated:preference'), 'keep')
    assert.equal(memory.size, 6)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('MIDI reset runs once and subsequent city saves survive repeated loads', () => {
  const { defaultCityKit, loadCityKit, resetLegacyMusicStorage, cityKitStorageKey } = loadTs('lib/music/city-kits.ts')
  const current = { ...defaultCityKit('manchester-1999'), name: 'My MIDI edit' }
  const memory = new Map([[cityKitStorageKey('manchester-1999'), 'text-era kit']])
  const previous = globalThis.window
  globalThis.window = { localStorage: memoryStorage(memory) }
  try {
    assert.deepEqual(loadCityKit('manchester-1999'), defaultCityKit('manchester-1999'))
    memory.set(cityKitStorageKey('manchester-1999'), JSON.stringify(current))
    const before = [...memory]
    resetLegacyMusicStorage()
    assert.deepEqual([...memory], before)
    assert.deepEqual(loadCityKit('manchester-1999'), JSON.parse(JSON.stringify(current)))
    assert.deepEqual(loadCityKit('manchester-1999'), JSON.parse(JSON.stringify(current)))
    assert.deepEqual([...memory], before)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
  delete globalThis.window
  try { assert.doesNotThrow(()=>resetLegacyMusicStorage()) }
  finally { if (previous !== undefined) globalThis.window=previous }
})
