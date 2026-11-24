// The example Pátio "Sala de armas e instrumentos": a white room without end (the "construct"), with every item of
// the game on shelves to pick up and try. One shelf unit per group (weapons, instruments, sports and magic, the
// special ones and the keys, the cages), three racks on each of its three levels, every rack giving the item back
// a second after it is taken. Then the fixed instruments (Harpa, Bateria, Piano de cauda) on the floor and, at the
// far end, a range of training dummies on the ground and on platforms. A portal at each end leads back to the
// default Pátio (the Praça dos Portais).
import { DEFAULT_PATIO_TARGET, ELEMENT_DEFS, LAYOUT_VERSION, createElement, entryPortalElement, normalizeElement, storeElementPosition, type ElementKind, type LayoutElement, type PatioLayout } from './layout'
import { CAGE_IDS, CONSUMABLE_IDS, INSTRUMENT_IDS, KEY_IDS, MAGIC_IDS, MINE_ITEM_IDS, SPORTS_IDS, WEAPON_IDS, type ItemId } from './items'
import { DRUMKIT_BOX, GRANDPIANO_BOX, HARP_BOX } from './fixed-instruments'
import { defaultSoundZone } from './sound-zones'
import { SCENE_W, WORLD_GROUND_Y, worldScenes } from './world'
import { SKY_DEFAULT, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT } from './mountains'
import { MENU_NAME, patioPortal } from './example-menu'

const G = WORLD_GROUND_Y
// two Parquinho scenes (the world has two more after them: 7680 wide in all)
export const ARSENAL_SCREENS = 2
export const ARSENAL_HEIGHT = 1400
// the construct: an even white, a pale sun, no clouds, no contraluz
export const ARSENAL_SKY: SkyParams = {
  ...SKY_DEFAULT, hour: 12, follow: false, stops: [{ at: 0, color: '#dfe4ea' }, { at: 0.6, color: '#f4f6f8' }, { at: 1, color: '#ffffff' }],
  sunSize: 25, glow: 0, clouds: 0, texture: 0, haze: 0, silhouette: 0, light: 100, forest: false, sunColor: '#ffffff', glowColor: '#ffffff',
}

// the shelf units, left to right: every item a rack can hold, once
export const ARSENAL_SHELVES: ItemId[][] = [
  WEAPON_IDS,
  INSTRUMENT_IDS,
  [...SPORTS_IDS, ...MAGIC_IDS],
  [...CONSUMABLE_IDS, ...KEY_IDS, ...MINE_ITEM_IDS],
  CAGE_IDS,
]
export const SHELF_FIRST = 700
export const SHELF_STEP = 720
export const SHELF_LEVEL = 240 // between two levels of a unit
const SHELF_W = 470, RACK_GAP = 150, PER_LEVEL = 3

export function arsenalLayout(): PatioLayout {
  let n = 0
  const out: LayoutElement[] = []
  const add = (kind: ElementKind, raw: Partial<LayoutElement>): LayoutElement => {
    const e = normalizeElement({ ...createElement(kind, 0, 0), id: `${kind}-arsenal${++n}`, ...raw })!
    out.push(e)
    return e
  }
  const rack = (cx: number, floor: number, item: ItemId) => {
    const d = ELEMENT_DEFS.rack
    add('rack', { x: cx - d.w / 2, y: floor - d.h, params: { item, respawnDelay: 1 } })
  }

  const entry = entryPortalElement()
  out.push({ ...entry, x: 60, y: G - entry.h + 6 })
  out.push(patioPortal('portal-arsenal-back1', 330, G, DEFAULT_PATIO_TARGET, MENU_NAME))

  // the shelves: the ground is the first level, two platforms above it
  ARSENAL_SHELVES.forEach((items, u) => {
    const mid = SHELF_FIRST + u * SHELF_STEP + SHELF_W / 2
    const levels = Math.ceil(items.length / PER_LEVEL)
    for (let l = 1; l < levels; l++) add('platform', { x: mid - SHELF_W / 2, y: G - l * SHELF_LEVEL, w: SHELF_W, h: 24 })
    items.forEach((item, i) => {
      const l = Math.floor(i / PER_LEVEL), k = i % PER_LEVEL
      rack(mid + (k - 1) * RACK_GAP, G - l * SHELF_LEVEL, item)
    })
  })

  // the fixed instruments
  const stage = SHELF_FIRST + ARSENAL_SHELVES.length * SHELF_STEP + 120
  let x = stage
  for (const [kind, box] of [['pedalharp', HARP_BOX], ['drumkit', DRUMKIT_BOX], ['grandpiano', GRANDPIANO_BOX]] as const) {
    add(kind, { x, y: G - box.h })
    x += box.w + 160
  }

  // the range: dummies on the ground and on platforms, a wall at the end
  const range = x + 200
  const dummy = (cx: number, floor: number) => { const d = ELEMENT_DEFS.dummy; add('dummy', { x: cx - d.w / 2, y: floor - d.h }) }
  dummy(range + 200, G); dummy(range + 480, G); dummy(range + 820, G)
  add('platform', { x: range + 560, y: G - 300, w: 260, h: 28 }); dummy(range + 690, G - 300)
  add('platform', { x: range + 980, y: G - 520, w: 260, h: 28 }); dummy(range + 1110, G - 520)
  const end = worldScenes(ARSENAL_SCREENS) * SCENE_W
  out.push(patioPortal('portal-arsenal-back2', Math.min(range + 1450, end - 120), G, DEFAULT_PATIO_TARGET, MENU_NAME))

  // a steady, cool music for the whole room
  add('zone', { x: 0, y: G - ARSENAL_HEIGHT, w: end, h: ARSENAL_HEIGHT + 10, params: { zone: { ...defaultSoundZone(), name: 'Sala de armas', root: 57, scale: 'dorian', chordScale: 'minor', bpm: 100, feel: 'straight', progression: [0, 3, 6, 4], color: '#9fb4c8', ambience: { beat: 'pulse', bass: 'pad' } } } })

  const elements = out.map(e => normalizeElement(storeElementPosition(e, ARSENAL_SCREENS))!)
  return { v: LAYOUT_VERSION, elements, settings: { screens: ARSENAL_SCREENS, height: ARSENAL_HEIGHT, sky: ARSENAL_SKY, mountains: { ...MOUNTAINS_DEFAULT, show: false }, temple: false, sceneMusic: false } }
}
