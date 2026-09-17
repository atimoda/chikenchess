'use client'
import {useState,useSyncExternalStore} from 'react'
import type {CreativeSession} from '@/lib/music/creative'
import type {MusicMonitor} from '@/lib/music/monitor'
import {performancePosition} from '@/lib/music/performance'
import {HelpLabel,InfoTip} from './info-tip'
import {CompactNumberInput} from './compact-number-input'
export function MusicPerformanceControls({instrument,onChange,monitor,override}:{instrument:CreativeSession['instruments'][string];onChange:(v:Partial<CreativeSession['instruments'][string]>)=>void;monitor:MusicMonitor;override?:number}){
 const [selected,setSelected]=useState(0),frame=useSyncExternalStore(monitor.subscribe,monitor.getSnapshot,monitor.getServerSnapshot),plan=instrument.performance
 const following=instrument.selectedVariation===undefined&&override===undefined
 const pos=plan?performancePosition(plan,frame.cycle):null
 const index=Math.min(selected,(plan?.steps.length??1)-1),step=plan?.steps[index]
 const patch=(v:Partial<NonNullable<typeof step>>)=>plan&&onChange({performance:{...plan,steps:plan.steps.map((s,i)=>i===index?{...s,...v}:s)}})
 return <details open><summary>Fraseado e seções da peça<InfoTip label="Arranjo por peça">Cada bloco escolhe uma variação, duração em tempos, transposição cromática e presença. Seções podem ter durações diferentes. O título da variação ou uma regra do jogo pode assumir prioridade. A transposição cromática pode sair da escala.</InfoTip></summary>
 <label><input type="checkbox" checked={!!plan} onChange={e=>onChange({performance:e.target.checked?{restart:true,steps:[{beats:16,variation:0,transpose:0,active:true},{beats:12,variation:1,transpose:0,active:true},{beats:16,variation:2,transpose:0,active:true},{beats:4,variation:3,transpose:0,active:true}]}:undefined})}/>Arranjo próprio</label>
 {plan&&step&&<>
 <div style={{fontSize:11,minHeight:24}} aria-label="Estado do arranjo da peça">{!following?`Variação ${String.fromCharCode(65+(override??instrument.selectedVariation??0))} fixa${override!==undefined?' pela regra':''}`:frame.running&&pos?`Seção ${pos.index+1}/${plan.steps.length} · ${pos.step.active?String.fromCharCode(65+pos.step.variation):'pausa'} · ${Math.round(pos.progress*100)}%`:'Arranjo pausado'}</div>
 <div style={{display:'flex',gap:2,margin:'8px 0'}}>{plan.steps.map((s,i)=><button key={i} onClick={()=>setSelected(i)} aria-label={`Editar seção ${i+1}`} aria-pressed={i===index} style={{flex:s.beats,padding:'6px 2px',minWidth:16,background:frame.running&&following&&pos?.index===i?'#75904f':s.active?'#263c30':'#141b16',borderColor:i===index?'#ebdca0':'#405246',fontSize:10}}>{s.active?String.fromCharCode(65+s.variation):'—'}<br/>{s.beats}</button>)}</div>
 <label><HelpLabel label="Tempos da seção">Quatro tempos equivalem a um compasso do relógio. Use 3, 5 ou 7 para agrupamentos assimétricos; 0,5 para meio tempo.</HelpLabel><CompactNumberInput ariaLabel="Tempos da seção" min={.25} max={64} step={.25} value={step.beats} onChange={n=>{if(plan.steps.reduce((v,s,i)=>v+(i===index?n:s.beats),0)<=512)patch({beats:n})}}/></label>
 <label>Variação da seção<select value={step.variation} onChange={e=>patch({variation:Number(e.target.value)})}>{Array.from({length:8},(_,i)=><option key={i} value={i}>{String.fromCharCode(65+i)}</option>)}</select></label>
 <label><HelpLabel label="Transposição da seção">Deslocamento cromático, em semitons. Atua somente nas vozes afinadas. Zero conserva a escala da base.</HelpLabel><CompactNumberInput ariaLabel="Transposição da seção" min={-24} max={24} value={step.transpose} onChange={n=>{if(Number.isInteger(n))patch({transpose:n})}}/></label>
 <label><input type="checkbox" checked={step.active} onChange={e=>patch({active:e.target.checked})}/>Peça presente nesta seção</label>
 <label><input type="checkbox" checked={plan.restart} onChange={e=>onChange({performance:{...plan,restart:e.target.checked}})}/>Reiniciar frase na entrada da seção<InfoTip label="Reinício da frase">Marcado segue pickRestart: a frase começa ao entrar no bloco. Desmarcado mantém a fase global do loop, permitindo comprimentos independentes.</InfoTip></label>
 <div><button disabled={plan.steps.length>=24||plan.steps.reduce((n,s)=>n+s.beats,0)+step.beats>512} onClick={()=>onChange({performance:{...plan,steps:[...plan.steps,{...step}]}})}>Adicionar seção</button><button disabled={plan.steps.length<=1} onClick={()=>onChange({performance:{...plan,steps:plan.steps.filter((_,i)=>i!==index)}})}>Remover seção</button></div>
 </>}
 <label><HelpLabel label="Distorção">Saturação de 0 a 10. Nível controla o volume do efeito no Strudel (distortvol); não é uma porcentagem de mistura seco/molhado. Ajuste o ganho ao comparar timbres.</HelpLabel><input aria-label="Distorção" type="range" min={0} max={10} step={.1} value={instrument.distortion??0} onChange={e=>onChange({distortion:Number(e.target.value)})}/><output>{instrument.distortion??0}</output></label>
 <label>Nível da distorção<input aria-label="Nível da distorção" type="range" min={0} max={1} step={.01} value={instrument.distortionMix??.25} onChange={e=>onChange({distortionMix:Number(e.target.value)})}/></label>
 <label><HelpLabel label="Slide de afinação">Envelope em semitons, aplicado dentro de cada nota afinada. Para slides ocasionais, edite uma nota no piano roll ou use a automação Slide.</HelpLabel><input aria-label="Slide de afinação" type="range" min={-24} max={24} step={1} value={instrument.pitchEnvelope??0} onChange={e=>onChange({pitchEnvelope:Number(e.target.value)})}/><output>{instrument.pitchEnvelope??0} st</output></label>
 <label>Tempo do slide (s)<CompactNumberInput ariaLabel="Tempo do slide" min={.001} max={2} step={.01} value={instrument.pitchAttack??.15} onChange={pitchAttack=>onChange({pitchAttack})}/></label>
 </details>
}
