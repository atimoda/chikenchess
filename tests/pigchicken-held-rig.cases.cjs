const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const items = loadTs('lib/pigchicken/items.ts')
const { LOOK_ART } = loadTs('lib/chicken/look-art.ts')

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
    // their wings are turned all the way round: flipped so they are not upside down
    assert.equal(rig.flip, true, id)
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
  assert.deepEqual(items.itemRig(pistol), { at: 'shoulder', x: 0, y: 0, hand: { x: 10, y: 4 }, back: null, flip: false })
})

test('every beak names her mouth', () => {
  for (const [id, beak] of Object.entries(LOOK_ART.art.beak)) assert.ok(Array.isArray(beak.mouth) && beak.mouth.length === 2, id)
})

test('the points are saved in this browser and load back clamped', () => {
  withStorage(undefined, () => {
    const next = items.loadItems()
    next.flute.pivotAt = 'shoulder'; next.flute.handX = 12.5; next.sax.backOn = false
    items.saveItems(next)
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

test('"Salvar no game" writes the points with the rest of the sheet, and the file accepts them', () => {
  const next = structuredClone(items.DEFAULT_ITEMS)
  next.trumpet.handX = 3; next.pistol.handOn = true; next.guitar.pivotAt = 'mouth'
  const file = items.itemsDefaultsFile(next)
  assert.equal(file.trumpet.handX, 3); assert.equal(file.pistol.handOn, true); assert.equal(file.guitar.pivotAt, 'mouth')
  assert.equal(items.itemsFileProblem(file), null)
  assert.notEqual(items.itemsFileProblem({ flute: { pivotAt: 'elbow' } }), null)
})
