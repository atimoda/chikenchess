import type { CreativeSession } from '../creative'
import type { Meter } from '../meter'
import type { Behavior, MovementMapping, ParameterRange } from '../model'

export type PartRole = 'rhythm' | 'bass' | 'harmony' | 'melody' | 'response' | 'texture'
export type SynthSound = 'sbd' | 'sine' | 'triangle' | 'square' | 'sawtooth' | 'supersaw' | 'white' | 'pink' | 'brown'
export type SampleBank = 'electro' | 'jazz' | 'world' | 'strings' | 'keys' | 'synths' | 'drums' | 'sambaReggae' | 'classical' | 'band' | 'percussion' | 'guitars'

export type ProfileSource =
  | { kind: 'synth'; sound: SynthSound }
  | { kind: 'sample'; bank: SampleBank; asset: string; variant?: number; pitched?: boolean }

export type SectionArrangement = {
  active?: boolean[]
  variations?: number[]
  transpose?: number[]
  restart?: boolean
}

export type PartProfile = {
  role: PartRole
  name: string
  behavior: Behavior
  source: ProfileSource
  patterns: string[]
  bars?: number | number[]
  swing?: number
  gate?: number
  octave?: number
  gain?: number
  attack?: number
  decay?: number
  sustain?: number
  release?: number
  clip?: number
  lpf?: number
  hpf?: number
  distortion?: number
  distortionMix?: number
  pitchEnvelope?: number
  pitchAttack?: number
  lpfRange?: ParameterRange
  driveRange?: ParameterRange
  reverbRange?: ParameterRange
  swingRange?: ParameterRange
  arrangement?: SectionArrangement
  effects?: Partial<{ gain: number; pitch: number; pan: number; delay: number; reverb: number; decay: number }>
  mapping?: Partial<MovementMapping>
}

export type StyleProfile = {
  name: string
  bpm: number
  meter?: Meter
  root: CreativeSession['root']
  scale: CreativeSession['scale']
  harmony: CreativeSession['harmony']
  harmonicSequences?: number[][]
  swing: number
  sections: number[]
  parts: PartProfile[]
  reference: string
  url: string
}

export const electro = (asset: string, variant = 0, pitched = false): ProfileSource => ({ kind: 'sample', bank: 'electro', asset, variant, pitched })
export const jazz = (asset: string, variant = 0, pitched = true): ProfileSource => ({ kind: 'sample', bank: 'jazz', asset, variant, pitched })
export const world = (asset: string, variant = 0, pitched = true): ProfileSource => ({ kind: 'sample', bank: 'world', asset, variant, pitched })
export const strings = (asset: string, variant = 0, pitched = true): ProfileSource => ({ kind: 'sample', bank: 'strings', asset, variant, pitched })
export const keys = (asset: string, variant = 0, pitched = true): ProfileSource => ({ kind: 'sample', bank: 'keys', asset, variant, pitched })
export const synths = (asset: string, variant = 0, pitched = true): ProfileSource => ({ kind: 'sample', bank: 'synths', asset, variant, pitched })
export const drums = (asset: string, variant = 0, pitched = false): ProfileSource => ({ kind: 'sample', bank: 'drums', asset, variant, pitched })
export const classical = (asset: string, variant = 0, pitched = true): ProfileSource => ({ kind: 'sample', bank: 'classical', asset, variant, pitched })
export const band = (asset: string, variant = 0): ProfileSource => ({ kind: 'sample', bank: 'band', asset, variant, pitched: true })
export const percussion = (asset: string, variant = 0): ProfileSource => ({ kind: 'sample', bank: 'percussion', asset, variant, pitched: false })
export const guitars = (asset: string, variant = 0): ProfileSource => ({ kind: 'sample', bank: 'guitars', asset, variant, pitched: true })
export const synth = (sound: SynthSound): ProfileSource => ({ kind: 'synth', sound })

type PartOptions = Omit<Partial<PartProfile>, 'role' | 'name' | 'behavior' | 'source' | 'patterns'>

export function rhythm(name: string, source: ProfileSource, patterns: string[], options: PartOptions = {}): PartProfile {
  return { role: 'rhythm', name, behavior: 'pulse', source, patterns, bars: 1, octave: 2, gain: .2, attack: .002, release: .045, lpf: 12000, hpf: 20, ...options }
}

export function voice(role: Exclude<PartRole, 'rhythm'>, name: string, source: ProfileSource, patterns: string[], options: PartOptions = {}): PartProfile {
  const sustaining = role === 'harmony' || role === 'texture'
  return {
    role, name, behavior: sustaining ? 'sustain' : 'phrase', source, patterns,
    bars: sustaining ? 2 : 1, octave: role === 'bass' ? 2 : role === 'melody' ? 4 : 3,
    gain: role === 'bass' ? .3 : sustaining ? .12 : .18,
    attack: sustaining ? .18 : .008, release: sustaining ? .35 : .12,
    decay: .2, sustain: sustaining ? .72 : .55, clip: .9, lpf: sustaining ? 4200 : 7000, hpf: role === 'bass' ? 25 : 100,
    ...options,
  }
}
