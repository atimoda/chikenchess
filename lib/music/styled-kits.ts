import { STYLE_PROFILES } from './kit-profiles/catalog'
export { STYLE_PROFILES } from './kit-profiles/catalog'
import { createCreativeSession, creativeSchema, type CreativeSession } from './creative'
import type { PianoRoll } from './piano-roll'
import { createManchesterJazzKit } from './manchester-kit'
export { MANCHESTER_JAZZ_REVISION } from './manchester-kit'
import type { CityData } from '../cities-data'
import type { PartProfile, ProfileSource, StyleProfile } from './kit-profiles/types'
import { beatsPerBar, groupStarts, type Meter } from './meter'
import { DEFAULT_SECTION_TYPE } from './arrangement'

export const STYLE_REVISION = 'styles-2026-10-02-midi-v5'
export const CITY_STYLE_REVISIONS: Record<string, string> = {
  'venice-1725': 'venice-2026-11-07-concerto-v1',
  'copenhagen-1869': 'copenhagen-2026-11-07-concerto-v1',
  'paris-1913': 'paris-2026-11-07-ballet-v1',
  'buenos-aires-1940': 'buenos-aires-2026-11-10-tango-v1',
  // World ballads rewrite: official kits authored by scripts/ballads/<city>.cjs.
  'manchester-1999': 'manchester-1999-2026-11-11-ballads-v2',
  'dublin-1990': 'dublin-1990-2026-11-11-ballads-v2',
  'new-orleans-1953': 'new-orleans-2026-11-11-ballads-v2',
  'memphis-1967': 'memphis-1967-2026-11-11-ballads-v2',
  'london-1977': 'london-1977-2026-11-11-ballads-v2',
  // Blues, Jazz & Rock rewrite: official kits authored by scripts/blues-jazz-rock/<id>.cjs.
  'chicago-1958': 'chicago-1958-2026-11-12-bjr-v1',
  'new-york-1930': 'new-york-1930-2026-11-12-bjr-v1',
  'paris-1945': 'paris-1945-2026-11-12-bjr-v1',
  'oakland-1959': 'oakland-1959-2026-11-12-bjr-v1',
  'new-york-1962': 'new-york-1962-2026-11-12-bjr-v1',
  'new-york-1961': 'new-york-1961-2026-11-12-bjr-v1',
  'london-1970': 'london-1970-2026-11-12-bjr-v1',
  'cambridge-1973': 'cambridge-1973-2026-11-12-bjr-v1',
  'jacksonville-1974': 'jacksonville-1974-2026-11-12-bjr-v1',
  'san-diego-1999': 'san-diego-1999-2026-11-12-bjr-v1',
  'san-francisco-1993': 'san-francisco-1993-2026-11-12-bjr-v1',
  'berkeley-2004': 'berkeley-2004-2026-11-12-bjr-v1',
  'columbus-2013': 'columbus-2013-2026-11-12-bjr-v1',
  'leipzig-1723': 'leipzig-2026-11-07-orchestra-v5',
  'vienna-1825': 'vienna-2026-11-07-orchestra-v5',
  vienna: 'vienna-2026-11-07-orchestra-v5',
  goa: 'goa-2026-11-06-design-v3',
  // Electronic World rewrite: profiles authored by scripts/electronic/<city>.py.
  dusseldorf: 'dusseldorf-2026-11-06-electronic-v3',
  nyc: 'nyc-2026-11-06-electronic-v4',
  chicago: 'chicago-2026-11-06-electronic-v3',
  detroit: 'detroit-2026-10-25-electronic-v2',
  ibiza: 'ibiza-2026-11-06-electronic-v4',
  manchester: 'manchester-2026-11-06-electronic-v4',
  berlin: 'berlin-2026-10-25-electronic-v2',
  tokyo: 'tokyo-2026-11-06-electronic-v3',
  london: 'london-2026-11-06-electronic-v4',
  saopaulo: 'saopaulo-2026-11-06-electronic-v3',
  johannesburg: 'johannesburg-2026-10-25-electronic-v2',
  paris: 'paris-2026-10-25-electronic-v2',
  bristol: 'bristol-2026-11-06-electronic-v3',
  croydon: 'croydon-2026-10-25-electronic-v2',
  durban: 'durban-2026-10-25-electronic-v2',
  // Brazilian rewrite: profiles authored by scripts/brazilian/<city>.py.
  'rio-1910': 'rio-1910-2026-10-25-brazilian-v1',
  'rio-1930': 'rio-1930-2026-10-25-brazilian-v1',
  'recife-1935': 'recife-1935-2026-10-25-brazilian-v1',
  'piracicaba-1940': 'piracicaba-1940-2026-10-25-brazilian-v1',
  'recife-1950': 'recife-1950-2026-10-25-brazilian-v1',
  'rio-1960': 'rio-1960-2026-10-25-brazilian-v1',
  'recife-1975': 'recife-1975-2026-10-25-brazilian-v1',
  'rio-1984': 'rio-1984-2026-10-26-brazilian-v2',
  'salvador-1992': 'salvador-1992-2026-10-25-brazilian-v1',
  'rio-1995': 'rio-1995-2026-10-26-brazilian-v2',
}

const SAMPLE_BANKS = { electro: 'chicken-electro-v1', jazz: 'chicken-jazz-v1', world: 'chicken-world-v1', strings: 'chicken-strings-v1', keys: 'chicken-keys-v1', synths: 'chicken-synths-v1', drums: 'chicken-drums-v1', sambaReggae: 'chicken-samba-reggae-v2', classical: 'chicken-classical-v1', band: 'chicken-band-v1', percussion: 'chicken-percussion-v1', guitars: 'chicken-guitars-v1', amps: 'chicken-amps-v1', voices: 'chicken-voices-v1', psytrance: 'chicken-psytrance-v1', machines: 'chicken-machines-v1', electronic: 'chicken-electronic-v1', brasil: 'chicken-brasil-v1', bateria: 'chicken-bateria-v1' } as const
import { parseProfileToken } from './profile-tokens'
const WHITE_SLOTS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e1', 'e2', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2'] as const

export function phraseRoll(text: string, bars: number, swing = 0, gate = .65, meter: Meter = '4/4'): PianoRoll {
  // Numeric seed motifs are authoring data; only the resulting rolls enter kits.
  const tokens = text.trim().split(/\s+/)
  const unit = bars / tokens.length
  const pulseSlots = tokens.length / bars / beatsPerBar(meter)
  const accent = (index: number) => {
    if (meter === '4/4') return index % 2 ? .72 : 1
    const slotsInBar = tokens.length / bars
    const phase = index % slotsInBar
    if (Math.abs(phase) < .001) return 1
    if ((meter.startsWith('5/') || meter.startsWith('7/')) && groupStarts(meter).some(start => Math.abs(phase / pulseSlots - start) < .001)) return .9
    if (Math.abs(phase / pulseSlots - Math.round(phase / pulseSlots)) < .001) return meter === '3/4' ? .77 : .84
    return .62
  }
  const starts = tokens.map((_, index) => (index + (index % 2 ? swing : 0)) * unit)
  const next = (index: number) => { const at = tokens.findIndex((token, i) => i > index && token !== '.'); return at < 0 ? bars : starts[at] }
  return { bars, notes: tokens.flatMap((token, index) => {
    const parsed = parseProfileToken(token)
    if (!parsed) return []
    const { marks } = parsed, start = starts[index]
    const duration = marks.legato ? next(index) - start : unit * gate
    return parsed.degrees.map(degree => ({ start, duration: Math.max(.01, Math.min(duration, bars - start)), degree, velocity: marks.velocity ?? accent(index),
      ...(marks.slide ? { slide: marks.slide, slideSeconds: .06 } : {}), ...(marks.chance !== undefined ? { chance: marks.chance } : {}),
      ...(marks.ratchet ? { ratchet: marks.ratchet } : {}), ...(marks.pan !== undefined ? { pan: marks.pan } : {}) }))
  }) }
}

export function profileSampleSource(source: ProfileSource) {
  if (source.kind === 'synth') return { kind: 'synth' as const }
  return { kind: 'sample' as const, bank: SAMPLE_BANKS[source.bank], asset: source.asset, variant: source.variant ?? 0, pitched: source.pitched ?? true }
}

function canonicalOrigin(origin: string, color: 'w' | 'b') {
  return color === 'w' ? origin : `${origin[0]}${9 - Number(origin[1])}`
}

function barsFor(part: PartProfile, variation: number) {
  return Array.isArray(part.bars) ? (part.bars[variation] ?? part.bars.at(-1) ?? 1) : (part.bars ?? 1)
}

function configurePart(kit: CreativeSession, piece: CreativeSession['pieces'][number], part: PartProfile, profile: StyleProfile) {
  const instrument = kit.instruments[piece.id]
  const arrangement = part.arrangement ?? {}
  const patterns = part.patterns.slice(0, 8)
  const pianoRolls = patterns.map((pattern, index) => {
    const roll = phraseRoll(pattern, barsFor(part, index), part.swing ?? profile.swing, part.gate ?? (part.behavior === 'sustain' ? .88 : .62), profile.meter)
    // Curated slide sources author pitch gestures directly into their MIDI notes.
    if (part.pitchEnvelope) roll.notes = roll.notes.map(note => ({ ...note, slide: part.pitchEnvelope, slideSeconds: part.pitchAttack ?? .15 }))
    return roll
  })
  Object.assign(instrument, {
    name: part.name, behavior: part.behavior, source: profileSampleSource(part.source), sound: part.source.kind === 'synth' ? part.source.sound : 'sine', pianoRolls,
    octave: part.octave ?? 3, gain: part.gain ?? .18, attack: part.attack ?? .008, decay: part.decay ?? .18, sustain: part.sustain ?? .6,
    release: part.release ?? .12, clip: part.clip ?? .9, lpf: part.lpf ?? 9000, hpf: part.hpf ?? 20,
    distortion: part.distortion, distortionMix: part.distortionMix, pitchAttack: part.pitchAttack,
    lpfRange: part.lpfRange, driveRange: part.driveRange, reverbRange: part.reverbRange, swingRange: part.swingRange,
    selectedVariation: undefined,
    ...part.design,
    arrangement: { restart: arrangement.restart ?? !(part.role === 'texture' || part.role === 'response'), sections: Object.fromEntries(kit.arrangement.sections.map((section, index) => [section.id, {
      // Profiles author presence as `active`; a kit stores an absent section as no variation.
      variation: arrangement.active?.[index] === false ? null : arrangement.variations?.[index] ?? index % patterns.length, transpose: arrangement.transpose?.[index] ?? 0,
      ...(typeof arrangement.fills?.[index] === 'number' ? { fill: arrangement.fills[index]! % patterns.length } : {}),
    }])) },
  })
  kit.effects[piece.id] = {
    gain: piece.color === 'w' ? 1 : .78, pitch: 1, pan: piece.color === 'w' ? -.1 : .1,
    delay: part.role === 'response' ? .14 : 0, reverb: part.role === 'rhythm' ? .025 : part.role === 'texture' ? .22 : .1, decay: .16, ...part.effects,
  }
  kit.mappings[piece.id] = {
    fileDegrees: part.role === 'rhythm' ? 0 : .25, rankDegrees: 0, panWidth: part.role === 'bass' ? .18 : .38, previewFilter: true, ...part.mapping,
  }
}

export function createStyledCityKit(city: CityData, profileOverride?: StyleProfile): CreativeSession {
  // The 1999 preset stays the fallback; an authored profile (scripts/ballads) builds the official kit.
  if (city.id === 'manchester-1999' && !profileOverride) return createManchesterJazzKit()
  const profile = profileOverride ?? STYLE_PROFILES[city.id]
  if (!profile) throw new Error(`Perfil ausente: ${city.id}`)
  if (profile.parts.length !== WHITE_SLOTS.length) throw new Error(`Perfil incompleto: ${city.id} tem ${profile.parts.length}/16 vozes.`)
  const kit = createCreativeSession()
  Object.assign(kit, { catalogRevision: CITY_STYLE_REVISIONS[city.id] ?? STYLE_REVISION, cityId: city.id, name: profile.name, bpm: profile.bpm, meter: profile.meter ?? '4/4', root: profile.root, scale: profile.scale,
    harmony: profile.harmonicSequences?.some(sequence => sequence?.length) ? 'kit' : profile.harmony, volume: .68, arrangement: { sections: profile.sections.map((beats, index) => ({
      id: `section-${String.fromCharCode(97 + index)}`, label: profile.sectionLabels?.[index] ?? DEFAULT_SECTION_TYPE, beats,
      ...(profile.harmonicSequences?.[index] ? { harmony: [...profile.harmonicSequences[index]] } : {}),
    })) } })
  if (profile.reactions) kit.reactions = structuredClone(profile.reactions)
  for (const piece of kit.pieces) {
    piece.active = piece.color === 'w'
    const slot = WHITE_SLOTS.indexOf(canonicalOrigin(piece.origin, piece.color) as typeof WHITE_SLOTS[number])
    if (slot < 0) throw new Error(`Casa canônica inválida: ${piece.origin}`)
    configurePart(kit, piece, profile.parts[slot], profile)
  }
  return creativeSchema.parse(kit)
}
