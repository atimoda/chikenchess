// 1962 New York City - Jazz waltz. Original AABA waltz in D Dorian in the spirit of Greenwich Village
// in the early 1960s (the Bill Evans Trio at the Village Vanguard, Sonny Rollins and Jim Hall on The
// Bridge): a piano that sings the head over rootless voicings, a double bass that converses and takes
// a melodic solo, brushes in three, a tenor sax solo over guitar comping with the piano laying out,
// a guitar solo, the tenor and guitar in unison on the last head and a music-box celesta at the edges.
// Run: node scripts/blues-jazz-rock/new-york-1962.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, walking, roots, onChords, walkNotes, chord } = require('./common.cjs')
const C = composer('3/4', 'Chromatic', { swing: .62 })
const { mel, rep, hits, relative, human, set, shift } = C
const KEY = 'D'

// One chord per bar (six eighths a bar).
const A = ['Dm9', 'Dm9', 'G9', 'G9', 'Dm9', 'Dm9', 'Bbmaj7', 'A7b9']
const B = ['Gm7', 'C7', 'Fmaj7', 'Bbmaj7', 'Em7b5', 'A7b9', 'Dm9', 'A7b9']
const INTRO = ['Dm9', 'G9', 'Dm9', 'G9', 'Dm9', 'G9', 'Bbmaj7', 'A7b9']
const OUTRO = ['Dm9', 'G9', 'Dm9', 'G9', 'Dm9', 'G9', 'Dm9', 'Dm9']
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 8, bank: 0, harmony: R(INTRO) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Bridge', bars: 8, bank: 2, harmony: R(B) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Solo', bars: 16, bank: 3, harmony: R([...A, ...A]) },   // tenor sax, guitar comping
  { label: 'Solo', bars: 16, bank: 4, harmony: R([...B, ...A]) },   // guitar
  { label: 'Solo', bars: 16, bank: 5, harmony: R([...A, ...A]) },   // double bass
  { label: 'Verse', bars: 16, bank: 6, harmony: R([...B, ...A]) },  // tenor and guitar in unison
  { label: 'Outro', bars: 8, bank: 7, harmony: R(OUTRO) },
]
const CHORDS = [INTRO, A, B, [...A, ...A], [...B, ...A], [...A, ...A], [...B, ...A], OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))

// ---------- the tune (semitones above D4 for the piano, above D3 for tenor and guitar) ----------
const HEAD_A = 'r:2 7:1 10:1 14:2 | 15:4~ 14:1 12:1 | 14:2 9:2 7:2 | 9:6~ | r:2 12:1 15:1 19:2 | 22:4~ 21:1 19:1 | 19:3 15:1 12:2 | 20:2 17:2 11:2'
const HEAD_B = 'r:1 12:1 17:2 20:2 | 22:4~ 20:1 17:1 | 19:3~ 15:1 14:2 | 12:4~ 8:2 | r:2 14:1 17:1 20:2 | 11:3~ 8:1 5:2 | 7:2 10:2 14:2 | 17:2 14:2 11:2'
const ACCENT = { accent: { strong: .84, beat: .76, off: .7 } }

// ---------- b1 Piano right hand: the head and the tag ----------
const pianoLead = {
  1: relative(human(mel(HEAD_A, ACCENT), .06, 0, 3), H(1)), 2: relative(human(mel(HEAD_B, ACCENT), .06, 0, 5), H(2)),
  7: relative(mel('r:2 7:1 10:1 14:2 | 15:4~ 14:1 12:1 | 14:2 9:2 7:2 | 9:6~ | r:2 7:1 10:1 14:2 | 15:4~ 14:1 12:1 | 14:2 9:2 7:2 | 2,7,10,14:6*', ACCENT), H(7)),
}

// ---------- c1 Piano comping: rootless voicings on 1 and the "and" of 2 ----------
const COMP = bar => [[[0, .9, .62], [1.5, 1.2, .56]], [[1, .5, .54], [2, .9, .6]], [[0, 1.8, .6]], [[.5, .5, .5], [1.5, 1.4, .58]]][bar % 4]
const comp = (list, bank) => {
  const voices = voiceLead(list, KEY, { center: 7, size: 4, drop: true })
  const rhythm = bank === 0 ? [[0, 2.9, .5]] : bank === 3 ? null   // Rollins' piano-less quartet: the guitar comps
    : bank === 5 ? bar => bar % 2 ? [] : [[0, 2, .5]]                // under the bass solo, only a chord every other bar
    : bank === 7 ? bar => bar >= 6 ? [] : COMP(bar) : COMP
  return rhythm && relative(human(onChords(C, voices, rhythm, { gate: .9 }), .06, 0, bank + 11), H(bank))
}
const piano = each(comp)

// ---------- e1 Tenor sax and d1 Jazz guitar ----------
const SAX_SOLO = mel([
  'r:1 12:1 15:1 19:1 22:2', '21:1 19:1 17:1 15:1 14:2', '17:2 21:1 24:1 19:2', '17:3 r:1 14:1 15:1',
  '19:2 22:2 24:2', '24:3~ 22:1 21:1 19:1', '20:1 19:1 15:1 12:1 8:2', '11:1 14:1 17:1 20:1 19:2',
  '15:3~ 14:1 12:1 10:1', '7:2 10:2 14:2', 'r:1 17:1 21:1 24:1 21:1 17:1', '19:6~',
  'r:2 22:1 21:1 19:1 17:1', '15:2 14:2 12:2', '8:1 12:1 15:1 19:1 20:2', '19:2 17:1 14:1 11:2',
].join('|'), { accent: { strong: .88, beat: .8, off: .74 } })
const GUITAR_SOLO = mel([
  '17:1 20:1 24:2 20:2', '22:2 20:1 17:1 14:2', '15:1 19:1 22:1 26:1 24:2', '19:3~ 15:1 12:2',
  '14:1 17:1 20:1 24:1 20:2', '23:2 20:1 17:1 14:2', '15:3~ 12:1 10:2', '7:1 11:1 14:1 17:1 20:2',
  'r:2 14:2 15:2', '19:4~ 17:1 15:1', '14:2 17:2 21:2', '19:3~ 17:1 14:2',
  '12:1 15:1 19:1 22:1 26:2', '24:2 22:2 19:2', '20:3~ 19:1 15:2', '11:2 14:2 7:2',
].join('|'), { accent: { strong: .86, beat: .8, off: .72 } })
const LAST = `${HEAD_B} | ${HEAD_A}`
const sax = {
  3: relative(human(C.portamento(SAX_SOLO, 5, .08, 3), .05, 0, 7), H(3)),
  6: relative(human(mel(LAST, ACCENT), .05, 0, 9), H(6)),
  7: relative(mel('r:6 | r:6 | r:6 | r:6 | r:6 | r:6 | 14:6~ | 14:6~*', ACCENT), H(7)),
}
const guitar = {
  2: relative(onChords(C, voiceLead(B, KEY, { center: 5, size: 2, drop: true }), [[1, .5, .52], [2, .9, .5]], { gate: .85 }), H(2)),
  4: relative(human(GUITAR_SOLO, .05, 0, 13), H(4)),
  6: relative(human(mel(LAST, ACCENT), .05, 0, 15), H(6)),
}
// h1 Guitar chords: Jim Hall's soft comping where the piano lays out.
const chords = { 3: relative(human(onChords(C, voiceLead([...A, ...A], KEY, { center: 6, size: 4, drop: true }), COMP, { gate: .85 }), .06, 0, 17), H(3)) }

// ---------- a1 Double bass (semitones above D2): two-feel in the head, walking in the solos, a melodic solo ----------
const low = r => r > 5 ? r - 12 : r
const twoFeel = list => list.map(symbol => { const r = low(chord(symbol, KEY).root); return `${r}:4 ${r + 7 > 12 ? r - 5 : r + 7}:2` }).join(' | ')
const walk = (list, seed) => walkNotes(C, walking(list, KEY, { beats: 3, low: -10, high: 12, seed }), { velocity: .74 })
const BASS_SOLO = mel([
  '12:2 15:1 14:1 12:2', '10:1 7:1 3:2 7:2', '5:2 9:2 12:2', '14:3~ 12:1 9:2',
  '7:1 10:1 12:1 15:1 19:2', '17:2 15:2 14:2', '12:2 8:2 3:2', '7:2 11:2 14:2',
  '15:4~ 14:1 12:1', '10:2 9:1 7:1 3:2', '5:1 9:1 12:1 15:1 14:2', '12:3~ 9:1 5:2',
  '0:2 3:2 7:2', '10:2 12:2 15:2', '19:3~ 15:1 12:2', '11:2 8:2 7:2',
].join('|'), { accent: { strong: .9, beat: .84, off: .78 } })
const bass = {
  1: relative(human(mel(twoFeel(A)), .05, 0, 21), H(1)), 2: relative(walk(B, 3), H(2)),
  3: relative(walk([...A, ...A], 5), H(3)), 4: relative(walk([...B, ...A], 7), H(4)),
  5: relative(human(BASS_SOLO, .05, 0, 23), H(5)), 6: relative(walk([...B, ...A], 9), H(6)),
  7: relative(mel(`${twoFeel(OUTRO.slice(0, 6))} | 0:6 | 0:6*`), H(7)),
}
// f1 Arco bass: a bowed pedal under the intro and the ending.
const arco = { 0: relative(mel(rep('0:6~', 6) + ' | -4:6 | -5:6'), H(0)), 7: relative(mel(rep('r:6', 6) + ' | 0:6~ | 0:6~*'), H(7)) }

// ---------- g1 Celesta (semitones above D4): the music box at the edges ----------
const BOX = '19:1 15:1 12:1 15:1 19:2 | 21:2 19:2 17:2'
const celesta = {
  0: relative(mel(`r:6 | r:6 | ${BOX} | ${BOX} | 20:2 19:2 15:2 | 13:2 11:2 7:2`), H(0)),
  7: relative(mel(`${BOX} | ${BOX} | ${BOX} | 14:6* | 12:6*`), H(7)),
}

// ---------- drums: brushes in the head, the ride in the solos ----------
const RIDE = 'X.xgx.'
const bars = bank => FORM.find(s => s.bank === bank).bars
const ride = { 3: hits(rep(RIDE, 16)), 4: hits(rep(RIDE, 16)), 6: hits(rep(RIDE, 16)) }
const brush = { 0: hits(rep('......', 4) + ' | ' + rep('xgxgxg', 4)), 1: hits(rep('xgxgxg', 8)), 2: hits(rep('xgxgxg', 8)), 5: hits(rep('xgxgxg', 16)), 7: hits(rep('xgxgxg', 6) + ' | ...... | ......') }
const hat = Object.fromEntries([1, 2, 5].map(b => [b, hits(rep('..x...', bars(b)))]).concat([3, 4, 6].map(b => [b, hits(rep('..x.x.', bars(b)))])))
const kick = Object.fromEntries([1, 2, 3, 4, 5, 6].map(b => [b, hits(rep('g.....', bars(b)))]))
const tap = { 1: hits(rep('...g.. | .....? ', 4)), 2: hits(rep('...g.. | ....g.', 4)), 3: hits(rep('...g.? | .?..g.', 8)), 4: hits(rep('...g.. | ..?.g?', 8)), 6: hits(rep('...g.? | ....g.', 8)) }
const swell = { 0: hits(rep('......', 7) + ' | ....X.'), 3: hits('X.....'), 4: hits('X.....'), 6: hits('X.....'), 7: hits(rep('......', 7) + ' | X.....') }
const rim = { 3: hits(rep('....x.', 16)) }
const toms = { 3: hits(rep('......', 15) + ' | X.xxRR'), 4: hits(rep('......', 15) + ' | ..xxRX'), 5: hits(rep('......', 15) + ' | ....xx') }

const PARTS = present([
  P('a1', 'Double bass', 'bass', 'phrase', SAMPLE('classical', 'concert-bass-pizz'), bass, on(...ALL),
    { octave: 2, gain: .32, attack: .004, decay: .55, sustain: .45, release: .2, clip: 1, lpf: 2600, hpf: 32, effects: { reverb: .1 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 1, false), kick, on(...ALL),
    { ...DRUM, gain: .06, decay: .3, release: .1, clip: .8, lpf: 2400, hpf: 30, effects: { reverb: .1 } }),
  P('b1', 'Piano', 'melody', 'phrase', SAMPLE('band', 'piano', 0), pianoLead, on(1, 2, 3, 4, 9),
    { octave: 4, gain: .065, attack: .002, decay: .8, sustain: .4, release: .35, clip: .95, lpf: 7500, hpf: 120, effects: { reverb: .2, pan: .1 }, mapping: FIXED }),
  P('b2', 'Brushes', 'rhythm', 'pulse', SAMPLE('drums', 'brush', 0, false), brush, on(...ALL),
    { ...DRUM, gain: .03, decay: .12, release: .06, clip: .5, lpf: 7000, hpf: 500, effects: { reverb: .12, pan: .15 } }),
  P('c1', 'Piano comping', 'harmony', 'phrase', SAMPLE('band', 'piano', 0), piano, on(...ALL),
    { octave: 3, gain: .05, attack: .002, decay: .6, sustain: .35, release: .3, clip: .95, lpf: 6000, hpf: 100, effects: { reverb: .18, pan: .2 }, mapping: FIXED }),
  P('c2', 'Ride', 'rhythm', 'pulse', SAMPLE('percussion', 'ride', 0, false), ride, on(5, 6, 8),
    { ...DRUM, gain: .032, decay: .4, release: .2, clip: .7, lpf: 9000, hpf: 400, effects: { reverb: .14, pan: -.25 } }),
  P('d1', 'Jazz guitar', 'response', 'phrase', SAMPLE('guitars', 'clean', 0), guitar, on(3, 6, 8),
    { octave: 3, gain: .07, attack: .002, decay: .45, sustain: .35, release: .18, clip: .9, lpf: 2600, hpf: 110, effects: { reverb: .16, pan: -.3 }, mapping: FIXED,
      design: { role: 'lead', filterEnv: .3, filterAttack: .002, filterDecay: .12 } }),
  P('d2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 1, false), hat, on(...ALL),
    { ...DRUM, gain: .028, decay: .06, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .08, pan: .3 } }),
  P('e1', 'Tenor sax', 'melody', 'phrase', SAMPLE('band', 'tenor-sax', 1), sax, on(5, 8, 9),
    { octave: 3, gain: .065, attack: .025, decay: .3, sustain: .8, release: .22, clip: 1, lpf: 5500, hpf: 100, effects: { reverb: .2, pan: .1 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5.2, vibratoDepth: .12 } }),
  P('e2', 'Brush tap', 'rhythm', 'pulse', SAMPLE('percussion', 'ghost-snare', 0, false), tap, on(1, 2, 3, 4, 5, 6, 8),
    { ...DRUM, gain: .035, decay: .1, release: .05, clip: .4, lpf: 6000, hpf: 300, effects: { reverb: .14, pan: .1 } }),
  P('f1', 'Arco bass', 'bass', 'sustain', SAMPLE('classical', 'orchestra-bass'), arco, on(0, 9),
    { octave: 2, gain: .07, attack: .2, decay: .5, sustain: .85, release: .6, clip: 1, lpf: 2200, hpf: 35, effects: { reverb: .26 }, mapping: FIXED, design: { vibrato: 4.6, vibratoDepth: .1 } }),
  P('f2', 'Cymbal swell', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), swell, on(0, 5, 6, 8, 9),
    { ...DRUM, gain: .025, attack: .08, decay: 1, release: .5, clip: 1, lpf: 8000, hpf: 400, effects: { reverb: .2, pan: .25 } }),
  P('g1', 'Celesta', 'response', 'phrase', SAMPLE('keys', 'celesta'), celesta, on(0, 9),
    { octave: 4, gain: .045, attack: .002, decay: .9, sustain: .2, release: .5, clip: 1, lpf: 6000, hpf: 300, effects: { reverb: .3, pan: -.35 }, mapping: FIXED }),
  P('g2', 'Rim', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), rim, on(5),
    { ...DRUM, gain: .03, decay: .08, release: .04, clip: .4, lpf: 7000, hpf: 400, effects: { reverb: .14, pan: -.1 } }),
  P('h1', 'Guitar chords', 'harmony', 'phrase', SAMPLE('guitars', 'clean', 1), chords, on(5),
    { octave: 3, gain: .05, attack: .002, decay: .4, sustain: .3, release: .15, clip: .9, lpf: 2400, hpf: 120, effects: { reverb: .16, pan: .35 }, mapping: FIXED }),
  P('h2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 1, false), toms, on(5, 6, 7),
    { ...DRUM, gain: .06, decay: .35, release: .18, clip: .8, lpf: 5000, hpf: 50, effects: { reverb: .22 } }),
], FORM)

const SECTION_PARAMS = {
  e1: { 5: { gain: .075, reverbRange: { first: .2, second: .26 } } },
  d1: { 6: { gain: .08, reverbRange: { first: .18, second: .24 } } },
  a1: { 7: { gain: .38, reverbRange: { first: .14, second: .2 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'new-york-1962', kitName: 'Jazz waltz', profileName: 'Jazz waltz · New York City 1962',
  bpm: 138, meter: '3/4', root: 'D', scale: 'Chromatic', form: FORM, parts: PARTS, grid: 144,
  reactions: reactions('new-york-1962', { lift: 2, contrast: 2, lament: 5, calm: 0, finale: 7, climax: 6, solo: 3 }),
  reference: 'Jazz waltz do Greenwich Village no início dos anos 1960 (o Bill Evans Trio no Village Vanguard, Sonny Rollins e Jim Hall em The Bridge); composição original em AABA, Ré dórico: piano que canta o tema sobre voicings sem fundamental, contrabaixo que conversa e faz solo melódico, vassourinhas em três, solo de sax tenor com a guitarra no acompanhamento e o piano em silêncio, solo de guitarra, tenor e guitarra em uníssono no último tema e celesta de caixinha de música nas pontas.',
  url: 'https://www.britannica.com/biography/Bill-Evans',
}).catch(error => { console.error(error); process.exit(1) })
