// Geometry in percent of the element box, shared by the SVG and the engine's simplified colliders.
export const TREE_CROWNS = { layers: 'Em camadas', cloud: 'Arredondada', droop: 'Pendente', oval: 'Colunar', fronds: 'Frondes', umbrella: 'Guarda-sol', whorls: 'Verticilos', emergent: 'Copa alta' } as const
export const TREE_BARKS = { smooth: 'Lisa', grooves: 'Ranhuras', paper: 'Papel', rings: 'Anéis' } as const
export const TREE_EFFECTS = { none: 'Sem efeito', petals: 'Pétalas', leaves: 'Folhas caindo', pollen: 'Pólen' } as const
export const TREE_BLOOMS = { none: 'Sem flores', yellow: 'Amarela', pink: 'Rosa', violet: 'Roxa', white: 'Branca', custom: 'Personalizada' } as const
const BLOOM_COLORS = { yellow: '#f2bd35', pink: '#f29ab0', violet: '#ac68c3', white: '#f5eee0' } as const
type Bloom = keyof typeof TREE_BLOOMS

type CrownForm = keyof typeof TREE_CROWNS
type Bark = keyof typeof TREE_BARKS
type Effect = keyof typeof TREE_EFFECTS
type Style = {
  label: string; crown: CrownForm; bark: Bark; colors: [string, string, string]
  trunkHeight: number; trunkWidth: number; spread: number; branches: number; angle: number; density: number; effect: Effect
  sharpness?: number; taper?: number; size?: readonly [number, number]; bloom?: Bloom
}

export const TREE_STYLES = {
  pine: { label: 'Pinheiro em camadas', crown: 'layers', bark: 'grooves', colors: ['#604936', '#446854', '#7e9870'],
    trunkHeight: 85, trunkWidth: 11, spread: 77, branches: 6, angle: 20, density: 5, sharpness: 72, effect: 'none' },
  plum: { label: 'Ameixeira florida', crown: 'cloud', bark: 'grooves', colors: ['#604852', '#b47b92', '#e7b3c0'],
    trunkHeight: 67, trunkWidth: 13, spread: 85, branches: 5, angle: 48, density: 6, effect: 'petals' },
  oak: { label: 'Carvalho', crown: 'cloud', bark: 'grooves', colors: ['#665041', '#657551', '#9da574'],
    trunkHeight: 68, trunkWidth: 23, spread: 95, branches: 6, angle: 38, density: 7, effect: 'none' },
  willow: { label: 'Salgueiro', crown: 'droop', bark: 'grooves', colors: ['#6c6247', '#69805c', '#a8a675'],
    trunkHeight: 76, trunkWidth: 14, spread: 92, branches: 7, angle: 34, density: 9, sharpness: 83, effect: 'leaves' },
  birch: { label: 'Bétula', crown: 'oval', bark: 'paper', colors: ['#cdc1a7', '#929762', '#d3c98b'],
    trunkHeight: 83, trunkWidth: 8, spread: 60, branches: 5, angle: 54, density: 5, effect: 'pollen' },
  palm: { label: 'Palmeira', crown: 'fronds', bark: 'rings', colors: ['#9a7354', '#588477', '#98ad72'],
    trunkHeight: 80, trunkWidth: 10, spread: 100, branches: 7, angle: 40, density: 7, taper: 74, sharpness: 92, effect: 'none' },
  baobab: { label: 'Baobá', crown: 'umbrella', bark: 'smooth', colors: ['#9b735f', '#788755', '#b8ad75'],
    trunkHeight: 66, trunkWidth: 32, spread: 94, branches: 6, angle: 51, density: 6, sharpness: 32, effect: 'none' },
  maple: { label: 'Bordo de outono', crown: 'cloud', bark: 'grooves', colors: ['#664840', '#ab6248', '#dfaa69'],
    trunkHeight: 72, trunkWidth: 17, spread: 89, branches: 6, angle: 48, density: 7, effect: 'leaves' },
  cypress: { label: 'Cipreste', crown: 'oval', bark: 'smooth', colors: ['#564c42', '#536b61', '#8aa181'],
    trunkHeight: 90, trunkWidth: 9, spread: 44, branches: 5, angle: 65, density: 8, sharpness: 54, effect: 'none' },
  ipe: { label: 'Ipê', crown: 'cloud', bark: 'grooves', colors: ['#654c47', '#53694c', '#a4a16a'],
    trunkHeight: 73, trunkWidth: 13, spread: 88, branches: 6, angle: 56, density: 10, sharpness: 35, effect: 'petals' },
  araucaria: { label: 'Araucária', crown: 'whorls', bark: 'grooves', colors: ['#675044', '#335647', '#81a279'],
    trunkHeight: 87, trunkWidth: 12, spread: 91, branches: 8, angle: 28, density: 8, taper: 49, sharpness: 96, effect: 'none', size: [480, 740] },
  brazilwood: { label: 'Pau-brasil', crown: 'cloud', bark: 'grooves', colors: ['#805342', '#536e44', '#a2ae62'],
    trunkHeight: 69, trunkWidth: 16, spread: 91, branches: 6, angle: 48, density: 9, sharpness: 22, effect: 'none', bloom: 'yellow' },
  brazilnut: { label: 'Castanheira', crown: 'emergent', bark: 'grooves', colors: ['#69584e', '#4c6952', '#8c9f68'],
    trunkHeight: 84, trunkWidth: 17, spread: 95, branches: 7, angle: 47, density: 8, sharpness: 51, effect: 'none', size: [590, 950] },
  jequitiba: { label: 'Jequitibá-rosa', crown: 'emergent', bark: 'grooves', colors: ['#7c5957', '#546e51', '#a99b71'],
    trunkHeight: 85, trunkWidth: 24, spread: 95, branches: 8, angle: 33, density: 10, sharpness: 36, effect: 'none', size: [680, 1180] },
  redwood: { label: 'Sequoia-sempre-viva', crown: 'layers', bark: 'grooves', colors: ['#845342', '#355a4f', '#769272'],
    trunkHeight: 90, trunkWidth: 26, spread: 73, branches: 8, angle: 25, density: 9, taper: 31, sharpness: 88, effect: 'none', size: [710, 1860] },
  centurion: { label: 'Eucalipto Centurião', crown: 'emergent', bark: 'paper', colors: ['#a9a194', '#587366', '#9db19a'],
    trunkHeight: 85, trunkWidth: 16, spread: 73, branches: 5, angle: 45, density: 6, taper: 49, sharpness: 89, effect: 'none', size: [560, 1720] },
  tule: { label: 'Árvore de Tule', crown: 'cloud', bark: 'grooves', colors: ['#776354', '#547059', '#879879'],
    trunkHeight: 68, trunkWidth: 38, spread: 100, branches: 8, angle: 33, density: 10, taper: 52, sharpness: 47, effect: 'none', size: [1220, 1130] },
  shrub: { label: 'Moita', crown: 'cloud', bark: 'smooth', colors: ['#625542', '#557051', '#9da86c'],
    trunkHeight: 44, trunkWidth: 5, spread: 95, branches: 6, angle: 50, density: 9, sharpness: 24, effect: 'none', size: [250, 155] },
} satisfies Record<string, Style>

export type TreeStyle = keyof typeof TREE_STYLES
export type TreeParams = {
  style: TreeStyle; seed: number; flip: boolean
  trunkHeight: number; trunkWidth: number; taper: number; lean: number; bark: Bark; barkColor: string
  branches: number; angle: number; spread: number; crown: CrownForm; density: number; leafSize: number; sharpness: number
  leafColor: string; accentColor: string; bloom: Bloom; flowerColor: string
  effect: Effect; particles: number; wind: number; trunkSway: number; windPeriod: number
  climbTrunk: boolean; walkBranches: boolean; walkCrown: boolean
}

export const TREE_SIZE = { w: 380, h: 460 }
export const TREE_NUMBERS = {
  trunkHeight: [42, 92], trunkWidth: [4, 38], taper: [15, 95], lean: [-22, 22],
  branches: [0, 8], angle: [8, 75], spread: [35, 100], density: [1, 10], leafSize: [45, 145],
  sharpness: [0, 100], wind: [0, 5], trunkSway: [0, 5], windPeriod: [3, 12], particles: [0, 4],
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
  const variants = Object.keys(BLOOM_COLORS) as (keyof typeof BLOOM_COLORS)[]
  const bloom = style === 'ipe' ? variants[Math.floor(treeRandom(seed ^ 0x1f33)() * variants.length)] : p.bloom ?? 'none'
  return { style, seed, flip: false, trunkHeight: p.trunkHeight, trunkWidth: p.trunkWidth, taper: p.taper ?? 38, lean: 0,
    bark: p.bark, barkColor, branches: p.branches, angle: p.angle, spread: p.spread, crown: p.crown,
    density: p.density, leafSize: 100, sharpness: p.sharpness ?? 18, leafColor, accentColor, bloom, flowerColor: '#ed9ec6',
    effect: p.effect, particles: p.effect === 'none' ? 0 : 3,
    wind: 2, trunkSway: 1, windPeriod: 7, climbTrunk: false, walkBranches: false, walkCrown: false }
}

export function treeFlowerColor(tree: TreeParams) {
  if (tree.bloom === 'none') return null
  return tree.bloom === 'custom' ? tree.flowerColor : BLOOM_COLORS[tree.bloom]
}

export function treeDraftSize({ style, seed }: Pick<TreeParams, 'style' | 'seed'>) {
  const p: Style = TREE_STYLES[style]
  const slender = style === 'birch' || style === 'cypress' || style === 'palm'
  const [width, height] = p.size ?? (slender ? [320, 535] : [410, 465])
  const rand = treeRandom(seed ^ 0xb63731)
  return { w: Math.round(width * (.92 + rand() * .16)), h: Math.round(height * (.91 + rand() * .18)) }
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
    density: around('density', 2), leafSize: around('leafSize', 21), sharpness: around('sharpness', 9), wind: around('wind', 1), windPeriod: around('windPeriod', 3),
    barkColor: tint(base.barkColor), leafColor: tint(base.leafColor), accentColor: tint(base.accentColor),
  }
  return { tree, ...treeDraftSize(tree) }
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
    effect: oneOf(p.effect, TREE_EFFECTS, d.effect), bloom: oneOf(p.bloom, TREE_BLOOMS, d.bloom), flowerColor: color(p.flowerColor, d.flowerColor),
    barkColor: color(p.barkColor, d.barkColor), leafColor: color(p.leafColor, d.leafColor),
    accentColor: color(p.accentColor, d.accentColor), climbTrunk: p.climbTrunk === true, walkBranches: p.walkBranches === true, walkCrown: p.walkCrown === true }
}

export type TreePoint = [number, number]
export type TreeCrown = { x: number; y: number; rx: number; ry: number; frond?: TreePoint[] }
const r1 = (n: number) => Math.round(n * 10) / 10
const point = (x: number, y: number): TreePoint => [r1(x), r1(y)]

const BRANCH_BANDS: Record<Exclude<CrownForm, 'fronds'>, [number, number]> = {
  layers: [.31, .96], cloud: [.48, .89], droop: [.54, .91], oval: [.40, .94],
  umbrella: [.56, .96], whorls: [.71, .98], emergent: [.71, .95],
}

function palmFronds(tree: TreeParams, count: number, tip: number, top: number, rand: () => number) {
  return Array.from({ length: count }, (_, i) => {
    const arc = count === 1 ? 0 : -2.28 + 4.56 * i / (count - 1)
    const angle = Math.abs(arc) < .10 ? .13 : arc
    const length = tree.spread * (.32 + rand() * .12) * (.8 + .2 * Math.abs(Math.sin(angle))) * Math.sqrt(tree.leafSize / 100)
    const x = clamp(tip + Math.sin(angle) * length, 5, 95)
    const y = clamp(top - Math.cos(angle) * length * .71, 3, 94)
    const cx = (tip + x) / 2, cy = Math.max(2, Math.min(top, y) - Math.abs(x - tip) * .25)
    return Array.from({ length: 6 }, (_, j) => {
      const t = j / 5, u = 1 - t
      return point(u * u * tip + 2 * u * t * cx + t * t * x, u * u * top + 2 * u * t * cy + t * t * y)
    })
  })
}

function branchCrowns(tree: TreeParams, branches: TreePoint[][], tip: number, top: number, rand: () => number): TreeCrown[] {
  const spread = tree.spread / 100
  const count = Math.max(branches.length, tree.density)
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? .5 : i / (count - 1)
    const leaf = tree.leafSize / 100 * (.86 + rand() * .28)
    const branch = branches[i % Math.max(1, branches.length)]
    const terminal = branch?.at(-1)
    const extra = !!branch && i >= branches.length
    const centered = !terminal || (extra && i === count - 1 && tree.crown !== 'umbrella')
    let x = centered ? tip + (extra ? 0 : (t - .5) * 32 * spread) : terminal[0]
    let y = centered ? top + (extra ? 1 : 7 + Math.abs(t - .5) * 13) : terminal[1]
    if (extra && !centered) {
      x = (x * 2 + branch[1][0]) / 3
      y -= 3 + rand() * 5
    }
    let rx: number, ry: number
    switch (tree.crown) {
      case 'layers': rx = (8 + (1 - t) * 14) * spread * leaf; ry = (3.5 + (1 - t) * 3.5) * leaf; break
      case 'droop': rx = (8 + rand() * 5) * leaf; ry = (11 + rand() * 11) * leaf; y += ry * .75; break
      case 'oval': rx = (9 + rand() * 8) * spread * leaf; ry = (9 + rand() * 8) * leaf; break
      case 'umbrella': rx = (9 + rand() * 5) * spread * leaf; ry = (4.2 + rand() * 3) * leaf; break
      case 'whorls': rx = (8 + rand() * 6) * spread * leaf; ry = (3.1 + rand() * 2) * leaf; break
      case 'emergent':
        rx = (tree.style === 'centurion' ? 7 + rand() * 6 : 13 + rand() * 8) * spread * leaf
        ry = (tree.style === 'centurion' ? 4.5 + rand() * 4 : 7 + rand() * 6) * leaf
        break
      default: rx = (13 + rand() * 8) * spread * leaf; ry = (8 + rand() * 7) * leaf; break
    }
    if (tree.style === 'shrub' && tree.crown === 'cloud') { y += 9; ry *= 1.38 }
    y = clamp(y, 3, 96)
    rx = clamp(rx, 2, Math.max(2, Math.min(x - 1, 99 - x)))
    ry = clamp(ry, 1.5, Math.max(1.5, Math.min(y - 1, 98 - y)))
    return { x: r1(x), y: r1(y), rx: r1(rx), ry: r1(ry) }
  })
}

export function treeGeometry(tree: TreeParams) {
  const rand = treeRandom(tree.seed)
  const top = 100 - tree.trunkHeight, tip = 50 + tree.lean
  const half = tree.trunkWidth / 2, tipHalf = half * tree.taper / 100
  const trunk = [point(50 - half, 100), point(tip - tipHalf, top), point(tip + tipHalf, top), point(50 + half, 100)]
  if (tree.crown === 'fronds') {
    const fronds = palmFronds(tree, tree.branches || tree.density, tip, top, rand)
    const crowns: TreeCrown[] = fronds.map(frond => {
      const [x, y] = frond[3]
      return { x, y, rx: 5, ry: 4, frond }
    })
    return { trunk, branches: tree.branches ? fronds : [], crowns }
  }

  const [low, high] = BRANCH_BANDS[tree.crown]
  const pairs = Math.ceil(tree.branches / 2)
  const branches = Array.from({ length: tree.branches }, (_, i) => {
    const side = i % 2 ? 1 : -1
    const level = pairs < 2 ? .6 : Math.floor(i / 2) / (pairs - 1)
    const from = clamp(low + (high - low) * level + (rand() - .5) * (tree.crown === 'whorls' ? .025 : .10), .2, .99)
    const ax = 50 + tree.lean * from, ay = 100 - tree.trunkHeight * from
    const taper = tree.crown === 'layers' ? 1 - level * .65 : tree.crown === 'oval' ? .55 : 1
    const length = tree.spread * (.21 + rand() * .17) * taper
    const bx = clamp(ax + side * length, 7, 93)
    const rise = Math.min(ay - 4, length * tree.angle / 100)
    const knee = tree.crown === 'whorls' ? .32 : .72
    return [point(ax, ay), point(ax + (bx - ax) * .64, ay - rise * knee), point(bx, ay - rise)]
  })
  return { trunk, branches, crowns: branchCrowns(tree, branches, tip, top, rand) }
}

export function treeSurfaces(tree: TreeParams, geometry = treeGeometry(tree)) {
  const [a, b, c, d] = geometry.trunk
  const walls = tree.climbTrunk ? [[a, b], [d, c]] : []
  const floors: TreePoint[][] = tree.climbTrunk ? [[b, c]] : []
  if (tree.walkBranches) floors.push(...geometry.branches)
  if (tree.walkCrown) {
    for (const { x, y, rx, ry, frond } of geometry.crowns) {
      if (frond) {
        if (!tree.walkBranches || !geometry.branches.includes(frond)) floors.push(frond)
      } else {
        floors.push([point(x - rx * .65, y - ry * .52), point(x + rx * .65, y - ry * .52)])
      }
    }
  }
  return { floors, walls }
}
