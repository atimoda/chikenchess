const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const S = loadTs('lib/pigchicken/souls.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10]

test('the species of a soul comes from the alien it was', () => {
  assert.equal(S.soulSpecies({ kind: 'alien', color: '#fff' }), 'horde', "the rows' aliens")
  assert.equal(S.soulSpecies({ kind: 'temple', species: 'jelly' }), 'jelly')
  assert.equal(S.soulSpecies({ kind: 'temple', species: 'dragonHead' }), 'dragon', "the dragon's head is the dragon")
  assert.equal(S.soulSpecies({ kind: 'temple', species: 'nope' }), 'horde')
  assert.equal(S.soulSpecies({ kind: 'temple', species: 'chick' }), 'horde', 'no alien is a chick')
  assert.equal(S.soulSpecies(undefined), 'horde')
})

test('the instrument that finished it gives its class; without the item, the voice of the note does', () => {
  for (const [item, shot] of [['flute', 'wind'], ['sax', 'wind'], ['trumpet', 'wind'], ['guitar', 'strings'], ['violin', 'strings'], ['harp', 'strings'], ['keys', 'keys'], ['tambourine', 'percussion'], ['rebate', 'rebate']])
    assert.equal(S.shotClass(item), shot, item)
  assert.equal(S.shotClass('rebate', 'bells'), 'rebate', 'a rebated note is a rebate whatever it sounds like')
  assert.equal(S.shotClass(null, 'pizz'), 'strings', 'the violin plucked')
  assert.equal(S.shotClass(null, 'bells'), 'percussion')
  assert.equal(S.shotClass(null, 'chip'), null)
  assert.equal(S.shotClass(null), null)
})

test('the note in the key: tonic, consonant, tension, leading or outside', () => {
  const C = 60
  assert.equal(S.noteClass(72, C, MAJOR), 'tonic', 'any octave')
  assert.equal(S.noteClass(64, C, MAJOR), 'consonant', 'the third')
  assert.equal(S.noteClass(55, C, MAJOR), 'consonant', 'the fifth, below the root')
  assert.equal(S.noteClass(63, C, MINOR), 'consonant', 'the minor third')
  for (const m of [62, 65, 69]) assert.equal(S.noteClass(m, C, MAJOR), 'tension', String(m))
  assert.equal(S.noteClass(71, C, MAJOR), 'leading')
  assert.equal(S.noteClass(70, C, MINOR), 'leading', "the minor's seventh")
  assert.equal(S.noteClass(61, C, MAJOR), 'outside')
  assert.equal(S.noteClass(63, C, MAJOR), 'outside', 'the minor third in major')
  assert.equal(S.noteClass(63.5, C, MINOR), 'outside', 'a quarter tone off (a blue note)')
  assert.equal(S.noteClass(60.1, C, MAJOR), 'tonic', 'a little bend is still the note')
})

test('the weapon that killed it; rarity adds the points of each axis', () => {
  for (const [item, w] of [['launcher', 'blast'], ['grenade', 'blast'], ['pistol', 'bullet'], ['pump', 'bullet'], ['sniper', 'bullet'], ['bow', 'arrow'], ['bat', 'impact'], ['wing', 'impact'], [null, 'impact']])
    assert.equal(S.weaponClass(item), w, String(item))
  assert.deepEqual(S.originOf('jelly', 'alive', { shot: 'wind', note: 'tonic', weapon: 'bullet' }), { species: 'jelly', state: 'alive', shot: 'wind', note: 'tonic', weapon: null }, 'a living one was never killed')
  assert.equal(S.originOf('jelly', 'dead').weapon, 'impact', 'unknown: a blow')
  const r = (species, state, note) => S.soulRarity(S.originOf(species, state, { note }))
  assert.equal(r('jelly', 'alive', 'tonic'), 'common')
  assert.equal(r('jelly', 'alive', 'consonant'), 'common')
  assert.equal(r('jelly', 'alive', 'tension'), 'uncommon')
  assert.equal(r('jelly', 'dead', 'tonic'), 'uncommon')
  assert.equal(r('jelly', 'alive', 'leading'), 'rare')
  assert.equal(r('jelly', 'alive', 'outside'), 'rare')
  assert.equal(r('dragon', 'alive', 'tonic'), 'rare')
  assert.equal(r('dragon', 'alive', 'leading'), 'legendary')
  assert.equal(r('lantern', 'dead', 'outside'), 'legendary')
  assert.equal(r('chick', 'alive', null), 'common')
})

test('abductions leave one after the other and arrive in the order they were caught', () => {
  const soul = id => S.newSoul(id, S.originOf('horde', 'alive'), '#fff', null)
  const list = [0, 1, 2].map(i => ({ soul: soul(i + 1), owner: 'p1', x: 0, y: 0, t: -i * S.ABDUCT_GAP }))
  const arrived = []
  for (let t = 0; t < 1; t += 0.01) arrived.push(...S.stepAbductions(list, 0.01).map(a => [a.soul.id, Math.round(t * 100) / 100]))
  assert.deepEqual(arrived.map(a => a[0]), [1, 2, 3])
  assert.ok(arrived[1][1] - arrived[0][1] >= S.ABDUCT_GAP - 0.011 && arrived[2][1] > arrived[1][1], 'spaced out')
  assert.equal(list.length, 0)
  const from = { x: 100, y: 500 }, to = { x: 900, y: 80 }
  assert.deepEqual(S.abductPoint(from, to, 0), { x: 100, y: 500, scale: 1 })
  const end = S.abductPoint(from, to, 1)
  assert.ok(Math.abs(end.x - 900) < 1e-9 && Math.abs(end.y - 80) < 1e-9 && end.scale < 0.5, 'small, at the counter')
  assert.ok(S.abductPoint(from, to, 0.3).y < 500, 'pulled up first')
  assert.deepEqual(S.abductPoint(from, to, -1), S.abductPoint(from, to, 0), 'waiting, it stays where it was caught')
})

// ---------- in the combat ----------
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
  if (item) { c.give(item); step(c, { slot: 1 }) }
  return c
}
const alien = (c, hp = 1, data = { kind: 'temple', species: 'jelly', color: '#c77dff' }) => c.targets.push({ id: 900 + c.targets.length, kind: 'alien', home: 0, x: 200, y: 15, w: 40, h: 30, hp, maxHp: hp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'hold', animT: 0, data })
// the Passaguá sweeps in front of her: `hold` puts the bird there before every step
function sweep(c, hold, slot) {
  step(c, { slot })
  for (let i = 0; i < 40; i++) { hold(); step(c, { melee: i === 0 }) }
}
const holdCritter = b => () => { b.x = 40; b.y = 0; b.vx = 0; b.vy = 0; b.homeX = 40; b.homeY = 0 }
const land = c => { for (let t = 0; t < S.ABDUCT_TIME + 0.4; t += 0.016) step(c) }

test('a bird made by the flute is a living soul that remembers the alien, the instrument and the note', () => {
  const c = world('flute')
  alien(c)
  for (let i = 0; i < 20 && !c.critters.length; i++) step(c, { fire: true, firePressed: i % 2 === 0 })
  const bird = c.critters[0]
  assert.ok(bird, 'it became a bird')
  assert.equal(bird.soul.species, 'jelly')
  assert.equal(bird.soul.state, 'alive')
  assert.equal(bird.soul.shot, 'wind')
  assert.ok(['tonic', 'consonant', 'tension', 'leading'].includes(bird.soul.note), 'a note of the key')
  assert.equal(bird.soul.weapon, null)

  c.give('passagua')
  const slot = c.inventory.findIndex(o => o && o.item === 'passagua') + 1
  step(c, { slot })
  let caughtAt = -1
  for (let i = 0; i < 40; i++) {
    holdCritter(bird)(); step(c, { melee: i === 0 })
    if (caughtAt < 0 && c.abductions.length) { caughtAt = i; assert.equal(c.capturedSouls, 0, 'it only counts when it gets to the counter'); assert.equal(c.critters.length, 0) }
  }
  assert.ok(caughtAt >= 0, 'the Passaguá caught it')
  assert.ok(!c.texts.some(t => /alma/.test(t.text)), 'no "+1 alma" text: the flight and the counter say it')
  land(c)
  assert.equal(c.abductions.length, 0)
  assert.equal(c.capturedSouls, 1)
  const soul = c.basket[0]
  assert.deepEqual({ species: soul.species, state: soul.state, shot: soul.shot, weapon: soul.weapon }, { species: 'jelly', state: 'alive', shot: 'wind', weapon: null })
  assert.equal(soul.note, bird.soul.note)
  assert.equal(soul.color, '#c77dff', "the alien's colour")
  assert.equal(soul.bird, bird.bird, 'the bird it flew as')
  assert.equal(soul.rarity, S.soulRarity(soul))
})

test('the counter swells when a soul arrives and settles again', () => {
  const c = world('flute')
  alien(c)
  for (let i = 0; i < 20 && !c.critters.length; i++) step(c, { fire: true, firePressed: i % 2 === 0 })
  c.give('passagua')
  const slot = c.inventory.findIndex(o => o && o.item === 'passagua') + 1
  assert.equal(c.soulPulse, 0)
  step(c, { slot })
  let peak = 0
  for (let i = 0; i < 80; i++) { holdCritter(c.critters[0] ?? {})(); step(c, { melee: i === 0 }); peak = Math.max(peak, c.soulPulse); if (c.capturedSouls && peak === 0) assert.fail('no swell on arrival') }
  assert.ok(peak > 0.8 && peak <= 1, 'it swelled')
  for (let t = 0; t < S.SOUL_PULSE + 0.1; t += 0.016) step(c)
  assert.equal(c.soulPulse, 0)
})

test('an alien shot down and brought back by notes is a dead soul that remembers the weapon', () => {
  const random = Math.random
  Math.random = () => 0.5
  const c = world('flute')
  alien(c)
  c.targets[0].hp = 0.0001
  c.give('pistol'); step(c, { slot: 2 })
  step(c, { fire: true, firePressed: true })
  for (let t = 0; t < 3; t += 0.016) step(c)
  const u = c.undead[0]
  Math.random = random
  assert.equal(u.soul.weapon, 'bullet')
  step(c, { slot: 1 })
  for (let i = 0; i < 40 && !u.data.bird; i++) step(c, { fire: true, firePressed: i % 2 === 0 }, Math.atan2(30, 200))
  assert.ok(u.data.bird, 'an undead bird')
  assert.equal(u.soul.shot, 'wind')

  c.give('passagua')
  const slot = c.inventory.findIndex(o => o && o.item === 'passagua') + 1
  sweep(c, () => { u.x = 40; u.y = u.h / 2; u.data.homeX = 40; u.data.homeY = 0; u.data.t = 0 }, slot)
  land(c)
  assert.equal(c.capturedSouls, 1)
  const soul = c.basket[0]
  assert.deepEqual({ species: soul.species, state: soul.state, shot: soul.shot, weapon: soul.weapon }, { species: 'jelly', state: 'dead', shot: 'wind', weapon: 'bullet' })
  assert.equal(soul.color, u.data.eye, "the colour of the note that brought it back")
  assert.equal(soul.bird, u.data.bird)
  assert.notEqual(soul.rarity, 'common', 'a dead one is never common')
})

test('chicks are souls too; the basket is a stack and each player has their own', () => {
  const c = world('passagua')
  let gone = 0
  c.setCatchables([{ x: 40, y: 0, r: 20, catch: () => gone++ }])
  for (let i = 0; i < 40; i++) step(c, { melee: i === 0 })
  land(c)
  assert.equal(gone, 1)
  assert.equal(c.capturedSouls, 1)
  assert.deepEqual({ species: c.basket[0].species, state: c.basket[0].state, shot: c.basket[0].shot, note: c.basket[0].note }, { species: 'chick', state: 'alive', shot: null, note: null })
  assert.equal(c.basket[0].color, S.CHICK_SOUL_COLOR)

  // two at once: they count one after the other, the last one on top
  c.setCatchables([{ x: 40, y: 0, r: 20, catch: () => gone++ }, { x: 30, y: 10, r: 20, catch: () => gone++ }])
  const counts = []
  for (let i = 0; i < 80; i++) { step(c, { melee: i === 0 }); if (counts[counts.length - 1] !== c.capturedSouls) counts.push(c.capturedSouls) }
  assert.deepEqual(counts, [1, 2, 3], 'one at a time')
  assert.ok(c.basket[2].id > c.basket[1].id && c.basket[1].id > c.basket[0].id, 'the last one caught is on top')

  // the second player's catch goes to their own basket, even though the first player's step moves the world
  c.use('p2'); c.give('passagua'); step(c, { slot: 1 }, 0, false)
  c.setCatchables([{ x: 40, y: 0, r: 20, catch: () => gone++ }])
  for (let i = 0; i < 40; i++) { c.use('p2'); step(c, { melee: i === 0 }, 0, false); c.use('p1'); step(c) }
  land(c)
  assert.equal(c.abductions.length, 0)
  assert.equal(c.capturedSouls, 3, "the first player's")
  c.use('p2')
  assert.equal(c.capturedSouls, 1, "the second player's")
  assert.equal(c.basket[0].species, 'chick')
})

// ---------- let out of the basket: friends, and the Callback ----------
// n chicks caught, one sweep each
function basketOf(c, n) {
  for (let k = 0; k < n; k++) {
    c.setCatchables([{ x: 40, y: 0, r: 20, catch: () => {} }])
    for (let i = 0; i < 50; i++) step(c, { melee: i === 0 })
  }
  c.setCatchables([])
  land(c)
}
// keeps a soul flying free at (x, y), whatever its flight wants
const holdSoul = (f, x, y) => { Object.assign(f.brain, { x, y, ax: x, ay: y, vx: 0, vy: 0, mode: 'rest', settle: 0 }); f.x = x; f.y = y }

test('a press on the counter lets the last soul caught out where the counter is, and it flies with her', () => {
  const c = world('passagua')
  assert.equal(c.releaseSoul({ x: 0, y: 0 }), null, 'an empty basket: nothing')
  basketOf(c, 3)
  assert.equal(c.capturedSouls, 3)
  const top = c.basket[2]
  for (let t = 0; t < 1; t += 0.016) step(c)
  assert.equal(c.soulPulse, 0)
  assert.equal(c.releaseSoul({ x: 500, y: -400 }), top, 'the last one in is the first one out')
  assert.equal(c.capturedSouls, 2)
  assert.equal(c.looseSouls, 1)
  const f = c.freedSouls[0]
  assert.deepEqual({ soul: f.soul, owner: f.owner, x: f.x, y: f.y }, { soul: top, owner: 'p1', x: 500, y: -400 })
  assert.ok(c.soulPulse > 0.8, 'the counter answers the press')
  for (let t = 0; t < 8; t += 0.016) step(c)
  // a chick's soul keeps low and close to her (she stands at 0, 0)
  assert.ok(Math.abs(f.x) < 200 && f.y < -100 && f.y > -320, `beside and above her (${Math.round(f.x)}, ${Math.round(f.y)})`)
  assert.equal(c.freedSouls.length, 1, 'it stays')
})

test('with every soul out, a press calls them back: the nearest one first, one every 0.2 s', () => {
  const c = world('passagua')
  basketOf(c, 3)
  assert.equal(c.callSouls(), 0, 'none out: nothing to call')
  for (let i = 0; i < 3; i++) c.releaseSoul({ x: 300, y: -300 })
  assert.equal(c.capturedSouls, 0)
  assert.equal(c.looseSouls, 3)
  assert.equal(c.callSouls(), 0, 'a press right after letting the last one out does not call them back')
  for (let t = 0; t < 1; t += 0.016) step(c)
  const [far, near, mid] = c.freedSouls
  holdSoul(far, 500, -90); holdSoul(near, 100, -90); holdSoul(mid, 300, -90)
  assert.equal(c.callSouls(), 3)
  assert.equal(c.callSouls(), 0, 'already called')
  const left = []
  for (let t = 0; t < 2; t += 0.016) {
    step(c)
    for (const a of c.abductions) if (!left.some(l => l.id === a.soul.id)) left.push({ id: a.soul.id, t })
  }
  assert.deepEqual(left.map(l => l.id), [near.soul.id, mid.soul.id, far.soul.id])
  for (const i of [1, 2]) assert.ok(Math.abs(left[i].t - left[i - 1].t - 0.2) < 0.02, `0.2 s apart (${left[i].t - left[i - 1].t})`)
  assert.equal(c.looseSouls, 0)
  assert.equal(c.capturedSouls, 3, 'back in the basket')
  assert.equal(c.basket[2].id, far.soul.id, 'the last one to arrive is on top')
})

test("a soul flying free goes to the basket of whoever's Passaguá catches it", () => {
  const c = world('passagua')
  basketOf(c, 2)
  c.releaseSoul({ x: 40, y: 0 }); c.releaseSoul({ x: 40, y: 0 })
  const [one, other] = c.freedSouls
  c.use('p2'); c.give('passagua'); step(c, { slot: 1 }, 0, false); c.use('p1')
  // the second player sweeps where one of them is
  for (let i = 0; i < 50; i++) {
    holdSoul(one, 40, 0); holdSoul(other, -900, -500)
    c.use('p2'); step(c, { melee: i === 0 }, 0, false); c.use('p1'); step(c)
  }
  land(c)
  assert.equal(c.looseSouls, 1)
  assert.equal(c.capturedSouls, 0)
  c.use('p2')
  assert.equal(c.capturedSouls, 1)
  assert.equal(c.basket[0], one.soul, 'the same soul, in the other basket')
  assert.equal(c.looseSouls, 0, 'it is theirs now')
  c.use('p1')
  // and her own Passaguá puts the other one back in her basket
  for (let i = 0; i < 50; i++) { holdSoul(other, 40, 0); step(c, { melee: i === 0 }) }
  land(c)
  assert.equal(c.freedSouls.length, 0)
  assert.equal(c.capturedSouls, 1)
  assert.equal(c.basket[0], other.soul)
})

test('the souls of a player who left the game fly away', () => {
  const c = world()
  c.use('p2'); c.give('passagua'); step(c, { slot: 1 }, 0, false)
  c.setCatchables([{ x: 40, y: 0, r: 20, catch: () => {} }])
  for (let i = 0; i < 50; i++) { c.use('p2'); step(c, { melee: i === 0 }, 0, false); c.use('p1'); step(c) }
  land(c)
  c.use('p2')
  assert.ok(c.releaseSoul({ x: 0, y: -200 }))
  c.use('p1')
  for (let t = 0; t < 1; t += 0.016) step(c)
  const f = c.freedSouls[0], y = f.y
  c.drop('p2')
  for (let t = 0; t < 1; t += 0.016) step(c)
  assert.ok(f.y < y - 20, 'up')
  for (let t = 0; t < 5; t += 0.016) step(c)
  assert.equal(c.freedSouls.length, 0)
})

// ---------- the library: what is news, and how an entry flies ----------
test('only a soul caught from the wild is news for the library; let out, it flies as its entry does', () => {
  const c = world('passagua')
  basketOf(c, 2)
  const news = c.soulNews.splice(0)
  assert.equal(news.length, 2, 'each chick caught')
  assert.deepEqual(news.map(n => n.owner), ['p1', 'p1'])
  assert.deepEqual(news.map(n => n.soul), [...c.basket], 'the very souls that got to the basket')
  assert.ok(Math.abs(news[0].x - 40) < 1 && Math.abs(news[0].y) < 1, 'where it was caught')

  // let out and caught again with the Passaguá: the same soul, no news
  c.releaseSoul({ x: 40, y: 0 })
  const f = c.freedSouls[0]
  for (let i = 0; i < 50; i++) { holdSoul(f, 40, 0); step(c, { melee: i === 0 }) }
  land(c)
  assert.equal(c.capturedSouls, 2)
  assert.equal(c.soulNews.length, 0, 'it only came back')
  // called back: no news either
  c.releaseSoul({ x: 40, y: 0 })
  for (let t = 0; t < 0.6; t += 0.016) step(c)
  assert.equal(c.callSouls(), 1)
  land(c)
  assert.equal(c.capturedSouls, 2)
  assert.equal(c.soulNews.length, 0)

  // a keys soul escorts her; the same one killed by an arrow on the tonic is a rare one that patrols
  const keys = { id: 5000, species: 'shell', state: 'dead', shot: 'keys', note: 'tonic', weapon: 'bullet', rarity: 'uncommon', color: '#ffffff', bird: 'pardal' }
  c.basket.push(keys); c.releaseSoul({ x: 40, y: 0 })
  assert.equal(c.freedSouls[c.freedSouls.length - 1].params.pattern, 'orbit')
  c.basket.push({ ...keys, id: 5001, weapon: 'arrow' }); c.releaseSoul({ x: 40, y: 0 })
  assert.equal(c.freedSouls[c.freedSouls.length - 1].params.pattern, 'eight')
})

test('an admin changes a sheet: the souls already flying free take its numbers', () => {
  const L = loadTs('lib/pigchicken/soul-library.ts')
  const c = world('passagua')
  c.basket.push({ id: 5000, species: 'shell', state: 'dead', shot: 'keys', note: 'tonic', weapon: 'bullet', rarity: 'uncommon', color: '#ffffff', bird: 'pardal' })
  c.releaseSoul({ x: 40, y: 0 })
  const f = c.freedSouls[c.freedSouls.length - 1]
  assert.equal(f.params.pattern, 'orbit')
  try {
    L.setSoulEntries(L.changeEntry(L.SOUL_ENTRIES, 'shell.dead.keys', e => ({ ...e, cls: 'lazy', follow: { speed: 90 } })))
    assert.equal(f.params.pattern, 'orbit', 'not before it is told')
    c.refreshSouls()
    assert.equal(f.params.pattern, 'still'); assert.equal(f.params.speed, 90); assert.equal(f.params.leash, 1100)
    for (let i = 0; i < 30; i++) step(c)
    assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y), 'and goes on flying')
  } finally { L.setSoulEntries(L.SOUL_ENTRIES) }
  c.refreshSouls()
  assert.equal(f.params.pattern, 'orbit')
})
