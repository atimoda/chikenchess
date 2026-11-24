const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, memoryStorage } = require('./helpers/music.cjs')

const memory = new Map()
globalThis.window = { localStorage: memoryStorage(memory), location: { href: 'http://x.test/patio', search: '' }, history: { state: null, replaceState() {} } }
const layout = loadTs('lib/pigchicken/layout.ts')
const gen = loadTs('lib/pigchicken/patio-generator.ts')
const store = loadTs('lib/pigchicken/patio-store.ts')
const links = loadTs('lib/pigchicken/portal-links.ts')

const ID = '3f1d2c4b-1111-4222-8333-444455556666'

test('Empty is only the entry portal; Basic biome is nature over the whole width, the same for the same seed', () => {
  const empty = gen.generatePatioLayout({ kind: 'empty' })
  assert.deepEqual(empty.elements.map(e => e.kind), ['entry'])
  const a = gen.biomeLayout(60, 1234), b = gen.biomeLayout(60, 1234)
  assert.deepEqual(a, b)
  assert.equal(a.settings.screens, gen.GENERATED_SCREENS)
  assert.equal(a.elements.filter(e => e.kind === 'entry').length, 1)
  assert.ok(a.elements.some(e => e.kind === 'ground'))
  // every element is one the editor knows, and the layout stays valid and small enough for the database
  const again = layout.normalizeLayout(JSON.parse(JSON.stringify(a)))
  assert.equal(again.elements.length, a.elements.length)
  assert.ok(JSON.stringify(gen.biomeLayout(100, 9)).length < 400000)
  // the ground covers the Parquinho's width and the start by the entry portal stays clear of trees in front
  const ground = a.elements.filter(e => e.kind === 'ground')
  assert.ok(Math.max(...ground.map(e => e.x + e.w)) >= gen.GENERATED_SCREENS * 1920 - 1)
  assert.ok(a.elements.filter(e => e.kind === 'tree' && !e.depth).every(e => e.x + e.w / 2 >= 460))
})

test('the density goes from bare land (bushes only) to a dense forest', () => {
  const trees = (d, seed) => gen.biomeLayout(d, seed).elements.filter(e => e.kind === 'tree')
  for (const seed of [1, 2, 3]) {
    assert.ok(trees(0, seed).every(e => e.params.tree.style === 'shrub' && !e.depth))
    assert.ok(trees(0, seed).length > 0)
    assert.ok(trees(100, seed).length > trees(50, seed).length)
    assert.ok(trees(50, seed).length > trees(0, seed).length)
  }
})

test('a new Pátio comes from the default copy or from the generator', () => {
  memory.clear()
  assert.deepEqual(store.newPatio('device:me', { kind: 'empty' }).layout.elements.map(e => e.kind), ['entry'])
  const biome = store.newPatio('device:me', { kind: 'biome', density: 40, seed: 7 })
  assert.ok(biome.layout.elements.length > 5)
  assert.ok(store.newPatio('device:me').layout.elements.length > biome.layout.elements.length / 4)
})

test('a portal to another Pátio keeps its target, stands on its own and is copied on its own', () => {
  const single = layout.createPatioPortal(500, 500)
  assert.equal(single.params.portalTarget, '')
  assert.equal(layout.portalPartner(single, [single]), null)
  const linked = layout.normalizeElement({ ...single, params: { ...single.params, portalTarget: ID, portalTargetName: 'Ilha' } })
  assert.equal(linked.params.portalTarget, ID); assert.equal(linked.params.portalTargetName, 'Ilha')
  assert.equal(layout.normalizeElement({ ...single, params: { ...single.params, portalTarget: 'default' } }).params.portalTarget, 'default')
  // anything else is "not chosen yet"; a pair's portal without it still leads to its pair
  assert.equal(layout.normalizeElement({ ...single, params: { portalTarget: 'javascript:x' } }).params.portalTarget, '')
  const [a, b] = layout.createPortalPair(0, 0)
  assert.equal(layout.normalizeElement(a).params.portalTarget, undefined)
  assert.equal(layout.portalPartner(a, [a, b]).id, b.id)
  const copies = layout.duplicatePortalPair(linked, [linked])
  assert.equal(copies.length, 1); assert.notEqual(copies[0].id, linked.id); assert.equal(copies[0].params.portalTarget, ID)
  assert.equal(layout.duplicatePortalPair(a, [a, b]).length, 2)
  assert.equal(links.leadsToPatio(linked), true); assert.equal(links.leadsToPatio(a), false)
})

test('a target Pátio that no longer exists is told apart from one never saved or out of reach', () => {
  const s = links.patioTargetStatus
  assert.equal(s('default', null, 'offline'), 'ok')
  assert.equal(s('', null, { found: true }), 'missing')
  assert.equal(s(ID, null, { found: true }), 'ok')
  // gone from the database: missing, unless it is a copy made here that never reached it
  assert.equal(s(ID, null, { found: false }), 'missing')
  assert.equal(s(ID, { revision: 3 }, { found: false }), 'missing')
  assert.equal(s(ID, { revision: 0 }, { found: false }), 'ok')
  // without a server only this browser's copies count; without a connection it is not called gone
  assert.equal(s(ID, null, 'unavailable'), 'missing')
  assert.equal(s(ID, { revision: 0 }, 'unavailable'), 'ok')
  assert.equal(s(ID, null, 'offline'), 'offline')
  assert.equal(links.MISSING_PATIO_TEXT, 'Este pátio não existe mais...')
  assert.equal(links.targetLobbyId('default'), null); assert.equal(links.targetLobbyId(ID), ID)
})

test('Praça dos Portais, Sala de armas e Grid com loot: valid example Pátios whose portals lead to the right Pátios', () => {
  const seed = loadTs('lib/pigchicken/example-seed.ts')
  const menu = loadTs('lib/pigchicken/example-menu.ts')
  const items = loadTs('lib/pigchicken/items.ts')
  const grid = loadTs('lib/pigchicken/example-grid.ts')
  const byName = name => seed.EXAMPLE_PATIOS.find(e => e.name === name)
  const ids = new Set(seed.EXAMPLE_PATIOS.map(e => e.id))
  assert.equal(ids.size, seed.EXAMPLE_PATIOS.length)
  // only the square becomes the default Pátio
  assert.deepEqual(seed.EXAMPLE_PATIOS.filter(e => e.default).map(e => e.name), [menu.MENU_NAME])
  for (const name of [menu.MENU_NAME, 'Sala de armas e instrumentos', 'Grid com loot']) {
    const ex = byName(name), l = ex.layout()
    assert.ok(JSON.stringify(l).length < 400000, name)
    assert.deepEqual(layout.normalizeLayout(JSON.parse(JSON.stringify(l))).elements.length, l.elements.length, name)
    assert.equal(l.elements.filter(e => e.kind === 'entry').length, 1, name)
    const end = layout.worldEnd(l.settings.screens)
    for (const e of l.elements) if (e.kind !== 'zone') assert.ok(e.x + e.w / 2 < end, `${name}: ${e.id} inside the world`)
    assert.equal(new Set(l.elements.map(e => e.id)).size, l.elements.length, name)
  }
  // the square: one portal on its own to each Pátio, the name always shown
  const portals = byName(menu.MENU_NAME).layout().elements.filter(e => e.kind === 'portal')
  assert.deepEqual(portals.map(p => p.params.portalTarget).sort(), [...menu.MENU_MAIN, ...menu.MENU_MORE].map(([id]) => id).sort())
  for (const p of portals) {
    assert.ok(links.leadsToPatio(p) && p.params.portalPairId === '' && p.params.portalInstruction === 'always')
    // every target but the Training room (an older row of the database) is an example of the seed
    if (p.params.portalTarget !== menu.TRAINING_PATIO_ID) assert.ok(ids.has(p.params.portalTarget), p.params.portalLabel)
  }
  // the room: every item a rack can hold, once, coming back after 1 s
  const room = byName('Sala de armas e instrumentos').layout().elements
  const racks = room.filter(e => e.kind === 'rack')
  assert.deepEqual(racks.map(r => r.params.item).sort(), [...items.RACK_ITEM_IDS].sort())
  assert.ok(racks.every(r => r.params.respawnDelay === 1))
  assert.deepEqual(['pedalharp', 'drumkit', 'grandpiano'].map(k => room.filter(e => e.kind === k).length), [1, 1, 1])
  // the examples lead back to the default Pátio
  for (const name of ['Sala de armas e instrumentos', 'Grid com loot']) {
    const back = byName(name).layout().elements.filter(e => e.kind === 'portal')
    assert.ok(back.length >= 2 && back.every(p => p.params.portalTarget === layout.DEFAULT_PATIO_TARGET), name)
  }
  // the grid: on over the whole world, no bombs, items in a share of the blocks; each place to be born at is a free
  // block of the ground with a portal back in it
  const g = byName('Grid com loot').layout()
  assert.equal(g.settings.mineGrid.on, true)
  assert.equal(g.settings.mineGrid.bombs, 0)
  assert.ok(g.settings.mineGrid.items.chance > 0)
  const geo = grid.gridGeometry()
  const births = g.elements.filter(e => e.kind === 'entry' || e.kind === 'spawn')
  assert.equal(births.length, 3)
  assert.equal(births.reduce((s, e) => s + e.params.spawnChance, 0), 100)
  const back = g.elements.filter(e => e.kind === 'portal')
  for (const b of births) {
    assert.equal(b.params.freeBlock, true)
    const c = Math.floor((b.x + b.w / 2 - geo.x0) / geo.step), x0 = geo.x0 + c * geo.step
    assert.equal(back.filter(p => p.x >= x0 && p.x + p.w <= x0 + geo.cell).length, 1)
  }
})
