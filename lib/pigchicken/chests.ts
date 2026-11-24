// The Baú (chest) of the Pátio's editor mode: what opens it (nothing, a Chave or enough souls in their Gaiolas),
// what comes out of it (a list of items or groups of items, each one with its own chance) and how it shines (its
// rarity). Pure: the layout keeps the params, combat.ts opens it and spawns the items, components/pigchicken/draw/
// chests.ts draws it.
import { CAGE_IDS, CONSUMABLE_IDS, INSTRUMENT_IDS, KEY_IDS, MAGIC_IDS, RACK_ITEM_IDS, SPORTS_IDS, WEAPON_IDS, type ItemId } from './items'

// simples: a soft yellow glow; lendário: a stronger blue one
export type ChestRarity = 'simple' | 'legendary'
export const CHEST_RARITIES: { value: ChestRarity; label: string }[] = [
  { value: 'simple', label: 'Simples' },
  { value: 'legendary', label: 'Lendário' },
]
// the glow of each rarity: its colour, how far it reaches (× the chest's width) and how bright it is
export const CHEST_GLOW: Record<ChestRarity, { color: string; core: string; reach: number; alpha: number }> = {
  simple: { color: '#ffd76a', core: '#fff3c4', reach: 0.9, alpha: 0.38 },
  legendary: { color: '#4aa8ff', core: '#d7f0ff', reach: 1.5, alpha: 0.75 },
}

// what opens it: anyone (Livre), a key in the inventory (one is used up) or merit: at least `souls` souls in the
// Gaiolas of whoever opens it (they stay there)
export type ChestLock = 'free' | 'key' | 'souls'
export const CHEST_LOCKS: { value: ChestLock; label: string }[] = [
  { value: 'free', label: 'Livre' },
  { value: 'key', label: 'Chave' },
  { value: 'souls', label: 'Merecimento (almas nas gaiolas)' },
]

// a group of items: one of them is drawn when its entry comes out
export type LootGroup = 'any' | 'sports' | 'weapons' | 'instruments' | 'consumables' | 'magic' | 'keys' | 'cages'
export const LOOT_GROUPS: { value: LootGroup; label: string; items: ItemId[] }[] = [
  { value: 'any', label: 'Qualquer item', items: RACK_ITEM_IDS },
  { value: 'weapons', label: 'Uma arma', items: WEAPON_IDS },
  { value: 'instruments', label: 'Um instrumento', items: INSTRUMENT_IDS },
  { value: 'sports', label: 'Um esportivo', items: SPORTS_IDS },
  { value: 'consumables', label: 'Uma habilidade especial', items: CONSUMABLE_IDS },
  { value: 'magic', label: 'Um item de magia', items: MAGIC_IDS },
  { value: 'keys', label: 'Uma chave', items: KEY_IDS },
  { value: 'cages', label: 'Uma gaiola', items: CAGE_IDS },
]
const GROUP_IDS = LOOT_GROUPS.map(g => g.value) as string[]
export const isLootGroup = (pick: string): pick is LootGroup => GROUP_IDS.includes(pick)
export const lootGroupItems = (g: LootGroup) => LOOT_GROUPS.find(o => o.value === g)!.items

// one line of what is inside: a specific item or a group, and the chance (0 to 100%) that it comes out
export type LootEntry = { pick: ItemId | LootGroup; chance: number }

export type ChestParams = {
  rarity: ChestRarity
  lock: ChestLock
  souls: number // merit: how many souls their Gaiolas need
  // s until it closes again after opening (and can be opened again, with new items); 0: it stays open until the
  // Pátio opens again
  reopen: number
  loot: LootEntry[]
}

export const CHEST_LOOT_MAX = 12
export const CHEST_SOULS = { min: 1, max: 999 }
export const CHEST_REOPEN_MAX = 600
// the chest's box in the layout (world units): the art's size
export const CHEST_BOX = { w: 92, h: 70 }

// what a new chest of each rarity has inside: the simple one, one item of any kind; the legendary one, a weapon, an
// instrument and maybe something of magic
export function defaultChest(rarity: ChestRarity = 'simple'): ChestParams {
  return {
    rarity, lock: 'free', souls: 5, reopen: 0,
    loot: rarity === 'legendary'
      ? [{ pick: 'weapons', chance: 100 }, { pick: 'instruments', chance: 100 }, { pick: 'magic', chance: 50 }]
      : [{ pick: 'any', chance: 100 }],
  }
}

// one more line for a specific item, always coming out (dropping an item of the palette on the Baú); null when the
// list is full
export function addChestItem(p: ChestParams, item: ItemId): ChestParams | null {
  return p.loot.length >= CHEST_LOOT_MAX ? null : { ...p, loot: [...p.loot, { pick: item, chance: 100 }] }
}

const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const validPick = (p: unknown): p is LootEntry['pick'] => typeof p === 'string' && (isLootGroup(p) || (RACK_ITEM_IDS as string[]).includes(p))

// a list of what comes out (a Baú's items, the prize of a Jukebox or Vitrola), cleaned: lines with an unknown item
// leave, chances are whole percents from 0 to 100, at most CHEST_LOOT_MAX lines; not a list: `fallback`
export function normalizeLoot(raw: unknown, fallback: LootEntry[]): LootEntry[] {
  if (!Array.isArray(raw)) return fallback
  return raw.flatMap(e => {
    const o = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>
    return validPick(o.pick) ? [{ pick: o.pick, chance: Math.round(clamp(num(o.chance, 100), 0, 100)) }] : []
  }).slice(0, CHEST_LOOT_MAX)
}

// what comes from storage, the database or another player, cleaned
export function normalizeChest(raw: unknown): ChestParams {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const rarity: ChestRarity = r.rarity === 'legendary' ? 'legendary' : 'simple'
  const lock: ChestLock = r.lock === 'key' || r.lock === 'souls' ? r.lock : 'free'
  const loot = normalizeLoot(r.loot, defaultChest(rarity).loot)
  return {
    rarity, lock,
    souls: Math.round(clamp(num(r.souls, 5), CHEST_SOULS.min, CHEST_SOULS.max)),
    reopen: Math.round(clamp(num(r.reopen, 0), 0, CHEST_REOPEN_MAX) * 10) / 10,
    loot,
  }
}

// what keeps it shut for someone with `keys` keys and `souls` souls in their Gaiolas: null (it opens), 'key' or
// 'souls'
export function chestBlock(p: Pick<ChestParams, 'lock' | 'souls'>, has: { keys: number; souls: number }): 'key' | 'souls' | null {
  if (p.lock === 'key') return has.keys > 0 ? null : 'key'
  if (p.lock === 'souls') return has.souls >= p.souls ? null : 'souls'
  return null
}

// the items that come out this time: each line is drawn on its own (its chance); a group gives one of its items
export function rollLoot(loot: readonly LootEntry[], rng: () => number = Math.random): ItemId[] {
  const out: ItemId[] = []
  for (const e of loot) {
    if (e.chance <= 0 || rng() * 100 >= e.chance) continue
    if (!isLootGroup(e.pick)) { out.push(e.pick); continue }
    const items = lootGroupItems(e.pick)
    if (items.length) out.push(items[Math.min(items.length - 1, Math.floor(rng() * items.length))])
  }
  return out
}
