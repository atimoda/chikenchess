"use client"

import type { Chess, Square, PieceSymbol, Color } from "chess.js"
import { cn } from "@/lib/utils"

interface ChessBoardProps {
  game: Chess
  selectedSquare: Square | null
  legalMoves: Square[]
  onSquareClick: (square: Square) => void
  cityColor: string
  isThinking: boolean
}

const COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h"]
const ROWS = ["8", "7", "6", "5", "4", "3", "2", "1"]

const pieceUnicode: Record<PieceSymbol, { w: string; b: string }> = {
  p: { w: "♙", b: "♟" },
  n: { w: "♘", b: "♞" },
  b: { w: "♗", b: "♝" },
  r: { w: "♖", b: "♜" },
  q: { w: "♕", b: "♛" },
  k: { w: "♔", b: "♚" },
}

export function ChessBoard({
  game,
  selectedSquare,
  legalMoves,
  onSquareClick,
  cityColor,
  isThinking,
}: ChessBoardProps) {
  const board = game.board()
  const inCheck = game.isCheck()
  const kingSquare = inCheck ? findKingSquare(game, game.turn()) : null

  return (
    <div className="relative">
      {/* Thinking indicator */}
      {isThinking && (
        <div
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-mono"
          style={{ backgroundColor: `${cityColor}20`, color: cityColor, border: `1px solid ${cityColor}` }}
        >
          AI PROCESSING...
        </div>
      )}

      <div
        className="grid grid-cols-8 border-2 rounded-lg overflow-hidden"
        style={{
          borderColor: cityColor,
          boxShadow: `0 0 30px ${cityColor}30`,
        }}
      >
        {ROWS.map((row, rowIndex) =>
          COLUMNS.map((col, colIndex) => {
            const square = `${col}${row}` as Square
            const piece = board[rowIndex][colIndex]
            const isLight = (rowIndex + colIndex) % 2 === 0
            const isSelected = selectedSquare === square
            const isLegalMove = legalMoves.includes(square)
            const isKingInCheck = kingSquare === square

            return (
              <button
                key={square}
                className={cn(
                  "relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center transition-all duration-150",
                  isLight ? "bg-secondary" : "bg-muted",
                  isSelected && "ring-2 ring-inset",
                  isKingInCheck && "bg-destructive/50",
                )}
                style={{
                  ...(isSelected && { ringColor: cityColor, backgroundColor: `${cityColor}30` }),
                }}
                onClick={() => onSquareClick(square)}
              >
                {/* Legal move indicator */}
                {isLegalMove && (
                  <div
                    className={cn(
                      "absolute rounded-full",
                      piece ? "inset-0 border-4 border-dashed opacity-60" : "w-3 h-3 opacity-50",
                    )}
                    style={{
                      borderColor: piece ? cityColor : undefined,
                      backgroundColor: piece ? undefined : cityColor,
                    }}
                  />
                )}

                {/* Piece */}
                {piece && (
                  <span
                    className={cn(
                      "text-3xl sm:text-4xl md:text-5xl select-none transition-transform",
                      isSelected && "scale-110",
                    )}
                    style={{
                      color: piece.color === "w" ? "#ffffff" : "#1a1a2e",
                      textShadow: piece.color === "w" ? "0 2px 4px rgba(0,0,0,0.5)" : "0 2px 4px rgba(255,255,255,0.3)",
                      filter: isSelected ? `drop-shadow(0 0 8px ${cityColor})` : undefined,
                    }}
                  >
                    {pieceUnicode[piece.type][piece.color]}
                  </span>
                )}

                {/* Coordinate labels */}
                {colIndex === 0 && (
                  <span className="absolute top-0.5 left-1 text-xs font-mono text-muted-foreground">{row}</span>
                )}
                {rowIndex === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-xs font-mono text-muted-foreground">{col}</span>
                )}
              </button>
            )
          }),
        )}
      </div>
    </div>
  )
}

function findKingSquare(game: Chess, color: Color): Square | null {
  const board = game.board()
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.type === "k" && piece.color === color) {
        return `${COLUMNS[col]}${ROWS[row]}` as Square
      }
    }
  }
  return null
}
