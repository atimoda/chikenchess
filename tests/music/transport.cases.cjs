const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')

test('team mixer routes each side independently and quartz lock overrides prepared fine pitch', () => {
  const { TeamMixer, createTeamMixes, resolveDeckClock } = loadTs('lib/music/team-mixer.ts')
  const node = () => ({ connections: [], frequency: {}, Q: {}, gain: { value: 0, setTargetAtTime(value) { this.value = value } }, connect(to) { this.connections.push(to) }, disconnect() { this.connections = [] } })
  const destination = node(), analyser = node()
  const mixer = new TeamMixer({ currentTime: 5, destination, createBiquadFilter: node, createGain: node }, analyser)
  const whiteOrbit = node(), blackOrbit = node()
  whiteOrbit.connect(destination)
  mixer.connect(whiteOrbit, 'w'); mixer.connect(blackOrbit, 'b')
  assert.deepEqual(whiteOrbit.connections, [mixer.sides.w.bass])
  assert.deepEqual(blackOrbit.connections, [mixer.sides.b.bass])
  const values = createTeamMixes(); values.w.bass = -9; values.w.gain = .4
  mixer.update(values)
  assert.equal(mixer.sides.w.bass.gain.value, -9)
  assert.equal(mixer.sides.b.bass.gain.value, 0)
  assert.equal(mixer.sides.w.output.gain.value, .4)
  assert.deepEqual(mixer.sides.w.output.connections, [destination, analyser])
  assert.deepEqual(resolveDeckClock(120, 118, 5, false), { bpm: 126, tuning: 1.05 })
  assert.deepEqual(resolveDeckClock(120, 118, 5, true), { bpm: 118, tuning: 1 })
  assert.deepEqual(resolveDeckClock(120, 118, -8, true), { bpm: 118, tuning: 1 })
  mixer.dispose()
  assert.equal(mixer.sides.w.output.connections.length, 0)
})

test('fine pitch changes synth tuning and sample speed consistently across both teams', () => {
  const kit = creative.createDusseldorfSession()
  const snapshot = creative.creativeSnapshot(kit, true)
  snapshot.pieces = snapshot.pieces.map(p => ({ ...p, active: true }))
  const normal = voiceSpecs(snapshot, null), shifted = voiceSpecs({ ...snapshot, tuning: 1.05 }, null)
  for (let i = 0; i < normal.length; i++) {
    if (normal[i].unpitched) assert.ok(Math.abs(shifted[i].controls.speed / normal[i].controls.speed - 1.05) < 1e-8)
    else {
      const firstNote = s => Number(s.match(/\d+(\.\d+)?/)[0])
      assert.ok(Math.abs(firstNote(shifted[i].notes) - firstNote(normal[i].notes) - 12 * Math.log2(1.05)) < 1e-8)
    }
  }
})

test('timed reaction snapshots hold both entry and return without freezing unrelated base edits', () => {
  const { reactionsSchema, reactionEntries, applyReactions }=loadTs('lib/music/reactions.ts')
  const config=reactionsSchema.parse({rules:[{id:'q',trigger:'queenCapture',enabled:true,quantize:true,target:'both',duration:1,actions:[{type:'bpm',value:10}]}]})
  const idle={ply:0,states:[],events:[]}, hit={ply:1,states:[],events:[{trigger:'queenCapture',color:'w',ply:1}]}
  const base=creative.creativeSnapshot(creative.createDusseldorfSession(),true)
  const before=reactionEntries(config,idle), active=reactionEntries(config,hit)
  assert.equal(applyReactions(base,config,hit,before).snapshot.bpm,base.bpm)
  assert.equal(applyReactions(base,config,hit,active).snapshot.bpm,base.bpm*1.1)
  assert.equal(applyReactions({...base,bpm:100},config,{...hit,ply:2},active).snapshot.bpm,110.00000000000001)
  const expired=reactionEntries(config,{...hit,ply:2})
  assert.equal(applyReactions(base,config,{...hit,ply:2},expired).snapshot.bpm,base.bpm)
  assert.equal(creative.parseCreativeSession(JSON.stringify({...creative.createCreativeSession(),reactions:config})).reactions.rules[0].quantize,true)
  const old=JSON.parse(JSON.stringify(config));delete old.rules[0].quantize
  assert.equal(reactionsSchema.parse(old).rules[0].quantize,false)
})

test('audio tempo map integrates ramps exactly and preserves phase when interrupted', () => {
 const {TempoMap}=loadTs('lib/music/transport.ts'),t=new TempoMap(120,10)
 assert.equal(t.timeAt(1),12)
 t.change(1,180,4)
 assert.equal(t.bpmAt(3),150)
 for(const c of [0,1,1.5,3,5,7])assert.ok(Math.abs(t.cycleAt(t.timeAt(c))-c)<1e-8)
 const before=t.timeAt(2.5);t.change(2.5,90,2)
 assert.equal(t.timeAt(2.5),before)
 assert.equal(t.bpmAt(4.5),90)
 assert.ok(Math.abs(t.cycleAt(t.timeAt(7))-7)<1e-8)
})

test('audio scheduler switches before the downbeat query and schedules through a BPM ramp', async () => {
 const {MusicTransport}=loadTs('lib/music/transport.ts');let now=0,switched=false
 const scheduled=[],boundaries=[]
 const api=await strudel()
 const transport=new MusicTransport({getTime:()=>now,latency:.18,onError:e=>{throw e},onBoundary:c=>{boundaries.push(c);if(c===1){switched=true;transport.setCps(180/240,2);transport.setPattern(api.note('72*4'))}},onTrigger:(h,d,duration,cps,time)=>scheduled.push({note:h.value.note,cycle:Number(h.whole.begin),time,duration,cps})})
 await transport.setPattern(api.note('60*4'));await transport.start()
 for(now=.025;now<7;now+=.025)transport.tick()
 transport.stop()
 assert.ok(switched)
 const downbeat=scheduled.find(n=>n.cycle===1)
 assert.equal(Number(downbeat.note),72)
 assert.ok(Math.abs(downbeat.time-2.03)<1e-8)
 assert.ok(scheduled.every(n=>n.duration>0))
 assert.equal(new Set(scheduled.map(n=>n.cycle)).size,scheduled.length)
 assert.ok(scheduled.find(n=>n.cycle===2).cps>scheduled.find(n=>n.cycle===1).cps)
})

test('queued rules coalesce, cancel stale events, and apply independently at audio boundaries', () => {
 const {ReactionQueue}=loadTs('lib/music/reaction-queue.ts'),{reactionsSchema}=loadTs('lib/music/reactions.ts')
 const q=new ReactionQueue(),idle={ply:0,states:[],events:[]},active={ply:0,states:[{trigger:'check',color:'w',ply:0}],events:[]}
 const config=reactionsSchema.parse({rules:[{id:'check',trigger:'check',enabled:true,quantize:true,target:'both',duration:1,actions:[{type:'bpm',value:10,rampBars:4}]}]})
 q.update(config,idle,false,0,'a');q.update(config,active,true,.2,'a')
 assert.equal(q.pending.get('check').cycle,1)
 q.update(config,idle,true,.8,'a');assert.equal(q.pending.size,0)
 q.update(config,active,true,.9,'a');assert.equal(q.advance(.99).changed,false)
 assert.deepEqual(q.advance(1),{changed:true,bars:4});assert.equal(q.entries.get('check').hit.color,'w')
 q.update(config,idle,true,1.4,'a');assert.equal(q.entries.get('check').hit.color,'w')
 q.advance(2);assert.equal(q.entries.get('check').hit,undefined)
 q.update(config,active,true,2.5,'a');q.update(config,idle,false,2.6,'a');assert.equal(q.pending.size,0)
})
