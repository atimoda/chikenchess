// The decks of cards (Baralho vermelho, Baralho azul): the cards in the order they are thrown, which one leaves the
// deck next, and what a burst reaches. Pure: the combat flies them (lib/pigchicken/combat.ts).
//
// A deck has 14 cards and throws them in its order: the Coringa first (in the Ás's place), then 2 to 10, the royal
// family and the Ás. A card away is not in the deck: the next throw is the next card of the order still in it.

import { msg } from '../i18n'
/** The cards in the order a deck throws them. */
export const CARD_RANKS = ['★', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const
export const CARD_NAMES = [msg("Coringa"), '2', '3', '4', '5', '6', '7', '8', '9', '10', msg("Valete"), msg("Dama"), msg("Rei"), msg("Ás")] as const
export const DECK_SIZE = CARD_RANKS.length
/** The seventh and the fourteenth of the order (the 7 and the Ás) burst on their own when they arrive. */
export const burstsAlone = (rank: number) => rank === 6 || rank === DECK_SIZE - 1
/** seconds between a burst reaching a card and that card bursting too (a chain goes off one after the other) */
export const CHAIN_DELAY = 0.09

// where a card is: on its way out, floating where it was thrown to, or on its way back to its owner
export type CardPhase = 'out' | 'park' | 'back'

/**
 * The card a deck throws next: the first one from `next` on (round the deck, in its order) that is not away.
 * `away`: the cards of this deck that are out of it now. null: every card is away.
 */
export function nextCard(next: number, away: readonly number[]): number | null {
  const from = ((Math.round(next) % DECK_SIZE) + DECK_SIZE) % DECK_SIZE
  for (let k = 0; k < DECK_SIZE; k++) {
    const rank = (from + k) % DECK_SIZE
    if (!away.includes(rank)) return rank
  }
  return null
}

/**
 * Where a card thrown from (x, y) along `angle` stops: `dist` px away (the reticle), never further than `range`
 * nor closer than `near` px.
 */
export function cardSpot(x: number, y: number, angle: number, dist: number, range: number, near = 40) {
  const d = Math.max(Math.min(near, range), Math.min(range, Number.isFinite(dist) ? dist : range))
  return { x: x + Math.cos(angle) * d, y: y + Math.sin(angle) * d }
}

/** The cards (centres x, y) a burst of radius `r` at (x, y) reaches: its circle touches theirs (`touch` px). */
export function burstReaches<T extends { x: number; y: number }>(cards: readonly T[], x: number, y: number, r: number, touch: number): T[] {
  return cards.filter(c => Math.hypot(c.x - x, c.y - y) <= r + touch)
}

/** Whether a card at (x, y), `touch` px around, touches the box of someone. */
export function cardTouches(x: number, y: number, touch: number, box: { l: number; r: number; t: number; b: number }) {
  const cx = Math.max(box.l, Math.min(x, box.r)), cy = Math.max(box.t, Math.min(y, box.b))
  return Math.hypot(cx - x, cy - y) <= touch
}

/** How far a floating card sways up and down (px) `t` seconds after it parked; `seed` sets it apart from the others. */
export const cardBob = (t: number, seed: number) => Math.sin(t * 2.6 + seed * 6.283) * 4
