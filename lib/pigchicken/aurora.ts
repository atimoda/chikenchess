// Aurora (Configurações do Pátio → Aurora): curtains of light high in the sky, saved with each Pátio in
// `settings.aurora`. Without it (or with amount 0) there is none and nothing is drawn.
// amount: 0 to 200% (Intensidade; above 100 the rays get brighter). bands: 1 to 5 curtains along the sky.
// width: 30 to 300% of a curtain's usual length. height: 30 to 300% of the rays' usual length. lift: 0 (low, behind
// the mountains) to 100 (high in the sky). wave: 0 (a straight curtain) to 100 (deep folds). rays: 0 (a smooth
// veil) to 100 (sharp rays of different lengths). speed: 0 (still) to 300% of the usual sway and shimmer.
// color: the curtain's foot; top: the colour its rays fade into. night: only in a dark sky (fades with the hour,
// like the stars); off: at any hour. shape: which curtains (Sortear forma).
// Geometry in lib/pigchicken/aurora-draw.ts, drawn by components/pigchicken/aurora.tsx.

export type AuroraParams = {
  amount: number; bands: number; width: number; height: number; lift: number; wave: number; rays: number; speed: number
  color: string; top: string; night: boolean; shape: number
}

export const AURORA_AMOUNT = { min: 0, max: 200, step: 1 } as const
export const AURORA_BANDS = { min: 1, max: 5, step: 1 } as const
export const AURORA_SCALE = { min: 30, max: 300, step: 5 } as const
export const AURORA_PCT = { min: 0, max: 100, step: 1 } as const
export const AURORA_SPEED = { min: 0, max: 300, step: 5 } as const
export const AURORA_SHAPES = 1000

export const AURORA_DEFAULT: AuroraParams = {
  amount: 0, bands: 3, width: 100, height: 100, lift: 40, wave: 50, rays: 60, speed: 100,
  color: '#3dffa2', top: '#9a5cff', night: true, shape: 0,
}

const HEX = /^#[0-9a-f]{6}$/i
const num = (v: unknown, d: number, a: number, b: number) => typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(a, Math.min(b, v))) : d
const hex = (v: unknown, d: string) => typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d

export function normalizeAurora(raw: unknown): AuroraParams | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>, d = AURORA_DEFAULT
  return {
    amount: num(r.amount, d.amount, AURORA_AMOUNT.min, AURORA_AMOUNT.max),
    bands: num(r.bands, d.bands, AURORA_BANDS.min, AURORA_BANDS.max),
    width: num(r.width, d.width, AURORA_SCALE.min, AURORA_SCALE.max),
    height: num(r.height, d.height, AURORA_SCALE.min, AURORA_SCALE.max),
    lift: num(r.lift, d.lift, AURORA_PCT.min, AURORA_PCT.max),
    wave: num(r.wave, d.wave, AURORA_PCT.min, AURORA_PCT.max),
    rays: num(r.rays, d.rays, AURORA_PCT.min, AURORA_PCT.max),
    speed: num(r.speed, d.speed, AURORA_SPEED.min, AURORA_SPEED.max),
    color: hex(r.color, d.color), top: hex(r.top, d.top),
    night: r.night !== false,
    shape: num(r.shape, d.shape, 0, AURORA_SHAPES - 1),
  }
}

/** How much of the aurora shows (0 to 1): its intensity, and with "Só à noite" how dark the sky is (SkyLook.night). */
export const auroraOpacity = (a: AuroraParams, night: number) =>
  Math.max(0, Math.min(1, a.amount / 100)) * (a.night ? Math.max(0, Math.min(1, night)) : 1)
