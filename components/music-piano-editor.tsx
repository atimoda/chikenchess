'use client'
import {variationPosition} from '@/lib/music/performance'
import {arrangementPosition} from '@/lib/music/arrangement'
import { beatsPerBar, subdivisionsPerBeat, beatUnit } from '@/lib/music/meter'
import type { Meter } from '@/lib/music/meter'
import { InfoTip } from './info-tip'
import { memo, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { MusicNoteParams } from './music-note-params'
import type { KnobUpdateMode } from './knob'
import { addVariation, removeLastVariation } from '@/lib/music/variation-edit'
import type { Instrument } from '@/lib/music/model'
import type { InstrumentPerformanceEdit } from '@/lib/music/model'
import { isLoopRunning, type MusicMonitor } from '@/lib/music/monitor'
import type { MusicSnapshot } from '@/lib/music/runtime'
import { resizeRoll, type PianoRoll, type PianoNote } from '@/lib/music/piano-roll'

export const MUSIC_GRID_DIVISIONS = [
 {value:1,label:'1 part · beat'}, {value:2,label:'2 parts · eighths'},
 {value:3,label:'3 parts · triplets'}, {value:4,label:'4 parts · sixteenths'},
 {value:5,label:'5 parts · quintuplets'}, {value:6,label:'6 parts · sextuplets'},
 {value:7,label:'7 parts · septuplets'}, {value:8,label:'8 parts · thirty-seconds'},
] as const

const subscribeNothing = () => () => {}

export function gridDivisionLabel(value:number,meter:Meter='4/4') {
 if(subdivisionsPerBeat(meter)===3){
  if(value===3)return '3 parts · eighths'
  if(value===6)return '6 parts · sixteenths'
  if(value===2)return '2 parts · duple division'
  return value===1?'1 part · beat':`${value} parts · beat division`
 }
 if(beatUnit(meter)==='half' && value===2)return '2 parts · quarters'
 if(beatUnit(meter)==='half' && value===4)return '4 parts · eighths'
 if(beatUnit(meter)==='half' && value===8)return '8 parts · sixteenths'
 if(beatUnit(meter)==='eighth' && value===8)return '8 parts · sixty-fourths'
 if(beatUnit(meter)==='eighth' && value===2)return '2 parts · sixteenths'
 if(beatUnit(meter)==='eighth' && value===4)return '4 parts · thirty-seconds'
 return MUSIC_GRID_DIVISIONS.find(option=>option.value===value)?.label??String(value)
}

export function defaultGridDivision(meter:Meter='4/4') {
 return subdivisionsPerBeat(meter)===3?3:meter==='3/4'||beatUnit(meter)==='eighth'?2:4
}

export const MusicPianoEditor = memo(function MusicPianoEditor({snapshot,id,monitor,instrument,onChange,onlyVariation,compact=false,actions,division:controlledDivision,onDivisionChange,knobUpdateMode='immediate',visualUpdatesEnabled=true}:{snapshot:MusicSnapshot;id:string;monitor:MusicMonitor;instrument:Instrument;onChange:(patch:InstrumentPerformanceEdit)=>void;onlyVariation?:number;compact?:boolean;actions?:ReactNode;division?:number;onDivisionChange?:(division:number)=>void;knobUpdateMode?:KnobUpdateMode;visualUpdatesEnabled?:boolean}){
 const subscribe=visualUpdatesEnabled?monitor.subscribe:subscribeNothing
 const getSnapshot=visualUpdatesEnabled?monitor.getSnapshot:monitor.getServerSnapshot
 const frame=useSyncExternalStore(subscribe,getSnapshot,monitor.getServerSnapshot)
 const [error,setError]=useState('')
 const [selectedNote,setSelectedNote]=useState<{index:number;note:number}|null>(null)
 const [draft,setDraft]=useState<{index:number;roll:PianoRoll}|null>(null),[localDivision,setLocalDivision]=useState(defaultGridDivision(snapshot.meter))
 const pulses=beatsPerBar(snapshot.meter)
 const division=controlledDivision??localDivision
 const setDivision=(value:number)=>{setLocalDivision(value);onDivisionChange?.(value)}
 useEffect(()=>{setLocalDivision(defaultGridDivision(snapshot.meter))},[snapshot.meter])
 const drag=useRef<{index:number;note:number;sourceNote:number;origin:PianoNote;start:number;degree:number;mode:'draw'|'move'|'resize';roll:PianoRoll;copy:boolean;moved:boolean}|null>(null)
 const lastNoteClick=useRef<{index:number;note:number;time:number}|null>(null)
 const bankCount=instrument.pianoRolls.length
 const visibleVariations=instrument.pianoRolls.map((roll,index)=>({roll,index})).filter(({index})=>onlyVariation===undefined||index===onlyVariation)
 useEffect(()=>{setDraft(null);setSelectedNote(null);setError('');drag.current=null;lastNoteClick.current=null},[id])
 const globalPosition=snapshot.arrangement?arrangementPosition(snapshot.arrangement,frame.cycle,pulses):undefined
 const playback=variationPosition(instrument,globalPosition?.index??frame.section,frame.cycle,pulses,snapshot.sectionOverrides?.[id],snapshot.arrangement)
 function save(index:number,roll:PianoRoll){onChange({pianoRolls:instrument.pianoRolls.map((current,i)=>i===index?roll:current)})}
 function removeNote(index:number,roll:PianoRoll,note:number){
  save(index,{...roll,notes:roll.notes.filter((_,i)=>i!==note)})
  setSelectedNote(current=>current?.index===index&&current.note===note?null:current)
 }
 const point=(e:React.PointerEvent<SVGSVGElement>,bars:number,low:number,high:number)=>{const box=e.currentTarget.getBoundingClientRect();return {start:Math.max(0,Math.min(bars-1/(pulses*division),Math.floor((e.clientX-box.left)/box.width*bars*pulses*division)/(pulses*division))),degree:Math.max(low,Math.min(high,high-Math.floor((e.clientY-box.top)/box.height*(high-low+1))))}}
 const cancel=()=>{drag.current=null;setDraft(null)}
 return <section aria-label="Variation editor" data-midi-visual-panel data-compact={compact||undefined}>
  {!compact&&<div style={{display:'flex',gap:4,flexWrap:'wrap'}}><label><span style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:5}}>Beat subdivision<InfoTip label="How to edit notes">The subdivision sets the rhythmic points inside each beat: 3 parts show the eighths in 6/8, 9/8 and 12/8. Click an empty area and drag to draw. Drag a note to move it; hold Alt while dragging to duplicate it with its parameters. Drag its right edge to lengthen or shorten it. Double-click a note to delete it. You can also select it and use Delete note, Delete or Backspace.</InfoTip></span><select value={division} onChange={e=>setDivision(Number(e.target.value))}>{MUSIC_GRID_DIVISIONS.map(option=><option key={option.value} value={option.value}>{gridDivisionLabel(option.value,snapshot.meter)}</option>)}</select></label></div>}
  
  {snapshot.sectionOverrides?.[id]!==undefined&&<p>A game rule forces only variation {String.fromCharCode(65+playback.variation)} and overrides the pinned tab. Timing, presence and transposition keep following the global section.</p>}
  {error&&<p role="alert">{error}</p>}
  {visibleVariations.map(({roll:savedRoll,index})=>{
   const roll=draft?.index===index?draft.roll:savedRoll, active=playback.variation===index, sounding=active&&isLoopRunning(frame,id,instrument.loopEnabled!==false)
   const low=Math.min(-7,...roll.notes.map(n=>n.degree)),high=Math.max(14,...roll.notes.map(n=>n.degree)),rowHeight=264/(high-low+1)
   const present=playback.present
   const bars=roll.bars, quantum=1/(pulses*division), cursor=playback.phase%bars
   const fixed=instrument.selectedVariation===index
   return <div key={index} style={{border:compact?'none':`1px solid ${active?'#bedb90':'#3a4b40'}`,padding:compact?0:6,marginTop:8,borderRadius:5}}>
    {compact?null:<div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'flex-start'}}>
     <div style={{display:'grid',gap:4}}><button style={{minWidth:98,whiteSpace:'nowrap',color:fixed?'#fff':undefined}} aria-pressed={fixed} onClick={()=>onChange({selectedVariation:fixed?undefined:index})}>Variation {String.fromCharCode(65+index)}</button>{sounding&&<span style={{fontSize:9}}>{present?'Playing':'Section rest'}</span>}</div>
     <div style={{width:156,marginLeft:'auto'}}><div style={{position:'relative'}}><input aria-label={`Bars of variation ${index+1}`} inputMode="decimal" value={bars} readOnly style={{paddingRight:64}}/><button type="button" aria-label={`Shorten variation ${index+1}`} disabled={bars<=1/pulses} onClick={()=>save(index,resizeRoll(roll,Math.max(1/pulses,bars-1/pulses)))} style={{position:'absolute',right:32,top:'50%',transform:'translateY(-50%)',borderRadius:'50%',padding:0,width:26,height:26,fontSize:16}}>−</button><button type="button" aria-label={`Lengthen variation ${index+1}`} disabled={bars>=8} onClick={()=>save(index,resizeRoll(roll,Math.min(8,bars+1/pulses)))} style={{position:'absolute',right:3,top:'50%',transform:'translateY(-50%)',borderRadius:'50%',padding:0,width:26,height:26,fontSize:16}}>+</button></div><span style={{display:'block',marginTop:3,fontSize:9,color:'#9eafa2'}}>{bars} bars / {bars*pulses} beats</span></div>
    </div>}
     <svg preserveAspectRatio="none" viewBox="0 0 480 264" style={{display:'block',width:'100%',height:compact?142:264,background:'#101a14',userSelect:'none',touchAction:'pan-y',cursor:'crosshair'}} tabIndex={0} role="application" aria-label={`Piano roll of variation ${index+1}`}
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
       if((hit<0||copy)&&notes.length>=128){setError('Limit of 128 notes per variation.');return}
       const note=hit<0?notes.push({start:p.start,duration:quantum,degree:p.degree,velocity:.8,pan:.5})-1:copy?notes.push({...notes[hit]})-1:hit
       setSelectedNote({index,note});const mode=hit<0?'draw':copy?'move':target.dataset.mode==='resize'?'resize':'move'
       drag.current={index,note,sourceNote:hit,origin:{...notes[note]},start:p.start,degree:p.degree,mode,roll:{bars,notes},copy,moved:false};setDraft({index,roll:{bars,notes}})
      }}
      onPointerMove={e=>{const d=drag.current;if(!d||d.index!==index)return;const p=point(e,bars,low,high),n={...d.origin};if(d.mode==='move'){n.start=Math.max(0,Math.min(bars-n.duration,d.origin.start+p.start-d.start));n.degree=Math.max(-48,Math.min(48,d.origin.degree+p.degree-d.degree))}else n.duration=Math.max(quantum,Math.min(bars-n.start,p.start-n.start+quantum));d.moved=d.moved||n.start!==d.origin.start||n.degree!==d.origin.degree||n.duration!==d.origin.duration;d.roll={bars,notes:d.roll.notes.map((v,i)=>i===d.note?n:v)};setDraft({index,roll:d.roll})}}
      onPointerUp={()=>{const d=drag.current;if(d){if(d.mode==='draw'||d.moved)save(index,d.roll);if(d.sourceNote>=0&&!d.copy&&!d.moved)lastNoteClick.current={index,note:d.sourceNote,time:Date.now()};if(d.copy&&!d.moved)setSelectedNote({index,note:d.sourceNote});cancel()}}} onPointerCancel={cancel} onLostPointerCapture={cancel}
      >
      {Array.from({length:high-low+2},(_,i)=><line key={`h${i}`} x1={0} x2={480} y1={i*rowHeight} y2={i*rowHeight} stroke={i%7===0?'#485740':'#213329'}/>)}
      {Array.from({length:Math.ceil(bars/quantum)+1},(_,i)=><line key={`v${i}`} x1={i*quantum/bars*480} x2={i*quantum/bars*480} y1={0} y2={264} stroke={i%(division*pulses)===0?'#617652':i%division===0?'#3a503e':'#213329'}/>)}
      {Array.from({length:high-low+1},(_,i)=>high-i).filter(degree=>degree%7===0).map(degree=><text key={`degree${degree}`} x={2} y={(high-degree)*rowHeight+rowHeight-2} fill="#a6b7a7" fontSize={8} pointerEvents="none">{degree===0?'0 · root':degree}</text>)}
      {roll.notes.map((n,j)=>{const x=n.start/bars*480,width=Math.max(2,n.duration/bars*480-1),handle=Math.min(10,width);return <g key={j}>
       <rect data-note={j} x={x} y={(high-n.degree)*rowHeight+1} width={width} height={Math.max(2,rowHeight-2)} rx={2} fill={sounding&&present&&cursor>=n.start&&cursor<n.start+n.duration?'#f4e8a5':n.slide?'#dfa67a':'#8fb987'} stroke={selectedNote?.index===index&&selectedNote.note===j?'#fff':'none'} strokeWidth={selectedNote?.index===index&&selectedNote.note===j?2:0} style={{cursor:'grab'}}><title>{`Degree ${n.degree} · beat ${(n.start*pulses+1).toFixed(2)} · length ${(n.duration*pulses).toFixed(2)} beats · double-click deletes · Alt+drag duplicates`}</title></rect>
       <rect data-note={j} data-mode="resize" x={x+width-handle} y={(high-n.degree)*rowHeight+1} width={handle} height={Math.max(2,rowHeight-2)} fill="transparent" style={{cursor:'ew-resize'}} />
      </g>})}
      {sounding&&present&&<line data-playhead x1={cursor/bars*480} x2={cursor/bars*480} y1={0} y2={264} stroke="#fff1b7" strokeWidth={2}/>}
     </svg>
     {compact?<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,minHeight:41}}><span style={{flex:'0 0 auto',fontSize:9,color:'#9eafa2',whiteSpace:'nowrap'}}>{bars} bars / {bars*pulses} beats</span>{actions}</div>:actions}
     {selectedNote?.index===index&&roll.notes[selectedNote.note]&&<MusicNoteParams note={roll.notes[selectedNote.note]} updateMode={knobUpdateMode} onChange={patch=>save(index,{...roll,notes:roll.notes.map((note,i)=>i===selectedNote.note?{...note,...patch}:note)})} onDelete={()=>removeNote(index,roll,selectedNote.note)}/>}
   </div>
  })}
  {onlyVariation===undefined&&<div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:8}}><button type="button" disabled={bankCount>=8} onClick={()=>onChange(addVariation(instrument))}>Add variation</button><button type="button" disabled={bankCount<=1} onClick={()=>onChange(removeLastVariation(instrument))}>Remove last variation</button></div>}
 </section>
})
