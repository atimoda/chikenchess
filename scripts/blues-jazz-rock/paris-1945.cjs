// 1945 Paris - Gypsy jazz. Original AABA tune in A minor in the spirit of the Quintette du Hot Club
// de France of the war and post-war years (Django Reinhardt, Stéphane Grappelli, Hubert Rostaing):
// no drums, two rhythm guitars playing la pompe, a slapped double bass, the lead guitar's triplet
// arpeggios, chromatic runs and tremolo, a violin solo full of slides, the clarinet, a musette
// accordion interlude from the cafés and the classic half-step ending.
// Run: node scripts/blues-jazz-rock/paris-1945.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, roots, onChords, chord } = require('./common.cjs')
const C = composer('4/4', 'Chromatic', { swing: .6 })
const { mel, rep, hits, relative, human, set, up, shift } = C
const KEY = 'A'

const A = ['Am6', 'Am6', 'Dm6', 'Dm6', 'E7', 'E7', 'Am6', 'E7']
const B = ['A7', 'A7', 'Dm6', 'Dm6', 'B7', 'B7', 'E7', 'E7']
const INTRO = ['Am6', 'Dm6', 'Am6', 'E7']
const OUTRO = ['Am6', 'Am6', 'Bb6', 'Am6']
const R = list => roots(list, KEY)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(INTRO) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Bridge', bars: 8, bank: 2, harmony: R(B) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Solo', bars: 16, bank: 3, harmony: R([...A, ...A]) },   // lead guitar
  { label: 'Solo', bars: 16, bank: 4, harmony: R([...B, ...A]) },   // violin
  { label: 'Interlude', bars: 8, bank: 5, harmony: R(A) },          // musette
  { label: 'Verse', bars: 8, bank: 6, harmony: R(A) },              // guitar and violin together
  { label: 'Outro', bars: 4, bank: 7, harmony: R(OUTRO) },
]
const CHORDS = [INTRO, A, B, [...A, ...A], [...B, ...A], A, A, OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))
const triplets = { unit: C.M.beat / 3, straight: true }

// ---------- b1 Lead guitar (semitones above A3) ----------
const HEAD = mel([
  'r:1 12:1 15:1 19:1 21:2~ 19:1 15:1', '14:1 15:1 12:1 11:1 12:4~', 'r:1 17:1 20:1 24:1 26:2~ 24:1 20:1', '23:1 24:1 20:1 19:1 17:4~',
  'r:1 19:1 23:1 26:1 29:2~ 27:1 26:1', '24:1 23:1 20:1 19:1 18:1 17:1 15:2', '12:3~ 15:1 19:2 21:2', '20:1 19:1 17:1 14:1 11:2 r:2',
].join('|'), { accent: { strong: .88, beat: .82, off: .74 } })
const GUITAR_SOLO = mel([
  '12:1 15:1 19:1 21:1 24:1 21:1 19:3~ 15:1 12:1 11:1', '12:3x3 15:3x3 19:6~', '17:1 20:1 24:1 26:1 24:1 20:1 17:1 20:1 24:1 26:3~', '27:3~^1 26:1 24:1 23:1 24:3 20:3',
  '20:1 23:1 26:1 29:1 26:1 23:1 20:1 17:1 14:1 11:3', '8:1 7:1 6:1 7:1 11:1 14:1 17:1 16:1 15:1 14:3', '12:6~ 9:3 7:3', '11:3 14:3 17:3 20:3',
  '24:6~^2 21:3 19:3', '15:1 16:1 19:1 21:1 24:1 21:1 19:1 16:1 15:1 12:3', '17:3x3 20:3x3 24:6~', '26:1 24:1 23:1 24:1 20:1 17:1 14:1 17:1 20:1 23:3',
  '26:6~^1 23:3 20:3', '19:1 20:1 23:1 26:1 29:1 26:1 23:1 20:1 19:1 17:3', '15:1 12:1 9:1 7:1 9:1 12:1 15:6~', '14:3 11:3 8:3 7:3',
].join('|'), { ...triplets, accent: { strong: .92, beat: .84, off: .76 } })
const lead = {
  0: relative(mel('r:12 | r:12 | r:12 | 11:1 14:1 17:1 20:1 23:1 26:1 29:3~ 26:1 23:1 20:1', triplets), H(0)),
  1: relative(human(HEAD, .05, 0, 3), H(1)), 3: relative(human(GUITAR_SOLO, .05, 0, 5), H(3)),
  6: relative(human(HEAD, .04, 0, 7), H(6)),
  7: relative(mel('12:1 15:1 19:1 21:1 24:4~ | r:8 | 13,17,20,22:2! r:6 | 12,15,19,21:8~*'), H(7)),
}

// ---------- c1 Violin (semitones above A4): the bridge, the solo and the last head ----------
const BRIDGE = mel([
  '4:4~ 7:2 10:2', '12:3~ 10:1 7:2 4:2', '5:4~ 8:2 12:2', '14:3~ 12:1 8:2 5:2',
  '6:4~ 9:2 12:2', '14:3~ 12:1 9:2 6:2', '7:4~ 11:2 14:2', '17:2 16:1 14:1 11:1 10:1 7:2',
].join('|'), { accent: { strong: .86, beat: .8, off: .74 } })
const VIOLIN_SOLO = mel([
  'r:1 7:1^3 10:1 12:5~', '16:2^2 12:1 10:1 7:2 4:2', '5:3~^2 8:1 12:2 14:2', '17:4~^2 14:1 12:1 8:2',
  '6:1 9:1 12:1 14:1 18:4~^1', '17:1 14:1 12:1 9:1 6:2 2:2', '11:4~^1 14:2 17:2', '19:3~^2 17:1 16:1 14:1 11:2',
  '12:8~^5', '15:1 12:1 9:1 7:1 3:2^1 0:2', 'r:1 5:1 8:1 12:1 17:4~', '14:2 12:1 8:1 5:2 2:2',
  '-1:1 2:1 5:1 8:1 11:4~^1', '14:2 13:1 11:1 8:2 7:2', '12:3~ 9:1 7:2 3:2', '2:2 -1:2 -4:4',
].join('|'), { accent: { strong: .9, beat: .84, off: .78 } })
const violin = {
  2: relative(human(portamentoMarks(BRIDGE), .05, 0, 9), H(2)), 4: relative(human(VIOLIN_SOLO, .05, 0, 11), H(4)),
  6: relative(set(up(HEAD, -12), { velocity: .8 }), H(6)),
  7: relative(mel('r:8 | r:8 | 1,5,8:2! r:6 | 0,3,7:8~*'), H(7)),
}
function portamentoMarks(notes) { return C.portamento(notes, 5, .12, 2) }

// ---------- d1 Clarinet: long answering lines under the last A and in the violin solo ----------
const clarinet = {
  1: relative(set(onChords(C, voiceLead(A, KEY, { center: 3, size: 1 }), bar => bar % 2 ? [[1.5, 2.3, .62]] : []), { chance: .7 }), H(1)),
  4: relative(onChords(C, voiceLead([...B, ...A], KEY, { center: 5, size: 1 }), bar => bar % 2 ? [[0, .5, .7], [1.5, .5, .66], [2.5, 1.5, .72]] : []), H(4)),
  6: relative(onChords(C, voiceLead(A, KEY, { center: 7, size: 1 }), [[0, 3.6, .66]]), H(6)),
}

// ---------- e1 Musette accordion (semitones above A4): the café interlude ----------
const MUSETTE = mel('0:3 3:1 7:2 12:2 | 11:3 9:1 7:4~ | 5:3 8:1 12:2 17:2 | 15:3 14:1 12:4~ | 11:3 14:1 17:2 20:2 | 19:3 17:1 14:4 | 12:3 9:1 7:2 3:2 | 2:2 -1:2 -4:4', { accent: { strong: .84, beat: .78, off: .72 } })
const accordion = {
  0: relative(onChords(C, voiceLead(INTRO, KEY, { center: 4, size: 3 }), [[0, 3.8, .6]]), H(0)),
  5: relative(human(MUSETTE, .04, 0, 13), H(5)),
  7: relative(mel('r:8 | r:8 | 1,5,8:2! r:6 | 0,3,7:8~*'), H(7)),
}

// ---------- b2 and f1 Rhythm guitars: la pompe (bass strum on 1 and 3, short chop on 2 and 4) ----------
const POMPE = [[0, .4, .7], [1, .25, .9], [2, .4, .7], [3, .25, .88]]
const pompe = (center, seed) => each((list, bank) => {
  const voices = voiceLead(list, KEY, { center, size: 4 })
  const rhythm = bank === 7 ? bar => bar === 2 ? [[0, .5, .95]] : bar === 3 ? [[0, 4, .9, { release: .7, reverb: .4 }]] : POMPE : POMPE
  return relative(human(onChords(C, voices, rhythm, { gate: .8 }), .06, seed / 400, seed), H(bank))
})
const pompe1 = pompe(5, 1), pompe2 = pompe(9, 2)
// c2 Upstrokes: the ghosted strum just before 2 and 4.
const upstrokes = each((list, bank) => bank === 7 ? null : relative(set(onChords(C, voiceLead(list, KEY, { center: 7, size: 3 }), [[.5, .12, .34], [2.5, .12, .34]]), { chance: .65 }), H(bank)))

// ---------- a1 Double bass: slapped two-beat, root and fifth ----------
const bassRolls = each((list, bank) => {
  const lows = list.flatMap(symbol => { const r = chord(symbol, KEY).root; return [[r], [r + 7 > 11 ? r - 5 : r + 7]] })
  if (bank === 7) return relative(mel('0:2 r:2 7:2 r:2 | 0:2 r:2 -5:2 -1:2 | 1:2! r:6 | 0:8~*'), H(7))
  return relative(human(onChords(C, lows, [[0, .7, .84], [2, .7, .76]], { perBar: 2 }), .05, 0, bank + 20), H(bank))
})

// ---------- g1 Violin pizzicato: off-beat chords in the musette and the intro ----------
const pizz = {
  0: relative(onChords(C, voiceLead(INTRO, KEY, { center: 12, size: 2 }), [[1, .3, .6], [3, .3, .6]]), H(0)),
  5: relative(onChords(C, voiceLead(A, KEY, { center: 12, size: 2 }), [[1, .3, .62], [2.5, .3, .5], [3, .3, .6]]), H(5)),
}

// ---------- h1 Cello: warm sustained lines under the bridge and the musette ----------
const cello = {
  2: relative(onChords(C, voiceLead(B, KEY, { center: -3, size: 1 }), [[0, 3.9, .6]]), H(2)),
  5: relative(onChords(C, voiceLead(A, KEY, { center: -3, size: 1 }), [[0, 3.9, .56]]), H(5)),
}

// ---------- the pawns: no drum kit, only the band's own taps ----------
const SLAP = '..x...x.'
const slap = { 1: hits(rep(SLAP, 8)), 2: hits(rep(SLAP, 8)), 3: hits(rep(SLAP, 16)), 4: hits(rep(SLAP, 16)), 6: hits(rep(SLAP, 8)) }
const brush = { 3: hits(rep('x.xgx.xg', 16)), 4: hits(rep('x.xgx.xg', 16)), 6: hits(rep('x.xgx.xg', 8)) }
const foot = { 0: hits(rep('o.o.o.o.', 4)), 3: hits(rep('o.o.o.o.', 16)), 4: hits(rep('o.o.o.o.', 16)), 5: hits(rep('o.o.o.o.', 8)) }
const cymbal = { 4: hits(rep('x.xgx.xg', 16)), 7: hits('........ | ........ | X....... | X.......') }
const rim = { 0: hits('x.x.x.x. | ........ | ........ | ........'), 7: hits('........ | ........ | X....... | ........') }
const shaker = { 5: hits(rep('.g.g.g.g', 8)) }

const PARTS = present([
  P('a1', 'Double bass', 'bass', 'phrase', SAMPLE('classical', 'concert-bass-pizz'), bassRolls, on(...ALL),
    { octave: 1, gain: .32, attack: .003, decay: .4, sustain: .4, release: .15, clip: 1, lpf: 2600, hpf: 35, effects: { reverb: .1 }, mapping: FIXED,
      design: { role: 'bass', filterEnv: .5, filterAttack: .003, filterDecay: .09 } }),
  P('a2', 'Brushes', 'rhythm', 'pulse', SAMPLE('drums', 'brush', 0, false), brush, on(5, 6, 8),
    { ...DRUM, gain: .028, decay: .12, release: .06, clip: .5, lpf: 7000, hpf: 500, effects: { reverb: .12, pan: .15 } }),
  P('b1', 'Lead guitar', 'melody', 'phrase', SAMPLE('guitars', 'clean', 0), lead, on(0, 1, 2, 4, 5, 8, 9),
    { octave: 3, gain: .095, attack: .002, decay: .35, sustain: .3, release: .2, clip: .95, lpf: 7500, hpf: 180, effects: { reverb: .16, pan: -.15 }, mapping: FIXED,
      design: { role: 'lead', filterEnv: .4, filterAttack: .002, filterDecay: .1, vibrato: 6.2, vibratoDepth: .12 } }),
  P('b2', 'La pompe', 'harmony', 'phrase', SAMPLE('guitars', 'muted', 0), pompe1, on(...ALL),
    { octave: 3, gain: .05, attack: .001, decay: .12, sustain: .15, release: .05, clip: .6, lpf: 5000, hpf: 160, effects: { reverb: .1, pan: .3 }, mapping: FIXED }),
  P('c1', 'Violin', 'melody', 'phrase', SAMPLE('classical', 'orchestra-violin', 1), violin, on(3, 6, 8, 9),
    { octave: 4, gain: .06, attack: .04, decay: .3, sustain: .85, release: .3, clip: 1, lpf: 8000, hpf: 220, effects: { reverb: .22, pan: .15 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 6, vibratoDepth: .2 } }),
  P('c2', 'Upstrokes', 'rhythm', 'phrase', SAMPLE('guitars', 'muted', 1), upstrokes, on(1, 2, 3, 4, 5, 6, 7, 8),
    { octave: 3, gain: .03, attack: .001, decay: .08, sustain: .1, release: .04, clip: .4, lpf: 6000, hpf: 300, effects: { reverb: .1, pan: .4 }, mapping: FIXED }),
  P('d1', 'Clarinet', 'response', 'phrase', SAMPLE('classical', 'orchestra-clarinet'), clarinet, on(2, 4, 6, 8),
    { octave: 4, gain: .05, attack: .03, decay: .3, sustain: .8, release: .25, clip: 1, lpf: 6000, hpf: 200, effects: { reverb: .22, pan: -.3 }, mapping: FIXED,
      design: { vibrato: 5.6, vibratoDepth: .14 } }),
  P('d2', 'Bass slap', 'rhythm', 'pulse', SAMPLE('percussion', 'ghost-snare', 1, false), slap, on(1, 2, 3, 4, 5, 6, 8),
    { ...DRUM, gain: .025, decay: .06, release: .03, clip: .3, lpf: 3000, hpf: 400, effects: { reverb: .08 } }),
  P('e1', 'Musette accordion', 'melody', 'phrase', SAMPLE('brasil', 'sanfona'), accordion, on(0, 7, 9),
    { octave: 4, gain: .05, attack: .03, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 5500, hpf: 180, effects: { reverb: .2, pan: .2 }, mapping: FIXED,
      design: { role: 'lead', lfoTarget: 'gain', lfoRate: 6.5, lfoUnit: 'hz', lfoDepth: .18, lfoShape: 'sine' } }),
  P('e2', 'Foot tap', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), foot, on(0, 5, 6, 7),
    { ...DRUM, gain: .05, decay: .2, release: .08, clip: .6, lpf: 800, hpf: 30, effects: { reverb: .15 } }),
  P('f1', 'Second rhythm guitar', 'harmony', 'phrase', SAMPLE('guitars', 'muted', 1), pompe2, on(1, 2, 3, 4, 5, 6, 8, 9),
    { octave: 3, gain: .04, attack: .001, decay: .12, sustain: .15, release: .05, clip: .6, lpf: 4500, hpf: 160, effects: { reverb: .1, pan: -.35 }, mapping: FIXED }),
  P('f2', 'Cymbal', 'rhythm', 'pulse', SAMPLE('percussion', 'cymbal-tip', 1, false), cymbal, on(6, 9),
    { ...DRUM, gain: .025, decay: .4, release: .2, clip: .7, lpf: 8000, hpf: 500, effects: { reverb: .15, pan: -.2 } }),
  P('g1', 'Violin pizzicato', 'response', 'phrase', SAMPLE('classical', 'violin-pizzicato', 0), pizz, on(0, 7),
    { octave: 4, gain: .045, attack: .002, decay: .3, sustain: .2, release: .15, clip: .9, lpf: 7000, hpf: 250, effects: { reverb: .2, pan: .35 }, mapping: FIXED }),
  P('g2', 'Rim', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), rim, on(0, 9),
    { ...DRUM, gain: .035, decay: .08, release: .04, clip: .4, lpf: 7000, hpf: 400, effects: { reverb: .15 } }),
  P('h1', 'Cello', 'harmony', 'sustain', SAMPLE('classical', 'orchestra-cello'), cello, on(3, 7),
    { octave: 3, gain: .045, attack: .25, decay: .4, sustain: .85, release: .5, clip: 1, lpf: 4500, hpf: 70, effects: { reverb: .28, pan: -.2 }, mapping: FIXED,
      design: { vibrato: 5.2, vibratoDepth: .12 } }),
  P('h2', 'Shaker', 'rhythm', 'pulse', SAMPLE('percussion', 'shaker', 0, false), shaker, on(7),
    { ...DRUM, gain: .02, decay: .08, release: .05, clip: .4, lpf: 9000, hpf: 2000, effects: { reverb: .1, pan: .35 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 5: { gain: .11, reverbRange: { first: .18, second: .24 } } },
  c1: { 6: { gain: .07, reverbRange: { first: .24, second: .32 } } },
  // The intro sounds like a shellac record; the quintet opens on the head.
  b2: { 0: { hpf: 350, lpfRange: { first: 2600, second: 3200 } } },
  e1: { 0: { hpf: 350, lpfRange: { first: 2600, second: 3200 } } },
  g1: { 0: { hpf: 350, lpfRange: { first: 2600, second: 3200 } } },
  a1: { 0: { hpf: 120, lpfRange: { first: 1600, second: 2000 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'paris-1945', kitName: 'Gypsy jazz', profileName: 'Gypsy jazz · Paris 1945',
  bpm: 184, meter: '4/4', root: 'A', scale: 'Chromatic', form: FORM, parts: PARTS, grid: 192,
  reactions: reactions('paris-1945', { lift: 2, contrast: 4, lament: 5, calm: 5, finale: 7, climax: 3, solo: 3 }),
  reference: 'Jazz manouche do Quintette du Hot Club de France nos anos da guerra e do pós-guerra (Django Reinhardt, Stéphane Grappelli, Hubert Rostaing); composição original em AABA em Lá menor, sem bateria: duas guitarras na pompe, contrabaixo em slap, arpejos em tercinas, corridas cromáticas e tremolo da guitarra solo, violino com glissandos, clarinete, interlúdio de acordeão musette e o final com o acorde meio tom acima.',
  url: 'https://www.britannica.com/biography/Django-Reinhardt',
}).catch(error => { console.error(error); process.exit(1) })
