import type { CityData } from '../cities-data'
import { createCreativeSession, creativeSchema, ROOTS, SCALES, type CreativeSession } from './creative'
import { noteRoll, type PianoRoll } from './piano-roll'
import { beatsPerBar } from './meter'
import { SECTION_TYPES, type SectionType } from './arrangement'
import { HARMONY_PLAN_IDS } from './harmony'
import { STYLE_PROFILES, profileSampleSource } from './styled-kits'
import type { PartRole, ProfileSource } from './kit-profiles/types'
import { sampleAsset } from './sample-banks'

// Versioned seed keeps a generated kit reproducible for tests and shared links.
// Each "New random kit" click supplies a different seed.
function seededRandom(seed: string) {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  return () => {
    state |= 0
    state = state + 0x6D2B79F5 | 0
    let n = Math.imul(state ^ state >>> 15, 1 | state)
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n)
    return ((n ^ n >>> 14) >>> 0) / 4294967296
  }
}

type Sample = Extract<ReturnType<typeof profileSampleSource>, { kind: 'sample' }>
type Candidate = { name: string; source: Sample }
type Category = 'percussion' | 'bass' | 'keys' | 'winds' | 'strings' | 'lead' | 'pad' | 'bell'

const PATTERNS: Record<Exclude<Category, 'percussion' | 'bass'>, RegExp> = {
  keys: /piano|rhodes|organ|harpsichord|accordion|keys|marimba|vibra|celesta|clav/,
  winds: /sax|trompete|trumpet|trombone|flute|horn|recorder|clarinet|wavetable|brass|lead/,
  strings: /violin|cello|viola|nylon|steel|clean|muted|guitar|strings|harp|cavaquinho|banjo/,
  lead: /sax|trompete|trumpet|flute|violin|clean|steel|wavetable|lead|marimba|piano/,
  pad: /pad|sustain|organ|choir/,
  bell: /bell|marimba|vibra|celesta|glock|harpsichord|pizzicato|kalimba/,
}
const MELODIC_ROLES: PartRole[] = ['harmony', 'melody', 'response', 'texture']

function candidatesFor(cityId: string | undefined): Record<Category | 'extraPercussion', Candidate[]> {
  const profiles = cityId && STYLE_PROFILES[cityId as keyof typeof STYLE_PROFILES] ? [STYLE_PROFILES[cityId as keyof typeof STYLE_PROFILES]] : []
  const all = Object.values(STYLE_PROFILES)
  const collect = (sources: typeof all, test: (role: PartRole, source: ProfileSource & { kind: 'sample' }) => boolean) => {
    const seen = new Set<string>(), found: Candidate[] = []
    for (const profile of sources) for (const part of profile.parts) {
      if (part.source.kind !== 'sample' || !test(part.role, part.source)) continue
      const source = profileSampleSource(part.source) as Sample
      // One entry per sound: articulations of the same sample would make two pawns sound alike.
      const key = `${source.bank}/${source.asset}`
      if (!seen.has(key)) { seen.add(key); found.push({ name: sampleAsset(source)?.name ?? part.name, source }) }
    }
    return found
  }
  // Melodic roles only borrow the city's own samples; a role its style lacks plays a synth.
  // Without a style profile (Manchester 1999) the whole catalog is the pool.
  const pool = (test: Parameters<typeof collect>[1]) => collect(profiles.length ? profiles : all, test)
  const melodic = (pattern: RegExp) => pool((role, source) => MELODIC_ROLES.includes(role) && source.pitched !== false && pattern.test(source.asset) && !/bass/.test(source.asset))
  return {
    percussion: collect(profiles.length ? profiles : all, role => role === 'rhythm'),
    extraPercussion: collect(all, role => role === 'rhythm'),
    bass: pool((role, source) => role === 'bass' && source.pitched !== false),
    keys: melodic(PATTERNS.keys), winds: melodic(PATTERNS.winds), strings: melodic(PATTERNS.strings),
    lead: melodic(PATTERNS.lead), pad: melodic(PATTERNS.pad), bell: melodic(PATTERNS.bell),
  }
}

type PercussionKind = 'low' | 'backbeat' | 'pulse' | 'color'
function percussionKind(asset: string): PercussionKind {
  if (/kick|surdo|bass-drum|timpani|low/.test(asset)) return 'low'
  if (/snare|clap|rim|brush|caixa|repique/.test(asset)) return 'backbeat'
  if (/hat|shaker|ride|tamb|agogo|crash|cymbal|ganza|caxixi/.test(asset)) return 'pulse'
  return 'color'
}

/** A brand-new kit: every parameter is drawn again, States & Events stay empty. */
export function createRandomCityKit(city: CityData, variation = '01'): CreativeSession {
  const random = seededRandom(`random-kit-v2:${city.id}:${variation}`)
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
  const between = (min: number, max: number) => Math.round((min + random() * (max - min)) * 1000) / 1000
  const chance = (p: number) => random() < p
  const shuffle = <T,>(items: readonly T[]) => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  const pools = candidatesFor(city.id)
  const kit = createCreativeSession()
  kit.cityId = city.id
  kit.meter = city.meter ?? '4/4'
  kit.name = `${city.name} · Random ${variation}`.slice(0, 80)
  kit.bpm = Math.max(60, Math.min(180, Math.round(city.bpm + between(-25, 25))))
  kit.volume = between(.65, .8)
  kit.root = pick(ROOTS)
  kit.scale = pick(Object.keys(SCALES) as Array<keyof typeof SCALES>)
  kit.harmony = pick(HARMONY_PLAN_IDS)
  const beats = beatsPerBar(kit.meter)
  const sectionCount = 4 + Math.floor(random() * 4)
  const types: SectionType[] = ['Intro', ...Array.from({ length: sectionCount - 2 }, () => pick(SECTION_TYPES.filter(type => type !== 'Intro' && type !== 'Outro'))), 'Outro']
  kit.arrangement = { sections: types.map((label, index) => ({
    id: `section-${String.fromCharCode(97 + index)}`, label, beats: pick([2, 4, 4, 8]) * beats,
  })) }

  const cellsPerBar = beats * 2
  const velocity = (roll: PianoRoll, min = .55) => ({ ...roll, notes: roll.notes.map(note => ({ ...note, velocity: between(min, 1) })) })
  const ensure = <T,>(cells: (T | null)[], fallback: T) => cells.some(cell => cell !== null) ? cells : [fallback, ...cells.slice(1)]
  const percussionCells = (kind: PercussionKind) => {
    const cells: (number | null)[] = Array.from({ length: cellsPerBar }, (_, index) => {
      const onBeat = index % 2 === 0, beat = index / 2
      if (kind === 'low') return onBeat && (beat === 0 || chance(.55)) ? 0 : chance(.12) ? 0 : null
      if (kind === 'backbeat') return onBeat && beat % 2 === 1 ? (chance(.9) ? 0 : null) : chance(.1) ? 0 : null
      if (kind === 'pulse') return chance(onBeat ? .55 : .8) ? 0 : null
      return chance(.25) ? 0 : null
    })
    return ensure(cells, 0)
  }
  const walk = (length: number, density: number, low: number, high: number) => {
    let degree = Math.round(between(low, high))
    return ensure(Array.from({ length }, () => {
      if (!chance(density)) return null
      degree = Math.max(low, Math.min(high, degree + pick([-2, -1, -1, 0, 1, 1, 2, 3])))
      return degree
    }), 0)
  }
  // Sustained voices build their chords from each written note, so the roll holds single degrees.
  const chordRoot = () => pick([0, 0, 1, 3, 4, 5, -2])
  const rolls = (count: number, make: () => PianoRoll) => Array.from({ length: count }, make)

  type Voice = { category: Category; behavior: CreativeSession['instruments'][string]['behavior']; label: string }
  // Fixed band roles per chess piece; the queen draws one of three lead roles per kit.
  const queen = pick<Voice>([
    { category: 'lead', behavior: 'phrase', label: 'Lead melody' },
    { category: 'pad', behavior: 'sustain', label: 'Pad' },
    { category: 'bell', behavior: 'phrase', label: 'Countermelody' },
  ])
  const voiceFor = (type: CreativeSession['pieces'][number]['type']): Voice => ({
    p: { category: 'percussion', behavior: 'pulse', label: 'Percussion' },
    n: { category: 'bass', behavior: 'phrase', label: 'Bass' },
    b: { category: 'keys', behavior: 'sustain', label: 'Keys' },
    r: { category: 'winds', behavior: 'phrase', label: 'Winds' },
    k: { category: 'strings', behavior: chance(.5) ? 'sustain' : 'phrase', label: 'Strings' },
    q: queen,
  } as const)[type]

  // Pawns get eight different percussion sounds, the city's own first; the catalog fills the rest.
  const own = shuffle(pools.percussion).slice(0, 8)
  const ownNames = new Set(own.map(item => item.name))
  const percussion = [...own, ...shuffle(pools.extraPercussion.filter(item => !ownNames.has(item.name)))].slice(0, 8)
  const pawnFiles = 'abcdefgh'
  const blackOf = (origin: string) => `${origin[0]}${9 - Number(origin[1])}`
  const whiteVoices = new Map<string, Voice & { candidate?: Candidate }>()
  for (const piece of kit.pieces.filter(item => item.color === 'w')) {
    const voice = piece.type === 'k' ? voiceFor('k') : voiceFor(piece.type)
    const candidate = voice.category === 'percussion'
      ? percussion[pawnFiles.indexOf(piece.origin[0]) % Math.max(1, percussion.length)]
      : pools[voice.category].length && chance(.8) ? pick(pools[voice.category]) : undefined
    whiteVoices.set(piece.origin, { ...voice, candidate })
  }

  for (const piece of kit.pieces) {
    const voice = whiteVoices.get(piece.color === 'w' ? piece.origin : blackOf(piece.origin))!
    const instrument = kit.instruments[piece.id]
    const effects = kit.effects[piece.id]
    const { category, behavior } = voice
    const pitched = category !== 'percussion'
    piece.active = piece.color === 'w'
    Object.assign(effects, {
      gain: between(.8, 1.1), pitch: pitched ? 1 : between(.9, 1.1), pan: between(-.35, .35),
      delay: category === 'percussion' || category === 'bass' ? between(0, .1) : between(0, .3),
      reverb: category === 'bass' ? between(0, .1) : category === 'pad' ? between(.25, .5) : between(.03, .3), decay: between(.08, .3),
    })
    kit.mappings[piece.id] = {
      fileDegrees: pitched ? pick([-1, -.5, 0, .5, 1]) : 0, rankDegrees: pitched ? pick([-.5, 0, .5, 1]) : 0,
      panWidth: between(.1, .6), previewFilter: chance(.75),
    }
    const variations = 2 + Math.floor(random() * 3)
    const sample = voice.candidate?.source
    let pianoRolls: PianoRoll[]
    if (category === 'percussion') {
      const kind = percussionKind(sample?.asset ?? 'color')
      pianoRolls = rolls(variations, () => velocity(noteRoll(percussionCells(kind), 1, .25)))
    } else if (category === 'bass') {
      pianoRolls = rolls(variations, () => velocity(noteRoll(walk(cellsPerBar, between(.35, .7), -3, 4), 1, between(.45, .85))))
    } else if (behavior === 'sustain') {
      const hits = pick([1, 2, 4])
      pianoRolls = rolls(variations, () => velocity(noteRoll(Array.from({ length: hits }, (_, index) => index === 0 || chance(.75) ? chordRoot() : null), 2, .95), .5))
    } else {
      const length = cellsPerBar * (category === 'lead' ? 2 : 1)
      pianoRolls = rolls(variations, () => velocity(noteRoll(walk(length, category === 'bell' ? between(.25, .45) : between(.4, .75), -2, 7), category === 'lead' ? 2 : 1, between(.5, .9))))
    }
    Object.assign(instrument, {
      name: `${voice.label} · ${voice.candidate?.name ?? 'synth'}`.slice(0, 60),
      behavior,
      source: sample ? { ...sample, pitched: pitched && sample.pitched } : { kind: 'synth' },
      sound: pick(category === 'bass' ? ['sine', 'triangle', 'sawtooth', 'square'] as const
        : category === 'pad' ? ['supersaw', 'triangle', 'sawtooth'] as const
        : category === 'percussion' ? ['sbd', 'white', 'pink'] as const : ['sine', 'triangle', 'square', 'sawtooth'] as const),
      pianoRolls,
      octave: category === 'percussion' ? 2 : category === 'bass' ? 2 : category === 'keys' || category === 'pad' ? 3 : pick([4, 5]),
      gain: category === 'percussion' ? between(.2, .5) : category === 'bass' ? between(.28, .44) : behavior === 'sustain' ? between(.1, .2) : between(.18, .3),
      attack: category === 'percussion' ? between(.001, .01) : behavior === 'sustain' ? between(.05, .6) : between(.003, .08),
      decay: between(.05, .5),
      sustain: category === 'percussion' ? 1 : behavior === 'sustain' ? between(.5, .85) : between(.2, .7),
      release: category === 'percussion' ? between(.03, .12) : behavior === 'sustain' ? between(.2, .8) : between(.04, .3),
      clip: category === 'percussion' ? between(.7, 1) : behavior === 'sustain' ? between(.8, .98) : between(.4, .9),
      lpf: category === 'bass' ? Math.round(between(600, 2500)) : Math.round(between(2500, 16000)),
      hpf: category === 'bass' ? 20 : Math.round(between(20, 180)),
      playChance: category === 'percussion' && chance(.3) ? between(.75, 1) : undefined,
      extraSwing: chance(.3) ? between(0, .12) : undefined,
      selectedVariation: undefined,
      lpfRange: undefined, reverbRange: undefined, driveRange: undefined, swingRange: undefined, octaveRange: undefined,
    })
    instrument.arrangement = { restart: chance(.7), sections: Object.fromEntries(kit.arrangement.sections.map((section, index) => {
      const variation = Math.floor(random() * pianoRolls.length)
      // The intro and outro thin the band out; the middle sections keep most voices.
      const present = index === 0 || index === kit.arrangement.sections.length - 1 ? chance(.45) : chance(.8)
      return [section.id, { variation: present ? variation : null, transpose: 0 }]
    })) }
  }
  return creativeSchema.parse(JSON.parse(JSON.stringify(kit)))
}
