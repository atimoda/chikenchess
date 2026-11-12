// 1978 Kinshasa - Soukous (original material).
// A dance band on a Matonge terrace. The song opens as a rumba: the lead guitar alone, then maracas, the
// accompaniment guitar, bass and the tenor saxophone, the singers in thirds over a rim clave and congas.
// Then the sebene: the snare takes the cavacha, the lead guitar runs high figures, the mi-solo guitar answers
// in the middle and the bass bounces between root and fifth while the singers chant.
// C major (Kit Harmony): the I–IV–V–IV wheel of the sebene.
// Form: rumba introduction (one by one) · rumba (singers) · sebene (cavacha) · interlude (soft: A minor,
// saxophone over two guitars, maracas and congas) · rumba · animation (tense: the band hits on G, toms and
// shouts) · lead guitar sebene · sebene · final.
// Run: node scripts/africa/kinshasa-1978.cjs
const { studio, build, reactions, SAMPLE, DRUM, P } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // C major degrees: 0 C · 1 D · 2 E · 3 F · 4 G · 5 A · 6 B.
  root: { C: 0, F: 3, G: 4, Am: -2, Dm: 1 },
  names: {
    0: ['C', 'F', 'G', 'C', 'C', 'F', 'G', 'G'], 1: ['C', 'F', 'G', 'C', 'C', 'Am', 'Dm', 'G'], 2: ['C', 'F', 'G', 'F'],
    3: ['Am', 'Dm', 'G', 'C', 'Am', 'Dm', 'G', 'G'], 4: ['C', 'F', 'G', 'F'], 5: ['G'], 6: ['C', 'F', 'G', 'C'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Bright and forward: only the last sixteenth leans ahead (ticks of ~15 ms), light hands.
  feel: { push: [0, 0, 0, -1], jitter: 1, vel: .06 },
  colour: { spread: .1, ring: .14 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, bars, figure, riff, from, unroll, finish } = S
const { rep, mel } = C
const R = '................'
const HITS = 'X.X. ..X. X... .... | X.X. ..X. X.X. X...'
const END = 'X..X ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- drum kit: rim clave in the rumba, cavacha in the sebene ----------
const CAVACHA = 'x.xx .xx. x.xx .xx. | x.xx .xx. x.xx .xxx'
const kick = {
  0: beat(11, enter(4, 'o... .... o... ....')), 1: drum(1, 12, 'x... .... x... ..o.'), 2: drum(2, 13, 'X... x... X... x... | X... x... X... x.x.'), 3: drum(3, 14, 'o... .... o... ....'),
  4: drum(4, 15, 'X... x... X... x... | X... x... X... x.x.'), 5: drum(5, 16, HITS), 6: beat(17, `X... x... X... x... | X... x... X... x.x. | ${END}`),
}
const snare = {
  2: drum(2, 21, CAVACHA), 4: drum(4, 22, 'x.xx .xx. x.xx .xx. | x.xx .xx. x.xx xxXx'), 5: drum(5, 23, HITS), 6: beat(24, `${CAVACHA} | ${END}`),
}
const rim = {
  0: beat(31, enter(4, 'o..o ..o. ..o. o...')), 1: drum(1, 32, 'x..x ..x. ..x. x...'), 3: drum(3, 33, 'h..h ..h. ..h. h...'),
}
const hat = {
  1: drum(1, 41, 'h.g. h.g. h.g. h.gh'), 2: drum(2, 42, 'x.h. x.h. x.h. x.hm | x.h. x.h. x.h. xmhm'), 4: drum(4, 43, 'x.h. x.h. x.h. x.hm | x.h. x.h. x.h. xmhm'),
  5: drum(5, 44, 'x... x... x... x.hm | x... x... x.x. xhxh'), 6: beat(45, `x.h. x.h. x.h. x.hm | x.h. x.h. x.h. xmhm | ${END}`),
}
const maracas = {
  0: beat(51, enter(2, 'o.g, o.g, o.g, o.gh')), 1: drum(1, 52, 'm.hh m.hh m.hh m.hh'), 2: drum(2, 53, 'X.hm X.hm X.hm X.hm'), 3: drum(3, 54, 'o.g, o.g, o.g, o.gh'),
  4: drum(4, 55, 'X.hm X.hm X.hm X.hm'), 5: drum(5, 56, 'X.mx X.mx X.mx X.mx'), 6: beat(57, `X.hm X.hm X.hm X.hm | X.hm X.hm X.hm X.hm | ${END}`),
}
const conga = {
  0: beat(61, enter(4, 'o... ..o. .... o.o.')), 1: drum(1, 62, 'o... ..x. .... x.x. | o... ..x. ..o. x.x.'), 2: drum(2, 63, 'x... ..x. ..o. x.x. | x.o. ..x. ..o. x.xx'),
  3: drum(3, 64, 'h... ..o. .... o.o.'), 4: drum(4, 65, 'x.o. ..x. .xo. x.x. | o.x. .ox. ..x. xxox'), 5: drum(5, 66, '.... .... .... x.xx | .... .... .... ....'),
  6: beat(67, `x... ..x. ..o. x.x. | x.o. ..x. ..o. x.xx | ${END}`),
}
const slap = {
  1: drum(1, 71, '..h. h... h.h. ....'), 2: drum(2, 72, '..o. o..h o.h. ....'), 3: drum(3, 73, '..g. h... g.h. ....'), 4: drum(4, 74, '..o. o..h o.h. .o..'),
}
const bell = { 2: drum(2, 81, 'x... x.o. x... x.o.'), 4: drum(4, 82, 'x... x.o. x.o. x.o.'), 6: beat(83, `x... x.o. x... x.o. | x... x.o. x.o. x.o. | ${END}`) }
const toms = { 5: drum(5, 91, '.... .... .... .... | .... .... .... .xxX | .... .... .... .... | .... .... xxox xoXX'), [FILL]: beat(92, 'x.o. x.o. xmxm XXXx') }

// ---------- bass and guitars ----------
const bass = {
  0: from(4, unroll(riff(1, 101, '0:6! 4:2 7:4 4:4', { gate: .85 }), 8)), 1: riff(2, 102, '0:6! 4:2 7:4 4:4 | 0:6! 4:2 7:4 4:2 2:2', { gate: .85 }),
  2: riff(2, 103, '0:3! 0:1 4:2 7:2 r:2 4:2 0:2 4:2 | 0:3! 0:1 4:2 7:2 r:2 4:2 7:2 4:2', { gate: .68 }), 3: riff(1, 104, '0:8! 4:4 7:4', { gate: .9 }),
  4: riff(2, 105, '0:3! 0:1 4:2 7:2 r:2 4:2 0:2 4:2 | 0:3! 0:1 4:2 7:2 4:2 2:2 0:2 2:2', { gate: .68 }),
  5: riff(2, 106, '0:2! 0:2 r:2 0:2 r:2 0:2 r:4 | 0:2! 0:2 r:2 0:2 0:2 r:2 0:2 r:2', { gate: .6 }),
  6: mel('0:3! 0:1 4:2 7:2 r:2 4:2 0:2 4:2 | 0:3! 0:1 4:2 7:2 r:2 4:2 0:2 4:2 | 0:3! 0:3 0:2 0:8 | 0:8!', { gate: .7 }),
}
const CHORD = { C: [0, 2, 4], F: [0, 3, 5], G: [1, 4, 6], Am: [0, 2, 5], Dm: [1, 3, 5] }
const accompaniment = {
  0: from(2, unroll(comp(CHORD, 0, 'o.h. o.ho o.h. o.h.', 111, { length: 1 / 12 }), 8)), 1: comp(CHORD, 1, 'o.h. o.ho o.h. o.h. | o.h. o.ho o.h. o.hh', 112, { length: 1 / 12 }),
  2: comp(CHORD, 2, 'x.o. x.ox x.o. x.ox', 113, { length: 1 / 16 }), 3: comp(CHORD, 3, 'h... ..h. h... ..h.', 114, { length: 1 / 6 }),
  4: comp(CHORD, 4, 'x.o. x.ox x.o. x.ox', 115, { length: 1 / 16 }), 5: comp(CHORD, 5, HITS, 116, { length: 1 / 16 }),
  6: C.relative(S.hand(117, C.named(['C', 'F', 'G', 'C'], `x.o. x.ox x.o. x.ox | x.o. x.ox x.o. x.ox | ${END}`, CHORD, { length: 1 / 16 })), H(6)),
}
// Lead and mi-solo figures: a–d are each chord's notes from low to high.
const HIGH = { C: [7, 9, 11, 14], F: [7, 10, 12, 14], G: [8, 11, 13, 15], Am: [7, 9, 12, 14], Dm: [8, 10, 12, 15] }
const MID = { C: [7, 9, 11], F: [7, 10, 12], G: [8, 11, 13], Am: [7, 9, 12], Dm: [8, 10, 12] }
const pick = { gate: 1.2, accent: { strong: .84, beat: .76, off: .68 } }
const RUMBA = figure(HIGH, 'a:2 b:2 c:2 d:2 c:2 b:2 c:4', 'b:2 c:2 d:2 c:2 b:2 a:2 b:4')
const SEBENE = figure(HIGH, 'c:2 b:1 c:1 d:2 c:2 b:2 a:1 b:1 c:2 b:2', 'd:2 c:1 d:1 c:2 b:2 c:2 b:1 c:1 a:2 b:2')
const SEBENE_SOLO = figure(HIGH, 'd:1 c:1 d:2 c:1 b:1 c:2 d:1 c:1 b:2 c:1 d:1 c:2', 'c:2 d:1 c:1 b:2 c:2 d:2 d:1 c:1 b:2 a:2', 'd:1 d:1 c:2 d:1 d:1 c:2 b:1 c:1 d:2 c:2 b:2', 'a:1 b:1 c:1 d:1 c:1 b:1 c:1 d:1 c:2 b:2 a:2 b:2')
const lead = {
  0: bars(0, 121, RUMBA, pick), 1: bars(1, 122, figure(HIGH, 'r:8 c:2 d:2 c:4', 'r:16'), pick), 2: bars(2, 123, SEBENE, pick),
  4: bars(4, 124, SEBENE_SOLO, pick), 5: bars(5, 125, figure(HIGH, 'd:1 d:1 r:2 d:1 d:1 r:2 c:2 d:2 r:4', 'd:1 d:1 r:2 d:1 d:1 r:2 d:2 c:2 d:2 r:2'), pick),
  6: tune('11:2 9:1 11:1 14:2 11:2 9:2 7:1 9:1 11:2 9:2 | 12:2 10:1 12:1 14:2 12:2 10:2 7:1 10:1 12:2 10:2 | 13:3 13:3 11:2 15:8 | 14:8 r:8', 6, 126, { glide: 0, low: .6, high: .9, mel: { gate: 1.2 } }),
}
const ANSWER = figure(MID, 'r:1 a:1 b:2 c:1 b:1 a:2 r:1 b:1 c:2 b:1 a:1 b:2', 'r:1 b:1 c:2 b:1 a:1 b:2 r:1 a:1 b:2 c:1 b:1 a:2')
const misolo = {
  0: from(6, bars(0, 131, figure(MID, 'r:2 a:2 b:2 c:2 b:2 a:2 b:4'), pick)), 2: bars(2, 132, ANSWER, pick), 3: bars(3, 133, figure(MID, 'a:2 b:2 c:2 b:2 a:2 b:2 c:2 b:2'), { gate: 1.5 }),
  4: bars(4, 134, ANSWER, pick), 5: bars(5, 135, figure(MID, 'c:1 c:1 r:2 c:1 c:1 r:2 b:2 c:2 r:4'), pick),
}

// ---------- singers and saxophone ----------
const CANTO = '9:3 9:3 8:2 9:4 11:4 | 12:3 10:3 8:2 10:6~ r:2 | 11:3 11:3 13:2 11:4 8:4 | 9:8~ r:8 | 9:3 9:3 8:2 9:4 11:4 | 12:3 11:3 9:2 7:6~ r:2 | 10:3 10:3 8:2 10:4 12:4 | 11:8~ r:8'
const CHANT = rep('11:2 11:2 r:2 9:2 11:4 r:4 | 12:2 12:2 r:2 10:2 12:4 r:4 | 13:2 13:2 r:2 11:2 13:4 r:4 | 12:2 10:2 r:2 10:2 8:4 r:4', 2)
const SHOUT = 'r:8 11:2 11:2 13:4 | r:16 | r:8 11:2 11:2 13:4 | r:16 | r:8 11:2 11:2 13:4 | r:16 | 11:2 11:2 13:2 13:2 11:2 11:2 15:4 | 15:8~ r:8'
const FIM = '11:2 11:2 r:2 9:2 11:4 r:4 | 12:2 12:2 r:2 10:2 12:4 r:4 | 13:3 13:3 11:2 14:8~ | r:16'
const voz = { 1: tune(CANTO, 1, 141, { low: .56, high: .86 }), 2: tune(CHANT, 2, 142, { low: .6, high: .88 }), 5: tune(SHOUT, 5, 143, { low: .7, high: .94 }), 6: tune(FIM, 6, 144, { low: .62, high: .92 }) }
const voz2 = { 1: harmony(CANTO, 1, 151, { low: .52, high: .8 }), 2: harmony(CHANT, 2, 152, { low: .56, high: .84 }), 5: harmony(SHOUT, 5, 153, { low: .66, high: .9 }), 6: harmony(FIM, 6, 154, { low: .58, high: .88 }) }
const SAX_INTRO = 'r:16 | r:16 | r:16 | r:16 | 11:6~ 9:2 11:4 14:4 | 12:6~ 10:2 12:8~ | 13:6~ 11:2 8:4 11:4 | 11:12~ r:4'
const SAX_RESPOSTA = 'r:16 | r:16 | r:16 | r:8 11:2 12:2 14:4 | r:16 | r:16 | r:16 | r:8 13:2 11:2 8:4'
const SAX_CALMA = '12:6~ 11:2 9:8 | 10:6~ 8:2 12:8~ | 11:6~ 13:2 11:4 8:4 | 9:12~ r:4 | 12:6~ 14:2 12:8 | 10:6~ 12:2 15:8~ | 13:6~ 11:2 8:4 11:4 | 11:12~ r:4'
const sax = {
  0: tune(SAX_INTRO, 0, 161, { low: .46, high: .7, glide: 3 }), 1: tune(SAX_RESPOSTA, 1, 162, { low: .5, high: .74, glide: 0 }),
  3: tune(SAX_CALMA, 3, 163, { low: .44, high: .72, glide: 3, jitter: 2 }), 5: tune('r:16 | r:8 11:2 13:2 15:4 | r:16 | r:8 15:2 13:2 11:4 | r:16 | r:8 11:2 13:2 15:4 | r:16 | 15:8~ r:8', 5, 164, { low: .66, high: .9, glide: 0 }),
}

const TUNED = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = finish([
  P('a1', 'Basse', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { ...TUNED, octave: 2, gain: .44, attack: .005, decay: .4, sustain: .4, release: .14, clip: 1, lpf: 1700, hpf: 35, effects: { reverb: .05, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Grosse caisse', 'rhythm', 'pulse', DRUM('percussion', 'kick'), kick, on(...ALL),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .3, sustain: 0, release: .15, clip: 1, lpf: 4000, hpf: 30, effects: { reverb: .05, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Guitare solo', 'melody', 'phrase', SAMPLE('guitars', 'clean'), lead, on(...ALL),
    { ...TUNED, octave: 4, gain: 1, attack: .003, decay: .4, sustain: .25, release: .16, clip: 1, lpf: 6500, hpf: 260, effects: { reverb: .16, delay: .1, pan: .25 }, design: { role: 'lead' } }),
  P('b2', 'Caisse claire · cavacha', 'rhythm', 'pulse', DRUM('percussion', 'snare'), snare, on(2, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .48, attack: .001, decay: .14, sustain: 0, release: .08, clip: .7, lpf: 6500, hpf: 180, effects: { reverb: .1, pan: .05 } }),
  P('c1', 'Guitare mi-solo', 'response', 'phrase', SAMPLE('guitars', 'clean', 1), misolo, on(0, 2, 3, 5, 6, 7),
    { ...TUNED, octave: 3, gain: .68, attack: .003, decay: .4, sustain: .2, release: .14, clip: 1, lpf: 5200, hpf: 200, effects: { reverb: .14, pan: -.3 } }),
  P('c2', 'Baguette · clave', 'rhythm', 'pulse', DRUM('drums', 'wood-rim'), rim, on(0, 1, 3, 4),
    { ...DRUMS, octave: 2, gain: .16, attack: .001, decay: .08, sustain: 0, release: .05, clip: .6, lpf: 6500, hpf: 500, effects: { reverb: .12, pan: -.25 } }),
  P('d1', 'Chanteur', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), voz, on(1, 2, 4, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .4, attack: .04, decay: .4, sustain: .78, release: .22, clip: 1, lpf: 5600, hpf: 160, effects: { reverb: .24, pan: 0 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .08 } }),
  P('d2', 'Charleston', 'rhythm', 'pulse', DRUM('percussion', 'hat'), hat, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .9, attack: .001, decay: .12, sustain: 0, release: .05, clip: .7, lpf: 8500, hpf: 2200, effects: { reverb: .04, pan: -.2 } }),
  P('e1', 'Chœur · tierces', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), voz2, on(1, 2, 4, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .28, attack: .04, decay: .4, sustain: .76, release: .22, clip: 1, lpf: 5000, hpf: 160, effects: { reverb: .26, pan: -.14 } }),
  P('e2', 'Maracas', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), maracas, on(...ALL),
    { ...DRUMS, octave: 2, gain: .27, attack: .001, decay: .09, sustain: 0, release: .06, clip: .5, lpf: 7500, hpf: 1800, effects: { reverb: .05, pan: .3 } }),
  P('f1', 'Guitare d\'accompagnement', 'harmony', 'phrase', SAMPLE('guitars', 'muted'), accompaniment, on(...ALL),
    { ...TUNED, octave: 3, gain: .3, attack: .003, decay: .25, sustain: .15, release: .1, clip: .9, lpf: 4600, hpf: 200, effects: { reverb: .1, pan: .35 } }),
  P('f2', 'Conga · tapée', 'rhythm', 'pulse', DRUM('percussion', 'muted-conga'), slap, on(1, 2, 3, 4, 6, 7),
    { ...DRUMS, octave: 2, gain: .38, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 5500, hpf: 160, effects: { reverb: .08, pan: .22 } }),
  P('g1', 'Saxophone ténor', 'response', 'phrase', SAMPLE('band', 'tenor-sax', 1), sax, on(0, 1, 3, 4, 5),
    { ...TUNED, octave: 3, gain: .32, attack: .014, decay: .3, sustain: .68, release: .14, clip: 1, lpf: 5600, hpf: 120, effects: { reverb: .2, pan: -.12 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .06 } }),
  P('g2', 'Cloche', 'rhythm', 'pulse', DRUM('sambaReggae', 'agogo-grave'), bell, on(2, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .2, sustain: 0, release: .1, clip: .5, lpf: 5500, hpf: 500, effects: { reverb: .1, pan: .36 } }),
  P('h1', 'Conga', 'rhythm', 'pulse', DRUM('percussion', 'conga'), conga, on(...ALL),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .2, sustain: 0, release: .12, clip: .8, lpf: 5000, hpf: 110, effects: { reverb: .08, pan: .18 } }),
  P('h2', 'Toms', 'rhythm', 'pulse', DRUM('percussion', 'tom'), toms, on(5),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .25, sustain: 0, release: .12, clip: .9, lpf: 4500, hpf: 70, effects: { reverb: .1, pan: -.1 }, fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL } }),
], {
  params: {
    a1: { 3: { gain: .34 } }, a2: { 3: { gain: .2, lpfRange: { first: 1800, second: 2200 } }, 5: { gain: .4 } },
    e2: { 0: { gain: .11 }, 3: { gain: .1 } }, h1: { 3: { gain: .14, reverbRange: { first: .16, second: .22 } } },
    f1: { 3: { gain: .15, reverbRange: { first: .2, second: .26 } } }, c1: { 3: { reverbRange: { first: .22, second: .28 } } },
    g1: { 3: { reverbRange: { first: .28, second: .34 } } }, b1: { 6: { gain: .36 } },
  },
})

build({
  id: 'kinshasa-1978', kitName: 'Soukous', profileName: 'Kinshasa 1978 · Soukous', meter: '4/4', bpm: 126, root: 'C', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('skc', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Rumba congolesa e sebene do soukous (Franco & OK Jazz, Tabu Ley Rochereau, Zaïko Langa Langa, Papa Wemba): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Soukous',
}).catch(error => { console.error(error); process.exit(1) })
