"use client"

// Short Web Audio cues for the interface (moves, powers, eggs, results).
// Generative music lives in lib/music/; this engine never plays loops.

export class SfxEngine {
  private audioContext: AudioContext | null = null
  private masterGain: GainNode | null = null
  private scheduledNodes: AudioScheduledSourceNode[] = []
  private powerCrackleBuffer: AudioBuffer | null = null
  private lastPowerHoverTime = -Infinity

  // Each square keeps one random drum sample for the intro hover cue.
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

  setGlobalVolume(volume: number) {
    if (this.masterGain && this.audioContext) {
      const time = this.audioContext.currentTime
      this.masterGain.gain.setTargetAtTime(volume, time, 0.1)
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

  async playSquareSample(square: string) {
    if (!this.audioContext || !this.masterGain) await this.init()
    if (!this.audioContext) return
    this.playPawn(this.audioContext.currentTime, this.squareSamples[square] || "bd", 0.5, 0, "w", 1, 0, 0)
  }


  stop() {
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

    const notes = [523.25, 659.25, 783.99] // C5, E5, G5

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

  private applyEffects(source: AudioNode, delay: number = 0, reverb: number = 0, lpf?: number, hpf?: number) {
    if (!this.masterGain || !this.audioContext) return

    const targetNode: AudioNode = this.masterGain

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

  dispose() {
    this.stop()
    this.audioContext?.close()
  }
}

let sfxEngineInstance: SfxEngine | null = null

export function getSfxEngine(): SfxEngine {
  if (!sfxEngineInstance) {
    sfxEngineInstance = new SfxEngine()
  }
  return sfxEngineInstance
}
