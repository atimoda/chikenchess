// 1960 Barranquilla - Cumbia (original material).
// From the drum circle to the dance orchestra: a gaita (cane flute) calls alone with one maraca, the little
// llamador drum answers on every off-beat and never moves, the tambora and the alegre drum join, and then
// the bass steps in on its "one, and-a" figure with the scraping guacharaca. The clarinet carries the tune
// the gaita started; accordion and saxophones answer; the singer and the chorus share the refrain.
// A natural minor (Kit Harmony): Am · G, the refrain opening on C.
// Form: gaita and drums · verse · refrain · interlude (soft: accordion, voice, llamador and maracas) ·
// verse · tambores (tense: the drums alone with the gaita's cries) · clarinet solo · refrain · final.
// Run: node scripts/world/barranquilla-1960.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Menor natural', {
  // A minor degrees: 0 A · 1 B · 2 C · 3 D · 4 E · 5 F · 6 G.
  root: { Am: 0, G: -1, Em: -3, Dm: 3, C: 2 },
  names: {
    0: ['Am', 'Am', 'G', 'Am'], 1: ['Am', 'G', 'G', 'Am', 'Am', 'G', 'Em', 'Am'], 2: ['C', 'G', 'Am', 'Am', 'C', 'G', 'Em', 'Am'],
    3: ['Dm', 'Dm', 'Am', 'Am', 'Dm', 'Dm', 'Em', 'Em'], 4: ['Am', 'G'], 5: ['Am'], 6: ['Dm', 'Em', 'Am', 'Am'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // The shuffle of the coast: the last sixteenth of each beat a little late.
  feel: { push: [0, 0, 0, 1], jitter: 1, vel: .08 },
  colour: { spread: .12, ring: .18 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const END = 'X... ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- drums of the cumbia ----------
// The llamador ("caller") marks every off-beat and nothing else.
const CALL = '..x. ..x. ..x. ..x.'
const llamador = {
  0: beat(11, enter(1, '..h. ..h. ..h. ..h.')), 1: drum(1, 12, CALL), 2: drum(2, 13, CALL), 3: drum(3, 14, '..h. ..h. ..h. ..h.'), 4: drum(4, 15, CALL), 5: drum(5, 16, '..X. ..X. ..X. ..X.'),
  6: beat(17, `${CALL} | ${CALL} | ${END}`),
}
const TAMBORA = 'X... ..x. X... ..x.'
const tambora = {
  0: beat(21, enter(3, 'x... ..h. x... ..h.')), 1: drum(1, 22, 'X... ..h. X... ..h.'), 2: drum(2, 23, 'X... ..x. X... x.x.'), 3: drum(3, 24, 'o... .... o... ....'),
  4: drum(4, 25, 'X... ..x. X... x.x.'), 5: drum(5, 26, 'X..x ..X. X..x x.X. | X..x ..X. X.xX x.Xx'), 6: beat(27, `${TAMBORA} | ${TAMBORA} | ${END}`),
}
// Paloteo: the sticks on the tambora's wooden shell.
const paloteo = {
  0: beat(31, enter(3, '..hh ..hh ..hh ..hh')), 1: drum(1, 32, '..xh ..xh ..xh ..xh'), 2: drum(2, 33, '.xxh .xxh .xxh .xxh'), 4: drum(4, 34, '.xxh .xxh .xxh .xxh'), 5: drum(5, 35, '.xxh .xxh .xxh xxxh'),
  6: beat(36, `.xxh .xxh .xxh .xxh | .xxh .xxh .xxh .xxh | ${END}`),
}
// The alegre ("happy") drum plays around the others and takes the solo in the drum section.
const alegre = {
  0: beat(41, enter(5, 'h.x. ..hx h.x. .h.x')), 1: drum(1, 42, 'h.x. ..hx h.x. .h.x | h.x. ..hx h.xh .x.x'), 2: drum(2, 43, 'x.x. .xhx x.x. xh.x | x.xh .xhx x.x. xxhx'), 3: drum(3, 44, 'g... ..h. g... ..h.'),
  4: drum(4, 45, 'x.x. .xhx x.x. xh.x'), 5: drum(5, 46, 'X.xX .xXx X.xx XxXx | xXxx X.xX xxXx XXxX | X..X ..X. XxXx X.Xx | XxXx XxXx XXXX XXXX'), 6: beat(47, `x.x. .xhx x.x. xh.x | x.xh .xhx x.x. xxhx | ${END}`),
}
const maraca = {
  0: beat(51, 'x.h. x.h. x.h. x.h. | ' + rep('x.h. x.hh x.h. x.hh', 7)), 1: drum(1, 52, 'x.h. x.hh x.h. x.hh'), 2: drum(2, 53, 'X.hh X.hh X.hh X.hh'), 3: drum(3, 54, 'o.g. o.g. o.g. o.gg'),
  4: drum(4, 55, 'X.hh X.hh X.hh X.hh'), 5: drum(5, 56, 'X.hh X.hh X.hh X.hh'), 6: beat(57, `X.hh X.hh X.hh X.hh | X.hh X.hh X.hh X.hh | ${END}`),
}
const SCRAPE = 'x.xx x.xx x.xx x.xx'
const guacharaca = { 1: drum(1, 61, 'x.hh x.hh x.hh x.hh'), 2: drum(2, 62, SCRAPE), 4: drum(4, 63, SCRAPE), 6: beat(64, `${SCRAPE} | ${SCRAPE} | ${END}`) }
const claps = { 2: drum(2, 71, '.... x... .... x...'), 5: drum(5, 72, 'x... x... x... x...'), 6: beat(73, `.... x... .... x... | .... x... .... x... | ${END}`) }
const repique = { [FILL]: beat(81, '.... .... x.xx XXXx') }

// ---------- bass, accordion, guitar ----------
const BASS = '0:4! 4:2 4:2 0:4 4:2 2:2'
const bass = {
  0: from(4, unroll(riff(1, 101, BASS, { gate: .8 }), 8)), 1: riff(1, 102, BASS, { gate: .8, accent: { strong: .92, beat: .82, off: .74 } }), 2: riff(2, 103, `${BASS} | 0:4! 4:2 4:2 0:4 2:2 4:2`, { gate: .8 }),
  3: riff(1, 104, '0:8! 4:8', { gate: .94 }), 4: riff(2, 105, `${BASS} | 0:4! 4:2 4:2 7:4 4:2 2:2`, { gate: .8 }), 6: mel(`${BASS} | ${BASS} | 0:4! 0:2 0:2 0:8 | 0:8!`, { gate: .8 }),
}
// Am [C E A] · G [B D G] · Em [B E G] · Dm [D F A] · C [C E G]
const CHORD = { Am: [2, 4, 7], G: [1, 3, 6], Em: [1, 4, 6], Dm: [3, 5, 7], C: [2, 4, 6] }
const OFF = '..x. ..xh ..x. ..xh'
const accordion = {
  1: comp(CHORD, 1, '..x. ..x. ..x. ..x.', 111, { length: 1 / 20 }), 2: comp(CHORD, 2, OFF, 112, { length: 1 / 20 }), 3: comp(CHORD, 3, 'o... .... ..h. ....', 113, { length: .4 }),
  4: comp(CHORD, 4, OFF, 114, { length: 1 / 20 }), 6: relative(S.hand(115, C.named(['Dm', 'Em', 'Am', 'Am'], `${OFF} | ${OFF} | ${END}`, CHORD, { length: 1 / 14 })), H(6)),
}
const guitar = {
  1: riff(1, 121, '0:2 r:2 7:1 9:1 r:2 0:2 r:2 7:1 11:1 r:2', { gate: .7, accent: { strong: .7, beat: .64, off: .56 } }), 2: riff(1, 122, '0:2 7:1 9:1 11:2 9:2 0:2 7:1 9:1 11:2 9:2', { gate: .8, accent: { strong: .7, beat: .64, off: .56 } }),
  3: riff(1, 123, '0:4 7:4 9:4 11:4', { gate: .94, accent: { strong: .56, beat: .5, off: .46 } }), 4: riff(1, 124, '0:2 7:1 9:1 11:2 9:2 0:2 7:1 9:1 11:2 9:2', { gate: .8, accent: { strong: .64, beat: .58, off: .5 } }),
}

// ---------- gaita, clarinet, saxophones and voices ----------
const CALLING = '11:8~ 9:2 11:2 12:4 | 11:6~ 9:2 7:8~ | r:4 11:2 12:2 14:4 12:2 11:2 | 9:8~ r:8 | 11:3 12:1 11:2 9:2 7:2 9:2 11:4 | 12:3 11:1 9:2 7:2 9:8~ | 8:3 10:1 8:2 6:2 8:2 10:2 11:4 | 11:8~ r:8'
const TUNE = '7:3 9:1 11:2 9:2 7:2 r:2 4:2 6:2 | 8:3 6:1 4:2 6:2 8:6~ r:2 | 6:3 8:1 10:2 8:2 6:2 r:2 3:2 5:2 | 7:8~ r:8 | 7:3 9:1 11:2 9:2 7:2 r:2 9:2 11:2 | 10:3 8:1 6:2 8:2 10:6~ r:2 | 8:3 6:1 4:2 6:2 8:2 6:2 4:2 1:2 | 0:8~ r:8'
const VERSE = 'r:4 4:2 4:2 7:3 6:1 4:2 2:2 | 3:6~ r:2 1:2 3:2 6:4 | r:4 3:2 3:2 6:3 4:1 3:2 1:2 | 2:8~ r:8 | r:4 4:2 4:2 7:3 9:1 7:2 6:2 | 6:6~ r:2 6:2 8:2 10:4 | r:4 8:2 6:2 4:3 3:1 1:2 3:2 | 0:8~ r:8'
const CHORUS = '9:3 9:1 9:2 8:2 9:4 11:4 | 8:3 8:1 8:2 6:2 8:8~ | 7:3 7:1 7:2 6:2 7:4 4:4 | r:16 | 9:3 9:1 9:2 8:2 9:4 11:4 | 10:3 10:1 10:2 8:2 10:8~ | 8:3 6:1 4:2 6:2 8:4 6:4 | 7:12~ r:4'
const REEDS = 'r:16 | r:16 | r:16 | 7:2 9:2 11:2 r:2 9:2 7:2 4:4 | r:16 | r:16 | r:16 | r:8 7:2 9:2 11:4'
const CALM = '10:8~ 9:4 7:4 | 9:12~ r:4 | 9:8~ 7:4 6:4 | 4:12~ r:4 | 10:8~ 12:4 10:4 | 9:12~ r:4 | 8:8~ 6:4 8:4 | 8:12~ r:4'
const CRIES = '11:6~ r:10 | r:16 | 12:6~ r:10 | r:16 | 14:4~ 12:2 11:2 r:8 | r:16 | 11:2 12:2 14:2 12:2 11:2 12:2 14:4 | 14:8~ r:8'
const SOLO = '11:3 9:1 7:2 9:2 11:2 14:2 12:2 11:2 | 10:3 8:1 6:2 8:2 10:6~ r:2 | 11:2 12:2 14:2 16:2 14:2 12:2 11:2 9:2 | 10:6~ r:2 8:2 10:2 13:4 | 14:3 12:1 11:2 12:2 14:4~ 16:2 14:2 | 13:2 12:2 10:2 8:2 10:6~ r:2 | 11:2 9:2 7:2 9:2 11:2 12:2 14:2 16:2 | 15:10~ r:6'
const FINAL = '9:3 9:1 9:2 8:2 9:4 11:4 | 10:3 10:1 10:2 8:2 10:8~ | 7:3! 7:3 7:2 7:8 | 7:12~ r:4'
const sung = { low: .56, high: .88, glide: 3, jitter: 2 }, reed = { low: .58, high: .94, glide: 2, jitter: 1, mel: { gate: .92 } }
const gaita = { 0: tune(CALLING, 0, 131, { low: .5, high: .84, glide: 3, jitter: 2 }), 5: tune(CRIES, 5, 132, { low: .66, high: .96, glide: 3, jitter: 2 }) }
const clarinet = { 1: tune('r:16 | r:8 4:2 6:2 8:4 | r:16 | r:8 6:2 4:2 2:4 | r:16 | r:8 6:2 8:2 10:4 | r:16 | r:8 4:2 2:2 0:4', 1, 141, { ...reed, low: .5, high: .76 }), 2: tune(TUNE, 2, 142, reed), 4: tune(SOLO, 4, 143, reed), 6: tune(FINAL, 6, 144, reed) }
const saxes = { 2: tune(REEDS, 2, 151, { low: .6, high: .9, glide: 0 }), 4: tune(REEDS, 4, 152, { low: .5, high: .76, glide: 0 }), 6: harmony(FINAL, 6, 153, { low: .6, high: .9, glide: 0 }) }
const voz = { 1: tune(VERSE, 1, 161, sung), 2: tune(CHORUS, 2, 162, sung), 3: tune(CALM, 3, 163, { low: .42, high: .64, jitter: 2 }), 6: tune(FINAL, 6, 164, sung) }
const coro = { 2: harmony(CHORUS, 2, 171, sung), 6: harmony(FINAL, 6, 172, sung) }

const PARTS = finish([
  Q('a1', 'Bajo', 'bass', 'phrase', V.bass({ gain: .42, octave: 1, lpf: 1400, panWidth: .1 }), bass, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('a2', 'Tambora', 'rhythm', 'pulse', V.bassDrum({ gain: .34, decay: .35, pan: -.1 }), tambora, on(...ALL)),
  Q('b1', 'Clarinete', 'melody', 'sustain', V.clarinet({ gain: .7, octave: 3, pan: .1 }), clarinet, on(1, 2, 4, 6, 7, 8)),
  Q('b2', 'Llamador', 'rhythm', 'pulse', V.bongo({ gain: .44, lpf: 4200, pan: .2 }), llamador, on(...ALL)),
  Q('c1', 'Acordeón', 'harmony', 'phrase', V.accordion({ gain: .11, octave: 3, pan: -.26 }), accordion, on(1, 2, 3, 4, 6, 7, 8)),
  Q('c2', 'Guacharaca', 'rhythm', 'pulse', V.guiro({ gain: .32, pan: .32 }), guacharaca, on(1, 2, 4, 6, 7, 8)),
  Q('d1', 'Voz', 'melody', 'sustain', V.voice({ gain: .42, octave: 2, pan: 0 }), voz, on(1, 2, 3, 4, 7, 8)),
  Q('d2', 'Maracas', 'rhythm', 'pulse', V.shaker({ gain: .26, pan: -.3 }), maraca, on(...ALL)),
  Q('e1', 'Coro', 'response', 'sustain', V.voice({ gain: .32, pan: .2 }), coro, on(2, 7, 8)),
  Q('e2', 'Tambor alegre', 'rhythm', 'pulse', V.conga({ gain: .36, pan: -.2 }), alegre, on(...ALL)),
  Q('f1', 'Gaita', 'melody', 'sustain', V.flute({ gain: .5, octave: 3, pan: -.1, reverb: .22 }), gaita, on(0, 5)),
  Q('f2', 'Tambora · paloteo', 'rhythm', 'pulse', V.rim({ gain: .16, pan: -.14 }), paloteo, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('g1', 'Saxofones', 'response', 'phrase', V.sax({ gain: .3, octave: 2, pan: .2 }), saxes, on(2, 6, 7, 8)),
  Q('g2', 'Palmas', 'rhythm', 'pulse', V.palmas({ gain: .28, pan: .1 }), claps, on(2, 5, 7, 8)),
  Q('h1', 'Guitarra', 'harmony', 'phrase', V.nylon({ gain: .26, octave: 2, pan: .3 }), guitar, on(1, 2, 3, 4, 6, 7)),
  Q('h2', 'Tambora · repique', 'rhythm', 'pulse', V.tom({ gain: .3, pan: -.1 }), repique, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .4 } }, a2: { 0: { gain: .26 }, 3: { gain: .2 }, 5: { gain: .4, reverbRange: { first: .16, second: .22 } } }, e2: { 3: { gain: .2 }, 5: { gain: .44, reverbRange: { first: .14, second: .2 } } },
    d2: { 0: { gain: .2 }, 3: { gain: .16 } }, f1: { 0: { reverbRange: { first: .26, second: .32 } } }, d1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } },
  },
})
build({
  id: 'barranquilla-1960', kitName: 'Cumbia', profileName: 'Barranquilla 1960 · Cumbia', meter: '4/4', bpm: 92, root: 'A', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('cmb', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Cumbia da costa colombiana (Los Gaiteros de San Jacinto, Lucho Bermúdez, Andrés Landero): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Cumbia_(Colombia)',
}).catch(error => { console.error(error); process.exit(1) })
