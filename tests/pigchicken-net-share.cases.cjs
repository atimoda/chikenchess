// What lies in the owner's world for everyone, online (lib/pigchicken/net-items.ts, lib/pigchicken/net-share.ts and the
// combat's hooks): the items on the floor (shown everywhere, taken by asking the owner, dropped by handing them to it)
// and the life of the layout's training dummies.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const I = loadTs('lib/pigchicken/net-items.ts')
const { cleanDummies } = loadTs('lib/pigchicken/net-share.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')

const body = { x: 0, y: 1000, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const input = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
const step = (c, dt = 0.016, over = {}) => c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { ...input, ...over }, [], 1000, () => {}, { world: true })
const wire = v => JSON.parse(JSON.stringify(v)) // as it goes through the server
const make = role => { const c = createCombat(); c.setView(-2000, 2000); c.setNetOn(true); c.setShareRole(role); return c }
// the owner's list reaches the follower
const tell = (owner, follower) => follower.importNetItems(I.cleanItems(wire(I.exportItems(owner.pickups)), DEFAULT_ITEMS))
// the follower's asks reach the owner, and its answer comes back
function answer(owner, follower) {
  const gives = [], gone = []
  for (const id of I.cleanIds(wire(follower.itemAsks.splice(0)))) { const o = owner.giveNetItem(id); if (o) gives.push([id, I.ownedOut(o)]); else gone.push(id) }
  for (const [id, raw] of I.cleanGives(wire(gives))) follower.takeNetItem(id, I.ownedIn(raw, DEFAULT_ITEMS, follower.nextNetId))
  for (const id of gone) follower.netItemGone(id)
}

test("a follower shows the owner's items (its own leave), the same copy for the same item, and they follow the owner", () => {
  const owner = make('owner'), follower = createCombat()
  follower.addPickup(300, 'smg', 1000)
  follower.setShareRole('follower')
  assert.equal(follower.pickups.length, 0, "its own items leave: the owner's are the ones on the floor")
  follower.addPickup(300, 'smg', 1000)
  assert.equal(follower.pickups.length, 0, 'and the layout adds none here')
  owner.addPickup(40, 'pistol', 900); owner.addPickup(-200, 'cok', 1000)
  tell(owner, follower)
  assert.deepEqual(follower.pickups.map(p => p.owned.item), ['pistol', 'cok'])
  assert.deepEqual(follower.pickups.map(p => p.mirror), owner.pickups.map(p => p.id))
  const copy = follower.pickups[0]
  for (let i = 0; i < 40; i++) step(owner)
  tell(owner, follower)
  assert.equal(follower.pickups[0], copy, 'the same object')
  assert.equal(copy.y, 1000); assert.equal(copy.resting, true, 'it fell with the owner')
  owner.pickups.splice(1, 1)
  tell(owner, follower)
  assert.deepEqual(follower.pickups.map(p => p.owned.item), ['pistol'], 'gone at the owner: gone here')
})

test("Pegar on the owner's item asks the owner: the first to ask gets it, the other hears it is gone", () => {
  const owner = make('owner'), a = make('follower'), b = make('follower')
  owner.addPickup(0, 'pistol', 1000)
  for (let i = 0; i < 5; i++) step(owner)
  tell(owner, a); tell(owner, b)
  step(a, 0.016, { grab: true }); step(b, 0.016, { grab: true })
  assert.equal(a.pickups.length, 0, 'out of sight while it waits')
  assert.equal(a.itemAsks.length, 1)
  tell(owner, a)
  assert.equal(a.pickups.length, 0, "the owner's list does not bring it back while the answer may come")
  answer(owner, a)
  assert.equal(a.held?.item, 'pistol', 'she has it in her wing')
  assert.equal(owner.pickups.length, 0, 'it left the floor of the owner')
  answer(owner, b)
  assert.equal(b.held, null)
  tell(owner, b)
  assert.equal(b.pickups.length, 0, 'gone for everyone')
})

test("what falls on a follower is handed to the owner, which lays it on everyone's floor", () => {
  const owner = make('owner'), follower = make('follower')
  follower.give('pistol'); follower.give('violin')
  follower.dropAll(40)
  assert.equal(follower.pickups.length, 0)
  const drops = follower.itemDrops.splice(0).map(p => [I.ownedOut(p.owned), Math.round(p.x), Math.round(p.y), Math.round(p.vy), p.noPick])
  owner.addNetDrops(I.cleanDrops(wire(drops), DEFAULT_ITEMS, owner.nextNetId))
  assert.deepEqual(owner.pickups.map(p => p.owned.item).sort(), ['pistol', 'violin'])
  tell(owner, follower)
  assert.equal(follower.pickups.length, 2)
})

test('a Gaiola goes whole: its limit and its souls', () => {
  const owner = make('owner'), follower = make('follower')
  owner.addPickup(0, 'cage', 1000, 3)
  const cage = owner.pickups[0].owned.cage
  cage.souls.push({ id: 1, species: 'horde', state: 'alive', shot: null, note: null, weapon: null, rarity: 'common', color: '#ffcc00', bird: null })
  tell(owner, follower)
  const got = follower.pickups[0].owned.cage
  assert.equal(got.cap, cage.cap)
  assert.equal(got.souls.length, 1)
  assert.equal(got.souls[0].color, '#ffcc00')
})

test("the dummies: a follower's hits reach the owner, and the owner's life comes back to everyone", () => {
  const owner = make('owner'), follower = make('follower')
  for (const c of [owner, follower]) { const id = c.addTarget(0, 1000, { maxHp: 100 }); c.targets.find(t => t.id === id).dummy.key = 'dummy-1' }
  const dummyOf = c => c.targets.find(t => t.dummy?.key === 'dummy-1')
  // a hit here: it loses life at once, and the owner learns how much
  dummyOf(follower).hp = 70; dummyOf(follower).dummy.hold = 0.6 // (as a hit here leaves it)
  owner.addNetDummyDeltas(cleanDummies(wire([['dummy-1', -30]])))
  assert.equal(dummyOf(owner).hp, 70)
  const list = cleanDummies(wire(owner.exportDummies()))
  assert.deepEqual(list, [['dummy-1', 70]])
  // an older word of the owner's does not undo the hit while it is on its way
  follower.importNetDummies([['dummy-1', 100]])
  assert.equal(dummyOf(follower).hp, 70)
  for (let i = 0; i < 50; i++) step(follower)
  follower.importNetDummies([['dummy-1', 40]])
  assert.equal(dummyOf(follower).hp, 40, "the owner's life")
  assert.equal(follower.dummyDeltas.size, 0, 'what the owner said is not told back')
  follower.importNetDummies([['dummy-1', 90]])
  assert.equal(dummyOf(follower).hp, 90, 'mended')
  assert.equal(follower.dummyDeltas.size, 0)
  assert.deepEqual(cleanDummies([['a', 1], ['b', 'x'], [3, 1], ['c', Infinity], 'x']), [['a', 1]])
})

test('a hit on a dummy on a follower is told to the owner', () => {
  const follower = make('follower')
  const id = follower.addTarget(500, 1000, { maxHp: 100 })
  const t = follower.targets.find(g => g.id === id)
  t.dummy.key = 'd'
  follower.bullets.push({ x: 470, y: 940, vx: 900, vy: 0, dist: 0, damage: 25, pierce: 0, hits: new Set(), size: 3, drop: 0, range: 2000, item: 'pistol', t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0 })
  for (let i = 0; i < 16; i++) step(follower)
  assert.equal(t.hp, 75, 'the shot took life here at once')
  assert.equal(follower.dummyDeltas.get('d'), -25)
  assert.ok(t.dummy.hold > 0)
})

test("the owner's list as it arrives: wrong shapes and unknown items are left out", () => {
  const l = I.cleanItems([[1, { i: 'pistol', a: 5, d: 0 }, 0, 0, 1, 0, 0], [2, { i: 'nope', a: 1, d: 0 }, 0, 0, 1, 0], [3, null, 0, 0, 1, 0], 'x', [4, { i: 'cok', a: 1, d: 0 }, 1e9, 0, 1, 0]], DEFAULT_ITEMS)
  assert.deepEqual(l.map(e => e.id), [1])
  assert.equal(I.ownedIn({ i: 'pistol', a: 'x', d: 0 }, DEFAULT_ITEMS, () => 1), null)
  assert.deepEqual(I.cleanDrops([[{ i: 'pistol', a: 5, d: 0 }, 1, 2, 9999, 9], [{ i: 'pistol', a: 5, d: 0 }, 1, 2]], DEFAULT_ITEMS, () => 1).map(d => [d.vy, d.noPick]), [[3000, 5]])
})
