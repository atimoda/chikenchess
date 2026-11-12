// 1960 Cairo - Baladi (original material).
// A firqa on a Cairo stage: the oud opens alone, almost out of time, over the nay's breath; the tabla enters
// with the doum of the maqsum and the riq follows. The singer's lines are answered by the violins (the
// lazma); the chorus thickens the rhythm into the heavy baladi (doum doum · tek doum · tek); the nay takes
// the calm passage, the tabla has its solo in calls and answers, and the accordion improvises over the saidi.
// D Phrygian dominant, the hijaz colour (Kit Harmony): D · Gm · Cm.
// Form: oud and nay, then tabla · verse (maqsum) · chorus (baladi) · interlude (soft: nay over a drone) ·
// verse · break (tense: tabla solo) · accordion solo (saidi) · chorus · final.
// Run: node scripts/world/cairo-1960.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Phrygian dominant', {
  // D Phrygian dominant degrees: 0 D · 1 Eb · 2 F# · 3 G · 4 A · 5 Bb · 6 C.
  root: { D: 0, Gm: 3, Cm: -1 },
  names: {
    0: ['D'], 1: ['D', 'D', 'Gm', 'Gm', 'Cm', 'Cm', 'D', 'D'], 2: ['Gm', 'D', 'Cm', 'D'],
    3: ['D', 'D', 'Gm', 'D'], 4: ['D', 'D', 'Gm', 'D'], 5: ['D'], 6: ['Gm', 'Cm', 'D', 'D'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .08 },
  colour: { spread: .12, ring: .18 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const END = 'X.X. ..X. X... X... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`
// The tabla solo: two bars of call, two of answer, twice.
const CALL = 'X.X. ..X. X... .... | X.XX ..X. X... ....'

// ---------- tabla (doum, tek, ka), riq, daff, sagat, dohola ----------
// Maqsum: doum tek · tek doum · tek ·   Baladi: doum doum · tek doum · tek ·   Saidi: doum tek · doum doum · tek ·
const doum = {
  0: beat(11, enter(4, 'x... .... x... ....')), 1: drum(1, 12, 'X... .... X... ....'), 2: drum(2, 13, 'X.X. .... X... ....'), 3: drum(3, 14, 'h... .... h... ....'),
  4: drum(4, 15, 'X... ..X. X... ....'), 5: drum(5, 16, `${CALL} | X.X. ..X. X.X. ..X. | X... X... X.X. X...`), 6: beat(17, `X.X. .... X... .... | X.X. .... X... .... | ${END}`),
}
const tek = {
  0: beat(21, enter(5, '..h. ..h. .... h...')), 1: drum(1, 22, '..x. ..x. .... x... | ..x. ..x. .... x.x.'), 2: drum(2, 23, '.... ..X. .... X... | .... ..X. .... X.xx'), 3: drum(3, 24, '.... ..h. .... h...'),
  4: drum(4, 25, '..X. .... .... X... | ..X. .... .... X.xx'), 5: drum(5, 26, `${rep(R, 2)} | .x.x xx.x .x.x xxxx | .x.x xx.x .xxx xXxX | ${rep(R, 2)} | .x.x xx.x .x.x xx.x | .xxx .xxx .x.x .xXX`),
  6: beat(27, `.... ..X. .... X... | .... ..X. .... X.xx | ${END}`),
}
// Ka: the left hand's quiet strokes between the strong ones.
const ka = {
  1: drum(1, 31, '.g.g gg.g .ggg .ggg'), 2: drum(2, 32, '.g.g gg.g .ggg .g.g'), 4: drum(4, 33, '.g.g gg.g .g.g .ggg | .g.g gg.g .ggg .g..'), 6: beat(34, '.g.g gg.g .ggg .g.g | .g.g gg.g .ggg .g..'),
}
const riq = {
  0: beat(41, enter(6, 'x.hh x.hh x.hh x.hh')), 1: drum(1, 42, 'x.hh x.hh x.hh x.hh'), 2: drum(2, 43, 'X.hx h.xh X.hx h.xh'), 3: drum(3, 44, 'o... h... o... h...'),
  4: drum(4, 45, 'x.hh x.hh x.hh x.hh'), 5: drum(5, 46, `${CALL} | ${rep(R, 2)} | ${CALL} | ${R} | X.hx h.xh X.hx XXXX`), 6: beat(47, `X.hx h.xh X.hx h.xh | X.hx h.xh X.hx h.xh | ${END}`),
}
const daff = { 2: drum(2, 51, 'X... ..x. X... x...'), 4: drum(4, 52, 'x... ..x. x... ....'), 5: drum(5, 53, `${CALL} | ${rep(R, 2)}`), 6: beat(54, `X... ..x. X... x... | X... ..x. X... x... | ${END}`) }
const sagat = { 2: drum(2, 61, 'x.xx x.xx x.xx x.xx'), 4: drum(4, 62, 'h.hh h.hh h.hh h.hh'), 6: beat(63, `x.xx x.xx x.xx x.xx | x.xx x.xx x.xx x.xx | X... .... .... ....`) }
const dohola = { 2: drum(2, 71, 'X.X. .... X... ....'), 5: drum(5, 72, `${rep(R, 2)} | X.X. .... X... .... | X.X. .... X.X. X...`), 6: beat(73, `X.X. .... X... .... | X.X. .... X... .... | ${END}`) }
const roll = { [FILL]: beat(81, '.... .... x.xx XxXX') }

// ---------- bass, oud, qanun ----------
const bass = {
  1: riff(1, 101, '0:6! r:2 0:4 4:4', { gate: .9 }), 2: riff(1, 102, '0:2! 0:4 r:2 0:4 4:2 7:2', { gate: .86 }), 3: riff(1, 103, '0:16', { gate: .98, accent: { strong: .6, beat: .6, off: .6 } }),
  4: riff(1, 104, '0:6! 0:2 0:4 r:4', { gate: .86 }), 5: riff(4, 105, '0:2! 0:2 r:2 0:2 0:4 r:4 | 0:2! 0:1 0:1 r:2 0:2 0:4 r:4 | r:16 | r:16', { gate: .7 }),
  6: mel('0:2! 0:4 r:2 0:4 4:2 7:2 | 0:2! 0:4 r:2 0:4 4:2 7:2 | 0:2! 0:2 r:2 0:2 0:4 0:4 | 0:8!', { gate: .9 }),
}
// The oud opens alone: a short taqsim that settles on the tonic before the rhythm.
const TAQSIM = '0:4* 0:1 1:1 2:2 3:2 4:6~ | 5:2 4:2 3:2 2:2 3:1 2:1 1:2 0:4* | 4:2 5:2 7:4~ 6:2 5:2 4:2 5:2 | 4:2 3:2 2:2 1:2 0:8* '
  + '| 0:2 r:2 0:1 1:1 2:2 r:2 4:2 3:2 2:2 | 0:2 r:2 0:1 1:1 2:2 r:2 5:2 4:2 3:2 | 0:2 r:2 4:1 5:1 7:2 r:2 5:2 4:2 2:2 | 4:2 3:2 2:2 1:2 0:8'
const pluck = { glide: 0, jitter: 2, low: .5, high: .86 }
// Under the voice the oud doubles the low string and marks the rhythm.
const OUD = '0:2 r:2 0:2 7:2 r:2 0:2 4:2 7:2'
const oud = {
  0: tune(TAQSIM.replace(/(\d+):/g, (_, degree) => `${+degree + 7}:`), 0, 111, pluck), 1: riff(1, 112, OUD, { gate: .8, accent: { strong: .66, beat: .58, off: .54 } }), 2: riff(1, 113, '0:2 0:2 7:2 r:2 0:2 4:2 7:2 4:2', { gate: .8 }),
  3: riff(2, 114, '0:8 4:8 | 7:8 4:8', { gate: .96, accent: { strong: .5, beat: .46, off: .42 } }), 4: riff(1, 115, '0:2 r:2 0:2 0:2 0:2 r:2 4:2 7:2', { gate: .8 }),
  5: riff(4, 116, '0:2! 0:2 r:2 0:2 0:4 r:4 | 0:2! 0:1 0:1 r:2 0:2 0:4 r:4 | r:16 | r:16', { gate: .7 }),
  6: mel('0:2 0:2 7:2 r:2 0:2 4:2 7:2 4:2 | 0:2 0:2 7:2 r:2 0:2 4:2 7:2 4:2 | 0:2! 0:2 r:2 0:2 0:4 0:4 | 0:8!', { gate: .86 }),
}
// The qanun ripples through each chord and trembles on the long notes.
const RIPPLE = '7:1 9:1 11:1 9:1 14:1 11:1 9:1 11:1 7:1 9:1 11:1 9:1 14:1 11:1 9:1 7:1'
const qanun = {
  0: from(6, unroll(riff(1, 121, RIPPLE, { gate: .9, accent: { strong: .6, beat: .52, off: .46 } }), 8)), 1: riff(2, 122, `r:8 7:1 9:1 11:1 9:1 14:2 11:2 | r:8 14:1 11:1 9:1 11:1 7:4`, { gate: .9, accent: { strong: .6, beat: .54, off: .5 } }),
  2: riff(1, 123, RIPPLE, { gate: .9, accent: { strong: .74, beat: .62, off: .54 } }), 3: riff(2, 124, '7:1 7:1 7:1 7:1 7:1 7:1 7:1 7:1 r:8 | 11:1 11:1 11:1 11:1 11:1 11:1 11:1 11:1 r:8', { gate: .9, accent: { strong: .44, beat: .4, off: .36 } }),
  4: riff(2, 125, `r:8 7:1 9:1 11:1 9:1 14:2 11:2 | r:8 14:1 11:1 9:1 11:1 7:4`, { gate: .9, accent: { strong: .6, beat: .54, off: .5 } }),
  6: unroll(riff(1, 126, RIPPLE, { gate: .9 }), 2),
}

// ---------- singer, chorus, violins, accordion, nay ----------
const VERSE = 'r:4 4:2 4:2 5:2 4:2 3:2 2:2 | 3:6~ r:2 2:2 1:2 0:4 | r:4 4:2 5:2 7:3 5:1 4:2 3:2 | 4:2 3:6~ r:8 | r:4 6:2 6:2 8:3 6:1 5:2 4:2 | 5:6~ r:2 4:2 3:2 3:4 | r:4 4:2 3:2 2:3 1:1 0:2 1:2 | 0:8~ r:8'
const LAZMA = 'r:16 | r:16 | r:16 | r:8 7:2 5:2 4:2 3:2 | r:16 | r:16 | r:16 | r:8 4:1 5:1 4:1 3:1 2:2 1:2'
const CORO = '7:3 7:3 5:2 r:2 4:2 5:2 7:2 | 9:6~ r:2 8:2 7:2 r:4 | 8:3 8:3 6:2 r:2 5:2 6:2 8:2 | 7:8~ r:8 | 7:3 7:3 5:2 r:2 4:2 5:2 7:2 | 9:6~ r:2 8:2 7:2 r:4 | 8:3 8:3 6:2 r:2 5:2 4:2 2:2 | 0:8~ r:8'
const REPLY = 'r:16 | r:12 9:1 8:1 7:2 | r:16 | r:8 7:1 8:1 9:2 8:1 7:1 6:2 | r:16 | r:12 9:1 8:1 7:2 | r:16 | r:8 4:1 5:1 7:2 5:1 4:1 2:2'
const BREATH = '11:8~ 12:4 11:4 | 9:12~ r:4 | 10:8~ 9:4 8:4 | 7:12~ r:4 | 11:6~ 12:2 14:8~ | 12:4 11:4 9:8~ | 10:4 9:4 8:4 7:4 | 7:12~ r:4'
const DRONE = '7:16 | 7:16 | 7:16 | 7:16 | r:16 | r:16 | r:16 | r:16'
const STABS = 'r:16 | r:16 | 7:2! r:2 7:2! r:10 | 7:2! r:2 8:2! r:2 9:2! r:6 | r:16 | r:16 | 7:2! r:2 7:2! r:10 | 9:2! r:2 8:2! r:2 7:4! r:4'
const TAQSIM2 = '7:4~ 8:1 9:1 8:1 7:1 9:6~ r:2 | 11:2 9:2 8:2 7:2 8:1 7:1 6:2 4:4~ | 5:2 7:2 10:4~ 9:2 8:2 7:2 5:2 | 4:2 5:1 4:1 2:2 1:2 0:6~ r:2 '
  + '| 7:1 8:1 9:2 8:1 9:1 11:2 9:1 11:1 12:2 11:4~ | 14:4~ 12:2 11:2 9:2 8:2 7:4~ | 10:2 9:1 8:1 7:2 5:2 4:2 5:1 4:1 2:2 1:2 | 0:10~ r:6'
const FINAL = '7:3 7:3 5:2 r:2 4:2 5:2 7:2 | 8:3 8:3 6:2 r:2 5:2 4:2 2:2 | 4:2! r:2 2:2! r:2 1:2! r:2 0:2! r:2 | 0:8!'
const sung = { low: .54, high: .86, glide: 4, jitter: 2 }, bow = { glide: 3, low: .56, high: .88 }
const voz = { 1: tune(VERSE, 1, 141, sung), 2: tune(CORO, 2, 142, { ...sung, low: .6, high: .92 }) }
const coro = { 2: tune(CORO, 2, 151, sung), 6: tune(FINAL, 6, 152, sung) }
const violins = { 1: tune(LAZMA, 1, 161, bow), 2: tune(REPLY, 2, 162, bow), 5: tune(STABS, 5, 163, { ...bow, glide: 0, low: .8, high: 1 }), 6: tune(FINAL, 6, 164, bow) }
const accordion = { 2: harmony(REPLY, 2, 171, bow), 4: tune(TAQSIM2, 4, 172, { ...bow, jitter: 2 }), 5: harmony(STABS, 5, 173, { ...bow, glide: 0, low: .76, high: .96 }), 6: harmony(FINAL, 6, 174, bow) }
const nay = { 0: tune(DRONE, 0, 181, { low: .4, high: .56 }), 3: tune(BREATH, 3, 182, { low: .46, high: .72, glide: 5, jitter: 2 }) }

const PARTS = finish([
  Q('a1', 'Kontrabas', 'bass', 'phrase', V.bass({ gain: .44, attack: .008, lpf: 1200, panWidth: .1 }), bass, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('a2', 'Tabla · doum', 'rhythm', 'pulse', V.conga({ gain: .4, lpf: 2600, hpf: 60, decay: .24, pan: 0, panWidth: 0 }), doum, on(...ALL)),
  Q('b1', 'Oud', 'melody', 'phrase', V.nylon({ gain: .5, octave: 2, lpf: 3600, pan: -.2, reverb: .2 }), oud, on(...ALL)),
  Q('b2', 'Tabla · tek', 'rhythm', 'pulse', V.bongo({ gain: .46, pan: .08 }), tek, on(...ALL)),
  Q('c1', 'Qanun', 'harmony', 'phrase', V.harpsichord({ gain: .4, octave: 3, pan: .28 }), qanun, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('c2', 'Riq', 'rhythm', 'pulse', V.tambourine({ gain: .9, pan: .3 }), riq, on(...ALL)),
  Q('d1', 'Mutriba', 'melody', 'sustain', V.voice({ gain: .4, pan: 0, reverb: .2 }), voz, on(1, 2, 4, 7)),
  Q('d2', 'Daff', 'rhythm', 'pulse', V.frame({ gain: .4, lpf: 4200, pan: -.26 }), daff, on(2, 5, 6, 7, 8)),
  Q('e1', 'Koro', 'response', 'sustain', V.voice({ gain: .32, pan: .2 }), coro, on(2, 7, 8)),
  Q('e2', 'Sagat', 'rhythm', 'pulse', V.triangle({ gain: .14, decay: .12, pan: -.32 }), sagat, on(2, 6, 7, 8)),
  Q('f1', 'Kamanjat', 'response', 'sustain', V.violinForte({ gain: .7, octave: 4, pan: -.14 }), violins, on(1, 2, 4, 5, 7, 8)),
  Q('f2', 'Tabla · ka', 'rhythm', 'pulse', V.slap({ gain: .3, pan: .1 }), ka, on(1, 2, 4, 6, 7, 8)),
  Q('g1', 'Akkordion', 'response', 'sustain', V.accordion({ gain: .16, octave: 3, pan: .14 }), accordion, on(2, 5, 6, 7, 8)),
  Q('g2', 'Dohola', 'rhythm', 'pulse', V.tom({ gain: .3, decay: .3, lpf: 2200, pan: -.1 }), dohola, on(2, 5, 7, 8)),
  Q('h1', 'Nay', 'texture', 'sustain', V.worldFlute({ gain: .3, octave: 3, pan: .1, reverb: .26 }), nay, on(0, 3)),
  Q('h2', 'Tabla · sarba', 'rhythm', 'pulse', V.bongo({ gain: .44, decay: .1, pan: .08 }), roll, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .36 } }, a2: { 0: { gain: .3 }, 3: { gain: .26 } }, c2: { 0: { gain: .7 }, 3: { gain: .6 } },
    b1: { 0: { gain: .62, reverbRange: { first: .26, second: .32 } }, 1: { gain: .36 }, 2: { gain: .36 }, 4: { gain: .36 }, 3: { gain: .34 } },
    h1: { 0: { gain: .2 } }, g1: { 4: { gain: .26 } },
  },
})
build({
  id: 'cairo-1960', kitName: 'Baladi', profileName: 'Cairo 1960 · Baladi', meter: '4/4', bpm: 100, root: 'D', scale: 'Phrygian dominant',
  form: FORM, parts: PARTS,
  reactions: reactions('bld', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Baladi e raqs sharqi egípcios (orquestras do Cairo dos anos 1950–60, ritmos maqsum, baladi e saidi, maqam hijaz): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Baladi',
}).catch(error => { console.error(error); process.exit(1) })
