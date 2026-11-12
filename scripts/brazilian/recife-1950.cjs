// 1950 Recife - Baião pé de serra (original material).
// The northeastern trio as Luiz Gonzaga shaped it: the sanfona sings the tune and works its bass buttons on
// the baião cell, the zabumba answers it (the maceta on the one and the last sixteenth of the beat, the
// bacalhau whipping the offbeats) and the triangle keeps the sixteenths, choked and open. An aboio, the sung
// cattle call, opens the song, a pífano answers like the bands of Caruaru. Hands are never even: the
// triangle breathes, the zabumba leans, the sanfona phrases.
// G Mixolydian (Kit Harmony): the flat seventh (F) is the sertão's colour.
// Form: aboio · tune A · refrão B · toada (soft: the aboio sung over the sanfona's held chords) · tune A ·
// arrasta-pé (tense: D minor, the bellows pumping, the zabumba rolling) · pífano solo · refrão · final.
// Run: node scripts/brazilian/recife-1950.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('2/4', 'Mixolídia')
const { mel, hits, relative, feel, tone, line, phrase, named, vel, up } = C

// G Mixolydian degrees: 0 G · 1 A · 2 B · 3 C · 4 D · 5 E · 6 F (7 = G an octave up).
const ROOT = { G: 0, C: 3, F: 6, Dm: 4 }
const NAMES = {
  0: ['G', 'G', 'F', 'G'], 1: ['G', 'G', 'C', 'G', 'G', 'G', 'F', 'G'], 2: ['C', 'C', 'G', 'G', 'F', 'F', 'G', 'G'],
  3: ['G', 'C', 'G', 'G', 'F', 'C', 'G', 'G'], 4: ['G', 'F', 'G', 'G', 'C', 'C', 'F', 'G'], 5: ['Dm', 'Dm', 'F', 'F', 'Dm', 'Dm', 'F', 'G'],
  6: ['F', 'F', 'G', 'G'],
}
const H = bank => NAMES[bank].map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: H(0) },
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Interlude', bars: 8, bank: 3, harmony: H(3) },   // toada: soft
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Break', bars: 8, bank: 5, harmony: H(5) },       // arrasta-pé: tense
  { label: 'Solo', bars: 16, bank: 4, harmony: H(4) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Outro', bars: 4, bank: 6, harmony: H(6) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const barsOf = bank => FORM.find(s => s.bank === bank).bars
// Forró feel: the second sixteenth a hair late, the fourth a hair early, and hands with their own dynamics.
const XOTE = { push: [0, 1, 0, -1], jitter: 1, vel: .06 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...XOTE, seed, ...extra }))
const drum = (bank, seed, text) => C.roll(Math.min(4, barsOf(bank)), hand(seed, hits(text)))

// ---------- the sanfona's tune (eight sixteenths a bar, '.' holds) ----------
const TEMA_A = ['4 . 4 . 2 4 . 6', '. 4 . 2 0 . . .', '3 . 3 . 5 3 . 2', '. 0 . 2 4 . . .',
  '7 . 7 . 6 4 . 2', '. 4 . 6 7 . 6 .', '5 . 6 . 5 3 . 1', '. 0 . . 0 . . .']
const TEMA_A2 = ['4 . 4 . 2 4 . 6', '. 4 . 2 0 . . .', '3 . 3 . 5 3 . 2', '. 0 . 2 4 . . .',
  '7 . 7 . 6 4 . 2', '. 4 . 6 7 . 9 .', '8 . 7 . 6 4 . 3', '2 . 1 . 0 . . .']
const TEMA_B = ['7 . 7 . 8 7 . 5', '3 . 5 . 7 . . .', '6 . 6 . 7 6 . 4', '2 . 4 . 6 . . .',
  '5 . 5 . 6 5 . 3', '1 . 3 . 5 . 6 .', '7 6 4 2 4 . 2 1', '0 . . . . . . .']
const TEMA_B2 = ['7 . 7 . 8 7 . 5', '3 . 5 . 7 . . .', '6 . 6 . 7 6 . 4', '2 . 4 . 6 . . .',
  '5 . 5 . 6 5 . 3', '1 . 3 . 5 . 8 .', '7 . 6 . 4 . 6 .', '7 . . . . . . .']
const FOLE = ['1 1 3 1 1 1 3 1', '1 1 3 1 -1 . -2 .', '3 3 5 3 3 3 5 3', '3 3 5 3 1 . -1 .',
  '1 1 3 1 1 1 3 1', '1 1 4 3 1 . -3 .', '3 3 5 3 6 5 3 1', '2 . 4 . 6 . 7 .']
const FINAL = ['6 . 5 . 3 . 1 .', '3 . 5 . 6 . 8 .', '7 . . . . . . .', '. . . . . . . .']
const sing = (rows, bank, seed, options) => relative(phrase(line(rows), seed, options), H(bank))
const third = (rows, bank, seed, options) => relative(vel(up(phrase(line(rows), seed, options), -2), .84), H(bank))

const melodia = {
  1: sing([...TEMA_A, ...TEMA_A2], 1, 11), 2: sing([...TEMA_B, ...TEMA_B2], 2, 12, { low: .58, high: .92 }),
  5: sing(FOLE, 5, 13, { low: .62, high: .95, glide: 0, jitter: 0 }), 6: sing(FINAL, 6, 14),
}
const segunda = { 2: third([...TEMA_B, ...TEMA_B2], 2, 21, { low: .58, high: .9 }), 5: third(FOLE, 5, 22, { low: .55, high: .85, glide: 0, jitter: 0 }), 6: third(FINAL, 6, 23) }

// ---------- aboio and pífano ----------
const ABOIO = ['7 . . . . . 6 .', '4 . . . . . . .', '6 . . . 4 . 2 .', '0 . . . . . . .']
const TOADA = ['4 . . . 2 . 4 .', '5 . . . . . 3 .', '4 . . . . . 2 .', '0 . . . . . . .',
  '6 . . . 5 . 3 .', '5 . . . 3 . . .', '4 . 2 . 1 . 2 .', '0 . . . . . . .']
const aboio = {
  0: relative(phrase(line(ABOIO, { vibratoFrom: 2 }), 31, { low: .45, high: .75, glide: 2, jitter: 2 }), H(0)),
  3: relative(phrase(line(TOADA, { vibratoFrom: 2 }), 32, { low: .42, high: .7, glide: 3, jitter: 2 }), H(3)),
}
const SOLO = ['7 9 7 6 4 . 2 4', '6 . 5 . 3 . 1 .', '2 4 7 . 4 2 4 .', '7 . . . . . 6 7',
  '8 . 7 . 5 . 3 .', '7 . 5 . 3 . 2 .', '3 . 5 . 6 . 8 .', '7 . . . . . . .',
  '9 . 11 . 9 7 . 6', '6 . 8 . 10 . 8 .', '7 6 4 2 4 . 7 .', '9 . . . 7 . . .',
  '10 . 8 . 7 . 5 .', '7 . 8 . 10 . 7 .', '8 6 5 3 1 . 3 .', '7 . . . . . . .']
const REST = '. . . . . . . .'
const pifano = {
  1: sing([REST, REST, REST, '. . . . 4 6 7 .', REST, REST, REST, '. . . . 7 6 4 .'], 1, 41, { low: .45, high: .62, glide: 0 }),
  2: sing([REST, REST, REST, '. . . . 6 7 9 .', REST, REST, REST, '. . . . 9 7 6 .'], 2, 42, { low: .48, high: .66, glide: 0 }),
  3: sing([REST, REST, REST, '. . . . 4 . 2 .', REST, REST, REST, '. . . . . . . .'], 3, 43, { low: .36, high: .5 }),
  4: sing(SOLO, 4, 44, { low: .55, high: .88, glide: 0 }),
  5: sing(['. . . . . . . .', '. . 8 . 8 . 6 .', '. . . . . . . .', '. . 10 . 10 . 8 .', '. . . . . . . .', '. . 8 . 8 . 6 .', '. . . . . . . .', '9 . 10 . 11 . . .'], 5, 45, { low: .7, high: .92, glide: 0 }),
}

// ---------- sanfona's left and right hands ----------
const CHORD = { G: [0, 2, 4], C: [-4, -2, 0], F: [-1, 1, 3], Dm: [-3, -1, 1] }
const BASS = { G: [0, -3], C: [-4, -7], F: [-1, -4], Dm: [-3, -6] }
const loopNames = bank => NAMES[bank].slice(0, Math.min(8, barsOf(bank)))
const comp = (bank, rhythm, seed, options) => C.roll(Math.min(8, barsOf(bank)), relative(C.strum(hand(seed, named(loopNames(bank), rhythm, CHORD, options)), 1 / 128), H(bank)))
/** Bass buttons on the baião cell: root, root again on the fourth sixteenth, the fifth on the second beat's offbeat. */
function baixos(bank, seed, cell = 'baiao') {
  const names = Array.from({ length: Math.min(8, barsOf(bank)) }, (_, i) => NAMES[bank][i % NAMES[bank].length])
  const text = names.map((name, bar) => {
    const [root, fifth] = BASS[name]
    if (cell === 'held') return `${root}:8!`
    if (cell === 'pump') return `${root}:2! ${root}:1 ${root}:1 ${fifth}:2 ${root}:2`
    return bar % 4 === 3 ? `${root}:3! ${root}:3 ${fifth}:1 ${fifth + 1}:1` : `${root}:3! ${root}:3 ${fifth}:2`
  }).join(' | ')
  return C.roll(names.length, relative(hand(seed, mel(text, { gate: .62, accent: { strong: .86, beat: .74, off: .66 } })), H(bank)))
}
const left = { 0: baixos(0, 51, 'held'), 1: baixos(1, 52), 2: baixos(2, 53), 3: baixos(3, 54, 'held'), 4: baixos(4, 55), 5: baixos(5, 56, 'pump'),
  6: relative(mel('-1:3! -1:3 -4:2 | -1:3 -1:3 -4:2 | 0:8! | r:8'), H(6)) }
const right = {
  1: comp(1, '..o. .h.. | ..o. .h.h', 61, { length: 1 / 10 }), 2: comp(2, '..o. .o.h | ..o. .o.o', 62, { length: 1 / 10 }),
  3: comp(3, 'h... .... | g... ....', 63, { length: .95 }), 4: comp(4, '..o. .h..', 64, { length: 1 / 10 }),
  5: comp(5, 'x.x. x.xX | x.x. xXxX', 65, { length: 1 / 12 }), 6: comp(6, '..o. .o.. | ..o. .o.o | X... .... | ........', 66, { length: 1 / 8 }),
}

// ---------- the trio's rhythm ----------
const maceta = {
  0: drum(0, 71, '........ | ........ | ........ | X..x..x.'),
  1: drum(1, 72, 'X..x.... | X..x.... | X..x.... | X..x.xx.'), 2: drum(2, 73, 'X..x..x. | X..x.... | X..x..x. | X..x.xX.'),
  3: drum(3, 74, 'o....... | o....... | o....... | o..h....'), 4: drum(4, 75, 'X..x.... | X..x.... | X..x.... | X..x.xx.'),
  5: drum(5, 76, 'X..xX..x | X..xX.xx | X..xX..x | XxxxXXXX'), 6: drum(6, 77, 'X..x..x. | X..x..x. | X.x.X.x. | X.......'),
}
const resposta = { 1: drum(1, 81, '....o... | ......o. | ....o... | ......o.'), 2: drum(2, 82, '....X... | ......x. | ....X... | ....X.x.'), 4: drum(4, 83, '....o... | ......o.'),
  5: drum(5, 84, '....X... | ....X.x.'), 6: drum(6, 85, '....X... | ....X... | ........ | ........') }
const bacalhau = { 1: drum(1, 91, '..h.o.h. | ..h.o.hh'), 2: drum(2, 92, '..x.x.x. | .xx.x.xx'), 4: drum(4, 93, '..h.o.h. | ..h.o.hh'),
  5: drum(5, 94, '.xx.x.xx | .xx.xxxx'), 6: drum(6, 95, '..x.x.x. | ..x.x.x. | x.x.x.x. | x.......') }
const fechado = { 0: drum(0, 101, '........ | ........ | g,h.g,h. | g,h.g,h.'), 1: drum(1, 102, 'mh.hmh.h | mh.hmh.h | mh.hmh,h | mh.hmhhh'),
  2: drum(2, 103, 'xh.hxh.h | xh.hxh.h'), 3: drum(3, 104, 'g,..g,.. | g,..g,,,'), 4: drum(4, 105, 'mh.hmh.h | mh.hmh,h'),
  5: drum(5, 106, 'xhmhxhmh | xhmhxhxh'), 6: drum(6, 107, 'xh.hxh.h | xh.hxh.h | x.x.x.x. | x.......') }
const aberto = { 1: drum(1, 111, '..o...o.'), 2: drum(2, 112, '..x...x.'), 3: drum(3, 113, '..h.....'), 4: drum(4, 114, '..o...o.'), 5: drum(5, 115, '..X...X.'), 6: drum(6, 116, '..x...x. | ..x...x. | ........ | ........') }
const ganza = { 2: drum(2, 121, 'ghmh ghmh'), 4: drum(4, 122, 'g,h, g,h,'), 5: drum(5, 123, 'ghxh ghxh'), 6: drum(6, 124, 'ghmh ghmh | ghmh ghmh | ghmh ghmh | m.......') }
const pandeiro = { 2: drum(2, 131, 'g..h g..o | g..h gohm'), 4: drum(4, 132, 'g..h g..h'), 5: drum(5, 133, 'gomX gomX | gomX gmmX') }
const palmas = { 2: drum(2, 141, '.... x... | .... x..,'), 5: drum(5, 142, '..x. x.x. | ..x. xxx.'), 6: drum(6, 143, '.... x... | .... x... | x.x. x.x. | X.......') }
const agogo = { 2: drum(2, 151, 'x..h ..h. | x..h ..hh'), 4: drum(4, 152, 'h... ..h.'), 5: drum(5, 153, 'x..x ..x. | x..x .xx.') }
const virada = { [FILL]: hand(161, hits('o.xx XxXX')) }

const KEYS = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Sanfona · baixos', 'bass', 'phrase', SAMPLE('brasil', 'sanfona'), left, on(...ALL),
    { ...KEYS, octave: 3, gain: .6, attack: .01, decay: .25, sustain: .45, release: .08, clip: 1, lpf: 1500, hpf: 40, effects: { reverb: .1, pan: -.05 }, design: { role: 'bass' } }),
  P('a2', 'Zabumba · maceta', 'rhythm', 'pulse', DRUM('brasil', 'zabumba'), maceta, on(...ALL),
    { ...DRUMS, octave: 2, gain: .36, attack: .001, decay: .35, sustain: 0, release: .15, clip: .9, lpf: 3200, hpf: 32, effects: { reverb: .06, pan: 0 } }),
  P('b1', 'Aboio', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), aboio, on(0, 3),
    { ...KEYS, octave: 3, gain: .36, attack: .09, decay: .5, sustain: .8, release: .45, clip: 1, lpf: 4800, hpf: 160, effects: { reverb: .4, pan: .15 }, design: { role: 'lead', vibrato: 4.2, vibratoDepth: .16 } }),
  P('b2', 'Zabumba · bacalhau', 'rhythm', 'pulse', DRUM('brasil', 'bacalhau'), bacalhau, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .34, attack: .001, decay: .08, sustain: 0, release: .05, clip: .6, lpf: 8500, hpf: 300, effects: { reverb: .05, pan: .1 } }),
  P('c1', 'Pífano', 'response', 'phrase', SAMPLE('classical', 'alto-recorder-sustain'), pifano, on(1, 2, 3, 4, 5, 6, 7),
    { ...KEYS, octave: 4, gain: .4, attack: .015, decay: .3, sustain: .75, release: .1, clip: 1, lpf: 9000, hpf: 450, effects: { reverb: .2, pan: .35 }, design: { role: 'lead', vibrato: 5.5, vibratoDepth: .06 } }),
  P('c2', 'Triângulo · fechado', 'rhythm', 'pulse', DRUM('brasil', 'triangulo-fechado'), fechado, on(...ALL),
    { ...DRUMS, octave: 2, gain: .16, attack: .001, decay: .06, sustain: 0, release: .04, clip: .5, lpf: 11000, hpf: 2500, effects: { reverb: .05, pan: -.3 } }),
  P('d1', 'Sanfona · melodia', 'melody', 'phrase', SAMPLE('brasil', 'sanfona'), melodia, on(1, 2, 4, 5, 7, 8),
    { ...KEYS, octave: 4, gain: .4, attack: .018, decay: .3, sustain: .72, release: .09, clip: 1, lpf: 5200, hpf: 200, effects: { reverb: .15, pan: 0 }, design: { role: 'lead', vibrato: 5.6, vibratoDepth: .05 } }),
  P('d2', 'Ganzá', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), ganza, on(2, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .07, sustain: 0, release: .05, clip: .5, lpf: 9000, hpf: 3000, effects: { reverb: .04, pan: .3 } }),
  P('e1', 'Sanfona · acordes', 'harmony', 'phrase', SAMPLE('keys', 'accordion'), right, on(1, 2, 3, 4, 5, 7, 8),
    { ...KEYS, octave: 4, gain: .16, attack: .01, decay: .2, sustain: .4, release: .07, clip: .9, lpf: 4200, hpf: 160, effects: { reverb: .12, pan: -.2 } }),
  P('e2', 'Pandeiro', 'rhythm', 'pulse', DRUM('sambaReggae', 'pandeiro'), pandeiro, on(2, 4, 5, 7),
    { ...DRUMS, octave: 2, gain: .42, attack: .001, decay: .12, sustain: 0, release: .06, clip: .6, lpf: 9000, hpf: 400, effects: { reverb: .06, pan: .2 } }),
  P('f1', 'Triângulo · aberto', 'rhythm', 'pulse', DRUM('brasil', 'triangulo-aberto'), aberto, on(1, 2, 3, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .13, attack: .001, decay: .3, sustain: 0, release: .2, clip: .4, lpf: 12000, hpf: 2500, effects: { reverb: .1, pan: -.35 } }),
  P('f2', 'Palmas', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), palmas, on(2, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 8000, hpf: 400, effects: { reverb: .2, pan: .25 } }),
  P('g1', 'Sanfona · segunda voz', 'response', 'phrase', SAMPLE('brasil', 'sanfona'), segunda, on(2, 5, 7, 8),
    { ...KEYS, octave: 4, gain: .26, attack: .018, decay: .3, sustain: .7, release: .09, clip: 1, lpf: 4600, hpf: 200, effects: { reverb: .15, pan: .2 } }),
  P('g2', 'Agogô', 'rhythm', 'pulse', DRUM('sambaReggae', 'agogo-agudo'), agogo, on(2, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .14, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 9000, hpf: 800, effects: { reverb: .08, pan: -.15 } }),
  P('h1', 'Zabumba · resposta', 'rhythm', 'pulse', DRUM('brasil', 'zabumba'), resposta, on(1, 2, 4, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .4, sustain: 0, release: .2, clip: 1, lpf: 2800, hpf: 32, effects: { reverb: .08, pan: 0 } }),
  P('h2', 'Zabumba · repique', 'rhythm', 'pulse', DRUM('brasil', 'bacalhau'), virada, on(),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .08, sustain: 0, release: .05, clip: .6, lpf: 9000, hpf: 300, effects: { reverb: .06, pan: -.1 } }),
]
const viradaPart = PARTS.find(p => p.slot === 'h2')
viradaPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: virada[FILL] }
viradaPart.fills = { 1: FILL, 2: FILL, 4: FILL, 5: FILL, 6: FILL }
viradaPart.sections = FORM.map((_, i) => i in viradaPart.fills || null)
for (const part of PARTS) if (part !== viradaPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

const SECTION_PARAMS = {
  a1: { 0: { gain: .4 }, 3: { gain: .38, reverbRange: { first: .2, second: .26 } } },
  a2: { 3: { gain: .3 }, 5: { gain: .5 } },
  e1: { 3: { gain: .1, reverbRange: { first: .26, second: .32 } }, 5: { gain: .19 } },
  c2: { 3: { gain: .11 } }, f1: { 3: { gain: .09 } },
  d1: { 5: { gain: .44, lpfRange: { first: 4200, second: 6400 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'recife-1950', kitName: 'Baião', profileName: 'Recife 1950 · Baião pé de serra', meter: '2/4', bpm: 108, root: 'G', scale: 'Mixolídia',
  form: FORM, parts: PARTS,
  reactions: reactions('bai', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Baião pé de serra (Luiz Gonzaga, Humberto Teixeira, Jackson do Pandeiro, bandas de pífanos): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Bai%C3%A3o_(g%C3%AAnero_musical)',
}).catch(error => { console.error(error); process.exit(1) })
