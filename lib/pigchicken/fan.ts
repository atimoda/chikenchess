// The leque (fan of lanes): the circle around her (or a fixed point of the map) cut into lanes, one note per lane,
// like the keys of a keyboard opened in a fan. The guitar hero mode uses it both ways: a note sequenced at a pitch
// comes from that lane's direction, and a note rebated inside a lane plays that lane's note.
// Angles are screen radians around the centre (0 = right, π/2 = down, -π/2 = up).
import { DEGREE_COLORS, SCALES, scaleNotes, type ScaleId } from './music'

const DEG = Math.PI / 180

export type FanContent =
  // the notes of a scale, from `low` up, `octaves` octaves of it spread over the lanes
  | { kind: 'scale'; root: number; scale: ScaleId; low: number; octaves: number }
  // given notes lane by lane (null = a silent lane)
  | { kind: 'notes'; notes: (number | null)[] }

export type Fan = {
  open: number // degrees the lanes cover, up to 360
  start: number // degrees where the first lane begins (0 = right, 90 = down, 180 = left, 270 = up)
  dir: 1 | -1 // 1: the lanes go clockwise on screen
  mirrored: boolean // only the height counts (left and right are the same lane), like the instruments' aim
  centerY: number // px the centre sits above her feet
  content: FanContent
  widths?: number[] // relative lane widths (missing lanes count 1)
}

// the songs' fan: the upper half circle, from the ground on her left (low) over the top to the ground on her
// right (high), two octaves of the scale
export function songFan(root: number, scale: ScaleId): Fan {
  return { open: 180, start: 180, dir: 1, mirrored: false, centerY: 70, content: { kind: 'scale', root, scale, low: root, octaves: 2 } }
}

export function fanNotes(fan: Fan): (number | null)[] {
  const c = fan.content
  if (c.kind === 'notes') return c.notes.slice()
  const n = SCALES[c.scale].steps.length * Math.max(1, Math.round(c.octaves))
  return scaleNotes(c.root, c.scale, c.low, c.low + 12 * Math.max(1, Math.round(c.octaves)) - 1).slice(0, n)
}

export type Lane = { a0: number; a1: number; mid: number; midi: number | null; color: string }

// the lanes with their angles (radians, a0 → a1 in the fan's direction) and colours (the scale degree's)
export function fanLanes(fan: Fan, degreeOf?: (midi: number) => number): Lane[] {
  const notes = fanNotes(fan)
  if (!notes.length) return []
  const w = notes.map((_, i) => Math.max(0.05, fan.widths?.[i] ?? 1)), total = w.reduce((a, b) => a + b, 0)
  const open = Math.min(360, Math.max(1, fan.open)) * DEG
  let at = fan.start * DEG
  return notes.map((midi, i) => {
    const span = open * w[i] / total * fan.dir
    const lane = { a0: at, a1: at + span, mid: at + span / 2, midi, color: midi === null ? 'rgba(255,255,255,0.25)' : DEGREE_COLORS[(degreeOf?.(midi) ?? i) % DEGREE_COLORS.length] }
    at += span
    return lane
  })
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

// which lane an angle falls in (-1: outside the fan)
export function fanLaneAt(fan: Fan, angle: number): number {
  const lanes = fanLanes(fan)
  let a = angle
  // mirrored: fold the left half onto the right, so only the height counts
  if (fan.mirrored) a = Math.atan2(Math.sin(a), Math.abs(Math.cos(a)))
  const open = Math.min(360, Math.max(1, fan.open)) * DEG
  // the angle measured from the fan's start, in its direction
  let off = wrap((a - fan.start * DEG) * fan.dir)
  if (off < 0) off += Math.PI * 2
  if (off > open + 1e-9) return -1
  let acc = 0
  for (let i = 0; i < lanes.length; i++) {
    acc += Math.abs(lanes[i].a1 - lanes[i].a0)
    if (off <= acc + 1e-9) return i
  }
  return lanes.length - 1
}

// the note an angle plays (null: outside the fan or a silent lane)
export function fanNoteAt(fan: Fan, angle: number): number | null {
  const i = fanLaneAt(fan, angle)
  return i < 0 ? null : fanNotes(fan)[i] ?? null
}

// the direction a note comes from: the middle of its lane (the nearest note's lane when it has none)
export function fanAngleOf(fan: Fan, midi: number): number {
  const lanes = fanLanes(fan)
  if (!lanes.length) return -Math.PI / 2
  let best = 0, bestD = Infinity
  lanes.forEach((l, i) => { if (l.midi === null) return; const d = Math.abs(l.midi - midi); if (d < bestD) { bestD = d; best = i } })
  return wrap(lanes[best].mid)
}
