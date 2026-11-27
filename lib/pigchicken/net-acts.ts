// What the other browsers' chickens do with their bodies, online: the Bicada (and its wind-up), the Golpe (the wing
// turning, the item on its tip and the air it leaves) and the violin's beam. They travel in the "shots" message (any
// server relays it as it is, and an older browser drops kinds it does not know), each with the slot of the chicken
// that did it. Pure functions and one small store: the combat queues this browser's acts (`netActs`), the sync sends
// them and gives the others' to the store, the online chickens take their poses from it every frame and the
// Parquinho draws the air of their blows.
import type { PeckPose } from './peck'
import { peckPose } from './peck'
import { SWING_COMBO, swingHitAt, swingLife, pathEnd, type Swing, type SwingKind, type SwingPath } from './swing'
import type { ItemId } from './items'

// pk: a Bicada let go (angle, pull, reach, its time); pp: its wind-up while Atirar is held (sent again every batch)
// sw: a Golpe that starts (its pose and air: angle, arc, wing's reach, reach, time, 1 for the bare wing, direction,
// kind, the air [width, colour, time, curls, opacity], the strong blow and its size, the Golpe desenhado's move)
// pk and sw also carry where they leave from (ox, oy: the neck's base or her shoulder, world units), their damage and
// push (dm, pu) and the Bicada its cone (ar): with Dano entre jogadores the other browsers hurt their own players with them
// vb: the violin's beam while it plays (sent again every batch): from where to where, its note, colour, bend, vibrato
export type NetAct =
  | { k: 'pk'; s: number; a: number; p: number; r: number; tm: number; ox?: number; oy?: number; dm?: number; pu?: number; ar?: number }
  | { k: 'pp'; s: number; a: number; p: number; r: number }
  | { k: 'sw'; s: number; a: number; ar: number; rg: number; re: number; tm: number; w: number; d: number; kd: SwingKind; tr: [number, string, number, number, number]; h?: number; sz?: number; ch?: number; pt?: [number[], number[]]; ox?: number; oy?: number; dm?: number; pu?: number }
  | { k: 'vb'; s: number; i: ItemId; x1: number; y1: number; x2: number; y2: number; m: number; c: string; b?: number; v?: number }
  // hp: how the item in her wing is held, while it is more than carried (sent again every batch): a throw charging (tc,
  // and where it aims, ta), a shot charging (fc), a staff winding or the chain spinning (hc), eating (ei, how far: ec),
  // thrown and away (fl), reloading (rl), the quiver empty (am: 0), the Boomerangs in her wings (ih) and the back one (bk)
  | { k: 'hp'; s: number; tc?: number; ta?: number; fc?: number; hc?: number; ei?: ItemId; ec?: number; fl?: number; rl?: number; am?: number; ih?: number; bk?: number }

export const ACT_KINDS = ['pk', 'pp', 'sw', 'vb', 'hp'] as const
export const isActKind = (k: unknown) => (ACT_KINDS as readonly unknown[]).includes(k)
// a drawn blow's move travels with at most this many points
const PATH_MAX = 48
// the wind-up and the beam stay this long after their last word (they are said again 20 times a second)
export const ACT_HOLD_MS = 250

const LIMIT = 1e6
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const cap = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const COLOR = /^#[0-9a-f]{3,8}$/i
const r2 = (v: number) => Math.round(v * 100) / 100

/** A Golpe of this browser as it goes out (slot: the chicken's place in this browser's list). */
export function swingAct(sw: Swing, slot: number, origin?: { x: number; y: number }): NetAct {
  const t = sw.trail
  const act: NetAct = { k: 'sw', s: slot, a: r2(sw.angle), ar: r2(sw.arc), rg: Math.round(sw.range), re: Math.round(sw.reach), tm: r2(sw.time), w: sw.wing ? 1 : 0, d: sw.dir < 0 ? -1 : 1, kd: sw.kind, tr: [Math.round(t.width), t.color, r2(t.time), t.wisps, r2(t.opacity)] }
  if (sw.heavy) { act.h = 1; act.sz = r2(sw.size ?? 1); act.ch = r2(sw.charge ?? 1) }
  if (sw.path) act.pt = thinPath(sw.path)
  if (origin) { act.ox = Math.round(origin.x); act.oy = Math.round(origin.y) }
  if (sw.damage > 0) { act.dm = r2(sw.damage); act.pu = Math.round(sw.push) }
  return act
}

// the drawn move with fewer points (the first and the last always kept)
function thinPath(p: SwingPath): [number[], number[]] {
  const n = p.t.length
  if (n <= PATH_MAX) return [p.t.map(r2), p.a.map(r2)]
  const t: number[] = [], a: number[] = []
  for (let i = 0; i < PATH_MAX; i++) { const j = Math.round(i * (n - 1) / (PATH_MAX - 1)); t.push(r2(p.t[j])); a.push(r2(p.a[j])) }
  return [t, a]
}

/** Another browser's Golpe as this one draws it, from the start. */
export function swingOfAct(act: Extract<NetAct, { k: 'sw' }>): Swing {
  const [width, color, time, wisps, opacity] = act.tr
  const trail = { width, color, time, wisps, opacity }
  const path = act.pt ? { t: act.pt[0], a: act.pt[1] } : undefined
  const end = path ? pathEnd(path) : 0
  return {
    angle: act.a, arc: act.ar, range: act.rg, reach: act.re, t: 0, time: act.tm, wing: !!act.w, dir: act.d, kind: act.kd, combo: 0,
    hitAt: path ? 0 : swingHitAt(act.tm), hit: false, hits: 0, life: path ? Math.max(act.tm, end + trail.time) : swingLife(act.tm, trail.time),
    impacts: [], seed: Math.random(), trail, item: null, damage: 0, push: 0, durability: false, name: '',
    ...(act.h ? { heavy: true, charge: act.ch ?? 1, size: act.sz ?? 1 } : {}),
    ...(path ? { path } : {}),
  }
}

/** An act from another browser with its numbers inside their ranges, or null. */
export function cleanAct(o: unknown, items: Record<string, unknown>): NetAct | null {
  const a = o as Record<string, unknown> | null
  if (!a || typeof a !== 'object' || !isActKind(a.k) || !num(a.s) || a.s < 0 || a.s > 3) return null
  const s = Math.round(a.s)
  const all = (...keys: string[]) => keys.every(k => num(a[k]) && Math.abs(a[k] as number) < LIMIT)
  // where a blow leaves from and what it does (only both together, and inside their ranges)
  const blow = () => all('ox', 'oy') ? { ox: a.ox as number, oy: a.oy as number, ...(num(a.dm) && a.dm > 0 ? { dm: cap(a.dm, 0, 5000), pu: num(a.pu) ? cap(a.pu, -5000, 5000) : 0 } : {}) } : {}
  if (a.k === 'pk' && all('a', 'p', 'r', 'tm')) return { k: 'pk', s, a: a.a as number, p: cap(a.p as number, 0, 400), r: cap(a.r as number, 0, 2000), tm: cap(a.tm as number, 0.05, 5), ...blow(), ...(num(a.ar) ? { ar: cap(a.ar, 0, Math.PI) } : {}) }
  if (a.k === 'pp' && all('a', 'p', 'r')) return { k: 'pp', s, a: a.a as number, p: cap(a.p as number, 0, 400), r: cap(a.r as number, 0, 2000) }
  if (a.k === 'sw' && all('a', 'ar', 'rg', 're', 'tm', 'd') && SWING_COMBO.includes(a.kd as SwingKind) && Array.isArray(a.tr) && a.tr.length === 5) {
    const [w, c, t, n, op] = a.tr as unknown[]
    if (!num(w) || typeof c !== 'string' || !COLOR.test(c) || !num(t) || !num(n) || !num(op)) return null
    const act: Extract<NetAct, { k: 'sw' }> = {
      k: 'sw', s, a: a.a as number, ar: cap(a.ar as number, 0, Math.PI * 2), rg: cap(a.rg as number, 0, 3000), re: cap(a.re as number, 0, 4000), tm: cap(a.tm as number, 0.02, 10),
      w: a.w ? 1 : 0, d: (a.d as number) < 0 ? -1 : 1, kd: a.kd as SwingKind, tr: [cap(w, 0, 400), c, cap(t, 0.05, 10), cap(Math.round(n), 0, 30), cap(op, 0, 1)],
    }
    if (a.h) { act.h = 1; act.sz = num(a.sz) ? cap(a.sz, 1, 10) : 1; act.ch = num(a.ch) ? cap(a.ch, 0, 1) : 1 }
    Object.assign(act, blow())
    if (Array.isArray(a.pt) && a.pt.length === 2) {
      const [pt, pa] = a.pt as unknown[]
      const ok = (v: unknown): v is number[] => Array.isArray(v) && v.length >= 2 && v.length <= PATH_MAX && v.every(x => num(x) && Math.abs(x) < 1000)
      if (ok(pt) && ok(pa) && pt.length === pa.length && pt.every((x, i) => i === 0 || x >= pt[i - 1]) && pt[pt.length - 1] <= 10) act.pt = [pt, pa]
    }
    return act
  }
  if (a.k === 'hp') {
    const hp: Extract<NetAct, { k: 'hp' }> = { k: 'hp', s }
    for (const key of ['tc', 'fc', 'hc', 'ec', 'rl'] as const) if (num(a[key])) hp[key] = cap(a[key] as number, 0, 1)
    if (num(a.ta)) hp.ta = a.ta as number
    if (typeof a.ei === 'string' && a.ei in items) hp.ei = a.ei as ItemId
    if (a.fl) hp.fl = 1
    if (a.bk) hp.bk = 1
    if (a.am === 0) hp.am = 0
    if (num(a.ih)) hp.ih = cap(Math.round(a.ih), 0, 14)
    return hp
  }
  if (a.k === 'vb' && typeof a.i === 'string' && a.i in items && all('x1', 'y1', 'x2', 'y2', 'm') && typeof a.c === 'string' && COLOR.test(a.c)) {
    // (never longer than a beam can go)
    const dx = (a.x2 as number) - (a.x1 as number), dy = (a.y2 as number) - (a.y1 as number), d = Math.hypot(dx, dy), k = d > 6000 ? 6000 / d : 1
    return {
      k: 'vb', s, i: a.i as ItemId, x1: a.x1 as number, y1: a.y1 as number, x2: (a.x1 as number) + dx * k, y2: (a.y1 as number) + dy * k, m: cap(a.m as number, 0, 127), c: a.c,
      ...(num(a.b) ? { b: cap(a.b, -24, 24) } : {}), ...(num(a.v) ? { v: cap(a.v, 0, 200) } : {}),
    }
  }
  return null
}

// ---------- the other browsers' chickens: what each one is doing now (by pid and slot) ----------
type Live = {
  peck?: { a: number; p: number; r: number; tm: number; at: number }
  prep?: { a: number; p: number; r: number; until: number }
  swing?: { sw: Swing; at: number }
  bowUntil?: number
  hold?: { hp: Extract<NetAct, { k: 'hp' }>; until: number }
  // her shoulder on the screen, as the online chickens last drew her (the air of her blows is drawn from it)
  origin?: { x: number; y: number }
}

export function createNetActStore() {
  const live = new Map<string, Live>()
  const entry = (key: string) => { let l = live.get(key); if (!l) { l = {}; live.set(key, l) } return l }
  return {
    /** acts that came from the browser `pid` (already cleaned), at `now` (ms) */
    receive(pid: number, list: readonly NetAct[], now: number) {
      for (const a of list) {
        const l = entry(`${pid}:${a.s}`)
        if (a.k === 'pk') { l.peck = { a: a.a, p: a.p, r: a.r, tm: a.tm, at: now }; delete l.prep; delete l.swing }
        else if (a.k === 'pp') { if (!l.peck) l.prep = { a: a.a, p: a.p, r: a.r, until: now + ACT_HOLD_MS } }
        else if (a.k === 'sw') { l.swing = { sw: swingOfAct(a), at: now }; delete l.peck; delete l.prep }
        else if (a.k === 'vb') l.bowUntil = now + ACT_HOLD_MS
        else if (a.k === 'hp') l.hold = { hp: a, until: now + ACT_HOLD_MS }
      }
    },
    /** her pose now: the beak, the blow (its t brought to now) and whether a bow plays her violin */
    pose(pid: number, slot: number, now: number): { peck: PeckPose | null; swing: Swing | null; bowing: boolean; hold: Extract<NetAct, { k: 'hp' }> | null } {
      const key = `${pid}:${slot}`, l = live.get(key)
      if (!l) return { peck: null, swing: null, bowing: false, hold: null }
      let peck: PeckPose | null = null
      if (l.peck) {
        const t = (now - l.peck.at) / 1000
        if (t >= l.peck.tm) delete l.peck
        else peck = peckPose({ angle: l.peck.a, pull: l.peck.p, reach: l.peck.r, t, time: l.peck.tm, hit: false })
      }
      if (!peck && l.prep) {
        if (now > l.prep.until) delete l.prep
        else peck = { angle: l.prep.a, pull: l.prep.p, reach: l.prep.r, thrust: 0 }
      }
      let swing: Swing | null = null
      if (l.swing) {
        l.swing.sw.t = (now - l.swing.at) / 1000
        if (l.swing.sw.t > l.swing.sw.life) delete l.swing
        else swing = l.swing.sw
      }
      const bowing = (l.bowUntil ?? 0) > now
      if (l.hold && l.hold.until < now) delete l.hold
      const hold = l.hold?.hp ?? null
      if (!l.peck && !l.prep && !l.swing && !bowing && !l.origin && !hold) live.delete(key)
      return { peck, swing, bowing, hold }
    },
    setOrigin(pid: number, slot: number, origin: { x: number; y: number } | null) {
      const key = `${pid}:${slot}`
      if (origin) entry(key).origin = origin
      else { const l = live.get(key); if (l) delete l.origin }
    },
    /** the blows of the others under way, with the shoulder each one is drawn from (screen px) */
    swings(): { swing: Swing; origin: { x: number; y: number } }[] {
      const out: { swing: Swing; origin: { x: number; y: number } }[] = []
      live.forEach(l => { if (l.swing && l.origin && l.swing.sw.t <= l.swing.sw.life) out.push({ swing: l.swing.sw, origin: l.origin }) })
      return out
    },
    /** a browser that left takes its chickens' acts with it */
    keep(pids: ReadonlySet<number>) { for (const key of [...live.keys()]) if (!pids.has(Number(key.split(':')[0]))) live.delete(key) },
    clear() { live.clear() },
    get size() { return live.size },
  }
}
export type NetActStore = ReturnType<typeof createNetActStore>
// the one this page uses (the sync fills it, the online chickens and the Parquinho read it)
export const netActStore = createNetActStore()
