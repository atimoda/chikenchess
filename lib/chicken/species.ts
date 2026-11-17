// Bird species: every bird is driven by the same engine (lib/chicken/engine.ts) and keeps every movement
// mechanic; a species only reshapes the tuning it reads from the central configuration (params.ts / config.ts).
// 'chicken' is the player's chicken as configured. 'chick' (pintinho) is a small bird: same walk, run, slide,
// brood, wall grab and flapping, but its tiny wings give little lift and its legs little push, so every jump and
// flight is much weaker. Restrictions of the chick class: it holds no items (it is not a player) and it is silent
// (the chicken's clucks are not a chick's peep).
import type { ChickenParams } from './params'

export type BirdSpecies = 'chicken' | 'chick'

type NumKey = { [K in keyof ChickenParams]: ChickenParams[K] extends number ? K : never }[keyof ChickenParams]

// multipliers over the configured chicken (1 = the same). Sizes in px scale with `scale`, so the chick's own
// speeds stay a little closer to the chicken's than its size, or it could never keep up with her.
export const CHICK_FACTORS: Partial<Record<NumKey, number>> = {
  scale: 0.42,
  walkSpeed: 0.8,
  runBoost: 0.6,
  climbSpeed: 0.55,
  wallJump: 0.6,
  // pulo: a little hop, and the next ones in the air lose more
  jumpHeight: 0.32,
  superJump: 0.7,
  jumpDecay: 0.7,
  // combinações de pulo (chocando, correndo): a fraction of the chicken's push
  broodJumpBoost: 0.3,
  airBroodJumpBoost: 0.25,
  broodJumpVerticalBoost: 0.3,
  runBroodJumpBoost: 0.3,
  airRunBroodJumpBoost: 0.25,
  crouchJumpBoost: 0.3,
  crouchRunJumpBoost: 0.3,
  crouchRunBroodJumpBoost: 0.3,
  shockingAirMaxMultiplier: 0.5,
  // charging the shocking jump in the air: twice the chicken's wing beats (8/s for her 4/s)
  shockingAirFlapRate: 2,
  // voo: the flaps barely slow the fall
  flyFallDivisor: 0.45,
  flyUpFallAtten: 0.35,
  flyDownFallAtten: 0.4,
  jumpFlaps: 0.5,
  broodJumpFlaps: 0.5,
  // tiny legs and wings move fast
  flapRate: 1.8,
  heldFlapRate: 1.8,
  jumpFlapRate: 1.5,
  stepTime: 0.65,
  stepGap: 0.65,
  headSnapTime: 0.7,
  // the head bobs much less walking and running
  headLead: 0.35,
  runHeadTilt: 0.35,
  bodyRock: 0.6,
  // a lighter body: falls a little slower at the top speed
  terminalVelocity: 0.85,
}

// the tuning a bird of this species reads, from the chicken's (already merged with the central configuration)
export function speciesParams(species: BirdSpecies | undefined, base: ChickenParams): ChickenParams {
  if (!species || species === 'chicken') return base
  const out = { ...base } as ChickenParams
  for (const [k, f] of Object.entries(CHICK_FACTORS) as [NumKey, number][]) (out as any)[k] = (base[k] as number) * f
  // never fewer than one flap after a jump, never less than one (stable) jump in the air
  out.jumpFlaps = Math.max(1, Math.round(out.jumpFlaps))
  out.broodJumpFlaps = Math.max(1, Math.round(out.broodJumpFlaps))
  // a fly divisor under 1 would make the flaps speed the fall up
  out.flyFallDivisor = Math.max(1.05, out.flyFallDivisor)
  // (the setting's own top)
  out.shockingAirFlapRate = Math.min(15, out.shockingAirFlapRate)
  out.volume = 0
  return out
}
