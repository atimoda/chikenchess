// Score realization, not runtime generation. All output is explicit MIDI.
const scores = require('./concert-scores.cjs')
const pc = name => ({c:0,d:2,e:4,f:5,g:7,a:9,b:11}[name[0].toLowerCase()] + (name[1]==='#'?1:name[1]==='b'?-1:0)+12)%12
const midi = name => 12*(Number(name.match(/-?\d+$/)[0])+1)+pc(name)
const round = n=>Number(n.toFixed(6))
const qualities = {'':[0,4,7],m:[0,3,7],'7':[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],dim:[0,3,6],ø:[0,3,6,10]}
function chord(symbol) {
  const [,root,quality,bass] = /^([A-G][#b]?)(maj7|m7|m|7|dim|ø)?(?:\/([A-G][#b]?))?$/.exec(symbol)||[]
  if(!root) throw Error(`Unknown chord ${symbol}`)
  return {symbol,root:pc(root),bass:pc(bass||root),tones:qualities[quality||''].map(n=>(n+pc(root))%12)}
}
function parse(rows,ticks) {
  return rows.map(row=>{
    let at=0
    const events=row.split(/\s+/).map(cell=>{
      const [pitch,len]=cell.split(':'),duration=Number(len),event={at,length:duration,pitches:pitch==='.'?[]:pitch.split(',').map(midi)}
      at+=duration;return event
    })
    if(at!==ticks)throw Error(`Bar has ${at}/${ticks} eighths: ${row}`)
    return events
  })
}
function nearest(tones,target,low=target-12,high=target+12) {
  const choices=[];for(let n=low;n<=high;n++)if(tones.includes((n%12+12)%12))choices.push(n)
  return choices.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)||a-b)[0]
}
const ev=(at,length,pitches,accent=0)=>({at,length,pitches:Array.isArray(pitches)?pitches:[pitches],accent})
const P=(slot,name,asset,role,octave,gain,pan,banks,variant=0)=>({slot,name,asset,role,octave,gain,pan,banks,variant})
const parts = {
 venice:[
  P('a1','Contrabaixos · alicerce','orchestra-bass','bass',2,.85,.27,'01234567'),
  P('b1','Oboé · arabescos','orchestra-oboe','wind',4,.48,-.08,'1256'),
  P('c1','Violino concertante II','orchestra-violin','counter',4,.48,-.2,'1256'),
  P('d1','Violino concertante I','orchestra-violin','solo',4,.7,-.08,'0123467',1),
  P('e1','Cravo · contínuo','harpsichord','continuo',3,.38,.02,'01234567'),
  P('f1','Violoncelo concertante','orchestra-cello','celloSolo',3,.68,.17,'0357'),
  P('g1','Flauta doce · eco','alto-recorder-sustain','upperwind',4,.37,.12,'0235'),
  P('h1','Fagote · baixo em resposta','orchestra-bassoon','bassoon',3,.49,.18,'12456'),
  P('a2','Violinos · ripieno esquerdo','orchestra-violin','lead',4,.48,-.43,'014567'),
  P('b2','Violinos · perguntas','violin-spiccato','short',4,.38,-.32,'12456'),
  P('c2','Violas · suspensões','orchestra-viola','inner',3,.44,-.13,'0134567'),
  P('d2','Violoncelos · passos','orchestra-cello','cello',3,.57,.19,'01234567'),
  P('e2','Contrabaixos · pizzicato','concert-bass-pizz','pizzBass',2,.7,.3,'12456'),
  P('f2','Violas · respostas','orchestra-viola','innerReply',3,.4,.05,'123456'),
  P('g2','Violinos · gotas de pizzicato','violin-pizzicato','pizz',4,.33,-.28,'0235'),
  P('h2','Flauta · luz sobre a água','orchestra-flute','flute',4,.4,.08,'2357'),
 ],
 copenhagen:[
  P('a1','Contrabaixos · profundidade','orchestra-bass','bass',2,.9,.25,'0123467'),
  P('b1','Clarinete · viajante','orchestra-clarinet','wind',4,.52,-.06,'123467'),
  P('c1','Trompas · horizonte','orchestra-horn','horn',3,.6,.08,'01467'),
  P('d1','Piano · mão direita','concert-piano','pianoR',4,.7,-.06,'01234567',1),
  P('e1','Piano · mão esquerda','concert-piano','pianoL',3,.63,-.12,'01234567'),
  P('f1','Violoncelo · canto longo','orchestra-cello','celloSolo',3,.72,.16,'12367'),
  P('g1','Oboé · memória','orchestra-oboe','upperwind',4,.48,.05,'0236'),
  P('h1','Tímpanos · cadências','timpani-low','timpani',2,.53,.25,'01467'),
  P('a2','Violinos · canto','orchestra-violin','lead',4,.54,-.4,'013467'),
  P('b2','Violinos · resposta','orchestra-violin','counter',4,.4,-.25,'1246'),
  P('c2','Violas · luz interior','orchestra-viola','inner',3,.46,-.08,'0123467'),
  P('d2','Violoncelos · caminhada','orchestra-cello','cello',3,.55,.18,'012467'),
  P('e2','Contrabaixos · pizzicato','concert-bass-pizz','pizzBass',2,.65,.28,'126'),
  P('f2','Fagote · contracanto','orchestra-bassoon','bassoon',3,.48,.08,'12467'),
  P('g2','Flauta · claridade','orchestra-flute','flute',4,.44,-.1,'23567'),
  P('h2','Trombone · arco do tutti','concert-trombone','trombone',3,.45,.2,'0467'),
 ],
 paris:[
  P('a1','Contrabaixos · terra','orchestra-bass','bass',2,.88,.23,'01234567'),
  P('b1','Fagote · primeiro gesto','orchestra-bassoon','solo',3,.68,-.05,'0124567'),
  P('c1','Trompas · blocos','orchestra-horn','horn',3,.54,.12,'12367'),
  P('d1','Violinos · fogo','orchestra-violin','lead',4,.57,-.22,'123567',1),
  P('e1','Tímpanos · pulso profundo','timpani-low','timpani',2,.57,.22,'12367'),
  P('f1','Trombone · rocha','concert-trombone','trombone',3,.53,.18,'12367'),
  P('g1','Clarinete · curvas','orchestra-clarinet','wind',4,.49,-.06,'012456'),
  P('h1','Bumbo sinfônico · abismo','concert-bass-drum','bassDrum',2,.55,.08,'12367',1),
  P('a2','Violinos · arco incisivo','violin-spiccato','short',4,.4,-.4,'1236'),
  P('b2','Violas · sombras','orchestra-viola','inner',3,.48,-.17,'01234567'),
  P('c2','Violoncelos · chão móvel','orchestra-cello','cello',3,.59,.17,'01234567'),
  P('d2','Contrabaixos · passos secos','concert-bass-pizz','pizzBass',2,.75,.3,'1236'),
  P('e2','Flauta · ar suspenso','orchestra-flute','flute',4,.45,-.12,'0457'),
  P('f2','Caixa · acentos quebrados','concert-snare','snare',2,.25,.12,'1236'),
  P('g2','Pratos · clarões','concert-cymbal','cymbal',2,.24,.15,'2367'),
  P('h2','Tam-tam · noite','concert-tam-tam','gong',2,.34,.02,'0467'),
 ],
}
function melody(score,bank) {
  if(score===scores.paris)return bank===2?'solo':bank===3||bank===6?'storm':bank===4||bank===5?'lyric':'theme'
  return bank===2?'solo':bank===3?'lyric':bank===4?'storm':'theme'
}
function sourceHarmony(score,bank) {
  if(score===scores.paris)return bank===6?3:bank===4?5:bank
  return bank===0||bank===5||bank===6||bank===7?1:bank
}
function adapt(events,from,to) {
  // Preserve passing motion; revoice chord tones to the new harmony, including its quality.
  let delta=to.root-from.root;while(delta>6)delta-=12;while(delta< -6)delta+=12
  return events.map(e=>({...e,pitches:e.pitches.map(n=>{
    const tone=from.tones.indexOf(n%12)
    return tone<0?n+delta:nearest([to.tones[tone%to.tones.length]],n+delta)
  })}))
}
function compose(score,key,part,bank,index) {
  const bars=score.bars[bank],ticks=score.ticks,paris=key==='paris',nordic=key==='copenhagen'
  const chords=score.harmony[bank].split(' ').map(chord)
  const baseChords=score.harmony[sourceHarmony(score,bank)].split(' ').map(chord)
  const material=parse(score[melody(score,bank)],ticks),counter=parse(score.counter,ticks)
  const lyrical=paris?[0,4,5,7].includes(bank):[0,3,7].includes(bank)
  const heavy=paris?[1,2,3,6].includes(bank):[1,4,6].includes(bank)
  const notes=[], role=part.role, bassLike=['bass','pizzBass','cello','bassoon'].includes(role)
  let previous=role==='inner'?60:role==='innerReply'?64:role==='horn'?55:role==='trombone'?48:60
  for(let bar=0;bar<bars;bar++) {
    const c=chords[bar%8],next=chords[(bar+1)%8],phase=bar%8
    let main=adapt(material[bar%material.length],baseChords[bar%8],c)
    if(bank===6&&!paris&&bar%4===1)main=main.map((e,i)=>i===0?{...e,length:e.length*.75}:e)
    const low=nearest([c.bass],role==='bass'||role==='pizzBass'?36:48,role==='bass'||role==='pizzBass'?28:40,role==='bass'||role==='pizzBass'?47:60)
    const tone=nearest(c.tones,previous,role==='trombone'?43:role==='horn'?48:55,role==='trombone'?62:role==='horn'?67:74)
    const answer=nearest(c.tones,tone+(bar%2? -3:3),55,77)
    previous=tone
    let events=[]
    if(['solo','pianoR','lead'].includes(role)) {
      events=main
      if(role==='solo'&&paris)events=events.map(e=>({...e,pitches:e.pitches.map(n=>n-12)}))
      if(role==='lead'&&nordic&&bank===2)events=[]
      if(role==='lead'&&key==='venice'&&bank===2)events=[]
      if(bank===0) events=bar%4===0?[ev(0,ticks*.65,nearest(c.tones,role==='solo'&&paris?58:76)),ev(ticks*.75,ticks*.2,nearest(c.tones,role==='solo'&&paris?62:72))]:bar%4===2?[ev(ticks/2,ticks/2-.5,nearest(c.tones,role==='solo'&&paris?60:74))]:[]
      if(nordic&&role==='pianoR'&&bank===5) {
        const pitches=[0,1,2,3,2,1,0,1,2,1,0,2,1,0,1,2].map(i=>nearest([c.tones[i%c.tones.length]],72+Math.floor(i/3)*12,60,90))
        const free=[0,.6,1.1,1.5,1.85,2.2,2.55,2.9,3.3,3.75,4.25,4.8,5.4,6,6.65,7.3]
        events=pitches.map((n,i)=>ev(free[i],(free[i+1]??8)-free[i]-.03,n,i===0?.08:(i/16)*.06))
        if(phase===3||phase===7) events=[ev(0,3,[...new Set(c.tones.slice(0,3).map(n=>nearest([n],76,65,86)))]),ev(4,2,nearest(c.tones,72)),ev(6,1,nearest(c.tones,69))]
      }
      if(nordic&&bank===3) {
        if(role==='pianoR'&&phase<4)events=[ev(1,2,nearest(c.tones,76)),ev(5,2,nearest(c.tones,72))]
        if(role==='lead')events=phase<4?[ev(0,ticks*.85,nearest(c.tones,69))]:[]
      }
      // Hand the sentence from desk to desk; the soloist does not continuously
      // double the ripieno. Both halves remain audible across the ensemble.
      if(key==='venice'&&[1,6].includes(bank)) {
        if(role==='solo'&&phase%4<2)events=[]
        if(role==='lead'&&phase%4>=2)events=[]
      }
      if(nordic&&[1,6].includes(bank)) {
        if(role==='pianoR'&&phase%4>=2)events=[]
        if(role==='lead'&&phase%4<2)events=[]
      }
      if(role==='pianoR'&&[0,4,6,7].includes(bank))events=events.map((e,i)=>i===0?{...e,pitches:e.pitches.flatMap(n=>[n,nearest(c.tones,n-5,n-8,n-3)])}:e)
      if(bank===7) events=[ev(0,ticks*.7,nearest(c.tones,role==='solo'&&paris?55:74)),...(phase%2?[ev(ticks*.8,ticks*.16,nearest(c.tones,role==='solo'&&paris?50:69))]:[])]
      if(bank===7&&phase>=6)events=phase===6?[ev(0,ticks*.88,nearest(c.tones,role==='solo'&&paris?50:74))]:[ev(0,ticks*.8,nearest(c.tones,role==='solo'&&paris?50:74))]
    } else if(role==='counter'||role==='celloSolo') {
      if(!lyrical&&bank!==2)events=adapt(counter[bar%counter.length],chord(score.harmony[1].split(' ')[bar%8]),c)
      else events=[ev(0,ticks*.45,nearest(c.tones,role==='celloSolo'?57:69)),ev(ticks/2,ticks*.35,nearest(c.tones,role==='celloSolo'?60:72))]
      if(role==='counter'&&paris)events=events.map(e=>({...e,pitches:e.pitches.map(n=>n+12)}))
      if(role==='celloSolo'&&!nordic)events=events.map(e=>({...e,pitches:e.pitches.map(n=>n>64?n-12:n)}))
      if(role==='celloSolo'&&nordic&&bank===3)events=phase<4?main.map(e=>({...e,pitches:e.pitches.map(n=>n-24)})):[]
      // A solo cello gets full independent phrases; the violin reply breathes between statements.
      if(role==='counter'&&phase%4<2)events=[]
      if(role==='celloSolo'&&nordic&&[1,2,6].includes(bank)&&phase%4<2)events=[]
    } else if(role==='pianoL') {
      const root=nearest([c.bass],43,33,52), third=nearest([c.tones[1]],55,45,64), fifth=nearest([c.tones[2]],58,48,67)
      if(bank===5)events=phase%2?[ev(0,3,[root,root+12])]:[ev(0,1.5,[root,root+12]),ev(3,1,[third,fifth]),ev(6,1,[third+12,fifth])]
      else if(lyrical)events=[ev(0,2.5,root),ev(2,2,[third,fifth]),ev(4,2,root+12),ev(6,1.6,[third,fifth])]
      else events=[ev(0,.8,root),ev(1,.8,fifth-12),ev(2,.8,third),ev(3,.8,fifth),ev(4,.8,root+12),ev(5,.8,third),ev(6,.8,fifth),ev(7,.7,third)]
    } else if(bassLike) {
      if(role==='bass') {
        events=lyrical?[ev(0,ticks*.85,low)]:[ev(0,ticks/2-.2,low,.07),ev(ticks/2,ticks/2-.4,nearest(c.tones,low+5,28,48))]
        if(phase%4===3&&!lyrical)events=[ev(0,ticks/2-.2,low),ev(ticks/2,ticks/4,nearest(c.tones,low+7,28,48)),ev(ticks*.75,ticks/4-.2,nearest([next.bass],low,28,48)+(next.bass===c.bass?0:-1))]
      } else if(role==='pizzBass') {
        const starts=paris?[[0,3,5],[0,2,5],[1,3,6],[0,2,4,6]][phase%4]:phase%2?[0,3,6]:[0,4]
        events=starts.map((at,i)=>ev(at,.65,i%2?nearest(c.tones,low+7,28,48):low,i===0?.08:0))
      } else if(role==='cello') {
        events=lyrical?[ev(0,ticks*.85,low)]:[ev(0,2,low),ev(2,1,nearest(c.tones,low+3,40,60)),ev(3,1,nearest(c.tones,low+7,40,60)),ev(4,ticks-4-.3,nearest(c.tones,low+5,40,60))]
        if(paris&&!lyrical)events=[[0,2],[3,1],[5,2]].map(([at,len],i)=>ev(at,len-.15,i===1?low+7:low))
      } else events=phase%4>=2?[ev(ticks/2,ticks/4,low+12),ev(ticks*.75,ticks/4-.4,nearest(c.tones,low+9,43,65))]:[]
    } else if(['inner','innerReply','horn','trombone'].includes(role)) {
      events=[ev(0,ticks/2-.1,tone),ev(ticks/2,ticks/2-.3,answer)]
      if(role==='inner'&&lyrical)events=[ev(0,ticks*.9,tone)]
      if(role==='innerReply')events=phase%2?[ev(1,ticks/2-1,tone+2),ev(ticks/2,ticks/2-.4,tone)]:[ev(ticks/2,ticks/2-.3,answer)]
      if(role==='horn'||role==='trombone') {
        const starts=paris?[[0,3],[1,5],[0,4,6],[2,5]][phase%4]:[0,4]
        events=heavy?starts.map((at,i)=>ev(at,paris?.8:1.5,i%2?answer:tone,.04)):[ev(0,ticks*.65,tone)]
        if(!heavy&&phase%4!==0&&phase%4!==3)events=[]
        if(role==='trombone'&&paris&&bank===3&&phase===6)events=[ev(0,2,[tone,tone+6],.02)]
      }
    } else if(role==='short'||role==='continuo'||role==='pizz') {
      const target=role==='continuo'?60:72, tones=c.tones.slice(0,3).map(p=>nearest([p],target,target-7,target+8)).sort((a,b)=>a-b)
      if(role==='continuo')events=Array.from({length:lyrical?4:8},(_,i)=>ev(i*(lyrical?2:1),lyrical?1.5:.8,tones[[0,2,1,2,0,1,2,1][i]],i%4===0?.04:0))
      if(role==='short') {
        const starts=paris?[[0,2,3,5],[1,3,4,6],[0,1,4,5],[0,2,5,6]][phase%4]:[0,1,2,3,4,5,6,7]
        events=starts.map((at,i)=>ev(at,.6,tones[(i+phase)%3],i%3===0?.04:-.03))
        if(phase===7)events=events.filter(e=>e.at<ticks-2)
      }
      if(role==='pizz')events=[ev(1,.6,tones[0]),ev(5,.6,tones[1])]
    } else if(['wind','upperwind','flute'].includes(role)) {
      const register=role==='flute'?79:role==='upperwind'?76:70
      if(lyrical)events=phase%4>=2?[ev(0,ticks/2,nearest(c.tones,register)),ev(ticks/2,ticks/2-1,nearest(c.tones,register-3))]:[]
      else if(phase%4>=2)events=[ev(1,2,nearest(c.tones,register)),ev(3,1,nearest(c.tones,register+2)),ev(4,ticks-5,nearest(c.tones,register-3))]
      else if(bank===2||bank===5)events=[ev(0,2,nearest(c.tones,register)),ev(2,1,nearest(c.tones,register-2)),ev(3,1,nearest(c.tones,register-4))]
      if(role==='flute'&&bank===3&&!paris)events=main.map(e=>({...e,pitches:e.pitches.map(n=>n+12)})).filter((_,i)=>i<3)
    } else if(role==='timpani') {
      const starts=paris?(heavy?[[0,5],[2,6],[0,3],[1,4,6]][phase%4]:[0]):[0]
      events=(paris?heavy||phase===0:[0,3,6,7].includes(phase))?starts.map((at,i)=>ev(at,.8,0,i?-.08:.08)):[]
      if(phase===6&&heavy)events.push(...Array.from({length:6},(_,i)=>ev(ticks-1.5+i*.25,.22,0,-.24+i*.045)))
    } else if(role==='bassDrum') {
      const starts=bank===3||bank===6?[[0],[3],[0,5],[2],[0],[4],[0,3],[0]][phase]:phase%4===0?[0]:phase%4===3?[5]:[]
      events=starts.map(at=>ev(at,1.4,0,.02))
    } else if(role==='snare') {
      const starts=[[2,5],[1,4,6],[3,6],[1,2,5]][phase%4]
      events=starts.map((at,i)=>ev(at,.4,0,i===0?-.08:.02))
      if(phase===7)events=[ev(1,.3,0,-.1),ev(2,.3,0,-.08),ev(4,.3,0),ev(4.5,.3,0,.02),ev(5,.3,0,.03)]
    } else if(role==='cymbal')events=[0,7].includes(phase)?[ev(phase===0?0:4,2.5,0,-.08)]:[]
    else if(role==='gong')events=phase===0?[ev(0,ticks*.85,0,-.15)]:[]
    const unpitched=['timpani','bassDrum','snare','cymbal','gong'].includes(role)
    const short=['short','pizz','pizzBass','continuo','snare'].includes(role)
    const dynamic=paris?[.38,.62,.65,.78,.34,.46,.81,.4][bank]:[.43,.66,.58,.43,.81,.57,.76,.46][bank]
    const arc=[-.06,-.01,.035,-.04,0,.05,.09,-.12][phase]
    for(const [i,e] of events.entries())for(const [j,n] of e.pitches.entries()) {
      // No randomness: breath at phrase ends and bounded desk delay keep gestures reproducible.
      const offset=e.at===0?index%3*.001:(index%3-1)*.0012+(role==='pianoR'?j*.0014:0)
      const start=round(Math.max(bar,bar+e.at/ticks+offset))
      const gate=short?.64:role==='pianoL'||role==='pianoR'?.96:unpitched?1:.94
      const duration=round(Math.min(bars-start,Math.max(1/64,e.length/ticks*gate)))
      const degree=unpitched?0:n-(12*(part.octave+1)+pc(score.root))-(c.root-pc(score.root))
      notes.push({start,duration,degree,velocity:round(Math.max(.2,Math.min(.96,dynamic+arc+(e.accent||0)+(i%3-1)*.012+(bassLike?.025:0))))})
    }
  }
  if(notes.length>256)throw Error(`${key}/${part.name}/${bank}: ${notes.length} notes exceeds 256`)
  return {bars,notes}
}
function build(key) {
 const score=scores[key]
 const desks=parts[key].slice().sort((a,b)=>a.slot.localeCompare(b.slot))
 const rolls=desks.map((part,index)=>score.bars.map((_,bank)=>compose(score,key,part,bank,index)))
 return {score,desks,rolls,roots:score.harmony.map(line=>line.split(' ').map(symbol=>chord(symbol).root-pc(score.root)))}
}
module.exports={build,pc,midi,chord}
