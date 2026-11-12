// 1960 Santo Amaro - Samba de roda · chula (original material).
// The samba chula of the Recôncavo Baiano: the viola machete calls, two cantadores sing the chula in
// thirds while nobody dances, the roda answers with the relativo, and only when the viola plays alone does
// the sambadeira enter the circle, miudinho, to the pandeiro, the palmas in three-three-two, the atabaque
// and the knife scraped on a plate (prato e faca). The samba sixteenths lean like in Rio, a little lazier.
// D major (Kit Harmony): I–V7 in the chula, a relativo that opens on the IV.
// Form: viola calling · chula · relativo · samba lento (soft: viola, voice and pandeiro) · chula ·
// samba corrido (tense: B minor, call and response, palmas and atabaque in front) · viola machete solo
// (the miudinho) · relativo · final.
// Run: node scripts/brazilian/santo-amaro-1960.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('2/4', 'Maior')
const { mel, hits, relative, feel, tone, line, phrase, named, vel, up } = C

// D major degrees: 0 D · 1 E · 2 F# · 3 G · 4 A · 5 B · 6 C# (7 = D an octave up).
const ROOT = { D: 0, G: 3, A7: 4, Bm: 5, Em: 1, 'F#m': 2 }
const NAMES = {
  0: ['A7', 'A7', 'D', 'D'], 1: ['D', 'D', 'A7', 'A7', 'A7', 'A7', 'D', 'D'], 2: ['G', 'G', 'D', 'D', 'A7', 'A7', 'D', 'D'],
  3: ['D', 'Bm', 'Em', 'A7', 'D', 'Bm', 'Em', 'A7'], 4: ['D', 'D', 'A7', 'A7', 'G', 'D', 'A7', 'D'], 5: ['Bm', 'Bm', 'F#m', 'F#m', 'Em', 'Em', 'F#m', 'Bm'],
  6: ['A7', 'A7', 'D', 'D'],
}
const H = bank => NAMES[bank].map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: H(0) },
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Interlude', bars: 8, bank: 3, harmony: H(3) },   // samba lento: soft
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Break', bars: 8, bank: 5, harmony: H(5) },       // samba corrido: tense
  { label: 'Solo', bars: 16, bank: 4, harmony: H(4) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Outro', bars: 4, bank: 6, harmony: H(6) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const barsOf = bank => FORM.find(s => s.bank === bank).bars
const RODA = { push: [0, 2, 0, -1], jitter: 1, vel: .06 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...RODA, seed, ...extra }))
const drum = (bank, seed, text) => C.roll(Math.min(4, barsOf(bank)), hand(seed, hits(C.tile(text, Math.min(4, barsOf(bank))))))

// ---------- the cantadores (eight sixteenths a bar, '.' holds) ----------
const CHULA = ['. . 4 . 4 . 5 4', '2 . . . 0 . 2 .', '4 . 3 . 1 . 3 .', '4 . . . . . . .',
  '. . 3 . 3 . 4 3', '1 . . . -1 . 1 .', '2 . 1 . 0 . -1 .', '0 . . . . . . .']
const CHULA2 = ['. . 4 . 4 . 5 4', '2 . . . 0 . 2 .', '4 . 3 . 1 . 3 .', '4 . . . . . . .',
  '. . 6 . 6 . 7 6', '4 . . . 3 . 1 .', '2 . 4 . 3 . 1 .', '0 . . . . . . .']
const RELATIVO = ['. . 3 . 5 . 7 .', '7 . 6 . 5 . 3 .', '4 . . . 2 . 4 .', '2 . . . . . . .',
  '. . 4 . 6 . 8 .', '6 . 4 . 3 . 1 .', '2 . . 4 . . 2 .', '0 . . . . . . .']
const RELATIVO2 = ['. . 3 . 5 . 7 .', '7 . 6 . 5 . 3 .', '4 . . . 2 . 4 .', '2 . . . . . . .',
  '. . 4 . 6 . 8 .', '6 . 4 . 3 . 1 .', '4 . 2 . 1 . 2 .', '0 . . . . . . .']
const CORRIDO = ['5 . 5 . 4 . 2 .', '5 . . . . . . .', '2 . 2 . 1 . -1 .', '2 . . . . . . .',
  '. . 3 . 3 . 1 .', '-1 . . . 1 . 3 .', '2 . 1 . -1 . 1 .', '-2 . . . . . . .']
const RESPOSTA = ['. . . . . . . .', '. . . . 5 . 4 .', '. . . . . . . .', '. . . . 2 . 1 .',
  '. . . . . . . .', '. . . . 3 . 1 .', '. . . . . . . .', '. . . . 0 . -2 .']
const LENTO = ['4 . . . 2 . . .', '5 . . . 4 . 2 .', '1 . . . 3 . . .', '4 . . . . . . .',
  '4 . . . 6 . . .', '5 . . . 4 . 2 .', '1 . . . 3 . 1 .', '-1 . . . . . . .']
const FINAL = ['4 . 3 . 1 . 3 .', '4 . . . 6 . 8 .', '7 . . . . . . .', '. . . . . . . .']
const sing = (rows, bank, seed, options) => relative(phrase(line(rows), seed, options), H(bank))
const third = (rows, bank, seed, options) => relative(vel(up(phrase(line(rows), seed, options), -2), .84), H(bank))

const cantador = {
  1: sing([...CHULA, ...CHULA2], 1, 11), 3: sing(LENTO, 3, 12, { low: .4, high: .64, jitter: 2 }),
  5: sing(CORRIDO, 5, 13, { low: .66, high: .95, glide: 0 }), 6: sing(FINAL, 6, 14),
}
const segundo = { 1: third([...CHULA, ...CHULA2], 1, 21), 5: third(CORRIDO, 5, 22, { low: .6, high: .88, glide: 0 }), 6: third(FINAL, 6, 23) }
// g1 The roda: the relativo, and the answers of the samba corrido.
const roda = {
  2: sing([...RELATIVO, ...RELATIVO2], 2, 31, { low: .55, high: .88 }),
  5: sing(RESPOSTA, 5, 32, { low: .7, high: .92, glide: 0 }), 6: sing(FINAL, 6, 33),
}

// ---------- viola machete ----------
const ponteia = (rows, bank, seed, options = {}) => {
  const top = phrase(line(rows, { gate: .85 }), seed, { glide: 0, ...options })
  return relative([...top, ...vel(up(top, -2), .7)].sort((a, b) => a.start - b.start), H(bank))
}
const CHAMADA = ['4 . 6 . 8 . 6 4', '3 . 1 . -1 . 1 .', '2 . 4 . 7 . 4 2', '0 . . . . . . .']
const MIUDINHO = ['4 2 4 7 4 2 0 2', '4 . 4 6 7 . 4 .', '3 1 3 6 4 1 -1 1', '4 . 3 . 1 . -1 .',
  '3 0 3 5 7 5 3 0', '2 4 7 4 2 0 2 4', '6 4 3 1 -1 1 3 4', '2 . . . 0 . . .',
  '7 6 4 2 4 6 7 9', '7 . 4 . 2 . 4 .', '8 6 4 3 1 3 4 6', '4 . . . 1 . . .',
  '5 3 0 3 5 7 10 7', '9 7 4 2 0 2 4 7', '6 . 4 . 3 . 1 .', '0 . . . . . . .']
const REST = '. . . . . . . .'
const machete = {
  0: ponteia(CHAMADA, 0, 41, { low: .55, high: .85 }),
  1: ponteia([REST, REST, REST, '. . . . 4 3 1 -1', REST, REST, REST, '. . . . 2 4 6 7'], 1, 42, { low: .45, high: .6 }),
  2: ponteia([REST, REST, REST, '. . . . 4 6 4 2', REST, REST, REST, '. . . . 2 4 6 7'], 2, 43, { low: .45, high: .6 }),
  3: ponteia([REST, REST, REST, '. . . . 6 4 3 1', REST, REST, REST, '. . . . 1 3 4 6'], 3, 44, { low: .36, high: .5 }),
  4: ponteia(MIUDINHO, 4, 45, { low: .55, high: .9 }),
}

// ---------- accompaniment ----------
const NYLON = { D: [0, 2, 4], G: [0, 3, 5], A7: [-1, 1, 3, 4], Bm: [-2, 0, 2], Em: [-1, 1, 3], 'F#m': [-3, -1, 2] }
const MACHETE = { D: [4, 7, 9], G: [3, 5, 7], A7: [3, 4, 6], Bm: [2, 4, 5], Em: [1, 3, 5], 'F#m': [2, 4, 6] }
const BASS = { D: [0, -3], G: [-4, 0], A7: [-3, -6], Bm: [-2, -5], Em: [-6, -3], 'F#m': [-5, -1] }
const BAIXARIA = { D: '0 -1 -2 -3', A7: '-3 -2 -1 0', G: '-4 -3 -2 -1', Bm: '-2 -3 -4 -5', Em: '-6 -5 -4 -3', 'F#m': '-5 -4 -3 -2' }
const loopNames = bank => NAMES[bank].slice(0, Math.min(8, barsOf(bank)))
const comp = (table, bank, rhythm, seed, options) => C.roll(Math.min(8, barsOf(bank)), relative(C.strum(hand(seed, named(loopNames(bank), rhythm, table, options)), 1 / 128), H(bank)))
function bordao(bank, seed, runs = [3]) {
  const names = Array.from({ length: barsOf(bank) }, (_, i) => NAMES[bank][i % NAMES[bank].length])
  const text = names.map((name, bar) => runs.includes(bar % 4)
    ? `${BASS[name][0]}:4! ${BAIXARIA[name].split(' ').slice(2).map(d => `${d}:2`).join(' ')}`
    : `${BASS[name][0]}:3! ${BASS[name][1]}:3 ${BASS[name][0]}:2'`).join(' | ')
  return relative(hand(seed, mel(text, { gate: .8, accent: { strong: .84, beat: .74, off: .64 } })), H(bank))
}
const violaoBaixo = { 1: bordao(1, 51), 2: bordao(2, 52), 3: bordao(3, 53, []), 4: bordao(4, 54), 5: bordao(5, 55, [1, 3]),
  6: relative(mel("-3:3! -6:3 -3:2 | -3:4 -2:2 -1:2 | 0:8! | r:8"), H(6)) }
const batida = {
  0: comp(NYLON, 0, 'h... .... | h... .... | h... .... | ........', 61, { length: 1 / 2 }),
  1: comp(NYLON, 1, '.o.o .o.h | .o.o .o.o', 62, { length: 1 / 12 }), 2: comp(NYLON, 2, 'o.oo .o.o | o.oo .o.o', 63, { length: 1 / 12 }),
  3: comp(NYLON, 3, 'h... ..h. | h... ....', 64, { length: 1 / 4 }), 4: comp(NYLON, 4, '.o.o .o.o', 65, { length: 1 / 12 }),
  5: comp(NYLON, 5, 'x.xx .x.x | x.xx .xxx', 66, { length: 1 / 12 }), 6: comp(NYLON, 6, 'o.oo .o.o | o.oo .o.o | o... .... | ........', 67, { length: 1 / 6 }),
}
const rasgado = {
  1: comp(MACHETE, 1, 'm.hh .h.h | m.hh .hmh', 71, { length: 1 / 12 }), 2: comp(MACHETE, 2, 'x.oo .o.o | x.oo .oxo', 72, { length: 1 / 12 }),
  4: comp(MACHETE, 4, 'h... h... | h... h.h.', 73, { length: 1 / 10 }), 5: comp(MACHETE, 5, 'X.xx .x.x | X.xx .xXx', 74, { length: 1 / 12 }),
  6: comp(MACHETE, 6, 'x.oo .o.o | x.oo .o.o | X... .... | ........', 75, { length: 1 / 6 }),
}

// ---------- the roda's percussion ----------
const pandeiro = { 1: drum(1, 81, 'g,hm g,hm | g,hm gohm'), 2: drum(2, 82, 'gohm gohm | gohm gomm'), 3: drum(3, 83, 'g,h, g,h,'),
  4: drum(4, 84, 'g,hm g,hm'), 5: drum(5, 85, 'gomX gomX | gomX gmmX'), 6: drum(6, 86, 'gohm gohm | gohm gohm | gohm gohm | m.......') }
const grave = { 1: drum(1, 91, 'x... o..o'), 2: drum(2, 92, 'x... o..o | x..o o..o'), 3: drum(3, 93, 'o... h..h'), 4: drum(4, 94, 'x... o..o'),
  5: drum(5, 95, 'x..o x..o | x.oo x..o'), 6: drum(6, 96, 'x... o..o | x... o..o | x... x... | x.......') }
const PALMAS = 'x..x ..x. | x..x ..x.'
const palmas = { 1: drum(1, 101, 'h..h ..h. | h..h ..h,'), 2: drum(2, 102, PALMAS), 4: drum(4, 103, PALMAS), 5: drum(5, 104, 'X..X ..X. | X..X .XX.'), 6: drum(6, 105, 'x..x ..x. | x..x ..x. | x.x. x.x. | X.......') }
const contratempo = { 2: drum(2, 111, '.h.h .h.h'), 4: drum(4, 112, '.h.h .h.h'), 5: drum(5, 113, '.x.x .x.x | .x.x .xxx') }
const prato = { 1: drum(1, 121, 'xhhx hhxh | xhhx hxxh'), 2: drum(2, 122, 'xhhx hhxh'), 4: drum(4, 123, 'xhhx hhxh'), 5: drum(5, 124, 'XhhX hhXh | XhhX hXXh'), 6: drum(6, 125, 'xhhx hhxh | xhhx hhxh | x.x. x.x. | x.......') }
const atabaque = { 2: drum(2, 131, 'o..o ..o. | o..x .ox.'), 4: drum(4, 132, 'o..o ..o.'), 5: drum(5, 133, 'x..x ..x. | x.xx .xX.'), 6: drum(6, 134, 'o..o ..o. | o..o ..o. | x.x. x.x. | X.......') }
const timbau = { 2: drum(2, 141, '.... ...h | .... .h.h'), 4: drum(4, 142, '.... ...h | ..h. .h.h'), 5: drum(5, 143, '..h. .h.x | ..h. hhxx') }
const ganza = { 1: drum(1, 151, 'g,h, g,h, | g,h, g,hm'), 2: drum(2, 152, 'ghmh ghmh'), 4: drum(4, 153, 'ghmh ghmh'), 5: drum(5, 154, 'ghxh ghxh'), 6: drum(6, 155, 'ghmh ghmh | ghmh ghmh | ghmh ghmh | m.......') }
const virada = { [FILL]: hand(161, hits('x..x ..XX')) }

const STRING = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Violão · bordão', 'bass', 'phrase', SAMPLE('guitars', 'nylon'), violaoBaixo, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...STRING, octave: 3, gain: .44, attack: .004, decay: .5, sustain: .3, release: .22, clip: 1, lpf: 2400, hpf: 40, effects: { reverb: .12, pan: -.1 }, design: { role: 'bass' } }),
  P('a2', 'Atabaque', 'rhythm', 'pulse', DRUM('percussion', 'conga'), atabaque, on(2, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .38, attack: .001, decay: .3, sustain: 0, release: .15, clip: .8, lpf: 3500, hpf: 50, effects: { reverb: .1, pan: .1 } }),
  P('b1', 'Viola machete · ponteio', 'melody', 'phrase', SAMPLE('brasil', 'viola-caipira'), machete, on(0, 1, 2, 3, 4, 6, 7),
    { ...STRING, octave: 4, gain: .6, attack: .002, decay: .45, sustain: .22, release: .22, clip: 1, lpf: 7000, hpf: 200, effects: { reverb: .16, pan: .22 } }),
  P('b2', 'Pandeiro', 'rhythm', 'pulse', DRUM('sambaReggae', 'pandeiro'), pandeiro, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .45, attack: .001, decay: .12, sustain: 0, release: .06, clip: .6, lpf: 9000, hpf: 400, effects: { reverb: .06, pan: .15 } }),
  P('c1', 'Violão · batida', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), batida, on(...ALL),
    { ...STRING, octave: 3, gain: .2, attack: .004, decay: .3, sustain: .18, release: .15, clip: .9, lpf: 4500, hpf: 140, effects: { reverb: .12, pan: -.3 } }),
  P('c2', 'Prato e faca', 'rhythm', 'pulse', DRUM('percussion', 'cymbal-tip'), prato, on(1, 2, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .4, attack: .001, decay: .07, sustain: 0, release: .05, clip: .4, lpf: 9000, hpf: 2800, effects: { reverb: .05, pan: -.35 } }),
  P('d1', 'Cantador', 'melody', 'phrase', SAMPLE('brasil', 'coro-laia'), cantador, on(1, 3, 4, 5, 8),
    { ...STRING, octave: 3, gain: .36, attack: .035, decay: .4, sustain: .75, release: .2, clip: 1, lpf: 5200, hpf: 150, effects: { reverb: .18, pan: -.06 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .1 } }),
  P('d2', 'Palmas', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), palmas, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 7000, hpf: 320, effects: { reverb: .16, pan: -.15 } }),
  P('e1', 'Segundo cantador', 'melody', 'phrase', SAMPLE('brasil', 'coro-laia'), segundo, on(1, 4, 5, 8),
    { ...STRING, octave: 3, gain: .32, attack: .04, decay: .4, sustain: .75, release: .2, clip: 1, lpf: 4600, hpf: 140, effects: { reverb: .18, pan: .08 }, design: { role: 'lead', vibrato: 4.6, vibratoDepth: .08 } }),
  P('e2', 'Palmas · contratempo', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), contratempo, on(2, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .18, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 7500, hpf: 500, effects: { reverb: .2, pan: .25 } }),
  P('f1', 'Viola machete · rasgado', 'harmony', 'phrase', SAMPLE('brasil', 'viola-caipira'), rasgado, on(1, 2, 4, 5, 6, 7, 8),
    { ...STRING, octave: 3, gain: .18, attack: .003, decay: .25, sustain: .15, release: .1, clip: .9, lpf: 6000, hpf: 250, effects: { reverb: .1, pan: .3 } }),
  P('f2', 'Ganzá', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), ganza, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .07, sustain: 0, release: .05, clip: .5, lpf: 9000, hpf: 3000, effects: { reverb: .05, pan: -.25 } }),
  P('g1', 'Coro da roda · relativo', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), roda, on(2, 5, 7, 8),
    { ...STRING, octave: 4, gain: .3, attack: .05, decay: .3, sustain: .8, release: .25, clip: 1, lpf: 5000, hpf: 180, effects: { reverb: .24, pan: 0 }, design: { role: 'lead', vibrato: 4.5, vibratoDepth: .08 } }),
  P('g2', 'Pandeiro · grave', 'rhythm', 'pulse', DRUM('brasil', 'pandeiro-grave'), grave, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .25, sustain: 0, release: .1, clip: .8, lpf: 3200, hpf: 60, effects: { reverb: .08, pan: 0 } }),
  P('h1', 'Timbau · resposta', 'rhythm', 'pulse', DRUM('sambaReggae', 'timbau'), timbau, on(2, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .24, attack: .001, decay: .15, sustain: 0, release: .08, clip: .6, lpf: 6000, hpf: 150, effects: { reverb: .1, pan: -.2 } }),
  P('h2', 'Palmas · virada', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), virada, on(),
    { ...DRUMS, octave: 2, gain: .28, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 8000, hpf: 400, effects: { reverb: .2, pan: -.1 } }),
]
const viradaPart = PARTS.find(p => p.slot === 'h2')
viradaPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: virada[FILL] }
viradaPart.fills = { 1: FILL, 2: FILL, 4: FILL, 5: FILL, 6: FILL }
viradaPart.sections = FORM.map((_, i) => i in viradaPart.fills || null)
for (const part of PARTS) if (part !== viradaPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

const SECTION_PARAMS = {
  b2: { 3: { gain: .34 } }, g2: { 3: { gain: .22 } }, a1: { 3: { gain: .34 } },
  c1: { 3: { gain: .16, reverbRange: { first: .2, second: .26 } } },
  d1: { 3: { reverbRange: { first: .28, second: .34 } }, 5: { gain: .4 } },
  b1: { 3: { reverbRange: { first: .26, second: .32 } }, 6: { gain: .68 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'santo-amaro-1960', kitName: 'Chula', profileName: 'Santo Amaro 1960 · Samba de roda chula', meter: '2/4', bpm: 100, root: 'D', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('chu', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Samba de roda chula do Recôncavo Baiano (Samba Chula de São Braz, João do Boi, Mestre Nelito, a viola machete): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Samba_de_roda',
}).catch(error => { console.error(error); process.exit(1) })
