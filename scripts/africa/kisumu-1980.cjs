// 1980 Kisumu - Benga (original material).
// By Lake Victoria: the nyatiti's cycling figure opens alone (here on a nylon guitar), ankle bells and a
// shaker join it and the orutu fiddle sings the tune before the band comes in. Benga is the lead guitar picking
// like a nyatiti, a bass that jumps octaves and never rests, a steady kick with rim and hi-hat, and two voices
// in thirds; after the verses the guitars and the bass take over for the fast instrumental climax.
// A major (Kit Harmony): I, IV and V.
// Form: nyatiti introduction · verse (voices, the guitar answering) · refrain · interlude (soft: F# minor,
// orutu over the nyatiti figure) · verse · climb (tense: the band hammering on E, toms and shouts) · lead
// guitar climax · refrain · final.
// Run: node scripts/africa/kisumu-1980.cjs
const { studio, build, reactions, SAMPLE, DRUM, P } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // A major degrees: 0 A · 1 B · 2 C# · 3 D · 4 E · 5 F# · 6 G#.
  root: { A: 0, D: -4, E: -3, 'F#m': -2 },
  names: {
    0: ['A', 'D', 'E', 'A', 'A', 'D', 'E', 'E'], 1: ['A', 'A', 'D', 'D', 'E', 'E', 'A', 'A'], 2: ['D', 'A', 'E', 'A'],
    3: ['F#m', 'D', 'E', 'A', 'F#m', 'D', 'E', 'E'], 4: ['A', 'D', 'E', 'A'], 5: ['E', 'E', 'D', 'D', 'E', 'E', 'E', 'E'], 6: ['D', 'E', 'A', 'A'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Fast and even, pushing ahead: the last sixteenth a tick early (~14 ms).
  feel: { push: [0, 0, 0, -1], jitter: 1, vel: .06 },
  colour: { spread: .1, ring: .12 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, bars, figure, riff, from, unroll, finish } = S
const { rep, mel } = C
const R = '................'
const HITS = 'X.X. X.X. X... .... | X.X. X.X. X.X. X...'
const END = 'X..X ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- drum kit, ankle bells, shaker ----------
const kick = {
  0: beat(11, enter(4, 'o... o... o... o...')), 1: drum(1, 12, 'x... x... x... x...'), 2: drum(2, 13, 'X... X... X... X... | X... X... X... X.x.'), 3: drum(3, 14, 'o... .... o... ....'),
  4: drum(4, 15, 'X... X... X... X... | X... X... X... X.x.'), 5: drum(5, 16, HITS), 6: beat(17, `X... X... X... X... | X... X... X... X.x. | ${END}`),
}
const rim = {
  1: drum(1, 21, '..x. ..x. ..x. ..xo | ..x. ..x. ..x. .ox.'), 2: drum(2, 22, '..x. .ox. ..x. .ox.'), 4: drum(4, 23, '..x. .ox. ..x. .oxo'), 6: beat(24, `..x. .ox. ..x. .ox. | ..x. .ox. ..x. .oxo | ${END}`),
}
const snare = { 2: drum(2, 31, '.... x... .... x... | .... x... .... x.,x'), 4: drum(4, 32, '.... x... .... x..x'), 5: drum(5, 33, HITS), 6: beat(34, `.... x... .... x... | .... x... .... x.xx | ${END}`) }
const hat = {
  1: drum(1, 41, 'h.g. h.g. h.g. h.gh'), 2: drum(2, 42, 'xhmh xhmh xhmh xhmh | xhmh xhmh xhmh xmxm'), 4: drum(4, 43, 'xhmh xhmh xhmh xhmh | xhmh xhmh xhmh xmxm'),
  5: drum(5, 44, 'x.x. x.x. x.x. xhxh'), 6: beat(45, `xhmh xhmh xhmh xhmh | xhmh xhmh xhmh xmxm | ${END}`),
}
const shaker = {
  0: beat(51, enter(2, 'o.g, o.g, o.g, o.gh')), 1: drum(1, 52, 'm.hh m.hh m.hh m.hh'), 2: drum(2, 53, 'X.hm X.hm X.hm X.hm'), 3: drum(3, 54, 'o.g, o.g, o.g, o.gh'),
  4: drum(4, 55, 'X.hm X.hm X.hm X.hm'), 5: drum(5, 56, 'X.mx X.mx X.mx X.mx'), 6: beat(57, `X.hm X.hm X.hm X.hm | X.hm X.hm X.hm X.hm | ${END}`),
}
const bells = {
  0: beat(61, enter(2, 'o... o... o... o...')), 1: drum(1, 62, 'o... o... o... o.h.'), 2: drum(2, 63, 'x.h. x.h. x.h. x.h.'), 3: drum(3, 64, 'h... h... h... h...'),
  4: drum(4, 65, 'x.h. x.h. x.h. x.h.'), 6: beat(66, 'x.h. x.h. x.h. x.h. | x.h. x.h. x.h. x.h. | ................ | ................'),
}
const ride = { 4: drum(4, 71, 'x.o. x.o. x.o. x.ox'), 5: drum(5, 72, 'X... X... X... X...') }
const toms = { 5: drum(5, 81, '.... .... .... .... | .... .... .... .xxX | .... .... .... .... | .... .... xxox xoXX'), [FILL]: beat(82, 'x.o. x.ox xmxm XXXx') }

// ---------- bass, nyatiti figure, guitars ----------
const JUMP = '0:2! 7:2 4:2 7:2 0:2 7:2 4:1 5:1 7:2 | 0:2! 7:2 4:2 7:2 0:2 4:2 5:2 6:2'
const jump = seed => riff(2, seed, JUMP, { gate: .66, accent: { strong: .92, beat: .8, off: .74 }, feel: { push: [0, 0, 0, 0], jitter: 0 } })
const bass = {
  0: from(4, unroll(riff(1, 91, '0:6! 4:2 7:4 4:4', { gate: .85 }), 8)), 1: riff(2, 92, '0:3! 0:1 4:2 7:2 r:2 4:2 0:2 4:2 | 0:3! 0:1 4:2 7:2 4:2 2:2 0:2 2:2', { gate: .68 }),
  2: jump(93), 3: riff(1, 94, '0:8! 4:4 7:4', { gate: .9 }), 4: jump(95), 5: riff(1, 96, '0:2! 0:2 0:2 7:2 0:2 0:2 7:2 4:2', { gate: .6 }),
  6: mel('0:2! 7:2 4:2 7:2 0:2 7:2 4:1 5:1 7:2 | 0:2! 7:2 4:2 7:2 0:2 4:2 5:2 6:2 | 0:3! 0:3 0:2 0:8 | 0:8!', { gate: .68 }),
}
const LOW = { A: [0, 2, 4], D: [0, 3, 5], E: [1, 4, 6], 'F#m': [0, 2, 5] }
const HIGH = { A: [0, 2, 4, 7], D: [0, 3, 5, 7], E: [1, 4, 6, 8], 'F#m': [0, 2, 5, 7] }
const pick = { gate: 1.2, accent: { strong: .84, beat: .76, off: .68 } }
const CYCLE = figure(LOW, 'a:2 c:1 b:1 r:1 c:1 a:2 b:2 c:1 b:1 r:1 a:1 c:2', 'a:2 c:1 b:1 r:1 c:1 a:2 c:2 b:1 a:1 r:1 b:1 c:2')
const nyatiti = { 0: bars(0, 101, CYCLE, pick), 1: bars(1, 102, CYCLE, pick), 3: bars(3, 103, CYCLE, pick), 4: bars(4, 104, CYCLE, pick), 6: bars(6, 105, figure(LOW, 'a:2 c:1 b:1 r:1 c:1 a:2 b:2 c:1 b:1 r:1 a:1 c:2', 'a:2 c:1 b:1 r:1 c:1 a:2 b:2 c:2 r:4', 'a,b,c:8 r:8', 'r:16'), pick) }
const CLIMAX = figure(HIGH, 'a:1 c:1 b:1 c:1 d:2 c:1 b:1 a:1 c:1 b:1 c:1 d:2 c:2', 'd:2 c:1 d:1 c:1 b:1 c:2 b:1 a:1 b:2 c:2 b:2', 'd:1 d:1 c:1 d:1 c:1 b:1 c:2 d:1 d:1 c:1 d:1 c:1 b:1 a:2', 'a:1 b:1 c:1 d:1 c:1 b:1 c:1 d:1 c:2 b:2 a:2 b:2')
const lead = {
  1: bars(1, 111, figure(HIGH, 'r:16', 'r:8 c:1 d:1 c:2 b:2 c:2'), pick), 2: bars(2, 112, figure(HIGH, 'a:1 c:1 b:1 c:1 d:2 c:1 b:1 a:1 c:1 b:1 c:1 d:2 c:2', 'd:2 c:1 d:1 c:1 b:1 c:2 b:1 a:1 b:2 c:2 b:2'), pick),
  4: bars(4, 113, CLIMAX, pick), 5: bars(5, 114, figure(HIGH, 'd:1 d:1 r:2 d:1 d:1 r:2 c:2 d:2 r:4', 'd:1 d:1 c:1 d:1 d:1 d:1 c:1 d:1 d:2 c:2 d:2 r:2'), pick),
  6: tune('5:2 3:1 5:1 7:2 5:2 3:2 0:1 3:1 5:2 3:2 | 6:2 4:1 6:1 8:2 6:2 4:2 1:1 4:1 6:2 4:2 | 7:3 7:3 4:2 9:8 | 7:8 r:8', 6, 115, { glide: 0, low: .6, high: .9, mel: { gate: 1.2 } }),
}
const CHORD = { A: [0, 2, 4], D: [0, 3, 5], E: [1, 4, 6], 'F#m': [0, 2, 5] }
const chank = {
  1: comp(CHORD, 1, '..o. .h.o ..o. .h..', 121, { length: 1 / 24 }), 2: comp(CHORD, 2, '..x. .o.x ..x. .ox.', 122, { length: 1 / 24 }), 4: comp(CHORD, 4, '..x. .o.x ..x. .ox.', 123, { length: 1 / 24 }),
  5: comp(CHORD, 5, HITS, 124, { length: 1 / 20 }), 6: C.relative(S.hand(125, C.named(['D', 'E', 'A', 'A'], `..x. .o.x ..x. .ox. | ..x. .o.x ..x. .ox. | ${END}`, CHORD, { length: 1 / 20 })), H(6)),
}

// ---------- voices and orutu ----------
const CANTO = '4:2 4:2 5:2 7:2 5:4 4:4 | 2:6~ 4:2 2:8 | 5:2 5:2 7:2 8:2 7:4 5:4 | 3:6~ 5:2 3:8 | 6:2 6:2 8:2 6:2 4:4 6:4 | 8:6~ 6:2 4:8 | 4:2 4:2 5:2 7:2 5:4 2:4 | 0:8~ r:8'
const REFRAO = rep('7:3 7:3 5:2 7:4 10:4 | 9:3 9:3 7:2 9:8~ | 8:3 8:3 6:2 8:4 11:4 | 9:8~ r:8', 2)
const GRITO = 'r:8 8:2 8:2 11:4 | r:16 | r:8 7:2 7:2 10:4 | r:16 | r:8 8:2 8:2 11:4 | r:16 | 8:2 8:2 11:2 11:2 8:2 8:2 11:4 | 11:8~ r:8'
const FIM = '7:3 7:3 5:2 7:4 10:4 | 8:3 8:3 6:2 8:4 11:4 | 9:3 9:3 7:2 9:8~ | r:16'
const voz = { 1: tune(CANTO, 1, 131, { low: .56, high: .86 }), 2: tune(REFRAO, 2, 132, { low: .6, high: .9 }), 5: tune(GRITO, 5, 133, { low: .7, high: .94 }), 6: tune(FIM, 6, 134, { low: .62, high: .92 }) }
const voz2 = { 1: harmony(CANTO, 1, 141, { low: .5, high: .78 }), 2: harmony(REFRAO, 2, 142, { low: .56, high: .86 }), 5: harmony(GRITO, 5, 143, { low: .66, high: .9 }), 6: harmony(FIM, 6, 144, { low: .58, high: .88 }) }
const ABERTURA = 'r:16 | r:16 | 8:6~ 6:2 4:8 | 7:12~ r:4 | 9:6~ 7:2 9:4 11:4 | 10:6~ 8:2 7:8 | 8:6~ 6:2 4:4 6:4 | 8:12~ r:4'
const CALMA = '9:6~ 7:2 5:8 | 8:6~ 7:2 5:4 3:4 | 6:6~ 8:2 11:8~ | 9:12~ r:4 | 12:6~ 11:2 9:8 | 10:6~ 8:2 7:4 5:4 | 6:6~ 8:2 6:4 4:4 | 4:12~ r:4'
const orutu = { 0: tune(ABERTURA, 0, 151, { low: .46, high: .72, glide: 2, jitter: 2 }), 3: tune(CALMA, 3, 152, { low: .44, high: .72, glide: 2, jitter: 2 }) }

const TUNED = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = finish([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { ...TUNED, octave: 2, gain: .42, attack: .005, decay: .35, sustain: .4, release: .12, clip: 1, lpf: 1900, hpf: 38, effects: { reverb: .05, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Kick', 'rhythm', 'pulse', DRUM('percussion', 'kick'), kick, on(...ALL),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .28, sustain: 0, release: .14, clip: 1, lpf: 4000, hpf: 30, effects: { reverb: .05, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Lead guitar', 'melody', 'phrase', SAMPLE('guitars', 'clean'), lead, on(1, 2, 4, 5, 6, 7, 8),
    { ...TUNED, octave: 4, gain: 1, attack: .003, decay: .35, sustain: .22, release: .14, clip: 1, lpf: 6200, hpf: 260, effects: { reverb: .14, delay: .08, pan: .25 }, design: { role: 'lead' } }),
  P('b2', 'Rim', 'rhythm', 'pulse', DRUM('drums', 'wood-rim'), rim, on(1, 2, 4, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .15, attack: .001, decay: .08, sustain: 0, release: .05, clip: .6, lpf: 6500, hpf: 500, effects: { reverb: .1, pan: -.2 } }),
  P('c1', 'Rhythm guitar', 'harmony', 'phrase', SAMPLE('guitars', 'muted'), chank, on(1, 2, 4, 5, 6, 7, 8),
    { ...TUNED, octave: 3, gain: .4, attack: .003, decay: .22, sustain: .12, release: .08, clip: .9, lpf: 4600, hpf: 220, effects: { reverb: .1, pan: .35 } }),
  P('c2', 'Snare', 'rhythm', 'pulse', DRUM('percussion', 'snare'), snare, on(2, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .5, attack: .001, decay: .14, sustain: 0, release: .08, clip: .7, lpf: 6500, hpf: 180, effects: { reverb: .1, pan: .05 } }),
  P('d1', 'Voice', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), voz, on(1, 2, 4, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .4, attack: .04, decay: .4, sustain: .78, release: .22, clip: 1, lpf: 5600, hpf: 160, effects: { reverb: .22, pan: 0 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .08 } }),
  P('d2', 'Hi-hat', 'rhythm', 'pulse', DRUM('percussion', 'hat'), hat, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .9, attack: .001, decay: .12, sustain: 0, release: .05, clip: .7, lpf: 8500, hpf: 2200, effects: { reverb: .04, pan: -.2 } }),
  P('e1', 'Voice · thirds', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), voz2, on(1, 2, 4, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .28, attack: .04, decay: .4, sustain: .76, release: .22, clip: 1, lpf: 5000, hpf: 160, effects: { reverb: .24, pan: -.14 } }),
  P('e2', 'Shaker', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), shaker, on(...ALL),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .09, sustain: 0, release: .06, clip: .5, lpf: 7500, hpf: 1800, effects: { reverb: .05, pan: .3 } }),
  P('f1', 'Orutu', 'response', 'sustain', SAMPLE('classical', 'violin-sustain'), orutu, on(0, 3),
    { ...TUNED, octave: 3, gain: .3, attack: .05, decay: .4, sustain: .8, release: .2, clip: 1, lpf: 4200, hpf: 220, effects: { reverb: .2, pan: -.2 }, design: { role: 'lead', vibrato: 5.4, vibratoDepth: .1 } }),
  P('f2', 'Ankle bells', 'rhythm', 'pulse', DRUM('percussion', 'tambourine'), bells, on(0, 1, 2, 3, 4, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .9, attack: .001, decay: .1, sustain: 0, release: .06, clip: .7, lpf: 6500, hpf: 1500, effects: { reverb: .08, pan: -.32 } }),
  P('g1', 'Nyatiti', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), nyatiti, on(0, 1, 3, 4, 6, 8),
    { ...TUNED, octave: 3, gain: .32, attack: .003, decay: .5, sustain: .2, release: .2, clip: 1, lpf: 5000, hpf: 110, effects: { reverb: .14, pan: -.3 } }),
  P('g2', 'Ride', 'rhythm', 'pulse', DRUM('percussion', 'ride'), ride, on(5, 6),
    { ...DRUMS, octave: 2, gain: .5, attack: .001, decay: .25, sustain: 0, release: .15, clip: .5, lpf: 8000, hpf: 1200, effects: { reverb: .08, pan: .2 } }),
  P('h1', 'Second guitar', 'response', 'phrase', SAMPLE('guitars', 'clean', 1), { 2: bars(2, 161, CYCLE, pick), 4: bars(4, 162, figure(LOW, 'c:1 b:1 c:2 a:1 b:1 c:2 c:1 b:1 c:2 b:1 a:1 b:2'), pick), 5: bars(5, 163, figure(LOW, 'c:1 c:1 r:2 c:1 c:1 r:2 b:2 c:2 r:4'), pick) }, on(2, 5, 6, 7),
    { ...TUNED, octave: 3, gain: .44, attack: .003, decay: .4, sustain: .2, release: .14, clip: 1, lpf: 5200, hpf: 200, effects: { reverb: .14, pan: -.12 } }),
  P('h2', 'Toms', 'rhythm', 'pulse', DRUM('percussion', 'tom'), toms, on(5),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .25, sustain: 0, release: .12, clip: .9, lpf: 4500, hpf: 70, effects: { reverb: .1, pan: -.1 } }),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .34 } }, a2: { 3: { gain: .2, lpfRange: { first: 1800, second: 2200 } }, 5: { gain: .38 } },
    e2: { 0: { gain: .1 }, 3: { gain: .1 } }, f2: { 3: { gain: .07 } }, g1: { 0: { gain: .38 }, 3: { reverbRange: { first: .22, second: .28 } } },
    f1: { 3: { reverbRange: { first: .28, second: .34 } } }, b1: { 6: { gain: .36 } },
  },
})

build({
  id: 'kisumu-1980', kitName: 'Benga', profileName: 'Kisumu 1980 · Benga', meter: '4/4', bpm: 130, root: 'A', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('bng', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 4, finale: 6 }),
  reference: 'Benga luo do Quênia (D.O. Misiani & Shirati Jazz, George Ramogi, Victoria Jazz; nyatiti e orutu): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Benga_music',
}).catch(error => { console.error(error); process.exit(1) })
