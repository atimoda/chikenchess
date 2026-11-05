// Percentages are local to the house box. Art and one-way floors share the same geometry.
export const HOUSE_ROOFS = {
  gable: 'Duas águas', shed: 'Uma água ↗', reverse: 'Uma água ↘', flat: 'Terraço',
  hip: 'Quatro águas', stepped: 'Escalonado', curved: 'Curvo', mansard: 'Mansarda', tower: 'Torre',
} as const
export const WALL_TEXTURES = {
  auto: 'Automática', smooth: 'Lisa', plaster: 'Reboco', canvas: 'Tela', clapboard: 'Tábuas horizontais',
  boards: 'Tábuas verticais', corrugated: 'Chapa ondulada', brick: 'Tijolo', stone: 'Pedra',
} as const
export const ROOF_TEXTURES = {
  plain: 'Liso', tile: 'Telha de barro', slate: 'Ardósia', scales: 'Escamas', diamond: 'Losangos', stripes: 'Faixas',
} as const
export const OPENING_SHAPES = { rect: 'Reta', arch: 'Arco', round: 'Redonda' } as const
export const HOUSE_GLAZING = { dark: 'Escura', warm: 'Luz quente', blue: 'Vidro azul' } as const

type Roof = keyof typeof HOUSE_ROOFS
type WallTexture = keyof typeof WALL_TEXTURES
type RoofTexture = keyof typeof ROOF_TEXTURES
type OpeningShape = keyof typeof OPENING_SHAPES
type Glazing = keyof typeof HOUSE_GLAZING
export const HOUSE_DOOR_POSITIONS = { left: 'Esquerda', center: 'Centro', right: 'Direita' } as const
type Palette = [wall: string, roof: string, trim: string, door: string]
type Style = {
  label: string; roofs: Roof[]; textures: Exclude<WallTexture, 'auto'>[]; tiles: RoofTexture
  palettes: Palette[]; floors: number; windows: number; pitch: number; wear: number
  window: OpeningShape; door: OpeningShape; glass: Glazing; panes: boolean; shutters: boolean
}

export const HOUSE_STYLES = {
  cliff: { label: 'Encosta de ferrugem', roofs: ['gable', 'shed', 'reverse', 'hip'], textures: ['plaster', 'brick', 'boards'], tiles: 'tile',
    palettes: [['#a44236', '#692b2e', '#ede0cc', '#3a6881'], ['#426687', '#27364f', '#e4e7de', '#a5382e'], ['#b5887b', '#86342f', '#f2dac5', '#47718a'], ['#6c677e', '#34304a', '#d7d4d0', '#88382f'], ['#a56c51', '#693634', '#f4dfc1', '#324c61']],
    floors: 2, windows: 2, pitch: 23, wear: 68, window: 'rect', door: 'rect', glass: 'dark', panes: true, shutters: false },
  stacked: { label: 'Casario empilhado', roofs: ['shed', 'reverse', 'gable'], textures: ['corrugated', 'plaster', 'boards'], tiles: 'tile',
    palettes: [['#c34430', '#59352d', '#f2b888', '#375f50'], ['#e0a523', '#61433b', '#f5db9b', '#2d6d9d'], ['#2c877b', '#5c403e', '#dbcda9', '#c54832'], ['#488196', '#533b3a', '#e0d9c6', '#d69431']],
    floors: 3, windows: 2, pitch: 16, wear: 60, window: 'rect', door: 'rect', glass: 'dark', panes: false, shutters: false },
  painted: { label: 'Colinas pintadas', roofs: ['gable', 'flat', 'hip'], textures: ['canvas', 'smooth', 'plaster'], tiles: 'plain',
    palettes: [['#e5942b', '#a74f2d', '#fbc579', '#67362e'], ['#be4f58', '#98384b', '#f59786', '#602f42'], ['#4594a7', '#236a86', '#91c9bf', '#223d56'], ['#e7d6a3', '#5c6b53', '#b4c17b', '#435c70']],
    floors: 1, windows: 2, pitch: 17, wear: 25, window: 'rect', door: 'rect', glass: 'dark', panes: false, shutters: false },
  geometric: { label: 'Cidade geométrica', roofs: ['stepped', 'gable', 'hip', 'mansard'], textures: ['smooth', 'canvas'], tiles: 'stripes',
    palettes: [['#6b9e8e', '#354e58', '#dbe0ba', '#4d675c'], ['#c56571', '#743e3f', '#f0d7ac', '#693d53'], ['#d9a94c', '#335664', '#eee3c6', '#605345'], ['#6b94a5', '#383e54', '#e6d7a3', '#40546a']],
    floors: 3, windows: 3, pitch: 24, wear: 10, window: 'rect', door: 'rect', glass: 'blue', panes: true, shutters: false },
  terraces: { label: 'Terraços da lua', roofs: ['flat', 'flat', 'shed'], textures: ['stone', 'plaster', 'canvas'], tiles: 'plain',
    palettes: [['#284d62', '#142c40', '#6392a0', '#275269'], ['#b66a36', '#854229', '#ecac63', '#713c33'], ['#438887', '#1a4f56', '#a2b997', '#35645b'], ['#a7433b', '#653439', '#ed9c68', '#672e37']],
    floors: 2, windows: 2, pitch: 10, wear: 48, window: 'arch', door: 'arch', glass: 'warm', panes: true, shutters: false },
  nordic: { label: 'Madeira costeira', roofs: ['gable', 'gable', 'shed', 'hip'], textures: ['clapboard', 'boards'], tiles: 'slate',
    palettes: [['#387b8b', '#273a51', '#f0e7d8', '#224659'], ['#b14a42', '#4b3535', '#f4e5d4', '#703630'], ['#d99843', '#4b3934', '#fff0d1', '#7e5838'], ['#79967e', '#38474f', '#f5e8ce', '#416858'], ['#e0d7c4', '#526979', '#fbf2de', '#755444']],
    floors: 2, windows: 2, pitch: 31, wear: 22, window: 'rect', door: 'rect', glass: 'blue', panes: true, shutters: false },
  storybook: { label: 'Vila de conto', roofs: ['curved', 'gable', 'mansard', 'hip'], textures: ['plaster', 'stone', 'canvas'], tiles: 'scales',
    palettes: [['#668897', '#2b465f', '#f2e1b8', '#3e5364'], ['#c57f59', '#473b50', '#f6dfb7', '#723e40'], ['#e0c394', '#4a6574', '#fff0c7', '#5e5960'], ['#8f738c', '#443c58', '#e5cfb7', '#4e4669']],
    floors: 2, windows: 2, pitch: 29, wear: 24, window: 'arch', door: 'arch', glass: 'warm', panes: true, shutters: true },
  ornamental: { label: 'Cidade ornamental', roofs: ['tower', 'hip', 'stepped', 'mansard'], textures: ['brick', 'plaster', 'stone'], tiles: 'slate',
    palettes: [['#b98597', '#714950', '#f2d3c0', '#535472'], ['#c99a5c', '#7a4738', '#f6deb6', '#5d6450'], ['#64938a', '#3e5a6d', '#e4d7aa', '#3a6d6a'], ['#7692b4', '#444960', '#e9dfd1', '#56617d']],
    floors: 3, windows: 3, pitch: 27, wear: 28, window: 'arch', door: 'arch', glass: 'blue', panes: true, shutters: false },
  folk: { label: 'Telhas de festa', roofs: ['tower', 'reverse', 'gable', 'hip'], textures: ['canvas', 'plaster', 'brick'], tiles: 'diamond',
    palettes: [['#4471ad', '#313147', '#efbd52', '#af4742'], ['#db624b', '#76373c', '#ffd674', '#a64343'], ['#9ba456', '#823935', '#f6dd92', '#3e6c58'], ['#e2a74d', '#3b6995', '#f9d9a5', '#7b4a47']],
    floors: 2, windows: 2, pitch: 25, wear: 24, window: 'arch', door: 'rect', glass: 'warm', panes: true, shutters: true },
  garden: { label: 'Vila-jardim', roofs: ['gable', 'shed', 'hip'], textures: ['plaster', 'stone', 'smooth'], tiles: 'tile',
    palettes: [['#e9e0c9', '#356d8e', '#f7eed8', '#3d6b8e'], ['#ece2cb', '#b94f37', '#faf0d6', '#bd623a'], ['#dfba48', '#3b776a', '#f4e3aa', '#4e695a'], ['#e8e1c6', '#c09132', '#fbefce', '#596864']],
    floors: 1, windows: 2, pitch: 21, wear: 18, window: 'rect', door: 'rect', glass: 'blue', panes: false, shutters: false },
} satisfies Record<string, Style>

export type HouseStyle = keyof typeof HOUSE_STYLES
export type HouseOpening = { kind: 'window' | 'door'; shape: OpeningShape; x: number; y: number; w: number; h: number }
export type HouseParams = {
  style: HouseStyle; seed: number; roof: Roof; pitch: number; roofTexture: RoofTexture
  texture: WallTexture; wear: number; wall: string; roofColor: string; trim: string; doorColor: string
  floors: number; windows: number; windowSize: number; windowShape: OpeningShape; doorShape: OpeningShape; door: boolean
  doorPosition: keyof typeof HOUSE_DOOR_POSITIONS; glass: Glazing; panes: boolean; shutters: boolean
}

export const newHouseSeed = () => Math.floor(Math.random() * 0x100000000)

export function houseRandom(seed: number) {
  let n = seed >>> 0
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0
    return n / 0x100000000
  }
}

export function housePreset(style: HouseStyle = 'cliff', seed = 1): HouseParams {
  const s: Style = HOUSE_STYLES[style]
  const rand = houseRandom(seed)
  const [wall, roofColor, trim, doorColor] = s.palettes[Math.floor(rand() * s.palettes.length)]
  const roof = s.roofs[Math.floor(rand() * s.roofs.length)]
  return { style, seed, roof, pitch: s.pitch, roofTexture: s.tiles, texture: 'auto', wear: s.wear,
    wall, roofColor, trim, doorColor, floors: s.floors, windows: s.windows, windowSize: 100, windowShape: s.window,
    doorShape: s.door, door: true, doorPosition: 'center', glass: s.glass, panes: s.panes, shutters: s.shutters }
}

export const HOUSE_SIZE = { w: 380, h: 550 }
export type HouseStyleChoice = HouseStyle | 'random'

export function randomHouse(choice: HouseStyleChoice, seed = newHouseSeed()) {
  const rng = houseRandom(seed ^ 0x91cb57e3)
  const pick = <T>(items: readonly T[]) => items[Math.floor(rng() * items.length)]
  const between = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
  const style = choice === 'random' ? pick(Object.keys(HOUSE_STYLES) as HouseStyle[]) : choice
  const d = housePreset(style, seed)
  const traits: Style = HOUSE_STYLES[style]
  const house: HouseParams = {
    ...d, pitch: between(Math.max(8, d.pitch - 8), Math.min(40, d.pitch + 8)),
    roofTexture: pick([d.roofTexture, d.roofTexture, 'plain', 'tile', 'slate']),
    texture: pick(traits.textures), wear: between(Math.max(0, d.wear - 23), Math.min(100, d.wear + 23)),
    floors: between(Math.max(1, d.floors - 1), Math.min(4, d.floors + 1)), windows: between(1, 4),
    windowSize: between(72, 130), windowShape: pick([d.windowShape, d.windowShape, 'rect', 'arch', 'round']),
    doorShape: pick([d.doorShape, 'rect', 'arch']), door: rng() > .16,
    doorPosition: pick(['left', 'center', 'right']), glass: pick([d.glass, d.glass, 'warm', 'blue', 'dark']),
    panes: rng() < .65, shutters: rng() < .32,
  }
  return { house, w: between(340, 420), h: between(485, 615) }
}

export function houseWallTexture(p: HouseParams): Exclude<WallTexture, 'auto'> {
  if (p.texture !== 'auto') return p.texture
  const choices = HOUSE_STYLES[p.style].textures
  return choices[Math.floor(houseRandom(p.seed ^ 0x974b28c3)() * choices.length)]
}

const number = (v: unknown, fallback: number, lo: number, hi: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v))) : fallback
const choice = <K extends string>(v: unknown, set: Record<K, unknown>, fallback: K): K =>
  typeof v === 'string' && Object.hasOwn(set, v) ? v as K : fallback
const color = (v: unknown, fallback: string) => typeof v === 'string' && /^#[\da-f]{6}$/i.test(v) ? v.toLowerCase() : fallback
const bool = (v: unknown, fallback: boolean) => typeof v === 'boolean' ? v : fallback

export function normalizeHouse(raw: unknown): HouseParams {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Partial<HouseParams>
  const d = housePreset(choice(p.style, HOUSE_STYLES, 'cliff'), number(p.seed, 1, 0, 0xffffffff))
  return {
    ...d, roof: choice(p.roof, HOUSE_ROOFS, d.roof), pitch: number(p.pitch, d.pitch, 8, 40),
    roofTexture: choice(p.roofTexture, ROOF_TEXTURES, d.roofTexture), texture: choice(p.texture, WALL_TEXTURES, d.texture),
    wear: number(p.wear, d.wear, 0, 100),
    wall: color(p.wall, d.wall), roofColor: color(p.roofColor, d.roofColor), trim: color(p.trim, d.trim), doorColor: color(p.doorColor, d.doorColor),
    floors: number(p.floors, d.floors, 1, 4), windows: number(p.windows, d.windows, 0, 4), windowSize: number(p.windowSize, 100, 65, 130),
    windowShape: choice(p.windowShape, OPENING_SHAPES, d.windowShape), doorShape: choice(p.doorShape, OPENING_SHAPES, d.doorShape),
    door: bool(p.door, d.door), doorPosition: choice(p.doorPosition, HOUSE_DOOR_POSITIONS, d.doorPosition), glass: choice(p.glass, HOUSE_GLAZING, d.glass), panes: bool(p.panes, d.panes), shutters: bool(p.shutters, d.shutters),
  }
}

type Point = [number, number]
type Surface = { id: string; points: Point[] }
export const HOUSE_WALL = { left: 7, right: 93, bottom: 100 }
export const HOUSE_BASE: Point[] = [[HOUSE_WALL.left, HOUSE_WALL.bottom], [HOUSE_WALL.right, HOUSE_WALL.bottom]]

export function houseRoof(p: HouseParams): Point[] {
  const low = p.pitch + 3
  const mid = 3 + p.pitch * 0.5
  switch (p.roof) {
    case 'flat': return [[0, low], [100, low]]
    case 'shed': return [[0, low], [100, 3]]
    case 'reverse': return [[0, 3], [100, low]]
    case 'hip': return [[0, low], [27, 3], [73, 3], [100, low]]
    case 'stepped': return [[0, low], [23, low], [23, mid], [41, mid], [41, 3], [62, 3], [62, mid], [80, mid], [80, low], [100, low]]
    case 'curved': return [[0, low], [13, low - p.pitch * 0.18], [27, mid], [39, 5], [50, 3], [61, 5], [73, mid], [87, low - p.pitch * 0.18], [100, low]]
    case 'mansard': return [[0, low], [14, mid], [29, 3], [71, 3], [86, mid], [100, low]]
    case 'tower': return [[0, low], [37, mid], [50, 3], [63, mid], [100, low]]
    case 'gable': return [[0, low], [50, 3], [100, low]]
  }
}

export function houseOpenings(p: HouseParams): HouseOpening[] {
  const result: HouseOpening[] = []
  const top = p.pitch + 10
  const floorHeight = (94 - top) / p.floors
  const windowHeight = Math.min(23, Math.max(9, floorHeight * 0.55)) * p.windowSize / 100
  const doorW = p.windows >= 3 ? 17 : 23
  const doorH = Math.min(30, Math.max(18, floorHeight * 0.74))
  const windowW = Math.min(22, 54 / Math.max(1, p.windows)) * p.windowSize / 100
  const doorX = { left: 28, center: 50, right: 72 }[p.doorPosition]
  for (let floor = 0; floor < p.floors; floor++) {
    for (let col = 0; col < p.windows; col++) {
      const x = 19 + 62 * (col + 0.5) / p.windows
      if (p.door && floor === p.floors - 1 && Math.abs(x - doorX) < (doorW + windowW) / 2 + 1) continue
      result.push({ kind: 'window', shape: p.windowShape, x, y: top + (floor + 0.38) * floorHeight - windowHeight / 2, w: windowW, h: windowHeight })
    }
  }
  if (p.door) result.push({ kind: 'door', shape: p.doorShape, x: doorX, y: 100 - doorH, w: doorW, h: doorH })
  return result
}

export function openingGeometry(p: HouseParams, o: HouseOpening) {
  const y = Math.max(p.pitch + 5, Math.min(85, o.y))
  const w = Math.min(o.w, 2 * Math.min(o.x - HOUSE_WALL.left - 3, HOUSE_WALL.right - 3 - o.x))
  const h = Math.min(o.h, (o.kind === 'door' ? 100 : 97) - y)
  const left = o.x - w / 2
  return { ...o, left, right: left + w, w, y, h }
}

export function houseSurfaces(p: HouseParams, w: number, h: number): Surface[] {
  const lines: Surface[] = [{ id: 'roof', points: houseRoof(p) }]
  houseOpenings(p).forEach((opening, i) => {
    const o = openingGeometry(p, opening)
    const left = o.left - 2, right = o.right + 2
    lines.push({ id: `lintel-${i}`, points: [[left, o.y], [right, o.y]] })
    if (o.kind === 'window') lines.push({ id: `sill-${i}`, points: [[left, o.y + o.h], [right, o.y + o.h]] })
  })
  lines.push({ id: 'base', points: HOUSE_BASE })
  return lines.map(l => ({ ...l, points: l.points.map(([x, y]) => [x * w / 100, y * h / 100]) }))
}
