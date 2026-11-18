// The tree lines of the Pátio's far scenery (Configurações do Pátio → Mata), saved with each Pátio in
// `settings.forest`: Mata ao longe (the far line, standing on a filled band of ground) and Mata perto (the near one,
// sparse and tall). Without it they are the two lines the Pátio always had. Céu e luz → Mata still turns both off
// (sky.forest); their colours come from the sky (the hour, the haze and the contraluz), these only shape them.
// Each line: show (on or off); density 20 to 300% of the usual trees per stretch; size 30 to 250% of their usual
// height; pines, round, cloud, umbrella (0 to 100 each): how much of each form, as a proportion between the four
// (45 pines to 55 round crowns is the usual mix; a Pátio saved before the last two had round = 100 − pines). cloud:
// a tall crown outlined by many small bumps; umbrella: a wide, flat, wavy crown bent by the wind, with a hooked tip,
// on a thick curved trunk that forks in a Y. shape: which drawing
// (Sortear forma); tint/tintAmount: a colour mixed into the trees (0 to 100%).
// The drawing itself: components/pigchicken/parallax.tsx.

export type ForestLine = { show: boolean; density: number; size: number; pines: number; round: number; cloud: number; umbrella: number; shape: number; tint: string; tintAmount: number }
export type ForestParams = { far: ForestLine; near: ForestLine }
export type ForestLineId = keyof ForestParams

export const FOREST_DENSITY = { min: 20, max: 300, step: 5 } as const
export const FOREST_SIZE = { min: 30, max: 250, step: 5 } as const
export const FOREST_PCT = { min: 0, max: 100, step: 1 } as const
export const FOREST_SHAPES = 1000

export const FOREST_LINE_DEFAULT: ForestLine = { show: true, density: 100, size: 100, pines: 45, round: 55, cloud: 0, umbrella: 0, shape: 0, tint: '#3f6b45', tintAmount: 0 }
export const FOREST_DEFAULT: ForestParams = { far: FOREST_LINE_DEFAULT, near: FOREST_LINE_DEFAULT }
export const FOREST_LINES: { id: ForestLineId; label: string }[] = [{ id: 'far', label: 'Mata ao longe' }, { id: 'near', label: 'Mata perto' }]

// what each line draws with its settings: the usual tree height and spacing (layer units), and its seed
export const FOREST_BASE: Record<ForestLineId, { size: number; gap: number; seed: number }> = {
  far: { size: 64, gap: 46, seed: 31 }, near: { size: 120, gap: 210, seed: 47 },
}
export function forestDraw(id: ForestLineId, l: ForestLine) {
  const b = FOREST_BASE[id]
  return { size: b.size * l.size / 100, gap: b.gap * 100 / l.density, seed: b.seed + l.shape * 101, forms: [l.pines, l.round, l.cloud, l.umbrella] as [number, number, number, number] }
}

const HEX = /^#[0-9a-f]{6}$/i
const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(a, Math.min(b, v))) : d

function normalizeLine(raw: unknown): ForestLine {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>, d = FOREST_LINE_DEFAULT
  return {
    show: r.show !== false,
    density: num(r.density, d.density, FOREST_DENSITY.min, FOREST_DENSITY.max),
    size: num(r.size, d.size, FOREST_SIZE.min, FOREST_SIZE.max),
    pines: num(r.pines, d.pines, FOREST_PCT.min, FOREST_PCT.max),
    round: num(r.round, 100 - num(r.pines, d.pines, FOREST_PCT.min, FOREST_PCT.max), FOREST_PCT.min, FOREST_PCT.max),
    cloud: num(r.cloud, d.cloud, FOREST_PCT.min, FOREST_PCT.max),
    umbrella: num(r.umbrella, d.umbrella, FOREST_PCT.min, FOREST_PCT.max),
    shape: num(r.shape, d.shape, 0, FOREST_SHAPES - 1),
    tint: typeof r.tint === 'string' && HEX.test(r.tint) ? r.tint.toLowerCase() : d.tint,
    tintAmount: num(r.tintAmount, d.tintAmount, FOREST_PCT.min, FOREST_PCT.max),
  }
}

export function normalizeForest(raw: unknown): ForestParams | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  return { far: normalizeLine(r.far), near: normalizeLine(r.near) }
}
