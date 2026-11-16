// The example Pátio "Training room": the chicken's moves in order, from the basic ones to the advanced ones, one
// station each along the room. Every station has its Quadro de lousa (the move's buttons in chalk) and the supports
// the move needs (platforms, boxes, walls, a pit, a trampoline); near the board a ghost chicken does the move over and
// over (lib/pigchicken/chalkboard.ts). At the end, a portal back to the start.
import { LAYOUT_VERSION, entryPortalElement, normalizeElement, storeElementPosition, type ElementKind, type LayoutElement, type PatioLayout } from './layout'
import { TRAINING_DEMOS, defaultChalkboard, type DemoId } from './chalkboard'
import { defaultSoundZone } from './sound-zones'
import { SCENE_W, WORLD_GROUND_Y, worldScenes } from './world'
import { HARP_BOX } from './fixed-instruments'
import { SKY_DEFAULT, hourStops, type SkyParams } from './sky'
import { MOUNTAINS_DEFAULT } from './mountains'
import type { SurfacePoint } from './surfaces'

const G = WORLD_GROUND_Y
export const TRAINING_SCREENS = 6
// the room's height up to its ceiling (world units above the ground)
export const TRAINING_HEIGHT = 1700
// where the first station starts and how wide each one is (world units)
export const TRAINING_START = 700
export const STATION_W = 930
const BOARD_W = 420, BOARD_H = 260

export const TRAINING_SKY: SkyParams = { ...SKY_DEFAULT, hour: 10.5, follow: true, stops: hourStops(10.5), clouds: 30, haze: 35, light: 70 }

// the stations, in order: the move and, for its ghost, where it starts (station-local x, the floor's height above
// the ground it stands on). The supports are built below, one block per station.
export const TRAINING_STATIONS: { demo: DemoId; start: [x: number, floor: number]; board?: [x: number, y: number] }[] = [
  { demo: 'walk', start: [120, 0] },
  { demo: 'jump', start: [150, 0] },
  { demo: 'fly', start: [160, 300] },
  { demo: 'slide', start: [100, 0] },
  { demo: 'superJump', start: [330, 0] },
  { demo: 'drop', start: [460, 360], board: [480, 420] },
  { demo: 'wall', start: [350, 0], board: [220, 330] },
  { demo: 'wallJump', start: [470, 0], board: [150, 560] },
  { demo: 'ceiling', start: [290, 0], board: [510, 330] },
  { demo: 'flip', start: [420, 260] },
  { demo: 'edge', start: [500, 240] },
  { demo: 'shocking', start: [470, 0], board: [300, 330] },
  { demo: 'airShocking', start: [420, 0], board: [270, 360] },
  { demo: 'longJump', start: [40, 150] },
  { demo: 'trampoline', start: [150, 200], board: [300, 330] },
]

export function trainingLayout(): PatioLayout {
  let n = 0
  const out: LayoutElement[] = []
  const add = (kind: ElementKind, raw: Partial<LayoutElement>): LayoutElement => {
    const e = normalizeElement({ id: `${kind}-treino${++n}`, kind, ...raw })!
    out.push(e)
    return e
  }
  // a floating box (a platform she stands on, hangs under and grabs by its sides), its top at `top` above the ground
  const box = (x: number, top: number, w: number, h = 36) => add('platform', { x, y: G - top, w, h })
  // a block of hard ground (she cannot pass through it), from the ground up to `top`
  const block = (x: number, top: number, w: number) => add('ground', {
    x, y: G - top, w, h: top, hard: true,
    params: { surface: { style: 'village', points: [[0, 0], [100, 0], [100, 100], [0, 100]] as SurfacePoint[] } },
  })
  // a tall wall of stone from the ground (hard: she climbs it but never passes through)
  const wall = (x: number, top: number, w: number) => add('wall', {
    x, y: G - top, w, h: top, hard: true,
    params: { surface: { style: 'stone', points: [[0, 0], [100, 0], [100, 100], [0, 100]] as SurfacePoint[] } },
  })
  // a board: its middle at x, its bottom `bottom` above the ground
  const board = (x: number, bottom: number, text: string, demo: DemoId | '' = '', start?: [number, number]) => {
    const el = add('chalkboard', { x: x - BOARD_W / 2, y: G - bottom - BOARD_H, w: BOARD_W, h: BOARD_H, layer: 'back' })
    el.params.chalkboard = {
      ...defaultChalkboard(), text, demo,
      // the ghost starts at the station's start: its offset from the board's bottom middle, looking down from a bit
      // above the floor it stands on
      ...(start ? { ghostX: Math.round(start[0] - x), ghostY: Math.round(bottom - start[1] - 20), reach: 460 } : {}),
    }
    return el
  }

  const entry = entryPortalElement()
  out.push({ ...entry, x: 40, y: G - entry.h + 6 })
  board(340, 300, 'TRAINING ROOM\ndo básico ao avançado →\nchegue perto de cada lousa\npara ver o movimento')

  TRAINING_STATIONS.forEach(({ demo, start, board: at }, i) => {
    const s = TRAINING_START + i * STATION_W
    const [bx, by] = at ?? [480, 330]
    board(s + bx, by, `${i + 1} · ${TRAINING_DEMOS[demo].text}`, demo, [s + start[0], start[1]])
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
        box(s + 60, 130, 160); box(s + 250, 240, 360, 40)
        break
      case 'shocking':
        box(s + 520, 300, 300)
        break
      case 'airShocking':
        wall(s + 600, 700, 80)
        break
      case 'longJump':
        block(s, 150, 300); block(s + 620, 150, 310)
        break
      case 'trampoline':
        box(s + 60, 200, 220)
        add('trampoline', { x: s + 280, y: G - 50, w: 200, h: 50, params: { trampoline: { strength: 4, angle: 0 } } })
        box(s + 520, 520, 300)
        break
    }
  })

  // the end: a portal back to the first station (its pair waits just before it)
  const end = TRAINING_START + TRAINING_STATIONS.length * STATION_W
  board(end + 220, 330, 'PRONTO!\nvolte pelo portal\npara treinar de novo')
  // and a Harpa to sit at and play (lib/pigchicken/fixed-instruments.ts), on the floor under that board
  add('pedalharp', { x: end + 150 - HARP_BOX.w / 2, y: G - HARP_BOX.h })
  const back = add('portal', { x: end + 460, y: G - 144, params: { portalLabel: 'Voltar ao início?', portalInstruction: 'always' } })
  back.params.portalPairId = back.id
  add('portal', { x: TRAINING_START - 180, y: G - 144, params: { portalPairId: back.id, portalLabel: 'Ir para o fim?', portalInstruction: 'hover' } })

  // a calm, steady music for the whole room
  add('zone', { x: 0, y: G - TRAINING_HEIGHT, w: worldScenes(TRAINING_SCREENS) * SCENE_W, h: TRAINING_HEIGHT + 10, params: { zone: { ...defaultSoundZone(), name: 'Training room', root: 60, scale: 'majorPenta', chordScale: 'major', bpm: 96, feel: 'straight', progression: [0, 5, 3, 4], color: '#7bd88f', ambience: { beat: 'pulse', bass: 'pad' } } } })

  const elements = out.map(e => normalizeElement(storeElementPosition(e, TRAINING_SCREENS))!)
  return { v: LAYOUT_VERSION, elements, settings: { screens: TRAINING_SCREENS, height: TRAINING_HEIGHT, sky: TRAINING_SKY, mountains: { ...MOUNTAINS_DEFAULT, ranges: 2, height: 70 }, temple: false, sceneMusic: false } }
}
