import { STYLE_PROFILES } from './kit-profiles/catalog'
export { STYLE_PROFILES } from './kit-profiles/catalog'
import { createCreativeSession, creativeSchema, type CreativeSession } from './creative'
import type { PianoRoll } from './piano-roll'
import { createManchesterJazzKit } from './manchester-kit'
import type { CityData } from '../cities-data'
import type { PartProfile, ProfileSource, StyleProfile } from './kit-profiles/types'

export const STYLE_REVISION = 'styles-2026-09-21-v2'

const SAMPLE_BANKS = { electro: 'chicken-electro-v1', jazz: 'chicken-jazz-v1', world: 'chicken-world-v1' } as const
const WHITE_SLOTS = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'd1', 'd2', 'e1', 'e2', 'f1', 'f2', 'g1', 'g2', 'h1', 'h2'] as const

export function phraseRoll(text: string, bars: number, swing = 0, gate = .65): PianoRoll {
  const tokens = text.trim().split(/\s+/)
  const unit = bars / tokens.length
  return { bars, notes: tokens.flatMap((token, index) => token === '.' ? [] : token.split(',').map(degree => {
    const start = (index + (index % 2 ? swing : 0)) * unit
    return { start, duration: Math.max(.01, Math.min(unit * gate, bars - start)), degree: Number(degree), velocity: index % 2 ? .72 : 1 }
  })) }
}

function profileSource(source: ProfileSource) {
  if (source.kind === 'synth') return { kind: 'synth' as const }
  return { kind: 'sample' as const, bank: SAMPLE_BANKS[source.bank], asset: source.asset, variant: source.variant ?? 0, pitched: source.pitched ?? true }
}

function canonicalOrigin(origin: string, color: 'w' | 'b') {
  return color === 'w' ? origin : `${origin[0]}${9 - Number(origin[1])}`
}

function sectionPattern(sections: number[]) {
  const total = sections.reduce((sum, beats) => sum + beats, 0)
  return `[${sections.map((beats, index) => `${Math.min(index, 3)}@${beats}`).join(' ')}]/${total / 4}`
}

function barsFor(part: PartProfile, variation: number) {
  return Array.isArray(part.bars) ? (part.bars[variation] ?? part.bars.at(-1) ?? 1) : (part.bars ?? 1)
}

function configurePart(kit: CreativeSession, piece: CreativeSession['pieces'][number], part: PartProfile, profile: StyleProfile) {
  const instrument = kit.instruments[piece.id]
  const arrangement = part.arrangement ?? {}
  const patterns = Array.from({ length: 4 }, (_, index) => part.patterns[index] ?? part.patterns.at(-1) ?? '0')
  Object.assign(instrument, {
    name: part.name, behavior: part.behavior, source: profileSource(part.source), sound: part.source.kind === 'synth' ? part.source.sound : 'sine', notes: '0',
    pianoOnly: true, phrases: ['~', '~', '~', '~'],
    pianoRolls: patterns.map((pattern, index) => phraseRoll(pattern, barsFor(part, index), part.swing ?? profile.swing, part.gate ?? (part.behavior === 'sustain' ? .88 : .62))),
    octave: part.octave ?? 3, gain: part.gain ?? .18, attack: part.attack ?? .008, decay: part.decay ?? .18, sustain: part.sustain ?? .6,
    release: part.release ?? .12, clip: part.clip ?? .9, lpf: part.lpf ?? 9000, hpf: part.hpf ?? 20,
    distortion: part.distortion, distortionMix: part.distortionMix, pitchEnvelope: part.pitchEnvelope, pitchAttack: part.pitchAttack,
    mask: undefined, groove: undefined, selectedVariation: undefined, automations: part.automations,
    performance: { restart: arrangement.restart ?? !(part.role === 'texture' || part.role === 'response'), steps: profile.sections.map((beats, index) => ({
      beats, variation: arrangement.variations?.[index] ?? Math.min(index, 3), transpose: arrangement.transpose?.[index] ?? 0, active: arrangement.active?.[index] ?? true,
    })) },
  })
  kit.effects[piece.id] = {
    gain: piece.color === 'w' ? 1 : .78, pitch: 1, pan: piece.color === 'w' ? -.1 : .1,
    delay: part.role === 'response' ? .14 : 0, reverb: part.role === 'rhythm' ? .025 : part.role === 'texture' ? .22 : .1, decay: .16, ...part.effects,
  }
  kit.mappings[piece.id] = {
    fileDegrees: part.role === 'rhythm' ? 0 : .25, rankDegrees: 0, panWidth: part.role === 'bass' ? .18 : .38, previewFilter: true, ...part.mapping,
  }
}

function enrichManchesterJazzKit(kit: CreativeSession) {
  kit.catalogRevision = STYLE_REVISION
  kit.harmony = 'cadence'
  kit.sectionPattern = '[0@16 1@24 2@12 3@24]/19'
  const sections = [16, 24, 12, 24]
  for (const piece of kit.pieces) {
    const instrument = kit.instruments[piece.id]
    const file = piece.origin.charCodeAt(0) - 97
    const isPulse = instrument.behavior === 'pulse'
    const active = isPulse ? [true, file < 6, file < 3, true] : piece.type === 'q' ? [false, true, false, true] : piece.type === 'k' ? [true, true, true, true] : [file % 2 === 0, true, file % 2 === 1, true]
    instrument.performance = { restart: instrument.behavior !== 'sustain', steps: sections.map((beats, index) => ({ beats, variation: index, transpose: index === 2 && !isPulse ? 2 : 0, active: active[index] })) }
    if (piece.origin[0] === 'd') instrument.automations = { ...instrument.automations, penv: { kind: 'pattern', patterns: ['0', '0', '0', '<0 0 0 -2>'] }, patt: { kind: 'pattern', patterns: ['.09'] } }
  }
  return creativeSchema.parse(kit)
}

export function createStyledCityKit(city: CityData): CreativeSession {
  if (city.id === 'manchester-1999') return enrichManchesterJazzKit(createManchesterJazzKit())
  const profile = STYLE_PROFILES[city.id]
  if (!profile) throw new Error(`Perfil ausente: ${city.id}`)
  if (profile.parts.length !== WHITE_SLOTS.length) throw new Error(`Perfil incompleto: ${city.id} tem ${profile.parts.length}/16 vozes.`)
  const kit = createCreativeSession()
  Object.assign(kit, { catalogRevision: STYLE_REVISION, cityId: city.id, name: profile.name, bpm: profile.bpm, root: profile.root, scale: profile.scale,
    harmony: profile.harmony, volume: .68, grooves: {}, sectionPattern: sectionPattern(profile.sections) })
  for (const piece of kit.pieces) {
    piece.active = piece.color === 'w'
    const slot = WHITE_SLOTS.indexOf(canonicalOrigin(piece.origin, piece.color) as typeof WHITE_SLOTS[number])
    if (slot < 0) throw new Error(`Casa canônica inválida: ${piece.origin}`)
    configurePart(kit, piece, profile.parts[slot], profile)
  }
  return creativeSchema.parse(kit)
}
