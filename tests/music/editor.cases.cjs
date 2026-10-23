const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs, renderMusicCode, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const variationEdit = loadTs('lib/music/variation-edit.ts')
const { noteRoll } = loadTs('lib/music/piano-roll.ts')

const withSections = (kit, beats) => creative.updateCreativeArrangement(kit, { sections: beats.map((value,index) => ({ id: `s${index}`, label: String.fromCharCode(65+index), beats: value })) })

test('piano editor follows authored phase, pauses and override priority without compiling patterns', () => {
 const {variationPosition}=loadTs('lib/music/performance.ts')
 const arrangement={sections:[{id:'intro',label:'Intro',beats:3},{id:'theme',label:'Theme',beats:5}]}
 const instrument={...creative.createCreativeSession().instruments['w:b1'],pianoRolls:[0,2,4].map(degree=>noteRoll([degree])),arrangement:{restart:true,sections:{
  intro:{variation:0,transpose:0,active:true},theme:{variation:1,transpose:0,active:false},
 }}}
 assert.deepEqual(variationPosition(instrument,0,1,4,undefined,arrangement),{variation:1,present:false,phase:.25})
 assert.deepEqual(variationPosition({...instrument,arrangement:{...instrument.arrangement,restart:false}},0,1,4,undefined,arrangement),{variation:1,present:false,phase:1})
 assert.deepEqual(variationPosition({...instrument,selectedVariation:2},0,1,4,undefined,arrangement),{variation:2,present:false,phase:.25})
 assert.deepEqual(variationPosition({...instrument,selectedVariation:2},0,1,4,0,arrangement),{variation:0,present:false,phase:.25})
 assert.deepEqual(variationPosition({...instrument,arrangement:undefined},5,1,3),{variation:0,present:true,phase:1})
 assert.deepEqual(variationPosition({...instrument,arrangement:undefined},5,2.5,4),{variation:0,present:true,phase:2.5},'a bare instrument follows continuous MIDI phase past each default A entry')
})

test('MIDI playhead ignores manual notes, disabled loops and a stopped clock', () => {
 const {isLoopRunning}=loadTs('lib/music/monitor.ts'),id='w:b1'
 const frame={running:true,cycle:2,beat:1,section:0,tracks:{[id]:{status:'rest'}}}
 assert.equal(isLoopRunning(frame,id),true,'a rhythmic rest inside an enabled loop keeps its phase')
 assert.equal(isLoopRunning(frame,id,false),false)
 assert.equal(isLoopRunning({...frame,running:false},id),false)
 assert.equal(isLoopRunning({...frame,tracks:{[id]:{status:'note',manual:true}}},id),false)
 assert.equal(isLoopRunning({...frame,tracks:{[id]:{status:'inactive'}}},id),false)
})

test('variation tab plus/minus preserve banks, clamp the pin, and enforce one to eight banks', () => {
 const roll={bars:1,notes:[{start:0,duration:.25,degree:2,velocity:.8,slide:3,slideSeconds:.5,pan:.5}]}
 const empty=noteRoll([])
 const instrument={...creative.createCreativeSession().instruments['w:b1'],pianoRolls:[roll,empty],selectedVariation:1}
 const before=JSON.stringify(instrument)
 const added={...instrument,...variationEdit.addVariation(instrument)}
 assert.deepEqual(added.pianoRolls,[roll,empty,empty])
 assert.notEqual(added.pianoRolls[2],added.pianoRolls[1],'a new bank is independently editable')
 assert.equal(added.selectedVariation,1)
 const removed={...added,...variationEdit.removeLastVariation({...added,selectedVariation:2})}
 assert.equal(removed.selectedVariation,1)
 assert.deepEqual(removed.pianoRolls,instrument.pianoRolls)
 assert.equal(JSON.stringify(instrument),before)
 let growing={...instrument,selectedVariation:undefined}
 while(growing.pianoRolls.length<8)growing={...growing,...variationEdit.addVariation(growing)}
 assert.deepEqual(variationEdit.addVariation(growing),{})
 while(growing.pianoRolls.length>1)growing={...growing,...variationEdit.removeLastVariation(growing)}
 assert.deepEqual(variationEdit.removeLastVariation(growing),{})
 assert.deepEqual(growing.pianoRolls,[roll])
 const kit=creative.createCreativeSession();kit.instruments['w:b1']=added
 assert.deepEqual(creative.parseCreativeSession(JSON.stringify(kit)).instruments['w:b1'].pianoRolls,added.pianoRolls)
})

test('variation actions mirror time, invert slides, and affect only the selected bank', () => {
 const instrument={...creative.createCreativeSession().instruments['w:b1'],pianoRolls:[noteRoll([0,[2,4],null,-1,-1]),noteRoll([6,5,4])]}
 const before=JSON.stringify(instrument)
 const reversed=variationEdit.reverseVariation(instrument,0)
 assert.deepEqual(reversed.pianoRolls[1],instrument.pianoRolls[1])
 assert.deepEqual(reversed.pianoRolls[0].notes.map(note=>note.degree),[-1,-1,2,4,0])
 const rolls={...instrument,pianoRolls:[{bars:1,notes:[
  {start:0,duration:.25,degree:0,velocity:1,slide:3},{start:.25,duration:.5,degree:4,velocity:.8,slide:-2},{start:.75,duration:.25,degree:2,velocity:.7},
 ]},noteRoll([])]}
 assert.deepEqual(variationEdit.reverseVariation(rolls,0).pianoRolls[0].notes,[
  {start:0,duration:.25,degree:2,velocity:.7},
  {start:.25,duration:.5,degree:4,velocity:.8,slide:2},
  {start:.75,duration:.25,degree:0,velocity:1,slide:-3},
 ])
 const values=[0,.2,.99,.5,.4];let cursor=0
 const randomized=variationEdit.randomizeVariation(instrument,0,()=>values[cursor++])
 assert.deepEqual(randomized.pianoRolls[1],instrument.pianoRolls[1])
 assert.deepEqual(randomized.pianoRolls[0].notes.map(({degree,...note})=>note),instrument.pianoRolls[0].notes.map(({degree,...note})=>note))
 assert.deepEqual(randomized.pianoRolls[0].notes.map(note=>note.degree),[-1,0,4,2,1])
 assert.notDeepEqual(randomized.pianoRolls[0].notes.map(note=>note.degree),instrument.pianoRolls[0].notes.map(note=>note.degree))
 assert.equal(JSON.stringify(instrument),before)
})

test('turning variations off silences the loop but preserves manual board notes', async () => {
 const api=await strudel(),kit=creative.createCreativeSession(),id='w:b1'
 kit.pieces.forEach(piece=>piece.active=piece.id===id)
 kit.instruments[id].loopEnabled=false
 const snapshot=creative.creativeSnapshot(kit,true)
 const loop=voiceSpecs(snapshot,null).find(voice=>voice.piece.id===id)
 assert.equal(compileVoice(api,loop).queryArc(0,4).length,0)
 const manual=voiceSpecs(snapshot,{id,square:'b1',mode:'manual'}).find(voice=>voice.piece.id===id)
 assert.ok(compileVoice(api,manual).queryArc(0,1).some(event=>event.hasOnset()))
 assert.equal(creative.parseCreativeSession(JSON.stringify(kit)).instruments[id].loopEnabled,false)
})

test('shared harmony moves compiled melodic attacks and leaves original banks and pulse voices unchanged', async () => {
 const api=await strudel()
 const kit=withSections(creative.createCreativeSession(),[4,4,4,4]);kit.scale='Maior'
 for(const piece of kit.pieces)piece.active=['w:b1','w:a2'].includes(piece.id)
 const base=creative.creativeSnapshot(kit,true),harmonic={...base,harmony:'cadence'}
 const baseVoices=voiceSpecs(base,null),harmonicVoices=voiceSpecs(harmonic,null)
 const baseBass=baseVoices.find(voice=>voice.piece.id==='w:b1'),harmonicBass=harmonicVoices.find(voice=>voice.piece.id==='w:b1')
 assert.deepEqual(harmonicBass.pianoRolls,baseBass.pianoRolls)
 const first=voice=>compileVoice(api,voice).queryArc(1,1.01)[0].value.note
 assert.equal(first(harmonicBass)-first(baseBass),5)
 assert.deepEqual(harmonicVoices.find(voice=>voice.piece.id==='w:a2').pianoRolls,baseVoices.find(voice=>voice.piece.id==='w:a2').pianoRolls)
 kit.instruments['w:b1'].pianoRolls=[{bars:1,notes:[{start:0,duration:.5,degree:0,velocity:1}]}]
 const rollBase=voiceSpecs(creative.creativeSnapshot(kit,true),null).find(voice=>voice.piece.id==='w:b1')
 kit.harmony='cadence'
 const rollHarmony=voiceSpecs(creative.creativeSnapshot(kit,true),null).find(voice=>voice.piece.id==='w:b1')
 assert.deepEqual(rollHarmony.pianoRolls,rollBase.pianoRolls)
 assert.equal(first(rollHarmony)-first(rollBase),5)
})

test('moving harmony generates one voiced diatonic triad per sustain onset', async () => {
 const {harmonyFrame}=loadTs('lib/music/harmony.ts')
 const kit=withSections(creative.createCreativeSession(),[4,4,4,4]),id='w:e1'
 kit.scale='Maior';kit.harmony='cadence';kit.pieces.forEach(piece=>piece.active=piece.id===id)
 Object.assign(kit.instruments[id],{behavior:'sustain',pianoRolls:[noteRoll([[0,2,4],null,2])]})
 const voice=voiceSpecs(creative.creativeSnapshot(kit,true),null)[0]
 const api=await strudel(),pattern=compileVoice(api,voice)
 assert.equal(voice.pianoRolls.length,1,'global harmony does not expand the source bank count')
 assert.equal(pattern.queryArc(1,2).filter(event=>event.hasOnset()).length,6,'an authored chord and a single note each become one voiced triad')
 const played=pattern.queryArc(1,1.01).map(event=>Number(event.value.note)).sort((a,b)=>a-b)
 assert.deepEqual(played,[48,53,57])
 assert.deepEqual(harmonyFrame('cadence',creative.creativeSnapshot(kit,true).scale,1),{
  plan:'cadence',planLabel:'I–IV–V–I - Cadence',section:1,degree:3,roman:'IV',
  chordDegrees:[3,5,7],chordNotes:['F','A','C'],chordName:'F',quality:'maior',
 })
 assert.deepEqual(harmonyFrame('static',['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4'],0).chordNotes,['C','E','G'])
 kit.instruments[id].pianoRolls=[{bars:1,notes:[
  {start:0,duration:.5,degree:0,velocity:1},{start:0,duration:.5,degree:2,velocity:.8},{start:.5,duration:.5,degree:4,velocity:.7},
 ]}]
 const rollVoice=voiceSpecs(creative.creativeSnapshot(kit,true),null)[0],notes=compileVoice(api,rollVoice).queryArc(1,2).filter(event=>event.hasOnset())
 assert.equal(notes.length,6)
 assert.deepEqual([...new Set(notes.filter(event=>Number(event.whole.begin)===1).map(event=>event.value.note))].sort((a,b)=>a-b),[48,53,57])
})

test('songbook plans keep their chord order and voice jazz sevenths', async () => {
 const {HARMONY_PLANS,harmonyFrame}=loadTs('lib/music/harmony.ts')
 const scale=['C4','D4','E4','F4','G4','A4','B4']
 const plans={
  'pop-punk-154':[0,4,3], 'pop-1564':[0,4,5,3], 'rock-6415':[5,3,0,4],
  'doo-wop-1645':[0,5,3,4], 'folk-rock-6425':[5,3,1,4], 'jazz-251':[1,4,0],
  'indie-pop-1465':[0,3,5,4], 'jazz-3625':[2,5,1,4], 'southern-rock-415':[3,0,4], 'blues-145':[0,3,4],
 }
 for(const [plan,degrees] of Object.entries(plans))assert.deepEqual(HARMONY_PLANS[plan].degrees,degrees)
 assert.deepEqual([0,1,2].map(i=>harmonyFrame('jazz-251',scale,i).chordName),['Dm7','G7','Cmaj7'])
 assert.deepEqual([0,1,2,3].map(i=>harmonyFrame('jazz-3625',scale,i).chordName),['Em7','A7','Dm7','G7'])
 const kit=withSections(creative.createCreativeSession(),[4,4,4,4]),id='w:e1'
 kit.scale='Maior';kit.harmony='jazz-3625'
 kit.pieces.forEach(piece=>piece.active=piece.id===id)
 Object.assign(kit.instruments[id],{behavior:'sustain',pianoRolls:[noteRoll([0])]})
 const chord=compileVoice(await strudel(),voiceSpecs(creative.creativeSnapshot(kit,true),null)[0]).queryArc(1,1.01).map(event=>event.value.note).sort((a,b)=>a-b)
 assert.deepEqual(chord,[52,55,57,61],'VI7 contains its chromatic major third C#')
})

test('static harmony preserves authored sustain voicings', () => {
 const kit=creative.createCreativeSession(),id='w:e1'
 kit.scale='Maior';kit.harmony='static';kit.pieces.forEach(piece=>piece.active=piece.id===id)
 Object.assign(kit.instruments[id],{behavior:'sustain',pianoRolls:[noteRoll([[0,3,6]])]})
 assert.deepEqual(voiceSpecs(creative.creativeSnapshot(kit,true),null)[0].pianoRolls[0].notes.map(note=>note.degree),[48,53,59])
})

test('editable notes keep their durations and independent loop lengths in real Strudel', async () => {
 const api=await strudel(),kit=withSections(creative.createDusseldorfSession(),[12])
 kit.instruments['w:b1'].pianoRolls=[{bars:.75,notes:[{start:0,duration:.125,degree:0,velocity:.7}]}]
 kit.instruments['w:b1'].selectedVariation=0
 const parsed=creative.parseCreativeSession(JSON.stringify(kit))
 const v=voiceSpecs(creative.creativeSnapshot(parsed,true),null).find(v=>v.piece.id==='w:b1')
 const hits=compileVoice(api,v).queryArc(0,3).filter(h=>h.hasOnset())
 assert.deepEqual(hits.map(h=>Number(h.whole.begin)),[0,.75,1.5,2.25])
 assert.ok(hits.every(h=>Number(h.whole.end.sub(h.whole.begin))===.125))
 assert.ok(!renderMusicCode(creative.creativeSnapshot(parsed,true),null).includes('timeCat('))
 const {resizeRoll}=loadTs('lib/music/piano-roll.ts')
 assert.deepEqual(resizeRoll({bars:2,notes:[{start:.5,duration:1,degree:0,velocity:1},{start:1.5,duration:.5,degree:2,velocity:1}]},1).notes,[{start:.5,duration:.5,degree:0,velocity:1}])
})

test('fixed variation plays its whole multi-bar phrase instead of restarting every bar', async () => {
 const api=await strudel(),kit=withSections(creative.createDusseldorfSession(),[16]),id='w:b1'
 Object.assign(kit.instruments[id],{pianoRolls:[noteRoll([0]),noteRoll([0,2,4,6],4,1)],selectedVariation:1})
 const voice=voiceSpecs(creative.creativeSnapshot(kit,true),null).find(v=>v.piece.id===id)
 const pitches=compileVoice(api,voice).queryArc(0,4).map(h=>Number(h.value.note))
 assert.equal(new Set(pitches).size,4)
})

test('section form preserves asymmetric lengths, silence, transpose and restart selection', async () => {
 const api=await strudel(),kit=withSections(creative.createCreativeSession(),[3,5,2])
 const instrument=kit.instruments['w:b1']
 Object.assign(instrument,{pianoRolls:[noteRoll([0,1]),noteRoll([2,3])],arrangement:{restart:true,sections:{s0:{variation:0,transpose:0,active:true},s1:{variation:1,transpose:-5,active:true},s2:{variation:0,transpose:0,active:false}}}})
 kit.pieces.forEach(p=>p.active=p.id==='w:b1')
 const voice=voiceSpecs(creative.creativeSnapshot(kit,true),null)[0],pattern=compileVoice(api,voice)
 const events=pattern.queryArc(0,2.5).filter(h=>h.hasOnset())
 assert.ok(events.some(h=>Number(h.whole.begin)===.75),'second phrase restarts at the 3-beat boundary')
 assert.equal(pattern.queryArc(2,2.5).length,0,'muted section has no notes')
 const expected=compileVoice(api,{...voice,performance:undefined,sectionPattern:'1'}).queryArc(0,.1)[0].value.note-5
 assert.equal(events.find(h=>Number(h.whole.begin)===.75).value.note,expected)
 const overridden=voiceSpecs({...creative.creativeSnapshot(kit,true),sectionOverrides:{'w:b1':1}},null)[0]
 assert.deepEqual(overridden.performance.steps.map(step=>[step.beats,step.transpose,step.active]),[[3,0,true],[5,-5,true],[2,0,false]])
 assert.equal(compileVoice(api,overridden).queryArc(2,2.5).length,0)
 instrument.selectedVariation=0
 const pinned=voiceSpecs(creative.creativeSnapshot(kit,true),null)[0]
 assert.deepEqual(pinned.performance.steps.map(step=>[step.beats,step.transpose,step.active]),[[3,0,true],[5,-5,true],[2,0,false]])
 assert.equal(compileVoice(api,pinned).queryArc(2,2.5).length,0)
})

test('per-note slide uses canonical pattack and pan overrides after global controls', async () => {
 const api=await strudel(),kit=creative.createCreativeSession()
 kit.pieces.forEach(p=>p.active=p.id==='w:b1')
 Object.assign(kit.instruments['w:b1'],{pitchEnvelope:2,pitchAttack:.1,pianoRolls:[{bars:1,notes:[{start:0,duration:.5,degree:0,velocity:.7,slide:-3,slideSeconds:.6,pan:.49},{start:.5,duration:.25,degree:2,velocity:1},{start:.75,duration:.25,degree:4,velocity:.8,slide:3}]}]})
 const snapshot=creative.creativeSnapshot(kit,true),events=compileVoice(api,voiceSpecs(snapshot,null)[0]).queryArc(0,1)
 assert.equal(events[0].value.penv,-3);assert.equal(events[0].value.pattack,.6);assert.equal(events[0].value.pan,.49)
 assert.equal(events[1].value.penv,2);assert.equal(events[1].value.pattack,.1)
 assert.equal(events[2].value.penv,3);assert.equal(events[2].value.pattack,.5)
 assert.equal(events[0].value.ccSlide,undefined)
})
