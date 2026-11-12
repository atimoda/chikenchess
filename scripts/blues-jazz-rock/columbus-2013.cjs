// 2013 Columbus - Indie pop. Original song in A minor and C in the spirit of the Columbus indie pop of
// the early 2010s (Twenty One Pilots' ukulele, piano and programmed beats, born in the city's small
// rooms): a ukulele alone at the start and the end, a glockenspiel tune on the verse over an 808 and
// finger snaps, a synth lead hook, a pad and a piano on the chorus with gang "oh!" shouts, a drop with
// four-on-the-floor claps and open hats, a half-time piano bridge and a sub bass under everything.
// Run: node scripts/blues-jazz-rock/columbus-2013.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords, chord } = require('./common.cjs')
const C = composer('4/4', 'Chromatic')
const { mel, rep, hits, relative, human, set, up, strum } = C
const KEY = 'C'

const LOOP = ['Am', 'F', 'C', 'G']
const VERSE = [...LOOP, ...LOOP]
const PRE = ['F', 'G', 'Em', 'Am']
const CHORUS = ['F', 'C', 'G', 'Am', 'F', 'C', 'G', 'Am']
const BRIDGE = ['Dm', 'Am', 'F', 'G', 'Dm', 'Am', 'F', 'G']
const OUTRO = ['Am', 'F', 'C', 'C']
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(LOOP) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Pre-Chorus', bars: 4, bank: 2, harmony: R(PRE) },
  { label: 'Chorus', bars: 8, bank: 3, harmony: R(CHORUS) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Pre-Chorus', bars: 4, bank: 2, harmony: R(PRE) },
  { label: 'Chorus', bars: 8, bank: 3, harmony: R(CHORUS) },
  { label: 'Drop', bars: 8, bank: 4, harmony: R(CHORUS) },
  { label: 'Bridge', bars: 8, bank: 5, harmony: R(BRIDGE) },   // half time
  { label: 'Chorus', bars: 8, bank: 6, harmony: R(CHORUS) },
  { label: 'Outro', bars: 4, bank: 7, harmony: R(OUTRO) },
]
const CHORDS = [LOOP, VERSE, PRE, CHORUS, CHORUS, BRIDGE, CHORUS, OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))
const ACCENT = { accent: { strong: .86, beat: .78, off: .7 } }
const root = symbol => { const r = chord(symbol, KEY).root; return r > 6 ? r - 12 : r }

// ---------- c1 Ukulele: the island strum (down, down-up, up-down-up) ----------
const ISLAND = [[0, .5, .74], [1, .5, .62], [1.5, .5, .5], [2.5, .5, .52], [3, .5, .64], [3.5, .5, .5]]
const ukulele = each((list, bank) => {
  const voices = voiceLead(list, KEY, { center: 9, size: 4 })
  const rhythm = bank === 4 ? [[0, .25, .7], [1.5, .25, .62], [3, .25, .66]] : bank === 5 ? bar => bar < 4 ? [] : ISLAND
    : bank === 7 ? bar => bar === 3 ? [[0, 4, .66, { release: 1.2, reverb: .4 }]] : ISLAND : ISLAND
  return relative(human(strum(onChords(C, voices, rhythm, { gate: .8 }), 1 / 96), .06, 0, bank + 1), H(bank))
})

// ---------- d1 Glockenspiel: the verse tune (semitones above C5) ----------
const VERSE_TUNE = 'r:2 4:1 4:1 4:2 2:1 0:1 | 0:3 -3:1 0:4 | r:2 4:1 4:1 7:2 4:1 2:1 | 2:6~ r:2 | r:2 9:1 9:1 9:2 7:1 4:1 | 5:3 4:1 0:4 | 0:2 2:2 4:2 7:2 | 7:4 11:2 14:2'
const glock = {
  0: relative(mel('r:8 | r:8 | 4:2 7:2 12:2 7:2 | 2:2 7:2 11:4', ACCENT), H(0)),
  1: relative(human(mel(VERSE_TUNE, ACCENT), .05, 0, 3), H(1)),
  6: relative(set(mel('12:2 12:1 12:1 9:2 12:2 | 16:4~ 14:2 12:2 | 14:2 14:1 14:1 11:2 7:2 | 9:6~ r:2 | 12:2 12:1 12:1 17:2 16:2 | 16:4~ 14:2 12:2 | 14:3 12:1 11:2 7:2 | 9:8~', ACCENT), { velocity: .6 }), H(6)),
}

// ---------- b1 Synth lead: the chorus hook and the drop (semitones above C4) ----------
const HOOK = '12:2 12:1 12:1 9:2 12:2 | 16:4~ 14:2 12:2 | 14:2 14:1 14:1 11:2 7:2 | 9:6~ r:2 | 12:2 12:1 12:1 17:2 16:2 | 16:4~ 14:2 12:2 | 14:3 12:1 11:2 7:2 | 9:8~'
const DROP = '12:1 12:1 r:1 12:1 9:1 12:1 16:2^-4 | 16:1 14:1 12:1 14:1 16:2 19:2 | 19:1 19:1 r:1 19:1 14:1 11:1 7:2 | 9:4~ 12:2 16:2 | 24:1 24:1 r:1 24:1 21:1 24:1 28:2^-4 | 28:1 26:1 24:1 26:1 28:2 24:2 | 26:2 23:2 19:2 14:2 | 21:8~'
const lead = {
  3: relative(human(mel(HOOK, ACCENT), .04, 0, 5), H(3)), 4: relative(human(mel(DROP, ACCENT), .04, 0, 7), H(4)),
  6: relative([...human(mel(HOOK, ACCENT), .04, 0, 9), ...set(up(mel(HOOK, ACCENT), 12), { velocity: .5 })], H(6)),
}

// ---------- e1 Piano, f1 Synth pad, h1 Backing "ooh" ----------
const piano = each((list, bank) => {
  if (bank === 0 || bank === 1 || bank === 7) return null
  const voices = voiceLead(list, KEY, { center: 7, size: 3 })
  if (bank === 5) return relative([...onChords(C, voices, [[0, 2, .58], [2, 2, .52]], { gate: .95 }),
    ...mel('14:4~ 12:2 9:2 | 12:6~ r:2 | 9:3 12:1 17:4 | 14:8~ | 17:4~ 14:2 9:2 | 16:6~ 12:2 | 12:2 9:2 12:2 17:2 | 19:4 14:4', ACCENT).map(n => ({ ...n, degree: n.degree + 12 }))], H(5))
  return relative(human(onChords(C, voices, [[0, .9, .62], [1, .9, .52], [2, .9, .58], [3, .9, .52]], { gate: .85 }), .06, 0, bank + 11), H(bank))
})
const pad = Object.fromEntries([[2, PRE], [3, CHORUS], [4, CHORUS], [5, BRIDGE], [6, CHORUS]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: 5, size: 4 }), [[0, 4, bank === 5 ? .5 : .58]], { gate: .98 }), H(bank))]))
const ooh = Object.fromEntries([[2, PRE], [5, BRIDGE], [6, CHORUS]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: 9, size: 3 }), [[0, 4, .52]], { gate: .98 }), H(bank))]))

// ---------- g1 Gang "oh!" shouts ----------
const shouts = Object.fromEntries([[3, CHORUS], [4, CHORUS], [6, CHORUS]].map(([bank, list]) =>
  [bank, relative(onChords(C, list.map(s => [root(s) + 12]), bar => bar % 2 ? [[1.5, .5, .74], [2, .6, .82]] : [[0, .6, .86]], { gate: .9 }), H(bank))]))

// ---------- a1 Sub bass ----------
const bass = each((list, bank) => {
  const lows = list.map(s => [root(s)])
  if (bank === 0 || bank === 7) return null
  const rhythm = bank === 4 ? [[0, .45, .9], [1, .45, .84], [2, .45, .88], [3, .45, .84]]
    : bank === 5 ? [[0, 2, .78], [2, 2, .72]]
    : bank === 1 ? [[0, .75, .84], [1.5, .5, .7], [3, .5, .74]]
    : [[0, 1.4, .86], [1.5, .5, .72], [2, 1.4, .8], [3.5, .5, .72]]
  return relative(onChords(C, lows, rhythm, { gate: .92 }), H(bank))
})

// ---------- drums: 808 and breaks ----------
const kick = {
  1: hits(rep('x..x..x. | x..x....', 4)), 2: hits('x...x... | x...x... | x.x.x.x. | xxxxxxxx'), 3: hits(rep('x..x..x.', 8)), 4: hits(rep('x.x.x.x.', 8)),
  5: hits(rep('x.......', 8)), 6: hits(rep('x..x.xx.', 8)),
}
const snare = {
  1: hits(rep('....x...', 7) + ' | ....x.xx'), 2: hits('....x... | ....x... | ..x...x. | x.x.xxxx'), 3: hits(rep('....x...', 8)), 4: hits(rep('....x...', 7) + ' | ..x.xxxx'),
  5: hits(rep('........ | ....x...', 4)), 6: hits(rep('....x...', 7) + ' | ..x.x.xx'),
}
const hat = { 1: hits(rep('x.x.x.x.', 8)), 3: hits(rep('xgxgxgxg', 8)), 4: hits(rep('xxxxxxxx', 8)), 6: hits(rep('xgxgxgxg', 8)) }
const snaps = { 0: hits('........ | ........ | ..x...x. | ..x...x.'), 1: hits(rep('..x...x.', 8)), 7: hits('..x...x. | ..x...x. | ..x...x. | ........') }
const claps = { 3: hits(rep('..x...x.', 8)), 4: hits(rep('..x...x.', 8)), 6: hits(rep('..x...x.', 8)) }
const openHat = { 4: hits(rep('.x.x.x.x', 8)), 6: hits(rep('.x.x.x.x', 8)) }
const crash = { 3: hits('X.......'), 4: hits('X.......'), 6: hits('X.......'), 7: hits('X.......') }
const toms = { 2: hits('........ | ........ | ........ | ....xxRR'), 5: hits(rep('........', 7) + ' | ..xxxxRR') }

const PARTS = present([
  P('a1', 'Sub bass', 'bass', 'phrase', SAMPLE('synths', 'sub'), bass, on(...ALL),
    { octave: 2, gain: .16, attack: .004, decay: .4, sustain: .7, release: .1, clip: 1, lpf: 900, hpf: 25, effects: { reverb: 0 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('machines', 'break-kick', 0, false), kick, on(...ALL),
    { ...DRUM, gain: .1, decay: .3, release: .1, clip: .8, lpf: 4000, hpf: 30, effects: { reverb: .06 } }),
  P('b1', 'Synth lead', 'melody', 'phrase', SAMPLE('synths', 'wavetable'), lead, on(3, 6, 7, 9),
    { octave: 4, gain: .045, attack: .005, decay: .3, sustain: .7, release: .15, clip: 1, lpf: 4200, hpf: 200, effects: { reverb: .2, delay: .25, pan: -.1 }, mapping: FIXED,
      design: { role: 'lead', filterEnv: .4, filterAttack: .003, filterDecay: .14 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('machines', 'break-snare', 0, false), snare, on(...ALL),
    { ...DRUM, gain: .07, decay: .2, release: .08, clip: .7, lpf: 8000, hpf: 150, effects: { reverb: .2 } }),
  P('c1', 'Ukulele', 'harmony', 'phrase', SAMPLE('brasil', 'cavaquinho'), ukulele, on(...ALL),
    { octave: 4, gain: .05, attack: .002, decay: .35, sustain: .2, release: .15, clip: .9, lpf: 8000, hpf: 200, effects: { reverb: .14, pan: .25 }, mapping: FIXED }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('machines', '808-hat', 0, false), hat, on(1, 3, 4, 6, 7, 9),
    { ...DRUM, gain: .025, decay: .05, release: .03, clip: .4, lpf: 10000, hpf: 3000, effects: { reverb: .06, pan: .3 } }),
  P('d1', 'Glockenspiel', 'melody', 'phrase', SAMPLE('keys', 'celesta'), glock, on(0, 1, 4, 9),
    { octave: 5, gain: .04, attack: .002, decay: .8, sustain: .2, release: .5, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .26, delay: .2, pan: -.3 }, mapping: FIXED }),
  P('d2', 'Hand claps', 'rhythm', 'pulse', SAMPLE('machines', '909-clap', 0, false), claps, on(3, 6, 7, 9),
    { ...DRUM, gain: .045, decay: .15, release: .08, clip: .5, lpf: 8000, hpf: 500, effects: { reverb: .2 } }),
  P('e1', 'Piano', 'harmony', 'phrase', SAMPLE('band', 'piano', 0), piano, on(2, 3, 5, 6, 7, 8, 9),
    { octave: 3, gain: .045, attack: .002, decay: .6, sustain: .35, release: .3, clip: .95, lpf: 7000, hpf: 100, effects: { reverb: .2, pan: .15 }, mapping: FIXED }),
  P('e2', 'Open hat', 'rhythm', 'pulse', SAMPLE('machines', '808-open-hat', 0, false), openHat, on(7, 9),
    { ...DRUM, gain: .025, decay: .2, release: .08, clip: .5, lpf: 10000, hpf: 3000, effects: { reverb: .08, pan: -.3 } }),
  P('f1', 'Synth pad', 'harmony', 'sustain', SAMPLE('synths', 'analog-pad'), pad, on(2, 3, 5, 6, 7, 8, 9),
    { octave: 3, gain: .035, attack: .3, decay: .5, sustain: .9, release: .6, clip: 1, lpf: 3500, hpf: 150, effects: { reverb: .3, pan: -.2 }, mapping: FIXED }),
  P('f2', 'Crash', 'rhythm', 'pulse', SAMPLE('machines', '909-crash', 0, false), crash, on(3, 6, 7, 9, 10),
    { ...DRUM, gain: .03, decay: .9, release: .4, clip: 1, lpf: 10000, hpf: 500, effects: { reverb: .18, pan: .25 } }),
  P('g1', 'Gang shouts', 'response', 'phrase', SAMPLE('electronic', 'oh-chant'), shouts, on(3, 6, 7, 9),
    { octave: 3, gain: .04, attack: .004, decay: .3, sustain: .4, release: .15, clip: 1, lpf: 6000, hpf: 200, effects: { reverb: .22, pan: .1 }, mapping: FIXED }),
  P('g2', 'Finger snaps', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), snaps, on(0, 1, 4, 10),
    { ...DRUM, gain: .04, decay: .05, release: .03, clip: .3, lpf: 6000, hpf: 1500, effects: { reverb: .16, pan: .2 } }),
  P('h1', 'Backing vocals', 'harmony', 'sustain', SAMPLE('voices', 'ooh'), ooh, on(2, 5, 8, 9),
    { octave: 3, gain: .038, attack: .1, decay: .4, sustain: .85, release: .35, clip: 1, lpf: 5500, hpf: 150, effects: { reverb: .3, pan: .3 }, mapping: FIXED }),
  P('h2', 'Toms', 'rhythm', 'pulse', SAMPLE('machines', '909-tom', 0, false), toms, on(2, 5, 8),
    { ...DRUM, gain: .06, decay: .3, release: .15, clip: .8, lpf: 6000, hpf: 50, effects: { reverb: .18 } }),
], FORM)

const SECTION_PARAMS = { b1: { 7: { gain: .055 } } }
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'columbus-2013', kitName: 'Indie pop', profileName: 'Indie pop · Columbus 2013',
  bpm: 124, meter: '4/4', root: 'C', scale: 'Chromatic', form: FORM, parts: PARTS,
  reactions: reactions('columbus-2013', { lift: 2, contrast: 4, lament: 5, calm: 7, finale: 6, climax: 4, solo: 4 }),
  reference: 'Indie pop de Columbus no início dos anos 2010 (o ukulele, o piano e as batidas programadas do Twenty One Pilots, nascido nas salas pequenas da cidade); canção original em Lá menor e Dó: ukulele sozinho no começo e no fim, melodia de glockenspiel no verso sobre 808 e estalos de dedos, gancho de sintetizador, pad e piano no refrão com gritos "oh!" em coro, drop com palmas em quatro e chimbal aberto, ponte de piano em meio tempo e subgrave por baixo de tudo.',
  url: 'https://www.britannica.com/topic/Twenty-One-Pilots',
}).catch(error => { console.error(error); process.exit(1) })
