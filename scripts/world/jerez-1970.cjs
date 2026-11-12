// 1970 Jerez de la Frontera - Flamenco (original material).
// A juerga por bulerías: the guitar opens alone with a falseta and taps on its top, the muted palms come in
// under it, and the twelve-count compás takes shape: accents on 12, 3, 6, 8 and 10. There is no drum; the
// rhythm is hands (dull and bright claps, knuckles on the table, finger snaps) and heels. The cantaor's
// lines are long, ornamented and falling; the company answers the estribillo and shouts encouragement.
// A Phrygian "por medio" (Kit Harmony): the Andalusian cadence Dm · C · Bb · A.
// Form: falseta, then palmas · letra · estribillo · interlude (soft: arpeggios and the quejío) · letra ·
// escobilla (tense: heels and palms alone, the guitar only stabs) · falseta · estribillo · remate.
// Run: node scripts/world/jerez-1970.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('12/8', 'Phrygian', {
  // A Phrygian degrees: 0 A · 1 Bb · 2 C · 3 D · 4 E · 5 F · 6 G.
  root: { A: 0, Bb: 1, C: 2, Dm: 3 },
  names: {
    0: ['A'], 1: ['A', 'A', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A'], 2: ['Dm', 'C', 'Bb', 'A'],
    3: ['A', 'Bb', 'A', 'Bb', 'C', 'Bb', 'A', 'A'], 4: ['A', 'Bb', 'C', 'Bb'], 5: ['A', 'Bb'], 6: ['Dm', 'C', 'Bb', 'A'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .09 },
  colour: { depth: .26, spread: .14, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '... ... ... ...'
// The compás, starting on 12: 12 · · 3 · · 6 · 8 · 10 ·
const COMPAS = 'X.. X.. X.X .X.'
const CIERRE = 'X.. X.. X.X .X. | X.. ... ... ...'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- hands and heels ----------
const sordas = {
  0: beat(11, enter(4, 'o.. h.. o.h .h.')), 1: drum(1, 12, 'x.. h.. x.h .x.'), 2: drum(2, 13, COMPAS), 3: drum(3, 14, 'o.. ... o.. .h.'),
  4: drum(4, 15, 'x.. h.. x.h .x.'), 5: drum(5, 16, COMPAS), 6: beat(17, `${COMPAS} | ${COMPAS} | ${CIERRE}`),
}
// Bright palms fill the off-beats: the contratiempo.
const claras = {
  1: drum(1, 21, '.h. .h. .h. h.h'), 2: drum(2, 22, '.xx .xx .x. x.x'), 4: drum(4, 23, '.h. .h. .h. h.h'), 5: drum(5, 24, '.xx .xx .x. x.x | .xx .xx xx. x.x'),
  6: beat(25, `.xx .xx .x. x.x | .xx .xx .x. x.x | ${CIERRE}`),
}
const nudillos = { 0: beat(31, enter(6, 'h.h h.h h.h h.h')), 1: drum(1, 32, 'x.h h.h x.h h.h'), 3: drum(3, 33, 'h.. h.. h.. h..'), 4: drum(4, 34, 'x.h h.h x.h h.h') }
const pitos = { 2: drum(2, 41, '..x ..x .x. .x.'), 3: drum(3, 42, '... ..h ... .h.'), 6: beat(43, '..x ..x .x. .x. | ..x ..x .x. .x.') }
const golpe = { 0: beat(51, 'x.. ... x.. ... | x.. ... x.. .x. | ' + rep('x.. x.. x.. ...', 6)), 3: drum(3, 52, 'h.. ... h.. ...'), 4: drum(4, 53, 'x.. x.. x.. ...') }
const tacon = {
  2: drum(2, 61, '... ... X.X .X.'), 5: drum(5, 62, 'Xhh Xhh XhX hXh | Xhx Xhx XxX xXx | Xhh Xhh XhX hXh | XxX xXx XXX XXX'), 6: beat(63, `... ... X.X .X. | ... ... X.X .X. | ${CIERRE}`),
}
const planta = { 5: drum(5, 71, '.x. .x. .x. x.x') }
const remate = { [FILL]: beat(81, '... ... XxX xXx') }
const jaleo = { 2: drum(2, 91, '... ... ... ... | ... ... ... ... | ... ... ... ... | ... ... ... .X.'), 5: drum(5, 92, 'X.. ... ... ... | ... ... ... ... | X.. ... ... ... | ... ... ... .X.'), 6: beat(93, `${R} | ${R} | ${R} | X.. ... ... ...`) }

// ---------- guitars (lengths in eighths: twelve a bar) ----------
// A [A E Bb: the open flamenco voicing] · Bb [Bb D F] · C [C E G] · Dm [D F A]
const CHORD = { A: [0, 4, 8], Bb: [1, 3, 5], C: [2, 4, 6], Dm: [3, 5, 7] }
const twelve = { steps: 12, length: 1 / 16 }
const RASGUEO = 'X.. X.. X.X .X.', ABANICO = 'Xhh X.h X.X hXh'
const rasgueo = {
  0: from(6, unroll(comp(CHORD, 0, 'x.. ... x.x .x.', 101, twelve), 8)), 1: comp(CHORD, 1, 'x.. x.. x.h .x.', 102, twelve), 2: comp(CHORD, 2, ABANICO, 103, twelve),
  4: comp(CHORD, 4, 'x.. ... ... ... | ... ... x.x .x.', 104, twelve), 5: comp(CHORD, 5, 'X.. ... ... ... | ... ... ... .X.', 105, twelve),
  6: relative(S.hand(106, C.named(['Dm', 'C', 'Bb', 'A'], `${ABANICO} | ${ABANICO} | ${RASGUEO} | X.. ... ... ...`, CHORD, { steps: 12, length: 1 / 12 })), H(6)),
}
const BORDON = '0:3! 0:3 0:2 4:2 0:2'
const bordones = {
  0: from(2, unroll(riff(1, 111, '0:6 4:3 0:3', { gate: .9, accent: { strong: .66, beat: .58, off: .52 } }), 8)), 1: riff(1, 112, BORDON, { gate: .84, accent: { strong: .9, beat: .78, off: .7 } }),
  2: riff(1, 113, '0:3! 0:2 4:1 0:2 4:2 0:2', { gate: .84 }), 3: riff(1, 114, '0:6 4:6', { gate: .96, accent: { strong: .6, beat: .52, off: .46 } }), 4: riff(1, 115, BORDON, { gate: .84 }),
  5: riff(2, 116, '0:3! r:9 | r:10 0:2', { gate: .7 }), 6: mel('0:3! 0:2 4:1 0:2 4:2 0:2 | 0:3! 0:2 4:1 0:2 4:2 0:2 | 0:3! 0:3 0:2 0:2 0:2 | 0:12!', { gate: .84 }),
}
// Falsetas: picado runs falling through the mode, with a slide into the long notes.
const OPEN = '4:3* 5:1 4:1 2:1 4:3 1:3 | 0:6* 4:2 5:2 7:2 | 8:1 7:1 5:1 4:1 5:1 7:1 8:3 7:3 | 5:1 4:1 2:1 1:1 2:1 4:1 1:3 0:3* '
  + '| 11:1 10:1 9:1 8:1 7:1 6:1 5:1 4:1 3:1 2:1 1:1 0:1 | 4:2 5:1 7:2 5:1 4:3 1:3 | 2:1 4:1 5:1 7:1 5:1 4:1 2:1 1:1 0:1 1:1 2:1 1:1 | 0:9* r:3'
const FALSETA = '7:1 8:1 9:1 11:2 9:1 8:1 7:1 5:1 7:3 | 8:1 7:1 5:1 4:1 5:1 7:1 8:2 10:1 8:3 | 9:1 8:1 6:1 4:1 6:1 8:1 9:1 11:1 13:1 11:3 | 12:1 10:1 8:1 7:1 8:1 10:1 8:3 5:3 '
  + '| 14:1 13:1 12:1 11:1 10:1 9:1 8:1 7:1 6:1 5:1 4:1 3:1 | 4:1 5:1 7:1 8:1 7:1 5:1 4:1 5:1 7:1 8:3 | 9:1 8:1 6:1 4:1 2:1 4:1 6:1 8:1 6:1 4:3 | 5:1 4:1 2:1 1:1 0:1 1:1 0:6*'
const pick = { low: .58, high: .96, glide: 0, jitter: 1, mel: { gate: .86 } }
const falseta = {
  0: tune(OPEN, 0, 121, { ...pick, low: .5, high: .86 }), 1: tune('r:12 | r:6 4:1 2:1 1:1 0:3 | r:12 | r:6 5:1 4:1 2:1 1:3 | r:12 | r:12 | r:12 | r:6 2:1 1:1 0:1 0:3', 1, 122, { ...pick, low: .46, high: .7 }),
  4: tune(FALSETA, 4, 123, pick), 6: tune('r:12 | r:12 | 11:1 10:1 9:1 8:1 7:1 6:1 5:1 4:1 3:1 2:1 1:1 0:1 | 0:12*', 6, 124, pick),
}
const ARPEGIO = '0:1 4:1 7:1 9:1 7:1 4:1 0:1 4:1 7:1 9:1 7:1 4:1'
const second = {
  2: riff(1, 131, ARPEGIO, { gate: .9, accent: { strong: .6, beat: .56, off: .48 } }), 3: riff(1, 132, '0:1 4:1 7:1 9:3 7:1 4:1 7:1 9:3', { gate: .96, accent: { strong: .56, beat: .5, off: .44 } }),
  4: riff(1, 133, ARPEGIO, { gate: .9, accent: { strong: .5, beat: .46, off: .4 } }),
}
// Alzapúa: the thumb drives a low figure under the footwork.
const alzapua = { 5: riff(2, 141, '0:1! 0:1 4:1 0:1 0:1 4:1 0:1 4:1 0:1 4:1 0:1 4:1 | 0:1! 0:1 4:1 0:1 0:1 4:1 7:1 4:1 0:1 4:1 0:1 1:1', { gate: .6, accent: { strong: .8, beat: .7, off: .6 } }) }

// ---------- cante ----------
const LETRA = 'r:3 4:3~ 5:1 4:1 5:1 4:3~ | 4:2 3:1 2:2 1:1 0:6~ | r:3 5:3~ 6:1 5:1 4:1 5:3~ | 4:2 3:1 2:1 1:1 2:1 1:2 0:4~ | r:3 7:3~ 8:1 7:1 5:1 7:3~ | 6:2 5:1 4:3~ 6:2 5:1 4:3 | 5:2 4:1 3:3~ 5:2 4:1 3:3 | 4:1 3:1 2:1 1:3 0:6~'
const ESTRIBILLO = '7:2 7:1 8:2 7:1 5:3 7:3 | 6:2 6:1 7:2 6:1 4:6~ | 5:2 5:1 6:2 5:1 3:3 5:3 | 4:2 3:1 2:1 1:2 0:6~ | 7:2 7:1 8:2 7:1 9:3 7:3 | 6:2 6:1 7:2 6:1 8:6~ | 5:2 5:1 6:2 5:1 3:3 5:3 | 4:2 3:1 2:1 1:2 0:6~'
const QUEJIO = '4:9~ 5:3 | 4:6~ 3:3 1:3 | 4:9~ 5:3 | 5:12~ | 6:9~ 7:3 | 5:6~ 4:3 3:3 | 4:3 3:1 2:1 1:1 0:6~ | r:12'
const CIERRA = '7:2 7:1 8:2 7:1 5:3 7:3 | 6:2 6:1 7:2 6:1 4:6~ | 5:2 5:1 6:2 5:1 4:2 3:1 2:2 1:1 | 0:12~'
const cante = { low: .58, high: .94, glide: 2, jitter: 2, mel: { gate: .98 } }
const voz = { 1: tune(LETRA, 1, 151, cante), 2: tune(ESTRIBILLO, 2, 152, cante), 6: tune(CIERRA, 6, 153, cante) }
const coro = { 2: harmony(ESTRIBILLO, 2, 161, { ...cante, low: .5, high: .8 }), 6: harmony(CIERRA, 6, 162, { ...cante, low: .5, high: .8 }) }
const quejio = { 3: tune(QUEJIO, 3, 171, { ...cante, low: .42, high: .7 }) }

const PARTS = finish([
  Q('a1', 'Guitarra · bordones', 'bass', 'phrase', V.nylon({ gain: .5, octave: 2, lpf: 2200, hpf: 50, role: 'bass', panWidth: .1 }), bordones, on(...ALL)),
  Q('a2', 'Tacón', 'rhythm', 'pulse', V.tom({ gain: .28, decay: .1, lpf: 2400, pan: .1, reverb: .14 }), tacon, on(2, 5, 7, 8)),
  Q('b1', 'Guitarra · rasgueo', 'harmony', 'phrase', V.nylon({ gain: .3, pan: -.26 }), rasgueo, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('b2', 'Palmas sordas', 'rhythm', 'pulse', V.palmas({ gain: .3, lpf: 3200, pan: -.2, reverb: .14 }), sordas, on(...ALL)),
  Q('c1', 'Cante', 'melody', 'sustain', V.voice({ gain: .4, pan: 0, reverb: .2 }), voz, on(1, 2, 4, 7, 8)),
  Q('c2', 'Palmas claras', 'rhythm', 'pulse', V.clap({ gain: .28, pan: .24, reverb: .14 }), claras, on(1, 2, 4, 5, 7, 8)),
  Q('d1', 'Guitarra · falseta', 'melody', 'phrase', V.nylon({ gain: .44, pan: .2, role: 'lead', reverb: .18 }), falseta, on(0, 1, 4, 6, 8)),
  Q('d2', 'Nudillos', 'rhythm', 'pulse', V.rim({ gain: .14, lpf: 3600, pan: .3 }), nudillos, on(0, 1, 3, 4)),
  Q('e1', 'Coro', 'response', 'sustain', V.voice({ gain: .32, pan: .2, reverb: .2 }), coro, on(2, 7, 8)),
  Q('e2', 'Pitos', 'rhythm', 'pulse', V.clave808({ gain: .1, pan: -.34 }), pitos, on(2, 3, 7, 8)),
  Q('f1', 'Segunda guitarra', 'harmony', 'phrase', V.nylon({ gain: .34, pan: .34 }), second, on(2, 3, 6, 7)),
  Q('f2', 'Golpe', 'rhythm', 'pulse', V.slap({ gain: .2, decay: .06, lpf: 3000, pan: -.1 }), golpe, on(0, 3, 6)),
  Q('g1', 'Quejío', 'melody', 'sustain', V.voice({ gain: .38, pan: -.1, reverb: .3 }), quejio, on(3)),
  Q('g2', 'Jaleo', 'response', 'pulse', V.hey({ gain: .14, pan: .3, reverb: .2 }), jaleo, on(2, 5, 7, 8)),
  Q('h1', 'Guitarra · alzapúa', 'harmony', 'phrase', V.nylon({ gain: .34, octave: 2, pan: -.2 }), alzapua, on(5)),
  Q('h2', 'Tacón · planta', 'rhythm', 'pulse', V.tom({ gain: .24, decay: .08, lpf: 3200, hpf: 120, pan: -.1, reverb: .14 }), { ...planta, ...remate }, on(5)),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .44 } }, b2: { 0: { gain: .2 }, 3: { gain: .18 }, 5: { gain: .36 } }, c2: { 5: { gain: .34 } }, a2: { 5: { gain: .36, reverbRange: { first: .2, second: .26 } } },
    d1: { 0: { reverbRange: { first: .22, second: .28 } } }, f1: { 3: { reverbRange: { first: .24, second: .3 } } },
  },
})
build({
  id: 'jerez-1970', kitName: 'Flamenco', profileName: 'Jerez 1970 · Flamenco', meter: '12/8', bpm: 80, root: 'A', scale: 'Phrygian',
  form: FORM, parts: PARTS,
  reactions: reactions('flm', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Bulerías de Jerez (Terremoto de Jerez, La Paquera, Moraíto Chico, Paco de Lucía): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Buler%C3%ADas',
}).catch(error => { console.error(error); process.exit(1) })
