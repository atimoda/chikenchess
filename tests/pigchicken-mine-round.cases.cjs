const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const M = loadTs('lib/pigchicken/mine-grid.ts')
const R = loadTs('lib/pigchicken/mine-round.ts')

// 5 x 4 blocks of 100 with a gap of 20, column 0 at x = 0 and row 0 on the ground at y = 1000
const geo = (gap = 20) => M.mineGeometry({ cell: 100, gap }, { width: 5 * 100 + 4 * gap, top: 1000 - (4 * 100 + 3 * gap), ground: 1000 })
const rules = { toFlag: 4, toOpen: 100, toDoubt: 4, fuse: 10, turn: 0 }
// no bombs but the ones named; (0, 0) is the portal's free block
function round(bombs = [], o = {}) {
  const grid = M.createMineGrid(geo(o.gap), { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }], turn: o.turn })
  for (const [c, r] of bombs) Object.assign(M.mineCell(grid, c, r), { bomb: true, armed: true })
  return R.mineRound(grid)
}
const cell = (rd, c, r) => M.mineCell(rd.grid, c, r)
const notes = (rd, c, r, n, side = 'open', by = 'a', face) => { let ev = []; for (let i = 0; i < n; i++) ev = R.mineNote(rd, rules, { c, r }, side, by, face); return ev }
const kinds = ev => ev.map(e => e.kind)

test('a note or a shot meets the wall of a closed block going in or out, never between two closed blocks without a gap', () => {
  const rd = round()
  // from the free block (0,0) into (1,0), through its left wall
  assert.deepEqual(R.mineWallHit(rd.grid, 110, 950, 125, 950), { c: 1, r: 0, face: 'left', flipX: true, inward: true })
  // inside the gap, and inside one block: nothing
  assert.equal(R.mineWallHit(rd.grid, 105, 950, 115, 950), null)
  assert.equal(R.mineWallHit(rd.grid, 130, 950, 180, 950), null)
  // out of (1,0) upward, through its ceiling
  assert.deepEqual(R.mineWallHit(rd.grid, 170, 905, 170, 895), { c: 1, r: 0, face: 'top', flipX: false, inward: false })
  // down into (1,1) from the gap over it... which is its floor from below
  assert.deepEqual(R.mineWallHit(rd.grid, 170, 890, 170, 878), { c: 1, r: 1, face: 'bottom', flipX: false, inward: true })
  // an open block has no wall
  assert.equal(R.mineWallHit(rd.grid, 50, 950, 95, 950), null)
  // without a gap: the frontier counts, two closed neighbours share their space
  const flat = round([], { gap: 0 })
  assert.equal(R.mineWallHit(flat.grid, 150, 950, 250, 950), null)
  assert.deepEqual(R.mineWallHit(flat.grid, 90, 950, 110, 950), { c: 1, r: 0, face: 'left', flipX: true, inward: true })
})

test('with cut corners a note or a shot can meet a block\'s slanted wall, and the colour starts at that corner', () => {
  // blocks of 100 with their corners cut by 29.29; (1,1) is at x 120 to 220, y 780 to 880
  const g = M.mineGeometry({ cell: 100, gap: 20, corner: 100 }, { width: 5 * 100 + 4 * 20, top: 1000 - (4 * 100 + 3 * 20), ground: 1000 })
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }], turn: 'first' }), rd = R.mineRound(grid)
  // from the gap into its top left corner, and out of it through its bottom right one
  assert.deepEqual(R.mineWallHit(grid, 118, 778, 140, 800), { c: 1, r: 1, face: 'tl', flipX: true, inward: true })
  assert.deepEqual(R.mineWallHit(grid, 200, 860, 216, 878), { c: 1, r: 1, face: 'br', flipX: false, inward: false })
  // inside the cut corner there is no block yet: nothing until the slanted wall
  assert.equal(R.mineWallHit(grid, 121, 781, 128, 788), null)
  assert.deepEqual(R.mineWallHit(grid, 128, 788, 150, 810), { c: 1, r: 1, face: 'tl', flipX: true, inward: true })
  // straight through a side, between its two cuts: that side
  assert.deepEqual(R.mineWallHit(grid, 110, 830, 130, 830), { c: 1, r: 1, face: 'left', flipX: true, inward: true })
  // the row on the ground keeps its bottom corners
  assert.deepEqual(R.mineWallHit(grid, 110, 998, 124, 996), { c: 1, r: 0, face: 'left', flipX: true, inward: true })
  const first = { ...rules, turn: 'first' }
  R.mineNote(rd, first, { c: 1, r: 1 }, 'open', 'a', 'tl')
  assert.equal(M.mineCell(grid, 1, 1).turn, 135) // blue from the top left corner
  R.mineShot(rd, first, { c: 2, r: 1 }, 10, 's', 'br')
  assert.equal(M.mineCell(grid, 2, 1).turn, 135) // red from the bottom right corner is blue from the top left one
})

test('notes from the open side fill the blue and raise the flag; the closed side\'s do not count', () => {
  const rd = round([[1, 0]])
  assert.deepEqual(notes(rd, 1, 0, 3), [])
  assert.equal(cell(rd, 1, 0).gauge, 0.75)
  assert.deepEqual(notes(rd, 2, 0, 9, 'closed', 'z'), [])
  assert.equal(cell(rd, 2, 0).gauge, 0)
  assert.deepEqual(notes(rd, 1, 0, 1), [{ kind: 'flag', c: 1, r: 0, by: 'a', bomb: true }])
  assert.equal(cell(rd, 1, 0).flag, true)
  assert.deepEqual(notes(rd, 2, 0, 4, 'open', 'b'), [{ kind: 'flag', c: 2, r: 0, by: 'b', bomb: false }])
  assert.deepEqual(rd.stats.a, { music: 4, damage: 0, opened: 0, flags: 1, flagsOnBomb: 1, doubts: 0, solved: 0, disarmed: 0, installed: 0, kills: 0, deaths: 0 })
  assert.equal(rd.stats.b.flagsOnBomb, 0)
  assert.equal(rd.stats.z, undefined)
  // an open block takes nothing
  assert.deepEqual(notes(rd, 0, 0, 5), [])
})

test('shots fill the red and undo the blue; all red opens a block with no armed bomb', () => {
  const rd = round()
  notes(rd, 1, 0, 2)
  assert.deepEqual(R.mineShot(rd, rules, { c: 1, r: 0 }, 30, 's'), [])
  assert.ok(Math.abs(cell(rd, 1, 0).gauge - 0.2) < 1e-9)
  assert.deepEqual(R.mineShot(rd, rules, { c: 1, r: 0 }, 70, 's'), [])
  assert.ok(Math.abs(cell(rd, 1, 0).gauge + 0.5) < 1e-9)
  notes(rd, 1, 0, 1) // a note undoes the red first
  assert.ok(Math.abs(cell(rd, 1, 0).gauge + 0.25) < 1e-9)
  assert.deepEqual(R.mineShot(rd, rules, { c: 1, r: 0 }, 500, 's'), [{ kind: 'open', c: 1, r: 0, by: 's', lost: false }])
  assert.deepEqual(cell(rd, 1, 0), M.mineBlankCell({ open: true, bomb: false, free: false, turn: 0 }))
  assert.equal(rd.stats.s.opened, 1)
  assert.equal(rd.stats.s.damage, 30 + 70 + 75) // only what the block could still take
  // "0: it never breaks"
  assert.deepEqual(R.mineShot(rd, { ...rules, toOpen: 0 }, { c: 2, r: 0 }, 9999, 's'), [])
  assert.equal(cell(rd, 2, 0).gauge, 0)
})

test('"Lado de dentro quebra paredes" off: the closed side\'s shots do nothing, the open side\'s and the ones with no side still count', () => {
  const rd = round(), off = { ...rules, insideBreaks: false }
  // on (or left out), both sides break
  assert.deepEqual(R.mineShot(rd, rules, { c: 1, r: 0 }, 30, 'in', undefined, 'closed'), [])
  assert.ok(Math.abs(cell(rd, 1, 0).gauge + 0.3) < 1e-9)
  assert.deepEqual(R.mineShot(rd, { ...rules, insideBreaks: true }, { c: 1, r: 0 }, 10, 'in', undefined, 'closed'), [])
  assert.ok(Math.abs(cell(rd, 1, 0).gauge + 0.4) < 1e-9)
  // off: nothing from the closed side, not even the stats
  assert.deepEqual(R.mineShot(rd, off, { c: 1, r: 0 }, 9999, 'in', 'left', 'closed'), [])
  assert.deepEqual(R.mineDo(rd, off, { k: 'shot', c: 1, r: 0, d: 9999, by: 'in', side: 'closed' }), [])
  assert.ok(Math.abs(cell(rd, 1, 0).gauge + 0.4) < 1e-9)
  assert.equal(rd.stats.in.damage, 40)
  // the open side's, and a shot from a browser that does not say its side
  assert.deepEqual(R.mineDo(rd, off, { k: 'shot', c: 1, r: 0, d: 10, by: 'out', side: 'open' }), [])
  assert.deepEqual(R.mineDo(rd, off, { k: 'shot', c: 1, r: 0, d: 10, by: 'out' }), [])
  assert.ok(Math.abs(cell(rd, 1, 0).gauge + 0.6) < 1e-9)
  assert.deepEqual(kinds(R.mineShot(rd, off, { c: 1, r: 0 }, 500, 'out', undefined, 'open')), ['open'])
})

test('a flag takes no shot; notes over it fill the yellow, and the doubt takes shots again', () => {
  const rd = round()
  notes(rd, 1, 0, 4)
  assert.deepEqual(R.mineShot(rd, rules, { c: 1, r: 0 }, 9999, 's'), [])
  // what is left of the burst that raised the flag does not count
  assert.deepEqual(notes(rd, 1, 0, 6), [])
  assert.equal(cell(rd, 1, 0).yellow, 0)
  R.mineTick(rd, R.MINE_FLAG_HOLD)
  assert.deepEqual(notes(rd, 1, 0, 3, 'closed'), []) // nor the closed side's, ever
  assert.equal(cell(rd, 1, 0).yellow, 0)
  assert.deepEqual(notes(rd, 1, 0, 3), [])
  assert.equal(cell(rd, 1, 0).yellow, 0.75)
  assert.deepEqual(notes(rd, 1, 0, 1, 'open', 'b'), [{ kind: 'doubt', c: 1, r: 0, by: 'b' }])
  const k = cell(rd, 1, 0)
  assert.deepEqual([k.flag, k.doubt, k.gauge, k.yellow], [false, true, 0, 0])
  // in doubt: the blue full takes the doubt away and leaves nothing marked (the doubt is solved), or shots open it
  assert.deepEqual(notes(rd, 1, 0, 4, 'open', 'b'), [{ kind: 'clear', c: 1, r: 0, by: 'b' }])
  assert.deepEqual([k.flag, k.doubt, k.gauge, k.yellow], [false, false, 0, 0])
  assert.equal(rd.stats.b.doubts, 1)
  assert.equal(rd.stats.b.solved, 1)
  // what is left of the burst that cleared it does not count; then notes raise the flag from grey as usual
  assert.deepEqual(notes(rd, 1, 0, 6), [])
  assert.equal(k.gauge, 0)
  R.mineTick(rd, R.MINE_FLAG_HOLD)
  assert.deepEqual(kinds(notes(rd, 1, 0, 4)), ['flag'])
  R.mineTick(rd, 5)
  notes(rd, 1, 0, 4)
  assert.deepEqual(kinds(R.mineShot(rd, rules, { c: 1, r: 0 }, 100, 's')), ['open'])
  assert.equal(rd.stats.s.solved, 1)
})

test('all red on an armed bomb: the block becomes a crater and the blast reaches it and its open neighbours', () => {
  const rd = round([[1, 1]])
  // open (1,0) and (2,1) first: neighbours of the bomb, with (0,0) the free block
  R.mineShot(rd, rules, { c: 1, r: 0 }, 100, 's'); R.mineShot(rd, rules, { c: 2, r: 1 }, 100, 's')
  const ev = R.mineShot(rd, rules, { c: 1, r: 1 }, 100, 's')
  assert.equal(ev.length, 1)
  assert.deepEqual({ ...ev[0], cells: undefined }, { kind: 'boom', c: 1, r: 1, by: 's', owner: undefined, contained: false, cells: undefined })
  assert.deepEqual(ev[0].cells.map(k => `${k.c},${k.r}`).sort(), ['0,0', '1,0', '1,1', '2,1'])
  assert.deepEqual([cell(rd, 1, 1).open, cell(rd, 1, 1).crater, cell(rd, 1, 1).bomb], [true, true, false])
  assert.equal(rd.stats.s.opened, 2) // blowing one up is not opening it
  assert.equal(M.bombsAround(rd.grid, 1, 0), 0)
})

test('the shock sends the seesaw back to grey, but a flag holds', () => {
  const rd = round()
  notes(rd, 1, 0, 2); R.mineShot(rd, rules, { c: 2, r: 0 }, 40, 's'); notes(rd, 3, 0, 4)
  assert.deepEqual(kinds(R.mineShock(rd, rules, { c: 1, r: 0 })), ['shock'])
  assert.deepEqual(kinds(R.mineShock(rd, rules, { c: 2, r: 0 })), ['shock'])
  assert.deepEqual(R.mineShock(rd, rules, { c: 3, r: 0 }), [])
  assert.deepEqual(R.mineShock(rd, rules, { c: 4, r: 0 }), []) // already grey
  assert.deepEqual([cell(rd, 1, 0).gauge, cell(rd, 2, 0).gauge, cell(rd, 3, 0).gauge], [0, 0, 1])
})

test('"Primeiro tiro determina o lado": the colour starts at the wall the first note or shot lands on, again after grey', () => {
  const first = { ...rules, turn: 'first' }
  const rd = round([], { turn: 'first' })
  assert.equal(cell(rd, 1, 0).turn, null)
  R.mineNote(rd, first, { c: 1, r: 0 }, 'open', 'a', 'left')
  assert.equal(cell(rd, 1, 0).turn, 90) // blue from the left
  R.mineNote(rd, first, { c: 1, r: 0 }, 'open', 'a', 'top')
  assert.equal(cell(rd, 1, 0).turn, 90)
  R.mineShot(rd, first, { c: 2, r: 0 }, 10, 's', 'top')
  assert.equal(cell(rd, 2, 0).turn, 0) // red from the top is blue from the bottom
  R.mineShot(rd, first, { c: 3, r: 0 }, 10, 's', 'right')
  assert.equal(cell(rd, 3, 0).turn, 90)
  R.mineShock(rd, first, { c: 1, r: 0 })
  assert.equal(cell(rd, 1, 0).turn, null)
  R.mineShot(rd, first, { c: 1, r: 0 }, 10, 's', 'bottom')
  assert.equal(cell(rd, 1, 0).turn, 180)
  // through grey to the other colour: the hit that crosses decides
  R.mineNote(rd, first, { c: 1, r: 0 }, 'open', 'a', 'right')
  assert.equal(cell(rd, 1, 0).turn, 270)
  // a fixed turn never moves
  const fixed = round([], { turn: 45 })
  R.mineNote(fixed, { ...rules, turn: 45 }, { c: 1, r: 0 }, 'open', 'a', 'left')
  assert.equal(cell(fixed, 1, 0).turn, 45)
})

test('the bomb, from inside: the Chave dourada disarms it, a disarmed one is taken (the block opens) or armed again', () => {
  const rd = round([[1, 0], [2, 0]])
  const at = { c: 1, r: 0 }
  assert.equal(R.mineBombUse(rd.grid, at, { key: false, crouch: false }), null)
  assert.equal(R.mineBombUse(rd.grid, { c: 3, r: 0 }, { key: true, crouch: false }), null) // no bomb there
  assert.equal(R.mineBombUse(rd.grid, at, { key: true, crouch: false }), 'disarm')
  assert.deepEqual(R.mineUseBomb(rd, rules, at, 'disarm', 'k'), [{ kind: 'disarm', c: 1, r: 0, by: 'k' }])
  assert.equal(rd.stats.k.disarmed, 1)
  assert.equal(M.bombsAround(rd.grid, 0, 0), 1) // disarmed, it is still a bomb for the numbers
  assert.equal(R.mineBombUse(rd.grid, at, { key: true, crouch: true }), 'arm')
  assert.equal(R.mineBombUse(rd.grid, at, { key: false, crouch: false }), 'take')
  assert.deepEqual(kinds(R.mineUseBomb(rd, rules, at, 'arm', 'k')), ['arm'])
  assert.equal(cell(rd, 1, 0).armed, true)
  R.mineUseBomb(rd, rules, at, 'disarm', 'k')
  assert.deepEqual(kinds(R.mineUseBomb(rd, rules, at, 'take', 'k')), ['take'])
  assert.deepEqual([cell(rd, 1, 0).open, cell(rd, 1, 0).bomb, cell(rd, 1, 0).crater], [true, false, false])
  assert.equal(M.bombsAround(rd.grid, 0, 0), 0)
  // shooting open a block with a disarmed bomb: no blast, the bomb is lost
  R.mineUseBomb(rd, rules, { c: 2, r: 0 }, 'disarm', 'k')
  assert.deepEqual(R.mineShot(rd, rules, { c: 2, r: 0 }, 100, 's'), [{ kind: 'open', c: 2, r: 0, by: 's', lost: true }])
})

test('a bomb from the inventory closes an open block of the frontier again, armed, and the numbers count it', () => {
  const rd = round()
  R.mineShot(rd, rules, { c: 1, r: 0 }, 100, 's'); R.mineShot(rd, rules, { c: 2, r: 0 }, 100, 's')
  // from the gap over (1,0), in reach of it; the free block and blocks away from the closed ones never
  assert.deepEqual(R.mineInstallSpot(rd.grid, 170, 890, 30), { c: 1, r: 0 })
  assert.equal(R.mineInstallSpot(rd.grid, 50, 890, 30), null) // (0,0) is a portal's
  assert.equal(R.mineInstallSpot(rd.grid, 170, 700, 30), null)
  R.mineShot(rd, rules, { c: 1, r: 1 }, 100, 's'); R.mineShot(rd, rules, { c: 0, r: 1 }, 100, 's'); R.mineShot(rd, rules, { c: 2, r: 1 }, 100, 's')
  // (1,0) no longer touches a closed block by a side: the block over the gap does
  assert.deepEqual(R.mineInstallSpot(rd.grid, 170, 890, 30), { c: 1, r: 1 })
  assert.equal(R.mineInstallSpot(rd.grid, 170, 895, 10), null)
  assert.deepEqual(R.mineInstall(rd, { c: 2, r: 0 }, 'm'), [{ kind: 'install', c: 2, r: 0, by: 'm' }])
  const k = cell(rd, 2, 0)
  assert.deepEqual([k.open, k.bomb, k.armed, k.by.bomb], [false, true, true, 'm'])
  assert.equal(M.bombsAround(rd.grid, 1, 0), 1)
  assert.deepEqual(R.mineInstall(rd, { c: 0, r: 0 }, 'm'), []) // the free block never closes
  assert.deepEqual(R.mineInstall(rd, { c: 4, r: 3 }, 'm'), []) // nor one that is already closed
  // whoever dies by it counts for the one who installed it
  const ev = R.mineShot(rd, rules, { c: 2, r: 0 }, 100, 's')
  assert.equal(ev[0].owner, 'm')
  R.mineKilled(rd, 's', ev[0].owner); R.mineKilled(rd, 'm', ev[0].owner)
  assert.deepEqual([rd.stats.m.installed, rd.stats.m.kills, rd.stats.m.deaths, rd.stats.s.deaths], [1, 1, 1, 1])
})

test('the detonator: only in doubt, it counts down for all; a key stops it, the flag in time contains the blast', () => {
  const rd = round([[1, 0], [2, 0], [3, 0]])
  const doubt = c => { notes(rd, c, 0, 4); R.mineTick(rd, 2); notes(rd, c, 0, 4) }
  assert.equal(R.mineBombUse(rd.grid, { c: 1, r: 0 }, { key: false, crouch: false }), null)
  assert.deepEqual(R.mineUseBomb(rd, rules, { c: 1, r: 0 }, 'detonator', 'd'), [])
  doubt(1); doubt(2); doubt(3)
  assert.equal(R.mineBombUse(rd.grid, { c: 1, r: 0 }, { key: false, crouch: false }), 'detonator')
  for (const c of [1, 2, 3]) assert.deepEqual(kinds(R.mineUseBomb(rd, rules, { c, r: 0 }, 'detonator', 'd')), ['detonator'])
  assert.equal(R.mineBombUse(rd.grid, { c: 1, r: 0 }, { key: false, crouch: false }), null) // already counting
  assert.deepEqual(R.mineTick(rd, 4), [])
  assert.equal(cell(rd, 1, 0).fuse, 6)
  // (1,0): a key stops it; (2,0): the doubt cleared and the flag up again in time; (3,0): nothing
  assert.deepEqual(kinds(R.mineUseBomb(rd, rules, { c: 1, r: 0 }, 'disarm', 'k')), ['disarm'])
  assert.equal(cell(rd, 1, 0).fuse, null)
  assert.deepEqual(kinds(notes(rd, 2, 0, 4)), ['clear'])
  assert.deepEqual(R.mineTick(rd, R.MINE_FLAG_HOLD), [])
  assert.deepEqual(kinds(notes(rd, 2, 0, 4)), ['flag'])
  const ev = R.mineTick(rd, 6 - R.MINE_FLAG_HOLD)
  assert.deepEqual(ev.map(e => [e.kind, e.c, e.contained, e.owner, e.cells.map(k => `${k.c},${k.r}`).join(' ')]), [['boom', 2, true, 'd', '2,0'], ['boom', 3, false, 'd', '3,0']])
  const held = cell(rd, 2, 0)
  assert.deepEqual([held.open, held.flag, held.bomb, held.fuse], [false, true, false, null])
  assert.deepEqual([cell(rd, 3, 0).open, cell(rd, 3, 0).crater], [true, true])
  assert.equal(M.bombsAround(rd.grid, 2, 1), 1) // only the disarmed one of (1,0) is left around
})

test('the round ends when no closed block without a bomb is left, once; the titles go to the best of each front', () => {
  const grid = M.createMineGrid(M.mineGeometry({ cell: 100, gap: 20 }, { width: 340, top: 900, ground: 1000 }), { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }] })
  Object.assign(M.mineCell(grid, 2, 0), { bomb: true, armed: true })
  const rd = R.mineRound(grid)
  assert.equal(R.mineRoundOver(rd.grid), false)
  assert.deepEqual(kinds(R.mineShot(rd, rules, { c: 1, r: 0 }, 100, 's')), ['open', 'end'])
  assert.equal(rd.over, true)
  assert.deepEqual(kinds(R.mineInstall(rd, { c: 1, r: 0 }, 'm')), ['install'])
  assert.deepEqual(kinds(R.mineShot(rd, rules, { c: 1, r: 0 }, 100, 's')), ['boom']) // no second end
  const stats = { a: { opened: 3, flagsOnBomb: 0, disarmed: 1, kills: 0 }, b: { opened: 3, flagsOnBomb: 2, disarmed: 0, kills: 0 }, c: { opened: 1, flagsOnBomb: 1, disarmed: 1, kills: 0 } }
  assert.deepEqual(R.mineTitles(stats), { explorer: ['a', 'b'], guardian: ['b'], sapper: ['a', 'c'], miner: [] })
  assert.deepEqual(R.MINE_TITLES.map(t => t.name), ['Desbravador', 'Guardião', 'Sapador', 'Minador'])
})

test('a blast reaches the closed blocks within its radius, stronger the closer it is', () => {
  const rd = round()
  const hit = R.mineBlastCells(rd.grid, 110, 950, 60) // in the gap between the free block and (1,0)
  assert.deepEqual(hit.map(k => `${k.c},${k.r}`), ['1,0'])
  assert.ok(Math.abs(hit[0].part - (1 - 10 / 60)) < 1e-9)
  assert.deepEqual(R.mineBlastCells(rd.grid, 110, 890, 40).map(k => `${k.c},${k.r}`).sort(), ['0,1', '1,0', '1,1'])
  assert.deepEqual(R.mineBlastCells(rd.grid, 50, 950, 20), [])
})

test('a Golpe reaches the closed blocks whose wall its arc crosses, each once; an instrument\'s is worth notes by its damage', () => {
  const rd = round()
  // from the free block (0,0), a blow to the right reaches (1,0) through its left wall; a short one stays in the gap
  assert.deepEqual(R.mineBlowHits(rd.grid, 95, 950, 0, Math.PI / 2, 40), [{ c: 1, r: 0, face: 'left' }])
  assert.deepEqual(R.mineBlowHits(rd.grid, 95, 950, 0, Math.PI / 2, 20), [])
  // away from every block: nothing; a wide one at the corner of the free block takes the three blocks around the corner
  assert.deepEqual(R.mineBlowHits(rd.grid, 50, 950, Math.PI, Math.PI / 2, 40), [])
  const three = R.mineBlowHits(rd.grid, 95, 905, -Math.PI / 4, Math.PI, 45).map(h => `${h.c},${h.r}`).sort()
  assert.deepEqual(three, ['0,1', '1,0', '1,1'])
  // from inside a closed block, out through its own wall
  assert.deepEqual(R.mineBlowHits(rd.grid, 135, 950, Math.PI, 0.4, 40), [{ c: 1, r: 0, face: 'left' }])
  // 25 of damage where 100 open a block and 4 notes raise the flag: one note; never none, never more than 64
  assert.equal(R.mineBlowNotes(rules, 25), 1)
  assert.equal(R.mineBlowNotes(rules, 60), 2)
  assert.equal(R.mineBlowNotes(rules, 1), 1)
  assert.equal(R.mineBlowNotes({ toFlag: 200, toOpen: 50 }, 5000), 64)
  assert.equal(R.mineBlowNotes({ toFlag: 24, toOpen: 0 }, 30), 1)
})
