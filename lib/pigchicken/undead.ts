// Death and the undead. Every alien has two deaths, both on the music's grid: the physical one (its life runs out
// to a blow, a bullet or a throw: a drum by default) and the musical one (its harmony fills up and it becomes a
// bird: a short chord). A physical death leaves an undead behind: grey with red eyes, it falls stiff (gravity,
// bounces that lose speed, a spin) and lies where it fell; after a while it gets up and wanders the floor like a
// robot vacuum, turning at edges and walls. Notes fill its bar again and bring it back as an undead bird. Undead
// are harmless, have their own life (weapons destroy them for good) and she can ride on them. When the music ends
// each one leaves after its own time (or stays for good).
import type { Drum, VoiceId } from './synth'
import type { NoteOut } from './transforms'
import type { BirdId, UndeadMode } from './birds'
import type { PerchState } from './bird-perch'

// ---------- the two deaths ----------

export type DeathSound =
  | { kind: 'drum'; drum: Drum; vel: number }
  | { kind: 'notes'; voice: VoiceId; shape: 'note' | 'chord' | 'arp'; octave: number; vel: number }
export type DeathSounds = { physical: DeathSound; musical: DeathSound }

const drum = (d: Drum, vel = 0.9): DeathSound => ({ kind: 'drum', drum: d, vel })
const BIRD_CHORD: DeathSound = { kind: 'notes', voice: 'bird', shape: 'chord', octave: 1, vel: 0.6 }
// by the alien's species (the temple's and the songs'), the horde's by its own key
export const DEATH_SOUNDS: Record<string, DeathSounds> = {
  horde: { physical: drum('snare'), musical: BIRD_CHORD },
  jelly: { physical: drum('wood'), musical: { kind: 'notes', voice: 'bells', shape: 'arp', octave: 1, vel: 0.5 } },
  lantern: { physical: drum('clap'), musical: { kind: 'notes', voice: 'flute', shape: 'note', octave: 1, vel: 0.6 } },
  shell: { physical: drum('taiko'), musical: BIRD_CHORD },
  twin: { physical: drum('snare'), musical: { kind: 'notes', voice: 'bird', shape: 'arp', octave: 1, vel: 0.55 } },
  mini: { physical: drum('hat', 0.8), musical: { kind: 'notes', voice: 'bird', shape: 'note', octave: 2, vel: 0.5 } },
  drum: { physical: drum('taiko', 1), musical: BIRD_CHORD },
  dragon: { physical: drum('crash', 0.7), musical: BIRD_CHORD },
  dragonHead: { physical: drum('crash', 1), musical: BIRD_CHORD },
}
export function deathSoundsFor(data: unknown): DeathSounds {
  const d = data as { kind?: string; species?: string; death?: DeathSounds } | undefined
  // an alien of the catalogue carries its own
  if (d?.death?.physical && d.death.musical) return d.death
  return (d?.kind === 'temple' && d.species && DEATH_SOUNDS[d.species]) || DEATH_SOUNDS.horde
}

// what a death plays over the chord now (times from the grid)
export function deathNotes(s: DeathSound, chord: number[], spb: number): NoteOut[] {
  if (s.kind === 'drum') return [{ midi: 0, at: 0, dur: 0.2, vel: s.vel, drum: s.drum }]
  const up = chord.map(m => m + 12 * s.octave)
  const notes = s.shape === 'note' ? up.slice(0, 1) : up
  return notes.map((midi, i) => ({ midi, at: s.shape === 'arp' ? i * spb / 4 : i * 0.02, dur: s.shape === 'arp' ? spb / 4 : 0.15, vel: s.vel, voice: s.voice }))
}

// ---------- the undead ----------

export type UndeadParams = {
  riseMin: number; riseMax: number // s lying down before it gets up
  walkSpeed: number // px/s
  leaveMin: number; leaveMax: number // s after the music ends before it leaves (Infinity: it stays)
  mode: UndeadMode // how its bird's notes darken
  bird: BirdId | null // the bird it comes back as (null: one of the place's)
}
export const UNDEAD_DEFAULTS: UndeadParams = { riseMin: 1, riseMax: 50, walkSpeed: 55, leaveMin: 0, leaveMax: 60, mode: 'parallel', bird: null }
// at most this many at once: the oldest leaves when another one would come
export const UNDEAD_MAX = 40
export const UNDEAD_GRAVITY = 1500

export type UndeadPhase = 'fall' | 'down' | 'rise' | 'walk' | 'bird' | 'leave'
export type UndeadState = {
  kind: 'undead'
  look: unknown // the alien's own data, for its drawing
  phase: UndeadPhase
  t: number // s in this phase
  vx: number; vy: number
  angle: number; spin: number // radians: it falls stiff, turning
  riseIn: number // s until it gets up
  dir: 1 | -1
  eye: string // red, or the colour of the note that brought it back
  bird: BirdId | null // set once it is a bird
  homeX: number; homeY: number // where a bird circles
  leaveIn: number | null // s until it leaves (null: the music is still playing)
  whistleIn: number // a bird's next whistle (s)
  perch?: PerchState | null // resting on a wire (lib/pigchicken/bird-perch.ts); null: it already tried
  params: UndeadParams
  born: number // order of arrival (the oldest leaves first)
}

type Box = { l: number; t: number; r: number; b: number; solid?: boolean; occludedAt?: (x: number, y: number) => boolean }
export type UndeadBody = { x: number; y: number; w: number; h: number; hp: number; deadT: number; flash: number; face: number }
export type UndeadEnv = { boxes: Box[]; groundY: number; viewL: number; viewR: number; playing: boolean; rand: () => number }

const solidBox = (b: Box) => b.solid !== false
const between = (rand: () => number, a: number, b: number) => (Number.isFinite(b) ? a + rand() * Math.max(0, b - a) : Infinity)

export function newUndead(look: unknown, vx: number, vy: number, params: UndeadParams, born: number, rand: () => number): UndeadState {
  return {
    kind: 'undead', look, phase: 'fall', t: 0, vx, vy, angle: 0, spin: (rand() < 0.5 ? -1 : 1) * (3 + rand() * 4),
    riseIn: between(rand, params.riseMin, params.riseMax), dir: rand() < 0.5 ? -1 : 1, eye: '#ff3b3b', bird: null,
    homeX: 0, homeY: 0, leaveIn: null, whistleIn: 0, params, born,
  }
}

// lying on its side, its height is its width
export const lying = (u: UndeadState) => Math.abs(Math.sin(u.angle)) > 0.7
export function undeadSize(b: Pick<UndeadBody, 'w' | 'h'>, u: UndeadState) { return lying(u) ? { w: b.h, h: b.w } : { w: b.w, h: b.h } }

// the floor under x, from y down (a solid box's top or the ground)
export function floorUnder(env: Pick<UndeadEnv, 'boxes' | 'groundY'>, x: number, y: number) {
  let best = env.groundY
  for (const b of env.boxes) {
    if (!solidBox(b) || x < b.l || x > b.r || b.t < y - 1 || b.t >= best || b.occludedAt?.(x, b.t)) continue
    best = b.t
  }
  return best
}
const wallAt = (env: UndeadEnv, x: number, y: number) => env.boxes.some(b => solidBox(b) && x > b.l && x < b.r && y > b.t + 2 && y < b.b && !b.occludedAt?.(x, y))

// one step of an undead; false when it is gone (destroyed, or left the view)
export function stepUndead(b: UndeadBody, u: UndeadState, dt: number, env: UndeadEnv): boolean {
  u.t += dt
  b.flash = Math.max(0, b.flash - dt)
  if (b.deadT > 0) { b.deadT -= dt; return b.deadT > 0 }
  // the music: while it plays they stay; once it ends each one counts down its own time
  if (env.playing) u.leaveIn = null
  else if (u.leaveIn === null) u.leaveIn = between(env.rand, u.params.leaveMin, u.params.leaveMax)
  if (u.leaveIn !== null && u.phase !== 'leave' && u.phase !== 'fall') {
    u.leaveIn -= dt
    if (u.leaveIn <= 0) { u.phase = 'leave'; u.t = 0; u.dir = b.x - env.viewL < env.viewR - b.x ? -1 : 1 }
  }
  const gone = b.x < env.viewL - 200 || b.x > env.viewR + 200 || b.y > env.groundY + 600 || b.y < -3400

  // a bird: circles where it came back, flapping; leaving, it flies up and away
  if (u.bird) {
    if (u.phase === 'leave') { b.x += u.dir * 170 * dt; b.y -= 110 * dt; b.face = u.dir; return !gone }
    const a = u.t * 1.3
    const nx = u.homeX + Math.cos(a) * 70, ny = u.homeY + Math.sin(a * 2) * 18
    b.face = nx >= b.x ? 1 : -1
    b.x += (nx - b.x) * Math.min(1, dt * 3); b.y += (ny - b.y) * Math.min(1, dt * 3)
    return true
  }

  // falling stiff: gravity, a spin, bounces that lose speed; it rests lying where it fell
  if (u.phase === 'fall' || (u.phase === 'leave' && u.vy !== 0)) {
    const py = b.y
    u.vy += UNDEAD_GRAVITY * dt
    b.x += u.vx * dt; b.y += u.vy * dt
    u.vx *= Math.pow(0.5, dt)
    if (u.phase === 'fall') u.angle += u.spin * dt
    const floor = floorUnder(env, b.x, py)
    if (u.vy > 0 && b.y >= floor) {
      b.y = floor
      if (u.phase === 'fall' && u.vy > 160) { u.vy = -u.vy * 0.35; u.vx *= 0.6; u.spin *= 0.5 }
      else {
        u.vy = 0; u.vx = 0
        if (u.phase === 'fall') {
          // stiff: it settles on its side or on its back, whichever is nearer
          u.angle = Math.round(u.angle / (Math.PI / 2)) * (Math.PI / 2)
          u.phase = 'down'; u.t = 0
        }
      }
    }
    return !gone
  }
  if (u.phase === 'down') {
    u.riseIn -= dt
    if (u.riseIn <= 0) { u.phase = 'rise'; u.t = 0 }
    return true
  }
  if (u.phase === 'rise') {
    // it straightens up
    const k = Math.min(1, u.t / 0.6)
    u.angle = Math.atan2(Math.sin(u.angle), Math.cos(u.angle)) * (1 - k)
    if (k >= 1) { u.angle = 0; u.phase = 'walk'; u.t = 0 }
    return true
  }

  // walking about (or out, leaving): along the floor, turning at edges, walls and the scene's sides
  const speed = u.params.walkSpeed * (u.phase === 'leave' ? 1.6 : 1)
  const nx = b.x + u.dir * speed * dt
  const front = nx + u.dir * b.w / 2
  const floor = floorUnder(env, front, b.y - 4)
  const edge = Math.abs(floor - b.y) > 6
  const wall = wallAt(env, front, b.y - b.h / 2)
  const side = u.phase !== 'leave' && (front < env.viewL + 10 || front > env.viewR - 10)
  if (wall || side || (edge && u.phase !== 'leave')) {
    u.dir = u.dir === 1 ? -1 : 1
  } else {
    b.x = nx
    // leaving, it walks off the edges and falls
    if (edge) { const f = floorUnder(env, b.x, b.y - 4); if (f > b.y + 6) u.vy = 1 }
    // a robot vacuum: now and then it turns for no reason
    else if (u.phase === 'walk' && env.rand() < dt * 0.08) u.dir = u.dir === 1 ? -1 : 1
  }
  b.face = u.dir
  return !gone
}
