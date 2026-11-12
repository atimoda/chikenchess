// 1984 Rio de Janeiro - Samba-enredo · ensaio da bateria da Mangueira (original material).
// A rehearsal night in the Mangueira quadra the year the Sambódromo opened, bateria only. Mangueira's own
// marking: one surdo de primeira, open and heavy on the second beat, the same surdo muted by the hand on the
// first (no surdo de segunda answering), and the surdo de terceira cutting between them. The surdos lead the
// mix; caixas, tarol and chocalhos play sixteenths with real hand dynamics (ghosts, accents on the second and
// fourth sixteenth, notes that sometimes do not sound) and the samba feel (the second sixteenth a hair late,
// the fourth early), so the bateria swings instead of rattling.
// Form: esquenta · samba · refrão · paradinha (convenção) · bossa (soft: surdos low, tamborins and cuícas) ·
// samba · surdos dobrando (tense: rufos growing into the refrão) · refrão · final.
// Run: node scripts/brazilian/rio-1984.cjs
const { composer, build, reactions, DRUM, SAMPLE, P, presence } = require('./lib.cjs')
const C = composer('2/4', 'Maior')
const { hits, rep, feel, tone, swell, set } = C

const FORM = [
  { label: 'Intro', bars: 8, bank: 0, harmony: [0] },
  { label: 'Verse', bars: 16, bank: 1, harmony: [0] },
  { label: 'Chorus', bars: 16, bank: 3, harmony: [0] },
  { label: 'Break', bars: 8, bank: 2, harmony: [0] },       // paradinha: the whole bateria in one figure
  { label: 'Interlude', bars: 16, bank: 4, harmony: [0] },  // bossa: soft
  { label: 'Verse', bars: 16, bank: 1, harmony: [0] },
  { label: 'Bridge', bars: 8, bank: 5, harmony: [0] },      // surdos dobrando: tense
  { label: 'Chorus', bars: 16, bank: 3, harmony: [0] },
  { label: 'Outro', bars: 8, bank: 6, harmony: [0] },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
// The samba sixteenth: the second a little late, the fourth early (ticks of 1/128 bar, ~6.7 ms at 140 BPM).
const SAMBA = { push: [0, 2, 0, -2], jitter: 1, vel: .06 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...SAMBA, seed, ...extra }))
// Dense layers loop a short roll (four bars): the engine reads a whole roll on every query, so a 16-bar roll
// of sixteenths costs four times as much as its 4-bar loop. The hand still varies inside the four bars.
const loop = (bars, seed, text, extra) => C.roll(bars, hand(seed, hits(text), extra))
const R = '........'
// Intro: four bars of apito and chamada, then the bateria plays.
const enters = (groove, seed) => hand(seed, hits(`${rep(R, 4)} | ${groove}`))
// Paradinha: everyone plays this figure together, the repiques answer in the gaps.
const CONV = 'X...X.X. | ..X.X... | X.X.X.X. | X...R... | X...X.X. | ..X.X... | X.X.X.X. | X.......'
const CONV_OFF = 'X....... | ........ | X....... | ........ | X....... | ........ | X.X.X.X. | X.......'
const ENDING = (groove) => `${rep(groove, 5)} | X...X.X. | ..X.X.X. | X.......`

// ---------- a1 Surdo de primeira: open and heavy on the 2 ----------
const primeira = {
  0: enters('....X... | ....X... | ....X... | ....X..x', 11),
  1: loop(4, 12, '....X... | ....X... | ....X... | ....X..o'),
  2: hand(13, hits(CONV)),
  3: loop(4, 14, '....X... | ....X... | ....X... | ..x.X..x'),
  4: loop(4, 15, '....m... | ....o... | ....m... | ....o...'),
  5: swell(hand(16, hits(rep('....X..x | ....X.x. ', 4))), 8, .75, 1),
  6: hand(17, hits(ENDING('....X... | ....X..x'))),
}
// ---------- a2 Surdo abafado: the same surdo muted by the hand on the 1 ----------
const abafado = {
  0: enters('x....... | x....... | x....... | x.......', 21),
  1: loop(4, 22, 'x....... | x....... | x....... | x.....o.'),
  2: hand(23, hits(CONV_OFF)),
  3: loop(4, 24, 'x....... | x....... | x....... | x..o....'),
  4: loop(4, 25, rep('o....... | h.......', 2)),
  5: swell(hand(26, hits(rep('x..o.... | x.o.....', 4))), 8, .75, 1),
  6: hand(27, hits(ENDING('x....... | x.....o.'))),
}
// ---------- h1 Surdo de terceira: cutting between them ----------
const terceira = {
  0: enters('..m..oX. | ..m.x.X. | ..m..oX. | ..m.xxX.', 31),
  1: loop(4, 32, '..m..oX. | ..m.o.X. | ..m..oX. | .om.o.X.'),
  2: hand(33, hits(CONV)),
  3: loop(4, 34, '..m..oX. | ..m.x.X. | .om..oX. | ..m.xxX.'),
  4: loop(4, 35, rep('......o. | ..h...o.', 2)),
  5: swell(hand(36, hits(rep('.xm..xX. | .xm.xxX.', 4))), 8, .7, 1),
  6: hand(37, hits(ENDING('..m..oX. | ..m.xxX.'))),
}
// ---------- c2 Caixa de guerra: sixteenths "em cima", accents on the 2nd and 4th, ghosts that come and go ----------
const CAIXA = 'g,gX g,gx | g,gX ,mgX | g,gX g,gx | gmgX gxRX'
const caixa = {
  0: enters('g,gX g,gX | g,gX gmgX | g,gX g,gX | gmgX RXRX', 41),
  1: loop(4, 42, CAIXA),
  2: hand(43, hits(CONV)),
  3: loop(4, 44, 'gmgX g,gX | gmgX gmgX | gmgX g,gX | gmgX RXRX'),
  5: hand(45, swell(hits(rep('gmgm gmgm | RmRm RmRm ', 3) + ' | RRRR RRRR | RRRR X...'), 8, .45, 1)),
  6: hand(46, hits(ENDING('gmgX g,gX | gmgX RXRX'))),
}
// ---------- d2 Tarol: only in the refrão and the peak, under the caixas ----------
const tarol = {
  3: loop(4, 51, rep('x.g, x.g, | x.g, xgx.', 2)),
  5: hand(52, swell(hits(rep('x.g. x.g. | xgxg xgxg', 4)), 8, .5, 1)),
  6: hand(53, hits(ENDING('x.g, x.g, | x.g, xgx.'))),
}
// ---------- e2 Chocalho: light sixteenths, the accent on the off-beat ----------
const chocalho = {
  0: enters('h.hX h.hX | h.hX h.hX', 61),
  1: loop(4, 62, rep('h,hX h,hx | h,hX hmhX', 2)),
  3: loop(4, 63, rep('hmhX hmhX | hmhX hmhX', 2)),
  4: loop(4, 64, rep('..h. ..h. | ..h. ..o.', 2)),
  5: hand(65, swell(hits(rep('hmhX hmhX', 8)), 8, .6, 1)),
  6: hand(66, hits(ENDING('hmhX hmhX | hmhX hmhX'))),
}
// ---------- g2 Reco-reco: only in the refrão and the peak ----------
const reco = {
  3: loop(4, 71, rep('x..x x..x | x..x x.ox', 2)),
  6: hand(72, hits(ENDING('x..x x..x | x..x x.ox'))),
}
// ---------- b1 Repique de marcação ----------
const repique = {
  0: enters('x.oX .oX. | x.oX .oXo', 81),
  1: loop(4, 82, 'x.oX .oX. | x.oX .oX, | x.oX .oX. | x.oX .xXx'),
  2: hand(83, hits('X...X.X. | ..X.X... | X.X.X.X. | X...XmXm | X.mX .mX. | m.mX .mX. | X.mX .XXX | X.......')),
  3: loop(4, 84, rep('x.oX .oX. | x.oX .xXx', 2)),
  4: loop(4, 85, 'X.oX .oX. | o.XX .oX. | X.oX .oX. | XoXo X.X.'),
  5: swell(hand(86, hits(rep('x.xX .xX. | x.xX xxXX', 4))), 8, .7, 1),
  6: hand(87, hits(ENDING('x.oX .oX. | x.oX .xXx'))),
  [FILL]: hand(88, hits('XmXm XXXX')),
}
// ---------- d1 Repique de chamada (queen): the calls, the answers, the solo in the bossa ----------
const chamada = {
  0: hand(91, hits('X.X.X.X. | XmXm X... | X.X.X.X. | XmXm X.X. | ' + rep(R, 3) + ' | ....XXXX')),
  1: hand(92, hits(rep(R, 15) + ' | XmXm X.X.')),
  2: hand(93, hits('X...X.X. | ..X.X... | X.X.X.X. | X...XmXm | X.mX .mX. | m.mX .mX. | X.mX .XXX | X.......')),
  3: hand(94, hits(rep(R, 6) + ' | X.X.X.X. | XmXm XXXX | ' + rep(R, 7) + ' | XmXm X.X.')),
  4: hand(95, hits('X.mX .mX. | XmXX .XmX | .XmX .mX. | XmXm X.X. | m.mX .mX. | X.XX .X.X | XmXm XmXm | X....... | ' + rep(R, 7) + ' | ....XmXm')),
  5: hand(96, hits(rep(R, 6) + ' | X.X.X.X. | XXXX XXXX')),
  6: hand(97, hits(rep(R, 4) + ' | X.X.X.X. | XmXm X... | X...X.X. | X.......')),
}
// ---------- b2 Tamborim: teleco-teco; g1 the desenhos of the refrão; h2 viradas into the sections ----------
const TELECO = 'X.xX .x.X | .x.X x.x. | X.xX .x.X | .x.X x.xx'
const DESENHO = 'X.X. X.XX | .XX. X.X. | X.X. X.XX | X.XX X...'
const tamborim = {
  0: enters('X.xX .x.X | .x.X x.x.', 101),
  1: loop(4, 102, TELECO),
  2: hand(103, hits(CONV)),
  3: loop(4, 104, 'X.xX .x.X | .x.X x.xX | X.xX .x.X | .xxX x.xX'),
  4: loop(4, 105, TELECO, { vel: .1 }),
  5: loop(4, 106, rep('X.xX .x.X | .x.X x.x.', 2)),
  6: hand(107, hits(ENDING('X.xX .x.X | .x.X x.xX'))),
}
const desenho = {
  2: hand(111, hits(CONV)),
  3: loop(4, 112, DESENHO),
  4: loop(4, 113, 'X.X. .X.X | .X.X X.X. | X.X. X.XX | X.XX X...'),
  6: hand(114, hits(ENDING('X.X. X.XX | X.XX X...'))),
}
const virada = {
  0: hand(121, hits(rep(R, 7) + ' | ....gmXX')),
  1: hand(122, hits(rep(R, 15) + ' | ......mX')), 3: hand(123, hits(rep(R, 15) + ' | ......mX')),
  4: hand(124, hits(rep(R, 15) + ' | ....mmXX')), 5: hand(125, hits(rep(R, 7) + ' | XmXm XXXX')),
  [FILL]: hand(126, hits('XmXm XXXX')),
}
// ---------- c1 / f1 Cuícas: they talk in the samba and sing in the bossa ----------
const cuicaAguda = {
  1: loop(4, 131, rep('..o. .o.o | ..o. ..oo', 2)), 3: loop(4, 132, rep('..x. .x.x | .xx. .x.x', 2)),
  4: loop(4, 133, '..x. .x.x | ..x. ..xx | ..xx .x.x | ..x. .xxx'), 6: hand(134, hits(ENDING('..x. .x.x | .xx. .x.x'))),
}
const cuicaGrave = {
  3: loop(4, 141, rep('o... ..o. | o..o ..o.', 2)), 4: loop(4, 142, 'x... ..x. | x..x ..x. | x... .xx. | x..x ..xx'),
  6: hand(143, hits(ENDING('o... ..o. | o..o ..o.'))),
}
// ---------- f2 Agogô: a two-bar bell ----------
const agogo = {
  1: loop(4, 151, rep('x.o. .x.o | .x.o x.o.', 2)), 3: loop(4, 152, rep('x.o. .x.o | .x.o x.ox', 2)),
  4: loop(4, 153, rep('x.ox .x.o | .x.o x.ox', 2)), 6: hand(154, hits(ENDING('x.o. .x.o | .x.o x.ox'))),
}
// ---------- e1 Apito do mestre (king): it calls the esquenta, the paradinha, the bossa and the final ----------
const apito = {
  0: hits('X...X... | X.X.X... | ' + rep(R, 6)),
  1: hits('X....... | ' + rep(R, 15)), 2: hits('X...X... | ' + rep(R, 7)), 3: hits('X....... | ' + rep(R, 15)),
  4: hits('X...X.X. | ' + rep(R, 15)), 5: hits('X....... | ' + rep(R, 5) + ' | X...X... | X.X.X...'), 6: hits(rep(R, 5) + ' | X...X... | X.X.X... | ........'),
}

const RHYTHM = { mapping: { fileDegrees: 0, rankDegrees: 0 }, design: { role: 'drums' } }
const PARTS = [
  P('a1', 'Surdo de primeira', 'rhythm', 'pulse', DRUM('bateria', 'surdo-marcacao'), primeira, on(...ALL),
    { ...RHYTHM, octave: 2, gain: .62, attack: .001, decay: .8, sustain: 0, release: .4, clip: 1, lpf: 3500, hpf: 28, effects: { reverb: .07, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('a2', 'Surdo abafado', 'rhythm', 'pulse', DRUM('bateria', 'surdo-marcacao-mao'), abafado, on(...ALL),
    { ...RHYTHM, octave: 2, gain: .5, attack: .001, decay: .3, sustain: 0, release: .15, clip: 1, lpf: 2800, hpf: 30, effects: { reverb: .05, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Repique', 'rhythm', 'pulse', DRUM('sambaReggae', 'repinique'), repique, on(...ALL),
    { ...RHYTHM, octave: 2, gain: .26, attack: .001, decay: .2, sustain: 0, release: .1, clip: .8, lpf: 9000, hpf: 220, effects: { reverb: .08, pan: -.2 }, fills: { 1: FILL, 4: FILL, 7: FILL } }),
  P('b2', 'Tamborim', 'rhythm', 'pulse', DRUM('bateria', 'tamborim'), tamborim, on(...ALL),
    { ...RHYTHM, octave: 2, gain: .34, attack: .001, decay: .1, sustain: 0, release: .06, clip: .8, lpf: 11000, hpf: 320, effects: { reverb: .07, pan: .2 } }),
  P('c1', 'Cuíca aguda', 'response', 'pulse', SAMPLE('brasil', 'cuica-aguda', 0, false), cuicaAguda, on(1, 2, 4, 5, 7, 8),
    { ...RHYTHM, octave: 2, gain: .11, attack: .002, decay: .2, sustain: 0, release: .1, clip: .9, lpf: 5500, hpf: 250, effects: { reverb: .14, pan: .4 } }),
  P('c2', 'Caixa de guerra', 'rhythm', 'pulse', DRUM('bateria', 'caixa'), caixa, on(0, 1, 2, 3, 5, 6, 7, 8),
    { ...RHYTHM, octave: 2, gain: .17, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 9000, hpf: 200, effects: { reverb: .07, pan: -.1 } }),
  P('d1', 'Repique de chamada', 'rhythm', 'phrase', DRUM('sambaReggae', 'repinique'), chamada, on(...ALL),
    { ...RHYTHM, octave: 2, gain: .3, attack: .001, decay: .2, sustain: 0, release: .1, clip: .8, lpf: 10000, hpf: 200, effects: { reverb: .1, pan: .25 } }),
  P('d2', 'Tarol', 'rhythm', 'pulse', DRUM('sambaReggae', 'tarol'), tarol, on(2, 6, 7, 8),
    { ...RHYTHM, octave: 2, gain: .13, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 8500, hpf: 260, effects: { reverb: .07, pan: .15 } }),
  P('e1', 'Apito do mestre', 'response', 'pulse', DRUM('bateria', 'apito'), apito, on(...ALL),
    { ...RHYTHM, octave: 2, gain: .15, attack: .001, decay: .3, sustain: 0, release: .1, clip: 1, lpf: 9000, hpf: 900, effects: { reverb: .25, pan: .3 }, design: { role: 'fx' } }),
  P('e2', 'Chocalho', 'rhythm', 'pulse', DRUM('bateria', 'chocalho'), chocalho, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...RHYTHM, octave: 2, gain: .2, attack: .001, decay: .1, sustain: 0, release: .06, clip: .7, lpf: 10000, hpf: 2500, effects: { reverb: .05, pan: -.3 } }),
  P('f1', 'Cuíca grave', 'response', 'pulse', SAMPLE('brasil', 'cuica-grave', 0, false), cuicaGrave, on(2, 4, 7, 8),
    { ...RHYTHM, octave: 2, gain: .12, attack: .002, decay: .3, sustain: 0, release: .1, clip: .9, lpf: 4500, hpf: 150, effects: { reverb: .14, pan: -.4 } }),
  P('f2', 'Agogô', 'rhythm', 'pulse', DRUM('sambaReggae', 'agogo-agudo'), agogo, on(1, 2, 4, 5, 7, 8),
    { ...RHYTHM, octave: 2, gain: .11, attack: .001, decay: .2, sustain: 0, release: .1, clip: .6, lpf: 9000, hpf: 800, effects: { reverb: .08, pan: .35 } }),
  P('g1', 'Tamborim · desenho', 'rhythm', 'pulse', DRUM('bateria', 'tamborim'), desenho, on(2, 3, 4, 7, 8),
    { ...RHYTHM, octave: 2, gain: .26, attack: .001, decay: .1, sustain: 0, release: .06, clip: .8, lpf: 11000, hpf: 320, effects: { reverb: .08, pan: -.25 } }),
  P('g2', 'Reco-reco', 'rhythm', 'pulse', DRUM('bateria', 'reco-reco'), reco, on(2, 7, 8),
    { ...RHYTHM, octave: 2, gain: .1, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 9000, hpf: 1300, effects: { reverb: .05, pan: .3 } }),
  P('h1', 'Surdo de terceira', 'rhythm', 'pulse', DRUM('bateria', 'surdo-terceira'), terceira, on(...ALL),
    { ...RHYTHM, octave: 2, gain: .3, attack: .001, decay: .4, sustain: 0, release: .2, clip: 1, lpf: 4000, hpf: 40, effects: { reverb: .06, pan: .1 } }),
  P('h2', 'Tamborim · virada', 'rhythm', 'pulse', DRUM('bateria', 'tamborim-abafado'), virada, on(0, 1, 2, 4, 5, 6, 7),
    { ...RHYTHM, octave: 2, gain: .26, attack: .001, decay: .1, sustain: 0, release: .06, clip: .8, lpf: 11000, hpf: 300, effects: { reverb: .06, pan: -.3 }, fills: { 3: FILL, 8: FILL } }),
]
for (const part of PARTS) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound: the bossa is soft and close, the dobrada opens the room ----------
const SECTION_PARAMS = {
  a1: { 4: { gain: .46, lpfRange: { first: 1800, second: 2200 } }, 6: { gain: .66 } },
  a2: { 4: { gain: .36, lpfRange: { first: 1600, second: 2000 } } },
  h1: { 4: { gain: .2, lpfRange: { first: 2400, second: 2800 } }, 6: { reverbRange: { first: .14, second: .18 } } },
  b1: { 4: { gain: .22, reverbRange: { first: .16, second: .2 } } },
  d1: { 4: { reverbRange: { first: .18, second: .22 } } },
  c1: { 4: { gain: .13, reverbRange: { first: .22, second: .28 } } },
  f1: { 4: { gain: .14, reverbRange: { first: .22, second: .28 } } },
  e1: { 0: { reverbRange: { first: .34, second: .4 } } },
  c2: { 6: { reverbRange: { first: .12, second: .16 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'rio-1984', kitName: 'Samba-enredo', profileName: 'Rio de Janeiro 1984 · Ensaio da Mangueira', meter: '2/4', bpm: 140, root: 'G', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('mng', { refrain: 3, breque: 2, lament: 4, calm: 4, tense: 5, peak: 3, finale: 6 }, { drumsOnly: true }),
  reference: 'Ensaio da bateria da Estação Primeira de Mangueira (surdo de primeira sem surdo de segunda, paradinha, bossa); 1984 é ambientação (inauguração do Sambódromo): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Esta%C3%A7%C3%A3o_Primeira_de_Mangueira',
}).catch(error => { console.error(error); process.exit(1) })
