// The Boomerang (two of them, one in each wing, thrown like the hammer with no shock) and the decks of cards
// (lib/pigchicken/cards.ts): the order of the deck, the cards floating where they were thrown, their bursts (damage
// or the note they kept), the chains, the way back to their owner and the same through the online Pátio.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS, DECK_IDS, MAGIC_IDS, SPORTS_IDS, RACK_ITEM_IDS, isStaff, itemsFileProblem, itemsDefaultsFile } = loadTs('lib/pigchicken/items.ts')
const { itemGroup } = loadTs('lib/pigchicken/inventory.ts')
const K = loadTs('lib/pigchicken/cards.ts')
const N = loadTs('lib/pigchicken/net-world.ts')
const { heldItemPose } = loadTs('lib/pigchicken/held-pose.ts')

const DT = 0.01
const still = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, body = still) {
  c.step(DT, body, { x: body.x, y: body.y }, { x: body.x, y: body.y }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: body.x, y: body.y } })
}
const run = (c, s, input = {}, body = still) => { for (let t = 0; t < s - 1e-9; t += DT) step(c, input, 0, body) }
// the item in her wing and the notes it played (voice, midi)
function holding(item, change = () => {}) {
  const set = structuredClone(DEFAULT_ITEMS)
  change(set[item])
  const c = createCombat(), played = []
  c.setMusicOut({ note: (voice, midi) => played.push({ voice, midi }), hold: () => null, drum: () => {} })
  c.setItems(set); c.give(item); step(c, { slot: 1 })
  return { c, d: set[item], played }
}
const alien = (c, x, y = 15, hp = 500) => { const t = { id: 900 + c.targets.length, kind: 'alien', home: 0, x, y, w: 40, h: 30, hp, maxHp: hp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'fly', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#c77dff' } }; c.targets.push(t); return t }
// one card thrown to (x, y) and flown until it stops (or bursts)
function card(c, x, y = 0) {
  c.setAimPoint({ x, y })
  step(c, { fire: true, firePressed: true }); step(c)
  run(c, 1.2)
}

test('the Boomerang is a sports staff with no shock that goes further than the hammer; the decks are magic, the blue one in music', () => {
  assert.ok(SPORTS_IDS.includes('boomerang'))
  assert.deepEqual(DECK_IDS, ['cardsRed', 'cardsBlue'])
  for (const id of ['boomerang', ...DECK_IDS]) {
    const d = DEFAULT_ITEMS[id]
    assert.ok(isStaff(d) && d.returnThrow && d.mag === 0, id)
    assert.ok(RACK_ITEM_IDS.includes(id), id)
    assert.ok(d.shockRange === 0 && d.specialCooldown === 0, `${id}: no lightning`)
  }
  for (const id of DECK_IDS) assert.ok(MAGIC_IDS.includes(id) && DEFAULT_ITEMS[id].deck && DEFAULT_ITEMS[id].returnCount === 14 && DEFAULT_ITEMS[id].explodeRadius > 0, id)
  const b = DEFAULT_ITEMS.boomerang
  assert.equal(b.returnCount, 2); assert.equal(b.deck, false)
  assert.ok(b.returnRange > DEFAULT_ITEMS.mjolnir.returnRange, 'further than the hammer')
  assert.equal(DEFAULT_ITEMS.mjolnir.returnCount, 1)
  assert.equal(itemGroup('boomerang', false), 2); assert.equal(itemGroup('cardsRed', false), 2)
  assert.equal(DEFAULT_ITEMS.cardsRed.instrument, false); assert.equal(DEFAULT_ITEMS.cardsBlue.instrument, true)
  assert.ok(DEFAULT_ITEMS.cardsRed.deckLeash > DEFAULT_ITEMS.cardsRed.returnRange, 'a card thrown as far as it goes still stays')
  const file = itemsDefaultsFile(DEFAULT_ITEMS)
  for (const k of ['returnCount', 'deckLeash', 'deckBig', 'deckTouch', 'deckGap']) assert.ok(k in file.cardsRed, k)
  assert.equal(itemsFileProblem(file), null)
  assert.notEqual(itemsFileProblem({ boomerang: { returnCount: 99 } }), null)
})

test('two Boomerangs, one in each wing: the second leaves while the first is away, and nothing more until one is back', () => {
  const { c, d } = holding('boomerang')
  const o = c.held
  assert.equal(c.inHand(o), 2)
  assert.equal(heldItemPose(c, 0, null, 1).off, true, 'the second one is in the back wing')
  const toss = () => { step(c, { fire: true, firePressed: true }); step(c) }
  toss()
  assert.equal(c.flights.length, 1); assert.equal(o.out, 1); assert.ok(!o.flying)
  assert.equal(c.inHand(o), 1)
  const pose = heldItemPose(c, 0, null, 1)
  assert.ok(pose && !pose.off, 'one left, in her wing')
  // she still hits with the one she has, but the item itself is not thrown away
  step(c, { throwHeld: true }); assert.equal(c.throwCharge, 0, 'no Arremesso with one away')
  step(c, { melee: true }); assert.ok(c.swing, 'Golpe with the one in her wing')
  run(c, 0.05)
  toss()
  assert.equal(c.flights.length, 2); assert.equal(o.out, 2); assert.equal(o.flying, true)
  assert.equal(heldItemPose(c, 0), null, 'both away: her wings are empty')
  toss()
  assert.equal(c.flights.length, 2, 'a third one does not exist')
  step(c, { melee: true }); run(c, 0.02)
  for (let i = 0; i < 600 && c.flights.length; i++) step(c)
  assert.equal(c.flights.length, 0, 'both came back'); assert.equal(o.out, 0); assert.ok(!o.flying)
  assert.equal(heldItemPose(c, 0, null, 1).off, true)
  assert.equal(d.returnCount, 2)
})

test('the Boomerang in flight hurts and pushes whoever it crosses, with no shock at all', () => {
  const { c, d } = holding('boomerang', d => { d.returnCurveMin = 0 })
  const t = alien(c, 200), side = alien(c, 320)
  step(c, { fire: true, firePressed: true }); step(c)
  for (let i = 0; i < 600 && c.flights.length; i++) step(c)
  assert.ok(t.hp < 500 && side.hp < 500)
  assert.equal(t.hp, 500 - d.returnDamage * 0.5, 'a tap: half the damage, once (it flies back over her chest, above it)')
  assert.equal(t.shock, undefined); assert.equal(c.bolts.length, 0); assert.equal(c.skyFlash, 0)
  assert.ok(!c.sounds.some(s => s.kind === 'zap' || s.kind === 'thunder'))
  // Golpe with it is a plain blow too
  const near = alien(c, 60)
  step(c, { melee: true }); run(c, 0.12)
  assert.equal(near.hp, 500 - d.meleeDamage); assert.equal(near.shock, undefined)
})

test('the deck throws its cards in order from the Coringa to the Ás, skipping the ones that are away', () => {
  assert.deepEqual([...K.CARD_RANKS], ['★', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'])
  assert.equal(K.CARD_NAMES[0], 'Coringa'); assert.equal(K.CARD_NAMES[13], 'Ás'); assert.equal(K.DECK_SIZE, 14)
  assert.deepEqual(K.CARD_RANKS.map((_, i) => K.burstsAlone(i)).flatMap((b, i) => (b ? [K.CARD_RANKS[i]] : [])), ['7', 'A'], 'the seventh and the fourteenth')
  assert.equal(K.nextCard(0, []), 0)
  assert.equal(K.nextCard(3, [3, 4]), 5)
  assert.equal(K.nextCard(13, [13]), 0, 'round the deck')
  assert.equal(K.nextCard(14, []), 0)
  assert.equal(K.nextCard(0, K.CARD_RANKS.map((_, i) => i)), null, 'every card is away')
  // the reticle's place, no further than the deck reaches
  assert.deepEqual(K.cardSpot(0, 0, 0, 300, 800), { x: 300, y: 0 })
  assert.deepEqual(K.cardSpot(0, 0, 0, 5000, 800), { x: 800, y: 0 })
  assert.ok(K.cardTouches(0, 0, 26, { l: 20, r: 60, t: -15, b: 15 }) && !K.cardTouches(0, 0, 26, { l: 40, r: 80, t: -15, b: 15 }))
})

test('a card flies to where she aims and floats there; the deck shows the next one', () => {
  const { c, d } = holding('cardsRed')
  const o = c.held
  assert.equal(c.nextCard(o), 0, 'the Coringa first')
  assert.equal(c.predictReturn({ x: 0, y: 0 }, { boxes: [], groundY: 1000 }), null, 'no path to draw')
  c.setAimPoint({ x: 300, y: -120 })
  step(c, { fire: true, firePressed: true })
  assert.equal(c.cards.length, 1, 'a press throws it at once'); assert.equal(c.swing, null)
  assert.equal(c.cards[0].phase, 'out'); assert.equal(c.cards[0].rank, 0)
  step(c); run(c, 1)
  const k = c.cards[0]
  assert.equal(k.phase, 'park')
  assert.ok(Math.hypot(k.x - 300, k.y + 120) < 1, `${k.x}, ${k.y}`)
  assert.equal(o.out, 1); assert.ok(!o.flying); assert.equal(c.nextCard(o), 1)
  assert.ok(heldItemPose(c, 0), 'the deck is still in her wing')
  run(c, 3)
  assert.equal(c.cards.length, 1, 'it stays while she is near')
  // the aim further than the deck reaches: the card stops at its reach
  card(c, 5000, 0)
  assert.ok(Math.abs(c.cards[1].x - d.returnRange) < 1 && c.cards[1].rank === 1)
  // a wall stops it short
  const w = holding('cardsRed')
  w.c.setAimPoint({ x: 400, y: 0 })
  const wall = [{ l: 200, t: -200, r: 240, b: 200 }], idle = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
  w.c.step(DT, still, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { ...idle, fire: true, firePressed: true }, wall, 1000, () => {})
  for (let i = 0; i < 100; i++) w.c.step(DT, still, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, idle, wall, 1000, () => {})
  assert.ok(w.c.cards[0].phase === 'park' && w.c.cards[0].x < 200 && w.c.cards[0].x > 180, `${w.c.cards[0].x}`)
  // held, one card every interval
  const h = holding('cardsRed', d => { d.deckGap = 0.2 })
  h.c.setAimPoint({ x: 300, y: -300 })
  step(h.c, { fire: true, firePressed: true }); run(h.c, 0.5, { fire: true })
  assert.equal(h.c.cards.length, 3)
})

test('a red card bursts when someone touches it: damage that fades to the edge, a push, and the card is back in the deck', () => {
  const { c, d } = holding('cardsRed')
  const o = c.held
  card(c, 300, 0)
  assert.equal(c.cards.length, 1)
  const far = alien(c, 300 + d.explodeRadius + 60)
  run(c, 0.2)
  assert.equal(c.cards.length, 1, 'nobody touches it')
  const t = alien(c, 320)
  step(c)
  assert.equal(c.cards.length, 0, 'it burst')
  assert.ok(t.hp < 500 && t.hp >= 500 - d.explodeDamage)
  assert.equal(far.hp, 500, 'out of the burst')
  assert.ok(c.booms.some(b => b.r === d.explodeRadius)); assert.ok(c.sounds.some(s => s.kind === 'explode'))
  assert.ok(t.blast && t.blast.vx > 0, 'pushed away from it')
  assert.equal(o.out, 0)
  // someone on its way bursts it before it arrives
  const w = holding('cardsRed')
  const mid = alien(w.c, 150)
  card(w.c, 400, 0)
  assert.equal(w.c.cards.length, 0); assert.ok(mid.hp < 500)
})

test('the players touch it too, but never the one who threw it nor a chick', () => {
  const { c } = holding('cardsRed')
  const box = x => ({ l: x - 45, r: x + 45, t: -200, b: 0 })
  card(c, 300, -50)
  const pushed = []
  c.setBlastActors([{ id: 'p1', box: box(300), push: () => pushed.push('p1') }, { box: box(300), push: () => pushed.push('chick') }])
  run(c, 0.1)
  assert.equal(c.cards.length, 1, 'her own body and a chick do not set it off')
  c.setBlastActors([{ id: 'p1', box: box(0), push: () => {} }, { id: 'p2', box: box(300), push: () => pushed.push('p2') }])
  step(c)
  assert.equal(c.cards.length, 0); assert.deepEqual(pushed, ['p2'], 'the other player is pushed')
  // online, another browser's chicken
  const n = holding('cardsRed')
  card(n.c, 300, -50)
  n.c.setNetBodies([{ x: 300, y: 0 }]); step(n.c)
  assert.equal(n.c.cards.length, 0)
})

test('a blue card keeps the note she aimed at and plays it only when it bursts, giving harmony instead of damage', () => {
  const { c, d, played } = holding('cardsBlue')
  played.length = 0
  c.setAimPoint({ x: 300, y: 0 })
  step(c, { fire: true, firePressed: true }, -0.6); step(c, {}, -0.6)
  const k = c.cards[0]
  assert.ok(k.note && Number.isFinite(k.note.midi), 'it keeps a note')
  assert.equal(played.filter(p => p.voice === d.voice).length, 0, 'silent when thrown')
  for (let i = 0; i < 120; i++) step(c, {}, 0.9)
  assert.equal(c.cards[0].note.midi, k.note.midi, 'the aim moving later does not change it')
  // another one, thrown aiming somewhere else, keeps another note
  step(c, { fire: true, firePressed: true }, 1.2); step(c, {}, 1.2)
  assert.notEqual(c.cards[1].note.midi, k.note.midi)
  for (let i = 0; i < 120; i++) step(c)
  const t = alien(c, 320)
  step(c)
  run(c, 0.3)
  assert.equal(c.cards.length, 0, 'both burst (the second one in the first one’s chain)')
  assert.ok(played.some(p => p.voice === d.voice && p.midi === k.note.midi), 'it plays its note')
  assert.equal(t.hp, 500, 'no damage')
  assert.ok(t.harmony > 0 && t.harmony <= d.explodeDamage * 2)
  assert.ok(t.blast && t.blast.vx > 0, 'and pushes a little')
  assert.ok(c.booms.some(b => b.color === k.note.color))
})

test('the 7 and the Ás burst on their own when they arrive, wider, and a burst sets off the cards it reaches, in a chain', () => {
  const { c, d } = holding('cardsRed', d => { d.deckGap = 0.05 })
  const o = c.held
  // six cards in a row, each inside the next one's burst, and one far from them all
  for (let i = 0; i < 5; i++) card(c, 200 + i * (d.explodeRadius - 10), -300)
  card(c, 200, 300)
  assert.equal(c.cards.length, 6); assert.ok(c.cards.every(k => k.phase === 'park'))
  assert.equal(c.nextCard(o), 6, 'the 7 is next')
  // the 7 lands beside the first of the row: it bursts by itself, wider than the others
  c.setAimPoint({ x: 200 - d.explodeRadius * d.deckBig + 20, y: -300 })
  step(c, { fire: true, firePressed: true }); step(c)
  let alone = false
  for (let i = 0; i < 200 && !alone; i++) { step(c); alone = c.booms.some(b => b.r === d.explodeRadius * d.deckBig) }
  assert.ok(alone, 'the 7 burst with nobody near, in the wide radius')
  assert.equal(c.cards.filter(k => k.fuse !== undefined).length, 1, 'only the first of the row is in its reach')
  // the row goes off one after the other
  const left = []
  for (let i = 0; i < 60; i++) { step(c); left.push(c.cards.length) }
  assert.ok(left.includes(5) && left.includes(4) && left.includes(3) && left.includes(2), `one at a time: ${[...new Set(left)]}`)
  assert.equal(c.cards.length, 1, 'the far one stays')
  assert.ok(c.cards[0].y > 200)
  assert.equal(o.out, 1)
  // the Ás too
  const a = holding('cardsRed')
  a.c.held.next = 13
  card(a.c, 300, -100)
  assert.equal(a.c.cards.length, 0); assert.ok(a.c.booms.length || a.c.sounds.some(s => s.kind === 'explode'))
  assert.equal(a.c.nextCard(a.c.held), 0, 'after the Ás, the Coringa again')
})

test('with every card of the limit away the deck waits; the cards that come back or burst are thrown again in order', () => {
  const { c, d } = holding('cardsRed', d => { d.returnCount = 3; d.deckGap = 0.05 })
  const o = c.held
  for (let i = 0; i < 3; i++) card(c, 200 + i * 150, -400)
  assert.equal(c.cards.length, 3); assert.equal(o.flying, true)
  assert.equal(c.nextCard(o), null)
  assert.equal(heldItemPose(c, 0), null, 'her wing is empty')
  card(c, 100, -400)
  assert.equal(c.cards.length, 3, 'nothing more to throw')
  step(c, { melee: true }); assert.equal(c.swing, null, 'and nothing to hit with')
  // one bursts: it is in the deck again, and the order goes on from where it was (the 4)
  alien(c, 200, -385); step(c)
  assert.equal(c.cards.length, 2); assert.ok(!o.flying); assert.equal(c.nextCard(o), 3)
  assert.equal(d.returnCount, 3)
})

test('she goes too far: the cards fly back to her without bursting, unless they meet someone on the way', () => {
  const { c, d } = holding('cardsRed')
  const o = c.held
  card(c, 300, -90); card(c, 500, -90)
  assert.equal(c.cards.length, 2)
  // near enough: they stay
  const near = { ...still, x: 300 - d.deckLeash + 250 }
  run(c, 0.3, {}, near)
  assert.ok(c.cards.every(k => k.phase === 'park'))
  // past the leash of the far one only
  const mid = { ...still, x: 500 - d.deckLeash - 40 }
  step(c, {}, 0, mid)
  assert.deepEqual(c.cards.map(k => k.phase), ['park', 'back'])
  for (let i = 0; i < 300 && c.cards.length > 1; i++) step(c, {}, 0, mid)
  assert.equal(c.cards.length, 1, 'it arrived'); assert.equal(o.out, 1)
  assert.ok(!c.booms.length, 'without bursting')
  assert.ok(c.sounds.some(s => s.kind === 'catch'))
  // the other one, called back, meets someone on its way
  const far = { ...still, x: 300 - d.deckLeash - 400 }
  const t = alien(c, 0, -75)
  for (let i = 0; i < 300 && c.cards.length; i++) step(c, {}, 0, far)
  assert.equal(c.cards.length, 0); assert.ok(t.hp < 500, 'it burst on the one in its way'); assert.equal(o.out, 0)
  // the card that came back is thrown again when its turn comes
  assert.equal(c.nextCard(o), 2)
})

test('her deck goes with her to another Pátio from the card it was at, with every card in it', () => {
  const { c } = holding('cardsRed')
  card(c, 300, -200); card(c, 400, -200)
  const carry = c.exportCarry()
  const kept = carry.p1.inv[0]
  assert.equal(kept.item, 'cardsRed'); assert.equal(kept.next, 2)
  assert.equal(kept.out, undefined); assert.equal(kept.flying, undefined)
})

test('online: the cards of another browser show here, burst here when they burst there and set off the cards they reach', () => {
  const items = DEFAULT_ITEMS
  assert.deepEqual(N.cleanShot({ k: 'cd', i: 'cardsBlue', c: 7, r: 99, x: 0, y: 0, tx: 100, ty: 0, sp: 99999, col: '#ff0000' }, items), { k: 'cd', i: 'cardsBlue', c: 7, r: 13, x: 0, y: 0, tx: 100, ty: 0, sp: 4000, col: '#ff0000' })
  assert.equal(N.cleanShot({ k: 'cd', i: 'cardsRed', c: 7, r: 1, x: 0, y: 0, tx: 'a', ty: 0, sp: 900 }, items), null)
  assert.deepEqual(N.cleanShot({ k: 'cb', i: 'cardsRed', c: 7 }, items), { k: 'cb', i: 'cardsRed', c: 7 })
  assert.deepEqual(N.cleanShot({ k: 'cx', i: 'cardsRed', c: 7, x: 1, y: 2, rd: 99999 }, items), { k: 'cx', i: 'cardsRed', c: 7, x: 1, y: 2, rd: 1000 })
  assert.equal(N.cleanShot({ k: 'cx', i: 'cardsRed', c: 7, x: 1, y: 2 }, items), null)
  // what a throw, a way back and a burst send
  const { c, d } = holding('cardsRed')
  c.setNetOn(true)
  card(c, 300, -200)
  const sent = c.netShots.find(s => s.k === 'cd')
  assert.ok(sent && sent.r === 0 && sent.tx === 300 && sent.ty === -200)
  alien(c, 300, -185); step(c)
  const burst = c.netShots.find(s => s.k === 'cx')
  assert.ok(burst && burst.c === sent.c && burst.rd === d.explodeRadius)
  // the other browser: the card flies and floats, with no damage of its own
  const o = holding('cardsRed')
  const t = alien(o.c, 300, -185)
  o.c.addRemoteShots([N.cleanShot(sent, items)])
  run(o.c, 1)
  assert.equal(o.c.cards.length, 1); assert.equal(o.c.cards[0].phase, 'park'); assert.equal(o.c.cards[0].remote, true)
  assert.equal(t.hp, 500, 'touching it here does nothing')
  // a card of this browser floating beside it goes off with its burst
  o.c.targets.length = 0
  card(o.c, 300 + d.explodeRadius - 20, -200)
  assert.equal(o.c.cards.length, 2)
  o.c.addRemoteShots([N.cleanShot(burst, items)])
  assert.equal(o.c.cards.filter(k => k.remote).length, 0, 'gone with its burst')
  assert.ok(o.c.booms.length)
  run(o.c, 0.3)
  assert.equal(o.c.cards.length, 0, 'the local one burst in its chain')
  // sent back, it leaves
  o.c.addRemoteShots([N.cleanShot(sent, items)]); run(o.c, 1)
  o.c.addRemoteShots([{ k: 'cb', i: 'cardsRed', c: sent.c }]); run(o.c, 2)
  assert.equal(o.c.cards.length, 0)
})
