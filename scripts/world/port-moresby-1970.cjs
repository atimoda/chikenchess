// 1970 Port Moresby - String band (original material).
// A village string band in town for a competition: one guitar picks the tune alone, the ukuleles come in
// with their quick strum, and the bamboo band (long tubes struck on their open ends with rubber sandals)
// walks a boogie bass underneath. The song is sung high and in close harmony; the lead guitar answers
// every line; the kundu and the shell rattles keep the dancers together and the garamut (slit drum)
// signals the break.
// G major (Kit Harmony): G · C · D · Em.
// Form: lead guitar, ukulele, then the bamboo · verse · chorus (harmonies) · interlude (soft: humming and
// slow guitar) · verse · break (tense: garamut, bamboo and kundu) · guitar solo · chorus · final.
// Run: node scripts/world/port-moresby-1970.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // G major degrees: 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F#.
  root: { G: 0, C: 3, D: -3, Em: -2 },
  names: {
    0: ['G', 'G', 'C', 'G'], 1: ['G', 'G', 'C', 'G', 'G', 'G', 'D', 'G'], 2: ['C', 'G', 'D', 'G'],
    3: ['Em', 'C', 'G', 'D'], 4: ['G', 'C', 'D', 'G'], 5: ['C', 'D', 'G', 'G'], 6: ['C', 'D', 'G', 'G'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { push: [0, 0, 0, 1], jitter: 2, vel: .08 },
  colour: { spread: .14, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const REST = 'r:16'
const END = 'X.X. X.X. X... X... | X... .... .... ....'
const STOP = 'X... .... X.X. X... | X... X... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- kundu, rattles, sticks, garamut ----------
const kundu = {
  0: beat(11, enter(6, 'x... ..h. x... h...')), 1: drum(1, 12, 'X... ..x. X... x...'), 2: drum(2, 13, 'X... ..x. X.x. x...'), 3: drum(3, 14, 'h... .... h... ....'),
  4: drum(4, 15, 'X... ..x. X... x...'), 5: drum(5, 16, 'X..x ..X. X.x. X... | X..x ..X. XxXx X...'), 6: beat(17, `X... ..x. X.x. x... | X... ..x. X.x. x... | ${END}`),
}
const rattle = {
  0: beat(21, enter(4, 'h.hh h.hh h.hh h.hh')), 1: drum(1, 22, 'x.hh x.hh x.hh x.hh'), 2: drum(2, 23, 'X.xx X.xx X.xx X.xx'), 3: drum(3, 24, 'o... h... o... h...'),
  4: drum(4, 25, 'x.hh x.hh x.hh x.hh'), 5: drum(5, 26, 'X.xx X.xx X.xx X.xx | X.xx X.xx xxxx X...'), 6: beat(27, `X.xx X.xx X.xx X.xx | X.xx X.xx X.xx X.xx | ${END}`),
}
// The sandal on the tube: the slap that comes with every bass note.
const sandal = {
  0: beat(31, enter(4, 'h.h. h.h. h.h. h.h.')), 1: drum(1, 32, 'x.h. x.h. x.h. x.h.'), 2: drum(2, 33, 'x.x. x.x. x.x. x.x.'), 4: drum(4, 34, 'x.h. x.h. x.h. x.h.'),
  5: drum(5, 35, 'X.x. X.x. X.x. X.x. | X.x. X.x. XxXx X...'), 6: beat(36, `x.x. x.x. x.x. x.x. | x.x. x.x. x.x. x.x. | ${END}`),
}
const sticks = { 1: drum(1, 41, '..h. ..h. ..h. ..h.'), 2: drum(2, 42, '..x. ..x. ..x. ..xx'), 4: drum(4, 43, '..h. ..h. ..h. ..hh'), 6: beat(44, '..x. ..x. ..x. ..xx | ..x. ..x. ..x. ..xx') }
const claps = { 2: drum(2, 51, '.... x... .... x...'), 5: drum(5, 52, '.... x... .... x... | .... x... .... x.x.'), 6: beat(53, `.... x... .... x... | .... x... .... x... | ${END}`) }
const coconut = { 2: drum(2, 61, 'x..x ..x. x..x ..x.'), 4: drum(4, 62, 'h..h ..h. h..h ..h.'), 5: drum(5, 63, 'x..x ..x. x..x ..x.') }
const garamut = { 5: drum(5, 71, `${STOP} | X... X... X.X. X.X. | XxXx XxXx X... ....`), 6: beat(72, `${rep(R, 2)} | ${END}`) }
const turn = { [FILL]: beat(81, '.... .... x.xx X.XX') }

// ---------- bamboo bass, ukulele, guitars ----------
// The boogie of the bamboo band: every tone twice, root, third, fifth, sixth.
const WALK = '0:2 0:2 2:2 2:2 4:2 4:2 5:2 4:2'
const STEP = '0:2 0:2 4:2 4:2 0:2 0:2 4:2 2:2'
const thud = { gate: .6, accent: { strong: .94, beat: .84, off: .74 } }
const bamboo = {
  0: from(4, unroll(riff(1, 101, STEP, { ...thud, accent: { strong: .7, beat: .62, off: .56 } }), 8)), 1: riff(1, 102, STEP, thud), 2: riff(1, 103, WALK, thud), 3: riff(1, 104, '0:8 4:8', { gate: .8, accent: { strong: .56, beat: .5, off: .46 } }),
  4: riff(1, 105, WALK, thud), 5: riff(2, 106, '0:2! r:6 0:2 0:2 0:2 r:2 | 0:2! r:2 0:2! r:10', thud), 6: mel(`${WALK} | ${WALK} | 0:2! 0:2 0:2! 0:2 0:2! r:2 0:2! r:2 | 0:4!`, { gate: .7 }),
}
// G [G B D] · C [G C E] · D [A D F#] · Em [G B E]
const CHORD = { G: [7, 9, 11], C: [7, 10, 12], D: [8, 11, 13], Em: [7, 9, 12] }
const STRUM = 'x.xh x.x. x.xh x.x.'
const ukulele = {
  0: from(2, unroll(comp(CHORD, 0, 'h.hh h.h. h.hh h.h.', 111, { length: 1 / 20 }), 8)), 1: comp(CHORD, 1, STRUM, 112, { length: 1 / 20 }), 2: comp(CHORD, 2, 'X.xh X.x. X.xh X.x.', 113, { length: 1 / 20 }),
  3: comp(CHORD, 3, 'o... h... o... h...', 114, { length: 1 / 6 }), 4: comp(CHORD, 4, STRUM, 115, { length: 1 / 20 }), 5: comp(CHORD, 5, STOP, 116, { length: 1 / 12 }),
  6: relative(S.hand(117, C.named(['C', 'D', 'G', 'G'], `${STRUM} | ${STRUM} | ${END}`, CHORD, { length: 1 / 12 })), H(6)),
}
const rhythm = {
  1: comp(CHORD, 1, 'x... x.h. x... x.h.', 121, { length: 1 / 10 }), 2: comp(CHORD, 2, 'x... x.x. x... x.x.', 122, { length: 1 / 10 }), 3: riff(1, 123, '0:4 4:4 7:4 9:4', { gate: 1, accent: { strong: .5, beat: .46, off: .42 } }),
  4: comp(CHORD, 4, 'x... x.x. x... x.x.', 124, { length: 1 / 10 }), 5: comp(CHORD, 5, STOP, 125, { length: 1 / 8 }),
  6: relative(S.hand(126, C.named(['C', 'D', 'G', 'G'], `x... x.x. x... x.x. | x... x.x. x... x.x. | ${END}`, CHORD, { length: 1 / 8 })), H(6)),
}
const PICK = '7:1 9:1 11:1 9:1 7:2 4:2 7:1 9:1 11:1 14:1 11:2 9:2 | 11:1 9:1 7:1 9:1 11:2 7:2 4:2 7:2 9:4 | 10:1 12:1 14:1 12:1 10:2 7:2 10:1 12:1 14:1 17:1 14:2 12:2 | 11:2 9:2 7:2 4:2 7:8'
const FILLS = 'r:16 | r:8 7:1 9:1 11:1 9:1 7:2 4:2 | r:16 | r:6 11:1 9:1 7:1 9:1 11:1 14:1 11:2 9:2 | r:16 | r:8 14:1 11:1 9:1 11:1 14:2 11:2 | r:16 | r:6 4:1 6:1 7:1 9:1 11:1 9:1 7:4'
const SOLO = '14:1 11:1 9:1 11:1 14:2 16:2 14:1 11:1 9:1 7:1 9:2 11:2 | 12:1 10:1 7:1 10:1 12:2 14:2 17:2 14:2 12:4 | 13:1 11:1 8:1 11:1 13:2 15:2 13:1 11:1 10:1 8:1 6:2 8:2 | 7:2 9:2 11:2 14:2 11:8 '
  + '| 16:2 14:2 11:2 14:2 16:1 18:1 16:1 14:1 11:4 | 17:2 14:2 12:2 14:2 17:1 19:1 17:1 14:1 12:4 | 15:2 13:2 11:2 13:2 15:1 17:1 15:1 13:1 10:2 8:2 | 7:1 9:1 11:1 14:1 11:2 9:2 7:8'
const SLOW = '12:4 9:4 7:8 | 10:4 12:4 14:8 | 11:4 9:4 7:8 | 8:4 11:4 13:8 | 12:4 14:4 16:8 | 14:4 12:4 10:8 | 11:4 14:4 16:8 | 15:4 13:4 11:8'
const TAG = '14:1 11:1 9:1 11:1 14:2 12:2 10:4 12:4 | 13:1 11:1 8:1 11:1 13:2 11:2 8:4 6:4 | 7:2! r:2 9:2! r:2 11:2! r:2 14:2! r:2 | 14:8!'
const picked = { glide: 0, jitter: 2, low: .56, high: .9 }
const lead = { 0: tune(`${PICK} | ${PICK}`, 0, 131, picked), 1: tune(FILLS, 1, 132, { ...picked, low: .5, high: .8 }), 3: tune(SLOW, 3, 133, { ...picked, low: .4, high: .62 }), 4: tune(SOLO, 4, 134, picked), 6: tune(TAG, 6, 135, picked) }

// ---------- voices ----------
const VERSE = '9:2 9:2 11:2 9:2 12:4 11:4 | 11:8~ r:4 9:2 11:2 | 12:2 12:2 14:2 12:2 10:4 12:4 | 11:10~ r:6 | 9:2 9:2 11:2 9:2 12:4 11:4 | 14:8~ r:4 11:2 12:2 | 13:2 13:2 11:2 10:2 8:4 10:4 | 7:10~ r:6'
const CHORUS = '14:4 12:2 14:2 12:4 10:4 | 11:4 9:2 11:2 9:4 7:4 | 10:4 8:2 10:2 11:4 13:4 | 14:10~ r:6 | 14:4 12:2 14:2 15:4 14:4 | 14:4 11:2 9:2 11:4 9:4 | 8:4 10:2 11:2 10:4 8:4 | 7:10~ r:6'
const SOFT = '12:8~ 11:4 9:4 | 10:12~ r:4 | 9:8~ 11:4 9:4 | 8:12~ r:4 | 12:8~ 14:4 12:4 | 12:8 10:8~ | 11:8~ 9:8 | 8:12~ r:4'
const HUM = '7:16 | 7:16 | 7:16 | 6:16 | 7:16 | 7:16 | 7:16 | 6:16'
const LAST = '14:4 12:2 14:2 12:4 10:4 | 13:4 11:2 13:2 11:4 8:4 | 7:2! r:2 9:2! r:2 11:2! r:2 14:2! r:2 | 14:8!'
const sung = { low: .56, high: .88, glide: 3, jitter: 2 }
const voz = { 1: tune(VERSE, 1, 141, sung), 2: tune(CHORUS, 2, 142, { ...sung, low: .62, high: .92 }), 3: tune(SOFT, 3, 143, { low: .42, high: .64, glide: 4, jitter: 2 }), 6: tune(LAST, 6, 144, sung) }
const high = { 1: harmony(VERSE, 1, 151, { ...sung, low: .46, high: .74 }, 2), 2: harmony(CHORUS, 2, 152, sung, 2), 6: harmony(LAST, 6, 153, sung, 2) }
const low = { 2: harmony(CHORUS, 2, 161, sung, -4), 6: harmony(LAST, 6, 162, sung, -4) }
const hum = { 3: tune(HUM, 3, 171, { low: .36, high: .5 }) }

const PARTS = finish([
  Q('a1', 'Bamboo band', 'bass', 'phrase', V.marimba({ gain: .7, octave: 2, attack: .002, decay: .22, sustain: 0, release: .1, lpf: 1600, hpf: 40, role: 'bass', reverb: .08, panWidth: .1 }), bamboo, on(...ALL)),
  Q('a2', 'Kundu', 'rhythm', 'pulse', V.conga({ gain: .36, lpf: 2800, hpf: 70, decay: .24, pan: 0, panWidth: 0 }), kundu, on(...ALL)),
  Q('b1', 'Lead guitar', 'melody', 'phrase', V.steel({ gain: .5, octave: 2, pan: -.14, reverb: .16 }), lead, on(0, 1, 3, 4, 6, 8)),
  Q('b2', 'Shell rattle', 'rhythm', 'pulse', V.shaker({ gain: .26, pan: .32 }), rattle, on(...ALL)),
  Q('c1', 'Ukulele', 'harmony', 'phrase', V.cavaquinho({ gain: .2, pan: .26 }), ukulele, on(...ALL)),
  Q('c2', 'Bamboo · sandal', 'rhythm', 'pulse', V.slap({ gain: .3, lpf: 3200, pan: -.08 }), sandal, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('d1', 'Singer', 'melody', 'sustain', V.voice({ gain: .42, octave: 2, pan: 0 }), voz, on(1, 2, 3, 4, 7, 8)),
  Q('d2', 'Sticks', 'rhythm', 'pulse', V.rim({ gain: .16, pan: -.3 }), sticks, on(1, 2, 4, 6, 7, 8)),
  Q('e1', 'High harmony', 'response', 'sustain', V.voice({ gain: .3, octave: 2, pan: .22 }), high, on(1, 2, 4, 7, 8)),
  Q('e2', 'Hand claps', 'rhythm', 'pulse', V.palmas({ gain: .3, pan: -.1 }), claps, on(2, 5, 7, 8)),
  Q('f1', 'Rhythm guitar', 'harmony', 'phrase', V.steel({ gain: .26, octave: 2, pan: -.3 }), rhythm, on(1, 2, 3, 4, 5, 6, 7, 8)),
  Q('f2', 'Coconut shells', 'rhythm', 'pulse', V.clave808({ gain: .1, lpf: 4200, pan: .2 }), coconut, on(2, 5, 6, 7)),
  Q('g1', 'Low harmony', 'response', 'sustain', V.voice({ gain: .28, octave: 2, pan: -.22 }), low, on(2, 7, 8)),
  Q('g2', 'Garamut', 'rhythm', 'pulse', V.tom({ gain: .3, decay: .2, lpf: 1800, hpf: 60, pan: .1 }), garamut, on(5, 8)),
  Q('h1', 'Humming', 'texture', 'sustain', V.voice({ gain: .24, octave: 2, pan: 0, lpf: 2600, reverb: .28, role: 'pad' }), hum, on(3)),
  Q('h2', 'Kundu · turn', 'rhythm', 'pulse', V.conga({ gain: .36, decay: .16, pan: 0 }), turn, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 0: { gain: .56 }, 3: { gain: .5 } }, a2: { 0: { gain: .26 }, 3: { gain: .2 } }, b2: { 0: { gain: .2 }, 3: { gain: .16 } }, c1: { 0: { gain: .16 }, 3: { gain: .16 } },
    b1: { 0: { gain: .6, reverbRange: { first: .2, second: .26 } } }, d1: { 3: { gain: .36, reverbRange: { first: .24, second: .3 } } },
  },
})
build({
  id: 'port-moresby-1970', kitName: 'String band', profileName: 'Port Moresby 1970 · String band', meter: '4/4', bpm: 116, root: 'G', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('stb', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'String bands e bamboo bands da Papua-Nova Guiné e das Ilhas Salomão (violões, ukuleles, baixo de bambu, vozes agudas em harmonia; kundu e garamut): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Music_of_Papua_New_Guinea',
}).catch(error => { console.error(error); process.exit(1) })
