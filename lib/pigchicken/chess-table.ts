// The Mesa de chickenchess: a little table with a chickenchess board on it and a stool at each side, an element of the
// Pátio's layout (Modo editor → Jogos). Two players (or a player and a bot) get on the stools, join its queue with
// Usar and play a chickenchess match over the Pátio; whoever wins gets a Chave de ouro. Its options (the year and
// city of the match, how far its music is heard) are tags under the table's top that a slam on the top steps
// through. Pure: its params, its shape, its options, its queue and how loud its music is; the runtime is in
// chess-table-store.ts, the frame in components/pigchicken/chess-table-play.ts, the drawing in
// components/pigchicken/draw/chess-table.ts and the match over the Pátio in components/pigchicken/patio-chess.tsx.

import { msg, t } from '../i18n'

// ---------- params ----------

// "Ano/cidade": a city of the chickenchess map by its id, or 'random' (a new one at each match)
export const CHESS_RANDOM = 'random'
// "Raio do som": how far from the table its music is heard (world units); 0 turns the music off
export const CHESS_RADII = [0, 400, 800, 1200, 1600, 2400, 3200] as const
export const CHESS_RADIUS_DEFAULT = 1200
export type ChessTableParams = { city: string; radius: number }
export const defaultChessTable = (): ChessTableParams => ({ city: CHESS_RANDOM, radius: CHESS_RADIUS_DEFAULT })
export function normalizeChessTable(raw: unknown): ChessTableParams {
  const p = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const city = typeof p.city === 'string' && /^[a-z0-9-]{1,60}$/.test(p.city) ? p.city : CHESS_RANDOM
  const radius = typeof p.radius === 'number' && (CHESS_RADII as readonly number[]).includes(p.radius) ? p.radius : CHESS_RADIUS_DEFAULT
  return { city, radius }
}

// ---------- shape (element units, the box's top left at 0,0; its bottom stands on the floor) ----------

export const CHESS_TABLE_BOX = { w: 440, h: 190 } as const
// the stools: their left edges, width and the height of their tops over the floor
export const CHESS_STOOL = { w: 56, h: 42, at: [28, 356] as const }
// the table: its legs and top between l and r, the top's upper face `top` over the floor, `board` thick
export const CHESS_TOP = { l: 106, r: 334, top: 92, board: 14 } as const
// the tags under the top: how tall they are
export const CHESS_TAG_H = 18

export type ChessSide = 0 | 1
// one stool in the world: its top's span and height, and the seat where a player of the match sits
export function chessStool(el: { x: number; y: number; w: number; h: number }, side: ChessSide) {
  const l = el.x + CHESS_STOOL.at[side], floor = el.y + el.h
  return { l, r: l + CHESS_STOOL.w, top: floor - CHESS_STOOL.h, floor, cx: l + CHESS_STOOL.w / 2, face: side === 0 ? 1 : -1 }
}
// the table's top in the world
export function chessTop(el: { x: number; y: number; w: number; h: number }) {
  const floor = el.y + el.h
  return { l: el.x + CHESS_TOP.l, r: el.x + CHESS_TOP.r, top: floor - CHESS_TOP.top, bottom: floor - CHESS_TOP.top + CHESS_TOP.board, floorY: floor }
}

// the options under the top: the city on its left half, the radius on its right half
export type ChessOption = 'city' | 'radius'
export const CHESS_OPTIONS: readonly ChessOption[] = ['city', 'radius']
// which option a slam at world x on the top steps (null: off the top)
export function chessSlamOption(el: { x: number; y: number; w: number; h: number }, x: number): ChessOption | null {
  const t = chessTop(el)
  if (x < t.l || x > t.r) return null
  return x < (t.l + t.r) / 2 ? 'city' : 'radius'
}
// whether a body landing at (x, y) (world) landed on the top
export function onChessTop(el: { x: number; y: number; w: number; h: number }, x: number, y: number) {
  const t = chessTop(el)
  return x >= t.l && x <= t.r && Math.abs(y - t.top) <= 4
}
// the next value of an option: Random, then each city in the list's order (the list of ids comes from the map), and
// back to Random; the radius goes up its steps and back to 0
export function nextChessOption(p: ChessTableParams, option: ChessOption, cities: readonly string[]): ChessTableParams {
  if (option === 'radius') {
    const i = (CHESS_RADII as readonly number[]).indexOf(p.radius)
    return { ...p, radius: CHESS_RADII[(i + 1) % CHESS_RADII.length] }
  }
  const order = [CHESS_RANDOM, ...cities]
  const i = order.indexOf(p.city)
  return { ...p, city: order[(i + 1) % order.length] }
}
export const chessRadiusLabel = (r: number) => (r <= 0 ? t('som desligado') : t('raio {r}', { r }))

// ---------- the queue ----------

// who is on a stool's side of the match: a player of this screen (by the Parquinho's id) or the bot
export type ChessOccupant = { who: string } | { bot: true }
export const isBot = (o: ChessOccupant | null | undefined): o is { bot: true } => !!o && 'bot' in o
export const whoOf = (o: ChessOccupant | null | undefined) => (o && 'who' in o ? o.who : null)
export type ChessPhase = 'idle' | 'countdown' | 'playing'
export type ChessTableState = { seats: [ChessOccupant | null, ChessOccupant | null]; phase: ChessPhase; since: number }
export const idleChessTable = (now = 0): ChessTableState => ({ seats: [null, null], phase: 'idle', since: now })
// the count before the board comes in (3, 2, 1), ms
export const CHESS_COUNTDOWN_MS = 3000
// how far from the table's middle a player in its queue may go before leaving it (world units)
export const CHESS_QUEUE_REACH = 700

// what Usar does for a player standing on a stool now (null: nothing, and no hint)
export type ChessPrompt = 'join' | 'leave' | 'bot' | 'replace'
export const CHESS_PROMPT_LABELS: Record<ChessPrompt, string> = {
  join: msg('Entrar na fila'), leave: msg('Sair da fila'), bot: msg('Iniciar contra um bot'), replace: msg('Entrar no lugar do bot'),
}
export function chessPrompt(s: ChessTableState, side: ChessSide, who: string): ChessPrompt | null {
  const here = s.seats[side], there = s.seats[side === 0 ? 1 : 0]
  if (s.phase === 'idle') {
    if (whoOf(here) === who) return 'leave'
    if (here) return null
    // ready on the other stool and come over to this one: a match against a bot
    if (whoOf(there) === who) return 'bot'
    return 'join'
  }
  // a match against a bot: a player not in it takes the bot's place
  if (isBot(here) && whoOf(there) !== who) return 'replace'
  return null
}
// Usar on a stool: the next state (the same one when it does nothing). A player is in one queue at a time: joining
// this one takes her out of another table's queue elsewhere (chess-table-store.ts)
export function chessUse(s: ChessTableState, side: ChessSide, who: string, now: number): ChessTableState {
  const prompt = chessPrompt(s, side, who)
  if (!prompt) return s
  const seats: ChessTableState['seats'] = [...s.seats]
  if (prompt === 'leave') { seats[side] = null; return { ...s, seats } }
  if (prompt === 'replace') { seats[side] = { who }; return { ...s, seats } }
  seats[side] = prompt === 'bot' ? { bot: true } : { who }
  // both sides taken: the count starts
  return seats[0] && seats[1] ? { seats, phase: 'countdown', since: now } : { ...s, seats }
}
// the count over: the match is on
export function chessTick(s: ChessTableState, now: number): ChessTableState {
  return s.phase === 'countdown' && now - s.since >= CHESS_COUNTDOWN_MS ? { ...s, phase: 'playing', since: now } : s
}
// a player of the queue went away (too far, left the Pátio): her stool is free again; a match does not end so
export function chessLeave(s: ChessTableState, who: string): ChessTableState {
  if (s.phase !== 'idle' || !s.seats.some(o => whoOf(o) === who)) return s
  return { ...s, seats: [whoOf(s.seats[0]) === who ? null : s.seats[0], whoOf(s.seats[1]) === who ? null : s.seats[1]] }
}
// the match over (or left): the table is free
export const chessEnd = (now: number): ChessTableState => idleChessTable(now)
// the players of the match, white first (the left stool plays the white pieces)
export function chessPlayers(s: ChessTableState) {
  return { white: s.seats[0], black: s.seats[1], hotseat: !isBot(s.seats[0]) && !isBot(s.seats[1]) }
}
// who wins the Chave de ouro: the player of this screen on the winning side (none against a draw or the bot winning)
export function chessWinner(s: ChessTableState, result: 'w' | 'b' | 'draw'): string | null {
  if (result === 'draw') return null
  return whoOf(s.seats[result === 'w' ? 0 : 1])
}

// ---------- its music ----------

// how loud the match's music is for whoever listens at distance d from the table's middle: full inside half the
// radius, fading out to nothing at the radius; radius 0: off
export function chessVolume(radius: number, d: number) {
  if (radius <= 0) return 0
  const inner = radius / 2
  if (d <= inner) return 1
  if (d >= radius) return 0
  const k = (d - inner) / (radius - inner)
  return 1 - k * k * (3 - 2 * k)
}
