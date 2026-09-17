// Bounded pattern benchmark, not WebAudio/device profiling. Compare in one process.
const {loadTs,strudel}=require('../tests/helpers/music.cjs')
const {performance}=require('node:perf_hooks')
;(async()=>{
 const api=await strudel(),{optimizeRoll,rollLaneNotation}=loadTs('lib/music/roll-optimizer.ts')
 const {defaultCityKit}=loadTs('lib/music/city-kits.ts')
 const stack=patterns=>patterns.length===1?patterns[0]:api.stack(...patterns)
 const builders={
  individual:roll=>stack(roll.notes.map(n=>api.timeCat(...[...(n.start?[[n.start,api.silence]]:[]),[n.duration,api.note(n.degree).velocity(n.velocity)],...(n.start+n.duration<roll.bars?[[roll.bars-n.start-n.duration,api.silence]]:[])]).slow(roll.bars))),
  grouped:roll=>stack(optimizeRoll(roll).map(lane=>api.timeCat(...lane.segments.map(s=>[s.duration,!s.notes?api.silence:stack(s.notes.map(n=>api.note(n)))])).velocity(lane.velocity).slow(roll.bars))),
  mini:roll=>stack(optimizeRoll(roll).map(lane=>api.note(rollLaneNotation(lane)).velocity(lane.velocity).slow(roll.bars)))
 }
 for(const city of ['dusseldorf','vienna']){
  const rolls=Object.values(defaultCityKit(city).instruments).flatMap(i=>i.pianoRolls??[]).filter(Boolean)
  for(const [strategy,build] of Object.entries(builders)){
   const start=performance.now(),patterns=rolls.map(build),compiled=performance.now();let events=0
   for(let repeat=0;repeat<5;repeat++)for(const pattern of patterns)for(let cycle=0;cycle<8;cycle++)events+=pattern.queryArc(cycle,cycle+1).length
   console.log(JSON.stringify({city,strategy,rolls:rolls.length,compileMs:compiled-start,queryMs:performance.now()-compiled,events}))
  }
 }
})().catch(error=>{console.error(error);process.exitCode=1})
