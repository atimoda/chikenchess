export const HARMONY_PLAN_IDS = ['static', 'cadence', 'circle', 'descent', 'ascent'] as const
export type HarmonyPlanId = typeof HARMONY_PLAN_IDS[number]

export const HARMONY_PLANS: Record<HarmonyPlanId, { label: string; degrees: readonly number[] }> = {
  static: { label: 'Estática · I', degrees: [0] },
  cadence: { label: 'Cadência · I–IV–V–I', degrees: [0, 3, 4, 0] },
  circle: { label: 'Circular · I–V–ii–vi', degrees: [0, 4, 1, 5] },
  descent: { label: 'Descendente · i–VII–VI–V', degrees: [0, -1, -2, -3] },
  ascent: { label: 'Ascendente · I–ii–IV–V', degrees: [0, 1, 3, 4] },
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
  chordDegrees: readonly [number, number, number]
  chordNotes: readonly [string, string, string]
  chordName: string
  quality: 'maior' | 'menor' | 'diminuto' | 'aumentado' | 'aberto'
}

/** Describe the harmonic center and diatonic triad heard in one song section. */
export function harmonyFrame(plan: HarmonyPlanId, scale: readonly string[], section: number): HarmonyFrame {
  const definition = HARMONY_PLANS[plan]
  const degree = definition.degrees[((section % definition.degrees.length) + definition.degrees.length) % definition.degrees.length]
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
