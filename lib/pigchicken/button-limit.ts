// The Aliens horde button's limit (Modo editor → Editar do botão): at most `limit` presses in any `window` seconds
// (0: no limit) and at least `gap` seconds between two presses. While it cannot be pressed it is greyed out; when the
// limit is reached a countdown says how long until it can be pressed again (drawn in components/pigchicken/draw/creatures.ts).
// The clock is the button's own (each step's dt, so a slow-motion zone slows it down too); each browser counts its own.

export const BUTTON_PRESS_DEFAULTS = { limit: 10, window: 60, gap: 0.3 }
export const PRESS_LIMIT_MAX = 50
export const PRESS_GAP = { min: 0.1, max: 3 }
// the steps of the "A cada" slider (seconds)
export const PRESS_WINDOW_STEPS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 600]

export type PressRules = { limit: number; window: number; gap: number }
// ages: how long ago each press still inside the window was (oldest first); gapLeft: the time left of the gap
export type ButtonPress = PressRules & { ages: number[]; gapLeft: number }

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
// The saved values, cleaned (none: the default)
export const pressLimitParam = (v: unknown) => num(v) ? Math.max(0, Math.min(PRESS_LIMIT_MAX, Math.round(v))) : undefined
export const pressWindowParam = (v: unknown) => num(v) ? Math.max(PRESS_WINDOW_STEPS[0], Math.min(PRESS_WINDOW_STEPS[PRESS_WINDOW_STEPS.length - 1], v)) : undefined
export const pressGapParam = (v: unknown) => num(v) ? Math.max(PRESS_GAP.min, Math.min(PRESS_GAP.max, Math.round(v * 10) / 10)) : undefined

export function pressRules(p: { pressLimit?: number; pressWindow?: number; pressGap?: number }): PressRules {
  return {
    limit: pressLimitParam(p.pressLimit) ?? BUTTON_PRESS_DEFAULTS.limit,
    window: pressWindowParam(p.pressWindow) ?? BUTTON_PRESS_DEFAULTS.window,
    gap: pressGapParam(p.pressGap) ?? BUTTON_PRESS_DEFAULTS.gap,
  }
}

// New rules keep the presses already made (and the gap running)
export function withPressRules(s: ButtonPress | undefined, rules: PressRules): ButtonPress {
  if (!s) return { ...rules, ages: [], gapLeft: 0 }
  Object.assign(s, rules)
  s.ages = s.ages.filter(a => a < s.window)
  s.gapLeft = Math.min(s.gapLeft, s.gap)
  return s
}

export function stepPress(s: ButtonPress, dt: number) {
  s.gapLeft = Math.max(0, s.gapLeft - dt)
  if (s.ages.length) s.ages = s.ages.map(a => a + dt).filter(a => a < s.window)
}

const limited = (s: ButtonPress) => s.limit > 0 && s.ages.length >= s.limit
export const canPress = (s: ButtonPress) => s.gapLeft <= 0 && !limited(s)

export function press(s: ButtonPress) {
  s.ages.push(0)
  s.gapLeft = s.gap
}

// How long until it can be pressed again (0: now)
export function pressWait(s: ButtonPress): number {
  const limit = limited(s) ? s.window - s.ages[s.ages.length - s.limit] : 0
  return Math.max(0, limit, s.gapLeft)
}

// The countdown shown while the limit holds it (not during the gap alone): like the Suporte de item's, in steps of
// 0.1 s rounded up, with a comma ("47,3")
export function pressCountdown(s: ButtonPress): string | null {
  if (!limited(s)) return null
  const tenths = Math.max(1, Math.ceil(pressWait(s) * 10 - 1e-6))
  return (tenths / 10).toFixed(1).replace('.', ',')
}
