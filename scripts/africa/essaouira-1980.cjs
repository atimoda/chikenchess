// 1980 Essaouira - Gnawa (original material).
// A lila night: the maâlem states the theme alone on the guembri (a bass lute whose skin he taps as he
// plays), the qraqeb (iron castanets, kept low and dark here) join one hand after the other, then the
// claps. He calls a line, the koyo answer it; the refrain trades one bar each. Everything turns in twelve
// with the qraqeb's gallop. The big tbel drums only speak in the procession section.
// C minor pentatonic over Kit Harmony: the tonic, the tone below (Bb) and the fourth (F).
// Form: guembri alone, then qraqeb and claps · verse (call, answer) · refrain · interlude (soft: guembri,
// maâlem and a low drone of voices) · verse · procession (tense: tbel drums and unison chant) · guembri
// solo with the awicha · refrain · final.
// Run: node scripts/africa/essaouira-1980.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('12/8', 'Menor natural', {
  // C minor degrees: 0 C · 1 D · 2 Eb · 3 F · 4 G · 5 Ab · 6 Bb; the songs use 0 2 3 4 6.
  root: { C: 0, Bb: -1, F: -4 },
  names: {
    0: ['C'], 1: ['C', 'C', 'C', 'Bb', 'C', 'C', 'Bb', 'C'], 2: ['C', 'Bb', 'C', 'Bb', 'F', 'F', 'Bb', 'C'],
    3: ['F', 'F', 'C', 'C', 'F', 'F', 'Bb', 'Bb'], 4: ['C', 'C', 'Bb', 'C'], 5: ['C', 'Bb'], 6: ['C', 'Bb', 'C', 'C'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .09 },
  // Wide colour between strokes: the iron never rings the same way twice.
  colour: { depth: .3, spread: .16, ring: .2 },
})
const { C, FORM, FILL, on, ALL, drum, beat, tune, harmony, riff, finish } = S
const { rep } = C
const R = '... ... ... ...'
const END = 'X.x X.x X.. X.. | X.. ... ... ...'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- qraqeb (two hands), claps, the guembri's skin and the tbel ----------
const RIGHT = 'x.h x.h x.h x.h', LEFT = '.h. .h. .h. .h.'
const right = {
  0: beat(11, enter(3, 'o.g o.g o.g o.g')), 1: drum(1, 12, 'm.h m.h m.h m.h'), 2: drum(2, 13, RIGHT), 3: drum(3, 14, 'h.g h.. h.g h..'),
  4: drum(4, 15, 'm.h m.h m.h m.h'), 5: drum(5, 16, 'X.m x.m X.m x.m'), 6: beat(17, `${RIGHT} | ${RIGHT} | ${END}`),
}
const left = {
  0: beat(21, enter(5, '.g. .g. .g. .g.')), 1: drum(1, 22, '.h. .h. .h. .h.'), 2: drum(2, 23, '.m. .m. .m. .mh'), 4: drum(4, 24, LEFT),
  5: drum(5, 25, '.x. .m. .x. .mm'), 6: beat(26, `${LEFT} | ${LEFT} | ${END}`),
}
const claps = {
  0: beat(31, enter(6, '... h.. ... h..')), 1: drum(1, 32, '... x.. ... x..'), 2: drum(2, 33, 'x.. x.x .x. x..'), 4: drum(4, 34, '... x.. ... x..'),
  5: drum(5, 35, 'X.. X.x .X. X..'), 6: beat(36, `x.. x.x .x. x.. | x.. x.x .x. x.. | ${END}`),
}
const answerClaps = { 2: drum(2, 41, '..h ... ..h ..h'), 5: drum(5, 42, '..x ... ..x ..x'), 6: beat(43, `..h ... ..h ..h | ..h ... ..h ..h | ${END}`) }
// The maâlem's fingers strike the skin under the strings.
const TAP = 'x.. h.h x.. h.h'
const skin = {
  0: beat(51, `${R} | ${R} | ` + rep('o.. g.g o.. g.g', 6)), 1: drum(1, 52, 'x.. h.g x.. h.h'), 2: drum(2, 53, TAP), 3: drum(3, 54, 'o.. ... o.. ..g'),
  4: drum(4, 55, 'x.h h.h x.h h.x | x.. hxh x.h hxh'), 5: drum(5, 56, TAP), 6: beat(57, `${TAP} | ${TAP} | ${END}`),
}
const tbelLow = { 5: drum(5, 61, 'X.. ..x X.. ... | X.. ..x X.. x..'), 6: beat(62, `${R} | ${R} | ${END}`) }
const tbelHigh = { 5: drum(5, 71, '..x x.. ..x x.x | ..x x.. .xx x.x') }
const tbelRoll = { [FILL]: beat(81, 'x.. x.x xmx XXx') }

// ---------- guembri ----------
// One bar each: the low string rocks between the tonic and the tone below, the melody climbs the middle string.
const A = '0:2! 0:1 4:2 3:1 2:2 0:1 -1:2 0:1', B = '0:2! 0:1 4:2 6:1 7:2 6:1 4:2 3:1', CC = '2:2 3:1 4:2 3:1 2:2 0:1 -1:2 0:1'
const DOWN = '-1:2! -1:1 3:2 2:1 0:2 -1:1 -3:2 -1:1', FOURTH = '3:2! 3:1 7:2 6:1 4:2 3:1 2:2 3:1'
const pluck = { low: .62, high: .94, glide: 0, jitter: 1, mel: { gate: .8 } }
const guembri = {
  0: tune(['0:6!~ 4:3 3:3', '2:3 0:3 -1:3 0:3~', A, B, A, CC, A, B].join(' | '), 0, 101, pluck),
  1: tune([A, B, A, DOWN, A, B, DOWN, CC].join(' | '), 1, 102, pluck), 2: tune([B, DOWN, B, DOWN, FOURTH, FOURTH, DOWN, A].join(' | '), 2, 103, { ...pluck, low: .7, high: .98 }),
  3: tune('3:6! 7:3 6:3 | 3:6 4:3 3:3 | 0:6! 4:3 3:3 | 0:6 2:3 0:3 | 3:6! 7:3 6:3 | 3:6 4:3 3:3 | -1:6! 3:3 2:3 | -1:6 -3:3 -1:3', 3, 104, { ...pluck, low: .5, high: .72, mel: { gate: .94 } }),
  4: tune('0:1 0:1 4:1 3:1 4:1 6:1 7:2 6:1 4:1 3:1 2:1 | 7:1 7:1 9:1 7:1 6:1 4:1 6:2 4:1 3:1 2:1 0:1 | -1:1 -1:1 3:1 2:1 3:1 4:1 6:2 4:1 3:1 2:1 -1:1 | 0:2 4:1 3:2 2:1 0:2 -1:1 0:3~ '
    + '| 7:1 9:1 10:1 9:1 7:1 6:1 7:2 9:1 7:1 6:1 4:1 | 6:1 7:1 6:1 4:1 3:1 4:1 6:2 4:1 3:1 2:1 0:1 | -1:2 3:1 6:2 4:1 3:2 2:1 -1:2 -3:1 | 0:2 0:1 4:2 3:1 2:2 0:1 0:3!', 4, 105, { ...pluck, low: .68, high: 1 }),
  5: tune(rep(`${A} | ${DOWN}`, 4), 5, 106, { ...pluck, low: .76, high: 1 }), 6: tune(`${B} | ${DOWN} | 0:2! 0:1 0:2 0:1 4:2 3:1 2:2 0:1 | 0:12!`, 6, 107, pluck),
}
// The short top string: a drone the thumb brushes at the end of each beat.
const DRONE = 'r:2 7:1 r:2 7:1 r:2 7:1 r:2 7:1'
const drone = {
  0: tune(`r:12 | r:12 | ${rep(DRONE, 6)}`, 0, 111, { low: .4, high: .5, glide: 0 }), 1: tune(rep(DRONE, 8), 1, 112, { low: .4, high: .52, glide: 0 }), 2: tune(rep(DRONE, 8), 2, 113, { low: .46, high: .58, glide: 0 }),
  4: tune(rep('r:2 7:1 r:1 7:1 7:1 r:2 7:1 r:1 7:1 7:1', 8), 4, 114, { low: .46, high: .6, glide: 0 }), 5: tune(rep(DRONE, 8), 5, 115, { low: .5, high: .62, glide: 0 }), 6: tune(`${rep(DRONE, 2)} | r:12 | r:12`, 6, 116, { low: .4, high: .5, glide: 0 }),
}
// Awicha: the small guembri answers in the gaps and joins the solo.
const awicha = {
  2: riff(2, 121, '7:1 r:2 9:1 r:1 7:1 r:3 6:1 r:1 4:1 | 7:1 r:2 9:1 r:1 11:1 r:3 9:1 r:1 7:1', { gate: .7, accent: { strong: .7, beat: .66, off: .58 } }),
  3: riff(2, 122, 'r:3 7:3 9:3 11:3 | r:3 9:3 7:3 4:3', { gate: .94, accent: { strong: .5, beat: .5, off: .44 } }),
  4: tune('r:12 | r:6 9:1 10:1 9:1 7:3 | r:12 | r:6 7:1 9:1 7:1 6:3 | r:12 | r:6 10:1 11:1 10:1 9:3 | r:12 | r:6 9:1 7:1 6:1 7:3', 4, 123, { low: .56, high: .82, glide: 0 }),
  6: riff(2, 124, '7:1 r:2 9:1 r:1 7:1 r:3 6:1 r:1 4:1 | 7:1 r:2 9:1 r:1 11:1 r:3 9:1 r:1 7:1', { gate: .7, accent: { strong: .7, beat: .66, off: .58 } }),
}
const secondGuembri = { 2: tune([B, DOWN, B, DOWN, FOURTH, FOURTH, DOWN, A].join(' | '), 2, 131, { ...pluck, low: .5, high: .7 }), 5: tune(rep(`${A} | ${DOWN}`, 4), 5, 132, { ...pluck, low: .56, high: .78 }) }

// ---------- maâlem and koyo ----------
const CALL = 'r:3 7:2 7:1 9:2 7:1 6:2 4:1 | 6:2 4:1 4:6~ r:3 | r:12 | r:12 | r:3 9:2 9:1 10:2 9:1 7:2 6:1 | 7:2 6:1 4:6~ r:3 | r:12 | r:12'
const REPLY = 'r:12 | r:12 | 4:2 4:1 6:2 4:1 3:2 2:1 3:3 | 3:2 2:1 3:6~ r:3 | r:12 | r:12 | 6:2 6:1 4:2 3:1 2:2 3:1 4:3 | 3:2 2:1 0:6~ r:3'
const LEADER = '7:3 7:2 9:1 7:3 6:3 | r:12 | 7:3 7:2 9:1 10:3 9:3 | r:12 | 10:3 9:2 7:1 9:3 7:3 | r:12 | 6:3 4:2 3:1 2:3 3:3 | r:12'
const KOYO = 'r:12 | 6:3 6:2 4:1 3:6~ | r:12 | 6:3 6:2 4:1 6:6~ | r:12 | 7:3 6:2 4:1 3:6~ | r:12 | 4:3 3:2 2:1 0:6~'
const CALM = 'r:3 3:3 4:3 6:3 | 7:9~ r:3 | r:3 4:3 3:3 2:3 | 0:9~ r:3 | r:3 3:3 4:3 6:3 | 7:6~ 9:3 7:3 | 6:9~ r:3 | r:12'
const CHANT = rep('7:2! 7:1 7:2 6:1 4:3 r:3 | 6:2! 6:1 6:2 4:1 3:3 r:3', 4)
const FINAL = '7:3 7:2 9:1 7:3 6:3 | 6:3 6:2 4:1 3:6~ | 7:2! 7:1 7:2 6:1 4:3 3:3 | 0:9~ r:3'
const sung = { low: .56, high: .88, glide: 3, jitter: 2 }
const maalem = { 1: tune(CALL, 1, 141, sung), 2: tune(LEADER, 2, 142, sung), 3: tune(CALM, 3, 143, { low: .42, high: .64, jitter: 2 }), 5: tune(CHANT, 5, 144, { ...sung, low: .7, high: .94 }), 6: tune(FINAL, 6, 145, sung) }
const koyo = { 1: tune(REPLY, 1, 151, sung), 2: tune(KOYO, 2, 152, sung), 5: tune(CHANT, 5, 153, { ...sung, low: .66, high: .9 }), 6: tune(FINAL, 6, 154, sung) }
const koyoHigh = { 2: harmony(KOYO, 2, 161, sung, 0), 5: harmony(CHANT, 5, 162, sung, 0), 6: harmony(FINAL, 6, 163, sung, 0) }
// The elders hum the root under the quiet verse.
const hum = { 3: riff(2, 171, '0:12t | 0:12t', { accent: { strong: .46, beat: .46, off: .46 } }), 5: riff(2, 172, '0:12t | 0:12t', { accent: { strong: .56, beat: .56, off: .56 } }) }

const PARTS = finish([
  Q('a1', 'Guembri', 'bass', 'phrase', V.bass({ gain: .5, decay: .3, sustain: .25, lpf: 1500, panWidth: .1 }), guembri, on(...ALL)),
  Q('a2', 'Tbel grave', 'rhythm', 'pulse', V.bassDrum({ gain: .36, pan: -.1 }), tbelLow, on(5, 8)),
  Q('b1', 'Maâlem', 'melody', 'sustain', V.voice({ gain: .42, pan: 0 }), maalem, on(1, 2, 3, 4, 5, 7, 8)),
  Q('b2', 'Qraqeb · direita', 'rhythm', 'pulse', V.bellLow({ gain: .18, decay: .07, lpf: 4200, hpf: 500, pan: .3, reverb: .12 }), right, on(...ALL)),
  Q('c1', 'Koyo', 'response', 'sustain', V.voice({ gain: .32, octave: 3, pan: -.2, lpf: 4200 }), koyo, on(1, 2, 4, 5, 7, 8)),
  Q('c2', 'Qraqeb · esquerda', 'rhythm', 'pulse', V.bellHigh({ gain: .14, decay: .06, lpf: 4600, hpf: 600, pan: -.3, reverb: .12 }), left, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('d1', 'Koyo · oitava', 'response', 'sustain', V.voice({ gain: .28, octave: 4, pan: .22 }), koyoHigh, on(2, 5, 7, 8)),
  Q('d2', 'Palmas', 'rhythm', 'pulse', V.clap({ gain: .3, pan: .12 }), claps, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('e1', 'Guembri · bordão', 'harmony', 'phrase', V.nylon({ gain: .2, octave: 2, lpf: 3200, pan: .08 }), drone, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('e2', 'Guembri · pele', 'rhythm', 'pulse', V.slap({ gain: .26, lpf: 3200, hpf: 120, pan: -.05 }), skin, on(...ALL)),
  Q('f1', 'Awicha', 'response', 'phrase', V.nylon({ gain: .3, octave: 3, lpf: 4200, pan: .3 }), awicha, on(2, 3, 6, 7, 8)),
  Q('f2', 'Tbel agudo', 'rhythm', 'pulse', V.tom({ gain: .3, pan: .2 }), tbelHigh, on(5)),
  Q('g1', 'Vozes · bordão', 'harmony', 'sustain', V.voice({ gain: .22, octave: 3, lpf: 2600, pan: 0, role: 'pad' }), hum, on(3, 5)),
  Q('g2', 'Palmas · resposta', 'rhythm', 'pulse', V.palmas({ gain: .26, pan: -.2 }), answerClaps, on(2, 5, 7, 8)),
  Q('h1', 'Guembri segundo', 'response', 'phrase', V.nylon({ gain: .26, octave: 3, lpf: 2400, pan: -.24 }), secondGuembri, on(2, 5, 7)),
  Q('h2', 'Tbel · virada', 'rhythm', 'pulse', V.tom({ gain: .3, pan: -.1 }), tbelRoll, on()),
], {
  fills: { 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  // The interlude is the maâlem almost alone; the procession opens the room around the tbel.
  params: {
    a1: { 3: { gain: .44 }, 6: { gain: .56 } }, b2: { 0: { gain: .12 }, 3: { gain: .1 }, 5: { gain: .22 } }, c2: { 0: { gain: .1 }, 5: { gain: .18 } },
    e2: { 3: { gain: .18 } }, b1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } }, a2: { 5: { reverbRange: { first: .18, second: .24 } } },
    d2: { 5: { gain: .36, reverbRange: { first: .2, second: .26 } } },
  },
})
build({
  id: 'essaouira-1980', kitName: 'Gnawa', profileName: 'Essaouira 1980 · Gnawa', meter: '12/8', bpm: 118, root: 'C', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('gnw', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Gnawa de Essaouira (Maâlem Mahmoud Guinia, Maâlem Abdallah Guinia): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Gnawa_music',
}).catch(error => { console.error(error); process.exit(1) })
