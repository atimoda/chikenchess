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
