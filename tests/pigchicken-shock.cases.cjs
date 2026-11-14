// The lightning weapons (Martelo de Thor, Cajado de Odin): the shock and how it jumps (lib/pigchicken/shock.ts), the
// special on its own cooldown, the hammer thrown that comes back, and the same through the online Pátio.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS, MAGIC_IDS, RACK_ITEM_IDS, isStaff, itemsFileProblem, itemsDefaultsFile } = loadTs('lib/pigchicken/items.ts')
const { itemGroup } = loadTs('lib/pigchicken/inventory.ts')
const S = loadTs('lib/pigchicken/shock.ts')
const R = loadTs('lib/pigchicken/return-flight.ts')
const N = loadTs('lib/pigchicken/net-world.ts')
const { heldItemPose } = loadTs('lib/pigchicken/held-pose.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const DT = 0.01
function step(c, input = {}, angle = 0) {
  c.step(DT, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
}
const run = (c, s, input = {}) => { for (let t = 0; t < s - 1e-9; t += DT) step(c, input) }
// the item in her wing; by default with no special, so the plain shock is what is tested
function holding(item, change = d => { d.specialCooldown = 0 }) {
  const set = structuredClone(DEFAULT_ITEMS)
  change(set[item])
  const c = createCombat()
  c.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} })
  c.setItems(set); c.give(item); step(c, { slot: 1 })
  return { c, d: set[item] }
}
const alien = (c, x, hp = 500) => { const t = { id: 900 + c.targets.length, kind: 'alien', home: 0, x, y: 15, w: 40, h: 30, hp, maxHp: hp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'fly', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#c77dff' } }; c.targets.push(t); return t }
const blow = c => { step(c, { melee: true }); run(c, 0.12) }

test('the shock jumps to the nearest one in reach, one at a time, and no further than its jumps', () => {
  const p = (id, x, y = 0) => ({ id, x, y })
  const links = S.shockChain([p(1, 0)], [p(2, 100), p(3, 190), p(4, 500), p(5, 100, 80)], 120, 5)
  assert.deepEqual(links.map(l => [l.from.id, l.to.id, l.hop]), [[1, 2, 1], [2, 5, 2], [2, 3, 2]], 'it branches from whoever is nearest; the far one is out of reach')
  assert.equal(S.shockChain([p(1, 0)], [p(2, 100), p(3, 190)], 120, 1).length, 1, 'only as many jumps as it has')
  assert.equal(S.shockChain([p(1, 0)], [p(2, 100)], 0, 5).length, 0, 'no reach, no shock')
  assert.equal(S.shockChain([p(1, 0), p(2, 100)], [p(2, 100), p(3, 190)], 120, 5).length, 1, 'the ones the blow hit are not jumped to')
})

test('a shock over another keeps the longer time and the stronger of the two, and blinks only while it lasts', () => {
  const a = S.addShock(undefined, 0.3, 0.35)
  assert.deepEqual(a, { left: 0.3, total: 0.3, power: 0.35 })
  const b = S.addShock({ left: 2, total: 3, power: 1 }, 0.3, 0.35)
  assert.deepEqual(b, { left: 2, total: 3, power: 1 })
  assert.equal(S.shockXray({ left: 0, total: 1, power: 1 }, 0.01), false)
  assert.deepEqual(S.shockShake({ left: 0, total: 1, power: 1 }, 0.3), { x: 0, y: 0 })
  let on = 0, off = 0
  for (let t = 0; t < 1; t += 0.01) (S.shockXray({ left: 1, total: 1, power: 1 }, t) ? on++ : off++)
  assert.ok(on > 20 && off > 20, 'the x-ray blinks on and off')
})

test('the hammer and the staff are staffs of the utility group, on racks, and the defaults file knows their fields', () => {
  assert.deepEqual(MAGIC_IDS, ['mjolnir', 'odinstaff'])
  for (const id of MAGIC_IDS) {
    const d = DEFAULT_ITEMS[id]
    assert.ok(isStaff(d), id)
    assert.equal(itemGroup(id, false), 2, 'utility')
    assert.ok(RACK_ITEM_IDS.includes(id))
    assert.ok(d.shockRange > 0 && d.specialCooldown > 0 && d.mag === 0)
  }
  assert.equal(DEFAULT_ITEMS.mjolnir.returnThrow, true)
  assert.equal(DEFAULT_ITEMS.odinstaff.returnThrow, false)
  assert.equal(DEFAULT_ITEMS.mjolnir.specialKind, 'thunder'); assert.equal(DEFAULT_ITEMS.odinstaff.specialKind, 'lightning')
  assert.ok(DEFAULT_ITEMS.odinstaff.shockRange > DEFAULT_ITEMS.mjolnir.shockRange, 'the staff reaches more of them')
  assert.ok(DEFAULT_ITEMS.odinstaff.heavyShockRange > DEFAULT_ITEMS.odinstaff.shockRange && DEFAULT_ITEMS.odinstaff.heavyShockTime > DEFAULT_ITEMS.odinstaff.shockTime, 'the quick blow shocks shorter than the strong one')
  assert.equal(DEFAULT_ITEMS.bat.shockRange, 0); assert.equal(DEFAULT_ITEMS.bat.specialCooldown, 0)
  assert.equal(itemsFileProblem(itemsDefaultsFile(DEFAULT_ITEMS)), null)
  const bad = itemsDefaultsFile(DEFAULT_ITEMS); bad.mjolnir.specialKind = 'storm'
  assert.match(itemsFileProblem(bad), /mjolnir\.specialKind/)
})

test("the hammer's blow shocks who it hits and the ones around, takes harmony and holds them still", () => {
  const { c, d } = holding('mjolnir')
  const near = alien(c, 60), next = alien(c, 200), far = alien(c, 520)
  near.harmony = 30; next.harmony = 5
  blow(c)
  assert.equal(near.hp, 500 - d.meleeDamage, 'the one hit takes the blow')
  assert.ok(near.shock && next.shock, 'both are shocked')
  assert.equal(far.shock, undefined, 'too far for the shock to jump')
  assert.equal(next.hp, 500 - d.shockDamage, 'the one the shock jumped to takes its damage')
  assert.equal(far.hp, 500)
  assert.equal(near.harmony, 30 - d.shockDrain); assert.equal(next.harmony, 0, 'the bar never goes below empty')
  assert.ok(near.stun > 0 && next.stun > 0)
  assert.equal(c.bolts.length, 2, 'a bolt to the one hit and one on to the next')
  assert.ok(c.bolts.every(b => !b.special))
  assert.ok(c.sounds.some(s => s.kind === 'zap'))
  run(c, d.shockTime + 0.7)
  assert.equal(near.shock, undefined, 'the shock of a plain blow is short'); assert.equal(c.bolts.length, 0)
})

test('items without a shock leave nobody shocked', () => {
  const { c } = holding('bat')
  const t = alien(c, 60); alien(c, 150)
  blow(c)
  assert.ok(t.hp < 500)
  assert.equal(t.shock, undefined); assert.equal(c.bolts.length, 0)
})

test('the special: the first blow that hits after its interval, stronger and longer, then it fills again', () => {
  const { c, d } = holding('mjolnir', () => {})
  const o = c.held
  assert.equal(c.special(o), 1, 'ready from the start')
  blow(c)
  assert.equal(c.special(o), 1, 'a blow that hits nobody does not spend it')
  run(c, 0.5)
  const near = alien(c, 60, 5000), next = alien(c, 200, 5000), wide = alien(c, 200 + d.specialRange - 20, 5000)
  blow(c)
  assert.ok(c.special(o) < 0.05, 'spent')
  assert.ok(near.shock.total === d.specialTime && near.shock.power === 1)
  assert.ok(wide.shock, 'the special reaches further')
  assert.equal(next.hp, 5000 - d.specialDamage)
  assert.equal(near.hp, 5000 - d.meleeDamage - d.specialDamage, 'the one hit takes the blow and the special')
  assert.ok(c.bolts.some(b => b.sky), 'the thunder falls from the sky')
  assert.ok(c.skyFlash > 0)
  assert.ok(c.sounds.some(s => s.kind === 'thunder'))
  // the next blows are plain shocks while it fills
  c.sounds.length = 0; run(c, 1); const before = c.special(o)
  blow(c)
  assert.ok(c.sounds.some(s => s.kind === 'zap') && !c.sounds.some(s => s.kind === 'thunder'))
  assert.ok(before > 0.05 && before < 0.2, 'it fills with the time')
  run(c, d.specialCooldown)
  assert.equal(c.special(o), 1)
  assert.equal(c.special({ item: 'bat', ammo: 8, durability: 0 }), null, 'an item with no special has no background to show')
  // the staff's is lightning
  const st = holding('odinstaff', () => {})
  alien(st.c, 60); blow(st.c)
  assert.ok(st.c.sounds.some(s => s.kind === 'lightning')); assert.ok(!st.c.bolts.some(b => b.sky))
})

test("Atirar throws the hammer: further with the charge, already half way with a tap, and it comes back to her wing", () => {
  const far = seconds => {
    const { c, d } = holding('mjolnir')
    step(c, { fire: true, firePressed: true })
    assert.equal(c.heavyCharging, true); assert.equal(c.flights.length, 0, 'a press only arms it')
    run(c, seconds, { fire: true })
    const path = c.predictReturn({ x: 0, y: 0 }, { boxes: [], groundY: 1000 })
    step(c)
    assert.equal(c.swing, null, 'no blow: it is thrown')
    assert.equal(c.flights.length, 1); assert.equal(c.held.flying, true)
    assert.equal(heldItemPose(c, 0), null, 'her wing is empty while it flies')
    let max = 0
    for (let i = 0; i < 400 && c.flights.length; i++) { max = Math.max(max, c.flights[0].x); step(c) }
    assert.equal(c.flights.length, 0, 'it came back'); assert.equal(c.held.flying, false)
    assert.ok(heldItemPose(c, 0), 'and is in her wing again')
    assert.ok(Math.abs(path[path.length - 1].x - max) < 30, 'the aim line ends where it turns back')
    return { max, d }
  }
  const tap = far(0), full = far(DEFAULT_ITEMS.mjolnir.returnCharge + 0.2)
  assert.ok(Math.abs(tap.max - tap.d.returnRange * tap.d.returnMin) < 20, `a tap goes half way (${tap.max})`)
  assert.ok(Math.abs(full.max - full.d.returnRange) < 20, `full charge goes all the way (${full.max})`)
})

test('the hammer in flight hits and shocks whoever it crosses, and her wing waits for it', () => {
  // with no curve, so that the path over the two of them is the straight one
  const { c, d } = holding('mjolnir', d => { d.specialCooldown = 0; d.returnCurveMin = 0 })
  const t = alien(c, 200), side = alien(c, 200 + 150)
  step(c, { fire: true, firePressed: true }); step(c)
  step(c, { melee: true })
  assert.equal(c.swing, null, 'no blow while it is away')
  step(c, { throwHeld: true }); assert.equal(c.throwCharge, 0, 'nor a Throw')
  for (let i = 0; i < 400 && c.flights.length; i++) step(c)
  // a tap: half the damage of a full charge. It hit this one on the way out; the other one out and back (it flies
  // back to her chest, over the first one), and each of those hits shocked the one beside it
  assert.equal(t.hp, 500 - d.returnDamage * 0.5 - 2 * d.shockDamage)
  assert.equal(side.hp, 500 - 2 * d.returnDamage * 0.5 - d.shockDamage)
  assert.equal(c.held.item, 'mjolnir')
  // a wall turns it back at once
  const w = holding('mjolnir')
  w.c.step(DT, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { fire: true, firePressed: true, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }, [], 1000, () => {})
  const wall = [{ l: 100, t: -200, r: 140, b: 200 }]
  let max = 0
  for (let i = 0; i < 400 && (i < 2 || w.c.flights.length); i++) { w.c.step(DT, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }, wall, 1000, () => {}); max = Math.max(max, w.c.flights[0]?.x ?? 0) }
  assert.ok(max >= 100 && max < 125, `it stops at the wall (${max})`)
  assert.equal(w.c.held.flying, false)
})

// throws the hammer along `angle` and flies it with her aim held at `aim`; the points of the way out and of the way back
function flown(change, angle = 0, aim = angle) {
  const { c, d } = holding('mjolnir', d => { d.specialCooldown = 0; change(d) })
  step(c, { fire: true, firePressed: true }, angle); step(c, {}, angle)
  const out = [], back = []
  for (let i = 0; i < 900 && c.flights.length; i++) { const f = c.flights[0]; (f.back ? back : out).push({ x: f.x, y: f.y }); step(c, {}, aim) }
  // the first point of the way back is where it turned
  return { c, d, out, back, far: back[0] }
}
// how far a point is from the line a → b, to its right (in the canvas: below a line that goes right)
const beside = (p, a, b) => ((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x)) / Math.hypot(b.x - a.x, b.y - a.y)

test('the curve of the throw: the least bend with the aim still, more to the side the aim turns, never past the most', () => {
  const DEG = Math.PI / 180
  assert.deepEqual(R.steerCurve(0, 1, 16, 70), { side: 1, curve: 16 * DEG })
  assert.deepEqual(R.steerCurve(2 * DEG, -1, 16, 70), { side: -1, curve: 16 * DEG }, 'a small tremble of the aim keeps the side')
  const up = R.steerCurve(-20 * DEG, 1, 16, 70), far = R.steerCurve(-80 * DEG, 1, 16, 70)
  assert.equal(up.side, -1); assert.ok(up.curve > 16 * DEG && up.curve < 70 * DEG)
  assert.equal(far.side, -1); assert.ok(Math.abs(far.curve - 70 * DEG) < 1e-9)
  assert.equal(R.steerCurve(0, 1, 0, 70).curve, 0, 'no least bend: straight until she steers')
  assert.ok(Math.abs(R.steerCurve(1, 1, 30, 10).curve - 30 * DEG) < 1e-9, 'the most is never under the least')
  // with nobody steering the way out ends on the line she aimed along
  const path = R.outPath(0, 0, 0, 600, 20), end = path[path.length - 1]
  assert.ok(Math.abs(end.y) < 2 && end.x > 590, `${end.x}, ${end.y}`)
  assert.ok(Math.min(...path.map(p => p.y)) < -20, 'and goes over that line')
})

test('with no curve the hammer goes and comes back straight; with the least bend it goes over the line and comes back under it', () => {
  const flat = flown(d => { d.returnCurveMin = 0 })
  assert.ok(flat.out.every(p => Math.abs(p.y) < 1e-6), 'straight out')
  const chest = { x: 0, y: -90 }
  assert.ok(flat.back.every(p => Math.abs(beside(p, flat.far, chest)) < 1), 'and straight back to her')
  assert.equal(flat.c.flights.length, 0)
  const loop = flown(() => {})
  assert.ok(Math.min(...loop.out.map(p => p.y)) < -8, 'out over the line')
  assert.ok(Math.abs(loop.far.y) < 6, `it turns back on the line she aimed along (${loop.far.y})`)
  // going left, the right of far → chest is the upper side: the way back is on the other side, under
  assert.ok(Math.min(...loop.back.map(p => beside(p, loop.far, chest))) < -8, 'back under the straight way home')
  assert.ok(loop.back.every(p => beside(p, loop.far, chest) < 1))
  assert.equal(loop.c.flights.length, 0, 'and it arrives'); assert.equal(loop.c.held.flying, false)
  // thrown to the left it is the same picture mirrored
  const left = flown(() => {}, Math.PI)
  assert.ok(Math.min(...left.out.map(p => p.y)) < -8 && Math.abs(left.far.y) < 6 && left.far.x < -300)
  // the aim line while charging is that same way out
  const { c } = holding('mjolnir')
  step(c, { fire: true, firePressed: true })
  const line = c.predictReturn({ x: 0, y: 0 }, { boxes: [], groundY: 1000 }), end = line[line.length - 1]
  assert.ok(Math.hypot(end.x - loop.far.x, end.y - loop.far.y) < 14, 'the aim line ends where it turns back')
  assert.ok(Math.min(...line.map(p => p.y)) < -8)
})

test('the aim steers the hammer in the air: it bends to the side she turns the aim to, out and back, and still comes home', () => {
  const still = flown(() => {}), up = flown(() => {}, 0, -0.6), down = flown(() => {}, 0, 0.6)
  assert.ok(up.far.y < still.far.y - 80, `aim up, it goes up (${up.far.y})`)
  assert.ok(down.far.y > still.far.y + 80, `aim down, it goes down (${down.far.y})`)
  const chest = { x: 0, y: -90 }
  // back on the side she aims: over the straight way home with the aim up, under it with the aim down
  assert.ok(Math.max(...up.back.map(p => beside(p, up.far, chest))) > 20)
  assert.ok(Math.min(...down.back.map(p => beside(p, down.far, chest))) < -20)
  for (const f of [up, down]) { assert.equal(f.c.flights.length, 0); assert.equal(f.c.held.flying, false) }
  // the most bend there is, with the aim held far away, still lets it arrive
  const wild = flown(d => { d.returnCurveMax = 180 }, 0, 2.5)
  assert.equal(wild.c.flights.length, 0); assert.equal(wild.c.held.flying, false)
})

test("the staff's strong blow shocks further and longer than its quick one", () => {
  const reach = strong => {
    const { c, d } = holding('odinstaff')
    const hit = alien(c, 60), mid = alien(c, 60 + d.shockRange + 60)
    if (strong) { step(c, { fire: true, firePressed: true }); run(c, 0.2, { fire: true }); step(c); run(c, d.heavyTime * 0.4) }
    else blow(c)
    return { hit, mid, d, c }
  }
  const quick = reach(false), strong = reach(true)
  assert.ok(quick.hit.shock && !quick.mid.shock, 'the quick blow does not reach the one further away')
  assert.ok(strong.c.swing?.heavy || strong.hit.shock, 'the strong blow came out')
  assert.ok(strong.hit.shock && strong.mid.shock, 'the strong one does')
  assert.equal(strong.hit.shock.total, strong.d.heavyShockTime); assert.equal(quick.hit.shock.total, quick.d.shockTime)
  assert.equal(strong.c.flights.length, 0, 'the staff is not thrown')
})

test("online: a shock on the owner's enemy is asked of the owner, who shocks it for everyone; bolts and the hammer show", () => {
  const owner = createCombat(), follower = createCombat()
  for (const c of [owner, follower]) { c.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} }); c.setNetOn(true) }
  const set = structuredClone(DEFAULT_ITEMS); set.mjolnir.specialCooldown = 0
  follower.setItems(set); owner.setItems(set)
  const hits = []
  follower.setNetFollower(h => hits.push(h))
  const zombie = { id: 5, net: 5, kind: 'zombie', home: 0, x: 60, y: 15, w: 40, h: 30, hp: 500, maxHp: 500, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'walk', animT: 0, data: { kind: 'zombie' } }
  owner.targets.push(zombie)
  const cache = N.newFoeCache(), formations = new Map()
  const sync = () => N.importFoes(follower.targets, N.exportFoes(owner.targets, 3, cache, false), formations)
  N.importFoes(follower.targets, N.exportFoes(owner.targets, 3, cache, true), formations)
  const m = follower.targets.find(t => t.net === 5)
  assert.ok(m?.mirror)
  m.x = 60; m.y = 15
  follower.give('mjolnir'); step(follower, { slot: 1 }); blow(follower)
  assert.equal(m.hp, 500, 'the mirror keeps its life')
  assert.ok(m.shock, 'and shakes here at once')
  const sh = hits.find(h => h.sh)
  assert.deepEqual(sh.sh, [set.mjolnir.shockTime, S.SHOCK_POWER.quick, set.mjolnir.shockDrain])
  for (const h of hits) assert.ok(owner.applyNetHit(N.cleanHit(JSON.parse(JSON.stringify(h)))))
  assert.ok(zombie.shock && zombie.stun > 0 && zombie.hp === 500 - set.mjolnir.meleeDamage)
  assert.equal(N.cleanHit({ id: 5, d: 0, px: 0, x: 0, y: 0, sh: [999, 9, -4] }).sh.join(), '30,1,0', 'what comes from another browser is limited')
  // a third browser sees the owner's enemy shocked, and no longer once it is over
  const third = createCombat(), f3 = new Map(), c3 = N.newFoeCache()
  N.importFoes(third.targets, JSON.parse(JSON.stringify(N.exportFoes(owner.targets, 3, c3, true))), f3)
  assert.ok(third.targets[0].shock.left > 0)
  const quiet = JSON.parse(JSON.stringify(N.exportFoes(owner.targets, 3, c3, false))).l[0]
  assert.equal(quiet[17], 0, 'with no new data its place is held'); assert.equal(quiet.length, 19)
  N.importFoes(third.targets, { fs: {}, l: [quiet] }, f3)
  assert.equal(third.targets[0].data.kind, 'zombie', 'and its data stays')
  sync()
  // the bolts and a thrown hammer travel with the shots, and only show on the other side
  const z = follower.netShots.find(s => s.k === 'z')
  assert.ok(z && z.p.length % 5 === 0)
  step(follower, { fire: true, firePressed: true }); step(follower)
  const hm = follower.netShots.find(s => s.k === 'hm')
  assert.ok(hm)
  const seen = createCombat(); seen.setView(-500, 1500)
  seen.addRemoteShots([N.cleanShot(JSON.parse(JSON.stringify(z)), DEFAULT_ITEMS), N.cleanShot(JSON.parse(JSON.stringify(hm)), DEFAULT_ITEMS)])
  assert.equal(seen.bolts.length, z.p.length / 5); assert.equal(seen.flights.length, 1); assert.ok(seen.flights[0].remote)
  const t = alien(seen, 200)
  for (let i = 0; i < 400 && seen.flights.length; i++) step(seen)
  assert.equal(seen.flights.length, 0, 'it flies out and back to where it left'); assert.equal(t.hp, 500, 'and hurts nobody here')
  assert.equal(N.cleanShot({ k: 'z', i: 'mjolnir', p: [1, 2, 3], s: 0 }, DEFAULT_ITEMS), null)
  assert.equal(N.cleanShot({ k: 'hm', i: 'mjolnir', x: 0, y: 0, a: 0, sp: 99999, rg: 99999 }, DEFAULT_ITEMS).sp, 4000)
})
