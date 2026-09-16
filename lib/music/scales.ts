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
export const SCALE_NAMES = Object.keys(SCALE_INTERVALS) as [ScaleName, ...ScaleName[]]
