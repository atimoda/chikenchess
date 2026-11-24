// Grade de blocos (the Pátio "Campo minado"): a grid of square blocks over the Pátio, from its left edge to its right
// one and from the ground up to its ceiling. A block is closed or open and may hide a bomb; an open one shows how
// many bombs its 8 neighbours hide. Whoever is in a closed block is on the closed side, in an open one on the open
// side, and the walls of the closed blocks keep the two apart. Pure: the settings live in the Pátio's settings
// (patio-settings.ts), the round's rules in mine-round.ts and its state in mine-grid-store.ts; the walls go to the
// DOM for the chicken's engine, with the drawing, in components/pigchicken/mine-grid-layer.tsx.
import { defaultMineZones, normalizeMineZones, type MineZoneParams } from './mine-zone-params'
import { defaultMineItems, normalizeMineItems, type MineItemParams } from './mine-item-params'
import DEFAULTS_FILE from '../../data/pigchicken/default-patio.json'

export type MineGridParams = {
  on: boolean
  cell: number // the side of a block, world units
  gap: number // the space between two blocks (0: they touch)
  pass: boolean // "Bloqueia passagem": the walls of the closed blocks stop the characters
  bombs: number // the chance of a bomb in each block, whole percents
  // the seesaw of a closed block (lib/pigchicken/mine-round.ts)
  blockNotes: boolean // "Notas quicam nas paredes": the notes bounce off the walls of the closed blocks (off: they go through)
  toFlag: number // notes from grey to the flag
  toOpen: number // damage from grey until the block is set free (0: it never breaks)
  insideBreaks: boolean // "Lado de dentro quebra paredes": the closed side's shots, blasts and blows damage the blocks too
  toDoubt: number // notes from the flag to the doubt
  turn: MineTurn // "Giro da gangorra": the edge the blue grows from
  fuse: number // the detonator's time, s
  startBombs: number // bombs in the inventory of whoever is born on the closed side
  grey: string; blue: string; red: string // the seesaw's colours
  orange: string // "Cor da dúvida": the notes over a flag, their bar and the question mark
  wallOpacity: number // "Opacidade das paredes": how opaque the closed blocks are drawn, whole percents
  corner: number // "Cantos em octógono": how much of each block's corners is cut, whole percents (100: a regular octagon)
  zones: MineZoneParams // "Blocos são zonas sonoras" (mine-zone-params.ts, mine-zones.ts)
  items: MineItemParams // "Spawn de itens" (mine-item-params.ts, mine-items.ts)
}
// the seesaw's turn: the angle the blue grows along (0: from the bottom up, 90: from the left to the right, as a CSS
// gradient's), one drawn for each block, or the wall the first note or shot lands on
export const MINE_TURNS = [0, 45, 90, 135, 180, 225, 270, 315] as const
export type MineTurn = (typeof MINE_TURNS)[number] | 'random' | 'first'
export const MINE_NOTES = { min: 4, max: 200, step: 1, default: 24 } as const
export const MINE_DAMAGE = { min: 0, max: 5000, step: 50, default: 600 } as const
export const MINE_FUSE = { min: 0, max: 60, step: 1, default: 10 } as const
export const MINE_START_BOMBS = { min: 0, max: 10, step: 1, default: 2 } as const
export const MINE_COLORS = { grey: '#8f98a3', blue: '#4d9bff', red: '#ff5a5a', orange: '#ffb366' } as const
export const MINE_CELL = { min: 120, max: 960, step: 8, default: 288 } as const
export const MINE_GAP = { min: 0, max: 200, step: 4, default: 32 } as const
export const MINE_BOMBS = { min: 0, max: 60, step: 1, default: 15 } as const
export const MINE_WALL_OPACITY = { min: 0, max: 100, step: 5, default: 100 } as const
export const MINE_CORNER = { min: 0, max: 100, step: 5, default: 0 } as const
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
const snap = (v: number, r: { min: number; max: number; step: number }) => clamp(Math.round(v / r.step) * r.step, r.min, r.max)
const color = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d)
const turnOf = (v: unknown): MineTurn => (v === 'random' || v === 'first' ? v : (MINE_TURNS as readonly unknown[]).includes(v) ? (v as MineTurn) : 0)

// the grid's settings as written in the code; the game's defaults are these with data/pigchicken/default-patio.json
// over them (its `mineGrid`, which the Grade de blocos' panel writes with "Salvar no game")
const codeMineGrid = (): MineGridParams => ({
  on: false, cell: MINE_CELL.default, gap: MINE_GAP.default, pass: true, bombs: MINE_BOMBS.default,
  blockNotes: false, toFlag: MINE_NOTES.default, toOpen: MINE_DAMAGE.default, insideBreaks: true, toDoubt: MINE_NOTES.default, turn: 0, fuse: MINE_FUSE.default, startBombs: MINE_START_BOMBS.default,
  ...MINE_COLORS, wallOpacity: MINE_WALL_OPACITY.default, corner: MINE_CORNER.default, zones: defaultMineZones(), items: defaultMineItems(),
})

// raw read over the defaults d (a field missing takes d's)
function readMineGrid(raw: unknown, d: MineGridParams): MineGridParams | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const p = raw as Record<string, unknown>
  const bool = (v: unknown, b: boolean) => (typeof v === 'boolean' ? v : b)
  return {
    on: p.on === true,
    cell: snap(num(p.cell, d.cell), MINE_CELL), gap: snap(num(p.gap, d.gap), MINE_GAP),
    pass: bool(p.pass, d.pass), bombs: snap(num(p.bombs, d.bombs), MINE_BOMBS),
    blockNotes: bool(p.blockNotes, d.blockNotes), toFlag: snap(num(p.toFlag, d.toFlag), MINE_NOTES), toOpen: snap(num(p.toOpen, d.toOpen), MINE_DAMAGE), insideBreaks: bool(p.insideBreaks, d.insideBreaks), toDoubt: snap(num(p.toDoubt, d.toDoubt), MINE_NOTES),
    turn: p.turn === undefined ? d.turn : turnOf(p.turn), fuse: snap(num(p.fuse, d.fuse), MINE_FUSE), startBombs: snap(num(p.startBombs, d.startBombs), MINE_START_BOMBS),
    grey: color(p.grey, d.grey), blue: color(p.blue, d.blue), red: color(p.red, d.red), orange: color(p.orange, d.orange),
    wallOpacity: snap(num(p.wallOpacity, d.wallOpacity), MINE_WALL_OPACITY), corner: snap(num(p.corner, d.corner), MINE_CORNER),
    zones: p.zones === undefined ? structuredClone(d.zones) : normalizeMineZones(p.zones),
    items: p.items === undefined ? structuredClone(d.items) : normalizeMineItems(p.items),
  }
}

// the game's defaults: what the panel shows for a Pátio that saved no grid (a new one too), and Reverter para o
// padrão. Always off: turning the grid on is each Pátio's
const GAME_MINE_GRID: MineGridParams = { ...(readMineGrid((DEFAULTS_FILE as { mineGrid?: unknown }).mineGrid, codeMineGrid()) ?? codeMineGrid()), on: false }
export const defaultMineGrid = (): MineGridParams => structuredClone(GAME_MINE_GRID)

// what a Pátio saved (nothing saved: no grid at all)
export const normalizeMineGrid = (raw: unknown): MineGridParams | undefined => readMineGrid(raw, GAME_MINE_GRID)

/** The defaults file's `mineGrid` (what "Salvar no game" writes): every setting of the panel but Ligar. */
export function mineGridDefaultsFile(grid: unknown): Omit<MineGridParams, 'on'> {
  const { on, ...rest } = normalizeMineGrid(grid) ?? defaultMineGrid()
  return rest
}
/** Reverter para o padrão (Grade de blocos): every setting back to the game's, the grid still on or off as it was. */
export const mineGridAtDefault = (grid: MineGridParams | undefined): MineGridParams => ({ ...defaultMineGrid(), on: !!grid?.on })
/** Whether these settings already are the game's (Ligar aside). */
export const mineGridIsDefault = (grid: MineGridParams | undefined) =>
  !grid || JSON.stringify(mineGridDefaultsFile(grid)) === JSON.stringify(mineGridDefaultsFile(GAME_MINE_GRID))

// ---------- geometry ----------

// column 0 is the leftmost one and row 0 stands on the ground; what the blocks leave over sideways is split between
// the two ends. cut: how far from each corner of a block its two sides are cut ("Cantos em octógono"; 0: a square)
export type MineGeo = { cols: number; rows: number; cell: number; gap: number; step: number; x0: number; ground: number; cut: number }
export type MineSpot = { c: number; r: number }
export type MineRect = { x: number; y: number; w: number; h: number }

// the grid keeps this far from the world's sides and from its ceiling. The world's limit walls stand a little inside
// it and keep a chicken's body off them: with a block closer than that, she would be pushed into it. Under the
// ceiling there is room to stand on the top row.
export const MINE_MARGIN = { side: 72, top: 120 } as const
// the cut that leaves the eight sides of a block the same length, as a share of its side
export const MINE_OCTAGON = 1 / (2 + Math.SQRT2)
// the engine skips a surface shorter than 4: a corner is cut by at least this much along each side, or not at all
export const MINE_CUT_MIN = 3
export function mineGeometry(p: Pick<MineGridParams, 'cell' | 'gap'> & { corner?: number }, world: { left?: number; width: number; top: number; ground: number }): MineGeo {
  const step = p.cell + p.gap
  const cols = Math.max(1, Math.floor((world.width + p.gap) / step)), rows = Math.max(1, Math.floor((world.ground - world.top + p.gap) / step))
  // (a cut too small to be a wall is none)
  const size = Math.round(p.cell * MINE_OCTAGON * clamp(p.corner ?? 0, 0, 100)) / 100, cut = size < MINE_CUT_MIN ? 0 : size
  return { cols, rows, cell: p.cell, gap: p.gap, step, x0: (world.left ?? 0) + (world.width - (cols * p.cell + (cols - 1) * p.gap)) / 2, ground: world.ground, cut }
}
export const mineIndex = (g: MineGeo, c: number, r: number) => r * g.cols + c
export const mineInside = (g: MineGeo, c: number, r: number) => c >= 0 && r >= 0 && c < g.cols && r < g.rows
export const mineCellRect = (g: MineGeo, c: number, r: number): MineRect => ({ x: g.x0 + c * g.step, y: g.ground - r * g.step - g.cell, w: g.cell, h: g.cell })

// ---------- cut corners ----------

// With "Cantos em octógono" every block loses its four corners, cut `g.cut` along each side: what is cut off is space
// between blocks, like the gap. The bottom row stands on the ground and keeps its two bottom corners.
export type MineCorner = 'tl' | 'tr' | 'bl' | 'br'
export const MINE_CORNERS: readonly MineCorner[] = ['tl', 'tr', 'bl', 'br']
export const mineCornerCut = (g: MineGeo, r: number, corner: MineCorner) => (r === 0 && corner[0] === 'b' ? 0 : g.cut)
// the outline of a block in its own box (clockwise from its top left), `inset` inside it: the block itself, or the
// room within its walls (a corner cut less than the walls are thick leaves the room square there)
export function mineOutline(g: MineGeo, r: number, inset = 0): [number, number][] {
  const s = g.cell, top = g.cut, bottom = mineCornerCut(g, r, 'bl'), a = inset, b = s - inset
  const corner = (k: number, one: [number, number], two: [number, number], square: [number, number]): [number, number][] => (k > inset ? [one, two] : [square])
  return [
    ...corner(top, [a, top], [top, a], [a, a]), ...corner(top, [s - top, a], [b, top], [b, a]),
    ...corner(bottom, [b, s - bottom], [s - bottom, b], [b, b]), ...corner(bottom, [bottom, b], [a, s - bottom], [a, b]),
  ]
}
// whether a point of a block's box is in the block (its edges count), `inset` inside it
export function mineBlockContains(g: MineGeo, c: number, r: number, x: number, y: number, inset = 0) {
  const b = mineCellRect(g, c, r), side = Math.min(x - b.x, b.x + b.w - x), up = y - b.y, down = b.y + b.h - y
  if (side < inset || up < inset || down < inset) return false
  return side + up >= g.cut + inset - 1e-9 && side + down >= mineCornerCut(g, r, 'bl') + inset - 1e-9
}

// the block a point is in (its edges count), or null in the space between blocks (a cut corner too) and outside the grid
export function mineCellAt(g: MineGeo, x: number, y: number): MineSpot | null {
  const c = Math.floor((x - g.x0) / g.step), r = Math.floor((g.ground - y) / g.step)
  if (!mineInside(g, c, r)) return null
  const b = mineCellRect(g, c, r)
  if (x > b.x + b.w || y < b.y) return null
  return g.cut <= 0 || mineBlockContains(g, c, r, x, y) ? { c, r } : null
}
// the block nearest to a point, whatever lies there (a portal's block: the one its centre is in or closest to)
export function mineNearestCell(g: MineGeo, x: number, y: number): MineSpot {
  return {
    c: clamp(Math.round((x - g.x0 - g.cell / 2) / g.step), 0, g.cols - 1),
    r: clamp(Math.round((g.ground - y - g.cell / 2) / g.step), 0, g.rows - 1),
  }
}
export function mineNeighbours(g: MineGeo, c: number, r: number, diagonal = true): MineSpot[] {
  const out: MineSpot[] = []
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if ((!dc && !dr) || (!diagonal && dc && dr) || !mineInside(g, c + dc, r + dr)) continue
    out.push({ c: c + dc, r: r + dr })
  }
  return out
}

// ---------- state ----------

// free ("Bloco liberado", the block of a portal that has it on): open from the start, never with a bomb, never
// closed again
// The rest is the round's (lib/pigchicken/mine-round.ts). gauge: the seesaw, from -1 (all red, damage) through 0
// (grey) to 1 (all blue, music); flag: the blue filled up and the flag is up (hold: s the notes still do not count
// after it went up); yellow: 0..1, the notes over a flag, toward the doubt; doubt: the question mark took the flag's
// place; armed: its bomb is armed (false: disarmed); fuse: s left of the detonator (null: not pressed); crater: a
// bomb went off here; turn: the angle its blue grows along (null: the first note or shot decides); by: who gave the
// last note and the last shot, and who installed or detonated its bomb
export type MineCell = {
  open: boolean; bomb: boolean; free: boolean
  gauge: number; flag: boolean; hold: number; yellow: number; doubt: boolean; armed: boolean; fuse: number | null; crater: boolean; turn: number | null
  by: { note?: string; shot?: string; bomb?: string }
}
export type MineGrid = { geo: MineGeo; cells: MineCell[]; seed: number }
export const mineBlankCell = (o: { open: boolean; bomb: boolean; free: boolean; turn: number | null }): MineCell =>
  ({ ...o, gauge: 0, flag: false, hold: 0, yellow: 0, doubt: false, armed: o.bomb, fuse: null, crater: false, by: {} })

// a small seeded generator (mulberry32): the same seed draws the same bombs in every browser
export function mineRandom(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// a new round: every block closed, each one with `bombs`% of chance of hiding a bomb; the free ones open and clean
export function createMineGrid(geo: MineGeo, o: { bombs: number; seed: number; free?: MineSpot[]; turn?: MineTurn }): MineGrid {
  const rnd = mineRandom(o.seed), chance = clamp(o.bombs, 0, 100) / 100
  const cells: MineCell[] = Array.from({ length: geo.cols * geo.rows }, () => mineBlankCell({ open: false, bomb: rnd() < chance, free: false, turn: null }))
  // the turns come from a second draw, so that the bombs of a seed do not depend on the turn chosen
  const spin = mineRandom(o.seed ^ 0x5bd1e995), turn = o.turn ?? 0
  for (const cell of cells) cell.turn = turn === 'first' ? null : turn === 'random' ? MINE_TURNS[Math.floor(spin() * MINE_TURNS.length)] : turn
  for (const f of o.free ?? []) {
    if (!mineInside(geo, f.c, f.r)) continue
    cells[mineIndex(geo, f.c, f.r)] = mineBlankCell({ open: true, bomb: false, free: true, turn: 0 })
  }
  return { geo, cells, seed: o.seed }
}
export const mineCell = (grid: MineGrid, c: number, r: number): MineCell | null => (mineInside(grid.geo, c, r) ? grid.cells[mineIndex(grid.geo, c, r)] : null)
// the number an open block shows: the bombs its 8 neighbours hide
export const bombsAround = (grid: MineGrid, c: number, r: number) => mineNeighbours(grid.geo, c, r).filter(n => mineCell(grid, n.c, n.r)!.bomb).length

// ---------- sides ----------

export type MineSide = 'open' | 'closed'
// the side of whoever is at (x, y), worked out from where they are every time, whatever way they got there: in a
// block, its state; within the thickness of a closed block's walls (where nobody fits, but a point beside a wall can
// fall) they keep the side they had. Out of the blocks (the gap, a cut corner, outside the grid) it is the open side,
// unless every block around that spot is closed: only there (between two closed blocks, where Trocar de bloco leaves
// her, or where four of them meet) they keep the side they had. Outside the grid counts as open.
export function mineSideAt(grid: MineGrid, x: number, y: number, last: MineSide): MineSide {
  const g = grid.geo, at = mineCellAt(g, x, y)
  if (at) {
    if (grid.cells[mineIndex(g, at.c, at.r)].open) return 'open'
    return mineBlockContains(g, at.c, at.r, x, y, mineWallThickness(g)) ? 'closed' : last
  }
  return mineBlocksAround(g, x, y).every(s => mineCell(grid, s.c, s.r)?.open === false) ? last : 'open'
}
// mineSideAt with what she did to get there: `crossed`, she came into the gap she is in with Trocar de bloco. Out of
// a closed room the only way into the gap between closed blocks is Trocar de bloco (the engine's crossings), so with
// a gap, a body that turns up there from the closed side any other way (through a wall, a collider that crosses the
// grid, a bug) has gone out of the rooms: the open side. Without a gap the closed blocks share their space (the
// diamond between four of them is inside too), and nothing changes.
export type MineSideState = { side: MineSide; crossed: boolean }
export function mineSideNext(grid: MineGrid, x: number, y: number, last: MineSideState, crossedNow: boolean): MineSideState {
  const side = mineSideAt(grid, x, y, last.side), g = grid.geo
  // a definite side (in a block's room, an open block, outside the grid) clears the mark
  if (side !== last.side || mineSideAt(grid, x, y, side === 'open' ? 'closed' : 'open') === side) return { side, crossed: false }
  const crossed = last.crossed || crossedNow
  // within the thickness of a block's walls she keeps it all; in the gap, only after Trocar de bloco
  if (side === 'closed' && g.gap > 0 && !crossed && !mineCellAt(g, x, y)) return { side: 'open', crossed: false }
  return { side, crossed }
}
// the blocks around a point out of the blocks (some may be outside the grid): the two beside a stretch of the gap,
// the four where two stretches cross, and the block of a cut corner with the three around that corner
export function mineBlocksAround(g: MineGeo, x: number, y: number): MineSpot[] {
  const u = x - g.x0, v = g.ground - y, c = Math.floor(u / g.step), r = Math.floor(v / g.step)
  const inCol = u - c * g.step <= g.cell, inRow = v - r * g.step <= g.cell
  // in a block's box but not in the block: one of its cut corners
  const cols = inCol ? (inRow ? (u - c * g.step < g.cell / 2 ? [c - 1, c] : [c, c + 1]) : [c]) : [c, c + 1]
  const rows = inRow ? (inCol ? (v - r * g.step < g.cell / 2 ? [r - 1, r] : [r, r + 1]) : [r]) : [r, r + 1]
  return cols.flatMap(cc => rows.map(rr => ({ c: cc, r: rr })))
}
// a point of a block brought inside its room, `inset` from its edges (someone a block closed around)
export function mineRoomClamp(g: MineGeo, c: number, r: number, x: number, y: number, inset: number) {
  const b = mineCellRect(g, c, r)
  let px = clamp(x, b.x + inset, b.x + b.w - inset), py = clamp(y, b.y + inset, b.y + b.h - inset)
  for (const corner of MINE_CORNERS) {
    const k = mineCornerCut(g, r, corner) + inset, sx = corner[1] === 'l' ? 1 : -1, sy = corner[0] === 't' ? 1 : -1
    const lack = k - ((px - (sx > 0 ? b.x : b.x + b.w)) * sx + (py - (sy > 0 ? b.y : b.y + b.h)) * sy)
    if (lack > 0) { px += (sx * lack) / 2; py += (sy * lack) / 2 }
  }
  return { x: px, y: py }
}

// ---------- walls ----------

// the walls of the closed blocks, as boxes along their edges (inside the block). With a gap every closed block is a
// room with its four walls; without one two closed neighbours share their space, so a wall stands only where a
// closed block meets an open one or the end of the grid (the ground under the bottom row needs none). There, where
// the frontier turns a corner around a closed block (three closed blocks and an open one), the upright wall goes on
// by its own thickness to meet the flat one: the two belong to different blocks and would only touch at a point.
// The walls of one block overlap at its corners; `group` names the block, for the engine to read them as one solid
// (`data-chicken-fused`).
// `cross`: this wall has another room behind it (with a gap, the closed neighbour on that side), and switching sides
// on it leads there: how far its inner face is from the inner face of that room's wall. A cut corner's slanted wall
// leads to the closed block on that diagonal (with a gap, and when the cut is deeper than the walls are thick, so
// that both rooms have a slanted floor or ceiling there); `skip`: how near behind it nothing counts, so that she goes
// past its own outer face (the diamond between four blocks has no plug) straight to that room.
// With cut corners ("Cantos em octógono") the four walls stop at the cuts and each cut corner gets its own piece,
// `shape`: an outline in the piece's box, with the slanted wall's two faces (the outer one from cut to cut, the
// inner one between the ends of the two walls' inner faces) and what joins it to the walls beside it. Where the
// frontier only turns round the block (without a gap, the blocks beside it closed), the piece goes on to the
// block's edge instead, where the next block's piece takes over. The engine reads a piece as part of the block's
// solid (`data-chicken-join`).
export type MineWall = MineRect & { id: string; group: string; c: number; r: number; edge: 'top' | 'bottom' | 'left' | 'right' | MineCorner; cross?: number; skip?: number; shape?: [number, number][] }
// never under 8: the chicken's engine skips a collider thinner than that
export const mineWallThickness = (g: MineGeo) => clamp(Math.round(g.cell / 24), 8, 16)

// a piece's outline, given from a block's corner (x along its flat side, y along its upright one), in the world and
// then in its own box (never under 8 wide or tall: the engine skips a smaller collider)
function cornerPiece(b: MineRect, corner: MineCorner, local: [number, number][]) {
  const pts = local.map(([x, y]) => [corner[1] === 'l' ? b.x + x : b.x + b.w - x, corner[0] === 't' ? b.y + y : b.y + b.h - y])
  const size = Math.max(8, ...local.flat())
  const x = corner[1] === 'l' ? b.x : b.x + b.w - size, y = corner[0] === 't' ? b.y : b.y + b.h - size
  return { x, y, w: size, h: size, shape: pts.map(([px, py]) => [px - x, py - y] as [number, number]) }
}
// the slanted wall of a cut corner: `flat` and `upright` say whether the block's wall on that side is there. The
// piece goes 2 into each wall it meets, so that its ends are inside them.
function cornerWall(k: number, t: number, flat: boolean, upright: boolean): [number, number][] {
  if (flat && upright && k <= t) return [[k, 0], [k + 2, 0], [k + 2, k + 2], [0, k + 2], [0, k]]
  return [[k, 0], ...(flat ? [[k + 2, 0], [k + 2, t], [k, t]] : [[k + t, 0]]), ...(upright ? [[t, k], [t, k + 2], [0, k + 2]] : [[0, k + t]]), [0, k]] as [number, number][]
}

export function mineWalls(grid: MineGrid, only?: (c: number, r: number) => boolean): MineWall[] {
  const g = grid.geo, t = mineWallThickness(g), out: MineWall[] = []
  const closed = (c: number, r: number) => { const cell = mineCell(grid, c, r); return !!cell && !cell.open }
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    if (!closed(c, r) || (only && !only(c, r))) continue
    const b = mineCellRect(g, c, r), room = g.gap > 0, k = g.cut, low = mineCornerCut(g, r, 'bl')
    const add = (edge: MineWall['edge'], next: boolean, x: number, y: number, w: number, h: number) =>
      out.push({ id: `mine-${c}-${r}-${edge}`, group: `mine-${c}-${r}`, c, r, edge, x, y, w, h, ...(room && next ? { cross: g.gap + t * 2 } : {}) })
    const top = room || !closed(c, r + 1), bottom = room || (r > 0 && !closed(c, r - 1))
    if (top) add('top', closed(c, r + 1), b.x + k, b.y, b.w - k * 2, t)
    if (bottom) add('bottom', closed(c, r - 1), b.x + low, b.y + b.h - t, b.w - low * 2, t)
    for (const [edge, dc] of [['left', -1], ['right', 1]] as const) {
      const side = room || !closed(c + dc, r)
      if (side) {
        // without a gap and without cuts: up or down past the block's corner when the frontier turns there
        const up = !room && !k && closed(c, r + 1) && closed(c + dc, r + 1) ? t : 0, down = !room && !k && closed(c, r - 1) && closed(c + dc, r - 1) ? t : 0
        add(edge, closed(c + dc, r), dc < 0 ? b.x : b.x + b.w - t, b.y + k - up, t, b.h - k - low + up + down)
      }
      // the cut corners on this side: wherever the block has something other than a closed block around that corner
      for (const [corner, dr, flat] of [[`t${edge[0]}`, 1, top], [`b${edge[0]}`, -1, bottom]] as [MineCorner, number, boolean][]) {
        const cut = mineCornerCut(g, r, corner)
        if (!cut || !(room || !closed(c + dc, r) || !closed(c, r + dr) || !closed(c + dc, r + dr))) continue
        const diagonal = room && cut > t && closed(c + dc, r + dr) ? { cross: Math.SQRT2 * (g.gap + cut + t), skip: t } : {}
        out.push({ id: `mine-${c}-${r}-${corner}`, group: `mine-${c}-${r}`, c, r, edge: corner, ...cornerPiece(b, corner, cornerWall(cut, t, flat, side)), ...diagonal })
      }
    }
  }
  return out
}

// ---------- the gap between two rooms ----------

// With a gap, the space between two closed blocks is a passage as wide as the gap. A body that does not fit in it
// must not get in (the engine sees the chicken as a point on a floor, so she would walk on a room's roof under the
// next room's floor): each such stretch gets a plug, a solid box only for the bodies bigger than `fit`. `shaft`
// stands between two closed blocks side by side, `corridor` between one and the one above it, `cross` where four
// closed blocks meet. A gap beside an open block or the end of the grid stays free: there is room next to it.
// With cut corners ("Cantos em octógono") a plug stands only where the passage is as narrow as the gap, between the
// two blocks' straight sides: what the cuts leave open (the valley over a shaft, the wedge beside a corridor, the
// diamond where four blocks meet) is space for every body, as drawn, and the slanted walls are what bounds it.
export type MinePlug = MineRect & { id: string; group: string; c: number; r: number; kind: 'shaft' | 'corridor' | 'cross'; fit: number }

export function minePlugs(grid: MineGrid, only?: (c: number, r: number) => boolean): MinePlug[] {
  const g = grid.geo, out: MinePlug[] = []
  if (g.gap <= 0) return out
  const closed = (c: number, r: number) => { const cell = mineCell(grid, c, r); return !!cell && !cell.open }
  // a gap narrower than the thinnest collider the engine reads grows into the walls beside it
  const pad = Math.max(0, (8 - g.gap) / 2), k = g.cut
  for (let r = 0; r < g.rows; r++) for (let c = 0; c < g.cols; c++) {
    if (!closed(c, r) || (only && !only(c, r))) continue
    const b = mineCellRect(g, c, r), right = closed(c + 1, r), up = closed(c, r + 1), low = mineCornerCut(g, r, 'bl')
    const add = (kind: MinePlug['kind'], x: number, y: number, w: number, h: number) => out.push({ id: `mine-${c}-${r}-${kind}`, group: `mine-${c}-${r}-${kind}`, c, r, kind, fit: g.gap, x, y, w, h })
    if (right) add('shaft', b.x + b.w - pad, b.y + k, g.gap + pad * 2, b.h - k - low)
    if (up) add('corridor', b.x + k, b.y - g.gap - pad, b.w - k * 2, g.gap + pad * 2)
    if (!k && right && up && closed(c + 1, r + 1)) add('cross', b.x + b.w - pad, b.y - g.gap - pad, g.gap + pad * 2, g.gap + pad * 2)
  }
  return out
}
