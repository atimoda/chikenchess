const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')

const DT = 0.01
function make(species) {
  const c = createCombat()
  c.setMusicOut({ note: () => {}, hold: () => null, drum: () => {} })
  const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0, species }
  const step = (input = {}) => c.step(DT, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
  const run = (s, input = {}) => { for (let t = 0; t < s - 1e-9; t += DT) step(input) }
  return { c, step, run }
}

test('Pig with empty hands: Golpe is the quick Correntada, Atirar charges the strong one and hits on release', () => {
  const { c, step, run } = make('pig')
  step({ melee: true })
  assert.ok(c.swing, 'Golpe swings')
  assert.equal(c.swing.damage, DEFAULT_ITEMS.chainBlow.meleeDamage)
  assert.equal(c.swing.heavy, undefined)
  run(1)
  step({ fire: true, firePressed: true })
  assert.equal(c.heavyCharging, true, 'Atirar arms the strong blow')
  assert.equal(c.peck, null, 'no peck')
  run(0.5, { fire: true })
  step()
  assert.equal(c.heavyCharging, false)
  assert.ok(c.swing && c.swing.heavy, 'letting go hits')
  assert.equal(c.swing.damage, DEFAULT_ITEMS.chainBlow.heavyDamage)
})

test('Ken with empty hands hits with the tail; the chicken keeps the wing and the peck', () => {
  const ken = make('fox')
  ken.step({ melee: true })
  assert.equal(ken.c.swing.damage, DEFAULT_ITEMS.tailBlow.meleeDamage)
  assert.equal(ken.c.swing.wing, true, 'a bare blow (the engine moves the tail)')
  const hen = make(undefined)
  hen.step({ melee: true })
  assert.equal(hen.c.swing.damage, DEFAULT_ITEMS.wing.meleeDamage)
  hen.run(1)
  hen.step({ fire: true, firePressed: true })
  assert.equal(hen.c.heavyCharging, false, 'the chicken has no strong blow with empty hands')
})
