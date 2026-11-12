// 1965 Luanda - Semba (original material).
// A musseque backyard: one nylon guitar opens alone, the dikanza (the long bamboo scraper) joins it, then the
// ngomas, the second guitar and the bass. Semba is guitars, hand drums, scraper and voices: no drum kit and no
// horns here. The lead guitar sings in thirds with a second guitar, the rhythm guitar strums on the offbeats,
// the bass walks in 3-3-2, a singer calls and the yard answers.
// G major (Kit Harmony).
// Form: guitar introduction · verse (singer) · refrain (coro in thirds) · lamento (soft: E minor, voice and one
// guitar, the dikanza barely moving) · verse · rebita (tense: A minor, claps, ngomas doubling, the coro in
// short calls) · guitar solo in thirds · refrain · final.
// Run: node scripts/africa/luanda-1965.cjs
const { studio, build, reactions, SAMPLE, DRUM, P } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // G major degrees: 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F#.
  root: { G: 0, C: -4, D: -3, Em: -2, Am: 1 },
  names: {
    0: ['G', 'C', 'D', 'G', 'G', 'C', 'D', 'D'], 1: ['G', 'C', 'D', 'G', 'G', 'Em', 'Am', 'D'], 2: ['C', 'G', 'D', 'G', 'C', 'G', 'D', 'G'],
    3: ['Em', 'Am', 'D', 'G', 'Em', 'Am', 'D', 'Em'], 4: ['G', 'C', 'D', 'G', 'G', 'C', 'D', 'G'], 5: ['Am', 'Am', 'D', 'D', 'Am', 'Am', 'D', 'D'], 6: ['C', 'D', 'G', 'G'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // The semba sway: the second sixteenth late, the fourth early (ticks of ~17 ms), unhurried hands.
  feel: { push: [0, 1, 0, -1], jitter: 1, vel: .07 },
  colour: { spread: .1, ring: .14 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel } = C
const R = '................'
const END = 'X..X ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- dikanza, ngomas, bombo, palmas ----------
const DIKANZA = 'X.hm X.hm X.hm X.hm | X.hm X.hm X.hm Xmhm'
const dikanza = {
  0: beat(11, enter(2, 'o.g, o.g, o.g, o.g, | o.gh o.gh o.gh o.gh')), 1: drum(1, 12, DIKANZA), 2: drum(2, 13, 'X.mx X.mx X.mx X.mx | X.mx X.mx X.mx Xxmx'),
  3: drum(3, 14, 'h.g, h.g, h.g, h.g,'), 4: drum(4, 15, DIKANZA), 5: drum(5, 16, 'XmXm XmXm XmXm XmXm | XmXm XmXm XmXm XxXx'),
  6: beat(17, `X.mx X.mx X.mx X.mx | X.mx X.mx X.mx Xxmx | ${END}`),
}
const ngoma = {
  0: beat(21, enter(4, 'o..x ..x. o..x ..x.')), 1: drum(1, 22, 'o..x ..x. o..x ..x. | o..x ..x. o..x .xx.'), 2: drum(2, 23, 'x..x ..x. x..x .ox. | x..x ..x. x.ox .xxx'),
  3: drum(3, 24, 'h... ..o. h... ..o.'), 4: drum(4, 25, 'x.ox ..x. x..x .ox. | .xox .xo. x.x. xoxx'), 5: drum(5, 26, 'x.xx ..x. x.xx ..x. | x.xx ..x. x.xx xxxx'),
  6: beat(27, `x..x ..x. x..x .ox. | x..x ..x. x.ox .xxx | ${END}`),
}
const slap = {
  0: beat(31, enter(4, '..h. h... ..h. h...')), 1: drum(1, 32, '..h. h... ..h. h... | ..h. h..h ..h. h...'), 2: drum(2, 33, '..o. o..h ..o. o... | ..o. o..h ..o. o.h.'),
  4: drum(4, 34, '..o. o..h ..o. o.h. | o... o.oh ..o. ....'), 5: drum(5, 35, '..o. o... ..o. o... | ..o. o... ..o. ....'),
}
const bombo = {
  1: drum(1, 41, 'x... ..o. x... ..o. | x... ..o. x... .oo.'), 2: drum(2, 42, 'X... ..x. X... ..x. | X... ..x. X..x ..x.'), 3: drum(3, 43, 'o... .... o... ....'),
  4: drum(4, 44, 'x... ..o. x... ..o.'), 5: drum(5, 45, 'X... X... X... X..x'), 6: beat(46, `X... ..x. X... ..x. | X... ..x. X..x ..x. | ${END}`),
}
const palmas = {
  2: drum(2, 51, '.... x... .... x.x. | .... x... .... x...'), 5: drum(5, 52, 'x..x ..x. x..x ..x. | x..x ..x. x.x. x.x.'), 6: beat(53, `.... x... .... x.x. | .... x... .... x... | ${END}`),
}
const shaker = {
  1: drum(1, 61, 'g,h. g,h. g,h. g,h.'), 2: drum(2, 62, 'ghmh ghmh ghmh ghmh'), 4: drum(4, 63, 'g,h. g,h. g,h. g,hh'), 5: drum(5, 64, 'ghmh ghmh ghmh ghmh'),
  6: beat(65, 'ghmh ghmh ghmh ghmh | ghmh ghmh ghmh ghmh | ................ | ................'),
}
const bell = {
  2: drum(2, 71, 'x... ..o. ..x. o... | x... ..o. ..x. o.o.'), 4: drum(4, 72, 'o... ..h. ..o. h...'), 5: drum(5, 73, 'x.o. x.o. x.o. x.o.'),
}
const virada = { [FILL]: beat(81, 'x.o. x.ox .xox XxXx') }

// ---------- bass and guitars ----------
const WALK = '0:3! 0:3 4:2 0:3 4:3 2:2 | 0:3! 0:3 4:2 7:3 4:3 2:2'
const bassWalk = seed => riff(2, seed, WALK, { gate: .72, accent: { strong: .92, beat: .8, off: .72 }, feel: { push: [0, 0, 0, 0], jitter: 0 } })
const bass = {
  0: from(6, unroll(bassWalk(91), 8)), 1: bassWalk(92), 2: bassWalk(93), 3: riff(2, 94, '0:8! 4:4 2:4 | 0:8! 4:8', { gate: .9 }),
  4: bassWalk(95), 5: riff(1, 96, '0:2! 0:2 0:2 4:2 0:2 0:2 4:2 2:2', { gate: .6 }), 6: mel('0:3! 0:3 4:2 0:3 4:3 2:2 | 0:3! 0:3 4:2 0:3 4:3 2:2 | 0:3! 0:3 0:2 0:8 | 0:8!', { gate: .72 }),
}
const CHORD = { G: [2, 4, 7], C: [3, 5, 7], D: [1, 4, 6], Em: [2, 4, 5], Am: [1, 3, 5] }
const strum = {
  0: from(4, unroll(comp(CHORD, 0, '..o. .h.o ..o. .h.. | ..o. .h.o ..o. .hh.', 101, { length: 1 / 20 }), 8)), 1: comp(CHORD, 1, '..o. .h.o ..o. .h.. | ..o. .h.o ..o. .hh.', 102, { length: 1 / 20 }),
  2: comp(CHORD, 2, '..x. .o.x ..x. .o.x | ..x. .o.x ..x. .oxx', 103, { length: 1 / 20 }), 3: comp(CHORD, 3, 'h... .... ..g. ....', 104, { length: 1 / 5 }),
  4: comp(CHORD, 4, '..o. .h.o ..o. .h.. | ..o. .h.o ..o. .hh.', 105, { length: 1 / 20 }), 5: comp(CHORD, 5, 'x..x ..x. x..x ..x.', 106, { length: 1 / 18 }),
  6: C.relative(S.hand(107, C.named(['C', 'D', 'G', 'G'], `..x. .o.x ..x. .o.x | ..x. .o.x ..x. .oxx | ${END}`, CHORD, { length: 1 / 16 })), H(6)),
}
// The lead guitar's lines (absolute degrees; lengths in sixteenths).
const ABERTURA = '9:2 8:2 7:2 5:2 7:4 4:4 | 5:2 7:2 8:2 10:2 8:4 7:4 | 8:2 6:2 4:2 6:2 8:4 11:4 | 9:6~ 7:2 9:8 | ' +
  '9:2 8:2 7:2 5:2 7:4 4:4 | 5:2 7:2 8:2 10:2 12:4 10:4 | 11:2 8:2 6:2 8:2 11:4 8:4 | 8:6~ 6:2 4:8'
const RESPOSTAS = 'r:16 | r:8 7:2 8:2 10:4 | r:16 | r:8 9:2 7:2 4:4 | r:16 | r:8 9:2 11:2 12:4 | r:16 | r:8 6:2 8:2 11:4'
const CONTRA = 'r:12 7:2 8:2 | 10:4 r:12 | r:12 8:2 9:2 | 11:4 r:12 | r:12 7:2 8:2 | 10:4 r:12 | r:8 11:2 9:2 8:2 6:2 | 7:8 r:8'
const SOLO = '9:2 11:2 12:2 11:2 9:4 7:4 | 10:2 12:2 14:2 12:2 10:4 8:4 | 11:2 13:2 11:2 9:2 8:2 6:2 8:4 | 9:6~ 11:2 9:4 7:4 | ' +
  '11:2 12:2 14:2 12:2 11:2 9:2 7:4 | 12:2 10:2 8:2 10:2 12:4 14:4 | 13:2 11:2 9:2 8:2 6:2 8:2 11:4 | 9:8~ r:8'
const LAMENTO_VIOLAO = '5:2 9:2 12:2 9:2 7:2 9:2 12:2 9:2 | 5:2 8:2 10:2 8:2 7:2 8:2 10:2 8:2 | 4:2 8:2 11:2 8:2 6:2 8:2 11:2 8:2 | 4:2 7:2 9:2 7:2 5:2 7:2 9:2 7:2 | ' +
  '5:2 9:2 12:2 9:2 7:2 9:2 12:2 9:2 | 5:2 8:2 10:2 8:2 7:2 8:2 10:2 8:2 | 4:2 8:2 11:2 8:2 6:2 8:2 11:2 8:2 | 5:2 9:2 12:2 9:2 12:8'
const guitar = { glide: 0, low: .5, high: .8, mel: { gate: 1.3 } }
const lead = {
  0: tune(ABERTURA, 0, 111, guitar), 1: tune(RESPOSTAS, 1, 112, guitar), 2: tune(CONTRA, 2, 113, guitar),
  3: tune(LAMENTO_VIOLAO, 3, 114, { ...guitar, low: .4, high: .62, window: 1 }), 4: tune(SOLO, 4, 115, { ...guitar, low: .58, high: .9 }), 6: tune('r:16 | r:8 8:2 6:2 4:4 | 9:2 11:2 12:4 r:8 | 14:8 r:8', 6, 116, guitar),
}
const tercas = { 0: from(4, harmony(ABERTURA, 0, 121, guitar)), 2: harmony(CONTRA, 2, 122, guitar), 4: harmony(SOLO, 4, 123, { ...guitar, low: .52, high: .82 }) }

// ---------- voices ----------
const CANTO = '4:3 4:3 5:2 7:4 r:4 | 5:3 5:3 7:2 5:4 3:4 | 4:3 4:3 6:2 8:4 r:4 | 7:3 5:3 4:2 2:6~ r:2 | 4:3 4:3 5:2 7:4 9:4 | 9:3 7:3 5:2 7:6~ r:2 | 8:3 7:3 5:2 3:4 5:4 | 4:6~ r:10'
const REFRAO = '10:3 10:3 9:2 10:4 7:4 | 9:3 9:3 8:2 9:6~ r:2 | 8:3 8:3 7:2 8:4 11:4 | 9:6~ 7:4 r:6 | 10:3 10:3 9:2 10:4 7:4 | 9:3 9:3 11:2 9:4 7:4 | 8:3 8:3 9:2 8:4 6:4 | 7:8~ r:8'
const LAMENTO = '9:6~ 7:2 5:8~ | 8:6~ 7:2 5:4 3:4 | 4:6~ 6:2 8:8~ | 7:12~ r:4 | 9:6~ 11:2 12:8~ | 10:6~ 8:2 7:4 5:4 | 6:6~ 4:2 8:4 6:4 | 5:12~ r:4'
const REBITA = 'r:8 8:2 8:2 10:4 | r:16 | r:8 8:2 6:2 4:4 | r:16 | r:8 8:2 8:2 10:4 | r:16 | 8:2 8:2 6:2 6:2 8:2 8:2 11:4 | 11:8~ r:8'
const REBITA_SOLISTA = '5:3 5:3 7:2 8:4 r:4 | 8:3 7:3 5:2 3:4 r:4 | 4:3 4:3 6:2 8:4 r:4 | 6:3 4:3 1:2 4:4 r:4 | 5:3 5:3 7:2 8:4 r:4 | 8:3 10:3 8:2 7:4 5:4 | r:16 | 4:8~ r:8'
const voz = {
  1: tune(CANTO, 1, 131, { low: .56, high: .86 }), 3: tune(LAMENTO, 3, 132, { low: .42, high: .7, jitter: 2, glide: 3 }),
  5: tune(REBITA_SOLISTA, 5, 133, { low: .66, high: .92 }), 6: tune('10:3 10:3 9:2 10:4 7:4 | 8:3 8:3 9:2 11:4 8:4 | 9:3 9:3 7:2 9:8~ | r:16', 6, 134, { low: .6, high: .9 }),
}
const coro = { 2: tune(REFRAO, 2, 141, { low: .6, high: .9 }), 5: tune(REBITA, 5, 142, { low: .7, high: .94 }), 6: tune('10:3 10:3 9:2 10:4 7:4 | 8:3 8:3 9:2 11:4 8:4 | 9:3 9:3 7:2 9:8~ | r:16', 6, 143, { low: .6, high: .9 }) }
const coro2 = { 2: harmony(REFRAO, 2, 151, { low: .56, high: .86 }), 5: harmony(REBITA, 5, 152, { low: .66, high: .9 }) }

const TUNED = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = finish([
  P('a1', 'Baixo', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { ...TUNED, octave: 2, gain: .46, attack: .005, decay: .4, sustain: .4, release: .15, clip: 1, lpf: 1500, hpf: 35, effects: { reverb: .06, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Bombo', 'rhythm', 'pulse', DRUM('classical', 'concert-bass-drum'), bombo, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .36, attack: .001, decay: .3, sustain: 0, release: .15, clip: 1, lpf: 1800, hpf: 35, effects: { reverb: .06, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Viola · solo', 'melody', 'phrase', SAMPLE('guitars', 'nylon'), lead, on(...ALL),
    { ...TUNED, octave: 3, gain: .78, attack: .003, decay: .6, sustain: .25, release: .25, clip: 1, lpf: 5600, hpf: 110, effects: { reverb: .16, pan: -.2 }, design: { role: 'lead' } }),
  P('b2', 'Dikanza', 'rhythm', 'pulse', DRUM('brasil', 'reco-reco'), dikanza, on(...ALL),
    { ...DRUMS, octave: 2, gain: .42, attack: .001, decay: .09, sustain: 0, release: .06, clip: .5, lpf: 6500, hpf: 900, effects: { reverb: .06, pan: .3 } }),
  P('c1', 'Viola · ritmo', 'harmony', 'phrase', SAMPLE('guitars', 'clean'), strum, on(...ALL),
    { ...TUNED, octave: 3, gain: .46, attack: .003, decay: .3, sustain: .15, release: .1, clip: .9, lpf: 4600, hpf: 220, effects: { reverb: .12, pan: .3 } }),
  P('c2', 'Ngoma · tapa', 'rhythm', 'pulse', DRUM('percussion', 'muted-conga'), slap, on(0, 1, 2, 4, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 5200, hpf: 160, effects: { reverb: .08, pan: -.22 } }),
  P('d1', 'Cantor', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), voz, on(1, 3, 4, 5, 8),
    { ...TUNED, octave: 3, gain: .42, attack: .04, decay: .4, sustain: .78, release: .24, clip: 1, lpf: 5200, hpf: 150, effects: { reverb: .24, pan: 0 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .1 } }),
  P('d2', 'Chocalho', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), shaker, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .08, sustain: 0, release: .05, clip: .5, lpf: 7000, hpf: 2200, effects: { reverb: .05, pan: -.3 } }),
  P('e1', 'Coro', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), coro, on(2, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .36, attack: .05, decay: .4, sustain: .78, release: .26, clip: 1, lpf: 5600, hpf: 180, effects: { reverb: .28, pan: .14 }, design: { role: 'lead' } }),
  P('e2', 'Palmas', 'rhythm', 'pulse', DRUM('drums', 'room-clap'), palmas, on(2, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .4, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 6000, hpf: 400, effects: { reverb: .16, pan: .2 } }),
  P('f1', 'Viola · terças', 'response', 'phrase', SAMPLE('guitars', 'nylon'), tercas, on(0, 2, 6, 7),
    { ...TUNED, octave: 3, gain: .58, attack: .003, decay: .6, sustain: .25, release: .25, clip: 1, lpf: 5000, hpf: 110, effects: { reverb: .16, pan: -.35 } }),
  P('f2', 'Ngongue', 'rhythm', 'pulse', DRUM('sambaReggae', 'agogo-grave'), bell, on(2, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .2, sustain: 0, release: .1, clip: .5, lpf: 5500, hpf: 500, effects: { reverb: .1, pan: .36 } }),
  P('g1', 'Coro · segunda voz', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), coro2, on(2, 5, 7),
    { ...TUNED, octave: 3, gain: .26, attack: .05, decay: .4, sustain: .76, release: .26, clip: 1, lpf: 5000, hpf: 160, effects: { reverb: .28, pan: -.14 } }),
  P('g2', 'Ngoma · virada', 'rhythm', 'pulse', DRUM('percussion', 'bongo'), virada, on(),
    { ...DRUMS, octave: 2, gain: .55, attack: .001, decay: .15, sustain: 0, release: .08, clip: .7, lpf: 6000, hpf: 200, effects: { reverb: .1, pan: -.1 } }),
  P('h1', 'Ngoma', 'rhythm', 'pulse', DRUM('percussion', 'conga'), ngoma, on(...ALL),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .22, sustain: 0, release: .12, clip: .8, lpf: 4800, hpf: 100, effects: { reverb: .08, pan: -.15 } }),
  P('h2', 'Ngoma · grave', 'rhythm', 'pulse', DRUM('percussion', 'tom'), { 2: drum(2, 161, '.... .... ..o. .... | .... .... ..o. o...'), 5: drum(5, 162, '..o. .... ..o. .... | ..o. .... ..o. o.o.') }, on(2, 5, 7),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .25, sustain: 0, release: .12, clip: .9, lpf: 3200, hpf: 60, effects: { reverb: .08, pan: .1 } }),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    b2: { 0: { gain: .11 }, 3: { gain: .09 } }, h1: { 3: { gain: .14, reverbRange: { first: .16, second: .22 } } }, a2: { 3: { gain: .2 } },
    c1: { 3: { gain: .14, reverbRange: { first: .22, second: .28 } } }, b1: { 3: { gain: .3, reverbRange: { first: .26, second: .32 } }, 6: { gain: .46 } },
    d1: { 3: { reverbRange: { first: .34, second: .4 } } }, a1: { 3: { gain: .34 } },
  },
})

build({
  id: 'luanda-1965', kitName: 'Semba', profileName: 'Luanda 1965 · Semba', meter: '4/4', bpm: 108, root: 'G', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('smb', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Semba de Luanda (Ngola Ritmos, Liceu Vieira Dias, Bonga, Carlos Lamartine): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Semba',
}).catch(error => { console.error(error); process.exit(1) })
