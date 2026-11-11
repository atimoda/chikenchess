// The song editor's operations (the timeline in the jukebox): plain functions from a song to a new song, so the
// panel keeps each step in its history (undo, redo) and the tests check them without a browser.
// Rows: the fan's lanes (its notes, lowest first); a note sits in the lane nearest its pitch.
import { fanNotes, songFan } from './fan'
import { SCALES, type ScaleId } from './music'
import { LEAD_BEATS, lastBeat, pauseEnd, spawnBeat, type Song, type SongAlien, type SongLine, type SongPause } from './note-stage'

export type Selection = { aliens: number[]; lines: number[]; pauses: number[] }
export const NOTHING: Selection = { aliens: [], lines: [], pauses: [] }
export const isEmpty = (s: Selection) => !s.aliens.length && !s.lines.length && !s.pauses.length

// the lanes' notes, lowest first, and the lane of a note (the nearest)
export const laneNotes = (s: Pick<Song, 'fan'>) => fanNotes(s.fan).filter((m): m is number => m !== null).sort((a, b) => a - b)
export function laneOf(lanes: number[], midi: number) {
  let best = 0
  lanes.forEach((m, i) => { if (Math.abs(m - midi) < Math.abs(lanes[best] - midi)) best = i })
  return best
}
const laneMove = (lanes: number[], midi: number, d: number) => lanes[Math.max(0, Math.min(lanes.length - 1, laneOf(lanes, midi) + d))]

export const snapBeat = (b: number, grid: number) => Math.round(b / grid) * grid
const r4 = (b: number) => Math.round(b * 1e4) / 1e4

function shiftAlien(a: SongAlien, d: number): SongAlien {
  return { ...a, ...(a.at !== undefined ? { at: r4(a.at + d) } : {}), notes: a.notes.map(n => ({ ...n, beat: r4(n.beat + d) })) }
}

// move aliens in time (beats) and across lanes (each note d lanes up, kept inside the fan)
export function moveAliens<S extends Song>(s: S, idx: number[], dBeat: number, dLane: number): S {
  const lanes = laneNotes(s), set = new Set(idx)
  return {
    ...s, aliens: s.aliens.map((a, i) => {
      if (!set.has(i)) return a
      const b = dBeat ? shiftAlien(a, dBeat) : a
      return dLane ? { ...b, notes: b.notes.map(n => ({ ...n, midi: laneMove(lanes, n.midi, dLane) })) } : b
    }),
  }
}
// move one note of an alien
export function moveNote<S extends Song>(s: S, ai: number, ni: number, dBeat: number, dLane: number): S {
  const lanes = laneNotes(s)
  return {
    ...s, aliens: s.aliens.map((a, i) => i !== ai ? a : {
      ...a, notes: a.notes.map((n, k) => k !== ni ? n : { beat: r4(n.beat + dBeat), midi: dLane ? laneMove(lanes, n.midi, dLane) : n.midi }).sort((x, y) => x.beat - y.beat),
    }),
  }
}
export function moveLines<S extends Song>(s: S, idx: number[], dBeat: number): S {
  const set = new Set(idx)
  return { ...s, lines: (s.lines ?? []).map((l, i) => (set.has(i) ? { ...l, beat: r4(l.beat + dBeat) } : l)) }
}

// a new alien: four notes, one a beat, in the lane clicked (the variation picked, or its species' base)
export function addAlien<S extends Song>(s: S, beat: number, midi: number, kind: { species: SongAlien['species']; variant?: string }): { song: S; index: number } {
  const a: SongAlien = { species: kind.species, ...(kind.variant ? { variant: kind.variant } : {}), notes: [0, 1, 2, 3].map(k => ({ beat: r4(beat + k), midi })) }
  return { song: { ...s, aliens: [...s.aliens, a] }, index: s.aliens.length }
}
export function addNote<S extends Song>(s: S, ai: number, beat: number, midi: number): S {
  return {
    ...s, aliens: s.aliens.map((a, i) => i !== ai || a.notes.some(n => Math.abs(n.beat - beat) < 1e-6 && n.midi === midi) ? a
      : { ...a, notes: [...a.notes, { beat: r4(beat), midi }].sort((x, y) => x.beat - y.beat) }),
  }
}
// take a note out (its alien goes with its last note)
export function removeNote<S extends Song>(s: S, ai: number, ni: number): S {
  const a = s.aliens[ai]
  if (!a) return s
  if (a.notes.length <= 1) return { ...s, aliens: s.aliens.filter((_, i) => i !== ai) }
  return { ...s, aliens: s.aliens.map((x, i) => (i === ai ? { ...x, notes: x.notes.filter((_, k) => k !== ni) } : x)) }
}
export function updateAlien<S extends Song>(s: S, idx: number[], fn: (a: SongAlien) => SongAlien): S {
  const set = new Set(idx)
  return { ...s, aliens: s.aliens.map((a, i) => (set.has(i) ? fn(a) : a)) }
}

// what comes at or after a beat: the aliens whose first note is there, the lines and the pauses
function shiftFrom<S extends Song>(s: S, beat: number, d: number, skipPause = -1): S {
  return {
    ...s,
    aliens: s.aliens.map(a => (Math.min(...a.notes.map(n => n.beat)) >= beat - 1e-6 ? shiftAlien(a, d) : a)),
    lines: (s.lines ?? []).map(l => (l.beat >= beat - 1e-6 ? { ...l, beat: r4(l.beat + d) } : l)),
    pauses: (s.pauses ?? []).map((p, i) => (i !== skipPause && p.beat >= beat - 1e-6 ? { ...p, beat: r4(p.beat + d) } : p)),
  }
}
// a pause opens room: everything from its beat on goes later by its bars (the game holds the next wave until it ends)
export function insertPause<S extends Song>(s: S, beat: number, bars = 2, silent = false): { song: S; index: number } {
  const moved = shiftFrom(s, beat, bars * 4)
  const pauses = [...(moved.pauses ?? []), { beat: r4(beat), bars, silent }].sort((a, b) => a.beat - b.beat)
  return { song: { ...moved, pauses }, index: pauses.findIndex(p => p.beat === r4(beat) && p.bars === bars) }
}
// a pause dragged in time (whole bars): its room closes where it was and opens where it goes, so what was between
// the two places moves to the other side of it (the pause's beat is counted with its room closed)
export function movePause<S extends Song>(s: S, i: number, dBeat: number): { song: S; index: number } {
  const p = (s.pauses ?? [])[i]
  if (!p || !dBeat) return { song: s, index: i }
  const closed = removeItems(s, { aliens: [], lines: [], pauses: [i] })
  return insertPause(closed, Math.max(0, p.beat + dBeat), p.bars, p.silent)
}
// a longer or shorter pause pushes or pulls what comes after it
export function setPauseBars<S extends Song>(s: S, i: number, bars: number): S {
  const p = (s.pauses ?? [])[i]
  if (!p) return s
  const nb = Math.max(1, Math.min(16, Math.round(bars)))
  const moved = shiftFrom(s, pauseEnd(p), (nb - p.bars) * 4, i)
  return { ...moved, pauses: (moved.pauses ?? []).map((x, k) => (k === i ? { ...x, bars: nb } : x)) }
}
export function updatePause<S extends Song>(s: S, i: number, patch: Partial<Omit<SongPause, 'bars' | 'beat'>>): S {
  return { ...s, pauses: (s.pauses ?? []).map((p, k) => (k === i ? { ...p, ...patch } : p)) }
}
export function addLine<S extends Song>(s: S, line: SongLine): { song: S; index: number } {
  const lines = [...(s.lines ?? []), line]
  return { song: { ...s, lines }, index: lines.length - 1 }
}
export function updateLine<S extends Song>(s: S, i: number, patch: Partial<SongLine>): S {
  return { ...s, lines: (s.lines ?? []).map((l, k) => (k === i ? { ...l, ...patch } : l)) }
}

// Delete: the aliens and lines picked go; a pause that goes closes its room (what came after it comes back)
export function removeItems<S extends Song>(s: S, sel: Selection): S {
  const al = new Set(sel.aliens), ln = new Set(sel.lines)
  let out: S = { ...s, aliens: s.aliens.filter((_, i) => !al.has(i)), lines: (s.lines ?? []).filter((_, i) => !ln.has(i)) }
  // the pauses from the last one back, so the indexes hold
  const ps = [...sel.pauses].sort((a, b) => b - a)
  for (const i of ps) {
    const p = (out.pauses ?? [])[i]
    if (!p) continue
    out = { ...out, pauses: (out.pauses ?? []).filter((_, k) => k !== i) }
    out = shiftFrom(out, pauseEnd(p), -p.bars * 4)
  }
  return out
}

// copy and paste: the aliens and lines picked, from the first beat among them; pasted at the cursor
export type Clip = { aliens: SongAlien[]; lines: SongLine[] }
export function copyItems(s: Song, sel: Selection): Clip | null {
  const aliens = sel.aliens.map(i => s.aliens[i]).filter(Boolean), lines = sel.lines.map(i => (s.lines ?? [])[i]).filter(Boolean)
  if (!aliens.length && !lines.length) return null
  const from = Math.min(...aliens.flatMap(a => a.notes.map(n => n.beat)), ...lines.map(l => l.beat))
  return { aliens: aliens.map(a => shiftAlien(structuredClone(a), -from)), lines: lines.map(l => ({ ...l, beat: r4(l.beat - from) })) }
}
export function pasteClip<S extends Song>(s: S, clip: Clip, at: number): { song: S; sel: Selection } {
  const aliens = clip.aliens.map(a => shiftAlien(structuredClone(a), at)), lines = clip.lines.map(l => ({ ...l, beat: r4(l.beat + at) }))
  const n = s.aliens.length, m = (s.lines ?? []).length
  return {
    song: { ...s, aliens: [...s.aliens, ...aliens], lines: [...(s.lines ?? []), ...lines] },
    sel: { aliens: aliens.map((_, i) => n + i), lines: lines.map((_, i) => m + i), pauses: [] },
  }
}

// another key or scale: the fan follows and each note keeps its lane
const CHORD_SCALE: Partial<Record<ScaleId, ScaleId>> = { majorPenta: 'major', minorPenta: 'minor', blues: 'minor' }
export function retune<S extends Song>(s: S, root: number, scale: ScaleId): S {
  const before = laneNotes(s)
  const c = s.fan.content
  const fan = { ...s.fan, content: c.kind === 'scale' ? { ...c, root, scale, low: c.low + (root - c.root) } : songFan(root, scale).content }
  const after = laneNotes({ fan })
  const to = (m: number) => after[Math.min(after.length - 1, laneOf(before, m))]
  return {
    ...s, fan,
    music: { ...s.music, zone: { ...s.music.zone, root, scale, chordScale: SCALES[scale].steps.length === 7 ? scale : CHORD_SCALE[scale] ?? 'major' } },
    aliens: s.aliens.map(a => ({ ...a, notes: a.notes.map(n => ({ ...n, midi: to(n.midi) })) })),
  }
}

// the timeline's span: from the first alien's spawn (or the intro) to a few bars after the end
export function timelineSpan(s: Song) {
  const first = Math.min(0, ...s.aliens.map(spawnBeat), ...(s.lines ?? []).map(l => l.beat))
  const end = Math.max(16, ...s.aliens.map(lastBeat), ...(s.pauses ?? []).map(pauseEnd), ...(s.lines ?? []).map(l => l.beat + 1))
  return { from: Math.floor(first / 4) * 4 - 4, to: Math.ceil(end / 4) * 4 + 16 }
}
// an alien's block: from its spawn to when it touches her (or goes away)
export const alienSpan = (a: SongAlien, after: number) => ({ from: spawnBeat(a), to: lastBeat(a) + after })
export { LEAD_BEATS }
