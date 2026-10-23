// Pitch collections in twelve-tone equal temperament. Aeolian aliases natural minor.
export const SCALE_INTERVALS = {
  'Pentatônica menor': [0, 3, 5, 7, 10],
  'Pentatônica maior': [0, 2, 4, 7, 9],
  'Maior': [0, 2, 4, 5, 7, 9, 11],
  'Menor natural': [0, 2, 3, 5, 7, 8, 10],
  'Dórica': [0, 2, 3, 5, 7, 9, 10],
  'Mixolídia': [0, 2, 4, 5, 7, 9, 10],
  'Blues menor': [0, 3, 5, 6, 7, 10],
  'Blues maior': [0, 2, 3, 4, 7, 9],
  'Whole tone': [0, 2, 4, 6, 8, 10],
  'Octatonic / Diminished (tom–semitom)': [0, 2, 3, 5, 6, 8, 9, 11],
  'Octatonic / Diminished (semitom–tom)': [0, 1, 3, 4, 6, 7, 9, 10],
  'Harmônica menor': [0, 2, 3, 5, 7, 8, 11],
  'Melódica menor (ascendente / jazz)': [0, 2, 3, 5, 7, 9, 11],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Lydian dominant': [0, 2, 4, 6, 7, 9, 10],
  'Locrian': [0, 1, 3, 5, 6, 8, 10],
  'Aeolian': [0, 2, 3, 5, 7, 8, 10],
  'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
} as const
export type ScaleName = keyof typeof SCALE_INTERVALS
/** English display names; the Portuguese keys stay as the saved identifiers. */
export const SCALE_LABELS: Record<ScaleName, string> = {
  'Pentatônica menor': 'Minor pentatonic',
  'Pentatônica maior': 'Major pentatonic',
  'Maior': 'Major',
  'Menor natural': 'Natural minor',
  'Dórica': 'Dorian',
  'Mixolídia': 'Mixolydian',
  'Blues menor': 'Minor blues',
  'Blues maior': 'Major blues',
  'Whole tone': 'Whole tone',
  'Octatonic / Diminished (tom–semitom)': 'Octatonic / Diminished (whole–half)',
  'Octatonic / Diminished (semitom–tom)': 'Octatonic / Diminished (half–whole)',
  'Harmônica menor': 'Harmonic minor',
  'Melódica menor (ascendente / jazz)': 'Melodic minor (ascending / jazz)',
  'Phrygian': 'Phrygian',
  'Lydian': 'Lydian',
  'Lydian dominant': 'Lydian dominant',
  'Locrian': 'Locrian',
  'Aeolian': 'Aeolian',
  'Chromatic': 'Chromatic',
}
export const ROOTS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
export type RootName = typeof ROOTS[number]

/** Fourth-octave note names of a root and scale (the map and the music share it). */
export function scaleForCreativeSession(session: { root: RootName; scale: ScaleName }) {
  const rootIndex = ROOTS.indexOf(session.root)
  return SCALE_INTERVALS[session.scale].map(interval => `${ROOTS[(rootIndex + interval) % 12]}4`)
}
export const SCALE_NAMES = Object.keys(SCALE_INTERVALS) as [ScaleName, ...ScaleName[]]

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const NATURAL_PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

function pitchClass(note: string) {
  const match = /^([A-G])([#b]?)/i.exec(note)
  if (!match) return 0
  return (NATURAL_PITCH_CLASS[match[1].toUpperCase()] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) + 12) % 12
}

/** Identify the current root and named pitch collection from the notes sent to the music runtime. */
export function identifyPitchCollection(notes: readonly string[], preferredScale?: ScaleName) {
  const rootIndex = notes.length ? pitchClass(notes[0]) : 0
  const intervals = notes.map(note => (pitchClass(note) - rootIndex + 12) % 12)
  const matches = SCALE_NAMES.filter(name => {
    const candidate = SCALE_INTERVALS[name]
    return candidate.length === intervals.length && candidate.every((interval, index) => interval === intervals[index])
  })
  const scale = (preferredScale && matches.includes(preferredScale) ? preferredScale : matches[0]) ?? null
  return {
    root: PITCH_CLASSES[rootIndex],
    scale,
    label: scale ?? `Escala modal · ${notes.length} notas`,
    notes: notes.map(note => note.replace(/-?\d+$/, '')),
  }
}
