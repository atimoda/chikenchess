'use client'
import { InfoTip, HelpLabel } from './info-tip'
import { CompactNumberInput } from './compact-number-input'
import { useRef, useState } from 'react'
import { Power, Settings } from 'lucide-react'
import { ACTIONS, EVENTS, STATES, TRIGGERS, SCALE_INTERVALS, type Trigger, type Reactions, type ReactionContext, type Reaction } from '@/lib/music/reactions'
import { HARMONY_PLANS } from '@/lib/music/harmony'

type Props={config:Reactions;onChange:(config:Reactions)=>void;context:ReactionContext;onContext:(context:ReactionContext)=>void;descriptions:string[];bpm:number;scale:string[]}
export function MusicReactionEditor({config,onChange,context,onContext,descriptions,bpm,scale}:Props){
  const [trigger,setTrigger]=useState<Trigger|null>(null),[color,setColor]=useState<'w'|'b'>('w')
  const editorRef=useRef<HTMLDivElement>(null)
  const patch=(id:string,change:Partial<Reaction>)=>onChange({...config,rules:config.rules.map(rule=>rule.id===id?{...rule,...change}:rule)})
  const isActive=(id:Trigger)=>{
    if(id in STATES)return context.states.some(state=>state.trigger===id)
    const durations=config.rules.filter(rule=>rule.enabled&&rule.trigger===id).map(rule=>rule.duration)
    const indefinite=durations.includes(0),duration=Math.max(1,...durations)
    return context.events.some(event=>event.trigger===id&&context.ply-event.ply>=0&&(indefinite||context.ply-event.ply<duration))
  }
  const activate=(id:Trigger)=>{
    setTrigger(id)
    if(id in STATES)onContext({...context,states:isActive(id)?context.states.filter(state=>state.trigger!==id):[{trigger:id,color,ply:context.ply}]})
    else onContext({...context,events:isActive(id)?context.events.filter(event=>event.trigger!==id):[...context.events.filter(event=>event.trigger!==id),{trigger:id,color,ply:context.ply}].slice(-64)})
  }
  const changeColor=(next:'w'|'b')=>{
    setColor(next)
    if(!trigger)return
    if(trigger in STATES)onContext({...context,states:context.states.map(state=>state.trigger===trigger?{...state,color:next}:state)})
    else{
      const last=[...context.events].map((event,index)=>({event,index})).reverse().find(item=>item.event.trigger===trigger)?.index
      if(last!==undefined)onContext({...context,events:context.events.map((event,index)=>index===last?{...event,color:next}:event)})
    }
  }
  const isState=trigger!==null&&trigger in STATES
  const triggerList=(entries:Record<string,string>)=><ul style={{display:'flex',flexWrap:'wrap',gap:5,listStyle:'none',padding:0,margin:'6px 0 12px'}}>{Object.entries(entries).map(([id,label])=>{
    const key=id as Trigger,count=config.rules.filter(rule=>rule.trigger===key).length,editing=trigger===key
    return <li key={id} style={{position:'relative',display:'inline-flex'}}>
      <button style={{paddingRight:editing?36:11}} aria-pressed={isActive(key)} onClick={()=>activate(key)}>{label} · {count} {count===1?'regra':'regras'}</button>
      {editing&&<button type="button" aria-label={`Ir para edição de ${label}`} title="Ir para edição" onClick={()=>editorRef.current?.scrollIntoView({behavior:'smooth',block:'start'})} style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',width:24,height:24,minWidth:24,padding:0,borderRadius:'50%',color:'#fff'}}><Settings size={13}/></button>}
    </li>
  })}</ul>
  return <section aria-label="Estados e Eventos" style={{padding:12,border:'1px solid #35443a',background:'#19221d',borderRadius:8}}>
    <h2>Estados e Eventos<InfoTip label="Simulação">Clique num item para ligá-lo e abrir suas regras; clique novamente para desligá-lo. Um estado contínuo e vários eventos temporários podem influenciar a música ao mesmo tempo; escolher outro estado substitui o anterior. Eventos permanecem ativos pela duração das regras e só o botão “Avançar meio-lance” faz o relógio da simulação avançar. As configurações fazem parte do kit atual e ficam vinculadas à cidade quando o kit da fase é salvo.</InfoTip></h2>
    <h3 style={{fontSize:12,marginTop:10}}>Estados</h3>
    {triggerList(STATES)}
    <h3 style={{fontSize:12}}>Eventos</h3>
    {triggerList(EVENTS)}
    {trigger&&<div ref={editorRef} style={{borderTop:'1px solid #405247',marginTop:12,paddingTop:12,scrollMarginTop:12}}>
      <h3 style={{display:'flex',alignItems:'center',gap:6,fontSize:15}}><span style={{flex:1}}>{isState?'Estado':'Evento'}: {TRIGGERS[trigger]}</span><button type="button" aria-label={`${isActive(trigger)?'Desativar':'Ativar'} ${TRIGGERS[trigger]}`} title={isActive(trigger)?'Desativar':'Ativar'} aria-pressed={isActive(trigger)} onClick={()=>activate(trigger)} style={{width:30,height:30,minWidth:30,padding:0,borderRadius:'50%'}}><Power size={15}/></button><InfoTip label="Duração e prioridades">{isState?'As influências retornam à base quando o estado termina.':'Cada nova ativação renova o evento sem acumular a mesma regra. A duração conta meios-lances.'} Regras seguem a ordem salva; percentuais multiplicam, e a última escala, variação ou filtro prevalece.</InfoTip></h3>
      <label><span style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>Lado do estado/evento<InfoTip label="Lado do gatilho">Em cheque, este é o lado atacante. Em perda de peças ou formação mínima, é o lado afetado.</InfoTip></span><select value={color} onChange={e=>changeColor(e.target.value as 'w'|'b')}><option value="w">Brancas</option><option value="b">Pretas</option></select></label>
      <output aria-live="polite">{bpm.toFixed(1)} BPM · {scale.join(' ')} · meio-lance {context.ply}</output>
      <ul>{descriptions.length?descriptions.map((description,index)=><li key={index}>{description}</li>):<li>Nenhuma influência configurada em execução.</li>}</ul>
      <div style={{display:'flex',gap:4,flexWrap:'wrap',margin:'8px 0'}}>
        <button onClick={()=>onContext({...context,ply:context.ply+1})}>Avançar meio-lance</button>
        <button disabled={config.rules.length>=80} onClick={()=>onChange({...config,rules:[...config.rules,{id:`rule-${Date.now()}-${config.rules.length}`,trigger,enabled:true,quantize:false,target:'both',duration:4,actions:[]}]})}>Adicionar regra</button>
      </div>
      {(trigger==='minimumOne'||trigger==='minimumBoth')&&<label><HelpLabel label="Formação mínima · peças restantes por lado (inclui rei)">Este limiar pertence somente aos eventos de formação mínima. Eles disparam quando restam no máximo esta quantidade de peças no tabuleiro para um lado; o rei entra na contagem.</HelpLabel><input type="number" min={2} max={15} value={config.minimumPieces} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=2&&n<=15)onChange({...config,minimumPieces:n})}} /></label>}
      {config.rules.filter(rule=>rule.trigger===trigger).map(rule=><fieldset key={rule.id} style={{border:'1px solid #45534a',padding:8,margin:'8px 0'}}>
        <legend>{TRIGGERS[rule.trigger]}</legend>
        <label><input type="checkbox" checked={rule.enabled} onChange={e=>patch(rule.id,{enabled:e.target.checked})}/>Regra habilitada</label>
        <label><input type="checkbox" checked={rule.quantize} onChange={e=>patch(rule.id,{quantize:e.target.checked})}/>Aplicar na virada do compasso<InfoTip label="Virada do compasso">Inclui entrada, alterações e retorno. Desmarcado: próximos ataques disponíveis. Pausado: aplica agora.</InfoTip></label>
        <label><HelpLabel label="Alvo das ações por peça">Escolhe as vozes afetadas. BPM, escala e plano harmônico continuam globais; os demais parâmetros respeitam o lado.</HelpLabel><select value={rule.target} onChange={e=>patch(rule.id,{target:e.target.value as Reaction['target']})}><option value="both">Ambos</option><option value="actor">Lado do gatilho</option><option value="opponent">Oponente do gatilho</option><option value="w">Brancas</option><option value="b">Pretas</option></select></label>
        {!isState&&<label><HelpLabel label="Duração (meios-lances; 0 = infinita)">Quantas jogadas individuais o efeito permanece. Cada movimento de um lado conta como um meio-lance. Zero mantém o evento até o fim da partida ou até a simulação ser desligada.</HelpLabel><input type="number" min={0} max={32} value={rule.duration} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=32)patch(rule.id,{duration:n})}}/></label>}
        {rule.actions.map((action,index)=>{
          const change=(next:Partial<typeof action>)=>patch(rule.id,{actions:rule.actions.map((value,actionIndex)=>actionIndex===index?{...value,...next}:value)})
          const ranges:Record<string,[number,number]>={transpose:[-12,12],bpm:[-30,30],mode:[0,11],variation:[0,7],gain:[-100,100],lpf:[20,20000]}
          return <div key={index} style={{borderTop:'1px solid #35443a',paddingTop:8,marginTop:8}}>
            <label><span style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>Influência<InfoTip label="Transformações musicais">Relativa conserva as notas entre maior e menor natural. Rotação modal troca a tônica dentro das mesmas notas. Plano harmônico move em conjunto baixo, harmonia e melodias a cada seção. Inversão espelha os graus da melodia.</InfoTip></span><select value={action.type} onChange={e=>change({type:e.target.value as typeof action.type,value:e.target.value==='lpf'?4000:0})}>{Object.entries(ACTIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
            {ranges[action.type]&&<label><HelpLabel label="Valor">Intensidade da influência na unidade indicada: semitons, porcentagem, graus, índice de variação ou hertz.</HelpLabel><CompactNumberInput ariaLabel="Valor" min={ranges[action.type][0]} max={ranges[action.type][1]} value={action.value} onChange={n=>{if(!['transpose','mode','variation'].includes(action.type)||Number.isInteger(n))change({value:n})}}/></label>}
            {action.type==='bpm'&&<label><HelpLabel label="Rampa de BPM (compassos; 0 = salto)">Duração da transição de velocidade. Zero troca diretamente; de 1 a 16 faz uma mudança gradual, inclusive no retorno.</HelpLabel><input type="number" min={0} max={16} value={action.rampBars??0} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=0&&n<=16)change({rampBars:n})}}/></label>}
            {action.type==='scale'&&<label><HelpLabel label="Escala de destino">Escala aplicada enquanto esta influência estiver em execução, usando a tônica resultante das regras anteriores.</HelpLabel><select value={action.scale} onChange={e=>change({scale:e.target.value as typeof action.scale})}>{Object.keys(SCALE_INTERVALS).map(name=><option key={name}>{name}</option>)}</select></label>}
            {action.type==='harmony'&&<label><HelpLabel label="Plano harmônico">Sequência de centros em graus da escala, alinhada às variações A–D. Vozes de pulso e samples não afinados não mudam.</HelpLabel><select value={action.harmony} onChange={e=>change({harmony:e.target.value as typeof action.harmony})}>{Object.entries(HARMONY_PLANS).map(([id,plan])=><option key={id} value={id}>{plan.label}</option>)}</select></label>}
            <button onClick={()=>patch(rule.id,{actions:rule.actions.filter((_,actionIndex)=>actionIndex!==index)})}>Remover influência</button>
          </div>
        })}
        <button disabled={rule.actions.length>=12} onClick={()=>patch(rule.id,{actions:[...rule.actions,{type:'gain',value:10,scale:'Maior',harmony:'static'}]})}>Adicionar influência</button>{' '}
        <button onClick={()=>onChange({...config,rules:config.rules.filter(item=>item.id!==rule.id)})}>Remover regra</button>
      </fieldset>)}
    </div>}
  </section>
}
