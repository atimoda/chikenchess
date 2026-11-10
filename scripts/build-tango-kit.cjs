// Builds the official Tango kit of Buenos Aires 1913 (data/music/kits/buenos-aires-1940.json)
// and its style profile. Original tango of the Guardia Vieja, in the spirit of the pieces
// that crossed to Paris in the 1911–1914 tangomania (El Choclo, La Morocha): habanera
// and 3-3-2 rhythms, marcato in four, arrastres into the downbeat, a lyrical violin
// second theme, a trio for flute and cello and a closing variación for bandoneón.
// It uses what a text profile cannot express: per-note accents, chances, ratchets,
// slides, pan, vibrato and note sound (release, reverb, delay, drive), per-section sound
// parameters, Kit Harmony per bar, fills, sound design and the kit's own reactions.
// Run: node scripts/build-tango-kit.cjs   (Creative's Save DB may later replace the file.)
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('../tests/helpers/music.cjs')
const { cities } = loadTs('lib/cities-data.ts')
const { createStyledCityKit, CITY_STYLE_REVISIONS } = loadTs('lib/music/styled-kits.ts')
const { styleProfileSchema, validateOfficialKit } = loadTs('lib/admin/validation.ts')
const { kitReactionsSchema } = loadTs('lib/music/reactions.ts')

const ID = 'buenos-aires-1940'
const root = path.resolve(__dirname, '..')
const STEPS = [0, 2, 3, 5, 7, 8, 11] // D harmonic minor
const semitone = degree => 12 * Math.floor(degree / 7) + STEPS[((degree % 7) + 7) % 7]
const round = value => Math.round(value * 1e4) / 1e4

// Form: Intro, Tema A, Tema B, Arrastre, Trío, Variación, Tema A (reprise), Final.
// Each section's harmony gives the chord root of each bar (scale degrees of D minor).
const FORM = [
  { label: 'Intro', bars: 8, bank: 0, harmony: [0, 0, 4, 4, 0, 0, 4, 4] },
  { label: 'Verse', bars: 16, bank: 1, harmony: [0, 0, 4, 4, 4, 4, 0, 0] },
  { label: 'Chorus', bars: 16, bank: 2, harmony: [5, 5, 3, 3, 4, 4, 0, 0] },
  { label: 'Break', bars: 8, bank: 3, harmony: [0, 3, 4, 0, 0, 3, 4, 4] },
  { label: 'Bridge', bars: 16, bank: 4, harmony: [3, 3, 0, 0, 1, 1, 4, 4] },
  { label: 'Solo', bars: 16, bank: 5, harmony: [0, 0, 4, 4, 4, 4, 0, 0] },
  { label: 'Verse', bars: 16, bank: 1, harmony: [0, 0, 4, 4, 4, 4, 0, 0] },
  { label: 'Outro', bars: 4, bank: 6, harmony: [0, 0, 4, 0] },
]
const BANK_HARMONY = [0, 1, 2, 3, 4, 5, 7].map(index => FORM[index].harmony)
const FILL = 7

// ---------- note helpers ----------
const note = (start, duration, degree, extra = {}) => ({ start: round(start), duration: round(duration), degree, velocity: 1, ...extra })
/** Notes written on absolute scale degrees become chord-relative: Kit Harmony adds the bar's root back. */
const relative = (notes, harmony) => notes.map(n => ({ ...n, degree: n.degree - harmony[Math.floor(n.start + 1e-6) % harmony.length] }))
/** Bars of [start, duration, degree] inside the bar → absolute notes. */
const bars = rows => rows.flatMap((row, bar) => (row ?? []).map(([start, duration, degree, extra]) => note(bar + start, duration, degree, extra)))
/** Accent by position: downbeats strong, beats medium, the rest lighter. */
function accent(notes, { strong = 1, beat = .84, off = .7, jitter = .05 } = {}) {
  notes.forEach((n, i) => {
    const inBar = n.start - Math.floor(n.start)
    const base = Math.abs(inBar) < 1e-6 || Math.abs(inBar - .5) < 1e-6 ? strong : Math.abs(inBar * 4 - Math.round(inBar * 4)) < 1e-6 ? beat : off
    n.velocity = round(Math.max(.2, Math.min(1, base - jitter * ((i * 7) % 3) / 2)))
  })
  return notes
}
const staccato = (notes, gate) => notes.map(n => ({ ...n, duration: round(Math.max(1 / 64, n.duration * gate)) }))
/** Legato line: each note slides from the previous one when the leap is at least `min` semitones. */
function portamento(notes, min, seconds, every = 1) {
  let count = 0
  notes.forEach((n, i) => {
    const previous = notes[i - 1]
    if (!previous) return
    const leap = semitone(n.degree) - semitone(previous.degree)
    if (Math.abs(leap) >= min && Math.abs(leap) <= 9 && ++count % every === 0) Object.assign(n, { slide: leap, slideSeconds: seconds })
  })
  return notes
}
const roll = (length, notes) => ({ bars: length, notes: notes.filter(n => n.start < length - 1e-9).map(n => ({ ...n, duration: round(Math.min(n.duration, length - n.start)) })) })
const empty = (length = 1) => ({ bars: length, notes: [] })
/** One chord-relative figure repeated over every bar. */
const everyBar = (count, figure) => Array.from({ length: count }, (_, bar) => figure(bar).map(([start, duration, degree, extra]) => note(bar + start, duration, degree, extra))).flat()
/** Chord tones relative to the bar's root: the dominant (root 4) gets its seventh. */
const voicing = (rootDegree, low = [2, 4, 7]) => low.length === 2 ? (rootDegree === 4 ? [2, 6] : low) : rootDegree === 4 ? [2, 4, 6] : rootDegree === 1 ? [2, 4, 5] : low
const PAIR = [2, 4] // light marcato: third and fifth (third and seventh on the dominant)
const chordAt = (harmony, bar, start, duration, low, extra) => voicing(harmony[bar % harmony.length], low).map(degree => [start, duration, degree, extra])

// ---------- rhythms (fractions of a 4/4 bar) ----------
const MARCATO = [0, .25, .5, .75]
const HABANERA = [0, .1875, .25, .375, .5, .6875, .75, .875]
const SINCOPA = [0, .375, .5, .875]
const TRES_TRES_DOS = [0, .375, .75]

// ---------- Tema A (bandoneón), absolute degrees over [i i V V V V i i] ----------
const TEMA_A = bars([
  [[0, .1875, 4], [.1875, .0625, 4], [.25, .125, 7], [.375, .125, 6], [.5, .1875, 7], [.6875, .0625, 8], [.75, .25, 9]],
  [[0, .25, 8], [.25, .125, 7], [.375, .125, 6], [.5, .375, 7], [.875, .125, 4]],
  [[0, .1875, 6], [.1875, .0625, 6], [.25, .125, 8], [.375, .125, 7], [.5, .1875, 8], [.6875, .0625, 9], [.75, .25, 10]],
  [[0, .25, 9], [.25, .125, 8], [.375, .125, 7], [.5, .5, 6]],
  [[0, .125, 4], [.125, .125, 6], [.25, .125, 8], [.375, .125, 10], [.5, .25, 11], [.75, .125, 10], [.875, .125, 9]],
  [[0, .25, 8], [.25, .25, 6], [.5, .125, 8], [.625, .125, 7], [.75, .25, 6]],
  [[0, .1875, 7], [.1875, .0625, 7], [.25, .125, 9], [.375, .125, 8], [.5, .25, 7], [.75, .25, 4]],
  [[0, .5, 7, { delay: .32 }], [.5, .125, 4], [.625, .125, 5], [.75, .125, 6], [.875, .125, 7]],
  [[0, .1875, 9], [.1875, .0625, 9], [.25, .125, 11], [.375, .125, 10], [.5, .1875, 9], [.6875, .0625, 8], [.75, .25, 7]],
  [[0, .25, 8], [.25, .125, 7], [.375, .125, 6], [.5, .375, 7], [.875, .125, 6]],
  [[0, .1875, 8], [.1875, .0625, 8], [.25, .125, 10], [.375, .125, 9], [.5, .25, 8], [.75, .25, 6]],
  [[0, .125, 4], [.125, .125, 5], [.25, .125, 6], [.375, .125, 8], [.5, .5, 10]],
  [[0, .375, 11], [.375, .125, 10], [.5, .125, 9], [.625, .125, 8], [.75, .25, 6]],
  [[0, .125, 8], [.125, .125, 6], [.25, .125, 4], [.375, .125, 6], [.5, .5, 8]],
  [[0, .25, 9], [.25, .25, 7], [.5, .125, 8], [.625, .125, 6], [.75, .25, 7]],
  [[0, .25, 7, { delay: .3, reverb: .3 }], [.25, .125, 4], [.375, .125, 0]],
])

// ---------- Tema B (violin), absolute degrees over [VI VI iv iv V V i i] ----------
const TEMA_B = bars([
  [[0, .375, 9], [.375, .125, 10], [.5, .5, 12]],
  [[0, .5, 11], [.5, .25, 10], [.75, .25, 9]],
  [[0, .375, 10], [.375, .125, 9], [.5, .5, 7]],
  [[0, .5, 8], [.5, .25, 7], [.75, .25, 5]],
  [[0, .375, 6], [.375, .125, 7], [.5, .5, 8]],
  [[0, .25, 10], [.25, .25, 9], [.5, .5, 8]],
  [[0, .75, 7], [.75, .25, 9]],
  [[0, .875, 11, { release: .7, reverb: .4 }]],
  [[0, .375, 12], [.375, .125, 11], [.5, .5, 10]],
  [[0, .25, 9], [.25, .25, 10], [.5, .5, 12]],
  [[0, .375, 14], [.375, .125, 12], [.5, .5, 10]],
  [[0, .5, 9], [.5, .5, 8]],
  [[0, .375, 13], [.375, .125, 11], [.5, .5, 8]],
  [[0, .25, 10], [.25, .25, 11], [.5, .25, 13], [.75, .25, 11]],
  [[0, 1, 14, { vibrato: true, release: .9, reverb: .5 }]],
  [[0, .5, 7, { release: .6 }]],
])

// ---------- Trío (cello, flute answers), absolute degrees over [iv iv i i ii° ii° V V] ----------
const TRIO_CELLO = bars([
  [[0, .5, 3], [.5, .25, 5], [.75, .25, 7]],
  [[0, .75, 8], [.75, .25, 7]],
  [[0, .375, 7], [.375, .125, 5], [.5, .5, 4]],
  [[0, .75, 2], [.75, .25, 4]],
  [[0, .5, 5], [.5, .25, 4], [.75, .25, 3]],
  [[0, .75, 1], [.75, .25, 3]],
  [[0, .375, 6], [.375, .125, 4], [.5, .5, 1]],
  [[0, .75, -1, { release: .6 }]],
  [[0, .5, 5], [.5, .25, 7], [.75, .25, 8]],
  [[0, .75, 10], [.75, .25, 8]],
  [[0, .375, 9], [.375, .125, 7], [.5, .5, 4]],
  [[0, .75, 7], [.75, .25, 9]],
  [[0, .5, 8], [.5, .25, 7], [.75, .25, 5]],
  [[0, .75, 4], [.75, .25, 5]],
  [[0, .375, 6], [.375, .125, 8], [.5, .5, 4]],
  [[0, 1, 4, { vibrato: true, release: .8, reverb: .4 }]],
])
// Flute fills the cello's held notes with a turn, every other bar.
const TRIO_FLUTE = bars(Array.from({ length: 16 }, (_, bar) => bar % 2 === 0 ? [] : [
  [.5, .125, 11 + (bar % 4 === 1 ? 0 : 1), { chance: .9 }], [.625, .0625, 12], [.6875, .0625, 11], [.75, .25, 10, { delay: .3 }],
]))

// ---------- Variación (bandoneón 16ths), absolute over [i i V V V V i i] ----------
const variacionBar = (bar, chord) => {
  const tones = chord === 4 ? [4, 6, 8, 10] : [0, 2, 4, 7]
  const up = bar % 2 === 0
  return Array.from({ length: 16 }, (_, i) => {
    const step = up ? i : 15 - i
    const degree = tones[step % 4] + 7 * Math.floor(step / 8) + (step % 8 >= 4 ? 7 : 0) - 7
    return [i / 16, 1 / 16, degree + 7, i % 4 === 0 ? {} : { velocity: .7 }]
  })
}
const VARIACION = bars(Array.from({ length: 16 }, (_, bar) => {
  const chord = FORM[5].harmony[bar % 8]
  if (bar === 7 || bar === 15) return [[0, .25, 7], [.25, .25, 4], [.5, .25, 7], ...(bar === 15 ? [] : [[.75, .25, 11, { ratchet: 3 }]])]
  return variacionBar(bar, chord)
}))

// ---------- Final: "chan-chan" (V on the and-of-four, i on the downbeat) ----------
const FINAL_LEAD = bars([
  [[0, .1875, 7], [.1875, .0625, 7], [.25, .125, 9], [.375, .125, 8], [.5, .25, 7], [.75, .25, 4]],
  [[0, .25, 6], [.25, .25, 8], [.5, .25, 10], [.75, .25, 11]],
  [[0, .125, 13], [.125, .125, 11], [.25, .125, 10], [.375, .125, 8], [.5, .125, 6], [.625, .125, 4], [.875, .125, 6, { velocity: 1 }]],
  [[0, .125, 7, { release: .9, reverb: .55 }]],
])

// ---------- parts ----------
const H = index => BANK_HARMONY[index]
const fit = (notes, length) => roll(length, notes)
const LENGTHS = [8, 16, 16, 8, 16, 16, 4]

/** Builds the 8 banks of a part; null banks become empty bars the arrangement never plays. */
function banks(map) {
  const rolls = []
  for (let index = 0; index <= FILL; index++) {
    if (map[index]) rolls[index] = map[index]
  }
  const last = rolls.length
  return Array.from({ length: last }, (_, index) => rolls[index] ?? empty(index === FILL ? 1 : LENGTHS[index]))
}

// a1 Contrabajo: marcato in four, arrastre pickups, 3-3-2 in the Arrastre, walking trio.
const bass = banks({
  0: fit(accent([...everyBar(8, bar => MARCATO.map(at => [at, .14, at === .25 || at === .75 ? -3 : 0])), note(7.875, .125, -1, { slide: 2, slideSeconds: .09, drive: 1.5 })], { beat: .66, off: .6 }), 8),
  1: fit(accent(everyBar(16, bar => [[0, .2, 0], [.5, .2, bar % 2 ? 4 : -3], ...(bar % 4 === 3 ? [[.875, .0625, -1, { slide: 2, slideSeconds: .07 }], [.9375, .0625, -1]] : [])])), 16),
  2: fit(accent(everyBar(16, bar => [[0, .3, 0], [.375, .12, 0], [.5, .2, 4], [.875, .1, bar % 2 ? 2 : 4]]), { beat: .8, off: .72 }), 16),
  3: fit(accent(everyBar(8, bar => TRES_TRES_DOS.map((at, i) => [at, .16, [0, 0, 4][i], i === 0 ? { drive: 1.2 } : {}])), { strong: 1, beat: .92, off: .92 }), 8),
  4: fit(accent(everyBar(16, bar => [[0, .22, 0], [.25, .22, 2], [.5, .22, 4], [.75, .22, bar % 2 ? 5 : 3]]), { beat: .7, off: .7 }), 16),
  5: fit(accent(everyBar(16, bar => MARCATO.map(at => [at, .15, at === .5 ? 4 : 0]))), 16),
  6: fit([note(0, .2, 0), note(.5, .2, 4), note(1, .2, 0), note(1.5, .2, -3), note(2, .15, 0), note(2.875, .1, 0, { velocity: 1 }), note(3, .1, 0, { release: .8, reverb: .5, velocity: 1 })], 4),
  7: fit([note(0, .125, 0), note(.25, .125, 2), note(.5, .125, 4), note(.75, .125, 6, { slide: 1, slideSeconds: .06 })], 1),
})

// a2 Marcato del piano: staccato chords in four (Intro, A, Arrastre, Variación, Final).
const pianoMarcato = banks({
  0: fit(accent(everyBar(8, bar => MARCATO.flatMap(at => chordAt(H(0), bar, at, .09, PAIR))), { beat: .62, off: .6 }), 8),
  1: fit(accent(everyBar(16, bar => MARCATO.flatMap(at => chordAt(H(1), bar, at, .09, PAIR)))), 16),
  3: fit(accent(everyBar(8, bar => TRES_TRES_DOS.flatMap(at => chordAt(H(3), bar, at, .08, PAIR)))), 8),
  5: fit(accent(everyBar(16, bar => MARCATO.flatMap(at => chordAt(H(5), bar, at, .08, PAIR)))), 16),
  6: fit([...chordAt(H(6), 0, 0, .1).map(([s, d, g]) => note(s, d, g)), ...chordAt(H(6), 2, 0, .1).map(([s, d, g]) => note(2 + s, d, g)),
    ...chordAt(H(6), 2, .875, .1).map(([s, d, g]) => note(2 + s, d, g)), ...chordAt(H(6), 3, 0, .12).map(([s, d, g]) => note(3 + s, d, g, { reverb: .5, release: .7 }))], 4),
})

// b1 Bandoneón: the themes, its counter-answers in B and the Variación.
const bandoneonIntro = bars([
  [[0, .125, 4], [.125, .125, 4], [.25, .125, 4], [.375, .125, 4], [.5, .25, 7], [.75, .25, 6]],
  [[0, .5, 4], [.5, .125, 2], [.625, .125, 3], [.75, .125, 4], [.875, .125, 5]],
  [[0, .125, 6], [.125, .125, 6], [.25, .125, 6], [.375, .125, 6], [.5, .25, 8], [.75, .25, 7]],
  [[0, .75, 6, { vibrato: true }]],
  [[0, .125, 7], [.125, .125, 7], [.25, .125, 7], [.375, .125, 7], [.5, .25, 9], [.75, .25, 8]],
  [[0, .5, 7], [.5, .125, 6], [.625, .125, 7], [.75, .125, 8], [.875, .125, 9]],
  [[0, .25, 10], [.25, .25, 8], [.5, .25, 6], [.75, .25, 4]],
  [[0, .5, 6, { delay: .3 }]],
])
const answersB = bars(Array.from({ length: 16 }, (_, bar) => bar % 2 === 0 ? [] : [[.5, .125, 4], [.625, .125, 5], [.75, .125, 6], [.875, .125, 7]]))
const bandoneon = banks({
  0: fit(accent(staccato(relative(bandoneonIntro, H(0)), .85)), 8),
  1: fit(accent(staccato(relative(TEMA_A, H(1)), .82)), 16),
  2: fit(accent(answersB.map(n => ({ ...n, degree: n.degree - 7 + 7 }))), 16),
  3: fit(accent(everyBar(8, bar => TRES_TRES_DOS.map((at, i) => [at, .12, i === 2 ? 4 : 7, { ratchet: i === 2 && bar % 2 ? 2 : undefined }]).map(([s, d, g, e]) => [s, d, g, e.ratchet ? e : {}]))), 8),
  4: fit(accent(everyBar(16, bar => bar % 4 === 3 ? [[.5, .125, 4], [.625, .125, 2], [.75, .25, 0]] : [])), 16),
  5: fit(accent(relative(VARIACION, H(5)), { beat: .86, off: .72 }), 16),
  6: fit(accent(relative(FINAL_LEAD, H(6))), 4),
  7: fit([note(0, .0625, 0), note(.0625, .0625, 1), note(.125, .0625, 2), note(.1875, .0625, 3), note(.25, .0625, 4), note(.3125, .0625, 5), note(.375, .0625, 6), note(.4375, .0625, 7),
    note(.5, .125, 7, { velocity: 1 }), note(.75, .125, 4, { velocity: .8 }), note(.875, .125, 6, { velocity: .9 })], 1),
})

// b2 Bandoneón en marcato (second fueye): chords, síncopa in B, 3-3-2 in the Arrastre.
const marcato = banks({
  0: fit(accent(everyBar(8, bar => MARCATO.flatMap(at => chordAt(H(0), bar, at, .1, PAIR)))), 8),
  1: fit(accent(everyBar(16, bar => (bar % 4 === 3 ? SINCOPA : MARCATO).flatMap(at => chordAt(H(1), bar, at, .1, PAIR)))), 16),
  2: fit(accent(everyBar(16, bar => SINCOPA.flatMap(at => chordAt(H(2), bar, at, at === .375 ? .2 : .1, PAIR))), { off: .85 }), 16),
  3: fit(accent(everyBar(8, bar => TRES_TRES_DOS.flatMap(at => chordAt(H(3), bar, at, .1, PAIR))), { off: .95 }), 8),
  4: fit(accent(everyBar(16, bar => [0, .5].flatMap(at => chordAt(H(4), bar, at, .4, PAIR)))), 16),
  5: fit(accent(everyBar(16, bar => MARCATO.flatMap(at => chordAt(H(5), bar, at, .1, PAIR)))), 16),
  6: fit([0, 2].flatMap(bar => chordAt(H(6), bar, 0, .2, PAIR).map(([s, d, g]) => note(bar + s, d, g))).concat(chordAt(H(6), 2, .875, .1, PAIR).map(([s, d, g]) => note(2 + s, d, g)), chordAt(H(6), 3, 0, .15, PAIR).map(([s, d, g]) => note(3 + s, d, g, { reverb: .5, release: .8 }))), 4),
})

// c1 Violín: sustained counter-line in A, the lyrical Tema B, the trio's counterpoint, A an octave up in the reprise.
const violinPad = (length, harmony) => everyBar(length, bar => [[0, 1, bar % 2 ? 4 : 2, { release: .5 }]])
const violin = banks({
  1: fit(accent(violinPad(16, H(1)), { strong: .75 }), 16),
  2: fit(portamento(accent(relative(TEMA_B, H(2)), { beat: .85, off: .78 }), 3, .09), 16),
  4: fit(accent(everyBar(16, bar => bar % 2 ? [[0, .5, 4], [.5, .5, 7]] : [[0, 1, 2, { vibrato: true }]]), { strong: .7, beat: .65 }), 16),
  5: fit(accent(everyBar(16, bar => [[0, .5, 7, { release: .4 }], [.5, .5, 9]]), { strong: .7, beat: .65 }), 16),
  6: fit(accent([note(0, 1, 7), note(1, 1, 9), note(2, .75, 6, { vibrato: true }), note(3, .125, 7, { release: .9, reverb: .55 })], { strong: .8 }), 4),
})

// c2 Pizzicato: offbeat chord tones; their pan answers left/right.
const pizz = banks({
  0: fit(accent(everyBar(8, bar => [[.125, .1, 4, { pan: .3 }], [.375, .1, 2, { pan: .7 }], [.625, .1, 4, { pan: .3 }], [.875, .1, 7, { pan: .7, chance: .8 }]]), { off: .7 }), 8),
  2: fit(accent(everyBar(16, bar => [[.25, .1, 0, { pan: .25 }], [.5, .1, 2, { pan: .5 }], [.75, .1, 4, { pan: .75 }]])), 16),
  3: fit(accent(everyBar(8, bar => [[.125, .08, 7, { pan: .2 }], [.5, .08, 4, { pan: .8 }], [.625, .08, 7, { pan: .2 }]])), 8),
  4: fit(accent(everyBar(16, bar => [[0, .1, 0], [.25, .1, 4, { chance: .85 }], [.5, .1, 2], [.75, .1, 4, { chance: .85 }]])), 16),
  6: fit([note(0, .1, 0), note(.25, .1, 2), note(.5, .1, 4), note(.75, .1, 7), note(2.875, .1, 4, { velocity: 1 }), note(3, .1, 7, { velocity: 1, reverb: .5 })], 4),
})

// d1 Piano: bass octaves and síncopa chords, runs into the sections (the fill).
const pianoBar = (harmony, bar, rhythm) => [[0, .2, -7], ...rhythm.flatMap(at => chordAt(harmony, bar, at, .12))]
const piano = banks({
  0: fit(accent(everyBar(8, bar => pianoBar(H(0), bar, [.25, .75]))), 8),
  1: fit(accent(everyBar(16, bar => pianoBar(H(1), bar, bar % 2 ? [.375, .75] : [.25, .5, .75]))), 16),
  2: fit(accent(everyBar(16, bar => [[0, .5, -7], ...chordAt(H(2), bar, .375, .3, [2, 4, 7]), ...chordAt(H(2), bar, .875, .1, [2, 4, 7])]), { off: .8 }), 16),
  3: fit(accent(everyBar(8, bar => [[0, .15, -7, { drive: .8 }], ...chordAt(H(3), bar, .375, .1), ...chordAt(H(3), bar, .75, .1)]), { off: .95 }), 8),
  4: fit(accent(everyBar(16, bar => [[0, .4, -7], [.5, .1, -3], ...chordAt(H(4), bar, .25, .2, [2, 4, 7]).map(([s, d, g]) => [s + .01 * g, d, g])]), { beat: .6, off: .6 }), 16),
  5: fit(accent(everyBar(16, bar => pianoBar(H(5), bar, [.25, .5, .75]))), 16),
  6: fit([note(0, .2, -7), ...chordAt(H(6), 0, .25, .1).map(([s, d, g]) => note(s, d, g)), note(2, .5, -7), ...[0, 1, 2, 3, 4, 5].map(i => note(2.5 + i * .0625, .0625, 7 + i * 2 - (i > 2 ? 1 : 0), { velocity: .75 })),
    note(3, .15, -7, { reverb: .5, release: .9 }), ...chordAt(H(6), 3, 0, .15).map(([s, d, g]) => note(3 + s, d, g, { reverb: .5, release: .9 }))], 4),
  7: fit([0, 1, 2, 3, 4, 5, 6, 7].map(i => note(.5 + i * .0625, .0625, i, { velocity: round(.6 + i * .05) })), 1),
})

// d2 Guitarra criolla: strummed habanera in A, 3-3-2 rasguido in the Arrastre.
const strum = (harmony, bar, at, duration, chance) => voicing(harmony[bar % harmony.length], [0, 2, 4]).map((degree, i) => [at + i * .008, duration, degree, chance ? { chance } : {}])
const guitar = banks({
  1: fit(accent(everyBar(16, bar => [0, .375, .5, .875].flatMap(at => strum(H(1), bar, at, .1, at === .875 ? .8 : undefined))), { off: .65 }), 16),
  2: fit(accent(everyBar(16, bar => [0, .5].flatMap(at => strum(H(2), bar, at, .4)))), 16),
  3: fit(accent(everyBar(8, bar => TRES_TRES_DOS.flatMap(at => strum(H(3), bar, at, .1))), { off: .95 }), 8),
  4: fit(accent(everyBar(16, bar => [0, .25, .5, .75].flatMap(at => strum(H(4), bar, at, .2).slice(at ? 1 : 0, at ? 4 : 1)))), 16),
})

// e1 Flauta: answers in the trio, trills and echoes over the Variación and the reprise.
const flute = banks({
  4: fit(relative(accent(TRIO_FLUTE, { strong: .8, beat: .75, off: .7 }), H(4)), 16),
  5: fit(relative(bars(Array.from({ length: 16 }, (_, bar) => bar % 4 === 3 ? [[.5, .25, 14, { ratchet: 4, delay: .25 }], [.75, .25, 13]] : [])), H(5)), 16),
  1: fit(relative(bars(Array.from({ length: 16 }, (_, bar) => bar % 2 ? [[.5, .125, 14, { chance: .75 }], [.625, .125, 13], [.75, .25, 11, { delay: .3 }]] : [])), H(1)), 16),
  6: fit(relative(bars([[], [[.5, .5, 13]], [[0, .75, 13, { vibrato: true }]], [[0, .125, 14, { reverb: .6, release: .9 }]]]), H(6)), 4),
})

// e2 Golpe en la caja: the hand on the bandoneón case, on two and four with ghost strokes.
const golpe = banks({
  0: fit(everyBar(8, bar => [[.25, .05, 0], [.75, .05, 0]]).map(n => ({ ...n, velocity: .7 })), 8),
  1: fit(everyBar(16, bar => [[.25, .05, 0], [.75, .05, 0], [.875, .05, 0, { chance: .5, velocity: .45 }]]).map(n => ({ velocity: .85, ...n })), 16),
  2: fit(everyBar(16, bar => [[.375, .05, 0], [.875, .05, 0]]).map(n => ({ ...n, velocity: .6 })), 16),
  3: fit(everyBar(8, bar => TRES_TRES_DOS.map(at => [at, .05, 0])).map(n => ({ ...n, velocity: 1 })), 8),
  5: fit(everyBar(16, bar => [[.25, .05, 0], [.75, .05, 0], [.6875, .05, 0, { chance: .6, velocity: .5 }]]).map(n => ({ velocity: .9, ...n })), 16),
  6: fit([note(2.875, .05, 0), note(3, .05, 0)], 4),
})

// f1 Violonchelo: counter-melody in B, the trio's melody, low pedal in the Variación.
const cello = banks({
  2: fit(accent(everyBar(16, bar => bar % 2 ? [[.5, .5, 4]] : [[0, .75, 2], [.75, .25, 1]]), { strong: .78, beat: .7, off: .7 }), 16),
  4: fit(portamento(accent(relative(TRIO_CELLO, H(4)), { beat: .85, off: .78 }), 3, .1, 2), 16),
  5: fit(accent(everyBar(16, bar => [[0, 1, 0, { release: .5 }]]), { strong: .7 }), 16),
  6: fit([note(0, 2, 0, { velocity: .8 }), note(2, .75, 0), note(3, .125, 0, { release: 1, reverb: .5 })], 4),
})

// f2 Chicharra: the bow scraped behind the bridge, on two and four (unpitched).
const chicharra = banks({
  3: fit(everyBar(8, bar => [[.25, .12, 0, { ratchet: 3 }], [.75, .12, 0, { ratchet: bar % 2 ? 2 : 3 }]]).map(n => ({ ...n, velocity: .9 })), 8),
  5: fit(everyBar(16, bar => [[.25, .1, 0, { ratchet: 2 }], [.75, .1, 0, { ratchet: 2, chance: .8 }]]).map(n => ({ ...n, velocity: .75 })), 16),
  1: fit(everyBar(16, bar => bar % 4 === 2 ? [[.25, .1, 0, { ratchet: 3 }], [.75, .1, 0, { ratchet: 3 }]] : []).map(n => ({ ...n, velocity: .7 })), 16),
})

// g1 Viola: held chord tones, ducked by the bass (the marcato breathes).
const viola = banks({
  1: fit(everyBar(16, bar => [[0, 1, 2]]).map(n => ({ ...n, velocity: .8 })), 16),
  2: fit(everyBar(16, bar => [[0, .5, 4], [.5, .5, 2]]).map(n => ({ ...n, velocity: .8 })), 16),
  4: fit(everyBar(16, bar => [[0, 1, bar % 2 ? 4 : 2]]).map(n => ({ ...n, velocity: .75 })), 16),
  6: fit([note(0, 2, 2, { velocity: .7 }), note(2, 1, 2, { velocity: .7 }), note(3, .125, 4, { reverb: .55, release: .9 })], 4),
})

// g2 Arrastre: the low bandoneón drags into the downbeat, sliding up with grit.
const arrastre = banks({
  0: fit(everyBar(8, bar => bar % 2 ? [[.75, .25, 0, { slide: 3, slideSeconds: .18, drive: 1.2, velocity: .75 }]] : []), 8),
  3: fit(everyBar(8, bar => [[0, .25, 0, { slide: 2, slideSeconds: .1, drive: 2, velocity: 1 }], [.75, .25, 4, { slide: 4, slideSeconds: .2, drive: 1.6, velocity: .8 }]]), 8),
  5: fit(everyBar(16, bar => bar % 2 ? [[.75, .25, 0, { slide: 3, slideSeconds: .15, drive: 1.5, velocity: .85 }]] : []), 16),
  1: fit(everyBar(16, bar => bar % 4 === 3 ? [[.75, .25, 0, { slide: 2, slideSeconds: .15, drive: 1, velocity: .8 }]] : []), 16),
  6: fit([note(2.5, .375, 0, { slide: 5, slideSeconds: .35, drive: 2, velocity: .9 })], 4),
})

// h1 Clarinete: the 1913 terceto colour, answering Tema A and doubling the trio an octave up.
const clarinet = banks({
  1: fit(accent(relative(bars(Array.from({ length: 16 }, (_, bar) => bar % 4 === 1 ? [[.5, .125, 11], [.625, .125, 10], [.75, .25, 9]] : bar % 4 === 3 ? [[.5, .125, 10], [.625, .125, 9], [.75, .25, 8, { delay: .25 }]] : [])), H(1)), { off: .7 }), 16),
  4: fit(relative(TRIO_CELLO.map(n => ({ ...n, degree: n.degree + 7, velocity: .55, chance: n.start % 2 < 1 ? 1 : .7 })), H(4)), 16),
})

// h2 Tacos: the dancers' heels on the boards, in the Arrastre, the Variación and the final.
const tacos = banks({
  3: fit(everyBar(8, bar => [[0, .05, 0], [.375, .05, 0, { chance: .7 }], [.75, .05, 0]]).map(n => ({ velocity: .8, ...n })), 8),
  5: fit(everyBar(16, bar => bar % 2 ? [[.5, .05, 0], [.625, .05, 0, { chance: .5 }]] : [[0, .05, 0, { chance: .8 }]]).map(n => ({ velocity: .7, ...n })), 16),
  6: fit([note(2.875, .05, 0), note(3, .05, 0, { reverb: .4 })], 4),
})

// ---------- part settings ----------
const src = (bank, asset, variant = 0, pitched = true) => ({ kind: 'sample', bank, asset, variant, pitched })
const present = sections => ({ variations: sections, active: sections.map(value => value !== null) })
const NONE = null
const PARTS = [
  { slot: 'a1', name: 'Contrabajo', role: 'bass', behavior: 'phrase', source: src('classical', 'concert-bass-pizz'), rolls: bass, octave: 2, gain: .24, attack: .004, decay: .3, sustain: .5, release: .16, clip: 1, lpf: 5200, hpf: 30,
    sections: [0, 1, 2, 3, 4, 5, 1, 6], fills: { 0: 7, 4: 7 }, effects: { reverb: .06 }, reverbRange: { first: .04, second: .1, frequency: 'section' },
    design: { role: 'bass', filterEnv: .8, filterAttack: .005, filterDecay: .12 } },
  { slot: 'a2', name: 'Marcato del piano', role: 'harmony', behavior: 'phrase', source: src('band', 'piano', 1), rolls: pianoMarcato, octave: 3, gain: .09, attack: .002, decay: .2, sustain: .3, release: .12, clip: .9, lpf: 6000, hpf: 140,
    sections: [0, 1, NONE, 3, NONE, 5, 1, 6], effects: { reverb: .1, pan: -.15 }, design: { role: 'pad' } },
  { slot: 'b1', name: 'Bandoneón', role: 'melody', behavior: 'phrase', source: src('keys', 'accordion'), rolls: bandoneon, octave: 4, gain: .13, attack: .012, decay: .25, sustain: .7, release: .14, clip: .95, lpf: 6500, hpf: 120,
    sections: [0, 1, 2, 3, 4, 5, 1, 6], fills: { 0: 7, 2: 7, 4: 7 }, effects: { reverb: .16, delay: .06 },
    lpfRange: { first: 4200, second: 7600, frequency: 'note' }, reverbRange: { first: .12, second: .2, frequency: 'section' },
    design: { role: 'lead', resonance: 3, filterEnv: 1.4, filterAttack: .01, filterDecay: .2, lfoTarget: 'gain', lfoRate: 5.5, lfoUnit: 'hz', lfoDepth: .1, lfoShape: 'sine', delayTime: '3/16', delayFeedback: .28 } },
  { slot: 'b2', name: 'Bandoneón en marcato', role: 'harmony', behavior: 'phrase', source: src('brasil', 'sanfona'), rolls: marcato, octave: 3, gain: .075, attack: .006, decay: .18, sustain: .5, release: .1, clip: .85, lpf: 4800, hpf: 150,
    sections: [0, 1, 2, 3, 4, 5, 1, 6], effects: { reverb: .1, pan: .2 }, design: { role: 'pad', filterEnv: 1, filterAttack: .004, filterDecay: .1, resonance: 2 } },
  { slot: 'c1', name: 'Violín', role: 'melody', behavior: 'phrase', source: src('classical', 'violin-sustain'), rolls: violin, octave: 4, gain: .1, attack: .05, decay: .4, sustain: .85, release: .35, clip: 1, lpf: 9000, hpf: 180,
    sections: [NONE, 1, 2, NONE, 4, 5, 1, 6], effects: { reverb: .26, pan: -.2 }, reverbRange: { first: .22, second: .3, frequency: 'section' },
    design: { role: 'lead', vibrato: 5.6, vibratoDepth: .2 } },
  { slot: 'c2', name: 'Pizzicato', role: 'response', behavior: 'phrase', source: src('classical', 'violin-pizzicato', 1), rolls: pizz, octave: 4, gain: .08, attack: .002, decay: .2, sustain: .2, release: .2, clip: 1, lpf: 8000, hpf: 200,
    sections: [0, NONE, 2, 3, 4, NONE, NONE, 6], effects: { reverb: .18, delay: .12 }, octaveRange: { first: 4, second: 5, frequency: 'note' },
    design: { lfoTarget: 'pan', lfoRate: 2, lfoUnit: 'bars', lfoDepth: .5, lfoShape: 'triangle', delayTime: '1/8', delayFeedback: .3 } },
  { slot: 'd1', name: 'Piano', role: 'harmony', behavior: 'phrase', source: src('classical', 'concert-piano'), rolls: piano, octave: 3, gain: .11, attack: .002, decay: .4, sustain: .4, release: .3, clip: 1, lpf: 8000, hpf: 40,
    sections: [0, 1, 2, 3, 4, 5, 1, 6], fills: { 1: 7, 6: 7 }, effects: { reverb: .14, pan: .1 } },
  { slot: 'd2', name: 'Guitarra criolla', role: 'harmony', behavior: 'phrase', source: src('guitars', 'nylon'), rolls: guitar, octave: 3, gain: .075, attack: .003, decay: .3, sustain: .4, release: .2, clip: .9, lpf: 6000, hpf: 90,
    sections: [NONE, 1, 2, 3, 4, NONE, 1, NONE], effects: { reverb: .12, pan: .35 }, extra: { playChance: .94 } },
  { slot: 'e1', name: 'Flauta', role: 'melody', behavior: 'phrase', source: src('classical', 'flute-sustain'), rolls: flute, octave: 4, gain: .075, attack: .03, decay: .3, sustain: .8, release: .25, clip: 1, lpf: 10000, hpf: 250,
    sections: [NONE, NONE, NONE, NONE, 4, 5, 1, 6], effects: { reverb: .24, pan: .25, delay: .1 },
    design: { role: 'lead', vibrato: 5, vibratoDepth: .14, delayTime: '1/8', delayFeedback: .32 } },
  { slot: 'e2', name: 'Golpe en la caja', role: 'rhythm', behavior: 'pulse', source: src('percussion', 'muted-conga', 0), rolls: golpe, octave: 2, gain: .07, attack: .001, decay: .12, sustain: 0, release: .06, clip: .5, lpf: 5000, hpf: 80,
    sections: [0, 1, 2, 3, NONE, 5, 1, 6], effects: { reverb: .05 }, design: { role: 'drums' } },
  { slot: 'f1', name: 'Violonchelo', role: 'melody', behavior: 'phrase', source: src('classical', 'cello-sustain'), rolls: cello, octave: 3, gain: .1, attack: .06, decay: .4, sustain: .85, release: .4, clip: 1, lpf: 6000, hpf: 60,
    sections: [NONE, NONE, 2, NONE, 4, 5, NONE, 6], effects: { reverb: .22, pan: .15 }, design: { vibrato: 5.2, vibratoDepth: .16 } },
  { slot: 'f2', name: 'Chicharra', role: 'rhythm', behavior: 'pulse', source: src('classical', 'violin-spiccato', 0, false), rolls: chicharra, octave: 4, gain: .045, attack: .002, decay: .1, sustain: 0, release: .05, clip: .6, lpf: 7000, hpf: 900,
    sections: [NONE, 1, NONE, 3, NONE, 5, 1, NONE], effects: { reverb: .04, pan: -.3 },     design: { role: 'drums', resonance: 6 } },
  { slot: 'g1', name: 'Viola', role: 'harmony', behavior: 'sustain', source: src('classical', 'viola-sustain'), rolls: viola, octave: 4, gain: .06, attack: .15, decay: .4, sustain: .8, release: .5, clip: 1, lpf: 5000, hpf: 150,
    sections: [NONE, 1, 2, NONE, 4, NONE, 1, 6], effects: { reverb: .3, pan: -.35 }, design: { role: 'pad', duckSource: 'a1', duckDepth: .45, duckRelease: .16 } },
  { slot: 'g2', name: 'Arrastre', role: 'texture', behavior: 'phrase', source: src('keys', 'accordion'), rolls: arrastre, octave: 3, gain: .07, attack: .02, decay: .2, sustain: .7, release: .1, clip: 1, lpf: 3000, hpf: 70,
    sections: [0, 1, NONE, 3, NONE, 5, 1, 6], effects: { reverb: .08 }, design: { role: 'fx', filterEnv: 2, filterAttack: .08, filterDecay: .2, resonance: 5 } },
  { slot: 'h1', name: 'Clarinete', role: 'response', behavior: 'phrase', source: src('classical', 'orchestra-clarinet'), rolls: clarinet, octave: 4, gain: .07, attack: .02, decay: .3, sustain: .8, release: .2, clip: 1, lpf: 8000, hpf: 180,
    sections: [NONE, 1, NONE, NONE, 4, NONE, 1, NONE], effects: { reverb: .2, pan: .4, delay: .08 }, design: { role: 'lead', vibrato: 4.8, vibratoDepth: .1 } },
  { slot: 'h2', name: 'Tacos', role: 'rhythm', behavior: 'pulse', source: src('drums', 'wood-rim', 0, false), rolls: tacos, octave: 2, gain: .05, attack: .001, decay: .08, sustain: 0, release: .05, clip: .4, lpf: 6000, hpf: 300,
    sections: [NONE, NONE, NONE, 3, NONE, 5, NONE, 6], effects: { reverb: .12, pan: .3 }, design: { role: 'drums' } },
]

// ---------- per-section sound (Section scope) ----------
// Intro sounds like a 1913 shellac record: narrow band, a little grit; the band opens at Tema A.
const RECORD = { hpf: 380, lpfRange: { first: 2600, second: 3400 }, reverbRange: { first: .02, second: .05 }, resonance: 4 }
const SECTION_PARAMS = {
  a1: { 0: { hpf: 160, lpfRange: { first: 2400, second: 2800 } }, 3: { driveRange: { first: 1, second: 2 }, resonance: 6 }, 4: { attack: .03, release: .35 }, 7: { release: .5 } },
  a2: { 0: RECORD, 3: { clip: .5 }, 7: { reverbRange: { first: .35, second: .45 } } },
  b1: { 0: RECORD, 2: { gain: .1, reverbRange: { first: .22, second: .3 } }, 5: { filterEnv: 2.6, resonance: 8, reverbRange: { first: .06, second: .1 }, lfoTarget: 'none', gain: .15 },
    7: { reverbRange: { first: .4, second: .5 } } },
  b2: { 0: RECORD, 2: { lpfRange: { first: 3000, second: 3600 }, gain: .06 }, 3: { clip: .45 } },
  c1: { 2: { reverbRange: { first: .34, second: .42 }, vibratoDepth: .32, gain: .12 }, 4: { gain: .07, lfoTarget: 'gain', lfoRate: 6, lfoUnit: 'hz', lfoDepth: .15 }, 5: { gain: .07 } },
  c2: { 3: { delay: .35 }, 4: { lfoRate: 1, lfoDepth: .8 } },
  d1: { 0: RECORD, 2: { reverbRange: { first: .25, second: .3 } }, 4: { lpfRange: { first: 3200, second: 3200 }, reverbRange: { first: .3, second: .35 } } },
  d2: { 3: { clip: .5, gain: .09 } },
  e1: { 5: { delay: .35 }, 6: { delay: .3 } },
  f1: { 4: { gain: .12, reverbRange: { first: .28, second: .34 }, vibratoDepth: .28 }, 5: { gain: .07, lpfRange: { first: 1800, second: 1800 } } },
  f2: { 3: { driveRange: { first: 2, second: 3.5 } }, 5: { playChance: .85 } },
  g1: { 4: { lfoTarget: 'lpf', lfoRate: 2, lfoUnit: 'bars', lfoDepth: .4, lfoShape: 'sine' } },
  g2: { 0: RECORD, 3: { driveRange: { first: 2, second: 3 }, resonance: 9 } },
  h1: { 4: { reverbRange: { first: .3, second: .36 } } },
}

// ---------- reactions ----------
const rule = (id, trigger, target, duration, quantize, actions, instruments) => ({ id: `tango-${id}`, trigger, enabled: true, quantize, target, duration, actions, ...(instruments ? { instruments } : {}) })
const action = (type, value = 0, extra = {}) => ({ type, value, ...extra })
const REACTIONS = kitReactionsSchema.parse({
  overrides: ['opening', 'middle', 'endgame', 'check', 'capture', 'queenCapture', 'firstCastle', 'quiet', 'tension', 'captureDrought', 'promotion', 'evalSwing', 'minimumBoth', 'mate'],
  rules: [
    // The game starts on the old record and the tango opens up into the middlegame.
    rule('opening', 'opening', 'both', 1, true, [action('hpf', 260), action('lpf', 4200, { rampBars: 4 }), action('gain', -4)]),
    rule('middle', 'middle', 'both', 1, true, [action('bpm', 2, { rampBars: 8 }), action('gain', 3)]),
    rule('endgame', 'endgame', 'both', 1, true, [action('bpm', 6, { rampBars: 8 }), action('variation', 5), action('gain', 5)], 'lead'),
    rule('endgame-band', 'endgame', 'both', 1, true, [action('bpm', 6, { rampBars: 8 }), action('drive', 1.2)], 'bass'),
    // A check drags the whole band into the arrastre.
    rule('check', 'check', 'actor', 1, false, [action('activate'), action('variation', 3), action('gain', 5)]),
    rule('capture', 'capture', 'actor', 1, false, [action('gain', 6), action('drive', 1)], 'drums'),
    // Losing a queen: the violin's lament, darker and wetter.
    rule('queen-capture', 'queenCapture', 'both', 2, true, [action('variation', 2), action('lpf', 2600, { rampBars: 2 }), action('reverb', .45)]),
    rule('first-castle', 'firstCastle', 'both', 4, true, [action('relative')]),
    rule('quiet', 'quiet', 'both', 2, true, [action('variation', 4), action('gain', -5, { rampBars: 2 }), action('lpf', 3200, { rampBars: 2 })]),
    rule('tension', 'tension', 'both', 1, true, [action('lpf', 1900, { rampBars: 8 }), action('resonance', 12), action('gain', -2, { rampBars: 4 })], 'lead'),
    rule('tension-bass', 'tension', 'both', 1, true, [action('drive', 1.8)], 'bass'),
    rule('capture-drought', 'captureDrought', 'both', 1, true, [action('reverb', .5), action('delay', .32), action('gain', -3, { rampBars: 4 })], 'lead'),
    rule('promotion', 'promotion', 'both', 2, true, [action('transpose', 5)]),
    rule('eval-swing', 'evalSwing', 'actor', 2, false, [action('variation', 3), action('gain', 6)]),
    rule('minimum-both', 'minimumBoth', 'both', 0, true, [action('bpm', 4, { rampBars: 8 }), action('variation', 5), action('gain', 8)]),
    // Checkmate plays the final chan-chan and lets it ring.
    rule('mate', 'mate', 'both', 0, true, [action('variation', 6), action('reverb', .55)]),
  ],
})

// ---------- profile (text form of the same music) ----------
function pattern(rollValue) {
  const res = 16, cells = Array.from({ length: Math.round(rollValue.bars * res) }, () => []), ends = new Set()
  for (const n of rollValue.notes) { const at = Math.min(cells.length - 1, Math.round(n.start * res)); cells[at].push(n.degree); ends.add(Math.round((n.start + n.duration) * res)) }
  return cells.map((degrees, i) => degrees.length ? [...new Set(degrees)].join(',') + '_' : ends.has(i) ? '0?0' : '.').join(' ')
}
const profile = {
  name: 'Tango · Buenos Aires 1913', bpm: 118, meter: '4/4', root: 'D', scale: 'Harmônica menor', harmony: 'kit', swing: 0,
  sections: FORM.map(section => section.bars * 4), sectionLabels: FORM.map(section => section.label), harmonicSequences: FORM.map(section => section.harmony),
  reactions: REACTIONS,
  reference: 'Tango da Guardia Vieja no ano da tangomania (Paris, 1911–1914), inspirado em El Choclo (Ángel Villoldo) e La Morocha; composição original: habanera, marcato em quatro, síncopa 3-3-2, arrastres, tema lírico de violino, trío de flauta e violoncelo, variación de bandoneón e o chan-chan final.',
  url: 'https://www.todotango.com/english/history/chronicle/379/From-La-morocha-to-El-Garron-Tango-conquers-Paris/',
  parts: PARTS.map(part => ({
    role: part.role, name: part.name, behavior: part.behavior, source: part.source,
    patterns: part.rolls.map(pattern), bars: part.rolls.map(r => r.bars), octave: part.octave, gain: part.gain, attack: part.attack, decay: part.decay, sustain: part.sustain,
    release: part.release, clip: part.clip, lpf: part.lpf, hpf: part.hpf,
    ...(part.lpfRange ? { lpfRange: part.lpfRange } : {}), ...(part.reverbRange ? { reverbRange: part.reverbRange } : {}), ...(part.driveRange ? { driveRange: part.driveRange } : {}),
    arrangement: { restart: true, active: part.sections.map(v => v !== null), variations: part.sections.map(v => v ?? 0), transpose: FORM.map(() => 0),
      ...(part.fills ? { fills: FORM.map((_, index) => part.fills[index] ?? null) } : {}) },
    effects: part.effects, ...(part.design ? { design: part.design } : {}),
  })),
}

async function main() {
  // Profile parts are ordered like the board's white slots: a1, a2, b1 … h2.
  const order = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e1', 'e2', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2']
  if (PARTS.map(part => part.slot).join() !== order.join()) throw new Error('Parts must follow the white slots')
  styleProfileSchema.parse(profile)
  fs.writeFileSync(path.join(root, 'data/music/profiles', `${ID}.json`), `${JSON.stringify(profile, null, 2)}\n`)
  const city = cities.find(c => c.id === ID)
  const kit = createStyledCityKit(city, profile)
  kit.name = 'Tango'
  for (const piece of kit.pieces) {
    const slot = piece.color === 'w' ? piece.origin : `${piece.origin[0]}${9 - Number(piece.origin[1])}`
    const part = PARTS.find(p => p.slot === slot)
    const instrument = kit.instruments[piece.id]
    instrument.pianoRolls = part.rolls.map(r => structuredClone(r))
    if (part.octaveRange) instrument.octaveRange = part.octaveRange
    Object.assign(instrument, part.extra)
    for (const [index, section] of kit.arrangement.sections.entries()) {
      const step = instrument.arrangement.sections[section.id]
      if (part.fills?.[index] !== undefined && step.variation !== null) step.fill = part.fills[index]
      else delete step.fill
      const params = SECTION_PARAMS[slot]?.[index]
      if (params && step.variation !== null) step.params = structuredClone(params)
    }
  }
  kit.reactions = structuredClone(REACTIONS)
  const official = validateOfficialKit(ID, kit, CITY_STYLE_REVISIONS[ID])
  const { saveOfficialKit } = await import(path.join(root, 'scripts/admin/official-kits.mjs'))
  const saved = await saveOfficialKit(root, ID, official)
  const notes = PARTS.reduce((sum, part) => sum + part.rolls.reduce((n, r) => n + r.notes.length, 0), 0)
  console.log(`Wrote ${saved.path} (${saved.revision}): ${FORM.length} sections, ${FORM.reduce((n, s) => n + s.bars, 0)} bars, ${notes} notes per team`)
}
main().catch(error => { console.error(error); process.exit(1) })
