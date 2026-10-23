const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const creative = loadTs('lib/music/creative.ts')
const { noteRoll } = loadTs('lib/music/piano-roll.ts')
const { degreeToMidi } = loadTs('lib/music/model.ts')
const { voiceSpecs, compileVoice, renderMusicCode } = loadTs('lib/music/runtime.ts')
const { arrangementSchema, pieceArrangementSchema, arrangementPosition, sectionStartCycle, sectionEndCycle, pieceSection, DEFAULT_ARRANGEMENT, migrateGlobalArrangement } = loadTs('lib/music/arrangement.ts')

function fixture() {
  let kit = creative.createCreativeSession()
  kit.scale = 'Maior'; kit.root = 'C'
  kit.pieces.forEach(piece => { piece.active = ['w:b1', 'w:d1'].includes(piece.id) })
  kit.instruments['w:b1'].pianoRolls = [noteRoll([0, 2, 4], .75, .5), noteRoll([5, 6], 2, .5)]
  kit.instruments['w:d1'].pianoRolls = [noteRoll([0, 1, 2], 1.5, .5)]
  kit = creative.updateCreativeArrangement(kit, { sections: [
    { id: 'intro', label: 'Intro', beats: 3 }, { id: 'theme', label: 'Verse', beats: 5 }, { id: 'break', label: 'Break', beats: 4 },
  ] })
  for (const id of ['w:b1', 'w:d1']) kit.instruments[id].arrangement = { restart: true, sections: {
    intro: { variation: 0, transpose: 0, active: true },
    theme: { variation: id === 'w:b1' ? 1 : 0, transpose: 5, active: true },
    break: { variation: 0, transpose: -7, active: false },
  } }
  return kit
}

function events(pattern, from = 0, to = 6) {
  return pattern.queryArc(from, to).filter(h => h.hasOnset()).map(h => ({
    time: Number(h.whole.begin), end: Number(h.whole.end), note: h.value.note ?? null,
    velocity: h.value.velocity, gain: h.value.gain, pan: h.value.pan, cutoff: h.value.cutoff,
  })).sort((a,b) => a.time - b.time || a.note - b.note || a.end - b.end)
}

function exported(api, snapshot) {
  const expression = renderMusicCode(snapshot, null).split('\n').filter(line => !line.startsWith('//') && !line.startsWith('samples(') && !line.startsWith('setcps(')).join('\n')
  return Function('api', `with(api){return (${expression})}`)(api)
}

test('global section boundaries use shared pulses, wrap and stay independent of MIDI loop duration', () => {
  const arrangement = fixture().arrangement
  for (const pulses of [2, 3, 4, 5, 7]) {
    for (const [beat, index] of [[0,0],[2.999,0],[3,1],[7.999,1],[8,2],[11.999,2],[12,0],[15,1],[-1,2]]) {
      assert.equal(arrangementPosition(arrangement, beat / pulses, pulses).index, index, `${pulses} pulses, beat ${beat}`)
    }
  }
  assert.deepEqual(DEFAULT_ARRANGEMENT.sections.map(section => [section.label, section.beats]), [['Verse',4]])
})

test('section seeking resolves exact starts in compound and fractional global sections', () => {
  const plan = { sections: [{ id: 'a', label: 'Intro', beats: 2.25 }, { id: 'b', label: 'Verse', beats: 5.5 }, { id: 'c', label: 'Chorus', beats: 3 }] }
  for (const pulses of [2,3,4,5,7]) {
    assert.equal(sectionStartCycle(plan,'a',pulses),0)
    assert.equal(sectionStartCycle(plan,'b',pulses),2.25/pulses)
    assert.equal(sectionStartCycle(plan,'c',pulses),7.75/pulses)
    assert.ok(Math.abs(sectionEndCycle(plan,1/pulses,pulses)-2.25/pulses)<1e-9)
    assert.ok(Math.abs(sectionEndCycle(plan,12/pulses,pulses)-13/pulses)<1e-9)
    assert.equal(sectionStartCycle(plan,'missing',pulses),undefined)
  }
})

test('v6 custom harmonies migrate once to Kit Harmony and v7 plan choices preserve saved degrees', () => {
  const kit = fixture(), legacy = structuredClone(kit)
  legacy.version = 6; legacy.harmony = 'circle'; legacy.arrangement.sections[0].harmony = [0,3,4]
  const migrated = creative.parseCreativeSession(JSON.stringify(legacy))
  assert.equal(migrated.version,7)
  assert.equal(migrated.harmony,'kit')
  assert.deepEqual(migrated.instruments,kit.instruments)
  migrated.harmony = 'jazz-251'
  const restored = creative.parseCreativeSession(JSON.stringify(migrated))
  assert.equal(restored.harmony,'jazz-251')
  assert.deepEqual(restored.arrangement,migrated.arrangement)
  legacy.arrangement.sections[0].harmony = undefined
  assert.equal(creative.parseCreativeSession(JSON.stringify(legacy)).harmony,'circle')
  const {defaultCityKit,EDITABLE_CITY_KITS} = loadTs('lib/music/city-kits.ts')
  for (const city of EDITABLE_CITY_KITS) {
    const preset = defaultCityKit(city.id)
    if(preset.arrangement.sections.some(section=>section.harmony))assert.equal(preset.harmony,'kit',city.id)
  }
})

test('Kit Harmony uses section degrees while selected plans and reactions override without deleting them', async () => {
  const api = await strudel(), kit = fixture()
  kit.arrangement.sections[0].harmony = [3,4]
  kit.arrangement.sections[1].harmony = [-1,2]
  const saved = structuredClone(kit.arrangement)
  for(const harmony of ['kit','static','circle','jazz-251']) {
    kit.harmony = harmony
    const snapshot = creative.creativeSnapshot(kit,true)
    const compiled = api.stack(...voiceSpecs(snapshot,null).map(voice=>compileVoice(api,voice)))
    assert.deepEqual(events(exported(api,snapshot)),events(compiled))
    if(harmony!=='kit') {
      const plain = {...snapshot,arrangement:{sections:snapshot.arrangement.sections.map(({harmony,...section})=>section)}}
      assert.deepEqual(events(compiled),events(api.stack(...voiceSpecs(plain,null).map(voice=>compileVoice(api,voice)))))
    } else {
      const voice=voiceSpecs(snapshot,null).find(voice=>voice.piece.id==='w:b1')
      assert.equal(events(compileVoice(api,voice),0,.01)[0].note,degreeToMidi(3,snapshot.scale,voice.instrument.octave))
    }
    const roundTrip=creative.parseCreativeSession(JSON.stringify(kit))
    assert.equal(roundTrip.harmony,harmony)
    assert.deepEqual(roundTrip.arrangement,saved)
  }
})

test('runtime seeking discards old buses, repeats the section downbeat and updates every monitor', async () => {
  const api=await strudel(), kit=fixture(), {MusicRuntime}=loadTs('lib/music/runtime.ts'), {MusicTransport}=loadTs('lib/music/transport.ts')
  const nodes={}, removed=[], attacks=[];let now=0
  const runtime=new MusicRuntime(()=>{},error=>{throw error})
  runtime.api={...api,getAudioContext:()=>({currentTime:now}),getSuperdoughAudioController:()=>({nodes,getOrbit:id=>nodes[id]??={disconnect(){removed.push(id)},output:{gain:{setTargetAtTime(){}}}}}),webaudioOutput:async hap=>{attacks.push({voice:hap.value.ccVoice,cycle:Number(hap.whole.begin)})}}
  const transport=new MusicTransport({getTime:()=>now,latency:.1,onBoundary:()=>{},onError:error=>{throw error},onTrigger:(hap,deadline,duration,cps,time)=>runtime.triggerLoop(hap,deadline,duration,cps,time)})
  runtime.scheduler=transport
  try {
    runtime.update(creative.creativeSnapshot(kit,true));await Promise.resolve()
    assert.equal(transport.started,true)
    const oldNodes=Object.values(nodes), generation=runtime.generation
    assert.equal(runtime.seekSection('theme'),true)
    assert.ok(oldNodes.every(old=>!Object.values(nodes).includes(old)))
    assert.ok(removed.length>0)
    assert.ok(runtime.generation>generation)
    assert.equal(runtime.monitor.getSnapshot().section,1)
    assert.equal(runtime.monitor.getSnapshot().transport.sectionLabel,'Verse')
    assert.ok(Math.abs(runtime.monitor.getSnapshot().cycle-.75)<1e-9)
    const count=attacks.filter(attack=>attack.voice==='w:b1:loop'&&attack.cycle===.75).length
    assert.ok(count>0)
    now=.4;transport.tick()
    runtime.seekSection('theme')
    assert.equal(attacks.filter(attack=>attack.voice==='w:b1:loop'&&attack.cycle===.75).length,count+1)
    assert.equal(runtime.seekSection('missing'),false)
    runtime.update({...creative.creativeSnapshot(kit,false),title:'Outro kit'})
    assert.equal(runtime.monitor.getSnapshot().cycle,0)
    runtime.seekSection('break')
    assert.equal(runtime.monitor.getSnapshot().cycle,2)
    runtime.update({...creative.creativeSnapshot(kit,false),title:'Novo kit'})
    assert.equal(runtime.monitor.getSnapshot().cycle,0,'loading a new kit discards the parked section even with an initialized scheduler')
  } finally {runtime.dispose()}
})

test('paused section selection parks before audio initialization and meter changes reset its position', () => {
  const kit=fixture(),{MusicRuntime}=loadTs('lib/music/runtime.ts')
  const runtime=new MusicRuntime(()=>{},error=>{throw error})
  try {
    runtime.update(creative.creativeSnapshot(kit,false))
    assert.equal(runtime.seekSection('break'),true)
    assert.equal(runtime.scheduler,undefined)
    assert.equal(runtime.monitor.getSnapshot().running,false)
    assert.equal(runtime.monitor.getSnapshot().section,2)
    assert.equal(runtime.monitor.getSnapshot().cycle,2)
    runtime.update({...creative.creativeSnapshot(kit,false),meter:'3/4'})
    assert.equal(runtime.monitor.getSnapshot().cycle,0)
    runtime.seekSection('break')
    runtime.update({...creative.creativeSnapshot(kit,false),title:'Outro kit'})
    assert.equal(runtime.monitor.getSnapshot().cycle,0,'a pre-initialization seek also resets on kit replacement')
  } finally {runtime.dispose()}
})

test('runtime queues a repeat without cutting current buses and keeps its boundary synchronized with edits', async () => {
  const api=await strudel(),{MusicRuntime}=loadTs('lib/music/runtime.ts'),{MusicTransport}=loadTs('lib/music/transport.ts')
  let kit=fixture(),now=0;const nodes={},attacks=[]
  const runtime=new MusicRuntime(()=>{},error=>{throw error})
  runtime.api={...api,getAudioContext:()=>({currentTime:now}),getSuperdoughAudioController:()=>({nodes,getOrbit:id=>nodes[id]??={disconnect(){},output:{gain:{setTargetAtTime(){}}}}}),webaudioOutput:async hap=>attacks.push(Number(hap.whole.begin))}
  const transport=new MusicTransport({getTime:()=>now,latency:.1,onBoundary:()=>{},onError:error=>{throw error},onTrigger:(...args)=>runtime.triggerLoop(...args)})
  runtime.scheduler=transport
  try{
    runtime.update(creative.creativeSnapshot(kit,true));await Promise.resolve()
    for(let step=1;step<=10;step++){now=step*.05;transport.tick()}
    const cycle=transport.cycle,generation=runtime.generation,oldNodes=Object.values(nodes)
    assert.equal(runtime.queueSection('intro'),true)
    assert.equal(transport.cycle,cycle);assert.equal(runtime.generation,generation)
    assert.deepEqual(Object.values(nodes),oldNodes)
    assert.equal(runtime.monitor.getSnapshot().transport.nextSectionId,'intro')
    assert.ok(Math.abs(transport.queuedSeekCycle-.75)<1e-9)
    kit=creative.updateCreativeArrangement(kit,{sections:kit.arrangement.sections.map(section=>section.id==='intro'?{...section,beats:6}:section)})
    runtime.update(creative.creativeSnapshot(kit,true))
    assert.ok(Math.abs(transport.queuedSeekCycle-1.5)<1e-9)
    const deadline=transport.tempo.timeAt(transport.queuedSeekCycle)
    now=deadline-.05;transport.tick();runtime.publishFrame()
    assert.equal(runtime.monitor.getSnapshot().transport.nextSectionId,'intro')
    assert.ok(runtime.monitor.getSnapshot().cycle>1)
    assert.deepEqual(Object.values(nodes),oldNodes)
    now=deadline;runtime.publishFrame()
    assert.ok(Math.abs(runtime.monitor.getSnapshot().cycle)<1e-9)
    assert.equal(runtime.monitor.getSnapshot().transport.nextSectionId,undefined)
    assert.equal(runtime.queueSection('missing'),false)
  }finally{runtime.dispose()}
})

test('removing a queued section or pausing cancels it, while paused selection prepares the next Play', async () => {
  const api=await strudel(),{MusicRuntime}=loadTs('lib/music/runtime.ts'),{MusicTransport}=loadTs('lib/music/transport.ts')
  let kit=fixture(),now=0;const nodes={}
  const runtime=new MusicRuntime(()=>{},error=>{throw error})
  runtime.api={...api,getAudioContext:()=>({currentTime:now}),getSuperdoughAudioController:()=>({nodes,getOrbit:id=>nodes[id]??={disconnect(){},output:{gain:{setTargetAtTime(){}}}}}),webaudioOutput:async()=>{}}
  const transport=new MusicTransport({getTime:()=>now,latency:.1,onBoundary:()=>{},onError:error=>{throw error},onTrigger:(...args)=>runtime.triggerLoop(...args)})
  runtime.scheduler=transport
  try{
    runtime.update(creative.creativeSnapshot(kit,true));await Promise.resolve();now=.5;transport.tick()
    runtime.queueSection('theme')
    kit=creative.updateCreativeArrangement(kit,{sections:kit.arrangement.sections.filter(s=>s.id!=='theme')})
    runtime.update(creative.creativeSnapshot(kit,true))
    assert.equal(transport.pendingSeekTarget,undefined)
    assert.equal(runtime.monitor.getSnapshot().transport.nextSectionId,undefined)
    runtime.queueSection('break');runtime.update(creative.creativeSnapshot(kit,false))
    assert.equal(transport.pendingSeekTarget,undefined)
    assert.equal(runtime.monitor.getSnapshot().transport.nextSectionId,undefined)
    assert.equal(runtime.queueSection('break'),true)
    assert.equal(transport.started,false);assert.equal(transport.cycle,.75)
    assert.equal(runtime.monitor.getSnapshot().transport.nextSectionId,'break')
    runtime.update(creative.creativeSnapshot(kit,true));await Promise.resolve()
    assert.equal(transport.started,true);assert.equal(transport.cycle,.75)
    assert.equal(runtime.monitor.getSnapshot().transport.nextSectionId,undefined)
  }finally{runtime.dispose()}
})

test('initial electronic draft and bare instruments play the complete four-bar MIDI across default A entries', async () => {
  const api = await strudel(), kit = creative.createCreativeSession(), id = 'w:b1'
  assert.deepEqual(kit.arrangement, DEFAULT_ARRANGEMENT)
  assert.ok(Object.values(kit.instruments).every(instrument=>instrument.arrangement.restart===false))
  kit.pieces.forEach(piece=>{piece.active=piece.id===id})
  kit.instruments[id].pianoRolls=[noteRoll([0,2,4,6],4,1)]
  const snapshot=creative.creativeSnapshot(kit,true)
  const expected=Array.from({length:8},(_,bar)=>[bar,degreeToMidi([0,2,4,6][bar%4],snapshot.scale,kit.instruments[id].octave)])
  const bare={...snapshot,arrangement:undefined,instruments:{...snapshot.instruments,[id]:{...snapshot.instruments[id],arrangement:undefined}}}
  for(const state of [snapshot,bare]) {
    const voice=voiceSpecs(state,null)[0]
    assert.equal(voice.performance.restart,false)
    const pattern=compileVoice(api,voice)
    assert.deepEqual(events(pattern,0,8).map(event=>[event.time,event.note]),expected,'one-bar global boundaries do not restart the four-bar phrase')
    assert.deepEqual(events(exported(api,state),0,8),events(pattern,0,8))
  }
  const king=kit.instruments['w:e1']
  assert.equal(king.pianoRolls[0].bars,4,'the unchanged initial sustain voice already writes a four-bar sequence')
  kit.pieces.forEach(piece=>{piece.active=piece.id==='w:e1'})
  const kingSnapshot=creative.creativeSnapshot(kit,true),kingVoice=voiceSpecs(kingSnapshot,null)[0]
  const written=king.pianoRolls[0].notes.map(note=>[note.start,degreeToMidi(note.degree,kingSnapshot.scale,king.octave)]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])
  assert.deepEqual(events(compileVoice(api,kingVoice),0,4).map(event=>[event.time,event.note]),written)
})

test('schema 7 validates global IDs, section budget and piece selection independently', () => {
  const sections = [{ id: 'a', label: 'Intro', beats: 64 }, { id: 'b', label: 'Verse', beats: 64 }]
  assert.ok(arrangementSchema.safeParse({ sections }).success)
  assert.equal(arrangementSchema.safeParse({ sections: [] }).success, false)
  assert.equal(arrangementSchema.safeParse({ sections: [sections[0], sections[0]] }).success, false)
  assert.equal(arrangementSchema.safeParse({ sections: Array.from({ length: 9 }, (_, index) => ({ id: `s${index}`, label: 'Verse', beats: 64 })) }).success, false)
  assert.equal(arrangementSchema.safeParse({ sections: [{ id: 'a', label: 'Intro', beats: 65 }] }).success, false)
  assert.equal(arrangementSchema.safeParse({ sections: [{ id: 'a', label: 'Intro', beats: .125 }] }).success, false)
  assert.ok(pieceArrangementSchema.safeParse({ restart: false, sections: { a: { variation: 7, transpose: -24, active: false } } }).success)
  for (const patch of [{ variation: 8 }, { variation: -1 }, { transpose: 25 }, { transpose: -25 }, { active: 'yes' }]) {
    assert.equal(pieceArrangementSchema.safeParse({ restart: true, sections: { a: { variation: 0, transpose: 0, active: true, ...patch } } }).success, false)
  }
})

test('reorder, rename, resize and remove global sections preserve piece assignments by ID', () => {
  const kit = fixture(), before = JSON.stringify(kit)
  const next = creative.updateCreativeArrangement(kit, { sections: [
    { ...kit.arrangement.sections[1], label: 'Chorus', beats: 7 },
    { ...kit.arrangement.sections[0], beats: 2 }, { id: 'outro', label: 'Outro', beats: 3 },
  ] })
  assert.deepEqual(next.arrangement.sections.map(section => section.id), ['theme','intro','outro'])
  for (const [id, instrument] of Object.entries(next.instruments)) {
    assert.deepEqual(Object.keys(instrument.arrangement.sections).sort(), ['intro','outro','theme'])
    for (const section of ['theme','intro']) assert.deepEqual(instrument.arrangement.sections[section], kit.instruments[id].arrangement.sections[section])
    assert.deepEqual(instrument.arrangement.sections.outro, { variation: 2 % instrument.pianoRolls.length, transpose: 0, active: true })
    assert.equal(instrument.arrangement.restart, kit.instruments[id].arrangement.restart)
  }
  assert.equal(JSON.stringify(kit), before)
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(next)), next)
})

test('missing piece section defaults use global index modulo each piece MIDI bank count', () => {
  const kit = fixture(), instrument = kit.instruments['w:b1']
  const missing = { ...instrument, arrangement: { restart: false, sections: {} } }
  for (let index = 0; index < kit.arrangement.sections.length; index++) {
    assert.deepEqual(pieceSection(missing, kit.arrangement, index), { variation: index % 2, transpose: 0, active: true })
  }
})

test('mixed MIDI lengths switch together at global boundaries, preserving transpose, silence and export', async () => {
  const api = await strudel(), kit = fixture(), snapshot = creative.creativeSnapshot(kit, true)
  const voices = voiceSpecs(snapshot, null), bass = voices.find(voice => voice.piece.id === 'w:b1')
  for (const voice of voices) {
    assert.deepEqual(voice.performance.steps.map(step => step.beats), [3,5,4])
    const pattern = compileVoice(api, voice)
    assert.ok(events(pattern, .75, .751).length > 0, `${voice.key}: enters Theme on the same boundary`)
    assert.deepEqual(events(pattern, 2, 3), [], `${voice.key}: global Break is silent`)
  }
  const bassEvents = events(compileVoice(api, bass), 0, 3)
  const midi = degree => degreeToMidi(degree, snapshot.scale, kit.instruments['w:b1'].octave)
  assert.deepEqual(bassEvents.map(event => [event.time,event.note]), [[0,midi(0)],[.25,midi(2)],[.5,midi(4)],[.75,midi(5)+5],[1.75,midi(6)+5]])
  const actual = api.stack(...voices.map(voice => compileVoice(api, voice)))
  assert.deepEqual(events(exported(api, snapshot)), events(actual))
})

test('pin and rule override only MIDI selection, retaining presence, chromatic transpose and restart', async () => {
  const api = await strudel(), kit = fixture(), id = 'w:b1'
  kit.instruments[id].selectedVariation = 0
  const snapshot = creative.creativeSnapshot(kit, true)
  const pinned = voiceSpecs(snapshot, null).find(voice => voice.piece.id === id)
  const ruleSnapshot = { ...snapshot, sectionOverrides: { [id]: 1 } }
  const overridden = voiceSpecs(ruleSnapshot, null).find(voice => voice.piece.id === id)
  const midi = degree => degreeToMidi(degree, snapshot.scale, kit.instruments[id].octave)
  for (const [voice, pitch] of [[pinned,midi(0)],[overridden,midi(5)]]) {
    assert.equal(voice.performance.restart, true)
    assert.deepEqual(voice.performance.steps.map(step => [step.beats,step.transpose,step.active]), [[3,0,true],[5,5,true],[4,-7,false]])
    const pattern = compileVoice(api, voice)
    assert.equal(events(pattern, .75, .751)[0].note, pitch + 5)
    assert.deepEqual(events(pattern, 2, 3), [])
  }
  const manual = voiceSpecs(ruleSnapshot, { id, square: 'b1', mode: 'manual' }).find(voice => voice.manual)
  assert.ok(events(compileVoice(api, manual), 0, .01).length > 0)
  assert.equal(manual.performance, undefined)
})

test('global harmony follows section identity while pinned and forced MIDI banks remain independent', async () => {
  const api = await strudel(), kit = fixture(), id = 'w:b1'
  kit.arrangement.sections[0].harmony = [0]
  kit.arrangement.sections[1].harmony = [3,4]
  kit.instruments[id].arrangement.sections.theme.transpose = 0
  kit.instruments[id].selectedVariation = 0
  const snapshot = creative.creativeSnapshot(kit, true)
  for (const [state, degree] of [[snapshot,0],[{ ...snapshot, sectionOverrides: { [id]: 1 } },5]]) {
    const voice = voiceSpecs(state, null).find(voice => voice.piece.id === id)
    const pattern = compileVoice(api, voice)
    const midi = root => degreeToMidi(degree + root, snapshot.scale, kit.instruments[id].octave)
    assert.equal(events(pattern, 0, .01)[0].note, midi(0))
    assert.equal(events(pattern, .75, .751)[0].note, midi(3))
    const actual = api.stack(...voiceSpecs(state, null).map(candidate => compileVoice(api, candidate)))
    assert.deepEqual(events(exported(api, state)), events(actual))
  }
})

test('v5 migration uses the first piece performance durations and maps other pieces by section index', () => {
  const current = creative.createCreativeSession(), legacy = structuredClone(current)
  legacy.version = 5; delete legacy.arrangement
  legacy.sectionPattern = '[0@2 1@2]/4'; legacy.harmonicSequences = [[0,3],[4,0]]
  for (const instrument of Object.values(legacy.instruments)) delete instrument.arrangement
  const first = legacy.pieces[0].id, other = legacy.pieces[1].id
  const authoritative = { restart: false, steps: [
    { beats: 3, variation: 1, transpose: 2, active: true }, { beats: 5, variation: 0, transpose: -3, active: false },
  ] }
  const secondary = { restart: true, steps: [
    { beats: 12, variation: 0, transpose: 7, active: false }, { beats: 4, variation: 1, transpose: -7, active: true },
  ] }
  legacy.instruments[first].pianoRolls = [noteRoll([0]),noteRoll([2])]
  legacy.instruments[other].pianoRolls = [noteRoll([4]),noteRoll([])]
  legacy.instruments[first].performance = authoritative; legacy.instruments[other].performance = secondary
  const before = JSON.stringify(legacy), migrated = creative.parseCreativeSession(before)
  assert.equal(migrated.version, 7)
  assert.deepEqual(migrated.arrangement.sections.map(section => section.beats), [3,5])
  assert.deepEqual(migrated.arrangement.sections.map(section => section.harmony), [[0,3],[4,0]])
  for (const [id, source] of [[first,authoritative],[other,secondary]]) {
    assert.equal(migrated.instruments[id].arrangement.restart, source.restart)
    assert.deepEqual(migrated.arrangement.sections.map(section => migrated.instruments[id].arrangement.sections[section.id]), source.steps.map(({ beats, ...step }) => step))
    assert.deepEqual(migrated.instruments[id].pianoRolls, legacy.instruments[id].pianoRolls)
    assert.equal(Object.hasOwn(migrated.instruments[id], 'performance'), false)
  }
  for (const field of ['sectionPattern','harmonicSequences']) assert.equal(Object.hasOwn(migrated, field), false)
  assert.equal(JSON.stringify(legacy), before)
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(migrated)), migrated)
  const direct = structuredClone(legacy); migrateGlobalArrangement(direct)
  assert.deepEqual(direct.arrangement, migrated.arrangement)
})

test('continuous short MIDI rolls follow global per-bar harmony in slices, export and runtime monitor', async () => {
  const api = await strudel(), id = 'w:b1'
  let kit = creative.createCreativeSession()
  kit.root = 'C'; kit.scale = 'Maior'
  kit.pieces.forEach(piece => { piece.active = piece.id === id })
  kit.instruments[id].pianoRolls = [noteRoll([0], .5, .8), noteRoll([2], .5, .8)]
  kit = creative.updateCreativeArrangement(kit, { sections: [
    { id: 'long', label: 'Verse', beats: 16, harmony: [0,3,4,0] },
    { id: 'answer', label: 'Chorus', beats: 8, harmony: [4,3] },
  ] })
  kit.instruments[id].arrangement = { restart: false, sections: {
    long: { variation: 0, transpose: 2, active: true }, answer: { variation: 1, transpose: -3, active: true },
  } }
  const { MusicRuntime } = loadTs('lib/music/runtime.ts')
  for (const pin of [undefined,0,1]) {
    kit.instruments[id].selectedVariation = pin
    const snapshot = creative.creativeSnapshot(kit, true), voice = voiceSpecs(snapshot, null)[0]
    assert.equal(voice.pianoRolls.length, 2)
    assert.equal(voice.performance.restart, false)
    assert.deepEqual(voice.performance.steps.map(step=>step.variation), pin===undefined ? [0,1] : [pin,pin])
    const pattern = compileVoice(api, voice), whole = events(pattern,0,6)
    const expected = Array.from({length:12},(_,index)=>{
      const time=index/2, second=time>=4, roots=second?[4,3]:[0,3,4,0]
      const root=roots[Math.floor(time-(second?4:0))], bank=pin??(second?1:0)
      return [time,degreeToMidi(bank*2+root,snapshot.scale,kit.instruments[id].octave)+(second?-3:2)]
    })
    assert.deepEqual(whole.map(event=>[event.time,event.note]),expected)
    assert.deepEqual(events(exported(api,snapshot),0,6),whole)
    for(let index=0;index<12;index++)assert.deepEqual(events(pattern,index/2,index/2+.01),[whole[index]],`pin ${pin}, attack ${index}`)
    // Querying inside a held note must use its original attack, not the slice time.
    assert.equal(pattern.queryArc(.2,.21)[0].value.note,whole[0].note)
    let seconds=0
    const runtime=new MusicRuntime(()=>{},error=>{throw error})
    runtime.api={...api,getAudioContext:()=>({currentTime:seconds}),getSuperdoughAudioController:()=>({nodes:{}})}
    runtime.scheduler={started:true,lastBegin:0,lastTick:0,latency:0,cps:1}
    runtime.state=snapshot;runtime.voices=new Map([[voice.key,voice]])
    try {
      for(const time of [0,1,2,3,4,5,6]) {
        seconds=time+.05;runtime.publishFrame()
        const frame=runtime.monitor.getSnapshot(), second=time%6>=4
        const root=(second?[4,3]:[0,3,4,0])[Math.floor(time%6-(second?4:0))]
        assert.equal(frame.section,second?1:0)
        assert.equal(frame.transport.harmonicRoot,root)
        assert.equal(frame.transport.authoredHarmony,true)
        assert.equal(frame.transport.sectionLabel,second?'Chorus':'Verse')
        assert.deepEqual(frame.tracks[id].notes,[expected[(time%6)*2][1]])
      }
    } finally {runtime.scheduler=null;runtime.dispose()}
  }
})

test('section names use the closed vocabulary in every catalog kit and legacy saves recover their types', () => {
  const { SECTION_TYPES, normalizeSectionLabel } = loadTs('lib/music/arrangement.ts')
  const { STYLE_PROFILES, createStyledCityKit } = loadTs('lib/music/styled-kits.ts')
  const { cities } = loadTs('lib/cities-data.ts')
  for (const [cityId, profile] of Object.entries(STYLE_PROFILES)) {
    assert.equal(profile.sectionLabels.length, profile.sections.length, cityId)
    const city = cities.find(item => item.id === cityId)
    if (city) assert.deepEqual(createStyledCityKit(city).arrangement.sections.map(section => section.label), profile.sectionLabels, cityId)
  }
  for (const preset of ['manchester-1999', 'dusseldorf-original', 'mouth-breather']) {
    for (const section of require(`../../public/presets/${preset}.json`).arrangement.sections) assert.ok(SECTION_TYPES.includes(section.label), `${preset}: ${section.label}`)
  }
  assert.equal(normalizeSectionLabel('refrão'), 'Chorus')
  assert.equal(normalizeSectionLabel(' pre chorus '), 'Pre-Chorus')
  assert.equal(normalizeSectionLabel('Seção 3'), 'Verse')
  assert.equal(arrangementSchema.safeParse({ sections: [{ id: 'a', label: 'Drop Break', beats: 4 }] }).data.sections[0].label, 'Verse')
  const legacy = JSON.parse(JSON.stringify(createStyledCityKit(cities.find(city => city.id === 'berlin'))))
  legacy.arrangement.sections.forEach((section, index) => { section.label = String.fromCharCode(65 + index) })
  legacy.arrangement.sections[1].label = 'Ponte'
  assert.deepEqual(creative.parseCreativeSession(JSON.stringify(legacy)).arrangement.sections.map(section => section.label), ['Intro', 'Bridge', 'Break', 'Drop', 'Interlude', 'Drop'])
})
