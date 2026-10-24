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
