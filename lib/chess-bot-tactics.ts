import { Chess, type Move, type Square } from 'chess.js'
import { advanceMatchPowers, createMatchPower, type MatchPower, type MatchPowerKind } from './chess-powers'
import { clonePoweredChess, makePoweredChess, setPoweredChessPowers } from './powered-chess'

// Tactical helpers for the ChickenBot: what each side can win on the next move
// (static exchange) and how a Freeze or Shield changes that, all with powers.

export const MATE_VALUE = 100000
const PIECE_VALUE: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

export function pieceValue(type: string | undefined): number {
  return type ? PIECE_VALUE[type] ?? 0 : 0
}

export interface PoweredPosition {
  game: Chess
  powers: MatchPower[]
}

export interface CaptureThreat {
  from: Square
  to: Square
  /** Material the side to move wins with this move after the best recaptures, or MATE_VALUE for mate. */
  gain: number
}

// chess.js 1.4 keeps these at runtime although its declarations mark them private
// (the powered adapter relies on the same internals). Building SAN for verbose moves
// costs ~50x the move generation, and cloning a game ~10x a make/undo, so the
// searches below play raw moves on one board and take them back.
interface RawMove { from: number; to: number; color: 'w' | 'b'; piece: string; captured?: string; promotion?: string; flags: number }
interface Internals {
  _moves(options: { legal: boolean }): RawMove[]
  _makeMove(move: RawMove): void
  _undoMove(): unknown
  _history: unknown[]
}

function internals(game: Chess): Internals {
  return game as unknown as Internals
}

function squareName(index: number): Square {
  return `${String.fromCharCode(97 + (index & 15))}${8 - Math.floor(index / 16)}` as Square
}

function rawUci(move: RawMove): string {
  return `${squareName(move.from)}${squareName(move.to)}${move.promotion ?? ''}`
}

function legalMoves(game: Chess): RawMove[] {
  return internals(game)._moves({ legal: true })
}

/** Play a raw move in place, advancing the powers as the match does; returns the powers to restore. */
function make(position: PoweredPosition, move: RawMove): MatchPower[] {
  const previous = position.powers
  internals(position.game)._makeMove(move)
  const flags = `${move.flags & 8 ? 'e' : ''}${move.flags & 32 ? 'k' : ''}${move.flags & 64 ? 'q' : ''}`
  const played = { from: squareName(move.from), to: squareName(move.to), color: move.color, flags } as Move
  position.powers = advanceMatchPowers(previous, played, position.game, internals(position.game)._history.length)
  setPoweredChessPowers(position.game, position.powers)
  return previous
}

function unmake(position: PoweredPosition, previous: MatchPower[]): void {
  internals(position.game)._undoMove()
  position.powers = previous
  setPoweredChessPowers(position.game, previous)
}

function withPower(position: PoweredPosition, power: { kind: MatchPowerKind; square: Square } | null): PoweredPosition {
  const powers = power ? [...position.powers, createMatchPower(power.kind, power.square, position.game, -1)] : [...position.powers]
  return { game: clonePoweredChess(position.game, powers), powers }
}

/**
 * The same board with the other side to move, as if the side to move passed.
 * Power deadlines are rebased like the Freeze validation probe does.
 */
export function passTurn(position: PoweredPosition): PoweredPosition | null {
  const { game } = position
  const ownPly = internals(game)._history.length + 1
  const fen = game.fen().split(' ')
  fen[1] = game.turn() === 'w' ? 'b' : 'w'
  fen[3] = '-'
  const powers = position.powers
    .filter(item => (item.trapUntilPly ?? item.blocksOnPly) > ownPly)
    .map(item => ({
      ...item,
      blocksOnPly: item.blocksOnPly - ownPly,
      trapUntilPly: item.trapUntilPly === undefined ? undefined : item.trapUntilPly - ownPly,
      appliedAtPly: undefined,
    }))
  try {
    return { game: makePoweredChess(new Chess(fen.join(' ')), powers), powers }
  } catch {
    return null
  }
}

/** Static exchange on one square: what the side to move wins by capturing there, never negative. */
function exchangeGain(position: PoweredPosition, square: Square, depth = 0): number {
  if (depth > 10) return 0
  let capture: RawMove | null = null
  for (const move of legalMoves(position.game)) {
    if (!move.captured || move.flags & 8 || squareName(move.to) !== square) continue
    if (!capture || pieceValue(move.piece) < pieceValue(capture.piece)) capture = move
  }
  if (!capture) return 0
  const previous = make(position, capture)
  const mate = position.game.inCheck() && position.game.isCheckmate()
  const reply = mate ? 0 : exchangeGain(position, square, depth + 1)
  unmake(position, previous)
  if (mate) return MATE_VALUE
  const won = pieceValue(capture.captured) + (capture.promotion ? pieceValue(capture.promotion) - 100 : 0)
  return Math.max(0, won - reply)
}

/** Captures (and, with `mates`, mates in one) available to the side to move, best first. */
export function captureThreats(position: PoweredPosition, mates = false): CaptureThreat[] {
  const threats: CaptureThreat[] = []
  for (const move of legalMoves(position.game)) {
    if (!move.captured && !mates) continue
    const previous = make(position, move)
    let gain = 0
    if (mates && position.game.inCheck() && position.game.isCheckmate()) gain = MATE_VALUE
    else if (move.captured) {
      const won = pieceValue(move.captured) + (move.promotion ? pieceValue(move.promotion) - 100 : 0)
      gain = won - exchangeGain(position, squareName(move.to))
    }
    unmake(position, previous)
    if (gain > 0) threats.push({ from: squareName(move.from), to: squareName(move.to), gain })
  }
  return threats.sort((a, b) => b.gain - a.gain)
}

export function topThreat(threats: CaptureThreat[]): number {
  return threats[0]?.gain ?? 0
}

/** Positional score for `color`, from the same quick evaluation the powered analysis uses. */
export function staticScore(position: PoweredPosition, color: 'w' | 'b'): number {
  const { game } = position
  if (game.isCheckmate()) return game.turn() === color ? -MATE_VALUE : MATE_VALUE
  if (game.isStalemate() || game.isInsufficientMaterial()) return 0
  let score = 0
  for (const row of game.board()) for (const piece of row) if (piece) {
    const file = piece.square.charCodeAt(0) - 97
    const rank = Number(piece.square[1])
    const center = 3.5 - Math.abs(file - 3.5)
    const advance = piece.color === 'w' ? rank - 2 : 7 - rank
    const activity = piece.type === 'p' ? advance * 6 + center * 2
      : piece.type === 'n' || piece.type === 'b' ? center * 8 + (piece.color === 'w' ? rank - 1 : 8 - rank) * 5
      : piece.type === 'q' ? center * 2 : 0
    score += (piece.color === color ? 1 : -1) * (pieceValue(piece.type) + activity)
  }
  return score
}

/**
 * Score for the side to move at a quiet leaf: it may take its best capture or
 * parry the opponent's biggest threat, but not both.
 */
function leafScore(position: PoweredPosition): number {
  const color = position.game.turn()
  const base = staticScore(position, color)
  if (Math.abs(base) >= MATE_VALUE || !legalMoves(position.game).length) return base
  const ownCapture = topThreat(captureThreats(position))
  const passed = passTurn(position)
  const against = passed ? captureThreats(passed).map(threat => threat.gain) : []
  const capture = ownCapture - (against[0] ?? 0)
  const parry = -(against[1] ?? 0)
  return base + Math.max(capture, parry)
}

/**
 * Two-ply check of a bot plan: apply the power (if any), play the move, let the
 * opponent pick its best reply, then score the quiet leaf for the bot.
 * Returns null when the move is not available with that power.
 */
export function evaluateBotPlan(
  position: PoweredPosition,
  power: { kind: MatchPowerKind; square: Square } | null,
  uci: string,
): number | null {
  const color = position.game.turn()
  const search = withPower(position, power)
  const move = legalMoves(search.game).find(candidate => rawUci(candidate) === uci)
  if (!move) return null
  make(search, move)
  const replies = legalMoves(search.game)
  if (!replies.length) return staticScore(search, color)
  let worst = Infinity
  for (const reply of replies) {
    const previous = make(search, reply)
    worst = Math.min(worst, leafScore(search))
    unmake(search, previous)
    if (worst <= -MATE_VALUE) break
  }
  return worst
}

/** The opponent's threats after the bot applies `power` (if any) and plays `uci`. */
export function threatsAfterPlan(
  position: PoweredPosition,
  power: { kind: MatchPowerKind; square: Square } | null,
  uci: string,
): CaptureThreat[] | null {
  const search = withPower(position, power)
  const move = legalMoves(search.game).find(candidate => rawUci(candidate) === uci)
  if (!move) return null
  make(search, move)
  return captureThreats(search, true)
}

/** Whether the piece moved by `uci` under a Shield on its origin then threatens to win material. */
export function shieldedAdvanceThreatens(position: PoweredPosition, uci: string): boolean {
  const from = uci.slice(0, 2) as Square
  const search = withPower(position, { kind: 'shield', square: from })
  const move = legalMoves(search.game).find(candidate => rawUci(candidate) === uci)
  if (!move) return false
  make(search, move)
  const passed = passTurn(search)
  const to = squareName(move.to)
  return !!passed && captureThreats(passed).some(threat => threat.from === to)
}
