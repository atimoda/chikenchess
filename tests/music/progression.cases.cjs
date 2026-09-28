const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')

const {
  STARTING_GOLDEN_EGGS,
  GOLDEN_EGGS_PER_CITY_WIN,
  normalizePlayerProfile,
  applyCityVictory,
  applyGoldenEggSpend,
  applyRankedMoveReward,
  resetCampaign,
} = loadTs('lib/game-progression.ts')

test('new and legacy profiles enter the egg economy without converting old point inflation', () => {
  const fresh = normalizePlayerProfile(null, 100)
  assert.equal(fresh.goldenEggs, STARTING_GOLDEN_EGGS)
  assert.equal(fresh.points, STARTING_GOLDEN_EGGS)
  assert.equal(fresh.gameplayTipSeen, false)

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
  const seenTip = normalizePlayerProfile({ ...migrated, gameplayTipSeen: true }, 300)
  assert.equal(seenTip.gameplayTipSeen, true)
})

test('ranked moves add spendable eggs and historical points, with one notice per kind', () => {
  const initial = normalizePlayerProfile(null, 100)
  const worst = applyRankedMoveReward(initial, 'worst', 200)
  assert.equal(worst.earnedEggs, 3)
  assert.equal(worst.firstNotice, true)
  assert.equal(worst.profile.goldenEggs, 13)
  assert.equal(worst.profile.points, 13)
  const anotherWorst = applyRankedMoveReward(worst.profile, 'worst', 300)
  assert.equal(anotherWorst.firstNotice, false)
  const best = applyRankedMoveReward(anotherWorst.profile, 'best', 400)
  assert.equal(best.earnedEggs, 1)
  assert.equal(best.firstNotice, true)
  assert.equal(best.profile.goldenEggs, 17)
  assert.equal(best.profile.points, 17)
  assert.deepEqual(normalizePlayerProfile(best.profile, 500).moveRewardNotices, { best: true, worst: true })
  assert.deepEqual(normalizePlayerProfile({ ...initial, moveRewardNotices: undefined }, 500).moveRewardNotices, { best: false, worst: false })
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

test('Reset Save removes the egg balance and one-time tip flags before reloading', () => {
  const previousWindow = globalThis.window
  const previousDocument = globalThis.document
  const previousStorage = globalThis.localStorage
  const values = new Map([
    ['chikenchess_player', JSON.stringify({ goldenEggs: 99, gameplayTipSeen: true })],
    ['chikenchess_campaign', JSON.stringify({ lastPlayedCityId: 'oakland' })],
  ])
  let reloads = 0
  globalThis.window = { location: { reload: () => { reloads++ } } }
  globalThis.document = { cookie: 'chikenchess_player=old-value' }
  globalThis.localStorage = { removeItem: key => values.delete(key) }
  try {
    resetCampaign()
    assert.equal(values.has('chikenchess_player'), false)
    assert.equal(values.has('chikenchess_campaign'), false)
    assert.equal(reloads, 1)
    const fresh = normalizePlayerProfile(null, 500)
    assert.equal(fresh.goldenEggs, STARTING_GOLDEN_EGGS)
    assert.equal(fresh.points, STARTING_GOLDEN_EGGS)
    assert.equal(fresh.gameplayTipSeen, false)
    assert.deepEqual(fresh.moveRewardNotices, { best: false, worst: false })
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument
    if (previousStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = previousStorage
  }
})
