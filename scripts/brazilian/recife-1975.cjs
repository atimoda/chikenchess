// 1975 Recife - Maracatu de baque virado (original material).
// A nação on the street: the mestre sings the loa alone, the caixa and the gonguê call, the apito cuts the air
// and the alfaias come in. Three alfaias as the nações tune them: the marcante (lowest) holds the baque, the
// meião answers inside it and the repique (highest) turns the phrases. Gonguê, caixa de guerra, tarol, agbês
// and the mineiro ride on top; an atabaque talks underneath. Voices only, as in the nações: the mestre calls,
// the coro answers. Many hands on every drum, so the strokes are never level and never quite together.
// D Mixolydian (Kit Harmony): D against C, the sway of the loas.
// Form: loa (the mestre alone, the baque called in) · baque de marcação · baque virado (refrão) · toada (soft:
// voices over gonguê, mineiro and atabaque, the alfaias barely touched) · marcação · baque de martelo (tense:
// every alfaia hammering, caixas rolling) · viração (the repique alfaia solos, the baque stops on the
// convention) · virado · final.
// Run: node scripts/brazilian/recife-1975.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('4/4', 'Mixolídia')
const { hits, rep, relative, feel, tone, line, phrase, vel, up, swell } = C

// D Mixolydian degrees: 0 D · 1 E · 2 F# · 3 G · 4 A · 5 B · 6 C (7 = D an octave up).
const ROOT = { D: 0, C: 6, G: 3, Am: 4 }
const NAMES = {
  0: ['D', 'D', 'C', 'D'], 1: ['D', 'D', 'C', 'D', 'D', 'D', 'C', 'D'], 2: ['G', 'G', 'D', 'D', 'C', 'C', 'D', 'D'],
  3: ['D', 'C', 'D', 'D', 'G', 'G', 'C', 'D'], 4: ['D', 'D', 'C', 'D', 'D', 'D', 'C', 'D'], 5: ['Am', 'Am', 'C', 'D', 'Am', 'Am', 'C', 'D'],
  6: ['C', 'D', 'D', 'D'],
}
const H = bank => NAMES[bank].map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: H(0) },
  { label: 'Verse', bars: 8, bank: 1, harmony: H(1) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: H(2) },
  { label: 'Interlude', bars: 8, bank: 3, harmony: H(3) },   // toada: soft
  { label: 'Verse', bars: 8, bank: 1, harmony: H(1) },
  { label: 'Break', bars: 8, bank: 5, harmony: H(5) },       // baque de martelo: tense
  { label: 'Solo', bars: 8, bank: 4, harmony: H(4) },        // viração
  { label: 'Chorus', bars: 8, bank: 2, harmony: H(2) },
  { label: 'Outro', bars: 4, bank: 6, harmony: H(6) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const barsOf = bank => FORM.find(s => s.bank === bank).bars
// The maracatu sixteenth: the second and the fourth lean towards the next stroke (ticks of 1/128 bar, ~17 ms).
const BAQUE = { push: [0, 1, 0, 1], jitter: 1, vel: .07 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...BAQUE, seed, ...extra }))
const drum = (bank, seed, text) => C.roll(Math.min(4, barsOf(bank)), hand(seed, hits(C.tile(text, Math.min(4, barsOf(bank))))))
const R = '................'
// The convention that stops the baque (viração) and the one that ends the song.
const PARADA = 'X..X ..X. X... ....'
const FINAL = 'X..X ..X. X... X... | X... .... .... ....'

// ---------- the three alfaias and the one that turns ----------
const marcante = {
  0: hand(11, hits(`${R} | ${R} | ${R} | .... .... X..x ..X.`)),
  1: drum(1, 12, 'X..x ..X. X..x ..X. | X..x ..X. X..x ..Xo | X..x ..X. X..x ..X. | X..x ..X. X.xx .xX.'),
  2: drum(2, 13, 'X..x .oX. X..x .oX. | X..x .oX. X.ox .xX. | X..x .oX. X..x .oX. | X.xX .xX. X.xX xxXX'),
  3: drum(3, 14, 'o... .... o... .... | o... .... o... ..h.'),
  4: drum(4, 15, `X..x ..X. X..x ..X. | X..x ..X. X..x ..Xo | X..x ..X. X..x .xX. | ${PARADA}`),
  5: drum(5, 16, 'X.x. X.x. X.x. X.x. | X.x. X.x. X.x. X.xx | X.x. X.x. X.x. X.x. | X.xx X.xx X.xx XXXX'),
  6: hand(17, hits(`X..x .oX. X..x .oX. | X.xX .xX. X.xX xxXX | ${FINAL}`)),
}
const meiao = {
  1: drum(1, 21, '..x. o... ..x. o... | ..x. o... ..x. o..x'),
  2: drum(2, 22, '..x. x..o ..x. x..o | ..x. x..o ..xx x.xx'),
  4: drum(4, 23, `..x. o... ..x. o... | ..x. o... ..x. o..x | ..x. o... ..x. o... | ${PARADA}`),
  5: drum(5, 24, 'x.xx x.xx x.xx x.xx | x.xx x.xx x.xx xxxx'),
  6: hand(25, hits(`..x. x..o ..x. x..o | ..x. x..o ..xx x.xx | ${FINAL}`)),
}
const repique = {
  1: drum(1, 31, 'x.ox .x.o x.ox .x.o | x.ox .x.o x.ox .xxx'),
  2: drum(2, 32, 'x.xx .x.x x.xx .x.x | x.xx .x.x x.xx xxxx'),
  4: hand(33, hits(`X.xX .xX. xX.x X.XX | .xX. xXxX .X.x X... | X.xx X.xx X.xx XxXx | ${PARADA} | xXxx Xxxx xXxx Xxxx | X.X. xxX. X.X. xxXX | RxRx RxRx XxXx XXXX | ${PARADA}`)),
  5: drum(5, 34, 'X.xx X.xx X.xx X.xx | X.xx X.xx XxXx XXXX'),
  6: hand(35, hits(`x.xx .x.x x.xx .x.x | x.xx .x.x x.xx xxxx | ${FINAL}`)),
}
const virada = {
  1: drum(1, 41, `${R} | .... .... .... ..xX | ${R} | .... .... ..xX .xXX`),
  2: drum(2, 42, '.... .... .... ..xX | .... .... ..xX .xXX | .... .... .... x.xX | .... ..xX .xXx XXXX'),
  5: drum(5, 43, '.... ..X. .... ..X. | .... ..X. ..X. X.XX'),
  6: hand(44, hits(`.... .... .... ..xX | .... ..xX .xXx XXXX | ${FINAL}`)),
}

// ---------- caixa de guerra and tarol ----------
const caixa = {
  0: hand(51, swell(hits(`${R} | ${R} | g.g. g.g. gmgm xmxm | RmRm RmRm XmXm XXXX`), 4, .6, 1)),
  1: drum(1, 52, 'Xg,X g,Xg Xg,X g,Xg | Xg,X ggXg XggX gmXR'),
  2: drum(2, 53, 'XgmX gmXg XgmX gmXg | XgmX gmXg XgmX RmXR'),
  4: drum(4, 54, `Xg,X g,Xg Xg,X g,Xg | Xg,X g,Xg Xg,X gmXR | Xg,X g,Xg Xg,X g,Xg | ${PARADA}`),
  5: hand(55, swell(hits(rep('XmXg XmXg XmXg XmXg | XmXg XmXg RmRm RmRR', 4)), 8, .55, 1)),
  6: hand(56, hits(`XgmX gmXg XgmX gmXg | XgmX gmXg RmRm RRRR | ${FINAL}`)),
}
const tarol = {
  1: drum(1, 61, 'h.x, h.x, h.x, h.xg | h.x, h.x, h.x, hxxg'),
  2: drum(2, 62, 'h.xg h.xg h.xg h.xg | h.xg h.xg h.xg hxxx'),
  4: drum(4, 63, `h.x, h.x, h.x, h.xg | h.x, h.x, h.x, hxxg | h.x, h.x, h.x, h.xg | ${PARADA}`),
  5: drum(5, 64, 'hxxg hxxg hxxg hxxg | hxxg hxxg hxxx xxxx'),
  6: hand(65, hits(`h.xg h.xg h.xg h.xg | h.xg h.xg h.xg hxxx | ${FINAL}`)),
}

// ---------- gonguê, agbês, mineiro, atabaque ----------
const gongue = {
  0: hand(71, hits(`${R} | .... .... o.h. .h.. | X.o. .x.o X.o. .x.. | X.o. .x.o X.o. .xx.`)),
  1: drum(1, 72, 'X.o. .x.o X.o. .x.. | X.o. .x.o X.o. .xx.'),
  2: drum(2, 73, 'X.x. .x.x X.x. .x.. | X.x. .x.x X.x. .xx.'),
  3: drum(3, 74, 'm.h. .o.h m.h. .o.. | m.h. .o.h m.h. .oh.'),
  4: drum(4, 75, `X.o. .x.o X.o. .x.. | X.o. .x.o X.o. .xx. | X.o. .x.o X.o. .x.. | ${PARADA}`),
  5: drum(5, 76, 'X.x. X.x. X.x. X.x. | X.x. X.x. X.x. X.xX'),
  6: hand(77, hits(`X.x. .x.x X.x. .x.. | X.x. .x.x X.x. .xx. | ${FINAL}`)),
}
const agbe = {
  1: drum(1, 81, 'X.hm X.hm X.hm X.hm | X.hm X.hm X.hm X.mx'),
  2: drum(2, 82, 'X.mx X.mx X.mx X.mx | X.mx X.mx X.mx Xxmx'),
  3: drum(3, 83, 'o.g, o.g, o.g, o.g, | o.g, o.g, o.g, o.gh'),
  4: drum(4, 84, `X.hm X.hm X.hm X.hm | X.hm X.hm X.hm X.mx | X.hm X.hm X.hm X.hm | ${PARADA}`),
  5: drum(5, 85, 'X.xx X.xx X.xx X.xx | X.xx X.xx X.xx XxXx'),
  6: hand(86, hits(`X.mx X.mx X.mx X.mx | X.mx X.mx X.mx Xxmx | ${FINAL}`)),
}
const contratempo = {
  2: drum(2, 91, '..x. ..x. ..x. ..xx | ..x. ..x. ..x. .xxx'),
  5: drum(5, 92, '..X. ..X. ..X. ..X. | ..X. ..X. ..X. .XXX'),
  6: hand(93, hits(`..x. ..x. ..x. ..xx | ..x. ..x. ..x. .xxx | ${FINAL}`)),
}
const mineiro = {
  0: hand(101, hits(`${R} | ${R} | g,h, g,h, g,h, g,h, | m,h, m,h, mhhh mhhh`)),
  1: drum(1, 102, 'mh,h mh,h mh,h mh,h | mh,h mh,h mh,h mhhh'),
  2: drum(2, 103, 'xhhh xhhh xhhh xhhh | xhhh xhhh xhhh xhmh'),
  3: drum(3, 104, 'h,g, h,g, h,g, h,g, | h,g, h,g, h,g, hggg'),
  4: drum(4, 105, 'mh,h mh,h mh,h mh,h | mh,h mh,h mh,h mhhh | mh,h mh,h mh,h mh,h | m..m ..m. m... ....'),
  5: drum(5, 106, 'xhmh xhmh xhmh xhmh'),
  6: hand(107, hits('xhhh xhhh xhhh xhhh | xhhh xhhh xhhh xhmh | x..x ..x. x... x... | x... .... .... ....')),
}
const atabaque = {
  1: drum(1, 111, 'x..o .x.. x..o .x.. | x..o .x.. x..o .xox'),
  2: drum(2, 112, 'x..o .x.o x..o .x.o | x..o .x.o x.oo .xox'),
  3: drum(3, 113, 'o..h .o.. o..h .o.. | o..h .o.. o..h .oho'),
  4: hand(114, hits(`x..o .x.. x..o .xox | ..x. xox. .xo. x.xx | x.ox .x.o x.ox .xXx | ${PARADA} | x..o .x.. x..o .xox | .xox .xox x.x. xoxx | xoxo xoxo XoXo XXXX | ${PARADA}`)),
  5: drum(5, 115, 'x.ox x.ox x.ox x.ox | x.ox x.ox xoxo xxxx'),
  6: hand(116, hits(`x..o .x.o x..o .x.o | x..o .x.o x.oo .xox | ${FINAL}`)),
}
const rufo = { [FILL]: hand(121, hits('gmgm xmxm RmRm XXXX')) }

// ---------- apito do mestre ----------
const apito = {
  0: hits(`${R} | ${R} | ${R} | X... X... X.X. X...`),
  1: hits(`X... .... .... .... | ${rep(R, 7)}`),
  2: hits(`X... X... .... .... | ${rep(R, 7)}`),
  4: hits(`X... .... .... .... | ${rep(R, 2)} | .... .... .... X.X. | ${rep(R, 3)} | .... .... .... X.X.`),
  5: hits(`X.X. X... .... .... | ${rep(R, 3)} | X.X. X... .... .... | ${rep(R, 2)} | .... .... X.X. X.X.`),
  6: [...hits(`${rep(R, 2)} | X... .... X... .... | ................`), { start: 3, duration: .75, degree: 0, velocity: .9, release: .5 }],
}

// ---------- the loa: the mestre calls, the nação answers (sixteen sixteenths a bar, '.' holds) ----------
const Z = '. . . . . . . . . . . . . . . .'
const LOA = ['4 . . . . . 5 . 7 . . . . . 5 .', '4 . . . . . . . . . . . . . . .', '6 . . . . . 5 . 3 . . . 4 . . .', '0 . . . . . . . . . . . . . . .']
const CHAMA = ['4 . . 4 . . 5 . 7 . . 5 . . 4 .', '5 . . 4 . . 2 . 4 . . . . . . .', Z, Z,
  '7 . . 7 . . 8 . 7 . . 5 . . 4 .', '5 . . 7 . . 5 . 4 . . . . . . .', Z, Z]
const RESPONDE = [Z, Z, '6 . . 6 . . 5 . 4 . . 3 . . 4 .', '2 . . . . . 0 . . . . . . . . .',
  Z, Z, '6 . . 6 . . 5 . 3 . . 4 . . 1 .', '0 . . . . . . . . . . . . . . .']
const REFRAO = ['7 . . 7 . . 7 . 8 . . 7 . . 5 .', '7 . . . . . 5 . 4 . . . . . . .', '4 . . 4 . . 4 . 5 . . 4 . . 2 .', '4 . . . . . . . . . . . . . . .',
  '6 . . 6 . . 6 . 7 . . 6 . . 4 .', '5 . . . . . 3 . 1 . . . . . . .', '2 . . 2 . . 4 . 2 . . 1 . . 0 .', '0 . . . . . . . . . . . . . . .']
const REFRAO_MESTRE = [Z, '. . . . . . . . . . 7 . 8 . 7 .', Z, '. . . . . . 4 . 5 . 7 . . . . .', Z, '. . . . . . . . . . 6 . 7 . 6 .', Z, '. . . . . . 2 . 4 . 7 . . . . .']
const TOADA = ['4 . . . . . 5 . 7 . . . . . . .', '6 . . . . . 5 . 3 . . . . . . .', Z, Z,
  '3 . . . . . 4 . 5 . . . 7 . . .', '5 . . . . . . . 3 . . . . . . .', Z, Z]
const TOADA_CORO = [Z, Z, '2 . . . . . 1 . 2 . . . 4 . . .', '2 . . . . . . . . . . . . . . .',
  Z, Z, '6 . . . . . 5 . 3 . . . 1 . . .', '0 . . . . . . . . . . . . . . .']
const BRADO = ['. . . . . . 4 . 5 . 7 . . . . .', Z, '. . . . . . 3 . 4 . 6 . . . . .', Z, '. . . . . . 4 . 5 . 8 . . . . .', Z, '. . . . . . 6 . 7 . 8 . . . . .', '7 . . . . . . . . . . . . . . .']
const GRITO = ['8 . 7 . . . . . . . . . . . . .', '. . . . . . . . 8 . 7 . 4 . . .', '7 . 6 . . . . . . . . . . . . .', '. . . . . . . . 7 . . . 4 . . .',
  '8 . 7 . . . . . . . . . . . . .', '. . . . . . . . 8 . 7 . 4 . . .', '7 . 6 . . . 7 . 6 . . . 7 . 6 .', '7 . . . . . . . . . . . . . . .']
const VIRACAO = ['4 . . . . . . . . . . . . . . .', Z, '3 . . . . . . . . . . . . . . .', '4 . . . . . . . . . . . . . . .',
  '7 . . . . . . . . . . . . . . .', Z, '6 . . . . . . . . . . . . . . .', '4 . . . . . . . . . . . . . . .']
const FIM = ['6 . . 6 . . 5 . 3 . . 4 . . 6 .', '7 . . 7 . . 6 . 4 . . 2 . . 4 .', '0 . . . . . . . . . . . . . . .', Z]
const sing = (rows, bank, seed, options) => relative(phrase(line(rows, { vibratoFrom: 4 }), seed, options), H(bank))
const third = (rows, bank, seed, options) => relative(vel(up(phrase(line(rows, { vibratoFrom: 4 }), seed, options), -2), .84), H(bank))

const mestre = {
  0: sing(LOA, 0, 131, { low: .5, high: .8, jitter: 2, glide: 2 }),
  1: sing(CHAMA, 1, 132, { low: .58, high: .88 }),
  2: sing(REFRAO_MESTRE, 2, 133, { low: .5, high: .74 }),
  3: sing(TOADA, 3, 134, { low: .42, high: .7, jitter: 2, glide: 3 }),
  5: sing(BRADO, 5, 135, { low: .7, high: .95 }),
  6: sing(FIM, 6, 136, { low: .6, high: .9 }),
}
const coro = {
  1: sing(RESPONDE, 1, 141, { low: .55, high: .84 }),
  2: sing(REFRAO, 2, 142, { low: .6, high: .92 }),
  3: sing(TOADA_CORO, 3, 143, { low: .38, high: .62, jitter: 2 }),
  4: sing(VIRACAO, 4, 144, { low: .4, high: .6 }),
  5: sing(GRITO, 5, 145, { low: .72, high: .96 }),
  6: sing(FIM, 6, 146, { low: .62, high: .92 }),
}
const tercas = {
  2: third(REFRAO, 2, 151, { low: .58, high: .88 }),
  3: third(TOADA_CORO, 3, 152, { low: .34, high: .56, jitter: 2 }),
  5: third(GRITO, 5, 153, { low: .66, high: .9 }),
  6: third(FIM, 6, 154, { low: .58, high: .86 }),
}

const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const VOICE = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Alfaia marcante', 'rhythm', 'pulse', DRUM('brasil', 'alfaia'), marcante, on(...ALL),
    { ...DRUMS, octave: 2, gain: .4, attack: .001, decay: .5, sustain: 0, release: .25, clip: 1, lpf: 3200, hpf: 30, effects: { reverb: .08, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('a2', 'Tarol', 'rhythm', 'pulse', DRUM('sambaReggae', 'tarol'), tarol, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .24, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 8500, hpf: 260, effects: { reverb: .08, pan: .2 } }),
  P('b1', 'Gonguê', 'rhythm', 'pulse', DRUM('brasil', 'gongue'), gongue, on(...ALL),
    { ...DRUMS, octave: 2, gain: .18, attack: .001, decay: .25, sustain: 0, release: .12, clip: .7, lpf: 7500, hpf: 400, effects: { reverb: .1, pan: -.25 } }),
  P('b2', 'Agbê', 'rhythm', 'pulse', DRUM('sambaReggae', 'chocalho'), agbe, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 9500, hpf: 1800, effects: { reverb: .06, pan: .3 } }),
  P('c1', 'Alfaia repique', 'rhythm', 'phrase', DRUM('sambaReggae', 'surdo-viradeira'), repique, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .24, attack: .001, decay: .3, sustain: 0, release: .15, clip: .9, lpf: 5000, hpf: 60, effects: { reverb: .08, pan: .15 } }),
  P('c2', 'Mineiro', 'rhythm', 'pulse', DRUM('brasil', 'ganza'), mineiro, on(...ALL),
    { ...DRUMS, octave: 2, gain: .28, attack: .001, decay: .07, sustain: 0, release: .05, clip: .5, lpf: 9000, hpf: 3000, effects: { reverb: .05, pan: -.3 } }),
  P('d1', 'Loa · mestre', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), mestre, on(0, 1, 2, 3, 4, 5, 7, 8),
    { ...VOICE, octave: 3, gain: .42, attack: .04, decay: .4, sustain: .78, release: .25, clip: 1, lpf: 5200, hpf: 140, effects: { reverb: .28, pan: 0 }, design: { role: 'lead', vibrato: 4.6, vibratoDepth: .12 } }),
  P('d2', 'Caixa de guerra', 'rhythm', 'pulse', DRUM('sambaReggae', 'caixa'), caixa, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .15, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 8500, hpf: 220, effects: { reverb: .08, pan: -.12 } }),
  P('e1', 'Coro da nação', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), coro, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...VOICE, octave: 4, gain: .36, attack: .05, decay: .4, sustain: .78, release: .28, clip: 1, lpf: 5600, hpf: 180, effects: { reverb: .32, pan: .12 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .08 } }),
  P('e2', 'Atabaque', 'rhythm', 'pulse', DRUM('sambaReggae', 'timbau'), atabaque, on(1, 2, 3, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .2, sustain: 0, release: .1, clip: .7, lpf: 6500, hpf: 120, effects: { reverb: .09, pan: -.18 } }),
  P('f1', 'Coro · terças', 'response', 'sustain', SAMPLE('brasil', 'coro-laia'), tercas, on(2, 3, 5, 7, 8),
    { ...VOICE, octave: 4, gain: .26, attack: .05, decay: .4, sustain: .76, release: .28, clip: 1, lpf: 5000, hpf: 180, effects: { reverb: .32, pan: -.14 } }),
  P('f2', 'Alfaia · virada', 'rhythm', 'pulse', DRUM('brasil', 'alfaia'), virada, on(1, 2, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .32, attack: .001, decay: .4, sustain: 0, release: .2, clip: 1, lpf: 3600, hpf: 36, effects: { reverb: .1, pan: -.08 } }),
  P('g1', 'Apito do mestre', 'response', 'pulse', DRUM('brasil', 'apito'), apito, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .13, attack: .001, decay: .3, sustain: 0, release: .1, clip: 1, lpf: 9000, hpf: 900, effects: { reverb: .26, pan: .3 }, design: { role: 'fx' } }),
  P('g2', 'Agbê · contratempo', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), contratempo, on(2, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .28, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 9000, hpf: 2200, effects: { reverb: .06, pan: .36 } }),
  P('h1', 'Alfaia meião', 'rhythm', 'pulse', DRUM('sambaReggae', 'surdo-meio'), meiao, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .28, attack: .001, decay: .4, sustain: 0, release: .2, clip: 1, lpf: 3800, hpf: 40, effects: { reverb: .08, pan: .08 } }),
  P('h2', 'Caixa · rufo', 'rhythm', 'pulse', DRUM('sambaReggae', 'caixa'), rufo, on(),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 9000, hpf: 220, effects: { reverb: .1, pan: -.1 } }),
]
const rufoPart = PARTS.find(p => p.slot === 'h2')
rufoPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: rufo[FILL] }
rufoPart.fills = { 1: FILL, 2: FILL, 3: FILL, 4: FILL, 5: FILL, 7: FILL }
rufoPart.sections = FORM.map((_, i) => i in rufoPart.fills || null)
for (const part of PARTS) if (part !== rufoPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound: the toada is close and wet, the martelo opens up ----------
const SECTION_PARAMS = {
  a1: { 3: { gain: .3, lpfRange: { first: 1600, second: 2000 } }, 5: { gain: .56 } },
  b1: { 0: { gain: .12 }, 3: { gain: .11, reverbRange: { first: .2, second: .26 } } },
  b2: { 3: { gain: .1 } }, c2: { 3: { gain: .1 } },
  e2: { 3: { gain: .15, reverbRange: { first: .18, second: .24 } }, 6: { gain: .26 } },
  d1: { 0: { reverbRange: { first: .4, second: .46 } }, 3: { reverbRange: { first: .38, second: .44 } }, 5: { gain: .48 } },
  e1: { 3: { gain: .28, reverbRange: { first: .4, second: .46 } }, 6: { gain: .2 } },
  c1: { 6: { gain: .36 } },
  d2: { 5: { reverbRange: { first: .14, second: .18 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'recife-1975', kitName: 'Maracatu', profileName: 'Recife 1975 · Maracatu de baque virado', meter: '4/4', bpm: 108, root: 'D', scale: 'Mixolídia',
  form: FORM, parts: PARTS,
  reactions: reactions('mar', { refrain: 2, breque: 4, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Maracatu de baque virado das nações do Recife (Nação Porto Rico, Leão Coroado, Estrela Brilhante, Elefante): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Maracatu',
}).catch(error => { console.error(error); process.exit(1) })
