// The Bateria's sound (lib/pigchicken/drum-kit.ts): an acoustic kit made of plain Web Audio, on the notes' bus of
// PigChicKen's synth (lib/pigchicken/synth.ts, voice `kit`).
//   drums: a skin is a sine that drops in pitch right after the stroke (the head stretched by the stick), a second
//     mode above it that dies fast, and the stick's tick. The Bumbo adds the beater's click and a short low thud;
//     the Caixa its snare wires (bright noise that outlasts the shell).
//   cymbals: bronze has no harmonic series. Six square waves at fixed inharmonic ratios, band-passed and high-passed,
//     make the metal; filtered noise on top makes the wash. The Chimbal is that, short; open, it rings for as long
//     as the pedal lets it (`open`), and the note it gives back can still be damped (setVolume) or stopped. The
//     Condução is a clear ping over a quiet wash, its Sino a few pure partials; Ataque and Splash are mostly wash;
//     the China is lower and dirtier, clipped a little.
// A soft hit is duller as well as quieter (a low-pass that opens with the stroke).
// The knocks (a click between the pieces): short dry noises of the kit's hardware, each a few partials and a tick,
// tuned a little differently every time so two of the same never sound alike.
import type { DrumKnock, DrumPiece } from './drum-kit'
import { noteBus, type Held } from './synth'

const METAL = [1, 1.342, 1.2312, 1.6532, 1.9523, 2.1523]
// (a soft stroke on bronze stays bright: only the skins get duller)
const CYMBALS = new Set<DrumPiece>(['hat', 'hatOpen', 'ride', 'bell', 'crash', 'china', 'splash'])
const DRIVE = (() => { const c = new Float32Array(257); for (let i = 0; i < 257; i++) { const x = (i - 128) / 128; c[i] = Math.tanh(x * 2.6) } return c })()

/**
 * One hit of a piece of the kit, on the game's synth (null: no sound now). `at`: s from now; `vel`: how hard (0..1); `open`: an open Chimbal's pedal (0..1,
 * how long it rings); `light`: a stroke of a roll (shorter, less shell).
 */
export function playKit(piece: DrumPiece, opts: KitHit = {}): Held | null {
  const b = noteBus()
  return b ? renderKit(b, piece, opts) : null
}
export type KitHit = { at?: number; vel?: number; open?: number; light?: boolean }
// where a hit is built: the audio context, the node it plays into, a source of white noise and the voices' cap
export type KitBus = { a: BaseAudioContext; bus: AudioNode; noise: () => AudioBufferSourceNode; admit: (v: { end: number; kill: (t: number) => void }) => void }
/** The same hit on any audio context (the game's, or an offline one to listen to the kit by itself). */
export function renderKit(b: KitBus, piece: DrumPiece, opts: KitHit = {}): Held {
  const { a, bus } = b
  const t = a.currentTime + Math.max(0, opts.at ?? 0)
  const vel = Math.max(0.03, Math.min(1, opts.vel ?? 0.8)), amp = Math.pow(vel, opts.light ? 1 : 1.25)
  const out = a.createGain(); out.gain.value = 0.75
  // the damper of a ringing cymbal (the Chimbal's pedal closing on it)
  const level = a.createGain(); level.gain.value = 1
  const tone = a.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = CYMBALS.has(piece) ? 5000 + 14000 * vel : 1800 + 17000 * vel * vel; tone.Q.value = 0.3
  out.connect(tone); tone.connect(level); level.connect(bus)
  const sources: AudioScheduledSourceNode[] = []
  let end = t + 0.1
  const env = (g: GainNode, peak: number, attack: number, dec: number, start = 0) => {
    g.gain.setValueAtTime(0.0001, t + start)
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + start + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + start + attack + dec)
    end = Math.max(end, t + start + attack + dec)
  }
  const nz = (type: BiquadFilterType, fq: number, q: number, peak: number, dec: number, attack = 0.001, into: AudioNode = out) => {
    const n = b.noise(), f = a.createBiquadFilter(); f.type = type; f.frequency.value = fq; f.Q.value = q
    const g = a.createGain(); env(g, peak * amp, attack, dec); n.connect(f); f.connect(g); g.connect(into); sources.push(n)
    return f
  }
  const skin = (f0: number, drop: number, glide: number, peak: number, dec: number, type: OscillatorType = 'sine') => {
    const o = a.createOscillator(); o.type = type
    o.frequency.setValueAtTime(f0 * drop, t); o.frequency.exponentialRampToValueAtTime(f0, t + glide)
    const g = a.createGain(); env(g, peak * amp, 0.002, dec); o.connect(g); g.connect(out); sources.push(o)
  }
  const metal = (f0: number, hp: number, bp: number, q: number, peak: number, dec: number, attack = 0.001, into: AudioNode = out) => {
    const mix = a.createGain(); mix.gain.value = 1 / METAL.length
    METAL.forEach(r => { const o = a.createOscillator(); o.type = 'square'; o.frequency.value = f0 * r; o.connect(mix); sources.push(o) })
    const band = a.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = bp; band.Q.value = q
    const high = a.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = hp
    const g = a.createGain(); env(g, peak * amp, attack, dec); mix.connect(band); band.connect(high); high.connect(g); g.connect(into)
  }
  const tom = (f: number, dec: number) => {
    skin(f, 1.4, 0.06, 0.8, dec); skin(f * 1.59, 1.2, 0.03, 0.22, dec * 0.35)
    nz('bandpass', 2600, 0.8, 0.22, 0.02); nz('lowpass', f * 3, 0.5, 0.2, 0.05)
  }
  switch (piece) {
    case 'kick':
      skin(54, 2.6, 0.075, 1, 0.34); skin(108, 1.8, 0.03, 0.3, 0.09, 'triangle')
      nz('bandpass', 3600, 1, 0.3, 0.014); nz('lowpass', 420, 0.6, 0.45, 0.06)
      break
    case 'snare': {
      const k = opts.light ? 0.45 : 1
      skin(182, 1.25, 0.03, 0.55 * k, 0.11); skin(331, 1.1, 0.02, 0.3 * k, 0.07); skin(478, 1, 0.01, 0.12 * k, 0.04, 'triangle')
      nz('highpass', 1900, 0.5, 0.5, opts.light ? 0.07 : 0.13 + 0.08 * vel); nz('bandpass', 4600, 0.7, 0.32, opts.light ? 0.05 : 0.1 + 0.06 * vel)
      nz('bandpass', 900, 0.9, 0.22 * k, 0.05)
      break
    }
    case 'tom1': tom(168, 0.34); break
    case 'tom2': tom(126, 0.42); break
    case 'floor': tom(84, 0.6); break
    case 'hat': case 'hatOpen': {
      // (the pedal: closed, a tick; open, it rings longer the wider it is)
      const o = piece === 'hatOpen' ? 1 : Math.max(0, Math.min(1, opts.open ?? 0))
      const dec = o > 0 ? 0.25 + 1.25 * o : 0.05 + 0.03 * vel
      metal(540, 6800, 9500, 0.6, o > 0 ? 0.8 : 1.5, dec)
      nz('highpass', o > 0 ? 6200 : 8200, 0.6, o > 0 ? 0.45 : 0.55, dec * 0.8)
      nz('bandpass', 5200, 1.2, 0.16, 0.012)
      break
    }
    case 'ride':
      metal(410, 3200, 5600, 0.9, 1.2, 1.7); metal(626, 5000, 8200, 1.4, 0.55, 0.9)
      nz('highpass', 5200, 0.5, 0.26, 1.3, 0.02); nz('bandpass', 4200, 1.5, 0.55, 0.012)
      break
    case 'bell':
      for (const [f, peak, dec] of [[612, 0.22, 1.3], [918, 0.2, 1.1], [1474, 0.15, 0.8], [2188, 0.1, 0.5], [3120, 0.06, 0.3]] as const) skin(f, 1.004, 0.02, peak, dec)
      metal(520, 4200, 6400, 1.6, 0.12, 0.7); nz('bandpass', 3800, 1.5, 0.22, 0.012)
      break
    case 'crash':
      nz('highpass', 3000, 0.4, 0.5, 1.9, 0.004); nz('bandpass', 6800, 0.6, 0.3, 1.2, 0.004)
      metal(332, 2600, 5200, 0.5, 0.5, 1.5, 0.003)
      break
    case 'splash':
      nz('highpass', 5200, 0.4, 0.46, 0.5, 0.003); metal(468, 4600, 8200, 0.6, 0.42, 0.4, 0.002)
      break
    case 'china': {
      // through a little clipping: the upturned edge's dirt
      const drive = a.createWaveShaper(); drive.curve = DRIVE
      const dg = a.createGain(); dg.gain.value = 0.55; drive.connect(dg); dg.connect(out)
      metal(238, 1500, 3200, 0.5, 0.9, 1.1, 0.002, drive); metal(377, 2400, 4700, 0.7, 0.5, 0.8, 0.002, drive)
      nz('bandpass', 2700, 0.6, 0.6, 0.9, 0.003, drive); nz('highpass', 4200, 0.4, 0.22, 1.2, 0.004)
      break
    }
  }
  const stopAt = end + 0.05
  sources.forEach(s => { if (s instanceof AudioBufferSourceNode) s.start(t, Math.random() * 0.5); else s.start(t); s.stop(stopAt) })
  const kill = (at: number) => {
    out.gain.cancelScheduledValues(at); out.gain.setValueAtTime(out.gain.value, at); out.gain.linearRampToValueAtTime(0, at + 0.04)
    sources.forEach(s => { try { s.stop(at + 0.06) } catch { /* already stopped */ } })
  }
  const v = { end: stopAt, kill }
  b.admit(v)
  return {
    setPitch() { /* a drum has one pitch */ },
    setVolume(x: number) { level.gain.setTargetAtTime(Math.max(0, Math.min(1, x)), a.currentTime, 0.02) },
    stop(fade = 0.03) { const now = a.currentTime, d = Math.max(0.01, fade); v.end = now; level.gain.cancelScheduledValues(now); level.gain.setTargetAtTime(0, now, d / 3); sources.forEach(s => { try { s.stop(now + d + 0.05) } catch { /* already stopped */ } }) },
  }
}

/** A knock on the kit's hardware, on the game's synth. `tune`: its pitch, around 1 (a little off each time). */
export function playKnock(kind: DrumKnock, vel = 0.8, tune = 0.92 + Math.random() * 0.16) {
  const b = noteBus()
  if (b) renderKnock(b, kind, vel, tune)
}
/** The same knock on any audio context. */
export function renderKnock(b: KitBus, kind: DrumKnock, vel = 0.8, tune = 1) {
  const { a, bus } = b, t = a.currentTime, amp = Math.pow(Math.max(0.05, Math.min(1, vel)), 1.2)
  const out = a.createGain(); out.gain.value = 0.6; out.connect(bus)
  const sources: AudioScheduledSourceNode[] = []
  let end = t + 0.05
  const env = (g: GainNode, peak: number, dec: number) => {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * amp), t + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.001 + dec)
    end = Math.max(end, t + 0.001 + dec)
  }
  const ping = (f: number, peak: number, dec: number, drop = 1, type: OscillatorType = 'sine') => {
    const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f * tune * drop, t); if (drop !== 1) o.frequency.exponentialRampToValueAtTime(f * tune, t + 0.02)
    const g = a.createGain(); env(g, peak, dec); o.connect(g); g.connect(out); sources.push(o)
  }
  const tick = (type: BiquadFilterType, fq: number, q: number, peak: number, dec: number) => {
    const n = b.noise(), f = a.createBiquadFilter(); f.type = type; f.frequency.value = fq * tune; f.Q.value = q
    const g = a.createGain(); env(g, peak, dec); n.connect(f); f.connect(g); g.connect(out); sources.push(n)
  }
  switch (kind) {
    // the stick across the Caixa's rim: a woody click with a little of the shell under it
    case 'rim': ping(1720, 0.5, 0.03); ping(830, 0.4, 0.045); ping(340, 0.2, 0.06); tick('bandpass', 3200, 1.5, 0.5, 0.012); break
    // stick on stick
    case 'sticks': ping(2350, 0.55, 0.022); ping(3480, 0.3, 0.015); tick('highpass', 5000, 0.7, 0.3, 0.006); break
    // the wood of a tom's shell
    case 'shell': ping(430, 0.6, 0.07, 1.15); ping(1010, 0.22, 0.03); tick('lowpass', 1400, 0.7, 0.35, 0.02); break
    // a stand's steel tube ringing
    case 'stand': ping(1180, 0.3, 0.16); ping(2890, 0.22, 0.11); ping(4310, 0.12, 0.07); tick('bandpass', 6000, 2, 0.25, 0.008); break
    // a metal hoop
    case 'hoop': ping(2080, 0.4, 0.035); ping(5150, 0.2, 0.02); tick('bandpass', 5600, 4, 0.5, 0.02); break
    // the Bumbo's or the Surdo's shell, low and hollow
    case 'thud': ping(196, 0.7, 0.1, 1.3); ping(505, 0.2, 0.04); tick('lowpass', 700, 0.6, 0.4, 0.03); break
    // the stick's tip on a cymbal's edge
    case 'edge': for (const r of [1, 1.342, 1.6532, 2.1523]) ping(3050 * r, 0.14, 0.09, 1, 'square'); tick('highpass', 8000, 0.7, 0.3, 0.03); break
  }
  sources.forEach(s => { if (s instanceof AudioBufferSourceNode) s.start(t, Math.random() * 0.5); else s.start(t); s.stop(end + 0.05) })
  b.admit({ end: end + 0.05, kill: at => { out.gain.setValueAtTime(out.gain.value, at); out.gain.linearRampToValueAtTime(0, at + 0.03) } })
}
