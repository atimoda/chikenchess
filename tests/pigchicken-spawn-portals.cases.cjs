const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const S = loadTs('lib/pigchicken/spawn-portals.ts')

const sum = list => list.reduce((a, b) => a + b, 0)
const portal = (id, spawnChance, kind = 'spawn') => ({ id, kind, params: spawnChance === undefined ? {} : { spawnChance } })

test('the chances are whole percents that always add up to 100', () => {
  assert.deepEqual(S.shareOut([]), [])
  assert.deepEqual(S.shareOut([5]), [100])
  assert.deepEqual(S.shareOut([1, 1, 1]), [34, 33, 33])
  assert.deepEqual(S.shareOut([0, 0]), [50, 50])
  assert.deepEqual(S.shareOut([30, 20], 20), [12, 8])
  assert.deepEqual(S.shareOut([NaN, -4, 2]), [0, 0, 100])
  for (const weights of [[1, 2, 3, 4, 5, 6, 7], [0.1, 0.1, 0.1], [99, 1, 1, 1]]) assert.equal(sum(S.shareOut(weights)), 100)
})

test('a single portal is always 100%; saved chances are read in proportion and a portal without one takes an equal part', () => {
  assert.deepEqual(S.spawnChances([]), [])
  assert.deepEqual(S.spawnChances([portal('entry-portal', 7, 'entry')]), [100])
  assert.deepEqual(S.spawnChances([portal('a', undefined, 'entry'), portal('b')]), [50, 50])
  assert.deepEqual(S.spawnChances([portal('a', 50), portal('b', 30), portal('c', 20)]), [50, 30, 20])
  assert.deepEqual(S.spawnChances([portal('a', 100), portal('b', 100)]), [50, 50])
  assert.deepEqual(S.spawnChances([portal('a', 0), portal('b', 0)]), [50, 50])
  // one without a chance among others that have it: 100 / n for it, the rest in their proportion
  assert.deepEqual(S.spawnChances([portal('a', 75), portal('b', 25), portal('c'), portal('d')]), [38, 12, 25, 25])
})

test('moving a slider shares the difference among the others in proportion (equally when they were all at 0)', () => {
  assert.deepEqual(S.setChance([50, 30, 20], 0, 80), [80, 12, 8])
  assert.deepEqual(S.setChance([50, 30, 20], 1, 0), [71, 0, 29])
  assert.deepEqual(S.setChance([100, 0, 0], 0, 40), [40, 30, 30])
  assert.deepEqual(S.setChance([50, 50], 1, 100), [0, 100])
  assert.deepEqual(S.setChance([50, 50], 0, 250), [100, 0])
  assert.deepEqual(S.setChance([50, 50], 0, -3), [0, 100])
  assert.deepEqual(S.setChance([100], 0, 30), [100])
  for (let v = 0; v <= 100; v += 7) assert.equal(sum(S.setChance([33, 33, 34], 2, v)), 100)
})

test('the draw follows the chances and never picks a portal at 0%', () => {
  assert.equal(S.pickSpawn([], 0.5), -1)
  assert.equal(S.pickSpawn([100], 0.99), 0)
  assert.equal(S.pickSpawn([50, 30, 20], 0), 0)
  assert.equal(S.pickSpawn([50, 30, 20], 0.4999), 0)
  assert.equal(S.pickSpawn([50, 30, 20], 0.5), 1)
  assert.equal(S.pickSpawn([50, 30, 20], 0.8), 2)
  assert.equal(S.pickSpawn([50, 30, 20], 1), 2)
  assert.equal(S.pickSpawn([0, 100, 0], 0), 1)
  assert.equal(S.pickSpawn([0, 100, 0], 0.9999), 1)
  const counts = [0, 0, 0]
  for (let i = 0; i < 1000; i++) counts[S.pickSpawn([80, 20, 0], (i + 0.5) / 1000)]++
  assert.deepEqual(counts, [800, 200, 0])
})

test('a portal that joins takes an equal part and one that leaves gives its part back; alone, the entry keeps no chance', () => {
  const el = (id, kind, spawnChance) => ({ id, kind, params: spawnChance === undefined ? {} : { spawnChance } })
  const chances = list => list.filter(S.isSpawnPortal).map(e => e.params.spawnChance)
  const one = [el('rock', 'platform'), el('entry-portal', 'entry')]
  // nothing to write with a single portal: the same array comes back
  assert.equal(S.rebalanceSpawnPortals(one, one), one)
  const two = S.rebalanceSpawnPortals(one, [...one, el('s1', 'spawn')])
  assert.deepEqual(chances(two), [50, 50])
  assert.deepEqual(two[0], one[0])
  const moved = S.setSpawnChance(two, 'entry-portal', 80)
  assert.deepEqual(chances(moved), [80, 20])
  // a third one: 100 / 3 for it, the others shrink in proportion (80:20 of what is left)
  const three = S.rebalanceSpawnPortals(moved, [...moved, el('s2', 'spawn', 20)])
  assert.deepEqual(chances(three), [54, 13, 33])
  // the plan's example
  const plan = [el('rock', 'platform'), el('entry-portal', 'entry', 50), el('s1', 'spawn', 30), el('s2', 'spawn', 20)]
  assert.deepEqual(chances(plan), [50, 30, 20])
  assert.deepEqual(chances(S.setSpawnChance(plan, 'entry-portal', 80)), [80, 12, 8])
  // one leaves: its part goes back in proportion
  assert.deepEqual(chances(S.rebalanceSpawnPortals(plan, plan.filter(e => e.id !== 's2'))), [63, 37])
  // all the others at 0: equal parts
  const zeros = S.setSpawnChance(plan, 's2', 100)
  assert.deepEqual(chances(zeros), [0, 0, 100])
  assert.deepEqual(chances(S.rebalanceSpawnPortals(zeros, zeros.filter(e => e.id !== 's2'))), [50, 50])
  // back to a single portal: no chance is kept
  const alone = S.rebalanceSpawnPortals(plan, plan.filter(e => e.kind !== 'spawn'))
  assert.deepEqual(alone.find(e => e.kind === 'entry').params, {})
  // an unknown id or a single portal changes nothing
  assert.equal(S.setSpawnChance(plan, 'nope', 10), plan)
  assert.equal(S.setSpawnChance(one, 'entry-portal', 10), one)
})

test('the layout keeps any number of Portais de nascimento, their size and chance, next to the single entry portal', () => {
  const L = loadTs('lib/pigchicken/layout.ts')
  const a = L.createElement('spawn', 900, 400), b = L.createElement('spawn', 1500, 300)
  assert.equal(L.ELEMENT_DEFS.spawn.label, 'Portal de nascimento')
  assert.equal(a.solid, false); assert.equal(a.shots, false); assert.deepEqual(a.params, {})
  const entry = L.entryPortalElement()
  const saved = L.normalizeLayout(JSON.parse(JSON.stringify({ v: L.LAYOUT_VERSION, elements: [
    { ...a, w: 999, rot: 45, params: { spawnChance: 30.4, portalLabel: 'x' } },
    { ...entry, params: { spawnChance: 250 } },
    { ...b, params: { spawnChance: 'half' } },
  ] })))
  assert.deepEqual(saved.elements.map(e => e.kind), ['spawn', 'entry', 'spawn'])
  assert.deepEqual(saved.elements.map(e => e.params), [{ spawnChance: 30 }, { spawnChance: 100 }, {}])
  assert.equal(saved.elements[0].w, L.ELEMENT_DEFS.spawn.w); assert.equal(saved.elements[0].rot, 0)
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(saved))), saved)
  // in the world: the entry portal first, then the others in the layout's order; the game reads the chances in proportion
  const portals = L.spawnPortalsIn(L.elementsInWorld(saved, 4))
  assert.deepEqual(portals.map(e => e.id), [entry.id, a.id, b.id])
  assert.deepEqual(S.spawnChances(portals), [51, 16, 33])
  // a Pátio without any: only the entry portal, at 100%
  const alone = L.spawnPortalsIn(L.elementsInWorld(L.emptyLayout(), 4))
  assert.deepEqual(alone.map(e => e.kind), ['entry'])
  assert.deepEqual(S.spawnChances(alone), [100])
  // one past a narrower world's end takes no part there
  const far = L.normalizeLayout({ v: L.LAYOUT_VERSION, elements: [entry, { ...a, x: L.ELEMENT_DEFS.spawn.w + 6 * 1920 }] })
  assert.deepEqual(L.spawnPortalsIn(L.elementsInWorld(far, 1)).map(e => e.kind), ['entry'])
})
