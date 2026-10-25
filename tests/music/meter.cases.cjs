const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { loadTs, strudel } = require('../helpers/music.cjs')
const meter = loadTs('lib/music/meter.ts')
const creative = loadTs('lib/music/creative.ts')
const { TempoMap } = loadTs('lib/music/transport.ts')
const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
const { RHYTHM_STAGES } = loadTs('lib/rhythm-stages.ts')

test('eleven meters round-trip, with equal clock units and the correct bar duration', () => {
 const expected = {'2/4':2,'3/4':3,'4/4':4,'6/8':2,'9/8':3,'12/8':4,'2/2':2,'5/4':5,'5/8':5,'7/4':7,'7/8':7}
 assert.deepEqual(new Set(meter.METER_IDS),new Set(Object.keys(expected)))
 for (const [signature,pulses] of Object.entries(expected)) {
  const kit = {...creative.createCreativeSession(),meter:signature}
  assert.equal(creative.parseCreativeSession(JSON.stringify(kit)).meter,signature)
  const clock = new TempoMap(120,0,meter.beatsPerBar(signature))
  assert.equal(clock.timeAt(1),pulses/2)
  clock.change(1,180,3)
  for(const bar of [1,1.5,2,4,5])assert.ok(Math.abs(clock.cycleAt(clock.timeAt(bar))-bar)<1e-8)
 }
 assert.equal(meter.beatUnit('2/2'),'half')
 assert.equal(meter.beatUnit('5/8'),'eighth')
 assert.equal(meter.subdivisionsPerBeat('9/8'),3)
 const old=creative.createCreativeSession();delete old.meter
 assert.equal(creative.parseCreativeSession(JSON.stringify(old)).meter,'4/4')
 assert.throws(()=>creative.parseCreativeSession(JSON.stringify({...old,meter:'13/8'})))
})

test('odd-meter accents preserve group boundaries without changing the old meters', () => {
 const {phraseRoll}=loadTs('lib/music/styled-kits.ts')
 for(const [signature,starts] of [['5/8',[0,3]],['7/8',[0,3,5]],['5/4',[0,3]],['7/4',[0,4]]]) {
  assert.deepEqual(meter.groupStarts(signature),starts)
  const roll=phraseRoll(Array(meter.beatsPerBar(signature)).fill('0').join(' '),1,0,.7,signature)
  starts.slice(1).forEach(index=>assert.equal(roll.notes[index].velocity,.9))
  assert.equal(roll.notes[1].velocity,.84)
 }
 assert.deepEqual(phraseRoll('0 0 0',1,0,.7,'3/4').notes.map(n=>n.velocity),[1,.77,.77])
 assert.deepEqual(phraseRoll('0 0 0 0 0 0',1,0,.7,'6/8').notes.map(n=>n.velocity),[1,.62,.62,.84,.62,.62])
})

test('five- and seven-pulse roll resizing and the finest seven-beat grid remain saveable', () => {
 const {pianoRollSchema,resizeRoll}=loadTs('lib/music/piano-roll.ts')
 for(const pulses of [5,7]) {
  const roll={bars:1,notes:[{start:0,duration:1/(pulses*8),degree:0,velocity:.8}]}
  for(const bars of [1/pulses,1+1/pulses,1.25+1/pulses,8]) assert.equal(pianoRollSchema.parse(resizeRoll(roll,bars)).bars,bars)
 }
 const clipped=resizeRoll({bars:1,notes:[{start:.19,duration:.05,degree:0,velocity:.8}]},.2)
 assert.deepEqual(clipped.notes,[])
 assert.ok(pianoRollSchema.safeParse(clipped).success)
 assert.equal(pianoRollSchema.safeParse({bars:.123456,notes:[]}).success,false)
})

test('each new stage has its notated subdivision, complete sections and local artwork', () => {
 const {STYLE_PROFILES}=loadTs('lib/music/kit-profiles/catalog.ts')
 const {arrangementPosition}=loadTs('lib/music/arrangement.ts')
 const {cities}=loadTs('lib/cities-data.ts')
 assert.equal(RHYTHM_STAGES.length,34)
 for(const stage of RHYTHM_STAGES) {
  const city=cities.find(c=>c.id===stage.id),kit=defaultCityKit(stage.id),profile=STYLE_PROFILES[stage.id]
  assert.deepEqual(city.campaigns,[stage.campaign])
  assert.equal(kit.meter,stage.meter)
  assert.equal(kit.bpm,stage.bpm)
  assert.ok(city.image.startsWith('https://') || fs.existsSync(`public${city.image}`))
  assert.equal(profile.parts.length,16)
  for(const part of profile.parts) {
   assert.equal(part.patterns.length,6)
   assert.ok(part.patterns.every(pattern=>pattern.split(/\s+/).some(cell=>cell!=='.')),`${stage.id}: audible ${part.name}`)
  }
  const firstBars=kit.arrangement.sections[0].beats/meter.beatsPerBar(stage.meter)
  assert.equal(arrangementPosition(kit.arrangement,firstBars,meter.beatsPerBar(stage.meter)).index,1)
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(kit)),JSON.parse(JSON.stringify(kit)))
 }
})

test('new meters compile authored onsets and export the same Strudel clock and events', async () => {
 const api=await strudel()
 const {voiceSpecs,compileVoice,renderMusicCode}=loadTs('lib/music/runtime.ts')
 const seen=new Set()
 const normalize=pattern=>pattern.queryArc(0,1).filter(h=>h.hasOnset()).map(h=>[Number(h.whole.begin),Number(h.whole.end),h.value.note]).sort((a,b)=>a[0]-b[0])
 for(const stage of RHYTHM_STAGES) {
  if(seen.has(stage.meter))continue;seen.add(stage.meter)
  const kit=defaultCityKit(stage.id)
  kit.pieces.forEach(p=>p.active=p.id==='w:a1')
  const snapshot=creative.creativeSnapshot(kit,true),voice=voiceSpecs(snapshot,null)[0]
  const code=renderMusicCode(snapshot,null)
  assert.ok(code.includes(`setcps(${snapshot.bpm} / 60 / ${meter.beatsPerBar(stage.meter)})`))
  assert.ok(code.includes(meter.beatUnit(stage.meter)))
  const body=code.split('\n').filter(line=>!line.startsWith('//')&&!line.startsWith('setcps(')&&!line.startsWith('samples(')).join('\n')
  const exported=Function('api',`with(api){return (${body})}`)(api)
  assert.deepEqual(normalize(exported),normalize(compileVoice(api,voice)),stage.id)
 }
})

test('changing signature resets the session even when both meters have two clock pulses', () => {
 const {MusicRuntime}=loadTs('lib/music/runtime.ts')
 const runtime=new MusicRuntime(()=>{},error=>{throw error})
 let stops=0
 runtime.scheduler={started:true,stop(){stops++;this.started=false}}
 runtime.refresh=()=>{}
 runtime.update({...creative.creativeSnapshot(creative.createCreativeSession(),false),meter:'2/4'})
 runtime.update({...creative.creativeSnapshot(creative.createCreativeSession(),false),meter:'2/2'})
 assert.equal(stops,1)
 runtime.scheduler=null;runtime.dispose()
})
