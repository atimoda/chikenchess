// 1977 London - Arena rock in six. Original anthem in the spirit of the British piano-led arena rock
// of the late 70s (6/8 with two broad pulses): piano arpeggios, a lead guitar orchestrated in
// harmony, a choir-sized refrain, a music-hall interlude and an a cappella break, with the last
// chorus lifted a whole tone. Kept warm and clean, not loud. Run: node scripts/ballads/london-1977.cjs
const { composer, build, reactions, SAMPLE } = require('./lib.cjs')
const C = composer('6/8', 'Maior')
const { mel, rep, hits, relative, strum, portamento, up, vel, set } = C

// D major. Roots: 0 D, 1 Em, 2 F#m, 3 G, 4 A, 5 Bm.
const VERSE = [0, 4, 5, 2, 3, 0, 1, 4], CHORUS = [0, 3, 4, 5, 3, 0, 1, 4]
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: [0, 5, 3, 0] },
  { label: 'Verse', bars: 8, bank: 1, harmony: VERSE },
  { label: 'Pre-Chorus', bars: 4, bank: 2, harmony: [3, 4, 5, 4] },
  { label: 'Chorus', bars: 8, bank: 3, harmony: CHORUS },
  { label: 'Verse', bars: 8, bank: 1, harmony: VERSE },
  { label: 'Chorus', bars: 8, bank: 3, harmony: CHORUS },
  { label: 'Interlude', bars: 8, bank: 4, harmony: [0, 5, 1, 4, 0, 5, 1, 4] }, // music hall
  { label: 'Bridge', bars: 8, bank: 5, harmony: [5, 3, 0, 4, 5, 3, 1, 4] },    // guitar orchestra, half-time
  { label: 'Break', bars: 4, bank: 6, harmony: [3, 0, 3, 4] },                 // a cappella choir
  { label: 'Chorus', bars: 8, bank: 3, harmony: CHORUS, transpose: 2 },
  { label: 'Outro', bars: 4, bank: 0, harmony: [0, 5, 3, 0], transpose: 2 },
]
const H = bank => FORM.find(s => s.bank === bank).harmony
const FILL = 7
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)

// ---------- the song (absolute degrees of D major) ----------
const VERSE_TUNE = mel("r:2 2:1 4:2 2:1 | 1:3~ 0:2 -1:1 | -2:2 0:1 2:3~ | 1:2 2:1 1:2 -1:1 | 3:2 4:1 5:3~ | 4:2 2:1 0:3 | 1:2 3:1 4:2 5:1 | 4:6~*")
const PRE_TUNE = mel('5:2 4:1 3:2 4:1 | 6:3~ 4:3 | 7:2 6:1 5:2 4:1 | 6:3~ 8:3', { accent: { beat: .9, off: .8 } })
const CHORUS_TUNE = mel('7:3~ 9:2 7:1 | 10:3~ 9:2 8:1 | 8:3 6:2 4:1 | 5:3~ 7:2 9:1 | 10:3~ 12:2 10:1 | 9:3 7:3 | 8:2 9:1 10:2 8:1 | 11:6~*', { accent: { beat: .92, off: .8 } })
const HALL = mel('7:1s 9:1 7:1 4:2 4:1 | 5:2s 7:1 9:3 | 8:1 7:1 5:1 4:2 1:1 | 4:3 6:3 | 7:1s 9:1 7:1 4:2 4:1 | 5:2s 7:1 9:3 | 8:1 9:1 10:1 11:2 8:1 | 7:3 r:3', { gate: .7, accent: { off: .75 } })
const GUITAR_ORCHESTRA = mel('5:6~ | 7:3 6:3 | 4:6~ | 6:3 8:3 | 9:6~ | 10:3 9:3 | 8:6~ | 11:6~*', { gate: .98 })

// ---------- a1 Bass ----------
const bass = {
  0: mel('0:6 | 0:6 | 0:6 | 0:6*', { accent: { strong: .7 } }),
  1: mel(rep('0:3 0:2 4:1', 8)), 2: mel(rep('0:2 0:1 0:2 0:1', 4)),
  3: mel(rep('0:3 0:2 4:1 | 0:2 0:1 2:2 4:1', 4)),
  4: mel(rep('0:3s 4:3s', 8)),
  5: mel(rep('0:6~ | 0:3 4:3', 4), { gate: .98 }),
  [FILL]: mel('0:2 2:1 4:2 6:1'),
}

// ---------- drums ----------
const kick = {
  1: hits(rep('X..... | X..x..', 4)), 2: hits(rep('X..x..', 4)), 3: hits(rep('X..x.x', 8)),
  4: hits(rep('X.....', 8)), 5: hits(rep('X..... | ...... ', 4)), 6: hits(rep('X..... | ......', 2)),
}
const snare = { 1: hits(rep('...X..', 8)), 2: hits('...X.. | ...X.. | ...X.. | ...XRR'), 3: hits(rep('...X..', 8)), 5: hits(rep('...... | ...X..', 4)), [FILL]: hits('X.xRRR') }
const hats = { 1: hits(rep('x.o.x? | x.o.x.', 4)), 2: hits(rep('xoxoxo', 4)), 3: hits(rep('xoxoxo', 8)) }
const toms = { 2: hits('...... | ...... | ...... | ...xxx', { degree: 0 }), 6: hits('X..... | ...... | X..... | ......'), 5: hits(rep('...... | ......', 3) + ' | ...... | X.xXxx'), [FILL]: hits('xxxRRX') }
const crash = { 3: hits('X..... | ' + rep('......', 7)), 5: hits('X..... | ' + rep('......', 7)), 0: hits('...... | ...... | ...... | o.....') }
const brush = { 4: hits(rep('...x.. | ...x.g', 4)) }

// ---------- b1 Piano: arpeggios, chords in the chorus, music-hall vamp ----------
const arp = (n, last = '0:1 4:1 7:1 9:1 7:1 4:1') => mel(rep(last, n), { gate: 1.3, accent: { strong: .85, beat: .75, off: .58 } })
const piano = {
  0: mel('0:1 4:1 7:1 9:1 7:1 4:1 | 0:1 4:1 7:1 9:1 7:1 4:1 | 0:1 4:1 7:1 9:1 7:1 4:1 | 0,4,7,9:6~*', { gate: 1.3, accent: { strong: .85, beat: .75, off: .58 } }),
  1: arp(8), 2: mel(rep('0,2,4:3 0,2,4:2 0,2,4:1', 4)),
  3: mel(rep('-7,0,2,4:3 0,2,4:2 0,2,4:1', 8), { accent: { strong: .95, beat: .85, off: .7 } }),
  4: mel(rep('-7:2s 0,2,4:1s -3:2s 0,2,4:1s', 8), { accent: { strong: .9, beat: .85, off: .7 } }),
  6: mel('r:6 | r:6 | r:6 | 4,6:6*'),
  [FILL]: mel('0:1 2:1 4:1 7:1 9:1 11:1'),
}

// ---------- c1 Lead guitar, d1 Harmony guitar (thirds below) ----------
const lead = {
  1: relative(portamento(VERSE_TUNE, 4, .07, 2), H(1)),
  2: relative(PRE_TUNE, H(2)),
  3: relative(portamento(CHORUS_TUNE, 4, .07, 2), H(3)),
  5: relative(GUITAR_ORCHESTRA, H(5)),
}
const harmonyGuitar = {
  3: relative(set(up(CHORUS_TUNE, -2), { velocity: .7 }), H(3)),
  5: relative(set(up(GUITAR_ORCHESTRA, -2), { velocity: .75 }), H(5)),
  0: relative(mel('r:6 | r:6 | 5:3 4:3 | 2:6~*'), H(0)),
}

// ---------- e1 Rhythm guitar: soft palm-muted eighths in the chorus and pre-chorus ----------
const rhythm = { 2: mel(rep('0,4:1 0,4:1 0,4:1 0,4:1 0,4:1 0,4:1', 4), { gate: .6 }), 3: mel(rep('0,4:1 0,4:1 0,4:1 0,4:1 0,4:1 0,4:1', 8), { gate: .6 }), 5: strum(mel(rep('0,4,7:6~', 8), { gate: 1 })) }

// ---------- f1 Strings, g1 Choir ----------
const strings = {
  1: mel('r:6 | r:6 | r:6 | r:6 | 2:6 | 4:6 | 2:6 | 2:6', { gate: 1, accent: { strong: .5 } }),
  3: mel(rep('2,4:6', 8), { gate: 1, accent: { strong: .65 } }),
  5: mel(rep('0,4:6', 8), { gate: 1, accent: { strong: .7 } }),
}
const choir = {
  3: mel(rep('0,2,4:6', 8), { gate: 1, accent: { strong: .6 } }),
  6: relative(mel('3,5,7:6 | 2,4,7:6 | 3,5,7:3 1,3,5:3 | 1,4,6:6~*', { gate: 1 }), H(6)),
}

// ---------- g2 Timpani: rolls into the last choruses ----------
const timpani = { 3: hits('X..... | ' + rep('......', 6) + ' | ...RRR', { degree: 0 }), 5: hits(rep('...... ', 6) + ' | ...... | RRRRRR') }

// ---------- h1 Clarinet: the music hall ----------
const clarinet = { 4: relative(HALL, H(4)) }

// ---------- h2 Celesta: sparkles over the second verse and the intro ----------
const celesta = { 1: relative(set(mel('r:6 | r:3 11:1 9:1 7:1 | r:6 | r:6 | r:6 | r:3 11:1 12:1 14:1 | r:6 | r:6'), { velocity: .55 }), H(1)), 0: relative(mel('r:6 | r:6 | r:6 | 14:6~*'), H(0)), 4: mel(rep('r:3 7:1 9:1 11:1', 8), { accent: { off: .55 } }) }

const P = (slot, name, role, behavior, source, rolls, sections, opts = {}) => ({ slot, name, role, behavior, source, rolls, sections, ...opts })
const PARTS = [
  P('a1', 'Bass', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { octave: 2, gain: .23, attack: .004, decay: .4, sustain: .6, release: .2, clip: 1, lpf: 2600, hpf: 30, fills: { 2: FILL, 4: FILL }, effects: { reverb: .05 },
      design: { role: 'bass', filterEnv: .5, filterAttack: .005, filterDecay: .15 } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 0, false), kick, on(1, 2, 3, 4, 5, 6, 7, 8, 9),
    { octave: 2, gain: .12, attack: .001, decay: .3, sustain: 0, release: .1, clip: .8, lpf: 4000, hpf: 30, effects: { reverb: .1 }, design: { role: 'drums' } }),
  P('b1', 'Piano', 'harmony', 'phrase', SAMPLE('classical', 'concert-piano'), piano, on(...ALL),
    { octave: 3, gain: .08, attack: .002, decay: .5, sustain: .4, release: .35, clip: 1, lpf: 7000, hpf: 60, fills: { 3: FILL }, effects: { reverb: .2, pan: -.15 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 0, false), snare, on(1, 2, 3, 4, 5, 7, 9),
    { octave: 2, gain: .08, attack: .001, decay: .2, sustain: 0, release: .12, clip: .8, lpf: 7000, hpf: 140, fills: { 1: FILL, 4: FILL, 5: FILL }, effects: { reverb: .3 }, design: { role: 'drums' } }),
  P('c1', 'Lead guitar', 'melody', 'phrase', SAMPLE('guitars', 'clean'), lead, on(1, 2, 3, 4, 5, 7, 9),
    { octave: 4, gain: .085, attack: .006, decay: .5, sustain: .6, release: .35, clip: 1, lpf: 5200, hpf: 150, effects: { reverb: .24, pan: -.2, delay: .12 },
      reverbRange: { first: .2, second: .28, frequency: 'section' }, driveRange: { first: .4, second: .8, frequency: 'section' },
      design: { role: 'lead', vibrato: 5.4, vibratoDepth: .14, delayTime: '1/4', delayFeedback: .3 } }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 1, false), hats, on(1, 2, 3, 4, 5, 9),
    { octave: 2, gain: .04, attack: .001, decay: .06, sustain: 0, release: .04, clip: .5, lpf: 10000, hpf: 2000, effects: { reverb: .06, pan: .3 }, design: { role: 'drums' } }),
  P('d1', 'Harmony guitar', 'response', 'phrase', SAMPLE('guitars', 'clean', 1), harmonyGuitar, on(0, 3, 5, 7, 9, 10),
    { octave: 4, gain: .065, attack: .006, decay: .5, sustain: .6, release: .35, clip: 1, lpf: 5000, hpf: 150, effects: { reverb: .26, pan: .25, delay: .1 },
      design: { vibrato: 5.2, vibratoDepth: .12, delayTime: '1/4', delayFeedback: .28 } }),
  P('d2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 0), toms, on(2, 7, 8),
    { octave: 3, gain: .07, attack: .001, decay: .3, sustain: 0, release: .15, clip: .8, lpf: 5000, hpf: 60, fills: { 8: FILL }, effects: { reverb: .25 }, design: { role: 'drums' } }),
  P('e1', 'Rhythm guitar', 'harmony', 'phrase', SAMPLE('guitars', 'muted'), rhythm, on(2, 3, 5, 7, 9),
    { octave: 3, gain: .05, attack: .002, decay: .2, sustain: .3, release: .08, clip: .8, lpf: 4000, hpf: 120, effects: { reverb: .1, pan: .4 } }),
  P('e2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 1, false), crash, on(0, 3, 7, 9, 10),
    { octave: 2, gain: .035, attack: .001, decay: 1.2, sustain: 0, release: .8, clip: 1, lpf: 9000, hpf: 300, effects: { reverb: .25, pan: -.25 }, design: { role: 'drums' } }),
  P('f1', 'Strings', 'harmony', 'sustain', SAMPLE('classical', 'orchestra-violin'), strings, on(4, 5, 7, 9),
    { octave: 4, gain: .05, attack: .4, decay: .5, sustain: .85, release: .8, clip: 1, lpf: 6000, hpf: 220, effects: { reverb: .34, pan: -.3 } }),
  P('f2', 'Brushes', 'rhythm', 'pulse', SAMPLE('percussion', 'ghost-snare', 1, false), brush, on(6),
    { octave: 2, gain: .05, attack: .001, decay: .12, sustain: 0, release: .06, clip: .5, lpf: 6000, hpf: 300, effects: { reverb: .1, pan: .1 }, design: { role: 'drums' } }),
  P('g1', 'Choir', 'texture', 'sustain', SAMPLE('synths', 'choir'), choir, on(5, 8, 9),
    { octave: 4, gain: .05, attack: .25, decay: .5, sustain: .85, release: .7, clip: 1, lpf: 5000, hpf: 200, effects: { reverb: .38 } }),
  P('g2', 'Timpani', 'rhythm', 'pulse', SAMPLE('classical', 'timpani-low', 0, false), timpani, on(5, 7),
    { octave: 2, gain: .06, attack: .001, decay: .8, sustain: 0, release: .5, clip: 1, lpf: 3000, hpf: 30, effects: { reverb: .3 }, design: { role: 'drums' } }),
  P('h1', 'Clarinet', 'melody', 'phrase', SAMPLE('classical', 'orchestra-clarinet'), clarinet, on(6),
    { octave: 4, gain: .075, attack: .015, decay: .3, sustain: .75, release: .15, clip: 1, lpf: 8000, hpf: 200, effects: { reverb: .14, pan: .2 }, design: { role: 'lead', vibrato: 5, vibratoDepth: .1 } }),
  P('h2', 'Celesta', 'response', 'phrase', SAMPLE('keys', 'celesta'), celesta, on(0, 4, 6, 10),
    { octave: 4, gain: .045, attack: .002, decay: .6, sustain: .3, release: .6, clip: 1, lpf: 9000, hpf: 300, effects: { reverb: .3, pan: .35, delay: .15 },
      design: { delayTime: '3/8', delayFeedback: .3 } }),
]
for (const part of PARTS) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound ----------
const SECTION_PARAMS = {
  a1: { 6: { release: .08 } },
  b1: { 0: { reverbRange: { first: .3, second: .36 } }, 6: { reverbRange: { first: .4, second: .5 } }, 10: { reverbRange: { first: .4, second: .5 } } },
  b2: { 7: { gain: .1, reverbRange: { first: .4, second: .5 } } },
  c1: { 4: { gain: .07 }, 7: { gain: .095, driveRange: { first: .8, second: 1.3 }, reverbRange: { first: .32, second: .4 } }, 9: { gain: .095 } },
  d1: { 7: { driveRange: { first: .8, second: 1.3 }, reverbRange: { first: .32, second: .4 } } },
  // The music hall sounds like an old gramophone, the band returns in the bridge.
  h1: { 6: { hpf: 350, lpfRange: { first: 2600, second: 3200 } } },
  f2: { 6: { hpf: 350, lpfRange: { first: 2600, second: 3200 } } },
  g1: { 8: { gain: .075, reverbRange: { first: .45, second: .55 } } },
}
SECTION_PARAMS.b1[4] = { gain: .07, hpf: 350, lpfRange: { first: 2600, second: 3200 } }
SECTION_PARAMS.h2 = { 4: { hpf: 350, lpfRange: { first: 2800, second: 3400 } } }
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'london-1977', kitName: 'Arena rock in six', profileName: 'Arena rock in six · London 1977',
  bpm: 66, meter: '6/8', root: 'D', scale: 'Maior', form: FORM, parts: PARTS, ternary: true,
  reactions: reactions('london', { lift: 2, contrast: 4, lament: 6, calm: 0, finale: 0, climax: 3, solo: 5 }),
  reference: 'Rock de arena britânico ao piano no fim dos anos 1970 (refrões de estádio em 6/8, guitarras orquestradas em harmonia, coros sobrepostos e o music hall como herança); composição original, clara e sem distorção pesada, com interlúdio de music hall, quebra a cappella e o último refrão um tom acima.',
  url: 'https://www.guitarplayer.com/music/brian-may-on-freddie-mercury-and-the-mega-hit-that-changed-queens-relationship-with-their-audience-we-all-looked-at-fred-and-said-really',
}).catch(error => { console.error(error); process.exit(1) })
