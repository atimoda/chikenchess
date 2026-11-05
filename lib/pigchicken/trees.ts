// Geometry in percent of the element box, shared by the SVG and the engine's simplified colliders.
export const TREE_CROWNS = { layers: 'Em camadas', cloud: 'Arredondada', droop: 'Pendente', oval: 'Colunar', fronds: 'Leques', umbrella: 'Guarda-sol' } as const
export const TREE_BARKS = { smooth: 'Lisa', grooves: 'Ranhuras', paper: 'Papel', rings: 'Anéis' } as const
export const TREE_EFFECTS = { none: 'Sem efeito', petals: 'Pétalas', leaves: 'Folhas caindo', pollen: 'Pólen' } as const

type CrownForm = keyof typeof TREE_CROWNS
type Bark = keyof typeof TREE_BARKS
type Effect = keyof typeof TREE_EFFECTS
type Style = {
  label: string; crown: CrownForm; bark: Bark; colors: [string, string, string]
  trunkHeight: number; trunkWidth: number; spread: number; branches: number; angle: number; density: number; effect: Effect
}

export const TREE_STYLES = {
  pine: { label: 'Pinheiro em camadas', crown: 'layers', bark: 'grooves', colors: ['#604936', '#446854', '#7e9870'],
    trunkHeight: 85, trunkWidth: 11, spread: 77, branches: 6, angle: 20, density: 5, effect: 'none' },
  plum: { label: 'Ameixeira florida', crown: 'cloud', bark: 'grooves', colors: ['#604852', '#b47b92', '#e7b3c0'],
    trunkHeight: 67, trunkWidth: 13, spread: 85, branches: 5, angle: 48, density: 6, effect: 'petals' },
  oak: { label: 'Carvalho', crown: 'cloud', bark: 'grooves', colors: ['#665041', '#657551', '#9da574'],
    trunkHeight: 68, trunkWidth: 23, spread: 95, branches: 6, angle: 38, density: 7, effect: 'none' },
  willow: { label: 'Salgueiro', crown: 'droop', bark: 'grooves', colors: ['#6c6247', '#69805c', '#a8a675'],
    trunkHeight: 76, trunkWidth: 14, spread: 92, branches: 6, angle: 30, density: 7, effect: 'leaves' },
  birch: { label: 'Bétula', crown: 'oval', bark: 'paper', colors: ['#cdc1a7', '#929762', '#d3c98b'],
    trunkHeight: 83, trunkWidth: 8, spread: 60, branches: 5, angle: 54, density: 5, effect: 'pollen' },
  palm: { label: 'Palmeira', crown: 'fronds', bark: 'rings', colors: ['#9a7354', '#588477', '#98ad72'],
    trunkHeight: 80, trunkWidth: 11, spread: 100, branches: 5, angle: 22, density: 6, effect: 'none' },
  baobab: { label: 'Baobá', crown: 'umbrella', bark: 'smooth', colors: ['#9b735f', '#788755', '#b8ad75'],
    trunkHeight: 66, trunkWidth: 32, spread: 94, branches: 5, angle: 51, density: 4, effect: 'none' },
  maple: { label: 'Bordo de outono', crown: 'cloud', bark: 'grooves', colors: ['#664840', '#ab6248', '#dfaa69'],
    trunkHeight: 72, trunkWidth: 17, spread: 89, branches: 6, angle: 48, density: 7, effect: 'leaves' },
  cypress: { label: 'Cipreste', crown: 'oval', bark: 'smooth', colors: ['#564c42', '#536b61', '#8aa181'],
    trunkHeight: 90, trunkWidth: 9, spread: 44, branches: 5, angle: 65, density: 8, effect: 'none' },
} satisfies Record<string, Style>

export type TreeStyle = keyof typeof TREE_STYLES
export type TreeParams = {
  style: TreeStyle; seed: number; flip: boolean
  trunkHeight: number; trunkWidth: number; taper: number; lean: number; bark: Bark; barkColor: string
  branches: number; angle: number; spread: number; crown: CrownForm; density: number; leafSize: number
  leafColor: string; accentColor: string
  effect: Effect; particles: number; wind: number; windPeriod: number
  climbTrunk: boolean; walkBranches: boolean; walkCrown: boolean
}

export const TREE_SIZE = { w: 380, h: 460 }
export const TREE_NUMBERS = {
  trunkHeight: [42, 92], trunkWidth: [4, 38], taper: [15, 95], lean: [-22, 22],
  branches: [0, 8], angle: [8, 75], spread: [35, 100], density: [1, 10], leafSize: [45, 145],
  wind: [0, 5], windPeriod: [3, 12], particles: [0, 4],
} as const

export function treeRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), state | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000
  }
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const newTreeSeed = () => Math.floor(Math.random() * 0x100000000)
export function treeColor(hex: string, toward: string, amount: number) {
  return '#' + [1, 3, 5].map(i => Math.round(
    Number.parseInt(hex.slice(i, i + 2), 16) * (1 - amount) + Number.parseInt(toward.slice(i, i + 2), 16) * amount,
  ).toString(16).padStart(2, '0')).join('')
}

export function treePreset(style: TreeStyle, seed: number): TreeParams {
  const p: Style = TREE_STYLES[style]
  const [barkColor, leafColor, accentColor] = p.colors
  return { style, seed, flip: false, trunkHeight: p.trunkHeight, trunkWidth: p.trunkWidth, taper: 38, lean: 0,
    bark: p.bark, barkColor, branches: p.branches, angle: p.angle, spread: p.spread, crown: p.crown,
    density: p.density, leafSize: 100, leafColor, accentColor, effect: p.effect, particles: p.effect === 'none' ? 0 : 3,
    wind: 2, windPeriod: 7, climbTrunk: false, walkBranches: false, walkCrown: false }
}

export function randomTree(style: TreeStyle, seed = newTreeSeed()) {
  const base = treePreset(style, seed)
  const rand = treeRandom(seed)
  const around = (key: keyof typeof TREE_NUMBERS, n: number) => {
    const [min, max] = TREE_NUMBERS[key]
    return clamp(base[key] + Math.round((rand() * 2 - 1) * n), min, max)
  }
  const tint = (hex: string) => treeColor(hex, rand() < .5 ? '#241f30' : '#eacfab', rand() * .2)
  const tree: TreeParams = {
    ...base, flip: rand() < .5, trunkHeight: around('trunkHeight', 7), trunkWidth: around('trunkWidth', 4),
    lean: Math.round((rand() * 2 - 1) * (style === 'palm' ? 20 : 10)), taper: around('taper', 17),
    branches: around('branches', 2), angle: around('angle', 12), spread: around('spread', 11),
    density: around('density', 2), leafSize: around('leafSize', 21), wind: around('wind', 1), windPeriod: around('windPeriod', 3),
    barkColor: tint(base.barkColor), leafColor: tint(base.leafColor), accentColor: tint(base.accentColor),
  }
  const slender = style === 'birch' || style === 'cypress' || style === 'palm'
  return { tree, w: Math.round((slender ? 290 : 380) + rand() * 60), h: Math.round((slender ? 490 : 420) + rand() * 90) }
}

const oneOf = <K extends string>(v: unknown, options: Record<K, unknown>, fallback: K) =>
  typeof v === 'string' && Object.hasOwn(options, v) ? v as K : fallback
const color = (v: unknown, fallback: string) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback
export function normalizeTree(raw: unknown): TreeParams {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<TreeParams>
  const seed = typeof p.seed === 'number' && Number.isFinite(p.seed) ? Math.round(clamp(p.seed, 0, 0xffffffff)) : 1
  const d = treePreset(oneOf(p.style, TREE_STYLES, 'pine'), seed)
  for (const key of Object.keys(TREE_NUMBERS) as (keyof typeof TREE_NUMBERS)[]) {
    const value = p[key]
    const [min, max] = TREE_NUMBERS[key]
    if (typeof value === 'number' && Number.isFinite(value)) d[key] = Math.round(clamp(value, min, max))
  }
  return { ...d, flip: p.flip === true, bark: oneOf(p.bark, TREE_BARKS, d.bark), crown: oneOf(p.crown, TREE_CROWNS, d.crown),
    effect: oneOf(p.effect, TREE_EFFECTS, d.effect), barkColor: color(p.barkColor, d.barkColor), leafColor: color(p.leafColor, d.leafColor),
    accentColor: color(p.accentColor, d.accentColor), climbTrunk: p.climbTrunk === true, walkBranches: p.walkBranches === true, walkCrown: p.walkCrown === true }
}

export type TreePoint = [number, number]
type Crown = { x: number; y: number; rx: number; ry: number; tilt: number }
const r1 = (n: number) => Math.round(n * 10) / 10
const point = (x: number, y: number): TreePoint => [r1(x), r1(y)]

export function treeGeometry(tree: TreeParams) {
  const rand = treeRandom(tree.seed)
  const top = 100 - tree.trunkHeight, tip = 50 + tree.lean
  const half = tree.trunkWidth / 2, tipHalf = half * tree.taper / 100
  const trunk = [point(50 - half, 100), point(tip - tipHalf, top), point(tip + tipHalf, top), point(50 + half, 100)]
  const branches = Array.from({ length: tree.branches }, (_, i) => {
    const side = i % 2 ? 1 : -1
    const fraction = (i + 1) / (tree.branches + 1)
    const from = tree.crown === 'fronds' ? .89 + fraction * .09 : .35 + fraction * .57
    const ax = 50 + tree.lean * from, ay = 100 - tree.trunkHeight * from
    const length = tree.spread * (0.22 + rand() * .18) * (tree.crown === 'layers' ? 1 - fraction * .53 : 1)
    const bx = clamp(ax + side * length, 10, 90)
    const rise = Math.min(ay - 4, length * tree.angle / 100)
    return [point(ax, ay), point((ax + bx) / 2, ay - rise * .7 - 1.8), point(bx, ay - rise)]
  })
  const crowns: Crown[] = Array.from({ length: tree.density }, (_, i) => {
    const t = tree.density === 1 ? 0.5 : i / (tree.density - 1)
    const side = i % 2 ? 1 : -1
    const leaf = tree.leafSize / 100 * (.84 + rand() * .28)
    const spread = tree.spread / 100
    const branch = branches[i % Math.max(1, branches.length)]?.[2]
    let x: number, y: number, rx: number, ry: number, tilt = 0
    switch (tree.crown) {
      case 'layers':
        x = tip - tree.lean * t * .55 + side * t * 7 * spread
        y = top + t * tree.trunkHeight * .56
        rx = (12 + t * 26) * spread * leaf; ry = (3 + t * 4) * leaf
        break
      case 'droop':
        x = tip + (t - .5) * 63 * spread; y = top + 11 + Math.abs(t - .5) * 29
        rx = (8 + rand() * 5) * leaf; ry = (14 + rand() * 10) * leaf
        break
      case 'oval':
        x = tip + side * (2 + rand() * 9) * spread; y = top + t * tree.trunkHeight * .55
        rx = (9 + rand() * 10) * leaf * spread; ry = (10 + rand() * 9) * leaf
        break
      case 'fronds':
        x = tip + (t - .5) * 61 * spread; y = top + 8 + Math.abs(t - .5) * 11
        rx = (17 + rand() * 9) * spread * leaf; ry = (3 + rand() * 2) * leaf
        tilt = (t - .5) * 63
        break
      case 'umbrella':
        x = tip + (t - .5) * 63 * spread; y = top + 4 + Math.abs(t - .5) * 10
        rx = (12 + rand() * 9) * leaf; ry = (4 + rand() * 4) * leaf
        break
      case 'cloud':
        x = i === 0 ? tip : branch?.[0] ?? tip + (t - .5) * 52 * spread
        y = i === 0 ? top + 2 : branch?.[1] ?? top + 12 + Math.abs(t - .5) * 17
        rx = (11 + rand() * 10) * spread * leaf; ry = (9 + rand() * 8) * leaf
        break
    }
    rx = Math.min(41, Math.max(3, rx))
    ry = Math.min(32, Math.max(2, ry))
    const rad = tilt * Math.PI / 180
    const halfW = Math.hypot(rx * Math.cos(rad), ry * Math.sin(rad))
    const halfH = Math.hypot(rx * Math.sin(rad), ry * Math.cos(rad))
    return { x: r1(clamp(x, halfW + 1, 99 - halfW)), y: r1(clamp(y, halfH + 1, 97 - halfH)), rx: r1(rx), ry: r1(ry), tilt: r1(tilt) }
  })
  return { trunk, branches, crowns }
}

export function treeSurfaces(tree: TreeParams, geometry = treeGeometry(tree)) {
  const [a, b, c, d] = geometry.trunk
  const walls = tree.climbTrunk ? [[a, b], [d, c]] : []
  const floors: TreePoint[][] = tree.climbTrunk ? [[b, c]] : []
  if (tree.walkBranches) floors.push(...geometry.branches)
  if (tree.walkCrown) floors.push(...geometry.crowns.map(({ x, y, rx, ry, tilt }) => {
    const radians = tilt * Math.PI / 180
    const edge = (dx: number) => point(x + dx * Math.cos(radians) + ry * .52 * Math.sin(radians), y + dx * Math.sin(radians) - ry * .52 * Math.cos(radians))
    return [edge(-rx * .65), edge(rx * .65)]
  }))
  return { floors, walls }
}
