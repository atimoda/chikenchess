// The example Pátio "Campo minado": the Grade de blocos (lib/pigchicken/mine-grid.ts) over three screens, 13 blocks
// wide and 4 high, with a round ready to play (lib/pigchicken/mine-round.ts). Three portals are born at on the open
// side, each in its own free block of the ground row with an instrument (the flags) and a firearm (the blocks),
// and two inside closed blocks of the middle, for whoever is born on the closed side, each with a Chave dourada to
// disarm a bomb. Deeper in the grid, a few more weapons and two Baús reward whoever opens the way to them. Above the
// ground row every block with something in it has a shelf where its floor is: the items rest on it, and it is what
// is left to stand on once the block opens and its walls are gone.
import { ELEMENT_DEFS, LAYOUT_VERSION, entryPortalElement, normalizeElement, storeElementPosition, type ElementKind, type LayoutElement, type PatioLayout } from './layout'
import { MINE_MARGIN, defaultMineGrid, mineCellRect, mineGeometry, mineWallThickness, type MineGridParams } from './mine-grid'
import { defaultChest } from './chests'
import type { ItemId } from './items'
import { defaultSoundZone } from './sound-zones'
import { SCENE_W, WORLD_GROUND_Y, worldScenes } from './world'
import { SKY_DEFAULT, hourStops, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT } from './mountains'

const G = WORLD_GROUND_Y
export const MINEFIELD_SCREENS = 3
// tall enough for four rows of blocks under the ceiling
export const MINEFIELD_HEIGHT = 1800
export const MINEFIELD_GRID: MineGridParams = { ...defaultMineGrid(), on: true, cell: 384, gap: 32, bombs: 15 }
export const MINEFIELD_SKY: SkyParams = { ...SKY_DEFAULT, hour: 19.2, follow: true, stops: hourStops(19.2), clouds: 25, haze: 30, light: 45 }

// the portals she may be born at: the block ([column, row], row 0 on the ground), the chance, and what waits there
export const MINEFIELD_SPAWNS: { at: [c: number, r: number]; chance: number; free: boolean; items: ItemId[] }[] = [
  { at: [6, 0], chance: 30, free: true, items: ['flute', 'pistol'] }, // the entry portal
  { at: [1, 0], chance: 15, free: true, items: ['sax', 'rifle'] },
  { at: [11, 0], chance: 15, free: true, items: ['trumpet', 'pump'] },
  { at: [4, 2], chance: 20, free: false, items: ['goldkey'] },
  { at: [8, 2], chance: 20, free: false, items: ['goldkey'] },
]
// what the closed blocks keep for whoever gets there
export const MINEFIELD_ITEMS: { at: [c: number, r: number]; item: ItemId }[] = [
  { at: [3, 1], item: 'sniper' }, { at: [9, 1], item: 'smg' }, { at: [6, 3], item: 'guitar' }, { at: [0, 2], item: 'goldkey' }, { at: [12, 2], item: 'goldkey' },
]
export const MINEFIELD_CHESTS: [c: number, r: number][] = [[2, 3], [10, 3]]

export function minefieldGeometry() {
  return mineGeometry(MINEFIELD_GRID, { left: MINE_MARGIN.side, width: MINEFIELD_SCREENS * SCENE_W - MINE_MARGIN.side * 2, top: G - MINEFIELD_HEIGHT + MINE_MARGIN.top, ground: G })
}

export function minefieldLayout(): PatioLayout {
  let n = 0
  const out: LayoutElement[] = []
  const add = (kind: ElementKind, raw: Partial<LayoutElement>): LayoutElement => {
    const e = normalizeElement({ id: `${kind}-campo${++n}`, kind, ...raw })!
    out.push(e)
    return e
  }
  const geo = minefieldGeometry(), wall = mineWallThickness(geo)
  // the floor of a block: the ground for the first row, the top of its bottom wall for the others
  const block = (c: number, r: number) => { const k = mineCellRect(geo, c, r); return { ...k, floor: r === 0 ? G : k.y + k.h - wall } }
  // the shelf of a block above the ground row, in the place of its bottom wall (once for each block)
  const shelves = new Set<string>()
  const shelf = (c: number, r: number) => {
    if (r === 0 || shelves.has(`${c},${r}`)) return
    shelves.add(`${c},${r}`)
    const b = block(c, r)
    add('platform', { x: b.x + wall, y: b.floor, w: b.w - wall * 2, h: wall })
  }
  // a rack standing on a block's floor, its middle `dx` from the block's left side
  const rack = (c: number, r: number, dx: number, item: ItemId) => {
    const b = block(c, r), d = ELEMENT_DEFS.rack
    shelf(c, r)
    add('rack', { x: b.x + dx - d.w / 2, y: b.floor - d.h, params: { item } })
  }

  MINEFIELD_SPAWNS.forEach((s, i) => {
    const b = block(...s.at), entry = entryPortalElement()
    shelf(...s.at)
    // the portal on the left of its block; in a closed one, against the wall: a bomb is drawn in the block's middle
    const at = { x: s.free ? b.x + b.w * 0.3 - entry.w / 2 : b.x + wall + 2, y: b.floor - entry.h + 6, params: { spawnChance: s.chance, freeBlock: s.free } }
    if (i === 0) out.push(normalizeElement({ ...entry, ...at })!)
    else add('spawn', at)
    s.items.forEach((item, k) => rack(s.at[0], s.at[1], b.w * (s.free ? 0.62 + 0.22 * k : 0.8), item))
  })
  MINEFIELD_ITEMS.forEach(({ at, item }) => rack(at[0], at[1], geo.cell * 0.75, item))
  MINEFIELD_CHESTS.forEach(([c, r]) => {
    const b = block(c, r), d = ELEMENT_DEFS.chest
    shelf(c, r)
    add('chest', { x: b.x + b.w * 0.75 - d.w / 2, y: b.floor - d.h, params: { chest: defaultChest('simple') } })
  })

  // one music for the whole field
  add('zone', { x: 0, y: G - MINEFIELD_HEIGHT, w: worldScenes(MINEFIELD_SCREENS) * SCENE_W, h: MINEFIELD_HEIGHT + 10, params: { zone: { ...defaultSoundZone(), name: 'Campo minado', root: 57, scale: 'minorPenta', chordScale: 'minor', bpm: 92, feel: 'straight', progression: [0, 5, 3, 4], color: '#4d9bff', ambience: { beat: 'pulse', bass: 'pad' } } } })

  const elements = out.map(e => normalizeElement(storeElementPosition(e, MINEFIELD_SCREENS))!)
  return { v: LAYOUT_VERSION, elements, settings: { screens: MINEFIELD_SCREENS, height: MINEFIELD_HEIGHT, sky: MINEFIELD_SKY, mountains: { ...MOUNTAINS_DEFAULT, ranges: 3, height: 80 }, temple: false, sceneMusic: false, mineGrid: MINEFIELD_GRID } }
}
