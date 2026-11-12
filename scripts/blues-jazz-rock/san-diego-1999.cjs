// 1999 San Diego - Pop punk. Original song in D major on the I-V-vi-IV changes in the spirit of the San
// Diego skate-punk scene of the late 1990s (Blink-182, from just up the road in Poway, and the bands of
// the Warped Tour): palm-muted power chords on the verse, a pre-chorus that builds on the toms, a
// chorus of open high-gain power chords with a skate beat, gang "whoa-oh" vocals and an octave
// guitar hook, a short melodic solo, a half-time bridge with a clean chorus guitar and hand claps, a
// double last chorus and a stop ending. Run: node scripts/blues-jazz-rock/san-diego-1999.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords, chord } = require('./common.cjs')
const C = composer('4/4', 'Chromatic')
const { mel, rep, hits, relative, human, set, up } = C
const KEY = 'D'

const LOOP = ['D', 'A', 'Bm', 'G']
const VERSE = [...LOOP, ...LOOP]
const PRE = ['Em', 'G', 'A', 'A']
const CHORUS = ['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A']
const BRIDGE = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'D', 'A']
const OUTRO = ['G', 'A', 'D', 'D']
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(LOOP) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Pre-Chorus', bars: 4, bank: 2, harmony: R(PRE) },
  { label: 'Chorus', bars: 8, bank: 3, harmony: R(CHORUS) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(VERSE) },
  { label: 'Pre-Chorus', bars: 4, bank: 2, harmony: R(PRE) },
  { label: 'Chorus', bars: 8, bank: 3, harmony: R(CHORUS) },
  { label: 'Solo', bars: 8, bank: 6, harmony: R(VERSE) },
  { label: 'Bridge', bars: 8, bank: 4, harmony: R(BRIDGE) },        // half time
  { label: 'Chorus', bars: 16, bank: 5, harmony: R([...CHORUS, ...CHORUS]) },
  { label: 'Outro', bars: 4, bank: 7, harmony: R(OUTRO) },
]
const CHORDS = [LOOP, VERSE, PRE, CHORUS, BRIDGE, [...CHORUS, ...CHORUS], VERSE, OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))
const bars = bank => FORM.find(s => s.bank === bank).bars
// Power-chord roots between G2 and E3; the rendered samples already hold the fifth and the octave.
const low = symbol => { const r = chord(symbol, KEY).root; return r > 4 ? r - 12 : r }
const EIGHTHS = (velocities = [.86, .62, .72, .62, .8, .62, .72, .62]) => velocities.map((v, i) => [i / 2, .5, v])
const ACCENT = { accent: { strong: .9, beat: .82, off: .74 } }

// ---------- b1 Lead guitar: the intro riff, the verse line and the solo (semitones above D4) ----------
const INTRO_RIFF = '16:1 14:1 12:1 14:1 16:2 12:2 | 14:1 12:1 9:1 12:1 14:2 9:2 | 14:1 12:1 11:1 9:1 11:2 14:2 | 12:4 11:2 9:2'
const VERSE_LINE = 'r:2 4:1 4:1 4:2 2:1 0:1 | 2:3 4:1 2:2 r:2 | r:2 2:1 2:1 2:2 0:1 -1:1 | -3:4~ r:4 | r:2 4:1 4:1 7:2 4:1 2:1 | 4:3 2:1 -1:2 r:2 | r:2 -1:1 -1:1 2:2 4:2 | 2:6~ r:2'
const SOLO = '12:2 14:1 16:1 19:2 16:2 | 14:2 16:1 14:1 11:2 9:2 | 14:3 16:1 14:2 11:2 | 12:2 11:1 9:1 7:4~ | 19:2 21:1 19:1 16:2 12:2 | 16:2 14:1 11:1 9:2 7:2 | 9:1 11:1 14:1 16:1 14:2 11:2 | 12:6~ 14:2'
const lead = {
  0: relative(mel(INTRO_RIFF, ACCENT), H(0)), 1: relative(human(mel(VERSE_LINE, ACCENT), .04, 0, 3), H(1)),
  2: relative(mel('14:8~ | 12:8~ | 11:8~ | 11:4 r:4', ACCENT), H(2)), 6: relative(human(mel(SOLO, ACCENT), .05, 0, 5), H(6)),
}

// ---------- g1 Octave guitar: the chorus hook in octaves ----------
const HOOK = '16:2 14:2 12:2 9:2 | 7:2 9:2 11:2 14:2 | 14:2 11:2 9:2 14:2 | 12:6~ 9:2 | 16:2 14:2 12:2 9:2 | 7:2 9:2 11:2 16:2 | 14:2 12:2 9:2 7:2 | 9:4 11:4'
const octaves = notes => [...notes, ...set(up(notes, -12), { velocity: .7 })]
const hook = { 3: relative(octaves(mel(HOOK, ACCENT)), H(3)), 5: relative(octaves(mel(`${HOOK} | ${HOOK}`, ACCENT)), H(5)), 0: relative(octaves(mel(INTRO_RIFF, ACCENT)).filter(n => n.start >= 2), H(0)) }

// ---------- c1 Palm-muted guitar and d1 Power chords ----------
const chug = each((list, bank) => {
  if (![0, 1, 6].includes(bank)) return null
  const notes = onChords(C, list.map(s => [low(s)]), bank === 0 ? bar => bar < 2 ? [] : EIGHTHS() : EIGHTHS(), { gate: .9 })
  return relative(human(notes, .05, 0, bank + 7), H(bank))
})
const power = each((list, bank) => {
  const lows = list.map(s => [low(s)])
  if (bank === 0 || bank === 1) return null
  if (bank === 2) return relative(onChords(C, lows, bar => bar === 3 ? EIGHTHS([.8, .7, .82, .72, .86, .76, .9, .8]) : [[0, 4, .82]], { gate: .98 }), H(2))
  if (bank === 4) return relative(onChords(C, lows, bar => bar < 4 ? [] : bar < 6 ? [[0, 4, .78]] : EIGHTHS(), { gate: .98 }), H(4))
  if (bank === 7) return relative(onChords(C, lows, bar => bar < 2 ? EIGHTHS() : bar === 2 ? [[0, 4, .95, { release: 1.4, reverb: .4 }]] : [], { gate: .98 }), H(7))
  return relative(human(onChords(C, lows, EIGHTHS([.9, .66, .74, .66, .84, .66, .74, .66]), { gate: .98 }), .04, 0, bank + 9), H(bank))
})

// ---------- e1 Clean guitar: chorus-pedal arpeggios in the bridge ----------
const clean = { 4: relative(voiceLead(BRIDGE, KEY, { center: 9, size: 3 }).flatMap((v, bar) => {
  const s = [...v].sort((a, b) => a - b), order = [0, 1, 2, 1, 0, 1, 2, 1]
  return bar >= 6 ? [] : order.map((i, k) => ({ start: bar + k / 8, duration: .18, degree: s[i], velocity: k % 2 ? .5 : .6 }))
}), H(4)) }

// ---------- f1 Gang vocals ("whoa-oh", unison and the octave below) and h1 Backing "ooh" ----------
const WHOA = '12:6~ 11:1 9:1 | 9:4 7:4~ | 7:2 9:6~ | 7:4 5:4 | 12:6~ 11:1 9:1 | 9:4 7:4~ | 7:2 9:2 12:4 | 11:4~ 9:2 7:2'
const gang = notes => [...notes, ...set(up(notes, -12), { velocity: .78 })]
const whoa = {
  2: relative(onChords(C, voiceLead(PRE, KEY, { center: 7, size: 3 }), [[0, 4, .6]], { gate: .98 }), H(2)),
  3: relative(gang(human(mel(WHOA, ACCENT), .05, 0, 11)), H(3)), 5: relative(gang(human(mel(`${WHOA} | ${WHOA}`, ACCENT), .05, 0, 13)), H(5)),
}
const ooh = {
  4: relative(onChords(C, voiceLead(BRIDGE, KEY, { center: 9, size: 3 }), [[0, 4, .56]], { gate: .98 }), H(4)),
  1: relative(onChords(C, voiceLead(VERSE, KEY, { center: 9, size: 3 }), bar => bar < 4 ? [] : [[0, 4, .46]], { gate: .98 }), H(1)),
}

// ---------- a1 Bass guitar: driving eighths ----------
const bass = each((list, bank) => {
  const lows = list.map(s => [low(s)])
  if (bank === 0) return relative(onChords(C, lows, bar => bar < 2 ? [] : EIGHTHS([.86, .66, .74, .66, .8, .66, .74, .66]), { gate: .85 }), H(0))
  if (bank === 4) return relative(onChords(C, lows, bar => bar < 4 ? [[0, 2, .8], [2, 2, .72]] : bar < 6 ? [[0, 1, .8], [1.5, .5, .7], [2, 1, .76], [3.5, .5, .7]] : EIGHTHS(), { gate: .9 }), H(4))
  if (bank === 7) return relative(onChords(C, lows, bar => bar < 2 ? EIGHTHS() : bar === 2 ? [[0, 4, .95, { release: 1.2 }]] : [], { gate: .9 }), H(7))
  return relative(human(onChords(C, lows, EIGHTHS([.88, .66, .74, .66, .82, .66, .74, .66]), { gate: .85 }), .05, 0, bank + 21), H(bank))
})

// ---------- drums: backbeat in the verse, skate beat in the chorus ----------
const V_KICK = 'x..xx...', V_SNARE = '..x...x.', SKATE_KICK = 'x.x.x.x.', SKATE_SNARE = '.x.x.x.x'
const kick = {
  0: hits('........ | ........ | x..xx... | x.x.x.x.'), 1: hits(rep(V_KICK, 8)), 2: hits(rep('x.x.x.x.', 4)), 3: hits(rep(SKATE_KICK, 8)),
  4: hits(rep('x.......', 4) + ' | ' + rep('x..xx...', 2) + ' | ' + rep('x.x.x.x.', 2)), 5: hits(rep(SKATE_KICK, 16)), 6: hits(rep(V_KICK, 8)),
  7: hits('x.x.x.x. | x.x.x.x. | X....... | ........'),
}
const snare = {
  0: hits('........ | ........ | ..x...x. | ..x.xRRR'), 1: hits(rep(V_SNARE, 7) + ' | ..x.xxRR'), 2: hits('..x...x. | ..x...x. | x.x.x.x. | xxxxRRRR'),
  3: hits(rep(SKATE_SNARE, 7) + ' | .x.xRRRR'), 4: hits(rep('....x...', 4) + ' | ' + rep(V_SNARE, 2) + ' | xxxxxxxx | RRRRRRRR'),
  5: hits(rep(SKATE_SNARE, 15) + ' | .x.xRRRR'), 6: hits(rep(V_SNARE, 7) + ' | ..x.xxRR'), 7: hits('.x.x.x.x | .x.xRRRR | X....... | ........'),
}
const hat = { 0: hits('........ | ........ | xxxxxxxx | xxxxxxxx'), 1: hits(rep('xgxgxgxg', 8)), 4: hits(rep('x.x.x.x.', 4) + ' | ' + rep('xgxgxgxg', 4)), 6: hits(rep('xgxgxgxg', 8)) }
const crashRide = { 3: hits(rep('xgxgxgxg', 8)), 5: hits(rep('xgxgxgxg', 16)), 2: hits('........ | ........ | ........ | ........') }
const crash = { 1: hits('X.......'), 3: hits('X.......' + ' | ........'.repeat(3) + ' | X.......'), 5: hits('X.......' + ' | ........'.repeat(7) + ' | X.......'), 6: hits('X.......'), 7: hits('........ | ........ | X....... | ........') }
const toms = { 2: hits('........ | ........ | ....xxxx | ........'), 4: hits(rep('........', 5) + ' | ......xx | ........ | ........') }
const claps = { 4: hits(rep('........', 4) + ' | ' + rep('..x...x.', 4)), 5: hits(rep('..x...x.', 16)) }
const roll = { 2: hits('........ | ........ | ........ | RRRRRRRR'), 4: hits(rep('........', 7) + ' | RRRRRRRR') }

const PARTS = present([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('amps', 'rock-bass'), bass, on(...ALL),
    { octave: 2, gain: .2, attack: .003, decay: .3, sustain: .6, release: .08, clip: 1, lpf: 3200, hpf: 30, effects: { reverb: .05 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), kick, on(...ALL),
    { ...DRUM, gain: .1, decay: .25, release: .08, clip: .8, lpf: 3000, hpf: 30, effects: { reverb: .06 } }),
  P('b1', 'Lead guitar', 'melody', 'phrase', SAMPLE('amps', 'lead'), lead, on(0, 1, 2, 4, 5, 7),
    { octave: 4, gain: .048, attack: .003, decay: .4, sustain: .7, release: .18, clip: 1, lpf: 6500, hpf: 140, effects: { reverb: .14, pan: -.2 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5.8, vibratoDepth: .12 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 1, false), snare, on(...ALL),
    { ...DRUM, gain: .065, decay: .16, release: .08, clip: .7, lpf: 7500, hpf: 160, effects: { reverb: .14 } }),
  P('c1', 'Palm-muted guitar', 'harmony', 'phrase', SAMPLE('amps', 'chug'), chug, on(0, 1, 4, 7),
    { octave: 3, gain: .04, attack: .002, decay: .2, sustain: .4, release: .06, clip: 1, lpf: 5000, hpf: 90, effects: { reverb: .06, pan: .45 }, mapping: FIXED }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 0, false), hat, on(0, 1, 4, 7, 8),
    { ...DRUM, gain: .028, decay: .05, release: .03, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .06, pan: .3 } }),
  P('d1', 'Power chords', 'harmony', 'phrase', SAMPLE('amps', 'power', 0), power, on(2, 3, 5, 6, 7, 8, 9, 10),
    { octave: 3, gain: .042, attack: .003, decay: .4, sustain: .8, release: .12, clip: 1, lpf: 5500, hpf: 90, effects: { reverb: .1, pan: -.45 }, mapping: FIXED }),
  P('d2', 'Crash ride', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 1, false), crashRide, on(3, 6, 9),
    { ...DRUM, gain: .02, decay: .3, release: .1, clip: .5, lpf: 9000, hpf: 600, effects: { reverb: .1, pan: -.3 } }),
  P('e1', 'Clean guitar', 'response', 'phrase', SAMPLE('amps', 'chorus'), clean, on(8),
    { octave: 3, gain: .045, attack: .003, decay: .5, sustain: .4, release: .25, clip: 1, lpf: 6000, hpf: 150, effects: { reverb: .24, delay: .2, pan: .3 }, mapping: FIXED }),
  P('e2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(1, 3, 4, 6, 7, 9, 10),
    { ...DRUM, gain: .035, decay: .9, release: .4, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .16, pan: .25 } }),
  P('f1', 'Gang vocals', 'response', 'sustain', SAMPLE('voices', 'aah'), whoa, on(2, 3, 5, 6, 9),
    { octave: 3, gain: .05, attack: .04, decay: .4, sustain: .85, release: .25, clip: 1, lpf: 6000, hpf: 120, effects: { reverb: .2, pan: .1 }, mapping: FIXED }),
  P('f2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 0, false), toms, on(2, 5, 8),
    { ...DRUM, gain: .07, decay: .35, release: .15, clip: .9, lpf: 5000, hpf: 40, effects: { reverb: .16 } }),
  P('g1', 'Octave guitar', 'melody', 'phrase', SAMPLE('amps', 'crunch'), hook, on(0, 3, 6, 9),
    { octave: 4, gain: .038, attack: .003, decay: .4, sustain: .7, release: .15, clip: 1, lpf: 6000, hpf: 150, effects: { reverb: .12, pan: .25 }, mapping: FIXED }),
  P('g2', 'Hand claps', 'rhythm', 'pulse', SAMPLE('drums', 'room-clap', 0, false), claps, on(8, 9),
    { ...DRUM, gain: .04, decay: .12, release: .06, clip: .5, lpf: 7000, hpf: 600, effects: { reverb: .16, pan: -.15 } }),
  P('h1', 'Backing vocals', 'harmony', 'sustain', SAMPLE('voices', 'ooh'), ooh, on(4, 8),
    { octave: 3, gain: .04, attack: .1, decay: .4, sustain: .85, release: .35, clip: 1, lpf: 5500, hpf: 150, effects: { reverb: .26, pan: -.25 }, mapping: FIXED }),
  P('h2', 'Snare roll', 'rhythm', 'pulse', SAMPLE('percussion', 'ghost-snare', 0, false), roll, on(2, 5, 8),
    { ...DRUM, gain: .04, decay: .1, release: .05, clip: .5, lpf: 7000, hpf: 300, effects: { reverb: .12 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 7: { gain: .058, reverbRange: { first: .16, second: .22 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'san-diego-1999', kitName: 'Pop punk', profileName: 'Pop punk · San Diego 1999',
  bpm: 164, meter: '4/4', root: 'D', scale: 'Chromatic', form: FORM, parts: PARTS,
  reactions: reactions('san-diego-1999', { lift: 2, contrast: 4, lament: 4, calm: 1, finale: 7, climax: 5, solo: 6 }),
  reference: 'Cena skate punk de San Diego no fim dos anos 1990 (o Blink-182, de Poway, logo ao lado, e as bandas da Warped Tour); canção original em Ré maior sobre I–V–vi–IV: power chords abafados com a palma no verso, pré-refrão que cresce nos tons, refrão de power chords abertos em high gain com batida skate, coro "whoa-oh" e gancho de guitarra em oitavas, solo melódico curto, ponte em meio tempo com guitarra limpa de chorus e palmas, refrão final dobrado e final em parada.',
  url: 'https://www.britannica.com/art/punk',
}).catch(error => { console.error(error); process.exit(1) })
