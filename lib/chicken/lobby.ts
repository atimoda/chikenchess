// Players and lobby of the Pátio: who is in it (local players on this computer, online players, bots), which input
// device drives each local player, who owns the lobby and who may edit the Pátio in Edit mode.
//
// Pure state functions (tested in tests/chicken-lobby.cases.cjs) plus a small store kept in this browser. The online
// side (joining public lobbies, invites, other players) is a stub until the Supabase project is back: the store only
// ever holds this computer's players for now.
import type { ChickenLook } from './look-art'
import { sortDevices, isPadDevice, type InputDeviceId } from './input-devices'

export const LOBBY_MAX = 13
export type LobbyMode = 'local' | 'online'
export type LobbyPlayerKind = 'local' | 'online' | 'bot'

export type LobbyPlayer = {
  id: string
  kind: LobbyPlayerKind
  // shown name: the logged account's nickname for the first local player, "Player N" for the others
  name: string
  // when they entered the lobby (ms): the oldest one present owns the lobby
  joinedAt: number
  // local players: the devices that drive them (one device belongs to one player at most)
  inputs: InputDeviceId[]
  // online players: the kind of input they use, only shown
  inputLabel?: string
  // a look of their own (local players after the first); the first follows the central configuration / vestiário
  look?: ChickenLook
  userId?: string
}

// Pátio and lobby are the same thing: one world with its players.
// public: listed for others (the lobby switcher); online: someone is playing in it right now. When the last
// online player leaves, it goes offline, and only comes back when someone enters it and makes it public again.
export type LobbyVisibility = 'public' | 'private'
export type LobbyStatus = 'online' | 'offline'

export type LobbyState = {
  id: string
  mode: LobbyMode
  visibility?: LobbyVisibility
  status?: LobbyStatus
  createdAt: number
  // the oldest player present (bots never own a lobby)
  ownerId: string | null
  // the account that created this Pátio (null: the default Pátio, edited only by the admin)
  creatorId?: string | null
  // who may edit the Pátio while Edit mode is on; reset to only the owner whenever the owner changes
  editors: string[]
  players: LobbyPlayer[]
}

let seq = 0
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}${Math.random().toString(36).slice(2, 6)}`

export function createLobby(me: { name: string; userId?: string }, devices: InputDeviceId[], now = Date.now(), mode: LobbyMode = 'local'): LobbyState {
  const p1: LobbyPlayer = { id: newId('p'), kind: 'local', name: me.name, joinedAt: now, inputs: sortDevices(devices), userId: me.userId }
  return { id: newId('lobby'), mode, createdAt: now, ownerId: p1.id, editors: [p1.id], players: [p1] }
}

// the oldest player present who is not a bot
export function lobbyOwner(players: LobbyPlayer[]) {
  return players.filter(p => p.kind !== 'bot').reduce<LobbyPlayer | null>((best, p) => (!best || p.joinedAt < best.joinedAt ? p : best), null)
}

// The owner follows the oldest player; when it changes, only the new owner can edit again.
export function reconcileOwner(s: LobbyState): LobbyState {
  const owner = lobbyOwner(s.players)?.id ?? null
  const editors = s.editors.filter(id => s.players.some(p => p.id === id))
  if (owner === s.ownerId) return editors.length === s.editors.length ? s : { ...s, editors }
  return { ...s, ownerId: owner, editors: owner ? [owner] : [] }
}

export const isOwner = (s: LobbyState, playerId: string | null | undefined) => !!playerId && s.ownerId === playerId
export const canEditPatio = (s: LobbyState, playerId: string | null | undefined) => !!playerId && s.editors.includes(playerId)
// The editor panel follows the Pátio, in any mode (local, online, offline): the admin, the Pátio's creator and the
// players the owner marked in Edit mode edit it. The default Pátio (no creator) is only the admin's: everyone else
// opens a new Pátio (a clone of the default) and becomes its creator.
export function canUseEditor(s: LobbyState, playerId: string | null | undefined, opts: { isAdmin?: boolean } = {}) {
  if (opts.isAdmin) return true
  if (!playerId || !s.creatorId) return false
  const p = s.players.find(x => x.id === playerId)
  return (!!p?.userId && p.userId === s.creatorId) || s.editors.includes(playerId)
}
export const localPlayers = (s: LobbyState) => s.players.filter(p => p.kind === 'local')
// "Player 1": the first local player, the person at this computer
export const firstLocal = (s: LobbyState) => localPlayers(s)[0] ?? null

// The device a new local player takes from the first one: a gamepad first, then the secondary keyboard, as long
// as the first player keeps at least one device. None: the new chicken arrives but stands still.
export function spareDevice(s: LobbyState): InputDeviceId | null {
  const p1 = firstLocal(s)
  if (!p1 || p1.inputs.length < 2) return null
  const pads = p1.inputs.filter(isPadDevice)
  // the first player keeps one gamepad if gamepads are all they hold
  const keepsOther = p1.inputs.some(d => !isPadDevice(d))
  if (pads.length && (keepsOther || pads.length > 1)) return pads[pads.length - 1]
  if (p1.inputs.includes('kb2') && p1.inputs.includes('kb1')) return 'kb2'
  return null
}

export type LobbyResult = { ok: true; state: LobbyState; player?: LobbyPlayer } | { ok: false; state: LobbyState; reason: string }

export function addLocalPlayer(s: LobbyState, now = Date.now(), look?: ChickenLook): LobbyResult {
  if (s.players.length >= LOBBY_MAX) return { ok: false, state: s, reason: `O lobby já tem ${LOBBY_MAX} players.` }
  const n = localPlayers(s).length + 1
  const used = new Set(s.players.map(p => p.name))
  let k = n
  while (used.has(`Player ${k}`)) k++
  const spare = spareDevice(s)
  const player: LobbyPlayer = { id: newId('p'), kind: 'local', name: `Player ${k}`, joinedAt: Math.max(now, ...s.players.map(p => p.joinedAt + 1)), inputs: spare ? [spare] : [], look }
  const players = s.players.map(p => (spare && p.inputs.includes(spare) ? { ...p, inputs: p.inputs.filter(d => d !== spare) } : p))
  return { ok: true, state: reconcileOwner({ ...s, players: [...players, player] }), player }
}

// Only the owner removes players (never themselves); a local player's devices go back to the first local player.
export function removePlayer(s: LobbyState, actorId: string, targetId: string): LobbyResult {
  if (!isOwner(s, actorId)) return { ok: false, state: s, reason: 'Só o dono do lobby remove players.' }
  if (actorId === targetId) return { ok: false, state: s, reason: 'O dono não remove a si mesmo.' }
  const target = s.players.find(p => p.id === targetId)
  if (!target) return { ok: false, state: s, reason: 'Player não está no lobby.' }
  let players = s.players.filter(p => p.id !== targetId)
  if (target.kind === 'local' && target.inputs.length) {
    const p1 = players.find(p => p.kind === 'local')
    if (p1) players = players.map(p => (p === p1 ? { ...p, inputs: sortDevices([...p.inputs, ...target.inputs]) } : p))
  }
  return { ok: true, state: reconcileOwner({ ...s, players, editors: s.editors.filter(id => id !== targetId) }) }
}

// A player leaves by themselves (closing the tab, going back to the globe): the oldest one left owns the lobby.
export function leavePlayer(s: LobbyState, playerId: string): LobbyState {
  const players = s.players.filter(p => p.id !== playerId)
  const status: LobbyStatus = players.some(p => p.kind !== 'bot') ? s.status ?? 'online' : 'offline'
  // offline: it is no longer listed as public until someone comes in and opens it again
  const visibility = status === 'offline' ? 'private' : s.visibility
  return reconcileOwner({ ...s, players, status, visibility, editors: s.editors.filter(id => id !== playerId) })
}

// A player in the lobby makes it public (listed, and online again) or private. Only the owner decides.
export function setPublic(s: LobbyState, actorId: string, on: boolean): LobbyResult {
  if (!isOwner(s, actorId)) return { ok: false, state: s, reason: 'Só o dono do lobby abre ou fecha o lobby.' }
  return { ok: true, state: { ...s, visibility: on ? 'public' : 'private', status: on ? 'online' : s.status ?? 'online' } }
}

// Switching lobby (Pátio): every local player of this computer goes together, keeping their devices and looks.
// They arrive now, so the target's oldest player stays its owner; the players already there come from the server.
// target.roster: the players already there (from the server; none while online is a stub)
export function moveLocalsTo(s: LobbyState, target: { id: string; createdAt: number; roster?: LobbyPlayer[] }, now = Date.now()): LobbyState {
  const locals = localPlayers(s).map((p, i) => ({ ...p, joinedAt: now + i }))
  const there = (target.roster ?? []).filter(p => p.kind !== 'local')
  const players = [...there, ...locals].slice(0, LOBBY_MAX)
  return reconcileOwner({ id: target.id, mode: 'online', createdAt: target.createdAt, visibility: 'public', status: 'online', ownerId: null, editors: [], players })
}

// Only the owner changes who may edit; the owner always may.
export function setEditor(s: LobbyState, actorId: string, targetId: string, on: boolean): LobbyResult {
  if (!isOwner(s, actorId)) return { ok: false, state: s, reason: 'Só o dono do lobby muda quem edita.' }
  if (targetId === s.ownerId) return { ok: true, state: s }
  if (!s.players.some(p => p.id === targetId)) return { ok: false, state: s, reason: 'Player não está no lobby.' }
  const editors = on ? [...new Set([...s.editors, targetId])] : s.editors.filter(id => id !== targetId)
  return { ok: true, state: { ...s, editors } }
}

// Gives a device to a local player (taking it from whoever had it). Online players' devices are not ours to change.
export function assignDevice(s: LobbyState, device: InputDeviceId, playerId: string): LobbyResult {
  const target = s.players.find(p => p.id === playerId)
  if (!target || target.kind !== 'local') return { ok: false, state: s, reason: 'Só players locais recebem inputs deste computador.' }
  const players = s.players.map(p => {
    if (p.kind !== 'local') return p
    const rest = p.inputs.filter(d => d !== device)
    return p.id === playerId ? { ...p, inputs: sortDevices([...rest, device]) } : rest.length === p.inputs.length ? p : { ...p, inputs: rest }
  })
  return { ok: true, state: { ...s, players } }
}

// Devices found on this computer that nobody holds yet: with one local player they all go to them; with more,
// to the first local player left without any device (standing still), else to the first.
export function adoptDevices(s: LobbyState, present: InputDeviceId[]): LobbyState {
  const locals = localPlayers(s)
  if (!locals.length) return s
  const held = new Set(locals.flatMap(p => p.inputs))
  const fresh = sortDevices(present.filter(d => !held.has(d)))
  if (!fresh.length) return s
  let state = s
  for (const d of fresh) {
    const now = localPlayers(state)
    const idle = now.find(p => p.inputs.length === 0 && p !== now[0])
    state = assignDevice(state, d, (idle ?? now[0]).id).state
  }
  return state
}

export function renameLocalPlayer(s: LobbyState, playerId: string, name: string): LobbyState {
  return { ...s, players: s.players.map(p => (p.id === playerId && p.kind === 'local' ? { ...p, name } : p)) }
}

export function setPlayerLook(s: LobbyState, playerId: string, look: ChickenLook): LobbyState {
  return { ...s, players: s.players.map(p => (p.id === playerId ? { ...p, look } : p)) }
}

// ---------- the browser's copy ----------
const STORE = 'chickenchess:patio-lobby:v1'
const MODE_STORE = 'chickenchess:patio-entry-mode:v1'

export function loadLobby(): LobbyState | null {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(STORE)
    if (!raw) return null
    const s = JSON.parse(raw) as LobbyState
    if (!s || !Array.isArray(s.players) || !s.players.length) return null
    // online players and bots of a past visit are gone: only this computer's players come back
    const players = s.players.filter(p => p && p.kind === 'local' && typeof p.id === 'string').slice(0, LOBBY_MAX)
      .map(p => ({ ...p, inputs: Array.isArray(p.inputs) ? sortDevices(p.inputs.filter(d => typeof d === 'string') as InputDeviceId[]) : [] }))
    if (!players.length) return null
    return reconcileOwner({ ...s, mode: s.mode === 'online' ? 'online' : 'local', editors: Array.isArray(s.editors) ? s.editors : [], players })
  } catch {
    return null
  }
}
export function saveLobby(s: LobbyState) {
  try { window.localStorage.setItem(STORE, JSON.stringify(s)) } catch { /* storage unavailable */ }
}

// how the globe's portal sends her to the Pátio: a local lobby (default) or the open online one
export function loadEntryMode(): LobbyMode {
  try { return window.localStorage.getItem(MODE_STORE) === 'online' ? 'online' : 'local' } catch { return 'local' }
}
export function saveEntryMode(mode: LobbyMode) {
  try { window.localStorage.setItem(MODE_STORE, mode) } catch { /* storage unavailable */ }
}

// ---------- online (stub until Supabase is back) ----------
export type PublicLobby = { id: string; createdAt: number; players: number; name?: string; visibility?: LobbyVisibility; status?: LobbyStatus }
// the lobby switcher only goes through public lobbies that are online with someone playing
export const switchableLobby = (l: PublicLobby) => (l.visibility ?? 'public') === 'public' && (l.status ?? 'online') === 'online' && l.players > 0
export const ONLINE_UNAVAILABLE = 'Online volta quando o servidor (Supabase) voltar. Por enquanto, só players locais.'

// Public lobbies in the order they were opened. Online: fills the last one with room, else opens a new one.
// Stub: no server yet, so the list is empty and joining fails with ONLINE_UNAVAILABLE.
export async function listPublicLobbies(): Promise<PublicLobby[]> {
  return []
}
export async function joinOpenLobby(): Promise<{ ok: false; reason: string }> {
  return { ok: false, reason: ONLINE_UNAVAILABLE }
}
// the lobby before / after `currentId` in the chronological list (wraps around); null when there is no other
export function neighbourLobby(list: PublicLobby[], currentId: string | null, dir: -1 | 1): PublicLobby | null {
  const open = list.filter(l => switchableLobby(l) || l.id === currentId)
  if (!open.length) return null
  const sorted = [...open].sort((a, b) => a.createdAt - b.createdAt)
  const i = sorted.findIndex(l => l.id === currentId)
  if (i < 0) return dir > 0 ? sorted[0] : sorted[sorted.length - 1]
  if (sorted.length === 1) return null
  return sorted[(i + dir + sorted.length) % sorted.length]
}
export function inviteLink(lobbyId: string, origin = typeof window === 'undefined' ? '' : window.location.origin) {
  return `${origin}/patio?lobby=${encodeURIComponent(lobbyId)}`
}
