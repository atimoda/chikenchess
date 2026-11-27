// What the other browsers' chickens do with their bodies, online (lib/pigchicken/net-acts.ts and the combat's hooks):
// the Bicada and its wind-up, the Golpe and its air, the violin's beam.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const A = loadTs('lib/pigchicken/net-acts.ts')
const { cleanShot } = loadTs('lib/pigchicken/net-world.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, world = false, dt = 0.016) {
  c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { world, peckOrigin: { x: 0, y: 0 } })
}
const online = () => { const c = createCombat(); c.setView(-2000, 2000); c.setNetOn(true); return c }
const sent = c => c.netActs.splice(0).map(x => ({ ...x.act, s: 0 }))

test('a Bicada: its wind-up is said while Atirar is held, the strike once, and the other browser shows the same pose', () => {
  const c = online()
  step(c, { fire: true, firePressed: true }, 0.5)
  for (let i = 0; i < 8; i++) step(c, { fire: true }, 0.5)
  const prep = c.liveActs('p1')
  assert.equal(prep.length, 1); assert.equal(prep[0].k, 'pp')
  assert.ok(prep[0].p > 0, 'the neck pulled back')
  assert.equal(c.netActs.length, 0, 'nothing sent once yet')
  step(c, {}, 0.5)
  const acts = sent(c)
  assert.equal(acts.length, 1); assert.equal(acts[0].k, 'pk')
  assert.equal(acts[0].a, 0.5); assert.equal(acts[0].r, DEFAULT_ITEMS.peck.meleeRange)
  assert.deepEqual(c.liveActs('p1'), [], 'no wind-up after the strike')

  const store = A.createNetActStore()
  store.receive(7, [A.cleanAct({ ...prep[0], s: 0 }, DEFAULT_ITEMS)], 0)
  assert.equal(store.pose(7, 0, 100).peck.thrust, 0, 'wound up')
  assert.equal(store.pose(7, 0, 100 + A.ACT_HOLD_MS + 1).peck, null, 'a wind-up nobody says again goes away')
  store.receive(7, [A.cleanAct(acts[0], DEFAULT_ITEMS)], 1000)
  const mid = store.pose(7, 0, 1000 + acts[0].tm * 1000 * 0.28)
  assert.ok(mid.peck.thrust > 0.9, 'the beak out at its contact')
  assert.equal(mid.peck.angle, 0.5)
  assert.equal(store.pose(7, 0, 1000 + acts[0].tm * 1000 + 1).peck, null, 'and back')
  assert.equal(store.pose(8, 0, 1000).peck, null, 'another browser has none')
})

test('a Golpe goes out once with its pose and air, and comes back as the same blow', () => {
  const c = online()
  c.give('bat')
  step(c, { melee: true }, 0.3)
  const sw = c.swing
  const acts = sent(c)
  assert.equal(acts.length, 1); assert.equal(acts[0].k, 'sw')
  const back = A.swingOfAct(A.cleanAct(JSON.parse(JSON.stringify(acts[0])), DEFAULT_ITEMS))
  for (const k of ['kind', 'dir', 'wing', 'hitAt']) assert.equal(back[k], sw[k], k)
  for (const k of ['angle', 'arc', 'time', 'life']) assert.ok(Math.abs(back[k] - sw[k]) < 0.01, k)
  assert.equal(back.trail.color, sw.trail.color)
  assert.equal(back.damage, 0, 'it only shows')

  const store = A.createNetActStore()
  store.receive(3, [A.cleanAct(acts[0], DEFAULT_ITEMS)], 0)
  assert.equal(store.swings().length, 0, 'drawn only from a shoulder the online chickens gave')
  const pose = store.pose(3, 0, 50)
  assert.ok(Math.abs(pose.swing.t - 0.05) < 1e-9)
  store.setOrigin(3, 0, { x: 10, y: 20 })
  assert.equal(store.swings().length, 1)
  assert.equal(store.pose(3, 0, back.life * 1000 + 10).swing, null, 'over after its air is gone')
  store.keep(new Set())
  assert.equal(store.size, 0, 'a browser that left takes its acts')
})

test('the drawn Golpe keeps its move (thinned) and a bad act is dropped', () => {
  const t = Array.from({ length: 200 }, (_, i) => i / 100), a = t.map(x => x * 2)
  const sw = { angle: 0, arc: 1, range: 60, reach: 90, time: 2.2, wing: true, dir: 1, kind: 'down', trail: { width: 20, color: '#ffeecc', time: 0.3, wisps: 3, opacity: 0.8 }, path: { t, a } }
  const act = A.cleanAct(A.swingAct(sw, 2), DEFAULT_ITEMS)
  assert.equal(act.s, 2)
  assert.equal(act.pt[0].length, 48); assert.equal(act.pt[0][47], 1.99)
  assert.equal(A.swingOfAct(act).hitAt, 0)
  assert.equal(A.cleanAct({ ...act, s: 4 }, DEFAULT_ITEMS), null, 'no fifth chicken')
  assert.equal(A.cleanAct({ ...act, kd: 'nope' }, DEFAULT_ITEMS), null)
  assert.equal(A.cleanAct({ ...act, tr: [1, 'red', 1, 1, 1] }, DEFAULT_ITEMS), null, 'a colour is #rgb')
  assert.equal(A.cleanAct({ k: 'vb', s: 0, i: 'nothing', x1: 0, y1: 0, x2: 1, y2: 1, m: 60, c: '#fff' }, DEFAULT_ITEMS), null)
  assert.equal(A.cleanAct({ k: 'xx', s: 0 }, DEFAULT_ITEMS), null)
  // an older browser reads the same list as shots: it drops the acts
  assert.equal(cleanShot(act, DEFAULT_ITEMS), null)
})

test('the violin: its beam is said while it plays, and another browser draws it until it stops being said', () => {
  const c = online()
  c.give('violin')
  for (let i = 0; i < 20; i++) step(c, { fire: true, firePressed: i === 0 }, 0, true)
  assert.ok(c.beam)
  const live = c.liveActs('p1')
  assert.equal(live.length, 1); assert.equal(live[0].k, 'vb'); assert.equal(live[0].i, 'violin')
  const act = A.cleanAct({ ...live[0], s: 1 }, DEFAULT_ITEMS)
  assert.ok(act)

  const other = online()
  other.addRemoteActs([act], 5)
  assert.equal(other.remoteBeams.length, 1)
  assert.equal(other.remoteBeams[0].x2, act.x2)
  for (let i = 0; i < 10; i++) step(other, {}, 0, true)
  assert.equal(other.remoteBeams.length, 1, 'still said a moment ago')
  for (let i = 0; i < 20; i++) step(other, {}, 0, true)
  assert.equal(other.remoteBeams.length, 0, 'it stops when its browser stops saying it')
  other.addRemoteActs([act], 5)
  other.setNetOn(false)
  assert.equal(other.remoteBeams.length, 0, 'leaving the online takes them')

  for (let i = 0; i < 5; i++) step(c, {}, 0, true)
  assert.equal(c.beam, null)
  assert.deepEqual(c.liveActs('p1'), [], 'stopped playing: nothing more to say')
})

test('offline nothing is queued', () => {
  const c = createCombat()
  c.give('bat')
  step(c, { melee: true })
  assert.equal(c.netActs.length, 0)
})

// ---------- Dano entre jogadores across browsers ----------
// this browser's p1 stands at x 0..40; another browser's chicken (pid 5) acts from the left of her
function victim(pvp = true) {
  const c = online(), got = []
  c.setBlastActors([{ id: 'p1', box: { l: 0, r: 40, t: 0, b: 110 }, v: { x: 0, y: 0 }, push: (x, y, d) => got.push({ x, y, d }) }])
  c.setPvp(pvp)
  return { c, got }
}
const worldTick = (c, n = 1) => { for (let i = 0; i < n; i++) c.step(0.016, { ...body, x: 600 }, { x: 600, y: 50 }, { x: 600, y: 50 }, 0, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }, [], 1000, () => {}) }

test("another browser's Golpe hurts the players here once, when it lands, and only with Dano entre jogadores", () => {
  const attacker = online()
  attacker.give('bat')
  step(attacker, { melee: true }, 0)
  const act = A.cleanAct(JSON.parse(JSON.stringify(sent(attacker)[0])), DEFAULT_ITEMS)
  assert.ok(act.dm > 0 && act.ox !== undefined, 'it says where it leaves from and what it does')
  const at = { ...act, ox: -40, oy: 50 }
  for (const pvp of [false, true]) {
    const { c, got } = victim(pvp)
    c.addRemoteActs([at], 5)
    worldTick(c, 2)
    assert.equal(got.length, 0, 'not before it lands')
    worldTick(c, 60)
    assert.equal(got.length, pvp ? 1 : 0)
    if (pvp) { assert.equal(got[0].d, act.dm); assert.ok(got[0].x > 0, 'pushed away from the attacker') }
  }
  // out of its reach: nothing
  const { c, got } = victim()
  c.addRemoteActs([{ ...at, ox: -2000 }], 5)
  worldTick(c, 60)
  assert.equal(got.length, 0)
})

test("another browser's Bicada hurts a player here in its cone, and a wall in between protects her", () => {
  const pk = { k: 'pk', s: 0, a: 0, p: 10, r: 80, tm: 0.2, ox: -30, oy: 50, ar: 0.5, dm: 12, pu: 100 }
  const { c, got } = victim()
  c.addRemoteActs([A.cleanAct(pk, DEFAULT_ITEMS)], 5)
  worldTick(c, 30)
  assert.equal(got.length, 1); assert.equal(got[0].d, 12)
  const w = victim()
  w.c.addRemoteActs([A.cleanAct(pk, DEFAULT_ITEMS)], 5)
  for (let i = 0; i < 30; i++) w.c.step(0.016, { ...body, x: 600 }, { x: 600, y: 50 }, { x: 600, y: 50 }, 0, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }, [{ l: -15, t: 0, r: -5, b: 110 }], 1000, () => {})
  assert.equal(w.got.length, 0, 'the wall stops the beak')
})

test("another browser's hook that reaches a player here hooks her and pulls her to its hand", () => {
  const { c, got } = victim()
  c.addRemoteShots([{ k: 'gk', i: 'hook', x: -600, y: 50, tx: 20, ty: 50, sp: 2400, l: 1, pl: 1500, dm: 8 }], undefined, 5)
  worldTick(c, 30)
  assert.ok(got.some(g => g.d === 8), 'the damage when it latches')
  assert.ok(got.some(g => g.x < 0 && !g.d), 'then pulled toward its hand, on the left')
  // an older browser's hook (no pull said) only shows
  const old = victim()
  old.c.addRemoteShots([{ k: 'gk', i: 'hook', x: -600, y: 50, tx: 20, ty: 50, sp: 2400, l: 1 }], undefined, 5)
  worldTick(old.c, 30)
  assert.equal(old.got.length, 0)
})

test("this browser's hook holds on another browser's chicken instead of passing through her", () => {
  const c = online()
  c.setNetBodies([{ x: 300, y: 100, pid: 9 }])
  c.give('hook')
  c.setBlastActors([{ id: 'p1', box: { l: -20, r: 20, t: 0, b: 110 }, v: { x: 0, y: 0 }, push: () => {} }])
  // charge and let go, aiming right at her
  for (let i = 0; i < 20; i++) step(c, { fire: true, firePressed: i === 0 }, 0, true)
  step(c, {}, 0, true)
  const gk = c.netShots.find(s => s.k === 'gk')
  assert.ok(gk, 'thrown')
  assert.ok(gk.tx >= 250 && gk.tx <= 350, `it stops on her, at ${gk.tx}`)
  assert.equal(gk.l, 1); assert.ok(gk.pl > 0 && gk.dm >= 0)
})

test('how the item is held goes out while it is more than carried: a throw charging, a staff winding, eating', () => {
  const c = online()
  c.give('bat')
  assert.deepEqual(c.liveActs('p1'), [], 'just carried: nothing to say')
  for (let i = 0; i < 10; i++) step(c, { throwHeld: true }, 0.4)
  const hp = c.liveActs('p1').find(a => a.k === 'hp')
  assert.ok(hp && hp.tc > 0 && hp.ta === 0.4, JSON.stringify(hp))
  const back = A.cleanAct({ ...hp, s: 1 }, DEFAULT_ITEMS)
  const store = A.createNetActStore()
  store.receive(2, [back], 0)
  assert.equal(store.pose(2, 1, 100).hold.tc, back.tc)
  assert.equal(store.pose(2, 1, 100 + A.ACT_HOLD_MS + 1).hold, null, 'gone when no longer said')
  // another local player's loadout is read without disturbing the current one
  const two = online()
  two.give('bat')
  two.use('p2'); two.give('bat')
  for (let i = 0; i < 10; i++) step(two, { fire: true, firePressed: i === 0 })
  two.use('p1')
  assert.ok(two.liveActs('p2').some(a => a.k === 'hp' && a.hc > 0), 'p2 winds her strong blow')
  assert.deepEqual(two.liveActs('p1'), [])
  assert.equal(two.held.item, 'bat')
  assert.deepEqual(two.liveActs('ghost'), [], 'no such player')
})

test("the lobby owner's undead bird whistles at this browser's players too (and only once it flies)", () => {
  const c = online()
  c.setNetFollower(() => {})
  const bird = { id: 900, kind: 'undead', mirror: true, net: 5, x: 700, y: 400, w: 30, h: 30, hp: 10, maxHp: 10, face: 1, state: 'idle', animT: 0, deadT: 0, harmony: 0, flash: 0, vx: 0, data: { bird: 'pardal', phase: 'bird', params: {} } }
  c.targets.push(bird)
  let most = 0
  for (let i = 0; i < 60 * 8; i++) { worldTick(c); most = Math.max(most, c.noteShots.filter(n => n.source === 'bird').length) }
  assert.ok(most >= 1, 'it whistled a note at her')
  const quiet = online()
  quiet.setNetFollower(() => {})
  quiet.targets.push({ ...bird, data: { bird: 'pardal', phase: 'fall', params: {} } })
  let none = 0
  for (let i = 0; i < 60 * 8; i++) { worldTick(quiet); none = Math.max(none, quiet.noteShots.filter(n => n.source === 'bird').length) }
  assert.equal(none, 0, 'an undead on the ground does not whistle')
})
