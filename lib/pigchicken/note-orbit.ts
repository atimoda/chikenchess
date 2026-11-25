// Notas giratórias (the Hangdrum's spinning notes): a note played on one of the hang's balls goes to that ball and
// spins inside its circle, following her, for a while. Pure: no sound, no drawing, no combat state.
//
// The ball's place: the hang's fields are in units of the Escalas layer's radius, around her shoulder
// (HangScale.layout); `fan` is that layer in the world (combat's setScaleFan). A note that travels chases the ball
// (it moves with her) and starts spinning once it is inside the orbit; one that does not travel is born on it.

// "Giro na bola" (ItemDef.hangSpin): 0 = off (the note goes straight, as always), 1..60 s, then the two last stops
export const SPIN_MAX_S = 60
export const SPIN_NOTE = 61 // as long as the item's Duração da nota
export const SPIN_FOREVER = 62 // ∞: until it hits, is cut or she leaves
// how the slider writes its value
export function spinLabel(v: number): string {
  const s = cleanSpin(v)
  if (s === 0) return 'Desligado'
  if (s === SPIN_NOTE) return 'Duração da nota'
  if (s === SPIN_FOREVER) return '∞'
  return `${s} s`
}
export const cleanSpin = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(SPIN_FOREVER, Math.round(v))) : 0)
// seconds a note spins (0: it does not; Infinity: ∞)
export function spinSeconds(v: number, noteLen: number): number {
  const s = cleanSpin(v)
  if (s === SPIN_FOREVER) return Infinity
  if (s === SPIN_NOTE) return Math.max(0.05, noteLen)
  return s
}

// the orbit's radius, as a share of the ball's; the most notes spinning per player (the oldest leaves); how far her
// layer may jump in one step before the notes count as left behind (a portal, a teleport)
export const ORBIT_FILL = 0.6
export const ORBIT_MAX = 24
export const ORBIT_JUMP = 600

export type Fan = { x: number; y: number; r: number }
// a spinning note. ball: which of the hang's fields (0 = the ding); fx, fy, fr: that field as it was when it was
// played (the layout's units: it keeps its shape even if she changes item, scale or zone); phase: its angle on the
// orbit; speed: radians per second (clockwise on screen); left: seconds it still spins (Infinity: ∞); arrived: it
// is on the orbit (false: still on its way); travel: px/s on the way; at: where her layer was last step
export type Orbit = {
  ball: number; fx: number; fy: number; fr: number; phase: number; speed: number; left: number; arrived: boolean; travel: number
  at?: { x: number; y: number }
}

// the ball's middle and the orbit's radius in the world
export function ballAt(fan: Fan, o: Pick<Orbit, 'fx' | 'fy' | 'fr'>): { x: number; y: number; r: number } {
  return { x: fan.x + o.fx * fan.r, y: fan.y + o.fy * fan.r, r: o.fr * fan.r * ORBIT_FILL }
}

// one turn per beat of the zone's tempo; the ding (bigger and lower) at half that
export function orbitSpeed(bpm: number, ding: boolean): number {
  const beat = 60 / Math.max(20, Math.min(400, Number.isFinite(bpm) ? bpm : 100))
  return ((Math.PI * 2) / beat) * (ding ? 0.5 : 1)
}

// a new spinning note. from: where it leaves (travelling) or the aim's angle on the ball (not travelling)
export function newOrbit(field: { x: number; y: number; r: number }, ball: number, opts: { seconds: number; bpm: number; travel: boolean; speed: number; aim: number }): Orbit {
  return {
    ball, fx: field.x, fy: field.y, fr: field.r, phase: opts.aim, speed: orbitSpeed(opts.bpm, ball === 0), left: opts.seconds,
    arrived: !opts.travel, travel: Math.max(60, opts.speed),
  }
}

// where the note is after `dt`: toward the ball while on its way, on the orbit once there. Returns its new place
// and velocity (for what it hits and the way it faces), or null when its time is over (or her layer jumped away)
export function stepOrbit(o: Orbit, pos: { x: number; y: number }, center: { x: number; y: number; r: number }, dt: number): { x: number; y: number; vx: number; vy: number } | null {
  if (o.at && Math.hypot(center.x - o.at.x, center.y - o.at.y) > ORBIT_JUMP) return null
  o.at = { x: center.x, y: center.y }
  o.left -= dt
  if (!(o.left > 0)) return null
  if (!o.arrived) {
    const dx = center.x - pos.x, dy = center.y - pos.y, d = Math.hypot(dx, dy), step = o.travel * dt
    if (d - step > center.r) {
      const vx = (dx / d) * o.travel, vy = (dy / d) * o.travel
      return { x: pos.x + vx * dt, y: pos.y + vy * dt, vx, vy }
    }
    // in: it takes the orbit where it came in
    o.arrived = true
    o.phase = d > 1e-6 ? Math.atan2(pos.y - center.y, pos.x - center.x) : o.phase
  } else o.phase += o.speed * dt
  const c = Math.cos(o.phase), s = Math.sin(o.phase)
  return { x: center.x + c * center.r, y: center.y + s * center.r, vx: -s * center.r * o.speed, vy: c * center.r * o.speed }
}

// the notes spinning on one ball spread out evenly: each one eases toward its share of the circle, keeping their
// order and the first one's place (phases in radians; returns the new ones, same order)
export function spreadPhases(phases: readonly number[], dt: number, rate = 4): number[] {
  const n = phases.length
  if (n < 2) return phases.slice()
  const TAU = Math.PI * 2, norm = (a: number) => ((a % TAU) + TAU) % TAU
  const order = phases.map((p, i) => ({ p: norm(p), i })).sort((a, b) => a.p - b.p)
  const base = order[0].p, k = Math.min(1, rate * dt), out = phases.slice()
  order.forEach((o, j) => {
    const want = base + (TAU * j) / n
    let diff = norm(want - o.p)
    if (diff > Math.PI) diff -= TAU
    out[o.i] = phases[o.i] + diff * k
  })
  return out
}
