// The glow of the items lying on the floor (Configurações do Pátio → Brilho dos itens): a column of light standing
// over each item and a lit outline around it. amount 0 is off; 100 is the full beam. Saved in the Pátio's settings.
// Each group of items has its own color: instruments, weapons, utilities (sports tools, magic, keys, the Grade de
// blocos' items, cages) and consumables (Bear Gummy, Cok).
import { msg } from '../i18n'
import { CONSUMABLE_IDS, FIXED_IDS, INSTRUMENT_IDS, WEAPON_IDS, type ItemId } from './items'

export type ItemGlowGroup = 'instrument' | 'weapon' | 'utility' | 'consumable'
export type ItemGlowColors = Record<ItemGlowGroup, string>
export type ItemGlow = { amount: number; colors: ItemGlowColors }

export const ITEM_GLOW = { min: 0, max: 100, step: 1 } as const
export const ITEM_GLOW_GROUPS: { id: ItemGlowGroup; label: string }[] = [
  { id: 'instrument', label: msg("Instrumentos") }, { id: 'weapon', label: msg("Armas") },
  { id: 'utility', label: msg("Utilitários") }, { id: 'consumable', label: msg("Consumíveis") },
]
export const ITEM_GLOW_COLORS: ItemGlowColors = { instrument: '#ffc93c', weapon: '#b05cff', utility: '#3d8bff', consumable: '#3ddc84' }
export const ITEM_GLOW_OFF: ItemGlow = { amount: 0, colors: ITEM_GLOW_COLORS }

const INSTRUMENTS = new Set<ItemId>([...INSTRUMENT_IDS, ...FIXED_IDS])
const WEAPONS = new Set<ItemId>(WEAPON_IDS)
const CONSUMABLES = new Set<ItemId>(CONSUMABLE_IDS)
export function itemGlowGroup(id: ItemId): ItemGlowGroup {
  return INSTRUMENTS.has(id) ? 'instrument' : WEAPONS.has(id) ? 'weapon' : CONSUMABLES.has(id) ? 'consumable' : 'utility'
}
export const itemGlowColor = (glow: ItemGlow, id: ItemId) => glow.colors[itemGlowGroup(id)]
export const sameItemGlowColors = (a: ItemGlowColors, b: ItemGlowColors = ITEM_GLOW_COLORS) => ITEM_GLOW_GROUPS.every(g => a[g.id] === b[g.id])

const HEX = /^#[0-9a-f]{6}$/i
const hex = (v: unknown) => typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : undefined

// (a Pátio saved before the groups had one `color` for every item: it stays as the instruments' color)
export function normalizeItemGlow(raw: unknown): ItemGlow | undefined {
  const r = raw as { amount?: unknown; color?: unknown; colors?: unknown } | null
  if (!r || typeof r !== 'object' || typeof r.amount !== 'number' || !Number.isFinite(r.amount)) return undefined
  const amount = Math.round(Math.max(ITEM_GLOW.min, Math.min(ITEM_GLOW.max, r.amount)))
  const saved = (r.colors && typeof r.colors === 'object' ? r.colors : {}) as Partial<Record<ItemGlowGroup, unknown>>
  const colors = { ...ITEM_GLOW_COLORS }
  for (const { id } of ITEM_GLOW_GROUPS) colors[id] = hex(saved[id]) ?? (id === 'instrument' ? hex(r.color) : undefined) ?? ITEM_GLOW_COLORS[id]
  return { amount, colors }
}

/** How the glow looks at an amount (1–100), or null when it is off. Low amounts are much softer than the top. */
export type ItemGlowLook = {
  beam: number; beamH: number; beamW: number // the column: opacity, height and width (world px)
  halo: number; haloR: number // the soft light around the item: opacity and blur radius (px)
  rim: number; rimW: number // the crisp outline: opacity and thickness (px)
  pool: number // the light on the floor under it
}
export function itemGlowLook(amount: number): ItemGlowLook | null {
  if (!(amount > 0)) return null
  const g = Math.min(1, amount / ITEM_GLOW.max)
  return {
    beam: 0.06 + 0.89 * g ** 1.4, beamH: 60 + 190 * g, beamW: 24 + 44 * g,
    halo: 0.25 + 0.75 * g, haloR: 3 + 10 * g,
    rim: 0.25 + 0.75 * g ** 1.2, rimW: 1 + 1.6 * g,
    pool: 0.12 + 0.5 * g,
  }
}
