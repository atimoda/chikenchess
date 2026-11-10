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
// Angles are screen radians (0 = right, π/2 = down, -π/2 = up).
import { NOTE_NAMES, type Conductor, type PitchSet } from './music'

export type InstrumentScaleId = 'primary' | 'fifths' | 'tension'
export const INSTRUMENT_SCALE_IDS: InstrumentScaleId[] = ['primary', 'fifths', 'tension']

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
  label: string
  color: string
  kind: 'major' | 'minor' | 'tension' | 'resolution'
}

// what the combat asks: the notes for the aim, with the item's pitch set, octave and span
export type ToneQuery = { angle: number; reach: number; set: PitchSet; octave: number; span: number }

export abstract class InstrumentScale {
  abstract readonly id: InstrumentScaleId
  abstract readonly label: string
  // the chart's regions (empty for the primary scale, which keeps the leque)
  regions(): ScaleRegion[] { return [] }
  regionAt(_angle: number, _reach: number): ScaleRegion | null { return null }
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
const name = (root: number) => NOTE_NAMES[pc(root)]

// Ciclo de quintas: Dó on top and a fifth more each sector clockwise (Sol, Ré, Lá…); the outer ring the major chord,
// the inner ring its relative minor (Lám under Dó, Mim under Sol…), like the reference chart
export class FifthsScale extends ChartScale {
  readonly id = 'fifths' as const
  readonly label = 'Ciclo de quintas'
  protected build() {
    const out: ScaleRegion[] = []
    for (let k = 0; k < SECTORS; k++) {
      const major = pc(k * 7), minor = pc(major + 9)
      out.push({ sector: k, ring: 1, root: major, chord: [0, 4, 7], steps: MAJOR, label: name(major), color: '#5e9e3c', kind: 'major' })
      out.push({ sector: k, ring: 0, root: minor, chord: [0, 3, 7], steps: NAT_MINOR, label: `${name(minor)}m`, color: '#9cc77f', kind: 'minor' })
    }
    return out
  }
}

// Tensão e resolução: the middle of the chart (inner ring) holds diminished and dissonant chords; the circle of
// balls around it (outer ring) the chord each one resolves to, in the same sector. The resolutions go round the
// fifths (Dó on top), majors and minors in turn; the tensions take turns: the leading tone's diminished seventh,
// the dominant seventh with a flat ninth, the half-diminished seventh on the leading tone and the augmented dominant
const TENSIONS: { up: number; chord: number[]; steps: number[]; suffix: string }[] = [
  { up: 11, chord: [0, 3, 6, 9], steps: [0, 2, 3, 5, 6, 8, 9, 11], suffix: '°7' }, // vii°7 (whole-half diminished)
  { up: 7, chord: [0, 4, 7, 10, 13], steps: [0, 1, 3, 4, 6, 7, 9, 10], suffix: '7♭9' }, // V7♭9 (half-whole diminished)
  { up: 11, chord: [0, 3, 6, 10], steps: [0, 1, 3, 5, 6, 8, 10], suffix: 'ø7' }, // viiø7 (locrian)
  { up: 7, chord: [0, 4, 8, 10], steps: [0, 2, 4, 6, 8, 10], suffix: '+7' }, // V+7 (whole tone)
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
      out.push({ sector: k, ring: 1, root: target, chord: minor ? [0, 3, 7] : [0, 4, 7], steps: minor ? HARM_MINOR : MAJOR, label: `${name(target)}${minor ? 'm' : ''}`, color: BALL_COLORS[k], kind: 'resolution' })
      out.push({ sector: k, ring: 0, root, chord: t.chord, steps: t.steps, label: `${name(root)}${t.suffix}`, color: '#b8a77a', kind: 'tension' })
    }
    return out
  }
}

export const INSTRUMENT_SCALES: Record<InstrumentScaleId, InstrumentScale> = {
  primary: new PrimaryScale(), fifths: new FifthsScale(), tension: new TensionScale(),
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
