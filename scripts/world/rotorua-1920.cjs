// 1920 Rotorua - Haka (original study).
// A Māori concert party performing for visitors by the lake. Haka has no instruments: the kaea (leader)
// calls, the group answers in one voice, and the body is the drum, with feet stamped on the ground and
// hands striking thighs, chest and forearms. This study keeps that shape. The pūtātara (shell trumpet)
// opens, the kaea calls alone, the feet start, and call and answer build to the refrain shouted by
// everyone. The quiet middle borrows from waiata: a kōauau (flute), poi tapping and humming.
// No existing haka, text or tribal composition is used: the rhythms and lines are original, on one root
// (Kit Harmony: D), D natural minor.
// Form: shell trumpet and the leader's call · verse (call and answer) · chorus (all) · interlude (soft:
// kōauau, poi, humming) · verse · break (tense: feet and hands only) · leader's solo · chorus · final shout.
// Run: node scripts/world/rotorua-1920.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Menor natural', {
  // D minor degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 Bb · 6 C.
  root: { D: 0 },
  names: { 0: ['D'], 1: ['D'], 2: ['D'], 3: ['D'], 4: ['D'], 5: ['D'], 6: ['D'] },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 2, vel: .1 },
  colour: { depth: .3, spread: .14, ring: .18 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const REST = 'r:16'
const twice = text => `${text} | ${text}`
const END = 'X... X... X.X. X... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- feet and hands ----------
const BURST = 'X... X... X.X. X... | X.X. X.X. X... ....'
const feet = {
  0: beat(11, enter(4, 'x... .... x... ....')), 1: drum(1, 12, 'X... .... X... ....'), 2: drum(2, 13, 'X... X... X... X...'), 3: drum(3, 14, 'h... .... .... ....'),
  4: drum(4, 15, 'X... .... X... .... | X... .... X... X...'), 5: drum(5, 16, BURST), 6: beat(17, `X... X... X... X... | X... X... X... X... | ${END}`),
}
const thighs = {
  0: beat(21, enter(6, '..h. ..h. ..h. ..hh')), 1: drum(1, 22, '..x. ..x. ..x. ..xx'), 2: drum(2, 23, '..x. ..xx ..x. ..xx'), 4: drum(4, 24, '..x. ..x. ..x. ..xx'),
  5: drum(5, 25, '..xx ..xx ..xx ..xx | xxxx xxxx X... ....'), 6: beat(26, `..x. ..xx ..x. ..xx | ..x. ..xx ..x. ..xx | ${END}`),
}
const chest = { 1: drum(1, 31, '.... x... .... x...'), 2: drum(2, 32, '.... X... .... X..x'), 4: drum(4, 33, '.... x... .... x...'), 5: drum(5, 34, '.... X... .... X... | .x.x .x.x .... ....'), 6: beat(35, `.... X... .... X..x | .... X... .... X..x | ${END}`) }
const claps = { 2: drum(2, 41, `${R} | .... .... X... X...`), 5: drum(5, 42, `${R} | .... .... X... ....`), 6: beat(43, `${R} | .... .... X... X... | ${END}`) }
const forearms = { 2: drum(2, 51, 'x... .... x... ....'), 4: drum(4, 52, '.... ..x. .... ..x.'), 5: drum(5, 53, 'x.x. x.x. x.x. x.x. | x.x. x.x. .... ....') }
const shouts = { 1: drum(1, 61, `${rep(R, 7)} | .... .... X... ....`), 2: drum(2, 62, `${rep(R, 3)} | .... .... X... ....`), 5: drum(5, 63, `${R} | .... .... .... X...`), 6: beat(64, `${rep(R, 2)} | .... .... .... X... | X... .... .... ....`) }
const poi = { 3: drum(3, 71, 'x.h. x.h. x.h. x.hh') }
const stamp = { [FILL]: beat(81, '.... .... X.X. X.X.') }

// ---------- voices ----------
// The kaea calls in the first bar of each pair and the group answers in the second.
const CALL = '7:2 7:1 7:1 7:2 9:2 7:2 7:2 r:4 | r:16 | 7:2 7:2 9:2 9:1 9:1 7:4 r:4 | r:16 | 9:2 9:1 9:1 9:2 11:2 9:2 7:2 r:4 | r:16 | 7:1 7:1 7:2 9:2 7:2 6:2 4:2 r:4 | r:16'
const ANSWER = 'r:16 | 4:2 4:2 4:2 4:2 7:4! r:4 | r:16 | 4:2 4:1 4:1 4:2 4:2 7:4! r:4 | r:16 | 4:2 4:2 7:2 7:2 7:4! r:4 | r:16 | 4:2 4:2 4:2 2:2 0:4! r:4'
const GROUND = 'r:16 | 0:2 0:2 0:2 0:2 0:4! r:4 | r:16 | 0:2 0:1 0:1 0:2 0:2 0:4! r:4 | r:16 | 0:2 0:2 0:2 0:2 0:4! r:4 | r:16 | 0:2 0:2 0:2 0:2 0:4! r:4'
const ALL_IN = '7:2! 7:2 7:2! 7:2 9:4! 7:4 | 7:2! 7:1 7:1 7:2! 7:2 4:4! r:4 | 9:2! 9:2 9:2! 9:2 11:4! 9:4 | 7:2! 7:2 4:2 4:2 7:4! r:4'
const UNDER = '0:2! 0:2 0:2! 0:2 0:4! 0:4 | 0:2! 0:1 0:1 0:2! 0:2 0:4! r:4 | 0:2! 0:2 0:2! 0:2 0:4! 0:4 | 0:2! 0:2 0:2 0:2 0:4! r:4'
const LEAD = '9:2 9:1 9:1 9:2 11:2 9:2 7:2 9:4 | 11:2 11:2 9:2 9:2 7:4 r:4 | 9:1 9:1 9:2 11:2 12:2 11:2 9:2 7:4 | 7:2 7:2 6:2 4:2 7:4! r:4 '
  + '| 11:2 11:1 11:1 11:2 12:2 11:2 9:2 11:4 | 12:2 11:2 9:2 9:2 7:4 r:4 | 9:2 9:2 7:2 7:2 6:2 6:2 4:4 | 4:2 4:2 6:2 6:2 7:4! r:4'
const OPENING = `${rep(REST, 2)} | 7:4! 7:2 7:2 9:4! r:4 | 7:2 7:2 9:2 7:2 4:4! r:4 | 7:2 7:1 7:1 7:2 9:2 7:2 7:2 r:4 | r:16 | 9:2 9:2 7:2 7:2 4:4! r:4 | r:16`
const FIRST = `${rep(REST, 5)} | 4:2 4:2 4:2 4:2 7:4! r:4 | r:16 | 4:2 4:2 7:2 7:2 7:4! r:4`
const LAST = '7:2! 7:2 7:2! 7:2 9:4! 7:4 | 7:2! 7:2 4:2 4:2 7:4! r:4 | 7:2! r:2 7:2! r:2 7:2! 7:2! 9:4! | 7:6! r:10'
const LAST_LOW = '0:2! 0:2 0:2! 0:2 0:4! 0:4 | 0:2! 0:2 0:2 0:2 0:4! r:4 | 0:2! r:2 0:2! r:2 0:2! 0:2! 0:4! | 0:6! r:10'
const KOAUAU = '7:8~ 8:4 7:4 | 6:12~ r:4 | 7:4 8:4 9:8~ | 7:12~ r:4 | 9:8~ 8:4 7:4 | 8:8 6:8~ | 7:4 6:4 4:4 6:4 | 7:12~ r:4'
const HUM = '0:16 | 0:16 | 2:16 | 0:16 | 4:16 | 2:16 | 0:16 | 0:16'
const said = { glide: 1, jitter: 3, low: .66, high: 1, gate: .7 }, sung = { glide: 5, jitter: 2, low: .38, high: .6 }
const kaea = { 0: tune(OPENING, 0, 101, said), 1: tune(CALL, 1, 102, said), 2: tune(twice(ALL_IN), 2, 103, said), 4: tune(LEAD, 4, 104, said), 6: tune(LAST, 6, 105, said) }
const group = { 0: tune(FIRST, 0, 111, said), 1: tune(ANSWER, 1, 112, said), 2: tune(twice(ALL_IN), 2, 113, said), 6: tune(LAST, 6, 114, said) }
const ground = {
  0: tune(FIRST.replace(/[47]:/g, '0:'), 0, 121, said), 1: tune(GROUND, 1, 122, said), 2: tune(twice(UNDER), 2, 123, said),
  4: tune(C.tile('0:2 0:2 r:4 0:2 0:2 r:4', 8), 4, 124, { ...said, low: .5, high: .7 }), 6: tune(LAST_LOW, 6, 125, said),
}
const women = { 1: tune(ANSWER, 1, 131, said), 2: tune(twice(ALL_IN), 2, 132, said), 6: tune(LAST, 6, 133, said) }
const shell = { 0: tune(`4:14 r:2 | 4:6 7:6 r:4 | ${rep(REST, 6)}`, 0, 141, { low: .6, high: .8, glide: 6 }), 6: tune(`${rep(REST, 3)} | r:4 4:12`, 6, 142, { low: .6, high: .8 }) }
const flute = { 3: tune(KOAUAU, 3, 151, { glide: 6, jitter: 2, low: .44, high: .7 }) }
const hum = { 3: tune(HUM, 3, 161, sung) }
const horn = { 0: tune(`0:16 | 0:12 r:4 | ${rep(REST, 6)}`, 0, 171, { low: .4, high: .56 }), 5: tune(`${rep(REST, 6)} | 0:16 | 0:12 r:4`, 5, 172, { low: .5, high: .7 }) }

const PARTS = finish([
  Q('a1', 'Rōpū · low', 'bass', 'phrase', V.voice({ gain: .34, octave: 2, lpf: 2600, pan: -.2, role: 'bass', reverb: .16, vibratoDepth: 0 }), ground, on(0, 1, 2, 4, 6, 7, 8)),
  Q('a2', 'Waewae', 'rhythm', 'pulse', V.bassDrum({ gain: .34, decay: .22, lpf: 1000, pan: 0, panWidth: 0 }), feet, on(...ALL)),
  Q('b1', 'Kaea', 'melody', 'phrase', V.voice({ gain: .36, octave: 2, pan: 0, reverb: .14, vibratoDepth: 0 }), kaea, on(0, 1, 2, 4, 6, 7, 8)),
  Q('b2', 'Thighs', 'rhythm', 'pulse', V.slap({ gain: .34, pan: -.2 }), thighs, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('c1', 'Rōpū', 'response', 'phrase', V.voice({ gain: .3, octave: 2, pan: .2, reverb: .16, vibratoDepth: 0 }), group, on(0, 1, 2, 4, 7, 8)),
  Q('c2', 'Chest', 'rhythm', 'pulse', V.tom({ gain: .26, decay: .14, lpf: 1800, hpf: 90, pan: .16 }), chest, on(1, 2, 4, 5, 6, 7, 8)),
  Q('d1', 'Rōpū · wāhine', 'response', 'phrase', V.voice({ gain: .28, octave: 3, pan: .3, reverb: .16, vibratoDepth: 0 }), women, on(1, 2, 4, 7, 8)),
  Q('d2', 'Hands', 'rhythm', 'pulse', V.palmas({ gain: .3, pan: -.1 }), claps, on(2, 5, 7, 8)),
  Q('e1', 'Pūtātara', 'response', 'sustain', V.horn({ gain: .4, octave: 3, attack: .06, pan: 0, reverb: .28 }), shell, on(0, 8)),
  Q('e2', 'Forearms', 'rhythm', 'pulse', V.brush({ gain: .3, lpf: 4200, pan: .26 }), forearms, on(2, 5, 6, 7)),
  Q('f1', 'Kōauau', 'melody', 'sustain', V.recorder({ gain: .4, pan: -.1, reverb: .28 }), flute, on(3)),
  Q('f2', 'Hī!', 'response', 'pulse', V.hey({ gain: .18, pan: 0, reverb: .18 }), shouts, on(1, 2, 4, 5, 7, 8)),
  Q('g1', 'Humming', 'texture', 'sustain', V.voice({ gain: .26, octave: 3, lpf: 2400, pan: 0, reverb: .28, role: 'pad' }), hum, on(3)),
  Q('g2', 'Poi', 'rhythm', 'pulse', V.rim({ gain: .12, lpf: 3600, hpf: 300, pan: .2 }), poi, on(3)),
  Q('h1', 'Pūkāea', 'texture', 'sustain', V.trombone({ gain: .26, octave: 2, attack: .08, lpf: 1600, pan: 0, reverb: .26, role: 'pad' }), horn, on(0, 5)),
  Q('h2', 'Waewae · last', 'rhythm', 'pulse', V.bassDrum({ gain: .34, decay: .22, lpf: 1000, pan: 0 }), stamp, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: { a2: { 0: { gain: .24 }, 3: { gain: .16 } }, b1: { 0: { reverbRange: { first: .2, second: .26 } } } },
})
build({
  id: 'rotorua-1920', kitName: 'Haka', profileName: 'Rotorua 1920 · Haka', meter: '4/4', bpm: 100, root: 'D', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('hak', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Haka e kapa haka maori (kaea e grupo em chamada e resposta, pés e mãos como percussão; kōauau, pūtātara e poi na parte lenta): estudo original de forma, sem haka, textos ou composições tribais existentes',
  url: 'https://en.wikipedia.org/wiki/Haka',
}).catch(error => { console.error(error); process.exit(1) })
