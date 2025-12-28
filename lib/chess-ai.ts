import type { Chess, Move, PieceSymbol } from "chess.js"

// Piece values for evaluation
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
}

// Piece-square tables for positional evaluation
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
]

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
]

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
]

const ROOK_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
]

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
]

const KING_MIDDLE_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
]

const PIECE_TABLES: Record<PieceSymbol, number[][]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_MIDDLE_TABLE,
}

export class ChessAI {
  private transpositionTable: Map<string, { depth: number; score: number; flag: string }> = new Map()
  private nodesSearched = 0

  // Evaluate the board position
  evaluate(game: Chess): number {
    const board = game.board()
    let score = 0

    // Material and positional scoring
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file]
        if (piece) {
          const pieceValue = PIECE_VALUES[piece.type]
          const table = PIECE_TABLES[piece.type]

          // Get positional value (flip table for black)
          const tableRank = piece.color === "w" ? rank : 7 - rank
          const positionalValue = table[tableRank][file]

          const totalValue = pieceValue + positionalValue

          if (piece.color === "w") {
            score += totalValue
          } else {
            score -= totalValue
          }
        }
      }
    }

    // Mobility bonus
    const currentTurn = game.turn()
    const moves = game.moves().length

    // Temporarily switch turns to count opponent mobility
    // We can't actually switch turns, so we estimate
    const mobilityBonus = moves * 5
    score += currentTurn === "w" ? mobilityBonus : -mobilityBonus

    // Check and checkmate bonuses
    if (game.isCheckmate()) {
      score = currentTurn === "w" ? -100000 : 100000
    } else if (game.isCheck()) {
      score += currentTurn === "w" ? -50 : 50
    }

    return score
  }

  // Order moves for better pruning
  orderMoves(game: Chess, moves: Move[]): Move[] {
    return moves.sort((a, b) => {
      let scoreA = 0
      let scoreB = 0

      // Captures first (MVV-LVA: Most Valuable Victim - Least Valuable Aggressor)
      if (a.captured) {
        scoreA += PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece]
      }
      if (b.captured) {
        scoreB += PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece]
      }

      // Promotions
      if (a.promotion) scoreA += PIECE_VALUES[a.promotion]
      if (b.promotion) scoreB += PIECE_VALUES[b.promotion]

      // Check moves
      if (a.san.includes("+")) scoreA += 50
      if (b.san.includes("+")) scoreB += 50

      return scoreB - scoreA
    })
  }

  // Quiescence search to avoid horizon effect
  quiescence(game: Chess, alpha: number, beta: number, depth: number): number {
    this.nodesSearched++

    const standPat = this.evaluate(game)

    if (depth <= 0) return standPat

    if (standPat >= beta) return beta
    if (alpha < standPat) alpha = standPat

    // Only search captures
    const moves = game.moves({ verbose: true }).filter((m) => m.captured)
    const orderedMoves = this.orderMoves(game, moves)

    for (const move of orderedMoves) {
      game.move(move)
      const score = -this.quiescence(game, -beta, -alpha, depth - 1)
      game.undo()

      if (score >= beta) return beta
      if (score > alpha) alpha = score
    }

    return alpha
  }

  // Alpha-beta search with transposition table
  alphaBeta(game: Chess, depth: number, alpha: number, beta: number, maximizing: boolean): number {
    this.nodesSearched++

    const fen = game.fen()
    const cached = this.transpositionTable.get(fen)

    if (cached && cached.depth >= depth) {
      if (cached.flag === "exact") return cached.score
      if (cached.flag === "alpha" && cached.score <= alpha) return alpha
      if (cached.flag === "beta" && cached.score >= beta) return beta
    }

    if (depth === 0) {
      return this.quiescence(game, alpha, beta, 4)
    }

    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        return maximizing ? -100000 + (10 - depth) : 100000 - (10 - depth)
      }
      return 0 // Draw
    }

    const moves = game.moves({ verbose: true })
    const orderedMoves = this.orderMoves(game, moves)

    let bestScore = maximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
    let flag = "alpha"

    for (const move of orderedMoves) {
      game.move(move)
      const score = this.alphaBeta(game, depth - 1, alpha, beta, !maximizing)
      game.undo()

      if (maximizing) {
        if (score > bestScore) {
          bestScore = score
        }
        if (score > alpha) {
          alpha = score
          flag = "exact"
        }
      } else {
        if (score < bestScore) {
          bestScore = score
        }
        if (score < beta) {
          beta = score
          flag = "exact"
        }
      }

      if (beta <= alpha) {
        flag = "beta"
        break
      }
    }

    // Store in transposition table
    this.transpositionTable.set(fen, { depth, score: bestScore, flag })

    return bestScore
  }

  // Find the best move
  findBestMove(game: Chess, depth = 4): { move: Move | null; score: number; nodesSearched: number } {
    this.nodesSearched = 0
    this.transpositionTable.clear()

    const moves = game.moves({ verbose: true })
    if (moves.length === 0) return { move: null, score: 0, nodesSearched: 0 }

    const orderedMoves = this.orderMoves(game, moves)

    let bestMove: Move | null = null
    let bestScore = Number.NEGATIVE_INFINITY
    const isMaximizing = game.turn() === "w"

    // Iterative deepening for better move ordering
    for (let d = 1; d <= depth; d++) {
      let currentBest: Move | null = null
      let currentBestScore = isMaximizing ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY

      for (const move of orderedMoves) {
        game.move(move)
        const score = this.alphaBeta(game, d - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, !isMaximizing)
        game.undo()

        if (isMaximizing) {
          if (score > currentBestScore) {
            currentBestScore = score
            currentBest = move
          }
        } else {
          if (score < currentBestScore) {
            currentBestScore = score
            currentBest = move
          }
        }
      }

      if (currentBest) {
        bestMove = currentBest
        bestScore = currentBestScore
      }
    }

    return { move: bestMove, score: bestScore, nodesSearched: this.nodesSearched }
  }
}

// Create a singleton instance
let aiInstance: ChessAI | null = null

export function getChessAI(): ChessAI {
  if (!aiInstance) {
    aiInstance = new ChessAI()
  }
  return aiInstance
}
