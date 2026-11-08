// The demonstration composition, in scene-local coordinates. Entries are back to front.
import type { HouseParams } from './houses'
import { SCENE_W, WORLD_GROUND_Y } from './world'

type VillageHouse = [x: number, bottom: number, w: number, h: number, color: number, roof: HouseParams['roof'], floors: number]
export const VILLAGE_HOUSES: VillageHouse[] = [
  [601, 751, 179, 204, 0, 'gable', 2],
  [758, 681, 192, 205, 1, 'shed', 2],
  [930, 650, 151, 218, 2, 'gable', 2],
  [1070, 580, 194, 207, 3, 'gable', 2],
  [1244, 566, 151, 242, 0, 'hip', 3],
  [1370, 526, 166, 243, 1, 'gable', 2],
  [1516, 547, 185, 258, 4, 'gable', 2],
  [1680, 565, 181, 214, 2, 'reverse', 2],
  [430, 876, 176, 156, 2, 'gable', 1],
  [583, 873, 176, 162, 4, 'shed', 1],
  [738, 814, 200, 188, 3, 'gable', 2],
  [916, 803, 186, 173, 0, 'gable', 2],
  [1079, 768, 170, 189, 1, 'gable', 2],
  [1235, 735, 207, 193, 2, 'hip', 2],
  [1420, 722, 188, 177, 0, 'gable', 2],
  [1591, 690, 173, 160, 3, 'gable', 1],
  [1743, 679, 155, 150, 1, 'shed', 1],
]

export const VILLAGE_COLORS = [
  { wall: '#ae7970', roofColor: '#86534d', trim: '#e3c8ae', doorColor: '#526b7c' },
  { wall: '#6c8595', roofColor: '#4e5c74', trim: '#d2cebc', doorColor: '#8c5a54' },
  { wall: '#b59a81', roofColor: '#7c5c57', trim: '#ddc9a7', doorColor: '#5e7780' },
  { wall: '#819486', roofColor: '#566f6a', trim: '#d4c9af', doorColor: '#7c665a' },
  { wall: '#96879b', roofColor: '#635872', trim: '#d5c8b7', doorColor: '#695f76' },
]

export const VILLAGE_RIDGE: RidgePoint[] = [
  [286, 924], [448, 870], [625, 870], [803, 796], [974, 796], [1169, 727],
  [1378, 727], [1568, 678], [1725, 678], [1892, 645], [1912, 645],
]

// The old fixed "Chão da Vila" (`layout.terrain`, before layout v5): now the first ground element of the layout
// (lib/pigchicken/surfaces.ts `villageGround`). Kept to migrate the Pátios saved with an edited ridge.
export type RidgePoint = [x: number, y: number]
export const RIDGE_MIN_Y = -800
export const RIDGE_MAX_Y = WORLD_GROUND_Y - 6
export const RIDGE_MAX_POINTS = 48
const RIDGE_GAP = 16

export function normalizeVillageRidge(raw: unknown): RidgePoint[] | undefined {
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > RIDGE_MAX_POINTS) return
  const points: RidgePoint[] = []
  for (const p of raw) {
    if (!Array.isArray(p) || p.length !== 2 || !p.every(n => typeof n === 'number' && Number.isFinite(n))) return
    const [x, y] = p.map(Math.round)
    if (x < 0 || x > SCENE_W || y < RIDGE_MIN_Y || y > RIDGE_MAX_Y || (points.length && x - points.at(-1)![0] < RIDGE_GAP)) return
    points.push([x, y])
  }
  return points
}
