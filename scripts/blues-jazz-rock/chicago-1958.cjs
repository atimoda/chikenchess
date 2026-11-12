// 1958 Chicago - Electric blues. Original song in the spirit of the Chess Records South Side bands
// (Muddy Waters with Otis Spann, Little Walter, Jimmy Rogers, Willie Dixon and Fred Below): a 12-bar
// shuffle in A with triplet swing, a stop-time first chorus, amplified harmonica answering the guitar,
// a guitar solo through a cranked tweed amp, a harmonica solo, an Elmore James slide break and the
// classic turnaround ending. Run: node scripts/blues-jazz-rock/chicago-1958.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED } = require('./common.cjs')
const C = composer('4/4', 'Chromatic', { swing: .67 })
const { mel, rep, hits, relative, human, set } = C

// A, semitones. 12-bar quick change: A7 D7 A7 A7 | D7 D7 A7 A7 | E7 D7 A7 E7.
const BLUES = [0, 5, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7]
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: [7, 5, 0, 7] },
  { label: 'Verse', bars: 12, bank: 1, harmony: BLUES },   // stop-time chorus
  { label: 'Verse', bars: 12, bank: 2, harmony: BLUES },   // full shuffle
  { label: 'Solo', bars: 12, bank: 3, harmony: BLUES },    // guitar
  { label: 'Solo', bars: 12, bank: 4, harmony: BLUES },    // harmonica
  { label: 'Break', bars: 12, bank: 5, harmony: BLUES },   // slide guitar
  { label: 'Verse', bars: 12, bank: 1, harmony: BLUES },
  { label: 'Outro', bars: 4, bank: 6, harmony: [0, 7, 0, 0] },
]
const H = bank => FORM.find(s => s.bank === bank).harmony
const FILL = 7
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const triplets = { unit: C.M.beat / 3, straight: true }

// ---------- b1 Harmonica: the voice of the song (semitones above A4; ^n bends up into the note) ----------
const VERSE_HARP = mel([
  'r:1 7:1 10:1 12:5~', '10:1 12:1 10:1 7:2 4:2^1 r:1', '0:4~ r:4', 'r:8',
  'r:1 10:1 12:1 15:5~', '12:1 15:1 12:1 10:2 7:2 r:1', '4:2^1 0:6~', 'r:8',
  'r:1 14:1 12:1 11:1^1 7:4~', '12:2 10:1 9:1 5:4~', '4:2^1 3:1 0:5~', 'r:8',
].join('|'), { accent: { strong: .9, beat: .82, off: .74 } })
const SECOND_HARP = mel([
  '12:3~ 16:1^1 12:2 10:2', '12:1 10:1 7:1 10:1^1 7:4~', 'r:2 4:1^1 7:1 12:4~', 'r:8',
  '15:3~ 17:1 15:2 12:2', '15:1^1 12:1 10:1 12:5~', '7:1 10:1^1 7:1 4:1^1 0:4~', 'r:6 12:1 15:1',
  '14:3~ 11:1 14:2 12:2', '12:1 10:1 9:2~ 5:4', '7:1 4:1^1 0:2 4:1^1 0:3~', 'r:8',
].join('|'), { accent: { strong: .92, beat: .84, off: .76 } })
// Harmonica solo: train-rhythm chords, a long wail, call and response with itself.
const HARP_SOLO = mel([
  '12,16:1 12,16:1 12,16:1 12,16:1 12,16:1 12,16:1 12,16:1 12,16:1', '12,16:1 12,16:1 12,16:1 12,16:1 15:4~^2', '12:2 10:1 7:1 4:2^1 0:2', 'r:2 7:1 10:1^1 12:4~',
  '5,9:1 5,9:1 5,9:1 5,9:1 5,9:1 5,9:1 5,9:1 5,9:1', '3:6~^1 0:2', '16:1 15:1 12:1 10:1 12:4~', 'r:4 7:2^2 5:2',
  '7:3~^2 5:1 2:2 -1:2^1', '12:3 10:1 9:2 5:2', '12,16:2 12,16:1 12,16:1 12,16:2 12,16:2', '11:4^1 r:4',
].join('|'), { accent: { strong: .95, beat: .86, off: .8 } })
const harp = {
  1: relative(human(VERSE_HARP, .06, 0, 3), H(1)),
  2: relative(human(SECOND_HARP, .06, 0, 5), H(2)),
  4: relative(human(HARP_SOLO, .05, 0, 7), H(4)),
  6: relative(mel('r:8 | r:8 | r:6 12:1 15:1^1 | 12:8~*'), H(6)),
}

// ---------- c1 Lead guitar (tweed amp): answers in the gaps, then the solo (semitones above A3) ----------
const ANSWERS = mel([
  'r:8', 'r:8', 'r:1 16:1^1 12:1 15:1 12:1 10:1 7:2', '10:1 7:1 4:1^1 0:3~ r:2',
  'r:8', 'r:8', 'r:2 17:1 19:2^2 17:1 15:1 12:1', '15:1^1 12:1 10:1 12:5~',
  'r:8', 'r:8', '12:1 r:1 22,24:2 21,24:1 20,24:1 19,24:2', '7,11,17:2! r:6',
].join('|'))
const GUITAR_SOLO = mel([
  'r:1 19:3^2 17:1 19:3~^2', '17:1 15:1 12:1 15:1^1 12:4~', '19:2^2 19:2^2 19:2^2 17:1 15:1', '12:1 15:1^1 12:1 10:1 12:4~',
  '24:6~^2 22:1 19:1', '22:1 19:1 17:1 15:1^1 17:4~', '16:1 15:1 12:1 10:1 12:2 7:2', 'r:4 12:1 15:1 17:1 18:1',
  '19:4~ 21:1 19:1 17:1 14:1', '17:2^2 15:1 12:1 9:4~', '12:1 r:1 22,24:2 21,24:1 20,24:1 19,24:2', '7,11,17:2! r:4 4:1 6:1',
].join('|'), { accent: { strong: .95, beat: .88, off: .8 } })
const lead = {
  0: relative(mel('12:1 r:1 22,24:2 21,24:1 20,24:1 19,24:2 | 17,21:2 r:6 | 12,16:1 r:1 10,15:1 9,14:1 8,13:1 7,12:1 r:2 | 7,11,17:2! r:6'), H(0)),
  1: relative(human(ANSWERS, .07, 0, 11), H(1)), 2: relative(human(ANSWERS, .07, 0, 13), H(2)),
  3: relative(human(GUITAR_SOLO, .05, 0, 17), H(3)),
  6: relative(mel('12:1 r:1 22,24:2 21,24:1 20,24:1 19,24:2 | 7,11,17:2! r:6 | 0,4,10,14:8~* | r:8'), H(6)),
}

// ---------- h1 Slide guitar (crunchy, Elmore James): triplets on the open A chord, then a slide solo ----------
const DUST = '12,16,19:3^2 12,16,19:1 12,16,19:1 12,16,19:1 12,16,19:1 12,16,19:1 12,16,19:1 12,16,19:1 12,16,19:1 12,16,19:1'
const slide = {
  5: relative(mel([
    DUST, 'r:12', DUST, 'r:12',
    '17,21,24:3^2 17,21,24:1 17,21,24:1 17,21,24:1 17,21,24:3 r:3', '17,21,24:6~^1 r:6', DUST, '19:6~^2 16:3 12:3',
    '19:3^2 17:3 16:3 12:3', '21:6~^2 17:3 14:3', '24:3^3 21:3 19:3 16:3^1', '19:6~^2 r:6',
  ].join('|'), triplets), H(5)),
}

// ---------- d1 Rhythm guitar (tweed, low strings): the boogie shuffle, two dyads per beat ----------
const SHUFFLE = '0,7:2 0,7:2 0,9:2 0,9:2 | 0,10:2 0,10:2 0,9:2 0,9:2'
const shuffle = (bars) => human(mel(rep(SHUFFLE, bars / 2), { gate: .7, accent: { strong: .78, beat: .7, off: .6 } }), .05, 0, bars)
const STOP = '0,7,12:1! r:7'
const rhythm = {
  0: mel('r:8 | 0,10:2 0,10:2 0,9:2 0,9:2 | 0,7:2 0,7:2 0,9:2 0,9:2 | 0,4,10:2! r:6', { gate: .7 }),
  1: [...mel(rep(STOP, 4)), ...C.shift(shuffle(8), 4)], 2: shuffle(12), 3: shuffle(12), 4: shuffle(12),
  5: [...mel(rep(STOP, 4)), ...C.shift(shuffle(8), 4)],
  6: mel('0,7:2 0,7:2 0,9:2 0,9:2 | 0,4,10:2! r:6 | 0,4,10:8~* | r:8', { gate: .7 }),
}

// ---------- a1 Upright bass: walking boogie (1-3-5-6-8-6-5-3) ----------
const WALK = '0:2 4:2 7:2 9:2 | 12:2 9:2 7:2 4:2'
const bass = {
  0: mel('r:8 | 0:2 4:2 7:2 9:2 | 12:2 9:2 7:2 4:2 | 0:2! r:6'),
  1: [...mel(rep('0:2! r:6', 4)), ...C.shift(mel(rep(WALK, 4)), 4)], 2: mel(rep(WALK, 6)), 3: mel(rep(WALK, 6)), 4: mel(rep(WALK, 6)),
  5: [...mel(rep('0:2! r:6', 4)), ...C.shift(mel(rep(WALK, 4)), 4)],
  6: mel('0:2 4:2 7:2 9:2 | 0:2! r:6 | 0:8~* | r:8'),
  [FILL]: mel('7:2 6:2 5:2 4:2'),
}

// ---------- e1 Piano (Otis Spann): high triplet trills and rolls in the gaps; f1 left hand ----------
const SPANN = [
  'r:3 16,19:1 16,19:1 16,19:1 r:3 16,19:1 16,19:1 16,19:1', 'r:12', 'r:3 24:1 23:1 21:1 19:1 16:1 15:1 12:3', 'r:12',
  'r:3 21,24:1 21,24:1 21,24:1 r:3 21,24:1 21,24:1 21,24:1', 'r:12', 'r:6 19:1 16:1 15:1 12:1 10:1 7:1', 'r:12',
  'r:3 23,26:1 23,26:1 23,26:1 r:6', 'r:3 21,24:1 21,24:1 21,24:1 r:6', '24,28:1 24,28:1 24,28:1 24,28:1 24,28:1 24,28:1 24,28:1 24,28:1 24,28:1 24,28:1 24,28:1 24,28:1', 'r:12',
].join('|')
const piano = {
  1: relative(set(human(mel(SPANN, triplets), .1, 0, 19), { chance: .8 }), H(1)), 2: relative(human(mel(SPANN, triplets), .1, 0, 21), H(2)),
  3: relative(set(human(mel(SPANN, triplets), .1, 0, 23), { chance: .55 }), H(3)), 4: relative(set(human(mel(SPANN, triplets), .1, 0, 29), { chance: .55 }), H(4)),
  6: relative(mel('r:12 | r:12 | 24,28,31:1 21,24,28:1 19,22,24:1 16,19,22:1 12,16,19:8~* | r:12', triplets), H(6)),
  [FILL]: mel('24:1 21:1 19:1 16:1 15:1 12:1 10:1 7:1 4:1 3:1 0:2', triplets),
}
const leftHand = { 2: mel(rep('0:3 4:1 7:3 9:1 12:3 9:1 7:3 4:1', 12), { unit: C.M.beat / 4, gate: .8 }), 4: mel(rep('0:3 4:1 7:3 9:1 12:3 9:1 7:3 4:1', 12), { unit: C.M.beat / 4, gate: .8 }) }

// ---------- g1 Tenor sax: soft riff pads behind the harmonica solo and the last verse ----------
const sax = {
  4: relative(mel(rep('4:6~ r:2 | 3:2 4:4 r:2', 6), { gate: .95, accent: { strong: .7, beat: .66, off: .6 } }), H(4)),
  5: relative(mel(rep('r:8', 4) + ' | ' + rep('7:2s r:2 7:2s 10:2 | r:8', 4), { accent: { strong: .8 } }), H(5)),
}

// ---------- drums: Fred Below's shuffle ----------
const kick = { 0: hits('........ | o.o.o.o. | o.o.o.o. | X.......'), 1: hits(rep('X.......', 4) + ' | ' + rep('o.o.o.o.', 8)), 2: hits(rep('o.o.o.o.', 12)), 3: hits(rep('o.o.o.o.', 12)), 4: hits(rep('o.o.o.o.', 12)), 5: hits(rep('X.......', 4) + ' | ' + rep('o.o.o.o.', 8)), 6: hits('o.o.o.o. | X....... | X....... | ........') }
const BEAT = '..X...X.'
const snare = { 0: hits('........ | ........ | ........ | X.......'), 1: hits(rep('X.......', 4) + ' | ' + rep(BEAT, 8)), 2: hits(rep(BEAT, 12)), 3: hits(rep(BEAT, 12)), 4: hits(rep(BEAT, 12)), 5: hits(rep('X.......', 4) + ' | ' + rep(BEAT, 8)), 6: hits('..X...X. | X....... | X....... | ........'), [FILL]: hits('g.gXgRXR') }
const SHUF = 'x.x.x.x.'.replace(/\./g, 'g')
const hat = { 1: hits(rep('........', 4) + ' | ' + rep(SHUF, 8)), 2: hits(rep(SHUF, 12)), 4: hits(rep(SHUF, 12)), 5: hits(rep('........', 4) + ' | ' + rep(SHUF, 8)) }
const ghost = { 2: hits(rep('.g.g.?.g', 12)), 3: hits(rep('.g.?.g.?', 12)), 4: hits(rep('.g.g.?.g', 12)) }
const ride = { 0: hits('........ | xgxgxgxg | xgxgxgxg | ........'), 3: hits(rep('xgxgxgxg', 12)), 6: hits('xgxgxgxg | ........ | ........ | ........') }
const crash = { 1: hits('X.......'), 2: hits('X.......'), 3: hits('X.......'), 4: hits('X.......'), 5: hits(rep('X.......', 4)), 6: hits('........ | X....... | X....... | ........') }
const tom = { 0: hits('........ | ........ | ........ | ....xxRR'), 5: hits(rep('........', 11) + ' | ....xxRX'), [FILL]: hits('xxxxRRXX') }
const stomp = { 1: hits(rep('X...X...', 4)), 5: hits(rep('X...X...', 4)) }

const PARTS = present([
  P('a1', 'Upright bass', 'bass', 'phrase', SAMPLE('classical', 'concert-bass-pizz'), bass, on(...ALL),
    { octave: 1, gain: .3, attack: .004, decay: .5, sustain: .55, release: .18, clip: 1, lpf: 2400, hpf: 32, fills: { 2: FILL, 4: FILL }, effects: { reverb: .06 }, mapping: FIXED,
      design: { role: 'bass', filterEnv: .4, filterAttack: .004, filterDecay: .12 } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 1, false), kick, on(...ALL),
    { ...DRUM, gain: .11, decay: .3, release: .1, clip: .8, lpf: 3600, hpf: 30, effects: { reverb: .05 } }),
  P('b1', 'Harmonica', 'melody', 'phrase', SAMPLE('amps', 'harp'), harp, on(1, 2, 4, 6, 7),
    { octave: 4, gain: .05, attack: .015, decay: .3, sustain: .85, release: .22, clip: 1, lpf: 4200, hpf: 200, effects: { reverb: .2, pan: .1, delay: .08 }, mapping: FIXED,
      reverbRange: { first: .16, second: .24, frequency: 'section' }, design: { role: 'lead', vibrato: 5.6, vibratoDepth: .22, delayTime: '1/8', delayFeedback: .22 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 0, false), snare, on(...ALL),
    { ...DRUM, gain: .075, decay: .2, release: .12, clip: .8, lpf: 7000, hpf: 140, fills: { 1: FILL, 3: FILL, 5: FILL }, effects: { reverb: .24 } }),
  P('c1', 'Lead guitar', 'response', 'phrase', SAMPLE('amps', 'tweed'), lead, on(0, 1, 2, 3, 6, 7),
    { octave: 3, gain: .055, attack: .003, decay: .6, sustain: .55, release: .3, clip: 1, lpf: 5200, hpf: 110, effects: { reverb: .2, pan: -.3, delay: .06 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5.4, vibratoDepth: .2, delayTime: '1/8', delayFeedback: .18 } }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 0, false), hat, on(1, 2, 4, 5),
    { ...DRUM, gain: .035, decay: .06, release: .04, clip: .5, lpf: 9000, hpf: 2000, effects: { reverb: .05, pan: .3 } }),
  P('d1', 'Rhythm guitar', 'harmony', 'phrase', SAMPLE('amps', 'tweed'), rhythm, on(...ALL),
    { octave: 2, gain: .042, attack: .002, decay: .25, sustain: .3, release: .08, clip: .85, lpf: 3000, hpf: 90, effects: { reverb: .12, pan: .35 }, mapping: FIXED }),
  P('d2', 'Ghost snare', 'rhythm', 'pulse', SAMPLE('percussion', 'ghost-snare', 1, false), ghost, on(2, 3, 4),
    { ...DRUM, gain: .035, decay: .1, release: .06, clip: .5, lpf: 6000, hpf: 300, effects: { reverb: .12, pan: .05 } }),
  P('e1', 'Piano', 'harmony', 'phrase', SAMPLE('classical', 'concert-piano'), piano, on(1, 2, 3, 4, 6, 7),
    { octave: 3, gain: .055, attack: .002, decay: .5, sustain: .35, release: .3, clip: 1, lpf: 6500, hpf: 160, fills: { 5: FILL }, effects: { reverb: .2, pan: .22 }, mapping: FIXED }),
  P('e2', 'Ride', 'rhythm', 'pulse', SAMPLE('percussion', 'ride', 0, false), ride, on(0, 3, 7),
    { ...DRUM, gain: .04, decay: .5, release: .3, clip: .8, lpf: 9000, hpf: 400, effects: { reverb: .14, pan: -.2 } }),
  P('f1', 'Piano left hand', 'bass', 'phrase', SAMPLE('classical', 'concert-piano'), leftHand, on(2, 4),
    { octave: 2, gain: .04, attack: .002, decay: .4, sustain: .3, release: .2, clip: .9, lpf: 2800, hpf: 60, effects: { reverb: .14, pan: .15 }, mapping: FIXED }),
  P('f2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(1, 2, 3, 4, 5, 6, 7),
    { ...DRUM, gain: .03, decay: 1.2, release: .8, clip: 1, lpf: 8000, hpf: 300, effects: { reverb: .2, pan: -.25 } }),
  P('g1', 'Tenor sax', 'response', 'sustain', SAMPLE('band', 'tenor-sax', 1), sax, on(4, 5),
    { octave: 3, gain: .055, attack: .05, decay: .3, sustain: .8, release: .25, clip: 1, lpf: 4200, hpf: 120, effects: { reverb: .22, pan: -.15 }, mapping: FIXED,
      design: { vibrato: 4.8, vibratoDepth: .12 } }),
  P('g2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 0, false), tom, on(0, 5),
    { ...DRUM, gain: .06, decay: .3, release: .15, clip: .8, lpf: 5000, hpf: 60, fills: { 3: FILL }, effects: { reverb: .2 } }),
  P('h1', 'Slide guitar', 'melody', 'phrase', SAMPLE('amps', 'crunch'), slide, on(5),
    { octave: 3, gain: .05, attack: .004, decay: .6, sustain: .6, release: .3, clip: 1, lpf: 4800, hpf: 120, effects: { reverb: .26, pan: -.25, delay: .1 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 6, vibratoDepth: .28, delayTime: '1/8', delayFeedback: .25 } }),
  P('h2', 'Foot stomp', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), stomp, on(1, 5),
    { ...DRUM, gain: .07, decay: .25, release: .1, clip: .7, lpf: 900, hpf: 30, effects: { reverb: .2 } }),
], FORM)

const SECTION_PARAMS = {
  c1: { 3: { gain: .068, reverbRange: { first: .22, second: .3 } } },
  b1: { 4: { gain: .058 }, 6: { gain: .055 } },
  d1: { 3: { gain: .036 }, 4: { gain: .036 } },
  h1: { 5: { gain: .055 } },
  e1: { 7: { reverbRange: { first: .35, second: .45 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'chicago-1958', kitName: 'Electric blues', profileName: 'Electric blues · Chicago 1958',
  bpm: 112, meter: '4/4', root: 'A', scale: 'Chromatic', form: FORM, parts: PARTS, grid: 192,
  reactions: reactions('chicago', { lift: 2, contrast: 5, lament: 4, calm: 1, finale: 6, climax: 3, solo: 3 }),
  reference: 'Blues elétrico de Chicago na Chess Records nos anos 1950 (Muddy Waters com Otis Spann, Little Walter, Jimmy Rogers, Willie Dixon e Fred Below); composição original: shuffle de 12 compassos em Lá com swing de tercina, primeiro refrão em stop-time, gaita amplificada respondendo à guitarra num tweed saturado, solo de gaita, quebra de slide no estilo Elmore James e final com turnaround.',
  url: 'https://www.britannica.com/art/Chicago-blues',
}).catch(error => { console.error(error); process.exit(1) })
