// Corrente-gancho (item `hook`): the pure part. Where the hook latches (a straight cast from her hand along the aim),
// how hard a pull is for a charge, the velocity change that keeps someone being pulled at the pull's speed, when a
// pull is over, and the spinning chain while Atirar charges. combat.ts throws, latches and pulls; the drawing is in
// components/pigchicken/draw/hook.ts.
import type { ItemDef } from './items'

type P = { x: number; y: number }
// what the hook can latch on, as the cast finds it: the world (a wall, a floor, an object: she is pulled to it) or
// someone (a target or another player: pulled to her)
export type HookHit = { kind: 'world' } | { kind: 'target'; id: number } | { kind: 'player'; id: string }
export type HookCast = { x: number; y: number; hit: HookHit | null }

// px the cast advances per check: small enough not to jump over a thin wall or a small enemy
export const HOOK_STEP = 8
// px from the anchor at which a pull is over: her feet to the hook (× her size and 0.4), someone's middle to her hand
export const HOOK_ARRIVE = 46
export const HOOK_ARRIVE_TARGET = 70
// s with no progress (a pull stopped by a wall in between) after which the hook lets go
export const HOOK_STALL = 0.25
// share of the speed a pulled player keeps when the pull lets go (the rest is taken off, so she does not fly past)
export const HOOK_KEEP = 0.45
// the chain spinning while Atirar charges: turns per second with no charge and at the full charge
export const HOOK_SPIN = [1.3, 3.4] as const
// how much faster the chain comes back than the hook went out
export const HOOK_REEL = 1.6

/**
 * The straight cast of the hook from `from` along `angle`, up to `range` px: the first point where `hit` finds
 * something to latch on, or the end of the range with nothing (hit: null).
 */
export function hookCast(from: P, angle: number, range: number, hit: (x: number, y: number) => HookHit | null, step = HOOK_STEP): HookCast {
  const ux = Math.cos(angle), uy = Math.sin(angle)
  for (let d = step; d <= range + 1e-9; d += step) {
    const x = from.x + ux * d, y = from.y + uy * d
    const h = hit(x, y)
    if (h) return { x, y, hit: h }
  }
  return { x: from.x + ux * range, y: from.y + uy * range, hit: null }
}

/** The pull's speed (px/s) for a charge (0..1): `hookPullMin` of `hookPull` with no charge, all of it at the full charge. */
export function hookPullSpeed(d: Pick<ItemDef, 'hookPull' | 'hookPullMin'>, charge: number) {
  const k = Math.max(0, Math.min(1, charge))
  return d.hookPull * (d.hookPullMin + (1 - d.hookPullMin) * k)
}

/**
 * The change of velocity that takes someone at `at`, moving at `v`, to move toward `to` at `speed` px/s: what a pull
 * adds each frame (gravity and her own control are corrected on the next one).
 */
export function pullDelta(at: P, to: P, speed: number, v: P) {
  const dx = to.x - at.x, dy = to.y - at.y, d = Math.hypot(dx, dy)
  if (d < 1e-6) return { x: -v.x, y: -v.y }
  return { x: (dx / d) * speed - v.x, y: (dy / d) * speed - v.y }
}

/**
 * Whether a pull is over: close enough, out of time, or not getting closer for HOOK_STALL s. `stall` is the time with no
 * progress so far and `best` the closest it got; the result carries both for the next frame.
 */
export function pullStep(dist: number, best: number, stall: number, t: number, dt: number, arrive: number, maxTime: number) {
  const closer = dist < best - 1
  const nextStall = closer ? 0 : stall + dt
  return { done: dist <= arrive || t >= maxTime || nextStall >= HOOK_STALL, best: Math.min(best, dist), stall: nextStall }
}

/** The spin's speed (radians per second) for a charge (0..1). */
export const spinRate = (charge: number) => (HOOK_SPIN[0] + (HOOK_SPIN[1] - HOOK_SPIN[0]) * Math.max(0, Math.min(1, charge))) * Math.PI * 2

/**
 * Where the end of the spinning chain is: a circle around her hand seen a little from the side (an ellipse, `tilt` of
 * its height), `len` px long, turned `spin` radians; `face` mirrors the turning side.
 */
export function spinEnd(hand: P, spin: number, len: number, face: number, tilt = 0.38): P {
  return { x: hand.x + Math.cos(spin) * len * face, y: hand.y + Math.sin(spin) * len * tilt }
}
