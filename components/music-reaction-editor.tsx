'use client'
import { InfoTip } from './info-tip'
import { CompactNumberInput } from './compact-number-input'
import { useState } from 'react'
import { ChevronDown, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react'
import { ACTIONS, BOARD_EVENTS, DEFAULT_THRESHOLDS, DYNAMICS_TRIGGERS, INSTRUMENT_FILTERS, RAMPED_ACTIONS, POWER_EVENTS, STATES, TRIGGERS, SCALE_INTERVALS, SCALE_LABELS, actionSummary, inheritTrigger, overrideTrigger, resolveReactions, type Trigger, type Thresholds, type KitReactions, type ReactionContext, type Reaction } from '@/lib/music/reactions'
import { HARMONY_PLANS } from '@/lib/music/harmony'
import { SCALE_SHIFTS } from '@/lib/music/scale-shift'
import { saveOfficialReactions } from '@/lib/admin/reactions-file-client'
import { isOfficialGlobalReactions, saveGlobalReactions, useGlobalReactions } from '@/lib/music/global-reactions'
import styles from './music-reaction-editor.module.css'

type Action=Reaction['actions'][number]
type Scope='kit'|'global'
type Props={kit:KitReactions;onKitChange:(kit:KitReactions)=>void;kitName:string;context:ReactionContext;onContext:(context:ReactionContext)=>void;descriptions:string[];bpm:number;scale:string[]}

const TARGETS:Record<Reaction['target'],string>={both:'Both sides',actor:'Trigger side',opponent:'Opponent',w:'White',b:'Black'}
const RANGES:Partial<Record<Action['type'],{min:number;max:number;step?:number;unit:string}>>={transpose:{min:-12,max:12,unit:'st'},bpm:{min:-30,max:30,unit:'%'},mode:{min:0,max:11,unit:'steps'},gain:{min:-100,max:100,unit:'%'},lpf:{min:20,max:20000,step:100,unit:'Hz'},hpf:{min:20,max:20000,step:50,unit:'Hz'},resonance:{min:0,max:30,step:.5,unit:'Q'},reverb:{min:0,max:1,step:.05,unit:'send'},delay:{min:0,max:1,step:.05,unit:'send'},drive:{min:0,max:10,step:.1,unit:''},pan:{min:-1,max:1,step:.05,unit:'L–R'}}
const DEFAULT_VALUE:Partial<Record<Action['type'],number>>={gain:10,bpm:5,transpose:2,mode:1,lpf:4000,variation:1,hpf:300,resonance:8,reverb:.5,delay:.35,drive:2,pan:0}
const ACTION_HELP='Scale change moves from whatever scale and key the kit is in (relative, parallel, brighter or darker mode, neighbour key, chromatic mediant, key lift or a random choice), so it suits any style; Fixed scale always switches to the named scale. Random choices repeat for the same moment of the game. Tempo, scale, relative, modal rotation and harmony plan are global even when the rule targets one side. Transpose, gain, filters, resonance, reverb, delay, drive, pan, inversion, variation and activation follow the target and, when set, only the chosen instrument role. Tempo, gain and the filters can glide over a number of bars, entering and leaving. Percentages multiply; the last scale, plan, filter or variation wins.'
const MINIMUM_TRIGGERS=new Set<Trigger>(['minimumOne','minimumBoth'])
const DYNAMICS=new Set<string>(DYNAMICS_TRIGGERS)
const INTEGER_ACTIONS=new Set<Action['type']>(['transpose','mode'])
/** The threshold each game-dynamics trigger reads, with its range and unit. */
const THRESHOLDS:Partial<Record<Trigger,{key:keyof Thresholds;label:string;min:number;max:number;step:number}>>={
  tension:{key:'tension',label:'Balanced within (centipawns), from move 15',min:10,max:300,step:10},
  evalSwing:{key:'swing',label:'Evaluation swing in one move (centipawns)',min:50,max:1000,step:10},
  captureDrought:{key:'drought',label:'Plies without a capture',min:6,max:60,step:1},
}

/** Replace one trigger's rules in place, so the saved order of the others is kept. */
function replaceTriggerRules(rules:Reaction[],trigger:Trigger,next:Reaction[]){
  const first=rules.findIndex(rule=>rule.trigger===trigger)
  const rest=rules.filter(rule=>rule.trigger!==trigger)
  if(first<0)return [...rest,...next]
  const before=rules.slice(0,first).filter(rule=>rule.trigger!==trigger).length
  return [...rest.slice(0,before),...next,...rest.slice(before)]
}

function ruleSummary(rule:Reaction,isState:boolean){
  const actions=rule.actions.length?rule.actions.map(actionSummary).join(' · '):'No influence'
  const meta=[TARGETS[rule.target],!isState&&(rule.duration===0?'until the end':`${rule.duration} ${rule.duration===1?'ply':'plies'}`),rule.quantize&&'on bar line'].filter(Boolean).join(', ')
  return {actions,meta}
}

export function MusicReactionEditor({kit,onKitChange,kitName,context,onContext,descriptions,bpm,scale}:Props){
  const global=useGlobalReactions()
  const [scope,setScope]=useState<Scope>('kit'),[open,setOpen]=useState<Trigger|null>(null),[color,setColor]=useState<'w'|'b'>('w')
  const resolved=resolveReactions(global,kit)
  const shown=scope==='kit'?resolved:global
  const customized=kit.overrides.length+(kit.minimumPieces===undefined?0:1)+Object.keys(kit.thresholds??{}).length
  const officialGlobal=isOfficialGlobalReactions(global)
  const [saving,setSaving]=useState<{busy:boolean;message?:string;error?:boolean}>({busy:false})
  const saveToGame=()=>{
    setSaving({busy:true})
    saveOfficialReactions(global).then(()=>setSaving({busy:false,message:'Saved to data/music/reactions.json. Deploy to publish it.'}),(error:Error)=>setSaving({busy:false,message:error.message,error:true}))
  }

  const isActive=(id:Trigger)=>{
    if(id in STATES)return context.states.some(state=>state.trigger===id)
    const durations=resolved.rules.filter(rule=>rule.enabled&&rule.trigger===id).map(rule=>rule.duration)
    const indefinite=durations.includes(0),duration=Math.max(1,...durations)
    return context.events.some(event=>event.trigger===id&&context.ply-event.ply>=0&&(indefinite||context.ply-event.ply<duration))
  }
  const simulate=(id:Trigger)=>{
    if(id in STATES)onContext({...context,states:isActive(id)?context.states.filter(state=>state.trigger!==id):[{trigger:id,color,ply:context.ply}]})
    else onContext({...context,events:isActive(id)?context.events.filter(event=>event.trigger!==id):[...context.events.filter(event=>event.trigger!==id),{trigger:id,color,ply:context.ply}].slice(-64)})
  }
  const changeColor=(next:'w'|'b')=>{
    setColor(next)
    // Re-colour what is currently simulated, so the side switch is heard immediately.
    onContext({...context,states:context.states.map(state=>({...state,color:next})),events:context.events.map(event=>({...event,color:next}))})
  }
  const setRules=(trigger:Trigger,next:Reaction[])=>{
    if(scope==='global')saveGlobalReactions({...global,rules:replaceTriggerRules(global.rules,trigger,next)})
    else onKitChange({...kit,rules:replaceTriggerRules(kit.rules,trigger,next)})
  }
  const setThreshold=(key:keyof Thresholds,value:number|undefined)=>{
    const apply=(current:Thresholds|undefined)=>{const next={...current};if(value===undefined)delete next[key];else next[key]=value;return Object.keys(next).length?next:undefined}
    if(scope==='global'){if(value!==undefined)saveGlobalReactions({...global,thresholds:apply(global.thresholds)})}
    else{const {thresholds:_drop,...rest}=kit,thresholds=apply(kit.thresholds);onKitChange(thresholds?{...kit,thresholds}:rest as KitReactions)}
  }
  const setMinimum=(value:number|undefined)=>{
    if(scope==='global'){if(value!==undefined)saveGlobalReactions({...global,minimumPieces:value})}
    else{const {minimumPieces:_drop,...rest}=kit;onKitChange(value===undefined?rest as KitReactions:{...kit,minimumPieces:value})}
  }

  const row=(id:Trigger)=>{
    const isState=id in STATES,rules=shown.rules.filter(rule=>rule.trigger===id),owned=kit.overrides.includes(id),expanded=open===id,active=isActive(id)
    const enabled=rules.filter(rule=>rule.enabled)
    return <li key={id} className={styles.row} data-open={expanded||undefined} data-active={active||undefined} data-own={(scope==='kit'&&owned)||undefined}>
      <div className={styles.rowHead}>
        <button type="button" className={styles.simulate} aria-pressed={active} aria-label={`${active?'Stop':'Simulate'} ${TRIGGERS[id]}`} title={active?'Stop simulating':'Simulate now'} onClick={()=>simulate(id)}><span/></button>
        <button type="button" className={styles.rowMain} aria-expanded={expanded} onClick={()=>setOpen(expanded?null:id)}>
          <span className={styles.rowTitle}>
            <span>{TRIGGERS[id]}</span>
            {scope==='kit'&&owned&&<span className={styles.badge} title="This kit uses its own rules here">Kit</span>}
          </span>
          <span className={styles.rowSummary}>{enabled.length?enabled.map(rule=>ruleSummary(rule,isState).actions).join('  |  '):rules.length?'Off':'Silent'}</span>
        </button>
        <ChevronDown className={styles.chevron} size={15} aria-hidden/>
      </div>
      {expanded&&<TriggerPanel trigger={id} scope={scope} rules={rules} owned={owned} kitName={kitName}
        minimum={MINIMUM_TRIGGERS.has(id)?{value:shown.minimumPieces,custom:scope==='kit'&&kit.minimumPieces!==undefined,global:global.minimumPieces}:undefined}
        threshold={THRESHOLDS[id]&&(()=>{const t=THRESHOLDS[id]!;return {...t,value:shown.thresholds?.[t.key]??global.thresholds?.[t.key]??DEFAULT_THRESHOLDS[t.key],custom:scope==='kit'&&kit.thresholds?.[t.key]!==undefined,global:global.thresholds?.[t.key]??DEFAULT_THRESHOLDS[t.key]}})()}
        onThreshold={setThreshold}
        onRules={next=>setRules(id,next)} onMinimum={setMinimum}
        onCustomize={()=>onKitChange(overrideTrigger(kit,global,id))} onInherit={()=>onKitChange(inheritTrigger(kit,id))}/>}
    </li>
  }

  return <section aria-label="States and Events" className={styles.panel}>
    <header className={styles.header}>
      <h2>States &amp; Events<InfoTip label="How rules combine">A global rule set applies to every kit. A kit can take over any state or event with its own rules; everything it does not customise keeps following the global set, including later global edits. States last while the position holds; events last the number of plies set in each rule.</InfoTip></h2>
      <div className={styles.scope} role="tablist" aria-label="Rules being edited">
        <button type="button" role="tab" aria-selected={scope==='kit'} onClick={()=>setScope('kit')}>This kit</button>
        <button type="button" role="tab" aria-selected={scope==='global'} onClick={()=>setScope('global')}>Global</button>
      </div>
    </header>

    <p className={styles.scopeNote}>
      {scope==='kit'
        ?<><span><strong>{kitName}</strong> · {customized?`${kit.overrides.length} custom (marked KIT), the rest follow global`:'follows the global rules'}</span>
          {customized>0&&<button type="button" className={styles.link} onClick={()=>onKitChange({overrides:[],rules:[]} as KitReactions)}><RotateCcw size={12}/>Reset kit to global</button>}</>
        :<><span>Shared by every kit · {officialGlobal?'official set':'edited in this browser'}</span>
          <span className={styles.actionsRow}>
            {!officialGlobal&&<button type="button" className={styles.link} onClick={()=>saveGlobalReactions(null)}><RotateCcw size={12}/>Restore official</button>}
            <button type="button" className={styles.save} disabled={saving.busy||officialGlobal} title="Write these rules to the game's official file (local Admin only)" onClick={saveToGame}><Save size={13}/>{saving.busy?'Saving…':'Save to game'}</button>
          </span></>}
    </p>
    {scope==='global'&&saving.message&&<p className={styles.saveStatus} data-error={saving.error||undefined} role="status">{saving.message}</p>}

    <div className={styles.simulator} aria-label="Simulation">
      <div className={styles.simControls}>
        <span className={styles.simLabel}>Simulate</span>
        <div className={styles.segment} role="group" aria-label="Trigger side">
          <button type="button" aria-pressed={color==='w'} onClick={()=>changeColor('w')}>White</button>
          <button type="button" aria-pressed={color==='b'} onClick={()=>changeColor('b')}>Black</button>
        </div>
        <div className={styles.segment} role="group" aria-label="Half-move counter">
          <button type="button" disabled={context.ply===0} onClick={()=>onContext({...context,ply:Math.max(0,context.ply-1)})}>Previous ply</button>
          <button type="button" onClick={()=>onContext({...context,ply:context.ply+1})}>Next ply</button>
        </div>
        <InfoTip label="Simulation">A ply is a half-move: one move by one side. Use the dot on each row to switch a state or event on or off. A new state replaces the previous one; events stack and expire as you press Next ply, which advances the half-move counter without moving pieces. Previous ply steps back, bringing expired events back and hiding events switched on at a later ply. The side is the attacker for check and mate, the affected side for lost pieces and minimum force, and the mover for other events.</InfoTip>
      </div>
      <output className={styles.simStatus} aria-live="polite">Ply {context.ply} · {bpm.toFixed(1)} BPM · {scale.join(' ')}</output>
      <ul className={styles.influences}>{descriptions.length?descriptions.map((description,index)=><li key={index}>{description}</li>):<li className={styles.muted}>Nothing playing</li>}</ul>
    </div>

    <h3 className={styles.group}>States <span>continuous</span></h3>
    <ul className={styles.list}>{(Object.keys(STATES) as Trigger[]).filter(id=>!DYNAMICS.has(id)).map(row)}</ul>
    <h3 className={styles.group}>Game dynamics <span>tension, swings and plans</span></h3>
    <ul className={styles.list}>{(DYNAMICS_TRIGGERS as readonly Trigger[]).map(row)}</ul>
    <h3 className={styles.group}>Board events <span>timed</span></h3>
    <ul className={styles.list}>{(Object.keys(BOARD_EVENTS) as Trigger[]).filter(id=>!DYNAMICS.has(id)).map(row)}</ul>
    <h3 className={styles.group}>Powers &amp; hints <span>timed, chickenchess actions</span></h3>
    <ul className={styles.list}>{(Object.keys(POWER_EVENTS) as Trigger[]).map(row)}</ul>
  </section>
}

type PanelProps={trigger:Trigger;scope:Scope;rules:Reaction[];owned:boolean;kitName:string;minimum?:{value:number;custom:boolean;global:number};threshold?:{key:keyof Thresholds;label:string;min:number;max:number;step:number;value:number;custom:boolean;global:number};onThreshold:(key:keyof Thresholds,value:number|undefined)=>void;onRules:(rules:Reaction[])=>void;onMinimum:(value:number|undefined)=>void;onCustomize:()=>void;onInherit:()=>void}
function TriggerPanel({trigger,scope,rules,owned,kitName,minimum,threshold,onThreshold,onRules,onMinimum,onCustomize,onInherit}:PanelProps){
  const isState=trigger in STATES,editable=scope==='global'||owned
  const patch=(id:string,change:Partial<Reaction>)=>onRules(rules.map(rule=>rule.id===id?{...rule,...change}:rule))
  return <div className={styles.panelBody}>
    {scope==='kit'&&(owned
      ?<div className={styles.notice} data-kind="kit"><span>Custom rules for <strong>{kitName}</strong>.</span><button type="button" className={styles.link} onClick={onInherit}><RotateCcw size={12}/>Use global</button></div>
      :<div className={styles.notice}><span>Following the global rules.</span><button type="button" onClick={onCustomize}>Customize for this kit</button></div>)}
    {scope==='global'&&owned&&<div className={styles.notice} data-kind="warn"><span><strong>{kitName}</strong> overrides this {isState?'state':'event'}, so it will not hear these changes.</span></div>}
    {minimum&&<div className={styles.field}>
      <span>Minimum force: pieces left per side, king included</span>
      <div className={styles.inline}>
        <CompactNumberInput ariaLabel="Minimum pieces" min={2} max={15} value={minimum.value} onChange={n=>{if(Number.isInteger(n))onMinimum(n)}}/>
        {scope==='kit'&&minimum.custom&&<button type="button" className={styles.link} onClick={()=>onMinimum(undefined)}><RotateCcw size={12}/>Global ({minimum.global})</button>}
      </div>
    </div>}
    {threshold&&<div className={styles.field}>
      <span>{threshold.label}</span>
      <div className={styles.inline}>
        <CompactNumberInput ariaLabel={threshold.label} min={threshold.min} max={threshold.max} step={threshold.step} value={threshold.value} onChange={n=>{if(Number.isInteger(n))onThreshold(threshold.key,n)}}/>
        {scope==='kit'&&threshold.custom&&<button type="button" className={styles.link} onClick={()=>onThreshold(threshold.key,undefined)}><RotateCcw size={12}/>Global ({threshold.global})</button>}
      </div>
    </div>}
    {!editable
      ?<ul className={styles.readOnly}>{rules.length?rules.map(rule=>{const s=ruleSummary(rule,isState);return <li key={rule.id} data-off={!rule.enabled||undefined}><strong>{s.actions}</strong><span>{s.meta}{rule.enabled?'':' · off'}</span></li>}):<li>No rules: this {isState?'state':'event'} is silent.</li>}</ul>
      :<>
        {rules.map((rule,index)=><RuleCard key={rule.id} rule={rule} index={index} isState={isState} onChange={change=>patch(rule.id,change)} onRemove={()=>onRules(rules.filter(item=>item.id!==rule.id))}/>)}
        {!rules.length&&<p className={styles.muted}>No rules: this {isState?'state':'event'} is silent.</p>}
        <button type="button" className={styles.add} onClick={()=>onRules([...rules,{id:`rule-${Date.now()}-${rules.length}`,trigger,enabled:true,quantize:false,target:isState?'both':'actor',duration:isState?1:2,actions:[{type:'gain',value:10,scale:'Maior',harmony:'static'}]}])}><Plus size={13}/>Add rule</button>
      </>}
  </div>
}

function RuleCard({rule,index,isState,onChange,onRemove}:{rule:Reaction;index:number;isState:boolean;onChange:(change:Partial<Reaction>)=>void;onRemove:()=>void}){
  const setAction=(at:number,next:Partial<Action>)=>onChange({actions:rule.actions.map((action,i)=>i===at?{...action,...next}:action)})
  return <div className={styles.rule} data-off={!rule.enabled||undefined}>
    <div className={styles.ruleHead}>
      <label className={styles.toggle}><input type="checkbox" checked={rule.enabled} onChange={e=>onChange({enabled:e.target.checked})}/>Rule {index+1}</label>
      <button type="button" className={styles.icon} aria-label={`Delete rule ${index+1}`} title="Delete rule" onClick={onRemove}><Trash2 size={13}/></button>
    </div>
    <div className={styles.ruleMeta}>
      <label><span>Applies to</span><select value={rule.target} onChange={e=>onChange({target:e.target.value as Reaction['target']})}>{Object.entries(TARGETS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label><span>Instruments</span><select value={rule.instruments??'all'} onChange={e=>{const value=e.target.value as keyof typeof INSTRUMENT_FILTERS;onChange({instruments:value==='all'?undefined:value})}}>{Object.entries(INSTRUMENT_FILTERS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      {!isState&&<label><span>Lasts (plies, 0 = to the end)</span><CompactNumberInput ariaLabel="Duration in plies" min={0} max={32} value={rule.duration} onChange={n=>{if(Number.isInteger(n))onChange({duration:n})}}/></label>}
      <label className={styles.toggle} title="Enter, change and leave on the next bar line instead of the next available attacks."><input type="checkbox" checked={rule.quantize} onChange={e=>onChange({quantize:e.target.checked})}/>Wait for bar line</label>
    </div>
    <div className={styles.actionsHead}><span>Influences</span><InfoTip label="Influences">{ACTION_HELP}</InfoTip></div>
    <ul className={styles.actions}>{rule.actions.map((action,at)=>{
      const range=RANGES[action.type]
      return <li key={at}>
        <select aria-label="Influence" value={action.type} onChange={e=>{const type=e.target.value as Action['type'];setAction(at,{type,value:DEFAULT_VALUE[type]??0})}}>{Object.entries(ACTIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
        {range&&<span className={styles.value}><CompactNumberInput ariaLabel={ACTIONS[action.type]} min={range.min} max={range.max} step={range.step} value={action.value} onChange={n=>{if(!INTEGER_ACTIONS.has(action.type)||Number.isInteger(n))setAction(at,{value:n})}}/><small>{range.unit}</small></span>}
        {action.type==='variation'&&<select aria-label="Variation" value={action.value} onChange={e=>setAction(at,{value:Number(e.target.value)})}>{Array.from({length:8},(_,i)=><option key={i} value={i}>{String.fromCharCode(65+i)}</option>)}</select>}
        {action.type==='scale'&&<select aria-label="Target scale" value={action.scale} onChange={e=>setAction(at,{scale:e.target.value as Action['scale']})}>{(Object.keys(SCALE_INTERVALS) as (keyof typeof SCALE_INTERVALS)[]).map(name=><option key={name} value={name}>{SCALE_LABELS[name]}</option>)}</select>}
        {action.type==='scaleShift'&&<select aria-label="Scale change" value={action.shift??'relative'} onChange={e=>setAction(at,{shift:e.target.value as Action['shift']})}>{Object.entries(SCALE_SHIFTS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>}
        {action.type==='harmony'&&<select aria-label="Harmony plan" value={action.harmony} onChange={e=>setAction(at,{harmony:e.target.value as Action['harmony']})}><option value="random">Random plan</option>{Object.entries(HARMONY_PLANS).map(([id,plan])=><option key={id} value={id}>{plan.label}</option>)}</select>}
        {(RAMPED_ACTIONS as readonly string[]).includes(action.type)&&<span className={styles.value} title={`Bars to reach the new ${action.type==='bpm'?'tempo':'level'}, also on the way back; 0 jumps.`}><CompactNumberInput ariaLabel={`${ACTIONS[action.type]} ramp in bars`} min={0} max={16} value={action.rampBars??0} onChange={n=>{if(Number.isInteger(n))setAction(at,{rampBars:n})}}/><small>bar ramp</small></span>}
        <button type="button" className={styles.icon} aria-label={`Remove ${ACTIONS[action.type]}`} title="Remove influence" onClick={()=>onChange({actions:rule.actions.filter((_,i)=>i!==at)})}><X size={13}/></button>
      </li>
    })}</ul>
    <button type="button" className={styles.add} disabled={rule.actions.length>=12} onClick={()=>onChange({actions:[...rule.actions,{type:'gain',value:10,scale:'Maior',harmony:'static'}]})}><Plus size={13}/>Add influence</button>
  </div>
}
