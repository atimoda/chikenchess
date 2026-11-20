// Estrela (lib/pigchicken/star-grid.ts): how it is played. Pure rules, no sound and no drawing; the Pátio's combat
// (lib/pigchicken/combat.ts) plays what comes out of here.
//   toque: a press (click, finger, Atirar) plays the cell under the hand;
//   arraste: with it still held, every cell the hand goes into is played, in the order it crosses them (a fast drag
//     plays the ones in between too);
//   dinâmica: how loud by what her body is doing (or, sitting at a fixed instrument, by the binds held as if it did);
//   acumulador: the notes played while Correr is held are kept; letting Correr go plays them all again, at once
//     (rajada), one after the other at the zone's shortest step (cascata: Agachar held, she leaves the run for a
//     slide) or in triplets (tercinas: Chocar held; letting Chocar go stops them).

// ---------- the hands ----------
// a hand over the star: the cell it is on (-1: none) and where it was last frame (tips at radius 1)
export type StarHand = { on: number; x: number; y: number; down: boolean }
export const newStarHand = (): StarHand => ({ on: -1, x: 0, y: 0, down: false })
// at most this many cells sound from one frame of a drag (a jump of the hand: the last ones before where it lands)
export const STAR_SWEEP_MAX = 12

/**
 * One frame of a hand. `point`: where it is (null: off the star); `fire`: held; `pressed`: pressed this frame;
 * `hit`: the cell under a point (-1: none); `path`: the cells on the way between two points (-1 between them).
 * Returns the cells to play now, in order.
 */
export function stepStarHand(hand: StarHand, point: { x: number; y: number } | null, fire: boolean, pressed: boolean,
  hit: (x: number, y: number) => number, path: (x0: number, y0: number, x1: number, y1: number) => number[]): number[] {
  if (!point || !fire) { hand.on = -1; hand.down = false; if (point) { hand.x = point.x; hand.y = point.y } return [] }
  if (pressed || !hand.down) {
    hand.down = true; hand.x = point.x; hand.y = point.y
    hand.on = hit(point.x, point.y)
    return hand.on >= 0 ? [hand.on] : []
  }
  const out: number[] = []
  let cur = hand.on
  for (const k of path(hand.x, hand.y, point.x, point.y)) {
    if (k === cur) continue
    if (k >= 0) out.push(k)
    cur = k
  }
  hand.on = cur; hand.x = point.x; hand.y = point.y
  return out.slice(-STAR_SWEEP_MAX)
}

// ---------- dynamics ----------
export const DYNAMICS = ['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff'] as const
export type Dynamic = (typeof DYNAMICS)[number]
// a note's loudness (velocity) at each dynamic
export const DYNAMIC_VEL: Record<Dynamic, number> = { ppp: 0.14, pp: 0.24, p: 0.36, mp: 0.5, mf: 0.65, f: 0.82, ff: 1 }
// sitting, Pular held this long (s) counts as flying (Pular held in the air): fortissimo
export const SEATED_FLY_AFTER = 0.3

/**
 * What her body is doing, as a dynamic: brooding still ppp, brooding walking pp, crouched (or sliding) p, standing
 * mp, running mf, in the air f, flying (Pular held in the air) ff. `speed`: her horizontal speed (px/s).
 */
export function bodyDynamic(state: string, speed: number): Dynamic {
  if (state === 'brood' || state === 'shockingPrepare') return Math.abs(speed) > 5 ? 'pp' : 'ppp'
  if (state === 'crouch' || state === 'slide') return 'p'
  if (state === 'run') return 'mf'
  if (state === 'fly') return 'ff'
  if (state === 'jump' || state === 'fastFall') return 'f'
  return 'mp'
}

// the movement binds held this frame (Chocar is `brood`, Agachar `crouch`; walk: Esquerda or Direita)
export type MoveBinds = { run: boolean; crouch: boolean; brood: boolean; jump: boolean; walk: boolean }
export const NO_MOVES: MoveBinds = { run: false, crouch: false, brood: false, jump: false, walk: false }

/**
 * Sitting at a fixed instrument nothing moves, so the binds held say the dynamic as if she did: Pular f (held for
 * SEATED_FLY_AFTER, ff), Chocar ppp (with Esquerda or Direita, pp), Agachar p, Correr mf, nothing mp. The order is
 * the body's: in the air first, then brooding (unless crouched), crouched, running.
 */
export function bindDynamic(b: MoveBinds, jumpFor: number): Dynamic {
  if (b.jump) return jumpFor >= SEATED_FLY_AFTER ? 'ff' : 'f'
  if (b.brood && !b.crouch) return b.walk ? 'pp' : 'ppp'
  if (b.crouch) return 'p'
  if (b.run) return 'mf'
  return 'mp'
}

// ---------- the run's accumulator ----------
export type StarNote = { index: number; midi: number; vel: number }
export type StarRelease = 'burst' | 'cascade' | 'triplets'
// how many notes a run keeps (the oldest go first) and how many distinct notes a burst plays at once
export const RUN_MAX = 64, BURST_MAX = 24
// the steps of the release, in beats: the cascade's (the zone's shortest: a 32nd note) and the triplets' (an eighth
// note triplet)
export const CASCADE_STEP = 1 / 8, TRIPLET_STEP = 1 / 3
export type StarRun = { held: boolean; notes: StarNote[]; queue: (StarNote & { due: number; mode: StarRelease })[] }
export const newStarRun = (): StarRun => ({ held: false, notes: [], queue: [] })

/** How a run ends: Chocar held, triplets; else Agachar held (the slide), a cascade; else a burst. */
export const runRelease = (crouch: boolean, brood: boolean): StarRelease => (brood ? 'triplets' : crouch ? 'cascade' : 'burst')

/** A note played while Correr is held goes into the run. */
export function recordRun(run: StarRun, note: StarNote) {
  if (!run.held) return
  run.notes.push(note)
  if (run.notes.length > RUN_MAX) run.notes.shift()
}

/**
 * The notes a release plays, with their times (s after the release): a burst plays every distinct note at once
 * (the loudest of each, the last BURST_MAX, softer the more there are, so the chord does not swamp); a cascade and
 * triplets play them all in the order they were played, a step apart.
 */
export function releaseNotes(notes: readonly StarNote[], mode: StarRelease, beat: number): (StarNote & { at: number })[] {
  if (mode === 'burst') {
    const by = new Map<number, StarNote>()
    notes.forEach(n => { const o = by.get(n.midi); by.delete(n.midi); by.set(n.midi, o && o.vel > n.vel ? { ...n, vel: o.vel } : n) })
    const list = [...by.values()].slice(-BURST_MAX), soft = list.length > 4 ? Math.sqrt(4 / list.length) : 1
    return list.map(n => ({ ...n, vel: n.vel * soft, at: 0 }))
  }
  const step = Math.max(0.02, beat * (mode === 'cascade' ? CASCADE_STEP : TRIPLET_STEP))
  return notes.map((n, i) => ({ ...n, at: i * step }))
}

/**
 * One frame of the run. `binds`: Correr, Agachar and Chocar held now (`brooding`: she is in the Chocar pose, which
 * can stay after the bind is let go; without it, the bind); `t`: the clock (s); `beat`: s per beat in the zone.
 * Pressing Correr starts a new run; letting it go schedules the notes kept; leaving Chocar stops the triplets still
 * waiting. Returns the notes due within `ahead` s, with how long from now each one is.
 */
export function stepStarRun(run: StarRun, binds: { run: boolean; crouch: boolean; brood: boolean; brooding?: boolean }, t: number, beat: number, ahead = 1 / 60): (StarNote & { at: number })[] {
  if (binds.run && !run.held) { run.held = true; run.notes = [] }
  else if (!binds.run && run.held) {
    run.held = false
    const mode = runRelease(binds.crouch, binds.brood)
    releaseNotes(run.notes, mode, beat).forEach(n => run.queue.push({ index: n.index, midi: n.midi, vel: n.vel, due: t + n.at, mode }))
    run.notes = []
  }
  if (!(binds.brooding ?? binds.brood)) run.queue = run.queue.filter(q => q.mode !== 'triplets')
  const due = run.queue.filter(q => q.due <= t + ahead)
  if (due.length) run.queue = run.queue.filter(q => !due.includes(q))
  return due.map(q => ({ index: q.index, midi: q.midi, vel: q.vel, at: Math.max(0, q.due - t) }))
}
