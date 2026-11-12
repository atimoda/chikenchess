// 1960 Yirrkala - Manikay (original study).
// The public clan-song form of north-east Arnhem Land has three voices only: the songman, the bilma
// (clapsticks) he strikes himself, and one yidaki. This study keeps to that: the sticks set the pulse
// alone, the songman hums to find his line, and the yidaki comes in under him with its rhythmic drone
// and the short high hoots of its overtone. Each sung phrase starts high and falls to the drone note.
// Others join the refrain; dancers' feet and calls take the middle; the song ends as these songs do, with
// the sticks' closing figure and the voice finishing alone.
// No traditional song, text or clan melody is used: the lines are original, in D Dorian over one root
// (Kit Harmony: D).
// Form: sticks and humming, then the yidaki · verse · chorus (group) · interlude (soft: humming over the
// low drone) · verse · break (tense: sticks, feet and calls) · yidaki solo · chorus · final (voice alone).
// Run: node scripts/world/yirrkala-1960.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Dórica', {
  // D Dorian degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 B · 6 C.
  root: { D: 0 },
  names: { 0: ['D'], 1: ['D'], 2: ['D'], 3: ['D'], 4: ['D'], 5: ['D'], 6: ['D'] },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 2, vel: .1 },
  colour: { depth: .3, spread: .12, ring: .2 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const REST = 'r:16'
const twice = text => `${text} | ${text}`
// The closing figure of the sticks: a quick run and three spaced strokes.
const CLOSE = 'X.X. X.X. XXXX X... | X... X... X... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- bilma, feet, hands, calls ----------
const bilma = {
  0: beat(11, C.tile('x... x... x... x...', 8)), 1: drum(1, 12, 'X... x... X... x...'), 2: drum(2, 13, 'X.x. X.x. X.x. X.x.'), 3: drum(3, 14, 'h... .... h... ....'),
  4: drum(4, 15, 'X... x... X... x... | X... x... X.x. X...'), 5: drum(5, 16, 'X.x. X.x. X.x. X.x. | X.x. X.x. XXXX X...'), 6: beat(17, `${CLOSE} | ${rep(R, 2)}`),
}
const second = {
  0: beat(21, enter(6, 'h... h... h... h...')), 1: drum(1, 22, 'x... x... x... x...'), 2: drum(2, 23, 'x.x. x.x. x.x. x.x.'), 4: drum(4, 24, 'x... x... x... x...'),
  5: drum(5, 25, 'x.x. x.x. x.x. x.x. | x.x. x.x. xxxx x...'), 6: beat(26, `${CLOSE} | ${rep(R, 2)}`),
}
const feet = { 2: drum(2, 31, 'X... .... X... ....'), 4: drum(4, 32, 'x... .... x... ....'), 5: drum(5, 33, 'X... X... X... X... | X... X... X.X. X...'), 6: beat(34, `X... .... X... .... | X... X... X... ....`) }
const hands = { 2: drum(2, 41, '.... x... .... x...'), 5: drum(5, 42, '..x. ..x. ..x. ..x. | ..x. ..x. .... ....') }
const thighs = { 1: drum(1, 51, '..h. ..h. ..h. ..h.'), 2: drum(2, 52, '..x. ..xh ..x. ..xh'), 4: drum(4, 53, '..h. ..h. ..h. ..hh'), 5: drum(5, 54, '.x.x .x.x .x.x .x.x') }
const calls = { 2: drum(2, 61, `${rep(R, 3)} | .... .... X... ....`), 5: drum(5, 62, `${R} | .... .... .... X... | ${R} | X... .... X... ....`), 4: drum(4, 63, `${rep(R, 7)} | .... .... .... X...`) }
const rattle = { 6: beat(71, `.... .... xxxx .... | ${rep(R, 3)}`), 5: drum(5, 72, `${rep(R, 3)} | .... .... xxxx xxxx`) }
const stamp = { [FILL]: beat(81, '.... .... X.X. X...') }

// ---------- yidaki ----------
// One note, shaped by the tongue: the accents open the sound, the quiet strokes close it.
const DRONE = '0:3! 0:1 0:2 0:2 0:3! 0:1 0:4'
const DRONE2 = '0:2! 0:1 0:1 0:2! 0:2 0:2! 0:1 0:1 0:4'
const breath = { gate: 1, accent: { strong: .96, beat: .62, off: .4 } }
const yidaki = {
  0: from(4, unroll(riff(1, 101, '0:8 0:8', { gate: 1, accent: { strong: .6, beat: .5, off: .4 } }), 8)), 1: riff(1, 102, DRONE, breath), 2: riff(2, 103, `${DRONE2} | ${DRONE}`, breath),
  3: riff(1, 104, '0:16', { gate: 1, accent: { strong: .46, beat: .4, off: .36 } }), 4: riff(2, 105, `${DRONE2} | 0:2! 0:1 0:1 0:2! 0:1 0:1 0:2! 0:2 0:2! 0:2`, { ...breath, accent: { strong: 1, beat: .7, off: .44 } }),
  5: riff(2, 106, '0:4! r:4 0:4! r:4 | 0:2! 0:2 0:2! 0:2 0:4! r:4', breath), 6: mel(`${DRONE2} | 0:2! 0:1 0:1 0:2! 0:2 0:4! r:4 | r:16 | r:16`, { gate: 1 }),
}
// The hoot: the overtone, an eleventh above, in short calls at the ends of the phrases.
const hoot = {
  1: tune(`${REST} | r:12 3:2! r:2 | ${REST} | r:10 3:2! 3:2! r:2 | ${REST} | r:12 3:2! r:2 | ${REST} | r:8 3:2! r:2 3:2! r:2`, 1, 111, { glide: 0, low: .7, high: .92 }),
  2: tune(twice(`${REST} | r:12 3:2! r:2 | ${REST} | r:8 3:2! r:2 3:2! r:2`), 2, 112, { glide: 0, low: .74, high: .96 }),
  4: tune(`r:12 3:2! r:2 | r:8 3:2! r:2 3:2! r:2 | r:12 3:2! r:2 | 3:2! r:2 3:2! r:2 3:4! r:4 | r:12 3:2! r:2 | r:8 3:2! r:2 3:2! r:2 | r:4 3:2! r:6 3:2! r:2 | 3:2! r:2 3:2! r:2 3:2! 3:2! 3:4!`, 4, 113, { glide: 0, low: .8, high: 1 }),
  5: tune(twice(`${rep(REST, 3)} | r:8 3:4! r:4`), 5, 114, { glide: 0, low: .8, high: 1 }), 6: tune(`${REST} | r:8 3:4! r:4 | ${rep(REST, 2)}`, 6, 115, { glide: 0, low: .8, high: 1 }),
}
const overtone = { 2: riff(1, 121, '7:16', { gate: 1, accent: { strong: .5, beat: .46, off: .4 } }), 3: riff(2, 122, '7:16 | 4:16', { gate: 1, accent: { strong: .4, beat: .36, off: .3 } }), 4: riff(1, 123, '7:8 7:8', { gate: 1, accent: { strong: .6, beat: .5, off: .4 } }) }

// ---------- voices ----------
// Every phrase begins high and tumbles down to the drone note.
const VERSE = '7:2 7:2 7:1 6:1 7:2 6:2 4:2 4:4 | 4:2 3:2 2:2 3:2 2:4 0:4 | 7:2 7:2 9:2 7:2 6:2 4:2 4:4 | 3:2 2:2 3:2 2:2 0:8 | 7:2 7:1 7:1 6:2 7:2 6:2 4:2 3:2 4:2 | 4:2 3:2 2:2 0:2 0:8 | 4:2 4:2 3:2 2:2 3:2 2:2 0:4 | 0:4 0:4 r:8'
const REFRAIN = '7:2 7:2 6:2 7:2 4:4 4:4 | 4:2 4:2 3:2 4:2 2:4 2:4 | 3:2 3:2 2:2 3:2 0:4 0:4 | 0:2 0:2 0:2 0:2 0:8'
const HUM = '4:16 | 3:8 2:8 | 0:16 | r:16 | 7:8 6:8 | 4:16 | 3:8 2:8 | 0:12 r:4'
const SLOW = '7:12~ 6:4 | 4:16~ | 4:8 3:4 2:4 | 0:16 | 7:8~ 9:4 7:4 | 6:8 4:8~ | 3:8 2:8 | 0:12 r:4'
const CODA = `${rep(REST, 2)} | 4:2 3:2 2:2 3:2 2:4 0:4 | 0:12* r:4`
const sung = { low: .58, high: .92, glide: 5, jitter: 3 }
const songman = { 1: tune(VERSE, 1, 141, sung), 2: tune(twice(REFRAIN), 2, 142, { ...sung, low: .64, high: .96 }), 6: tune(CODA, 6, 143, { ...sung, low: .5, high: .8 }) }
const partner = { 1: tune(`${rep(REST, 3)} | 3:2 2:2 3:2 2:2 0:8 | ${rep(REST, 2)} | 4:2 4:2 3:2 2:2 3:2 2:2 0:4 | 0:4 0:4 r:8`, 1, 151, sung), 2: tune(twice(REFRAIN), 2, 152, sung) }
const group = { 2: tune(twice(`${rep(REST, 2)} | 3:2 3:2 2:2 3:2 0:4 0:4 | 0:2 0:2 0:2 0:2 0:8`), 2, 161, sung) }
const hum = { 0: tune(HUM, 0, 171, { low: .36, high: .54, glide: 6 }), 3: tune(SLOW, 3, 172, { low: .4, high: .62, glide: 6, jitter: 2 }) }
const high = { 3: tune(`${rep(REST, 4)} | 7:8~ 9:4 7:4 | 6:8 4:8~ | 3:8 2:8 | 0:12 r:4`, 3, 181, { low: .34, high: .5, glide: 6 }) }

const PARTS = finish([
  Q('a1', 'Yidaki', 'bass', 'sustain', V.bassoon({ gain: .25, octave: 2, attack: .03, lpf: 1500, role: 'bass', reverb: .16, panWidth: .1 }), yidaki, on(...ALL)),
  Q('a2', 'Bilma', 'rhythm', 'pulse', V.rim({ gain: .2, decay: .1, lpf: 7500, hpf: 700, pan: 0, panWidth: 0, reverb: .18 }), bilma, on(...ALL)),
  Q('b1', 'Songman', 'melody', 'sustain', V.voice({ gain: .36, pan: 0, reverb: .2 }), songman, on(1, 2, 4, 7, 8)),
  Q('b2', 'Bilma · second pair', 'rhythm', 'pulse', V.clave808({ gain: .1, lpf: 5000, pan: .3, reverb: .18 }), second, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('c1', 'Yidaki · hoot', 'response', 'phrase', V.horn({ gain: .6, octave: 3, attack: .01, decay: .2, sustain: .5, release: .08, pan: 0, reverb: .2 }), hoot, on(1, 2, 4, 5, 6, 7, 8)),
  Q('c2', 'Feet', 'rhythm', 'pulse', V.bassDrum({ gain: .3, decay: .2, lpf: 900, pan: -.1 }), feet, on(2, 5, 6, 7, 8)),
  Q('d1', 'Second singer', 'response', 'sustain', V.voice({ gain: .26, pan: .24, reverb: .2 }), partner, on(1, 2, 4, 7)),
  Q('d2', 'Hands', 'rhythm', 'pulse', V.palmas({ gain: .28, pan: .2 }), hands, on(2, 5, 7)),
  Q('e1', 'Group', 'response', 'sustain', V.voice({ gain: .3, octave: 2, pan: -.24, reverb: .22 }), group, on(2, 7)),
  Q('e2', 'Thighs', 'rhythm', 'pulse', V.brush({ gain: .3, lpf: 3600, pan: -.24 }), thighs, on(1, 2, 4, 5, 6, 7)),
  Q('f1', 'Yidaki · overtone', 'texture', 'sustain', V.trombone({ gain: .2, octave: 2, attack: .08, lpf: 1800, pan: 0, reverb: .2, role: 'pad' }), overtone, on(2, 3, 6, 7)),
  Q('f2', 'Calls', 'response', 'pulse', V.hey({ gain: .16, pan: -.3, reverb: .2 }), calls, on(2, 5, 6, 7)),
  Q('g1', 'High voices', 'texture', 'sustain', V.voice({ gain: .22, octave: 4, pan: .1, reverb: .3, role: 'pad' }), high, on(3)),
  Q('g2', 'Bilma · roll', 'rhythm', 'pulse', V.rim({ gain: .16, decay: .06, hpf: 900, pan: .1 }), rattle, on(5, 8)),
  Q('h1', 'Humming', 'texture', 'sustain', V.voice({ gain: .28, pan: 0, lpf: 2400, reverb: .26, role: 'pad' }), hum, on(0, 3)),
  Q('h2', 'Feet · stamp', 'rhythm', 'pulse', V.bassDrum({ gain: .3, decay: .2, lpf: 900, pan: 0 }), stamp, on()),
], {
  fills: { 2: FILL, 5: FILL, 7: FILL },
  params: { a1: { 0: { gain: .18 }, 3: { gain: .18 } }, a2: { 3: { gain: .14 } } },
})
build({
  id: 'yirrkala-1960', kitName: 'Manikay', profileName: 'Yirrkala 1960 · Manikay', meter: '4/4', bpm: 108, root: 'D', scale: 'Dórica',
  form: FORM, parts: PARTS,
  reactions: reactions('mnk', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Manikay yolŋu do nordeste da Terra de Arnhem (voz, bilma e yidaki; frases descendentes sobre o bordão): estudo original de forma e timbre, sem canções, textos ou melodias de clãs',
  url: 'https://en.wikipedia.org/wiki/Manikay',
}).catch(error => { console.error(error); process.exit(1) })
