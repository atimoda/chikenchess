import type { PieceArrangement } from './arrangement'
import type { PianoRoll } from './piano-roll'
import { noteRoll } from './piano-roll'
import { Chess, type Move, type PieceSymbol, type Square } from 'chess.js'
import type { SampleSource } from './sample-banks'

export type Behavior = 'pulse' | 'phrase' | 'sustain'
export type RangeFrequency = 'fixed' | 'loop' | 'section' | 'note'
export interface ParameterRange { first: number; second: number; frequency?: RangeFrequency }
export interface MusicPiece {
  id: string
  slot: number
  origin: Square
  square: Square
  type: PieceSymbol
  color: 'w' | 'b'
  active: boolean
  activation?: 'move' | 'check'
  checkEnsemble?: boolean
}
export interface Instrument {
  name: string
  behavior: Behavior
  sound: string
  octave: number
  octaveRange?: ParameterRange
  driveRange?: ParameterRange
  reverbRange?: ParameterRange
  swingRange?: ParameterRange
  lpfRange?: ParameterRange
  gain: number
  attack: number
  release: number
  lpf: number
  hpf: number
  decay?: number
  sustain?: number
  clip?: number
  pianoRolls: PianoRoll[]
  selectedVariation?: number
  loopEnabled?: boolean
  arrangement?: PieceArrangement
  distortion?: number
  distortionMix?: number
  playChance?: number
  pitchEnvelope?: number
  pitchAttack?: number
  extraSwing?: number
  source?: { kind: 'synth' } | SampleSource
}

export interface MovementMapping {
  fileDegrees: number
  rankDegrees: number
  panWidth: number
  previewFilter: boolean
}

export type InstrumentPerformanceEdit = Partial<Pick<Instrument, 'octave' | 'octaveRange' | 'driveRange' | 'reverbRange' | 'swingRange' | 'lpfRange' | 'attack' | 'sustain' | 'release' | 'clip' | 'distortion' | 'playChance' | 'pitchEnvelope' | 'pitchAttack' | 'extraSwing' | 'pianoRolls' | 'selectedVariation' | 'loopEnabled' | 'arrangement'>>

export const DEFAULT_MOVEMENT: MovementMapping = {
  fileDegrees: 1, rankDegrees: 0.5, panWidth: 0.5, previewFilter: true,
}

const drums: Instrument[] = [
  { name: 'Bumbo', sound: 'sbd', pianoRolls: [noteRoll([0,0,0,0])], lpf: 900, hpf: 0 },
  { name: 'Caixa', sound: 'white', pianoRolls: [noteRoll([null,0,null,0])], lpf: 6500, hpf: 1200 },
  { name: 'Chimbal', sound: 'white', pianoRolls: [noteRoll([0,0,0,0,0,0,0,0])], lpf: 14000, hpf: 7000 },
  { name: 'Clap eletrônico', sound: 'pink', pianoRolls: [noteRoll([null,0,null,0,null,null])], lpf: 6000, hpf: 1800 },
  { name: 'Tom', sound: 'sine', pianoRolls: [noteRoll([null,null,0,null,null,null,0,2],2)], lpf: 1500, hpf: 0 },
  { name: 'Chimbal aberto', sound: 'white', pianoRolls: [noteRoll([null,0,null,0])], lpf: 12000, hpf: 6000 },
  { name: 'Rim eletrônico', sound: 'triangle', pianoRolls: [noteRoll([null,0,null,null,null,null,0,null],2)], lpf: 6500, hpf: 900 },
  { name: 'Percussão', sound: 'sine', pianoRolls: [noteRoll([null,null,null,0,null,2,null,0],2)], lpf: 2200, hpf: 100 },
].map((d, i) => ({ ...d, behavior: 'pulse', octave: i === 6 ? 5 : 2, gain: i === 0 ? 0.62 : 0.25, attack: 0.002, release: i === 5 ? 0.16 : 0.035 }))

const instruments: Record<Exclude<PieceSymbol, 'p'>, Instrument> = {
  n: { name: 'Baixo analógico', behavior: 'phrase', sound: 'sawtooth', pianoRolls: [noteRoll([0,null,0,2,0,4,null,2],2)], octave: 2, gain: 0.42, attack: 0.008, release: 0.08, lpf: 900, hpf: 30 },
  r: { name: 'Sopro eletrônico', behavior: 'phrase', sound: 'square', pianoRolls: [noteRoll([null,2,null,4,null,null,3,2],2)], octave: 4, gain: 0.24, attack: 0.06, release: 0.12, lpf: 1600, hpf: 180 },
  b: { name: 'Teclas sequenciadas', behavior: 'phrase', sound: 'triangle', pianoRolls: [noteRoll([0,2,4,null,2,4,null,3,2,null],2)], octave: 4, gain: 0.32, attack: 0.01, release: 0.16, lpf: 7000, hpf: 180 },
  k: { name: 'Cordas sintetizadas', behavior: 'sustain', sound: 'supersaw', pianoRolls: [noteRoll([[0,2,4],[0,3,4]],4,.95)], octave: 3, gain: 0.18, attack: 0.3, release: 0.3, lpf: 1600, hpf: 120 },
  q: { name: 'Melodia principal', behavior: 'phrase', sound: 'triangle', pianoRolls: [noteRoll([null,4,3,2,null,2,4,null,3,2,null],2)], octave: 5, gain: 0.32, attack: 0.02, release: 0.15, lpf: 6000, hpf: 300 },
}

export function instrumentFor(piece: MusicPiece): Instrument {
  return piece.type === 'p' ? drums[piece.origin.charCodeAt(0) - 97] : instruments[piece.type]
}

// Recorded moves preserve identity without revalidating power-enabled moves
// under ordinary chess rules. Undo/redo supplies the restored game history.
export function piecesFromMoves(moves: readonly Move[], initialFen?: string): MusicPiece[] {
  const chess = new Chess(moves[0]?.before ?? initialFen)
  const pieces: MusicPiece[] = chess.board().flatMap(row => row.flatMap(p => p ? [{
    id: `${p.color}:${p.square}`, slot: 0, origin: p.square, square: p.square,
    type: p.type, color: p.color, active: false,
  }] : []))
  pieces.forEach((p, i) => { p.slot = i })
  for (const move of moves) {
    const moving = pieces.find(p => p.square === move.from)
    if (!moving) throw new Error(`Missing musical piece at ${move.from}`)
    const capturedSquare = move.isEnPassant() ? `${move.to[0]}${move.from[1]}` : move.to
    const victim = pieces.findIndex(p => p.square === capturedSquare && p.id !== moving.id)
    if (victim >= 0) pieces.splice(victim, 1)
    moving.square = move.to
    moving.active = true
    moving.type = move.promotion ?? moving.type
    if (move.isKingsideCastle() || move.isQueensideCastle()) {
      const rank = move.from[1]
      const rook = pieces.find(p => p.square === `${move.isKingsideCastle() ? 'h' : 'a'}${rank}`)
      if (rook) {
        rook.square = `${move.isKingsideCastle() ? 'f' : 'd'}${rank}` as Square
        rook.active = true
      }
    }
  }
  return pieces
}

export function piecesFromHistory(history: readonly string[]): MusicPiece[] {
  const chess = new Chess()
  for (const san of history) chess.move(san)
  return piecesFromMoves(chess.history({ verbose: true }))
}

/** Check is a temporary performance overlay; it never marks a piece as moved. */
export function gameMusicStateFromHistory(history: readonly string[]) {
  const chess = new Chess()
  for (const san of history) chess.move(san)
  return gameMusicStateFromGame(chess)
}

/** The live variant is authoritative for check and mate, including active powers. */
export function gameMusicStateFromGame(chess: Chess) {
  const pieces = piecesFromMoves(chess.history({ verbose: true }), chess.fen())
  const attackingColor = chess.isCheck() ? (chess.turn() === 'w' ? 'b' : 'w') : null
  return {
    attackingColor,
    checkmate: chess.isCheckmate(),
    pieces: pieces.map(piece => ({
      ...piece,
      active: piece.active || piece.color === attackingColor,
      checkEnsemble: piece.color === attackingColor,
      activation: piece.active ? 'move' as const : piece.color === attackingColor ? 'check' as const : undefined,
    })),
  }
}

export function degreeToMidi(degree: number, scale: readonly string[], octave: number): number {
  const tones = scale.map(note => {
    const match = /^([a-g])([#b]?)/i.exec(note)
    if (!match) throw new Error(`Invalid scale note: ${note}`)
    const natural = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }[match[1].toLowerCase()]!
    return (natural + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) + 12) % 12
  })
  if (!tones.length) throw new Error('A scale must contain notes')
  // Unwrap scales that cross C (e.g. G A B C D) into ascending degrees.
  for (let i = 1; i < tones.length; i++) while (tones[i] < tones[i - 1]) tones[i] += 12
  const index = ((degree % tones.length) + tones.length) % tones.length
  return 12 * (octave + 1) + tones[index] + Math.floor(degree / tones.length) * 12
}
