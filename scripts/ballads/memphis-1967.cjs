// 1967 Memphis - Southern soul. Original ballad in the spirit of the Stax house band (Booker T. & the
// M.G.'s with the Memphis Horns behind Otis Redding): 12/8 with a patient backbeat, organ and
// triplet piano, double-stop guitar answers, warm horn pads, a gospel "amen" breakdown, an
// up-tempo horn-driven solo and the last chorus raised a semitone.
// Run: node scripts/ballads/memphis-1967.cjs
const { composer, build, reactions, SAMPLE } = require('./lib.cjs')
const C = composer('12/8', 'Maior')
const { mel, rep, hits, relative, strum, portamento, up, vel, set } = C

// F major. Roots: 0 F, 1 Gm, 2 Am, 3 Bb, 4 C, 5 Dm.
const VERSE = [0, 5, 3, 4, 0, 5, 3, 4], CHORUS = [3, 4, 0, 5, 3, 4, 0, 0]
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: [3, 0, 3, 4] },
  { label: 'Verse', bars: 8, bank: 1, harmony: VERSE },
  { label: 'Pre-Chorus', bars: 4, bank: 2, harmony: [1, 2, 3, 4] },
  { label: 'Chorus', bars: 8, bank: 3, harmony: CHORUS },
  { label: 'Verse', bars: 8, bank: 1, harmony: VERSE },
  { label: 'Pre-Chorus', bars: 4, bank: 2, harmony: [1, 2, 3, 4] },
  { label: 'Chorus', bars: 8, bank: 3, harmony: CHORUS },
  { label: 'Break', bars: 8, bank: 4, harmony: [3, 0, 3, 0, 3, 0, 4, 4] },   // gospel amen breakdown
  { label: 'Solo', bars: 8, bank: 5, harmony: [0, 0, 3, 3, 0, 0, 4, 3] },    // up-tempo horn groove
  { label: 'Chorus', bars: 8, bank: 3, harmony: CHORUS, transpose: 1 },      // the key change
  { label: 'Outro', bars: 4, bank: 6, harmony: [3, 0, 3, 0], transpose: 1 },
]
const H = bank => FORM.find(s => s.bank === bank).harmony
const FILL = 7
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)

// ---------- the song (absolute degrees of F major) ----------
const SONG_VERSE = mel('r:6 4:2 5:1 7:3 | 5:6~ 4:2 2:1 0:3 | r:3 3:2 4:1 5:3 7:3 | 6:6~ 4:6 | r:6 7:2 8:1 9:3 | 8:6~ 7:3 5:3 | 3:2 5:1 7:3 8:2^1 7:1 5:3 | 4:9~* r:3', { accent: { beat: .85, off: .74 } })
const SONG_PRE = mel('1:3 3:3 5:3 8:3 | 2:3 4:3 6:3 9:3 | 3:3 5:3 7:3 10:3 | 11:6~ 10:3 8:3', { accent: { beat: .9, off: .8 } })
const SONG_CHORUS = mel('10:6~ 9:3 7:3 | 8:3 9:3 11:6~ | 9:6~ 7:6 | 5:3 7:3 9:3 12:3 | 12:4^2 10:2 9:3 7:3 | 8:3 7:3 6:3 4:3 | 7:12~* | r:6 4:2 5:1 7:3', { accent: { beat: .9, off: .8 } })
const SOLO = mel([
  '7:2 9:2 11:2 14:4~ 11:2 9:2 7:2 9:2 11:2', '9:4^1 7:2 4:2 7:4 9:4 r:6', '10:2 12:2 14:2 15:6~ 14:2 12:2 10:2 12:2', '10:6 7:6 r:12',
  '14:3 14:3^2 14:3 12:3 11:6 9:6', '7:2 9:2 11:2 12:4 11:2 9:4 7:4 4:2', '8:2 9:2 11:2 12:2 11:2 9:2 8:4^1 6:4 4:4', '7:12~ r:12',
].join('|'), { unit: 1 / 24, accent: { beat: .9, off: .78 } })

// ---------- a1 Bass (fingered electric): roots, fifths and walk-ups ----------
const bass = {
  0: mel('0:6 4:3 2:3 | 0:9 r:3 | 0:6 4:3 2:3 | 0:6 4:3 -1:3'),
  1: mel(rep('0:6 r:2 0:1 4:3 | 0:6 r:3 2:2 3:1', 4)),
  2: mel(rep('0:6 4:3 2:3', 4)),
  3: mel(rep('0:5 0:1 4:3 0:3 | 0:6 4:3 6:2 7:1', 4)),
  4: mel(rep('0:12~ | 0:6 r:6', 4), { gate: .97 }),
  5: mel(rep('0:2 0:1 4:2 0:1 7:2 0:1 4:2 0:1 | 0:2 0:1 4:2 0:1 6:2 5:1 4:2 2:1', 4), { accent: { beat: .92, off: .82 } }),
  6: mel('0:9 4:3 | 0:9 r:3 | 0:9 4:3 | 0:12*'),
  [FILL]: mel('0:3 2:3 4:3 6:3'),
}

// ---------- drums: a2 Kick, b2 Snare, c2 Hats, f2 Cross-stick, g2 Crash ----------
const kick = {
  0: hits('............ | ............ | ............ | X...........'),
  1: hits(rep('X.......x...', 8)), 2: hits(rep('X.....x..x..', 4)), 3: hits(rep('X.....x.x...', 8)),
  5: hits(rep('X..x..X..x.. | X..x..X.x...', 4)), 6: hits('X........... | X........... | X........... | X...........'),
}
const snare = {
  2: hits(rep('...x.....X..', 3) + ' | ...X..x.xRRR'), 3: hits(rep('...X.....X..', 8)),
  5: hits(rep('...X.....X..', 8)), 6: hits('...X........ | ............ | ...X........ | ............'),
  [FILL]: hits('...X..g.gRRR'),
}
const hats = {
  1: hits(rep('x.ox.ox.ox.?', 8)), 2: hits(rep('xooxooxooxoo', 4)), 3: hits(rep('xooxooxooxoo', 8)), 5: hits(rep('xoxoxoxoxoxo', 8)),
}
const crossStick = { 1: hits(rep('...x.....x..', 8)) }
const crash = { 0: hits('............ | ............ | ............ | ......o.....'), 3: hits('X........... | ' + rep('............', 7)), 6: hits('X........... | ............ | ............ | X...........') }

// ---------- b1 Tenor sax: the voice of the song ----------
const sax = {
  1: relative(portamento(SONG_VERSE, 4, .08, 2), H(1)),
  2: relative(SONG_PRE, H(2)),
  3: relative(portamento(SONG_CHORUS, 4, .08, 2), H(3)),
  4: relative(set(mel('r:12 | r:6 7:3~ 9:3 | 10:12~ | r:12 | r:6 9:3 10:3 | 12:12~ | 11:6 9:6 | 7:12~*'), { velocity: .6 }), H(4)),
  5: relative(SOLO, H(5)),
  6: relative(mel('r:6 9:3 10:3 | 9:12~ | r:6 7:3 9:3 | 7:12~*'), H(6)),
}

// ---------- c1 Organ (drawbars with the Leslie's tremolo) ----------
const organ = {
  0: mel('0,2,4:12~ | 0,2,4:12~ | 0,2,4:12~ | 0,2,4,6:12~', { gate: 1, accent: { strong: .7 } }),
  1: mel(rep('0,2,4:12', 8), { gate: 1, accent: { strong: .55 } }),
  2: mel(rep('0,2,4:6 0,2,4:6', 4), { gate: 1, accent: { strong: .7, beat: .65 } }),
  3: mel(rep('0,2,4:12', 8), { gate: 1, accent: { strong: .75 } }),
  4: mel(rep('0,2,4:9 2,4,7:3 | 0,2,4:12', 4), { gate: 1, accent: { strong: .85, beat: .8 } }),
  5: mel(rep('r:3 0,2,4:2s r:1 r:3 0,2,4:2s r:1', 8)),
  6: mel('0,2,4:12~ | 0,2,4:12~ | 0,2,4:12~ | 0,2,4:12~*', { gate: 1 }),
}

// ---------- d1 Piano: triplet arpeggios, gospel chords in the break ----------
const arp = n => mel(rep('0:1 2:1 4:1 7:1 4:1 2:1 0:1 2:1 4:1 7:1 4:1 2:1', n), { gate: 1.2, accent: { strong: .8, beat: .7, off: .55 } })
const piano = {
  0: arp(4), 1: arp(8), 2: mel(rep('0,2,4:3 0,2,4:3 0,2,4:3 0,2,4:3', 4)), 3: mel(rep('0,2,4,7:1 2,4:1 2,4:1 2,4:1 2,4:1 2,4:1 2,4:1 2,4:1 2,4:1 2,4:1 2,4:1 2,4:1', 8), { gate: .8, accent: { strong: .9, beat: .78, off: .58 } }),
  4: mel(rep('-7,0,2,4:3 r:3 0,2,4:2 2,4,7:1 0,2,4:3 | 7:1 4:1 2:1 0:1 2:1 4:1 0,2,4:6~', 4)),
  6: mel('0:1 2:1 4:1 7:1 9:1 11:1 14:6~ | r:12 | 0:1 2:1 4:1 7:1 9:1 11:1 14:6~ | 0,2,4,7:12*'),
  [FILL]: mel('14:1 11:1 9:1 7:1 4:1 2:1 0:1 2:1 4:1 7:3'),
}

// ---------- d2 Tambourine, e2 Handclaps ----------
const tambourine = { 3: hits(rep('...x.....x..', 8)), 4: hits(rep('x..x..x..x..', 8)), 5: hits(rep('...X.....X..', 8)) }
const claps = { 4: hits(rep('...X.....X..', 8)), 5: hits(rep('...x.....x..', 8)) }

// ---------- e1 Guitar: arpeggio intro, double-stop answers (sixths sliding up) ----------
const answers = mel(rep('r:12 | r:6 2,7:2^2 4,9:1? 2,7:3', 4))
const guitar = {
  0: mel('0:1 2:1 4:1 7:1 4:1 2:1 0:1 2:1 4:1 7:1 9:1 7:1 | r:12 | 0:1 2:1 4:1 7:1 4:1 2:1 0:1 2:1 4:1 7:1 9:1 7:1 | 4,9:6^1 r:6', { gate: 1.3 }),
  1: answers, 3: mel(rep('r:3 2,7:1s r:5 2,7:1s r:2', 8)),
  5: strum(mel(rep('r:3 0,2,4:1s r:2 r:3 0,2,4:1s r:2', 8))),
  6: mel('r:12 | r:6 2,7:2^2 4,9:4* | r:12 | r:12'),
}

// ---------- f1 Trumpet, g1 Trombone: the horn section ----------
const hornPads = (top) => mel(rep(`${top}:12`, 8), { gate: .95, accent: { strong: .7 } })
const trumpet = {
  0: mel('r:12 | r:12 | 4:12~ | 4:12~'),
  3: hornPads('4'), 5: mel(rep('r:6 4:1! 4:2s r:3 | r:3 6:2s 7:1! r:6', 4)),
  6: mel('4:12~ | 4:12~ | 4:12~ | 4:12~*'),
  2: mel('r:12 | r:12 | 4:6 4:6 | 7:6~ 6:6'),
}
const trombone = {
  0: mel('r:12 | r:12 | 0:12~ | 0:12~'),
  3: hornPads('0'), 5: mel(rep('r:6 0:1! 0:2s r:3 | r:3 2:2s 4:1! r:6', 4)),
  6: mel('0:12~ | 0:12~ | 0:12~ | 0:12~*'),
  2: mel('r:12 | r:12 | 0:6 0:6 | 4:6~ 2:6'),
}

// ---------- h1 Strings: sweetening on the choruses ----------
const strings = { 3: mel('2:12 | 4:12 | 4:12 | 2:12 | 2:12 | 4:12 | 7:12 | 7:6 4:6', { gate: 1, accent: { strong: .6 } }), 6: mel('4:12~ | 2:12~ | 4:12~ | 7:12~*', { gate: 1 }) }

// ---------- h2 Backing choir: "ooh" in the gospel break and the last chorus ----------
const choir = { 4: mel(rep('0,2,4:12 | 0,2,4:12', 4), { gate: 1, accent: { strong: .7 } }), 3: mel(rep('2,4,7:12', 8), { gate: 1, accent: { strong: .5 } }), 6: mel('0,2,4:12 | 0,2,4:12 | 0,2,4:12 | 0,2,4:12*', { gate: 1 }) }

const P = (slot, name, role, behavior, source, rolls, sections, opts = {}) => ({ slot, name, role, behavior, source, rolls, sections, ...opts })
const ALL = FORM.map((_, i) => i)
const PARTS = [
  P('a1', 'Bass', 'bass', 'phrase', SAMPLE('guitars', 'bass'), bass, on(...ALL),
    { octave: 2, gain: .24, attack: .004, decay: .4, sustain: .6, release: .2, clip: 1, lpf: 2600, hpf: 30, fills: { 2: FILL, 5: FILL }, effects: { reverb: .05 },
      design: { role: 'bass', filterEnv: .5, filterAttack: .005, filterDecay: .15 } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 1, false), kick, on(0, 1, 2, 3, 4, 5, 6, 8, 9, 10),
    { octave: 2, gain: .12, attack: .001, decay: .3, sustain: 0, release: .1, clip: .8, lpf: 4000, hpf: 30, effects: { reverb: .05 }, design: { role: 'drums' } }),
  P('b1', 'Tenor sax', 'melody', 'phrase', SAMPLE('band', 'tenor-sax', 0), sax, on(1, 2, 3, 4, 5, 6, 7, 8, 9, 10),
    { octave: 3, gain: .1, attack: .03, decay: .3, sustain: .8, release: .25, clip: 1, lpf: 6000, hpf: 110, effects: { reverb: .2, pan: -.05 },
      reverbRange: { first: .16, second: .24, frequency: 'section' }, design: { role: 'lead', vibrato: 4.6, vibratoDepth: .16 } }),
  P('b2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 1, false), snare, on(2, 3, 5, 6, 8, 9, 10),
    { octave: 2, gain: .085, attack: .001, decay: .2, sustain: 0, release: .12, clip: .8, lpf: 7000, hpf: 140, fills: { 2: FILL, 5: FILL, 8: FILL }, effects: { reverb: .28 }, design: { role: 'drums' } }),
  P('c1', 'Organ', 'harmony', 'sustain', SAMPLE('keys', 'organ'), organ, on(...ALL),
    { octave: 3, gain: .055, attack: .03, decay: .3, sustain: .85, release: .25, clip: 1, lpf: 4200, hpf: 100, effects: { reverb: .16, pan: -.3 },
      design: { role: 'pad', lfoTarget: 'gain', lfoRate: 6.2, lfoUnit: 'hz', lfoDepth: .12, lfoShape: 'sine', vibrato: 6.2, vibratoDepth: .06 } }),
  P('c2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 0, false), hats, on(1, 2, 3, 4, 5, 6, 8, 9),
    { octave: 2, gain: .04, attack: .001, decay: .06, sustain: 0, release: .04, clip: .5, lpf: 10000, hpf: 2000, effects: { reverb: .05, pan: .3 }, design: { role: 'drums' } }),
  P('d1', 'Piano', 'harmony', 'phrase', SAMPLE('classical', 'concert-piano'), piano, on(0, 1, 2, 3, 4, 5, 6, 7, 9, 10),
    { octave: 4, gain: .065, attack: .002, decay: .5, sustain: .4, release: .3, clip: 1, lpf: 6500, hpf: 120, fills: { 6: FILL }, effects: { reverb: .18, pan: .2 } }),
  P('d2', 'Tambourine', 'rhythm', 'pulse', SAMPLE('percussion', 'tambourine', 1, false), tambourine, on(6, 7, 8, 9),
    { octave: 2, gain: .04, attack: .001, decay: .15, sustain: 0, release: .08, clip: .6, lpf: 10000, hpf: 1200, effects: { reverb: .12, pan: .4 }, design: { role: 'drums' } }),
  P('e1', 'Guitar', 'response', 'phrase', SAMPLE('guitars', 'clean', 1), guitar, on(0, 1, 3, 4, 6, 8, 9, 10),
    { octave: 3, gain: .06, attack: .002, decay: .4, sustain: .35, release: .2, clip: .9, lpf: 5500, hpf: 120, effects: { reverb: .2, pan: .35, delay: .06 },
      design: { delayTime: '1/8', delayFeedback: .2 } }),
  P('e2', 'Handclaps', 'rhythm', 'pulse', SAMPLE('brasil', 'palmas', 0, false), claps, on(7, 8),
    { octave: 2, gain: .05, attack: .001, decay: .12, sustain: 0, release: .1, clip: .6, lpf: 8000, hpf: 300, effects: { reverb: .3, pan: -.15 }, design: { role: 'drums' } }),
  P('f1', 'Trumpet', 'response', 'phrase', SAMPLE('classical', 'orchestra-trumpet'), trumpet, on(0, 2, 5, 6, 8, 9, 10),
    { octave: 4, gain: .05, attack: .06, decay: .3, sustain: .75, release: .3, clip: 1, lpf: 5000, hpf: 220, effects: { reverb: .2, pan: .25 },
      design: { role: 'pad', vibrato: 5, vibratoDepth: .06 } }),
  P('f2', 'Cross-stick', 'rhythm', 'pulse', SAMPLE('percussion', 'ghost-snare', 0, false), crossStick, on(1, 4),
    { octave: 2, gain: .045, attack: .001, decay: .1, sustain: 0, release: .06, clip: .5, lpf: 6000, hpf: 400, effects: { reverb: .2, pan: .1 }, design: { role: 'drums' } }),
  P('g1', 'Trombone', 'response', 'phrase', SAMPLE('classical', 'concert-trombone'), trombone, on(0, 2, 5, 6, 8, 9, 10),
    { octave: 3, gain: .055, attack: .06, decay: .3, sustain: .75, release: .3, clip: 1, lpf: 3800, hpf: 80, effects: { reverb: .2, pan: -.25 } }),
  P('g2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(0, 3, 9, 10),
    { octave: 2, gain: .035, attack: .001, decay: 1.2, sustain: 0, release: .8, clip: 1, lpf: 9000, hpf: 300, effects: { reverb: .2, pan: -.2 }, design: { role: 'drums' } }),
  P('h1', 'Strings', 'harmony', 'sustain', SAMPLE('classical', 'orchestra-violin'), strings, on(6, 9, 10),
    { octave: 4, gain: .045, attack: .5, decay: .5, sustain: .85, release: .8, clip: 1, lpf: 6000, hpf: 250, effects: { reverb: .34, pan: .3 } }),
  P('h2', 'Backing choir', 'texture', 'sustain', SAMPLE('synths', 'choir'), choir, on(7, 9, 10),
    { octave: 4, gain: .045, attack: .4, decay: .5, sustain: .85, release: .7, clip: 1, lpf: 4500, hpf: 200, effects: { reverb: .36 } }),
]
for (const part of PARTS) part.sections = part.sections.map((present, i) => present && part.rolls[FORM[i].bank] ? true : null)

// ---------- per-section sound ----------
const SECTION_PARAMS = {
  a1: { 7: { lpfRange: { first: 1200, second: 1500 } }, 8: { driveRange: { first: 1, second: 1.5 }, gain: .26 } },
  b1: { 4: { gain: .075, reverbRange: { first: .3, second: .36 } }, 8: { gain: .12, driveRange: { first: 1, second: 1.7 }, reverbRange: { first: .1, second: .14 } }, 9: { gain: .11 }, 10: { reverbRange: { first: .34, second: .44 } } },
  b2: { 9: { gain: .1 } },
  c1: { 0: { lfoRate: 1.2 }, 7: { gain: .075, lfoRate: 6.8, lfoDepth: .2, lpfRange: { first: 5000, second: 5500 } }, 8: { driveRange: { first: 1, second: 1.6 } } },
  d1: { 7: { gain: .08, reverbRange: { first: .3, second: .34 } } },
  e1: { 0: { reverbRange: { first: .32, second: .4 } } },
  f1: { 8: { attack: .01, release: .1, gain: .065 }, 9: { gain: .06 } },
  g1: { 8: { attack: .01, release: .1, gain: .07 } },
  h1: { 9: { gain: .055 } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'memphis-1967', kitName: 'Southern soul', profileName: 'Southern soul · Memphis 1967',
  bpm: 64, meter: '12/8', root: 'F', scale: 'Maior', form: FORM, parts: PARTS, ternary: true,
  reactions: reactions('memphis', { record: { hpf: 220, lpf: 4200 }, lift: 1, contrast: 5, lament: 4, calm: 1, finale: 6, climax: 3, solo: 5 }),
  reference: 'Soul sulista de Memphis em 1967 (banda da casa da Stax: Booker T. & the M.G.\'s e os Memphis Horns com Otis Redding); composição original: 12/8 com backbeat paciente, órgão e piano em tercinas, respostas de guitarra em sextas, naipe de metais, quebra gospel de "amém", solo acelerado e o último refrão meio tom acima.',
  url: 'https://staxrecords.com/songwriter/steve-cropper-and-otis-redding/',
}).catch(error => { console.error(error); process.exit(1) })
