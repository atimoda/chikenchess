// The melee blow (Golpe), as a pose over time. A swing goes through four phases, as fractions of the item's
// meleeTime: preparação (the wing winds back), golpe (a very fast sweep, the only moment it hits), continuação
// (it carries on past the end of the arc and slows down) and recuperação (the wing goes back to rest).
// Blows in a row alternate: down, up, horizontal (a flattened ellipse around her) and a full spin on the 4th.
// Pure functions: combat keeps the swing, the Parquinho draws its air trail, the rig turns the wing.

const DEG = Math.PI / 180

export type SwingKind = 'down' | 'up' | 'flat' | 'spin'
export type SwingPhase = 'prep' | 'strike' | 'follow' | 'recover' | 'done'
export const SWING_KINDS: { value: SwingKind; label: string }[] = [
  { value: 'down', label: 'Para baixo' }, { value: 'up', label: 'Para cima' }, { value: 'flat', label: 'Horizontal' }, { value: 'spin', label: 'Giro 360°' },
]
// the default order of a combo (each item can have its own, up to COMBO_MAX blows)
export const SWING_COMBO: SwingKind[] = ['down', 'up', 'flat', 'spin']
export const COMBO_MAX = 6
// one blow of a combo: its direction and the hit area's arc (degrees; the spin always 360)
export type ComboStep = { kind: SwingKind; arc: number }
export const COMBO_ARC_MIN = 20
export const COMBO_ARC_MAX = 360
// the arcs the combo's angle list offers (a saved arc outside it is shown too)
export const COMBO_ARCS = [20, 30, 45, 60, 90, 110, 120, 135, 150, 160, 170, 180, 190, 200, 225, 240, 270, 300, 330, 360]
// the default combo with the arcs of the blows down, up and horizontal
export function swingCombo(down: number, up = down, flat = up): ComboStep[] {
  const arcs: Record<SwingKind, number> = { down, up, flat, spin: 360 }
  return SWING_COMBO.map(kind => ({ kind, arc: arcs[kind] }))
}
// one blow as it is kept: a known kind and a finite arc, clamped (the spin's is 360); anything else is null
export function comboStep(kind: unknown, arc: unknown): ComboStep | null {
  if (!isSwingKind(kind) || typeof arc !== 'number' || !Number.isFinite(arc)) return null
  return { kind, arc: kind === 'spin' ? 360 : Math.min(COMBO_ARC_MAX, Math.max(COMBO_ARC_MIN, arc)) }
}
// a saved combo, or null when it is not one (empty, more than COMBO_MAX blows, a bad blow). Older saves kept only
// the kinds: arcOf gives each one's arc
export function cleanCombo(v: unknown, arcOf: (kind: SwingKind) => number): ComboStep[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > COMBO_MAX) return null
  const out = v.map(s => typeof s === 'string' ? comboStep(s, isSwingKind(s) ? arcOf(s) : NaN) : s && typeof s === 'object' ? comboStep(s.kind, s.arc) : null)
  return out.every(Boolean) ? out as ComboStep[] : null
}
// fractions of meleeTime; recuperação is what is left (0.40)
export const SWING_PHASES = { prep: 0.25, strike: 0.1, follow: 0.25 }
export const SWING_WINDUP = 18 * DEG // how far the wing winds back before the blow
export const SWING_OVERSHOOT = 13 * DEG // how far it carries on past the arc
export const SWING_FLAT = 0.3 // the horizontal blow's ellipse: its height over its width
export const COMBO_WINDOW = 0.45 // default s after a blow ends in which the next one carries on the combo

// the swing's state as combat keeps it. angle: the aim when it started; arc: the hit area's arc; range: the wing's
// reach; reach: wing plus the item (the hit area and the trail's radius); dir: 1 = clockwise on screen; time: the
// whole move (meleeTime); life: until the trail is gone (s); hitAt: when the blow lands (s)
export type Swing = {
  angle: number; arc: number; range: number; reach: number; t: number; time: number; wing: boolean; dir: number
  kind: SwingKind; combo: number; hitAt: number; hit: boolean; hits: number; life: number
  // the air trail: thickness at the tip (px), colour, how long it takes to dissolve (s), little curls, opacity
  trail: { width: number; color: string; time: number; wisps: number; opacity: number }
  // where it hit, relative to the shoulder (for the impact flash)
  impacts: { x: number; y: number }[]
  seed: number
  // what it hits with: the item in the wing (it wears out), damage, knockback (px/s), whether it can break, its name
  item: unknown; damage: number; push: number; durability: boolean; name: string
  // the strong blow (a staff's Atirar, let go after charging): how much of the charge it left with (0..1) and how
  // much bigger the staff is drawn while it sweeps (×, 1 = its own size)
  heavy?: boolean; charge?: number; size?: number
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (k: number) => 1 - (1 - k) * (1 - k)
const easeInOut = (k: number) => k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)

// the next blow of a combo (its place in the order): within the window it carries on, after a longer pause it
// starts over
export function nextCombo(prev: number, gap: number, window: number, length: number) {
  return gap <= window ? (prev + 1) % Math.max(1, length) : 0
}
export const isSwingKind = (v: unknown): v is SwingKind => SWING_KINDS.some(k => k.value === v)

export function swingHitAt(time: number) { return time * SWING_PHASES.prep }

// the whole sweep of a kind (radians): the spin goes all the way round; the horizontal blow covers at least a half turn
export function swingSweep(kind: SwingKind, arc: number) {
  if (kind === 'spin') return Math.PI * 2
  if (kind === 'flat') return Math.max(arc, 200 * DEG)
  return arc
}

export function swingPhase(t: number, time: number): { phase: SwingPhase; k: number } {
  const p = SWING_PHASES
  const a = time * p.prep, b = a + time * p.strike, c = b + time * p.follow
  if (t < a) return { phase: 'prep', k: clamp01(t / Math.max(1e-6, a)) }
  if (t < b) return { phase: 'strike', k: clamp01((t - a) / Math.max(1e-6, b - a)) }
  if (t < c) return { phase: 'follow', k: clamp01((t - b) / Math.max(1e-6, c - b)) }
  if (t < time) return { phase: 'recover', k: clamp01((t - c) / Math.max(1e-6, time - c)) }
  return { phase: 'done', k: 1 }
}

// how far along the sweep the blow is at t (radians from the start of the arc): negative while winding back,
// the sweep at the end of the golpe, past it in the continuação
export function swingProgress(t: number, time: number, sweep: number) {
  const { phase, k } = swingPhase(t, time)
  if (phase === 'prep') return -SWING_WINDUP * easeOut(k)
  if (phase === 'strike') return -SWING_WINDUP + (sweep + SWING_WINDUP) * k * (0.6 + 0.4 * k)
  if (phase === 'follow') return sweep + SWING_OVERSHOOT * easeOut(k)
  return sweep + SWING_OVERSHOOT
}

// the wing's pose now: the screen angle it points at, how far it reaches (px), how much of the swing pose the rig
// takes over the rest pose (0..1) and, for the horizontal blow, whether it passes behind her
export function swingPose(sw: Pick<Swing, 'angle' | 'arc' | 'dir' | 'kind' | 't' | 'time' | 'range'>) {
  const sweep = swingSweep(sw.kind, sw.arc)
  const { phase, k } = swingPhase(sw.t, sw.time)
  const p = swingProgress(sw.t, sw.time, sweep)
  const blend = phase === 'prep' ? easeOut(k) : phase === 'recover' ? 1 - easeInOut(k) : phase === 'done' ? 0 : 1
  if (sw.kind === 'flat') {
    const e = ellipsePoint(sw.angle, sw.dir, -sweep / 2 + p)
    return { angle: Math.atan2(e.y, e.x), reach: sw.range * Math.hypot(e.x, e.y), blend, phase, behind: e.z < 0 }
  }
  return { angle: sw.angle - sw.dir * sweep / 2 + sw.dir * p, reach: sw.range, blend, phase, behind: false }
}

// a point on the horizontal blow's ellipse (unit radius), phi = 0 at the aim; z < 0: behind her
export function ellipsePoint(aim: number, dir: number, phi: number) {
  const ux = Math.cos(aim), uy = Math.sin(aim), vx = -uy * dir, vy = ux * dir
  const c = Math.cos(phi), s = Math.sin(phi)
  return { x: ux * c + vx * s * SWING_FLAT, y: uy * c + vy * s * SWING_FLAT, z: s }
}

// the trail: the stretch of the sweep the air still shows (radians from the start of the arc). The head follows the
// blow; the tail starts where the golpe started and runs after the head, dissolving from behind in trail.time
export function trailSpan(sw: Pick<Swing, 'arc' | 'kind' | 't' | 'time' | 'hitAt' | 'trail'>) {
  if (sw.t < sw.hitAt) return null
  const sweep = swingSweep(sw.kind, sw.arc)
  const head = Math.max(0, swingProgress(sw.t, sw.time, sweep))
  const age = sw.t - sw.hitAt
  const fade = clamp01(age / Math.max(0.02, sw.trail.time))
  if (fade >= 1) return null
  const tail = head * (fade * fade)
  return { tail, head, fade, sweep }
}

// how long a swing stays: the move itself or until its trail is gone
export function swingLife(time: number, trailTime: number) { return Math.max(time, swingHitAt(time) + trailTime) }
