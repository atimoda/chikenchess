// 1930 Kalamata - Kalamatianos (original material).
// The circle dance of the Peloponnese played by a kompania: the klarino (clarinet) opens alone over the
// violin's held note, the laouto (long-necked lute) starts the seven-beat strum, and the daouli gives the
// steps: long, short, short (3 + 2 + 2). The singer and the company trade lines; the santouri (hammered
// dulcimer) fills the air between them.
// D major (Kit Harmony): D · A · G, with B minor for the slow verse.
// Form: klarino taximi, then the laouto and the drum · verse · refrain · interlude (soft: voice, santouri and
// laouto) · verse · stamps (tense: the whole company marks the three steps) · klarino solo · refrain · final.
// Run: node scripts/world/kalamata-1930.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('7/8', 'Maior', {
  // D major degrees: 0 D · 1 E · 2 F# · 3 G · 4 A · 5 B · 6 C#.
  root: { D: 0, G: -4, A: -3, Bm: -2 },
  names: {
    0: ['D'], 1: ['D', 'D', 'A', 'D', 'D', 'G', 'A', 'D'], 2: ['G', 'D', 'A', 'D', 'G', 'D', 'A', 'D'],
    3: ['Bm', 'Bm', 'G', 'G', 'Bm', 'Bm', 'A', 'A'], 4: ['D', 'D', 'A', 'A', 'G', 'G', 'A', 'D'], 5: ['A', 'A', 'G', 'G', 'A', 'A', 'G', 'A'], 6: ['G', 'A', 'D', 'D'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .07 },
  colour: { spread: .12, ring: .18 },
})
const { C, H, FORM, FILL, on, ALL, barsOf, hand, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
// Grids in sixteenths: fourteen cells a bar, grouped as the steps (3 + 2 + 2 eighths).
const fine = { unit: 1 / 14 }
const drum = (bank, seed, text) => { const n = Math.min(4, barsOf(bank)); return C.roll(n, hand(seed, C.hits(C.tile(text, n), fine))) }
const beat = (seed, text) => hand(seed, C.hits(text, fine))
const R = '...... .... ....'
const STEPS = 'X..... X... X... | X..... X... X.X.'
const END = 'X..... X... X... | X..... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- daouli, toubeleki, defi ----------
const LOW = 'X..... x... x...'
const low = {
  0: beat(11, enter(5, 'o..... h... h...')), 1: drum(1, 12, 'X..... h... x...'), 2: drum(2, 13, 'X..... x... x... | X....x x... x...'), 3: drum(3, 14, 'o..... .... h...'),
  4: drum(4, 15, 'X..... x... x... | X....x x... x...'), 5: drum(5, 16, STEPS), 6: beat(17, `${LOW} | ${LOW} | ${END}`),
}
const switchStick = {
  1: drum(1, 21, '..x.x. ..x. ..x.'), 2: drum(2, 22, '..x.xg ..xg ..xg'), 4: drum(4, 23, '..x.xg ..xg ..xx'), 5: drum(5, 24, '...... .... ..xx | ...... .... xxxx'), 6: beat(25, `..x.xg ..xg ..xg | ..x.xg ..xg ..xg | ${END}`),
}
const goblet = {
  1: drum(1, 31, 'x...h. x... h...'), 2: drum(2, 32, 'x.h.h. x.h. x.hh'), 3: drum(3, 33, 'o..... h... ....'), 4: drum(4, 34, 'x.hhx. x.hh x.hx'), 5: drum(5, 35, STEPS), 6: beat(36, `x.h.h. x.h. x.hh | x.h.h. x.h. x.hh | ${END}`),
}
const DEFI = 'x.h.h. x.h. x.h.'
const defi = {
  0: beat(41, enter(6, 'o.g.g. o.g. o.g.')), 1: drum(1, 42, DEFI), 2: drum(2, 43, 'x.hgh. x.hg x.hg'), 3: drum(3, 44, 'o.g.g. o.g. o.g.'), 4: drum(4, 45, 'x.hgh. x.hg x.hg'),
  6: beat(46, `x.hgh. x.hg x.hg | x.hgh. x.hg x.hg | ${END}`),
}
const zilia = { 2: drum(2, 51, 'x..... x... x...'), 4: drum(4, 52, 'x..... x... x...'), 5: drum(5, 53, 'x..... x... x...'), 6: beat(54, `x..... x... x... | x..... x... x...`) }
const claps = { 2: drum(2, 61, 'x..... x... x...'), 5: drum(5, 62, STEPS), 6: beat(63, `x..... x... x... | x..... x... x... | ${END}`) }
const turn = { [FILL]: beat(71, 'x.x.xx x.xx XXXx') }

// ---------- laouto and santouri (lengths in eighths: seven a bar) ----------
const BASS = '0:3! 4:2 4:2 | 0:3! 4:2 2:2'
const bass = {
  0: from(4, unroll(riff(2, 101, BASS, { gate: .8 }), 8)), 1: riff(2, 102, BASS, { gate: .8, accent: { strong: .9, beat: .76, off: .7 } }), 2: riff(2, 103, '0:3! 4:2 7:2 | 0:3! 4:2 2:2', { gate: .8 }),
  3: riff(2, 104, '0:3! 4:4 | 0:3! 2:4', { gate: .94 }), 4: riff(2, 105, '0:2! 0:1 4:2 7:2 | 0:2! 0:1 4:2 2:2', { gate: .8 }), 5: riff(2, 106, '0:3! 0:2 0:2 | 0:3! 0:2 0:1 0:1', { gate: .6 }),
  6: mel('0:3! 4:2 7:2 | 0:3! 4:2 2:2 | 0:3! 0:2 0:2 | 0:7!', { gate: .8 }),
}
// D [F# A D] · G [G B D] · A [E A C#] · Bm [F# B D]
const CHORD = { D: [2, 4, 7], G: [3, 5, 7], A: [1, 4, 6], Bm: [2, 5, 7] }
const STRUM = 'x.h.h. x.h. x.h.'
const laouto = {
  0: from(4, unroll(comp(CHORD, 0, 'o.g.g. o.g. o.g.', 111, { length: 1 / 16 }), 8)), 1: comp(CHORD, 1, STRUM, 112, { length: 1 / 16 }), 2: comp(CHORD, 2, 'x.hhx. x.h. x.hh', 113, { length: 1 / 16 }),
  3: comp(CHORD, 3, 'o..... h... h...', 114, { length: 1 / 8 }), 4: comp(CHORD, 4, 'x.hhx. x.h. x.hh', 115, { length: 1 / 16 }), 5: comp(CHORD, 5, STEPS, 116, { length: 1 / 10 }),
  6: relative(hand(117, C.named(['G', 'A', 'D', 'D'], `x.hhx. x.h. x.hh | x.hhx. x.h. x.hh | ${END}`, CHORD, { length: 1 / 10 })), H(6)),
}
const RIPPLE = '7:1 9:1 11:1 9:1 11:1 9:1 11:1 | 7:1 9:1 11:1 14:1 11:1 9:1 11:1'
const santouri = {
  1: riff(2, 121, 'r:3 9:1 11:1 9:1 7:1 | r:3 11:1 14:1 11:1 9:1', { gate: .9, accent: { strong: .6, beat: .56, off: .5 } }), 2: riff(2, 122, RIPPLE, { gate: .9, accent: { strong: .7, beat: .62, off: .54 } }),
  3: riff(2, 123, '7:0.5 9:0.5 11:0.5 9:0.5 7:0.5 9:0.5 11:2 9:2 | 7:0.5 9:0.5 11:0.5 14:0.5 11:0.5 9:0.5 11:2 14:2', { gate: .94, accent: { strong: .56, beat: .5, off: .44 } }),
  4: riff(2, 124, RIPPLE, { gate: .9, accent: { strong: .6, beat: .54, off: .48 } }), 6: unroll(riff(2, 125, RIPPLE, { gate: .9 }), 2),
}

// ---------- klarino, violin and voices ----------
const TAXIMI = '4:7~ | 4:3 5:1 4:1 2:2 | 4:5~ 5:1 6:1 | 7:7~ | 7:2 6:1 4:2 5:2 | 4:2 2:1 1:2 2:2 | 4:1 5:1 6:1 7:2 4:2 | 4:7~'
const THEME = '4:2 5:1 4:2 2:2 | 4:1 5:1 6:1 7:2 4:2 | 6:2 5:1 4:2 3:2 | 4:3~ 2:2 0:2 | 4:2 5:1 4:2 2:2 | 3:1 5:1 7:1 5:2 3:2 | 4:2 3:1 1:2 3:2 | 0:3~ r:4'
const VERSE = 'r:3 4:2 4:2 | 4:2 5:1 4:2 2:2 | r:3 4:2 6:2 | 4:3~ r:4 | r:3 4:2 4:2 | 3:2 5:1 7:2 5:2 | 4:2 3:1 1:2 3:2 | 0:3~ r:4'
const ECHO = 'r:7 | r:7 | r:7 | r:3 2:0.5 3:0.5 4:1 2:2 | r:7 | r:7 | r:7 | r:3 4:0.5 3:0.5 2:1 0:2'
const CHORUS = '7:2 7:1 8:2 7:2 | 6:2 4:1 4:4~ | 6:2 6:1 5:2 3:2 | 4:3~ r:4 | 7:2 7:1 9:2 7:2 | 6:2 7:1 4:4~ | 6:2 5:1 3:2 1:2 | 0:3~ r:4'
const CALM = '9:3~ 7:2 5:2 | 7:7~ | 7:3~ 5:2 3:2 | 5:7~ | 9:3~ 11:2 9:2 | 7:7~ | 8:3~ 6:2 4:2 | 6:7~'
const SOLO = '7:1 8:0.5 7:0.5 6:1 7:2 9:2 | 11:2 9:1 7:1 8:1 9:2 | 8:1 9:0.5 8:0.5 6:1 8:2 10:2 | 11:3~ 10:1 8:1 6:2 | 10:1 12:0.5 10:0.5 9:1 7:2 5:2 | 7:1 9:1 10:1 12:2 10:2 | 11:1 10:1 8:1 6:1 8:1 10:2 | 11:3~ 9:2 7:2'
const STAMP = '8:3! 8:2 8:2 | 8:3! 8:2 8:1 10:1 | 7:3! 7:2 7:2 | 7:3! 7:2 7:1 9:1 | 8:3! 8:2 8:2 | 8:3! 8:2 10:2 | 9:3! 7:2 9:2 | 8:3! 10:2 11:2'
const FINAL = '7:2 7:1 9:2 7:2 | 8:2 6:1 4:4~ | 7:3! 7:2 7:2 | 7:7~'
const reed = { low: .56, high: .92, glide: 2, jitter: 1, mel: { gate: .92 } }, sung = { low: .56, high: .88, glide: 2, jitter: 1 }
const klarino = {
  0: tune(TAXIMI, 0, 131, { ...reed, low: .5, high: .8, jitter: 2 }), 1: tune(ECHO, 1, 132, { ...reed, low: .5, high: .76 }), 2: tune(THEME, 2, 133, reed), 4: tune(SOLO, 4, 134, { ...reed, low: .62, high: .98 }),
  5: tune(STAMP, 5, 135, { ...reed, glide: 0, low: .74, high: .96 }), 6: tune(FINAL, 6, 136, reed),
}
const violin = { 2: harmony(THEME, 2, 141, reed), 3: tune(CALM, 3, 142, { low: .4, high: .62, glide: 3, jitter: 2 }), 4: tune(ECHO, 4, 143, { ...reed, low: .5, high: .76 }), 5: harmony(STAMP, 5, 144, { ...reed, glide: 0 }), 6: harmony(FINAL, 6, 145, reed) }
const voz = { 1: tune(VERSE, 1, 151, sung), 2: tune(CHORUS, 2, 152, sung), 3: tune(VERSE.replace(/4:2 4:2/g, '2:2 2:2'), 3, 153, { low: .42, high: .64, jitter: 2 }), 6: tune(FINAL, 6, 154, sung) }
const coro = { 2: harmony(CHORUS, 2, 161, sung), 5: harmony(STAMP, 5, 162, { ...sung, glide: 0 }), 6: harmony(FINAL, 6, 163, sung) }
// Isokratima: the held note under everything.
const iso = { 0: riff(1, 171, '0:7t', { accent: { strong: .5, beat: .5, off: .5 } }), 3: riff(1, 172, '0:7t', { accent: { strong: .44, beat: .44, off: .44 } }), 5: riff(1, 173, '0:7t', { accent: { strong: .56, beat: .56, off: .56 } }) }

const PARTS = finish([
  Q('a1', 'Laouto · bassa', 'bass', 'phrase', V.nylon({ gain: .66, octave: 2, lpf: 2200, hpf: 50, role: 'bass', panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Daouli', 'rhythm', 'pulse', V.bassDrum({ gain: .34, decay: .4, pan: -.1 }), low, on(...ALL)),
  Q('b1', 'Klarino', 'melody', 'sustain', V.clarinet({ gain: .54, octave: 4, pan: .1 }), klarino, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('b2', 'Daouli · verga', 'rhythm', 'pulse', V.rim({ gain: .16, pan: -.2 }), switchStick, on(1, 2, 4, 5, 6, 7, 8)),
  Q('c1', 'Laouto', 'harmony', 'phrase', V.steel({ gain: .3, pan: -.3 }), laouto, on(...ALL)),
  Q('c2', 'Defi', 'rhythm', 'pulse', V.tambourine({ gain: .9, pan: .3 }), defi, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('d1', 'Tragoudistis', 'melody', 'sustain', V.voice({ gain: .36, pan: 0 }), voz, on(1, 2, 3, 4, 7, 8)),
  Q('d2', 'Toubeleki', 'rhythm', 'pulse', V.bongo({ gain: .44, pan: .18 }), goblet, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('e1', 'Choros', 'response', 'sustain', V.voice({ gain: .32, pan: .2 }), coro, on(2, 5, 7, 8)),
  Q('e2', 'Zilia', 'rhythm', 'pulse', V.triangle({ gain: .14, pan: -.3 }), zilia, on(2, 5, 6, 7, 8)),
  Q('f1', 'Violi', 'response', 'sustain', V.violinForte({ gain: .5, octave: 4, pan: -.14 }), violin, on(2, 3, 5, 6, 7, 8)),
  Q('f2', 'Palamakia', 'rhythm', 'pulse', V.clap({ gain: .3, pan: .1 }), claps, on(2, 5, 7, 8)),
  Q('g1', 'Santouri', 'harmony', 'phrase', V.harpsichord({ gain: .4, octave: 4, pan: .26 }), santouri, on(1, 2, 3, 4, 6, 7, 8)),
  Q('g2', 'Koutalia', 'rhythm', 'pulse', V.clave808({ gain: .1, pan: .34 }), { 2: drum(2, 181, '..x.x. ..x. ..x.'), 4: drum(4, 182, '..x.x. ..x. ..xx') }, on(2, 6, 7)),
  Q('h1', 'Isokratima', 'harmony', 'sustain', V.viola({ gain: .3, pan: 0 }), iso, on(0, 3, 5)),
  Q('h2', 'Daouli · gyrisma', 'rhythm', 'pulse', V.tom({ gain: .3, pan: -.1 }), turn, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .44 } }, a2: { 0: { gain: .26 }, 3: { gain: .22 } }, c1: { 3: { reverbRange: { first: .22, second: .28 } } }, b1: { 0: { reverbRange: { first: .24, second: .3 } } },
    d1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } }, g1: { 3: { reverbRange: { first: .24, second: .3 } } },
  },
})
build({
  id: 'kalamata-1930', kitName: 'Kalamatianos', profileName: 'Kalamata 1930 · Kalamatianos', meter: '7/8', bpm: 210, root: 'D', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('klm', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Kalamatianos do Peloponeso (kompania de klarino, violino, laouto e santouri; gravações dimotiká dos anos 1930): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Kalamatianos',
}).catch(error => { console.error(error); process.exit(1) })
