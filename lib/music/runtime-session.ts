// Own the audio session: scheduler, mixer, gestures, cancellation and monitor lifecycle.
import type { Square } from 'chess.js'
import { ManualReverbCache } from './manual-reverb-cache'
import { instrumentFor } from './model'
import { MusicTransport } from './transport'
import { beatsPerBar } from './meter'
import { ReactionQueue } from './reaction-queue'
import { applyReactions } from './reactions'
import { isConstrainedDevice } from '../performance'
import { TeamMixer, createTeamMixes } from './team-mixer'
import { sampleRegistration, type SampleSource } from './sample-banks'
import { createMusicMonitor, type TrackFrame, type NoteEvent, type MusicMonitor } from './monitor'
import { voiceSpecs } from './voice-spec'
import { compileVoice } from './pattern-compiler'
import { loadLibrary, ensureSample, loadedSamples } from './strudel-loader'
import type { Strudel, StrudelPattern, MusicSnapshot, MusicPulse, Preview, VoiceSpec } from './runtime-types'

/** One owned scheduler, with shared loop effect buses and isolated temporary auditions. */
export class MusicRuntime {
  private api?: Strudel
  private preloadedApi?: Strudel
  private scheduler: any
  private scheduledLoops: unknown[] | undefined
  private targetBpm = 120
  private sourceState?: MusicSnapshot
  private reactionQueue = new ReactionQueue()
  private rampBars = 0
  private state?: MusicSnapshot
  private preview: Preview | null = null
  private unlockAudition: Preview | null = null
  private voices = new Map<string, VoiceSpec>()
  private ready?: Promise<void>
  private disposed = false
  private pageVisible = true
  private generation = 0
  private visualTimers = new Set<ReturnType<typeof setTimeout>>()
  private starting = false
  private analyser?: AnalyserNode
  private teamMixer?: TeamMixer
  private manualReverbs = new ManualReverbCache()
  private preparedManualOrbits = new WeakSet<object>()
  private connectedOrbits = new Set<number>()
  private visualInterval = 1 / 15
  private effectBuses: 2 | 4 = 4
  private visualBuckets = new Map<number, { events: Map<string, MusicPulse>; timer: ReturnType<typeof setTimeout> }>()
  private visualCursor = 0
  private compiled = new Map<string, { signature: string; pattern: StrudelPattern }>()
  private compiledBySpec = new WeakMap<VoiceSpec, StrudelPattern>()
  private loading = new Set<string>()
  private sampleErrors = new Set<string>()
  private monitorTimer?: ReturnType<typeof setInterval>
  private displayCache = new Map<string, { pattern: StrudelPattern; cycle: number; events: NoteEvent[]; haps: any[] }>()
  private sectionCache?: { source: string; pattern: StrudelPattern }
  private maskCache = new Map<string, StrudelPattern>()
  private manualHit?: { voice: VoiceSpec; value: any; start: number; end: number }
  private releaseTimer?: ReturnType<typeof setTimeout>
  constructor(private pulse: (event: MusicPulse) => void, private error: (error: unknown) => void, readonly monitor: MusicMonitor = createMusicMonitor(), private onResolved?: (state: MusicSnapshot) => void) {}

  // Preload JS only. AudioContext is created/resumed from an interaction.
  preload() { void loadLibrary().then(api => { if (!this.disposed) this.preloadedApi = api }).catch(this.error) }

  async prepareSamples(sources: SampleSource[]) {
    const api = await loadLibrary()
    if (this.disposed) return
    this.preloadedApi = api
    const unique = new Map(sources.map(source => [sampleRegistration(source).sound, source]))
    await Promise.all([...unique.values()].map(source => ensureSample(api, source)))
    // Prepare assets only. Build the live graph from unlock(), inside a gesture.
  }

  async unlock() {
    if (this.disposed || !this.pageVisible) return
    // initAudio can be waiting for resume after a prior, non-gesture Play update.
    // Resume now, within this pointer/key event, before waiting for that init.
    const context = (this.api ?? this.preloadedApi)?.getAudioContext()
    const resume = context?.state === 'suspended' ? context.resume() : Promise.resolve()
    if (!this.ready) this.ready = this.initialize().catch(error => { this.ready = undefined; throw error })
    try {
      await Promise.all([this.ready, resume])
      if (this.disposed || !this.pageVisible) return
      const liveContext = this.api!.getAudioContext()
      if (liveContext.state !== 'running') await liveContext.resume()
      this.refresh()
    } catch (error) { this.error(error) }
  }

  setPageVisible(visible: boolean) {
    if (this.pageVisible === visible || this.disposed) return
    this.pageVisible = visible
    if (!visible) {
      this.unlockAudition = null
      this.endAudition()
      this.scheduler?.stop()
      this.clearVisuals()
      if (this.api) {
        const ready = this.ready
        void (async () => {
          if (ready) await ready
          if (this.disposed || this.pageVisible || !this.api) return
          await this.api.getAudioContext().suspend()
          if (this.pageVisible) void this.unlock()
        })().catch(this.error)
      }
    } else if (this.api || this.state?.playing) {
      void this.unlock()
    }
  }

  private async initialize() {
    const s = await loadLibrary()
    if (this.disposed) return
    this.api = s
    const constrained = isConstrainedDevice()
    this.visualInterval = 1 / (constrained ? 8 : 15)
    this.effectBuses = constrained ? 2 : 4
    // Worklet registration can outlast a drag. The audio context and manual
    // notes do not depend on that registration, so finish it in the background.
    void s.initAudio({ maxPolyphony: constrained ? 32 : 64 }).catch(this.error)
    if (this.disposed) return
    const context: AudioContext = s.getAudioContext()
    this.analyser = context.createAnalyser()
    this.analyser.fftSize = 256
    this.teamMixer = new TeamMixer(context, this.analyser)
    this.scheduler = new MusicTransport({
      onBoundary: (cycle: number) => {
        const transition = this.reactionQueue.advance(cycle)
        if (transition.changed) { this.rampBars = transition.bars; this.resolveState(); this.refresh() }
      },
      // More scheduling headroom on touch devices; manual notes keep their
      // independent 30 ms response and the monitor follows this latency.
      latency: constrained ? .18 : .1,
      getTime: () => context.currentTime,
      onError: this.error,
      onTrigger: (hap: any, deadline: number, duration: number, cps: number, time: number) => {
        const voice = this.voices.get(hap.value.ccVoice)
        if (!voice || voice.manual) return
        void s.webaudioOutput(hap, deadline, duration, cps, time).catch(this.error)
        this.scheduleVisual(voice, time, duration)
      },
    })
    this.monitorTimer = setInterval(() => { if (this.scheduler?.started && this.monitor.hasSubscribers()) this.publishFrame() }, constrained ? 150 : 100)
  }

  update(state: MusicSnapshot) {
    this.sourceState = state
    const input=state.reactionInput
    this.targetBpm=input?.lockedBpm ?? (input?applyReactions(state,input.config,input.context).snapshot.bpm:state.bpm)
    this.rampBars=input ? this.reactionQueue.update(input.config,input.context,!!this.scheduler?.started&&state.playing,this.scheduler?.lastEnd??0,input.scope) : 0
    this.resolveState()
    this.refresh()
  }
  private resolveState() {
    if(!this.sourceState)return
    const input=this.sourceState.reactionInput
    const resolved=input?applyReactions(this.sourceState,input.config,input.context,this.reactionQueue.entries):undefined
    this.state=resolved?{...resolved.snapshot,reactionDescriptions:resolved.descriptions}:this.sourceState
    if(input?.lockedBpm!==undefined){this.state={...this.state,bpm:input.lockedBpm};this.rampBars=0}
    this.onResolved?.(this.state)
  }
  private transportFrame() {
    const cycle=this.scheduler?.cycle??0
    return { bpm:this.scheduler?.started ? this.scheduler?.tempo?.bpmAt(cycle)??this.state?.bpm??120 : this.state?.bpm??120,
      targetBpm:this.targetBpm, meter:this.state?.meter??'4/4', scale:this.state?.scale??[], harmony:this.state?.harmony??'static',
      ramp:this.scheduler?.started?this.scheduler?.tempo?.transition(cycle):undefined,
      pending:[...this.reactionQueue.pending].map(([id,p])=>({id,cycle:p.cycle,trigger:p.entry.rule.trigger})) }
  }

  audition(id: string, square: Square, mode: Preview['mode'] = 'manual') {
    if (this.releaseTimer) this.endAudition()
    if (this.preview?.id === id && this.preview.square === square && this.preview.mode === mode) return
    const crossing = mode === 'manual' && this.preview?.mode === 'manual' && this.preview.id === id && !!this.api && !!this.scheduler
    const requested = { id, square, mode }
    // Keep the dedicated manual orbit connected while crossing squares. Rebuilding
    // its reverb/output graph for every cell caused a hitch and could drop attacks.
    if (this.preview?.mode === 'manual' && !crossing) this.stopManualHit()
    this.preview = requested
    // Only entry/exit changes the accompaniment. Crossing a square changes one voice.
    if (!crossing) this.refresh()
    // A short immediate note gives tactile feedback even before the next onset.
    // Keep only the latest square while unlocking/loading audio. Manual gestures
    // cancelled before readiness must never produce a delayed note.
      this.unlockAudition = requested
      const ready = this.scheduler && this.api?.getAudioContext().state === 'running' ? Promise.resolve() : this.unlock()
      void ready.then(async () => {
        const source = this.state?.instruments?.[id]?.source
        if (source?.kind === 'sample' && this.api && !loadedSamples.has(sampleRegistration(source).sound)) await ensureSample(this.api, source)
        if (this.disposed) return
        const currentMatches = this.preview === requested
        const pendingMatches = this.unlockAudition === requested
        if (!currentMatches && !pendingMatches) return
        if (pendingMatches) this.unlockAudition = null
        this.triggerPreview(requested)
      }).catch(this.error)
  }

  endAudition() {
    if (this.releaseTimer) clearTimeout(this.releaseTimer)
    this.releaseTimer = undefined
    if (this.preview?.mode === 'manual') this.unlockAudition = null
    this.stopManualHit()
    this.preview = null
    this.refresh()
  }

  releaseAudition() {
    if (this.preview?.mode !== 'manual' || this.releaseTimer) return
    // A tap can end before first-use compilation has submitted its attack.
    // Keep only the last manual note alive briefly; a new gesture or an
    // explicit cancel ends it immediately.
    this.releaseTimer = setTimeout(() => this.endAudition(), 500)
  }

  private stopManualHit() {
    if (this.manualHit) this.removeOrbit(this.manualHit.voice.orbit)
    this.manualHit = undefined
  }

  private triggerPreview(requested: Preview) {
    if (!this.api || !this.state || this.disposed || !this.pageVisible) return
    // Build from the requested square as the pointer may already be up by the
    // time the browser grants audio access on the first interaction.
    const voice = voiceSpecs({ ...this.state, pieces: this.state.pieces.filter(p => p.id === requested.id) }, requested, this.effectBuses)[0]
    if (!voice) return
    const pattern = this.patternFor(voice)
    // A groove lane may be resting for an entire section. The tactile note
    // still introduces its instrument, even when that lane has no onset yet.
    const hap = pattern.queryArc(0, 4).find((h: any) => h.hasOnset())
      ?? compileVoice(this.api, { ...voice, groove: undefined, mask: undefined }).queryArc(0, 4).find((h: any) => h.hasOnset())
    if (!hap) return
    const time = this.api.getAudioContext().currentTime + 0.03
    const duration = voice.manual ? Math.max(.16, voice.instrument.attack + .2) : .12
    if (voice.manual) {
      this.manualHit = { voice, value: hap.value, start: time, end: time + duration }
      // A previous manual note's orbit was detached when entering this square.
      // Reattach the new note to the current mix before submitting its attack.
      this.voices.set(voice.key, voice)
      this.connectVoice(voice)
      this.publishFrame()
    }
    void this.api.webaudioOutput(hap, 0, duration, this.state.bpm / (60 * beatsPerBar(this.state.meter)), time).catch(this.error)
    this.scheduleVisual(voice, time, duration)
  }

  private patternFor(voice: VoiceSpec) {
    const sameSpec = this.compiledBySpec.get(voice)
    if (sameSpec) return sameSpec
    const signature = JSON.stringify(voice)
    const cached = this.compiled.get(voice.key)
    if (cached?.signature === signature) { this.compiledBySpec.set(voice, cached.pattern); return cached.pattern }
    const pattern = compileVoice(this.api!, voice)
    this.compiled.set(voice.key, { signature, pattern })
    this.compiledBySpec.set(voice, pattern)
    return pattern
  }

  private sampleReady(voice: VoiceSpec) {
    const source = voice.instrument.source
    if (source?.kind !== 'sample') return true
    const key = sampleRegistration(source).sound
    if (loadedSamples.has(key)) return true
    if (!this.loading.has(key) && !this.sampleErrors.has(key)) {
      this.loading.add(key)
      void ensureSample(this.api!, source).then(() => {
        this.loading.delete(key)
        if (!this.disposed) this.refresh()
      }).catch(error => {
        this.loading.delete(key); this.sampleErrors.add(key)
        this.error(new Error(`Falha ao carregar ${source.asset}: ${String(error)}`))
      })
    }
    return false
  }

  private publishFrame() {
    if (!this.api || !this.scheduler || !this.state || this.disposed) return
    try {
      // Cyclist's lastBegin/lastTick describe the queued interval; subtract its
      // output latency so the display follows audible time, including BPM edits.
      const cycle = this.scheduler.started ? Math.max(0, this.scheduler.lastBegin + (this.api.getAudioContext().currentTime - this.scheduler.lastTick - this.scheduler.latency) * this.scheduler.cps) : 0
      const cycleIndex = Math.floor(cycle)
      const sectionSource = this.state.sectionPattern ?? '0'
      if (this.sectionCache?.source !== sectionSource) this.sectionCache = { source: sectionSource, pattern: this.api.mini(sectionSource) }
      const section = Number(this.sectionCache.pattern.queryArc(cycle, cycle + .00001)[0]?.value ?? 0)
      const tracks: Record<string, TrackFrame> = {}
      for (const piece of this.state.pieces) {
        const voice = this.voices.get(`${piece.id}:preview`) ?? this.voices.get(`${piece.id}:loop`)
        const instrument = this.state.instruments?.[piece.id] ?? instrumentFor(piece)
        const source = instrument.source
        const sampleKey = source?.kind === 'sample' ? sampleRegistration(source).sound : ''
        const empty = { notes: [], events: [], values: {} }
        if (this.preview?.id !== piece.id) {
          if (this.state.soloId && this.state.soloId !== piece.id) { tracks[piece.id] = { ...empty, status: 'solo-muted' }; continue }
          if (!piece.active) { tracks[piece.id] = { ...empty, status: 'inactive' }; continue }
          if (!this.state.playing) { tracks[piece.id] = { ...empty, status: 'paused' }; continue }
        }
        if (this.sampleErrors.has(sampleKey)) { tracks[piece.id] = { ...empty, status: 'error' }; continue }
        if (this.loading.has(sampleKey)) { tracks[piece.id] = { ...empty, status: 'loading' }; continue }
        if (!voice) { tracks[piece.id] = { ...empty, status: 'rest' }; continue }
        if (voice.manual) {
          const hit = this.manualHit
          const now = this.api.getAudioContext().currentTime
          const sounding = hit?.voice.key === voice.key && now >= hit.start && now < hit.end
          const note = voice.unpitched ? null : Number(hit?.value.note)
          const start = hit ? cycle + (hit.start - now) * this.scheduler.cps : 0
          const end = hit ? cycle + (hit.end - now) * this.scheduler.cps : 0
          tracks[piece.id] = { ...empty, status: sounding ? 'note' : 'rest', notes: sounding ? [note] : [],
            events: hit && end > cycleIndex && start < cycleIndex + 1 ? [{ start: Math.max(cycleIndex, start), end: Math.min(cycleIndex + 1, end), note, gain: Number(hit.value.gain) }] : [] }
          continue
        }
        const pattern = this.patternFor(voice)
        let cached = this.displayCache.get(voice.key)
        if (!cached || cached.pattern !== pattern || cached.cycle !== cycleIndex) {
          const haps = pattern.queryArc(cycleIndex, cycleIndex + 1, { _cps: this.state.bpm / (60 * beatsPerBar(this.state.meter)) })
          const events: NoteEvent[] = haps.slice(0, 128).map((hap: any) => ({
            start: Math.max(cycleIndex, Number(hap.whole?.begin ?? hap.part.begin)),
            end: Math.min(cycleIndex + 1, Number(hap.whole?.end ?? hap.part.end)),
            note: voice.unpitched ? null : Number(hap.value.note),
            gain: Number(hap.value.gain ?? 1) * Number(hap.value.velocity ?? 1),
          }))
          cached = { pattern, cycle: cycleIndex, events, haps }
          this.displayCache.set(voice.key, cached)
        }
        if (!cached) continue
        const sounding = cached.haps.filter((hap: any) => Number(hap.whole?.begin ?? hap.part.begin) <= cycle && Number(hap.whole?.end ?? hap.part.end) > cycle && Number(hap.value.gain ?? 1) * Number(hap.value.velocity ?? 1) > 0)
        if (voice.mask && !this.maskCache.has(voice.mask)) this.maskCache.set(voice.mask, this.api.mini(voice.mask))
        const masked = voice.mask && !this.maskCache.get(voice.mask)!.queryArc(cycle, cycle + .00001).some((hap: any) => hap.value && hap.value !== '~')
        const last = sounding[0]?.value
        tracks[piece.id] = {
          status: masked ? 'masked' : sounding.length ? 'note' : 'rest',
          notes: sounding.map((hap: any) => voice.unpitched ? null : Number(hap.value.note)), events: cached.events,
          values: last ? { gain: Number(last.gain) * Number(last.velocity ?? 1), lpf: Number(last.cutoff ?? last.lpf), pan: Number(last.pan), room: Number(last.room), delay: Number(last.delay) } : {},
        }
      }
      this.monitor.publish({ running: this.scheduler.started, cycle, beat: Math.floor((cycle % 1) * beatsPerBar(this.state.meter)) + 1, section, tracks, transport: this.transportFrame() })
    } catch (error) { this.error(error) }
  }

  private scheduleVisual(voice: VoiceSpec, time: number, duration: number) {
    const generation = this.generation
    const event = { id: voice.piece.id, square: voice.square, preview: voice.preview, duration }
    // Manual playing stays immediate. Loop events that fall in the same short
    // window share one render; the chosen piece rotates so dense drums cannot
    // permanently hide the visual feedback of bass, harmony or lead voices.
    if (!voice.preview) {
      const bucketId = Math.floor(time / this.visualInterval)
      const pending = this.visualBuckets.get(bucketId)
      if (pending) {
        pending.events.set(voice.key, event)
        return
      }
      const events = new Map([[voice.key, event]])
      const timer = setTimeout(() => {
        this.visualTimers.delete(timer)
        this.visualBuckets.delete(bucketId)
        if (this.disposed || generation !== this.generation) return
        const candidates = [...events.entries()].filter(([key]) => this.voices.has(key)).map(([, value]) => value)
        if (!candidates.length) return
        this.pulse(candidates[this.visualCursor++ % candidates.length])
      }, Math.max(0, (time - this.api!.getAudioContext().currentTime) * 1000))
      this.visualBuckets.set(bucketId, { events, timer })
      this.visualTimers.add(timer)
      return
    }
    const timer = setTimeout(() => {
      this.visualTimers.delete(timer)
      const current = this.voices.get(voice.key)
      if (this.disposed || generation !== this.generation || !current || current.manual !== voice.manual || current.square !== voice.square) return
      this.pulse(event)
    }, Math.max(0, (time - this.api!.getAudioContext().currentTime) * 1000))
    this.visualTimers.add(timer)
  }

  private removeOrbit(orbit: number) {
    const controller = this.api?.getSuperdoughAudioController()
    // Manual previews own an orbit. Loop buses are removed only after their last
    // voice leaves, so one capture never disconnects a surviving peer.
    controller?.nodes[orbit]?.disconnect()
    if (controller) delete controller.nodes[orbit]
    this.connectedOrbits.delete(orbit)
  }

  private connectVoice(voice: VoiceSpec, loopCount = [...this.voices.values()].filter(v => !v.preview).length) {
    if (!this.api || !this.state) return
    const orbit = this.api.getSuperdoughAudioController().getOrbit(voice.orbit, [0, 1])
    if (voice.manual && orbit.getReverb && !this.preparedManualOrbits.has(orbit)) {
      this.manualReverbs.attach(orbit, this.api.getAudioContext())
      this.preparedManualOrbits.add(orbit)
    }
    if (!this.connectedOrbits.has(voice.orbit) && this.analyser) {
      if (this.teamMixer) this.teamMixer.connect(orbit.output, voice.piece.color)
      else orbit.output.connect(this.analyser)
      this.connectedOrbits.add(voice.orbit)
    }
    const attenuation = Math.min(1, Math.sqrt(10 / Math.max(1, loopCount)))
    orbit.output.gain.setTargetAtTime(this.state.volume * attenuation, this.api.getAudioContext().currentTime, .015)
  }

  private refresh() {
    if (!this.state || this.disposed) return
    if (!this.api || !this.scheduler) {
      this.monitor.publish({ running: false, cycle: 0, beat: 1, section: 0, transport: this.transportFrame(), tracks: Object.fromEntries(this.state.pieces.map(piece => [piece.id, {
        status: this.state!.soloId && this.state!.soloId !== piece.id ? 'solo-muted' : piece.active ? 'paused' : 'inactive', notes: [], events: [], values: {},
      }])) })
      return
    }
    try {
      const specs = voiceSpecs(this.pageVisible ? this.state : { ...this.state, playing: false }, this.pageVisible ? this.preview : null, this.effectBuses).filter(voice => this.sampleReady(voice))
      // Compile first: invalid edits must not tear down the last valid voices.
      const loops = specs.filter(voice => !voice.manual)
      const compiledLoops = loops.map(v => this.patternFor(v))
      const changed = !this.scheduledLoops || compiledLoops.length !== this.scheduledLoops.length || compiledLoops.some((p, i) => p !== this.scheduledLoops![i])
      const next = new Map(specs.map(v => [v.key, v]))
      const nextOrbits = new Set([...next.values()].map(voice => voice.orbit))
      const previousOrbits = new Set([...this.voices.values()].map(voice => voice.orbit))
      for (const orbit of previousOrbits) if (!nextOrbits.has(orbit)) this.removeOrbit(orbit)
      this.voices = next
      for (const mask of this.maskCache.keys()) if (!specs.some(voice => voice.mask === mask)) this.maskCache.delete(mask)
      for (const key of this.compiled.keys()) if (!next.has(key)) { this.compiled.delete(key); this.displayCache.delete(key) }
      this.teamMixer?.update(this.state.teamMixes ?? createTeamMixes())
      const loopCount = specs.filter(v => !v.preview).length
      for (const voice of specs) this.connectVoice(voice, loopCount)
      this.scheduler.setMeter?.(beatsPerBar(this.state.meter))
      this.scheduler.setCps(this.state.bpm / (60 * beatsPerBar(this.state.meter)), this.rampBars)
      this.rampBars = 0
      if (changed) {
        const pattern = compiledLoops.length ? this.api.stack(...compiledLoops) : this.api.silence
        void this.scheduler.setPattern(pattern)
        this.scheduledLoops = compiledLoops
      }
      const shouldRun = this.pageVisible && (this.state.playing || specs.length > 0)
      if (shouldRun && !this.scheduler.started && !this.starting) {
        this.starting = true
        void this.scheduler.start().then(() => {
          this.starting = false
          if (this.disposed || (!this.state?.playing && !this.voices.size)) {
            this.scheduler.stop()
            this.clearVisuals()
          }
          this.publishFrame()
        }).catch((error: unknown) => { this.starting = false; this.error(error) })
      } else if (!shouldRun && this.scheduler.started) {
        this.scheduler.stop()
        this.clearVisuals()
      }
      this.publishFrame()
    } catch (error) { this.error(error) }
  }

  getFrequencyData(data: Uint8Array<ArrayBuffer>) {
    if (this.analyser) this.analyser.getByteFrequencyData(data)
    else data.fill(0)
  }

  private clearVisuals() {
    this.generation++
    this.visualTimers.forEach(clearTimeout)
    this.visualTimers.clear()
    this.visualBuckets.clear()
  }
  dispose() {
    this.disposed = true
    if (this.releaseTimer) clearTimeout(this.releaseTimer)
    this.releaseTimer = undefined
    this.unlockAudition = null
    this.stopManualHit()
    this.scheduler?.stop()
    if (this.monitorTimer) clearInterval(this.monitorTimer)
    this.clearVisuals()
    for (const orbit of new Set([...this.voices.values()].map(voice => voice.orbit))) this.removeOrbit(orbit)
    this.voices.clear()
    this.manualReverbs.clear()
    this.compiled.clear()
    this.displayCache.clear()
    this.maskCache.clear()
    this.analyser?.disconnect()
    this.teamMixer?.dispose()
  }
}
