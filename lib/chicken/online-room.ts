// The online Pátio from the browser's side: one connection to the game server (server/, Colyseus) for this
// browser's 1 to 4 chickens. It joins the oldest public lobby of a Pátio with a free seat (or a given room, from an
// invite), keeps the room as the server describes it (players, owner, editors, public / private), the latest
// position of every other chicken and of the chicks that follow them, and relays the chat. Nothing here touches
// Supabase.
import { Client, type Room } from '@colyseus/sdk'
import { msg, t as tr } from '../i18n'
import { receiveChickenChat, setChickenChatTransport } from './chat'
import { byteAngle, decodeNetSnapshot, encodeNetState, NET_MAX_BROWSERS, type NetChicken } from './net-protocol'
import type { NetFoes, NetHit, NetShot, NetSpawn } from '../pigchicken/net-world'
import type { NetAct } from '../pigchicken/net-acts'
import type { NetGive, NetSoul, NetTake } from '../pigchicken/net-souls'
import type { NetShareMsg } from '../pigchicken/net-share'
import type { NetStageAct } from '../pigchicken/net-stages'
import type { NetChests } from '../pigchicken/net-chests'
import type { NetCages } from '../pigchicken/cages'
import type { NetMineActs, NetMineState, NetMineWord } from '../pigchicken/net-mine'
import { importChicks, keepChicks, type NetChick, type RemoteChick } from './net-chicks'
import { refreshGameDefaults, setGameDefaultsAnnouncer } from '../game-defaults'
import { refreshChickenConfig } from './config'

/* global process */
// ws(s)://host[:port] of the game server; in development it defaults to the one `cd server && npm start` runs
export const GAME_SERVER_URL = (process.env.NEXT_PUBLIC_GAME_SERVER_URL?.trim() || (process.env.NODE_ENV === 'development' ? 'ws://localhost:2567' : '')).replace(/\/$/, '')
export const gameServerAvailable = () => !!GAME_SERVER_URL
export const ONLINE_OFF = msg('O servidor do modo online ainda não está no ar. Por enquanto, só players locais.')

export type NetPlayer = {
  pid: number; name: string; guest: boolean; userId: string | null; color: number; chickens: number
  looks: (Record<string, string> | null)[]; inputLabel: string; joinedAt: number; protected: boolean
}
export type NetRoomInfo = { roomId: string; patioId: string; name: string | null; public: boolean; ownerPid: number | null; editors: number[]; players: NetPlayer[] }
export type NetStatus = 'off' | 'connecting' | 'online'
export type NetState = { status: NetStatus; info: NetRoomInfo | null; myPid: number | null; notice: string | null }
export type NetLobby = { roomId: string; patioId: string; name: string | null; owner: string | null; players: number; max: number; createdAt: string }
export type RemoteChicken = { x: number; y: number; vx: number; vy: number; face: number; state: number; item: number; aim: number; rot: number; at: number }

let state: NetState = { status: 'off', info: null, myPid: null, notice: null }
// Edit mode live: layouts other browsers edited, and the database revision the owner saved
type LayoutListener = (layout: unknown) => void
type SavedListener = (revision: number) => void
const layoutListeners = new Set<LayoutListener>()
const savedListeners = new Set<SavedListener>()
export function onNetLayout(fn: LayoutListener) { layoutListeners.add(fn); return () => { layoutListeners.delete(fn) } }
export function onNetSaved(fn: SavedListener) { savedListeners.add(fn); return () => { savedListeners.delete(fn) } }
// the shared world (lib/pigchicken/net-world-sync.ts): the owner's enemies, hits and spawns asked of the owner,
// everyone's shots; the souls each browser flies, and the ones asked of it and given (lib/pigchicken/net-souls.ts).
// Unchecked: the listener cleans them.
export type NetWorldMsg =
  | { type: 'foes'; foes: NetFoes }
  | { type: 'hits'; pid: number; list: unknown[] }
  | { type: 'spawn'; pid: number; spawn: unknown }
  | { type: 'shots'; pid: number; list: unknown[] }
  | { type: 'souls'; pid: number; list: unknown[] }
  | { type: 'take'; pid: number; take: unknown }
  | { type: 'give'; pid: number; give: unknown }
  // the Baús another browser opened (o: 1), or the ones open in the owner's world (lib/pigchicken/net-chests.ts)
  | { type: 'chests'; pid: number; chests: unknown }
  // the Gaiolas another browser's chickens carry (lib/pigchicken/cages.ts)
  | { type: 'cages'; pid: number; list: unknown }
  // the round of the Grade de blocos: the owner's, or what another browser's players did (lib/pigchicken/net-mine.ts)
  | { type: 'mine'; pid: number; mine: unknown }
  // the house each of another browser's chickens is inside of (lib/pigchicken/house-rooms.ts)
  | { type: 'houses'; pid: number; list: unknown }
  // what lies in the owner's world for everyone, or (to the owner) what another browser took or dropped
  // (lib/pigchicken/net-share.ts)
  | { type: 'share'; pid: number; share: unknown }
type WorldListener = (m: NetWorldMsg) => void
const worldListeners = new Set<WorldListener>()
export function onNetWorld(fn: WorldListener) { worldListeners.add(fn); return () => { worldListeners.delete(fn) } }
const toWorld = (m: NetWorldMsg) => worldListeners.forEach(fn => fn(m))
let room: Room | null = null
let seq = 0
// what the server says it relays beyond its first messages (an older one says nothing: a message it does not know
// would close the connection, so those are only sent to a server that asked for them)
let caps: Record<string, unknown> = {}
export const netCan = (cap: 'souls' | 'chicks' | 'chests' | 'cages' | 'mine' | 'houses' | 'defaults' | 'share') => !!caps[cap]
const listeners = new Set<() => void>()
const remotes = new Map<string, RemoteChicken>()
// the other browsers' chicks (lib/chicken/net-chicks.ts), by pid and number
const chicks = new Map<string, RemoteChick>()
const set = (patch: Partial<NetState>) => { state = { ...state, ...patch }; listeners.forEach(fn => fn()) }

export const getNetState = () => state
export function subscribeNet(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn) } }
export const netChatPlayer = (pid: number) => `net:${pid}`

/** where another browser's chicken is now: the latest snapshot moved on by its speed (at most 0.15 s ahead);
 * clinging, her speed runs along the surface she holds (rot) */
export function remoteChicken(pid: number, slot: number, now = performance.now()): RemoteChicken | null {
  const r = remotes.get(`${pid}:${slot}`)
  if (!r) return null
  const ahead = Math.min(0.15, (now - r.at) / 1000), phi = byteAngle(r.rot)
  if (phi !== null) return { ...r, x: r.x + Math.cos(phi) * r.vx * ahead, y: r.y + Math.sin(phi) * r.vx * ahead }
  return { ...r, x: r.x + r.vx * ahead, y: r.y + r.vy * ahead }
}

/** the other browsers' chicks, as last heard of (chickAt says where each one is now) */
export const remoteChicks = (): ReadonlyMap<string, RemoteChick> => chicks
/** a chick this browser asked its own for stays out of sight until the answer has had time */
export function hideRemoteChick(key: string, seconds: number, now = performance.now()) {
  const c = chicks.get(key)
  if (c) c.hidden = now + seconds * 1000
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
  if (!GAME_SERVER_URL) return { ok: false, reason: tr(ONLINE_OFF) }
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
    return { ok: false, reason: /full|locked/i.test(m) ? tr('Este lobby já tem {max} navegadores.', { max: NET_MAX_BROWSERS }) : /not found/i.test(m) ? tr('Esse lobby não existe mais.') : tr('Não foi possível entrar no modo online agora.') }
  }
}

function attach(r: Room) {
  room = r
  remotes.clear(); chicks.clear()
  caps = {}
  r.onMessage('hello', (m: { pid: number; room: NetRoomInfo; caps?: Record<string, unknown> }) => { caps = m.caps && typeof m.caps === 'object' ? m.caps : {}; set({ status: 'online', myPid: m.pid, info: m.room }) })
  r.onMessage('room', (info: NetRoomInfo) => {
    // chickens of browsers that left (or fewer chickens now) stop being drawn
    const alive = new Set(info.players.flatMap(p => Array.from({ length: p.chickens }, (_, s) => `${p.pid}:${s}`)))
    for (const k of [...remotes.keys()]) if (!alive.has(k)) remotes.delete(k)
    keepChicks(chicks, new Set(info.players.map(p => p.pid)))
    set({ info })
  })
  r.onMessage('w', (bytes: Uint8Array) => {
    const at = performance.now()
    for (const e of decodeNetSnapshot(new Uint8Array(bytes)).entries) {
      if (e.pid === state.myPid) continue
      remotes.set(`${e.pid}:${e.slot}`, { x: e.x, y: e.y, vx: e.vx, vy: e.vy, face: e.face, state: e.state, item: e.item, aim: e.aim, rot: e.rot, at })
    }
  })
  r.onMessage('chat', (m: { pid: number; text: string }) => {
    if (m.pid === state.myPid) return
    const who = state.info?.players.find(p => p.pid === m.pid)
    receiveChickenChat({ player: netChatPlayer(m.pid), text: m.text, name: who?.name })
  })
  r.onMessage('layout', (m: { layout: unknown }) => layoutListeners.forEach(fn => fn(m.layout)))
  r.onMessage('saved', (m: { revision: number }) => savedListeners.forEach(fn => fn(m.revision)))
  r.onMessage('defaults', (m: { parts?: unknown }) => readSavedDefaults(Array.isArray(m?.parts) ? m.parts : []))
  r.onMessage('foes', (m: NetFoes) => toWorld({ type: 'foes', foes: m }))
  r.onMessage('hits', (m: { pid: number; list: unknown[] }) => { if (Array.isArray(m?.list)) toWorld({ type: 'hits', pid: m.pid, list: m.list }) })
  r.onMessage('spawn', (m: { pid: number; spawn: unknown }) => toWorld({ type: 'spawn', pid: m?.pid, spawn: m?.spawn }))
  r.onMessage('shots', (m: { pid: number; list: unknown[] }) => { if (m?.pid !== state.myPid && Array.isArray(m?.list)) toWorld({ type: 'shots', pid: m.pid, list: m.list }) })
  r.onMessage('souls', (m: { pid: number; l: unknown[] }) => { if (m?.pid !== state.myPid && Array.isArray(m?.l)) toWorld({ type: 'souls', pid: m.pid, list: m.l }) })
  r.onMessage('chicks', (m: { pid: number; l: unknown[] }) => { if (m?.pid !== state.myPid && state.info?.players.some(p => p.pid === m?.pid)) importChicks(chicks, m.pid, m.l, performance.now()) })
  r.onMessage('take', (m: { pid: number; take: unknown }) => toWorld({ type: 'take', pid: m?.pid, take: m?.take }))
  r.onMessage('give', (m: { pid: number; give: unknown }) => toWorld({ type: 'give', pid: m?.pid, give: m?.give }))
  r.onMessage('cages', (m: { pid: number; l: unknown }) => { if (m?.pid !== state.myPid) toWorld({ type: 'cages', pid: m?.pid, list: m?.l }) })
  r.onMessage('mine', (m: { pid: number; m: unknown }) => { if (m?.pid !== state.myPid) toWorld({ type: 'mine', pid: m?.pid, mine: m?.m }) })
  r.onMessage('houses', (m: { pid: number; l: unknown }) => { if (m?.pid !== state.myPid) toWorld({ type: 'houses', pid: m?.pid, list: m?.l }) })
  r.onMessage('chests', (m: { pid: number; l: unknown; o?: unknown }) => { if (m?.pid !== state.myPid) toWorld({ type: 'chests', pid: m?.pid, chests: { l: m?.l, o: m?.o } }) })
  r.onMessage('share', (m: { pid: number; m: unknown }) => { if (m?.pid !== state.myPid) toWorld({ type: 'share', pid: m?.pid, share: m?.m }) })
  r.onMessage('denied', (m: { reason: string }) => set({ notice: m.reason }))
  r.onMessage('kicked', (m: { reason: string }) => set({ notice: m.reason }))
  r.onLeave(() => {
    if (room !== r) return
    room = null; caps = {}; remotes.clear(); chicks.clear(); setChickenChatTransport(null)
    set({ status: 'off', info: null, myPid: null })
  })
  // this screen's messages go to the room too (the server sends them to everyone else)
  setChickenChatTransport(msg => r.send('chat', { text: msg.text }))
}

export async function leavePatioOnline() {
  const r = room
  room = null; caps = {}
  remotes.clear(); chicks.clear()
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
// Edit mode: the layout after an edit (owner or editor) and the revision the owner just saved
export const sendNetLayout = (layout: unknown) => room?.send('layout', { layout })
export const sendNetSaved = (revision: number) => room?.send('saved', { revision })
// "Salvar no game" by an admin in this room: the others read the saved parts again now (known revisions go along, so
// only what changed comes back), instead of on their next visit or the 5-minute check (hooks/use-game-defaults.ts)
export const sendNetDefaults = (part: string) => (netCan('defaults') ? room : null)?.send('defaults', { part })
setGameDefaultsAnnouncer(sendNetDefaults)
function readSavedDefaults(parts: unknown[]) {
  if (parts.some(p => p !== 'chicken')) void refreshGameDefaults(true)
  if (parts.includes('chicken')) void refreshChickenConfig(true)
}
// the shared world: the owner's enemies; hits and spawns for the owner; the shots fired here
const live = () => (room && state.status === 'online' ? room : null)
export const sendNetFoes = (foes: NetFoes) => live()?.send('foes', foes)
export const sendNetHits = (list: NetHit[]) => live()?.send('hits', { list })
export const sendNetSpawn = (spawn: NetSpawn) => live()?.send('spawn', { spawn })
// (the players' acts, lib/pigchicken/net-acts.ts, go in the same list)
export const sendNetShots = (list: (NetShot | NetAct | NetStageAct)[]) => live()?.send('shots', { list })
// the souls flying free: the ones this browser flies; one asked of the browser `to`; one given to it
const soulful = () => (netCan('souls') ? live() : null)
export const sendNetSouls = (l: NetSoul[]) => soulful()?.send('souls', { l })
export const sendNetTake = (to: number, take: NetTake) => soulful()?.send('take', { to, take })
export const sendNetGive = (to: number, give: NetGive) => soulful()?.send('give', { to, give })
// the Baús opened here (o: 1) or, from the owner, every one open in its world
export const sendNetChests = (msg: NetChests) => (netCan('chests') ? live() : null)?.send('chests', msg)
// the Gaiolas each of this browser's chickens carries, as counters
export const sendNetCages = (l: NetCages) => (netCan('cages') ? live() : null)?.send('cages', { l })
// the round of the Grade de blocos: the owner's round, or what this browser's players did to it
export const sendNetMine = (m: NetMineState | NetMineActs | NetMineWord) => (netCan('mine') ? live() : null)?.send('mine', { m })
// the house each of this browser's chickens is inside of ('' outside), in their slots' order
export const sendNetHouses = (l: string[]) => (netCan('houses') ? live() : null)?.send('houses', { l })
// what lies in the owner's world: the owner's, to everyone else or to the browser `to`; another browser's, to the owner
export const sendNetShare = (m: NetShareMsg, to?: number) => (netCan('share') ? live() : null)?.send('share', to === undefined ? { m } : { m, to })
// the chicks that follow this browser's first chicken (an empty list: none left)
export const sendNetChicks = (l: NetChick[]) => (netCan('chicks') ? live() : null)?.send('chicks', { l })

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
