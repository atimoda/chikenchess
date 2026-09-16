const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs, renderMusicCode, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')

test('editable notes keep their durations and independent loop lengths in real Strudel', async () => {
 const api=await strudel(),kit=creative.createDusseldorfSession()
 kit.instruments['w:b1'].pianoRolls=[{bars:.75,notes:[{start:0,duration:.125,degree:0,velocity:.7}]}]
 kit.instruments['w:b1'].selectedVariation=0
 const parsed=creative.parseCreativeSession(JSON.stringify(kit))
 const v=voiceSpecs(creative.creativeSnapshot(parsed,true),null).find(v=>v.piece.id==='w:b1')
 const hits=compileVoice(api,v).queryArc(0,3).filter(h=>h.hasOnset())
 assert.deepEqual(hits.map(h=>Number(h.whole.begin)),[0,.75,1.5,2.25])
 assert.ok(hits.every(h=>Number(h.whole.end.sub(h.whole.begin))===.125))
 assert.ok(renderMusicCode(creative.creativeSnapshot(parsed,true),null).includes('timeCat('))
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
 Object.assign(kit.instruments['w:b1'],{phrases:['0'],groove:undefined,automations:undefined,mask:undefined,performance:undefined,pitchEnvelope:2,pitchAttack:.1,pianoRolls:[{bars:1,notes:[{start:0,duration:.5,degree:0,velocity:.7,slide:-3,slideSeconds:.6,pan:.49},{start:.5,duration:.5,degree:2,velocity:1}]}]})
 const snapshot=creative.creativeSnapshot(kit,true),events=compileVoice(api,voiceSpecs(snapshot,null)[0]).queryArc(0,1)
 assert.equal(events[0].value.penv,-3);assert.equal(events[0].value.pattack,.6);assert.equal(events[0].value.pan,.49)
 assert.equal(events[1].value.penv,2);assert.equal(events[1].value.pattack,.1)
 assert.equal(events[0].value.ccSlide,undefined)
})
