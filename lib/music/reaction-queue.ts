import { reactionEntries, type RampState, type Reactions, type ReactionContext, type TimedReaction } from './reactions'
const signature=(entry:TimedReaction|undefined)=>JSON.stringify(entry&&{rule:entry.rule,hit:entry.hit&&{trigger:entry.hit.trigger,color:entry.hit.color}})
const ramp=(entry:TimedReaction|undefined)=>Math.max(0,...(entry?.rule.actions??[]).filter(a=>a.type==='bpm').map(a=>a.rampBars??0))
/** Bars of the slowest gain/filter glide in a rule (the tempo glides in the transport). */
const glide=(entry:TimedReaction|undefined)=>Math.max(0,...(entry?.rule.actions??[]).filter(a=>a.type==='gain'||a.type==='lpf'||a.type==='hpf').map(a=>a.rampBars??0))
type Glide={start:number;bars:number;from:number;fading:boolean;next?:TimedReaction}
export class ReactionQueue {
  entries=new Map<string,TimedReaction>()
  pending=new Map<string,{entry:TimedReaction;cycle:number}>()
  glides=new Map<string,Glide>()
  private scope=''
  private cycle=0
  /** instant: gain/filter glides land at once (phones), so the voices are not recompiled every bar. */
  constructor(private instant=false){}
  private glideBars(entry:TimedReaction|undefined){return this.instant?0:glide(entry)}
  update(config:Reactions,context:ReactionContext,running:boolean,cycle:number,scope:string) {
    const desired=reactionEntries(config,context);let bars=0
    this.cycle=cycle
    if(this.scope!==scope||!running){this.scope=scope;this.entries=desired;this.pending.clear();this.glides.clear();return 0}
    for(const [id,old] of this.entries)if(!desired.has(id)){bars=Math.max(bars,ramp(old));this.pending.delete(id);this.commit(id,{rule:old.rule,hit:undefined},true)}
    for(const [id,entry] of desired){
      const old=this.entries.get(id)
      if(signature(entry)===signature(this.glides.get(id)?.fading?this.glides.get(id)!.next:old)){this.pending.delete(id);continue}
      if(entry.rule.quantize){
        if(!old)this.entries.set(id,{rule:entry.rule,hit:undefined})
        this.pending.set(id,{entry,cycle:this.pending.get(id)?.cycle??Math.floor(cycle+1e-9)+1})
      }else{bars=Math.max(bars,ramp(old),ramp(entry));this.commit(id,entry);this.pending.delete(id)}
    }
    return bars
  }
  advance(cycle:number){
    let bars=0,changed=false
    this.cycle=cycle
    for(const [id,item] of this.pending)if(item.cycle<=cycle+1e-9){bars=Math.max(bars,ramp(this.entries.get(id)),ramp(item.entry));this.commit(id,item.entry);this.pending.delete(id);changed=true}
    // Gliding rules step once per bar until they arrive.
    for(const [id,state] of this.glides){
      changed=true
      if(cycle-state.start<state.bars-1e-9)continue
      this.glides.delete(id)
      if(state.fading){if(state.next?.rule)this.entries.set(id,state.next);else this.entries.delete(id)}
    }
    return {changed,bars}
  }
  rebase(cycle:number) {for(const item of this.pending.values())item.cycle=Math.floor(cycle+1e-9)+1}
  /** Progress of every gliding rule at the current bar. */
  rampStates():Map<string,RampState>{
    return new Map([...this.glides].map(([id,state])=>{
      const t=Math.max(0,Math.min(1,(this.cycle-state.start)/state.bars))
      return [id,{progress:state.fading?state.from*(1-t):state.from+(1-state.from)*t,fading:state.fading}]
    }))
  }
  private commit(id:string,entry:TimedReaction,removed=false){
    const old=this.entries.get(id),current=this.glides.get(id),progress=current?this.rampStates().get(id)!.progress:old?.hit?1:0
    if(current?.fading&&!entry.hit){current.next=removed?undefined:entry;return}
    if(old?.hit&&!entry.hit&&this.glideBars(old)>0){
      this.glides.set(id,{start:this.cycle,bars:this.glideBars(old),from:progress,fading:true,next:removed?undefined:entry})
      return
    }
    if(removed){this.entries.delete(id);this.glides.delete(id);return}
    this.entries.set(id,entry)
    if(entry.hit&&this.glideBars(entry)>0&&progress<1)this.glides.set(id,{start:this.cycle,bars:this.glideBars(entry),from:progress,fading:false})
    else this.glides.delete(id)
  }
}
