const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { LOOK_ART } = loadTs('lib/chicken/look-art.ts')
const { BEAST_BREEDS, variantClass, PIG_STYLES, FOX_STYLES } = loadTs('lib/chicken/beast-art.ts')

test('Pig has 3 styles and Ken 10 fox species, each a Vestiário breed with every part', () => {
  assert.equal(PIG_STYLES.length, 3)
  assert.equal(FOX_STYLES.length, 10)
  assert.equal(BEAST_BREEDS.length, 13)
  for (const b of BEAST_BREEDS) {
    assert.ok(LOOK_ART.BREEDS.some(x => x.id === b.id && x.klass === b.klass), b.id)
    const look = LOOK_ART.breedLook(b.id)
    for (const s of LOOK_ART.SLOTS) assert.equal(look[s.id], b.id, `${b.id} ${s.id}`)
    assert.equal(LOOK_ART.art.face[b.id].ownEyes, true)
    assert.ok(Array.isArray(LOOK_ART.art.wing[b.id].hand))
    assert.ok(LOOK_ART.art.legs[b.id].shape.thigh > 6)
    assert.ok(LOOK_ART.compose(look).length > 1000)
  }
})

test('the species class of breeds and part variants', () => {
  assert.equal(variantClass('caipira'), 'galinha')
  assert.equal(variantClass('none'), 'galinha')
  assert.equal(variantClass('porco-mangalica'), 'porco')
  assert.equal(variantClass('raposa-feneco'), 'raposa')
  assert.ok(LOOK_ART.BREEDS.filter(b => b.klass === 'galinha').length >= 3)
})

test('the chickens keep their own eyes, wing tip and bird legs', () => {
  for (const id of ['caipira', 'angola', 'onagadori']) {
    assert.ok(!LOOK_ART.art.face[id].ownEyes)
    assert.equal(LOOK_ART.art.wing[id].hand, undefined)
    assert.equal(LOOK_ART.art.legs[id].shape, undefined)
  }
})

const { CHICKEN_PARAMS, SCALE_BASE } = loadTs('lib/chicken/params.ts')
const { speciesParams } = loadTs('lib/chicken/species.ts')

test('one movement per species class: Pig is slow, heavy and stays on the ground; Ken is quick with one air jump', () => {
  const base = { ...CHICKEN_PARAMS }
  const pig = speciesParams('pig', base), fox = speciesParams('fox', base)
  assert.ok(pig.walkSpeed < fox.walkSpeed && fox.walkSpeed < base.walkSpeed)
  assert.ok(pig.walkSpeed * pig.runMultiplier < fox.walkSpeed * fox.runMultiplier && fox.walkSpeed * fox.runMultiplier < base.walkSpeed * base.runMultiplier)
  assert.ok(fox.acceleration > base.acceleration && fox.airControl > base.airControl)
  assert.equal(pig.airJumps, 0); assert.equal(pig.climbSpeed, 0); assert.equal(pig.flyFallDivisor, 1)
  assert.equal(fox.airJumps, 1); assert.ok(fox.flyFallDivisor > base.flyFallDivisor)
  assert.ok(pig.scale > fox.scale && fox.scale > base.scale)
  assert.equal(base.airJumps, 99)
})

test('the size setting is rebased: 1 is the usual size, and a config saved before reads the same size', () => {
  assert.equal(SCALE_BASE, 0.5)
  assert.equal(CHICKEN_PARAMS.scale, 1)
  const { normalizeChickenConfig } = loadTs('lib/chicken/config.ts')
  assert.equal(normalizeChickenConfig({ params: { scale: 0.5 } }).params.scale, 1)
  assert.equal(normalizeChickenConfig({ params: { scale: 0.75 } }).params.scale, 1.5)
  assert.equal(normalizeChickenConfig({ params: { scale: 1.2, scaleBase: 0.5 } }).params.scale, 1.2)
})
