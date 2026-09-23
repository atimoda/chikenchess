import type { Instrument, InstrumentPerformanceEdit } from './model'
import type { PianoRoll } from './piano-roll'

const NOTE_TOKEN = /(^|[\s[<,])(-?\d+)(?=$|[\s\]>,@*!/])/g

function rewritePatternNotes(pattern: string, rewrite: (notes: number[]) => number[]) {
  const notes = [...pattern.matchAll(NOTE_TOKEN)].map(match => Number(match[2]))
  if (!notes.length) return pattern
  const rewritten = rewrite(notes)
  let index = 0
  return pattern.replace(NOTE_TOKEN, (_, prefix: string) => `${prefix}${rewritten[index++]}`)
}

function randomDegrees(notes: number[], random: () => number) {
  const minimum = Math.min(...notes)
  const maximum = Math.max(...notes)
  const high = maximum === minimum ? Math.min(48, minimum + 6) : maximum
  const low = high === minimum ? Math.max(-48, minimum - 6) : minimum
  return notes.map(() => low + Math.floor(random() * (high - low + 1)))
}

function splitSequence(pattern: string) {
  const tokens: string[] = []
  let depth = 0
  let token = ''
  for (const character of pattern.trim()) {
    if (/\s/.test(character) && depth === 0) {
      if (token) tokens.push(token)
      token = ''
      continue
    }
    token += character
    if (character === '[' || character === '<') depth += 1
    if (character === ']' || character === '>') depth = Math.max(0, depth - 1)
  }
  if (token) tokens.push(token)
  return tokens
}

function hasTopLevelComma(pattern: string) {
  let depth = 0
  for (const character of pattern) {
    if (character === '[' || character === '<') depth += 1
    else if (character === ']' || character === '>') depth = Math.max(0, depth - 1)
    else if (character === ',' && depth === 0) return true
  }
  return false
}

function mirrorToken(token: string): string {
  const opening = token[0]
  if (opening !== '[' && opening !== '<') return token
  const closing = opening === '[' ? ']' : '>'
  let depth = 0
  for (let index = 0; index < token.length; index += 1) {
    if (token[index] === opening) depth += 1
    if (token[index] !== closing) continue
    depth -= 1
    if (depth !== 0) continue
    const body = token.slice(1, index)
    const suffix = token.slice(index + 1)
    // Comma groups are simultaneous chords, so they have no horizontal order.
    const mirrored = opening === '[' && hasTopLevelComma(body) ? body : mirrorPattern(body)
    return `${opening}${mirrored}${closing}${suffix}`
  }
  return token
}

function mirrorPattern(pattern: string): string {
  return splitSequence(pattern).reverse().map(mirrorToken).join(' ')
}

function rewriteRoll(roll: PianoRoll, rewrite: (notes: number[]) => number[]): PianoRoll {
  const degrees = rewrite(roll.notes.map(note => note.degree))
  return { ...roll, notes: roll.notes.map((note, index) => ({ ...note, degree: degrees[index] })) }
}

function mirrorRoll(roll: PianoRoll): PianoRoll {
  return {
    ...roll,
    notes: roll.notes.map(note => ({
      ...note,
      start: Math.max(0, roll.bars - note.start - note.duration),
      ...(note.slide === undefined ? {} : { slide: -note.slide }),
    })).sort((a, b) => a.start - b.start || a.duration - b.duration),
  }
}

function editVariation(
  instrument: Instrument,
  variation: number,
  patternRewrite: (notes: number[]) => number[],
  rollRewrite: (notes: number[]) => number[],
): InstrumentPerformanceEdit {
  const count = Math.max(1, instrument.phrases?.length ?? 0, instrument.pianoRolls?.length ?? 0)
  const index = Math.max(0, Math.min(count - 1, variation))
  const roll = instrument.pianoRolls?.[index]
  if (roll) {
    const pianoRolls = Array.from({ length: count }, (_, i) =>
      i === index ? rewriteRoll(roll, rollRewrite) : instrument.pianoRolls?.[i] ?? null)
    return { pianoRolls }
  }

  const source = instrument.phrases?.length ? instrument.phrases : [instrument.notes]
  const phrases = Array.from({ length: count }, (_, i) => source[i] ?? source[i % source.length])
  const pattern = rewritePatternNotes(phrases[index], patternRewrite)
  if (instrument.phrases?.length) {
    phrases[index] = pattern
    return { phrases, ...(index === 0 ? { notes: pattern } : {}) }
  }
  return { notes: pattern }
}

/** Mirror the selected variation across its full timeline and invert per-note slide direction. */
export function reverseVariation(instrument: Instrument, variation: number): InstrumentPerformanceEdit {
  const count = Math.max(1, instrument.phrases?.length ?? 0, instrument.pianoRolls?.length ?? 0)
  const index = Math.max(0, Math.min(count - 1, variation))
  const roll = instrument.pianoRolls?.[index]
  if (roll) {
    return { pianoRolls: Array.from({ length: count }, (_, i) =>
      i === index ? mirrorRoll(roll) : instrument.pianoRolls?.[i] ?? null) }
  }
  const source = instrument.phrases?.length ? instrument.phrases : [instrument.notes]
  const phrases = Array.from({ length: count }, (_, i) => source[i] ?? source[i % source.length])
  const pattern = mirrorPattern(phrases[index])
  if (instrument.phrases?.length) {
    phrases[index] = pattern
    return { phrases, ...(index === 0 ? { notes: pattern } : {}) }
  }
  return { notes: pattern }
}

/** Rewrite pitches only in the selected bank; rhythmic mini-notation remains intact. */
export function randomizeVariation(instrument: Instrument, variation: number, random: () => number = Math.random): InstrumentPerformanceEdit {
  const rewrite = (notes: number[]) => randomDegrees(notes, random)
  return editVariation(instrument, variation, rewrite, rewrite)
}
