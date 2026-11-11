// Neve caindo (Configurações do Pátio → Neve caindo): flakes falling over the far scenery, saved with each Pátio in
// `settings.snowfall`. Without it (or with amount 0) nothing falls. amount: 0 to 100, how many; size: 20 to 300% of
// the usual flake; speed: 0 to 300% of the usual fall; wind: -100 (to the left) to 100 (to the right); opacity:
// 10 to 100%. Drawn by components/pigchicken/snowfall.tsx.

export type SnowfallParams = { amount: number; size: number; speed: number; wind: number; opacity: number }

export const SNOWFALL_PCT = { min: 0, max: 100, step: 1 } as const
export const SNOWFALL_SIZE = { min: 20, max: 300, step: 5 } as const
export const SNOWFALL_SPEED = { min: 0, max: 300, step: 5 } as const
export const SNOWFALL_WIND = { min: -100, max: 100, step: 1 } as const
export const SNOWFALL_OPACITY = { min: 10, max: 100, step: 1 } as const

export const SNOWFALL_DEFAULT: SnowfallParams = { amount: 0, size: 100, speed: 100, wind: 15, opacity: 85 }

const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(a, Math.min(b, v))) : d

export function normalizeSnowfall(raw: unknown): SnowfallParams | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>, d = SNOWFALL_DEFAULT
  return {
    amount: num(r.amount, d.amount, SNOWFALL_PCT.min, SNOWFALL_PCT.max),
    size: num(r.size, d.size, SNOWFALL_SIZE.min, SNOWFALL_SIZE.max),
    speed: num(r.speed, d.speed, SNOWFALL_SPEED.min, SNOWFALL_SPEED.max),
    wind: num(r.wind, d.wind, SNOWFALL_WIND.min, SNOWFALL_WIND.max),
    opacity: num(r.opacity, d.opacity, SNOWFALL_OPACITY.min, SNOWFALL_OPACITY.max),
  }
}

// how many flakes for a screen of w × h px (about 450 on a 1600 × 900 screen at 100)
export const flakeCount = (amount: number, w: number, h: number) => Math.round((amount / 100) * 450 * (w * h) / (1600 * 900))
