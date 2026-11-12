// 1930 New York City - Swing. Original 32-bar AABA tune in the spirit of the Harlem dance orchestras
// of the early 1930s (Fletcher Henderson, Duke Ellington at the Cotton Club, Chick Webb at the Savoy):
// a clarinet-led sax section answered by brass shots, a trumpet bridge, stride piano, four-to-the-bar
// rhythm guitar, a two-beat bass that starts walking in the solos, a tom-tom break and a riffing shout
// chorus. Run: node scripts/blues-jazz-rock/new-york-1930.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, walking, roots, onChords, walkNotes, chord } = require('./common.cjs')
const C = composer('4/4', 'Chromatic', { swing: .64 })
const { mel, rep, hits, relative, human, set, shift, up } = C
const KEY = 'F'

// Two chords per bar. A: I–VI7–ii–V turnarounds; B: the circle of dominants (III7 VI7 II7 V7).
const A = ['F6', 'D7', 'Gm7', 'C7', 'F6', 'D7', 'Gm7', 'C7', 'F7', 'F7', 'Bb6', 'Bdim7', 'F6', 'D7', 'Gm7', 'C7']
const B = ['A7', 'A7', 'A7', 'A7', 'D7', 'D7', 'D7', 'D7', 'G7', 'G7', 'G7', 'G7', 'C7', 'C7', 'C7', 'C7']
const INTRO = ['Gm7', 'C7', 'F6', 'D7', 'Gm7', 'C7', 'C7', 'C7']
const OUTRO = ['Gm7', 'C7', 'Gm7', 'C7', 'F6', 'F6', 'F6', 'F6']
const R = list => roots(list, KEY, 2)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(INTRO) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Bridge', bars: 8, bank: 2, harmony: R(B) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Solo', bars: 16, bank: 3, harmony: R([...A, ...A]) },   // clarinet
  { label: 'Solo', bars: 16, bank: 4, harmony: R([...B, ...A]) },   // trumpet
  { label: 'Break', bars: 8, bank: 5, harmony: R(A) },              // tom-toms
  { label: 'Chorus', bars: 16, bank: 6, harmony: R([...A, ...A]) }, // shout chorus
  { label: 'Outro', bars: 4, bank: 7, harmony: R(OUTRO) },
]
const CHORDS = [INTRO, A, B, [...A, ...A], [...B, ...A], A, [...A, ...A], OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = (fn) => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]))

// ---------- b1 Clarinet: the head (semitones above F4) and the first solo ----------
const HEAD = mel([
  'r:1 7:1 9:1 12:2 9:1 r:1 6:1', '7:2 5:1 2:1 r:1 4:1^1 7:2', 'r:1 7:1 9:1 12:2 9:1 r:1 6:1', '7:2 5:1 2:1 r:1 11:1 12:2',
  'r:1 16:1^1 12:1 10:1 12:4~', 'r:1 14:1 17:1 14:1 r:1 13:1 14:2', '12:2 9:1 7:1 r:1 6:1 9:2', '7:3~ r:1 4:1 2:1 0:2',
].join('|'), { accent: { strong: .86, beat: .8, off: .74 } })
const CLARINET_SOLO = mel([
  '12:1 14:1 16:1 17:1 19:2~ 16:1 14:1', '17:1 14:1 10:1 9:1 11:2 12:2', 'r:2 19:1 18:1 19:1 21:1 24:2~', '22:1 19:1 17:1 16:1 14:2 10:2',
  '12:1 15:1^1 16:1 19:1 22:2~ 21:1 19:1', '17:1 14:1 17:1 20:1 19:2 17:2', '16:1 12:1 9:1 12:1 18:2~ 16:1 14:1', '12:6~ r:2',
  'r:1 24:3~ 21:1 19:1 16:1 12:1', '18:1 21:1 24:1 21:1 19:2 16:2', 'r:2 12:1 14:1 16:1 17:1 19:1 21:1', '22:2 21:1 19:1 17:1 16:1 14:1 13:1',
  '15:1^1 16:1 15:1^1 16:1 15:1^1 16:1 12:2', '14:1 17:1 20:1 23:1 22:2 19:2', '24:2 21:1 19:1 18:1 21:1 19:1 16:1', '12:6~* r:2',
].join('|'), { accent: { strong: .9, beat: .84, off: .76 } })
// The solo stays in the warm low and middle registers (the head an octave lower), the shout doubles the head.
const clarinet = { 1: relative(human(HEAD, .05, 0, 2), H(1)), 3: relative(human(up(CLARINET_SOLO, -12), .05, 0, 4), H(3)), 6: relative(set([...HEAD, ...shift(HEAD, 8)], { velocity: .9 }), H(6)), 7: relative(mel('r:8 | r:8 | 0:1 4:1 7:1 12:5~* | r:8'), H(7)) }

// ---------- d1 Tenor sax: the sax section under the clarinet (two-note voicings that follow the tune) ----------
const saxVoices = list => voiceLead(list, KEY, { center: 2, size: 2, drop: true })
const saxPads = (list, rhythm) => onChords(C, saxVoices(list), rhythm, { perBar: 2, gate: .95 })
const tenor = {
  1: relative(human(set(saxPads(A, [[0, 1.5, .7], [2, 1.5, .66]]), { chance: .9 }), .06, 0, 6), H(1)),
  2: relative(saxPads(B, [[0, 3.6, .64]]), H(2)),
  3: relative(saxPads([...A, ...A], [[0, 3.6, .55]]), H(3)),
  4: relative(saxPads([...B, ...A], bar => bar % 2 ? [[1.5, .5, .78], [2.5, .5, .74], [3.5, .5, .8]] : [[0, 1, .72]]), H(4)),
  6: relative(saxPads([...A, ...A], bar => bar % 2 ? [[0, .5, .9], [1.5, .5, .82], [2.5, 1.5, .86]] : [[.5, .5, .82], [1.5, .5, .78], [2, 2, .84]]), H(6)),
}

// ---------- c1 Trumpet: intro fanfare, the bridge tune and the second solo (semitones above F4) ----------
const BRIDGE = mel([
  '16:3~ 13:1 16:2 19:2', '21:4~ 19:2 16:2', '21:3~ 18:1 21:2 24:2', '26:4~ 24:2 21:2',
  '23:3~ 19:1 23:2 26:2', '24:4~ 23:2 19:2', '22:2 19:1 16:1 14:2 10:2', '11:2 12:2 14:2 16:2',
].join('|'), { accent: { strong: .9, beat: .84, off: .78 } })
const TRUMPET_SOLO = mel([
  'r:1 16:1 19:1 21:1 24:4~', '22:1 21:1 19:1 16:1 13:2 16:2', 'r:2 21:1 24:1 26:4~^2', '24:1 21:1 18:1 21:1 19:4',
  '23:3~ 21:1 19:2 17:2', '19:1 23:1 26:1 23:1 24:4', 'r:1 22:1 19:1 16:1 14:2 13:2', '11:1 14:1 17:1 19:1 22:2 21:2',
  '24:6~^2 r:2', '22:1 21:1 19:1 21:1 18:2 14:2', '19:1 21:1 22:1 24:1 26:2 24:2', '22:1 19:1 16:1 12:1 11:2 12:2',
  '28:4~^2 26:1 24:1 21:1 19:1', '17:2 20:1 19:1 r:1 17:1 14:2', '21:1 24:1 21:1 18:1 19:2 16:2', '12:4~* r:4',
].join('|'), { accent: { strong: .92, beat: .86, off: .8 } })
const trumpet = {
  0: relative(mel('19:3 19:1 r:1 21:1 22:2 | 24:4~ r:4 | 19:3 19:1 r:1 21:1 22:2 | 24:1 22:1 21:1 19:1 16:2 r:2'), H(0)),
  2: relative(human(BRIDGE, .05, 0, 8), H(2)), 4: relative(human(TRUMPET_SOLO, .05, 0, 10), H(4)),
  7: relative(mel('r:8 | 19:1 21:1 22:1 23:1 24:4~ | 24:8~* | r:8'), H(7)),
}

// ---------- h1 Trumpet shots and e1 Trombone: the brass section answering the saxes ----------
const brassVoices = (list, center) => voiceLead(list, KEY, { center, size: 3 })
const SHOTS = bar => bar % 2 ? [[1.5, .5, .86], [3, .5, .92]] : [[3.5, .5, .82]]
const brass = (center, size = 3) => each((list, bank) => {
  const voices = voiceLead(list, KEY, { center, size })
  if (bank === 0) return onChords(C, voices, bar => bar === 3 ? [[0, .5, .95], [1.5, 2.5, .9, { reverb: .4, release: .6 }]] : [[0, .5, .9], [1.5, .5, .86], [3.5, .5, .9]], { perBar: 2 })
  if (bank === 1) return onChords(C, voices, SHOTS, { perBar: 2 })
  if (bank === 2) return onChords(C, voices, [[0, 3.8, .62]], { perBar: 2 })
  if (bank === 3) return onChords(C, voices, bar => bar % 4 === 3 ? [[1.5, .5, .8], [3, .5, .84]] : [], { perBar: 2 })
  if (bank === 5) return onChords(C, voices, bar => bar % 2 ? [] : [[0, .5, .95]], { perBar: 2 })
  if (bank === 6) return onChords(C, voices, bar => bar % 2 ? [[1.5, .5, .9], [2.5, .5, .86], [3.5, .5, .95]] : [[0, 1.5, .92]], { perBar: 2 })
  if (bank === 7) return onChords(C, voices, bar => bar === 2 ? [[0, 4, .9, { reverb: .45, release: .9 }]] : bar === 3 ? [] : [[1.5, .5, .86], [3, .5, .9]], { perBar: 2 })
  return null
})
const shotsRolls = Object.fromEntries(Object.entries(brass(7)).filter(([, n]) => n).map(([bank, notes]) => [bank, relative(notes, H(Number(bank)))]))
const tromboneRolls = Object.fromEntries(Object.entries(brass(7, 2)).filter(([, n]) => n).map(([bank, notes]) => [bank, relative(notes, H(Number(bank)))]))

// ---------- g1 Rhythm guitar: four to the bar ----------
const FOUR = [[0, .6, .78], [1, .6, .66], [2, .6, .76], [3, .6, .66]]
const guitarRolls = each((list, bank) => relative(human(onChords(C, voiceLead(list, KEY, { center: 4, size: 3 }), bank === 5 ? bar => bar % 2 ? [] : [[0, .5, .9]] : bank === 7 ? bar => bar === 2 ? [[0, 4, .86, { reverb: .3 }]] : bar === 3 ? [] : FOUR : FOUR, { perBar: 2, gate: .8 }), .05, 0, bank + 30), H(bank)))

// ---------- f1 Piano: stride (bass note on 1 and 3, chord on 2 and 4) with right-hand fills ----------
const stride = (list, bank) => {
  const voices = voiceLead(list, KEY, { center: 10, size: 3 })
  // Bass note on 1 and 3: the root, or the fifth when the chord carries over from the first half.
  const lows = list.map((symbol, i) => { const root = chord(symbol, KEY).root; return [(i % 2 && list[i - 1] === symbol ? root + 7 : root) % 12 - 12] })
  const hit = bank === 5 ? bar => bar % 2 ? [] : [[0, .5, .9]] : null
  return [
    ...onChords(C, lows, hit ?? [[0, .8, .8], [2, .8, .72]], { perBar: 2 }),
    ...onChords(C, voices, hit ?? [[1, .5, .66], [3, .5, .64]], { perBar: 2 }),
  ]
}
const pianoRolls = each((list, bank) => relative(human(stride(list, bank), .07, 0, bank + 40), H(bank)))
pianoRolls[2] = relative([...stride(B, 2), ...mel('r:8 | r:6 24:1 21:1 | r:8 | r:6 26:1 24:1 | r:8 | r:6 23:1 19:1 | r:8 | r:4 19:1 16:1 12:1 10:1', { start: 0 }).map(n => ({ ...n, velocity: .6 }))], H(2))

// ---------- a1 Upright bass: two-beat in the head, walking in the solos and the shout ----------
const twoBeat = list => onChords(C, list.map(symbol => [chord(symbol, KEY).root - (chord(symbol, KEY).root > 7 ? 12 : 0)]), [[0, 1.6, .8], [2, 1.6, .72]], { perBar: 2 })
// Half-bar walking: the root of each chord, then an approach into the next one.
const walk = (list, seed) => {
  const halves = walking(list, KEY, { beats: 2, low: -7, high: 10, seed })
  return walkNotes(C, halves.filter((_, i) => i % 2 === 0).map((first, i) => [...first, ...halves[i * 2 + 1]]))
}
const bassRolls = {
  0: relative(twoBeat(INTRO), H(0)), 1: relative(twoBeat(A), H(1)), 2: relative(walk(B, 3), H(2)),
  3: relative(walk([...A, ...A], 5), H(3)), 4: relative(walk([...B, ...A], 9), H(4)), 5: relative(onChords(C, A.map(s => [chord(s, KEY).root - (chord(s, KEY).root > 7 ? 12 : 0)]), bar => bar % 2 ? [] : [[0, .5, .9]], { perBar: 2 }), H(5)),
  6: relative(walk([...A, ...A], 13), H(6)), 7: relative(mel('2:2 r:2 7:2 r:2 | 2:2 r:2 7:2 6:2 | 0:2! r:2 0:4~* | r:8'), H(7)),
}

// ---------- drums (1930: feathered bass drum, snare with sticks, the new hi-hat on 2 and 4) ----------
const kick = { 0: hits(rep('o.o.o.o.', 3) + ' | X.....X.'), 1: hits(rep('o.o.o.o.', 8)), 2: hits(rep('o.o.o.o.', 8)), 3: hits(rep('o.o.o.o.', 16)), 4: hits(rep('o.o.o.o.', 16)), 5: hits(rep('X.......  | ........', 4)), 6: hits(rep('o.o.o.o. | o.o.o.X.', 8)), 7: hits('o.o.o.o. | o.o.X... | X....... | ........') }
const snare = {
  0: hits('..o...o. | ..o...o. | ..o...o. | ..o.RRRR'), 1: hits(rep('..o...o. | ..o...og', 4)), 2: hits(rep('..o...o.', 7) + ' | ..o.RRRR'),
  3: hits(rep('..o...o.', 16)), 4: hits(rep('..o...o.', 15) + ' | ..o.RRRR'), 6: hits(rep('..x...x. | ..x.x.X.', 8)), 7: hits('..o...o. | ..x.X... | X....... | ........'),
}
const hat = { 1: hits(rep('..x...x.', 8)), 2: hits(rep('..x...x.', 8)), 3: hits(rep('..x...x.', 16)), 4: hits(rep('..x...x.', 16)), 6: hits(rep('x.xgx.xg', 16)) }
const block = { 0: hits('x.xgx.xg | x.xgx.xg | x.xgx.xg | X.......'), 2: hits(rep('x?x.x?x.', 8)) }
const choke = { 0: hits('........ | ........ | ........ | ......X.'), 1: hits(rep('........', 7) + ' | ......X.'), 6: hits(rep('........ | ...X...X', 8)), 7: hits('........ | ....X... | X....... | ........'), 5: hits(rep('X....... | ........', 4)) }
const TOMS = 'X.xgX.xg | X.xgX.xg | X.xgX.xg | XxxxRRRX'
const tom = { 5: hits(`${TOMS} | ${TOMS}`) }
const press = { 5: hits(rep('...R...R | ..R.RRRR', 4)), 6: hits(rep('........', 15) + ' | RRRRRRRR') }

const PARTS = present([
  P('a1', 'Upright bass', 'bass', 'phrase', SAMPLE('classical', 'concert-bass-pizz'), bassRolls, on(...ALL),
    { octave: 2, gain: .3, attack: .004, decay: .5, sustain: .5, release: .18, clip: 1, lpf: 2400, hpf: 32, effects: { reverb: .08 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Bass drum', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 1, false), kick, on(...ALL),
    { ...DRUM, gain: .085, decay: .3, release: .1, clip: .8, lpf: 2600, hpf: 30, effects: { reverb: .12 } }),
  P('b1', 'Clarinet', 'melody', 'phrase', SAMPLE('classical', 'orchestra-clarinet'), clarinet, on(1, 2, 4, 5, 8, 9),
    { octave: 4, gain: .075, attack: .02, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 7000, hpf: 180, effects: { reverb: .2, pan: -.1 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5.8, vibratoDepth: .18 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 1, false), snare, on(...ALL),
    { ...DRUM, gain: .05, decay: .18, release: .1, clip: .7, lpf: 6500, hpf: 160, effects: { reverb: .22 } }),
  P('c1', 'Trumpet', 'melody', 'phrase', SAMPLE('classical', 'orchestra-trumpet'), trumpet, on(0, 3, 6, 9),
    { octave: 3, gain: .065, attack: .02, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 6000, hpf: 200, effects: { reverb: .2, pan: .1 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 6, vibratoDepth: .16 } }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 1, false), hat, on(1, 2, 3, 4, 5, 6, 8),
    { ...DRUM, gain: .03, decay: .06, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .08, pan: .3 } }),
  P('d1', 'Tenor sax', 'harmony', 'phrase', SAMPLE('band', 'tenor-sax', 0), tenor, on(1, 2, 3, 4, 5, 6, 8),
    { octave: 4, gain: .055, attack: .03, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 4800, hpf: 120, effects: { reverb: .2, pan: -.3 }, mapping: FIXED,
      design: { vibrato: 5.2, vibratoDepth: .12 } }),
  P('d2', 'Temple blocks', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), block, on(0, 3),
    { ...DRUM, gain: .04, decay: .1, release: .05, clip: .5, lpf: 7000, hpf: 400, effects: { reverb: .18, pan: -.2 } }),
  P('e1', 'Trombone', 'harmony', 'phrase', SAMPLE('classical', 'concert-trombone'), tromboneRolls, on(0, 1, 2, 3, 4, 5, 7, 8, 9),
    { octave: 3, gain: .05, attack: .03, decay: .3, sustain: .75, release: .2, clip: 1, lpf: 4000, hpf: 90, effects: { reverb: .22, pan: .3 }, mapping: FIXED }),
  P('e2', 'Cymbal choke', 'rhythm', 'pulse', SAMPLE('percussion', 'cymbal-tip', 0, false), choke, on(0, 1, 2, 4, 7, 8, 9),
    { ...DRUM, gain: .035, decay: .25, release: .1, clip: .5, lpf: 8000, hpf: 400, effects: { reverb: .15, pan: -.25 } }),
  P('f1', 'Stride piano', 'harmony', 'phrase', SAMPLE('classical', 'concert-piano'), pianoRolls, on(...ALL),
    { octave: 3, gain: .05, attack: .002, decay: .5, sustain: .35, release: .25, clip: .95, lpf: 6000, hpf: 50, effects: { reverb: .18, pan: .15 }, mapping: FIXED }),
  P('f2', 'Press roll', 'rhythm', 'pulse', SAMPLE('percussion', 'ghost-snare', 0, false), press, on(7, 8),
    { ...DRUM, gain: .04, decay: .12, release: .06, clip: .5, lpf: 6000, hpf: 300, effects: { reverb: .2 } }),
  P('g1', 'Rhythm guitar', 'harmony', 'phrase', SAMPLE('guitars', 'muted', 1), guitarRolls, on(...ALL),
    { octave: 3, gain: .045, attack: .002, decay: .15, sustain: .2, release: .06, clip: .7, lpf: 3800, hpf: 140, effects: { reverb: .12, pan: .35 }, mapping: FIXED }),
  P('g2', 'Tom-toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 1, false), tom, on(7),
    { ...DRUM, gain: .075, decay: .35, release: .18, clip: .8, lpf: 4500, hpf: 50, effects: { reverb: .25 } }),
  P('h1', 'Trumpet section', 'response', 'phrase', SAMPLE('sambaReggae', 'trompete'), shotsRolls, on(0, 1, 2, 3, 4, 5, 7, 8, 9),
    { octave: 4, gain: .045, attack: .005, decay: .25, sustain: .6, release: .15, clip: 1, lpf: 6500, hpf: 220, effects: { reverb: .24, pan: .2 }, mapping: FIXED }),
  P('h2', 'Brushed snare', 'rhythm', 'pulse', SAMPLE('drums', 'brush', 0, false), { 3: hits(rep('xgxgxgxg', 16)), 4: hits(rep('xgxgxgxg', 16)) }, on(5, 6),
    { ...DRUM, gain: .03, decay: .1, release: .06, clip: .5, lpf: 7000, hpf: 500, effects: { reverb: .12, pan: .1 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 5: { gain: .085, reverbRange: { first: .22, second: .28 } }, 8: { gain: .07 } },
  c1: { 6: { gain: .075, reverbRange: { first: .22, second: .28 } } },
  d1: { 5: { gain: .04 }, 6: { gain: .05 } },
  e1: { 5: { gain: .035 } },
  h1: { 8: { gain: .055 } },
  // The intro sounds like a 78 rpm record of the dance hall; the band opens on the head.
  f1: { 0: { hpf: 300, lpfRange: { first: 2800, second: 3400 } } },
  g1: { 0: { hpf: 300, lpfRange: { first: 2800, second: 3400 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'new-york-1930', kitName: 'Swing', profileName: 'Swing · New York City 1930',
  bpm: 152, meter: '4/4', root: 'F', scale: 'Chromatic', form: FORM, parts: PARTS, grid: 192,
  reactions: reactions('new-york-1930', { lift: 2, contrast: 7, lament: 2, calm: 3, finale: 7, climax: 6, solo: 4 }),
  reference: 'Orquestras de dança do Harlem no início dos anos 1930 (Fletcher Henderson, Duke Ellington no Cotton Club, Chick Webb no Savoy); composição original em AABA de 32 compassos: clarinete à frente do naipe de saxes, respostas de metais, ponte do trompete, piano stride, guitarra em quatro, baixo em dois que passa a caminhar nos solos, quebra de tom-tons e shout chorus em riffs.',
  url: 'https://www.britannica.com/art/swing-music',
}).catch(error => { console.error(error); process.exit(1) })
