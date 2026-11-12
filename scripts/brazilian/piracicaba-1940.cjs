// 1940 Piracicaba - Sertanejo raiz: moda caipira and cateretê (original material).
// Música caipira of the São Paulo interior: the dupla sings in parallel thirds (the second voice a third
// under the first), the ten-string viola caipira opens with its ponteio and strums the cateretê rasqueado,
// the violão walks the bass with its little baixarias, a sanfona holds the refrain, and in the catira the
// dancers answer with palmas and sapateado instead of drums. Straight eighths, a little loose, never a machine.
// G major (Kit Harmony): I–V7 in the verse, a refrain that opens on the IV.
// Form: viola ponteio · moda (the dupla) · refrão · moda de viola (soft: the viola alone over the bordão) ·
// moda · catira (tense: E minor, palmas and sapateado in front, the dupla calling) · viola solo · refrão · final.
// Run: node scripts/brazilian/piracicaba-1940.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('2/4', 'Maior')
const { mel, hits, relative, feel, tone, line, phrase, named, vel, up, set } = C

// G major degrees: 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F# (7 = G an octave up).
const ROOT = { G: 0, D7: 4, C: 3, Em: 5, Am: 1 }
const NAMES = {
  0: ['G', 'D7', 'G', 'G'], 1: ['G', 'G', 'D7', 'D7', 'D7', 'D7', 'G', 'G'], 2: ['C', 'C', 'G', 'G', 'D7', 'D7', 'G', 'G'],
  3: ['G', 'C', 'G', 'D7', 'G', 'C', 'D7', 'G'], 4: ['G', 'G', 'D7', 'D7', 'C', 'G', 'D7', 'G'], 5: ['Em', 'Em', 'D7', 'D7', 'C', 'C', 'D7', 'Em'],
  6: ['D7', 'D7', 'G', 'G'],
}
const H = bank => NAMES[bank].map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: H(0) },
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Interlude', bars: 8, bank: 3, harmony: H(3) },   // moda de viola: soft
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Break', bars: 8, bank: 5, harmony: H(5) },       // catira: tense
  { label: 'Solo', bars: 16, bank: 4, harmony: H(4) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Outro', bars: 4, bank: 6, harmony: H(6) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const barsOf = bank => FORM.find(s => s.bank === bank).bars
// Caipira feel: straight, the offbeat sixteenth a hair late, hands and boots never even.
const ROCA = { push: [0, 1, 0, -1], jitter: 1, vel: .06 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...ROCA, seed, ...extra }))
const drum = (bank, seed, text) => C.roll(Math.min(4, barsOf(bank)), hand(seed, hits(text)))

// ---------- the dupla (eight sixteenths a bar, '.' holds) ----------
const MODA = ['. . 4 . 4 . 4 .', '5 . 4 . 2 . 4 .', '3 . 3 . 3 . 4 3', '1 . . . . . . .',
  '. . 1 . 1 . 1 .', '3 . 1 . -1 . 1 .', '2 . 2 . 1 . 0 .', '0 . . . . . . .']
const MODA2 = ['. . 4 . 4 . 4 .', '5 . 4 . 2 . 4 .', '3 . 3 . 3 . 4 3', '1 . . . . . . .',
  '. . 4 . 3 . 1 .', '3 . . 1 -1 . -3 .', '0 . 2 . 1 . -1 .', '0 . . . . . . .']
const REFRAO = ['. . 5 . 5 . 7 .', '7 . 5 . 4 . 5 .', '4 . . . 2 . 4 .', '4 . . . . . . .',
  '. . 3 . 3 . 5 .', '4 . 3 . 1 . 3 .', '2 . 1 . 0 . 1 .', '2 . . . . . . .']
const REFRAO2 = ['. . 5 . 5 . 7 .', '7 . 5 . 4 . 5 .', '4 . . . 2 . 4 .', '4 . . . . . . .',
  '. . 3 . 5 . 8 .', '6 . . 4 . . 3 .', '2 . 1 . 2 . 1 .', '0 . . . . . . .']
const CATIRA = ['5 . 5 . 5 . 4 .', '2 . . . . . . .', '4 . 4 . 4 . 3 .', '1 . . . . . . .',
  '5 . 5 . 3 . 2 .', '0 . 2 . 3 . . .', '4 . 3 . 1 . -1 .', '-2 . . . . . . .']
const FINAL = ['3 . 1 . -1 . 1 .', '3 . . 4 . . 6 .', '7 . . . . . . .', '. . . . . . . .']
const sing = (rows, bank, seed, options) => relative(phrase(line(rows), seed, options), H(bank))
/** The second voice: the same words a third below, a little softer and never quite together. */
const segunda = (rows, bank, seed, options) => relative(vel(up(phrase(line(rows), seed, options), -2), .86), H(bank))

const primeira = {
  1: sing([...MODA, ...MODA2], 1, 11), 2: sing([...REFRAO, ...REFRAO2], 2, 12, { low: .56, high: .9 }),
  5: sing(CATIRA, 5, 13, { low: .66, high: .95, glide: 0 }), 6: sing(FINAL, 6, 14),
}
const segundaVoz = {
  1: segunda([...MODA, ...MODA2], 1, 21), 2: segunda([...REFRAO, ...REFRAO2], 2, 22, { low: .56, high: .9 }),
  5: segunda(CATIRA, 5, 23, { low: .66, high: .95, glide: 0 }), 6: segunda(FINAL, 6, 24),
}

// ---------- viola caipira: ponteio in thirds ----------
/** A ponteio line with its third underneath, the way the viola's paired courses ring. */
const ponteia = (rows, bank, seed, options = {}) => {
  const top = phrase(line(rows, { gate: .9 }), seed, { glide: 0, ...options })
  return relative([...top, ...vel(up(top, -2), .72)].sort((a, b) => a.start - b.start), H(bank))
}
const PONTEIO = ['4 2 4 7 4 2 0 2', '3 1 3 6 3 1 -1 1', '4 2 4 7 9 7 4 2', '0 . . . 1 2 3 4']
const MODA_DE_VIOLA = ['4 . 2 . 4 . 7 .', '5 . 3 . 0 . 3 .', '4 . . . 2 . 0 .', '3 . 1 . -1 . 1 .',
  '4 . 2 . 4 . 7 .', '8 . 7 . 5 . 3 .', '6 . 5 . 3 . 1 .', '2 . . . . . . .']
const SOLO = ['4 2 4 7 4 2 0 2', '4 . 4 5 7 . 4 .', '3 1 3 6 3 1 -1 1', '3 . 3 4 6 . 3 .',
  '5 3 5 7 5 3 0 3', '4 2 4 7 9 7 4 2', '6 . 5 . 3 . 1 .', '2 . . . 4 . 7 .',
  '9 7 4 7 9 7 4 2', '4 . 2 . 0 . 2 4', '8 6 3 6 8 6 3 1', '3 . 1 . -1 . 1 3',
  '5 7 5 3 0 3 5 7', '9 . 7 . 4 . 2 .', '3 . 1 . 3 . 6 .', '7 . . . . . . .']
const ponteio = {
  0: ponteia(PONTEIO, 0, 31, { low: .5, high: .8 }),
  // In the moda the viola only answers at the ends of the dupla's lines.
  1: ponteia(['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . 4 3 1 -1',
    '. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . 4 2 4 7'], 1, 32, { low: .42, high: .62 }),
  3: ponteia(MODA_DE_VIOLA, 3, 33, { low: .4, high: .66, jitter: 2 }),
  4: ponteia(SOLO, 4, 34, { low: .55, high: .9 }),
  5: ponteia(['. . . . . . . .', '. . . . 2 1 0 -1', '. . . . . . . .', '. . . . 1 0 -1 -3',
    '. . . . . . . .', '. . . . 3 2 0 -1', '. . . . . . . .', '. . . . . . . .'], 5, 35, { low: .7, high: .95 }),
}

// ---------- accompaniment ----------
const VIOLA = { G: [0, 2, 4, 7], D7: [-1, 1, 3, 4], C: [0, 2, 3, 5], Em: [-1, 2, 4, 5], Am: [1, 3, 5, 8] }
const NYLON = { G: [0, 2, 4], D7: [-1, 1, 3], C: [0, 3, 5], Em: [-1, 2, 4], Am: [1, 3, 5] }
const BASS = { G: [0, -3], D7: [-3, -6], C: [-4, -7], Em: [-2, -5], Am: [-6, -2] }
const RUN = { G: '0 -1 -2 -3', D7: '-3 -2 -1 0', C: '-4 -3 -2 -1', Em: '-2 -3 -4 -5', Am: '-6 -5 -4 -3' }
const loopNames = bank => NAMES[bank].slice(0, Math.min(8, barsOf(bank)))
const comp = (table, bank, rhythm, seed, options) => C.roll(Math.min(8, barsOf(bank)), relative(C.strum(hand(seed, named(loopNames(bank), rhythm, table, options)), 1 / 96), H(bank)))
/** The violão's bass: root and fifth, and every fourth bar a little run into the next chord. */
function walk(bank, seed, runs = [3]) {
  const names = Array.from({ length: barsOf(bank) }, (_, i) => NAMES[bank][i % NAMES[bank].length])
  const text = names.map((name, bar) => runs.includes(bar % 4)
    ? `${BASS[name][0]}:4! ${RUN[name].split(' ').slice(2).map(d => `${d}:2`).join(' ')}`
    : `${BASS[name][0]}:4! ${BASS[name][1]}:4`).join(' | ')
  return relative(hand(seed, mel(text, { gate: .8, accent: { strong: .84, beat: .74, off: .64 } })), H(bank))
}
const bordao = {
  1: walk(1, 41), 2: walk(2, 42), 3: walk(3, 43, []), 4: walk(4, 44), 5: walk(5, 45, [1, 3]),
  6: relative(mel("-3:4! -6:4 | -3:4 -2:2 -1:2 | 0:8! | r:8"), H(6)),
}
const RASQUEADO = 'X.xx X.x. | X.xx X.xm'
const rasqueado = {
  0: comp(VIOLA, 0, 'h... .... | h... .... | h... .... | ........', 51, { length: 1 / 2 }),
  1: comp(VIOLA, 1, 'o.hh o.h. | o.hh o.h,', 52, { length: 1 / 10 }), 2: comp(VIOLA, 2, RASQUEADO, 53, { length: 1 / 10 }),
  4: comp(VIOLA, 4, 'o.hh o.h. | o.hh o.hh', 54, { length: 1 / 10 }), 5: comp(VIOLA, 5, 'X.xX X.xX | X.xX XxXx', 55, { length: 1 / 12 }),
  6: comp(VIOLA, 6, 'X.xx X.x. | X.xx X.xx | X... .... | ........', 56, { length: 1 / 6 }),
}
const batida = {
  1: comp(NYLON, 1, '..o. ..o. | ..o. ..oh', 61, { length: 1 / 12 }), 2: comp(NYLON, 2, '..o. ..o. | ..o. .ho.', 62, { length: 1 / 12 }),
  3: comp(NYLON, 3, 'h... .... | ..h. ....', 63, { length: 1 / 4 }), 4: comp(NYLON, 4, '..o. ..o.', 64, { length: 1 / 12 }),
  6: comp(NYLON, 6, '..o. ..o. | ..o. ..o. | o... .... | ........', 65, { length: 1 / 6 }),
}
// g1 Sanfona: long chords breathing with the bellows in the refrão and the solo, a whisper in the moda de viola.
const SANFONA = { G: [0, 2, 4], D7: [-1, 1, 3], C: [0, 3, 5], Em: [-1, 2, 4], Am: [1, 3, 5] }
const sanfona = {
  2: comp(SANFONA, 2, 'm... .... | o... ....', 71, { length: .95 }), 3: comp(SANFONA, 3, 'h... .... | g... ....', 72, { length: .95 }),
  4: comp(SANFONA, 4, 'o... .... | h... ....', 73, { length: .95 }), 6: comp(SANFONA, 6, 'o... .... | o... .... | m... .... | ........', 74, { length: .95 }),
}
// h1 The viola's low open courses ringing under the ponteio (cebolão tuning).
const cebolao = {
  0: relative(mel('0:8! | -3:8 | 0:8 | 0:8'), H(0)),
  3: relative(mel('0:8! | 0:8 | 0:8 | -3:8 | 0:8! | 0:8 | -3:8 | 0:8'), H(3)),
}

// ---------- the catira's body percussion and the roça's little percussion ----------
const sapateado = { 1: drum(1, 81, 'o....... | ........ | o....... | ....o...'), 2: drum(2, 82, 'm...o... | m...o... | m...o... | m.o.o...'),
  4: drum(4, 83, 'o...h... | o....... | o...h... | o...o...'), 5: drum(5, 84, 'X.xx X.x. | X.xx X.x. | X.xx X.x. | X.xX XxXX'),
  6: drum(6, 85, 'm...o... | m...o... | X.x.X.x. | X.......') }
const escova = { 2: drum(2, 91, '......hh | ......hh | ......hh | ....hhoo'), 5: drum(5, 92, 'oo..oo.x | oo..oo.x | oo..oo.x | ooxxooxX') }
const palmas = { 2: drum(2, 101, '..x. ..x. | ..x. ..xx'), 5: drum(5, 102, '..xX ..xX | ..xX .xXX'), 6: drum(6, 103, '..x. ..x. | ..x. ..x. | x.x. x.x. | X.......') }
const contratempo = { 2: drum(2, 111, '...h ...h'), 5: drum(5, 112, '.x.x .x.x | .x.x .xxx') }
const reco = { 1: drum(1, 121, '.... h... | .... h..,'), 2: drum(2, 122, '..h. o... | ..h. o.h.'), 4: drum(4, 123, '.... h... | ..,. h...'), 5: drum(5, 124, '..o. x... | ..o. x.o.') }
const ganza = { 1: drum(1, 131, 'g,h, g,h, | g,h, g,hm'), 2: drum(2, 132, 'ghmh ghmh | ghmh ghmm'), 3: drum(3, 133, 'g... g... | g... g.g.'),
  4: drum(4, 134, 'ghmh ghmh'), 6: drum(6, 135, 'ghmh ghmh | ghmh ghmh | ghmh ghmh | m.......') }
const pandeiro = { 2: drum(2, 141, '...h ...h | g..h g..o'), 4: drum(4, 142, 'g..h g..h'), 6: drum(6, 143, 'g..h g..h | g..h g..h | o.o. o.o. | m.......') }
const virada = { [FILL]: hand(151, hits('x.x. XXXX')) }

const STRING = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Violão · baixo', 'bass', 'phrase', SAMPLE('guitars', 'nylon'), bordao, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...STRING, octave: 3, gain: .46, attack: .004, decay: .5, sustain: .3, release: .22, clip: 1, lpf: 2400, hpf: 40, effects: { reverb: .12, pan: -.1 }, design: { role: 'bass' } }),
  P('a2', 'Sapateado', 'rhythm', 'pulse', DRUM('percussion', 'kick'), sapateado, on(1, 2, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 1300, hpf: 45, effects: { reverb: .16, pan: 0 } }),
  P('b1', 'Viola caipira · ponteio', 'melody', 'phrase', SAMPLE('brasil', 'viola-caipira'), ponteio, on(0, 1, 3, 4, 5, 6),
    { ...STRING, octave: 4, gain: .65, attack: .002, decay: .5, sustain: .25, release: .25, clip: 1, lpf: 6500, hpf: 160, effects: { reverb: .18, pan: .2 } }),
  P('b2', 'Palmas', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), palmas, on(2, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 7000, hpf: 350, effects: { reverb: .18, pan: -.2 } }),
  P('c1', 'Violão · batida', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), batida, on(1, 2, 3, 4, 7, 8),
    { ...STRING, octave: 3, gain: .2, attack: .004, decay: .3, sustain: .2, release: .15, clip: .9, lpf: 4500, hpf: 130, effects: { reverb: .12, pan: -.3 } }),
  P('c2', 'Palmas · contratempo', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), contratempo, on(2, 5, 7),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 7500, hpf: 500, effects: { reverb: .22, pan: .25 } }),
  P('d1', 'Primeira voz', 'melody', 'phrase', SAMPLE('brasil', 'coro-laia'), primeira, on(1, 2, 4, 5, 7, 8),
    { ...STRING, octave: 3, gain: .42, attack: .035, decay: .4, sustain: .75, release: .2, clip: 1, lpf: 5200, hpf: 160, effects: { reverb: .2, pan: -.08 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .1 } }),
  P('d2', 'Reco-reco', 'rhythm', 'pulse', DRUM('bateria', 'reco-reco'), reco, on(1, 2, 4, 5, 7),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 8000, hpf: 1300, effects: { reverb: .06, pan: .3 } }),
  P('e1', 'Segunda voz', 'melody', 'phrase', SAMPLE('brasil', 'coro-laia'), segundaVoz, on(1, 2, 4, 5, 7, 8),
    { ...STRING, octave: 3, gain: .3, attack: .04, decay: .4, sustain: .75, release: .2, clip: 1, lpf: 4600, hpf: 150, effects: { reverb: .2, pan: .08 }, design: { role: 'lead', vibrato: 4.6, vibratoDepth: .08 } }),
  P('e2', 'Sapateado · escova', 'rhythm', 'pulse', DRUM('drums', 'brush'), escova, on(2, 5, 7),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 4000, hpf: 300, effects: { reverb: .12, pan: -.1 } }),
  P('f1', 'Viola · rasqueado', 'harmony', 'phrase', SAMPLE('brasil', 'viola-caipira'), rasqueado, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...STRING, octave: 3, gain: .2, attack: .003, decay: .3, sustain: .2, release: .12, clip: .9, lpf: 5500, hpf: 200, effects: { reverb: .12, pan: .3 } }),
  P('f2', 'Ganzá', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), ganza, on(1, 2, 3, 4, 7, 8),
    { ...DRUMS, octave: 2, gain: .24, attack: .001, decay: .07, sustain: 0, release: .05, clip: .5, lpf: 9000, hpf: 3000, effects: { reverb: .05, pan: -.3 } }),
  P('g1', 'Sanfona', 'harmony', 'sustain', SAMPLE('keys', 'accordion'), sanfona, on(2, 3, 6, 7),
    { ...STRING, octave: 3, gain: .08, attack: .09, decay: .4, sustain: .8, release: .3, clip: 1, lpf: 3600, hpf: 150, effects: { reverb: .2, pan: -.25 } }),
  P('g2', 'Pandeiro', 'rhythm', 'pulse', DRUM('sambaReggae', 'pandeiro'), pandeiro, on(2, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .12, sustain: 0, release: .06, clip: .5, lpf: 9000, hpf: 400, effects: { reverb: .06, pan: .2 } }),
  P('h1', 'Viola · bordão', 'texture', 'sustain', SAMPLE('brasil', 'viola-caipira'), cebolao, on(0, 3),
    { ...STRING, octave: 3, gain: .22, attack: .003, decay: .9, sustain: .4, release: .5, clip: 1, lpf: 2800, hpf: 50, effects: { reverb: .26, pan: 0 } }),
  P('h2', 'Palmas · virada', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), virada, on(),
    { ...DRUMS, octave: 2, gain: .28, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 8000, hpf: 400, effects: { reverb: .2, pan: -.1 } }),
]
const viradaPart = PARTS.find(p => p.slot === 'h2')
viradaPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: virada[FILL] }
viradaPart.fills = { 1: FILL, 2: FILL, 4: FILL, 5: FILL, 6: FILL }
viradaPart.sections = FORM.map((_, i) => i in viradaPart.fills || null)
for (const part of PARTS) if (part !== viradaPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

const SECTION_PARAMS = {
  b1: { 3: { reverbRange: { first: .28, second: .34 } }, 5: { gain: .7 } },
  a1: { 3: { gain: .36 } },
  g1: { 3: { gain: .055, reverbRange: { first: .3, second: .36 } } },
  f2: { 3: { gain: .14 } },
  f1: { 5: { gain: .26, driveRange: { first: .05, second: .1 } } },
  d1: { 5: { gain: .48 } }, e1: { 5: { gain: .38 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'piracicaba-1940', kitName: 'Sertanejo raiz', profileName: 'Piracicaba 1940 · Moda caipira e cateretê', meter: '2/4', bpm: 100, root: 'G', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('cai', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Música caipira e cateretê do interior paulista (Cornélio Pires, Tonico e Tinoco, Raul Torres, a catira): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/M%C3%BAsica_caipira',
}).catch(error => { console.error(error); process.exit(1) })
