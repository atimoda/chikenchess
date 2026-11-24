const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const M = loadTs('lib/pigchicken/mine-grid.ts')

const world = { width: 1920 * 4, top: 930 - 3930, ground: 930 }
const geo = (cell = 288, gap = 32, w = world) => M.mineGeometry({ cell, gap }, w)

test('the saved grid is cleaned to its ranges; nothing saved means no grid', () => {
  assert.equal(M.normalizeMineGrid(undefined), undefined)
  assert.equal(M.normalizeMineGrid('on'), undefined)
  const round = { blockNotes: false, toFlag: 24, toOpen: 600, insideBreaks: true, toDoubt: 24, turn: 0, fuse: 10, startBombs: 2, grey: '#8f98a3', blue: '#4d9bff', red: '#ff5a5a', orange: '#ffb366', wallOpacity: 100, corner: 0, zones: { on: true, rhythm: 3, all: true, pool: [], seed: 1 }, items: { chance: 15, max: 2, groups: { weapons: 33, instruments: 33, utilities: 33 }, weights: {}, seed: 1 } }
  assert.deepEqual(M.normalizeMineGrid({}), { on: false, cell: 288, gap: 32, pass: true, bombs: 15, ...round })
  assert.deepEqual(M.normalizeMineGrid({ on: true, cell: 5000, gap: -9, pass: false, bombs: 99.6 }), { on: true, cell: 960, gap: 0, pass: false, bombs: 60, ...round })
  assert.deepEqual(M.normalizeMineGrid({ on: 1, cell: 291, gap: 33, bombs: NaN }), { on: false, cell: 288, gap: 32, pass: true, bombs: 15, ...round })
  // the seesaw's settings: ranges, the turn's choices and colours as #rrggbb
  assert.deepEqual(
    M.normalizeMineGrid({ blockNotes: true, toFlag: 1, toOpen: 99999, toDoubt: 300, turn: 'first', fuse: -4, startBombs: 3.4, grey: 'red', blue: '#ABCDEF', red: '#12', wallOpacity: 37, corner: 37 }),
    { on: false, cell: 288, gap: 32, pass: true, bombs: 15, blockNotes: true, toFlag: 4, toOpen: 5000, insideBreaks: true, toDoubt: 200, turn: 'first', fuse: 0, startBombs: 3, grey: '#8f98a3', blue: '#abcdef', red: '#ff5a5a', orange: '#ffb366', wallOpacity: 35, corner: 35, zones: { on: true, rhythm: 3, all: true, pool: [], seed: 1 }, items: { chance: 15, max: 2, groups: { weapons: 33, instruments: 33, utilities: 33 }, weights: {}, seed: 1 } },
  )
  // the notes bounce only where a Pátio says so
  assert.equal(M.normalizeMineGrid({ blockNotes: 1 }).blockNotes, false)
  // the closed side breaks its blocks unless a Pátio says it does not
  assert.equal(M.normalizeMineGrid({ insideBreaks: false }).insideBreaks, false)
  assert.equal(M.normalizeMineGrid({ insideBreaks: 0 }).insideBreaks, true)
  assert.equal(M.normalizeMineGrid({ turn: 135 }).turn, 135)
  assert.equal(M.normalizeMineGrid({ turn: 'random' }).turn, 'random')
  assert.equal(M.normalizeMineGrid({ turn: 30 }).turn, 0)
  assert.equal(M.normalizeMineGrid({ corner: 250 }).corner, 100)
  const saved = M.normalizeMineGrid({ on: true, cell: 200, gap: 0 })
  assert.deepEqual(M.normalizeMineGrid(JSON.parse(JSON.stringify(saved))), saved)
})

test('the blocks cover the Pátio from side to side and from the ground up: 6 columns per scene and row 0 on the ground', () => {
  const g = geo()
  assert.equal(g.cols, 24); assert.equal(g.rows, 12); assert.equal(g.step, 320); assert.equal(g.x0, 16)
  assert.deepEqual(M.mineCellRect(g, 0, 0), { x: 16, y: 930 - 288, w: 288, h: 288 })
  assert.deepEqual(M.mineCellRect(g, 23, 1), { x: 16 + 23 * 320, y: 930 - 320 - 288, w: 288, h: 288 })
  // the last block ends 16 short of the right edge, as the first one starts 16 in
  assert.equal(M.mineCellRect(g, 23, 0).x + 288, world.width - 16)
  // without a gap the blocks touch and fill a width that is a multiple of them
  const tight = geo(320, 0)
  assert.equal(tight.cols, 24); assert.equal(tight.x0, 0)
  assert.equal(M.mineCellRect(tight, 1, 0).x, M.mineCellRect(tight, 0, 0).x + 320)
  // a tiny world still has one block
  const tiny = geo(960, 200, { width: 500, top: 500, ground: 930 })
  assert.equal(tiny.cols, 1); assert.equal(tiny.rows, 1)
})

test('a point is in a block, or in the space between blocks and outside the grid; the nearest block is always one', () => {
  const g = geo()
  assert.deepEqual(M.mineCellAt(g, 16, 929), { c: 0, r: 0 })
  assert.deepEqual(M.mineCellAt(g, 160, 800), { c: 0, r: 0 })
  assert.deepEqual(M.mineCellAt(g, 304, 642), { c: 0, r: 0 })
  assert.equal(M.mineCellAt(g, 310, 800), null) // the gap to the right
  assert.equal(M.mineCellAt(g, 160, 630), null) // the gap above
  assert.equal(M.mineCellAt(g, 5, 800), null) // left of the first block
  assert.equal(M.mineCellAt(g, 160, 940), null) // under the ground
  assert.deepEqual(M.mineCellAt(g, 16 + 320 * 3 + 100, 930 - 320 * 2 - 100), { c: 3, r: 2 })
  assert.deepEqual(M.mineNearestCell(g, 310, 630), { c: 0, r: 0 })
  assert.deepEqual(M.mineNearestCell(g, 330, 600), { c: 1, r: 1 })
  assert.deepEqual(M.mineNearestCell(g, -900, 5000), { c: 0, r: 0 })
  assert.deepEqual(M.mineNearestCell(g, 99999, -99999), { c: 23, r: 11 })
  assert.equal(M.mineNeighbours(g, 0, 0).length, 3)
  assert.equal(M.mineNeighbours(g, 5, 5).length, 8)
  assert.equal(M.mineNeighbours(g, 5, 5, false).length, 4)
  assert.equal(M.mineNeighbours(g, 23, 11, false).length, 2)
})

test('a round: the same seed draws the same bombs, the chance holds, and a free block is open, clean and counted around', () => {
  const g = geo()
  const a = M.createMineGrid(g, { bombs: 15, seed: 7 }), b = M.createMineGrid(g, { bombs: 15, seed: 7 }), c = M.createMineGrid(g, { bombs: 15, seed: 8 })
  assert.deepEqual(a.cells, b.cells)
  assert.notDeepEqual(a.cells, c.cells)
  assert.equal(a.cells.length, 288)
  assert.ok(a.cells.every(x => !x.open && !x.free))
  const big = M.createMineGrid(M.mineGeometry({ cell: 120, gap: 0 }, { width: 12000, top: -5070, ground: 930 }), { bombs: 15, seed: 3 })
  const share = big.cells.filter(x => x.bomb).length / big.cells.length
  assert.ok(share > 0.13 && share < 0.17, `share ${share}`)
  assert.equal(M.createMineGrid(g, { bombs: 0, seed: 1 }).cells.some(x => x.bomb), false)
  // every block a bomb, except the free ones
  const full = M.createMineGrid(g, { bombs: 100, seed: 1, free: [{ c: 2, r: 0 }, { c: 99, r: 0 }] })
  assert.deepEqual(M.mineCell(full, 2, 0), M.mineBlankCell({ open: true, bomb: false, free: true, turn: 0 }))
  assert.ok(full.cells.every(x => x.armed === x.bomb && x.gauge === 0 && !x.flag && x.fuse === null))
  // the seesaw's turn: the same for all, one drawn for each (the same with the same seed) or left for the first hit
  assert.ok(M.createMineGrid(g, { bombs: 15, seed: 7, turn: 90 }).cells.every(x => x.turn === 90))
  const spun = M.createMineGrid(g, { bombs: 15, seed: 7, turn: 'random' })
  assert.ok(new Set(spun.cells.map(x => x.turn)).size > 4 && spun.cells.every(x => M.MINE_TURNS.includes(x.turn)))
  assert.deepEqual(spun.cells.map(x => x.bomb), a.cells.map(x => x.bomb))
  assert.ok(M.createMineGrid(g, { bombs: 15, seed: 7, turn: 'first' }).cells.every(x => x.turn === null))
  assert.equal(full.cells.filter(x => !x.bomb).length, 1)
  assert.equal(M.bombsAround(full, 2, 0), 5)
  assert.equal(M.bombsAround(full, 5, 5), 8)
  assert.equal(M.bombsAround(full, 1, 0), 4) // the free neighbour hides none
  assert.equal(M.mineCell(full, -1, 0), null)
})

test('the side is the state of the block the body is in; out of the blocks it is open unless closed blocks are all around', () => {
  const grid = M.createMineGrid(geo(), { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }] })
  assert.equal(M.mineSideAt(grid, 160, 800, 'closed'), 'open')
  assert.equal(M.mineSideAt(grid, 160 + 320, 800, 'open'), 'closed')
  // the gap beside an open block is the open side, whatever side she had (x0 is 16: (0,0) ends at 304)
  assert.equal(M.mineSideAt(grid, 310, 800, 'open'), 'open')
  assert.equal(M.mineSideAt(grid, 310, 800, 'closed'), 'open')
  // between two closed blocks she keeps her side: (1,0) ends at 624, (2,0) starts at 656
  assert.equal(M.mineSideAt(grid, 640, 800, 'closed'), 'closed')
  assert.equal(M.mineSideAt(grid, 640, 800, 'open'), 'open')
  // ...and where four closed blocks meet (rows 0 and 1 meet at y 642 to 610)
  assert.equal(M.mineSideAt(grid, 640, 625, 'closed'), 'closed')
  // over the open block's corner where the gaps cross
  assert.equal(M.mineSideAt(grid, 310, 625, 'closed'), 'open')
  // outside the grid: beside it and over its top row
  assert.equal(M.mineSideAt(grid, -50, 800, 'closed'), 'open')
  assert.equal(M.mineSideAt(grid, 7700, 800, 'closed'), 'open')
  const top = M.mineCellRect(grid.geo, 1, grid.geo.rows - 1)
  assert.equal(M.mineSideAt(grid, 480, top.y - 3, 'closed'), 'open')
  // the gap between two closed blocks of the top row opens over the grid
  assert.equal(M.mineSideAt(grid, 640, top.y + 10, 'closed'), 'closed')
  assert.equal(M.mineSideAt(grid, 640, top.y - 10, 'closed'), 'open')
  // within the thickness of a closed block's walls: (1,0) starts at x 336 and its walls are 12 thick
  assert.equal(M.mineSideAt(grid, 340, 800, 'open'), 'open')
  assert.equal(M.mineSideAt(grid, 349, 800, 'open'), 'closed')
  assert.equal(M.mineSideAt(grid, 480, 925, 'open'), 'open')
  // the grid can keep clear of the world's sides
  const inset = M.mineGeometry({ cell: 288, gap: 32 }, { left: M.MINE_MARGIN.side, width: 7680 - M.MINE_MARGIN.side * 2, top: -3000 + M.MINE_MARGIN.top, ground: 930 })
  assert.deepEqual([inset.cols, inset.rows, inset.x0], [23, 12, 72 + 104])
  assert.equal(M.mineGeometry({ cell: 300, gap: 0 }, { left: 16, width: 968, top: 0, ground: 930 }).x0, 16 + 34)
})

test('with a gap every closed block is a room with four walls; without one, walls stand only at the frontier and the ends', () => {
  const g = geo()
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1, free: [{ c: 1, r: 0 }] })
  const walls = M.mineWalls(grid)
  assert.equal(walls.length, (288 - 1) * 4)
  assert.equal(walls.some(w => w.c === 1 && w.r === 0), false)
  const t = M.mineWallThickness(g)
  assert.equal(t, 12)
  const room = Object.fromEntries(walls.filter(w => w.c === 0 && w.r === 0).map(w => [w.edge, [w.x, w.y, w.w, w.h]]))
  assert.deepEqual(room, { top: [16, 642, 288, t], bottom: [16, 930 - t, 288, t], left: [16, 642, t, 288], right: [16 + 288 - t, 642, t, 288] })
  // a wall leads to the next room only towards a closed neighbour: (0,0) has the open (1,0) on its right, the end of
  // the grid on its left, the ground below and the closed (0,1) above
  const leads = Object.fromEntries(walls.filter(w => w.c === 0 && w.r === 0).map(w => [w.edge, w.cross]))
  assert.deepEqual(leads, { top: 32 + t * 2, bottom: undefined, left: undefined, right: undefined })
  assert.equal(walls.find(w => w.id === 'mine-0-1-bottom').cross, 32 + t * 2)
  // the engine skips colliders thinner than 8
  assert.equal(M.mineWallThickness(geo(120, 32)), 8)
  assert.equal(new Set(walls.map(w => w.id)).size, walls.length)
  // only the blocks asked for (those near the players)
  assert.equal(M.mineWalls(grid, (c, r) => c === 0 && r === 0).length, 4)
  // no gap: a 3 x 2 grid with the middle of the bottom row open
  const small = M.mineGeometry({ cell: 320, gap: 0 }, { width: 960, top: 930 - 640, ground: 930 })
  assert.equal(small.cols, 3); assert.equal(small.rows, 2)
  const tight = M.createMineGrid(small, { bombs: 0, seed: 1, free: [{ c: 1, r: 0 }] })
  const ids = M.mineWalls(tight).map(w => w.id).sort()
  assert.deepEqual(ids, [
    'mine-0-0-left', 'mine-0-0-right', // the left end and the open block; closed above, the ground below
    'mine-0-1-left', 'mine-0-1-top',
    'mine-1-1-bottom', 'mine-1-1-top', // over the open block
    'mine-2-0-left', 'mine-2-0-right',
    'mine-2-1-right', 'mine-2-1-top',
  ].sort())
  // all closed and no gap: only the ends of the grid
  const sealed = M.createMineGrid(small, { bombs: 0, seed: 1 })
  assert.deepEqual(M.mineWalls(sealed).map(w => w.edge).sort(), ['left', 'left', 'right', 'right', 'top', 'top', 'top'])
  assert.equal(M.mineWalls(sealed).some(w => w.cross !== undefined), false)
})

test('the gap between two closed blocks is plugged for the bodies that do not fit in it', () => {
  // 3 x 2, the bottom right block open
  const g = M.mineGeometry({ cell: 300, gap: 30 }, { width: 960, top: 930 - 630, ground: 930 })
  assert.equal(g.cols, 3); assert.equal(g.rows, 2); assert.equal(g.x0, 0)
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1, free: [{ c: 2, r: 0 }] })
  const plugs = Object.fromEntries(M.minePlugs(grid).map(p => [p.id, [p.x, p.y, p.w, p.h, p.fit]]))
  assert.deepEqual(plugs, {
    'mine-0-0-shaft': [300, 630, 30, 300, 30], // between (0,0) and (1,0)
    'mine-0-0-corridor': [0, 600, 300, 30, 30], // between (0,0) and (0,1)
    'mine-0-0-cross': [300, 600, 30, 30, 30], // where (0,0), (1,0), (0,1) and (1,1) meet
    'mine-1-0-corridor': [330, 600, 300, 30, 30],
    'mine-0-1-shaft': [300, 300, 30, 300, 30],
    'mine-1-1-shaft': [630, 300, 30, 300, 30],
    // nothing beside or over the open (2,0), and no crossing next to it
  })
  assert.equal(M.minePlugs(grid, (c, r) => c === 1 && r === 1).length, 1)
  // a gap thinner than the thinnest collider grows into the walls beside it, and still fits only what fits the gap
  const thin = M.createMineGrid(M.mineGeometry({ cell: 300, gap: 4 }, { width: 960, top: 930 - 630, ground: 930 }), { bombs: 0, seed: 1 })
  const shaft = M.minePlugs(thin).find(p => p.id === 'mine-0-0-shaft')
  assert.deepEqual([shaft.w, shaft.fit, shaft.x], [8, 4, thin.geo.x0 + 300 - 2])
  // no gap, no passage
  assert.deepEqual(M.minePlugs(M.createMineGrid(M.mineGeometry({ cell: 320, gap: 0 }, { width: 960, top: 290, ground: 930 }), { bombs: 0, seed: 1 })), [])
})

// ---------- what the chicken's engine makes of the walls (lib/chicken/hard-shapes.ts) ----------

const Hd = loadTs('lib/chicken/hard-shapes.ts')
// the faces of the boxes as the engine reads them, fused: `x0,y0-x1,y1 <facing>` each
function faces(boxes) {
  const segs = boxes.flatMap(b => Hd.shapeEdges([[0, 0], [b.w, 0], [b.w, b.h], [0, b.h]]).map(({ i, a, b: e, kind, n }) => ({
    id: `${b.id}:${kind[0]}${i}`, ax: b.x + a[0], ay: b.y + a[1], bx: b.x + e[0], by: b.y + e[1], len: Math.hypot(e[0] - a[0], e[1] - a[1]), anchorX: b.x + a[0],
    wall: kind !== 'floor', ...(kind === 'ceil' ? { ceil: true } : {}), hardN: n, fused: b.id,
  })))
  const fused = Hd.fuseFaces(segs, boxes.map(b => ({ id: b.id, group: b.group, left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h })))
  assert.equal(new Set(fused.map(f => f.id)).size, fused.length)
  const facing = n => (n[1] < 0 ? 'up' : n[1] > 0 ? 'down' : n[0] < 0 ? 'left' : 'right')
  return fused.map(f => `${Math.min(f.ax, f.bx)},${Math.min(f.ay, f.by)}-${Math.max(f.ax, f.bx)},${Math.max(f.ay, f.by)} ${facing(f.hardN)}`).sort()
}

test('the walls of a room are one solid for the engine: an outer and an inner outline that never meet', () => {
  // a closed block alone among open ones: (1,0) of a 3 x 2 grid, cell 300, gap 30, walls 13 thick
  const g = M.mineGeometry({ cell: 300, gap: 30 }, { width: 960, top: 930 - 630, ground: 930 })
  const free = [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]].map(([c, r]) => ({ c, r }))
  const alone = M.createMineGrid(g, { bombs: 0, seed: 1, free })
  assert.deepEqual(faces(M.mineWalls(alone)), [
    '330,630-330,930 left', '330,630-630,630 up', '630,630-630,930 right', '330,930-630,930 down',
    '343,643-343,917 right', '343,643-617,643 down', '617,643-617,917 left', '343,917-617,917 up',
  ].sort())
  // with the block above it closed too: for a body that does not fit in the gap, the two rooms and the gap between
  // them are one solid, so the lower roof and the upper block's underside are no surface
  const two = M.createMineGrid(g, { bombs: 0, seed: 1, free: free.filter(f => !(f.c === 1 && f.r === 1)) })
  const big = faces([...M.mineWalls(two), ...M.minePlugs(two)])
  assert.equal(big.includes('330,630-630,630 up'), false)
  assert.equal(big.includes('330,600-630,600 down'), false)
  assert.equal(big.some(f => /^3[34]\d,6[03]0-/.test(f) && / (up|down)$/.test(f)), false)
  // the outer wall goes on up the plug, in three stretches
  for (const f of ['330,630-330,930 left', '330,600-330,630 left', '330,300-330,600 left', '343,643-617,643 down', '343,587-617,587 up']) assert.equal(big.includes(f), true, f)
  // a body that fits has no plug: every room keeps its own outline
  assert.equal(faces(M.mineWalls(two)).includes('330,630-630,630 up'), true)
})

test('without a gap the frontier is sealed where it turns a corner around a closed block', () => {
  // 2 x 2, only the bottom left block open: the left wall of (1,0) goes up to the floor of (0,1)
  const g = M.mineGeometry({ cell: 320, gap: 0 }, { width: 640, top: 290, ground: 930 })
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }] })
  const t = M.mineWallThickness(g)
  assert.equal(t, 13)
  const walls = M.mineWalls(grid)
  assert.deepEqual(walls.filter(w => w.c === 1 && w.r === 0).map(w => [w.edge, w.x, w.y, w.w, w.h]), [['left', 320, 610 - t, t, 320 + t], ['right', 640 - t, 610, t, 320]])
  const out = faces(walls)
  // seen from the open block: its ceiling and its right wall, meeting at the corner, and nothing to climb over
  assert.equal(out.includes('0,610-320,610 down'), true)
  assert.equal(out.includes('320,610-320,930 left'), true)
  assert.equal(out.some(f => f.endsWith(' up') && f.includes(',610-')), false)
  // seen from the closed side: one floor over the open block, up to the wall's top
  assert.equal(out.includes(`${t},${610 - t}-320,${610 - t} up`), true)
  assert.equal(out.includes(`320,${610 - t}-${320 + t},${610 - t} up`), true)
})

test('a platform of the Pátio that crosses a room ends at its walls', () => {
  const g = M.mineGeometry({ cell: 300, gap: 30 }, { width: 960, top: 930 - 630, ground: 930 })
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }, { c: 0, r: 1 }] })
  const boxes = [...M.mineWalls(grid), ...M.minePlugs(grid)].map(b => ({ id: b.id, group: b.group, left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h }))
  // a floor from the open column, through (1,0), the gap and (2,0), to the end of the grid: x 200 to 960, y 800
  const top = { id: 'pq1:top', ax: 200, ay: 800, bx: 960, by: 800, len: 760, anchorX: 200, wall: false }
  // ...and a wire, already cut by an object in front, coming down across the left wall of (1,0)
  const wire = { id: 'wire:l3~1', ax: 300, ay: 700, bx: 400, by: 800, len: Math.hypot(100, 100), anchorX: 250, clipOffset: 50, wall: false }
  const cut = Hd.fuseFaces([top, wire], boxes)
  assert.deepEqual(cut.filter(f => f.id.startsWith('pq1')).map(f => [f.id, f.ax, f.bx, f.clipOffset, f.anchorX]), [
    ['pq1:top', 200, 330.5, 0, 200], // the open block, up to the wall of (1,0)
    ['pq1:top~101', 342.5, 617.5, 142.5, 200], // inside (1,0)
    ['pq1:top~102', 672.5, 947.5, 472.5, 200], // inside (2,0): the gap between the two is plugged
  ])
  const pieces = cut.filter(f => f.id.startsWith('wire'))
  assert.deepEqual(pieces.map(f => f.id), ['wire:l3~1', 'wire:l3~301'])
  assert.deepEqual([pieces[0].bx, pieces[1].ax].map(Math.round), [331, 343])
  assert.equal(Math.round(pieces[1].clipOffset), Math.round(50 + Math.hypot(42.5, 42.5)))
  // nothing fused in the way: the very same collider
  assert.equal(Hd.fuseFaces([top], boxes.slice(0, 0))[0], top)
  const far = { ...top, id: 'far:top', ay: 100, by: 100 }
  assert.equal(Hd.fuseFaces([far], boxes)[0], far)
})

test('nothing goes straight through a fused box, nor along the line where two of them touch', () => {
  const boxes = [{ id: 'a', group: 'a', left: 0, top: 100, right: 200, bottom: 112 }, { id: 'b', group: 'b', left: 200, top: 100, right: 212, bottom: 400 }]
  assert.equal(Hd.crossesFused(boxes, 50, 150, 50, 90), true) // up through the floor of the room above
  assert.equal(Hd.crossesFused(boxes, 50, 150, 50, 113), false) // up to its underside
  assert.equal(Hd.crossesFused(boxes, 150, 200, 199, 200), false) // up to the wall
  assert.equal(Hd.crossesFused(boxes, 150, 200, 230, 200), true) // through the wall
  assert.equal(Hd.crossesFused(boxes, 200, 150, 200, 90), true) // up the seam between the two
  assert.equal(Hd.crossesFused(boxes, 200, 300, 200, 150), false) // along the wall's own face, free on one side
  assert.equal(Hd.crossesFused([], 0, 0, 500, 500), false)
})

// ---------- "Cantos em octógono" ----------

// the pieces of a block (walls, plugs, cut corners) as the engine reads them: the surfaces left of each one's outline
function solid(pieces) {
  const boxes = [], joins = []
  const segs = pieces.flatMap(b => {
    const shape = b.shape ?? [[0, 0], [b.w, 0], [b.w, b.h], [0, b.h]]
    if (b.shape) joins.push({ id: b.id, poly: shape.map(([x, y]) => [b.x + x, b.y + y]), left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h })
    else boxes.push({ id: b.id, group: b.group, left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h })
    return Hd.shapeEdges(shape).map(({ i, a, b: e, kind, n }) => ({
      id: `${b.id}:${kind[0]}${i}`, ax: b.x + a[0], ay: b.y + a[1], bx: b.x + e[0], by: b.y + e[1], len: Math.hypot(e[0] - a[0], e[1] - a[1]), anchorX: b.x + a[0],
      wall: kind !== 'floor', ...(kind === 'ceil' ? { ceil: true } : {}), hardN: n, ...(b.shape ? { join: b.id } : { fused: b.id }),
    })).filter(f => f.len >= 4)
  })
  const round = v => Math.round(v * 10) / 10
  const facing = n => `${n[1] < -0.1 ? 'up' : n[1] > 0.1 ? 'down' : ''}${n[0] < -0.1 ? 'left' : n[0] > 0.1 ? 'right' : ''}`
  return Hd.fuseFaces(segs, boxes, joins).map(f => { const [p, q] = [[round(f.ax), round(f.ay)], [round(f.bx), round(f.by)]].sort((a, b) => a[0] - b[0] || a[1] - b[1]); return `${p}-${q} ${facing(f.hardN)}` }).sort()
}

test('"Cantos em octógono": the cut goes from none to a regular octagon, and the bottom row keeps its bottom corners', () => {
  assert.equal(geo().cut, 0)
  const g = M.mineGeometry({ cell: 300, gap: 30, corner: 100 }, { width: 960, top: 930 - 630, ground: 930 })
  // all eight sides the same: what is left of a side is as long as the slanted one
  assert.ok(Math.abs((300 - g.cut * 2) - g.cut * Math.SQRT2) < 0.05)
  assert.equal(M.mineGeometry({ cell: 300, gap: 30, corner: 50 }, world).cut, Math.round(300 * M.MINE_OCTAGON * 50) / 100)
  // too small to be a wall: no cut at all
  assert.equal(M.mineGeometry({ cell: 120, gap: 0, corner: 5 }, world).cut, 0)
  assert.ok(M.mineGeometry({ cell: 120, gap: 0, corner: 10 }, world).cut >= M.MINE_CUT_MIN)
  const k = g.cut
  assert.deepEqual(M.mineOutline(g, 1), [[0, k], [k, 0], [300 - k, 0], [300, k], [300, 300 - k], [300 - k, 300], [k, 300], [0, 300 - k]])
  assert.deepEqual(M.mineOutline(g, 0), [[0, k], [k, 0], [300 - k, 0], [300, k], [300, 300], [0, 300]])
  // the room inside the walls: its slanted walls run between the ends of the straight ones' inner faces
  assert.deepEqual(M.mineOutline(g, 1, 13).slice(0, 3), [[13, k], [k, 13], [300 - k, 13]])
  // a cut smaller than the walls are thick leaves the room square
  assert.deepEqual(M.mineOutline(M.mineGeometry({ cell: 300, gap: 30, corner: 10 }, world), 1, 13), [[13, 13], [287, 13], [287, 287], [13, 287]])
  // a cut corner is space between blocks: (1,1) is at x 330 to 630, y 300 to 600
  assert.deepEqual(M.mineCellAt(g, 480, 450), { c: 1, r: 1 })
  assert.equal(M.mineCellAt(g, 340, 310), null)
  assert.equal(M.mineCellAt(g, 620, 590), null)
  assert.deepEqual(M.mineCellAt(g, 330 + k / 2, 300 + k / 2), { c: 1, r: 1 })
  // ...but not the bottom corners of the row on the ground
  assert.deepEqual(M.mineCellAt(g, 340, 920), { c: 1, r: 0 })
  assert.equal(M.mineCellAt(g, 340, 640), null)
  // inside a closed block's slanted wall nobody changes side; past it, they are in the room
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1 })
  assert.equal(M.mineSideAt(grid, 330 + k / 2 + 4, 300 + k / 2 + 4, 'open'), 'open')
  assert.equal(M.mineSideAt(grid, 330 + k / 2 + 12, 300 + k / 2 + 12, 'open'), 'closed')
  assert.equal(M.mineSideAt(grid, 340, 310, 'open'), 'open')
  // a cut corner keeps the side only with closed blocks all around it: the top row's top corners open over the grid
  assert.equal(M.mineSideAt(grid, 340, 310, 'closed'), 'open')
  assert.equal(M.mineSideAt(grid, 340, 590, 'closed'), 'closed')
  // ...and a corner beside an open block is the open side
  const beside = M.createMineGrid(g, { bombs: 0, seed: 1, free: [{ c: 0, r: 1 }] })
  assert.equal(M.mineSideAt(beside, 340, 590, 'closed'), 'open') // (0,1) is at this corner of (1,1)...
  assert.equal(M.mineSideAt(beside, 620, 590, 'closed'), 'closed') // ...not at this one
  // someone a block closes around is put inside its room, off the slanted walls too
  const moved = M.mineRoomClamp(g, 1, 1, 332, 302, 17)
  assert.ok(M.mineBlockContains(g, 1, 1, moved.x, moved.y, 16.9))
  assert.deepEqual(M.mineRoomClamp(g, 1, 1, 480, 450, 17), { x: 480, y: 450 })
})

test('with cut corners a room is still one solid: eight walls outside and eight inside, each going on from the last', () => {
  // (1,1) alone among open blocks, 3 x 3 of 300 with a gap of 30
  const g = M.mineGeometry({ cell: 300, gap: 30, corner: 100 }, { width: 960, top: 930 - 960, ground: 930 })
  const free = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (c !== 1 || r !== 1) free.push({ c, r })
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1, free })
  const walls = M.mineWalls(grid), k = g.cut, t = M.mineWallThickness(g), l = 330, u = 300, r = 630, d = 600
  assert.deepEqual(walls.map(w => w.edge), ['top', 'bottom', 'left', 'tl', 'bl', 'right', 'tr', 'br'])
  assert.deepEqual(walls.filter(w => !w.shape).map(w => [w.edge, w.x, w.y, w.w, w.h]), [['top', l + k, u, 300 - k * 2, t], ['bottom', l + k, d - t, 300 - k * 2, t], ['left', l, u + k, t, 300 - k * 2], ['right', r - t, u + k, t, 300 - k * 2]])
  const rd = v => Math.round(v * 10) / 10
  const A = rd(l + k), B = rd(r - k), C = rd(u + k), D = rd(d - k)
  assert.deepEqual(solid(walls), [
    // outside, clockwise from the left wall
    `${l},${C}-${l},${D} left`, `${l},${C}-${A},${u} upleft`, `${A},${u}-${B},${u} up`, `${B},${u}-${r},${C} upright`,
    `${r},${C}-${r},${D} right`, `${B},${d}-${r},${D} downright`, `${A},${d}-${B},${d} down`, `${l},${D}-${A},${d} downleft`,
    // inside
    `${l + t},${C}-${l + t},${D} right`, `${l + t},${C}-${A},${u + t} downright`, `${A},${u + t}-${B},${u + t} down`, `${B},${u + t}-${r - t},${C} downleft`,
    `${r - t},${C}-${r - t},${D} left`, `${B},${d - t}-${r - t},${D} upleft`, `${A},${d - t}-${B},${d - t} up`, `${l + t},${D}-${A},${d - t} upright`,
  ].sort())
  // on the ground the block keeps its bottom corners: its side walls go all the way down
  const low = M.mineWalls(M.createMineGrid(g, { bombs: 0, seed: 1, free: free.filter(f => f.r !== 0 || f.c !== 1).concat({ c: 1, r: 1 }) }))
  assert.deepEqual(low.map(w => w.edge), ['top', 'bottom', 'left', 'tl', 'right', 'tr'])
  assert.deepEqual(low.filter(w => w.edge === 'left' || w.edge === 'bottom').map(w => [w.x, w.y, w.w, w.h]), [[l, 930 - t, 300, t], [l, 630 + k, t, 300 - k]])
  // a small cut, under the walls' thickness: the room stays square inside
  const small = M.mineGeometry({ cell: 300, gap: 30, corner: 10 }, { width: 960, top: 930 - 960, ground: 930 })
  const few = solid(M.mineWalls(M.createMineGrid(small, { bombs: 0, seed: 1, free })))
  assert.equal(few.length, 12)
  assert.equal(few.filter(f => / (up|down)(left|right)$/.test(f)).length, 4)
})

test('with cut corners and no gap, the frontier goes round a closed block from one slanted wall to the next', () => {
  // 2 x 3 of 320, only (0,1) open: the corner where (0,1), (1,1), (0,0) and (1,0) meet is at (320, 610)
  const g = M.mineGeometry({ cell: 320, gap: 0, corner: 100 }, { width: 640, top: 930 - 960, ground: 930 })
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1, free: [{ c: 0, r: 1 }] })
  const k = Math.round(g.cut * 10) / 10, t = M.mineWallThickness(g)
  const walls = M.mineWalls(grid)
  // (1,0), below and beside the open block's corner, has no wall of its own there: only its corner's piece
  assert.deepEqual(walls.filter(w => w.c === 1 && w.r === 0).map(w => w.edge), ['tl', 'right', 'tr'])
  const out = solid(walls)
  // seen from the open block, around that corner: the floor's slope down, the next block's slope up, its wall
  for (const f of [`${320 - k},610-320,${610 + k} upright`, `320,${610 + k}-${320 + k},610 upleft`, `320,${610 - k}-${320 + k},610 downleft`, `320,${290 + k}-320,${610 - k} left`]) assert.equal(out.includes(f), true, f)
  // ...and from the closed side, the same three slants further in
  for (const f of [`${320 - k},${610 + t}-320,${610 + k + t} downleft`, `320,${610 + k + t}-${320 + k + t},610 downright`]) assert.equal(out.includes(f), true, f)
  // where two pieces meet, neither leaves an end as a surface
  assert.equal(out.some(f => /^320,[\d.]+-320,[\d.]+ /.test(f) && !f.startsWith(`320,${290 + k}-`)), false)
  // four closed blocks around a corner: nothing there
  const full = M.mineWalls(M.createMineGrid(g, { bombs: 0, seed: 1 }))
  assert.equal(full.some(w => w.id === 'mine-0-0-tr' || w.id === 'mine-1-0-tl' || w.id === 'mine-0-1-br'), false)
})

test('with cut corners a plug stands only between the straight sides: the cuts stay open for every body, as drawn', () => {
  // (0,1) and (1,1) closed side by side among open blocks, 3 x 3 of 300 with a gap of 30
  const g = M.mineGeometry({ cell: 300, gap: 30, corner: 100 }, { width: 960, top: 930 - 960, ground: 930 })
  const free = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (r !== 1 || c === 2) free.push({ c, r })
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1, free })
  const plugs = M.minePlugs(grid), k = Math.round(g.cut * 10) / 10
  // the shaft's plug: from the end of the top cuts to the start of the bottom ones
  assert.deepEqual(plugs.map(p => [p.id, p.kind, p.fit, p.x, Math.round(p.y * 10) / 10, p.w, Math.round(p.h * 10) / 10]), [['mine-0-1-shaft', 'shaft', 30, 300, 300 + k, 30, Math.round((300 - g.cut * 2) * 10) / 10]])
  const big = solid([...M.mineWalls(grid), ...plugs])
  // a valley over the plug: the left block's slope down, the plug's top, the right block's slope up
  for (const f of [`${300 - k},300-300,${300 + k} upright`, `300,${300 + k}-330,${300 + k} up`, `330,${300 + k}-${330 + k},300 upleft`]) assert.equal(big.includes(f), true, f)
  // ...and the same upside down under it; nothing stands at the blocks' square corners, and the plug has no side
  for (const f of [`${300 - k},600-300,${600 - k} downright`, `300,${600 - k}-330,${600 - k} down`]) assert.equal(big.includes(f), true, f)
  assert.equal(big.some(f => f.endsWith(' up') && /^(300|330),300-/.test(f)), false)
  assert.equal(big.some(f => /^(300|330),[\d.]+-\1,/.test(f)), false)
  // a body that fits has the same slopes, and the gap between them
  const little = solid(M.mineWalls(grid))
  assert.equal(little.includes(`${300 - k},300-300,${300 + k} upright`), true)
  assert.equal(little.includes(`300,${300 + k}-330,${300 + k} up`), false)

  // one closed block over another, open blocks beside them: the corridor's plug stops at the cuts, so the wedge
  // between the two slanted walls is free and no wall stands at the blocks' square corners (x 330 and 630)
  const stack = M.createMineGrid(g, { bombs: 0, seed: 1, free: free.filter(f => f.c !== 1 || f.r !== 2).concat({ c: 0, r: 1 }) })
  const cork = M.minePlugs(stack)
  assert.deepEqual(cork.map(p => [p.id, Math.round(p.x * 10) / 10, p.y, Math.round(p.w * 10) / 10, p.h]), [['mine-1-1-corridor', 330 + k, 270, Math.round((300 - g.cut * 2) * 10) / 10, 30]])
  const wedge = solid([...M.mineWalls(stack), ...cork])
  for (const f of [`330,${300 + k}-${330 + k},300 upleft`, `330,${270 - k}-${330 + k},270 downleft`, `${330 + k},270-${330 + k},300 left`]) assert.equal(wedge.includes(f), true, f)
  assert.equal(wedge.some(f => /^330,(2[4-9]\d|3[0-4]\d)[\d.]*-330,/.test(f)), false)

  // four closed blocks around a crossing: with cuts it is a diamond wider than the gap, so no plug in its middle
  assert.equal(M.minePlugs(M.createMineGrid(g, { bombs: 0, seed: 1 })).some(p => p.kind === 'cross'), false)
})

// the pieces as the engine reads them (engine.ts, buildSegs), fused: segments with their outside and where they lead
function engineSegs(pieces) {
  const boxes = [], joins = []
  const segs = pieces.flatMap(b => {
    const shape = b.shape ?? [[0, 0], [b.w, 0], [b.w, b.h], [0, b.h]]
    if (b.shape) joins.push({ id: b.id, poly: shape.map(([x, y]) => [b.x + x, b.y + y]), left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h })
    else boxes.push({ id: b.id, group: b.group, left: b.x, top: b.y, right: b.x + b.w, bottom: b.y + b.h })
    const cross = b.cross ? { key: 'closed', reach: b.cross, ...(b.skip ? { skip: b.skip } : {}) } : undefined
    return Hd.shapeEdges(shape).map(({ i, a, b: e, kind, n }) => ({
      id: `${b.id}:${kind[0]}${i}`, ax: b.x + a[0], ay: b.y + a[1], bx: b.x + e[0], by: b.y + e[1], len: Math.hypot(e[0] - a[0], e[1] - a[1]), anchorX: b.x + a[0],
      wall: kind !== 'floor', ...(kind === 'ceil' ? { ceil: true } : {}), hardN: n, ...(b.shape ? { join: b.id } : { fused: b.id }),
      ...(cross && (kind === 'wall') === (b.h > b.w) ? { cross } : {}),
    })).filter(f => f.len >= 4)
  })
  return Hd.fuseFaces(segs, boxes, joins)
}

test('with cut corners and a gap, a slanted wall leads to the closed block on its diagonal, past its own outer face', () => {
  // 3 x 3 of 300, gap 30, regular octagons, all closed: (1,1) is x 330 to 630, y 300 to 600; (0,0) x 0 to 300, y 630 to 930
  const g = M.mineGeometry({ cell: 300, gap: 30, corner: 100 }, { width: 960, top: 930 - 960, ground: 930 })
  const grid = M.createMineGrid(g, { bombs: 0, seed: 1 })
  const k = g.cut, t = M.mineWallThickness(g), walls = M.mineWalls(grid)
  const piece = id => walls.find(w => w.id === id)
  const reach = Math.SQRT2 * (30 + k + t)
  for (const id of ['mine-1-1-bl', 'mine-1-1-tl', 'mine-1-1-tr', 'mine-1-1-br', 'mine-0-0-tr', 'mine-0-1-br']) {
    assert.ok(Math.abs(piece(id).cross - reach) < 1e-9, id)
    assert.equal(piece(id).skip, t, id)
  }
  // nothing on that diagonal: outside the grid (the top row's top corners, the ends) or an open block
  for (const id of ['mine-0-2-tl', 'mine-1-2-tr', 'mine-0-1-tl', 'mine-0-1-bl', 'mine-2-1-br']) assert.equal(piece(id).cross, undefined, id)
  const open = M.mineWalls(M.createMineGrid(g, { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }] }))
  assert.equal(open.find(w => w.id === 'mine-1-1-bl').cross, undefined)
  assert.ok(open.find(w => w.id === 'mine-1-1-tl').cross > 0)
  // no gap, or a cut under the walls' thickness (no slanted floor inside): no diagonal
  const tight = M.mineWalls(M.createMineGrid(M.mineGeometry({ cell: 300, gap: 0, corner: 100 }, { width: 960, top: 930 - 960, ground: 930 }), { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }] }))
  assert.equal(tight.some(w => w.shape && w.cross !== undefined), false)
  const small = M.mineWalls(M.createMineGrid(M.mineGeometry({ cell: 300, gap: 30, corner: 10 }, { width: 960, top: 930 - 960, ground: 930 }), { bombs: 0, seed: 1 }))
  assert.equal(small.some(w => w.shape && w.cross !== undefined), false)

  // what the engine finds behind them (crossTarget), for a body that does not fit in the gap
  const segs = engineSegs([...walls, ...M.minePlugs(grid)])
  const at = (x, y, dx, dy) => segs.find(f => f.hardN && Math.abs(f.hardN[0] - dx) < 0.01 && Math.abs(f.hardN[1] - dy) < 0.01 && Math.abs((x - f.ax) * f.hardN[0] + (y - f.ay) * f.hardN[1]) < 0.01 && Math.min(f.ax, f.bx) - 0.5 <= x && x <= Math.max(f.ax, f.bx) + 0.5)
  const s = Math.SQRT1_2
  // standing on the slanted floor of (1,1)'s bottom left corner, in its middle: the slanted ceiling of (0,0)'s top right
  const fx = (330 + t + 330 + k) / 2, fy = (600 - k + 600 - t) / 2
  const floor = at(fx, fy, s, -s)
  assert.ok(floor && floor.cross && floor.cross.skip === t, 'the slanted floor leads through')
  const down = Hd.crossTarget(segs, floor.hardN, fx, fy, floor.cross.reach, floor.cross.skip)
  assert.ok(down)
  assert.match(down.to.id, /^mine-0-0-tr:/)
  assert.ok(Math.abs(down.d - reach) < 0.01)
  assert.ok(Math.abs(down.x - (300 - (t + k) / 2)) < 0.01 && Math.abs(down.y - (630 + (t + k) / 2)) < 0.01)
  // ...without the skip it would be the corner's own outer face, in the diamond between the four blocks
  assert.match(Hd.crossTarget(segs, floor.hardN, fx, fy, floor.cross.reach).to.id, /^mine-1-1-bl:/)
  // standing where the slanted floor meets the flat one, still on the diagonal room's slanted ceiling
  const end = Hd.crossTarget(segs, floor.hardN, 330 + t + 2, 600 - k + 2, floor.cross.reach, floor.cross.skip)
  assert.match(end.to.id, /^mine-0-0-tr:/)
  // hanging under the slanted ceiling of (1,1)'s top left corner: the slanted floor of (0,2)'s bottom right
  const cx = (330 + t + 330 + k) / 2, cy = (300 + k + 300 + t) / 2
  const ceil = at(cx, cy, s, s)
  assert.ok(ceil && ceil.cross)
  assert.match(Hd.crossTarget(segs, ceil.hardN, cx, cy, ceil.cross.reach, ceil.cross.skip).to.id, /^mine-0-2-br:/)
  // the straight floor of (1,1) still leads to the ceiling of (1,0), right below
  const flat = at(480, 600 - t, 0, -1)
  assert.match(Hd.crossTarget(segs, flat.hardN, 480, 600 - t, flat.cross.reach, flat.cross.skip).to.id, /^mine-1-0-top/)
})

test('out of a room into the gap only by Trocar de bloco: any other way out of the rooms is the open side', () => {
  // (0,0) open; (1,0) is x 336 to 624 and (2,0) starts at 656, walls 12 thick
  const grid = M.createMineGrid(geo(), { bombs: 0, seed: 1, free: [{ c: 0, r: 0 }] })
  const step = (last, x, y, crossed = false) => M.mineSideNext(grid, x, y, last, crossed)
  const room = step({ side: 'open', crossed: false }, 480, 800)
  assert.deepEqual(room, { side: 'closed', crossed: false })
  // slipped through the wall into the gap between (1,0) and (2,0)
  assert.deepEqual(step(room, 640, 800), { side: 'open', crossed: false })
  // ...through the wall's thickness first: it keeps the side there, and the gap is still a way out
  const wall = step(room, 618, 800)
  assert.deepEqual(wall, { side: 'closed', crossed: false })
  assert.deepEqual(step(wall, 640, 800), { side: 'open', crossed: false })
  // Trocar de bloco into the gap: the closed side, along the gap too, until she is in a room again or out of the gap
  const gap = step(room, 640, 800, true)
  assert.deepEqual(gap, { side: 'closed', crossed: true })
  assert.deepEqual(step(gap, 640, 700), { side: 'closed', crossed: true })
  assert.deepEqual(step(gap, 660, 800), { side: 'closed', crossed: true })
  assert.deepEqual(step(gap, 480, 800), { side: 'closed', crossed: false })
  assert.deepEqual(step(gap, 310, 800), { side: 'open', crossed: false })
  // from the open side the gap stays open
  assert.deepEqual(step({ side: 'open', crossed: false }, 640, 800), { side: 'open', crossed: false })
  // without a gap the closed blocks share their space: the diamond where four of them meet is inside
  const g0 = M.mineGeometry({ cell: 320, gap: 0, corner: 100 }, { width: 640, top: 930 - 960, ground: 930 })
  const shared = M.createMineGrid(g0, { bombs: 0, seed: 1 })
  assert.equal(M.mineCellAt(g0, 320, 610), null)
  assert.deepEqual(M.mineSideNext(shared, 320, 610, { side: 'closed', crossed: false }, false), { side: 'closed', crossed: false })
})

test('the Bomba is a bundle of dynamite with a timer: lit with the seconds left when armed, off when disarmed', () => {
  const A = loadTs('lib/pigchicken/mine-bomb-art.ts')
  assert.deepEqual([A.mineBombTime(10), A.mineBombTime(6.2), A.mineBombTime(67.4), A.mineBombTime(0), A.mineBombTime(-3), A.mineBombTime(1e6)], ['0010', '0007', '0108', '0000', '0000', '9959'])
  const off = A.mineBombSvg(), ten = A.mineBombSvg({ time: 10 }), seven = A.mineBombSvg({ time: 7 })
  // lit digits only on an armed one, and they change with the time
  assert.equal(off.includes('#ff3b30'), false)
  assert.equal(ten.includes('#ff3b30'), true)
  assert.notEqual(ten, seven)
  assert.equal(A.mineBombSvg({ time: 6.2 }), seven)
  // the item is the disarmed one, drawn in its box
  const art = loadTs('lib/pigchicken/art.ts')
  assert.equal(art.ITEM_SVG.minebomb, off)
  assert.deepEqual(art.ITEM_BOX.minebomb, A.MINE_BOMB_BOX)
  for (const m of off.matchAll(/(?:x|cx)="(-?[\d.]+)"/g)) assert.ok(Number(m[1]) >= A.MINE_BOMB_BOX[0] && Number(m[1]) <= A.MINE_BOMB_BOX[0] + A.MINE_BOMB_BOX[2], m[0])
})

test('a slanted edge at 45° is a floor or a ceiling whatever its points lost on the way to the engine', () => {
  const lost = 1e-13
  const kinds = Hd.shapeEdges([[100, 0], [200 + lost, 100 + lost * 3], [100, 100]]).map(e => e.kind)
  assert.deepEqual(kinds, ['floor', 'ceil', 'wall'])
  assert.equal(Hd.shapeEdges([[100, 0], [199, 100], [100, 100]])[0].kind, 'wall')
})

test('the example Pátio "Campo minado" survives saving and starts a round: three free blocks to be born in, two closed ones', () => {
  const E = loadTs('lib/pigchicken/example-minefield.ts'), L = loadTs('lib/pigchicken/layout.ts'), SP = loadTs('lib/pigchicken/spawn-portals.ts')
  const PS = loadTs('lib/pigchicken/patio-settings.ts'), W = loadTs('lib/pigchicken/world.ts'), SEED = loadTs('lib/pigchicken/example-seed.ts'), I = loadTs('lib/pigchicken/items.ts')
  const layout = E.minefieldLayout()
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(layout))), layout)
  assert.deepEqual(E.minefieldLayout(), layout)
  const screens = layout.settings.screens, els = L.elementsInWorld(layout, screens)
  assert.equal(els.length, layout.elements.length)
  assert.ok(els.every(e => e.x >= 0 && e.x + e.w <= W.worldScenes(screens) * W.SCENE_W && e.y >= PS.patioWorldTop(layout.settings)))
  // the grid as the Pátio's screen draws it
  const p = PS.patioMineGrid(layout.settings)
  assert.ok(p && p.on)
  const geo = M.mineGeometry(p, { left: M.MINE_MARGIN.side, width: screens * W.SCENE_W - M.MINE_MARGIN.side * 2, top: PS.patioWorldTop(layout.settings) + M.MINE_MARGIN.top, ground: W.WORLD_GROUND_Y })
  assert.deepEqual(geo, E.minefieldGeometry())
  assert.deepEqual([geo.cols, geo.rows], [13, 4])
  // the portals: one entry, the chances as written, each in its block
  const portals = L.spawnPortalsIn(els)
  assert.equal(portals.filter(e => e.kind === 'entry').length, 1)
  assert.deepEqual(SP.spawnChances(portals), E.MINEFIELD_SPAWNS.map(s => s.chance))
  const blockOf = e => { const s = M.mineNearestCell(geo, e.x + e.w / 2, e.y + e.h / 2); return [s.c, s.r] }
  assert.deepEqual(portals.map(blockOf), E.MINEFIELD_SPAWNS.map(s => s.at))
  assert.deepEqual(portals.map(e => SP.isFreeBlock(e)), E.MINEFIELD_SPAWNS.map(s => s.free))
  const inside = e => { const [c, r] = blockOf(e), k = M.mineCellRect(geo, c, r), t = M.mineWallThickness(geo); return e.x >= k.x + t && e.x + e.w <= k.x + k.w - t && e.y >= k.y + t && e.y + e.h <= k.y + k.h + (r === 0 ? 6 : -t + 6) }
  portals.forEach(e => assert.ok(inside(e), e.id))
  // a round of it: the free blocks open, without a bomb; the closed side's portals inside closed blocks
  const grid = M.createMineGrid(geo, { bombs: p.bombs, seed: 5, free: portals.filter(SP.isFreeBlock).map(e => { const [c, r] = blockOf(e); return { c, r } }) })
  E.MINEFIELD_SPAWNS.forEach(s => { const k = M.mineCell(grid, ...s.at); assert.equal(k.open, s.free); if (s.free) assert.equal(k.bomb, false) })
  // what waits in the blocks: racks and Baús standing inside them, with items a rack may hold
  const racks = els.filter(e => e.kind === 'rack'), chests = els.filter(e => e.kind === 'chest')
  assert.equal(racks.length, E.MINEFIELD_SPAWNS.reduce((n, s) => n + s.items.length, 0) + E.MINEFIELD_ITEMS.length)
  assert.equal(chests.length, E.MINEFIELD_CHESTS.length)
  ;[...racks, ...chests].forEach(e => assert.ok(inside(e), e.id))
  racks.forEach(e => assert.ok(I.RACK_ITEM_IDS.includes(e.params.item), e.params.item))
  assert.deepEqual(racks.map(e => e.params.item).sort(), [...E.MINEFIELD_SPAWNS.flatMap(s => s.items), ...E.MINEFIELD_ITEMS.map(i => i.item)].sort())
  // above the ground row each of them stands on its block's shelf, where the block's floor is (the items rest on it)
  const shelvesOf = els.filter(e => e.kind === 'platform')
  ;[...portals, ...racks, ...chests].forEach(e => {
    const [c, r] = blockOf(e), k = M.mineCellRect(geo, c, r), floor = r === 0 ? W.WORLD_GROUND_Y : k.y + k.h - M.mineWallThickness(geo)
    // (without itself: a rack's own table holds up what is dropped on it)
    assert.equal(L.layoutFloorBelow(els.filter(o => o !== e), e.x + e.w / 2, e.y), floor, e.id)
    assert.equal(shelvesOf.filter(s => s.y === floor && s.x <= e.x && s.x + s.w >= e.x + e.w).length, r === 0 ? 0 : 1, e.id)
  })
  assert.equal(shelvesOf.length, new Set([...portals, ...racks, ...chests].map(blockOf).filter(([, r]) => r > 0).map(String)).size)
  // in a block that may hide a bomb, no item stands where it is drawn (the middle of the block, 36% of it wide)
  const [, , bw, bh] = loadTs('lib/pigchicken/mine-bomb-art.ts').MINE_BOMB_BOX
  ;[...racks, ...chests].forEach(e => {
    const [c, r] = blockOf(e), k = M.mineCellRect(geo, c, r), mx = k.x + k.w / 2, my = k.y + k.h / 2, hw = k.w * 0.18, hh = (hw * bh) / bw
    assert.ok(M.mineCell(grid, c, r).free || e.x + e.w <= mx - hw || e.x >= mx + hw || e.y + e.h <= my - hh || e.y >= my + hh, e.id)
  })
  const ex = SEED.EXAMPLE_PATIOS.find(e => e.name === 'Campo minado')
  assert.ok(ex)
  assert.deepEqual(ex.layout(), layout)
  assert.equal(new Set(SEED.EXAMPLE_PATIOS.map(e => e.id)).size, SEED.EXAMPLE_PATIOS.length)
})

