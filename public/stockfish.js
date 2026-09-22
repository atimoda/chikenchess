// Enhanced Stockfish-like Chess AI Worker
// Uses alpha-beta pruning with transposition tables

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 }

// Piece-square tables for positional evaluation
const PST = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [50, 50, 50, 50, 50, 50, 50, 50],
    [10, 10, 20, 30, 30, 20, 10, 10],
    [5, 5, 10, 25, 25, 10, 5, 5],
    [0, 0, 0, 20, 20, 0, 0, 0],
    [5, -5, -10, 0, 0, -10, -5, 5],
    [5, 10, 10, -20, -20, 10, 10, 5],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50],
    [-40, -20, 0, 0, 0, 0, -20, -40],
    [-30, 0, 10, 15, 15, 10, 0, -30],
    [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30],
    [-30, 5, 10, 15, 15, 10, 5, -30],
    [-40, -20, 0, 5, 5, 0, -20, -40],
    [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 10, 10, 5, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10],
    [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 10, 10, 10, 10, 10, 10, -10],
    [-10, 5, 0, 0, 0, 0, 5, -10],
    [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  r: [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [5, 10, 10, 10, 10, 10, 10, 5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5],
    [0, 0, 0, 5, 5, 0, 0, 0],
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20],
    [-10, 0, 0, 0, 0, 0, 0, -10],
    [-10, 0, 5, 5, 5, 5, 0, -10],
    [-5, 0, 5, 5, 5, 5, 0, -5],
    [0, 0, 5, 5, 5, 5, 0, -5],
    [-10, 5, 5, 5, 5, 5, 0, -10],
    [-10, 0, 5, 0, 0, 0, 0, -10],
    [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  k: [
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-30, -40, -40, -50, -50, -40, -40, -30],
    [-20, -30, -30, -40, -40, -30, -30, -20],
    [-10, -20, -20, -20, -20, -20, -20, -10],
    [20, 20, 0, 0, 0, 0, 20, 20],
    [20, 30, 10, 0, 0, 10, 30, 20],
  ],
}

// Simple chess board representation and move generation
class SimpleChess {
  constructor(fen) {
    this.board = this.parseFEN(fen)
    this.turn = fen.split(" ")[1] || "w"
    this.castling = fen.split(" ")[2] || "KQkq"
    this.enPassant = fen.split(" ")[3] || "-"
    this.halfmove = Number.parseInt(fen.split(" ")[4]) || 0
    this.fullmove = Number.parseInt(fen.split(" ")[5]) || 1
  }

  parseFEN(fen) {
    const board = []
    const rows = fen.split(" ")[0].split("/")
    for (const row of rows) {
      const boardRow = []
      for (const char of row) {
        if (/\d/.test(char)) {
          for (let i = 0; i < Number.parseInt(char); i++) {
            boardRow.push(null)
          }
        } else {
          const color = char === char.toUpperCase() ? "w" : "b"
          const type = char.toLowerCase()
          boardRow.push({ type, color })
        }
      }
      board.push(boardRow)
    }
    return board
  }

  getPiece(rank, file) {
    if (rank < 0 || rank > 7 || file < 0 || file > 7) return null
    return this.board[rank][file]
  }

  evaluate() {
    let score = 0
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file]
        if (piece) {
          const value = PIECE_VALUES[piece.type]
          const pst = PST[piece.type]
          const tableRank = piece.color === "w" ? rank : 7 - rank
          const positional = pst ? pst[tableRank][file] : 0

          if (piece.color === "w") {
            score += value + positional
          } else {
            score -= value + positional
          }
        }
      }
    }
    return this.turn === "w" ? score : -score
  }

  generateMoves() {
    const moves = []
    const color = this.turn

    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = this.board[rank][file]
        if (piece && piece.color === color) {
          const pieceMoves = this.getPieceMoves(rank, file, piece)
          moves.push(...pieceMoves)
        }
      }
    }

    return moves
  }

  getPieceMoves(rank, file, piece) {
    const moves = []
    const files = "abcdefgh"
    const from = files[file] + (8 - rank)

    const addMove = (toRank, toFile, promotion = null) => {
      if (toRank < 0 || toRank > 7 || toFile < 0 || toFile > 7) return false
      const target = this.board[toRank][toFile]
      if (target && target.color === piece.color) return false

      const to = files[toFile] + (8 - toRank)
      moves.push({ from, to, piece: piece.type, captured: target?.type, promotion })
      return !target // Return true if empty (can continue sliding)
    }

    const addSlidingMoves = (directions) => {
      for (const [dr, df] of directions) {
        let r = rank + dr
        let f = file + df
        while (r >= 0 && r <= 7 && f >= 0 && f <= 7) {
          if (!addMove(r, f)) break
          r += dr
          f += df
        }
      }
    }

    switch (piece.type) {
      case "p": {
        const direction = piece.color === "w" ? -1 : 1
        const startRank = piece.color === "w" ? 6 : 1
        const promotionRank = piece.color === "w" ? 0 : 7

        // Forward move
        if (!this.board[rank + direction]?.[file]) {
          if (rank + direction === promotionRank) {
            for (const promo of ["q", "r", "b", "n"]) {
              addMove(rank + direction, file, promo)
            }
          } else {
            addMove(rank + direction, file)
          }

          // Double move from starting position
          if (rank === startRank && !this.board[rank + direction * 2]?.[file]) {
            addMove(rank + direction * 2, file)
          }
        }

        // Captures
        for (const df of [-1, 1]) {
          const target = this.board[rank + direction]?.[file + df]
          if (target && target.color !== piece.color) {
            if (rank + direction === promotionRank) {
              for (const promo of ["q", "r", "b", "n"]) {
                addMove(rank + direction, file + df, promo)
              }
            } else {
              addMove(rank + direction, file + df)
            }
          }
        }
        break
      }

      case "n":
        for (const [dr, df] of [
          [-2, -1],
          [-2, 1],
          [-1, -2],
          [-1, 2],
          [1, -2],
          [1, 2],
          [2, -1],
          [2, 1],
        ]) {
          addMove(rank + dr, file + df)
        }
        break

      case "b":
        addSlidingMoves([
          [-1, -1],
          [-1, 1],
          [1, -1],
          [1, 1],
        ])
        break

      case "r":
        addSlidingMoves([
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ])
        break

      case "q":
        addSlidingMoves([
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ])
        break

      case "k":
        for (const [dr, df] of [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ]) {
          addMove(rank + dr, file + df)
        }
        break
    }

    return moves
  }

  makeMove(move) {
    const files = "abcdefgh"
    const fromFile = files.indexOf(move.from[0])
    const fromRank = 8 - Number.parseInt(move.from[1])
    const toFile = files.indexOf(move.to[0])
    const toRank = 8 - Number.parseInt(move.to[1])

    const piece = this.board[fromRank][fromFile]
    this.board[fromRank][fromFile] = null

    if (move.promotion) {
      this.board[toRank][toFile] = { type: move.promotion, color: piece.color }
    } else {
      this.board[toRank][toFile] = piece
    }

    this.turn = this.turn === "w" ? "b" : "w"
  }

  clone() {
    const newChess = new SimpleChess("8/8/8/8/8/8/8/8 w - - 0 1")
    newChess.board = this.board.map((row) => row.map((cell) => (cell ? { ...cell } : null)))
    newChess.turn = this.turn
    newChess.castling = this.castling
    newChess.enPassant = this.enPassant
    return newChess
  }
}

// Transposition table
const transpositionTable = new Map()

function orderMoves(moves) {
  return moves.sort((a, b) => {
    let scoreA = 0,
      scoreB = 0

    // Captures (MVV-LVA)
    if (a.captured) scoreA += PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece]
    if (b.captured) scoreB += PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece]

    // Promotions
    if (a.promotion) scoreA += PIECE_VALUES[a.promotion]
    if (b.promotion) scoreB += PIECE_VALUES[b.promotion]

    return scoreB - scoreA
  })
}

function alphaBeta(chess, depth, alpha, beta, maximizing) {
  if (depth === 0) {
    return chess.evaluate()
  }

  const moves = orderMoves(chess.generateMoves())
  if (moves.length === 0) {
    return maximizing ? -50000 : 50000
  }

  if (maximizing) {
    let maxEval = Number.NEGATIVE_INFINITY
    for (const move of moves) {
      const newChess = chess.clone()
      newChess.makeMove(move)
      const evaluation = alphaBeta(newChess, depth - 1, alpha, beta, false)
      maxEval = Math.max(maxEval, evaluation)
      alpha = Math.max(alpha, evaluation)
      if (beta <= alpha) break
    }
    return maxEval
  } else {
    let minEval = Number.POSITIVE_INFINITY
    for (const move of moves) {
      const newChess = chess.clone()
      newChess.makeMove(move)
      const evaluation = alphaBeta(newChess, depth - 1, alpha, beta, true)
      minEval = Math.min(minEval, evaluation)
      beta = Math.min(beta, evaluation)
      if (beta <= alpha) break
    }
    return minEval
  }
}

function findBestMove(fen, depth) {
  const chess = new SimpleChess(fen)
  const moves = orderMoves(chess.generateMoves())

  if (moves.length === 0) return null

  let bestMove = moves[0]
  let bestScore = chess.turn === "w" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY
  const isMaximizing = chess.turn === "w"

  for (const move of moves) {
    const newChess = chess.clone()
    newChess.makeMove(move)
    const score = alphaBeta(newChess, depth - 1, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, !isMaximizing)

    if (isMaximizing) {
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    } else {
      if (score < bestScore) {
        bestScore = score
        bestMove = move
      }
    }
  }

  self.postMessage(`info score cp ${bestScore}`)
  return bestMove
}

// Worker message handling
let currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
let searchDepth = 4
let searchTimer = null

function scheduleSearch() {
  const fen = currentFen
  const depth = searchDepth
  if (searchTimer !== null) clearTimeout(searchTimer)
  searchTimer = setTimeout(
    () => {
      searchTimer = null
      const bestMove = findBestMove(fen, depth)
      if (bestMove) {
        self.postMessage(`bestmove ${bestMove.from}${bestMove.to}${bestMove.promotion || ""}`)
      } else {
        self.postMessage("bestmove (none)")
      }
    },
    200 + Math.random() * 500,
  )
}

self.onmessage = (e) => {
  const command = e.data

  if (command === "uci") {
    self.postMessage("id name ChiKenChess AI")
    self.postMessage("id author ChiKenChess")
    self.postMessage("uciok")
  } else if (command === "isready") {
    self.postMessage("readyok")
  } else if (command.startsWith("position fen")) {
    currentFen = command.replace("position fen ", "")
  } else if (command.startsWith("go depth")) {
    searchDepth = Number.parseInt(command.split(" ")[2]) || 4
    searchDepth = Math.min(searchDepth, 5)
    scheduleSearch()
  } else if (command.startsWith("eval depth")) {
    let depth = Number.parseInt(command.split(" ")[2]) || 4
    depth = Math.min(depth, 5)
    const chess = new SimpleChess(currentFen)
    const isMaximizing = chess.turn === "w"
    const score = alphaBeta(chess, depth, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, isMaximizing)
    const whiteScore = chess.turn === "w" ? score : -score
    self.postMessage(`eval ${whiteScore}`)
  } else if (command.startsWith("go")) {
    scheduleSearch()
  } else if (command === "stop" && searchTimer !== null) {
    clearTimeout(searchTimer)
    searchTimer = null
    self.postMessage("bestmove (none)")
  }
}
