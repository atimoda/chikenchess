"use client"

import type React from "react"

import { useEffect, useRef, useState, useCallback } from "react"
import type { Chess, Square, Move } from "chess.js"
import type { MusicPulseMonitor } from "@/lib/music/monitor"
import { MusicPulseOverlay } from "./music-pulse-overlay"
import { cn } from "@/lib/utils"
import rewardStyles from "./chessground-board.module.css"

interface ChessgroundBoardProps {
  game: Chess
  onMove: (move: Move) => void
  onBoardClick?: (square: Square) => void
  onPieceDoubleTap?: (square: Square) => void
  onPieceHold?: (square: Square) => void
  onPieceRelease?: () => void
  onPieceCancel?: () => void
  musicPulseMonitor?: MusicPulseMonitor
  onDragOverSquare?: (from: Square, to: Square) => void
  cityColor: string
  isThinking: boolean
  orientation?: "white" | "black"
  synthSelectedSquare?: Square | null
  activeSquares?: Set<string>
  analysisArrows?: AnalysisArrow[]
  rankedMoveMark?: { square: Square; kind: 'best' | 'worst'; id: number } | null
  rankedMoveAnnouncement?: { square: Square; kind: 'best' | 'worst' | 'neutral'; id: number; headline: string; earnedEggs: number; streak: boolean } | null
  freeMode?: {
    mode: "move" | "play"
    auditionPiece: { color: "w" | "b"; type: string }
    onMove: (from: Square, to: Square) => void
    onTogglePiece: (square: Square) => void
    squareLabel?: (square: Square) => string
  }
}

export interface AnalysisArrow {
  from: Square
  to: Square
  label: string
  tone: "best" | "worst"
  labelTone: "best" | "warning" | "worst"
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
  onPieceDoubleTap,
  synthSelectedSquare,
  activeSquares,
  onDragOverSquare,
  onPieceHold,
  onPieceRelease,
  onPieceCancel,
  musicPulseMonitor,
  analysisArrows = [],
  rankedMoveMark,
  rankedMoveAnnouncement,
  freeMode,
}: ChessgroundBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [pressedPieceSquare, setPressedPieceSquare] = useState<Square | null>(null)
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
  const dragPieceRef = useRef<typeof dragPiece>(null)
  const dragStartedRef = useRef(false)
  const dragGhostRef = useRef<HTMLDivElement>(null)
  const dragHighlightRef = useRef<HTMLDivElement>(null)
  const heldSquareRef = useRef<Square | null>(null)
  const lastHoverSquareRef = useRef<Square | null>(null)
  const selectionLastSquareRef = useRef<Square | null>(null)
  const dragHighlightTimeoutRef = useRef<number | null>(null)
  const tapStartRef = useRef<{ square: Square; x: number; y: number; pointerType: string } | null>(null)
  const lastTapRef = useRef<{ square: Square; time: number; pointerType: string } | null>(null)
  const [isSelectingSquares, setIsSelectingSquares] = useState(false)

  useEffect(() => {
    const release = () => {
      heldSquareRef.current = null
      setPressedPieceSquare(null)
      onPieceRelease?.()
    }
    const cancel = () => {
      tapStartRef.current = null
      lastTapRef.current = null
      heldSquareRef.current = null
      setPressedPieceSquare(null)
      if (onPieceCancel) onPieceCancel()
      else onPieceRelease?.()
      dragPieceRef.current = null
      dragStartedRef.current = false
      setDragPiece(null)
      setLegalMoves([])
      lastHoverSquareRef.current = null
      if (dragHighlightRef.current) dragHighlightRef.current.style.opacity = '0'
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel() }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', cancel)
    window.addEventListener('blur', cancel)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', cancel)
      window.removeEventListener('keydown', escape)
    }
  }, [onPieceRelease, onPieceCancel])

  const board = game.board()
  const inCheck = freeMode ? false : game.isCheck()
  const turn = game.turn()

  const [animatingPiece, setAnimatingPiece] = useState<{
    piece: string
    from: Square
    to: Square
    startX: number
    startY: number
    targetX: number
    targetY: number
    progress: number // 0 to 1
  } | null>(null)

  const justDraggedRef = useRef(false)

  const getCoords = (sq: Square) => {
    const col = sq.charCodeAt(0) - 97
    const row = 8 - parseInt(sq[1])
    return { x: col * 12.5, y: row * 12.5 }
  }

  // Handle last move updates from props
  useEffect(() => {
    if (!freeMode) {
      const history = game.history({ verbose: true })
      
      const lastMove = history[history.length - 1]
      
      if (lastMove && !dragPiece && !animatingPiece) { // Trigger animation only if not dragging
          // Calculate start and end positions relative to board
          // This requires knowing the square size and board dimensions
          // We can use the boardRef to get dimensions, but we need to trigger this effect AFTER render?
          // Or we can just use relative percentage coordinates (0-7 range)
          
          // Only animate if it's a new move we haven't animated yet?
          // For now, let's assume if history changes, we animate the last move IF it matches our expectations
          // But wait, the game state updates instantly. The piece is ALREADY at 'to'.
          // To animate 'slide', we need to:
          // 1. Hide the piece at 'to' (visually)
          // 2. Render a floating piece moving from 'from' to 'to'
          // 3. On complete, show the piece at 'to'
          
          // Check if this move is recent enough to animate?
          // We can just animate every update if the last move changed.
          
          // Let's store the last animated move index to avoid re-animating on re-renders
      }

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
  }, [game, freeMode])

  // Animation Loop
  useEffect(() => {
      if (animatingPiece) {
          const startTime = globalThis.performance.now()
          const duration = 200 // ms
          
          const animate = () => {
              const now = globalThis.performance.now()
              const elapsed = now - startTime
              const progress = Math.min(elapsed / duration, 1)
              
              setAnimatingPiece(prev => prev ? { ...prev, progress } : null)
              
              if (progress < 1) {
                  requestAnimationFrame(animate)
              } else {
                  setAnimatingPiece(null)
              }
          }
          
          requestAnimationFrame(animate)
      }
  }, [animatingPiece?.from, animatingPiece?.to]) // Dependency on move identity

  // We need to intercept the game update to set up animation
  // Since 'game' prop changes instantly, we can use a ref to track previous FEN or history length
  const prevHistoryLen = useRef(0)
  
  useEffect(() => {
      if (freeMode) return
      const history = game.history({ verbose: true })
      if (history.length > prevHistoryLen.current) {
          const lastMove = history[history.length - 1]
          
          if (!justDraggedRef.current) {
             const from = getCoords(lastMove.from)
             const to = getCoords(lastMove.to)
             
             setAnimatingPiece({
                 piece: `${lastMove.color}${lastMove.piece.toUpperCase()}`,
                 from: lastMove.from,
                 to: lastMove.to,
                 startX: from.x,
                 startY: from.y,
                 targetX: to.x,
                 targetY: to.y,
                 progress: 0
             })
          }
      }
      prevHistoryLen.current = history.length
  }, [game, freeMode])

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
      if (freeMode) {
        onBoardClick?.(square)
        return
      }
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
    [game, selectedSquare, turn, isThinking, onMove, isSelectingSquares, freeMode, onBoardClick],
  )

  // Handle drag and drop
  const handleDragStart = useCallback(
    (e: React.PointerEvent, square: Square) => {
      if (game.get(square) || freeMode?.mode === 'play') {
        heldSquareRef.current = square
        onPieceHold?.(square)
      }
      if (!freeMode && !onPieceHold && (turn !== "w" || game.isGameOver())) return

      const piece = freeMode?.mode === 'play' ? freeMode.auditionPiece : game.get(square)
      if (!piece || (!freeMode && !onPieceHold && piece.color !== "w")) return

      if (!boardRef.current) return

      // In free mode the browser must deliver mousedown after pointerdown:
      // Chromium grants mouse audio activation on mousedown, not pointerdown.
      if (!freeMode) e.preventDefault()
      const rect = boardRef.current.getBoundingClientRect()
      const clientX = e.clientX
      const clientY = e.clientY

      dragPieceRef.current = {
        piece: `${piece.color}${piece.type.toUpperCase()}`,
        from: square,
        x: (clientX - rect.left) * boardRef.current.offsetWidth / rect.width,
        y: (clientY - rect.top) * boardRef.current.offsetHeight / rect.height,
      }
      dragStartedRef.current = !!freeMode
      if (freeMode) setDragPiece(dragPieceRef.current)

      if (!freeMode) {
        setSelectedSquare(square)
        const moves = game.moves({ square, verbose: true })
        setLegalMoves(moves.map((m) => m.to as Square))
      }
    },
    [game, turn, onPieceHold, freeMode],
  )

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const dragPiece = dragPieceRef.current
      if (!dragPiece || !boardRef.current) return
      if (e.cancelable) e.preventDefault()

      const rect = boardRef.current.getBoundingClientRect()
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

      const x = clientX - rect.left
      const y = clientY - rect.top

      if (!dragStartedRef.current) {
        const localX = x * boardRef.current.offsetWidth / rect.width
        const localY = y * boardRef.current.offsetHeight / rect.height
        if (Math.hypot(localX - dragPiece.x, localY - dragPiece.y) < 8) return
        dragStartedRef.current = true
        setDragPiece({ ...dragPiece, x: localX, y: localY })
      }

      // Move the ghost without rerendering all 64 squares for every pixel.
      if (dragGhostRef.current) dragGhostRef.current.style.transform = `translate(${x * boardRef.current.offsetWidth / rect.width - 32}px, ${y * boardRef.current.offsetHeight / rect.height - 32}px)`

      const squareSize = rect.width / 8
      const file = Math.floor(x / squareSize)
      const rank = Math.floor(y / squareSize)

      if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
        const targetSquare = `${COLUMNS[file]}${ROWS[rank]}` as Square
        if (lastHoverSquareRef.current !== targetSquare) {
          lastHoverSquareRef.current = targetSquare
          if (dragHighlightRef.current) {
            dragHighlightRef.current.style.transform = `translate(${file * 100}%, ${rank * 100}%)`
            dragHighlightRef.current.style.opacity = '1'
            dragHighlightRef.current.style.boxShadow = '0 0 12px rgba(251, 146, 60, 0.8)'
          }
          if (dragHighlightTimeoutRef.current !== null) {
            window.clearTimeout(dragHighlightTimeoutRef.current)
          }
          dragHighlightTimeoutRef.current = window.setTimeout(() => {
            if (lastHoverSquareRef.current === targetSquare && dragHighlightRef.current) {
              dragHighlightRef.current.style.opacity = '0'
              dragHighlightRef.current.style.boxShadow = '0 0 0 rgba(0,0,0,0)'
            }
          }, 1000)
          if (onDragOverSquare) {
            onDragOverSquare(dragPiece.from, targetSquare)
          }
        }
      } else {
        lastHoverSquareRef.current = null
        if (dragHighlightRef.current) dragHighlightRef.current.style.opacity = '0'
      }
    },
    [onDragOverSquare],
  )

  const handleBoardMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (freeMode || !isSelectingSquares || !boardRef.current || dragPiece) return
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
    [isSelectingSquares, handleSquareClick, dragPiece, freeMode],
  )

  const handleDragEnd = useCallback(
    (e: MouseEvent | TouchEvent) => {
      const dragPiece = dragPieceRef.current
      const didDrag = dragStartedRef.current
      dragPieceRef.current = null
      dragStartedRef.current = false
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

      let didMove = false
      if (file >= 0 && file < 8 && rank >= 0 && rank < 8 && freeMode) {
        const targetSquare = `${COLUMNS[file]}${ROWS[rank]}` as Square
        if (freeMode.mode === 'move' && targetSquare !== dragPiece.from) {
          freeMode.onMove(dragPiece.from, targetSquare)
          didMove = true
        }
      } else if (didDrag && file >= 0 && file < 8 && rank >= 0 && rank < 8 && dragPiece.piece.startsWith("w") && game.turn() === "w" && !game.isGameOver()) {
        const targetSquare = `${COLUMNS[file]}${ROWS[rank]}` as Square

        try {
          const move = game.move({
            from: dragPiece.from,
            to: targetSquare,
            promotion: "q",
          })

          if (move) {
            didMove = true
            justDraggedRef.current = true
            // Reset flag after a short delay to allow effect to see it
            setTimeout(() => {
                justDraggedRef.current = false
            }, 100)

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
      if (dragHighlightRef.current) dragHighlightRef.current.style.opacity = '0'
      setIsSelectingSquares(false)
      selectionLastSquareRef.current = null
      if (didMove) {
        setSelectedSquare(null)
        setLegalMoves([])
      }
    },
    [game, onMove, freeMode],
  )

  useEffect(() => {
      window.addEventListener("pointermove", handleDragMove)
      window.addEventListener("pointerup", handleDragEnd)

      return () => {
        window.removeEventListener("pointermove", handleDragMove)
        window.removeEventListener("pointerup", handleDragEnd)
      }
  }, [handleDragMove, handleDragEnd])

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
    if (!freeMode && turn === "w" && premove) {
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
  }, [turn, premove, game, onMove, freeMode])

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
        className={cn("grid grid-cols-8 overflow-hidden relative fade-transparency w-full h-full", freeMode ? "rounded-none" : "rounded-lg")}
        style={{
          boxShadow: `inset 0 0 20px ${cityColor}10`,
          touchAction: 'none',
          // @ts-expect-error - CSS variable injection
          "--city-color": cityColor,
        }}
        onMouseMove={handleBoardMouseMove}
        onPointerUp={e => handleDragEnd(e.nativeEvent)}

      >
        <style jsx>{`
          .board-square-light {
            background-color: rgba(255, 255, 255, 0.2);
          }
          .board-square-dark {
            background-color: color-mix(in srgb, var(--city-color) 60%, rgba(150, 150, 150, 0.75) 80%);
          }
          :global(.black-piece-outline svg *) {
            stroke: rgba(255, 255, 255, .3) !important;
          }
          @keyframes ranked-move-flash {
            0%, 100% { opacity: 0; transform: scale(.72); }
            28%, 62% { opacity: .9; transform: scale(1); }
          }
          .ranked-move-mark { animation: ranked-move-flash .65s ease-out both; }
        `}</style>
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
            const isAnimatingTo = animatingPiece?.to === square
            const isSynthSelected = synthSelectedSquare === square
            const isActive = activeSquares?.has(square)
            const isPressedPiece = pressedPieceSquare === square

            // Calculate complementary color for last move
            // We'll use a CSS filter hue-rotate(180deg) to get complementary color
            // But we can't apply it to background directly without affecting children
            // So we'll handle it via style injection or a separate div layer if needed.
            // Actually, we can just use the hue-rotate on the background div layer.

            return (
              <button
                key={square}
                aria-label={freeMode?.squareLabel?.(square) ?? `${square}${piece ? ` ${piece.color} ${piece.type}` : " empty"}`}
                data-square={square}
                className={cn(
                  "relative aspect-square flex items-center justify-center transition-colors duration-150 w-full",
                  !isKingInCheck && !isSelected && !isPremoveSquare && !isLastMove && (isLight ? "board-square-light" : "board-square-dark"),
                  (isSynthSelected || (piece && isSynthSelected)) &&
                    "after:absolute after:inset-0 after:border-2 after:border-white after:pointer-events-none after:z-20 shadow-[0_0_15px_rgba(255,255,255,0.5)]",
                )}
                style={{
                  backgroundColor: isKingInCheck
                    ? "rgba(239, 68, 68, 0.6)"
                    : isSelected
                      ? `${cityColor}40`
                      : isPremoveSquare
                        ? "rgba(59, 130, 246, 0.3)"
                        : isLastMove
                          ? (isLight 
                              ? `color-mix(in srgb, ${cityColor} 20%, #505050bf 80%)` 
                              : `color-mix(in srgb, ${cityColor} 20%, #1a1a1abf 80%)`)
                          : isLight
                            ? `color-mix(in srgb, ${cityColor} 20%, #6c6c6cbf 80%)`
                            : `color-mix(in srgb, ${cityColor} 20%, #303030bf 80%)`,
                }}
                onPointerDown={(e) => {
                  if (!e.isPrimary || e.button !== 0) {
                    tapStartRef.current = null
                    lastTapRef.current = null
                    setPressedPieceSquare(null)
                    return
                  }
                  setPressedPieceSquare(piece ? square : null)
                  if (lastTapRef.current?.square !== square || lastTapRef.current.pointerType !== e.pointerType) lastTapRef.current = null
                  if (!freeMode && piece?.color === 'w') {
                    tapStartRef.current = { square, x: e.clientX, y: e.clientY, pointerType: e.pointerType }
                  } else {
                    tapStartRef.current = null
                    lastTapRef.current = null
                  }
                  e.currentTarget.setPointerCapture(e.pointerId)
                  const hasPiece = !!piece
                  const isSecondTap = !freeMode && piece?.color === 'w' && lastTapRef.current?.square === square && Date.now() - lastTapRef.current.time < 350
                  if (!freeMode && !hasPiece) {
                    setIsSelectingSquares(true)
                    selectionLastSquareRef.current = square
                  } else {
                    setIsSelectingSquares(false)
                  }
                  if (!isSecondTap) handleSquareClick(square)
                  if (hasPiece || freeMode?.mode === 'play') handleDragStart(e, square)
                }}
                onPointerUp={(e) => {
                  if (freeMode) return
                  const start = tapStartRef.current
                  tapStartRef.current = null
                  if (!start || dragStartedRef.current || start.square !== square || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) {
                    lastTapRef.current = null
                    return
                  }
                  const last = lastTapRef.current
                  const now = Date.now()
                  if (last?.square === square && last.pointerType === e.pointerType && now - last.time < 350) {
                    lastTapRef.current = null
                    if (piece?.color === 'w') onPieceDoubleTap?.(square)
                  } else {
                    lastTapRef.current = { square, time: now, pointerType: e.pointerType }
                  }
                }}
                onPointerCancel={() => { tapStartRef.current = null; lastTapRef.current = null; setPressedPieceSquare(null) }}
                onDoubleClick={() => {
                  if (freeMode?.mode === 'move' && piece) freeMode.onTogglePiece(square)
                }}
                onKeyDown={e => { if (freeMode?.mode === 'play' && (e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); onPieceHold?.(square) } }}
                onKeyUp={e => { if (freeMode?.mode === 'play' && (e.key === ' ' || e.key === 'Enter')) onPieceRelease?.() }}
                onBlur={() => { if (freeMode?.mode === 'play') { if (onPieceCancel) onPieceCancel(); else onPieceRelease?.() } }}
              >
                {isActive && (
                  <>
                    <div
                      className="absolute inset-0 pointer-events-none rounded-none active-border-fade"
                      style={{
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
                {rankedMoveMark?.square === square && (
                  <svg
                    key={rankedMoveMark.id}
                    aria-hidden="true"
                    viewBox="0 0 100 100"
                    className="ranked-move-mark absolute inset-[10%] z-[1] h-[80%] w-[80%] pointer-events-none"
                    fill="none"
                    stroke={rankedMoveMark.kind === 'best' ? '#41ed8c' : '#ff424b'}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 0 8px ${rankedMoveMark.kind === 'best' ? '#41ed8c' : '#ff424b'})` }}
                  >
                    {rankedMoveMark.kind === 'best'
                      ? <path d="M14 52 40 76 86 22" />
                      : <path d="M22 22 78 78 M78 22 22 78" />}
                  </svg>
                )}
                {piece && (!isDragging || freeMode?.mode === 'play') && !isAnimatingTo && (
                  <div
                    className={cn("relative z-10 w-[85%] h-[85%] transition-transform duration-150", freeMode && "w-[90%] h-[90%] [&_svg]:w-full [&_svg]:h-full", piece.color === 'b' && "black-piece-outline", isSelected && "scale-105")}
                    style={{
                      filter: isActive || isPressedPiece ? `drop-shadow(0 0 8px ${cityColor})` : undefined,
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
                      "absolute top-0.5 left-1 text-[10px] font-mono font-bold text-white/40",
                    )}
                  >
                    {row}
                  </span>
                )}
                {rowIndex === 7 && (
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-1 text-[10px] font-mono font-bold text-white/40",
                    )}
                  >
                    {col}
                  </span>
                )}
              </button>
            )
          }),
        )}
        <div
          ref={dragHighlightRef}
          aria-hidden="true"
          className="absolute left-0 top-0 w-[12.5%] h-[12.5%] pointer-events-none opacity-0"
          style={{ border: '2px solid #fb923c', transition: 'opacity 1s ease-out, box-shadow 1s ease-out', zIndex: 15 }}
        />
        {musicPulseMonitor && <MusicPulseOverlay monitor={musicPulseMonitor} />}
      </div>

      {rankedMoveAnnouncement && (() => {
        const fileIndex = COLUMNS.indexOf(rankedMoveAnnouncement.square[0])
        const rowIndex = 8 - Number(rankedMoveAnnouncement.square[1])
        const good = rankedMoveAnnouncement.kind === 'best'
        return <div
          key={rankedMoveAnnouncement.id}
          aria-live="polite"
          className="pointer-events-none absolute z-[100] flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 whitespace-nowrap"
          style={{ left: `${(fileIndex + .5) * 12.5}%`, top: `${rowIndex * 12.5}%` }}
        >
          <span
            className={cn(rewardStyles.rankedRewardHeadline, "font-mono font-bold text-[11px] drop-shadow-[0_1px_5px_rgba(0,0,0,.95)]", rankedMoveAnnouncement.streak && [rewardStyles.rankedRewardHeadlineStreak, "text-[13px]"])}
            style={{ color: rankedMoveAnnouncement.kind === 'neutral' ? '#ffffff' : good ? '#41ed8c' : '#ff5d64', textShadow: `0 0 8px ${rankedMoveAnnouncement.kind === 'neutral' ? '#ffffff' : good ? '#41ed8c' : '#ff5d64'}80` }}
          >{rankedMoveAnnouncement.headline}</span>
          {rankedMoveAnnouncement.earnedEggs > 0 && <span className={cn(rewardStyles.rankedRewardAmount, "font-mono text-[10px] font-bold text-amber-300 drop-shadow-[0_1px_4px_rgba(0,0,0,.95)]")}>
            {good
              ? `+${rankedMoveAnnouncement.earnedEggs} ${rankedMoveAnnouncement.earnedEggs === 1 ? 'egg' : 'eggs'}`
              : `Take ${rankedMoveAnnouncement.earnedEggs} eggs!`}
          </span>}
        </div>
      })()}

      {analysisArrows.length > 0 && (
        <svg
          aria-label="Sugestões de jogadas"
          className="absolute inset-0 z-30 h-full w-full overflow-visible pointer-events-none"
          viewBox="0 0 800 800"
          preserveAspectRatio="none"
        >
          <defs>
            <marker id="analysis-arrow-best" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M2.64,1.32 L8,4 L2.64,6.68 Z" fill="#34d399" />
            </marker>
            <marker id="analysis-arrow-worst" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M2.64,1.32 L8,4 L2.64,6.68 Z" fill="#fb7185" />
            </marker>
          </defs>
          {analysisArrows.map((arrow, index) => {
            const from = getCoords(arrow.from)
            const to = getCoords(arrow.to)
            const x1 = from.x * 8 + 50
            const y1 = from.y * 8 + 50
            const x2 = to.x * 8 + 50
            const y2 = to.y * 8 + 50
            const dx = x2 - x1
            const dy = y2 - y1
            const length = Math.max(1, Math.hypot(dx, dy))
            const endX = x2 - (dx / length) * 30
            const endY = y2 - (dy / length) * 30
            const color = arrow.tone === "best" ? "#34d399" : "#fb7185"
            const labelColor = arrow.labelTone === "warning" ? "#fb923c" : arrow.labelTone === "worst" ? "#fb7185" : color
            return (
              <g key={`${arrow.from}-${arrow.to}-${index}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={endX}
                  y2={endY}
                  stroke="rgba(0, 0, 0, 0.75)"
                  strokeOpacity="0.7"
                  strokeWidth="18"
                  strokeLinecap="round"
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={endX}
                  y2={endY}
                  stroke={color}
                  strokeOpacity="0.7"
                  strokeWidth="10"
                  strokeLinecap="round"
                  markerEnd={`url(#analysis-arrow-${arrow.tone})`}
                />
                <g transform={`translate(${x2} ${y2})`}>
                  <rect
                    x="-33"
                    y="-16"
                    width="66"
                    height="32"
                    rx="10"
                    fill="rgba(0, 0, 0, 0.88)"
                    stroke={labelColor}
                    strokeWidth="3"
                  />
                  <text
                    x="0"
                    y="1"
                    fill={labelColor}
                    fontSize="18"
                    fontWeight="700"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {arrow.label}
                  </text>
                </g>
              </g>
            )
          })}
        </svg>
      )}

      {/* Animating piece */}
      {animatingPiece && (
        <div
          className="absolute pointer-events-none z-40 w-[12.5%] h-[12.5%] flex items-center justify-center"
          style={{
            left: `${animatingPiece.startX + (animatingPiece.targetX - animatingPiece.startX) * animatingPiece.progress}%`,
            top: `${animatingPiece.startY + (animatingPiece.targetY - animatingPiece.startY) * animatingPiece.progress}%`,
            transition: 'none',
          }}
        >
             <div
                className={cn("w-[85%] h-[85%]", animatingPiece.piece.startsWith('b') && "black-piece-outline")}
                style={{
                  filter: `drop-shadow(0 0 12px ${cityColor})`,
                }}
                dangerouslySetInnerHTML={{
                  __html: PiecesSVG[animatingPiece.piece as PieceKey] || "",
                }}
              />
        </div>
      )}

      {/* Dragged piece */}
      {dragPiece && freeMode?.mode !== 'play' && (
        <div
          data-dragged-piece={dragPiece.from}
          ref={dragGhostRef}
          className={cn("absolute pointer-events-none z-50 w-16 h-16", freeMode && "[&_svg]:w-full [&_svg]:h-full", dragPiece.piece.startsWith('b') && "black-piece-outline")}
          style={{
            left: 0,
            top: 0,
            transform: `translate(${dragPiece.x - 32}px, ${dragPiece.y - 32}px)`,
            willChange: 'transform',
            filter: `drop-shadow(0 0 12px ${cityColor})`,
          }}
          dangerouslySetInnerHTML={{
            __html: PiecesSVG[dragPiece.piece as PieceKey] || "",
          }}
        />
      )}

      {/* Coordinates Layer removed to fix duplication */}
      {/* 
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{ zIndex: 10 }}
      >
        <div className="absolute left-0.5 top-0 bottom-0 flex flex-col justify-around text-[10px] font-bold text-neutral-400 select-none">
          {ROWS.map((r) => (
            <span key={r} className="h-[12.5%] flex items-start pt-0.5">{r}</span>
          ))}
        </div>
        
        <div className="absolute left-0 bottom-0 right-0 flex justify-around text-[10px] font-bold text-neutral-400 select-none pl-[12.5%]">
          {COLUMNS.map((f) => (
            <span key={f} className="w-full text-right pr-1 pb-0.5">{f}</span>
          ))}
        </div>
      </div>
      */}
    </div>
  )
}
