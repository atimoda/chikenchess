export function isConstrainedDevice() {
  if (typeof window === 'undefined') return false
  const fewCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4
  return window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches || fewCores
}

// Manual override for testing on a device: localStorage 'chickenchess:performance' = 'lite' | 'full'.
const OVERRIDE_KEY = 'chickenchess:performance'
function performanceOverride(): 'lite' | 'full' | null {
  try {
    const value = typeof window === 'undefined' ? null : window.localStorage.getItem(OVERRIDE_KEY)
    return value === 'lite' || value === 'full' ? value : null
  } catch { return null }
}

/** Phones and other limited devices: the heaviest effects (per-note worklet LFOs, private effect buses,
 * sidechain, bar-by-bar glides, wide supersaws, the portal's glow) are switched off or simplified. */
export function isLiteDevice() {
  const override = performanceOverride()
  if (override) return override === 'lite'
  if (typeof window === 'undefined') return false
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return isConstrainedDevice() || (typeof memory === 'number' && memory <= 4)
}
