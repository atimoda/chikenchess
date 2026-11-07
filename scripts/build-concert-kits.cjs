// New Classical chapters only. Existing three orchestras remain unchanged.
// node scripts/build-concert-kits.cjs; then npm run admin:check.
const fs=require('node:fs'),path=require('node:path')
const {loadTs}=require('../tests/helpers/music.cjs')
const {build}=require('./classical/concert-orchestration.cjs')
const root=path.resolve(__dirname,'..')
const {cities}=loadTs('lib/cities-data.ts')
const {createStyledCityKit,CITY_STYLE_REVISIONS}=loadTs('lib/music/styled-kits.ts')
const {TRIGGERS}=loadTs('lib/music/reactions.ts')
const {styleProfileSchema,validateOfficialKit}=loadTs('lib/admin/validation.ts')
function pattern(roll,ticks) {
 const res=ticks*4,cells=Array.from({length:roll.bars*res},()=>[]),ends=new Set()
 for(const n of roll.notes){const at=Math.min(cells.length-1,Math.round(n.start*res));cells[at].push(n.degree);ends.add(Math.round((n.start+n.duration)*res))}
 return cells.map((degrees,i)=>degrees.length?[...new Set(degrees)].join(',')+'_':ends.has(i)?'0?0':'.').join(' ')
}
function reactions(id) {
 const rule=(trigger,type,value,duration)=>({id:`${id}-${trigger}`,trigger,enabled:true,quantize:true,target:'both',duration,actions:[{type,value,scale:'Chromatic',harmony:'kit'}]})
 // Only dynamics: bank replacement against a different chromatic progression
 // would interrupt the written modulation and the long solo sentences.
 return {overrides:Object.keys(TRIGGERS),rules:[rule('opening','gain',-2,1),rule('check','gain',1,1),rule('quiet','gain',-2,2),rule('firstCastle','gain',1,2),rule('queenCapture','gain',-3,2)]}
}
async function main(){
 const {saveOfficialKit}=await import(path.join(root,'scripts/admin/official-kits.mjs'))
 for(const key of ['venice','copenhagen','paris']){
  const {score,desks,rolls,roots}=build(key),pulses=score.meter==='7/8'?7:4
  const profile={name:score.name,bpm:score.bpm,meter:score.meter,root:score.root,scale:'Chromatic',harmony:'kit',swing:0,
   sections:score.form.map(([,bars])=>bars*pulses),sectionLabels:score.form.map(([, ,label])=>label),harmonicSequences:score.form.map(([bank])=>roots[bank]),reactions:reactions(score.id),
   reference:score.reference,url:score.url,parts:desks.map((part,i)=>{
    const unpitched=['timpani','bassDrum','snare','cymbal','gong'].includes(part.role),bass=['bass','pizzBass','cello','pianoL'].includes(part.role)
    return {name:part.name,role:unpitched?'rhythm':bass?'bass':['lead','solo','pianoR','celloSolo'].includes(part.role)?'melody':'harmony',behavior:'phrase',
     source:{kind:'sample',bank:'classical',asset:part.asset,variant:part.variant,pitched:!unpitched},patterns:rolls[i].map(roll=>pattern(roll,score.ticks)),bars:score.bars,
     octave:part.octave,gain:part.gain,attack:part.asset.includes('piano')||unpitched?.001:part.asset.includes('pizz')||part.asset.includes('spiccato')?.004:.025,
     decay:.45,sustain:.9,release:part.asset.includes('piano')?.25:unpitched?.25:.12,clip:1,gate:.95,lpf:unpitched?part.role==='snare'?6500:10500:14000,hpf:part.role==='bass'||part.role==='pizzBass'||part.role==='bassDrum'?25:45,
     effects:{pan:part.pan,reverb:bass?.13:unpitched?.18:.25,delay:0},mapping:{fileDegrees:0,rankDegrees:0,panWidth:.12,previewFilter:false},
     arrangement:{active:score.form.map(([bank])=>part.banks.includes(String(bank))),variations:score.form.map(([bank])=>bank),transpose:score.form.map(()=>0),restart:true},
    }
   })}
  styleProfileSchema.parse(profile)
  fs.writeFileSync(path.join(root,'data/music/profiles',score.id+'.json'),JSON.stringify(profile,null,2)+'\n')
  const kit=createStyledCityKit(cities.find(c=>c.id===score.id),profile)
  for(const piece of kit.pieces){const slot=piece.color==='w'?piece.origin:`${piece.origin[0]}${9-Number(piece.origin[1])}`,index=desks.findIndex(p=>p.slot===slot);kit.instruments[piece.id].pianoRolls=rolls[index]}
  await saveOfficialKit(root,score.id,validateOfficialKit(score.id,kit,CITY_STYLE_REVISIONS[score.id]))
  console.log(`${score.id}: ${score.form.length} sections, ${score.form.reduce((n,s)=>n+s[1],0)} bars, ${rolls.flatMap(r=>r.flatMap(r=>r.notes)).length} notes per team`)
 }
}
main().catch(e=>{console.error(e);process.exitCode=1})
