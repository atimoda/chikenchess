// What a soul flying free does for whoever freed it, and against them. Pure (no combat, no DOM): the numbers, what
// each class and each death give, and the clock that says when it acts. The combat (lib/pigchicken/combat.ts) does
// the acting.
//
// - A help is its class's: the Sentinela sings a note of the chord to an enemy near it, the Ritmada does it on the
//   beat, the Preguiçosa fetches an item she does not carry, the Patrulheira warns of what comes from behind her, the
//   Escolta is a step under her feet when she falls.
// - A hinder is what its death left it: a dead soul pushes (killed by a blast), makes her hop (a bullet), shakes her
//   aim (an arrow) or pecks her (a blow). One whose note was outside the key sings out of tune. How often: a chance
//   each time its clock comes round, higher the rarer it is.
// Every number is a parameter (SoulActParams): its class's and its state's first, its own entry's over them.
import type { SoulClassId } from './soul-follow'
import type { Soul, SoulRarity, SoulState, SoulWeapon } from './souls'

export type SoulHelp = 'none' | 'sing' | 'beat' | 'fetch' | 'warn' | 'step'
// own: what the soul itself is says it (the weapon that killed it; out of tune for one outside the key; else nothing)
export type SoulHinder = 'own' | 'none' | 'push' | 'bounce' | 'aim' | 'peck' | 'detune'
export type SoulActParams = {
  help: SoulHelp // what it does for her
  every: number // s between two acts
  range: number // px: how far it reaches (from where it is; a danger: from her)
  power: number // 0 to 1: how strong its help is
  hinder: SoulHinder // what it does against her
  chance: number // 0 to 1: each time its clock comes round, the chance it hinders
  force: number // 0 to 1: how strong that is
}
export const SOUL_ACT_DEFAULTS: SoulActParams = { help: 'sing', every: 6, range: 300, power: 0.5, hinder: 'own', chance: 0, force: 0.3 }
type Numeric = Exclude<keyof SoulActParams, 'help' | 'hinder'>
export const SOUL_ACT_RANGES: Record<Numeric, { min: number; max: number; step: number }> = {
  every: { min: 1, max: 30, step: 0.5 }, range: { min: 50, max: 800, step: 10 }, power: { min: 0, max: 1, step: 0.05 },
  chance: { min: 0, max: 1, step: 0.05 }, force: { min: 0, max: 1, step: 0.05 },
}
export const SOUL_HELPS: Record<SoulHelp, string> = { none: 'Nenhuma', sing: 'Cantar nas harmonias', beat: 'Cantar no tempo', fetch: 'Buscar item', warn: 'Avisar perigo', step: 'Degrau no ar' }
export const SOUL_HINDERS: Record<SoulHinder, string> = { own: 'O da própria alma', none: 'Nenhum', push: 'Empurrar', bounce: 'Quicar', aim: 'Desviar a mira', peck: 'Bicar', detune: 'Desafinar' }

// what each class does (the chick only keeps her company)
export const SOUL_CLASS_ACTS: Record<SoulClassId, Partial<SoulActParams>> = {
  sentinel: { help: 'sing', range: 600 },
  patrol: { help: 'warn', range: 520 },
  escort: { help: 'step' },
  rhythm: { help: 'beat', every: 3, range: 450, power: 0.35 },
  lazy: { help: 'fetch', every: 10, range: 600 },
  chick: { help: 'none' },
}
// a dead soul still helps, with a chance of hindering that grows with how rare it is
export const SOUL_HINDER_CHANCE: Record<SoulRarity, number> = { common: 0.1, uncommon: 0.2, rare: 0.3, legendary: 0.45 }
export const WEAPON_HINDER: Record<SoulWeapon, Exclude<SoulHinder, 'own'>> = { blast: 'push', bullet: 'bounce', arrow: 'aim', impact: 'peck' }

export const SOUL_ACT = {
  rebel: 0.15, // the chance a soul whose note was outside the key adds to its hindering
  first: [0.4, 1] as const, // of `every`: when its clock first comes round after it is let out
  // an errand (it leaves its spot to do something): times its flight speed, at least `min` px/s; px from the point:
  // it got there; s before it gives up
  errand: { speed: 2.2, min: 520, reach: 28, time: 4 },
  sing: { amount: 20, beat: 1.5, vel: 0.5, dur: 0.3, trail: 48 }, // harmony a note gives at power 1; times that on the beat; px between the sparks of its way
  // an item nearer than `near` px from her is already hers to take; it is let go `drop` px above her head, hangs
  // under the soul (`hang` px down to the point it would lie on) and is carried for `time` s at most
  fetch: { near: 110, drop: 50, hang: 56, time: 9 },
  warn: { again: 3 }, // times `every`: before it warns of the same enemy again
  // a step: she must be falling at `fall` px/s after `air` s off the floor, `drop` px above it; she leaves upwards
  // at lift[0] (power 0) to lift[1] (power 1) px/s. chase: px/s faster than her fall the soul dives; time: s it tries
  step: { fall: 220, air: 0.3, drop: 150, lift: [520, 980] as const, chase: 500, time: 1.5 },
  push: { r: 230, strength: [500, 1500] as const, beside: 70, up: 0.35 }, // a radial shove from beside her (force 0 to 1)
  bounce: { lift: [420, 1000] as const, side: 160 }, // px/s she hops at; at most this much sideways
  aim: { deg: [12, 55] as const, time: [0.7, 1.6] as const, rate: 22 }, // her aim sways this wide, for this long (rad/s)
  peck: { push: [160, 520] as const, lock: [0.25, 0.9] as const }, // px/s she is knocked; s her item does not answer
  detune: { semis: 0.5, time: [3, 9] as const }, // her notes play this far off, for this long
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
export const actLerp = ([a, b]: readonly [number, number], k: number) => a + (b - a) * clamp01(k)

// an entry's numbers before its own: its class's, and a dead one's chance of hindering by its rarity
export const soulActBase = (cls: SoulClassId, state: SoulState, rarity: SoulRarity): SoulActParams =>
  ({ ...SOUL_ACT_DEFAULTS, ...SOUL_CLASS_ACTS[cls], ...(state === 'dead' ? { chance: SOUL_HINDER_CHANCE[rarity] } : {}) })

type Origin = Pick<Soul, 'state' | 'weapon' | 'note'>
// what this soul does against her
export function hinderOf(p: SoulActParams, soul: Origin): Exclude<SoulHinder, 'own'> {
  if (p.hinder !== 'own') return p.hinder
  if (soul.state === 'dead') return WEAPON_HINDER[soul.weapon ?? 'impact']
  return soul.note === 'outside' ? 'detune' : 'none'
}
// and how likely, each time its clock comes round
export const hinderChance = (p: SoulActParams, soul: Origin) =>
  (hinderOf(p, soul) === 'none' ? 0 : clamp01(p.chance + (soul.note === 'outside' ? SOUL_ACT.rebel : 0)))

// ---------- the clock ----------
// in: s until its clock comes round; ready: it may help as soon as there is something to do
export type SoulActClock = { in: number; ready: boolean }
export const newActClock = (p: SoulActParams, rand: () => number = Math.random): SoulActClock => ({ in: p.every * actLerp(SOUL_ACT.first, rand()), ready: false })
/** A frame of the clock. Every `every` seconds it comes round: the soul may hinder (true: it does, now) and, if not,
 * is ready to help. A help done (actDone) starts the wait again. */
export function actClockStep(c: SoulActClock, p: SoulActParams, soul: Origin, dt: number, rand: () => number = Math.random): boolean {
  c.in -= dt
  if (c.in > 0) return false
  c.in = p.every
  if (rand() < hinderChance(p, soul)) { c.ready = false; return true }
  c.ready = p.help !== 'none'
  return false
}
export function actDone(c: SoulActClock, p: SoulActParams) { c.ready = false; c.in = p.every }
