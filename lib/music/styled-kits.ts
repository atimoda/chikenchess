import {createCreativeSession,creativeSchema,type CreativeSession} from './creative'
import type {PianoRoll} from './piano-roll'
import {createManchesterJazzKit} from './manchester-kit'
import type {CityData} from '../cities-data'
export const STYLE_REVISION='styles-2026-09-14-v1'
type Profile={name:string;bpm:number;root:CreativeSession['root'];scale:CreativeSession['scale'];bass:string[];lead:string[];drums:number[][];bassBars:number;leadBars:number;accentBars:number;swing:number;colors:[string,string,string];sections:number[];reference:string;url:string}
const four=[[0,4,8,12],[4,12],[2,6,10,14],[3,11],[14],[7,15],[6,13],[0,3,6,8,11,14]]
const broken=[[0,6,8,11],[4,12],[0,2,5,6,8,10,13,14],[7,15],[10],[3,14],[5,11],[1,4,7,10,13]]
export const STYLE_PROFILES:Record<string,Profile>={
 dusseldorf:{name:'Rhein · laboratório motorik',bpm:118,root:'E',scale:'Dórica',bass:['0 . 0 0 4 . 0 3','0 0 . 4 0 . 6 4','0 . . . 4 . . .','0 0 4 0 3 2 0 .'],lead:['0 2 3 4 6 4 3 2','0 3 4 . 6 7 6 4','7 . 6 . 4 . 2 .','0 2 0 3 4 6 4 .'],drums:four,bassBars:1,leadBars:2,accentBars:1.5,swing:0,colors:['flute','strings','guitar'],sections:[16,16,8,16],reference:'Kraftwerk — Ruckzuck (1970); fase inicial experimental, anterior ao electro-pop',url:'https://en.wikipedia.org/wiki/Kraftwerk_(album)'},
 nyc:{name:'Loft · disco de cordas',bpm:116,root:'A',scale:'Dórica',bass:['0 . 7 0 . 4 5 4','0 0 . 2 4 . 6 7','0 . 4 . 6 4 2 .','0 7 6 4 . 2 3 4'],lead:['4 . 6 7 . 6 4 2','7 6 . 4 2 . 0 .','4 . . 2 0 . 2 .','4 6 7 9 7 . 6 4'],drums:four,bassBars:2,leadBars:4,accentBars:1,swing:.08,colors:['brass','strings','guitar'],sections:[16,16,8,16],reference:'Chic — Dance, Dance, Dance (1977)',url:'https://jameshamiltonsdiscopage.com/chart-archive/a-full-list-of-all-record-mirror-uk-disco-chart-entries-1975-1979/'},
 chicago:{name:'Warehouse · primeiras máquinas',bpm:122,root:'C',scale:'Pentatônica menor',bass:['0 . 0 2 . 3 0 .','0 0 . 3 4 . 3 2','0 . . 0 . . 3 .','0 . 2 3 0 4 . 3'],lead:['0 . 2 . 3 . . .','3 2 . 0 . 2 . 4','0 . . . . . 2 .','0 2 3 . 4 3 2 .'],drums:four,bassBars:1,leadBars:2,accentBars:1.75,swing:.06,colors:['keys','formant','guitar'],sections:[16,16,8,8],reference:'Jesse Saunders — On and On (1984)',url:'https://iumag.co.uk/chicagos-jesse-saunders-released-the-first-house-record-in-1984-exclusive-interview/'},
 detroit:{name:'Metro · circuitos sincopados',bpm:126,root:'F',scale:'Menor natural',bass:['0 . . 0 . 4 0 6','0 7 . 0 3 . 4 .','0 . 0 . . . 4 .','0 . 6 4 3 2 . 0'],lead:['0 4 . 6 7 . 4 .','7 . 6 4 . 3 2 .','4 . . 3 . . 0 .','0 2 4 . 7 6 . 4'],drums:broken,bassBars:1,leadBars:2,accentBars:1.75,swing:0,colors:['marimba','strings','keys'],sections:[16,16,12,4,16],reference:"Model 500 — No UFO’s (1985)",url:'https://bleep.com/release/90436-model-500-no-ufos-remixes'},
 ibiza:{name:'Amnesia · horizonte balearic',bpm:104,root:'D',scale:'Mixolídia',bass:['0 . . 4 . . 6 .','0 . 2 . 4 . 2 .','0 . . . 4 . . .','0 . 4 6 . 4 2 .'],lead:['0 . 2 4 . 6 4 .','7 . 6 . 4 2 . 0','4 . . . 2 . 0 .','0 2 . 4 6 . 7 .'],drums:[[0,8],[4,12],[2,6,10,14],[7],[14],[3,7,10,15],[1,9],[0,3,6,10,13]],bassBars:2,leadBars:4,accentBars:1.5,swing:.12,colors:['flute','strings','guitar'],sections:[16,16,12,16],reference:'Art of Noise — Moments in Love (1983), repertório balearic de Alfredo',url:'https://banbantonton.com/2023/07/14/looking-for-the-balearic-beat-soundtracking-paradise/'},
 manchester:{name:'Hacienda · ácido em espiral',bpm:125,root:'G',scale:'Menor natural',bass:['0 0 7 . 0 3 4 0','0 7 0 6 . 4 3 0','0 . . 7 0 . 3 .','0 3 0 4 7 6 4 3'],lead:['0 . . 3 4 . 6 .','7 . 6 4 . 3 . 0','4 . . . . 3 . .','0 3 4 6 7 . 4 .'],drums:four,bassBars:1,leadBars:2,accentBars:.75,swing:.09,colors:['formant','keys','marimba'],sections:[16,16,8,4,16],reference:'808 State — Newbuild (1988)',url:'https://808state.com/discogs/808pages/albpages/albnewbu/albnewbu2.htm'},
 berlin:{name:'Tresor · concreto e aço',bpm:136,root:'C',scale:'Phrygian',bass:['0 . 0 . 1 . 0 .','0 0 . 1 0 . 4 .','0 . . . 1 . . .','0 1 0 . 4 1 0 .'],lead:['0 . 1 . 4 . . .','4 1 . 0 . 1 4 .','1 . . . . . 0 .','0 1 4 . 1 0 . 4'],drums:[[0,4,8,12],[4,12],[0,2,4,6,8,10,12,14],[3,15],[6,14],[7,11,15],[2,9],[0,3,6,9,12,15]],bassBars:1,leadBars:1.75,accentBars:1.25,swing:0,colors:['brass','strings','marimba'],sections:[16,16,8,4,16],reference:'X-101 — Sonic Destroyer (1991)',url:'https://tresorberlin.com/release/tresor-001/'},
 tokyo:{name:'Tokyo · mosaico de circuitos',bpm:112,root:'F#',scale:'Pentatônica maior',bass:['0 . . 2 . 3 . 4','0 . 3 . 4 . 2 .','0 . . . 2 . . .','0 2 . 4 . 3 2 .'],lead:['0 2 . 3 4 . 2 .','4 . 3 2 . 0 . 2','2 . . 4 . . 0 .','0 . 2 4 3 2 . 0'],drums:[[0,7,10],[4,13],[0,3,6,8,11,14],[5],[14],[3,9],[2,10],[1,4,7,12]],bassBars:2,leadBars:1.75,accentBars:1.25,swing:.04,colors:['marimba','keys','flute'],sections:[12,16,8,20],reference:'YMO — BGM (1981), antecedente da eletrônica japonesa experimental; não um hit de 1991',url:'https://www.sonymusic.co.jp/artist/YMO/discography/MHCL-10111'},
 london:{name:'Breaks · fragmentos da madrugada',bpm:156,root:'D',scale:'Menor natural',bass:['0 . . 0 . 4 . .','0 . 7 . . 6 4 .','0 . . . 4 . . .','0 . 4 3 . 2 . 0'],lead:['0 2 3 . 4 . 6 4','7 . 6 4 3 2 . 0','4 . . . 2 . . .','0 2 4 . 6 7 4 .'],drums:[[0,6,10],[4,12,15],[0,2,5,6,8,10,13,14],[3,7,11],[6,14],[7,13,15],[2,9],[1,5,8,11,14]],bassBars:2,leadBars:2,accentBars:.75,swing:.13,colors:['brass','formant','keys'],sections:[16,16,8,4,16],reference:'The Prodigy — Experience (1992), rave/breakbeat na transição para jungle',url:'https://shop.xlrecordings.com/release/346455-the-prodigy-experience'},
 saopaulo:{name:'Subsolo · pulsação paulistana',bpm:138,root:'E',scale:'Menor natural',bass:['0 . 0 . 4 0 . 6','0 0 . 4 0 . 3 .','0 . . . 4 . . .','0 . 3 4 . 6 4 0'],lead:['0 . 3 . 4 . . 6','7 . 6 . 4 3 . 0','4 . . . 3 . . .','0 3 . 4 6 . 4 3'],drums:[[0,4,8,12],[4,12],[0,2,4,6,8,10,12,14],[7,15],[6,14],[1,6,11,14],[3,10],[0,3,6,8,11,14]],bassBars:1,leadBars:2,accentBars:1.5,swing:.04,colors:['brass','marimba','guitar'],sections:[16,16,8,4,16],reference:'Cena paulistana pré-Hell’s: Krawitz (1991), Mau Mau e techno importado. Hell’s abriu em 1994.',url:'https://www.ruidonametropole.com.br/'},
 paris:{name:'Da Seine · funk filtrado',bpm:111,root:'C',scale:'Blues menor',bass:['0 . 0 3 . 4 3 .','0 0 . 3 5 . 4 3','0 . . 3 . . 0 .','0 3 4 . 5 4 3 0'],lead:['0 . 3 4 . 3 1 .','5 4 3 . 1 0 . 3','3 . . . 1 . 0 .','0 1 3 4 5 . 4 3'],drums:broken,bassBars:1,leadBars:2,accentBars:1,swing:.08,colors:['guitar','keys','strings'],sections:[16,16,8,16],reference:'Daft Punk — Da Funk (1995)',url:'https://www.daftpunk.com/'},
 vienna:{name:'Salão · diálogo clássico',bpm:108,root:'C',scale:'Maior',bass:['0 . 4 . 0 . 4 .','0 . 4 . 2 . 4 .','0 . 2 . 4 . 2 .','0 2 4 2 0 . 4 .'],lead:['0 2 4 7 6 5 4 3','4 5 6 7 6 4 2 1','2 3 4 2 0 . 1 2','4 6 7 6 5 3 2 0'],drums:four,bassBars:2,leadBars:2,accentBars:3,swing:0,colors:['flute','strings','strings'],sections:[16,16,12,16],reference:'Mozart — Sinfonia K.338 (1780, composta em Salzburg): referência austríaca, não alegação de estreia em Viena',url:'https://kv.mozarteum.at/en/work/symphony-in-c-4426'},
}
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
