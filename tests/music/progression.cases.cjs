const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')

const {
  STARTING_GOLDEN_EGGS,
  GOLDEN_EGGS_PER_CITY_WIN,
  normalizePlayerProfile,
  applyCityVictory,
  applyGoldenEggSpend,
} = loadTs('lib/game-progression.ts')

test('new and legacy profiles enter the egg economy without converting old point inflation', () => {
  const fresh = normalizePlayerProfile(null, 100)
  assert.equal(fresh.goldenEggs, STARTING_GOLDEN_EGGS)
  assert.equal(fresh.points, STARTING_GOLDEN_EGGS)

  const migrated = normalizePlayerProfile({
    conqueredCityIds: ['detroit', 'chicago'],
    points: 2_000,
    winsCount: 3,
    lastPlayedCityId: 'chicago',
  }, 200)
  assert.equal(migrated.goldenEggs, 40)
  assert.equal(migrated.points, 40)
  assert.equal(migrated.winsCount, 3)
  assert.equal(migrated.updatedAt, 200)
})

test('every city victory earns ten spendable eggs and ten permanent points', () => {
  const initial = normalizePlayerProfile(null, 100)
  const first = applyCityVictory(initial, 'detroit', 200)
  assert.equal(first.earnedEggs, GOLDEN_EGGS_PER_CITY_WIN)
  assert.equal(first.profile.goldenEggs, 20)
  assert.equal(first.profile.points, 20)
  assert.equal(first.isFirstTime, true)

  const replay = applyCityVictory(first.profile, 'detroit', 300)
  assert.equal(replay.profile.goldenEggs, 30)
  assert.equal(replay.profile.points, 30)
  assert.equal(replay.profile.winsCount, 2)
  assert.equal(replay.isFirstTime, false)
})

test('spending eggs preserves historical points and refuses invalid balances', () => {
  const earned = applyCityVictory(normalizePlayerProfile(null, 100), 'berlin', 200).profile
  const spent = applyGoldenEggSpend(earned, 7, 300)
  assert.ok(spent)
  assert.equal(spent.goldenEggs, 13)
  assert.equal(spent.points, 20)
  assert.equal(applyGoldenEggSpend(spent, 14, 400), null)
  assert.equal(applyGoldenEggSpend(spent, 0, 400), null)
})
