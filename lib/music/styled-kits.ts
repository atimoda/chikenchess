import { STYLE_PROFILES } from './kit-profiles/catalog'
export { STYLE_PROFILES } from './kit-profiles/catalog'
import {createCreativeSession,creativeSchema,type CreativeSession} from './creative'
import type {PianoRoll} from './piano-roll'
import {createManchesterJazzKit} from './manchester-kit'
import type {CityData} from '../cities-data'
export const STYLE_REVISION='styles-2026-09-14-v1'
export function phraseRoll(text:string,bars:number,swing=0,gate=.65):PianoRoll{
 const tokens=text.split(' '),unit=bars/tokens.length
 return {bars,notes:tokens.flatMap((token,i)=>token==='.'?[]:token.split(',').map(n=>({start:(i+(i%2?swing:0))*unit,duration:Math.min(unit*gate,bars-(i+(i%2?swing:0))*unit),degree:Number(n),velocity:i%2?.7:1})))}
}
const world=new Set(['guitar','strings','flute','marimba','conga','timpani','tambourine','crash'])
function source(asset:string,pitched=true){return {kind:'sample' as const,bank:world.has(asset)?'chicken-world-v1': ['keys','formant','brass','reed','pluck','baritone','ride'].includes(asset)?'chicken-jazz-v1':'chicken-electro-v1',asset,variant:0,pitched}}
export function createStyledCityKit(city:CityData):CreativeSession{
 if(city.id==='manchester-1999'){
  const kit=createManchesterJazzKit();kit.catalogRevision=STYLE_REVISION
  for(const p of kit.pieces)if(p.type!=='p'){
   const inst=kit.instruments[p.id];inst.performance={restart:true,steps:[{beats:16,variation:0,transpose:0,active:true},{beats:32,variation:1,transpose:0,active:true},{beats:16,variation:2,transpose:0,active:true},{beats:32,variation:3,transpose:0,active:true}]}
   if(p.origin[0]==='d')inst.automations={...inst.automations,penv:{kind:'pattern',patterns:['0','0','0','<0 0 0 -2>']},patt:{kind:'pattern',patterns:['.09']}}
  }
  return creativeSchema.parse(kit)
 }
 const p=STYLE_PROFILES[city.id];if(!p)throw new Error(`Perfil ausente: ${city.id}`)
 const kit=createCreativeSession();Object.assign(kit,{catalogRevision:STYLE_REVISION,cityId:city.id,name:p.name,bpm:p.bpm,root:p.root,scale:p.scale,volume:.68,grooves:{},sectionPattern:'[0@4 1@4 2@2 3@4]/14'})
 const drums=['kick','snare','hat','clap','open-hat','conga','rim','tambourine']
 for(const piece of kit.pieces){
  piece.active=piece.color==='w';const inst=kit.instruments[piece.id],file=piece.origin.charCodeAt(0)-97,drum=piece.type==='p'&&city.id!=='vienna'
  Object.assign(inst,{source:undefined,mask:undefined,groove:undefined,automations:undefined,selectedVariation:undefined,phrases:undefined,pianoRolls:undefined,notes:'0',sound:'sine',attack:.004,release:.08,decay:.15,sustain:.6,clip:.9,hpf:30,lpf:9000})
  if(drum){
   inst.name=['Bumbo','Caixa','Chimbal','Palmas','Chimbal aberto','Conga','Rim','Pandeiro'][file];inst.behavior='pulse';inst.source=source(drums[file],false);inst.octave=2;inst.gain=[.52,.32,.14,.13,.1,.19,.12,.12][file]
   const hits=p.drums[file]
   inst.pianoRolls=[0,1,2,3].map(v=>({bars:1,notes:[...new Set([...hits,...(v===3&&file===1?[14,15]:v===1&&file===2?[15]:[])])].filter((_,i)=>v!==2||i%2===0).map((step,i)=>({start:(step+(step%2?p.swing:0))/16,duration:.045,degree:0,velocity:v===3&&file===1&&step>=14?.45:i%2?.62:1}))}))
  }else{
   const bass=file===1||file===6, harmony=file===2||file===5||file===4,main=file===3,asset=bass?'pluck':harmony?p.colors[1]:main?p.colors[0]:p.colors[2]
   inst.name=`${bass?'Baixo':harmony?'Harmonia':main?'Melodia':'Resposta'} · ${asset}`;inst.behavior=harmony?'sustain':'phrase';inst.source=source(asset,true);inst.octave=bass?2:main?4:3;inst.gain=bass?.31:harmony?.11:main?.23:.13
   if(['manchester','detroit','chicago','berlin','saopaulo'].includes(city.id)&&bass){inst.source={kind:'synth'};inst.sound=city.id==='manchester'?'sawtooth':'square';inst.lpf=city.id==='manchester'?1200:850;inst.distortion=city.id==='berlin'?3:1;inst.distortionMix=.18}
   const patterns=bass?p.bass:harmony?['0,2,4 . . . 0,2,4 . . .','3,5,7 . . . 3,5,7 . . .','5,7,9 . . . . . . .','4,6,8 . . . 4,6,8 . . .']:p.lead
   const bars=bass?p.bassBars:harmony?2:main?p.leadBars:p.accentBars
   inst.pianoRolls=patterns.map((text,v)=>{
    const roll=phraseRoll(text,bars,p.swing,harmony?.85:.62)
    // Responses leave room for the main phrase; second bass answers, rather than doubling every onset.
    if(file===6||file===0||file===7)roll.notes=roll.notes.filter((_,i)=>i%2===1)
    if((city.id==='manchester'||city.id==='paris')&&bass&&v===3&&roll.notes.length)Object.assign(roll.notes.at(-1)!,{slide:-3,slideSeconds:.12})
    return roll
   })
   if(city.id==='vienna'&&piece.type==='p'){
    inst.name=`${file%2?'Madeiras':'Cordas'} · voz ${file+1}`;inst.source=source(file%2?'flute':'strings',true);inst.gain=.085;inst.octave=file<4?3:4
    inst.pianoRolls=p.lead.map((text,v)=>phraseRoll(text.split(' ').map((t,i)=>i%4===file%4?t:'.').join(' '),v===2?3:2,0,.75))
    if(file===7){inst.name='Tímpanos · pontuação';inst.source=source('timpani',true);inst.octave=2;inst.pianoRolls=[0,1,2,3].map(v=>phraseRoll(v===3?'0 . 4 .':'0 . . .',2,0,.4))}
   }
   inst.automations={gain:{kind:'pattern',patterns:['1 .8 .9 .7','1 .75 .85 .7','.7 .6','.95 .8 1 .65']}}
   if(['manchester','detroit','paris','berlin'].includes(city.id))inst.automations.lpf={kind:'pattern',patterns:[`${inst.lpf}`,`${Math.min(8000,inst.lpf*1.5)}`,`${Math.max(300,inst.lpf*.4)}`,`${inst.lpf}`]}
  }
  inst.pianoOnly=true
  inst.phrases=['~','~','~','~']
  inst.performance={restart:!(file===0||file===7),steps:p.sections.map((beats,i)=>({beats,variation:Math.min(i,3),transpose:0,active:!(i===2&&(file===0||file===7||drum&&file>=3))}))}
  kit.effects[piece.id]={gain:piece.color==='w'?1:.72,pitch:1,pan:piece.color==='w'?-.12:.12,delay:!drum&&file===7?.12:0,reverb:city.id==='vienna'?.18:drum?.025:.1,decay:.16}
  kit.mappings[piece.id]={fileDegrees:drum?0:.25,rankDegrees:0,panWidth:.35,previewFilter:true}
 }
 return creativeSchema.parse(kit)
}
