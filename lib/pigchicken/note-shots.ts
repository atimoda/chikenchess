// Note shots (tiros-nota): little balls of light a note spawner (an alien) fires so they reach her at the moment the
// song wants that note. Any melee blow rebates them (its sector during the golpe and the continuação); the peck
// cancels them; one that reaches her (or is late) is a missed note. The rebate is judged against the arrival time,
// with the temple's windows. Combat keeps them (they work in every mode); the song decides what they play.

export type NoteGrade = 'perfect' | 'good' | 'fora'
// the temple's rhythm windows (s): the same PERFEITO / BOM
export const NOTE_PERFECT = 0.07, NOTE_GOOD = 0.14
// how late a note can be and still be rebated before it counts as missed (s)
export const NOTE_LATE = 0.3
// how long a rebated note flies before it fades (s), and its speed (px/s, at least)
export const REBATE_LIFE = 1.6, REBATE_SPEED = 620
// the harmony a rebated note adds to an alien it hits, as a share of its life
export const REBATE_HARMONY = 0.5

export type NoteShot = {
  id: number
  x: number; y: number; vx: number; vy: number
  midi: number // the note sequenced
  color: string
  size: number // radius (px)
  glow: number // 0..1
  arriveAt: number // conductor time (s) when it should reach her
  state: 'incoming' | 'rebated' | 'missed'
  t: number // s in its current state
  source: string // who fired it (the stage, an alien kind…)
  grade?: NoteGrade
}
export type NoteShotEvent =
  | { kind: 'rebate'; shot: NoteShot; grade: NoteGrade; off: number; player: string; midi: number }
  | { kind: 'miss'; shot: NoteShot }
  | { kind: 'parry'; shot: NoteShot; player: string }

export function judgeNote(off: number): NoteGrade {
  const a = Math.abs(off)
  return a <= NOTE_PERFECT ? 'perfect' : a <= NOTE_GOOD ? 'good' : 'fora'
}

// is a point inside a blow's sector (centre, aim, arc and reach), with the note's radius
export function inSector(ox: number, oy: number, angle: number, arc: number, reach: number, x: number, y: number, r: number) {
  const dx = x - ox, dy = y - oy, dist = Math.hypot(dx, dy)
  if (dist > reach + r) return false
  if (dist < 20 + r || arc >= Math.PI * 2 - 1e-6) return true
  let diff = Math.atan2(dy, dx) - angle
  diff = Math.atan2(Math.sin(diff), Math.cos(diff))
  return Math.abs(diff) <= arc / 2
}

// the velocity that takes a note from (x, y) to (tx, ty) in `secs`, never slower than `min` px/s
export function aimShot(x: number, y: number, tx: number, ty: number, secs: number, min = 60) {
  const dx = tx - x, dy = ty - y, dist = Math.hypot(dx, dy) || 1
  const speed = Math.max(min, dist / Math.max(0.05, secs))
  return { vx: dx / dist * speed, vy: dy / dist * speed }
}
