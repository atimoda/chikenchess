/** Audio-time transport. Strudel still compiles/queries patterns; React never schedules notes. */
export class TempoMap {
  private segments: { cycle: number; time: number; from: number; to: number; bars: number }[] = []
  private secondsPerBarAtOneBpm: number
  constructor(bpm=120, time=0, beatsPerBar=4) { this.secondsPerBarAtOneBpm=beatsPerBar*60; this.reset(bpm,time) }
  setBeatsPerBar(beatsPerBar:number,bpm:number,time:number) { this.secondsPerBarAtOneBpm=beatsPerBar*60; this.reset(bpm,time) }
  reset(bpm:number,time:number,cycle=0) { this.segments=[{cycle,time,from:bpm,to:bpm,bars:0}] }
  private segment(cycle:number) { return this.segments.findLast(s=>s.cycle<=cycle+1e-10) ?? this.segments[0] }
  bpmAt(cycle:number) { const s=this.segment(cycle); return s.bars ? s.from+(s.to-s.from)*Math.max(0,Math.min(1,(cycle-s.cycle)/s.bars)) : s.to }
  timeAt(cycle:number) {
    const s=this.segment(cycle), x=Math.max(0,cycle-s.cycle), ramp=Math.min(x,s.bars), slope=s.bars?(s.to-s.from)/s.bars:0
    const factor=this.secondsPerBarAtOneBpm
    const seconds=Math.abs(slope)>1e-9 ? factor/slope*Math.log((s.from+slope*ramp)/s.from) : factor*ramp/s.from
    return s.time+seconds+factor*(x-ramp)/s.to
  }
  cycleAt(time:number) {
    const s=this.segments.findLast(s=>s.time<=time) ?? this.segments[0]
    const dt=Math.max(0,time-s.time), slope=s.bars?(s.to-s.from)/s.bars:0
    const factor=this.secondsPerBarAtOneBpm
    const rampSeconds=Math.abs(slope)>1e-9?factor/slope*Math.log(s.to/s.from):factor*s.bars/s.from
    const x=dt<rampSeconds ? (Math.abs(slope)>1e-9?s.from*Math.expm1(dt*slope/factor)/slope:dt*s.from/factor) : s.bars+(dt-rampSeconds)*s.to/factor
    return s.cycle+x
  }
  change(cycle:number,bpm:number,bars=0) {
    const time=this.timeAt(cycle),from=this.bpmAt(cycle)
    this.segments=this.segments.filter(s=>s.cycle<cycle)
    this.segments.push({cycle,time,from,to:bpm,bars})
  }
  transition(cycle:number) { const s=this.segment(cycle);return {from:s.from,target:s.to,start:s.cycle,end:s.cycle+s.bars,progress:s.bars?Math.min(1,Math.max(0,(cycle-s.cycle)/s.bars)):1} }
}
type BarEntry={bar:number;haps:any[];onsets:{at:number;hap:any}[]}
// Bars kept per voice: the one being heard, the one being queued, the next one and a queued jump's landing.
const BARS_KEPT=4
export class MusicTransport {
  started=false
  lastEnd=0
  latency:number
  private interval:number
  private tempoMap=new TempoMap()
  // Audio may already be scheduled after a jump, while the listener still hears
  // the preceding section. Retain its clock until the exact landing deadline.
  private preceding: {until:number;map:TempoMap}[]=[]
  private queuedSeek?: {at:number;target:number;commit:()=>void}
  private landing?: {time:number;target:number}
  // One pattern per voice. Each is queried once per bar and ticks only cut their slice out of the result:
  // asking Strudel for every 1/16 slice cost 10 to 59 times more for the same attacks. A voice's pattern
  // object changes when its notes change, so only that voice is asked again.
  private voices:any[]=[]
  private bars=new Map<any,BarEntry[]>()
  private timer?:ReturnType<typeof setInterval>
  private target=120
  private beatsPerBar=4
  private boundary=-1
  private stoppedCycle=0
  constructor(private options:{ getTime:()=>number;latency:number;interval?:number;onBoundary:(cycle:number)=>void;onTrigger:(hap:any,deadline:number,duration:number,cps:number,time:number)=>void;onError:(error:unknown)=>void;onLate?:(seconds:number)=>void }) {this.latency=options.latency;this.interval=options.interval??50}
  get tempo() {const now=this.options.getTime();return this.preceding.find(entry=>now<entry.until)?.map??this.tempoMap}
  get cycle() {return this.started?this.tempo.cycleAt(this.options.getTime()):this.stoppedCycle}
  get schedulingCycle() {return this.started?this.tempoMap.cycleAt(this.options.getTime()):this.stoppedCycle}
  get pendingSeekTarget() {return this.queuedSeek?.target??(this.landing&&this.options.getTime()<this.landing.time?this.landing.target:undefined)}
  get queuedSeekCycle() {return this.queuedSeek?.at}
  get cps() {return this.tempo.bpmAt(this.cycle)/(60*this.beatsPerBar)}
  get lastBegin() {return this.cycle}
  get lastTick() {return this.options.getTime()-this.latency}
  setMeter(beatsPerBar:number) {if(this.beatsPerBar===beatsPerBar)return;this.stop();this.beatsPerBar=beatsPerBar;this.tempoMap.setBeatsPerBar(beatsPerBar,this.target,this.options.getTime())}
  setCps(cps:number,bars=0) {const factor=60*this.beatsPerBar,bpm=Math.max(30,Math.min(240,cps*factor));if(bpm===this.target)return;this.target=bpm;if(this.started)this.tempoMap.change(this.lastEnd,bpm,bars);else this.tempoMap.reset(bpm,this.options.getTime())}
  async setPattern(pattern:any) {this.setPatterns(pattern?[pattern]:[])}
  /** The voices to schedule from the next slice on. A pattern kept from the last call keeps its queried bars. */
  setPatterns(patterns:readonly any[]) {
    this.voices=[...patterns]
    const kept=new Set(this.voices)
    for(const pattern of this.bars.keys())if(!kept.has(pattern))this.bars.delete(pattern)
  }
  /** Every event of one voice in one bar, queried at most once while the bar is in use. Panels read it too. */
  barHaps(pattern:any,bar:number,cps=this.cps):any[] {return this.bar(pattern,bar,cps).haps}
  private bar(pattern:any,bar:number,cps:number) {
    let entries=this.bars.get(pattern)
    if(!entries){entries=[];if(this.voices.includes(pattern))this.bars.set(pattern,entries)}
    let entry=entries.find(item=>item.bar===bar)
    if(!entry){
      // No compiled voice reads the tempo from the query, so a bar queried during a ramp stays valid.
      const haps:any[]=pattern.queryArc(bar,bar+1,{_cps:cps})??[]
      const onsets=haps.filter(hap=>hap.hasOnset()).map(hap=>({at:Number(hap.whole.begin),hap})).filter(item=>item.at>=bar&&item.at<bar+1).sort((a,b)=>a.at-b.at)
      entry={bar,haps,onsets}
      entries.push(entry)
      if(entries.length>BARS_KEPT)entries.shift()
    }
    return entry
  }
  /** Queries a few voices of the coming bar per tick, so a bar line does not ask for every voice at once. */
  private prepare(cps:number) {
    const jump=this.queuedSeek, current=Math.floor(this.lastEnd+1e-9)
    const next=jump&&jump.at<=current+1+1e-9?Math.floor(jump.target+1e-9):current+1
    let budget=Math.max(1,Math.ceil(this.voices.length/6))
    for(const pattern of this.voices){
      if(this.bars.get(pattern)?.some(item=>item.bar===next))continue
      this.bar(pattern,next,cps)
      if(--budget<=0)break
    }
  }
  async start() {if(this.started)return;this.started=true;this.lastEnd=this.stoppedCycle;this.boundary=-1;this.tempoMap.reset(this.target,this.options.getTime()+.03,this.stoppedCycle);this.tick();this.timer=setInterval(()=>this.tick(),this.interval)}
  /** Look-ahead and tick period can change while playing (sound quality); attacks already queued stay. */
  setTiming(latency:number,interval:number) {
    this.latency=latency
    if(interval===this.interval)return
    this.interval=interval
    if(this.timer){clearInterval(this.timer);this.timer=setInterval(()=>this.tick(),interval)}
  }
  stop() {this.started=false;if(this.timer)clearInterval(this.timer);this.timer=undefined;this.lastEnd=0;this.stoppedCycle=0;this.queuedSeek=undefined;this.landing=undefined;this.preceding=[]}
  /** Replace the next destination, without cutting or rescheduling current audio. */
  queueSeek(at:number,target:number,commit:()=>void) {
    if(!this.started||!Number.isFinite(at)||!Number.isFinite(target)||target<0||at<this.lastEnd-1e-9)return false
    this.queuedSeek={at,target,commit}
    return true
  }
  cancelQueuedSeek() {this.queuedSeek=undefined}
  seek(cycle:number) {
    if(!Number.isFinite(cycle)||cycle<0)return
    const previous=this.cycle, bpm=this.started?this.tempo.bpmAt(previous):this.target
    const ramp=this.tempo.transition(previous), remaining=this.started?Math.max(0,ramp.end-previous):0
    this.queuedSeek=undefined;this.landing=undefined;this.preceding=[]
    this.stoppedCycle=cycle;this.lastEnd=cycle;this.boundary=-1
    this.tempoMap.reset(bpm,this.options.getTime()+.03,cycle)
    if(remaining)this.tempoMap.change(cycle,this.target,remaining)
    if(this.started)this.tick()
  }
  /** Public for deterministic scheduler tests with a fake AudioContext clock. */
  tick() {
    if(!this.started)return
    try {
      const now=this.options.getTime(), horizon=now+this.latency
      this.preceding=this.preceding.filter(entry=>now<entry.until)
      // The last tick queued everything up to its horizon. Time already past it means this tick came
      // later than the look-ahead and the attacks in between start late or are skipped.
      const behind=now-this.tempoMap.timeAt(this.lastEnd)
      if(behind>0)this.options.onLate?.(behind)
      // On a suspended/throttled tab, skip stale attacks instead of bursting a backlog.
      if(this.tempoMap.timeAt(this.lastEnd)<now-.1)this.lastEnd=Math.min(Math.ceil(this.tempoMap.cycleAt(now)),this.queuedSeek?.at??Infinity)
      for(let work=0;work<128&&this.tempoMap.timeAt(this.lastEnd)<horizon;work++){
        if(this.queuedSeek&&this.lastEnd>=this.queuedSeek.at-1e-9){
          const jump=this.queuedSeek,old=this.tempoMap,time=old.timeAt(jump.at),bpm=old.bpmAt(jump.at)
          const remaining=Math.max(0,old.transition(jump.at).end-jump.at)
          this.queuedSeek=undefined
          this.preceding.push({until:time,map:old})
          this.tempoMap=new TempoMap(bpm,time,this.beatsPerBar)
          this.tempoMap.reset(bpm,time,jump.target)
          if(remaining)this.tempoMap.change(jump.target,this.target,remaining)
          this.landing={time,target:jump.target}
          this.lastEnd=jump.target;this.boundary=-1
          jump.commit()
          if(this.tempoMap.timeAt(this.lastEnd)<now-.1)this.lastEnd=Math.ceil(this.tempoMap.cycleAt(now))
        }
        if(Math.abs(this.lastEnd-Math.round(this.lastEnd))<1e-9)this.lastEnd=Math.round(this.lastEnd)
        const begin=this.lastEnd, integer=Math.floor(begin+1e-9)
        if(integer!==this.boundary){this.boundary=integer;this.options.onBoundary(begin)}
        const end=Math.min(begin+1/16,integer+1,this.tempoMap.cycleAt(horizon),this.queuedSeek?.at??Infinity)
        if(end<=begin+1e-10)break
        const cps=this.tempoMap.bpmAt(begin)/(60*this.beatsPerBar)
        for(const pattern of this.voices){
          for(const {at,hap} of this.bar(pattern,integer,cps).onsets){
            if(at<begin)continue
            if(at>=end)break
            const time=this.tempoMap.timeAt(at)
            if(time<now-.01)continue
            const duration=this.tempoMap.timeAt(Number(hap.whole.end))-time
            this.options.onTrigger(hap,time-now,duration,this.tempoMap.bpmAt(at)/(60*this.beatsPerBar),time)
          }
        }
        this.lastEnd=end
      }
      if(this.voices.length)this.prepare(this.tempoMap.bpmAt(this.lastEnd)/(60*this.beatsPerBar))
    }catch(error){this.options.onError(error)}
  }
}
