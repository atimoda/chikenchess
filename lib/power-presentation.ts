import type { MatchPower } from './chess-powers'
import type { Chess, Square } from 'chess.js'

export const MULLIGAN_ANIMATION_MS = 360
export const MULLIGAN_PREVIEW_DURATION_MS = MULLIGAN_ANIMATION_MS * 2
export const POWER_RELEASE_MS = 320

export interface MulliganPreviewMove {
  piece: string
  currentSquare: Square
  targetSquare: Square
}

/** Ease-in-out (cubic easing) for the Mulligan ghost preview, providing a distinct, smooth acceleration from rest and deceleration into destination. */
export function mulliganGhostEaseInOut(progress: number): number {
  if (progress <= 0) return 0
  if (progress >= 1) return 1
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2
}

/** Resolves moves to undo and their ghost copies for offline match (1 move during AI thinking, 2 moves on player turn). */
export function getOfflineMulliganPreviewMoves(game: Chess): MulliganPreviewMove[] {
  const history = game.history({ verbose: true })
  if (history.length === 0) return []
  const isAiThinking = history.length % 2 !== 0
  const stepsToUndo = isAiThinking ? 1 : 2
  if (history.length < stepsToUndo) return []
  const undoneMoves = history.slice(-stepsToUndo)
  return undoneMoves.map(move => ({
    piece: `${move.color}${(move.promotion ?? move.piece).toUpperCase()}`,
    currentSquare: move.to,
    targetSquare: move.from,
  }))
}

/** Resolves moves to undo and their ghost copies for online match from player's last move onward. */
export function getOnlineMulliganPreviewMoves(
  game: Chess,
  actions: Array<{ kind: string; color?: string }>,
  color: 'w' | 'b'
): MulliganPreviewMove[] {
  const index = actions.findLastIndex(a => a.kind === "move" && a.color === color)
  if (index < 0) return []
  const moveActionsCount = actions.slice(index).filter(a => a.kind === "move").length
  const history = game.history({ verbose: true })
  if (history.length < moveActionsCount) return []
  const undoneMoves = history.slice(-moveActionsCount)
  return undoneMoves.map(move => ({
    piece: `${move.color}${(move.promotion ?? move.piece).toUpperCase()}`,
    currentSquare: move.to,
    targetSquare: move.from,
  }))
}

export function animateInsufficientEggs(counter: HTMLElement | null) {
  counter?.animate([
    { transform: 'translateX(0)', boxShadow: '0 0 0 rgba(248,113,113,0)' },
    { transform: 'translateX(-4px)', boxShadow: '0 0 14px rgba(248,113,113,.55)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(-3px)' },
    { transform: 'translateX(3px)' },
    { transform: 'translateX(0)', boxShadow: '0 0 0 rgba(248,113,113,0)' },
  ], { duration: 360, easing: 'ease-in-out' })
}

/** Match the CSS ease-in-out used by the Mulligan card (cubic-bezier .42,0,.58,1). */
export function mulliganProgress(progress: number): number {
  if (progress <= 0 || progress >= 1) return progress
  let low = 0, high = 1
  for (let i = 0; i < 16; i++) {
    const t = (low + high) / 2
    const x = 3 * (1 - t) ** 2 * t * .42 + 3 * (1 - t) * t ** 2 * .58 + t ** 3
    if (x < progress) low = t
    else high = t
  }
  const t = (low + high) / 2
  return 3 * (1 - t) * t ** 2 + t ** 3
}

/** Presentation follows forward play; history restoration/reconnection never cracks old powers. */
export function releasedPowers(previous: MatchPower[], current: MatchPower[], previousPly: number, ply: number): MatchPower[] {
  if (ply <= previousPly) return []
  const live = new Set(current.map(power => power.id))
  return previous.filter(power => !live.has(power.id))
}
