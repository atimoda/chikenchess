// 1935 Honolulu - Hula (original material).
// A hula troupe with a string band on a hotel lanai: the pahu and the ipu (a gourd, thumped on the mat and
// slapped) start as in the old dance, the ukulele joins with its lazy swing and the steel guitar slides in
// with the vamp that separates every verse. The singer's line is answered by the steel; the chorus is in
// close harmony; the dancers' implements ('uli'uli rattles, pū'ili split bamboo, 'ili'ili stones, kāla'au
// sticks) take the break.
// C major (Kit Harmony): C · F · G7 · Dm · Am.
// Form: pahu, ipu, ukulele, then the steel vamp · verse · chorus (harmonies) · interlude (soft: slow steel
// over humming) · verse · break (tense: implements and stops) · steel guitar solo · chorus · final tag.
// Run: node scripts/world/honolulu-1935.cjs
const { studio, build, reactions, Q, V } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Maior', {
  // C major degrees: 0 C · 1 D · 2 E · 3 F · 4 G · 5 A · 6 B.
  root: { C: 0, F: 3, G7: -3, Dm: 1, Am: -2 },
  names: {
    0: ['C', 'C', 'Dm', 'G7'], 1: ['C', 'C', 'F', 'C', 'G7', 'G7', 'C', 'C'], 2: ['F', 'C', 'G7', 'C'],
    3: ['C', 'Am', 'F', 'G7'], 4: ['C', 'C', 'F', 'C', 'G7', 'G7', 'C', 'C'], 5: ['Dm', 'G7', 'C', 'C'], 6: ['Dm', 'G7', 'C', 'C'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Lazy swing: the off-beat sits on the last sixteenth, pulled back towards the triplet.
  feel: { push: [0, 0, 0, -2], jitter: 2, vel: .07 },
  colour: { spread: .12, ring: .2 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, tune, harmony, comp, riff, from, unroll, finish } = S
const { rep, mel, relative } = C
const R = '................'
const REST = 'r:16'
const END = 'X... X..X X... .... | X... .... .... ....'
const STOP = 'X... .... .... .... | X... .... X..X X...'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- pahu, ipu and the dancers' implements ----------
const pahu = { 0: beat(11, `${C.tile('X... .... x..x ....', 4)} | ${rep(R, 4)}`), 5: drum(5, 12, 'X... .... x..x .... | X... x... x..x x...') }
// The ipu: thump on the mat, then two slaps of the fingers.
const thump = {
  0: beat(21, enter(2, 'x... .... h... ....')), 1: drum(1, 22, 'X... .... x... ....'), 2: drum(2, 23, 'X... .... x... ...x'), 3: drum(3, 24, 'h... .... .... ....'),
  4: drum(4, 25, 'X... .... x... ....'), 5: drum(5, 26, 'X... ...x X... .... | X... ...x X..x X...'), 6: beat(27, `X... .... x... ...x | X... .... x... ...x | ${END}`),
}
const slap = {
  0: beat(31, enter(2, '.... h..h .... h...')), 1: drum(1, 32, '.... x..x .... x...'), 2: drum(2, 33, '.... x..x .... x..x'), 3: drum(3, 34, '.... h... .... h...'),
  4: drum(4, 35, '.... x..x .... x...'), 5: drum(5, 36, '.... x..x .... x..x | .... x..x .... ....'), 6: beat(37, `.... x..x .... x..x | .... x..x .... x..x | ${END}`),
}
const uliuli = { 1: drum(1, 41, 'h..h h..h h..h h..h'), 2: drum(2, 42, 'x..h x..h x..h x..h'), 4: drum(4, 43, 'h..h h..h h..h h..h'), 5: drum(5, 44, 'X..x X..x X..x X..x | X..x X..x xxxx X...'), 6: beat(45, `x..h x..h x..h x..h | x..h x..h x..h x..h`) }
const puili = { 1: drum(1, 51, '.... h... .... h..h'), 2: drum(2, 52, '.... x... .... x..x'), 5: drum(5, 53, '.... x..x .... x..x | ...x x..x ...x x...'), 6: beat(54, '.... x... .... x..x | .... x... .... x..x') }
const iliili = { 2: drum(2, 61, 'x... x..x x... x..x'), 3: drum(3, 62, '.... h... .... h...'), 5: drum(5, 63, 'x..x x..x x..x x..x | x..x x..x x... ....'), 6: beat(64, `x... x..x x... x..x | x... x..x x... x..x | ${END}`) }
const kalaau = { 2: drum(2, 71, '.... .... x..x ....'), 5: drum(5, 72, 'x... x... x..x x... | x... x... x..x x..x') }
const gourd = { [FILL]: beat(81, '.... .... x..x X..X') }

// ---------- bass, ukulele, guitar ----------
const bass = {
  0: from(4, unroll(riff(1, 101, '0:6 r:2 4:6 r:2', { gate: .9 }), 8)), 1: riff(1, 102, '0:6! r:2 4:6 r:2', { gate: .9 }), 2: riff(1, 103, '0:4! 2:4 4:4 2:4', { gate: .86 }),
  3: riff(1, 104, '0:12 4:4', { gate: .96, accent: { strong: .6, beat: .54, off: .5 } }), 4: riff(2, 105, '0:6! r:2 4:6 r:2 | 0:4! 2:4 4:4 2:4', { gate: .88 }), 5: riff(2, 106, '0:4! r:12 | 0:4! r:4 0:3 0:1 0:4', { gate: .8 }),
  6: mel('0:4! 2:4 4:4 2:4 | 0:4! 2:4 4:4 2:4 | 0:4! r:4 0:3 0:1 4:4 | 0:8!', { gate: .9 }),
}
// C [C E G] · F [C F A] · G7 [D F G] · Dm [D F A] · Am [C E A]
const CHORD = { C: [7, 9, 11], F: [7, 10, 12], G7: [8, 10, 11], Dm: [8, 10, 12], Am: [7, 9, 12] }
const STRUM = 'h..x X..h h..x X..h'
const ukulele = {
  0: from(2, unroll(comp(CHORD, 0, 'h..h x..h h..h x..h', 111, { length: 1 / 14 }), 8)), 1: comp(CHORD, 1, STRUM, 112, { length: 1 / 14 }), 2: comp(CHORD, 2, STRUM, 113, { length: 1 / 14 }),
  3: comp(CHORD, 3, 'o... h... o... h...', 114, { length: 1 / 6 }), 4: comp(CHORD, 4, STRUM, 115, { length: 1 / 14 }), 5: comp(CHORD, 5, STOP, 116, { length: 1 / 10 }),
  6: relative(S.hand(117, C.named(['Dm', 'G7', 'C', 'C'], `${STRUM} | ${STRUM} | ${END}`, CHORD, { length: 1 / 10 })), H(6)),
}
// The guitar keeps the thumb on the bass strings and lets the upper ones ring.
const KEY = '0:3 7:1 9:3 7:1 4:3 7:1 9:3 7:1'
const guitar = {
  1: riff(1, 121, KEY, { gate: .94, accent: { strong: .64, beat: .54, off: .48 } }), 2: riff(1, 122, '0:3 7:1 9:3 11:1 4:3 7:1 11:3 9:1', { gate: .94, accent: { strong: .7, beat: .58, off: .5 } }),
  3: riff(1, 123, '0:4 7:4 9:4 11:4', { gate: 1, accent: { strong: .5, beat: .46, off: .42 } }), 4: riff(1, 124, KEY, { gate: .94, accent: { strong: .64, beat: .54, off: .48 } }), 6: unroll(riff(1, 125, KEY, { gate: .94 }), 2),
}

// ---------- steel guitar and voices ----------
const VAMP = `${rep(REST, 4)} | 11:6~ 12:2 14:8~ | 16:4 14:4 12:4 11:4 | 15:6~ 14:2 12:8~ | 13:4 11:4 10:4 8:4`
const FILLS = 'r:16 | r:8 14:4~ 16:4 | r:16 | r:6 16:2 14:4 12:4 | r:16 | r:8 13:4~ 15:4 | r:16 | r:6 14:2 16:4 18:4~'
const STEEL = '14:6~ 16:2 18:8~ | 16:4 14:4 12:4 11:4 | 12:6~ 14:2 17:8~ | 16:12~ r:4 | 15:6~ 13:2 11:8~ | 10:4 11:4 13:4 15:4 | 16:6~ 14:2 12:4 11:4 | 14:12~ r:4'
const SLOW = '16:12~ 14:4 | 14:12~ 12:4 | 12:8~ 14:8 | 15:12~ r:4 | 18:12~ 16:4 | 16:8~ 14:8 | 14:8~ 12:8 | 13:12~ r:4'
const TAG = '15:4 14:4 12:4 10:4 | 11:4 13:4 15:4 17:4 | 16:8~ 14:8~ | 14:16*'
const VERSE = 'r:4 9:3 9:1 11:3 9:1 12:4 | 11:8~ r:4 9:3 7:1 | 10:3 10:1 12:3 10:1 14:4 12:4 | 11:10~ r:6 | r:4 8:3 8:1 10:3 8:1 11:4 | 10:8~ r:4 8:3 6:1 | 7:3 7:1 9:3 7:1 11:4 9:4 | 7:10~ r:6'
const CHORUS = '12:6 14:2 12:4 10:4 | 11:6 12:2 11:4 9:4 | 10:6 11:2 10:4 8:4 | 9:12~ r:4 | 12:6 14:2 15:4 14:4 | 14:6 12:2 11:4 9:4 | 8:4 10:4 11:4 13:4 | 14:12~ r:4'
const HUM = '9:16 | 9:16 | 10:16 | 10:16 | 9:16 | 9:16 | 10:16 | 8:16'
const LAST = 'r:16 | r:16 | 9:8 11:8 | 14:12 r:4'
const slid = { glide: 8, jitter: 2, low: .52, high: .84 }, sung = { low: .54, high: .86, glide: 4, jitter: 2 }
const steel = { 0: tune(VAMP, 0, 141, slid), 1: tune(FILLS, 1, 142, { ...slid, low: .44, high: .7 }), 3: tune(SLOW, 3, 143, { ...slid, low: .42, high: .68 }), 4: tune(STEEL, 4, 144, slid), 6: tune(TAG, 6, 145, slid) }
const voz = { 1: tune(VERSE, 1, 151, sung), 2: tune(CHORUS, 2, 152, { ...sung, low: .6, high: .9 }), 6: tune(LAST, 6, 153, sung) }
const high = { 2: harmony(CHORUS, 2, 161, sung), 6: harmony(LAST, 6, 162, sung) }
const low = { 2: harmony(CHORUS, 2, 171, sung, -4), 6: harmony(LAST, 6, 172, sung, -4) }
const hum = { 3: tune(HUM, 3, 181, { low: .36, high: .5 }), 5: tune(`${rep(REST, 2)} | 9:16 | 9:12 r:4 | ${rep(REST, 2)} | 9:16 | 11:12 r:4`, 5, 182, { low: .4, high: .56 }) }

const PARTS = finish([
  Q('a1', 'Bass', 'bass', 'phrase', V.bass({ gain: .44, attack: .008, lpf: 1200, panWidth: .1 }), bass, on(...ALL)),
  Q('a2', 'Ipu · thump', 'rhythm', 'pulse', V.pandeiro({ gain: .34, lpf: 1800, pan: 0, panWidth: 0 }), thump, on(...ALL)),
  Q('b1', 'Steel guitar', 'melody', 'sustain', V.slide({ gain: .32, octave: 3, pan: .14 }), steel, on(0, 1, 3, 4, 6, 8)),
  Q('b2', 'Ipu · slap', 'rhythm', 'pulse', V.slap({ gain: .34, pan: .06 }), slap, on(...ALL)),
  Q('c1', 'Ukulele', 'harmony', 'phrase', V.cavaquinho({ gain: .26, pan: -.26 }), ukulele, on(...ALL)),
  Q('c2', '\'Uli\'uli', 'rhythm', 'pulse', V.shaker({ gain: .26, pan: .32 }), uliuli, on(1, 2, 4, 5, 6, 7, 8)),
  Q('d1', 'Singer', 'melody', 'sustain', V.voice({ gain: .42, pan: 0, reverb: .2 }), voz, on(1, 2, 4, 7, 8)),
  Q('d2', 'Pū\'ili', 'rhythm', 'pulse', V.brush({ gain: .3, pan: -.3 }), puili, on(1, 2, 4, 5, 7, 8)),
  Q('e1', 'Harmony', 'response', 'sustain', V.voice({ gain: .3, pan: .22, reverb: .2 }), high, on(2, 7, 8)),
  Q('e2', '\'Ili\'ili', 'rhythm', 'pulse', V.clave808({ gain: .1, pan: .2 }), iliili, on(2, 3, 5, 7, 8)),
  Q('f1', 'Guitar', 'harmony', 'phrase', V.nylon({ gain: .36, pan: .28 }), guitar, on(1, 2, 3, 4, 6, 7, 8)),
  Q('f2', 'Kāla\'au', 'rhythm', 'pulse', V.rim({ gain: .16, pan: -.16 }), kalaau, on(2, 5, 7)),
  Q('g1', 'Low harmony', 'response', 'sustain', V.voice({ gain: .28, pan: -.22, reverb: .2 }), low, on(2, 7, 8)),
  Q('g2', 'Pahu', 'rhythm', 'pulse', V.tom({ gain: .3, decay: .35, lpf: 1600, pan: -.08 }), pahu, on(0, 5)),
  Q('h1', 'Humming', 'texture', 'sustain', V.voice({ gain: .24, pan: 0, lpf: 2600, reverb: .28, role: 'pad' }), hum, on(3, 5)),
  Q('h2', 'Ipu · turn', 'rhythm', 'pulse', V.slap({ gain: .36, pan: .06 }), gourd, on()),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  params: {
    a1: { 3: { gain: .38 } }, a2: { 0: { gain: .26 }, 3: { gain: .2 } }, c1: { 0: { gain: .16 }, 3: { gain: .16 } },
    b1: { 0: { reverbRange: { first: .24, second: .3 } }, 3: { reverbRange: { first: .28, second: .34 } } },
  },
})
build({
  id: 'honolulu-1935', kitName: 'Hula', profileName: 'Honolulu 1935 · Hula', meter: '4/4', bpm: 88, root: 'C', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('hul', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Hula ku\'i e música havaiana com steel guitar (ipu, \'uli\'uli, pū\'ili, ukulele, vozes em harmonia; Sol Ho\'opi\'i, Lena Machado, anos 1920–30): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Hula',
}).catch(error => { console.error(error); process.exit(1) })
