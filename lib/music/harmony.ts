import { degreeToMidi } from './model'

export const HARMONY_PLAN_IDS = ['static', 'cadence', 'circle', 'descent', 'ascent', 'pop-punk-154', 'pop-1564', 'rock-6415', 'doo-wop-1645', 'folk-rock-6425', 'jazz-251', 'indie-pop-1465', 'jazz-3625', 'southern-rock-415', 'blues-145'] as const
export type HarmonyPlanId = typeof HARMONY_PLAN_IDS[number]

type Seventh = 'm7' | '7' | 'maj7'
type HarmonyPlan = { label: string; degrees: readonly number[]; sevenths?: readonly Seventh[] }

export const HARMONY_PLANS: Record<HarmonyPlanId, HarmonyPlan> = {
  static: { label: 'I - Estática', degrees: [0] },
  cadence: { label: 'I–IV–V–I - Cadência', degrees: [0, 3, 4, 0] },
  circle: { label: 'I–V–ii–vi - Circular', degrees: [0, 4, 1, 5] },
  descent: { label: 'i–VII–VI–V - Descendente', degrees: [0, -1, -2, -3] },
  ascent: { label: 'I–ii–IV–V - Ascendente', degrees: [0, 1, 3, 4] },
  'pop-punk-154': { label: 'I–V–IV · Pop punk', degrees: [0, 4, 3] },
  'pop-1564': { label: 'I–V–vi–IV · Pop', degrees: [0, 4, 5, 3] },
  'rock-6415': { label: 'vi–IV–I–V · Rock', degrees: [5, 3, 0, 4] },
  'doo-wop-1645': { label: 'I–vi–IV–V · Doo-wop', degrees: [0, 5, 3, 4] },
  'folk-rock-6425': { label: 'vi–IV–ii–V · Folk rock', degrees: [5, 3, 1, 4] },
  'jazz-251': { label: 'ii7–V7–Imaj7 · Jazz', degrees: [1, 4, 0], sevenths: ['m7', '7', 'maj7'] },
  'indie-pop-1465': { label: 'I–IV–vi–V · Indie pop', degrees: [0, 3, 5, 4] },
  'jazz-3625': { label: 'iii7–VI7–ii7–V7 · Jazz', degrees: [2, 5, 1, 4], sevenths: ['m7', '7', 'm7', '7'] },
  'southern-rock-415': { label: 'IV–I–V · Southern rock', degrees: [3, 0, 4] },
  'blues-145': { label: 'I–IV–V · Blues', degrees: [0, 3, 4] },
}

const ROMAN_DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const

function pitchClass(note: string) {
  const match = /^([A-G])([#b]?)/i.exec(note)
  if (!match) return 0
  const natural = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1].toUpperCase() as 'A'|'B'|'C'|'D'|'E'|'F'|'G']
  return (natural + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) + 12) % 12
}

function scaleNote(scale: readonly string[], degree: number) {
  if (!scale.length) return '?'
  const index = ((degree % scale.length) + scale.length) % scale.length
  return scale[index].replace(/-?\d+$/, '')
}

function chordDegreeOffsets(scale: readonly string[], degree: number): readonly [number, number] {
  if (scale.length === 7 || scale.length === 8) return [2, 4]
  const root = pitchClass(scaleNote(scale, degree))
  const candidates = Array.from({ length: Math.max(0, scale.length - 1) }, (_, index) => {
    const offset = index + 1
    return { offset, interval: (pitchClass(scaleNote(scale, degree + offset)) - root + 12) % 12 }
  })
  const wholeTone = scale.length === 6 && candidates.every((candidate, index) => candidate.interval === (index + 1) * 2)
  const choose = (preferred: readonly number[]) => preferred.flatMap(interval => candidates.filter(candidate => candidate.interval === interval)).at(0)?.offset
  const third = choose(wholeTone ? [4] : [4, 3, 5]) ?? Math.min(2, scale.length - 1)
  const fifth = choose(wholeTone ? [8] : [7, 8, 6]) ?? Math.min(4, scale.length - 1)
  return [third, fifth]
}

export interface HarmonyFrame {
  plan: HarmonyPlanId
  planLabel: string
  section: number
  degree: number
  roman: string
  chordDegrees: readonly number[]
  chordNotes: readonly string[]
  chordIntervals?: readonly number[]
  chordName: string
  quality: 'maior' | 'menor' | 'diminuto' | 'aumentado' | 'aberto'
}

/** Describe the harmonic center and diatonic triad heard in one song section. */
export function harmonyFrame(plan: HarmonyPlanId, scale: readonly string[], section: number): HarmonyFrame {
  const definition = HARMONY_PLANS[plan]
  const index = ((section % definition.degrees.length) + definition.degrees.length) % definition.degrees.length
  const degree = definition.degrees[index]
  const seventh = definition.sevenths?.[index]
  if (seventh) {
    const intervals = seventh === 'm7' ? [0, 3, 7, 10] : seventh === '7' ? [0, 4, 7, 10] : [0, 4, 7, 11]
    const chordDegrees = [degree, degree + 2, degree + 4, degree + 6]
    const rootMidi = degreeToMidi(degree, scale, 4)
    const chromatic = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const chordNotes = intervals.map(interval => chromatic[(rootMidi + interval + 120) % 12])
    const numeral = ROMAN_DEGREES[((degree % 7) + 7) % 7]
    const roman = `${seventh === 'm7' ? numeral.toLowerCase() : numeral}${seventh === 'maj7' ? 'maj7' : '7'}`
    return { plan, planLabel: definition.label, section, degree, roman, chordDegrees, chordNotes,
      chordIntervals: intervals, chordName: `${chordNotes[0]}${seventh}`, quality: seventh === 'm7' ? 'menor' : 'maior' }
  }
  const [thirdOffset, fifthOffset] = chordDegreeOffsets(scale, degree)
  const chordDegrees = [degree, degree + thirdOffset, degree + fifthOffset] as const
  const chordNotes = chordDegrees.map(value => scaleNote(scale, value)) as unknown as [string, string, string]
  const root = pitchClass(chordNotes[0]), third = (pitchClass(chordNotes[1]) - root + 12) % 12, fifth = (pitchClass(chordNotes[2]) - root + 12) % 12
  const quality = third === 4 && fifth === 7 ? 'maior' : third === 3 && fifth === 7 ? 'menor' : third === 3 && fifth === 6 ? 'diminuto' : third === 4 && fifth === 8 ? 'aumentado' : 'aberto'
  const numeral = ROMAN_DEGREES[((degree % 7) + 7) % 7]
  const roman = quality === 'menor' ? numeral.toLowerCase() : quality === 'diminuto' ? `${numeral.toLowerCase()}°` : quality === 'aumentado' ? `${numeral}+` : numeral
  const suffix = quality === 'menor' ? 'm' : quality === 'diminuto' ? '°' : quality === 'aumentado' ? '+' : quality === 'aberto' ? '(add)' : ''
  return { plan, planLabel: definition.label, section, degree, roman, chordDegrees, chordNotes, chordName: `${chordNotes[0]}${suffix}`, quality }
}
