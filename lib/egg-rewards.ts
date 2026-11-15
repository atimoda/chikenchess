import eggRewardsJson from '../data/ui/egg-rewards.json'

// Match egg economy shared by the campaign, the ChickenBot and the online domain.
// Edited in the Admin (`data/ui/egg-rewards.json`).

export interface EggRewardsConfig {
  /** A team's match balance never grows past this from rewards. */
  maxMatchEggs: number
  /** How many Best and how many Worst moves earn eggs, by number of legal moves (highest matching tier wins). */
  rankedMovesByLegalMoves: { minLegalMoves: number; moves: number }[]
  /** The eggs on the suggested destination squares stay fully visible this long after the arrows fade... */
  squareEggsHoldSeconds: number
  /** ...then fade out over this long; any piece landing there earns them until they are gone. */
  squareEggsFadeSeconds: number
}

export const EGG_REWARDS: EggRewardsConfig = eggRewardsJson

/** How long the square eggs outlive the arrows: the full hold plus the fade. */
export function squareEggsExtraMs(config: EggRewardsConfig = EGG_REWARDS): number {
  return (config.squareEggsHoldSeconds + config.squareEggsFadeSeconds) * 1000
}

/** Rewarded moves per list (Best and Worst each) for a position with `legalMoves` choices. */
export function rankedMovesPerList(legalMoves: number, config: EggRewardsConfig = EGG_REWARDS): number {
  const tier = [...config.rankedMovesByLegalMoves]
    .sort((a, b) => b.minLegalMoves - a.minLegalMoves)
    .find(item => legalMoves >= item.minLegalMoves)
  return tier?.moves ?? 0
}

/** The most a ranked move pays when only one Best and one Worst move are on offer. */
export const SINGLE_RANKED_MOVE_MAX_EGGS = 3

/** Eggs a ranked move pays in a position with `legalMoves` choices: with a single Best/Worst move, the x2 streak stops at 3. */
export function rankedMoveEggsForPosition(eggs: number, legalMoves: number, config: EggRewardsConfig = EGG_REWARDS): number {
  // Without a move count (older snapshots) the reward is kept as it is.
  if (!Number.isFinite(legalMoves) || rankedMovesPerList(legalMoves, config) > 1) return eggs
  return Math.min(eggs, SINGLE_RANKED_MOVE_MAX_EGGS)
}

/**
 * Streak a ranked move belongs to. A "comeback" is a Best-list move paid as Worst because its own
 * score is below -1.00 pawn (or mate against the mover): it is still a Best move for the streak.
 */
export function rankedMoveStreakKind(kind: 'best' | 'worst', comeback: boolean): 'best' | 'worst' {
  return comeback ? 'best' : kind
}

/**
 * The x2 from the third ranked move in a row. A comeback pays the Worst base and is never doubled:
 * otherwise a losing position turns every Best move into a doubled Worst, 6 eggs a move.
 */
export function rankedStreakDoubles(streakCount: number, comeback: boolean): boolean {
  return !comeback && streakCount >= 3
}

/** Keep only the rewarded head of each list: the best of Best and the worst of Worst. */
export function limitRankedLists<T extends { legalMoves: number; best: unknown[]; worst: unknown[] }>(analysis: T, config: EggRewardsConfig = EGG_REWARDS): T {
  // Without a move count (older snapshots) the lists are kept as they are.
  const count = Number.isFinite(analysis.legalMoves) ? rankedMovesPerList(analysis.legalMoves, config) : Infinity
  return { ...analysis, best: analysis.best.slice(0, count), worst: analysis.worst.slice(0, count) }
}

/** Eggs actually added to a match balance under the cap; a balance already above it keeps its eggs. */
export function cappedMatchEggs(balance: number, earned: number, config: EggRewardsConfig = EGG_REWARDS): number {
  return Math.max(0, Math.min(earned, config.maxMatchEggs - balance))
}
