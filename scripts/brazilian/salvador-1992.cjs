// 1992 Salvador - Samba-reggae (original material).
// A bloco-afro in the Pelourinho: the repique calls alone and the surdos answer; then the surdos interlock
// (fundo on one and three, meio on two and four, the dobra turning between them), the caixas play every
// sixteenth with the accents of the samba-reggae clave, timbau and chocalho fill, an electric bass and a
// muted guitar sit on the offbeats, trumpet and trombone call and reply, and the bloco sings the refrain.
// Sixteenths lean back a little, every stroke has its own weight and colour.
// G Mixolydian (Kit Harmony): the I–bVII sway of the genre.
// Form: chamada do repique · levada (horns) · refrão (coro) · reggae (soft: E minor, clean guitar arpeggios,
// the bloco humming, one surdo) · levada · convenção (tense: D minor, the repique calls and the bateria
// answers, surdos doubling) · solo (trumpet over repique and timbau) · refrão · final.
// Run: node scripts/brazilian/salvador-1992.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('4/4', 'Mixolídia')
const { mel, hits, rep, relative, feel, tone, line, phrase, named, vel, up, swell } = C

// G Mixolydian degrees: 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F (7 = G an octave up).
const ROOT = { G: 0, F: 6, C: 3, Em: 5, Dm: 4 }
const NAMES = {
  0: ['G', 'G', 'F', 'G'], 1: ['G', 'F', 'G', 'F', 'G', 'F', 'C', 'G'], 2: ['C', 'G', 'F', 'G', 'C', 'G', 'F', 'G'],
  3: ['Em', 'C', 'G', 'F', 'Em', 'C', 'F', 'G'], 4: ['G', 'F', 'G', 'F', 'G', 'F', 'G', 'F'], 5: ['Dm', 'Dm', 'F', 'G', 'Dm', 'Dm', 'F', 'G'],
  6: ['C', 'F', 'G', 'G'],
}
const H = bank => NAMES[bank].map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: H(0) },
  { label: 'Verse', bars: 8, bank: 1, harmony: H(1) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: H(2) },
  { label: 'Interlude', bars: 8, bank: 3, harmony: H(3) },   // reggae: soft
  { label: 'Verse', bars: 8, bank: 1, harmony: H(1) },
  { label: 'Break', bars: 8, bank: 5, harmony: H(5) },       // convenção: tense
  { label: 'Solo', bars: 8, bank: 4, harmony: H(4) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: H(2) },
  { label: 'Outro', bars: 4, bank: 6, harmony: H(6) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const barsOf = bank => FORM.find(s => s.bank === bank).bars
// The bloco's sixteenth leans back: the second and the fourth a tick late (ticks of 1/128 bar, ~18 ms).
const BLOCO = { push: [0, 1, 0, 1], jitter: 1, vel: .07 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...BLOCO, seed, ...extra }))
const drum = (bank, seed, text) => C.roll(Math.min(4, barsOf(bank)), hand(seed, hits(C.tile(text, Math.min(4, barsOf(bank))))))
const R = '................'
const Z = '. . . . . . . . . . . . . . . .'
// The bateria's answer to the repique (convenção) and the last bars.
const CONV = 'X..X ..X. X... ....'
const FINAL = 'X..X ..X. X... X... | X... .... .... ....'

// ---------- surdos ----------
const fundo = {
  0: hand(11, hits(`${R} | ${R} | ${CONV} | X... .... X... ....`)),
  1: drum(1, 12, 'X... .... X... .... | X... .... X... ...o'), 2: drum(2, 13, 'X... .... X... ...o | X... .... X... ..oo'),
  3: drum(3, 14, 'o... .... o... ....'), 4: drum(4, 15, 'X... .... X... .... | X... .... X... ...o'),
  5: drum(5, 16, `X... ..X. X... ..X. | ${CONV}`), 6: hand(17, hits(`X... .... X... ...o | X... ..X. X... ..X. | ${FINAL}`)),
}
const meio = {
  0: hand(21, hits(`${R} | ${R} | ${CONV} | .... X... .... X.x.`)),
  1: drum(1, 22, '.... X... .... X... | .... X... .... X.o.'), 2: drum(2, 23, '.... X... .... X.o. | .... X... .... X.xx'),
  4: drum(4, 24, '.... X... .... X... | .... X... .... X.o.'),
  5: drum(5, 25, `.... X..x .... X.xx | ${CONV}`), 6: hand(26, hits(`.... X... .... X.o. | .... X..x .... X.xx | ${FINAL}`)),
}
const dobra = {
  0: hand(31, hits(`${R} | ${R} | ${CONV} | ..x. ..xo ..x. xxXX`)),
  1: drum(1, 32, '..x. ..xo ..x. ..x. | ..x. ..xo ..x. ..xx'), 2: drum(2, 33, '..x. ..xx ..x. ..xx | ..x. ..xx ..xx .xxx'),
  4: drum(4, 34, '..x. ..xo ..x. ..x. | ..x. ..xo ..x. ..xx'),
  5: drum(5, 35, `..xx ..xx ..xx ..xx | ${CONV}`), 6: hand(36, hits(`..x. ..xx ..x. ..xx | ..xx ..xx ..xx xxXX | ${FINAL}`)),
}

// ---------- caixa, repique, timbau, chocalho, agogô ----------
const caixa = {
  0: hand(41, hits(`${R} | ${R} | ${CONV} | g.g. gmgm xmxm RRXX`)),
  1: drum(1, 42, 'Xg,X g,Xg ,gXg Xg,g | Xg,X g,Xg ,gXg XgXr'), 2: drum(2, 43, 'XggX ggXg ggXg Xggg | XggX ggXg ggXg XmXR'),
  4: drum(4, 44, 'Xg,X g,Xg ,gXg Xg,g | Xg,X g,Xg ,gXg XgXr'),
  5: drum(5, 45, `XgmX gmXg gmXg XmXm | ${CONV}`), 6: hand(46, hits(`XggX ggXg ggXg Xggg | XgmX gmXg RmRm RRRR | ${FINAL}`)),
}
const repique = {
  0: hand(51, hits('X.x. X.x. XxXx X... | X.xx .xX. x.xX .XXX | ................ | RxRx RxRx XXXX X...')),
  1: drum(1, 52, `${R} | .... .... .... x.xx | ${R} | .... .... ..x. x.xX`),
  2: drum(2, 53, '..x. .x.. ..x. x.xx | ..x. .x.x ..x. xxXX'),
  4: hand(54, hits(`${R} | .... .... x.xX .XXX | ${R} | ..x. xX.x X.xx X.XX | X.xx .xX. x.xX .xXx | .... .... x.xX .XXX | xXxx Xxxx xXxx Xxxx | RxRx RxRx XxXx XXXX`)),
  5: drum(5, 55, 'X.xx .xX. x.xX .XXX | ................ | X.x. XxX. xXxX .XXX | ................'),
  6: hand(56, hits(`..x. .x.. ..x. x.xx | X.xx .xX. x.xX .XXX | ${FINAL}`)),
}
const timbau = {
  1: drum(1, 61, 'x..o .x.. x..o .x.. | x..o .x.. x..o .xox'), 2: drum(2, 62, 'x..o .x.o x..o .x.o | x..o .x.o x.oo .xox'),
  3: drum(3, 63, 'o..h .o.. o..h .o.. | o..h .o.. o..h .oho'),
  4: hand(64, hits(`x..o .x.. x..o .xox | x.ox .x.o x.ox .x.. | x..o .x.. x..o .xox | .xox .xox x.x. xoxx | x..o .x.o x..o .xox | x.ox .x.o x.ox .xXx | x..o .x.. x..o .xox | xoxo xoxo XoXo XXXX`)),
  5: drum(5, 65, `x.ox x.ox x.ox x.ox | ${CONV}`), 6: hand(66, hits(`x..o .x.o x..o .x.o | x.ox x.ox xoxo xxxx | ${FINAL}`)),
}
const chocalho = {
  1: drum(1, 71, 'g,hX g,hX g,hX g,hX | g,hX g,hX g,hX ghmX'), 2: drum(2, 72, 'ghmX ghmX ghmX ghmX'),
  3: drum(3, 73, 'g,h, g,h, g,h, g,h, | g,h, g,h, g,h, ghhh'), 4: drum(4, 74, 'g,hX g,hX g,hX g,hX | g,hX g,hX g,hX ghmX'),
  5: drum(5, 75, 'gmXm gmXm gmXm gmXm | X..X ..X. X... ....'), 6: hand(76, hits('ghmX ghmX ghmX ghmX | gmXm gmXm gmXm gmXm | X..X ..X. X... X... | X... .... .... ....')),
}
const agogo = {
  2: drum(2, 81, 'x.o. .x.o ..x. o... | x.o. .x.o ..x. o.x.'), 4: drum(4, 82, 'x... ..o. ..x. o...'),
  5: drum(5, 83, `x.o. x.o. x.o. x.ox | ${CONV}`), 6: hand(84, hits(`x.o. .x.o ..x. o... | x.o. x.o. x.o. x.ox | ${FINAL}`)),
}
const virada = { [FILL]: hand(91, hits('x.o. x.o. xmxm XXXX')) }

// ---------- bass and guitars ----------
const BASS = { G: 0, F: -1, C: -4, Em: -2, Dm: -3 }
const loopNames = bank => NAMES[bank].slice(0, Math.min(8, barsOf(bank)))
function baixo(bank, seed, shape = 'levada') {
  const text = loopNames(bank).map((name, bar) => {
    const r = BASS[name], f = r + 4, t = r + 2
    if (shape === 'long') return `${r}:6! ${f}:2 ${r}:8`
    if (shape === 'conv') return bar % 2 ? `${r}:3! ${r}:3 ${r}:2 ${r}:8` : `${r}:3! ${r}:3 ${r}:2 r:2 ${r}:2 ${r}:2 ${f}:2`
    return bar % 2 ? `${r}:4! r:2 ${r}:2 ${f}:3 ${f}:3 ${r + 7}:2` : `${r}:3! ${r}:3 ${f}:4 ${f}:2 ${t}:2 ${r}:2`
  }).join(' | ')
  return C.roll(Math.min(8, barsOf(bank)), relative(hand(seed, mel(text, { gate: shape === 'long' ? .92 : .7, accent: { strong: .92, beat: .8, off: .7 } }), { push: [0, 0, 0, 1] }), H(bank)))
}
const bass = {
  1: baixo(1, 101), 2: baixo(2, 102), 3: baixo(3, 103, 'long'), 4: baixo(4, 104), 5: baixo(5, 105, 'conv'),
  6: relative(mel('-4:3! -4:3 0:4 0:2 -2:2 -4:2 | -1:3! -1:3 3:4 3:2 1:2 -1:2 | 0:3! 0:3 0:2 0:4 0:4 | 0:16!', { gate: .7 }), H(6)),
}
const CHORD = { G: [0, 2, 4], F: [-1, 1, 3], C: [0, 3, 5], Em: [0, 2, 5], Dm: [1, 4, 6] }
const comp = (bank, rhythm, seed, options) => C.roll(Math.min(8, barsOf(bank)), relative(C.strum(hand(seed, named(loopNames(bank), rhythm, CHORD, options)), 1 / 128), H(bank)))
const skank = {
  1: comp(1, '..x. ..x. ..x. ..xh | ..x. ..x. ..x. .hx.', 111, { length: 1 / 28 }), 2: comp(2, '..x. ..xh ..x. ..x. | ..x. ..xh ..x. .xx.', 112, { length: 1 / 28 }),
  3: comp(3, '..o. ..o. ..o. ..o.', 113, { length: 1 / 22 }), 4: comp(4, '..x. ..x. ..x. ..xh', 114, { length: 1 / 28 }),
  5: comp(5, 'X..X ..X. ..x. ..x. | X..X ..X. X... ....', 115, { length: 1 / 24 }),
  6: relative(hand(116, named(NAMES[6], '..x. ..xh ..x. ..x. | ..x. ..xh ..x. .xx. | X..X ..X. X... X... | X... .... .... ....', CHORD, { length: 1 / 24 })), H(6)),
}
const ARP = { G: [0, 4, 7, 9], F: [-1, 3, 6, 8], C: [-4, 0, 3, 5], Em: [-2, 2, 5, 7], Dm: [-3, 1, 4, 6] }
const dedilhado = (bank, seed, low, high) => C.roll(Math.min(8, barsOf(bank)), relative(phrase(mel(loopNames(bank).map(name => {
  const [a, b, c, d] = ARP[name]
  return `${a}:2 ${b}:2 ${c}:2 ${d}:2 ${c}:2 ${b}:2 ${c}:2 ${b}:2`
}).join(' | '), { gate: 1.6 }), seed, { low, high, window: 1, glide: 0 }), H(bank)))
const limpa = { 3: dedilhado(3, 121, .44, .7), 4: dedilhado(4, 122, .36, .56) }

// ---------- horns and voices (sixteen sixteenths a bar, '.' holds) ----------
const CHAMADA = ['. . . . . . . . 7 . 7 . 6 4 . .', '6 . . 4 . . 3 . 1 . . . . . . .', '. . . . . . . . 7 . 7 . 9 7 . .', '8 . . 6 . . 4 . 3 . . . . . . .',
  '. . . . . . . . 4 . 7 . 9 . 7 .', '8 . . 6 . . 8 . 6 . . . . . . .', '7 . . 7 . . 5 . 7 . . 5 . . 3 .', '4 . . . . . . . . . . . . . . .']
const RESPOSTA = ['0 . . . . . . . 4 . 4 . 4 2 . .', '3 . . 1 . . 1 . -1 . . . . . . .', '0 . . . . . . . 4 . 4 . 7 4 . .', '6 . . 3 . . 1 . 1 . . . . . . .',
  '0 . . . . . . . 2 . 4 . 7 . 4 .', '6 . . 3 . . 6 . 3 . . . . . . .', '3 . . 3 . . 3 . 5 . . 3 . . 0 .', '2 . . . . . . . . . . . . . . .']
const REFRAO = ['7 . . 7 . . 7 . 8 . 7 . 5 . . .', '4 . . 4 . . 4 . 5 . 4 . 2 . . .', '3 . . 3 . . 3 . 4 . 6 . 8 . . .', '7 . . . . . . . . . . . . . . .',
  '7 . . 7 . . 7 . 8 . 7 . 5 . . .', '4 . . 4 . . 4 . 5 . 7 . 9 . . .', '10 . . 8 . . 6 . 8 . . 6 . . 4 .', '7 . . . . . . . . . . . . . . .']
const REFRAO_METAIS = [Z, '. . . . . . . . . . . . 4 . 7 .', Z, '. . . . . . 4 . 7 . 9 . 7 . . .', Z, '. . . . . . . . . . . . 7 . 9 .', Z, '. . . . . . 7 . 7 . 9 . 7 . . .']
const REGGAE = ['9 . . . . . . . 7 . . . . . . .', '7 . . . . . . . . . . . 5 . . .', '4 . . . . . . . 2 . . . 4 . . .', '3 . . . . . . . . . . . . . . .',
  '9 . . . . . . . 11 . . . 9 . . .', '10 . . . . . . . . . . . 7 . . .', '8 . . . . . . . 6 . . . 8 . . .', '7 . . . . . . . . . . . . . . .']
const REGGAE_METAIS = [Z, Z, Z, '. . . . . . . . 6 . 4 . 3 . . .', Z, Z, Z, '. . . . . . . . 4 . 5 . 7 . . .']
const CONVENCAO = ['8 . . 8 . . 8 . . . 8 . 8 . . .', '8 . . 8 . . 6 . 4 . . . . . . .', '6 . . 6 . . 6 . . . 6 . 8 . . .', '9 . . 9 . . 7 . 9 . . . . . . .',
  '8 . . 8 . . 8 . . . 8 . 8 . . .', '8 . . 8 . . 6 . 8 . . . . . . .', '6 . . 6 . . 8 . . . 6 . 8 . . .', '9 . 9 . 7 . 7 . 9 9 9 9 9 . . .']
const GRITO = [Z, '. . . . . . . . 8 . 6 . 4 . . .', Z, '. . . . . . . . 9 . 7 . 4 . . .', Z, '. . . . . . . . 8 . 6 . 4 . . .', Z, '9 . . 9 . . 9 . 11 . . . . . . .']
const SOLO = ['4 . 7 . 9 . 7 . 4 . . 7 . . 9 .', '8 . . 6 . . 8 . 6 . . . . . . .', '. . 7 . 9 . 7 . 4 . 2 . 4 . 7 .', '6 . . 8 . . 6 . 3 . . . . . . .',
  '7 7 . 7 9 . 7 . 4 . 7 . 4 . 2 .', '3 . . 6 . . 8 . 6 . 3 . 1 . . .', '2 . 4 . 7 . 9 . 7 . 9 . 7 . 4 .', '6 . . . . . . . 8 . 6 . 3 . . .']
const FIM_CORO = ['7 . . 7 . . 7 . 8 . 7 . 5 . . .', '6 . . 6 . . 8 . 10 . 8 . 6 . . .', '7 . . 7 . . 7 . 7 . . . . . . .', Z]
const FIM_METAIS = ['3 . . 5 . . 7 . . . 7 . 5 . . .', '6 . . 8 . . 6 . . . 8 . 6 . . .', '7 . . 7 . . 7 . 7 . . . . . . .', Z]
const sing = (rows, bank, seed, options) => relative(phrase(line(rows, { vibratoFrom: 4 }), seed, options), H(bank))
const under = (rows, bank, seed, options) => relative(vel(up(phrase(line(rows, { vibratoFrom: 4 }), seed, options), -2), .84), H(bank))
const horn = { glide: 0, low: .6, high: .9 }

const trompete = {
  1: sing(CHAMADA, 1, 131, horn), 2: sing(REFRAO_METAIS, 2, 132, { ...horn, low: .5, high: .76 }), 3: sing(REGGAE_METAIS, 3, 133, { low: .36, high: .52 }),
  4: sing(SOLO, 4, 134, { ...horn, high: .94 }), 5: sing(CONVENCAO, 5, 135, { ...horn, low: .74, high: .98 }), 6: sing(FIM_METAIS, 6, 136, { ...horn, low: .7, high: .96 }),
}
const trombone = {
  1: sing(RESPOSTA, 1, 141, { ...horn, low: .55, high: .84 }), 2: under(REFRAO_METAIS, 2, 142, { ...horn, low: .48, high: .72 }),
  5: under(CONVENCAO, 5, 143, { ...horn, low: .72, high: .96 }), 6: under(FIM_METAIS, 6, 144, { ...horn, low: .68, high: .92 }),
}
const coro = {
  2: sing(REFRAO, 2, 151, { low: .6, high: .92 }), 3: sing(REGGAE, 3, 152, { low: .36, high: .6, jitter: 2 }),
  5: sing(GRITO, 5, 153, { low: .72, high: .96 }), 6: sing(FIM_CORO, 6, 154, { low: .64, high: .94 }),
}
const segunda = {
  2: under(REFRAO, 2, 161, { low: .58, high: .88 }), 3: under(REGGAE, 3, 162, { low: .32, high: .54, jitter: 2 }),
  5: under(GRITO, 5, 163, { low: .68, high: .9 }), 6: under(FIM_CORO, 6, 164, { low: .6, high: .9 }),
}

const TUNED = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Baixo elétrico', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...TUNED, octave: 2, gain: .46, attack: .005, decay: .4, sustain: .4, release: .15, clip: 1, lpf: 1600, hpf: 35, effects: { reverb: .05, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Surdo fundo', 'rhythm', 'pulse', DRUM('sambaReggae', 'surdo-fundo'), fundo, on(...ALL),
    { ...DRUMS, octave: 2, gain: .4, attack: .001, decay: .6, sustain: 0, release: .3, clip: 1, lpf: 2600, hpf: 30, effects: { reverb: .07, pan: -.05 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Trompete', 'melody', 'phrase', SAMPLE('sambaReggae', 'trompete'), trompete, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...TUNED, octave: 4, gain: .5, attack: .006, decay: .3, sustain: .62, release: .1, clip: 1, lpf: 8000, hpf: 200, effects: { reverb: .18, pan: .2 }, design: { role: 'lead' } }),
  P('b2', 'Surdo meio', 'rhythm', 'pulse', DRUM('sambaReggae', 'surdo-meio'), meio, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .5, sustain: 0, release: .25, clip: 1, lpf: 2900, hpf: 35, effects: { reverb: .07, pan: .05 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('c1', 'Guitarra · contratempo', 'harmony', 'phrase', SAMPLE('guitars', 'muted'), skank, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...TUNED, octave: 3, gain: .34, attack: .003, decay: .2, sustain: .1, release: .08, clip: .9, lpf: 5000, hpf: 250, effects: { reverb: .14, pan: .3 } }),
  P('c2', 'Caixa', 'rhythm', 'pulse', DRUM('sambaReggae', 'caixa'), caixa, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 9000, hpf: 250, effects: { reverb: .08, pan: .18 } }),
  P('d1', 'Coro · refrão', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), coro, on(2, 3, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .4, attack: .04, decay: .4, sustain: .78, release: .24, clip: 1, lpf: 6000, hpf: 160, effects: { reverb: .3, pan: 0 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .08 } }),
  P('d2', 'Surdo dobra', 'rhythm', 'pulse', DRUM('sambaReggae', 'surdo-viradeira'), dobra, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .3, sustain: 0, release: .15, clip: .9, lpf: 3600, hpf: 45, effects: { reverb: .07, pan: .14 } }),
  P('e1', 'Repique', 'rhythm', 'phrase', DRUM('sambaReggae', 'repinique'), repique, on(...ALL),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .2, sustain: 0, release: .1, clip: .8, lpf: 9000, hpf: 200, effects: { reverb: .1, pan: -.22 } }),
  P('e2', 'Timbau', 'rhythm', 'pulse', DRUM('sambaReggae', 'timbau'), timbau, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .2, sustain: 0, release: .1, clip: .7, lpf: 7500, hpf: 130, effects: { reverb: .09, pan: -.15 } }),
  P('f1', 'Trombone', 'response', 'phrase', SAMPLE('sambaReggae', 'trombone'), trombone, on(1, 2, 4, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .36, attack: .006, decay: .3, sustain: .5, release: .1, clip: 1, lpf: 4500, hpf: 80, effects: { reverb: .18, pan: -.3 } }),
  P('f2', 'Chocalho', 'rhythm', 'pulse', DRUM('sambaReggae', 'chocalho'), chocalho, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .28, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 10000, hpf: 2500, effects: { reverb: .05, pan: .3 } }),
  P('g1', 'Guitarra · dedilhado', 'harmony', 'phrase', SAMPLE('guitars', 'clean'), limpa, on(3, 6),
    { ...TUNED, octave: 3, gain: .8, attack: .004, decay: .6, sustain: .3, release: .3, clip: 1, lpf: 5200, hpf: 140, effects: { reverb: .24, pan: -.25 } }),
  P('g2', 'Agogô', 'rhythm', 'pulse', DRUM('sambaReggae', 'agogo-agudo'), agogo, on(2, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .18, attack: .001, decay: .2, sustain: 0, release: .1, clip: .5, lpf: 9000, hpf: 800, effects: { reverb: .1, pan: .35 } }),
  P('h1', 'Coro · segunda voz', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), segunda, on(2, 3, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .28, attack: .04, decay: .4, sustain: .76, release: .24, clip: 1, lpf: 5200, hpf: 140, effects: { reverb: .3, pan: -.12 } }),
  P('h2', 'Repique · virada', 'rhythm', 'pulse', DRUM('sambaReggae', 'repinique'), virada, on(),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .2, sustain: 0, release: .1, clip: .8, lpf: 9000, hpf: 200, effects: { reverb: .1, pan: -.1 } }),
]
const viradaPart = PARTS.find(p => p.slot === 'h2')
viradaPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: virada[FILL] }
viradaPart.fills = { 1: FILL, 2: FILL, 3: FILL, 4: FILL, 7: FILL }
viradaPart.sections = FORM.map((_, i) => i in viradaPart.fills || null)
for (const part of PARTS) if (part !== viradaPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound: the reggae is close and wet, the convenção opens up ----------
const SECTION_PARAMS = {
  a2: { 3: { gain: .26, lpfRange: { first: 1500, second: 1900 } }, 5: { gain: .46 } },
  a1: { 3: { gain: .34 } },
  c1: { 3: { gain: .18, reverbRange: { first: .22, second: .28 } } },
  e2: { 3: { gain: .15, reverbRange: { first: .18, second: .24 } }, 6: { gain: .27 } },
  f2: { 3: { gain: .1 } },
  d1: { 3: { gain: .3, reverbRange: { first: .4, second: .46 } } },
  h1: { 3: { gain: .2, reverbRange: { first: .4, second: .46 } } },
  b1: { 3: { reverbRange: { first: .32, second: .38 } }, 5: { gain: .44 } },
  e1: { 0: { reverbRange: { first: .18, second: .24 } }, 6: { gain: .3 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'salvador-1992', kitName: 'Samba-reggae', profileName: 'Salvador 1992 · Samba-reggae', meter: '4/4', bpm: 104, root: 'G', scale: 'Mixolídia',
  form: FORM, parts: PARTS,
  reactions: reactions('ssr', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Samba-reggae dos blocos-afro de Salvador (Olodum, Ilê Aiyê, Muzenza, Neguinho do Samba): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Samba-reggae',
}).catch(error => { console.error(error); process.exit(1) })
