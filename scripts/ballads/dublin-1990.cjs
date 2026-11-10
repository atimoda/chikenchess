// 1990 Dublin - Irish jig session. Original set in the spirit of a pub session of the trad revival:
// a slow air over a drone opens, then two double jigs (AABB, the second in E Dorian) pass between
// whistle, fiddle, flute and concertina over bouzouki, guitar, céilí piano and bodhrán; a hard-shoe
// break in stop-time and a harp-and-cello lament give the strong changes of mood.
// Run: node scripts/ballads/dublin-1990.cjs
const { composer, build, reactions, SAMPLE } = require('./lib.cjs')
const C = composer('6/8', 'Maior')
const { mel, rep, hits, relative, strum, portamento, up, vel, set } = C

// D major. Roots: 0 D, 1 Em, 3 G, 4 A, 5 Bm.
const A = [0, 3, 0, 4, 0, 3, 4, 0], B = [5, 5, 3, 0, 5, 3, 4, 0]
const FORM = [
  { label: 'Intro', bars: 8, bank: 0, harmony: [0, 0, 3, 3, 5, 5, 4, 4] },     // slow air over the drone
  { label: 'Verse', bars: 8, bank: 1, harmony: A },                            // jig 1, A part
  { label: 'Chorus', bars: 8, bank: 2, harmony: B },                           // jig 1, B part
  { label: 'Verse', bars: 8, bank: 1, harmony: A },
  { label: 'Chorus', bars: 8, bank: 2, harmony: B },
  { label: 'Interlude', bars: 8, bank: 3, harmony: [1, 1, 0, 0, 1, 1, 0, 1] }, // jig 2 in E Dorian
  { label: 'Break', bars: 8, bank: 4, harmony: [0, 0, 0, 0, 3, 3, 4, 4] },    // hard-shoe stop-time
  { label: 'Bridge', bars: 8, bank: 5, harmony: [5, 5, 3, 3, 0, 0, 4, 4] },   // lament
  { label: 'Solo', bars: 8, bank: 6, harmony: A },                             // concertina variations
  { label: 'Outro', bars: 8, bank: 2, harmony: B },
]
const H = bank => FORM.find(s => s.bank === bank).harmony
const FILL = 7
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)

// ---------- tunes (absolute degrees of D major) ----------
const AIR = mel('r:2 -3:1 0:3~ | 2:2 1:1 0:3~ | 3:3 4:1 5:2 | 4:6~* | 5:3 4:1 2:1 4:1 | 5:4~ 7:2 | 8:2 7:1 6:2 4:1 | 4:6~*', { gate: .98, accent: { strong: .8, beat: .7, off: .62 } })
const JIG_A = mel('0:1 2:1 4:1 7:2 4:1 | 3:1 5:1 7:1 5:2 3:1 | 4:1 2:1 0:1 2:1 4:1 2:1 | 1:2 -1:1 -3:2 -1:1 | 0:1 2:1 4:1 7:1 6:1 7:1 | 8:2 7:1 5:2 3:1 | 4:1 6:1 8:1 6:1 4:1 1:1 | 2:2 0:1 0:3', { gate: .86, accent: { strong: 1, beat: .9, off: .7 } })
const JIG_B = mel('7:1 8:1 9:1 11:2 9:1 | 8:1 9:1 8:1 7:1 5:2 | 7:2 5:1 3:2 5:1 | 7:1 9:1 11:1 9:2 7:1 | 9:2 8:1 7:2 5:1 | 7:1 5:1 3:1 5:1 7:1 8:1 | 9:1 8:1 6:1 4:1 6:1 8:1 | 7:2 4:1 7:3', { gate: .86, accent: { strong: 1, beat: .9, off: .7 } })
const JIG_2 = mel('1:2 5:1 8:2 5:1 | 7:1 5:1 4:1 5:2 3:1 | 0:2 4:1 7:2 4:1 | 6:1 4:1 2:1 4:1 2:1 0:1 | 1:2 5:1 8:1 7:1 8:1 | 9:1 8:1 7:1 5:2 4:1 | 3:1 2:1 0:1 2:1 4:1 7:1 | 5:2 1:1 1:3', { gate: .86, accent: { strong: 1, beat: .9, off: .7 } })
// Ornaments: a "cut" (ratchet) on long notes, like the rolls of the whistle and the fiddle.
const ornament = notes => notes.map((n, i) => n.duration > .25 && i % 3 === 1 ? { ...n, ratchet: 3, velocity: Math.min(1, n.velocity + .05) } : n)
const LAMENT = mel('9:3~ 8:1 7:2 | 5:6~ | 7:2 8:1 9:3~ | 8:4 7:2 | 4:2 5:1 7:3~ | 9:3 8:1 7:2 | 8:6~* | r:6', { gate: .97 })
// Concertina variation: the A tune with triplet runs filling the long notes.
const VARIATION = mel('0:1 2:1 4:1 7:1 6:1 4:1 | 3:1 5:1 7:1 8:1 7:1 5:1 | 4:1 2:1 0:1 2:1 4:1 7:1 | 1:1 2:1 1:1 -1:1 -3:1 -1:1 | 0:1 2:1 4:1 7:1 8:1 7:1 | 8:1 9:1 8:1 7:1 5:1 3:1 | 4:1 6:1 8:1 9:1 8:1 6:1 | 7:2 4:1 0:3', { gate: .82, accent: { strong: 1, beat: .88, off: .68 } })

// ---------- a1 Cello: drone in the air, bass line in the tunes, the lament's countermelody ----------
const cello = {
  0: mel(rep('0:6~', 8), { gate: 1, accent: { strong: .7 } }),
  1: mel(rep('0:3 4:3 | 0:3 -3:3', 4), { accent: { strong: .9, beat: .75 } }),
  2: mel(rep('0:3 4:2 2:1 | 0:3 -3:3', 4), { accent: { strong: .9, beat: .75 } }),
  3: mel(rep('0:3 4:3 | 0:3 -1:3', 4), { accent: { strong: .9, beat: .75 } }),
  4: mel(rep('0:1!# r:5 | r:6 | 0:1!# r:2 0:1! r:2 | r:3 0:1! 0:1 r:1', 2)),
  5: relative(portamento(mel('2:6~ | 4:3 2:3 | 3:6~ | 5:3 4:3 | 0:6~ | 2:3 0:3 | -3:6~ | -1:6~*', { gate: .97 }), 3, .12), H(5)),
  6: mel(rep('0:3 4:3 | 0:2 2:1 4:3', 4)),
  [FILL]: mel('0:1 2:1 4:1 6:1 7:2'),
}

// ---------- a2 Bodhrán (tuned-down tom: low = 0, high = 4), f2 its rim ----------
const bodhranJig = mel(rep("0:1! 4:1' 4:1 0:1 4:1' 4:1 | 0:1! 4:1' 4:1x3 0:1 4:1 0:1", 4), { gate: .6 })
const bodhran = {
  1: bodhranJig, 2: bodhranJig,
  3: mel(rep("0:1! 4:1' 4:1 0:1 4:1' 4:1x2", 8), { gate: .6 }),
  4: mel(rep("0:1!# r:5 | r:6 | 0:1!# r:2 0:1! r:2 | 0:1 4:1x3 4:1 0:1x2 4:1 0:1!", 2), { gate: .6 }),
  6: mel(rep("0:1! 4:1' 4:1 0:1 4:1' 4:1 | 0:1 4:1x3 4:1 0:1! 4:1 4:1x2", 4), { gate: .6 }),
  [FILL]: mel("0:1x3 4:1x3 0:1x3 4:1 0:1! 0:1!", { gate: .6 }),
}
const rim = {
  2: hits(rep('..o..o', 8)),
  3: hits(rep('..o..o | ..o.oo', 4)),
  6: hits(rep('.o..oo', 8)),
}

// ---------- b1 Tin whistle ----------
const whistle = {
  0: relative(AIR, H(0)),
  1: relative(ornament(JIG_A), H(1)),
  2: relative(ornament(JIG_B), H(2)),
  3: relative(ornament(JIG_2), H(3)),
  5: relative(set(mel('r:6 | r:6 | r:6 | r:3 9:1 8:1 7:1 | r:6 | r:6 | r:6 | r:6'), { delay: .3, velocity: .6 }), H(5)),
}

// ---------- b2 Bouzouki: drones and chops in the jigs ----------
const chop = '0,4,7:2 0,4,7:1 0,4,7:2 0,4,7:1'
const bouzouki = {
  1: strum(mel(rep(chop, 8), { accent: { strong: .95, beat: .85, off: .6 } })),
  2: strum(mel(rep(chop, 8), { accent: { strong: .95, beat: .85, off: .6 } })),
  3: strum(mel(rep('0,4,7:3 0,4,7:2 0,4,7:1', 8))),
  4: strum(mel(rep('0,4,7:1! r:5 | r:6 | 0,4,7:1! r:2 0,4,7:1! r:2 | r:3 0,4,7:1 0,4,7:1 0,4,7:1', 2))),
  6: strum(mel(rep('0,4,7:2 0,4,7:1 0,4,7:1 0,4,7:1 0,4,7:1', 8))),
}

// ---------- c1 Fiddle ----------
const fiddle = {
  0: relative(set(mel('r:6 | r:6 | r:6 | r:6 | 2:6~ | 4:6~ | 4:6~ | 1:6~'), { velocity: .5 }), H(0)),
  1: relative(set(ornament(JIG_A), {}), H(1)),
  2: relative(ornament(JIG_B), H(2)),
  3: relative(up(ornament(JIG_2), 0), H(3)),
  4: mel(rep("0,4:1!# r:5 | r:6 | 0,4:1! r:2 0,4:1! r:2 | 4:1 2:1 0:1 2:1 4:1 7:1", 2)),
  5: relative(set(mel('7:6~ | 7:6~ | 5:6~ | 7:6~ | 4:6~ | 4:6~ | 6:6~ | 4:6~*'), { velocity: .55 }), H(5)),
  6: relative(set(mel('r:6 | r:3 8:1 7:1 5:1 | r:6 | r:3 6:1 4:1 2:1 | r:6 | r:3 10:1 9:1 8:1 | r:6 | r:6'), { velocity: .75 }), H(6)),
}

// ---------- c2 Guitar: rhythm in the jigs (bass note, chord, upstroke) ----------
const guitarJig = strum(mel(rep('-7:1 0,2,4:1 0,2,4:1 -3:1 0,2,4:1 0,2,4:1', 8), { accent: { strong: .95, beat: .85, off: .55 } }))
const guitar = { 1: guitarJig, 2: guitarJig, 3: guitarJig, 6: guitarJig }

// ---------- d1 Concertina ----------
const concertina = {
  2: relative(set(up(JIG_B, -2), { velocity: .55 }), H(2)),
  3: mel(rep('r:6 | 0,2,4:3 0,2,4:3', 4), { accent: { strong: .7, beat: .6 } }), // chord tones, already chord-relative
  6: relative(ornament(VARIATION), H(6)),
}

// ---------- d2 Step taps (wood), g2 Foot stomps, e2 Claps ----------
const taps = {
  4: hits(rep('X..... | ...... | X..X.. | .xx.xX | XoxXox | Xoxxox | X.X.X. | xxxX..', 1)),
  6: hits(rep('...o.. | ...o.o', 4)),
}
const stomp = {
  1: hits(rep('x..o..', 8)), 2: hits(rep('x..o..', 8)), 3: hits(rep('x..x..', 8)),
  4: hits(rep('X..... | ...... | X..X.. | ......', 2)), 6: hits(rep('x..x..', 8)),
}
const claps = {
  4: hits(rep('...... | ...... | ...... | ...X.X', 2)),
  6: hits(rep('...x.. | ...x.x', 4)),
}

// ---------- e1 Flute: doubles the second time through, harmony in jig 2 ----------
const flute = {
  1: relative(set(up(JIG_A, 7), { velocity: .6, chance: .9 }), H(1)),
  2: relative(set(JIG_B, { velocity: .75 }), H(2)),
  3: relative(set(up(JIG_2, 2), { velocity: .6 }), H(3)),
  5: relative(set(mel('r:6 | r:6 | 7:3~ 8:3 | 9:6~ | r:6 | r:6 | 8:3~ 6:3 | 7:6~*'), { velocity: .6 }), H(5)),
}

// ---------- f1 Pipes drone (bassoon reed, octave + fifth) ----------
const drone = {
  0: mel(rep('-7,-3:6', 8), { gate: 1, accent: { strong: .8 } }),
  4: mel(rep('-7,-3:6', 8), { gate: 1, accent: { strong: .9 } }),
  5: mel(rep('-7:6', 8), { gate: 1, accent: { strong: .6 } }),
}
// The drone ignores the chords: written chord-relative, so cancel each bar's root.
for (const bank of [0, 4, 5]) drone[bank] = drone[bank].map(n => ({ ...n, degree: n.degree - H(bank)[Math.floor(n.start + 1e-6) % 8] }))

// ---------- g1 Céilí piano: vamp (bass on 1, chord on 4) ----------
const vamp = mel(rep('-7:2 r:1 0,2,4:2 r:1 | -3:2 r:1 0,2,4:2 r:1', 4), { accent: { strong: .85, beat: .75 } })
const piano = { 2: vamp, 3: mel(rep('-7:2 r:1 0,2,4:2 r:1', 8)), 6: vamp, 5: mel(rep('-7,0,2,4:6*', 8), { gate: 1, accent: { strong: .45 } }) }

// ---------- h1 Second fiddle: harmony a third below in the repeats ----------
const second = {
  1: relative(set(up(JIG_A, -2), { velocity: .55 }), H(1)),
  2: relative(set(up(JIG_B, -2), { velocity: .55 }), H(2)),
  6: relative(set(up(VARIATION, -2), { velocity: .5, chance: .85 }), H(6)),
}

// ---------- h2 Harp (plucked nylon): arpeggios in the air and the lament ----------
const arp = mel(rep('0:1 2:1 4:1 7:1 4:1 2:1', 8), { gate: 1.6, accent: { strong: .75, beat: .65, off: .5 } })
const harp = { 0: arp, 5: mel(rep('-7:1 0:1 2:1 4:1 7:1 9:1 | 7:1 4:1 2:1 0:1 2:1 4:1', 4), { gate: 1.6, accent: { strong: .75, beat: .65, off: .5 } }) }

const P = (slot, name, role, behavior, source, rolls, sections, opts = {}) => ({ slot, name, role, behavior, source, rolls, sections, ...opts })
const PARTS = [
  P('a1', 'Cello', 'bass', 'phrase', SAMPLE('classical', 'orchestra-cello'), cello, on(0, 1, 2, 3, 4, 5, 6, 7, 8, 9),
    { octave: 2, gain: .12, attack: .03, decay: .4, sustain: .8, release: .3, clip: 1, lpf: 3000, hpf: 40, fills: { 4: FILL }, effects: { reverb: .2 },
      design: { vibrato: 5, vibratoDepth: .12 } }),
  P('a2', 'Bodhrán', 'rhythm', 'pulse', SAMPLE('percussion', 'tom'), bodhran, on(2, 3, 4, 5, 6, 8, 9),
    { octave: 3, gain: .1, attack: .001, decay: .25, sustain: 0, release: .1, clip: .7, lpf: 2600, hpf: 40, fills: { 3: FILL, 5: FILL, 8: FILL }, effects: { reverb: .1 },
      design: { role: 'drums', filterEnv: 1.2, filterAttack: .002, filterDecay: .06 } }),
  P('b1', 'Tin whistle', 'melody', 'phrase', SAMPLE('classical', 'alto-recorder-sustain'), whistle, on(0, 1, 2, 3, 4, 5, 7, 9),
    { octave: 5, gain: .085, attack: .015, decay: .2, sustain: .85, release: .14, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .2, pan: -.15 },
      reverbRange: { first: .16, second: .24, frequency: 'section' }, design: { role: 'lead', vibrato: 5.5, vibratoDepth: .1 } }),
  P('b2', 'Bouzouki', 'harmony', 'phrase', SAMPLE('brasil', 'viola-caipira'), bouzouki, on(1, 2, 3, 4, 5, 6, 8, 9),
    { octave: 3, gain: .06, attack: .002, decay: .3, sustain: .3, release: .2, clip: .9, lpf: 6000, hpf: 120, effects: { reverb: .12, pan: .35 } }),
  P('c1', 'Fiddle', 'melody', 'phrase', SAMPLE('classical', 'violin-sustain'), fiddle, on(0, 3, 4, 5, 6, 7, 8, 9),
    { octave: 4, gain: .085, attack: .02, decay: .3, sustain: .85, release: .16, clip: 1, lpf: 9000, hpf: 200, effects: { reverb: .16, pan: .2 },
      design: { role: 'lead', vibrato: 5.6, vibratoDepth: .12 } }),
  P('c2', 'Guitar', 'harmony', 'phrase', SAMPLE('guitars', 'nylon'), guitar, on(1, 2, 3, 4, 5, 8, 9),
    { octave: 3, gain: .07, attack: .002, decay: .3, sustain: .35, release: .15, clip: .9, lpf: 6500, hpf: 80, effects: { reverb: .1, pan: -.35 }, extra: { playChance: .96 } }),
  P('d1', 'Concertina', 'melody', 'phrase', SAMPLE('keys', 'accordion'), concertina, on(4, 5, 8, 9),
    { octave: 4, gain: .065, attack: .01, decay: .2, sustain: .75, release: .1, clip: .95, lpf: 5500, hpf: 200, effects: { reverb: .14, pan: -.3 },
      design: { role: 'lead', lfoTarget: 'gain', lfoRate: 6, lfoUnit: 'hz', lfoDepth: .06, lfoShape: 'sine' } }),
  P('d2', 'Step taps', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), taps, on(6, 8),
    { octave: 2, gain: .06, attack: .001, decay: .08, sustain: 0, release: .04, clip: .4, lpf: 7000, hpf: 300, effects: { reverb: .14, pan: .1 }, design: { role: 'drums' } }),
  P('e1', 'Flute', 'melody', 'phrase', SAMPLE('classical', 'flute-sustain'), flute, on(3, 4, 5, 7),
    { octave: 4, gain: .07, attack: .03, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 8000, hpf: 250, effects: { reverb: .2, pan: .3 },
      design: { role: 'lead', vibrato: 4.8, vibratoDepth: .1 } }),
  P('e2', 'Claps', 'rhythm', 'pulse', SAMPLE('brasil', 'palmas', 0, false), claps, on(6, 8),
    { octave: 2, gain: .05, attack: .001, decay: .12, sustain: 0, release: .08, clip: .6, lpf: 8000, hpf: 300, effects: { reverb: .2, pan: -.2 }, design: { role: 'drums' } }),
  P('f1', 'Pipes drone', 'texture', 'sustain', SAMPLE('classical', 'orchestra-bassoon'), drone, on(0, 6, 7),
    { octave: 3, gain: .045, attack: .5, decay: .5, sustain: .9, release: .8, clip: 1, lpf: 2500, hpf: 60, effects: { reverb: .3 },
      design: { role: 'pad', lfoTarget: 'lpf', lfoRate: 4, lfoUnit: 'bars', lfoDepth: .2, lfoShape: 'sine' } }),
  P('f2', 'Bodhrán rim', 'rhythm', 'pulse', SAMPLE('percussion', 'muted-conga', 1, false), rim, on(4, 5, 8, 9),
    { octave: 2, gain: .04, attack: .001, decay: .1, sustain: 0, release: .05, clip: .5, lpf: 6000, hpf: 300, effects: { reverb: .06, pan: .25 }, design: { role: 'drums' } }),
  P('g1', 'Céilí piano', 'harmony', 'phrase', SAMPLE('classical', 'concert-piano'), piano, on(4, 5, 7, 8, 9),
    { octave: 3, gain: .07, attack: .002, decay: .4, sustain: .4, release: .3, clip: 1, lpf: 6000, hpf: 50, effects: { reverb: .16, pan: .1 } }),
  P('g2', 'Foot stomp', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), stomp, on(1, 2, 3, 4, 5, 6, 8, 9),
    { octave: 2, gain: .07, attack: .001, decay: .2, sustain: 0, release: .1, clip: .6, lpf: 900, hpf: 30, effects: { reverb: .12 }, design: { role: 'drums' } }),
  P('h1', 'Second fiddle', 'response', 'phrase', SAMPLE('classical', 'orchestra-violin'), second, on(3, 4, 8, 9),
    { octave: 4, gain: .05, attack: .03, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 7000, hpf: 250, effects: { reverb: .2, pan: .4 } }),
  P('h2', 'Harp', 'response', 'phrase', SAMPLE('guitars', 'nylon'), harp, on(0, 7),
    { octave: 4, gain: .06, attack: .002, decay: .8, sustain: .4, release: .8, clip: 1, lpf: 7000, hpf: 150, effects: { reverb: .32, pan: .25, delay: .1 },
      design: { delayTime: '3/16', delayFeedback: .25 } }),
]
for (const part of PARTS) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound ----------
const AIRY = { reverbRange: { first: .38, second: .48 } }
const SECTION_PARAMS = {
  a1: { 0: { gain: .09, lpfRange: { first: 1400, second: 1800 } }, 6: { driveRange: { first: 1, second: 1.6 } }, 7: { gain: .14, ...AIRY, vibratoDepth: .2 } },
  a2: { 6: { gain: .13, driveRange: { first: 1, second: 1.6 }, resonance: 4 }, 9: { gain: .12 } },
  b1: { 0: { ...AIRY, vibratoDepth: .18 }, 1: { reverbRange: { first: .1, second: .14 } }, 7: { delay: .3, ...AIRY } },
  b2: { 6: { clip: .5, gain: .08 } },
  c1: { 0: AIRY, 3: { gain: .1 }, 6: { driveRange: { first: 1, second: 1.4 }, clip: .5 }, 7: { ...AIRY, gain: .07 }, 9: { gain: .1 } },
  c2: { 1: { gain: .055 } },
  d1: { 8: { gain: .085, reverbRange: { first: .12, second: .16 } } },
  f1: { 0: { gain: .05 }, 6: { gain: .055, lfoDepth: .4 } },
  g2: { 6: { gain: .1, driveRange: { first: 1, second: 1.5 } } },
  h2: { 7: { ...AIRY, gain: .07 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'dublin-1990', kitName: 'Jig session', profileName: 'Jig session · Dublin 1990',
  bpm: 100, meter: '6/8', root: 'D', scale: 'Maior', form: FORM, parts: PARTS, ternary: true,
  reactions: reactions('dublin', { record: { hpf: 240, lpf: 3800 }, lift: 2, contrast: 4, lament: 5, calm: 0, finale: 2, climax: 6, solo: 6 }),
  reference: 'Sessão de música tradicional irlandesa em Dublin no revival de 1990: air lento sobre bordão e duas double jigs em forma AABB (a segunda em Mi dórico), com whistle, rabeca, flauta, concertina, bouzouki, violão, piano de céilí e bodhrán; composição original com quebra de hard-shoe em stop-time e um lamento de harpa e violoncelo.',
  url: 'https://jsmi.musicologyireland.ie/index.php/journal/article/view/215',
}).catch(error => { console.error(error); process.exit(1) })
