'use client'
import { InfoTip, HelpLabel } from './info-tip'
import { CompactNumberInput } from './compact-number-input'
import { useRef, useState } from 'react'
import { Power, Settings } from 'lucide-react'
import { ACTIONS, EVENTS, STATES, TRIGGERS, SCALE_INTERVALS, SCALE_LABELS, type Trigger, type Reactions, type ReactionContext, type Reaction } from '@/lib/music/reactions'
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
      <button style={{paddingRight:editing?36:11}} aria-pressed={isActive(key)} onClick={()=>activate(key)}>{label} · {count} {count===1?'rule':'rules'}</button>
      {editing&&<button type="button" aria-label={`Go to ${label} editing`} title="Go to editing" onClick={()=>editorRef.current?.scrollIntoView({behavior:'smooth',block:'start'})} style={{position:'absolute',right:4,top:'50%',transform:'translateY(-50%)',width:24,height:24,minWidth:24,padding:0,borderRadius:'50%',color:'#fff'}}><Settings size={13}/></button>}
    </li>
  })}</ul>
  return <section aria-label="States and Events" style={{padding:12,border:'1px solid #35443a',background:'#19221d',borderRadius:8}}>
    <h2>States and Events<InfoTip label="Simulation">Click an item to turn it on and open its rules; click again to turn it off. One ongoing state and several temporary events can shape the music at the same time; picking another state replaces the previous one. Events stay active for their rules’ duration, and only the “Advance half-move” button moves the simulation clock forward. The settings are part of the current kit and are linked to the city when the stage kit is saved.</InfoTip></h2>
    <h3 style={{fontSize:12,marginTop:10}}>States</h3>
    {triggerList(STATES)}
    <h3 style={{fontSize:12}}>Events</h3>
    {triggerList(EVENTS)}
    {trigger&&<div ref={editorRef} style={{borderTop:'1px solid #405247',marginTop:12,paddingTop:12,scrollMarginTop:12}}>
      <h3 style={{display:'flex',alignItems:'center',gap:6,fontSize:15}}><span style={{flex:1}}>{isState?'State':'Event'}: {TRIGGERS[trigger]}</span><button type="button" aria-label={`${isActive(trigger)?'Deactivate':'Activate'} ${TRIGGERS[trigger]}`} title={isActive(trigger)?'Deactivate':'Activate'} aria-pressed={isActive(trigger)} onClick={()=>activate(trigger)} style={{width:30,height:30,minWidth:30,padding:0,borderRadius:'50%'}}><Power size={15}/></button><InfoTip label="Duration and priorities">{isState?'Influences return to the base when the state ends.':'Each new activation renews the event without stacking the same rule. The duration counts half-moves.'} Rules follow the saved order; percentages multiply, and the last scale, variation or filter wins.</InfoTip></h3>
      <label><span style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>Side of the state/event<InfoTip label="Trigger side">In check, this is the attacking side. For lost pieces or minimum setup, it is the affected side.</InfoTip></span><select value={color} onChange={e=>changeColor(e.target.value as 'w'|'b')}><option value="w">White</option><option value="b">Black</option></select></label>
      <output aria-live="polite">{bpm.toFixed(1)} BPM · {scale.join(' ')} · half-move {context.ply}</output>
      <ul>{descriptions.length?descriptions.map((description,index)=><li key={index}>{description}</li>):<li>No configured influence is running.</li>}</ul>
      <div style={{display:'flex',gap:4,flexWrap:'wrap',margin:'8px 0'}}>
        <button onClick={()=>onContext({...context,ply:context.ply+1})}>Advance half-move</button><InfoTip label="Advance half-move">Advances the States/Events simulation counter by one single move. It doesn’t move pieces, doesn’t switch the board’s turn and doesn’t advance a bar of music. Use it to test when temporary effects expire: an event with duration 2 ends after two advances. Duration 0 never expires by the counter; ongoing states stay until turned off/replaced. In a real match, each move by either side advances this counter automatically.</InfoTip>
        <button disabled={config.rules.length>=80} onClick={()=>onChange({...config,rules:[...config.rules,{id:`rule-${Date.now()}-${config.rules.length}`,trigger,enabled:true,quantize:false,target:'both',duration:4,actions:[]}]})}>Add rule</button>
      </div>
      {(trigger==='minimumOne'||trigger==='minimumBoth')&&<label><HelpLabel label="Minimum setup · pieces left per side (king included)">This threshold only belongs to the minimum setup events. They fire when a side has at most this many pieces left on the board; the king counts.</HelpLabel><CompactNumberInput ariaLabel="Minimum setup pieces" min={2} max={15} value={config.minimumPieces} onChange={n=>{if(Number.isInteger(n))onChange({...config,minimumPieces:n})}}/></label>}
      {config.rules.filter(rule=>rule.trigger===trigger).map(rule=><fieldset key={rule.id} style={{border:'1px solid #45534a',padding:8,margin:'8px 0'}}>
        <legend>{TRIGGERS[rule.trigger]}</legend>
        <label><input type="checkbox" checked={rule.enabled} onChange={e=>patch(rule.id,{enabled:e.target.checked})}/>Rule enabled</label>
        <label><input type="checkbox" checked={rule.quantize} onChange={e=>patch(rule.id,{quantize:e.target.checked})}/>Apply on the next bar line<InfoTip label="Bar line">Covers entry, changes and return. Unchecked: the next available attacks. Paused: applies now.</InfoTip></label>
        <label><HelpLabel label="Target of per-piece actions">Picks the affected voices. BPM, scale and harmonic plan stay global; the other parameters follow the side.</HelpLabel><select value={rule.target} onChange={e=>patch(rule.id,{target:e.target.value as Reaction['target']})}><option value="both">Both</option><option value="actor">Trigger side</option><option value="opponent">Trigger’s opponent</option><option value="w">White</option><option value="b">Black</option></select></label>
        {!isState&&<label><HelpLabel label="Duration (half-moves; 0 = forever)">How many single moves the effect lasts. Each move by one side counts as a half-move. Zero keeps the event until the end of the match or until the simulation is turned off.</HelpLabel><CompactNumberInput ariaLabel="Duration in half-moves" min={0} max={32} value={rule.duration} onChange={n=>{if(Number.isInteger(n))patch(rule.id,{duration:n})}}/></label>}
        {rule.actions.map((action,index)=>{
          const change=(next:Partial<typeof action>)=>patch(rule.id,{actions:rule.actions.map((value,actionIndex)=>actionIndex===index?{...value,...next}:value)})
          const ranges:Record<string,[number,number]>={transpose:[-12,12],bpm:[-30,30],mode:[0,11],variation:[0,7],gain:[-100,100],lpf:[20,20000]}
          return <div key={index} style={{borderTop:'1px solid #35443a',paddingTop:8,marginTop:8}}>
            <label><span style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>Influence<InfoTip label="Musical transformations">Relative keeps the notes while switching between major and natural minor. Modal rotation moves the root within the same notes. Harmonic plan moves bass, harmony and melodies together on each section. Inversion mirrors the melody’s degrees.</InfoTip></span><select value={action.type} onChange={e=>change({type:e.target.value as typeof action.type,value:e.target.value==='lpf'?4000:0})}>{Object.entries(ACTIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
            {ranges[action.type]&&<label><HelpLabel label="Value">Strength of the influence in the given unit: semitones, percent, degrees, variation index or hertz.</HelpLabel><CompactNumberInput ariaLabel="Value" min={ranges[action.type][0]} max={ranges[action.type][1]} value={action.value} onChange={n=>{if(!['transpose','mode','variation'].includes(action.type)||Number.isInteger(n))change({value:n})}}/></label>}
            {action.type==='bpm'&&<label><HelpLabel label="BPM ramp (bars; 0 = jump)">Length of the tempo transition. Zero switches at once; 1 to 16 makes a gradual change, including on the way back.</HelpLabel><CompactNumberInput ariaLabel="BPM ramp in bars" min={0} max={16} value={action.rampBars??0} onChange={n=>{if(Number.isInteger(n))change({rampBars:n})}}/></label>}
            {action.type==='scale'&&<label><HelpLabel label="Target scale">Scale applied while this influence runs, using the root resulting from the previous rules.</HelpLabel><select value={action.scale} onChange={e=>change({scale:e.target.value as typeof action.scale})}>{(Object.keys(SCALE_INTERVALS) as (keyof typeof SCALE_INTERVALS)[]).map(name=><option key={name} value={name}>{SCALE_LABELS[name]}</option>)}</select></label>}
            {action.type==='harmony'&&<label><HelpLabel label="Harmonic plan">Sequence of centers in scale degrees, aligned with variations A–D. Pulse voices and unpitched samples don’t change.</HelpLabel><select value={action.harmony} onChange={e=>change({harmony:e.target.value as typeof action.harmony})}>{Object.entries(HARMONY_PLANS).map(([id,plan])=><option key={id} value={id}>{plan.label}</option>)}</select></label>}
            <button onClick={()=>patch(rule.id,{actions:rule.actions.filter((_,actionIndex)=>actionIndex!==index)})}>Remove influence</button>
          </div>
        })}
        <button disabled={rule.actions.length>=12} onClick={()=>patch(rule.id,{actions:[...rule.actions,{type:'gain',value:10,scale:'Maior',harmony:'static'}]})}>Add influence</button>{' '}
        <button onClick={()=>onChange({...config,rules:config.rules.filter(item=>item.id!==rule.id)})}>Remove rule</button>
      </fieldset>)}
    </div>}
  </section>
}
