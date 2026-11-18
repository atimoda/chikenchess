// The Corrente-gancho (lib/pigchicken/grapple.ts): the hook thrown where she aims latches on the world and pulls her to
// it, or on someone and pulls them to her; the orange dot of where it would latch; the chain spinning while Atirar
// charges; letting go; and the same through the online Pátio.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS, SPORTS_IDS, RACK_ITEM_IDS, isStaff, itemsFileProblem, itemsDefaultsFile } = loadTs('lib/pigchicken/items.ts')
const { itemGroup } = loadTs('lib/pigchicken/inventory.ts')
const G = loadTs('lib/pigchicken/grapple.ts')
const N = loadTs('lib/pigchicken/net-world.ts')
const { heldItemPose } = loadTs('lib/pigchicken/held-pose.ts')
const { HOOK_CUFF_SVG, ITEM_SVG } = loadTs('lib/pigchicken/art.ts')

const DT = 0.01
const still = () => ({ x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 })
function step(c, input = {}, angle = 0, body = c.body, boxes = c.boxes) {
  c.step(DT, body, { x: body.x, y: body.y }, { x: body.x, y: body.y }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    boxes, 1000, () => {}, { peckOrigin: { x: body.x, y: body.y } })
}
const run = (c, s, input = {}, angle = 0) => { for (let t = 0; t < s - 1e-9; t += DT) step(c, input, angle) }
// her with the hook in her wing; `pushes`: what the pulls asked of each player
function holding(change = () => {}) {
  const set = structuredClone(DEFAULT_ITEMS)
  change(set.hook)
  const c = createCombat()
  c.body = still(); c.boxes = []
  c.setItems(set); c.give('hook'); step(c, { slot: 1 })
  return { c, d: set.hook }
}
// a player (an actor of the blasts) whose velocity follows what is pushed on her
function actor(id, body, pushes) {
  const a = { id, v: { x: 0, y: 0 }, push: (vx, vy) => { pushes.push([vx, vy]); a.v.x += vx; a.v.y += vy } }
  Object.defineProperty(a, 'box', { get: () => ({ l: body.x - 45, r: body.x + 45, t: body.y - 200, b: body.y }) })
  return a
}
const alien = (c, x, y = 15, hp = 500) => { const t = { id: 900 + c.targets.length, kind: 'zombie', home: 0, x, y, w: 40, h: 60, hp, maxHp: hp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'idle', animT: 0 }; c.targets.push(t); return t }
// Atirar held for `s` s, then let go
function throwIt(c, s = 0.6, angle = 0) { step(c, { fire: true, firePressed: true }, angle); run(c, s, { fire: true }, angle); step(c, {}, angle) }

test('the Corrente-gancho is a sports staff, in the utilities, on the racks, with its own numbers in the defaults file', () => {
  assert.ok(SPORTS_IDS.includes('hook')); assert.ok(RACK_ITEM_IDS.includes('hook'))
  const d = DEFAULT_ITEMS.hook
  assert.equal(d.name, 'Corrente-gancho'); assert.ok(isStaff(d)); assert.equal(d.grapple, true); assert.equal(d.returnThrow, false)
  assert.equal(itemGroup('hook', false), 2)
  assert.ok(['hookRange', 'hookSpeed', 'hookCharge', 'hookPull', 'hookPullMin', 'hookDamage', 'hookTime'].every(k => d[k] > 0))
  assert.equal(DEFAULT_ITEMS.bat.grapple, false)
  assert.equal(itemsFileProblem(itemsDefaultsFile(DEFAULT_ITEMS)), null)
  assert.ok(ITEM_SVG.hook && HOOK_CUFF_SVG && ITEM_SVG.hook !== HOOK_CUFF_SVG)
})

test('the cast stops at the first thing it touches, or at the end of its reach with nothing', () => {
  const wall = (x, y) => x >= 200 ? { kind: 'world' } : null
  const c = G.hookCast({ x: 0, y: 0 }, 0, 900, wall)
  assert.equal(c.hit.kind, 'world'); assert.ok(c.x >= 200 && c.x < 200 + G.HOOK_STEP)
  const none = G.hookCast({ x: 0, y: 0 }, Math.PI / 2, 300, () => null)
  assert.equal(none.hit, null); assert.ok(Math.abs(none.y - 300) < 1e-6)
  assert.equal(G.hookPullSpeed({ hookPull: 1000, hookPullMin: 0.5 }, 0), 500)
  assert.equal(G.hookPullSpeed({ hookPull: 1000, hookPullMin: 0.5 }, 1), 1000)
  const dv = G.pullDelta({ x: 0, y: 0 }, { x: 100, y: 0 }, 500, { x: 100, y: 50 })
  assert.deepEqual(dv, { x: 400, y: -50 })
  assert.equal(G.pullStep(10, 50, 0, 0.1, 0.01, 46, 1.5).done, true, 'close enough')
  assert.equal(G.pullStep(200, 300, 0, 2, 0.01, 46, 1.5).done, true, 'out of time')
  assert.equal(G.pullStep(200, 200, G.HOOK_STALL, 0.5, 0.01, 46, 1.5).done, true, 'stuck')
  assert.equal(G.pullStep(200, 300, 0, 0.5, 0.01, 46, 1.5).done, false)
  assert.ok(G.spinRate(1) > G.spinRate(0))
})

test('the orange dot: where it would latch, only with something in reach and the hook in her hand', () => {
  const { c, d } = holding()
  const ctx = { boxes: [], groundY: 1000 }
  assert.equal(c.predictHook({ x: 0, y: 0 }, ctx), null, 'nothing to grab straight ahead')
  const box = { l: 300, r: 400, t: -200, b: 100 }
  const at = c.predictHook({ x: 0, y: 0 }, { boxes: [box], groundY: 1000 })
  assert.equal(at.hit.kind, 'world'); assert.ok(at.x >= 300 && at.x < 310); assert.equal(at.y, 0)
  // too far: no dot
  const far = { l: d.hookRange + 50, r: d.hookRange + 150, t: -200, b: 100 }
  assert.equal(c.predictHook({ x: 0, y: 0 }, { boxes: [far], groundY: 1000 }), null)
  // on someone: the dot is on them
  const t = alien(c, 200)
  const on = c.predictHook({ x: 0, y: 0 }, ctx)
  assert.deepEqual(on.hit, { kind: 'target', id: t.id })
  // aiming down at the floor
  c.targets.length = 0
  const down = c.predictHook({ x: 0, y: 0 }, ctx)
  assert.equal(down, null, 'the aim is still to the right')
})

test('charging spins the chain in her hand (only the shackle stays drawn on her wrist), and letting go throws the hook', () => {
  const { c } = holding()
  step(c, { fire: true, firePressed: true }); run(c, 0.3, { fire: true })
  assert.equal(c.hookSpinning, true)
  const a = c.hookSpin; run(c, 0.1, { fire: true }); assert.notEqual(c.hookSpin, a, 'it keeps turning')
  assert.equal(heldItemPose(c, 0).svg, HOOK_CUFF_SVG)
  step(c)
  assert.equal(c.hookSpinning, false)
  assert.equal(c.hooks.length, 1); assert.equal(c.hooks[0].phase, 'out')
  assert.equal(c.held.flying, true)
  assert.equal(heldItemPose(c, 0).svg, HOOK_CUFF_SVG, 'the shackle stays on her wrist with the hook out')
  // nothing in reach: it goes to the end of its reach and the chain comes back
  run(c, 2)
  assert.equal(c.hooks.length, 0); assert.ok(!c.held.out && !c.held.flying)
  assert.equal(heldItemPose(c, 0).svg, ITEM_SVG.hook)
})

test('on a wall it latches and pulls her toward it, faster with more charge, and lets go when she gets there', () => {
  const pullOf = charge => {
    const { c } = holding()
    const pushes = []
    c.boxes = [{ l: 300, r: 400, t: -400, b: 100 }]
    c.setBlastActors([actor('p1', c.body, pushes)])
    throwIt(c, charge)
    run(c, 0.2)
    assert.equal(c.hooks[0].phase, 'pull'); assert.deepEqual(c.hooks[0].hit, { kind: 'world' })
    assert.ok(pushes.length > 0 && pushes[0][0] > 0, 'toward the wall')
    return { c, pushes, speed: Math.hypot(...pushes.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0])) }
  }
  const weak = pullOf(0), strong = pullOf(1)
  assert.ok(strong.speed > weak.speed * 1.2)
  // she arrives: the pull ends, she keeps part of her speed and the chain comes back
  const { c, pushes } = strong
  c.body.x = 304; c.body.y = -2
  step(c)
  assert.equal(c.hooks[0].phase, 'back')
  const last = pushes[pushes.length - 1]
  assert.ok(last[0] < 0, 'some of the speed is taken off')
  run(c, 1)
  assert.equal(c.hooks.length, 0)
})

test('pulled up onto a platform, the pull lets go once she lands on it (and does not take her through it)', () => {
  const { c } = holding()
  const pushes = []
  c.boxes = [{ l: 300, r: 600, t: -100, b: -80 }]
  c.setBlastActors([actor('p1', c.body, pushes)])
  throwIt(c, 0.6, Math.atan2(-100, 320))
  run(c, 0.2, {}, Math.atan2(-100, 320))
  assert.equal(c.hooks[0].phase, 'pull')
  // she flies, then lands on its top beside the hook
  c.body.grounded = false; step(c)
  c.body.grounded = true; c.body.x = 330; c.body.y = -100; step(c)
  assert.equal(c.hooks[0].phase, 'back')
})

test('on someone it hurts them and pulls them to her hand; the zombie stays where it was pulled to', () => {
  const { c, d } = holding()
  const t = alien(c, 500)
  throwIt(c, 0.6)
  run(c, 0.3)
  assert.equal(t.hp, 500 - d.hookDamage)
  assert.ok(t.x < 500, 'coming to her')
  run(c, 2)
  assert.equal(c.hooks.length, 0)
  assert.ok(t.x < 150, `next to her (${t.x})`)
  const was = t.x; run(c, 0.5)
  assert.ok(Math.abs(t.x - was) < 40, 'it does not slide back')
})

test('another player of this browser is pulled to her', () => {
  const { c } = holding()
  const mine = [], theirs = [], other = { x: 400, y: 100 }
  c.setBlastActors([actor('p1', c.body, mine), actor('p2', other, theirs)])
  throwIt(c, 0.6)
  run(c, 0.2)
  assert.deepEqual(c.hooks[0].hit, { kind: 'player', id: 'p2' })
  assert.ok(theirs.length && theirs[0][0] < 0, 'toward her'); assert.equal(mine.length, 0)
})

test('Atirar pressed again lets go of the hook', () => {
  const { c } = holding()
  const pushes = []
  c.boxes = [{ l: 300, r: 400, t: -400, b: 100 }]
  c.setBlastActors([actor('p1', c.body, pushes)])
  throwIt(c, 0.6); run(c, 0.2)
  assert.equal(c.hooks[0].phase, 'pull')
  step(c, { fire: true, firePressed: true }); step(c)
  assert.equal(c.hooks[0].phase, 'back')
  assert.equal(c.hookSpinning, false, 'that press does not start a new charge')
})

test('online: the hook thrown shows in the other browser, out to where it latched and back', () => {
  const items = DEFAULT_ITEMS
  assert.deepEqual(N.cleanShot({ k: 'gk', i: 'hook', x: 0, y: 0, tx: 300, ty: 0, sp: 99999, l: 1 }, items), { k: 'gk', i: 'hook', x: 0, y: 0, tx: 300, ty: 0, sp: 6000, l: 1 })
  assert.equal(N.cleanShot({ k: 'gk', i: 'hook', x: 0, y: 0, tx: 'a', ty: 0, sp: 100, l: 1 }, items), null)
  assert.equal(N.cleanShot({ k: 'gk', i: 'hook', x: 0, y: 0, tx: 99999, ty: 0, sp: 100, l: 0 }, items).tx, 6000)
  const { c } = holding()
  c.setNetOn(true)
  c.boxes = [{ l: 300, r: 400, t: -400, b: 100 }]
  throwIt(c, 0.2)
  const sent = c.netShots.find(s => s.k === 'gk')
  assert.ok(sent && sent.l === 1 && sent.tx >= 300 && sent.tx < 310)
  const o = holding()
  o.c.addRemoteShots([N.cleanShot(sent, items)])
  assert.equal(o.c.hooks.length, 1); assert.equal(o.c.hooks[0].remote, true)
  run(o.c, 0.3)
  assert.equal(o.c.hooks[0].phase, 'pull', 'holding where it latched over there')
  run(o.c, 1)
  assert.equal(o.c.hooks.length, 0)
})
