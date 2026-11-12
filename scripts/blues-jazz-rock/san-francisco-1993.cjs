// 1993 San Francisco - Folk rock. Original song in A minor and C in the spirit of the Bay Area folk
// rock revival of the early 1990s (Counting Crows' first record, made in the Bay; the Byrds' jangle
// and Dylan's band behind it): strummed acoustic guitars, a 12-string jangle electric that carries the
// tune, a mandolin with tremolo, a Hammond, a piano on the chorus, harmony vocals, tambourine, an
// accordion bridge and a double last chorus. Run: node scripts/blues-jazz-rock/san-francisco-1993.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords, chord } = require('./common.cjs')
const C = composer('4/4', 'Chromatic')
const { mel, rep, hits, relative, human, set, strum } = C
const KEY = 'C'

const LOOP = ['Am', 'F', 'Dm', 'G']
const VERSE = [...LOOP, ...LOOP]
const CHORUS = ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G']
const BRIDGE = ['F', 'G', 'Em', 'Am', 'F', 'G', 'Dm', 'G']
const OUTRO = ['Am', 'F', 'G', 'C']
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(LOOP) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },
  { label: 'Solo', bars: 8, bank: 3, harmony: R(VERSE) },                 // mandolin
  { label: 'Bridge', bars: 8, bank: 4, harmony: R(BRIDGE) },              // accordion
  { label: 'Chorus', bars: 16, bank: 5, harmony: R([...CHORUS, ...CHORUS]) },
  { label: 'Outro', bars: 4, bank: 6, harmony: R(OUTRO) },
]
const CHORDS = [LOOP, VERSE, CHORUS, VERSE, BRIDGE, [...CHORUS, ...CHORUS], OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))
const bars = bank => FORM.find(s => s.bank === bank).bars
const ACCENT = { accent: { strong: .84, beat: .76, off: .7 } }

// ---------- b1 Jangle guitar: the riff and the tune (semitones above C3; the octave strings sound above) ----------
const RIFF = '9:1 12:1 16:1 12:1 9:1 12:1 16:1 19:1 | 9:1 12:1 17:1 12:1 9:1 12:1 17:1 12:1 | 9:1 14:1 17:1 14:1 9:1 14:1 17:1 21:1 | 19:2 14:1 11:1 7:4~'
const VERSE_TUNE = 'r:2 9:2 12:2 12:1 11:1 | 9:3 7:1 5:4~ | r:2 5:2 9:2 9:1 7:1 | 7:4~ 11:2 14:2 | r:2 16:2 16:1 14:1 12:2 | 12:3 9:1 7:2 5:2 | 5:2 7:2 9:2 12:2 | 11:6~ r:2'
const CHORUS_TUNE = '16:4~ 14:2 12:2 | 14:4~ 11:2 7:2 | 12:2 14:2 16:4~ | 17:3 16:1 12:4 | 16:4~ 14:2 16:2 | 14:3 12:1 11:4 | 12:2 9:2 12:2 14:2 | 14:8~'
const jangle = {
  0: relative(mel(RIFF, ACCENT), H(0)), 1: relative(human(mel(VERSE_TUNE, ACCENT), .05, 0, 3), H(1)), 2: relative(human(mel(CHORUS_TUNE, ACCENT), .05, 0, 5), H(2)),
  5: relative(human(mel(`${CHORUS_TUNE} | ${CHORUS_TUNE}`, ACCENT), .05, 0, 7), H(5)), 6: relative(mel(`${RIFF.split(' | ').slice(0, 3).join(' | ')} | 12:8*`, ACCENT), H(6)),
}

// ---------- d1 Mandolin: tremolo solo and countermelody (semitones above C4) ----------
const SOLO = '16:2x4 12:2 9:2 12:2 | 17:4x4 16:2 12:2 | 14:2 17:2 21:2 17:2 | 19:4x4 17:2 14:2 | 24:2x4 21:2 19:2 16:2 | 21:4x4 17:2 12:2 | 14:1 17:1 21:1 26:1 21:2 17:2 | 19:8x4'
const tremolo = (list, center, rhythm) => onChords(C, voiceLead(list, KEY, { center, size: 1 }), rhythm, { gate: .95, extra: { ratchet: 4 } })
const mandolin = {
  3: relative(human(mel(SOLO, ACCENT), .05, 0, 9), H(3)),
  5: relative(tremolo([...CHORUS, ...CHORUS], 19, bar => bar < 8 ? [] : [[0, 2, .5], [2, 2, .46]]), H(5)),
  1: relative(set(tremolo(VERSE, 16, bar => bar < 4 ? [] : [[2, 2, .44]]), { chance: .8 }), H(1)),
}

// ---------- h1 Accordion: the bridge tune (semitones above C4) ----------
const accordion = {
  4: relative(human(mel('9:4~ 12:2 9:2 | 11:4~ 14:2 11:2 | 7:6~ 4:2 | 9:8~ | 12:4~ 9:2 5:2 | 7:4~ 11:2 14:2 | 17:4~ 14:2 9:2 | 11:4~ 14:4', ACCENT), .05, 0, 11), H(4)),
  6: relative(onChords(C, voiceLead(OUTRO, KEY, { center: 7, size: 3 }), bar => bar === 3 ? [[0, 4, .56, { release: 1.2, reverb: .4 }]] : [[0, 4, .5]], { gate: .98 }), H(6)),
}

// ---------- c1 Acoustic guitar, e1 Hammond organ, f1 Piano, g1 Harmony vocals ----------
const STRUM = [[0, .5, .72], [1, .5, .5], [1.5, .5, .58], [2.5, .5, .54], [3, .5, .66], [3.5, .5, .5]]
const acoustic = each((list, bank) => {
  // The sixteen-bar chorus strums four times a bar (a roll holds at most 256 notes).
  const pattern = bank === 5 ? STRUM.filter((_, i) => i !== 1 && i !== 5) : bank === 0 ? bar => bar < 2 ? [] : STRUM : bank === 4 ? [[0, 2, .6], [2, 2, .54]] : bank === 6 ? bar => bar === 3 ? [[0, 4, .66, { release: 1.2 }]] : STRUM : STRUM
  return relative(human(strum(onChords(C, voiceLead(list, KEY, { center: 4, size: 4 }), pattern, { gate: .9 })), .06, 0, bank + 13), H(bank))
})
const organ = Object.fromEntries([[2, CHORUS], [3, VERSE], [4, BRIDGE], [5, [...CHORUS, ...CHORUS]]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: 2, size: 4 }), [[0, 4, .5]], { gate: .98 }), H(bank))]))
const piano = Object.fromEntries([[2, CHORUS], [5, [...CHORUS, ...CHORUS]]].map(([bank, list]) =>
  [bank, relative(human(onChords(C, voiceLead(list, KEY, { center: 12, size: 3 }), [[0, .9, .62], [1, .9, .5], [2, .9, .58], [3, .9, .5]], { gate: .85 }), .06, 0, bank + 17), H(bank))]))
const harmonies = Object.fromEntries([[2, CHORUS], [4, BRIDGE], [5, [...CHORUS, ...CHORUS]]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: 9, size: 3 }), bank === 4 ? bar => bar < 4 ? [] : [[0, 4, .5]] : [[0, 4, .56]], { gate: .98 }), H(bank))]))

// ---------- a1 Bass guitar ----------
const bassLine = list => list.map((symbol, bar) => {
  const r = chord(symbol, KEY).root, low = r > 6 ? r - 12 : r
  return bar % 4 === 3 ? `${low}:2 ${low}:1 ${low + 7}:1 ${low + 12}:2 ${low + 10}:1 ${low + 7}:1` : `${low}:2 ${low}:1 ${low}:1 ${low + 7}:2 ${low}:2`
}).join(' | ')
const bass = each((list, bank) => {
  if (bank === 0) return relative(mel(`r:8 | r:8 | ${bassLine(list.slice(2))}`), H(0))
  if (bank === 4) return relative(mel(list.map(s => { const r = chord(s, KEY).root; return `${r > 6 ? r - 12 : r}:8` }).join(' | ')), H(4))
  if (bank === 6) return relative(mel(`${bassLine(OUTRO.slice(0, 3))} | 0:8*`), H(6))
  return relative(human(mel(bassLine(list)), .05, 0, bank + 21), H(bank))
})

// ---------- drums ----------
const KICK = 'x...x.x.', SNARE = '..x...x.'
const groove = (pattern, fill) => Object.fromEntries([1, 2, 3, 5].map(b => [b, hits(rep(pattern, bars(b) - 1) + ' | ' + (fill ?? pattern))]))
const kick = { ...groove(KICK), 0: hits('........ | ........ | x...x.x. | x...x...'), 4: hits(rep('x.......', 8)), 6: hits(rep(KICK, 3) + ' | X.......') }
const snare = { ...groove(SNARE, '..x.xxRR'), 0: hits('........ | ........ | ..x...x. | ..x.xxRR'), 4: hits(rep('....x...', 7) + ' | ..x.RRRR'), 6: hits(rep(SNARE, 3) + ' | X.......') }
const hat = { 0: hits('........ | ........ | xxxxxxxx | xxxxxxxx'), 1: hits(rep('xgxgxgxg', 8)), 3: hits(rep('xgxgxgxg', 8)), 4: hits(rep('x.x.x.x.', 8)) }
const tambourine = Object.fromEntries([1, 2, 3, 5].map(b => [b, hits(rep('gxgXgxgX', bars(b)))]))
const ride = { 2: hits(rep('x.x.x.x.', 8)), 5: hits(rep('x.x.x.x.', 16)), 6: hits(rep('x.x.x.x.', 3) + ' | ........') }
const crash = { 1: hits('X.......'), 2: hits('X.......'), 3: hits('X.......'), 5: hits('X.......' + ' | ........'.repeat(7) + ' | X.......'), 6: hits('........ | ........ | ........ | X.......') }
const toms = { 2: hits(rep('........', 7) + ' | ....xxRR'), 4: hits(rep('........', 7) + ' | ..xxxxRR') }
const shaker = { 1: hits(rep('.x.x.x.x', 8)), 4: hits(rep('xgxgxgxg', 8)) }

const PARTS = present([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('guitars', 'bass', 0), bass, on(...ALL),
    { octave: 2, gain: .26, attack: .005, decay: .45, sustain: .55, release: .14, clip: 1, lpf: 2200, hpf: 30, effects: { reverb: .06 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), kick, on(...ALL),
    { ...DRUM, gain: .085, decay: .3, release: .1, clip: .8, lpf: 2600, hpf: 30, effects: { reverb: .1 } }),
  P('b1', 'Jangle guitar', 'melody', 'phrase', SAMPLE('amps', 'jangle'), jangle, on(0, 1, 2, 3, 4, 7, 8),
    { octave: 3, gain: .058, attack: .003, decay: .6, sustain: .5, release: .3, clip: 1, lpf: 8000, hpf: 160, effects: { reverb: .2, pan: -.2 }, mapping: FIXED, design: { role: 'lead' } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 0, false), snare, on(...ALL),
    { ...DRUM, gain: .058, decay: .18, release: .1, clip: .7, lpf: 7000, hpf: 150, effects: { reverb: .2 } }),
  P('c1', 'Acoustic guitar', 'harmony', 'phrase', SAMPLE('guitars', 'nylon', 0), acoustic, on(...ALL),
    { octave: 3, gain: .04, attack: .002, decay: .45, sustain: .3, release: .2, clip: .9, lpf: 9000, hpf: 160, effects: { reverb: .14, pan: .35 }, mapping: FIXED }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 0, false), hat, on(0, 1, 3, 5, 6),
    { ...DRUM, gain: .026, decay: .06, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .08, pan: .3 } }),
  P('d1', 'Mandolin', 'response', 'phrase', SAMPLE('brasil', 'bandolim'), mandolin, on(3, 5, 7),
    { octave: 4, gain: .045, attack: .002, decay: .4, sustain: .25, release: .15, clip: .9, lpf: 8000, hpf: 250, effects: { reverb: .18, pan: .25 }, mapping: FIXED }),
  P('d2', 'Tambourine', 'rhythm', 'pulse', SAMPLE('percussion', 'tambourine', 0, false), tambourine, on(1, 2, 3, 4, 5, 7),
    { ...DRUM, gain: .026, decay: .14, release: .08, clip: .5, lpf: 9000, hpf: 1500, effects: { reverb: .14, pan: -.35 } }),
  P('e1', 'Hammond organ', 'harmony', 'sustain', SAMPLE('keys', 'organ'), organ, on(2, 4, 5, 6, 7),
    { octave: 4, gain: .032, attack: .02, decay: .3, sustain: .9, release: .2, clip: 1, lpf: 4500, hpf: 90, effects: { reverb: .2, pan: -.1 }, mapping: FIXED,
      design: { lfoTarget: 'gain', lfoRate: 6.4, lfoUnit: 'hz', lfoDepth: .1, lfoShape: 'sine' } }),
  P('e2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(1, 2, 3, 4, 5, 7, 8),
    { ...DRUM, gain: .032, decay: .9, release: .4, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .16, pan: .25 } }),
  P('f1', 'Piano', 'harmony', 'phrase', SAMPLE('band', 'piano', 0), piano, on(2, 4, 7),
    { octave: 3, gain: .04, attack: .002, decay: .5, sustain: .3, release: .25, clip: .95, lpf: 7000, hpf: 120, effects: { reverb: .18, pan: .15 }, mapping: FIXED }),
  P('f2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 0, false), toms, on(2, 4, 6),
    { ...DRUM, gain: .07, decay: .4, release: .2, clip: .9, lpf: 4500, hpf: 40, effects: { reverb: .2 } }),
  P('g1', 'Harmony vocals', 'harmony', 'sustain', SAMPLE('voices', 'aah'), harmonies, on(2, 4, 6, 7),
    { octave: 3, gain: .04, attack: .08, decay: .4, sustain: .85, release: .3, clip: 1, lpf: 6000, hpf: 150, effects: { reverb: .24, pan: .3 }, mapping: FIXED }),
  P('g2', 'Shaker', 'rhythm', 'pulse', SAMPLE('percussion', 'shaker', 0, false), shaker, on(1, 3, 6),
    { ...DRUM, gain: .02, decay: .08, release: .05, clip: .4, lpf: 9000, hpf: 2000, effects: { reverb: .1, pan: .35 } }),
  P('h1', 'Accordion', 'melody', 'sustain', SAMPLE('keys', 'accordion'), accordion, on(6, 8),
    { octave: 4, gain: .045, attack: .03, decay: .3, sustain: .85, release: .2, clip: 1, lpf: 5500, hpf: 180, effects: { reverb: .2, pan: -.3 }, mapping: FIXED,
      design: { lfoTarget: 'gain', lfoRate: 5.8, lfoUnit: 'hz', lfoDepth: .12, lfoShape: 'sine' } }),
  P('h2', 'Ride', 'rhythm', 'pulse', SAMPLE('percussion', 'ride', 0, false), ride, on(2, 4, 7, 8),
    { ...DRUM, gain: .028, decay: .4, release: .2, clip: .7, lpf: 9000, hpf: 400, effects: { reverb: .14, pan: -.25 } }),
], FORM)

const SECTION_PARAMS = { d1: { 5: { gain: .055 } } }
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'san-francisco-1993', kitName: 'Folk rock', profileName: 'Folk rock · San Francisco 1993',
  bpm: 132, meter: '4/4', root: 'C', scale: 'Chromatic', form: FORM, parts: PARTS,
  reactions: reactions('san-francisco-1993', { lift: 2, contrast: 4, lament: 4, calm: 0, finale: 6, climax: 5, solo: 3 }),
  reference: 'Retomada do folk rock na Baía de São Francisco no início dos anos 1990 (o primeiro disco do Counting Crows, gravado na Baía; o jangle dos Byrds e a banda de Dylan por trás); canção original em Lá menor e Dó: violões em batida, guitarra de 12 cordas com jangle levando a melodia, bandolim com trêmulo, Hammond, piano no refrão, vozes em harmonia, pandeirola, ponte de acordeão e último refrão dobrado.',
  url: 'https://www.britannica.com/art/folk-rock',
}).catch(error => { console.error(error); process.exit(1) })
