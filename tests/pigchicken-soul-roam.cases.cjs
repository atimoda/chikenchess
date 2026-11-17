const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const L = loadTs('lib/pigchicken/layout.ts')
const B = loadTs('lib/pigchicken/bird-perch.ts')
const PP = loadTs('lib/pigchicken/perch-places.ts')
const OT = loadTs('lib/pigchicken/old-trees.ts')
const { WORLD_GROUND_Y } = loadTs('lib/pigchicken/world.ts')
const F = loadTs('lib/pigchicken/soul-follow.ts')
const R = loadTs('lib/pigchicken/soul-roam.ts')
const A = loadTs('lib/pigchicken/soul-acts.ts')
const P = loadTs('lib/pigchicken/poop.ts')
const SL = loadTs('lib/pigchicken/soul-library.ts')
const { BIRDS } = loadTs('lib/pigchicken/birds.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

const el = (kind, x, y, extra = {}) => L.normalizeElement({ ...L.createElement(kind, x, y), ...extra })
const of = (lines, e) => lines.filter(l => l.id.includes(`:${e.id}:`))
const near = (a, b) => Math.abs(a - b) < 1e-6
const worldOf = (...els) => { const w = B.createPerchWorld(); B.setPerchSpans(w, [], PP.perchLines(els)); return w }

// ---------- the places ----------
test('the places to land: the branches and crowns of a tree, the top of a platform and of some objects', () => {
  const tree = el('tree', 1000, 600), plat = el('platform', 300, 500), chest = el('chest', 1600, 700), rack = el('rack', 2000, 700), old = el('pine', 2400, 600)
  const lines = PP.perchLines([tree, plat, chest, rack, old])
  const branches = of(lines, tree)
  assert.ok(branches.length >= 3 && branches.length <= PP.PERCH_PLACE.perTree, `a tree gives a few lines (${branches.length})`)
  for (const l of branches) {
    assert.equal(l.place, 'tree'); assert.equal(l.sag, 0)
    assert.ok(l.a.x <= l.b.x, 'left to right')
    for (const p of [l.a, l.b]) assert.ok(p.x >= tree.x - 1 && p.x <= tree.x + tree.w + 1 && p.y >= tree.y - 1 && p.y <= tree.y + tree.h + 1, 'inside its box')
  }
  const tops = of(lines, plat)
  assert.equal(tops.length, 1, 'only the side that faces up')
  assert.equal(tops[0].place, 'platform')
  assert.deepEqual([tops[0].a.x, tops[0].a.y, tops[0].b.x, tops[0].b.y], [plat.x + PP.PERCH_PLACE.inset, plat.y, plat.x + plat.w - PP.PERCH_PLACE.inset, plat.y])
  const lid = of(lines, chest)
  assert.equal(lid.length, 1); assert.equal(lid[0].place, 'object'); assert.equal(lid[0].a.y, chest.y)
  assert.equal(of(lines, rack).length, 0, 'not every object is a place to land')
  // an old tree: the top of each pad of the pine, of each cloud of flowers of the plum tree (the ones its drawing has)
  for (const kind of ['pine', 'blossom']) {
    const e = el(kind, 2400, 600), tops = OT.oldTreePerches(kind, e.params.seed ?? 1), got = of(PP.perchLines([e]), e)
    assert.ok(tops.length >= 3, `${kind}: a few pads (${tops.length})`)
    assert.ok(got.length >= 3 && got.length <= Math.min(tops.length, PP.PERCH_PLACE.perTree), `${kind}: ${got.length} of ${tops.length}`)
    for (const l of got) {
      assert.equal(l.place, 'tree')
      for (const q of [l.a, l.b]) assert.ok(q.x >= e.x - 1 && q.x <= e.x + e.w + 1 && q.y >= e.y - 1 && q.y <= e.y + e.h + 1, `${kind}: inside its box`)
    }
    assert.deepEqual(OT.oldTreePerches(kind, 7), OT.oldTreePerches(kind, 7), 'the same seed, the same tree')
  }
  assert.ok(of(lines, old).length >= 3 && of(lines, old).every(l => l.place === 'tree'))
  // a platform lying on the ground is the floor, not a place to land
  const low = el('platform', 300, 0, { y: WORLD_GROUND_Y - 10 })
  assert.equal(of(PP.perchLines([low]), low).length, 0)

  // turned a quarter, its short side is the top; at 45° two sides face up
  const up = of(PP.perchLines([{ ...plat, rot: 90 }]), plat)
  assert.equal(up.length, 1)
  assert.ok(Math.abs(up[0].a.y - (plat.y + plat.h / 2 - plat.w / 2)) < 0.01 && Math.abs(up[0].b.x - up[0].a.x - (plat.h - 2 * PP.PERCH_PLACE.inset)) < 0.01)
  assert.equal(of(PP.perchLines([{ ...plat, rot: 45 }]), plat).length, 2)

  // hidden ones give nothing; one in a depth carries it, so its lines move with it like the wires
  assert.equal(PP.perchLines([{ ...tree, hidden: true }, { ...plat, opacity: 0.1 }]).length, 0)
  const far = PP.perchLines([{ ...tree, depth: 0.5 }])
  assert.ok(far.length > 0 && far.every(l => l.a.d === 0.5 && l.b.d === 0.5 && l.depth === 0.5))
  // a flipped tree is mirrored in its box
  const flipped = PP.perchLines([{ ...tree, params: { tree: { ...tree.params.tree, flip: true } } }])
  const mid = tree.x + tree.w / 2, xs = ls => ls.map(l => Math.round(l.a.x + l.b.x)).sort((a, b) => a - b)
  assert.deepEqual(xs(flipped), xs(branches.map(l => ({ a: { x: 2 * mid - l.b.x }, b: { x: 2 * mid - l.a.x } }))))
})

test('a bird lands only where it likes; a scared one goes only to the wires; a held spot is taken', () => {
  const tree = el('tree', 1000, 600), plat = el('platform', 300, 500)
  const w = worldOf(tree, plat)
  const p = B.birdPerchParams({ wires: 1, trees: 1, platforms: 0, objects: 0 })
  for (let i = 0; i < 40; i++) { const s = B.perchSeek(w, 600, 400, p); assert.ok(s && s.span.startsWith('tree:'), 'never the platform') }
  assert.equal(B.perchSeek(w, 600, 400, B.birdPerchParams({ trees: 0, platforms: 0 })), null, 'no wire here, and it likes nothing else')
  assert.equal(B.perchSeekIn(w, { l: -5000, r: 5000, t: -5000, b: 5000 }, B.birdPerchParams({ trees: 1, platforms: 1, objects: 1 })), null, 'a scared bird only goes to a wire')
  // a bird that prefers the platform goes there although the tree is nearer
  const fond = B.birdPerchParams({ trees: 0.05, platforms: 1 })
  assert.ok(B.perchSeek(w, tree.x + tree.w / 2, tree.y, fond, () => 0).span.startsWith('platform:'))

  const likes = { wires: 0, trees: 0, platforms: 1, objects: 0 }
  const got = B.perchPick(w, 400, 400, 2000, likes, 34, () => 0.3)
  assert.ok(got.span.startsWith('platform:'))
  assert.equal(B.perchPick(w, 400, 400, 50, likes, 34), null, 'nothing that near')
  assert.equal(B.perchPick(w, 400, 400, 2000, likes, 34, Math.random, got.span), null, 'not the line it is leaving')
  assert.equal(B.perchPick(w, 400, 400, 2000, { wires: 1, trees: 0, platforms: 0, objects: 0 }, 34), null)
  // each spot holds one: the platform fills up, and frees again when the holders stop touching their spots
  const held = []
  for (let i = 0; i < 20; i++) { const s = B.perchPick(w, 400, 400, 2000, likes, 34); if (!s) break; held.push(B.perchHold(w, s)) }
  assert.ok(held.length >= 3 && held.length < 20, `it took ${held.length}`)
  assert.equal(new Set(held.map(h => h.t)).size, held.length, 'each on its own spot')
  const at = B.perchPoint(w, held[0])
  assert.ok(near(at.y, plat.y - B.PERCH_LIFT), 'its feet on the top')
  assert.equal(B.perchPoint(w, { span: 'gone', t: 0.5 }), null)
  w.time += 2
  assert.ok(B.perchPick(w, 400, 400, 2000, likes, 34), 'nobody kept them')
  // a tuft too short for two still holds one, in its middle
  const short = { id: 'object:x:0', group: 'object', place: 'object', a: { x: 0, y: 0, d: 0 }, b: { x: 30, y: 0, d: 0 }, sag: 0, wire: 0, depth: 0, floor: false }
  const tiny = B.createPerchWorld(); B.setPerchSpans(tiny, [{ ...short, id: 'wire', place: undefined }], [short])
  assert.deepEqual(B.perchPick(tiny, 0, 0, 500, { wires: 1, trees: 1, platforms: 1, objects: 1 }, 34), { span: 'object:x:0', t: 0.5 }, 'a wire that short holds none')
})

// ---------- exploring ----------
const rand = () => 0.5
const DT = 1 / 60
test('a soul rests by its owner, leaves for a place, sits there, goes on to another and comes back when she goes far', () => {
  const a = el('platform', 300, 300), b = el('platform', -700, 200)
  const w = worldOf(a, b)
  const p = { ...F.SOUL_FOLLOW_DEFAULTS, roam: 1, roamRange: 1200, perchTime: 2, speed: 300 }
  const owner = { x: 0, y: 600, face: 1, scale: 1 }
  const brain = F.createSoulBrain(0, 400, p, rand), me = { x: 0, y: 400, face: 1 }
  const tick = (r, par = p) => { w.time += DT; return R.soulRoamStep(r, brain, me, owner, par, w, DT, rand) }

  // it never leaves with roam 0, with no place to go, or with no perch world at all
  const home = R.newSoulRoam({ ...p, roam: 0 }, rand)
  brain.mode = 'rest'
  for (let i = 0; i < 600; i++) assert.equal(tick(home, { ...p, roam: 0 }), false)
  assert.equal(R.soulRoamStep(R.newSoulRoam(p, rand), brain, me, owner, p, null, 60, rand), false)
  const nowhere = R.newSoulRoam(p, rand)
  assert.equal(R.soulRoamStep(nowhere, brain, me, owner, p, B.createPerchWorld(), 60, rand), false)

  const r = R.newSoulRoam(p, rand)
  const wait = r.in
  assert.ok(wait > 0 && wait <= R.SOUL_ROAM.home[1] * R.SOUL_ROAM.vary[1], 'the keenest waits about a second')
  assert.ok(R.newSoulRoam({ ...p, roam: 0.1 }, rand).in > wait * 5, 'a homebody waits much longer')
  // on its way to its spot by her the wait does not run
  brain.mode = 'follow'
  for (let i = 0; i < 300; i++) assert.equal(tick(r), false)
  assert.equal(r.in, wait)
  brain.mode = 'rest'
  let n = 0
  while (!tick(r) && n++ < 200);
  assert.ok(r.spot && !r.sat, 'off it goes')
  assert.equal(R.soulPerched(r), false)
  const first = r.spot.span
  for (n = 0; !R.soulPerched(r) && n < 1200; n++) assert.equal(tick(r), true)
  assert.ok(R.soulPerched(r), 'it landed')
  const place = first.includes(a.id) ? a : b
  assert.ok(near(me.y, place.y - B.PERCH_LIFT))
  assert.ok(me.x > place.x && me.x < place.x + place.w)
  assert.equal(me.face, owner.x > me.x ? 1 : -1, 'it watches her')
  // it sits still for its time, then goes on to the other platform (roam 1: always another place)
  const sat = { x: me.x, y: me.y }
  for (let i = 0; i < 60; i++) { assert.equal(tick(r), true); assert.deepEqual({ x: me.x, y: me.y }, sat) }
  for (n = 0; r.spot.span === first && n < 600; n++) tick(r)
  assert.ok(r.spot && r.spot.span !== first && !r.sat, 'on to another place')
  assert.equal(r.hops, 1)
  // something takes it off its place (an errand): it flies back to it
  for (n = 0; !R.soulPerched(r) && n < 1200; n++) tick(r)
  me.x += 300; R.roamLift(r)
  assert.equal(R.soulPerched(r), false)
  for (n = 0; !R.soulPerched(r) && n < 600; n++) assert.equal(tick(r), true)
  assert.ok(R.soulPerched(r))
  // she goes too far: it lets its place go and follows
  owner.x = 6000
  assert.equal(tick(r), false)
  assert.equal(r.spot, null)
  assert.ok(r.in > 0)
  assert.equal(w.birds.size, 0, 'and its place is free')
  // with nowhere else to go, it comes back to her when its rest is over
  owner.x = 0; me.x = 0; me.y = 400
  const one = worldOf(a), lone = R.newSoulRoam(p, rand)
  brain.mode = 'rest'; lone.in = 0
  const go = () => { one.time += DT; return R.soulRoamStep(lone, brain, me, owner, p, one, DT, rand) }
  for (n = 0; !R.soulPerched(lone) && n < 1200; n++) go()
  for (n = 0; go() && n < 600; n++);
  assert.equal(lone.spot, null)
  assert.equal(brain.mode, 'follow', 'back to her side')
})

test('the classes explore each in its way, and an entry keeps its own numbers', () => {
  const of = cls => ({ ...F.SOUL_FOLLOW_DEFAULTS, ...F.SOUL_CLASSES[cls].params })
  assert.equal(of('chick').roam, 0, 'a chick never leaves')
  assert.ok(of('escort').roam < of('sentinel').roam && of('sentinel').roam < of('lazy').roam)
  assert.ok(of('lazy').perchTime > of('patrol').perchTime)
  for (const k of ['roam', 'roamRange', 'perchTime', 'wires', 'trees', 'platforms', 'objects']) {
    const r = F.SOUL_FOLLOW_RANGES[k]
    for (const cls of Object.keys(F.SOUL_CLASSES)) assert.ok(of(cls)[k] >= r.min && of(cls)[k] <= r.max, `${cls}.${k}`)
  }
  const id = 'horde.alive.wind'
  const next = SL.changeEntry(SL.SOUL_ENTRIES, id, o => ({ ...o, follow: { roam: 2, roamRange: 10, perchTime: 0, trees: 0.5 }, act: { poopEvery: 99, poopDamage: -3, poopSpare: false, nope: true } }))
  const got = next.find(o => o.id === id)
  assert.deepEqual(got.follow, { roam: 1, roamRange: 200, perchTime: 1, trees: 0.5 }, 'inside the limits')
  assert.deepEqual(got.act, { poopEvery: 60, poopDamage: 0, poopSpare: false })
  const file = SL.soulsFile(next)
  assert.equal(SL.soulsFileProblem(file), null)
  const back = SL.soulEntriesOver(file).find(o => o.id === id)
  assert.deepEqual(back.follow, got.follow); assert.deepEqual(back.act, got.act)
  assert.equal(SL.entryFollowParams(back).roam, 1)
  assert.equal(SL.entryActParams(back).poopSpare, false)
})

// ---------- "cagar" ----------
test('a dropping: who is under the bird, how it falls, and who has the power', () => {
  const box = { l: -45, r: 45, t: 300, b: 500 }
  assert.equal(P.poopUnder(0, 0, [box]), true)
  assert.equal(P.poopUnder(45 + P.POOP.column + 1, 0, [box]), false, 'beside her')
  assert.equal(P.poopUnder(0, 300 - P.POOP.drop[0] + 1, [box]), false, 'too close')
  assert.equal(P.poopUnder(0, 300 - P.POOP.drop[1] - 1, [box]), false, 'too far')
  assert.equal(P.poopUnder(0, 400, [box]), false, 'below her head')
  assert.equal(P.poopUnder(0, 0, [box], [{ l: -100, r: 100, t: 150 }]), false, 'a platform in between')
  assert.equal(P.poopUnder(0, 0, [box], [{ l: -100, r: 100, t: 500 }, { l: 200, r: 400, t: 150 }]), true, 'the floor she stands on, or one beside, is not in the way')
  const p = P.newPoop(0, 0, 100, 2, 'p1', true, true)
  let alive = true
  for (let i = 0; i < 600 && alive && !P.poopHits(p, box); i++) alive = P.poopFall(p, DT)
  assert.ok(alive && P.poopHits(p, box), 'it falls onto her')
  assert.ok(p.vy > 0 && p.vy <= P.POOP.max && p.x > 0 && p.x < 45, 'a little of the bird\'s way with it')
  for (let i = 0; i < 600 && alive; i++) alive = P.poopFall(p, DT)
  assert.equal(alive, false, 'and it is gone after a while whatever happens')
  assert.ok(P.poopKnock(4) > P.poopKnock(1) && P.poopKnock(0) > 0)
  assert.equal(P.poopWait(10, () => 0.5), 10)
  assert.ok(P.poopWait(10, () => 0, true) < P.poopWait(10, () => 0))

  // some species of soul and some types of bird have it, with little damage; a dead soul does not spare its owner
  assert.equal(A.soulActBase('sentinel', 'alive', 'common', 'horde').poopEvery, 0)
  assert.equal(A.soulActBase('sentinel', 'alive', 'common').poopEvery, 0)
  for (const species of Object.keys(A.SPECIES_POOP)) {
    const live = A.soulActBase('sentinel', 'alive', 'common', species), dead = A.soulActBase('sentinel', 'dead', 'common', species)
    assert.ok(live.poopEvery > 0 && live.poopDamage > 0 && live.poopDamage <= 5, species)
    assert.equal(live.poopSpare, true); assert.equal(dead.poopSpare, false)
  }
  assert.equal(SL.entryActParams(SL.SOUL_ENTRIES.find(o => o.id === 'mini.alive.wind')).poopEvery, A.SPECIES_POOP.mini.poopEvery)
  assert.equal(SL.entryActParams(SL.SOUL_ENTRIES.find(o => o.id === 'jelly.alive.wind')).poopEvery, 0)
  assert.ok(BIRDS.pardal.poop.damage <= 2 && BIRDS.bemtevi.poop.every > 0)
  assert.equal(BIRDS.coruja.poop, undefined)
})

// ---------- in the combat ----------
const G = 600
const body = (over = {}) => ({ x: 0, y: G, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0, ...over })
function step(c, her, w, boxes = []) {
  if (w) w.time += 0.016
  c.step(0.016, her, { x: her.x, y: her.y - 100 }, { x: her.x, y: her.y - 100 }, 0,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 },
    boxes, G, () => {}, { peckOrigin: { x: her.x, y: her.y - 100 } })
}
function world() {
  const c = createCombat()
  c.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} })
  c.setView(-3000, 3000)
  c.give('cageFlight')
  return { c, her: body() }
}
let ids = 9000
const soulOf = (over = {}) => ({ id: ids++, species: 'jelly', state: 'alive', shot: 'wind', note: 'tonic', weapon: null, rarity: 'common', color: '#c77dff', bird: 'pardal', ...over })
function free(c, over = {}, at = { x: 0, y: G - 300 }) {
  c.bagOfSouls.push(soulOf(over)); c.releaseSoul(at)
  const f = c.freedSouls[c.freedSouls.length - 1]
  f.clock.in = 999 // (its helps are not what is tested here)
  return f
}
const holdSoul = (f, x, y) => { Object.assign(f.brain, { x, y, ax: x, ay: y, vx: 0, vy: 0, mode: 'rest', settle: 0 }); f.x = x; f.y = y }
const actor = (c, her, id = 'p1') => { const pushes = []; c.setBlastActors([{ id, box: { l: her.x - 45, r: her.x + 45, t: her.y - 200, b: her.y }, push: (vx, vy) => pushes.push({ vx, vy }) }]); return pushes }
const dummy = (c, x) => { c.addTarget(x, G, { maxHp: 100 }); return c.targets[c.targets.length - 1] }

test('a soul let out explores: it lands on a place near its owner and follows again when she leaves', () => {
  const { c, her } = world()
  const plat = el('platform', 200, G - 420)
  const w = worldOf(plat)
  c.setPerchWorld(w)
  const f = free(c)
  f.params = { ...f.params, roam: 1, perchTime: 30, roamRange: 900 }
  holdSoul(f, 150, G - 250); f.roam.in = 0.01
  let n = 0
  while (!R.soulPerched(f.roam) && n++ < 900) step(c, her, w)
  assert.ok(R.soulPerched(f.roam), 'it landed')
  assert.ok(near(f.y, plat.y - B.PERCH_LIFT))
  assert.ok(f.x > plat.x && f.x < plat.x + plat.w)
  const at = { x: f.x, y: f.y }
  for (let i = 0; i < 120; i++) step(c, her, w)
  assert.deepEqual({ x: f.x, y: f.y }, at, 'and stays')
  // she walks far away: it comes after her
  her.x = 4000
  for (let i = 0; i < 60; i++) step(c, her, w)
  assert.equal(f.roam.spot, null)
  assert.ok(f.x > at.x + 50, 'on its way to her')
  // called back while it sits somewhere, it still goes to the Gaiola
  her.x = 0; holdSoul(f, 150, G - 250); f.roam.in = 0.01
  for (n = 0; !R.soulPerched(f.roam) && n < 900; n++) step(c, her, w)
  assert.ok(R.soulPerched(f.roam))
  for (let i = 0; i < 40; i++) step(c, her, w) // (a press right after letting one out calls nobody)
  assert.equal(c.callSouls(), 1)
  for (let i = 0; i < 200 && c.freedSouls.length; i++) step(c, her, w)
  assert.equal(c.freedSouls.length, 0)
  for (let i = 0; i < 60; i++) step(c, her, w) // (its flight to the cage)
  assert.equal(c.bagOfSouls.length, 1)
})

test('a soul with the power lets a dropping fall on a dummy under it, and spares its owner or not by its sheet', () => {
  const { c, her } = world()
  const d = dummy(c, 400)
  const f = free(c, { species: 'mini' })
  assert.ok(f.act.poopEvery > 0 && f.act.poopSpare, 'a living Mini has it and spares its owner')
  const pushes = actor(c, her)
  // over its owner: nothing falls, however long it waits
  f.poopIn = 0
  for (let i = 0; i < 120; i++) { holdSoul(f, 0, G - 500); step(c, her) }
  assert.equal(c.poops.length, 0); assert.equal(pushes.length, 0)
  // over the dummy: one falls and takes a little of its life
  f.poopIn = 0
  holdSoul(f, 400, G - 500); step(c, her)
  assert.equal(c.poops.length, 1)
  assert.ok(f.poopIn > f.act.poopEvery * P.POOP.vary[0] - 0.02, 'and it waits again')
  for (let i = 0; i < 200 && c.poops.length; i++) { holdSoul(f, 400, G - 500); f.poopIn = 99; step(c, her) }
  assert.equal(c.poops.length, 0)
  assert.equal(d.hp, 100 - f.act.poopDamage)
  // nobody under it: it keeps it for later, and a miss leaves a mark on the floor
  assert.equal(c.poopMarks.length, 0)
  // a sheet that does not spare: its owner is a boneco like the others
  f.act = { ...f.act, poopSpare: false, poopDamage: 3 }
  f.poopIn = 0
  holdSoul(f, 0, G - 500); step(c, her)
  assert.equal(c.poops.length, 1, 'on her head')
  for (let i = 0; i < 200 && c.poops.length; i++) { holdSoul(f, 0, G - 500); f.poopIn = 99; step(c, her) }
  assert.equal(pushes.length, 1, 'a small knock')
  assert.ok(Math.abs(Math.abs(pushes[0].vx) - P.poopKnock(3)) < 1e-9 && pushes[0].vy < 0)
  assert.equal(c.poopStains.length, 1, 'and a stain that goes with her')
  assert.ok(c.poopStains[0].y > G - 200 && c.poopStains[0].y < G, 'on her back, below her head')
  for (let i = 0; i < (P.POOP.stain + 0.5) / 0.016; i++) { f.poopIn = 99; step(c, her) }
  assert.equal(c.poopStains.length, 0, 'for a moment')
  // a platform between it and her: it does not waste one
  f.poopIn = 0
  for (let i = 0; i < 30; i++) { holdSoul(f, 0, G - 500); step(c, her, null, [{ l: -200, r: 200, t: G - 350, b: G - 320, solid: true }]) }
  assert.equal(c.poops.length, 0)
  // a soul with no such power never does
  const plain = free(c)
  assert.equal(plain.act.poopEvery, 0)
  for (let i = 0; i < 60; i++) { holdSoul(plain, 400, G - 500); holdSoul(f, 3000, G - 500); step(c, her) }
  assert.equal(c.poops.length, 0)
})

test('a wild bird of a type with the power lets one fall on a chicken that passes under it', () => {
  const { c, her } = world()
  const pushes = actor(c, her)
  const bird = (type, x) => { const b = { kind: 'bird', bird: type, x, y: G - 500, vx: 0, vy: 0, t: 0, color: '#9be7ff', face: 1, groundY: 0, homeX: x, homeY: G - 500, perch: null, poopIn: 0 }; c.critters.push(b); return b }
  const owl = bird('coruja', 0)
  for (let i = 0; i < 60; i++) { owl.x = 0; owl.y = G - 500; owl.t = 0; step(c, her) }
  assert.equal(c.poops.length, 0, 'an owl has no such power')
  c.critters.length = 0
  const sparrow = bird('pardal', 0)
  step(c, her)
  assert.equal(c.poops.length, 1)
  for (let i = 0; i < 200 && c.poops.length; i++) { sparrow.poopIn = 99; sparrow.t = 0; step(c, her) }
  assert.equal(pushes.length, 1)
  assert.ok(Math.abs(pushes[0].vx) < 60, 'hardly a knock')
})

// ---------- keeping away from the other players ----------
test('a soul backs off from a player that is not its owner, no faster than it flies, and comes back when they go', () => {
  const p = { ...F.SOUL_FOLLOW_DEFAULTS, alert: 200, flee: 0.5, speed: 240 }
  const keep = 200 * (R.SOUL_FLEE.keep[0] + (R.SOUL_FLEE.keep[1] - R.SOUL_FLEE.keep[0]) * 0.5)
  const brain = F.createSoulBrain(0, 400, p, rand), r = R.newSoulRoam(p, rand)
  // (where the follow step leaves it each frame: the same spot)
  const at = () => ({ x: 0, y: 400, face: 1 })
  const run = (threat, n, par = p, air = null) => { let me = at(); for (let i = 0; i < n; i++) { me = at(); R.soulFleeStep(r, brain, me, threat, par, null, air, DT, rand) } return me }

  // nobody near, somebody past its alert radius, a soul that minds nobody: it stays
  assert.deepEqual(run(null, 30), at())
  assert.deepEqual(run({ x: -260, y: 400 }, 30), at())
  assert.deepEqual(run({ x: -50, y: 400 }, 30, { ...p, alert: 0 }), at())
  assert.deepEqual(run({ x: -50, y: 400 }, 30, { ...p, flee: 0 }), at())
  // inside its alert radius but farther than it keeps: it only watches
  assert.deepEqual(run({ x: -(keep + 20), y: 400 }, 30), at())

  // a player 50 px to its left: it backs off to the right and a little up, one step at a time
  const thief = { x: -50, y: 400 }
  const one = run(thief, 1)
  assert.ok(one.x > 0 && one.y < 400)
  assert.ok(Math.hypot(one.x, one.y - 400) <= p.speed * R.SOUL_FLEE.speed * DT + 1e-6, 'no faster than it flies')
  const far = run(thief, 120)
  assert.ok(near(far.x, keep - 50), `until it keeps its distance (${far.x})`)
  assert.ok(near(400 - far.y, (keep - 50) * R.SOUL_FLEE.up), 'a little higher')
  assert.equal(far.face, 1, 'looking where it goes')
  // the keener to flee, the farther it keeps
  const r2 = R.newSoulRoam(p, rand)
  let shy = at(), bold = at()
  for (let i = 0; i < 240; i++) { shy = at(); R.soulFleeStep(r2, brain, shy, thief, { ...p, flee: 1 }, null, null, DT, rand) }
  r2.fx = r2.fy = 0
  for (let i = 0; i < 240; i++) { bold = at(); R.soulFleeStep(r2, brain, bold, thief, { ...p, flee: 0.1 }, null, null, DT, rand) }
  assert.ok(shy.x > far.x && far.x > bold.x && bold.x > 0)
  // the walls and the top of the sky hold it
  const walled = run(thief, 120, p, { l: -500, r: 30, top: 395 })
  assert.deepEqual({ x: walled.x, y: walled.y }, { x: 30, y: 395 })
  // they go: it comes back, as slowly
  const back = run(null, 1)
  assert.ok(back.x < far.x && back.x > far.x - p.speed * R.SOUL_FLEE.speed * DT - 1e-6)
  assert.deepEqual(run(null, 120), at())
})

test('a soul sitting on a place makes up its mind once per player that comes close: it flies back to its owner or stays', () => {
  const w = worldOf(el('platform', 300, 300))
  const p = { ...F.SOUL_FOLLOW_DEFAULTS, roam: 1, roamRange: 1200, perchTime: 60, speed: 300, alert: 200, flee: 0.5 }
  const owner = { x: 0, y: 600, face: 1, scale: 1 }
  const sit = () => {
    const brain = F.createSoulBrain(0, 400, p, rand), me = { x: 0, y: 400, face: 1 }, r = R.newSoulRoam(p, rand)
    brain.mode = 'rest'; r.in = 0.01
    for (let i = 0; i < 900 && !R.soulPerched(r); i++) { w.time += DT; R.soulRoamStep(r, brain, me, owner, p, w, DT, rand) }
    assert.ok(R.soulPerched(r))
    return { brain, me, r }
  }
  // it stays when the dice say so, however long the player stands there
  const a = sit(), spot = { x: a.me.x, y: a.me.y }
  const close = { x: spot.x - 60, y: spot.y }
  let rolls = 0
  const stay = () => { rolls++; return 0.9 }
  for (let i = 0; i < 120; i++) assert.equal(R.soulFleeStep(a.r, a.brain, a.me, close, p, w, null, DT, stay), false)
  assert.equal(rolls, 1, 'one roll per approach')
  assert.ok(R.soulPerched(a.r))
  assert.deepEqual({ x: a.me.x, y: a.me.y }, spot, 'and it does not shuffle on its place')
  // far enough it does not even roll; the player leaves and comes again: another roll
  for (let i = 0; i < 10; i++) R.soulFleeStep(a.r, a.brain, a.me, { x: spot.x - 150, y: spot.y }, p, w, null, DT, stay)
  assert.equal(rolls, 1)
  R.soulFleeStep(a.r, a.brain, a.me, { x: spot.x - 400, y: spot.y }, p, w, null, DT, stay)
  assert.equal(R.soulFleeStep(a.r, a.brain, a.me, close, p, w, null, DT, () => 0.1), true, 'this time it leaves')
  assert.equal(a.r.spot, null); assert.equal(a.brain.mode, 'follow')
  assert.equal(w.birds.size, 0, 'its place is free again')
  // on its way to a place it goes on
  const b = sit()
  b.r.sat = false
  assert.equal(R.soulFleeStep(b.r, b.brain, b.me, { x: b.me.x - 30, y: b.me.y }, p, w, null, DT, () => 0), false)
  assert.ok(b.r.spot)
})

test('a soul let out keeps away from another local player and from a chicken of another browser, never from its owner', () => {
  const { c, her } = world()
  const f = free(c)
  f.params = { ...f.params, roam: 0, alert: 200, flee: 1, pattern: 'still', restless: 0, loopEvery: 0 }
  const box = (x, y) => ({ l: x - 45, r: x + 45, t: y - 200, b: y })
  const settle = () => { for (let i = 0; i < 400; i++) step(c, her) ; return { x: f.x, y: f.y } }
  c.setBlastActors([{ id: 'p1', box: box(her.x, her.y), push: () => {} }])
  const home = settle()
  // its owner walks right under it: nothing
  her.x = home.x; c.setBlastActors([{ id: 'p1', box: box(her.x, her.y), push: () => {} }])
  const withHer = settle()
  // another player stands where it is: it moves off
  const there = { x: withHer.x - 40, y: withHer.y + 100 }
  c.setBlastActors([{ id: 'p1', box: box(her.x, her.y), push: () => {} }, { id: 'p2', box: box(there.x, there.y), push: () => {} }])
  const away = settle()
  assert.ok(Math.hypot(away.x - there.x, away.y - (there.y - 100)) > 150, `it keeps its distance (${Math.round(Math.hypot(away.x - there.x, away.y - (there.y - 100)))})`)
  assert.ok(away.x > withHer.x + 60)
  // they leave: it is back where it was
  c.setBlastActors([{ id: 'p1', box: box(her.x, her.y), push: () => {} }])
  const again = settle()
  assert.ok(Math.abs(again.x - withHer.x) < 2 && Math.abs(again.y - withHer.y) < 8, '(it bobs a little)')
  // online, a chicken of another browser does the same
  c.setNetOn(true); c.setNetBodies([{ x: there.x, y: there.y }])
  const net = settle()
  assert.ok(net.x > withHer.x + 60)
  // a chick (no player) is nobody
  c.setNetBodies([]); c.setBlastActors([{ id: 'p1', box: box(her.x, her.y), push: () => {} }, { box: box(there.x, there.y), push: () => {} }])
  const chick = settle()
  assert.ok(Math.abs(chick.x - withHer.x) < 2 && Math.abs(chick.y - withHer.y) < 8)
})

test('each class minds the other players in its way; a chick minds nobody', () => {
  const of = shot => F.soulFollowParams({ species: 'jelly', shot })
  assert.ok(of('wind').alert > of('strings').alert && of('strings').alert > of('keys').alert && of('keys').alert > of('rebate').alert)
  assert.ok(of('wind').flee > of('strings').flee && of('strings').flee > of('keys').flee && of('keys').flee > of('rebate').flee)
  const chick = F.soulFollowParams({ species: 'chick', shot: null })
  assert.deepEqual([chick.alert, chick.flee], [0, 0])
  for (const k of ['alert', 'flee']) assert.ok(F.SOUL_FOLLOW_RANGES[k].max >= F.SOUL_FOLLOW_DEFAULTS[k])
})
