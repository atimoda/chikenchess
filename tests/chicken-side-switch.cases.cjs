const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { standSwitch, hangSwitch, wallSwitch } = loadTs('lib/chicken/side-switch.ts')
const keys = (s = '') => ({ brood: s.includes('brood'), up: s.includes('up'), down: s.includes('down'), against: s.includes('against') })

test('standing on a floating floor: Brood + Jump is the other face, with Down the other side of the box', () => {
  assert.equal(standSwitch(keys('brood')), 'face')
  assert.equal(standSwitch(keys('brood down')), 'box')
  // Up + Brood + Jump stays the shocking jump up
  assert.equal(standSwitch(keys('brood up')), null)
  assert.equal(standSwitch(keys('brood up down')), null)
  // without Brood: Jump against her look still goes under the box; a plain jump and Crouch + Jump do not switch
  assert.equal(standSwitch(keys('against')), 'box')
  assert.equal(standSwitch(keys('')), null)
  assert.equal(standSwitch(keys('down')), null)
  assert.equal(standSwitch(keys('against down')), null)
})

test('hanging: Brood + Jump is the other face, Up or a direction against her look the other side of the box', () => {
  assert.equal(hangSwitch(keys('brood')), 'face')
  assert.equal(hangSwitch(keys('brood up')), 'box')
  assert.equal(hangSwitch(keys('up')), 'box')
  assert.equal(hangSwitch(keys('against')), 'box')
  assert.equal(hangSwitch(keys('brood against')), 'box')
  // a plain Jump lets go, and so does Brood + Jump with Down
  assert.equal(hangSwitch(keys('')), null)
  assert.equal(hangSwitch(keys('brood down')), null)
})

test('on a wall: Brood + Jump without left/right is the other face, toward the wall the other side of the box, away from it the shocking jump', () => {
  assert.equal(wallSwitch({ brood: true, dir: 0, toward: false }), 'face')
  assert.equal(wallSwitch({ brood: false, dir: 1, toward: true }), 'box')
  assert.equal(wallSwitch({ brood: true, dir: -1, toward: true }), 'box')
  // away from the wall: with Brood the shocking jump is prepared, without it it is the wall jump; so is a plain Jump
  assert.equal(wallSwitch({ brood: true, dir: 1, toward: false }), 'shock')
  assert.equal(wallSwitch({ brood: true, dir: -1, toward: false }), 'shock')
  assert.equal(wallSwitch({ brood: false, dir: -1, toward: false }), null)
  assert.equal(wallSwitch({ brood: false, dir: 0, toward: false }), null)
})
