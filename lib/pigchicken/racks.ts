import { DEFAULT_ITEMS, type ItemId } from './items'

export const RACK_DELAY_MAX = 300
// Per-spawner setting; omitted values (including older layouts) use the item's default.
export function rackRespawnDelay(item: ItemId, delay?: number) {
  if (typeof delay === 'number' && Number.isFinite(delay)) return Math.max(0, Math.min(RACK_DELAY_MAX, delay))
  return DEFAULT_ITEMS[item].consumable ? 0.1 : 2
}
