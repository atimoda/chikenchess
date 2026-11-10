// Volume pela distância da mira: an instrument's notes sound softer with the aim close to her and louder far away,
// between the item's "Volume pela distância" minimum and maximum (equal = no change). The reach is 0 at her and 1
// at VOLUME_REACH px (mouse, from her shoulder) or with the stick all the way; aims with no distance (keys, the
// left stick) count as far.

export const VOLUME_REACH = 360 // screen px from her shoulder where the mouse aim reaches the maximum

export const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1)

// the aim's reach (0..1): `px` the mouse's distance from her, or `stick` how far the aim stick is pushed
export function aimReach(src: { px?: number | null; stick?: number | null }): number {
  if (src.px != null) return clamp01(src.px / VOLUME_REACH)
  if (src.stick != null) return clamp01(src.stick)
  return 1
}

// the multiplier on the note's loudness for a reach (min and max in either order)
export function aimVolume(min: number, max: number, reach: number): number {
  const lo = clamp01(min), hi = clamp01(max)
  return lo + (hi - lo) * clamp01(reach)
}

// two values closer than this snap together in the panel's double slider (no change with distance)
export const VOLUME_SNAP = 0.04
