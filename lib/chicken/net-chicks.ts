// The chicks (pintinhos) in the online Pátio, as data. Each browser moves the chicks that follow its own first
// chicken and tells the others where they are ("chicks", ~10 times a second, in world units like the chickens); the
// others draw mirrors that glide there and do nothing else. A Passaguá over a mirror asks the chick's browser for
// it, the way it asks for a soul flying free (lib/pigchicken/net-souls.ts, kind 'c'): the chick leaves there, and
// only then counts in the basket of whoever asked. Pure functions, so the browser and the tests use the same code:
// lib/chicken/online-room.ts keeps the mirrors and components/chicken/online-chickens.tsx sends and draws.

// one chick: [n, x, y, vx, vy, face, state, style] (n: its number in its own browser; state: stateByte of
// net-protocol.ts; style: its place in CHICK_STYLES)
export type NetChick = [number, number, number, number, number, number, number, number]
export type OwnChick = { n: number; x: number; y: number; vx: number; vy: number; face: number; state: number; style: number }
// another browser's chick, drawn here (at: when it was last heard of, ms; hidden: out of sight until then, ms)
export type RemoteChick = OwnChick & { pid: number; at: number; hidden: number }

export const NET_CHICKS_MAX = 16 // chicks of one browser in a message
export const CHICK_AHEAD = 0.25 // s a mirror runs on by its speed after the last message

const LIMIT = 200_000, SPEED = 5000
const N_MAX = 10_000_000 // netIdFor: the browser's pid goes in front of the chick's number
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const int = (v: unknown, max: number): v is number => num(v) && Number.isInteger(v) && v >= 0 && v < max
const speed = (v: unknown) => (num(v) ? Math.max(-SPEED, Math.min(SPEED, v)) : 0)

// ---------- this browser's chicks ----------
const numbers = new WeakMap<object, number>(), styles = new WeakMap<object, number>()
let nextNumber = 1
/** the number a chick of this browser goes by in the lobby (chick: its engine), the same for as long as it lives */
export function chickNumber(chick: object) {
  let n = numbers.get(chick)
  if (!n) { n = nextNumber++; if (nextNumber >= N_MAX) nextNumber = 1; numbers.set(chick, n) }
  return n
}
/** the look a chick was hatched with (its place in CHICK_STYLES), for the other browsers to draw the same one */
export const setChickStyle = (chick: object, style: number) => { styles.set(chick, style) }
export const chickStyleOf = (chick: object) => styles.get(chick) ?? 0

/** what to send: every chick of this browser, in whole world units */
export const exportChicks = (list: readonly OwnChick[]): NetChick[] =>
  list.slice(0, NET_CHICKS_MAX).map(c => [c.n, Math.round(c.x), Math.round(c.y), Math.round(c.vx), Math.round(c.vy), c.face < 0 ? -1 : 1, c.state, c.style])

// ---------- the browsers that watch ----------
export const chickKey = (pid: number, n: number) => `${pid}:${n}`

/** a browser's chicks become mirrors here (by its pid and their number): new ones appear, the ones it no longer
 * sends leave. A mirror keeps the look it first came with and stays hidden for as long as it was asked to. */
export function importChicks(mirrors: Map<string, RemoteChick>, pid: number, list: unknown, at: number) {
  if (!Array.isArray(list)) return
  const seen = new Set<string>()
  for (const e of list.slice(0, NET_CHICKS_MAX)) {
    if (!Array.isArray(e)) continue
    const [n, x, y, vx, vy, face, state, style] = e as unknown[]
    if (!int(n, N_MAX) || n < 1 || !num(x) || !num(y) || Math.abs(x) > LIMIT || Math.abs(y) > LIMIT) continue
    const key = chickKey(pid, n), old = mirrors.get(key)
    mirrors.set(key, {
      pid, n, x, y, vx: speed(vx), vy: speed(vy), face: num(face) && face < 0 ? -1 : 1, state: int(state, 64) ? state : 0,
      style: old?.style ?? (int(style, 256) ? style : 0), at, hidden: old?.hidden ?? 0,
    })
    seen.add(key)
  }
  for (const [key, c] of mirrors) if (c.pid === pid && !seen.has(key)) mirrors.delete(key)
}

/** the mirrors of the browsers still in the lobby stay; the others' leave */
export function keepChicks(mirrors: Map<string, RemoteChick>, pids: ReadonlySet<number>) {
  for (const [key, c] of mirrors) if (!pids.has(c.pid)) mirrors.delete(key)
}

/** where a mirror is now: the latest message moved on by its speed (at most CHICK_AHEAD) */
export function chickAt(c: RemoteChick, now: number) {
  const ahead = Math.max(0, Math.min(CHICK_AHEAD, (now - c.at) / 1000))
  return { x: c.x + c.vx * ahead, y: c.y + c.vy * ahead }
}
