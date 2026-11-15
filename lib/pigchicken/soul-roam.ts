// A soul flying free explores the map instead of hovering by its owner all the time. Pure (no combat, no DOM): the
// combat keeps a SoulRoam on each freed soul and calls soulRoamStep every frame, before soulFollowStep.
//
// - With her: once it has rested at its spot for a while (shorter the keener it is: SoulFollowParams.roam), it picks a
//   free place to land within `roamRange` of her (a wire, a branch or the crown of a tree, the top of a platform or of
//   an object: lib/pigchicken/bird-perch.ts, the places it likes more often) and flies there.
// - Out: it flies to the place at its own speed, in a soft arc, sits there (still, watching her) for `perchTime`, and
//   then either goes on to another place (the chance is `roam`) or flies back to her.
// - It comes back at once when she goes farther than ROAM.leash times `roamRange` from it, or when its place is gone.
// While it is out the caller skips soulFollowStep; what it does for and against her goes on as before.
import { perchHold, perchPick, perchPoint, perchTouch, perchEnd, type PerchState, type PerchWorld } from './bird-perch'
import { soulErrandStep, type SoulBrain, type SoulFlyer, type SoulFollowParams, type SoulOwner } from './soul-follow'

export const SOUL_ROAM = {
  home: [20, 1] as const, // s it rests by her before leaving, at roam 0 (never, in fact) and at roam 1
  first: [0.3, 1] as const, // of that: before its first outing
  vary: [0.7, 1.3] as const, // each wait and each rest, times this
  leash: 1.3, // times roamRange: farther than this from her, it flies back
  reach: 10, // px from the place: it landed
  arc: 0.5, // how much higher than the straight line it flies in the middle of the way (1/s of the distance left)
  hops: 6, // places in one outing, at most
  retry: 4, // s before it looks again when there was nowhere to land
  spacing: 34, // px from the next bird on the same line
  speed: 0.85, // of its flight speed: it is in no hurry
  head: 100, // px above her feet: where the distances to her are measured from (times her scale)
}

// in: s it still rests by her before leaving; spot: the place it holds (on its way there, or sitting); sat: it landed;
// left: s it still sits; hops: places it has been to since it left her
export type SoulRoam = { in: number; spot: PerchState | null; sat: boolean; left: number; hops: number }
const lerp = ([a, b]: readonly [number, number], k: number) => a + (b - a) * k
const homeTime = (p: SoulFollowParams, rand: () => number) => lerp(SOUL_ROAM.home, Math.max(0, Math.min(1, p.roam))) * lerp(SOUL_ROAM.vary, rand())
export const newSoulRoam = (p: SoulFollowParams, rand: () => number = Math.random): SoulRoam =>
  ({ in: homeTime(p, rand) * lerp(SOUL_ROAM.first, rand()), spot: null, sat: false, left: 0, hops: 0 })
// it is sitting on a place (drawn with its wings still)
export const soulPerched = (r: SoulRoam) => !!r.spot && r.sat

// it drops its place (called back, caught, on an errand that ends by her): it is with her again
export function roamHome(r: SoulRoam, w: PerchWorld | null, p: SoulFollowParams, rand: () => number = Math.random) {
  if (r.spot && w) perchEnd(w, r.spot)
  r.spot = null; r.sat = false; r.hops = 0; r.in = homeTime(p, rand)
}
// something took it off its place for a moment (an errand): it flies back to it
export function roamLift(r: SoulRoam) { r.sat = false }

/** One frame. true: it is out (on its way to a place, or sitting there) and `me` was moved; false: it is with her
 * (the caller steps soulFollowStep). */
export function soulRoamStep(r: SoulRoam, b: SoulBrain, me: SoulFlyer, owner: SoulOwner, p: SoulFollowParams, w: PerchWorld | null, dt: number, rand: () => number = Math.random): boolean {
  if (dt <= 0) return !!r.spot
  if (!w || p.roam <= 0 || !w.spans.length) { if (r.spot) roamHome(r, w, p, rand); return false }
  const hx = owner.x, hy = owner.y - SOUL_ROAM.head * (owner.scale ?? 1)
  const likes = { wires: p.wires, trees: p.trees, platforms: p.platforms, objects: p.objects }
  if (!r.spot) {
    // by her: the wait only runs while it rests at its spot
    if (b.mode === 'rest') r.in -= dt
    if (r.in > 0) return false
    const spot = perchPick(w, hx, hy, p.roamRange, likes, SOUL_ROAM.spacing, rand)
    if (!spot) { r.in = SOUL_ROAM.retry; return false }
    r.spot = perchHold(w, spot); r.sat = false; r.hops = 0
  }
  const at = perchPoint(w, r.spot)
  // its place is gone, or she went too far
  if (!at || Math.hypot(hx - me.x, hy - me.y) > p.roamRange * SOUL_ROAM.leash) { roamHome(r, w, p, rand); return false }
  perchTouch(w, r.spot)
  if (!r.sat) {
    const left = soulErrandStep(b, me, at, p.speed * SOUL_ROAM.speed, dt)
    if (left > SOUL_ROAM.reach) {
      // a soft arc: a little higher in the middle of the way
      me.y -= Math.min(left, 200) * SOUL_ROAM.arc * dt; b.y = me.y
      return true
    }
    r.sat = true; r.left = p.perchTime * lerp(SOUL_ROAM.vary, rand())
  }
  // sitting: on its place (which moves with the depth of what it sits on), watching her
  me.x = b.x = at.x; me.y = b.y = at.y; b.vx = b.vy = 0; b.settle = 0; b.loop = -1
  if (Math.abs(hx - me.x) > 12) me.face = hx > me.x ? 1 : -1
  r.left -= dt
  if (r.left > 0) return true
  // rested: another place, or back to her
  r.hops++
  const next = r.hops < SOUL_ROAM.hops && rand() < p.roam ? perchPick(w, hx, hy, p.roamRange, likes, SOUL_ROAM.spacing, rand, r.spot.span) : null
  perchEnd(w, r.spot)
  if (!next) { r.spot = null; r.sat = false; r.in = homeTime(p, rand); b.mode = 'follow'; return false }
  r.spot = perchHold(w, next); r.sat = false
  return true
}
