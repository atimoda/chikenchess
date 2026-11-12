// 1975 Lima - Festejo (original material).
// An Afro-Peruvian peña on the coast: the guitar starts with its bordón figure, the cajita's lid and the
// quijada (a donkey's jawbone, its teeth rattling) set the swing, and the cajón enters with the low tone
// and the slap. The soloist sings short lines and the chorus answers each one; the refrain belongs to
// everyone, with the cencerro and the congas; after a slow lament the song closes in the fuga, short
// calls over breaks of the cajón.
// A minor (Kit Harmony): Am · E7 · G · F · Dm.
// Form: guitar, cajita and quijada, then the cajón · verse (call and answer) · chorus · interlude (soft:
// lament) · verse · break (tense: fuga with cajón breaks) · guitar and cajón solo · chorus · final.
// Run: node scripts/world/lima-1975.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('12/8', 'Menor natural', {
  // A minor degrees: 0 A · 1 B · 2 C · 3 D · 4 E · 5 F · 6 G.
  root: { Am: 0, E7: -3, G: -1, F: -2, Dm: 3 },
  names: {
    0: ['Am', 'E7', 'E7', 'Am'], 1: ['Am', 'Am', 'E7', 'E7', 'E7', 'E7', 'Am', 'Am'], 2: ['Am', 'G', 'F', 'E7'],
    3: ['Dm', 'Dm', 'Am', 'Am', 'E7', 'E7', 'Am', 'Am'], 4: ['Am', 'E7', 'E7', 'Am'], 5: ['Dm', 'Am', 'E7', 'Am'], 6: ['Dm', 'E7', 'Am', 'Am'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .08 },
  colour: { spread: .12, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '... ... ... ...'
const REST = 'r:12'
const twelve = { steps: 12 }
const END = 'X.. X.. X.X X.. | X.. ... ... ...'
const STOP = 'X.. ... X.. X.. | X.. X.. ... ...'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- cajón, cajita, quijada, cencerro, congas, palmas ----------
// The base: low · · slap · low | low · slap slap · ·
const grave = {
  0: beat(11, enter(4, 'x.. ..h x.. ...')), 1: drum(1, 12, 'X.. ..x x.. ...'), 2: drum(2, 13, 'X.. ..x x.. ..x'), 3: drum(3, 14, 'h.. ... h.. ...'),
  4: drum(4, 15, 'X.. ..x x.. ... | X.x ..x x.. x..'), 5: drum(5, 16, STOP), 6: beat(17, `X.. ..x x.. ..x | X.. ..x x.. ..x | ${END}`),
}
const agudo = {
  0: beat(21, enter(4, '... h.. ..h h..')), 1: drum(1, 22, '... X.. ..x x..'), 2: drum(2, 23, '... X.. ..X x.. | ... X.x ..X x.x'), 3: drum(3, 24, '... h.. ... h..'),
  4: drum(4, 25, '..x X.x .xX x.x | .xx X.x xxX xXx'), 5: drum(5, 26, STOP), 6: beat(27, `... X.. ..X x.. | ... X.x ..X x.x | ${END}`),
}
const cajita = {
  0: beat(31, enter(2, 'x.h h.h x.h h.h')), 1: drum(1, 32, 'x.h h.h x.h h.h'), 2: drum(2, 33, 'X.x x.x X.x x.x'), 3: drum(3, 34, 'o.. h.. o.. h..'),
  4: drum(4, 35, 'x.h h.h x.h h.h'), 5: drum(5, 36, `${R} | ... ... x.x x.x`), 6: beat(37, `X.x x.x X.x x.x | X.x x.x X.x x.x | ${END}`),
}
const quijada = {
  0: beat(41, enter(2, 'x.. ... h.. ...')), 1: drum(1, 42, 'X.. ... x.. ...'), 2: drum(2, 43, 'X.. x.. X.. x..'), 3: drum(3, 44, 'h.. ... ... ...'), 4: drum(4, 45, 'X.. ... x.. ...'),
  5: drum(5, 46, `${R} | ... ... X.. ...`), 6: beat(47, `X.. x.. X.. x.. | X.. x.. X.. x.. | X.. ... ... ... | X.. ... ... ...`),
}
const cencerro = { 2: drum(2, 51, 'x.. x.x .x. x.x'), 4: drum(4, 52, 'x.. x.. x.. x.x'), 6: beat(53, `x.. x.x .x. x.x | x.. x.x .x. x.x | ${END}`) }
const congas = { 1: drum(1, 61, '..h ..x ..h .xx'), 2: drum(2, 62, '..x ..X ..x .XX'), 4: drum(4, 63, '..x .xX ..x .XX'), 5: drum(5, 64, `${R} | ... ... .xx xXX`), 6: beat(65, `..x ..X ..x .XX | ..x ..X ..x .XX | ${END}`) }
const palmas = { 0: beat(71, enter(6, '... h.. ... h..')), 1: drum(1, 72, '... x.. ... x..'), 2: drum(2, 73, '... X.. ... X.x'), 5: drum(5, 74, STOP), 6: beat(75, `... X.. ... X.x | ... X.. ... X.x | ${END}`) }
const repique = { [FILL]: beat(81, '... ... x.x XXX') }

// ---------- bass and guitars ----------
const bass = {
  0: from(4, unroll(riff(1, 101, '0:3 r:2 0:1 4:3 0:3', { gate: .84 }), 8)), 1: riff(1, 102, '0:3! r:2 0:1 4:3 0:3', { gate: .84 }), 2: riff(1, 103, '0:2! 0:1 r:2 0:1 4:2 4:1 7:2 4:1', { gate: .82 }),
  3: riff(1, 104, '0:6 4:6', { gate: .96, accent: { strong: .6, beat: .56, off: .5 } }), 4: riff(1, 105, '0:3! r:2 0:1 4:3 0:3', { gate: .84 }), 5: riff(2, 106, '0:2! r:4 0:2 r:1 0:2 r:1 | 0:2! r:1 0:2 r:7', { gate: .7 }),
  6: mel('0:2! 0:1 r:2 0:1 4:2 4:1 7:2 4:1 | 0:2! 0:1 r:2 0:1 4:2 4:1 7:2 4:1 | 0:2! r:1 0:2 r:1 0:1 r:1 0:1 0:2 r:1 | 0:6!', { gate: .9 }),
}
// The bordón: the thumb walks on the low strings while the fingers answer above.
const BORDON = '0:2 7:1 4:2 7:1 0:2 7:1 4:1 7:1 11:1'
const bordon = (seed, options) => riff(1, seed, BORDON, { gate: .86, accent: { strong: .8, beat: .66, off: .58 }, ...options })
const INTRO = `${rep(REST, 4)} | 11:1 9:1 7:1 9:2 11:1 12:3 11:3 | 10:1 8:1 4:1 8:2 10:1 11:6 | 8:1 10:1 11:1 10:2 8:1 5:2 4:1 3:2 4:1 | 7:1 9:1 11:1 9:2 7:1 4:1 2:1 4:1 0:3`
const PUNTEO = '0:1 2:1 4:1 7:2 4:1 2:1 4:1 7:1 9:2 7:1 | 8:1 10:1 11:1 10:2 8:1 4:1 5:1 4:1 3:2 4:1 | 3:1 4:1 8:1 10:2 8:1 11:1 10:1 8:1 5:2 4:1 | 7:1 9:1 11:1 9:2 7:1 4:1 2:1 4:1 0:3 '
  + '| 7:1 9:1 11:1 14:2 11:1 9:1 11:1 14:1 16:2 14:1 | 15:1 12:1 11:1 10:2 8:1 11:1 10:1 8:1 5:2 4:1 | 3:1 4:1 8:1 10:1 11:1 12:1 11:1 10:1 8:1 5:2 4:1 | 7:1 9:1 11:1 9:2 7:1 4:1 2:1 4:1 0:3'
const pick = { glide: 0, jitter: 2, low: .56, high: .9 }
const lead = { 0: tune(INTRO, 0, 111, pick), 4: tune(PUNTEO, 4, 112, pick) }
const guitar = {
  0: unroll(bordon(121), 8), 1: bordon(122, { accent: { strong: .66, beat: .56, off: .5 } }), 2: bordon(123), 3: riff(1, 124, '0:3 4:3 7:3 4:3', { gate: .96, accent: { strong: .5, beat: .44, off: .4 } }),
  4: bordon(125, { accent: { strong: .6, beat: .5, off: .44 } }), 5: riff(2, 126, '0:2! r:4 0:2 r:1 0:2 r:1 | 0:2! r:1 0:2 r:7', { gate: .7 }), 6: unroll(bordon(127), 2),
}
// Am [A C E] · E7 [B D E] · G [G B D] · F [A C F] · Dm [A D F]
const CHORD = { Am: [7, 9, 11], E7: [8, 10, 11], G: [6, 8, 10], F: [7, 9, 12], Dm: [7, 10, 12] }
const rasgueo = {
  1: comp(CHORD, 1, '..x x.h ..x x.h', 131, { ...twelve, length: 1 / 24 }), 2: comp(CHORD, 2, 'x.x x.x x.x x.x', 132, { ...twelve, length: 1 / 24 }), 4: comp(CHORD, 4, '..x x.h ..x x.h', 133, { ...twelve, length: 1 / 24 }),
  5: comp(CHORD, 5, STOP, 134, { ...twelve, length: 1 / 16 }),
  6: relative(S.hand(135, C.named(['Dm', 'E7', 'Am', 'Am'], `x.x x.x x.x x.x | x.x x.x x.x x.x | ${END}`, CHORD, { ...twelve, length: 1 / 16 })), H(6)),
}
const second = { 2: riff(1, 141, '7:1 11:1 14:1 11:1 7:1 11:1 7:1 11:1 14:1 11:1 7:1 11:1', { gate: .9, accent: { strong: .6, beat: .52, off: .46 } }), 3: riff(1, 142, '7:1 11:1 14:1 16:1 14:1 11:1 7:1 11:1 14:1 16:1 14:1 11:1', { gate: .96, accent: { strong: .5, beat: .44, off: .4 } }) }

// ---------- soloist and chorus ----------
const CALL = 'r:3 7:1 7:1 9:1 11:2 9:1 7:2 r:1 | r:12 | r:3 8:1 8:1 10:1 11:2 10:1 8:2 r:1 | r:12 | r:3 11:1 11:1 11:1 12:2 11:1 10:2 r:1 | r:12 | r:3 11:1 9:1 7:1 9:2 8:1 7:2 r:1 | r:12'
const ANSWER = 'r:12 | 11:2 9:1 7:2 9:1 7:3 r:3 | r:12 | 10:2 8:1 4:2 8:1 8:3 r:3 | r:12 | 10:2 8:1 4:2 8:1 8:3 r:3 | r:12 | 11:2 9:1 7:2 9:1 7:3 r:3'
const REFRAIN = '11:2 11:1 9:2 11:1 12:3 11:3 | 10:2 10:1 8:2 10:1 11:3 10:3 | 9:2 9:1 7:2 9:1 10:3 9:3 | 8:2 8:1 8:2 10:1 11:6~'
const LAMENT = '10:6~ 12:3 10:3 | 9:9~ r:3 | 9:6~ 11:3 9:3 | 7:9~ r:3 | 8:6~ 10:3 8:3 | 11:9~ r:3 | 9:3 8:3 7:3 8:3 | 7:9~ r:3'
const HUM = '10:12 | 10:12 | 9:12 | 9:12 | 8:12 | 8:12 | 9:12 | 9:12'
const FUGA = '10:2 10:1 12:3 r:6 | 9:2 9:1 11:3 r:6 | 8:2 8:1 10:3 r:6 | 7:2 9:1 7:3 r:6'
const REPLY = 'r:6 12:1 12:1 10:1 9:3 | r:6 11:1 11:1 9:1 7:3 | r:6 10:1 10:1 8:1 4:3 | r:6 9:1 8:1 7:1 7:3'
const FINAL = '10:2 10:1 12:2 10:1 12:3 10:3 | 8:2 8:1 10:2 8:1 11:6~ | 11:2! r:1 9:2! r:1 8:1 r:1 7:1 7:2! r:1 | 7:6!'
const twice = text => `${text} | ${text}`
const sung = { low: .58, high: .9, glide: 3, jitter: 2 }
const voz = { 1: tune(CALL, 1, 151, sung), 2: tune(twice(REFRAIN), 2, 152, { ...sung, low: .64, high: .94 }), 3: tune(LAMENT, 3, 153, { low: .44, high: .68, glide: 5, jitter: 2 }), 5: tune(twice(REPLY), 5, 154, sung) }
const coro = { 1: tune(ANSWER, 1, 161, sung), 2: tune(twice(REFRAIN), 2, 162, sung), 5: tune(twice(FUGA), 5, 163, { ...sung, low: .7, high: .96 }), 6: tune(FINAL, 6, 164, sung) }
const coro2 = { 1: harmony(ANSWER, 1, 171, sung), 2: harmony(twice(REFRAIN), 2, 172, sung), 5: harmony(twice(FUGA), 5, 173, sung), 6: harmony(FINAL, 6, 174, sung) }
const hum = { 3: tune(HUM, 3, 181, { low: .36, high: .5 }) }

const PARTS = finish([
  Q('a1', 'Bajo', 'bass', 'phrase', V.bass({ gain: .38, octave: 1, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Cajón · grave', 'rhythm', 'pulse', V.zabumba({ gain: .28, decay: .22, lpf: 2400, hpf: 40, pan: 0, panWidth: 0 }), grave, on(...ALL)),
  Q('b1', 'Guitarra · punteo', 'melody', 'phrase', V.nylon({ gain: .6, octave: 2, pan: -.12, reverb: .18 }), lead, on(0, 6)),
  Q('b2', 'Cajón · agudo', 'rhythm', 'pulse', V.slap({ gain: .38, pan: .06 }), agudo, on(...ALL)),
  Q('c1', 'Guitarra · bordón', 'harmony', 'phrase', V.nylon({ gain: .36, octave: 2, pan: -.28 }), guitar, on(...ALL)),
  Q('c2', 'Cajita', 'rhythm', 'pulse', V.rim({ gain: .16, pan: .3 }), cajita, on(...ALL)),
  Q('d1', 'Cantante', 'melody', 'sustain', V.voice({ gain: .34, octave: 2, pan: 0 }), voz, on(1, 2, 3, 4, 5, 7)),
  Q('d2', 'Quijada', 'rhythm', 'pulse', V.guiro({ gain: .36, decay: .3, pan: -.3 }), quijada, on(...ALL)),
  Q('e1', 'Coro', 'response', 'sustain', V.voice({ gain: .26, octave: 2, pan: .22 }), coro, on(1, 2, 4, 5, 7, 8)),
  Q('e2', 'Palmas', 'rhythm', 'pulse', V.palmas({ gain: .3, pan: -.1 }), palmas, on(0, 1, 2, 4, 5, 7, 8)),
  Q('f1', 'Guitarra · rasgueo', 'harmony', 'phrase', V.nylon({ gain: .2, octave: 2, pan: .26 }), { ...rasgueo, 3: second[3] }, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('f2', 'Cencerro', 'rhythm', 'pulse', V.bellLow({ gain: .18, pan: .24 }), cencerro, on(2, 6, 7, 8)),
  Q('g1', 'Coro · segunda', 'response', 'sustain', V.voice({ gain: .24, octave: 2, pan: -.22 }), coro2, on(1, 2, 4, 5, 7, 8)),
  Q('g2', 'Congas', 'rhythm', 'pulse', V.conga({ gain: .34, pan: -.2 }), congas, on(1, 2, 4, 5, 6, 7, 8)),
  Q('h1', 'Coro · lamento', 'texture', 'sustain', V.voice({ gain: .22, octave: 2, pan: 0, reverb: .3, role: 'pad' }), hum, on(3)),
  Q('h2', 'Cajón · repique', 'rhythm', 'pulse', V.slap({ gain: .4, pan: .06 }), repique, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .38 } }, a2: { 0: { gain: .26 }, 3: { gain: .2 } }, c2: { 0: { gain: .12 }, 3: { gain: .1 } }, d2: { 0: { gain: .26 }, 3: { gain: .2 } },
    c1: { 0: { gain: .5, reverbRange: { first: .2, second: .26 } }, 3: { gain: .34 } }, d1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } },
  },
})
build({
  id: 'lima-1975', kitName: 'Festejo', profileName: 'Lima 1975 · Festejo', meter: '12/8', bpm: 108, root: 'A', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('fst', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Festejo afro-peruano (cajón, quijada, cajita, guitarra, solista e coro; Perú Negro, Nicomedes Santa Cruz, anos 1960–70): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Festejo',
}).catch(error => { console.error(error); process.exit(1) })
