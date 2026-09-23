'use client'
import { InfoTip } from './info-tip'
import { useSyncExternalStore } from 'react'
import type { MusicMonitor } from '@/lib/music/monitor'
import { TRIGGERS, type Trigger } from '@/lib/music/reactions'
import { harmonyFrame } from '@/lib/music/harmony'

export function MusicHarmonyReadout({monitor}:{monitor:MusicMonitor}){
 const frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot), t=frame.transport
 if(!t)return null
 const harmony=harmonyFrame(t.harmony,t.scale,frame.section)
 return <div aria-label="Harmonia em execução" style={{borderTop:'1px solid #34473c',paddingTop:8,lineHeight:1.45,font:'inherit'}}>
  <div><span style={{color:'#93a79a'}}>Harmonia agora · </span><b>{harmony.roman} · {harmony.chordName}</b> <span style={{color:'#b7c8b9'}}>({harmony.chordNotes.join('–')})</span></div>
  <small style={{display:'block',color:'#93a79a'}}>{harmony.planLabel}{t.harmony==='static'?' · voicing autoral':' · tríade com condução de vozes'}</small>
 </div>
}

export function MusicTransitionView({monitor,fallbackBpm}:{monitor:MusicMonitor;fallbackBpm:number}){
 const frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot), t=frame.transport
 const bpm=t?.bpm??fallbackBpm, targetBpm=t?.targetBpm??fallbackBpm, pending=t?.pending??[]
 const r=t?.ramp, progress=r?.progress??1, ramping=progress<1
 return <section aria-label="Transições musicais" style={{padding:10,border:'1px solid #405247',borderRadius:6,background:'#152019'}}>
  <strong>Relógio e transições<InfoTip label="Ler o relógio musical">Nesta versão, o relógio usa sempre quatro tempos por compasso. A subdivisão da grade muda as partes dentro de cada tempo, sem alterar o compasso. A linha amarela mostra o avanço da rampa.</InfoTip></strong>
  <div style={{display:'flex',justifyContent:'space-between',fontVariantNumeric:'tabular-nums',marginTop:8}}><span>Agora <b>{bpm.toFixed(1)} BPM</b></span><span>Destino {targetBpm.toFixed(1)}</span></div>
  <svg viewBox="0 0 300 54" style={{display:'block',width:'100%',height:54}} role="img" aria-label={ramping?`Rampa ${Math.round(progress*100)} por cento`:'BPM estável'}>
   {[0,1,2,3,4].map(i=><line key={i} x1={i*75} x2={i*75} y1={4} y2={50} stroke="#34473c"/>)}
   <path d={r&&r.from>r.target?'M0 8 L300 46':r&&r.from<r.target?'M0 46 L300 8':'M0 27 L300 27'} fill="none" stroke="#a8c68d" strokeWidth={2}/>
   <line x1={progress*300} x2={progress*300} y1={0} y2={54} stroke="#ffe7a8" strokeWidth={3}/>
  </svg>
  <small>{ramping?`Mudança gradual em ${(r!.end-r!.start).toFixed(0)} compassos · ${Math.round(progress*100)}%`:'Sem rampa em andamento'}</small>
  <div style={{display:'flex',gap:3,margin:'8px 0'}}>{[0,1,2,3].map(i=><div key={i} style={{flex:1,textAlign:'center',padding:4,background:frame.beat===i+1&&frame.running?'#557440':'#26362c'}}>{i+1}</div>)}</div>
  <MusicHarmonyReadout monitor={monitor}/>
  {pending.length>0&&<div>{pending.map(p=><div key={p.id}>{TRIGGERS[p.trigger as Trigger]} → compasso {p.cycle+1} · em {Math.max(0,(p.cycle-frame.cycle)*4).toFixed(1)} tempos</div>)}</div>}
 </section>
}
