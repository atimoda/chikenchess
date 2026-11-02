// The temple's music (Templo do Gongo): one zone per stage, layers that pile up stage after stage, the melody
// that every kill plays one note of, and the mini-game's own sounds (gong, fanfare, hits). PigChicKen's synth only.
import type { Zone } from './music'
import { scaleNotes } from './music'
import { audio } from './sfx'
import { playDrum, playGong, playNote } from './synth'

// a layer of the stage's music: each stage adds one or two to the ones before
export type Layer = 'gong' | 'taiko' | 'wood' | 'hat' | 'bass' | 'snare' | 'pluck' | 'flute' | 'bells' | 'double' | 'crash'

// the temple before (and between) the stages: slow, chimes in the wind and a low drone
export const TEMPLE_IDLE: Zone = { id: 'templo', name: 'Templo', root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 76, feel: 'straight', progression: [0, 5, 3, 4], color: '#ffd166' }

export type StageMusic = { zone: Zone; layers: Layer[]; melody: number[] }
// melody: indexes in the zone's scale from its root (0 = root, 5 = root an octave up in a pentatonic)
export const STAGE_MUSIC: StageMusic[] = [
  { zone: { id: 'templo1', name: 'Despertar', root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 92, feel: 'straight', progression: [0, 5, 3, 4], color: '#c77dff' },
    layers: ['gong', 'taiko', 'wood'], melody: [0, 1, 2, 4, 3, 2, 1, 2, 4, 5, 4, 2, 3, 2, 1, 0] },
  { zone: { id: 'templo2', name: 'Lanternas', root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 100, feel: 'straight', progression: [0, 3, 5, 4], color: '#e63946' },
    layers: ['gong', 'taiko', 'wood', 'hat', 'bass'], melody: [4, 5, 7, 5, 4, 2, 4, 3, 2, 1, 2, 4, 2, 1, 0, 1] },
  { zone: { id: 'templo3', name: 'Couraça', root: 57, scale: 'minorPenta', chordScale: 'minor', bpm: 108, feel: 'straight', progression: [0, 5, 6, 4], color: '#6a994e' },
    layers: ['gong', 'taiko', 'hat', 'bass', 'snare', 'pluck'], melody: [0, 2, 3, 4, 3, 2, 0, 1, 2, 4, 5, 4, 3, 2, 1, 0] },
  { zone: { id: 'templo4', name: 'Gêmeos', root: 57, scale: 'minorPenta', chordScale: 'minor', bpm: 116, feel: 'swing', progression: [0, 3, 6, 4], color: '#4cc9f0' },
    layers: ['gong', 'taiko', 'hat', 'bass', 'snare', 'pluck', 'flute'], melody: [5, 4, 5, 7, 6, 5, 4, 2, 3, 4, 2, 1, 2, 0, 1, 2] },
  { zone: { id: 'templo5', name: 'Tambores', root: 60, scale: 'majorPenta', chordScale: 'dorian', bpm: 124, feel: 'straight', progression: [0, 3, 0, 4], color: '#ffb703' },
    layers: ['gong', 'taiko', 'wood', 'double', 'bass', 'snare', 'pluck', 'flute', 'bells'], melody: [0, 2, 4, 2, 5, 4, 2, 4, 6, 5, 4, 2, 3, 4, 2, 0] },
  { zone: { id: 'templo6', name: 'Dragão', root: 55, scale: 'minorPenta', chordScale: 'harmonicMinor', bpm: 132, feel: 'straight', progression: [0, 5, 3, 4], color: '#ff6b35' },
    layers: ['gong', 'taiko', 'wood', 'double', 'bass', 'snare', 'pluck', 'flute', 'bells', 'crash'], melody: [5, 7, 8, 7, 5, 4, 5, 2, 4, 5, 7, 9, 8, 7, 5, 4] },
]

// a note of the stage's melody (index wraps) in a singing register
export function melodyNote(m: StageMusic, i: number) {
  const pool = scaleNotes(m.zone.root, m.zone.scale, m.zone.root, m.zone.root + 36)
  const k = m.melody[((i % m.melody.length) + m.melody.length) % m.melody.length]
  return pool[Math.min(pool.length - 1, k)]
}

// the ambience of one sixteenth: `bar` counts bars, `chord` is the chord now, spb seconds per beat.
// `stage` null: the temple at rest.
export function templeAmbience(stage: StageMusic | null, step: number, bar: number, chord: number[], spb: number) {
  if (!stage) {
    // at rest: a soft gong every four bars, a woodblock now and then, chimes in the wind
    if (step === 0 && bar % 4 === 0) playGong(chord[0] - 24, 0.35, 0, true)
    if (step === 8 && bar % 2 === 1) playDrum('wood', 0, 0.4)
    if (step % 4 === 2 && Math.random() < 0.18) playNote('bells', chord[Math.floor(Math.random() * chord.length)] + 12, { vel: 0.25, dur: 0.4 })
    return
  }
  const L = new Set(stage.layers)
  const s16 = spb / 4
  const swing = stage.zone.feel === 'swing' && step % 4 === 2 ? s16 * 0.33 : 0
  if (L.has('gong') && step === 0 && bar % 4 === 0) playGong(chord[0] - 24, 0.6, 0, true)
  if (L.has('crash') && step === 0 && bar % 2 === 0) playDrum('crash', 0, 0.7)
  if (L.has('taiko')) {
    if (step === 0 || step === 8) playDrum('taiko', 0, 1)
    if (step === 11 || (L.has('snare') && step === 14)) playDrum('taiko', 0, 0.55)
  }
  if (L.has('wood') && (step === 2 || step === 6 || step === 10 || step === 14)) playDrum('wood', swing, step === 6 ? 0.7 : 0.5)
  if (L.has('snare') && (step === 4 || step === 12)) playDrum(stage.zone.feel === 'swing' ? 'clap' : 'snare', 0, 0.8)
  if (L.has('double')) playDrum('hat', swing, step % 4 === 0 ? 0.8 : 0.45)
  else if (L.has('hat') && step % 2 === 0) playDrum('hat', swing, step % 4 === 0 ? 0.8 : 0.5)
  if (L.has('bass') && (step === 0 || step === 3 || step === 8 || step === 11)) playNote('bass', chord[0] - 24 + (step === 11 ? 7 : 0), { vel: step === 0 ? 0.9 : 0.6, dur: s16 * 2 })
  if (L.has('pluck') && step % 2 === 0) {
    // the guzheng runs up and down the chord in eighths
    const order = [0, 1, 2, 3, 2, 1, 2, 3]
    const tones = [chord[0], chord[1], chord[2], chord[0] + 12]
    playNote('guzheng', tones[order[(step / 2) % 8]] + 12, { at: swing, vel: 0.35, dur: 0.2 })
  }
  if (L.has('flute') && step === 0) playNote('flute', melodyNote(stage, bar * 2) + 12, { vel: 0.4, dur: spb * 1.8 })
  if (L.has('flute') && step === 8) playNote('flute', melodyNote(stage, bar * 2 + 1) + 12, { vel: 0.35, dur: spb * 1.6 })
  if (L.has('bells') && (step === 0 || step === 10)) playNote('bells', chord[step === 0 ? 2 : 1] + 12, { vel: 0.3, dur: 0.3 })
}

// ---------- the mini-game's sounds ----------
export type TempleSound =
  | { kind: 'gong'; hit: number; need: number } // the totem struck: rises with each hit
  | { kind: 'gongDull' } // struck while a stage is on
  | { kind: 'stageStart'; root: number }
  | { kind: 'clear'; root: number; chord: number[] }
  | { kind: 'victory'; root: number; chord: number[] }
  | { kind: 'fail' }
  | { kind: 'hurt' }
  | { kind: 'dive' }
  | { kind: 'bomb' }
  | { kind: 'fire' }
  | { kind: 'split' }
  | { kind: 'clank' }
  | { kind: 'roar' }
  | { kind: 'judge'; grade: 'perfect' | 'good' | 'miss'; midi: number }
  | { kind: 'kill'; midi: number; combo: number; at: number }

// small helpers on the shared context (the weapon sounds' master bus is not reachable from here, so these
// go straight to the destination at a modest level)
function blip(type: OscillatorType, f0: number, f1: number, gain: number, dur: number, at = 0) {
  const a = audio(); if (!a) return
  const t = a.currentTime + at
  const o = a.createOscillator(), g = a.createGain()
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur)
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.05)
}
function whoosh(f0: number, f1: number, gain: number, dur: number) {
  const a = audio(); if (!a) return
  const t = a.currentTime
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = a.createBufferSource(); src.buffer = buf
  const bf = a.createBiquadFilter(); bf.type = 'bandpass'; bf.Q.value = 2; bf.frequency.setValueAtTime(f0, t); bf.frequency.exponentialRampToValueAtTime(f1, t + dur)
  const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(bf); bf.connect(g); g.connect(a.destination); src.start(t); src.stop(t + dur + 0.05)
}

export function playTempleSound(s: TempleSound, volume: number) {
  if (volume <= 0) return
  const v = Math.min(1, volume * 1.4)
  switch (s.kind) {
    case 'gong': {
      // each hit a little higher and louder, the last one big and low with a cymbal swell
      const last = s.hit >= s.need
      playGong(last ? 43 : 50 + s.hit * 2, last ? 1 : 0.5 + 0.1 * s.hit)
      if (last) { playDrum('crash', 0.02, 0.8); playDrum('taiko', 0, 1) }
      break
    }
    case 'gongDull': playGong(55, 0.25); break
    case 'stageStart': [0, 2, 4, 7].forEach((st, i) => playNote('guzheng', s.root + 12 + st, { at: i * 0.09, vel: 0.6, dur: 0.3 })); playDrum('taiko', 0.36, 1); break
    case 'clear': {
      // a fanfare: the chord rolled up on the guzheng and bells, a final gong
      const up = [s.chord[0], s.chord[1], s.chord[2], s.chord[0] + 12, s.chord[1] + 12, s.chord[2] + 12]
      up.forEach((m, i) => { playNote('guzheng', m + 12, { at: i * 0.07, vel: 0.65, dur: 0.5 }); playNote('bells', m + 12, { at: i * 0.07 + 0.02, vel: 0.35, dur: 0.4 }) })
      playNote('flute', s.chord[0] + 24, { at: 0.45, vel: 0.6, dur: 1.2 })
      playGong(s.root - 12, 0.9, 0.42)
      break
    }
    case 'victory': {
      const up = [s.chord[0], s.chord[1], s.chord[2], s.chord[0] + 12, s.chord[1] + 12, s.chord[2] + 12, s.chord[0] + 24]
      up.forEach((m, i) => { playNote('guzheng', m + 12, { at: i * 0.1, vel: 0.7, dur: 0.6 }); playNote('bells', m + 12, { at: i * 0.1 + 0.03, vel: 0.45, dur: 0.5 }) })
      ;[0, 0.8, 1.6].forEach(at => playGong(s.root - 12 - at * 3, 1, at))
      playDrum('crash', 0.8, 1)
      break
    }
    case 'fail': [0, 0.18, 0.36].forEach((at, i) => playNote('bass', 50 - i * 3, { at, vel: 0.8, dur: 0.3 })); playGong(38, 0.8, 0.5); break
    case 'hurt': blip('square', 320, 90, 0.18 * v, 0.25); whoosh(900, 200, 0.2 * v, 0.2); break
    case 'dive': blip('sine', 1500, 380, 0.08 * v, 0.6); break
    case 'bomb': blip('square', 520, 260, 0.05 * v, 0.12); break
    case 'fire': whoosh(400, 2200, 0.18 * v, 0.35); blip('sawtooth', 160, 80, 0.06 * v, 0.3); break
    case 'split': blip('sine', 400, 1400, 0.1 * v, 0.12); blip('sine', 600, 1800, 0.08 * v, 0.12, 0.06); break
    case 'clank': blip('triangle', 1700, 1500, 0.1 * v, 0.15); blip('square', 240, 200, 0.05 * v, 0.06); break
    case 'roar': whoosh(180, 900, 0.35 * v, 1.1); blip('sawtooth', 90, 55, 0.12 * v, 1.0); break
    case 'judge':
      if (s.grade === 'perfect') playNote('bells', s.midi + 24, { vel: 0.35, dur: 0.15 })
      else if (s.grade === 'good') playNote('bells', s.midi + 19, { vel: 0.18, dur: 0.1 })
      break
    case 'kill':
      // every alien down plays the next note of the stage's melody, on the grid; a long combo doubles it on bells
      playNote('guzheng', s.midi, { at: s.at, vel: 0.75, dur: 0.35 })
      if (s.combo >= 8) playNote('bells', s.midi + 12, { at: s.at, vel: 0.35, dur: 0.3 })
      break
  }
}
