// The shapes of the old courtyard trees (kinds `pine` and `blossom`): where the flat pads of a pine and the clouds of
// flowers of a plum tree are. components/pigchicken/patio-trees.tsx draws them from these numbers; the birds land on
// top of them (lib/pigchicken/perch-places.ts). Tree units: the base at (0, 0), y up is negative; the art fills a box
// of OLD_TREE_BOX with the base in the middle of its bottom. Seeded: the same tree for every player. Pure.
export type Rand = () => number
export function oldTreeRandom(seed: number): Rand {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// rounded to a tenth: the same text on the server and in the browser
export const q = (v: number) => Math.round(v * 10) / 10
export const between = (r: Rand, a: number, b: number) => q(a + r() * (b - a))
export const OLD_TREE_BOX = { w: 420, h: 480 }
// the art draws its colours first: this many numbers of the seed go before the shape
export const OLD_TREE_COLOUR_DRAWS = 2

// a pine: how high it is, how it leans, and its 4 to 6 flat canopies stepping up the trunk, plus the one on top
export function pineCanopy(r: Rand) {
  const top = between(r, 330, 420), lean = between(r, -26, 26)
  const n = 4 + Math.floor(r() * 3)
  const pads = Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 0.4)
    const side = i % 2 === 0 ? -1 : 1
    const rad = between(r, 0.85, 1.15) * (80 - 40 * t)
    return { x: q(lean * t + side * between(r, 20, 70) * (1 - t * 0.6)), y: q(-top * t - 40 + between(r, -10, 10)), r: q(rad) }
  })
  pads.push({ x: lean, y: -top - 6, r: between(r, 36, 50) })
  return { top, lean, pads }
}
// a plum tree in blossom: its 3 or 4 branches and its 6 to 10 clouds of flowers
export function blossomCrown(r: Rand) {
  const top = between(r, 230, 300)
  const nb = 3 + Math.floor(r() * 2)
  const branches = Array.from({ length: nb }, (_, i) => {
    const a = -Math.PI / 2 + (i - (nb - 1) / 2) * between(r, 0.45, 0.7)
    const len = between(r, 0.7, 1) * top
    const from = between(r, 40, 110)
    return { x0: between(r, -6, 6), y0: -from, x: q(Math.cos(a) * len * 0.6), y: q(-from + Math.sin(a) * (len - from * 0.4)), c: between(r, -40, 40) }
  })
  const n = 6 + Math.floor(r() * 5)
  const puffs = Array.from({ length: n }, (_, i) => {
    const b = branches[i % nb]
    return { x: b.x + between(r, -40, 40), y: b.y + between(r, -20, 40), r: between(r, 30, 60) }
  })
  return { top, nb, branches, n, puffs }
}

// where a bird sits on one of them, in % of the tree's box (each a line, left to right): the top of each pad of a
// pine, the top of each cloud of a plum tree
export function oldTreePerches(kind: 'pine' | 'blossom', seed: number): [[number, number], [number, number]][] {
  const r = oldTreeRandom(seed)
  for (let i = 0; i < OLD_TREE_COLOUR_DRAWS; i++) r()
  const pc = (x: number, y: number): [number, number] => [((x + OLD_TREE_BOX.w / 2) / OLD_TREE_BOX.w) * 100, ((y + OLD_TREE_BOX.h) / OLD_TREE_BOX.h) * 100]
  if (kind === 'pine') return pineCanopy(r).pads.map(p => [pc(p.x - p.r * 0.7, p.y - p.r * 0.2), pc(p.x + p.r * 0.7, p.y - p.r * 0.2)])
  return blossomCrown(r).puffs.map(p => [pc(p.x - p.r * 0.55, p.y - p.r * 0.8), pc(p.x + p.r * 0.55, p.y - p.r * 0.8)])
}
