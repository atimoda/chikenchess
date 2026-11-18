// "Spawn de itens" of the Grade de blocos: its settings as the Pátio saves them in settings.mineGrid.items. A block
// is born with items at `chance`%; it gets 1 to `max` of them, side by side on a platform somewhere in its middle.
// Each item comes from a group (Armas, Instrumentos, Utilitários, as the inventory groups them) drawn by the groups'
// chances, then from that group by the items' chances: both are weights, counted in proportion to each other (33%
// in each group is a third each; 0 leaves it out). Pure; the draw and the platforms are in mine-items.ts.
import { CONSUMABLE_IDS, INSTRUMENT_IDS, KEY_IDS, MAGIC_IDS, MINE_ITEM_IDS, SPORTS_IDS, WEAPON_IDS, type ItemId } from './items'

export type MineItemGroupId = 'weapons' | 'instruments' | 'utilities'
export const MINE_ITEM_GROUPS: { id: MineItemGroupId; label: string; items: ItemId[] }[] = [
  { id: 'weapons', label: 'Armas', items: WEAPON_IDS },
  { id: 'instruments', label: 'Instrumentos', items: INSTRUMENT_IDS },
  // the inventory's third group (lib/pigchicken/inventory.ts), without the Gaiolas
  { id: 'utilities', label: 'Utilitários', items: [...SPORTS_IDS, ...CONSUMABLE_IDS, ...MAGIC_IDS, ...KEY_IDS, ...MINE_ITEM_IDS] },
]
const ALL_ITEMS = new Set(MINE_ITEM_GROUPS.flatMap(g => g.items))

// chance: the share of blocks born with items, whole percents; max: the most items one block gets; groups: each
// group's chance; weights: each item's chance in its group, only the ones that differ from the default; seed: the
// draw ("Sortear" makes a new one)
export type MineItemParams = { chance: number; max: number; groups: Record<MineItemGroupId, number>; weights: Partial<Record<ItemId, number>>; seed: number }
export const MINE_ITEM_CHANCE = { min: 0, max: 100, step: 1, default: 15 } as const
export const MINE_ITEM_MAX = { min: 1, max: 6, step: 1, default: 2 } as const
export const MINE_ITEM_GROUP_CHANCE = { min: 0, max: 100, step: 1, default: 33 } as const
export const MINE_ITEM_WEIGHT = { min: 0, max: 100, step: 1, default: 10 } as const
export const MINE_ITEM_SEED = 1
export const defaultMineItems = (): MineItemParams => ({
  chance: MINE_ITEM_CHANCE.default, max: MINE_ITEM_MAX.default,
  groups: { weapons: MINE_ITEM_GROUP_CHANCE.default, instruments: MINE_ITEM_GROUP_CHANCE.default, utilities: MINE_ITEM_GROUP_CHANCE.default },
  weights: {}, seed: MINE_ITEM_SEED,
})

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const whole = (v: unknown, r: { min: number; max: number; default: number }) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(clamp(v, r.min, r.max)) : r.default)

// what a Pátio saved (nothing saved: the defaults)
export function normalizeMineItems(raw: unknown): MineItemParams {
  const d = defaultMineItems()
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d
  const p = raw as Record<string, unknown>
  const g = (p.groups && typeof p.groups === 'object' ? p.groups : {}) as Record<string, unknown>
  const w = (p.weights && typeof p.weights === 'object' && !Array.isArray(p.weights) ? p.weights : {}) as Record<string, unknown>
  const weights: Partial<Record<ItemId, number>> = {}
  for (const [id, v] of Object.entries(w)) {
    if (!ALL_ITEMS.has(id as ItemId)) continue
    const n = whole(v, MINE_ITEM_WEIGHT)
    if (n !== MINE_ITEM_WEIGHT.default) weights[id as ItemId] = n
  }
  const seed = typeof p.seed === 'number' && Number.isFinite(p.seed) ? Math.abs(Math.round(p.seed)) % 0x7fffffff : d.seed
  return {
    chance: whole(p.chance, MINE_ITEM_CHANCE), max: whole(p.max, MINE_ITEM_MAX),
    groups: { weapons: whole(g.weapons, MINE_ITEM_GROUP_CHANCE), instruments: whole(g.instruments, MINE_ITEM_GROUP_CHANCE), utilities: whole(g.utilities, MINE_ITEM_GROUP_CHANCE) },
    weights, seed,
  }
}

// an item's chance in its group
export const mineItemWeight = (p: Pick<MineItemParams, 'weights'>, id: ItemId) => p.weights[id] ?? MINE_ITEM_WEIGHT.default
// another chance for one item (the default one is not kept)
export function setMineItemWeight(p: MineItemParams, id: ItemId, value: number): MineItemParams {
  const { [id]: _old, ...rest } = p.weights
  const n = whole(value, MINE_ITEM_WEIGHT)
  return { ...p, weights: n === MINE_ITEM_WEIGHT.default ? rest : { ...rest, [id]: n } }
}

// one pick by weight (rnd in [0, 1)); nothing when every weight is 0
export function pickByWeight<T>(list: { value: T; weight: number }[], rnd: number): T | undefined {
  const total = list.reduce((s, o) => s + Math.max(0, o.weight), 0)
  if (total <= 0) return undefined
  let at = rnd * total
  for (const o of list) { if (o.weight <= 0) continue; at -= o.weight; if (at < 0) return o.value }
  return list.filter(o => o.weight > 0).at(-1)?.value
}

// one item drawn: a group by the groups' chances (only the ones with some item that can come out), then an item of it
export function drawMineItem(p: Pick<MineItemParams, 'groups' | 'weights'>, rnd: () => number): ItemId | undefined {
  const groups = MINE_ITEM_GROUPS.map(g => ({ value: g, weight: g.items.some(id => mineItemWeight(p, id) > 0) ? p.groups[g.id] : 0 }))
  const group = pickByWeight(groups, rnd())
  return group && pickByWeight(group.items.map(id => ({ value: id, weight: mineItemWeight(p, id) })), rnd())
}
