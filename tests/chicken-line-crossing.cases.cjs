const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { crossingBranch, climbToward } = loadTs('lib/chicken/line-crossing.ts')

// a nearly flat wire and a steeper one climbing to the left, crossing at (500, 300)
const flat = { id: 'flat', ax: 0, ay: 310, bx: 1000, by: 290 }
const steep = { id: 'steep', ax: 300, ay: 100, bx: 700, by: 500 }

test('climb toward a direction: up is positive, screen y grows downward', () => {
  assert.equal(climbToward(steep, -1), 1)
  assert.equal(climbToward(steep, 1), -1)
  assert.ok(Math.abs(climbToward(flat, 1) - 0.02) < 1e-9)
})

test('walking left on the flat wire with Up takes the steeper wire at the crossing', () => {
  assert.equal(crossingBranch(flat, [steep], 500, 300, -1, 1, 5, 2), steep)
  // a frame's step before or after the crossing still counts
  assert.equal(crossingBranch(flat, [steep], 503, 299.94, -1, 1, 5, 2), steep)
  assert.equal(crossingBranch(flat, [steep], 497, 300.06, -1, 1, 5, 2), steep)
})

test('no switch without Up, far from the crossing, or toward a branch that does not climb more', () => {
  assert.equal(crossingBranch(flat, [steep], 500, 300, -1, 0, 5, 2), null)
  assert.equal(crossingBranch(flat, [steep], 540, 299.2, -1, 1, 5, 2), null)
  // walking right, the steep wire goes down: Up keeps the flat one, Crouch takes the steep one
  assert.equal(crossingBranch(flat, [steep], 500, 300, 1, 1, 5, 2), null)
  assert.equal(crossingBranch(flat, [steep], 500, 300, 1, -1, 5, 2), steep)
  // on the steep wire going up-left with Up held, the flat wire is the lower branch: she stays
  assert.equal(crossingBranch(steep, [flat], 500, 300, -1, 1, 5, 2), null)
  assert.equal(crossingBranch(steep, [flat], 500, 300, -1, -1, 5, 2), flat)
})

test('nearly parallel lines are no fork, and of several branches the one that climbs the most wins', () => {
  const twin = { id: 'twin', ax: 0, ay: 312, bx: 1000, by: 288 }
  assert.equal(crossingBranch(flat, [twin], 500, 300, -1, 1, 5, 2), null)
  const steeper = { id: 'steeper', ax: 400, ay: 0, bx: 600, by: 600 }
  assert.equal(crossingBranch(flat, [steep, steeper], 500, 300, -1, 1, 5, 2), steeper)
})
