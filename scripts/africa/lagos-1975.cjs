// 1975 Lagos - Afrobeat (original material).
// A night at the Shrine: the tenor guitar starts alone with the shekere and the sticks, the rhythm guitar and
// the congas join, then bass and drum kit lock in and only after that do the horns speak. The kit plays the
// loose, conversational pattern of the style (kick and snare talking across the bar, ghosted snare, hi-hat
// never even), the bass and both guitars are ostinatos that follow the harmony, the horns move in parallel
// fourths, the organ takes the verse and the tenor saxophone the solo.
// G Dorian (Kit Harmony): the minor vamp against its major IV.
// Form: entrada (instruments one by one) · organ verse · horn theme · interlude (soft: organ, bass in half
// time, shekere and congas) · organ verse · stabs (tense: D minor, horns and drums in unison hits) ·
// tenor solo · horn theme · final.
// Run: node scripts/africa/lagos-1975.cjs
const { studio, build, reactions, SAMPLE, DRUM, P } = require('../brazilian/lib.cjs')
const S = studio('4/4', 'Dórica', {
  // G Dorian degrees: 0 G · 1 A · 2 Bb · 3 C · 4 D · 5 E · 6 F.
  root: { Gm: 0, C: -4, Dm: -3, F: -1 },
  names: {
    0: ['Gm'], 1: ['Gm', 'Gm', 'Gm', 'Gm', 'C', 'C', 'Gm', 'Gm'], 2: ['Gm', 'C', 'Gm', 'C', 'Gm', 'C', 'Dm', 'Gm'],
    3: ['Gm', 'Gm', 'F', 'F', 'Gm', 'Gm', 'C', 'C'], 4: ['Gm'], 5: ['Dm', 'Dm', 'C', 'C', 'Dm', 'Dm', 'C', 'Dm'], 6: ['Gm', 'C', 'Dm', 'Gm'],
  },
  sections: [['Intro', 8, 0], ['Verse', 8, 1], ['Chorus', 8, 2], ['Interlude', 8, 3], ['Verse', 8, 1], ['Break', 8, 5], ['Solo', 8, 4], ['Chorus', 8, 2], ['Outro', 4, 6]],
  // Laid back: the second and fourth sixteenths a tick late (~16 ms), loose hands.
  feel: { push: [0, 1, 0, 1], jitter: 1, vel: .07 },
  colour: { spread: .1, ring: .16 },
})
const { C, H, FORM, FILL, on, ALL, drum, beat, sing, under, comp, riff, from, unroll, finish } = S
const { rep, mel, relative, swell } = C
const R = '................'
const Z = '. . . . . . . . . . . . . . . .'
const STABS = 'X.X. ..X. ..X. .... | X.X. ..x. X... ....'
const END = 'X..X ..X. X... .... | X... .... .... ....'
const enter = (bar, groove) => `${rep(R, bar)} | ${C.tile(groove, 8 - bar)}`

// ---------- drum kit: kick and snare talk, the hat breathes ----------
const KICK = 'X..x .... ..X. .... | X..x .... ..X. .x..', SNARE = '.... X... .... X... | .... X... .... X..x'
const kick = {
  0: beat(11, enter(4, KICK)), 1: drum(1, 12, KICK), 2: drum(2, 13, 'X..x .... ..X. ..x. | X..x ..x. ..X. .x..'), 3: drum(3, 14, 'o... .... .... .... | o... .... ..h. ....'),
  4: drum(4, 15, KICK), 5: drum(5, 16, STABS), 6: beat(17, `X..x .... ..X. ..x. | X..x ..x. ..X. .x.. | ${END}`),
}
const snare = {
  0: beat(21, enter(4, SNARE)), 1: drum(1, 22, SNARE), 2: drum(2, 23, '.... X... .... X..x | .... X..x .... X.xx'),
  4: drum(4, 24, SNARE), 5: drum(5, 25, STABS), 6: beat(26, `.... X... .... X..x | .... X..x .... X.xx | ${END}`),
}
const ghost = {
  1: drum(1, 31, '.g.. ..g, .g.g ..g. | .g., ..g. .g.g .,g.'), 2: drum(2, 32, '.g.g ..g. .g.g ..g. | .g.g ..g. .g.g .gg.'),
  4: drum(4, 33, '.g.. ..g, .g.g ..g. | .g., ..g. .g.g .,g.'), 5: drum(5, 34, '.... .... .... g,gm | .... .... .... gmxm'),
}
const hat = {
  0: beat(41, enter(4, 'x.hm x.hm x.hm x.hx')), 1: drum(1, 42, 'x.hm x,hm x.hm x.hx | x.hm x.hm x,hm xmhx'), 2: drum(2, 43, 'xhhm xhhm xhhm xhhx'),
  3: drum(3, 44, 'h.g. h.g, h.g. h.g.'), 4: drum(4, 45, 'x.hm x,hm x.hm x.hx | x.hm x.hm x,hm xmhx'), 5: drum(5, 46, 'x... x... x... x.hm | x... x... x... xhxh'),
  6: beat(47, `xhhm xhhm xhhm xhhx | xhhm xhhm xhhm xhhx | ${END}`),
}
// ---------- shekere, sticks, congas ----------
const shekere = {
  0: beat(51, 'o.g, o.g, o.g, o.g, | o.gh o.gh o.gh o.gh | ' + rep('X.hm X.hm X.hm X.hm', 6)), 1: drum(1, 52, 'X.hm X.hm X.hm X.hm | X.hm X.hm X.hm X.mx'),
  2: drum(2, 53, 'X.mx X.mx X.mx X.mx'), 3: drum(3, 54, 'o.g, o.g, o.g, o.gh'), 4: drum(4, 55, 'X.hm X.hm X.hm X.hm | X.hm X.hm X.hm X.mx'),
  5: drum(5, 56, 'X.mx X.mx X.mx X.mx'), 6: beat(57, `X.mx X.mx X.mx X.mx | X.mx X.mx X.mx X.mx | ${END}`),
}
const STICKS = 'x..x ..x. ..x. x...'
const sticks = {
  0: beat(61, enter(0, 'o..o ..o. ..o. o...')), 1: drum(1, 62, STICKS), 2: drum(2, 63, STICKS), 3: drum(3, 64, 'h..h ..h. ..h. h...'),
  4: drum(4, 65, STICKS), 6: beat(66, `${STICKS} | ${STICKS} | ${END}`),
}
const congaOpen = {
  0: beat(71, enter(2, 'o... ..x. .... x.x. | o... ..x. ..o. x.x.')), 1: drum(1, 72, 'o... ..x. .... x.x. | o... ..x. ..o. x.x.'), 2: drum(2, 73, 'x... ..x. ..o. x.x. | x.o. ..x. ..o. x.xx'),
  3: drum(3, 74, 'h... ..o. .... o.o.'), 4: drum(4, 75, 'x.o. ..x. .xo. x.x. | o.x. .ox. ..x. xxox'), 5: drum(5, 76, '.... .... .... x.xx | .... .... ..xx x.xx'),
  6: beat(77, `x... ..x. ..o. x.x. | x.o. ..x. ..o. x.xx | ${END}`),
}
const congaSlap = {
  0: beat(81, enter(2, '..h. h... h.h. .... | ..h. h..h h.h. ....')), 1: drum(1, 82, '..h. h... h.h. .... | ..h. h..h h.h. ....'), 2: drum(2, 83, '..o. o..h o.h. .... | ..o. o..h o.h. ....'),
  3: drum(3, 84, '..g. h... g.h. ....'), 4: drum(4, 85, '..o. o..h o.h. .o.. | .o.. o.o. .o.h ....'), 5: drum(5, 86, '.... ..o. ..o. .... | .... ..o. .o.. ....'),
}
const toms = { [FILL]: beat(91, 'x.o. x.o. xmxm XXXx') }

// ---------- bass and the two guitars: ostinatos written on the chord, Kit Harmony moves them ----------
const BASS = '0:3! 0:1 r:2 4:2 5:2 r:2 7:2 5:2 | 4:3 4:1 r:2 2:2 3:2 r:2 4:2 r:2'
const bassRiff = seed => riff(2, seed, BASS, { gate: .7, accent: { strong: .94, beat: .8, off: .72 }, feel: { push: [0, 0, 0, 1], jitter: 0 } })
const bass = {
  0: from(4, unroll(bassRiff(101), 8)), 1: bassRiff(102), 2: riff(2, 103, '0:3! 0:1 r:2 4:2 5:2 r:2 7:2 5:2 | 4:3 4:1 r:2 2:2 3:2 4:2 5:2 6:2', { gate: .7 }),
  3: riff(2, 104, '0:6! 4:2 7:6 4:2 | 0:6! 4:2 2:4 4:4', { gate: .9 }), 4: bassRiff(105),
  5: riff(2, 106, '0:2! 0:2 r:2 0:2 r:2 0:2 r:4 | 0:2! 0:2 r:2 0:2 4:2 r:6', { gate: .6 }),
  6: mel('0:3! 0:1 r:2 4:2 5:2 r:2 7:2 5:2 | 0:3! 0:1 r:2 4:2 5:2 r:2 7:2 5:2 | 0:3! 0:3 0:2 0:8 | 0:8!', { gate: .7 }),
}
const TENOR = '7:2 r:1 7:1 9:2 7:1 r:1 4:2 r:1 4:1 6:2 7:2 | 7:2 r:1 7:1 9:2 7:1 r:1 4:2 6:2 r:1 4:1 2:2'
const tenorRiff = seed => riff(2, seed, TENOR, { gate: .55, accent: { strong: .8, beat: .72, off: .64 } })
const tenor = { 0: unroll(tenorRiff(111), 8), 1: tenorRiff(112), 2: tenorRiff(113), 4: tenorRiff(114), 6: unroll(tenorRiff(115), 2) }
const CHORD = { Gm: [2, 4, 6], C: [2, 5, 7], Dm: [1, 4, 6], F: [1, 3, 6] }
const SCRATCH = 'h.xh .x.h h.xh .xh. | h.xh .x.h h.xh .x.x'
const scratch = {
  0: from(2, unroll(comp(CHORD, 0, SCRATCH, 121, { length: 1 / 30 }), 8)), 1: comp(CHORD, 1, SCRATCH, 122, { length: 1 / 30 }), 2: comp(CHORD, 2, 'x.xh .x.x x.xh .x.x', 123, { length: 1 / 30 }),
  3: comp(CHORD, 3, '..h. .... ..h. .h..', 124, { length: 1 / 24 }), 4: comp(CHORD, 4, SCRATCH, 125, { length: 1 / 30 }), 5: comp(CHORD, 5, 'X.X. ..X. ..X. .... | X.X. ..x. X... ....', 126, { length: 1 / 24 }),
  6: relative(S.hand(127, C.named(['Gm', 'C', 'Dm', 'Gm'], `x.xh .x.x x.xh .x.x | x.xh .x.x x.xh .x.x | ${END}`, CHORD, { length: 1 / 24 })), H(6)),
}

// ---------- organ, horns, tenor saxophone (sixteen sixteenths a bar, '.' holds) ----------
const VERSO = ['. . 4 . 6 . 7 . . . 6 . 4 . . .', '2 . . 4 . . . . . . . . . . . .', '. . 4 . 6 . 7 . . . 9 . 7 . . .', '6 . . 4 . . . . . . . . . . . .',
  '. . 5 . 7 . 9 . . . 7 . 5 . . .', '3 . . 5 . . . . . . . . . . . .', '. . 4 . 6 . 7 . . . 6 . 4 . . .', '2 . . 0 . . . . . . . . . . . .']
const VERSO_METAIS = [Z, '. . . . . . . . 7 . 7 . . . 7 .', Z, '. . . . . . . . 7 . 7 . 9 . . .', Z, '. . . . . . . . 5 . 5 . . . 5 .', Z, '. . . . . . . . 7 . 6 . 4 . . .']
const TEMA = ['7 . . 7 . . 6 . 7 . . . 4 . . .', '5 . . 5 . . 4 . 5 . . . 3 . . .', '7 . . 7 . . 6 . 7 . 9 . 7 . . .', '5 . . . . . . . . . . . . . . .',
  '7 . . 7 . . 6 . 7 . . . 4 . . .', '5 . . 5 . . 4 . 5 . 7 . 5 . . .', '8 . . 8 . . 6 . 4 . . 6 . . 8 .', '7 . . . . . . . . . . . . . . .']
const CALMA = ['9 . . . . . 7 . . . 6 . . . . .', '7 . . . . . . . . . . . 4 . . .', '8 . . . . . 6 . . . 5 . . . . .', '6 . . . . . . . . . . . . . . .',
  '9 . . . . . 11 . . . 9 . . . . .', '7 . . . . . . . . . . . 6 . . .', '5 . . . . . 7 . . . 9 . . . . .', '7 . . . . . . . . . . . . . . .']
const GOLPES = ['8 . 8 . . . 8 . . . 8 . . . . .', '8 . 8 . . . 6 . 8 . . . . . . .', '7 . 7 . . . 7 . . . 7 . . . . .', '7 . 7 . . . 5 . 7 . . . . . . .',
  '8 . 8 . . . 8 . . . 8 . . . . .', '8 . 8 . . . 6 . 8 . . . . . . .', '7 . 7 . 9 . 7 . 5 . 7 . 9 . . .', '8 . . . . . . . 8 8 8 . 8 . . .']
const SOLO = ['4 . 6 7 . 9 . 7 6 . 4 . 6 . . .', '7 . . . . . 6 4 2 . 4 . . . . .', '. . 4 6 7 . 9 . 11 . 9 . 7 . 6 .', '7 . . . . . . . . . 4 . 6 . 7 .',
  '9 . . 7 . . 9 . 11 . . 9 . . 7 .', '6 . 7 . 6 . 4 . 2 . . . 0 . 2 .', '4 4 . 4 6 . 7 . 9 . 7 . 6 . 4 .', '7 . . . . . . . . . . . . . . .']
const FIM = ['7 . . 7 . . 6 . 7 . . . 4 . . .', '5 . . 5 . . 4 . 5 . 7 . 5 . . .', '8 . . 8 . . 6 . 4 . . 6 . . 8 .', '7 . . . . . . . . . . . . . . .']
const horn = { glide: 0, low: .62, high: .92, line: { vibratoFrom: 6 } }
// The organ sings the verse; elsewhere it holds or stabs the chords under the horns.
const organ = {
  1: sing(VERSO, 1, 131, { low: .5, high: .8, glide: 0 }), 2: comp(CHORD, 2, 'h... .... .... ....', 141, { length: .9 }),
  3: [...sing(CALMA, 3, 132, { low: .4, high: .62, jitter: 2 }), ...C.vel(comp(CHORD, 3, 'o... .... .... ....', 142, { length: .95 }).notes, .7)],
  4: comp(CHORD, 4, '..h. .... ..h. .... | ..h. .... ..h. .h..', 143, { length: 1 / 10 }), 5: comp(CHORD, 5, 'X... .... .... ....', 144, { length: .9 }),
}
const trumpet = { 1: sing(VERSO_METAIS, 1, 151, horn), 2: sing(TEMA, 2, 152, horn), 5: sing(GOLPES, 5, 153, { ...horn, low: .76, high: .98 }), 6: sing(FIM, 6, 154, { ...horn, low: .7, high: .96 }) }
const sax = {
  1: sing(VERSO_METAIS, 1, 161, horn), 2: sing(TEMA, 2, 162, horn), 4: sing(SOLO, 4, 163, { low: .55, high: .92, glide: 4, jitter: 2, line: { vibratoFrom: 5 } }),
  5: sing(GOLPES, 5, 164, { ...horn, low: .74, high: .96 }), 6: sing(FIM, 6, 165, { ...horn, low: .7, high: .94 }),
}
const trombone = { 1: under(VERSO_METAIS, 1, 171, horn, -3), 2: under(TEMA, 2, 172, horn, -3), 5: under(GOLPES, 5, 173, { ...horn, low: .74, high: .96 }, -3), 6: under(FIM, 6, 174, { ...horn, low: .7, high: .94 }, -3) }

const TUNED = { mapping: { fileDegrees: 0, rankDegrees: 0 } }
const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = finish([
  P('a1', 'Bass guitar', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { ...TUNED, octave: 2, gain: .48, attack: .005, decay: .4, sustain: .4, release: .14, clip: 1, lpf: 1700, hpf: 35, effects: { reverb: .05, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: .1 } }),
  P('a2', 'Kick', 'rhythm', 'pulse', DRUM('percussion', 'kick'), kick, on(...ALL),
    { ...DRUMS, octave: 2, gain: .36, attack: .001, decay: .3, sustain: 0, release: .15, clip: 1, lpf: 4200, hpf: 30, effects: { reverb: .05, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Tenor guitar', 'response', 'phrase', SAMPLE('guitars', 'muted'), tenor, on(0, 1, 2, 4, 6, 7, 8),
    { ...TUNED, octave: 3, gain: .56, attack: .003, decay: .2, sustain: .15, release: .08, clip: .9, lpf: 4200, hpf: 200, effects: { reverb: .1, pan: -.35 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', DRUM('percussion', 'snare'), snare, on(0, 1, 2, 4, 5, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .5, attack: .001, decay: .16, sustain: 0, release: .1, clip: .8, lpf: 7000, hpf: 160, effects: { reverb: .1, pan: .05 } }),
  P('c1', 'Rhythm guitar', 'harmony', 'phrase', SAMPLE('guitars', 'clean'), scratch, on(...ALL),
    { ...TUNED, octave: 3, gain: .46, attack: .003, decay: .2, sustain: .12, release: .08, clip: .9, lpf: 5200, hpf: 260, effects: { reverb: .1, pan: .35 } }),
  P('c2', 'Snare · ghosts', 'rhythm', 'pulse', DRUM('percussion', 'ghost-snare'), ghost, on(1, 2, 4, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: 1, attack: .001, decay: .1, sustain: 0, release: .06, clip: .6, lpf: 5500, hpf: 180, effects: { reverb: .08, pan: .05 } }),
  P('d1', 'Tenor saxophone', 'melody', 'phrase', SAMPLE('band', 'tenor-sax', 1), sax, on(1, 2, 4, 5, 6, 7, 8),
    { ...TUNED, octave: 3, gain: .32, attack: .012, decay: .3, sustain: .66, release: .12, clip: 1, lpf: 6000, hpf: 120, effects: { reverb: .16, pan: .12 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .06 } }),
  P('d2', 'Hi-hat', 'rhythm', 'pulse', DRUM('percussion', 'hat'), hat, on(...ALL),
    { ...DRUMS, octave: 2, gain: .9, attack: .001, decay: .12, sustain: 0, release: .05, clip: .7, lpf: 8500, hpf: 2200, effects: { reverb: .04, pan: -.2 } }),
  P('e1', 'Trumpet', 'melody', 'phrase', SAMPLE('sambaReggae', 'trompete'), trumpet, on(1, 2, 4, 5, 7, 8),
    { ...TUNED, octave: 4, gain: .54, attack: .006, decay: .3, sustain: .6, release: .1, clip: 1, lpf: 7000, hpf: 200, effects: { reverb: .16, pan: -.1 }, design: { role: 'lead' } }),
  P('e2', 'Shekere', 'rhythm', 'pulse', DRUM('percussion', 'shaker'), shekere, on(...ALL),
    { ...DRUMS, octave: 2, gain: .28, attack: .001, decay: .09, sustain: 0, release: .06, clip: .5, lpf: 7500, hpf: 1800, effects: { reverb: .05, pan: .3 } }),
  P('f1', 'Trombone', 'response', 'phrase', SAMPLE('sambaReggae', 'trombone'), trombone, on(1, 2, 4, 5, 7, 8),
    { ...TUNED, octave: 3, gain: .44, attack: .006, decay: .3, sustain: .5, release: .1, clip: 1, lpf: 4500, hpf: 80, effects: { reverb: .16, pan: -.25 } }),
  P('f2', 'Sticks', 'rhythm', 'pulse', DRUM('drums', 'wood-rim'), sticks, on(0, 1, 2, 3, 4, 6, 7, 8),
    { ...DRUMS, octave: 2, gain: .16, attack: .001, decay: .08, sustain: 0, release: .05, clip: .6, lpf: 6500, hpf: 500, effects: { reverb: .1, pan: -.3 } }),
  P('g1', 'Organ', 'melody', 'phrase', SAMPLE('keys', 'organ'), organ, on(1, 2, 3, 4, 5, 6, 7),
    { ...TUNED, octave: 4, gain: .22, attack: .01, decay: .3, sustain: .7, release: .12, clip: 1, lpf: 4200, hpf: 200, effects: { reverb: .14, pan: .2 }, design: { role: 'lead' } }),
  P('g2', 'Conga · slap', 'rhythm', 'pulse', DRUM('percussion', 'muted-conga'), congaSlap, on(0, 1, 2, 3, 4, 5, 6, 7),
    { ...DRUMS, octave: 2, gain: .4, attack: .001, decay: .12, sustain: 0, release: .08, clip: .7, lpf: 5500, hpf: 160, effects: { reverb: .08, pan: .22 } }),
  P('h1', 'Conga · open', 'rhythm', 'pulse', DRUM('percussion', 'conga'), congaOpen, on(...ALL),
    { ...DRUMS, octave: 2, gain: .36, attack: .001, decay: .2, sustain: 0, release: .12, clip: .8, lpf: 5000, hpf: 110, effects: { reverb: .08, pan: .18 } }),
  P('h2', 'Toms · fill', 'rhythm', 'pulse', DRUM('percussion', 'tom'), toms, on(),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .25, sustain: 0, release: .12, clip: .9, lpf: 4500, hpf: 70, effects: { reverb: .1, pan: -.1 } }),
], {
  fills: { 1: FILL, 2: FILL, 4: FILL, 6: FILL, 7: FILL },
  // The interlude is close and warm; the stabs open the room.
  params: {
    a1: { 3: { gain: .42 } }, a2: { 3: { gain: .22, lpfRange: { first: 1800, second: 2200 } }, 5: { gain: .4 } },
    e2: { 0: { gain: .2 }, 3: { gain: .17 } }, f2: { 3: { gain: .1 } }, h1: { 3: { gain: .24, reverbRange: { first: .16, second: .22 } } },
    c1: { 3: { gain: .3, reverbRange: { first: .2, second: .26 } } }, g1: { 3: { reverbRange: { first: .26, second: .32 } } },
    e1: { 5: { gain: .6 } }, d1: { 6: { gain: .36 } },
  },
})
build({
  id: 'lagos-1975', kitName: 'Afrobeat', profileName: 'Lagos 1975 · Afrobeat', meter: '4/4', bpm: 115, root: 'G', scale: 'Dórica',
  form: FORM, parts: PARTS,
  reactions: reactions('afb', { refrain: 2, breque: 5, lament: 3, calm: 3, tense: 5, peak: 2, finale: 6 }),
  reference: 'Afrobeat de Lagos (Fela Kuti & Africa 70, Tony Allen, Orlando Julius): referência de estilo; material original',
  url: 'https://en.wikipedia.org/wiki/Afrobeat',
}).catch(error => { console.error(error); process.exit(1) })
