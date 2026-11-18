// Bird species: every bird is driven by the same engine (lib/chicken/engine.ts) and keeps every movement
// mechanic; a species only reshapes the tuning it reads from the central configuration (params.ts / config.ts).
// 'chicken' is the player's chicken as configured. 'chick' (pintinho) is a small bird: same walk, run, slide,
// brood, wall grab and flapping, but its tiny wings give little lift and its legs little push, so every jump and
// flight is much weaker. Restrictions of the chick class: it holds no items (it is not a player) and it is silent
// (the chicken's clucks are not a chick's peep).
import { CHICKEN_PARAMS, type ChickenParams } from './params'

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
  // the head stays back much less before it shoots forward (its steps are long for its size: at the chicken's 0.7 it
  // leaned back ~44° on every step)
  headLag: 0.45,
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
  // a mammal's body: the head barely tilts running, the body leans less, Chocar sinks less (Guarda)
  runHeadTilt: 0.25, runLean: 0.5, broodDepth: 0.5,
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
  runHeadTilt: 0.25, runLean: 0.7, broodDepth: 0.55,
}
// Pig's and Ken's tuning, edited in the Ajustes panel (the Pig and Ken columns) and saved with the central
// configuration: a factor over the chicken's value for every number, and the jumps in the air set outright (the
// chicken's 99 means no limit). Factor 0 turns a thing off: Pig's toes, climbing and flaps; the health is a factor
// of Chi's 100 (Ken 200, Pig 300)
// 'chick': the Filhote's column (and the chicks that follow her: the same species)
export type ClassId = 'pig' | 'fox' | 'chick'
export const CLASS_IDS: ClassId[] = ['pig', 'fox', 'chick']
// the counts each class sets outright instead of by a factor (the jumps in the air, the inventory's limits per
// category), with their own top
export const CLASS_COUNT_KEYS = ['airJumps', 'invInstruments', 'invWeapons', 'invUtilities'] as const
export type ClassCountKey = (typeof CLASS_COUNT_KEYS)[number]
export const CLASS_COUNT_MAX: Record<ClassCountKey, number> = { airJumps: 99, invInstruments: 30, invWeapons: 30, invUtilities: 30 }
export const isClassCount = (k: string): k is ClassCountKey => (CLASS_COUNT_KEYS as readonly string[]).includes(k)
export type ClassTuning = { factors: Record<NumKey, number> } & Record<ClassCountKey, number>
export type ClassesTuning = Record<ClassId, ClassTuning>
export const CLASS_FACTOR_MAX = 5
// every number a class scales (all the chicken's numbers but the counts and the scale's marker)
export const CLASS_FACTOR_KEYS = (Object.keys(CHICKEN_PARAMS) as (keyof ChickenParams)[])
  .filter((k): k is NumKey => typeof CHICKEN_PARAMS[k] === 'number' && !isClassCount(k) && k !== 'scaleBase')
const CODE_CLASS: Record<ClassId, { factors: Partial<Record<NumKey, number>> } & Partial<Record<ClassCountKey, number>>> = {
  pig: { factors: { ...PIG_FACTORS, toeCurl: 0, maxHp: 3, climbSpeed: 0, jumpFlaps: 0, broodJumpFlaps: 0, flyFallDivisor: 0, flyUpFallAtten: 0, flyDownFallAtten: 0 }, airJumps: 0 },
  fox: { factors: { ...FOX_FACTORS, toeCurl: 0, maxHp: 2, jumpFlaps: 0, broodJumpFlaps: 0 }, airJumps: 1 },
  // the Filhote carries one instrument, one weapon and one utility (a new one takes the place of the old)
  chick: { factors: CHICK_FACTORS, invInstruments: 1, invWeapons: 1, invUtilities: 1 },
}
/** Pig's, Ken's and the Filhote's tuning as it comes in the code (a count not set: the chicken's). */
export function defaultClasses(): ClassesTuning {
  const out = {} as ClassesTuning
  for (const id of CLASS_IDS) {
    const c = CODE_CLASS[id]
    out[id] = { factors: Object.fromEntries(CLASS_FACTOR_KEYS.map(k => [k, c.factors[k] ?? 1])) as Record<NumKey, number>, ...Object.fromEntries(CLASS_COUNT_KEYS.map(k => [k, c[k] ?? CHICKEN_PARAMS[k]])) } as ClassTuning
  }
  return out
}
const DEFAULT_CLASSES = defaultClasses()
/** A saved tuning made whole and safe: every factor a number from 0 to CLASS_FACTOR_MAX, every count 0 to its top. */
export function normalizeClasses(raw: unknown): ClassesTuning {
  const out = defaultClasses()
  if (!raw || typeof raw !== 'object') return out
  for (const id of CLASS_IDS) {
    const src = (raw as Record<string, unknown>)[id] as ({ factors?: Record<string, unknown> } & Partial<Record<ClassCountKey, unknown>>) | undefined
    if (!src || typeof src !== 'object') continue
    const f = src.factors && typeof src.factors === 'object' ? src.factors : {}
    for (const k of CLASS_FACTOR_KEYS) {
      const v = f[k]
      if (typeof v === 'number' && Number.isFinite(v)) out[id].factors[k] = Math.round(Math.max(0, Math.min(CLASS_FACTOR_MAX, v)) * 100) / 100
    }
    for (const k of CLASS_COUNT_KEYS) {
      const v = src[k]
      if (typeof v === 'number' && Number.isFinite(v)) out[id][k] = Math.round(Math.max(0, Math.min(CLASS_COUNT_MAX[k], v)))
    }
  }
  return out
}

// the tuning a bird of this species reads, from the chicken's (already merged with the central configuration)
export function speciesParams(species: BirdSpecies | undefined, base: ChickenParams, classes: ClassesTuning = DEFAULT_CLASSES): ChickenParams {
  if (!species || species === 'chicken') return base
  const out = { ...base } as ChickenParams
  if (species === 'pig' || species === 'fox') {
    const c = classes[species] ?? DEFAULT_CLASSES[species]
    for (const k of CLASS_FACTOR_KEYS) (out as any)[k] = (base[k] as number) * (c.factors[k] ?? 1)
    for (const k of CLASS_COUNT_KEYS) out[k] = c[k] ?? base[k]
    // a fly divisor under 1 would make the flaps speed the fall up (Pig's 0: no slowing at all)
    out.flyFallDivisor = Math.max(1, out.flyFallDivisor)
    return out
  }
  const c = classes.chick ?? DEFAULT_CLASSES.chick
  for (const k of CLASS_FACTOR_KEYS) (out as any)[k] = (base[k] as number) * (c.factors[k] ?? 1)
  for (const k of CLASS_COUNT_KEYS) out[k] = c[k] ?? base[k]
  // never fewer than one flap after a jump, never less than one (stable) jump in the air
  out.jumpFlaps = Math.max(1, Math.round(out.jumpFlaps))
  out.broodJumpFlaps = Math.max(1, Math.round(out.broodJumpFlaps))
  // a fly divisor under 1 would make the flaps speed the fall up
  out.flyFallDivisor = Math.max(1.05, out.flyFallDivisor)
  // (the setting's own top)
  out.shockingAirFlapRate = Math.min(15, out.shockingAirFlapRate)
  if (base.babyMute) out.volume = 0
  return out
}
