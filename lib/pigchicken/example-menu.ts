// The example Pátio "Praça dos Portais": the game's menu, meant to be the default Pátio. A small square with the
// portals to the main Pátios on stone steps along the ground (Training room, Sala de armas e instrumentos, Grid,
// Arquipélago das Almas) and, on floating platforms between them, the portals to the older examples. Each portal
// leads to another Pátio by its fixed id (lib/pigchicken/portal-links.ts); the example Pátios lead back here
// through a portal to the default Pátio.
import { LAYOUT_VERSION, createElement, entryPortalElement, normalizeElement, storeElementPosition, type ElementKind, type LayoutElement, type PatioLayout } from './layout'
import { POWER_MODELS, defaultPower } from './power-lines'
import { treePreset, type TreeStyle } from './trees'
import { defaultSoundZone } from './sound-zones'
import { SCENE_W, WORLD_GROUND_Y, worldScenes } from './world'
import { SKY_DEFAULT, hourStops, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT } from './mountains'
import type { SurfacePoint } from './surfaces'

const G = WORLD_GROUND_Y
// one Parquinho scene: the world always has two more after it (lib/pigchicken/world.ts), 5760 wide in all
export const MENU_SCREENS = 1
export const MENU_NAME = 'Praça dos Portais'
export const MENU_SKY: SkyParams = { ...SKY_DEFAULT, hour: 16.8, follow: true, stops: hourStops(16.8), clouds: 40, haze: 40, light: 70 }

// the Pátios the square leads to (the example ids of lib/pigchicken/example-seed.ts)
// the Training room in the database is an older row with the same name (the migration kept it), not the seed's id
export const TRAINING_PATIO_ID = '2cd19e1a-446a-4a6b-a67a-0c687c27537c'
export const ARSENAL_PATIO_ID = '5e7a0c11-0006-4e5a-9c0d-ec5a3b1e0006'
export const GRID_PATIO_ID = '5e7a0c11-0007-4e5a-9c0d-ec5a3b1e0007'
export const DEADLOCK_PATIO_ID = '5e7a0c11-0008-4e5a-9c0d-ec5a3b1e0008'
// on the ground, left to right: [id, name]
export const MENU_MAIN: [id: string, name: string][] = [
  [TRAINING_PATIO_ID, 'Training room'],
  [ARSENAL_PATIO_ID, 'Sala de armas e instrumentos'],
  [GRID_PATIO_ID, 'Grid com loot'],
  [DEADLOCK_PATIO_ID, 'Arquipélago das Almas'],
]
// on the platforms between them
export const MENU_MORE: [id: string, name: string][] = [
  ['5e7a0c11-0004-4e5a-9c0d-ec5a3b1e0004', 'Campo minado'],
  ['5e7a0c11-0002-4e5a-9c0d-ec5a3b1e0002', 'Vales e ilhas no céu'],
  ['5e7a0c11-0001-4e5a-9c0d-ec5a3b1e0001', 'Pôr do sol com torres'],
]
export const MENU_FIRST = 1000
export const MENU_STEP = 1100
const STEP_H = 24, SHELF_H = 330

// a portal to another Pátio: its middle at x, standing on `floor` (world y)
export function patioPortal(id: string, x: number, floor: number, target: string, name: string): LayoutElement {
  return normalizeElement({ id, kind: 'portal', x: x - 75, y: floor - 144, params: { portalPairId: '', portalTarget: target, portalTargetName: name, portalLabel: name, portalInstruction: 'always' } })!
}

export function menuLayout(): PatioLayout {
  let n = 0
  const out: LayoutElement[] = []
  const add = (kind: ElementKind, raw: Partial<LayoutElement>): LayoutElement => {
    const e = normalizeElement({ ...createElement(kind, 0, 0), id: `${kind}-praca${++n}`, ...raw })!
    out.push(e)
    return e
  }
  const stone = (x: number, top: number, w: number, h: number) => add('ground', {
    x, y: G - top, w, h, hard: true,
    params: { surface: { style: 'stone', points: [[0, 0], [100, 0], [100, 100], [0, 100]] as SurfacePoint[] } },
  })

  const entry = entryPortalElement()
  out.push({ ...entry, x: 260, y: G - entry.h + 6 })

  // the main portals, each on a low stone step
  MENU_MAIN.forEach(([id, name], i) => {
    const x = MENU_FIRST + i * MENU_STEP
    stone(x - 130, STEP_H, 260, STEP_H)
    out.push(patioPortal(`portal-praca-main${i + 1}`, x, G - STEP_H, id, name))
  })
  // the older examples, on platforms between them
  MENU_MORE.forEach(([id, name], i) => {
    const x = MENU_FIRST + MENU_STEP / 2 + i * MENU_STEP
    add('platform', { x: x - 130, y: G - SHELF_H, w: 260, h: 32 })
    out.push(patioPortal(`portal-praca-more${i + 1}`, x, G - SHELF_H, id, name))
  })

  // the square's frame: trees at both ends and, in the distance, a line of wooden poles
  const tree = (style: TreeStyle, x: number, scale: number, seed: number, layer: LayoutElement['layer'] = 'scene', depth = 0) => {
    const w = 380 * scale, h = 460 * scale
    add('tree', { x: x - w / 2, y: G + 8 - h, w, h, layer, depth, params: { tree: { ...treePreset(style, 9100 + seed), climbTrunk: false, walkBranches: false, walkCrown: false } } })
  }
  tree('oak', 90, 1.1, 1)
  tree('pine', 5560, 1.15, 2)
  tree('oak', 5000, 0.6, 3, 'back', 0.4)
  tree('pine', 620, 0.55, 4, 'back', 0.45)
  for (let i = 0; i < 13; i++) {
    const m = POWER_MODELS.madeira, x = 300 + i * 450, w = m.w * 0.6, h = m.h * 0.6
    add('pole', { x: x - w / 2, y: G - 40 - h, w, h, layer: 'back', depth: 0.35, params: { power: { ...defaultPower('pole'), model: 'madeira', line: 1, sag: 26, wire: 1.5 } } })
  }

  // a light, open music for the whole square
  add('zone', { x: 0, y: G - 1200, w: worldScenes(MENU_SCREENS) * SCENE_W, h: 1210, params: { zone: { ...defaultSoundZone(), name: MENU_NAME, root: 62, scale: 'majorPenta', chordScale: 'major', bpm: 88, feel: 'straight', progression: [0, 3, 4, 0], color: '#ffd166', ambience: { beat: 'pulse', bass: 'pad' } } } })

  const elements = out.map(e => normalizeElement(storeElementPosition(e, MENU_SCREENS))!)
  return { v: LAYOUT_VERSION, elements, settings: { screens: MENU_SCREENS, sky: MENU_SKY, mountains: { ...MOUNTAINS_DEFAULT, ranges: 3, height: 90 }, temple: false, sceneMusic: false } }
}
