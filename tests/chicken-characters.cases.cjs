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
