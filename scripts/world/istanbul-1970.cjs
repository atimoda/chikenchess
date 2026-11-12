// 1970 Istanbul - Anatolian rock (original material).
// A village dance tune taken into the studio: the bağlama (saz) plays the theme alone over its own drone
// strings, the darbuka answers "düm tek tek · düm tek", and then bass, drum kit, organ and the electric
// guitar pick the same five-beat cycle up. Five eighths a bar, always three plus two. The singer's lines
// turn around the fifth and fall to the tonic; the clarinet shadows them in the quiet part.
// D natural minor (Kit Harmony): Dm · C, the refrain opening on F.
// Form: saz alone, then darbuka · verse · refrain · interlude (soft: saz, clarinet, def) · verse · stops
// (tense: the band hits the three and the two under a held organ) · electric guitar solo · refrain · final.
// Run: node scripts/world/istanbul-1970.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('5/8', 'Menor natural', {
  // D minor degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 Bb · 6 C.
  root: { Dm: 0, C: -1, Bb: -2, Am: -3, Gm: 3, F: 2 },
  names: {
    0: ['Dm'], 1: ['Dm', 'Dm', 'C', 'Dm', 'Dm', 'Dm', 'C', 'Dm'], 2: ['F', 'C', 'Dm', 'Dm', 'Gm', 'C', 'Dm', 'Dm'],
    3: ['Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'Bb', 'Am', 'Am'], 4: ['Dm', 'Dm', 'C', 'C'], 5: ['Bb', 'Bb', 'C', 'C', 'Bb', 'Bb', 'Am', 'Am'], 6: ['Dm', 'C', 'Dm', 'Dm'],
  },
  // Twelve-bar sections: a 5/8 bar is short, and a section holds at most 64 eighths.
  sections: [['Intro', 8, 0], ['Verse', 12, 1], ['Chorus', 12, 2], ['Interlude', 12, 3], ['Verse', 12, 1], ['Break', 8, 5], ['Solo', 12, 4], ['Chorus', 12, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .07 },
  colour: { spread: .12, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, barsOf, hand, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
// Grids are written in sixteenths: ten cells a bar, grouped as the dance counts them (3 + 2 eighths).
const fine = { unit: 1 / 10 }
const drum = (bank, seed, text) => { const n = Math.min(4, barsOf(bank)); return C.roll(n, hand(seed, C.hits(C.tile(text, n), fine))) }
const beat = (seed, text) => hand(seed, C.hits(text, fine))
const R = '...... ....'
const STOP = 'X..... X... | X..... X.X. | X..... X... | X.X.X. X...'
const END = 'X.x.x. X... | X..... ....'
// The first n bars of a phrase, or bars picked by index.
const cut = (text, ...bars) => { const all = text.split('|').map(bar => bar.trim()); return (bars.length === 1 ? all.slice(0, bars[0]) : bars.map(i => all[i])).join(' | ') }
const twelve = text => `${text} | ${cut(text, 4)}`
const enter = (bar, groove, total = 8) => `${rep(R, bar)} | ${C.tile(groove, total - bar)}`

// ---------- darbuka, def and kit ----------
const DUM = 'X..... x...', TEK = '..x.x. ..x.'
const dum = {
  0: beat(11, enter(4, 'o..... h...')), 1: drum(1, 12, DUM), 2: drum(2, 13, 'X..... x... | X....x x...'), 3: drum(3, 14, 'o..... ....'),
  4: drum(4, 15, 'X..... x... | X....x x...'), 5: drum(5, 16, STOP), 6: beat(17, `${DUM} | ${DUM} | ${END}`),
}
const tek = {
  0: beat(21, enter(4, '..h.h. ..h.')), 1: drum(1, 22, '..x.h. ..x. | ..x.hg ..xg'), 2: drum(2, 23, '..x.xg ..xg | ..xgx. .gxx'), 3: drum(3, 24, '..g.h. ..g.'),
  4: drum(4, 25, '..x.xg ..xg | .gxgx. .gxx'), 5: drum(5, 26, STOP), 6: beat(27, `${TEK} | ${TEK} | ${END}`),
}
const def = {
  0: beat(31, enter(6, 'o.g.g. o.g.')), 1: drum(1, 32, 'x.h.h. x.h.'), 2: drum(2, 33, 'x.hgh. x.hg'), 3: drum(3, 34, 'o.g.g. o.g.'), 4: drum(4, 35, 'x.hgh. x.hg'),
  6: beat(36, `x.hgh. x.hg | x.hgh. x.hg | ${END}`),
}
const kick = {
  1: drum(1, 41, 'X..... x...'), 2: drum(2, 42, 'X..... X... | X....x X...'), 4: drum(4, 43, 'X..... X... | X....x X...'), 5: drum(5, 44, STOP),
  6: beat(45, `X..... X... | X....x X... | ${END}`),
}
const snare = {
  1: drum(1, 51, '...... ..x.'), 2: drum(2, 52, '....x. ..X. | ....x. ..Xx'), 4: drum(4, 53, '....x. ..X. | ....x. ..Xx'), 5: drum(5, 54, STOP),
  6: beat(55, `....x. ..X. | ....x. ..Xx | ${END}`),
}
const hat = {
  1: drum(1, 61, 'x.h.h. x.h.'), 2: drum(2, 62, 'x.xhx. x.xh'), 4: drum(4, 63, 'x.xhx. x.xh'), 6: beat(64, `x.xhx. x.xh | x.xhx. x.xh | ${END}`),
}
const toms = { [FILL]: beat(71, 'x.x.xx XXXx') }

// ---------- bağlama, bass, organ and guitar (lengths in eighths: five a bar) ----------
// The saz theme: three and two, ornaments in sixteenths.
const THEME = '4:1! 5:0.5 4:0.5 3:1 4:1 2:1 | 3:1! 2:0.5 3:0.5 4:1 2:1 1:1 | 4:1! 5:0.5 4:0.5 3:1 4:1 6:1 | 4:2! 3:1 2:1 0:1 | 4:1! 5:0.5 4:0.5 3:1 4:1 2:1 | 3:1! 2:0.5 3:0.5 4:1 2:1 1:1 | 2:1! 3:0.5 2:0.5 1:1 2:1 1:1 | 0:3!~ 0:1 0:1'
const ANSWER = '7:1! 8:0.5 7:0.5 6:1 7:1 4:1 | 6:1! 5:0.5 6:0.5 4:1 3:1 2:1 | 7:1! 8:0.5 7:0.5 6:1 7:1 9:1 | 8:2! 7:1 6:1 4:1 | 7:1! 8:0.5 7:0.5 6:1 7:1 4:1 | 6:1! 5:0.5 6:0.5 4:1 3:1 2:1 | 2:1! 3:0.5 2:0.5 1:1 2:1 1:1 | 0:3!~ 0:1 0:1'
const pick = { low: .6, high: .94, glide: 0, jitter: 1, mel: { gate: .82 } }
// Strummed drone strings between the phrases.
const DRONE = '0:1! 4:0.5 4:0.5 7:1 0:1 4:1'
const saz = {
  0: tune(THEME, 0, 101, pick), 1: riff(1, 102, DRONE, { gate: .7, accent: { strong: .7, beat: .62, off: .52 } }), 2: tune(twelve(ANSWER), 2, 103, { ...pick, low: .56, high: .86 }),
  3: tune(twelve(THEME), 3, 104, { ...pick, low: .46, high: .72, mel: { gate: .9 } }), 4: riff(1, 105, DRONE, { gate: .7, accent: { strong: .7, beat: .62, off: .52 } }),
  5: riff(1, 106, '0:1! r:2 0:1! r:1', { gate: .6 }), 6: tune(`7:1! 8:0.5 7:0.5 6:1 7:1 4:1 | 6:1! 5:0.5 6:0.5 4:1 3:1 2:1 | 2:1! 3:0.5 2:0.5 1:1 2:1 1:1 | 0:5!`, 6, 107, pick),
}
const BASS = '0:2! 0:1 4:1 2:1 | 0:2! 0:1 4:1 7:1'
const bassRiff = seed => riff(2, seed, BASS, { gate: .8, accent: { strong: .94, beat: .84, off: .76 }, feel: { jitter: 0 } })
const bass = {
  1: bassRiff(111), 2: riff(2, 112, '0:2! 4:1 7:1 4:1 | 0:2! 4:1 2:1 4:1', { gate: .8 }), 3: riff(2, 113, '0:3! 4:2 | 0:3! 2:2', { gate: .94 }), 4: riff(2, 114, '0:1! 0:1 4:1 7:1 4:1 | 0:1! 0:1 4:1 2:1 4:1', { gate: .8 }),
  5: riff(4, 115, '0:1! r:2 0:1! r:1 | 0:1! r:2 0:1 0:1 | 0:1! r:2 0:1! r:1 | 0:1 0:1 0:1 0:2', { gate: .6 }), 6: mel('0:2! 0:1 4:1 2:1 | 0:2! 0:1 4:1 7:1 | 0:1! 0:1 0:1 0:2 | 0:5!', { gate: .8 }),
}
// Dm [F A D] · C [E G C] · Bb [F Bb D] · Am [E A C] · Gm [G Bb D] · F [F A C]
const CHORD = { Dm: [2, 4, 7], C: [1, 3, 6], Bb: [2, 5, 7], Am: [1, 4, 6], Gm: [3, 5, 7], F: [2, 4, 6] }
const organ = {
  1: comp(CHORD, 1, '..x... ..h.', 121, { length: 1 / 12 }), 2: comp(CHORD, 2, 'x..... h...', 122, { length: .5 }), 3: comp(CHORD, 3, 'o..... ....', 123, { length: .96 }),
  4: comp(CHORD, 4, '..x... ..h.', 124, { length: 1 / 12 }), 5: comp(CHORD, 5, 'x..... ....', 125, { length: .96 }), 6: comp(CHORD, 6, 'x..... h...', 126, { length: .5 }),
}
const CHUG = 'x.h.x. x.h.'
const rhythm = {
  1: comp(CHORD, 1, '....x. ..x.', 131, { length: 1 / 14 }), 2: comp(CHORD, 2, CHUG, 132, { length: 1 / 14 }), 4: comp(CHORD, 4, CHUG, 133, { length: 1 / 14 }), 5: comp(CHORD, 5, STOP, 134, { length: 1 / 12 }),
  6: relative(hand(135, C.named(['Dm', 'C', 'Dm', 'Dm'], `${CHUG} | ${CHUG} | ${END}`, CHORD, { length: 1 / 12 })), H(6)),
}

// ---------- voice, clarinet and electric guitar ----------
const VERSE = 'r:1 4:1 4:1 5:1 4:1 | 3:1 4:2~ r:2 | r:1 4:1 4:1 6:1 5:1 | 4:3~ r:2 | r:1 4:1 5:1 7:1 5:1 | 4:1 3:2~ r:2 | r:1 2:1 3:1 2:1 1:1 | 0:3~ r:2 '
  + '| r:1 7:1 7:1 8:1 7:1 | 6:1 7:2~ r:2 | r:1 7:1 7:1 9:1 8:1 | 7:3~ r:2 | r:1 7:1 6:1 4:1 5:1 | 4:1 3:2~ r:2 | r:1 2:1 3:1 2:1 1:1 | 0:3~ r:2'
const CHORUS = '9:2 9:1 8:1 9:1 | 8:2 7:1 6:2~ | 7:2 7:1 6:1 4:1 | 4:3~ r:2 | 9:2 9:1 10:1 9:1 | 8:2 6:1 8:2~ | 7:2 6:1 4:1 6:1 | 7:3~ r:2'
const SHADOW = 'r:5 | r:5 | r:5 | r:2 4:1 3:1 2:1 | r:5 | r:5 | r:5 | r:2 2:1 1:1 0:1'
const CALM = '7:3~ 6:2 | 4:5~ | 7:3~ 9:2 | 7:5~ | 9:3~ 7:2 | 9:5~ | 8:3~ 6:2 | 8:5~'
const HITS = '9:1! r:2 9:1! r:1 | 9:1! r:2 9:1 10:1 | 10:1! r:2 10:1! r:1 | 10:1 9:1 8:1 10:2 | 9:1! r:2 9:1! r:1 | 9:1! r:2 9:1 10:1 | 8:1! r:2 8:1! r:1 | 8:1 10:1 11:1 13:2'
const SOLO = '7:1 8:0.5 7:0.5 6:1 7:1 9:1 | 11:2~ 9:1 8:1 7:1 | 6:1 7:0.5 6:0.5 4:1 6:1 8:1 | 9:3~ 8:1 6:1 | 11:1 12:0.5 11:0.5 9:1 11:1 13:1 | 14:2~ 13:1 11:1 9:1 | 10:1 11:0.5 10:0.5 8:1 6:1 8:1 | 10:3~ r:2 '
  + '| 14:1 14:1 13:1 14:1 16:1 | 14:2~ 11:1 13:1 14:1 | 13:1 12:0.5 13:0.5 10:1 12:1 13:1 | 15:3~ 13:1 12:1 | 11:1 9:1 7:1 9:1 11:1 | 13:1 11:1 9:1 8:1 7:1 | 6:1 8:1 10:1 8:1 6:1 | 7:5~'
const FINAL = '9:2 9:1 10:1 9:1 | 8:2 6:1 8:2~ | 7:1! 7:1 7:1 7:2 | 7:5~'
const sung = { low: .56, high: .88, glide: 2, jitter: 1 }, lead = { low: .6, high: .96, glide: 0, jitter: 1, mel: { gate: .9 } }
const voz = { 1: tune(cut(VERSE, 0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15), 1, 141, sung), 2: tune(twelve(CHORUS), 2, 142, sung), 6: tune(FINAL, 6, 143, sung) }
const coro = { 2: harmony(twelve(CHORUS), 2, 151, sung), 6: harmony(FINAL, 6, 152, sung) }
const clarinet = { 1: tune(twelve(SHADOW), 1, 161, { low: .5, high: .76, glide: 2 }), 3: tune(twelve(CALM), 3, 162, { low: .42, high: .66, glide: 2, jitter: 2 }), 5: tune(HITS, 5, 163, { low: .7, high: .94, glide: 0 }) }
const electric = { 2: harmony(twelve(SHADOW), 2, 171, lead, 7), 4: tune(cut(SOLO, 0, 1, 2, 3, 4, 5, 6, 7, 12, 13, 14, 15), 4, 172, lead), 5: harmony(HITS, 5, 173, lead, 0), 6: harmony(FINAL, 6, 174, lead, 0) }

const PARTS = finish([
  Q('a1', 'Bas gitar', 'bass', 'phrase', V.bass({ gain: .46, panWidth: .1 }), bass, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('a2', 'Darbuka · düm', 'rhythm', 'pulse', V.conga({ gain: .4, decay: .24, lpf: 3200, pan: -.12 }), dum, on(...ALL)),
  Q('b1', 'Bağlama', 'melody', 'phrase', V.steel({ gain: .34, pan: -.2, role: 'lead' }), saz, on(...ALL)),
  Q('b2', 'Darbuka · tek', 'rhythm', 'pulse', V.bongo({ gain: .46, pan: .16 }), tek, on(...ALL)),
  Q('c1', 'Elektro gitar · ritim', 'harmony', 'phrase', V.muted({ gain: .46, pan: .3 }), rhythm, on(1, 2, 4, 5, 6, 7, 8)),
  Q('c2', 'Def', 'rhythm', 'pulse', V.tambourine({ gain: .9, pan: .3 }), def, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('d1', 'Vokal', 'melody', 'sustain', V.voice({ gain: .38, pan: 0 }), voz, on(1, 2, 4, 7, 8)),
  Q('d2', 'Davul', 'rhythm', 'pulse', V.kick({ gain: .32, panWidth: 0 }), kick, on(1, 2, 4, 5, 6, 7, 8)),
  Q('e1', 'Koro', 'response', 'sustain', V.voice({ gain: .28, pan: .2 }), coro, on(2, 7, 8)),
  Q('e2', 'Trampet', 'rhythm', 'pulse', V.snare({ gain: .44, pan: .05 }), snare, on(1, 2, 4, 5, 6, 7, 8)),
  Q('f1', 'Klarnet', 'response', 'sustain', V.clarinet({ gain: .8, octave: 3, pan: .12 }), clarinet, on(1, 3, 4, 5)),
  Q('f2', 'Zil', 'rhythm', 'pulse', V.hat({ gain: .9, pan: -.22 }), hat, on(1, 2, 4, 6, 7, 8)),
  Q('g1', 'Elektro gitar · solo', 'melody', 'phrase', V.leadGuitar({ gain: 1, octave: 3, pan: .1, delay: .12 }), electric, on(2, 5, 6, 7, 8)),
  Q('g2', 'Tom', 'rhythm', 'pulse', V.tom({ gain: .3, pan: -.1 }), toms, on()),
  Q('h1', 'Org', 'harmony', 'sustain', V.organ({ gain: .1, octave: 3, pan: -.3 }), organ, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('h2', 'Kaşık', 'rhythm', 'pulse', V.rim({ gain: .16, pan: -.3 }), { 1: drum(1, 181, '..x.x. ..x.'), 3: drum(3, 182, '..h.h. ..h.'), 4: drum(4, 183, '..x.x. ..xx') }, on(1, 3, 4)),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .4 } }, a2: { 0: { gain: .3 }, 3: { gain: .26 } }, b2: { 0: { gain: .34 }, 3: { gain: .3 } }, b1: { 0: { gain: .4, reverbRange: { first: .2, second: .26 } }, 3: { reverbRange: { first: .2, second: .26 } } },
    h1: { 3: { gain: .12, reverbRange: { first: .22, second: .28 } } }, f1: { 3: { reverbRange: { first: .24, second: .3 } } },
  },
})
build({
  id: 'istanbul-1970', kitName: 'Anatolian rock', profileName: 'Istanbul 1970 · Anatolian rock', meter: '5/8', bpm: 210, root: 'D', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('ana', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Anadolu rock de Istambul (Barış Manço, Cem Karaca, Moğollar, Erkin Koray) sobre o ritmo türk aksağı em 5/8: referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Anatolian_rock',
}).catch(error => { console.error(error); process.exit(1) })
