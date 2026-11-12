// 1960 Rio de Janeiro - Bossa nova (original material).
// Zona Sul, late at night. The violão's batida (thumb on one and three, the fingers on the syncopated
// chords, the last one anticipating the next bar) is the heart; the drums whisper: the hi-hat plays soft
// eighths with ghost sixteenths that come and go, laid back a hair and never twice the same, brushes swish,
// the cross-stick plays the bossa clave over two bars, the bass drum doubles the double bass. The flute sings
// long phrases on the sevenths and ninths; a tenor sax takes the solo; strings come in for the last chorus.
// F major, every chord a seventh (Kit Harmony: one root per bar, voicings 3-5-7-9).
// Form: violão intro · A · B · madrugada (soft: violão, bass and brushes) · sax solo · ponte (tense: Dm,
// samba-jazz in double time) · A · B with strings · coda.
// Run: node scripts/brazilian/rio-1960.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('4/4', 'Maior')
const { mel, rep, hits, comp, relative, strum, portamento, feel, tone, swell, set, vel, up } = C
const E = C.M.eighth

// F major degrees: 0 F · 1 G · 2 A · 3 Bb · 4 C · 5 D · 6 E (7 = F an octave up).
const A = [0, 0, 1, 4, 2, 5, 1, 4]  // a section repeats its harmony: 16 bars play it twice
const B = [3, 3, 2, 5, 1, 4, 0, 0]
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: [0, 5, 1, 4] },
  { label: 'Verse', bars: 16, bank: 1, harmony: A },
  { label: 'Chorus', bars: 8, bank: 2, harmony: B },
  { label: 'Interlude', bars: 8, bank: 3, harmony: [0, 3, 0, 3, 5, 1, 4, 4] },  // madrugada: soft
  { label: 'Solo', bars: 16, bank: 4, harmony: A },
  { label: 'Bridge', bars: 8, bank: 5, harmony: [5, 5, 2, 2, 1, 1, 4, 4] },    // ponte: tense, double time
  { label: 'Verse', bars: 16, bank: 1, harmony: A },
  { label: 'Chorus', bars: 8, bank: 2, harmony: B },
  { label: 'Outro', bars: 4, bank: 6, harmony: [0, 3, 0, 0] },
]
const H = bank => FORM.find(s => s.bank === bank).harmony
/** The harmony bar by bar over the whole section (a section loops its harmony list). */
const HB = bank => { const s = FORM.find(x => x.bank === bank); return Array.from({ length: s.bars }, (_, i) => s.harmony[i % s.harmony.length]) }
const A16 = HB(1)
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
// A loose, laid-back hand: no fixed push, a little late, a little uneven.
const easy = (seed, notes, extra = {}) => feel(notes, { jitter: 1, vel: .05, seed, ...extra })
const R8 = '........'

// ---------- the songs (absolute degrees, eighths) ----------
const SONG_A = mel([
  'r:2 4:1 6:2 7:3~', '6:6~ r:2', 'r:1 5:1 4:1 3:2 1:3', '2:4~ r:1 1:1 2:1 4:1',
  '6:3 4:1 2:2 4:2', '7:6~ r:2', 'r:1 8:1 7:1 5:2 3:3', '4:5~ r:3',
  'r:2 6:1 8:2 9:3~', '7:4~ 5:2 4:2', '3:3 5:1 7:2 8:2', '6:6~ r:2',
  'r:1 4:1 6:1 8:2 9:3~', '8:4~ 7:2 6:2', '5:3 3:1 1:2 2:2', '-1:2 1:2 4:4~',
].join('|'), { unit: E, accent: { strong: .78, beat: .7, off: .64 } })
const SONG_B = mel([
  'r:2 9:2 8:1 7:3~', '5:4~ r:1 6:1 7:1 9:1', '11:3 9:1 8:2 6:2', '7:6~ r:2',
  'r:1 10:1 9:1 8:2 5:3', '6:4~ 4:2 2:2', '4:2 6:2 7:4~', '6:6~* r:2',
].join('|'), { unit: E, accent: { strong: .8, beat: .74, off: .66 } })
const PONTE = mel([
  '12:2! 11:1 9:1 7:2 5:2', 'r:1 5:1 7:1 9:1 12:4~', '13:2! 11:1 9:1 8:2 6:2', 'r:1 6:1 8:1 9:1 11:4~',
  '12:2! 10:1 8:1 7:2 5:2', 'r:1 5:1 7:1 8:1 10:4~', '11:2! 10:1 8:1 6:2 4:2', '6:1 8:1 10:1 11:1 13:4~*',
].join('|'), { unit: E, accent: { strong: .92, beat: .86, off: .8 } })
const SOLO = mel([
  'r:1 4:1 6:1 7:1 9:2 7:2', '6:3 4:1 2:4~', 'r:1 3:1 5:1 7:1 8:2 7:1 5:1', '6:2^1 4:2 2:1 1:1 -1:2',
  '0:1 2:1 4:1 6:1 7:4~', 'r:2 9:1 7:1 6:2 4:2', '5:2 3:1 1:1 3:2 5:2', '4:6~ r:2',
  'r:1 8:1 9:1 11:1 9:2 8:2', '7:3 5:1 4:4~', 'r:1 10:1 9:1 8:1 7:1 5:1 3:2', '6:2 8:2 10:2 9:2',
  '9:3~ 7:1 5:2 6:2', '8:4~ r:1 6:1 8:1 9:1', '10:2 8:1 7:1 5:2 3:2', '4:6~* r:2',
].join('|'), { unit: E, accent: { strong: .82, beat: .76, off: .7 } })
// Melodies breathe: a little loose in time, the long notes with vibrato, wide leaps slid into.
const sing = (notes, bank, seed) => relative(easy(seed, portamento(notes, 5, .07, 2)), H(bank))

// ---------- d1 Flute (queen): the tune ----------
const flute = {
  0: relative(mel('r:8 | r:8 | r:8 | r:4 1:1 2:1 4:2~', { unit: E }), H(0)),
  1: sing(SONG_A, 1, 11), 2: sing(SONG_B, 2, 12),
  5: sing(set(PONTE, {}), 5, 13),
  6: relative(mel('r:2 4:1 6:2 7:3~ | 6:8~* | r:8 | r:8', { unit: E }), H(6)),
}
// ---------- f1 Tenor sax: the solo, a low answer in the madrugada ----------
const sax = {
  3: relative(easy(31, mel('r:8 | r:4 2:2 4:2 | 3:8~ | r:8 | r:4 5:2 7:2 | 8:8~ | 4:4 2:4 | 1:8~*', { unit: E, accent: { strong: .62, beat: .58, off: .55 } })), H(3)),
  4: sing(SOLO, 4, 32),
}
// ---------- b1 Trumpet with mute: answers in B, doubles the ponte a sixth below ----------
const trumpet = {
  2: relative(easy(41, mel('r:8 | r:4 7:2 6:2 | r:8 | r:4 5:2 4:2 | r:8 | r:4 6:2 4:2 | r:8 | r:8', { unit: E, accent: { strong: .6, beat: .56, off: .52 } })), H(2)),
  5: relative(easy(42, up(PONTE, -5)), H(5)),
}

// ---------- e1 Violão · batida (king): thumb on one and three, the fingers syncopated ----------
// Voicing 3-5-7-9 over each root, the thumb an octave below the root (the fifth on three).
const V = [2, 4, 6, 8]
const batida = (bank, rhythm, seed, extra = {}) => {
  const fingers = comp(HB(bank), rhythm, V, { unit: E, length: E * 1.6, ahead: 1 })
  const thumb = comp(HB(bank), 'o...h...', [-7], { unit: E, length: E * 1.8 }).map(n => (Math.round(n.start * 8) % 8 === 4 ? { ...n, degree: n.degree + 4 } : n))
  return relative(strum(easy(seed, [...vel(fingers, .9), ...thumb], extra), 1 / 128), H(bank))
}
const BATIDA = 'o..m..o. | .m..o..m'
const violao = {
  0: batida(0, 'm..o..o. | .o..m..o', 51), 1: batida(1, BATIDA, 52), 2: batida(2, BATIDA, 53),
  3: batida(3, 'o.....o. | ...h...o', 54), 4: batida(4, BATIDA, 55),
  5: batida(5, 'm.om.om. | .m.om.om', 56), 6: relative(strum(mel('0,2,4,6:8~* | 3,5,7,9:8~ | 2,4,6,8:8~ | 2,4,6,8,9:8*', { unit: E, gate: 1, accent: { strong: .6 } }), 1 / 64), H(6)),
}

// ---------- a1 Double bass: root on one, the fifth on three, the and-of-four anticipating ----------
const walk = (cell, bars, seed) => easy(seed, mel(rep(cell, bars), { unit: E, gate: .9, accent: { strong: .82, beat: .74, off: .62 } }))
const bass = {
  0: walk('0:3 0:1 4:4', 4, 61), 1: walk('0:3 0:1 4:3 4:1 | 0:3 0:1 4:4', 8, 62), 2: walk('0:3 0:1 4:3 4:1 | 0:3 0:1 4:4', 4, 63),
  3: walk('0:6 4:2', 8, 64), 4: walk('0:3 0:1 4:3 4:1 | 0:2 2:2 4:2 6:2', 8, 65),
  5: walk('0:1 0:1 4:1 0:1 0:1 4:1 7:1 4:1 | 0:1 0:1 4:1 0:1 6:1 4:1 2:1 1:1', 4, 66), 6: mel('0:8 | 0:8 | 0:8 | 0:8*', { unit: E }),
  [FILL]: mel('0:2 2:2 4:2 6:2', { unit: E }),
}

// ---------- drums: soft and different each bar ----------
// e2 Hi-hat: soft eighths (downbeats a touch louder), ghost sixteenths that only sometimes speak, open-ish
// barks never; laid back by a tick and uneven in dynamics: never twice the same bar.
const HAT = 'o,h.h,h. o,h.h.h, | o.h,h,h. o,h.h,h,'
const hihat = {
  1: tone(easy(71, hits(rep(HAT, 8)), { late: 1, vel: .07 }), .25), 2: tone(easy(72, hits(rep(HAT, 4)), { late: 1, vel: .07 }), .25),
  4: tone(easy(73, hits(rep('o.h,h.h, o,h.h.h, | o.h,h.h. o.h,h,h,', 8)), { late: 1, vel: .07 }), .25),
  5: tone(easy(74, hits(rep('m,h,m,h, m,h,m,h,', 8)), { vel: .06 }), .25),
}
// c2 Brushes: the swish on every eighth, accents on two and four.
const brushes = {
  1: easy(81, hits(rep('h.g.o.g.h.g.o.g.', 16)), { vel: .05 }), 2: easy(82, hits(rep('h.g.o.g.h.g.o.g.', 8)), { vel: .05 }),
  3: easy(83, hits(rep('g...h...g...h...', 8)), { vel: .04 }), 4: easy(84, hits(rep('h.g.o.g.h.g.o.g.', 16)), { vel: .05 }),
  5: easy(85, hits(rep('o,g,m,g,o,g,m,g,', 8)), { vel: .05 }), 6: hits('h.g.o.g.h.g.o.g. | g...h........... | ................ | ................'),
}
// b2 Cross-stick: the bossa clave over two bars.
const CLAVE = 'm..m..m. | ..m..m..'
const rim = {
  1: easy(91, hits(rep(CLAVE, 8), { unit: E })), 2: easy(92, hits(rep(CLAVE, 4), { unit: E })),
  4: easy(93, hits(rep(CLAVE, 8), { unit: E })), 5: easy(94, hits(rep('m..m..m. | ..m..m.m', 4), { unit: E })),
}
// a2 Bass drum: doubles the double bass, felt more than heard.
const kick = {
  1: easy(101, hits(rep('o..h....o..h.... | o..h....o.......', 8))), 2: easy(102, hits(rep('o..h....o..h.... | o..h....o.......', 4))),
  4: easy(103, hits(rep('o..h....o..h.... | o..h....o.......', 8))), 5: easy(104, hits(rep('m..o..o.m..o..o.', 8))),
  6: hits('o............... | ................ | ................ | o...............'),
}
// f2 Ride: the solo and the ponte.
const ride = { 4: easy(111, hits(rep('o.h.o.h, | o.h,o.h.', 8), { unit: E })), 5: easy(112, hits(rep('m.o.m.o.', 8), { unit: E })) }
// d2 Shaker: B and the last chorus, very soft.
const shaker = { 2: easy(121, hits(rep('g,h,g,h,g,h,g,h,', 8)), { vel: .05 }), 5: easy(122, hits(rep('g.h.g.h.g.h.g.h.', 8)), { vel: .05 }) }
// g2 Snare with brush: a soft accent on four, more of them in the ponte.
const snare = {
  1: easy(131, hits(rep('................ | ............o...', 8))), 4: easy(132, hits(rep('................ | ............o.h.', 8))),
  5: swell(easy(133, hits(rep('....o.......o.g. | ....o..g....o.oo', 4))), 8, .7, 1),
}
// h2 Brush fills into the sections.
const fills = { [FILL]: easy(141, hits('g.g.h.h.o.o.m.m.')) }

// ---------- harmony: piano (h1), strings (g1), marimba (c1) ----------
const piano = {
  1: relative(easy(151, comp(A16, '.....o.. | ...o.... | .....o.. | ......o.', [2, 4, 6, 8], { unit: E, length: E * 1.4, ahead: 0 }), { vel: .06 }), A),
  2: relative(easy(152, comp(B, '..o...o. | ....o...', [2, 4, 6, 8], { unit: E, length: E * 1.6 }), { vel: .06 }), B),
  4: relative(easy(153, comp(A16, '...o..o. | .o...o..', [2, 4, 6, 8], { unit: E, length: E * .9 })), A),
  5: relative(easy(154, comp(HB(5), 'm..m..m. | ..m..m.m', [2, 4, 6, 8], { unit: E, length: E * .8, ahead: 1 })), H(5)),
  6: relative(mel('r:8 | r:8 | r:4 9:1 11:1 13:2~ | 7,9,11,13:8*', { unit: E }), H(6)),
}
const strings = {
  2: relative(mel('2,4,6:8 | 2,4,6:8 | 2,4,6:8 | 2,4,6:8 | 2,4,6:8 | 2,4,6:8 | 2,4,6,8:8 | 2,4,6,8:8', { unit: E, gate: 1, accent: { strong: .55 } }).map(n => ({ ...n, degree: n.degree + H(2)[Math.floor(n.start)] })), H(2)),
  6: relative(mel('2,4,6,8:8~ | 2,4,6,8:8~ | 2,4,6,8:8~ | 2,4,6,8:8*', { unit: E, gate: 1, accent: { strong: .5 } }).map(n => ({ ...n, degree: n.degree + H(6)[Math.floor(n.start)] })), H(6)),
}
// The marimba answers the flute's phrase ends, lightly and not always.
const marimba = {
  1: relative(easy(161, mel(rep('r:8 | r:8 | r:8 | r:5 7:1? 9:1? 11:1?', 4), { unit: E, accent: { strong: .6, beat: .56, off: .52 } })).map(n => ({ ...n, degree: n.degree + A16[Math.floor(n.start)] - 4 })), A),
  3: relative(easy(162, mel(rep('r:4 4:1 6:1 7:2 | r:8', 4), { unit: E, accent: { strong: .5, beat: .48, off: .45 } })).map(n => ({ ...n, degree: n.degree + H(3)[Math.floor(n.start)] - 4 })), H(3)),
}

const PARTS = [
  P('a1', 'Contrabaixo', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { octave: 2, gain: .4, attack: .006, decay: .5, sustain: .5, release: .25, clip: 1, lpf: 1800, hpf: 35, fills: { 4: FILL }, effects: { reverb: .08 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Bumbo', 'rhythm', 'pulse', DRUM('percussion', 'kick'), kick, on(1, 2, 4, 5, 6, 7, 8),
    { octave: 2, gain: .14, attack: .001, decay: .25, sustain: 0, release: .1, clip: .7, lpf: 2500, hpf: 35, effects: { reverb: .04 }, design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('b1', 'Trompete com surdina', 'response', 'phrase', SAMPLE('sambaReggae', 'trompete'), trumpet, on(2, 5, 7),
    { octave: 4, gain: .2, attack: .02, decay: .3, sustain: .7, release: .2, clip: 1, lpf: 2600, hpf: 300, effects: { reverb: .2, pan: .25, delay: .08 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .08, delayTime: '3/8', delayFeedback: .2 }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('b2', 'Aro · clave da bossa', 'rhythm', 'pulse', DRUM('drums', 'wood-rim'), rim, on(1, 2, 4, 5, 6, 7),
    { octave: 2, gain: .15, attack: .001, decay: .08, sustain: 0, release: .05, clip: .5, lpf: 6000, hpf: 400, effects: { reverb: .12, pan: -.15 }, design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('c1', 'Marimba', 'response', 'phrase', SAMPLE('band', 'marimba'), marimba, on(1, 3, 6),
    { octave: 4, gain: .45, attack: .002, decay: .5, sustain: .2, release: .3, clip: 1, lpf: 6000, hpf: 200, effects: { reverb: .22, pan: .35 }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('c2', 'Vassourinha', 'rhythm', 'pulse', DRUM('drums', 'brush'), brushes, on(1, 2, 3, 4, 5, 6, 7, 8),
    { octave: 2, gain: .17, attack: .002, decay: .15, sustain: 0, release: .1, clip: .7, lpf: 7000, hpf: 600, effects: { reverb: .1, pan: .1 }, design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('d1', 'Flauta', 'melody', 'phrase', SAMPLE('classical', 'flute-sustain'), flute, on(0, 1, 2, 5, 6, 7, 8),
    { octave: 4, gain: .5, attack: .04, decay: .3, sustain: .8, release: .3, clip: 1, lpf: 7000, hpf: 250, effects: { reverb: .22, pan: 0 },
      reverbRange: { first: .2, second: .26, frequency: 'section' }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .1 }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('d2', 'Shaker', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), shaker, on(2, 5, 7),
    { octave: 2, gain: .1, attack: .001, decay: .08, sustain: 0, release: .05, clip: .5, lpf: 8000, hpf: 3000, effects: { reverb: .06, pan: .4 }, design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('e1', 'Violão · batida', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), violao, on(...ALL),
    { octave: 3, gain: .22, attack: .003, decay: .6, sustain: .3, release: .3, clip: 1, lpf: 4200, hpf: 70, effects: { reverb: .14, pan: -.2 }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('e2', 'Chimbal', 'rhythm', 'pulse', DRUM('percussion', 'hat', 1), hihat, on(1, 2, 4, 5, 6, 7),
    { octave: 2, gain: .1, attack: .002, decay: .05, sustain: 0, release: .04, clip: .4, lpf: 6500, hpf: 3500, effects: { reverb: .08, pan: .3 }, design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('f1', 'Sax tenor', 'melody', 'phrase', SAMPLE('band', 'tenor-sax'), sax, on(3, 4),
    { octave: 3, gain: .12, attack: .04, decay: .3, sustain: .8, release: .3, clip: 1, lpf: 3600, hpf: 110, effects: { reverb: .24, pan: -.1 }, design: { role: 'lead', vibrato: 4.4, vibratoDepth: .12 }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('f2', 'Prato de condução', 'rhythm', 'pulse', DRUM('percussion', 'ride'), ride, on(4, 5),
    { octave: 2, gain: .1, attack: .001, decay: .5, sustain: 0, release: .3, clip: .8, lpf: 7000, hpf: 400, effects: { reverb: .12, pan: -.35 }, design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('g1', 'Cordas', 'harmony', 'sustain', SAMPLE('classical', 'viola-sustain'), strings, on(7, 8),
    { octave: 4, gain: .22, attack: .6, decay: .5, sustain: .85, release: .9, clip: 1, lpf: 4500, hpf: 200, effects: { reverb: .34, pan: .3 }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('g2', 'Caixa · vassourada', 'rhythm', 'pulse', DRUM('percussion', 'ghost-snare'), snare, on(1, 4, 5, 6),
    { octave: 2, gain: .1, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 5000, hpf: 250, effects: { reverb: .12, pan: -.05 }, design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('h1', 'Piano', 'harmony', 'phrase', SAMPLE('band', 'piano'), piano, on(1, 2, 4, 5, 6, 7, 8),
    { octave: 3, gain: .1, attack: .003, decay: .6, sustain: .3, release: .4, clip: 1, lpf: 4500, hpf: 150, effects: { reverb: .2, pan: .2 }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('h2', 'Vassourinha · virada', 'rhythm', 'pulse', DRUM('drums', 'brush'), fills, on(0, 1, 2, 3, 4, 5, 6, 7),
    { octave: 2, gain: .16, attack: .002, decay: .15, sustain: 0, release: .1, clip: .7, lpf: 7000, hpf: 600, effects: { reverb: .12, pan: -.1 }, fills: { 0: FILL, 2: FILL, 3: FILL, 4: FILL, 7: FILL }, design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
]
// h2 plays only its fills; every other part plays where it has material.
for (const part of PARTS) part.sections = part.sections.map((present, i) => present && (part.rolls[FORM[i].bank] || part.fills?.[i] !== undefined) ? true : null)
PARTS.find(p => p.slot === 'h2').rolls = Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }]).concat([[FILL, fills[FILL]]]))
PARTS.find(p => p.slot === 'h2').sections = FORM.map((_, i) => [0, 2, 3, 4, 7].includes(i) || null)

// ---------- per-section sound ----------
const SECTION_PARAMS = {
  e1: { 0: { reverbRange: { first: .22, second: .26 } }, 3: { lpfRange: { first: 3000, second: 3400 }, reverbRange: { first: .22, second: .26 } }, 5: { gain: .25, lpfRange: { first: 5000, second: 5400 } }, 8: { reverbRange: { first: .32, second: .38 } } },
  a1: { 3: { gain: .32, lpfRange: { first: 1300, second: 1500 } } },
  c2: { 3: { gain: .12 }, 5: { gain: .2 } },
  d1: { 5: { gain: .56, reverbRange: { first: .14, second: .18 } }, 8: { reverbRange: { first: .34, second: .4 } } },
  e2: { 5: { gain: .12, lpfRange: { first: 8000, second: 8500 } } },
  h1: { 5: { gain: .12, lpfRange: { first: 5500, second: 6000 } }, 8: { reverbRange: { first: .36, second: .42 } } },
  f1: { 3: { gain: .09, reverbRange: { first: .32, second: .36 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'rio-1960', kitName: 'Bossa nova', profileName: 'Rio de Janeiro 1960 · Bossa nova', meter: '4/4', bpm: 116, root: 'F', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('bos', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 4, finale: 6 }),
  reference: 'Bossa nova carioca (batida do violão de João Gilberto, harmonias de Tom Jobim, sax de Stan Getz nas gravações de 1962–64): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Bossa_nova',
}).catch(error => { console.error(error); process.exit(1) })
