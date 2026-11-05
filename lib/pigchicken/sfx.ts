// PigChicKen weapon sounds, synthesized with Web Audio (no files, nothing from the ChickenChess music engine).
// Each item has its own shot; equipping, dry fire, aiming, reloading and explosions share a few recipes.
import type { ItemId } from './items'

export type WeaponSound = 'equip' | 'shot' | 'dry' | 'aim' | 'charge' | 'reload' | 'reloadDone' | 'shell' | 'pump' | 'explode' | 'bounce' | 'swing' | 'throw' | 'bite' | 'button' | 'alienDie' | 'zombieDie' | 'block' | 'tick' | 'drink' | 'eat'

let ac: AudioContext | null = null, master: GainNode | null = null, noise: AudioBuffer | null = null
let volume = 0.6

export function setWeaponVolume(v: number) {
  volume = Math.max(0, Math.min(1, v))
  if (master) master.gain.value = volume
}

// the shared audio context (the instruments' synth plays on it too)
export function audio() {
  if (typeof window === 'undefined') return null
  if (!ac) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ac = new Ctor()
    master = ac.createGain(); master.gain.value = volume; master.connect(ac.destination)
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ac.state === 'suspended') void ac.resume()
  return ac
}

type Env = { at?: number; gain: number; attack?: number; decay: number }
// a burst of filtered noise
function hiss(a: AudioContext, { at = 0, gain, attack = 0.002, decay }: Env, filter: BiquadFilterType, freq: number, to?: number, q = 0.8) {
  const t = a.currentTime + at
  const src = a.createBufferSource(); src.buffer = noise; src.loop = true
  const f = a.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(freq, t); f.Q.value = q
  if (to) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + attack + decay)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  src.connect(f); f.connect(g); g.connect(master!)
  src.start(t, Math.random() * 0.5); src.stop(t + attack + decay + 0.05)
}
// a pitched tone that glides
function tone(a: AudioContext, { at = 0, gain, attack = 0.002, decay }: Env, type: OscillatorType, freq: number, to?: number) {
  const t = a.currentTime + at
  const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t)
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + attack + decay)
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  o.connect(g); g.connect(master!)
  o.start(t); o.stop(t + attack + decay + 0.05)
}
const click = (a: AudioContext, at: number, gain: number, freq = 3200) => hiss(a, { at, gain, decay: 0.025 }, 'highpass', freq, undefined, 0.5)

// the shot of each item: noise crack + low thump, tuned per weapon
const SHOTS: Partial<Record<ItemId, (a: AudioContext) => void>> = {
  pistol: a => { hiss(a, { gain: 0.5, decay: 0.12 }, 'lowpass', 3800, 900); tone(a, { gain: 0.35, decay: 0.09 }, 'sine', 180, 60) },
  smg: a => { hiss(a, { gain: 0.32, decay: 0.06 }, 'bandpass', 2600, 1200, 0.9); tone(a, { gain: 0.2, decay: 0.05 }, 'sine', 200, 90) },
  rifle: a => { hiss(a, { gain: 0.55, decay: 0.16 }, 'lowpass', 3200, 600); tone(a, { gain: 0.4, decay: 0.12 }, 'sine', 140, 50); click(a, 0, 0.15, 5000) },
  pump: a => { hiss(a, { gain: 0.85, decay: 0.32 }, 'lowpass', 2200, 300); tone(a, { gain: 0.55, decay: 0.22 }, 'sine', 110, 40) },
  sniper: a => { hiss(a, { gain: 0.8, decay: 0.08 }, 'highpass', 2500); hiss(a, { gain: 0.6, decay: 0.6 }, 'lowpass', 1800, 150); tone(a, { gain: 0.5, decay: 0.3 }, 'sine', 90, 35) },
  launcher: a => { hiss(a, { gain: 0.5, attack: 0.01, decay: 0.55 }, 'bandpass', 600, 2400, 1.2); tone(a, { gain: 0.35, decay: 0.2 }, 'sine', 80, 40) },
  grenade: a => { hiss(a, { gain: 0.25, attack: 0.02, decay: 0.22 }, 'bandpass', 900, 2200, 1) },
  bow: a => { tone(a, { gain: 0.3, decay: 0.25 }, 'triangle', 240, 200); hiss(a, { gain: 0.2, decay: 0.08 }, 'bandpass', 1500, 600, 1.5) },
}

export function playWeaponSound(kind: WeaponSound, item: ItemId | null) {
  const a = audio()
  if (!a || !master || volume <= 0) return
  switch (kind) {
    // Three round, wet gulps; food has two nasal, softly crunchy chews.
    case 'drink':
      for (let i = 0; i < 3; i++) {
        const at = i * 0.21
        tone(a, { at, gain: 0.18, attack: 0.025, decay: 0.11 }, 'sine', 280, 95)
        tone(a, { at: at + 0.035, gain: 0.07, attack: 0.008, decay: 0.075 }, 'triangle', 520, 170)
        hiss(a, { at: at + 0.05, gain: 0.035, decay: 0.06 }, 'bandpass', 700, 240, 3)
      }
      break
    case 'eat':
      for (let i = 0; i < 2; i++) {
        const at = i * 0.28
        tone(a, { at, gain: 0.075, attack: 0.045, decay: 0.16 }, 'triangle', 210, 125)
        hiss(a, { at: at + 0.08, gain: 0.1, attack: 0.015, decay: 0.1 }, 'bandpass', 1200, 450, 2)
        tone(a, { at: at + 0.12, gain: 0.06, attack: 0.01, decay: 0.08 }, 'sine', 340, 180)
      }
      break
    case 'shot': (SHOTS[item ?? 'pistol'] ?? SHOTS.pistol)!(a); break
    // dry fire: a small, flat click of the hammer
    case 'dry': click(a, 0, 0.12, 2200); tone(a, { gain: 0.05, decay: 0.03 }, 'square', 900, 700); break
    case 'equip':
      if (item === 'bow') { tone(a, { gain: 0.08, attack: 0.03, decay: 0.15 }, 'sawtooth', 110, 90); click(a, 0.05, 0.08, 1500) }
      else if (item === 'grenade') { click(a, 0, 0.12, 4500); click(a, 0.05, 0.08, 6000) }
      else if (item) { click(a, 0, 0.2, 2600); hiss(a, { at: 0.03, gain: 0.12, decay: 0.08 }, 'bandpass', 1400, 2600, 2); click(a, 0.1, 0.25, 2000) }
      break
    // aiming in (some weapons): a soft zoom for the sniper, a click for rifles and launchers, a creak for the bow
    case 'aim':
      if (item === 'sniper') { tone(a, { gain: 0.05, attack: 0.03, decay: 0.18 }, 'sine', 500, 1100); click(a, 0.16, 0.06, 4000) }
      else if (item === 'rifle' || item === 'launcher') click(a, 0, 0.09, 3500)
      else if (item === 'bow') tone(a, { gain: 0.05, attack: 0.05, decay: 0.2 }, 'sawtooth', 95, 120)
      break
    case 'charge':
      if (item === 'bow') tone(a, { gain: 0.06, attack: 0.15, decay: 0.5 }, 'sawtooth', 80, 140)
      else if (item === 'grenade') click(a, 0, 0.15, 5000)
      break
    case 'reload': click(a, 0, 0.18, 1800); hiss(a, { at: 0.04, gain: 0.1, decay: 0.12 }, 'bandpass', 900, 2200, 2); break
    case 'reloadDone': click(a, 0, 0.25, 2200); click(a, 0.07, 0.2, 3000); break
    case 'shell': click(a, 0, 0.16, 1600); tone(a, { gain: 0.05, decay: 0.05 }, 'triangle', 600, 400); break
    case 'pump': hiss(a, { gain: 0.18, decay: 0.07 }, 'bandpass', 1200, 700, 2); click(a, 0.12, 0.22, 1800); break
    case 'explode': hiss(a, { gain: 0.9, attack: 0.005, decay: 0.9 }, 'lowpass', 1400, 80); tone(a, { gain: 0.7, decay: 0.6 }, 'sine', 70, 28); break
    case 'bounce': tone(a, { gain: 0.08, decay: 0.05 }, 'triangle', 320, 220); break
    case 'swing': hiss(a, { gain: 0.12, attack: 0.03, decay: 0.12 }, 'bandpass', 500, 1500, 1.2); break
    case 'bite': hiss(a, { gain: 0.3, decay: 0.12 }, 'bandpass', 700, 300, 1.5); tone(a, { gain: 0.2, decay: 0.15 }, 'square', 160, 90); break
    case 'button': tone(a, { gain: 0.12, decay: 0.08 }, 'square', 880); tone(a, { at: 0.08, gain: 0.12, decay: 0.12 }, 'square', 1320); break
    case 'alienDie': tone(a, { gain: 0.15, decay: 0.25 }, 'square', 900, 120); hiss(a, { gain: 0.15, decay: 0.15 }, 'highpass', 2000); break
    case 'zombieDie': tone(a, { gain: 0.18, attack: 0.02, decay: 0.5 }, 'sawtooth', 140, 60); break
    // a hit that glances off a shield: a bright metallic tink
    case 'block': tone(a, { gain: 0.1, decay: 0.12 }, 'triangle', 2400, 2100); tone(a, { gain: 0.06, decay: 0.2 }, 'sine', 3700); click(a, 0, 0.1, 5000); break
    // the inventory wheel: a very soft tick when the pointer passes onto another item
    case 'tick': tone(a, { gain: 0.018, attack: 0.001, decay: 0.018 }, 'sine', 2100, 1700); click(a, 0, 0.025, 4200); break
    case 'throw': hiss(a, { gain: 0.15, attack: 0.03, decay: 0.2 }, 'bandpass', 400, 1200, 1); break
  }
}
