// The example Pátio "Arquipélago das Almas": a big arena for up to 13 players (the online room's limit), inspired by
// lane games (Deadlock) but made of what the editor mode offers. A world of the widest width (8 scenes plus the two
// of the Templo and the Vila: 19 200 units), mirrored around its centre:
// - two bases at the ends, the Galinheiro (west) and the Chiqueiro (east), each with three Portais de nascimento (on
//   the ground, on the middle island and on the high island), a pair of portals from the ground to the high island,
//   the Gaiolas to gather souls and a "loja" of Baús opened by merit (souls in the Gaiolas);
// - three lanes from base to base: the low one on the ground, along wooden and concrete poles; the middle and the
//   high ones made of floating islands, joined by the wires of transmission towers (wires are floors to walk on and
//   to hang from, so every lane can be crossed on them);
// - between the lanes, small islands (the "jungle") with themed racks, free Baús that may hold a key and horde
//   buttons;
// - in the centre, a column of four places with a fase de notas each (Jukebox or Vitrola with a prize for the win:
//   keys and special items) and Baús lendários that only a key opens;
// - each region (base, lane and side) has its biome, houses, trees, music and themed items.
import { LAYOUT_VERSION, entryPortalElement, layoutFloorBelow, normalizeElement, storeElementPosition, type ElementKind, type HordeButton, type LayoutElement, type PatioLayout } from './layout'
import { POWER_MODELS, defaultPower } from './power-lines'
import { treeDraftSize, treePreset, type TreeParams, type TreeStyle } from './trees'
import { housePreset, type HouseParams, type HouseStyle } from './houses'
import { fitSurface, type GroundBiome, type SurfacePoint } from './surfaces'
import { defaultSoundZone, type SoundZoneParams } from './sound-zones'
import { defaultChest, type ChestParams, type LootEntry } from './chests'
import { defaultPlayer, type PlayerParams } from './gong'
import { shareOut } from './spawn-portals'
import { SCENE_W, WORLD_GROUND_Y } from './world'
import { SKY_DEFAULT, hourStops, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT, type MountainParams } from './mountains'
import { CLOUDS_DEFAULT, type CloudParams } from './clouds'
import { AURORA_DEFAULT, type AuroraParams } from './aurora'
import type { ItemId } from './items'

const G = WORLD_GROUND_Y
export const DEADLOCK_SCREENS = 8
// from the ground to the ceiling: room for the high lane and the altar above the centre
export const DEADLOCK_HEIGHT = 4130
const WORLD_W = (DEADLOCK_SCREENS + 2) * SCENE_W
const CX = WORLD_W / 2
// the islands' tops of each level (the ground lane stands on the terrain)
const MID_Y = -250
const HIGH_Y = -1450
const LOW_ISLE_Y = 350 // the jungle between the ground and the middle lane
const UP_ISLE_Y = -850 // the jungle between the middle and the high lane

export const DEADLOCK_SKY: SkyParams = { ...SKY_DEFAULT, hour: 19.1, follow: false, stops: hourStops(19.1), sunSize: 40, glow: 80, clouds: 40, texture: 22, haze: 48, silhouette: 35, light: 45 }
export const DEADLOCK_MOUNTAINS: MountainParams = { ...MOUNTAINS_DEFAULT, ranges: 4, peak: 'sharp', height: 95, lift: 10, shade: 50, snow: 35, snowEdge: 55, gradient: 35 }
export const DEADLOCK_CLOUDS: CloudParams = { ...CLOUDS_DEFAULT, kind: 'cumulus', amount: 45, size: 150, height: 58, spread: 80, puffs: 55 }
export const DEADLOCK_AURORA: AuroraParams = { ...AURORA_DEFAULT, amount: 70, bands: 3, lift: 55, color: '#7bdff2', top: '#c77dff', night: false }

type Island = { l: number; r: number; y: number; cx: number }
type Side = -1 | 1 // -1: the west (Galinheiro), 1: the east (Chiqueiro)

// a side's themes: the biome, houses, trees, music and items of each of its regions
type Theme = {
  name: string; biome: GroundBiome; house: HouseStyle; trees: TreeStyle[]; items: ItemId[]
  zone: Partial<SoundZoneParams>
}
const THEMES: Record<'base' | 'low' | 'mid' | 'high', Record<Side, Theme>> = {
  base: {
    [-1]: { name: 'Galinheiro', biome: 'village', house: 'garden', trees: ['oak', 'ipe', 'shrub'], items: ['cage', 'cageWire', 'pistol', 'bat', 'flute'],
      zone: { root: 60, scale: 'majorPenta', chordScale: 'major', bpm: 100, feel: 'straight', progression: [0, 4, 5, 3], color: '#ffd76a', birds: ['canario'], ambience: { beat: 'breeze', bass: 'pad' } } },
    [1]: { name: 'Chiqueiro', biome: 'village', house: 'storybook', trees: ['willow', 'maple', 'shrub'], items: ['cage', 'cageWood', 'pistol', 'bat', 'flute'],
      zone: { root: 62, scale: 'dorian', chordScale: 'dorian', bpm: 104, feel: 'swing', progression: [0, 3, 0, 4], color: '#ff9fb6', birds: ['sabia'], ambience: { beat: 'fair', bass: 'walking' } } },
  },
  low: {
    [-1]: { name: 'Deserto dos Bandidos', biome: 'desert', house: 'cubist', trees: ['palm', 'baobab'], items: ['pistol', 'rifle', 'smg', 'guitar', 'tambourine'],
      zone: { root: 62, scale: 'mixolydian', chordScale: 'mixolydian', bpm: 104, feel: 'straight', progression: [0, 6, 3, 0], color: '#e9b872', birds: ['pardal'], ambience: { beat: 'baiao', bass: 'baiao' } } },
    [1]: { name: 'Vulcão da Forja', biome: 'volcanic', house: 'terraces', trees: ['cypress', 'baobab'], items: ['launcher', 'grenade', 'pump', 'keys', 'tambourine'],
      zone: { root: 55, scale: 'blues', chordScale: 'mixolydian', bpm: 92, feel: 'swing', progression: [0, 0, 3, 0, 4, 3, 0, 4], color: '#ff6b5b', ambience: { beat: 'boombap', bass: 'droneDark' } } },
  },
  mid: {
    [-1]: { name: 'Floresta das Araucárias', biome: 'meadow', house: 'nordic', trees: ['araucaria', 'pine', 'birch'], items: ['bow', 'violin', 'boomerang', 'hook', 'passagua'],
      zone: { root: 57, scale: 'minorPenta', chordScale: 'minor', bpm: 84, feel: 'half', progression: [0, 5, 2, 6], color: '#4f9d69', birds: ['sabia', 'coruja'], ambience: { beat: 'half', bass: 'droneDark' } } },
    [1]: { name: 'Montanha Nevada', biome: 'snow', house: 'nordic', trees: ['pine', 'birch'], items: ['sniper', 'hangdrum', 'bow', 'hook', 'passagua'],
      zone: { root: 65, scale: 'lydian', chordScale: 'lydian', bpm: 76, feel: 'straight', progression: [0, 1, 0, 1], color: '#bfe9ff', birds: ['coruja'], ambience: { beat: 'breeze', bass: 'pad' } } },
  },
  high: {
    [-1]: { name: 'Jardins Suspensos', biome: 'meadow', house: 'painted', trees: ['plum', 'ipe', 'cypress'], items: ['harp', 'flute', 'sax', 'cok', 'maryjane'],
      zone: { root: 67, scale: 'majorPenta', chordScale: 'lydian', bpm: 88, feel: 'straight', progression: [0, 1, 4, 0], color: '#7bdff2', birds: ['canario', 'pardal'], ambience: { beat: 'pulse', bass: 'arp' } } },
    [1]: { name: 'Feira no Céu', biome: 'village', house: 'folk', trees: ['maple', 'willow'], items: ['trumpet', 'guitar', 'sax', 'cok', 'maryjane'],
      zone: { root: 62, scale: 'dorian', chordScale: 'dorian', bpm: 112, feel: 'swing', progression: [0, 3, 0, 4], color: '#ffb347', birds: ['sabia', 'canario'], ambience: { beat: 'fair', bass: 'walking' } } },
  },
}

// what the merit Baús of each base's "loja" ask (souls in the Gaiolas) and give; they close again after a while
const SHOP: { souls: number; rarity: ChestParams['rarity']; loot: LootEntry[] }[] = [
  { souls: 3, rarity: 'simple', loot: [{ pick: 'consumables', chance: 100 }, { pick: 'keys', chance: 25 }] },
  { souls: 10, rarity: 'simple', loot: [{ pick: 'weapons', chance: 100 }, { pick: 'instruments', chance: 50 }] },
  { souls: 25, rarity: 'legendary', loot: [{ pick: 'magic', chance: 100 }, { pick: 'key', chance: 100 }] },
]
// the prize of each song of the centre (what jumps out of the Jukebox or Vitrola when the song is won)
const PRIZE_KEY: LootEntry[] = [{ pick: 'key', chance: 100 }]

export function deadlockLayout(): PatioLayout {
  let n = 0
  const out: LayoutElement[] = []
  const add = (kind: ElementKind, raw: Partial<LayoutElement>): LayoutElement => {
    const e = normalizeElement({ id: `${kind}-arq${++n}`, kind, ...raw })!
    out.push(e)
    return e
  }
  // the floor under x: the ground's, or (looking down from `from`) whatever comes first: an island, a step…
  const ground: LayoutElement[] = []
  const floor = (x: number, from?: number) => (from === undefined ? layoutFloorBelow(ground, x, -9999) : layoutFloorBelow(out, x, from))

  // ---------- land ----------
  const land = (style: GroundBiome, world: SurfacePoint[]) => {
    const { points, ...box } = fitSurface(world, 40, 24)
    return add('ground', { ...box, hard: true, params: { surface: { style, points } } })
  }
  // a stretch of the ground: its top as [x, height above the floor], closed a little under the floor
  const terrain = (style: GroundBiome, top: [number, number][]) =>
    ground.push(land(style, [...top.map(([x, h]) => [x, G - h] as SurfacePoint), [top[top.length - 1][0], G + 10], [top[0][0], G + 10]]))
  // a floating island: a flat top with lower rims and a rocky belly
  const isle = (style: GroundBiome, cx: number, y: number, w: number, t = 130): Island => {
    const l = cx - w / 2, r = cx + w / 2
    land(style, [
      [l, y + 16], [l + w * 0.07, y], [r - w * 0.07, y], [r, y + 16],
      [r - w * 0.06, y + t * 0.45], [cx + w * 0.22, y + t * 0.8], [cx + w * 0.05, y + t], [cx - w * 0.2, y + t * 0.85], [l + w * 0.1, y + t * 0.5],
    ])
    return { l, r, y, cx }
  }
  const on = (i: Island) => i.y - 40
  const step = (cx: number, y: number, w = 140) => add('platform', { x: cx - w / 2, y, w, h: 24 })
  // small platforms from (x0, y0) up to just under y1, each within a jump of the one before
  const ladder = (cx: number, y0: number, y1: number, zig: number) => {
    const rise = y0 - y1 - 40
    const count = Math.max(1, Math.ceil(rise / 105))
    for (let i = 1; i <= count; i++) step(cx + ((count - i) % 2 ? -zig : zig), y0 - (rise * i) / count)
  }

  // ---------- things ----------
  const house = (style: HouseStyle, seed: number, cx: number, w: number, h: number, from?: number, over: Partial<HouseParams> = {}) =>
    add('house', { x: cx - w / 2, y: floor(cx, from) - h, w, h, params: { house: { ...housePreset(style, seed), ...over } } })
  const tree = (style: TreeStyle, seed: number, cx: number, scale = 1, from?: number, over: Partial<TreeParams> = {}, extra: Partial<LayoutElement> = {}) => {
    const size = treeDraftSize({ style, seed })
    const w = size.w * scale, h = size.h * scale
    return add('tree', { x: cx - w / 2, y: (extra.depth ? G : floor(cx, from)) + 8 - h, w, h, layer: 'back', ...extra, params: { tree: { ...treePreset(style, seed), flip: seed % 2 === 1, ...over } } })
  }
  const rack = (item: ItemId, cx: number, from?: number, respawnDelay?: number) =>
    add('rack', { x: cx - 38, y: floor(cx, from) - 62, params: { item, ...(respawnDelay ? { respawnDelay } : {}) } })
  const button = (action: HordeButton, cx: number, from?: number) => add('button', { x: cx - 20, y: floor(cx, from) - 86, params: { action } })
  const dummy = (cx: number, message: string, from?: number) => add('dummy', { x: cx - 23, y: floor(cx, from) - 112, params: { message } })
  const trampoline = (cx: number, strength: number, angle = 0, from?: number, w = 170) =>
    add('trampoline', { x: cx - w / 2, y: floor(cx, from) - 50, w, h: 50, params: { trampoline: { strength, angle } } })
  const chest = (cx: number, from: number | undefined, params: Partial<ChestParams>) =>
    add('chest', { x: cx - 46, y: floor(cx, from) - 70, params: { chest: { ...defaultChest(params.rarity ?? 'simple'), ...params } } })
  const sequencer = (kind: 'jukebox' | 'vitrola', cx: number, from: number | undefined, player: Partial<PlayerParams>) => {
    const box = kind === 'jukebox' ? { w: 112, h: 214 } : { w: 150, h: 190 }
    return add(kind, { x: cx - box.w / 2, y: floor(cx, from) - box.h, params: { player: { ...defaultPlayer(), ...player } } })
  }
  const gong = (cx: number, from?: number) => add('gong', { x: cx - 112, y: floor(cx, from) - 270 })
  const spawns: LayoutElement[] = []
  const spawn = (cx: number, from?: number) => { const e = add('spawn', { x: cx - 75, y: floor(cx, from) - 144 }); spawns.push(e); return e }
  const portals = (ax: number, afrom: number | undefined, alabel: string, bx: number, bfrom: number | undefined, blabel: string) => {
    const a = add('portal', { x: ax - 75, y: floor(ax, afrom) - 144, params: { portalLabel: alabel, portalInstruction: 'hover' } })
    a.params.portalPairId = a.id
    add('portal', { x: bx - 75, y: floor(bx, bfrom) - 144, params: { portalPairId: a.id, portalLabel: blabel, portalInstruction: 'hover' } })
  }
  // poles and towers: every wire is a link made by hand (none joins its neighbour by itself)
  const power = (model: string, cx: number, scale = 1, from?: number, depth = 0, sag = 30, wire = 2) => {
    const m = POWER_MODELS[model]
    const w = m.w * scale, h = m.h * scale
    return add(m.kind, { x: cx - w / 2, y: (depth ? G : floor(cx, from)) + 6 - h, w, h, layer: 'back', ...(depth ? { depth } : {}), params: { power: { ...defaultPower(m.kind), model, sag, wire, links: [] } } })
  }
  const link = (...line: LayoutElement[]) => line.forEach((e, i) => { if (i) line[i - 1].params.power!.links!.push(e.id) })
  const zone = (name: string, x0: number, y0: number, x1: number, y1: number, z: Partial<SoundZoneParams>) =>
    add('zone', { x: Math.min(x0, x1), y: y0, w: Math.abs(x1 - x0), h: y1 - y0, params: { zone: { ...defaultSoundZone(), ...z, name } } })
  // a lane tower on an island, near its edge; the wires to the next island and across this one are floors
  const laneTower = (model: 'trelica' | 'gato', scale: number, i: Island, edge: Side) => power(model, edge < 0 ? i.l + 95 : i.r - 95, scale, on(i), 0, 22, 2.5)
  // a step under the wires that cross an island, so a jump reaches them
  const wireStep = (x: number, i: Island) => step(x, i.y - 165, 120)

  // ---------- the far scenery: towers on the horizon ----------
  const far = Array.from({ length: 14 }, (_, k) => power('trelica', -300 + k * 1450, 0.3, undefined, 0.8, 30, 1))
  link(...far)

  // ---------- the ground: both bases, both low lanes and the centre's arena ----------
  // the west half; the east is its mirror (another biome on each stretch)
  const lowTop: [number, number][] = [[0, 150], [1900, 150], [2150, 70], [2700, 60], [3000, 140], [3350, 140], [3600, 60], [4700, 50], [4950, 170], [5350, 170], [5600, 60], [6600, 50], [6850, 150], [7200, 150], [7450, 60], [8300, 40]]
  const mirror = (top: [number, number][]) => top.map(([x, h]) => [WORLD_W - x, h] as [number, number]).reverse()
  terrain('village', lowTop.slice(0, 3))
  terrain('desert', lowTop.slice(2))
  terrain('moon', [[8300, 40], [8700, 40], [8950, 110], [9200, 30], [10000, 30], [10250, 110], [10500, 40], [WORLD_W - 8300, 40]])
  terrain('volcanic', mirror(lowTop.slice(2)))
  terrain('village', mirror(lowTop.slice(0, 3)))
  const baseFloorY = G - 150

  // ---------- the islands ----------
  type Half = { base: { mid: Island; high: Island }; mid: Island[]; high: Island[]; lowJungle: Island[]; upJungle: Island[] }
  const halves = {} as Record<Side, Half>
  const X = (side: Side, x: number) => (side < 0 ? x : WORLD_W - x)
  for (const side of [-1, 1] as Side[]) {
    const T = (k: keyof typeof THEMES) => THEMES[k][side]
    halves[side] = {
      base: { mid: isle(T('base').biome, X(side, 1500), MID_Y, 1300, 170), high: isle(T('base').biome, X(side, 1050), HIGH_Y, 1100, 170) },
      mid: [3700, 5600, 7500].map(x => isle(T('mid').biome, X(side, x), MID_Y + (x === 5600 ? -40 : 0), 760, 140)),
      high: [3300, 5300, 7300].map(x => isle(T('high').biome, X(side, x), HIGH_Y + (x === 5300 ? -60 : 0), 700, 140)),
      lowJungle: [4650, 6550].map(x => isle(T('low').biome, X(side, x), LOW_ISLE_Y, 520, 110)),
      upJungle: [2900, 4650, 6500, 8250].map(x => isle(T('mid').biome, X(side, x), UP_ISLE_Y + (x === 6500 ? -40 : 0), x === 6500 ? 600 : 480, 110)),
    }
  }
  // the centre: the arena on the ground, the Coração (middle), the Santuário (high) and the Altar above everything
  const heart = isle('moon', CX, MID_Y - 200, 1500, 190)
  const sanctuary = isle('mars', CX, HIGH_Y - 200, 1100, 180)
  const altar = isle('moon', CX, HIGH_Y - 1150, 600, 150)

  // ---------- music: a Zona sonora per region (each holds at most one fase de notas at a time) ----------
  const TOP = G - DEADLOCK_HEIGHT
  const bandLow = [LOW_ISLE_Y - 250, G + 10] as const, bandMid = [UP_ISLE_Y - 250, LOW_ISLE_Y - 250] as const, bandHigh = [TOP, UP_ISLE_Y - 250] as const
  for (const side of [-1, 1] as Side[]) {
    const T = (k: keyof typeof THEMES) => THEMES[k][side]
    zone(T('base').name, X(side, 0), TOP, X(side, 2500), G + 10, T('base').zone)
    zone(T('low').name, X(side, 2500), bandLow[0], X(side, 8500), bandLow[1], T('low').zone)
    zone(T('mid').name, X(side, 2500), bandMid[0], X(side, 8500), bandMid[1], T('mid').zone)
    zone(T('high').name, X(side, 2500), bandHigh[0], X(side, 8500), bandHigh[1], T('high').zone)
  }
  zone('Arena das Almas', 8500, bandLow[0], WORLD_W - 8500, bandLow[1], { root: 57, scale: 'harmonicMinor', chordScale: 'harmonicMinor', bpm: 96, feel: 'straight', progression: [0, 5, 3, 4], color: '#c77dff', ambience: { beat: 'afro', bass: 'pulse' } })
  zone('Coração do Arquipélago', 8500, bandMid[0], WORLD_W - 8500, bandMid[1], { root: 60, scale: 'dorian', chordScale: 'dorian', bpm: 90, feel: 'half', progression: [0, 3, 6, 4], color: '#9d8cff', ambience: { beat: 'half', bass: 'arp' } })
  zone('Santuário', 8500, altar.y + 160, WORLD_W - 8500, bandHigh[1], { root: 62, scale: 'harmonicMinor', chordScale: 'harmonicMinor', bpm: 72, feel: 'half', progression: [0, 5, 3, 4], color: '#e07bff', ambience: { beat: 'half', bass: 'pad' } })
  // the Altar: the Moon's gravity, above the Santuário
  zone('Altar da Lua', CX - 900, TOP, CX + 900, altar.y + 160, { root: 64, scale: 'lydian', chordScale: 'lydian', bpm: 70, feel: 'straight', progression: [0, 1, 0, 1], color: '#f2f7ff', priority: 2, gravity: 'moon', ambience: { beat: 'none', bass: 'pad' } })

  // ---------- each half: base, lanes and jungle ----------
  const lowLines: LayoutElement[][] = []
  for (const side of [-1, 1] as Side[]) {
    const T = (k: keyof typeof THEMES) => THEMES[k][side], h = halves[side]
    const x = (v: number) => X(side, v)
    const seed = side < 0 ? 0 : 500
    const toCentre: Side = side < 0 ? 1 : -1, toBase = (-toCentre) as Side

    // --- the base on the ground: where she is born, the Gaiolas, the loja and the elevator up ---
    if (side < 0) {
      const entry = entryPortalElement()
      out.push({ ...entry, x: 180, y: baseFloorY - entry.h + 6 })
    } else spawn(x(255))
    house(T('base').house, 11 + seed, x(470), 240, 330)
    house(T('base').house, 12 + seed, x(1760), 240, 300, undefined, { floors: 2 })
    tree(T('base').trees[0], 21 + seed, x(780), 0.9)
    tree(T('base').trees[1], 22 + seed, x(1640), 0.8)
    tree(T('base').trees[2], 23 + seed, x(640), 0.8)
    T('base').items.forEach((item, k) => rack(item, x(900 + k * 85)))
    // the loja: three Baús opened by merit, each closing again after a minute
    SHOP.forEach((s, k) => chest(x(1330 + k * 130), undefined, { rarity: s.rarity, lock: 'souls', souls: s.souls, reopen: 60, loot: s.loot }))
    dummy(x(2050), `Boneco do ${T('base').name}: treine a mira antes de sair para as faixas.`)
    // the elevator: a pair of portals from the ground to the high island; ladders to the middle one and from it up
    portals(x(750), undefined, `${T('base').name}: subir para a Torre`, x(750), on(h.base.high), `${T('base').name}: descer`)
    ladder(x(2300), floor(x(2300)), h.base.mid.y, -70 * toCentre)
    // the base's middle island: a Portal de nascimento, a house and the start of the middle lane
    spawn(x(1000), on(h.base.mid))
    house(T('base').house, 13 + seed, x(1300), 250, 300, on(h.base.mid))
    tree(T('base').trees[0], 24 + seed, x(1430), 0.7, on(h.base.mid))
    rack('cage', x(1520), on(h.base.mid))
    rack('passagua', x(1600), on(h.base.mid))
    ladder(x(1750), h.base.mid.y, h.base.high.y, -70 * toCentre)
    wireStep(x(1905), h.base.mid)
    // the high island (the Torre): another Portal de nascimento and a lookout with the sniper's rifle
    spawn(x(1300), on(h.base.high))
    house(T('base').house, 14 + seed, x(1080), 260, 420, on(h.base.high), { floors: 3, roof: 'tower' })
    rack('sniper', x(600), on(h.base.high))
    wireStep(x(1355), h.base.high)

    // --- the low lane: the ground, along a line of poles whose wires run over it ---
    const lowPoles = [2400, 2950, 3500, 4050, 4600, 5150, 5700, 6250, 6800, 7350, 7900, 8450, 9000].map((v, k) => power(k % 3 === 2 ? 'duplo' : 'rua', x(v), 0.8, undefined, 0, 25, 2.5))
    lowLines.push(lowPoles)
    link(...(side < 0 ? lowPoles : lowPoles.slice().reverse()))
    ;[3225, 4325, 5425, 6525, 7625, 8725].forEach(v => step(x(v), floor(x(v)) - 160, 120))
    house(T('low').house, 31 + seed, x(3170), 240, 330, undefined, { floors: 2 })
    house(T('low').house, 32 + seed, x(5150), 200, 300, undefined, { floors: 1 })
    house(T('low').house, 33 + seed, x(7030), 220, 320)
    T('low').trees.forEach((style, k) => tree(style, 41 + k + seed, x(4100 + k * 2300), 0.85))
    ;[2800, 4250, 5800, 6500, 7650].forEach((v, k) => rack(T('low').items[k], x(v)))
    dummy(x(4450), side < 0 ? 'Bandido de palha: o deserto é dele até alguém derrubá-lo.' : 'Ferreiro de palha: cuidado com o que explode por aqui.')
    dummy(x(7900), 'Sentinela de palha: a arena das almas fica logo ali.')
    button('zombies', x(5950))
    button('zcount', x(6020))
    // the low jungle: a trampoline up to it from the ground and another from it to the middle lane
    h.lowJungle.forEach((i, k) => {
      trampoline(i.cx + toBase * (i.r - i.l) * 0.7, 4, toCentre * 6)
      trampoline(i.cx + toCentre * 130, 5, toCentre * 10, on(i), 140)
      rack(T('low').items[k + 1], i.cx + toBase * 60, on(i))
      chest(i.cx + toBase * 190, on(i), { lock: 'free', reopen: 90, loot: [{ pick: 'any', chance: 100 }, { pick: 'keys', chance: 35 }] })
      tree(T('low').trees[k % T('low').trees.length], 51 + k + seed, i.cx - toCentre * 10, 0.55, on(i))
    })

    // --- the middle lane: islands joined by the wires of lattice towers ---
    const midChain: LayoutElement[] = [laneTower('trelica', 0.42, h.base.mid, toCentre)]
    h.mid.forEach((i, k) => {
      midChain.push(laneTower('trelica', 0.42, i, toBase), laneTower('trelica', 0.42, i, toCentre))
      house(T('mid').house, 61 + k + seed, i.cx + toBase * 120, 210, 280, on(i), k === 1 ? { floors: 2 } : {})
      tree(T('mid').trees[k % T('mid').trees.length], 71 + k + seed, i.cx + toCentre * 150, 0.6, on(i))
      rack(T('mid').items[k], i.cx + toCentre * 10, on(i))
      if (k === 1) rack(T('mid').items[3], i.cx - toCentre * 280, on(i))
      wireStep(i.cx + toCentre * 60, i)
      // up to the jungle above, towards the centre
      trampoline(i.cx + toCentre * 130, 5, toCentre * 20, on(i), 140)
    })
    midChain.push(laneTower('trelica', 0.42, heart, toBase))
    link(...midChain)
    dummy(h.mid[2].cx - toCentre * 300, 'Guardião de palha da faixa do meio.', on(h.mid[2]))
    // --- the high lane: islands joined by the wires of cat-head towers ---
    const highChain: LayoutElement[] = [laneTower('gato', 0.4, h.base.high, toCentre)]
    h.high.forEach((i, k) => {
      highChain.push(laneTower('gato', 0.4, i, toBase), laneTower('gato', 0.4, i, toCentre))
      house(T('high').house, 81 + k + seed, i.cx + toBase * 110, 200, 280, on(i), k === 1 ? { floors: 2, roof: 'tower' } : {})
      tree(T('high').trees[k % T('high').trees.length], 91 + k + seed, i.cx + toCentre * 140, 0.55, on(i))
      rack(T('high').items[k], i.cx + toCentre * 20, on(i))
      if (k === 1) rack(T('high').items[3], i.cx - toCentre * 260, on(i))
      if (k === 2) rack(T('high').items[4], i.cx - toCentre * 260, on(i))
      button('aliens', i.cx + toCentre * 230, on(i))
      wireStep(i.cx + toCentre * 90, i)
    })
    highChain.push(laneTower('gato', 0.4, sanctuary, toBase))
    link(...highChain)
    // --- the jungle between the middle and the high lane: the owls' woods, Gaiolas, a song with a prize ---
    h.upJungle.forEach((i, k) => {
      tree(T('mid').trees[(k + 1) % T('mid').trees.length], 101 + k + seed, i.cx - toCentre * 120, 0.5, on(i))
      if (k === 2) {
        // the jungle's Vitrola: win its song for a key and an item
        sequencer('vitrola', i.cx + toCentre * 120, on(i), { minAccuracy: 50, hearts: 3, prize: [{ pick: 'key', chance: 100 }, { pick: 'any', chance: 100 }] })
        rack('cageConcorde', i.cx - toCentre * 40, on(i))
      } else {
        rack(k === 0 ? 'cage' : k === 1 ? 'passagua' : T('mid').items[4], i.cx + toCentre * 40, on(i))
        chest(i.cx + toCentre * 155, on(i), { lock: 'free', reopen: 120, loot: [{ pick: 'any', chance: 100 }, { pick: 'keys', chance: 40 }] })
      }
      if (k === 1) button('aliens', i.cx - toCentre * 30, on(i))
      // up to the high lane
      trampoline(i.cx - toCentre * 160, 5, toCentre * 12, on(i), 130)
    })
  }
  // the low lane goes on through the arena: the last poles of both sides are wired together
  link(lowLines[0][lowLines[0].length - 1], lowLines[1][lowLines[1].length - 1])

  // ---------- the centre ----------
  // the Arena das Almas (ground): a Jukebox whose won song gives a key, a Gongo, a Baú with a lock; ladders up
  sequencer('jukebox', CX - 260, undefined, { minAccuracy: 40, hearts: 4, prize: PRIZE_KEY })
  gong(CX + 40)
  chest(CX + 330, undefined, { lock: 'key', reopen: 120, loot: [{ pick: 'weapons', chance: 100 }, { pick: 'consumables', chance: 100 }] })
  rack('cardsRed', CX - 750)
  rack('cardsBlue', CX + 750)
  ladder(heart.l - 150, floor(heart.l - 150), heart.y, 70)
  ladder(heart.r + 150, floor(heart.r + 150), heart.y, -70)
  // the Coração do Arquipélago (middle): a Vitrola with a key and magic for the win, two Baús lendários with a lock
  sequencer('vitrola', CX - 120, on(heart), { minAccuracy: 60, hearts: 3, prize: [{ pick: 'key', chance: 100 }, { pick: 'magic', chance: 50 }] })
  gong(CX + 170, on(heart))
  chest(CX - 520, on(heart), { rarity: 'legendary', lock: 'key', reopen: 150 })
  chest(CX + 520, on(heart), { rarity: 'legendary', lock: 'key', reopen: 150 })
  tree('tule', 301, CX - 380, 0.3, on(heart))
  tree('tule', 302, CX + 380, 0.3, on(heart), { flip: true })
  wireStep(CX - 330, heart)
  wireStep(CX + 330, heart)
  ladder(sanctuary.l - 130, heart.y, sanctuary.y, 70)
  ladder(sanctuary.r + 130, heart.y, sanctuary.y, -70)
  // the Santuário (high): a Jukebox for a key and a weapon, a Baú lendário with magic only
  sequencer('jukebox', CX + 230, on(sanctuary), { minAccuracy: 70, hearts: 3, prize: [{ pick: 'key', chance: 100 }, { pick: 'weapons', chance: 100 }] })
  chest(CX - 230, on(sanctuary), { rarity: 'legendary', lock: 'key', reopen: 180, loot: [{ pick: 'magic', chance: 100 }, { pick: 'magic', chance: 30 }] })
  house('ornamental', 303, CX, 300, 420, on(sanctuary), { roof: 'tower', floors: 2 })
  ladder(altar.l - 150, sanctuary.y, altar.y, 70)
  ladder(altar.r + 150, sanctuary.y, altar.y, -70)
  // the Altar da Lua (on top, the Moon's gravity): the hardest song, the richest prize
  sequencer('vitrola', CX, on(altar), { minAccuracy: 80, hearts: 2, prize: [{ pick: 'key', chance: 100 }, { pick: 'magic', chance: 100 }, { pick: 'instruments', chance: 100 }] })
  chest(CX - 205, on(altar), { rarity: 'legendary', lock: 'key', reopen: 240, loot: [{ pick: 'mjolnir', chance: 50 }, { pick: 'odinstaff', chance: 50 }, { pick: 'magic', chance: 100 }] })
  chest(CX + 205, on(altar), { rarity: 'legendary', lock: 'key', reopen: 240, loot: [{ pick: 'weapons', chance: 100 }, { pick: 'weapons', chance: 100 }, { pick: 'key', chance: 50 }] })

  // ---------- the Portais de nascimento share the chances equally ----------
  const born = [out.find(e => e.kind === 'entry')!, ...spawns]
  shareOut(born.map(() => 1)).forEach((c, k) => { born[k].params.spawnChance = c })

  const elements = out.map(e => normalizeElement(storeElementPosition(e, DEADLOCK_SCREENS))!)
  return {
    v: LAYOUT_VERSION, elements,
    settings: { screens: DEADLOCK_SCREENS, height: DEADLOCK_HEIGHT, sky: DEADLOCK_SKY, mountains: DEADLOCK_MOUNTAINS, clouds: DEADLOCK_CLOUDS, aurora: DEADLOCK_AURORA, temple: false },
  }
}
