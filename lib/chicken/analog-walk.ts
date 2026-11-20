// Caminhada lenta e profundidade da mira pelo analógico de movimento. Pure functions, shared by the engine (speed)
// and the Pátio (where the reticle sits).

/** Below this extension (0..1, the stick's raw push, dead zone included) the movement stick walks slowly. */
export const SLOW_WALK_EXTENT = 0.8
export const DEFAULT_SLOW_WALK = 0.5

/**
 * The speed multiplier for the movement stick: `factor` while the stick is what moves her (no key or d-pad held for
 * the same direction), she is not running and it is pushed less than SLOW_WALK_EXTENT; 1 otherwise.
 */
export function slowWalkMult(o: { extent: number | null; factor: number; run: boolean; digital: boolean }): number {
  if (o.extent == null || o.run || o.digital || !(o.extent < SLOW_WALK_EXTENT)) return 1
  return Number.isFinite(o.factor) ? Math.max(0, Math.min(1, o.factor)) : DEFAULT_SLOW_WALK
}

/**
 * How far the reticle sits, as a share of "Distância da retícula": a stick that owns the aim (aim stick, on-screen
 * aim stick, or the movement stick when no aim stick is in use) sets it by how far it is pushed (`strength`, 0..1
 * from the dead zone's edge); other aims (keys, facing) sit at the full distance.
 */
export function stickAimDepth(source: string, strength: number): number {
  if (source !== 'rightStick' && source !== 'touch' && source !== 'leftStick') return 1
  const s = Number.isFinite(strength) ? Math.max(0, Math.min(1, strength)) : 1
  return 0.45 + 0.55 * s
}
