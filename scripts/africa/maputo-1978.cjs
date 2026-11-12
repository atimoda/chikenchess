// 1978 Maputo - Marrabenta (original material).
// A Mafalala backyard dance: one guitar strums the marrabenta alone ("boom, chick-a"), a tambourine and bongos
// come in, then the bass, a light drum kit and the picked lead guitar. The singer tells the story, the women
// answer in chorus, a tenor saxophone comments between the lines. Two-step and bright, never heavy.
// C major (Kit Harmony): I, IV and V.
// Form: guitar introduction · verse (singer, sax answering) · refrain (women's chorus) · interlude (soft:
// A minor, picked guitar and voice, bongos only) · verse · xigubo (tense: drums and claps on G, chorus
// shouting) · lead guitar solo · refrain · final.
// Run: node scripts/africa/maputo-1978.cjs
const { studio, build, reactions, SAMPLE, DRUM, P } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // C major degrees: 0 C · 1 D · 2 E · 3 F · 4 G · 5 A · 6 B.
  root: { C: 0, F: 3, G: 4, Am: -2 },
  names: {
    0: ['C', 'F', 'G', 'C', 'C', 'F', 'G', 'G'], 1: ['C', 'C', 'F', 'F', 'G', 'G', 'C', 'C'], 2: ['F', 'C', 'G', 'C'],
    3: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'G'], 4: ['C', 'F', 'G', 'C'], 5: ['G', 'G', 'F', 'F', 'G', 'G', 'G', 'G'], 6: ['F', 'G', 'C', 'C'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // A skipping two-step: the second sixteenth late, the fourth early (ticks of ~15 ms).
  feel: { push: [0, 1, 0, -1], jitter: 1, vel: .06 },
  colour: { spread: .1, ring: .12 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, bars, figure, riff, from, unroll, finish } = S
const { rep, mel } = C
const R = '................'
const HITS = 'X..X ..X. X.X. .... | X..X ..X. X.X. X.X.'
const END = 'X..X ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- light drum kit, tambourine, bongos, claps ----------
const kick = {
  0: beat(11, enter(6, 'o... .... o... ....')), 1: drum(1, 12, 'x... .... x... ..o.'), 2: drum(2, 13, 'X... ..x. X... ..x. | X... ..x. X..x ..x.'), 4: drum(4, 14, 'X... ..x. X... ..x.'),
  5: drum(5, 15, HITS), 6: beat(16, `X... ..x. X... ..x. | X... ..x. X..x ..x. | ${END}`),
}
const snare = {
  1: drum(1, 21, '.... o... .... o...'), 2: drum(2, 22, '.... x... .... x... | .... x... .... x.,x'), 4: drum(4, 23, '.... x... .... x..o'), 5: drum(5, 24, HITS),
  6: beat(25, `.... x... .... x... | .... x... .... x.xx | ${END}`),
}
const hat = {
  1: drum(1, 31, 'h.g. h.g. h.g. h.gh'), 2: drum(2, 32, 'x.hm x.hm x.hm x.hm'), 4: drum(4, 33, 'x.hm x.hm x.hm x.hm | x.hm x.hm x.hm xmhm'), 5: drum(5, 34, 'x... x... x... x.hm'),
  6: beat(35, `x.hm x.hm x.hm x.hm | x.hm x.hm x.hm xmhm | ${END}`),
}
const tambourine = {
  0: beat(41, enter(2, '..o. ..o. ..o. ..oh')), 1: drum(1, 42, '..o. ..o. ..o. ..oh'), 2: drum(2, 43, '..x. .hx. ..x. .hx.'), 3: drum(3, 44, '..h. .... ..h. ....'),
  4: drum(4, 45, '..x. .hx. ..x. .hx.'), 5: drum(5, 46, 'x.x. x.x. x.x. x.x.'), 6: beat(47, `..x. .hx. ..x. .hx. | ..x. .hx. ..x. .hx. | ${END}`),
}
const bongo = {
  0: beat(51, enter(2, 'o..h ..o. o..h .oo.')), 1: drum(1, 52, 'o..h ..o. o..h .oo. | o..h ..o. o.oh .oo.'), 2: drum(2, 53, 'x..o ..x. x..o .xx. | x..o ..x. x.xo .xxx'),
  3: drum(3, 54, 'h..g ..h. h..g .hh.'), 4: drum(4, 55, 'x.xo ..x. x..o .xx. | .xox .xo. x.x. xoxx'), 5: drum(5, 56, 'x.xx ..x. x.xx ..x. | x.xx ..x. x.xx xxxx'),
  6: beat(57, `x..o ..x. x..o .xx. | x..o ..x. x.xo .xxx | ${END}`),
}
const conga = { 2: drum(2, 61, '.... ..o. .... o.o.'), 4: drum(4, 62, '.... ..o. ..o. o.o.'), 5: drum(5, 63, 'o... o... o... o.oo') }
const shaker = { 1: drum(1, 71, 'g,h. g,h. g,h. g,h.'), 2: drum(2, 72, 'ghmh ghmh ghmh ghmh'), 4: drum(4, 73, 'ghmh ghmh ghmh ghmh'), 6: beat(74, 'ghmh ghmh ghmh ghmh | ghmh ghmh ghmh ghmh | ................ | ................') }
const claps = { 2: drum(2, 81, '.... x... .... x.x.'), 5: drum(5, 82, 'x..x ..x. x.x. .... | x..x ..x. x.x. x.x.'), [FILL]: beat(83, '..x. x.x. x.xx X.X.') }

// ---------- bass and guitars ----------
const STEP = '0:4! 4:2 0:2 4:4 2:2 4:2 | 0:4! 4:2 0:2 4:4 5:2 6:2'
const step = seed => riff(2, seed, STEP, { gate: .7, accent: { strong: .92, beat: .8, off: .72 }, feel: { push: [0, 0, 0, 0], jitter: 0 } })
const bass = {
  0: from(4, unroll(riff(1, 91, '0:8! 4:8', { gate: .8 }), 8)), 1: step(92), 2: step(93), 3: riff(1, 94, '0:8! 4:4 7:4', { gate: .9 }), 4: step(95),
  5: riff(1, 96, '0:3! 0:3 0:2 0:2 0:2 r:4', { gate: .6 }), 6: mel('0:4! 4:2 0:2 4:4 2:2 4:2 | 0:4! 4:2 0:2 4:4 5:2 6:2 | 0:3! 0:3 0:2 0:8 | 0:8!', { gate: .7 }),
}
const CHORD = { C: [0, 2, 4, 7], F: [0, 3, 5, 7], G: [1, 4, 6, 8], Am: [0, 2, 5, 7] }
// "Boom, chick-a": the thumb on the low string, the fingers brushing the chord twice.
const MARRA = figure(CHORD, 'a:2! b,c,d:1 b,c,d:1 a:2 b,c,d:1 b,c,d:1 a:2! b,c,d:1 b,c,d:1 a:2 b,c,d:1 b,c,d:1', 'a:2! b,c,d:1 b,c,d:1 a:2 b,c,d:1 b,c,d:1 a:2! b,c,d:1 b,c,d:1 a:1 b:1 c:1 d:1')
const chick = { gate: .7, accent: { strong: .9, beat: .8, off: .6 } }
const strum = {
  0: bars(0, 101, MARRA, chick), 1: bars(1, 102, MARRA, chick), 2: bars(2, 103, MARRA, chick), 3: comp(CHORD, 3, 'h... .... g... ....', 104, { length: 1 / 4 }), 4: bars(4, 105, MARRA, chick),
  5: comp(CHORD, 5, HITS, 106, { length: 1 / 14 }), 6: C.relative(S.hand(107, C.named(['F', 'G', 'C', 'C'], `X.oh x.oh X.oh x.oh | X.oh x.oh X.oh xhoh | ${END}`, CHORD, { length: 1 / 12 })), H(6)),
}
const HIGH = { C: [7, 9, 11, 14], F: [7, 10, 12, 14], G: [8, 11, 13, 15], Am: [7, 9, 12, 14] }
const pick = { gate: 1.25, accent: { strong: .84, beat: .76, off: .68 } }
const lead = {
  0: from(4, bars(0, 111, figure(HIGH, 'c:2 d:2 c:2 b:2 c:4 a:4', 'b:2 c:2 d:2 c:2 b:4 c:4'), pick)), 1: bars(1, 112, figure(HIGH, 'r:16', 'r:8 b:2 c:2 d:2 c:2'), pick),
  2: bars(2, 113, figure(HIGH, 'c:3 c:1 d:2 c:2 b:3 b:1 c:2 b:2', 'a:3 b:1 c:2 d:2 c:3 b:1 c:4'), pick), 3: bars(3, 114, figure(HIGH, 'a:2 b:2 c:2 b:2 d:2 c:2 b:2 c:2'), { gate: 1.6 }),
  4: tune('11:2 12:2 14:2 12:2 11:3 9:1 7:4 | 12:2 14:2 15:2 14:2 12:3 10:1 12:4 | 13:2 15:2 13:2 11:2 8:2 11:2 13:4 | 11:6 9:2 11:8 | ' +
    '14:3 14:1 12:2 11:2 9:2 11:2 12:2 14:2 | 15:3 14:1 12:2 10:2 12:4 14:4 | 13:2 11:2 13:2 15:2 13:2 11:2 8:4 | 14:8 r:8', 4, 115, { glide: 0, low: .58, high: .9, mel: { gate: 1.2 } }),
  6: tune('12:3 12:1 14:2 12:2 10:3 10:1 12:2 10:2 | 13:3 11:1 13:2 15:2 13:3 11:1 8:4 | 14:3 14:3 11:2 16:8 | 14:8 r:8', 6, 116, { glide: 0, low: .6, high: .9, mel: { gate: 1.2 } }),
}

// ---------- voices and saxophone ----------
const CANTO = '9:2 9:2 11:2 9:2 7:4 9:4 | 11:6~ 9:2 7:8 | 10:2 10:2 12:2 10:2 8:4 10:4 | 12:6~ 10:2 8:8 | 11:2 11:2 13:2 11:2 8:4 11:4 | 13:6~ 11:2 8:8 | 9:2 9:2 11:2 9:2 7:4 8:4 | 7:8~ r:8'
const REFRAO = rep('12:3 12:3 10:2 12:4 14:4 | 11:3 11:3 9:2 11:8~ | 13:3 13:3 11:2 13:4 15:4 | 14:8~ r:8', 2)
const GRITO = 'r:8 11:2 11:2 13:4 | r:16 | r:8 10:2 10:2 12:4 | r:16 | r:8 11:2 11:2 13:4 | r:16 | 11:2 11:2 13:2 13:2 11:2 11:2 15:4 | 15:8~ r:8'
const LAMENTO = '12:6~ 11:2 9:8~ | 10:6~ 8:2 7:4 5:4 | 9:6~ 11:2 14:8~ | 13:12~ r:4 | 12:6~ 14:2 16:8~ | 14:6~ 12:2 10:4 8:4 | 11:6~ 13:2 11:4 8:4 | 8:12~ r:4'
const FIM = '12:3 12:3 10:2 12:4 14:4 | 13:3 13:3 11:2 13:4 15:4 | 14:3 14:3 11:2 14:8~ | r:16'
const voz = { 1: tune(CANTO, 1, 121, { low: .56, high: .86 }), 3: tune(LAMENTO, 3, 122, { low: .42, high: .7, jitter: 2, glide: 3 }), 6: tune(FIM, 6, 123, { low: .6, high: .9 }) }
const coro = { 2: tune(REFRAO, 2, 131, { low: .6, high: .9 }), 5: tune(GRITO, 5, 132, { low: .7, high: .94 }), 6: tune(FIM, 6, 133, { low: .62, high: .92 }) }
const coro2 = { 2: harmony(REFRAO, 2, 141, { low: .56, high: .86 }), 5: harmony(GRITO, 5, 142, { low: .66, high: .9 }), 6: harmony(FIM, 6, 143, { low: .58, high: .88 }) }
const sax = {
  1: tune('r:16 | r:8 9:2 11:2 14:4 | r:16 | r:8 12:2 10:2 8:4 | r:16 | r:8 11:2 13:2 15:4 | r:16 | r:8 11:2 9:2 7:4', 1, 151, { low: .5, high: .74, glide: 0 }),
  2: tune('r:16 | r:12 9:2 11:2 | r:16 | r:8 14:2 13:2 11:4 | r:16 | r:12 9:2 11:2 | r:16 | r:8 11:2 13:2 14:4', 2, 152, { low: .5, high: .74, glide: 0 }),
  5: tune('11:3 11:3 11:2 13:4 r:4 | 11:3 11:3 13:2 15:4 r:4 | 10:3 10:3 10:2 12:4 r:4 | 10:3 10:3 12:2 14:4 r:4 | 11:3 11:3 11:2 13:4 r:4 | 11:3 11:3 13:2 15:4 r:4 | r:16 | 15:8~ r:8', 5, 153, { low: .66, high: .9, glide: 0 }),
}

const TUNED = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = finish([
  P('a1', 'Baixo', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { ...TUNED, octave: 2, gain: .43, attack: .005, decay: .4, sustain: .4, release: .14, clip: 1, lpf: 1700, hpf: 35, effects: { reverb: .05, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Bombo', 'rhythm', 'pulse', DRUM('percussion', 'kick'), kick, on(...ALL),
    { ...DRUMS, octave: 2, gain: .33, attack: .001, decay: .28, sustain: 0, release: .14, clip: 1, lpf: 3600, hpf: 30, effects: { reverb: .05, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Viola · solo', 'melody', 'phrase', SAMPLE('guitars', 'clean'), lead, on(...ALL),
    { ...TUNED, octave: 3, gain: 1, attack: .003, decay: .4, sustain: .25, release: .16, clip: 1, lpf: 6000, hpf: 240, effects: { reverb: .16, pan: .25 }, design: { role: 'lead' } }),
  P('b2', 'Caixa · vassoura', 'rhythm', 'pulse', DRUM('drums', 'brush'), snare, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .4, attack: .001, decay: .14, sustain: 0, release: .08, clip: .7, lpf: 6000, hpf: 180, effects: { reverb: .1, pan: .05 } }),
  P('c1', 'Viola · marrabenta', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), strum, on(...ALL),
    { ...TUNED, octave: 3, gain: .2, attack: .003, decay: .4, sustain: .15, release: .14, clip: 1, lpf: 5000, hpf: 130, effects: { reverb: .12, pan: -.3 } }),
  P('c2', 'Prato', 'rhythm', 'pulse', DRUM('percussion', 'hat'), hat, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .9, attack: .001, decay: .12, sustain: 0, release: .05, clip: .7, lpf: 8000, hpf: 2200, effects: { reverb: .04, pan: -.2 } }),
  P('d1', 'Cantor', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), voz, on(1, 3, 4, 8),
    { ...TUNED, octave: 3, gain: .4, attack: .04, decay: .4, sustain: .78, release: .22, clip: 1, lpf: 5400, hpf: 160, effects: { reverb: .22, pan: 0 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .09 } }),
  P('d2', 'Pandeireta', 'rhythm', 'pulse', DRUM('percussion', 'tambourine'), tambourine, on(...ALL),
    { ...DRUMS, octave: 2, gain: .9, attack: .001, decay: .1, sustain: 0, release: .06, clip: .7, lpf: 7000, hpf: 1500, effects: { reverb: .08, pan: .3 } }),
  P('e1', 'Coro das mulheres', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), coro, on(2, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .36, attack: .05, decay: .4, sustain: .78, release: .24, clip: 1, lpf: 6000, hpf: 200, effects: { reverb: .26, pan: .14 }, design: { role: 'lead' } }),
  P('e2', 'Bongós', 'rhythm', 'pulse', DRUM('percussion', 'bongo'), bongo, on(...ALL),
    { ...DRUMS, octave: 2, gain: .48, attack: .001, decay: .14, sustain: 0, release: .08, clip: .7, lpf: 6000, hpf: 200, effects: { reverb: .08, pan: -.2 } }),
  P('f1', 'Coro · segunda voz', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), coro2, on(2, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .26, attack: .05, decay: .4, sustain: .76, release: .24, clip: 1, lpf: 5200, hpf: 180, effects: { reverb: .26, pan: -.14 } }),
  P('f2', 'Chocalho', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), shaker, on(1, 2, 4, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .08, sustain: 0, release: .05, clip: .5, lpf: 7000, hpf: 2200, effects: { reverb: .05, pan: .34 } }),
  P('g1', 'Saxofone tenor', 'response', 'phrase', SAMPLE('band', 'tenor-sax', 1), sax, on(1, 2, 4, 5, 7),
    { ...TUNED, octave: 3, gain: .34, attack: .014, decay: .3, sustain: .66, release: .14, clip: 1, lpf: 5600, hpf: 120, effects: { reverb: .2, pan: -.12 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .06 } }),
  P('g2', 'Conga', 'rhythm', 'pulse', DRUM('percussion', 'conga'), conga, on(2, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .36, attack: .001, decay: .2, sustain: 0, release: .12, clip: .8, lpf: 4800, hpf: 110, effects: { reverb: .08, pan: .18 } }),
  P('h1', 'Viola · baixos', 'harmony', 'phrase', SAMPLE('guitars', 'muted'), { 2: riff(1, 161, '7:2 r:2 11:2 9:2 7:2 r:2 9:2 11:2', { gate: .6 }), 4: riff(1, 162, '7:2 r:2 11:2 9:2 7:2 r:2 9:2 11:2', { gate: .6 }), 5: riff(1, 163, '7:3 7:3 7:2 7:2 7:2 r:4', { gate: .6 }) }, on(2, 5, 6, 7),
    { ...TUNED, octave: 2, gain: .42, attack: .003, decay: .25, sustain: .15, release: .1, clip: .9, lpf: 3600, hpf: 150, effects: { reverb: .1, pan: .35 } }),
  P('h2', 'Palmas', 'rhythm', 'pulse', DRUM('drums', 'room-clap'), claps, on(2, 5, 7),
    { ...DRUMS, octave: 2, gain: .38, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 6000, hpf: 400, effects: { reverb: .16, pan: .1 } }),
], {
  fills: { 1: FILL, 4: FILL, 6: FILL },
  params: {
    a1: { 3: { gain: .34 } }, c1: { 0: { gain: .3 }, 3: { gain: .16, reverbRange: { first: .2, second: .26 } } }, e2: { 3: { gain: .12 } }, d2: { 3: { gain: .07 } },
    b1: { 3: { gain: .24, reverbRange: { first: .24, second: .3 } }, 6: { gain: .36 } }, d1: { 3: { reverbRange: { first: .32, second: .38 } } }, a2: { 5: { gain: .36 } },
  },
})

build({
  id: 'maputo-1978', kitName: 'Marrabenta', profileName: 'Maputo 1978 · Marrabenta', meter: '4/4', bpm: 124, root: 'C', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('mrb', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Marrabenta de Maputo (Fany Mpfumo, Dilon Djindji, Orchestra Marrabenta Star de Moçambique): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Marrabenta',
}).catch(error => { console.error(error); process.exit(1) })
