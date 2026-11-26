// The melee blow (Golpe), as a pose over time. A swing goes through four phases, as fractions of the item's
// meleeTime: preparação (the wing winds back), golpe (a very fast sweep, the only moment it hits), continuação
// (it carries on past the end of the arc and slows down) and recuperação (the wing goes back to rest).
// Blows in a row alternate: down, up, horizontal (a flattened ellipse around her) and a full spin on the 4th.
// Pure functions: combat keeps the swing, the Parquinho draws its air trail, the rig turns the wing.

import { msg } from '../i18n'
const DEG = Math.PI / 180

export type SwingKind = 'down' | 'up' | 'flat' | 'spin'
export type SwingPhase = 'prep' | 'strike' | 'follow' | 'recover' | 'done'
// what a blow is set to: one of the moves, or "relative to the aim" (up when she aims above the horizon, down otherwise)
export type BlowKind = SwingKind | 'aim'
export const SWING_KINDS: { value: BlowKind; label: string }[] = [
  { value: 'down', label: msg("Para baixo") }, { value: 'up', label: msg("Para cima") }, { value: 'flat', label: msg("Horizontal") }, { value: 'spin', label: msg("Giro 360°") },
  { value: 'aim', label: msg("Relativo à mira") },
]
// the move a blow makes with this aim (screen angle, y down: a negative sine points above the horizon)
export function blowKind(kind: BlowKind, aim: number): SwingKind {
  return kind === 'aim' ? (Math.sin(aim) < -1e-9 ? 'up' : 'down') : kind
}
// the default order of a combo (each item can have its own, up to COMBO_MAX blows)
export const SWING_COMBO: SwingKind[] = ['down', 'up', 'flat', 'spin']
export const COMBO_MAX = 6
// one blow of a combo: its direction, the hit area's arc (degrees; the spin always 360), how long it takes (× the
// item's meleeTime), for how long after it starts the next blow is blocked (s) and how far it reaches (× the item's)
export type ComboStep = { kind: BlowKind; arc: number; time: number; cooldown: number; reach: number }
export const COMBO_ARC_MIN = 20
export const COMBO_ARC_MAX = 360
// the values the combo's lists offer (a saved one outside them is shown too) and the limits a saved one is kept in
export const COMBO_TIMES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4]
export const COMBO_COOLDOWNS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.75, 1, 1.5, 2]
export const COMBO_REACHES = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3]
const COMBO_LIMITS = { time: [0.25, 4], cooldown: [0, 3], reach: [0.25, 3] } as const
// a blow with the plain numbers: the item's own duration and reach, no block
export const comboBlow = (kind: BlowKind, arc: number): ComboStep => ({ kind, arc: kind === 'spin' ? 360 : arc, time: 1, cooldown: 0, reach: 1 })
// the default combo with the arcs of the blows down, up and horizontal
export function swingCombo(down: number, up = down, flat = up): ComboStep[] {
  const arcs: Record<SwingKind, number> = { down, up, flat, spin: 360 }
  return SWING_COMBO.map(kind => comboBlow(kind, arcs[kind]))
}
// one blow as it is kept: a known kind and a finite arc, clamped (the spin's is 360); anything else is null. The
// duration, block and reach are clamped too; one saved before they existed (or not a number) gets the plain value
export function comboStep(kind: unknown, arc: unknown, more: { time?: unknown; cooldown?: unknown; reach?: unknown } = {}): ComboStep | null {
  if (!isSwingKind(kind) || typeof arc !== 'number' || !Number.isFinite(arc)) return null
  const plain = comboBlow(kind, Math.min(COMBO_ARC_MAX, Math.max(COMBO_ARC_MIN, arc)))
  for (const k of ['time', 'cooldown', 'reach'] as const) {
    const v = more[k]
    if (typeof v === 'number' && Number.isFinite(v)) plain[k] = Math.min(COMBO_LIMITS[k][1], Math.max(COMBO_LIMITS[k][0], v))
  }
  return plain
}
// a saved combo, or null when it is not one (empty, more than COMBO_MAX blows, a bad blow). Older saves kept only
// the kinds: arcOf gives each one's arc
export function cleanCombo(v: unknown, arcOf: (kind: BlowKind) => number): ComboStep[] | null {
  if (!Array.isArray(v) || v.length < 1 || v.length > COMBO_MAX) return null
  const out = v.map(s => typeof s === 'string' ? comboStep(s, isSwingKind(s) ? arcOf(s) : NaN) : s && typeof s === 'object' ? comboStep(s.kind, s.arc, s) : null)
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
  // where it hit, relative to the shoulder (for the impact flash); t: when (s), on a Golpe desenhado that hits as it goes
  impacts: { x: number; y: number; t?: number }[]
  seed: number
  // what it hits with: the item in the wing (it wears out), damage, knockback (px/s), whether it can break, its name
  item: unknown; damage: number; push: number; durability: boolean; name: string
  // the strong blow (a staff's Atirar, let go after charging): how much of the charge it left with (0..1) and how
  // much bigger the staff is drawn while it sweeps (×, 1 = its own size)
  heavy?: boolean; charge?: number; size?: number
  // the Golpe desenhado: the move as it was drawn (the wing follows it and hits what it passes, when it passes),
  // what it already hit, the instrument's note it is on (null: none yet) and when it last hit something (s)
  path?: SwingPath; struck?: Set<unknown>; note?: number | null; lastHit?: number
}

// ---------- Golpe desenhado ----------
// The mouse's right button or the touch Punch dragged around her: while held, the pointer's angle around her is
// recorded; when let go, the wing makes that same move, at the same speed. t: s from the start; a: radians,
// unwrapped (a turn and a half is 3π), screen angle (y down)
export type SwingPath = { t: number[]; a: number[] }
export const DRAWN_MIN_SWEEP = 20 * DEG // a drawing that covers less than this is a simple click
export const DRAWN_MAX_TIME = 2 // s: a slower drawing is replayed faster, to fit
export const DRAWN_MIN_TIME = 0.05 // s: a flick is never quicker than this
export const DRAWN_STILL = 2 * DEG // the pointer resting before and after the move does not count as move
export const DRAWN_RECOVER = 0.15 // s for the wing to go back to rest after the move
export const DRAWN_EASE = 0.05 // s for the wing to take the blow's pose at the start

// the samples taken while it was held (t in s, any origin; a in radians, as atan2 gives them): the move, or null
// when it covers less than DRAWN_MIN_SWEEP (a simple click)
export function drawnPath(samples: readonly { t: number; a: number }[]): SwingPath | null {
  if (samples.length < 2) return null
  const a: number[] = [samples[0].a]
  for (let i = 1; i < samples.length; i++) {
    const prev = a[i - 1], d = Math.atan2(Math.sin(samples[i].a - prev), Math.cos(samples[i].a - prev))
    a.push(prev + d)
  }
  let lo = 0, hi = a.length - 1
  while (lo < hi && Math.abs(a[lo + 1] - a[0]) <= DRAWN_STILL) lo++
  while (hi > lo && Math.abs(a[hi - 1] - a[a.length - 1]) <= DRAWN_STILL) hi--
  const as = a.slice(lo, hi + 1), ts = samples.slice(lo, hi + 1).map(s => s.t)
  if (as.length < 2 || Math.max(...as) - Math.min(...as) < DRAWN_MIN_SWEEP) return null
  const span = ts[ts.length - 1] - ts[0]
  const k = span > DRAWN_MAX_TIME ? DRAWN_MAX_TIME / span : span < DRAWN_MIN_TIME ? DRAWN_MIN_TIME / Math.max(1e-6, span) : 1
  // (samples at the same instant are spread a little, so the move always goes forward in time)
  const t: number[] = []
  ts.forEach((v, i) => t.push(Math.max((v - ts[0]) * k, i ? t[i - 1] + 1e-4 : 0)))
  return { t, a: as }
}
export const pathEnd = (p: SwingPath) => p.t[p.t.length - 1]
// the drawn angle at t (s from the start), held at the ends
export function pathAngle(p: SwingPath, t: number) {
  if (t <= 0) return p.a[0]
  const n = p.t.length - 1
  if (t >= p.t[n]) return p.a[n]
  let i = 1
  while (p.t[i] < t) i++
  const k = (t - p.t[i - 1]) / Math.max(1e-6, p.t[i] - p.t[i - 1])
  return p.a[i - 1] + (p.a[i] - p.a[i - 1]) * k
}
// the lowest and highest angle the move passes between t0 and t1
export function pathSpan(p: SwingPath, t0: number, t1: number) {
  let lo = Math.min(pathAngle(p, t0), pathAngle(p, t1)), hi = Math.max(pathAngle(p, t0), pathAngle(p, t1))
  for (let i = 0; i < p.t.length; i++) if (p.t[i] > t0 && p.t[i] < t1) { lo = Math.min(lo, p.a[i]); hi = Math.max(hi, p.a[i]) }
  return { lo, hi }
}
// the drawn trail: the angles the air shows, from the tail to the head, and how far it has faded (0..1). The whole
// drawing up to the wing stays while it moves; once the move ends it dissolves from the tail in trail.time
export function pathTrail(sw: Pick<Swing, 't' | 'trail'> & { path: SwingPath }) {
  const end = pathEnd(sw.path), head = Math.min(sw.t, end)
  const fade = sw.t <= end ? 0 : clamp01((sw.t - end) / Math.max(0.05, sw.trail.time))
  if (fade >= 1) return null
  const tail = end * fade * fade
  if (tail >= head) return null
  return { angles: pathAngles(sw.path, tail, head), fade }
}
// the drawn angles between two instants, at most `step` radians apart (every turn the drawing made in between too)
export function pathAngles(p: SwingPath, t0: number, t1: number, step = 0.06) {
  const stops = [t0, ...p.t.filter(t => t > t0 && t < t1), t1], out: number[] = [pathAngle(p, t0)]
  for (let i = 1; i < stops.length; i++) {
    const a = pathAngle(p, stops[i - 1]), b = pathAngle(p, stops[i]), n = Math.max(1, Math.ceil(Math.abs(b - a) / step))
    for (let j = 1; j <= n; j++) out.push(a + (b - a) * j / n)
  }
  return out
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (k: number) => 1 - (1 - k) * (1 - k)
const easeInOut = (k: number) => k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)

// the next blow of a combo (its place in the order): within the window it carries on, after a longer pause it
// starts over
export function nextCombo(prev: number, gap: number, window: number, length: number) {
  return gap <= window ? (prev + 1) % Math.max(1, length) : 0
}
export const isSwingKind = (v: unknown): v is BlowKind => SWING_KINDS.some(k => k.value === v)

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
export function swingPose(sw: Pick<Swing, 'angle' | 'arc' | 'dir' | 'kind' | 't' | 'time' | 'range' | 'path'>) {
  // the Golpe desenhado: the wing on the drawing, taking the pose at once and going back to rest after it
  if (sw.path) {
    const end = pathEnd(sw.path), k = clamp01((sw.t - end) / Math.max(1e-6, sw.time - end))
    const blend = sw.t >= sw.time ? 0 : sw.t <= end ? easeOut(clamp01(sw.t / DRAWN_EASE)) : 1 - easeInOut(k)
    const phase: SwingPhase = sw.t >= sw.time ? 'done' : sw.t <= end ? 'strike' : 'recover'
    return { angle: pathAngle(sw.path, sw.t), reach: sw.range, blend, phase, behind: false }
  }
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

// A blow of the main player's combo, told to whoever listens (the Itens panel's combo window bar). Nothing is sent
// while nobody listens. busy: how long until the window starts counting (the move and the block, s); window: s
export type ComboBlowEvent = { busy: number; window: number }
const comboListeners = new Set<(e: ComboBlowEvent) => void>()
export function announceComboBlow(e: () => ComboBlowEvent) { if (comboListeners.size) { const v = e(); comboListeners.forEach(fn => fn(v)) } }
export function subscribeComboBlow(fn: (e: ComboBlowEvent) => void) { comboListeners.add(fn); return () => { comboListeners.delete(fn) } }
