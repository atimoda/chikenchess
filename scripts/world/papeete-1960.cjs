// 1960 Papeete - Ōte'a (original material).
// A Tahitian dance troupe on the waterfront: the pū (conch) calls, the lead tō'ere (a slit log drum)
// gives the signal alone, and the orchestra of drums answers: the tāmau keeping time, the low pahu
// tupa'i under everything, the fa'atete rattling on top. There is no tune; each "pehe" is a named rhythm
// and the dance changes when the lead drummer changes it. Only the slow middle is melodic, with the vivo
// (nose flute) over a ukulele and humming voices.
// C major (Kit Harmony): C, with F and G under the vivo.
// Form: conch and signal, then the drums · verse (first pehe) · chorus (second pehe, shouts) · interlude
// (soft: vivo, ukulele, voices) · verse · break (tense: unison stops) · lead tō'ere solo · chorus · final.
// Run: node scripts/world/papeete-1960.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // C major degrees: 0 C · 1 D · 2 E · 3 F · 4 G · 5 A · 6 B.
  root: { C: 0, F: 3, G: 4 },
  names: { 0: ['C'], 1: ['C'], 2: ['C'], 3: ['C', 'C', 'F', 'F', 'G', 'G', 'C', 'C'], 4: ['C'], 5: ['C'], 6: ['C'] },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .09 },
  colour: { spread: .14, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const REST = 'r:16'
const END = 'X.XX X.XX XXXX X... | X... .... .... ....'
// The stops of the break: everyone on the same strokes, then silence.
const STOPS = 'X.X. X... .... .... | X.XX X.X. X... .... | X.X. X... .... X.X. | XXXX XXXX X... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`
const bars = (text, count) => { const each = text.split('|').map(bar => bar.trim()); return Array.from({ length: count }, (_, index) => each[index % each.length]).join(' | ') }
// A slit drum has two lips: the strong stroke on the high one, the light stroke on the low one.
const wood = (text, high, low) => text.split('|').map(bar => bar.replace(/\s/g, '').split('').map(c => c === 'X' ? `${high}:1!` : c === '.' ? 'r:1' : `${low}:1`).join(' ')).join(' | ')

// ---------- tō'ere ----------
const PEHE_1 = 'X.xX .xX. X.xX .xXx | X.xX .xX. XxXx X.X.'
const PEHE_2 = 'XxxX xxXx xXxx XxXx | XxxX xxXx XXxX XxX.'
const SIGNAL = `${rep(R, 2)} | X... X... X.X. X.X. | XxXx XxXx XXXX X...`
const FAST = 'XxxxXxxxXxXxXXXX | XxXxXxXxXXXXX.X. | XxxXxxXxxXxxXxXx | XXXXxxxxXXXXX...'
const struck = { glide: 0, jitter: 1, low: .5, high: .94 }
const lead = {
  0: tune(wood(`${SIGNAL} | ${bars(PEHE_1, 4)}`, 7, 4), 0, 101, struck), 1: tune(wood(bars(PEHE_1, 8), 7, 4), 1, 102, struck), 2: tune(wood(bars(PEHE_2, 8), 7, 4), 2, 103, struck),
  4: tune(wood(bars(FAST, 8), 7, 4), 4, 104, struck), 5: tune(wood(bars(STOPS, 8), 7, 4), 5, 105, struck), 6: tune(wood(`${bars(PEHE_2, 2)} | ${END}`, 7, 4), 6, 106, struck),
}
const middle = {
  1: tune(wood(bars('x.x. X.x. x.x. X.xx', 8), 7, 4), 1, 111, struck), 2: tune(wood(bars('X.xx X.xx X.xx XxXx', 8), 7, 4), 2, 112, struck), 4: tune(wood(bars('X.xx X.xx X.xx X.xx', 8), 7, 4), 4, 113, struck),
  5: tune(wood(bars(STOPS, 8), 7, 4), 5, 114, struck), 6: tune(wood(`${bars('X.xx X.xx X.xx XxXx', 2)} | ${END}`, 7, 4), 6, 115, struck),
}
const log = {
  2: tune(wood(bars('X... x... X... x.x.', 8), 0, 0), 2, 121, struck), 4: tune(wood(bars('X... x... X... x...', 8), 0, 0), 4, 122, struck), 5: tune(wood(bars(STOPS, 8), 0, 0), 5, 123, struck),
  6: tune(wood(`${bars('X... x... X... x.x.', 2)} | ${END}`, 0, 0), 6, 124, struck),
}
const tamau = {
  0: beat(11, enter(4, 'x.hh x.hh x.hh x.hh')), 1: drum(1, 12, 'x.hh x.hh x.hh x.hh'), 2: drum(2, 13, 'X.xx X.xx X.xx X.xx'), 3: drum(3, 14, 'h... h... h... h...'),
  4: drum(4, 15, 'X.xx X.xx X.xx X.xx'), 5: drum(5, 16, STOPS), 6: beat(17, `X.xx X.xx X.xx X.xx | X.xx X.xx X.xx X.xx | ${END}`),
}
const small = { 2: drum(2, 21, '..x. ..x. ..x. ..xx'), 4: drum(4, 22, '.x.x .x.x .x.x .xxx'), 6: beat(23, `..x. ..x. ..x. ..xx | ..x. ..x. ..x. ..xx | ${END}`) }

// ---------- pahu, fa'atete, bamboo, shouts ----------
const pahu = {
  0: beat(31, enter(4, 'x... ..h. x... h...')), 1: drum(1, 32, 'X... ..x. X... x...'), 2: drum(2, 33, 'X..x ..X. X.x. X...'), 3: drum(3, 34, 'h... .... h... ....'),
  4: drum(4, 35, 'X... ..x. X... x... | X..x ..X. X.x. X...'), 5: drum(5, 36, STOPS), 6: beat(37, `X..x ..X. X.x. X... | X..x ..X. X.x. X... | ${END}`),
}
const faatete = {
  0: beat(41, enter(6, '..h. h.hh ..h. h.hh')), 1: drum(1, 42, '..x. x.xh ..x. x.xx'), 2: drum(2, 43, 'x.xx x.xx xXxx x.xx'), 4: drum(4, 44, '..x. x.xx ..x. xxxx'),
  5: drum(5, 45, STOPS), 6: beat(46, `x.xx x.xx xXxx x.xx | x.xx x.xx xXxx x.xx | ${END}`),
}
const rima = { 1: drum(1, 51, '.x.. .x.x .x.. .xx.'), 2: drum(2, 52, '.x.x .x.x .x.x .xx.'), 3: drum(3, 53, '.... h... .... h.h.'), 4: drum(4, 54, '.x.. .x.x .x.. .xx.'), 6: beat(55, '.x.x .x.x .x.x .xx. | .x.x .x.x .x.x .xx.') }
const bamboo = { 1: drum(1, 61, 'x... x... x... x...'), 2: drum(2, 62, 'x.x. x.x. x.x. x.x.'), 3: drum(3, 63, '..h. ..h. ..h. ..h.'), 6: beat(64, `x.x. x.x. x.x. x.x. | x.x. x.x. x.x. x.x. | ${END}`) }
const shouts = { 2: drum(2, 71, `${rep(R, 3)} | .... .... X... X...`), 5: drum(5, 72, `.... .... X... .... | .... .... .... X... | ${R} | .... .... .... X...`), 6: beat(73, `${rep(R, 3)} | X... .... .... ....`) }
const rolls = { 4: drum(4, 81, `${rep(R, 3)} | xxxx xxxx XXXX XXXX`), 5: drum(5, 82, `${rep(R, 3)} | xxxx xxxx .... ....`), [FILL]: beat(83, '.... .... xxxx XXXX') }
const last = { [FILL]: beat(91, '.... .... X.X. X.X.') }

// ---------- conch, vivo, ukulele, voices ----------
const conch = { 0: tune(`4:14 r:2 | 4:10 r:6 | ${rep(REST, 6)}`, 0, 131, { low: .6, high: .8 }), 5: tune(`${rep(REST, 3)} | r:8 4:8 | ${rep(REST, 3)} | r:8 4:8`, 5, 132, { low: .6, high: .8 }), 6: tune(`${rep(REST, 2)} | 4:16 | 4:12 r:4`, 6, 133, { low: .6, high: .8 }) }
const VIVO = '14:8~ 16:4 14:4 | 12:12~ r:4 | 10:4 12:4 14:8~ | 12:12~ r:4 | 15:8~ 13:4 11:4 | 13:8 11:8~ | 12:4 11:4 9:4 11:4 | 14:12~ r:4'
const vivo = { 3: tune(VIVO, 3, 141, { glide: 5, jitter: 2, low: .46, high: .72 }) }
// C [C E G] · F [C F A] · G [D G B]
const CHORD = { C: [7, 9, 11], F: [7, 10, 12], G: [8, 11, 13] }
const ukulele = { 3: comp(CHORD, 3, 'x.hx h.x. x.hx h.x.', 151, { length: 1 / 12 }) }
const HUM = '2:16 | 2:16 | 3:16 | 3:16 | 1:16 | 1:16 | 2:16 | 0:16'
const voices = { 3: tune(HUM, 3, 161, { low: .36, high: .5 }) }

const slit = { attack: .001, decay: .14, sustain: 0, release: .08, lpf: 5200, hpf: 250, reverb: .1 }
const PARTS = finish([
  Q('a1', 'Pahu tupa\'i', 'bass', 'pulse', V.surdo({ gain: .4, pan: 0, panWidth: 0 }), pahu, on(...ALL)),
  Q('a2', 'Tō\'ere tāmau', 'rhythm', 'pulse', V.clave808({ gain: .12, lpf: 4200, pan: -.2 }), tamau, on(...ALL)),
  Q('b1', 'Tō\'ere arata\'i', 'melody', 'phrase', V.marimba({ ...slit, gain: .66, octave: 3, pan: .08, panWidth: .1 }), lead, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('b2', 'Fa\'atete', 'rhythm', 'pulse', V.repique({ gain: .24, pan: .26 }), faatete, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('c1', 'Tō\'ere · second', 'harmony', 'phrase', V.marimba({ ...slit, gain: .6, octave: 2, lpf: 3600, hpf: 150, pan: -.3, panWidth: .1 }), middle, on(1, 2, 4, 5, 6, 7, 8)),
  Q('c2', 'Pahu rima', 'rhythm', 'pulse', V.conga({ gain: .34, pan: .14 }), rima, on(1, 2, 3, 4, 6, 7, 8)),
  Q('d1', 'Vivo', 'melody', 'sustain', V.worldFlute({ gain: .3, octave: 3, pan: -.1, reverb: .26 }), vivo, on(3)),
  Q('d2', 'Tō\'ere · small', 'rhythm', 'pulse', V.rim({ gain: .16, hpf: 700, pan: .34 }), small, on(2, 6, 7, 8)),
  Q('e1', 'Pū', 'response', 'sustain', V.horn({ gain: .4, octave: 3, attack: .08, pan: 0, reverb: .26 }), conch, on(0, 5, 8)),
  Q('e2', '\'Ofe', 'rhythm', 'pulse', V.brush({ gain: .3, hpf: 500, pan: -.34 }), bamboo, on(1, 2, 3, 4, 7, 8)),
  Q('f1', 'Tō\'ere · great', 'harmony', 'phrase', V.marimba({ ...slit, gain: .7, octave: 2, decay: .2, lpf: 2400, hpf: 60, pan: .2, panWidth: .1 }), log, on(2, 5, 6, 7, 8)),
  Q('f2', 'Shouts', 'response', 'pulse', V.hey({ gain: .16, pan: .1, reverb: .18 }), shouts, on(2, 5, 7, 8)),
  Q('g1', 'Ukulele', 'harmony', 'phrase', V.cavaquinho({ gain: .2, pan: .24 }), ukulele, on(3)),
  Q('g2', 'Fa\'atete · roll', 'rhythm', 'pulse', V.repique({ gain: .22, decay: .08, pan: .26 }), rolls, on(5, 6)),
  Q('h1', 'Voices', 'texture', 'sustain', V.voice({ gain: .24, pan: -.2, reverb: .28, role: 'pad' }), voices, on(3)),
  Q('h2', 'Pahu · final', 'rhythm', 'pulse', V.surdo({ gain: .32, decay: .3, pan: 0 }), last, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 7: FILL },
  params: { a1: { 0: { gain: .24 }, 3: { gain: .18 } }, a2: { 0: { gain: .09 }, 3: { gain: .07 } }, b1: { 0: { gain: .76, reverbRange: { first: .16, second: .22 } } } },
})
build({
  id: 'papeete-1960', kitName: "Ōte'a", profileName: "Papeete 1960 · Ōte'a", meter: '4/4', bpm: 132, root: 'C', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('ote', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: "Ōte'a do Taiti (orquestra de tō'ere, pahu tupa'i e fa'atete; pehe; vivo e pū): referência de estilo; material original",
  url: 'https://en.wikipedia.org/wiki/%CA%BB%C5%8Cte%CA%BBa',
}).catch(error => { console.error(error); process.exit(1) })
