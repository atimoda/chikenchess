import type { Square } from 'chess.js'
import type { SquareEffects } from '../types'
import { isConstrainedDevice } from '../performance'
import { DEFAULT_MOVEMENT, degreeToMidi, instrumentFor, type Instrument, type MovementMapping, type MusicPiece } from './model'
import { sampleRegistration, type SampleSource } from './sample-banks'
import type { Automation, Automations } from './automation'
import type { Groove, GrooveLane } from './grooves'
import { createMusicMonitor, type TrackFrame, type NoteEvent, type MusicMonitor } from './monitor'

type Strudel = typeof import('@strudel/web')
type StrudelPattern = ReturnType<Strudel['note']>
type StrudelWithPick = Strudel & { pickRestart: (lookup: StrudelPattern[], selector: string) => StrudelPattern }
export interface MusicSnapshot {
  pieces: MusicPiece[]
  scale: string[]
  bpm: number
  volume: number
  playing: boolean
  effects: Record<string, SquareEffects>
  instruments?: Record<string, Instrument>
  mappings?: Record<string, MovementMapping>
  title?: string
  sectionPattern?: string
  soloId?: string | null
  grooves?: Record<string, Groove>
}
export interface Preview { id: string; square: Square; mode?: 'manual' | 'pattern' }
export interface MusicPulse { id: string; square: Square; preview: boolean; duration: number }
export interface VoiceSpec {
  key: string
  piece: MusicPiece
  square: Square
  preview: boolean
  manual: boolean
  orbit: number
  notes: string
  phrases: string[]
  sectionPattern: string
  mask?: string
  controls: Record<string, number | string>
  instrument: Instrument
  unpitched: boolean
  groove?: GrooveLane
  automations?: Automations
}

export function voiceSpecs(state: MusicSnapshot, preview: Preview | null): VoiceSpec[] {
  return state.pieces.filter(p => (state.playing && p.active) || p.id === preview?.id).map(piece => {
    const audition = piece.id === preview?.id
    const manual = audition && preview?.mode === 'manual'
    const square = audition ? preview!.square : piece.square
    const instrument = state.instruments?.[piece.id] ?? instrumentFor(piece)
    const mapping = state.mappings?.[piece.id] ?? DEFAULT_MOVEMENT
    const fx = state.effects[piece.id]
    const advance = piece.color === 'w' ? Number(square[1]) - Number(piece.origin[1]) : Number(piece.origin[1]) - Number(square[1])
    const fileOffset = square.charCodeAt(0) - piece.origin.charCodeAt(0)
    const degreeLimit = state.mappings?.[piece.id] ? 12 : 4
    const offset = instrument.behavior === 'pulse' ? 0 : Math.max(-degreeLimit, Math.min(degreeLimit, Math.round(fileOffset * mapping.fileDegrees + Math.floor(advance * mapping.rankDegrees))))
    const source = instrument.source
    const unpitched = source?.kind === 'sample' && !source.pitched
    const toMidiPattern = (notes: string) => notes.replace(/(^|[\s[<,])(-?\d+)/g, (_, prefix, degree) => `${prefix}${unpitched ? 0 : degreeToMidi(Number(degree) + offset, state.scale, instrument.octave) + 12 * Math.log2(fx?.pitch ?? 1)}`)
    // Board performance plays a single scale degree, not the sequence/groove.
    const phrases = (manual ? ['0'] : instrument.phrases?.length ? instrument.phrases : [instrument.notes]).map(toMidiPattern)
    const notes = phrases[0]
    const lpf = Math.min(fx?.lpf ?? instrument.lpf, audition && mapping.previewFilter ? 800 + Number(square[1]) * 1800 : 20000)
    return {
      key: `${piece.id}:${audition ? 'preview' : 'loop'}`, piece, square, preview: audition, manual,
      orbit: piece.slot + (audition ? 64 : 0), notes,
      phrases,
      sectionPattern: state.sectionPattern ?? '0',
      // A solo should be audible immediately, even when the arrangement mask
      // normally holds this layer back until a later section.
      mask: audition || state.soloId === piece.id ? undefined : instrument.mask,
      instrument,
      unpitched,
      groove: !manual && instrument.groove ? state.grooves?.[instrument.groove.groove]?.lanes[instrument.groove.lane] : undefined,
      automations: instrument.automations,
      controls: {
        s: source?.kind === 'sample' ? sampleRegistration(source).sound : instrument.sound,
        ...(unpitched ? { speed: fx?.pitch ?? 1 } : {}),
        gain: instrument.gain * (fx?.gain ?? 1),
        attack: instrument.attack, decay: fx?.decay ?? instrument.decay ?? 0.15,
        sustain: instrument.sustain ?? (instrument.behavior === 'pulse' ? 0 : 0.55),
        release: instrument.release,
        // Percussion gates are short even when the rhythmic cell lasts a beat.
        clip: manual ? 1 : instrument.clip ?? (instrument.behavior === 'pulse' ? 0.12 : instrument.behavior === 'sustain' ? 0.95 : 0.7),
        lpf, hpf: fx?.hpf ?? instrument.hpf,
        pan: Math.max(0, Math.min(1, 0.5 + ((square.charCodeAt(0) - 97) / 7 - 0.5) * mapping.panWidth + (fx?.pan ?? 0) / 2)),
        room: fx?.reverb ?? 0.12,
        delay: fx?.delay ?? 0,
        delaytime: 60 / state.bpm * 0.75,
      },
    }
  })
}

export function renderMusicCode(state: MusicSnapshot, preview: Preview | null): string {
  const voices = voiceSpecs(state, preview).filter(voice => !voice.manual)
  const samples = [...new Map(voices.flatMap(v => v.instrument.source?.kind === 'sample' ? [[sampleRegistration(v.instrument.source).sound, sampleRegistration(v.instrument.source)]] : [])).values()]
  return [
    `// ${(state.title ?? 'Düsseldorf').replace(/[\r\n]/g, ' ')} · Strudel`,
    '// Degrees follow the shared scale; each piece keeps its instrument.',
    ...(preview?.mode === 'manual' ? [`// ${preview.id}: manual note at ${preview.square}; its loop is suspended during the gesture.`] : []),
    `setcps(${state.bpm} / 60 / 4)`,
    ...samples.map(sample => `samples(${JSON.stringify(sample.map)})`),
    'stack(',
    ...voices.map(v => {
      const eventType = v.unpitched ? 'n' : 'note'
      const source = v.phrases.length > 1
        ? `${JSON.stringify(v.sectionPattern)}.pickRestart([${v.phrases.map(phrase => `${eventType}(${JSON.stringify(phrase)})`).join(', ')}])`
        : `${eventType}(${JSON.stringify(v.notes)})`
      const mask = v.mask ? `.mask(${JSON.stringify(v.mask)})` : ''
      const groove = v.groove ? `.struct(${patternBankCode(v.groove.rhythms, v.sectionPattern)}).velocity(${patternBankCode(v.groove.accents, v.sectionPattern)})` : ''
      const automation = Object.entries(v.automations ?? {}).map(([key, value]) => `.${key}(${automationCode(value, v.sectionPattern)}${key === 'gain' ? `.mul(${Number(v.controls.gain)})` : key === 'lpf' && v.preview ? `.withValue(x => Math.min(x, ${v.controls.lpf}))` : ''})`).join('')
      const mix = state.volume * Math.min(1, Math.sqrt(10 / Math.max(1, voices.filter(voice => !voice.preview).length)))
      return `  // ${v.piece.id} · ${v.instrument.name.replace(/[\r\n]/g, ' ')}${v.preview ? ' · audition' : ''}\n  ${source}${groove}${mask}\n    ${Object.entries(v.controls).map(([key, value]) => `.${key}(${JSON.stringify(value)})`).join('')}${automation}.postgain(${mix}).orbit(${v.orbit}),`
    }),
    voices.length ? ')' : '  silence\n)',
  ].join('\n')
}

function patternBankCode(patterns: string[], section: string) {
  return patterns.length === 1 ? `mini(${JSON.stringify(patterns[0])})` : `${JSON.stringify(section)}.pickRestart([${patterns.map(p => `mini(${JSON.stringify(p)})`).join(', ')}])`
}
function automationCode(value: Automation, section: string) {
  return value.kind === 'pattern' ? patternBankCode(value.patterns, section) : `${value.kind === 'sine' ? 'sine' : 'saw'}.range(${value.min}, ${value.max}).slow(${value.cycles})`
}
function patternBank(api: Strudel, patterns: string[], section: string) {
  return patterns.length === 1 ? api.mini(patterns[0]) : (api as StrudelWithPick).pickRestart(patterns.map(p => api.mini(p)), section)
}
function automationPattern(api: Strudel, value: Automation, section: string) {
  return value.kind === 'pattern' ? patternBank(api, value.patterns, section) : (value.kind === 'sine' ? api.sine : api.saw).range(value.min, value.max).slow(value.cycles)
}

let library: Promise<Strudel> | undefined
function loadLibrary() {
  return library ??= import('@strudel/web').then(s => {
    s.miniAllStrings()
    s.registerSynthSounds()
    return s
  }).catch(error => { library = undefined; throw error })
}

export function compileVoice(api: Strudel, voice: VoiceSpec) {
  const events = voice.unpitched ? api.n : api.note
  let pattern = voice.phrases.length > 1
    ? (api as StrudelWithPick).pickRestart(voice.phrases.map(phrase => events(phrase)), voice.sectionPattern)
    : events(voice.notes)
  if (voice.groove) pattern = pattern.struct(patternBank(api, voice.groove.rhythms, voice.sectionPattern)).velocity(patternBank(api, voice.groove.accents, voice.sectionPattern))
  if (voice.mask) pattern = pattern.mask(voice.mask)
  for (const [key, value] of Object.entries(voice.controls)) pattern = pattern[key](value)
  for (const [key, value] of Object.entries(voice.automations ?? {})) {
    let control = automationPattern(api, value, voice.sectionPattern)
    if (key === 'gain') control = control.mul(Number(voice.controls.gain))
    if (key === 'lpf' && voice.preview) control = control.withValue((x: number) => Math.min(x, Number(voice.controls.lpf)))
    pattern = pattern[key](control)
  }
  return pattern.orbit(voice.orbit).withValue((value: object) => ({ ...value, ccVoice: voice.key }))
}

// Validate inactive tracks too, without opening an AudioContext or playing sound.
export async function validateMusicSnapshot(state: MusicSnapshot) {
  const api = await loadLibrary()
  for (const voice of voiceSpecs({ ...state, playing: true, pieces: state.pieces.map(p => ({ ...p, active: true })) }, null)) {
    // Audit all sections without entry masks hiding invalid or very dense parts.
    for (let section = 0; section < 4; section++) {
      const pattern = compileVoice(api, { ...voice, mask: undefined, sectionPattern: String(section) })
      for (let cycle = 0; cycle < 4; cycle++) {
        if (pattern.queryArc(cycle, cycle + 1).length > 128) throw new Error(`${voice.instrument.name}: reduza a densidade do padrão.`)
      }
    }
  }
}

const sampleLoads = new Map<string, Promise<void>>()
const loadedSamples = new Set<string>()
function ensureSample(api: Strudel, source: SampleSource) {
  const sample = sampleRegistration(source)
  let pending = sampleLoads.get(sample.sound)
  if (!pending) {
    pending = (async () => {
      await api.samples(sample.map)
      await api.loadBuffer(sample.file, api.getAudioContext(), sample.sound)
      loadedSamples.add(sample.sound)
    })()
    sampleLoads.set(sample.sound, pending)
  }
  return pending
}

/** One owned scheduler, with a separate orbit for each voice and temporary audition. */
export class MusicRuntime {
  private api?: Strudel
  private scheduler: any
  private state?: MusicSnapshot
  private preview: Preview | null = null
  private unlockAudition: Preview | null = null
  private voices = new Map<string, VoiceSpec>()
  private ready?: Promise<void>
  private disposed = false
  private generation = 0
  private visualTimers = new Set<ReturnType<typeof setTimeout>>()
  private starting = false
  private analyser?: AnalyserNode
  private connectedOrbits = new Set<number>()
  private visualInterval = 1 / 15
  private visualBuckets = new Map<number, { events: Map<string, MusicPulse>; timer: ReturnType<typeof setTimeout> }>()
  private visualCursor = 0
  private compiled = new Map<string, { signature: string; pattern: StrudelPattern }>()
  private loading = new Set<string>()
  private sampleErrors = new Set<string>()
  private monitorTimer?: ReturnType<typeof setInterval>
  private displayCache = new Map<string, { pattern: StrudelPattern; cycle: number; events: NoteEvent[]; haps: any[] }>()
  private sectionCache?: { source: string; pattern: StrudelPattern }
  private maskCache = new Map<string, StrudelPattern>()
  private manualHit?: { voice: VoiceSpec; value: any; start: number; end: number }
  constructor(private pulse: (event: MusicPulse) => void, private error: (error: unknown) => void, readonly monitor: MusicMonitor = createMusicMonitor()) {}

  // Preload JS only. AudioContext is created/resumed from an interaction.
  preload() { void loadLibrary().catch(this.error) }

  async unlock() {
    if (this.disposed) return
    if (!this.ready) this.ready = this.initialize().catch(error => { this.ready = undefined; throw error })
    try {
      await this.ready
      if (this.disposed) return
      await this.api!.getAudioContext().resume()
      this.refresh()
    } catch (error) { this.error(error) }
  }

  private async initialize() {
    const s = await loadLibrary()
    if (this.disposed) return
    this.api = s
    const constrained = isConstrainedDevice()
    this.visualInterval = 1 / (constrained ? 8 : 15)
    await s.initAudio({ maxPolyphony: constrained ? 32 : 64 })
    if (this.disposed) return
    const context: AudioContext = s.getAudioContext()
    this.analyser = context.createAnalyser()
    this.analyser.fftSize = 256
    this.scheduler = new s.Cyclist({
      getTime: () => context.currentTime,
      onError: this.error,
      onTrigger: (hap: any, deadline: number, duration: number, cps: number, time: number) => {
        const voice = this.voices.get(hap.value.ccVoice)
        if (!voice) return
        void s.webaudioOutput(hap, deadline, duration, cps, time).catch(this.error)
        this.scheduleVisual(voice, time, duration)
      },
    })
    this.monitorTimer = setInterval(() => { if (this.scheduler?.started) this.publishFrame() }, constrained ? 150 : 100)
  }

  update(state: MusicSnapshot) { this.state = state; this.refresh() }

  audition(id: string, square: Square, mode: Preview['mode'] = 'manual') {
    if (this.preview?.id === id && this.preview.square === square && this.preview.mode === mode) return
    const requested = { id, square, mode }
    if (this.preview?.mode === 'manual') this.stopManualHit()
    this.preview = requested
    this.refresh()
    // A short immediate note gives tactile feedback even before the next onset.
    // Keep the latest request while the first AudioContext is being created. A
    // quick tap may end before initialization finishes, but it must still sound.
    {
      this.unlockAudition = requested
      void this.unlock().then(async () => {
        const source = this.state?.instruments?.[id]?.source
        if (source?.kind === 'sample' && this.api) await ensureSample(this.api, source)
        if (this.disposed) return
        const currentMatches = this.preview === requested
        const pendingMatches = this.unlockAudition === requested
        if (!currentMatches && !pendingMatches) return
        if (pendingMatches) this.unlockAudition = null
        this.triggerPreview(requested)
      }).catch(this.error)
    }
  }

  endAudition() {
    if (this.preview?.mode === 'manual') this.unlockAudition = null
    this.stopManualHit()
    this.preview = null
    this.refresh()
  }

  private stopManualHit() {
    if (this.manualHit) this.removeOrbit(this.manualHit.voice.orbit)
    this.manualHit = undefined
  }

  private triggerPreview(requested: Preview) {
    if (!this.api || !this.state || this.disposed) return
    // Build from the requested square as the pointer may already be up by the
    // time the browser grants audio access on the first interaction.
    const voice = voiceSpecs(this.state, requested).find(v => v.preview)
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
      this.refresh()
    }
    void this.api.webaudioOutput(hap, 0, duration, this.state.bpm / 240, time).catch(this.error)
    this.scheduleVisual(voice, time, duration)
  }

  private patternFor(voice: VoiceSpec) {
    const signature = JSON.stringify(voice)
    const cached = this.compiled.get(voice.key)
    if (cached?.signature === signature) return cached.pattern
    const pattern = compileVoice(this.api!, voice)
    this.compiled.set(voice.key, { signature, pattern })
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
          tracks[piece.id] = { ...empty, status: sounding ? 'note' : 'rest', notes: sounding ? [voice.unpitched ? null : Number(hit.value.note)] : [] }
          continue
        }
        const pattern = this.patternFor(voice)
        let cached = this.displayCache.get(voice.key)
        if (!cached || cached.pattern !== pattern || cached.cycle !== cycleIndex) {
          const haps = pattern.queryArc(cycleIndex, cycleIndex + 1, { _cps: this.state.bpm / 240 })
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
      this.monitor.publish({ running: this.scheduler.started, cycle, beat: Math.floor((cycle % 1) * 4) + 1, section, tracks })
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
      if (this.disposed || generation !== this.generation || !this.voices.has(voice.key)) return
      this.pulse(event)
    }, Math.max(0, (time - this.api!.getAudioContext().currentTime) * 1000))
    this.visualTimers.add(timer)
  }

  private removeOrbit(orbit: number) {
    const controller = this.api?.getSuperdoughAudioController()
    // Disconnecting a removed voice also prevents already scheduled attacks and
    // effect tails from leaking into a later audition on the same piece.
    controller?.nodes[orbit]?.disconnect()
    if (controller) delete controller.nodes[orbit]
    this.connectedOrbits.delete(orbit)
  }

  private refresh() {
    if (!this.state || this.disposed) return
    if (!this.api || !this.scheduler) {
      this.monitor.publish({ running: false, cycle: 0, beat: 1, section: 0, tracks: Object.fromEntries(this.state.pieces.map(piece => [piece.id, {
        status: this.state!.soloId && this.state!.soloId !== piece.id ? 'solo-muted' : piece.active ? 'paused' : 'inactive', notes: [], events: [], values: {},
      }])) })
      return
    }
    try {
      const specs = voiceSpecs(this.state, this.preview).filter(voice => this.sampleReady(voice))
      // Compile first: invalid edits must not tear down the last valid voices.
      const loops = specs.filter(voice => !voice.manual)
      const pattern = loops.length ? this.api.stack(...loops.map(v => this.patternFor(v))) : this.api.silence
      const next = new Map(specs.map(v => [v.key, v]))
      for (const [key, voice] of this.voices) if (!next.has(key)) this.removeOrbit(voice.orbit)
      this.voices = next
      for (const mask of this.maskCache.keys()) if (!specs.some(voice => voice.mask === mask)) this.maskCache.delete(mask)
      for (const key of this.compiled.keys()) if (!next.has(key)) { this.compiled.delete(key); this.displayCache.delete(key) }
      const controller = this.api.getSuperdoughAudioController()
      const time = this.api.getAudioContext().currentTime
      const loopCount = specs.filter(voice => !voice.preview).length
      const denseMixAttenuation = Math.min(1, Math.sqrt(10 / Math.max(1, loopCount)))
      for (const voice of specs) {
        const orbit = controller.getOrbit(voice.orbit, [0, 1])
        if (!this.connectedOrbits.has(voice.orbit) && this.analyser) {
          orbit.output.connect(this.analyser)
          this.connectedOrbits.add(voice.orbit)
        }
        orbit.output.gain.setTargetAtTime(this.state.volume * denseMixAttenuation, time, 0.015)
      }
      this.scheduler.setCps(this.state.bpm / 240)
      void this.scheduler.setPattern(pattern)
      const shouldRun = this.state.playing || specs.length > 0
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
    this.unlockAudition = null
    this.stopManualHit()
    this.scheduler?.stop()
    if (this.monitorTimer) clearInterval(this.monitorTimer)
    this.clearVisuals()
    for (const voice of this.voices.values()) this.removeOrbit(voice.orbit)
    this.voices.clear()
    this.compiled.clear()
    this.displayCache.clear()
    this.maskCache.clear()
    this.analyser?.disconnect()
  }
}
