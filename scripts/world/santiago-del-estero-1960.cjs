// 1960 Santiago del Estero - Chacarera (original material).
// A peña in the monte: one guitar picks the introduction with the bombo legüero ticking on its rim, then
// the strummed guitars set the cross-rhythm (six eighths felt as two beats by the strum and as three by the
// drum head and the claps). The singer gives the copla, the duo joins on the estribillo, the violin plays
// between the verses, and the dancers' zapateo gets a section with only the bombo and the claps.
// A natural minor (Kit Harmony): Am · E · Dm, the estribillo opening on C.
// Form: guitar introduction · verse · estribillo · interlude (soft: picked guitar, voice and bandoneón) ·
// verse · zapateo (tense: bombo, heels and claps alone) · violin solo · estribillo · final.
// Run: node scripts/world/santiago-del-estero-1960.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('6/8', 'Menor natural', {
  // A minor degrees: 0 A · 1 B · 2 C · 3 D · 4 E · 5 F · 6 G.
  root: { Am: 0, E: -3, Dm: -4, G: -1, C: 2 },
  names: {
    0: ['Am', 'E', 'E', 'Am', 'Am', 'Dm', 'E', 'Am'], 1: ['Am', 'Am', 'E', 'Am', 'Dm', 'Am', 'E', 'Am'], 2: ['C', 'G', 'Am', 'Am', 'Dm', 'Am', 'E', 'Am'],
    3: ['Dm', 'Dm', 'Am', 'Am', 'Dm', 'Dm', 'E', 'E'], 4: ['Am', 'E', 'E', 'Am', 'Am', 'Dm', 'E', 'Am'], 5: ['Am', 'E'], 6: ['Dm', 'Am', 'E', 'Am'],
  },
  // The copla, the estribillo and the violin's turn are each played twice, as in the dance.
  sections: [['Intro', 8, 0], ['Verse', 16, 1], ['Chorus', 16, 2], ['Interlude', 8, 3], ['Verse', 16, 1], ['Break', 8, 5], ['Solo', 16, 4], ['Chorus', 16, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .08 },
  colour: { spread: .12, ring: .2 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const twice = notes => C.roll(8, notes)
const R = '... ...'
const END = 'X.. X.X | X.. ...'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- bombo legüero, claps and heels ----------
// The head answers on the second and third quarter of the bar; the rim keeps the eighths.
const HEAD = '..X .X.', RIM = 'x.. x.x'
const head = {
  0: beat(11, enter(4, '..o .h.')), 1: drum(1, 12, '..x .x. | ..x .xh'), 2: drum(2, 13, '..X .X. | ..X .Xx'), 3: drum(3, 14, '..o ...'),
  4: drum(4, 15, '..X .X. | ..X .Xx'), 5: drum(5, 16, 'X.X .X. | X.X XX.'), 6: beat(17, `${HEAD} | ${HEAD} | ${END}`),
}
const rim = {
  0: beat(21, 'h.. h.g | ' + rep('x.. x.h', 7)), 1: drum(1, 22, RIM), 2: drum(2, 23, 'xh. x.x'), 3: drum(3, 24, 'h.. h..'), 4: drum(4, 25, 'xh. x.x'),
  5: drum(5, 26, 'xxh xhx'), 6: beat(27, `${RIM} | ${RIM} | ${END}`),
}
// Claps in three against the strum's two.
const claps = { 2: drum(2, 31, 'x.x .x.'), 4: drum(4, 32, 'x.x .x.'), 5: drum(5, 33, 'X.X .X. | X.X .XX'), 6: beat(34, `x.x .x. | x.x .x. | ${END}`) }
const doubles = { 5: drum(5, 41, '.x. x.x'), 6: beat(42, `.h. h.h | .h. h.h`) }
const heels = { 5: drum(5, 51, 'x.x x.x | x.x xxx | xxx x.x | xxx xxx') }
const chasquido = { 1: drum(1, 61, '... x..'), 2: drum(2, 62, '... X..'), 4: drum(4, 63, '... X..'), 6: beat(64, `... X.. | ... X..`) }
const remate = { [FILL]: beat(71, 'x.x XXx') }

// ---------- guitars (lengths in eighths: six a bar) ----------
const BORDONA = '0:3! 4:2 4:1 | 0:3! 4:2 2:1'
const bordona = {
  0: riff(2, 101, '0:3 4:3 | 0:3 2:3', { gate: .9, accent: { strong: .7, beat: .62, off: .56 } }), 1: riff(2, 102, BORDONA, { gate: .84, accent: { strong: .9, beat: .78, off: .7 } }),
  2: riff(2, 103, '0:3! 4:2 7:1 | 0:3! 4:2 2:1', { gate: .84 }), 3: riff(2, 104, '0:3 4:3 | 0:6', { gate: .94, accent: { strong: .64, beat: .56, off: .5 } }), 4: riff(2, 105, '0:2! 0:1 4:2 7:1 | 0:2! 0:1 4:2 2:1', { gate: .84 }),
  6: mel('0:3! 4:2 7:1 | 0:3! 4:2 2:1 | 0:2! 0:1 0:2 0:1 | 0:6!', { gate: .84 }),
}
// Am [C E A] · E [B E, open fifth] · Dm [D F A] · G [B D G] · C [C E G]
const CHORD = { Am: [2, 4, 7], E: [1, 4, 8], Dm: [3, 5, 7], G: [1, 3, 6], C: [2, 4, 6] }
const RASGUIDO = 'x.h xh.'
const rasguido = {
  0: from(4, unroll(comp(CHORD, 0, 'o.g og.', 111, { steps: 6, length: 1 / 9 }), 8)), 1: comp(CHORD, 1, RASGUIDO, 112, { steps: 6, length: 1 / 9 }), 2: comp(CHORD, 2, 'X.h xhx', 113, { steps: 6, length: 1 / 9 }),
  4: comp(CHORD, 4, 'X.h xhx', 114, { steps: 6, length: 1 / 9 }),
  6: relative(S.hand(115, C.named(['Dm', 'Am', 'E', 'Am'], `X.h xhx | X.h xhx | X.. X.X | X.. ...`, CHORD, { steps: 6, length: 1 / 7 })), H(6)),
}
const second = {
  1: riff(1, 121, 'r:1 7:1 9:1 r:1 11:1 9:1', { gate: .8, accent: { strong: .6, beat: .56, off: .5 } }), 2: riff(1, 122, '7:1 9:1 11:1 9:1 11:1 9:1', { gate: .8, accent: { strong: .66, beat: .6, off: .52 } }),
  3: riff(2, 123, '7:1 9:1 11:1 14:3 | 7:1 9:1 11:1 9:3', { gate: .96, accent: { strong: .56, beat: .5, off: .44 } }), 4: riff(1, 124, 'r:1 7:1 9:1 r:1 11:1 9:1', { gate: .8, accent: { strong: .6, beat: .56, off: .5 } }),
}
const INTRO = '4:1 7:1 9:1 11:2 9:1 | 8:1 10:1 11:1 10:2 8:1 | 10:1 8:1 6:1 8:2 4:1 | 7:3~ 4:3 | 4:1 7:1 9:1 11:2 12:1 | 12:1 10:1 9:1 10:2 7:1 | 8:1 6:1 4:1 6:2 8:1 | 7:6~'
const ECHO = 'r:6 | r:3 4:1 6:1 7:1 | r:6 | r:3 7:1 6:1 4:1 | r:6 | r:3 7:1 9:1 11:1 | r:6 | r:3 4:1 2:1 0:1'
const pick = { low: .56, high: .9, glide: 0, jitter: 1, mel: { gate: .9 } }
const punteo = { 0: tune(INTRO, 0, 131, pick), 1: twice(tune(ECHO, 1, 132, { ...pick, low: .46, high: .7 })), 3: tune(ECHO, 3, 133, { ...pick, low: .4, high: .62 }), 6: tune('r:6 | r:6 | 4:1 7:1 9:1 11:2 9:1 | 7:6~', 6, 134, pick) }

// ---------- voice, duo, violin and bandoneón ----------
const VERSE = '4:2 4:1 7:2 6:1 | 4:3~ r:3 | 6:2 6:1 4:2 3:1 | 4:3~ r:3 | 7:2 7:1 9:2 7:1 | 7:1 6:1 4:1 4:3~ | 3:2 3:1 1:2 3:1 | 0:3~ r:3'
const CHORUS = '9:2 9:1 9:2 8:1 | 8:2 6:1 8:3~ | 7:2 7:1 9:2 7:1 | 7:6~ | 10:2 10:1 9:2 7:1 | 9:2 7:1 4:3~ | 6:2 6:1 4:2 3:1 | 0:3~ r:3'
const CALM = '10:3~ 9:2 7:1 | 7:6~ | 9:3~ 7:2 6:1 | 4:6~ | 10:3~ 12:2 10:1 | 9:6~ | 8:3~ 6:2 8:1 | 8:6~'
const BETWEEN = 'r:6 | r:3 9:1 11:1 9:1 | r:6 | r:3 7:1 9:1 11:1 | r:6 | r:6 | r:6 | r:3 9:1 8:1 7:1'
const SOLO = '11:1 9:1 7:1 9:1 11:1 14:1 | 13:1 11:1 10:1 11:2 8:1 | 10:1 11:1 13:1 15:2 13:1 | 14:3~ 11:1 9:1 7:1 | 11:2 12:1 14:2 16:1 | 14:1 12:1 10:1 12:2 10:1 | 11:1 10:1 8:1 6:1 8:1 10:1 | 11:6~'
const FINAL = '10:2 10:1 9:2 7:1 | 9:2 7:1 4:3~ | 6:2! 6:1 4:2 3:1 | 0:6~'
const sung = { low: .56, high: .88, glide: 3, jitter: 2 }, bow = { low: .56, high: .94, glide: 3, jitter: 1, mel: { gate: .94 } }
const voz = { 1: twice(tune(VERSE, 1, 141, sung)), 2: twice(tune(CHORUS, 2, 142, sung)), 3: tune(CALM, 3, 143, { low: .42, high: .64, jitter: 2 }), 6: tune(FINAL, 6, 144, sung) }
const duo = { 2: twice(harmony(CHORUS, 2, 151, sung)), 6: harmony(FINAL, 6, 152, sung) }
const violin = { 1: twice(tune(BETWEEN, 1, 161, { ...bow, low: .5, high: .76 })), 2: twice(tune('r:6 | r:6 | r:6 | r:2 9:1 11:1 12:1 14:1 | r:6 | r:6 | r:6 | r:6', 2, 162, bow)), 4: twice(tune(SOLO, 4, 163, bow)), 6: harmony(FINAL, 6, 164, bow, 7) }
const bandoneon = { 3: comp(CHORD, 3, 'o.. ...', 171, { steps: 6, length: .96 }), 6: comp(CHORD, 6, 'o.. ...', 172, { steps: 6, length: .96 }) }

const PARTS = finish([
  Q('a1', 'Guitarra · bordona', 'bass', 'phrase', V.nylon({ gain: .5, octave: 2, lpf: 2200, hpf: 50, role: 'bass', panWidth: .1 }), bordona, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('a2', 'Bombo legüero', 'rhythm', 'pulse', V.bassDrum({ gain: .36, decay: .45, pan: -.1, reverb: .14 }), head, on(...ALL)),
  Q('b1', 'Violín', 'melody', 'sustain', V.violin({ gain: 1, octave: 3, pan: .14 }), violin, on(1, 2, 4, 6, 7, 8)),
  Q('b2', 'Bombo · aro', 'rhythm', 'pulse', V.rim({ gain: .18, pan: -.16 }), rim, on(...ALL)),
  Q('c1', 'Guitarra · rasguido', 'harmony', 'phrase', V.nylon({ gain: .26, pan: -.3 }), rasguido, on(0, 1, 2, 4, 6, 7, 8)),
  Q('c2', 'Palmas', 'rhythm', 'pulse', V.palmas({ gain: .3, pan: .2 }), claps, on(2, 5, 6, 7, 8)),
  Q('d1', 'Voz', 'melody', 'sustain', V.voice({ gain: .36, octave: 2, pan: 0 }), voz, on(1, 2, 3, 4, 7, 8)),
  Q('d2', 'Chasquido', 'rhythm', 'pulse', V.brush({ gain: .3, pan: -.3 }), chasquido, on(1, 2, 4, 6, 7, 8)),
  Q('e1', 'Dúo', 'response', 'sustain', V.voice({ gain: .32, pan: .2 }), duo, on(2, 7, 8)),
  Q('e2', 'Zapateo', 'rhythm', 'pulse', V.tom({ gain: .26, decay: .12, lpf: 2600, pan: .1 }), heels, on(5)),
  Q('f1', 'Guitarra · punteo', 'melody', 'phrase', V.nylon({ gain: .4, pan: .3, role: 'lead' }), punteo, on(0, 1, 3, 4, 8)),
  Q('f2', 'Palmas · dobles', 'rhythm', 'pulse', V.clap({ gain: .26, pan: -.2 }), doubles, on(5, 8)),
  Q('g1', 'Segunda guitarra', 'harmony', 'phrase', V.steel({ gain: .26, octave: 2, pan: .1 }), second, on(1, 2, 3, 4, 6, 7)),
  Q('g2', 'Bombo · repique', 'rhythm', 'pulse', V.bongo({ gain: .36, lpf: 3600, pan: -.1 }), { 5: drum(5, 181, '... ..x | ... xxx'), 4: drum(4, 182, '... ... | ... ..x') }, on(5, 6)),
  Q('h1', 'Bandoneón', 'harmony', 'sustain', V.accordion({ gain: .16, octave: 3, pan: -.1, reverb: .2 }), bandoneon, on(3, 8)),
  Q('h2', 'Bombo · remate', 'rhythm', 'pulse', V.tom({ gain: .3, pan: -.1 }), remate, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .44 } }, a2: { 0: { gain: .26 }, 3: { gain: .22 }, 5: { gain: .42, reverbRange: { first: .18, second: .24 } } }, b2: { 0: { gain: .14 }, 3: { gain: .12 } },
    d1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } }, f1: { 0: { reverbRange: { first: .2, second: .26 } } },
  },
})
build({
  id: 'santiago-del-estero-1960', kitName: 'Chacarera', profileName: 'Santiago del Estero 1960 · Chacarera', meter: '6/8', bpm: 102, root: 'A', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('chc', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Chacarera santiagueña (Los Hermanos Ábalos, Carlos Carabajal, Sixto Palavecino): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Chacarera',
}).catch(error => { console.error(error); process.exit(1) })
