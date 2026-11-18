// PigChicKen's inventory: the items she carries, always grouped (instruments, then weapons, then sports tools,
// consumables and utilities), at most the Pátio's limit of them (INVENTORY_MAX at most). The bar and the selection
// wheel show only the items she has plus one empty slot (empty hands) while there is room. Pure helpers, shared by
// the combat, the bar and the wheel.
import { CONSUMABLE_IDS, KEY_IDS, MAGIC_IDS, MINE_ITEM_IDS, SPORTS_IDS, type ItemId } from './items'

// the most a Pátio may allow (Configurações do Pátio → Limite do inventário); new Pátios start with all of it
export const INVENTORY_MAX = 30
export const INVENTORY_MIN = 1
export const clampInventoryLimit = (n: number) => Math.round(Math.max(INVENTORY_MIN, Math.min(INVENTORY_MAX, Number.isFinite(n) ? n : INVENTORY_MAX)))

// Number-row shortcuts for the first ten inventory slots: 0 follows 9.
export function inventorySlotFromCode(code: string): number | null {
  const match = /^Digit([0-9])$/.exec(code)
  if (!match) return null
  const digit = Number(match[1])
  return digit === 0 ? 10 : digit
}

// Direction is sampled on the action's press, so changing Shift while the
// button remains held never causes a second switch. Explicit Previous wins.
export type QuickSwitchRepeat = { action: 'nextItem' | 'prevItem' | null; direction: -1 | 1; elapsed: number; nextAt: number }
export const newQuickSwitchRepeat = (): QuickSwitchRepeat => ({ action: null, direction: 1, elapsed: 0, nextAt: 1.5 })
export function quickSwitchStep(
  current: { nextItem?: boolean; prevItem?: boolean }, previous: { nextItem?: boolean; prevItem?: boolean }, shift: boolean,
  repeat?: QuickSwitchRepeat, dt = 0, delay = 1.5, interval = 0.3,
): -1 | 0 | 1 {
  if (!repeat) {
    if (current.prevItem && !previous.prevItem) return -1
    if (current.nextItem && !previous.nextItem) return shift ? -1 : 1
    return 0
  }
  const action = current.prevItem ? 'prevItem' : current.nextItem ? 'nextItem' : null
  if (!action) { repeat.action = null; repeat.elapsed = 0; repeat.nextAt = delay; return 0 }
  if (current[action] && !previous[action]) {
    repeat.action = action; repeat.direction = action === 'prevItem' || shift ? -1 : 1
    repeat.elapsed = 0; repeat.nextAt = delay
    return repeat.direction
  }
  if (repeat.action !== action) {
    repeat.action = action; repeat.direction = action === 'prevItem' || shift ? -1 : 1
    repeat.elapsed = 0; repeat.nextAt = delay
    return 0
  }
  repeat.elapsed += Math.max(0, dt)
  if (repeat.elapsed + 1e-9 < repeat.nextAt) return 0
  repeat.nextAt += Math.max(0.05, interval)
  return repeat.direction
}

// Próximo instrumento / Próxima arma / Próximo utilitário: the group to go through on the press (the first one
// listed wins when several are pressed together) and, with `repeat`, again while that one stays held, with the same
// delay and interval as Próximo item (Controles → Inventário). Letting it go, or pressing another, starts over.
export const GROUP_SWITCHES = [['nextInstrument', 0], ['nextWeapon', 1], ['nextUtility', 2]] as const
type GroupSwitchAction = typeof GROUP_SWITCHES[number][0]
export type GroupSwitchRepeat = { group: 0 | 1 | 2 | null; elapsed: number; nextAt: number }
export const newGroupSwitchRepeat = (): GroupSwitchRepeat => ({ group: null, elapsed: 0, nextAt: 1.5 })
export function groupSwitchStep(
  current: Partial<Record<GroupSwitchAction, boolean>>, previous: Partial<Record<GroupSwitchAction, boolean>>,
  repeat?: GroupSwitchRepeat, dt = 0, delay = 1.5, interval = 0.3,
): 0 | 1 | 2 | null {
  const pressed = GROUP_SWITCHES.find(([a]) => current[a] && !previous[a])
  if (pressed) {
    if (repeat) { repeat.group = pressed[1]; repeat.elapsed = 0; repeat.nextAt = delay }
    return pressed[1]
  }
  if (!repeat) return null
  if (repeat.group === null || !current[GROUP_SWITCHES[repeat.group][0]]) { repeat.group = null; repeat.elapsed = 0; repeat.nextAt = delay; return null }
  repeat.elapsed += Math.max(0, dt)
  if (repeat.elapsed + 1e-9 < repeat.nextAt) return null
  repeat.nextAt += Math.max(0.05, interval)
  return repeat.group
}

// the order of the groups in the inventory: instruments, weapons, then sports tools, consumables and utilities.
// An item taken goes to its own group; dragged on the bar, it may join another one (the player's choice).
export type ItemGroup = 0 | 1 | 2
export const ITEM_GROUPS: ItemGroup[] = [0, 1, 2]
// the third group (sports tools: Taco, Passaguá; consumables: Maryjane, Cok; magic; utilities: the keys, the
// Grade de blocos' Chave dourada and Bomba)
const UTILITY_ITEMS = new Set<ItemId>([...SPORTS_IDS, ...CONSUMABLE_IDS, ...MAGIC_IDS, ...KEY_IDS, ...MINE_ITEM_IDS])
export function itemGroup(id: ItemId, instrument: boolean): ItemGroup {
  if (instrument) return 0
  return UTILITY_ITEMS.has(id) ? 2 : 1
}

// items that always go to the first slot of their group when taken (the Passaguá, first of the utilities); there
// they stay while the player does not drag them away (other items taken later go after them)
export const FIRST_IN_GROUP = new Set<ItemId>(['passagua'])

// puts the item at the end of its group (or, with `first`, at its start; the others keep their order) and returns
// where it went
export function insertSorted<T>(list: T[], item: T, group: (t: T) => number, first = false): number {
  const g = group(item)
  const at = list.findIndex(o => first ? group(o) >= g : group(o) > g)
  if (at < 0) { list.push(item); return list.length - 1 }
  list.splice(at, 0, item)
  return at
}

// Dragging on the bar: list[from] goes right before (or after) the slot `to` and joins that slot's group, so the
// groups stay in order. `to` === list.length is the empty slot at the end: the end of the last group. Returns the
// item's new index (from, unchanged, when nothing moves).
export function moveToSlot<T extends { group?: ItemGroup }>(list: T[], from: number, to: number, after: boolean): number {
  if (from < 0 || from >= list.length || to < 0 || to > list.length || from === to) return from
  const item = list[from], anchor = to < list.length ? list[to] : null
  list.splice(from, 1)
  item.group = anchor ? anchor.group ?? 2 : 2
  const at = anchor ? list.indexOf(anchor) + (after ? 1 : 0) : list.length
  list.splice(at, 0, item)
  return at
}

// "Próximo instrumento / arma / utilitário": the next slot of that group, in the bar's order, from the held one;
// coming from another group it starts at the group's first. groups: each shown slot's group (the empty slot, while
// there is room, counts as the last group, so the utilities pass by empty hands). -1: the group has nothing.
export function groupStep(groups: readonly number[], cur: number, group: number): number {
  const at = groups.flatMap((g, i) => g === group ? [i] : [])
  if (!at.length) return -1
  const k = at.indexOf(cur)
  return k < 0 ? at[0] : at[(k + 1) % at.length]
}

// how many slots show: the items plus one empty slot, while there is room
export const slotCount = (items: number, limit = INVENTORY_MAX) => items < limit ? items + 1 : items

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

// ---------- scales: an instrument with more than one scale (ItemDef.scales) ----------
// The quick switch (mouse wheel, Próximo / Anterior) on it goes to its next (or previous) scale while there is one;
// null: there is none left that way, so the switch goes to the next item. Arriving at an item forward starts at its
// first scale, backward at its last (`arrivalScale`), so the wheel walks one straight line: scales, then items.
export function scaleStep(count: number, at: number, dir: number): number | null {
  if (count <= 1 || !dir) return null
  const next = Math.max(0, Math.min(count - 1, Math.round(at))) + (dir > 0 ? 1 : -1)
  return next >= 0 && next < count ? next : null
}
export const arrivalScale = (count: number, dir: number) => (dir < 0 ? Math.max(0, count - 1) : 0)
