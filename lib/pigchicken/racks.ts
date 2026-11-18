import { DEFAULT_ITEMS, type ItemId } from './items'

// The Suporte de item's table (drawn in components/pigchicken/draw/world.ts): 76 wide, 56 from the floor to the top
// of its board, which is 7 thick. Its item appears just under the board, so it falls between the legs onto the
// floor, platform or table below, never onto its own table.
export const RACK_TABLE = { w: 76, h: 56, board: 7 }
export const RACK_ITEM_START = RACK_TABLE.h - RACK_TABLE.board - 1

// While a rack waits to put its item back: the time left, in steps of 0.1 s rounded up ("1,5"), or null when it
// holds its item, puts it back at once (no wait) or will not put it back any more (its "Limite de reposição").
export function rackCountdown(r: { t: number; respawnDelay: number; pickupId?: number; refillLimit?: number; given: number }): string | null {
  if (r.pickupId !== undefined || r.respawnDelay <= 0 || (r.refillLimit !== undefined && r.given > r.refillLimit)) return null
  const tenths = Math.max(1, Math.ceil((r.respawnDelay - r.t) * 10 - 1e-6))
  return (tenths / 10).toFixed(1).replace('.', ',')
}

export const RACK_DELAY_MAX = 300
export const CAGE_RACK_DELAY = 20
// How many times a rack puts its item back after the first one: 0 to this; none (the default, older layouts) is no limit.
export const RACK_REFILL_MAX = 50
export function rackRefillLimit(limit?: unknown): number | undefined {
  return typeof limit === 'number' && Number.isFinite(limit) ? Math.max(0, Math.min(RACK_REFILL_MAX, Math.round(limit))) : undefined
}
// The steps of the "Tempo de reposição" slider (seconds): fine at the start, coarse toward the 5 minutes.
export const RACK_DELAY_STEPS = [0, 0.1, 0.25, 0.5, 1, 1.5, 2, 3, 4, 5, 7, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300]
// Per-spawner setting; omitted values (including older layouts) use the item's default.
export function rackRespawnDelay(item: ItemId, delay?: number) {
  if (typeof delay === 'number' && Number.isFinite(delay)) return Math.max(0, Math.min(RACK_DELAY_MAX, delay))
  // a Gaiola takes longer: one cage at a time is there to take, not a pile of them
  return DEFAULT_ITEMS[item].consumable ? 0.1 : DEFAULT_ITEMS[item].cageSouls > 0 ? CAGE_RACK_DELAY : 2
}
