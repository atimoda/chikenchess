'use client'
import { useState } from 'react'
import { ACTIONS, STATES, EVENTS, TRIGGERS, SCALE_INTERVALS, type Trigger, type Reactions, type ReactionContext, type Reaction } from '@/lib/music/reactions'

type Props={config:Reactions;onChange:(config:Reactions)=>void;context:ReactionContext;onContext:(context:ReactionContext)=>void;descriptions:string[];bpm:number;scale:string[]}
export function MusicReactionEditor({config,onChange,context,onContext,descriptions,bpm,scale}:Props){
  const [trigger,setTrigger]=useState<Trigger>('check'),[color,setColor]=useState<'w'|'b'>('w')
  const patch=(id:string,change:Partial<Reaction>)=>onChange({...config,rules:config.rules.map(r=>r.id===id?{...r,...change}:r)})
  const isState=trigger in STATES
  return <section aria-label="Estados e Eventos" style={{padding:12,border:'1px solid #35443a',background:'#19221d',borderRadius:8}}>
    <h2>Estados e Eventos</h2>
    <p>Simulação sonora · o tabuleiro livre não muda de posição.</p>
    <label>Estado atual<select value={context.states[0]?.trigger??'opening'} onChange={e=>onContext({...context,states:[{trigger:e.target.value as Trigger,color,ply:context.ply}]})}>
      {Object.entries(STATES).map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select></label>
    <label>Lado do estado/evento<select value={color} onChange={e=>{const c=e.target.value as 'w'|'b';setColor(c);onContext({...context,states:context.states.map(s=>({...s,color:c}))})}}><option value="w">Brancas</option><option value="b">Pretas</option></select></label>
    <p>Em cheque, o lado acima é o atacante. Em perda de todas as peças de um tipo/formação mínima, é o lado afetado.</p>
    <output aria-live="polite">{bpm.toFixed(1)} BPM · {scale.join(' ')} · meio-lance {context.ply}</output>
    <ul>{descriptions.length?descriptions.map((d,i)=><li key={i}>{d}</li>):<li>Nenhuma influência configurada em execução.</li>}</ul>
    <div style={{display:'flex',gap:4,flexWrap:'wrap',margin:'8px 0'}}>
      <button onClick={()=>onContext({...context,ply:context.ply+1})}>Avançar meio-lance</button>
      <button onClick={()=>onContext({ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]})}>Limpar simulação</button>
    </div>
    <label>Formação mínima · peças restantes por lado (inclui rei)<input type="number" min={2} max={15} value={config.minimumPieces} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=2&&n<=15)onChange({...config,minimumPieces:n})}} /></label>
    <label>Configurar estado ou evento<select value={trigger} onChange={e=>setTrigger(e.target.value as Trigger)}>
      <optgroup label="Estados contínuos">{Object.entries(STATES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</optgroup>
      <optgroup label="Eventos pontuais">{Object.entries(EVENTS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</optgroup>
    </select></label>
    <div style={{display:'flex',gap:4,margin:'8px 0',flexWrap:'wrap'}}>
      <button onClick={()=>onContext(isState?{...context,states:[{trigger,color,ply:context.ply}]}:{...context,ply:context.ply+1,events:[...context.events,{trigger,color,ply:context.ply+1}].slice(-64)})}>{isState?'Simular estado':'Disparar evento'}</button>
      <button disabled={config.rules.length>=48} onClick={()=>onChange({...config,rules:[...config.rules,{id:`rule-${Date.now()}-${config.rules.length}`,trigger,enabled:true,target:'both',duration:4,actions:[]}]})}>Adicionar regra</button>
    </div>
    <p>{isState?'As influências retornam à base quando o estado termina.':'Cada ocorrência renova o efeito, sem acumular. A duração conta meios-lances desde o evento.'} Regras seguem a ordem salva; percentuais multiplicam, e a última escala/variação/filtro prevalece. BPM e escala são globais.</p>
    {config.rules.filter(r=>r.trigger===trigger).map(rule=><fieldset key={rule.id} style={{border:'1px solid #45534a',padding:8,margin:'8px 0'}}>
      <legend>{TRIGGERS[rule.trigger]}</legend>
      <label><input type="checkbox" checked={rule.enabled} onChange={e=>patch(rule.id,{enabled:e.target.checked})}/>Regra habilitada</label>
      <label>Alvo das ações por peça<select value={rule.target} onChange={e=>patch(rule.id,{target:e.target.value as Reaction['target']})}>
        <option value="both">Ambos</option><option value="actor">Lado do gatilho</option><option value="opponent">Oponente do gatilho</option><option value="w">Brancas</option><option value="b">Pretas</option>
      </select></label>
      {!isState&&<label>Duração (meios-lances)<input type="number" min={1} max={32} value={rule.duration} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=32)patch(rule.id,{duration:n})}}/></label>}
      {rule.actions.map((action,i)=>{
        const change=(a:Partial<typeof action>)=>patch(rule.id,{actions:rule.actions.map((v,j)=>i===j?{...v,...a}:v)})
        const ranges:Record<string,[number,number]>={transpose:[-12,12],bpm:[-30,30],mode:[0,6],variation:[0,3],gain:[-100,100],lpf:[20,20000]}
        return <div key={i} style={{borderTop:'1px solid #35443a',paddingTop:8,marginTop:8}}>
          <label>Influência<select value={action.type} onChange={e=>change({type:e.target.value as typeof action.type,value:e.target.value==='lpf'?4000:0})}>{Object.entries(ACTIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          {ranges[action.type]&&<label>Valor<input type="number" min={ranges[action.type][0]} max={ranges[action.type][1]} value={action.value} onChange={e=>{const n=Number(e.target.value),[lo,hi]=ranges[action.type];if(Number.isFinite(n)&&n>=lo&&n<=hi&&(!['transpose','mode','variation'].includes(action.type)||Number.isInteger(n)))change({value:n})}}/></label>}
          {action.type==='scale'&&<label>Escala de destino<select value={action.scale} onChange={e=>change({scale:e.target.value as typeof action.scale})}>{Object.keys(SCALE_INTERVALS).map(s=><option key={s}>{s}</option>)}</select></label>}
          <button onClick={()=>patch(rule.id,{actions:rule.actions.filter((_,j)=>j!==i)})}>Remover influência</button>
        </div>
      })}
      <button disabled={rule.actions.length>=12} onClick={()=>patch(rule.id,{actions:[...rule.actions,{type:'gain',value:10,scale:'Maior'}]})}>Adicionar influência</button>{' '}
      <button onClick={()=>onChange({...config,rules:config.rules.filter(r=>r.id!==rule.id)})}>Remover regra</button>
    </fieldset>)}
    <details><summary>Catálogo completo de estados e eventos</summary><ul>{Object.entries(TRIGGERS).map(([id,label])=><li key={id}><button onClick={()=>setTrigger(id as Trigger)}>{label} · {config.rules.filter(r=>r.trigger===id).length} regras</button></li>)}</ul></details>
    <p>Relativa conserva as notas entre maior e menor natural. Rotação modal troca a tônica dentro das mesmas notas. Inversão espelha os graus da melodia. “Escala complementar” não é uma operação definida nesta versão.</p>
  </section>
}
