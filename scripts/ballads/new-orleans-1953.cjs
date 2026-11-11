// 1953 New Orleans - Rhythm & blues. Original song in the spirit of Cosimo Matassa's studio and
// the Dave Bartholomew band (Fats Domino's Imperial sides): rolling piano triplets in 12/8, boogie bass
// doubled by trombone, tenor sax and trumpet riffs, a 32-bar AABA tune with blue-note bends, an
// 8-bar blues sax solo, a second-line parade break and a stop-time interlude.
// Run: node scripts/ballads/new-orleans-1953.cjs
const { composer, build, reactions, SAMPLE } = require('./lib.cjs')
const C = composer('12/8', 'Maior')
const { mel, rep, hits, relative, strum, up, vel, set } = C
// A soft touch: velocities pulled toward .6 so no note jumps out of the band.
const soft = (notes, floor = .6, keep = .55) => notes.map(n => ({ ...n, velocity: Math.round((floor + (n.velocity - floor) * keep) * 100) / 100 }))
const VOICE = { strong: .86, beat: .78, off: .7 }

// C major. Roots: 0 C, 1 Dm, 3 F, 4 G, 5 Am.
const A = [0, 0, 3, 0, 4, 4, 0, 0]
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: [0, 3, 0, 4] },
  { label: 'Verse', bars: 8, bank: 1, harmony: A },
  { label: 'Verse', bars: 8, bank: 1, harmony: A },
  { label: 'Bridge', bars: 8, bank: 2, harmony: [3, 3, 0, 0, 1, 1, 4, 4] },
  { label: 'Verse', bars: 8, bank: 1, harmony: A },
  { label: 'Solo', bars: 16, bank: 3, harmony: [0, 4, 3, 3, 0, 4, 0, 4] },   // 8-bar blues, twice
  { label: 'Break', bars: 8, bank: 4, harmony: [0, 0, 0, 0, 4, 4, 0, 0] },   // second-line parade
  { label: 'Interlude', bars: 8, bank: 5, harmony: [0, 0, 3, 3, 0, 0, 4, 4] }, // stop-time
  { label: 'Verse', bars: 8, bank: 1, harmony: A },
  { label: 'Outro', bars: 4, bank: 6, harmony: [0, 3, 0, 0] },
]
const H = bank => FORM.find(s => s.bank === bank).harmony
const FILL = 7
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)

// ---------- tunes (absolute degrees of C major; ^1 bends the blue third up into E) ----------
const TUNE = mel('r:3 4:2? 5:1 7:3 5:3 | 4:6~ 2:3^1 0:3 | r:3 3:2? 5:1 7:3 8:3 | 7:6~ 5:3 4:3 | r:3 4:2?? 6:1 8:3 6:3 | 8:6 7:3 6:2 5:1?? | 4:3 2:2^1 0:1? 2:3 4:3 | 0:9~* r:2 4:1??', { accent: VOICE })
const BRIDGE = mel('5:3 7:3 8:6~ | 7:3 5:3 3:6 | 4:3 7:3 9:6~ | 7:3 4:3 2:6^1 | 1:3 3:3 5:6~ | 8:3 7:3 5:6 | 4:3 6:3 8:3 11:3 | 10:6~ 8:3 6:3', { accent: VOICE })
const SOLO = mel([
  '7:3 7:2^2 9:1 7:3 4:3', '6:2 8:1 11:3~ 8:3 6:3', '5:2 7:1 8:3 10:3 8:3', '7:6~ 5:3 3:3',
  '9:2^1 7:1 4:3 9:2^1 7:1 4:3', '8:3 6:3 4:3 1:3', '2:2^1 0:1 2:3 4:3 7:3', '6:12~',
  '14:3~ 12:2 11:1 9:3 7:3', '11:6~ 8:3 6:3', '10:2 8:1 7:2 5:1 7:6~', '3:3 5:3 7:3 10:3',
  '9:1^1 7:1 4:1 9:1^1 7:1 4:1 9:1^1 7:1 4:1 9:3', '8:6~ 6:6', '7:3 4:3 2:2^1 0:1 2:3', '4:6 r:6',
].join('|'), { accent: { strong: .86, beat: .8, off: .72 } })
const PARADE = mel('r:3 7:2 7:1 9:3 7:3 | 4:6~ r:3 4:2 5:1 | 7:3 9:3 7:3 4:3 | 2:9~ r:3 | r:3 6:2 6:1 8:3 6:3 | 4:6 r:3 4:3 | 7:2 7:1 9:2 7:1 4:3 2:3 | 0:9~* r:3', { accent: { off: .8 } })
const TAG = mel('r:3 7:2 9:1 7:3 4:3 | 5:6~ 3:3 5:3 | 4:3 2:2^1 0:1 2:3 4:3 | 0:9~* r:3', { accent: VOICE })

// ---------- a1 Upright bass: boogie (root, 3rd, 5th, 6th, octave) ----------
const boogie = mel(rep('0:3 2:3 4:3 5:3 | 7:3 5:3 4:3 2:3', 4), { gate: .8 })
const bass = {
  0: mel('0:3 2:3 4:3 5:3 | 0:3 2:3 4:3 5:3 | 0:3 2:3 4:3 5:3 | 0:3 r:3 4:3 -3:3'),
  1: boogie, 2: mel(rep('0:6 4:6 | 0:3 2:3 4:3 2:3', 4)), 3: mel(rep('0:3 2:3 4:3 5:3 | 7:3 5:3 4:3 2:3', 8), { gate: .8 }),
  4: mel(rep('0:3 r:2 0:1 4:3 r:2 4:1 | 0:3 r:2 0:1 4:3 2:3', 4), { accent: { beat: .9 } }),
  5: mel(rep('0:1! r:11 | r:12', 4)),
  6: mel('0:3 2:3 4:3 5:3 | 3:3 5:3 7:3 5:3 | 0:3 2:3 4:3 5:3 | 0:3! r:3 0:6*'),
  [FILL]: mel('7:3 5:3 4:3 2:3'),
}

// ---------- a2 Kick, b2 Snare, c2 Ride (triplets), e2 Ghost snare ----------
const kick = {
  1: hits(rep('X.....x.....', 8)), 2: hits(rep('X.....x.....', 8)), 3: hits(rep('X.....x.....', 16)),
  4: hits(rep('X.....X..x.. | X..x..X.....', 4)), 5: hits(rep('X........... | ............', 4)),
  6: hits('X.....x..... | X.....x..... | X.....x..... | X.....X.....'),
}
const snare = {
  1: hits(rep('...X.....X..', 8)), 2: hits(rep('...x.....x..', 8)), 3: hits(rep('...X.....X..', 16)),
  4: hits(rep('X.gx.gX.gXgg | x.gX.gx.gRRR', 4)), 6: hits('...X.....X.. | ...X.....X.. | ...X.....X.. | X...........'),
  [FILL]: hits('xggxggxggRRR'),
}
const ride = {
  0: hits(rep('xooxooxooxoo', 4)), 1: hits(rep('xooxooxooxoo', 8)), 2: hits(rep('x..x..x..x..', 8)),
  3: hits(rep('xooxooxooxoo', 16)), 6: hits(rep('xooxooxooxoo', 3) + ' | X...........', { length: 1 / 12 }),
}
const ghost = { 1: hits(rep('..g..g..g.?g', 8)), 3: hits(rep('..g..g..?..g', 16)), 4: hits(rep('.g..g..g..gg', 8)) }

// ---------- b1 Tenor sax ----------
const sax = {
  0: relative(mel('r:12 | r:12 | r:6 4:2 5:1 7:3 | 6:6~ r:6'), H(0)),
  1: relative(soft(TUNE, .62, .6), H(1)),
  2: relative(set(BRIDGE, { velocity: .66 }), H(2)),
  3: relative(soft(SOLO, .62, .6), H(3)),
  4: relative(set(up(PARADE, -2), { velocity: .75 }), H(4)),
  6: relative(TAG, H(6)),
}

// ---------- c1 Piano right hand: the rolling triplets (chord on one, dyads after) ----------
// An ostinato with small changes: four bar shapes in turn, soft off-beats, a few left to chance,
// so the eight-bar verse doesn't play the same bar eight times.
const ROLL = {
  a: "0,2,4:1 2,4:1' 2,4:1' 2,4:1 2,4:1' 2,4:1' 2,4:1 2,4:1' 2,4:1' 2,4:1 2,4:1' 2,4:1'",
  b: "0,2,4:1 2,4:1' 2,4:1?' r:1 2,4:1' 2,4:1' 2,4:1 2,4:1' 2,4:1??' 2,4:1 r:1 2,4:1'",
  c: "2,4:1 4,7:1' 4,7:1' 2,4:1 4,7:1' 4,7:1?' 2,4:1 2,4:1' r:1 0,2,4:3",
  d: "0,2,4:1 2,4:1' 2,4:1' 2,4:1 2,4:1' 2,4:1?' 7:1 9:1' 7:1' 4:1 2:1' 0:1'",
  s: "4:1 4:1' 4:1?' 4:1 4:1' r:1 4:1 4:1' 4:1?' 4:1 r:1 4:1'",
  t: "2,4:1 4:1' 4:1' 2,4:1 r:1 4:1?' 2,4:1 4:1' 4:1' r:3",
}
const ROLLING = { strong: .78, beat: .7, off: .64 }
const rolling = shapes => soft(mel(shapes.split('').map(k => ROLL[k]).join(' | '), { gate: .8, accent: ROLLING }))
const pianoRight = {
  0: rolling('abac'), 1: rolling('abacabcd'), 2: soft(mel(rep('0,2,4:3 2,4:3 2,4:3? 2,4:3', 4) + ' | ' + rep('0,2,4:3 2,4:3 4,7:3? 2,4:3', 4), { gate: .9, accent: ROLLING })),
  3: rolling('ststststststsstd'),
  4: soft(mel(rep("r:3 2,4:2 2,4:1' r:3 2,4:2 2,4:1?'", 8), { accent: ROLLING })),
  5: soft(mel(rep('0,2,4,5:1 r:5 r:2 7:1 9:1 11:1 9:1 | 7:1 4:1 2:1 0:1 2:1 4:1 7:1 9:1 11:1 14:3', 4), { accent: { strong: .8, beat: .72, off: .66 } })),
  6: soft(mel([ROLL.a, ROLL.b, ROLL.d, '0,2,4,5:6~* r:6'].join(' | '), { gate: .8, accent: ROLLING })),
  [FILL]: soft(mel("7:1 9:1' 11:1' 14:1 11:1' 9:1' 7:1 4:1' 2:1' 0:3", { accent: ROLLING })),
}

// ---------- d1 Trumpet: riffs with the trombone, the parade lead ----------
const riff = mel(rep('r:12 | r:6 7:2s 7:1 9:3', 4), { accent: { off: .85 } })
const trumpet = {
  1: riff, 3: mel(rep('r:12 | r:12 | r:12 | r:6 7:2s 7:1 4:3', 4)),
  4: relative(PARADE, H(4)),
  6: relative(mel('r:12 | r:12 | r:12 | 4,7:6* r:6'), H(6)),
}

// ---------- d2 Tambourine, f2 Claps, g2 Big drum, h2 Cymbal ----------
const tambourine = { 4: hits(rep('x.ox.ox.ox.o', 8)) }
const claps = { 4: hits(rep('...X.....X..', 8)), 1: hits(rep('...x.....x..', 8)) }
const bigDrum = { 4: hits(rep('X.....x..X.. | X..x..X.....', 4)) }
const cymbal = { 0: hits('X........... | ............ | ............ | ............'), 5: hits(rep('X........... | ............', 4)), 6: hits('............ | ............ | ............ | X...........') }

// ---------- e1 Trombone: boogie doubling, tailgate slides in the parade ----------
const trombone = {
  1: set(mel(rep('r:12 | r:6 0:3 4:3', 4)), { velocity: .7 }),
  3: mel(rep('0:3 2:3 4:3 5:3 | 7:3 5:3 4:3 2:3', 8), { gate: .7, accent: { strong: .7, beat: .6, off: .5 } }),
  4: mel(rep('0:6^5 r:6 | 4:3^3 r:3 0:6', 4)),
  6: mel('r:12 | r:12 | r:12 | 0:6* r:6'),
}

// ---------- f1 Guitar: the "chank" on two and four, a fill in the stop-time ----------
const guitar = {
  1: strum(mel(rep('r:3 0,2,4:1s r:5 0,2,4:1s r:2', 8))), 2: strum(mel(rep('r:3 0,2,4:1s r:5 0,2,4:1s r:2', 8))),
  3: strum(mel(rep('r:3 0,2,4:1s r:5 0,2,4:1s r:2', 16))),
  5: mel(rep('r:12 | r:6 7:1 9:1^1 7:1 4:1 2:1 0:1', 4)),
  6: strum(mel('r:3 0,2,4:1s r:5 0,2,4:1s r:2 | r:3 0,2,4:1s r:5 0,2,4:1s r:2 | r:3 0,2,4:1s r:5 0,2,4:1s r:2 | 0,2,4,5:6* r:6')),
}

// ---------- g1 Piano left hand: octaves in the intro, the stop-time hits and the end ----------
const pianoLeft = {
  0: soft(mel('-7,0:3 -5:3 -3:3 -2:3 | -7,0:3 -5:3 -3:3 -2:3 | -7,0:3 -5:3 -3:3 -2:3 | -7,0:3 r:3 -3:3 r:3')),
  5: soft(mel(rep('-7,0:1 r:11 | r:12', 4))),
  6: soft(mel('-7,0:3 -5:3 -3:3 -2:3 | -7,0:3 -5:3 -3:3 -2:3 | -7,0:3 -5:3 -3:3 -2:3 | -7,0:6* r:6')),
}

// ---------- h1 Clarinet: the bridge's obbligato and the parade's high line ----------
const clarinet = {
  2: relative(set(mel('r:6 9:3 8:3 | 7:12~ | r:6 11:3 9:3 | 7:12 | r:6 10:3 8:3 | 7:12~ | r:6 11:3 13:3 | 12:6 11:6'), { velocity: .6 }), H(2)),
  4: relative(set(mel(rep('14:2 12:1 11:3 9:3 11:3 | 12:6~ 11:6', 4)), { velocity: .55 }), H(4)),
  5: relative(mel('r:12 | r:6 9:2 11:1 12:3 | r:12 | r:6 10:2 12:1 14:3 | r:12 | r:6 9:2 11:1 12:3 | r:12 | 11:3 9:3 8:3 6:3'), H(5)),
}

const P = (slot, name, role, behavior, source, rolls, sections, opts = {}) => ({ slot, name, role, behavior, source, rolls, sections, ...opts })
const PARTS = [
  P('a1', 'Upright bass', 'bass', 'phrase', SAMPLE('classical', 'concert-bass-pizz'), bass, on(0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    { octave: 2, gain: .25, attack: .004, decay: .35, sustain: .55, release: .18, clip: 1, lpf: 3000, hpf: 30, fills: { 2: FILL, 5: FILL }, effects: { reverb: .06 },
      design: { role: 'bass', filterEnv: .6, filterAttack: .005, filterDecay: .12 } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), kick, on(1, 2, 3, 4, 5, 6, 7, 8, 9),
    { octave: 2, gain: .11, attack: .001, decay: .25, sustain: 0, release: .1, clip: .8, lpf: 4000, hpf: 30, effects: { reverb: .04 }, design: { role: 'drums' } }),
  P('b1', 'Tenor sax', 'melody', 'phrase', SAMPLE('band', 'tenor-sax', 1), sax, on(0, 2, 3, 4, 5, 6, 8, 9),
    { octave: 3, gain: .095, attack: .06, decay: .4, sustain: .8, release: .35, clip: 1, lpf: 3600, hpf: 120, effects: { reverb: .2, pan: -.1 },
      reverbRange: { first: .18, second: .24, frequency: 'section' }, design: { role: 'lead', vibrato: 4.6, vibratoDepth: .07 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 0, false), snare, on(1, 2, 3, 4, 6, 8, 9),
    { octave: 2, gain: .08, attack: .001, decay: .18, sustain: 0, release: .1, clip: .7, lpf: 7000, hpf: 150, fills: { 3: FILL, 4: FILL, 8: FILL }, effects: { reverb: .1 }, design: { role: 'drums' } }),
  P('c1', 'Piano', 'harmony', 'phrase', SAMPLE('classical', 'concert-piano'), pianoRight, on(0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    { octave: 4, gain: .07, attack: .004, decay: .5, sustain: .4, release: .4, clip: 1, lpf: 4200, hpf: 90, fills: { 0: FILL, 3: FILL }, effects: { reverb: .18, pan: .1 } }),
  P('c2', 'Ride', 'rhythm', 'pulse', SAMPLE('percussion', 'ride', 0, false), ride, on(0, 1, 2, 4, 5, 8, 9),
    { octave: 2, gain: .035, attack: .001, decay: .4, sustain: 0, release: .3, clip: .6, lpf: 9000, hpf: 600, effects: { reverb: .08, pan: .3 }, design: { role: 'drums' } }),
  P('d1', 'Trumpet', 'response', 'phrase', SAMPLE('classical', 'orchestra-trumpet'), trumpet, on(4, 5, 6, 8, 9),
    { octave: 4, gain: .065, attack: .015, decay: .3, sustain: .7, release: .16, clip: 1, lpf: 6500, hpf: 220, effects: { reverb: .16, pan: .3 },
      design: { role: 'lead', vibrato: 5, vibratoDepth: .08 } }),
  P('d2', 'Tambourine', 'rhythm', 'pulse', SAMPLE('percussion', 'tambourine', 0, false), tambourine, on(6),
    { octave: 2, gain: .04, attack: .001, decay: .15, sustain: 0, release: .08, clip: .6, lpf: 10000, hpf: 1200, effects: { reverb: .08, pan: -.4 }, design: { role: 'drums' } }),
  P('e1', 'Trombone', 'response', 'phrase', SAMPLE('classical', 'concert-trombone'), trombone, on(2, 4, 5, 6, 8, 9),
    { octave: 2, gain: .07, attack: .02, decay: .3, sustain: .7, release: .18, clip: 1, lpf: 4000, hpf: 60, effects: { reverb: .14, pan: -.3 } }),
  P('e2', 'Ghost snare', 'rhythm', 'pulse', SAMPLE('percussion', 'ghost-snare', 0, false), ghost, on(2, 4, 5, 6, 8),
    { octave: 2, gain: .035, attack: .001, decay: .12, sustain: 0, release: .06, clip: .5, lpf: 6000, hpf: 300, effects: { reverb: .06, pan: .15 }, design: { role: 'drums' } }),
  P('f1', 'Guitar', 'harmony', 'phrase', SAMPLE('guitars', 'clean'), guitar, on(2, 3, 4, 5, 7, 8, 9),
    { octave: 3, gain: .06, attack: .002, decay: .3, sustain: .3, release: .12, clip: .8, lpf: 5000, hpf: 120, effects: { reverb: .1, pan: .4 } }),
  P('f2', 'Handclaps', 'rhythm', 'pulse', SAMPLE('brasil', 'palmas', 0, false), claps, on(6, 8),
    { octave: 2, gain: .045, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 8000, hpf: 300, effects: { reverb: .2, pan: -.2 }, design: { role: 'drums' } }),
  P('g1', 'Piano left hand', 'bass', 'phrase', SAMPLE('classical', 'concert-piano'), pianoLeft, on(0, 7, 9),
    { octave: 3, gain: .075, attack: .004, decay: .5, sustain: .4, release: .4, clip: 1, lpf: 3500, hpf: 40, effects: { reverb: .16 } }),
  P('g2', 'Parade bass drum', 'rhythm', 'pulse', SAMPLE('classical', 'concert-bass-drum', 0, false), bigDrum, on(6),
    { octave: 2, gain: .07, attack: .001, decay: .4, sustain: 0, release: .2, clip: .7, lpf: 3000, hpf: 30, effects: { reverb: .12 }, design: { role: 'drums' } }),
  P('h1', 'Clarinet', 'response', 'phrase', SAMPLE('classical', 'orchestra-clarinet'), clarinet, on(3, 6, 7),
    { octave: 4, gain: .055, attack: .02, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 8000, hpf: 200, effects: { reverb: .2, pan: .35, delay: .06 },
      design: { role: 'lead', vibrato: 5.2, vibratoDepth: .12 } }),
  P('h2', 'Cymbal', 'rhythm', 'pulse', SAMPLE('percussion', 'cymbal-tip', 0, false), cymbal, on(0, 7, 9),
    { octave: 2, gain: .04, attack: .001, decay: .8, sustain: 0, release: .6, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .14, pan: .2 }, design: { role: 'drums' } }),
]
for (const part of PARTS) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound ----------
// The intro plays like a 78 rpm side from Matassa's studio; the band opens on the first verse.
const SHELLAC = { hpf: 300, lpfRange: { first: 2800, second: 3400 }, reverbRange: { first: .03, second: .06 } }
const SECTION_PARAMS = {
  a1: { 0: { lpfRange: { first: 1400, second: 1600 } }, 6: { driveRange: { first: 1, second: 1.5 } } },
  b1: { 0: SHELLAC, 2: { gain: .085 }, 5: { gain: .11, driveRange: { first: 0, second: .6 }, reverbRange: { first: .14, second: .18 } }, 9: { reverbRange: { first: .3, second: .4 } } },
  b2: { 2: { gain: .06 }, 6: { gain: .1, resonance: 3 } },
  c1: { 0: SHELLAC, 2: { gain: .056, reverbRange: { first: .22, second: .26 } }, 7: { gain: .08 } },
  c2: { 0: SHELLAC },
  d1: { 6: { gain: .08, driveRange: { first: 1, second: 1.4 } }, 9: { reverbRange: { first: .3, second: .38 } } },
  e1: { 6: { gain: .085 } },
  g1: { 0: SHELLAC },
  h1: { 3: { reverbRange: { first: .3, second: .36 } }, 6: { gain: .065 } },
  h2: { 7: { gain: .05 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'new-orleans-1953', kitName: 'Rhythm & blues', profileName: 'Rhythm & blues · New Orleans 1953',
  bpm: 72, meter: '12/8', root: 'C', scale: 'Maior', form: FORM, parts: PARTS, ternary: true,
  reactions: reactions('new-orleans', { lift: 5, contrast: 4, lament: 2, calm: 5, finale: 6, climax: 4, solo: 3 }),
  reference: 'Rhythm and blues de Nova Orleans no início dos anos 1950 (estúdio de Cosimo Matassa, banda de Dave Bartholomew, gravações de Fats Domino na Imperial); composição original: tercinas de piano em 12/8, boogie de contrabaixo, sax tenor com blue notes, forma AABA, blues de 8 compassos, quebra de second line e stop-time.',
  url: 'https://musicrising.tulane.edu/discover/people/f/',
}).catch(error => { console.error(error); process.exit(1) })
