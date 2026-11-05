export const TRAMPOLINE_LEVELS = [
  { height: 120, pad: '#286d9f', trim: '#b9e8ff' },
  { height: 220, pad: '#287b62', trim: '#a6f6c4' },
  { height: 350, pad: '#9a5d25', trim: '#ffe18c' },
  { height: 520, pad: '#a03645', trim: '#ffb2a8' },
  { height: 760, pad: '#674397', trim: '#e7c3ff' },
] as const

export type TrampolineParams = { strength: number; angle: number }
export const TRAMPOLINE_ANGLE = 35
export const TRAMPOLINE_DEFAULTS: TrampolineParams = { strength: 3, angle: 0 }

function integer(raw: unknown, fallback: number, min: number, max: number) {
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(min, Math.min(max, Math.round(raw))) : fallback
}

export function normalizeTrampoline(raw: unknown): TrampolineParams {
  const params = raw as Partial<TrampolineParams> | null | undefined
  return {
    strength: integer(params?.strength, TRAMPOLINE_DEFAULTS.strength, 1, TRAMPOLINE_LEVELS.length),
    angle: integer(params?.angle, TRAMPOLINE_DEFAULTS.angle, -TRAMPOLINE_ANGLE, TRAMPOLINE_ANGLE),
  }
}

export function trampolineVelocity(params: TrampolineParams, gravity: number) {
  const vertical = Math.sqrt(2 * gravity * TRAMPOLINE_LEVELS[params.strength - 1].height)
  return { vx: vertical * Math.tan(params.angle * Math.PI / 180), vy: -vertical }
}
