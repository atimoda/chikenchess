// PigChicKen's inventory: the items she carries, always grouped (instruments, then weapons, then the other items),
// at most INVENTORY_MAX of them. The bar and the selection wheel show only the items she has plus one empty slot
// (empty hands) while there is room. Pure helpers, shared by the combat, the bar and the wheel.
import type { ItemId } from './items'

export const INVENTORY_MAX = 13

// the order of the groups in the inventory: instruments, weapons, other items (mobility, consumables...)
export type ItemGroup = 0 | 1 | 2
// the "other" items (none yet): they go after the weapons
const OTHER_ITEMS = new Set<ItemId>([])
export function itemGroup(id: ItemId, instrument: boolean): ItemGroup {
  if (instrument) return 0
  return OTHER_ITEMS.has(id) ? 2 : 1
}

// puts the item at the end of its group (the others keep their order) and returns where it went
export function insertSorted<T>(list: T[], item: T, group: (t: T) => number): number {
  const g = group(item)
  const at = list.findIndex(o => group(o) > g)
  if (at < 0) { list.push(item); return list.length - 1 }
  list.splice(at, 0, item)
  return at
}

// how many slots show: the items plus one empty slot, while there is room
export const slotCount = (items: number) => Math.min(items + 1, INVENTORY_MAX)

// a slot index cycled into 0..count-1
export const wrapSlot = (i: number, count: number) => count > 0 ? ((i % count) + count) % count : 0

// ---------- the selection wheel: equal slices, the first one centred at the top, going clockwise ----------
// angles are screen angles (y down, atan2), so -PI/2 is up
export const wheelSpan = (count: number) => (Math.PI * 2) / Math.max(1, count)
export const wheelSliceCenter = (i: number, count: number) => -Math.PI / 2 + i * wheelSpan(count)
export function wheelSliceAt(angle: number, count: number): number {
  if (count <= 1) return 0
  const span = wheelSpan(count)
  const a = angle + Math.PI / 2 + span / 2
  return wrapSlot(Math.floor(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / span), count)
}
