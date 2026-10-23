'use client'
import { InfoTip } from './info-tip'
import { useSyncExternalStore } from 'react'
import type { MusicMonitor } from '@/lib/music/monitor'
import { TRIGGERS, type Trigger } from '@/lib/music/reactions'
import { harmonyFrame } from '@/lib/music/harmony'
import { beatsPerBar, meterLabel, groupStarts } from '@/lib/music/meter'

export function MusicHarmonyReadout({monitor,compact=false}:{monitor:MusicMonitor;compact?:boolean}){
 const frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot), t=frame.transport
 if(!t)return null
 const harmony=harmonyFrame(t.harmony,t.scale,frame.section,t.harmonicRoot)
 if(compact)return <span aria-label="Harmony playing" style={{color:'#b7c8b9'}}>({harmony.roman} {harmony.chordName} — {harmony.chordNotes.join(' ')})</span>
 return <div aria-label="Harmony playing" style={{borderTop:'1px solid #34473c',paddingTop:8,lineHeight:1.45,font:'inherit'}}>
  <div><span style={{color:'#93a79a'}}>Harmony now · </span><b>{harmony.roman} · {harmony.chordName}</b> <span style={{color:'#b7c8b9'}}>({harmony.chordNotes.join('–')})</span></div>
  <small style={{display:'block',color:'#93a79a'}}>{harmony.planLabel}{t.authoredHarmony?' · section degrees per bar':t.harmony==='static'||t.harmony==='kit'?' · authored voicing':' · triad with voice leading'}</small>
 </div>
}

export function MusicBpmRamp({monitor}:{monitor:MusicMonitor}){
 const frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot)
 const r=frame.transport?.ramp, progress=r?.progress??1, ramping=progress<1
 return <div aria-label="BPM curve">
  <svg viewBox="0 0 300 54" style={{display:'block',width:'100%',height:54}} role="img" aria-label={ramping?`Ramp ${Math.round(progress*100)} percent`:'Steady BPM'}>
   {[0,1,2,3,4].map(i=><line key={i} x1={i*75} x2={i*75} y1={4} y2={50} stroke="#34473c"/>)}
   <path d={r&&r.from>r.target?'M0 8 L300 46':r&&r.from<r.target?'M0 46 L300 8':'M0 27 L300 27'} fill="none" stroke="#a8c68d" strokeWidth={2}/>
   <line x1={progress*300} x2={progress*300} y1={0} y2={54} stroke="#ffe7a8" strokeWidth={3}/>
  </svg>
  {ramping&&<small>Gradual change over {(r!.end-r!.start).toFixed(0)} bars · {Math.round(progress*100)}%</small>}
 </div>
}

export function MusicPendingTransitions({monitor}:{monitor:MusicMonitor}){
 const frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot), t=frame.transport
 if(!t?.pending.length)return null
 return <div aria-label="Rules waiting for the bar line" style={{flexBasis:'100%',fontSize:11}}>{t.pending.map(p=><div key={p.id}>{TRIGGERS[p.trigger as Trigger]} → bar {p.cycle+1} · in {Math.max(0,(p.cycle-frame.cycle)*beatsPerBar(t.meter)).toFixed(1)} beats</div>)}</div>
}

export function MusicTransitionView({monitor,fallbackBpm,compact=false,showRamp=true}:{monitor:MusicMonitor;fallbackBpm:number;compact?:boolean;showRamp?:boolean}){
 const frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot), t=frame.transport
 const bpm=t?.bpm??fallbackBpm, targetBpm=t?.targetBpm??fallbackBpm, pending=t?.pending??[]
 return <section aria-label="Musical transitions" style={{padding:10,border:'1px solid #405247',borderRadius:6,background:'#152019'}}>
  <strong>Clock and transitions<InfoTip label="Reading the music clock">The time signature sets how many beats each cycle has. In 6/8, 9/8 and 12/8, each beat is a dotted quarter with three eighths. The yellow line shows the BPM ramp.</InfoTip></strong>
  <small style={{display:'block',marginTop:4,color:'#b7c8b9'}}>{compact?meterLabel(t?.meter).split(' · ').slice(1).join(' · '):meterLabel(t?.meter)}</small>
  <div style={{display:'flex',justifyContent:'space-between',flexWrap:compact?'wrap':undefined,gap:compact?4:undefined,fontVariantNumeric:'tabular-nums',marginTop:8}}><span>Now <b>{bpm.toFixed(1)} BPM</b></span><span>Target {targetBpm.toFixed(1)}</span></div>
  {showRamp&&<MusicBpmRamp monitor={monitor}/>}
  {!compact&&<>
   <div style={{display:'flex',gap:3,margin:'8px 0'}}>{Array.from({length:beatsPerBar(t?.meter)},(_,i)=><div key={i} style={{flex:1,textAlign:'center',padding:4,borderLeft:groupStarts(t?.meter).includes(i)?'2px solid #a8c68d':undefined,background:frame.beat===i+1&&frame.running?'#557440':'#26362c'}}>{i+1}</div>)}</div>
   <MusicHarmonyReadout monitor={monitor}/>
  </>}
  {pending.length>0&&<div>{pending.map(p=><div key={p.id}>{TRIGGERS[p.trigger as Trigger]} → bar {p.cycle+1} · in {Math.max(0,(p.cycle-frame.cycle)*beatsPerBar(t?.meter)).toFixed(1)} beats</div>)}</div>}
 </section>
}
