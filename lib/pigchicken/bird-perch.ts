// Bird-souls resting on the wires of the Postes and Torres (lib/pigchicken/power-lines.ts), and running from whoever
// comes near. Pure: the combat keeps one PerchWorld (the wires, the camera, where the players are) and a PerchState
// on each perched bird; perchSeek finds it a free spot, perchStep flies it there, keeps it on the wire (which moves
// with its poles' parallax), slides it along the wire away from a player and, sometimes, takes it to another spot.
// The parameters are per bird type (BirdType.perch), so the soul classes can tune them; fleeFrom is the bare escape
// step, for any bird that is not on a wire.
// Besides the wires, the world holds the other places to land (lib/pigchicken/perch-places.ts): branches and crowns
// of trees, the top of platforms and of some objects, each one a straight line treated like a wire. How much a bird
// likes each kind of place is a parameter too (0: it never lands there). The souls flying free use the same world to
// explore (perchPick, perchHold, perchPoint: lib/pigchicken/soul-roam.ts).
import { spanCurve, spanPoint, type Span } from './power-lines'

export type PerchPlace = 'wire' | 'tree' | 'platform' | 'object'
export const PERCH_PLACES: Record<PerchPlace, string> = { wire: 'Fios', tree: 'Árvores', platform: 'Plataformas', object: 'Objetos' }
// a line a bird can sit on: a wire (no place given) or another place to land
export type PerchLine = Span & { place?: PerchPlace }
// how much each kind of place is liked (0 to 1)
export type PerchLikes = { wires: number; trees: number; platforms: number; objects: number }
const LIKE_KEY: Record<PerchPlace, keyof PerchLikes> = { wire: 'wires', tree: 'trees', platform: 'platforms', object: 'objects' }
export const perchLike = (p: PerchLikes, line: PerchLine) => p[LIKE_KEY[line.place ?? 'wire']]

export type BirdPerchParams = {
  alert: number // px: a player closer than this makes it uneasy (it slides away along the wire)
  flee: number // 0 to 1: how strongly it reacts (how soon, how fast it slides, the chance it flies off)
  fleeSpeed: number // its top speed running away, as a fraction of the chicken's run (always below it)
  cooldown: number // s between two flights from the same wire
  perchChance: number // 0 to 1: the chance it rests on a wire instead of flying off
  perchTime: number // s it stays on the wires (all its flights together) before leaving
  spacing: number // px from the next bird on the same wire
  range: number // px: how far it looks for a wire
  // 0 to 1: how much it likes the wires, the trees, the top of the platforms and of the objects (0: never lands there)
  wires: number; trees: number; platforms: number; objects: number
}
export const BIRD_PERCH_DEFAULTS: BirdPerchParams = { alert: 140, flee: 0.4, fleeSpeed: 0.6, cooldown: 1.5, perchChance: 0.3, perchTime: 10, spacing: 34, range: 1800, wires: 1, trees: 0.8, platforms: 0.3, objects: 0.3 }
export const BIRD_PERCH_RANGES: Record<keyof BirdPerchParams, { min: number; max: number; step: number }> = {
  alert: { min: 0, max: 400, step: 5 }, flee: { min: 0, max: 1, step: 0.05 }, fleeSpeed: { min: 0, max: 1, step: 0.05 },
  cooldown: { min: 0, max: 5, step: 0.1 }, perchChance: { min: 0, max: 1, step: 0.05 }, perchTime: { min: 1, max: 60, step: 1 },
  spacing: { min: 16, max: 120, step: 2 }, range: { min: 200, max: 4000, step: 50 },
  wires: { min: 0, max: 1, step: 0.05 }, trees: { min: 0, max: 1, step: 0.05 }, platforms: { min: 0, max: 1, step: 0.05 }, objects: { min: 0, max: 1, step: 0.05 },
}
export const birdPerchParams = (own?: Partial<BirdPerchParams>): BirdPerchParams => ({ ...BIRD_PERCH_DEFAULTS, ...own })
// the chicken's run in px/s (walkSpeed × runMultiplier of the default params): fleeSpeed is a fraction of it
export const CHICKEN_RUN = 510

// the wires and the camera this frame, the players' middles in world px, and the birds on the wires
// time: s, advanced by the owner each frame (a bird not stepped for a second no longer holds its spot)
// camY: the camera's y from its resting height restY (wires pinned to a backdrop layer slide from the camera at 0)
export type PerchWorld = { spans: PerchLine[]; byId: Map<string, PerchLine>; camX: number; camY: number; restY: number; players: { x: number; y: number }[]; birds: Set<PerchState>; time: number }
export function createPerchWorld(): PerchWorld {
  return { spans: [], byId: new Map(), camX: 0, camY: 0, restY: 0, players: [], birds: new Set(), time: 0 }
}
// spans: the wires; places: the other places to land (perchLines)
export function setPerchSpans(w: PerchWorld, spans: Span[], places: PerchLine[] = []) {
  w.spans = [...spans, ...places]; w.byId = new Map(w.spans.map(s => [s.id, s]))
  // a bird whose wire is gone leaves on its next step
}
// where along a line the birds may sit: a wire keeps its ends free; a short place (a tuft of a tree, the top of a
// chest) holds one bird in its middle
function slotsOf(line: PerchLine, len: number, spacing: number): number[] {
  if (len < spacing * 2) return line.place && line.place !== 'wire' && len >= 12 ? [0.5] : []
  const n = Math.min(60, Math.floor(len / spacing))
  return Array.from({ length: n - 1 }, (_, k) => (k + 1) / n)
}

export type PerchState = {
  span: string; t: number // where on which wire (0 to 1 along it)
  phase: 'fly' | 'sit'
  speed: number // px/s while flying to the spot
  left: number // s it may still stay
  cool: number // s until it may fly off again
  uneasy: number // s a player has been too close
  rolled: boolean // the chance to fly off was rolled for this approach
  flights: number
  seen: number // the world's time it was last stepped
}

// how high above the wire a bird's middle sits (its feet on the wire)
export const PERCH_LIFT = 10

const nearest = (players: { x: number; y: number }[], x: number, y: number) => {
  let best = Infinity, who: { x: number; y: number } | null = null
  for (const p of players) { const d = Math.hypot(p.x - x, p.y - y); if (d < best) { best = d; who = p } }
  return { d: best, who }
}
// a free spot: no other bird on the same wire within `spacing`
function free(w: PerchWorld, self: PerchState | null, span: Span, t: number, len: number, spacing: number) {
  for (const b of w.birds) {
    if (b.seen < w.time - 1) { w.birds.delete(b); continue }
    if (b !== self && b.span === span.id && Math.abs(b.t - t) * len < spacing) return false
  }
  return true
}

// a spot on a wire (or another place it likes) near (x, y): free, inside `range`, and (when running) far from
// `avoid`. null: none.
export function perchSeek(w: PerchWorld, x: number, y: number, p: BirdPerchParams, rand: () => number = Math.random, avoid?: { x: number; y: number }, self: PerchState | null = null): { span: string; t: number } | null {
  const found: { span: string; t: number; d: number }[] = []
  for (const s of w.spans) {
    const like = perchLike(p, s)
    if (like <= 0) continue
    const { len } = spanCurve(s, w.camX, w.camY, w.restY)
    for (const t of slotsOf(s, len, p.spacing)) {
      const at = spanPoint(s, t, w.camX, w.camY, w.restY)
      const d = Math.hypot(at.x - x, at.y - y)
      if (d > p.range) continue
      if (avoid && Math.hypot(at.x - avoid.x, at.y - avoid.y) < p.alert * 1.6) continue
      if (!free(w, self, s, t, len, p.spacing)) continue
      // a place it likes less counts as farther
      found.push({ span: s.id, t, d: d / like })
    }
  }
  if (!found.length) return null
  // one of the nearer ones, not always the nearest (they spread along the wires like notes on a staff)
  found.sort((a, b) => a.d - b.d)
  const pick = found[Math.min(found.length - 1, Math.floor(Math.pow(rand(), 2) * Math.min(found.length, 12)))]
  return { span: pick.span, t: pick.t }
}

// a free spot on a wire inside a box of the world (what the screen shows), away from `avoid`: for a bird scared off
// that goes straight to a wire in sight (only the wires: the other places are not where a scared bird goes). null:
// no wire there has room
export function perchSeekIn(w: PerchWorld, box: { l: number; r: number; t: number; b: number }, p: BirdPerchParams, rand: () => number = Math.random, avoid?: { x: number; y: number }): { span: string; t: number; x: number; y: number } | null {
  const found: { span: string; t: number; x: number; y: number }[] = []
  for (const s of w.spans) {
    if (s.place && s.place !== 'wire') continue
    const { len } = spanCurve(s, w.camX, w.camY, w.restY)
    for (const t of slotsOf(s, len, p.spacing)) {
      const at = spanPoint(s, t, w.camX, w.camY, w.restY)
      if (at.x < box.l || at.x > box.r || at.y < box.t || at.y > box.b) continue
      if (avoid && Math.hypot(at.x - avoid.x, at.y - avoid.y) < p.alert * 1.6) continue
      if (!free(w, null, s, t, len, p.spacing)) continue
      found.push({ span: s.id, t, x: at.x, y: at.y - PERCH_LIFT })
    }
  }
  return found.length ? found[Math.min(found.length - 1, Math.floor(rand() * found.length))] : null
}

// ---------- for the souls that explore (lib/pigchicken/soul-roam.ts) ----------
// a free spot within `range` of (x, y), any of them, the liked places more often; `not`: the line it is leaving. null:
// nowhere to land there
export function perchPick(w: PerchWorld, x: number, y: number, range: number, likes: PerchLikes, spacing: number, rand: () => number = Math.random, not?: string): { span: string; t: number } | null {
  const found: { span: string; t: number; k: number }[] = []
  let total = 0
  for (const s of w.spans) {
    const like = perchLike(likes, s)
    if (like <= 0 || s.id === not) continue
    const { a, b, len } = spanCurve(s, w.camX, w.camY, w.restY)
    // the whole line is out of reach
    if (Math.min(a.x, b.x) - x > range || x - Math.max(a.x, b.x) > range) continue
    const slots = slotsOf(s, len, spacing)
    for (const t of slots) {
      const at = spanPoint(s, t, w.camX, w.camY, w.restY)
      if (Math.hypot(at.x - x, at.y - y) > range || !free(w, null, s, t, len, spacing)) continue
      // a long wire has many spots and a tuft has one: each line weighs about the same
      const k = like / Math.sqrt(slots.length)
      found.push({ span: s.id, t, k }); total += k
    }
  }
  if (!found.length) return null
  let at = rand() * total
  for (const f of found) { at -= f.k; if (at <= 0) return { span: f.span, t: f.t } }
  const last = found[found.length - 1]
  return { span: last.span, t: last.t }
}
// keeps a spot for something that is not stepped by perchStep (a soul): call perchTouch every frame while it holds it
export function perchHold(w: PerchWorld, spot: { span: string; t: number }): PerchState {
  const st: PerchState = { span: spot.span, t: spot.t, phase: 'fly', speed: 0, left: Infinity, cool: 0, uneasy: 0, rolled: false, flights: 0, seen: w.time }
  w.birds.add(st)
  return st
}
export const perchTouch = (w: PerchWorld, st: PerchState) => { st.seen = w.time; w.birds.add(st) }
// where a held spot is now (the middle of a bird sitting there); null: its line is gone
export function perchPoint(w: PerchWorld, st: { span: string; t: number }): { x: number; y: number } | null {
  const span = w.byId.get(st.span)
  if (!span) return null
  const at = spanPoint(span, st.t, w.camX, w.camY, w.restY)
  return { x: at.x, y: at.y - PERCH_LIFT }
}
// a bird put straight on a wire (it flew there some other way): it sits from now on
export function perchSit(w: PerchWorld, spot: { span: string; t: number }, p: BirdPerchParams, rand: () => number = Math.random): PerchState {
  const st: PerchState = { span: spot.span, t: spot.t, phase: 'sit', speed: 240, left: p.perchTime * (0.75 + rand() * 0.5), cool: p.cooldown, uneasy: 0, rolled: false, flights: 0, seen: w.time }
  w.birds.add(st)
  return st
}

// starts a bird toward a wire (or null when there is no free spot): call perchStep every frame after it
export function perchStart(w: PerchWorld, x: number, y: number, p: BirdPerchParams, rand: () => number = Math.random): PerchState | null {
  const spot = perchSeek(w, x, y, p, rand)
  if (!spot) return null
  const st: PerchState = { ...spot, phase: 'fly', speed: 240, left: p.perchTime * (0.75 + rand() * 0.5), cool: 0, uneasy: 0, rolled: false, flights: 0, seen: w.time }
  w.birds.add(st)
  return st
}
export const perchEnd = (w: PerchWorld, st: PerchState) => { w.birds.delete(st) }

// the bare escape: a velocity away from `threat` (px/s), stronger the closer it is; zero outside the alert radius
export function fleeFrom(x: number, y: number, threat: { x: number; y: number }, p: BirdPerchParams, run = CHICKEN_RUN) {
  const dx = x - threat.x, dy = y - threat.y, d = Math.hypot(dx, dy)
  if (d >= p.alert || p.alert <= 0) return { vx: 0, vy: 0 }
  const k = (1 - d / p.alert) * (0.25 + 0.75 * p.flee) * p.fleeSpeed * run
  return { vx: (dx / (d || 1)) * k, vy: (dy / (d || 1)) * k - k * 0.3 }
}

// one frame of a bird on its way to (or sitting on) a wire; moves `pos`. 'done': it leaves (let it fly away).
export function perchStep(w: PerchWorld, st: PerchState, pos: { x: number; y: number; face: number }, dt: number, p: BirdPerchParams, rand: () => number = Math.random, run = CHICKEN_RUN): 'fly' | 'sit' | 'done' {
  const span = w.byId.get(st.span)
  st.left -= dt; st.seen = w.time
  if (!span || st.left <= 0) { perchEnd(w, st); return 'done' }
  const at = spanPoint(span, st.t, w.camX, w.camY, w.restY)
  const tx = at.x, ty = at.y - PERCH_LIFT
  if (st.phase === 'fly') {
    const dx = tx - pos.x, dy = ty - pos.y, d = Math.hypot(dx, dy), step = st.speed * dt
    if (Math.abs(dx) > 2) pos.face = dx > 0 ? 1 : -1
    if (d <= step + 1) { pos.x = tx; pos.y = ty; st.phase = 'sit'; return 'sit' }
    // a soft arc: a little higher in the middle of the way
    pos.x += (dx / d) * step; pos.y += (dy / d) * step - Math.min(d, 200) * 0.6 * dt
    return 'fly'
  }
  pos.x = tx; pos.y = ty
  st.cool = Math.max(0, st.cool - dt)
  const { d, who } = nearest(w.players, tx, ty)
  if (!who || d >= p.alert || p.alert <= 0) { st.uneasy = 0; st.rolled = false; return 'sit' }
  // it notices after a moment (sooner when it is skittish)
  st.uneasy += dt
  if (st.uneasy < 0.45 - 0.35 * p.flee) return 'sit'
  // too close: it may fly to another spot away from the player (once per approach, after its cooldown)
  if (d < p.alert * 0.6 && st.cool <= 0 && !st.rolled) {
    st.rolled = true
    if (rand() < p.flee) {
      const spot = perchSeek(w, tx, ty, p, rand, who, st)
      if (!spot || st.flights >= 4) { perchEnd(w, st); return 'done' }
      st.span = spot.span; st.t = spot.t; st.phase = 'fly'; st.flights++; st.cool = p.cooldown
      st.speed = Math.max(80, p.fleeSpeed * run)
      return 'fly'
    }
  }
  // else it sidesteps along the wire, away from the player (and from the bird next to it)
  const { len } = spanCurve(span, w.camX, w.camY, w.restY)
  const ahead = spanPoint(span, Math.min(1, st.t + 0.01), w.camX, w.camY, w.restY)
  const away = Math.sign((ahead.x - tx) * (tx - who.x)) || 1
  const speed = p.fleeSpeed * run * (0.12 + 0.3 * p.flee) * (1 - d / p.alert)
  const next = Math.max(0.04, Math.min(0.96, st.t + (away * speed * dt) / Math.max(1, len)))
  if (free(w, st, span, next, len, p.spacing * 0.8)) { st.t = next; pos.face = away * Math.sign(ahead.x - tx || 1) }
  return 'sit'
}
