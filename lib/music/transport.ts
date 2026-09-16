/** Audio-time transport. Strudel still compiles/queries patterns; React never schedules notes. */
export class TempoMap {
  private segments: { cycle: number; time: number; from: number; to: number; bars: number }[] = []
  constructor(bpm=120, time=0) { this.reset(bpm,time) }
  reset(bpm:number,time:number) { this.segments=[{cycle:0,time,from:bpm,to:bpm,bars:0}] }
  private segment(cycle:number) { return this.segments.findLast(s=>s.cycle<=cycle+1e-10) ?? this.segments[0] }
  bpmAt(cycle:number) { const s=this.segment(cycle); return s.bars ? s.from+(s.to-s.from)*Math.max(0,Math.min(1,(cycle-s.cycle)/s.bars)) : s.to }
  timeAt(cycle:number) {
    const s=this.segment(cycle), x=Math.max(0,cycle-s.cycle), ramp=Math.min(x,s.bars), slope=s.bars?(s.to-s.from)/s.bars:0
    const seconds=Math.abs(slope)>1e-9 ? 240/slope*Math.log((s.from+slope*ramp)/s.from) : 240*ramp/s.from
    return s.time+seconds+240*(x-ramp)/s.to
  }
  cycleAt(time:number) {
    const s=this.segments.findLast(s=>s.time<=time) ?? this.segments[0]
    const dt=Math.max(0,time-s.time), slope=s.bars?(s.to-s.from)/s.bars:0
    const rampSeconds=Math.abs(slope)>1e-9?240/slope*Math.log(s.to/s.from):240*s.bars/s.from
    const x=dt<rampSeconds ? (Math.abs(slope)>1e-9?s.from*Math.expm1(dt*slope/240)/slope:dt*s.from/240) : s.bars+(dt-rampSeconds)*s.to/240
    return s.cycle+x
  }
  change(cycle:number,bpm:number,bars=0) {
    const time=this.timeAt(cycle),from=this.bpmAt(cycle)
    this.segments=this.segments.filter(s=>s.cycle<cycle)
    this.segments.push({cycle,time,from,to:bpm,bars})
  }
  transition(cycle:number) { const s=this.segment(cycle);return {from:s.from,target:s.to,start:s.cycle,end:s.cycle+s.bars,progress:s.bars?Math.min(1,Math.max(0,(cycle-s.cycle)/s.bars)):1} }
}
export class MusicTransport {
  started=false
  lastEnd=0
  readonly latency:number
  readonly tempo=new TempoMap()
  private pattern:any
  private timer?:ReturnType<typeof setInterval>
  private target=120
  private boundary=-1
  constructor(private options:{ getTime:()=>number;latency:number;onBoundary:(cycle:number)=>void;onTrigger:(hap:any,deadline:number,duration:number,cps:number,time:number)=>void;onError:(error:unknown)=>void }) {this.latency=options.latency}
  get cycle() {return this.started?this.tempo.cycleAt(this.options.getTime()):0}
  get cps() {return this.tempo.bpmAt(this.cycle)/240}
  get lastBegin() {return this.cycle}
  get lastTick() {return this.options.getTime()-this.latency}
  setCps(cps:number,bars=0) {const bpm=Math.max(30,Math.min(240,cps*240));if(bpm===this.target)return;this.target=bpm;if(this.started)this.tempo.change(this.lastEnd,bpm,bars);else this.tempo.reset(bpm,this.options.getTime())}
  async setPattern(pattern:any) {this.pattern=pattern}
  async start() {if(this.started)return;this.started=true;this.lastEnd=0;this.boundary=-1;this.tempo.reset(this.target,this.options.getTime()+.03);this.tick();this.timer=setInterval(()=>this.tick(),50)}
  stop() {this.started=false;if(this.timer)clearInterval(this.timer);this.timer=undefined;this.lastEnd=0}
  /** Public for deterministic scheduler tests with a fake AudioContext clock. */
  tick() {
    if(!this.started)return
    try {
      const now=this.options.getTime(), horizon=now+this.latency
      // On a suspended/throttled tab, skip stale attacks instead of bursting a backlog.
      if(this.tempo.timeAt(this.lastEnd)<now-.1)this.lastEnd=Math.ceil(this.tempo.cycleAt(now))
      for(let work=0;work<128&&this.tempo.timeAt(this.lastEnd)<horizon;work++){
        if(Math.abs(this.lastEnd-Math.round(this.lastEnd))<1e-9)this.lastEnd=Math.round(this.lastEnd)
        const begin=this.lastEnd, integer=Math.floor(begin+1e-9)
        if(integer!==this.boundary){this.boundary=integer;this.options.onBoundary(begin)}
        const end=Math.min(begin+1/16,integer+1,this.tempo.cycleAt(horizon))
        if(end<=begin+1e-10)break
        const cps=this.tempo.bpmAt(begin)/240
        const haps=this.pattern?.queryArc(begin,end,{_cps:cps})??[]
        for(const hap of haps){
          if(!hap.hasOnset())continue
          const onset=Number(hap.whole.begin),time=this.tempo.timeAt(onset)
          if(time<now-.01)continue
          const duration=this.tempo.timeAt(Number(hap.whole.end))-time
          this.options.onTrigger(hap,time-now,duration,this.tempo.bpmAt(onset)/240,time)
        }
        this.lastEnd=end
      }
    }catch(error){this.options.onError(error)}
  }
}
