// The example Pátio "Training room": the chicken's moves in order, from the basic ones to the advanced ones, one
// station each along the room, in sections (Básico; Paredes e teto; Chocar). Every station has its Quadro de lousa
// (the move's buttons in chalk) and the supports the move needs (platforms, boxes, walls, a pit, a trampoline, poles
// with wires, a hard ceiling); near the board a ghost chicken does the move over and over (lib/pigchicken/chalkboard.ts).
// The last section, Combate e itens, has boards without a ghost, racks with an instrument and a weapon and training
// dummies. By the entrance, a portal to the start of each later section, and there a portal back.
import { ELEMENT_DEFS, LAYOUT_VERSION, entryPortalElement, normalizeElement, storeElementPosition, type ElementKind, type LayoutElement, type PatioLayout } from './layout'
import { TRAINING_DEMOS, defaultChalkboard, type DemoId } from './chalkboard'
import { defaultPower } from './power-lines'
import { defaultSoundZone } from './sound-zones'
import { SCENE_W, WORLD_GROUND_Y, worldScenes } from './world'
import { SKY_DEFAULT, hourStops, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT } from './mountains'
import type { SurfacePoint } from './surfaces'
import type { ItemId } from './items'
import { msg } from '../i18n'

const G = WORLD_GROUND_Y
// the widest a Pátio gets: 8 scenes (10 with the two at the end, 19200 wide)
export const TRAINING_SCREENS = 8
// the room's height up to its ceiling (world units above the ground)
export const TRAINING_HEIGHT = 1700
// where the first station starts, and the room a later section takes before its first station (its board and the
// portal back to the entrance)
export const TRAINING_START = 1100
export const SECTION_GAP = 460
const BOARD_W = 420, BOARD_H = 260

export const TRAINING_SKY: SkyParams = { ...SKY_DEFAULT, hour: 10.5, follow: true, stops: hourStops(10.5), clouds: 30, haze: 35, light: 70 }

// the sections, in order: the name on their first board and the moves of their stations
export const TRAINING_SECTIONS: { name: string; board: string; title: string; stations: DemoId[] }[] = [
  { name: msg('BÁSICO'), board: msg('BÁSICO\nchegue perto de cada lousa\npara ver o movimento'), title: msg('Básico'), stations: ['walk', 'jump', 'slide', 'superJump', 'fly', 'drop', 'trampoline'] },
  { name: msg('PAREDES E TETO'), board: msg('PAREDES E TETO\nchegue perto de cada lousa\npara ver o movimento'), title: msg('Paredes e teto'), stations: ['wall', 'wallJump', 'edge', 'ceiling', 'flip', 'sideSwitch', 'wires'] },
  { name: msg('CHOCAR'), board: msg('CHOCAR\nchegue perto de cada lousa\npara ver o movimento'), title: msg('Chocar'), stations: ['brood', 'shocking', 'longJump', 'airShocking', 'wallShock', 'ceilingShock', 'clingBrood'] },
]

// each move's station: how wide it is, for its ghost where it starts (station-local x, the height above the ground of
// what it stands on) and, optionally, where its board is (station-local x of its middle, its bottom above the ground)
export const TRAINING_STATIONS: Record<DemoId, { w: number; start: [x: number, floor: number]; board?: [x: number, y: number] }> = {
  walk: { w: 700, start: [120, 0] },
  jump: { w: 880, start: [150, 0] },
  slide: { w: 650, start: [100, 0] },
  superJump: { w: 700, start: [330, 0] },
  fly: { w: 930, start: [160, 300] },
  drop: { w: 700, start: [460, 360], board: [480, 420] },
  trampoline: { w: 830, start: [150, 200], board: [300, 330] },
  wall: { w: 680, start: [350, 0], board: [220, 330] },
  wallJump: { w: 660, start: [470, 0], board: [150, 560] },
  edge: { w: 700, start: [570, 240] },
  ceiling: { w: 810, start: [290, 0], board: [510, 330] },
  flip: { w: 700, start: [420, 260] },
  sideSwitch: { w: 700, start: [430, 240], board: [480, 420] },
  wires: { w: 860, start: [150, 0], board: [480, 420] },
  brood: { w: 600, start: [150, 0], board: [380, 330] },
  shocking: { w: 840, start: [470, 0], board: [300, 330] },
  longJump: { w: 820, start: [40, 150] },
  airShocking: { w: 820, start: [420, 0], board: [270, 360] },
  wallShock: { w: 600, start: [350, 0], board: [220, 560] },
  ceilingShock: { w: 700, start: [330, 0], board: [480, 470] },
  clingBrood: { w: 600, start: [350, 0], board: [220, 560] },
}

// the last section, Combate e itens: boards without a ghost, one with a rack of an instrument and one of a weapon to
// pick up, one with training dummies to hit
export const ITEMS_SECTION = { name: msg('COMBATE E ITENS'), title: msg('Combate e itens') }
export const ITEMS_RACKS: ItemId[] = ['flute', 'pistol']
export const ITEMS_BOARDS: { w: number; text: string }[] = [
  { w: 520, text: msg('COMBATE E ITENS\nE  pega o item do suporte\nTAB  instrumentos · F  utilitários\nQ  variação · T  roda dos itens\nB  guarda o item\nControle: X, LB, B') },
  { w: 560, text: msg('USAR O ITEM\nV  atira ou toca\nR  recarrega · mouse  mira\nC  golpe (4 seguidos: combo)\nsegure G e solte: arremessa\nControle: RT, Y, R3\ne a mira no analógico direito') },
]

// where each station starts (world x), section by section, where the Combate e itens boards start and where the
// room's end is
export function trainingPlan() {
  const at = {} as Record<DemoId, number>
  const sections: number[] = []
  let x = TRAINING_START
  TRAINING_SECTIONS.forEach(({ stations }, k) => {
    if (k > 0) { sections.push(x); x += SECTION_GAP }
    for (const demo of stations) { at[demo] = x; x += TRAINING_STATIONS[demo].w }
  })
  // a little room after the last station's wall
  const items = x + 100
  return { at, sections, items, end: items + ITEMS_BOARDS.reduce((t, b) => t + b.w, 0) }
}

export function trainingLayout(): PatioLayout {
  let n = 0
  const out: LayoutElement[] = []
  const worldW = worldScenes(TRAINING_SCREENS) * SCENE_W
  const add = (kind: ElementKind, raw: Partial<LayoutElement>): LayoutElement => {
    const e = normalizeElement({ id: `${kind}-treino${++n}`, kind, ...raw })!
    out.push(e)
    return e
  }
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]] as SurfacePoint[]
  const base = G
  // a floating box (a platform she stands on, hangs under and grabs by its sides), its top at `top` above the ground
  const box = (x: number, top: number, w: number, h = 36) => add('platform', { x, y: G - top, w, h })
  // a block of hard ground (she cannot pass through it), from the ground up to `top`, or `h` tall
  const block = (x: number, top: number, w: number, h = top) => add('ground', { x, y: base - top, w, h, hard: true, params: { surface: { style: 'village', points: square } } })
  // a tall wall of stone from the ground (hard: she climbs it but never passes through)
  const wall = (x: number, top: number, w: number) => add('wall', { x, y: base - top, w, h: top, hard: true, params: { surface: { style: 'stone', points: square } } })
  // a board: its middle at x, its bottom `bottom` above the ground
  const board = (x: number, bottom: number, text: string, demo: DemoId | '' = '', start?: [number, number]) => {
    const el = add('chalkboard', { x: x - BOARD_W / 2, y: base - bottom - BOARD_H, w: BOARD_W, h: BOARD_H, layer: 'back' })
    el.params.chalkboard = {
      ...defaultChalkboard(), text, demo,
      // the ghost starts at the station's start: its offset from the board's bottom middle, looking down from a bit
      // above the floor it stands on
      ...(start ? { ghostX: Math.round(start[0] - x), ghostY: Math.round(bottom - start[1] - 20), reach: 460 } : {}),
    }
    return el
  }
  // a portal standing on the ground, with its name always in sight
  const portal = (x: number, label: string, instruction: 'always' | 'hover' = 'always') => add('portal', { x, y: base - 144, params: { portalLabel: label, portalInstruction: instruction } })
  const pair = (a: LayoutElement, b: LayoutElement) => { a.params.portalPairId = a.id; b.params.portalPairId = a.id }

  const entry = entryPortalElement()
  out.push({ ...entry, x: 40, y: G - entry.h + 6 })
  board(360, 300, msg('TRAINING ROOM\ndo básico ao avançado →\nchegue perto de cada lousa\npara ver o movimento'))

  // the sections: at the start of each later one, its board over the portal back to the entrance, which a portal by
  // the entrance leads to; then its stations in a row
  const plan = trainingPlan()
  let number = 0
  TRAINING_SECTIONS.forEach(({ board: sectionBoard, title, stations }, k) => {
    if (k > 0) {
      const x = plan.sections[k - 1]
      board(x + SECTION_GAP / 2, 330, sectionBoard)
      pair(portal(440 + k * 160, title), portal(x + SECTION_GAP / 2 - 75, msg('Voltar à entrada?'), 'hover'))
    }
    stations.forEach(demo => {
      const s = plan.at[demo]
      const { start, board: at } = TRAINING_STATIONS[demo]
      const [bx, by] = at ?? [480, 330]
      board(s + bx, by, `${++number} · ${TRAINING_DEMOS[demo].text}`, demo, [s + start[0], start[1]])
      switch (demo) {
        case 'jump':
          box(s + 330, 110, 230); box(s + 640, 280, 230)
          break
        case 'fly':
          box(s + 20, 130, 130); box(s + 80, 300, 220); box(s + 690, 120, 240)
          break
        case 'superJump':
          box(s + 430, 220, 240)
          break
        case 'drop':
          box(s + 120, 120, 160); box(s + 300, 180, 330); box(s + 300, 360, 330)
          break
        case 'trampoline':
          box(s + 60, 200, 220)
          add('trampoline', { x: s + 280, y: base - 50, w: 200, h: 50, params: { trampoline: { strength: 4, angle: 0 } } })
          box(s + 520, 520, 300)
          break
        case 'wall':
          box(s + 440, 420, 200, 420)
          break
        case 'wallJump':
          box(s + 380, 700, 70, 700); box(s + 550, 700, 70, 700)
          break
        case 'ceiling':
          box(s + 230, 260, 560, 30)
          break
        case 'flip':
          box(s + 100, 130, 160); box(s + 320, 260, 320, 40)
          break
        case 'edge':
          // a tall box: she has room to slide down its side after grabbing the edge
          box(s + 60, 130, 160); box(s + 250, 240, 360, 120)
          break
        case 'sideSwitch':
          box(s + 60, 130, 160); box(s + 250, 240, 360, 40)
          break
        case 'wires':
          // three wooden poles in a row, their wires low enough to reach with a few jumps
          for (const px of [80, 420, 760]) add('pole', { x: s + px, y: base - 300, w: 82, h: 300, layer: 'back', params: { power: { ...defaultPower('pole'), sag: 20, wire: 2 } } })
          break
        case 'shocking':
          box(s + 520, 300, 300)
          break
        case 'airShocking':
          wall(s + 600, 700, 80)
          break
        case 'longJump':
          block(s, 150, 300); block(s + 620, 150, 180)
          break
        case 'wallShock':
          wall(s + 480, 600, 80)
          break
        case 'ceilingShock':
          // a slab of hard ground in the air: its underside is a hard ceiling
          block(s + 150, 420, 500, 60)
          break
        case 'clingBrood':
          wall(s + 480, 700, 80)
          break
      }
    })
  })

  // Combate e itens: its first board over the portal back to the entrance (which a portal by the entrance leads to)
  // and the two racks; the second one over three training dummies
  const [first, second] = ITEMS_BOARDS
  board(plan.items + first.w / 2, 330, `${++number} · ${first.text}`)
  pair(portal(440 + TRAINING_SECTIONS.length * 160, ITEMS_SECTION.title), portal(plan.items + 20, msg('Voltar à entrada?'), 'hover'))
  ITEMS_RACKS.forEach((item, i) => add('rack', { x: plan.items + 250 + i * 140, y: G - ELEMENT_DEFS.rack.h, params: { item, respawnDelay: 1 } }))
  board(plan.items + first.w + second.w / 2 - 40, 330, `${++number} · ${second.text}`)
  for (const dx of [400, 470, 540]) add('dummy', { x: plan.items + first.w + dx - ELEMENT_DEFS.dummy.w / 2, y: G - ELEMENT_DEFS.dummy.h })

  // a calm, steady music for the whole room
  add('zone', { x: 0, y: G - TRAINING_HEIGHT, w: worldW, h: TRAINING_HEIGHT + 10, params: { zone: { ...defaultSoundZone(), name: msg('Training room'), root: 60, scale: 'majorPenta', chordScale: 'major', bpm: 96, feel: 'straight', progression: [0, 5, 3, 4], color: '#7bd88f', ambience: { beat: 'pulse', bass: 'pad' } } } })

  const elements = out.map(e => normalizeElement(storeElementPosition(e, TRAINING_SCREENS))!)
  return { v: LAYOUT_VERSION, elements, settings: { screens: TRAINING_SCREENS, height: TRAINING_HEIGHT, sky: TRAINING_SKY, mountains: { ...MOUNTAINS_DEFAULT, ranges: 2, height: 70 }, temple: false, sceneMusic: false } }
}
