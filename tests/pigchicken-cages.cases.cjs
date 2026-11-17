const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const G = loadTs('lib/pigchicken/cages.ts')
const S = loadTs('lib/pigchicken/souls.ts')
const I = loadTs('lib/pigchicken/items.ts')
const L = loadTs('lib/pigchicken/layout.ts')
const { cageArt } = loadTs('lib/pigchicken/cage-art.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

// ---------- the cages by themselves ----------
test('six models, each with its own limit and art; a cage is not an inventory item', () => {
  assert.deepEqual(I.CAGE_IDS, ['cage', 'cageWire', 'cageConcorde', 'cageWood', 'cageArch', 'cageFlight'])
  // the limits are the game's defaults (data/pigchicken/default-items.json): whole, within bounds, never smaller in a bigger model
  const caps = I.CAGE_IDS.map(id => I.DEFAULT_ITEMS[id].cageSouls)
  caps.forEach((n, i) => assert.ok(Number.isInteger(n) && n >= 1 && n <= G.CAGE_CAP_MAX && (i === 0 || n >= caps[i - 1]), `${I.CAGE_IDS[i]}: ${n}`))
  for (const id of I.CAGE_IDS) {
    assert.ok(I.isCage(id) && I.RACK_ITEM_IDS.includes(id), id)
    const a = cageArt(id)
    assert.ok(a.w > 0 && a.h > 0 && a.back.length && a.front.length && a.sil[2].length, `${id}: its layers and silhouette`)
    assert.ok(a.birds.length && a.floor.length === 3, `${id}: where the birds and the chicks go`)
  }
  assert.equal(I.isCage('pistol'), false)
  assert.equal(I.DEFAULT_ITEMS.pistol.cageSouls, 0)
})

test('the limit of a cage is a whole number from 1 to 99; its room counts the souls on their way', () => {
  assert.deepEqual([G.cageCap(0), G.cageCap(7.6), G.cageCap(500), G.cageCap('x'), G.cageCap(NaN, 12)], [1, 8, 99, 8, 12])
  const c = G.newCage(3)
  assert.deepEqual(c, { cap: 3, souls: [], flash: null, flashT: 0, enterT: Infinity })
  c.souls.push({ id: 1 }, { id: 2 })
  assert.deepEqual([G.cageRoom(c), G.cageRoom(c, 1), G.cageRoom(c, 5)], [1, 0, 0])
  const full = G.newCage(1); full.souls.push({ id: 3 })
  const list = [{ item: 'cage', cage: full }, { item: 'cageWire', cage: c }]
  assert.equal(G.cageSouls(list), 3)
  assert.equal(G.cageWithRoom(list), 1, 'the one in front is full: the next one')
  assert.equal(G.cageWithRoom(list, k => (k === c ? 1 : 0)), -1, 'its last place is taken by a soul on its way')
  assert.equal(G.cageWithRoom([]), -1)
})

test('a press on a cage behind swaps it with the one in front; the bind turns them', () => {
  const a = ['a', 'b', 'c']
  assert.equal(G.bringFront(a, 2), true); assert.deepEqual(a, ['c', 'b', 'a'])
  assert.equal(G.bringFront(a, 0), false); assert.equal(G.bringFront(a, 3), false)
  assert.equal(G.cycleCages(a), true); assert.deepEqual(a, ['b', 'a', 'c'])
  assert.equal(G.cycleCages(['only']), false)
})

test('a cage glows for a moment and swings in when taken', () => {
  const c = G.newCage(8)
  G.flashCage(c, 'gain')
  assert.deepEqual([c.flash, c.flashT], ['gain', G.CAGE_FLASH])
  G.stepCage(c, G.CAGE_FLASH / 2); assert.equal(c.flash, 'gain')
  G.stepCage(c, G.CAGE_FLASH); assert.deepEqual([c.flash, c.flashT], [null, 0])
  c.enterT = 0
  assert.equal(G.cageEnter(c.enterT).k, 0, 'outside the screen')
  G.stepCage(c, G.CAGE_ENTER / 3)
  const mid = G.cageEnter(c.enterT)
  assert.ok(mid.k > 0.5 && mid.k < 1 && mid.swing !== 0, 'on its way, swinging')
  G.stepCage(c, G.CAGE_ENTER); G.stepCage(c, 0.016)
  assert.equal(c.enterT, Infinity)
  assert.deepEqual(G.cageEnter(c.enterT), { k: 1, swing: 0 })
})

test('each soul has its own spot in the cage, whoever else is in it', () => {
  for (const id of [1, 2, 77, 123456]) {
    const p = G.soulSpot(id)
    assert.deepEqual(G.soulSpot(id), p)
    assert.ok(p.u >= 0 && p.u < 1 && p.v >= 0 && p.v < 1 && (p.face === 1 || p.face === -1))
  }
  const us = new Set([...Array(50).keys()].map(i => Math.floor(G.soulSpot(i + 1).u * 10)))
  assert.ok(us.size >= 8, 'spread over the cage')
})

test('the hanging cage lags behind the camera and comes to rest', () => {
  const s = G.newSway()
  for (let i = 0; i < 20; i++) G.swayStep(s, 4000, 0.016)
  assert.ok(s.a > 0.02, 'the camera speeds up to the right: the cage hangs back, to the left')
  const t = G.newSway()
  for (let i = 0; i < 20; i++) G.swayStep(t, -4000, 0.016)
  assert.ok(t.a < -0.02, 'to the left: it hangs back, to the right')
  for (let i = 0; i < 20; i++) G.swayStep(s, 1e7, 0.016)
  assert.ok(Math.abs(s.a) <= G.SWAY.max + 1e-9, 'never past its limit')
  for (let i = 0; i < 600; i++) G.swayStep(s, 0, 0.016)
  assert.ok(Math.abs(s.a) < 0.002 && Math.abs(s.v) < 0.02, 'still again')
})

test('the Itens panel shows a cage as full as its limit: souls 1 to n, birds of many species and a few chicks, always the same', () => {
  const souls = G.sampleSouls(50)
  assert.deepEqual(souls.map(s => s.id), [...Array(50).keys()].map(i => i + 1))
  const chicks = souls.filter(s => s.species === 'chick')
  assert.ok(chicks.length >= 2 && chicks.length < 10 && chicks.every(s => s.bird === null && Number.isInteger(s.chick)))
  assert.ok(new Set(souls.filter(s => s.species !== 'chick').map(s => s.species)).size >= 6)
  assert.ok(souls.some(s => s.state === 'dead'))
  assert.deepEqual(G.sampleSouls(50), souls)
  assert.deepEqual(G.sampleSouls(8), souls.slice(0, 8), 'a soul stays where it is when the limit grows')
  assert.equal(G.sampleSouls(0).length, 0)
  assert.equal(G.sampleSouls(500).length, G.CAGE_CAP_MAX)
})

test("online: a browser tells its players' cages as counters; junk is dropped and a change of count glows", () => {
  const cage = (item, n, cap) => { const c = G.newCage(cap); for (let i = 0; i < n; i++) c.souls.push({ id: i + 1 }); return { item, cage: c } }
  const sent = G.exportCages([[cage('cageWood', 2, 20), cage('cage', 0, 8)], [], [cage('cageFlight', 50, 50)]], I.CAGE_IDS)
  assert.deepEqual(sent, [[[3, 2, 20], [0, 0, 8]], [], [[5, 50, 50]]])
  const got = G.cleanNetCages(JSON.parse(JSON.stringify(sent)), I.CAGE_IDS)
  assert.deepEqual(got, [[{ item: 'cageWood', n: 2, cap: 20 }, { item: 'cage', n: 0, cap: 8 }], [], [{ item: 'cageFlight', n: 50, cap: 50 }]])
  assert.equal(G.cleanNetCages('nope', I.CAGE_IDS), null)
  assert.deepEqual(G.cleanNetCages([[[0, 500, 3], ['x', 1, 1], [0, 1], 7, [0, 1, 8], [1, 1, 8], [2, 1, 8], [3, 1, 8]], 'junk'], I.CAGE_IDS),
    [[{ item: 'cage', n: 3, cap: 3 }], []], 'counts clamped to the limit, junk dropped, three cages at most')
  assert.equal(G.cleanNetCages([[], [], [], [], [], []], I.CAGE_IDS).length, G.NET_CAGE_PLAYERS)

  let mirrors = G.importCages(undefined, got[0])
  assert.deepEqual(mirrors.map(m => m.flash), [null, null], 'first seen: no glow')
  mirrors = G.importCages(mirrors, [{ item: 'cageWood', n: 3, cap: 20 }, { item: 'cage', n: 0, cap: 8 }])
  assert.deepEqual(mirrors.map(m => [m.n, m.flash, m.flashT]), [[3, 'gain', G.CAGE_FLASH], [0, null, 0]])
  mirrors = G.importCages(mirrors, [{ item: 'cageWood', n: 3, cap: 20 }, { item: 'cage', n: 0, cap: 8 }])
  assert.equal(mirrors[0].flash, 'gain', 'the same count again keeps the glow going')
  mirrors = G.importCages(mirrors, [{ item: 'cageWood', n: 2, cap: 20 }])
  assert.deepEqual(mirrors.map(m => [m.n, m.flash]), [[2, 'lose']])
  // the cages turned: another model in that place is another cage, not a change of count
  mirrors = G.importCages(mirrors, [{ item: 'cage', n: 5, cap: 8 }])
  assert.equal(mirrors[0].flash, null)
  const m = { item: 'cage', n: 1, cap: 8, flash: 'lose', flashT: 0.1 }
  G.stepCageMirror(m, 0.2)
  assert.deepEqual([m.flash, m.flashT], [null, 0])
})

// ---------- in the combat ----------
const me = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, body = me) {
  c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 40, () => {}, { world: true, peckOrigin: { x: 0, y: 0 } })
}
function world(...cages) {
  const c = createCombat()
  c.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} })
  c.setView(-1000, 1000)
  for (const id of cages) c.give(id)
  c.give('passagua'); step(c, { slot: 1 })
  return c
}
const land = c => { for (let t = 0; t < S.ABDUCT_TIME + 0.6; t += 0.016) step(c) }
const bird = (x = 40, y = 0) => ({ kind: 'bird', x, y, vx: 0, vy: 0, t: 0, color: '#9be7ff', face: 1, groundY: 0, homeX: x, homeY: y })
// n birds in front of her, one sweep of the Passaguá
function sweepBirds(c, n) {
  const birds = [...Array(n)].map(() => bird())
  c.critters.push(...birds)
  for (let i = 0; i < 50; i++) { for (const b of birds) if (c.critters.includes(b)) Object.assign(b, { x: 40, y: 0, vx: 0, vy: 0 }); step(c, { melee: i === 0 }) }
  land(c)
  return birds
}
const names = c => c.cages.map(o => o.item)
const counts = c => c.cages.map(o => o.cage.souls.length)

test('nobody starts with a cage; up to three hang with her, outside the inventory, the first one in front', () => {
  const c = world()
  assert.deepEqual(names(c), [])
  assert.equal(c.capturedSouls, 0)
  assert.deepEqual([...c.bagOfSouls], [])
  assert.equal(c.releaseSoul({ x: 0, y: 0 }), null)
  c.give('cage')
  assert.equal(c.cages[0].cage.enterT, 0, 'it comes in swinging')
  c.give('cageWood'); c.give('cageFlight'); c.give('cageWire')
  assert.deepEqual(names(c), ['cage', 'cageWood', 'cageFlight'], 'a new one hangs behind; the fourth does not fit')
  assert.deepEqual(c.cages.map(o => o.cage.cap), ['cage', 'cageWood', 'cageFlight'].map(id => I.DEFAULT_ITEMS[id].cageSouls))
  assert.ok(!c.inventory.some(o => o && I.isCage(o.item)))
  assert.equal(c.rotateCages(2), true); assert.deepEqual(names(c), ['cageFlight', 'cageWood', 'cage'], 'a press on one behind: it swaps with the one in front')
  assert.equal(c.rotateCages(), true); assert.deepEqual(names(c), ['cageWood', 'cage', 'cageFlight'], 'the bind: the next one')
  assert.equal(c.rotateCages(0), false)
  assert.equal(world('cage').rotateCages(), false, 'one cage: nothing to turn')
})

test('without a cage the Passaguá keeps nothing: it shoves the chicks and scares the birds off', () => {
  const c = world()
  const b = bird()
  c.critters.push(b)
  let caught = 0
  const pushes = []
  c.setCatchables([{ x: 30, y: 10, r: 20, catch: () => caught++, push: (vx, vy) => pushes.push([vx, vy]), style: 2 }])
  for (let i = 0; i < 30 && !c.scares.length; i++) { Object.assign(b, { x: 40, y: 0, vx: 0, vy: 0 }); step(c, { melee: i === 0 }) }
  assert.equal(c.scares.length, 1, 'the bird leaves in the quick flight of a soul')
  assert.ok(!c.critters.includes(b))
  assert.deepEqual([c.abductions.length, c.capturedSouls, caught], [0, 0, 0])
  assert.equal(pushes.length, 1)
  assert.ok(pushes[0][0] > 0 && pushes[0][1] < 0, 'the chick is shoved away from her and up')
  const to = { x: c.scares[0].tx, y: c.scares[0].ty }
  assert.ok(Math.hypot(to.x, to.y) > 200 && to.x > -1000 && to.x < 1000, `far from her, on the screen (${Math.round(to.x)}, ${Math.round(to.y)})`)
  for (let i = 0; i < 60 && c.scares.length; i++) step(c)
  assert.equal(c.scares.length, 0)
  assert.ok(c.critters.includes(b), 'and is a loose bird again')
  assert.ok(Math.hypot(b.x - to.x, b.y - to.y) < 60, 'where it went')
  assert.equal(c.soulNews.length, 0, 'nobody caught it')
  assert.equal(c.cageDeny, 0)
})

test('the souls go to the cage in front; full, the next one with room comes to the front; none: the cages say no', () => {
  const c = world('cage', 'cageWire')
  c.cages[0].cage.cap = 2; c.cages[1].cage.cap = 1
  sweepBirds(c, 1)
  assert.deepEqual([names(c), counts(c)], [['cage', 'cageWire'], [1, 0]])
  assert.equal(c.cages[0].cage.flash, null, 'the blue glow is over by now')
  const b = bird(); c.critters.push(b)
  for (let i = 0; i < 40 && !c.abductions.length; i++) { Object.assign(b, { x: 40, y: 0, vx: 0, vy: 0 }); step(c, { melee: i === 0 }) }
  for (let i = 0; i < 200 && c.abductions.length; i++) step(c)
  assert.deepEqual([c.cages[0].cage.flash, c.cages[0].cage.flashT > 0], ['gain', true], 'it glows blue when the soul gets there')
  for (let i = 0; i < 60; i++) step(c)
  assert.deepEqual(counts(c), [2, 0])
  // the one in front is full: the other one takes its place by itself
  sweepBirds(c, 1)
  assert.deepEqual([names(c), counts(c)], [['cageWire', 'cage'], [1, 2]])
  assert.equal(c.capturedSouls, 3)
  assert.deepEqual([...c.bagOfSouls].length, 1, 'the counter shows the one in front')
  // nothing has room: the bird stays and the cages shake
  const left = bird(); c.critters.push(left)
  let deny = 0
  for (let i = 0; i < 40; i++) { Object.assign(left, { x: 40, y: 0, vx: 0, vy: 0 }); step(c, { melee: i === 0 }); deny = Math.max(deny, c.cageDeny) }
  assert.ok(deny > 0.9, 'the denial')
  assert.ok(c.critters.includes(left), 'not caught')
  assert.deepEqual([c.scares.length, c.abductions.length, c.capturedSouls], [0, 0, 3], 'nor scared off')
  for (let t = 0; t < G.CAGE_DENY + 0.1; t += 0.016) step(c)
  assert.equal(c.cageDeny, 0)
  // two birds, one place left in all the cages: one is caught, the other stays
  c.critters.length = 0
  c.cages[1].cage.cap = 3
  const birds = sweepBirds(c, 2)
  assert.equal(c.capturedSouls, 4)
  assert.equal(birds.filter(x => c.critters.includes(x)).length, 1)
  assert.deepEqual([names(c), counts(c)], [['cage', 'cageWire'], [3, 1]], 'the one with room came to the front for it')
})

test('a press on the cage in front lets out its last soul, only its own; the Callback brings back what fits', () => {
  const c = world('cage', 'cageWire')
  c.cages[0].cage.cap = 1
  sweepBirds(c, 1); sweepBirds(c, 1)
  assert.deepEqual([names(c), counts(c)], [['cageWire', 'cage'], [1, 1]])
  const wire = c.cages[0].cage, basic = c.cages[1].cage, top = wire.souls[0]
  assert.equal(c.releaseSoul({ x: 100, y: -300 }), top)
  assert.deepEqual([wire.flash, wire.flashT, basic.flash], ['lose', G.CAGE_FLASH, null], 'it glows red')
  assert.equal(c.releaseSoul({ x: 100, y: -300 }), null, 'the one in front is empty: the other cage keeps its soul')
  assert.deepEqual([counts(c), c.looseSouls, c.capturedSouls], [[0, 1], 1, 1])
  // the cage in front gets too small for it meanwhile: the Callback has nowhere to put it
  for (let t = 0; t < 1; t += 0.016) step(c)
  wire.cap = 1; wire.souls.push(S.newSoul(9000, S.originOf('horde', 'alive'), '#fff', null))
  assert.equal(c.callSouls(), 0)
  assert.ok(c.cageDeny > 0.9, 'nothing fits: the denial')
  assert.equal(c.looseSouls, 1, 'it stays out')
  wire.cap = 2
  assert.equal(c.callSouls(), 1)
  for (let t = 0; t < 3; t += 0.016) step(c)
  assert.deepEqual([counts(c), c.looseSouls], [[2, 1], 0])
  assert.equal(wire.souls[1], top, 'back in the cage in front')
})

test('a chick caught is still a chick: it sits in the cage as one and, let out, goes back to the flock', () => {
  const c = world('cage')
  let gone = 0
  c.setCatchables([{ x: 40, y: 0, r: 20, catch: () => gone++, push: () => assert.fail('with a cage it is caught, not shoved'), style: 3 }])
  for (let i = 0; i < 50; i++) step(c, { melee: i === 0 })
  land(c)
  assert.equal(gone, 1)
  const soul = c.bagOfSouls[0]
  assert.deepEqual({ species: soul.species, state: soul.state, bird: soul.bird, chick: soul.chick }, { species: 'chick', state: 'alive', bird: null, chick: 3 })
  assert.equal(c.releaseSoul({ x: 120, y: -40 }), soul)
  assert.deepEqual(c.chickReleases, [{ soul, owner: 'p1', x: 120, y: -40 }], 'for the screen to hatch it there')
  assert.deepEqual([c.freedSouls.length, c.looseSouls, c.capturedSouls], [0, 0, 0], 'not a soul flying free')
  assert.equal(c.cages[0].cage.flash, 'lose')
})

test('a cage on the floor keeps its souls: whoever takes it takes them; with three, it swaps with the one in front', () => {
  const c = world('cage')
  sweepBirds(c, 2)
  // one lying in the world with a limit of its own, taken with Pegar: it hangs behind
  c.addPickup(0, 'cageWood', 0, 5)
  step(c); step(c, { grab: true })
  assert.deepEqual([names(c), c.cages.map(o => o.cage.cap)], [['cage', 'cageWood'], [I.DEFAULT_ITEMS.cage.cageSouls, 5]], 'the one she had stays in front')
  assert.equal(c.cages[1].cage.enterT < G.CAGE_ENTER, true, 'swinging in')
  assert.equal(c.hoverSwaps, false)
  // running over one (Correr's press) takes it while there is room
  c.addPickup(0, 'cageArch', 0)
  step(c); step(c, { grab: true, grabHeld: true, grabRun: true })
  assert.deepEqual(names(c), ['cage', 'cageWood', 'cageArch'], 'running over it takes it')
  assert.equal(c.pickups.length, 0)
  // a fourth one, with souls in it
  const id = c.addPickup(0, 'cageFlight', 0)
  const lying = c.pickups.find(p => p.id === id).owned
  lying.cage.souls.push(S.newSoul(7001, S.originOf('jelly', 'alive'), '#c77dff', null), S.newSoul(7002, S.originOf('horde', 'dead'), '#fff', 'pardal'))
  const mine = c.cages[0]
  step(c)
  assert.equal(c.hoverSwaps, true, 'the hint says it swaps')
  step(c, { melee: true })
  assert.deepEqual(names(c), ['cage', 'cageWood', 'cageArch'], 'Golpe never swaps')
  for (let i = 0; i < 40; i++) step(c)
  // with no room, running over it or holding Pegar while walking leaves it there
  for (let i = 0; i < 5; i++) step(c, { grab: i === 0, grabHeld: true, grabRun: true })
  step(c, { grabUp: true })
  for (let i = 0; i < 5; i++) step(c, { grabHeld: true })
  step(c, { grabUp: true })
  assert.deepEqual(names(c), ['cage', 'cageWood', 'cageArch'], 'running or walking over it never swaps')
  assert.equal(c.hoverSwaps, true, 'still offered, to swap')
  // Pegar itself: down on it does nothing yet, up on it swaps
  step(c, { grab: true, grabHeld: true })
  for (let i = 0; i < 3; i++) step(c, { grabHeld: true })
  assert.deepEqual(names(c), ['cage', 'cageWood', 'cageArch'], 'not while it is held down')
  step(c, { grabUp: true })
  assert.deepEqual(names(c), ['cageFlight', 'cageWood', 'cageArch'], 'it takes the place of the one in front')
  assert.equal(c.cages[0], lying)
  assert.equal(c.capturedSouls, 2, 'its souls came with it')
  const dropped = c.pickups.find(p => p.owned === mine)
  assert.ok(dropped, 'the one that was in front is on the floor')
  assert.deepEqual([dropped.owned.item, dropped.owned.cage.souls.length, dropped.owned.cage.enterT], ['cage', 2, Infinity], 'with its two souls')
})

test("each player has their own cages; the ones of a player who left fall where they were, with what is in them", () => {
  const c = world('cage')
  c.use('p2'); c.give('cageArch'); c.give('cageWire')
  c.cagesOf('p2')[0].cage.souls.push(S.newSoul(8001, S.originOf('jelly', 'alive'), '#c77dff', null))
  assert.deepEqual(names(c), ['cageArch', 'cageWire'])
  c.use('p1')
  assert.deepEqual([names(c), c.cagesOf('p2').map(o => o.item), c.cagesOf('nobody').length], [['cage'], ['cageArch', 'cageWire'], 0])
  assert.equal(c.capturedSouls, 0)
  c.drop('p2')
  assert.equal(c.cagesOf('p2').length, 0)
  const fallen = c.pickups.filter(p => p.owned.cage)
  assert.deepEqual(fallen.map(p => [p.owned.item, p.owned.cage.souls.length]).sort(), [['cageArch', 1], ['cageWire', 0]])
})

// ---------- in the Pátio's layout ----------
test('a rack or a loose cage saves its own limit; the Pátio padrão has one Gaiola básica to take', () => {
  const rack = L.defaultLayout().elements.find(e => e.id === 'rack-cage')
  assert.ok(rack, 'in the default layout')
  assert.deepEqual([rack.kind, rack.params.item, rack.params.cageSouls], ['rack', 'cage', undefined])
  assert.equal(L.defaultLayout().elements.filter(e => (e.kind === 'rack' || e.kind === 'loose') && I.isCage(e.params.item)).length, 1, 'only that one')

  const keep = (kind, item, cageSouls) => L.normalizeElement({ ...rack, id: 'x', kind, params: { ...rack.params, item, cageSouls } }).params.cageSouls
  assert.deepEqual([keep('rack', 'cageWood', 33.4), keep('rack', 'cage', 500), keep('rack', 'cage', 0), keep('loose', 'cageFlight', 7)], [33, 99, 1, 7])
  assert.equal(keep('rack', 'pistol', 12), undefined, 'only a cage has a limit')
  assert.equal(keep('rack', 'cage', 'many'), undefined)

  // a Pátio padrão saved before the cages gets its rack once; any other Pátio does not
  const old = { v: 7, elements: L.defaultLayout().elements.filter(e => e.id !== 'rack-cage') }
  const had = n => n.elements.filter(e => e.kind === 'rack' && e.params.item === 'cage').length
  assert.equal(had(L.normalizeLayout(JSON.parse(JSON.stringify(old)), true)), 1)
  assert.equal(had(L.normalizeLayout(JSON.parse(JSON.stringify(old)), false)), 0)
  assert.equal(had(L.normalizeLayout({ ...JSON.parse(JSON.stringify(old)), v: L.LAYOUT_VERSION }, true)), 0, 'taken off by the admin since: it stays off')
})
