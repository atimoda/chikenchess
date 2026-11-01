// PigChicKen's light synth for the instruments, the enemies' answers and the ambience (percussion and drone).
// Plain Web Audio oscillators, filters and envelopes, with a cap on simultaneous voices so phones keep up.
import { audio } from './sfx'
import { midiHz } from './music'

export type VoiceId = 'flute' | 'sax' | 'trumpet' | 'guitar' | 'violin' | 'keys' | 'harp' | 'bells' | 'chip' | 'hum' | 'bird'
export const VOICE_LABELS: Record<VoiceId, string> = {
  flute: 'Flauta', sax: 'Sax', trumpet: 'Trompete', guitar: 'Violão', violin: 'Violino', keys: 'Teclado', harp: 'Harpa', bells: 'Sinos', chip: 'Chip (alien)', hum: 'Coro (zumbi)', bird: 'Passarinho',
}

const MAX_VOICES = 18
let bus: GainNode | null = null, amb: GainNode | null = null, comp: DynamicsCompressorNode | null = null
let noteVol = 0.7, ambVol = 0.35
type Live = { end: number; kill: (t: number) => void }
const live: Live[] = []

function ctx() {
  const a = audio()
  if (!a) return null
  if (!bus) {
    comp = a.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(a.destination)
    bus = a.createGain(); bus.gain.value = noteVol; bus.connect(comp)
    amb = a.createGain(); amb.gain.value = ambVol; amb.connect(comp)
  }
  return a
}

export function setMusicVolumes(notes: number, ambience: number) {
  noteVol = notes; ambVol = ambience
  if (bus) bus.gain.value = notes
  if (amb) amb.gain.value = ambience
}
export const audioTime = () => ctx()?.currentTime ?? 0

// keeps the number of voices down: the oldest one fades out fast
function admit(a: AudioContext, v: Live) {
  const now = a.currentTime
  for (let i = live.length - 1; i >= 0; i--) if (live[i].end < now) live.splice(i, 1)
  while (live.length >= MAX_VOICES) { const old = live.shift()!; old.kill(now) }
  live.push(v)
}

function env(a: AudioContext, g: GainNode, t: number, peak: number, attack: number, hold: number, release: number) {
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  if (hold > 0) g.gain.setValueAtTime(peak, t + attack + hold)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release)
  return t + attack + hold + release
}
function osc(a: AudioContext, type: OscillatorType, f: number, t: number) { const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); return o }
function vibrato(a: AudioContext, targets: AudioParam[], f: number, depth: number, t: number, delay: number) {
  const lfo = osc(a, 'sine', 5.5, t), g = a.createGain()
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(f * depth, t + delay + 0.15)
  lfo.connect(g); targets.forEach(p => g.connect(p))
  return lfo
}
let noiseBuf: AudioBuffer | null = null
function noise(a: AudioContext) {
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 }
  const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s
}

export type Held = { setPitch: (midi: number) => void; stop: () => void }

// plays one note; `at` is a delay in seconds (to land on the grid), `dur` how long it is held
export function playNote(voice: VoiceId, midi: number, opts: { at?: number; dur?: number; vel?: number; sustain?: boolean } = {}): Held | null {
  const a = ctx()
  if (!a || !bus || noteVol <= 0) return null
  const t = a.currentTime + Math.max(0, opts.at ?? 0)
  const vel = Math.max(0.05, Math.min(1, opts.vel ?? 0.8))
  const dur = opts.dur ?? 0.3
  const f = midiHz(midi)
  const out = a.createGain(); out.connect(bus)
  const sources: AudioScheduledSourceNode[] = []
  const freqs: AudioParam[] = [] // pitched params that follow setPitch (each with its ratio)
  const ratios: number[] = []
  const track = (p: AudioParam, r: number) => { freqs.push(p); ratios.push(r) }
  let end = t + dur
  const sustain = !!opts.sustain

  switch (voice) {
    case 'flute': {
      const o1 = osc(a, 'sine', f, t), o2 = osc(a, 'triangle', f * 2, t), g2 = a.createGain(); g2.gain.value = 0.12
      o1.connect(out); o2.connect(g2); g2.connect(out); track(o1.frequency, 1); track(o2.frequency, 2)
      const br = noise(a), bf = a.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = f * 2; bf.Q.value = 2
      const bg = a.createGain(); env(a, bg, t, 0.06 * vel, 0.02, 0, 0.15); br.connect(bf); bf.connect(bg); bg.connect(out)
      sources.push(o1, o2, br, vibrato(a, [o1.frequency, o2.frequency], f, 0.006, t, 0.12))
      end = env(a, out, t, 0.32 * vel, 0.04, Math.max(0, dur - 0.04), 0.14); break
    }
    case 'sax': {
      const o1 = osc(a, 'sawtooth', f, t), o2 = osc(a, 'square', f, t), g2 = a.createGain(); g2.gain.value = 0.25
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 4
      lp.frequency.setValueAtTime(f * 2, t); lp.frequency.exponentialRampToValueAtTime(f * 7, t + 0.04); lp.frequency.exponentialRampToValueAtTime(f * 3.5, t + 0.2)
      o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(out); track(o1.frequency, 1); track(o2.frequency, 1)
      sources.push(o1, o2, vibrato(a, [o1.frequency, o2.frequency], f, 0.008, t, 0.1))
      end = env(a, out, t, 0.16 * vel, 0.025, Math.max(0, dur - 0.03), 0.1); break
    }
    case 'trumpet': {
      const o1 = osc(a, 'sawtooth', f * 0.985, t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.05)
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2
      lp.frequency.setValueAtTime(f * 1.5, t); lp.frequency.exponentialRampToValueAtTime(f * 7, t + 0.06); lp.frequency.exponentialRampToValueAtTime(f * 4, t + 0.25)
      o1.connect(lp); lp.connect(out); track(o1.frequency, 1)
      sources.push(o1, vibrato(a, [o1.frequency], f, 0.005, t, 0.2))
      end = env(a, out, t, 0.2 * vel, 0.02, Math.max(0, dur - 0.02), 0.09); break
    }
    case 'guitar': {
      const o1 = osc(a, 'sawtooth', f, t), o2 = osc(a, 'triangle', f * 1.003, t)
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.5
      lp.frequency.setValueAtTime(f * 10, t); lp.frequency.exponentialRampToValueAtTime(f * 1.2, t + 0.9)
      o1.connect(lp); o2.connect(lp); lp.connect(out); track(o1.frequency, 1); track(o2.frequency, 1.003)
      sources.push(o1, o2)
      end = env(a, out, t, 0.22 * vel, 0.003, 0, Math.max(0.6, dur * 3)); break
    }
    case 'violin': {
      const o1 = osc(a, 'sawtooth', f * 1.002, t), o2 = osc(a, 'sawtooth', f * 0.998, t)
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.7
      const pk = a.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1100; pk.gain.value = 6; pk.Q.value = 1.2
      o1.connect(lp); o2.connect(lp); lp.connect(pk); pk.connect(out); track(o1.frequency, 1.002); track(o2.frequency, 0.998)
      sources.push(o1, o2, vibrato(a, [o1.frequency, o2.frequency], f, 0.007, t, 0.25))
      if (sustain) { out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.13 * vel, t + 0.09); end = t + 60 }
      else end = env(a, out, t, 0.13 * vel, 0.08, Math.max(0, dur - 0.08), 0.25)
      break
    }
    case 'keys': {
      const c = osc(a, 'sine', f, t), m = osc(a, 'sine', f, t), mg = a.createGain()
      mg.gain.setValueAtTime(f * 1.8, t); mg.gain.exponentialRampToValueAtTime(f * 0.15, t + 0.6)
      m.connect(mg); mg.connect(c.frequency); c.connect(out); track(c.frequency, 1); track(m.frequency, 1)
      const tine = osc(a, 'sine', f * 4, t), tg = a.createGain(); env(a, tg, t, 0.05 * vel, 0.002, 0, 0.12); tine.connect(tg); tg.connect(out)
      sources.push(c, m, tine)
      end = env(a, out, t, 0.26 * vel, 0.004, 0, Math.max(0.8, dur * 3)); break
    }
    case 'harp': {
      const o1 = osc(a, 'triangle', f, t), o2 = osc(a, 'sine', f * 2, t), g2 = a.createGain(); g2.gain.value = 0.2
      o1.connect(out); o2.connect(g2); g2.connect(out); track(o1.frequency, 1); track(o2.frequency, 2)
      sources.push(o1, o2)
      end = env(a, out, t, 0.3 * vel, 0.004, 0, Math.max(0.9, dur * 3)); break
    }
    case 'bells': {
      const c = osc(a, 'sine', f * 2, t), m = osc(a, 'sine', f * 2 * 3.5, t), mg = a.createGain()
      mg.gain.setValueAtTime(f * 3, t); mg.gain.exponentialRampToValueAtTime(f * 0.2, t + 0.5)
      m.connect(mg); mg.connect(c.frequency); c.connect(out); track(c.frequency, 2); track(m.frequency, 7)
      sources.push(c, m)
      end = env(a, out, t, 0.18 * vel, 0.002, 0, Math.max(0.6, dur * 2.5)); break
    }
    case 'chip': {
      const o1 = osc(a, 'square', f, t); o1.frequency.setValueAtTime(f * 1.5, t); o1.frequency.setValueAtTime(f, t + 0.03)
      o1.connect(out); track(o1.frequency, 1); sources.push(o1)
      end = env(a, out, t, 0.09 * vel, 0.004, Math.max(0, dur - 0.05), 0.08); break
    }
    case 'hum': {
      const o1 = osc(a, 'sawtooth', f, t)
      const f1 = a.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 550; f1.Q.value = 5
      const f2 = a.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1000; f2.Q.value = 6
      const g2 = a.createGain(); g2.gain.value = 0.6
      o1.connect(f1); o1.connect(f2); f1.connect(out); f2.connect(g2); g2.connect(out); track(o1.frequency, 1)
      sources.push(o1, vibrato(a, [o1.frequency], f, 0.012, t, 0.05))
      end = env(a, out, t, 0.5 * vel, 0.07, Math.max(0, dur - 0.07), 0.2); break
    }
    case 'bird': {
      const o1 = osc(a, 'sine', f * 2, t); o1.frequency.exponentialRampToValueAtTime(f * 3, t + 0.05); o1.frequency.exponentialRampToValueAtTime(f * 2, t + 0.1)
      o1.connect(out); track(o1.frequency, 2); sources.push(o1)
      end = env(a, out, t, 0.12 * vel, 0.005, 0, 0.12); break
    }
  }
  sources.forEach(s => { s.start(t); if (!sustain) s.stop(end + 0.05) })
  const kill = (at: number) => {
    out.gain.cancelScheduledValues(at); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), at); out.gain.exponentialRampToValueAtTime(0.0001, at + 0.06)
    sources.forEach(s => { try { s.stop(at + 0.08) } catch { /* already stopped */ } })
  }
  const v: Live = { end, kill }
  admit(a, v)
  return {
    setPitch(m: number) {
      const now = a.currentTime, nf = midiHz(m)
      freqs.forEach((p, i) => { p.cancelScheduledValues(now); p.setValueAtTime(p.value, now); p.exponentialRampToValueAtTime(nf * ratios[i], now + 0.06) })
    },
    stop() { const now = a.currentTime; v.end = now; out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now); out.gain.exponentialRampToValueAtTime(0.0001, now + 0.25); sources.forEach(s => { try { s.stop(now + 0.3) } catch { /* ok */ } }) },
  }
}

// ---------- ambience: percussion and drone from the scenery ----------
export type Drum = 'kick' | 'snare' | 'hat' | 'openHat' | 'shaker' | 'jingle' | 'clap'
export function playDrum(kind: Drum, at = 0, vel = 1) {
  const a = ctx()
  if (!a || !amb || ambVol <= 0) return
  const t = a.currentTime + Math.max(0, at)
  const g = a.createGain(); g.connect(kind === 'jingle' ? bus! : amb)
  const hit = (filter: BiquadFilterType, fq: number, q: number, peak: number, dec: number, start = 0) => {
    const n = noise(a), bf = a.createBiquadFilter(); bf.type = filter; bf.frequency.value = fq; bf.Q.value = q
    const ng = a.createGain(); env(a, ng, t + start, peak * vel, 0.002, 0, dec); n.connect(bf); bf.connect(ng); ng.connect(g)
    n.start(t + start, Math.random() * 0.5); n.stop(t + start + dec + 0.05)
  }
  g.gain.value = 1
  switch (kind) {
    case 'kick': {
      const o = osc(a, 'sine', 140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
      const og = a.createGain(); env(a, og, t, 0.9 * vel, 0.003, 0, 0.32); o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.4); break
    }
    case 'snare': hit('bandpass', 1800, 0.8, 0.5, 0.16); { const o = osc(a, 'triangle', 190, t); const og = a.createGain(); env(a, og, t, 0.3 * vel, 0.002, 0, 0.1); o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.15) } break
    case 'clap': [0, 0.012, 0.024].forEach(s => hit('bandpass', 1300, 1.2, 0.35, 0.08, s)); break
    case 'hat': hit('highpass', 8000, 0.7, 0.22, 0.035); break
    case 'openHat': hit('highpass', 7000, 0.7, 0.18, 0.22); break
    case 'shaker': hit('bandpass', 5500, 1.5, 0.14, 0.07); break
    case 'jingle': [0, 0.018, 0.04, 0.07].forEach((s, i) => hit('bandpass', 6500 + i * 900, 6, 0.16, 0.12, s)); break
  }
}

// the drone: two soft saws on the chord's root and fifth, gliding when the chord changes
export function createDrone() {
  let nodes: { o: OscillatorNode[]; g: GainNode; lp: BiquadFilterNode } | null = null
  return {
    set(root: number | null) {
      const a = ctx()
      if (!a || !amb) return
      const now = a.currentTime
      if (root === null) { if (nodes) { const n = nodes; n.g.gain.setTargetAtTime(0.0001, now, 0.3); n.o.forEach(o => o.stop(now + 2)); nodes = null } return }
      const r = midiHz(root - 24)
      if (!nodes) {
        const g = a.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.setTargetAtTime(0.09, now, 0.8)
        const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.8
        const lfo = osc(a, 'sine', 0.13, now), lg = a.createGain(); lg.gain.value = 160; lfo.connect(lg); lg.connect(lp.frequency)
        const o = [osc(a, 'sawtooth', r, now), osc(a, 'sawtooth', r * 1.004, now), osc(a, 'sawtooth', r * 1.5, now), lfo]
        o.slice(0, 3).forEach(x => x.connect(lp)); lp.connect(g); g.connect(amb); o.forEach(x => x.start(now))
        nodes = { o, g, lp }
      } else {
        const [a1, a2, a3] = nodes.o
        a1.frequency.setTargetAtTime(r, now, 0.15); a2.frequency.setTargetAtTime(r * 1.004, now, 0.15); a3.frequency.setTargetAtTime(r * 1.5, now, 0.15)
      }
    },
  }
}
