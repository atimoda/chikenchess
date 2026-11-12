// 1985 Dakar - Mbalax (original material).
// The dance band of the Medina: the tama (talking drum) calls alone, the sabar family answers one drum at a
// time (mbung mbung, then the low thiol, then the cracking nder), and only then do the marimba-like keyboard,
// the staccato guitar and the bass join. The singer rides high over the cycle; the chorus and the horns
// answer; the drums stop the band with a spoken unison phrase (bakk) before the tama solo.
// E natural minor (Kit Harmony): Em · C · D, the chorus brightening to G.
// Form: tama call · verse · chorus · interlude (soft: keyboard, voice, low sabar) · verse · bakk (tense:
// drums and band in unison) · tama solo · chorus · final.
// Run: node scripts/africa/dakar-1985.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Menor natural', {
  // E minor degrees: 0 E · 1 F# · 2 G · 3 A · 4 B · 5 C · 6 D.
  root: { Em: 0, C: -2, D: -1, G: -5, Am: -4, Bm: -3 },
  names: {
    0: ['Em', 'Em', 'C', 'D'], 1: ['Em', 'Em', 'C', 'D'], 2: ['G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'Em'],
    3: ['Am', 'Am', 'Em', 'Em', 'Am', 'Am', 'Bm', 'Bm'], 4: ['Em', 'D'], 5: ['Em', 'Em', 'D', 'D', 'C', 'C', 'D', 'D'], 6: ['Em', 'C', 'D', 'Em'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Sabar hands play ahead of the beat: the second sixteenth a tick early, loose dynamics.
  feel: { push: [0, -1, 0, 0], jitter: 1, vel: .08 },
  colour: { spread: .12, ring: .18 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
// The bakk: a phrase every drum and the band play together.
const BAKK = 'X.xX ..X. X..X .... | X.xX ..X. XxXx X... | X.xX ..X. X..X .... | X.X. X.X. XXXX X...'
const END = 'X.xX ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- sabar family ----------
const MBUNG = 'x.hx .hx. x.hx .hx. | x.hx .hx. x.hx .hxh', NDER = '..X. ...x ..X. .x.. | ..X. ..xx ..X. .x.X', THIOL = 'X... ..x. .... x... | X... ..x. ..x. x...'
const mbung = {
  0: beat(11, enter(2, 'o.go .go. o.go .go.')), 1: drum(1, 12, MBUNG), 2: drum(2, 13, 'x.mx .mx. x.mx .mxm'), 3: drum(3, 14, 'o.g. .go. o.g. .go.'),
  4: drum(4, 15, MBUNG), 5: drum(5, 16, BAKK), 6: beat(17, `${MBUNG} | ${END}`),
}
const nder = {
  0: beat(21, enter(5, '..x. ...h ..x. .h..')), 1: drum(1, 22, '..x. ...h ..x. .h.. | ..x. ..h, ..x. .h.x'), 2: drum(2, 23, NDER),
  4: drum(4, 24, '..X. .x.x ..X. xx.X | .xX. .x.x x.X. xxXx'), 5: drum(5, 25, BAKK), 6: beat(26, `${NDER} | ${END}`),
}
const thiol = {
  0: beat(31, enter(3, 'o... ..h. .... h...')), 1: drum(1, 32, 'x... ..h. .... h...'), 2: drum(2, 33, THIOL), 3: drum(3, 34, 'o... .... .... h...'),
  4: drum(4, 35, THIOL), 5: drum(5, 36, BAKK), 6: beat(37, `${THIOL} | ${END}`),
}
const sabarRoll = { [FILL]: beat(41, 'x.xx .xx. xxmx XXXx') }
// ---------- kit ----------
const kick = {
  0: beat(51, enter(6, 'X... .... X.x. ....')), 1: drum(1, 52, 'X... .... X.x. .... | X... .... X.x. ..x.'), 2: drum(2, 53, 'X... ..x. X.x. .... | X... ..x. X.x. ..x.'),
  3: drum(3, 54, 'o... .... .... ....'), 4: drum(4, 55, 'X... ..x. X.x. ....'), 5: drum(5, 56, BAKK), 6: beat(57, `X... ..x. X.x. .... | X... ..x. X.x. ..x. | ${END}`),
}
const rim = {
  1: drum(1, 61, '.... x... .... x..x'), 2: drum(2, 62, '.... X... .... X..x | .... X... .... X.xx'), 3: drum(3, 63, '.... .... h... ....'),
  4: drum(4, 64, '.... X... .... X..x'), 6: beat(65, `.... X... .... X..x | .... X... .... X.xx | ${END}`),
}
const hat = {
  0: beat(71, enter(6, 'xhmh xhmh xhmh xhmh')), 1: drum(1, 72, 'xhmh x,mh xhmh xhmx'), 2: drum(2, 73, 'xhxh xhxh xhxh xhxx'), 4: drum(4, 74, 'xhxh xhxh xhxh xhxx'),
  6: beat(75, `xhxh xhxh xhxh xhxx | xhxh xhxh xhxh xhxx | ${END}`),
}
const shaker = {
  0: beat(81, enter(4, 'o.g, o.g, o.g, o.gh')), 1: drum(1, 82, 'x.hm x.hm x.hm x.hm'), 2: drum(2, 83, 'X.mx X.mx X.mx X.mx'), 3: drum(3, 84, 'o.g, o.g, o.g, o.gh'),
  4: drum(4, 85, 'X.mx X.mx X.mx X.mx'), 6: beat(86, `X.mx X.mx X.mx X.mx | X.mx X.mx X.mx X.mx | ${END}`),
}

// ---------- tama: the talking drum ----------
const CALL = '4:2 4:1 4:1 7:2^3 4:2^-3 r:8 | 4:1 4:1 7:2^3 7:1 7:1 4:2^-3 0:4^-4 r:4 | 4:2 4:1 4:1 7:2^3 4:2^-3 r:8 | 7:1 7:1 4:2^-3 7:1 7:1 4:2^-3 0:4^-4 r:4 '
  + '| r:12 4:2 7:2^3 | r:16 | r:12 7:2 4:2^-3 | r:8 4:1 4:1 7:2^3 4:4^-3'
const COMMENT = 'r:16 | r:10 4:2 7:2^3 4:2^-3 | r:16 | r:8 7:1 7:1 4:2^-3 0:4^-4'
const TALK = '4:1 4:1 7:2^3 4:1 4:1 7:2^3 4:2^-3 0:2^-4 4:2^4 r:2 | 7:1 4:1 7:1 4:1 7:2 4:2^-3 0:1 0:1 4:2^4 7:4^3 | 4:2 7:2^3 9:2^2 7:2^-2 4:1 4:1 7:2^3 4:2^-3 0:2^-4 | 7:6^3 4:2^-3 0:8^-4 '
  + '| 9:1 9:1 7:2^-2 9:1 9:1 7:2^-2 4:2^-3 7:2^3 9:4^2 | 4:1 4:1 4:1 4:1 7:2^3 4:2^-3 7:1 7:1 7:1 7:1 9:2^2 7:2^-2 | 4:1 7:1 4:1 7:1 4:1 7:1 9:2^2 7:1 9:1 7:1 9:1 11:4^2 | 11:4^2 7:4^-4 4:8^-3'
const talk = { glide: 0, low: .6, high: .96, jitter: 2, mel: { gate: .8 } }
const tama = {
  0: tune(CALL, 0, 91, talk), 1: tune(`${COMMENT} | ${COMMENT}`, 1, 92, { ...talk, low: .5, high: .8 }), 2: tune(`${COMMENT} | ${COMMENT}`, 2, 93, { ...talk, low: .5, high: .8 }),
  4: tune(TALK, 4, 94, talk), 5: tune('4:2! r:1 4:1 7:2^3 r:4 4:2 r:2 7:2^3 | 4:2! r:1 4:1 7:2^3 r:4 4:1 7:1 4:1 7:1 9:2^2 | 4:2! r:1 4:1 7:2^3 r:4 4:2 r:2 7:2^3 | 4:2 r:2 4:2 r:2 7:1 7:1 7:1 7:1 9:4^2', 5, 95, { ...talk, low: .74, high: 1 }),
  6: tune('4:1 4:1 7:2^3 4:1 4:1 7:2^3 4:2^-3 0:2^-4 4:2^4 r:2 | 7:1 4:1 7:1 4:1 7:2 4:2^-3 0:1 0:1 4:2^4 7:4^3 | 4:2! r:1 4:1 7:2^3 r:4 4:6^-3 | 0:8^-4', 6, 96, talk),
}

// ---------- keyboard, guitar and bass: cycles on the chord ----------
const KEYS = '7:1 r:1 9:1 r:1 11:1 9:1 r:1 7:1 r:1 9:1 7:1 r:1 4:1 r:1 7:1 r:1 | 7:1 r:1 9:1 r:1 11:1 9:1 r:1 11:1 r:1 14:1 11:1 r:1 9:1 r:1 7:1 9:1'
const keysRiff = (seed, options) => riff(2, seed, KEYS, { gate: .7, accent: { strong: .84, beat: .76, off: .66 }, ...options })
const keys = {
  0: from(4, unroll(keysRiff(101), 8)), 1: keysRiff(102, { accent: { strong: .74, beat: .68, off: .58 } }), 2: keysRiff(103),
  3: riff(2, 104, '7:2 9:2 11:4 9:2 7:2 4:4 | 7:2 9:2 11:4 14:4 11:4', { gate: .92, accent: { strong: .64, beat: .56, off: .5 } }), 4: keysRiff(105, { accent: { strong: .7, beat: .64, off: .56 } }),
  5: riff(4, 106, '7:2! r:1 7:1 r:2 9:2 r:2 7:2 r:1 9:1 r:2 | 7:2! r:1 7:1 r:2 9:2 r:2 7:1 9:1 11:1 9:1 7:2 | 7:2! r:1 7:1 r:2 9:2 r:2 7:2 r:1 9:1 r:2 | 7:2 r:2 9:2 r:2 11:1 11:1 11:1 11:1 14:4', { gate: .7 }), 6: unroll(keysRiff(107), 2),
}
// Em [G B E] · C [G C E] · D [F# A D] · G [G B D] · Am [A C E] · Bm [F# B D]
const CHORD = { Em: [2, 4, 7], C: [2, 5, 7], D: [1, 3, 6], G: [2, 4, 6], Am: [3, 5, 7], Bm: [1, 4, 6] }
const CHOP = '.x.h ..x. .x.h .x..'
const guitar = {
  0: from(6, unroll(comp(CHORD, 0, CHOP, 111, { length: 1 / 30 }), 8)), 1: comp(CHORD, 1, CHOP, 112, { length: 1 / 30 }), 2: comp(CHORD, 2, '.x.x ..xh .x.x .xh.', 113, { length: 1 / 30 }),
  3: comp(CHORD, 3, '..h. .... ..h. ....', 114, { length: 1 / 16 }), 4: comp(CHORD, 4, CHOP, 115, { length: 1 / 30 }), 5: comp(CHORD, 5, BAKK, 116, { length: 1 / 26 }),
  6: relative(S.hand(117, C.named(['Em', 'C', 'D', 'Em'], `.x.x ..xh .x.x .xh. | .x.x ..xh .x.x .xh. | ${END}`, CHORD, { length: 1 / 24 })), H(6)),
}
const BASS = '0:2! r:4 0:1 0:1 r:2 4:2 r:2 6:2 | 0:2! r:4 0:1 0:1 r:2 7:2 6:2 4:2'
const bassRiff = seed => riff(2, seed, BASS, { gate: .7, accent: { strong: .94, beat: .8, off: .72 }, feel: { jitter: 0 } })
const bass = {
  0: from(6, unroll(bassRiff(121), 8)), 1: bassRiff(122), 2: riff(2, 123, '0:2! r:2 0:2 r:2 4:2 r:1 4:1 7:2 4:2 | 0:2! r:2 0:2 r:2 4:2 7:2 6:2 4:2', { gate: .7 }),
  3: riff(2, 124, '0:8! r:4 4:4 | 0:8! r:4 2:4', { gate: .92 }), 4: bassRiff(125),
  5: riff(4, 126, '0:2! r:1 0:1 r:2 0:2 r:2 0:2 r:4 | 0:2! r:1 0:1 r:2 0:2 r:2 0:1 0:1 0:1 0:1 0:2 | 0:2! r:1 0:1 r:2 0:2 r:2 0:2 r:4 | 0:2 r:2 0:2 r:2 0:1 0:1 0:1 0:1 0:4', { gate: .6 }),
  6: mel('0:2! r:4 0:1 0:1 r:2 4:2 r:2 6:2 | 0:2! r:4 0:1 0:1 r:2 7:2 6:2 4:2 | 0:2! r:1 0:1 r:2 0:2 r:2 0:6 | 0:8!', { gate: .72 }),
}

// ---------- voice, chorus and horns ----------
// The singer starts high and falls in long melismas; the chorus answers lower and plainer.
const VERSE = 'r:4 11:2 11:2 11:3 9:1 8:2 7:2 | 8:2 7:2 6:1 7:1 4:6~ r:4 | r:4 9:2 9:2 9:3 8:1 7:2 5:2 | 6:2 5:2 4:1 5:1 6:6~ r:4 '
  + '| r:4 11:2 11:2 13:3 11:1 9:2 8:2 | 9:2 8:2 7:1 8:1 7:6~ r:4 | r:4 9:2 7:2 5:3 7:1 9:2 7:2 | 8:2 6:2 4:1 6:1 8:6~ r:4'
const CHORUS = '9:3 9:1 9:2 8:2 9:4 11:4 | 10:3 10:1 10:2 8:2 6:8~ | 9:3 9:1 9:2 8:2 7:4 9:4 | 7:3 7:1 7:2 5:2 7:8~ | 9:3 9:1 9:2 8:2 9:4 11:4 | 10:3 10:1 10:2 8:2 10:8~ | 9:3 9:1 9:2 8:2 7:4 6:4 | 7:12~ r:4'
const CALM = '10:8~ 9:4 7:4 | 9:12~ r:4 | 9:8~ 8:4 7:4 | 4:12~ r:4 | 10:8~ 12:4 10:4 | 9:12~ r:4 | 8:8~ 6:4 8:4 | 8:12~ r:4'
const HORNS = 'r:16 | r:8 7:1 7:1 r:1 7:1 9:2 7:2 | r:16 | r:8 6:1 6:1 r:1 6:1 8:2 6:2 | r:16 | r:8 7:1 7:1 r:1 7:1 9:2 11:2 | r:16 | r:8 8:1 8:1 r:1 8:1 6:4'
const RIFF = '7:2! r:1 7:1 r:2 9:2 r:2 7:2 r:4 | 7:2! r:1 7:1 r:2 9:2 r:2 7:1 9:1 11:1 9:1 7:2 | 6:2! r:1 6:1 r:2 8:2 r:2 6:2 r:4 | 6:2! r:1 6:1 r:2 8:2 r:2 6:1 8:1 10:1 8:1 6:2 '
  + '| 7:2! r:1 7:1 r:2 9:2 r:2 7:2 r:4 | 7:2! r:1 7:1 r:2 9:2 r:2 7:1 9:1 11:1 9:1 7:2 | 8:2! r:1 8:1 r:2 10:2 r:2 8:2 r:4 | 8:2 r:2 8:2 r:2 10:1 10:1 10:1 10:1 13:4'
const FINAL = '9:3 9:1 9:2 8:2 9:4 11:4 | 9:3 9:1 9:2 7:2 9:8~ | 8:2! r:1 8:1 r:2 8:2 r:2 8:6 | 7:12~ r:4'
const sung = { low: .56, high: .9, glide: 3 }, brass = { glide: 0, low: .64, high: .94 }
const voz = { 1: tune(VERSE, 1, 131, sung), 2: tune(CHORUS, 2, 132, sung), 3: tune(CALM, 3, 133, { low: .42, high: .66, jitter: 2 }), 6: tune(FINAL, 6, 134, sung) }
const coro = { 2: harmony(CHORUS, 2, 141, sung), 6: harmony(FINAL, 6, 142, sung) }
const trumpet = { 1: tune(HORNS, 1, 151, brass), 2: tune(HORNS, 2, 152, brass), 5: tune(RIFF, 5, 153, { ...brass, low: .78, high: .98 }), 6: tune(FINAL, 6, 154, brass) }
const sax = { 1: harmony(HORNS, 1, 161, brass), 2: harmony(HORNS, 2, 162, brass), 5: harmony(RIFF, 5, 163, { ...brass, low: .76, high: .96 }), 6: harmony(FINAL, 6, 164, brass) }

const PARTS = finish([
  Q('a1', 'Basse', 'bass', 'phrase', V.bass({ gain: .46, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Grosse caisse', 'rhythm', 'pulse', V.kick({ gain: .32, panWidth: 0 }), kick, on(...ALL)),
  Q('b1', 'Clavier marimba', 'harmony', 'phrase', V.marimba({ gain: .7, pan: .22, panWidth: .3 }), keys, on(...ALL)),
  Q('b2', 'Sabar · mbung mbung', 'rhythm', 'pulse', V.conga({ gain: .36, pan: -.2 }), mbung, on(...ALL)),
  Q('c1', 'Guitare', 'harmony', 'phrase', V.muted({ gain: .4, pan: -.32 }), guitar, on(...ALL)),
  Q('c2', 'Sabar · nder', 'rhythm', 'pulse', V.bongo({ gain: .56, pan: .24, reverb: .12 }), nder, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('d1', 'Chanteur', 'melody', 'sustain', V.voice({ gain: .4, octave: 3, pan: 0 }), voz, on(1, 2, 3, 4, 7, 8)),
  Q('d2', 'Charleston', 'rhythm', 'pulse', V.hat({ gain: .9, pan: -.22 }), hat, on(0, 1, 2, 4, 6, 7, 8)),
  Q('e1', 'Chœur', 'response', 'sustain', V.voice({ gain: .34, pan: .2 }), coro, on(2, 7, 8)),
  Q('e2', 'Sabar · thiol', 'rhythm', 'pulse', V.tom({ gain: .3, decay: .3, pan: .1 }), thiol, on(...ALL)),
  Q('f1', 'Trompette', 'response', 'phrase', V.trumpet({ gain: .4, octave: 3, pan: -.12 }), trumpet, on(1, 2, 4, 5, 7, 8)),
  Q('f2', 'Maracas', 'rhythm', 'pulse', V.shaker({ gain: .26, pan: .32 }), shaker, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('g1', 'Saxophone ténor', 'response', 'phrase', V.sax({ gain: .3, pan: .14 }), sax, on(1, 2, 4, 5, 7, 8)),
  Q('g2', 'Cercle', 'rhythm', 'pulse', V.rim({ gain: .16, pan: .05 }), rim, on(1, 2, 3, 4, 6, 7, 8)),
  Q('h1', 'Tama', 'melody', 'phrase', V.talking({ gain: .44, pan: .1 }), tama, on(...ALL)),
  Q('h2', 'Sabar · roulement', 'rhythm', 'pulse', V.bongo({ gain: .46, pan: -.1 }), sabarRoll, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  // The interlude is close and warm; the bakk and the tama solo open the room around the drums.
  params: {
    a1: { 3: { gain: .4 } }, a2: { 3: { gain: .2, lpfRange: { first: 1800, second: 2200 } }, 5: { gain: .36 } },
    b2: { 0: { gain: .28 }, 3: { gain: .22 }, 5: { gain: .4, reverbRange: { first: .14, second: .2 } } }, e2: { 3: { gain: .2 }, 5: { gain: .34, reverbRange: { first: .16, second: .22 } } },
    c2: { 5: { gain: .5 }, 6: { gain: .5 } }, f2: { 0: { gain: .2 }, 3: { gain: .16 } }, b1: { 3: { reverbRange: { first: .24, second: .3 } } },
    d1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } }, h1: { 0: { reverbRange: { first: .2, second: .26 } }, 6: { gain: .5 } }, f1: { 5: { gain: .56 } },
  },
})
build({
  id: 'dakar-1985', kitName: 'Mbalax', profileName: 'Dakar 1985 · Mbalax', meter: '4/4', bpm: 112, root: 'E', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('mbx', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Mbalax de Dakar (Youssou N\'Dour & Le Super Étoile, Étoile de Dakar, Doudou N\'Diaye Rose): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Mbalax',
}).catch(error => { console.error(error); process.exit(1) })
