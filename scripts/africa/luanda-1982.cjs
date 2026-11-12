// 1982 Luanda - Kizomba (original material).
// The slow dance that grew out of semba and zouk: a drum machine that never hurries (kick on the beat, the
// rim and the cabasa carrying the syncopation), a round synthesizer bass that leans into each bar, an
// electric piano, a bell-like keyboard line and a nylon guitar that keeps the semba figure. The voice is
// close and soft; the saxophone answers it and takes the solo.
// D natural minor (Kit Harmony): Dm · Bb · Gm · Am, the refrain rising from Bb.
// Form: entrada (pad and guitar, then the machine one piece at a time) · verse · refrain · interlude (soft:
// electric piano, voice and cabasa) · verse · pausa (tense: the beat drops to kick and rim under held chords)
// · saxophone solo · refrain · final.
// Run: node scripts/africa/luanda-1982.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Menor natural', {
  // D minor degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 Bb · 6 C.
  root: { Dm: 0, Bb: -2, C: -1, Gm: -4, Am: -3 },
  names: {
    0: ['Dm', 'Dm', 'Bb', 'C'], 1: ['Dm', 'Bb', 'Gm', 'Am'], 2: ['Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Dm', 'Dm'],
    3: ['Gm', 'Gm', 'Dm', 'Dm', 'Gm', 'Gm', 'Am', 'Am'], 4: ['Dm', 'Bb', 'C', 'Am'], 5: ['Gm', 'Am', 'Bb', 'C', 'Gm', 'Am', 'Bb', 'Am'], 6: ['Bb', 'C', 'Dm', 'Dm'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // A machine, but programmed with a lazy fourth sixteenth and uneven accents.
  feel: { push: [0, 0, 0, 1], jitter: 0, vel: .05 },
  colour: { spread: .08, ring: .1 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const END = 'X... ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- drum machine ----------
const kick = {
  0: beat(11, enter(4, 'X... X... X... X...')), 1: drum(1, 12, 'X... X... X... X... | X... X... X... X..x'), 2: drum(2, 13, 'X... X..x X... X... | X... X..x X... X.x.'),
  3: drum(3, 14, 'o... .... o... ....'), 4: drum(4, 15, 'X... X..x X... X...'), 5: drum(5, 16, 'X... .... .... .... | X... .... ..x. ....'), 6: beat(17, `X... X..x X... X... | X... X..x X... X.x. | ${END}`),
}
// The rim carries the zouk figure: the last sixteenth of beat one, the "and" of two.
const RIM = '...x ..x. ...x ..x.'
const rim = {
  0: beat(21, enter(2, '...h ..h. ...h ..h.')), 1: drum(1, 22, RIM), 2: drum(2, 23, '...x ..x. ...x ..xh'), 3: drum(3, 24, '.... ..h. .... ..h.'),
  4: drum(4, 25, RIM), 5: drum(5, 26, '.... ..x. .... ..x.'), 6: beat(27, `${RIM} | ${RIM} | ${END}`),
}
const snare = { 2: drum(2, 31, '.... .... X... .... | .... .... X... ..x.'), 4: drum(4, 32, '.... .... X... ....'), 6: beat(33, `.... .... X... .... | .... .... X... ..x. | ${END}`) }
const CABASA = 'x.hm x.hm x.hm x.hm'
const cabasa = {
  0: beat(41, 'o.g. o.g. o.g. o.g. | o.g. o.g. o.g. o.gh | ' + rep('x.hm x.hm x.hm x.hm', 6)), 1: drum(1, 42, CABASA), 2: drum(2, 43, 'xhmh xhmh xhmh xhmx'), 3: drum(3, 44, 'o.g. o.g. o.g. o.gh'),
  4: drum(4, 45, 'xhmh xhmh xhmh xhmx'), 5: drum(5, 46, 'o.g. o.g. o.g. o.g.'), 6: beat(47, `xhmh xhmh xhmh xhmx | xhmh xhmh xhmh xhmx | ${END}`),
}
const hat = { 1: drum(1, 51, '..x. ..x. ..x. ..x.'), 2: drum(2, 52, '..x. ..x. ..x. ..xh'), 4: drum(4, 53, '..x. ..x. ..x. ..xh'), 6: beat(54, `..x. ..x. ..x. ..xh | ..x. ..x. ..x. ..xh | ${END}`) }
const conga = {
  1: drum(1, 61, '.... ...h .h.. .... | .... ...h .h.. ..h.'), 2: drum(2, 62, '..h. ...x .x.. ..h. | ..h. ...x .x.. .hx.'), 4: drum(4, 63, '..h. ...x .x.. ..h.'),
  5: drum(5, 64, '.... .... .... ..hx | .... .... ..h. x.xx'), 6: beat(65, `..h. ...x .x.. ..h. | ..h. ...x .x.. .hx. | ${END}`),
}
const clap = { 2: drum(2, 71, '.... X... .... X...'), 6: beat(72, `.... X... .... X... | .... X... .... X... | ${END}`) }
const toms = { [FILL]: beat(81, '.... .... x.o. xmXx') }

// ---------- bass, guitar and keyboards ----------
const BASS = '0:3! r:3 0:2 4:3 r:1 4:2 7:2 | 0:3! r:3 0:2 4:3 r:1 2:2 4:2'
const bassRiff = seed => riff(2, seed, BASS, { gate: .86, accent: { strong: .94, beat: .82, off: .74 }, feel: { jitter: 0 } })
const bass = {
  0: from(4, unroll(bassRiff(101), 8)), 1: bassRiff(102), 2: riff(2, 103, '0:3! r:3 0:2 4:3 7:1 4:2 2:2 | 0:3! r:3 0:2 4:3 7:1 9:2 7:2', { gate: .86 }),
  3: riff(2, 104, '0:8! r:4 4:4 | 0:8! r:4 2:4', { gate: .94 }), 4: bassRiff(105), 5: riff(1, 106, '0:14! r:2', { gate: .96 }),
  6: mel('0:3! r:3 0:2 4:3 7:1 4:2 2:2 | 0:3! r:3 0:2 4:3 7:1 9:2 7:2 | 0:3! r:3 0:2 0:8 | 0:8!', { gate: .86 }),
}
// The nylon guitar keeps the semba figure: bass note, then the chord broken upward.
const GUITAR = '0:2 r:1 7:1 9:2 11:1 9:1 r:1 7:1 9:2 11:2 9:2 | 0:2 r:1 7:1 9:2 11:1 9:1 r:1 7:1 11:2 14:2 11:2'
const guitarRiff = (seed, options) => riff(2, seed, GUITAR, { gate: .8, accent: { strong: .76, beat: .68, off: .58 }, ...options })
const guitar = {
  0: unroll(guitarRiff(111), 8), 1: guitarRiff(112), 2: guitarRiff(113), 3: riff(2, 114, '0:4 7:4 9:4 11:4 | 0:4 7:4 11:4 9:4', { gate: .94, accent: { strong: .56, beat: .5, off: .46 } }),
  4: guitarRiff(115), 6: unroll(guitarRiff(116), 2),
}
// Dm [F A D] · Bb [F Bb D] · C [E G C] · Gm [G Bb D] · Am [E A C]
const CHORD = { Dm: [2, 4, 7], Bb: [2, 5, 7], C: [1, 3, 6], Gm: [3, 5, 7], Am: [1, 4, 6] }
const piano = {
  1: comp(CHORD, 1, '..x. .... ..h. ..x.', 121, { length: 1 / 10 }), 2: comp(CHORD, 2, '..x. ..h. ..x. .h..', 122, { length: 1 / 10 }), 3: comp(CHORD, 3, 'o... .... ..h. ....', 123, { length: .4 }),
  4: comp(CHORD, 4, '..x. .... ..h. ..x.', 124, { length: 1 / 10 }), 5: comp(CHORD, 5, 'x... .... .... ....', 125, { length: .9 }),
  6: relative(S.hand(126, C.named(['Bb', 'C', 'Dm', 'Dm'], `..x. ..h. ..x. .h.. | ..x. ..h. ..x. .h.. | X... .... .... .... | X... .... .... ....`, CHORD, { length: 1 / 3 })), H(6)),
}
const pad = {
  0: comp(CHORD, 0, 'o... .... .... ....', 131, { length: .98 }), 2: comp(CHORD, 2, 'h... .... .... ....', 132, { length: .98 }), 3: comp(CHORD, 3, 'h... .... .... ....', 133, { length: .98 }),
  5: comp(CHORD, 5, 'x... .... .... ....', 134, { length: .98 }), 6: comp(CHORD, 6, 'o... .... .... ....', 135, { length: .98 }),
}
// The bell keyboard: short answers on top.
const BELL = 'r:10 14:2 11:2 9:2 | r:16 | r:10 16:2 14:2 11:2 | r:16 | r:10 14:2 11:2 9:2 | r:16 | r:8 11:2 14:2 16:2 14:2 | r:16'
const bells = {
  0: tune('r:16 | r:16 | r:16 | r:16 | r:10 14:2 11:2 9:2 | r:16 | r:8 11:2 14:2 16:2 14:2 | r:16', 0, 141, { low: .5, high: .72, glide: 0 }), 2: tune(BELL, 2, 142, { low: .56, high: .8, glide: 0 }),
  3: tune('14:8* r:8 | r:16 | 11:8* r:8 | r:16 | 14:8* r:8 | r:16 | 13:8* r:8 | r:16', 3, 143, { low: .4, high: .56, glide: 0 }), 4: tune(BELL, 4, 144, { low: .46, high: .68, glide: 0 }),
}

// ---------- voice, chorus and saxophone ----------
const VERSE = 'r:4 4:2 4:2 7:3 6:1 4:2 2:2 | 5:3 4:1 2:6~ r:6 | r:4 5:2 5:2 7:3 5:1 4:2 3:2 | 4:3 2:1 1:6~ r:6 '
  + '| r:4 7:2 7:2 9:3 7:1 6:2 4:2 | 5:3 7:1 9:6~ r:6 | r:4 5:2 5:2 7:3 5:1 4:2 3:2 | 4:3 3:1 4:8~ r:4'
const CHORUS = '9:3 9:1 9:2 7:2 9:4 11:4 | 10:3 10:1 10:2 8:2 6:8~ | 8:3 8:1 8:2 6:2 8:4 6:4 | 7:12~ r:4 | 9:3 9:1 9:2 7:2 9:4 11:4 | 10:3 10:1 10:2 8:2 10:8~ | 9:3 7:1 6:2 4:2 6:4 8:4 | 7:12~ r:4'
const CALM = '10:8~ 9:4 7:4 | 9:12~ r:4 | 9:8~ 7:4 6:4 | 4:12~ r:4 | 10:8~ 12:4 10:4 | 9:12~ r:4 | 8:8~ 6:4 8:4 | 8:12~ r:4'
const ANSWER = 'r:16 | r:8 7:2 9:2 11:4~ | r:16 | r:8 8:2 6:2 4:4~ | r:16 | r:8 11:2 12:2 14:4~ | r:16 | r:10 8:2 10:4~'
const SOLO = '11:6~ 9:2 7:2 9:2 11:4 | 12:3 11:1 9:2 7:2 9:8~ | 8:2 10:2 12:4~ 13:2 12:2 10:2 8:2 | 10:6~ 8:2 6:2 4:2 6:4 '
  + '| 14:6~ 13:2 11:2 13:2 14:4 | 16:3 14:1 12:2 11:2 9:2 11:2 12:4~ | 13:2 12:2 10:2 8:2 10:2 12:2 13:2 15:2 | 13:10~ r:6'
const FINAL = '9:3 9:1 9:2 7:2 9:4 11:4 | 10:3 10:1 10:2 8:2 10:8~ | 9:3 7:1 6:2 4:2 7:8~ | 7:12~ r:4'
const sung = { low: .5, high: .8, glide: 3, jitter: 2 }, reed = { low: .54, high: .9, glide: 4, jitter: 2, line: {} }
const voz = { 1: tune(VERSE, 1, 151, sung), 2: tune(CHORUS, 2, 152, sung), 3: tune(CALM, 3, 153, { low: .4, high: .6, jitter: 2 }), 6: tune(FINAL, 6, 154, sung) }
const coro = { 2: harmony(CHORUS, 2, 161, sung), 6: harmony(FINAL, 6, 162, sung) }
const sax = { 1: tune(ANSWER, 1, 171, reed), 4: tune(SOLO, 4, 172, { ...reed, low: .6, high: .96 }), 5: tune('r:8 9:8~ | r:8 10:8~ | r:8 9:4 11:4 | 13:12~ r:4 | r:8 9:8~ | r:8 10:8~ | r:8 11:4 13:4 | 15:12~ r:4', 5, 173, reed), 6: tune('r:16 | r:8 11:2 12:2 14:4~ | r:16 | 14:12~ r:4', 6, 174, reed) }

const PARTS = finish([
  Q('a1', 'Baixo sintetizado', 'bass', 'phrase', V.subBass({ gain: .18, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Bombo', 'rhythm', 'pulse', V.linnKick({ gain: .24, panWidth: 0 }), kick, on(...ALL)),
  Q('b1', 'Voz', 'melody', 'sustain', V.voice({ gain: .42, pan: 0, reverb: .2 }), voz, on(1, 2, 3, 4, 7, 8)),
  Q('b2', 'Aro', 'rhythm', 'pulse', V.rim808({ gain: .2, pan: .1 }), rim, on(...ALL)),
  Q('c1', 'Viola', 'harmony', 'phrase', V.nylon({ gain: .36, pan: -.3 }), guitar, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('c2', 'Cabasa', 'rhythm', 'pulse', V.linnCabasa({ gain: .34, pan: .3 }), cabasa, on(...ALL)),
  Q('d1', 'Saxofone', 'melody', 'phrase', V.sax({ gain: .3, pan: .14, reverb: .22 }), sax, on(1, 4, 5, 6, 8)),
  Q('d2', 'Tarola', 'rhythm', 'pulse', V.linnSnare({ gain: .22, pan: .05 }), snare, on(2, 6, 7, 8)),
  Q('e1', 'Coro', 'response', 'sustain', V.voice({ gain: .32, pan: .2, reverb: .2 }), coro, on(2, 7, 8)),
  Q('e2', 'Prato', 'rhythm', 'pulse', V.hat909({ gain: .34, pan: -.22 }), hat, on(1, 2, 4, 6, 7, 8)),
  Q('f1', 'Piano elétrico', 'harmony', 'phrase', V.rhodes({ gain: .1, pan: .22 }), piano, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('f2', 'Conga', 'rhythm', 'pulse', V.linnConga({ gain: .2, pan: -.14 }), conga, on(1, 2, 4, 5, 6, 7, 8)),
  Q('g1', 'Teclado · sino', 'response', 'phrase', V.fmBell({ gain: .14, octave: 3, pan: -.2, delay: .16 }), bells, on(0, 2, 3, 6, 7)),
  Q('g2', 'Palmas', 'rhythm', 'pulse', V.linnClap({ gain: .24, pan: 0 }), clap, on(2, 7, 8)),
  Q('h1', 'Cordas', 'harmony', 'sustain', V.pad({ gain: .06, pan: 0 }), pad, on(0, 2, 3, 5, 7, 8)),
  Q('h2', 'Timbalões', 'rhythm', 'pulse', V.tom909({ gain: .16, pan: -.1 }), toms, on()),
], {
  fills: { 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  // The interlude closes in around the voice; the pause leaves the room to the held chords.
  params: {
    a1: { 3: { gain: .16 } }, a2: { 3: { gain: .18, lpfRange: { first: 1800, second: 2200 } } }, c2: { 0: { gain: .24 }, 3: { gain: .22 }, 5: { gain: .22 } },
    b1: { 3: { gain: .36, reverbRange: { first: .28, second: .34 } } }, h1: { 5: { gain: .08, reverbRange: { first: .3, second: .36 } } }, d1: { 6: { gain: .34 } },
  },
})
build({
  id: 'luanda-1982', kitName: 'Kizomba', profileName: 'Luanda 1982 · Kizomba', meter: '4/4', bpm: 94, root: 'D', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('kzb', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Kizomba de Luanda (Eduardo Paim, SOS, Kassav\' como influência do zouk): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Kizomba',
}).catch(error => { console.error(error); process.exit(1) })
