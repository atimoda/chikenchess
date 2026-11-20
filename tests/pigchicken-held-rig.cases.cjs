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
  for (const id of items.WEAPON_IDS) if (id !== 'bow') assert.equal(items.itemRig(items.DEFAULT_ITEMS[id]), null, id)
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

test('instruments aim instantly by default; an old saved Giro da mira moves to 0 unless it was changed', () => {
  for (const id of items.ITEM_IDS) if (items.DEFAULT_ITEMS[id].instrument) assert.equal(items.DEFAULT_ITEMS[id].turnRate, 0, id)
  assert.equal(items.DEFAULT_ITEMS.rifle.turnRate, 720)
  withStorage({ _v: 7, sax: { turnRate: 120 }, violin: { turnRate: 420 }, keys: { turnRate: 600 }, rifle: { turnRate: 720 } }, () => {
    const back = items.loadItems()
    assert.deepEqual([back.sax.turnRate, back.violin.turnRate, back.keys.turnRate, back.rifle.turnRate], [0, 0, 600, 720])
  })
  withStorage({ _v: 8, sax: { turnRate: 120 } }, () => assert.equal(items.loadItems().sax.turnRate, 120))
})

test('an old saved Recuo no ar takes the new default unless it was changed', () => {
  const d = items.DEFAULT_ITEMS
  withStorage({ _v: 11, trumpet: { recoilPush: 790 }, launcher: { recoilPush: 500 }, flute: { recoilPush: 0 }, sax: { recoilPush: 300 } }, () => {
    const back = items.loadItems()
    assert.deepEqual([back.trumpet.recoilPush, back.launcher.recoilPush, back.flute.recoilPush, back.sax.recoilPush], [d.trumpet.recoilPush, d.launcher.recoilPush, d.flute.recoilPush, 300])
  })
  withStorage({ _v: 12, trumpet: { recoilPush: 790 } }, () => assert.equal(items.loadItems().trumpet.recoilPush, 790))
})

// "Arco e Flecha": the charge draws the arrow, the bow stays on its rig
const { heldItemPose } = loadTs('lib/pigchicken/held-pose.ts')
const { ARCHERY_ART } = loadTs('lib/pigchicken/art.ts')
function bowCombat(over = {}, def = {}) {
  const d = { ...items.DEFAULT_ITEMS.bow, ...def }
  return { held: { item: 'bow', ammo: 5, durability: 0 }, consumption: null, item: () => d, swing: null, throwCharge: 0, fireCharge: 0, aimAngle: 0, throwAngle: 0, kick: 0, heavyCharge: 0, reloading: 0, ...over }
}

test('the bow is held like a real one: the back wing on the grip, the front wing on the arrow', () => {
  const d = items.DEFAULT_ITEMS.bow
  assert.equal(d.archery, true)
  const rig = items.itemRig(d)
  assert.deepEqual(rig.hand, { x: d.handX, y: d.handY }); assert.ok(rig.back)
  // the grip is out in front of her shoulder, and the arrow's nock rests on the string
  assert.ok(rig.x < -40)
  const [x1, , x2] = ARCHERY_ART.bow.string
  assert.equal(d.handX, x1); assert.equal(d.handX, x2)
  assert.equal(items.DEFAULT_ITEMS.harp.archery, false)
})

test('charging draws the arrow and the string back; the bow and the back wing do not move', () => {
  const d = items.DEFAULT_ITEMS.bow
  const rest = heldItemPose(bowCombat(), 0), half = heldItemPose(bowCombat({ fireCharge: 0.5 }), 0), full = heldItemPose(bowCombat({ fireCharge: 1 }), 0)
  // the bow alone is the item's drawing; the arrow and the string are separate
  assert.equal(rest.svg, ARCHERY_ART.bow.body)
  assert.equal(rest.archery.arrow, ARCHERY_ART.bow.arrow)
  assert.deepEqual([rest.archery.x, rest.archery.y], [d.handX, d.handY])
  for (const pose of [half, full]) {
    assert.equal(pose.atHand, false); assert.equal(pose.pull, 0); assert.equal(pose.kick, 0)
    assert.deepEqual(pose.rig.back, rest.rig.back)
    assert.equal(pose.rig.x, rest.rig.x)
    // the wing's hand and the arrow's nock are the same point
    assert.deepEqual(pose.rig.hand, { x: pose.archery.x, y: pose.archery.y })
  }
  assert.equal(half.archery.x, d.handX - d.drawLen / 2)
  assert.equal(full.archery.x, d.handX - d.drawLen)
})

test('no arrow on the string with the quiver empty or while reloading; off, the bow charges as before', () => {
  assert.equal(heldItemPose(bowCombat({ held: { item: 'bow', ammo: 0, durability: 0 } }), 0).archery.arrow, null)
  assert.equal(heldItemPose(bowCombat({ reloading: 0.4 }), 0).archery.arrow, null)
  const off = heldItemPose(bowCombat({ fireCharge: 0.5 }, { archery: false }), 0)
  assert.equal(off.archery, null); assert.equal(off.atHand, true); assert.ok(off.pull > 0); assert.equal(off.rig, null)
  // a Throw takes the whole bow to the hand, string and arrow with it
  const thrown = heldItemPose(bowCombat({ throwCharge: 0.5 }), 0)
  assert.equal(thrown.atHand, true); assert.ok(thrown.pull > 0); assert.equal(thrown.rig, null)
  assert.equal(thrown.archery.x, items.DEFAULT_ITEMS.bow.handX)
})

test('a bow saved before Arco e Flecha with untouched points takes the new ones; custom points stay', () => {
  withStorage({ _v: 10, bow: { pivotAt: 'shoulder', pivotX: 0, pivotY: 0, handOn: false, handX: 0, handY: 0, backOn: false, backX: 0, backY: 0 } }, () => {
    const bow = items.loadItems().bow
    assert.equal(bow.handOn, true); assert.equal(bow.backOn, true); assert.equal(bow.handX, items.DEFAULT_ITEMS.bow.handX); assert.equal(bow.pivotX, items.DEFAULT_ITEMS.bow.pivotX)
  })
  withStorage({ _v: 10, bow: { pivotX: 0, handOn: true, handX: 7, backOn: false } }, () => {
    const bow = items.loadItems().bow
    assert.equal(bow.handX, 7); assert.equal(bow.backOn, false); assert.equal(bow.pivotX, 0)
  })
})
