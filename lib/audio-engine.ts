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

  // Sound parameters
  private bpm = 120
  private stepTime = 0.125 // 16th note duration

  private analyser: AnalyserNode | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.init()
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

  getFrequencyData(dataArray: any) {
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

  setPattern(pattern: ParsedPattern) {
    this.currentPattern = pattern
    this.bpm = pattern.bpm
    this.stepTime = 60 / this.bpm / 4
  }

  async start() {
    if (!this.isInitialized || !this.currentPattern) return
    await this.resume()

    this.isPlaying = true
    let step = 0

    const scheduleStep = () => {
      if (!this.isPlaying || !this.currentPattern || !this.audioContext) return

      const now = this.audioContext.currentTime

      // Schedule sounds for current step
      this.playStep(step, now)

      step = (step + 1) % 16
    }

    // Schedule ahead for smoother playback
    this.intervalId = window.setInterval(scheduleStep, this.stepTime * 1000)
    scheduleStep() // Play immediately
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

    // Drone 2
    const osc2 = this.audioContext.createOscillator()
    osc2.type = wave2
    osc2.frequency.value = fifthNote / 2

    // LFO for movement (Unique speed per city)
    const lfo = this.audioContext.createOscillator()
    lfo.frequency.value = 0.1 + (cityId.length * 0.02)
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
  }

  stopAmbience() {
    this.ambienceNodes.forEach(node => {
      try { node.stop() } catch { }
    })
    this.ambienceNodes = []
    if (this.ambienceGain) {
      this.ambienceGain.disconnect()
      this.ambienceGain = null
    }
  }

  private playStep(step: number, time: number) {
    if (!this.currentPattern || !this.audioContext || !this.masterGain) return

    const { kick, snare, hihat, bass, pad, lead, pawns, bishops, queens, knights, kings, effects, swing } = this.currentPattern

    // Apply Swing: delay off-beat 16th notes
    const swingDelay = (step % 2 !== 0) ? (swing || 0) * (this.stepTime / 3) : 0
    const triggerTime = time + swingDelay

    // Humanize: tiny random offset (0-10ms)
    const humanize = () => (Math.random() * 0.01)

    // Helper: Stochastic trigger
    const shouldPlay = (prob: number = 1) => Math.random() <= (prob ?? 1)

    // Kick (Legacy/Fallback)
    if (kick && kick.pattern[step % 16] && shouldPlay(kick.probability)) {
      this.playKick(triggerTime + humanize(), kick.gain)
    }

    // Snare (Legacy/Fallback)
    if (snare && snare.pattern[step % 16] && shouldPlay(snare.probability)) {
      this.playSnare(triggerTime + humanize(), snare.gain)
    }

    // Hi-hat (Legacy/Fallback)
    if (hihat && hihat.pattern[step % 16] && shouldPlay(hihat.probability)) {
      this.playHihat(triggerTime + humanize() + (Math.random() * 0.02), hihat.gain)
    }

    // PAWNS (New Drum Layers)
    if (pawns) {
      pawns.forEach(p => {
        if (p.pattern[step % 16]) {
          this.playPawn(triggerTime + humanize(), p.sample, p.gain, p.pan, p.color)
        }
      })
    }

    // QUEENS (Synth or Darbuka)
    if (queens) {
      queens.forEach(q => {
        const note = q.pattern[step % 16]
        if (note !== null) {
          if (q.sound === "darbuka") {
            this.playDarbuka(triggerTime, q.gain, q.pan)
          } else {
            // Use playBishop (Synth) for Queen's synth sound
            // Passing default ADSR if not provided, though interface says it's required
            this.playBishop(triggerTime, note, q.gain, q.pan, q.adsr, q.lfo || false)
          }
        }
      })
    }

    // BISHOPS (Piano)
    if (bishops) {
      bishops.forEach(b => {
        const rawNotes = b.pattern[step % 16]
        if (rawNotes !== null) {
          const notes = Array.isArray(rawNotes) ? rawNotes : [rawNotes]
          // Apply gain reduction here if not done in pattern
          this.playPiano(triggerTime, notes, b.gain, b.pan, b.lfo, b.delay)
        }
      })
    }
    
    // KINGS (Now using Queen's Synth or Darbuka)
    if (kings) {
      kings.forEach(k => {
        const note = k.pattern[step % 16]
        if (note !== null) {
          if (k.sound === "darbuka") {
             this.playDarbuka(triggerTime, k.gain, k.pan)
          } else if (k.sound === "synth") {
             // King using Queen's Synth
             // Default ADSR for King/Queen synth
             this.playBishop(triggerTime, note, k.gain, k.pan, [0.01, 0.2, 1.25, 1.0], true)
          } else {
             this.playXylophone(triggerTime, note, k.gain, k.pan)
          }
        }
      })
    }

    // KNIGHTS (Acoustic Bass)
    if (knights) {
      knights.forEach(k => {
        const note = k.pattern[step % 16]
        if (note !== null) {
          if (k.sound === "gm_acoustic_bass") {
            this.playAcousticBass(triggerTime, note, k.gain, k.pan, k.adsr, k.room)
          } else {
             // Fallback
             this.playBass(triggerTime, note, 600, 5, k.gain, [0.1, 0.2, 0.8, 1.0])
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
        this.playPad(triggerTime, padNotes, pad.pan, pad.reverb, pad.gain, pad.adsr)
      }
    }

    // Lead (Legacy/Fallback)
    if (lead) {
      const leadNote = lead.pattern[step % 16]
      if (leadNote !== null && shouldPlay(lead.probability)) {
        this.playLead(triggerTime, leadNote, effects.distort, lead.gain, lead.adsr, lead.detune)
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
    gain.gain.setValueAtTime(0.8, time)
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4)

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

  private playPiano(time: number, notes: number[], gain: number, pan: number, lfoType?: "siren" | "sine" | null, delayTime?: number) {
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

    // Delay effect
    if (delayTime && delayTime > 0) {
      const delay = this.audioContext.createDelay()
      delay.delayTime.value = delayTime
      const feedback = this.audioContext.createGain()
      feedback.gain.value = 0.3 // Moderate feedback

      panner.connect(delay)
      delay.connect(feedback)
      feedback.connect(delay)
      delay.connect(this.masterGain)
      panner.connect(this.masterGain)
    } else {
      panner.connect(this.masterGain)
    }

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

  private playXylophone(time: number, freq: number, gain: number, pan: number) {
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

    // Reverb/Room simulation (Short delay)
    const delay = this.audioContext.createDelay()
    delay.delayTime.value = 0.125 // Matches request .delay(.125)
    const feedback = this.audioContext.createGain()
    feedback.gain.value = 0.4 // Room size simulation

    osc.connect(gainNode)
    overtone.connect(overtoneGain).connect(gainNode)
    
    gainNode.connect(panner)
    
    // Direct signal
    panner.connect(this.masterGain)
    
    // Wet signal (Delay/Room)
    panner.connect(delay)
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(this.masterGain)

    osc.start(time)
    osc.stop(time + 0.5)
    overtone.start(time)
    overtone.stop(time + 0.5)
  }

  private playPawn(time: number, sample: string, gain: number, pan: number, color?: "w" | "b") {
    if (!this.audioContext || !this.masterGain) return

    // Tweak sound based on color
    // Black = slightly lower pitch/more filtered for "darker" sound
    const pitchMod = color === 'b' ? 0.8 : 1.0
    const filterMod = color === 'b' ? 0.8 : 1.0

    // Map sample names to synthesis functions
    switch (sample) {
      case "bd": this.playKick(time, gain); break; // Kick is kick
      case "sd": this.playSnare(time, gain * (color === 'b' ? 0.8 : 1)); break;
      case "hh": this.playHihat(time, gain); break;
      case "cp": this.playClap(time, gain, pan); break;
      case "mt": this.playTom(time, gain, 200 * pitchMod, pan); break;
      case "ht": this.playTom(time, gain, 300 * pitchMod, pan); break;
      case "lt": this.playTom(time, gain, 100 * pitchMod, pan); break;
      case "cy": this.playCymbal(time, gain, pan); break;
      default: this.playKick(time, gain);
    }
  }

  private playClap(time: number, gain: number, pan: number) {
     if (!this.audioContext || !this.masterGain) return
     // Simple clap synthesis
     const bufferSize = this.audioContext.sampleRate * 0.1
     const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
     const data = buffer.getChannelData(0)
     for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1)
     
     const noise = this.audioContext.createBufferSource()
     noise.buffer = buffer
     const filter = this.audioContext.createBiquadFilter()
     filter.type = "bandpass"; filter.frequency.value = 1200; filter.Q.value = 1
     
     const gainNode = this.audioContext.createGain()
     gainNode.gain.setValueAtTime(0, time)
     gainNode.gain.linearRampToValueAtTime(gain, time + 0.01)
     gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1)

     const panner = this.audioContext.createStereoPanner()
     panner.pan.value = pan

     noise.connect(filter).connect(gainNode).connect(panner).connect(this.masterGain)
     noise.start(time)
  }

  private playTom(time: number, gain: number, freq: number, pan: number) {
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

     osc.connect(gainNode).connect(panner).connect(this.masterGain)
     osc.start(time); osc.stop(time + 0.3)
  }

  private playCymbal(time: number, gain: number, pan: number) {
     // Re-using hihat logic but longer
     if (!this.audioContext || !this.masterGain) return
     const bufferSize = this.audioContext.sampleRate * 0.5
     const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
     const data = buffer.getChannelData(0)
     for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1)
     
     const noise = this.audioContext.createBufferSource()
     noise.buffer = buffer
     const filter = this.audioContext.createBiquadFilter()
     filter.type = "highpass"; filter.frequency.value = 5000
     
     const gainNode = this.audioContext.createGain()
     gainNode.gain.setValueAtTime(gain * 0.5, time)
     gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5)

     const panner = this.audioContext.createStereoPanner()
     panner.pan.value = pan

     noise.connect(filter).connect(gainNode).connect(panner).connect(this.masterGain)
     noise.start(time)
  }

  private playDarbuka(time: number, gain: number, pan: number) {
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
    panner.connect(this.masterGain)
    
    oscLow.start(time); oscLow.stop(time + 0.2)
    oscHigh.start(time); oscHigh.stop(time + 0.1)
  }

  private playAcousticBass(time: number, freq: number, gain: number, pan: number, adsr: [number, number, number, number], roomAmount: number = 0.3) {
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
    
    // Room effect (as requested .room(.5))
    const reverb = this.audioContext.createConvolver()
    // Simple impulse response for room could be generated, but for now we use a simple delay/feedback as pseudo-room
    // or just rely on dry signal if convolver buffer isn't ready. 
    // Let's use a simple delay-based room for now to avoid loading files.
    const roomDelay = this.audioContext.createDelay()
    roomDelay.delayTime.value = 0.05
    const roomGain = this.audioContext.createGain()
    roomGain.gain.value = 0.3
    
    gainNode.connect(panner)
    panner.connect(this.masterGain)
    
    // Wet
    panner.connect(roomDelay)
    roomDelay.connect(roomGain)
    roomGain.connect(this.masterGain)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    noise.connect(noiseGain).connect(gainNode)
    
    osc1.start(time); osc1.stop(time + att + dec + rel + 1)
    osc2.start(time); osc2.stop(time + att + dec + rel + 1)
    noise.start(time)
  }

  private playBishop(time: number, note: number, gain: number, pan: number, adsr: [number, number, number, number], lfo: boolean) {
    if (!this.audioContext || !this.masterGain) return
    const [att, dec, sus, rel] = adsr
    
    const osc = this.audioContext.createOscillator()
    osc.type = "triangle"
    osc.frequency.value = note

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

    panner.connect(this.masterGain)
    osc.connect(gainNode)
    osc.start(time)
    osc.stop(time + att + dec + rel + 0.1)
  }

  private playKick(time: number, gain: number) {
    if (!this.audioContext || !this.masterGain) return

    const osc = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()

    osc.type = "sine"
    osc.frequency.setValueAtTime(150, time)
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.1)

    gainNode.gain.setValueAtTime(gain * 0.8, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3)

    osc.connect(gainNode)
    gainNode.connect(this.masterGain)

    osc.start(time)
    osc.stop(time + 0.3)
    this.scheduledNodes.push(osc)
  }

  private playSnare(time: number, gain: number) {
    if (!this.audioContext || !this.masterGain) return

    // Noise component
    const bufferSize = this.audioContext.sampleRate * 0.2
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.audioContext.createBufferSource()
    noise.buffer = buffer

    const noiseFilter = this.audioContext.createBiquadFilter()
    noiseFilter.type = "highpass"
    noiseFilter.frequency.value = 1000

    const noiseGain = this.audioContext.createGain()
    noiseGain.gain.setValueAtTime(gain * 0.5, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15)

    // Tone component
    const osc = this.audioContext.createOscillator()
    osc.type = "triangle"
    osc.frequency.setValueAtTime(180, time)
    osc.frequency.exponentialRampToValueAtTime(80, time + 0.05)

    const oscGain = this.audioContext.createGain()
    oscGain.gain.setValueAtTime(gain * 0.4, time)
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(this.masterGain)

    osc.connect(oscGain)
    oscGain.connect(this.masterGain)

    noise.start(time)
    osc.start(time)
    noise.stop(time + 0.2)
    osc.stop(time + 0.1)

    this.scheduledNodes.push(noise, osc)
  }

  private playHihat(time: number, gain: number) {
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
    filter.frequency.value = 7000

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(gain * 0.3, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05)

    noise.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain)

    noise.start(time)
    noise.stop(time + 0.05)
    this.scheduledNodes.push(noise)
  }

  private playBass(time: number, note: number, cutoff: number, resonance: number, gain: number, adsr: [number, number, number, number]) {
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

    osc.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain)

    osc.start(time)
    osc.stop(time + att + dec + rel + 0.1)
    this.scheduledNodes.push(osc)
  }

  private playPad(time: number, notes: number[], pan: number, reverb: number, gain: number, adsr: [number, number, number, number]) {
    if (!this.audioContext || !this.masterGain) return

    const [att, dec, sus, rel] = adsr
    const duration = 2 // Fixed approximate bar duration for pads

    const merger = this.audioContext.createChannelMerger(2)
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

    // Simple reverb using delay
    const delay = this.audioContext.createDelay()
    delay.delayTime.value = 0.1
    const feedback = this.audioContext.createGain()
    feedback.gain.value = reverb * 0.5

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
    panner.connect(this.masterGain)

    // Reverb tail
    gainNode.connect(delay)
    delay.connect(feedback)
    feedback.connect(delay)
    delay.connect(this.masterGain)
  }

  private playLead(time: number, note: number, distort: number, gain: number, adsr: [number, number, number, number], detune: number) {
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

    // Simple distortion using waveshaper
    if (distort > 0) {
      const waveshaper = this.audioContext.createWaveShaper()
      waveshaper.curve = this.makeDistortionCurve(distort * 100)
      osc.connect(filter)
      filter.connect(waveshaper)
      waveshaper.connect(gainNode)
    } else {
      osc.connect(filter)
      filter.connect(gainNode)
    }

    gainNode.connect(this.masterGain)

    osc.start(time)
    osc.stop(time + att + dec + rel + 0.1)
    this.scheduledNodes.push(osc)
  }

  private makeDistortionCurve(amount: number): any {
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
  
  // Layers
  pawns?: { sample: string; pattern: boolean[]; gain: number; pan: number; color: "w" | "b" }[]
  queens?: { pattern: (number | null)[]; gain: number; pan: number; adsr: [number, number, number, number]; sound: "synth" | "darbuka"; lfo?: boolean }[]
  bishops?: { pattern: (number | number[] | null)[]; gain: number; pan: number; lfo?: "siren" | "sine" | null; delay?: number }[] // Piano
  kings?: { pattern: (number | null)[]; gain: number; pan: number; sound: "xylophone" | "synth" | "darbuka" }[]
  knights?: { pattern: (number | null)[]; gain: number; pan: number; sound: "bass" | "gm_acoustic_bass"; adsr: [number, number, number, number]; room?: number }[]
  
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
  return NOTE_FREQUENCIES[note] || 440
}

// Singleton audio engine instance
let audioEngineInstance: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!audioEngineInstance) {
    audioEngineInstance = new AudioEngine()
  }
  return audioEngineInstance
}
