// Rebuild the portable kit and its Strudel score from the game's source of truth.
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const root = path.resolve(__dirname, '..'), cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const mod = new Module(file, module)
  cache.set(file, mod)
  mod.filename = file
  mod.paths = module.paths
  const original = mod.require.bind(mod)
  mod.require = name => {
    const relative = path.resolve(path.dirname(file), `${name}.ts`)
    return name.startsWith('.') && fs.existsSync(relative) ? load(relative) : original(name)
  }
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file)
  return mod.exports
}
// User-supplied eefano arrangement, queried with real Strudel to preserve timing.
// Original tempo is 8 times our four-beat cycle; .fast(8) keeps its real durations at 215 BPM.
async function main() {
  globalThis.window = {addEventListener(){}, removeEventListener(){}}
  globalThis.document = {addEventListener(){}, removeEventListener(){}, dispatchEvent(){}}
  const api = await import('@strudel/web/dist/index.mjs'); api.miniAllStrings()
  const {createCreativeSession,creativeSchema,creativeSnapshot}=load(path.join(root,'lib/music/creative.ts'))
  const kit=createCreativeSession()
  Object.assign(kit,{name:'Mouth Breather · estudo eefano',cityId:undefined,bpm:215,root:'C',scale:'Chromatic',volume:.65,grooves:{}})
  for(const p of kit.pieces)p.active=false
  const sections=[['G',3],['GDB'.slice(0,2),6],['GDB',6],['G1D',3],['GDB',3],['G1D',3],['GDB',3],['GDB',3,-5],['GDB',3,-7],['DB',6],['GDB',3],['',1],['GDB',6],['GDB',3,-5],['GDB',3,-7],['D',3],['',3]]
  const total=sections.reduce((n,s)=>n+s[1]*8,0)
  console.log('Form beats:',total)
  const structure=api.mini('<x!4 ~!2 x!9 x@3 x!6>')
  const guitar=api.stack(api.note('<48@9 49 48@2>').pan(.51),api.mini('<55 53@2 55@4 53 55 56 55 53>').add('<0,5>').note().pan(.49)).struct(structure).fast(8)
  const slide=api.mini('<[48,55,60]@3 ~@45>').add(-8).note().penv(-3).patt(.6).fast(8)
  const bass=api.note('<36!3 36@2 ~ 36!3 <[37 41 37] [36 41 43]>@3>').fast(8)
  const drums=api.s('<[bd ~ bd sd ~ bd!2 ~!2 bd sd ~ bd ~!2 bd sd bd ~ bd sd ~ bd ~],oh*12,cr*2>/24').fast(8)
  function roll(pattern,bars,base=48,filter=()=>true){
    const notes=pattern.queryArc(0,bars).filter(h=>h.hasOnset()&&filter(h.value)).map(h=>({start:Number(h.whole.begin),duration:Math.min(bars-Number(h.whole.begin),Number(h.whole.end.sub(h.whole.begin))),degree:typeof h.value.note==='number'?h.value.note-base:0,velocity:1,...(h.value.pan!==undefined?{pan:h.value.pan}:{}),...(h.value.penv?{slide:h.value.penv,slideSeconds:h.value.pattack}: {})}))
    console.log('roll',bars,notes.length,notes.slice(0,2))
    return {bars,notes}
  }
  function instrument(id,name,part,rolls,source,octave,gain,fx={}){
    const p=kit.pieces.find(p=>p.id===id);p.active=true
    const i=kit.instruments[id]
    Object.assign(i,{name,behavior:part==='D'?'pulse':'phrase',source,sound:'sine',notes:'~',phrases:rolls.map(()=>'~'),pianoOnly:true,pianoRolls:rolls,octave,gain,attack:.003,release:part==='B'?.06:.09,decay:.15,sustain:.65,clip:.95,lpf:part==='G'?3000:9000,hpf:part==='G'?80:30,mask:undefined,groove:undefined,automations:undefined,selectedVariation:undefined,performance:{restart:true,steps:sections.map(([parts,weight,transpose=0])=>({beats:weight*8,variation:part==='G'&&parts.includes('1')?1:0,transpose:part==='D'?0:transpose,active:parts.includes(part)}))}})
    if(part!=='D')Object.assign(i,{distortion:part==='G'?10:5,distortionMix:part==='G'?.17:.31})
    kit.effects[id]={gain:1,pitch:1,pan:0,delay:0,decay:.15,reverb:part==='D'?.3:part==='G'?.1:.2,...fx}
    kit.mappings[id]={fileDegrees:0,rankDegrees:0,panWidth:0,previewFilter:false}
  }
  const source=(bank,asset,pitched)=>({kind:'sample',bank,asset,variant:0,pitched})
  instrument('w:d1','Guitarra · riff e queda','G',[roll(guitar,3),roll(slide,6)],source('chicken-world-v1','guitar',true),3,.34)
  instrument('w:b1','Baixo · frase quebrada','B',[roll(bass,3,36)],source('chicken-jazz-v1','pluck',true),2,.33)
  for(const [id,sound,asset,gain,speed,pan] of [['w:a2','bd','kick',.48,1,0],['w:b2','sd','snare',.3,.88,0],['w:c2','oh','open-hat',.12,.9,-.1],['w:d2','cr','crash',.14,.95,.1]]) {
    instrument(id,`Bateria · ${sound}`,'D',[roll(drums,3,0,v=>v.s===sound)],source(asset==='crash'?'chicken-world-v1':'chicken-electro-v1',asset,false),2,gain,{pitch:speed,pan})
    if(sound==='bd')kit.instruments[id].lpf=1800
  }
  const clean=creativeSchema.parse(kit),dest=path.join(root,'public/presets')
  fs.mkdirSync(dest,{recursive:true})
  fs.writeFileSync(path.join(dest,'mouth-breather.json'),JSON.stringify(clean,null,2)+'\n')
  fs.writeFileSync(path.join(dest,'mouth-breather.strudel'),'// Mouth Breather — The Jesus Lizard; arrangement study from user-supplied script by eefano.\n// Timing/notes adapted from that script; original synthetic local samples replace GM/Linn.\n'+load(path.join(root,'lib/music/runtime.ts')).renderMusicCode(creativeSnapshot(clean,true),null)+'\n')
}
main().catch(e=>{console.error(JSON.stringify(e.issues??String(e),null,2));process.exitCode=1})
