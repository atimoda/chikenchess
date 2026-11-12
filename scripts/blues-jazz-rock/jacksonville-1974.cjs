// 1974 Jacksonville - Southern rock. Original song in D Mixolydian in the spirit of the Jacksonville
// bands of the early 1970s (Lynyrd Skynyrd, the Allman Brothers' twin guitars, Duane Allman's slide):
// a laid-back four with a little swing, the I-bVII-IV riff on crunchy Marshall guitars, a bottleneck
// slide that sings the verse, female backing vocals and a Hammond on the chorus, a twin-guitar solo in
// harmonized thirds, a honky-tonk piano solo and a jam on the riff to close.
// Run: node scripts/blues-jazz-rock/jacksonville-1974.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords, chord } = require('./common.cjs')
const C = composer('4/4', 'Chromatic', { swing: .55 })
const { mel, rep, hits, relative, human, set, up } = C
const KEY = 'D'

const RIFF = ['D', 'C', 'G', 'G']
const VERSE = [...RIFF, ...RIFF]
const CHORUS = ['G', 'D', 'A', 'D', 'G', 'D', 'A', 'A']
const SOLO = [...VERSE, ...VERSE]
const OUTRO = ['D', 'C', 'G', 'G', 'D', 'C', 'G', 'D']
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(RIFF) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },
  { label: 'Solo', bars: 16, bank: 3, harmony: R(SOLO) },     // twin guitars in thirds
  { label: 'Solo', bars: 8, bank: 4, harmony: R(VERSE) },     // honky-tonk piano
  { label: 'Chorus', bars: 8, bank: 5, harmony: R(CHORUS) },
  { label: 'Outro', bars: 8, bank: 6, harmony: R(OUTRO) },
]
const CHORDS = [RIFF, VERSE, CHORUS, SOLO, VERSE, CHORUS, OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))
const ACCENT = { accent: { strong: .86, beat: .8, off: .72 } }

// D Mixolydian, for the harmony guitar a diatonic third below the lead.
const MIXO = [0, 2, 4, 5, 7, 9, 10]
const thirdBelow = semi => {
  const octave = Math.floor(semi / 12), step = MIXO.indexOf(((semi % 12) + 12) % 12)
  if (step < 0) return semi - 3
  const target = step - 2
  return 12 * (octave + Math.floor(target / 7)) + MIXO[(target + 7) % 7]
}

// ---------- b1 Lead guitar: the hook, the chorus line and the top of the twin solo (semitones above D4) ----------
const HOOK = '7:1 9:1 12:2 9:1 7:1 4:2 | 5:1 7:1 10:2 7:1 5:1 2:2 | 9:1 12:1 14:2 12:1 9:1 7:2 | 5:2 2:2 0:4~'
const CHORUS_LINE = '12:3 14:1 12:2 9:2 | 12:4~ 16:4^-2 | 14:3 12:1 11:2 7:2 | 7:2 12:6~ | 17:3^-2 16:1 14:2 12:2 | 12:4~ 9:2 7:2 | 11:3 14:1 19:4~^-2 | 16:2 14:2 11:2 9:2'
const TWIN = mel([
  '12:1 14:1 16:1 19:1 16:2 12:2', '17:2 14:1 10:1 14:2 17:2', '19:3 17:1 14:2 12:2', '14:1 12:1 9:1 7:1 9:4~',
  '16:2 19:2 21:2 19:2', '17:4~ 14:2 10:2', '12:1 14:1 17:1 19:1 21:2 19:2', '17:8~',
  '24:3^-2 21:1 19:2 16:2', '17:2 14:2 17:2 22:2', '21:4~ 19:2 17:2', '14:2 12:2 9:2 12:2',
  '16:1 19:1 21:1 24:1 21:1 19:1 16:2', '17:3 14:1 10:4~', '12:2 14:2 17:2 21:2', '19:4~ 17:2 14:2',
].join('|'), { accent: { strong: .9, beat: .84, off: .78 } })
const twinTop = up(TWIN, -12)
const lead = {
  0: relative(mel(HOOK, ACCENT), H(0)), 2: relative(human(mel(CHORUS_LINE, ACCENT), .04, 0, 3), H(2)),
  3: relative(human(twinTop, .04, 0, 5), H(3)), 5: relative(human(mel(CHORUS_LINE, ACCENT), .04, 0, 7), H(5)),
  6: relative(mel(`${HOOK} | ${HOOK.split(' | ').slice(0, 3).join(' | ')} | 0:8*`, ACCENT), H(6)),
}
// e1 Second lead guitar: the harmony a third below in the solo, the hook in octaves at the end.
const harmony = { 3: relative(human(twinTop.map(n => ({ ...n, degree: thirdBelow(n.degree) })), .04, .002, 9), H(3)),
  6: relative(set(up(mel(`${HOOK} | ${HOOK.split(' | ').slice(0, 3).join(' | ')} | 0:8*`, ACCENT), -12), { velocity: .7 }), H(6)) }

// ---------- d1 Slide guitar: sings the verse and answers the chorus (semitones above D4) ----------
const VERSE_SLIDE = 'r:2 7:2^-2 9:2 7:2 | 10:3^-2 7:1 5:4~ | r:2 9:2 12:2 9:2 | 7:6~^-2 5:2 | r:2 12:2^-2 14:2 12:2 | 10:4~ 7:2 5:2 | 2:2 5:2 7:2 9:2 | 7:8~^-2'
const slide = {
  1: relative(human(C.portamento(mel(VERSE_SLIDE, ACCENT), 3, .12, 1), .05, 0, 11), H(1)),
  2: relative(mel('r:8 | r:8 | r:8 | r:4 16:4~^-3 | r:8 | r:8 | r:8 | r:4 19:4~^-4', ACCENT), H(2)),
  5: relative(mel('r:8 | r:4 16:4~^-3 | r:8 | r:4 12:4~^-2 | r:8 | r:4 16:4~^-3 | r:8 | r:4 19:4~^-4', ACCENT), H(5)),
  6: relative(mel('r:8 | r:8 | r:8 | r:8 | 12:6~^-5 9:2 | 10:4~^-2 7:4 | 9:4~^-2 7:2 5:2 | 7:8~*', ACCENT), H(6)),
}

// ---------- c1 Rhythm guitar: crunchy open chords ----------
const CHUG = [[0, .4, .82], [1.5, .4, .7], [2, .4, .76], [3, .4, .68], [3.5, .4, .66]]
const rhythm = each((list, bank) => {
  const voices = voiceLead(list, KEY, { center: 5, size: 3 })
  const pattern = bank === 0 ? bar => bar < 2 ? [] : CHUG : bank === 4 ? [[0, .4, .7], [2, .4, .66]] : bank === 6 ? bar => bar === 7 ? [[0, 4, .86, { release: 1.2 }]] : CHUG : CHUG
  return relative(human(C.strum(onChords(C, voices, pattern, { gate: .85 })), .05, 0, bank + 13), H(bank))
})

// ---------- f1 Honky-tonk piano: fills, then the solo (semitones above D4) ----------
const PIANO_SOLO = [
  '16,19:1 16,19:1 r:1 16,19:1 r:1 16,19:1 12:2', '14,17:1x2 14,17:1 r:2 10:1 7:1 5:2', '9,12:2 9,12:1 9,12:1 r:2 7:1 5:1', '2:1 5:1 7:1 9:1 12:4~',
  '19:1 18:1 16:1 12:1 16:1 18:1 19:2', '17:2 16:1 14:1 10:2 7:2', '12,17:2 12,17:2 12,17:2 12,17:2', '21:1 19:1 17:1 14:1 12:4~',
].join('|')
const piano = each((list, bank) => {
  if (bank === 4) return relative(human(mel(PIANO_SOLO, { accent: { strong: .88, beat: .8, off: .72 } }), .06, 0, 15), H(4))
  if (bank === 0 || bank === 3) return null
  const voices = voiceLead(list, KEY, { center: 12, size: 3 })
  return relative(human(onChords(C, voices, [[1, .4, .56], [2.5, .4, .5], [3, .4, .54]], { gate: .8 }), .06, 0, bank + 17), H(bank))
})

// ---------- g1 Hammond organ and h1 Backing vocals ----------
const organ = Object.fromEntries([[2, CHORUS], [3, SOLO], [4, VERSE], [5, CHORUS], [6, OUTRO]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: 2, size: 4 }), bank === 6 ? bar => bar === 7 ? [[0, 4, .66, { release: 1.2 }]] : [[0, 4, .5]] : [[0, 4, .55]], { gate: .98 }), H(bank))]))
const vocals = Object.fromEntries([[2, CHORUS], [5, CHORUS]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: 7, size: 3 }), bar => bar % 2 ? [[0, 1.8, .6], [2, 1.8, .56]] : [[0, 3.8, .62]], { gate: .98 }), H(bank))]))

// ---------- a1 Bass guitar ----------
const bassLine = list => list.map((symbol, bar) => {
  const r = chord(symbol, KEY).root, low = r > 7 ? r - 12 : r
  return bar % 2 ? `${low}:3 ${low}:1 ${low + 7}:2 ${low + 5}:1 ${low + 4}:1` : `${low}:3 ${low}:1 ${low}:2 ${low + 7}:2`
}).join(' | ')
const bass = each((list, bank) => {
  if (bank === 0) return relative(mel(`r:8 | r:8 | ${bassLine(list.slice(2))}`), H(0))
  if (bank === 6) return relative(mel(`${bassLine(OUTRO.slice(0, 7))} | 0:8*`), H(6))
  return relative(human(mel(bassLine(list)), .05, 0, bank + 21), H(bank))
})

// ---------- drums ----------
const bars = bank => FORM.find(s => s.bank === bank).bars
const KICK = 'x...x..x', SNARE = '..x...x.', HAT = 'xgxgxgxg'
const groove = (pattern, fill) => Object.fromEntries([1, 2, 3, 4, 5].map(b => [b, hits(rep(pattern, bars(b) - 1) + ' | ' + (fill ?? pattern))]))
const kick = { ...groove(KICK), 0: hits('........ | ........ | x...x..x | x...x...'), 6: hits(rep(KICK, 7) + ' | X.......') }
const snare = { ...groove(SNARE, '..x.xxRR'), 0: hits('........ | ........ | ..x...x. | ..x.RRRR'), 6: hits(rep(SNARE, 7) + ' | X.......') }
const hat = { 1: hits(rep(HAT, 8)), 3: hits(rep(HAT, 16)), 4: hits(rep(HAT, 8)), 0: hits('........ | ........ | xgxgxgxg | xgxgxgxg') }
const ride = { 2: hits(rep('x.x.x.x.', 8)), 5: hits(rep('x.x.x.x.', 8)), 6: hits(rep('x.x.x.x.', 7) + ' | ........') }
const crash = { 1: hits('X.......'), 2: hits('X.......'), 3: hits('X.......'), 5: hits('X.......'), 6: hits(rep('........', 7) + ' | X.......') }
const toms = { 2: hits(rep('........', 7) + ' | ....xxRR'), 3: hits(rep('........', 15) + ' | ..xxxxRR'), 5: hits(rep('........', 7) + ' | ....XxRR') }
const tambourine = { 2: hits(rep('..x...x.', 8)), 5: hits(rep('..x...x.', 8)), 6: hits(rep('..x...x.', 8)) }
const shaker = { 1: hits(rep('gxgxgxgx', 8)), 4: hits(rep('gxgxgxgx', 8)) }

const PARTS = present([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('guitars', 'bass', 0), bass, on(...ALL),
    { octave: 2, gain: .26, attack: .005, decay: .45, sustain: .55, release: .14, clip: 1, lpf: 2200, hpf: 30, effects: { reverb: .06 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), kick, on(...ALL),
    { ...DRUM, gain: .09, decay: .3, release: .1, clip: .8, lpf: 2600, hpf: 30, effects: { reverb: .1 } }),
  P('b1', 'Lead guitar', 'melody', 'phrase', SAMPLE('amps', 'lead'), lead, on(0, 2, 4, 5, 7, 8),
    { octave: 4, gain: .05, attack: .004, decay: .5, sustain: .75, release: .25, clip: 1, lpf: 6500, hpf: 120, effects: { reverb: .18, pan: -.25 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5.6, vibratoDepth: .16 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 0, false), snare, on(...ALL),
    { ...DRUM, gain: .06, decay: .18, release: .1, clip: .7, lpf: 7000, hpf: 150, effects: { reverb: .2 } }),
  P('c1', 'Rhythm guitar', 'harmony', 'phrase', SAMPLE('amps', 'crunch'), rhythm, on(...ALL),
    { octave: 3, gain: .032, attack: .003, decay: .35, sustain: .5, release: .12, clip: 1, lpf: 5500, hpf: 110, effects: { reverb: .14, pan: .4 }, mapping: FIXED }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 0, false), hat, on(0, 1, 3, 5, 6),
    { ...DRUM, gain: .028, decay: .06, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .08, pan: .3 } }),
  P('d1', 'Slide guitar', 'melody', 'phrase', SAMPLE('amps', 'tweed'), slide, on(1, 2, 3, 4, 7, 8),
    { octave: 4, gain: .05, attack: .006, decay: .5, sustain: .75, release: .3, clip: 1, lpf: 6000, hpf: 140, effects: { reverb: .22, pan: .2 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5, vibratoDepth: .22 } }),
  P('d2', 'Ride', 'rhythm', 'pulse', SAMPLE('percussion', 'ride', 0, false), ride, on(2, 4, 7, 8),
    { ...DRUM, gain: .03, decay: .4, release: .2, clip: .7, lpf: 9000, hpf: 400, effects: { reverb: .14, pan: -.25 } }),
  P('e1', 'Second lead guitar', 'response', 'phrase', SAMPLE('amps', 'lead'), harmony, on(5, 8),
    { octave: 4, gain: .042, attack: .004, decay: .5, sustain: .75, release: .25, clip: 1, lpf: 6000, hpf: 120, effects: { reverb: .18, pan: .3 }, mapping: FIXED,
      design: { vibrato: 5.2, vibratoDepth: .14 } }),
  P('e2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(1, 2, 3, 4, 5, 7, 8),
    { ...DRUM, gain: .035, decay: .9, release: .4, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .18, pan: .25 } }),
  P('f1', 'Honky-tonk piano', 'response', 'phrase', SAMPLE('band', 'piano', 1), piano, on(1, 2, 3, 4, 6, 7, 8),
    { octave: 4, gain: .045, attack: .002, decay: .5, sustain: .3, release: .2, clip: .95, lpf: 7000, hpf: 150, effects: { reverb: .14, pan: -.35 }, mapping: FIXED,
      design: { vibrato: 6, vibratoDepth: .06 } }),
  P('f2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 0, false), toms, on(2, 4, 5, 7),
    { ...DRUM, gain: .07, decay: .4, release: .2, clip: .9, lpf: 4500, hpf: 40, effects: { reverb: .22 } }),
  P('g1', 'Hammond organ', 'harmony', 'sustain', SAMPLE('keys', 'organ'), organ, on(2, 4, 5, 6, 7, 8),
    { octave: 4, gain: .035, attack: .02, decay: .3, sustain: .9, release: .2, clip: 1, lpf: 4500, hpf: 90, effects: { reverb: .2, pan: -.1 }, mapping: FIXED,
      design: { lfoTarget: 'gain', lfoRate: 6.4, lfoUnit: 'hz', lfoDepth: .12, lfoShape: 'sine' } }),
  P('g2', 'Tambourine', 'rhythm', 'pulse', SAMPLE('percussion', 'tambourine', 0, false), tambourine, on(2, 4, 7, 8),
    { ...DRUM, gain: .03, decay: .15, release: .08, clip: .5, lpf: 9000, hpf: 1500, effects: { reverb: .14, pan: -.35 } }),
  P('h1', 'Backing vocals', 'harmony', 'sustain', SAMPLE('voices', 'aah'), vocals, on(2, 4, 7),
    { octave: 4, gain: .04, attack: .08, decay: .4, sustain: .85, release: .3, clip: 1, lpf: 6000, hpf: 180, effects: { reverb: .26, pan: .35 }, mapping: FIXED }),
  P('h2', 'Shaker', 'rhythm', 'pulse', SAMPLE('percussion', 'shaker', 0, false), shaker, on(1, 3, 6),
    { ...DRUM, gain: .02, decay: .08, release: .05, clip: .4, lpf: 9000, hpf: 2000, effects: { reverb: .1, pan: .35 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 5: { gain: .058, reverbRange: { first: .2, second: .26 } } },
  e1: { 5: { gain: .048 } },
  f1: { 6: { gain: .06 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'jacksonville-1974', kitName: 'Southern rock', profileName: 'Southern rock · Jacksonville 1974',
  bpm: 98, meter: '4/4', root: 'D', scale: 'Chromatic', form: FORM, parts: PARTS, grid: 192,
  reactions: reactions('jacksonville-1974', { lift: 2, contrast: 2, lament: 4, calm: 1, finale: 6, climax: 3, solo: 3 }),
  reference: 'Bandas de Jacksonville no início dos anos 1970 (Lynyrd Skynyrd, as guitarras gêmeas dos Allman Brothers, o slide de Duane Allman); canção original em Ré mixolídio: quatro tempos relaxados com leve swing, o riff I–bVII–IV em guitarras Marshall com crunch, slide de gargalo cantando o verso, vocais de apoio femininos e Hammond no refrão, solo de duas guitarras em terças, solo de piano honky-tonk e jam no riff para fechar.',
  url: 'https://www.britannica.com/art/Southern-rock',
}).catch(error => { console.error(error); process.exit(1) })
