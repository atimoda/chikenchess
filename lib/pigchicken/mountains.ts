// The mountains far behind the Pátio (Configurações do Pátio → Montanhas), saved with each Pátio in
// `settings.mountains`. Without it they are the three ranges the Pátio always had. Their colours come from the sky
// (lib/pigchicken/sky.ts: the hour, the haze and the contraluz); these only shape them.
// show: on or off. ranges: how many ranges, 1 to 6 (the usual three first, then more in between and behind).
// height ("Inclinação", the field keeps its first name): 20 to 200% of the usual peaks' steepness. lift ("Altura"):
// -50 to 100, raises (or sinks) every range on the screen, 6 units a step. rough: 20 to 200%, how jagged.
// shade ("Relevo"): 0 to 100, the faces turned away from the light get darker. snow: 0 to 100, how far down the snow
// caps reach; snowEdge ("Pontas"): 0 (a smooth line) to 100 (long tongues of snow down the slopes); snowShade:
// 0 to 100, the snow's shaded faces. tint/tintAmount: a colour mixed into the ranges (0 to 100%).
// shape: which drawing of the ranges (Sortear forma).

export type MountainParams = {
  show: boolean; ranges: number; height: number; lift: number; rough: number; shade: number
  snow: number; snowEdge: number; snowShade: number; tint: string; tintAmount: number; shape: number
}

export const MOUNTAIN_RANGES = { min: 1, max: 6, step: 1 } as const
export const MOUNTAIN_SCALE = { min: 20, max: 200, step: 5 } as const
export const MOUNTAIN_LIFT = { min: -50, max: 100, step: 1, unit: 6 } as const
export const MOUNTAIN_PCT = { min: 0, max: 100, step: 1 } as const
export const MOUNTAIN_SHAPES = 1000

export const MOUNTAINS_DEFAULT: MountainParams = {
  show: true, ranges: 3, height: 100, lift: 0, rough: 100, shade: 0, snow: 0, snowEdge: 50, snowShade: 50, tint: '#6d7fa6', tintAmount: 0, shape: 0,
}

const HEX = /^#[0-9a-f]{6}$/i
const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(a, Math.min(b, v))) : d

export function normalizeMountains(raw: unknown): MountainParams | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>, d = MOUNTAINS_DEFAULT
  const pct = (k: keyof MountainParams) => num(r[k], d[k] as number, MOUNTAIN_PCT.min, MOUNTAIN_PCT.max)
  return {
    show: r.show !== false,
    ranges: num(r.ranges, d.ranges, MOUNTAIN_RANGES.min, MOUNTAIN_RANGES.max),
    height: num(r.height, d.height, MOUNTAIN_SCALE.min, MOUNTAIN_SCALE.max),
    lift: num(r.lift, d.lift, MOUNTAIN_LIFT.min, MOUNTAIN_LIFT.max),
    rough: num(r.rough, d.rough, MOUNTAIN_SCALE.min, MOUNTAIN_SCALE.max),
    shade: pct('shade'), snow: pct('snow'), snowEdge: pct('snowEdge'), snowShade: pct('snowShade'),
    tint: typeof r.tint === 'string' && HEX.test(r.tint) ? r.tint.toLowerCase() : d.tint,
    tintAmount: pct('tintAmount'),
    shape: num(r.shape, d.shape, 0, MOUNTAIN_SHAPES - 1),
  }
}
