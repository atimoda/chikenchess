// The glow of the items lying on the floor (Configurações do Pátio → Brilho dos itens): a column of light standing
// over each item and a lit outline around it. amount 0 is off; 100 is the full beam. Saved in the Pátio's settings.
// (Later each rarity may bring its own color; today one color for every item.)
export type ItemGlow = { amount: number; color: string }

export const ITEM_GLOW = { min: 0, max: 100, step: 1 } as const
export const ITEM_GLOW_COLOR = '#ffc93c'
export const ITEM_GLOW_OFF: ItemGlow = { amount: 0, color: ITEM_GLOW_COLOR }

const HEX = /^#[0-9a-f]{6}$/i

export function normalizeItemGlow(raw: unknown): ItemGlow | undefined {
  const r = raw as { amount?: unknown; color?: unknown } | null
  if (!r || typeof r !== 'object' || typeof r.amount !== 'number' || !Number.isFinite(r.amount)) return undefined
  const amount = Math.round(Math.max(ITEM_GLOW.min, Math.min(ITEM_GLOW.max, r.amount)))
  const color = typeof r.color === 'string' && HEX.test(r.color) ? r.color.toLowerCase() : ITEM_GLOW_COLOR
  return { amount, color }
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
