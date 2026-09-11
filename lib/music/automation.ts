export const AUTOMATION_TARGETS = {
  gain: { label: 'Acento / ganho ×', min: 0, max: 2, initial: '1 .55 .8 .55' },
  lpf: { label: 'Passa-baixas · Hz', min: 20, max: 20000, initial: '<800 1600 3200 1600>' },
  pan: { label: 'Pan · 0 esquerda / 1 direita', min: 0, max: 1, initial: '.25 .75' },
  room: { label: 'Reverb', min: 0, max: 1, initial: '<.1 .25 .4 .25>' },
  delay: { label: 'Delay', min: 0, max: 1, initial: '<0 .15 0 .3>' },
} as const
export type AutomationTarget = keyof typeof AUTOMATION_TARGETS
export type Automation = { kind: 'pattern'; patterns: string[] } | { kind: 'sine' | 'ramp'; min: number; max: number; cycles: number }
export type Automations = Partial<Record<AutomationTarget, Automation>>

// Numeric mini-notation only. Operators and parameter values have separate
// bounds, so a 12000 Hz cutoff cannot become a 12000-fold expansion.
export function hasControlPatternBudget(pattern: string, min: number, max: number) {
  if (!pattern.trim() || pattern.length > 256 || !/^[\d.\s[\]<>*/!@-]+$/.test(pattern)) return false
  let expansion = 1
  let valid = true
  const values = pattern.replace(/([*/!@])\s*(\d+(?:\.\d+)?)/g, (_, op, raw) => {
    const n = Number(raw)
    if (n <= 0 || n > 32) valid = false
    if (op === '*' || op === '!') expansion *= n
    return ''
  }).match(/-?(?:\d*\.\d+|\d+)/g)
  return valid && expansion <= 32 && !!values?.length && values.every(value => Number(value) >= min && Number(value) <= max)
}
