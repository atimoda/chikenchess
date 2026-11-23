const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { AUTO_WALK_CANCEL, cancelsAutoWalk, autoWalkArrived, autoWalkHeldStill } = loadTs('lib/chicken/auto-walk.ts')

test('point-and-click: Crouch, Run and Brood keep the walk; a direction, Up or Jump call it off', () => {
  for (const a of ['crouch', 'run', 'down']) assert.equal(cancelsAutoWalk(a), false, a)
  for (const a of ['left', 'right', 'up', 'jump']) assert.equal(cancelsAutoWalk(a), true, a)
  assert.deepEqual([...AUTO_WALK_CANCEL].sort(), ['jump', 'left', 'right', 'up'])
  // item and other buttons never touched the walk
  for (const a of ['fire', 'melee', 'throw', 'nextItem']) assert.equal(cancelsAutoWalk(a), false, a)
})

test('she arrives under the spot, or earlier on the ground when braking covers what is left', () => {
  // under the spot, whatever the speed
  assert.equal(autoWalkArrived(4, 0, 900, 6, true), true)
  assert.equal(autoWalkArrived(-5, 900, 900, 6, false), true)
  // walking (255 px/s, 900 px/s² to brake: ~36 px)
  assert.equal(autoWalkArrived(100, 255, 900, 6, true), false)
  assert.equal(autoWalkArrived(30, 255, 900, 6, true), true)
  // running (510 px/s: ~145 px), toward the left too
  assert.equal(autoWalkArrived(-200, -510, 900, 6, true), false)
  assert.equal(autoWalkArrived(-140, -510, 900, 6, true), true)
  // moving away from it (overshot) or in the air: only under the spot
  assert.equal(autoWalkArrived(30, -510, 900, 6, true), false)
  assert.equal(autoWalkArrived(30, 510, 900, 6, false), false)
  // no braking: only under the spot
  assert.equal(autoWalkArrived(30, 510, 0, 6, true), false)
})

test('brooding or crouching with a speed of 0 is not being stuck', () => {
  assert.equal(autoWalkHeldStill(true, true, 0, false, 0.35), true)
  assert.equal(autoWalkHeldStill(true, true, 0.4, false, 0.35), false)
  assert.equal(autoWalkHeldStill(true, false, 0.4, true, 0), true)
  assert.equal(autoWalkHeldStill(true, false, 0.4, true, 0.35), false)
  // brooding wins over crouching (its walk speed is the one used)
  assert.equal(autoWalkHeldStill(true, true, 0.4, true, 0), false)
  // in the air nothing holds her still
  assert.equal(autoWalkHeldStill(false, true, 0, true, 0), false)
})
