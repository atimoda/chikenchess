// The Mesas de chickenchess of the Pátio open in this browser (lib/pigchicken/chess-table.ts has their rules): where
// they stand, the options picked on each one (by a slam on its top: they last while the Pátio is open, over the ones
// its element saves), each one's queue, the match of this screen and the Chaves de ouro it won. Runtime only. The
// Parquinho says where the tables are and brings Usar, the slams and the players (components/pigchicken/chess-table-
// play.ts); the match over the Pátio reads it and says how it ended (components/pigchicken/patio-chess.tsx).
import {
  CHESS_RANDOM, chessEnd, chessPlayers, chessTick, chessUse, chessLeave, chessWinner, idleChessTable, nextChessOption,
  type ChessOption, type ChessSide, type ChessTableParams, type ChessTableState,
} from './chess-table'

// a table in the world: its element's box (world units) and the options it saves
export type ChessTableBox = { id: string; x: number; y: number; w: number; h: number; params: ChessTableParams }
// the match of this screen: at which table, in which city (a random one picked when the count starts), who plays
export type ChessMatch = { id: string; serial: number; tableId: string; city: string; white: string | null; black: string | null; hotseat: boolean; phase: 'countdown' | 'playing'; since: number; result: 'w' | 'b' | 'draw' | null }

let boxes: ChessTableBox[] = []
const states = new Map<string, ChessTableState>()
const picked = new Map<string, ChessTableParams>()
// when each option of each table last changed (performance.now ms): its tag's flip and the city's photo
const changedAt = new Map<string, number>()
let match: ChessMatch | null = null
let serial = 0
// the players of this screen who won a Chave de ouro and still have to get it
const rewards: string[] = []
// where the one who listens is (the first player's body, world units): how loud the match's music is
let listener = { x: 0, y: 0 }
let cityIds: readonly string[] = []
let version = 0
const listeners = new Set<() => void>()
const emit = () => { version++; listeners.forEach(f => f()) }

export const chessTableStore = {
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f) } },
  version: () => version,
  get boxes() { return boxes as readonly ChessTableBox[] },
  get match() { return match },
  get listener() { return listener },
  state: (id: string): ChessTableState => states.get(id) ?? idleChessTable(),
  // the options a table plays with now
  params: (id: string): ChessTableParams => picked.get(id) ?? boxes.find(b => b.id === id)?.params ?? { city: CHESS_RANDOM, radius: 0 },
  changedAt: (id: string, option: ChessOption) => changedAt.get(`${id}:${option}`) ?? -Infinity,
}

// the cities a table goes through (the map's, in its order) and a random one of them
export function setChessCities(ids: readonly string[]) { cityIds = ids }
const randomCity = () => cityIds[Math.floor(Math.random() * cityIds.length)] ?? 'dusseldorf'

// the Parquinho: the ones in the world now (a removed one takes its queue and its match along)
export function setChessTables(list: ChessTableBox[]) {
  boxes = list
  let changed = false
  for (const id of [...states.keys()]) if (!list.some(b => b.id === id)) { states.delete(id); picked.delete(id); changed = true }
  if (match && !list.some(b => b.id === match!.tableId)) { match = null; changed = true }
  if (changed) emit()
}
// another Pátio opened: nothing of the last one stays
export function resetChessTables() {
  states.clear(); picked.clear(); changedAt.clear(); rewards.length = 0; match = null
  emit()
}

function startMatch(tableId: string, s: ChessTableState, now: number) {
  const { white, black, hotseat } = chessPlayers(s)
  const city = chessTableStore.params(tableId).city
  match = {
    id: `${tableId}:${++serial}`, serial, tableId, city: city === CHESS_RANDOM ? randomCity() : city,
    white: white && 'who' in white ? white.who : null, black: black && 'who' in black ? black.who : null,
    hotseat, phase: 'countdown', since: now, result: null,
  }
}

// Usar on a stool: joins, leaves, starts against the bot or takes the bot's place. One match at a time on this
// screen: two ready at another table wait for it to end. Joining this table's queue leaves any other one.
export function chessTableUse(id: string, side: ChessSide, who: string, now: number) {
  const s = chessTableStore.state(id)
  let next = chessUse(s, side, who, now)
  if (next === s) return false
  if (next.phase === 'countdown' && match) next = { ...next, phase: 'idle' }
  // she stands in one queue only
  if (next.phase === 'idle' && next.seats.some(o => o && 'who' in o && o.who === who)) {
    for (const [other, st] of states) if (other !== id) states.set(other, chessLeave(st, who))
  }
  states.set(id, next)
  if (next.phase === 'countdown') startMatch(id, next, now)
  // the bot's place taken: the match goes on between two players of this screen
  if (match && match.tableId === id && next.phase !== 'idle') {
    const { white, black, hotseat } = chessPlayers(next)
    match = { ...match, white: white && 'who' in white ? white.who : null, black: black && 'who' in black ? black.who : null, hotseat }
  }
  emit()
  return true
}
// once a frame: the count goes on, two ready at a free table start once no match is on, and the queue loses whoever
// went away (`near`: whether a player of this screen is still by that table)
export function stepChessTables(now: number, near: (who: string, box: ChessTableBox) => boolean) {
  let changed = false
  for (const b of boxes) {
    let s = chessTableStore.state(b.id)
    if (s.phase === 'idle') {
      for (const o of s.seats) if (o && 'who' in o && !near(o.who, b)) s = chessLeave(s, o.who)
      if (!match && s.seats[0] && s.seats[1]) { s = { ...s, phase: 'countdown', since: now }; startMatch(b.id, s, now) }
    }
    const t = chessTick(s, now)
    if (t !== s && match?.tableId === b.id) match = { ...match, phase: 'playing', since: now }
    if (t !== chessTableStore.state(b.id)) { states.set(b.id, t); changed = true }
  }
  if (changed) emit()
}
// a slam on a table's top: its option there goes to the next value (during a match too: a new city changes it)
export function chessTableSlam(id: string, option: ChessOption, now: number) {
  const next = nextChessOption(chessTableStore.params(id), option, cityIds)
  picked.set(id, next)
  changedAt.set(`${id}:${option}`, now)
  if (option === 'city' && match?.tableId === id) match = { ...match, city: next.city === CHESS_RANDOM ? randomCity() : next.city }
  emit()
}
// the match over the Pátio ended (checkmate or draw): the winner of this screen gets a Chave de ouro, once
export function chessMatchResult(matchId: string, result: 'w' | 'b' | 'draw') {
  if (!match || match.id !== matchId || match.result) return
  match = { ...match, result }
  const winner = chessWinner(chessTableStore.state(match.tableId), result)
  if (winner) rewards.push(winner)
  emit()
}
// the players left the match (its back button): the table is free again
export function chessMatchExit(matchId: string, now = 0) {
  if (!match || match.id !== matchId) return
  states.set(match.tableId, chessEnd(now))
  match = null
  emit()
}
// the Chaves de ouro still to give, once each
export function takeChessRewards() { return rewards.length ? rewards.splice(0) : rewards }
// where the one who listens to the match's music is
export function setChessListener(x: number, y: number) { listener = { x, y } }
