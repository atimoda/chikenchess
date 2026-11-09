// The online Pátio's shared floor, dummies and temple (lib/pigchicken/net-state.ts, net-temple.ts and the hooks in
// combat.ts / temple.ts): the owner keeps them, the others draw copies and ask the owner.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const S = loadTs('lib/pigchicken/net-state.ts')
const T = loadTs('lib/pigchicken/net-temple.ts')
const temple = loadTs('lib/pigchicken/temple.ts')
const music = loadTs('lib/pigchicken/music.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')

const G = 1000
const body = (x = 640) => ({ x, y: G, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 })
const input = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
const tick = (c, over = {}, b = body()) => c.step(0.016, b, b, b, 0, { ...input, ...over }, [], G, () => {})

function lobby() {
  const owner = createCombat(), follower = createCombat()
  owner.setNetOn(true); follower.setNetOn(true)
  const asks = [], hits = []
  follower.setNetFollower(h => hits.push(h))
  follower.setNetAsk(a => asks.push(a))
  const sync = () => S.importPickups(follower.pickups, JSON.parse(JSON.stringify(S.exportPickups(owner.pickups, owner.racks, 3))), DEFAULT_ITEMS)
  return { owner, follower, asks, hits, sync }
}

test("the owner's rack fills its floor; the other browser draws the item and its own racks stay empty", () => {
  const { owner, follower, sync } = lobby()
  owner.addRack(640, 'pistol', undefined, 0, 'rack-a')
  follower.addRack(640, 'pistol', undefined, 0, 'rack-a')
  for (let i = 0; i < 60; i++) { tick(owner); tick(follower) }
  assert.equal(owner.pickups.length, 1)
  assert.equal(follower.pickups.length, 0, 'not the owner: its racks do not fill')
  sync()
  assert.equal(follower.pickups.length, 1)
  const m = follower.pickups[0]
  assert.ok(m.mirror && m.net >= 30_000_000 && m.rack === 'rack-a')
  assert.equal(m.owned.item, 'pistol')
})

test('grabbing the owner’s item asks the owner, which grants it to that browser only once', () => {
  const { owner, follower, asks, sync } = lobby()
  owner.addRack(640, 'pistol', undefined, 0, 'rack-a')
  for (let i = 0; i < 60; i++) tick(owner)
  sync()
  for (let i = 0; i < 3; i++) tick(follower)
  tick(follower, { grab: true })
  assert.equal(asks.length, 1)
  assert.equal(asks[0].k, 'take')
  assert.equal(asks[0].pl, 'p1')
  assert.equal(follower.inventory.filter(Boolean).length, 0, 'nothing comes in before the owner grants it')
  tick(follower, { grab: true })
  assert.equal(asks.length, 1, 'not asked twice while waiting')
  const a = S.cleanAsk(JSON.parse(JSON.stringify(asks[0])), DEFAULT_ITEMS)
  const got = owner.netTake(a.id)
  assert.equal(got.owned.item, 'pistol')
  assert.equal(owner.netTake(a.id), null, 'the second ask finds nothing')
  follower.netGive(a.pl, got.owned, got.x, got.y, a.id)
  assert.equal(follower.held.item, 'pistol')
  sync()
  assert.equal(follower.pickups.length, 0)
})

test('an item dropped by another browser lands on the owner’s floor', () => {
  const { owner, follower, asks } = lobby()
  follower.give('pistol'); follower.give('smg')
  follower.thrown.push({ x: 600, y: G - 40, vx: 0, vy: 300, spin: 0, angle: 0, owned: { item: 'bat', ammo: 0, durability: 10 }, damage: 0, hit: false })
  for (let i = 0; i < 20; i++) tick(follower)
  const drop = asks.find(a => a.k === 'drop')
  assert.ok(drop, 'the thrown item asks to land on the owner’s floor')
  assert.equal(follower.pickups.length, 0)
  const a = S.cleanAsk(JSON.parse(JSON.stringify(drop)), DEFAULT_ITEMS)
  owner.netDrop(a.o, a.x, a.y, a.vy, !!a.r, a.n)
  assert.equal(owner.pickups[0].owned.item, 'bat')
  assert.equal(S.cleanAsk({ k: 'drop', o: { item: 'nope', ammo: 1, durability: 1 }, x: 0, y: 0, vy: 0, n: 0 }, DEFAULT_ITEMS), null)
  assert.equal(S.cleanAsk({ k: 'take', id: 'x', pl: 'p1' }, DEFAULT_ITEMS), null)
  assert.ok(!S.nearAny(0, 0, [{ x: 2000, y: 0 }]) && S.nearAny(0, 0, [{ x: 100, y: -50 }]))
})

test('a new owner keeps the floor: the copies become its items and the rack knows its own', () => {
  const { owner, follower, sync } = lobby()
  owner.addRack(640, 'pistol', undefined, 0, 'rack-a')
  follower.addRack(640, 'pistol', undefined, 0, 'rack-a')
  for (let i = 0; i < 60; i++) tick(owner)
  sync()
  follower.setNetAsk(null); follower.setNetFollower(null); follower.adoptMirrors()
  for (let i = 0; i < 60; i++) tick(follower)
  assert.equal(follower.pickups.length, 1, 'the rack does not fill a second one next to the adopted item')
  assert.ok(!follower.pickups[0].mirror)
  // and the old owner, now following, drops its own floor until the new owner's list comes
  owner.yieldShared()
  assert.equal(owner.pickups.length, 0)
})

test('layout dummies: hits from another browser are reported and applied by the owner; the life follows', () => {
  const { owner, follower, hits } = lobby()
  for (const c of [owner, follower]) { const id = c.addTarget(640, G, { maxHp: 100 }); c.targets.find(t => t.id === id).netKey = 'dummy-1' }
  const fd = follower.targets.find(t => t.netKey), od = owner.targets.find(t => t.netKey)
  follower.bullets.push({ x: 560, y: G - 50, vx: 2000, vy: 0, dist: 0, damage: 30, pierce: 0, hits: new Set(), size: 3, drop: 0, range: 2000, item: 'pistol', t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0 })
  for (let i = 0; i < 5; i++) tick(follower)
  assert.equal(fd.hp, 100, 'the life stays the owner’s')
  assert.equal(hits.length, 1)
  assert.equal(hits[0].k, 'dummy-1')
  owner.applyNetHit(hits[0])
  assert.equal(od.hp, 70)
  S.importDummies(follower, JSON.parse(JSON.stringify(S.exportDummies(owner.targets))))
  assert.equal(fd.hp, 70)
  assert.equal(fd.dummy.stage, 3)
  // a note mends it on the owner
  owner.applyNetHit({ id: 0, k: 'dummy-1', d: 30, px: 0, x: 640, y: G - 50, n: { m: 60, c: '#fff', s: '♪', v: 'keys', w: 0 } })
  assert.equal(od.hp, 100)
})

// a temple frame without the browser
function rig(seed = 7) {
  const t = temple.createTemple(seed)
  const conductor = music.createConductor()
  const targets = []
  const io = (over = {}) => {
    const evs = conductor.events.splice(0)
    return {
      targets, music: conductor, sceneL: 1920, groundY: 930, inside: true, body: { x: 1920 + 300, y: 930, scale: 1 }, boxes: [],
      gongHit: false, firePressed: false, beats: evs.filter(e => e.kind === 'beat').map(e => e.n),
      fx: { burst() {}, text() {} }, hurt() {}, sound() {}, ...over,
    }
  }
  const frame = (dt = 1 / 60, over) => { conductor.step(dt); t.step(dt, io(over)) }
  return { t, conductor, targets, frame, io }
}

test("the owner's temple goes to the other browser; its bombs hurt that browser's chicken, which asks for the heart", () => {
  const owner = rig(), other = rig()
  for (let i = 0; i < 5; i++) owner.frame(1 / 60, { gongHit: true })
  for (let i = 0; i < 300; i++) owner.frame()
  assert.equal(owner.t.state.phase, 'playing')
  const idOf = id => 30_000_000 + id
  T.importTemple(other.t.state, JSON.parse(JSON.stringify(T.exportTemple(owner.t.state, idOf, true))))
  const s = other.t.state
  assert.equal(s.phase, 'playing')
  assert.equal(s.aliens.length, owner.t.state.aliens.length)
  assert.equal(s.aliens[0].id, idOf(owner.t.state.aliens[0].id))
  assert.equal(s.banner?.title, owner.t.state.banner?.title)
  // a bomb right over the other browser's chicken
  s.bombs = [{ x: 1920 + 300, y: 930 - 60, vx: 0, vy: 10, kind: 'orb', t: 0 }]
  const asks = []
  let pushed = 0
  other.t.follow(1 / 60, other.io({ hurt: () => { pushed++ } }), a => asks.push(a))
  assert.equal(pushed, 1)
  assert.deepEqual(asks.map(a => a.k), ['hurt'])
  // the owner takes the heart
  const hearts = owner.t.state.hearts
  owner.t.state.invuln = 0
  owner.t.applyAsk(owner.io(), asks[0])
  assert.equal(owner.t.state.hearts, hearts - 1)
  // a press on the beat there feeds the owner's combo
  owner.t.applyAsk(owner.io(), { k: 'judge', g: 'perfect' })
  assert.equal(owner.t.state.combo, 1)
  // between full sends only the glow travels; the set of aliens stays
  T.importTemple(s, JSON.parse(JSON.stringify(T.exportTemple(owner.t.state, idOf, false))))
  assert.equal(s.aliens.length, owner.t.state.aliens.length)
})

test('a stage goes on while a chicken of the lobby is still in the temple', () => {
  const r = rig()
  for (let i = 0; i < 5; i++) r.frame(1 / 60, { gongHit: true })
  for (let i = 0; i < 300; i++) r.frame(1 / 60, { inside: false, others: [{ x: 1920 + 500, y: 930 }] })
  assert.notEqual(r.t.state.phase, 'failed')
  for (let i = 0; i < 300; i++) r.frame(1 / 60, { inside: false, others: [] })
  assert.equal(r.t.state.phase, 'failed')
})

test('temple messages are checked: junk is refused, a kill plays on this browser’s grid, grades and hurts stay local', () => {
  const s = temple.newTempleState(1)
  T.importTemple(s, { phase: 'boss', stage: 0 })
  assert.equal(s.phase, 'idle')
  T.importTemple(s, { phase: 'intro', stage: 99 })
  assert.equal(s.phase, 'idle')
  assert.equal(T.cleanTempleEvent({ s: { kind: 'explode' } }), null)
  assert.deepEqual(T.cleanTempleEvent({ s: { kind: 'kill', midi: 60, combo: 2, at: 99 } }), { s: { kind: 'kill', midi: 60, combo: 2, at: 0 } })
  assert.equal(T.cleanTempleEvent({ s: { kind: 'clear', root: 60, chord: 'x' } }), null)
  assert.ok(!T.relaysSound({ kind: 'judge', grade: 'good', midi: 60 }) && !T.relaysSound({ kind: 'hurt' }) && T.relaysSound({ kind: 'bomb' }))
})
