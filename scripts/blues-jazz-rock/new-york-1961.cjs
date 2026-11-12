// 1961 New York City - Doo-wop. Original song on the I-vi-IV-V changes in the spirit of the Bronx and
// Brooklyn vocal groups of the early 1960s (Dion and the Belmonts, the Tokens, the Marcels' fast
// bass singer): the group's "ooh" and "aah", rhythmic "doo"s, a bass singer's "bom ba-ba bom", a
// falsetto descant, piano triplets over a shuffle, finger snaps, an R&B tenor sax that carries the
// lead and honks its solo, an a cappella break and the last verse a half step higher.
// Run: node scripts/blues-jazz-rock/new-york-1961.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords, chord } = require('./common.cjs')
const C = composer('4/4', 'Chromatic', { swing: .66 })
const { mel, rep, hits, relative, human, set } = C
const KEY = 'A'

const CHANGES = ['A', 'F#m', 'D', 'E']
const VERSE = [...CHANGES, ...CHANGES]
const BRIDGE = ['D', 'D', 'A', 'A', 'B7', 'B7', 'E', 'E7']
const OUTRO = ['A', 'F#m', 'D', 'A6']
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(CHANGES) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Bridge', bars: 8, bank: 2, harmony: R(BRIDGE) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Solo', bars: 16, bank: 3, harmony: R([...VERSE, ...VERSE]) },   // the sax honks
  { label: 'Break', bars: 4, bank: 4, harmony: R(CHANGES) },                // a cappella: bass singer and snaps
  { label: 'Verse', bars: 8, bank: 5, harmony: R(VERSE), transpose: 1 },    // up a half step
  { label: 'Outro', bars: 4, bank: 6, harmony: R(OUTRO), transpose: 1 },
]
const CHORDS = [CHANGES, VERSE, BRIDGE, [...VERSE, ...VERSE], CHANGES, VERSE, OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))

// ---------- b1 Tenor sax: the lead (semitones above A3) and the honking solo ----------
const LEAD = 'r:2 16:3 14:1 12:2 | r:2 9:2 12:2 16:2 | 17:3 16:1 14:2 12:2 | 14:6~ r:2 | 16:3 14:1 12:2 9:2 | 12:4~ 9:2 7:2 | 9:2 12:2 17:3 16:1 | 14:2 11:2 7:4~'
const BRIDGE_LEAD = '17:4~ 14:2 12:2 | 9:2 12:2 14:2 17:2 | 16:6~ 14:1 12:1 | 12:4~ r:4 | 18:3~ 14:1 9:2 12:2 | 14:4~ 12:2 9:2 | 11:3 14:1 17:2 14:2 | 19:4~ 17:2 14:2'
const HONK = [
  '7:1 7:1 r:1 7:1 r:1 7:3#', '9:2^-2 12:2 9:2 7:2', '12:1 14:1 17:2~ 14:1 12:1 9:2', '11:2 14:2 19:4~#',
  '16:3^2 12:1 16:2 19:2', '16:1 12:1 9:1 12:1 16:4~', '17:2 17:1 r:1 17:2 14:2', '14:1 11:1 7:6~',
  '19:6~# 16:1 12:1', '16:2 12:2 9:2 12:2', '9:1 12:1 14:1 17:1 14:1 12:1 9:2', '11:3 14:1 17:4~',
  '12:1 12:1 r:1 12:1 r:1 12:1 16:2^-3', '16:2 12:2 16:2 12:2', '17:3~ 14:1 12:2 9:2', '7:2 11:2 14:2 r:2',
].join('|')
const ACCENT = { accent: { strong: .84, beat: .78, off: .7 } }
const sax = {
  1: relative(human(mel(LEAD, ACCENT), .05, 0, 3), H(1)), 2: relative(human(C.portamento(mel(BRIDGE_LEAD, ACCENT), 5, .08, 2), .05, 0, 5), H(2)),
  3: relative(human(mel(HONK, { accent: { strong: .95, beat: .88, off: .8 } }), .05, 0, 7), H(3)),
  5: relative(human(mel(LEAD, ACCENT), .05, 0, 9), H(5)),
  6: relative(mel('r:2 16:3 14:1 12:2 | r:2 9:2 12:2 16:2 | 17:3 16:1 14:2 12:2 | 12:8~*', ACCENT), H(6)),
}

// ---------- the group: c1 "ooh", d1 "doo", e1 "aah" (close triads around E4) ----------
const triads = (list, center = 7) => voiceLead(list, KEY, { center, size: 3 })
const WHOLE = [[0, 3.85, .62]]
const ooh = {
  0: relative(onChords(C, triads(CHANGES), WHOLE, { gate: .98 }), H(0)),
  1: relative(human(onChords(C, triads(VERSE), [[0, 1.9, .6], [2, 1.9, .56]], { gate: .98 }), .05, 0, 11), H(1)),
  6: relative(onChords(C, triads(OUTRO), bar => bar === 3 ? [[0, 4, .66, { release: 1.4, reverb: .45 }]] : WHOLE, { gate: .98 }), H(6)),
}
const DOO = bar => bar % 2 ? [[0, .4, .7], [1, .4, .6], [1.5, .4, .64], [2.5, .4, .62], [3.5, .4, .6]] : [[0, .4, .72], [1, .4, .6], [2, .4, .66], [2.5, .4, .6], [3, .4, .64]]
const doo = {
  3: relative(human(onChords(C, triads([...VERSE, ...VERSE]), DOO, { gate: .9 }), .06, 0, 13), H(3)),
  5: relative(human(onChords(C, triads(VERSE), DOO, { gate: .9 }), .06, 0, 15), H(5)),
}
const aah = {
  2: relative(onChords(C, triads(BRIDGE, 9), [[0, 3.85, .6]], { gate: .98 }), H(2)),
  4: relative(onChords(C, triads(CHANGES, 9), [[0, 1.4, .66], [2, 1.4, .62]], { gate: .95 }), H(4)),
  5: relative(onChords(C, triads(VERSE, 9), [[0, 3.85, .56]], { gate: .98 }), H(5)),
}

// ---------- f1 Bass singer: "bom, ba-ba bom" ----------
const low = symbol => { const r = chord(symbol, KEY).root; return r > 6 ? r - 12 : r }
const bom = (list, pattern) => list.map(symbol => { const r = low(symbol), f = r + 7 > 7 ? r - 5 : r + 7; return pattern(r, f) }).join(' | ')
const BOM = (r, f) => `${r}:2 r:1 ${r}:1 ${f}:2 r:1 ${r}:1`
const RUN = (r, f) => `${r}:1 ${r}:1 r:1 ${f}:1 ${r}:2 ${f}:1 ${r}:1`
const bassSinger = {
  0: relative(mel(bom(CHANGES, BOM), ACCENT), H(0)), 2: relative(mel(bom(BRIDGE, BOM), ACCENT), H(2)),
  3: relative(mel(bom([...VERSE, ...VERSE], (r, f) => `${r}:2 r:2 ${f}:2 r:2`), ACCENT), H(3)),
  4: relative(mel(bom(CHANGES, RUN), { accent: { strong: .95, beat: .86, off: .8 } }), H(4)),
  5: relative(mel(bom(VERSE, BOM), ACCENT), H(5)),
  6: relative(mel(bom(OUTRO.slice(0, 3), BOM) + ' | 0:8*', ACCENT), H(6)),
}

// ---------- h1 Falsetto (semitones above A4): the descant over the group ----------
const falsetto = {
  0: relative(mel('16:8~ | 12:4~ 9:4 | 12:8~ | 11:4~ 7:4', ACCENT), H(0)),
  2: relative(mel('r:8 | r:8 | 16:6~ 14:1 12:1 | 16:8~ | r:8 | r:8 | 11:6~ 9:1 7:1 | 14:8~', ACCENT), H(2)),
  5: relative(mel('r:8 | 16:8~ | r:8 | 14:8~ | r:8 | 16:8~ | 17:4~ 16:4 | 14:8~', ACCENT), H(5)),
  6: relative(mel('r:8 | r:8 | 12:8~ | 16:8~*', ACCENT), H(6)),
}

// ---------- g1 Piano: the doo-wop triplets ----------
// The full triad on each beat, its top two notes on the other triplets (a roll holds at most 256 notes).
const ON_BEAT = [0, 1, 2, 3].map(beat => [beat, 1 / 3, .6])
const OFF_BEAT = Array.from({ length: 12 }, (_, i) => [i / 3, 1 / 3, [.6, .4, .46][i % 3]]).filter((_, i) => i % 3)
// Behind the sax solo: a shuffle comp on the beats and their last triplet.
const SHUFFLE = [[0, .6, .55], [1, .4, .5], [5 / 3, 1 / 3, .4], [2, .6, .52], [3, .4, .5], [11 / 3, 1 / 3, .4]]
const piano = each((list, bank) => {
  if (bank === 4) return null
  const full = voiceLead(list, KEY, { center: 12, size: 3 }), top = full.map(v => v.slice(1))
  const notes = bank === 3 ? onChords(C, top, SHUFFLE, { gate: .8, straight: true })
    : bank === 6 ? onChords(C, full, bar => bar === 3 ? [[0, 4, .66, { release: 1.2, reverb: .4 }]] : ON_BEAT, { gate: .8, straight: true })
      .concat(onChords(C, top, bar => bar === 3 ? [] : OFF_BEAT, { gate: .8, straight: true }))
    : [...onChords(C, full, ON_BEAT, { gate: .8, straight: true }), ...onChords(C, top, OFF_BEAT, { gate: .8, straight: true })]
  return relative(human(notes, .05, 0, bank + 21), H(bank))
})

// ---------- a1 Upright bass: root, third, fifth, sixth ----------
const boogie = list => list.map(symbol => { const { tones } = chord(symbol, KEY), r = low(symbol); return `${r}:2 ${r + tones[1]}:2 ${r + 7}:2 ${r + 9}:2` }).join(' | ')
const bass = each((list, bank) => {
  if (bank === 4) return null
  if (bank === 6) return relative(mel(boogie(OUTRO.slice(0, 3)) + ' | 0:8*'), H(6))
  return relative(human(mel(boogie(list)), .05, 0, bank + 31), H(bank))
})

// ---------- drums: a light shuffle, snaps on 2 and 4, claps for the solo and the last verse ----------
const bars = bank => FORM.find(s => s.bank === bank).bars
const kick = Object.fromEntries([1, 2, 3, 5].map(b => [b, hits(rep('o...o...', bars(b)))])).valueOf()
kick[6] = hits('o...o... | o...o... | o...o... | X.......')
const snare = Object.fromEntries([1, 2, 5].map(b => [b, hits(rep('..x...xg', bars(b)))]))
snare[3] = hits(rep('..x..gx. | ..x...xg', 8))
snare[6] = hits('..x...x. | ..x...x. | ..x.xRRR | X.......')
const hat = Object.fromEntries([1, 2, 3, 5].map(b => [b, hits(rep('xgxgxgxg', bars(b)))]))
const snaps = { 0: hits(rep('..x...x.', 4)), 1: hits(rep('..x...x.', 8)), 4: hits(rep('..x...x.', 4)) }
const claps = { 3: hits(rep('..x...x.', 16)), 4: hits(rep('..x...x.', 4)), 5: hits(rep('..x...x.', 8)) }
const crash = { 3: hits('X.......'), 5: hits('X.......'), 6: hits('........ | ........ | ........ | X.......') }
const ride = { 3: hits(rep('x.xgx.xg', 16)) }
const toms = { 2: hits(rep('........', 7) + ' | ....xxRR'), 3: hits(rep('........', 15) + ' | ......xx') }

const PARTS = present([
  P('a1', 'Upright bass', 'bass', 'phrase', SAMPLE('classical', 'concert-bass-pizz'), bass, on(...ALL),
    { octave: 1, gain: .32, attack: .004, decay: .45, sustain: .45, release: .16, clip: 1, lpf: 2400, hpf: 32, effects: { reverb: .08 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 1, false), kick, on(...ALL),
    { ...DRUM, gain: .07, decay: .3, release: .1, clip: .8, lpf: 2400, hpf: 30, effects: { reverb: .1 } }),
  P('b1', 'Tenor sax', 'melody', 'phrase', SAMPLE('band', 'tenor-sax', 1), sax, on(1, 2, 3, 4, 5, 7, 8),
    { octave: 3, gain: .065, attack: .02, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 6000, hpf: 100, effects: { reverb: .2, pan: -.1 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5.4, vibratoDepth: .16 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 1, false), snare, on(...ALL),
    { ...DRUM, gain: .045, decay: .16, release: .08, clip: .6, lpf: 7000, hpf: 180, effects: { reverb: .22 } }),
  P('c1', 'Group "ooh"', 'harmony', 'sustain', SAMPLE('voices', 'ooh'), ooh, on(0, 1, 2, 4, 8),
    { octave: 3, gain: .05, attack: .08, decay: .4, sustain: .85, release: .35, clip: 1, lpf: 5000, hpf: 120, effects: { reverb: .28, pan: .2 }, mapping: FIXED }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 1, false), hat, on(...ALL),
    { ...DRUM, gain: .025, decay: .06, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .08, pan: .3 } }),
  P('d1', 'Group "doo"', 'response', 'phrase', SAMPLE('voices', 'doo-wah', 0), doo, on(5, 7),
    { octave: 3, gain: .05, attack: .005, decay: .3, sustain: .5, release: .12, clip: 1, lpf: 5000, hpf: 140, effects: { reverb: .22, pan: -.25 }, mapping: FIXED }),
  P('d2', 'Hand claps', 'rhythm', 'pulse', SAMPLE('drums', 'room-clap', 0, false), claps, on(5, 6, 7),
    { ...DRUM, gain: .04, decay: .12, release: .06, clip: .5, lpf: 7000, hpf: 600, effects: { reverb: .2, pan: -.15 } }),
  P('e1', 'Group "aah"', 'harmony', 'sustain', SAMPLE('voices', 'aah'), aah, on(3, 6, 7),
    { octave: 3, gain: .045, attack: .1, decay: .4, sustain: .85, release: .35, clip: 1, lpf: 5500, hpf: 140, effects: { reverb: .28, pan: -.2 }, mapping: FIXED }),
  P('e2', 'Finger snaps', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), snaps, on(0, 1, 2, 4, 6),
    { ...DRUM, gain: .04, decay: .05, release: .03, clip: .3, lpf: 6000, hpf: 1500, effects: { reverb: .16, pan: .2 } }),
  P('f1', 'Bass singer', 'bass', 'phrase', SAMPLE('voices', 'bass-bom'), bassSinger, on(0, 3, 5, 6, 7, 8),
    { octave: 2, gain: .07, attack: .005, decay: .4, sustain: .6, release: .15, clip: 1, lpf: 3500, hpf: 50, effects: { reverb: .16, pan: .05 }, mapping: FIXED }),
  P('f2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(5, 7, 8),
    { ...DRUM, gain: .03, decay: .8, release: .4, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .18, pan: .25 } }),
  P('g1', 'Piano', 'harmony', 'phrase', SAMPLE('band', 'piano', 1), piano, on(...ALL),
    { octave: 3, gain: .04, attack: .002, decay: .4, sustain: .3, release: .2, clip: .9, lpf: 6500, hpf: 150, effects: { reverb: .16, pan: .25 }, mapping: FIXED }),
  P('g2', 'Ride', 'rhythm', 'pulse', SAMPLE('percussion', 'ride', 0, false), ride, on(5),
    { ...DRUM, gain: .03, decay: .4, release: .2, clip: .7, lpf: 9000, hpf: 400, effects: { reverb: .14, pan: -.25 } }),
  P('h1', 'Falsetto', 'response', 'phrase', SAMPLE('voices', 'falsetto'), falsetto, on(0, 3, 7, 8),
    { octave: 4, gain: .045, attack: .05, decay: .4, sustain: .85, release: .3, clip: 1, lpf: 6500, hpf: 250, effects: { reverb: .3, pan: -.3 }, mapping: FIXED }),
  P('h2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 1, false), toms, on(3, 5),
    { ...DRUM, gain: .06, decay: .35, release: .18, clip: .8, lpf: 5000, hpf: 50, effects: { reverb: .22 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 5: { gain: .08, reverbRange: { first: .18, second: .24 } } },
  f1: { 6: { gain: .09 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'new-york-1961', kitName: 'Doo-wop', profileName: 'Doo-wop · New York City 1961',
  bpm: 128, meter: '4/4', root: 'A', scale: 'Chromatic', form: FORM, parts: PARTS, grid: 192,
  reactions: reactions('new-york-1961', { lift: 1, contrast: 2, lament: 4, calm: 0, finale: 6, climax: 3, solo: 3 }),
  reference: 'Grupos vocais do Bronx e do Brooklyn no início dos anos 1960 (Dion and the Belmonts, The Tokens, o baixo vocal veloz dos Marcels); canção original sobre a sequência I–vi–IV–V: "ooh" e "aah" do grupo, "doo" rítmicos, o baixo vocal em "bom ba-ba bom", descante em falsete, tercinas de piano sobre shuffle, estalos de dedos, sax tenor de R&B no lugar da voz principal e no solo, quebra a cappella e o último verso meio tom acima.',
  url: 'https://www.britannica.com/art/doo-wop',
}).catch(error => { console.error(error); process.exit(1) })
