/** Snap only near one of eight directions, keeping the input magnitude. */
export function magnetVector<T extends { x: number; y: number }>(input: T, degrees: number): T {
  if (degrees <= 0) return input
  const length = Math.hypot(input.x, input.y)
  if (!length) return input
  const angle = Math.atan2(input.y, input.x), step = Math.PI / 4
  const target = Math.round(angle / step) * step
  if (Math.abs(angle - target) > Math.min(22.5, degrees) * Math.PI / 180) return input
  const x = Math.cos(target) * length, y = Math.sin(target) * length
  return { ...input, x: Math.abs(x) < 1e-12 ? 0 : x, y: Math.abs(y) < 1e-12 ? 0 : y }
}
