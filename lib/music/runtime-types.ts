// Shared data contracts. This module has no browser or audio initialization.
import type { Square } from 'chess.js'
import type { SquareEffects } from '../types'
import type { Performance } from './performance'
import type { PianoRoll } from './piano-roll'
import type { Reactions, ReactionContext } from './reactions'
import type { TeamMixes } from './team-mixer'
import type { Instrument, MovementMapping, MusicPiece } from './model'
import type { Automations } from './automation'
import type { Groove, GrooveLane } from './grooves'
import type { HarmonyPlanId } from './harmony'

export type Strudel = typeof import('@strudel/web')
export type StrudelPattern = ReturnType<Strudel['note']>
export type StrudelWithPick = Strudel & {
  pick: (lookup: StrudelPattern[], selector: string) => StrudelPattern
  pickRestart: (lookup: StrudelPattern[], selector: string) => StrudelPattern
}

export interface MusicSnapshot {
  reactionDescriptions?: string[]
  reactionInput?: {config: Reactions; context: ReactionContext; scope: string; lockedBpm?: number}

  sectionOverrides?: Record<string, number>
  harmony?: HarmonyPlanId
  pieces: MusicPiece[]
  scale: string[]
  bpm: number
  volume: number
  playing: boolean
  effects: Record<string, SquareEffects>
  instruments?: Record<string, Instrument>
  mappings?: Record<string, MovementMapping>
  title?: string
  sectionPattern?: string
  soloId?: string | null
  grooves?: Record<string, Groove>
  teamMixes?: TeamMixes
  tuning?: number
}
export interface Preview { id: string; square: Square; mode?: 'manual' | 'pattern' }
export interface MusicPulse { id: string; square: Square; preview: boolean; duration: number }
export interface VoiceSpec {
  performance?: Performance

  key: string
  piece: MusicPiece
  square: Square
  preview: boolean
  manual: boolean
  orbit: number
  notes: string
  phrases: string[]
  pianoRolls?: (PianoRoll | null)[]
  sectionPattern: string
  mask?: string
  controls: Record<string, number | string>
  instrument: Instrument
  unpitched: boolean
  groove?: GrooveLane
  automations?: Automations
}
