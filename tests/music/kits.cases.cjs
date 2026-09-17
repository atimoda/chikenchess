const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTs, strudel } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, compileVoice } = loadTs('lib/music/runtime.ts')
const patterns = loadTs('lib/music/pattern-library.ts')
const creative = loadTs('lib/music/creative.ts')
const fixtureDirectory = path.resolve(__dirname, '..')

test('sample registry points to small valid local WAV files with explicit tuning', () => {
  const { SAMPLE_BANKS, sampleRegistration } = loadTs('lib/music/sample-banks.ts')
  let total = 0
  for (const bank of SAMPLE_BANKS) {
    let bankBytes = 0
    for (const asset of bank.assets) for (const [variant, data] of asset.variants.entries()) {
    const file = fs.readFileSync(path.resolve(fixtureDirectory, '../public', data.file.slice(1)))
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
