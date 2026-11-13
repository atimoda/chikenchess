// The shock of the lightning weapons (Martelo de Thor, Cajado de Odin): who it jumps to, the state it leaves them in
// and the shape of a bolt. Pure: the combat applies it (lib/pigchicken/combat.ts), the Parquinho draws it
// (components/pigchicken/draw/shock.ts).

// the state of someone shocked: seconds left, the whole time, and how strong it is (0..1: how hard they shake and how
// fast the x-ray blinks)
export type Shock = { left: number; total: number; power: number }
export type ShockPoint = { id: number; x: number; y: number }
// one jump of the shock, from someone it already reached to the next; hop: 1 for a jump from someone the blow hit,
// 2 from there on, and so on
export type ShockLink = { from: ShockPoint; to: ShockPoint; hop: number }

export const SHOCK_POWER = { quick: 0.35, heavy: 0.6, special: 1 }
// a bolt shows a moment after the one before it (s per hop), and for how long (s; a special's stay longer)
export const BOLT_HOP = 0.045
export const BOLT_LIFE = 0.28
export const BOLT_LIFE_SPECIAL = 0.6

/**
 * The shock leaves the ones the blow hit and jumps, one at a time, to the nearest one not reached yet within `range`
 * px of anyone it already reached (so it branches), at most `jumps` times.
 */
export function shockChain(hit: readonly ShockPoint[], others: readonly ShockPoint[], range: number, jumps: number): ShockLink[] {
  const links: ShockLink[] = []
  if (!hit.length || range <= 0 || jumps <= 0) return links
  const reached = hit.map(p => ({ p, hop: 0 }))
  const left = others.filter(o => !hit.some(h => h.id === o.id))
  for (let n = 0; n < Math.floor(jumps) && left.length; n++) {
    let best = -1, from = reached[0], dist = range
    for (let i = 0; i < left.length; i++) for (const r of reached) {
      const d = Math.hypot(left[i].x - r.p.x, left[i].y - r.p.y)
      // the nearest; between equals, from the one reached last (the bolt runs on instead of fanning out)
      if (d < dist || (d === dist && best >= 0 && r.hop > from.hop)) { dist = d; best = i; from = r }
    }
    if (best < 0) break
    const [to] = left.splice(best, 1)
    links.push({ from: from.p, to, hop: from.hop + 1 })
    reached.push({ p: to, hop: from.hop + 1 })
  }
  return links
}

/** a new shock over the one already there: the longer time and the stronger of the two */
export function addShock(was: Shock | undefined, time: number, power: number): Shock {
  const p = Math.max(0, Math.min(1, power))
  if (!was || was.left <= 0) return { left: time, total: time, power: p }
  const left = Math.max(was.left, time)
  return { left, total: Math.max(left, was.total), power: Math.max(was.power, p) }
}

/** whether the x-ray shows right now: it blinks faster the stronger the shock, and slows down as it ends */
export function shockXray(s: Shock, now: number) {
  if (s.left <= 0) return false
  const ending = Math.min(1, s.left / Math.max(0.2, s.total * 0.3))
  const period = (0.16 - 0.09 * s.power) * (1 + (1 - ending) * 1.5)
  return Math.floor(now / period) % 2 === 0
}

/** how far they are shaken off their place right now (px): fast, uneven, stronger with the shock, dying out at the end */
export function shockShake(s: Shock, now: number, seed = 0) {
  if (s.left <= 0) return { x: 0, y: 0 }
  const amp = (2 + 5 * s.power) * Math.min(1, s.left / 0.18)
  return { x: Math.sin(now * 97 + seed) * amp + Math.sin(now * 53 + seed * 2.3) * amp * 0.4, y: Math.sin(now * 71 + seed * 1.7) * amp * 0.35 }
}

const hash = (v: number) => { const s = Math.sin(v * 127.1) * 43758.5453; return s - Math.floor(s) }
/**
 * A bolt from a to b as a jagged line (and a few short forks off it): it is drawn again with another `frame` every
 * few ms so that it flickers. jag: how far it strays from the straight line, as a share of its length.
 */
export function boltPath(ax: number, ay: number, bx: number, by: number, seed: number, frame: number, jag = 0.16) {
  const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len
  const n = Math.max(3, Math.min(18, Math.round(len / 26)))
  const main: { x: number; y: number }[] = [{ x: ax, y: ay }]
  const forks: { x: number; y: number }[][] = []
  for (let i = 1; i < n; i++) {
    const k = i / n, r = hash(seed * 31 + frame * 7 + i) - 0.5
    // the ends are pinned; the middle strays the most
    const off = r * 2 * jag * len * Math.sin(k * Math.PI) * 0.9 + (hash(seed + i * 3 + frame) - 0.5) * 8
    const p = { x: ax + (bx - ax) * k + nx * off, y: ay + (by - ay) * k + ny * off }
    main.push(p)
    if (hash(seed * 17 + frame * 3 + i * 5) > 0.72) {
      const a = Math.atan2(by - ay, bx - ax) + (hash(seed + frame + i) - 0.5) * 2.2, l = 10 + hash(seed * 3 + i + frame * 2) * Math.min(46, len * 0.25)
      const mid = { x: p.x + Math.cos(a) * l * 0.5 + (hash(i + frame) - 0.5) * 6, y: p.y + Math.sin(a) * l * 0.5 + (hash(i * 2 + frame) - 0.5) * 6 }
      forks.push([p, mid, { x: p.x + Math.cos(a) * l, y: p.y + Math.sin(a) * l }])
    }
  }
  main.push({ x: bx, y: by })
  return { main, forks }
}
