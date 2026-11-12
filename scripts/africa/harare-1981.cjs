// 1981 Harare - Chimurenga (original material).
// The mbira carried to the electric band: the mbira (marimba) states the cycle alone with the hosho, a second
// mbira weaves into its gaps, and the damped guitars copy both before bass and kit arrive. Everything turns
// in twelve: the hosho swings each beat as "ka-cha-ka", the kick keeps the four beats, the hi-hat the triplets.
// The singer's lines fall from high to low as mbira songs do; the women answer; the saxophone comments.
// G major (Kit Harmony): G · Em · C · D, the four-bar cycle.
// Form: mbira alone, then the band one by one · verse · chorus · interlude (soft: mbiras, hosho and voice) ·
// verse · hosho and drums (tense: band hits over the cycle) · guitar solo · chorus · final.
// Run: node scripts/africa/harare-1981.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('12/8', 'Maior', {
  // G major degrees: 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F#.
  root: { G: 0, Em: -2, C: -4, D: -3 },
  names: {
    0: ['G', 'Em', 'C', 'D'], 1: ['G', 'Em', 'C', 'D'], 2: ['G', 'C', 'G', 'D', 'G', 'C', 'Em', 'D'],
    3: ['Em', 'C', 'Em', 'D'], 4: ['G', 'Em', 'C', 'D'], 5: ['C', 'C', 'D', 'D', 'C', 'C', 'D', 'D'], 6: ['G', 'C', 'D', 'G'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .08 },
  colour: { spread: .12, ring: .2 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '... ... ... ...'
const HITS = 'X.. X.. ..X ... | X.. X.. ..X .X.'
const END = 'X.. X.. X.x X.. | X.. ... ... ...'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- hosho, hand drum, claps and kit ----------
const HOSHO = 'Xgm Xgm Xgm Xgm'
const hosho = {
  0: beat(11, enter(2, 'ogh ogh ogh ogh')), 1: drum(1, 12, 'xgm xgm xgm xgm'), 2: drum(2, 13, HOSHO), 3: drum(3, 14, 'ogh ogh ogh ogh'),
  4: drum(4, 15, HOSHO), 5: drum(5, 16, 'XgX XgX XgX XgX'), 6: beat(17, `${HOSHO} | ${HOSHO} | ${END}`),
}
// The second hosho swishes on the middle of each beat.
const swish = { 2: drum(2, 21, '.h. .h. .h. .h.'), 4: drum(4, 22, '.h. .h. .h. .h.'), 5: drum(5, 23, '.m. .m. .m. .m.'), 6: beat(24, `.h. .h. .h. .h. | .h. .h. .h. .h. | ${END}`) }
const NGOMA = 'x.h x.. x.h .x. | x.h x.. x.h xx.'
const ngoma = {
  0: beat(31, enter(4, 'o.g o.. o.g .o.')), 1: drum(1, 32, 'x.h x.. x.h .x.'), 2: drum(2, 33, NGOMA), 3: drum(3, 34, 'o.. ... o.g ...'),
  4: drum(4, 35, NGOMA), 5: drum(5, 36, 'X.x x.X x.x X.x | X.x x.X xXx XxX'), 6: beat(37, `${NGOMA} | ${END}`),
}
// Makwa: the hand claps of the mbira gathering.
const MAKWA = 'x.x x.. x.x x..'
const claps = { 2: drum(2, 41, MAKWA), 3: drum(3, 42, 'h.. h.. h.. h..'), 5: drum(5, 43, 'X.X X.. X.X X..'), 6: beat(44, `${MAKWA} | ${MAKWA} | ${END}`) }
const kick = {
  0: beat(51, enter(6, 'X.. x.. X.. x..')), 1: drum(1, 52, 'X.. x.. X.. x.. | X.. x.. X.. x.x'), 2: drum(2, 53, 'X.. X.. X.. X.. | X.. X.. X.. X.x'),
  3: drum(3, 54, 'o.. ... ... ...'), 4: drum(4, 55, 'X.. X.. X.. X..'), 5: drum(5, 56, HITS), 6: beat(57, `X.. X.. X.. X.. | X.. X.. X.. X.x | ${END}`),
}
const snare = {
  1: drum(1, 61, '... ... x.. ...'), 2: drum(2, 62, '... x.. ... x.. | ... x.. ... x.x'), 4: drum(4, 63, '... x.. ... x..'), 5: drum(5, 64, HITS),
  6: beat(65, `... x.. ... x.. | ... x.. ... x.x | ${END}`),
}
const hat = {
  0: beat(71, enter(6, 'xhm xhm xhm xhm')), 1: drum(1, 72, 'xhm xhm xhm xhm | xhm x,m xhm xhx'), 2: drum(2, 73, 'xmx xmx xmx xmx'), 4: drum(4, 74, 'xmx xmx xmx xmx'),
  6: beat(75, `xmx xmx xmx xmx | xmx xmx xmx xmx | ${END}`),
}
const toms = { [FILL]: beat(81, 'x.o x.o xmx XXx') }

// ---------- the two mbiras, the two guitars and the bass: cycles written on the chord ----------
// Kushaura (leading part): the right-hand notes fall where the left hand rests.
const KUSHAURA = '0:1 7:1 4:1 2:1 9:1 4:1 0:1 7:1 4:1 2:1 9:1 7:1 | 0:1 7:1 4:1 2:1 9:1 4:1 0:1 11:1 9:1 7:1 9:1 4:1'
const kushaura = (seed, options) => riff(2, seed, KUSHAURA, { gate: .9, accent: { strong: .84, beat: .76, off: .6 }, ...options })
const mbira = {
  0: unroll(kushaura(101), 8), 1: kushaura(102, { accent: { strong: .74, beat: .66, off: .54 } }), 2: kushaura(103), 3: kushaura(104, { accent: { strong: .64, beat: .56, off: .46 } }),
  4: kushaura(105, { accent: { strong: .7, beat: .62, off: .5 } }), 5: kushaura(106), 6: unroll(kushaura(107), 2),
}
// Kutsinhira (following part): the same shape one pulse later.
const KUTSINHIRA = 'r:1 4:1 7:1 r:1 2:1 9:1 r:1 4:1 7:1 r:1 4:1 9:1 | r:1 4:1 7:1 r:1 2:1 9:1 r:1 7:1 11:1 r:1 7:1 9:1'
const kutsinhira = (seed, options) => riff(2, seed, KUTSINHIRA, { gate: .9, accent: { strong: .7, beat: .7, off: .6 }, ...options })
const second = {
  0: from(4, unroll(kutsinhira(111), 8)), 2: kutsinhira(112), 3: kutsinhira(113, { accent: { strong: .56, beat: .56, off: .46 } }), 4: kutsinhira(114), 5: kutsinhira(115), 6: unroll(kutsinhira(116), 2),
}
// The lead guitar is damped and plays the high mbira line.
const HIGH = '7:1 r:1 9:1 11:1 r:1 9:1 7:1 r:1 9:1 11:1 9:1 7:1 | 7:1 r:1 9:1 11:1 r:1 14:1 11:1 r:1 9:1 11:1 9:1 7:1'
const high = (seed, options) => riff(2, seed, HIGH, { gate: .55, accent: { strong: .8, beat: .74, off: .64 }, ...options })
const SOLO = '11:1 9:1 7:1 9:1 11:1 14:1 11:1 9:1 7:1 9:1 7:1 4:1 | 9:1 7:1 5:1 7:1 9:1 12:1 9:1 7:1 5:1 7:1 5:1 2:1 | 10:1 8:1 7:1 8:1 10:1 12:1 14:2 12:1 10:1 8:1 7:1 | 8:1 9:1 11:1 13:2 11:1 9:1 8:1 6:1 8:3~ '
  + '| 14:2 14:1 16:2 14:1 11:2 14:1 16:2 14:1 | 12:1 11:1 9:1 11:1 12:1 14:1 12:1 11:1 9:1 7:1 9:1 11:1 | 10:1 12:1 14:1 15:2 14:1 12:1 10:1 8:1 10:1 12:1 10:1 | 8:1 9:1 11:1 13:3~ 11:1 9:1 8:1 11:3~'
const lead = {
  0: from(4, unroll(high(121), 8)), 1: high(122, { accent: { strong: .68, beat: .62, off: .54 } }), 2: high(123), 4: tune(SOLO, 4, 124, { low: .6, high: .94, glide: 0, jitter: 1, mel: { gate: .8 } }),
  5: riff(2, 125, '7:1! r:2 7:1 r:2 r:2 9:1 r:3 | 7:1! r:2 7:1 r:2 r:2 9:1 r:1 11:1 r:1', { gate: .6 }), 6: unroll(high(126), 2),
}
// The rhythm guitar doubles the mbira's bass notes, damped.
const LOW = '0:1 r:1 4:1 2:1 r:1 4:1 0:1 r:1 4:1 2:1 4:1 r:1'
const rhythm = {
  0: from(4, unroll(riff(1, 131, LOW, { gate: .5 }), 8)), 1: riff(1, 132, LOW, { gate: .5 }), 2: riff(1, 133, '0:1 4:1 7:1 2:1 4:1 7:1 0:1 4:1 7:1 2:1 4:1 7:1', { gate: .5 }),
  4: riff(1, 134, LOW, { gate: .5 }), 5: riff(2, 135, '0:1! r:2 0:1 r:2 r:2 4:1 r:3 | 0:1! r:2 0:1 r:2 r:2 4:1 r:1 4:1 r:1', { gate: .5 }), 6: unroll(riff(1, 136, LOW, { gate: .5 }), 2),
}
const BASS = '0:2! 0:1 4:2 4:1 7:2 4:1 2:2 4:1 | 0:2! 0:1 4:2 4:1 7:2 5:1 4:2 2:1'
const bassRiff = seed => riff(2, seed, BASS, { gate: .76, accent: { strong: .94, beat: .82, off: .72 }, feel: { jitter: 0 } })
const bass = {
  0: from(6, unroll(bassRiff(141), 8)), 1: riff(2, 142, '0:3! r:3 4:2 4:1 2:2 4:1 | 0:3! r:3 7:2 5:1 4:2 2:1', { gate: .76 }), 2: bassRiff(143),
  3: riff(2, 144, '0:6! 4:6 | 0:6! 4:3 2:3', { gate: .92 }), 4: bassRiff(145), 5: riff(2, 146, '0:2! r:1 0:2 r:1 r:2 0:1 r:3 | 0:2! r:1 0:2 r:1 r:2 0:1 r:1 0:1 r:1', { gate: .6 }),
  6: mel('0:2! 0:1 4:2 4:1 7:2 4:1 2:2 4:1 | 0:2! 0:1 4:2 4:1 7:2 5:1 4:2 2:1 | 0:2! r:1 0:2 r:1 0:2 0:1 0:3 | 0:6!', { gate: .76 }),
}

// ---------- voices and saxophone (twelve eighths a bar) ----------
const VERSE = 'r:3 9:2 9:1 7:2 7:1 5:2 4:1 | 5:2 4:1 2:6~ r:3 | r:3 7:2 7:1 5:2 5:1 3:2 2:1 | 4:2 2:1 1:6~ r:3 '
  + '| r:3 11:2 11:1 9:2 9:1 7:2 5:1 | 7:2 5:1 4:6~ r:3 | r:3 7:2 7:1 5:2 3:1 5:2 7:1 | 6:2 4:1 4:6~ r:3'
const CHORUS = '7:3 7:2 9:1 7:3 4:3 | 5:3 5:2 7:1 5:6~ | 7:3 7:2 9:1 11:3 9:3 | 8:6~ r:6 | 7:3 7:2 9:1 7:3 4:3 | 5:3 5:2 7:1 5:6~ | 7:3 9:3 7:3 5:3 | 6:9~ r:3'
const CALM = '9:6~ 7:3 5:3 | 7:9~ r:3 | 9:6~ 11:3 9:3 | 8:9~ r:3 | 9:6~ 7:3 5:3 | 7:9~ r:3 | 7:6~ 9:3 7:3 | 6:9~ r:3'
const ANSWER = 'r:12 | r:6 9:1 11:1 9:1 7:3 | r:12 | r:6 8:1 10:1 8:1 6:3 | r:12 | r:6 9:1 11:1 9:1 11:3 | r:12 | r:6 8:1 10:1 8:1 6:3'
const CALLS = 'r:12 | r:12 | r:12 | r:6 8:1 10:1 11:1 13:3 | r:12 | r:12 | r:12 | r:6 10:1 8:1 6:1 8:3'
const STABS = '7:1! r:2 7:1 r:2 r:2 9:1 r:3 | 7:1! r:2 7:1 r:2 r:2 9:1 r:1 10:1 r:1 | 8:1! r:2 8:1 r:2 r:2 10:1 r:3 | 8:1! r:2 8:1 r:2 r:2 10:1 r:1 11:1 r:1 '
  + '| 7:1! r:2 7:1 r:2 r:2 9:1 r:3 | 7:1! r:2 7:1 r:2 r:2 9:1 r:1 10:1 r:1 | 8:1! r:2 8:1 r:2 r:2 10:1 r:3 | 8:3! 10:3 11:3 13:3'
const FINAL = '7:3 7:2 9:1 7:3 4:3 | 5:3 5:2 7:1 5:6~ | 8:2! r:1 8:2 r:1 8:2 8:1 8:3 | 7:9~ r:3'
const sung = { low: .56, high: .88, glide: 4 }, reed = { glide: 0, low: .62, high: .92 }
const voz = { 1: tune(VERSE, 1, 151, sung), 2: tune(CHORUS, 2, 152, sung), 3: tune(CALM, 3, 153, { low: .42, high: .64, jitter: 2 }), 6: tune(FINAL, 6, 154, sung) }
const coro = { 2: harmony(CHORUS, 2, 161, sung), 3: harmony(CALM, 3, 162, { low: .36, high: .56, jitter: 2 }), 6: harmony(FINAL, 6, 163, sung) }
const sax = { 1: tune(ANSWER, 1, 171, reed), 2: tune(CALLS, 2, 172, reed), 5: tune(STABS, 5, 173, { ...reed, low: .76, high: .98 }), 6: tune(FINAL, 6, 174, reed) }

const PARTS = finish([
  Q('a1', 'Bass guitar', 'bass', 'phrase', V.bass({ gain: .46, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Kick', 'rhythm', 'pulse', V.kick({ gain: .32, panWidth: 0 }), kick, on(...ALL)),
  Q('b1', 'Lead guitar', 'melody', 'phrase', V.muted({ gain: .7, octave: 3, pan: .3, lpf: 5200, role: 'lead' }), lead, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('b2', 'Hosho', 'rhythm', 'pulse', V.shaker({ gain: .3, pan: .3 }), hosho, on(...ALL)),
  Q('c1', 'Rhythm guitar', 'harmony', 'phrase', V.muted({ gain: .5, octave: 3, pan: -.3 }), rhythm, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('c2', 'Hi-hat', 'rhythm', 'pulse', V.hat({ gain: .9, pan: -.2 }), hat, on(0, 1, 2, 4, 6, 7, 8)),
  Q('d1', 'Singer', 'melody', 'sustain', V.voice({ gain: .42, pan: 0 }), voz, on(1, 2, 3, 4, 7, 8)),
  Q('d2', 'Snare', 'rhythm', 'pulse', V.snare({ gain: .5, pan: .05 }), snare, on(1, 2, 4, 5, 6, 7, 8)),
  Q('e1', 'Chorus', 'response', 'sustain', V.voice({ gain: .34, pan: .2 }), coro, on(2, 3, 7, 8)),
  Q('e2', 'Ngoma', 'rhythm', 'pulse', V.conga({ gain: .34, pan: .2 }), ngoma, on(...ALL)),
  Q('f1', 'Mbira', 'harmony', 'phrase', V.marimba({ gain: .7, pan: -.1, panWidth: .3 }), mbira, on(...ALL)),
  Q('f2', 'Hosho · swish', 'rhythm', 'pulse', V.ganza({ gain: .4, pan: -.3 }), swish, on(2, 5, 6, 7, 8)),
  Q('g1', 'Tenor saxophone', 'response', 'phrase', V.sax({ gain: .3, pan: .14 }), sax, on(1, 2, 4, 5, 7, 8)),
  Q('g2', 'Makwa', 'rhythm', 'pulse', V.clap({ gain: .3, pan: -.1 }), claps, on(2, 3, 5, 7, 8)),
  Q('h1', 'Mbira · kutsinhira', 'response', 'phrase', V.marimba({ gain: .56, octave: 3, pan: .2, panWidth: .3 }), second, on(0, 2, 3, 5, 6, 7, 8)),
  Q('h2', 'Toms', 'rhythm', 'pulse', V.tom({ gain: .3, pan: -.1 }), toms, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  // The interlude is the mbira gathering: close and warm. The hosho section opens the room.
  params: {
    a1: { 3: { gain: .4 } }, a2: { 3: { gain: .2, lpfRange: { first: 1800, second: 2200 } } }, b2: { 0: { gain: .22 }, 3: { gain: .2 }, 5: { gain: .34 } },
    e2: { 3: { gain: .22 }, 5: { gain: .4, reverbRange: { first: .14, second: .2 } } }, f1: { 3: { reverbRange: { first: .24, second: .3 } } }, h1: { 3: { reverbRange: { first: .24, second: .3 } } },
    d1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } }, g1: { 5: { gain: .36 } },
  },
})
build({
  id: 'harare-1981', kitName: 'Chimurenga', profileName: 'Harare 1981 · Chimurenga', meter: '12/8', bpm: 118, root: 'G', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('chm', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Chimurenga do Zimbábue (Thomas Mapfumo & The Blacks Unlimited, tradição da mbira shona): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Chimurenga_music',
}).catch(error => { console.error(error); process.exit(1) })
