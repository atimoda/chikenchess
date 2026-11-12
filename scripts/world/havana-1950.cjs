// 1950 Havana - Son cubano (original material).
// A conjunto in a dance hall: the tres starts its guajeo alone, the clave gives the key (three strokes,
// then two), the bongó's martillo and the maracas fill in, and the bass enters on its tumbao, never on the
// first beat when it can avoid it. The sonero sings the verse; in the montuno the chorus repeats one line
// and he improvises between; the bongosero changes to the bell and the trumpets drive the mambo.
// D harmonic minor (Kit Harmony): Dm · Gm · A7.
// Form: tres and clave, then the conjunto · verse (largo) · montuno (chorus and bell) · interlude (soft:
// tres, voice, clave and maracas) · verse · mambo (tense: trumpet riffs and breaks) · trumpet solo ·
// montuno · final.
// Run: node scripts/world/havana-1950.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Harmônica menor', {
  // D harmonic minor degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 Bb · 6 C#.
  root: { Dm: 0, Gm: 3, A7: -3, Bb: -2 },
  names: {
    0: ['Dm', 'A7', 'A7', 'Dm'], 1: ['Dm', 'Dm', 'Gm', 'Gm', 'A7', 'A7', 'Dm', 'Dm'], 2: ['Dm', 'A7', 'A7', 'Dm'],
    3: ['Gm', 'Gm', 'Dm', 'Dm', 'A7', 'A7', 'Dm', 'Dm'], 4: ['Dm', 'A7', 'A7', 'Dm'], 5: ['Gm', 'A7', 'Gm', 'A7', 'Bb', 'A7', 'Bb', 'A7'], 6: ['Gm', 'A7', 'Dm', 'Dm'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .07 },
  colour: { spread: .12, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
// One bar holds the whole clave: three strokes, then two.
const CLAVE = 'x..x ..x. ..x. x...'
const BREAK = 'X..X ..X. .... .... | X..X ..X. ..X. X...'
const END = 'X..X ..X. ..X. X... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- clave, bongó, bell, maracas, güiro, conga ----------
const clave = {
  0: beat(11, enter(2, CLAVE)), 1: drum(1, 12, CLAVE), 2: drum(2, 13, CLAVE), 3: drum(3, 14, 'h..h ..h. ..h. h...'), 4: drum(4, 15, CLAVE), 5: drum(5, 16, CLAVE), 6: beat(17, `${CLAVE} | ${CLAVE} | ${END}`),
}
// Martillo: the bongó's steady hammer, the low drum opening at the end of each half.
const MARTILLO = 'Xgxg xgxo Xgxg xgxo'
const bongo = {
  0: beat(21, enter(3, 'xgxg xgxo xgxg xgxo')), 1: drum(1, 22, 'Xgxg xgxo Xgxg xgxo | Xgxg xgxo Xgxx xoxo'), 3: drum(3, 23, 'hgh. hg.g hgh. hg.o'), 4: drum(4, 24, 'XgxX xgxo XxXg xoxo | Xgxg xXxo XgXx XoXo'),
  6: beat(25, `${MARTILLO} | ${MARTILLO} | ${END}`),
}
const bell = { 2: drum(2, 31, 'X.x. X.xx X.x. X.xx'), 5: drum(5, 32, 'X.x. X.xx X.x. X.xx') }
const maracas = {
  0: beat(41, enter(4, 'xhmh xhmh xhmh xhmh')), 1: drum(1, 42, 'xhmh xhmh xhmh xhmh'), 2: drum(2, 43, 'XhxhXhxh XhxhXhxh'.replace(/(.{4})/g, '$1 ').trim()), 3: drum(3, 44, 'ogh, ogh, ogh, ogh,'),
  4: drum(4, 45, 'xhmh xhmh xhmh xhmh'), 5: drum(5, 46, 'Xhxh Xhxh Xhxh Xhxh'), 6: beat(47, `Xhxh Xhxh Xhxh Xhxh | Xhxh Xhxh Xhxh Xhxh | ${END}`),
}
const guiro = { 2: drum(2, 51, 'X.xx X.xx X.xx X.xx'), 4: drum(4, 52, 'x.hh x.hh x.hh x.hh'), 5: drum(5, 53, 'X.xx X.xx X.xx X.xx'), 6: beat(54, `X.xx X.xx X.xx X.xx | X.xx X.xx X.xx X.xx | ${END}`) }
// Tumbao: heel and toe ghosted, the slap on two, two open tones at the end of each half.
const open = {
  1: drum(1, 61, '.... ..xx .... ..xx'), 2: drum(2, 62, '.... ..XX .... ..XX | .... ..XX ..x. ..XX'), 4: drum(4, 63, '.... ..XX .... ..XX'), 5: drum(5, 64, BREAK),
  6: beat(65, `.... ..XX .... ..XX | .... ..XX ..x. ..XX | ${END}`),
}
const slap = {
  1: drum(1, 71, 'ggxg gg.. ggxg gg..'), 2: drum(2, 72, 'ghXh gh.. ghXh gh..'), 3: drum(3, 73, 'g.h. g... g.h. g...'), 4: drum(4, 74, 'ghXh gh.. ghXh gh..'),
  6: beat(75, `ghXh gh.. ghXh gh.. | ghXh gh.. ghXh gh..`),
}
const timbal = { 5: drum(5, 81, BREAK), [FILL]: beat(82, '.... .... x.xx XXXx') }

// ---------- bass, tres, guitar, piano ----------
// The tumbao: after the first beat the bass plays the "and" of two and the four, tied over the bar line.
const TUMBAO = '0:3! 4:3 7:2 r:3 4:3 7:2'
const bass = {
  0: from(4, unroll(riff(1, 101, TUMBAO, { gate: .9 }), 8)), 1: riff(2, 102, `${TUMBAO} | r:3 4:3 7:2 r:3 4:3 0:2`, { gate: .9, accent: { strong: .92, beat: .84, off: .8 } }), 2: riff(2, 103, `${TUMBAO} | r:3 4:3 7:2 r:3 7:3 4:2`, { gate: .9 }),
  3: riff(1, 104, '0:6! r:2 4:6 r:2', { gate: .94 }), 4: riff(2, 105, `${TUMBAO} | r:3 4:3 7:2 r:3 7:3 4:2`, { gate: .9 }), 5: riff(2, 106, '0:3! 0:3 0:2 r:8 | 0:3! 0:3 0:2 r:2 0:2 0:2 r:2', { gate: .7 }),
  6: mel(`${TUMBAO} | ${TUMBAO} | 0:3! 0:3 0:2 r:2 0:2 0:2 r:2 | 0:8!`, { gate: .9 }),
}
// The tres guajeo: broken chords with the off-beats leading.
const GUAJEO = '7:2 9:1 11:2 9:1 7:2 r:1 9:2 11:1 9:2 7:2 | r:1 9:2 11:1 14:2 11:1 9:2 r:1 9:1 11:2 9:2 7:1'
const guajeo = (seed, options) => riff(2, seed, GUAJEO, { gate: .8, accent: { strong: .8, beat: .72, off: .68 }, ...options })
const tres = {
  0: unroll(guajeo(111), 8), 1: guajeo(112, { accent: { strong: .66, beat: .6, off: .56 } }), 2: guajeo(113), 3: riff(2, 114, '7:4 9:4 11:8 | 9:4 11:4 14:8', { gate: .94, accent: { strong: .56, beat: .5, off: .46 } }),
  4: guajeo(115, { accent: { strong: .66, beat: .6, off: .56 } }), 5: riff(1, 116, '7:1! r:2 7:1 r:2 9:1 r:9', { gate: .7 }), 6: unroll(guajeo(117), 2),
}
// Dm [F A D] · Gm [G Bb D] · A7 [G C# E] · Bb [F Bb D]
const CHORD = { Dm: [2, 4, 7], Gm: [3, 5, 7], A7: [3, 6, 8], Bb: [2, 5, 7] }
const guitar = {
  1: comp(CHORD, 1, 'x.h. x.hh x.h. x.hh', 121, { length: 1 / 24 }), 2: comp(CHORD, 2, 'x.hx .xh. x.hx .xh.', 122, { length: 1 / 24 }), 4: comp(CHORD, 4, 'x.hx .xh. x.hx .xh.', 123, { length: 1 / 24 }),
  6: relative(S.hand(124, C.named(['Gm', 'A7', 'Dm', 'Dm'], `x.hx .xh. x.hx .xh. | x.hx .xh. x.hx .xh. | ${END}`, CHORD, { length: 1 / 16 })), H(6)),
}
const piano = {
  2: comp(CHORD, 2, 'x..x .x.x .x.x .x.x', 131, { length: 1 / 20 }), 3: comp(CHORD, 3, 'o... .... .... ....', 132, { length: .9 }), 5: comp(CHORD, 5, BREAK, 133, { length: 1 / 16 }),
  6: relative(S.hand(134, C.named(['Gm', 'A7', 'Dm', 'Dm'], `x..x .x.x .x.x .x.x | x..x .x.x .x.x .x.x | ${END}`, CHORD, { length: 1 / 12 })), H(6)),
}

// ---------- sonero, coro and trumpets ----------
const THEME = 'r:16 | r:16 | r:16 | r:16 | 7:3 9:3 11:2 r:2 9:2 7:2 6:2 | 8:6~ r:2 6:2 8:2 10:2 r:2 | 10:3 8:3 6:2 r:2 8:2 6:2 4:2 | 7:8~ r:8'
const VERSE = 'r:4 4:2 4:2 7:3 6:1 4:2 2:2 | 4:6~ r:2 2:2 4:2 7:4 | r:4 5:2 5:2 7:3 5:1 4:2 3:2 | 5:8~ r:8 | r:4 6:2 6:2 8:3 6:1 4:2 3:2 | 4:6~ r:2 6:2 8:2 10:4 | r:4 9:2 7:2 6:3 4:1 2:2 1:2 | 0:8~ r:8'
const CORO = 'r:16 | r:16 | 7:3 7:3 9:2 r:2 8:2 6:2 4:2 | 7:8~ r:8 | r:16 | r:16 | 7:3 7:3 9:2 r:2 8:2 6:2 4:2 | 7:8~ r:8'
const PREGON = '11:3 9:1 7:2 9:2 11:4 9:2 7:2 | 10:3 8:1 6:2 8:2 10:6~ r:2 | r:16 | r:16 | 14:3 11:1 9:2 11:2 14:4 11:2 9:2 | 13:3 10:1 8:2 10:2 13:6~ r:2 | r:16 | r:16'
const CALM = '10:8~ 9:4 7:4 | 9:12~ r:4 | 9:8~ 7:4 5:4 | 4:12~ r:4 | 10:8~ 8:4 6:4 | 8:12~ r:4 | 7:8~ 6:4 4:4 | 7:12~ r:4'
const MAMBO = '10:2! r:1 10:1 r:2 10:2 r:8 | 10:2! r:1 10:1 r:2 11:2 13:2 r:2 11:2 r:2 | 10:2! r:1 10:1 r:2 10:2 r:8 | 11:2! r:1 11:1 r:2 13:2 15:2 r:2 13:2 r:2 '
  + '| 12:2! r:1 12:1 r:2 12:2 r:8 | 11:2! r:1 11:1 r:2 13:2 15:2 r:2 13:2 r:2 | 12:2! r:1 12:1 r:2 14:2 r:2 12:2 r:4 | 13:3 13:3 13:2 15:8~'
const SOLO = '11:3 9:1 7:2 9:2 11:2 14:2 r:2 11:2 | 13:3 11:1 10:2 8:2 10:6~ r:2 | 8:2 10:2 13:2 15:2 13:2 10:2 8:2 6:2 | 7:6~ r:2 9:2 11:2 14:4 | 16:3 14:1 11:2 14:2 16:4~ 14:2 11:2 | 15:2 13:2 10:2 13:2 15:6~ r:2 | 13:2 11:2 10:2 8:2 6:2 8:2 10:2 13:2 | 14:10~ r:6'
const FINAL = '7:3 7:3 9:2 r:2 8:2 6:2 4:2 | 7:3 7:3 9:2 r:2 8:2 10:2 13:2 | 14:3! 14:3 14:2 r:2 14:2 14:2 r:2 | 14:8~ r:8'
const sung = { low: .56, high: .88, glide: 3, jitter: 2 }, brass = { glide: 0, low: .64, high: .96 }
const sonero = { 1: tune(VERSE, 1, 141, sung), 2: tune(PREGON, 2, 142, { ...sung, low: .62, high: .94 }), 3: tune(CALM, 3, 143, { low: .42, high: .64, jitter: 2 }) }
const coro = { 2: tune(CORO, 2, 151, sung), 6: tune(FINAL, 6, 152, sung) }
const coro2 = { 2: harmony(CORO, 2, 161, sung), 6: harmony(FINAL, 6, 162, sung) }
const trumpet = { 0: tune(THEME, 0, 171, brass), 4: tune(SOLO, 4, 172, { ...brass, glide: 3, jitter: 2 }), 5: tune(MAMBO, 5, 173, { ...brass, low: .78, high: 1 }), 6: tune(FINAL, 6, 174, brass) }
const trumpet2 = { 0: harmony(THEME, 0, 181, brass), 5: harmony(MAMBO, 5, 182, { ...brass, low: .74, high: .96 }), 6: harmony(FINAL, 6, 183, brass) }

const PARTS = finish([
  Q('a1', 'Contrabajo', 'bass', 'phrase', V.bass({ gain: .46, attack: .008, lpf: 1300, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Tumbadora', 'rhythm', 'pulse', V.conga({ gain: .36, pan: .16 }), open, on(1, 2, 4, 5, 6, 7, 8)),
  Q('b1', 'Tres', 'harmony', 'phrase', V.steel({ gain: .44, pan: -.26 }), tres, on(...ALL)),
  Q('b2', 'Claves', 'rhythm', 'pulse', V.clave808({ gain: .12, pan: .1, reverb: .14 }), clave, on(...ALL)),
  Q('c1', 'Sonero', 'melody', 'sustain', V.voice({ gain: .42, pan: 0 }), sonero, on(1, 2, 3, 4, 7)),
  Q('c2', 'Bongó', 'rhythm', 'pulse', V.bongo({ gain: .44, pan: -.2 }), bongo, on(0, 1, 3, 4, 6, 8)),
  Q('d1', 'Trompeta', 'melody', 'phrase', V.trumpet({ gain: .44, octave: 3, pan: .12 }), trumpet, on(0, 5, 6, 8)),
  Q('d2', 'Maracas', 'rhythm', 'pulse', V.shaker({ gain: .26, pan: .32 }), maracas, on(...ALL)),
  Q('e1', 'Coro', 'response', 'sustain', V.voice({ gain: .34, pan: .2 }), coro, on(2, 7, 8)),
  Q('e2', 'Campana', 'rhythm', 'pulse', V.bellLow({ gain: .18, pan: -.24 }), bell, on(2, 5, 7)),
  Q('f1', 'Coro · segunda', 'response', 'sustain', V.voice({ gain: .28, pan: -.2 }), coro2, on(2, 7, 8)),
  Q('f2', 'Tumbadora · tapado', 'rhythm', 'pulse', V.slap({ gain: .34, pan: .2 }), slap, on(1, 2, 3, 4, 6, 7, 8)),
  Q('g1', 'Trompeta segunda', 'response', 'phrase', V.trumpet({ gain: .36, octave: 3, pan: -.12 }), trumpet2, on(0, 5, 8)),
  Q('g2', 'Güiro', 'rhythm', 'pulse', V.guiro({ gain: .3, pan: -.32 }), guiro, on(2, 5, 6, 7, 8)),
  Q('h1', 'Piano', 'harmony', 'phrase', V.piano({ gain: .16, pan: .26 }), { ...piano, 1: guitar[1], 4: guitar[4] }, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('h2', 'Timbal', 'rhythm', 'pulse', V.tom({ gain: .3, decay: .16, hpf: 120, pan: -.1 }), timbal, on(5)),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .4 } }, b2: { 0: { gain: .1 }, 3: { gain: .09 } }, d2: { 0: { gain: .2 }, 3: { gain: .16 } }, b1: { 0: { reverbRange: { first: .2, second: .26 } }, 3: { reverbRange: { first: .22, second: .28 } } },
    c1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } }, d1: { 5: { gain: .5 } },
  },
})
build({
  id: 'havana-1950', kitName: 'Son cubano', profileName: 'Havana 1950 · Son cubano', meter: '4/4', bpm: 96, root: 'D', scale: 'Harmônica menor',
  form: FORM, parts: PARTS,
  reactions: reactions('son', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Son cubano e son montuno (Arsenio Rodríguez y su Conjunto, Septeto Nacional, Trío Matamoros): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Son_cubano',
}).catch(error => { console.error(error); process.exit(1) })
