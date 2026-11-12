// 1910 Rio de Janeiro - Choro da Cidade Nova (original material).
// A regional: the flute sings in running sixteenths, the bandolim plays the counter-line, the cavaquinho
// chops the centre, the seven-string guitar walks the bass and answers each phrase with a baixaria, a salon
// piano comps the maxixe, the trombone of the old choro bands sings below and a clarinet doubles the flute
// a third under it. The pandeiro holds the 2/4 with its thumb, slap and jingles.
// The lines breathe: each phrase swells to its highest note and falls back, the running notes are lighter
// than the beats, long notes sing with vibrato, wide leaps glide, and the timing is a little loose.
// D harmonic minor, so the dominant A7 and the diminished C#°7 that choro loves are in the scale.
// Form (rondó): intro on the dominant · A · B · A · baixaria (soft) · C, a fourth up and agitated (tense) ·
// bandolim solo on A · A with everyone · final.
// Run: node scripts/brazilian/rio-1910.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('2/4', 'Harmônica menor')
const { mel, rep, hits, relative, portamento, feel, tone, swell, vel, set, up } = C

// D harmonic minor degrees: 0 D · 1 E · 2 F · 3 G · 4 A · 5 Bb · 6 C# (7 = D an octave up).
const ROOT = { Dm: 0, A7: 4, Gm: 3, Bb: 5, 'C#o': 6 }
const NAMES = {
  intro: ['A7', 'A7', 'Dm', 'A7'],
  A: ['Dm', 'Dm', 'A7', 'A7', 'Gm', 'Dm', 'A7', 'Dm'],
  B: ['Bb', 'Bb', 'Gm', 'Gm', 'C#o', 'Dm', 'A7', 'Dm'],
  baixaria: ['Dm', 'A7', 'Dm', 'A7', 'Gm', 'Dm', 'A7', 'Dm'],
  C: ['Dm', 'Gm', 'A7', 'Dm', 'Bb', 'Gm', 'A7', 'Dm'],
  outro: ['A7', 'Dm', 'A7', 'Dm'],
}
const roots = names => names.map(name => ROOT[name])
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: roots(NAMES.intro) },
  { label: 'Verse', bars: 16, bank: 1, harmony: roots(NAMES.A) },
  { label: 'Chorus', bars: 16, bank: 2, harmony: roots(NAMES.B) },
  { label: 'Verse', bars: 16, bank: 1, harmony: roots(NAMES.A) },
  { label: 'Interlude', bars: 8, bank: 3, harmony: roots(NAMES.baixaria) },          // soft: the seven-string alone
  { label: 'Bridge', bars: 16, bank: 5, harmony: roots(NAMES.C), transpose: 5 },     // C: G harmonic minor, agitated
  { label: 'Solo', bars: 16, bank: 4, harmony: roots(NAMES.A) },
  { label: 'Verse', bars: 16, bank: 1, harmony: roots(NAMES.A) },
  { label: 'Outro', bars: 4, bank: 6, harmony: roots(NAMES.outro) },
]
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
const NAMES_BY_BANK = { 0: NAMES.intro, 1: NAMES.A, 2: NAMES.B, 3: NAMES.baixaria, 4: NAMES.A, 5: NAMES.C, 6: NAMES.outro }
const bars = bank => FORM.find(s => s.bank === bank).bars
const chordsOf = bank => Array.from({ length: bars(bank) }, (_, i) => NAMES_BY_BANK[bank][i % NAMES_BY_BANK[bank].length])
const H = bank => FORM.find(s => s.bank === bank).harmony

// ---------- melodies: eight sixteenths a bar, '.' holds the note before it ----------
const MEL_A = ['7 6 7 4 2 4 0 2', '4 2 0 -1 0 2 4 7', '6 4 3 1 -1 1 3 4', '6 . 7 6 4 . 3 .',
  '3 5 7 10 9 7 5 3', '9 7 4 2 0 2 4 2', '1 -1 1 3 6 4 3 1', '0 . 4 . 0 . . .']
// The second time round the ornaments change and the cadence leads on.
const MEL_A2 = ['7 6 7 4 2 4 0 2', '4 2 0 -1 0 2 4 7', '6 4 3 1 -1 1 3 4', '6 4 6 7 4 . 3 .',
  '3 5 7 10 9 7 5 3', '9 . 7 4 2 0 2 4', '1 -1 1 3 6 4 3 1', '0 . . . 4 2 1 -1']
const MEL_B = ['5 . 7 9 12 9 7 5', '4 5 7 . 9 . 7 .', '3 5 7 10 . 7 5 3', '2 3 5 . 3 . 2 1',
  '6 8 10 12 10 8 6 3', '4 2 0 2 4 7 9 7', '6 4 3 1 -1 1 3 6', '7 . . . 0 . . .']
const MEL_B2 = ['5 . 7 9 12 . 9 7', '5 4 5 7 9 . 7 .', '3 5 7 10 . 7 5 3', '2 . 5 3 2 . 1 .',
  '6 8 10 12 10 8 6 3', '4 2 0 2 4 7 9 7', '6 4 3 1 -1 1 3 4', '7 . . . . . . .']
const MEL_C = ['7 4 2 4 7 9 7 4', '5 3 0 3 5 7 5 3', '6 4 1 4 6 8 6 4', '7 . 6 7 9 . 7 .',
  '5 7 9 12 9 7 5 2', '3 5 7 10 7 5 3 0', '1 4 6 8 10 8 6 4', '7 . . . 0 . . .',
  '. 7 9 . 11 9 7 .', '. 5 7 . 10 7 5 .', '. 6 8 . 11 8 6 .', '9 7 6 7 9 . 7 .',
  '12 . 9 . 7 . 5 .', '10 . 7 . 5 . 3 .', '6 4 6 8 10 8 6 4', '7 . . . . . . .']
const SOLO = ['4 4 7 7 9 9 7 4', '2 4 7 4 2 0 2 4', '6 6 8 8 6 4 3 1', '4 . 3 . 1 . -1 .',
  '5 5 7 7 10 7 5 3', '4 7 9 11 9 7 4 2', '3 1 -1 1 3 4 6 8', '7 . 7 . 0 . . .',
  '7 . 9 7 4 . 2 .', '4 2 0 2 4 . 7 .', '6 . 8 6 3 . 1 .', '4 3 1 3 4 . 6 .',
  '10 . 9 7 5 . 3 .', '9 . 7 4 2 0 2 4', '6 4 3 1 -1 1 3 6', '7 . . . 0 . . .']
const COUNTER_A = ['. . . . 2 . 4 .', '7 . . . 6 . 4 .', '. . . . 3 . 4 .', '6 . . . 4 . 3 .',
  '. . . . 5 . 7 .', '4 . . . 2 . 0 .', '. . . . 1 . 3 .', '2 . . . . . . .']
const COUNTER_B = ['. . . . 7 . 9 .', '9 . . . 7 . 5 .', '. . . . 5 . 7 .', '5 . . . 3 . 2 .',
  '. . . . 8 . 6 .', '4 . . . 2 . 4 .', '. . . . 3 . 1 .', '4 . . . . . . .']

/** Old-style token bars to notes: a note lasts until the next token that is not '.'; long notes take vibrato. */
function line(rows, { vibratoFrom = 3, gate = .96 } = {}) {
  const text = rows.map(row => {
    const tokens = row.trim().split(/\s+/)
    if (tokens.length !== 8) throw new Error(`bar of ${tokens.length}: ${row}`)
    const out = []
    tokens.forEach((token, i) => {
      if (token === '.') { if (!out.length) out.push({ degree: 'r', length: 1 }); else out[out.length - 1].length++; return }
      out.push({ degree: token, length: 1 })
    })
    return out.map(n => `${n.degree}:${n.length}${n.degree !== 'r' && n.length >= vibratoFrom ? '~' : ''}`).join(' ')
  }).join(' | ')
  return mel(text, { gate })
}
/** Each four-bar phrase swells to its highest note and falls back; the running notes are lighter than the
 * beats; then the hand loosens the time a little. */
function phrase(notes, seed, { low = .5, high = .86, window = 4, jitter = 1 } = {}) {
  const groups = new Map()
  for (const n of notes) { const key = Math.floor(n.start / window + 1e-9); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(n) }
  const shaped = []
  for (const group of groups.values()) {
    const top = Math.max(...group.map(n => n.degree)), bottom = Math.min(...group.map(n => n.degree))
    for (const n of group) {
      const height = top === bottom ? .5 : (n.degree - bottom) / (top - bottom)
      const onBeat = Math.abs((n.start * 2) - Math.round(n.start * 2)) < 1e-6
      shaped.push({ ...n, velocity: (low + (high - low) * (.35 + .65 * height)) * (onBeat ? 1 : .9) })
    }
  }
  return feel(portamento(shaped, 5, .06, 2), { jitter, vel: .04, seed })
}
const sing = (rows, bank, seed, options) => relative(phrase(line(rows), seed, options), H(bank))

// ---------- d1 Flute (queen) ----------
const flute = {
  0: sing(['. . . . . . . .', '. . . . . . . .', '. . . . . . . .', '. . . . 1 3 4 6'], 0, 11),
  1: sing([...MEL_A, ...MEL_A2], 1, 12), 2: sing([...MEL_B, ...MEL_B2], 2, 13),
  5: relative(vel(up(phrase(line(MEL_C), 14), 2), .8), H(5)),
  6: sing(['6 . 7 . 4 . 3 1', '0 . . . . . . .', '1 3 4 6 . . . .', '7 . . . . . . .'], 6, 15),
}
// ---------- h1 Clarinet: a third under the flute in B and the last A; it leads the C ----------
const clarinet = {
  2: relative(vel(up(phrase(line([...MEL_B, ...MEL_B2]), 21), -2), .82), H(2)),
  5: sing(MEL_C, 5, 22, { low: .56, high: .95 }),
  6: relative(vel(up(phrase(line(['6 . 7 . 4 . 3 1', '0 . . . . . . .', '1 3 4 6 . . . .', '7 . . . . . . .']), 23), -2), .8), H(6)),
}
// ---------- b1 Bandolim: the counter-line, the solo ----------
const bandolim = {
  1: sing([...COUNTER_A, ...COUNTER_A], 1, 31, { low: .45, high: .72 }), 2: sing([...COUNTER_B, ...COUNTER_B], 2, 32, { low: .45, high: .72 }),
  4: sing(SOLO, 4, 33, { low: .55, high: .9 }),
  5: relative(vel(phrase(line(MEL_C.map(row => row.split(' ').map((t, i) => i % 2 ? '.' : t).join(' '))), 34), .7), H(5)),
}
// ---------- g1 Trombone: long counter-melody notes below ----------
const TROMBONE_A = ['0 . . . . . . .', '-1 . . . . . . .', '-3 . . . . . . .', '-2 . -3 . -4 . . .', '-4 . . . . . . .', '0 . . . . . . .', '-3 . . . -1 . . .', '0 . . . . . . .']
const trombone = {
  2: sing(['-2 . . . 0 . . .', '2 . . . . . . .', '-4 . . . -2 . . .', '0 . -1 . -2 . -3 .', '-1 . . . 1 . . .', '0 . . . . . . .', '-3 . . . -1 . . .', '0 . . . . . . .'], 2, 41, { low: .5, high: .7 }),
  5: sing(['0 . . . -2 . . .', '-4 . . . . . . .', '-3 . . . -1 . . .', '0 . . . . . . .', '-2 . . . 0 . . .', '-4 . . . -2 . . .', '-3 . -1 . 1 . . .', '0 . . . . . . .'], 5, 42, { low: .55, high: .78 }),
  6: sing(['-3 . . . . . . .', '0 . . . . . . .', '-3 . . . . . . .', '0 . . . . . . .'], 6, 43, { low: .5, high: .7 }),
}
// Late A: the trombone joins the last A.
const tromboneLast = sing([...TROMBONE_A, ...TROMBONE_A], 1, 44, { low: .48, high: .66 })

// ---------- accompaniment (absolute degrees per chord name, D harmonic minor) ----------
const CAVACO = { Dm: [7, 9, 11], A7: [8, 10, 11, 13], Gm: [10, 12, 14], Bb: [9, 12, 14], 'C#o': [8, 10, 12, 13] }
const PIANO = { Dm: [0, 2, 4, 7], A7: [-1, 1, 3, 4], Gm: [-4, -2, 0, 3], Bb: [-2, 0, 2, 5], 'C#o': [-1, 1, 3, 5] }
const NYLON = { Dm: [0, 2, 4], A7: [1, 3, 4, 6], Gm: [3, 5, 7], Bb: [2, 5, 7], 'C#o': [1, 3, 5, 6] }
const BASS = { Dm: [0, -3], A7: [-3, 1], Gm: [-4, 0], Bb: [-2, 2], 'C#o': [-1, 3] }
const BAIXARIA = { Dm: '4 3 2 1 0 -1 -2 -3', A7: '1 0 -1 -2 -3 -4 -5 -4', Gm: '0 -1 -2 -3 -4 -3 -2 -1', Bb: '2 1 0 -1 -2 -1 0 1', 'C#o': '-1 1 3 1 -1 -2 -3 -4' }
const HIT = { X: 1, x: .8, m: .68, o: .58, h: .46, g: .32, ',': .3 }
/** A chord table played on a rhythm of eight sixteenths a bar (several bars cycle). */
function chords(bank, rhythm, table, { length = 1 / 8 * .8, ahead = 0 } = {}) {
  const names = chordsOf(bank).slice(0, 8), rows = rhythm.split('|').map(row => [...row.replace(/\s+/g, '')])
  const notes = []
  names.forEach((name, bar) => rows[bar % rows.length].forEach((c, i) => {
    if (c === '.') return
    const next = ahead && i >= 8 - ahead ? names[(bar + 1) % names.length] : name
    for (const degree of table[next]) notes.push({ start: bar + i / 8, duration: length, degree, velocity: HIT[c], ...(c === ',' ? { chance: .6 } : {}) })
  }))
  return notes
}
const hand = (seed, notes, extra = {}) => feel(notes, { push: [0, 1, 0, -1], jitter: 1, vel: .05, seed, ...extra })
// Accompaniment loops the section's eight-bar harmony (a 16-bar section plays it twice).
const comp = (bank, rhythm, table, seed, options) => C.roll(Math.min(8, bars(bank)), relative(C.strum(hand(seed, chords(bank, rhythm, table, options)), 1 / 128), H(bank)))
/** Percussion loops four bars (or the whole section when shorter). */
const drum = (bank, seed, text) => C.roll(Math.min(4, bars(bank)), hand(seed, hits(text)))

/** Root and fifth, the baixaria every fourth bar (the phrase end). */
function walk(bank, seed, runs = [3]) {
  const names = chordsOf(bank)
  const text = names.map((name, bar) => runs.includes(bar % 4) ? BAIXARIA[name].split(' ').map(d => `${d}:1`).join(' ')
    : `${BASS[name][0]}:3! ${BASS[name][1]}:3 ${BASS[name][0]}:2'`).join(' | ')
  return relative(hand(seed, mel(text, { gate: .85, accent: { strong: .85, beat: .76, off: .66 } })), H(bank))
}
const bordao = {
  0: walk(0, 51, []), 1: walk(1, 52), 2: walk(2, 53), 3: walk(3, 54, [1, 3]), 4: walk(4, 55), 5: walk(5, 56, [1, 3]),
  6: relative(mel("1:3! 1:3 -3:2 | 0:4! r:4 | 1:2 0:2 -1:2 -3:2 | 0:8*"), H(6)),
}
// f1 The seven-string's answers: a baixaria at every phrase end, the whole interlude its solo.
const answer = (bank, seed, everyBars = 4, offset = 3) => {
  const names = chordsOf(bank)
  return relative(phrase(line(names.map((name, bar) => bar % everyBars === offset ? BAIXARIA[name] : '. . . . . . . .')), seed, { low: .55, high: .8 }), H(bank))
}
const baixaria = {
  0: answer(0, 61), 1: answer(1, 62), 2: answer(2, 63),
  3: relative(phrase(line(['4 3 2 1 0 -1 -2 -3', '1 0 -1 -2 -3 -4 -5 -4', '0 2 4 2 0 -1 -3 -1', '1 0 -1 -2 -3 . . .', '0 -1 -2 -3 -4 -3 -2 -1', '4 3 2 1 0 -1 -2 -3', '-3 -2 -1 1 3 . 1 .', '0 . . . . . . .']), 64, { low: .5, high: .76 }), H(3)),
  4: answer(4, 65, 8, 7), 5: answer(5, 66, 4, 3),
}
// d2 Cavaquinho: the centre, chopping; softer than before and with the hand's dynamics.
const cavaco = {
  0: comp(0, 'm.o, m.o,', CAVACO, 71), 1: comp(1, 'm.og .o.o | m.og .o.m', CAVACO, 72, { ahead: 1 }), 2: comp(2, 'm.oo .o.o | m.oo .o.m', CAVACO, 73, { ahead: 1 }),
  3: comp(3, 'o... .... | o... ....', CAVACO, 74), 4: comp(4, 'm.og .o.o', CAVACO, 75), 5: comp(5, 'm.mo .m.m | m.mo .mmm', CAVACO, 76, { ahead: 1 }),
  6: comp(6, 'm.o. m.o. | m... .... | m.o. m.o. | x... ....', CAVACO, 77),
}
// c1 Six-string guitar: chords on the off-beats; g2 the second guitar's batida.
const violao6 = {
  0: comp(0, 'o... o...', NYLON, 81), 1: comp(1, '..o. ..o.', NYLON, 82), 2: comp(2, 'o.o. ..o.', NYLON, 83), 3: comp(3, 'o... ....', NYLON, 84),
  4: comp(4, '..o. ..o.', NYLON, 85), 5: comp(5, 'm.o. ..m.', NYLON, 86), 6: comp(6, 'o... o... | o... .... | o... o... | m... ....', NYLON, 87),
}
const batida = {
  1: comp(1, '.o.. .o.o', NYLON, 91, { length: 1 / 16 }), 2: comp(2, '.o.o .o.o', NYLON, 92, { length: 1 / 16 }),
  4: comp(4, '.o.. .o.o', NYLON, 93, { length: 1 / 16 }), 5: comp(5, '.m.o .m.o', NYLON, 94, { length: 1 / 16 }),
}
// e1 Salon piano: the maxixe's left hand and the right-hand chords.
const piano = {
  0: comp(0, 'o... ....', PIANO, 101, { length: 1 / 4 }), 2: comp(2, '..o. o...', PIANO, 102), 3: comp(3, 'o... ....', PIANO, 103, { length: 1 / 3 }),
  5: comp(5, 'm.om .m.o', PIANO, 104), 6: comp(6, 'o... .... | o... .... | o... .... | m... ....', PIANO, 105, { length: 1 / 2 }),
}

// ---------- pandeiro and friends ----------
const PANDEIRO_GRAVE = { 1: 'x... o..o', 2: 'x... o..o', 4: 'x..o x...', 5: 'x..o x..o', 0: 'x... ....', 3: 'o... ....' }
const grave = Object.fromEntries(Object.entries(PANDEIRO_GRAVE).map(([bank, row]) => [bank, drum(Number(bank), 110 + Number(bank), rep(row, Math.min(4, bars(Number(bank)))))]))
const tapa = {
  1: drum(1, 121, rep('.... ..x. | .... ..m. | ..o. ..x. | .... ..x.', 1)), 2: drum(2, 122, '..o. ..x. | .... ..x. | ..o. ..x. | ..o. ..xo'),
  4: drum(4, 123, rep('.... ..x.', 4)), 5: drum(5, 124, rep('..o. ..x. | ..o. ..xo', 2)),
}
const platinelas = {
  0: drum(0, 131, rep('h.hm h.hm', 4)), 1: drum(1, 132, rep('g,hm g,hm | g,hm gohm', 2)), 2: drum(2, 133, rep('g,hm g,hm | g,hm gohm', 2)),
  3: drum(3, 134, rep('h... h...', 4)), 4: drum(4, 135, rep('g,hm g,hm | g,hm gohm', 2)), 5: drum(5, 136, rep('gohm gohm', 4)),
}
const ganza = { 1: drum(1, 141, rep('g,h, g,ho', 4)), 2: drum(2, 142, rep('g,ho g,ho', 4)), 5: drum(5, 143, rep('gohm gohm', 4)) }
const reco = { 2: drum(2, 151, rep('.... o... | ..o. o.o.', 2)), 5: drum(5, 152, rep('..o. o.o.', 4)), 4: drum(4, 153, rep('.... o...', 4)) }
const rufo = { [FILL]: hand(161, hits('rrrr RRRR')) }

const STRING = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Violão 7 cordas · bordão', 'bass', 'phrase', SAMPLE('guitars', 'nylon'), bordao, on(...ALL),
    { ...STRING, octave: 2, gain: .46, attack: .004, decay: .5, sustain: .3, release: .25, clip: 1, lpf: 2400, hpf: 40, effects: { reverb: .12, pan: -.1 }, design: { role: 'bass' } }),
  P('a2', 'Pandeiro · grave', 'rhythm', 'pulse', DRUM('brasil', 'pandeiro-grave'), grave, on(...ALL),
    { ...STRING, octave: 2, gain: .37, attack: .001, decay: .25, sustain: 0, release: .1, clip: .8, lpf: 3200, hpf: 60, effects: { reverb: .08, pan: 0 }, design: { role: 'drums' } }),
  P('b1', 'Bandolim · contracanto', 'response', 'phrase', SAMPLE('brasil', 'bandolim'), bandolim, on(1, 2, 5, 6),
    { ...STRING, octave: 4, gain: .7, attack: .003, decay: .5, sustain: .2, release: .25, clip: 1, lpf: 5200, hpf: 200, effects: { reverb: .2, pan: .3 } }),
  P('b2', 'Pandeiro · tapa', 'rhythm', 'pulse', DRUM('brasil', 'pandeiro-tapa'), tapa, on(1, 2, 3, 5, 6, 7),
    { ...STRING, octave: 2, gain: .3, attack: .001, decay: .12, sustain: 0, release: .06, clip: .7, lpf: 7000, hpf: 160, effects: { reverb: .08, pan: .05 }, design: { role: 'drums' } }),
  P('c1', 'Violão 6 cordas · harmonia', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), violao6, on(...ALL),
    { ...STRING, octave: 3, gain: .2, attack: .004, decay: .45, sustain: .25, release: .25, clip: 1, lpf: 4500, hpf: 120, effects: { reverb: .16, pan: -.3 } }),
  P('c2', 'Pandeiro · platinelas', 'rhythm', 'pulse', DRUM('percussion', 'tambourine'), platinelas, on(...ALL),
    { ...STRING, octave: 2, gain: 1, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 9000, hpf: 2500, effects: { reverb: .06, pan: .12 }, design: { role: 'drums' } }),
  P('d1', 'Flauta · melodia', 'melody', 'phrase', SAMPLE('classical', 'flute-sustain'), flute, on(0, 1, 2, 3, 5, 7, 8),
    { ...STRING, octave: 4, gain: .72, attack: .025, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 8000, hpf: 250, effects: { reverb: .2, pan: 0 },
      reverbRange: { first: .18, second: .24, frequency: 'section' }, design: { role: 'lead', vibrato: 5, vibratoDepth: .1 } }),
  P('d2', 'Cavaquinho · centro', 'harmony', 'phrase', SAMPLE('brasil', 'cavaquinho'), cavaco, on(...ALL),
    { ...STRING, octave: 3, gain: .2, attack: .002, decay: .25, sustain: .1, release: .1, clip: .9, lpf: 5500, hpf: 300, effects: { reverb: .1, pan: .2 } }),
  P('e1', 'Piano de salão', 'harmony', 'phrase', SAMPLE('band', 'piano'), piano, on(0, 2, 4, 5, 8),
    { ...STRING, octave: 4, gain: .14, attack: .003, decay: .6, sustain: .3, release: .35, clip: 1, lpf: 5000, hpf: 140, effects: { reverb: .2, pan: -.2 } }),
  P('e2', 'Ganzá', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), ganza, on(1, 2, 3, 5, 7),
    { ...STRING, octave: 2, gain: .36, attack: .001, decay: .06, sustain: 0, release: .04, clip: .5, lpf: 9000, hpf: 3000, effects: { reverb: .04, pan: -.25 }, design: { role: 'drums' } }),
  P('f1', 'Violão 7 cordas · baixaria', 'response', 'phrase', SAMPLE('guitars', 'nylon'), baixaria, on(0, 1, 2, 3, 4, 5, 6, 7),
    { ...STRING, octave: 3, gain: .32, attack: .003, decay: .4, sustain: .3, release: .2, clip: 1, lpf: 4200, hpf: 70, effects: { reverb: .14, pan: -.15 } }),
  P('f2', 'Reco-reco', 'rhythm', 'pulse', DRUM('bateria', 'reco-reco'), reco, on(2, 5, 6),
    { ...STRING, octave: 2, gain: .31, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 8000, hpf: 1300, effects: { reverb: .05, pan: .3 }, design: { role: 'drums' } }),
  P('g1', 'Trombone · contraponto', 'response', 'phrase', SAMPLE('sambaReggae', 'trombone'), { ...trombone, 1: tromboneLast }, on(2, 5, 7, 8),
    { ...STRING, octave: 3, gain: .34, attack: .03, decay: .4, sustain: .7, release: .25, clip: 1, lpf: 3400, hpf: 90, effects: { reverb: .22, pan: .25 }, design: { role: 'lead', vibrato: 4.5, vibratoDepth: .06 } }),
  P('g2', 'Violão · batida', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), batida, on(1, 2, 3, 5, 6, 7),
    { ...STRING, octave: 3, gain: .16, attack: .004, decay: .2, sustain: .1, release: .1, clip: .9, lpf: 4200, hpf: 200, effects: { reverb: .1, pan: .35 } }),
  P('h1', 'Clarinete', 'melody', 'phrase', SAMPLE('classical', 'orchestra-clarinet'), clarinet, on(2, 5, 8),
    { ...STRING, octave: 4, gain: .75, attack: .03, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 5000, hpf: 150, effects: { reverb: .22, pan: -.3 }, design: { role: 'lead', vibrato: 4.6, vibratoDepth: .06 } }),
  P('h2', 'Pandeiro · rufo', 'rhythm', 'pulse', DRUM('percussion', 'tambourine', 1), rufo, on(),
    { ...STRING, octave: 2, gain: 1, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 9000, hpf: 2500, effects: { reverb: .1, pan: -.1 }, design: { role: 'drums' } }),
]
// h2 only plays its rolls into the sections.
const rufoPart = PARTS.find(p => p.slot === 'h2')
rufoPart.rolls = { ...Object.fromEntries(FORM.map(s => [s.bank, { bars: 1, notes: [] }])), [FILL]: rufo[FILL] }
rufoPart.fills = { 0: FILL, 2: FILL, 4: FILL, 6: FILL }
rufoPart.sections = FORM.map((_, i) => i in rufoPart.fills || null)
for (const part of PARTS) if (part !== rufoPart) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)
// The trombone joins only the last A (bank 1 is shared by the three As).
PARTS.find(p => p.slot === 'g1').sections = FORM.map((_, i) => [2, 5, 7, 8].includes(i) || null)

// ---------- per-section sound ----------
const SECTION_PARAMS = {
  d1: { 5: { gain: .62 }, 8: { reverbRange: { first: .32, second: .38 } } },
  f1: { 4: { gain: .38, reverbRange: { first: .22, second: .26 } } },
  a1: { 4: { gain: .38 } },
  b1: { 6: { gain: .8, reverbRange: { first: .16, second: .2 } } },
  c2: { 4: { gain: .7 }, 5: { gain: 1 } },
  e1: { 5: { lpfRange: { first: 6000, second: 6500 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'rio-1910', kitName: 'Choro', profileName: 'Rio de Janeiro 1910 · Choro da Cidade Nova', meter: '2/4', bpm: 112, root: 'D', scale: 'Harmônica menor',
  form: FORM, parts: PARTS,
  reactions: reactions('cho', { refrain: 2, breque: 3, lament: 3, calm: 3, tense: 5, peak: 4, finale: 6 }, { lift: 12 }),
  reference: 'Choro carioca do início do século XX (Pixinguinha, Ernesto Nazareth, Chiquinha Gonzaga, Callado; forma rondó A-B-A-C-A): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Choro',
}).catch(error => { console.error(error); process.exit(1) })
