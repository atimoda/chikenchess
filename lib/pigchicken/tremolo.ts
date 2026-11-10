// Tremolo da mira: shaking the aim inside the same lane of the instrument's fan bends the note a little, so a
// trembling hand makes a controllable vibrato. Only the movement counts: the aim's position in the fan (in lanes)
// is followed by a slow copy of itself, and the gap between them (how far the aim just moved) is the bend, so a
// still aim always plays the plain note. Only movement while a note plays counts: with nothing playing (Fire not
// held, or the violin's bow not on) everything restarts, so every note starts in tune wherever in the fan it starts.
//   fretted (frets): the note stays its lane's note and the bend stays within `range` (±½ semitone by default);
//     entering another lane starts the new note clean.
//   fretless (violin): no frets to jump between: changing lane slides to the new note instead of jumping, and the
//     bend goes up to `range` (2 semitones by default).
// `amount` (0..1, the item's "Tremolo") scales the bend; 0 turns it off (harp, tambourine, keys).

export const TREMOLO_FOLLOW = 0.3 // s the slow copy takes to catch up with the aim (the vibrato's centre)
export const TREMOLO_GLIDE = 0.12 // s a fretless note takes to slide to a new lane's note (× amount)
// default limits (the item's "Tremolo: limite"): semitones a note can bend each way
export const TREMOLO_FRETTED_MAX = 0.5
export const TREMOLO_FRETLESS_MAX = 2

export type TremoloState = { slow: number; lane: number; base: number | null }

export const newTremolo = (): TremoloState => ({ slow: NaN, lane: -1, base: null })

// the aim's position in the fan, in lanes: 0 = pointing down (pool[0]) … n - 1 = pointing up
export const aimLanePos = (up: number, n: number) => ((Math.max(-1, Math.min(1, up)) + 1) / 2) * Math.max(0, n - 1)

// one frame: `pool` the fan's notes (low to high), `up` the aim's height (-1 down … 1 up). Returns the pitch to
// sound (a fractional MIDI note; the lane's own note when amount is 0, the aim is still or `playing` is false)
export function stepTremolo(s: TremoloState, pool: number[], up: number, dt: number, amount: number, fretless: boolean, playing = true, range?: number): number {
  const n = pool.length
  if (!n) return 60
  const pos = aimLanePos(up, n)
  const lane = Math.max(0, Math.min(n - 1, Math.round(pos)))
  const note = pool[lane]
  if (!(amount > 0) || n < 2 || !playing) { s.slow = pos; s.lane = lane; s.base = note; return note }
  const fresh = !Number.isFinite(s.slow)
  // a new lane starts the bend clean (a fretless note slides to the new note below instead of jumping)
  if (fresh || lane !== s.lane) s.slow = pos
  else s.slow += (pos - s.slow) * (1 - Math.exp(-Math.max(0, dt) / TREMOLO_FOLLOW))
  s.lane = lane
  const d = pos - s.slow
  // a lane's worth of movement bends by the interval to the neighbour it moves toward
  const next = d >= 0 ? pool[Math.min(n - 1, lane + 1)] - note : note - pool[Math.max(0, lane - 1)]
  const interval = next > 0 ? next : 2
  const max = Math.max(0, range ?? (fretless ? TREMOLO_FRETLESS_MAX : TREMOLO_FRETTED_MAX))
  const bend = Math.max(-max, Math.min(max, amount * d * interval))
  if (!fretless) { s.base = note; return note + bend }
  if (s.base === null || fresh) s.base = note
  else s.base += (note - s.base) * (1 - Math.exp(-Math.max(0, dt) / Math.max(0.01, TREMOLO_GLIDE * amount)))
  return s.base + bend
}
