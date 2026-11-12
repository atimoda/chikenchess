// 1959 Oakland - Cool jazz. Original modal tune in 5/4 in the spirit of the West Coast quartets of the
// late 1950s (the Dave Brubeck Quartet from across the bay, Stan Getz, Cal Tjader's vibes, the Birth of
// the Cool backgrounds): a 3+2 piano vamp with a heavy left hand, a bass ostinato, a soft tenor sax
// with little vibrato, brushes in the heads and the ride in the solos, a vibraphone solo over a walking
// bridge, a drum solo over the vamp and a flute and muted trumpet harmonizing the last head.
// Run: node scripts/blues-jazz-rock/oakland-1959.cjs
const { composer, build, reactions, SAMPLE, P, present, DRUM, FIXED, voiceLead, walking, roots, onChords, walkNotes, chord } = require('./common.cjs')
const C = composer('5/4', 'Chromatic', { swing: .62 })
const { mel, rep, hits, relative, human, set } = C
const KEY = 'E'

// Two chords per bar, split 3+2 (onChords: beats 1–3 the first chord, beats 4–5 the second).
const VAMP = ['Em9', 'A9'], TURN = ['Cmaj7', 'B7']
const A = [...VAMP, ...VAMP, ...VAMP, ...TURN, ...VAMP, ...VAMP, ...VAMP, ...TURN]
const B = ['Cmaj7', 'Cmaj7', 'B7', 'B7', 'Em7', 'Em7', 'A7', 'A7', 'Am7', 'Am7', 'D7', 'D7', 'Gmaj7', 'Gmaj7', 'F#m7b5', 'B7']
const times = (list, n) => Array.from({ length: n }, () => list).flat()
const A4 = A.slice(0, 8), SOLO = [...A, ...A4], VSOLO = [...B, ...A4]   // 12 bars: a 5/4 section holds at most 64 beats
const INTRO = times(VAMP, 4), DRUMS = times(VAMP, 8), OUTRO = [...times(VAMP, 3), 'Em9', 'Em9']
const R = list => roots(list, KEY, 2)
const FORM = [
  { label: 'Intro', bars: 4, bank: 0, harmony: R(INTRO) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Bridge', bars: 8, bank: 2, harmony: R(B) },
  { label: 'Verse', bars: 8, bank: 1, harmony: R(A) },
  { label: 'Solo', bars: 12, bank: 3, harmony: R(SOLO) },   // tenor sax over the vamp
  { label: 'Solo', bars: 12, bank: 4, harmony: R(VSOLO) },   // vibraphone
  { label: 'Break', bars: 8, bank: 5, harmony: R(DRUMS) },          // drum solo over the vamp
  { label: 'Verse', bars: 8, bank: 6, harmony: R(A) },              // flute and trumpet join the head
  { label: 'Outro', bars: 4, bank: 7, harmony: R(OUTRO) },
]
const CHORDS = [INTRO, A, B, SOLO, VSOLO, DRUMS, A, OUTRO]
const H = bank => FORM.find(s => s.bank === bank).harmony
const on = (...indices) => FORM.map((_, i) => indices.includes(i) || null)
const ALL = FORM.map((_, i) => i)
const each = fn => Object.fromEntries(CHORDS.map((list, bank) => [bank, fn(list, bank)]).filter(([, notes]) => notes))
const isTurn = (list, bar) => list[bar * 2] === 'Cmaj7'

// ---------- b1 Tenor sax (semitones above E3; ten eighths a bar) ----------
const HEAD = mel([
  'r:2 19:3 17:2 14:1 12:2', '14:3~ 10:1 12:2 9:4~', 'r:1 7:1 10:1 14:1 19:2~ 17:1 15:1 r:2', '19:3~ 15:1 12:2 11:2 14:2',
  'r:2 19:3 22:2 21:1 19:2', '24:4~ 22:1 19:1 17:2 15:2', 'r:1 14:1 17:1 19:1 21:2 19:1 15:1 14:2', '15:2 12:2 8:2 11:4~',
].join('|'), { accent: { strong: .82, beat: .76, off: .7 } })
const BRIDGE = mel([
  'r:2 19:4~ 20:2 24:2', '23:4~ 21:1 19:1 17:2 14:2', '19:6~ 17:1 15:1 14:2', '15:4~ 12:2 9:2 5:2',
  'r:2 12:2 15:2 20:3 19:1', '22:4~ 20:2 17:2 14:2', '19:6~ 14:2 15:2', '17:2 20:2 24:2 23:2 19:2',
].join('|'), { accent: { strong: .84, beat: .78, off: .72 } })
const SAX_SOLO = mel([
  'r:2 12:1 14:1 15:1 19:1 21:2 19:1 17:1', '19:3~ 17:1 15:1 14:1 12:2 9:2', 'r:1 10:1 14:1 17:1 22:4~ 21:1 17:1', '19:2 15:2 14:2 12:1 9:1 7:2',
  'r:2 15:1 17:1 19:1 22:1 21:2~ 19:2', '22:3~ 19:1 17:1 15:1 14:1 12:1 9:2', '10:2 14:2 19:2 17:4~', '20:2 19:1 15:1 12:2 11:1 14:1 17:1 23:1',
  '24:4~ 22:1 19:1 21:2 17:2', 'r:1 12:1 15:1 19:1 22:1 19:1 21:1 17:1 15:2', '14:1 15:1 14:1 12:1 10:2 12:2 9:2', '20:3 19:1 15:2 14:2 11:2',
].join('|'), { accent: { strong: .86, beat: .8, off: .74 } })
const sax = {
  1: relative(human(HEAD, .05, 0, 3), H(1)), 2: relative(human(C.portamento(BRIDGE, 5, .1, 2), .05, 0, 5), H(2)),
  3: relative(human(SAX_SOLO, .05, 0, 7), H(3)), 6: relative(set(HEAD, { velocity: .8 }), H(6)),
  7: relative(mel('r:2 19:3 17:2 14:1 12:2 | 14:3~ 10:1 12:2 9:4~ | r:2 7:1 10:1 14:1 19:1 17:4~ | 14:10~*'), H(7)),
}

// ---------- d1 Vibraphone (semitones above E4): pads in the heads and the second solo ----------
const VIBES_SOLO = mel([
  '8:1 12:1 15:1 19:1 20:2~ 19:1 15:1 12:2', '11:1 14:1 17:1 19:1 23:2 21:1 19:1 17:2', '15:3~ 14:1 12:2 10:2 7:2', 'r:1 9:1 12:1 15:1 17:2 15:1 12:1 9:2',
  '8:1 12:1 15:1 17:1 20:4~ 19:2', '22:1 20:1 17:1 14:1 10:2 8:2 14:2', '15:3~ 19:1 22:2 19:2 14:2', '14:1 17:1 20:1 24:1 20:2 23:1 21:1 19:2',
  '19:2 15:1 14:1 12:1 10:1 9:2 12:2', 'r:1 7:1 10:1 14:1 15:1 19:1 21:2~ 17:2', '22:1 21:1 19:1 17:1 15:1 14:1 12:2 9:2', '12:2 15:2 19:2 11:4~',
].join('|'), { accent: { strong: .86, beat: .8, off: .72 } })
const vibesPads = (list, rhythm) => onChords(C, voiceLead(list, KEY, { center: 5, size: 3, drop: true }), rhythm, { perBar: 2, gate: .95 })
const vibes = {
  1: relative(vibesPads(A, [[0, 2.6, .5], [3, 1.8, .46]]), H(1)),
  2: relative(vibesPads(B, [[1.5, .5, .55], [3, 1.8, .5]]), H(2)),
  4: relative(human(VIBES_SOLO, .05, 0, 9), H(4)),
  6: relative(vibesPads(A, [[0, 2.6, .5], [3, 1.8, .46]]), H(6)),
  7: relative(vibesPads(OUTRO, bar => bar === 3 ? [[0, 5, .6, { release: 1.2, reverb: .45 }]] : [[0, 2.6, .5], [3, 1.8, .46]]), H(7)),
}

// ---------- c1 Piano right hand: the 3+2 vamp in rootless voicings ----------
const VAMP_COMP = [[0, 1, .76], [1.5, 1.2, .68], [3, .8, .74], [4, .8, .66]]
const SPARSE = [[0, 1.5, .7], [3.5, .5, .62]]
const comp = (list, bank) => {
  const voices = voiceLead(list, KEY, { center: 10, size: 4, drop: true })
  const rhythm = bank === 2 ? [[0, 2.6, .6], [3, 1.8, .56]]
    : bank === 3 ? bar => bar % 4 === 3 ? SPARSE : VAMP_COMP
    : bank === 4 ? bar => bar < 8 ? [] : bar % 2 ? SPARSE : VAMP_COMP   // strolls while the vibes play the bridge
    : bank === 5 ? bar => bar % 2 ? [[0, 1, .66], [3, .8, .62]] : VAMP_COMP
    : bank === 7 ? bar => bar === 3 ? [[0, 5, .7, { release: 1.2, reverb: .45 }]] : VAMP_COMP
    : VAMP_COMP
  return relative(human(onChords(C, voices, rhythm, { perBar: 2, gate: .9 }), .06, 0, bank + 11), H(bank))
}
const piano = each(comp)

// ---------- f1 Piano left hand: Brubeck's heavy root and fifth on 1 and 4 ----------
const left = each((list, bank) => {
  const lows = list.map(symbol => { const r = chord(symbol, KEY).root, low = r > 6 ? r - 12 : r; return [low, low + 7] })
  const rhythm = bank === 2 ? [[0, 2.6, .62], [3, 1.8, .58]] : bank === 7 ? bar => bar === 3 ? [[0, 5, .72, { release: 1.2 }]] : [[0, 2.6, .72], [3, 1.8, .68]]
    : bank === 4 ? bar => bar < 8 ? [] : [[0, 2.6, .68], [3, 1.8, .64]] : [[0, 2.6, .72], [3, 1.8, .68]]
  return relative(onChords(C, lows, rhythm, { perBar: 2, gate: .92 }), H(bank))
})

// ---------- a1 Double bass (semitones above E1): the ostinato, walking under the bridge ----------
const V1 = '0:3 7:1 10:2 5:2 7:2', V2 = '0:3 7:1 3:2 5:3 -1:1', T = '8:3 12:1 15:2 7:2 11:2'
const ostinato = list => Array.from({ length: list.length / 2 }, (_, bar) => isTurn(list, bar) ? T : bar % 2 ? V2 : V1).join(' | ')
const BRIDGE_BARS = ['Cmaj7', 'B7', 'Em7', 'A7', 'Am7', 'D7', 'Gmaj7', 'F#m7b5']
const walk = seed => walkNotes(C, walking(BRIDGE_BARS, KEY, { beats: 5, low: 0, high: 15, seed }), { velocity: .74 })
const bass = {
  0: relative(mel(`r:10 | r:10 | ${V1} | ${V2}`), H(0)),
  1: relative(human(mel(ostinato(A)), .05, 0, 21), H(1)), 2: relative(walk(5), H(2)),
  3: relative(human(mel(ostinato(SOLO)), .05, 0, 23), H(3)),
  4: relative([...walk(9), ...C.shift(mel(ostinato(A4)), 8)], H(4)),
  5: relative(mel(ostinato(DRUMS)), H(5)), 6: relative(human(mel(ostinato(A)), .05, 0, 27), H(6)),
  7: relative(mel(`${V1} | ${V2} | ${V1} | 0:10*`), H(7)),
}

// ---------- e1 Muted trumpet and g1 Flute: Birth of the Cool backgrounds and the last head ----------
const line = (list, center, rhythm) => onChords(C, voiceLead(list, KEY, { center, size: 1 }), rhythm, { perBar: 2, gate: .95 })
const trumpet = {
  3: relative(line(SOLO, 5, bar => bar < 8 ? [] : bar % 2 ? [[3, 1.6, .6]] : [[0, 2.4, .62]]), H(3)),
  6: relative(line(A, 3, [[0, 2.8, .56], [3, 1.8, .54]]), H(6)),
  7: relative(line(OUTRO, 3, bar => bar === 3 ? [[0, 5, .58, { release: 1, reverb: .45 }]] : [[0, 2.8, .54], [3, 1.8, .52]]), H(7)),
}
const flute = {
  2: relative(line(B, 15, bar => bar === 7 ? [[0, 2.8, .58], [3, 1.9, .56]] : [[0, 4.8, .58]]), H(2)),
  6: relative(human(HEAD, .04, 0, 31), H(6)),   // the head an octave above the sax
}

// ---------- h1 Jazz guitar: soft comping in the vibraphone solo ----------
const guitar = { 4: relative(human(onChords(C, voiceLead(VSOLO, KEY, { center: 6, size: 4, drop: true }),
  bar => bar % 2 ? [[.5, .5, .5], [3, 1.2, .56]] : [[0, 1.2, .58], [1.5, .5, .5], [3.5, .5, .5]], { perBar: 2, gate: .85 }), .06, 0, 41), H(4)) }

// ---------- drums: brushes in the heads, sticks and ride in the solos, a melodic tom solo ----------
const RIDE = 'X.xgx.xgx.'
const ride = { 0: hits(rep(RIDE, 4)), 3: hits(rep(RIDE, 12)), 4: hits(rep(RIDE, 12)), 7: hits(rep(RIDE, 3) + ' | X.........') }
const brush = { 1: hits(rep('xgxgxgxgxg', 8)), 2: hits(rep('xgxgxgxgxg', 8)), 6: hits(rep('xgxgxgxgxg', 8)) }
const hat = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(bank => [bank, hits(rep('..x...x...', FORM.find(s => s.bank === bank).bars))]).concat([[7, hits(rep('..x...x...', 3) + ' | ..........')]]))
const kick = {
  0: hits(rep('o.....o...', 4)), 1: hits(rep('g.....g...', 8)), 2: hits(rep('g.....g...', 8)), 3: hits(rep('o.....o... | o.....o..?', 6)),
  4: hits(rep('o.....o... | o....?o...', 6)), 5: hits(rep('X.....o...', 8)), 6: hits(rep('g.....g...', 8)), 7: hits(rep('o.....o...', 3) + ' | X.........'),
}
const rim = { 0: hits(rep('......x...', 4)), 3: hits(rep('......x...', 12)), 4: hits(rep('......x...', 12)) }
const snare = {
  3: hits(rep('...g.....? | ....g..g..', 6)), 4: hits(rep('.....g...? | ..?.....g.', 6)),
  5: hits('.g...g.g.g | X.g.....gx | .g...g.g.. | ..xgxgx.xg | .g...g.g.g | .g.....g.. | .g.g.g.g.g | ......X.X.'),
}
const toms = { 5: hits('X.x.x.X.x. | ..x.x...X. | X.xxx.X.xx | RRX...X... | X.x.x.X.x. | x.xRx.X.Rx | XxXxXxX.X. | RRRRRRX...') }
const crash = { 3: hits('X.........'), 4: hits('X.........'), 5: hits('X......... | ' + rep('..........', 6) + ' | ......X...'), 7: hits(rep('..........', 3) + ' | X.........') }

const PARTS = present([
  P('a1', 'Double bass', 'bass', 'phrase', SAMPLE('classical', 'concert-bass-pizz'), bass, on(...ALL),
    { octave: 1, gain: .32, attack: .004, decay: .5, sustain: .45, release: .18, clip: 1, lpf: 2400, hpf: 32, effects: { reverb: .08 }, mapping: FIXED, design: { role: 'bass' } }),
  P('a2', 'Kick', 'rhythm', 'pulse', SAMPLE('percussion', 'kick', 1, false), kick, on(...ALL),
    { ...DRUM, gain: .07, decay: .3, release: .1, clip: .8, lpf: 2400, hpf: 30, effects: { reverb: .1 } }),
  P('b1', 'Tenor sax', 'melody', 'phrase', SAMPLE('band', 'tenor-sax', 0), sax, on(1, 2, 3, 4, 5, 8, 9),
    { octave: 3, gain: .07, attack: .03, decay: .3, sustain: .8, release: .22, clip: 1, lpf: 5200, hpf: 110, effects: { reverb: .2, pan: -.1 }, mapping: FIXED,
      design: { role: 'lead', vibrato: 5, vibratoDepth: .08 } }),
  P('b2', 'Brushes', 'rhythm', 'pulse', SAMPLE('drums', 'brush', 0, false), brush, on(1, 2, 3, 4, 8),
    { ...DRUM, gain: .03, decay: .12, release: .06, clip: .5, lpf: 7000, hpf: 500, effects: { reverb: .12, pan: .15 } }),
  P('c1', 'Piano', 'harmony', 'phrase', SAMPLE('band', 'piano', 0), piano, on(...ALL),
    { octave: 3, gain: .05, attack: .002, decay: .6, sustain: .35, release: .3, clip: .95, lpf: 6500, hpf: 120, effects: { reverb: .18, pan: .2 }, mapping: FIXED }),
  P('c2', 'Ride', 'rhythm', 'pulse', SAMPLE('percussion', 'ride', 0, false), ride, on(0, 5, 6, 9),
    { ...DRUM, gain: .035, decay: .4, release: .2, clip: .7, lpf: 9000, hpf: 400, effects: { reverb: .14, pan: -.25 } }),
  P('d1', 'Vibraphone', 'response', 'phrase', SAMPLE('keys', 'celesta'), vibes, on(2, 3, 4, 6, 8, 9),
    { octave: 4, gain: .05, attack: .003, decay: 1, sustain: .3, release: .6, clip: 1, lpf: 4200, hpf: 150, effects: { reverb: .24, pan: .3 }, mapping: FIXED,
      design: { lfoTarget: 'gain', lfoRate: 5.2, lfoUnit: 'hz', lfoDepth: .22, lfoShape: 'sine' } }),
  P('d2', 'Hi-hat', 'rhythm', 'pulse', SAMPLE('percussion', 'hat', 1, false), hat, on(...ALL),
    { ...DRUM, gain: .03, decay: .06, release: .04, clip: .5, lpf: 8000, hpf: 2000, effects: { reverb: .08, pan: .3 } }),
  P('e1', 'Muted trumpet', 'response', 'phrase', SAMPLE('classical', 'orchestra-trumpet'), trumpet, on(5, 8, 9),
    { octave: 4, gain: .04, attack: .03, decay: .3, sustain: .75, release: .25, clip: 1, lpf: 3200, hpf: 650, effects: { reverb: .22, pan: .35 }, mapping: FIXED }),
  P('e2', 'Rim click', 'rhythm', 'pulse', SAMPLE('drums', 'wood-rim', 0, false), rim, on(0, 5, 6),
    { ...DRUM, gain: .035, decay: .08, release: .04, clip: .4, lpf: 7000, hpf: 400, effects: { reverb: .14, pan: -.1 } }),
  P('f1', 'Piano left hand', 'bass', 'phrase', SAMPLE('band', 'piano', 0), left, on(...ALL),
    { octave: 2, gain: .045, attack: .002, decay: .6, sustain: .35, release: .3, clip: .95, lpf: 3500, hpf: 60, effects: { reverb: .16, pan: .1 }, mapping: FIXED }),
  P('f2', 'Crash', 'rhythm', 'pulse', SAMPLE('percussion', 'crash', 0, false), crash, on(5, 6, 7, 9),
    { ...DRUM, gain: .03, decay: .8, release: .4, clip: 1, lpf: 9000, hpf: 400, effects: { reverb: .18, pan: .25 } }),
  P('g1', 'Flute', 'melody', 'phrase', SAMPLE('classical', 'orchestra-flute'), flute, on(3, 8),
    { octave: 4, gain: .045, attack: .04, decay: .3, sustain: .8, release: .25, clip: 1, lpf: 7500, hpf: 250, effects: { reverb: .24, pan: -.3 }, mapping: FIXED,
      design: { vibrato: 5.4, vibratoDepth: .1 } }),
  P('g2', 'Toms', 'rhythm', 'pulse', SAMPLE('percussion', 'tom', 1, false), toms, on(7),
    { ...DRUM, gain: .07, decay: .35, release: .18, clip: .8, lpf: 5000, hpf: 50, effects: { reverb: .22 } }),
  P('h1', 'Jazz guitar', 'harmony', 'phrase', SAMPLE('guitars', 'clean', 0), guitar, on(6),
    { octave: 3, gain: .05, attack: .002, decay: .4, sustain: .3, release: .15, clip: .9, lpf: 2400, hpf: 120, effects: { reverb: .16, pan: -.35 }, mapping: FIXED }),
  P('h2', 'Snare', 'rhythm', 'pulse', SAMPLE('percussion', 'snare', 1, false), snare, on(5, 6, 7),
    { ...DRUM, gain: .045, decay: .16, release: .08, clip: .6, lpf: 7000, hpf: 180, effects: { reverb: .18 } }),
], FORM)

const SECTION_PARAMS = {
  b1: { 5: { gain: .08, reverbRange: { first: .2, second: .26 } } },
  d1: { 6: { gain: .065, reverbRange: { first: .24, second: .3 } } },
}
for (const part of PARTS) part.params = SECTION_PARAMS[part.slot]

build({
  id: 'oakland-1959', kitName: 'Cool jazz', profileName: 'Cool jazz · Oakland 1959',
  bpm: 160, meter: '5/4', root: 'E', scale: 'Chromatic', form: FORM, parts: PARTS, grid: 240,
  reactions: reactions('oakland-1959', { lift: 2, contrast: 2, lament: 4, calm: 0, finale: 7, climax: 5, solo: 3 }),
  reference: 'Cool jazz da Costa Oeste no fim dos anos 1950 (o Dave Brubeck Quartet do outro lado da baía, Stan Getz, o vibrafone de Cal Tjader, os fundos de Birth of the Cool); composição original modal em 5/4: vamp de piano 3+2 com mão esquerda pesada, ostinato do contrabaixo, sax tenor macio, vassourinhas nos temas e ride nos solos, solo de vibrafone sobre a ponte em walking, solo de bateria sobre o vamp e flauta com trompete surdinado no último tema.',
  url: 'https://www.britannica.com/art/cool-jazz',
}).catch(error => { console.error(error); process.exit(1) })
