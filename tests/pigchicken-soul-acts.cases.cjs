const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const A = loadTs('lib/pigchicken/soul-acts.ts')
const L = loadTs('lib/pigchicken/soul-library.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

// ---------- the numbers ----------
test('each class has its help; a dead soul hinders by what killed it, more often the rarer it is', () => {
  const help = cls => A.soulActBase(cls, 'alive', 'common').help
  assert.deepEqual(['sentinel', 'patrol', 'escort', 'rhythm', 'lazy', 'chick'].map(help), ['sing', 'warn', 'step', 'beat', 'fetch', 'none'])
  assert.equal(A.soulActBase('sentinel', 'alive', 'legendary').chance, 0, 'a living one does not hinder')
  const dead = r => A.soulActBase('sentinel', 'dead', r).chance
  assert.ok(dead('common') > 0 && dead('common') < dead('uncommon') && dead('uncommon') < dead('rare') && dead('rare') < dead('legendary'))
  const p = A.soulActBase('sentinel', 'dead', 'rare')
  for (const [weapon, kind] of [['blast', 'push'], ['bullet', 'bounce'], ['arrow', 'aim'], ['impact', 'peck'], [null, 'peck']])
    assert.equal(A.hinderOf(p, { state: 'dead', weapon, note: 'tonic' }), kind, String(weapon))
  assert.equal(A.hinderOf(p, { state: 'alive', weapon: null, note: 'tonic' }), 'none')
  assert.equal(A.hinderOf(p, { state: 'alive', weapon: null, note: 'outside' }), 'detune', 'outside the key: out of tune')
  assert.equal(A.hinderOf({ ...p, hinder: 'bounce' }, { state: 'alive', weapon: null, note: 'tonic' }), 'bounce', 'its sheet says another')
  assert.equal(A.hinderOf({ ...p, hinder: 'none' }, { state: 'dead', weapon: 'blast', note: 'tonic' }), 'none')

  const alive = A.soulActBase('sentinel', 'alive', 'common')
  assert.equal(A.hinderChance(alive, { state: 'alive', weapon: null, note: 'tonic' }), 0)
  assert.equal(A.hinderChance(alive, { state: 'alive', weapon: null, note: 'outside' }), A.SOUL_ACT.rebel, 'a rebel hinders even alive')
  assert.equal(A.hinderChance(p, { state: 'dead', weapon: 'blast', note: 'tonic' }), A.SOUL_HINDER_CHANCE.rare)
  assert.equal(A.hinderChance(p, { state: 'dead', weapon: 'blast', note: 'outside' }), A.SOUL_HINDER_CHANCE.rare + A.SOUL_ACT.rebel, 'and more than the others dead')
  assert.equal(A.hinderChance({ ...p, hinder: 'none', chance: 1 }, { state: 'dead', weapon: 'blast', note: 'outside' }), 0)
  assert.equal(A.hinderChance({ ...p, chance: 0.95 }, { state: 'dead', weapon: 'blast', note: 'outside' }), 1, 'never more than sure')
})

test('the clock: it comes round every `every` seconds, hinders by chance, and is ready to help otherwise', () => {
  const p = { ...A.SOUL_ACT_DEFAULTS, every: 2, chance: 0.5 }, dead = { state: 'dead', weapon: 'blast', note: 'tonic' }
  const c = A.newActClock(p, () => 0)
  assert.equal(c.in, 2 * A.SOUL_ACT.first[0], 'its first round comes sooner')
  assert.equal(A.newActClock(p, () => 1).in, 2)
  assert.equal(A.actClockStep(c, p, dead, 0.5, () => 0), false, 'not yet')
  assert.equal(c.ready, false)
  // the round comes: the chance missed, it is ready to help
  assert.equal(A.actClockStep(c, p, dead, 0.4, () => 0.9), false)
  assert.equal(c.ready, true); assert.equal(c.in, 2)
  // nothing to help with: it stays ready, and the next round may hinder
  assert.equal(A.actClockStep(c, p, dead, 1.9, () => 0), false)
  assert.equal(A.actClockStep(c, p, dead, 0.2, () => 0.4), true, 'the chance hit')
  assert.equal(c.ready, false); assert.equal(c.in, 2)
  // a help done starts the wait again
  c.ready = true; c.in = 0.3
  A.actDone(c, p)
  assert.deepEqual(c, { in: 2, ready: false })
  // nothing to do for her: never ready
  const idle = { ...p, help: 'none', chance: 0 }, k = { in: 0.1, ready: false }
  assert.equal(A.actClockStep(k, idle, dead, 0.2, () => 0), false)
  assert.equal(k.ready, false)
})

test("an entry's acts are its class's with its own over them; the sheets keep only what is known", () => {
  const e = L.SOUL_ENTRIES.find(o => o.id === 'jelly.dead.strings')
  assert.deepEqual(L.entryActParams(e), { ...A.SOUL_ACT_DEFAULTS, ...A.SOUL_CLASS_ACTS.patrol, chance: A.SOUL_HINDER_CHANCE[e.rarity] })
  const next = L.changeEntry(L.SOUL_ENTRIES, e.id, o => ({ ...o, act: { help: 'fetch', every: 99, range: 5, power: 0.25, hinder: 'aim', chance: 2, force: -1, nope: 1 } }))
  const got = next.find(o => o.id === e.id)
  assert.deepEqual(got.act, { every: 30, range: 50, power: 0.25, chance: 1, force: 0, help: 'fetch', hinder: 'aim' }, 'inside the limits, the unknown dropped')
  assert.deepEqual(L.entryActParams(got), { help: 'fetch', every: 30, range: 50, power: 0.25, hinder: 'aim', chance: 1, force: 0 })
  const file = L.soulsFile(next)
  assert.deepEqual(file, { sheets: { [e.id]: { act: got.act } } })
  assert.equal(L.soulsFileProblem(file), null)
  assert.deepEqual(L.soulEntriesOver(file).find(o => o.id === e.id).act, got.act, 'and back')
  assert.match(L.soulsFileProblem({ sheets: { [e.id]: { act: { help: 'dance' } } } }), /sheets\.jelly\.dead\.strings/)
  assert.match(L.soulsFileProblem({ sheets: { [e.id]: { act: { every: 99 } } } }), /sheets\.jelly\.dead\.strings/)
  // a rare one keeps its own too; a bad one loses only that
  const rare = L.addRare(L.SOUL_ENTRIES)
  const withAct = L.changeEntry(rare.entries, rare.id, o => ({ ...o, act: { help: 'step', hinder: 'bounce', chance: 0.4 } }))
  assert.deepEqual(L.soulEntriesOver(L.soulsFile(withAct)).find(o => o.id === rare.id).act, { chance: 0.4, help: 'step', hinder: 'bounce' })
  assert.equal(L.changeEntry(rare.entries, rare.id, o => ({ ...o, act: { help: 'x' } })).find(o => o.id === rare.id).act, undefined)
})

// ---------- in the combat ----------
const G = 40
const body = (over = {}) => ({ x: 0, y: G, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0, ...over })
function step(c, her, input = {}, angle = 0) {
  c.step(0.016, her, { x: her.x, y: her.y - 100 }, { x: her.x, y: her.y - 100 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], G, () => {}, { peckOrigin: { x: her.x, y: her.y - 100 } })
}
function world(item) {
  const c = createCombat(), notes = []
  c.setMusicOut({ note: (voice, midi, at) => notes.push({ voice, midi, at }), hold: () => null, drum: () => {} })
  c.setView(-2000, 2000)
  const her = body()
  if (item) { c.give(item); step(c, her, { slot: 1 }) }
  return { c, her, notes }
}
let ids = 7000
const soulOf = (over = {}) => ({ id: ids++, species: 'jelly', state: 'alive', shot: 'wind', note: 'tonic', weapon: null, rarity: 'common', color: '#c77dff', bird: 'pardal', ...over })
// lets a soul out; its clock comes round on the next frame unless told otherwise
function free(c, over = {}, at = { x: 0, y: -300 }) {
  c.basket.push(soulOf(over)); c.releaseSoul(at)
  const f = c.freedSouls[c.freedSouls.length - 1]
  f.clock.in = 0.001
  return f
}
const holdSoul = (f, x, y) => { Object.assign(f.brain, { x, y, ax: x, ay: y, vx: 0, vy: 0, mode: 'rest', settle: 0 }); f.x = x; f.y = y }
const alien = (c, x, hp = 100) => { const t = { id: 900 + c.targets.length, kind: 'alien', home: x, x, y: 15, w: 40, h: 30, hp, maxHp: hp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'hold', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#c77dff' } }; c.targets.push(t); return t }
const actor = (c, her) => { const pushes = []; c.setBlastActors([{ id: 'p1', box: { l: her.x - 45, r: her.x + 45, t: her.y - 200, b: her.y }, push: (vx, vy) => pushes.push({ vx, vy }) }]); return pushes }
const run = (c, her, s, each) => { for (let t = 0; t < s; t += 0.016) { each?.(); step(c, her) } }

test('a Sentinela sings a note of the chord to the nearest enemy it reaches: its harmony fills a little', () => {
  const { c, her, notes } = world()
  const far = alien(c, 900), near = alien(c, 200)
  const f = free(c)
  assert.equal(f.act.help, 'sing')
  holdSoul(f, 150, -100); step(c, her)
  assert.equal(near.harmony, A.SOUL_ACT.sing.amount * f.act.power, 'the one it reaches')
  assert.equal(far.harmony ?? 0, 0)
  assert.equal(notes.filter(n => n.voice === 'bird').length, 1, 'in its own voice')
  assert.ok(c.texts.some(t => Math.abs(t.x - 150) < 1), 'the note shows over the soul')
  assert.deepEqual(near.soul && { shot: near.soul.shot }, { shot: 'wind' }, 'nobody played it a note: the bird takes after the soul')
  assert.ok(Math.abs(f.clock.in - f.act.every) < 1e-9 && !f.clock.ready, 'and it waits again')
  // the player's own note is what the bird remembers
  near.soul = { shot: 'keys', note: 'leading' }
  f.clock.in = 0.001; holdSoul(f, 150, -100); step(c, her)
  assert.equal(near.harmony, 2 * A.SOUL_ACT.sing.amount * f.act.power)
  assert.deepEqual(near.soul, { shot: 'keys', note: 'leading' })
  // nothing within its reach: it stays ready and sings as soon as something comes
  near.x = 5000; f.clock.in = 0.001
  run(c, her, 1, () => holdSoul(f, 150, -100))
  assert.equal(f.clock.ready, true)
  near.x = 200; near.home = 200; holdSoul(f, 150, -100); step(c, her)
  assert.equal(near.harmony, 3 * A.SOUL_ACT.sing.amount * f.act.power)
  // full harmony by its notes: the alien becomes a bird like any other
  near.harmony = near.maxHp - 1; f.clock.in = 0.001; holdSoul(f, 150, -100); step(c, her)
  assert.equal(c.critters.filter(k => k.kind === 'bird').length, 1)
})

test('a Ritmada sings on the beat, and its note counts more', () => {
  const { c, her } = world()
  const t = alien(c, 200)
  const f = free(c, { shot: 'percussion' })
  assert.equal(f.act.help, 'beat')
  f.clock.in = 60; f.clock.ready = true
  let sangAt = null
  for (let i = 0; i < 400 && sangAt === null; i++) {
    const was = Math.floor(c.music.beat)
    holdSoul(f, 150, -100); step(c, her)
    if (t.harmony) sangAt = { was, now: Math.floor(c.music.beat) }
    else assert.equal(Math.floor(c.music.beat), i === 0 ? Math.floor(c.music.beat) : was, 'no note between two beats')
  }
  assert.ok(sangAt && sangAt.now === sangAt.was + 1, 'the frame the beat came')
  assert.ok(Math.abs(t.harmony - A.SOUL_ACT.sing.amount * f.act.power * A.SOUL_ACT.sing.beat) < 1e-9)
})

test('a Preguiçosa fetches an item she does not carry and lets it go over her', () => {
  const { c, her } = world('pistol')
  const mine = { id: 9001, owned: { item: 'pistol', ammo: 5, durability: 0 }, x: 350, y: G, vy: 0, resting: true, noPick: 0 }
  const item = { id: 9002, owned: { item: 'bat', ammo: 0, durability: 10 }, x: 420, y: G, vy: 0, resting: true, noPick: 0 }
  const close = { id: 9003, owned: { item: 'bow', ammo: 5, durability: 0 }, x: 60, y: G, vy: 0, resting: true, noPick: 0 }
  c.pickups.push(mine, item, close)
  // a rack nearer than all of them, with its item on it
  c.addRack(300, 'sniper', undefined, 0); run(c, her, 1.5)
  assert.ok(c.pickups.some(p => p.owned.item === 'sniper' && p.resting))
  const f = free(c, { shot: 'rebate' })
  assert.equal(f.act.help, 'fetch')
  holdSoul(f, 300, -150); step(c, her)
  assert.deepEqual(f.job && { kind: f.job.kind, item: f.job.item }, { kind: 'fetch', item }, "not the pistol she has, nor the bow at her feet, nor the rack's")
  let carried = false
  for (let i = 0; i < 600 && (f.job || !item.resting); i++) {
    step(c, her)
    if (f.job?.kind === 'carry') { carried = true; assert.ok(Math.abs(item.x - f.x) < 1 && item.y > f.y, 'it hangs under the soul'); assert.ok(item.noPick > 0, 'nobody takes it from the air') }
  }
  assert.ok(carried)
  assert.equal(f.job, null)
  assert.ok(Math.abs(item.x - her.x) < 40 && item.y === G && item.resting, `at her feet (${Math.round(item.x)}, ${item.y})`)
  assert.deepEqual([mine.x, close.x], [350, 60], 'the others stay')
  run(c, her, 0.4)
  assert.equal(c.hover, item, 'hers to take')
  // called back on the way, it lets the item fall where it is
  const other = { id: 9004, owned: { item: 'grenade', ammo: 1, durability: 0 }, x: 500, y: G, vy: 0, resting: true, noPick: 0 }
  c.pickups.push(other); f.clock.in = 0.001; f.clock.ready = false
  holdSoul(f, 300, -150)
  for (let i = 0; i < 300 && f.job?.kind !== 'carry'; i++) step(c, her)
  assert.equal(f.job?.kind, 'carry')
  run(c, her, 0.2)
  assert.equal(c.callSouls(), 1); step(c, her)
  assert.equal(other.resting, false, 'falling')
  run(c, her, 2)
  assert.ok(other.resting && other.y === G && Math.abs(other.x - her.x) > 100, 'short of her')
})

test('a Patrulheira warns of the enemy she has her back to, once in a while', () => {
  const { c, her, notes } = world()
  const front = alien(c, 150)
  const f = free(c, { shot: 'strings' })
  assert.equal(f.act.help, 'warn')
  const marks = () => c.texts.filter(t => t.text === '!').length
  run(c, her, 0.5, () => holdSoul(f, 100, -150))
  assert.equal(marks(), 0, 'she sees that one')
  assert.equal(f.clock.ready, true)
  const back = alien(c, -300)
  holdSoul(f, 100, -150); step(c, her)
  assert.equal(marks(), 2, 'over the soul and over the enemy')
  assert.ok(c.texts.some(t => t.text === '!' && Math.abs(t.x - back.x) < 1))
  assert.equal(notes.length, 2, 'two short cries')
  // the same one again only after a while; another one at its next round
  f.clock.in = 0.001; run(c, her, 1.2, () => holdSoul(f, 100, -150))
  assert.equal(marks(), 0)
  const other = alien(c, -200)
  holdSoul(f, 100, -150); step(c, her)
  assert.ok(c.texts.some(t => t.text === '!' && Math.abs(t.x - other.x) < 1))
  assert.ok(front.deadT <= 0)
})

test('an Escolta is a step under her feet when she falls from high', () => {
  const { c, her } = world()
  const pushes = actor(c, her)
  const f = free(c, { shot: 'keys' })
  assert.equal(f.act.help, 'step')
  f.clock.in = 60; f.clock.ready = true
  // a little hop near the floor: nothing
  her.grounded = false; her.y = G - 140
  for (let i = 0; i < 30; i++) { her.y += 2; holdSoul(f, her.x + 60, her.y - 150); step(c, her) }
  assert.equal(f.job, null)
  // a long fall, 600 px/s
  her.y = -3000
  let n = 0
  for (; n < 200 && !pushes.length; n++) { her.y += 600 * 0.016; if (!f.job) holdSoul(f, her.x + 60, her.y - 150); step(c, her) }
  assert.equal(pushes.length, 1, 'she is lifted')
  assert.equal(pushes[0].vx, 0)
  const lift = A.actLerp(A.SOUL_ACT.step.lift, f.act.power)
  assert.ok(Math.abs(-pushes[0].vy - (lift + 600)) < 30, `her fall is undone and she leaves upwards (${pushes[0].vy})`)
  assert.ok(n * 0.016 >= A.SOUL_ACT.step.air, 'not before she has been off the floor a moment')
  assert.equal(f.job, null); assert.equal(f.clock.ready, false)
  // on the floor again before it gets there: it gives up
  f.clock.in = 60; f.clock.ready = true; her.y = -3000
  for (let i = 0; i < 200 && !f.job; i++) { her.y += 600 * 0.016; holdSoul(f, her.x + 200, her.y - 200); step(c, her) }
  assert.equal(f.job?.kind, 'step')
  her.grounded = true; step(c, her)
  assert.equal(f.job, null); assert.equal(pushes.length, 1)
})

test('a dead soul hinders by what killed it: a shove, a hop, a shaken aim, a peck', () => {
  const hinder = (weapon, item) => {
    const w = world(item), pushes = actor(w.c, w.her)
    const f = free(w.c, { state: 'dead', weapon, rarity: 'uncommon' })
    f.act = { ...f.act, chance: 1 }
    holdSoul(f, 160, -200); step(w.c, w.her)
    assert.equal(f.job?.kind, { blast: 'push', bullet: 'bounce', arrow: 'aim', impact: 'peck' }[weapon])
    for (let i = 0; i < 300 && f.job; i++) step(w.c, w.her)
    assert.equal(f.job, null, 'it got to her')
    return { ...w, pushes, f }
  }
  // killed by a blast: a shove away from the side it came from, and a little up
  let h = hinder('blast')
  assert.equal(h.pushes.length, 1)
  assert.ok(h.pushes[0].vx < -100 && h.pushes[0].vy < 0, JSON.stringify(h.pushes[0]))
  assert.equal(h.c.booms.length, 1)
  // by a bullet: she hops
  h = hinder('bullet')
  assert.equal(h.pushes.length, 1)
  assert.ok(Math.abs(-h.pushes[0].vy - A.actLerp(A.SOUL_ACT.bounce.lift, h.f.act.force)) < 1e-9 && Math.abs(h.pushes[0].vx) <= A.SOUL_ACT.bounce.side)
  // by an arrow: her aim sways for a moment, never wider than it says
  h = hinder('arrow')
  assert.equal(h.pushes.length, 0)
  let most = 0
  const T = A.actLerp(A.SOUL_ACT.aim.time, h.f.act.force)
  for (let t = 0; t < T - 0.05; t += 0.016) { most = Math.max(most, Math.abs(h.c.aimSkew)); step(h.c, h.her) }
  assert.ok(most > 0.05 && most <= A.actLerp(A.SOUL_ACT.aim.deg, h.f.act.force) * Math.PI / 180 + 1e-9, String(most))
  run(h.c, h.her, 0.2)
  assert.equal(h.c.aimSkew, 0, 'and it passes')
  // by a blow: a peck knocks her away and her item does not answer for a moment
  h = hinder('impact', 'pistol')
  assert.equal(h.pushes.length, 1)
  assert.ok(h.pushes[0].vy < 0)
  step(h.c, h.her, { fire: true, firePressed: true })
  assert.equal(h.c.bullets.length, 0, 'locked')
  run(h.c, h.her, A.actLerp(A.SOUL_ACT.peck.lock, h.f.act.force))
  step(h.c, h.her, { fire: true, firePressed: true })
  assert.equal(h.c.bullets.length, 1)
})

test('a soul from outside the key sings out of tune: her notes go off for a while', () => {
  const { c, her, notes } = world('flute')
  const f = free(c, { note: 'outside', rarity: 'rare' })
  f.act = { ...f.act, chance: 1 }
  assert.equal(c.detune, 0)
  holdSoul(f, 160, -200); step(c, her)
  assert.equal(Math.abs(c.detune), A.SOUL_ACT.detune.semis)
  assert.equal(f.job, null, 'from where it is')
  f.act = { ...f.act, chance: 0, help: 'none' }
  notes.length = 0
  step(c, her, { fire: true, firePressed: true })
  const b = c.bullets.find(o => o.note)
  assert.ok(b, 'a note flies')
  assert.equal(Math.abs(b.note.midi % 1), 0.5, 'the note itself is off')
  assert.ok(notes.some(n => Math.abs(n.midi % 1) === 0.5), 'and so is its sound')
  run(c, her, A.actLerp(A.SOUL_ACT.detune.time, f.act.force) + 0.1)
  assert.equal(c.detune, 0)
})

test('a living soul in the key never hinders; a sheet changed by the admin reaches the souls already out', () => {
  const { c, her } = world()
  const pushes = actor(c, her)
  const f = free(c, { shot: 'keys' })
  for (let i = 0; i < 40; i++) { f.clock.in = 0.001; step(c, her) }
  assert.equal(f.job, null); assert.equal(pushes.length, 0); assert.equal(c.detune, 0)
  try {
    L.setSoulEntries(L.changeEntry(L.SOUL_ENTRIES, 'jelly.alive.keys', e => ({ ...e, act: { help: 'sing', hinder: 'bounce', chance: 1, force: 1 } })))
    c.refreshSouls()
    assert.deepEqual({ help: f.act.help, hinder: f.act.hinder, chance: f.act.chance }, { help: 'sing', hinder: 'bounce', chance: 1 })
    f.clock.in = 0.001; step(c, her)
    assert.equal(f.job?.kind, 'bounce')
    for (let i = 0; i < 300 && f.job; i++) step(c, her)
    assert.equal(-pushes[0].vy, A.SOUL_ACT.bounce.lift[1])
  } finally { L.setSoulEntries(L.SOUL_ENTRIES) }
  c.refreshSouls()
  assert.equal(f.act.help, 'step')
  // caught by a Passaguá or its owner gone: whatever it was doing ends
  const g = free(c, { state: 'dead', weapon: 'blast' })
  g.act = { ...g.act, chance: 1 }
  holdSoul(g, 400, -300); step(c, her)
  assert.equal(g.job?.kind, 'push')
  c.use('p2'); c.use('p1'); c.drop('p2')
  assert.equal(g.job?.kind, 'push', "another player's leaving is not its business")
})
