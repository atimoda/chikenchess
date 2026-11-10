const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')

test('team mixer routes each side independently and quartz lock overrides prepared fine pitch', () => {
  const { TeamMixer, createTeamMixes, resolveDeckClock } = loadTs('lib/music/team-mixer.ts')
  const node = () => ({ connections: [], type: '', frequency: { value: 0, setTargetAtTime(value) { this.value = value } }, Q: {}, gain: { value: 0, setTargetAtTime(value) { this.value = value } }, connect(to) { this.connections.push(to) }, disconnect() { this.connections = [] } })
  const destination = node(), analyser = node()
  const mixer = new TeamMixer({ currentTime: 5, destination, createBiquadFilter: node, createGain: node }, analyser)
  const whiteOrbit = node(), blackOrbit = node()
  whiteOrbit.connect(destination)
  mixer.connect(whiteOrbit, 'w'); mixer.connect(blackOrbit, 'b')
  assert.deepEqual(whiteOrbit.connections, [mixer.sides.w.bass])
  assert.deepEqual(blackOrbit.connections, [mixer.sides.b.bass])
  const values = createTeamMixes(); values.w.bass = -9; values.w.gain = .4; values.w.filter = -.5; values.b.filter = .505
  mixer.update(values)
  assert.equal(mixer.sides.w.bass.gain.value, -9)
  assert.equal(mixer.sides.b.bass.gain.value, 0)
  assert.equal(mixer.sides.w.output.gain.value, .4)
  assert.equal(mixer.sides.w.filter.type, 'lowpass')
  assert.equal(mixer.sides.w.filter.frequency.value, 632)
  assert.equal(mixer.sides.b.filter.type, 'highpass')
  assert.equal(mixer.sides.b.filter.frequency.value, 632)
  values.w.filter = 0
  mixer.update(values)
  assert.equal(mixer.sides.w.filter.type, 'allpass')
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
      assert.equal(shifted[i].pianoRolls.length, normal[i].pianoRolls.length)
      for (let bank = 0; bank < normal[i].pianoRolls.length; bank++) {
        const before = normal[i].pianoRolls[bank], after = shifted[i].pianoRolls[bank]
        assert.equal(after.bars, before.bars)
        assert.equal(after.notes.length, before.notes.length)
        for (let note = 0; note < before.notes.length; note++) {
          assert.ok(Math.abs(after.notes[note].degree - before.notes[note].degree - 12 * Math.log2(1.05)) < 1e-8)
          assert.deepEqual({ ...after.notes[note], degree: before.notes[note].degree }, before.notes[note])
        }
      }
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

test('seeking preserves Pause, repeats downbeats and carries the remaining BPM ramp', async () => {
 const {MusicTransport}=loadTs('lib/music/transport.ts'),api=await strudel();let now=0
 const attacks=[]
 const transport=new MusicTransport({getTime:()=>now,latency:.1,onBoundary:()=>{},onError:error=>{throw error},onTrigger:(hap,_deadline,_duration,cps)=>attacks.push([Number(hap.whole.begin),cps])})
 try {
  await transport.setPattern(api.note('60*4'))
  transport.seek(2.25)
  assert.equal(transport.started,false);assert.equal(transport.cycle,2.25);assert.deepEqual(attacks,[])
  await transport.start()
  assert.equal(attacks[0][0],2.25)
  now=.6;transport.setCps(180/240,4)
  now=1;transport.tick()
  const before=transport.tempo.transition(transport.cycle),bpm=transport.tempo.bpmAt(transport.cycle),remaining=before.end-transport.cycle
  assert.ok(remaining>0)
  transport.seek(.75)
  assert.ok(Math.abs(transport.tempo.bpmAt(.75)-bpm)<1e-8)
  assert.ok(Math.abs(transport.tempo.transition(.75).end-(.75+remaining))<1e-8)
  const first=attacks.length
  transport.seek(.75)
  assert.equal(attacks.length,first+1)
  assert.equal(attacks.at(-1)[0],.75)
  transport.stop();assert.equal(transport.cycle,0)
 }finally{transport.stop()}
})

test('section seeks rebase queued harmonic changes onto the next bar without firing them early', () => {
 const {ReactionQueue}=loadTs('lib/music/reaction-queue.ts'),{reactionsSchema}=loadTs('lib/music/reactions.ts')
 const queue=new ReactionQueue(),config=reactionsSchema.parse({rules:[{id:'plan',trigger:'check',enabled:true,quantize:true,target:'both',duration:1,actions:[{type:'harmony',harmony:'cadence'}]}]})
 queue.update(config,{ply:0,states:[],events:[]},false,0,'kit')
 queue.update(config,{ply:1,states:[{trigger:'check',color:'w',ply:1}],events:[]},true,20.4,'kit')
 queue.rebase(3.25)
 assert.equal(queue.pending.get('plan').cycle,4)
 assert.equal(queue.advance(3.25).changed,false)
 assert.equal(queue.advance(4).changed,true)
})

test('queued sections pre-schedule exact downbeats while the audible clock remains in the old section', async () => {
 const {MusicTransport}=loadTs('lib/music/transport.ts'),api=await strudel()
 for(const pulses of [2,3,4,5,7])for(const target of [0,2.25]){
  let now=0,commits=0;const attacks=[]
  const transport=new MusicTransport({getTime:()=>now,latency:.1,onBoundary:()=>{},onError:error=>{throw error},onTrigger:(hap,_d,_duration,_cps,time)=>attacks.push({cycle:Number(hap.whole.begin),time})})
  try{
   transport.setMeter(pulses);transport.setCps(120/(60*pulses));transport.seek(.5)
   await transport.setPattern(api.note('60*8'));await transport.start()
   const deadline=transport.tempo.timeAt(.875)
   assert.equal(transport.queueSeek(.875,target,()=>commits++),true)
   assert.equal(transport.cycle,.5);assert.equal(commits,0)
   now=deadline-.05;transport.tick()
   assert.equal(commits,1)
   assert.ok(transport.cycle<.875&&transport.cycle>.5,'monitor must not jump with lookahead')
   assert.equal(transport.pendingSeekTarget,target)
   const landing=attacks.find(a=>a.cycle===target&&Math.abs(a.time-deadline)<1e-9)
   assert.ok(landing,'destination attack lands exactly at the old section boundary')
   now=deadline;assert.ok(Math.abs(transport.cycle-target)<1e-9)
   assert.equal(transport.pendingSeekTarget,undefined)
   now=deadline+.05;transport.tick();assert.ok(transport.cycle>target)
  }finally{transport.stop()}
 }
})

test('queued section replacement and cancellation never schedule an obsolete destination', async () => {
 const {MusicTransport}=loadTs('lib/music/transport.ts'),api=await strudel();let now=0
 const attacks=[],commits=[]
 const transport=new MusicTransport({getTime:()=>now,latency:.1,onBoundary:()=>{},onError:error=>{throw error},onTrigger:(hap,_d,_duration,_cps,time)=>attacks.push([Number(hap.whole.begin),time])})
 try{
  await transport.setPattern(api.note('60*4'));await transport.start()
  const deadline=transport.tempo.timeAt(.75)
  transport.queueSeek(.75,2,()=>commits.push(2))
  transport.queueSeek(.75,1.25,()=>commits.push(1.25))
  now=deadline-.05;transport.tick()
  assert.deepEqual(commits,[1.25]);assert.ok(attacks.some(([c,t])=>c===1.25&&Math.abs(t-deadline)<1e-9))
  assert.ok(!attacks.some(([c])=>c===2))
  now=deadline+.3;transport.tick()
  transport.queueSeek(2,3,()=>commits.push(3));transport.cancelQueuedSeek()
  now=transport.tempo.timeAt(2)-.05;transport.tick()
  assert.deepEqual(commits,[1.25]);assert.equal(transport.pendingSeekTarget,undefined)
  transport.queueSeek(3,4,()=>{});transport.stop()
  assert.equal(transport.pendingSeekTarget,undefined)
 }finally{transport.stop()}
})

test('queued section transitions keep the instantaneous BPM and remaining ramp at their deadline', async () => {
 const {MusicTransport}=loadTs('lib/music/transport.ts'),api=await strudel();let now=0
 const transport=new MusicTransport({getTime:()=>now,latency:.1,onBoundary:()=>{},onError:error=>{throw error},onTrigger:()=>{}})
 try{
  await transport.setPattern(api.note('60*4'));await transport.start();transport.setCps(180/240,4)
  const old=transport.tempo,deadline=old.timeAt(1),bpm=old.bpmAt(1),remaining=old.transition(1).end-1
  transport.queueSeek(1,.25,()=>{})
  now=deadline-.04;transport.tick();assert.equal(transport.tempo,old)
  now=deadline;assert.ok(Math.abs(transport.tempo.bpmAt(.25)-bpm)<1e-9)
  assert.ok(Math.abs(transport.tempo.transition(.25).end-(.25+remaining))<1e-9)
 }finally{transport.stop()}
})

test('simple and compound meters give each bar its real pulse duration', () => {
 const {TempoMap}=loadTs('lib/music/transport.ts')
 for(const [pulses,bpm,expected] of [[3,120,1.5],[2,90,4/3],[4,80,3]]){
  const map=new TempoMap(bpm,0,pulses)
  assert.ok(Math.abs(map.timeAt(1)-expected)<1e-9)
  map.change(1,bpm*1.5,2)
  for(const bar of [0,1,1.5,2,3,4])assert.ok(Math.abs(map.cycleAt(map.timeAt(bar))-bar)<1e-8)
 }
})

test('waltz and ballad stages place accents in 3/4, 6/8 and 12/8 rather than a four-beat grid', async () => {
 const {defaultCityKit}=loadTs('lib/music/city-kits.ts')
 const {renderMusicCode}=loadTs('lib/music/code-export.ts')
 const checks=[
  ['new-york-1962','3/4',3,'Acordes rítmicos',[1/6,2/3]],
  ['dublin-1990','6/8',2,'Batida no quatro',[1/2]],
  ['new-orleans-1953','12/8',4,'Ride ternário',[0,2/12,3/12]],
 ]
 for(const [id,meter,pulses,name,onsets] of checks){
  const kit=defaultCityKit(id),snapshot=creative.creativeSnapshot(kit,true)
  assert.equal(kit.meter,meter)
  const instrument=Object.values(kit.instruments).find(item=>item.name===name)
  assert.ok(instrument,`${id} instrument`)
  const roll=instrument.pianoRolls[0]
  for(const onset of onsets)assert.ok(roll.notes.some(note=>Math.abs(note.start-onset)<1e-8),`${id} onset ${onset}`)
  assert.match(renderMusicCode(snapshot,null),new RegExp(`setcps\\(${kit.bpm} / 60 / ${pulses}\\)`))
 }
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
