// 1973 Kingston - Roots reggae (original material).
// A studio session: the drummer rolls in on the toms, the horns state the theme, and the riddim settles.
// One drop: the kick and the cross-stick land together on the third beat and nowhere else; the hat swings
// the sixteenths; the guitar chops every off-beat and the organ bubbles between the chops. The bass is the
// melody of the riddim and leaves the first beat empty when it can. A lead voice with a harmony trio.
// A natural minor (Kit Harmony): Am · G in the verse, F · G · Am in the refrain.
// Form: drum roll and horn theme · verse · refrain · dub (soft: bass, drum and organ stabs lost in echo,
// melodica far away) · verse · steppers (tense: the kick on every beat under the horn riff) · melodica solo ·
// refrain · final.
// Run: node scripts/world/kingston-1973.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Menor natural', {
  // A minor degrees: 0 A · 1 B · 2 C · 3 D · 4 E · 5 F · 6 G.
  root: { Am: 0, G: -1, F: -2, Em: 4, Dm: 3 },
  names: {
    0: ['Am', 'Am', 'G', 'G'], 1: ['Am', 'Am', 'G', 'G', 'Am', 'Am', 'Em', 'Am'], 2: ['F', 'G', 'Am', 'Am', 'F', 'G', 'Em', 'Am'],
    3: ['Am', 'Am', 'Dm', 'Dm'], 4: ['Am', 'G'], 5: ['Dm', 'Dm', 'Em', 'Em', 'Dm', 'Dm', 'Em', 'Em'], 6: ['F', 'G', 'Am', 'Am'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Swung sixteenths (the second and fourth two ticks late) and everything a little behind.
  feel: { push: [0, 2, 0, 2], jitter: 1, vel: .06 },
  colour: { spread: .1, ring: .14 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const ROLL = 'x.xx x.xx xxmx XXXx'
const END = '.... .... X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- drums: one drop ----------
const DROP = '.... .... X... ....'
const kick = {
  0: beat(11, enter(1, DROP)), 1: drum(1, 12, '.... .... X... .... | .... .... X... ..h.'), 2: drum(2, 13, '.... .... X... .... | .... .... X..h ....'),
  3: drum(3, 14, '.... .... X... ....'), 4: drum(4, 15, DROP), 5: drum(5, 16, 'X... X... X... X...'), 6: beat(17, `${DROP} | ${DROP} | ${END}`),
}
const rim = {
  0: beat(21, enter(1, '.... .... X... ....')), 1: drum(1, 22, '.... .... X... .... | .... ..g. X... ...g'), 2: drum(2, 23, '.... .... X... ...g | .... ..g. X... ..gg'),
  3: drum(3, 24, '.... .... x... ....'), 4: drum(4, 25, '.... .... X... .... | .... ..g. X... ...g'), 5: drum(5, 26, '.... X... .... X...'), 6: beat(27, `.... .... X... ...g | .... ..g. X... ..gg | ${END}`),
}
const hat = {
  0: beat(31, enter(1, 'x.hx x.hx x.hx x.hx')), 1: drum(1, 32, 'x.hx x.hx x.hx x.hx | x.hx x,hx x.hx x.mx'), 2: drum(2, 33, 'x.mx x.mx x.mx x.mx'), 3: drum(3, 34, 'h... h..g h... h..g'),
  4: drum(4, 35, 'x.hx x.hx x.hx x.hx'), 5: drum(5, 36, 'x.xx x.xx x.xx x.xx'), 6: beat(37, `x.mx x.mx x.mx x.mx | x.mx x.mx x.mx x.mx | ${END}`),
}
// Nyabinghi heartbeat on the hand drum.
const HEART = 'x.h. .... x.h. ....'
const binghi = {
  1: drum(1, 41, HEART), 2: drum(2, 42, 'x.h. ..g. x.h. ..g.'), 3: drum(3, 43, 'o.g. .... o.g. ....'), 4: drum(4, 44, 'x.h. ..g. x.h. ..gh'), 5: drum(5, 45, 'x.x. ..h. x.x. ..hx'),
  6: beat(46, `x.h. ..g. x.h. ..g. | x.h. ..g. x.h. ..g. | ${END}`),
}
const shaker = { 1: drum(1, 51, '..x. ..x. ..x. ..x.'), 2: drum(2, 52, 'h.xh h.xh h.xh h.xh'), 4: drum(4, 53, '..x. ..x. ..x. ..x.'), 5: drum(5, 54, 'h.xh h.xh h.xh h.xh'), 6: beat(55, `h.xh h.xh h.xh h.xh | h.xh h.xh h.xh h.xh | ${END}`) }
const guiro = { 2: drum(2, 61, 'x... ..h. x... ..h.'), 5: drum(5, 62, 'x... ..h. x... ..h.'), 6: beat(63, `x... ..h. x... ..h. | x... ..h. x... ..h. | ${END}`) }
const snare = { 0: beat(71, ROLL), 3: drum(3, 72, '.... .... .... .... | .... .... .... .... | .... .... .... .... | .... .... .... ..x*'.replace('x*', 'x.')) }
const toms = { 0: beat(81, 'o.oo o.oo ohmh ....'), [FILL]: beat(82, '.... .... x.xx XXXx') }

// ---------- bass, guitar chop and organ bubble ----------
const BASS = 'r:2 0:2! 0:2 r:2 4:2 2:2 0:4 | r:2 0:2! 0:2 r:2 2:2 4:2 7:2 4:2'
const bassRiff = seed => riff(2, seed, BASS, { gate: .82, accent: { strong: .94, beat: .86, off: .78 }, feel: { push: [0, 2, 0, 2], jitter: 0 } })
const bass = {
  0: from(1, unroll(bassRiff(101), 8)), 1: bassRiff(102), 2: riff(2, 103, '0:3! 0:1 r:2 0:2 4:2 r:2 4:2 2:2 | 0:3! 0:1 r:2 0:2 4:2 7:2 4:2 2:2', { gate: .82 }),
  3: riff(2, 104, 'r:2 0:2! 0:2 r:10 | r:2 0:2! 0:2 r:2 4:2 2:2 0:4', { gate: .82 }), 4: bassRiff(105),
  5: riff(2, 106, '0:2! 0:2 r:2 0:2 2:2 r:2 4:2 r:2 | 0:2! 0:2 r:2 0:2 4:2 2:2 0:2 r:2', { gate: .8 }),
  6: mel('0:3! 0:1 r:2 0:2 4:2 r:2 4:2 2:2 | 0:3! 0:1 r:2 0:2 4:2 7:2 4:2 2:2 | r:2 0:2! 0:2 r:2 0:8 | 0:8!', { gate: .82 }),
}
// Am [C E A] · G [B D G] · F [C F A] · Em [B E G] · Dm [D F A]
const CHORD = { Am: [2, 4, 7], G: [1, 3, 6], F: [2, 5, 7], Em: [1, 4, 6], Dm: [3, 5, 7] }
const CHOP = '..x. ..x. ..x. ..x.'
const chop = {
  0: from(1, unroll(comp(CHORD, 0, CHOP, 111, { length: 1 / 28 }), 8)), 1: comp(CHORD, 1, CHOP, 112, { length: 1 / 28 }), 2: comp(CHORD, 2, '..xh ..x. ..xh ..x.', 113, { length: 1 / 28 }),
  4: comp(CHORD, 4, CHOP, 114, { length: 1 / 28 }), 5: comp(CHORD, 5, '..xh ..xh ..xh ..xh', 115, { length: 1 / 28 }),
  6: relative(S.hand(116, C.named(['F', 'G', 'Am', 'Am'], `..xh ..x. ..xh ..x. | ..xh ..x. ..xh ..x. | ..x. ..x. X... .... | X... .... .... ....`, CHORD, { length: 1 / 20 })), H(6)),
}
const BUBBLE = '.gxg .gxg .gxg .gxg'
const organ = {
  0: from(2, unroll(comp(CHORD, 0, BUBBLE, 121, { length: 1 / 26 }), 8)), 1: comp(CHORD, 1, '.g.g .g.g .g.g .g.g', 122, { length: 1 / 26 }), 2: comp(CHORD, 2, 'o... .... .... ....', 123, { length: .9 }),
  3: comp(CHORD, 3, '..x. .... .... .... | .... .... ..x. ....', 124, { length: 1 / 12 }), 4: comp(CHORD, 4, '.g.g .g.g .g.g .g.g', 125, { length: 1 / 26 }), 5: comp(CHORD, 5, 'x... .... .... ....', 126, { length: .9 }),
  6: comp(CHORD, 6, 'o... .... .... ....', 127, { length: .9 }),
}
// The lead guitar doubles the bass an octave up with the palm on the strings.
const picking = { 1: riff(2, 131, BASS.replace(/!/g, ''), { gate: .5 }), 2: riff(2, 132, '0:3 0:1 r:2 0:2 4:2 r:2 4:2 2:2 | 0:3 0:1 r:2 0:2 4:2 7:2 4:2 2:2', { gate: .5 }), 4: riff(2, 133, BASS.replace(/!/g, ''), { gate: .5 }), 5: riff(2, 134, '0:2 0:2 r:2 0:2 2:2 r:2 4:2 r:2 | 0:2 0:2 r:2 0:2 4:2 2:2 0:2 r:2', { gate: .5 }) }

// ---------- voices, horns and melodica ----------
const THEME = 'r:16 | 4:2 r:2 7:4 6:2 4:2 r:4 | 6:2 4:2 2:4~ r:8 | 4:2 r:2 6:4 4:2 3:2 r:4 | 4:2 r:2 7:4 6:2 4:2 r:4 | 6:2 4:2 2:4~ r:8 | 4:2 r:2 7:4 9:2 7:2 r:4 | 6:8~ r:8'
const VERSE = 'r:4 4:2 4:2 7:4 6:2 4:2 | 6:3 4:1 4:8~ r:4 | r:4 4:2 4:2 6:4 4:2 3:2 | 4:3 3:1 1:8~ r:4 | r:4 4:2 4:2 7:4 6:2 4:2 | 6:3 7:1 9:8~ r:4 | r:4 8:2 8:2 8:4 6:2 4:2 | 4:3 2:1 0:8~ r:4'
const CHORUS = '9:4 9:2 7:2 9:4 7:4 | 8:4 8:2 6:2 8:8~ | 7:4 7:2 6:2 7:4 4:4 | r:16 | 9:4 9:2 7:2 9:4 11:4 | 10:4 10:2 8:2 10:8~ | 8:4 8:2 6:2 8:4 6:4 | 7:12~ r:4'
const TRIO = 'r:16 | r:16 | r:16 | r:4 7:2 7:2 9:4 7:4 | r:16 | r:16 | r:16 | r:4 7:2 9:2 11:8~'
const OOH = '7:16t | 7:16t | 6:16t | 6:16t | 7:16t | 7:16t | 6:16t | 7:16t'
const RIFF = '7:2! r:2 7:2 9:2 r:2 7:2 r:4 | 7:2! r:2 7:2 9:2 10:4 9:4 | 8:2! r:2 8:2 10:2 r:2 8:2 r:4 | 8:2! r:2 8:2 10:2 11:4 10:4 | 7:2! r:2 7:2 9:2 r:2 7:2 r:4 | 7:2! r:2 7:2 9:2 10:4 9:4 | 8:2! r:2 8:2 10:2 r:2 8:2 r:4 | 8:4 10:4 11:4 13:4'
const FAR = 'r:8 11:4* 9:4 | 7:8~ r:8 | r:8 10:4* 9:4 | 7:8~ r:8 | r:8 11:4* 13:4 | 14:8~ r:8 | r:8 12:4* 10:4 | 9:8~ r:8'
const SOLO = '11:3 9:1 7:2 9:2 11:4 13:2 11:2 | 10:3 8:1 6:2 8:2 10:8~ | 11:2 13:2 14:4 13:2 11:2 9:2 7:2 | 8:6~ 6:2 4:2 6:2 8:4 | 14:3 13:1 11:2 13:2 14:4 16:2 14:2 | 13:3 11:1 10:2 8:2 10:8~ | 11:2 9:2 7:2 9:2 11:2 13:2 14:2 16:2 | 15:10~ r:6'
const FINAL = '9:4 9:2 7:2 9:4 11:4 | 10:4 10:2 8:2 10:8~ | 9:3 9:3 9:2 7:8 | 7:12~ r:4'
const sung = { low: .54, high: .86, glide: 3, jitter: 2 }, brass = { glide: 0, low: .6, high: .9 }
const voz = { 1: tune(VERSE, 1, 141, sung), 2: tune(CHORUS, 2, 142, sung), 6: tune(FINAL, 6, 143, sung) }
const trio = { 1: tune(OOH, 1, 151, { low: .36, high: .48, glide: 0 }), 2: [...harmony(CHORUS, 2, 152, sung), ...tune(TRIO, 2, 153, sung)], 6: harmony(FINAL, 6, 154, sung) }
const sax = { 0: tune(THEME, 0, 161, brass), 2: tune('r:16 | r:16 | r:16 | r:12 11:2 13:2 | r:16 | r:16 | r:16 | r:16', 2, 162, brass), 5: tune(RIFF, 5, 163, { ...brass, low: .74, high: .96 }), 6: tune('r:16 | r:16 | 9:3 9:3 9:2 7:8 | 7:12~ r:4', 6, 164, brass) }
const trombone = { 0: harmony(THEME, 0, 171, brass), 5: harmony(RIFF, 5, 172, { ...brass, low: .72, high: .94 }), 6: harmony('r:16 | r:16 | 9:3 9:3 9:2 7:8 | 7:12~ r:4', 6, 173, brass) }
const melodica = { 3: tune(FAR, 3, 181, { low: .44, high: .7, glide: 3, jitter: 2 }), 4: tune(SOLO, 4, 182, { low: .56, high: .92, glide: 3, jitter: 2 }) }

const PARTS = finish([
  Q('a1', 'Bass guitar', 'bass', 'phrase', V.bass({ gain: .44, octave: 1, lpf: 1100, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Kick', 'rhythm', 'pulse', V.kick({ gain: .36, panWidth: 0 }), kick, on(...ALL)),
  Q('b1', 'Guitar · chop', 'harmony', 'phrase', V.guitar({ gain: .56, pan: .3, hpf: 320 }), chop, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('b2', 'Cross-stick', 'rhythm', 'pulse', V.rim({ gain: .2, pan: .05, reverb: .16 }), rim, on(...ALL)),
  Q('c1', 'Organ · bubble', 'harmony', 'phrase', V.organ({ gain: .16, octave: 3, pan: -.3 }), organ, on(...ALL)),
  Q('c2', 'Hi-hat', 'rhythm', 'pulse', V.hat({ gain: .9, pan: -.2 }), hat, on(...ALL)),
  Q('d1', 'Lead vocal', 'melody', 'sustain', V.voice({ gain: .42, octave: 2, pan: 0, reverb: .2 }), voz, on(1, 2, 4, 7, 8)),
  Q('d2', 'Nyabinghi drum', 'rhythm', 'pulse', V.conga({ gain: .3, lpf: 3200, pan: .2 }), binghi, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('e1', 'Harmony trio', 'response', 'sustain', V.voice({ gain: .3, pan: .22, reverb: .22 }), trio, on(1, 2, 4, 7, 8)),
  Q('e2', 'Shaker', 'rhythm', 'pulse', V.shaker({ gain: .22, pan: .32 }), shaker, on(1, 2, 4, 5, 6, 7, 8)),
  Q('f1', 'Tenor saxophone', 'response', 'phrase', V.sax({ gain: .3, octave: 2, pan: .14 }), sax, on(0, 2, 5, 7, 8)),
  Q('f2', 'Guiro', 'rhythm', 'pulse', V.guiro({ gain: .3, pan: -.3 }), guiro, on(2, 5, 7, 8)),
  Q('g1', 'Trombone', 'response', 'phrase', V.trombone({ gain: .42, octave: 2, pan: -.14 }), trombone, on(0, 5, 8)),
  Q('g2', 'Snare', 'rhythm', 'pulse', V.snare({ gain: .4, pan: .05, reverb: .16 }), snare, on(0, 3)),
  Q('h1', 'Melodica', 'melody', 'sustain', V.accordion({ gain: .24, octave: 3, hpf: 300, pan: -.1, reverb: .3, delay: .3, role: 'lead' }), melodica, on(3, 6)),
  Q('h2', 'Toms', 'rhythm', 'pulse', V.tom({ gain: .3, pan: -.1, reverb: .14 }), toms, on(0)),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  // The dub: everything dry disappears, what is left swims in echo.
  params: {
    a1: { 3: { gain: .56 } }, c1: { 3: { gain: .2, reverbRange: { first: .3, second: .4 } } }, b2: { 3: { reverbRange: { first: .3, second: .4 } } },
    c2: { 3: { gain: .6 } }, d2: { 3: { gain: .22, reverbRange: { first: .24, second: .3 } } }, a2: { 5: { gain: .32 } }, f1: { 5: { gain: .34 } },
  },
})
build({
  id: 'kingston-1973', kitName: 'Roots reggae', profileName: 'Kingston 1973 · Roots reggae', meter: '4/4', bpm: 76, root: 'A', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('rgg', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Roots reggae de Kingston (The Wailers, Burning Spear, Augustus Pablo, Carlton Barrett no one drop): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Roots_reggae',
}).catch(error => { console.error(error); process.exit(1) })
