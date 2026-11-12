// 1935 Ubud - Gamelan (original material).
// A village gong kebyar in the pavilion: the ugal player states a phrase alone, the low calung and jegogan
// take up the core melody (the pokok) and the kempli starts counting. The gangsa then split into polos
// and sangsih, two halves of one fast figure that only exists when both play (kotekan); the reyong's pots
// answer on the off-beats, the kendang pair leads, and the great gong closes each cycle.
// Five tones of E Phrygian, close to pelog selisir: E · F · G · B · C. One root throughout (Kit Harmony: E):
// the movement is in the pokok, not in chords.
// Form: ugal alone, then the pokok · verse (slow interlocking) · chorus (full kotekan) · interlude (soft:
// suling and rebab over the slow pokok) · verse · break (tense: kebyar, unison bursts and silences) ·
// reyong and kendang solo · chorus · final gong.
// Run: node scripts/world/ubud-1935.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Phrygian', {
  // E Phrygian degrees: 0 E · 1 F · 2 G · (3 A) · 4 B · 5 C · (6 D). Only 0, 1, 2, 4 and 5 are used.
  root: { E: 0 },
  names: { 0: ['E'], 1: ['E'], 2: ['E'], 3: ['E'], 4: ['E'], 5: ['E'], 6: ['E'] },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  feel: { jitter: 1, vel: .08 },
  colour: { spread: .16, ring: .24 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const REST = 'r:16'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- the pokok and what is woven around it ----------
// One tone per beat; the last tone of each cycle is where the gong falls.
const POKOK_A = '4:4 5:4 4:4 2:4 | 1:4 2:4 4:4 2:4 | 5:4 4:4 2:4 1:4 | 2:4 1:4 2:4 0:4'
const POKOK_B = '7:4 5:4 4:4 5:4 | 7:4 8:4 9:4 8:4 | 7:4 5:4 4:4 2:4 | 1:4 2:4 1:4 0:4'
const POKOK_C = '4:8 5:8 | 4:8 2:8 | 4:8 5:8 | 2:8 0:8 | 5:8 7:8 | 5:8 4:8 | 2:8 1:8 | 2:8 0:8'
const twice = text => `${text} | ${text}`
const PELOG = [0, 1, 2, 4, 5]
const LADDER = Array.from({ length: 5 }, (_, octave) => PELOG.map(degree => degree + 7 * octave)).flat()
const above = (degree, steps) => LADDER[LADDER.indexOf(degree) + steps]
const beats = pokok => pokok.split('|').map(bar => bar.trim().split(/\s+/).map(token => +token.split(':')[0]))
// Each half bar aims at its second pokok tone; `cells` writes eight sixteenths from three neighbouring tones.
const weave = (pokok, cells) => beats(pokok).map(bar => [bar[1], bar[3]].map(tone => { const low = tone % 7 + 7; return cells([low, above(low, 1), above(low, 2), above(low, 3)]) }).join(' ')).join(' | ')
// Kotekan telu: polos keeps the two lower tones, sangsih the two upper; the middle one is struck by both.
const POLOS = t => `${t[0]}:1 ${t[1]}:1 r:1 ${t[0]}:1 ${t[1]}:1 r:1 ${t[0]}:1 ${t[1]}:1`
const SANGSIH = t => `r:1 ${t[1]}:1 ${t[2]}:1 r:1 ${t[1]}:1 ${t[2]}:1 r:1 ${t[1]}:1`
// The slower weaving of the verse: alternate strokes, one player on the beat and the other off it.
const POLOS_SLOW = t => `${t[0]}:2 r:2 ${t[1]}:2 r:2`
const SANGSIH_SLOW = t => `r:2 ${t[1]}:2 r:2 ${t[2]}:2`
const REYONG = t => `r:1 ${t[2]}:1 r:1 ${t[3]}:1 r:1 ${t[2]}:1 ${t[3]}:1 r:1`
const REYONG_BUSY = t => `${t[1]}:1 ${t[2]}:1 r:1 ${t[1]}:1 ${t[2]}:1 ${t[3]}:1 r:1 ${t[2]}:1`
// The ugal ornaments the pokok an octave above: the tone, then a quick upper neighbour.
const neliti = pokok => beats(pokok).map(bar => bar.map(tone => `${tone + 7}:2 ${above(tone + 7, 1)}:1 ${tone + 7}:1`).join(' ')).join(' | ')
// Kebyar: the whole orchestra in one rhythm, bursts and silences.
const KEBYAR = '7:2! r:6 7:2! r:2 8:2! r:2 | 9:4! r:12 | 9:1 8:1 7:1 8:1 9:1 8:1 7:1 8:1 9:2! r:6 | r:16 | 12:2! r:6 12:2! r:2 11:2! r:2 | 9:4! r:12 | 7:1 8:1 9:1 11:1 12:1 11:1 9:1 8:1 7:2! r:2 8:2! r:2 | 7:8! r:8'
const ENDING = '7:4! r:4 7:4! r:4 | 7:8*'
const SOLO = '11:4* r:2 12:2 11:2 9:2 8:4* | 9:2 11:2 12:4* 14:6* r:2 | 12:2 11:2 9:2 8:2 7:4* 8:2 9:2 | 7:12* r:4'
const head = pokok => pokok.split(' | ').slice(0, 2).join(' | ')

const bronze = { glide: 0, jitter: 1, low: .56, high: .86 }, soft = { glide: 0, jitter: 1, low: .4, high: .62 }, loud = { glide: 0, low: .84, high: 1 }
const calung = {
  0: tune(`${rep(REST, 4)} | ${POKOK_A}`, 0, 101, soft), 1: tune(twice(POKOK_A), 1, 102, bronze), 2: tune(twice(POKOK_B), 2, 103, bronze), 3: tune(POKOK_C, 3, 104, soft),
  4: tune(twice(POKOK_A), 4, 105, bronze), 5: tune(KEBYAR, 5, 106, loud), 6: tune(`${head(POKOK_B.split(' | ').slice(2).join(' | '))} | ${ENDING}`, 6, 107, bronze),
}
const JEGOG_A = '5:8 2:8 | 2:8 2:8 | 4:8 1:8 | 1:8 0:8', JEGOG_B = '5:8 5:8 | 1:8 1:8 | 5:8 2:8 | 2:8 0:8'
const jegogan = {
  0: tune(`${rep(REST, 4)} | ${JEGOG_A}`, 0, 111, soft), 1: tune(twice(JEGOG_A), 1, 112, bronze), 2: tune(twice(JEGOG_B), 2, 113, bronze), 3: tune('5:16 | 2:16 | 5:16 | 0:16 | 0:16 | 4:16 | 1:16 | 0:16', 3, 114, soft),
  4: tune(twice(JEGOG_A), 4, 115, bronze), 5: tune('0:2! r:14 | 2:4! r:12 | r:8 2:2! r:6 | r:16 | 5:2! r:14 | 2:4! r:12 | r:8 0:2! r:6 | 0:8! r:8', 5, 116, loud), 6: tune('5:8 2:8 | 2:8 0:8 | 0:4! r:4 0:4! r:4 | 0:8*', 6, 117, bronze),
}
const ugal = {
  0: tune(`${SOLO} | ${neliti(POKOK_A)}`, 0, 121, { ...bronze, low: .5, high: .9 }), 1: tune(twice(neliti(POKOK_A)), 1, 122, bronze), 2: tune(twice(neliti(POKOK_B)), 2, 123, bronze),
  4: tune(`${neliti(POKOK_A)} | 11:2 12:2 14:2 12:2 11:2 9:2 8:2 9:2 | 11:1 12:1 11:1 9:1 8:2 9:2 11:4 12:4 | 14:2 12:2 11:2 9:2 12:2 11:2 9:2 8:2 | 9:2 8:2 7:2 8:2 9:4 7:4`, 4, 124, bronze),
  5: tune(KEBYAR, 5, 125, loud), 6: tune(`${head(neliti(POKOK_B.split(' | ').slice(2).join(' | ')))} | ${ENDING}`, 6, 126, bronze),
}
const TAIL = POKOK_B.split(' | ').slice(2).join(' | ')
const polos = { 1: tune(twice(weave(POKOK_A, POLOS_SLOW)), 1, 131, soft), 2: tune(twice(weave(POKOK_B, POLOS)), 2, 132, bronze), 5: tune(KEBYAR, 5, 133, loud), 6: tune(`${weave(TAIL, POLOS)} | ${ENDING}`, 6, 134, bronze) }
const sangsih = { 1: tune(twice(weave(POKOK_A, SANGSIH_SLOW)), 1, 141, soft), 2: tune(twice(weave(POKOK_B, SANGSIH)), 2, 142, bronze), 5: tune(KEBYAR.replace(/(\d+):/g, (_, degree) => `${above(+degree, 2)}:`), 5, 143, loud), 6: tune(`${weave(TAIL, SANGSIH)} | ${ENDING}`, 6, 144, bronze) }
const reyong = {
  0: tune(`${rep(REST, 6)} | ${weave(POKOK_A.split(' | ').slice(2).join(' | '), REYONG)}`, 0, 151, soft), 1: tune(twice(weave(POKOK_A, REYONG)), 1, 152, soft), 2: tune(twice(weave(POKOK_B, REYONG)), 2, 153, bronze),
  4: tune(twice(weave(POKOK_A, REYONG_BUSY)), 4, 154, { ...bronze, low: .6, high: .94 }), 5: tune(KEBYAR.replace(/(\d+):/g, (_, degree) => `${above(+degree, 3)}:`), 5, 155, loud), 6: tune(`${weave(TAIL, REYONG)} | ${ENDING}`, 6, 156, bronze),
}
const SULING = '11:8~ 12:4 11:4 | 9:12~ r:4 | 8:4 9:4 11:8~ | 9:4 8:4 7:8~ | 12:8~ 14:4 12:4 | 11:12~ r:4 | 9:4 8:4 9:4 11:4 | 7:12~ r:4'
const suling = { 3: tune(SULING, 3, 161, { glide: 5, jitter: 2, low: .46, high: .74 }), 4: tune(`${rep(REST, 4)} | 14:8~ 12:4 11:4 | 12:12~ r:4 | 11:4 9:4 8:4 9:4 | 7:12~ r:4`, 4, 162, { glide: 5, jitter: 2, low: .42, high: .64 }) }
const rebab = { 3: tune('4:16 | 2:16 | 4:16 | 7:16 | 5:16 | 4:16 | 2:16 | 7:16', 3, 171, { glide: 6, low: .4, high: .56 }) }

// ---------- gongs, kempli, kendang, ceng-ceng ----------
const CYCLE = `X... .... .... .... | ${rep(R, 3)}`
const gong = {
  0: beat(11, `${rep(R, 4)} | x... .... .... .... | ${rep(R, 3)}`), 1: drum(1, 12, CYCLE), 2: drum(2, 13, CYCLE), 3: beat(14, `h... .... .... .... | ${rep(R, 7)}`), 4: drum(4, 15, CYCLE),
  5: beat(16, `${R} | X... .... .... .... | ${rep(R, 3)} | X... .... .... .... | ${R} | X... .... .... ....`), 6: beat(17, `X... .... .... .... | ${R} | ${R} | X... .... .... ....`),
}
const MID = `${rep(R, 2)} | x... .... .... .... | ${R}`
const kempur = { 1: drum(1, 21, MID), 2: drum(2, 22, MID), 3: beat(23, `${rep(R, 4)} | h... .... .... .... | ${rep(R, 3)}`), 4: drum(4, 24, MID), 6: beat(25, `${R} | x... .... .... .... | X... .... X... ....`) }
const KLEN = `${R} | .... .... x... .... | ${R} | .... .... x... ....`
const klentong = { 1: drum(1, 31, KLEN), 2: drum(2, 32, KLEN), 4: drum(4, 33, KLEN) }
const kempli = {
  0: beat(41, enter(4, 'h... h... h... h...')), 1: drum(1, 42, 'x... h... x... h...'), 2: drum(2, 43, 'X... x... X... x...'), 3: drum(3, 44, 'h... .... h... ....'),
  4: drum(4, 45, 'x... h... x... h...'), 6: beat(46, 'X... x... X... x... | X... x... X... x...'),
}
const wadon = {
  0: beat(51, enter(6, 'h... ..h. .h.. h...')), 1: drum(1, 52, 'x... ..x. .h.. x...'), 2: drum(2, 53, 'X..x ..X. .x.X ..x.'), 3: drum(3, 54, 'h... .... .... h...'),
  4: drum(4, 55, 'X.x. .X.x ..X. x.X. | X..x X..x X.X. .xX.'), 5: beat(56, `${R} | .... .... x.xx X.x. | ${R} | x.x. xx.x X.xx XxX. | ${R} | .... .... x.xx X.x. | ${R} | .... .... X.X. X...`),
  6: beat(57, 'X..x ..X. .x.X ..x. | X..x ..X. .x.X ..x. | X... .... X... ....'),
}
const lanang = {
  0: beat(61, enter(6, '..h. h... ..h. ..hh')), 1: drum(1, 62, '..x. x... ..x. ..xh'), 2: drum(2, 63, '.xX. xx.x X.x. xX.x'), 4: drum(4, 64, '.x.X x.X. xx.X .x.x | .xX. .xX. .x.x X..x'),
  5: beat(65, `${R} | .... .... .x.. .x.X | ${R} | .x.X ..x. .x.. x..X | ${R} | .... .... .x.. .x.X | ${R} | .... .... .x.x .X..`), 6: beat(66, '.xX. xx.x X.x. xX.x | .xX. xx.x X.x. xXxX'),
}
const cengceng = {
  1: drum(1, 71, 'x.h. x.h. x.h. x.h.'), 2: drum(2, 72, 'Xhxh Xhxh Xhxh Xhxh'), 4: drum(4, 73, 'x.hx h.x. x.hx h.xh'),
  5: beat(74, `X... .... X... X... | X... .... xxxx xxxx | xxxx xxxx X... .... | xxxx xxxx xxxx xxxx | X... .... X... X... | X... .... xxxx xxxx | xxxx xxxx X... X... | X... .... .... ....`),
  6: beat(75, 'Xhxh Xhxh Xhxh Xhxh | Xhxh Xhxh Xhxh Xhxh | X... .... X... ....'),
}
const angsel = { [FILL]: beat(81, '.... .... x.xx XxX.') }

const metal = { octave: 3, attack: .002, decay: .9, sustain: .1, release: .5, lpf: 7500, hpf: 250, reverb: .2 }
const PARTS = finish([
  Q('a1', 'Jegogan', 'bass', 'sustain', V.marimba({ gain: 1, octave: 2, decay: 1.6, sustain: .2, release: .8, lpf: 2400, hpf: 60, role: 'bass', reverb: .22, panWidth: .1 }), jegogan, on(...ALL)),
  Q('a2', 'Gong ageng', 'rhythm', 'pulse', V.tamTam({ gain: .9, pan: 0, panWidth: 0 }), gong, on(...ALL)),
  Q('b1', 'Ugal', 'melody', 'phrase', V.celesta({ ...metal, gain: .26, pan: 0 }), ugal, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('b2', 'Kempli', 'rhythm', 'pulse', V.gongue({ gain: .16, decay: .1, lpf: 3200, pan: .06 }), kempli, on(0, 1, 2, 3, 4, 6, 7, 8)),
  Q('c1', 'Gangsa · polos', 'harmony', 'phrase', V.celesta({ ...metal, gain: .26, decay: .5, release: .25, pan: -.36 }), polos, on(1, 2, 4, 5, 7, 8)),
  Q('c2', 'Kendang wadon', 'rhythm', 'pulse', V.conga({ gain: .34, lpf: 3200, hpf: 70, decay: .24, pan: -.12 }), wadon, on(...ALL)),
  Q('d1', 'Suling', 'melody', 'sustain', V.worldFlute({ gain: .3, octave: 3, pan: .12, reverb: .26 }), suling, on(3, 6)),
  Q('d2', 'Kendang lanang', 'rhythm', 'pulse', V.bongo({ gain: .44, pan: .12 }), lanang, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('e1', 'Gangsa · sangsih', 'harmony', 'phrase', V.celesta({ ...metal, gain: .28, decay: .5, release: .25, lpf: 8500, pan: .36, vibrato: 6, vibratoDepth: .04 }), sangsih, on(1, 2, 4, 5, 7, 8)),
  Q('e2', 'Ceng-ceng', 'rhythm', 'pulse', V.hat({ gain: .9, pan: .26 }), cengceng, on(1, 2, 4, 5, 6, 7, 8)),
  Q('f1', 'Calung', 'harmony', 'phrase', V.fmBell({ gain: .14, octave: 3, decay: 1, release: .5, lpf: 4200, pan: -.14 }), calung, on(...ALL)),
  Q('f2', 'Kempur', 'rhythm', 'pulse', V.tamTam({ gain: .6, decay: 1, hpf: 110, pan: -.2 }), kempur, on(1, 2, 3, 4, 6, 7, 8)),
  Q('g1', 'Reyong', 'response', 'phrase', V.marimba({ gain: .7, octave: 3, decay: .3, lpf: 8000, hpf: 300, pan: .2, panWidth: .4 }), reyong, on(0, 1, 2, 4, 5, 6, 7, 8)),
  Q('g2', 'Klentong', 'rhythm', 'pulse', V.bellHigh({ gain: .16, decay: .4, pan: .3, reverb: .2 }), klentong, on(1, 2, 4, 6, 7)),
  Q('h1', 'Rebab', 'texture', 'sustain', V.violin({ gain: .5, octave: 3, lpf: 3600, pan: -.2, reverb: .24, role: 'pad' }), rebab, on(3)),
  Q('h2', 'Kendang · angsel', 'rhythm', 'pulse', V.conga({ gain: .36, decay: .16, pan: 0 }), angsel, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    b1: { 0: { gain: .34, reverbRange: { first: .28, second: .34 } } }, a2: { 0: { gain: .6 }, 3: { gain: .6 } }, f1: { 3: { gain: .1 } }, a1: { 3: { gain: .8 } },
    c2: { 3: { gain: .22 } }, b2: { 3: { gain: .1 } },
  },
})
build({
  id: 'ubud-1935', kitName: 'Gamelan', profileName: 'Ubud 1935 · Gamelan', meter: '4/4', bpm: 120, root: 'E', scale: 'Phrygian',
  form: FORM, parts: PARTS,
  reactions: reactions('gml', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Gamelan gong kebyar de Bali (pokok, kotekan polos e sangsih, reyong, kendang, ciclo de gongs; escala pelog selisir aproximada no temperamento do jogo): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Gamelan_gong_kebyar',
}).catch(error => { console.error(error); process.exit(1) })
