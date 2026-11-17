// Escalas dos instrumentos: what turns an instrument's aim into notes. Each scale is a class with the same face
// (noteFor / walk / degreeOf / pool), so the combat asks the held instrument's current scale and never cares which
// one it is. An instrument lists the scales it can use (ItemDef.scales); the quick switch (mouse wheel, Próximo /
// Anterior) goes through them before going to the next item (lib/pigchicken/inventory.ts, `scaleStep`).
//
//   Escala primária: the leque as always: only how high the aim points counts, inside the zone's chord or scale
//     (the conductor, lib/pigchicken/music.ts).
//   Ciclo de quintas and Tensão e resolução: a round chart around her shoulder, cut into 12 sectors (30° each, the
//     first one centred straight up, going clockwise) and two rings. The aim's direction picks the sector and its
//     reach (0 at her … 1 at the chart's edge: the mouse's distance, or how far the stick is pushed) picks the ring:
//     below RING_SPLIT the inner ring (half a stick), from it on the outer one (the stick all the way out). Each
//     region holds a fixed chord (not the zone's), and its notes are that chord's, or its own scale's.
//   Espiral: the zone's own scale (the conductor's key and scale) over the instrument's register, one piece of a
//     spiral per note: from the outer edge (the lowest note) inward, going clockwise from straight up, one turn per
//     octave, so the same degree lines up turn after turn. The aim (direction and reach) picks the nearest piece;
//     `spiralDescending` (an item's checkbox) turns it around (the highest note outside).
//   Campo harmônico: the zone's key as a wheel of 7 houses, one per degree (I ii iii IV V vi vii° in a major key),
//     each with its triad. The wheel turns with the key: the I sits where the key's tonic is on the circle of fifths
//     (C straight up, G 30° clockwise, D 60°…), so another zone asks for another angle. Only the direction counts.
//   Hangdrum: the top of a hang seen from above: the big low note in the middle (the ding, the zone's tonic) and one
//     or two rows of round notes around it (5 to 9 each), going up the zone's scale from the fifth in a zig-zag,
//     left and right, from the bottom to the top, like a real handpan. The aim's point (direction and reach) on a
//     note plays it clean; between the notes it is a slap (`isSlap`), a percussive hit that rings the nearest note.
//   Cordas soltas: a harp's open strings going out of her shoulder in every direction, one note each (16 to 48 of
//     them, 22 by default). The aim's direction picks the string (each owns an equal slice of the circle, the lowest
//     pointing down, going up clockwise) and its reach says where along the string it is: under the string's start
//     the note is flat (a semitone down), past its end sharp (a semitone up), in its middle a harmonic (an octave
//     up). One string per letter (C D E F G A B), the lowest always a C; the zone's key tunes each letter like a
//     harp's pedals (in G major the F strings sound F♯). How it is played (a pluck, the strings the aim crosses,
//     the slide along a string): lib/pigchicken/strings-play.ts.
//   Bateria: an acoustic kit's pieces as big round buttons around her, one per piece, where the kit's setup puts
//     them (lib/pigchicken/drum-kit.ts, which also says how they are played). No pitch follows the aim: a hit's
//     "note" is the piece's number on the General MIDI drum map.
// Angles are screen radians (0 = right, π/2 = down, -π/2 = up).
import { SCALES, chordOn, scaleNotes, type Conductor, type PitchSet, type Zone } from './music'
import { DRUM_PIECES, drumKit, drumPiece, padAt } from './drum-kit'

export type InstrumentScaleId = 'primary' | 'fifths' | 'tension' | 'spiral' | 'harmonic' | 'hang' | 'strings' | 'drums'
export const INSTRUMENT_SCALE_IDS: InstrumentScaleId[] = ['primary', 'fifths', 'tension', 'spiral', 'harmonic', 'hang', 'strings', 'drums']

export const SECTORS = 12
// reach below it: the inner ring ("a mira pela metade"); from it on: the outer ring ("a mira esticada inteira")
export const RING_SPLIT = 0.6
// the chart's empty middle (drawing only: the inner ring's notes start at her)
export const CHART_HOLE = 0.2

const TAU = Math.PI * 2
const SECTOR_SPAN = TAU / SECTORS
const pc = (m: number) => ((m % 12) + 12) % 12

// the sector an angle falls in: 0 is centred straight up, then clockwise on screen
export function sectorAt(angle: number) {
  const a = angle + Math.PI / 2 + SECTOR_SPAN / 2
  return Math.floor((((a % TAU) + TAU) % TAU) / SECTOR_SPAN) % SECTORS
}
// the sector's edges (radians, a0 < a1, clockwise)
export const sectorEdges = (k: number) => ({ a0: -Math.PI / 2 + (k - 0.5) * SECTOR_SPAN, a1: -Math.PI / 2 + (k + 0.5) * SECTOR_SPAN })
export const ringAt = (reach: number, split = RING_SPLIT) => (reach >= split ? 1 : 0)

// one region of a chart: a sector of a ring with its fixed chord
export type ScaleRegion = {
  sector: number
  ring: 0 | 1 // 0 inner, 1 outer
  root: number // pitch class of the chord's root (0 = C)
  chord: number[] // semitones above the root (the chord's notes)
  steps: number[] // the region's own scale, semitones above the root (notes for "Da escala")
  label: string // the chord in letters (cifra): C, Am, B°7, G7♭9…
  minor: boolean // a minor or diminished third (the degree's numeral in lower case)
  suffix: string // what follows the root's letter: 'm', '°7', '7♭9', 'ø7', '+7' or ''
  color: string
  kind: 'major' | 'minor' | 'tension' | 'resolution'
}

// what the combat asks: the notes for the aim, with the item's pitch set, octave and span (descending: the spiral
// turned around, the item's `spiralDescending`)
// hang: the Hangdrum's rows around the ding (1 or 2) and the notes in each (the item's hangRows / hangNotes / hangNotes2)
export type ToneQuery = { angle: number; reach: number; set: PitchSet; octave: number; span: number; descending?: boolean; hang?: HangShape }

// the notes in letters (cifra)
export const LETTERS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const NUMERALS = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII']
// a chord's degree in a key, in Roman numerals: lower case for minor and diminished, then the chord's own sign
// (C in C: I; Am: vi; B°7: vii°7; G7♭9: V7♭9)
export function romanOf(root: number, key: number, minor: boolean, suffix: string) {
  const n = NUMERALS[pc(root - key)]
  return (minor ? n.toLowerCase() : n) + (suffix === 'm' ? '' : suffix)
}

// Cordas soltas: how many strings, where a string starts and ends (fractions of the scale's radius, like the aim's
// reach) and how wide the harmonic's window in its middle is
export const STRINGS_MIN = 16, STRINGS_MAX = 48
export const STRINGS_DEFAULT = { strings: 22, stringStart: 0.25, stringEnd: 0.85, harmonicWidth: 0.08 }
// what the Escalas editor changes in a scale's shape (lib/pigchicken/scale-params.ts): where the round charts' inner ring
// ends (it decides the ring the aim plays), the empty middle of the charts and of the Campo harmônico (drawing only)
// and the Cordas soltas' strings
export type ScaleShape = { ringSplit: number; hole: number; strings: number; stringStart: number; stringEnd: number; harmonicWidth: number }

export abstract class InstrumentScale {
  abstract readonly id: InstrumentScaleId
  abstract readonly label: string
  shape: ScaleShape = { ringSplit: RING_SPLIT, hole: CHART_HOLE, ...STRINGS_DEFAULT }
  // the chart's regions (empty for the primary scale, which keeps the leque)
  regions(): ScaleRegion[] { return [] }
  regionAt(_angle: number, _reach: number): ScaleRegion | null { return null }
  // a region's degree over its chord: Roman numeral in the zone's key
  degreeLabel(r: ScaleRegion, music: Conductor) { return romanOf(r.root, music.zone.root, r.minor, r.suffix) }
  // the notes the aim goes through for this query, low to high
  abstract pool(music: Conductor, q: ToneQuery): number[]
  // the note the aim plays
  abstract noteFor(music: Conductor, q: ToneQuery): number
  // `n` steps away from `from` inside the chord (or the scale) the aim is on
  abstract walk(music: Conductor, from: number, n: number, set: PitchSet, angle: number, reach: number, q?: ToneQuery): number
  // the note's colour index (its degree)
  abstract degreeOf(music: Conductor, m: number, angle: number, reach: number): number
  // the aim falls between the notes: a percussive hit instead of the clean note (only the Hangdrum has gaps)
  isSlap(_music: Conductor, _q: ToneQuery): boolean { return false }
}

// Escala primária: the leque as it always was (the zone's chord or scale, by how high the aim points)
export class PrimaryScale extends InstrumentScale {
  readonly id = 'primary' as const
  readonly label = 'Escala primária'
  pool(music: Conductor, q: ToneQuery) { return music.aimPool(q.set, q.octave, q.span) }
  noteFor(music: Conductor, q: ToneQuery) { return music.noteFor(q.angle, q.set, q.octave, q.span) }
  walk(music: Conductor, from: number, n: number, set: PitchSet) { return music.walk(from, n, set) }
  degreeOf(music: Conductor, m: number) { return music.degreeOf(m) }
}

// notes with these pitch classes from `lo` to `hi`
function pcNotes(root: number, steps: number[], lo: number, hi: number) {
  const pcs = new Set(steps.map(s => pc(root + s)))
  const out: number[] = []
  for (let m = Math.ceil(lo); m <= hi; m++) if (pcs.has(pc(m))) out.push(m)
  return out
}

// a round chart: 12 sectors × 2 rings of fixed chords
export abstract class ChartScale extends InstrumentScale {
  private cache: ScaleRegion[] | null = null
  protected abstract build(): ScaleRegion[]
  regions() { return (this.cache ??= this.build()) }
  regionAt(angle: number, reach: number) {
    const k = sectorAt(angle), ring = ringAt(reach, this.shape.ringSplit)
    return this.regions().find(r => r.sector === k && r.ring === ring) ?? this.regions()[0]
  }
  private notesOf(r: ScaleRegion, set: PitchSet, lo: number, hi: number) {
    return set === 'chord' ? pcNotes(r.root, r.chord, lo, hi) : pcNotes(r.root, r.steps, lo, hi)
  }
  pool(_music: Conductor, q: ToneQuery) {
    const center = 60 + 12 * q.octave, span = Math.max(0.5, q.span)
    return this.notesOf(this.regionAt(q.angle, q.reach), q.set, center - 6 * span + 1, center + 6 * span)
  }
  // the region's chord root, in the instrument's register (the first one from half an octave under its centre)
  noteFor(_music: Conductor, q: ToneQuery) {
    const r = this.regionAt(q.angle, q.reach)
    const center = 60 + 12 * q.octave
    let m = center - 6 + pc(r.root - (center - 6))
    if (m > center + 6) m -= 12
    return m
  }
  walk(_music: Conductor, from: number, n: number, set: PitchSet, angle: number, reach: number) {
    const pool = this.notesOf(this.regionAt(angle, reach), set, from - 24, from + 36)
    let i = pool.findIndex(m => m >= from)
    if (i < 0) i = pool.length - 1
    return pool[Math.max(0, Math.min(pool.length - 1, i + n))] ?? from
  }
  // the colour follows the note's place in the region's chord (root, third, fifth, seventh…), else in its scale
  degreeOf(_music: Conductor, m: number, angle: number, reach: number) {
    const r = this.regionAt(angle, reach), iv = pc(m - r.root)
    const c = r.chord.map(pc).indexOf(iv)
    if (c >= 0) return c * 2
    const s = r.steps.indexOf(iv)
    return s >= 0 ? s : 0
  }
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const NAT_MINOR = [0, 2, 3, 5, 7, 8, 10]
const HARM_MINOR = [0, 2, 3, 5, 7, 8, 11]
const name = (root: number) => LETTERS[pc(root)]

// Ciclo de quintas: Dó on top and a fifth more each sector clockwise (Sol, Ré, Lá…); the outer ring the major chord,
// the inner ring its relative minor (Lám under Dó, Mim under Sol…), like the reference chart
export class FifthsScale extends ChartScale {
  readonly id = 'fifths' as const
  readonly label = 'Ciclo de quintas'
  protected build() {
    const out: ScaleRegion[] = []
    for (let k = 0; k < SECTORS; k++) {
      const major = pc(k * 7), minor = pc(major + 9)
      out.push({ sector: k, ring: 1, root: major, chord: [0, 4, 7], steps: MAJOR, label: name(major), minor: false, suffix: '', color: '#5e9e3c', kind: 'major' })
      out.push({ sector: k, ring: 0, root: minor, chord: [0, 3, 7], steps: NAT_MINOR, label: `${name(minor)}m`, minor: true, suffix: 'm', color: '#9cc77f', kind: 'minor' })
    }
    return out
  }
}

// Tensão e resolução: the middle of the chart (inner ring) holds diminished and dissonant chords; the circle of
// balls around it (outer ring) the chord each one resolves to, in the same sector. The resolutions go round the
// fifths (Dó on top), majors and minors in turn; the tensions take turns: the leading tone's diminished seventh,
// the dominant seventh with a flat ninth, the half-diminished seventh on the leading tone and the augmented dominant
const TENSIONS: { up: number; chord: number[]; steps: number[]; suffix: string; minor: boolean }[] = [
  { up: 11, chord: [0, 3, 6, 9], steps: [0, 2, 3, 5, 6, 8, 9, 11], suffix: '°7', minor: true }, // vii°7 (whole-half diminished)
  { up: 7, chord: [0, 4, 7, 10, 13], steps: [0, 1, 3, 4, 6, 7, 9, 10], suffix: '7♭9', minor: false }, // V7♭9 (half-whole diminished)
  { up: 11, chord: [0, 3, 6, 10], steps: [0, 1, 3, 5, 6, 8, 10], suffix: 'ø7', minor: true }, // viiø7 (locrian)
  { up: 7, chord: [0, 4, 8, 10], steps: [0, 2, 4, 6, 8, 10], suffix: '+7', minor: false }, // V+7 (whole tone)
]
const BALL_COLORS = ['#e05a47', '#3f7fc2', '#e3a33a', '#4f9a6a', '#8a5bb5', '#d77a2f', '#2f9bb0', '#c4485f', '#6c8f2f', '#b5833e', '#4b63b0', '#a8506d']
export class TensionScale extends ChartScale {
  readonly id = 'tension' as const
  readonly label = 'Tensão e resolução'
  protected build() {
    const out: ScaleRegion[] = []
    for (let k = 0; k < SECTORS; k++) {
      const target = pc(k * 7), minor = k % 2 === 1
      const t = TENSIONS[k % TENSIONS.length], root = pc(target + t.up)
      out.push({ sector: k, ring: 1, root: target, chord: minor ? [0, 3, 7] : [0, 4, 7], steps: minor ? HARM_MINOR : MAJOR, label: `${name(target)}${minor ? 'm' : ''}`, minor, suffix: minor ? 'm' : '', color: BALL_COLORS[k], kind: 'resolution' })
      out.push({ sector: k, ring: 0, root, chord: t.chord, steps: t.steps, label: `${name(root)}${t.suffix}`, minor: t.minor, suffix: t.suffix, color: '#b8a77a', kind: 'tension' })
    }
    return out
  }
}

// Espiral: the zone's scale laid along a spiral, one piece per note (see the top of the file)
// the spiral's empty middle and where its outer edge starts, in chart radii (the aim's reach)
export const SPIRAL_HOLE = 0.16
export type SpiralPiece = { midi: number; u0: number; u1: number; letter: string; degree: number }
export type SpiralLayout = { turns: number; pieces: SpiralPiece[] }
// the distance between two turns (chart radii): the outer turn's band ends at the chart's edge
export const spiralGap = (turns: number) => (1 - SPIRAL_HOLE) / (turns + 0.5)
// the spiral's radius (0..1 of the chart) at u (0 outer edge … 1 the middle)
export const spiralRadius = (u: number, turns: number) => { const g = spiralGap(turns); return 1 - g / 2 - g * turns * u }
// the screen angle at u: straight up at u = 0, clockwise, `turns` times round up to u = 1
export const spiralAngle = (u: number, turns: number) => -Math.PI / 2 + u * TAU * turns
// the point of the spiral nearest to the aim (direction, reach): its u. Where the spiral passes the aim's direction
// once per turn, the turn whose radius is closest to the reach wins
export function spiralAt(angle: number, reach: number, turns: number) {
  const phi = ((((angle + Math.PI / 2) % TAU) + TAU) % TAU) / TAU
  let best = 0, bestD = Infinity
  for (let k = 0; k <= Math.ceil(turns); k++) {
    const u = Math.min(1, (phi + k) / turns)
    const d = Math.abs(spiralRadius(u, turns) - Math.max(0, Math.min(1, reach)))
    if (d < bestD) { bestD = d; best = u }
    if ((phi + k) / turns >= 1) break
  }
  return best
}
export class SpiralScale extends InstrumentScale {
  readonly id = 'spiral' as const
  readonly label = 'Espiral'
  // the zone's scale over the register, low to high
  pool(music: Conductor, q: ToneQuery) {
    const z = music.zone, center = 60 + 12 * q.octave, span = Math.max(0.5, q.span)
    return scaleNotes(z.root, z.scale, center - 6 * span + 1, center + 6 * span)
  }
  // the pieces from the outer edge inward: low to high (or high to low, descending), one turn per octave
  layout(music: Conductor, q: Pick<ToneQuery, 'octave' | 'span' | 'descending'>): SpiralLayout {
    const notes = this.pool(music, { angle: 0, reach: 1, set: 'scale', ...q })
    if (q.descending) notes.reverse()
    const n = Math.max(1, notes.length), perTurn = SCALES[music.zone.scale].steps.length
    const turns = Math.max(1, n / Math.max(1, perTurn))
    return {
      turns,
      pieces: notes.map((m, i) => ({ midi: m, u0: i / n, u1: (i + 1) / n, letter: LETTERS[pc(m)], degree: music.degreeOf(m) + 1 })),
    }
  }
  // the piece the aim is on
  pieceAt(lay: SpiralLayout, angle: number, reach: number) {
    if (!lay.pieces.length) return -1
    return Math.max(0, Math.min(lay.pieces.length - 1, Math.floor(spiralAt(angle, reach, lay.turns) * lay.pieces.length)))
  }
  noteFor(music: Conductor, q: ToneQuery) {
    const lay = this.layout(music, q), i = this.pieceAt(lay, q.angle, q.reach)
    return i >= 0 ? lay.pieces[i].midi : music.noteFor(q.angle, q.set, q.octave, q.span)
  }
  // arpeggios and phrases walk inside the zone's chord or scale, as on the leque
  walk(music: Conductor, from: number, n: number, set: PitchSet) { return music.walk(from, n, set) }
  degreeOf(music: Conductor, m: number) { return music.degreeOf(m) }
}

// Campo harmônico: the wheel of the zone's key (see the top of the file)
export const HOUSES = 7
const HOUSE_SPAN = TAU / HOUSES
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
export type FieldHouse = {
  degree: number // 0 = I
  root: number // pitch class of the chord's root
  chord: number[] // its notes with the seventh (MIDI, as the conductor's chords)
  label: string // the triad in letters (cifra): C, Dm, B°, C+
  numeral: string // its degree: I, ii, vii°
  quality: 'major' | 'minor' | 'other' // other: diminished or augmented
  a0: number; a1: number // its edges (screen radians, clockwise)
}
// how far the wheel is turned for a key: its tonic's place on the circle of fifths (C up, then 30° a fifth)
export const fieldTurn = (root: number) => pc(pc(root) * 7) * SECTOR_SPAN
export function fieldHouses(zone: Zone): FieldHouse[] {
  const turn = fieldTurn(zone.root)
  return ROMAN.map((n, d) => {
    const chord = chordOn(zone, d, true), third = pc(chord[1] - chord[0]), fifth = pc(chord[2] - chord[0])
    const sign = fifth === 6 ? '°' : fifth === 8 ? '+' : ''
    const root = pc(chord[0]), mid = -Math.PI / 2 + turn + d * HOUSE_SPAN
    return {
      degree: d, root, chord, a0: mid - HOUSE_SPAN / 2, a1: mid + HOUSE_SPAN / 2,
      label: `${LETTERS[root]}${sign || (third === 3 ? 'm' : '')}`,
      numeral: `${third === 3 ? n.toLowerCase() : n}${sign}`,
      quality: sign ? 'other' : third === 3 ? 'minor' : 'major',
    }
  })
}
// the house an angle falls in, for a turn of the wheel
export function houseAt(angle: number, turn: number) {
  const a = angle + Math.PI / 2 - turn + HOUSE_SPAN / 2
  return Math.floor((((a % TAU) + TAU) % TAU) / HOUSE_SPAN) % HOUSES
}
export class HarmonicFieldScale extends InstrumentScale {
  readonly id = 'harmonic' as const
  readonly label = 'Campo harmônico'
  house(music: Conductor, angle: number) {
    return fieldHouses(music.zone)[houseAt(angle, fieldTurn(music.zone.root))]
  }
  // "Da escala da zona": the key's own scale (its chord scale), the same 7 notes in every house
  private notesOf(music: Conductor, h: FieldHouse, set: PitchSet, lo: number, hi: number) {
    const z = music.zone
    return set === 'chord' ? pcNotes(h.root, h.chord.map(m => m - h.chord[0]), lo, hi) : pcNotes(z.root, SCALES[z.chordScale].steps, lo, hi)
  }
  pool(music: Conductor, q: ToneQuery) {
    const center = 60 + 12 * q.octave, span = Math.max(0.5, q.span)
    return this.notesOf(music, this.house(music, q.angle), q.set, center - 6 * span + 1, center + 6 * span)
  }
  // the house's chord root in the instrument's register, as on the round charts
  noteFor(music: Conductor, q: ToneQuery) {
    const h = this.house(music, q.angle), center = 60 + 12 * q.octave
    let m = center - 6 + pc(h.root - (center - 6))
    if (m > center + 6) m -= 12
    return m
  }
  walk(music: Conductor, from: number, n: number, set: PitchSet, angle: number) {
    const pool = this.notesOf(music, this.house(music, angle), set, from - 24, from + 36)
    let i = pool.findIndex(m => m >= from)
    if (i < 0) i = pool.length - 1
    return pool[Math.max(0, Math.min(pool.length - 1, i + n))] ?? from
  }
  // the colour: the note's place in the house's chord, else its degree in the key
  degreeOf(music: Conductor, m: number, angle: number) {
    const h = this.house(music, angle), c = h.chord.map(n => pc(n)).indexOf(pc(m))
    if (c >= 0) return c * 2
    const s = SCALES[music.zone.chordScale].steps.indexOf(pc(m - music.zone.root))
    return s >= 0 ? s : 0
  }
}

// Hangdrum: the hang seen from above (see the top of the file). Units: the chart's radius is 1, like the aim's reach
export type HangShape = { rows: number; notes: number; notes2: number }
export const HANG_DEFAULT: HangShape = { rows: 1, notes: 8, notes2: 7 }
export const HANG_ROWS_MAX = 2, HANG_NOTES_MIN = 5, HANG_NOTES_MAX = 9
export type HangField = { midi: number; x: number; y: number; r: number; row: number; letter: string; degree: number }
export type HangLayout = { fields: HangField[]; ring: number; edge: number } // fields[0] is the ding; ring: the outer row's radius; edge: its outer edge
const clampInt = (v: number, lo: number, hi: number, d: number) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d)
export function cleanHang(h: Partial<HangShape> | undefined): HangShape {
  return {
    rows: clampInt(h?.rows ?? HANG_DEFAULT.rows, 1, HANG_ROWS_MAX, HANG_DEFAULT.rows),
    notes: clampInt(h?.notes ?? HANG_DEFAULT.notes, HANG_NOTES_MIN, HANG_NOTES_MAX, HANG_DEFAULT.notes),
    notes2: clampInt(h?.notes2 ?? HANG_DEFAULT.notes2, HANG_NOTES_MIN, HANG_NOTES_MAX, HANG_DEFAULT.notes2),
  }
}
// where each slot of a row sits for its place in the zig-zag: 0 at the bottom, then right, left, right… up to the top
export function hangZigzag(n: number) {
  const order: number[] = [0]
  for (let k = 1; order.length < n; k++) { order.push(k); if (order.length < n && n - k !== k) order.push(n - k) }
  return order
}
// the rows' radii and their notes' size: one row in the middle of the space, two rows one inside the other
const HANG_ROWS = [
  { ding: 0.25, rows: [{ R: 0.64, cap: 0.2 }] },
  { ding: 0.2, rows: [{ R: 0.47, cap: 0.135 }, { R: 0.8, cap: 0.15 }] },
]
export class HangScale extends InstrumentScale {
  readonly id = 'hang' as const
  readonly label = 'Hangdrum'
  // the ding: the zone's tonic low in the item's register (from 14 semitones under its centre: D3 for octave 0);
  // the rows: the zone's scale from the fifth above it, one note after another through the zig-zag, row after row
  layout(music: Conductor, q: Pick<ToneQuery, 'octave' | 'hang'>): HangLayout {
    const sh = cleanHang(q.hang), z = music.zone, geo = HANG_ROWS[sh.rows - 1]
    const center = 60 + 12 * q.octave
    const ding = center - 14 + pc(z.root - (center - 14))
    const counts = [sh.notes, sh.notes2].slice(0, sh.rows)
    const notes = scaleNotes(z.root, z.scale, ding + 7, ding + 72)
    const field = (midi: number, x: number, y: number, r: number, row: number): HangField => ({ midi, x, y, r, row, letter: LETTERS[pc(midi)], degree: music.degreeOf(midi) + 1 })
    const fields = [field(ding, 0, 0, geo.ding, 0)]
    let next = 0
    counts.forEach((n, row) => {
      const { R, cap } = geo.rows[row], r = Math.min(cap, R * Math.sin(Math.PI / n) * 0.78)
      // the outer row turns half a slot, its notes between the inner ones
      const start = Math.PI / 2 + (row ? Math.PI / n : 0)
      hangZigzag(n).forEach(slot => {
        const a = start + (slot * TAU) / n
        fields.push(field(notes[Math.min(notes.length - 1, next++)] ?? ding + 12, Math.cos(a) * R, Math.sin(a) * R, r, row + 1))
      })
    })
    const last = geo.rows[sh.rows - 1], lastR = fields[fields.length - 1].r
    return { fields, ring: last.R, edge: last.R + lastR }
  }
  // the aim's point on the hang: past the outer row only the direction counts (a stick or the keys, stretched all
  // the way, still choose between a note and a gap); the field under it (index) or, between them, the nearest one
  touch(lay: HangLayout, angle: number, reach: number): { index: number; slap: boolean } {
    const rr = Math.max(0, reach > lay.edge ? lay.ring : reach)
    const x = Math.cos(angle) * rr, y = Math.sin(angle) * rr
    let best = 0, bestD = Infinity
    for (let i = 0; i < lay.fields.length; i++) {
      const f = lay.fields[i], d = Math.hypot(x - f.x, y - f.y) - f.r
      if (d <= 0) return { index: i, slap: false }
      if (d < bestD) { bestD = d; best = i }
    }
    return { index: best, slap: true }
  }
  pool(music: Conductor, q: ToneQuery) { return this.layout(music, q).fields.map(f => f.midi).sort((a, b) => a - b) }
  noteFor(music: Conductor, q: ToneQuery) {
    const lay = this.layout(music, q)
    return lay.fields[this.touch(lay, q.angle, q.reach).index].midi
  }
  isSlap(music: Conductor, q: ToneQuery) { return this.touch(this.layout(music, q), q.angle, q.reach).slap }
  // arpeggios and phrases walk over the hang's own notes, low to high (a real hang has only these)
  walk(music: Conductor, from: number, n: number, set: PitchSet, _angle: number, _reach: number, q?: ToneQuery) {
    if (!q) return music.walk(from, n, set)
    const pool = this.pool(music, q)
    let i = pool.findIndex(m => m >= from)
    if (i < 0) i = pool.length - 1
    return pool[Math.max(0, Math.min(pool.length - 1, i + n))] ?? from
  }
  degreeOf(music: Conductor, m: number) { return music.degreeOf(m) }
}

// Cordas soltas: a harp's open strings around her shoulder (see the top of the file)
const NATURALS = [0, 2, 4, 5, 7, 9, 11] // C D E F G A B
const LETTER_OF_PC = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6] // the letter LETTERS spells each pitch class with
export const STRING_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
// the harp's pedals: how the zone's key (its 7-note scale, "Acordes de") tunes each letter, in semitones over the
// natural note. One letter per degree, from the tonic's own letter up
export function stringTuning(zone: Pick<Zone, 'root' | 'chordScale'>): number[] {
  const own = SCALES[zone.chordScale]?.steps, steps = own?.length === 7 ? own : SCALES.major.steps
  const root = pc(zone.root), first = LETTER_OF_PC[root], acc = [0, 0, 0, 0, 0, 0, 0]
  steps.forEach((s, k) => { const L = (first + k) % 7; let d = pc(root + s - NATURALS[L]); if (d > 6) d -= 12; acc[L] = d })
  return acc
}
// a string: its letter (0 = C … 6 = B), its note, where it points (the middle of its slice) and its name (F♯)
export type HarpString = { index: number; letter: number; midi: number; angle: number; name: string; degree: number }
// where the aim is on the strings: which one, how far along the radius (the aim's reach) and what that place plays
export type StringZone = 'flat' | 'string' | 'harmonic' | 'sharp'
export type StringTouch = { index: number; r: number; zone: StringZone }
// semitones a string's place adds to its note: flat under its start, sharp past its end, an octave in its middle
export const stringShift = (zone: StringZone) => (zone === 'flat' ? -1 : zone === 'sharp' ? 1 : zone === 'harmonic' ? 12 : 0)
export class StringsScale extends InstrumentScale {
  readonly id = 'strings' as const
  readonly label = 'Cordas soltas'
  get count() { return clampInt(this.shape.strings, STRINGS_MIN, STRINGS_MAX, STRINGS_DEFAULT.strings) }
  // a string's slice: the lowest starts straight down and they go up clockwise, so the seam is at the ground
  angleOf(i: number) { return Math.PI / 2 + ((i + 0.5) * TAU) / this.count }
  stringAt(angle: number) {
    const n = this.count, a = angle - Math.PI / 2
    return Math.min(n - 1, Math.floor(((((a % TAU) + TAU) % TAU) / TAU) * n))
  }
  // the strings, low to high: one per letter from a C, three octaves and a C by default, around the item's octave
  layout(music: Conductor, q: Pick<ToneQuery, 'octave'>): HarpString[] {
    const n = this.count, acc = stringTuning(music.zone), low = 60 + 12 * q.octave - 12 * Math.floor((n - 1) / 14)
    return Array.from({ length: n }, (_, i) => {
      const L = i % 7, midi = low + 12 * Math.floor(i / 7) + NATURALS[L] + acc[L]
      return { index: i, letter: L, midi, angle: this.angleOf(i), name: STRING_LETTERS[L] + (acc[L] > 0 ? '♯'.repeat(acc[L]) : '♭'.repeat(-acc[L])), degree: music.degreeOf(midi) + 1 }
    })
  }
  touch(angle: number, reach: number): StringTouch {
    const { stringStart: a, stringEnd: b, harmonicWidth: w } = this.shape, r = Math.max(0, reach)
    const zone: StringZone = r < a ? 'flat' : r > b ? 'sharp' : Math.abs(r - (a + b) / 2) <= w / 2 ? 'harmonic' : 'string'
    return { index: this.stringAt(angle), r, zone }
  }
  pool(music: Conductor, q: ToneQuery) { return this.layout(music, q).map(s => s.midi) }
  noteFor(music: Conductor, q: ToneQuery) {
    const t = this.touch(q.angle, q.reach)
    return this.layout(music, q)[t.index].midi + stringShift(t.zone)
  }
  // arpeggios and phrases walk over the strings themselves, low to high
  walk(music: Conductor, from: number, n: number, set: PitchSet, _angle: number, _reach: number, q?: ToneQuery) {
    if (!q) return music.walk(from, n, set)
    const pool = this.pool(music, q)
    let i = pool.findIndex(m => m >= from)
    if (i < 0) i = pool.length - 1
    return pool[Math.max(0, Math.min(pool.length - 1, i + n))] ?? from
  }
  degreeOf(music: Conductor, m: number) { return music.degreeOf(m) }
}

// Bateria: the kit's pieces around her (see the top of the file). The "note" under the aim is the piece's General
// MIDI number (the Caixa's between the pieces)
export class DrumsScale extends InstrumentScale {
  readonly id = 'drums' as const
  readonly label = 'Bateria'
  pool() { return DRUM_PIECES.map(p => p.gm).sort((a, b) => a - b) }
  noteFor(_music: Conductor, q: ToneQuery) {
    const r = Math.max(0, Math.min(1, q.reach))
    return drumPiece(padAt(drumKit(), Math.cos(q.angle) * r, Math.sin(q.angle) * r, true)?.piece ?? 'snare').gm
  }
  walk(_music: Conductor, from: number) { return from }
  degreeOf() { return 0 }
}

// the Cordas soltas themselves (the strings' own layout and touch, beyond what every scale answers)
export const STRINGS_SCALE = new StringsScale()
export const INSTRUMENT_SCALES: Record<InstrumentScaleId, InstrumentScale> = {
  primary: new PrimaryScale(), fifths: new FifthsScale(), tension: new TensionScale(), spiral: new SpiralScale(), harmonic: new HarmonicFieldScale(), hang: new HangScale(), strings: STRINGS_SCALE, drums: new DrumsScale(),
}
export const isInstrumentScaleId = (v: unknown): v is InstrumentScaleId => typeof v === 'string' && (INSTRUMENT_SCALE_IDS as string[]).includes(v)

// an item's scale list, checked: known ids, no repeats, in the panel's order, at least the primary one
export function cleanScales(v: unknown): InstrumentScaleId[] | null {
  if (!Array.isArray(v)) return null
  const set = new Set(v.filter(isInstrumentScaleId))
  const out = INSTRUMENT_SCALE_IDS.filter(id => set.has(id))
  return out.length ? out : null
}

// the scale at an index of an item's list (clamped; the primary one when the list is empty)
export function scaleAt(list: readonly InstrumentScaleId[] | undefined, i: number | undefined): InstrumentScale {
  if (!list?.length) return INSTRUMENT_SCALES.primary
  return INSTRUMENT_SCALES[list[Math.max(0, Math.min(list.length - 1, Math.round(i ?? 0)))]]
}

// the notes a chart region's chord holds, from `lo` to `hi` (tests, the drawing)
export const regionNotes = (r: ScaleRegion, lo: number, hi: number) => pcNotes(r.root, r.chord, lo, hi)
