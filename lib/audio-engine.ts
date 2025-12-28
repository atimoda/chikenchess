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

  // Sound parameters
  private bpm = 120
  private stepTime = 0.125 // 16th note duration

  constructor() {
    if (typeof window !== "undefined") {
      this.init()
    }
  }

  private async init() {
    try {
      this.audioContext = new AudioContext()
      this.masterGain = this.audioContext.createGain()
      this.masterGain.gain.value = 0.7
      this.masterGain.connect(this.audioContext.destination)
      this.isInitialized = true
    } catch (e) {
      console.error("Failed to initialize audio:", e)
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

  private playStep(step: number, time: number) {
    if (!this.currentPattern || !this.audioContext || !this.masterGain) return

    const { kick, snare, hihat, bass, pad, lead, effects } = this.currentPattern

    // Kick drum (on 1, 5, 9, 13 - typical house pattern)
    if (kick.pattern[step % kick.pattern.length]) {
      this.playKick(time, kick.gain)
    }

    // Snare (on 5, 13)
    if (snare.pattern[step % snare.pattern.length]) {
      this.playSnare(time, snare.gain)
    }

    // Hi-hat
    if (hihat.pattern[step % hihat.pattern.length]) {
      this.playHihat(time, hihat.gain)
    }

    // Bass (every 4 steps)
    if (step % 4 === 0 && bass.notes.length > 0) {
      const noteIndex = Math.floor(step / 4) % bass.notes.length
      this.playBass(time, bass.notes[noteIndex], bass.cutoff, bass.resonance, bass.gain)
    }

    // Pad (sustained, retriggered every 8 steps)
    if (step % 8 === 0 && pad.notes.length > 0) {
      this.playPad(time, pad.notes, pad.pan, pad.reverb, pad.gain)
    }

    // Lead (every 2 steps if notes exist)
    if (step % 2 === 0 && lead.notes.length > 0) {
      const noteIndex = Math.floor(step / 2) % lead.notes.length
      this.playLead(time, lead.notes[noteIndex], effects.distort, lead.gain)
    }
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

  private playBass(time: number, note: number, cutoff: number, resonance: number, gain: number) {
    if (!this.audioContext || !this.masterGain) return

    const osc = this.audioContext.createOscillator()
    osc.type = "sawtooth"
    osc.frequency.value = note

    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.value = cutoff
    filter.Q.value = resonance

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(gain * 0.5, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.4)

    osc.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(this.masterGain)

    osc.start(time)
    osc.stop(time + 0.4)
    this.scheduledNodes.push(osc)
  }

  private playPad(time: number, notes: number[], pan: number, reverb: number, gain: number) {
    if (!this.audioContext || !this.masterGain) return

    const merger = this.audioContext.createChannelMerger(2)
    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(gain * 0.2, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 2)

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
      osc.detune.value = (i - notes.length / 2) * 10 // Slight detuning for richness

      osc.connect(gainNode)
      osc.start(time)
      osc.stop(time + 2)
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

  private playLead(time: number, note: number, distort: number, gain: number) {
    if (!this.audioContext || !this.masterGain) return

    const osc = this.audioContext.createOscillator()
    osc.type = "square"
    osc.frequency.value = note

    const filter = this.audioContext.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(2000, time)
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.2)

    const gainNode = this.audioContext.createGain()
    gainNode.gain.setValueAtTime(gain * 0.4, time)
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.3)

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
    osc.stop(time + 0.3)
    this.scheduledNodes.push(osc)
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
  kick: { pattern: boolean[]; gain: number }
  snare: { pattern: boolean[]; gain: number }
  hihat: { pattern: boolean[]; gain: number }
  bass: { notes: number[]; cutoff: number; resonance: number; gain: number }
  pad: { notes: number[]; pan: number; reverb: number; gain: number }
  lead: { notes: number[]; gain: number }
  effects: { distort: number; delay: number }
}

// Note frequency lookup
const NOTE_FREQUENCIES: Record<string, number> = {
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
