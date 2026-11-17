// Bird species: every bird is driven by the same engine (lib/chicken/engine.ts) and keeps every movement
// mechanic; a species only reshapes the tuning it reads from the central configuration (params.ts / config.ts).
// 'chicken' is the player's chicken as configured. 'chick' (pintinho) is a small bird: same walk, run, slide,
// brood, wall grab and flapping, but its tiny wings give little lift and its legs little push, so every jump and
// flight is much weaker. Restrictions of the chick class: it holds no items (it is not a player) and it is silent
// (the chicken's clucks are not a chick's peep).
import type { ChickenParams } from './params'

// 'pig' (Pig, the tank) and 'fox' (Ken, the assassin): the species classes of the Vestiário's pigs and foxes
// (beast-art.ts). Every skin of a class moves the same way; the chickens all use the configured chicken (the Caipira).
export type BirdSpecies = 'chicken' | 'chick' | 'pig' | 'fox'

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

// Pig: bigger, slow to start and to stop, short heavy jumps, no jump in the air, no climbing, hard to push
export const PIG_FACTORS: Partial<Record<NumKey, number>> = {
  scale: 1.15, walkSpeed: 0.78, runMultiplier: 0.75, runBoost: 0.37, runBoostTime: 2, acceleration: 0.36, deceleration: 0.56,
  airControl: 0.45, jumpHeight: 0.65, superJump: 0.65, gravity: 1.35, fastFall: 1.5, slideFriction: 2.44, backpedal: 0.9,
  // Investida (Brood + Jump): a charge along the ground, longer and flat
  broodJumpBoost: 1.6, airBroodJumpBoost: 1.2, broodJumpVerticalBoost: 0.15, runBroodJumpBoost: 1.3,
  knockbackTaken: 0.35,
}
// Ken: a little faster than Pig and slower than the chicken, but quick to answer (acceleration, stopping, air control);
// high jumps, one jump in the air, a very slow glide spinning the tail
export const FOX_FACTORS: Partial<Record<NumKey, number>> = {
  scale: 1.05, walkSpeed: 0.96, runMultiplier: 0.875, runBoost: 1.27, runBoostTime: 0.4, acceleration: 1.56, deceleration: 3.33,
  airControl: 1.64, jumpHeight: 1.15, superJump: 1.1, gravity: 1.15, slideFriction: 0.62, backpedal: 1.5, wallJump: 1.15,
  flyFallDivisor: 2,
  // Bote (Brood + Jump): a long, low leap
  broodJumpBoost: 1.5, airBroodJumpBoost: 1.3, broodJumpVerticalBoost: 0.7, runBroodJumpBoost: 1.3,
  knockbackTaken: 0.8,
}
// values set outright, not scaled
const SET: Partial<Record<BirdSpecies, Partial<Record<NumKey, number>>>> = {
  pig: { maxHp: 300, airJumps: 0, climbSpeed: 0, jumpFlaps: 0, broodJumpFlaps: 0, flyFallDivisor: 1, flyUpFallAtten: 0, flyDownFallAtten: 0 },
  fox: { maxHp: 200, airJumps: 1, jumpFlaps: 0, broodJumpFlaps: 0 },
}

// the tuning a bird of this species reads, from the chicken's (already merged with the central configuration)
export function speciesParams(species: BirdSpecies | undefined, base: ChickenParams): ChickenParams {
  if (!species || species === 'chicken') return base
  const out = { ...base } as ChickenParams
  if (species === 'pig' || species === 'fox') {
    for (const [k, f] of Object.entries(species === 'pig' ? PIG_FACTORS : FOX_FACTORS) as [NumKey, number][]) (out as any)[k] = (base[k] as number) * f
    Object.assign(out, SET[species])
    return out
  }
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
