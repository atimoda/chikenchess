import { identifyPitchCollection, SCALE_INTERVALS, SCALE_NAMES, type ScaleName } from './scales'

/** Relational scale changes: they work from whatever scale and key the music is in. */
export const SCALE_SHIFTS = {
  relative: 'Relative (same notes, other tonic)',
  parallel: 'Parallel (same tonic, major ↔ minor)',
  brighter: 'One mode brighter',
  darker: 'One mode darker',
  dominant: 'Neighbour key: dominant (V)',
  subdominant: 'Neighbour key: subdominant (IV)',
  mediantUp: 'Chromatic mediant up (+4 st)',
  mediantDown: 'Chromatic mediant down (−4 st)',
  lift: 'Key lift (+1 st)',
  randomRelated: 'Random related change',
  randomAny: 'Random scale, same tonic',
} as const
export type ScaleShift = keyof typeof SCALE_SHIFTS
export const SCALE_SHIFT_IDS = Object.keys(SCALE_SHIFTS) as [ScaleShift, ...ScaleShift[]]
const RELATED: readonly ScaleShift[] = ['relative', 'parallel', 'brighter', 'darker', 'dominant', 'subdominant', 'mediantUp', 'mediantDown', 'lift']

// Modes ordered from brightest to darkest; pentatonic and blues scales share their own ladder.
const LADDERS: readonly (readonly ScaleName[])[] = [
  ['Lydian', 'Maior', 'Mixolídia', 'Dórica', 'Menor natural', 'Phrygian', 'Locrian'],
  ['Pentatônica maior', 'Blues maior', 'Pentatônica menor', 'Blues menor'],
  ['Lydian dominant', 'Melódica menor (ascendente / jazz)', 'Harmônica menor', 'Phrygian dominant'],
]
const PARALLEL: Partial<Record<ScaleName, ScaleName>> = {
  'Maior': 'Menor natural', 'Menor natural': 'Maior', 'Aeolian': 'Maior',
  'Pentatônica maior': 'Pentatônica menor', 'Pentatônica menor': 'Pentatônica maior',
  'Blues maior': 'Blues menor', 'Blues menor': 'Blues maior',
  'Mixolídia': 'Dórica', 'Dórica': 'Mixolídia', 'Lydian': 'Phrygian', 'Phrygian': 'Lydian',
  'Harmônica menor': 'Maior', 'Melódica menor (ascendente / jazz)': 'Maior', 'Lydian dominant': 'Melódica menor (ascendente / jazz)', 'Locrian': 'Lydian',
  'Phrygian dominant': 'Phrygian',
}
const RELATIVE: Partial<Record<ScaleName, [ScaleName, number]>> = {
  'Maior': ['Menor natural', 9], 'Menor natural': ['Maior', 3], 'Aeolian': ['Maior', 3],
  'Pentatônica maior': ['Pentatônica menor', 9], 'Pentatônica menor': ['Pentatônica maior', 3],
  'Blues maior': ['Blues menor', 9], 'Blues menor': ['Blues maior', 3],
}
const KEY_MOVES: Partial<Record<ScaleShift, number>> = { dominant: -5, subdominant: 5, mediantUp: 4, mediantDown: -4, lift: 1 }

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const pitchClass = (note: string) => { const match = /^([A-G])([#b]?)/i.exec(note); return match ? ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1].toUpperCase()]! + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) + 12) % 12 : 0 }
const noteName = (pitch: number) => `${NAMES[((pitch % 12) + 12) % 12]}4`

/** Small deterministic hash, so a random choice repeats for the same game moment (undo/redo, online peers). */
export function seededIndex(seed: string, length: number) {
  let hash = 2166136261
  for (let index = 0; index < seed.length; index++) hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619)
  return (hash >>> 0) % length
}

export type ScaleShiftResult = { scale: string[]; rootMove: number; applied: ScaleShift; skipped?: string }

/**
 * Resolve one relational change against the current scale. `rootMove` is the
 * tonic movement in semitones, so callers can keep the register on wrap-around.
 */
export function shiftScale(notes: readonly string[], shift: ScaleShift, seed = ''): ScaleShiftResult {
  const { root, scale } = identifyPitchCollection(notes)
  const rootIndex = NAMES.indexOf(root)
  const build = (name: ScaleName, move = 0) => SCALE_INTERVALS[name].map(interval => noteName(rootIndex + move + interval))
  if (shift === 'randomRelated') return shiftScale(notes, RELATED[seededIndex(seed, RELATED.length)], seed + '>')
  if (shift === 'randomAny') {
    const options = SCALE_NAMES.filter(name => name !== scale && name !== 'Chromatic' && name !== 'Aeolian')
    return { scale: build(options[seededIndex(seed, options.length)]), rootMove: 0, applied: shift }
  }
  const move = KEY_MOVES[shift]
  if (move !== undefined) return { scale: notes.map(note => noteName(pitchClass(note) + move)), rootMove: move, applied: shift }
  const same = (skipped: string): ScaleShiftResult => ({ scale: [...notes], rootMove: 0, applied: shift, skipped })
  if (!scale) return same('the current scale has no named match')
  if (shift === 'parallel') { const target = PARALLEL[scale]; return target ? { scale: build(target), rootMove: 0, applied: shift } : same(`${scale} has no parallel`) }
  if (shift === 'relative') {
    const target = RELATIVE[scale]
    if (!target) return same(`${scale} has no relative`)
    // Choose the shorter way to the new tonic so the register barely moves.
    const rootMove = target[1] > 6 ? target[1] - 12 : target[1]
    return { scale: build(target[0], rootMove), rootMove, applied: shift }
  }
  const lookup = scale === 'Aeolian' ? 'Menor natural' : scale
  const ladder = LADDERS.find(item => item.includes(lookup))
  if (!ladder) return same(`${scale} has no ${shift} mode`)
  const next = ladder[ladder.indexOf(lookup) + (shift === 'brighter' ? -1 : 1)]
  return next ? { scale: build(next), rootMove: 0, applied: shift } : same(`${scale} is already the ${shift === 'brighter' ? 'brightest' : 'darkest'}`)
}
