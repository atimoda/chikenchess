// The friend bot: a soul let out of the basket flies along with whoever freed it. Pure (no combat, no DOM): the
// combat keeps a SoulBrain on each freed soul and calls soulFollowStep every frame with where its owner is.
//
// - Its spot is beside the owner (dist, to one side) and above her (height: 0 at her head, 1 at the top of the sky
//   she sees). Each soul keeps a little of its own on top of its class (a bit nearer or farther, higher or lower),
//   so two of the same class never sit on the same spot. Against a wall of the world, the spot takes her other side.
//   Spots too close to each other drift apart (spreadSouls), and each soul keeps its drift.
// - rest: the spot stays where it is while she moves around. The soul flies its pattern there (still, circle, eight,
//   sway, zigzag, orbit around her, hops on the beat), wanders a little (restless) and does a small loop now and then.
// - follow: once she is farther than `leash` from the spot (and after `react` seconds), the spot goes with her and
//   the soul flies to it at its own speed; it rests again when it gets there. Left behind it hurries (up to 3 times
//   its speed); lost (a portal), it comes in from beside the screen.
// Every number is a parameter (SoulFollowParams); a class is a set of them, picked from what the soul is.
// - An errand (soulErrandStep): what it does for or against her (lib/pigchicken/soul-acts.ts) may take it off its
//   spot for a moment, straight to a point; then it flies back.
import type { Soul, SoulShot } from './souls'

export type SoulSide = 'behind' | 'front' | 'any'
export type SoulPattern = 'still' | 'circle' | 'eight' | 'sway' | 'zigzag' | 'orbit' | 'hop'
export type SoulFollowParams = {
  dist: number // px: how far to the side of the owner its spot is (orbit: the radius around her)
  height: number // 0 to 1: how high the spot is (0: her head; 1: the top of the sky she sees)
  leash: number // px: how far she may go from the spot before it follows
  speed: number // px/s: its flight speed
  accel: number // 1/s: how quickly it picks up speed and how late it brakes
  react: number // s it takes to notice she left
  side: SoulSide // behind her, in front of her, or the side it is already on
  pattern: SoulPattern // what it does at its spot
  patternSize: number // px: how wide the pattern is
  patternTime: number // s: one turn of the pattern
  loopEvery: number // s between two little loops while it rests (0: never)
  restless: number // 0 to 1: how much it wanders around the spot
}
export const SOUL_FOLLOW_DEFAULTS: SoulFollowParams = { dist: 220, height: 0.7, leash: 450, speed: 240, accel: 3, react: 0.4, side: 'any', pattern: 'still', patternSize: 60, patternTime: 4, loopEvery: 8, restless: 0.2 }
type Numeric = Exclude<keyof SoulFollowParams, 'side' | 'pattern'>
export const SOUL_FOLLOW_RANGES: Record<Numeric, { min: number; max: number; step: number }> = {
  dist: { min: 20, max: 600, step: 10 }, height: { min: 0, max: 1, step: 0.05 }, leash: { min: 0, max: 1500, step: 10 },
  speed: { min: 60, max: 600, step: 10 }, accel: { min: 0.5, max: 10, step: 0.5 }, react: { min: 0, max: 2, step: 0.1 },
  patternSize: { min: 0, max: 300, step: 5 }, patternTime: { min: 0.5, max: 12, step: 0.1 }, loopEvery: { min: 0, max: 30, step: 1 },
  restless: { min: 0, max: 1, step: 0.05 },
}
export const SOUL_SIDES: Record<SoulSide, string> = { behind: 'Atrás', front: 'Na frente', any: 'Qualquer' }
export const SOUL_PATTERNS: Record<SoulPattern, string> = { still: 'Parada', circle: 'Círculo', eight: 'Oito', sway: 'Vai e vem', zigzag: 'Zigue-zague', orbit: 'Órbita no dono', hop: 'Saltos na batida' }

// the classes: one for each family of instrument that made the soul, and the chick's
export type SoulClassId = 'sentinel' | 'patrol' | 'escort' | 'rhythm' | 'lazy' | 'chick'
export const SOUL_CLASSES: Record<SoulClassId, { name: string; params: Partial<SoulFollowParams> }> = {
  // watches from far and high; a little loop now and then
  sentinel: { name: 'Sentinela', params: { dist: 220, height: 0.7, leash: 450, speed: 260, pattern: 'still', loopEvery: 8 } },
  // patrols in an eight at mid height
  patrol: { name: 'Patrulheira', params: { dist: 160, height: 0.5, leash: 300, speed: 300, pattern: 'eight', patternSize: 110, patternTime: 5, loopEvery: 0, restless: 0.1 } },
  // goes round her, close, and never lets her go
  escort: { name: 'Escolta', params: { dist: 70, height: 0.05, leash: 80, speed: 420, accel: 6, react: 0.1, pattern: 'orbit', patternTime: 2.6, loopEvery: 0, restless: 0 } },
  // hops from side to side on the beat
  rhythm: { name: 'Ritmada', params: { dist: 180, height: 0.5, leash: 250, speed: 320, accel: 5, pattern: 'hop', patternSize: 70, loopEvery: 0 } },
  // lets her go a long way before it bothers
  lazy: { name: 'Preguiçosa', params: { dist: 300, height: 0.6, leash: 1100, speed: 200, accel: 1.5, react: 1.2, pattern: 'still', loopEvery: 0, restless: 0.05 } },
  // a chick's soul: low and close, swaying
  chick: { name: 'Pintinho', params: { dist: 80, height: 0.08, leash: 160, speed: 300, pattern: 'sway', patternSize: 30, patternTime: 2, loopEvery: 0, restless: 0.5 } },
}
const SHOT_CLASS: Record<SoulShot, SoulClassId> = { wind: 'sentinel', strings: 'patrol', keys: 'escort', percussion: 'rhythm', rebate: 'lazy' }
export const soulClassOf = (s: Pick<Soul, 'species' | 'shot'>): SoulClassId => (s.species === 'chick' ? 'chick' : s.shot ? SHOT_CLASS[s.shot] : 'sentinel')
export const soulFollowParams = (s: Pick<Soul, 'species' | 'shot'>): SoulFollowParams => ({ ...SOUL_FOLLOW_DEFAULTS, ...SOUL_CLASSES[soulClassOf(s)].params })

export const SOUL_FLIGHT = {
  head: 200, // px above her feet where height 0 is (times her scale)
  sky: 420, // px from height 0 to height 1 when nobody says where the sky ends
  skyMargin: 60, // px below the top of the sky where height 1 is
  skyMin: 120, // px: the least there is between height 0 and height 1 (she is at the top herself)
  edge: 40, // px from a wall of the world: no spot nearer than this
  arrive: 28, // px from the spot: it got there (it rests)
  fold: [40, 200] as const, // px from the spot: the pattern is whole inside the first, folded away beyond the second
  settle: 2.5, // 1/s: how quickly the pattern opens and folds
  hurryOver: 250, // px beyond the leash for each extra time its speed
  hurryMax: 3, // times its speed, at most
  lost: 2600, // px: farther than this, it comes in from beside the screen
  enter: { x: 900, y: 260 }, // where it comes in from, off the spot
  loop: { r: 26, time: 0.9 }, // the little loop
  wander: 80, // px it wanders at restless 1
  hop: { time: 0.25, rise: 0.3, ease: 14 }, // a hop on the beat: how long its arc lasts, how high (of the size), how fast it gets there
  own: { dist: [0.8, 1.25] as const, height: 0.1 }, // each soul's own: times the class's dist, plus or minus on its height
  apart: 64, // px: two spots nearer than this drift away from each other
  drift: { speed: 90, max: 140 }, // px/s they drift at, at most; px a spot may end up from where its class puts it
  turn: 30, // px/s sideways: faster than this, it faces where it goes
}

export type SoulOwner = { x: number; y: number; face: number; scale?: number } // world px, her feet
// the air it keeps inside (world px): the walls of the world and the top of the sky the camera shows
export type SoulAir = { l: number; r: number; top: number }
export type SoulFlyer = { x: number; y: number; face: number }
export type SoulBrain = {
  mode: 'rest' | 'follow'
  x: number; y: number; vx: number; vy: number // where it is without its pattern (world px) and how fast it goes
  ax: number; ay: number // its spot
  side: 1 | -1 // which side of her the spot is on
  kd: number; kh: number // its own distance (times) and height (plus)
  sx: number; sy: number // how far its spot drifted from the others' (px)
  wait: number // s left before it notices she left
  settle: number // 0 to 1: how much of the pattern shows
  phase: number // turns of the pattern
  loopIn: number; loop: number // s until the next little loop; the one under way (0 to 1; -1: none)
  beat: number; hops: number; hopT: number; hx: number; hy: number; px: number; py: number // hops on the beat
  wx: number; wy: number; wtx: number; wty: number; wanderIn: number // wandering around the spot
}

const lerp = ([a, b]: readonly [number, number], k: number) => a + (b - a) * k
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
// a triangle wave: -1 to 1 and back, once a turn
const tri = (turns: number) => { const k = turns - Math.floor(turns); return k < 0.5 ? 4 * k - 1 : 3 - 4 * k }

// a soul that just came out at (x, y): it flies to its spot
export function createSoulBrain(x: number, y: number, p: SoulFollowParams, rand: () => number = Math.random): SoulBrain {
  return {
    mode: 'follow', x, y, vx: 0, vy: 0, ax: x, ay: y, side: rand() < 0.5 ? -1 : 1,
    kd: lerp(SOUL_FLIGHT.own.dist, rand()), kh: (rand() * 2 - 1) * SOUL_FLIGHT.own.height, sx: 0, sy: 0,
    wait: p.react, settle: 0, phase: rand(), loopIn: p.loopEvery * (0.4 + rand() * 0.6), loop: -1,
    beat: NaN, hops: Math.floor(rand() * 2), hopT: 1, hx: 0, hy: 0, px: 0, py: 0,
    wx: 0, wy: 0, wtx: 0, wty: 0, wanderIn: rand() * 2,
  }
}

// where its spot would be now, beside (or, in orbit, over) the owner
export function soulSpot(b: SoulBrain, owner: SoulOwner, p: SoulFollowParams, air?: SoulAir | null) {
  const head = owner.y - SOUL_FLIGHT.head * (owner.scale ?? 1)
  const sky = air ? Math.max(SOUL_FLIGHT.skyMin, head - air.top - SOUL_FLIGHT.skyMargin) : SOUL_FLIGHT.sky
  const x = (p.pattern === 'orbit' ? owner.x : owner.x + b.side * p.dist * b.kd) + b.sx
  return { x: air && air.r - air.l > SOUL_FLIGHT.edge * 2 ? Math.max(air.l + SOUL_FLIGHT.edge, Math.min(air.r - SOUL_FLIGHT.edge, x)) : x, y: head - clamp01(p.height + b.kh) * sky + b.sy }
}

// keeps the souls' spots apart: two of them nearer than SOUL_FLIGHT.apart drift away from each other, a little
// every frame. Each soul keeps its drift, so they do not pile up again the next time they follow.
export function spreadSouls(souls: readonly { brain: SoulBrain }[], dt: number) {
  const { apart, drift } = SOUL_FLIGHT
  const move = (b: SoulBrain, x: number, y: number) => {
    const sx = Math.max(-drift.max, Math.min(drift.max, b.sx + x)), sy = Math.max(-drift.max * 0.6, Math.min(drift.max * 0.6, b.sy + y))
    b.ax += sx - b.sx; b.ay += sy - b.sy; b.sx = sx; b.sy = sy
  }
  for (let i = 0; i < souls.length; i++) for (let j = i + 1; j < souls.length; j++) {
    const a = souls[i].brain, b = souls[j].brain
    let dx = b.ax - a.ax, dy = b.ay - a.ay
    const d = Math.hypot(dx, dy)
    if (d >= apart) continue
    // on the very same spot: any way will do
    if (d < 0.01) { dx = (i + j) % 2 ? 1 : -1; dy = 0.3 } else { dx /= d; dy /= d }
    const push = (1 - d / apart) * drift.speed * dt + 0.02
    move(a, -dx * push, -dy * push); move(b, dx * push, dy * push)
  }
}

// one frame: moves `me` (and turns it). env.beat: the song's beat count (whole beats), for the hops; env.air: the
// walls and the top of the sky, when there are any.
export function soulFollowStep(b: SoulBrain, me: SoulFlyer, owner: SoulOwner, p: SoulFollowParams, env: { beat: number; air?: SoulAir | null }, dt: number, rand: () => number = Math.random) {
  if (dt <= 0) return
  const air = env.air
  // a spot on that side of her is inside the walls
  const inside = (side: number) => { if (!air) return true; const x = owner.x + side * p.dist * b.kd; return x >= air.l + SOUL_FLIGHT.edge && x <= air.r - SOUL_FLIGHT.edge }
  if (p.side !== 'any') b.side = (p.side === 'behind') === (owner.face >= 0) ? -1 : 1
  // past a wall: her other side, when there is room there
  if (p.pattern !== 'orbit' && !inside(b.side) && inside(-b.side)) b.side = b.side > 0 ? -1 : 1
  let want = soulSpot(b, owner, p, air)
  if (b.mode === 'rest') {
    if (Math.hypot(want.x - b.ax, want.y - b.ay) > p.leash) {
      b.wait -= dt
      if (b.wait <= 0) {
        b.mode = 'follow'
        // either side will do: the one it is already on
        if (p.side === 'any') { const side = b.x >= owner.x ? 1 : -1; if (inside(side)) b.side = side; want = soulSpot(b, owner, p, air) }
      }
    } else b.wait = p.react
  }
  if (b.mode === 'follow') { b.ax = want.x; b.ay = want.y }

  // the flight to the spot: it brakes as it gets there, hurries when left behind
  let dx = b.ax - b.x, dy = b.ay - b.y, d = Math.hypot(dx, dy)
  if (d > SOUL_FLIGHT.lost) {
    b.x = b.ax - Math.sign(dx || 1) * SOUL_FLIGHT.enter.x; b.y = b.ay - SOUL_FLIGHT.enter.y; b.vx = b.vy = 0
    dx = b.ax - b.x; dy = b.ay - b.y; d = Math.hypot(dx, dy)
  }
  const hurry = 1 + Math.min(SOUL_FLIGHT.hurryMax - 1, Math.max(0, d - p.leash) / SOUL_FLIGHT.hurryOver)
  const go = Math.min(p.speed * hurry, d * p.accel), k = Math.min(1, dt * p.accel * 1.5)
  b.vx += ((d > 0.01 ? dx / d : 0) * go - b.vx) * k; b.vy += ((d > 0.01 ? dy / d : 0) * go - b.vy) * k
  b.x += b.vx * dt; b.y += b.vy * dt
  if (b.mode === 'follow' && d < SOUL_FLIGHT.arrive) { b.mode = 'rest'; b.wait = p.react }

  // the pattern opens at the spot and folds away on the way
  const [near, far] = SOUL_FLIGHT.fold
  b.settle += (1 - clamp01((d - near) / (far - near)) - b.settle) * Math.min(1, dt * SOUL_FLIGHT.settle)
  b.phase += dt / Math.max(0.2, p.patternTime)
  const size = p.patternSize, a = b.phase * Math.PI * 2
  let ox = 0, oy = 0
  if (p.pattern === 'circle') { ox = Math.cos(a) * size; oy = Math.sin(a) * size * 0.5 }
  else if (p.pattern === 'eight') { ox = Math.sin(a) * size; oy = Math.sin(a * 2) * size * 0.4 }
  else if (p.pattern === 'sway') ox = Math.sin(a) * size
  else if (p.pattern === 'zigzag') { ox = tri(b.phase) * size; oy = tri(b.phase * 3) * size * 0.3 }
  else if (p.pattern === 'orbit') { ox = Math.cos(a) * p.dist * b.kd; oy = Math.sin(a) * p.dist * b.kd * 0.45 }
  else if (p.pattern === 'hop') {
    // every beat, a hop to the other side of the spot
    if (env.beat !== b.beat) {
      if (!Number.isNaN(b.beat)) { b.hops++; b.hopT = 0; b.hx = (b.hops % 2 ? 1 : -1) * size * (0.5 + rand() * 0.5); b.hy = -rand() * size * 0.7 }
      b.beat = env.beat
    }
    b.hopT += dt
    const e = Math.min(1, dt * SOUL_FLIGHT.hop.ease)
    b.px += (b.hx - b.px) * e; b.py += (b.hy - b.py) * e
    ox = b.px; oy = b.py - (b.hopT < SOUL_FLIGHT.hop.time ? Math.sin((b.hopT / SOUL_FLIGHT.hop.time) * Math.PI) * size * SOUL_FLIGHT.hop.rise : 0)
  } else oy = Math.sin(a) * 4 // still: it only bobs

  // it wanders a little around the spot
  b.wanderIn -= dt
  if (b.wanderIn <= 0) {
    b.wanderIn = 1.2 + rand() * (4 - 2.5 * p.restless)
    const r = p.restless * SOUL_FLIGHT.wander
    b.wtx = (rand() * 2 - 1) * r; b.wty = (rand() * 2 - 1) * r * 0.6
  }
  const w = Math.min(1, dt * 1.5)
  b.wx += (b.wtx - b.wx) * w; b.wy += (b.wty - b.wy) * w

  // now and then, resting, a little loop: up, over and back to where it was
  let lx = 0, ly = 0
  if (b.loop >= 0) {
    b.loop += dt / SOUL_FLIGHT.loop.time
    if (b.loop >= 1) { b.loop = -1; b.loopIn = p.loopEvery * (0.75 + rand() * 0.5) }
    else { const la = b.loop * Math.PI * 2; lx = Math.sin(la) * SOUL_FLIGHT.loop.r * me.face; ly = -(1 - Math.cos(la)) * SOUL_FLIGHT.loop.r }
  } else if (p.loopEvery > 0 && b.mode === 'rest' && b.settle > 0.9) {
    b.loopIn -= dt
    if (b.loopIn <= 0) b.loop = 0
  }

  const nx = b.x + (ox + b.wx) * b.settle + lx, ny = b.y + (oy + b.wy) * b.settle + ly
  if (b.loop < 0) {
    const mv = (nx - me.x) / dt
    if (Math.abs(mv) > SOUL_FLIGHT.turn) me.face = mv > 0 ? 1 : -1
    // quiet at its spot, it watches her
    else if (b.mode === 'rest' && Math.abs(owner.x - nx) > 12) me.face = owner.x > nx ? 1 : -1
  }
  me.x = nx; me.y = ny
}

// An errand: the soul leaves its spot and flies straight to a point at `speed` px/s (no pattern, no wandering; it
// faces where it goes). Returns how far from the point it still is. Its next soulFollowStep takes it back to its spot.
export function soulErrandStep(b: SoulBrain, me: SoulFlyer, to: { x: number; y: number }, speed: number, dt: number): number {
  // from where it is drawn: its pattern folds away at once
  b.x = me.x; b.y = me.y; b.settle = 0; b.loop = -1; b.mode = 'follow'; b.wait = 0
  const dx = to.x - b.x, dy = to.y - b.y, d = Math.hypot(dx, dy)
  if (dt <= 0 || d < 0.01) return d
  const go = Math.min(d, speed * dt)
  b.x += (dx / d) * go; b.y += (dy / d) * go; b.vx = (dx / d) * speed; b.vy = (dy / d) * speed
  if (Math.abs(dx) > 2) me.face = dx > 0 ? 1 : -1
  me.x = b.x; me.y = b.y
  return d - go
}
