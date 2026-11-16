// The online Pátio's shared world, as data: the enemies the lobby's owner simulates (aliens, zombies and the undead
// they leave) and the shots every browser fires. Pure functions on the combat's lists, so both sides and the tests
// use the same code; lib/pigchicken/net-world-sync.ts moves them through the game server.
//
// Who decides what:
// - the owner's browser moves every shared enemy and sends them ~10 times a second ("foes");
// - the other browsers draw those mirrors (they do not move them) and report their own hits ("hits"); the owner
//   applies each hit as if it were its own (life, harmony, deaths, conversions);
// - every browser sends the projectiles it fires ("shots"); the others fly a copy that only shows (bounces, bursts,
//   explosion pushes on their own chickens) and never damages anything.
// The temple's mini-game and the training dummies stay local to each browser.
import type { ItemId } from './items'
import type { Target } from './combat'

// a hit on a shared enemy, from the browser that shot it to the owner (id: the enemy's network id)
export type NetHit = {
  id: number; d: number; px: number; x: number; y: number
  // notes (instruments) fill the harmony bar instead of hurting: the note and how long it stuns
  n?: { m: number; c: string; s: string; v: string; w: number }; st?: number
  // a lightning weapon's shock (lib/pigchicken/shock.ts): seconds, strength (0..1) and what it takes from the harmony bar
  sh?: [number, number, number]
}

// a projectile someone fired: a bullet / note ('b'), an instant shot's tracer ('t'), a thrown item ('th')
export type NetShot =
  | { k: 'b'; i: ItemId; x: number; y: number; vx: number; vy: number; sz: number; dr: number; rg: number; fu: number; bo: number; ex: number; ep?: number; pi: number; n?: { m: number; c: string; s: string; w: number; v: string }; rn?: number; gh?: boolean }
  | { k: 't'; i: ItemId; x1: number; y1: number; x2: number; y2: number }
  | { k: 'th'; i: ItemId; x: number; y: number; vx: number; vy: number; sp: number; a: number }
  // the bolts of a shock ('z': five numbers each, x1, y1, x2, y2 and its hop, -1 for the one from the sky; s: 1 for
  // a special) and a staff thrown that comes back ('hm': from where, its angle, speed and how far it goes)
  | { k: 'z'; i: ItemId; p: number[]; s: number }
  | { k: 'hm'; i: ItemId; x: number; y: number; a: number; sp: number; rg: number }
  // a deck's card (lib/pigchicken/cards.ts; c: its id in the browser that threw it): thrown ('cd': its rank, from
  // where, to where, its speed and, for a music deck, its note's colour), on its way back to its owner ('cb') and
  // burst ('cx': where, the burst's radius and, for a music deck, the note it plays, its colour and voice)
  | { k: 'cd'; i: ItemId; c: number; r: number; x: number; y: number; tx: number; ty: number; sp: number; col?: string }
  | { k: 'cb'; i: ItemId; c: number }
  | { k: 'cx'; i: ItemId; c: number; x: number; y: number; rd: number; n?: { m: number; c: string; v: string } }

// what spawns are asked of the owner (the horde buttons and the editor's training enemies), with the scene they are
// for: the horde moves inside it whoever is watching
export type NetSpawn = { what: 'aliens' | 'zombies' | 'alien' | 'zombie'; x: number; y: number; l: number; r: number; n?: number }

// one enemy per entry: [id, kind, x, y, w, h, hp, maxHp, face, state, animT, deadT, harmony, stun, tint, flash, angle, data?, shock?]
// data: only when it changed (0 holds its place when only the shock follows); shock: [left, total, power] while shocked
export type NetFoe = [number, number, number, number, number, number, number, number, number, string, number, number, number, number, string, number, number, unknown?, number[]?]
// the horde formations by id: [x, y, dir, targetY, speed, cols, gap, total, l, r]
export type NetFoes = { fs: Record<string, number[]>; l: NetFoe[] }

const KINDS = ['alien', 'zombie', 'undead'] as const
type SharedKind = typeof KINDS[number]

type Formation = { x: number; y: number; dir: number; targetY: number; speed: number; cols: number; gap: number; total: number; l?: number; r?: number }
export type NetFormation = Formation
type AnyData = Record<string, unknown> & { kind?: string }

const sharedLook = (data: unknown) => {
  const d = data as AnyData | undefined
  // the horde's aliens; the training aliens (Catálogo species, with their variant); never the temple's own
  return d?.kind === 'alien' || (d?.kind === 'temple' && 'variant' in d)
}

/** an enemy the lobby shares (the owner moves it, the others mirror it) */
export function isSharedTarget(t: Target) {
  if (t.kind === 'zombie') return true
  if (t.kind === 'alien') return sharedLook(t.data)
  if (t.kind === 'undead') return sharedLook((t.data as { look?: unknown } | undefined)?.look)
  return false
}

// the undead's numbers that change every frame: they travel only in the periodic full send (and its angle in the entry)
const UNDEAD_VOLATILE = new Set(['t', 'vx', 'vy', 'angle', 'spin', 'whistleIn', 'riseIn', 'leaveIn', 'homeX', 'homeY'])
const r1 = (v: number) => Math.round(v * 10) / 10
const r2 = (v: number) => Math.round(v * 100) / 100

/** the owner's side: what to send, plus the cache of what each enemy's data looked like when last sent */
export type FoeCache = { sent: Map<number, string>; fids: WeakMap<object, number>; nextFid: number }
export const newFoeCache = (): FoeCache => ({ sent: new Map(), fids: new WeakMap(), nextFid: 1 })

/** network ids are unique in the room: the owner's pid in front of its own id */
export const netIdFor = (pid: number, id: number) => pid * 10_000_000 + (id % 10_000_000)

export function exportFoes(targets: readonly Target[], pid: number, cache: FoeCache, full: boolean): NetFoes {
  const fs: Record<string, number[]> = {}
  const l: NetFoe[] = []
  const live = new Set<number>()
  for (const t of targets) {
    if (!isSharedTarget(t)) continue
    const id = t.net ??= netIdFor(pid, t.id)
    live.add(id)
    const kind = KINDS.indexOf(t.kind as SharedKind)
    const data = t.data as AnyData | undefined
    let out: unknown = data
    let angle = 0
    if (data?.kind === 'alien' && data.f) {
      const f = data.f as Formation
      let fid = cache.fids.get(f)
      if (fid === undefined) { fid = netIdFor(pid, cache.nextFid++); cache.fids.set(f, fid) }
      fs[fid] = [r1(f.x), r1(f.y), f.dir, r1(f.targetY), r1(f.speed), f.cols, f.gap, f.total, f.l ?? NaN, f.r ?? NaN].map(v => (Number.isFinite(v) ? v : -1e9))
      out = { kind: 'alien', fid, col: data.col, row: data.row, color: data.color }
    }
    let sig: string
    if (t.kind === 'undead' && data) {
      angle = r2(Number(data.angle) || 0)
      const stable: AnyData = {}
      for (const k in data) if (!UNDEAD_VOLATILE.has(k)) stable[k] = data[k]
      sig = JSON.stringify(stable)
    } else sig = JSON.stringify(out ?? null)
    const send = full || cache.sent.get(id) !== sig
    if (send) cache.sent.set(id, sig)
    const entry: NetFoe = [id, kind, r1(t.x), r1(t.y), t.w, t.h, r1(t.hp), t.maxHp, t.face < 0 ? -1 : 1, t.state, r2(t.animT), t.deadT > 0 ? Math.max(0.01, r2(t.deadT)) : 0, r1(t.harmony ?? 0), r2(t.stun ?? 0), t.tint ?? '', r2(t.flash), angle]
    if (send) entry.push(out === undefined ? null : out)
    if (t.shock && t.shock.left > 0) { if (!send) entry.push(0); entry.push([r2(t.shock.left), r2(t.shock.total), r2(t.shock.power)]) }
    l.push(entry)
  }
  for (const id of [...cache.sent.keys()]) if (!live.has(id)) cache.sent.delete(id)
  return { fs, l }
}

// what changed on a mirror, for the effects the follower plays on its own screen
export type FoeChange = 'die' | 'convert' | 'zombieDie' | 'undeadDie' | 'bird'

/**
 * The follower's side: the owner's enemies become mirrors in the local list (marked `mirror`, by network id). They
 * glide to the owner's positions (the combat moves them a little each frame), change state, and leave when the owner
 * drops them. Returns the changes worth an effect. Mirrors without their data yet (just joined) wait for it.
 */
export function importFoes(targets: Target[], msg: NetFoes, formations: Map<number, Formation>, onChange?: (t: Target, change: FoeChange) => void) {
  const byNet = new Map<number, Target>()
  for (const t of targets) if (t.mirror && t.net !== undefined) byNet.set(t.net, t)
  // the formations first: one shared object per id, as on the owner
  for (const [k, v] of Object.entries(msg.fs ?? {})) {
    const fid = Number(k)
    const n = (i: number) => (Number.isFinite(v[i]) && v[i] > -1e8 ? v[i] : undefined)
    const f = formations.get(fid) ?? { x: 0, y: 0, dir: 1, targetY: 0, speed: 80, cols: 1, gap: 70, total: 1 }
    Object.assign(f, { x: v[0], y: v[1], dir: v[2], targetY: v[3], speed: v[4], cols: v[5], gap: v[6], total: v[7] })
    f.l = n(8); f.r = n(9)
    formations.set(fid, f)
  }
  const seen = new Set<number>()
  for (const e of msg.l ?? []) {
    const [id, k, x, y, w, h, hp, maxHp, face, state, animT, deadT, harmony, stun, tint, flash, angle] = e
    const kind = KINDS[k]
    if (!kind) continue
    let data = e.length > 17 && e[17] !== 0 ? e[17] : undefined
    const sh = e[18]
    if (data && (data as AnyData).kind === 'alien' && 'fid' in (data as AnyData)) {
      const d = data as AnyData & { fid: number }
      const f = formations.get(d.fid)
      if (!f) continue
      data = { kind: 'alien', f, col: d.col, row: d.row, color: d.color }
    }
    let t = byNet.get(id)
    if (!t) {
      if (data === undefined) continue
      t = { id, net: id, mirror: true, kind, home: 0, x, y, w, h, hp, maxHp, flash: 0, wobble: 0, vx: 0, deadT, face, state, animT, data }
      targets.push(t)
    } else {
      const was = { deadT: t.deadT, state: t.state }
      if (data !== undefined) {
        // the undead keep their numbers that only come with the full send
        if (kind === 'undead' && t.data && typeof data === 'object') data = { ...(t.data as AnyData), ...(data as AnyData) }
        t.data = data
      }
      if (state !== t.state || Math.abs(animT - t.animT) > 0.3) t.animT = animT
      t.state = state; t.w = w; t.h = h; t.hp = hp; t.maxHp = maxHp; t.face = face; t.deadT = deadT
      if (onChange) {
        if (kind === 'alien' && was.deadT <= 0 && deadT > 0) onChange(t, state === 'converted' ? 'convert' : 'die')
        else if (kind === 'zombie' && was.state !== state && (state === 'dead' || state === 'converted')) onChange(t, state === 'dead' ? 'zombieDie' : 'convert')
        else if (kind === 'undead' && was.deadT <= 0 && deadT > 0) onChange(t, 'undeadDie')
        else if (kind === 'undead' && was.state !== 'bird' && state === 'bird') onChange(t, 'bird')
      }
    }
    t.netX = x; t.netY = y
    // far away (just appeared, a portal, a big knockback): straight there
    if (Math.hypot(t.x - x, t.y - y) > 400) { t.x = x; t.y = y }
    t.harmony = harmony; t.stun = stun; t.tint = tint || undefined
    // shocked on the owner: it shakes here too (a shock this browser gave shows at once and runs out on its own)
    if (Array.isArray(sh) && sh.length === 3 && sh.every(num) && sh[0] > 0) t.shock = { left: Math.min(30, sh[0]), total: Math.max(0.05, Math.min(30, sh[1])), power: Math.max(0, Math.min(1, sh[2])) }
    t.flash = Math.max(t.flash, flash)
    if (kind === 'undead' && t.data) (t.data as AnyData).angle = angle
    seen.add(id)
  }
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i]
    if (!t.mirror || t.net === undefined || seen.has(t.net)) continue
    // gone while alive: an alien or a zombie only leaves like that when notes turned it (it lasts one frame there)
    if (onChange && t.deadT <= 0 && t.state !== 'dead' && (t.kind === 'alien' || t.kind === 'zombie')) onChange(t, 'convert')
    targets.splice(i, 1)
  }
  for (const fid of [...formations.keys()]) if (!(String(fid) in (msg.fs ?? {}))) formations.delete(fid)
}

/** a mirror glides toward where the owner has it */
export function glideMirror(t: Target, dt: number) {
  t.animT += dt
  t.flash = Math.max(0, t.flash - dt)
  if (t.netX === undefined || t.netY === undefined) return
  const k = Math.min(1, dt * 12)
  t.x += (t.netX - t.x) * k; t.y += (t.netY - t.y) * k
}

// ---------- incoming messages, checked (they come from other browsers through the server) ----------
const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
const LIMIT = 200_000

export function cleanHit(h: unknown): NetHit | null {
  const o = h as NetHit | null
  if (!o || typeof o !== 'object' || ![o.id, o.d, o.px, o.x, o.y].every(num)) return null
  const hit: NetHit = { id: o.id, d: Math.max(0, Math.min(5000, o.d)), px: Math.max(-2000, Math.min(2000, o.px)), x: o.x, y: o.y }
  if (o.n && typeof o.n === 'object' && num(o.n.m) && num(o.n.w) && typeof o.n.c === 'string' && typeof o.n.s === 'string' && typeof o.n.v === 'string') {
    hit.n = { m: o.n.m, c: o.n.c.slice(0, 16), s: o.n.s.slice(0, 4), v: o.n.v.slice(0, 16), w: o.n.w }
    hit.st = num(o.st) ? Math.max(0, Math.min(10, o.st!)) : 0
  }
  if (Array.isArray(o.sh) && o.sh.length === 3 && o.sh.every(num)) hit.sh = [Math.max(0, Math.min(30, o.sh[0])), Math.max(0, Math.min(1, o.sh[1])), Math.max(0, Math.min(1000, o.sh[2]))]
  return Math.abs(hit.x) < LIMIT && Math.abs(hit.y) < LIMIT ? hit : null
}

export function cleanShot(s: unknown, items: Record<string, unknown>): NetShot | null {
  const o = s as Record<string, unknown> | null
  if (!o || typeof o !== 'object' || typeof o.i !== 'string' || !(o.i in items)) return null
  const all = (...keys: string[]) => keys.every(k => num(o[k]) && Math.abs(o[k] as number) < LIMIT)
  if (o.k === 'b' && all('x', 'y', 'vx', 'vy', 'sz', 'dr', 'rg', 'fu', 'bo', 'ex', 'pi')) {
    const shot = { ...(o as NetShot & { k: 'b' }) }
    shot.rg = Math.min(shot.rg, 20000); shot.fu = Math.min(shot.fu, 30); shot.ex = Math.min(shot.ex, 1000)
    if (shot.n && !(typeof shot.n === 'object' && num(shot.n.m) && typeof shot.n.c === 'string')) delete shot.n
    return shot
  }
  if (o.k === 't' && all('x1', 'y1', 'x2', 'y2')) return o as NetShot
  if (o.k === 'th' && all('x', 'y', 'vx', 'vy', 'sp', 'a')) return o as NetShot
  if (o.k === 'z' && Array.isArray(o.p) && o.p.length >= 5 && o.p.length <= 5 * 48 && o.p.length % 5 === 0 && o.p.every(v => num(v) && Math.abs(v as number) < LIMIT)) return { k: 'z', i: o.i as ItemId, p: o.p as number[], s: o.s ? 1 : 0 }
  if (o.k === 'cd' && all('c', 'r', 'x', 'y', 'tx', 'ty', 'sp')) return { k: 'cd', i: o.i as ItemId, c: o.c as number, r: Math.max(0, Math.min(13, Math.round(o.r as number))), x: o.x as number, y: o.y as number, tx: o.tx as number, ty: o.ty as number, sp: Math.max(100, Math.min(4000, o.sp as number)), ...(typeof o.col === 'string' && /^#[0-9a-f]{3,8}$/i.test(o.col) ? { col: o.col } : {}) }
  if (o.k === 'cb' && num(o.c)) return { k: 'cb', i: o.i as ItemId, c: o.c as number }
  if (o.k === 'cx' && all('c', 'x', 'y', 'rd')) {
    const n = o.n as { m?: unknown; c?: unknown; v?: unknown } | undefined
    return { k: 'cx', i: o.i as ItemId, c: o.c as number, x: o.x as number, y: o.y as number, rd: Math.max(0, Math.min(1000, o.rd as number)), ...(n && typeof n === 'object' && num(n.m) && typeof n.c === 'string' && typeof n.v === 'string' ? { n: { m: n.m as number, c: n.c, v: n.v } } : {}) }
  }
  if (o.k === 'hm' && all('x', 'y', 'a', 'sp', 'rg')) return { k: 'hm', i: o.i as ItemId, x: o.x as number, y: o.y as number, a: o.a as number, sp: Math.max(100, Math.min(4000, o.sp as number)), rg: Math.max(0, Math.min(6000, o.rg as number)) }
  return null
}

export function cleanSpawn(s: unknown): NetSpawn | null {
  const o = s as NetSpawn | null
  if (!o || typeof o !== 'object' || !['aliens', 'zombies', 'alien', 'zombie'].includes(o.what) || ![o.x, o.y, o.l, o.r].every(num)) return null
  return { what: o.what, x: o.x, y: o.y, l: o.l, r: Math.max(o.l + 100, o.r), n: num(o.n) ? Math.max(1, Math.min(24, Math.round(o.n!))) : undefined }
}
