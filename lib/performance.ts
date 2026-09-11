export function isConstrainedDevice() {
  if (typeof window === 'undefined') return false
  const fewCores = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4
  return window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches || fewCores
}
