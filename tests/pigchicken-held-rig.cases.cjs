const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const items = loadTs('lib/pigchicken/items.ts')
const { LOOK_ART } = loadTs('lib/chicken/look-art.ts')
const { ADMIN_ENTRIES } = loadTs('lib/admin/catalog.ts')
const { validateAdminValue } = loadTs('lib/admin/validation.ts')

function withStorage(saved, run) {
  const previous = globalThis.window
  const store = { value: saved === undefined ? null : JSON.stringify(saved) }
  globalThis.window = { localStorage: { getItem: () => store.value, setItem: (_k, v) => { store.value = v } }, dispatchEvent() {} }
  globalThis.CustomEvent ??= class { constructor(type) { this.type = type } }
  try { return run(store) } finally { globalThis.window = previous }
}

test('the wind instruments turn around their mouthpiece, which sits on her mouth', () => {
  for (const id of ['flute', 'sax', 'trumpet']) {
    const rig = items.itemRig(items.DEFAULT_ITEMS[id])
    assert.equal(rig.at, 'mouth', id)
    // the mouthpiece is behind the grip on the drawing
    assert.ok(rig.x < 0, id)
    assert.ok(rig.hand && rig.back, id)
  }
})

test('every instrument held in the wing has the wings on it; weapons stay as they were', () => {
  for (const id of ['guitar', 'violin', 'keys', 'harp']) {
    const rig = items.itemRig(items.DEFAULT_ITEMS[id])
    assert.equal(rig.at, 'shoulder', id)
    assert.ok(rig.hand && rig.back, id)
  }
  for (const id of items.WEAPON_IDS) assert.equal(items.itemRig(items.DEFAULT_ITEMS[id]), null, id)
  const pistol = { ...items.DEFAULT_ITEMS.pistol, handOn: true, handX: 10, handY: 4 }
  assert.deepEqual(items.itemRig(pistol), { at: 'shoulder', x: 0, y: 0, hand: { x: 10, y: 4 }, back: null })
})

test('every beak names her mouth', () => {
  for (const [id, beak] of Object.entries(LOOK_ART.art.beak)) assert.ok(Array.isArray(beak.mouth) && beak.mouth.length === 2, id)
})

test('this browser saves only what differs from the game, and the points load back clamped', () => {
  withStorage(undefined, store => {
    const next = items.loadItems()
    next.flute.pivotAt = 'shoulder'; next.flute.handX = 12.5; next.sax.backOn = false
    items.saveItems(next)
    const saved = JSON.parse(store.value)
    assert.deepEqual(saved.flute, { pivotAt: 'shoulder', handX: 12.5 })
    assert.deepEqual(saved.sax, { backOn: false })
    assert.equal(saved.pistol, undefined)
    const back = items.loadItems()
    assert.equal(back.flute.pivotAt, 'shoulder'); assert.equal(back.flute.handX, 12.5); assert.equal(back.sax.backOn, false)
    assert.equal(back.trumpet.pivotAt, 'mouth')
  })
  withStorage({ _v: 6, flute: { pivotAt: 'elbow', pivotX: 999 } }, () => {
    const back = items.loadItems()
    assert.equal(back.flute.pivotAt, 'mouth')
    assert.equal(back.flute.pivotX, 200)
  })
})

test('"Salvar no game" keeps the changes from the code, and the admin catalog accepts them', () => {
  const next = structuredClone(items.DEFAULT_ITEMS)
  next.trumpet.handX = 3; next.guitar.combo = ['up']
  const diff = items.itemsDiff(next, items.DEFAULT_ITEMS)
  assert.deepEqual(diff, { trumpet: { handX: 3 }, guitar: { combo: ['up'] } })
  const entry = ADMIN_ENTRIES.find(e => e.id === 'pigchicken-items')
  assert.equal(entry.path, 'data/pigchicken/items.json')
  validateAdminValue(entry, diff)
  validateAdminValue(entry, require('../data/pigchicken/items.json'))
  assert.throws(() => validateAdminValue(entry, { trumpet: { handX: { x: 1 } } }))
})
