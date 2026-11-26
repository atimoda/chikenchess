// The Prédio (Modo editor → Casas): a hall in the Templo do Gongo's style, whose roofs are floors she can climb, and
// the Mureta com cerca (Plataformas): the temple's white balustrade over a red wall, a floating floor along the top of
// the wall's coping. The Templo do Gongo is made of them (lib/pigchicken/layout.ts, templeElements).
//
// Geometry in the element's own units (x 0..w, y 0..h, the box's top-left at 0,0), shared by the art
// (components/pigchicken/building-art.tsx) and the one-way floors the engine reads. Pure.
import { msg } from '../i18n'
export const BUILDING_ROOFS = { hip: msg("Beirais curvos"), pyramid: msg("Pirâmide") } as const
export type BuildingRoof = keyof typeof BUILDING_ROOFS
export type BuildingParams = {
  roof: BuildingRoof
  storeys: number // 1: one roof over the columns; 2: a skirt roof over the columns and an upper storey with its roof
  ridge: boolean // the green ridge with dragon finials (curved eaves) or the golden finial (pyramid)
  columns: number // red columns along the front
  doors: number // lattice doors (whole bays, in the middle); the other bays have windows
  lanterns: number // red lanterns hanging from the lower eaves
  plaque: boolean // the blue plaque with the gold sign
  haze: boolean // far behind, in the dusk's haze: faded, and nothing to climb
}
export const BUILDING_COLUMNS = { min: 2, max: 30 }
export const BUILDING_LANTERNS = { min: 0, max: 12 }
export const BUILDING_STOREYS = { min: 1, max: 2 }
export const BUILDING_SIZE = { w: 640, h: 420 }

export const defaultBuilding = (): BuildingParams => ({ roof: 'hip', storeys: 2, ridge: true, columns: 8, doors: 7, lanterns: 2, plaque: true, haze: false })

const int = (v: unknown, d: number, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d)
const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d)
export function normalizeBuilding(raw: unknown): BuildingParams {
  const d = defaultBuilding()
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const columns = int(p.columns, d.columns, BUILDING_COLUMNS.min, BUILDING_COLUMNS.max)
  return {
    roof: typeof p.roof === 'string' && Object.hasOwn(BUILDING_ROOFS, p.roof) ? p.roof as BuildingRoof : d.roof,
    storeys: int(p.storeys, d.storeys, BUILDING_STOREYS.min, BUILDING_STOREYS.max),
    ridge: bool(p.ridge, d.ridge),
    columns,
    doors: int(p.doors, columns - 1, 0, columns - 1),
    lanterns: int(p.lanterns, d.lanterns, BUILDING_LANTERNS.min, BUILDING_LANTERNS.max),
    plaque: bool(p.plaque, d.plaque),
    haze: bool(p.haze, d.haze),
  }
}

export type Pt = [number, number]
const quad = (a: Pt, c: Pt, b: Pt, n = 6): Pt[] => Array.from({ length: n }, (_, i) => { const t = (i + 1) / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]] as Pt })

// a roof with upturned eaves: ridge from cx-top..cx+top at yTop, eaves cx-bot..cx+bot at yBot, the corners flying up
export type RoofShape = { cx: number; yTop: number; top: number; bot: number; yBot: number; fly: number }
export function roofPath({ cx, yTop, top, bot, yBot, fly }: RoofShape) {
  const l = cx - bot, r = cx + bot
  return [
    `M ${l - fly} ${yBot - 14}`,
    `Q ${l - 4} ${yBot - 2} ${l + 26} ${yBot - 8}`,
    `Q ${cx - top - (bot - top) * 0.15} ${yBot - (yBot - yTop) * 0.25} ${cx - top} ${yTop}`,
    `L ${cx + top} ${yTop}`,
    `Q ${cx + top + (bot - top) * 0.15} ${yBot - (yBot - yTop) * 0.25} ${r - 26} ${yBot - 8}`,
    `Q ${r + 4} ${yBot - 2} ${r + fly} ${yBot - 14}`,
    `L ${r + fly - 10} ${yBot + 6}`,
    `L ${l - fly + 10} ${yBot + 6} Z`,
  ].join(' ')
}
// the roof's upper outline as points (the same curves as roofPath), a floor
export function roofTop({ cx, yTop, top, bot, yBot, fly }: RoofShape): Pt[] {
  const l = cx - bot, r = cx + bot
  const p0: Pt = [l - fly, yBot - 14], p1: Pt = [l + 26, yBot - 8], p2: Pt = [cx - top, yTop], p3: Pt = [cx + top, yTop], p4: Pt = [r - 26, yBot - 8], p5: Pt = [r + fly, yBot - 14]
  return [p0, ...quad(p0, [l - 4, yBot - 2], p1, 3), ...quad(p1, [cx - top - (bot - top) * 0.15, yBot - (yBot - yTop) * 0.25], p2), p3, ...quad(p3, [cx + top + (bot - top) * 0.15, yBot - (yBot - yTop) * 0.25], p4), ...quad(p4, [r + 4, yBot - 2], p5, 3)]
}
// a roof's lower edge (the eaves' line), straight: a floor too
export const roofEaves = ({ cx, bot, yBot, fly }: RoofShape): Pt[] => [[cx - bot - fly + 10, yBot + 6], [cx + bot + fly - 10, yBot + 6]]

// the pyramid roof: eaves cx-bot..cx+bot at yBot, the apex at (cx, apex)
export type PyramidShape = { cx: number; apex: number; half: number; bot: number; yBot: number }
export function pyramidPath({ cx, apex, half, bot, yBot }: PyramidShape) {
  const shoulder = half * 0.923
  return `M ${cx - bot} ${yBot} Q ${cx - half - 10} ${yBot - 4} ${cx - shoulder} ${yBot - 16} L ${cx} ${apex} L ${cx + shoulder} ${yBot - 16} Q ${cx + half + 10} ${yBot - 4} ${cx + bot} ${yBot} L ${cx + bot - 12} ${yBot + 10} L ${cx - bot + 12} ${yBot + 10} Z`
}
export function pyramidTop({ cx, apex, half, bot, yBot }: PyramidShape): Pt[] {
  const shoulder = half * 0.923
  const a: Pt = [cx - bot, yBot], b: Pt = [cx - shoulder, yBot - 16], c: Pt = [cx + shoulder, yBot - 16], d: Pt = [cx + bot, yBot]
  return [a, ...quad(a, [cx - half - 10, yBot - 4], b, 3), [cx, apex], c, ...quad(c, [cx + half + 10, yBot - 4], d, 3)]
}

export type BuildingGeometry = {
  cx: number; half: number; base: number; colTop: number
  // the roof over the columns (curved eaves) and, with two storeys, the upper storey (its walls, its roof)
  low: RoofShape | null
  upper: { half: number; top: number; bottom: number; roof: RoofShape | null } | null
  pyramid: PyramidShape | null
  ridge: { x: number; y: number; w: number } | null // the green ridge with the dragons (curved eaves)
  finial: { x: number; y: number } | null // the pyramid's golden ball
  bays: { x: number; w: number; door: boolean }[]
  columns: number[] // x of each column
  lanterns: number[] // x of each lantern; they hang from y = colTop + 2
  plaque: { x: number; y: number } | null // its top-left (72 x 58)
  floors: Pt[][] // the roofs' top edges and their eaves: one-way floors (none in the haze)
}

// The building in its box. The proportions are the Templo do Gongo's: with its boxes (main hall 1228 x 451, right
// pavilion 400 x 395, the far one 488 x 381) it draws as the temple always did.
export function buildingGeometry(p: BuildingParams, w: number, h: number): BuildingGeometry {
  const cx = w / 2, base = h - 13
  const pyr = p.roof === 'pyramid'
  // how far the lower eaves fly past the walls
  const ov = pyr ? Math.min(70, w * 0.175) : Math.min(94, w * 0.2)
  const fly = ov * (pyr ? 30 / 70 : 34 / 94)
  const half = Math.max(8, cx - ov)
  const two = p.storeys >= 2
  let colTop: number, low: RoofShape | null = null, upper: BuildingGeometry['upper'] = null, pyramid: PyramidShape | null = null
  let ridge: BuildingGeometry['ridge'] = null, finial: BuildingGeometry['finial'] = null
  if (!pyr) {
    // the ridge's dragons rise 48 over it
    const ridgeY = Math.min(48, h * 0.11), span = base - ridgeY
    if (two) {
      colTop = base - span * 0.3846
      const uTop = base - span * 0.6923, uHalf = half * 0.769
      const lowH = 64 * Math.min(1, span / 320)
      low = { cx, yTop: colTop - lowH, top: half - 10, bot: half + (ov - fly), yBot: colTop + 2, fly }
      upper = { half: uHalf, top: uTop, bottom: colTop - lowH, roof: { cx, yTop: ridgeY, top: uHalf * 0.55, bot: uHalf + 70 * Math.min(1, w / 488), yBot: uTop + 4, fly: 30 * Math.min(1, w / 488) } }
      if (p.ridge) ridge = { x: cx - uHalf * 0.55, y: ridgeY, w: uHalf * 1.1 }
    } else {
      colTop = base - span * 0.5
      low = { cx, yTop: ridgeY, top: half * 0.55, bot: half + (ov - fly), yBot: colTop + 2, fly }
      if (p.ridge) ridge = { x: cx - half * 0.55, y: ridgeY, w: half * 1.1 }
    }
  } else {
    // the finial rises 44 over the apex
    const apex = Math.min(44, h * 0.11), span = base - apex
    if (two) {
      colTop = base - span * 0.349
      low = { cx, yTop: base - span * 0.574, top: half * 0.54, bot: half + (ov - fly), yBot: base - span * 0.414, fly }
      const uTop = base - span * 0.716
      upper = { half: half * 0.846, top: uTop, bottom: uTop + span * 0.154, roof: null }
      pyramid = { cx, apex, half, bot: half + (ov - fly), yBot: base - span * 0.692 }
    } else {
      colTop = base - span * 0.5
      pyramid = { cx, apex, half, bot: half + (ov - fly), yBot: colTop - 10 }
    }
    if (p.ridge) finial = { x: cx, y: apex - 32 }
  }
  const nb = Math.max(1, p.columns - 1), step = (half * 2) / nb
  const doors = Math.min(nb, p.doors), first = Math.floor((nb - doors) / 2)
  const bays = Array.from({ length: nb }, (_, i) => ({ x: cx - half + i * step, w: step, door: i >= first && i < first + doors }))
  const columns = Array.from({ length: nb + 1 }, (_, i) => cx - half + i * step)
  // the lanterns: in pairs from the middle outwards (one in the middle when odd), up to 0.885 of the half-width
  const n = p.lanterns
  const lanterns = n === 0 ? [] : n === 1 ? [cx] : Array.from({ length: n }, (_, i) => {
    const j = i - (n - 1) / 2
    const k = n % 2 === 0 ? j + Math.sign(j) * 0.5 : j
    return cx + k * (half * 0.885) / (n % 2 === 0 ? n / 2 : (n - 1) / 2)
  })
  const plaque = !p.plaque ? null : upper && !pyr ? { x: cx - 36, y: upper.top + 16 } : { x: cx - 36, y: colTop + 34 }
  const floors: Pt[][] = []
  if (!p.haze) {
    if (pyramid) floors.push(pyramidTop(pyramid))
    if (upper?.roof) floors.push(roofTop(upper.roof), roofEaves(upper.roof))
    if (low) floors.push(roofTop(low), roofEaves(low))
  }
  return { cx, half, base, colTop, low, upper, pyramid, ridge, finial, bays, columns, lanterns, plaque, floors }
}

// the floors in the element's units (scaled to its box w x h), for the engine
export const buildingSurfaces = (p: BuildingParams, w: number, h: number) => buildingGeometry(p, w, h).floors

// ---------- Mureta com cerca ----------
// the white marble balustrade (44 tall) over the coping of a red wall; the floor is the top of the coping, 42 below the
// box's top, along its whole width. The wall fills the rest of the box down to its bottom.
export const BALUSTRADE_FLOOR = 42
export const BALUSTRADE_SIZE = { w: 640, h: 130 }
export type BalustradeParams = { courtyard: boolean } // the stone courtyard floor under the wall's bottom
export const defaultBalustrade = (): BalustradeParams => ({ courtyard: true })
export const normalizeBalustrade = (raw: unknown): BalustradeParams => ({ courtyard: bool((raw as { courtyard?: unknown } | null)?.courtyard, true) })
