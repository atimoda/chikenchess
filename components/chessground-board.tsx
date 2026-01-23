"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Chess, Square, Move } from "chess.js"
import { cn } from "@/lib/utils"

interface ChessgroundBoardProps {
  game: Chess
  onMove: (move: Move) => void
  onBoardClick?: (square: Square) => void
  onDragOverSquare?: (from: Square, to: Square) => void
  cityColor: string
  isThinking: boolean
  orientation?: "white" | "black"
  synthSelectedSquare?: Square | null
  activeSquares?: Set<string>
}

const COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h"]
const ROWS = ["8", "7", "6", "5", "4", "3", "2", "1"]

// Custom SVG pieces with neon glow effect
export const PiecesSVG = {
  wK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fillRule="evenodd" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.5 11.63V6M20 8h5" strokeWidth="1.5"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" strokeLinecap="butt"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>`,
  wQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" strokeLinecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" strokeLinecap="butt"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" strokeLinecap="butt"/><path d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0" fill="none" stroke="#000"/></g></svg>`,
  wR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 39h27v-3H9v3zm3-3v-4h21v4H12zm-1-22V9h4v2h5V9h5v2h5V9h4v5" strokeLinecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17" strokeLinecap="butt" strokeLinejoin="miter"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none" strokeLinejoin="miter"/></g></svg>`,
  wB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g fill="#fff" strokeLinecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" strokeLinejoin="miter"/></g></svg>`,
  wN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#fff"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#000"/></g></svg>`,
  wP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>`,
  bK: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22.5 11.63V6" strokeLinejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" strokeLinecap="butt" strokeLinejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#000"/><path d="M20 8h5" strokeLinejoin="miter"/></g></svg>`,
  bQ: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g fill="#000"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" fill="#000" strokeLinecap="butt"/><path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" fill="#000" strokeLinecap="butt"/></g></svg>`,
  bR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z" fill="#000" strokeLinecap="butt"/><path d="M14 29.5v-13h17v13H14z" fill="#000" strokeLinecap="butt" strokeLinejoin="miter"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" fill="#000" strokeLinecap="butt"/></g></svg>`,
  bB: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><g fill="#000" strokeLinecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g></g></svg>`,
  bN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fillRule="evenodd" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#000"/><path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" fill="#000"/><path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill="#fff"/></g></svg>`,
  bP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" strokeWidth="1.5" strokeLinecap="round"/></svg>`,
}

type PieceKey = keyof typeof PiecesSVG

export function ChessgroundBoard({
  game,
  onMove,
  cityColor,
  isThinking,
  orientation: _orientation = "white",
  onBoardClick,
  synthSelectedSquare,
  activeSquares,
  onDragOverSquare,
}: ChessgroundBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<Square[]>([])
  const [lastMoveWhite, setLastMoveWhite] = useState<{ from: Square; to: Square } | null>(null)
  const [lastMoveBlack, setLastMoveBlack] = useState<{ from: Square; to: Square } | null>(null)
  const [premove, setPremove] = useState<{ from: Square; to: Square } | null>(null)
  const [dragPiece, setDragPiece] = useState<{
    piece: string
    from: Square
    x: number
    y: number
  } | null>(null)
  const lastHoverSquareRef = useRef<Square | null>(null)
  const selectionLastSquareRef = useRef<Square | null>(null)
  const dragHighlightTimeoutRef = useRef<number | null>(null)
  const [isSelectingSquares, setIsSelectingSquares] = useState(false)

  const board = game.board()
  const inCheck = game.isCheck()
  const turn = game.turn()

  // Handle last move updates from props
  useEffect(() => {
    if (game) {
      const history = game.history({ verbose: true })
      
      // Find last white move
      // findLast is not available in all environments, so we iterate backwards
      let lastW = null
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].color === 'w') {
          lastW = history[i]
          break
        }
      }

      // Find last black move
      let lastB = null
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].color === 'b') {
          lastB = history[i]
          break
        }
      }

      setLastMoveWhite(lastW ? { from: lastW.from, to: lastW.to } : null)
      setLastMoveBlack(lastB ? { from: lastB.from, to: lastB.to } : null)
    }
  }, [game, game.fen()]) // Added fen dependency to update on history navigation

  // Calculate opposite color for last move highlight
  // We need a complementary color to the neon city color
  // Simple approach: parse hex or use HSL rotation if possible, but for now let's just use a contrasting static color or simple logic.
  // The user asked for "contrary" color.
  // If cityColor is passed as hex, we can try to find a complementary one.
  // Or simpler: if it's warm, use cool, etc.
  // But let's try to be more precise if we can. 
  // Since cityColor comes from props and is a hex string (usually).
  
  const getComplementaryColor = (hex: string) => {
    // Basic hex to rgb
    let r = 0, g = 0, b = 0;
    if (hex.startsWith('#')) {
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
      }
    }
    // Invert
    const compR = 255 - r;
    const compG = 255 - g;
    const compB = 255 - b;
    return `rgba(${compR}, ${compG}, ${compB}, 0.3)`;
  }

  const lastMoveColor = getComplementaryColor(cityColor);

  // Find king position for check highlight
  const findKingSquare = useCallback((): Square | null => {
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file]
        if (piece && piece.type === "k" && piece.color === turn) {
          return `${COLUMNS[file]}${ROWS[rank]}` as Square
        }
      }
    }
    return null
  }, [board, turn])

  const kingSquare = inCheck ? findKingSquare() : null

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (onBoardClick) {
        onBoardClick(square)
      }

      if (isSelectingSquares) {
        return
      }

      if (isThinking && turn === "b") {
        if (selectedSquare) {
          setPremove({ from: selectedSquare, to: square })
          setSelectedSquare(null)
          setLegalMoves([])
          return
        }
      }

      if (turn !== "w" || game.isGameOver()) {
        if (selectedSquare) {
          setSelectedSquare(null)
          setLegalMoves([])
        }
        return
      }

      const piece = game.get(square)

      if (selectedSquare) {
        try {
          const move = game.move({
            from: selectedSquare,
            to: square,
            promotion: "q",
          })

          if (move) {
            if (move.color === 'w') {
              setLastMoveWhite({ from: selectedSquare, to: square })
            } else {
              setLastMoveBlack({ from: selectedSquare, to: square })
            }
            onMove(move)
            setSelectedSquare(null)
            setLegalMoves([])
            return
          }
        } catch (error) {
          void error
        }
      }

      if (piece) {
        setSelectedSquare(square)
        if (piece.color === turn) {
          try {
            const moves = game.moves({ square, verbose: true })
            setLegalMoves(moves.map((m) => m.to as Square))
          } catch {
            setLegalMoves([])
          }
        } else {
          setLegalMoves([])
        }

        if (onBoardClick) {
          onBoardClick(square)
        }
      } else {
        setSelectedSquare(null)
        setLegalMoves([])
        if (onBoardClick) {
          onBoardClick(square)
        }
      }
    },
    [game, selectedSquare, turn, isThinking, onMove, isSelectingSquares],
  )

  // Handle drag and drop
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, square: Square) => {
      if (turn !== "w" || game.isGameOver()) return

      const piece = game.get(square)
      if (!piece || piece.color !== "w") return

      if (!boardRef.current) return

      e.preventDefault()
      const rect = boardRef.current.getBoundingClientRect()
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      setDragPiece({
        piece: `${piece.color}${piece.type.toUpperCase()}`,
        from: square,
        x: clientX - rect.left,
        y: clientY - rect.top,
      })

      setSelectedSquare(square)
      const moves = game.moves({ square, verbose: true })
      setLegalMoves(moves.map((m) => m.to as Square))
    },
    [game, turn],
  )

  const [dragHighlight, setDragHighlight] = useState<{ square: Square | null; visible: boolean }>({
    square: null,
    visible: false,
  })

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragPiece || !boardRef.current) return

      const rect = boardRef.current.getBoundingClientRect()
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      const x = clientX - rect.left
      const y = clientY - rect.top

      setDragPiece((prev) =>
        prev
          ? {
              ...prev,
              x,
              y,
            }
          : null,
      )

      const squareSize = rect.width / 8
      const file = Math.floor(x / squareSize)
      const rank = Math.floor(y / squareSize)

      if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const targetSquare = `${COLUMNS[file]}${ROWS[rank]}` as Square
        if (lastHoverSquareRef.current !== targetSquare) {
          lastHoverSquareRef.current = targetSquare
          setDragHighlight({ square: targetSquare, visible: true })
          if (dragHighlightTimeoutRef.current !== null) {
            window.clearTimeout(dragHighlightTimeoutRef.current)
          }
          dragHighlightTimeoutRef.current = window.setTimeout(() => {
            setDragHighlight((prev) =>
              prev.square === targetSquare ? { ...prev, visible: false } : prev,
            )
          }, 1000)
          if (onDragOverSquare) {
            onDragOverSquare(dragPiece.from, targetSquare)
          }
        }
      } else {
        lastHoverSquareRef.current = null
      }
    },
    [dragPiece, onDragOverSquare],
  )

  const handleBoardMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isSelectingSquares || !boardRef.current || dragPiece) return
      if (e.buttons === 0) {
        setIsSelectingSquares(false)
        selectionLastSquareRef.current = null
        return
      }

      const rect = boardRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const squareSize = rect.width / 8
      const file = Math.floor(x / squareSize)
      const rank = Math.floor(y / squareSize)

      if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const targetSquare = `${COLUMNS[file]}${ROWS[rank]}` as Square
        if (targetSquare !== selectionLastSquareRef.current) {
          selectionLastSquareRef.current = targetSquare
          handleSquareClick(targetSquare)
        }
      }
    },
    [isSelectingSquares, handleSquareClick, dragPiece],
  )

  const handleDragEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!dragPiece || !boardRef.current) {
        setDragPiece(null)
        lastHoverSquareRef.current = null
        setIsSelectingSquares(false)
        selectionLastSquareRef.current = null
        return
      }

      const rect = boardRef.current.getBoundingClientRect()
      const clientX = "changedTouches" in e ? e.changedTouches[0].clientX : e.clientX
      const clientY = "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY

      const squareSize = rect.width / 8
      const file = Math.floor((clientX - rect.left) / squareSize)
      const rank = Math.floor((clientY - rect.top) / squareSize)

      if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const targetSquare = `${COLUMNS[file]}${ROWS[rank]}` as Square

        try {
          const move = game.move({
            from: dragPiece.from,
            to: targetSquare,
            promotion: "q",
          })

          if (move) {
            if (dragPiece.piece.startsWith('w')) {
              setLastMoveWhite({ from: dragPiece.from, to: targetSquare })
            } else {
              setLastMoveBlack({ from: dragPiece.from, to: targetSquare })
            }
            onMove(move)
          }
        } catch {
          // Invalid move
        }
      }

      setDragPiece(null)
      lastHoverSquareRef.current = null
      setIsSelectingSquares(false)
      selectionLastSquareRef.current = null
      setSelectedSquare(null)
      setLegalMoves([])
    },
    [dragPiece, game, onMove],
  )

  useEffect(() => {
    if (dragPiece) {
      window.addEventListener("mousemove", handleDragMove)
      window.addEventListener("mouseup", handleDragEnd)
      window.addEventListener("touchmove", handleDragMove)
      window.addEventListener("touchend", handleDragEnd)

      return () => {
        window.removeEventListener("mousemove", handleDragMove)
        window.removeEventListener("mouseup", handleDragEnd)
        window.removeEventListener("touchmove", handleDragMove)
        window.removeEventListener("touchend", handleDragEnd)
      }
    }
  }, [dragPiece, handleDragMove, handleDragEnd])

  useEffect(() => {
    const handleWindowMouseUp = () => {
      setIsSelectingSquares(false)
      selectionLastSquareRef.current = null
    }
    window.addEventListener("mouseup", handleWindowMouseUp)
    window.addEventListener("touchend", handleWindowMouseUp)
    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp)
      window.removeEventListener("touchend", handleWindowMouseUp)
    }
  }, [])
  useEffect(() => {
    return () => {
      if (dragHighlightTimeoutRef.current !== null) {
        window.clearTimeout(dragHighlightTimeoutRef.current)
      }
    }
  }, [])

  // Clear premove when turn changes
  useEffect(() => {
    if (turn === "w" && premove) {
      // Try to execute premove
      try {
        const move = game.move({
          from: premove.from,
          to: premove.to,
          promotion: "q",
        })
        if (move) {
          setLastMoveWhite(premove)
          onMove(move)
        }
      } catch {
        // Invalid premove
      }
      setPremove(null)
    }
  }, [turn, premove, game, onMove])

  return (
    <div className="relative select-none w-full h-full">
      {/* Thinking indicator - REMOVED per user request */}

      {/* Premove indicator */}
      {premove && (
        <div className="absolute -top-10 right-0 px-3 py-1 rounded text-xs font-mono text-muted-foreground bg-muted">
          Premove: {premove.from} → {premove.to}
        </div>
      )}

      <div
        ref={boardRef}
        className="grid grid-cols-8 rounded-lg overflow-hidden relative fade-transparency w-full h-full"
        style={{
          border: `1px solid ${cityColor}`,
          boxShadow: `0 0 40px ${cityColor}40, inset 0 0 20px ${cityColor}10`,
        }}
        onMouseMove={handleBoardMouseMove}
        onMouseUp={(e) => {
          if (dragPiece) {
            handleDragEnd(e.nativeEvent)
          }
        }}
        onTouchEnd={(e) => {
          if (dragPiece) {
            handleDragEnd(e.nativeEvent)
          }
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
            const isLastMoveWhite = lastMoveWhite && (lastMoveWhite.from === square || lastMoveWhite.to === square)
            const isLastMoveBlack = lastMoveBlack && (lastMoveBlack.from === square || lastMoveBlack.to === square)
            const isLastMove = isLastMoveWhite || isLastMoveBlack
            const isPremoveSquare = premove?.from === square || premove?.to === square
            const isDragging = dragPiece?.from === square
            const isSynthSelected = synthSelectedSquare === square
            const isActive = activeSquares?.has(square)

            // Calculate complementary color for last move
            // We'll use a CSS filter hue-rotate(180deg) to get complementary color
            // But we can't apply it to background directly without affecting children
            // So we'll handle it via style injection or a separate div layer if needed.
            // Actually, we can just use the hue-rotate on the background div layer.

            return (
              <button
                key={square}
                className={cn(
                  "relative aspect-square flex items-center justify-center transition-colors duration-150 w-full",
                  (isSynthSelected || (piece && isSynthSelected)) &&
                    "after:absolute after:inset-0 after:border-2 after:border-white after:pointer-events-none after:z-20 shadow-[0_0_15px_rgba(255,255,255,0.5)]",
                )}
                style={{
                  boxShadow: isActive ? `inset 0 0 0 2px ${cityColor}, 0 0 10px ${cityColor}80` : undefined,
                  backgroundColor: isKingInCheck
                    ? "rgba(239, 68, 68, 0.6)"
                    : isSelected
                      ? `${cityColor}40`
                      : isPremoveSquare
                        ? "rgba(59, 130, 246, 0.3)"
                        : isLastMove
                          ? lastMoveColor
                          : isLight
                            ? `${cityColor}40`
                            : `${cityColor}25`,
                }}
                onMouseDown={(e) => {
                  const hasPiece = !!piece
                  if (!hasPiece) {
                    setIsSelectingSquares(true)
                    selectionLastSquareRef.current = square
                  } else {
                    setIsSelectingSquares(false)
                  }
                  handleSquareClick(square)
                  handleDragStart(e, square)
                }}
                onTouchStart={(e) => {
                  const hasPiece = !!piece
                  if (!hasPiece) {
                    setIsSelectingSquares(true)
                    selectionLastSquareRef.current = square
                  } else {
                    setIsSelectingSquares(false)
                  }
                  handleSquareClick(square)
                  handleDragStart(e, square)
                }}
              >
                {dragHighlight.square === square && (
                  <div
                    className={cn(
                      "absolute inset-0 pointer-events-none rounded-none",
                      dragHighlight.visible ? "opacity-100" : "opacity-0",
                    )}
                    style={{
                      border: "2px solid #fb923c",
                      boxShadow: dragHighlight.visible
                        ? "0 0 12px rgba(251, 146, 60, 0.8)"
                        : "0 0 0 rgba(0,0,0,0)",
                      transition: "opacity 1s ease-out, box-shadow 1s ease-out",
                      zIndex: 15,
                    }}
                  />
                )}

                {isActive && (
                  <>
                    <div
                      className="absolute inset-0 pointer-events-none rounded-none active-border-fade"
                      style={{
                        border: `1px solid ${cityColor}`,
                        boxShadow: `0 0 16px ${cityColor}`,
                        zIndex: 13,
                      }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none rounded-none animate-pulse"
                      style={{
                        boxShadow: `0 0 18px ${cityColor}90`,
                        zIndex: 12,
                      }}
                    />
                  </>
                )}
                {/* Legal move indicator */}
                {isLegalMove && (
                  <div
                    className={cn(
                      "absolute z-10 rounded-full transition-transform hover:scale-110",
                      piece ? "inset-1" : "",
                    )}
                    style={{
                      width: piece ? undefined : "25%",
                      height: piece ? undefined : "25%",
                      backgroundColor: piece ? "transparent" : `${cityColor}60`,
                      border: piece ? `3px solid ${cityColor}80` : undefined,
                    }}
                  />
                )}

                {/* Piece */}
                {piece && !isDragging && (
                  <div
                    className={cn("w-[85%] h-[85%] transition-transform duration-150", isSelected && "scale-105")}
                    style={{
                      filter: isSelected 
                        ? `drop-shadow(0 0 8px ${cityColor})` 
                        : (piece.color === 'b' ? `drop-shadow(0 0 1px ${cityColor})` : undefined),
                    }}
                    dangerouslySetInnerHTML={{
                      __html: PiecesSVG[`${piece.color}${piece.type.toUpperCase()}` as PieceKey] || "",
                    }}
                  />
                )}

                {/* Coordinate labels */}
                {colIndex === 0 && (
                  <span
                    className={cn(
                      "absolute top-0.5 left-1 text-[10px] font-mono font-bold",
                      isLight ? "text-black/40" : "text-white/40",
                    )}
                  >
                    {row}
                  </span>
                )}
                {rowIndex === 7 && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-1 text-[10px] font-mono font-bold",
                      isLight ? "text-black/40" : "text-white/40",
                    )}
                  >
                    {col}
                  </span>
                )}
              </button>
            )
          }),
        )}
      </div>

      {/* Dragged piece */}
      {dragPiece && (
        <div
          className="absolute pointer-events-none z-50 w-16 h-16"
          style={{
            left: dragPiece.x - 32,
            top: dragPiece.y - 32,
            filter: `drop-shadow(0 0 12px ${cityColor})`,
          }}
          dangerouslySetInnerHTML={{
            __html: PiecesSVG[dragPiece.piece as PieceKey] || "",
          }}
        />
      )}
    </div>
  )
}
