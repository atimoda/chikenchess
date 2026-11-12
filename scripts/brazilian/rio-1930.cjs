// 1930 Rio de Janeiro - Samba do Estácio (original material).
// The new samba of the Estácio sambistas: the surdos split the 2/4 (the marcação muted on the first beat,
// the surdo de primeira open on the second), the tamborim plays teleco-teco, the cuíca talks, pandeiro,
// chocalho and the roda's palmas fill the sixteenths with the samba feel (the second sixteenth a hair late,
// the fourth early) and with hand dynamics. Over it the cavaquinho chops, the seven-string guitar walks with
// its baixarias, the flute states the verse and the roda sings the refrain.
// C major (Kit Harmony): I–vi–ii–V in the verse, a refrain that opens on the IV.
// Form: intro · verse · refrão · roda (soft: violão, pandeiro and a low flute) · verse · partido-alto (tense:
// the roda in A minor, palmas and pandeiro in front, call and response) · cavaquinho solo · refrão · final.
// Run: node scripts/brazilian/rio-1930.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('2/4', 'Maior')
const { mel, rep, hits, relative, feel, tone, line, phrase, named, swell, vel, up } = C

// C major degrees: 0 C · 1 D · 2 E · 3 F · 4 G · 5 A · 6 B (7 = C an octave up).
const ROOT = { C: 0, Am: 5, Dm: 1, G7: 4, F: 3, Em: 2 }
const NAMES = {
  0: ['Dm', 'G7', 'C', 'G7'], 1: ['C', 'Am', 'Dm', 'G7', 'C', 'Am', 'Dm', 'G7'], 2: ['F', 'F', 'C', 'Am', 'Dm', 'G7', 'C', 'C'],
  3: ['C', 'F', 'C', 'G7', 'C', 'Am', 'Dm', 'G7'], 4: ['C', 'Am', 'Dm', 'G7', 'C', 'Am', 'Dm', 'G7'], 5: ['Am', 'Am', 'Em', 'Em', 'Dm', 'Dm', 'G7', 'G7'], 6: ['Dm', 'G7', 'C', 'C'],
}
const H = bank => NAMES[bank].map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: H(0) },
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Interlude', bars: 8, bank: 3, harmony: H(3) },   // roda: soft
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Break', bars: 8, bank: 5, harmony: H(5) },       // partido-alto: tense
  { label: 'Solo', bars: 16, bank: 4, harmony: H(4) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Outro', bars: 4, bank: 6, harmony: H(6) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const barsOf = bank => FORM.find(s => s.bank === bank).bars
const SAMBA = { push: [0, 2, 0, -2], jitter: 1, vel: .05 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...SAMBA, seed, ...extra }))
/** Percussion loops four bars (or the whole section when shorter). */
const drum = (bank, seed, text) => C.roll(Math.min(4, barsOf(bank)), hand(seed, hits(text)))

// ---------- melodies (eight sixteenths a bar, '.' holds) ----------
const MEL_A = ['. 4 . 4 5 . 4 .', '2 . 0 . . 2 4 .', '. 3 . 3 5 . 3 .', '1 . -1 . . 1 3 .',
  '. 4 . 7 . 6 5 4', '5 . 2 . 0 . 2 .', '3 . 1 . 5 . 3 .', '1 . . 2 . . . .']
const MEL_A2 = ['. 4 . 4 5 . 4 .', '2 . 0 . . 2 4 .', '. 3 . 3 5 . 3 .', '1 . -1 . 1 3 5 .',
  '. 4 . 7 . 6 5 4', '5 . 2 . 0 . 2 .', '3 . 1 . 5 . 3 .', '4 . . . 6 5 4 2']
const MEL_B = ['. 5 . 7 . 5 3 .', '0 . 3 . 5 . . .', '. 4 . 7 . 4 2 .', '0 . 2 . 5 . . .',
  '. 3 . 5 . 8 7 5', '6 . 4 . 3 . 1 .', '0 . 2 . 4 . 7 .', '7 . . . . . . .']
const MEL_B2 = ['. 5 . 7 . 5 3 .', '0 . 3 . 5 . . .', '. 4 . 7 . 4 2 .', '0 . 2 . 5 . 4 .',
  '. 3 . 5 . 8 7 5', '6 . 4 . 3 . 1 .', '2 . 4 . 6 . 4 .', '7 . . . . . . .']
const SOLO = ['4 4 . 4 5 4 2 4', '5 5 . 5 7 5 2 0', '3 3 . 3 5 3 1 3', '4 . 3 . 1 . -1 .',
  '7 7 . 7 9 7 4 7', '9 7 5 2 0 2 5 7', '8 . 5 . 3 . 1 .', '4 . 6 . 8 . . .',
  '7 . 7 9 7 . 4 .', '5 7 9 . 7 5 2 .', '3 5 8 . 5 3 1 .', '4 . . 2 4 6 8 .',
  '9 . 7 . 4 . 7 .', '9 7 5 2 0 2 5 7', '8 . 5 . 3 . 1 .', '7 . . . . . . .']
const PARTIDO = ['5 . 5 . 7 . 5 .', '4 . 2 . 0 . . .', '6 . 6 . 4 . 2 .', '6 . . . . . . .',
  '5 . 5 . 3 . 1 .', '5 . 3 . 1 . 0 .', '4 . 6 . 8 . 6 .', '4 . . . . . . .']
const sing = (rows, bank, seed, options) => relative(phrase(line(rows), seed, options), H(bank))

const flute = {
  0: sing(['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . 1 2 3 4'], 0, 11),
  1: sing([...MEL_A, ...MEL_A2], 1, 12),
  2: relative(vel(up(phrase(line([...MEL_B, ...MEL_B2]), 13), 2), .7), H(2)),
  3: relative(vel(up(phrase(line([...MEL_A]), 14, { low: .4, high: .64 }), -7), 1), H(3)),
  6: sing(['1 . 3 . 4 . 6 .', '4 . . . 2 . 1 .', '0 . . . . . . .', '. . . . . . . .'], 6, 15),
}
// g1 The roda's chorus: the refrão, the partido's answers, the end.
const coro = {
  2: sing([...MEL_B, ...MEL_B2], 2, 21, { low: .55, high: .85 }),
  5: sing(PARTIDO, 5, 22, { low: .6, high: .92 }),
  6: sing(['1 . 3 . 4 . 6 .', '4 . . . 2 . 1 .', '0 . . . . . . .', '. . . . . . . .'], 6, 23),
}
// e1 Cavaquinho ponteado: the solo, and answers in the partido.
const ponteado = {
  4: sing(SOLO, 4, 31, { low: .55, high: .9 }),
  5: relative(phrase(line(['. . . . 7 . 9 7', '. . . . 4 . 2 .', '. . . . 6 . 8 6', '. . . . 4 . 2 .', '. . . . 5 . 3 1', '. . . . 3 . 1 .', '. . . . 6 . 8 6', '. 4 6 8 . . . .']), 32, { low: .55, high: .85 }), H(5)),
}

// ---------- accompaniment ----------
const NYLON = { C: [0, 2, 4], Am: [0, 2, 5], Dm: [1, 3, 5], G7: [-1, 1, 3, 4], F: [0, 3, 5], Em: [-1, 2, 4] }
const BASS = { C: [0, -3], Am: [-2, 2], Dm: [1, -2], G7: [-3, 1], F: [-4, 0], Em: [-5, -1] }
const BAIXARIA = { C: '7 6 5 4 3 2 1 0', G7: '4 3 2 1 0 -1 -2 -3', Am: '5 4 3 2 1 0 -1 -2', Dm: '1 2 3 4 5 4 3 2', F: '3 2 1 0 -1 0 1 2', Em: '2 1 0 -1 -2 -1 0 1' }
const loopNames = bank => NAMES[bank].slice(0, Math.min(8, barsOf(bank)))
/** Chords on a rhythm, the section's harmony looping (eight bars at most). */
const comp = (bank, rhythm, seed, options) => C.roll(Math.min(8, barsOf(bank)), relative(C.strum(hand(seed, named(loopNames(bank), rhythm, NYLON, options)), 1 / 128), H(bank)))
function walk(bank, seed, runs = [3]) {
  const names = Array.from({ length: barsOf(bank) }, (_, i) => NAMES[bank][i % NAMES[bank].length])
  const text = names.map((name, bar) => runs.includes(bar % 4) ? BAIXARIA[name].split(' ').map(d => `${Number(d) - 7}:1`).join(' ')
    : `${BASS[name][0]}:3! ${BASS[name][1]}:3 ${BASS[name][0]}:2'`).join(' | ')
  return relative(hand(seed, mel(text, { gate: .85, accent: { strong: .85, beat: .76, off: .66 } })), H(bank))
}
const bordao = {
  0: walk(0, 41, []), 1: walk(1, 42), 2: walk(2, 43), 3: walk(3, 44, [3]), 4: walk(4, 45), 5: walk(5, 46, [1, 3]),
  6: relative(mel("1:3! -2:3 1:2 | -3:3! 1:3 -3:2 | 0:4! r:4 | 0:8*"), H(6)),
}
const batida = { 0: comp(0, 'o... o...', 51), 1: comp(1, '.o.. .o.o', 52, { length: 1 / 12 }), 2: comp(2, '.o.o .o.o', 53, { length: 1 / 12 }), 3: comp(3, 'o..o ..o.', 54, { length: 1 / 6 }),
  4: comp(4, '.o.. .o.o', 55, { length: 1 / 12 }), 5: comp(5, 'm.om .m.o', 56, { length: 1 / 12 }), 6: comp(6, 'o... o... | o... .... | o... o... | m... ....', 57, { length: 1 / 4 }) }
const centro = { 1: comp(1, 'm.og .o.o | m.og .o.m', 61, { ahead: 1 }), 2: comp(2, 'm.oo .o.o | m.oo .o.m', 62, { ahead: 1 }), 4: comp(4, 'o.og .o.o', 63),
  5: comp(5, 'm.mo .m.m | m.mo .mmm', 64, { ahead: 1 }), 6: comp(6, 'm.o. m.o. | m... .... | m.o. m.o. | x... ....', 65) }

// ---------- percussion ----------
const TELECO = 'X.xX .x.X | .x.X x.x.'
const primeira = { 0: drum(0, 71, '........ | ........ | ....X... | ....X..o'), 1: drum(1, 72, '....X... | ....X... | ....X... | ....X..o'), 2: drum(2, 73, '....X... | ....X..o | ....X... | ..o.X..o'),
  4: drum(4, 74, '....X... | ....X... | ....X... | ....X..o'), 5: drum(5, 75, '....X..x | ..x.X... | ....X..x | ..x.X.xx'), 6: drum(6, 76, '....X... | ....X... | X...X... | X.......') }
const marcacao = { 0: drum(0, 81, '........ | ........ | x....... | x.......'), 1: drum(1, 82, 'x....... | x....... | x....... | x.....o.'), 2: drum(2, 83, 'x....... | x....o.. | x....... | x.....o.'),
  4: drum(4, 84, 'x....... | x....... | x....... | x.....o.'), 5: drum(5, 85, 'x..o.... | x..o..o. | x..o.... | x..o.oo.'), 6: drum(6, 86, 'x....... | x....... | x...X... | X.......') }
const tamborim = { 1: drum(1, 91, rep(TELECO, 2)), 2: drum(2, 92, 'X.xX .x.X | .x.X x.xX | X.xX .x.X | .xxX x.xX'), 4: drum(4, 93, rep(TELECO, 2)), 5: drum(5, 94, 'X.X. .X.X | .X.X X.X. | X.X. X.XX | X.XX X...'), 6: drum(6, 95, 'X.xX .x.X | .x.X x.x. | X.X. X.X. | X.......') }
const grave = { 0: drum(0, 101, 'x... .... | x... .... | x... o..o | x... o..o'), 1: drum(1, 102, 'x... o..o'), 2: drum(2, 103, 'x... o..o | x..o o..o'), 3: drum(3, 104, 'o... h..h'),
  4: drum(4, 105, 'x... o..o'), 5: drum(5, 106, 'x..o x..o | x.oo x..o'), 6: drum(6, 107, 'x... o..o | x... o..o | x... x... | x.......') }
const platinelas = { 0: drum(0, 111, 'h.hm h.hm'), 1: drum(1, 112, 'g,hm g,hm | g,hm gohm'), 2: drum(2, 113, 'gohm gohm | gohm gomm'), 3: drum(3, 114, 'g,h, g,ho'),
  4: drum(4, 115, 'g,hm g,hm | g,hm gohm'), 5: drum(5, 116, 'gomX gomX | gomX gmmX'), 6: drum(6, 117, 'gohm gohm | gohm gohm | gohm gohm | m.......') }
const chocalho = { 1: drum(1, 121, 'h,hX h,hx | h,hX hmhX'), 2: drum(2, 122, 'hmhX hmhX'), 4: drum(4, 123, 'h,hX h,hx'), 5: drum(5, 124, 'hmhX hmhX') }
const reco = { 2: drum(2, 131, '..o. x... | ..o. x.o.'), 5: drum(5, 132, '..o. x.o. | ..o. x.ox') }
const cuica = { 1: drum(1, 141, '..o. .o., | ..o. ..oo'), 2: drum(2, 142, '..x. .x.x | .xx. .x.x'), 4: drum(4, 143, '..o. .o., | ..o. ..oo'), 5: drum(5, 144, '..x. .x.x | ..xx .x.x') }
const palmas = { 1: drum(1, 151, '....o... | ....o..,'), 2: drum(2, 152, 'x..x ..x. | x..x ..x.'), 3: drum(3, 153, '....h... | ....h...'), 5: drum(5, 154, '.X.X .X.x | .X.X .XXx'), 6: drum(6, 155, 'x..x ..x. | x..x ..x. | x.x. x.x. | X.......') }
const virada = { [FILL]: hand(161, hits('gmXm XXXX')) }

const STRING = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Violão 7 cordas · bordão', 'bass', 'phrase', SAMPLE('guitars', 'nylon'), bordao, on(...ALL),
    { ...STRING, octave: 3, gain: .44, attack: .004, decay: .5, sustain: .3, release: .25, clip: 1, lpf: 2400, hpf: 40, effects: { reverb: .12, pan: -.1 }, design: { role: 'bass' } }),
  P('a2', 'Surdo de marcação · 1º tempo', 'rhythm', 'pulse', DRUM('bateria', 'surdo-mao'), marcacao, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .38, attack: .001, decay: .3, sustain: 0, release: .15, clip: 1, lpf: 2600, hpf: 30, effects: { reverb: .05, pan: 0 } }),
  P('b1', 'Cuíca', 'response', 'pulse', SAMPLE('brasil', 'cuica-aguda', 0, false), cuica, on(1, 2, 4, 5, 7),
    { ...DRUMS, octave: 2, gain: .16, attack: .002, decay: .2, sustain: 0, release: .1, clip: .9, lpf: 5500, hpf: 250, effects: { reverb: .14, pan: .4 } }),
  P('b2', 'Tamborim · teleco-teco', 'rhythm', 'pulse', DRUM('bateria', 'tamborim'), tamborim, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .1, sustain: 0, release: .06, clip: .8, lpf: 10000, hpf: 320, effects: { reverb: .07, pan: .2 } }),
  P('c1', 'Violão 6 cordas · batida', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), batida, on(...ALL),
    { ...STRING, octave: 3, gain: .18, attack: .004, decay: .3, sustain: .15, release: .15, clip: .9, lpf: 4500, hpf: 150, effects: { reverb: .12, pan: -.3 } }),
  P('c2', 'Pandeiro · platinelas', 'rhythm', 'pulse', DRUM('percussion', 'tambourine'), platinelas, on(...ALL),
    { ...DRUMS, octave: 2, gain: .9, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 9000, hpf: 2500, effects: { reverb: .06, pan: .12 } }),
  P('d1', 'Flauta · melodia', 'melody', 'phrase', SAMPLE('classical', 'flute-sustain'), flute, on(0, 1, 2, 3, 4, 7, 8),
    { ...STRING, octave: 4, gain: .7, attack: .025, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 8000, hpf: 250, effects: { reverb: .2, pan: 0 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .1 } }),
  P('d2', 'Pandeiro · grave', 'rhythm', 'pulse', DRUM('brasil', 'pandeiro-grave'), grave, on(...ALL),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .25, sustain: 0, release: .1, clip: .8, lpf: 3200, hpf: 60, effects: { reverb: .08, pan: 0 } }),
  P('e1', 'Cavaquinho · ponteado', 'melody', 'phrase', SAMPLE('brasil', 'cavaquinho'), ponteado, on(5, 6),
    { ...STRING, octave: 4, gain: .4, attack: .002, decay: .4, sustain: .2, release: .2, clip: 1, lpf: 6000, hpf: 250, effects: { reverb: .16, pan: .25 } }),
  P('e2', 'Chocalho', 'rhythm', 'pulse', DRUM('sambaReggae', 'chocalho'), chocalho, on(1, 2, 4, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .16, attack: .001, decay: .08, sustain: 0, release: .05, clip: .5, lpf: 9000, hpf: 2500, effects: { reverb: .05, pan: -.25 } }),
  P('f1', 'Cavaquinho · centro', 'harmony', 'phrase', SAMPLE('brasil', 'cavaquinho'), centro, on(1, 2, 4, 5, 6, 7, 8),
    { ...STRING, octave: 4, gain: .2, attack: .002, decay: .25, sustain: .1, release: .1, clip: .9, lpf: 5500, hpf: 300, effects: { reverb: .1, pan: .2 } }),
  P('f2', 'Reco-reco', 'rhythm', 'pulse', DRUM('bateria', 'reco-reco'), reco, on(2, 5, 7),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 8000, hpf: 1300, effects: { reverb: .05, pan: .3 } }),
  P('g1', 'Coro da roda', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), coro, on(2, 5, 7, 8),
    { ...STRING, octave: 4, gain: .3, attack: .05, decay: .3, sustain: .8, release: .25, clip: 1, lpf: 5000, hpf: 180, effects: { reverb: .24, pan: -.05 }, design: { role: 'lead', vibrato: 4.5, vibratoDepth: .08 } }),
  P('g2', 'Palmas da roda', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), palmas, on(1, 2, 3, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 7000, hpf: 300, effects: { reverb: .14, pan: -.15 } }),
  P('h1', 'Surdo de primeira · 2º tempo', 'rhythm', 'pulse', DRUM('bateria', 'surdo-primeira'), primeira, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .46, attack: .001, decay: .8, sustain: 0, release: .4, clip: 1, lpf: 3200, hpf: 28, effects: { reverb: .07, pan: 0 } }),
  P('h2', 'Tamborim · virada', 'rhythm', 'pulse', DRUM('bateria', 'tamborim-abafado'), virada, on(),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .1, sustain: 0, release: .06, clip: .8, lpf: 10000, hpf: 300, effects: { reverb: .07, pan: -.3 } }),
]
const viradaPart = PARTS.find(p => p.slot === 'h2')
viradaPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: virada[FILL] }
viradaPart.fills = { 1: FILL, 2: FILL, 4: FILL, 5: FILL, 6: FILL }
viradaPart.sections = FORM.map((_, i) => i in viradaPart.fills || null)
for (const part of PARTS) if (part !== viradaPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

const SECTION_PARAMS = {
  d1: { 3: { reverbRange: { first: .3, second: .34 } }, 8: { reverbRange: { first: .3, second: .36 } } },
  c1: { 3: { gain: .22, reverbRange: { first: .2, second: .24 } } },
  c2: { 3: { gain: .6 } }, d2: { 3: { gain: .26 } },
  g1: { 5: { gain: .34 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'rio-1930', kitName: 'Samba', profileName: 'Rio de Janeiro 1930 · Samba do Estácio', meter: '2/4', bpm: 104, root: 'C', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('est', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Samba do Estácio de 1928–1933 (Ismael Silva, Bide, Marçal, Deixa Falar): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Samba',
}).catch(error => { console.error(error); process.exit(1) })
