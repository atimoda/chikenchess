// Builds the official Goa 1994 kit (data/music/kits/goa.json) from its style profile,
// then adds what a text profile cannot express: 303 slides, ratchets, accents,
// play chances, per-note pan and the kit's chess reactions.
// Run: node scripts/build-goa-kit.cjs   (Creative's Save DB may later replace the file.)
const path = require('node:path')
const { loadTs } = require('../tests/helpers/music.cjs')
const { cities } = loadTs('lib/cities-data.ts')
const { createStyledCityKit, CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
const { validateOfficialKit } = loadTs('lib/admin/validation.ts')
const { SCALE_INTERVALS } = loadTs('lib/music/scales.ts')

const root = path.resolve(__dirname, '..')
const kit = createStyledCityKit(cities.find(city => city.id === 'goa'))
const steps = SCALE_INTERVALS['Phrygian dominant']
const semitone = degree => 12 * Math.floor(degree / 7) + steps[((degree % 7) + 7) % 7]
const sixteenth = (roll, note) => Math.round(note.start * 16) % 16  // position inside its bar
const round = value => Math.round(value * 1e4) / 1e4

/** White slot of any piece: black pieces mirror their white counterpart. */
const slotOf = piece => piece.color === 'w' ? piece.origin : `${piece.origin[0]}${9 - Number(piece.origin[1])}`

// A 303 slide: the next note starts at the previous pitch and glides into place.
function acidSlides(roll, every) {
  let previous, count = 0
  for (const note of roll.notes) {
    const tied = previous && Math.abs(previous.start + 1 / 16 - note.start) < 1e-6 && previous.degree !== note.degree
    if (tied && ++count % every === 0) Object.assign(note, { slide: semitone(note.degree) - semitone(previous.degree), slideSeconds: .055 })
    note.velocity = tied ? .68 : 1
    previous = note
  }
}

const passes = {
  // Rolling bass: the first sixteenth after the kick leans in, the last one breathes.
  d2: roll => roll.notes.forEach(note => { note.velocity = [0, 1, .78, .86][sixteenth(roll, note) % 4] || .9 }),
  // Closed hats: accent on the last sixteenth of each beat, ghost the rest; ratchet the final fill.
  c2: (roll, index) => roll.notes.forEach((note, i) => {
    const position = sixteenth(roll, note) % 4
    note.velocity = position === 3 ? 1 : position === 1 ? .72 : .5
    if (position === 1 && index !== 2) note.chance = .85
    if (index === 5 && note.start >= roll.bars - .25) note.ratchet = 2
  }),
  // Clap roll into the peak: each hit doubles and the roll crescendos.
  b2: (roll, index) => {
    if (index !== 5) return
    roll.notes.filter(note => note.start >= roll.bars - .25).forEach((note, i, last) => Object.assign(note, { ratchet: 2, velocity: round(.55 + .45 * (i + 1) / last.length) }))
  },
  g1: roll => acidSlides(roll, 2),
  b1: roll => acidSlides(roll, 3),
  // Sitar meend: notes that land on a beat bend up from a semitone or two below.
  c1: roll => roll.notes.forEach((note, i) => {
    if (Math.abs(note.start * 4 - Math.round(note.start * 4)) < 1e-6 && i % 2 === 0) Object.assign(note, { slide: note.degree % 7 === 2 ? 2 : 1, slideSeconds: .11 })
  }),
  // Lead: legato portamento on stepwise motion and long notes held to the next attack.
  d1: (roll, index) => roll.notes.forEach((note, i, notes) => {
    const next = notes[i + 1], previous = notes[i - 1]
    if (index === 2 && next) note.duration = round(next.start - note.start)
    if (previous && Math.abs(previous.degree - note.degree) === 1 && i % 3 === 1) Object.assign(note, { slide: semitone(note.degree) - semitone(previous.degree), slideSeconds: .07 })
  }),
  // FM arpeggio: a three-against-four accent and a ping-pong pan.
  f1: roll => roll.notes.forEach((note, i) => Object.assign(note, { velocity: i % 3 === 0 ? 1 : .58, pan: i % 2 ? .72 : .28 })),
  // Zaps fall from an octave above and fly to alternating sides.
  h2: roll => roll.notes.forEach((note, i) => Object.assign(note, { slide: -12, slideSeconds: .14, pan: i % 2 ? .12 : .88 })),
  // Dayan improvises: off-beat strokes are optional, Pa and the octave ring brighter.
  g2: roll => roll.notes.forEach(note => {
    if (sixteenth(roll, note) % 4 !== 0) note.chance = .78
    note.velocity = note.degree === 0 ? .75 : 1
  }),
  a2: roll => roll.notes.forEach(note => { if (sixteenth(roll, note) % 4 !== 0) note.chance = .85 }),
  // The riser rides to the end of its loop, landing on the next downbeat.
  h1: roll => roll.notes.forEach(note => { note.duration = round(roll.bars - note.start) }),
}

for (const piece of kit.pieces) {
  const slot = slotOf(piece), pass = passes[slot]
  if (!pass) continue
  kit.instruments[piece.id].pianoRolls.forEach((roll, index) => pass(roll, index))
}

const rule = (id, trigger, target, duration, quantize, actions) => ({ id, trigger, enabled: true, quantize, target, duration, actions })
const action = (type, value = 0, extra = {}) => ({ type, value, ...extra })
// Goa reactions: the scale opens up as the game develops, captures drop, quiet play breaks down.
kit.reactions = {
  overrides: ['opening', 'middle', 'endgame', 'check', 'capture', 'quiet', 'queenCapture', 'noQueens', 'minimumBoth', 'freeze'],
  rules: [
    rule('goa-opening', 'opening', 'both', 1, true, [action('scale', 0, { scale: 'Phrygian' }), action('gain', -6)]),
    rule('goa-middle', 'middle', 'both', 1, true, [action('bpm', 2, { rampBars: 8 }), action('gain', 4)]),
    rule('goa-endgame', 'endgame', 'both', 1, true, [action('bpm', 4, { rampBars: 8 }), action('variation', 5), action('gain', 8)]),
    rule('goa-check', 'check', 'actor', 1, false, [action('activate'), action('variation', 3), action('gain', 6)]),
    rule('goa-capture', 'capture', 'actor', 1, false, [action('variation', 3), action('gain', 4)]),
    rule('goa-quiet', 'quiet', 'both', 2, true, [action('variation', 2), action('lpf', 1600), action('gain', -8)]),
    rule('goa-queen-capture', 'queenCapture', 'both', 2, true, [action('variation', 2), action('lpf', 1200)]),
    rule('goa-no-queens', 'noQueens', 'both', 0, true, [action('scale', 0, { scale: 'Phrygian' }), action('bpm', 2, { rampBars: 8 })]),
    rule('goa-minimum-both', 'minimumBoth', 'both', 0, true, [action('bpm', 3, { rampBars: 8 }), action('variation', 5), action('gain', 10)]),
    rule('goa-freeze', 'freeze', 'both', 2, true, [action('scale', 0, { scale: 'Phrygian' }), action('lpf', 900)]),
  ],
}

async function main() {
  const official = validateOfficialKit('goa', kit, CITY_STYLE_REVISIONS.goa)
  const { saveOfficialKit } = await import(path.join(root, 'scripts/admin/official-kits.mjs'))
  const saved = await saveOfficialKit(root, 'goa', official)
  console.log(`Wrote ${saved.path} (${saved.revision})`)
}
main().catch(error => { console.error(error); process.exit(1) })
