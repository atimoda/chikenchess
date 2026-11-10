// The chicks' follow brain: each chick trails the chicken it follows with its own rhythm, so a flock never moves as
// one. Pure (no engine, no DOM): it reads where the chick and the leader are (screen px, feet; y grows down) and
// returns the actions the chick holds this step; the engine then moves it with every normal mechanic.
//
// - rest: it stays put (idling, pecking around) until the leader is farther than its own gap, then waits a
//   reaction delay of its own before starting after her.
// - follow: it walks to a spot of its own beside her (offset), runs when far, and goes back to rest once inside a
//   new random gap; sometimes it stops short or wanders a step on its own.
// - climb: when she is higher and near enough, it hops toward her: short presses of Jump in a row (each a little
//   hop with a flutter), a few tries, then a pause before trying again. Also hops when a wall stops it.
// - descend: when she is lower, falling it holds Crouch (passing through the floating floors) and standing on a
//   floor above her it drops through it (Crouch + Jump, no direction), now and then; a solid floor keeps it walking.
// - lost: far away for a while (she went through a portal, fell off the world), it is dropped beside her.
import type { ChickenAction } from './controls'

export type FollowBody = { x: number; y: number; vx: number; grounded: boolean; scale: number }
export type FollowActions = Partial<Record<ChickenAction, boolean>>
export type FollowBrain = {
  mode: 'rest' | 'follow'
  gap: number // how close it wants to get (px) before resting
  offset: number // its spot beside her (px, signed)
  wait: number // seconds left before it reacts (rest) or before it may stop short (follow)
  hop: { tries: number; press: number; release: number; cool: number }
  drop: { press: number; cool: number } // dropping through the floor it stands on
  stuck: number // seconds walking with a wall in the way
  wander: number // seconds of a step of its own while resting (sign: direction)
  far: number // seconds far away (lost)
}

export const FOLLOW = {
  gap: [45, 170] as const,
  offset: 70,
  react: [0.15, 1.4] as const,
  restStay: [0.6, 3.2] as const,
  runFar: 280,
  climbRise: 26, // she is at least this much higher (px) to try to reach her
  climbReach: 240, // and this close sideways
  hopPress: [0.12, 0.3] as const,
  hopRelease: [0.1, 0.22] as const,
  hopTries: [2, 4] as const,
  hopCool: [1.2, 3.5] as const,
  dropBelow: 60, // she is at least this much lower (px) to go down to her
  dropReach: 420, // and this close sideways
  dropCool: [1.5, 3.5] as const,
  dropWait: [0.2, 0.9] as const,
  lostDist: 1400,
  lostTime: 2.5,
}

const pick = (r: () => number, [a, b]: readonly [number, number]) => a + r() * (b - a)

export function createFollowBrain(rand: () => number = Math.random): FollowBrain {
  return {
    mode: 'rest', gap: pick(rand, FOLLOW.gap), offset: (rand() * 2 - 1) * FOLLOW.offset, wait: pick(rand, FOLLOW.react),
    hop: { tries: 0, press: 0, release: 0, cool: 0 }, drop: { press: 0, cool: pick(rand, FOLLOW.dropWait) }, stuck: 0, wander: 0, far: 0,
  }
}

// one step: the actions it holds now, and whether it is lost (the caller drops it beside her)
export function followStep(b: FollowBrain, me: FollowBody, leader: FollowBody, dt: number, rand: () => number = Math.random): { actions: FollowActions; lost: boolean } {
  const actions: FollowActions = {}
  const target = leader.x + b.offset
  const dx = target - me.x, dist = Math.abs(dx), lead = Math.abs(leader.x - me.x)
  const rise = me.y - leader.y // > 0: she is higher

  // lost: too far for too long
  b.far = Math.hypot(leader.x - me.x, leader.y - me.y) > FOLLOW.lostDist ? b.far + dt : 0
  if (b.far > FOLLOW.lostTime) { b.far = 0; b.mode = 'rest'; b.wait = pick(rand, FOLLOW.react); return { actions, lost: true } }

  b.wait = Math.max(0, b.wait - dt)
  if (b.mode === 'rest') {
    // she went beyond its gap: start after her once its reaction delay is over
    if (lead > b.gap * 1.6 || (rise > FOLLOW.climbRise * 2 && lead < FOLLOW.climbReach)) {
      if (b.wait <= 0) { b.mode = 'follow'; b.wait = pick(rand, FOLLOW.restStay) }
    } else if (b.wait <= 0 && !b.wander && rand() < dt * 0.25) {
      // now and then a step on its own
      b.wander = (rand() < 0.5 ? -1 : 1) * pick(rand, [0.15, 0.45])
    }
    if (b.wander) {
      actions[b.wander > 0 ? 'right' : 'left'] = true
      b.wander = b.wander > 0 ? Math.max(0, b.wander - dt) : Math.min(0, b.wander + dt)
    }
  }

  if (b.mode === 'follow') {
    if (dist < b.gap * 0.5 || (lead < b.gap && rise < FOLLOW.climbRise)) {
      // close enough: rest, with a new gap, spot and reaction for the next time
      b.mode = 'rest'; b.gap = pick(rand, FOLLOW.gap); b.offset = (rand() * 2 - 1) * FOLLOW.offset; b.wait = pick(rand, FOLLOW.react)
    } else {
      actions[dx > 0 ? 'right' : 'left'] = true
      if (dist > FOLLOW.runFar) actions.run = true
      // walled in: it pushes but does not move
      b.stuck = me.grounded && Math.abs(me.vx) < 8 ? b.stuck + dt : 0
    }
  }

  // down to her: hold Crouch falling (through the floating floors); on a floor above her, drop through it
  const below = leader.y - me.y
  const dr = b.drop
  dr.cool = Math.max(0, dr.cool - dt)
  if (below > FOLLOW.dropBelow && lead < FOLLOW.dropReach) {
    if (!me.grounded) actions.crouch = true
    else if (dr.press > 0) {
      dr.press -= dt
      actions.crouch = true; actions.jump = dr.press < 0.06; delete actions.left; delete actions.right; delete actions.run
      if (dr.press <= 0) dr.cool = pick(rand, FOLLOW.dropCool)
    } else if (dr.cool <= 0) { dr.press = 0.14; actions.crouch = true; delete actions.left; delete actions.right; delete actions.run }
    if (actions.crouch) return { actions, lost: false }
  } else if (dr.press > 0) dr.press = 0

  // hops: she is higher and near, or a wall stops it
  const wantUp = (rise > FOLLOW.climbRise && lead < FOLLOW.climbReach) || b.stuck > 0.35
  const h = b.hop
  h.cool = Math.max(0, h.cool - dt)
  if (h.press > 0) {
    h.press -= dt; actions.jump = true
    if (h.press <= 0) h.release = pick(rand, FOLLOW.hopRelease)
  } else if (h.release > 0) {
    h.release -= dt
  } else if (wantUp && h.cool <= 0) {
    if (h.tries <= 0 && me.grounded) h.tries = Math.round(pick(rand, FOLLOW.hopTries))
    if (h.tries > 0) {
      h.tries--; h.press = pick(rand, FOLLOW.hopPress); actions.jump = true
      if (!h.tries) { h.cool = pick(rand, FOLLOW.hopCool); b.stuck = 0 }
    }
  } else if (!wantUp) h.tries = 0
  return { actions, lost: false }
}
