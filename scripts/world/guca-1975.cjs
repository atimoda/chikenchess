// 1975 Guča - Čoček (original material).
// A brass band at the trumpet festival: the tapan (a big drum with a thin switch on its other head) starts
// the limping nine alone, short-short-short-long (2 + 2 + 2 + 3), the helikon tuba lands on each group, the
// tenor horns fill the gaps with off-beat chords, and the first trumpet tears into the tune with its
// partner a third below. The saxophone takes the solo over a held drone before everyone returns.
// D Phrygian dominant, the Hijaz colour (Kit Harmony): D · Gm · Cm · Eb.
// Form: drum, then tuba and horns · tune · refrain · interlude (soft: clarinet-like saxophone over held
// horns) · tune · stops (tense: the whole band hits the four groups) · saxophone solo · refrain · final.
// Run: node scripts/world/guca-1975.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('9/8', 'Phrygian dominant', {
  // D Hijaz degrees: 0 D · 1 Eb · 2 F# · 3 G · 4 A · 5 Bb · 6 C.
  root: { D: 0, Gm: 3, Cm: -1, Eb: 1 },
  names: {
    0: ['D'], 1: ['D', 'D', 'Gm', 'D', 'Cm', 'Cm', 'D', 'D'], 2: ['Gm', 'Gm', 'D', 'D', 'Eb', 'Eb', 'D', 'D'],
    3: ['Gm', 'Gm', 'D', 'D', 'Cm', 'Cm', 'D', 'D'], 4: ['D', 'D', 'Eb', 'D'], 5: ['Eb', 'D'], 6: ['Gm', 'Eb', 'D', 'D'],
  },
  // Nine-eighth bars are short: the tune, the refrain and the solo run sixteen bars.
  sections: [['Intro', 8, 0], ['Verse', 16, 1], ['Chorus', 16, 2], ['Interlude', 8, 3], ['Verse', 16, 1], ['Break', 8, 5], ['Solo', 16, 4], ['Chorus', 16, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .08 },
  colour: { spread: .12, ring: .18 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const twice = notes => C.roll(8, notes)
// Grids count the nine eighths as the dance does: 2 + 2 + 2 + 3.
const R = '.. .. .. ...'
const GROUPS = 'X. X. X. X..'
const END = 'X. X. X. X.X | X. .. .. ...'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- tapan, snare, cymbals ----------
const tapan = {
  0: beat(11, 'X. h. h. x.. | ' + rep('X. h. h. x.h', 7)), 1: drum(1, 12, 'X. h. x. x.h'), 2: drum(2, 13, 'X. x. x. X.x'), 3: drum(3, 14, 'o. .. .. h..'), 4: drum(4, 15, 'X. x. x. X.x'),
  5: drum(5, 16, GROUPS), 6: beat(17, `X. x. x. X.x | X. x. x. X.x | ${END}`),
}
// The switch on the thin head answers every group.
const switchStick = {
  0: beat(21, enter(2, '.h .h .h .hh')), 1: drum(1, 22, '.x .h .x .hx'), 2: drum(2, 23, '.x .x .x .xx'), 3: drum(3, 24, '.g .g .g .gg'), 4: drum(4, 25, '.x .x .x .xx'),
  5: drum(5, 26, '.. .. .. .xx'), 6: beat(27, `.x .x .x .xx | .x .x .x .xx | ${END}`),
}
const snare = {
  1: drum(1, 31, '.x .x .x .xx | .x .x .x xxx'), 2: drum(2, 32, 'xx .x xx .xx | xx .x xx xxx'), 4: drum(4, 33, '.x .x .x .xx'), 5: drum(5, 34, GROUPS),
  6: beat(35, `xx .x xx .xx | xx .x xx xxx | ${END}`),
}
const cymbal = { 2: drum(2, 41, 'X. .. .. x..'), 5: drum(5, 42, GROUPS), 6: beat(43, `X. .. .. x.. | X. .. .. x.. | ${END}`) }
const shout = { 2: drum(2, 51, '.. .. .. ... | .. .. .. ... | .. .. .. ... | .. .. .. X..'), 5: drum(5, 52, '.. .. .. ... | .. .. .. X..'), 6: beat(53, `${R} | ${R} | ${R} | X. .. .. ...`) }
const roll = { [FILL]: beat(61, 'x. xx xx XXX') }

// ---------- helikon and tenor horns (lengths in eighths: nine a bar) ----------
const TUBA = '0:2! 4:2 0:2 4:3 | 0:2! 4:2 0:2 4:2 2:1'
const tuba = {
  0: from(4, unroll(riff(2, 101, TUBA, { gate: .7 }), 8)), 1: riff(2, 102, TUBA, { gate: .7, accent: { strong: .94, beat: .84, off: .78 } }), 2: riff(2, 103, '0:2! 4:2 7:2 4:3 | 0:2! 4:2 7:2 4:2 2:1', { gate: .7 }),
  3: riff(1, 104, '0:6! 4:3', { gate: .94 }), 4: riff(2, 105, TUBA, { gate: .7 }), 5: riff(1, 106, '0:2! 0:2 0:2 0:3', { gate: .6 }),
  6: mel('0:2! 4:2 7:2 4:3 | 0:2! 4:2 7:2 4:2 2:1 | 0:2! 0:2 0:2 0:2 0:1 | 0:9!', { gate: .7 }),
}
// D [F# A D] · Gm [G Bb D] · Cm [G C Eb] · Eb [G Bb Eb]
const CHORD = { D: [2, 4, 7], Gm: [3, 5, 7], Cm: [3, 6, 8], Eb: [3, 5, 8] }
const nine = { steps: 9, length: 1 / 14 }
const OFFBEAT = '.x .x .x .xx'
const horns = {
  0: from(4, unroll(comp(CHORD, 0, '.h .h .h .hh', 111, nine), 8)), 1: comp(CHORD, 1, OFFBEAT, 112, nine), 2: comp(CHORD, 2, OFFBEAT, 113, nine), 3: comp(CHORD, 3, 'o. .. .. ...', 114, { steps: 9, length: .96 }),
  4: comp(CHORD, 4, '.h .h .h .hh', 115, nine), 5: comp(CHORD, 5, GROUPS, 116, { steps: 9, length: 1 / 10 }),
  6: relative(S.hand(117, C.named(['Gm', 'Eb', 'D', 'D'], `${OFFBEAT} | ${OFFBEAT} | ${END}`, CHORD, { steps: 9, length: 1 / 10 })), H(6)),
}

// ---------- trumpets and saxophone ----------
const TUNE = '4:1 5:1 4:1 2:1 1:1 2:1 4:3 | 5:1 4:1 2:1 1:1 0:1 1:1 2:3 | 3:1 4:1 5:1 7:1 5:1 4:1 5:3 | 4:1 2:1 1:1 2:1 1:1 0:1 0:3~ | 6:1 7:1 8:1 6:1 5:1 6:1 8:3 | 7:1 6:1 5:1 6:1 5:1 3:1 5:3 | 4:1 5:1 4:1 2:1 1:1 2:1 4:1 2:1 1:1 | 0:2! 0:2 0:2 0:3!'
const REFRAIN = '7:2 8:2 10:2 8:3 | 7:1 8:1 10:1 8:1 7:1 5:1 7:3~ | 9:2 8:2 6:2 8:3 | 7:1 6:1 4:1 6:1 4:1 2:1 4:3~ | 8:2 10:2 12:2 10:3 | 8:1 10:1 8:1 7:1 5:1 7:1 8:3~ | 7:1 8:1 7:1 6:1 4:1 6:1 7:1 6:1 4:1 | 7:2! 7:2 7:2 7:3!'
const CALM = '7:6~ 8:3 | 7:4 5:2 7:3~ | 4:6~ 5:3 | 4:9~ | 8:6~ 10:3 | 8:4 6:2 5:3~ | 4:4 5:2 4:3 | 2:2 1:2 0:5~'
const HITS = '8:2! 8:2 8:2 8:3 | 7:2! 7:2 7:2 7:3 | 8:2! 8:2 8:2 10:3 | 9:2! 8:2 7:2 7:3 | 8:2! 8:2 8:2 8:3 | 7:2! 7:2 7:2 7:3 | 8:2! 10:2 12:2 10:3 | 9:2! 8:2 7:2 7:3'
const SOLO = '7:1 8:1 9:1 11:1 9:1 8:1 9:3~ | 8:1 7:1 5:1 4:1 5:1 7:1 8:3 | 9:1 11:1 12:1 14:1 12:1 11:1 12:3~ | 11:1 9:1 8:1 9:1 8:1 7:1 7:3~ | 8:1 10:1 12:1 10:1 8:1 10:1 12:3 | 11:1 9:1 8:1 7:1 8:1 9:1 11:3~ | 9:1 8:1 7:1 5:1 4:1 5:1 7:1 5:1 4:1 | 4:6~ r:3 '
  + '| 14:2 14:1 15:1 14:2 12:3 | 11:1 12:1 14:1 12:1 11:1 9:1 11:3~ | 15:2 14:2 12:2 14:3 | 12:1 11:1 9:1 11:1 9:1 8:1 9:3~ | 8:1 9:1 11:1 9:1 8:1 9:1 11:1 12:1 14:1 | 15:2 14:2 12:2 11:3 | 9:1 8:1 7:1 8:1 7:1 5:1 4:1 5:1 7:1 | 7:9~'
const FINAL = '7:2 8:2 10:2 8:3 | 8:1 10:1 8:1 7:1 5:1 7:1 8:3~ | 7:2! 7:2 7:2 7:2 7:1 | 7:9~'
const brass = { low: .64, high: .98, glide: 0, jitter: 1, mel: { gate: .86 } }
const first = { 1: twice(tune(TUNE, 1, 121, brass)), 2: twice(tune(REFRAIN, 2, 122, brass)), 5: tune(HITS, 5, 123, { ...brass, low: .8, high: 1 }), 6: tune(FINAL, 6, 124, brass) }
const partner = { 1: twice(harmony(TUNE, 1, 131, brass)), 2: twice(harmony(REFRAIN, 2, 132, brass)), 5: harmony(HITS, 5, 133, brass), 6: harmony(FINAL, 6, 134, brass) }
const sax = { 3: tune(CALM, 3, 141, { low: .44, high: .7, glide: 3, jitter: 2 }), 4: tune(SOLO, 4, 142, { low: .6, high: .96, glide: 2, jitter: 1, mel: { gate: .92 } }) }
const drone = { 3: riff(1, 151, '0:9t', { accent: { strong: .5, beat: .5, off: .5 } }), 4: riff(1, 152, '0:9t', { accent: { strong: .56, beat: .56, off: .56 } }) }

const PARTS = finish([
  Q('a1', 'Helikon', 'bass', 'phrase', V.trombone({ gain: .46, octave: 2, lpf: 1400, hpf: 40, role: 'bass', panWidth: .1 }), tuba, on(...ALL)),
  Q('a2', 'Tapan', 'rhythm', 'pulse', V.bassDrum({ gain: .36, decay: .35, pan: -.1 }), tapan, on(...ALL)),
  Q('b1', 'Truba', 'melody', 'phrase', V.trumpet({ gain: .42, octave: 4, pan: .12 }), first, on(1, 2, 4, 5, 7, 8)),
  Q('b2', 'Tapan · prut', 'rhythm', 'pulse', V.rim({ gain: .18, pan: -.2 }), switchStick, on(...ALL)),
  Q('c1', 'Tenor horne', 'harmony', 'phrase', V.trombone({ gain: .18, octave: 3, pan: -.26 }), horns, on(...ALL)),
  Q('c2', 'Doboš', 'rhythm', 'pulse', V.snare({ gain: .44, pan: .1 }), snare, on(1, 2, 4, 5, 6, 7, 8)),
  Q('d1', 'Druga truba', 'response', 'phrase', V.trumpet({ gain: .3, octave: 3, pan: -.12 }), partner, on(1, 2, 4, 5, 7, 8)),
  Q('d2', 'Činele', 'rhythm', 'pulse', V.crash({ gain: .26, decay: .3, pan: .2 }), cymbal, on(2, 5, 7, 8)),
  Q('e1', 'Saksofon', 'melody', 'sustain', V.sax({ gain: .34, pan: .1, reverb: .2 }), sax, on(3, 6)),
  Q('e2', 'Hop!', 'response', 'pulse', V.hey({ gain: .16, pan: .3, reverb: .16 }), shout, on(2, 5, 7, 8)),
  Q('f1', 'Bas truba', 'harmony', 'sustain', V.horn({ gain: .3, octave: 2, pan: 0, role: 'pad' }), drone, on(3, 6)),
  Q('f2', 'Daire', 'rhythm', 'pulse', V.tambourine({ gain: .9, pan: .32 }), { 2: drum(2, 161, 'x. x. x. x.h'), 4: drum(4, 162, 'x. x. x. x.h'), 6: beat(163, 'x. x. x. x.h | x. x. x. x.h') }, on(2, 6, 7, 8)),
  Q('g1', 'Treća truba', 'response', 'phrase', V.trumpet({ gain: .26, octave: 3, pan: .28 }), { 2: twice(harmony(REFRAIN, 2, 171, brass, -4)), 5: harmony(HITS, 5, 172, brass, -4) }, on(2, 5, 7)),
  Q('g2', 'Doboš · rub', 'rhythm', 'pulse', V.ghost({ gain: .9, pan: .1 }), { 1: drum(1, 181, 'g. g. g. g.g'), 4: drum(4, 182, 'gg g. gg g.g') }, on(1, 4, 6)),
  Q('h1', 'Tenor horne · druga', 'harmony', 'phrase', V.trombone({ gain: .22, octave: 3, pan: .26 }), { 2: comp(CHORD, 2, '.. .x .. .x.', 191, nine), 4: comp(CHORD, 4, '.. .h .. .h.', 192, nine) }, on(2, 6, 7)),
  Q('h2', 'Tapan · prelaz', 'rhythm', 'pulse', V.tom({ gain: .3, pan: -.1 }), roll, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .46 } }, a2: { 0: { gain: .3 }, 3: { gain: .22 }, 5: { gain: .42 } }, c1: { 3: { gain: .24, reverbRange: { first: .22, second: .28 } } },
    e1: { 3: { reverbRange: { first: .26, second: .32 } }, 6: { gain: .4 } }, b1: { 5: { gain: .56 } },
  },
})
build({
  id: 'guca-1975', kitName: 'Čoček', profileName: 'Guča 1975 · Čoček', meter: '9/8', bpm: 132, root: 'D', scale: 'Phrygian dominant',
  form: FORM, parts: PARTS,
  reactions: reactions('cck', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Čoček das orquestras de metais dos Bálcãs (Bakija Bakić, Fejat Sejdić, Boban Marković; festival de Guča): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/%C4%8Co%C4%8Dek',
}).catch(error => { console.error(error); process.exit(1) })
