// 1973 Cambridge - Progressive rock. Original piece in 7/4 (4+3) in E minor in the spirit of the
// Cambridge and English progressive bands of 1973 (Pink Floyd, born in Cambridge, the year of their
// seven-beat bass riffs; Genesis and King Crimson's Mellotrons; the Hammond solos of the era): a bass
// and drums riff in seven, a Rhodes and a Mellotron flute on the verse, a fuzz guitar wall and
// Mellotron strings on the chorus, a long singing guitar solo with bends, a driven Hammond organ solo,
// a spacey break with a synthesizer sequence, and a gong at both ends.
// Run: node scripts/blues-jazz-rock/cambridge-1973.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords, chord } = require('./common.cjs')
const C = composer('7/4', 'Chromatic')
const { mel, rep, hits, relative, human, set } = C
const KEY = 'E'

const INTRO = ['Em9', 'Em9', 'Cmaj7', 'B7sus4']
const VERSE = ['Em7', 'Em7', 'Em7', 'Em7', 'Cmaj7', 'D', 'Em7', 'Em7']
const CHORUS = ['Cmaj7', 'D', 'Bm7', 'Em7', 'Cmaj7', 'D', 'B7sus4', 'B7']
const GUITAR = ['Em7', 'Em7', 'Cmaj7', 'D', 'Em7', 'Em7', 'Cmaj7', 'B7']
const ORGAN = ['Am7', 'D', 'Em7', 'Em7', 'Am7', 'D', 'Cmaj7', 'B7']
const BREAK = ['Em9', 'Em9', 'Em9', 'Em9', 'Cmaj7', 'Cmaj7', 'Am7', 'B7sus4']
const OUTRO = ['Em7', 'Em7', 'Cmaj7', 'Em9']
const R = list => roots(list, KEY)
// A 7/4 section holds at most nine bars (64 beats): eight-bar sections throughout.
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(INTRO) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },
  { label: 'Solo', bars: 8, bank: 3, harmony: R(GUITAR) },   // guitar
  { label: 'Solo', bars: 8, bank: 4, harmony: R(ORGAN) },    // Hammond organ
  { label: 'Break', bars: 8, bank: 5, harmony: R(BREAK) },   // synthesizer sequence
  { label: 'Chorus', bars: 8, bank: 6, harmony: R(CHORUS) },
  { label: 'Outro', bars: 4, bank: 7, harmony: R(OUTRO) },
]
const CHORDS = [INTRO, VERSE, CHORUS, GUITAR, ORGAN, BREAK, CHORUS, OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))
const low = symbol => { const r = chord(symbol, KEY).root; return r > 4 ? r - 12 : r }

// ---------- a1 Bass guitar: the riff in four plus three (fourteen eighths a bar) ----------
const RIFF = r => `${r}:2 ${r}:1 ${r + 3}:1 ${r + 5}:2 ${r + 7}:2 ${r + 10}:2 ${r + 7}:2 ${r + 5}:2`
const RIFF_MAJOR = r => `${r}:2 ${r}:1 ${r + 4}:1 ${r + 5}:2 ${r + 7}:2 ${r + 9}:2 ${r + 7}:2 ${r + 4}:2`
// The bass sits from E1 up: every root between E1 and D#2.
const root = symbol => chord(symbol, KEY).root
const riff = list => list.map(symbol => chord(symbol, KEY).tones[1] === 4 ? RIFF_MAJOR(root(symbol)) : RIFF(root(symbol))).join(' | ')
const bass = each((list, bank) => {
  if (bank === 0) return relative(mel(list.map(s => `${root(s)}:14~`).join(' | ')), H(0))
  if (bank === 5) return relative(mel(list.map(s => `${root(s)}:8 ${root(s) + 7}:6`).join(' | ')), H(5))
  if (bank === 7) return relative(mel(`${riff(OUTRO.slice(0, 3))} | 0:14*`), H(7))
  return relative(human(mel(riff(list), { accent: { strong: .9, beat: .8, off: .72 } }), .05, 0, bank + 1), H(bank))
})

// ---------- d1 Mellotron flute: the verse tune (semitones above E4) ----------
const VERSE_TUNE = 'r:4 7:2 10:2 12:4~ 10:2 | 7:6~ 5:2 3:2 2:4 | r:4 7:2 10:2 15:4~ 14:2 | 12:8~ r:6 | r:2 12:2 15:2 19:4~ 17:2 15:2 | 14:6~ 17:2 14:2 10:4 | 12:4~ 10:2 7:2 3:6~ | 7:14~'
const ACCENT = { accent: { strong: .82, beat: .74, off: .68 } }
const flute = {
  1: relative(human(mel(VERSE_TUNE, ACCENT), .04, 0, 3), H(1)),
  5: relative(mel('r:14 | 19:8~ 17:6 | 15:14~ | r:14 | r:4 20:4~ 19:6 | 15:14~ | 12:8~ 15:6 | 14:14~', ACCENT), H(5)),
  6: relative(onChords(C, voiceLead(CHORUS, KEY, { center: 19, size: 1 }), [[0, 3.8, .56], [4, 2.8, .52]], { gate: .98 }), H(6)),
}

// ---------- b1 Lead guitar: the chorus line and the solo (semitones above E3), with bends ----------
const CHORUS_LINE = '19:6~^2 17:2 15:2 12:4 | 14:4~ 17:4 22:6~ | 19:2 22:2 21:4~ 19:2 17:4 | 19:10~^2 r:4 | 24:6~^2 22:2 19:2 15:4 | 17:4~ 14:2 17:2 22:6~ | 24:6~ 21:2 19:6 | 23:8~^1 21:2 19:4'
const SOLO = [
  'r:2 19:4~^2 17:2 15:2 12:4', '15:2 17:2 19:2 22:6~^2 19:2', '24:8~^2 22:2 19:4', '22:2 21:2 17:2 14:2 17:6~',
  '27:6~^2 26:2 24:2 22:4', '19:2 22:2 24:2 22:2 19:2 15:2 12:2', '15:2 19:2 20:2 24:8~^1', '23:6~^1 21:2 17:2 19:4',
].join('|')
const lead = {
  2: relative(human(mel(CHORUS_LINE, ACCENT), .04, 0, 5), H(2)), 3: relative(human(mel(SOLO, { accent: { strong: .9, beat: .84, off: .78 } }), .05, 0, 7), H(3)),
  6: relative(human(mel(CHORUS_LINE, ACCENT), .04, 0, 9), H(6)), 7: relative(mel('r:14 | r:14 | 24:6~^2 22:2 19:6 | 19:14~*', ACCENT), H(7)),
}

// ---------- c1 Hammond organ: held chords, accents in four plus three, and the solo (semitones above E4) ----------
const ORGAN_SOLO = [
  '5:1 8:1 12:1 15:1 17:2 15:1 12:1 8:2 5:2 3:2', '2:1 5:1 10:1 14:1 17:2 14:1 10:1 5:2 2:4', '3:1 7:1 10:1 12:1 15:4~ 14:2 12:2 10:2', '7:8~ r:2 10:2 12:2',
  '17:2 15:1 12:1 8:2 12:2 15:2 17:2 20:2', '22:4~ 17:2 14:2 10:2 14:2 17:2', '19:2 15:2 12:2 8:2 12:2 15:2 19:2', '23:6~ 21:2 17:2 14:2 11:2',
].join('|')
const organ = each((list, bank) => {
  if (bank === 0 || bank === 3 || bank === 5) return null
  if (bank === 4) return relative(human(mel(ORGAN_SOLO, { accent: { strong: .9, beat: .82, off: .76 } }), .05, 0, 11), H(4))
  const voices = voiceLead(list, KEY, { center: -5, size: 4 })   // one octave below the solo's register
  const rhythm = bank === 1 ? [[0, 7, .5]] : bank === 7 ? bar => bar === 3 ? [[0, 7, .7, { release: 1.4, reverb: .45 }]] : [[0, 3.8, .66], [4, 2.8, .62]] : [[0, 3.8, .7], [4, 2.8, .66]]
  return relative(onChords(C, voices, rhythm, { gate: .98 }), H(bank))
})

// ---------- e1 Mellotron strings, f1 Fuzz guitar wall ----------
const strings = Object.fromEntries([[0, INTRO], [2, CHORUS], [6, CHORUS], [7, OUTRO]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: 7, size: 3 }), bank === 7 ? bar => bar === 3 ? [[0, 7, .6, { release: 1.6, reverb: .5 }]] : [[0, 7, .55]] : [[0, 7, .55]], { gate: .98 }), H(bank))]))
// The rendered power-chord samples already hold root, fifth and octave: one note per chord.
const WALL = [[0, 3.8, .86], [4, 2.8, .82]]
const DRIVE = [[0, 1.8, .74], [2, 1.8, .68], [4, 1.3, .74], [5.5, 1.3, .68]]
const fuzz = Object.fromEntries([[2, CHORUS, WALL], [3, GUITAR, DRIVE], [6, CHORUS, WALL], [7, OUTRO, WALL]].map(([bank, list, rhythm]) =>
  [bank, relative(onChords(C, list.map(s => [low(s)]), bank === 7 ? bar => bar === 3 ? [[0, 7, .86, { release: 1.2 }]] : rhythm : rhythm, { gate: .95 }), H(bank))]))

// ---------- g1 Electric piano and h1 Synthesizer: arpeggios ----------
const arpeggio = (list, center, pattern, velocity = .5) => voiceLead(list, KEY, { center, size: 4 }).flatMap((v, bar) => {
  const sorted = [...v].sort((a, b) => a - b)
  return pattern.map((i, k) => ({ start: bar + k / 14, duration: 1 / 14 * .9, degree: sorted[i % 4] + 12 * Math.floor(i / 4), velocity: k % 2 ? velocity - .1 : velocity }))
})
const UP_DOWN = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1]
const rhodes = {
  0: relative(human(arpeggio(INTRO, 3, UP_DOWN, .48), .06, 0, 13), H(0)),
  1: relative(human(onChords(C, voiceLead(VERSE, KEY, { center: 3, size: 4 }), [[0, 1.5, .5], [2, 1.5, .44], [4, 1, .48], [5.5, 1, .42]], { gate: .9 }), .06, 0, 15), H(1)),
  5: relative(human(arpeggio(BREAK, 3, UP_DOWN, .5), .06, 0, 17), H(5)),
}
const SEQUENCE = [0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 4, 3, 1]
const synth = {
  0: relative(mel('r:14 | r:14 | 12:14~ | 11:14~'), H(0)),
  5: relative(arpeggio(BREAK, 7, SEQUENCE, .62), H(5)),
  6: relative(onChords(C, voiceLead(CHORUS, KEY, { center: 12, size: 1 }), bar => bar % 2 ? [[4, 2.8, .54]] : [[2, 1.8, .5]], { gate: .95 }), H(6)),
}

// ---------- drums: four plus three ----------
const KICK = 'x..x....x..x..', SNARE = '....x.....x...', HAT = 'xgxgxgxgxgxgxg'
const kick = {
  1: hits(rep(KICK, 8)), 2: hits(rep(KICK, 8)), 3: hits(rep(KICK, 8)), 4: hits(rep(KICK, 8)), 5: hits(rep('x.............', 8)),
  6: hits(rep(KICK, 8)), 7: hits(rep(KICK, 3) + ' | X.............'),
}
const snare = {
  1: hits(rep(SNARE, 7) + ' | ....x...x.xgxx'), 2: hits(rep(SNARE, 8)), 3: hits(rep(SNARE, 8)), 4: hits(rep(SNARE, 8)),
  6: hits(rep(SNARE, 8)), 7: hits(rep(SNARE, 3) + ' | ..............'),
}
const hat = {
  1: hits(rep(HAT, 8)), 2: hits(rep('x.x.x.x.x.x.x.', 8)), 5: hits(rep('..x...x...x...', 8)), 6: hits(rep('x.x.x.x.x.x.x.', 8)), 7: hits(rep(HAT, 3) + ' | ..............'),
}
const ride = { 3: hits(rep('x.xgx.x.xgx.x.', 8)), 4: hits(rep('x.xgx.x.xgx.x.', 8)) }
const crash = { 2: hits('X.............'), 3: hits('X.............'), 4: hits('X.............'), 6: hits('X.............'), 7: hits(rep('..............', 3) + ' | X.............') }
const toms = { 0: hits(rep('..............', 3) + ' | ......xxxxRRRX'), 2: hits(rep('..............', 7) + ' | ........xxRRRR'), 5: hits(rep('..............', 7) + ' | ......XxXxRRRR') }
const gong = { 0: hits('X.............'), 7: hits(rep('..............', 3) + ' | X.............') }
const rim = { 5: hits(rep('....x.....x...', 8)) }

const PARTS = present([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('amps', 'rock-bass'), bass, on(...ALL),
    { octave: 1, gain: .2, attack: .004, decay: .5, sustain: .6, release: .15, clip: 1, lpf: 3000, hpf: 30, effects: { reverb: .08 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), kick, on(...ALL),
    { ...DRUM, gain: .09, decay: .35, release: .12, clip: .8, lpf: 2400, hpf: 30, effects: { reverb: .12 } }),
  P('b1', 'Lead guitar', 'melody', 'phrase', SAMPLE('amps', 'lead'), lead, on(3, 4, 7, 8),
    { octave: 3, gain: .05, attack: .004, decay: .5, sustain: .8, release: .3, clip: 1, lpf: 6500, hpf: 120, effects: { reverb: .26, delay: .22, pan: -.15 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5.4, vibratoDepth: .18 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 0, false), snare, on(...ALL),
    { ...DRUM, gain: .06, decay: .2, release: .1, clip: .7, lpf: 6500, hpf: 150, effects: { reverb: .26 } }),
  P('c1', 'Hammond organ', 'harmony', 'sustain', SAMPLE('keys', 'organ'), organ, on(1, 2, 3, 5, 7, 8),
    { octave: 4, gain: .045, attack: .01, decay: .3, sustain: .9, release: .2, clip: 1, lpf: 5000, hpf: 80, effects: { reverb: .2, pan: .25 }, mapping: FIXED,
      design: { lfoTarget: 'gain', lfoRate: 6.6, lfoUnit: 'hz', lfoDepth: .1, lfoShape: 'sine' } }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 0, false), hat, on(1, 2, 3, 6, 7, 8),
    { ...DRUM, gain: .028, decay: .06, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .08, pan: .3 } }),
  P('d1', 'Mellotron flute', 'melody', 'sustain', SAMPLE('classical', 'flute-sustain', 0), flute, on(1, 2, 6, 7),
    { octave: 4, gain: .055, attack: .06, decay: .4, sustain: .85, release: .3, clip: 1, lpf: 4200, hpf: 250, effects: { reverb: .28, pan: -.2 }, mapping: FIXED,
      design: { vibrato: .9, vibratoDepth: .05 } }),
  P('d2', 'Ride', 'rhythm', 'pulse', SAMPLE('percussion', 'ride', 0, false), ride, on(4, 5),
    { ...DRUM, gain: .03, decay: .4, release: .2, clip: .7, lpf: 9000, hpf: 400, effects: { reverb: .14, pan: -.25 } }),
  P('e1', 'Mellotron strings', 'harmony', 'sustain', SAMPLE('classical', 'violin-sustain', 0), strings, on(0, 3, 7, 8),
    { octave: 4, gain: .04, attack: .15, decay: .5, sustain: .9, release: .6, clip: 1, lpf: 4500, hpf: 300, effects: { reverb: .3, pan: -.3 }, mapping: FIXED,
      design: { vibrato: .8, vibratoDepth: .05 } }),
  P('e2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(3, 4, 5, 7, 8),
    { ...DRUM, gain: .035, decay: .9, release: .4, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .2, pan: .25 } }),
  P('f1', 'Fuzz guitar', 'harmony', 'phrase', SAMPLE('amps', 'power', 1), fuzz, on(3, 4, 7, 8),
    { octave: 3, gain: .04, attack: .004, decay: .5, sustain: .8, release: .2, clip: 1, lpf: 5500, hpf: 90, effects: { reverb: .2, pan: .35 }, mapping: FIXED }),
  P('f2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 0, false), toms, on(0, 3, 6),
    { ...DRUM, gain: .07, decay: .45, release: .2, clip: .9, lpf: 4500, hpf: 40, effects: { reverb: .26 } }),
  P('g1', 'Electric piano', 'harmony', 'phrase', SAMPLE('keys', 'rhodes'), rhodes, on(0, 1, 2, 6),
    { octave: 3, gain: .05, attack: .003, decay: .6, sustain: .4, release: .3, clip: 1, lpf: 5000, hpf: 100, effects: { reverb: .24, delay: .18, pan: .2 }, mapping: FIXED,
      design: { lfoTarget: 'pan', lfoRate: 3.5, lfoUnit: 'hz', lfoDepth: .4, lfoShape: 'sine' } }),
  P('g2', 'Gong', 'rhythm', 'pulse', SAMPLE('classical', 'concert-tam-tam', 0, false), gong, on(0, 8),
    { ...DRUM, gain: .06, decay: 2, release: 1.5, clip: 1, lpf: 6000, hpf: 40, effects: { reverb: .4 } }),
  P('h1', 'Synthesizer', 'response', 'phrase', SAMPLE('synths', 'wavetable'), synth, on(0, 6, 7),
    { octave: 3, gain: .035, attack: .005, decay: .3, sustain: .5, release: .2, clip: 1, lpf: 3200, hpf: 150, effects: { reverb: .3, delay: .3, pan: .3 }, mapping: FIXED,
      design: { filterEnv: .5, filterAttack: .003, filterDecay: .15 } }),
  P('h2', 'Rim', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), rim, on(6),
    { ...DRUM, gain: .035, decay: .08, release: .04, clip: .4, lpf: 7000, hpf: 400, effects: { reverb: .2, delay: .2 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 4: { gain: .06, reverbRange: { first: .28, second: .34 } } },
  c1: { 5: { gain: .06, driveRange: { first: 1.5, second: 2.2 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'cambridge-1973', kitName: 'Progressive rock', profileName: 'Progressive rock · Cambridge 1973',
  bpm: 118, meter: '7/4', root: 'E', scale: 'Chromatic', form: FORM, parts: PARTS,
  reactions: reactions('cambridge-1973', { lift: 2, contrast: 2, lament: 5, calm: 0, finale: 7, climax: 6, solo: 3 }),
  reference: 'Rock progressivo inglês de 1973 (o Pink Floyd, nascido em Cambridge, e seus riffs de baixo em sete; os Mellotrons do Genesis e do King Crimson; os solos de Hammond da época); peça original em 7/4 (4+3) em Mi menor: riff de baixo e bateria em sete, Rhodes e flauta de Mellotron no verso, parede de guitarra com fuzz e cordas de Mellotron no refrão, longo solo de guitarra cantado com bends, solo de Hammond saturado, quebra espacial com sequência de sintetizador e gongo nas pontas.',
  url: 'https://www.britannica.com/art/progressive-rock',
}).catch(error => { console.error(error); process.exit(1) })
