// PigChicKen's light synth for the instruments, the enemies' answers and the ambience (percussion and drone).
// Plain Web Audio oscillators, filters and envelopes, with a cap on simultaneous voices so phones keep up.
import { audio } from './sfx'
import { midiHz } from './music'
import type { BassTone, DroneTone } from './zone-ambience'
import { RECORD_STOP, recordStopCurve } from './zone-dynamics'
import { pieceOfMidi } from './drum-kit'
import { playKit } from './drum-synth'
import { msg } from '../i18n'

export type VoiceId = 'flute' | 'sax' | 'trumpet' | 'guitar' | 'violin' | 'keys' | 'harp' | 'bells' | 'chip' | 'hum' | 'bird' | 'guzheng' | 'bass' | 'pizz'
  | 'hang' | 'handpan' | 'hangSteel' | 'hangSlap' | 'pedalHarp' | 'harpHarmonic' | 'kit' | 'grandPiano'
export const VOICE_LABELS: Record<VoiceId, string> = {
  flute: msg('Flauta'), sax: msg('Sax'), trumpet: msg('Trompete'), guitar: msg('Violão'), violin: msg('Violino'), keys: msg('Teclado'), harp: msg('Harpa de Lira'), bells: msg('Sinos'), chip: msg('Chip (alien)'), hum: msg('Coro (zumbi)'), bird: msg('Passarinho'), guzheng: msg('Guzheng'), bass: msg('Baixo'), pizz: msg('Violino pizzicato'),
  hang: msg('Hang clássico'), handpan: msg('Handpan nitretado'), hangSteel: msg('Handpan inox'), hangSlap: msg('Hang (batida entre notas)'),
  pedalHarp: msg('Harpa'), harpHarmonic: msg('Harpa (harmônico)'), kit: msg('Bateria acústica'), grandPiano: msg('Piano de cauda'),
}
// the hangdrum's kinds of sound (its "Tipo de som"): each one a voice below
export const HANG_VOICES: VoiceId[] = ['hang', 'handpan', 'hangSteel']
export const isHangVoice = (v: VoiceId) => v === 'hang' || v === 'handpan' || v === 'hangSteel' || v === 'hangSlap'

// (24 since the Harpa: its strings ring for seconds, and a sweep over them is many notes at once)
const MAX_VOICES = 24
let bus: GainNode | null = null, amb: GainNode | null = null, comp: DynamicsCompressorNode | null = null
let noteVol = 0.7, ambVol = 0.35
let zoneLp: BiquadFilterNode | null = null, zoneGate: GainNode | null = null
// the voices of the zones' background still sounding or about to (what a record stop slows down)
type ZoneVoice = AudioScheduledSourceNode & { detune: AudioParam }
const zoneVoices = new Set<ZoneVoice>()
function zoneVoice(v: ZoneVoice) { zoneVoices.add(v); v.addEventListener('ended', () => zoneVoices.delete(v)) }
type Live = { end: number; kill: (t: number) => void }
const live: Live[] = []

function ctx() {
  const a = audio()
  if (!a) return null
  if (!bus) {
    comp = a.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(a.destination)
    bus = a.createGain(); bus.gain.value = noteVol; bus.connect(comp)
    amb = a.createGain(); amb.gain.value = ambVol; amb.connect(comp)
    // the zones' own background (beat, bass, drone) goes through a filter and a gate of its own into the ambience,
    // so the zone's music switch can stop it at once (stopZoneAmbience)
    zoneLp = a.createBiquadFilter(); zoneLp.type = 'lowpass'; zoneLp.frequency.value = 20000; zoneLp.Q.value = 0.7
    zoneGate = a.createGain(); zoneGate.gain.value = 1; zoneLp.connect(zoneGate); zoneGate.connect(amb)
  }
  return a
}

export function setMusicVolumes(notes: number, ambience: number) {
  noteVol = notes; ambVol = ambience
  if (bus) bus.gain.value = notes
  if (amb) amb.gain.value = ambience
}
export const audioTime = () => ctx()?.currentTime ?? 0
/** The notes' bus, for the voices written outside this file (lib/pigchicken/drum-synth.ts); null: no sound now. */
export function noteBus() {
  const a = ctx()
  return a && bus && noteVol > 0 ? { a, bus, noise: () => noise(a), admit: (v: Live) => admit(a, v) } : null
}

/** The ambience's bus, for the voices written outside this file (lib/pigchicken/kit-player.ts); null: no sound now. */
export function ambienceBus() {
  const a = ctx()
  return a && amb && zoneLp && ambVol > 0 ? { a, amb, zone: zoneLp, voice: zoneVoice } : null
}

// the zone's music switched off: everything of the zones' background that sounds or is scheduled stops now, like a
// record when the turntable is switched off (the speed falls to nothing in RECORD_STOP seconds, the sound darkening
// and fading with it); then the gate opens again for what comes next
export function stopZoneAmbience() {
  const a = ctx()
  if (!a || !zoneLp || !zoneGate) return
  const now = a.currentTime, end = now + RECORD_STOP, curve = recordStopCurve()
  zoneVoices.forEach(v => {
    try { v.detune.cancelScheduledValues(now); v.detune.setValueCurveAtTime(curve, now, RECORD_STOP); v.stop(end + 0.02) } catch { /* already over */ }
  })
  zoneVoices.clear()
  const g = zoneGate.gain, f = zoneLp.frequency
  g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0.0001, end); g.setValueAtTime(1, end + 0.05)
  f.cancelScheduledValues(now); f.setValueAtTime(9000, now); f.exponentialRampToValueAtTime(250, end); f.setValueAtTime(20000, end + 0.05)
}

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
// A note's vibrato, said outright (the items' "Vibrato natural"): how far the pitch sways each way (cents), how
// many times a second, and how long after the start it begins to come in (it takes 0.15 s more to be whole).
// A note played with one (playNote's opts.vib) uses exactly it on any voice; without one, the voice's own below.
export type Vibrato = { depth: number; rate: number; delay: number }
// the voices' own vibrato, for notes that bring none (ambience, songs, previews): silent when the note brings its own
let ownVibrato = true
function vibrato(a: AudioContext, targets: AudioParam[], f: number, depth: number, t: number, delay: number) {
  const lfo = osc(a, 'sine', 5.5, t), g = a.createGain()
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(ownVibrato ? f * depth : 0, t + delay + 0.15)
  lfo.connect(g); targets.forEach(p => g.connect(p))
  return lfo
}
let noiseBuf: AudioBuffer | null = null
function noise(a: AudioContext) {
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1 }
  const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s
}

// ---------- the hangdrum ----------
// A tone field of a hang / handpan is a dent in the steel shell tuned on three modes: the fundamental, its octave and
// the compound fifth (the 12th, 3 × f). The finger's strike is short and soft, so the attack is a quick "ping" (a few
// untuned high modes and a little thump that die in milliseconds); then the octave swells a hair after the
// fundamental (the energy moving between the tuned modes, the instrument's "bloom") and everything rings long, lower
// notes longer. Each mode is a pair of slightly mistuned sines, which gives the slow shimmer of real steel.
// hang: the classic (PANArt, nitrided steel): warm, round, a soft fifth; handpan: a modern nitrided pan, brighter,
// a clearer octave and a little pitch drop at the strike; hangSteel: a stainless pan, the purest and longest ring
type HangShape = { oct: number; fifth: number; ping: number; click: number; ring: number; beat: number; glide: number; attack: number }
const HANG_SHAPES: Record<'hang' | 'handpan' | 'hangSteel', HangShape> = {
  hang: { oct: 0.34, fifth: 0.15, ping: 0.05, click: 0.06, ring: 1, beat: 0.0007, glide: 0.002, attack: 0.004 },
  handpan: { oct: 0.48, fifth: 0.2, ping: 0.09, click: 0.08, ring: 1.25, beat: 0.0009, glide: 0.005, attack: 0.003 },
  hangSteel: { oct: 0.26, fifth: 0.07, ping: 0.035, click: 0.03, ring: 1.7, beat: 0.0013, glide: 0.001, attack: 0.008 },
}
// seconds a hang note takes to die away completely: low notes longer (about 6.5 s at A3), `dur` (the item's Duração
// da nota, 1.5 s by default) stretching or shortening it
function hangRing(f: number, dur: number, ring: number) {
  return Math.max(0.8, Math.min(12, 6.5 * Math.pow(220 / f, 0.35) * ring * Math.max(0.35, Math.min(2.5, dur / 1.5))))
}

// seconds a harp string takes to die away: low strings longer (about 4 s at A3), `dur` (the item's Duração da nota,
// 1.5 s by default) stretching or shortening it
function harpRing(f: number, dur: number) {
  return Math.max(0.6, Math.min(9, 4.2 * Math.pow(220 / f, 0.5) * Math.max(0.35, Math.min(2.5, dur / 1.5))))
}

// seconds a piano string takes to die away (with the dampers up): low notes much longer (about 7 s at A3, 14 s at the
// bottom, under 1 s at the top), `dur` (the item's Duração da nota, 1.5 s by default) stretching or shortening it
function pianoRing(f: number, dur: number) {
  return Math.max(0.5, Math.min(14, 7 * Math.pow(220 / f, 0.55) * Math.max(0.35, Math.min(2.5, dur / 1.5))))
}

// stop: fades the note out (in `fade` s; 0.25 by default)
export type Held = { setPitch: (midi: number) => void; setVolume?: (v: number) => void; stop: (fade?: number) => void }

// plays one note; `at` is a delay in seconds (to land on the grid), `dur` how long it is held; `fade` (seconds)
// adds a gentle fade-in on top of the voice's own attack, so even plucked voices start without a click
export function playNote(voice: VoiceId, midi: number, opts: { at?: number; dur?: number; vel?: number; sustain?: boolean; fade?: number; vib?: Vibrato } = {}): Held | null {
  // the Bateria: the note's number is the piece's on the General MIDI drum map
  if (voice === 'kit') return playKit(pieceOfMidi(midi), { at: opts.at, vel: opts.vel })
  const a = ctx()
  if (!a || !bus || noteVol <= 0) return null
  ownVibrato = !opts.vib
  const t = a.currentTime + Math.max(0, opts.at ?? 0)
  const vel = Math.max(0.05, Math.min(1, opts.vel ?? 0.8))
  const dur = opts.dur ?? 0.3
  const f = midiHz(midi)
  const out = a.createGain()
  // a held note's loudness on top of its envelope (setVolume: the aim's distance on the violin's beam)
  const level = a.createGain()
  out.connect(level)
  const fade = Math.max(0, opts.fade ?? 0)
  if (fade > 0) {
    const fg = a.createGain(); fg.gain.setValueAtTime(0, t); fg.gain.linearRampToValueAtTime(1, t + fade)
    level.connect(fg); fg.connect(bus)
  } else level.connect(bus)
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
    // the violin plucked: a bright snap that dies fast, a little body underneath
    case 'pizz': {
      const o1 = osc(a, 'sawtooth', f, t), o2 = osc(a, 'triangle', f, t), g2 = a.createGain(); g2.gain.value = 0.5
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2
      lp.frequency.setValueAtTime(f * 8, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.12)
      o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(out); track(o1.frequency, 1); track(o2.frequency, 1)
      sources.push(o1, o2)
      end = env(a, out, t, 0.2 * vel, 0.002, 0, 0.22 + Math.min(0.2, dur)); break
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
    // the pedal harp: a string plucked with the finger's pad. A round fundamental that rings long (lower strings
    // longer), the overtones bright at the pluck and gone much sooner, and the soft brush of the finger leaving it
    case 'pedalHarp': {
      const ring = harpRing(f, dur)
      for (const [r, peak, part] of [[1, 0.3, 1], [2, 0.12, 0.5], [3, 0.06, 0.3], [4, 0.03, 0.18]] as const) {
        const o = osc(a, r === 1 ? 'triangle' : 'sine', f * r, t), g = a.createGain(); env(a, g, t, peak * vel, 0.004, 0, ring * part)
        o.connect(g); g.connect(out); track(o.frequency, r); sources.push(o)
      }
      const br = noise(a), bf = a.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = Math.min(3600, f * 3); bf.Q.value = 0.8
      const bg = a.createGain(); env(a, bg, t, 0.04 * vel, 0.002, 0, 0.04); br.connect(bf); bf.connect(bg); bg.connect(out)
      sources.push(br)
      out.gain.setValueAtTime(1, t)
      end = t + 0.004 + ring; break
    }
    // a harp's harmonic (the string touched in its middle as it is plucked): almost a pure tone, an octave up (the
    // note that comes is already that octave), a softer start and a long, bell-like ring
    case 'harpHarmonic': {
      const ring = harpRing(f / 2, dur)
      for (const [r, peak, part] of [[1, 0.3, 1], [2, 0.035, 0.3]] as const) {
        const o = osc(a, 'sine', f * r, t), g = a.createGain(); env(a, g, t, peak * vel, 0.012, 0, ring * part)
        o.connect(g); g.connect(out); track(o.frequency, r); sources.push(o)
      }
      out.gain.setValueAtTime(1, t)
      end = t + 0.012 + ring; break
    }
    // the grand piano: a hammered string. The fundamental is two strings a hair apart (the slow beating of a unison),
    // the overtones a little sharp (a stiff string's inharmonicity) and shorter, a hard hit opens the tone (more
    // overtones, a brighter filter) and the hammer's felt thumps at the start. The sound has two parts: a quick drop
    // right after the hit, then the long, darkening ring
    case 'grandPiano': {
      const ring = pianoRing(f, dur), bright = 0.35 + 0.65 * vel
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5
      const open = Math.min(18000, f * (3 + 14 * vel))
      lp.frequency.setValueAtTime(open, t); lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, Math.min(open, f * 3)), t + ring * 0.6)
      lp.connect(out)
      const B = 0.00035
      for (const [r, peak, part] of [[1, 0.5, 1], [2, 0.3, 0.7], [3, 0.16, 0.45], [4, 0.09, 0.3], [5, 0.05, 0.2]] as const) {
        if (f * r > 16000) continue
        const fr = f * r * Math.sqrt(1 + B * r * r), k = r === 1 ? 1 : bright ** (r - 1)
        const g = a.createGain()
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak * k, t + 0.003)
        g.gain.exponentialRampToValueAtTime(peak * k * 0.45, t + 0.003 + 0.12 * part + 0.05)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.003 + ring * part)
        g.connect(lp)
        for (const d of r === 1 ? [0.9995, 1.0005] : [1]) {
          const o = osc(a, r === 1 ? 'triangle' : 'sine', fr * d, t)
          o.connect(g); track(o.frequency, r * Math.sqrt(1 + B * r * r) * d); sources.push(o)
        }
      }
      const th = noise(a), tf = a.createBiquadFilter(); tf.type = 'lowpass'; tf.frequency.value = Math.min(2600, 500 + f * 2)
      const tg = a.createGain(); env(a, tg, t, 0.12 * vel, 0.001, 0, 0.035); th.connect(tf); tf.connect(tg); tg.connect(out)
      sources.push(th)
      out.gain.setValueAtTime(0.42 * vel, t)
      end = t + 0.003 + ring; break
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
    case 'guzheng': {
      // a plucked zither: bright attack that slides down into the note, a short shimmer and a long ring
      const o1 = osc(a, 'triangle', f * 1.02, t), o2 = osc(a, 'sawtooth', f, t)
      o1.frequency.exponentialRampToValueAtTime(f, t + 0.05); o2.frequency.setValueAtTime(f * 1.02, t); o2.frequency.exponentialRampToValueAtTime(f, t + 0.05)
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3
      lp.frequency.setValueAtTime(f * 12, t); lp.frequency.exponentialRampToValueAtTime(f * 2, t + 0.5)
      const g2 = a.createGain(); g2.gain.value = 0.35
      o1.connect(out); o2.connect(g2); g2.connect(lp); lp.connect(out); track(o1.frequency, 1); track(o2.frequency, 1)
      sources.push(o1, o2, vibrato(a, [o1.frequency], f, 0.01, t, 0.25))
      end = env(a, out, t, 0.3 * vel, 0.002, 0, Math.max(0.9, dur * 3)); break
    }
    case 'bass': {
      const o1 = osc(a, 'sine', f, t), o2 = osc(a, 'sawtooth', f, t)
      const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2
      lp.frequency.setValueAtTime(f * 6, t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.2)
      const g2 = a.createGain(); g2.gain.value = 0.3
      o1.connect(out); o2.connect(g2); g2.connect(lp); lp.connect(out); track(o1.frequency, 1); track(o2.frequency, 1)
      sources.push(o1, o2)
      end = env(a, out, t, 0.45 * vel, 0.006, Math.max(0, dur - 0.05), 0.12); break
    }
    case 'hang': case 'handpan': case 'hangSteel': {
      const sh = HANG_SHAPES[voice], dec = hangRing(f, dur, sh.ring)
      // a mode: two sines a hair apart (the shimmer), with its own swell and ring
      const mode = (ratio: number, peak: number, swell: number, ring: number) => {
        const g = a.createGain()
        g.gain.setValueAtTime(0.0001, t)
        if (swell > 0) { g.gain.exponentialRampToValueAtTime(peak * 0.45, t + sh.attack); g.gain.exponentialRampToValueAtTime(peak, t + swell) }
        else g.gain.exponentialRampToValueAtTime(peak, t + sh.attack)
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(swell, sh.attack) + ring)
        g.connect(out)
        for (const d of [1 - sh.beat, 1 + sh.beat]) {
          const o = osc(a, 'sine', f * ratio * d * (1 + sh.glide), t)
          o.frequency.exponentialRampToValueAtTime(f * ratio * d, t + 0.05)
          o.connect(g); track(o.frequency, ratio * d); sources.push(o)
        }
      }
      mode(1, 0.5, 0, dec)
      mode(2, sh.oct, 0.09, dec * 0.62)
      mode(3, sh.fifth, 0.04, dec * 0.45)
      // the strike: two untuned high modes and the finger's thump
      for (const [r, k] of [[4.27, 1], [6.14, 0.6]] as const) {
        const o = osc(a, 'sine', f * r, t), g = a.createGain(); env(a, g, t, sh.ping * k, 0.002, 0, 0.09)
        o.connect(g); g.connect(out); sources.push(o)
      }
      if (sh.click > 0) {
        const n = noise(a), lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(4000, f * 6)
        const g = a.createGain(); env(a, g, t, sh.click, 0.001, 0, 0.02); n.connect(lp); lp.connect(g); g.connect(out); sources.push(n)
      }
      out.gain.setValueAtTime(0.42 * vel, t)
      end = t + dec + 0.1; break
    }
    // a hand between the notes: a dry "tak" of the skin on the steel, the shell's knock, the air inside booming
    // (the Helmholtz resonance of the body, the "Gu") and the nearest note ringing faintly in sympathy (`midi`)
    case 'hangSlap': {
      const tak = noise(a), bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2300; bp.Q.value = 0.9
      const tg = a.createGain(); env(a, tg, t, 0.5 * vel, 0.001, 0, 0.045); tak.connect(bp); bp.connect(tg); tg.connect(out)
      const knock = osc(a, 'sine', 210, t); knock.frequency.exponentialRampToValueAtTime(130, t + 0.06)
      const kg = a.createGain(); env(a, kg, t, 0.32 * vel, 0.002, 0, 0.13); knock.connect(kg); kg.connect(out)
      const gu = osc(a, 'sine', 92, t); gu.frequency.exponentialRampToValueAtTime(86, t + 0.3)
      const gg = a.createGain(); env(a, gg, t, 0.3 * vel, 0.006, 0, 0.42); gu.connect(gg); gg.connect(out)
      sources.push(tak, knock, gu)
      for (const [r, peak, dec] of [[1, 0.07, 0.9], [2, 0.03, 0.5], [2.71, 0.035, 0.12], [4.13, 0.025, 0.08]] as const) {
        const o = osc(a, 'sine', f * r, t), g = a.createGain(); env(a, g, t, peak * vel, 0.003, 0, dec)
        o.connect(g); g.connect(out); track(o.frequency, r); sources.push(o)
      }
      out.gain.setValueAtTime(1.6, t)
      end = t + 0.95; break
    }
    case 'bird': {
      const o1 = osc(a, 'sine', f * 2, t); o1.frequency.exponentialRampToValueAtTime(f * 3, t + 0.05); o1.frequency.exponentialRampToValueAtTime(f * 2, t + 0.1)
      o1.connect(out); track(o1.frequency, 2); sources.push(o1)
      end = env(a, out, t, 0.12 * vel, 0.005, 0, 0.12); break
    }
  }
  // the note's own vibrato: one LFO on every pitched part, each by its own share of the sway
  if (opts.vib && opts.vib.depth > 0 && freqs.length) {
    const sway = 2 ** (Math.min(200, opts.vib.depth) / 1200) - 1, delay = Math.max(0, opts.vib.delay)
    const lfo = osc(a, 'sine', Math.max(0.1, Math.min(20, opts.vib.rate)), t)
    freqs.forEach((p, i) => {
      const g = a.createGain()
      g.gain.setValueAtTime(0, t); g.gain.setValueAtTime(0, t + delay); g.gain.linearRampToValueAtTime(f * ratios[i] * sway, t + delay + 0.15)
      lfo.connect(g); g.connect(p)
    })
    sources.push(lfo)
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
    setVolume(x: number) { level.gain.setTargetAtTime(Math.max(0, Math.min(1, x)), a.currentTime, 0.03) },
    stop(fade = 0.25) { const now = a.currentTime, d = Math.max(0.02, fade); v.end = now; out.gain.cancelScheduledValues(now); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), now); out.gain.exponentialRampToValueAtTime(0.0001, now + d); sources.forEach(s => { try { s.stop(now + d + 0.05) } catch { /* ok */ } }) },
  }
}

// ---------- ambience: percussion and drone from the scenery ----------
export type Drum = 'kick' | 'snare' | 'hat' | 'openHat' | 'shaker' | 'jingle' | 'clap' | 'taiko' | 'wood' | 'crash'
// zone: one of a zone's background (it goes through the zones' gate)
export function playDrum(kind: Drum, at = 0, vel = 1, zone = false) {
  const a = ctx()
  if (!a || !amb || ambVol <= 0) return
  const t = a.currentTime + Math.max(0, at)
  const g = a.createGain(); g.connect(kind === 'jingle' ? bus! : zone && zoneLp ? zoneLp : amb)
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
    case 'taiko': {
      // a big temple drum: a deep skin that drops in pitch, with the stick's slap on top
      const o = osc(a, 'sine', 110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.25)
      const og = a.createGain(); env(a, og, t, 1.0 * vel, 0.004, 0, 0.6); o.connect(og); og.connect(g); o.start(t); o.stop(t + 0.7)
      hit('lowpass', 900, 0.7, 0.35, 0.09); break
    }
    case 'wood': {
      // woodblock: a hollow knock, two short tuned partials
      const o = osc(a, 'sine', 1050, t), o2 = osc(a, 'sine', 1720, t)
      const og = a.createGain(); env(a, og, t, 0.28 * vel, 0.001, 0, 0.07); o.connect(og); o2.connect(og); og.connect(g); o.start(t); o.stop(t + 0.1); o2.start(t); o2.stop(t + 0.1)
      hit('bandpass', 2500, 2, 0.1, 0.02); break
    }
    case 'crash': hit('highpass', 4500, 0.5, 0.22, 1.3); hit('bandpass', 9000, 1, 0.1, 0.8); break
    case 'jingle': [0, 0.018, 0.04, 0.07].forEach((s, i) => hit('bandpass', 6500 + i * 900, 6, 0.16, 0.12, s)); break
  }
}

// one note of a zone's bass line or synth figure (zone-ambience.ts), on the ambience's bus and outside the cap on
// voices (short notes that never pile up). sub: a round sine; pluck: a saw and a square closing fast; square: a
// thin chip voice; saw: a resonant saw that squelches
export function playBass(tone: BassTone, midi: number, at = 0, dur = 0.2, vel = 1) {
  const a = ctx()
  if (!a || !amb || ambVol <= 0) return
  const t = a.currentTime + Math.max(0, at), f = midiHz(midi)
  const g = a.createGain(); g.connect(zoneLp ?? amb)
  const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.connect(g)
  if (tone === 'keys') {
    // a soft electric piano, a little out of tune like an old one: two sines a hair apart and an octave above
    // them, a quick bell of the tine on the attack, the body fading while it is held and a gentle release
    const tine = osc(a, 'sine', f * 4.02, t), tg = a.createGain()
    tg.gain.setValueAtTime(0.0001, t); tg.gain.exponentialRampToValueAtTime(0.035 * vel, t + 0.004); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    tine.connect(tg); tg.connect(lp)
    const body = [osc(a, 'sine', f * 0.9985, t), osc(a, 'sine', f * 1.0015, t), osc(a, 'triangle', f * 2, t)]
    const bg = a.createGain(); bg.gain.value = 1; body.forEach(x => x.connect(bg)); bg.connect(lp)
    lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(900, t + Math.max(0.3, dur))
    const peak = 0.06 * vel, hold = Math.max(0.05, dur), end = t + 0.012 + hold + 0.45
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.012)
    g.gain.exponentialRampToValueAtTime(peak * 0.45, t + 0.012 + hold); g.gain.exponentialRampToValueAtTime(0.0001, end)
    ;[tine, ...body].forEach(x => { x.start(t); x.stop(end + 0.05); zoneVoice(x) })
    return
  }
  const sweep = (from: number, to: number, time: number) => { lp.frequency.setValueAtTime(from, t); lp.frequency.exponentialRampToValueAtTime(to, t + Math.max(0.03, Math.min(dur, time))) }
  let o: OscillatorNode[], peak: number
  switch (tone) {
    case 'sub': o = [osc(a, 'sine', f, t), osc(a, 'triangle', f, t)]; lp.frequency.value = 520; peak = 0.4; break
    case 'pluck': o = [osc(a, 'sawtooth', f, t), osc(a, 'square', f * 1.004, t)]; lp.Q.value = 4; sweep(1800, 240, 0.25); peak = 0.18; break
    case 'square': o = [osc(a, 'square', f, t)]; lp.frequency.value = 2400; peak = 0.1; break
    case 'saw': o = [osc(a, 'sawtooth', f, t)]; lp.Q.value = 9; sweep(2600, 300, 0.18); peak = 0.15; break
  }
  const end = env(a, g, t, peak * vel, 0.006, Math.max(0, dur - 0.06), 0.08)
  o.forEach(x => { x.connect(lp); x.start(t); x.stop(end + 0.05); zoneVoice(x) })
}

// the drone: soft voices on the chord's root, fifth and third, sustained and changing note with the chord.
// Timbres: saw (two soft saws: the classic), dark (sines, closed and deep), pad (an octave up, open and airy)
const DRONES: Record<DroneTone, { waves: OscillatorType[]; up: number; cutoff: number; sweep: number; gain: number }> = {
  saw: { waves: ['sawtooth', 'sawtooth', 'sawtooth', 'triangle'], up: 1, cutoff: 420, sweep: 160, gain: 0.09 },
  dark: { waves: ['sine', 'triangle', 'sine', 'sine'], up: 1, cutoff: 260, sweep: 60, gain: 0.16 },
  pad: { waves: ['triangle', 'sawtooth', 'triangle', 'triangle'], up: 2, cutoff: 1100, sweep: 400, gain: 0.06 },
}
export function createDrone() {
  let nodes: { o: OscillatorNode[]; g: GainNode; lp: BiquadFilterNode; tone: DroneTone } | null = null
  return {
    // root: MIDI (played two octaves down); fifth: semitones above it; third: semitones above it, sounded an octave
    // higher (major 4 or minor 3: the chord's type); tone: its timbre; vol: 0..1
    set(root: number | null, fifth = 7, third = 4, tone: DroneTone = 'saw', vol = 1) {
      const a = ctx()
      if (!a || !amb) return
      const now = a.currentTime
      // silence, or another timbre: this one fades out
      if (nodes && (root === null || nodes.tone !== tone)) { const n = nodes; n.g.gain.setTargetAtTime(0.0001, now, 0.3); n.o.forEach(o => o.stop(now + 2)); nodes = null }
      if (root === null) return
      const d = DRONES[tone]
      const r = midiHz(root - 24) * d.up, f5 = Math.pow(2, fifth / 12), f3 = Math.pow(2, (12 + third) / 12)
      if (!nodes) {
        const g = a.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.setTargetAtTime(d.gain * vol, now, 0.8)
        const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = d.cutoff; lp.Q.value = 0.8
        const lfo = osc(a, 'sine', 0.13, now), lg = a.createGain(); lg.gain.value = d.sweep; lfo.connect(lg); lg.connect(lp.frequency)
        const o = [osc(a, d.waves[0], r, now), osc(a, d.waves[1], r * 1.004, now), osc(a, d.waves[2], r * f5, now), osc(a, d.waves[3], r * f3, now), lfo]
        o.slice(0, 4).forEach(x => x.connect(lp)); lp.connect(g); g.connect(zoneLp ?? amb); o.forEach(x => { x.start(now); zoneVoice(x) })
        nodes = { o, g, lp, tone }
      } else {
        const [a1, a2, a3, a4] = nodes.o
        // a quick change of note, not a slide (a slow glide between the bars' roots sounded like a moan)
        a1.frequency.setTargetAtTime(r, now, 0.015); a2.frequency.setTargetAtTime(r * 1.004, now, 0.015); a3.frequency.setTargetAtTime(r * f5, now, 0.015); a4.frequency.setTargetAtTime(r * f3, now, 0.015)
        nodes.g.gain.setTargetAtTime(d.gain * vol, now, 0.3)
      }
    },
  }
}

// a struck gong: inharmonic partials with long tails, a slight pitch sag ("wah") and a soft noise swell.
// `vel` 0..1; `midi` sets its size (lower = bigger gong). It plays on the notes' bus, or the ambience's.
export function playGong(midi: number, vel = 1, at = 0, onAmbience = false) {
  const a = ctx()
  const target = onAmbience ? amb : bus
  if (!a || !target || (onAmbience ? ambVol : noteVol) <= 0) return
  const t = a.currentTime + Math.max(0, at), f = midiHz(midi)
  const out = a.createGain(); out.gain.value = 1; out.connect(target)
  const partials: [number, number, number][] = [[1, 0.5, 3.6], [1.52, 0.32, 2.6], [2.03, 0.22, 2.0], [2.74, 0.16, 1.5], [3.31, 0.12, 1.1], [4.18, 0.08, 0.8], [5.4, 0.05, 0.5]]
  partials.forEach(([r, g0, dec]) => {
    const o = osc(a, 'sine', f * r * 1.012, t); o.frequency.exponentialRampToValueAtTime(f * r, t + 0.35)
    const g = a.createGain(); env(a, g, t, g0 * vel, 0.004 + r * 0.004, 0, dec * (0.6 + 0.4 * vel)); o.connect(g); g.connect(out)
    o.start(t); o.stop(t + dec + 0.1)
  })
  const n = noise(a), bf = a.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = f * 3; bf.Q.value = 1.5
  const ng = a.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.05 * vel, t + 0.25); ng.gain.exponentialRampToValueAtTime(0.0001, t + 2.2)
  n.connect(bf); bf.connect(ng); ng.connect(out); n.start(t, Math.random() * 0.5); n.stop(t + 2.3)
}
