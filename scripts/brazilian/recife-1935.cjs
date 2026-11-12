// 1935 Recife - Frevo de rua (original material).
// A street frevo orchestra: the trumpets throw the call and the saxophones answer in running sixteenths (the
// metals-against-reeds dialogue of the frevo de rua), the trombones punch syncopated chords, a low trombone
// plays the tuba's oom-pah, and the percussion marches fast: the surdo open on the second beat, the caixa
// with its rufo, pandeiro and hand cymbals. Phrases swell to their top note, runs are a little uneven, the
// caixa has ghosts and strokes that do not always sound.
// F major (Kit Harmony).
// Form: introdução (caixa alone, the trombones' riff, the trumpets' fanfare) · parte A (metals call, reeds
// answer) · parte B (every horn) · frevo de bloco (soft: D minor, flute over violão, pandeiro and a light
// surdo) · parte A · frevo-abafo (tense: long loud brass over growling trombones, the caixa rolling) ·
// frevo-ventania (the saxes run, the trumpets comment) · parte B · final.
// Run: node scripts/brazilian/recife-1935.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('2/4', 'Maior')
const { mel, hits, rep, relative, feel, tone, line, phrase, named, vel, up, swell, only } = C

// F major degrees: 0 F · 1 G · 2 A · 3 Bb · 4 C · 5 D · 6 E (7 = F an octave up).
const ROOT = { F: 0, C7: 4, Bb: 3, Gm: 1, Dm: 5, A7: 2 }
const NAMES = {
  0: ['F', 'F', 'C7', 'C7', 'F', 'F', 'C7', 'F'], 1: ['F', 'F', 'C7', 'C7', 'C7', 'C7', 'F', 'F'], 2: ['Bb', 'Bb', 'F', 'F', 'Gm', 'C7', 'F', 'F'],
  3: ['Dm', 'Dm', 'Gm', 'Gm', 'A7', 'A7', 'Dm', 'Dm'], 4: ['F', 'Dm', 'Gm', 'C7', 'F', 'Dm', 'C7', 'F'], 5: ['Gm', 'Gm', 'C7', 'C7', 'A7', 'Dm', 'Gm', 'C7'],
  6: ['Bb', 'C7', 'F', 'F'],
}
const H = bank => NAMES[bank].map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 8, bank: 0, harmony: H(0) },
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Interlude', bars: 16, bank: 3, harmony: H(3) },  // frevo de bloco: soft
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Break', bars: 8, bank: 5, harmony: H(5) },       // frevo-abafo: tense
  { label: 'Solo', bars: 16, bank: 4, harmony: H(4) },       // frevo-ventania
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Outro', bars: 4, bank: 6, harmony: H(6) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const barsOf = bank => FORM.find(s => s.bank === bank).bars
// The frevo marches straight and a little ahead: only the last sixteenth leans forward (ticks of ~6 ms).
const PASSO = { push: [0, 1, 0, -1], jitter: 1, vel: .06 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...PASSO, seed, ...extra }))
const drum = (bank, seed, text) => C.roll(Math.min(4, barsOf(bank)), hand(seed, hits(C.tile(text, Math.min(4, barsOf(bank))))))
const R = '........'
const Z = '. . . . . . . .'

// ---------- the tunes (eight sixteenths a bar, '.' holds) ----------
const FANFARRA = [Z, Z, Z, Z, '. 0 2 4 7 . 7 .', '9 . 7 . 4 . . .', '. 4 6 8 10 . 8 .', '7 . . . 7 . . .']
const METAIS_A = ['. 0 2 4 7 . 7 .', '9 . 7 9 . 7 4 .', Z, Z, '. 4 6 8 10 . 10 .', '11 . 10 . 8 . 6 .', Z, Z,
  '. 0 2 4 7 . 7 .', '9 . 7 9 . 7 4 .', Z, Z, '. 4 6 8 10 . 10 .', '11 . 10 8 . 6 8 .', '7 . 9 . 11 . 9 7', '7 . . . . . . .']
const PALHETAS_A = [Z, Z, '8 6 4 3 4 6 8 10', '8 . 6 . 4 . . .', Z, Z, '7 5 4 2 4 5 7 9', '7 . 4 . 0 . . .',
  Z, Z, '10 8 6 4 6 8 10 11', '10 . 8 . 6 . 4 .', Z, Z, '5 . 7 . 9 . 7 5', '4 . . . . . . .']
const TEMA_B = ['5 . . 7 . . 10 .', '9 . 7 . 5 . 3 .', '4 . . 7 . . 9 .', '7 . 4 . 2 . 0 .', '3 . . 5 . . 8 .', '6 . 8 . 10 . 8 6']
const PALHETAS_B = [...TEMA_B, '7 9 7 4 2 4 7 .', '7 . . . . . . .', ...TEMA_B, '7 9 7 4 2 4 7 9', '7 . . . . . . .']
const METAIS_B = ['. . . . . . 7 .', '. 7 . 7 . . . .', '. . . . . . 7 .', '. 7 . 9 . . . .', '. . . . . . 8 .', '. 8 . 8 . 10 . .', '9 . 9 . 11 . 9 .', '7 . . . . . . .',
  ...TEMA_B, '7 9 11 9 7 . 9 .', '7 . . . . . . .']
const BLOCO = ['9 . . 8 7 . 5 .', '7 . . . 9 . . .', '10 . . 9 8 . 5 .', '8 . . . . . 7 8', '9 . . 8 6 . 4 .', '6 . . . 9 . . .', '7 . 6 5 6 . 7 .', '5 . . . . . . .',
  '12 . . 11 9 . 7 .', '9 . . . 12 . . .', '10 . . 12 10 . 8 .', '10 . . . . . 9 8', '9 . 8 6 8 . 9 .', '11 . 9 . 8 . 6 .', '7 . 6 5 4 . 6 .', '5 . . . . . . .']
const BLOCO_PALHETAS = ['2 . . . . . . .', '2 . . . 0 . . .', '3 . . . . . . .', '3 . . . 1 . . .', '2 . . . . . . .', '-1 . . . 1 . . .', '0 . . . . . . .', '2 . . . . . . .']
const ABAFO = ['8 . . . . . . .', '10 . . . 8 . . .', '10 . . . . . . .', '11 . . . 10 . . .', '9 . . . . . . .', '9 . . . 7 . . .', '8 . 8 . 10 . 10 .', '11 . 11 . 11 11 11 .']
const ABAFO_PALHETAS = ['1 3 5 8 5 3 1 3', '5 3 1 3 5 8 10 8', '4 6 8 10 8 6 4 6', '8 6 4 6 8 10 11 10', '2 4 6 9 6 4 2 4', '5 7 9 12 9 7 5 7', '1 3 5 8 10 8 5 3', '4 6 8 10 11 . 11 .']
const VENTANIA = ['0 2 4 5 7 5 4 2', '5 7 9 7 5 4 2 4', '1 3 5 8 7 5 3 1', '4 6 8 10 8 . 6 .', '7 9 7 5 4 5 7 9', '9 . 7 . 5 7 9 .', '8 6 4 6 8 10 8 6', '7 . . . 4 . . .',
  '9 7 5 4 5 7 9 11', '9 . 7 5 . 7 9 .', '10 8 5 3 5 8 10 .', '11 . 10 . 8 . 6 .', '7 5 4 2 0 2 4 5', '7 9 7 5 4 5 7 9', '8 10 8 6 4 6 8 10', '7 . . . . . . .']
const VENTANIA_METAIS = [Z, Z, Z, '. . . . 8 . 10 .', Z, Z, Z, '. . 7 . 9 . 7 .', Z, Z, Z, '. . . . 10 . 8 .', Z, Z, '. . 8 . 10 . 8 .', '7 . . . . . . .']
const FINAL = ['10 . 9 7 . 5 7 .', '8 . 10 . 11 . 10 8', '9 . 7 . 4 . 2 .', '0 . . . . . . .']
const brass = (rows, bank, seed, options) => relative(phrase(line(rows), seed, { glide: 0, low: .6, high: .92, ...options }), H(bank))
const under = (rows, bank, seed, options, degrees = -2) => relative(vel(up(phrase(line(rows), seed, { glide: 0, low: .6, high: .9, ...options }), degrees), .86), H(bank))
const second = bars => notes => only(notes, ...bars)
const lastHalf = second([8, 9, 10, 11, 12, 13, 14, 15])

const trompete = {
  0: brass(FANFARRA, 0, 11), 1: brass(METAIS_A, 1, 12), 2: brass(METAIS_B, 2, 13, { low: .64, high: .96 }),
  4: brass(VENTANIA_METAIS, 4, 14, { low: .5, high: .72 }), 5: brass(ABAFO, 5, 15, { low: .78, high: 1 }), 6: brass(FINAL, 6, 16, { low: .7, high: .98 }),
}
const trompete2 = {
  0: under(FANFARRA, 0, 21), 1: under(METAIS_A, 1, 22), 2: under(METAIS_B, 2, 23, { low: .62, high: .92 }),
  5: under(ABAFO, 5, 24, { low: .74, high: .96 }), 6: under(FINAL, 6, 25, { low: .68, high: .94 }),
}
const sax = {
  1: brass(PALHETAS_A, 1, 31, { low: .55, high: .86 }), 2: brass(PALHETAS_B, 2, 32, { low: .6, high: .92 }),
  3: brass([...BLOCO_PALHETAS, ...BLOCO_PALHETAS], 3, 33, { low: .34, high: .5, glide: 3 }), 4: brass(VENTANIA, 4, 34, { low: .5, high: .84 }),
  5: brass(ABAFO_PALHETAS, 5, 35, { low: .62, high: .9 }), 6: brass(FINAL, 6, 36, { low: .66, high: .94 }),
}
const saxAlto = {
  1: under(PALHETAS_A, 1, 41, { low: .52, high: .82 }, 2), 2: under(PALHETAS_B, 2, 42, { low: .56, high: .88 }, 2),
  4: lastHalf(under(VENTANIA, 4, 43, { low: .46, high: .78 }, 2)), 5: under(ABAFO_PALHETAS, 5, 44, { low: .58, high: .86 }, 2), 6: under(FINAL, 6, 45, { low: .62, high: .9 }, 2),
}
const flauta = {
  3: relative(phrase(line(BLOCO, { vibratoFrom: 3 }), 51, { low: .5, high: .8, glide: 4, jitter: 2 }), H(3)),
  4: lastHalf(brass(VENTANIA, 4, 52, { low: .42, high: .68 })),
}

// ---------- trombones, tuba, violão ----------
const CHORD = { F: [0, 2, 4], C7: [-1, 1, 3], Bb: [0, 3, 5], Gm: [1, 3, 5], Dm: [0, 2, 5], A7: [-1, 1, 2] }
const VIOLAO = { F: [0, 2, 4, 7], C7: [-3, 1, 3, 6], Bb: [-4, 0, 3, 5], Gm: [-6, 1, 3, 5], Dm: [-2, 2, 5, 7], A7: [-5, -1, 1, 4] }
const BASS = { F: [0, -3], C7: [-3, 1], Bb: [3, 0], Gm: [1, -2], Dm: [-2, 2], A7: [2, -1] }
const loopNames = bank => NAMES[bank].slice(0, Math.min(8, barsOf(bank)))
const comp = (table, bank, rhythm, seed, options) => C.roll(Math.min(8, barsOf(bank)), relative(C.strum(hand(seed, named(loopNames(bank), rhythm, table, options)), 1 / 128), H(bank)))
const trombones = {
  0: C.roll(8, relative(hand(61, C.without(named(NAMES[0], 'X..x .X.. | ..x. .X..', CHORD, { length: 1 / 10 }), 0, 1)), H(0))),
  1: comp(CHORD, 1, 'X..x .X.. | ..x. .X..', 62, { length: 1 / 10 }), 2: comp(CHORD, 2, '..x. ..x. | ..x. .xx.', 63, { length: 1 / 10 }),
  4: comp(CHORD, 4, '..o. ..o. | ..o. .o..', 64, { length: 1 / 12 }), 5: comp(CHORD, 5, 'X.xX .xX. | X.xX .XXX', 65, { length: 1 / 9 }),
  6: relative(hand(66, named(NAMES[6], 'X..x .X.. | X.X. X.XX | X.x. x.x. | X.......', CHORD, { length: 1 / 9 })), H(6)),
}
const violao = { 3: comp(VIOLAO, 3, 'x.o. .o.o | x.o. .oo.', 71, { length: 1 / 7 }), 4: comp(VIOLAO, 4, 'h.o. .h.o', 72, { length: 1 / 8 }) }
/** The tuba's oom-pah: root on the one, fifth on the two; `pump` hammers the root (abafo), `long` holds it (bloco). */
function tuba(bank, seed, shape = 'oompah') {
  const names = loopNames(bank)
  const text = names.map((name, bar) => {
    const [root, fifth] = BASS[name]
    if (shape === 'long') return `${root}:5 ${fifth}:3`
    if (shape === 'pump') return `${root}:2! ${root}:2 ${root}:2 ${fifth}:2`
    return bar % 4 === 3 ? `${root}:4! ${fifth}:2 ${fifth + 1}:2` : `${root}:4! ${fifth}:4`
  }).join(' | ')
  return C.roll(names.length, relative(hand(seed, mel(text, { gate: shape === 'long' ? .9 : .56, accent: { strong: .92, beat: .78, off: .7 } })), H(bank)))
}
const baixo = {
  0: C.roll(8, C.without(tuba(0, 81).notes, 0, 1)), 1: tuba(1, 82), 2: tuba(2, 83), 3: tuba(3, 84, 'long'), 4: tuba(4, 85), 5: tuba(5, 86, 'pump'),
  6: relative(mel('3:4! 0:4 | 4:2! 4:2 4:2 5:2 | 0:4! -3:4 | 0:8!', { gate: .6 }), H(6)),
}

// ---------- percussion ----------
const surdo = {
  0: hand(91, hits(`X....... | ....X... | h...X... | h...X..o | ${rep('h...X... | h...X..o', 2)}`)),
  1: drum(1, 92, 'h...X... | h...X... | h...X... | h...X..o'), 2: drum(2, 93, 'h...X... | h...X..o | h...X... | h..oX.oo'),
  3: drum(3, 94, '....o... | ....o..h'), 4: drum(4, 95, 'h...m... | h...m..h'), 5: drum(5, 96, 'X...X... | X...X..x | X...X... | X..xX.xx'),
  6: hand(97, hits('h...X... | X...X.X. | X.x.x.x. | X.......')),
}
const corte = {
  1: drum(1, 101, '.......o | ......oo'), 2: drum(2, 102, '...o...o | ...o..oo'), 5: drum(5, 103, '..xx..xx | ..xx.xxx'),
  6: hand(104, hits('...o...o | ..xx..xx | X.x.x.x. | X.......')),
}
const caixa = {
  0: hand(111, swell(hits('g.gm x.Rx | g.gm xmRX | X.gm x,Rx | X.gm xgRX | ' + rep('X.gm x,Rx | X.gm xgRX', 2)), 8, .6, 1)),
  1: drum(1, 112, 'X.gm x,Rx | X.gm xgRx | X.gm x,Rx | X,gm xgRX'), 2: drum(2, 113, 'XggX gxRx | XgmX gxRX'),
  4: drum(4, 114, 'm.g, o.rh | m.g, ogrm'), 5: hand(115, swell(hits(rep('XgmX gmRx | XmXm RmRR', 4)), 8, .55, 1)),
  6: hand(116, hits('XggX gxRx | RmRm RRRR | X.x.x.x. | X.......')),
}
const tarol = {
  2: drum(2, 121, 'g.x, g.xg | g.x, gxxg'), 5: drum(5, 122, 'gxxg gxxg | gxxg xxxx'), 6: hand(123, hits('g.x, g.xg | gxxg xxxx | X.x.x.x. | X.......')),
}
const pandeiro = {
  1: drum(1, 131, 'g.hX g.hX | g.hX ghmX'), 2: drum(2, 132, 'ghmX ghmX | ghmX gmmX'), 3: drum(3, 133, 'g.ho g.ho | g.ho g,hm'),
  4: drum(4, 134, 'g.hm g.hm | g.hm ghhm'), 5: drum(5, 135, 'gmXm gmXm'), 6: hand(136, hits('ghmX ghmX | ghmX gmmX | X.x.x.x. | X.......')),
}
const pratos = {
  0: hits(`${rep(R, 4)} | X....... | ${rep(R, 3)}`), 1: hits(`X....... | ${rep(R, 7)} | x....... | ${rep(R, 7)}`),
  2: drum(2, 141, 'X...o... | ....o... | x...o... | ....o.o.'), 5: drum(5, 142, 'X...X... | X...X.x.'),
  6: hand(143, hits('X...o... | X...X... | X.x.x.x. | X.......')),
}
const choque = {
  1: drum(1, 151, '..h...h. | ..h...hh'), 2: drum(2, 152, '..o...o. | ..o..oo.'), 3: drum(3, 153, '..g...g. | ..g...h.'),
  4: drum(4, 154, '..h...h. | ..h..hh.'), 6: hand(155, hits('..o...o. | ..o..oo. | ........ | ........')),
}
const rufo = { [FILL]: hand(161, hits('gmxm RRRX')) }

const HORN = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Tuba', 'bass', 'phrase', SAMPLE('sambaReggae', 'trombone'), baixo, on(...ALL),
    { ...HORN, octave: 2, gain: .54, attack: .008, decay: .3, sustain: .5, release: .1, clip: 1, lpf: 1800, hpf: 35, effects: { reverb: .08, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Surdo', 'rhythm', 'pulse', DRUM('bateria', 'surdo-primeira'), surdo, on(...ALL),
    { ...DRUMS, octave: 2, gain: .36, attack: .001, decay: .5, sustain: 0, release: .25, clip: 1, lpf: 3200, hpf: 30, effects: { reverb: .06, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Saxofones', 'response', 'phrase', SAMPLE('band', 'tenor-sax', 1), sax, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...HORN, octave: 3, gain: .3, attack: .01, decay: .3, sustain: .62, release: .1, clip: 1, lpf: 6000, hpf: 120, effects: { reverb: .15, pan: .3 }, design: { role: 'lead' } }),
  P('b2', 'Caixa', 'rhythm', 'pulse', DRUM('bateria', 'caixa'), caixa, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .16, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 9000, hpf: 200, effects: { reverb: .08, pan: -.15 } }),
  P('c1', 'Sax alto · terças', 'response', 'phrase', SAMPLE('band', 'tenor-sax', 0), saxAlto, on(1, 2, 4, 5, 6, 7, 8),
    { ...HORN, octave: 3, gain: .36, attack: .01, decay: .3, sustain: .6, release: .1, clip: 1, lpf: 6500, hpf: 200, effects: { reverb: .15, pan: .4 } }),
  P('c2', 'Pandeiro', 'rhythm', 'pulse', DRUM('sambaReggae', 'pandeiro'), pandeiro, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .36, attack: .001, decay: .12, sustain: 0, release: .06, clip: .6, lpf: 9000, hpf: 400, effects: { reverb: .06, pan: .25 } }),
  P('d1', 'Trompete', 'melody', 'phrase', SAMPLE('sambaReggae', 'trompete'), trompete, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...HORN, octave: 4, gain: .4, attack: .006, decay: .3, sustain: .62, release: .1, clip: 1, lpf: 8000, hpf: 200, effects: { reverb: .16, pan: -.05 }, design: { role: 'lead' } }),
  P('d2', 'Pratos', 'rhythm', 'pulse', DRUM('percussion', 'crash'), pratos, on(0, 1, 2, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .5, attack: .001, decay: .35, sustain: 0, release: .2, clip: .7, lpf: 10000, hpf: 2500, effects: { reverb: .1, pan: -.35 } }),
  P('e1', 'Trompete 2 · terças', 'response', 'phrase', SAMPLE('sambaReggae', 'trompete'), trompete2, on(0, 2, 5, 7, 8),
    { ...HORN, octave: 4, gain: .26, attack: .006, decay: .3, sustain: .6, release: .1, clip: 1, lpf: 7000, hpf: 200, effects: { reverb: .16, pan: -.25 } }),
  P('e2', 'Tarol', 'rhythm', 'pulse', DRUM('sambaReggae', 'tarol'), tarol, on(2, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 8500, hpf: 300, effects: { reverb: .08, pan: .15 } }),
  P('f1', 'Trombones', 'harmony', 'phrase', SAMPLE('sambaReggae', 'trombone'), trombones, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...HORN, octave: 3, gain: .18, attack: .006, decay: .25, sustain: .45, release: .09, clip: 1, lpf: 4500, hpf: 110, effects: { reverb: .14, pan: -.3 } }),
  P('f2', 'Surdo · corte', 'rhythm', 'pulse', DRUM('sambaReggae', 'surdo-meio'), corte, on(1, 2, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .3, sustain: 0, release: .15, clip: .8, lpf: 3200, hpf: 45, effects: { reverb: .06, pan: .08 } }),
  P('g1', 'Flauta', 'melody', 'phrase', SAMPLE('classical', 'flute-sustain'), flauta, on(3, 6),
    { ...HORN, octave: 4, gain: .4, attack: .02, decay: .3, sustain: .78, release: .14, clip: 1, lpf: 9000, hpf: 300, effects: { reverb: .24, pan: .15 }, design: { role: 'lead', vibrato: 5.2, vibratoDepth: .07 } }),
  P('g2', 'Prato de choque', 'rhythm', 'pulse', DRUM('percussion', 'cymbal-tip'), choque, on(1, 2, 3, 4, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .7, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 10000, hpf: 3000, effects: { reverb: .08, pan: .35 } }),
  P('h1', 'Violão', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), violao, on(3, 6),
    { ...HORN, octave: 3, gain: .3, attack: .003, decay: .5, sustain: .2, release: .2, clip: 1, lpf: 5200, hpf: 90, effects: { reverb: .16, pan: -.2 } }),
  P('h2', 'Caixa · rufo', 'rhythm', 'pulse', DRUM('bateria', 'caixa'), rufo, on(),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 9000, hpf: 200, effects: { reverb: .1, pan: -.1 } }),
]
const rufoPart = PARTS.find(p => p.slot === 'h2')
rufoPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: rufo[FILL] }
rufoPart.fills = { 1: FILL, 2: FILL, 3: FILL, 4: FILL, 6: FILL, 7: FILL }
rufoPart.sections = FORM.map((_, i) => i in rufoPart.fills || null)
for (const part of PARTS) if (part !== rufoPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound: the bloco is close and warm, the abafo loud and open ----------
const SECTION_PARAMS = {
  a1: { 3: { gain: .42, lpfRange: { first: 1200, second: 1500 } }, 5: { gain: .66 } },
  a2: { 3: { gain: .26, lpfRange: { first: 1800, second: 2200 } }, 6: { gain: .32 } },
  b1: { 3: { gain: .2, reverbRange: { first: .24, second: .3 } } },
  c2: { 3: { gain: .26 } }, g2: { 3: { gain: .14 } },
  d1: { 5: { gain: .44, driveRange: { first: .1, second: .2 } }, 6: { gain: .3 } },
  f1: { 5: { gain: .26, driveRange: { first: .1, second: .2 } }, 6: { gain: .14 } },
  b2: { 6: { gain: .11 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'recife-1935', kitName: 'Frevo', profileName: 'Recife 1935 · Frevo de rua', meter: '2/4', bpm: 152, root: 'F', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('frv', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Frevo de rua do Recife dos anos 1930 (Nelson Ferreira, Capiba, Zumba, Levino Ferreira) e frevo de bloco: referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Frevo',
}).catch(error => { console.error(error); process.exit(1) })
