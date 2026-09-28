/* global __dirname */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTs, strudel } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const fixtureDirectory = path.resolve(__dirname, '..')

test('sample registry points to small valid local WAV files with explicit tuning', () => {
  const { SAMPLE_BANKS, sampleRegistration } = loadTs('lib/music/sample-banks.ts')
  let total = 0
  for (const bank of SAMPLE_BANKS) {
    let bankBytes = 0
    for (const asset of bank.assets) for (const [variant, data] of asset.variants.entries()) {
    const registration = sampleRegistration({ kind: 'sample', bank: bank.id, asset: asset.id, variant, pitched: true })
    for (const sampleFile of registration.files) {
      const file = fs.readFileSync(path.resolve(fixtureDirectory, '../public', sampleFile.slice(1)))
      total += file.length
      bankBytes += file.length
      assert.equal(file.toString('ascii', 0, 4), 'RIFF')
      assert.equal(file.toString('ascii', 8, 12), 'WAVE')
      assert.equal(file.readUInt16LE(22), 1)
    }
    assert.ok(registration.map)
    }
    assert.ok(bankBytes < 700_000, `${bank.id}: each bank stays below 700 KB`)
  }
  assert.equal(SAMPLE_BANKS.length, 9)
  assert.ok(total < 4_200_000, 'acoustic brass layers keep the lazy-loaded catalog below 4.2 MB')
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
  assert.equal(kit.instruments['w:b1'].performance.steps[0].active, false)
  assert.equal(kit.instruments['w:b1'].performance.steps[1].active, true)
})

test('new timbre banks reach the intended city styles', () => {
  const { cities } = loadTs('lib/cities-data.ts')
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  const recent = new Set(['chicken-strings-v1', 'chicken-keys-v1', 'chicken-synths-v1', 'chicken-drums-v1', 'chicken-samba-reggae-v2'])
  for (const city of cities) {
    const sources = Object.values(defaultCityKit(city.id).instruments).map(instrument => instrument.source)
    assert.ok(sources.some(source => source?.kind === 'sample' && recent.has(source.bank)), `${city.id}: new timbre`)
  }
  const banksFor = city => new Set(Object.values(defaultCityKit(city).instruments).flatMap(instrument => instrument.source?.kind === 'sample' ? [instrument.source.bank] : []))
  assert.ok(banksFor('san-diego-1999').has('chicken-strings-v1'))
  assert.ok(banksFor('london-1970').has('chicken-keys-v1'))
  assert.ok(banksFor('berkeley-2004').has('chicken-drums-v1'))
  assert.ok(banksFor('tokyo').has('chicken-synths-v1'))
  assert.notEqual(defaultCityKit('san-diego-1999').instruments['w:a1'].source.asset, defaultCityKit('paris-1945').instruments['w:a1'].source.asset)
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
  const { REACTION_PRESET_REVISION, TRIGGERS } = loadTs('lib/music/reactions.ts')
  assert.deepEqual(EDITABLE_CITY_KITS.map(c => c.id), cities.map(c => c.id))
  const fingerprints = new Set(), kingBehaviors = new Set()
  for (const city of cities) {
    const kit = defaultCityKit(city.id)
    assert.deepEqual(kit, defaultCityKit(city.id))
    assert.equal(kit.cityId, city.id)
    assert.equal(kit.reactionPresetRevision, REACTION_PRESET_REVISION)
    assert.deepEqual(new Set(kit.reactions.rules.map(rule => rule.trigger)), new Set(Object.keys(TRIGGERS)))
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
      assert.ok(instruments.every(i=>i.performance))
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

test('curated arrangements vary density, timbre and harmonic direction by city', () => {
  const { cities, getCityById } = loadTs('lib/cities-data.ts')
  const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
  assert.equal(cities.length, 46)
  assert.equal(new Set(cities.map(city => `${city.geoCoordinates.lat}:${city.geoCoordinates.lng}`)).size, 34)
  const jozi = getCityById('johannesburg')
  assert.equal(jozi.year, 1994)
  assert.match(jozi.genre, /Kwaito/)
  for (const city of cities) {
    const kit = defaultCityKit(city.id)
    const white = kit.pieces.filter(piece => piece.color === 'w')
    const instruments = white.map(piece => kit.instruments[piece.id])
    const sections = instruments[0].performance.steps.length
    const density = Array.from({ length: sections }, (_, index) => instruments.filter(instrument => instrument.performance.steps[index].active).length)
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
  assert.deepEqual(CAMPAIGNS.map(c=>citiesInCampaign(cities,c.id).length),[12,6,3,14,7,4])
  assert.deepEqual(cities.find(city=>city.id==='manchester-1999').campaigns,['world-ballads'])
  assert.deepEqual(cities.find(city=>city.id==='vienna').campaigns,['classical'])
})

test('recent city stories name only the style and give a city-free poetic opening', () => {
  const { cities } = loadTs('lib/cities-data.ts')
  const ids = ['manchester-1999', 'johannesburg', 'buenos-aires-1940', 'dublin-1990', 'new-orleans-1953',
    'san-diego-1999', 'london-1970', 'berkeley-2004', 'new-york-1961', 'san-francisco-1993', 'paris-1945',
    'columbus-2013', 'new-york-1930', 'jacksonville-1974', 'chicago-1958']
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

test('catalog migration detaches the previous kit and preserves subsequent edits',()=>{
 const {loadCityKit,KIT_LIBRARY_STORAGE,cityKitStorageKey}=loadTs('lib/music/city-kits.ts'),{CITY_STYLE_REVISIONS}=loadTs('lib/music/styled-kits.ts')
 const old=creative.createDusseldorfSession(),memory=new Map([[cityKitStorageKey('dusseldorf'),JSON.stringify(old)]]),previous=globalThis.window
 globalThis.window={localStorage:{getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}}
 try{
  const current=loadCityKit('dusseldorf');assert.equal(current.catalogRevision,CITY_STYLE_REVISIONS.dusseldorf)
  const loose=JSON.parse(memory.get(KIT_LIBRARY_STORAGE))[0]
  assert.equal(loose.cityId,undefined)
  assert.match(loose.name,/ v1$/)
  assert.deepEqual({...loose,name:old.name,cityId:old.cityId},JSON.parse(JSON.stringify(old)))
  current.name='Personal';memory.set(cityKitStorageKey('dusseldorf'),JSON.stringify(current));assert.equal(loadCityKit('dusseldorf').name,'Personal')
  const restored={...old,catalogRevision:CITY_STYLE_REVISIONS.dusseldorf};memory.set(cityKitStorageKey('dusseldorf'),JSON.stringify(restored));assert.equal(loadCityKit('dusseldorf').name,old.name)
  assert.equal(JSON.parse(memory.get(KIT_LIBRARY_STORAGE)).length,1)
 }finally{if(previous===undefined)delete globalThis.window;else globalThis.window=previous}
})

test('Manchester revision saves a loose v1 kit while leaving another city linked', () => {
  const { defaultCityKit, loadCityKit, KIT_LIBRARY_STORAGE, cityKitStorageKey } = loadTs('lib/music/city-kits.ts')
  const { STYLE_REVISION, MANCHESTER_JAZZ_REVISION } = loadTs('lib/music/styled-kits.ts')
  const oldManchester = { ...defaultCityKit('manchester-1999'), catalogRevision: STYLE_REVISION }
  const otherCity = { ...defaultCityKit('dusseldorf'), name: 'Düsseldorf pessoal' }
  const memory = new Map([
    [cityKitStorageKey('manchester-1999'), JSON.stringify(oldManchester)],
    [cityKitStorageKey('dusseldorf'), JSON.stringify(otherCity)],
    [KIT_LIBRARY_STORAGE, JSON.stringify([oldManchester, otherCity])],
  ])
  const previous = globalThis.window
  globalThis.window = { localStorage: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) } }
  try {
    assert.equal(loadCityKit('manchester-1999').catalogRevision, MANCHESTER_JAZZ_REVISION)
    const library = JSON.parse(memory.get(KIT_LIBRARY_STORAGE))
    assert.equal(library.length, 2)
    const loose = library[0]
    assert.equal(loose.name, 'Manchester 1999 v1')
    assert.equal(loose.cityId, undefined)
    assert.deepEqual({ ...loose, name: oldManchester.name, cityId: oldManchester.cityId }, JSON.parse(JSON.stringify(oldManchester)))
    assert.equal(library[1].cityId, 'dusseldorf')
    assert.equal(loadCityKit('dusseldorf').name, 'Düsseldorf pessoal')
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('an existing Manchester backup becomes a loose kit without changing the current city kit', () => {
  const { defaultCityKit, loadCityKit, KIT_LIBRARY_STORAGE, cityKitStorageKey, CITY_KIT_STORAGE_PREFIX } = loadTs('lib/music/city-kits.ts')
  const { LEGACY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
  const current = defaultCityKit('manchester-1999')
  const priorRevision = LEGACY_STYLE_REVISIONS.find(revision => revision.startsWith('manchester-'))
  const old = { ...current, catalogRevision: priorRevision }
  const backupKey = `${CITY_KIT_STORAGE_PREFIX}backup:${priorRevision}:manchester-1999`
  const memory = new Map([[cityKitStorageKey('manchester-1999'), JSON.stringify(current)], [backupKey, JSON.stringify(old)]])
  const previous = globalThis.window
  globalThis.window = { localStorage: { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) } }
  try {
    assert.deepEqual(loadCityKit('manchester-1999'), JSON.parse(JSON.stringify(current)))
    assert.equal(memory.has(backupKey), false)
    assert.equal(JSON.parse(memory.get(KIT_LIBRARY_STORAGE))[0].name, 'Manchester 1999 v1')
    loadCityKit('manchester-1999')
    assert.equal(JSON.parse(memory.get(KIT_LIBRARY_STORAGE)).length, 1)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})
