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
