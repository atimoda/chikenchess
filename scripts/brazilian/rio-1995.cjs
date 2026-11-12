// 1995 Rio de Janeiro - Funk carioca dos bailes (original material).
// The baile funk of the mid-nineties on the Miami-bass "Volt Mix" grid: the TR-808 boom in 3+3+4+3+3
// sixteenths, snare and claps on the backbeat, the cowbell, the DJ's montagem of orchestra hits, scratches
// and "hey!", a bell melô and the whole baile chanting the hook. The batidão is not always on: the verses
// keep a lighter kick and the drops bring it in full, the 808 boom layered with a hard kick and doubled by
// a sub that is driven so it speaks on small speakers. Hats, snares and kicks have hand-set dynamics, the
// pre-chorus builds with a snare roll and a riser, and the funk-melody interlude lets the baile breathe.
// F natural minor, i–VI–VII–i (Kit Harmony). Form: DJ intro · verse · build · drop (batidão) · montagem ·
// funk melody (soft) · verse · build · drop · outro.
// Run: node scripts/brazilian/rio-1995.cjs
const { composer, build, reactions, SAMPLE, DRUM, P, presence } = require('./lib.cjs')
const C = composer('4/4', 'Menor natural')
const { mel, rep, hits, comp, relative, feel, tone, swell, set, vel } = C

// F minor degrees: 0 F · 1 G · 2 Ab · 3 Bb · 4 C · 5 Db · 6 Eb.
const LOOP = [0, 5, 6, 0]
const FORM = [
  { label: 'Intro', bars: 8, bank: 0, harmony: LOOP },
  { label: 'Verse', bars: 16, bank: 1, harmony: LOOP },
  { label: 'Pre-Chorus', bars: 8, bank: 2, harmony: [5, 5, 6, 6, 4, 4, 4, 4] },   // build: tense
  { label: 'Drop', bars: 16, bank: 3, harmony: LOOP },                           // batidão
  { label: 'Break', bars: 8, bank: 4, harmony: [0] },                            // montagem
  { label: 'Interlude', bars: 16, bank: 5, harmony: [5, 6, 4, 0] },              // funk melody: soft
  { label: 'Verse', bars: 16, bank: 1, harmony: LOOP },
  { label: 'Pre-Chorus', bars: 8, bank: 2, harmony: [5, 5, 6, 6, 4, 4, 4, 4] },
  { label: 'Drop', bars: 16, bank: 3, harmony: LOOP },
  { label: 'Outro', bars: 8, bank: 6, harmony: LOOP },
]
const H = bank => FORM.find(s => s.bank === bank).harmony
const HB = bank => { const s = FORM.find(x => x.bank === bank); return Array.from({ length: s.bars }, (_, i) => s.harmony[i % s.harmony.length]) }
const FILL = 7
const on = presence(FORM)
const ALL = FORM.map((_, i) => i)
// Machines are tight; the dynamics are the producer's, with a tick of looseness on the hats only.
const tight = (seed, notes, extra = {}) => feel(notes, { vel: .03, seed, ...extra })
/** A drum loop of n bars (sections are longer: the loop repeats). */
const loop = (n, seed, text, extra) => C.roll(n, tight(seed, hits(text), extra))

// ---------- the batidão ----------
const BOOM = 'X..x..X...X..x..'
const BOOM_B = 'X..x..X...X..xXx'
// a2 Bumbo 808: the boom; lighter in the verses (one and three, a pickup), full in the drops.
const kick = {
  0: loop(4, 11, 'X.......X....... | X.......X....... | X.......X....... | X.......X..x.x.x'),
  1: loop(4, 12, 'X.......X..o.... | X.......X....... | X.......X..o.... | X.......X..o.o..'),
  2: tight(13, swell(hits(rep('X.......X....... | X...X...X...X...', 3) + ' | X.X.X.X.XXXXXXXX | ................'), 8, .7, 1)),
  3: loop(4, 14, `${BOOM} | ${BOOM} | ${BOOM} | ${BOOM_B}`),
  4: tight(15, hits('X............... | ................ | X.....X......... | ................ | X..x..X......... | ................ | X..x..X...X..... | X...X...X.X.XXXX')),
  5: loop(4, 16, 'o.......o....... | o.......o..h....'),
  6: tight(17, hits(rep(BOOM, 6) + ' | X...X...X.X.XXXX | X...............')),
}
// h2 Batidão: a hard kick layered on the boom, only in the drops and the end.
const batidao = {
  3: loop(4, 21, `${BOOM} | ${BOOM} | ${BOOM} | ${BOOM_B}`),
  4: tight(22, hits(rep('................', 7) + ' | X...X...X.X.XXXX')),
  6: tight(23, hits(rep(BOOM, 6) + ' | X...X...X.X.XXXX | X...............')),
}
// a1 Baixo 808: the sub follows the kick; in the drops it doubles every boom on the chord's root.
const sub = (bank, rhythm, seed) => relative(tight(seed, comp(HB(bank), rhythm, [-7], { length: C.M.sixteenth * 2.6 })), H(bank))
const bass = {
  1: sub(1, 'X.......x....... | X.......x..o....', 31),
  2: sub(2, 'X.......X....... | X...X...X...X...', 32),
  3: sub(3, `${BOOM} | ${BOOM}`, 33),
  4: relative(tight(34, hits('X............... | ................ | X.....X......... | ................ | X..x..X......... | ................ | X..x..X...X..... | ................', { length: 1 / 8, degree: -7 })), H(4)),
  5: sub(5, 'o.......o....... | o.......o..h....', 35),
  6: relative(tight(36, comp(HB(6), BOOM, [-7], { length: C.M.sixteenth * 2.6 })).filter(n => n.start < 7), H(6)),
}
// b2 Caixa 808 and c2 Palmas 808: the backbeat with pickups and ghosts.
const snare = {
  1: loop(4, 41, '....X.......X... | ....X.......X..g | ....X.......X... | ....X..g....X.gx'),
  2: tight(42, swell(hits(rep('....X.......X... | ....X...X...X.X.', 2) + ' | ' + rep('..X...X...X...X.', 2) + ' | X.X.X.X.X.X.X.X. | XXXXXXXXXXXXXXXX | RRRRRRRRRRRRRRRR | ................'), 8, .45, 1)),
  3: loop(4, 43, '....X.......X... | ....X.......X..x | ....X.......X... | ....X..x....X.xx'),
  4: tight(44, hits('................ | ....X........... | ................ | ....X.......X... | ................ | ....X........... | ............X... | X.X.X.X.XXXXXXXX')),
  5: loop(4, 45, '....o.......o... | ....o.......o..g'),
  6: tight(46, hits(rep('....X.......X..x', 6) + ' | X...X...X.X.XXXX | X...............')),
}
const claps = {
  1: loop(4, 51, '............X... | ....X.......X... | ............X... | ....X.......X.x.'),
  3: loop(4, 52, '....X.......X... | ....X.......X.x. | ....X.......X... | ....X.......XxXx'),
  4: tight(53, hits(rep('................', 3) + ' | ....X.......X... | ' + rep('................', 3) + ' | ....X...X...X.X.')),
  6: tight(54, hits(rep('....X.......X...', 6) + ' | ....X...X...XXXX | ................')),
}
// d2 Chimbal 808: sixteenths with a real hand: the off-beat eighths open up, the rest lean back.
const hats = {
  0: loop(4, 61, 'h.o.h.o.h.o.h.o.'),
  1: loop(4, 62, 'gho,gho,ghomgho, | gho,ghomgho,ghom', { jitter: 1 }),
  2: tight(63, swell(hits(rep('ghomghomghomghom', 8)), 8, .6, 1), { jitter: 1 }),
  3: loop(4, 64, 'ghoxghoxghoxghox | ghoxghoxghoxgxXx', { jitter: 1 }),
  5: loop(4, 65, 'h.o,h.o,h.o,h.o, | h.o,h.o,h.o.h,o,', { jitter: 1 }),
  6: tight(66, hits(rep('ghoxghoxghoxghox', 7) + ' | ................'), { jitter: 1 }),
}
// e2 Cowbell 808, the Miami signature: the off-beats, a skip at the end of the second bar.
const cowbell = {
  1: loop(4, 71, '..o...o...o...o. | ..o...o...o..oo.'), 3: loop(4, 72, '..x...x...x...x. | ..x..xx...x..xx.'),
  6: tight(73, hits(rep('..x...x...x...x.', 6) + ' | ................ | ................')),
}
// f2 Tom 808: answers and the rolls into the sections.
const toms = {
  1: loop(4, 81, rep('................', 3) + ' | ...........o..o.'), 3: loop(4, 82, rep('................', 3) + ' | ..........x..xx.'),
  4: tight(83, hits(rep('................', 3) + ' | x..x..x......... | ' + rep('................', 3) + ' | ..........xxxxxx')),
  [FILL]: tight(84, swell(hits('........xxxxxxxx'), 1, .6, 1)),
}

// ---------- the DJ's montagem: b1 orchestra hits, g1 "hey!", h1 scratches, g2 riser ----------
const orch = {
  0: tight(91, hits('X............... | ................ | X.....X......... | ................ | X............... | ................ | X.....X...X..... | ................')),
  3: loop(8, 92, 'X............... | ................ | ................ | ..............X. | X............... | ................ | X.....X......... | ..............X.'),
  4: tight(93, hits('X............... | ........X....... | X.....X......... | ................ | X............... | ........X...X... | X.....X...X..... | ................')),
  6: tight(94, hits('X............... | ................ | ................ | ................ | X............... | ................ | X.....X...X..... | X...............')),
}
const hey = {
  0: tight(101, hits(rep('................', 3) + ' | ............X... | ' + rep('................', 3) + ' | ....X.......X...')),
  3: loop(4, 102, '................ | ............X... | ................ | ....X.......X...'),
  4: tight(103, hits('................ | ............X... | ................ | ....X.......X... | ................ | X.......X....... | ................ | ................')),
  6: tight(104, hits('................ | ............X... | ................ | ....X.......X... | ' + rep('................', 4))),
}
const scratch = {
  0: tight(111, hits('X.....x.X...x.x. | ................ | X..x..x.X..xx.x. | ................ | X.....x.X...x.x. | ................ | X..x..x.X..xx.x. | X.x.X.x.XxXxXxXx')),
  1: loop(8, 112, rep('................', 7) + ' | ..............x.'),
  4: tight(113, hits('X..x..x.X..xx.x. | ................ | X.....x.X...x.x. | ........X.x.X.x. | X..x..x.X..xx.x. | ................ | X.x.X.x.XxXxXxXx | ................')),
}
// The riser (3.6 s, about two bars) grows into the next section.
const RISE = hits(rep('................', 6) + ' | X............... | ................', { length: 2 })
const riser = { 0: RISE, 2: RISE, 4: RISE }

// ---------- melodic: c1 melô (FM bell), d1 the baile's chant, f1 Rhodes stabs, e1 pad ----------
const MELO = mel(rep('0:2 2:2 4:2 7:2 4:2 2:2 0:2 2:2', 4))
const melo = {
  1: C.roll(4, relative(feel(MELO.map(n => ({ ...n, degree: n.degree + LOOP[Math.floor(n.start)] })), { vel: .05, seed: 131 }), LOOP)),
  3: C.roll(4, relative(feel(mel(rep('0:2 2:2 4:2 7:2 9:2 7:2 4:2 2:2', 4)).map(n => ({ ...n, degree: n.degree + LOOP[Math.floor(n.start)] })), { vel: .05, seed: 132 }), LOOP)),
  5: C.roll(4, relative(feel(mel(rep('7:4~ 4:4 2:4 4:4', 4), { accent: { strong: .62, beat: .55, off: .5 } }).map(n => ({ ...n, degree: n.degree + H(5)[Math.floor(n.start)] })), { vel: .05, seed: 133 }), H(5))),
}
const CHANT = mel('7:3 7:3 7:2 6:2 4:6 | 5:3 5:3 4:2 2:8 | 6:3 6:3 6:2 7:2 6:2 4:4 | 4:4 2:4 0:8', { gate: .8 })
const chant = {
  0: relative(tight(141, vel(mel('r:16 | r:16 | r:16 | r:16 | r:16 | r:16 | 7:3 7:3 7:2 6:2 4:6 | 4:4 2:4 0:8', { gate: .8 }), .8)), LOOP),
  3: C.roll(4, relative(tight(142, CHANT), LOOP)),
  4: relative(tight(143, mel('r:16 | r:16 | 7:3 7:3 7:2 r:8 | r:16 | r:16 | r:16 | 7:3 7:3 7:2 6:2 4:6 | r:16', { gate: .8 })), H(4)),
  6: relative(tight(144, mel('7:3 7:3 7:2 6:2 4:6 | 5:3 5:3 4:2 2:8 | 6:3 6:3 6:2 7:2 6:2 4:4 | 4:4 2:4 0:8 | 7:3 7:3 7:2 6:2 4:6 | 5:3 5:3 4:2 2:8 | 6:3 6:3 6:2 7:2 6:2 4:4 | 0:16*', { gate: .8 })), LOOP),
}
const stabs = (bank, rhythm, seed) => C.roll(Math.min(4, H(bank).length), relative(tight(seed, comp(H(bank), rhythm, [0, 2, 4, 6], { length: C.M.sixteenth * 1.5 })), H(bank)))
const rhodes = {
  1: stabs(1, '..o.......o..... | ......o...o.....', 151), 2: relative(tight(152, swell(comp(HB(2), 'x...x...x...x...', [0, 2, 4, 6], { length: C.M.sixteenth * 2 }), 8, .6, 1)), H(2)),
  3: stabs(3, '..x...x...x...x. | ..x...x...x..xx.', 153),
  5: C.roll(4, relative(tight(154, comp(H(5), 'o.......o..o....', [0, 2, 4, 6], { length: C.M.sixteenth * 6 })), H(5))),
}
const pad = {
  0: relative(mel('0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16', { gate: 1, accent: { strong: .6 } }).map(n => ({ ...n, degree: n.degree + LOOP[Math.floor(n.start) % 4] })), LOOP),
  3: C.roll(4, relative(mel('0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16', { gate: 1, accent: { strong: .55 } }).map(n => ({ ...n, degree: n.degree + LOOP[Math.floor(n.start)] })), LOOP)),
  5: C.roll(4, relative(mel('0,2,4,6:16 | 0,2,4,6:16 | 0,2,4,6:16 | 0,2,4,6:16', { gate: 1, accent: { strong: .7 } }).map(n => ({ ...n, degree: n.degree + H(5)[Math.floor(n.start)] })), H(5))),
  6: relative(mel('0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16 | 0,2,4:16*', { gate: 1, accent: { strong: .6 } }).map(n => ({ ...n, degree: n.degree + LOOP[Math.floor(n.start) % 4] })), LOOP),
}

const DRUMS = { design: { role: 'drums' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const FX = { design: { role: 'fx' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }
const PARTS = [
  P('a1', 'Baixo 808', 'bass', 'phrase', { kind: 'synth', sound: 'sine' }, bass, on(...ALL),
    { octave: 2, gain: .42, attack: .003, decay: .7, sustain: .5, release: .2, clip: .95, lpf: 260, hpf: 25, effects: { reverb: 0, pan: 0 }, design: { role: 'bass' }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('a2', 'Bumbo 808', 'rhythm', 'pulse', DRUM('machines', '808-kick-long'), kick, on(...ALL),
    { ...DRUMS, octave: 2, gain: .38, attack: .001, decay: .8, sustain: 0, release: .4, clip: .9, lpf: 6000, hpf: 25, effects: { reverb: 0, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
  P('b1', 'Orchestra hit', 'response', 'pulse', DRUM('electronic', 'orch-hit'), orch, on(0, 3, 4, 8, 9),
    { ...FX, octave: 2, gain: .34, attack: .001, decay: .5, sustain: 0, release: .3, clip: .9, lpf: 8000, hpf: 150, effects: { reverb: .25, pan: -.2 } }),
  P('b2', 'Caixa 808', 'rhythm', 'pulse', DRUM('machines', '808-snare'), snare, on(1, 2, 3, 4, 5, 6, 7, 8, 9),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .2, sustain: 0, release: .1, clip: .8, lpf: 10000, hpf: 150, effects: { reverb: .1, pan: 0 } }),
  P('c1', 'Melô · sino FM', 'melody', 'phrase', SAMPLE('synths', 'fm-bell'), melo, on(1, 3, 5, 6, 8),
    { octave: 4, gain: .11, attack: .002, decay: .4, sustain: .2, release: .25, clip: 1, lpf: 7000, hpf: 300, effects: { reverb: .2, delay: .15, pan: .25 }, design: { delayTime: '3/16', delayFeedback: .25 }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('c2', 'Palmas 808', 'rhythm', 'pulse', DRUM('machines', '808-clap'), claps, on(1, 3, 4, 6, 8, 9),
    { ...DRUMS, octave: 2, gain: .22, attack: .001, decay: .2, sustain: 0, release: .12, clip: .8, lpf: 9000, hpf: 300, effects: { reverb: .16, pan: .1 } }),
  P('d1', 'Grito do baile', 'melody', 'phrase', SAMPLE('electronic', 'oh-chant'), chant, on(0, 3, 4, 8, 9),
    { octave: 4, gain: .36, attack: .01, decay: .3, sustain: .6, release: .15, clip: 1, lpf: 6000, hpf: 150, effects: { reverb: .25, pan: 0 }, design: { role: 'lead' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('d2', 'Chimbal 808', 'rhythm', 'pulse', DRUM('machines', '808-hat'), hats, on(0, 1, 2, 3, 5, 6, 7, 8, 9),
    { ...DRUMS, octave: 2, gain: .3, attack: .001, decay: .06, sustain: 0, release: .04, clip: .5, lpf: 13000, hpf: 4500, effects: { reverb: .03, pan: .2 } }),
  P('e1', 'Pad de cordas', 'harmony', 'sustain', SAMPLE('synths', 'analog-pad'), pad, on(0, 3, 5, 8, 9),
    { octave: 3, gain: .035, attack: .6, decay: .6, sustain: .85, release: .9, clip: 1, lpf: 3200, hpf: 150, effects: { reverb: .35, pan: -.15 }, design: { role: 'pad' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('e2', 'Cowbell 808', 'rhythm', 'pulse', DRUM('machines', '808-cowbell'), cowbell, on(1, 3, 6, 8, 9),
    { ...DRUMS, octave: 2, gain: .09, attack: .001, decay: .2, sustain: 0, release: .1, clip: .6, lpf: 8000, hpf: 500, effects: { reverb: .06, pan: -.3 } }),
  P('f1', 'Rhodes · stab', 'harmony', 'phrase', SAMPLE('keys', 'rhodes'), rhodes, on(1, 2, 3, 5, 6, 7, 8),
    { octave: 3, gain: .1, attack: .003, decay: .4, sustain: .3, release: .25, clip: 1, lpf: 4200, hpf: 180, effects: { reverb: .18, pan: .3 }, design: { lfoTarget: 'gain', lfoRate: 5, lfoUnit: 'hz', lfoDepth: .1, lfoShape: 'sine' }, mapping: { fileDegrees: 0, rankDegrees: 0 } }),
  P('f2', 'Tom 808', 'rhythm', 'pulse', DRUM('machines', '808-tom-low'), toms, on(1, 3, 4, 6, 8),
    { ...DRUMS, octave: 2, gain: .12, attack: .001, decay: .4, sustain: 0, release: .2, clip: .7, lpf: 5000, hpf: 40, effects: { reverb: .1, pan: -.15 }, fills: { 1: FILL, 5: FILL, 6: FILL } }),
  P('g1', 'Hey!', 'response', 'pulse', DRUM('electronic', 'hey'), hey, on(0, 3, 4, 8, 9),
    { ...FX, octave: 2, gain: .18, attack: .001, decay: .3, sustain: 0, release: .1, clip: .9, lpf: 9000, hpf: 200, effects: { reverb: .2, delay: .15, pan: .3 } }),
  P('g2', 'Riser', 'texture', 'pulse', DRUM('electronic', 'riser'), riser, on(0, 2, 4, 7),
    { ...FX, octave: 2, gain: .1, attack: .05, decay: 2, sustain: .9, release: .3, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .3, pan: -.2 } }),
  P('h1', 'Scratch do DJ', 'texture', 'pulse', DRUM('electronic', 'scratch'), scratch, on(0, 1, 4, 6),
    { ...FX, octave: 2, gain: .16, attack: .001, decay: .2, sustain: 0, release: .08, clip: .9, lpf: 8000, hpf: 300, effects: { reverb: .1, pan: -.35 } }),
  P('h2', 'Batidão', 'rhythm', 'pulse', DRUM('machines', '909-kick-hard'), batidao, on(3, 4, 8, 9),
    { ...DRUMS, octave: 2, gain: .26, attack: .001, decay: .4, sustain: 0, release: .2, clip: .8, lpf: 5000, hpf: 35, effects: { reverb: 0, pan: 0 }, mapping: { fileDegrees: 0, rankDegrees: 0, panWidth: 0 } }),
]
for (const part of PARTS) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound: the DJ intro is filtered, the drops are driven, the melody is soft ----------
const DRIVE = { driveRange: { first: 1.6, second: 2.2 } }
const SECTION_PARAMS = {
  a2: { 0: { lpfRange: { first: 900, second: 1100 } }, 3: { gain: .44, ...DRIVE }, 5: { gain: .28 }, 8: { gain: .44, ...DRIVE }, 9: { gain: .44, ...DRIVE } },
  a1: { 3: { gain: .5, driveRange: { first: 2.4, second: 3 }, lpfRange: { first: 420, second: 480 } }, 5: { gain: .32 }, 8: { gain: .5, driveRange: { first: 2.4, second: 3 }, lpfRange: { first: 420, second: 480 } } },
  h2: { 3: DRIVE, 8: DRIVE },
  d2: { 0: { lpfRange: { first: 2500, second: 3000 } }, 5: { gain: .22 } },
  b2: { 5: { gain: .18, reverbRange: { first: .2, second: .24 } } },
  c1: { 5: { gain: .1, reverbRange: { first: .32, second: .38 } } },
  f1: { 5: { gain: .13, reverbRange: { first: .3, second: .34 } } },
  e1: { 0: { lpfRange: { first: 1200, second: 1500 } }, 5: { gain: .05 } },
  d1: { 0: { lpfRange: { first: 1800, second: 2200 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'rio-1995', kitName: 'Funk carioca', profileName: 'Rio de Janeiro 1995 · Funk carioca', meter: '4/4', bpm: 128, root: 'F', scale: 'Menor natural',
  form: FORM, parts: PARTS,
  reactions: reactions('fnk', { refrain: 3, breque: 4, lament: 5, calm: 5, tense: 2, peak: 3, finale: 6 }),
  reference: 'Funk carioca dos bailes de 1989–1996 (Volt Mix, DJ Marlboro, Cidinho & Doca, as montagens): referência de estilo; material original',
  url: 'https://pt.wikipedia.org/wiki/Funk_carioca',
}).catch(error => { console.error(error); process.exit(1) })
