'use client'
import {performancePosition} from '@/lib/music/performance'
import { InfoTip } from './info-tip'
import { memo, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { Instrument } from '@/lib/music/model'
import type { MusicMonitor } from '@/lib/music/monitor'
import { preparePianoRoll, prepareVoiceVariations, type MusicSnapshot } from '@/lib/music/runtime'
import { resizeRoll, type PianoRoll, type PianoNote } from '@/lib/music/piano-roll'

export const MusicPianoEditor = memo(function MusicPianoEditor({snapshot,id,monitor,instrument,onChange}:{snapshot:MusicSnapshot;id:string;monitor:MusicMonitor;instrument:Instrument;onChange:(patch:Partial<Pick<Instrument,'phrases'|'pianoRolls'|'selectedVariation'>>)=>void}){
 const frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot)
 const [read,setRead]=useState<Awaited<ReturnType<typeof prepareVoiceVariations>>>(null),[error,setError]=useState('')
 const [selectedNote,setSelectedNote]=useState<{index:number;note:number}|null>(null)
 const [draft,setDraft]=useState<{index:number;roll:PianoRoll}|null>(null),[division,setDivision]=useState(4)
 const drag=useRef<{index:number;note:number;origin:PianoNote;start:number;degree:number;mode:'draw'|'move'|'resize';roll:PianoRoll}|null>(null)
 const lastNoteClick=useRef<{index:number;note:number;time:number}|null>(null)
 const phrases=instrument.phrases?.length?instrument.phrases:[instrument.notes]
 useEffect(()=>{let cancelled=false;void prepareVoiceVariations(snapshot,id,8).then(fn=>{if(!cancelled)setRead(()=>fn)}).catch(()=>setError('Não foi possível preparar a visualização.'));return()=>{cancelled=true}},[snapshot,id])
 useEffect(()=>{setDraft(null);setSelectedNote(null);drag.current=null;lastNoteClick.current=null},[id])
 const rows=read?.(frame.cycle)??[]
 function save(index:number,roll:PianoRoll|null){const rolls=phrases.map((_,i)=>i===index?roll:instrument.pianoRolls?.[i]??null);onChange({pianoRolls:rolls})}
 function removeNote(index:number,roll:PianoRoll,note:number){
  save(index,{...roll,notes:roll.notes.filter((_,i)=>i!==note)})
  setSelectedNote(current=>current?.index===index&&current.note===note?null:current)
 }
 function clickNote(index:number,roll:PianoRoll,note:number){
  const now=Date.now(),last=lastNoteClick.current
  if(last?.index===index&&last.note===note&&now-last.time<450){lastNoteClick.current=null;removeNote(index,roll,note)}
  else lastNoteClick.current={index,note,time:now}
 }
 const point=(e:React.PointerEvent<SVGSVGElement>,bars:number,low:number,high:number)=>{const box=e.currentTarget.getBoundingClientRect();return {start:Math.max(0,Math.min(bars-1/(4*division),Math.floor((e.clientX-box.left)/box.width*bars*4*division)/(4*division))),degree:Math.max(low,Math.min(high,high-Math.floor((e.clientY-box.top)/box.height*(high-low+1))))}}
 const cancel=()=>{drag.current=null;setDraft(null)}
 return <section aria-label="Editor de variações">
  <div style={{display:'flex',gap:4,flexWrap:'wrap'}}><label><span style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:5}}>Subdivisão do tempo<InfoTip label="Como editar as notas">A subdivisão define os pontos rítmicos disponíveis dentro de cada tempo: 2 e 4 são divisões binárias comuns; 3 e 6 criam sensação ternária; 5 e 7 permitem tuplets; 8 oferece edição mais fina. Clique numa área vazia e arraste para desenhar. Arraste uma nota para movê-la; arraste sua borda direita para alongar ou encurtar. Duplo clique numa nota para apagar. Também é possível selecionar e usar Excluir nota, Delete ou Backspace.</InfoTip></span><select value={division} onChange={e=>setDivision(Number(e.target.value))}><option value={1}>1 parte · pulso</option><option value={2}>2 partes · colcheias</option><option value={3}>3 partes · tercinas</option><option value={4}>4 partes · semicolcheias</option><option value={5}>5 partes · quintinas</option><option value={6}>6 partes · sextinas</option><option value={7}>7 partes · septinas</option><option value={8}>8 partes · fusas</option></select></label></div>
  
  {snapshot.sectionOverrides?.[id]!==undefined&&<p>Regra do jogo força a variação {String.fromCharCode(65+snapshot.sectionOverrides[id])}; ela tem prioridade sobre o título selecionado.</p>}
  {error&&<p role="alert">{error}</p>}
  {phrases.map((phrase,index)=>{
   const roll=draft?.index===index?draft.roll:instrument.pianoRolls?.[index], row=rows.find(r=>r.index===index),active=row?.active??instrument.selectedVariation===index, sounding=active&&frame.running&&['note','rest','masked'].includes(frame.tracks[id]?.status??'')
   const low=Math.min(-7,...(roll?.notes.map(n=>n.degree)??[])),high=Math.max(14,...(roll?.notes.map(n=>n.degree)??[])),rowHeight=264/(high-low+1)
   const plan=instrument.selectedVariation===undefined&&snapshot.sectionOverrides?.[id]===undefined?instrument.performance:undefined
   const position=plan?performancePosition(plan,frame.cycle):undefined
   const present=position?.step.active??true
   const bars=roll?.bars??4, quantum=1/(4*division), cursor=(plan?.restart&&position?position.progress*position.step.beats/4:frame.cycle)%bars
   const fixed=instrument.selectedVariation===index
   return <div key={index} style={{border:`1px solid ${active?'#bedb90':'#3a4b40'}`,padding:6,marginTop:8,borderRadius:5}}>
    <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}>
     <div style={{display:'grid',gap:4}}><button style={{minWidth:98,whiteSpace:'nowrap',color:fixed?'#fff':undefined}} aria-pressed={fixed} onClick={()=>onChange({selectedVariation:fixed?undefined:index})}>Variação {String.fromCharCode(65+index)}</button>{sounding&&<span style={{fontSize:9}}>{present?'Tocando':'Pausa da seção'}</span>}</div>
     {roll?<div style={{width:156,marginLeft:'auto'}}><div style={{position:'relative'}}><input aria-label={`Compassos da variação ${index+1}`} inputMode="decimal" value={bars} readOnly style={{paddingRight:64}}/><button type="button" aria-label={`Diminuir duração da variação ${index+1}`} disabled={bars<=.25} onClick={()=>save(index,resizeRoll(roll,Math.max(.25,bars-.25)))} style={{position:'absolute',right:32,top:'50%',transform:'translateY(-50%)',borderRadius:'50%',padding:0,width:26,height:26,fontSize:16}}>−</button><button type="button" aria-label={`Aumentar duração da variação ${index+1}`} disabled={bars>=8} onClick={()=>save(index,resizeRoll(roll,Math.min(8,bars+.25)))} style={{position:'absolute',right:3,top:'50%',transform:'translateY(-50%)',borderRadius:'50%',padding:0,width:26,height:26,fontSize:16}}>+</button></div><span style={{display:'block',marginTop:3,fontSize:9,color:'#9eafa2'}}>{bars} compassos / {bars*4} tempos</span></div>:<span style={{fontSize:10}}>Padrão Strudel</span>}
    </div>
    {!roll?<>
     <svg viewBox="0 0 320 72" style={{width:'100%',height:72,background:'#101a14'}} role="img" aria-label={`Prévia da variação ${index+1}`}>
      {(row?.events??[]).map((n,j)=><rect key={j} x={n.start*80} y={n.note===null?28:52-((n.note%12+12)%12)*3} width={Math.max(1,(n.end-n.start)*80-1)} height={8} fill="#8fba98"/>)}
      {sounding&&row&&<line x1={row.cursor*80} x2={row.cursor*80} y1={0} y2={72} stroke="#ffe9a9"/>}
     </svg><div style={{fontSize:10,overflowWrap:'anywhere'}}>{phrase}</div>
     <button onClick={()=>{setError('');void preparePianoRoll(snapshot,id,index).then(r=>save(index,r)).catch(e=>setError(String(e)))}}>Editar notas desta variação</button>
    </>:<>
     <svg preserveAspectRatio="none" viewBox="0 0 480 264" style={{display:'block',width:'100%',height:264,background:'#101a14',userSelect:'none',touchAction:'pan-y',cursor:'crosshair'}} tabIndex={0} role="application" aria-label={`Piano roll da variação ${index+1}`}
      onKeyDown={e=>{if(e.key==='Escape')cancel();if((e.key==='Delete'||e.key==='Backspace')&&selectedNote?.index===index){e.preventDefault();removeNote(index,roll,selectedNote.note)}}}
      onPointerDown={e=>{
       if(e.pointerType==='touch'||e.button!==0)return
       const target=e.target as HTMLElement,hit=Number(target.dataset.note??-1)
       if(e.detail>1){if(hit>=0){e.preventDefault();removeNote(index,roll,hit)}return}
       e.preventDefault();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId)
       const p=point(e,bars,low,high),notes=roll.notes.map(n=>({...n}))
       if(hit<0&&notes.length>=128){setError('Limite de 128 notas por variação.');return}
       const note=hit<0?notes.push({start:p.start,duration:quantum,degree:p.degree,velocity:.8})-1:hit
       setSelectedNote({index,note});const rect=target.getBoundingClientRect();const mode=hit<0?'draw':e.clientX>rect.right-8?'resize':'move'
       drag.current={index,note,origin:{...notes[note]},start:p.start,degree:p.degree,mode,roll:{bars,notes}};setDraft({index,roll:{bars,notes}})
      }}
      onPointerMove={e=>{const d=drag.current;if(!d||d.index!==index)return;const p=point(e,bars,low,high),n={...d.origin};if(d.mode==='move'){n.start=Math.max(0,Math.min(bars-n.duration,d.origin.start+p.start-d.start));n.degree=Math.max(-48,Math.min(48,d.origin.degree+p.degree-d.degree))}else n.duration=Math.max(quantum,Math.min(bars-n.start,p.start-n.start+quantum));d.roll={bars,notes:d.roll.notes.map((v,i)=>i===d.note?n:v)};setDraft({index,roll:d.roll})}}
      onPointerUp={()=>{const d=drag.current;if(d){save(index,d.roll);cancel()}}} onPointerCancel={cancel} onLostPointerCapture={cancel}
      >
      {Array.from({length:high-low+2},(_,i)=><line key={`h${i}`} x1={0} x2={480} y1={i*rowHeight} y2={i*rowHeight} stroke={i%7===0?'#485740':'#213329'}/>)}
      {Array.from({length:Math.ceil(bars/quantum)+1},(_,i)=><line key={`v${i}`} x1={i*quantum/bars*480} x2={i*quantum/bars*480} y1={0} y2={264} stroke={i%(division*4)===0?'#617652':i%division===0?'#3a503e':'#213329'}/>)}
      {Array.from({length:high-low+1},(_,i)=>high-i).filter(degree=>degree%7===0).map(degree=><text key={`degree${degree}`} x={2} y={(high-degree)*rowHeight+rowHeight-2} fill="#a6b7a7" fontSize={8} pointerEvents="none">{degree===0?'0 · tônica':degree}</text>)}
      {roll.notes.map((n,j)=><rect data-note={j} key={j} x={n.start/bars*480} y={(high-n.degree)*rowHeight+1} width={Math.max(2,n.duration/bars*480-1)} height={Math.max(2,rowHeight-2)} rx={2} fill={sounding&&present&&cursor>=n.start&&cursor<n.start+n.duration?'#f4e8a5':n.slide?'#dfa67a':'#8fb987'} stroke={selectedNote?.index===index&&selectedNote.note===j?'#fff':'none'} strokeWidth={selectedNote?.index===index&&selectedNote.note===j?2:0} onClick={e=>{e.stopPropagation();clickNote(index,roll,j)}}><title>Grau {n.degree} · tempo {(n.start*4+1).toFixed(2)} · duração {(n.duration*4).toFixed(2)} tempos · duplo clique apaga</title></rect>)}
      {sounding&&present&&<line data-playhead x1={cursor/bars*480} x2={cursor/bars*480} y1={0} y2={264} stroke="#fff1b7" strokeWidth={2}/>}
     </svg>
     {selectedNote?.index===index&&roll.notes[selectedNote.note]&&<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5}}>
      <label>Slide da nota (st)<input aria-label="Slide da nota" type="number" min={-24} max={24} value={roll.notes[selectedNote.note].slide??0} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&Math.abs(n)<=24)save(index,{...roll,notes:roll.notes.map((v,i)=>i===selectedNote.note?{...v,slide:n}:v)})}}/></label>
      <label>Tempo do slide (s)<input aria-label="Tempo do slide da nota" type="number" min={.001} max={2} step={.01} value={roll.notes[selectedNote.note].slideSeconds??.15} onChange={e=>{const n=Number(e.target.value);if(n>=.001&&n<=2)save(index,{...roll,notes:roll.notes.map((v,i)=>i===selectedNote.note?{...v,slideSeconds:n}:v)})}}/></label>
      <label>Acento da nota<input aria-label="Acento da nota" type="range" min={0} max={1} step={.01} value={roll.notes[selectedNote.note].velocity} onChange={e=>save(index,{...roll,notes:roll.notes.map((v,i)=>i===selectedNote.note?{...v,velocity:Number(e.target.value)}:v)})}/></label>
      <label>Pan da nota<input aria-label="Pan da nota" type="number" min={0} max={1} step={.01} placeholder="Herdar" value={roll.notes[selectedNote.note].pan??''} onChange={e=>{const n=e.target.value===''?undefined:Number(e.target.value);if(n===undefined||Number.isFinite(n)&&n>=0&&n<=1)save(index,{...roll,notes:roll.notes.map((v,i)=>i===selectedNote.note?{...v,pan:n}:v)})}}/></label>
      <svg viewBox="0 0 160 42" style={{width:'100%',height:42}} role="img" aria-label={`Slide: ${roll.notes[selectedNote.note].slide??0} semitons em ${roll.notes[selectedNote.note].slideSeconds??.15} segundos`}><line x1="8" x2="152" y1="21" y2="21" stroke="#425544"/><path d={`M8 21 L125 ${21-Math.max(-18,Math.min(18,(roll.notes[selectedNote.note].slide??0)*2))}`} fill="none" stroke="#dfa67a" strokeWidth="2"/><text x="8" y="40" fill="#cbd7c5" fontSize="9">0 → {roll.notes[selectedNote.note].slide??0} st · {roll.notes[selectedNote.note].slideSeconds??.15}s</text></svg>
      <InfoTip label="Articulação da nota">O slide altera continuamente a afinação deste ataque. Valores negativos descem; positivos sobem. Zero conserva a articulação global. O acento regula a força de cada nota. Pan: 0 esquerda, 1 direita; deixe vazio para herdar o instrumento. O traço mostra direção e profundidade configuradas do slide, não a forma exata da onda.</InfoTip>
      <button type="button" onClick={()=>removeNote(index,roll,selectedNote.note)}>Excluir nota</button>
     </div>}
     <div>{!instrument.pianoOnly&&<button onClick={()=>save(index,null)}>Restaurar padrão Strudel</button>}</div>
    </>}
   </div>
  })}
  <div style={{display:'flex',gap:4,marginTop:8}}><button disabled={phrases.length>=8} onClick={()=>onChange({phrases:[...phrases,phrases.at(-1)??'~'],pianoRolls:[...(instrument.pianoRolls??phrases.map(()=>null)),null]})}>Adicionar variação</button><button disabled={phrases.length<=1} onClick={()=>onChange({phrases:phrases.slice(0,-1),pianoRolls:instrument.pianoRolls?.slice(0,phrases.length-1),selectedVariation:instrument.selectedVariation!==undefined?Math.min(instrument.selectedVariation,phrases.length-2):undefined})}>Remover última variação</button></div>
 </section>
})
