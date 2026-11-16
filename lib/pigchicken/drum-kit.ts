// Bateria (instrumento fixo: lib/pigchicken/fixed-instruments.ts): the acoustic kit's pieces, where each one sits on
// the chart around the player (the "escala Bateria": big round buttons, like the Hangdrum's notes), the shortcuts of
// each piece and how it is played. Pure rules, no sound and no drawing; the Pátio's combat plays what comes out of
// here (lib/pigchicken/combat.ts) and the sound is in lib/pigchicken/drum-synth.ts.
//   baquetas: each gamepad stick is a drumstick of its own. Leaving its rest it hits the first piece it finds and,
//     moving on, every piece it goes into, at once (no Atirar). The two never interfere with each other. The pieces
//     "behind" the others (the Ataque and the China) are out of the sticks' reach.
//   toques: a click or a finger on a piece hits it once. Between the pieces (inside the chart) it knocks on the
//     kit's hardware instead: a rim, the sticks, a shell, a stand… one of DRUM_KNOCKS, drawn at random each time.
//   atalhos: each piece has its keys and buttons. A plain one hits on the press. A gamepad's analog trigger
//     (LT, RT) knows how deep it is: a sudden pull hits, harder the faster it is pulled; on the Caixa a slow move
//     rolls (the rufo), louder the deeper; on the Chimbal aberto the depth is how far the pedal opens.
//   chimbal: one piece, two sounds. Closed by default; open while "Chimbal aberto" is held, as far as its trigger
//     is pulled. Any hit on the Chimbal sounds as open as the pedal is, and closing the pedal stops the ring at once.
// Units: the chart's radius is 1, like the aim's reach; x to the right, y down, her shoulder at (0, 0).

export type DrumPiece = 'kick' | 'snare' | 'hat' | 'hatOpen' | 'tom1' | 'tom2' | 'floor' | 'ride' | 'bell' | 'crash' | 'china' | 'splash'
// gm: the piece's number on the General MIDI drum map (what a batida in flight carries as its note)
export const DRUM_PIECES: { id: DrumPiece; label: string; gm: number; color: string; cymbal: boolean }[] = [
  { id: 'kick', label: 'Bumbo', gm: 36, color: '#c8553d', cymbal: false },
  { id: 'snare', label: 'Caixa', gm: 38, color: '#e9e4d8', cymbal: false },
  { id: 'hat', label: 'Chimbal', gm: 42, color: '#e3b23c', cymbal: true },
  { id: 'hatOpen', label: 'Chimbal aberto', gm: 46, color: '#e3b23c', cymbal: true },
  { id: 'tom1', label: 'Tom 1', gm: 48, color: '#4f8fc0', cymbal: false },
  { id: 'tom2', label: 'Tom 2', gm: 45, color: '#3f73a8', cymbal: false },
  { id: 'floor', label: 'Surdo', gm: 41, color: '#2f5a8c', cymbal: false },
  { id: 'ride', label: 'Condução', gm: 51, color: '#d9a441', cymbal: true },
  { id: 'bell', label: 'Sino', gm: 53, color: '#f0cf7a', cymbal: true },
  { id: 'crash', label: 'Ataque', gm: 49, color: '#e8c15a', cymbal: true },
  { id: 'china', label: 'China', gm: 52, color: '#c98f2e', cymbal: true },
  { id: 'splash', label: 'Splash', gm: 55, color: '#f2d98a', cymbal: true },
]
export const DRUM_IDS = DRUM_PIECES.map(p => p.id)
const BY_ID = Object.fromEntries(DRUM_PIECES.map(p => [p.id, p])) as Record<DrumPiece, (typeof DRUM_PIECES)[number]>
export const drumPiece = (id: DrumPiece) => BY_ID[id]
/** The piece a note number plays (the nearest one on the General MIDI map). */
export function pieceOfMidi(midi: number): DrumPiece {
  let best = DRUM_PIECES[0]
  for (const p of DRUM_PIECES) if (Math.abs(p.gm - midi) < Math.abs(best.gm - midi)) best = p
  return best.id
}

// a piece on the chart: its middle and radius; back: it sits behind the others (drawn under them, out of the
// sticks' reach). The Chimbal aberto has no place of its own: it is the Chimbal's pedal
export type DrumPad = { piece: DrumPiece; x: number; y: number; r: number; back: boolean }
// rolls: the Caixa rolls under a slow analog trigger (off: only the sudden pulls hit)
// view: how the chart is framed around the player (see drumChartFrame)
export type DrumKit = { pads: DrumPad[]; binds: Record<DrumPiece, string[]>; rolls: boolean; view: DrumView }
// size: the chart's radius, in the scale layer's own unit (1 = the Escalas layer at 1x; it does not follow the layer's
// "Escalas (Tamanho)"); dx, dy: how far its middle sits from her shoulder, in radii (right and down); fit: it never
// leaves the screen (it slides back in and, bigger than the screen, shrinks to fit)
export type DrumView = { size: number; dx: number; dy: number; fit: boolean }
export const VIEW_SIZE_MIN = 0.4, VIEW_SIZE_MAX = 3, VIEW_SHIFT_MAX = 1.5
export const DEFAULT_VIEW: DrumView = { size: 1.3, dx: 0, dy: 0, fit: true }
export const PAD_PIECES: DrumPiece[] = DRUM_IDS.filter(id => id !== 'hatOpen')
export const PAD_R_MIN = 0.06, PAD_R_MAX = 0.34
export const BINDS_MAX = 4

// A shortcut is a key ("Key:KeyD"), a gamepad button ("Pad:b5") or one of the player's own movement directions
// ("Move:right": whatever keys and buttons walk that way for them, the sticks aside, which are the drumsticks)
export const MOVE_TOKENS = ['Move:left', 'Move:right', 'Move:up', 'Move:down'] as const
export type MoveToken = (typeof MOVE_TOKENS)[number]
export const isMoveToken = (t: string): t is MoveToken => (MOVE_TOKENS as readonly string[]).includes(t)
// the analog triggers of a standard gamepad (LT, RT): the only buttons that say how deep they are
export const isTriggerToken = (t: string) => t === 'Pad:b6' || t === 'Pad:b7'
const isBindToken = (t: unknown): t is string => typeof t === 'string' && (isMoveToken(t) || /^Key:[A-Za-z0-9]+$/.test(t) || /^Pad:b\d{1,2}$/.test(t))

// the user's own sketch (measured on its photo, her in the middle, the chart's radius about 250 px of it): Ataque and
// China at the top, behind the toms; the small Splash beside the Tom 1, over the Chimbal on the left; the big Condução
// (and its Sino) on the right; the Caixa under the Chimbal, the Bumbo below it and the Surdo below on the right
const pad = (piece: DrumPiece, x: number, y: number, r: number, back = false): DrumPad => ({ piece, x, y, r, back })
export const DEFAULT_KIT: DrumKit = {
  pads: [
    pad('crash', -0.32, -0.68, 0.22, true), pad('china', 0.34, -0.68, 0.19, true),
    pad('tom1', -0.18, -0.38, 0.2), pad('tom2', 0.24, -0.38, 0.17),
    pad('splash', -0.51, -0.38, 0.11), pad('hat', -0.64, -0.08, 0.2),
    pad('ride', 0.66, -0.22, 0.28), pad('bell', 0.66, -0.22, 0.08),
    pad('snare', -0.46, 0.22, 0.13), pad('kick', -0.24, 0.48, 0.21), pad('floor', 0.28, 0.32, 0.23),
  ],
  binds: {
    kick: ['Move:right', 'Pad:b5'], snare: ['Move:up', 'Pad:b7', 'Pad:b6'], hat: ['Move:left', 'Pad:b4'], hatOpen: ['Move:down', 'Pad:b6'],
    tom1: [], tom2: [], floor: [], ride: [], bell: [], crash: ['Pad:b10'], china: ['Pad:b11'], splash: [],
  },
  rolls: true,
  view: { ...DEFAULT_VIEW },
}

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.max(lo, Math.min(hi, v)) * 1000) / 1000 : d)
/** A saved kit, checked: every piece once, inside the chart, with known shortcuts (missing parts: the default's). */
export function cleanKit(raw: unknown): DrumKit {
  const out = structuredClone(DEFAULT_KIT)
  if (!raw || typeof raw !== 'object') return out
  const r = raw as { pads?: unknown; binds?: unknown; rolls?: unknown; view?: Partial<Record<keyof DrumView, unknown>> }
  if (Array.isArray(r.pads)) {
    out.pads.forEach(p => {
      const s = (r.pads as unknown[]).find(v => !!v && typeof v === 'object' && (v as { piece?: unknown }).piece === p.piece) as Partial<DrumPad> | undefined
      if (!s) return
      p.x = num(s.x, -1, 1, p.x); p.y = num(s.y, -1, 1, p.y); p.r = num(s.r, PAD_R_MIN, PAD_R_MAX, p.r)
      if (typeof s.back === 'boolean') p.back = s.back
    })
  }
  if (r.binds && typeof r.binds === 'object') {
    DRUM_IDS.forEach(id => {
      const list = (r.binds as Record<string, unknown>)[id]
      if (Array.isArray(list)) out.binds[id] = [...new Set(list.filter(isBindToken))].slice(0, BINDS_MAX)
    })
  }
  if (typeof r.rolls === 'boolean') out.rolls = r.rolls
  if (r.view && typeof r.view === 'object') {
    out.view = {
      size: num(r.view.size, VIEW_SIZE_MIN, VIEW_SIZE_MAX, DEFAULT_VIEW.size), dx: num(r.view.dx, -VIEW_SHIFT_MAX, VIEW_SHIFT_MAX, 0), dy: num(r.view.dy, -VIEW_SHIFT_MAX, VIEW_SHIFT_MAX, 0),
      fit: typeof r.view.fit === 'boolean' ? r.view.fit : DEFAULT_VIEW.fit,
    }
  }
  return out
}

// ---------- the chart ----------
// whether circle `a` lies wholly inside circle `b` (the Sino on the Condução)
const inside = (a: DrumPad, b: DrumPad) => a !== b && Math.hypot(a.x - b.x, a.y - b.y) + a.r <= b.r + 1e-6
/**
 * The piece at a point of the chart: the front ones first, a smaller one over a bigger one it sits on; `back`: the
 * pieces behind count too (a click reaches them where they show; a stick never does).
 */
export function padAt(kit: DrumKit, x: number, y: number, back: boolean): DrumPad | null {
  let best: DrumPad | null = null
  for (const p of kit.pads) {
    if ((p.back && !back) || Math.hypot(x - p.x, y - p.y) > p.r) continue
    if (!best || (best.back && !p.back) || (best.back === p.back && p.r < best.r)) best = p
  }
  return best
}
/** The piece nearest a point of the chart (by its edge). */
export function nearestPad(kit: DrumKit, x: number, y: number): DrumPad {
  let best = kit.pads[0]
  for (const p of kit.pads) if (Math.hypot(x - p.x, y - p.y) - p.r < Math.hypot(x - best.x, y - best.y) - best.r) best = p
  return best
}
export const padOf = (kit: DrumKit, piece: DrumPiece) => kit.pads.find(p => p.piece === (piece === 'hatOpen' ? 'hat' : piece)) ?? null

// the box around every piece, in the chart's units
export function kitBounds(kit: DrumKit) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
  for (const p of kit.pads) { l = Math.min(l, p.x - p.r); r = Math.max(r, p.x + p.r); t = Math.min(t, p.y - p.r); b = Math.max(b, p.y + p.r) }
  return kit.pads.length ? { l, t, r, b } : { l: -1, t: -1, r: 1, b: 1 }
}
/**
 * Where the chart goes on the screen for a player whose shoulder is at (x, y): its middle and radius, in screen
 * units. `unit`: the radius of a chart of size 1 there; `screen`: the part of the screen the chart may use.
 * Its middle is her shoulder moved by the kit's own shift; with `fit`, a chart whose pieces would not all fit the
 * screen shrinks until they do, and one that would leave the screen slides back in.
 */
export function drumChartFrame(kit: DrumKit, x: number, y: number, unit: number, screen: { l: number; t: number; r: number; b: number } | null): { x: number; y: number; r: number } {
  const v = kit.view
  let r = Math.max(1, unit * v.size)
  if (!v.fit || !screen) return { x: x + v.dx * r, y: y + v.dy * r, r }
  const box = kitBounds(kit), w = screen.r - screen.l, h = screen.b - screen.t
  if (w > 0 && h > 0) r = Math.min(r, w / (box.r - box.l), h / (box.b - box.t))
  let cx = x + v.dx * r, cy = y + v.dy * r
  cx = Math.max(screen.l - box.l * r, Math.min(screen.r - box.r * r, cx))
  cy = Math.max(screen.t - box.t * r, Math.min(screen.b - box.b * r, cy))
  return { x: cx, y: cy, r }
}

// ---------- playing ----------
// a hit: how hard (0..1); open: a Chimbal hit with the pedal this far open (missing: closed); roll: one stroke of the
// Caixa's roll; (x, y): where on the chart it landed
// knock: not a hit on the piece but a knock on the hardware near it (a click between the pieces)
export type DrumHit = { piece: DrumPiece; vel: number; open?: number; roll?: boolean; knock?: DrumKnock; x: number; y: number }
// the little noises of a kit's hardware: a rim, stick on stick, a shell's wood, a stand's tube, a hoop, a low shell, a
// cymbal's edge
export const DRUM_KNOCKS = ['rim', 'sticks', 'shell', 'stand', 'hoop', 'thud', 'edge'] as const
export type DrumKnock = (typeof DRUM_KNOCKS)[number]
// what a piece's shortcuts say this frame: `digital` a plain key or button is held; `depth` how deep its analog
// trigger is (0 with none)
export type BindLevel = { digital: boolean; depth: number }
export type DrumInput = {
  sticks: ({ x: number; y: number } | null)[] // each drumstick's place on the chart (null: at rest)
  taps: { x: number; y: number }[] // the clicks and fingers that landed since the last frame
  binds: Partial<Record<DrumPiece, BindLevel>>
}
type StickState = { x: number; y: number; on: DrumPiece | null; live: boolean }
type BindState = { digital: boolean; depth: number; speed: number; fast: boolean; wait: number; cool: number; rollIn: number }
// knock: the last hardware noise drawn (never the same twice in a row)
export type DrumState = { sticks: StickState[]; binds: Record<DrumPiece, BindState>; open: number; knock: number }
const newBind = (): BindState => ({ digital: false, depth: 0, speed: 0, fast: false, wait: 0, cool: 0, rollIn: 0 })
export const newDrumState = (): DrumState => ({
  sticks: [0, 1].map(() => ({ x: 0, y: 0, on: null, live: false })),
  binds: Object.fromEntries(DRUM_IDS.map(id => [id, newBind()])) as Record<DrumPiece, BindState>, open: 0, knock: -1,
})

// the pedal counts as open from here on (below it the Chimbal is closed)
export const HAT_OPEN_MIN = 0.06
// a trigger moving at least this fast (its whole travel per second) is a sudden pull: a hit
export const TRIGGER_FAST = 5
// and at least this fast (smoothed), on the Caixa, a roll
export const TRIGGER_ROLL = 0.3
// a plain key or button hits this hard; a click in the middle of a piece too (softer toward its edge)
export const PLAIN_VEL = 0.9
const STICK_STEP = 0.025, STICK_HITS_MAX = 4
// no roll for this long (s) after a sudden move of the trigger, either way: its slowing down is not a roll
const ROLL_COOL = 0.22
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
/** How hard a trigger pulled at `speed` (travels per second) hits. */
export const triggerVel = (speed: number) => 0.25 + 0.75 * clamp01(speed / 20)
/** How hard a drumstick moving at `speed` (chart radii per second) hits. */
export const stickVel = (speed: number) => 0.35 + 0.65 * clamp01(speed / 12)
/** How hard a click at (x, y) on a piece hits it: whole in its middle, softer at its edge. */
export const tapVel = (p: DrumPad, x: number, y: number) => PLAIN_VEL * (1 - 0.3 * clamp01(Math.hypot(x - p.x, y - p.y) / Math.max(1e-6, p.r)))

/** One frame of a drumstick: the pieces it went into on its way to `to` (null: back at rest), in order. */
export function stepStick(s: StickState, to: { x: number; y: number } | null, kit: DrumKit, dt: number): DrumHit[] {
  if (!to) { s.live = false; s.on = null; s.x = 0; s.y = 0; return [] }
  // leaving its rest, it comes from her shoulder
  const fx = s.live ? s.x : 0, fy = s.live ? s.y : 0, dist = Math.hypot(to.x - fx, to.y - fy)
  const n = Math.max(1, Math.min(60, Math.ceil(dist / STICK_STEP))), vel = stickVel(dist / Math.max(1e-3, dt))
  const out: DrumHit[] = []
  let on = s.live ? s.on : null
  for (let k = s.live ? 1 : 0; k <= n; k++) {
    const x = fx + ((to.x - fx) * k) / n, y = fy + ((to.y - fy) * k) / n
    const p = padAt(kit, x, y, false), piece = p?.piece ?? null
    if (piece === on) continue
    // (coming off a piece onto the one it sits on, the Sino back onto the Condução, is no new hit)
    const from = on ? kit.pads.find(q => q.piece === on) : null
    if (p && !(from && inside(from, p))) out.push({ piece: p.piece, vel, x, y })
    on = piece
  }
  s.x = to.x; s.y = to.y; s.on = on; s.live = true
  return out.slice(-STICK_HITS_MAX)
}

/**
 * One frame of the whole kit. Returns the hits to sound now, how far the Chimbal's pedal is open and whether it
 * just closed (the ring of an open Chimbal stops).
 */
export function stepDrums(st: DrumState, kit: DrumKit, input: DrumInput, dt: number, rand: () => number = Math.random): { hits: DrumHit[]; open: number; choke: boolean } {
  const hits: DrumHit[] = []
  const at = (piece: DrumPiece) => { const p = padOf(kit, piece); return { x: p?.x ?? 0, y: p?.y ?? 0 } }
  // the pedal first, so this frame's Chimbal hits already sound as open as it is
  const was = st.open
  const ho = input.binds.hatOpen ?? { digital: false, depth: 0 }, hs = st.binds.hatOpen
  const open = ho.digital ? 1 : clamp01(ho.depth)
  const openSpeed = (open - was) / Math.max(1e-3, dt)
  st.open = open
  hs.digital = ho.digital; hs.depth = ho.depth
  const opened = open > HAT_OPEN_MIN && was <= HAT_OPEN_MIN, choke = open <= HAT_OPEN_MIN && was > HAT_OPEN_MIN
  if (opened) hits.push({ piece: 'hat', vel: ho.digital ? PLAIN_VEL : Math.max(0.3, triggerVel(openSpeed)), open, ...at('hat') })

  for (const id of DRUM_IDS) {
    if (id === 'hatOpen') continue
    const b = input.binds[id] ?? { digital: false, depth: 0 }, s = st.binds[id]
    const speed = (b.depth - s.depth) / Math.max(1e-3, dt)
    // (smoothed without the sudden pulls, which are hits: what is left is the slow movement a roll follows)
    s.speed += (Math.max(-TRIGGER_FAST, Math.min(TRIGGER_FAST, speed)) - s.speed) * Math.min(1, dt / 0.06)
    s.cool = Math.max(0, s.cool - dt)
    if (b.digital && !s.digital) hits.push({ piece: id, vel: PLAIN_VEL, ...at(id) })
    // a sudden pull: the hit waits one frame for the pull's top speed, unless the trigger is already at its end
    if (s.wait > 0) {
      hits.push({ piece: id, vel: triggerVel(Math.max(s.wait, speed)), ...at(id) })
      s.wait = 0; s.cool = ROLL_COOL
    } else if (speed >= TRIGGER_FAST && !s.fast) {
      s.fast = true
      if (b.depth >= 0.95) { hits.push({ piece: id, vel: triggerVel(speed), ...at(id) }); s.cool = ROLL_COOL }
      else s.wait = speed
    }
    if (speed < TRIGGER_FAST / 2) s.fast = false
    if (speed <= -TRIGGER_FAST) s.cool = ROLL_COOL
    // the Caixa's roll: light strokes while the trigger moves slowly, faster and louder the deeper it is
    if (id === 'snare' && kit.rolls && b.depth > 0.04 && !s.fast && s.cool <= 0 && Math.abs(s.speed) >= TRIGGER_ROLL) {
      s.rollIn -= dt
      if (s.rollIn <= 0) { hits.push({ piece: id, vel: 0.2 + 0.5 * b.depth, roll: true, ...at(id) }); s.rollIn += 1 / (16 + 10 * b.depth); if (s.rollIn < 0) s.rollIn = 0 }
    } else s.rollIn = 0
    s.digital = b.digital; s.depth = b.depth
  }
  for (const t of input.taps) {
    const p = padAt(kit, t.x, t.y, true)
    if (p) { hits.push({ piece: p.piece, vel: tapVel(p, t.x, t.y), x: t.x, y: t.y }); continue }
    // between the pieces, inside the chart: a knock on the hardware, another one each time
    if (Math.hypot(t.x, t.y) > 1) continue
    let k = Math.min(DRUM_KNOCKS.length - 1, Math.floor(rand() * DRUM_KNOCKS.length))
    if (k === st.knock) k = (k + 1) % DRUM_KNOCKS.length
    st.knock = k
    hits.push({ piece: nearestPad(kit, t.x, t.y).piece, vel: PLAIN_VEL * (0.65 + 0.35 * rand()), knock: DRUM_KNOCKS[k], x: t.x, y: t.y })
  }
  st.sticks.forEach((s, i) => hits.push(...stepStick(s, input.sticks[i] ?? null, kit, dt)))
  // a Chimbal hit sounds as open as the pedal is
  hits.forEach(h => { if (h.piece === 'hat' && h.open === undefined && open > HAT_OPEN_MIN) h.open = open })
  return { hits, open, choke }
}

/** How loud an open Chimbal rings for how far its pedal is open (0 closed … 1 wide open). */
export const hatRing = (open: number) => (open <= HAT_OPEN_MIN ? 0 : Math.sqrt(clamp01((open - HAT_OPEN_MIN) / (1 - HAT_OPEN_MIN))))

// ---------- the kit in use (this browser's) ----------
const STORE = 'pigchicken-drumkit-v1'
const EVENT = 'pigchicken-drumkit'
let live: DrumKit | null = null
/** The kit in use now (this browser's, loaded once). */
export function drumKit(): DrumKit {
  if (!live) {
    live = structuredClone(DEFAULT_KIT)
    if (typeof window !== 'undefined') { try { live = cleanKit(JSON.parse(window.localStorage.getItem(STORE) || 'null')) } catch { /* storage unavailable */ } }
  }
  return live
}
export function saveDrumKit(kit: DrumKit) {
  live = cleanKit(kit)
  try { window.localStorage.setItem(STORE, JSON.stringify(live)) } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}
export function subscribeDrumKit(onChange: (kit: DrumKit) => void) {
  const handler = () => onChange(drumKit())
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}
