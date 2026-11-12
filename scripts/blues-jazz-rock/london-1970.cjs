// 1970 London - Piano pop. Original ballad in E-flat in the spirit of the London singer-songwriter
// records of 1970 (Elton John's piano with Paul Buckmaster's string arrangements, the Trident and
// Olympic studio sound): the piano alone at first, its right hand singing the tune over rolling
// eighths and a descending bass line, the bass and the drums at the first chorus, an acoustic guitar,
// a cello and a French horn as countermelodies, a bridge for the violins with a timpani roll, and a
// final chorus for the whole orchestra. Run: node scripts/blues-jazz-rock/london-1970.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords } = require('./common.cjs')
const C = composer('4/4', 'Chromatic')
const { mel, rep, hits, relative, human, set, up, strum } = C
const KEY = 'Eb'

// One chord per bar; the bass line (semitones above E-flat, in the bass register) moves under it.
const INTRO = ['Eb', 'Ab', 'Eb', 'Bb7sus4'], INTRO_BASS = [0, -7, 0, -5]
const VERSE = ['Eb', 'Bb', 'Cm', 'Gm', 'Ab', 'Eb', 'Fm7', 'Bb7sus4'], VERSE_BASS = [0, -1, -3, -5, -7, -8, -10, -5]
const CHORUS = ['Ab', 'Bb', 'Gm7', 'Cm7', 'Fm7', 'Bb7', 'Eb', 'Eb'], CHORUS_BASS = [-7, -5, -8, -3, -10, -5, 0, 0]
const BRIDGE = ['Cm', 'Gm', 'Ab', 'Eb', 'Fm7', 'Gm7', 'Abmaj7', 'Bb7sus4'], BRIDGE_BASS = [-3, -5, -7, -8, -10, -8, -7, -5]
const OUTRO = ['Eb', 'Abmaj7', 'Bb7sus4', 'Eb'], OUTRO_BASS = [0, -7, -5, 0]
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(INTRO) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },     // piano alone
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },   // bass, drums and strings come in
  { label: 'Verse', bars: 8, bank: 3, harmony: R(VERSE) },     // guitar and cello
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },
  { label: 'Bridge', bars: 8, bank: 4, harmony: R(BRIDGE) },   // the violins sing
  { label: 'Chorus', bars: 8, bank: 5, harmony: R(CHORUS) },   // the whole orchestra
  { label: 'Outro', bars: 4, bank: 6, harmony: R(OUTRO) },
]
const CHORDS = [INTRO, VERSE, CHORUS, VERSE, BRIDGE, CHORUS, OUTRO]
const BASSES = [INTRO_BASS, VERSE_BASS, CHORUS_BASS, VERSE_BASS, BRIDGE_BASS, CHORUS_BASS, OUTRO_BASS]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))

// ---------- b1 Piano right hand: the tune (semitones above E-flat 4) ----------
const TUNE = {
  intro: '12:4~ 9:2 7:2 | 9:3 7:1 5:4~ | 7:4~ 4:2 2:2 | 2:8~',
  verse: 'r:2 7:1 7:1 9:2 7:2 | 5:3 4:1 2:4~ | r:2 4:1 4:1 7:2 4:2 | 2:3 0:1 -1:4~ | r:2 0:1 0:1 5:2 9:2 | 7:3 9:1 7:2 4:2 | 5:2 4:2 2:2 0:2 | 2:6~ r:2',
  chorus: '12:4~ 9:2 7:2 | 11:3 9:1 7:4~ | 7:2 4:2 7:2 11:2 | 12:6~ 11:1 9:1 | 9:3 7:1 5:2 4:2 | 5:4~ 2:4 | 4:3 2:1 0:4~ | r:4 7:2 9:2',
  bridge: '9:4~ 12:2 16:2 | 14:6~ 11:2 | 12:4~ 9:2 5:2 | 7:8~ | 9:4~ 12:2 17:2 | 19:4~ 16:2 14:2 | 12:3 17:1 16:2 12:2 | 14:8~',
}
const ACCENT = { accent: { strong: .8, beat: .72, off: .64 } }
const tune = (text, seed) => human(mel(text, ACCENT), .05, 0, seed)
// The pianist doubles the tune in octaves for the last chorus.
const octaves = notes => [...notes, ...set(up(notes, -12), { velocity: .6 })]
const melody = {
  0: relative(tune(TUNE.intro, 1), H(0)), 1: relative(tune(TUNE.verse, 2), H(1)), 2: relative(tune(TUNE.chorus, 3), H(2)),
  3: relative(tune(TUNE.verse, 4), H(3)), 5: relative(octaves(tune(TUNE.chorus, 5)), H(5)),
  6: relative(mel('12:4~ 9:2 7:2 | 9:3 7:1 5:4~ | 7:4~ 5:2 2:2 | 0:8*', ACCENT), H(6)),
}

// ---------- c1 Piano accompaniment: bass note and rolling eighths ----------
const ROLL = [0, 1, 2, 1, 0, 1, 2, 1]
function rolling(list, bass, bank) {
  const voices = voiceLead(list, KEY, { center: 5, size: 3 })
  return voices.flatMap((v, bar) => {
    const sorted = [...v].sort((a, b) => a - b)
    if (bank === 6 && bar === 3) return [...sorted, bass[bar]].map(degree => ({ start: bar, duration: 1, degree, velocity: .62, release: 1.4, reverb: .4 }))
    const low = [{ start: bar, duration: .45, degree: bass[bar], velocity: .66 }, { start: bar + .5, duration: .45, degree: bass[bar] + 7 > 0 ? bass[bar] - 5 : bass[bar] + 7, velocity: .52 }]
    return [...low, ...ROLL.map((i, k) => ({ start: bar + k / 8, duration: .2, degree: sorted[i], velocity: k % 4 === 0 ? .56 : .44 }))]
  })
}
const accompaniment = each((list, bank) => relative(human(rolling(list, BASSES[bank], bank), .06, 0, bank + 11), H(bank)))

// ---------- a1 Bass guitar: from the first chorus on ----------
const bassRolls = each((list, bank) => {
  if (bank < 2) return null
  const line = BASSES[bank]
  if (bank === 6) return relative(mel(`${line[0]}:8 | ${line[1]}:8 | ${line[2]}:8 | ${line[3]}:8*`), H(6))
  return relative(human(mel(line.map(b => bank === 4 ? `${b}:8` : `${b}:4 ${b}:2 ${b + 7}:2`).join(' | ')), .05, 0, bank + 21), H(bank))
})

// ---------- d1 Strings, h1 Violins, e1 Cello, g1 French horn ----------
const pad = (list, center, rhythm = [[0, 4, .6]]) => onChords(C, voiceLead(list, KEY, { center, size: 3 }), rhythm, { gate: .98 })
const line = (list, center, rhythm) => onChords(C, voiceLead(list, KEY, { center, size: 1 }), rhythm, { gate: .98 })
const strings = { 2: relative(pad(CHORUS, 9), H(2)), 4: relative(pad(BRIDGE, 5, [[0, 4, .5]]), H(4)), 5: relative(pad(CHORUS, 12, [[0, 4, .7]]), H(5)),
  6: relative(pad(OUTRO, 9, [[0, 4, .5, { release: 1.4, reverb: .45 }]]), H(6)) }
const violins = { 4: relative(human(mel(TUNE.bridge, ACCENT), .04, 0, 31), H(4)), 5: relative(set(up(mel(TUNE.chorus, ACCENT), 12), { velocity: .66 }), H(5)) }
const cello = {
  3: relative(line(VERSE, 2, [[0, 2, .58], [2, 2, .54]]), H(3)),
  4: relative(line(BRIDGE, 2, [[0, 4, .58]]), H(4)),
  5: relative(line(CHORUS, 2, [[0, 2, .6], [2, 2, .58]]), H(5)),
}
const horn = {
  2: relative(line(CHORUS, -2, bar => bar % 2 ? [[2, 2, .56]] : [[0, 3, .6]]), H(2)),
  5: relative(line(CHORUS, -2, [[0, 2.5, .64], [3, 1, .58]]), H(5)),
}

// ---------- f1 Acoustic guitar: strummed eighths in the second verse and the choruses ----------
const STRUM = [[0, .5, .66], [1, .5, .46], [1.5, .5, .52], [2.5, .5, .48], [3, .5, .6], [3.5, .5, .46]]
const guitarRolls = Object.fromEntries([[2, CHORUS], [3, VERSE], [5, CHORUS]].map(([bank, list]) =>
  [bank, relative(human(strum(onChords(C, voiceLead(list, KEY, { center: 2, size: 4 }), STRUM, { gate: .85 })), .07, 0, bank + 41), H(bank))]))

// ---------- drums (1970: a deep tom-tom sound, loose and in the room) ----------
const bars = bank => FORM.find(s => s.bank === bank).bars
const kick = { 2: hits(rep('x...x.x.', 8)), 3: hits(rep('o...o...', 8)), 4: hits(rep('o.......', 8)), 5: hits(rep('x...x.x.', 8)), 6: hits('o....... | ........ | ........ | ........') }
const snare = { 2: hits(rep('..x...x.', 7) + ' | ..x.....'), 3: hits(rep('..o...o.', 8)), 5: hits(rep('..x...x.', 7) + ' | ..x.....'), 6: hits('..o..... | ........ | ........ | ........') }
const hat = { 2: hits(rep('xgxgxgxg', 8)), 3: hits(rep('xgxgxgxg', 8)), 5: hits(rep('xgxgxgxg', 8)) }
const toms = { 2: hits(rep('........', 7) + ' | ....xxRR'), 4: hits(rep('........', 7) + ' | ......xx'), 5: hits(rep('........', 7) + ' | ....XxRR') }
const tambourine = { 5: hits(rep('..x...x.', 8)) }
const shaker = { 5: hits(rep('xgxgxgxg', 8)), 3: hits(rep('.g.g.g.g', 8)) }
const swell = { 4: hits(rep('........', 7) + ' | X.......'), 5: hits('X.......'), 6: hits('........ | ........ | ........ | X.......') }
const timpani = { 4: hits(rep('........', 7) + ' | RRRRRRRR'), 5: hits('X.......'), 6: hits('........ | ........ | ........ | X.......') }

const PARTS = present([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('guitars', 'bass', 0), bassRolls, on(...ALL),
    { octave: 2, gain: .26, attack: .005, decay: .5, sustain: .55, release: .18, clip: 1, lpf: 1800, hpf: 30, effects: { reverb: .08 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), kick, on(...ALL),
    { ...DRUM, gain: .08, decay: .35, release: .12, clip: .8, lpf: 2200, hpf: 30, effects: { reverb: .14 } }),
  P('b1', 'Piano', 'melody', 'phrase', SAMPLE('band', 'piano', 1), melody, on(0, 1, 2, 3, 4, 6, 7),
    { octave: 4, gain: .07, attack: .002, decay: .8, sustain: .4, release: .4, clip: .95, lpf: 8000, hpf: 120, effects: { reverb: .22, pan: .05 }, mapping: FIXED }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 0, false), snare, on(...ALL),
    { ...DRUM, gain: .05, decay: .22, release: .12, clip: .7, lpf: 6000, hpf: 150, effects: { reverb: .3 } }),
  P('c1', 'Piano accompaniment', 'harmony', 'phrase', SAMPLE('band', 'piano', 0), accompaniment, on(...ALL),
    { octave: 3, gain: .05, attack: .002, decay: .7, sustain: .35, release: .35, clip: .95, lpf: 6000, hpf: 50, effects: { reverb: .2, pan: -.05 }, mapping: FIXED }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 0, false), hat, on(2, 3, 4, 6),
    { ...DRUM, gain: .025, decay: .07, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .1, pan: .3 } }),
  P('d1', 'Strings', 'harmony', 'sustain', SAMPLE('classical', 'violin-sustain', 0), strings, on(2, 4, 5, 6, 7),
    { octave: 4, gain: .04, attack: .35, decay: .5, sustain: .9, release: .7, clip: 1, lpf: 6500, hpf: 200, effects: { reverb: .3, pan: -.3 }, mapping: FIXED }),
  P('d2', 'Tambourine', 'rhythm', 'pulse', SAMPLE('percussion', 'tambourine', 0, false), tambourine, on(6),
    { ...DRUM, gain: .03, decay: .15, release: .08, clip: .5, lpf: 9000, hpf: 1500, effects: { reverb: .16, pan: -.35 } }),
  P('e1', 'Cello', 'response', 'sustain', SAMPLE('classical', 'cello-sustain', 0), cello, on(3, 5, 6),
    { octave: 3, gain: .055, attack: .2, decay: .5, sustain: .9, release: .5, clip: 1, lpf: 4500, hpf: 60, effects: { reverb: .26, pan: .3 }, mapping: FIXED, design: { vibrato: 5.2, vibratoDepth: .12 } }),
  P('e2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 0, false), toms, on(2, 4, 5, 6),
    { ...DRUM, gain: .07, decay: .5, release: .25, clip: .9, lpf: 4000, hpf: 40, effects: { reverb: .3 } }),
  P('f1', 'Acoustic guitar', 'harmony', 'phrase', SAMPLE('guitars', 'nylon', 0), guitarRolls, on(2, 3, 4, 6),
    { octave: 3, gain: .04, attack: .002, decay: .4, sustain: .3, release: .2, clip: .9, lpf: 7000, hpf: 180, effects: { reverb: .16, pan: .4 }, mapping: FIXED }),
  P('f2', 'Cymbal swell', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), swell, on(5, 6, 7),
    { ...DRUM, gain: .03, attack: .1, decay: 1, release: .5, clip: 1, lpf: 8000, hpf: 400, effects: { reverb: .25, pan: .2 } }),
  P('g1', 'French horn', 'response', 'sustain', SAMPLE('classical', 'horn-sustain', 0), horn, on(2, 4, 6),
    { octave: 3, gain: .05, attack: .12, decay: .5, sustain: .85, release: .5, clip: 1, lpf: 3500, hpf: 70, effects: { reverb: .3, pan: .2 }, mapping: FIXED }),
  P('g2', 'Shaker', 'rhythm', 'pulse', SAMPLE('percussion', 'shaker', 0, false), shaker, on(3, 6),
    { ...DRUM, gain: .02, decay: .08, release: .05, clip: .4, lpf: 9000, hpf: 2000, effects: { reverb: .1, pan: .35 } }),
  P('h1', 'Violins', 'melody', 'sustain', SAMPLE('classical', 'violin-sustain', 1), violins, on(5, 6),
    { octave: 4, gain: .05, attack: .12, decay: .5, sustain: .9, release: .5, clip: 1, lpf: 7000, hpf: 220, effects: { reverb: .3, pan: -.15 }, mapping: FIXED, design: { role: 'lead', vibrato: 5.8, vibratoDepth: .16 } }),
  P('h2', 'Timpani', 'rhythm', 'pulse', SAMPLE('classical', 'timpani-low', 0, false), timpani, on(5, 6, 7),
    { ...DRUM, gain: .06, decay: .8, release: .4, clip: 1, lpf: 3000, hpf: 40, effects: { reverb: .3 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 6: { gain: .075 } },
  c1: { 1: { gain: .055 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'london-1970', kitName: 'Piano pop', profileName: 'Piano pop · London 1970',
  bpm: 72, meter: '4/4', root: 'D#', scale: 'Chromatic', form: FORM, parts: PARTS,
  reactions: reactions('london-1970', { lift: 2, contrast: 4, lament: 6, calm: 0, finale: 6, climax: 5, solo: 4 }),
  reference: 'Discos de cantores-compositores de Londres em 1970 (o piano de Elton John com os arranjos de cordas de Paul Buckmaster, o som dos estúdios Trident e Olympic); balada original em Mi bemol: o piano sozinho no começo, a mão direita cantando a melodia sobre colcheias em arpejo e baixo descendente, baixo e bateria a partir do primeiro refrão, violão, violoncelo e trompa como contracantos, ponte para os violinos com rufo de tímpano e o último refrão com a orquestra inteira.',
  url: 'https://www.britannica.com/biography/Elton-John',
}).catch(error => { console.error(error); process.exit(1) })
