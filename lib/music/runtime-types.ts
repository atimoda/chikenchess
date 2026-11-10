// Shared data contracts. This module has no browser or audio initialization.
import type { DuckTrigger, PanLfo } from './sound-design'
import type { Square } from 'chess.js'
import type { SquareEffects } from '../types'
import type { Performance } from './performance'
import type { Arrangement } from './arrangement'
import type { HarmonicConfig } from './harmonic-pattern'
import type { PianoRoll } from './piano-roll'
import type { Reactions, ReactionContext } from './reactions'
import type { TeamMixes } from './team-mixer'
import type { Instrument, MovementMapping, MusicPiece } from './model'
import type { HarmonyPlanId } from './harmony'
import type { SectionBounds } from './section-params'
import type { Meter } from './meter'

export type Strudel = typeof import('@strudel/web')
export type StrudelPattern = ReturnType<Strudel['note']>
export type StrudelWithPick = Strudel & {
  pick: (lookup: StrudelPattern[], selector: string | StrudelPattern) => StrudelPattern
  pickRestart: (lookup: StrudelPattern[], selector: string | StrudelPattern) => StrudelPattern
}

export interface MusicSnapshot {
  reactionDescriptions?: string[]
  reactionInput?: {config: Reactions; context: ReactionContext; scope: string; lockedBpm?: number}

  sectionOverrides?: Record<string, number>
  harmony?: HarmonyPlanId
  arrangement?: Arrangement
  pieces: MusicPiece[]
  scale: string[]
  bpm: number
  meter?: Meter
  volume: number
  playing: boolean
  effects: Record<string, SquareEffects>
  instruments?: Record<string, Instrument>
  mappings?: Record<string, MovementMapping>
  title?: string
  soloId?: string | null
  soloIds?: string[]
  teamMixes?: TeamMixes
  tuning?: number
}
export interface Preview { id: string; square: Square; mode?: 'manual' | 'pattern' }
export interface MusicPulse { id: string; square: Square; preview: boolean; duration: number }
export interface VoiceSpec {
  harmonic?: HarmonicConfig
  performance?: Performance
  beatsPerBar?: number

  key: string
  piece: MusicPiece
  square: Square
  preview: boolean
  manual: boolean
  previewFilterLimit?: number
  orbit: number
  pianoRolls: PianoRoll[]
  sectionPattern: string
  controls: Record<string, number | string>
  instrument: Instrument
  unpitched: boolean
  /** Pan LFO as a Strudel signal (the other LFO targets are plain controls). */
  panLfo?: PanLfo
  /** This voice's hits duck these buses. */
  duck?: DuckTrigger
  /** The voice owns its bus. Its output gain is left to sidechain ducking; volume sits on a node after it. */
  ownBus?: boolean
  /** Per section (by performance step): the sound of a section that changes parameters. */
  sections?: (SectionVoice | undefined)[]
  /** Some section changes Play chance: each section bank applies its own chance. */
  sectionChance?: boolean
}
export interface SectionVoice {
  instrument: Instrument
  controls: Record<string, number | string>
  panLfo?: PanLfo
  bounds: SectionBounds
}
