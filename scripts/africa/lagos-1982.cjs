// 1982 Lagos - Jùjú (original material).
// A long, unhurried praise song. The talking drum speaks first, alone over the shekere; then three guitars
// enter one by one, each with its own small figure, and lock into a single moving chord. Bass and hand drums
// keep it light, the leader sings a line and the chorus answers in harmony, a pedal steel slides in between
// and the talking drum never stops commenting.
// G major (Kit Harmony).
// Form: talking drum call · verse (leader) · chorus (answer in thirds) · interlude (soft: E minor, pedal
// steel over two guitars and shekere) · verse · drum conversation (tense: talking drum against the hand
// drums on D) · talking drum solo · chorus · final.
// Run: node scripts/africa/lagos-1982.cjs
const { studio, build, reactions, SAMPLE, DRUM, P } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // G major degrees: 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F#.
  root: { G: 0, C: -4, D: -3, Em: -2 },
  names: {
    0: ['G'], 1: ['G', 'G', 'C', 'G', 'G', 'G', 'D', 'G'], 2: ['C', 'G', 'D', 'G'],
    3: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'D'], 4: ['G', 'C'], 5: ['D', 'D', 'C', 'C', 'D', 'D', 'D', 'D'], 6: ['C', 'D', 'G', 'G'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Relaxed: the second and fourth sixteenths a tick late (~17 ms), soft hands.
  feel: { push: [0, 1, 0, 1], jitter: 1, vel: .07 },
  colour: { spread: .12, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, bars, figure, riff, from, unroll, finish } = S
const { rep, mel } = C
const R = '................'
const END = 'X..X ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- shekere, agogô, hand drums, a light kick ----------
const shekere = {
  0: beat(11, 'o.g, o.g, o.g, o.g, | o.gh o.gh o.gh o.gh | ' + rep('X.hm X.hm X.hm X.hm', 6)), 1: drum(1, 12, 'X.hm X.hm X.hm X.hm | X.hm X.hm X.hm X.mx'), 2: drum(2, 13, 'X.mx X.mx X.mx X.mx'),
  3: drum(3, 14, 'o.g, o.g, o.g, o.gh'), 4: drum(4, 15, 'X.hm X.hm X.hm X.hm'), 5: drum(5, 16, 'X.mx X.mx X.mx X.mx'), 6: beat(17, `X.mx X.mx X.mx X.mx | X.mx X.mx X.mx X.mx | ${END}`),
}
const agogo = {
  0: beat(21, enter(4, 'o.h. .o.h ..o. h...')), 1: drum(1, 22, 'x.o. .x.o ..x. o...'), 2: drum(2, 23, 'x.o. .x.o ..x. o.o.'), 4: drum(4, 24, 'x.o. .x.o ..x. o...'),
  5: drum(5, 25, 'x.o. x.o. x.o. x.ox'), 6: beat(26, `x.o. .x.o ..x. o... | x.o. .x.o ..x. o.o. | ${END}`),
}
const conga = {
  0: beat(31, enter(4, 'o... ..o. .... o.o.')), 1: drum(1, 32, 'o... ..x. .... x.x. | o... ..x. ..o. x.x.'), 2: drum(2, 33, 'x... ..x. ..o. x.x. | x.o. ..x. ..o. x.xx'),
  3: drum(3, 34, 'h... ..o. .... o.o.'), 4: drum(4, 35, 'x.o. ..x. .xo. x.x. | o.x. .ox. ..x. xxox'), 5: drum(5, 36, 'x.xx ..x. x.xx ..x. | x.xx .xx. x.xx xxXx'),
  6: beat(37, `x... ..x. ..o. x.x. | x.o. ..x. ..o. x.xx | ${END}`),
}
const slap = {
  1: drum(1, 41, '..h. h... h.h. ....'), 2: drum(2, 42, '..o. o..h o.h. ....'), 3: drum(3, 43, '..g. h... g.h. ....'), 4: drum(4, 44, '..o. o..h o.h. .o..'), 5: drum(5, 45, '..o. o... ..o. o.o.'),
}
const omele = {
  0: beat(51, enter(2, 'h.gg h.gg h.gg h.gg')), 1: drum(1, 52, 'o.hh o.hh o.hh o.hh'), 2: drum(2, 53, 'x.oo x.oo x.oo x.oo | x.oo x.oo x.oo xoxo'), 4: drum(4, 54, 'x.oo x.oo x.oo x.oo'),
  5: drum(5, 55, 'xoxo xoxo xoxo xoxo'), 6: beat(56, `x.oo x.oo x.oo x.oo | x.oo x.oo x.oo xoxo | ${END}`),
}
const kick = {
  1: drum(1, 61, 'o... .... o... ....'), 2: drum(2, 62, 'x... .... x... ..o.'), 4: drum(4, 63, 'x... .... x... ..o.'), 5: drum(5, 64, 'X... x... X... x...'),
  6: beat(65, `x... .... x... ..o. | x... .... x... ..o. | ${END}`),
}
const sticks = { 1: drum(1, 71, 'h..h ..h. ..h. h...'), 2: drum(2, 72, 'x..x ..x. ..x. x...'), 3: drum(3, 73, 'g..g ..g. ..g. g...'), 4: drum(4, 74, 'x..x ..x. ..x. x...') }
const roll = { [FILL]: beat(81, 'o.x. o.xo xoxo XxXx') }

// ---------- talking drum: a pitched drum that bends into its notes ----------
const CALL = '0:2 4:2^3 0:1 0:1 4:4^-2 7:2^4 4:2 0:2^-3 | 0:1 0:1 4:2^3 7:4^2 r:4 4:2^-2 0:2 | 4:2 4:2^2 7:2^3 4:2 0:2^-3 r:2 0:1 0:1 4:2^3 | 7:6^3 4:2^-2 0:8^-3 | ' +
  'r:8 0:2 4:2^3 0:2^-3 r:2 | r:16 | r:8 4:2^2 7:2^3 4:2^-2 0:2 | r:16'
const COMMENT = 'r:16 | r:8 0:2 4:2^3 0:2^-3 r:2 | r:16 | r:8 4:2^2 7:2^3 4:2^-2 0:2 | r:16 | r:8 0:1 0:1 4:2^3 7:4^2 | r:16 | r:8 7:2^3 4:2^-2 0:4^-3'
const TALK = '0:2 4:2^3 0:1 0:1 4:4^-2 7:2^4 4:2 0:2^-3 | 0:1 0:1 4:2^3 7:4^2 r:2 7:1 7:1 4:2^-2 0:2 | 4:2 4:2^2 7:2^3 4:2 0:2^-3 4:1 4:1 7:2^3 4:2 | 7:6^3 4:2^-2 0:8^-3 | ' +
  '7:1 7:1 4:2^-2 7:1 7:1 4:2^-2 0:2^-3 4:2^3 7:4^3 | 0:2 0:2 4:2^3 0:2 4:2^3 7:2^3 4:2 0:2 | 7:1 4:1 7:1 4:1 7:2 4:2^-2 0:1 0:1 4:2^3 7:4^3 | 7:8^4 0:8^-4'
const talk = { glide: 0, low: .6, high: .95, jitter: 2, mel: { gate: .8 } }
const gangan = {
  0: tune(CALL, 0, 91, talk), 1: tune(COMMENT, 1, 92, { ...talk, low: .5, high: .8 }), 2: tune(COMMENT, 2, 93, { ...talk, low: .5, high: .8 }),
  4: tune(TALK, 4, 94, talk), 5: tune(TALK, 5, 95, { ...talk, low: .7, high: 1 }), 6: tune('0:2 4:2^3 0:1 0:1 4:4^-2 7:2^4 4:2 0:2^-3 | 7:1 4:1 7:1 4:1 7:2 4:2^-2 0:1 0:1 4:2^3 7:4^3 | 7:3^3 7:3 4:2^-2 0:8^-3 | 0:8', 6, 96, talk),
}

// ---------- bass and the three guitars ----------
const EASY = '0:4! r:2 0:2 4:4 2:2 4:2 | 0:4! r:2 0:2 4:4 7:4'
const easy = seed => riff(2, seed, EASY, { gate: .78, accent: { strong: .9, beat: .8, off: .72 }, feel: { push: [0, 0, 0, 1], jitter: 0 } })
const bass = {
  0: from(6, unroll(easy(101), 8)), 1: easy(102), 2: easy(103), 3: riff(1, 104, '0:8! 4:8', { gate: .92 }), 4: easy(105),
  5: riff(1, 106, '0:3! 0:3 0:2 r:2 0:2 4:2 0:2', { gate: .62 }), 6: mel('0:4! r:2 0:2 4:4 2:2 4:2 | 0:4! r:2 0:2 4:4 7:4 | 0:3! 0:3 0:2 0:8 | 0:8!', { gate: .78 }),
}
const HIGH = { G: [7, 9, 11, 14], C: [7, 10, 12, 14], D: [8, 11, 13, 15], Em: [7, 9, 12, 14] }
const LOW = { G: [0, 2, 4], C: [0, 3, 5], D: [1, 4, 6], Em: [0, 2, 5] }
const pick = { gate: 1.1, accent: { strong: .8, beat: .74, off: .68 } }
const ONE = figure(HIGH, 'c:2 r:1 b:1 c:2 d:2 r:1 c:1 b:2 c:2 r:2', 'c:2 r:1 b:1 c:2 d:2 r:1 c:1 b:2 a:2 b:2')
const TWO = figure(LOW, 'r:2 a:2 r:1 b:1 a:2 r:2 a:2 b:1 c:1 b:2')
const THREE = figure(HIGH, 'a:1 b:1 r:2 c:2 b:2 a:1 b:1 r:2 c:2 a:2')
const first = { 0: from(2, bars(0, 111, ONE, pick)), 1: bars(1, 112, ONE, pick), 2: bars(2, 113, ONE, pick), 3: bars(3, 114, figure(HIGH, 'a:2 b:2 c:2 b:2 d:2 c:2 b:2 c:2'), { gate: 1.6 }), 4: bars(4, 115, ONE, pick), 6: bars(6, 116, figure(HIGH, 'c:2 r:1 b:1 c:2 d:2 r:1 c:1 b:2 c:2 r:2', 'c:2 r:1 b:1 c:2 d:2 r:1 c:1 b:2 a:2 b:2', 'b,c,d:8 r:8', 'r:16'), pick) }
const second = { 0: from(4, bars(0, 121, TWO, pick)), 1: bars(1, 122, TWO, pick), 2: bars(2, 123, TWO, pick), 4: bars(4, 124, TWO, pick), 5: bars(5, 125, figure(LOW, 'c:1 c:1 r:2 c:1 c:1 r:2 b:2 c:2 r:4'), pick) }
const third = { 0: from(6, bars(0, 131, THREE, pick)), 2: bars(2, 132, THREE, pick), 3: bars(3, 133, figure(HIGH, 'r:4 a:2 b:2 r:4 b:2 c:2'), { gate: 1.4 }), 4: bars(4, 134, THREE, pick), 5: bars(5, 135, figure(HIGH, 'd:1 d:1 r:2 d:1 d:1 r:2 c:2 d:2 r:4'), pick) }

// ---------- voices and pedal steel ----------
const CANTO = '7:3 7:3 9:2 7:4 4:4 | 5:3 7:3 5:2 4:8~ | 8:3 8:3 10:2 8:4 7:4 | 9:8~ r:8 | 7:3 7:3 9:2 11:4 9:4 | 7:3 9:3 7:2 4:8~ | 6:3 6:3 8:2 6:4 4:4 | 7:8~ r:8'
const RESPOSTA = rep('10:3 10:3 8:2 10:4 12:4 | 11:3 11:3 9:2 11:8~ | 11:3 11:3 8:2 11:4 13:4 | 11:8~ r:8', 2)
const FIM = '10:3 10:3 8:2 10:4 12:4 | 11:3 11:3 8:2 11:4 13:4 | 11:3 11:3 9:2 11:8~ | r:16'
const voz = { 1: tune(CANTO, 1, 141, { low: .54, high: .84 }), 6: tune(FIM, 6, 142, { low: .6, high: .9 }) }
const coro = { 2: tune(RESPOSTA, 2, 151, { low: .58, high: .88 }), 5: tune('r:8 11:2 11:2 13:4 | r:16 | r:8 10:2 10:2 12:4 | r:16 | r:8 11:2 11:2 13:4 | r:16 | r:8 11:2 13:2 15:4 | 15:8~ r:8', 5, 152, { low: .66, high: .92 }), 6: tune(FIM, 6, 153, { low: .6, high: .9 }) }
const coro2 = { 2: harmony(RESPOSTA, 2, 161, { low: .54, high: .84 }), 5: harmony('r:8 11:2 11:2 13:4 | r:16 | r:8 10:2 10:2 12:4 | r:16 | r:8 11:2 11:2 13:4 | r:16 | r:8 11:2 13:2 15:4 | 15:8~ r:8', 5, 162, { low: .62, high: .88 }), 6: harmony(FIM, 6, 163, { low: .56, high: .86 }) }
const STEEL = '9:8~ 11:8^2~ | 10:8~ 7:8^-3 | 9:8~ 11:4 14:4^3~ | 13:12~ r:4 | 12:8~ 14:8^2~ | 12:8~ 10:8^-2 | 11:8~ 13:8^2~ | 13:12~ r:4'
const steel = {
  1: tune('r:16 | r:16 | r:16 | r:8 11:4^2~ 14:4^3~ | r:16 | r:16 | r:16 | r:8 13:4^2~ 11:4^-2~', 1, 171, { low: .4, high: .62, glide: 0 }), 2: tune('r:16 | r:8 14:8^3~ | r:16 | r:8 11:8^-2~ | r:16 | r:8 16:8^2~ | r:16 | r:8 14:8^-2~', 2, 172, { low: .4, high: .6, glide: 0 }),
  3: tune(STEEL, 3, 173, { low: .46, high: .72, glide: 0, jitter: 2 }),
}

const TUNED = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = finish([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { ...TUNED, octave: 2, gain: .46, attack: .005, decay: .4, sustain: .4, release: .16, clip: 1, lpf: 1500, hpf: 35, effects: { reverb: .05, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Kick', 'rhythm', 'pulse', DRUM('percussion', 'kick'), kick, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .28, sustain: 0, release: .14, clip: 1, lpf: 3200, hpf: 30, effects: { reverb: .05, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Guitar 1', 'harmony', 'phrase', SAMPLE('guitars', 'clean'), first, on(...ALL),
    { ...TUNED, octave: 3, gain: .9, attack: .003, decay: .35, sustain: .2, release: .14, clip: 1, lpf: 5600, hpf: 240, effects: { reverb: .14, pan: .3 } }),
  P('b2', 'Shekere', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), shekere, on(...ALL),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .09, sustain: 0, release: .06, clip: .5, lpf: 7000, hpf: 1800, effects: { reverb: .05, pan: .3 } }),
  P('c1', 'Guitar 2', 'harmony', 'phrase', SAMPLE('guitars', 'muted'), second, on(...ALL),
    { ...TUNED, octave: 3, gain: .5, attack: .003, decay: .22, sustain: .12, release: .08, clip: .9, lpf: 4200, hpf: 200, effects: { reverb: .1, pan: -.3 } }),
  P('c2', 'Agogô', 'rhythm', 'pulse', DRUM('sambaReggae', 'agogo-agudo'), agogo, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .2, sustain: 0, release: .1, clip: .5, lpf: 6000, hpf: 800, effects: { reverb: .1, pan: -.34 } }),
  P('d1', 'Leader', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), voz, on(1, 4, 8),
    { ...TUNED, octave: 3, gain: .4, attack: .04, decay: .4, sustain: .78, release: .22, clip: 1, lpf: 5400, hpf: 160, effects: { reverb: .22, pan: 0 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .08 } }),
  P('d2', 'Conga', 'rhythm', 'pulse', DRUM('percussion', 'conga'), conga, on(...ALL),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .2, sustain: 0, release: .12, clip: .8, lpf: 4800, hpf: 110, effects: { reverb: .08, pan: .18 } }),
  P('e1', 'Chorus', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), coro, on(2, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .36, attack: .05, decay: .4, sustain: .78, release: .24, clip: 1, lpf: 5600, hpf: 180, effects: { reverb: .26, pan: .14 }, design: { role: 'lead' } }),
  P('e2', 'Conga · slap', 'rhythm', 'pulse', DRUM('percussion', 'muted-conga'), slap, on(1, 2, 3, 4, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 5200, hpf: 160, effects: { reverb: .08, pan: .22 } }),
  P('f1', 'Pedal steel', 'response', 'sustain', SAMPLE('strings', 'slide-electric'), steel, on(1, 2, 3, 4, 7),
    { ...TUNED, octave: 3, gain: .2, attack: .03, decay: .5, sustain: .7, release: .3, clip: 1, lpf: 4200, hpf: 200, effects: { reverb: .26, delay: .14, pan: -.15 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .08 } }),
  P('f2', 'Omele', 'rhythm', 'pulse', DRUM('percussion', 'bongo'), omele, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .5, attack: .001, decay: .12, sustain: 0, release: .07, clip: .7, lpf: 5600, hpf: 220, effects: { reverb: .08, pan: -.2 } }),
  P('g1', 'Guitar 3', 'harmony', 'phrase', SAMPLE('guitars', 'clean', 1), third, on(0, 2, 3, 5, 6, 7),
    { ...TUNED, octave: 3, gain: .7, attack: .003, decay: .35, sustain: .2, release: .14, clip: 1, lpf: 5000, hpf: 220, effects: { reverb: .14, pan: 0 } }),
  P('g2', 'Sticks', 'rhythm', 'pulse', DRUM('drums', 'wood-rim'), sticks, on(1, 2, 3, 4, 6, 7),
    { ...DRUMS, octave: 2, gain: .16, attack: .001, decay: .08, sustain: 0, release: .05, clip: .6, lpf: 6000, hpf: 500, effects: { reverb: .12, pan: -.28 } }),
  P('h1', 'Talking drum', 'melody', 'phrase', SAMPLE('world', 'conga'), gangan, on(...ALL),
    { ...TUNED, octave: 3, gain: .4, attack: .002, decay: .22, sustain: .1, release: .12, clip: 1, lpf: 3800, hpf: 90, effects: { reverb: .12, pan: .1 }, design: { role: 'lead' } }),
  P('h2', 'Hand drum · roll', 'rhythm', 'pulse', DRUM('percussion', 'tom'), roll, on(),
    { ...DRUMS, octave: 2, gain: .28, attack: .001, decay: .22, sustain: 0, release: .12, clip: .9, lpf: 4200, hpf: 80, effects: { reverb: .1, pan: -.1 } }),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .4 } }, b2: { 0: { gain: .18 }, 3: { gain: .16 } }, d2: { 3: { gain: .22, reverbRange: { first: .16, second: .22 } } },
    b1: { 3: { gain: .36, reverbRange: { first: .22, second: .28 } } }, g1: { 3: { gain: .32, reverbRange: { first: .22, second: .28 } } },
    f1: { 3: { gain: .3, reverbRange: { first: .32, second: .38 } } }, h1: { 0: { reverbRange: { first: .2, second: .26 } }, 5: { gain: .46 }, 6: { gain: .46 } },
  },
})

build({
  id: 'lagos-1982', kitName: 'Jùjú', profileName: 'Lagos 1982 · Jùjú', meter: '4/4', bpm: 110, root: 'G', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('juj', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Jùjú iorubá (King Sunny Adé & His African Beats, Ebenezer Obey, I.K. Dairo): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/J%C3%B9j%C3%BA_music',
}).catch(error => { console.error(error); process.exit(1) })
