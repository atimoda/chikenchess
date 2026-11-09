// The online Pátio's shared world (lib/pigchicken/net-world.ts and the combat's online hooks): the owner's enemies
// mirrored on the other browsers, hits reported to the owner, other browsers' shots that only show.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const N = loadTs('lib/pigchicken/net-world.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')

const G = 1000
const body = { x: 640, y: G, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const input = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
const tick = (c, dt = 0.016) => c.step(dt, body, body, body, 0, input, [], G, () => {})
const aliens = c => c.targets.filter(t => t.kind === 'alien')

// an owner with a horde and a follower that mirrors it
function lobby() {
  const owner = createCombat(), follower = createCombat()
  owner.setView(0, 1280); follower.setView(0, 1280)
  owner.setNetOn(true); follower.setNetOn(true)
  const hits = []
  follower.setNetFollower(h => hits.push(h))
  owner.spawnAliens(G, 640)
  const cache = N.newFoeCache(), formations = new Map(), changes = []
  const sync = (full = false) => N.importFoes(follower.targets, N.exportFoes(owner.targets, 3, cache, full), formations, (t, ch) => { changes.push(ch); follower.netChange(t, ch) })
  return { owner, follower, hits, sync, changes, formations }
}

test("the owner's horde shows up on the other browser as mirrors that follow it", () => {
  const { owner, follower, sync } = lobby()
  for (let i = 0; i < 30; i++) tick(owner)
  sync(true)
  assert.equal(aliens(follower).length, 18)
  assert.ok(aliens(follower).every(t => t.mirror && t.net >= 30_000_000))
  const a = aliens(owner)[0], m = follower.targets.find(t => t.net === a.net)
  assert.ok(Math.abs(m.x - a.x) < 0.2 && Math.abs(m.y - a.y) < 0.2)
  assert.equal(m.data.color, a.data.color)
  // the follower does not move them: they glide to the owner's place
  for (let i = 0; i < 30; i++) tick(owner)
  sync()
  const before = m.y
  tick(follower)
  assert.ok(Math.abs(m.netY - a.y) < 0.2)
  assert.ok(m.y > before && m.y <= m.netY + 0.01)
  // data only travels again when it changed
  const quiet = N.exportFoes(owner.targets, 3, N.newFoeCache(), false)
  assert.ok(quiet.l.every(e => e.length === 18))
  const cache = N.newFoeCache(); N.exportFoes(owner.targets, 3, cache, false)
  assert.ok(N.exportFoes(owner.targets, 3, cache, false).l.every(e => e.length === 17))
})

test("hits on the owner's enemies are reported, applied by the owner, and its deaths show on the follower", () => {
  const { owner, follower, hits, sync, changes } = lobby()
  for (let i = 0; i < 60; i++) tick(owner)
  sync(true)
  const m = aliens(follower)[0]
  const hp = m.hp
  // a bullet from the follower: it shows the hit, changes nothing itself and tells the owner
  follower.bullets.push({ x: m.x - 60, y: m.y - m.h / 2, vx: 2000, vy: 0, dist: 0, damage: 50, pierce: 0, hits: new Set(), size: 3, drop: 0, range: 2000, item: 'pistol', t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0 })
  for (let i = 0; i < 5; i++) tick(follower)
  assert.equal(m.hp, hp)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].id, m.net)
  assert.equal(hits[0].d, 50)
  assert.ok(owner.applyNetHit(N.cleanHit(hits[0])))
  const real = owner.targets.find(t => t.net === m.net)
  assert.ok(real.deadT > 0)
  assert.equal(owner.kills.aliens, 1)
  sync()
  assert.deepEqual(changes, ['die'])
  assert.ok(m.deadT > 0)
  // its undead are the owner's too, and come over as mirrors
  for (let i = 0; i < 30; i++) tick(owner)
  sync()
  assert.ok(owner.targets.some(t => t.kind === 'undead'))
  const u = follower.targets.find(t => t.kind === 'undead')
  assert.ok(u && u.mirror && u.data.look.kind === 'alien')
  assert.ok(!follower.targets.includes(m) || m.deadT > 0)
})

test('notes report harmony; the owner converts and the follower sees the bird', () => {
  const { owner, follower, hits, sync, changes } = lobby()
  for (let i = 0; i < 60; i++) tick(owner)
  sync(true)
  const m = aliens(follower)[0]
  follower.bullets.push({ x: m.x - 60, y: m.y - m.h / 2, vx: 2000, vy: 0, dist: 0, damage: 40, pierce: 0, hits: new Set(), size: 3, drop: 0, range: 2000, item: 'flute', t: 0, explode: 0, explodeDamage: 0, fuse: 0, bounce: 0,
    note: { midi: 67, color: '#ffd166', sym: '♪', wave: 0, phase: 0, voice: 'flute' }, ghost: true })
  for (let i = 0; i < 5; i++) tick(follower)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].n.m, 67)
  assert.equal(m.harmony ?? 0, 0)
  owner.applyNetHit(N.cleanHit(hits[0]))
  assert.equal(owner.converted.birds, 1)
  sync()
  assert.deepEqual(changes, ['convert'])
  assert.equal(follower.critters.length, 1)
})

test("another browser's shots fly and stop here but never damage; their explosions still push this browser's chickens", () => {
  const c = createCombat()
  c.setView(0, 1280)
  const id = c.addTarget(400, G)
  const dummy = c.targets.find(t => t.id === id)
  const hp = dummy.hp
  c.addRemoteShots([{ k: 'b', i: 'rifle', x: 300, y: G - 50, vx: 3000, vy: 0, sz: 3, dr: 0, rg: 2000, fu: 0, bo: 0, ex: 0, pi: 0 }])
  assert.equal(c.bullets.length, 1)
  for (let i = 0; i < 10; i++) tick(c)
  assert.equal(c.bullets.length, 0, 'it stopped at the dummy')
  assert.equal(dummy.hp, hp)
  const pushed = []
  c.setBlastActors([{ box: { l: 380, r: 420, t: G - 200, b: G }, push: (x, y) => pushed.push({ x, y }) }])
  c.addRemoteShots([{ k: 'b', i: 'launcher', x: 300, y: G - 50, vx: 1500, vy: 0, sz: 6, dr: 0, rg: 2000, fu: 0, bo: 0, ex: 130, ep: DEFAULT_ITEMS.launcher.explodePush, pi: 0 }])
  for (let i = 0; i < 10; i++) tick(c)
  assert.equal(dummy.hp, hp)
  assert.equal(pushed.length, 1)
  assert.equal(c.booms.length > 0 || c.sparks.length > 0, true)
  // a thrown item lands on its own browser's floor, not here
  c.addRemoteShots([{ k: 'th', i: 'bat', x: 100, y: G - 100, vx: 50, vy: 0, sp: 8, a: 0 }])
  for (let i = 0; i < 60; i++) tick(c)
  assert.equal(c.thrown.length, 0)
  assert.equal(c.pickups.length, 0)
})

test('the shots fired here wait to be sent only while online', () => {
  const c = createCombat()
  c.give('pistol')
  const fire = { ...input, fire: true, firePressed: true }
  c.step(0.016, body, body, { x: 640, y: G - 80 }, 0, fire, [], G, () => {})
  assert.equal(c.netShots.length, 0)
  c.setNetOn(true)
  for (let i = 0; i < 40; i++) c.step(0.016, body, body, { x: 640, y: G - 80 }, 0, { ...fire, firePressed: i % 2 === 0 }, [], G, () => {})
  assert.ok(c.netShots.length >= 1)
  assert.ok(N.cleanShot(c.netShots[0], DEFAULT_ITEMS))
})

test('a new owner takes the world as it is: the mirrors start moving there', () => {
  const { owner, follower, sync, formations } = lobby()
  for (let i = 0; i < 60; i++) tick(owner)
  sync(true)
  assert.equal(formations.size, 1)
  const m = aliens(follower)[0]
  follower.setNetFollower(null); follower.adoptMirrors()
  const at = [m.x, m.y]
  for (let i = 0; i < 30; i++) tick(follower)
  assert.equal(m.mirror, false)
  assert.notDeepEqual([m.x, m.y], at)
  // and it keeps the same network ids
  const again = N.exportFoes(follower.targets, 7, N.newFoeCache(), true)
  assert.ok(again.l.some(e => e[0] === m.net))
  // the old owner, now a follower: its enemies become mirrors of the new owner's
  owner.setNetFollower(() => {}); owner.yieldShared()
  assert.ok(aliens(owner).every(t => t.mirror))
  N.importFoes(owner.targets, again, new Map())
  assert.equal(aliens(owner).length, aliens(follower).length)
})

test('the horde, zombies, Catálogo training aliens, the temple’s aliens and their undead are shared; the note stage’s and junk are not', () => {
  const c = createCombat()
  c.addTarget(100, G)
  c.addTrainingAlien(200, G, { w: 40, h: 40, hp: 20, data: { kind: 'temple', species: 'jelly', color: '#fff', variant: 'v1' } })
  c.targets.push({ id: 99, kind: 'alien', home: 0, x: 0, y: 0, w: 10, h: 10, hp: 1, maxHp: 1, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'fly', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#fff' } })
  c.targets.push({ id: 98, kind: 'alien', home: 0, x: 0, y: 0, w: 10, h: 10, hp: 1, maxHp: 1, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'fly', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#fff', variant: 'v1', note: true } })
  c.addTrainingZombie(300, G)
  const shared = c.targets.filter(N.isSharedTarget).map(t => t.id)
  assert.equal(shared.length, 3)
  assert.ok(shared.includes(99) && !shared.includes(98))
  assert.equal(N.cleanHit({ id: 1, d: NaN, px: 0, x: 0, y: 0 }), null)
  assert.equal(N.cleanHit({ id: 1, d: 1e9, px: 0, x: 0, y: 0 }).d, 5000)
  assert.equal(N.cleanShot({ k: 'b', i: 'nope', x: 0 }, DEFAULT_ITEMS), null)
  assert.equal(N.cleanShot({ k: 'b', i: 'pistol', x: 0, y: 0, vx: 0, vy: 0, sz: 1, dr: 0, rg: 1e7, fu: 0, bo: 0, ex: 0, pi: 0 }, DEFAULT_ITEMS), null)
  assert.equal(N.cleanSpawn({ what: 'boss', x: 0, y: 0, l: 0, r: 1 }), null)
  assert.equal(N.cleanSpawn({ what: 'zombies', x: 0, y: 0, l: 0, r: 1280, n: 999 }).n, 24)
})

test('zombies go for the nearest chicken, this browser’s or another’s', () => {
  const c = createCombat()
  c.setView(0, 1280)
  c.addTrainingZombie(1000, G)
  const z = c.targets.find(t => t.kind === 'zombie')
  c.setNetBodies([{ x: 1200, y: G }])
  const x = z.x
  for (let i = 0; i < 20; i++) tick(c)
  assert.ok(z.x > x, 'walks right, to the other browser’s chicken')
  c.setNetBodies([])
  const x2 = z.x
  for (let i = 0; i < 20; i++) tick(c)
  assert.ok(z.x < x2, 'and back to the local one at 640')
})
