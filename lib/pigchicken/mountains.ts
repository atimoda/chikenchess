// The mountains far behind the Pátio (Configurações do Pátio → Montanhas), saved with each Pátio in
// `settings.mountains`. Without it they are the three ranges the Pátio always had. Their colours come from the sky
// (lib/pigchicken/sky.ts: the hour, the haze and the contraluz); these only shape them.
// show: on or off. ranges: how many ranges, 1 to 3 (the farthest stays). height and rough: 20 to 200% of the
// usual peaks and how jagged they are. snow: 0 to 100, how far down the snow caps reach. tint/tintAmount: a colour
// mixed into the ranges (0 to 100%). shape: which drawing of the ranges (Sortear forma).

export type MountainParams = { show: boolean; ranges: number; height: number; rough: number; snow: number; tint: string; tintAmount: number; shape: number }

export const MOUNTAIN_RANGES = { min: 1, max: 3, step: 1 } as const
export const MOUNTAIN_SCALE = { min: 20, max: 200, step: 5 } as const
export const MOUNTAIN_PCT = { min: 0, max: 100, step: 1 } as const
export const MOUNTAIN_SHAPES = 1000

export const MOUNTAINS_DEFAULT: MountainParams = { show: true, ranges: 3, height: 100, rough: 100, snow: 0, tint: '#6d7fa6', tintAmount: 0, shape: 0 }

const HEX = /^#[0-9a-f]{6}$/i
const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(a, Math.min(b, v))) : d

export function normalizeMountains(raw: unknown): MountainParams | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>, d = MOUNTAINS_DEFAULT
  return {
    show: r.show !== false,
    ranges: num(r.ranges, d.ranges, MOUNTAIN_RANGES.min, MOUNTAIN_RANGES.max),
    height: num(r.height, d.height, MOUNTAIN_SCALE.min, MOUNTAIN_SCALE.max),
    rough: num(r.rough, d.rough, MOUNTAIN_SCALE.min, MOUNTAIN_SCALE.max),
    snow: num(r.snow, d.snow, MOUNTAIN_PCT.min, MOUNTAIN_PCT.max),
    tint: typeof r.tint === 'string' && HEX.test(r.tint) ? r.tint.toLowerCase() : d.tint,
    tintAmount: num(r.tintAmount, d.tintAmount, MOUNTAIN_PCT.min, MOUNTAIN_PCT.max),
    shape: num(r.shape, d.shape, 0, MOUNTAIN_SHAPES - 1),
  }
}
