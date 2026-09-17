const {test}=require('node:test')
const assert=require('node:assert/strict')
const {loadTs,strudel}=require('../helpers/music.cjs')
const {optimizeRoll,rollLaneNotation}=loadTs('lib/music/roll-optimizer.ts')

test('packed rolls preserve overlapping notes, chords, accents, slides and pan across cycle boundaries',async()=>{
 const api=await strudel()
 const notes=[
 {start:0,duration:.375,degree:48,velocity:.7},
 {start:0,duration:.375,degree:52,velocity:.7},
 {start:0,duration:.375,degree:52,velocity:.7},
 {start:.125,duration:.5,degree:55,velocity:.7},
 {start:.625,duration:.155,degree:60,velocity:1,slide:-3,slideSeconds:.2,pan:.8},
 {start:1.25,duration:.2125,degree:62,velocity:1},
 {start:1.75,duration:.25,degree:64,velocity:.7}]
 const roll={bars:2,notes}
 const decorate=(p,n)=>p.velocity(n.velocity).withValue(v=>({...v,...(n.slide?{penv:n.slide,pattack:n.slideSeconds}:{}),...(n.pan!==undefined?{pan:n.pan}:{})}))
 const legacy=api.stack(...notes.map(n=>api.timeCat(...[...(n.start?[[n.start,api.silence]]:[]),[n.duration,decorate(api.note(n.degree),n)],...(n.start+n.duration<roll.bars?[[roll.bars-n.start-n.duration,api.silence]]:[])]).slow(roll.bars)))
 const lanes=optimizeRoll(roll)
 assert.ok(lanes.length<notes.length)
 const packed=api.stack(...lanes.map(l=>decorate(api.note(rollLaneNotation(l)),l).slow(roll.bars)))
 const canonical=p=>p.queryArc(.2,6.1).map(h=>JSON.stringify([Number(h.whole.begin).toFixed(10),Number(h.whole.end).toFixed(10),h.value])).sort()
 assert.deepEqual(canonical(packed),canonical(legacy))
 assert.deepEqual(optimizeRoll({bars:1,notes:[]}),[])
})

test('manual reverb cache reuses buffers with fresh tails and invalidates changed settings',()=>{
 const {ManualReverbCache}=loadTs('lib/music/manual-reverb-cache.ts')
 const cache=new ManualReverbCache();let generated=0
 const context={createConvolver:()=>({connect(){},disconnect(){},buffer:null})}
 const make=()=>{const orbit={summingNode:{},getReverb:(duration=2)=>orbit.reverbNode??=Object.assign(context.createConvolver(),{buffer:{id:++generated},duration})};cache.attach(orbit,context);return orbit}
 const first=make().getReverb(2),secondOrbit=make(),second=secondOrbit.getReverb(2)
 assert.notEqual(first,second,'effect histories are isolated')
 assert.equal(first.buffer,second.buffer,'only immutable impulse samples are shared')
 assert.equal(generated,1)
 assert.equal(secondOrbit.getReverb(2),second)
 const changed=secondOrbit.getReverb(3)
 assert.notEqual(changed.buffer,first.buffer)
 assert.equal(generated,2)
 cache.clear();make().getReverb(2);assert.equal(generated,3)
})
