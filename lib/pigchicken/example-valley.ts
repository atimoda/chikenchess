// The example Pátio "Vales e ilhas no céu" (Playgrounds → Novo Pátio de exemplo), built only from what the editor
// mode offers. A world of the default width (4 scenes plus the two empty ones of the Templo and the Vila), filled
// from the ground to the ceiling:
// - the ground: six biomes side by side, each with its own community of houses, trees, items and music
//   (Campina, Floresta gigante, Deserto, Vulcão, Montanha nevada, Vila de conto);
// - three layers of floating islands, each a small ecosystem with its houses (the top one is Asgard);
// - wooden poles along the villages and transmission towers that wire the regions and the layers together
//   (every wire is a link, as "Ligar fios" makes them);
// - ladders of small platforms, trampolines and two pairs of portals between the layers.
// Mjölnir and Odin's staff are not items of the game yet: two sculptures (a stone Parede and a wooden one) mark
// where they stand, in the volcano's crater and in front of Asgard's hall.
import { LAYOUT_VERSION, entryPortalElement, layoutFloorBelow, normalizeElement, storeElementPosition, type ElementKind, type HordeButton, type LayoutElement, type PatioLayout } from './layout'
import { POWER_MODELS, defaultPower } from './power-lines'
import { treeDraftSize, treePreset, type TreeParams, type TreeStyle } from './trees'
import { housePreset, type HouseParams, type HouseStyle } from './houses'
import { fitSurface, type GroundBiome, type SurfacePoint, type WallStyle } from './surfaces'
import { defaultSoundZone, type SoundZoneParams } from './sound-zones'
import { SCENE_W, WORLD_GROUND_Y } from './world'
import { SKY_DEFAULT, hourStops, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT, type MountainParams } from './mountains'
import { CLOUDS_DEFAULT, type CloudParams } from './clouds'
import type { ItemId } from './items'

const G = WORLD_GROUND_Y
export const VALLEY_SCREENS = 4
const WORLD_W = (VALLEY_SCREENS + 2) * SCENE_W

export const VALLEY_SKY: SkyParams = { ...SKY_DEFAULT, hour: 16.3, follow: true, stops: hourStops(16.3), sunSize: 42, glow: 75, clouds: 55, texture: 18, haze: 42, silhouette: 8, light: 35 }
export const VALLEY_MOUNTAINS: MountainParams = { ...MOUNTAINS_DEFAULT, ranges: 5, peak: 'sharp', height: 115, lift: 14, shade: 45, snow: 55, snowEdge: 60, gradient: 30 }
export const VALLEY_CLOUDS: CloudParams = { ...CLOUDS_DEFAULT, kind: 'cumulus', amount: 70, size: 140, height: 62, spread: 70, puffs: 60 }

type Island = { l: number; r: number; y: number }

export function valleyLayout(): PatioLayout {
  let n = 0
  const out: LayoutElement[] = []
  const add = (kind: ElementKind, raw: Partial<LayoutElement>): LayoutElement => {
    const e = normalizeElement({ id: `${kind}-vale${++n}`, kind, ...raw })!
    out.push(e)
    return e
  }
  // the floor under x: the valley's ground, or (looking down from `from`) whatever comes first: an island, a deck…
  const base: LayoutElement[] = []
  const floor = (x: number, from?: number) => from === undefined ? layoutFloorBelow(base, x, -9999) : layoutFloorBelow(out, x, from)

  // ---------- land ----------
  const land = (style: GroundBiome, world: SurfacePoint[]) => {
    const { points, ...box } = fitSurface(world, 40, 24)
    return add('ground', { ...box, hard: true, params: { surface: { style, points } } })
  }
  // a stretch of the ground: its top as [x, height above the floor], closed a little under the floor
  const terrain = (style: GroundBiome, top: [number, number][]) =>
    base.push(land(style, [...top.map(([x, h]) => [x, G - h] as SurfacePoint), [top[top.length - 1][0], G + 10], [top[0][0], G + 10]]))
  // a floating island: a flat top with lower rims and a rocky belly
  const isle = (style: GroundBiome, cx: number, y: number, w: number, t: number): Island => {
    const l = cx - w / 2, r = cx + w / 2
    land(style, [
      [l, y + 16], [l + w * 0.07, y], [r - w * 0.07, y], [r, y + 16],
      [r - w * 0.06, y + t * 0.45], [cx + w * 0.22, y + t * 0.8], [cx + w * 0.05, y + t], [cx - w * 0.2, y + t * 0.85], [l + w * 0.1, y + t * 0.5],
    ])
    return { l, r, y }
  }
  // a wooden deck (a Parede of wood lying down, a one-way floor)
  const deck = (x: number, y: number, w: number) =>
    add('wall', { x, y, w, h: 18, hard: false, params: { surface: { style: 'wood', points: [[0, 0], [100, 0], [100, 100], [0, 100]] } } })
  const step = (cx: number, y: number) => add('platform', { x: cx - 70, y, w: 140, h: 24 })
  // small platforms from (x0, y0) up to just under (x1, y1), each within a jump of the one before
  const stairs = (x0: number, y0: number, x1: number, y1: number, zig = 0) => {
    const rise = y0 - y1 - 40
    const count = Math.max(1, Math.ceil(rise / 105), Math.ceil(Math.abs(x1 - x0) / 170))
    for (let i = 1; i <= count; i++) step(x0 + ((x1 - x0) * i) / count + ((count - i) % 2 ? -zig : zig), y0 - (rise * i) / count)
  }
  // a zigzag ladder beside an island's edge; its last step is on the island's side (side 1: the island to the right)
  const ladder = (cx: number, y0: number, y1: number, side: 1 | -1) => stairs(cx, y0, cx, y1, 70 * side)

  // ---------- things ----------
  const house = (style: HouseStyle, seed: number, cx: number, w: number, h: number, from?: number, over: Partial<HouseParams> = {}) =>
    add('house', { x: cx - w / 2, y: floor(cx, from) - h, w, h, params: { house: { ...housePreset(style, seed), ...over } } })
  const tree = (style: TreeStyle, seed: number, cx: number, scale = 1, from?: number, over: Partial<TreeParams> = {}, extra: Partial<LayoutElement> = {}) => {
    const size = treeDraftSize({ style, seed })
    const w = size.w * scale, h = size.h * scale
    return add('tree', { x: cx - w / 2, y: (extra.depth ? G : floor(cx, from)) + 8 - h, w, h, layer: 'back', ...extra, params: { tree: { ...treePreset(style, seed), flip: seed % 2 === 1, ...over } } })
  }
  const rack = (item: ItemId, cx: number, from?: number) => add('rack', { x: cx - 38, y: floor(cx, from) - 62, params: { item } })
  const button = (action: HordeButton, cx: number, from?: number) => add('button', { x: cx - 20, y: floor(cx, from) - 86, params: { action } })
  const dummy = (cx: number, message: string, from?: number) => add('dummy', { x: cx - 23, y: floor(cx, from) - 112, params: { message } })
  const trampoline = (cx: number, strength: number, angle = 0, from?: number, w = 200) =>
    add('trampoline', { x: cx - w / 2, y: floor(cx, from) - 50, w, h: 50, params: { trampoline: { strength, angle } } })
  const portals = (ax: number, afrom: number | undefined, alabel: string, bx: number, bfrom: number | undefined, blabel: string) => {
    const a = add('portal', { x: ax - 75, y: floor(ax, afrom) - 144, params: { portalLabel: alabel, portalInstruction: 'always' } })
    a.params.portalPairId = a.id
    add('portal', { x: bx - 75, y: floor(bx, bfrom) - 144, params: { portalPairId: a.id, portalLabel: blabel, portalInstruction: 'always' } })
  }
  // poles and towers: every wire is a link made by hand (none joins its neighbour by itself)
  const power = (model: string, cx: number, scale = 1, from?: number, depth = 0, sag = 40, wire = 2) => {
    const m = POWER_MODELS[model]
    const w = m.w * scale, h = m.h * scale
    return add(m.kind, { x: cx - w / 2, y: (depth ? G : floor(cx, from)) + 6 - h, w, h, layer: 'back', ...(depth ? { depth } : {}), params: { power: { ...defaultPower(m.kind), model, sag, wire, links: [] } } })
  }
  const link = (...line: LayoutElement[]) => line.forEach((e, i) => { if (i) line[i - 1].params.power!.links!.push(e.id) })
  const zone = (x: number, y: number, w: number, h: number, z: Partial<SoundZoneParams>) => add('zone', { x, y, w, h, params: { zone: { ...defaultSoundZone(), ...z } } })

  // ---------- the ground: six biomes ----------
  terrain('meadow', [[0, 30], [300, 30], [440, 80], [800, 80], [900, 150], [1300, 150], [1420, 70], [1800, 70], [1880, 30], [1920, 30]])
  terrain('meadow', [[1920, 30], [2350, 30], [2500, 50], [2750, 50], [2900, 120], [3200, 120], [3350, 50], [3700, 50], [3840, 30]])
  terrain('desert', [[3840, 30], [3980, 30], [4150, 130], [4540, 130], [4720, 270], [5060, 270], [5210, 390], [5430, 390], [5600, 250], [5700, 250], [5760, 160]])
  terrain('volcanic', [[5760, 160], [5880, 160], [6160, 340], [6460, 340], [6720, 560], [6790, 560], [6900, 470], [7120, 470], [7230, 560], [7300, 560], [7540, 360], [7680, 360]])
  terrain('snow', [[7680, 360], [7760, 360], [7960, 480], [8330, 480], [8520, 620], [8800, 620], [8980, 770], [9040, 770], [9160, 860], [9280, 860], [9470, 700], [9540, 700], [9600, 640]])
  terrain('village', [[9600, 640], [9760, 500], [10000, 500], [10180, 350], [10560, 350], [10740, 200], [11120, 200], [11260, 90], [11420, 90], [WORLD_W, 40]])

  // ---------- the islands: three layers ----------
  const orchard = isle('meadow', 700, 330, 520, 120)
  const birches = isle('meadow', 1640, 250, 420, 110)
  const oasis = isle('desert', 4300, 280, 600, 130)
  const fair = isle('village', 10950, 120, 760, 130)
  const clouds = isle('meadow', 1150, -500, 1000, 170)
  const nest = isle('meadow', 3250, -700, 760, 150)
  const pueblo = isle('desert', 5050, -520, 860, 160)
  const forge = isle('volcanic', 6980, -420, 620, 140)
  const refuge = isle('snow', 8750, -640, 800, 150)
  const lookout = isle('village', 10700, -520, 720, 150)
  const garden = isle('meadow', 2150, -1500, 720, 150)
  const frost = isle('snow', 4150, -1650, 680, 150)
  const dunes = isle('desert', 7900, -1600, 740, 150)
  const ember = isle('volcanic', 9900, -1480, 660, 140)
  const asgard = isle('village', 6000, -2250, 1500, 220)
  const on = (i: Island) => i.y - 40

  // ---------- music: one Zona sonora per biome, one for the sky and one for Asgard ----------
  const column = (x0: number, x1: number, z: Partial<SoundZoneParams>) => zone(x0, -150, x1 - x0, G + 10 + 150, z)
  column(0, 1920, { name: 'Campina', root: 60, scale: 'majorPenta', chordScale: 'major', bpm: 100, feel: 'straight', progression: [0, 4, 5, 3], color: '#7bd88f', birds: ['canario', 'bemtevi'], ambience: { beat: 'breeze', bass: 'pad' } })
  column(1920, 3840, { name: 'Floresta gigante', root: 57, scale: 'minorPenta', chordScale: 'minor', bpm: 84, feel: 'half', progression: [0, 5, 2, 6], color: '#4f9d69', birds: ['sabia', 'coruja'], ambience: { beat: 'half', bass: 'droneDark' } })
  column(3840, 5760, { name: 'Deserto', root: 62, scale: 'mixolydian', chordScale: 'mixolydian', bpm: 104, feel: 'straight', progression: [0, 6, 3, 0], color: '#e9b872', birds: ['pardal'], ambience: { beat: 'baiao', bass: 'baiao' } })
  column(5760, 7680, { name: 'Vulcão', root: 55, scale: 'blues', chordScale: 'mixolydian', bpm: 92, feel: 'swing', progression: [0, 0, 3, 0, 4, 3, 0, 4], color: '#ff6b5b', ambience: { beat: 'boombap', bass: 'droneDark' } })
  column(7680, 9600, { name: 'Montanha nevada', root: 65, scale: 'lydian', chordScale: 'lydian', bpm: 76, feel: 'straight', progression: [0, 1, 0, 1], color: '#bfe9ff', birds: ['coruja'], ambience: { beat: 'breeze', bass: 'pad' } })
  column(9600, WORLD_W, { name: 'Vila de conto', root: 62, scale: 'dorian', chordScale: 'dorian', bpm: 112, feel: 'swing', progression: [0, 3, 0, 4], color: '#ffb347', birds: ['sabia', 'canario'], ambience: { beat: 'fair', bass: 'walking' } })
  zone(0, -1950, WORLD_W, 1800, { name: 'Ilhas no céu', root: 67, scale: 'majorPenta', chordScale: 'lydian', bpm: 88, feel: 'straight', progression: [0, 1, 4, 0], color: '#7bdff2', birds: ['canario', 'pardal'], ambience: { beat: 'pulse', bass: 'arp' } })
  zone(0, -3000, WORLD_W, 1050, { name: 'Asgard', root: 62, scale: 'harmonicMinor', chordScale: 'harmonicMinor', bpm: 72, feel: 'half', progression: [0, 5, 3, 4], color: '#c77dff', priority: 2, ambience: { beat: 'half', bass: 'pad' } })

  // ---------- far scenery: towers on the horizon and trees in the depth ----------
  const far = Array.from({ length: 9 }, (_, i) => power('trelica', -250 + i * 560, 0.3, undefined, 0.8, 30, 1))
  link(...far)
  ;([['pine', 500, 0.5, 0.5], ['oak', 1250, 0.55, 0.45], ['redwood', 2100, 0.3, 0.55], ['araucaria', 2900, 0.45, 0.5], ['palm', 3600, 0.5, 0.45], ['baobab', 4300, 0.5, 0.5], ['cypress', 5000, 0.5, 0.45], ['pine', 5600, 0.55, 0.4], ['willow', 6300, 0.5, 0.45]] as [TreeStyle, number, number, number][])
    .forEach(([style, x, scale, depth], i) => tree(style, 9100 + i, x, scale, undefined, {}, { depth }))

  // ---------- Campina: the garden village where she arrives ----------
  const entry = entryPortalElement()
  out.push({ ...entry, x: 20, y: floor(95) - entry.h + 6 })
  tree('oak', 11, 830, 1)
  tree('ipe', 12, 1330, 0.9)
  tree('birch', 13, 1850, 0.85)
  tree('shrub', 14, 395, 0.8)
  tree('shrub', 15, 1250, 0.9)
  house('garden', 101, 640, 280, 340)
  house('painted', 102, 1170, 240, 400, undefined, { floors: 2 })
  house('garden', 103, 1560, 220, 300)
  rack('passagua', 215)
  rack('flute', 480)
  dummy(1432, 'Espantalho da Campina: afine a mira nele antes de subir para as ilhas.')
  button('aliens', 855)
  trampoline(975, 5, -6, undefined, 150)
  const campina = [power('madeira', 420, 1), power('madeira', 870, 1), power('duplo', 1360, 1), power('madeira', 1790, 1)]

  // Ilha do Pomar and Ilha das Bétulas
  tree('plum', 21, 560, 0.75, on(orchard))
  tree('ipe', 22, 880, 0.7, on(orchard))
  house('garden', 104, 720, 240, 280, on(orchard))
  rack('harp', 620, on(orchard))
  tree('birch', 23, 1520, 0.7, on(birches))
  tree('birch', 24, 1800, 0.6, on(birches))
  house('storybook', 105, 1670, 230, 270, on(birches))
  // Aldeia das Nuvens
  tree('oak', 25, 960, 0.8, on(clouds))
  tree('maple', 26, 1530, 0.75, on(clouds))
  house('painted', 106, 820, 260, 300, on(clouds))
  house('painted', 107, 1110, 300, 420, on(clouds), { floors: 2 })
  house('painted', 108, 1390, 260, 300, on(clouds))
  button('aliens', 1010, on(clouds))
  rack('passagua', 1260, on(clouds))
  trampoline(1540, 4, 10, on(clouds))
  const cloudPoles = [power('madeira', 720, 0.7, on(clouds)), power('madeira', 1250, 0.7, on(clouds))]
  link(...cloudPoles)

  // ---------- Floresta gigante: the tree houses ----------
  tree('redwood', 31, 2200, 1, undefined, { climbTrunk: true, walkBranches: true })
  tree('brazilnut', 32, 2640, 1)
  tree('jequitiba', 33, 3050, 1, undefined, { climbTrunk: true, walkBranches: true, walkCrown: true })
  tree('tule', 34, 3520, 1, undefined, { walkBranches: true, walkCrown: true })
  tree('centurion', 35, 3790, 0.8, undefined, {}, { layer: 'frontGhost' })
  tree('shrub', 36, 2420, 1)
  tree('shrub', 37, 3330, 0.9)
  // decks around the redwood's trunk, a ladder beside them and a hanging bridge to the jequitibá
  ;[600, 300, 0, -300].forEach(y => deck(2020, y, 380))
  deck(2440, 300, 560)
  ladder(2400, floor(2400), -300, -1)
  house('nordic', 109, 2120, 150, 200, 560)
  house('nordic', 110, 2120, 150, 200, -40)
  rack('violin', 2140, -340)
  house('nordic', 111, 2650, 260, 360)
  house('nordic', 112, 3490, 260, 330, undefined, { floors: 1 })
  rack('bow', 2330)
  rack('bat', 3660)
  trampoline(3150, 5, 4)
  button('aliens', 2850)
  button('pattern', 2905)
  // Ninho das Araucárias
  tree('araucaria', 38, 3020, 0.6, on(nest))
  tree('araucaria', 39, 3500, 0.5, on(nest))
  house('nordic', 113, 3190, 250, 320, on(nest))
  house('nordic', 114, 3400, 180, 240, on(nest), { floors: 1 })
  const forest = [power('madeira', 2290, 1), power('madeira', 2830, 1)]
  link(...campina, ...forest)

  // ---------- Deserto: the pueblo on the mesas ----------
  tree('baobab', 41, 3930, 1)
  tree('palm', 42, 4090, 0.9)
  tree('palm', 43, 4630, 0.8)
  tree('palm', 44, 5520, 0.85)
  house('cubist', 115, 4290, 260, 350)
  house('cubist', 116, 4480, 120, 360, undefined, { floors: 3, windows: 1 })
  house('cubist', 117, 4835, 220, 360)
  house('cubist', 118, 5000, 120, 250, undefined, { floors: 1, windows: 1 })
  house('cubist', 119, 5330, 190, 300, undefined, { floors: 2 })
  rack('guitar', 4350)
  rack('tambourine', 4900)
  rack('pistol', 5250)
  dummy(4040, 'Bandido de palha: acerte daqui de baixo ou lá de cima da mesa.')
  dummy(5650, 'Bandido de palha')
  const desert = [power('rua', 4090, 1), power('rua', 4600, 1), power('rua', 5130, 1), power('rua', 5500, 1)]
  link(...desert)
  // Oásis suspenso
  tree('palm', 45, 4110, 0.7, on(oasis))
  tree('palm', 46, 4470, 0.6, on(oasis))
  house('cubist', 120, 4290, 220, 290, on(oasis), { floors: 1 })
  rack('cok', 4420, on(oasis))
  // Pueblo do Céu
  tree('palm', 47, 4700, 0.7, on(pueblo))
  tree('baobab', 48, 5400, 0.55, on(pueblo))
  house('cubist', 121, 4830, 240, 340, on(pueblo))
  house('cubist', 122, 5060, 300, 440, on(pueblo), { floors: 3 })
  house('cubist', 123, 5270, 200, 290, on(pueblo), { floors: 1 })
  rack('rifle', 4950, on(pueblo))

  // ---------- Vulcão: the forge, with Mjölnir in the crater ----------
  house('terraces', 124, 6290, 260, 320)
  house('terraces', 125, 7650, 210, 300)
  tree('cypress', 51, 5830, 0.8)
  tree('cypress', 52, 6440, 0.6)
  rack('pump', 6420)
  rack('launcher', 6755)
  rack('grenade', 7265)
  button('zombies', 5800)
  button('zcount', 5855)
  // Mjölnir: the hammer's head sunk in the crater's floor, the handle up (a stone Parede cut by its points)
  add('wall', { x: 6940, y: floor(7010) + 6 - 230, w: 140, h: 230, hard: true, params: { surface: { style: 'stone' as WallStyle, points: [[40, 0], [60, 0], [62, 52], [100, 52], [100, 100], [0, 100], [0, 52], [38, 52]] } } })
  // Forja flutuante
  house('terraces', 126, 6840, 240, 320, on(forge))
  house('terraces', 127, 7100, 260, 380, on(forge), { floors: 3 })
  rack('smg', 6975, on(forge))

  // ---------- Montanha nevada: wooden cabins up to the summit ----------
  tree('pine', 61, 7860, 0.9)
  tree('pine', 62, 8420, 0.8)
  tree('araucaria', 63, 8760, 0.6)
  tree('pine', 64, 9400, 0.6)
  house('nordic', 128, 8085, 230, 340)
  house('nordic', 129, 8262, 130, 390, undefined, { floors: 3, windows: 1 })
  house('nordic', 130, 8640, 220, 330)
  rack('keys', 8150)
  rack('sniper', 9200)
  const snow = [power('duplo', 7930, 1), power('duplo', 8480, 1), power('duplo', 8900, 1)]
  link(...snow)
  // Refúgio de gelo
  tree('pine', 65, 8660, 0.6, on(refuge))
  tree('araucaria', 66, 9060, 0.45, on(refuge))
  house('nordic', 131, 8510, 250, 330, on(refuge))
  house('nordic', 132, 8850, 290, 420, on(refuge), { floors: 3 })
  rack('hangdrum', 8690, on(refuge))

  // ---------- Vila de conto: the festival at the end of the valley ----------
  tree('plum', 71, 10090, 0.8)
  tree('willow', 72, 10650, 0.9)
  tree('maple', 73, 11200, 0.8)
  tree('willow', 74, 11460, 0.7, undefined, {}, { layer: 'frontGhost' })
  house('storybook', 133, 9880, 220, 300)
  house('storybook', 134, 10320, 260, 360)
  house('folk', 135, 10850, 260, 340)
  house('folk', 136, 11030, 170, 420, undefined, { roof: 'tower', floors: 3 })
  const story = [power('madeira', 9730, 1), power('madeira', 10130, 1), power('duplo', 10640, 1), power('madeira', 11190, 1)]
  link(...story)
  // Feira flutuante
  house('folk', 137, 10680, 180, 290, on(fair))
  house('folk', 138, 11230, 180, 280, on(fair))
  add('jukebox', { x: 10830 - 56, y: fair.y - 214 })
  add('gong', { x: 10950 - 112, y: fair.y - 270 })
  rack('maryjane', 11100, on(fair))
  // Mirante
  tree('cypress', 75, 10910, 0.6, on(lookout))
  tree('cypress', 76, 10990, 0.5, on(lookout))
  house('storybook', 139, 10490, 220, 280, on(lookout))
  house('ornamental', 140, 10720, 250, 450, on(lookout), { roof: 'tower' })
  rack('sax', 10600, on(lookout))

  // ---------- the high layer ----------
  tree('ipe', 81, 1950, 0.7, on(garden))
  tree('plum', 82, 2360, 0.7, on(garden))
  house('garden', 141, 2150, 280, 320, on(garden))
  rack('harp', 2290, on(garden))
  tree('pine', 83, 4320, 0.6, on(frost))
  house('nordic', 142, 4010, 240, 320, on(frost))
  rack('flute', 4170, on(frost))
  tree('palm', 84, 8160, 0.6, on(dunes))
  house('cubist', 143, 7760, 260, 360, on(dunes))
  house('cubist', 144, 7990, 190, 270, on(dunes), { floors: 1 })
  rack('guitar', 7880, on(dunes))
  house('terraces', 145, 9800, 260, 340, on(ember))
  house('terraces', 146, 10030, 190, 270, on(ember))
  rack('grenade', 9920, on(ember))

  // ---------- Asgard: the hall, its tree and Odin's staff ----------
  tree('tule', 91, 5830, 0.52, on(asgard))
  tree('cypress', 92, 6560, 0.6, on(asgard))
  ;[5700, 5770, 6230, 6300].forEach(x => add('pillar', { x: x - 22, y: asgard.y - 330, w: 44, h: 330, solid: false, shots: false, layer: 'back' }))
  house('ornamental', 147, 5540, 280, 470, on(asgard), { roof: 'tower' })
  house('ornamental', 148, 6000, 420, 520, on(asgard), { roof: 'hip', floors: 3, windows: 3, doorPosition: 'center' })
  house('ornamental', 149, 6420, 260, 440, on(asgard), { roof: 'tower' })
  rack('trumpet', 5700, on(asgard))
  // Odin's staff: a wooden Parede cut by its points (a shaft with a curled head), only scenery
  add('wall', { x: 6265 - 35, y: asgard.y + 4 - 320, w: 70, h: 320, solid: false, shots: false, hard: false, layer: 'behind', params: { surface: { style: 'wood' as WallStyle, points: [[40, 100], [40, 24], [18, 15], [22, 3], [50, 0], [82, 6], [88, 18], [72, 27], [60, 24], [60, 100]] } } })

  // ---------- the ways up: ladders of platforms between the layers ----------
  const up = (i: Island, x: number, y0: number, side: 1 | -1) => ladder(x, y0, i.y, side)
  up(orchard, orchard.l - 150, floor(orchard.l - 150), 1)
  up(clouds, clouds.l - 150, orchard.y, 1)
  up(birches, birches.r + 150, floor(birches.r + 150), -1)
  up(clouds, clouds.r + 150, birches.y, -1)
  up(garden, garden.l - 150, clouds.y, 1)
  stairs(2400, -300, nest.l - 80, nest.y)
  stairs(nest.l - 40, nest.y, garden.r + 80, garden.y)
  up(oasis, oasis.l - 150, floor(oasis.l - 150), 1)
  up(pueblo, pueblo.l - 150, oasis.y, 1)
  up(frost, frost.r + 150, pueblo.y, -1)
  stairs(frost.r + 70, frost.y, asgard.l - 70, asgard.y)
  up(forge, forge.r + 150, floor(forge.r + 150), -1)
  stairs(forge.r - 60, forge.y, dunes.l - 80, dunes.y)
  stairs(dunes.l - 70, dunes.y, asgard.r + 70, asgard.y)
  up(refuge, refuge.r + 150, floor(refuge.r + 150), -1)
  stairs(refuge.r + 50, refuge.y, ember.l - 70, ember.y)
  up(fair, fair.l - 150, floor(fair.l - 150), 1)
  up(lookout, lookout.r + 150, fair.y, -1)
  up(ember, ember.r + 150, lookout.y, -1)
  // shortcuts: the Campina and the Vila de conto, each with a portal to Asgard
  portals(1740, undefined, 'Subir para Asgard', 5370, on(asgard), 'Descer para a Campina')
  portals(11340, undefined, 'Subir para Asgard', 6650, on(asgard), 'Descer para a Vila de conto')

  // ---------- transmission towers: the line along the valley, one per layer of islands, and the risers ----------
  const valley = [power('trelica', 1870, 0.8), power('trelica', 3740, 0.8), power('trelica', 5650, 0.8), power('trelica', 7700, 0.8), power('trelica', 9505, 0.8), power('trelica', 11400, 0.8)]
  // on the islands, at the edge that faces the next layer: no wire cuts through a village
  const mid = [power('alta', clouds.r - 60, 0.55, on(clouds)), power('alta', nest.r - 60, 0.55, on(nest)), power('alta', pueblo.l + 60, 0.55, on(pueblo)), power('alta', pueblo.r - 60, 0.55, on(pueblo)), power('alta', forge.r - 50, 0.55, on(forge)), power('alta', refuge.r - 60, 0.55, on(refuge)), power('alta', lookout.l + 60, 0.55, on(lookout)), power('alta', lookout.r - 60, 0.55, on(lookout))]
  const high = [power('gato', garden.l + 80, 0.45, on(garden)), power('gato', frost.r - 70, 0.45, on(frost)), power('gato', asgard.l + 80, 0.45, on(asgard)), power('gato', asgard.r - 80, 0.45, on(asgard)), power('gato', dunes.l + 70, 0.45, on(dunes)), power('gato', ember.r - 70, 0.45, on(ember))]
  link(...valley)
  link(...mid)
  link(...high)
  // risers: the valley's line up to the islands, the islands up to the high layer
  ;[[valley[0], mid[0]], [valley[2], mid[3]], [valley[4], mid[5]], [valley[5], mid[7]], [mid[0], high[0]], [mid[2], high[1]], [mid[4], high[4]], [mid[6], high[5]]].forEach(([a, b]) => link(a, b))

  const elements = out.map(e => normalizeElement(storeElementPosition(e, VALLEY_SCREENS))!)
  return { v: LAYOUT_VERSION, elements, settings: { screens: VALLEY_SCREENS, sky: VALLEY_SKY, mountains: VALLEY_MOUNTAINS, clouds: VALLEY_CLOUDS, temple: false } }
}
