import { treeRandom, type TreeCrown, type TreeParams, type TreePoint } from './trees'

const q = (n: number) => Math.round(n * 10) / 10
const xy = (x: number, y: number) => `${q(x)},${q(y)}`

// Wide, rounded distal controls at zero become an acute tip at 100.
export function treeLeafPath(base: TreePoint, tip: TreePoint, halfWidth: number, sharpness: number) {
  const dx = tip[0] - base[0], dy = tip[1] - base[1], len = Math.hypot(dx, dy) || 1
  const nx = -dy * halfWidth / len, ny = dx * halfWidth / len
  const at = (t: number, side: number) => xy(base[0] + t * dx + side * nx, base[1] + t * dy + side * ny)
  const shoulder = 1.04 - .37 * sharpness / 100
  return `M${at(0, 0)}C${at(.14, 1.05)} ${at(shoulder, 1)} ${at(1, 0)}C${at(shoulder, -1)} ${at(.14, -1.05)} ${at(0, 0)}Z`
}

function frondFoliage(path: TreePoint[], tree: TreeParams) {
  const rows = 6 + Math.floor(tree.density * .7)
  let leaves = '', lights = ''
  for (let i = 0; i < rows; i++) {
    const t = .14 + i * .81 / rows
    const index = Math.floor(t * (path.length - 1))
    const u = t * (path.length - 1) - index
    const a = path[index], b = path[index + 1]
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1
    const x = a[0] + dx * u, y = a[1] + dy * u
    const spread = (2 + 6.5 * Math.sin(Math.PI * t)) * Math.sqrt(tree.leafSize / 100)
    const leaflet = (side: number) => treeLeafPath([x, y], [
      x + (dx * .58 - dy * side * .85) * spread / len,
      y + (dy * .58 + dx * side * .85) * spread / len,
    ], (.40 + .4 * (1 - t)) * tree.leafSize / 100, tree.sharpness)
    leaves += leaflet(1)
    lights += leaflet(-1)
  }
  leaves += treeLeafPath(path[path.length - 2], path[path.length - 1], .48, tree.sharpness)
  return { leaves, lights, twigs: `M${path.map(([x, y]) => xy(x, y)).join('L')}` }
}

function hangingFoliage({ x, y, rx, ry }: TreeCrown, tree: TreeParams, rand: () => number) {
  let leaves = '', lights = '', twigs = ''
  for (let i = 0; i < 5; i++) {
    const at = (i / 4 - .5) * 1.86
    const sx = x + rx * at * .55, sy = y - ry * (.86 - .24 * Math.abs(at))
    const ex = x + rx * (at + (rand() - .5) * .34)
    const ey = y + ry * (.65 + rand() * .35)
    twigs += `M${xy(sx, sy)}Q${xy(ex, sy + ry * .4)} ${xy(ex, ey)}`
    for (let j = 0; j < 4; j++) {
      const t = (j + .5) / 4, side = (i + j) % 2 ? -1 : 1
      const bx = sx + (ex - sx) * t, by = sy + (ey - sy) * t
      const blade = treeLeafPath([bx, by], [bx + side * rx * .24, by + ry * (.21 + rand() * .17)], rx * .078, tree.sharpness)
      if (side === -1) leaves += blade
      else lights += blade
    }
  }
  return { leaves, lights, twigs }
}

function compoundFoliage({ x, y, rx, ry }: TreeCrown, tree: TreeParams) {
  let leaves = '', lights = '', twigs = ''
  for (let i = 0; i < 3; i++) {
    const side = i - 1
    const sx = x - rx * .62, sy = y + ry * .12
    const ex = x + rx * (.64 - .10 * Math.abs(side)), ey = y + side * ry * .82
    twigs += `M${xy(sx, sy)}L${xy(ex, ey)}`
    for (let j = 1; j <= 5; j++) {
      const t = j / 6, bx = sx + (ex - sx) * t, by = sy + (ey - sy) * t
      const w = ry * .24 * (1 - t * .35)
      leaves += treeLeafPath([bx, by], [bx + rx * .21, by + ry * .46], w, tree.sharpness)
      lights += treeLeafPath([bx, by], [bx + rx * .23, by - ry * .41], w, tree.sharpness)
    }
  }
  return { leaves, lights, twigs }
}

export function drawTreeFoliage(tree: TreeParams, crowns: TreeCrown[]) {
  const rand = treeRandom(tree.seed ^ 0xc6ad2)
  let leaves = '', shadows = '', lights = '', twigs = '', flowers = ''
  for (const c of crowns) {
    const { x, y, rx, ry } = c
    if (c.frond || tree.crown === 'droop' || tree.style === 'brazilwood') {
      const part = c.frond ? frondFoliage(c.frond, tree)
        : tree.crown === 'droop' ? hangingFoliage(c, tree, rand)
        : compoundFoliage(c, tree)
      leaves += part.leaves; lights += part.lights; twigs += part.twigs
    } else {
      shadows += treeLeafPath([x - rx, y + ry * .28], [x + rx, y - ry * .2], ry, tree.sharpness * .7)
      const narrow = tree.crown === 'layers' || tree.crown === 'whorls' || tree.style === 'centurion'
      for (let i = 0; i < (narrow ? 5 : 4); i++) {
        const t = i / (narrow ? 4 : 3), side = i % 2 ? -1 : 1
        const bx = x + (t - .5) * rx * 1.16
        const by = y + ry * (.42 - rand() * .28)
        const tx = bx + side * rx * (.20 + rand() * .18)
        const ty = y - ry * (.45 + rand() * .55)
        leaves += treeLeafPath([bx, by], [tx, ty], rx * (narrow ? .16 : .38), tree.sharpness)
        if (i % 2 === 0) lights += treeLeafPath([bx, by - ry * .10], [tx, ty], rx * (narrow ? .08 : .18), tree.sharpness)
      }
    }
    if (tree.bloom !== 'none') {
      const count = tree.style === 'ipe' ? 12 : tree.style === 'brazilwood' ? 2 : 4
      for (let i = 0; i < count; i++) {
        const bx = x + (rand() - .5) * rx * 1.55, by = y + (rand() - .6) * ry * 1.35
        const s = Math.min(2.7, Math.min(rx, ry) * (.22 + rand() * .15))
        flowers += `M${xy(bx, by)}q${xy(-s, -s)} ${xy(0, -s)}q${xy(s, -s)} ${xy(s, 0)}q${xy(s, s)} ${xy(0, s)}q${xy(-s, s)} ${xy(-s, 0)}Z`
      }
    }
  }
  return { leaves, shadows, lights, twigs, flowers }
}
