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

test('Pig and Ken tuning is saved with the central config: factors over the chicken, jumps in the air set outright', () => {
  const { normalizeChickenConfig, defaultChickenConfig } = loadTs('lib/chicken/config.ts')
  const { defaultClasses, CLASS_FACTOR_KEYS } = loadTs('lib/chicken/species.ts')
  const d = defaultClasses()
  assert.equal(d.pig.factors.scale, 1.15); assert.equal(d.fox.factors.maxHp, 2); assert.equal(d.pig.airJumps, 0)
  assert.ok(!CLASS_FACTOR_KEYS.includes('airJumps') && CLASS_FACTOR_KEYS.includes('walkSpeed'))
  assert.deepEqual(normalizeChickenConfig({ params: {} }).classes, d, 'a config saved before has the code tuning')
  const c = normalizeChickenConfig({ params: {}, classes: { fox: { factors: { walkSpeed: 2, gravity: 99, bogus: 3 }, airJumps: 3.4 } } })
  assert.equal(c.classes.fox.factors.walkSpeed, 2); assert.equal(c.classes.fox.factors.gravity, 5); assert.equal(c.classes.fox.airJumps, 3)
  assert.equal(c.classes.fox.factors.bogus, undefined)
  const base = { ...CHICKEN_PARAMS }
  const fox = speciesParams('fox', base, c.classes)
  assert.equal(fox.walkSpeed, base.walkSpeed * 2); assert.equal(fox.airJumps, 3)
  assert.equal(speciesParams('pig', base, defaultChickenConfig().classes).maxHp, 300)
})

test('the size setting is rebased: 1 is the usual size, and a config saved before reads the same size', () => {
  assert.equal(SCALE_BASE, 0.5)
  assert.equal(CHICKEN_PARAMS.scale, 1)
  const { normalizeChickenConfig } = loadTs('lib/chicken/config.ts')
  assert.equal(normalizeChickenConfig({ params: { scale: 0.5 } }).params.scale, 1)
  assert.equal(normalizeChickenConfig({ params: { scale: 0.75 } }).params.scale, 1.5)
  assert.equal(normalizeChickenConfig({ params: { scale: 1.2, scaleBase: 0.5 } }).params.scale, 1.2)
})

test('the Filhote: a baby of each class with its own skins, and a music bar that makes it an adult again', () => {
  const store = {}
  global.window = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v } } }
  const B = loadTs('lib/chicken/baby.ts')
  const pig = LOOK_ART.breedLook('porco-hampshire'), ken = LOOK_ART.breedLook('raposa-feneco'), chi = LOOK_ART.breedLook('caipira')
  assert.equal(B.babyClassOf(pig), 'porco'); assert.equal(B.babyClassOf(ken), 'raposa'); assert.equal(B.babyClassOf(chi), 'galinha')
  assert.equal(B.babySkins('porco').length, 7); assert.equal(B.babySkins('raposa').length, 10)
  assert.equal(B.defaultBabySkin(pig), 'preto'); assert.equal(B.defaultBabySkin(ken), 'feneco'); assert.equal(B.defaultBabySkin(chi), 'amarelo')
  for (const look of [pig, ken, chi]) assert.ok(LOOK_ART.composeSet(B.babyArt(look, null)).length > 500)
  B.setBaby({ on: true, skin: 'malhado', bar: 0 })
  assert.equal(B.getBaby().on, true)
  assert.equal(B.feedBaby(4), false); assert.equal(B.getBaby().bar, 0.25)
  B.feedBaby(4); B.feedBaby(4)
  assert.equal(B.feedBaby(4), true, 'the 4th note makes it an adult')
  assert.equal(B.getBaby().on, false)
  assert.ok(JSON.parse(store['chickenchess:baby:v1']).on === false)
  delete global.window
})

test('Pig and Ken arms bend at the elbow to reach a hand point, never stretching; items say which hand holds', () => {
  const { reach } = loadTs('lib/chicken/arm-rig.ts')
  const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
  const { staffPose } = loadTs('lib/pigchicken/staff-pose.ts')
  for (const id of ['porco-rosa', 'raposa-vermelha']) {
    const arms = LOOK_ART.art.wing[id].arms
    assert.ok(arms && arms.front && arms.back, id)
    for (const a of [arms.front, arms.back]) {
      const near = reach(a, a.rest[0], a.rest[1])
      assert.ok(Math.hypot(near.wrist[0] - a.rest[0], near.wrist[1] - a.rest[1]) < 0.5, `${id} reaches its rest`)
      const far = reach(a, a.shoulder[0] + 500, a.shoulder[1])
      assert.ok(Math.hypot(far.wrist[0] - a.shoulder[0], far.wrist[1] - a.shoulder[1]) <= a.upper + a.fore, `${id} does not stretch`)
    }
  }
  const bat = DEFAULT_ITEMS.bat
  assert.equal(bat.swapHands, false); assert.equal(bat.grip2On, false)
  assert.equal(staffPose(bat).grip2, null)
  assert.deepEqual(staffPose({ ...bat, grip2On: true, grip2X: 30, grip2Y: 2 }).grip2, { x: 30, y: 2 })
})

test('items have Pontos per class: Pig and Ken use their own set when they have one, else Chi\'s', () => {
  const I = loadTs('lib/pigchicken/items.ts')
  const bat = I.DEFAULT_ITEMS.bat
  assert.deepEqual(bat.classPoints, {})
  assert.equal(I.classItem(bat, 'pig'), bat)
  const own = { ...I.pointsOf(bat), gripX: 33, swapHands: true }
  const withPig = { ...bat, classPoints: { pig: own } }
  assert.equal(I.classItem(withPig, 'pig').gripX, 33); assert.equal(I.classItem(withPig, 'pig').swapHands, true)
  assert.equal(I.classItem(withPig, 'fox').gripX, 33, 'Ken without his own takes Pig\'s'); assert.equal(I.classItem(withPig, 'chi').gripX, bat.gripX)
  const both = { ...bat, classPoints: { pig: own, fox: { ...own, gripX: 7 } } }
  assert.equal(I.classItem(both, 'fox').gripX, 7); assert.equal(I.classItem(both, 'pig').gripX, 33)
  assert.equal(I.pointClassOf('pig'), 'pig'); assert.equal(I.pointClassOf('fox'), 'fox'); assert.equal(I.pointClassOf('chicken'), 'chi')
  // saved and read back (the defaults file too), clamped to the panel's range
  const file = I.itemsDefaultsFile({ ...I.DEFAULT_ITEMS, bat: { ...withPig, classPoints: { pig: { ...own, gripY: 9999 } } } })
  assert.equal(file.bat.classPoints.pig.gripY, 9999)
  const problem = I.itemsFileProblem(file)
  assert.match(problem, /bat\.classPoints/)
  const ok = I.itemsDefaultsFile({ ...I.DEFAULT_ITEMS, bat: withPig })
  assert.equal(I.itemsFileProblem(ok), null)
})
