// CPU-only diagnostic: real Strudel patterns, mocked WebAudio. Not a device/audio benchmark.
const {loadTs,strudel}=require('../tests/helpers/music.cjs')
const {performance}=require('node:perf_hooks')
;(async()=>{
 const api=await strudel(),{MusicRuntime}=loadTs('lib/music/runtime.ts')
 const {defaultCityKit}=loadTs('lib/music/city-kits.ts'),{creativeSnapshot}=loadTs('lib/music/creative.ts')
 const snapshot=creativeSnapshot(defaultCityKit('manchester-1999'),true)
 snapshot.pieces=snapshot.pieces.map(p=>({...p,active:p.color==='w'}))
 const nodes={},runtime=new MusicRuntime(()=>{},e=>{throw e})
 runtime.api={...api,getAudioContext:()=>({currentTime:0}),getSuperdoughAudioController:()=>({nodes,getOrbit:id=>nodes[id]??={disconnect(){},output:{gain:{setTargetAtTime(){}}}}}),webaudioOutput:async()=>{}}
 runtime.scheduler={started:true,lastBegin:0,lastTick:0,latency:0,cps:.5,setCps(){},setPattern(){},stop(){}}
 runtime.unlock=async()=>{}
 runtime.sampleReady=()=>true
 const {loadedSamples}=loadTs('lib/music/strudel-loader.ts'),{sampleRegistration}=loadTs('lib/music/sample-banks.ts')
 for(const i of Object.values(snapshot.instruments))if(i.source?.kind==='sample')loadedSamples.add(sampleRegistration(i.source).sound)
 // Synthetic instrument avoids buffer loading; accompanying band remains real.
 snapshot.instruments['w:b1']={...snapshot.instruments['w:b1'],source:undefined}
 runtime.update(snapshot)
 let refreshes=0,lookups=0
 for(const [name,count]of [['refresh',()=>refreshes++],['patternFor',()=>lookups++]]){const fn=runtime[name].bind(runtime);runtime[name]=(...args)=>{count();return fn(...args)}}
 const times=[]
 for(let i=0;i<64;i++){const start=performance.now();runtime.audition('w:b1',['a3','b3','c3','d3','e3','f3','g3','h3'][i%8]);await Promise.resolve();await Promise.resolve();times.push(performance.now()-start)}
 times.sort((a,b)=>a-b)
 runtime.dispose()
 console.log(JSON.stringify({scenario:'64 square crossings, 16 active Manchester voices; mock audio',refreshes,patternLookups:lookups,medianMs:times[32],p95Ms:times[60]}))
})().catch(e=>{console.error(e);process.exitCode=1})
