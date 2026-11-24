// The example Pátio "Grid com loot": the Grade de blocos (lib/pigchicken/mine-grid.ts) on, without bombs, over the
// whole world (15 blocks wide and 4 high). The blocks open with music and damage (lib/pigchicken/mine-round.ts) and a share of them is born
// with items on a shelf (Spawn de itens, lib/pigchicken/mine-items.ts), so opening the map is how she arms herself.
// Every block plays as a sound zone and a fifth of them carry a rhythm. Three free blocks on the ground to be born
// at, each with a portal back to the default Pátio (the Praça dos Portais).
import { DEFAULT_PATIO_TARGET, LAYOUT_VERSION, entryPortalElement, normalizeElement, storeElementPosition, type ElementKind, type LayoutElement, type PatioLayout } from './layout'
import { MINE_MARGIN, defaultMineGrid, mineCellRect, mineGeometry, type MineGridParams } from './mine-grid'
import { defaultMineItems } from './mine-item-params'
import { defaultMineZones } from './mine-zone-params'
import { defaultSoundZone } from './sound-zones'
import { SCENE_W, WORLD_GROUND_Y, worldScenes } from './world'
import { SKY_DEFAULT, hourStops, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT } from './mountains'
import { MENU_NAME, patioPortal } from './example-menu'

const G = WORLD_GROUND_Y
export const GRID_SCREENS = 2
// four rows of blocks under the ceiling
export const GRID_HEIGHT = 2100
export const GRID_PARAMS: MineGridParams = {
  ...defaultMineGrid(), on: true, cell: 448, gap: 32, bombs: 0, corner: 30,
  zones: { ...defaultMineZones(), rhythm: 20 },
  items: { ...defaultMineItems(), chance: 35, max: 3 },
}
export const GRID_SKY: SkyParams = { ...SKY_DEFAULT, hour: 21.5, follow: true, stops: hourStops(21.5), clouds: 20, haze: 25, light: 40 }
// the free blocks on the ground to be born at ([column, row 0]) and their chance; the first holds the entry portal
export const GRID_SPAWNS: { col: number; chance: number }[] = [{ col: 7, chance: 50 }, { col: 2, chance: 25 }, { col: 12, chance: 25 }]

// the grid covers the whole world, as in the game: its width counts the two scenes after the `screens`
export function gridGeometry() {
  return mineGeometry(GRID_PARAMS, { left: MINE_MARGIN.side, width: worldScenes(GRID_SCREENS) * SCENE_W - MINE_MARGIN.side * 2, top: G - GRID_HEIGHT + MINE_MARGIN.top, ground: G })
}

export function gridLayout(): PatioLayout {
  let n = 0
  const out: LayoutElement[] = []
  const add = (kind: ElementKind, raw: Partial<LayoutElement>): LayoutElement => {
    const e = normalizeElement({ id: `${kind}-grid${++n}`, kind, ...raw })!
    out.push(e)
    return e
  }
  const geo = gridGeometry()
  GRID_SPAWNS.forEach(({ col, chance }, i) => {
    const b = mineCellRect(geo, col, 0), entry = entryPortalElement()
    const at = { x: b.x + 40, y: G - entry.h + 6, params: { spawnChance: chance, freeBlock: true } }
    if (i === 0) out.push(normalizeElement({ ...entry, ...at })!)
    else add('spawn', at)
    out.push(patioPortal(`portal-grid-back${i + 1}`, b.x + b.w - 40 - 75, G, DEFAULT_PATIO_TARGET, MENU_NAME))
  })

  // the music of the whole field, under the blocks' own zones
  add('zone', { x: 0, y: G - GRID_HEIGHT, w: worldScenes(GRID_SCREENS) * SCENE_W, h: GRID_HEIGHT + 10, params: { zone: { ...defaultSoundZone(), name: 'Grid', root: 55, scale: 'dorian', chordScale: 'minor', bpm: 104, feel: 'straight', progression: [0, 3, 4, 3], color: '#58d6c9', ambience: { beat: 'pulse', bass: 'pad' } } } })

  const elements = out.map(e => normalizeElement(storeElementPosition(e, GRID_SCREENS))!)
  return { v: LAYOUT_VERSION, elements, settings: { screens: GRID_SCREENS, height: GRID_HEIGHT, sky: GRID_SKY, mountains: { ...MOUNTAINS_DEFAULT, ranges: 3, height: 80 }, temple: false, sceneMusic: false, mineGrid: GRID_PARAMS } }
}
