// 1996 Luanda - Kuduro (original material).
// The musseque party built on a drum machine: a hard kick on every beat, the tight snare on the batida
// (the last sixteenth of one, the "and" of two), claps, an off-beat hat, a cowbell and a marimba-like riff
// that is the hook. The bass is a short acid stab, the chords are rave stabs, and the crowd shouts the
// answers. Nothing here is sung: the "voice" is the animator's chant and the siren lead.
// B natural minor (Kit Harmony): Bm · G · A, with Em and F#m for the quiet part.
// Form: entrada (the riff and the cowbell alone, then the kick muffled, then the snare roll) · verse (beat
// and chant) · refrain (siren lead, stabs, everything) · interlude (soft: pad, riff and a half-time kick) ·
// verse · corte (tense: only kick, snare rolls and shouts) · riff solo · refrain · final.
// Run: node scripts/africa/luanda-1996.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Menor natural', {
  // B minor degrees: 0 B · 1 C# · 2 D · 3 E · 4 F# · 5 G · 6 A.
  root: { Bm: 0, G: -2, A: -1, Em: -4, 'F#m': -3 },
  names: {
    0: ['Bm'], 1: ['Bm', 'Bm', 'G', 'A'], 2: ['Bm', 'G', 'A', 'Bm', 'Bm', 'G', 'A', 'A'],
    3: ['Em', 'Em', 'Bm', 'Bm', 'Em', 'Em', 'F#m', 'F#m'], 4: ['Bm', 'A'], 5: ['Bm'], 6: ['Bm', 'G', 'A', 'Bm'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Programmed straight; only the accents move.
  feel: { jitter: 0, vel: .05 },
  colour: { spread: .08, ring: .08 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const END = 'X..X ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- drum machine ----------
const kick = {
  0: beat(11, enter(2, 'x... x... x... x...')), 1: drum(1, 12, 'X... X... X... X... | X... X... X... X..x'), 2: drum(2, 13, 'X..x X... X..x X... | X..x X... X..x X.x.'),
  3: drum(3, 14, 'x... .... x... ....'), 4: drum(4, 15, 'X..x X... X..x X...'), 5: drum(5, 16, 'X... X... X... X...'), 6: beat(17, `X..x X... X..x X... | X..x X... X..x X.x. | ${END}`),
}
const BATIDA = '...X ..X. ...X ..X.'
const snare = {
  0: beat(21, `${rep(R, 6)} | .... .... ..x. x.x. | x.x. xxxx XXXX XXXX`), 1: drum(1, 22, '...X ..X. ...X ..X. | ...X ..X. ...X .XX.'), 2: drum(2, 23, '...X ..X. ...X ..X. | ...X ..X. ..xX .XXx'),
  4: drum(4, 24, '...X ..X. ...X ..X. | ...X ..X. ..xX .XXx'), 5: drum(5, 25, '.... .... .... ..xx | .... .... x.x. xxxx | .... .... .... x.xx | x.x. xxxx XXXX XXXX'),
  6: beat(26, `${BATIDA} | ${BATIDA} | ${END}`),
}
const clap = {
  1: drum(1, 31, '.... X... .... X...'), 2: drum(2, 32, '.... X... .... X... | .... X... .... X.x.'), 4: drum(4, 33, '.... X... .... X...'),
  5: drum(5, 34, 'X... .... .... .... | X... .... .... .... | X... .... .... .... | X... X... X.X. X.X.'), 6: beat(35, `.... X... .... X... | .... X... .... X.x. | ${END}`),
}
const hat = {
  1: drum(1, 41, '..x. ..x. ..x. ..x.'), 2: drum(2, 42, 'h.xh h.xh h.xh h.xh'), 3: drum(3, 43, '..h. ..h. ..h. ..h.'), 4: drum(4, 44, 'h.xh h.xh h.xh h.xh'),
  6: beat(45, `h.xh h.xh h.xh h.xh | h.xh h.xh h.xh h.xh | ${END}`),
}
const openHat = { 2: drum(2, 51, '..x. ..x. ..x. ..x.'), 4: drum(4, 52, '..x. ..x. ..x. ..x.'), 6: beat(53, `..x. ..x. ..x. ..x. | ..x. ..x. ..x. ..x.`) }
const BELL = 'x.xx .x.x x.xx .x.x'
const cowbell = {
  0: beat(61, 'o.oh .o.o o.oh .o.o | ' + rep('x.xh .x.x x.xh .x.x', 7)), 1: drum(1, 62, 'x.xh .x.x x.xh .x.x'), 2: drum(2, 63, BELL), 4: drum(4, 64, BELL),
  5: drum(5, 65, 'x... x... x... x...'), 6: beat(66, `${BELL} | ${BELL} | ${END}`),
}
const toms = { 5: drum(5, 71, '.... .... .... .... | .... .... .... x.xX'), [FILL]: beat(72, '.... .... x.x. XXXx') }
// The crowd: "hey!" on the batida accents.
const hey = {
  1: drum(1, 81, '.... .... .... .... | .... .... .... X...'), 2: drum(2, 82, 'X... .... .... .... | .... .... .... X...'), 5: drum(5, 83, 'X... .... X... .... | X... .... X.X. ....'),
  6: beat(84, `X... .... .... .... | .... .... .... X... | X... .... X... .... | X... .... .... ....`),
}

// ---------- bass, riff, stabs ----------
const BASS = '0:1! r:2 0:1 r:2 0:1 r:1 7:1 r:1 0:1 r:1 0:1 r:1 4:1 6:1'
const bassRiff = (seed, options) => riff(1, seed, BASS, { gate: .7, accent: { strong: .96, beat: .84, off: .76 }, ...options })
const bass = {
  0: from(6, unroll(bassRiff(101), 8)), 1: bassRiff(102), 2: riff(2, 103, `${BASS} | 0:1! r:2 0:1 r:2 0:1 r:1 7:1 r:1 9:1 r:1 7:1 6:1 4:1 2:1`, { gate: .7 }),
  3: riff(1, 104, '0:6! r:2 0:6 r:2', { gate: .9 }), 4: bassRiff(105), 5: riff(1, 106, '0:1! r:7 0:1 r:7', { gate: .7 }),
  6: mel(`${BASS} | ${BASS} | 0:1! r:2 0:1 r:2 0:1 r:1 0:8 | 0:8!`, { gate: .7 }),
}
const HOOK = '7:1 9:1 r:1 11:1 r:1 9:1 7:1 r:1 9:1 r:1 11:1 9:1 r:1 7:1 4:1 r:1 | 7:1 9:1 r:1 11:1 r:1 9:1 7:1 r:1 9:1 r:1 11:1 14:1 r:1 11:1 9:1 r:1'
const hook = (seed, options) => riff(2, seed, HOOK, { gate: .7, accent: { strong: .86, beat: .78, off: .68 }, ...options })
const marimba = {
  0: unroll(hook(111), 8), 1: hook(112, { accent: { strong: .74, beat: .68, off: .58 } }), 2: hook(113), 3: hook(114, { accent: { strong: .6, beat: .54, off: .46 } }),
  4: riff(4, 115, `${HOOK} | 14:1 11:1 r:1 9:1 r:1 11:1 14:1 r:1 16:1 r:1 14:1 11:1 r:1 9:1 7:1 r:1 | 7:1 7:1 9:1 9:1 11:1 11:1 14:1 14:1 16:1 r:1 14:1 r:1 11:2 9:2`, { gate: .7 }), 6: unroll(hook(116), 2),
}
// Bm [D F# B] · G [D G B] · A [C# E A] · Em [E G B] · F#m [C# F# A]
const CHORD = { Bm: [2, 4, 7], G: [2, 5, 7], A: [1, 3, 6], Em: [3, 5, 7], 'F#m': [1, 4, 6] }
const STAB = 'x..x ..x. ...x ..x.'
const stab = {
  2: comp(CHORD, 2, STAB, 121, { length: 1 / 20 }), 4: comp(CHORD, 4, 'x... ..x. .... ..x.', 122, { length: 1 / 20 }), 5: comp(CHORD, 5, 'X... .... .... .... | .... .... .... ....', 123, { length: 1 / 8 }),
  6: relative(S.hand(124, C.named(['Bm', 'G', 'A', 'Bm'], `${STAB} | ${STAB} | ${END}`, CHORD, { length: 1 / 16 })), H(6)),
}
const pad = { 0: comp(CHORD, 0, 'o... .... .... ....', 131, { length: .98 }), 3: comp(CHORD, 3, 'h... .... .... ....', 132, { length: .98 }), 5: comp(CHORD, 5, 'h... .... .... ....', 133, { length: .98 }) }

// ---------- siren lead, pluck and the animator ----------
const SIREN = '7:2 7:2 9:2 7:2 6:2 4:2 6:4 | 7:2 7:2 9:2 7:2 11:4 9:4 | 8:2 8:2 10:2 8:2 6:2 5:2 6:4 | 7:8~ r:8 | 7:2 7:2 9:2 7:2 6:2 4:2 6:4 | 7:2 7:2 9:2 11:2 14:4 11:4 | 10:2 10:2 12:2 10:2 8:2 6:2 8:4 | 10:8~ r:8'
const PLUCK = 'r:8 14:1 r:1 14:1 r:1 11:2 9:2 | r:16 | r:8 13:1 r:1 13:1 r:1 12:2 10:2 | r:16 | r:8 14:1 r:1 14:1 r:1 16:2 14:2 | r:16 | r:8 13:1 r:1 12:1 r:1 10:2 8:2 | r:16'
const CHANT = '4:2 r:2 4:2 r:2 4:1 4:1 r:2 7:4 | r:16 | 4:2 r:2 4:2 r:2 4:1 4:1 r:2 2:4 | r:16 | 4:2 r:2 4:2 r:2 4:1 4:1 r:2 7:4 | r:16 | 5:2 r:2 5:2 r:2 5:1 5:1 r:2 6:4 | r:16'
const SHOUT = rep('7:2! r:6 7:2 r:2 7:1 7:1 r:2 | r:16', 4)
const siren = { 2: tune(SIREN, 2, 141, { low: .6, high: .9, glide: 3 }), 6: tune('7:2 7:2 9:2 7:2 6:2 4:2 6:4 | 7:2 7:2 9:2 7:2 11:4 9:4 | 7:3 7:3 7:2 7:8 | 7:12~ r:4', 6, 142, { low: .6, high: .9, glide: 3 }) }
const pluck = { 1: tune(PLUCK, 1, 151, { low: .5, high: .74, glide: 0 }), 2: tune(PLUCK, 2, 152, { low: .5, high: .74, glide: 0 }), 3: tune('14:4* r:12 | r:16 | 11:4* r:12 | r:16 | 14:4* r:12 | r:16 | 13:4* r:12 | r:16', 3, 153, { low: .4, high: .56, glide: 0 }) }
const chant = { 1: tune(CHANT, 1, 161, { low: .6, high: .86, glide: 0 }), 4: tune(CHANT, 4, 162, { low: .6, high: .86, glide: 0 }), 5: tune(SHOUT, 5, 163, { low: .76, high: .98, glide: 0 }) }
const bells = { 2: harmony(SIREN, 2, 171, { low: .4, high: .6, glide: 0 }, 7), 4: tune(PLUCK, 4, 172, { low: .5, high: .7, glide: 0 }) }

const PARTS = finish([
  Q('a1', 'Baixo ácido', 'bass', 'phrase', V.acid({ gain: .13, octave: 1, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Bombo', 'rhythm', 'pulse', V.kick909({ gain: .2, panWidth: 0 }), kick, on(...ALL)),
  Q('b1', 'Sirene', 'melody', 'phrase', V.hoover({ gain: .2, octave: 2, pan: .1 }), siren, on(2, 7, 8)),
  Q('b2', 'Tarola', 'rhythm', 'pulse', V.snare909Tight({ gain: .26, pan: .05 }), snare, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('c1', 'Acordes · stab', 'harmony', 'phrase', V.raveStab({ gain: .14, pan: -.25 }), stab, on(2, 5, 6, 7, 8)),
  Q('c2', 'Palmas', 'rhythm', 'pulse', V.clap909({ gain: .26, pan: 0 }), clap, on(1, 2, 4, 5, 6, 7, 8)),
  Q('d1', 'Animador', 'melody', 'phrase', V.chant({ gain: .3, octave: 3, pan: -.1 }), chant, on(1, 4, 5, 6)),
  Q('d2', 'Chimbal', 'rhythm', 'pulse', V.hat909({ gain: .4, pan: -.22 }), hat, on(1, 2, 3, 4, 6, 7, 8)),
  Q('e1', 'Teclado · pluck', 'response', 'phrase', V.pluck({ gain: .16, octave: 3, pan: .28, delay: .14 }), pluck, on(1, 2, 3, 4, 7)),
  Q('e2', 'Chimbal aberto', 'rhythm', 'pulse', V.openHat909({ gain: .26, pan: .22 }), openHat, on(2, 6, 7, 8)),
  Q('f1', 'Pad', 'harmony', 'sustain', V.pad({ gain: .035, pan: 0 }), pad, on(0, 3, 5)),
  Q('f2', 'Cowbell', 'rhythm', 'pulse', V.cowbell808({ gain: .1, pan: .3 }), cowbell, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('g1', 'Sino FM', 'response', 'phrase', V.fmBell({ gain: .14, octave: 2, pan: -.3 }), bells, on(2, 6, 7)),
  Q('g2', 'Hey!', 'response', 'pulse', V.hey({ gain: .18, pan: .12 }), hey, on(1, 2, 4, 5, 7, 8)),
  Q('h1', 'Marimba', 'melody', 'phrase', V.marimba({ gain: .66, octave: 3, pan: .16, panWidth: .3 }), marimba, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('h2', 'Timbalões', 'rhythm', 'pulse', V.tom909({ gain: .16, pan: -.1 }), toms, on(5)),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  // The entrance kick sounds from the next room; the interlude is half as loud.
  params: {
    a2: { 0: { gain: .14, lpfRange: { first: 500, second: 1800 } }, 3: { gain: .14, lpfRange: { first: 1600, second: 2000 } } }, a1: { 3: { gain: .1 } },
    f2: { 0: { gain: .08 } }, h1: { 3: { reverbRange: { first: .24, second: .3 } } }, b2: { 5: { reverbRange: { first: .14, second: .2 } } },
  },
})
build({
  id: 'luanda-1996', kitName: 'Kuduro', profileName: 'Luanda 1996 · Kuduro', meter: '4/4', bpm: 138, root: 'B', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('kdr', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Kuduro de Luanda (Tony Amado, Sebem, Os Lambas): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Kuduro',
}).catch(error => { console.error(error); process.exit(1) })
