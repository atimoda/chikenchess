import type { Chess, Move, Square } from "chess.js"

export type MatchPowerKind = "freeze" | "shield"
export interface MatchPower {
  id: number
  kind: MatchPowerKind
  square: Square
  // A freeze on an empty tile becomes attached to the first piece that lands there.
  trapUntilPly?: number
  frozenColor?: "w" | "b"
  attachedColor?: "w" | "b"
  blocksOnPly: number
}

type PowerMove = Pick<Move, "from" | "to" | "color" | "flags"> & { captured?: string }

export function createMatchPower(kind: MatchPowerKind, square: Square, game: Chess, id: number): MatchPower {
  const ply = game.history().length
  const occupant = game.get(square)
  if (kind === "shield") return { id, kind, square, attachedColor: occupant?.color, blocksOnPly: ply + 2 }
  if (!occupant) return { id, kind, square, trapUntilPly: ply + 2, blocksOnPly: ply + 2 }
  return { id, kind, square, frozenColor: occupant.color, blocksOnPly: ply + (occupant.color === game.turn() ? 3 : 2) }
}

export function permitsPowerMove(move: PowerMove, powers: MatchPower[], ply: number): boolean {
  for (const power of powers) {
    if (power.kind === "freeze") {
      const capturedSquare = move.flags.includes("e") ? `${move.to[0]}${move.from[1]}` : move.to
      if (power.frozenColor && power.frozenColor !== move.color && move.captured && capturedSquare === power.square) return false
      if (power.frozenColor === move.color && power.blocksOnPly === ply) {
        if (move.from === power.square) return false
        if (move.flags.includes("k") && power.square === (move.color === "w" ? "h1" : "h8")) return false
        if (move.flags.includes("q") && power.square === (move.color === "w" ? "a1" : "a8")) return false
      }
    }
    if (power.kind === "shield" && move.color === "b" && power.blocksOnPly === ply) {
      if (move.to === power.square) return false
      // En passant captures a pawn on the square beside the landing square.
      if (move.flags.includes("e") && `${move.to[0]}${move.from[1]}` === power.square) return false
    }
  }
  return true
}

export function permittedPowerMoves<T extends PowerMove>(moves: T[], powers: MatchPower[], ply: number): T[] {
  return moves.filter(move => permitsPowerMove(move, powers, ply))
}

export function advanceMatchPowers(powers: MatchPower[], move: Move, game: Chess, ply: number): MatchPower[] {
  const next: MatchPower[] = []
  for (const power of powers) {
    if (power.kind === "shield") {
      if (ply < power.blocksOnPly) {
        let square = power.square
        if (power.attachedColor === move.color && move.from === square) square = move.to
        if (power.attachedColor === move.color && move.flags.includes("k") && square === (move.color === "w" ? "h1" : "h8")) square = move.color === "w" ? "f1" : "f8"
        if (power.attachedColor === move.color && move.flags.includes("q") && square === (move.color === "w" ? "a1" : "a8")) square = move.color === "w" ? "d1" : "d8"
        if (!power.attachedColor || game.get(square)?.color === power.attachedColor) next.push({ ...power, square })
      }
      continue
    }
    if (power.trapUntilPly !== undefined) {
      if (move.to === power.square && game.get(power.square)) {
        next.push({ ...power, trapUntilPly: undefined, frozenColor: move.color, blocksOnPly: ply + 2 })
      } else if (ply < power.trapUntilPly) next.push(power)
      continue
    }
    if (power.blocksOnPly <= ply) continue
    let square = power.square
    if (power.frozenColor === move.color && move.from === square) square = move.to
    if (power.frozenColor === move.color && move.flags.includes("k") && square === (move.color === "w" ? "h1" : "h8")) square = move.color === "w" ? "f1" : "f8"
    if (power.frozenColor === move.color && move.flags.includes("q") && square === (move.color === "w" ? "a1" : "a8")) square = move.color === "w" ? "d1" : "d8"
    if (game.get(square)?.color === power.frozenColor) next.push({ ...power, square })
  }
  return next
}
