'use client'
import {performancePosition} from '@/lib/music/performance'
import { beatsPerBar } from '@/lib/music/meter'
import type { Meter } from '@/lib/music/meter'
import { InfoTip } from './info-tip'
import { memo, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Trash2 } from 'lucide-react'
import type { Instrument } from '@/lib/music/model'
import type { InstrumentPerformanceEdit } from '@/lib/music/model'
import type { MusicMonitor } from '@/lib/music/monitor'
import { preparePianoRoll, prepareVoiceVariations, type MusicSnapshot } from '@/lib/music/runtime'
import { resizeRoll, type PianoRoll, type PianoNote } from '@/lib/music/piano-roll'

export const MUSIC_GRID_DIVISIONS = [
 {value:1,label:'1 parte · pulso'}, {value:2,label:'2 partes · colcheias'},
 {value:3,label:'3 partes · tercinas'}, {value:4,label:'4 partes · semicolcheias'},
 {value:5,label:'5 partes · quintinas'}, {value:6,label:'6 partes · sextinas'},
 {value:7,label:'7 partes · septinas'}, {value:8,label:'8 partes · fusas'},
] as const

export function gridDivisionLabel(value:number,meter:Meter='4/4') {
 if(meter==='6/8'||meter==='12/8'){
  if(value===3)return '3 partes · colcheias'
  if(value===6)return '6 partes · semicolcheias'
  if(value===2)return '2 partes · divisão binária'
 }
 return MUSIC_GRID_DIVISIONS.find(option=>option.value===value)?.label??String(value)
}

export function defaultGridDivision(meter:Meter='4/4') {
 return meter==='3/4'?2:meter==='6/8'||meter==='12/8'?3:4
}

function slideGraphEnd(seconds:number, semitones:number) {
 return {
  x:8+Math.max(.001,Math.min(2,seconds))/2*144,
  y:16-Math.max(-14,Math.min(14,semitones)),
 }
}

const noteRangeStyle=(value:number,initial:number)=>({accentColor:Math.abs(value-initial)<.0005?'#858c95':'#1688ff'})

export const MusicPianoEditor = memo(function MusicPianoEditor({snapshot,id,monitor,instrument,onChange,onlyVariation,compact=false,division:controlledDivision,onDivisionChange}:{snapshot:MusicSnapshot;id:string;monitor:MusicMonitor;instrument:Instrument;onChange:(patch:InstrumentPerformanceEdit)=>void;onlyVariation?:number;compact?:boolean;division?:number;onDivisionChange?:(division:number)=>void}){
 const frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot)
 const [read,setRead]=useState<Awaited<ReturnType<typeof prepareVoiceVariations>>>(null),[error,setError]=useState('')
 const [selectedNote,setSelectedNote]=useState<{index:number;note:number}|null>(null)
 const [draft,setDraft]=useState<{index:number;roll:PianoRoll}|null>(null),[localDivision,setLocalDivision]=useState(defaultGridDivision(snapshot.meter))
 const pulses=beatsPerBar(snapshot.meter)
 const division=controlledDivision??localDivision
 const setDivision=(value:number)=>{setLocalDivision(value);onDivisionChange?.(value)}
 useEffect(()=>{setLocalDivision(defaultGridDivision(snapshot.meter))},[snapshot.meter])
 const drag=useRef<{index:number;note:number;sourceNote:number;origin:PianoNote;start:number;degree:number;mode:'draw'|'move'|'resize';roll:PianoRoll;copy:boolean;moved:boolean}|null>(null)
 const lastNoteClick=useRef<{index:number;note:number;time:number}|null>(null)
 const phrases=instrument.phrases?.length?instrument.phrases:[instrument.notes]
 const bankCount=Math.max(1,phrases.length,instrument.pianoRolls?.length??0)
 const visibleVariations=Array.from({length:bankCount},(_,index)=>({phrase:phrases[index%phrases.length],index})).filter(({index})=>onlyVariation===undefined||index===onlyVariation)
 useEffect(()=>{let cancelled=false;void prepareVoiceVariations(snapshot,id,8).then(fn=>{if(!cancelled)setRead(()=>fn)}).catch(()=>setError('Não foi possível preparar a visualização.'));return()=>{cancelled=true}},[snapshot,id])
 useEffect(()=>{setDraft(null);setSelectedNote(null);drag.current=null;lastNoteClick.current=null},[id])
 const rows=read?.(frame.cycle)??[]
 function save(index:number,roll:PianoRoll|null){const rolls=Array.from({length:bankCount},(_,i)=>i===index?roll:instrument.pianoRolls?.[i]??null);onChange({pianoRolls:rolls})}
 function removeNote(index:number,roll:PianoRoll,note:number){
  save(index,{...roll,notes:roll.notes.filter((_,i)=>i!==note)})
  setSelectedNote(current=>current?.index===index&&current.note===note?null:current)
 }
 const point=(e:React.PointerEvent<SVGSVGElement>,bars:number,low:number,high:number)=>{const box=e.currentTarget.getBoundingClientRect();return {start:Math.max(0,Math.min(bars-1/(pulses*division),Math.floor((e.clientX-box.left)/box.width*bars*pulses*division)/(pulses*division))),degree:Math.max(low,Math.min(high,high-Math.floor((e.clientY-box.top)/box.height*(high-low+1))))}}
 const cancel=()=>{drag.current=null;setDraft(null)}
 return <section aria-label="Editor de variações" data-compact={compact||undefined}>
  {!compact&&<div style={{display:'flex',gap:4,flexWrap:'wrap'}}><label><span style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:5}}>Subdivisão do tempo<InfoTip label="Como editar as notas">A subdivisão define os pontos rítmicos dentro de cada pulso: 3 partes mostram as colcheias em 6/8 e 12/8. Clique numa área vazia e arraste para desenhar. Arraste uma nota para movê-la; segure Alt ao arrastar para duplicá-la com seus parâmetros. Arraste sua borda direita para alongar ou encurtar. Duplo clique numa nota para apagar. Também é possível selecionar e usar Excluir nota, Delete ou Backspace.</InfoTip></span><select value={division} onChange={e=>setDivision(Number(e.target.value))}>{MUSIC_GRID_DIVISIONS.map(option=><option key={option.value} value={option.value}>{gridDivisionLabel(option.value,snapshot.meter)}</option>)}</select></label></div>}
  
  {snapshot.sectionOverrides?.[id]!==undefined&&<p>Regra do jogo força a variação {String.fromCharCode(65+snapshot.sectionOverrides[id])}; ela tem prioridade sobre o título selecionado.</p>}
  {error&&<p role="alert">{error}</p>}
  {visibleVariations.map(({phrase,index})=>{
   const roll=draft?.index===index?draft.roll:instrument.pianoRolls?.[index], row=rows.find(r=>r.index===index),active=row?.active??instrument.selectedVariation===index, sounding=active&&frame.running&&['note','rest','masked'].includes(frame.tracks[id]?.status??'')
   const low=Math.min(-7,...(roll?.notes.map(n=>n.degree)??[])),high=Math.max(14,...(roll?.notes.map(n=>n.degree)??[])),rowHeight=264/(high-low+1)
   const plan=instrument.selectedVariation===undefined&&snapshot.sectionOverrides?.[id]===undefined?instrument.performance:undefined
   const position=plan?performancePosition(plan,frame.cycle,pulses):undefined
   const present=position?.step.active??true
   const bars=roll?.bars??4, quantum=1/(pulses*division), cursor=(plan?.restart&&position?position.progress*position.step.beats/pulses:frame.cycle)%bars
   const fixed=instrument.selectedVariation===index
   return <div key={index} style={{border:compact?'none':`1px solid ${active?'#bedb90':'#3a4b40'}`,padding:compact?0:6,marginTop:8,borderRadius:5}}>
    {compact?<div style={{minHeight:14,textAlign:'right',fontSize:9,color:'#9eafa2'}}>{roll?`${bars} compassos / ${bars*pulses} tempos`:'Padrão Strudel'}</div>:<div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}>
     <div style={{display:'grid',gap:4}}><button style={{minWidth:98,whiteSpace:'nowrap',color:fixed?'#fff':undefined}} aria-pressed={fixed} onClick={()=>onChange({selectedVariation:fixed?undefined:index})}>Variação {String.fromCharCode(65+index)}</button>{sounding&&<span style={{fontSize:9}}>{present?'Tocando':'Pausa da seção'}</span>}</div>
     {roll?<div style={{width:156,marginLeft:'auto'}}><div style={{position:'relative'}}><input aria-label={`Compassos da variação ${index+1}`} inputMode="decimal" value={bars} readOnly style={{paddingRight:64}}/><button type="button" aria-label={`Diminuir duração da variação ${index+1}`} disabled={bars<=1/pulses} onClick={()=>save(index,resizeRoll(roll,Math.max(1/pulses,bars-1/pulses)))} style={{position:'absolute',right:32,top:'50%',transform:'translateY(-50%)',borderRadius:'50%',padding:0,width:26,height:26,fontSize:16}}>−</button><button type="button" aria-label={`Aumentar duração da variação ${index+1}`} disabled={bars>=8} onClick={()=>save(index,resizeRoll(roll,Math.min(8,bars+1/pulses)))} style={{position:'absolute',right:3,top:'50%',transform:'translateY(-50%)',borderRadius:'50%',padding:0,width:26,height:26,fontSize:16}}>+</button></div><span style={{display:'block',marginTop:3,fontSize:9,color:'#9eafa2'}}>{bars} compassos / {bars*pulses} tempos</span></div>:<span style={{fontSize:10}}>Padrão Strudel</span>}
    </div>}
    {!roll?<>
     <svg viewBox="0 0 320 72" style={{width:'100%',height:compact?58:72,background:'#101a14'}} role="img" aria-label={`Prévia da variação ${index+1}`}>
      {(row?.events??[]).map((n,j)=><rect key={j} x={n.start*80} y={n.note===null?28:52-((n.note%12+12)%12)*3} width={Math.max(1,(n.end-n.start)*80-1)} height={8} fill="#8fba98"/>)}
      {sounding&&row&&<line x1={row.cursor*80} x2={row.cursor*80} y1={0} y2={72} stroke="#ffe9a9"/>}
     </svg><div style={{fontSize:10,overflowWrap:'anywhere'}}>{phrase}</div>
     <button onClick={()=>{setError('');void preparePianoRoll(snapshot,id,index).then(r=>save(index,r)).catch(e=>setError(String(e)))}}>Editar notas desta variação</button>
    </>:<>
     <svg preserveAspectRatio="none" viewBox="0 0 480 264" style={{display:'block',width:'100%',height:compact?142:264,background:'#101a14',userSelect:'none',touchAction:'pan-y',cursor:'crosshair'}} tabIndex={0} role="application" aria-label={`Piano roll da variação ${index+1}`}
      onKeyDown={e=>{if(e.key==='Escape')cancel();if((e.key==='Delete'||e.key==='Backspace')&&selectedNote?.index===index){e.preventDefault();removeNote(index,roll,selectedNote.note)}}}
      onPointerDown={e=>{
       if(e.pointerType==='touch'||e.button!==0)return
       const target=e.target as HTMLElement,hit=Number(target.dataset.note??-1)
       const last=lastNoteClick.current
       if(hit>=0&&!e.altKey&&last?.index===index&&last.note===hit&&Date.now()-last.time<450){
        e.preventDefault();lastNoteClick.current=null;removeNote(index,roll,hit);return
       }
       lastNoteClick.current=null
       e.preventDefault();e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId)
       const p=point(e,bars,low,high),notes=roll.notes.map(n=>({...n}))
       const copy=hit>=0&&e.altKey
       if((hit<0||copy)&&notes.length>=128){setError('Limite de 128 notas por variação.');return}
       const note=hit<0?notes.push({start:p.start,duration:quantum,degree:p.degree,velocity:.8,pan:.5})-1:copy?notes.push({...notes[hit]})-1:hit
       setSelectedNote({index,note});const mode=hit<0?'draw':copy?'move':target.dataset.mode==='resize'?'resize':'move'
       drag.current={index,note,sourceNote:hit,origin:{...notes[note]},start:p.start,degree:p.degree,mode,roll:{bars,notes},copy,moved:false};setDraft({index,roll:{bars,notes}})
      }}
      onPointerMove={e=>{const d=drag.current;if(!d||d.index!==index)return;const p=point(e,bars,low,high),n={...d.origin};if(d.mode==='move'){n.start=Math.max(0,Math.min(bars-n.duration,d.origin.start+p.start-d.start));n.degree=Math.max(-48,Math.min(48,d.origin.degree+p.degree-d.degree))}else n.duration=Math.max(quantum,Math.min(bars-n.start,p.start-n.start+quantum));d.moved=d.moved||n.start!==d.origin.start||n.degree!==d.origin.degree||n.duration!==d.origin.duration;d.roll={bars,notes:d.roll.notes.map((v,i)=>i===d.note?n:v)};setDraft({index,roll:d.roll})}}
      onPointerUp={()=>{const d=drag.current;if(d){if(d.mode==='draw'||d.moved)save(index,d.roll);if(d.sourceNote>=0&&!d.copy&&!d.moved)lastNoteClick.current={index,note:d.sourceNote,time:Date.now()};if(d.copy&&!d.moved)setSelectedNote({index,note:d.sourceNote});cancel()}}} onPointerCancel={cancel} onLostPointerCapture={cancel}
      >
      {Array.from({length:high-low+2},(_,i)=><line key={`h${i}`} x1={0} x2={480} y1={i*rowHeight} y2={i*rowHeight} stroke={i%7===0?'#485740':'#213329'}/>)}
      {Array.from({length:Math.ceil(bars/quantum)+1},(_,i)=><line key={`v${i}`} x1={i*quantum/bars*480} x2={i*quantum/bars*480} y1={0} y2={264} stroke={i%(division*pulses)===0?'#617652':i%division===0?'#3a503e':'#213329'}/>)}
      {Array.from({length:high-low+1},(_,i)=>high-i).filter(degree=>degree%7===0).map(degree=><text key={`degree${degree}`} x={2} y={(high-degree)*rowHeight+rowHeight-2} fill="#a6b7a7" fontSize={8} pointerEvents="none">{degree===0?'0 · tônica':degree}</text>)}
      {roll.notes.map((n,j)=>{const x=n.start/bars*480,width=Math.max(2,n.duration/bars*480-1),handle=Math.min(10,width);return <g key={j}>
       <rect data-note={j} x={x} y={(high-n.degree)*rowHeight+1} width={width} height={Math.max(2,rowHeight-2)} rx={2} fill={sounding&&present&&cursor>=n.start&&cursor<n.start+n.duration?'#f4e8a5':n.slide?'#dfa67a':'#8fb987'} stroke={selectedNote?.index===index&&selectedNote.note===j?'#fff':'none'} strokeWidth={selectedNote?.index===index&&selectedNote.note===j?2:0} style={{cursor:'grab'}}><title>Grau {n.degree} · tempo {(n.start*pulses+1).toFixed(2)} · duração {(n.duration*pulses).toFixed(2)} tempos · duplo clique apaga · Alt+arrastar duplica</title></rect>
       <rect data-note={j} data-mode="resize" x={x+width-handle} y={(high-n.degree)*rowHeight+1} width={handle} height={Math.max(2,rowHeight-2)} fill="transparent" style={{cursor:'ew-resize'}} />
      </g>})}
      {sounding&&present&&<line data-playhead x1={cursor/bars*480} x2={cursor/bars*480} y1={0} y2={264} stroke="#fff1b7" strokeWidth={2}/>}
     </svg>
     {selectedNote?.index===index&&roll.notes[selectedNote.note]&&<div style={{display:'grid',gridTemplateColumns:'minmax(0,.9fr) minmax(0,1.1fr)',gap:'7px 8px',marginTop:10,font:'9px monospace'}}>
      <div style={{display:'grid',gap:7}}>
       <label><span style={{display:'flex',justifyContent:'space-between',gap:5}}>Slide da nota<output>{roll.notes[selectedNote.note].slide??0} st</output></span><input aria-label="Slide da nota" type="range" min={-24} max={24} step={1} value={roll.notes[selectedNote.note].slide??0} style={noteRangeStyle(roll.notes[selectedNote.note].slide??0,0)} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&Math.abs(n)<=24)save(index,{...roll,notes:roll.notes.map((v,i)=>i===selectedNote.note?{...v,slide:n}:v)})}}/></label>
       <label><span style={{display:'flex',justifyContent:'space-between',gap:5}}>Tempo do slide<output>{Number((roll.notes[selectedNote.note].slideSeconds??.5).toFixed(3))} s</output></span><input aria-label="Tempo do slide da nota" type="range" min={.001} max={2} step={.001} value={roll.notes[selectedNote.note].slideSeconds??.5} style={noteRangeStyle(roll.notes[selectedNote.note].slideSeconds??.5,.5)} onChange={e=>{const n=Number(e.target.value);if(n>=.001&&n<=2)save(index,{...roll,notes:roll.notes.map((v,i)=>i===selectedNote.note?{...v,slideSeconds:n}:v)})}}/></label>
      </div>
      <div style={{display:'grid',gap:7}}>
       <label><span style={{display:'flex',justifyContent:'space-between',gap:5}}>Acento da nota<output>{roll.notes[selectedNote.note].velocity.toFixed(2)}</output></span><input aria-label="Acento da nota" type="range" min={0} max={1} step={.01} value={roll.notes[selectedNote.note].velocity} style={noteRangeStyle(roll.notes[selectedNote.note].velocity,.8)} onChange={e=>save(index,{...roll,notes:roll.notes.map((v,i)=>i===selectedNote.note?{...v,velocity:Number(e.target.value)}:v)})}/></label>
       <label title="0 leva o som à esquerda; 0,5 centraliza; 1 leva à direita"><span style={{display:'flex',justifyContent:'space-between',gap:5}}>Pan da nota<output>{(roll.notes[selectedNote.note].pan??.5).toFixed(2)}</output></span><input aria-label="Pan da nota" type="range" min={0} max={1} step={.01} value={roll.notes[selectedNote.note].pan??.5} style={noteRangeStyle(roll.notes[selectedNote.note].pan??.5,.5)} onChange={e=>save(index,{...roll,notes:roll.notes.map((v,i)=>i===selectedNote.note?{...v,pan:Number(e.target.value)}:v)})}/></label>
      </div>
      <div style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:7}}>
       <svg viewBox="0 0 160 32" style={{display:'block',flex:'1 1 auto',minWidth:0,width:'auto',height:32}} role="img" aria-label={`Slide: ${roll.notes[selectedNote.note].slide??0} semitons em ${roll.notes[selectedNote.note].slideSeconds??.5} segundos`}><line x1="8" x2="152" y1="16" y2="16" stroke="#425544"/><path d={`M8 16 L${slideGraphEnd(roll.notes[selectedNote.note].slideSeconds??.5,roll.notes[selectedNote.note].slide??0).x} ${slideGraphEnd(roll.notes[selectedNote.note].slideSeconds??.5,roll.notes[selectedNote.note].slide??0).y}`} fill="none" stroke="#dfa67a" strokeWidth="2"/></svg>
       <button type="button" aria-label="Excluir nota" title="Excluir nota" onClick={()=>removeNote(index,roll,selectedNote.note)} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:27,height:27,padding:0,flex:'0 0 auto'}}><Trash2 style={{width:14,height:14,background:'transparent',borderRadius:0}}/></button>
      </div>
     </div>}
     <div>{!instrument.pianoOnly&&<button onClick={()=>save(index,null)}>Restaurar padrão Strudel</button>}</div>
    </>}
   </div>
  })}
  {onlyVariation===undefined&&<div style={{display:'flex',gap:4,marginTop:8}}><button disabled={phrases.length>=8} onClick={()=>onChange({phrases:[...phrases,phrases.at(-1)??'~'],pianoRolls:[...(instrument.pianoRolls??phrases.map(()=>null)),null]})}>Adicionar variação</button><button disabled={phrases.length<=1} onClick={()=>onChange({phrases:phrases.slice(0,-1),pianoRolls:instrument.pianoRolls?.slice(0,phrases.length-1),selectedVariation:instrument.selectedVariation!==undefined?Math.min(instrument.selectedVariation,phrases.length-2):undefined})}>Remover última variação</button></div>}
 </section>
})
