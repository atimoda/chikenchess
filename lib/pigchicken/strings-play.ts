// Cordas soltas (lib/pigchicken/instrument-scales.ts): how a hand plays a harp's open strings. Pure rules, no
// sound and no drawing; the Pátio's combat (lib/pigchicken/combat.ts) plays what comes out of here.
//   toque: pressing Atirar plucks the string under the aim;
//   arpejo: with Atirar held, every string the aim goes into is plucked, in the order it crosses them (a fast aim
//     that jumps over strings in one frame plucks the ones in between too, the shorter way around);
//   glissando: with Atirar still held on the string just plucked, moving the aim along it slides that note: toward
//     the string's end it rises to exactly a semitone up (the sustenido past the end), toward its start it falls to
//     exactly a semitone down (the bemol under the start).
// A hand is one aim: the mouse, the finger or the right stick; on a gamepad, the left stick is the other hand.

// one hand over the strings: `on` is the string it holds (the last one it plucked with Atirar still held), -1: none
export type StringHand = { on: number }
export const newStringHand = (): StringHand => ({ on: -1 })

// at most this many strings sound from one frame of a sweep (a jump of the aim: only the last ones before where
// it lands)
export const SWEEP_MAX = 12
// seconds between the strings of one frame's sweep, so they never sound as one block
export const SWEEP_GAP = 0.02

/**
 * One frame of a hand. `index`: the string under its aim (null: the hand is off the strings); `fire`: Atirar held;
 * `pressed`: Atirar pressed this frame; `count`: how many strings there are.
 * Returns the strings to pluck now, in order.
 */
export function stepStringHand(hand: StringHand, index: number | null, fire: boolean, pressed: boolean, count: number): number[] {
  if (!fire || index == null || !(count > 0)) { hand.on = -1; return [] }
  const at = Math.max(0, Math.min(count - 1, Math.round(index)))
  if (pressed || hand.on < 0 || hand.on >= count) { hand.on = at; return [at] }
  if (at === hand.on) return []
  const fwd = (((at - hand.on) % count) + count) % count
  const dir = fwd <= count - fwd ? 1 : -1, steps = dir > 0 ? fwd : count - fwd
  const out: number[] = []
  for (let k = Math.max(1, steps - SWEEP_MAX + 1); k <= steps; k++) out.push((((hand.on + dir * k) % count) + count) % count)
  hand.on = at
  return out
}

/**
 * The glissando: semitones over the string's own note for a note plucked at `r0` and now held at `r` (both along
 * the radius, like the aim's reach), on a string that goes from `start` to `end`. `from`: what the place of the
 * pluck added (-1 under the start, 1 past the end, 0 on the string). It never jumps: it leaves `from` where the
 * note was plucked and lands on exactly 1 at the string's end and -1 at its start.
 */
export function stringSlide(from: number, r0: number, r: number, start: number, end: number): number {
  const lo = Math.min(start, end), hi = Math.max(start, end)
  const a = Math.max(lo, Math.min(hi, r0)), b = Math.max(lo, Math.min(hi, r))
  if (b >= a) return hi - a > 1e-6 ? from + (1 - from) * ((b - a) / (hi - a)) : from
  return a - lo > 1e-6 ? from - (from + 1) * ((a - b) / (a - lo)) : from
}

/** How far along a string a place is: 0 at its start … 1 at its end (the loudness follows it). */
export const stringAlong = (r: number, start: number, end: number) => (end - start > 1e-6 ? Math.max(0, Math.min(1, (r - start) / (end - start))) : 1)
