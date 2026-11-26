import eggRewardsJson from '../data/ui/egg-rewards.json'
import { msg } from './i18n'

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

/** Keys of the move messages (data/ui/move-messages.json), shown through t() on the board. */
export const MOVE_MESSAGE_KEYS = [
  msg("Brilliant!"),
  msg("Eggcellent!"),
  msg("Masterful!"),
  msg("Sharp!"),
  msg("Clever!"),
  msg("Inspired!"),
  msg("Cluck yeah!"),
  msg("Genius!"),
  msg("Flawless!"),
  msg("Checkmate-worthy!"),
  msg("Great play."),
  msg("Meh."),
  msg("not bad."),
  msg("You've got it!"),
  msg("You’re getting good!"),
  msg("Smart comeback!"),
  msg("Triple eggs!"),
  msg("Turning the tide!"),
  msg("Tough spot, sharp move!"),
  msg("That’s the spirit!"),
  msg("Clever under pressure!"),
  msg("Now you’re cooking!"),
  msg("Way to fight!"),
  msg("Oops!"),
  msg("Eggward!"),
  msg("Scrambled!"),
  msg("Yikes!"),
  msg("Risky!"),
  msg("Uh-oh, chicken!"),
  msg("Wobbly!"),
  msg("Questionable!"),
  msg("Fowl play!"),
  msg("Oh cluck!"),
  msg("Terrible!"),
  msg("Your \"lucky\" day"),
  msg("C'est terrible!"),
  msg("What is bro doing"),
  msg("Do I exist?"),
  msg("This is critical."),
  msg("\"Not bad\" at all"),
  msg("So clever!"),
  msg("You're the goat."),
  msg("Big brain cluck!"),
  msg("Loophole found!"),
  msg("Same eggs, less pain."),
  msg("Galaxy-brained!"),
  msg("The coop salutes you."),
  msg("Sneaky chicken!"),
  msg("Rules? You read them."),
  msg("Eggs-ploit unlocked!"),
  msg("Not so smart."),
  msg("What u doing bro?"),
  msg("Close enough… not."),
  msg("Right square, wrong chicken."),
  msg("Same eggs, worse move."),
  msg("Bold of you."),
  msg("The arrow was right there."),
  msg("Wrong piece, buddy."),
  msg("Eggs-cuse me?"),
  msg("Technically counts."),
  msg("Unstoppable!"),
  msg("On fire!"),
  msg("Unbeakable!"),
  msg("Winning streak!"),
  msg("Cluckin’ brilliant!"),
  msg("Eggspiraling!"),
  msg("Cluckstorm!"),
  msg("Scramble mode!"),
  msg("Coop’s concerned!"),
  msg("Henough already!"),
  msg("You’re on a roll!"),
  msg("Unbeakable streak!"),
  msg("The coop is cooking!"),
  msg("Cluck, you’re good!"),
  msg("Can’t stop this chicken!"),
  msg("Chickens make mistakes, but you?"),
  msg("Cooking!"),
  msg("The eggs are scrambling."),
  msg("A streak of… choices."),
  msg("The coop is concerned."),
  msg("Maybe trust the chicken?"),
  msg("This is getting eggward."),
  msg("We’ll pretend that worked."),
  msg("Uh-oh, chicken."),
  msg("That’s a bold cluck."),
  msg("The plot thickens…"),
  msg("Oopsie-daisy!"),
  msg("A little scrambled."),
  msg("The board noticed."),
  msg("Risky business!"),
  msg("That’s one way to play."),
  msg("Ok"),
  msg("Yep"),
  msg("I know."),
] as const
