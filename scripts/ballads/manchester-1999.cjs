// 1999 Manchester - Nu-jazz breaks. Original downtempo piece in the spirit of the city's late-90s
// crate-digger scene (Grand Central, Mr Scruff's Keep It Unreal): dusty hip-hop breaks under
// soul-jazz flute and horns, an upright bass, Rhodes in Dorian, vinyl crackle, a bossa detour
// and a short big-beat break. Run: node scripts/ballads/manchester-1999.cjs
const { composer, build, reactions, SAMPLE } = require('./lib.cjs')
const C = composer('4/4', 'Dórica')
const { mel, rep, hits, relative, strum, portamento, shift, up, vel, set, roll } = C
const S = 1 / 16

// G Dorian. Chord roots per bar: 0 Gm7, 1 Am7, 2 Bbmaj7, 3 C7, 4 Dm7, 6 F7.
const FORM = [
  { label: 'Intro', bars: 8, bank: 0, harmony: [0, 0, 3, 3, 0, 0, 3, 3] },
  { label: 'Verse', bars: 16, bank: 1, harmony: [0, 0, 3, 3, 2, 6, 3, 4] },
  { label: 'Chorus', bars: 8, bank: 2, harmony: [2, 6, 3, 0, 2, 6, 3, 4] },
  { label: 'Interlude', bars: 8, bank: 3, harmony: [3, 3, 2, 2, 1, 1, 4, 4] }, // bossa detour
  { label: 'Verse', bars: 16, bank: 1, harmony: [0, 0, 3, 3, 2, 6, 3, 4] },
  { label: 'Solo', bars: 16, bank: 4, harmony: [0, 0, 3, 3] },
  { label: 'Break', bars: 8, bank: 5, harmony: [0, 0, 6, 6, 0, 0, 3, 4] }, // big-beat chop
  { label: 'Bridge', bars: 8, bank: 6, harmony: [2, 2, 1, 1, 6, 6, 4, 4] },
  { label: 'Chorus', bars: 8, bank: 2, harmony: [2, 6, 3, 0, 2, 6, 3, 4] },
  { label: 'Outro', bars: 8, bank: 0, harmony: [0, 0, 3, 3, 0, 0, 3, 3] },
]
const H = bank => FORM.find(s => s.bank === bank).harmony
const FILL = 7
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)

// ---------- themes (absolute degrees of G Dorian) ----------
const FLUTE_A = mel([
  '4:3 3:1 2:2 0:2', '2:1 4:5~ r:2', '5:3 4:1 3:2 2:2', '3:6~* r:2',
  '9:3 8:1 6:2 4:2', '8:3 6:1 3:2 6:2', 'r:1 3:1 5:1 7:1 10:3 9:1', '11:3 10:1 8:2 4:2',
  '7:2 6:1 4:1 r:1 2:1 4:2', '6:1 4:1 2:2 0:4~', 'r:2 3:1 4:1 5:2 7:2', '10:4~ 9:2 8:2',
  '4:2 6:2 8:4~', '7:2 6:6~>', '8:2 7:2 5:2 3:2', '4:3 6:1 8:4*',
].join('|'))
const HOOK = mel([
  'r:1 4:1 6:1 9:2 8:1 6:2', '8:3 6:1 r:1 6:1 8:2', 'r:1 3:1 5:1 7:2 5:1 3:2', '4:4~ r:1 2:1 4:1 6:1',
  'r:1 4:1 6:1 9:2 8:1 6:2', '8:3 9:1 r:1 10:1 11:2', '10:2 9:1 7:1 5:2 3:2', '4:6~* r:2',
].join('|'), { accent: { off: .78 } })
// Tenor solo over the i–IV vamp: short cells, space, a climb and a long cry.
const SOLO = mel([
  'r:4 4:2 6:2 7:4 6:2 4:2', '2:6~ r:2 0:2 2:2 4:4', 'r:2 5:2 7:2 10:2 9:4 7:4', '8:2 7:2 5:2 3:2 5:8~',
  'r:6 7:2 9:2 10:2 11:4', '10:2 9:2 7:2 6:2 4:4 2:4', 'r:2 3:1 4:1 5:2 7:2 10:4^2 9:4', '7:12~* r:4',
  'r:2 11:2 10:2 9:2 7:4 4:4', '6:2 4:2 2:2 1:2 0:8~', 'r:4 3:2 5:2 7:2 5:2 3:2 2:2', '3:4 5:4 7:4 10:4',
  '11:6~ 10:2 9:4 7:4', '6:2 7:2 9:2 11:2 13:4^2 11:4', '10:2 9:2 7:2 5:2 3:2 5:2 7:2 9:2', '7:12~* r:4',
].join('|'), { unit: S, accent: { beat: .86, off: .74 } })
// Bossa: marimba melody, flute answers.
const BOSSA_MEL = mel([
  '3:3 4:1 5:2 7:2', '7:6~ r:2', '6:3 7:1 8:2 9:2', '9:4~ 8:2 6:2',
  '5:3 6:1 7:2 8:2', '8:4 7:2 5:2', '4:3 5:1 6:2 8:2', '7:6* r:2',
].join('|'))
const BRIDGE_FLUTE = mel([
  '9:8~', '8:4 6:4', '7:8~', '8:4 10:4', '10:6~ 9:2', '8:4 6:4', '11:8~*', 'r:8',
].join('|'))

// ---------- a1 Upright bass (relative to each bar's root) ----------
const bassVerse = mel(rep('0:3 0:1 r:2 4:1 6:1 | 0:2 r:1 0:1 -3:2 -1:1 -2:1', 8))
const bass = {
  0: set(mel(rep('0:6~ r:1 4:1 | 0:4 r:2 -3:2', 4)), { velocity: .7 }),
  1: bassVerse,
  2: mel(rep('0:3 0:1 r:1 2:1 4:2 | 0:2 r:1 4:1 6:2 4:1 2:1', 4)),
  3: mel(rep('0:3 4:1 r:2 -3:2 | 0:3 4:1 r:1 -3:1 4:2', 4), { accent: { beat: .74 } }),
  4: mel(rep('0:3 0:1 r:2 4:1 6:1 | 0:2 r:1 0:1 4:1 6:1 7:1 6:1', 8)),
  5: mel(rep('0:2# 0:1 r:1 0:1 6:1 7:2 | 0:2 r:2 -1:1 -2:1 -3:2', 4).replace(/(-?\d+):(\d)/g, '$1:$2'), { accent: { strong: 1, beat: .92, off: .85 } }),
  6: mel(rep('0:8~ | 0:4 4:4', 4), { gate: .98 }),
  7: mel('0:1 2:1 4:1 6:1 7:2 6:1^-1 4:1'),
}

// ---------- a2 Kick, b2 Snare, c2 Hats (break kit) ----------
const verseKick = hits(rep('X......x..X..... | X......x..x...x.', 8), { unit: S })
const kick = {
  0: hits(rep('o............... | o.........o.....', 4), { unit: S }),
  1: verseKick, 2: verseKick,
  4: hits(rep('X......x..X..... | X.....x...x..x..', 8), { unit: S }),
  5: hits(rep('X.x...xX..X..x.. | X.x....x.XX...x.', 4), { unit: S, extra: { drive: 1.2 } }),
  7: hits('X.x.X.x.XXXXXXXX', { unit: S }),
}
const verseSnare = hits(rep('....X..g.g..X..g | ....X..g.g..X.gg', 8), { unit: S })
const snare = {
  1: verseSnare, 2: verseSnare,
  4: hits(rep('....X..g.g..X..g | ....X..g.g..X.?X', 8), { unit: S }),
  5: hits(rep('....X.g.g.X.X.gg | ....X.g..gX.XrXR', 4), { unit: S }),
  7: hits('gggoggoooxxxXXRR', { unit: S }),
}
const hatVerse = hits(rep('x.o.x.o.x.o.x.oo', 16), { unit: S, extra: {} })
const hats = {
  0: hits(rep('..o...o...o...o.', 8), { unit: S }),
  1: hatVerse, 2: hatVerse,
  4: hits(rep('x.o.x.o.x.o.x.o? | x.o.x.oox.o.x.oR', 8), { unit: S }),
  5: hits(rep('xoxoxoxoxoxoxoxo', 8), { unit: S, extra: { pan: .65 } }),
  7: hits('x.x.x.x.xxxxRRRR', { unit: S }),
}

// ---------- b1 Flute ----------
const flute = {
  0: relative(mel('r:8 | r:4 4:2 6:2 | 5:6~ r:2 | r:8 | r:8 | r:4 7:2 6:2 | 5:4 3:4~> | r:8'), H(0)),
  1: relative(portamento(FLUTE_A, 4, .07, 3), H(1)),
  2: relative(set(mel('r:8 | r:4 11:2 10:2 | 9:4~ r:4 | r:8 | r:8 | r:4 13:2 11:2 | 10:6~> r:2 | r:8'), { velocity: .7 }), H(2)),
  3: relative(mel('r:4 10:2 9:2 | r:8 | r:4 9:2 8:2 | r:8 | r:4 8:2 7:2 | r:8 | r:4 6:2 8:2 | 7:2> r:6'), H(3)),
  6: relative(BRIDGE_FLUTE, H(6)),
}

// ---------- c1 Tenor sax: chorus hook, the solo, a low answer in the second verse ----------
const sax = {
  2: relative(HOOK, H(2)),
  1: relative(set(mel('r:8 | r:8 | r:8 | r:4 2:1 3:1 4:2 | r:8 | r:8 | r:8 | r:4 3:1 4:1 5:2> | r:8 | r:8 | r:8 | r:8 | r:8 | r:8 | r:8 | r:8'), { velocity: .65 }), H(1)),
  4: relative(SOLO, H(4)),
}

// ---------- d1 Rhodes: rootless voicings (3rd 5th 7th 9th) ----------
const V = '2,4,6,8'
const rhodes = {
  0: mel(rep(`${V}:7~* r:1`, 8), { accent: { strong: .8 } }),
  1: mel(rep(`${V}:3s r:3 ${V}:2s r:4 ${V}:2s r:2`, 16), { unit: S }),
  2: mel(rep(`${V}:2 r:4 ${V}:3 r:3 ${V}:4`, 8), { unit: S }),
  3: mel(rep(`${V}:8 | r:4 ${V}:4`, 4), { gate: .97, accent: { strong: .7, beat: .6 } }),
  4: mel(rep(`${V}:4s r:4 ${V}:2s r:2 ${V}:2s r:2 | r:6 ${V}:2s r:4 ${V}:4s`, 8), { unit: S, accent: { strong: .72, beat: .66, off: .6 } }),
  5: mel(rep(`${V}:2!# r:6 ${V}:2 r:2 ${V}:2 r:2`, 8), { unit: S }),
  6: mel(rep(`${V}:7~ r:1`, 8), { accent: { strong: .75 } }),
  7: mel(`r:8 ${V}:2 2,4,6:2 1,3,5:2 0,2,4:2`, { unit: S }),
}

// ---------- d2 Vinyl crackle (unpitched texture) ----------
const vinyl = {
  0: hits(rep('X.......', 8), { unit: 1 / 8, length: 1 }),
  1: set(hits(rep('X.......', 16), { unit: 1 / 8, length: 1 }), { velocity: .5 }),
  6: hits(rep('X.......', 8), { unit: 1 / 8, length: 1 }),
}

// ---------- e1 Trumpet: thirds under the hook, a muted answer in the Break ----------
const trumpet = {
  2: relative(vel(up(HOOK, -2), .82), H(2)),
  5: relative(mel(rep('r:4 7:1s! 7:1s r:2 | r:6 9:1s 7:1s', 4)), H(5)),
}

// ---------- e2 Shaker, f2 Bongos, h2 Ride ----------
const shaker = {
  1: hits(rep('o.x.o.x.o.x.o.xx', 16), { unit: S }),
  3: hits(rep('xoxoxoxoxoxoxoxo', 8), { unit: S }),
  4: hits(rep('o.x.o.x.o.x.o.xx', 16), { unit: S }),
  6: hits(rep('..x...x...x...x.', 8), { unit: S }),
}
const bongo = {
  3: hits(rep('x..o..x...o.x.o. | x..o..x.o.o.x.og', 4), { unit: S }),
  4: hits(rep('.......o......x. | ..........o.x.o.', 8), { unit: S }),
  5: hits(rep('x.oox.o.x.oox.Ro', 8), { unit: S }),
}
const ride = {
  3: hits(rep('x..ox..ox..ox..o', 8), { unit: S }),
  4: hits(rep('x...x..ox...x..o', 16), { unit: S }),
  6: hits(rep('o.......o.......', 8), { unit: S }),
}

// ---------- f1 Nylon guitar: bossa batida, light comping under the solo, bridge chords ----------
const batida = '-7:2 r:1 2,4,6:1 r:2 2,4,6:1 r:1 -3:2 2,4,6:1 r:2 2,4,6:1 r:1 2,4,6:1'
const guitar = {
  3: strum(mel(rep(batida, 8), { unit: S, accent: { strong: .9, beat: .8, off: .72 } })),
  4: strum(mel(rep('r:2 2,4,6:1s r:3 2,4,6:2s | r:4 2,4,6:1s r:3', 8), { accent: { strong: .7, beat: .66, off: .6 } })),
  6: strum(mel(rep('0,2,4,6:8* | r:8', 4), { gate: .99 }), 1 / 64),
}

// ---------- g1 Strings: pads in the bridge and the last chorus ----------
const strings = {
  0: mel(rep('2,4:8 | 2,4:8', 4), { gate: 1, accent: { strong: .55, beat: .5, off: .5 } }),
  2: mel(rep('0,2,4:8', 8), { gate: 1, accent: { strong: .65 } }),
  6: portamento(mel(rep('0,2,4,6:8', 8), { gate: 1, accent: { strong: .7 } }), 99),
}

// ---------- g2 Scratch: the DJ's cuts in the Break and before the last chorus ----------
const scratch = {
  5: hits(rep('....r.......X.R. | ....X.g.....R.r.', 4), { unit: S, length: S }),
  7: hits('........X.r.R.RR', { unit: S, length: S }),
}

// ---------- h1 Marimba: the bossa melody, sparkles in the second verse and the bridge ----------
const marimba = {
  3: relative(BOSSA_MEL, H(3)),
  1: relative(mel(rep('r:8 | r:5 7:1 9:1 11:1 | r:8 | r:5 10:1 9:1 7:1', 4), { accent: { off: .7 } }), H(1)),
  6: mel(rep('0:1 2:1 4:1 6:1 7:1 6:1 4:1 2:1', 8), { accent: { strong: .7, beat: .6, off: .5 } }),
  2: relative(mel('r:8 | r:8 | r:8 | r:6 9:1 11:1 | r:8 | r:8 | r:8 | 11:1 9:1 7:1 4:1 r:4'), H(2)),
}

const PARTS = [
  { slot: 'a1', name: 'Upright bass', role: 'bass', behavior: 'phrase', source: SAMPLE('classical', 'concert-bass-pizz'), rolls: { ...bass, [FILL]: bass[7] },
    octave: 2, gain: .26, attack: .004, decay: .35, sustain: .55, release: .2, clip: 1, lpf: 3200, hpf: 30,
    sections: on(0, 1, 2, 3, 4, 5, 6, 7, 8, 9), fills: { 0: FILL, 7: FILL }, effects: { reverb: .05 },
    design: { role: 'bass', filterEnv: .6, filterAttack: .005, filterDecay: .15 } },
  { slot: 'a2', name: 'Break kick', role: 'rhythm', behavior: 'pulse', source: SAMPLE('machines', 'break-kick', 0, false), rolls: { 0: kick[0], 1: kick[1], 2: kick[2], 4: kick[4], 5: kick[5], [FILL]: kick[7] },
    octave: 2, gain: .2, attack: .001, decay: .3, sustain: 0, release: .1, clip: 1, lpf: 9000, hpf: 30,
    sections: on(0, 1, 2, 4, 5, 6, 8), fills: { 2: FILL, 4: FILL, 5: FILL }, effects: { reverb: .02 }, design: { role: 'drums' } },
  { slot: 'b1', name: 'Flute', role: 'melody', behavior: 'phrase', source: SAMPLE('classical', 'flute-sustain'), rolls: flute,
    octave: 4, gain: .095, attack: .04, decay: .3, sustain: .8, release: .3, clip: 1, lpf: 9500, hpf: 260,
    sections: on(0, 1, 2, 3, 4, 7, 8, 9), effects: { reverb: .22, delay: .1, pan: -.2 }, reverbRange: { first: .18, second: .26, frequency: 'section' },
    design: { role: 'lead', vibrato: 5.2, vibratoDepth: .14, delayTime: '3/16', delayFeedback: .3 } },
  { slot: 'b2', name: 'Break snare', role: 'rhythm', behavior: 'pulse', source: SAMPLE('machines', 'break-snare', 0, false), rolls: { 1: snare[1], 2: snare[2], 4: snare[4], 5: snare[5], [FILL]: snare[7] },
    octave: 2, gain: .13, attack: .001, decay: .2, sustain: 0, release: .1, clip: .8, lpf: 8000, hpf: 120,
    sections: on(1, 2, 4, 5, 6, 8), fills: { 1: FILL, 2: FILL, 4: FILL, 5: FILL }, effects: { reverb: .06 }, design: { role: 'drums' } },
  { slot: 'c1', name: 'Tenor sax', role: 'melody', behavior: 'phrase', source: SAMPLE('band', 'tenor-sax'), rolls: sax,
    octave: 3, gain: .1, attack: .03, decay: .3, sustain: .75, release: .2, clip: 1, lpf: 7000, hpf: 120,
    sections: on(2, 4, 5, 8), effects: { reverb: .16, pan: .15 }, design: { role: 'lead', vibrato: 4.6, vibratoDepth: .1 } },
  { slot: 'c2', name: 'Dusty hats', role: 'rhythm', behavior: 'pulse', source: SAMPLE('machines', 'dusty-hat', 0, false), rolls: { 0: hats[0], 1: hats[1], 2: hats[2], 4: hats[4], 5: hats[5], [FILL]: hats[7] },
    octave: 2, gain: .07, attack: .001, decay: .08, sustain: 0, release: .05, clip: .5, lpf: 11000, hpf: 2500,
    sections: on(0, 1, 2, 4, 5, 6, 8, 9), fills: { 2: FILL, 5: FILL }, effects: { reverb: .03, pan: .25 }, design: { role: 'drums' } },
  { slot: 'd1', name: 'Rhodes', role: 'harmony', behavior: 'phrase', source: SAMPLE('keys', 'rhodes'), rolls: { ...rhodes, [FILL]: rhodes[7] },
    octave: 3, gain: .085, attack: .004, decay: .5, sustain: .5, release: .4, clip: 1, lpf: 5200, hpf: 90,
    sections: on(0, 1, 2, 3, 4, 5, 6, 7, 8, 9), fills: { 7: FILL }, effects: { reverb: .14, pan: -.1 },
    design: { role: 'pad', lfoTarget: 'gain', lfoRate: 4.2, lfoUnit: 'hz', lfoDepth: .12, lfoShape: 'sine' } },
  { slot: 'd2', name: 'Vinyl', role: 'texture', behavior: 'sustain', source: SAMPLE('electronic', 'vinyl', 0, false), rolls: vinyl,
    octave: 3, gain: .05, attack: .01, decay: 1, sustain: 1, release: .3, clip: 1, lpf: 7000, hpf: 300,
    sections: on(0, 1, 7, 9), effects: { reverb: 0 } },
  { slot: 'e1', name: 'Trumpet', role: 'response', behavior: 'phrase', source: SAMPLE('classical', 'orchestra-trumpet'), rolls: trumpet,
    octave: 3, gain: .065, attack: .02, decay: .3, sustain: .7, release: .18, clip: 1, lpf: 6000, hpf: 200,
    sections: on(2, 6, 8), effects: { reverb: .16, pan: .3, delay: .08 }, design: { role: 'lead', delayTime: '3/16', delayFeedback: .25 } },
  { slot: 'e2', name: 'Shaker', role: 'rhythm', behavior: 'pulse', source: SAMPLE('percussion', 'shaker', 0, false), rolls: shaker,
    octave: 2, gain: .045, attack: .001, decay: .1, sustain: 0, release: .05, clip: .5, lpf: 10000, hpf: 1500,
    sections: on(1, 3, 4, 5, 7), effects: { reverb: .05, pan: .4 }, design: { role: 'drums' } },
  { slot: 'f1', name: 'Nylon guitar', role: 'harmony', behavior: 'phrase', source: SAMPLE('guitars', 'nylon'), rolls: guitar,
    octave: 3, gain: .085, attack: .003, decay: .4, sustain: .4, release: .25, clip: 1, lpf: 7000, hpf: 80,
    sections: on(3, 5, 7), effects: { reverb: .14, pan: .3 } },
  { slot: 'f2', name: 'Bongos', role: 'rhythm', behavior: 'pulse', source: SAMPLE('percussion', 'bongo', 0, false), rolls: bongo,
    octave: 2, gain: .055, attack: .001, decay: .15, sustain: 0, release: .08, clip: .6, lpf: 9000, hpf: 200,
    sections: on(3, 5, 6), effects: { reverb: .08, pan: -.35 }, design: { role: 'drums' } },
  { slot: 'g1', name: 'Strings', role: 'harmony', behavior: 'sustain', source: SAMPLE('classical', 'orchestra-violin'), rolls: strings,
    octave: 4, gain: .055, attack: .4, decay: .5, sustain: .85, release: .7, clip: 1, lpf: 6000, hpf: 200,
    sections: on(7, 8, 9), effects: { reverb: .32, pan: -.25 }, design: { role: 'pad', duckSource: 'a2', duckDepth: .3, duckRelease: .2 } },
  { slot: 'g2', name: 'Scratch', role: 'texture', behavior: 'phrase', source: SAMPLE('electronic', 'scratch', 0, false), rolls: { 5: scratch[5], [FILL]: scratch[7] },
    octave: 3, gain: .05, attack: .001, decay: .2, sustain: .2, release: .05, clip: 1, lpf: 7000, hpf: 400,
    sections: on(6), fills: { 6: FILL }, effects: { reverb: .04, pan: .2 }, design: { role: 'fx' } },
  { slot: 'h1', name: 'Marimba', role: 'response', behavior: 'phrase', source: SAMPLE('band', 'marimba'), rolls: marimba,
    octave: 3, gain: .07, attack: .002, decay: .4, sustain: .3, release: .3, clip: 1, lpf: 8000, hpf: 150,
    sections: on(2, 3, 4, 7, 8), effects: { reverb: .2, pan: .35, delay: .12 }, design: { delayTime: '1/8', delayFeedback: .28 } },
  { slot: 'h2', name: 'Ride', role: 'rhythm', behavior: 'pulse', source: SAMPLE('percussion', 'ride', 0, false), rolls: ride,
    octave: 2, gain: .04, attack: .001, decay: .5, sustain: 0, release: .3, clip: .8, lpf: 9000, hpf: 600,
    sections: on(3, 5, 7), effects: { reverb: .1, pan: .3 }, design: { role: 'drums' } },
]
// Bank 7 of each part is its one-bar fill; the "rolls[bank]" keys are global bank indices.
// Presence and banks: a part plays in a section only if it has that section's bank.
for (const part of PARTS) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound ----------
const RECORD = { hpf: 320, lpfRange: { first: 2400, second: 3200 }, reverbRange: { first: .04, second: .08 } }
const SECTION_PARAMS = {
  a1: { 0: { lpfRange: { first: 1400, second: 1800 } }, 6: { driveRange: { first: 1, second: 1.8 }, resonance: 4 }, 7: { release: .6 }, 9: { lpfRange: { first: 1200, second: 1500 }, gain: .2 } },
  a2: { 0: { lpfRange: { first: 1800, second: 2200 } }, 6: { driveRange: { first: 1.2, second: 2.2 } } },
  b1: { 0: RECORD, 3: { delay: .3, reverbRange: { first: .26, second: .32 } }, 7: { reverbRange: { first: .38, second: .46 }, gain: .11 }, 9: { ...RECORD, lpfRange: { first: 1800, second: 2400 } } },
  b2: { 6: { driveRange: { first: 1, second: 2 }, resonance: 5 } },
  c1: { 4: { gain: .085, lpfRange: { first: 2600, second: 3400 } }, 5: { gain: .12, reverbRange: { first: .1, second: .14 } }, 8: { gain: .11 } },
  c2: { 6: { resonance: 6, lfoTarget: 'lpf', lfoRate: 2, lfoUnit: 'bars', lfoDepth: .5 }, 9: { hpf: 5000 } },
  d1: { 0: RECORD, 3: { lfoDepth: .25, reverbRange: { first: .22, second: .3 } }, 5: { lpfRange: { first: 2400, second: 2800 }, gain: .07 },
    6: { filterEnv: 2.5, filterAttack: .005, filterDecay: .15, resonance: 6 }, 7: { lfoDepth: .3, reverbRange: { first: .3, second: .38 } }, 9: RECORD },
  d2: { 0: { gain: .07 }, 9: { gain: .08 } },
  e1: { 8: { gain: .08 } },
  f1: { 7: { reverbRange: { first: .35, second: .42 } } },
  g1: { 7: { reverbRange: { first: .4, second: .5 }, gain: .07 }, 9: { lpfRange: { first: 1600, second: 2200 } } },
  h1: { 3: { gain: .085, delay: .2 }, 7: { reverbRange: { first: .32, second: .4 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'manchester-1999', kitName: 'Nu-jazz breaks', profileName: 'Nu-jazz breaks · Manchester 1999', writeProfile: false,
  bpm: 94, meter: '4/4', root: 'G', scale: 'Dórica', form: FORM, parts: PARTS, ternary: false,
  reactions: reactions('manchester', { lift: 5, contrast: 5, lament: 6, calm: 3, finale: 0, climax: 2, solo: 4 }),
  reference: 'Downtempo nu-jazz de Manchester no fim dos anos 1990 (Grand Central Records, Mr Scruff, Keep It Unreal, 1999); composição original: breaks empoeirados, contrabaixo, Rhodes em Dórico, flauta e sopros soul-jazz, desvio de bossa e um break big beat.',
  url: 'https://ninjatune.com/artist/mr-scruff',
}).catch(error => { console.error(error); process.exit(1) })
