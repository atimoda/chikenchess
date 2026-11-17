// The round of the Grade de blocos being played in this browser (lib/pigchicken/mine-round.ts has its rules). Runtime
// only, like the life of the Zonas sonoras: the Pátio saves the grid's settings, never a round. The Pátio's screen
// starts the rounds (components/pigchicken/mine-grid-layer.tsx), the Parquinho brings the notes, the shots and Usar
// (components/pigchicken/mine-grid-play.ts), and both read it from here.
import type { MineGrid, MineGridParams, MineSide } from './mine-grid'
import { mineDo, mineRound, mineTick, type MineAct, type MineEvent, type MineRound } from './mine-round'

let round: MineRound | null = null
let params: MineGridParams | null = null
let version = 0
// the rounds are numbered, for the online Pátio to tell a new one from more of the same one
let roundNo = Math.floor(Math.random() * 1e9)
// the online Pátio, in a browser that does not own the lobby: the round here mirrors the owner's. Nothing changes
// it but what the owner says; what the players here do goes to the owner through `mirror`
let mirror: ((a: MineAct) => void) | null = null
// the other browsers' players who are a Filhote now, as the lobby knows them ('pid:slot')
let netChicks: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()
const watchers = new Set<(events: MineEvent[], round: MineRound) => void>()
const emit = () => { version++; listeners.forEach(f => f()) }

// each local player's side ('p1', 'p2'...), kept by the layer that also gives the walls their key
const sides = new Map<string, MineSide>()
// the local players who are a Filhote now (a bomb killed them)
const chicks = new Set<string>()
// the end of the round's panel was sent away ("Dispensar") in this browser
let dismissed = false
// what the admin asked to see of the round, in this browser only and never saved: the bombs of every block, the
// number of every block
export type MineDebug = { bombs: boolean; numbers: boolean }
let debug: MineDebug = { bombs: false, numbers: false }

// for useSyncExternalStore
export const mineStore = {
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } },
  version: () => version,
  get round() { return round },
  get params() { return params },
  get dismissed() { return dismissed },
  get debug() { return debug },
  side: (who: string): MineSide => sides.get(who) ?? 'open',
  // whether the layer has already read where they are
  hasSide: (who: string) => sides.has(who),
  isChick: (who: string) => chicks.has(who),
  get chicks() { return chicks as ReadonlySet<string> },
  get roundNo() { return roundNo },
  get mirrored() { return !!mirror },
  netChick: (pid: number, slot: number) => netChicks.has(`${pid}:${slot}`),
}

// a new round (another Pátio, "Resetar grade", the grid's shape changed) or none; everyone is an adult again
export function startMineRound(grid: MineGrid | null) {
  round = grid ? mineRound(grid) : null
  roundNo++
  dismissed = false
  chicks.clear()
  emit()
}
// the settings the round reads as it goes (what a note is worth, the detonator's time...), which never restart it
export function setMineParams(p: MineGridParams | null) { params = p }

// something happens to the round: `fn` changes it and says what happened; whoever watches hears of it
export function mineApply(fn: (round: MineRound, params: MineGridParams) => MineEvent[] | 'changed'): MineEvent[] {
  if (!round || !params) return []
  const res = fn(round, params), events = res === 'changed' ? [] : res
  if (res === 'changed' || events.length) emit()
  if (events.length) watchers.forEach(w => w(events, round!))
  return events
}
// one thing a player does to the round: done here, or sent to the lobby's owner when this browser mirrors it
export function mineAct(a: MineAct): MineEvent[] {
  if (mirror) { mirror(a); return [] }
  return mineApply((r, p) => { const events = mineDo(r, p, a); return events.length || a.k !== 'dead' ? events : 'changed' })
}
// mirroring starts (with where what is done here goes) or ends: from then on this browser decides its round again
export function setMineMirror(send: ((a: MineAct) => void) | null) { mirror = send }
// the owner's round, as it arrives. fresh: it is another round (its number), so everyone here is an adult again
export function mineMirrorIn(o: { fresh?: number; change: (round: MineRound) => void; events: MineEvent[] }) {
  if (!round) return
  if (o.fresh !== undefined) { round = mineRound(round.grid); roundNo = o.fresh; dismissed = false; chicks.clear() }
  o.change(round)
  emit()
  if (o.events.length) watchers.forEach(w => w(o.events, round!))
}
export function setMineNetChicks(list: Iterable<string>) {
  const next = new Set(list)
  if (next.size === netChicks.size && [...next].every(k => netChicks.has(k))) return
  netChicks = next
  emit()
}
// what happened in the round (a flag, a block opened, a blast...), for the effects, the deaths and the prizes
export function watchMine(fn: (events: MineEvent[], round: MineRound) => void) { watchers.add(fn); return () => { watchers.delete(fn) } }

// the seesaws that moved are drawn again at most this often (s): a burst of notes is many hits a second
const REDRAW = 0.08
let dirty = false, since = 0
export function mineTouched() { dirty = true }
// once per frame of the world: the flags' hold and the detonators, and the redraw of what the hits moved
export function stepMine(dt: number) {
  if (!round || !params) return
  const counting = round.grid.cells.some(k => k.fuse !== null)
  if (!mirror) mineApply(r => mineTick(r, dt))
  since += dt
  if ((dirty || counting) && since >= REDRAW) { dirty = false; since = 0; emit() }
}

export function setMineSide(who: string, side: MineSide | null) {
  if (side === null) sides.delete(who); else sides.set(who, side)
}
export function setMineChick(who: string, on: boolean) {
  if (on === chicks.has(who)) return
  if (on) chicks.add(who); else chicks.delete(who)
  emit()
}
export function dismissMineEnd() { dismissed = true; emit() }
export function setMineDebug(next: Partial<MineDebug>) { debug = { ...debug, ...next }; emit() }
