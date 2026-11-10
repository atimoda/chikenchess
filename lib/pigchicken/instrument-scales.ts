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
// Angles are screen radians (0 = right, π/2 = down, -π/2 = up).
import { SCALES, scaleNotes, type Conductor, type PitchSet } from './music'

export type InstrumentScaleId = 'primary' | 'fifths' | 'tension' | 'spiral'
export const INSTRUMENT_SCALE_IDS: InstrumentScaleId[] = ['primary', 'fifths', 'tension', 'spiral']

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
export const ringAt = (reach: number) => (reach >= RING_SPLIT ? 1 : 0)

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
export type ToneQuery = { angle: number; reach: number; set: PitchSet; octave: number; span: number; descending?: boolean }

// the notes in letters (cifra)
export const LETTERS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
const NUMERALS = ['I', '♭II', 'II', '♭III', 'III', 'IV', '♯IV', 'V', '♭VI', 'VI', '♭VII', 'VII']
// a chord's degree in a key, in Roman numerals: lower case for minor and diminished, then the chord's own sign
// (C in C: I; Am: vi; B°7: vii°7; G7♭9: V7♭9)
export function romanOf(root: number, key: number, minor: boolean, suffix: string) {
  const n = NUMERALS[pc(root - key)]
  return (minor ? n.toLowerCase() : n) + (suffix === 'm' ? '' : suffix)
}

export abstract class InstrumentScale {
  abstract readonly id: InstrumentScaleId
  abstract readonly label: string
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
  abstract walk(music: Conductor, from: number, n: number, set: PitchSet, angle: number, reach: number): number
  // the note's colour index (its degree)
  abstract degreeOf(music: Conductor, m: number, angle: number, reach: number): number
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
    const k = sectorAt(angle), ring = ringAt(reach)
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

export const INSTRUMENT_SCALES: Record<InstrumentScaleId, InstrumentScale> = {
  primary: new PrimaryScale(), fifths: new FifthsScale(), tension: new TensionScale(), spiral: new SpiralScale(),
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
