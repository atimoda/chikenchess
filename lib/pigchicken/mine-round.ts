// The round of the Grade de blocos (lib/pigchicken/mine-grid.ts): what notes, shots, shocks, bombs and the detonator
// do to the blocks, and what each player did. Pure: every function changes the round it gets and returns what
// happened, for the screen to show, to sound and to kill (the state lives in mine-grid-store.ts).
//
// A closed block's background is a seesaw that starts grey. Notes from the open side push it to the blue, shots to
// the red, and one undoes the other. All blue: the flag goes up and no shot hurts the block. Notes over a flag fill
// the yellow, and all yellow turns the flag into a doubt, which shots hurt again. All red sets the block free: with
// no armed bomb it opens, with one it blows up.
import { MINE_CORNERS, mineBlankCell, mineCell, mineCellAt, mineCellRect, mineCornerCut, mineIndex, mineNeighbours, type MineCorner, type MineGrid, type MineGridParams, type MineSide, type MineSpot } from './mine-grid'

// insideBreaks may be left out by whoever has no say on it (it counts as on)
export type MineRules = Pick<MineGridParams, 'toFlag' | 'toOpen' | 'toDoubt' | 'fuse' | 'turn'> & Partial<Pick<MineGridParams, 'insideBreaks'>>
// what each player did in the round. music: notes that counted (blue or yellow); damage: damage that counted (red);
// solved: doubts taken away, by the flag again or by opening the block; kills: deaths by the bombs they installed or
// detonated; deaths: times they became a Filhote
export type MineStats = { music: number; damage: number; opened: number; flags: number; flagsOnBomb: number; doubts: number; solved: number; disarmed: number; installed: number; kills: number; deaths: number }
export type MineRound = { grid: MineGrid; stats: Record<string, MineStats>; over: boolean }
export const mineRound = (grid: MineGrid): MineRound => ({ grid, stats: {}, over: false })
const blankStats = (): MineStats => ({ music: 0, damage: 0, opened: 0, flags: 0, flagsOnBomb: 0, doubts: 0, solved: 0, disarmed: 0, installed: 0, kills: 0, deaths: 0 })
const stat = (round: MineRound, who: string) => (round.stats[who] ??= blankStats())

// the wall of a block: one of its four sides or, with cut corners, the slanted one of a corner
export type MineFace = 'top' | 'bottom' | 'left' | 'right' | MineCorner
// by: who did it (the last note or shot); owner: who installed or detonated the bomb that went off
export type MineEvent =
  | { kind: 'flag'; c: number; r: number; by: string; bomb: boolean } // bomb: there really is one under it
  | { kind: 'doubt'; c: number; r: number; by: string }
  | { kind: 'open'; c: number; r: number; by: string; lost: boolean } // lost: a disarmed bomb went with it
  // contained: the flag was up again in time, the walls held and the block stays closed; cells: where it kills
  | { kind: 'boom'; c: number; r: number; by?: string; owner?: string; contained: boolean; cells: MineSpot[] }
  | { kind: 'shock'; c: number; r: number }
  | { kind: 'disarm' | 'arm' | 'take' | 'install' | 'detonator'; c: number; r: number; by: string }
  | { kind: 'end' }

// s the notes do not count after a flag goes up: what is left of the burst that raised it must not start the doubt
export const MINE_FLAG_HOLD = 1.5
// the angle the blue grows along when it starts at this wall
const FACE_TURN: Record<MineFace, number> = { bottom: 0, bl: 45, left: 90, tl: 135, top: 180, tr: 225, right: 270, br: 315 }

// ---------- what a note or a shot meets ----------

// a note or a shot going from (px, py) to (x, y) through the wall of a closed block, in or out: the block, the wall
// (face) and whether it bounces sideways. Without a gap two closed blocks share their space: no wall between them.
// With cut corners the wall can be a corner's slanted one: the one the way from the point outside to the point
// inside goes through.
export function mineWallHit(grid: MineGrid, px: number, py: number, x: number, y: number): { c: number; r: number; face: MineFace; flipX: boolean; inward: boolean } | null {
  const g = grid.geo
  const closedAt = (qx: number, qy: number) => { const s = mineCellAt(g, qx, qy); return s && !grid.cells[mineIndex(g, s.c, s.r)].open ? s : null }
  const a = closedAt(px, py), b = closedAt(x, y)
  if (!a && !b) return null
  if (a && b && ((a.c === b.c && a.r === b.r) || g.gap <= 0)) return null
  const hit = b ?? a!, inward = !!b
  const o = inward ? { x: px, y: py } : { x, y } // the point outside the block
  const k = mineCellRect(g, hit.c, hit.r), l = k.x, r = k.x + k.w, t = k.y, bt = k.y + k.h
  const side = o.x < l || o.x > r, top = o.y < t || o.y > bt
  const flipX = side && (!top || Math.abs(o.x - (o.x < l ? l : r)) <= Math.abs(o.y - (o.y < t ? t : bt)))
  const i = inward ? { x, y } : { x: px, y: py } // the point inside it
  for (const corner of MINE_CORNERS) {
    const cut = mineCornerCut(g, hit.r, corner)
    if (!cut) continue
    // from the corner, along the block's two sides: the slanted wall is where the two add up to the cut
    const at = (q: { x: number; y: number }) => (corner[1] === 'l' ? q.x - l : r - q.x) + (corner[0] === 't' ? q.y - t : bt - q.y)
    const out = at(o), within = at(i)
    if (out >= cut || within < cut) continue
    // where the way crosses that line: on the slanted wall when it is between the block's two sides there
    const f = (cut - out) / (within - out), mx = o.x + (i.x - o.x) * f, my = o.y + (i.y - o.y) * f
    if (mx >= l - 1e-6 && mx <= r + 1e-6 && my >= t - 1e-6 && my <= bt + 1e-6) return { c: hit.c, r: hit.r, flipX: Math.abs(i.x - o.x) >= Math.abs(i.y - o.y), inward, face: corner }
  }
  return { c: hit.c, r: hit.r, flipX, inward, face: flipX ? (o.x < l ? 'left' : 'right') : o.y < t ? 'top' : 'bottom' }
}

// the closed blocks a Golpe reaches, each once: the ones whose wall a line from (x, y) to the end of its reach
// crosses, in or out, along the middle, the ends and the quarters of its arc
export function mineBlowHits(grid: MineGrid, x: number, y: number, angle: number, arc: number, reach: number): { c: number; r: number; face: MineFace }[] {
  const out: { c: number; r: number; face: MineFace }[] = [], wide = Math.min(Math.abs(arc), Math.PI * 2)
  for (const part of [0, -0.25, 0.25, -0.5, 0.5]) {
    const a = angle + wide * part, hit = mineWallHit(grid, x, y, x + Math.cos(a) * reach, y + Math.sin(a) * reach)
    if (hit && !out.some(o => o.c === hit.c && o.r === hit.r)) out.push({ c: hit.c, r: hit.r, face: hit.face })
  }
  return out
}
// what an instrument's Golpe is worth in notes: the same share of the seesaw its damage would take as a shot
export const mineBlowNotes = (rules: Pick<MineRules, 'toFlag' | 'toOpen'>, damage: number) =>
  Math.max(1, Math.min(64, Math.round(rules.toOpen > 0 ? (damage / rules.toOpen) * rules.toFlag : 1)))

// the closed blocks a blast of radius `rad` at (x, y) reaches, each with how much of it (1 at the centre, 0 at the rim)
export function mineBlastCells(grid: MineGrid, x: number, y: number, rad: number): (MineSpot & { part: number })[] {
  const g = grid.geo, out: (MineSpot & { part: number })[] = []
  if (rad <= 0) return out
  const c0 = Math.floor((x - rad - g.x0) / g.step), c1 = Math.floor((x + rad - g.x0) / g.step), r0 = Math.floor((g.ground - y - rad) / g.step), r1 = Math.floor((g.ground - y + rad) / g.step)
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const cell = mineCell(grid, c, r)
    if (!cell || cell.open) continue
    const k = mineCellRect(g, c, r), d = Math.hypot(Math.max(k.x, Math.min(x, k.x + k.w)) - x, Math.max(k.y, Math.min(y, k.y + k.h)) - y)
    if (d < rad) out.push({ c, r, part: 1 - d / rad })
  }
  return out
}

// ---------- the seesaw ----------

// with "Primeiro tiro determina o lado", the wall the first note or shot lands on is where its colour starts; back
// at grey (or through it), the next one decides again
function turnFor(cell: { gauge: number; turn: number | null }, rules: MineRules, next: number, blueFrom: number | null) {
  if (cell.turn === null || (rules.turn === 'first' && (cell.gauge === 0 || Math.sign(cell.gauge) !== Math.sign(next)))) cell.turn = blueFrom ?? (cell.turn ?? 0)
}

function end(round: MineRound): MineEvent[] {
  if (round.over || !mineRoundOver(round.grid)) return []
  round.over = true
  return [{ kind: 'end' }]
}
// the round ends when no closed block without a bomb is left
export const mineRoundOver = (grid: MineGrid) => grid.cells.every(k => k.open || k.bomb)

// the bomb of a block goes off. Contained (the flag was up again when the detonator ran out): the walls hold, the
// block stays closed with its flag and only whoever is in it dies. Else it becomes a crater and whoever is in it and
// in its open neighbours dies; the closed neighbours, the inside, are spared.
function explode(round: MineRound, at: MineSpot, by: string | undefined, contained: boolean): MineEvent[] {
  const grid = round.grid, cell = mineCell(grid, at.c, at.r)!, owner = cell.by.bomb
  if (contained) {
    cell.bomb = false; cell.armed = false; cell.fuse = null
    return [{ kind: 'boom', c: at.c, r: at.r, by, owner, contained, cells: [{ c: at.c, r: at.r }] }, ...end(round)]
  }
  const cells = [{ c: at.c, r: at.r }, ...mineNeighbours(grid.geo, at.c, at.r).filter(n => mineCell(grid, n.c, n.r)!.open)]
  Object.assign(cell, mineBlankCell({ open: true, bomb: false, free: false, turn: 0 }), { crater: true })
  return [{ kind: 'boom', c: at.c, r: at.r, by, owner, contained, cells }, ...end(round)]
}

// a note on the wall of a closed block. Only the open side's notes count: the flag is its guess, and the closed side
// should not protect its own blocks. face: the wall it landed on.
export function mineNote(round: MineRound, rules: MineRules, at: MineSpot, side: MineSide, by: string, face?: MineFace): MineEvent[] {
  const cell = mineCell(round.grid, at.c, at.r)
  if (!cell || cell.open || side !== 'open') return []
  const st = stat(round, by)
  if (cell.flag) {
    if (cell.hold > 0) return []
    cell.by.note = by
    cell.yellow = Math.min(1, cell.yellow + 1 / rules.toDoubt); st.music++
    if (cell.yellow < 1 - 1e-9) return []
    cell.flag = false; cell.doubt = true; cell.yellow = 0; cell.gauge = 0
    if (rules.turn === 'first') cell.turn = null
    st.doubts++
    return [{ kind: 'doubt', c: at.c, r: at.r, by }]
  }
  cell.by.note = by
  const next = Math.min(1, cell.gauge + 1 / rules.toFlag)
  turnFor(cell, rules, next, face ? FACE_TURN[face] : null)
  cell.gauge = next; st.music++
  if (next < 1 - 1e-9) return []
  cell.gauge = 1
  if (cell.doubt) st.solved++
  cell.flag = true; cell.doubt = false; cell.yellow = 0; cell.hold = MINE_FLAG_HOLD
  st.flags++
  if (cell.bomb) st.flagsOnBomb++
  return [{ kind: 'flag', c: at.c, r: at.r, by, bomb: cell.bomb }]
}

// a firearm's damage on a closed block, from either side. A block with a flag takes none; in doubt it does again.
// side: the side of whoever did it; with "Lado de dentro quebra paredes" off, the closed side's does nothing (a
// shot with no side, from a browser that does not say it, counts).
export function mineShot(round: MineRound, rules: MineRules, at: MineSpot, damage: number, by: string, face?: MineFace, side?: MineSide): MineEvent[] {
  const cell = mineCell(round.grid, at.c, at.r)
  if (!cell || cell.open || cell.flag || rules.toOpen <= 0 || !(damage > 0)) return []
  if (side === 'closed' && rules.insideBreaks === false) return []
  const st = stat(round, by)
  cell.by.shot = by
  const next = Math.max(-1, cell.gauge - damage / rules.toOpen)
  turnFor(cell, rules, next, face ? (FACE_TURN[face] + 180) % 360 : null)
  st.damage += Math.round((cell.gauge - next) * rules.toOpen)
  cell.gauge = next
  if (next > -1 + 1e-9) return []
  if (cell.doubt) st.solved++
  if (cell.bomb && cell.armed) return explode(round, at, by, false)
  const lost = cell.bomb
  Object.assign(cell, mineBlankCell({ open: true, bomb: false, free: false, turn: 0 }))
  st.opened++
  return [{ kind: 'open', c: at.c, r: at.r, by, lost }, ...end(round)]
}

// the shock of a lightning weapon: the block's music and damage go back to grey. A flag holds its blue.
export function mineShock(round: MineRound, rules: MineRules, at: MineSpot): MineEvent[] {
  const cell = mineCell(round.grid, at.c, at.r)
  if (!cell || cell.open || cell.flag || cell.gauge === 0) return []
  cell.gauge = 0
  if (rules.turn === 'first') cell.turn = null
  return [{ kind: 'shock', c: at.c, r: at.r }]
}

// time passes: the notes count again a moment after a flag went up, and the detonators run out
export function mineTick(round: MineRound, dt: number): MineEvent[] {
  const g = round.grid.geo, out: MineEvent[] = []
  round.grid.cells.forEach((cell, i) => {
    if (cell.hold > 0) cell.hold = Math.max(0, cell.hold - dt)
    if (cell.fuse === null) return
    cell.fuse -= dt
    if (cell.fuse > 0) return
    out.push(...explode(round, { c: i % g.cols, r: Math.floor(i / g.cols) }, cell.by.bomb, cell.flag))
  })
  return out
}

// ---------- the bomb, for whoever is inside its block ----------

// what Usar does to the bomb of a closed block, for someone on the closed side in it. With a Chave dourada an armed
// bomb is disarmed (which also stops its detonator); without one, in a block in doubt, the detonator is pressed. A
// disarmed bomb is taken to the inventory, or armed again while crouching.
export type MineBombUse = 'disarm' | 'detonator' | 'take' | 'arm'
export function mineBombUse(grid: MineGrid, at: MineSpot, o: { key: boolean; crouch: boolean }): MineBombUse | null {
  const cell = mineCell(grid, at.c, at.r)
  if (!cell || cell.open || !cell.bomb) return null
  if (!cell.armed) return o.crouch ? 'arm' : 'take'
  if (o.key) return 'disarm'
  return cell.doubt && cell.fuse === null ? 'detonator' : null
}
export function mineUseBomb(round: MineRound, rules: MineRules, at: MineSpot, use: MineBombUse, by: string): MineEvent[] {
  const cell = mineCell(round.grid, at.c, at.r)
  if (!cell || cell.open || !cell.bomb) return []
  const ev = (kind: MineBombUse): MineEvent => ({ kind, c: at.c, r: at.r, by })
  if (use === 'disarm' && cell.armed) { cell.armed = false; cell.fuse = null; stat(round, by).disarmed++; return [ev('disarm')] }
  if (use === 'arm' && !cell.armed) { cell.armed = true; cell.by.bomb = by; return [ev('arm')] }
  if (use === 'detonator' && cell.armed && cell.doubt && cell.fuse === null) { cell.fuse = rules.fuse; cell.by.bomb = by; return [ev('detonator')] }
  // out of its block, the disarmed bomb leaves it open, with no explosion
  if (use === 'take' && !cell.armed) {
    Object.assign(cell, mineBlankCell({ open: true, bomb: false, free: false, turn: 0 }))
    return [ev('take'), ...end(round)]
  }
  return []
}

// the open block a bomb from the inventory would go in, for someone at (x, y): the nearest one within `reach` that is
// on the frontier (it touches a closed block by a side) and is not a portal's free block
export function mineInstallSpot(grid: MineGrid, x: number, y: number, reach: number): MineSpot | null {
  const g = grid.geo
  let best: MineSpot | null = null, bestD = reach
  const c0 = Math.floor((x - reach - g.x0) / g.step), c1 = Math.floor((x + reach - g.x0) / g.step), r0 = Math.floor((g.ground - y - reach) / g.step), r1 = Math.floor((g.ground - y + reach) / g.step)
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const cell = mineCell(grid, c, r)
    if (!cell || !cell.open || cell.free) continue
    if (!mineNeighbours(g, c, r, false).some(n => !mineCell(grid, n.c, n.r)!.open)) continue
    const k = mineCellRect(g, c, r), d = Math.hypot(Math.max(k.x, Math.min(x, k.x + k.w)) - x, Math.max(k.y, Math.min(y, k.y + k.h)) - y)
    if (d <= bestD) { best = { c, r }; bestD = d }
  }
  return best
}
// a bomb from the inventory goes into an open block: it closes again, armed, and whoever is in it is now inside
export function mineInstall(round: MineRound, at: MineSpot, by: string, turn: number | null = 0): MineEvent[] {
  const cell = mineCell(round.grid, at.c, at.r)
  if (!cell || !cell.open || cell.free) return []
  Object.assign(cell, mineBlankCell({ open: false, bomb: true, free: false, turn }), { by: { bomb: by } })
  stat(round, by).installed++
  return [{ kind: 'install', c: at.c, r: at.r, by }]
}

// someone died in a blast: one more time as a Filhote, and one more death for the bomb's owner
export function mineKilled(round: MineRound, victim: string, owner?: string) {
  stat(round, victim).deaths++
  if (owner && owner !== victim) stat(round, owner).kills++
}

// ---------- one thing done to the round, as data ----------

// What the players do to the round, one thing at a time. In the online Pátio these travel to the lobby's owner, the
// only browser that changes the round (lib/pigchicken/net-mine.ts). note: `n` notes at once; dead: someone died in a
// blast (owner: whose bomb it was).
export type MineAct =
  | { k: 'note'; c: number; r: number; side: MineSide; by: string; face?: MineFace; n?: number }
  | { k: 'shot'; c: number; r: number; d: number; by: string; face?: MineFace; side?: MineSide }
  | { k: 'shock'; c: number; r: number }
  | { k: 'use'; c: number; r: number; use: MineBombUse; by: string }
  | { k: 'install'; c: number; r: number; by: string; turn: number | null }
  | { k: 'dead'; who: string; owner?: string }
export function mineDo(round: MineRound, rules: MineRules, a: MineAct): MineEvent[] {
  switch (a.k) {
    case 'note': {
      const out: MineEvent[] = []
      for (let i = 0; i < (a.n ?? 1); i++) out.push(...mineNote(round, rules, a, a.side, a.by, a.face))
      return out
    }
    case 'shot': return mineShot(round, rules, a, a.d, a.by, a.face, a.side)
    case 'shock': return mineShock(round, rules, a)
    case 'use': return mineUseBomb(round, rules, a, a.use, a.by)
    case 'install': return mineInstall(round, a, a.by, a.turn)
    case 'dead': mineKilled(round, a.who, a.owner); return []
  }
}

// ---------- the end of the round ----------

// the round's titles: the most blocks opened, flags over a bomb, bombs disarmed and deaths by their bombs. A tie
// gives it to all of them; nobody gets one for nothing.
export const MINE_TITLES = [
  { id: 'explorer', name: 'Desbravador', of: 'opened' },
  { id: 'guardian', name: 'Guardião', of: 'flagsOnBomb' },
  { id: 'sapper', name: 'Sapador', of: 'disarmed' },
  { id: 'miner', name: 'Minador', of: 'kills' },
] as const
export type MineTitleId = (typeof MINE_TITLES)[number]['id']
export function mineTitles(stats: Record<string, MineStats>): Record<MineTitleId, string[]> {
  const out = { explorer: [], guardian: [], sapper: [], miner: [] } as Record<MineTitleId, string[]>
  for (const t of MINE_TITLES) {
    const best = Math.max(0, ...Object.values(stats).map(s => s[t.of]))
    if (best > 0) out[t.id] = Object.keys(stats).filter(who => stats[who][t.of] === best)
  }
  return out
}
