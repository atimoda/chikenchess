'use client'
import { InfoTip, HelpLabel } from './info-tip'
import { useState } from 'react'
import { ACTIONS, STATES, EVENTS, TRIGGERS, SCALE_INTERVALS, type Trigger, type Reactions, type ReactionContext, type Reaction } from '@/lib/music/reactions'

type Props={config:Reactions;onChange:(config:Reactions)=>void;context:ReactionContext;onContext:(context:ReactionContext)=>void;descriptions:string[];bpm:number;scale:string[]}
export function MusicReactionEditor({config,onChange,context,onContext,descriptions,bpm,scale}:Props){
  const [trigger,setTrigger]=useState<Trigger>('check'),[color,setColor]=useState<'w'|'b'>('w')
  const patch=(id:string,change:Partial<Reaction>)=>onChange({...config,rules:config.rules.map(r=>r.id===id?{...r,...change}:r)})
  const isState=trigger in STATES
  return <section aria-label="Estados e Eventos" style={{padding:12,border:'1px solid #35443a',background:'#19221d',borderRadius:8}}>
    <h2>Estados e Eventos<InfoTip label="Simulação">Simulação sonora · o tabuleiro livre não muda de posição.</InfoTip></h2>

    <label><HelpLabel label="Estado atual">Simula um estado contínuo sem fazer jogadas. Para comparar, o Criativo isola um estado por vez.</HelpLabel><select value={context.states[0]?.trigger??'opening'} onChange={e=>onContext({...context,states:[{trigger:e.target.value as Trigger,color,ply:context.ply}]})}>
      {Object.entries(STATES).map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select></label>
    <label><span style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>Lado do estado/evento<InfoTip label="Lado do gatilho">Em cheque, o lado acima é o atacante. Em perda de todas as peças de um tipo/formação mínima, é o lado afetado.</InfoTip></span><select value={color} onChange={e=>{const c=e.target.value as 'w'|'b';setColor(c);onContext({...context,states:context.states.map(s=>({...s,color:c}))})}}><option value="w">Brancas</option><option value="b">Pretas</option></select></label>

    <output aria-live="polite">{bpm.toFixed(1)} BPM · {scale.join(' ')} · meio-lance {context.ply}</output>
    <ul>{descriptions.length?descriptions.map((d,i)=><li key={i}>{d}</li>):<li>Nenhuma influência configurada em execução.</li>}</ul>
    <div style={{display:'flex',gap:4,flexWrap:'wrap',margin:'8px 0'}}>
      <button onClick={()=>onContext({...context,ply:context.ply+1})}>Avançar meio-lance</button>
      <button onClick={()=>onContext({ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]})}>Limpar simulação</button>
    </div>
    <label><HelpLabel label="Formação mínima · peças restantes por lado (inclui rei)">Limiar de material restante que dispara eventos de formação mínima. Inclui o rei; não conta apenas as vozes ativas.</HelpLabel><input type="number" min={2} max={15} value={config.minimumPieces} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=2&&n<=15)onChange({...config,minimumPieces:n})}} /></label>
    <label><span style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>Configurar estado ou evento<InfoTip label="Duração e prioridades">{isState?'As influências retornam à base quando o estado termina.':'Cada ocorrência renova o efeito, sem acumular. A duração conta meios-lances desde o evento.'} Regras seguem a ordem salva; percentuais multiplicam, e a última escala/variação/filtro prevalece. BPM e escala são globais.</InfoTip></span><select value={trigger} onChange={e=>setTrigger(e.target.value as Trigger)}>
      <optgroup label="Estados contínuos">{Object.entries(STATES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</optgroup>
      <optgroup label="Eventos pontuais">{Object.entries(EVENTS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</optgroup>
    </select></label>
    <div style={{display:'flex',gap:4,margin:'8px 0',flexWrap:'wrap'}}>
      <button onClick={()=>onContext(isState?{...context,states:[{trigger,color,ply:context.ply}]}:{...context,ply:context.ply+1,events:[...context.events,{trigger,color,ply:context.ply+1}].slice(-64)})}>{isState?'Simular estado':'Disparar evento'}</button>
      <button disabled={config.rules.length>=48} onClick={()=>onChange({...config,rules:[...config.rules,{id:`rule-${Date.now()}-${config.rules.length}`,trigger,enabled:true,quantize:false,target:'both',duration:4,actions:[]}]})}>Adicionar regra</button>
    </div>

    {config.rules.filter(r=>r.trigger===trigger).map(rule=><fieldset key={rule.id} style={{border:'1px solid #45534a',padding:8,margin:'8px 0'}}>
      <legend>{TRIGGERS[rule.trigger]}</legend>
      <label><input type="checkbox" checked={rule.enabled} onChange={e=>patch(rule.id,{enabled:e.target.checked})}/>Regra habilitada</label>
      <label><input type="checkbox" checked={rule.quantize} onChange={e=>patch(rule.id,{quantize:e.target.checked})}/>Aplicar na virada do compasso<InfoTip label="Virada do compasso">Inclui entrada, alterações e retorno. Desmarcado: próximos ataques disponíveis. Pausado: aplica agora.</InfoTip></label>

      <label><HelpLabel label="Alvo das ações por peça">Escolhe as vozes afetadas. BPM e troca de escala continuam globais; os demais parâmetros respeitam o lado.</HelpLabel><select value={rule.target} onChange={e=>patch(rule.id,{target:e.target.value as Reaction['target']})}>
        <option value="both">Ambos</option><option value="actor">Lado do gatilho</option><option value="opponent">Oponente do gatilho</option><option value="w">Brancas</option><option value="b">Pretas</option>
      </select></label>
      {!isState&&<label><HelpLabel label="Duração (meios-lances)">Quantas jogadas individuais o efeito permanece. Cada movimento de um lado conta como um meio-lance.</HelpLabel><input type="number" min={1} max={32} value={rule.duration} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=32)patch(rule.id,{duration:n})}}/></label>}
      {rule.actions.map((action,i)=>{
        const change=(a:Partial<typeof action>)=>patch(rule.id,{actions:rule.actions.map((v,j)=>i===j?{...v,...a}:v)})
        const ranges:Record<string,[number,number]>={transpose:[-12,12],bpm:[-30,30],mode:[0,11],variation:[0,7],gain:[-100,100],lpf:[20,20000]}
        return <div key={i} style={{borderTop:'1px solid #35443a',paddingTop:8,marginTop:8}}>
          <label><span style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>Influência<InfoTip label="Transformações musicais">Relativa conserva as notas entre maior e menor natural. Rotação modal troca a tônica dentro das mesmas notas. Inversão espelha os graus da melodia. “Escala complementar” não é uma operação definida nesta versão.</InfoTip></span><select value={action.type} onChange={e=>change({type:e.target.value as typeof action.type,value:e.target.value==='lpf'?4000:0})}>{Object.entries(ACTIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          {ranges[action.type]&&<label><HelpLabel label="Valor">Intensidade da influência na unidade indicada: semitons, porcentagem, graus, índice de variação ou hertz.</HelpLabel><input type="number" min={ranges[action.type][0]} max={ranges[action.type][1]} value={action.value} onChange={e=>{const n=Number(e.target.value),[lo,hi]=ranges[action.type];if(Number.isFinite(n)&&n>=lo&&n<=hi&&(!['transpose','mode','variation'].includes(action.type)||Number.isInteger(n)))change({value:n})}}/></label>}
          {action.type==='bpm'&&<label><HelpLabel label="Rampa de BPM (compassos; 0 = salto)">Duração da transição de velocidade. Zero troca diretamente; de 1 a 16 faz uma mudança gradual, inclusive no retorno.</HelpLabel><input type="number" min={0} max={16} value={action.rampBars??0} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=16)change({rampBars:n})}}/></label>}
          {action.type==='scale'&&<label><HelpLabel label="Escala de destino">Escala aplicada enquanto esta influência estiver em execução, usando a tônica resultante das regras anteriores.</HelpLabel><select value={action.scale} onChange={e=>change({scale:e.target.value as typeof action.scale})}>{Object.keys(SCALE_INTERVALS).map(s=><option key={s}>{s}</option>)}</select></label>}
          <button onClick={()=>patch(rule.id,{actions:rule.actions.filter((_,j)=>j!==i)})}>Remover influência</button>
        </div>
      })}
      <button disabled={rule.actions.length>=12} onClick={()=>patch(rule.id,{actions:[...rule.actions,{type:'gain',value:10,scale:'Maior'}]})}>Adicionar influência</button>{' '}
      <button onClick={()=>onChange({...config,rules:config.rules.filter(r=>r.id!==rule.id)})}>Remover regra</button>
    </fieldset>)}
    <details><summary>Catálogo completo de estados e eventos</summary><ul>{Object.entries(TRIGGERS).map(([id,label])=><li key={id}><button onClick={()=>setTrigger(id as Trigger)}>{label} · {config.rules.filter(r=>r.trigger===id).length} regras</button></li>)}</ul></details>

  </section>
}
