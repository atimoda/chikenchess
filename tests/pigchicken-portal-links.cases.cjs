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
