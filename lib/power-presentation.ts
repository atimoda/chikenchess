import type { MatchPower } from './chess-powers'

export const MULLIGAN_ANIMATION_MS = 360
export const POWER_RELEASE_MS = 320

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
