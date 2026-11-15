import { DEFAULT_ITEMS, type ItemId } from './items'

export const RACK_DELAY_MAX = 300
export const CAGE_RACK_DELAY = 20
// Per-spawner setting; omitted values (including older layouts) use the item's default.
export function rackRespawnDelay(item: ItemId, delay?: number) {
  if (typeof delay === 'number' && Number.isFinite(delay)) return Math.max(0, Math.min(RACK_DELAY_MAX, delay))
  // a Gaiola takes longer: one cage at a time is there to take, not a pile of them
  return DEFAULT_ITEMS[item].consumable ? 0.1 : DEFAULT_ITEMS[item].cageSouls > 0 ? CAGE_RACK_DELAY : 2
}
