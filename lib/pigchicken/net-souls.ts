// The souls flying free in the online Pátio, as data. Pure functions, so both sides and the tests use the same code;
// lib/pigchicken/net-world-sync.ts moves them through the game server.
//
// Who decides what:
// - each browser flies the souls its own players let out and sends them ~10 times a second ("souls"); the other
//   browsers draw mirrors that glide to where they are and do nothing else;
// - a Passaguá over a mirror asks the browser that flies it for the soul ("take"); that browser lets it go and
//   answers with what it is ("give"), and only then does it count in the basket of whoever asked. A soul asked for
//   twice is given once: the second one finds nothing;
// - the undead birds are the lobby owner's enemies: a browser that is not the owner asks the owner for them the
//   same way.
import { BIRDS, type BirdId } from './birds'
import { netIdFor } from './net-world'
import { newSoul, type Soul, type SoulNote, type SoulOrigin, type SoulShot, type SoulSpecies, type SoulWeapon } from './souls'

// what a soul is, without its id: [species, state, shot, note, weapon, color, bird]
export type NetSoulWho = [string, string, string | null, string | null, string | null, string, string | null]
// a soul flying free: [id, x, y, face, who?] (who: only until the others have it, and with everything now and then)
export type NetSoul = [number, number, number, number, NetSoulWho?]
// s: a soul flying free (id: its id in the lobby); f: an undead bird of the lobby owner's (id: the enemy's)
export type NetTake = { k: 's' | 'f'; id: number }
export type NetGive = { k: 's' | 'f'; id: number; soul: NetSoulWho }

export const NET_SOULS_MAX = 64 // souls of one browser in a message
export const TAKE_WAIT = 1.5 // s a soul asked for stays hidden waiting for the answer

const SPECIES: Record<SoulSpecies, 1> = { horde: 1, jelly: 1, lantern: 1, shell: 1, twin: 1, mini: 1, drum: 1, dragon: 1, chick: 1 }
const SHOTS: Record<SoulShot, 1> = { wind: 1, strings: 1, keys: 1, percussion: 1, rebate: 1 }
const NOTES: Record<SoulNote, 1> = { tonic: 1, consonant: 1, tension: 1, leading: 1, outside: 1 }
const WEAPONS: Record<SoulWeapon, 1> = { blast: 1, bullet: 1, arrow: 1, impact: 1 }
const one = <T extends string>(set: Record<T, unknown>, v: unknown): T | null => (typeof v === 'string' && Object.prototype.hasOwnProperty.call(set, v) ? v as T : null)
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const r1 = (v: number) => Math.round(v * 10) / 10
const LIMIT = 200_000
const PID = 10_000_000 // netIdFor: the browser's pid in front of its own id

export const soulWho = (s: Soul): NetSoulWho => [s.species, s.state, s.shot, s.note, s.weapon, s.color, s.bird]

/** a soul from what another browser says it is (null: not a soul); its rarity is worked out here */
export function soulFromWho(who: unknown, id: number): Soul | null {
  if (!Array.isArray(who) || who.length < 7) return null
  const species = one(SPECIES, who[0]), state = who[1] === 'alive' || who[1] === 'dead' ? who[1] : null, color = who[5]
  if (!species || !state || typeof color !== 'string' || !/^[#a-z0-9(),.% -]{1,40}$/i.test(color)) return null
  const origin: SoulOrigin = { species, state, shot: one(SHOTS, who[2]), note: one(NOTES, who[3]), weapon: state === 'dead' ? one(WEAPONS, who[4]) ?? 'impact' : null }
  return newSoul(id, origin, color, species === 'chick' ? null : one(BIRDS, who[6]) as BirdId | null)
}

// ---------- the browser that flies them ----------
/** what to send: every soul flying free here, with what it is while the others may not have it yet (cache: the ones
 * already told; full: tell everything again, someone joined or it is time) */
export function exportSouls(freed: readonly { soul: Soul; x: number; y: number; face: number }[], pid: number, cache: Set<number>, full: boolean): NetSoul[] {
  const live = new Set<number>(), l: NetSoul[] = []
  for (const f of freed) {
    if (l.length >= NET_SOULS_MAX) break
    const id = netIdFor(pid, f.soul.id)
    live.add(id)
    const e: NetSoul = [id, r1(f.x), r1(f.y), f.face < 0 ? -1 : 1]
    if (full || !cache.has(id)) { e.push(soulWho(f.soul)); cache.add(id) }
    l.push(e)
  }
  for (const id of [...cache]) if (!live.has(id)) cache.delete(id)
  return l
}

// ---------- the browsers that watch ----------
// a soul another browser flies, drawn here: asked: s since this browser asked for it (it hides meanwhile); null: no
export type SoulMirror = { net: number; pid: number; soul: Soul; x: number; y: number; face: number; t: number; netX: number; netY: number; asked: number | null }

/** a browser's souls become mirrors here (by their id in the lobby): new ones appear, the ones it no longer sends
 * leave. Returns the ones that left, for the little cloud. A soul whose `who` has not come yet waits for it. */
export function importSouls(mirrors: SoulMirror[], pid: number, list: unknown): SoulMirror[] {
  const gone: SoulMirror[] = []
  if (!Array.isArray(list)) return gone
  const known = new Map<number, SoulMirror>()
  for (const m of mirrors) if (m.pid === pid) known.set(m.net, m)
  const seen = new Set<number>()
  for (const e of list.slice(0, NET_SOULS_MAX)) {
    if (!Array.isArray(e)) continue
    const [id, x, y, face, who] = e as unknown[]
    // only its own: the id carries the pid of the browser that flies it
    if (!num(id) || !num(x) || !num(y) || Math.abs(x) > LIMIT || Math.abs(y) > LIMIT || Math.floor(id / PID) !== pid) continue
    let m = known.get(id)
    if (!m) {
      const soul = soulFromWho(who, id % PID)
      if (!soul) continue
      m = { net: id, pid, soul, x, y, face: 1, t: 0, netX: x, netY: y, asked: null }
      mirrors.push(m); known.set(id, m)
    }
    m.netX = x; m.netY = y; m.face = num(face) && face < 0 ? -1 : 1
    // far away (a portal): straight there
    if (Math.hypot(m.x - x, m.y - y) > 400) { m.x = x; m.y = y }
    seen.add(id)
  }
  for (let i = mirrors.length - 1; i >= 0; i--) if (mirrors[i].pid === pid && !seen.has(mirrors[i].net)) gone.push(...mirrors.splice(i, 1))
  return gone
}

/** a mirror glides toward where its browser has it; one asked for too long ago shows again */
export function glideSoulMirror(m: SoulMirror, dt: number) {
  m.t += dt
  if (m.asked !== null && (m.asked += dt) > TAKE_WAIT) m.asked = null
  const k = Math.min(1, dt * 12)
  m.x += (m.netX - m.x) * k; m.y += (m.netY - m.y) * k
}

// ---------- incoming messages, checked (they come from other browsers through the server) ----------
export function cleanTake(t: unknown): NetTake | null {
  const o = t as NetTake | null
  return o && typeof o === 'object' && (o.k === 's' || o.k === 'f') && num(o.id) && o.id >= 0 ? { k: o.k, id: o.id } : null
}
export function cleanGive(g: unknown): NetGive | null {
  const o = g as NetGive | null, take = cleanTake(o)
  return take && soulFromWho(o!.soul, 0) ? { ...take, soul: o!.soul.slice(0, 7) as NetSoulWho } : null
}
