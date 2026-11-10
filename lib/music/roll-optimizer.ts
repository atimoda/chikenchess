import type { PianoRoll } from './piano-roll'

/** Lossless lane packing for finite piano rolls. Each lane has identical controls
 * and no overlapping intervals; chords share onset AND duration. This runs at
 * compilation/export time, never as a text rewrite in the pointer handler. */
export interface RollLane {
  segments: { duration: number; notes: number[] | null }[]
  velocity: number
  slide?: number
  slideSeconds?: number
  pan?: number
  /** Repeats of each note inside its own length (2–4). */
  ratchet?: number
  /** Probability (0–1) that each note of the lane plays. */
  chance?: number
  /** Low-pass offset as a fraction of the piece's cutoff (−0.5…+0.5): a per-note filter accent. */
  cutoff?: number
  /** The notes take the piece's vibrato (or a gentle default). */
  vibrato?: boolean
  /** The note's own release (s), reverb send, delay send and drive, replacing the piece's. */
  release?: number
  reverb?: number
  delay?: number
  drive?: number
}
export function optimizeRoll(roll: PianoRoll): RollLane[] {
  type Event = { start: number; duration: number; notes: number[] }
  type Group = { controls: Omit<RollLane, 'segments'>; events: Event[] }
  const groups = new Map<string, Group>()
  for (const note of roll.notes) {
    const controls = { velocity: note.velocity, slide: note.slide, slideSeconds: note.slideSeconds, pan: note.pan,
      ratchet: note.ratchet !== undefined && note.ratchet > 1 ? note.ratchet : undefined,
      chance: note.chance !== undefined && note.chance < 1 ? note.chance : undefined,
      ...(note.cutoff ? { cutoff: note.cutoff } : {}), ...(note.vibrato ? { vibrato: true } : {}),
      ...(note.release !== undefined ? { release: note.release } : {}), ...(note.reverb !== undefined ? { reverb: note.reverb } : {}),
      ...(note.delay !== undefined ? { delay: note.delay } : {}), ...(note.drive !== undefined ? { drive: note.drive } : {}) }
    const key = JSON.stringify(controls)
    let group = groups.get(key)
    if (!group) { group = { controls, events: [] }; groups.set(key, group) }
    const chord = group.events.find(e => e.start === note.start && e.duration === note.duration)
    if (chord) chord.notes.push(note.degree)
    else group.events.push({ start: note.start, duration: note.duration, notes: [note.degree] })
  }
  const result: RollLane[] = []
  for (const { controls, events } of groups.values()) {
    const lanes: { end: number; segments: RollLane['segments'] }[] = []
    for (const event of events.sort((a, b) => a.start - b.start)) {
      let lane = lanes.find(candidate => candidate.end <= event.start)
      if (!lane) { lane = { end: 0, segments: [] }; lanes.push(lane) }
      const gap = event.start - lane.end
      if (gap > 0) lane.segments.push({duration:gap,notes:null})
      lane.segments.push({duration:event.duration,notes:event.notes})
      lane.end = event.start + event.duration
    }
    for (const lane of lanes) {
      if (lane.end < roll.bars) lane.segments.push({duration:roll.bars-lane.end,notes:null})
      result.push({ ...controls, segments: lane.segments })
    }
  }
  return result
}

/** Only the exporter parses/emits notation; playback uses these segments directly. */
export function rollLaneNotation(lane: RollLane) {
  const number = (value: number) => String(Number(value.toFixed(12)))
  return lane.segments.map(({duration,notes}) => {
    const value = !notes ? '~' : notes.length === 1 ? String(notes[0]) : `[${notes.join(',')}]`
    return `${notes && lane.ratchet ? `[${value}*${lane.ratchet}]` : value}@${number(duration)}`
  }).join(' ')
}
