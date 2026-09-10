import type { Square } from 'chess.js'
import type { SquareEffects } from '../types'
import { DEFAULT_MOVEMENT, degreeToMidi, instrumentFor, type Instrument, type MovementMapping, type MusicPiece } from './model'

type Strudel = typeof import('@strudel/web')
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
}
export interface Preview { id: string; square: Square }
export interface MusicPulse { id: string; square: Square; preview: boolean; duration: number }
export interface VoiceSpec {
  key: string
  piece: MusicPiece
  square: Square
  preview: boolean
  orbit: number
  notes: string
  controls: Record<string, number | string>
  instrument: Instrument
}

export function voiceSpecs(state: MusicSnapshot, preview: Preview | null): VoiceSpec[] {
  return state.pieces.filter(p => (state.playing && p.active) || p.id === preview?.id).map(piece => {
    const audition = piece.id === preview?.id
    const square = audition ? preview!.square : piece.square
    const instrument = state.instruments?.[piece.id] ?? instrumentFor(piece)
    const mapping = state.mappings?.[piece.id] ?? DEFAULT_MOVEMENT
    const fx = state.effects[piece.id]
    const advance = piece.color === 'w' ? Number(square[1]) - Number(piece.origin[1]) : Number(piece.origin[1]) - Number(square[1])
    const fileOffset = square.charCodeAt(0) - piece.origin.charCodeAt(0)
    const degreeLimit = state.mappings?.[piece.id] ? 12 : 4
    const offset = instrument.behavior === 'pulse' ? 0 : Math.max(-degreeLimit, Math.min(degreeLimit, Math.round(fileOffset * mapping.fileDegrees + Math.floor(advance * mapping.rankDegrees))))
    const notes = instrument.notes.replace(/(^|[\s[<,])(-?\d+)/g, (_, prefix, degree) => `${prefix}${degreeToMidi(Number(degree) + offset, state.scale, instrument.octave) + 12 * Math.log2(fx?.pitch ?? 1)}`)
    const lpf = Math.min(fx?.lpf ?? instrument.lpf, audition && mapping.previewFilter ? 800 + Number(square[1]) * 1800 : 20000)
    return {
      key: `${piece.id}:${audition ? 'preview' : 'loop'}`, piece, square, preview: audition,
      orbit: piece.slot + (audition ? 64 : 0), notes,
      instrument,
      controls: {
        s: instrument.sound,
        gain: instrument.gain * (fx?.gain ?? 1),
        attack: instrument.attack, decay: fx?.decay ?? instrument.decay ?? 0.15,
        sustain: instrument.sustain ?? (instrument.behavior === 'pulse' ? 0 : 0.55),
        release: instrument.release,
        // Percussion gates are short even when the rhythmic cell lasts a beat.
        clip: instrument.clip ?? (instrument.behavior === 'pulse' ? 0.12 : instrument.behavior === 'sustain' ? 0.95 : 0.7),
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
  const voices = voiceSpecs(state, preview)
  return [
    `// ${(state.title ?? 'Düsseldorf').replace(/[\r\n]/g, ' ')} · Strudel`,
    '// Degrees follow the shared scale; each piece keeps its instrument.',
    `setcps(${state.bpm} / 60 / 4)`,
    'stack(',
    ...voices.map(v => `  // ${v.piece.id} · ${v.instrument.name.replace(/[\r\n]/g, ' ')}${v.preview ? ' · audition' : ''}\n  note(${JSON.stringify(v.notes)})\n    ${Object.entries(v.controls).map(([key, value]) => `.${key}(${JSON.stringify(key === 'gain' ? Number(value) * state.volume : value)})`).join('')}.orbit(${v.orbit})` + ','),
    voices.length ? ')' : '  silence\n)',
  ].join('\n')
}

let library: Promise<Strudel> | undefined
function loadLibrary() {
  return library ??= import('@strudel/web').then(s => {
    s.miniAllStrings()
    s.registerSynthSounds()
    return s
  }).catch(error => { library = undefined; throw error })
}

function compileVoice(api: Strudel, voice: VoiceSpec) {
  let pattern = api.note(voice.notes)
  for (const [key, value] of Object.entries(voice.controls)) pattern = pattern[key](value)
  return pattern.orbit(voice.orbit).withValue((value: object) => ({ ...value, ccVoice: voice.key }))
}

// Validate inactive tracks too, without opening an AudioContext or playing sound.
export async function validateMusicSnapshot(state: MusicSnapshot) {
  const api = await loadLibrary()
  for (const voice of voiceSpecs({ ...state, playing: true, pieces: state.pieces.map(p => ({ ...p, active: true })) }, null)) {
    const pattern = compileVoice(api, voice)
    if (pattern.queryArc(0, 2).length > 256) throw new Error(`${voice.instrument.name}: reduza a densidade do padrão.`)
  }
}

/** One owned scheduler, with a separate orbit for each voice and temporary audition. */
export class MusicRuntime {
  private api?: Strudel
  private scheduler: any
  private state?: MusicSnapshot
  private preview: Preview | null = null
  private voices = new Map<string, VoiceSpec>()
  private ready?: Promise<void>
  private disposed = false
  private generation = 0
  private visualTimers = new Set<ReturnType<typeof setTimeout>>()
  private starting = false
  private analyser?: AnalyserNode
  private connectedOrbits = new Set<number>()
  constructor(private pulse: (event: MusicPulse) => void, private error: (error: unknown) => void) {}

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
    await s.initAudio({ maxPolyphony: 96 })
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
  }

  update(state: MusicSnapshot) { this.state = state; this.refresh() }

  audition(id: string, square: Square) {
    const changed = this.preview?.id !== id || this.preview.square !== square
    this.preview = { id, square }
    this.refresh()
    // A short immediate note gives tactile feedback even before the next onset.
    if (changed) void this.unlock().then(() => {
      if (this.preview?.id !== id || this.preview.square !== square) return
      this.triggerPreview()
    })
  }

  endAudition() { this.preview = null; this.refresh() }

  private triggerPreview() {
    if (!this.api || !this.state || this.disposed) return
    const voice = [...this.voices.values()].find(v => v.preview)
    if (!voice) return
    const pattern = this.patternFor(voice)
    const hap = pattern.queryArc(0, 4).find((h: any) => h.hasOnset())
    if (!hap) return
    const time = this.api.getAudioContext().currentTime + 0.03
    void this.api.webaudioOutput(hap, 0, 0.12, this.state.bpm / 240, time).catch(this.error)
    this.scheduleVisual(voice, time, 0.12)
  }

  private patternFor(voice: VoiceSpec) {
    return compileVoice(this.api!, voice)
  }

  private scheduleVisual(voice: VoiceSpec, time: number, duration: number) {
    const generation = this.generation
    const timer = setTimeout(() => {
      this.visualTimers.delete(timer)
      if (this.disposed || generation !== this.generation || !this.voices.has(voice.key)) return
      this.pulse({ id: voice.piece.id, square: voice.square, preview: voice.preview, duration })
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
    if (!this.api || !this.scheduler || !this.state || this.disposed) return
    try {
      const specs = voiceSpecs(this.state, this.preview)
      // Compile first: invalid edits must not tear down the last valid voices.
      const pattern = specs.length ? this.api.stack(...specs.map(v => this.patternFor(v))) : this.api.silence
      const next = new Map(specs.map(v => [v.key, v]))
      for (const [key, voice] of this.voices) if (!next.has(key)) this.removeOrbit(voice.orbit)
      this.voices = next
      const controller = this.api.getSuperdoughAudioController()
      const time = this.api.getAudioContext().currentTime
      for (const voice of specs) {
        const orbit = controller.getOrbit(voice.orbit, [0, 1])
        if (!this.connectedOrbits.has(voice.orbit) && this.analyser) {
          orbit.output.connect(this.analyser)
          this.connectedOrbits.add(voice.orbit)
        }
        orbit.output.gain.setTargetAtTime(this.state.volume, time, 0.015)
      }
      this.scheduler.setCps(this.state.bpm / 240)
      void this.scheduler.setPattern(pattern)
      if (specs.length && !this.scheduler.started && !this.starting) {
        this.starting = true
        void this.scheduler.start().then(() => {
          this.starting = false
          if (this.disposed || !this.voices.size) this.scheduler.stop()
        }).catch((error: unknown) => { this.starting = false; this.error(error) })
      } else if (!specs.length && this.scheduler.started) {
        this.scheduler.stop()
        this.clearVisuals()
      }
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
  }
  dispose() {
    this.disposed = true
    this.scheduler?.stop()
    this.clearVisuals()
    for (const voice of this.voices.values()) this.removeOrbit(voice.orbit)
    this.voices.clear()
    this.analyser?.disconnect()
  }
}
