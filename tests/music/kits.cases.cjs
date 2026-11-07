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
    const budgets = { 'chicken-classical-v1': 5_000_000, 'chicken-band-v1': 500_000,
      'chicken-guitars-v1': 550_000, 'chicken-percussion-v1': 250_000,
      // 46 drum-machine hits and 18 voices/stabs/effects for the Electronic World kits.
      'chicken-machines-v1': 400_000, 'chicken-electronic-v1': 350_000,
      // 24 synthesized Brazilian strings, accordion, voices and percussion.
      'chicken-brasil-v1': 260_000 }
    const bankLimit = budgets[bank.id] ?? 200_000
    assert.ok(bankBytes < bankLimit, `${bank.id}: bank stays within its audio budget`)
  }
  assert.equal(SAMPLE_BANKS.length, 18)
  assert.ok(total < 15_000_000, 'recorded banks keep the lazy-loaded catalog below 15 MB')
  assert.equal(fs.readdirSync(path.resolve(fixtureDirectory, '../public/samples'), { recursive: true }).filter(file => String(file).endsWith('.wav')).length, 0, 'no WAV left in the catalog')
})

test('Classical campaigns use recorded multisamples, articulations and dedicated mix profiles', () => {
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const { sampleRegistration } = loadTs('lib/music/sample-banks.ts')
  const { CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
  for (const city of ['leipzig-1723', 'vienna', 'vienna-1825']) {
    const kit = defaultCityKit(city)
    assert.equal(kit.catalogRevision, CITY_STYLE_REVISIONS[city])
    assert.match(kit.catalogRevision, /orchestra/)
    const instruments = Object.values(kit.instruments)
    assert.ok(instruments.length >= 16)
    assert.ok(instruments.every(instrument => instrument.source?.bank === 'chicken-classical-v1'))
    assert.ok(new Set(instruments.map(instrument => instrument.source.asset)).size >= 7)
    assert.equal(kit.arrangement.sections.length, 10)
    assert.ok(instruments.every(instrument => instrument.pianoRolls.length === 8))
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
  // The bloco's percussion and brass come from the samba-reggae bank; the coro, guitar and bass come from the Brazilian voices and band banks.
  for (const [id, instrument] of Object.entries(kit.instruments)) if (!['w:d1', 'w:e1', 'w:f1'].includes(id) && id.startsWith('w:')) assert.equal(instrument.source.bank, 'chicken-samba-reggae-v2', id)
  assert.equal(kit.instruments['w:d1'].source.bank, 'chicken-brasil-v1')
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
  const recent = new Set(['chicken-strings-v1', 'chicken-keys-v1', 'chicken-synths-v1', 'chicken-drums-v1', 'chicken-samba-reggae-v2', 'chicken-classical-v1', 'chicken-band-v1', 'chicken-guitars-v1', 'chicken-percussion-v1', 'chicken-psytrance-v1', 'chicken-machines-v1', 'chicken-electronic-v1'])
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

  // Düsseldorf: Intro 0–8, Verse 8–24, flute Solo 24–32, Hook 32–48 (bars).
  const dusseldorf = voicesFor('dusseldorf')
  assert.equal(events(dusseldorf, 'w:d1', 0, 8), 0, 'the guitar waits through the intro')
  assert.ok(events(dusseldorf, 'w:d1', 8, 24) > 0, 'the guitar sings the verse')
  assert.equal(events(dusseldorf, 'w:d1', 24, 32), 0, 'the guitar leaves the Solo to the flute')
  assert.ok(events(dusseldorf, 'w:d1', 32, 48) > 0, 'the guitar returns for the Hook')
  assert.equal(events(dusseldorf, 'w:c1', 8, 24), 0, 'the organ is kept for the Hook')
  assert.ok(events(dusseldorf, 'w:c1', 32, 48) > 0, 'the organ answers the Hook')

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
  assert.equal(kit.catalogRevision, 'goa-2026-11-06-design-v3')
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
  // Sound design: the bass and pad duck under the kick, the acid parts resonate, the FM arp echoes on its own bus.
  assert.equal(byName('Baixo rolante').duckSource, 'e2')
  assert.ok(byName('Acid squelch').resonance > 10 && byName('Acid squelch').filterEnv > 0, 'acid resonance and filter envelope')
  assert.equal(byName('Arpejo FM').delayTime, '3/16')
  assert.equal(byName('Pad do nascer do sol').lfoTarget, 'lpf')
  assert.equal(kit.reactions.rules.find(rule => rule.id === 'goa-tension').instruments, 'lead')
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
  const { STYLE_PROFILES } = loadTs('lib/music/styled-kits.ts')
  assert.deepEqual(EDITABLE_CITY_KITS.map(c => c.id), cities.map(c => c.id))
  const fingerprints = new Set(), kingBehaviors = new Set()
  for (const city of cities) {
    const kit = defaultCityKit(city.id)
    assert.deepEqual(kit, defaultCityKit(city.id))
    assert.equal(kit.cityId, city.id)
    assert.equal(kit.reactionPresetRevision, REACTION_PRESET_REVISION)
    // Profile kits follow the global set unless their profile authors reactions; an official kit may own some triggers.
    const authored = STYLE_PROFILES[city.id]?.reactions
    if (authored) assert.deepEqual(kit.reactions, authored)
    else if (!Object.hasOwn(OFFICIAL_CITY_KITS, city.id)) assert.deepEqual(kit.reactions, { overrides: [], rules: [] })
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
      assert.ok(instruments.some(instrument => instrument.behavior === 'sustain' || instrument.pianoRolls.some(roll => roll.notes.some(note => note.duration >= .5))), 'sustained texture or authored long orchestral notes')
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
  assert.equal(cities.length, 68)
  assert.equal(new Set(cities.map(city => `${city.geoCoordinates.lat}:${city.geoCoordinates.lng}`)).size, 49)
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
    // Electronic World and Brazilian kits voice every chord absolutely; the rest follow a harmonic plan.
    if (!city.campaigns.includes('electronic-history') && !city.campaigns.includes('brazilian')) assert.notEqual(kit.harmony, 'static', `${city.id}: harmonic plan`)
  }
  const johannesburg = defaultCityKit('johannesburg')
  assert.equal(johannesburg.bpm, 108)
  assert.match(johannesburg.name, /kwaito/)
  assert.ok(Object.values(johannesburg.instruments).some(instrument => instrument.name.includes('Piano township')))
  assert.ok(Object.values(johannesburg.instruments).some(instrument => instrument.name.includes('Voz de chamada')))
})

test('every stage belongs to its intended campaign without sharing progression IDs', () => {
  const {cities}=loadTs('lib/cities-data.ts')
  const {CAMPAIGNS,citiesInCampaign}=loadTs('lib/campaigns.ts')
  assert.equal(new Set(cities.map(city=>city.id)).size,cities.length)
  assert.ok(cities.every(city=>city.campaigns.length>0))
  assert.deepEqual(CAMPAIGNS.map(c=>citiesInCampaign(cities,c.id).length),[16,6,6,14,10,4,12])
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
      // A random play chance can drop every hit of a one-note bar for four bars; audibility is about the written notes.
      const events = compileVoice(api, { ...voice, instrument: { ...voice.instrument, playChance: undefined }, performance: undefined, sectionPattern: section }).queryArc(0, 4)
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

test('legacy Electronic and Brazilian kits stay loadable in Creative without a city', () => {
  const legacy = require('../../data/music/legacy-kits.json')
  const { cities } = loadTs('lib/cities-data.ts')
  assert.deepEqual(legacy.map(entry => entry.id), ['dusseldorf', 'nyc', 'chicago', 'detroit', 'ibiza', 'manchester', 'berlin', 'tokyo', 'london', 'saopaulo', 'johannesburg', 'paris',
    'rio-1910', 'rio-1930', 'recife-1935', 'piracicaba-1940', 'recife-1950', 'rio-1960', 'recife-1975', 'salvador-1992', 'rio-1995'])
  for (const entry of legacy) {
    const raw = fs.readFileSync(path.resolve(fixtureDirectory, '../public/presets/legacy', `${entry.id}.json`), 'utf8')
    const kit = creative.parseCreativeSession(raw)
    assert.ok(kit, `${entry.id}: parses as a Creative session`)
    assert.equal(kit.cityId, undefined, `${entry.id}: not tied to a city`)
    assert.match(kit.name, / · legacy$/)
    assert.equal(kit.name, entry.name)
    assert.ok(cities.some(city => city.name === entry.city), `${entry.id}: names its historical city`)
  }
})

test('Electronic World profiles validate, author their reactions and use the machine and electronic banks', () => {
  const { styleProfileSchema } = loadTs('lib/admin/validation.ts')
  const { STYLE_PROFILES, CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  const electronic = cities.filter(city => city.campaigns.includes('electronic-history') && city.id !== 'goa').map(city => city.id)
  assert.equal(electronic.length, 15)
  for (const id of ['bristol', 'croydon', 'durban']) assert.ok(electronic.includes(id), `${id}: new stage`)
  const banks = new Set()
  for (const id of electronic) {
    const profile = styleProfileSchema.parse(STYLE_PROFILES[id])
    const revision = ['nyc', 'ibiza', 'manchester', 'london'].includes(id) ? '2026-11-06-electronic-v4' : ['dusseldorf', 'chicago', 'tokyo', 'saopaulo', 'bristol'].includes(id) ? '2026-11-06-electronic-v3' : '2026-10-25-electronic-v2'
    assert.equal(CITY_STYLE_REVISIONS[id], `${id}-${revision}`)
    assert.equal(profile.parts.length, 16)
    assert.ok(profile.reactions.rules.length >= 10, `${id}: kit reactions`)
    assert.ok(profile.reactions.rules.every(rule => profile.reactions.overrides.includes(rule.trigger)), `${id}: rules own their triggers`)
    assert.match(profile.reference, /originais|original/)
    const kit = defaultCityKit(id)
    assert.equal(kit.name, profile.name)
    for (const instrument of Object.values(kit.instruments)) if (instrument.source?.kind === 'sample') banks.add(instrument.source.bank)
  }
  assert.ok(banks.has('chicken-machines-v1') && banks.has('chicken-electronic-v1'))
  // The Krautrock queen carries a recorded guitar; Paris pumps its loop from the kick.
  assert.equal(defaultCityKit('dusseldorf').instruments['w:d1'].source.asset, 'clean')
  assert.ok(Object.values(defaultCityKit('paris').instruments).filter(instrument => instrument.duckSource === 'e2').length >= 4)
})

test('four revised electronic forms expose harmony without double-transposing bass and contrast their new sections', async () => {
  const api = await strudel()
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const cases = {
    nyc: { labels: ['Pre-Chorus', 'Bridge'], roots: [[-5, -4, -3, -4], [-3, -5, -1, -4]], pitches: [[36, 38, 40, 38], [40, 36, 43, 38]] },
    ibiza: { labels: ['Hook', 'Bridge'], roots: [[-4, -3, -2, -3], [-2, -2, -4, -3]], pitches: [[31, 33, 35, 33], [35, 35, 31, 33]] },
    manchester: { labels: ['Bridge', 'Turnaround'], roots: [[-2, -2, -1, -1], [-2, -1, 0, 0]], pitches: [[39, 39, 41, 41], [27, 29, 31, 31]] },
    london: { labels: ['Hook', 'Bridge'], roots: [[0, -2, -1, 0], [-2, -2, -1, -1]], pitches: [[26, 22, 24, 26], [22, 22, 24, 24]] },
  }
  for (const [id, expected] of Object.entries(cases)) {
    const kit = defaultCityKit(id)
    assert.equal(kit.harmony, 'kit', id)
    assert.equal(kit.arrangement.sections.length, 8, id)
    assert.ok(kit.arrangement.sections.every(section => section.harmony?.length === 4), id)
    assert.ok(Object.values(kit.instruments).every(instrument => instrument.pianoRolls.length === 8), id)
    const voices = voiceSpecs(creative.creativeSnapshot(kit, true), null)
    const bass = compileVoice(api, voices.find(voice => voice.piece.id === 'w:d2'))
    let start = 0
    const newSections = []
    for (const section of kit.arrangement.sections) {
      const bank = kit.instruments['w:d2'].arrangement.sections[section.id].variation
      if (bank >= 6) {
        const index = bank - 6
        assert.equal(section.label, expected.labels[index], id)
        assert.deepEqual(section.harmony, expected.roots[index], id)
        const pitches = Array.from({ length: 4 }, (_, bar) => {
          const onset = bass.queryArc(start + bar, start + bar + 1).find(event => event.hasOnset())
          return Number(onset?.value.note)
        })
        assert.deepEqual(pitches, expected.pitches[index], `${id}: sounding bass roots in bank ${bank}`)
        const attacks = voices.reduce((sum, voice) => sum + compileVoice(api, voice).queryArc(start, start + 4).filter(event => event.hasOnset()).length, 0)
        newSections[index] = attacks
      }
      start += section.beats / 4
    }
    assert.ok(Math.max(...newSections) > Math.min(...newSections) * 1.4, `${id}: audible density contrast`)
    if (id === 'manchester') {
      const bridge = kit.arrangement.sections.find(section => section.label === 'Bridge')
      assert.equal(kit.instruments['w:d1'].arrangement.sections[bridge.id].variation, null, 'bridge rests the 303')
    }
  }
})

test('Brazilian profiles validate, author their reactions and use the Brazilian bank', () => {
  const { styleProfileSchema } = loadTs('lib/admin/validation.ts')
  const { STYLE_PROFILES, CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  const brazilian = cities.filter(city => city.campaigns.includes('brazilian')).map(city => city.id)
  assert.equal(brazilian.length, 10)
  assert.ok(brazilian.includes('rio-1984'), 'the Mangueira rehearsal is a stage')
  const banks = new Set()
  for (const id of brazilian) {
    const profile = styleProfileSchema.parse(STYLE_PROFILES[id])
    assert.match(CITY_STYLE_REVISIONS[id], new RegExp(`^${id}-2026-10-2[56]-brazilian-v\\d$`))
    assert.equal(profile.parts.length, 16)
    assert.ok(profile.reactions.rules.length >= 10, `${id}: kit reactions`)
    assert.ok(profile.reactions.rules.every(rule => profile.reactions.overrides.includes(rule.trigger)), `${id}: rules own their triggers`)
    const kit = defaultCityKit(id)
    assert.equal(kit.name, profile.name)
    for (const instrument of Object.values(kit.instruments)) if (instrument.source?.kind === 'sample') banks.add(instrument.source.bank)
  }
  assert.ok(banks.has('chicken-brasil-v1'))
  // The Mangueira rehearsal is a bateria: every piece is percussion.
  const mangueira = defaultCityKit('rio-1984')
  assert.equal(mangueira.meter, '2/4')
  // Recorded bateria: the surdo de primeira on the rook, repique de chamada on the queen, no synthesized voice.
  assert.equal(mangueira.instruments['w:a1'].source.bank, 'chicken-bateria-v1')
  assert.equal(mangueira.instruments['w:d1'].source.asset, 'repinique')
  assert.ok(Object.values(mangueira.instruments).every(instrument => instrument.source?.asset !== 'coro-laia'))
  assert.match(cities.find(city => city.id === 'rio-1984').image, /Mangueira/)
})

test('authored kits never pin a variation for a whole game phase', () => {
  const { STYLE_PROFILES } = loadTs('lib/music/styled-kits.ts')
  // States last for many moves; forcing a variation there freezes the song on one tab (the silent-intro bug).
  const lasting = new Set(['opening', 'middle', 'captureDrought', 'tension', 'advantage', 'oppositeCastling'])
  for (const [id, profile] of Object.entries(STYLE_PROFILES)) for (const rule of profile.reactions?.rules ?? [])
    if (lasting.has(rule.trigger)) assert.ok(!rule.actions.some(action => action.type === 'variation'), `${id}/${rule.id}`)
})

test('Creative lists every default kit once, grouped by campaign and labelled "year City - style"', () => {
  const { DEFAULT_KIT_GROUPS } = loadTs('lib/music/city-kits.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  const { CAMPAIGNS } = loadTs('lib/campaigns.ts')
  assert.deepEqual(DEFAULT_KIT_GROUPS.map(group => group.id), CAMPAIGNS.map(campaign => campaign.id))
  const ids = DEFAULT_KIT_GROUPS.flatMap(group => group.kits.map(kit => kit.id))
  assert.deepEqual([...ids].sort(), cities.map(city => city.id).sort())
  for (const group of DEFAULT_KIT_GROUPS) for (const kit of group.kits) {
    const city = cities.find(item => item.id === kit.id)
    assert.ok(city.campaigns.includes(group.id), kit.id)
    assert.equal(kit.label, `${city.year} ${city.name} - ${city.genre}`)
  }
  const chicago = DEFAULT_KIT_GROUPS.find(group => group.id === 'electronic-history').kits.find(kit => kit.id === 'chicago')
  assert.equal(chicago.label, '1984 Chicago - Classic House')
})

test('second electronic revision adds authored contrasts and exposes the requested style names', async () => {
  const api = await strudel()
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  const expected = {
    dusseldorf: ['Krautrock', ['Solo', 'Bridge']], chicago: ['Classic House', ['Pre-Chorus', 'Bridge']],
    tokyo: ['Minimal', ['Turnaround', 'Bridge']], saopaulo: ['Hard Techno', ['Bridge', 'Turnaround']],
    bristol: ['Trip-hop', ['Pre-Chorus', 'Bridge']], goa: ['Psytrance', ['Hook', 'Bridge', 'Turnaround']],
  }
  for (const [id, [genre, labels]] of Object.entries(expected)) {
    const kit = defaultCityKit(id)
    assert.equal(cities.find(city => city.id === id).genre.toLowerCase(), genre.toLowerCase(), id)
    assert.equal(kit.arrangement.sections.length, id === 'goa' ? 9 : 8, id)
    assert.equal(kit.harmony, 'kit', id)
    assert.ok(kit.arrangement.sections.every(section => section.harmony?.length > 0), id)
    const voices = voiceSpecs(creative.creativeSnapshot(kit, true), null).map(voice => compileVoice(api, voice))
    let begin = 0
    const attacks = new Map()
    for (const section of kit.arrangement.sections) {
      if (labels.includes(section.label)) {
        const events = voices.flatMap(pattern => pattern.queryArc(begin, begin + 4).filter(event => event.hasOnset()))
        assert.ok(events.length > 0, `${id}/${section.label}: sounding scene`)
        attacks.set(section.label, events.length)
      }
      begin += section.beats / 4
    }
    assert.equal(attacks.size, labels.length, id)
    assert.ok(Math.max(...attacks.values()) > Math.min(...attacks.values()) * 1.3, `${id}: rhythmic contrast`)
  }
})

test('Minimal layers soft displaced cells and the requested cymbals leave gaps', async () => {
  const api = await strudel()
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const tokyo = defaultCityKit('tokyo')
  const patterns = voiceSpecs(creative.creativeSnapshot(tokyo, true), null).map(voice => compileVoice(api, voice))
  const count = start => patterns.reduce((sum, pattern) => sum + pattern.queryArc(start, start + 4).filter(event => event.hasOnset()).length, 0)
  assert.ok(count(0) < count(8), 'the intro adds layers on entering the verse')
  assert.ok(count(8) < count(28), 'the hook fills out the verse, without continuous sixteenths')
  assert.ok(tokyo.instruments['w:a1'].gain <= .15 && tokyo.instruments['w:a1'].lpf <= 4500)
  const ping = tokyo.instruments['w:b1'].pianoRolls[1]
  const starts = ping.notes.map(note => note.start)
  assert.equal(starts[1] - starts[0], 5 / 16, 'five-step cell crosses conventional beat accents')
  const kick = tokyo.instruments['w:e2'].pianoRolls[1]
  assert.ok(new Set(kick.notes.map(note => Math.floor(note.start))).size === 4)
  assert.ok(kick.notes.some(note => note.start * 4 % 1 !== 0), 'kick includes displaced attacks')
  const sp = defaultCityKit('saopaulo').instruments['w:a2']
  assert.ok(sp.gain <= .12 && sp.lpf <= 7000 && sp.clip <= .4, 'ride is softer and shorter')
  assert.equal(sp.pianoRolls[1].bars, 4)
  assert.ok(sp.pianoRolls[1].notes.length < 16, 'ride leaves space across four bars')
  assert.notDeepEqual(sp.pianoRolls[3].notes, sp.pianoRolls[5].notes, 'ride peak varies')
  const bristol = defaultCityKit('bristol')
  const hat = bristol.instruments['w:a2'], theremin = bristol.instruments['w:d1']
  assert.ok(hat.gain <= .16 && hat.lpf <= 5000 && hat.clip <= .35)
  assert.equal(hat.pianoRolls[1].bars, 4)
  assert.ok(hat.pianoRolls[1].notes.length < 24, 'dusty hat leaves breathing room')
  assert.equal(theremin.sound, 'sine'); assert.equal(theremin.vibrato, 6); assert.equal(theremin.vibratoDepth, .25)
  assert.equal(theremin.gain, .2); assert.equal(theremin.lpf, 5000)
})

test('Psytrance preserves the six approved MIDI banks and composes three contrasting new scenes', async () => {
  const { createHash } = require('node:crypto')
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const kit = defaultCityKit('goa')
  const original = Object.keys(kit.instruments).sort().map(id => [id, kit.instruments[id].pianoRolls.slice(0, 6)])
  assert.equal(createHash('sha256').update(JSON.stringify(original)).digest('hex'), '68dc3bfc903b42cf2069acea3fdd9995633e75b90d0d8f4b0722fbeb64f00236', 'all original notes, articulations and roll lengths retained')
  assert.deepEqual(kit.arrangement.sections.find(section => section.id === 'section-h').harmony, [1, 1, 0, 0])
  const kick = kit.instruments['w:e2'], bass = kit.instruments['w:d2'], lead = kit.instruments['w:d1']
  assert.equal(kick.arrangement.sections['section-h'].variation, null, 'Bridge rests the kick')
  assert.equal(lead.arrangement.sections['section-i'].variation, null, 'Turnaround reserves space for the acid pickup')
  assert.equal(bass.arrangement.sections['section-g'].variation, 7)
  assert.equal(kick.arrangement.sections['section-i'].variation, 6)
  assert.ok(kick.pianoRolls[6].notes.every(note => note.start < 3.75), 'Turnaround leaves the last beat empty')
  assert.notDeepEqual(kick.pianoRolls[6].notes, kick.pianoRolls[7].notes, 'Hook and Turnaround have separate kick phrases')
})


test('Classical reconstruction uses string pawns, acoustic wind desks and complete expressive periods', async () => {
  const api = await strudel()
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  assert.equal(cities.find(city => city.id === 'vienna').genre, 'Viennese Sinfonietta')
  for (const id of ['leipzig-1723','vienna','vienna-1825']) {
    const kit = defaultCityKit(id)
    const pawns = kit.pieces.filter(piece => piece.color === 'w' && piece.type === 'p')
    assert.equal(pawns.length, 8)
    assert.ok(pawns.every(piece => /violin|viola|cello|bass$/.test(kit.instruments[piece.id].source.asset)), id)
    const back = kit.pieces.filter(piece => piece.color === 'w' && piece.type !== 'p').map(piece => kit.instruments[piece.id])
    assert.ok(back.every(instrument => !/violin|viola|cello/.test(instrument.source.asset)), id)
    assert.ok(back.some(instrument => instrument.source.asset === 'orchestra-oboe'), id)
    assert.equal(kit.harmony, 'kit')
    assert.ok(kit.arrangement.sections.every(section => section.harmony.length === 8))
    const violin = kit.instruments['w:a2']
    assert.equal(violin.pianoRolls[1].bars, 16)
    assert.ok(violin.pianoRolls[1].notes.some(note => note.start >= 15), 'period reaches its cadence')
    assert.ok(new Set(violin.pianoRolls[1].notes.map(note => note.velocity)).size > 12, 'phrase dynamics')
    const first = violin.pianoRolls[1].notes.filter(note => note.start < 8).map(note => note.degree)
    const answer = violin.pianoRolls[1].notes.filter(note => note.start >= 8).map(note => note.degree)
    assert.notDeepEqual(first, answer, 'second eight bars develop the sentence')
    assert.ok(Object.values(violin.arrangement.sections).some(section => section.transpose > 0), 'secondary tonal region')
    const voices = voiceSpecs(creative.creativeSnapshot(kit,true),null)
    const pulseCount = section => {
      const start = kit.arrangement.sections.slice(0,section).reduce((sum,item)=>sum+item.beats,0) / (id === 'leipzig-1723' ? 3 : id === 'vienna' ? 4 : 2)
      return voices.reduce((sum,voice)=>sum+compileVoice(api,voice).queryArc(start,start+4).filter(event=>event.hasOnset()).length,0)
    }
    assert.ok(pulseCount(4)>pulseCount(0), 'tutti contrasts the introduction')
    assert.ok(back.some(instrument => Object.values(instrument.arrangement.sections).some(section => section.variation === null)), 'wind breathing and rests')
    assert.equal(kit.bpm, id === 'leipzig-1723' ? 76 : id === 'vienna' ? 112 : 88)
  }
})

test('three new Classical chapters preserve independent roles, chromatic form and acoustic bass/percussion', () => {
  const {defaultCityKit}=loadTs('lib/music/city-kits.ts')
  const {sampleRegistration}=loadTs('lib/music/sample-banks.ts')
  const {TRIGGERS}=loadTs('lib/music/reactions.ts')
  for(const id of ['venice-1725','copenhagen-1869','paris-1913']) {
    const kit=defaultCityKit(id),parts=kit.pieces.filter(p=>p.color==='w').map(p=>kit.instruments[p.id])
    assert.equal(kit.arrangement.sections.length,12)
    assert.equal(kit.scale,'Chromatic')
    assert.equal(kit.harmony,'kit')
    assert.ok(kit.arrangement.sections.every(s=>s.harmony?.length===8))
    assert.ok(new Set(kit.arrangement.sections.map(s=>s.harmony.join(','))).size>=7)
    assert.ok(parts.every(p=>p.source.bank==='chicken-classical-v1'&&p.pianoRolls.length===8))
    assert.ok(parts.filter(p=>p.source.asset.includes('bass')).length>=2, 'arco and pizzicato foundations')
    assert.ok(parts.some(p=>p.source.asset==='orchestra-bass'&&p.gain>=.8))
    assert.ok(new Set(parts.map(p=>p.source.asset)).size>=9, 'independent orchestral colors')
    const density=kit.arrangement.sections.map(s=>parts.filter(p=>p.arrangement.sections[s.id].variation!==null).length)
    assert.ok(Math.max(...density)-Math.min(...density)>=5, 'solo and tutti contrast')
    assert.deepEqual(kit.reactions.overrides,Object.keys(TRIGGERS))
    assert.ok(kit.reactions.rules.every(r=>r.actions.every(a=>a.type==='gain')), 'game dynamics preserve authored chromatic phrases')
    assert.ok(JSON.stringify(kit).length<2_000_000,'portable import size')
    assert.deepEqual(creative.parseCreativeSession(JSON.stringify(kit)),JSON.parse(JSON.stringify(kit)))
  }
  const piano=defaultCityKit('copenhagen-1869')
  assert.equal(piano.instruments['w:d1'].source.asset,'concert-piano')
  assert.equal(piano.instruments['w:e1'].source.asset,'concert-piano')
  assert.notDeepEqual(piano.instruments['w:d1'].pianoRolls,piano.instruments['w:e1'].pianoRolls)
  assert.ok(piano.instruments['w:d1'].pianoRolls[5].notes.some(n=>Math.abs(n.start*16-Math.round(n.start*16))>.1),'written cadenza timing')
  const registration=sampleRegistration(piano.instruments['w:d1'].source)
  assert.equal(registration.files.length,9)
  assert.deepEqual(Object.keys(Object.values(registration.map)[0]),['c1','f#1','c2','f#2','c3','f#3','c4','f#4','c5'],'piano sounding octave')
  const ballet=defaultCityKit('paris-1913')
  assert.equal(ballet.meter,'7/8')
  for(const asset of ['concert-bass-drum','concert-snare','concert-cymbal','concert-tam-tam','timpani-low']) {
    const part=Object.values(ballet.instruments).find(p=>p.source.asset===asset)
    assert.equal(part.source.pitched,false)
    assert.ok(Object.values(part.arrangement.sections).some(s=>s.variation===null),'percussion leaves lyrical spaces')
  }
})

test('concert compilation resolves real secondary keys and passes the melodic sentence between desks', async () => {
  const api=await strudel(),{defaultCityKit}=loadTs('lib/music/city-kits.ts')
  const kit=defaultCityKit('copenhagen-1869'),voices=voiceSpecs(creative.creativeSnapshot(kit,true),null)
  const piano=compileVoice(api,voices.find(v=>v.piece.id==='w:d1'))
  const strings=compileVoice(api,voices.find(v=>v.piece.id==='w:a2'))
  const onsets=(p,start,end)=>p.queryArc(start,end).filter(h=>h.hasOnset())
  const notes=(p,start,end)=>onsets(p,start,end).map(h=>h.value.note)
  assert.ok(onsets(piano,8,10).length>0)
  assert.equal(onsets(strings,8,10).length,0,'piano asks')
  assert.equal(onsets(piano,10,12).length,0)
  assert.ok(onsets(strings,10,12).length>0,'strings answer')
  assert.deepEqual(notes(piano,48,49),[77,73],'D-flat sanctuary: F5 and D-flat5, not scale-quantized notes')
  const coda=kit.arrangement.sections.slice(0,11).reduce((n,s)=>n+s.beats,0)/4
  assert.ok(notes(piano,coda+4,coda+5).some(n=>n%12===1),'A-major coda contains C-sharp')
  const bass=voices.find(v=>v.piece.id==='w:a1'),low=notes(compileVoice(api,bass),8,16)
  assert.ok(Math.min(...low)<=36&&Math.max(...low)<49,'audible double-bass register')
})
