// 1980 Amritsar - Bhangra (original material).
// A harvest-fair troupe: the tumbi's one string starts the tune alone, the chimta's jingles join, and the
// dhol comes in with the chaal, the swung beat whose low side answers its own treble stick. The singer
// throws out short couplets (boliyan) and the troupe shouts back; the chorus is sung by everyone over
// claps; the sarangi takes the slow passage, the dhol has its solo, and the algoza (double flute) plays over
// the dancers.
// G Mixolydian (Kit Harmony): G · F · C.
// Form: tumbi, chimta, then the dhol · verse (boliyan) · chorus · interlude (soft: sarangi and harmonium) ·
// verse · break (tense: dhol solo and shouts) · algoza solo · chorus · final.
// Run: node scripts/world/amritsar-1980.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Mixolídia', {
  // G Mixolydian degrees: 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F.
  root: { G: 0, F: -1, C: 3 },
  names: {
    0: ['G'], 1: ['G', 'G', 'F', 'G', 'G', 'G', 'F', 'G'], 2: ['G', 'F', 'C', 'G'],
    3: ['G', 'G', 'F', 'F', 'C', 'C', 'G', 'G'], 4: ['G', 'F', 'G', 'F'], 5: ['G'], 6: ['G', 'F', 'G', 'G'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // The off-beats sit on the last sixteenth, pulled back towards the triplet: the bhangra shuffle.
  feel: { push: [0, 0, 0, -2], jitter: 1, vel: .08 },
  colour: { spread: .12, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const END = 'X..X X..X X... X... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- dhol (dagga and tilli), dholki, chimta, claps ----------
// Chaal: dha na na na · na dha dha na. The low side plays the three "dha".
const dagga = {
  0: beat(11, enter(6, 'x... .... ...h x...')), 1: drum(1, 12, 'X... .... ...x X...'), 2: drum(2, 13, 'X... .... ...x X... | X... ...x X..x X...'), 3: drum(3, 14, 'h... .... .... h...'),
  4: drum(4, 15, 'X... .... ...x X...'), 5: drum(5, 16, 'X..X X..X X... .... | X..X X..X X..X X... | X... .... X... .... | X..X X..X XXXX X...'),
  6: beat(17, `X... .... ...x X... | X... ...x X..x X... | ${END}`),
}
const tilli = {
  0: beat(21, enter(4, 'h..h h..h h..h h..h')), 1: drum(1, 22, 'X..x x..x x..X X..x'), 2: drum(2, 23, 'X..x x..x x..X X..x | X..x xx.x x..X X.xx'), 3: drum(3, 24, 'h... h..h h... h..h'),
  4: drum(4, 25, 'X..x x..x x..X X..x'), 5: drum(5, 26, '...x ...x .xxX .... | ...x ...x ...x .xxX | xxxX xxxX xxxX xxxX | ...x ...x .... X...'),
  6: beat(27, `X..x x..x x..X X..x | X..x xx.x x..X X.xx | ${END}`),
}
const dholki = { 1: drum(1, 31, 'X... ...x X... ....'), 2: drum(2, 32, 'X... ...x X... ...x'), 3: drum(3, 33, 'h... .... h... ....'), 4: drum(4, 34, 'X... ...x X... ....'), 6: beat(35, 'X... ...x X... ...x | X... ...x X... ...x') }
const thap = { 1: drum(1, 41, '...g x..g ...g x..x'), 2: drum(2, 42, '...x x..g ...x x..g'), 3: drum(3, 43, '.... h... .... h..g'), 4: drum(4, 44, '...g x..g ...g x..x'), 6: beat(45, '...x x..g ...x x..g | ...x x..g ...x x..g') }
const chimta = {
  0: beat(51, enter(2, 'x..h x..h x..h x..h')), 1: drum(1, 52, 'x..h x..h x..h x..h'), 2: drum(2, 53, 'X..x X..x X..x X..x'), 3: drum(3, 54, 'o... .... o... ....'),
  4: drum(4, 55, 'x..h x..h x..h x..h'), 5: drum(5, 56, `${rep(R, 2)} | X... .... X... .... | X..x X..x X..x X...`), 6: beat(57, `X..x X..x X..x X..x | X..x X..x X..x X..x | ${END}`),
}
const taali = { 2: drum(2, 61, 'x... x... x... x...'), 5: drum(5, 62, `${rep(R, 2)} | x... x... x... x... | x... x... x..x x...`), 6: beat(63, `x... x... x... x... | x... x... x... x... | ${END}`) }
const hoi = {
  0: beat(71, `${rep(R, 7)} | .... .... X... ....`), 1: drum(1, 72, `${R} | .... .... X... .... | ${R} | .... .... X... X...`), 2: drum(2, 73, `${rep(R, 3)} | .... .... X... X...`),
  5: drum(5, 74, `${R} | .... .... .... X... | X... .... X... .... | .... .... .... X...`), 6: beat(75, `${rep(R, 2)} | .... .... .... X... | X... .... .... ....`),
}
const tod = { [FILL]: beat(81, '.... .... X..x XxXX') }

// ---------- bass, tumbi, harmonium ----------
const bass = {
  1: riff(1, 101, '0:3! r:8 0:1 0:3 4:1', { gate: .8 }), 2: riff(2, 102, '0:3! r:4 0:1 4:3 0:1 0:3 4:1 | 0:3! r:4 0:1 4:3 0:1 7:3 4:1', { gate: .8 }), 3: riff(1, 103, '0:8 r:4 0:4', { gate: .96, accent: { strong: .6, beat: .56, off: .5 } }),
  4: riff(1, 104, '0:3! r:8 0:1 0:3 4:1', { gate: .8 }), 6: mel('0:3! r:4 0:1 4:3 0:1 0:3 4:1 | 0:3! r:4 0:1 4:3 0:1 7:3 4:1 | 0:3! 0:1 0:3 0:1 0:4 0:4 | 0:8!', { gate: .9 }),
}
// The tumbi: one high string, a figure that never leaves the tonic for long.
const TING = '7:3 7:1 9:3 7:1 6:3 7:1 r:3 7:1 | 9:3 9:1 10:3 9:1 7:3 6:1 7:4'
const TING2 = '7:3 7:1 9:3 7:1 11:3 9:1 7:3 6:1 | 7:3 7:1 r:3 7:1 9:3 7:1 7:4'
const pluck = { glide: 0, jitter: 1, low: .6, high: .92 }
const tumbi = {
  0: tune(C.tile(TING, 4), 0, 111, pluck), 1: tune(C.tile(TING, 4), 1, 112, { ...pluck, low: .5, high: .76 }), 2: tune(C.tile(TING2, 4), 2, 113, pluck),
  4: tune(C.tile(TING, 4), 4, 114, { ...pluck, low: .5, high: .76 }), 6: tune(`${TING2} | 7:3! 7:1 7:3 7:1 7:4 7:4 | 7:8!`, 6, 115, pluck),
}
// G [G B D] · F [F A C] · C [G C E]
const CHORD = { G: [7, 9, 11], F: [6, 8, 10], C: [7, 10, 12] }
const harmonium = {
  1: comp(CHORD, 1, 'o... .... .... ....', 121, { length: .94 }), 2: comp(CHORD, 2, 'x..x ...x x... ....', 122, { length: 1 / 6 }), 3: comp(CHORD, 3, 'o... .... .... ....', 123, { length: .96 }),
  4: comp(CHORD, 4, 'x..x ...x x... ....', 124, { length: 1 / 6 }),
  6: relative(S.hand(125, C.named(['G', 'F', 'G', 'G'], `x..x ...x x... .... | x..x ...x x... .... | ${END}`, CHORD, { length: 1 / 6 })), H(6)),
}

// ---------- singer, troupe, algoza, sarangi, bulbul tarang ----------
const BOLI = 'r:4 7:3 7:1 9:3 9:1 11:3 9:1 | 10:3 9:1 7:4~ r:8 | r:4 6:3 6:1 8:3 8:1 10:3 8:1 | 9:3 8:1 7:4~ r:8 | r:4 11:3 11:1 11:3 9:1 10:3 11:1 | 12:3 11:1 9:4~ r:8 | r:4 10:3 10:1 8:3 8:1 6:3 8:1 | 9:3 8:1 7:8~ r:4'
const CORO = '11:3 11:1 11:3 9:1 11:4 r:4 | 10:3 10:1 10:3 8:1 10:4 r:4 | 10:3 10:1 12:3 10:1 9:3 10:1 9:3 8:1 | 7:8~ r:8 | 11:3 11:1 11:3 9:1 11:4 r:4 | 10:3 10:1 10:3 8:1 10:4 r:4 | 10:3 10:1 12:3 10:1 9:3 10:1 9:3 8:1 | 7:8~ r:8'
const CALLS = 'r:8 4:3 5:1 7:4 | r:16 | r:8 6:3 5:1 4:4 | r:16 | r:8 4:3 5:1 7:3 9:1 | 8:4 7:4 r:8 | r:16 | r:8 2:3 4:1 5:3 6:1'
const ALGOZA = '0:3 2:1 4:3 2:1 4:3 5:1 4:4~ | 3:3 5:1 6:3 5:1 3:3 1:1 3:4~ | 4:3 5:1 7:3 5:1 4:3 2:1 4:3 5:1 | 6:3 5:1 3:3 1:1 3:8~ | 7:3 7:1 9:3 7:1 6:3 7:1 4:4~ | 6:3 5:1 3:3 5:1 6:6~ r:2 | 7:3 5:1 4:3 2:1 4:3 5:1 7:3 9:1 | 8:3 6:1 5:3 3:1 6:8~'
const SARANGI = '4:8~ 5:4 4:4 | 2:12~ r:4 | 3:8~ 5:4 3:4 | 1:12~ r:4 | 3:8~ 5:4 7:4 | 5:12~ r:4 | 4:8~ 2:4 1:4 | 0:12~ r:4'
const FINAL = '11:3 11:1 11:3 9:1 11:4 r:4 | 10:3 10:1 10:3 8:1 10:4 r:4 | 11:3! 11:1 11:3 11:1 11:4 11:4 | 14:8!'
const sung = { low: .58, high: .9, glide: 3, jitter: 2 }, reed = { glide: 2, low: .56, high: .88, jitter: 1 }
const voz = { 1: tune(BOLI, 1, 141, sung), 2: tune(CORO, 2, 142, { ...sung, low: .64, high: .94 }) }
const toli = { 2: tune(CORO, 2, 151, sung), 6: tune(FINAL, 6, 152, sung) }
const algoza = { 0: from(4, tune(`${rep('r:16', 4)} | 0:3 2:1 4:3 2:1 4:8~ | 6:3 5:1 3:3 1:1 3:8~ | 4:3 5:1 7:3 5:1 4:3 2:1 4:4 | 0:12~ r:4`, 0, 161, reed)), 1: tune(CALLS, 1, 162, { ...reed, low: .46, high: .7 }), 4: tune(ALGOZA, 4, 163, reed) }
const sarangi = { 3: tune(SARANGI, 3, 171, { glide: 5, low: .46, high: .72, jitter: 2 }) }
const bulbul = { 2: tune(CORO, 2, 181, { glide: 0, low: .56, high: .82 }), 6: tune(FINAL, 6, 182, { glide: 0, low: .6, high: .9 }) }

const PARTS = finish([
  Q('a1', 'Bass', 'bass', 'phrase', V.bass({ gain: .36, octave: 1, panWidth: .1 }), bass, on(1, 2, 3, 4, 6, 7, 8)),
  Q('a2', 'Dhol · dagga', 'rhythm', 'pulse', V.zabumba({ gain: .26, pan: 0, panWidth: 0 }), dagga, on(...ALL)),
  Q('b1', 'Tumbi', 'melody', 'phrase', V.steel({ gain: .5, octave: 3, lpf: 7000, hpf: 300, decay: .25, release: .1, pan: -.24 }), tumbi, on(0, 1, 2, 4, 6, 7, 8)),
  Q('b2', 'Dhol · tilli', 'rhythm', 'pulse', V.repique({ gain: .24, pan: .06 }), tilli, on(...ALL)),
  Q('c1', 'Harmonium', 'harmony', 'sustain', V.accordion({ gain: .07, octave: 2, pan: .26 }), harmonium, on(1, 2, 3, 4, 6, 7, 8)),
  Q('c2', 'Chimta', 'rhythm', 'pulse', V.tambourine({ gain: .9, pan: .3 }), chimta, on(...ALL)),
  Q('d1', 'Gayak', 'melody', 'sustain', V.voice({ gain: .36, octave: 2, pan: 0 }), voz, on(1, 2, 4, 7)),
  Q('d2', 'Dholki', 'rhythm', 'pulse', V.conga({ gain: .32, lpf: 3000, pan: -.2 }), dholki, on(1, 2, 3, 4, 6, 7, 8)),
  Q('e1', 'Toli', 'response', 'sustain', V.voice({ gain: .28, octave: 2, pan: .2 }), toli, on(2, 7, 8)),
  Q('e2', 'Taali', 'rhythm', 'pulse', V.palmas({ gain: .3, pan: -.1 }), taali, on(2, 5, 7, 8)),
  Q('f1', 'Algoza', 'response', 'sustain', V.recorder({ gain: .36, pan: .14 }), algoza, on(0, 1, 4, 6)),
  Q('f2', 'Dholki · thap', 'rhythm', 'pulse', V.slap({ gain: .34, pan: -.24 }), thap, on(1, 2, 3, 4, 6, 7, 8)),
  Q('g1', 'Sarangi', 'response', 'sustain', V.violin({ gain: .9, octave: 3, lpf: 4200, pan: -.12, reverb: .22 }), sarangi, on(3)),
  Q('g2', 'Hoi!', 'response', 'pulse', V.hey({ gain: .18, pan: .2, reverb: .16 }), hoi, on(0, 1, 2, 4, 5, 7, 8)),
  Q('h1', 'Bulbul tarang', 'response', 'phrase', V.bandolim({ gain: .5, octave: 3, pan: .3 }), bulbul, on(2, 7, 8)),
  Q('h2', 'Dhol · tod', 'rhythm', 'pulse', V.zabumba({ gain: .26, decay: .2, hpf: 80, pan: 0 }), tod, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .38 } }, a2: { 0: { gain: .24 }, 3: { gain: .2 } }, b2: { 0: { gain: .16 }, 3: { gain: .14 } }, c2: { 0: { gain: .7 }, 3: { gain: .6 } },
    b1: { 0: { gain: .6 } }, c1: { 3: { gain: .09 } },
  },
})
build({
  id: 'amritsar-1980', kitName: 'Bhangra', profileName: 'Amritsar 1980 · Bhangra', meter: '4/4', bpm: 96, root: 'G', scale: 'Mixolídia',
  form: FORM, parts: PARTS,
  reactions: reactions('bhg', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Bhangra do Punjab (dhol com o toque chaal, tumbi, algoza, boliyan; grupos de festa da colheita e gravações dos anos 1970–80): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Bhangra_(music)',
}).catch(error => { console.error(error); process.exit(1) })
