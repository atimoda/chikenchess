const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { clingAnim, clingSpeedLimit } = loadTs('lib/chicken/cling-brood.ts')
const { CHICKEN_PARAMS } = loadTs('lib/chicken/params.ts')
const { CHICKEN_PARAM_META } = loadTs('lib/chicken/param-meta.ts')
const { speciesParams } = loadTs('lib/chicken/species.ts')

test('brooding on a grab she moves at the brooding walk\'s share of the climb, whatever Run says', () => {
  assert.equal(clingSpeedLimit(500, 0.4, false, false), 500)
  assert.equal(clingSpeedLimit(500, 0.4, false, true), 750)
  assert.equal(clingSpeedLimit(500, 0.4, true, false), 200)
  assert.equal(clingSpeedLimit(500, 0.4, true, true), 200)
  // a brooding walk of 0 keeps her still, as on the ground
  assert.equal(clingSpeedLimit(500, 0, true, true), 0)
  assert.equal(clingSpeedLimit(500, -1, true, false), 0)
})

test('Brood wins over every other pose of the grab, on a wall and under a ceiling', () => {
  // a wall
  assert.equal(clingAnim(false, 0, 500, false, false, false), 'cling')
  assert.equal(clingAnim(false, 300, 500, true, false, false), 'cling')
  assert.equal(clingAnim(false, 0, 500, false, false, true), 'brood')
  assert.equal(clingAnim(false, 200, 500, false, true, true), 'brood')
  // hanging: as before without Brood
  assert.equal(clingAnim(true, 0, 500, false, false, false), 'idle')
  assert.equal(clingAnim(true, 0, 500, true, false, false), 'crouch')
  assert.equal(clingAnim(true, 0, 500, false, true, false), 'lookUp')
  assert.equal(clingAnim(true, 300, 500, false, false, false), 'walk')
  assert.equal(clingAnim(true, 700, 500, false, false, false), 'run')
  assert.equal(clingAnim(true, 0, 500, true, true, true), 'brood')
  assert.equal(clingAnim(true, 200, 500, false, false, true), 'brood')
})

test('the wing beats of the shocking jump\'s charge in the air: 4/s for the chicken, 8/s for the chick, 0 to 15', () => {
  assert.equal(CHICKEN_PARAMS.shockingAirFlapRate, 4)
  assert.equal(speciesParams('chick', CHICKEN_PARAMS).shockingAirFlapRate, 8)
  assert.equal(speciesParams('chicken', CHICKEN_PARAMS).shockingAirFlapRate, 4)
  const meta = CHICKEN_PARAM_META.find(m => m.key === 'shockingAirFlapRate')
  assert.equal(meta.group, 'Combinações'); assert.equal(meta.min, 0); assert.equal(meta.max, 15); assert.equal(meta.unit, '/s')
  // off stays off, and the chick never beats past the setting's top
  assert.equal(speciesParams('chick', { ...CHICKEN_PARAMS, shockingAirFlapRate: 0 }).shockingAirFlapRate, 0)
  assert.equal(speciesParams('chick', { ...CHICKEN_PARAMS, shockingAirFlapRate: 12 }).shockingAirFlapRate, 15)
})
