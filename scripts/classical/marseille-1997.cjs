// 1997 Marseille - Orchestral rap (original material).
// Classical music sampled into hip hop: the producer drops the needle on an old symphony record, loops a
// lament of strings, a harpsichord figure and a cello ostinato on the MPC and lays a dusty breakbeat under
// them, swung the way the sampler swings. The DJ cuts in with scratches and orchestra hits, the chorus
// opens into choir and horns, the interlude lets the record play alone (a piano and cello chorale over a
// half-time beat) and the break turns epic: the symphonic bass drum, choir and the whole orchestra on the same accents.
// There is no rapper in the kit: the space over the verse loop is the MC's.
// C harmonic minor (Kit Harmony): the lament loop Cm · Ab · Fm · G, iv–V cadences and a diminished turn.
// Form: record intro (piano alone, instruments one by one) · verse · chorus · interlude (soft) · verse ·
// break (tense) · violin solo with the DJ answering · chorus · outro.
// Run: node scripts/classical/marseille-1997.cjs
const { studio, build, reactions, SAMPLE, DRUM, voice } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Harmônica menor', {
  // C harmonic minor degrees: 0 C · 1 D · 2 Eb · 3 F · 4 G · 5 Ab · 6 B.
  root: { Cm: 0, Ab: -2, Fm: -4, G: -3, 'Dø': 1, Bo: -1 },
  names: {
    0: ['Cm', 'Ab', 'Fm', 'G'], 1: ['Cm', 'Ab', 'Fm', 'G'], 2: ['Ab', 'Fm', 'Cm', 'G', 'Ab', 'Fm', 'G', 'G'],
    3: ['Fm', 'Cm', 'Dø', 'G', 'Ab', 'Fm', 'G', 'G'], 4: ['Cm', 'Ab', 'Fm', 'G'], 5: ['Cm', 'Cm', 'Bo', 'Bo', 'Cm', 'Cm', 'Ab', 'G'], 6: ['Fm', 'G', 'Cm', 'Cm'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // The sampler's swing: the second and fourth sixteenth of each beat land late; a little loose hand on top.
  feel: { push: [0, 2, 0, 2], jitter: 1, vel: .06 },
  colour: { spread: .06 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, comp, bars, figure, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const enter = (bar, groove, total = 8) => `${rep(R, bar)} | ${C.tile(groove, total - bar)}`

// ---------- the breakbeat: dusty kick, break snare and ghosts, dusty hats ----------
const KICK = 'X......x..X..... | X......x..X..x.. | X......x..X..... | X..x...x..X..x.x'
const SNARE = '....X.......X... | ....X.......X... | ....X.......X... | ....X.......X..x'
const GHOST = '.......g.g.....g | ..g....g.g...... | .......g.g.....g | ..g....g.g...gg.'
const HATS = 'x.o.x.ohx.o.x.o. | x.o.x.o.x.ohx.o. | x.o.x.ohx.o.x.o. | x.o.x.o.x.o.xhoh'
const kick = {
  0: beat(11, enter(6, KICK)), 1: drum(1, 12, KICK), 2: drum(2, 13, 'X......x..X..... | X......x..X..x.. | X......x..X..... | X..x...x.XX..x.x'),
  3: drum(3, 14, 'o............... | ........o.......'), 4: drum(4, 15, KICK),
  5: beat(16, `X..X..X......... | ${R} | X..X..X......... | ${R} | X..X..X......... | X..X..X......... | X..X..X...X..X.. | X.X.X.X.XXXXXXXX`),
  6: beat(17, `X......x..X..... | X......x..X..x.. | X............... | ${R}`),
}
const snare = {
  0: beat(21, enter(7, '....X.......X.x.')), 1: drum(1, 22, SNARE), 2: drum(2, 23, '....X.......X... | ....X.......X... | ....X.......X... | ....X.......X.xx'), 4: drum(4, 24, SNARE),
  5: beat(25, `${rep(R, 6)} | ....X.......X... | X.X.X.X.XXXXRRRR`),
  6: beat(26, '....X.......X... | ....X.......X... | ....X........... | ................'),
}
const ghost = {
  1: drum(1, 31, GHOST), 3: drum(3, 32, '............o... | ............o..g'), 4: drum(4, 33, GHOST), 6: drum(6, 34, GHOST),
}
const hats = {
  0: beat(41, enter(6, 'x.o.x.ohx.o.x.o.')), 1: drum(1, 42, HATS), 2: drum(2, 43, 'x.o.x.o.x.o.x.o. | x.o.x.o.x.o.xhoh'), 3: drum(3, 44, 'h...h...h...h...'),
  4: drum(4, 45, HATS), 6: drum(6, 46, 'xhohxhohxhohxhoh | xhohxhohxhoxXhoh'),
}
// Outro: the hats stop with the beat.
const hatsOutro = beat(47, `x.o.x.ohx.o.x.o. | x.o.x.o.x.o.xhoh | ${R} | ${R}`)

// The record under everything: surface noise retriggered every half bar (the sample lasts two seconds).
const crackle = (bars, level = 'x') => C.hits(rep(`${level}.......${level}.......`, bars), { length: .5 })
const vinyl = { 0: C.roll(1, crackle(1, 'X')), 1: C.roll(1, crackle(1, 'o')), 3: C.roll(1, crackle(1, 'X')), 4: C.roll(1, crackle(1, 'o')), 6: crackle(4, 'X').filter(n => n.start < 3) }

// ---------- the sampled orchestra ----------
// Piano figure: a low root and the chord broken upward and back, like a nocturne on a worn record.
const PIANO = { Cm: [0, 4, 7, 9], Ab: [-2, 2, 5, 7], Fm: [-4, 0, 3, 5], G: [-3, 1, 4, 6], 'Dø': [-6, 1, 3, 5], Bo: [-1, 1, 3, 5] }
const NOCTURNE = figure(PIANO, 'a:2 b:2 c:2 d:2 c:2 b:2 c:2 d:2')
const CHORALE = figure(PIANO, 'a,b,c,d:8 b,c,d:8')
const LAST = figure(PIANO, 'a,b,c,d:16')
// Choir, horns and stabs: one voicing per chord (absolute degrees).
const CHORD = { Cm: [0, 2, 4], Ab: [-2, 0, 2], Fm: [-2, 0, 3], G: [-1, 1, 4], 'Dø': [-2, 1, 3], Bo: [-1, 1, 3] }

const piano = {
  0: bars(0, 101, NOCTURNE, { accent: { strong: .78, beat: .66, off: .58 } }),
  1: riff(4, 102, '0,4:2! r:6 0,4:2 r:6 | r:16 | 0,4:2! r:6 0,4:2 r:6 | r:16', { gate: .9, accent: { strong: .62, beat: .56, off: .5 } }),
  3: bars(3, 103, CHORALE, { accent: { strong: .58, beat: .5, off: .46 } }),
  6: bars(6, 104, (name, bar) => bar < 3 ? NOCTURNE(name, bar) : LAST(name, bar), { accent: { strong: .7, beat: .6, off: .54 } }),
}
// Violins (the string section of the record): the lament loop, then pulsing quarter notes in the chorus.
const LAMENT = '4:8~ 2:8 | 5:8~ 7:8 | 5:6 3:2 5:8 | 6:12~ 4:4'
const strings = { low: .5, high: .74, jitter: 1, glide: 0 }
const violins = {
  0: from(2, tune(rep(LAMENT, 2), 0, 111, strings)),
  1: C.roll(4, tune(LAMENT, 1, 112, strings)),
  2: riff(2, 113, '4:4 4:4 2:4 2:4 | 4:4 4:4 7:4 4:4', { gate: .95, accent: { strong: .8, beat: .74, off: .68 } }),
  3: riff(1, 114, '2,4:16', { gate: 1, accent: { strong: .42 } }),
  4: riff(1, 115, '0,2,4:16', { gate: 1, accent: { strong: .46 } }),
  5: riff(2, 116, '7:3! 7:3 7:2 r:8 | 7:3! 7:3 7:2 r:4 9:2 11:2', { gate: .5, accent: { strong: .96, beat: .9, off: .86 } }),
  6: riff(4, 117, '4:16 | 4:16 | 4:16 | 2,4:16', { gate: 1, accent: { strong: .6 } }),
}
// Cellos spiccato: the ostinato under the loop, plucked steps in the interlude, hammered eighths in the break.
const OSTINATO = '0:2 4:2 7:2 4:2 0:2 4:2 7:2 4:2'
const cellos = {
  0: from(4, unroll(riff(1, 121, OSTINATO, { gate: .62 }), 8)),
  1: riff(1, 122, OSTINATO, { gate: .62, accent: { strong: .7, beat: .64, off: .56 } }),
  2: riff(1, 123, OSTINATO, { gate: .7, accent: { strong: .84, beat: .76, off: .68 } }),
  3: riff(1, 124, '0:4 r:4 4:4 r:4', { gate: .8, accent: { strong: .5, beat: .44, off: .4 } }),
  4: riff(1, 125, OSTINATO, { gate: .62 }),
  5: riff(1, 126, '0:2 0:2 0:2 0:2 0:2 0:2 0:2 0:2', { gate: .62, accent: { strong: .94, beat: .86, off: .78 } }),
  6: riff(4, 127, `${OSTINATO} | ${OSTINATO} | 0:4! r:12 | r:16`, { gate: .62 }),
}
// Harpsichord: the Baroque figure chopped into a two-beat loop (it carries the verses and the solo).
const CLAVIER = '0:1 2:1 4:1 7:1 4:1 2:1 r:2 0:1 2:1 4:1 7:1 9:2 7:2'
const harpsichord = {
  1: riff(1, 131, CLAVIER, { gate: .7, accent: { strong: .74, beat: .66, off: .6 } }),
  4: riff(2, 132, `${CLAVIER} | 0:1 2:1 4:1 7:1 4:1 2:1 r:2 0:1 2:1 4:1 7:1 4:1 2:1 0:2`, { gate: .7 }),
  5: riff(2, 133, 'r:16 | r:8 7:1 4:1 2:1 0:1 -1:1 0:1 2:1 4:1', { gate: .6 }),
}
// Solo violin: the chorus hook, a Vivaldi-like solo over the verse loop and the last phrase.
const HOOK = '7:3 7:1 9:2 7:2 5:4 4:4 | 5:3 5:1 7:2 5:2 3:4 2:4 | 4:3 4:1 7:2 4:2 2:4 0:4 | 1:4 -1:4 1:4 4:4 '
  + '| 7:3 7:1 9:2 7:2 5:4 4:4 | 5:3 5:1 7:2 5:2 3:4 2:4 | 6:3 6:1 8:2 6:2 4:4 6:4 | 6:12~ r:4'
const SOLO = '0:1 2:1 4:1 7:1 4:1 2:1 0:1 2:1 4:1 7:1 9:1 7:1 4:1 2:1 4:1 7:1 '
  + '| 5:1 7:1 9:1 12:1 9:1 7:1 5:1 7:1 9:1 12:1 14:1 12:1 9:1 7:1 9:1 12:1 '
  + '| 3:2 5:2 7:2 10:2 7:2 5:2 3:2 5:2 | 6:1 4:1 6:1 8:1 6:1 8:1 11:1 8:1 6:4~ 4:4 '
  + '| 7:4~ 9:2 7:2 6:2 7:2 9:2 11:2 | 12:4~ 11:2 9:2 7:2 9:2 7:2 5:2 | 10:2 9:2 8:2 7:2 5:2 7:2 8:2 10:2 '
  + '| 11:1 10:1 9:1 8:1 6:1 8:1 9:1 11:1 13:8~'
const lead = { low: .58, high: .9, glide: 5, jitter: 1 }
const violin = {
  2: tune(HOOK, 2, 141, lead),
  4: tune(SOLO, 4, 142, { ...lead, low: .62, high: .94, glide: 0 }),
  6: tune('5:3 5:1 7:2 5:2 3:4 2:4 | 1:4 -1:4 1:4 4:4 | 7:16~ | 7:12~ r:4', 6, 143, lead),
  // Interlude: the record's slow movement, a long singing line.
  3: tune('5:8 7:4 5:4 | 4:12~ 2:4 | 3:8 1:4 3:4 | 6:12~ 4:4 | 7:8 9:4 7:4 | 5:12~ 3:4 | 4:8 6:4 8:4 | 6:16~', 3, 144, { low: .46, high: .7, glide: 4 }),
}
// Choir: sustained chords in the chorus, accents in the break, the final cadence.
const choir = {
  2: comp(CHORD, 2, 'X...............', 151, { length: .97 }),
  3: comp(CHORD, 3, 'o...............', 152, { length: .97 }),
  5: comp(CHORD, 5, 'X..X..X.........', 153, { length: 1 / 8 }),
  6: relative(C.named(['Fm', 'G', 'Cm', 'Cm'], 'X...............', CHORD, { length: .97 }), H(6)),
}
// Horns: a descending counter-line in the chorus, stabs in the break, the last call.
const horns = {
  2: tune('5:8 4:8 | 3:8 2:8 | 2:8 0:8 | -1:16 | 5:8 4:8 | 3:8 5:8 | 4:16 | 4:16', 2, 161, { low: .56, high: .78, glide: 0 }),
  5: riff(2, 162, '4:3! 4:3 4:2 r:8 | 4:3! 4:3 4:2 r:8', { gate: .7, accent: { strong: 1, beat: .94, off: .9 } }),
  6: tune('7:16 | 6:16 | 7:16~ | 7:16', 6, 163, { low: .52, high: .7, glide: 0 }),
}

// ---------- the DJ: sub bass, orchestra hits, scratches, symphonic bass drum ----------
const bass = {
  0: from(6, unroll(riff(2, 171, '0:7! r:3 0:3 r:3 | 0:7! r:3 0:3 r:1 4:2', { gate: .9 }), 8)),
  1: riff(2, 172, '0:7! r:3 0:3 r:3 | 0:7! r:3 0:3 r:1 4:2', { gate: .9 }),
  2: riff(1, 173, '0:12! r:2 0:2', { gate: .94 }),
  4: riff(2, 174, '0:7! r:3 0:3 r:3 | 0:7! r:3 0:3 r:1 4:2', { gate: .9 }),
  5: riff(2, 175, '0:3! 0:3 0:2 r:8 | 0:3! 0:3 0:2 r:8', { gate: .8 }),
  6: riff(4, 176, '0:16 | 0:16 | 0:16 | r:16', { gate: .9 }),
}
const orchHit = {
  2: riff(2, 181, '0:4! r:12 | r:16', { gate: .9 }),
  5: riff(2, 182, '0:3! 0:3 0:2 r:8 | 0:3! 0:3 0:2 r:4 0:2 0:2', { gate: .9 }),
  6: riff(4, 183, 'r:16 | r:16 | 0:4! r:12 | r:16', { gate: .9 }),
}
const scratch = {
  0: beat(191, `${rep(R, 5)} | X.....x.X...x.x. | ${R} | X..x..x.X..xx.x.`),
  1: drum(1, 192, `${R} | ${R} | ${R} | ............X.x.`),
  4: drum(4, 193, `${R} | ........X.x.X... | ${R} | ........X..xX.x.`),
  5: drum(5, 194, `${R} | X.....x.X...x.x. | ${R} | X..x..x.X..xx.x.`),
}
const symphonic = {
  2: drum(2, 201, `X............... | ${R}`),
  5: beat(202, `X..X..X......... | ${R} | X..X..X......... | ${R} | X..X..X......... | X..X..X......... | X..X..X...X..X.. | X.X.X.X.RRRRRRRR`),
  6: beat(203, `${R} | ........X.x.X... | X............... | ${R}`),
  [FILL]: beat(204, '........x.x.XxRR'),
}

// ---------- parts ----------
const hit = (bank, asset, gain, decay, lpf, hpf, extra = {}) => voice(DRUM(bank, asset, extra.variant || 0), {
  octave: 2, gain, attack: .001, decay, sustain: 0, release: Math.max(.04, decay * .6), clip: extra.clip ?? .8, lpf, hpf,
  effects: { reverb: extra.reverb ?? .08, pan: 0 }, design: { role: extra.role ?? 'drums' },
})
const tone = (bank, asset, octave, gain, envelope, lpf, hpf, extra = {}) => voice(SAMPLE(bank, asset, extra.variant || 0), {
  octave, gain, attack: envelope[0], decay: envelope[1], sustain: envelope[2], release: envelope[3], clip: 1, lpf, hpf,
  effects: { reverb: extra.reverb ?? .12, pan: 0 }, design: extra.design || {},
})
// The orchestra is filtered a little, as if it came off the record; the drums are the sampler's.
const VOICE = {
  sub: tone('synths', 'sub', 2, .2, [.004, .3, .6, .12], 900, 30, { reverb: .02, design: { role: 'bass' } }),
  kick: hit('machines', 'dusty-kick', .23, .35, 5000, 30, { clip: .9, reverb: .03 }),
  snare: hit('machines', 'break-snare', .28, .2, 8000, 150, { reverb: .1 }),
  ghost: hit('machines', 'break-ghost', .27, .1, 6500, 200, { clip: .6, reverb: .06 }),
  hat: hit('machines', 'dusty-hat', .24, .08, 9000, 2500, { clip: .5, reverb: .03 }),
  vinyl: hit('electronic', 'vinyl', .25, 2, 7000, 120, { clip: 1, reverb: 0, role: 'fx' }),
  scratch: hit('electronic', 'scratch', .27, .2, 8000, 300, { clip: .9, reverb: .1, role: 'fx' }),
  bassDrum: hit('classical', 'concert-bass-drum', .3, .6, 2400, 30, { clip: 1, reverb: .18, variant: 1 }),
  orchHit: tone('electronic', 'orch-hit', 4, .45, [.001, .5, 0, .3], 8000, 150, { reverb: .22, design: { role: 'fx' } }),
  violins: tone('classical', 'orchestra-violin', 4, .8, [.02, .45, .9, .14], 7000, 200, { reverb: .2 }),
  cellos: tone('classical', 'cello-spiccato', 3, 1, [.003, .3, .2, .12], 5000, 60, { reverb: .16 }),
  harpsichord: tone('classical', 'harpsichord', 4, .42, [.002, .5, .1, .25], 7000, 200, { reverb: .14 }),
  violin: tone('classical', 'violin-sustain', 4, .31, [.03, .3, .8, .16], 7000, 220, { variant: 1, reverb: .2, design: { role: 'lead', vibrato: 5.5, vibratoDepth: .08 } }),
  choir: tone('synths', 'choir', 4, .08, [.3, .5, .85, .7], 4000, 150, { reverb: .26, design: { role: 'pad' } }),
  horns: tone('classical', 'orchestra-horn', 3, .7, [.03, .45, .9, .16], 4500, 90, { reverb: .22 }),
  piano: tone('classical', 'concert-piano', 3, .3, [.001, .45, .9, .25], 6500, 60, { reverb: .16 }),
}
const P = (slot, name, role, behavior, sound, rolls, sections, extra = {}) => ({ slot, name, role, behavior, source: sound.source, rolls, sections, ...sound.opts, ...extra })

const PARTS = finish([
  P('a1', 'Baixo sub', 'bass', 'phrase', VOICE.sub(), bass, on(0, 1, 2, 4, 5, 6, 7, 8)),
  P('a2', 'Bumbo empoeirado', 'rhythm', 'pulse', VOICE.kick(), kick, on(0, 1, 2, 3, 4, 5, 6, 7, 8)),
  P('b1', 'Violinos · loop', 'harmony', 'sustain', VOICE.violins({ pan: -.22 }), violins, on(...ALL)),
  P('b2', 'Caixa do break', 'rhythm', 'pulse', VOICE.snare(), snare, on(0, 1, 2, 4, 5, 6, 7, 8)),
  P('c1', 'Cravo · recorte', 'harmony', 'phrase', VOICE.harpsichord({ pan: .28 }), harpsichord, on(1, 4, 5, 6)),
  P('c2', 'Chimbal empoeirado', 'rhythm', 'pulse', VOICE.hat({ pan: .18 }), { ...hats, 6: hatsOutro }, on(0, 1, 2, 3, 4, 6, 7, 8)),
  P('d1', 'Violino solo', 'melody', 'phrase', VOICE.violin({ pan: .08 }), violin, on(2, 3, 6, 7, 8)),
  P('d2', 'Caixa · ghost', 'rhythm', 'pulse', VOICE.ghost({ pan: -.1 }), ghost, on(1, 3, 4, 6)),
  P('e1', 'Coro', 'harmony', 'sustain', VOICE.choir(), choir, on(2, 3, 5, 7, 8)),
  P('e2', 'Vinil', 'texture', 'pulse', VOICE.vinyl(), vinyl, on(0, 1, 3, 4, 6, 8)),
  P('f1', 'Piano do disco', 'harmony', 'phrase', VOICE.piano({ pan: .12 }), piano, on(0, 1, 3, 4, 8)),
  P('f2', 'Bumbo sinfônico', 'rhythm', 'pulse', VOICE.bassDrum(), symphonic, on(2, 5, 7, 8)),
  P('g1', 'Trompas', 'response', 'sustain', VOICE.horns({ pan: -.16 }), horns, on(2, 5, 7, 8)),
  P('g2', 'Scratch do DJ', 'texture', 'pulse', VOICE.scratch({ pan: -.3 }), scratch, on(0, 1, 4, 5, 6)),
  P('h1', 'Violoncelos · spiccato', 'bass', 'phrase', VOICE.cellos({ pan: .2 }), cellos, on(...ALL)),
  P('h2', 'Orchestra hit', 'response', 'phrase', VOICE.orchHit({ pan: .1 }), orchHit, on(2, 5, 7, 8)),
], {
  // The symphonic bass drum's roll closes the intro, the first chorus, the second verse and the solo.
  fills: { 0: FILL, 2: FILL, 4: FILL, 6: FILL },
  params: {
    // Intro: the record before the beat drops, dull and far; it opens up when the drums come in.
    f1: { 0: { lpfRange: { first: 1500, second: 1900 } }, 3: { gain: .34, reverbRange: { first: .24, second: .3 } } },
    b1: { 0: { lpfRange: { first: 1800, second: 2200 } }, 3: { gain: .6 }, 5: { gain: .95 } },
    h1: { 0: { lpfRange: { first: 1400, second: 1800 } } },
    d1: { 3: { reverbRange: { first: .26, second: .32 } } },
    e2: { 0: { gain: .32 }, 3: { gain: .32 } },
    a2: { 3: { gain: .22 } }, c2: { 3: { gain: .16 } }, e1: { 3: { gain: .08 } },
  },
})
build({
  id: 'marseille-1997', kitName: 'Orchestral rap', profileName: 'Marseille 1997 · Orchestral rap', meter: '4/4', bpm: 90, root: 'C', scale: 'Harmônica menor',
  form: FORM, parts: PARTS,
  reactions: reactions('orap', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Rap orquestral de Marseille dos anos 1990 (IAM, Akhenaton, Fonky Family) e o hip hop que sampleia música clássica: referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/French_hip_hop',
}).catch(error => { console.error(error); process.exit(1) })
