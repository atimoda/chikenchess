// 2004 Berkeley - Alternative rock. Original song in F minor in the spirit of the East Bay rock of 2004
// (Green Day's rock opera year, out of the Berkeley punk scene, and the quiet-loud dynamics of
// alternative rock): a clean guitar with tremolo that opens alone, quiet verses on bass, kick and
// hi-hat, loud choruses with two walls of distorted power chords panned left and right, strings and
// distant backing vocals, a melodic solo with bends, a half-time bridge with feedback, toms and cello,
// and a last chorus that pushes harder. Run: node scripts/blues-jazz-rock/berkeley-2004.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords, chord } = require('./common.cjs')
const C = composer('4/4', 'Chromatic')
const { mel, rep, hits, relative, human, set, up } = C
const KEY = 'F'

const LOOP = ['Fm', 'Ab', 'Eb', 'Bb']
const VERSE = [...LOOP, ...LOOP]
const CHORUS = ['Db', 'Ab', 'Eb', 'Fm', 'Db', 'Ab', 'Eb', 'Fm']
const SOLO = ['Db', 'Ab', 'Eb', 'Fm', 'Db', 'Ab', 'C', 'C']
const BRIDGE = ['Db', 'Db', 'Ab', 'Ab', 'Eb', 'Eb', 'C', 'C']
const OUTRO = ['Fm', 'Ab', 'Eb', 'Fm']
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(LOOP) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Chorus', bars: 8, bank: 2, harmony: R(CHORUS) },
  { label: 'Solo', bars: 8, bank: 3, harmony: R(SOLO) },
  { label: 'Bridge', bars: 8, bank: 4, harmony: R(BRIDGE) },   // half time
  { label: 'Chorus', bars: 8, bank: 5, harmony: R(CHORUS) },
  { label: 'Outro', bars: 4, bank: 6, harmony: R(OUTRO) },
]
const CHORDS = [LOOP, VERSE, CHORUS, SOLO, BRIDGE, CHORUS, OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))
const ACCENT = { accent: { strong: .86, beat: .78, off: .72 } }
// Power-chord roots between C3 and B3 (the rendered samples hold the fifth and the octave).
const low = symbol => { const r = chord(symbol, KEY).root; return r > 6 ? r - 12 : r }
const EIGHTHS = (strong = .9, weak = .68) => Array.from({ length: 8 }, (_, i) => [i / 2, .5, i % 4 === 0 ? strong : i % 2 ? weak : (strong + weak) / 2])

// ---------- c1 Tremolo guitar: clean arpeggios through a tremolo pedal ----------
const ORDER = [0, 2, 1, 2, 0, 2, 1, 2]
const arpeggio = (list, skip = () => false) => voiceLead(list, KEY, { center: 5, size: 3 }).flatMap((v, bar) => {
  const s = [...v].sort((a, b) => a - b)
  return skip(bar) ? [] : ORDER.map((i, k) => ({ start: bar + k / 8, duration: .22, degree: s[i], velocity: k % 4 === 0 ? .66 : .54 }))
})
const tremolo = {
  0: relative(arpeggio(LOOP), H(0)), 1: relative(human(arpeggio(VERSE), .05, 0, 3), H(1)),
  4: relative(arpeggio(BRIDGE, bar => bar >= 6), H(4)), 6: relative(arpeggio(OUTRO, bar => bar === 3).concat([{ start: 3, duration: 1, degree: 0, velocity: .6, release: 1.4, reverb: .45 }]), H(6)),
}

// ---------- b1 Lead guitar: the verse and chorus lines and the solo (semitones above F4) ----------
const VERSE_LINE = 'r:2 7:2 7:1 8:1 7:2 | 3:4~ 0:2 3:2 | 5:3 3:1 2:4~ | 0:6~ r:2 | r:2 12:2 12:1 10:1 7:2 | 7:3 3:1 0:4 | -2:2 2:2 5:2 7:2 | 5:8~'
const CHORUS_LINE = '12:4~ 15:2 12:2 | 10:4~ 7:2 3:2 | 10:2 7:2 5:4~ | 7:6~ r:2 | 15:4~ 17:2 15:2 | 12:3 10:1 7:4 | 5:2 7:2 10:4~ | 12:8~'
const SOLO_LINE = up(mel('12:2 15:2 20:4~^2 | 19:2 15:2 12:2 15:2 | 17:4~^2 14:2 10:2 | 12:2 15:1 17:1 19:4~ | 20:4~^1 19:2 17:2 | 15:2 12:2 15:2 19:2 | 19:4~ 23:2 19:2 | 23:6~^1 r:2', { accent: { strong: .92, beat: .86, off: .8 } }), -12)
const lead = {
  1: relative(set(human(mel(VERSE_LINE, ACCENT), .04, 0, 5), { cutoff: -.2 }), H(1)), 2: relative(human(mel(CHORUS_LINE, ACCENT), .04, 0, 7), H(2)),
  3: relative(human(SOLO_LINE, .05, 0, 9), H(3)), 5: relative(human(mel(CHORUS_LINE, ACCENT), .04, 0, 11), H(5)),
}

// ---------- d1 and e1 Distorted guitars: a Big Muff on the left, a high-gain stack on the right ----------
const wall = (variant) => each((list, bank) => {
  const lows = list.map(s => [low(s)])
  if (bank === 0 || bank === 1) return null
  if (bank === 4) return relative(onChords(C, lows, bar => bar < 6 ? [] : bar === 6 ? [[0, 4, .8]] : EIGHTHS(.86, .7), { gate: .98 }), H(4))
  if (bank === 6) return relative(onChords(C, lows, bar => bar === 3 ? [[0, 4, .95, { release: 1.4 }]] : EIGHTHS(), { gate: .98 }), H(6))
  return relative(human(onChords(C, lows, variant ? EIGHTHS(.92, .7) : [[0, 1.5, .9], [1.5, 1, .82], [2.5, 1.5, .88]], { gate: .98 }), .04, 0, bank + 13 + variant), H(bank))
})

// ---------- f1 Strings and h1 Feedback guitar ----------
const strings = Object.fromEntries([[2, CHORUS], [4, BRIDGE], [5, CHORUS]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: bank === 4 ? -5 : 7, size: bank === 4 ? 1 : 3 }), [[0, 4, bank === 5 ? .66 : .56]], { gate: .98 }), H(bank))]))
const feedback = {
  4: relative(mel('r:8 | 19:8~ | r:8 | 15:8~ | r:8 | 17:8~^-12 | 19:8~ | 23:8~^12', { accent: { strong: .7, beat: .7, off: .7 } }), H(4)),
  5: relative(mel('24:8~ | r:8 | r:8 | 19:8~ | 24:8~ | r:8 | r:8 | 24:8~', { accent: { strong: .62, beat: .62, off: .62 } }), H(5)),
  6: relative(mel('r:8 | r:8 | r:8 | 24:8~^-12*', { accent: { strong: .6, beat: .6, off: .6 } }), H(6)),
}

// ---------- g1 Backing vocals: distant "aah" in the choruses ----------
const vocals = Object.fromEntries([[2, CHORUS], [5, CHORUS]].map(([bank, list]) =>
  [bank, relative(onChords(C, voiceLead(list, KEY, { center: 7, size: 3 }), [[0, 3.9, .54]], { gate: .98 }), H(bank))]))

// ---------- a1 Bass guitar ----------
const bass = each((list, bank) => {
  const lows = list.map(s => [low(s)])
  if (bank === 0) return null
  if (bank === 1) return relative(human(onChords(C, lows, [[0, 1.4, .8], [1.5, .5, .66], [2, 1.9, .74]], { gate: .9 }), .05, 0, 21), H(1))
  if (bank === 4) return relative(onChords(C, lows, bar => bar < 6 ? [[0, 4, .78]] : EIGHTHS(.86, .7), { gate: .95 }), H(4))
  if (bank === 6) return relative(onChords(C, lows, bar => bar === 3 ? [[0, 4, .95, { release: 1.2 }]] : EIGHTHS(), { gate: .85 }), H(6))
  return relative(human(onChords(C, lows, EIGHTHS(.9, .7), { gate: .85 }), .05, 0, bank + 23), H(bank))
})

// ---------- drums: quiet verse, loud chorus, half-time bridge ----------
const kick = {
  1: hits(rep('x..x..x. | x..x....', 4)), 2: hits(rep('x..xx.x.', 8)), 3: hits(rep('x..xx.x.', 8)),
  4: hits(rep('x.......', 4) + ' | ' + rep('x..x....', 2) + ' | x.x.x.x. | xxxxxxxx'), 5: hits(rep('x.xxx.x.', 8)), 6: hits(rep('x..xx.x.', 3) + ' | X.......'),
}
const snare = {
  1: hits(rep('........', 7) + ' | ......xx'), 2: hits(rep('..x...x.', 7) + ' | ..x.xxRR'), 3: hits(rep('..x...x.', 7) + ' | ..x.RRRR'),
  4: hits(rep('....x...', 6) + ' | ..x...x. | xxxxRRRR'), 5: hits(rep('..x...x.', 7) + ' | ..x.xxRR'), 6: hits(rep('..x...x.', 3) + ' | X.......'),
}
const hat = { 0: hits('........ | ........ | ........ | ......xx'), 1: hits(rep('xgxgxgxg', 8)), 4: hits(rep('x.x.x.x.', 6) + ' | ........ | ........') }
const crashRide = { 2: hits(rep('xgxgxgxg', 8)), 3: hits(rep('xgxgxgxg', 8)), 5: hits(rep('xxxxxxxx', 8)), 6: hits(rep('xgxgxgxg', 3) + ' | ........') }
const crash = { 2: hits('X.......'), 3: hits('X.......'), 4: hits(rep('........', 6) + ' | X....... | ........'), 5: hits('X....... | ........ | ........ | ........ | X.......'), 6: hits('........ | ........ | ........ | X.......') }
const toms = { 4: hits('X..x..X. | ..x.X... | X..x..X. | ..x.XxRR | X..x..X. | ..x.X... | ........ | ........'), 2: hits(rep('........', 7) + ' | ....xxRR') }
const tambourine = { 5: hits(rep('..x...x.', 8)) }
const rim = { 1: hits(rep('..x...x.', 7) + ' | ........') }

const PARTS = present([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('amps', 'rock-bass'), bass, on(...ALL),
    { octave: 2, gain: .2, attack: .003, decay: .35, sustain: .6, release: .1, clip: 1, lpf: 3000, hpf: 30, effects: { reverb: .06 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), kick, on(...ALL),
    { ...DRUM, gain: .1, decay: .3, release: .1, clip: .8, lpf: 2800, hpf: 30, effects: { reverb: .1 } }),
  P('b1', 'Lead guitar', 'melody', 'phrase', SAMPLE('amps', 'lead'), lead, on(1, 2, 3, 4, 5, 7),
    { octave: 4, gain: .045, attack: .004, decay: .5, sustain: .75, release: .25, clip: 1, lpf: 6500, hpf: 130, effects: { reverb: .2, delay: .15, pan: .05 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5.4, vibratoDepth: .14 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 0, false), snare, on(...ALL),
    { ...DRUM, gain: .068, decay: .2, release: .1, clip: .75, lpf: 7000, hpf: 140, effects: { reverb: .24 } }),
  P('c1', 'Tremolo guitar', 'harmony', 'phrase', SAMPLE('amps', 'chorus'), tremolo, on(0, 1, 3, 6, 8),
    { octave: 3, gain: .05, attack: .003, decay: .5, sustain: .4, release: .3, clip: 1, lpf: 6500, hpf: 150, effects: { reverb: .28, delay: .2, pan: -.15 }, mapping: FIXED,
      design: { lfoTarget: 'gain', lfoRate: 5.5, lfoUnit: 'hz', lfoDepth: .55, lfoShape: 'sine' } }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 0, false), hat, on(0, 1, 3, 6),
    { ...DRUM, gain: .028, decay: .06, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .08, pan: .3 } }),
  P('d1', 'Fuzz guitar', 'harmony', 'phrase', SAMPLE('amps', 'power', 1), wall(0), on(2, 4, 5, 6, 7, 8),
    { octave: 3, gain: .04, attack: .003, decay: .5, sustain: .85, release: .15, clip: 1, lpf: 5200, hpf: 90, effects: { reverb: .12, pan: -.6 }, mapping: FIXED }),
  P('d2', 'Crash ride', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 1, false), crashRide, on(2, 4, 5, 7, 8),
    { ...DRUM, gain: .02, decay: .35, release: .12, clip: .5, lpf: 9000, hpf: 600, effects: { reverb: .12, pan: -.3 } }),
  P('e1', 'Distorted guitar', 'harmony', 'phrase', SAMPLE('amps', 'power', 0), wall(1), on(2, 4, 5, 6, 7, 8),
    { octave: 3, gain: .036, attack: .003, decay: .4, sustain: .8, release: .12, clip: 1, lpf: 5500, hpf: 100, effects: { reverb: .1, pan: .6 }, mapping: FIXED }),
  P('e2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(2, 4, 5, 6, 7, 8),
    { ...DRUM, gain: .036, decay: .9, release: .4, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .18, pan: .25 } }),
  P('f1', 'Strings', 'harmony', 'sustain', SAMPLE('classical', 'cello-sustain', 1), strings, on(2, 4, 6, 7),
    { octave: 3, gain: .045, attack: .2, decay: .5, sustain: .9, release: .5, clip: 1, lpf: 5000, hpf: 70, effects: { reverb: .3, pan: .2 }, mapping: FIXED, design: { vibrato: 5.2, vibratoDepth: .12 } }),
  P('f2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 0, false), toms, on(2, 4, 6),
    { ...DRUM, gain: .075, decay: .45, release: .2, clip: .9, lpf: 4500, hpf: 40, effects: { reverb: .26 } }),
  P('g1', 'Backing vocals', 'harmony', 'sustain', SAMPLE('voices', 'aah'), vocals, on(2, 4, 7),
    { octave: 3, gain: .035, attack: .12, decay: .4, sustain: .85, release: .4, clip: 1, lpf: 5000, hpf: 250, effects: { reverb: .4, pan: -.3 }, mapping: FIXED }),
  P('g2', 'Tambourine', 'rhythm', 'pulse', SAMPLE('percussion', 'tambourine', 0, false), tambourine, on(7),
    { ...DRUM, gain: .028, decay: .14, release: .08, clip: .5, lpf: 9000, hpf: 1500, effects: { reverb: .14, pan: .35 } }),
  P('h1', 'Feedback guitar', 'response', 'sustain', SAMPLE('amps', 'fuzz'), feedback, on(6, 7, 8),
    { octave: 3, gain: .03, attack: .5, decay: .5, sustain: .9, release: .8, clip: 1, lpf: 5000, hpf: 300, effects: { reverb: .35, delay: .3, pan: .4 }, mapping: FIXED,
      design: { vibrato: 4.5, vibratoDepth: .2 } }),
  P('h2', 'Rim', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), rim, on(1, 3),
    { ...DRUM, gain: .035, decay: .08, release: .04, clip: .4, lpf: 7000, hpf: 400, effects: { reverb: .16 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 1: { gain: .036 }, 5: { gain: .055, reverbRange: { first: .22, second: .3 } } },
  d1: { 7: { gain: .046 } }, e1: { 7: { gain: .042 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'berkeley-2004', kitName: 'Alternative rock', profileName: 'Alternative rock · Berkeley 2004',
  bpm: 84, meter: '4/4', root: 'F', scale: 'Chromatic', form: FORM, parts: PARTS,
  reactions: reactions('berkeley-2004', { lift: 2, contrast: 2, lament: 4, calm: 1, finale: 6, climax: 5, solo: 3 }),
  reference: 'Rock da East Bay em 2004 (o ano da ópera-rock do Green Day, saído da cena punk de Berkeley, e as dinâmicas silêncio-explosão do rock alternativo); canção original em Fá menor: guitarra limpa com tremolo abrindo sozinha, versos quietos com baixo, bumbo e chimbal, refrões altos com duas paredes de power chords distorcidos à esquerda e à direita, cordas e vocais de apoio distantes, solo melódico com bends, ponte em meio tempo com microfonia, tons e violoncelo, e o último refrão mais intenso.',
  url: 'https://www.britannica.com/art/alternative-rock',
}).catch(error => { console.error(error); process.exit(1) })
