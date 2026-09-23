const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs, renderMusicCode, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const variationEdit = loadTs('lib/music/variation-edit.ts')

test('variation actions mirror time, invert slides, and affect only the selected bank', () => {
 const instrument={...creative.createCreativeSession().instruments['w:b1'],notes:'0 [2 4] ~ -1*2',phrases:['0 [2 4] ~ -1*2','6 5 4']}
 const reversed=variationEdit.reverseVariation(instrument,0)
 assert.equal(reversed.phrases[0],'-1*2 ~ [4 2] 0')
 assert.equal(reversed.phrases[1],'6 5 4')
 assert.equal(reversed.notes,reversed.phrases[0])
 const rolls={...instrument,pianoRolls:[{bars:1,notes:[
  {start:0,duration:.25,degree:0,velocity:1,slide:3},{start:.25,duration:.5,degree:4,velocity:.8,slide:-2},{start:.75,duration:.25,degree:2,velocity:.7},
 ]},null]}
 assert.deepEqual(variationEdit.reverseVariation(rolls,0).pianoRolls[0].notes,[
  {start:0,duration:.25,degree:2,velocity:.7},
  {start:.25,duration:.5,degree:4,velocity:.8,slide:2},
  {start:.75,duration:.25,degree:0,velocity:1,slide:-3},
 ])
 const values=[0,.2,.99,.5];let cursor=0
 const randomized=variationEdit.randomizeVariation(instrument,0,()=>values[cursor++])
 assert.equal(randomized.phrases[0],'-1 [0 4] ~ 2*2')
 assert.equal(randomized.phrases[1],'6 5 4')
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

test('shared harmony moves melodic banks together and leaves pulse voices unchanged', () => {
 const kit=creative.createCreativeSession();kit.scale='Maior';kit.sectionPattern='1'
 for(const piece of kit.pieces)piece.active=['w:b1','w:a2'].includes(piece.id)
 const base=creative.creativeSnapshot(kit,true),harmonic={...base,harmony:'cadence'}
 const baseVoices=voiceSpecs(base,null),harmonicVoices=voiceSpecs(harmonic,null)
 const number=pattern=>Number(pattern.match(/-?\d+(?:\.\d+)?/)[0])
 const baseBass=baseVoices.find(voice=>voice.piece.id==='w:b1'),harmonicBass=harmonicVoices.find(voice=>voice.piece.id==='w:b1')
 assert.equal(harmonicBass.phrases.length,4)
 assert.equal(number(harmonicBass.phrases[1])-number(baseBass.phrases[0]),5)
 assert.deepEqual(harmonicVoices.find(voice=>voice.piece.id==='w:a2').phrases,baseVoices.find(voice=>voice.piece.id==='w:a2').phrases)
 kit.instruments['w:b1'].pianoRolls=[{bars:1,notes:[{start:0,duration:.5,degree:0,velocity:1}]}]
 const rollBase=voiceSpecs(creative.creativeSnapshot(kit,true),null).find(voice=>voice.piece.id==='w:b1')
 kit.harmony='cadence'
 const rollHarmony=voiceSpecs(creative.creativeSnapshot(kit,true),null).find(voice=>voice.piece.id==='w:b1')
 assert.equal(rollHarmony.pianoRolls[1].notes[0].degree-rollBase.pianoRolls[0].notes[0].degree,5)
})

test('moving harmony generates one voiced diatonic triad per sustain onset', async () => {
 const {harmonyFrame}=loadTs('lib/music/harmony.ts')
 const kit=creative.createCreativeSession(),id='w:e1'
 kit.scale='Maior';kit.harmony='cadence';kit.sectionPattern='1';kit.pieces.forEach(piece=>piece.active=piece.id===id)
 Object.assign(kit.instruments[id],{behavior:'sustain',phrases:['[0,2,4] ~ 2'],pianoRolls:undefined,groove:undefined,automations:undefined,mask:undefined})
 const phraseVoice=voiceSpecs(creative.creativeSnapshot(kit,true),null)[0]
 assert.match(phraseVoice.phrases[1],/\[48,53,57\]/)
 assert.equal((phraseVoice.phrases[1].match(/48,53,57/g)??[]).length,2,'an authored chord and a single note each become one voiced triad')
 const played=compileVoice(await strudel(),phraseVoice).queryArc(0,.01).map(event=>Number(event.value.note)).sort((a,b)=>a-b)
 assert.deepEqual(played,[48,53,57])
 assert.deepEqual(harmonyFrame('cadence',creative.creativeSnapshot(kit,true).scale,1),{
  plan:'cadence',planLabel:'I–IV–V–I - Cadência',section:1,degree:3,roman:'IV',
  chordDegrees:[3,5,7],chordNotes:['F','A','C'],chordName:'F',quality:'maior',
 })
 assert.deepEqual(harmonyFrame('static',['C4','C#4','D4','D#4','E4','F4','F#4','G4','G#4','A4','A#4','B4'],0).chordNotes,['C','E','G'])
 kit.instruments[id].pianoRolls=[{bars:1,notes:[
  {start:0,duration:.5,degree:0,velocity:1},{start:0,duration:.5,degree:2,velocity:.8},{start:.5,duration:.5,degree:4,velocity:.7},
 ]}]
 const rollVoice=voiceSpecs(creative.creativeSnapshot(kit,true),null)[0],notes=rollVoice.pianoRolls[1].notes
 assert.equal(notes.length,6)
 assert.deepEqual([...new Set(notes.filter(note=>note.start===0).map(note=>note.degree))],[48,53,57])
})

test('static harmony preserves authored sustain voicings', () => {
 const kit=creative.createCreativeSession(),id='w:e1'
 kit.scale='Maior';kit.harmony='static';kit.pieces.forEach(piece=>piece.active=piece.id===id)
 Object.assign(kit.instruments[id],{behavior:'sustain',phrases:['[0,3,6]'],pianoRolls:undefined,groove:undefined,automations:undefined,mask:undefined})
 assert.match(voiceSpecs(creative.creativeSnapshot(kit,true),null)[0].phrases[0],/\[48,53,59\]/)
})

test('editable notes keep their durations and independent loop lengths in real Strudel', async () => {
 const api=await strudel(),kit=creative.createDusseldorfSession()
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
 const api=await strudel(),kit=creative.createDusseldorfSession(),id='w:b1'
 Object.assign(kit.instruments[id],{notes:'0',phrases:['0','<0 2 4 6>'],selectedVariation:1,groove:undefined,automations:undefined,mask:undefined})
 const voice=voiceSpecs(creative.creativeSnapshot(kit,true),null).find(v=>v.piece.id===id)
 const pitches=compileVoice(api,voice).queryArc(0,4).map(h=>Number(h.value.note))
 assert.equal(new Set(pitches).size,4)
})

test('section form preserves asymmetric lengths, silence, transpose and restart selection', async () => {
 const api=await strudel(),kit=creative.createCreativeSession()
 const instrument=kit.instruments['w:b1']
 Object.assign(instrument,{notes:'0 1',phrases:['0 1','2 3'],pianoRolls:undefined,automations:undefined,mask:undefined,groove:undefined,performance:{restart:true,steps:[{beats:3,variation:0,transpose:0,active:true},{beats:5,variation:1,transpose:-5,active:true},{beats:2,variation:0,transpose:0,active:false}]}})
 kit.pieces.forEach(p=>p.active=p.id==='w:b1')
 const voice=voiceSpecs(creative.creativeSnapshot(kit,true),null)[0],pattern=compileVoice(api,voice)
 const events=pattern.queryArc(0,2.5).filter(h=>h.hasOnset())
 assert.ok(events.some(h=>Number(h.whole.begin)===.75),'second phrase restarts at the 3-beat boundary')
 assert.equal(pattern.queryArc(2,2.5).length,0,'muted section has no notes')
 const expected=compileVoice(api,{...voice,performance:undefined,sectionPattern:'1'}).queryArc(0,.1)[0].value.note-5
 assert.equal(events.find(h=>Number(h.whole.begin)===.75).value.note,expected)
 assert.equal(voiceSpecs({...creative.creativeSnapshot(kit,true),sectionOverrides:{'w:b1':1}},null)[0].performance,undefined)
 instrument.selectedVariation=0
 assert.equal(voiceSpecs(creative.creativeSnapshot(kit,true),null)[0].performance,undefined)
})

test('per-note slide uses canonical pattack and pan overrides after global controls', async () => {
 const api=await strudel(),kit=creative.createCreativeSession()
 kit.pieces.forEach(p=>p.active=p.id==='w:b1')
 Object.assign(kit.instruments['w:b1'],{phrases:['0'],groove:undefined,automations:undefined,mask:undefined,performance:undefined,pitchEnvelope:2,pitchAttack:.1,pianoRolls:[{bars:1,notes:[{start:0,duration:.5,degree:0,velocity:.7,slide:-3,slideSeconds:.6,pan:.49},{start:.5,duration:.25,degree:2,velocity:1},{start:.75,duration:.25,degree:4,velocity:.8,slide:3}]}]})
 const snapshot=creative.creativeSnapshot(kit,true),events=compileVoice(api,voiceSpecs(snapshot,null)[0]).queryArc(0,1)
 assert.equal(events[0].value.penv,-3);assert.equal(events[0].value.pattack,.6);assert.equal(events[0].value.pan,.49)
 assert.equal(events[1].value.penv,2);assert.equal(events[1].value.pattack,.1)
 assert.equal(events[2].value.penv,3);assert.equal(events[2].value.pattack,.5)
 assert.equal(events[0].value.ccSlide,undefined)
})
