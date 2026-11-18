const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

// (a Filhote's body brings its column's inventory limits: one of each category by default)
const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0, species: 'chick', invLimits: [1, 1, 1] }
function step(c, input = {}, angle = 0, dt = 0.016) {
  c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
}
const items = c => c.inventory.filter(Boolean).map(o => o.item)

test('becoming a Filhote, every item and Gaiola falls around her, within the spread', () => {
  const c = createCombat()
  c.give('pistol'); c.give('sax'); c.give('rifle'); c.give('cage')
  step(c)
  assert.ok(items(c).length >= 3)
  c.setBaby('p1', true)
  c.dropAll(100)
  assert.deepEqual(items(c), [])
  assert.equal(c.held, null)
  assert.ok(c.pickups.length >= 3)
  for (const p of c.pickups) assert.ok(Math.abs(p.x - body.x) <= 100, `x ${p.x}`)
})

test('a Filhote holds one firearm, one instrument, one utility; a second of a group takes the place of the first', () => {
  const c = createCombat()
  c.setBaby('p1', true)
  step(c)
  const take = item => { const id = c.addPickup(0, item, 0); const p = c.pickups.find(q => q.id === id); p.noPick = 0; step(c, { grab: true }); step(c, { grab: false }) }
  take('pistol'); take('sax')
  assert.deepEqual(items(c).sort(), ['pistol', 'sax'])
  take('rifle')
  assert.deepEqual(items(c).sort(), ['rifle', 'sax'], 'the rifle took the pistol\'s place')
  assert.ok(c.pickups.some(p => p.owned.item === 'pistol'), 'the pistol fell')
  take('bat')
  assert.ok(!items(c).includes('bat'), 'no staff')
})

test('the Filhote\'s empty hand peeps: a small note that gives harmony, never a blow', () => {
  const c = createCombat()
  c.setBaby('p1', true)
  step(c)
  step(c, { fire: true, firePressed: true })
  const notes = c.bullets.filter(b => b.item === 'piu')
  assert.equal(notes.length, 1)
  assert.ok(notes[0].note && notes[0].damage > 0 && notes[0].range <= 400)
  // with “Sem Golpe rápido” on, Golpe peeps too and never swings
  c.setBabyRules({ noMelee: true })
  step(c, { melee: true })
  assert.equal(c.swing, null, 'Golpe does not swing')
})

test('the Filhote\'s limits can each be turned off (Personagem → Filhote)', () => {
  // the quick blow is back by default: Golpe swings, with an empty hand too
  const c = createCombat()
  c.setBaby('p1', true)
  step(c)
  step(c, { melee: true })
  assert.ok(c.swing, 'Golpe swings')
  assert.equal(c.bullets.filter(b => b.item === 'piu').length, 0, 'and does not peep')
  // staffs, more Gaiolas, no peep
  const d = createCombat()
  d.setBaby('p1', true)
  d.setBabyRules({ noStaffs: false, oneCage: false, piu: false })
  step(d)
  const id = d.addPickup(0, 'bat', 0); d.pickups.find(q => q.id === id).noPick = 0
  step(d, { grab: true }); step(d, { grab: false })
  assert.ok(items(d).includes('bat'), 'takes a staff')
  const e = createCombat(); e.setBaby('p1', true); e.setBabyRules({ piu: false }); step(e)
  step(e, { fire: true, firePressed: true })
  assert.equal(e.bullets.filter(b => b.item === 'piu').length, 0, 'no peep')
})
