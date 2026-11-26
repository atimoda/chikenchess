// The clouds over the Pátio (Configurações do Pátio → Nuvens), saved with each Pátio in `settings.clouds`. Their
// light comes from the sky (the sun's colour and the horizon); these shape them. Without `settings.clouds`, the
// amount is the sky's old Nuvens (`sky.clouds`) or, with the classic sky, all of them.
// amount: 0 to 100% of the clouds. size: 30 to 600%. height: 0 (low, near the mountains) to 100 (high).
// spread: 0 (all at one height) to 100 (scattered up and down). opacity: 0 to 200%. soft: 0 (crisp) to 100 (blurry).
// volume: 0 (flat) to 100 (the shaded underside). wind: 0 (still) to 300% of the usual drift. tint/tintAmount: a
// colour mixed into them. shape: which drawing (Sortear forma).
// kind: soft (flat, faint lobes) or cumulus (tall heaps of lit and shaded puffs); for cumulus, puffs (0 to 100) is
// how many heaps each cloud has and detail (0 to 100) the small puffs that fray its outline.
// shadeTint/shadeTintAmount: the shade's own colour (0: the sky's). The drawing: lib/pigchicken/cloud-draw.ts.

import { msg } from '../i18n'
export type CloudParams = {
  amount: number; size: number; height: number; spread: number; opacity: number; soft: number; volume: number
  wind: number; tint: string; tintAmount: number; shape: number
  kind: CloudKind; puffs: number; detail: number; shadeTint: string; shadeTintAmount: number
}
export type CloudKind = 'soft' | 'cumulus'
export const CLOUD_KINDS: { id: CloudKind; label: string }[] = [{ id: 'soft', label: msg("Suaves") }, { id: 'cumulus', label: msg("Cumulus") }]

export const CLOUD_PCT = { min: 0, max: 100, step: 1 } as const
export const CLOUD_SCALE = { min: 30, max: 600, step: 5 } as const
export const CLOUD_OPACITY = { min: 0, max: 200, step: 5 } as const
export const CLOUD_WIND = { min: 0, max: 300, step: 5 } as const
export const CLOUD_SHAPES = 1000

export const CLOUDS_DEFAULT: CloudParams = {
  amount: 100, size: 100, height: 50, spread: 50, opacity: 100, soft: 40, volume: 100, wind: 100, tint: '#ffffff', tintAmount: 0, shape: 0,
  kind: 'soft', puffs: 50, detail: 40, shadeTint: '#3a2f3d', shadeTintAmount: 0,
}

const HEX = /^#[0-9a-f]{6}$/i
const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(a, Math.min(b, v))) : d

export function normalizeClouds(raw: unknown): CloudParams | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>, d = CLOUDS_DEFAULT
  const pct = (k: keyof CloudParams) => num(r[k], d[k] as number, CLOUD_PCT.min, CLOUD_PCT.max)
  return {
    amount: pct('amount'), size: num(r.size, d.size, CLOUD_SCALE.min, CLOUD_SCALE.max), height: pct('height'), spread: pct('spread'),
    opacity: num(r.opacity, d.opacity, CLOUD_OPACITY.min, CLOUD_OPACITY.max), soft: pct('soft'), volume: pct('volume'),
    wind: num(r.wind, d.wind, CLOUD_WIND.min, CLOUD_WIND.max),
    tint: typeof r.tint === 'string' && HEX.test(r.tint) ? r.tint.toLowerCase() : d.tint, tintAmount: pct('tintAmount'),
    shape: num(r.shape, d.shape, 0, CLOUD_SHAPES - 1),
    kind: CLOUD_KINDS.some(k => k.id === r.kind) ? r.kind as CloudKind : d.kind, puffs: pct('puffs'), detail: pct('detail'),
    shadeTint: typeof r.shadeTint === 'string' && HEX.test(r.shadeTint) ? r.shadeTint.toLowerCase() : d.shadeTint, shadeTintAmount: pct('shadeTintAmount'),
  }
}

// the clouds a Pátio shows: its own, or the defaults with the sky's old amount
export const patioClouds = (clouds: CloudParams | undefined, skyClouds: number | undefined): CloudParams =>
  clouds ?? { ...CLOUDS_DEFAULT, amount: skyClouds ?? CLOUDS_DEFAULT.amount }
