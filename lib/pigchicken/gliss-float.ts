// Notas do glissando (Carga em glissando, the Harpa de Lira's): each note the charge plays leaves the instrument as a
// small note that floats round her, sinking slowly, until Atirar is let go; then they all fly where the main note
// goes, side by side with it. How far the aim is from her inside the scale fan sets the main note's speed (and, by
// Volume pela distância, its loudness). Pure maths: no sound, no drawing, no combat state.

const DEG = Math.PI / 180

export const FLOAT_SIZE = 0.55 // a floating note's size, of the item's
export const FLOAT_DAMAGE = 0.2 // a floating note's damage once launched, of the main note's
export const FLOAT_SPEED = 0.9 // its speed once launched, of the main note's (±FLOAT_SPEED_VARY)
export const FLOAT_SPEED_VARY = 0.06
export const FLOAT_JITTER = 4 // degrees off the main note's direction, at most
export const FLOAT_RADIUS = 170 // px from her shoulder (times her size: 85 px at the usual 0.5)
export const FLOAT_FALL = 32 // px/s it sinks while floating (times her size)
export const FLOAT_DROP = 140 // px it sinks at most (times her size)
export const FLOAT_EASE = 5 // 1/s: how fast it gets to its spot from where it was born
export const FLOAT_MAX = 7 // floating notes per player (the glissando's own limit)
export const REACH_SPEED_MIN = 0.3 // the main note's speed with the aim on her, of the item's (at the fan's edge: all)

// spots round her, from straight up: alternately to one side and the other, opening downwards
const SPOTS = [-28, 28, -64, 64, -102, 102, 180]

// a floating note: its number in the glissando, its offset from her shoulder now, its velocity (px/s, for the trail),
// its seconds afloat and its own sway (0..1)
export type GlissFloat = { k: number; dx: number; dy: number; vx: number; vy: number; t: number; seed: number }

export function newFloat(k: number, dx: number, dy: number, seed: number): GlissFloat {
  return { k, dx, dy, vx: 0, vy: 0, t: 0, seed }
}

// where the k-th note floats `t` s after it was born (offset from her shoulder): its spot round her, sinking slowly
// (down to FLOAT_DROP) and swaying a little
export function floatHome(k: number, t: number, seed: number, scale = 1) {
  const off = SPOTS[((k % SPOTS.length) + SPOTS.length) % SPOTS.length] * DEG
  const r = FLOAT_RADIUS * (0.9 + 0.2 * seed) * scale
  const sink = Math.min(FLOAT_DROP, FLOAT_FALL * Math.max(0, t)) * scale
  return {
    x: Math.sin(off) * r + Math.sin(t * 1.7 + seed * 6.3) * 12 * scale,
    y: -Math.cos(off) * r + sink + Math.cos(t * 1.3 + seed * 4.1) * 8 * scale,
  }
}

// one step afloat: it eases toward its spot (which sinks with time)
export function stepFloat(f: GlissFloat, dt: number, scale = 1): GlissFloat {
  if (!(dt > 0)) return f
  f.t += dt
  const home = floatHome(f.k, f.t, f.seed, scale), e = 1 - Math.exp(-FLOAT_EASE * dt)
  const nx = f.dx + (home.x - f.dx) * e, ny = f.dy + (home.y - f.dy) * e
  f.vx = (nx - f.dx) / dt; f.vy = (ny - f.dy) / dt
  f.dx = nx; f.dy = ny
  return f
}

// its velocity when Atirar is let go: along the main note's direction (a few degrees off) at about its speed
export function launchVelocity(angle: number, speed: number, seed: number) {
  const a = angle + (seed * 2 - 1) * FLOAT_JITTER * DEG
  const s = speed * (FLOAT_SPEED + (seed * 2 - 1) * FLOAT_SPEED_VARY)
  return { vx: Math.cos(a) * s, vy: Math.sin(a) * s }
}

// the main note's speed factor for the aim's reach (0 on her .. 1 at the fan's edge or beyond)
export function reachSpeed(reach: number): number {
  const r = Number.isFinite(reach) ? Math.max(0, Math.min(1, reach)) : 1
  return REACH_SPEED_MIN + (1 - REACH_SPEED_MIN) * r
}

// ---------- the leque's rungs (Escala primária) ----------
// each lane of the leque is cut in GLISS_RUNGS rungs from RUNG_FROM of its radius out to its edge (inside RUNG_FROM:
// the first). Rung k plays the lane's note walked 2k steps up its pitch set: the arpeggio of that lane's degree
// (1, 3, 5, 7 on the zone's scale), so dragging the aim in or out inside a lane changes the note without turning it
export const GLISS_RUNGS = 4
export const RUNG_FROM = 0.3
export function rungAt(reach: number): number {
  const r = Number.isFinite(reach) ? reach : 1
  return Math.max(0, Math.min(GLISS_RUNGS - 1, Math.floor((r - RUNG_FROM) / (1 - RUNG_FROM) * GLISS_RUNGS)))
}
/** The steps up the pitch set that rung plays over the lane's note. */
export const rungStep = (reach: number) => 2 * rungAt(reach)
/** Where rung k begins (k = 1..GLISS_RUNGS-1), in the fan's radius. */
export const rungEdge = (k: number) => RUNG_FROM + (1 - RUNG_FROM) * k / GLISS_RUNGS
