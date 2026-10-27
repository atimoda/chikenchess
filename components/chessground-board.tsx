"use client"

/* global PointerEvent */

import type React from "react"

import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react"
import type { Chess, Square, Move } from "chess.js"
import type { MusicPulseMonitor } from "@/lib/music/monitor"
import { MusicPulseOverlay } from "./music-pulse-overlay"
import { cn, stableHtml } from "@/lib/utils"
import rewardStyles from "./chessground-board.module.css"
import { frozenCaptureBlock, shieldCaptureBlock, type ShieldCaptureBlock, type MatchPower, type MatchPowerKind } from "@/lib/chess-powers"
import { getSfxEngine } from "@/lib/sfx-engine"
import { EGG_REWARDS } from "@/lib/egg-rewards"
import { MULLIGAN_ANIMATION_MS, MULLIGAN_PREVIEW_DURATION_MS, POWER_RELEASE_MS, releasedPowers, type MulliganPreviewMove } from "@/lib/power-presentation"

interface ChessgroundBoardProps {
  game: Chess
  undoAnimationKey?: number
  onUndoAnimation?: () => void
  onFrozenCaptureBlocked?: () => void
  onMove: (move: Move) => void
  onBoardClick?: (square: Square) => void
  armedPower?: MatchPowerKind | null
  onPowerTarget?: (square: Square) => void
  matchPowers?: MatchPower[]
  /** Release sounds follow confirmed history, rather than pending online previews. */
  confirmedPowerState?: { powers: MatchPower[]; ply: number }
  isMoveAllowed?: (move: Move) => boolean
  onShieldCaptureBlocked?: (reason: ShieldCaptureBlock) => void
  onPieceDoubleTap?: (square: Square) => void
  onPieceHold?: (square: Square) => void
  onPieceRelease?: () => void
  onPieceCancel?: () => void
  musicEffectsEnabled?: boolean
  musicPulseMonitor?: MusicPulseMonitor
  onDragOverSquare?: (from: Square, to: Square) => void
  cityColor: string
  isThinking: boolean
  orientation?: "white" | "black"
  playerColor?: "w" | "b"
  movesDisabled?: boolean
  /** Online waits for a server confirmation before mutating the position. */
  deferMoves?: boolean
  /** Visual-only online move destinations awaiting authoritative confirmation. */
  pendingSquares?: readonly Square[]
  synthSelectedSquare?: Square | null
  activeSquares?: Set<string>
  teamMixes?: Record<'w' | 'b', { gain: number }>
  analysisArrows?: AnalysisArrow[]
  /** Golden eggs drawn on suggested destination squares: any piece landing there earns them. */
  squareEggs?: { square: Square; kind: 'best' | 'worst'; eggs: number }[]
  /** Epoch ms when the square eggs start fading out (over the configured fade). */
  squareEggsFadeAt?: number | null
  rankedMoveMark?: { square: Square; kind: 'best' | 'worst'; id: number } | null
  showRankedMoveMarks?: boolean
  rankedMoveAnnouncement?: { square: Square; kind: 'best' | 'worst' | 'neutral'; id: number; headline: string; earnedEggs: number; streak: boolean; comeback?: boolean } | null
  freeMode?: {
    mode: "move" | "play"
    auditionPiece: { color: "w" | "b"; type: string }
    onMove: (from: Square, to: Square) => void
    onTogglePiece: (square: Square) => void
    /** A piece dragged and released outside the board (Creative deletes it). */
    onDropOutside?: (from: Square) => void
    squareLabel?: (square: Square) => string
  }
  entranceActive?: boolean
  mulliganPreviewMoves?: MulliganPreviewMove[] | null
  /** Pointer down on an empty square that no gesture claims: the parent may start a board pan. */
  onEmptySquarePointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void
}

export interface AnalysisArrow {
  from: Square
  to: Square
  label: string
  tone: "best" | "worst"
  labelTone: "best" | "warning" | "worst"
}

interface PieceAnimationInput {
  piece: string
  from: Square
  to: Square
  startX: number
  startY: number
  targetX: number
  targetY: number
}

interface PieceAnimation extends PieceAnimationInput {
  duration: number
  easing: string
}

interface MulliganGhostPiece {
  piece: string
  currentSquare: Square
  targetSquare: Square
  startX: number
  startY: number
  targetX: number
  targetY: number
}

// mulliganProgress and mulliganGhostEaseInOut expressed as CSS timing functions.
const MULLIGAN_EASING = "cubic-bezier(.42, 0, .58, 1)"
const MULLIGAN_GHOST_EASING = "cubic-bezier(.65, 0, .35, 1)"

// Pieces glide with a compositor transform: the board is rendered once per move
// instead of once per frame, so a busy main thread (music scheduling, analysis)
// no longer makes the movement stutter on phones.
function GlidingSquare({ startX, startY, targetX, targetY, duration, easing, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { startX: number; startY: number; targetX: number; targetY: number; duration: number; easing: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    // Percent translations are relative to the square itself (12.5% of the board).
    const end = `translate(${(targetX - startX) * 8}%, ${(targetY - startY) * 8}%)`
    if (typeof element.animate !== "function") {
      element.style.transform = end
      return
    }
    const animation = element.animate([{ transform: "translate(0, 0)" }, { transform: end }], { duration, easing, fill: "forwards" })
    return () => animation.cancel()
  }, [startX, startY, targetX, targetY, duration, easing])
  return (
    <div ref={ref} className={className} {...props} style={{ ...props.style, left: `${startX}%`, top: `${startY}%`, willChange: "transform" }}>
      {children}
    </div>
  )
}

const COLUMNS = ["a", "b", "c", "d", "e", "f", "g", "h"]
// Stable default: a fresh [] per render re-ran the fading-power effect, whose
// state update rendered the board again in an endless loop (Creative board).
const NO_POWERS: MatchPower[] = []
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

function IceCrystal({ releasing = false }: { releasing?: boolean }) {
  return <span aria-hidden="true" data-power-ice-crystal className={cn(rewardStyles.iceCrystal, releasing && rewardStyles.powerRelease)}>
    <svg viewBox="0 0 100 100" fill="none"><path d="M18 16 40 5 72 12 90 35 84 80 55 95 16 82 7 45Z" fill="#39cfff" fillOpacity=".1" stroke="#8aeeff" strokeWidth="2" />
      <path d="M18 16 32 38 7 45M40 5 45 27 72 12M90 35 68 42 84 80M16 82 36 64 55 95M32 38 45 27 68 42 36 64Z" stroke="#d5fbff" strokeOpacity=".65" strokeWidth="1.2" />
      <path d="M10 45 32 38 36 64 16 82M68 42 55 95 84 80Z" fill="#24baff" fillOpacity=".16" />
    </svg>
  </span>
}

function GoldenShield({ releasing = false, preview = false }: { releasing?: boolean; preview?: boolean }) {
  return <svg aria-hidden="true" data-power-shield={preview ? undefined : true} viewBox="0 0 64 72" className={cn(rewardStyles.powerShield, releasing && rewardStyles.powerRelease)} fill="#ffbd24" fillOpacity=".2" stroke="#ffcf48" strokeWidth="3">
    <path d="M32 3 57 13v20c0 16-11 28-25 36C18 61 7 49 7 33V13L32 3Z" />
    <path d="M32 9 51 17v16c0 13-8 23-19 30C21 56 13 46 13 33V17L32 9Z" fill="none" stroke="#fff0a6" strokeWidth="1" />
    <path d="M32 10v51M14 19l18 9 18-9" fill="none" stroke="#ffe08b" strokeOpacity=".45" strokeWidth="1" />
  </svg>
}

export function ChessgroundBoard({
  game,
  undoAnimationKey = 0,
  onUndoAnimation,
  onFrozenCaptureBlocked,
  onMove,
  cityColor,
  isThinking,
  orientation = "white",
  playerColor = "w",
  movesDisabled = false,
  deferMoves = false,
  pendingSquares = [],
  onBoardClick,
  armedPower,
  onPowerTarget,
  matchPowers = NO_POWERS,
  confirmedPowerState,
  isMoveAllowed,
  onShieldCaptureBlocked,
  onPieceDoubleTap,
  synthSelectedSquare,
  activeSquares,
  teamMixes,
  onDragOverSquare,
  onPieceHold,
  onPieceRelease,
  onPieceCancel,
  musicEffectsEnabled = true,
  musicPulseMonitor,
  analysisArrows = [],
  squareEggs = [],
  squareEggsFadeAt = null,
  rankedMoveMark,
  showRankedMoveMarks = true,
  rankedMoveAnnouncement,
  freeMode,
  entranceActive = false,
  mulliganPreviewMoves,
  onEmptySquarePointerDown,
}: ChessgroundBoardProps) {
  const columns = orientation === "black" ? [...COLUMNS].reverse() : COLUMNS
  const rows = orientation === "black" ? [...ROWS].reverse() : ROWS
  const boardRef = useRef<HTMLDivElement>(null)
  // Square eggs stay solid, then fade out until the moment they stop paying any piece.
  // The fade is timed from the wall clock so a re-render or remount never restarts it.
  const squareEggSquares = squareEggs.map(item => item.square).join()
  useEffect(() => {
    if (squareEggsFadeAt === null || !squareEggSquares) return
    const animations = [...(boardRef.current?.querySelectorAll<HTMLElement>('[data-square-eggs]') ?? [])].map(element => element.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: EGG_REWARDS.squareEggsFadeSeconds * 1000, delay: squareEggsFadeAt - Date.now(), easing: 'linear', fill: 'forwards' },
    ))
    return () => animations.forEach(animation => animation.cancel())
  }, [squareEggsFadeAt, squareEggSquares])
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [pressedPieceSquare, setPressedPieceSquare] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<Square[]>([])
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
  const dragHighlightTimeoutRef = useRef<number | null>(null)
  const tapStartRef = useRef<{ square: Square; x: number; y: number; pointerType: string } | null>(null)
  const lastTapRef = useRef<{ square: Square; time: number; pointerType: string } | null>(null)
  // Free mode starts the drag on pointerdown and swaps the piece for the ghost,
  // so the browser never emits click/dblclick; the release on the same square counts the taps.
  const freeTapRef = useRef<{ square: Square; time: number } | null>(null)
  const frozenAttemptRef = useRef<{ square: Square; pointerId: number; notified: boolean } | null>(null)
  const [frozenFeedbackSquare, setFrozenFeedbackSquare] = useState<Square | null>(null)
  const frozenFeedbackTimeoutRef = useRef<number | null>(null)
  const cancelFrozenSoundRef = useRef<(() => void) | null>(null)
  const clearFrozenFeedback = useCallback(() => {
    frozenAttemptRef.current = null
    if (frozenFeedbackTimeoutRef.current !== null) window.clearTimeout(frozenFeedbackTimeoutRef.current)
    frozenFeedbackTimeoutRef.current = null
    cancelFrozenSoundRef.current?.()
    cancelFrozenSoundRef.current = null
    setFrozenFeedbackSquare(null)
  }, [])

  const [rejectedAttackerSquare, setRejectedAttackerSquare] = useState<{ square: Square; key: number } | null>(null)
  const rejectedAttackerTimeoutRef = useRef<number | null>(null)
  const rejectedAttackerKeyRef = useRef(0)
  const clearRejectedAttacker = useCallback(() => {
    if (rejectedAttackerTimeoutRef.current !== null) window.clearTimeout(rejectedAttackerTimeoutRef.current)
    rejectedAttackerTimeoutRef.current = null
    setRejectedAttackerSquare(null)
  }, [])
  const triggerAttackerShake = useCallback((square: Square) => {
    if (rejectedAttackerTimeoutRef.current !== null) window.clearTimeout(rejectedAttackerTimeoutRef.current)
    const nextKey = rejectedAttackerKeyRef.current + 1
    rejectedAttackerKeyRef.current = nextKey
    setRejectedAttackerSquare({ square, key: nextKey })
    rejectedAttackerTimeoutRef.current = window.setTimeout(() => {
      rejectedAttackerTimeoutRef.current = null
      setRejectedAttackerSquare(null)
    }, 280)
  }, [])

  const frozenSquaresKey = matchPowers.filter(power => power.kind === 'freeze').map(power => power.square).sort().join(',')
  const positionFen = game.fen()
  useEffect(() => {
    clearFrozenFeedback()
    clearRejectedAttacker()
    return () => {
      clearFrozenFeedback()
      clearRejectedAttacker()
    }
  }, [positionFen, frozenSquaresKey, orientation, freeMode, clearFrozenFeedback, clearRejectedAttacker])

  useEffect(() => {
    const release = (event: PointerEvent) => {
      const frozenAttempt = frozenAttemptRef.current
      if (frozenAttempt?.pointerId === event.pointerId) {
        // Touch grants audio activation on release; resume only the cue already waiting in its feedback window.
        if (event.isTrusted && frozenAttempt.notified && frozenFeedbackTimeoutRef.current !== null) {
          void getSfxEngine().resume().catch(() => {})
        }
        frozenAttemptRef.current = null
      }
      heldSquareRef.current = null
      setPressedPieceSquare(null)
      onPieceRelease?.()
    }
    const cancel = () => {
      clearFrozenFeedback()
      clearRejectedAttacker()
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
    const visibility = () => { if (document.hidden) cancel() }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('keydown', escape)
    return () => {
      window.removeEventListener('pointerup', release)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('blur', cancel)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('keydown', escape)
    }
  }, [onPieceRelease, onPieceCancel, clearFrozenFeedback])

  const board = game.board()
  const [frostRotations, setFrostRotations] = useState<Record<string, number>>({})
  useEffect(() => {
    // Sample once after hydration; preview, trail and final frost share each square's rotation.
    setFrostRotations(Object.fromEntries(ROWS.flatMap(row => COLUMNS.map(col => [`${col}${row}`, Math.random() * 360]))))
  }, [])
  const entranceDelayBySquareRef = useRef<Record<string, number> | null>(null)
  if (!entranceDelayBySquareRef.current) {
    const shuffledSquares = ROWS.flatMap(row => COLUMNS.map(col => `${col}${row}`))
    for (let index = shuffledSquares.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1))
      ;[shuffledSquares[index], shuffledSquares[swapIndex]] = [shuffledSquares[swapIndex], shuffledSquares[index]]
    }
    entranceDelayBySquareRef.current = Object.fromEntries(
      shuffledSquares.map((square, index) => [square, index * 34 + Math.round(Math.random() * 36)]),
    )
  }
  const inCheck = freeMode ? false : game.isCheck()
  const turn = game.turn()
  const gameHistory = freeMode ? [] : game.history({ verbose: true })
  const lastMove = matchPowers.some(power => power.appliedAtPly === gameHistory.length)
    ? null
    : gameHistory.at(-1) ?? null
  const lastMoveHighlightKey = lastMove ? `${gameHistory.length}-${lastMove.from}-${lastMove.to}` : undefined

  const [animatingPieces, setAnimatingPieces] = useState<PieceAnimation[]>([])
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mulliganGhostPieces, setMulliganGhostPieces] = useState<MulliganGhostPiece[]>([])

  const justDraggedRef = useRef(false)

  const getCoords = (sq: Square) => {
    const col = sq.charCodeAt(0) - 97
    const row = 8 - parseInt(sq[1])
    return { x: (orientation === "black" ? 7 - col : col) * 12.5, y: (orientation === "black" ? 7 - row : row) * 12.5 }
  }

  const animatePieces = useCallback((pieces: PieceAnimationInput[], duration: number, easing = false) => {
    if (animationTimerRef.current !== null) clearTimeout(animationTimerRef.current)
    animationTimerRef.current = null
    if (pieces.length === 0) {
      setAnimatingPieces([])
      return
    }
    setAnimatingPieces(pieces.map(piece => ({ ...piece, duration, easing: easing ? MULLIGAN_EASING : "linear" })))
    animationTimerRef.current = setTimeout(() => {
      animationTimerRef.current = null
      setAnimatingPieces([])
    }, duration)
  }, [])

  useEffect(() => () => {
    if (animationTimerRef.current !== null) clearTimeout(animationTimerRef.current)
  }, [])

  useEffect(() => {
    if (!mulliganPreviewMoves || mulliganPreviewMoves.length === 0) {
      setMulliganGhostPieces([])
      return
    }

    setMulliganGhostPieces(mulliganPreviewMoves.map(move => {
      const start = getCoords(move.currentSquare)
      const target = getCoords(move.targetSquare)
      return {
        piece: move.piece,
        currentSquare: move.currentSquare,
        targetSquare: move.targetSquare,
        startX: start.x,
        startY: start.y,
        targetX: target.x,
        targetY: target.y,
      }
    }))
  }, [mulliganPreviewMoves, orientation])

  // We need to intercept the game update to set up animation
  // Since 'game' prop changes instantly, we can use a ref to track previous FEN or history length
  const prevHistory = useRef<Move[] | null>(null)
  if (prevHistory.current === null) prevHistory.current = game.history({ verbose: true })
  const prevUndoAnimationKey = useRef(undoAnimationKey)
  
  useEffect(() => {
      if (freeMode) return
      const history = game.history({ verbose: true })
      const previousHistory = prevHistory.current ?? []
      if (history.length > previousHistory.length) {
          const lastMove = history[history.length - 1]
          
          if (!justDraggedRef.current) {
             const from = getCoords(lastMove.from)
             const to = getCoords(lastMove.to)
             
             animatePieces([{
                 piece: `${lastMove.color}${lastMove.piece.toUpperCase()}`,
                 from: lastMove.from,
                 to: lastMove.to,
                 startX: from.x,
                 startY: from.y,
                 targetX: to.x,
                 targetY: to.y,
             }], 200)
          }
      } else if (history.length < previousHistory.length && undoAnimationKey !== prevUndoAnimationKey.current) {
          setMulliganGhostPieces([])
          const undoneMoves = previousHistory.slice(history.length).reverse()
          const reverseAnimations = undoneMoves.map(move => {
            const from = getCoords(move.to)
            const to = getCoords(move.from)
            return {
              piece: `${move.color}${(move.promotion ?? move.piece).toUpperCase()}`,
              from: move.to,
              to: move.from,
              startX: from.x,
              startY: from.y,
              targetX: to.x,
              targetY: to.y,
            }
          })
          animatePieces(reverseAnimations, MULLIGAN_ANIMATION_MS, true)
          onUndoAnimation?.()
      }
      prevHistory.current = history
      prevUndoAnimationKey.current = undoAnimationKey
  }, [game, freeMode, undoAnimationKey, animatePieces, onUndoAnimation])

  const [fadingPowers, setFadingPowers] = useState<MatchPower[]>([])
  const effectPowers = confirmedPowerState?.powers ?? matchPowers
  const effectPly = confirmedPowerState?.ply ?? game.history().length
  const previousPowers = useRef({ powers: effectPowers, ply: effectPly })
  useEffect(() => {
    const removed = freeMode ? [] : releasedPowers(previousPowers.current.powers, effectPowers, previousPowers.current.ply, effectPly)
    previousPowers.current = { powers: effectPowers, ply: effectPly }
    const move = game.history({ verbose: true }).at(-1)
    const effects = removed.map(power => {
      if (move && (power.attachedColor ?? power.frozenColor) === move.color) {
        if (power.square === move.from) return { ...power, square: move.to }
        if (move.flags.includes('k') && power.square === (move.color === 'w' ? 'h1' : 'h8')) return { ...power, square: (move.color === 'w' ? 'f1' : 'f8') as Square }
        if (move.flags.includes('q') && power.square === (move.color === 'w' ? 'a1' : 'a8')) return { ...power, square: (move.color === 'w' ? 'd1' : 'd8') as Square }
      }
      return power
    })
    setFadingPowers(current => current.length === 0 && effects.length === 0 ? current : effects)
    if (!effects.length) return
    const cancels = [...new Set(effects.map(power => power.kind))].map(kind => getSfxEngine().playPowerRelease(kind))
    const timer = window.setTimeout(() => setFadingPowers([]), POWER_RELEASE_MS)
    return () => { window.clearTimeout(timer); cancels.forEach(cancel => cancel()) }
  }, [game, effectPowers, effectPly, freeMode])

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

  const rejectPowerCapture = useCallback((from: Square, to: Square) => {
    const attacker = game.get(from)
    if (!attacker || attacker.color !== game.turn()) return false
    const target = game.get(to)
    const enPassant = attacker.type === 'p' && from[0] !== to[0] && !target && game.fen().split(' ')[3] === to
    if (!enPassant && (!target || target.color === attacker.color)) return false
    const capture = { from, to, color: attacker.color, flags: enPassant ? 'e' : 'c', captured: enPassant ? 'p' : target?.type }
    if (frozenCaptureBlock(capture, matchPowers)) {
      triggerAttackerShake(from)
      void getSfxEngine().playBlockedCue()
      onFrozenCaptureBlocked?.()
      return true
    }
    const reason = shieldCaptureBlock(capture, matchPowers)
    if (!reason) return false
    onShieldCaptureBlocked?.(reason)
    return true
  }, [game, matchPowers, onShieldCaptureBlocked, onFrozenCaptureBlocked, triggerAttackerShake])

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (freeMode) {
        onBoardClick?.(square)
        return
      }

      if (!deferMoves && isThinking && turn !== playerColor) {
        if (selectedSquare) {
          setPremove({ from: selectedSquare, to: square })
          setSelectedSquare(null)
          setLegalMoves([])
          return
        }
      }

      if (movesDisabled || turn !== playerColor || game.isGameOver()) {
        if (selectedSquare) {
          setSelectedSquare(null)
          setLegalMoves([])
        }
        onBoardClick?.(square)
        return
      }

      const piece = game.get(square)

      if (selectedSquare) {
        if (rejectPowerCapture(selectedSquare, square)) {
          setSelectedSquare(null)
          setLegalMoves([])
          return true
        }
        try {
          const candidate = game.moves({ square: selectedSquare, verbose: true }).find(move => move.to === square && (!move.promotion || move.promotion === 'q'))
          if (!candidate || (isMoveAllowed && !isMoveAllowed(candidate))) throw new Error('Move blocked by a power')
          const move = deferMoves ? candidate : game.move({
            from: selectedSquare,
            to: square,
            promotion: "q",
          })

          if (move) {
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
            const moves = game.moves({ square, verbose: true }).filter(move => !isMoveAllowed || isMoveAllowed(move))
            setLegalMoves(moves.map((m) => m.to as Square))
          } catch {
            setLegalMoves([])
          }
        } else {
          setLegalMoves([])
        }

        onBoardClick?.(square)
      } else {
        setSelectedSquare(null)
        setLegalMoves([])
        onBoardClick?.(square)
      }
    },
    [game, selectedSquare, turn, isThinking, onMove, freeMode, onBoardClick, isMoveAllowed, rejectPowerCapture, playerColor, movesDisabled, deferMoves, orientation],
  )

  // Handle drag and drop
  const handleDragStart = useCallback(
    (e: React.PointerEvent, square: Square) => {
      if (!freeMode && matchPowers.some(power => power.kind === 'freeze' && power.square === square)) return
      if (game.get(square) || freeMode?.mode === 'play') {
        heldSquareRef.current = square
        onPieceHold?.(square)
      }
      if (!freeMode && !onPieceHold && (movesDisabled || turn !== playerColor || game.isGameOver())) return

      const piece = freeMode?.mode === 'play' ? freeMode.auditionPiece : game.get(square)
      if (!piece || (!freeMode && !onPieceHold && piece.color !== playerColor)) return

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
        const moves = game.moves({ square, verbose: true }).filter(move => !isMoveAllowed || isMoveAllowed(move))
        setLegalMoves(moves.map((m) => m.to as Square))
      }
    },
    [game, turn, onPieceHold, freeMode, isMoveAllowed, matchPowers, playerColor, movesDisabled],
  )

  const handleDragMove = useCallback(
    (e: PointerEvent) => {
      const frozenAttempt = frozenAttemptRef.current
      if (frozenAttempt && frozenAttempt.pointerId === e.pointerId && boardRef.current) {
        if (e.cancelable) e.preventDefault()
        if (!frozenAttempt.notified) {
          const rect = boardRef.current.getBoundingClientRect()
          const coords = getCoords(frozenAttempt.square)
          const left = rect.left + rect.width * coords.x / 100
          const top = rect.top + rect.height * coords.y / 100
          if (e.clientX < left || e.clientX >= left + rect.width / 8 || e.clientY < top || e.clientY >= top + rect.height / 8) {
            frozenAttempt.notified = true
            tapStartRef.current = null
            lastTapRef.current = null
            if (frozenFeedbackTimeoutRef.current !== null) window.clearTimeout(frozenFeedbackTimeoutRef.current)
            cancelFrozenSoundRef.current?.()
            setFrozenFeedbackSquare(frozenAttempt.square)
            cancelFrozenSoundRef.current = getSfxEngine().playFrozenPieceClink()
            frozenFeedbackTimeoutRef.current = window.setTimeout(() => {
              frozenFeedbackTimeoutRef.current = null
              setFrozenFeedbackSquare(null)
              cancelFrozenSoundRef.current?.()
              cancelFrozenSoundRef.current = null
            }, 280)
          }
        }
        return
      }
      const dragPiece = dragPieceRef.current
      if (!dragPiece || !boardRef.current) return
      if (e.cancelable) e.preventDefault()

      const rect = boardRef.current.getBoundingClientRect()
      const clientX = e.clientX
      const clientY = e.clientY

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
        const targetSquare = `${columns[file]}${rows[rank]}` as Square
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
    [onDragOverSquare, orientation],
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
        const targetSquare = `${columns[file]}${rows[rank]}` as Square
        if (freeMode.mode === 'move' && targetSquare !== dragPiece.from) {
          freeTapRef.current = null
          freeMode.onMove(dragPiece.from, targetSquare)
          didMove = true
        } else if (freeMode.mode === 'move' && game.get(targetSquare)) {
          const last = freeTapRef.current
          const now = Date.now()
          if (last?.square === targetSquare && now - last.time < 350) {
            freeTapRef.current = null
            freeMode.onTogglePiece(targetSquare)
          } else freeTapRef.current = { square: targetSquare, time: now }
        }
      } else if (freeMode?.mode === 'move' && didDrag && freeMode.onDropOutside && (file < 0 || file >= 8 || rank < 0 || rank >= 8)) {
        freeTapRef.current = null
        freeMode.onDropOutside(dragPiece.from)
        didMove = true
      } else if (didDrag && file >= 0 && file < 8 && rank >= 0 && rank < 8 && dragPiece.piece.startsWith(playerColor) && game.turn() === playerColor && !movesDisabled && !game.isGameOver()) {
        const targetSquare = `${columns[file]}${rows[rank]}` as Square

        try {
          if (rejectPowerCapture(dragPiece.from, targetSquare)) throw new Error('Power capture blocked')
          const candidate = game.moves({ square: dragPiece.from, verbose: true }).find(move => move.to === targetSquare && (!move.promotion || move.promotion === 'q'))
          if (!candidate || (isMoveAllowed && !isMoveAllowed(candidate))) throw new Error('Move blocked by a power')
          const move = deferMoves ? candidate : game.move({
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

            onMove(move)
          }
        } catch {
          // Invalid move
        }
      }

      setDragPiece(null)
      lastHoverSquareRef.current = null
      if (dragHighlightRef.current) dragHighlightRef.current.style.opacity = '0'
      if (didMove) {
        setSelectedSquare(null)
        setLegalMoves([])
      }
    },
    [game, onMove, freeMode, isMoveAllowed, rejectPowerCapture, playerColor, movesDisabled, deferMoves, orientation],
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
    return () => {
      if (dragHighlightTimeoutRef.current !== null) {
        window.clearTimeout(dragHighlightTimeoutRef.current)
      }
    }
  }, [])

  // Clear premove when turn changes
  useEffect(() => {
    if (!freeMode && !deferMoves && !movesDisabled && turn === playerColor && premove) {
      // Try to execute premove
      try {
        if (rejectPowerCapture(premove.from, premove.to)) throw new Error('Power capture blocked')
        const candidate = game.moves({ square: premove.from, verbose: true }).find(move => move.to === premove.to && (!move.promotion || move.promotion === 'q'))
        if (!candidate || (isMoveAllowed && !isMoveAllowed(candidate))) throw new Error('Move blocked by a power')
        const move = deferMoves ? candidate : game.move({
          from: premove.from,
          to: premove.to,
          promotion: "q",
        })
        if (move) {
          onMove(move)
        }
      } catch {
        // Invalid premove
      }
      setPremove(null)
    }
  }, [turn, premove, game, onMove, freeMode, isMoveAllowed, rejectPowerCapture, playerColor, movesDisabled, deferMoves, orientation])

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
          touchAction: 'pan-y',
          // @ts-expect-error - CSS variable injection
          "--city-color": cityColor,
        }}
        onPointerUp={e => handleDragEnd(e.nativeEvent)}

      >
        <svg aria-hidden="true" className="pointer-events-none absolute h-0 w-0" focusable="false">
          <defs>
            <filter id="frozen-piece-texture" x="-15%" y="-15%" width="130%" height="130%" colorInterpolationFilters="sRGB">
              <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="desaturated" />
              <feComponentTransfer in="desaturated" result="iceTone">
                <feFuncR type="linear" slope=".5" intercept=".18" />
                <feFuncG type="linear" slope=".75" intercept=".4" />
                <feFuncB type="linear" slope=".9" intercept=".6" />
              </feComponentTransfer>
              <feTurbulence type="fractalNoise" baseFrequency="0.06 0.28" numOctaves="2" seed="9" result="frostMottle" />
              <feColorMatrix
                in="frostMottle"
                type="matrix"
                values="0 0 0 0 0.62 0 0 0 0 0.82 0 0 0 0 1 0.25 0.25 0.25 0 0"
                result="frostColor"
              />
              <feComposite in="frostColor" in2="SourceAlpha" operator="in" result="frostInsidePiece" />
              <feBlend in="iceTone" in2="frostInsidePiece" mode="screen" />
            </filter>
          </defs>
        </svg>
        <style jsx>{`
          .board-square-light {
            background-color: rgba(255, 255, 255, 0.2);
          }
        .board-square-dark {
            background-color: color-mix(in srgb, var(--city-color) 60%, rgba(150, 150, 150, 0.75) 80%);
        }
        @keyframes board-square-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .board-square-entering {
          animation: board-square-fade-in 280ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .board-square-entering { animation: none; }
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
        {rows.map((row, rowIndex) =>
          columns.map((col, colIndex) => {
            const square = `${col}${row}` as Square
            const piece = game.get(square)
            const hasPiece = !!piece
            const canDragFromSquare = hasPiece || freeMode?.mode === 'play'
            const isLight = (rowIndex + colIndex) % 2 === 0
            const isSelected = selectedSquare === square
            const isLegalMove = legalMoves.includes(square)
            const isKingInCheck = kingSquare === square
            const isLastMove = lastMove?.from === square || lastMove?.to === square
            const isPremoveSquare = premove?.from === square || premove?.to === square
            const isDragging = dragPiece?.from === square
            const isAnimatingTo = animatingPieces.some(animation => animation.to === square)
            const isSynthSelected = synthSelectedSquare === square
            const isActive = musicEffectsEnabled && activeSquares?.has(square)
            const pieceColor = piece?.color ?? 'w'
            const pieceTeamGain = teamMixes ? (teamMixes[pieceColor]?.gain ?? 1) : 1
            const activeGlowFactor = Math.max(0, Math.min(1, pieceTeamGain))
            const isPressedPiece = pressedPieceSquare === square
            const frozen = matchPowers.some(power => power.kind === 'freeze' && power.square === square)
            const shielded = matchPowers.some(power => power.kind === 'shield' && power.square === square)
            const squareBackgroundColor = isKingInCheck
              ? "rgba(239, 68, 68, 0.6)"
              : isSelected
                ? `${cityColor}40`
                : isPremoveSquare
                  ? "rgba(59, 130, 246, 0.3)"
                  : isLight
                    ? `color-mix(in srgb, ${cityColor} 20%, #6c6c6cbf 80%)`
                    : `color-mix(in srgb, ${cityColor} 20%, #303030bf 80%)`
            const displayedSquareBackgroundColor = isLastMove
              ? `color-mix(in srgb, ${squareBackgroundColor} 85%, transparent)`
              : squareBackgroundColor

            return (
              <button
                key={square}
                aria-busy={pendingSquares.includes(square) || undefined}
                aria-label={freeMode?.squareLabel?.(square) ?? `${square}${piece ? ` ${piece.color} ${piece.type}` : " empty"}`}
                data-square={square}
                className={cn(
                  "relative aspect-square flex items-center justify-center transition-colors duration-150 w-full",
                  entranceActive && "board-square-entering",
                  !isKingInCheck && !isSelected && !isPremoveSquare && (isLight ? "board-square-light" : "board-square-dark"),
                  (isSynthSelected || (piece && isSynthSelected)) &&
                    "after:absolute after:inset-0 after:border-2 after:border-white after:pointer-events-none after:z-20",
                  isSynthSelected && musicEffectsEnabled && "shadow-[0_0_15px_rgba(255,255,255,0.5)]",
                )}
                style={{
                  backgroundColor: displayedSquareBackgroundColor,
                  touchAction: canDragFromSquare || onEmptySquarePointerDown ? 'none' : 'pan-y',
                  zIndex: isKingInCheck ? 5 : isSynthSelected ? 4 : isSelected ? 3 : isActive ? 2 : undefined,
                  '--power-frost-angle': `${125 + (frostRotations[square] ?? 0)}deg`,
                  '--power-frost-x': `${50 - 25 * Math.cos((frostRotations[square] ?? 0) * Math.PI / 180) + 30 * Math.sin((frostRotations[square] ?? 0) * Math.PI / 180)}%`,
                  '--power-frost-y': `${50 - 25 * Math.sin((frostRotations[square] ?? 0) * Math.PI / 180) - 30 * Math.cos((frostRotations[square] ?? 0) * Math.PI / 180)}%`,
                  ...(entranceActive ? { animationDelay: `${entranceDelayBySquareRef.current?.[square] ?? 0}ms` } : {}),
                } as React.CSSProperties}
                onPointerDown={(e) => {
                  if (!e.isPrimary || e.button !== 0) {
                    tapStartRef.current = null
                    lastTapRef.current = null
                    setPressedPieceSquare(null)
                    return
                  }
                  if (armedPower && !freeMode) {
                    e.preventDefault()
                    tapStartRef.current = null
                    lastTapRef.current = null
                    setPressedPieceSquare(null)
                    setSelectedSquare(null)
                    setLegalMoves([])
                    return
                  }
                  setPressedPieceSquare(piece ? square : null)
                  if (lastTapRef.current?.square !== square || lastTapRef.current.pointerType !== e.pointerType) lastTapRef.current = null
                  tapStartRef.current = { square, x: e.clientX, y: e.clientY, pointerType: e.pointerType }

                  if (canDragFromSquare) {
                    e.currentTarget.setPointerCapture(e.pointerId)
                  }

                  if (!freeMode && !movesDisabled && turn === playerColor && selectedSquare && selectedSquare !== square && rejectPowerCapture(selectedSquare, square)) {
                    setSelectedSquare(null)
                    setLegalMoves([])
                    return
                  }
                  if (!freeMode && piece && frozen) {
                    e.preventDefault()
                    clearFrozenFeedback()
                    frozenAttemptRef.current = { square, pointerId: e.pointerId, notified: false }
                    setSelectedSquare(square)
                    setLegalMoves([])
                    void getSfxEngine().resume()
                    return
                  }

                  if (!canDragFromSquare) onEmptySquarePointerDown?.(e)

                  if (canDragFromSquare) {
                    const isSecondTap = !freeMode && hasPiece && lastTapRef.current?.square === square && Date.now() - lastTapRef.current.time < 350
                    if (!isSecondTap && handleSquareClick(square)) return
                    handleDragStart(e, square)
                  }
                }}
                onPointerUp={(e) => {
                  if (armedPower) return
                  const start = tapStartRef.current
                  tapStartRef.current = null
                  if (!start || dragStartedRef.current || start.square !== square || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) {
                    lastTapRef.current = null
                    setPressedPieceSquare(null)
                    return
                  }
                  if (canDragFromSquare) {
                    if (!freeMode && hasPiece) {
                      const last = lastTapRef.current
                      const now = Date.now()
                      if (last?.square === square && last.pointerType === e.pointerType && now - last.time < 350) {
                        lastTapRef.current = null
                        onPieceDoubleTap?.(square)
                      } else {
                        lastTapRef.current = { square, time: now, pointerType: e.pointerType }
                      }
                    }
                    setPressedPieceSquare(null)
                  } else {
                    lastTapRef.current = null
                    setPressedPieceSquare(null)
                    handleSquareClick(square)
                  }
                }}
                onPointerCancel={() => { tapStartRef.current = null; lastTapRef.current = null; setPressedPieceSquare(null) }}
                onLostPointerCapture={e => {
                  if (frozenAttemptRef.current?.pointerId === e.pointerId) clearFrozenFeedback()
                }}
                onKeyDown={e => {
                  if (armedPower && !freeMode && (e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); onPowerTarget?.(square) }
                  else if (freeMode?.mode === 'play' && (e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); onPieceHold?.(square) }
                }}
                onKeyUp={e => { if (freeMode?.mode === 'play' && (e.key === ' ' || e.key === 'Enter')) onPieceRelease?.() }}
                onBlur={() => { if (freeMode?.mode === 'play') { if (onPieceCancel) onPieceCancel(); else onPieceRelease?.() } }}
              >
                {isLastMove && (
                  <>
                    <span
                      key={`${lastMoveHighlightKey}-filter`}
                      aria-hidden="true"
                      data-recent-move-filter
                      className={cn("pointer-events-none absolute inset-0", rewardStyles.recentMoveTint)}
                      style={{
                        WebkitBackdropFilter: "invert(100%)",
                        backdropFilter: "invert(100%)",
                        zIndex: 0,
                      }}
                    />
                    <span
                      key={lastMoveHighlightKey}
                      aria-hidden="true"
                      style={{ backgroundColor: "rgba(220, 205, 255, 0.1)", zIndex: 1 }}
                      data-recent-move-tint
                      className={cn("pointer-events-none absolute inset-0", rewardStyles.recentMoveTint)}
                    />
                  </>
                )}
                {isActive && (
                  <div
                    className="pointer-events-none absolute inset-0 isolate transition-opacity duration-1000 ease-in-out"
                    style={{ opacity: activeGlowFactor, zIndex: 1 }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none rounded-none active-border-fade"
                      style={{
                        boxShadow: `0 0 16px ${cityColor}`,
                      }}
                    />
                    <div
                      className="absolute inset-0 pointer-events-none rounded-none animate-pulse"
                      style={{
                        boxShadow: `0 0 18px ${cityColor}90`,
                      }}
                    />
                  </div>
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
                {showRankedMoveMarks && rankedMoveMark?.square === square && (
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
                {(() => {
                  const target = squareEggs.find(item => item.square === square)
                  if (!target) return null
                  const shown = Math.min(target.eggs, 6)
                  return <span
                    data-square-eggs={target.eggs}
                    aria-label={`${target.eggs} golden ${target.eggs === 1 ? 'egg' : 'eggs'} for any piece that lands here`}
                    className={cn(rewardStyles.squareEggs, "pointer-events-none absolute inset-0 z-[12] flex flex-wrap content-center items-center justify-center gap-[2%] px-[6%]")}
                  >
                    {Array.from({ length: shown }, (_, index) => <span
                      key={index}
                      aria-hidden="true"
                      className={cn(
                        "inline-block w-[14%] min-w-[7px] aspect-[15/19] rounded-[50%_50%_45%_45%/60%_60%_40%_40%] border border-black/80 bg-[radial-gradient(circle_at_32%_25%,#fff8c4_0%,#facc15_43%,#b45309_100%)]",
                      )}
                    />)}
                  </span>
                })()}
                {frozen && <span aria-hidden="true" data-power-frost className={cn(rewardStyles.powerFrost, "pointer-events-none absolute inset-0 z-[2]")} />}
                {!freeMode && (armedPower === 'shield'
                  ? <span aria-hidden="true" data-power-preview className="pointer-events-none absolute inset-0 z-[11] flex items-center justify-center" style={{ opacity: 0 }}>
                      <GoldenShield preview />
                    </span>
                  : <span aria-hidden="true" data-power-preview className={cn(rewardStyles.powerFrost, "pointer-events-none absolute inset-0 z-[2]")} style={{ opacity: 0 }} />)}
                {piece && (!isDragging || freeMode?.mode === 'play') && !isAnimatingTo && (
                  <div
                    key={rejectedAttackerSquare?.square === square ? `rejected-${rejectedAttackerSquare.key}` : undefined}
                    data-pending-move={pendingSquares.includes(square) ? square : undefined}
                    data-frozen-feedback={frozenFeedbackSquare === square || undefined}
                    data-rejected-attacker={rejectedAttackerSquare?.square === square || undefined}
                    className={cn(
                      "relative z-10 w-[85%] h-[85%] transition-transform duration-150",
                      freeMode && "w-[90%] h-[90%] [&_svg]:w-full [&_svg]:h-full",
                      piece.color === 'b' && "black-piece-outline",
                      isSelected && "scale-105",
                      (frozenFeedbackSquare === square || rejectedAttackerSquare?.square === square) && rewardStyles.frozenAttemptPiece
                    )}
                    style={{
                      opacity: pendingSquares.includes(square) ? 0.45 : undefined,
                      filter: frozen
                        ? 'url(#frozen-piece-texture) drop-shadow(0 0 5px #36dcff) drop-shadow(0 0 12px #7ae9ff)'
                        : isActive || (musicEffectsEnabled && isPressedPiece)
                          ? `drop-shadow(0 0 8px ${cityColor})`
                          : undefined,
                      transition: "transform 150ms",
                    }}
                    dangerouslySetInnerHTML={stableHtml(PiecesSVG[`${piece.color}${piece.type.toUpperCase()}` as PieceKey] || "")}
                  />
                )}
                {frozen && <IceCrystal />}
                {shielded && <GoldenShield />}
                {fadingPowers.filter(power => power.square === square).map(power => power.kind === 'freeze'
                  ? <span key={power.id} data-power-releasing="freeze" className={cn(rewardStyles.powerFrost, rewardStyles.powerRelease, "pointer-events-none absolute inset-0 z-[12]")}><IceCrystal releasing /></span>
                  : <span key={power.id} data-power-releasing="shield" className="pointer-events-none absolute inset-0 z-[12]"><GoldenShield releasing /></span>)}

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
        {musicEffectsEnabled && musicPulseMonitor && <MusicPulseOverlay monitor={musicPulseMonitor} orientation={orientation} />}
      </div>

      {rankedMoveAnnouncement && (() => {
        const fileIndex = columns.indexOf(rankedMoveAnnouncement.square[0])
        const rowIndex = rows.indexOf(rankedMoveAnnouncement.square[1])
        const good = rankedMoveAnnouncement.kind === 'best'
        const headlineColor = rankedMoveAnnouncement.comeback ? '#ff9d32' : rankedMoveAnnouncement.kind === 'neutral' ? '#ffffff' : good ? '#41ed8c' : '#ff5d64'
        return <div
          key={rankedMoveAnnouncement.id}
          aria-live="polite"
          className="pointer-events-none absolute z-[100] flex -translate-x-1/2 -translate-y-full flex-col items-center gap-0.5 whitespace-nowrap"
          style={{ left: `${(fileIndex + .5) * 12.5}%`, top: `${rowIndex * 12.5}%` }}
        >
          <span
            className={cn(rewardStyles.rankedRewardHeadline, "font-mono font-bold text-[11px] drop-shadow-[0_1px_5px_rgba(0,0,0,.95)]", rankedMoveAnnouncement.streak && [rewardStyles.rankedRewardHeadlineStreak, "text-[13px]"])}
            style={{ color: headlineColor, textShadow: `0 0 8px ${headlineColor}80` }}
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
      {animatingPieces.map((animation, index) => (
        <GlidingSquare
          key={`${animation.piece}-${animation.from}-${animation.to}-${index}`}
          className="absolute pointer-events-none z-40 w-[12.5%] h-[12.5%] flex items-center justify-center"
          startX={animation.startX}
          startY={animation.startY}
          targetX={animation.targetX}
          targetY={animation.targetY}
          duration={animation.duration}
          easing={animation.easing}
        >
             <div
                data-pending-move={pendingSquares.includes(animation.to) ? animation.to : undefined}
                className={cn("w-[85%] h-[85%]", animation.piece.startsWith('b') && "black-piece-outline")}
                style={{
                  opacity: pendingSquares.includes(animation.to) ? 0.45 : undefined,
                  filter: musicEffectsEnabled ? `drop-shadow(0 0 12px ${cityColor})` : undefined,
                }}
                dangerouslySetInnerHTML={stableHtml(PiecesSVG[animation.piece as PieceKey] || "")}
              />
        </GlidingSquare>
      ))}

      {/* Mulligan Ghost Preview Pieces */}
      {mulliganGhostPieces.map((ghost, index) => (
        <GlidingSquare
          key={`mulligan-ghost-${ghost.piece}-${ghost.currentSquare}-${ghost.targetSquare}-${index}`}
          data-mulligan-ghost="true"
          className="absolute pointer-events-none z-30 w-[12.5%] h-[12.5%] flex items-center justify-center"
          startX={ghost.startX}
          startY={ghost.startY}
          targetX={ghost.targetX}
          targetY={ghost.targetY}
          duration={MULLIGAN_PREVIEW_DURATION_MS}
          easing={MULLIGAN_GHOST_EASING}
        >
          <div
            className={cn("w-[85%] h-[85%]", ghost.piece.startsWith('b') && "black-piece-outline")}
            style={{
              opacity: 0.5,
              filter: musicEffectsEnabled ? `drop-shadow(0 0 12px ${cityColor})` : undefined,
            }}
            dangerouslySetInnerHTML={stableHtml(PiecesSVG[ghost.piece as PieceKey] || "")}
          />
        </GlidingSquare>
      ))}

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
            filter: musicEffectsEnabled ? `drop-shadow(0 0 12px ${cityColor})` : undefined,
          }}
          dangerouslySetInnerHTML={stableHtml(PiecesSVG[dragPiece.piece as PieceKey] || "")}
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
