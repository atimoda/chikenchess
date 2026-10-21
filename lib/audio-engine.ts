"use client"

// Web Audio-based synthesizer engine for ChiKenChess
// This provides real-time audio synthesis without external dependencies

export class AudioEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private isInitialized = false
  private isPlaying = false
  private scheduledNodes: AudioScheduledSourceNode[] = []
  private intervalId: number | null = null
  private currentPattern: ParsedPattern | null = null
  private ambienceNodes: AudioScheduledSourceNode[] = []
  private ambienceGain: GainNode | null = null
  private ambienceFilter: BiquadFilterNode | null = null
  private ambienceLfo: OscillatorNode | null = null
  private ambienceOscillators: OscillatorNode[] = []
  private ambienceBaseFreqs: number[] = []
  private ambiencePitchMultiplier: number = 1
  private powerCrackleBuffer: AudioBuffer | null = null
  private lastPowerHoverTime = -Infinity

  // Sound parameters
  private bpm = 120
  private globalBpm: number | null = null
  private stepTime = 0.125 // 16th note duration
  private currentStep = 0


  // Per-square effects and samples
  private squareEffects: Record<string, any> = {}
  private squareSamples: Record<string, string> = {}
  private samplesList = ["bd", "sd", "hh", "cp", "mt", "ht", "lt", "cy", "cb", "oh", "ch", "lc", "mc", "hc"]

  private analyser: AnalyserNode | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.init()
      this.initSquareSamples()
    }
  }

  private initSquareSamples() {
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
    for (let rank = 1; rank <= 8; rank++) {
      for (const file of files) {
        const square = `${file}${rank}`
        // Randomly assign a sample to each square
        this.squareSamples[square] = this.samplesList[Math.floor(Math.random() * this.samplesList.length)]
      }
    }
  }

  private async init() {
    try {
      this.audioContext = new AudioContext()

      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256

      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.7

      // Connect: masterGain -> analyser -> destination
      this.masterGain.connect(this.analyser)
      this.analyser.connect(this.audioContext.destination)

      this.isInitialized = true
    } catch (e) {
      console.error("Failed to initialize audio:", e)
    }
  }

  get context(): AudioContext | null {
    return this.audioContext
  }

  getFrequencyData(dataArray: any) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray)
    }
  }

  getTeamFrequencyData(_color: 'w' | 'b', dataArray: any) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray)
    }
  }

  async resume() {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume()
    }
  }

  setBpm(bpm: number) {
    this.bpm = bpm
    this.stepTime = 60 / bpm / 4 // 16th note
  }

  setGlobalBpm(bpm: number) {
    this.globalBpm = bpm
    this.stepTime = 60 / bpm / 4
    if (this.isPlaying) {
       this.restartScheduler()
    }
  }

  setGlobalVolume(volume: number) {
    if (this.masterGain && this.audioContext) {
      const time = this.audioContext.currentTime
      this.masterGain.gain.setTargetAtTime(volume, time, 0.1)
    }
  }

  setAmbiencePitch(pitch: number) {
    this.ambiencePitchMultiplier = pitch
    if (this.ambienceOscillators.length === 2 && this.ambienceBaseFreqs.length === 2 && this.audioContext) {
       const time = this.audioContext.currentTime
       this.ambienceOscillators[0].frequency.setTargetAtTime(this.ambienceBaseFreqs[0] * pitch, time, 0.1)
       this.ambienceOscillators[1].frequency.setTargetAtTime(this.ambienceBaseFreqs[1] * pitch, time, 0.1)
    }
  }

  setAmbienceFilter(freq: number) {
    if (this.ambienceFilter && this.audioContext) {
       const time = this.audioContext.currentTime
       this.ambienceFilter.frequency.setTargetAtTime(freq, time, 0.1)
    }
  }

  setAmbienceLFO(speed: number) {
    if (this.ambienceLfo && this.audioContext) {
       const time = this.audioContext.currentTime
       this.ambienceLfo.frequency.setTargetAtTime(speed, time, 0.1)
    }
  }

  setPattern(pattern: ParsedPattern) {
    this.currentPattern = pattern
    // Only update BPM if global override is not set
    if (!this.globalBpm) {
      this.bpm = pattern.bpm
      this.stepTime = 60 / this.bpm / 4
    }
  }

  private restartScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = window.setInterval(() => this.scheduleLoop(), this.stepTime * 1000)
    }
  }

  setSquareEffects(effects: Record<string, any>) {
    this.squareEffects = effects
  }

  async playIllegalMoveGlitch(pieceType: string, square?: string) {
    if (!this.audioContext || !this.masterGain) await this.init()
    if (!this.audioContext) return

    const now = this.audioContext.currentTime
    const pattern = this.currentPattern
    const scale = pattern?.scale
    const fallbackScale = ["C4", "Eb4", "F4", "G4", "Bb4"]
    const activeScale = scale && scale.length > 0 ? scale : fallbackScale

    let gain = 0.2
    let pan = 0
    let delay = 0.05
    let reverb = 0.1

    let noteIndex = Math.floor(Math.random() * activeScale.length)
    if (square && square.length >= 2) {
      const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
      const fileChar = square[0].toLowerCase()
      const rankChar = square[1]
      let fileIndex = files.indexOf(fileChar)
      let rankIndex = parseInt(rankChar || "1", 10) - 1
      if (fileIndex < 0) fileIndex = 0
      if (!Number.isFinite(rankIndex) || rankIndex < 0) rankIndex = 0
      noteIndex = (fileIndex + rankIndex * 2) % activeScale.length
    }

    const baseNote = activeScale[noteIndex]
    let freq = noteToFrequency(baseNote)

    switch (pieceType) {
      case "p":
        this.playPawn(now, "bd", gain * 0.3, pan, "w", 0.9, delay, reverb + 0.05)
        break
      case "n":
        this.playHoofBeats(now, gain * 0.25, 0, 0.05)
        break
      case "b": {
        const filter = this.audioContext.createBiquadFilter()
        filter.type = "lowpass"
        filter.frequency.value = 600
        filter.Q.value = 0.7

        const gainNode = this.audioContext.createGain()
        gainNode.gain.setValueAtTime(gain * 0.3, now)

        const panner = this.audioContext.createStereoPanner()
        panner.pan.value = pan

        const osc = this.audioContext.createOscillator()
        osc.type = "triangle"
        osc.frequency.value = freq

        osc.connect(filter).connect(gainNode).connect(panner)
        this.applyEffects(panner, delay, reverb)

        osc.start(now)
        osc.stop(now + 0.35)
        break
      }
      case "r":
        this.playPad(now, [freq, freq * 1.25, freq * 1.5], pan, gain * 0.25, [0.1, 0.2, 0.5, 0.3], delay, reverb + 0.05)
        break
      case "q":
        this.playLead6Voice(now, freq, gain * 0.2, pan, delay, reverb + 0.05)
        break
      case "k":
        this.playTimpani(now, gain * 0.25, pan, delay, reverb + 0.05)
        break
      default:
        this.playPawn(now, "bd", gain * 0.3, pan, "w", 0.9, delay, reverb + 0.05)
    }
  }

  playDrum(sample: string, gain: number = 0.6, pitch: number = 1, openHatDecay: number = 1) {
    if (!this.audioContext || !this.masterGain) return
    const now = this.audioContext.currentTime
    this.playPawn(now, sample, gain, 0, "w", pitch, 0, 0, undefined, undefined, undefined, openHatDecay)
  }

  playPowerHover(kind: 'freeze' | 'shield') {
    const ctx = this.audioContext, master = this.masterGain
    if (!ctx || !master || ctx.state !== 'running') return
    const time = ctx.currentTime
    // Fast sweeps stay quiet and bounded; holding one square never retriggers.
    if (time - this.lastPowerHoverTime < .045) return
    this.lastPowerHoverTime = time
    if (kind === 'freeze') {
      if (!this.powerCrackleBuffer) {
        const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .16), ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) {
          const phase = i / ctx.sampleRate
          const crack = Math.pow(Math.max(0, Math.sin(phase * 260)), 12)
          data[i] = (Math.random() * 2 - 1) * (.08 + crack * .92)
        }
        this.powerCrackleBuffer = buffer
      }
      const noise = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain()
      noise.buffer = this.powerCrackleBuffer
      noise.playbackRate.value = .9 + Math.random() * .2
      filter.type = 'bandpass'
      filter.frequency.value = 2300 + Math.random() * 850
      filter.Q.value = .8
      envelope.gain.setValueAtTime(.001, time)
      envelope.gain.exponentialRampToValueAtTime(.055, time + .006)
      envelope.gain.exponentialRampToValueAtTime(.001, time + .16)
      noise.connect(filter).connect(envelope).connect(master)
      noise.onended = () => { noise.disconnect(); filter.disconnect(); envelope.disconnect() }
      noise.start(time)
      noise.stop(time + .18)
    } else {
      const pitch = .97 + Math.random() * .06
      for (const [index, frequency] of [740, 1379, 2183].entries()) {
        const tone = ctx.createOscillator(), envelope = ctx.createGain()
        tone.type = 'sine'
        tone.frequency.setValueAtTime(frequency * pitch, time)
        tone.frequency.exponentialRampToValueAtTime(frequency * pitch * .985, time + .2)
        envelope.gain.setValueAtTime(.001, time)
        envelope.gain.exponentialRampToValueAtTime(.028 / (index + 1), time + .003)
        envelope.gain.exponentialRampToValueAtTime(.001, time + .2 - index * .025)
        tone.connect(envelope).connect(master)
        tone.onended = () => { tone.disconnect(); envelope.disconnect() }
        tone.start(time)
        tone.stop(time + .22)
      }
    }
  }

  /** Auxiliary ice feedback, independent of the musical engine and cancellable during unlock. */
  playFrozenPieceClink(): () => void {
    const ctx = this.audioContext, master = this.masterGain
    if (!ctx || !master) return () => {}
    let cancelled = false
    const tones: { tone: OscillatorNode; envelope: GainNode }[] = []
    const start = () => {
      if (cancelled || ctx.state !== 'running') return
      const time = ctx.currentTime
      for (const [index, frequency] of [1850, 3370, 5210].entries()) {
        const tone = ctx.createOscillator(), envelope = ctx.createGain()
        tone.type = 'sine'
        tone.frequency.setValueAtTime(frequency, time)
        tone.frequency.exponentialRampToValueAtTime(frequency * .92, time + .16)
        envelope.gain.setValueAtTime(.001, time)
        envelope.gain.exponentialRampToValueAtTime(.04 / (index + 1), time + .003)
        envelope.gain.exponentialRampToValueAtTime(.001, time + .16 - index * .025)
        tone.connect(envelope).connect(master)
        tone.onended = () => { tone.disconnect(); envelope.disconnect() }
        tones.push({ tone, envelope })
        tone.start(time)
        tone.stop(time + .18)
      }
    }
    if (ctx.state === 'running') start()
    else void ctx.resume().then(start).catch(() => {})
    return () => {
      cancelled = true
      for (const { tone, envelope } of tones) {
        try { tone.stop() } catch { /* Already ended. */ }
        tone.disconnect()
        envelope.disconnect()
      }
    }
  }

  /** Short fracture/dissolve cue; never starts late after leaving the board. */
  playPowerRelease(kind: 'freeze' | 'shield'): () => void {
    const ctx = this.audioContext, master = this.masterGain
    if (!ctx || !master || ctx.state !== 'running') return () => {}
    const nodes: { source: AudioScheduledSourceNode; envelope: GainNode; filter?: BiquadFilterNode }[] = []
    const time = ctx.currentTime
    if (kind === 'freeze') {
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * .12), ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
      for (const offset of [0, .045, .095]) {
        const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), envelope = ctx.createGain()
        source.buffer = buffer
        filter.type = 'highpass'
        filter.frequency.value = 1800
        envelope.gain.setValueAtTime(.001, time + offset)
        envelope.gain.exponentialRampToValueAtTime(.07, time + offset + .003)
        envelope.gain.exponentialRampToValueAtTime(.001, time + offset + .1)
        source.connect(filter).connect(envelope).connect(master)
        source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect() }
        source.start(time + offset)
        source.stop(time + offset + .12)
        nodes.push({ source, filter, envelope })
      }
    } else {
      for (const [index, frequency] of [880, 1760, 2640].entries()) {
        const source = ctx.createOscillator(), envelope = ctx.createGain()
        source.type = 'sine'
        source.frequency.setValueAtTime(frequency, time)
        source.frequency.exponentialRampToValueAtTime(frequency * .7, time + .26)
        envelope.gain.setValueAtTime(.001, time)
        envelope.gain.exponentialRampToValueAtTime(.055 / (index + 1), time + .004)
        envelope.gain.exponentialRampToValueAtTime(.001, time + .26)
        source.connect(envelope).connect(master)
        source.onended = () => { source.disconnect(); envelope.disconnect() }
        source.start(time)
        source.stop(time + .28)
        nodes.push({ source, envelope })
      }
    }
    return () => {
      for (const { source, filter, envelope } of nodes) {
        try { source.stop() } catch { /* Already ended. */ }
        source.disconnect(); filter?.disconnect(); envelope.disconnect()
      }
    }
  }

  async playBlockedCue() {
    if (!this.audioContext || !this.masterGain) await this.init()
    await this.resume()
    if (!this.audioContext || !this.masterGain) return

    const time = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const envelope = this.audioContext.createGain()
    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(180, time)
    oscillator.frequency.exponentialRampToValueAtTime(95, time + 0.17)
    envelope.gain.setValueAtTime(0.001, time)
    envelope.gain.exponentialRampToValueAtTime(0.12, time + 0.012)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.2)
    oscillator.connect(envelope).connect(this.masterGain)
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() }
    oscillator.start(time)
    oscillator.stop(time + 0.2)
  }

  async playAnalysisWhistle(direction: 'up' | 'down') {
    if (!this.audioContext || !this.masterGain) await this.init()
    await this.resume()
    if (!this.audioContext || !this.masterGain) return

    const time = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const vibrato = this.audioContext.createOscillator()
    const vibratoDepth = this.audioContext.createGain()
    const envelope = this.audioContext.createGain()
    oscillator.type = 'sine'
    vibrato.type = 'sine'
    vibrato.frequency.value = 5.5
    vibratoDepth.gain.value = 8
    oscillator.frequency.setValueAtTime(direction === 'up' ? 520 : 1250, time)
    oscillator.frequency.exponentialRampToValueAtTime(direction === 'up' ? 1250 : 520, time + 0.32)
    envelope.gain.setValueAtTime(0.001, time)
    envelope.gain.exponentialRampToValueAtTime(0.18, time + 0.02)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.36)
    vibrato.connect(vibratoDepth).connect(oscillator.frequency)
    oscillator.connect(envelope).connect(this.masterGain)
    vibrato.start(time)
    oscillator.start(time)
    vibrato.stop(time + 0.36)
    oscillator.stop(time + 0.36)
  }

  async playRankedMoveWhistle(kind: 'best' | 'worst') {
    if (!this.audioContext || !this.masterGain) await this.init()
    await this.resume()
    if (!this.audioContext || !this.masterGain) return

    const time = this.audioContext.currentTime
    const duration = kind === 'best' ? 0.22 : 0.48
    // The best cue starts at the end of the Best moves click and rises a third.
    // The worst cue reverses the Worst moves click and climbs two further thirds.
    const start = kind === 'best' ? 1250 : 520
    const end = kind === 'best' ? 1250 * Math.pow(2, 4 / 12) : 1250 * Math.pow(2, 8 / 12)
    const oscillator = this.audioContext.createOscillator()
    const vibrato = this.audioContext.createOscillator()
    const vibratoDepth = this.audioContext.createGain()
    const envelope = this.audioContext.createGain()
    oscillator.type = 'sine'
    vibrato.type = 'sine'
    vibrato.frequency.value = 5.5
    vibratoDepth.gain.value = 8
    oscillator.frequency.setValueAtTime(start, time)
    oscillator.frequency.exponentialRampToValueAtTime(end, time + duration - 0.04)
    envelope.gain.setValueAtTime(0.001, time)
    envelope.gain.exponentialRampToValueAtTime(0.16, time + 0.02)
    envelope.gain.exponentialRampToValueAtTime(0.001, time + duration)
    vibrato.connect(vibratoDepth).connect(oscillator.frequency)
    oscillator.connect(envelope).connect(this.masterGain)
    vibrato.start(time)
    oscillator.start(time)
    vibrato.stop(time + duration)
    oscillator.stop(time + duration)
  }

  async playPieceSample(square: string, pieceType: string, pieceColor: "w" | "b", _isPreview: boolean = true) {
    if (!this.audioContext || !this.masterGain) await this.init()
    if (!this.audioContext) return

    const effects = this.squareEffects[square]
    const pattern = this.currentPattern
    const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
    const fileIndex = files.indexOf(square[0])
    const rankIndex = parseInt(square[1] || "1", 10) - 1

    const now = this.audioContext.currentTime

    let gain = 0.6
    let pan = 0
    let pitch = 1
    let delay = 0
    let reverb = 0
    let lpf: number | undefined = undefined
    let hpf: number | undefined = undefined

    if (effects) {
      gain = (effects.gain ?? 1) * gain
      pan = effects.pan ?? 0
      pitch = effects.pitch ?? 1
      delay = effects.delay ?? 0
      reverb = effects.reverb ?? 0
      lpf = effects.lpf
      hpf = effects.hpf
    }

    switch (pieceType) {
      case "p":
        if (pattern && pattern.cityId === "vienna" && pattern.scale && pattern.scale.length > 0) {
          const degree = fileIndex >= 0 ? fileIndex % 7 : 0
          const noteName = pattern.scale[degree] || "C4"
          const baseFreq = noteToFrequency(noteName)
          const freq = baseFreq * pitch
          this.playPawn(now, "violin_pizz", gain, pan, pieceColor, pitch, delay, reverb, freq, lpf, hpf)
        } else {
          const drumSamples = ["bd", "sd", "hh", "cp", "mt", "ht", "lt", "cy"]
          const sample = fileIndex >= 0 ? drumSamples[fileIndex % drumSamples.length] : "bd"
          this.playPawn(now, sample, gain, pan, pieceColor, pitch, delay, reverb, undefined, lpf, hpf)
        }
        break
      case "n":
        if (pattern && pattern.scale && pattern.scale.length > 0) {
          const scaleLen = pattern.scale.length
          const idx = (fileIndex >= 0 && rankIndex >= 0) ? (fileIndex + rankIndex * 2) % scaleLen : 0
          const noteName = pattern.scale[idx].replace(/[0-9]/, "2")
          const baseFreq = noteToFrequency(noteName)
          const freq = baseFreq * pitch
          const adsr: [number, number, number, number] = [0.1, 0.2, 1.0, 0.1]
          this.playAcousticBass(now, freq, gain, pan, adsr, 0.5, delay, reverb, lpf, hpf)
        } else {
          this.playBass(now, 110 * pitch, 600, 5, gain, [0.1, 0.2, 0.8, 0.8], delay, reverb, lpf, hpf)
        }
        break
      case "b": {
        const activeScale =
          pattern && pattern.scale && pattern.scale.length > 0
            ? pattern.scale
            : ["C4", "Eb4", "F4", "G4", "Bb4"]
        const chordIndices = [0, 2, 4]
        const noteIndex = fileIndex >= 0 ? chordIndices[fileIndex % chordIndices.length] : 0
        const rootName = activeScale[noteIndex % activeScale.length]
        const rootFreq = noteToFrequency(rootName) / 2
        const n1 = rootFreq * pitch
        const n2 = rootFreq * 1.25 * pitch
        const n3 = rootFreq * 1.5 * pitch
        this.playPiano(now, [n1, n2, n3], gain * 0.4, pan, null, delay, reverb, lpf, hpf)
        break
      }
      case "r":
        if (pattern && pattern.scale && pattern.scale.length > 0) {
          const chordNotes = pattern.scale.slice(0, 3).map((n) => noteToFrequency(n) * pitch)
          if (pattern.cityId === "vienna") {
            this.playStringPad(now, chordNotes, gain * 0.8, pan, delay, reverb, lpf, hpf)
          } else {
            this.playPad(now, chordNotes, pan, gain * 0.8, [0.5, 0.5, 0.8, 0.8], delay, reverb, lpf, hpf)
          }
        } else {
          this.playPad(now, [220 * pitch, 330 * pitch, 440 * pitch], pan, gain * 0.8, [0.5, 0.5, 0.8, 0.8], delay, reverb, lpf, hpf)
        }
        break
      case "q":
        if (pattern) {
          const offset = fileIndex >= 0 && rankIndex >= 0 ? (fileIndex + rankIndex) % 5 : 0
          const ratio = Math.pow(2, offset / 12)
          let c2 = noteToFrequency("c2") * ratio * pitch
          if (pattern.cityId === "vienna") {
            c2 *= 4
            this.playViolinLegato(now, c2, gain, pan, delay, reverb, lpf, hpf)
          } else {
            const freq = c2
            this.playQueenRandom(now, freq, gain, pan, delay, reverb, lpf, hpf)
          }
        } else {
          this.playLead6Voice(now, 440 * pitch, gain, pan, delay, reverb, lpf, hpf)
        }
        break
      case "k":
        this.playTimpani(now, gain, pan, delay, reverb, lpf, hpf)
        break
      default:
        this.playPawn(now, "bd", gain, pan, pieceColor, pitch, delay, reverb, undefined, lpf, hpf)
    }
  }

  async playSquareSample(square: string) {
    if (!this.audioContext || !this.masterGain) await this.init()
    if (!this.audioContext) return

    const sample = this.squareSamples[square] || "bd"
    const effects = this.squareEffects[square]
    const now = this.audioContext.currentTime

    // Default params
    let gain = 0.5
    let pan = 0
    let pitch = 1
    
    // Apply saved effects if any
    let delay = 0
    let reverb = 0
    let lpf: number | undefined = undefined
    let hpf: number | undefined = undefined

    if (effects) {
      gain = (effects.gain ?? 1) * 0.5
      pan = effects.pan ?? 0
      pitch = effects.pitch ?? 1
      delay = effects.delay ?? 0
      reverb = effects.reverb ?? 0
      lpf = effects.lpf
      hpf = effects.hpf
    }

    this.playPawn(now, sample, gain, pan, "w", pitch, delay, reverb, undefined, lpf, hpf) // Using "w" as default color, adding pitch param
  }

  async start() {
    if (!this.isInitialized || !this.currentPattern) return
    await this.resume()

    this.isPlaying = true
    this.currentStep = 0

    // Schedule ahead for smoother playback
    this.intervalId = window.setInterval(() => this.scheduleLoop(), this.stepTime * 1000)
    this.scheduleLoop() // Play immediately
  }

  private scheduleLoop() {
    if (!this.isPlaying || !this.currentPattern || !this.audioContext) return

    const now = this.audioContext.currentTime

    // Schedule sounds for current step
    this.playStep(this.currentStep, now)

    this.currentStep = (this.currentStep + 1) % 16
  }

  stop() {
    this.isPlaying = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    // Stop all scheduled nodes
    this.scheduledNodes.forEach((node) => {
      try {
        node.stop()
      } catch {
        // Node may have already stopped
      }
    })
    this.scheduledNodes = []
  }

  async startAmbience(scale: string[], cityId: string) {
    if (!this.audioContext) await this.init()
    if (!this.audioContext || !this.masterGain) return
    await this.resume()

    // Stop existing ambience
    this.stopAmbience()

    this.ambienceGain = this.audioContext.createGain()
    this.ambienceGain.gain.value = 0.03 // Lower volume as requested
    this.ambienceGain.connect(this.masterGain)

    // Ambience Settings based on City
    let wave1: OscillatorType = "triangle"
    let wave2: OscillatorType = "sine"
    let filterFreq = 200

    switch (cityId) {
      case "nyc": // Gritty
        wave1 = "sawtooth"
        wave2 = "square"
        filterFreq = 150
        break
      case "london": // Dark
        wave1 = "sine"
        wave2 = "sawtooth"
        filterFreq = 100
        break
      case "tokyo": // Neon
        wave1 = "square"
        wave2 = "sine"
        filterFreq = 400
        break
      case "paris": // Smooth
        wave1 = "sine"
        wave2 = "triangle"
        filterFreq = 300
        break
      case "berlin": // Cold
        wave1 = "sawtooth"
        wave2 = "sawtooth"
        filterFreq = 80
        break
      default:
        wave1 = "triangle"
        wave2 = "sine"
    }

    const rootNote = noteToFrequency(scale[0])
    const fifthNote = noteToFrequency(scale[4] || scale[0])

    // Drone 1
    const osc1 = this.audioContext.createOscillator()
    osc1.type = wave1
    osc1.frequency.value = rootNote / 2

    // Lowpass filter for drone
    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = filterFreq
    this.ambienceFilter = filter

    // Drone 2
    const osc2 = this.audioContext.createOscillator()
    osc2.type = wave2
    osc2.frequency.value = fifthNote / 2

    // Store base frequencies for pitch shifting
    this.ambienceBaseFreqs = [rootNote / 2, fifthNote / 2]
    
    // Apply current pitch multiplier
    osc1.frequency.value = this.ambienceBaseFreqs[0] * this.ambiencePitchMultiplier
    osc2.frequency.value = this.ambienceBaseFreqs[1] * this.ambiencePitchMultiplier

    // LFO for movement (Unique speed per city)
    const lfo = this.audioContext.createOscillator()
    lfo.frequency.value = 0.1 + (cityId.length * 0.02)
    this.ambienceLfo = lfo
    
    const lfoGain = this.audioContext.createGain()
    lfoGain.gain.value = 10

    lfo.connect(lfoGain)
    lfoGain.connect(osc1.frequency)

    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(this.ambienceGain)

    osc1.start()
    osc2.start()
    lfo.start()

    this.ambienceNodes = [osc1, osc2, lfo]
    this.ambienceOscillators = [osc1, osc2]
  }

  stopAmbience() {
    this.ambienceNodes.forEach(node => {
      try {
        node.stop()
      } catch (error) {
        void error
      }
    })
    this.ambienceNodes = []
    this.ambienceOscillators = []
    this.ambienceFilter = null
    this.ambienceLfo = null
    this.ambienceBaseFreqs = []
    
    if (this.ambienceGain) {
      this.ambienceGain.disconnect()
      this.ambienceGain = null
    }
  }

  private playStep(step: number, time: number) {
    if (!this.currentPattern || !this.audioContext || !this.masterGain) return

    const { kick, snare, hihat, bass, pad, lead, pawns, bishops, queens, knights, kings, rooks, effects, swing } = this.currentPattern

    // Apply Swing: delay off-beat 16th notes
    const swingDelay = (step % 2 !== 0) ? (swing || 0) * (this.stepTime / 3) : 0
    const triggerTime = time + swingDelay

    // Humanize: tiny random offset (0-10ms)
    const humanize = () => (Math.random() * 0.01)

    // Helper: Stochastic trigger
    const shouldPlay = (prob: number = 1) => Math.random() <= (prob ?? 1)

    // Kick (Legacy/Fallback)
    if (kick && kick.pattern[step % 16] && shouldPlay(kick.probability)) {
      this.playKick(triggerTime + humanize(), kick.gain, 0)
    }

    // Snare (Legacy/Fallback)
    if (snare && snare.pattern[step % 16] && shouldPlay(snare.probability)) {
      this.playSnare(triggerTime + humanize(), snare.gain, 0)
    }

    // Hi-hat (Legacy/Fallback)
    if (hihat && hihat.pattern[step % (hihat.pattern.length || 16)] && shouldPlay(hihat.probability)) {
      this.playHihat(triggerTime + humanize() + (Math.random() * 0.02), hihat.gain, 0)
    }

    // PAWNS (New Drum Layers)
    if (pawns) {
      pawns.forEach(p => {
        if (p.pattern[step % (p.pattern.length || 16)]) {
          // Pass delay, reverb, pitch from pattern if available (populated by strudel-engine from squareEffects)
          const delay = p.delay || 0
          const reverb = p.reverb || 0
          const pitch = p.pitch || 1
          
          this.playPawn(triggerTime + humanize(), p.sample, p.gain, p.pan, p.color, pitch, delay, reverb, p.frequency, p.lpf, p.hpf)
        }
      })
    }

    // QUEENS (Synth or Darbuka)
    if (queens) {
      queens.forEach(q => {
        const freq = q.pattern[step % (q.pattern.length || 16)]
        if (freq && freq > 0) {
          if (q.sound === "darbuka") {
            this.playDarbuka(triggerTime, q.gain, q.pan, q.delay, q.reverb, q.lpf, q.hpf)
          } else if (q.sound === "gm_lead_6_voice") {
            this.playLead6Voice(triggerTime, freq, q.gain, q.pan, q.delay, q.reverb, q.lpf, q.hpf)
          } else if (q.sound === "gm_queen_random") {
            this.playQueenRandom(triggerTime, freq, q.gain, q.pan, q.delay, q.reverb, q.lpf, q.hpf)
          } else if (q.sound === "violin_legato") {
            this.playViolinLegato(triggerTime, freq, q.gain, q.pan, q.delay, q.reverb, q.lpf, q.hpf)
          } else {
            // Default Synth
            this.playBishop(triggerTime, freq, q.gain, q.pan, q.adsr, !!q.lfo, q.delay, "triangle", q.reverb, q.lpf, q.hpf)
          }
        }
      })
    }

    if (bishops) {
      bishops.forEach(b => {
        const patternLen = b.pattern.length || 16
        const rawNotes = b.pattern[step % patternLen]
        if (rawNotes !== null) {
          const notes = Array.isArray(rawNotes) ? rawNotes : [rawNotes]
          const velocity = (b.velocities && b.velocities[step % patternLen] !== null)
            ? (b.velocities[step % patternLen] as number)
            : 1
          this.playPiano(triggerTime, notes, b.gain * velocity * 0.4, b.pan, null, b.delay, b.reverb, b.lpf, b.hpf)
        }
      })
    }
    
    // KINGS (Now using Queen's Synth or Darbuka or Custom)
    if (kings) {
      kings.forEach(k => {
        const note = k.pattern[step % (k.pattern.length || 16)]
        if (note !== null) {
          if (k.sound === "darbuka") {
             this.playDarbuka(triggerTime, k.gain, k.pan, k.delay, k.reverb, k.lpf, k.hpf)
          } else if (k.sound === "gm_woodblock") {
             // Woodblock: high pitch, short decay
             this.playWoodblock(triggerTime, k.gain, k.pan, k.delay, k.reverb, k.lpf, k.hpf)
          } else if (k.sound === "gm_melodic_tom") {
             const notes = Array.isArray(note) ? note : [note]
             notes.forEach(n => {
                if (Number.isFinite(n)) {
                    // Transpose up if needed, C2 is low for toms, maybe OK for floor tom
                    // Multiply by 2 or 4 to bring into better tom range if needed
                    this.playMelodicTom(triggerTime, n * 2, k.gain, k.pan, k.delay, k.reverb, k.lpf, k.hpf)
                }
             })
          } else if (k.sound === "gm_acoustic_bass") {
             // Handle both single notes and chords (arrays)
             const notes = Array.isArray(note) ? note : [note]
             const adsr = (k as any).adsr || [0.1, 0, 0.2, 1.0]
             
             notes.forEach(n => {
                if (Number.isFinite(n)) {
                    this.playAcousticBass(triggerTime, n, k.gain, k.pan, adsr, (k as any).room || 0.5, k.delay, k.reverb, k.lpf, k.hpf)
                }
             })
          } else if (k.sound === "timpani") {
             const notes = Array.isArray(note) ? note : [note]
             notes.forEach(n => {
                if (Number.isFinite(n)) {
                    this.playTimpani(triggerTime, k.gain, k.pan, k.delay, k.reverb, k.lpf, k.hpf)
                }
             })
          } else if (k.sound === "synth") {
             // King using Queen's Synth - Match Queen's waveform cycling
             const waveforms: OscillatorType[] = ["sawtooth", "square", "triangle", "sine"]
             const waveform = waveforms[step % 4]
             const notes = Array.isArray(note) ? note : [note]
             notes.forEach(n => {
                 if (typeof n === 'number') {
                    this.playBishop(triggerTime, n, k.gain, k.pan, [0.01, 0.2, 1.25, 1.0], true, k.delay, waveform, k.reverb, k.lpf, k.hpf)
                 }
             })
          } else {
             const notes = Array.isArray(note) ? note : [note]
             notes.forEach(n => {
                 if (typeof n === 'number') {
                    this.playXylophone(triggerTime, n, k.gain, k.pan, k.delay, k.reverb, k.lpf, k.hpf)
                 }
             })
          }
        }
      })
    }

    // KNIGHTS (Acoustic Bass)
    if (knights) {
      knights.forEach(k => {
        const note = k.pattern[step % (k.pattern.length || 16)]
        if (note !== null && Number.isFinite(note)) {
          if (k.sound === "gm_acoustic_bass") {
            this.playAcousticBass(triggerTime, note, k.gain, k.pan, k.adsr, k.room, k.delay, k.reverb, k.lpf, k.hpf)
          } else if (k.sound === "brass_staccato") {
            this.playBrassStaccato(triggerTime, note, k.gain, k.pan, k.delay, k.reverb, k.lpf, k.hpf)
          } else {
             // Fallback
             this.playBass(triggerTime, note, 600, 5, k.gain, [0.1, 0.2, 0.8, 1.0], k.delay, k.reverb, k.lpf, k.hpf)
          }
        }
      })
    }

    // ROOKS (Pads)
    if (rooks) {
      rooks.forEach((r: any) => {
        const chord = r.pattern[step % (r.pattern.length || 16)]
        if (chord !== null && chord.length > 0) {
          if (r.sound === "string_pad") {
             this.playStringPad(triggerTime, chord, r.gain, r.pan, r.delay, r.reverb, r.lpf, r.hpf)
          } else {
             this.playPad(triggerTime, chord, r.pan, r.gain, [0.5, 0.5, 0.8, 1.0], r.delay, r.reverb, r.lpf, r.hpf)
          }
        }
      })
    }

    // Bass
    if (bass) {
      const bassNote = bass.pattern[step % 16]
      if (bassNote !== null && shouldPlay(bass.probability)) {
        this.playBass(triggerTime, bassNote, bass.cutoff, bass.resonance, bass.gain, bass.adsr)
      }
    }

    // Pad
    if (pad) {
      const padNotes = pad.pattern[step % 16]
      if (padNotes !== null && padNotes.length > 0 && shouldPlay(pad.probability)) {
        if (pad.sound === "string_pad") {
            this.playStringPad(triggerTime, padNotes, pad.gain, pad.pan, 0, pad.reverb, pad.lpf, pad.hpf)
        } else {
            this.playPad(triggerTime, padNotes, pad.pan, pad.gain, pad.adsr, 0, pad.reverb, pad.lpf, pad.hpf)
        }
      }
    }

    // Lead (Legacy/Fallback)
    if (lead) {
      const leadNote = lead.pattern[step % 16]
      if (leadNote !== null && shouldPlay(lead.probability)) {
        this.playLead(triggerTime, leadNote, effects.distort, lead.gain, lead.adsr, lead.detune, lead.delay || 0, 0)
      }
    }
  }

  playCheckmate() {
    if (!this.audioContext || !this.masterGain) return
    const time = this.audioContext.currentTime
    
    // "Ballwhistle" simulation: High pitch chirp sliding down
    const osc = this.audioContext.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(2000, time)
    osc.frequency.exponentialRampToValueAtTime(500, time + 0.1)
    osc.frequency.exponentialRampToValueAtTime(1500, time + 0.2)
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.4)

    const gain = this.audioContext.createGain()
    gain.gain.setValueAtTime(0.8 * 0.75, time)
    gain.gain.exponentialRampToValueAtTime(0.01 * 0.75, time + 0.4)

    // Pea (trill) effect
    const lfo = this.audioContext.createOscillator()
    lfo.type = "square"
    lfo.frequency.value = 50
    const lfoGain = this.audioContext.createGain()
    lfoGain.gain.value = 500
    
    lfo.connect(lfoGain)
    lfoGain.connect(osc.frequency)
    lfo.start(time)
    lfo.stop(time + 0.4)

    osc.connect(gain).connect(this.masterGain)
    osc.start(time)
    osc.stop(time + 0.4)
  }

  playEggLanding() {
    if (!this.audioContext || !this.masterGain || this.audioContext.state !== 'running') return
    const ctx = this.audioContext, time = ctx.currentTime
    const osc = ctx.createOscillator(), gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1100 + Math.random() * 180, time)
    osc.frequency.exponentialRampToValueAtTime(480, time + 0.09)
    gain.gain.setValueAtTime(0.12, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12)
    osc.connect(gain).connect(this.masterGain)
    osc.onended = () => { osc.disconnect(); gain.disconnect() }
    osc.start(time); osc.stop(time + 0.13)
  }

  playVictoryFanfare() {
    if (!this.audioContext || !this.masterGain) return
    const time = this.audioContext.currentTime
    const notes = [392, 493.88, 587.33, 783.99]
    const noteLength = 0.23
    const noteGap = 0.035
    const output = this.audioContext.createGain()
    output.gain.value = 0.65
    output.connect(this.masterGain)

    notes.forEach((frequency, index) => {
      const start = time + index * (noteLength + noteGap)
      const end = start + noteLength
      const envelope = this.audioContext!.createGain()
      const filter = this.audioContext!.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(1900, start)
      filter.Q.value = 0.7
      envelope.gain.setValueAtTime(0.0001, start)
      envelope.gain.exponentialRampToValueAtTime(0.55, start + 0.025)
      envelope.gain.setValueAtTime(0.43, start + 0.11)
      envelope.gain.exponentialRampToValueAtTime(0.0001, end)

      const brass = this.audioContext!.createOscillator()
      brass.type = 'sawtooth'
      brass.frequency.setValueAtTime(frequency, start)
      const body = this.audioContext!.createOscillator()
      body.type = 'triangle'
      body.frequency.setValueAtTime(frequency / 2, start)
      brass.connect(filter)
      body.connect(filter)
      filter.connect(envelope).connect(output)
      brass.start(start)
      body.start(start)
      brass.stop(end)
      body.stop(end)
    })

    const end = time + notes.length * (noteLength + noteGap)
    output.gain.setValueAtTime(0.65, time)
    output.gain.setTargetAtTime(0.0001, end, 0.08)
    window.setTimeout(() => {
      output.disconnect()
    }, 1500)
  }

  playDrawKalimba() {
    if (!this.audioContext || !this.masterGain) return
    const time = this.audioContext.currentTime

    const notes = [noteToFrequency("C5"), noteToFrequency("E5"), noteToFrequency("G5")]

    notes.forEach((freq, index) => {
      const osc = this.audioContext!.createOscillator()
      osc.type = "triangle"
      osc.frequency.value = freq

      const gain = this.audioContext!.createGain()
      const startTime = time + index * 0.08
      gain.gain.setValueAtTime(0, startTime)
      gain.gain.linearRampToValueAtTime(0.6, startTime + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35)

      const panner = this.audioContext!.createStereoPanner()
      panner.pan.value = -0.2 + index * 0.2

      osc.connect(gain).connect(panner)
      this.applyEffects(panner, 0.05, 0.4)

      osc.start(startTime)
      osc.stop(startTime + 0.4)
    })
  }

  playSeatbelt() {
    if (!this.audioContext || !this.masterGain) return
    const time = this.audioContext.currentTime
    
    // "Seatbelt" chime: Just the second note (C5)
    // E5 = 659.25 Hz, C5 = 523.25 Hz
    const note2 = 523.25
    
    // Play second note immediately (no delay)
    this.playPiano(time, [note2], 0.6 * 0.4, 0, undefined, 0, 0.4)
  }

  public playPiano(time: number, notes: number[], gain: number, pan: number, lfoType?: "siren" | "sine" | null, delayTime?: number, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan
    
    // Create an intermediate gain node for LFO modulation if needed
    const outputGain = this.audioContext.createGain()
    outputGain.gain.value = 1
    
    // Apply LFO (Siren/Sine) to Gain
    if (lfoType === "siren") {
        const lfo = this.audioContext.createOscillator()
        lfo.type = "sine"
        lfo.frequency.value = 2 // Slow siren
        const lfoAmp = this.audioContext.createGain()
        lfoAmp.gain.value = 0.5 // Depth
        
        lfo.connect(lfoAmp)
        lfoAmp.connect(outputGain.gain)
        
        lfo.start(time)
        lfo.stop(time + 1.5)
    }

    outputGain.connect(panner)

    this.applyEffects(panner, delayTime || 0, reverb, lpf, hpf)

    notes.forEach(freq => {
        // FM Piano-ish sound
        const osc = this.audioContext!.createOscillator()
        osc.type = "sine"
        osc.frequency.value = freq

        const mod = this.audioContext!.createOscillator()
        mod.type = "sine"
        mod.frequency.value = freq * 2
        
        const modGain = this.audioContext!.createGain()
        modGain.gain.setValueAtTime(freq * 0.5, time)
        modGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5)

        mod.connect(modGain)
        modGain.connect(osc.frequency)

        const gainNode = this.audioContext!.createGain()
        gainNode.gain.setValueAtTime(0, time)
        gainNode.gain.linearRampToValueAtTime(gain, time + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(gain * 0.6, time + 0.1)
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 1.5) // Long decay

        osc.connect(gainNode)
        gainNode.connect(outputGain) // Connect to outputGain instead of panner

        osc.start(time)
        osc.stop(time + 1.5)
        mod.start(time)
        mod.stop(time + 1.5)
    })
  }

  private playXylophone(time: number, freq: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    const osc = this.audioContext.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(freq, time)
    
    // Xylophone overtone (approx 3x freq)
    const overtone = this.audioContext.createOscillator()
    overtone.type = "sine"
    overtone.frequency.setValueAtTime(freq * 3, time)
    const overtoneGain = this.audioContext.createGain()
    overtoneGain.gain.value = 0.3

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain, time + 0.005) // Hard attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5) // Short decay

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    // Reverb/Room simulation (Short delay) - Now using applyEffects for reverb/delay
    
    osc.connect(gainNode)
    overtone.connect(overtoneGain).connect(gainNode)
    
    gainNode.connect(panner)
    
    this.applyEffects(panner, delay || 0.125, reverb || 0.4, lpf, hpf) // Default to previous values if not provided

    osc.start(time)
    osc.stop(time + 0.5)
    overtone.start(time)
    overtone.stop(time + 0.5)
  }

  private applyEffects(source: AudioNode, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.masterGain || !this.audioContext) return

    const distortAmount = this.currentPattern?.effects?.distort ?? 0
    let targetNode: AudioNode = this.masterGain

    if (distortAmount > 0) {
      const shaper = this.audioContext.createWaveShaper()
      const amount = 5 + distortAmount * 45
      shaper.curve = this.makeDistortionCurve(amount) as any
      shaper.oversample = "2x"
      shaper.connect(this.masterGain)
      targetNode = shaper
    }

    // Apply Filters (HPF/LPF)
    let processedSource = source
    
    if (hpf && hpf > 0) {
      const hpfNode = this.audioContext.createBiquadFilter()
      hpfNode.type = "highpass"
      hpfNode.frequency.value = hpf
      processedSource.connect(hpfNode)
      processedSource = hpfNode
    }

    if (lpf && lpf < 20000) {
      const lpfNode = this.audioContext.createBiquadFilter()
      lpfNode.type = "lowpass"
      lpfNode.frequency.value = lpf
      processedSource.connect(lpfNode)
      processedSource = lpfNode
    }

    processedSource.connect(targetNode)

    // Delay
    if (delay > 0) {
        const d = this.audioContext.createDelay()
        d.delayTime.value = Math.max(0.01, delay * 0.5)
        const f = this.audioContext.createGain()
        f.gain.value = 0.3
        
        processedSource.connect(d)
        d.connect(f)
        f.connect(d)
        d.connect(targetNode)
    }

    // Reverb (Simple Delay-based Room)
    if (reverb > 0) {
        const d1 = this.audioContext.createDelay()
        d1.delayTime.value = 0.03
        const d2 = this.audioContext.createDelay()
        d2.delayTime.value = 0.07
        
        const g = this.audioContext.createGain()
        g.gain.value = reverb * 0.4
        
        // Simple multi-tap
        processedSource.connect(d1)
        processedSource.connect(d2)
        d1.connect(g)
        d2.connect(g)
        g.connect(targetNode)
    }
  }

  private playPawn(time: number, sample: string, gain: number, pan: number, color?: "w" | "b", pitchMultiplier: number = 1, delay: number = 0, reverb: number = 0, frequency?: number, lpf?: number, hpf?: number, openHatDecay: number = 1) {
    if (!this.audioContext || !this.masterGain) return

    // Tweak sound based on color
    // Black = slightly lower pitch/more filtered for "darker" sound
    const pitchMod = (color === 'b' ? 0.8 : 1.0) * pitchMultiplier

    // Map sample names to synthesis functions
    switch (sample) {
      case "bd": this.playKick(time, gain, pan, delay, reverb, pitchMod, lpf, hpf); break;
      case "sd": this.playSnare(time, gain * (color === 'b' ? 0.8 : 1), pan, delay, reverb, pitchMod, lpf, hpf); break;
      case "hh": this.playHihat(time, gain, pan, delay, reverb, pitchMod, lpf, hpf); break;
      case "cp": this.playClap(time, gain, pan, delay, reverb, pitchMod, lpf, hpf); break;
      case "mt": this.playTom(time, gain, 200 * pitchMod, pan, delay, reverb, lpf, hpf); break;
      case "ht": this.playTom(time, gain, 300 * pitchMod, pan, delay, reverb, lpf, hpf); break;
      case "lt": this.playTom(time, gain, 100 * pitchMod, pan, delay, reverb, lpf, hpf); break;
      case "cy": this.playCymbal(time, gain, pan, delay, reverb, pitchMod, lpf, hpf); break;
      case "cb": this.playCowbell(time, gain, pan, pitchMod, delay, reverb, lpf, hpf); break;
      case "oh": this.playOpenHihat(time, gain, pan, delay, reverb, pitchMod, lpf, hpf, openHatDecay); break;
      case "ch": this.playHihat(time, gain, pan, delay, reverb, pitchMod, lpf, hpf); break;
      case "lc": this.playConga(time, gain, 150 * pitchMod, pan, delay, reverb, lpf, hpf); break;
      case "mc": this.playConga(time, gain, 250 * pitchMod, pan, delay, reverb, lpf, hpf); break;
      case "hc": this.playConga(time, gain, 400 * pitchMod, pan, delay, reverb, lpf, hpf); break;
      case "rim": this.playRimshot(time, gain, pan, delay, reverb, pitchMod, lpf, hpf); break;
      case "violin_pizz":
        // Frequency should be passed in p.frequency (which comes from p.pitch/note)
        // If not, we can infer from pitchMultiplier relative to A4? No, better to use frequency param.
        // But playPawn signature needs frequency.
        if (frequency) {
             this.playViolinPizz(time, gain, pan, frequency / 220, delay, reverb, lpf, hpf) // playViolinPizz takes pitch ratio relative to A3(220)
        }
        break;
      default: this.playKick(time, gain, pan, delay, reverb, pitchMod, lpf, hpf);
    }
  }

  private playCowbell(time: number, gain: number, pan: number, pitch: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    const osc1 = this.audioContext.createOscillator()
    const osc2 = this.audioContext.createOscillator()
    osc1.type = "square"
    osc2.type = "square"
    osc1.frequency.value = 800 * pitch
    osc2.frequency.value = 540 * pitch
    
    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(gain, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1)
    
    const filter = this.audioContext.createBiquadFilter()
    filter.type = "bandpass"
    filter.frequency.value = 1000 * pitch
    
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan
    
    osc1.connect(filter)
    osc2.connect(filter)
    filter.connect(gainNode).connect(panner)
    
    this.applyEffects(panner, delay, reverb, lpf, hpf)
    
    osc1.start(time); osc1.stop(time + 0.1)
    osc2.start(time); osc2.stop(time + 0.1)
  }

  private playRimshot(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, pitch: number = 1, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    
    // High pitched sine + noise
    const osc = this.audioContext.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(800 * pitch, time)
    osc.frequency.exponentialRampToValueAtTime(100 * pitch, time + 0.05)
    
    const oscGain = this.audioContext.createGain()
    oscGain.gain.setValueAtTime(gain * 0.6, time)
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05)
    
    // Noise
    const bufferSize = this.audioContext.sampleRate * 0.05
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    
    const noise = this.audioContext.createBufferSource()
    noise.buffer = buffer
    
    const noiseFilter = this.audioContext.createBiquadFilter()
    noiseFilter.type = "highpass"
    noiseFilter.frequency.value = 2000 * pitch
    
    const noiseGain = this.audioContext.createGain()
    noiseGain.gain.setValueAtTime(gain * 0.4, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.03)
    
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan
    
    osc.connect(oscGain).connect(panner)
    noise.connect(noiseFilter).connect(noiseGain).connect(panner)
    
    this.applyEffects(panner, delay, reverb, lpf, hpf)
    
    osc.start(time); osc.stop(time + 0.05)
    noise.start(time); noise.stop(time + 0.05)
  }

  private playOpenHihat(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, pitch: number = 1, lpf?: number, hpf?: number, decay: number = 1) {
    if (!this.audioContext || !this.masterGain) return
    const duration = Math.max(0.05, 0.3 * decay)
    const bufferSize = Math.ceil(this.audioContext.sampleRate * duration)
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    
    const noise = this.audioContext.createBufferSource()
    noise.buffer = buffer
    const filter = this.audioContext.createBiquadFilter()
    filter.type = "highpass"; filter.frequency.value = 7000 * pitch
    
    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(gain * 0.3, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration)
    
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan
    
    noise.connect(filter).connect(gainNode).connect(panner)
    
    this.applyEffects(panner, delay, reverb, lpf, hpf)
    
    noise.start(time)
  }

  private playConga(time: number, gain: number, freq: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    this.playTom(time, gain, freq, pan, delay, reverb, lpf, hpf) 
  }

  private playClap(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, pitch: number = 1, lpf?: number, hpf?: number) {
     if (!this.audioContext || !this.masterGain) return
     // Simple clap synthesis
     const bufferSize = this.audioContext.sampleRate * 0.1
     const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
     const data = buffer.getChannelData(0)
     for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1)
     
     const noise = this.audioContext.createBufferSource()
     noise.buffer = buffer
     const filter = this.audioContext.createBiquadFilter()
     filter.type = "bandpass"; filter.frequency.value = 1200 * pitch; filter.Q.value = 1
     
     const gainNode = this.audioContext.createGain()
     gainNode.gain.setValueAtTime(0, time)
     gainNode.gain.linearRampToValueAtTime(gain, time + 0.01)
     gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1)

     const panner = this.audioContext.createStereoPanner()
     panner.pan.value = pan

     noise.connect(filter).connect(gainNode).connect(panner)
     
     this.applyEffects(panner, delay, reverb, lpf, hpf)
     
     noise.start(time)
  }

  private playTom(time: number, gain: number, freq: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
     if (!this.audioContext || !this.masterGain) return
     const osc = this.audioContext.createOscillator()
     osc.type = "sine"
     osc.frequency.setValueAtTime(freq, time)
     osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.2)

     const gainNode = this.audioContext.createGain()
     gainNode.gain.setValueAtTime(gain, time)
     gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2)

     const panner = this.audioContext.createStereoPanner()
     panner.pan.value = pan

     osc.connect(gainNode).connect(panner)
     
     this.applyEffects(panner, delay, reverb, lpf, hpf)
     
     osc.start(time); osc.stop(time + 0.3)
  }

  private playCymbal(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, pitch: number = 1, lpf?: number, hpf?: number) {
     // Re-using hihat logic but longer
     if (!this.audioContext || !this.masterGain) return
     const bufferSize = this.audioContext.sampleRate * 0.5
     const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
     const data = buffer.getChannelData(0)
     for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1)
     
     const noise = this.audioContext.createBufferSource()
     noise.buffer = buffer
     const filter = this.audioContext.createBiquadFilter()
     filter.type = "highpass"; filter.frequency.value = 5000 * pitch
     
     const gainNode = this.audioContext.createGain()
     gainNode.gain.setValueAtTime(gain * 0.5, time)
     gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5)

     const panner = this.audioContext.createStereoPanner()
     panner.pan.value = pan

     noise.connect(filter).connect(gainNode).connect(panner)
     
     this.applyEffects(panner, delay, reverb, lpf, hpf)
     
     noise.start(time)
  }

  private playDarbuka(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    
    // Darbuka / Doumbek synthesis (Membrane + Shell resonance)
    
    // 1. "Doum" (Low thud)
    const oscLow = this.audioContext.createOscillator()
    oscLow.type = "sine"
    oscLow.frequency.setValueAtTime(80, time)
    oscLow.frequency.exponentialRampToValueAtTime(40, time + 0.1)
    
    const gainLow = this.audioContext.createGain()
    gainLow.gain.setValueAtTime(gain, time)
    gainLow.gain.exponentialRampToValueAtTime(0.01, time + 0.15)
    
    // 2. "Tek" (High sharp hit) - Layered noise + high sine
    const oscHigh = this.audioContext.createOscillator()
    oscHigh.type = "triangle"
    oscHigh.frequency.setValueAtTime(400, time)
    oscHigh.frequency.exponentialRampToValueAtTime(200, time + 0.05)
    
    const gainHigh = this.audioContext.createGain()
    gainHigh.gain.setValueAtTime(gain * 0.5, time)
    gainHigh.gain.exponentialRampToValueAtTime(0.01, time + 0.05)
    
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan
    
    oscLow.connect(gainLow).connect(panner)
    oscHigh.connect(gainHigh).connect(panner)
    
    this.applyEffects(panner, delay, reverb, lpf, hpf)
    
    oscLow.start(time); oscLow.stop(time + 0.2)
    oscHigh.start(time); oscHigh.stop(time + 0.1)
  }

  private playWoodblock(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    
    // Woodblock: High pitch sine/square mix with very fast decay
    const osc = this.audioContext.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(800, time)
    
    const osc2 = this.audioContext.createOscillator()
    osc2.type = "square"
    osc2.frequency.setValueAtTime(1200, time) // Overtone
    
    const gain2 = this.audioContext.createGain()
    gain2.gain.value = 0.2

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain, time + 0.001)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05) // Short click
    
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan
    
    osc.connect(gainNode)
    osc2.connect(gain2).connect(gainNode)
    gainNode.connect(panner)
    
    this.applyEffects(panner, delay, reverb, lpf, hpf)
    
    osc.start(time); osc.stop(time + 0.1)
    osc2.start(time); osc2.stop(time + 0.1)
  }

  private playMelodicTom(time: number, freq: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    
    const osc = this.audioContext.createOscillator()
    osc.type = "sine"
    osc.frequency.setValueAtTime(freq, time)
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, time + 0.2) // Pitch dive
    
    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain, time + 0.005)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3)
    
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan
    
    osc.connect(gainNode).connect(panner)
    
    this.applyEffects(panner, delay, reverb, lpf, hpf)
    
    osc.start(time); osc.stop(time + 0.4)
  }

  private playHoofBeats(time: number, gain: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    const step = 0.09
    const pans = [-0.3, 0.2, -0.1, 0.3]
    for (let i = 0; i < pans.length; i++) {
      this.playWoodblock(time + i * step, gain, pans[i], delay, reverb + 0.05, lpf, hpf)
    }
  }

  private playAcousticBass(time: number, freq: number, gain: number, pan: number, adsr: [number, number, number, number], roomAmount: number = 0.3, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    const [att, dec, sus, rel] = adsr
    
    // Acoustic Bass Synthesis:
    // Sine + Triangle mixture with pluck envelope
    
    const osc1 = this.audioContext.createOscillator()
    osc1.type = "triangle" // Body
    osc1.frequency.value = freq
    
    const osc2 = this.audioContext.createOscillator()
    osc2.type = "sine" // Fundamental
    osc2.frequency.value = freq
    
    // Pluck noise
    const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 0.05, this.audioContext.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = this.audioContext.createBufferSource()
    noise.buffer = noiseBuffer
    const noiseGain = this.audioContext.createGain()
    noiseGain.gain.setValueAtTime(gain * 0.3, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.02)
    
    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain, time + att)
    gainNode.gain.exponentialRampToValueAtTime(gain * sus, time + att + dec)
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + att + dec + rel)
    
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan
    
    gainNode.connect(panner)

    // Combine roomAmount with reverb argument, or treat separately?
    // roomAmount was used as "room size" in previous implementation (gain).
    // Let's use max of both or sum?
    // User requested applyEffects logic.
    // I'll use applyEffects.
    this.applyEffects(panner, delay, Math.max(reverb, roomAmount), lpf, hpf)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    noise.connect(noiseGain).connect(gainNode)
    
    osc1.start(time); osc1.stop(time + att + dec + rel + 1)
    osc2.start(time); osc2.stop(time + att + dec + rel + 1)
    noise.start(time)
  }

  // Modified to support waveform selection
  private playBishop(time: number, note: number, gain: number, pan: number, adsr: [number, number, number, number], lfo: boolean, delayTime: number = 0, waveform: OscillatorType = "triangle", reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    const [att, dec, sus, rel] = adsr
    
    const osc = this.audioContext.createOscillator()
    osc.type = waveform
    
    // Safety check for finite frequency
    if (Number.isFinite(note) && note > 0) {
        osc.frequency.value = note
    } else {
        // Fallback to avoid error
        osc.frequency.value = 440
    }

    const gainNode = this.audioContext.createGain()
    
    // Envelope
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain, time + att)
    gainNode.gain.exponentialRampToValueAtTime(gain * sus, time + att + dec)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + att + dec + rel)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    // LFO effect if enabled (for Bishops as requested)
    if (lfo) {
        const lfoOsc = this.audioContext.createOscillator()
        lfoOsc.frequency.value = 4 // 4Hz Tremolo
        
        const lfoGain = this.audioContext.createGain()
        lfoGain.gain.value = 0.3 // Tremolo depth
        
        const tremoloGain = this.audioContext.createGain()
        tremoloGain.gain.value = 1
        
        lfoOsc.connect(lfoGain)
        lfoGain.connect(tremoloGain.gain)
        
        // Re-route through tremolo
        gainNode.disconnect()
        gainNode.connect(tremoloGain)
        tremoloGain.connect(panner)
        
        lfoOsc.start(time)
        lfoOsc.stop(time + att + dec + rel + 0.1)
    } else {
        gainNode.connect(panner)
    }

    this.applyEffects(panner, delayTime, reverb, lpf, hpf)

    osc.connect(gainNode)
    osc.start(time)
    osc.stop(time + att + dec + rel + 0.1)
  }

  private playQueenRandom(time: number, freq: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    // wchoose(["sine",10], ["triangle",1], ["bd:6",1])
    // Weights: 10 (sine), 1 (triangle), 1 (bd) -> Total 12
    const rand = Math.random() * 12
    
    if (rand < 10) {
        // Sine: High weight
        this.playBishop(time, freq, gain, pan, [0.01, 0.1, 0.5, 0.5], false, delay, "sine", reverb, lpf, hpf)
    } else if (rand < 11) {
        // Triangle: Low weight
        this.playBishop(time, freq, gain, pan, [0.01, 0.1, 0.5, 0.5], false, delay, "triangle", reverb, lpf, hpf)
    } else {
        // BD:6 (Bass Drum): Low weight
        // Using playKick. Pitch multiplier 1.0.
        // We might want to use freq to tune the kick, but kicks are usually fixed pitch.
        // However, to respect "notes", we can try to tune it? 
        // playKick uses pitch multiplier. 
        // Let's just play a standard kick as requested "bd:6".
        this.playKick(time, gain * 1.5, pan, delay, reverb, 1, lpf, hpf) 
    }
  }

  private playLead6Voice(time: number, freq: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    // "Voice" Lead: 2 detuned sawtooths + 1 square + filter sweep
    const osc1 = this.audioContext.createOscillator()
    osc1.type = "sawtooth"
    osc1.frequency.value = freq
    osc1.detune.value = -12

    const osc2 = this.audioContext.createOscillator()
    osc2.type = "sawtooth"
    osc2.frequency.value = freq
    osc2.detune.value = 12

    const osc3 = this.audioContext.createOscillator()
    osc3.type = "square"
    osc3.frequency.value = freq
    
    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.Q.value = 5
    filter.frequency.setValueAtTime(freq * 1.5, time)
    filter.frequency.exponentialRampToValueAtTime(freq * 3, time + 0.2) // "Wah"
    filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.5)

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain * 0.25, time + 0.1) // Soft attack
    gainNode.gain.exponentialRampToValueAtTime(gain * 0.2, time + 0.3)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.8)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    osc1.connect(filter)
    osc2.connect(filter)
    osc3.connect(filter)
    filter.connect(gainNode).connect(panner)

    this.applyEffects(panner, delay, reverb, lpf, hpf)

    osc1.start(time); osc1.stop(time + 0.8)
    osc2.start(time); osc2.stop(time + 0.8)
    osc3.start(time); osc3.stop(time + 0.8)
  }

  private playKick(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, pitch: number = 1, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    const osc = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(150 * pitch, time)
    osc.frequency.exponentialRampToValueAtTime(40 * pitch, time + 0.1)

    gainNode.gain.setValueAtTime(gain * 0.8, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    osc.connect(gainNode)
    gainNode.connect(panner)

    this.applyEffects(panner, delay, reverb, lpf, hpf)

    osc.start(time)
    osc.stop(time + 0.3)
    this.scheduledNodes.push(osc)
  }

  private playSnare(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, pitch: number = 1, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    // Noise component
    const bufferSize = this.audioContext.sampleRate * 0.16
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.audioContext.createBufferSource()
    noise.buffer = buffer

    const noiseFilter = this.audioContext.createBiquadFilter()
    noiseFilter.type = "bandpass"
    noiseFilter.frequency.value = 2400 * pitch
    noiseFilter.Q.value = 0.65

    const noiseGain = this.audioContext.createGain()
    noiseGain.gain.setValueAtTime(0.0001, time)
    noiseGain.gain.exponentialRampToValueAtTime(gain * 0.58, time + 0.002)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.14)

    // Tone component
    const osc = this.audioContext.createOscillator()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(190 * pitch, time)
    osc.frequency.exponentialRampToValueAtTime(125 * pitch, time + 0.045)

    const oscGain = this.audioContext.createGain()
    oscGain.gain.setValueAtTime(gain * 0.22, time)
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.075)

    // A quiet upper shell mode gives the hit a little wooden body without the synthetic tom-like thud.
    const shellMode = this.audioContext.createOscillator()
    shellMode.type = "sine"
    shellMode.frequency.setValueAtTime(355 * pitch, time)
    shellMode.frequency.exponentialRampToValueAtTime(245 * pitch, time + 0.04)
    const shellGain = this.audioContext.createGain()
    shellGain.gain.setValueAtTime(gain * 0.075, time)
    shellGain.gain.exponentialRampToValueAtTime(0.001, time + 0.055)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(panner)

    osc.connect(oscGain)
    oscGain.connect(panner)
    shellMode.connect(shellGain)
    shellGain.connect(panner)

    this.applyEffects(panner, delay, reverb, lpf, hpf)

    noise.start(time)
    osc.start(time)
    shellMode.start(time)
    noise.stop(time + 0.2)
    osc.stop(time + 0.1)
    shellMode.stop(time + 0.06)

    this.scheduledNodes.push(noise, osc, shellMode)
  }

  private playHihat(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, pitch: number = 1, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    const bufferSize = this.audioContext.sampleRate * 0.05
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.audioContext.createBufferSource()
    noise.buffer = buffer

    const filter = this.audioContext.createBiquadFilter()
    filter.type = "highpass"
    filter.frequency.value = 7000 * pitch

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(gain * 0.3, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(panner)

    this.applyEffects(panner, delay, reverb, lpf, hpf)

    noise.start(time)
    noise.stop(time + 0.05)
    this.scheduledNodes.push(noise)
  }

  private playBass(time: number, note: number, cutoff: number, resonance: number, gain: number, adsr: [number, number, number, number], delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    const [att, dec, sus, rel] = adsr
    // Duration inferred from pattern for now, but ADSR controls shape

    const osc = this.audioContext.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.value = note

    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = cutoff
    filter.Q.value = resonance

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain * 0.5, time + att)
    const targetGain = Math.max(gain * sus * 0.5, 0.001)
    gainNode.gain.exponentialRampToValueAtTime(targetGain, time + att + dec)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + att + dec + rel)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = 0 // Bass usually center, but could expose pan

    osc.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(panner)

    this.applyEffects(panner, delay, reverb, lpf, hpf)

    osc.start(time)
    osc.stop(time + att + dec + rel + 0.1)
    this.scheduledNodes.push(osc)
  }

  private playPad(time: number, notes: number[], pan: number, gain: number, adsr: [number, number, number, number], delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    const [att, dec, sus, rel] = adsr
    const duration = 2 // Fixed approximate bar duration for pads
    const gainNode = this.audioContext.createGain()

    // ADSR Envelope
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain * 0.2, time + att)
    const targetGain = Math.max(gain * sus * 0.2, 0.001)
    gainNode.gain.exponentialRampToValueAtTime(targetGain, time + att + dec)
    gainNode.gain.linearRampToValueAtTime(0.01, time + duration + rel) // Release

    // Pan node
    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    notes.forEach((freq, i) => {
      const osc = this.audioContext!.createOscillator()
      osc.type = "sine"
      osc.frequency.value = freq
      osc.detune.value = (i - notes.length / 2) * 10

      osc.connect(gainNode)
      osc.start(time)
      osc.stop(time + duration + rel + 0.5)
      this.scheduledNodes.push(osc)
    })

    gainNode.connect(panner)
    
    // Apply effects
    this.applyEffects(panner, delay, reverb, lpf, hpf)
  }

  private playLead(time: number, note: number, distort: number, gain: number, adsr: [number, number, number, number], detune: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return

    const [att, dec, sus, rel] = adsr

    const osc = this.audioContext.createOscillator()
    osc.type = "square"
    osc.frequency.value = note
    osc.detune.value = detune

    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(2000, time)
    filter.frequency.exponentialRampToValueAtTime(500, time + att + dec)

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain * 0.4, time + att)
    const targetGain = Math.max(gain * sus * 0.4, 0.001)
    gainNode.gain.exponentialRampToValueAtTime(targetGain, time + att + dec)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + att + dec + rel)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = 0
    
    const useDistortion = distort > 0
    const target = useDistortion && this.audioContext ? this.audioContext.createWaveShaper() : null

    if (useDistortion && target) {
      const amount = 10 + distort * 90
      target.curve = this.makeDistortionCurve(amount) as any
      target.oversample = "4x"

      osc.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(target)
      target.connect(panner)
    } else {
      osc.connect(filter)
      filter.connect(gainNode)
      gainNode.connect(panner)
    }
    
    // Default effects for lead
    this.applyEffects(panner, delay, reverb, lpf, hpf)

    osc.start(time)
    osc.stop(time + att + dec + rel + 0.1)
    this.scheduledNodes.push(osc)
  }

  private playViolinPizz(time: number, gain: number, pan: number, pitch: number = 1, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    const osc = this.audioContext.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(220 * pitch, time)
    
    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(3000, time)
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.1)

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain, time + 0.005)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    osc.connect(filter).connect(gainNode).connect(panner)
    this.applyEffects(panner, delay, reverb, lpf, hpf)
    
    osc.start(time); osc.stop(time + 0.2)
  }

  private playBrassStaccato(time: number, freq: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.audioContext || !this.masterGain) return
    const osc = this.audioContext.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(freq, time)

    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(200, time)
    filter.frequency.exponentialRampToValueAtTime(freq * 4, time + 0.05)
    filter.frequency.exponentialRampToValueAtTime(freq, time + 0.2)

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(0, time)
    gainNode.gain.linearRampToValueAtTime(gain, time + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.15)

    const panner = this.audioContext.createStereoPanner()
    panner.pan.value = pan

    osc.connect(filter).connect(gainNode).connect(panner)
    this.applyEffects(panner, delay, reverb, lpf, hpf)

    osc.start(time); osc.stop(time + 0.2)
  }

  private playWoodwind(time: number, freq: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
     if (!this.audioContext || !this.masterGain) return
     const osc = this.audioContext.createOscillator()
     osc.type = "sine"
     osc.frequency.setValueAtTime(freq, time)

     const bufferSize = this.audioContext.sampleRate * 0.2
     const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
     const data = buffer.getChannelData(0)
     for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1
     const noise = this.audioContext.createBufferSource()
     noise.buffer = buffer
     const noiseFilter = this.audioContext.createBiquadFilter()
     noiseFilter.type = "bandpass"
     noiseFilter.frequency.value = freq * 1.5
     const noiseGain = this.audioContext.createGain()
     noiseGain.gain.value = gain * 0.1

     const gainNode = this.audioContext.createGain()
     gainNode.gain.setValueAtTime(0, time)
     gainNode.gain.linearRampToValueAtTime(gain, time + 0.05)
     gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3)

     const panner = this.audioContext.createStereoPanner()
     panner.pan.value = pan

     osc.connect(gainNode)
     noise.connect(noiseFilter).connect(noiseGain).connect(gainNode)
     gainNode.connect(panner)
     this.applyEffects(panner, delay, reverb, lpf, hpf)

     osc.start(time); osc.stop(time + 0.35)
     noise.start(time); noise.stop(time + 0.35)
  }

  private playStringPad(time: number, notes: number[], gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
     if (!this.audioContext || !this.masterGain) return
     
     const duration = 2.0
     const gainNode = this.audioContext.createGain()
     gainNode.gain.setValueAtTime(0, time)
     gainNode.gain.linearRampToValueAtTime(gain * 0.3, time + 0.5)
     gainNode.gain.linearRampToValueAtTime(0.01, time + duration)

     const panner = this.audioContext.createStereoPanner()
     panner.pan.value = pan

     notes.forEach(freq => {
         const osc = this.audioContext!.createOscillator()
         osc.type = "sawtooth"
         osc.frequency.value = freq
         osc.detune.value = (Math.random() - 0.5) * 10
         
         const filter = this.audioContext!.createBiquadFilter()
         filter.type = "lowpass"
         filter.frequency.value = 2000
         
         osc.connect(filter).connect(gainNode)
         osc.start(time)
         osc.stop(time + duration + 0.5)
     })
     
     gainNode.connect(panner)
     this.applyEffects(panner, delay, reverb, lpf, hpf)
  }

  private playViolinLegato(time: number, freq: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
      if (!this.audioContext || !this.masterGain) return
      const osc = this.audioContext.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.value = freq
      
      const lfo = this.audioContext.createOscillator()
      lfo.frequency.value = 5
      const lfoGain = this.audioContext.createGain()
      lfoGain.gain.value = 5
      lfo.connect(lfoGain).connect(osc.frequency)
      
      const filter = this.audioContext.createBiquadFilter()
      filter.type = "lowpass"
      filter.frequency.value = 4000
      
      const gainNode = this.audioContext.createGain()
      gainNode.gain.setValueAtTime(0, time)
      gainNode.gain.linearRampToValueAtTime(gain, time + 0.2)
      gainNode.gain.linearRampToValueAtTime(gain * 0.8, time + 0.5)
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 1.0)
      
      const panner = this.audioContext.createStereoPanner()
      panner.pan.value = pan
      
      osc.connect(filter).connect(gainNode).connect(panner)
      this.applyEffects(panner, delay, reverb, lpf, hpf)
      
      osc.start(time); osc.stop(time + 1.1)
      lfo.start(time); lfo.stop(time + 1.1)
  }

  private playTimpani(time: number, gain: number, pan: number, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
      if (!this.audioContext || !this.masterGain) return
      const osc = this.audioContext.createOscillator()
      osc.type = "sine"
      osc.frequency.setValueAtTime(120, time)
      osc.frequency.exponentialRampToValueAtTime(80, time + 0.3)
      
      const gainNode = this.audioContext.createGain()
      gainNode.gain.setValueAtTime(0, time)
      gainNode.gain.linearRampToValueAtTime(gain, time + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5)
      
      const panner = this.audioContext.createStereoPanner()
      panner.pan.value = pan
      
      osc.connect(gainNode).connect(panner)
      this.applyEffects(panner, delay, reverb, lpf, hpf)
      
      osc.start(time); osc.stop(time + 0.5)
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const samples = 44100
    const curve = new Float32Array(samples)
    const deg = Math.PI / 180
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x))
    }
    return curve
  }

  dispose() {
    this.stop()
    this.audioContext?.close()
  }
}

// Parsed pattern structure
export interface ParsedPattern {
  bpm: number
  swing: number // 0 to 1
  cityId?: string
  scale?: string[]
  
  // Layers
  pawns?: { sample: string; pattern: boolean[]; gain: number; pan: number; color: "w" | "b"; pitch?: number; frequency?: number; delay?: number; reverb?: number; decay?: number; sound?: "violin_pizz"; lpf?: number; hpf?: number }[]
  queens?: { pattern: (number | null)[]; gain: number; pan: number; adsr: [number, number, number, number]; sound: "synth" | "darbuka" | "gm_lead_6_voice" | "gm_queen_random" | "violin_legato"; lfo?: boolean; delay?: number; reverb?: number; decay?: number; lpf?: number; hpf?: number }[]
  bishops?: { pattern: (number | number[] | null)[]; velocities?: (number | null)[]; gain: number; pan: number; sound?: "piano" | "xylophone" | "gm_xylophone" | "woodwind"; lfo?: "siren" | "sine" | null; delay?: number; reverb?: number; decay?: number; lpf?: number; hpf?: number }[] // Piano
  kings?: { pattern: (number | number[] | null)[]; gain: number; pan: number; sound: "xylophone" | "synth" | "darbuka" | "gm_acoustic_bass" | "gm_woodblock" | "gm_melodic_tom" | "timpani"; delay?: number; reverb?: number; decay?: number; adsr?: [number, number, number, number]; room?: number; color?: "w" | "b"; lpf?: number; hpf?: number }[]
  knights?: { pattern: (number | null)[]; gain: number; pan: number; sound: "bass" | "gm_acoustic_bass" | "brass_staccato"; adsr: [number, number, number, number]; room?: number; delay?: number; reverb?: number; decay?: number; lpf?: number; hpf?: number }[]
  rooks?: { pattern: (number[] | null)[]; gain: number; pan: number; delay?: number; reverb?: number; decay?: number; sound?: "string_pad" | "synth_pad"; lpf?: number; hpf?: number }[]
  
  // Legacy/Fallback
  kick?: { pattern: boolean[]; gain: number; probability?: number }
  snare?: { pattern: boolean[]; gain: number; probability?: number }
  hihat?: { pattern: boolean[]; gain: number; probability?: number }
  bass?: { 
    pattern: (number | null)[];
    cutoff: number;
    resonance: number;
    gain: number;
    probability?: number;
    adsr: [number, number, number, number];
  }
  pad?: {
    pattern: (number[] | null)[];
    pan: number;
    reverb: number;
    gain: number;
    probability?: number;
    adsr: [number, number, number, number];
    sound?: "string_pad" | "synth_pad";
    lpf?: number;
    hpf?: number;
  }
  lead?: {
    pattern: (number | null)[];
    gain: number;
    detune: number;
    probability?: number;
    adsr: [number, number, number, number];
    delay: number;
  }
  effects: { distort: number; delay: number }
}

// Note frequency lookup
const NOTE_FREQUENCIES: Record<string, number> = {
  // Octave 1
  C1: 32.70,
  "C#1": 34.65, Db1: 34.65,
  D1: 36.71,
  "D#1": 38.89, Eb1: 38.89,
  E1: 41.20,
  F1: 43.65,
  "F#1": 46.25, Gb1: 46.25,
  G1: 49.00,
  "G#1": 51.91, Ab1: 51.91,
  A1: 55.00,
  "A#1": 58.27, Bb1: 58.27,
  B1: 61.74,

  // Octave 2
  C2: 65.41,
  "C#2": 69.30, Db2: 69.30,
  D2: 73.42,
  "D#2": 77.78, Eb2: 77.78,
  E2: 82.41,
  F2: 87.31,
  "F#2": 92.50, Gb2: 92.50,
  G2: 98.00,
  "G#2": 103.83, Ab2: 103.83,
  A2: 110.00,
  "A#2": 116.54, Bb2: 116.54,
  B2: 123.47,

  // Octave 3
  C3: 130.81,
  "C#3": 138.59,
  Db3: 138.59,
  D3: 146.83,
  "D#3": 155.56,
  Eb3: 155.56,
  E3: 164.81,
  F3: 174.61,
  "F#3": 185.0,
  Gb3: 185.0,
  G3: 196.0,
  "G#3": 207.65,
  Ab3: 207.65,
  A3: 220.0,
  "A#3": 233.08,
  Bb3: 233.08,
  B3: 246.94,
  C4: 261.63,
  "C#4": 277.18,
  Db4: 277.18,
  D4: 293.66,
  "D#4": 311.13,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  Gb4: 369.99,
  G4: 392.0,
  "G#4": 415.3,
  Ab4: 415.3,
  A4: 440.0,
  "A#4": 466.16,
  Bb4: 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  Db5: 554.37,
  D5: 587.33,
  "D#5": 622.25,
  Eb5: 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  Gb5: 739.99,
  G5: 783.99,
  "G#5": 830.61,
  Ab5: 830.61,
  A5: 880.0,
  "A#5": 932.33,
  Bb5: 932.33,
  B5: 987.77,
}

export function noteToFrequency(note: string): number {
  // Try lookup first for speed/legacy
  if (NOTE_FREQUENCIES[note]) return NOTE_FREQUENCIES[note]
  if (NOTE_FREQUENCIES[note.toUpperCase()]) return NOTE_FREQUENCIES[note.toUpperCase()]

  // Calculate if not found (supports all octaves)
  const match = note.match(/^([a-gA-G])(#|b)?(\d+)$/)
  if (!match) return 440
  
  const noteName = match[1].toUpperCase()
  const accidental = match[2] || ""
  const octave = parseInt(match[3])
  
  const semitones: Record<string, number> = {
    C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2
  }
  
  let offset = semitones[noteName]
  if (accidental === "#") offset += 1
  if (accidental === "b") offset -= 1
  
  // A4 is reference
  const octaveOffset = (octave - 4) * 12
  const totalSemitones = offset + octaveOffset
  
  return 440 * Math.pow(2, totalSemitones / 12)
}

// Singleton audio engine instance
let audioEngineInstance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine()
  }
  return audioEngineInstance
}
