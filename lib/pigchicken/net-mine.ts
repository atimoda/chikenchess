// The round of the Grade de blocos in the online Pátio, as data (lib/pigchicken/mine-round.ts has the rules). Pure
// functions on the round, so both sides and the tests use the same code; lib/pigchicken/net-mine-sync.ts moves them
// through the game server.
//
// Who decides what:
// - the lobby's owner has the round. It sends the blocks that changed ~10 times a second, all of them when someone
//   joins, when a round starts and every few seconds, with what happened (the events), what each player did (the
//   stats) and who is a Filhote;
// - the other browsers mirror it and change nothing by themselves: what their players do (a note or a shot on a
//   wall, Usar at a bomb, a bomb installed, a death) goes to the owner, and comes back in the round;
// - in the wire a player is 'pid:slot' (the browser in the lobby and its chicken's number); inside each browser its
//   own players keep their names ('p1', 'p2'...).
import { mineCell, type MineCell, type MineSide } from './mine-grid'
import type { MineAct, MineBombUse, MineEvent, MineFace, MineRound, MineStats } from './mine-round'
import type { NetMineActivator, NetMineActivatorHits } from './mine-activator'

// a block: [index, bits, gauge, yellow, hold, fuse (-1: none), turn (-1: not drawn yet), who played the last note,
// who shot last, whose bomb]; the names at the end are left out when empty
export type NetMineCell = (number | string)[]
// the owner's round. n: its number; c, r: the grid's columns and rows (another shape is another Pátio's settings: not
// taken); f: every block is in l; st: the stats by player; o: over; e: what happened since the last one; k: Filhotes
// g: the Ativadores de grid de campo minado (mine-activator.ts), which the owner also sends with no round at all
// (NetMineWord)
export type NetMineState = { n: number; c: number; r: number; f?: 1; l: NetMineCell[]; st?: Record<string, number[]>; o?: 1; e?: MineEvent[]; k?: string[]; g?: NetMineActivator }
export type NetMineWord = { g: NetMineActivator }
// what a browser's players did, for the owner, and which of its chickens (by number) are a Filhote
// g: what they poured into the Ativadores; h: its admin hid the grid an Ativador turned on
export type NetMineActs = { a?: MineAct[]; k?: number[]; g?: NetMineActivatorHits; h?: 1 }

export const NET_MINE_CELLS = 4096
export const NET_MINE_ACTS = 64
const EVENTS_MAX = 64, PLAYERS_MAX = 64

const BITS = ['open', 'bomb', 'free', 'flag', 'doubt', 'armed', 'crater'] as const
const STATS: (keyof MineStats)[] = ['music', 'damage', 'opened', 'flags', 'flagsOnBomb', 'doubts', 'solved', 'disarmed', 'installed', 'kills', 'deaths']
const FACES: MineFace[] = ['top', 'bottom', 'left', 'right', 'tl', 'tr', 'bl', 'br']
const USES: MineBombUse[] = ['disarm', 'detonator', 'take', 'arm']
const r3 = (v: number) => Math.round(v * 1000) / 1000
const int = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const NET_ID = /^\d{1,9}:\d$/
const netId = (v: unknown): v is string => typeof v === 'string' && NET_ID.test(v)

// ---------- who is who ----------

// a local player's name in the wire, and back (anyone else's stays as it comes)
export const mineIdOut = (who: string, locals: readonly string[], pid: number) => { const i = locals.indexOf(who); return i < 0 ? who : `${pid}:${i}` }
export const mineIdIn = (id: string, locals: readonly string[], pid: number) => { const [p, slot] = id.split(':'); return Number(p) === pid && locals[Number(slot)] ? locals[Number(slot)] : id }

type Ids = (id: string) => string
export function mapActIds(a: MineAct, f: Ids): MineAct {
  if (a.k === 'dead') return { ...a, who: f(a.who), ...(a.owner ? { owner: f(a.owner) } : {}) }
  return 'by' in a ? { ...a, by: f(a.by) } : a
}
export function mapEventIds(e: MineEvent, f: Ids): MineEvent {
  if (e.kind === 'end' || e.kind === 'shock') return e
  if (e.kind === 'boom') return { ...e, ...(e.by ? { by: f(e.by) } : {}), ...(e.owner ? { owner: f(e.owner) } : {}) }
  return { ...e, by: f(e.by) }
}

// ---------- the blocks ----------

function cellOut(i: number, k: MineCell, ids: Ids): NetMineCell {
  let bits = 0
  BITS.forEach((b, n) => { if (k[b]) bits |= 1 << n })
  const out: NetMineCell = [i, bits, r3(k.gauge), r3(k.yellow), r3(k.hold), k.fuse === null ? -1 : r3(Math.max(0, k.fuse)), k.turn ?? -1, k.by.note ? ids(k.by.note) : '', k.by.shot ? ids(k.by.shot) : '', k.by.bomb ? ids(k.by.bomb) : '']
  while (out[out.length - 1] === '') out.pop()
  return out
}
// the blocks that changed since `sent` (what the others already know), all of them when it is empty
export function exportMineCells(round: MineRound, sent: Map<number, string>, ids: Ids): NetMineCell[] {
  const out: NetMineCell[] = []
  round.grid.cells.forEach((k, i) => {
    const cell = cellOut(i, k, ids), key = JSON.stringify(cell)
    if (sent.get(i) === key) return
    sent.set(i, key)
    out.push(cell)
  })
  return out
}
export function importMineCells(round: MineRound, l: NetMineCell[], ids: Ids) {
  const cells = round.grid.cells
  for (const e of l) {
    const k = cells[e[0] as number]
    if (!k) continue
    const bits = e[1] as number
    BITS.forEach((b, n) => { k[b] = !!(bits & (1 << n)) })
    k.gauge = e[2] as number; k.yellow = e[3] as number; k.hold = e[4] as number
    k.fuse = (e[5] as number) < 0 ? null : (e[5] as number)
    k.turn = (e[6] as number) < 0 ? null : (e[6] as number)
    const by = (v: unknown) => (typeof v === 'string' && v ? ids(v) : undefined)
    k.by = { ...(by(e[7]) ? { note: by(e[7]) } : {}), ...(by(e[8]) ? { shot: by(e[8]) } : {}), ...(by(e[9]) ? { bomb: by(e[9]) } : {}) }
  }
}

// ---------- the stats ----------

export function exportMineStats(stats: Record<string, MineStats>, ids: Ids): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const who of Object.keys(stats)) { const id = ids(who); if (netId(id)) out[id] = STATS.map(s => stats[who][s]) }
  return out
}
export function importMineStats(st: Record<string, number[]>, ids: Ids): Record<string, MineStats> {
  const out: Record<string, MineStats> = {}
  for (const id of Object.keys(st)) out[ids(id)] = Object.fromEntries(STATS.map((s, i) => [s, st[id][i] ?? 0])) as MineStats
  return out
}

// ---------- what the players did ----------

// many notes or shots on the same wall become one, so that a burst is a handful of messages
export function batchMineActs(acts: MineAct[]): MineAct[] {
  const out: MineAct[] = []
  for (const a of acts) {
    const last = out[out.length - 1]
    if (a.k === 'note' && last?.k === 'note' && last.c === a.c && last.r === a.r && last.by === a.by && last.side === a.side && last.face === a.face) last.n = (last.n ?? 1) + (a.n ?? 1)
    else if (a.k === 'shot' && last?.k === 'shot' && last.c === a.c && last.r === a.r && last.by === a.by && last.side === a.side && last.face === a.face) last.d += a.d
    else out.push({ ...a })
  }
  return out
}

// ---------- what arrives, checked ----------

const spot = (o: Record<string, unknown>) => int(o.c, 4095) && int(o.r, 4095)
const face = (v: unknown): MineFace | undefined => (FACES.includes(v as MineFace) ? (v as MineFace) : undefined)

// what a browser's players did. Every player in it must be one of that browser's ('pid:slot' with its pid); only
// the bomb's owner in a death may be someone else.
export function cleanMineActs(raw: unknown, pid: number): NetMineActs | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>, out: NetMineActs = {}
  const own = (v: unknown): v is string => netId(v) && v.startsWith(`${pid}:`)
  if (Array.isArray(m.a)) {
    out.a = []
    for (const x of m.a.slice(0, NET_MINE_ACTS)) {
      if (!x || typeof x !== 'object') continue
      const a = x as Record<string, unknown>
      if (a.k === 'dead') { if (own(a.who)) out.a.push({ k: 'dead', who: a.who, ...(netId(a.owner) ? { owner: a.owner } : {}) }); continue }
      if (!spot(a)) continue
      const at = { c: a.c as number, r: a.r as number }, f = face(a.face)
      if (a.k === 'shock') out.a.push({ k: 'shock', ...at })
      else if (!own(a.by)) continue
      else if (a.k === 'note' && (a.side === 'open' || a.side === 'closed')) out.a.push({ k: 'note', ...at, side: a.side as MineSide, by: a.by, ...(f ? { face: f } : {}), ...(int(a.n, 64) && a.n > 1 ? { n: a.n } : {}) })
      else if (a.k === 'shot' && num(a.d) && a.d > 0) out.a.push({ k: 'shot', ...at, d: Math.min(a.d, 100000), by: a.by, ...(f ? { face: f } : {}), ...(a.side === 'open' || a.side === 'closed' ? { side: a.side as MineSide } : {}) })
      else if (a.k === 'use' && USES.includes(a.use as MineBombUse)) out.a.push({ k: 'use', ...at, use: a.use as MineBombUse, by: a.by })
      else if (a.k === 'install') out.a.push({ k: 'install', ...at, by: a.by, turn: int(a.turn, 359) ? a.turn : null })
    }
  }
  if (Array.isArray(m.k)) out.k = [...new Set(m.k.filter((v): v is number => int(v, 9)))]
  return out.a || out.k ? out : null
}

function cleanEvent(x: unknown): MineEvent | null {
  if (!x || typeof x !== 'object') return null
  const e = x as Record<string, unknown>
  if (e.kind === 'end') return { kind: 'end' }
  if (!spot(e)) return null
  const at = { c: e.c as number, r: e.r as number }, by = typeof e.by === 'string' ? e.by.slice(0, 24) : ''
  switch (e.kind) {
    case 'shock': return { kind: 'shock', ...at }
    case 'flag': return { kind: 'flag', ...at, by, bomb: e.bomb === true }
    case 'doubt': return { kind: 'doubt', ...at, by }
    case 'clear': return { kind: 'clear', ...at, by }
    case 'open': return { kind: 'open', ...at, by, lost: e.lost === true }
    case 'disarm': case 'arm': case 'take': case 'install': case 'detonator': return { kind: e.kind, ...at, by }
    case 'boom': {
      const cells = Array.isArray(e.cells) ? e.cells.slice(0, 9).filter(k => k && typeof k === 'object' && spot(k as Record<string, unknown>)).map(k => ({ c: (k as { c: number }).c, r: (k as { r: number }).r })) : []
      return { kind: 'boom', ...at, ...(by ? { by } : {}), ...(typeof e.owner === 'string' && e.owner ? { owner: e.owner.slice(0, 24) } : {}), contained: e.contained === true, cells }
    }
  }
  return null
}

// the owner's round
export function cleanMineState(raw: unknown): NetMineState | null {
  if (!raw || typeof raw !== 'object') return null
  const m = raw as Record<string, unknown>
  if (!int(m.n, 2 ** 31) || !int(m.c, 4096) || !int(m.r, 4096) || !Array.isArray(m.l) || m.l.length > NET_MINE_CELLS) return null
  const total = m.c * m.r
  const l: NetMineCell[] = []
  for (const x of m.l) {
    if (!Array.isArray(x) || x.length < 7 || x.length > 10 || !int(x[0], total - 1) || !int(x[1], 127)) continue
    if (!num(x[2]) || !num(x[3]) || !num(x[4]) || !num(x[5]) || !num(x[6])) continue
    if (x.slice(7).some(v => typeof v !== 'string' || v.length > 24)) continue
    l.push([x[0], x[1], Math.max(-1, Math.min(1, x[2])), Math.max(0, Math.min(1, x[3])), Math.max(0, Math.min(10, x[4])), Math.max(-1, Math.min(600, x[5])), int(x[6], 359) ? x[6] : -1, ...x.slice(7)])
  }
  const out: NetMineState = { n: m.n, c: m.c, r: m.r, l }
  if (m.f === 1) out.f = 1
  if (m.o === 1) out.o = 1
  if (m.st && typeof m.st === 'object' && !Array.isArray(m.st)) {
    out.st = {}
    for (const id of Object.keys(m.st).slice(0, PLAYERS_MAX)) {
      const v = (m.st as Record<string, unknown>)[id]
      if (netId(id) && Array.isArray(v) && v.length <= STATS.length && v.every(n => num(n) && n >= 0)) out.st[id] = v as number[]
    }
  }
  if (Array.isArray(m.e)) out.e = m.e.slice(0, EVENTS_MAX).map(cleanEvent).filter((e): e is MineEvent => !!e)
  if (Array.isArray(m.k)) out.k = m.k.slice(0, PLAYERS_MAX).filter(netId)
  return out
}

// whether a block of the wire exists in this round (the shapes agree)
export const mineSameShape = (round: MineRound, m: NetMineState) => round.grid.geo.cols === m.c && round.grid.geo.rows === m.r && !!mineCell(round.grid, 0, 0)
