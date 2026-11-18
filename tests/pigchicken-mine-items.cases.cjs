const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const P = loadTs('lib/pigchicken/mine-item-params.ts')
const I = loadTs('lib/pigchicken/mine-items.ts')
const G = loadTs('lib/pigchicken/mine-grid.ts')

const geo = G.mineGeometry({ cell: 288, gap: 32 }, { left: 72, width: 4000, top: 120, ground: 1200 })
const blocks = geo.cols * geo.rows

test('"Spawn de itens" defaults: 15% of the blocks, up to 2 items, 33% each group, 10% each item', () => {
  assert.deepEqual(P.normalizeMineItems(undefined), { chance: 15, max: 2, groups: { weapons: 33, instruments: 33, utilities: 33 }, weights: {}, seed: 1 })
  assert.deepEqual(G.normalizeMineGrid({ on: true }).items, P.defaultMineItems())
  const n = P.normalizeMineItems({ chance: 140, max: 0, groups: { weapons: -3, instruments: 50.4 }, weights: { pistol: 10, flute: 70, nope: 5, cage: 40 }, seed: -9 })
  assert.deepEqual(n, { chance: 100, max: 1, groups: { weapons: 0, instruments: 50, utilities: 33 }, weights: { flute: 70 }, seed: 9 })
  // the default chance of an item is not kept
  assert.deepEqual(P.setMineItemWeight(n, 'flute', 10).weights, {})
  assert.equal(P.mineItemWeight(n, 'flute'), 70)
  assert.equal(P.mineItemWeight(n, 'sax'), 10)
})

test('the groups are the inventory\'s: weapons, instruments and utilities, no cages', () => {
  const ids = Object.fromEntries(P.MINE_ITEM_GROUPS.map(g => [g.id, g.items]))
  assert.ok(ids.weapons.includes('pistol') && ids.instruments.includes('flute') && ids.utilities.includes('minebomb') && ids.utilities.includes('bat'))
  assert.ok(!P.MINE_ITEM_GROUPS.some(g => g.items.includes('cage')))
})

test('the chance is the share of blocks born with items, each with 1 to max of them', () => {
  const none = I.mineItemSpots(geo, { ...P.defaultMineItems(), chance: 0 })
  assert.equal(none.length, 0)
  const all = I.mineItemSpots(geo, { ...P.defaultMineItems(), chance: 100, max: 3 })
  assert.equal(all.length, blocks)
  assert.ok(all.every(s => s.items.length >= 1 && s.items.length <= 3))
  assert.ok(all.some(s => s.items.length === 3))
  const some = I.mineItemSpots(geo, { ...P.defaultMineItems(), chance: 50 })
  assert.ok(some.length > blocks * 0.25 && some.length < blocks * 0.75)
  // a higher chance keeps the blocks (and their platforms and items) that already had items
  const more = I.mineItemSpots(geo, { ...P.defaultMineItems(), chance: 80 })
  for (const s of some) assert.deepEqual(more.find(o => o.c === s.c && o.r === s.r), s)
})

test('the same seed draws the same everywhere; another seed draws again', () => {
  const p = { ...P.defaultMineItems(), chance: 60 }
  assert.deepEqual(I.mineItemSpots(geo, p), I.mineItemSpots(geo, p))
  assert.notDeepEqual(I.mineItemSpots(geo, { ...p, seed: 77 }), I.mineItemSpots(geo, p))
})

test('the platform stands inside the block, in its middle height, with the items over it', () => {
  const wall = G.mineWallThickness(geo)
  for (const s of I.mineItemSpots(geo, { ...P.defaultMineItems(), chance: 100, max: 6 })) {
    const b = G.mineCellRect(geo, s.c, s.r), f = s.platform
    assert.ok(f.x >= b.x + wall && f.x + f.w <= b.x + b.w - wall, 'inside the walls')
    const up = (b.y + b.h - wall - f.y) / (geo.cell - 2 * wall)
    assert.ok(up >= 0.24 && up <= 0.56, `height ${up}`)
    assert.ok(s.items.every(it => it.x > f.x && it.x < f.x + f.w))
  }
})

test('groups and items at 0 never come out; only one left, only it comes out', () => {
  const p = { ...P.defaultMineItems(), chance: 100, max: 6, groups: { weapons: 0, instruments: 33, utilities: 0 } }
  const only = P.MINE_ITEM_GROUPS[1].items.slice(1).reduce((o, id) => P.setMineItemWeight(o, id, 0), p)
  const items = I.mineItemSpots(geo, only).flatMap(s => s.items.map(i => i.item))
  assert.ok(items.length > 0)
  assert.deepEqual([...new Set(items)], [P.MINE_ITEM_GROUPS[1].items[0]])
  // every group at 0: nothing at all
  assert.equal(I.mineItemSpots(geo, { ...p, groups: { weapons: 0, instruments: 0, utilities: 0 } }).length, 0)
  // a group whose items are all at 0 does not take the draw
  const empty = P.MINE_ITEM_GROUPS[0].items.reduce((o, id) => P.setMineItemWeight(o, id, 0), { ...p, groups: { weapons: 100, instruments: 1, utilities: 0 } })
  assert.ok(I.mineItemSpots(geo, empty).every(s => s.items.every(i => P.MINE_ITEM_GROUPS[1].items.includes(i.item))))
})

test('the group chances share the draw in proportion', () => {
  const p = { ...P.defaultMineItems(), chance: 100, max: 6 }
  const count = { weapons: 0, instruments: 0, utilities: 0 }
  for (let seed = 1; seed <= 20; seed++) for (const s of I.mineItemSpots(geo, { ...p, seed })) for (const it of s.items) count[P.MINE_ITEM_GROUPS.find(g => g.items.includes(it.item)).id]++
  const total = count.weapons + count.instruments + count.utilities
  for (const n of Object.values(count)) assert.ok(Math.abs(n / total - 1 / 3) < 0.05, JSON.stringify(count))
})

test('the spots become a platform and loose items standing on it, named by the round', () => {
  const spots = I.mineItemSpots(geo, { ...P.defaultMineItems(), chance: 100, max: 2 }).slice(0, 2)
  const els = I.mineItemElements(spots, 7)
  assert.equal(els.length, spots.reduce((n, s) => n + 1 + s.items.length, 0))
  const plat = els[0], loose = els.filter(e => e.kind === 'loose')
  assert.equal(plat.kind, 'platform'); assert.equal(plat.solid, true)
  assert.deepEqual([plat.x, plat.y, plat.w, plat.h], [spots[0].platform.x, spots[0].platform.y, spots[0].platform.w, spots[0].platform.h])
  assert.ok(plat.id.startsWith('mine-items:7:'))
  assert.ok(loose.every(e => e.params.item && e.id.startsWith('mine-items:7:')))
  assert.equal(els[1].y + els[1].h, plat.y)
  assert.equal(els[1].x + els[1].w / 2, spots[0].items[0].x)
  // a new round, new names: the items taken come back
  assert.ok(I.mineItemElements(spots, 8).every(e => !els.some(o => o.id === e.id)))
})
