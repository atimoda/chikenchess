// The temple's music (Templo do Gongo): one zone per stage, layers that pile up stage after stage, the melody
// that every kill plays one note of, and the mini-game's own sounds (gong, fanfare, hits). PigChicKen's synth only.
import type { Zone } from './music'
import { scaleNotes } from './music'
import { audio } from './sfx'
import { playDrum, playGong, playNote } from './synth'
import type { NoteStageSound } from './note-stage'

// a layer of the stage's music: each stage adds one or two to the ones before
export type Layer = 'gong' | 'taiko' | 'wood' | 'hat' | 'bass' | 'snare' | 'pluck' | 'flute' | 'bells' | 'double' | 'crash'

// the temple before (and between) the stages: slow, chimes in the wind and a low drone
export const TEMPLE_IDLE: Zone = { id: 'templo', name: 'Templo', root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 76, feel: 'straight', progression: [0, 5, 3, 4], color: '#ffd166' }

// groove picks the stage's bass line, guzheng arpeggio and riff (more busy as the stages go)
export type StageMusic = { zone: Zone; layers: Layer[]; melody: number[]; groove: number }
// melody: indexes in the zone's scale from its root (0 = root, 5 = root an octave up in a pentatonic)
export const STAGE_MUSIC: StageMusic[] = [
  { zone: { id: 'templo1', name: 'Despertar', root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 92, feel: 'straight', progression: [0, 5, 3, 4], color: '#c77dff' },
    layers: ['gong', 'taiko', 'wood'], melody: [0, 1, 2, 4, 3, 2, 1, 2, 4, 5, 4, 2, 3, 2, 1, 0], groove: 0 },
  { zone: { id: 'templo2', name: 'Lanternas', root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 100, feel: 'straight', progression: [0, 3, 5, 4], color: '#e63946' },
    layers: ['gong', 'taiko', 'wood', 'hat', 'bass'], melody: [4, 5, 7, 5, 4, 2, 4, 3, 2, 1, 2, 4, 2, 1, 0, 1], groove: 1 },
  { zone: { id: 'templo3', name: 'Couraça', root: 57, scale: 'minorPenta', chordScale: 'minor', bpm: 108, feel: 'straight', progression: [0, 5, 6, 4], color: '#6a994e' },
    layers: ['gong', 'taiko', 'hat', 'bass', 'snare', 'pluck'], melody: [0, 2, 3, 4, 3, 2, 0, 1, 2, 4, 5, 4, 3, 2, 1, 0], groove: 2 },
  { zone: { id: 'templo4', name: 'Gêmeos', root: 57, scale: 'minorPenta', chordScale: 'minor', bpm: 116, feel: 'swing', progression: [0, 3, 6, 4], color: '#4cc9f0' },
    layers: ['gong', 'taiko', 'hat', 'bass', 'snare', 'pluck', 'flute'], melody: [5, 4, 5, 7, 6, 5, 4, 2, 3, 4, 2, 1, 2, 0, 1, 2], groove: 3 },
  { zone: { id: 'templo5', name: 'Tambores', root: 60, scale: 'majorPenta', chordScale: 'dorian', bpm: 124, feel: 'straight', progression: [0, 3, 0, 4], color: '#ffb703' },
    layers: ['gong', 'taiko', 'wood', 'double', 'bass', 'snare', 'pluck', 'flute', 'bells'], melody: [0, 2, 4, 2, 5, 4, 2, 4, 6, 5, 4, 2, 3, 4, 2, 0], groove: 4 },
  { zone: { id: 'templo6', name: 'Dragão', root: 55, scale: 'minorPenta', chordScale: 'harmonicMinor', bpm: 132, feel: 'straight', progression: [0, 5, 3, 4], color: '#ff6b35' },
    layers: ['gong', 'taiko', 'wood', 'double', 'bass', 'snare', 'pluck', 'flute', 'bells', 'crash'], melody: [5, 7, 8, 7, 5, 4, 5, 2, 4, 5, 7, 9, 8, 7, 5, 4], groove: 5 },
]

// a note of the stage's melody (index wraps) in a singing register
export function melodyNote(m: StageMusic, i: number) {
  const pool = scaleNotes(m.zone.root, m.zone.scale, m.zone.root, m.zone.root + 36)
  const k = m.melody[((i % m.melody.length) + m.melody.length) % m.melody.length]
  return pool[Math.min(pool.length - 1, k)]
}

// The arrangement: bars come in phrases of 16, in four sections of 4 bars:
//   A  (bars 0-3)   the groove and the arpeggio
//   A' (bars 4-7)   the same with the flute's call and the bells' answer
//   B  (bars 8-11)  the guzheng takes a riff from the melody, the bass walks, the hats open up
//   C  (bars 12-15) a breakdown (two bars of taiko and tremolo) and a build (rolls and rising hats) back to A
// and the last bar of every section ends with a taiko fill. Each stage picks its own bass line and riff shape.
type Section = 'A' | 'A2' | 'B' | 'break' | 'build'
export function sectionOf(bar: number): Section {
  const b = ((bar % 16) + 16) % 16
  return b < 4 ? 'A' : b < 8 ? 'A2' : b < 12 ? 'B' : b < 14 ? 'break' : 'build'
}
// the bass lines (sixteenths: [step, interval from the chord root, accent]); a stage uses BASS[groove]
const BASS: [number, number, number][][] = [
  [[0, 0, 1], [8, 0, 0.7]],
  [[0, 0, 1], [3, 0, 0.6], [8, 0, 0.8], [11, 7, 0.6]],
  [[0, 0, 1], [6, 7, 0.6], [8, 12, 0.7], [10, 7, 0.5], [14, 5, 0.6]],
  [[0, 0, 1], [2, 0, 0.5], [4, 7, 0.6], [6, 0, 0.5], [8, 10, 0.7], [10, 7, 0.5], [12, 5, 0.7], [14, 3, 0.5]],
  [[0, 0, 1], [3, 12, 0.6], [6, 0, 0.7], [8, 7, 0.8], [11, 10, 0.6], [14, 12, 0.7]],
  [[0, 0, 1], [1, 0, 0.5], [4, 0, 0.8], [7, 3, 0.6], [8, 5, 0.8], [10, 7, 0.7], [12, 0, 0.9], [14, 10, 0.6]],
]
// the guzheng's arpeggio orders (chord tones 0..3, 3 = the root an octave up)
const ARP = [[0, 1, 2, 3, 2, 1, 2, 3], [0, 2, 1, 3, 0, 2, 3, 1], [3, 2, 0, 1, 3, 2, 1, 2], [0, 1, 3, 1, 2, 3, 2, 1]]
// the taiko fills at the end of a section: steps of the last bar's second half
const FILLS = [[12, 14], [12, 13, 14, 15], [10, 12, 13, 14, 15], [8, 10, 11, 12, 13, 14, 15]]

let idleNote = 2 // the wind chimes' wandering note at rest (index in the pentatonic)

// the ambience of one sixteenth: `bar` counts bars, `chord` is the chord now, spb seconds per beat.
// `stage` null: the temple at rest.
export function templeAmbience(stage: StageMusic | null, step: number, bar: number, chord: number[], spb: number) {
  if (!stage) {
    // at rest: a soft gong every four bars, a woodblock now and then, a guzheng wandering the pentatonic,
    // chimes in the wind and, every other phrase, a slow flute
    if (step === 0 && bar % 4 === 0) playGong(chord[0] - 24, 0.35, 0, true)
    if (step === 8 && bar % 2 === 1) playDrum('wood', 0, 0.4)
    if (step === 0 || step === 6 || (step === 10 && bar % 2 === 0)) {
      const pool = scaleNotes(TEMPLE_IDLE.root, TEMPLE_IDLE.scale, TEMPLE_IDLE.root, TEMPLE_IDLE.root + 24)
      idleNote = Math.max(0, Math.min(pool.length - 1, idleNote + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]))
      playNote('guzheng', pool[idleNote], { vel: 0.28, dur: 0.6 })
    }
    if (step === 0 && bar % 8 === 4) playNote('flute', chord[1] + 12, { vel: 0.22, dur: spb * 3.5 })
    if (step % 4 === 2 && Math.random() < 0.18) playNote('bells', chord[Math.floor(Math.random() * chord.length)] + 12, { vel: 0.25, dur: 0.4 })
    return
  }
  const L = new Set(stage.layers)
  const sec = sectionOf(bar)
  const lastOfSection = bar % 4 === 3
  const groove = stage.groove
  const s16 = spb / 4
  const swing = stage.zone.feel === 'swing' && step % 4 === 2 ? s16 * 0.33 : 0
  const tones = [chord[0], chord[1], chord[2], chord[0] + 12]
  const fill = lastOfSection && L.has('taiko') && step >= 8 ? FILLS[Math.min(FILLS.length - 1, Math.floor(groove / 2) + (sec === 'build' ? 1 : 0))] : null

  // ---- the big hits: the gong opens each phrase and the B section, the crash marks the sections ----
  if (L.has('gong') && step === 0 && (bar % 16 === 0 || bar % 16 === 8)) playGong(chord[0] - 24, 0.6, 0, true)
  else if (L.has('gong') && step === 0 && bar % 4 === 0 && sec !== 'break') playGong(chord[0] - 12, 0.28, 0, true)
  if (L.has('crash') && step === 0 && (bar % 4 === 0 || sec === 'B' && bar % 2 === 0)) playDrum('crash', 0, 0.7)

  // ---- the breakdown: only a heartbeat of taiko, the guzheng's tremolo and a held flute ----
  if (sec === 'break') {
    if (L.has('taiko') && (step === 0 || step === 3)) playDrum('taiko', 0, step === 0 ? 0.9 : 0.5)
    if (L.has('pluck') || L.has('wood')) playNote('guzheng', tones[(bar % 2) + (step >= 8 ? 1 : 0)] + 12, { vel: 0.12 + 0.12 * (step / 16), dur: 0.12 })
    if (L.has('flute') && step === 0 && bar % 2 === 0) playNote('flute', melodyNote(stage, 4) + 12, { vel: 0.35, dur: spb * 7 })
    if (L.has('bass') && step === 0) playNote('bass', chord[0] - 24, { vel: 0.7, dur: spb * 3.5 })
    return
  }

  // ---- drums ----
  if (fill) {
    if (fill.includes(step)) playDrum('taiko', 0, 0.55 + 0.45 * (step - 8) / 7)
  } else if (L.has('taiko')) {
    if (step === 0 || step === 8) playDrum('taiko', 0, 1)
    if (step === 11 || (L.has('snare') && step === 14) || (sec === 'B' && step === 6)) playDrum('taiko', 0, 0.55)
  }
  if (L.has('wood') && (step === 2 || step === 6 || step === 10 || step === 14 || (sec === 'B' && step === 7))) playDrum('wood', swing, step === 6 ? 0.7 : 0.5)
  if (L.has('snare') && (step === 4 || step === 12)) playDrum(stage.zone.feel === 'swing' ? 'clap' : 'snare', 0, 0.8)
  if (L.has('snare') && sec === 'build' && bar % 2 === 1 && step >= 8) playDrum('snare', 0, 0.25 + 0.05 * (step - 8))
  if (sec === 'build' && (L.has('hat') || L.has('double'))) playDrum('hat', 0, 0.3 + 0.5 * ((bar % 2) * 16 + step) / 32)
  else if (L.has('double')) playDrum(sec === 'B' && step % 8 === 6 ? 'openHat' : 'hat', swing, step % 4 === 0 ? 0.8 : 0.45)
  else if (L.has('hat') && step % 2 === 0) playDrum(sec === 'B' && step % 8 === 6 ? 'openHat' : 'hat', swing, step % 4 === 0 ? 0.8 : 0.5)
  if (L.has('wood') && sec === 'A2' && step % 4 === 3 && bar % 2 === 1) playDrum('shaker', swing, 0.4)

  // ---- bass: the stage's line; it walks up to the next chord at the end of a section ----
  if (L.has('bass')) {
    const line = BASS[Math.min(BASS.length - 1, groove)]
    const hit = line.find(h => h[0] === step)
    if (hit) playNote('bass', chord[0] - 24 + (lastOfSection && step >= 12 ? hit[1] + 2 : hit[1]), { vel: hit[2], dur: s16 * 2 })
  }

  // ---- the guzheng: arpeggios in A, a riff on the melody in B ----
  if (L.has('pluck') && step % 2 === 0) {
    if (sec === 'B') {
      const k = step / 2 + (bar % 2) * 8
      const riff = k % 4 === 3 ? null : melodyNote(stage, groove * 3 + Math.floor(k / 2) + (k % 2) * 2)
      if (riff != null) playNote('guzheng', riff, { at: swing, vel: k % 4 === 0 ? 0.5 : 0.35, dur: 0.22 })
    } else {
      const order = ARP[(groove + (sec === 'A2' ? 1 : 0)) % ARP.length]
      playNote('guzheng', tones[order[(step / 2) % 8]] + 12, { at: swing, vel: step % 8 === 0 ? 0.42 : 0.3, dur: 0.2 })
    }
  }

  // ---- the flute's call (A2) and the bells' answer; in A the flute just holds ----
  if (L.has('flute')) {
    if (sec === 'A2' && bar % 2 === 0 && (step === 0 || step === 6 || step === 8 || step === 12)) playNote('flute', melodyNote(stage, bar * 2 + step / 4) + 12, { vel: step === 0 ? 0.45 : 0.35, dur: s16 * (step === 0 ? 5 : 3) })
    else if (sec === 'A' && step === 0 && bar % 2 === 0) playNote('flute', melodyNote(stage, bar) + 12, { vel: 0.3, dur: spb * 3.5 })
    else if (sec === 'build' && step % 4 === 0) playNote('flute', tones[(step / 4) % 4] + 12 + (bar % 2) * 12, { vel: 0.3, dur: s16 * 3 })
  }
  if (L.has('bells')) {
    if (sec === 'A2' && bar % 2 === 1 && (step === 0 || step === 4 || step === 8)) playNote('bells', melodyNote(stage, bar * 2 + step / 4 + 5) + 12, { vel: 0.3, dur: 0.3 })
    else if (sec !== 'A2' && (step === 0 || step === 10)) playNote('bells', chord[step === 0 ? 2 : 1] + 12, { vel: 0.26, dur: 0.3 })
  }
}

// ---------- the mini-game's sounds ----------
export type TempleSound =
  | { kind: 'gong'; hit: number; need: number } // the totem struck: rises with each hit
  | { kind: 'gongDull' } // struck while a stage is on
  | { kind: 'reset'; hit: number; need: number } // the reset stone struck
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
    case 'reset': {
      // a stone's knock, falling; the last one sweeps the temple back to rest
      playDrum('wood', 0, 0.9); blip('triangle', 700 - s.hit * 120, 300, 0.08 * v, 0.2)
      if (s.hit >= s.need) { whoosh(2400, 300, 0.25 * v, 0.7); [7, 4, 2, 0].forEach((st, i) => playNote('bells', 74 + st, { at: 0.08 + i * 0.08, vel: 0.35, dur: 0.4 })) }
      break
    }
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

// ---------- the note stage's sounds (the guitar hero mode) ----------
export function playNoteStageSound(s: NoteStageSound, volume: number) {
  if (volume <= 0) return
  const v = Math.min(1, volume * 1.4)
  switch (s.kind) {
    // the firing: a soft note an octave up, just a warning
    case 'fire': playNote(s.voice, s.midi + 12, { vel: s.vel * v, dur: 0.12 }); break
    case 'start': [0, 4, 7, 12].forEach((st, i) => playNote('bells', s.root + 12 + st, { at: i * 0.07, vel: 0.45, dur: 0.3 })); playGong(s.root - 12, 0.5, 0.3); break
    case 'count': playDrum('wood', 0, s.n === 1 ? 0.9 : 0.6); break
    case 'contact': blip('square', 260, 110, 0.12 * v, 0.2); break
    case 'miss': blip('triangle', 300, 180, 0.05 * v, 0.12); break
    case 'bird': blip('sine', 900, 1800, 0.06 * v, 0.1); blip('sine', 1200, 2200, 0.05 * v, 0.1, 0.07); break
    case 'dull': playGong(55, 0.25); break
    case 'reset': playTempleSound({ kind: 'reset', hit: s.hit, need: s.need }, volume); break
    case 'done': playTempleSound({ kind: 'clear', root: s.root, chord: s.chord }, volume); break
    case 'fail': playTempleSound({ kind: 'fail' }, volume); break
    // a letter of a line: a short note in the voice of who says it
    case 'blip': playNote(s.voice, s.midi, { vel: 0.16 * v, dur: 0.07 }); break
  }
}
