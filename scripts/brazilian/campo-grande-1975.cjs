// 1975 Campo Grande - Chamamé (original material).
// The chamamé that came up the Paraná to Mato Grosso do Sul: a 6/8 that keeps turning into 3/4 (the
// hemiola), the accordion singing in thirds with a second accordion, the violões dragging the third beat
// (the arrastre) before the silence of the downbeat, the double bass on the one, a soft bombo, and the
// sapucay, the long shout that rises and falls, at the ends of the refrain.
// A major (Kit Harmony): I–V7 in the verse, a refrain that opens on the IV.
// Form: intro · theme A · refrain B with the voice · chamamé triste (soft: violin and violão in F# minor) ·
// theme A · chamamé maceta (tense: F# minor, the bellows pumping, palmas and tacos) · accordion solo ·
// refrain · final with the sapucay.
// Run: node scripts/brazilian/campo-grande-1975.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('6/8', 'Maior')
const { mel, hits, relative, feel, tone, line, phrase, named, vel, up } = C

// A major degrees: 0 A · 1 B · 2 C# · 3 D · 4 E · 5 F# · 6 G# (7 = A an octave up).
const ROOT = { A: 0, E7: 4, D: 3, 'F#m': 5, Bm: 1 }
const NAMES = {
  0: ['A', 'E7', 'A', 'A'], 1: ['A', 'A', 'E7', 'E7', 'E7', 'E7', 'A', 'A'], 2: ['D', 'D', 'A', 'A', 'E7', 'E7', 'A', 'A'],
  3: ['F#m', 'D', 'A', 'E7', 'F#m', 'Bm', 'E7', 'A'], 4: ['F#m', 'F#m', 'Bm', 'Bm', 'F#m', 'F#m', 'E7', 'E7'],
  5: ['A', 'D', 'E7', 'A', 'F#m', 'Bm', 'E7', 'A'], 6: ['E7', 'E7', 'A', 'A'],
}
const H = bank => NAMES[bank].map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: H(0) },
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Interlude', bars: 8, bank: 3, harmony: H(3) },   // chamamé triste: soft
  { label: 'Verse', bars: 16, bank: 1, harmony: H(1) },
  { label: 'Break', bars: 8, bank: 4, harmony: H(4) },       // chamamé maceta: tense
  { label: 'Solo', bars: 16, bank: 5, harmony: H(5) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: H(2) },
  { label: 'Outro', bars: 4, bank: 6, harmony: H(6) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const barsOf = bank => FORM.find(s => s.bank === bank).bars
// The arrastre: the third beat of the 3/4 (the fifth eighth) leans a hair late, the sixth pushes into the one.
const ARRASTRE = { push: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, -1, 0], jitter: 1, vel: .06 }
const hand = (seed, notes, extra = {}) => tone(feel(notes, { ...ARRASTRE, seed, ...extra }))
/** Percussion on six eighths a bar, looping four bars (or the section when shorter). */
const drum = (bank, seed, text) => C.roll(Math.min(4, barsOf(bank)), hand(seed, hits(text)))

// ---------- the accordions (six eighths a bar, '.' holds) ----------
const SIX = { steps: 6 }
const TEMA_A = ['. . 4 4 5 4', '2 . . 0 2 4', '6 . 6 . 7 .', '4 . . . . .', '. . 3 3 4 3', '1 . . -1 1 3', '2 . 2 2 1 0', '0 . . . . .']
const TEMA_A2 = ['. . 4 4 5 4', '2 . . 0 2 4', '6 . 6 . 7 .', '4 . . . . .', '. . 6 6 7 6', '4 . . 3 4 6', '7 . 4 . 2 .', '0 . . . . .']
const TEMA_B = ['5 . 5 3 . 5', '7 . . 5 . 3', '4 . 4 2 . 4', '7 . . . . .', '6 . 6 4 . 6', '8 . 7 6 . 4', '2 . 4 . 7 .', '7 . . . . .']
const TEMA_B2 = ['5 . 5 3 . 5', '7 . . 5 . 3', '4 . 4 2 . 4', '7 . . . . .', '6 . 6 4 . 6', '8 . 9 8 . 6', '4 . 2 . 1 .', '0 . . . . .']
const MACETA = ['5 5 7 5 5 7', '5 4 2 . 4 .', '3 3 5 3 3 5', '3 1 0 . 1 .', '5 5 7 5 5 7', '9 . 8 . 7 .', '6 6 4 6 6 4', '6 . . 4 . 6']
const SOLO = ['4 2 4 7 4 2', '5 3 5 7 5 3', '6 4 1 4 6 8', '7 . . 4 . 2', '5 7 9 7 5 4', '3 5 8 7 5 3', '4 6 8 7 6 4', '7 . . . . .',
  '9 7 4 2 4 7', '8 5 3 5 8 10', '8 6 4 6 8 6', '7 . 4 . 2 .', '5 . 4 5 7 9', '8 . 7 5 3 1', '4 . 6 . 8 .', '7 . . . . .']
const INTRO = ['. . . 4 5 6', '7 . 6 4 . 1', '4 . . 2 . 0', '0 . . . . .']
const FINAL = ['6 . 4 . 1 .', '3 . 4 . 6 .', '7 . . . . .', '. . . . . .']
const TRISTE = ['5 . . 4 . 2', '3 . . . . 5', '4 . . 2 . 0', '1 . . . . .', '5 . . 7 . 5', '3 . . 1 . 3', '4 . 3 . 1 .', '2 . . . . .']
const sing = (rows, bank, seed, options) => relative(phrase(line(rows, SIX), seed, { window: 2, ...options }), H(bank))
const third = (rows, bank, seed, options) => relative(vel(up(phrase(line(rows, SIX), seed, { window: 2, ...options }), -2), .82), H(bank))

const acordeona = {
  0: sing(INTRO, 0, 11), 1: sing([...TEMA_A, ...TEMA_A2], 1, 12), 2: sing([...TEMA_B, ...TEMA_B2], 2, 13, { low: .58, high: .9 }),
  4: sing(MACETA, 4, 14, { low: .64, high: .96, glide: 0, jitter: 0 }), 5: sing(SOLO, 5, 15, { low: .55, high: .9, glide: 0 }), 6: sing(FINAL, 6, 16),
}
const tercas = {
  0: third(INTRO, 0, 21), 1: third([...TEMA_A, ...TEMA_A2], 1, 22), 2: third([...TEMA_B, ...TEMA_B2], 2, 23, { low: .58, high: .9 }),
  4: third(MACETA, 4, 24, { low: .6, high: .9, glide: 0, jitter: 0 }), 6: third(FINAL, 6, 25),
}
// g1 The voice sings the refrain an octave under the accordion; f1 the violin takes the chamamé triste.
const voz = { 2: relative(up(phrase(line([...TEMA_B, ...TEMA_B2], SIX), 31, { window: 2, low: .55, high: .85 }), -7), H(2)) }
const violino = { 3: sing(TRISTE, 3, 41, { low: .42, high: .7, glide: 4, jitter: 2 }), 6: sing(['. . . . . .', '. . . . . .', '. . . . . .', '7 . . . . .'], 6, 42, { low: .4, high: .5 }) }
// e1 Violão ponteado: answers in the verse, under the violin in the triste.
const REST = '. . . . . .'
const ponteio = {
  1: sing([REST, REST, REST, '. . . 4 2 1', REST, REST, REST, '. . . 2 4 6'], 1, 51, { low: .45, high: .62, glide: 0 }),
  3: relative(phrase(line(['2 . 0 . -2 .', '0 . -2 . -4 .', '-3 . 0 . 2 .', '1 . -1 . -3 .', '2 . 0 . -2 .', '-2 . 1 . 3 .', '1 . -1 . -3 .', '0 . . . . .'], SIX), 52, { low: .38, high: .56, glide: 0 }), H(3)),
  5: sing([REST, REST, REST, '. . . 7 6 4', REST, REST, REST, '. . . 4 6 7'], 5, 53, { low: .5, high: .66, glide: 0 }),
}
// h1 The sapucay: a long shout that climbs into a high note and falls away.
const sapucay = {
  2: C.roll(8, mel('r:6 | r:6 | r:6 | 11:4^5~ 7:2^-7 | r:6 | r:6 | r:6 | r:6')),
  6: mel('r:6 | r:6 | 11:6^5~ | 9:3^-3 r:3'),
}

// ---------- accompaniment ----------
const RASGUEO = { A: [0, 2, 4], E7: [-1, 1, 3, 4], D: [0, 3, 5], 'F#m': [-2, 0, 2], Bm: [1, 3, 5] }
const BASS = { A: [0, -3], E7: [-3, -6], D: [-4, 0], 'F#m': [-2, -5], Bm: [-6, -2] }
const loopNames = bank => NAMES[bank].slice(0, Math.min(8, barsOf(bank)))
const comp = (bank, rhythm, seed, options) => C.roll(Math.min(8, barsOf(bank)), relative(C.strum(hand(seed, named(loopNames(bank), rhythm, RASGUEO, { steps: 6, ...options })), 1 / 192), H(bank)))
/** Double bass: the one, the fifth on the third beat of the 3/4, and every fourth bar a step into the next chord. */
function contrabaixo(bank, seed, cell = 'one') {
  const names = Array.from({ length: Math.min(8, barsOf(bank)) }, (_, i) => NAMES[bank][i % NAMES[bank].length])
  const text = names.map((name, bar) => {
    const [root, fifth] = BASS[name]
    if (cell === 'held') return `${root}:6!`
    if (cell === 'pump') return `${root}:2! ${root}:2 ${fifth}:2`
    return bar % 4 === 3 ? `${root}:3! ${fifth}:2 ${fifth + 1}:1` : `${root}:4! ${fifth}:2`
  }).join(' | ')
  return C.roll(names.length, relative(hand(seed, mel(text, { gate: .7, accent: { strong: .86, beat: .74, off: .66 } })), H(bank)))
}
const baixo = { 0: contrabaixo(0, 61, 'held'), 1: contrabaixo(1, 62), 2: contrabaixo(2, 63), 3: contrabaixo(3, 64, 'held'), 4: contrabaixo(4, 65, 'pump'), 5: contrabaixo(5, 66),
  6: relative(mel('-3:4! -6:2 | -3:4 -2:1 -1:1 | 0:6! | r:6'), H(6)) }
// The violões: rest on the one, strokes on the second and third beats, the arrastre accented into the next bar.
const rasgueo = {
  0: comp(0, 'h..... | h..... | h..... | ......', 71, { length: .45 }),
  1: comp(1, '..o.ox | ..o.o.', 72, { length: 1 / 8 }), 2: comp(2, '..x.xX | ..x.x. | ..x.xX | .xx.x.', 73, { length: 1 / 8 }),
  3: comp(3, 'h..... | ..g...', 74, { length: .45 }), 4: comp(4, 'x.xX.x | x.xX.X', 75, { length: 1 / 10 }),
  5: comp(5, '..o.ox | ..o.o.', 76, { length: 1 / 8 }), 6: comp(6, '..o.ox | ..o.ox | X..... | ......', 77, { length: 1 / 4 }),
}

// ---------- percussion ----------
const bombo = { 1: drum(1, 81, 'o..... | o..... | o..... | o...h.'), 2: drum(2, 82, 'X..... | X...o. | X..... | X..o.o'), 4: drum(4, 83, 'X..x.. | X..xX. | X..x.. | X.xX.X'),
  5: drum(5, 84, 'o..... | o...h.'), 6: drum(6, 85, 'X..... | X..... | X.x.X. | X.....') }
const golpe = { 1: drum(1, 91, '..h.h. | ..h.ho'), 2: drum(2, 92, '..o.o. | ..o.ox'), 4: drum(4, 93, '..x.xX | ..x.xX'), 5: drum(5, 94, '..h.h.'), 6: drum(6, 95, '..o.o. | ..o.o. | x.x.x. | x.....') }
const chocalho = { 1: drum(1, 101, 'mhohoh | mhohoh'), 2: drum(2, 102, 'xhohoh | xhohom'), 4: drum(4, 103, 'xhxhxh'), 5: drum(5, 104, 'mhohoh'), 6: drum(6, 105, 'xhohoh | xhohoh | x.x.x. | m.....') }
const palmas = { 2: drum(2, 111, '..x.x. | ..x.xx'), 4: drum(4, 112, 'x.xX.x | x.xX.X'), 6: drum(6, 113, '..x.x. | ..x.x. | X.X.X. | X.....') }
const tacos = { 4: C.roll(4, hand(121, hits('o.ooxo.oxo.o | o.ooxo.oxoxx | o.ooxo.oxo.o | xoxoxoxoXXXX', { unit: 1 / 12 }))), 6: drum(6, 122, '...... | ...... | x.x.x. | X.....') }
const pandeireta = { 2: drum(2, 131, '.h.h.h | .h.h.o'), 5: drum(5, 132, '.h.h.h') }
const caixa = { 4: C.roll(4, hand(141, hits('...h.. ...h.. | ...h.. ..hhoo | ...h.. ...h.. | ..hhoo xxxxXX', { unit: 1 / 12 }))) }
const virada = { [FILL]: hand(151, hits('o.oxxx xxXXXX', { unit: 1 / 12 })) }

const KEYS = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Contrabaixo', 'bass', 'phrase', SAMPLE('classical', 'concert-bass-pizz'), baixo, on(...ALL),
    { ...KEYS, octave: 2, gain: 1, attack: .004, decay: .4, sustain: .45, release: .2, clip: 1, lpf: 3000, hpf: 30, effects: { reverb: .12, pan: 0 }, design: { role: 'bass' } }),
  P('a2', 'Bombo', 'rhythm', 'pulse', DRUM('classical', 'concert-bass-drum'), bombo, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .4, attack: .001, decay: .4, sustain: 0, release: .2, clip: .8, lpf: 1800, hpf: 35, effects: { reverb: .1, pan: 0 } }),
  P('b1', 'Acordeona', 'melody', 'phrase', SAMPLE('keys', 'accordion'), acordeona, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...KEYS, octave: 4, gain: .22, attack: .014, decay: .3, sustain: .75, release: .12, clip: 1, lpf: 6000, hpf: 160, effects: { reverb: .16, pan: -.06 }, design: { role: 'lead', vibrato: 5.8, vibratoDepth: .05 } }),
  P('b2', 'Golpe no violão', 'rhythm', 'pulse', DRUM('percussion', 'muted-conga'), golpe, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 4000, hpf: 120, effects: { reverb: .1, pan: -.2 } }),
  P('c1', 'Violão · rasgueo', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), rasgueo, on(...ALL),
    { ...KEYS, octave: 3, gain: .26, attack: .003, decay: .35, sustain: .25, release: .18, clip: .9, lpf: 4800, hpf: 110, effects: { reverb: .14, pan: -.3 } }),
  P('c2', 'Chocalho', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), chocalho, on(1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .07, sustain: 0, release: .05, clip: .5, lpf: 9000, hpf: 3000, effects: { reverb: .05, pan: .3 } }),
  P('d1', 'Acordeona · terças', 'harmony', 'phrase', SAMPLE('brasil', 'sanfona'), tercas, on(0, 1, 2, 4, 5, 7, 8),
    { ...KEYS, octave: 4, gain: .2, attack: .016, decay: .3, sustain: .72, release: .12, clip: 1, lpf: 4800, hpf: 180, effects: { reverb: .16, pan: .14 } }),
  P('d2', 'Palmas', 'rhythm', 'pulse', DRUM('brasil', 'palmas'), palmas, on(2, 5, 7, 8),
    { ...DRUMS, octave: 2, gain: .24, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 8000, hpf: 380, effects: { reverb: .2, pan: .22 } }),
  P('e1', 'Violão · ponteio', 'response', 'phrase', SAMPLE('guitars', 'nylon'), ponteio, on(1, 3, 4, 6),
    { ...KEYS, octave: 4, gain: .45, attack: .003, decay: .5, sustain: .3, release: .25, clip: 1, lpf: 5500, hpf: 140, effects: { reverb: .18, pan: .3 } }),
  P('e2', 'Tacos · sapateio', 'rhythm', 'pulse', DRUM('drums', 'wood-rim'), tacos, on(5, 8),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .08, sustain: 0, release: .05, clip: .4, lpf: 6000, hpf: 300, effects: { reverb: .1, pan: -.25 } }),
  P('f1', 'Violino', 'melody', 'phrase', SAMPLE('classical', 'violin-sustain'), violino, on(3, 8),
    { ...KEYS, octave: 4, gain: .55, attack: .08, decay: .4, sustain: .85, release: .35, clip: 1, lpf: 8000, hpf: 200, effects: { reverb: .3, pan: .1 }, design: { role: 'lead', vibrato: 5.2, vibratoDepth: .12 } }),
  P('f2', 'Pandeireta', 'rhythm', 'pulse', DRUM('percussion', 'tambourine'), pandeireta, on(2, 6, 7),
    { ...DRUMS, octave: 2, gain: .7, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 9000, hpf: 2500, effects: { reverb: .06, pan: .35 } }),
  P('g1', 'Voz', 'melody', 'sustain', SAMPLE('brasil', 'coro-laia'), voz, on(2, 7),
    { ...KEYS, octave: 4, gain: .34, attack: .05, decay: .35, sustain: .8, release: .25, clip: 1, lpf: 5000, hpf: 160, effects: { reverb: .24, pan: -.12 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .1 } }),
  P('g2', 'Caixa leve', 'rhythm', 'pulse', DRUM('percussion', 'ghost-snare'), caixa, on(5),
    { ...DRUMS, octave: 2, gain: .2, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 7000, hpf: 250, effects: { reverb: .12, pan: .15 } }),
  P('h1', 'Sapucay', 'texture', 'sustain', SAMPLE('brasil', 'coro-laia'), sapucay, on(2, 7, 8),
    { ...KEYS, octave: 4, gain: .36, attack: .06, decay: .5, sustain: .7, release: .5, clip: 1, lpf: 6500, hpf: 220, effects: { reverb: .4, delay: .12, pan: .2 } }),
  P('h2', 'Bombo · virada', 'rhythm', 'pulse', DRUM('percussion', 'tom'), virada, on(),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .2, sustain: 0, release: .1, clip: .7, lpf: 4000, hpf: 60, effects: { reverb: .1, pan: -.1 } }),
]
const viradaPart = PARTS.find(p => p.slot === 'h2')
viradaPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: virada[FILL] }
viradaPart.fills = { 1: FILL, 2: FILL, 4: FILL, 5: FILL, 6: FILL }
viradaPart.sections = FORM.map((_, i) => i in viradaPart.fills || null)
for (const part of PARTS) if (part !== viradaPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

const SECTION_PARAMS = {
  a1: { 3: { gain: .8 } }, c1: { 3: { gain: .26, reverbRange: { first: .22, second: .28 } } },
  b1: { 5: { gain: .26, lpfRange: { first: 4800, second: 7000 } } }, d1: { 5: { gain: .23 } },
  e1: { 3: { reverbRange: { first: .26, second: .32 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'campo-grande-1975', kitName: 'Chamamé', profileName: 'Campo Grande 1975 · Chamamé', meter: '6/8', bpm: 84, root: 'A', scale: 'Maior',
  form: FORM, parts: PARTS,
  reactions: reactions('cha', { refrain: 2, breque: 4, lament: 3, calm: 3, tense: 4, peak: 2, finale: 6 }),
  reference: 'Chamamé do Mato Grosso do Sul e do litoral argentino (Tião Carreiro e Pardinho em versões de rasqueado, Délio e Delinha, Mario del Tránsito Cocomarola): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Chamam%C3%A9',
}).catch(error => { console.error(error); process.exit(1) })
