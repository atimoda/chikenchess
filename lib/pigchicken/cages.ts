// Gaiolas: where a player keeps the souls the Passaguá catches. A cage is an item of the world (it sits on racks,
// comes out of Baús, lies on the floor), but it is not carried in the inventory: a player hangs up to CAGES_MAX of
// them. The first one is in front (the active one): the souls caught go into it and a press on it lets its last soul
// out. The others hang behind it; a press on one of them swaps it with the one in front. Each cage keeps its own
// souls, also on the floor: whoever takes it takes them too. Pure data and functions; the combat
// (lib/pigchicken/combat.ts) fills them in and components/pigchicken/draw/cages.ts draws them.
import type { ItemId } from './items'
import type { Soul } from './souls'

export const CAGES_MAX = 3
export const CAGE_CAP_MAX = 99
export const CAGE_FLASH = 0.45 // s a cage glows when a soul goes in (blue) or out (red)
export const CAGE_ENTER = 1.1 // s a cage just taken swings in from outside the screen
export const CAGE_DENY = 0.45 // s the cages shake when nothing fits
export const CAGE_HOLD = 0.4 // s the "Soltar alma" bind held turns the cages instead

export type CageFlash = 'gain' | 'lose'
// cap: how many souls fit; souls: the last one in is the first one out. flash, flashT: its glow and the s left of
// it; enterT: s since a player hung it (Infinity: long ago, or it is in the world)
export type CageState = { cap: number; souls: Soul[]; flash: CageFlash | null; flashT: number; enterT: number }
// what carries a cage (an item owned or lying in the world)
export type Caged = { item: ItemId; cage?: CageState }

export const cageCap = (n: unknown, fallback = 8) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(1, Math.min(CAGE_CAP_MAX, Math.round(n))) : fallback)
export const newCage = (cap: number): CageState => ({ cap: cageCap(cap), souls: [], flash: null, flashT: 0, enterT: Infinity })
export const cageRoom = (c: CageState, reserved = 0) => Math.max(0, c.cap - c.souls.length - reserved)
export const cageSouls = (cages: readonly Caged[]) => cages.reduce((n, c) => n + (c.cage?.souls.length ?? 0), 0)

// the cage a soul goes into: the one in front while it has room, else the first one behind it with room (-1: none).
// reserved: the souls already on their way to each cage
export function cageWithRoom(cages: readonly Caged[], reserved?: (c: CageState) => number): number {
  for (let i = 0; i < cages.length; i++) { const c = cages[i].cage; if (c && cageRoom(c, reserved?.(c) ?? 0) > 0) return i }
  return -1
}
// the cage at `i` comes to the front and the one in front takes its place
export function bringFront<T>(cages: T[], i: number): boolean {
  if (i <= 0 || i >= cages.length) return false
  const front = cages[0]; cages[0] = cages[i]; cages[i] = front
  return true
}
// the next one comes to the front (the bind's "Trocar de gaiola"): the one in front goes to the end
export function cycleCages<T>(cages: T[]): boolean {
  if (cages.length < 2) return false
  cages.push(cages.shift()!)
  return true
}

export function flashCage(c: CageState, kind: CageFlash) { c.flash = kind; c.flashT = CAGE_FLASH }
export function stepCage(c: CageState, dt: number) {
  if (c.flashT > 0 && (c.flashT -= dt) <= 0) { c.flashT = 0; c.flash = null }
  if (c.enterT < CAGE_ENTER) c.enterT += dt; else c.enterT = Infinity
}

// where a soul sits inside its cage: two numbers from 0 to 1 and the side it faces, always the same for the same
// soul (its id), so nobody moves when another one comes in or goes out
export function soulSpot(id: number): { u: number; v: number; face: 1 | -1 } {
  let h = (id | 0) * 2654435761 >>> 0
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13
  const u = (h & 0xffff) / 0x10000
  h = Math.imul(h ^ (h >>> 16), 3266489917) >>> 0
  const v = (h & 0xffff) / 0x10000
  return { u, v, face: (h >>> 20) & 1 ? 1 : -1 }
}

// ---------- the swing of a hanging cage: a damped pendulum pushed by the camera ----------
export type Sway = { a: number; v: number } // angle (rad, 0 hanging straight) and its speed
export const newSway = (): Sway => ({ a: 0, v: 0 })
export const SWAY = { freq: 5.2, damp: 1.6, gain: 0.00035, max: 0.42, kick: 2.2 }
// accel: how fast the camera's speed changes (px/s²): the cage lags behind it
export function swayStep(s: Sway, accel: number, dt: number) {
  const steps = Math.max(1, Math.ceil(dt / 0.008)), h = dt / steps
  for (let i = 0; i < steps; i++) {
    s.v += (-SWAY.freq * SWAY.freq * s.a - 2 * SWAY.damp * s.v - SWAY.gain * accel * SWAY.freq * SWAY.freq) * h
    s.a += s.v * h
  }
  if (Math.abs(s.a) > SWAY.max) { s.a = Math.sign(s.a) * SWAY.max; s.v *= -0.3 }
}
// how far in a cage just taken is (0 outside the screen, 1 in its place) and the swing it comes in with (rad)
export function cageEnter(enterT: number): { k: number; swing: number } {
  if (!(enterT < CAGE_ENTER)) return { k: 1, swing: 0 }
  const u = Math.max(0, enterT / CAGE_ENTER), k = 1 - Math.pow(1 - Math.min(1, u * 1.6), 3)
  return { k, swing: Math.sin(u * Math.PI * 3.5) * 0.5 * (1 - u) }
}

// ---------- online: every player's cages, as their counters (each browser tells its own) ----------
// one cage: [model (its place in `models`), souls, limit]; a browser's message: for each of its chickens, its cages
export type NetCage = [number, number, number]
export type NetCages = NetCage[][]
export const NET_CAGE_PLAYERS = 4 // the chickens of one browser
export function exportCages(players: readonly (readonly Caged[])[], models: readonly ItemId[]): NetCages {
  return players.slice(0, NET_CAGE_PLAYERS).map(list => list.slice(0, CAGES_MAX).flatMap((c): NetCage[] => (c.cage ? [[Math.max(0, models.indexOf(c.item)), c.cage.souls.length, c.cage.cap]] : [])))
}
// a cage of another browser's player, as shown here: its counter only
export type CageMirror = { item: ItemId; n: number; cap: number; flash: CageFlash | null; flashT: number }
const int = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : null)
/** what another browser says its players carry, checked; null: not a list */
export function cleanNetCages(raw: unknown, models: readonly ItemId[]): { item: ItemId; n: number; cap: number }[][] | null {
  if (!Array.isArray(raw)) return null
  return raw.slice(0, NET_CAGE_PLAYERS).map(list => (Array.isArray(list) ? list.slice(0, CAGES_MAX) : []).flatMap(e => {
    if (!Array.isArray(e)) return []
    const m = int(e[0], 0, models.length - 1), cap = int(e[2], 1, CAGE_CAP_MAX), n = int(e[1], 0, CAGE_CAP_MAX)
    return m === null || cap === null || n === null ? [] : [{ item: models[m], n: Math.min(n, cap), cap }]
  }))
}
/** a player's mirrors take what its browser just said: a cage in the same place whose count went up glows blue, down red */
export function importCages(old: readonly CageMirror[] | undefined, next: readonly { item: ItemId; n: number; cap: number }[]): CageMirror[] {
  return next.map((c, i) => {
    const was = old?.[i]
    if (!was || was.item !== c.item || was.n === c.n) return { ...c, flash: was && was.item === c.item ? was.flash : null, flashT: was && was.item === c.item ? was.flashT : 0 }
    return { ...c, flash: c.n > was.n ? 'gain' : 'lose', flashT: CAGE_FLASH }
  })
}
export function stepCageMirror(m: CageMirror, dt: number) { if (m.flashT > 0 && (m.flashT -= dt) <= 0) { m.flashT = 0; m.flash = null } }
