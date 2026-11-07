// Lobby rules of the online Pátio, kept apart from Colyseus so they can be tested on their own
// (test/rules.test.mjs). A "player" here is one browser: up to 4 chickens, one color, one seat of 13.
import { MAX_BROWSERS, MAX_CHICKENS } from './protocol.mjs'

export const COLORS = 13
export const CHAT_MAX = 140
export const NAME_MAX = 24

const CONTROL = /[\u0000-\u001f\u007f<>]/g
export const cleanName = name => String(name ?? '').replace(CONTROL, '').trim().slice(0, NAME_MAX)
export const cleanChat = text => String(text ?? '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX)
export const clampChickens = n => Math.max(1, Math.min(MAX_CHICKENS, Math.round(Number(n)) || 1))

// The owner: the Pátio's creator when present (an account, never a guest); otherwise whoever has been in the
// lobby the longest. Returns the pid, or null in an empty lobby.
export function ownerOf(players, creatorId) {
  let creator = null, oldest = null
  for (const p of players) {
    if (creatorId && p.userId === creatorId && !p.guest && (!creator || p.joinedAt < creator.joinedAt)) creator = p
    if (!oldest || p.joinedAt < oldest.joinedAt) oldest = p
  }
  return (creator ?? oldest)?.pid ?? null
}

// a browser's color: kept while it stays, a newcomer takes the first free one (0..12)
export function freeColor(players) {
  const taken = new Set(players.map(p => p.color))
  for (let c = 0; c < COLORS; c++) if (!taken.has(c)) return c
  return players.length % COLORS
}

// pid: 1..255, the lowest free one (the snapshot names chickens by pid + slot in one byte each)
export function freePid(players) {
  const taken = new Set(players.map(p => p.pid))
  for (let id = 1; id < 256; id++) if (!taken.has(id)) return id
  return null
}

// the Pátio's creator and godparent are never removed, and the owner does not remove themselves
export const isProtected = (p, meta) => !!p.userId && !p.guest && (p.userId === meta.creatorId || p.userId === meta.godparentId)
export function canKick(actor, target, ownerPid, meta) {
  if (!actor || !target) return 'Player não está no lobby.'
  if (actor.pid !== ownerPid) return 'Só o dono do lobby remove players.'
  if (actor.pid === target.pid) return 'O dono não remove a si mesmo.'
  if (isProtected(target, meta)) return 'O criador e o padrinho do Pátio não podem ser removidos.'
  return null
}

// a chicken's look, as the client's vestiário sends it: { slot: variant } with short strings only
export function cleanLook(look) {
  if (!look || typeof look !== 'object' || Array.isArray(look)) return null
  const out = {}
  for (const [k, v] of Object.entries(look).slice(0, 24)) if (/^[\w-]{1,24}$/.test(k) && typeof v === 'string' && /^[\w-]{1,40}$/.test(v)) out[k] = v
  return out
}
export const cleanLooks = looks => (Array.isArray(looks) ? looks.slice(0, MAX_CHICKENS).map(cleanLook) : [])

export const isFull = players => players.length >= MAX_BROWSERS

// simple token bucket: `rate` events per second, up to `burst` at once
export function bucket(rate, burst = rate) {
  let tokens = burst, at = Date.now()
  return () => {
    const now = Date.now()
    tokens = Math.min(burst, tokens + (now - at) / 1000 * rate); at = now
    if (tokens < 1) return false
    tokens -= 1
    return true
  }
}
