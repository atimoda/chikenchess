// The online Pátio from the browser's side: one connection to the game server (server/, Colyseus) for this
// browser's 1 to 4 chickens. It joins the oldest public lobby of a Pátio with a free seat (or a given room, from an
// invite), keeps the room as the server describes it (players, owner, editors, public / private), the latest
// position of every other chicken, and relays the chat. Nothing here touches Supabase.
import { Client, type Room } from '@colyseus/sdk'
import { receiveChickenChat, setChickenChatTransport } from './chat'
import { decodeNetSnapshot, encodeNetState, NET_MAX_BROWSERS, type NetChicken } from './net-protocol'

/* global process */
// ws(s)://host[:port] of the game server; in development it defaults to the one `cd server && npm start` runs
export const GAME_SERVER_URL = (process.env.NEXT_PUBLIC_GAME_SERVER_URL?.trim() || (process.env.NODE_ENV === 'development' ? 'ws://localhost:2567' : '')).replace(/\/$/, '')
export const gameServerAvailable = () => !!GAME_SERVER_URL
export const ONLINE_OFF = 'O servidor do modo online ainda não está no ar. Por enquanto, só players locais.'

export type NetPlayer = {
  pid: number; name: string; guest: boolean; userId: string | null; color: number; chickens: number
  looks: (Record<string, string> | null)[]; inputLabel: string; joinedAt: number; protected: boolean
}
export type NetRoomInfo = { roomId: string; patioId: string; name: string | null; public: boolean; ownerPid: number | null; editors: number[]; players: NetPlayer[] }
export type NetStatus = 'off' | 'connecting' | 'online'
export type NetState = { status: NetStatus; info: NetRoomInfo | null; myPid: number | null; notice: string | null }
export type NetLobby = { roomId: string; patioId: string; name: string | null; owner: string | null; players: number; max: number; createdAt: string }
export type RemoteChicken = { x: number; y: number; vx: number; vy: number; face: number; state: number; item: number; at: number }

let state: NetState = { status: 'off', info: null, myPid: null, notice: null }
let room: Room | null = null
let seq = 0
const listeners = new Set<() => void>()
const remotes = new Map<string, RemoteChicken>()
const set = (patch: Partial<NetState>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()) }

export const getNetState = () => state
export function subscribeNet(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const netChatPlayer = (pid: number) => `net:${pid}`

/** where another browser's chicken is now: the latest snapshot moved on by its speed (at most 0.15 s ahead) */
export function remoteChicken(pid: number, slot: number, now = performance.now()): RemoteChicken | null {
  const r = remotes.get(`${pid}:${slot}`)
  if (!r) return null
  const ahead = Math.min(0.15, (now - r.at) / 1000)
  return { ...r, x: r.x + r.vx * ahead, y: r.y + r.vy * ahead }
}

export type JoinOptions = {
  patioId?: string | null
  roomId?: string | null
  isPrivate?: boolean
  token?: string | null
  name: string
  chickens: number
  looks?: (Record<string, string> | null)[]
  inputLabel?: string
  // without the server's Supabase (local development) the first browser tells who created the Pátio
  claimed?: { name?: string | null; creatorId?: string | null; godparentId?: string | null }
}

export async function joinPatioOnline(opts: JoinOptions): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!GAME_SERVER_URL) return { ok: false, reason: ONLINE_OFF }
  await leavePatioOnline()
  set({ status: 'connecting', notice: null })
  const options = {
    patioId: opts.patioId ?? undefined, private: opts.isPrivate || undefined, token: opts.token ?? undefined,
    name: opts.name, chickens: opts.chickens, looks: opts.looks, inputLabel: opts.inputLabel, claimed: opts.claimed,
  }
  try {
    const client = new Client(GAME_SERVER_URL)
    const joined = opts.roomId ? await client.joinById(opts.roomId, options) : await client.joinOrCreate('patio', options)
    attach(joined)
    return { ok: true }
  } catch (e) {
    set({ status: 'off', info: null, myPid: null })
    const m = e instanceof Error ? e.message : String(e ?? '')
    return { ok: false, reason: /full|locked/i.test(m) ? `Este lobby já tem ${NET_MAX_BROWSERS} navegadores.` : /not found/i.test(m) ? 'Esse lobby não existe mais.' : 'Não foi possível entrar no modo online agora.' }
  }
}

function attach(r: Room) {
  room = r
  remotes.clear()
  r.onMessage('hello', (m: { pid: number; room: NetRoomInfo }) => set({ status: 'online', myPid: m.pid, info: m.room }))
  r.onMessage('room', (info: NetRoomInfo) => {
    // chickens of browsers that left (or fewer chickens now) stop being drawn
    const alive = new Set(info.players.flatMap(p => Array.from({ length: p.chickens }, (_, s) => `${p.pid}:${s}`)))
    for (const k of [...remotes.keys()]) if (!alive.has(k)) remotes.delete(k)
    set({ info })
  })
  r.onMessage('w', (bytes: Uint8Array) => {
    const at = performance.now()
    for (const e of decodeNetSnapshot(new Uint8Array(bytes)).entries) {
      if (e.pid === state.myPid) continue
      remotes.set(`${e.pid}:${e.slot}`, { x: e.x, y: e.y, vx: e.vx, vy: e.vy, face: e.face, state: e.state, item: e.item, at })
    }
  })
  r.onMessage('chat', (m: { pid: number; text: string }) => {
    if (m.pid === state.myPid) return
    const who = state.info?.players.find(p => p.pid === m.pid)
    receiveChickenChat({ player: netChatPlayer(m.pid), text: m.text, name: who?.name })
  })
  r.onMessage('denied', (m: { reason: string }) => set({ notice: m.reason }))
  r.onMessage('kicked', (m: { reason: string }) => set({ notice: m.reason }))
  r.onLeave(() => {
    if (room !== r) return
    room = null; remotes.clear(); setChickenChatTransport(null)
    set({ status: 'off', info: null, myPid: null })
  })
  // this screen's messages go to the room too (the server sends them to everyone else)
  setChickenChatTransport(msg => r.send('chat', { text: msg.text }))
}

export async function leavePatioOnline() {
  const r = room
  room = null
  remotes.clear()
  setChickenChatTransport(null)
  if (r) { try { await r.leave() } catch { /* already gone */ } }
  if (state.status !== 'off') set({ status: 'off', info: null, myPid: null })
}

/** this browser's chickens, in world units; the caller sends at most 20 times a second */
export function sendOwnChickens(chickens: NetChicken[]) {
  if (!room || state.status !== 'online' || !chickens.length) return
  room.sendBytes('s', encodeNetState(chickens, seq++))
}
export const sendNetProfile = (p: { name?: string; chickens?: number; looks?: (Record<string, string> | null)[]; inputLabel?: string }) => room?.send('profile', p)
export const kickNetPlayer = (pid: number) => room?.send('kick', { pid })
export const setNetPublic = (on: boolean) => room?.send('visibility', { public: on })
export const setNetEditor = (pid: number, on: boolean) => room?.send('editor', { pid, on })
export const clearNetNotice = () => set({ notice: null })

const httpBase = () => GAME_SERVER_URL.replace(/^ws/, 'http')
/** the public lobbies on the server, oldest first (empty when it cannot be reached) */
export async function listNetLobbies(): Promise<NetLobby[]> {
  if (!GAME_SERVER_URL) return []
  try {
    const res = await fetch(`${httpBase()}/lobbies`, { cache: 'no-store' })
    return res.ok ? ((await res.json()) as NetLobby[]) : []
  } catch {
    return []
  }
}
