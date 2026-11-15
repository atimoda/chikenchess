// The souls flying free in the online Pátio (lib/pigchicken/net-souls.ts and the combat's hooks): each browser's
// souls mirrored on the others, a Passaguá over a mirror asking its browser for the soul, and the undead birds
// asked of the lobby's owner. And the chicks of each browser on the others (lib/chicken/net-chicks.ts), asked of
// their browser the same way.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const S = loadTs('lib/pigchicken/souls.ts')
const N = loadTs('lib/pigchicken/net-souls.ts')
const W = loadTs('lib/pigchicken/net-world.ts')
const K = loadTs('lib/chicken/net-chicks.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

const me = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, world = true) {
  c.step(0.016, me, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 40, () => {}, { world, peckOrigin: { x: 0, y: 0 } })
}
function world(item) {
  const c = createCombat()
  c.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} })
  c.setView(-1000, 1000)
  c.setNetOn(true)
  c.give('cageFlight')
  if (item) { c.give(item); step(c, { slot: 1 }) }
  return c
}
const land = c => { for (let t = 0; t < S.ABDUCT_TIME + 0.4; t += 0.016) step(c) }
// n birds caught, one sweep each (a chick let out of a Gaiola is a chick again, not a soul flying free)
function bagOf(c, n) {
  for (let k = 0; k < n; k++) {
    const b = { kind: 'bird', x: 40, y: 0, vx: 0, vy: 0, t: 0, color: '#9be7ff', face: 1, groundY: 0, homeX: 40, homeY: 0 }
    c.critters.push(b)
    for (let i = 0; i < 50; i++) { if (c.critters.includes(b)) Object.assign(b, { x: 40, y: 0, vx: 0, vy: 0 }); step(c, { melee: i === 0 }) }
  }
  land(c)
}
const holdSoul = (f, x, y) => { Object.assign(f.brain, { x, y, ax: x, ay: y, vx: 0, vy: 0, mode: 'rest', settle: 0 }); f.x = x; f.y = y }
const holdMirror = (m, x, y) => Object.assign(m, { x, y, netX: x, netY: y })
const A = 3, B = 5 // the browsers' pids

test('what a soul is travels whole, and junk is not a soul', () => {
  const soul = S.newSoul(12, S.originOf('lantern', 'dead', { shot: 'strings', note: 'leading', weapon: 'arrow' }), '#ff3b3b', 'sabia')
  const who = N.soulWho(soul)
  assert.deepEqual(who, ['lantern', 'dead', 'strings', 'leading', 'arrow', '#ff3b3b', 'sabia'])
  assert.deepEqual(N.soulFromWho(JSON.parse(JSON.stringify(who)), 12), soul, 'the same soul on the other side, rarity and all')
  assert.equal(N.soulFromWho(who, 77).id, 77, 'with the id the browser that takes it gives')
  const chick = N.soulFromWho(['chick', 'alive', null, null, null, S.CHICK_SOUL_COLOR, 'sabia'], 1)
  assert.deepEqual({ bird: chick.bird, weapon: chick.weapon, rarity: chick.rarity }, { bird: null, weapon: null, rarity: 'common' })
  assert.equal(N.soulFromWho(['jelly', 'dead', 'nope', 'nope', 'nope', '#fff', 'nope'], 1).weapon, 'impact', 'a dead one always died of something')
  assert.deepEqual((({ shot, note, bird }) => ({ shot, note, bird }))(N.soulFromWho(['jelly', 'alive', 'nope', 7, {}, '#fff', 'nope'], 1)), { shot: null, note: null, bird: null })
  for (const junk of [null, 'jelly', [], ['nope', 'alive', null, null, null, '#fff', null], ['jelly', 'asleep', null, null, null, '#fff', null], ['jelly', 'alive', null, null, null, 'url(javascript:1)', null], ['jelly', 'alive', null, null, null, 7, null], ['constructor', 'alive', null, null, null, '#fff', null]])
    assert.equal(N.soulFromWho(junk, 1), null, JSON.stringify(junk))
  assert.deepEqual(N.cleanTake({ k: 's', id: 30000007, junk: 1 }), { k: 's', id: 30000007 })
  assert.deepEqual(N.cleanTake({ k: 'c', id: 30000001 }), { k: 'c', id: 30000001 })
  assert.equal(N.takeOwner(30000007), 3)
  for (const junk of [null, { k: 'x', id: 1 }, { k: 's', id: 'a' }, { k: 's', id: -1 }, { k: 'f' }]) assert.equal(N.cleanTake(junk), null)
  assert.deepEqual(N.cleanGive({ k: 'f', id: 5, soul: [...who, 'more'] }), { k: 'f', id: 5, soul: who })
  assert.equal(N.cleanGive({ k: 's', id: 5, soul: ['nope'] }), null)
  assert.equal(N.cleanGive({ k: 's', id: 5 }), null)
})

test("a browser's souls show on the others as mirrors that glide to where they are, and leave when they do", () => {
  const a = world('passagua'), b = world()
  bagOf(a, 2)
  a.releaseSoul({ x: 300, y: -300 }); a.releaseSoul({ x: 300, y: -300 })
  for (let t = 0; t < 1; t += 0.016) step(a)
  const [one, other] = a.freedSouls
  holdSoul(one, 200, -150); holdSoul(other, -400, -200)
  const told = new Set()
  const first = N.exportSouls(a.freedSouls, A, told, false)
  assert.equal(first.length, 2)
  assert.deepEqual(first[0], [W.netIdFor(A, one.soul.id), 200, -150, one.face, N.soulWho(one.soul)], 'what it is goes the first time')
  b.importNetSouls(A, JSON.parse(JSON.stringify(first)))
  assert.equal(b.netSouls.length, 2)
  const m = b.netSouls[0]
  assert.deepEqual({ net: m.net, pid: m.pid, x: m.x, y: m.y, asked: m.asked }, { net: first[0][0], pid: A, x: 200, y: -150, asked: null })
  assert.deepEqual(m.soul, { ...one.soul }, 'the same soul: it is drawn as its entry in the library')
  // it moves there: only the place travels now, and the mirror glides to it
  holdSoul(one, 260, -150)
  const next = N.exportSouls(a.freedSouls, A, told, false)
  assert.ok(next.every(e => e.length === 4), 'what it is is not told again')
  assert.equal(N.exportSouls(a.freedSouls, A, told, true)[0].length, 5, 'unless everything is (someone joined, or now and then)')
  b.importNetSouls(A, next)
  step(b)
  assert.ok(m.x > 200 && m.x < 260 && m.netX === 260, `on its way (${m.x})`)
  for (let i = 0; i < 60; i++) step(b)
  assert.ok(Math.abs(m.x - 260) < 0.5)
  // a browser that only now hears of it (no `who` yet) waits; a portal takes it straight there
  const late = world()
  late.importNetSouls(A, next)
  assert.equal(late.netSouls.length, 0)
  holdSoul(one, 5000, -150)
  b.importNetSouls(A, N.exportSouls(a.freedSouls, A, told, false))
  assert.equal(m.x, 5000)
  // souls that are not that browser's are refused; another browser's list does not touch these
  b.importNetSouls(B, [[W.netIdFor(A, 999), 0, 0, 1, N.soulWho(one.soul)], [W.netIdFor(B, 1), 1e9, 0, 1, N.soulWho(one.soul)], 'junk', [W.netIdFor(B, 2), 10, 20, -1, ['nope']]])
  assert.equal(b.netSouls.length, 2)
  b.importNetSouls(B, [[W.netIdFor(B, 2), 10, 20, -1, N.soulWho(other.soul)]])
  assert.deepEqual(b.netSouls.map(x => x.pid), [A, A, B])
  assert.equal(b.netSouls[2].face, -1)
  // called back on its browser: it stops being sent, and leaves here in a little cloud
  step(a); a.callSouls()
  for (let t = 0; t < 1.5; t += 0.016) step(a)
  assert.equal(a.freedSouls.length, 0)
  const puffs = b.puffs.length
  b.importNetSouls(A, N.exportSouls(a.freedSouls, A, told, false))
  assert.deepEqual(b.netSouls.map(x => x.pid), [B])
  assert.equal(b.puffs.length, puffs + 2)
  assert.equal(told.size, 0)
  // a browser that left the lobby takes its souls with it; offline, none of the others' stay
  b.keepNetSouls(new Set([A]))
  assert.equal(b.netSouls.length, 0)
  b.importNetSouls(B, [[W.netIdFor(B, 2), 10, 20, -1, N.soulWho(other.soul)]])
  b.setNetOn(false)
  assert.equal(b.netSouls.length, 0)
  // no more than 64 of one browser
  const many = Array.from({ length: 80 }, (_, i) => ({ soul: { ...one.soul, id: i + 1 }, x: i, y: 0, face: 1 }))
  assert.equal(N.exportSouls(many, A, new Set(), true).length, N.NET_SOULS_MAX)
})

test("a Passaguá over another browser's soul asks that browser for it; it is given once and changes bags", () => {
  const a = world('passagua'), b = world('passagua'), c = world('passagua')
  bagOf(a, 1)
  const soul = a.bagOfSouls[0]
  a.releaseSoul({ x: 40, y: 0 })
  const told = new Set()
  const sync = () => { const l = N.exportSouls(a.freedSouls, A, told, true); b.importNetSouls(A, l); c.importNetSouls(A, l) }
  sync()
  const m = b.netSouls[0], id = m.net
  // B sweeps where it is: a little cloud, the mirror hides, and nothing counts yet
  b.soulNews.length = 0
  for (let i = 0; i < 40; i++) { holdMirror(m, 40, 0); step(b, { melee: i === 0 }) }
  assert.deepEqual(b.netTakes, [{ k: 's', id, pid: A }], 'asked once, of the browser that flies it')
  assert.equal(m.asked !== null, true)
  assert.ok(b.puffs.length > 0 || b.sounds.some(s => s.kind === 'puff'))
  land(b)
  assert.equal(b.capturedSouls, 0, 'not in the Bag of souls before the answer')
  assert.equal(b.abductions.length, 0)
  // C asks too, a moment later
  for (let i = 0; i < 40; i++) { holdMirror(c.netSouls[0], 40, 0); step(c, { melee: i === 0 }) }
  // A gives it to the first one that asked, and has nothing for the second
  const take = N.cleanTake(b.netTakes.splice(0)[0])
  const who = a.giveNetTake(take, A)
  assert.deepEqual(who, N.soulWho(soul))
  assert.equal(a.freedSouls.length, 0, 'it left the browser that flew it')
  assert.equal(a.capturedSouls, 0, 'and its Bag of souls')
  assert.equal(a.giveNetTake(N.cleanTake(c.netTakes.splice(0)[0]), A), null, 'given once')
  assert.equal(a.giveNetTake({ k: 's', id: W.netIdFor(B, soul.id) }, A), null, "another browser's id is not this one's soul")
  // the answer: it flies to B's counter and counts; it is new to B's library
  assert.equal(b.applyNetGive(N.cleanGive({ ...take, soul: who })), true)
  assert.equal(b.abductions.length, 1)
  assert.deepEqual({ x: b.abductions[0].x, y: b.abductions[0].y, owner: b.abductions[0].owner }, { x: 40, y: 0, owner: 'p1' }, 'from where it was caught')
  land(b)
  assert.equal(b.capturedSouls, 1)
  const got = b.bagOfSouls[0]
  assert.deepEqual(N.soulWho(got), N.soulWho(soul), 'the same soul')
  assert.equal(b.soulNews.length, 1)
  assert.equal(b.soulNews[0].soul, got)
  assert.equal(b.applyNetGive(N.cleanGive({ ...take, soul: who })), false, 'the same answer twice counts once')
  assert.equal(c.applyNetGive({ k: 's', id: 123, soul: who }), false, 'an answer nobody asked for is nothing')
  // A no longer sends it: the mirrors leave (no second cloud where a Passaguá just made one)
  const puffs = c.puffs.length
  sync()
  assert.equal(b.netSouls.length + c.netSouls.length, 0)
  assert.equal(c.puffs.length, puffs)
  // and B lets it out: now it is B's, and A sees it
  b.releaseSoul({ x: 0, y: -100 })
  a.importNetSouls(B, N.exportSouls(b.freedSouls, B, new Set(), true))
  assert.deepEqual(N.soulWho(a.netSouls[0].soul), N.soulWho(soul))
})

test('a soul asked for and never answered shows again; a late answer is nothing', () => {
  const a = world('passagua'), b = world('passagua')
  bagOf(a, 1)
  a.releaseSoul({ x: 40, y: 0 })
  b.importNetSouls(A, N.exportSouls(a.freedSouls, A, new Set(), true))
  const m = b.netSouls[0]
  for (let i = 0; i < 40; i++) { holdMirror(m, 40, 0); step(b, { melee: i === 0 }) }
  const take = b.netTakes.splice(0)[0]
  assert.ok(m.asked !== null)
  for (let t = 0; t < N.TAKE_WAIT; t += 0.016) step(b)
  assert.equal(m.asked, null, 'back in sight')
  for (let t = 0; t < N.TAKE_WAIT * 1.2; t += 0.016) step(b)
  assert.equal(b.applyNetGive({ k: take.k, id: take.id, soul: N.soulWho(a.freedSouls[0].soul) }), false)
  // offline nothing is asked
  b.setNetOn(false)
  assert.equal(b.netTakes.length, 0)
})

test("the lobby owner's undead bird is asked of the owner by the other browsers, and caught once", () => {
  const random = Math.random
  Math.random = () => 0.5
  const owner = world('flute'), follower = world('passagua')
  follower.setNetFollower(() => {}); follower.setNetAsks(true)
  // a training alien of the Catálogo (the lobby shares those), shot down and brought back by notes
  owner.targets.push({ id: 900, kind: 'alien', home: 0, x: 200, y: 15, w: 40, h: 30, hp: 0.0001, maxHp: 1, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'hold', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#c77dff', variant: 'v1' } })
  owner.give('pistol'); step(owner, { slot: 2 })
  step(owner, { fire: true, firePressed: true })
  for (let t = 0; t < 3; t += 0.016) step(owner)
  const u = owner.undead[0]
  Math.random = random
  step(owner, { slot: 1 })
  for (let i = 0; i < 40 && !u.data.bird; i++) step(owner, { fire: true, firePressed: i % 2 === 0 }, Math.atan2(30, 200))
  assert.ok(u.data.bird, 'an undead bird on the owner')
  const formations = new Map(), cache = W.newFoeCache()
  const sync = () => { const msg = W.exportFoes(owner.targets, A, cache, true); W.importFoes(follower.targets, { ...msg, l: msg.l.filter(e => !follower.netFoeTaken(e[0])) }, formations) }
  sync()
  const m = follower.targets.find(t => t.mirror && t.kind === 'undead')
  assert.ok(m && m.net === u.net, 'mirrored on the other browser')
  // its Passaguá goes over the mirror: it is asked of the owner and hides, even when the owner's list comes again
  for (let i = 0; i < 40; i++) { Object.assign(m, { x: 40, y: m.h / 2, netX: 40, netY: m.h / 2 }); step(follower, { melee: i === 0 }) }
  assert.deepEqual(follower.netTakes, [{ k: 'f', id: u.net }])
  assert.equal(follower.targets.includes(m), false)
  assert.equal(follower.netFoeTaken(u.net), true)
  sync()
  assert.equal(follower.targets.some(t => t.net === u.net), false, 'it does not come back while the answer is on its way')
  land(follower)
  assert.equal(follower.capturedSouls, 0, 'and it is not a soul yet: it cannot be caught twice')
  // the owner lets it go and says what it is: the dead soul it would be there, with the weapon that killed it
  const take = follower.netTakes.splice(0)[0]
  const who = owner.giveNetTake(take, A)
  assert.deepEqual(who.slice(0, 5), ['jelly', 'dead', 'wind', u.soul.note, 'bullet'])
  assert.equal(owner.targets.includes(u), false)
  assert.equal(owner.giveNetTake(take, A), null, 'once')
  assert.equal(follower.applyNetGive(N.cleanGive({ ...take, soul: who })), true)
  land(follower)
  assert.equal(follower.capturedSouls, 1)
  assert.deepEqual((({ species, state, shot, weapon, bird }) => ({ species, state, shot, weapon, bird }))(follower.bagOfSouls[0]), { species: 'jelly', state: 'dead', shot: 'wind', weapon: 'bullet', bird: u.data.bird })
  for (let t = 0; t < N.TAKE_WAIT; t += 0.016) step(follower)
  assert.equal(follower.netFoeTaken(u.net), false)
  // a game server that does not pass the asking on: the mirror is caught here, as before
  const old = world('passagua')
  old.setNetFollower(() => {})
  old.targets.push({ ...m, data: { ...m.data } })
  const copy = old.targets[old.targets.length - 1]
  for (let i = 0; i < 40; i++) { Object.assign(copy, { x: 40, y: copy.h / 2, netX: 40, netY: copy.h / 2 }); step(old, { melee: i === 0 }) }
  land(old)
  assert.equal(old.netTakes.length, 0)
  assert.equal(old.capturedSouls, 1)
  // a bird that is not one yet (or an enemy that is not a bird) is not given
  owner.targets.push({ id: 901, net: W.netIdFor(A, 901), kind: 'zombie', home: 0, x: 0, y: 0, w: 40, h: 80, hp: 10, maxHp: 10, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'walk', animT: 0 })
  assert.equal(owner.giveNetTake({ k: 'f', id: W.netIdFor(A, 901) }, A), null)
})

test("online, a note sung by a soul fills the owner's enemy without changing what it remembers; the bird a browser sees takes after its own last note", () => {
  const owner = world(), follower = world()
  const hits = []
  follower.setNetFollower(h => hits.push(h))
  const alien = { id: 900, kind: 'alien', home: 0, x: 200, y: 15, w: 40, h: 30, hp: 100, maxHp: 100, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'hold', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#c77dff', variant: 'v1' } }
  owner.targets.push(alien)
  W.importFoes(follower.targets, W.exportFoes(owner.targets, A, W.newFoeCache(), true), new Map())
  const m = follower.targets.find(t => t.mirror)
  // the owner hears a flute note from the other browser: the alien remembers the flute
  const root = owner.music.zone.root
  assert.equal(owner.applyNetHit({ id: alien.net, d: 10, px: 0, x: 200, y: 0, n: { m: root, c: '#fff', s: '♪', v: 'flute', w: 0 }, st: 0 }), true)
  assert.deepEqual(alien.soul, { shot: 'wind', note: 'tonic' })
  // then a soul's song (a bird's voice): it fills, and the flute is still what it remembers
  assert.equal(owner.applyNetHit({ id: alien.net, d: 10, px: 0, x: 200, y: 0, n: { m: root + 7, c: '#fff', s: '♪', v: 'bird', w: 0 }, st: 0 }), true)
  assert.equal(alien.harmony, 20)
  assert.deepEqual(alien.soul, { shot: 'wind', note: 'tonic' })
  // on the other browser, its own flute note marks the mirror it sees
  follower.give('flute'); step(follower, { slot: 1 })
  for (let i = 0; i < 60 && !hits.length; i++) step(follower, { fire: true, firePressed: i % 2 === 0 })
  assert.ok(hits.length && hits[0].n, 'the note was reported to the owner')
  assert.equal(m.soul.shot, 'wind')
  follower.netChange(m, 'convert')
  assert.equal(follower.critters[0].soul.shot, 'wind', 'and the bird it becomes here remembers it')
})

test("a browser's chicks show on the others where they are, with the look they were hatched with, and leave when they do", () => {
  // each chick of this browser has its number for as long as it lives, and its look beside it
  const e1 = {}, e2 = {}
  const n1 = K.chickNumber(e1), n2 = K.chickNumber(e2)
  assert.notEqual(n1, n2)
  assert.equal(K.chickNumber(e1), n1)
  K.setChickStyle(e1, 5)
  assert.deepEqual([K.chickStyleOf(e1), K.chickStyleOf(e2)], [5, 0])
  const own = [
    { n: n1, x: 500.4, y: 199.6, vx: 60.2, vy: -3.7, face: 1, state: 1, style: 5 },
    { n: n2, x: 460, y: 200, vx: 0, vy: 0, face: -0.5, state: 0, style: 0 },
  ]
  const l = JSON.parse(JSON.stringify(K.exportChicks(own)))
  assert.deepEqual(l, [[n1, 500, 200, 60, -4, 1, 1, 5], [n2, 460, 200, 0, 0, -1, 0, 0]], 'whole numbers travel')
  assert.equal(K.exportChicks(Array.from({ length: 30 }, () => own[0])).length, K.NET_CHICKS_MAX)

  const mirrors = new Map()
  K.importChicks(mirrors, A, l, 1000)
  K.importChicks(mirrors, B, [[1, -40, 0, 0, 0, 1, 0, 2]], 1000)
  assert.deepEqual([...mirrors.keys()].sort(), [K.chickKey(A, n1), K.chickKey(A, n2), K.chickKey(B, 1)].sort())
  const m = mirrors.get(K.chickKey(A, n1))
  assert.deepEqual({ pid: m.pid, n: m.n, x: m.x, y: m.y, face: m.face, state: m.state, style: m.style, hidden: m.hidden }, { pid: A, n: n1, x: 500, y: 200, face: 1, state: 1, style: 5, hidden: 0 })
  // between two messages it runs on by its speed, but not for long
  assert.deepEqual(K.chickAt(m, 1100), { x: 506, y: 199.6 })
  assert.deepEqual(K.chickAt(m, 9000), { x: 500 + 60 * K.CHICK_AHEAD, y: 200 - 4 * K.CHICK_AHEAD })
  assert.deepEqual(K.chickAt(m, 900), { x: 500, y: 200 })
  // the next message: it moved; it keeps its look and stays hidden for as long as it was asked to
  m.hidden = 5000
  K.importChicks(mirrors, A, [[n1, 520, 200, 60, 0, 1, 1, 9], [n2, 460, 200, 0, 0, -1, 0, 0]], 1100)
  const m2 = mirrors.get(K.chickKey(A, n1))
  assert.deepEqual({ x: m2.x, style: m2.style, hidden: m2.hidden, at: m2.at }, { x: 520, style: 5, hidden: 5000, at: 1100 })
  // junk is not a chick; what is not a list changes nothing
  K.importChicks(mirrors, B, 'x', 1200)
  assert.equal(mirrors.has(K.chickKey(B, 1)), true)
  K.importChicks(mirrors, B, [null, 'x', [0, 1, 1], [1.5, 1, 1], ['1', 1, 1], [2, 1e9, 0], [3, 0, NaN], [4, 10, 20, 'fast', 1e9, 0, 999, -1]], 1200)
  assert.deepEqual([...mirrors.values()].filter(c => c.pid === B).map(c => [c.n, c.x, c.y, c.vx, c.vy, c.face, c.state, c.style]), [[4, 10, 20, 0, 5000, 1, 0, 0]])
  // the ones a browser no longer sends leave, and only its own
  K.importChicks(mirrors, A, [[n2, 460, 200, 0, 0, -1, 0, 0]], 1300)
  assert.deepEqual([...mirrors.keys()].sort(), [K.chickKey(A, n2), K.chickKey(B, 4)].sort())
  K.importChicks(mirrors, A, Array.from({ length: 30 }, (_, i) => [100 + i, i, 0, 0, 0, 1, 0, 0]), 1400)
  assert.equal([...mirrors.values()].filter(c => c.pid === A).length, K.NET_CHICKS_MAX)
  // a browser that left the lobby takes its chicks along
  K.keepChicks(mirrors, new Set([B]))
  assert.deepEqual([...mirrors.keys()], [K.chickKey(B, 4)])
})

test("a Passaguá over another browser's chick asks that browser for it; it leaves there once and counts as a soul here", () => {
  const a = world('passagua'), b = world('passagua'), c = world('passagua')
  // on A, its own chick (number 7 in the lobby); on B and C, the mirror of it
  let alive = true, hiddenB = 0, hiddenC = 0
  const id = W.netIdFor(A, 7)
  const own = () => a.setCatchables(alive ? [{ x: 40, y: 0, r: 20, id: 7, catch: () => { alive = false } }] : [])
  own()
  b.setCatchables([{ x: 40, y: 0, r: 20, net: { pid: A, id }, catch: () => { hiddenB++ } }])
  b.soulNews.length = 0
  for (let i = 0; i < 40; i++) step(b, { melee: i === 0 })
  assert.deepEqual(b.netTakes, [{ k: 'c', id, pid: A }], 'asked once, of the browser it follows')
  assert.equal(hiddenB, 1, 'out of sight here meanwhile')
  assert.ok(b.puffs.length > 0 || b.sounds.some(s => s.kind === 'puff'))
  land(b)
  assert.equal(b.capturedSouls, 0, 'not in the Bag of souls before the answer')
  assert.equal(b.soulNews.length, 0)
  c.setCatchables([{ x: 40, y: 0, r: 20, net: { pid: A, id }, catch: () => { hiddenC++ } }])
  for (let i = 0; i < 40; i++) step(c, { melee: i === 0 })
  assert.equal(hiddenC, 1)
  // A lets it go to the first one that asked, and has nothing for the second
  const take = N.cleanTake(b.netTakes.splice(0)[0])
  assert.equal(a.giveNetTake({ k: 'c', id: W.netIdFor(B, 7) }, A), null, "another browser's id is not this one's chick")
  const who = a.giveNetTake(take, A)
  assert.deepEqual(who, ['chick', 'alive', null, null, null, S.CHICK_SOUL_COLOR, null])
  assert.equal(alive, false, 'it left the browser it followed')
  assert.equal(a.capturedSouls, 0, 'which did not catch it')
  own()
  assert.equal(a.giveNetTake(N.cleanTake(c.netTakes.splice(0)[0]), A), null, 'given once')
  // the answer: it flies to B's counter and counts; it is new to B's library
  const give = N.cleanGive({ ...take, soul: who })
  assert.equal(b.applyNetGive(give), true)
  land(b)
  assert.equal(b.capturedSouls, 1)
  assert.deepEqual({ species: b.bagOfSouls[0].species, state: b.bagOfSouls[0].state, bird: b.bagOfSouls[0].bird }, { species: 'chick', state: 'alive', bird: null })
  assert.equal(b.soulNews.length, 1)
  assert.equal(b.applyNetGive(give), false, 'the same answer twice counts once')
  land(c)
  assert.equal(c.capturedSouls, 0, 'the one that asked late got nothing')
  // its own browser still catches its own chick on the spot
  alive = true; own()
  for (let i = 0; i < 40; i++) step(a, { melee: i === 0 })
  assert.equal(alive, false)
  assert.equal(a.netTakes.length, 0)
  land(a)
  assert.equal(a.capturedSouls, 1)
})

// ---------- portals and the change of Pátio ----------
const portals = (c, t) => c.setSoulPortals(new Map(t ? [['p1', t]] : []))

test('a portal sucks in the souls flying free with their owner, and the other browsers see it', () => {
  const c = world('passagua')
  bagOf(c, 2)
  c.releaseSoul({ x: 100, y: -100 }); c.releaseSoul({ x: 140, y: -100 })
  step(c)
  const [a, b] = c.freedSouls
  holdSoul(a, 100, -100); holdSoul(b, 140, -100)
  portals(c, { mode: 'enter', x: 500, y: -300, k: 0.5 }); step(c)
  assert.deepEqual([a.x, a.y, a.k], [300, -200, 0.5], 'half way from where it was to the portal, half its size')
  assert.equal(c.callSouls(), 0, 'it is not called back meanwhile')
  const told = N.exportSouls(c.freedSouls, A, new Set(), true)
  assert.equal(told[0][5], 0.5, 'its size travels after what it is')
  const quiet = N.exportSouls(c.freedSouls, A, new Set(told.map(e => e[0])), false)
  assert.deepEqual(quiet[0].slice(4), [null, 0.5], 'and alone, with no "who" to repeat')
  const mirrors = []
  N.importSouls(mirrors, A, JSON.parse(JSON.stringify(told)))
  assert.equal(mirrors[0].k, 0.5)
  portals(c, { mode: 'enter', x: 500, y: -300, k: 1 }); step(c)
  assert.deepEqual([b.x, b.y, b.k], [500, -300, 0], 'inside the portal nothing of it shows')
  // a portal of a pair: they come out of the other one with her, small as when let out
  portals(c, { mode: 'arrive', x: 2000, y: -80, k: 0 }); step(c)
  assert.equal(a.k, undefined)
  assert.ok(Math.hypot(a.x - 2000, a.y + 80) < 30 && a.t < 0.05, 'out of the portal she came out of')
  N.importSouls(mirrors, A, JSON.parse(JSON.stringify(N.exportSouls(c.freedSouls, A, new Set(), false))))
  assert.deepEqual([mirrors[0].k, mirrors[0].t], [undefined, 0], 'and the mirror grows again there')
  // an entry that never left (the Pátio is gone): they pop back by her
  portals(c, { mode: 'enter', x: 500, y: -300, k: 1 }); step(c)
  portals(c, null); step(c)
  assert.equal(a.k, undefined)
  assert.ok(Math.hypot(a.x - me.x, a.y - me.y) < 200)
})

test('another Pátio is another world: only inventories, the Gaiolas with their souls and the souls flying free cross over', () => {
  const old = world('passagua')
  old.give('cage')
  old.cages[1].cage.cap = 5
  bagOf(old, 3)
  old.give('pistol')
  old.releaseSoul({ x: 100, y: -100 })
  old.spawnAliens(40, 0)
  old.addPickup(60, 'guitar', 0)
  step(old)
  assert.ok(old.targets.some(t => t.kind === 'alien'))
  const carry = JSON.parse(JSON.stringify(old.exportCarry()))
  assert.deepEqual(Object.keys(carry), ['p1'])
  assert.deepEqual(carry.p1.cages.map(k => [k.item, k.cap, k.souls.length]), [['cageFlight', 50, 2], ['cage', 5, 0]], 'her cages as they hang, each with its limit and souls')
  assert.equal(carry.p1.loose.length, 1)

  const next = createCombat()
  next.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} })
  next.importCarry(carry)
  assert.deepEqual(next.inventory.filter(Boolean).map(o => o.item).sort(), ['passagua', 'pistol'])
  assert.equal(next.capturedSouls, 2)
  assert.deepEqual(next.cages.map(o => [o.item, o.cage.cap, o.cage.souls.length, o.cage.enterT]), [['cageFlight', 50, 2, Infinity], ['cage', 5, 0, Infinity]], 'the same cages, the same one in front')
  assert.deepEqual(next.bagOfSouls.map(s => s.id), carry.p1.cages[0].souls.map(s => s.id))
  assert.deepEqual([next.targets.length, next.pickups.length, next.abductions.length], [0, 0, 0], 'nothing of the last world')
  // the one flying free waits unseen while she is still inside the portal, and comes out of it with her
  portals(next, { mode: 'enter', x: 0, y: 0, k: 1 }); step(next)
  assert.equal(next.freedSouls[0].k, 0)
  portals(next, { mode: 'arrive', x: 300, y: -80, k: 0 }); step(next)
  const f = next.freedSouls[0]
  assert.equal(f.k, undefined)
  assert.ok(Math.hypot(f.x - 300, f.y + 80) < 30)
  // new souls never take the id of one that crossed
  const ids = new Set([...carry.p1.cages.flatMap(k => k.souls), ...carry.p1.loose].map(s => s.id))
  step(next, { slot: next.inventory.findIndex(o => o && o.item === 'passagua') + 1 })
  bagOf(next, 1)
  assert.equal(next.capturedSouls, 3)
  assert.ok(!ids.has(next.bagOfSouls[next.bagOfSouls.length - 1].id))
})

test('a soul on its way to a Gaiola crosses over inside it; with no room left it crosses flying free', () => {
  const caught = () => {
    const c = world('passagua')
    const b = { kind: 'bird', x: 40, y: 0, vx: 0, vy: 0, t: 0, color: '#9be7ff', face: 1, groundY: 0, homeX: 40, homeY: 0 }
    c.critters.push(b)
    for (let i = 0; i < 50 && !c.abductions.length; i++) { Object.assign(b, { x: 40, y: 0, vx: 0, vy: 0 }); step(c, { melee: i === 0 }) }
    assert.deepEqual([c.abductions.length, c.capturedSouls], [1, 0], 'still flying to the cage')
    return c
  }
  const c = caught()
  let carry = c.exportCarry().p1
  assert.deepEqual([carry.cages[0].souls.length, carry.loose.length], [1, 0])
  assert.equal(carry.cages[0].souls[0], c.abductions[0].soul)
  // the cage that kept its place has none left (its limit changed meanwhile)
  const d = caught()
  d.cages[0].cage.cap = 0
  carry = d.exportCarry().p1
  assert.deepEqual([carry.cages[0].souls.length, carry.loose.length], [0, 1])
})
