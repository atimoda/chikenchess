import type { Chess, Move } from 'chess.js'
import type { ChessMoveAnalysis, EvaluatedMove } from './chess-evaluation'
import { advanceMatchPowers, type MatchPower } from './chess-powers'
import { clonePoweredChess, setPoweredChessPowers } from './powered-chess'

const MATERIAL: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 }

function availableMoves(game: Chess, powers: MatchPower[]): { moves: Move[]; powers: MatchPower[] } {
  setPoweredChessPowers(game, powers)
  let moves = game.moves({ verbose: true })
  if (!moves.length && powers.length) {
    const unpowered = clonePoweredChess(game, [])
    const ordinary = unpowered.moves({ verbose: true })
    if (ordinary.length) {
      setPoweredChessPowers(game, [])
      moves = game.moves({ verbose: true })
      return { moves, powers: [] }
    }
  }
  return { moves, powers }
}

function positionScore(game: Chess, powers: MatchPower[]): number {
  if (game.isCheckmate()) return game.turn() === 'w' ? -100000 : 100000
  if (game.isDraw()) return 0
  let score = 0
  for (const row of game.board()) for (const piece of row) if (piece) {
    const value = MATERIAL[piece.type] ?? 0
    const file = piece.square.charCodeAt(0) - 97
    const rank = Number(piece.square[1])
    const center = 3.5 - Math.abs(file - 3.5)
    const advance = piece.color === 'w' ? rank - 2 : 7 - rank
    const activity = piece.type === 'p' ? advance * 6 + center * 2
      : piece.type === 'n' || piece.type === 'b' ? center * 8 + (piece.color === 'w' ? rank - 1 : 8 - rank) * 5
      : piece.type === 'q' ? center * 2 : 0
    score += (piece.color === 'w' ? 1 : -1) * (value + activity)
  }
  for (const power of powers) {
    if (power.kind === 'freeze' && power.frozenColor) score += power.frozenColor === 'w' ? -30 : 30
    if (power.kind === 'shield' && power.attachedColor) score += power.attachedColor === 'w' ? 20 : -20
  }
  if (game.isCheck()) score += game.turn() === 'w' ? -70 : 70
  return score
}

function uci(move: Move): string { return `${move.from}${move.to}${move.promotion ?? ''}` }

function continuationScore(game: Chess, powers: MatchPower[], remainingPlies: number, count: () => void, cancelled: () => boolean): number {
  if (cancelled()) { count(); return positionScore(game, powers) }
  const available = availableMoves(game, powers)
  // Resolve a power-induced lack of replies before classifying the node as
  // checkmate or stalemate. The match also releases those powers in this case.
  if (remainingPlies === 0 || (!available.powers.length && remainingPlies < 2) || game.isGameOver() || !available.moves.length) {
    count()
    return positionScore(game, available.powers)
  }
  let best = game.turn() === 'w' ? -Infinity : Infinity
  for (const candidate of available.moves) {
    if (cancelled()) break
    const next = clonePoweredChess(game, available.powers)
    const move = next.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion })
    const remaining = advanceMatchPowers(available.powers, move, next, next.history().length)
    setPoweredChessPowers(next, remaining)
    const score = continuationScore(next, remaining, remainingPlies - 1, count, cancelled)
    best = game.turn() === 'w' ? Math.max(best, score) : Math.min(best, score)
  }
  return Number.isFinite(best) ? best : positionScore(game, powers)
}

/** Compare every powered root move against every permitted immediate reply. */
export async function analyzePoweredMoves(
  game: Chess,
  powers: MatchPower[],
  cancelled: () => boolean = () => false,
): Promise<ChessMoveAnalysis | null> {
  const started = globalThis.performance.now()
  const root = clonePoweredChess(game, powers)
  const available = availableMoves(root, powers)
  const rootMoves = available.moves
  const side = root.turn()
  const scored: EvaluatedMove[] = []
  let nodes = 0
  for (const candidate of rootMoves) {
    if (cancelled()) return null
    const first = clonePoweredChess(root, available.powers)
    const played = first.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion })
    const nextPowers = advanceMatchPowers(available.powers, played, first, first.history().length)
    setPoweredChessPowers(first, nextPowers)
    const whiteScore = continuationScore(first, nextPowers, 2, () => { nodes++ }, cancelled)
    const score = side === 'w' ? whiteScore : -whiteScore
    scored.push({ uci: uci(candidate), san: candidate.san, score, mate: null, change: 0, changeMate: null })
    // Keep controls responsive while evaluating every candidate on the main thread.
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  if (cancelled()) return null
  scored.sort((a, b) => b.score - a.score)
  const bestScore = scored[0]?.score ?? 0
  for (const move of scored) move.change = move.score - bestScore
  const elapsed = Math.round(globalThis.performance.now() - started)
  return {
    fen: game.fen(), side, legalMoves: rootMoves.length, final: true,
    best: scored.slice(0, 3), worst: scored.slice(-3).reverse(), complete: scored.length === rootMoves.length,
    depth: 3, nodes, elapsedMs: elapsed, engineMs: elapsed, quickMs: 0, quickNodes: 0, quickDepth: 0,
    source: 'powers',
  }
}
