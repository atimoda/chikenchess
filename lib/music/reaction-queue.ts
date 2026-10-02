import { reactionEntries, type Reactions, type ReactionContext, type TimedReaction } from './reactions'
const signature=(entry:TimedReaction|undefined)=>JSON.stringify(entry&&{rule:entry.rule,hit:entry.hit&&{trigger:entry.hit.trigger,color:entry.hit.color}})
const ramp=(entry:TimedReaction|undefined)=>Math.max(0,...(entry?.rule.actions??[]).filter(a=>a.type==='bpm').map(a=>a.rampBars??0))
export class ReactionQueue {
  entries=new Map<string,TimedReaction>()
  pending=new Map<string,{entry:TimedReaction;cycle:number}>()
  private scope=''
  update(config:Reactions,context:ReactionContext,running:boolean,cycle:number,scope:string) {
    const desired=reactionEntries(config,context);let bars=0
    if(this.scope!==scope||!running){this.scope=scope;this.entries=desired;this.pending.clear();return 0}
    for(const [id,old] of this.entries)if(!desired.has(id)){bars=Math.max(bars,ramp(old));this.entries.delete(id);this.pending.delete(id)}
    for(const [id,entry] of desired){
      const old=this.entries.get(id)
      if(signature(entry)===signature(old)){this.pending.delete(id);continue}
      if(entry.rule.quantize){
        if(!old)this.entries.set(id,{rule:entry.rule,hit:undefined})
        this.pending.set(id,{entry,cycle:this.pending.get(id)?.cycle??Math.floor(cycle+1e-9)+1})
      }else{bars=Math.max(bars,ramp(old),ramp(entry));this.entries.set(id,entry);this.pending.delete(id)}
    }
    return bars
  }
  advance(cycle:number){let bars=0,changed=false;for(const [id,item] of this.pending)if(item.cycle<=cycle+1e-9){bars=Math.max(bars,ramp(this.entries.get(id)),ramp(item.entry));this.entries.set(id,item.entry);this.pending.delete(id);changed=true}return {changed,bars}}
  rebase(cycle:number) {for(const item of this.pending.values())item.cycle=Math.floor(cycle+1e-9)+1}
}
