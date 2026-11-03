import { MAX_ROLL_NOTES, type PianoNote, type PianoRoll } from './piano-roll'

export type ArpOrder = 'up' | 'down' | 'updown' | 'played' | 'walk' | 'random' | 'chord'
export type ArpFeel = 'straight' | 'triplet' | 'dotted'
export const ARP_RATES = [4, 8, 16, 32] as const
export type ArpRate = typeof ARP_RATES[number]
export const ARP_MAX_STEPS = 32

/** Everything the Arpeggiator writes from: the notes of the source roll are the
 * "held chord"; the config decides order, speed, span and rhythm. */
export interface ArpConfig {
  order: ArpOrder
  rate: ArpRate
  feel: ArpFeel
  /** 1–4 octaves of the held notes, in scale degrees. */
  octaves: number
  /** Steps of the rhythm before it repeats (1–32). */
  length: number
  /** Note length as a share of the step (0.05–1). */
  gate: number
  /** Delay of the off-beat steps, 0–1 of half a step. */
  swing: number
  /** Chance (0–1) that each step adds chord tones above the arp note. */
  chord: number
  /** Chord tones added above: 0 = the same note an octave up, 1 or 2 = the next held notes. */
  above: 0 | 1 | 2
  /** Velocity per step (0 = rest), always 32 long; only the first `length` play. */
  rhythm: number[]
}

export const DEFAULT_ARP_CONFIG: ArpConfig = {
  order: 'updown', rate: 16, feel: 'straight', octaves: 1, length: 16, gate: .6, swing: 0, chord: 0, above: 1,
  rhythm: Array.from({ length: ARP_MAX_STEPS }, (_, index) => index % 4 === 0 ? 1 : index % 2 ? .6 : .8),
}

const clamp = (value: unknown, min: number, max: number, fallback: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback

/** Accepts anything (a saved preference) and returns a valid config. */
export function normalizeArpConfig(value: unknown): ArpConfig {
  const raw = (value && typeof value === 'object' ? value : {}) as Partial<Record<keyof ArpConfig, unknown>>
  const d = DEFAULT_ARP_CONFIG
  const orders: ArpOrder[] = ['up', 'down', 'updown', 'played', 'walk', 'random', 'chord']
  const feels: ArpFeel[] = ['straight', 'triplet', 'dotted']
  const rhythm = Array.isArray(raw.rhythm) ? raw.rhythm : d.rhythm
  return {
    order: orders.includes(raw.order as ArpOrder) ? raw.order as ArpOrder : d.order,
    rate: (ARP_RATES as readonly unknown[]).includes(raw.rate) ? raw.rate as ArpRate : d.rate,
    feel: feels.includes(raw.feel as ArpFeel) ? raw.feel as ArpFeel : d.feel,
    octaves: Math.round(clamp(raw.octaves, 1, 4, d.octaves)),
    length: Math.round(clamp(raw.length, 1, ARP_MAX_STEPS, d.length)),
    gate: clamp(raw.gate, .05, 1, d.gate),
    swing: clamp(raw.swing, 0, 1, d.swing),
    chord: clamp(raw.chord, 0, 1, d.chord),
    above: raw.above === 0 || raw.above === 2 ? raw.above : raw.above === 1 ? 1 : d.above,
    rhythm: Array.from({ length: ARP_MAX_STEPS }, (_, index) => clamp(rhythm[index], 0, 1, d.rhythm[index])),
  }
}

/** One step in bars: a 1/16 is a quarter of a quarter-note beat. */
export function arpStepBars(config: Pick<ArpConfig, 'rate' | 'feel'>, beatsPerBar: number) {
  const feel = config.feel === 'triplet' ? 2 / 3 : config.feel === 'dotted' ? 1.5 : 1
  return 4 / config.rate * feel / Math.max(1, beatsPerBar)
}

const MIN_DEGREE = -48, MAX_DEGREE = 48

/** Held notes of a roll: distinct degrees, ascending or in the order they first sound. */
export function arpHeldDegrees(roll: PianoRoll, played = false): number[] {
  const notes = [...roll.notes].sort((a, b) => played ? a.start - b.start || a.degree - b.degree : a.degree - b.degree)
  const held = [...new Set(notes.map(note => note.degree))]
  return held.length ? held : [0, 2, 4]
}

/** Rewrites a variation as an arpeggio of its own notes. Always reads from
 * `source`, so the result never feeds the next application. */
export function arpeggiate(source: PianoRoll, config: ArpConfig, { beatsPerBar, degreesPerOctave = 7, random = Math.random }: { beatsPerBar: number; degreesPerOctave?: number; random?: () => number }): PianoRoll {
  const octave = Math.max(1, Math.round(degreesPerOctave))
  const held = arpHeldDegrees(source, config.order === 'played')
  const span = (degrees: number[]) => Array.from({ length: config.octaves }, (_, o) => degrees.map(degree => degree + o * octave)).flat().filter(degree => degree >= MIN_DEGREE && degree <= MAX_DEGREE)
  const ascending = span([...held].sort((a, b) => a - b))
  const path = config.order === 'down' ? [...ascending].reverse()
    : config.order === 'updown' ? ascending.length > 2 ? [...ascending, ...ascending.slice(1, -1).reverse()] : ascending
    : config.order === 'played' ? span(held)
    : ascending
  // Articulation (pan, cutoff, vibrato) follows the held note of the same degree.
  const models = new Map<number, PianoNote>()
  for (const note of source.notes) if (!models.has(note.degree)) models.set(note.degree, note)
  const articulation = (degree: number) => {
    const model = models.get(degree) ?? models.get(held.find(h => ((degree - h) % octave + octave) % octave === 0) ?? NaN)
    if (!model) return {}
    const { pan, cutoff, vibrato } = model
    return { ...(pan === undefined ? {} : { pan }), ...(cutoff === undefined ? {} : { cutoff }), ...(vibrato === undefined ? {} : { vibrato }) }
  }
  // Held notes above `degree`, continuing in the next octaves when they run out.
  const base = [...held].sort((a, b) => a - b)
  const tonesAbove = (degree: number, count: number) => {
    const tones: number[] = []
    for (let k = Math.floor((degree - base[0]) / octave); tones.length < count && k < 16; k++)
      for (const h of base) if (h + k * octave > degree && tones.length < count) tones.push(h + k * octave)
    return tones
  }
  const step = arpStepBars(config, beatsPerBar)
  const slots = Math.floor(source.bars / step + 1e-6)
  const notes: PianoNote[] = []
  let played = 0, walk = 0, last = -1
  const nextIndex = () => {
    const count = path.length
    if (count <= 1) return 0
    if (config.order === 'walk') {
      if (played > 0) walk = walk === 0 ? 1 : walk === count - 1 ? count - 2 : walk + (random() < .5 ? -1 : 1)
      return walk
    }
    if (config.order === 'random') {
      let pick = Math.floor(random() * count)
      if (pick === last) pick = (pick + 1 + Math.floor(random() * (count - 1))) % count
      return last = pick
    }
    return played % count
  }
  for (let slot = 0; slot < slots; slot++) {
    const velocity = config.rhythm[slot % config.length] ?? 0
    if (velocity <= .02) continue
    const start = slot * step + (slot % 2 ? config.swing * step / 2 : 0)
    if (start >= source.bars - 1e-9) break
    const duration = Math.max(1 / 64, Math.min(step * config.gate, source.bars - start))
    if (start + duration > source.bars + 1e-9) continue
    const at = (degree: number, extra?: number) => ({ start, duration, degree, velocity: Math.round(velocity * 100) / 100, ...articulation(degree), ...(extra === undefined || extra >= 1 ? {} : { chance: extra }) })
    if (config.order === 'chord') {
      const shift = (played % config.octaves) * octave
      for (const degree of held) if (degree + shift <= MAX_DEGREE) notes.push(at(degree + shift))
    } else {
      const degree = path[nextIndex()]
      notes.push(at(degree))
      if (config.chord > 0) {
        const above = config.above === 0 ? [degree + octave] : tonesAbove(degree, config.above)
        for (const degree of above) if (degree <= MAX_DEGREE) notes.push(at(degree, config.chord))
      }
    }
    played++
  }
  return { ...source, notes: notes.slice(0, MAX_ROLL_NOTES) }
}
