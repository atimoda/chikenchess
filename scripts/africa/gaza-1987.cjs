// 1987 Gaza - Majika (original material).
// The band music of southern Mozambique: the timbila (marimba) starts the cycle alone, the xigubu drums
// answer, a bright guitar locks into the gaps and only then does the kit push the dance. The voice calls,
// the chorus answers in thirds and the horns comment at the end of each line.
// D major (Kit Harmony): tonic, subdominant, dominant and the relative minor for the quiet interlude.
// Form: entrada (timbila, then drums, guitar, bass) · verse (call) · chorus (response and horns) · interlude
// (soft: timbila, voice and a half-time bass) · verse · xigubu (tense: the drums alone with horn hits) ·
// guitar solo · chorus · final.
// Run: node scripts/africa/gaza-1987.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // D major degrees: 0 D · 1 E · 2 F# · 3 G · 4 A · 5 B · 6 C#.
  root: { D: 0, G: -4, A: -3, Bm: -2 },
  names: {
    0: ['D', 'D', 'G', 'A'], 1: ['D', 'D', 'G', 'G', 'A', 'A', 'D', 'D'], 2: ['D', 'G', 'A', 'D', 'D', 'G', 'A', 'A'],
    3: ['Bm', 'Bm', 'G', 'G', 'Bm', 'Bm', 'A', 'A'], 4: ['D', 'G', 'A', 'G'], 5: ['A', 'A', 'G', 'G', 'A', 'A', 'G', 'A'], 6: ['D', 'G', 'A', 'D'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Forward and even: only loose hands, no laid-back sixteenths.
  feel: { jitter: 1, vel: .07 },
  colour: { spread: .1, ring: .2 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const END = 'X..X ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- xigubu drums and the kit ----------
const LOW = 'X..x ..X. ..x. X... | X..x ..X. .x.x X...', HIGH = '..x. x..h .x.. x.h. | ..x. x..h .x.x x.hx'
const low = {
  0: beat(11, enter(2, 'o..h ..o. ..h. o... | o..h ..o. .h.h o...')), 1: drum(1, 12, 'x..h ..x. ..h. x...'), 2: drum(2, 13, LOW), 3: drum(3, 14, 'o... .... ..h. ....'),
  4: drum(4, 15, LOW), 5: drum(5, 16, 'X.xX .xX. X.xX .xXx | X.xX .xX. XxXx X.X.'), 6: beat(17, `${LOW} | ${END}`),
}
const high = {
  0: beat(21, enter(2, '..h. h..g .h.. h.g. | ..h. h..g .h.h h.gh')), 1: drum(1, 22, '..x. h..g .x.. h.g.'), 2: drum(2, 23, HIGH), 3: drum(3, 24, '..g. h... .g.. h...'),
  4: drum(4, 25, HIGH), 5: drum(5, 26, '.x.. x.x. .x.. x.xx | .x.x x.x. .xx. x.xx'), 6: beat(27, `${HIGH} | ${END}`),
}
const kick = {
  0: beat(31, enter(6, 'X... ..x. X... ..x.')), 1: drum(1, 32, 'X... ..x. X... ..x. | X... ..x. X... .xx.'), 2: drum(2, 33, 'X... X.x. X... X.x. | X... X.x. X... Xxx.'),
  3: drum(3, 34, 'o... .... .... .... | o... .... ..h. ....'), 4: drum(4, 35, 'X... X.x. X... X.x.'), 5: drum(5, 36, 'X... .... X... .... | X... .... X.X. ....'),
  6: beat(37, `X... X.x. X... X.x. | X... X.x. X... Xxx. | ${END}`),
}
const snare = {
  1: drum(1, 41, '.... X... .... X... | .... X... .... X..x'), 2: drum(2, 42, '.... X..x .... X.x. | .... X..x .... X.xx'),
  4: drum(4, 43, '.... X..x .... X.x.'), 5: drum(5, 44, '.... .... .... X... | .... .... .... XxXx'), 6: beat(45, `.... X..x .... X.x. | .... X..x .... X.xx | ${END}`),
}
const hat = {
  0: beat(51, enter(6, 'x.hm x.hm x.hm x.hx')), 1: drum(1, 52, 'x.hm x,hm x.hm x.hx'), 2: drum(2, 53, 'xhxm xhxm xhxm xhxx'),
  4: drum(4, 54, 'xhxm xhxm xhxm xhxx'), 6: beat(55, `xhxm xhxm xhxm xhxx | xhxm xhxm xhxm xhxx | ${END}`),
}
const shaker = {
  0: beat(61, 'o.g, o.g, o.g, o.g, | o.gh o.gh o.gh o.gh | ' + rep('x.hm x.hm x.hm x.hm', 6)), 1: drum(1, 62, 'x.hm x.hm x.hm x.hm'), 2: drum(2, 63, 'X.mx X.mx X.mx X.mx'),
  3: drum(3, 64, 'o.g, o.g, o.g, o.gh'), 4: drum(4, 65, 'X.mx X.mx X.mx X.mx'), 5: drum(5, 66, 'X.mx X.mx X.mx X.mx'), 6: beat(67, `X.mx X.mx X.mx X.mx | X.mx X.mx X.mx X.mx | ${END}`),
}
const BELL = 'x.x. x.xx .x.x .x.x'
const bell = { 2: drum(2, 71, BELL), 4: drum(4, 72, BELL), 5: drum(5, 73, 'x.x. x.x. x.x. x.x.'), 6: beat(74, `${BELL} | ${BELL} | ${END}`) }
const toms = { [FILL]: beat(81, 'x.o. x.o. xmxm XXXx') }

// ---------- timbila, bass and guitars: cycles written on the chord ----------
const TIMBILA = '0:1 4:1 7:1 4:1 9:1 4:1 7:1 4:1 0:1 4:1 7:1 9:1 11:1 9:1 7:1 4:1 | 0:1 4:1 7:1 4:1 9:1 4:1 7:1 9:1 11:1 9:1 7:1 9:1 7:1 4:1 2:1 4:1'
const timbilaRiff = (seed, options) => riff(2, seed, TIMBILA, { gate: .8, accent: { strong: .86, beat: .76, off: .58 }, ...options })
const timbila = {
  0: unroll(timbilaRiff(101), 8), 1: riff(2, 102, '0:1 r:1 7:1 4:1 9:1 r:1 7:1 4:1 0:1 r:1 7:1 9:1 11:1 r:1 7:1 4:1 | 0:1 r:1 7:1 4:1 9:1 r:1 7:1 9:1 11:1 r:1 7:1 9:1 7:1 4:1 2:1 r:1', { gate: .8, accent: { strong: .8, beat: .7, off: .56 } }),
  2: timbilaRiff(103), 3: riff(2, 104, '0:2 4:2 7:2 9:2 7:2 4:2 7:2 4:2 | 0:2 4:2 7:2 9:2 11:2 9:2 7:2 4:2', { gate: .9, accent: { strong: .7, beat: .62, off: .5 } }),
  4: timbilaRiff(105), 5: riff(1, 106, '0:2! r:2 7:2 r:2 9:2 r:2 7:1 9:1 r:2', { gate: .7 }), 6: unroll(timbilaRiff(107), 2),
}
const BASS = '0:3! 0:1 r:2 4:2 7:2 r:1 7:1 4:2 2:2 | 0:3! 0:1 r:2 4:2 7:2 5:2 4:2 2:2'
const bassRiff = seed => riff(2, seed, BASS, { gate: .72, accent: { strong: .94, beat: .8, off: .72 }, feel: { jitter: 0 } })
const bass = {
  0: from(6, unroll(bassRiff(111), 8)), 1: riff(2, 112, '0:3! 0:1 r:4 4:2 r:2 4:2 2:2 | 0:3! 0:1 r:4 7:2 5:2 4:2 2:2', { gate: .72 }), 2: bassRiff(113),
  3: riff(2, 114, '0:8! 4:4 7:4 | 0:8! 4:4 2:4', { gate: .92 }), 4: bassRiff(115), 5: riff(2, 116, '0:2! r:6 0:2! r:6 | 0:2! r:6 0:2! 0:2 4:2 r:2', { gate: .6 }),
  6: mel('0:3! 0:1 r:2 4:2 7:2 r:1 7:1 4:2 2:2 | 0:3! 0:1 r:2 4:2 7:2 5:2 4:2 2:2 | 0:3! 0:3 0:2 0:8 | 0:8!', { gate: .72 }),
}
const PICK = '7:1 r:1 9:1 7:1 r:1 9:1 11:1 r:1 9:1 r:1 7:1 9:1 r:1 7:1 4:1 r:1 | 7:1 r:1 9:1 7:1 r:1 9:1 11:1 r:1 14:1 r:1 11:1 9:1 r:1 11:1 9:1 7:1'
const pick = (seed, options) => riff(2, seed, PICK, { gate: .6, accent: { strong: .8, beat: .72, off: .62 }, ...options })
const SOLO = '11:1 9:1 7:1 9:1 11:2 14:2 13:1 11:1 9:1 11:1 9:2 7:2 | 9:1 10:1 12:1 10:1 9:2 7:2 5:1 7:1 9:1 7:1 5:2 3:2 | 8:1 10:1 11:1 13:1 15:2 13:2 11:1 13:1 11:1 10:1 8:2 6:2 | 7:1 9:1 10:1 12:1 14:3 12:1 10:2 9:2 7:2 5:2 '
  + '| 14:2 14:1 16:1 14:2 11:2 14:2 14:1 16:1 18:2^2 16:2 | 14:1 12:1 10:1 12:1 14:1 12:1 10:1 9:1 10:1 9:1 7:1 9:1 10:2 12:2 | 13:1 11:1 10:1 11:1 13:1 15:1 17:2 15:1 13:1 11:1 13:1 15:2 13:2 | 12:2 10:2 9:2 7:2 10:8~'
const lead = {
  0: from(4, unroll(pick(121), 8)), 1: pick(122, { accent: { strong: .7, beat: .64, off: .56 } }), 2: pick(123), 3: riff(2, 124, '7:4 9:4 11:8 | 9:4 7:4 4:8', { gate: .9, accent: { strong: .56, beat: .5, off: .46 } }),
  4: tune(SOLO, 4, 125, { low: .62, high: .96, jitter: 1, glide: 0, mel: { gate: .86 } }), 6: unroll(pick(126), 2),
}
// D [F# A D] · G [G B D] · A [E A C#] · Bm [F# B D]
const CHORD = { D: [2, 4, 7], G: [3, 5, 7], A: [1, 4, 6], Bm: [2, 5, 7] }
const CHANK = 'x.xh .xh. x.xh .xh.'
const chank = {
  0: from(4, unroll(comp(CHORD, 0, CHANK, 131, { length: 1 / 28 }), 8)), 1: comp(CHORD, 1, '..xh .x.. ..xh .xh.', 132, { length: 1 / 28 }), 2: comp(CHORD, 2, CHANK, 133, { length: 1 / 28 }),
  4: comp(CHORD, 4, CHANK, 134, { length: 1 / 28 }), 5: comp(CHORD, 5, 'X... .... X... .... | X... .... X.X. ....', 135, { length: 1 / 20 }),
  6: relative(S.hand(136, C.named(['D', 'G', 'A', 'D'], `${CHANK} | ${CHANK} | ${END}`, CHORD, { length: 1 / 24 })), H(6)),
}

// ---------- voices and horns ----------
const VERSE = 'r:2 4:2 4:2 5:2 7:4 5:2 4:2 | 5:3 4:1 2:4~ r:8 | r:2 5:2 5:2 7:2 8:4 7:2 5:2 | 7:3 5:1 3:4~ r:8 '
  + '| r:2 6:2 6:2 8:2 8:4 6:2 4:2 | 6:3 4:1 4:4~ r:8 | r:2 4:2 5:2 7:2 9:4 7:2 5:2 | 4:3 2:1 0:6~ r:6'
const CHORUS = '7:3 7:1 9:4 7:2 5:2 4:4 | 5:3 5:1 7:4 5:8~ | 6:3 6:1 8:4 6:2 4:2 6:4 | 7:8~ r:8 | 7:3 7:1 9:4 7:2 5:2 4:4 | 5:3 5:1 7:4 5:8~ | 8:3 8:1 8:4 6:2 8:2 9:4 | 8:8~ r:8'
const CALM = '9:8~ 7:4 5:4 | 7:12~ r:4 | 7:8~ 5:4 3:4 | 5:12~ r:4 | 9:8~ 11:4 9:4 | 7:12~ r:4 | 8:8~ 6:4 4:4 | 6:12~ r:4'
const ANSWER = 'r:16 | r:8 9:1 9:1 r:1 9:1 11:2 9:2 | r:16 | r:8 10:1 10:1 r:1 10:1 12:2 10:2 | r:16 | r:8 11:1 11:1 r:1 11:1 13:2 11:2 | r:16 | r:8 9:1 9:1 r:1 9:1 7:4'
const CALLS = 'r:16 | r:16 | r:16 | r:6 9:1 9:1 11:2 9:2 7:4 | r:16 | r:16 | r:16 | r:6 11:1 11:1 13:2 11:2 13:4'
const HITS = '8:2! r:2 8:2 r:2 r:4 8:1 8:1 r:2 | 8:2! r:2 8:2 r:2 11:2 r:2 8:2 r:2 | 7:2! r:2 7:2 r:2 r:4 7:1 7:1 r:2 | 7:2! r:2 7:2 r:2 10:2 r:2 7:2 r:2 '
  + '| 8:2! r:2 8:2 r:2 r:4 8:1 8:1 r:2 | 8:2! r:2 8:2 r:2 11:2 r:2 8:2 r:2 | 7:2! r:2 7:2 9:2 10:2 r:2 12:2 r:2 | 11:6! r:2 11:1 11:1 11:1 r:1 11:2 r:2'
const FINAL = '7:3 7:1 9:4 7:2 5:2 4:4 | 5:3 5:1 7:4 5:8~ | 8:3 8:3 8:2 8:8 | 7:12~ r:4'
const sung = { low: .56, high: .88, glide: 4 }, brass = { glide: 0, low: .64, high: .94 }
const voz = { 1: tune(VERSE, 1, 141, sung), 2: tune(CHORUS, 2, 142, sung), 3: tune(CALM, 3, 143, { low: .42, high: .64, jitter: 2 }), 6: tune(FINAL, 6, 144, sung) }
const coro = { 2: harmony(CHORUS, 2, 151, sung), 5: harmony(HITS, 5, 152, { low: .6, high: .86, glide: 0 }, 0), 6: harmony(FINAL, 6, 153, sung) }
const trumpet = { 1: tune(ANSWER, 1, 161, brass), 2: tune(CALLS, 2, 162, brass), 5: tune(HITS, 5, 163, { ...brass, low: .78, high: .98 }), 6: tune(FINAL, 6, 164, brass) }
const sax = { 1: harmony(ANSWER, 1, 171, brass), 2: harmony(CALLS, 2, 172, brass), 5: harmony(HITS, 5, 173, { ...brass, low: .76, high: .96 }), 6: harmony(FINAL, 6, 174, brass) }

const PARTS = finish([
  Q('a1', 'Baixo', 'bass', 'phrase', V.bass({ gain: .4, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Bombo', 'rhythm', 'pulse', V.kick({ gain: .32, panWidth: 0 }), kick, on(...ALL)),
  Q('b1', 'Guitarra solo', 'melody', 'phrase', V.leadGuitar({ gain: .56, octave: 3, pan: .28, delay: .08 }), lead, on(...ALL)),
  Q('b2', 'Tarola', 'rhythm', 'pulse', V.snare({ gain: .46, pan: .05 }), snare, on(1, 2, 4, 5, 6, 7, 8)),
  Q('c1', 'Guitarra ritmo', 'harmony', 'phrase', V.muted({ gain: .36, pan: -.32 }), chank, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('c2', 'Prato de choque', 'rhythm', 'pulse', V.hat({ gain: .9, pan: -.2 }), hat, on(0, 1, 2, 4, 6, 7, 8)),
  Q('d1', 'Cantor', 'melody', 'sustain', V.voice({ gain: .36, pan: 0 }), voz, on(1, 2, 3, 4, 7, 8)),
  Q('d2', 'Xigubu grave', 'rhythm', 'pulse', V.tom({ gain: .3, decay: .3, pan: -.15 }), low, on(...ALL)),
  Q('e1', 'Coro', 'response', 'sustain', V.voice({ gain: .32, pan: .2, role: undefined }), coro, on(2, 5, 7, 8)),
  Q('e2', 'Xigubu agudo', 'rhythm', 'pulse', V.conga({ gain: .34, pan: .2 }), high, on(...ALL)),
  Q('f1', 'Trompete', 'response', 'phrase', V.trumpet({ gain: .38, octave: 3, pan: -.12 }), trumpet, on(1, 2, 4, 5, 7, 8)),
  Q('f2', 'Chocalho', 'rhythm', 'pulse', V.shaker({ gain: .26, pan: .32 }), shaker, on(...ALL)),
  Q('g1', 'Saxofone tenor', 'response', 'phrase', V.sax({ gain: .32, pan: .14 }), sax, on(1, 2, 4, 5, 7, 8)),
  Q('g2', 'Sino', 'rhythm', 'pulse', V.bellLow({ gain: .2, pan: -.3 }), bell, on(2, 5, 6, 7, 8)),
  Q('h1', 'Timbila', 'harmony', 'phrase', V.marimba({ gain: .6, pan: .1, panWidth: .3 }), timbila, on(...ALL)),
  Q('h2', 'Xigubu · virada', 'rhythm', 'pulse', V.tom({ gain: .32, pan: .1 }), toms, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  // The interlude is close and warm; the xigubu section opens the room around the drums.
  params: {
    a1: { 3: { gain: .4 } }, a2: { 3: { gain: .2, lpfRange: { first: 1800, second: 2200 } } },
    d2: { 0: { gain: .24 }, 3: { gain: .18 }, 5: { gain: .36, reverbRange: { first: .16, second: .22 } } }, e2: { 3: { gain: .22 }, 5: { gain: .4, reverbRange: { first: .14, second: .2 } } },
    f2: { 0: { gain: .2 }, 3: { gain: .16 } }, h1: { 3: { reverbRange: { first: .24, second: .3 } } }, b1: { 3: { gain: .44, reverbRange: { first: .26, second: .32 } }, 4: { gain: .8 } },
    d1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } }, f1: { 5: { gain: .56 } },
  },
})
build({
  id: 'gaza-1987', kitName: 'Majika', profileName: 'Gaza 1987 · Majika', meter: '4/4', bpm: 126, root: 'D', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('mjk', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Majika do sul de Moçambique (Ghorwane, Orchestra Marrabenta Star de Moçambique): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Ghorwane',
}).catch(error => { console.error(error); process.exit(1) })
