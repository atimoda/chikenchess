const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')

const {
  STARTING_GOLDEN_EGGS,
  STARTING_MATCH_GOLDEN_EGGS,
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

test('city victories credit the match egg amount to spendable eggs and permanent points', () => {
  const initial = normalizePlayerProfile(null, 100)
  const first = applyCityVictory(initial, 'detroit', 200, GOLDEN_EGGS_PER_CITY_WIN)
  assert.equal(first.earnedEggs, GOLDEN_EGGS_PER_CITY_WIN)
  assert.equal(first.profile.goldenEggs, 20)
  assert.equal(first.profile.points, 20)
  assert.equal(first.isFirstTime, true)

  const replay = applyCityVictory(first.profile, 'detroit', 300, GOLDEN_EGGS_PER_CITY_WIN)
  assert.equal(replay.profile.goldenEggs, 30)
  assert.equal(replay.profile.points, 30)
  assert.equal(replay.profile.winsCount, 2)
  assert.equal(replay.isFirstTime, false)
})

test('a city victory credits the final match egg balance as its reward', () => {
  const initial = normalizePlayerProfile(null, 100)
  assert.equal(STARTING_MATCH_GOLDEN_EGGS, 1)

  const win = applyCityVictory(initial, 'recife', 200, 4)
  assert.equal(win.earnedEggs, 4)
  assert.equal(win.earnedPoints, 4)
  assert.equal(win.profile.goldenEggs, STARTING_GOLDEN_EGGS + 4)
  assert.equal(win.profile.points, STARTING_GOLDEN_EGGS + 4)

  const emptyWin = applyCityVictory(win.profile, 'recife', 300, 0)
  assert.equal(emptyWin.earnedEggs, 0)
  assert.equal(emptyWin.profile.goldenEggs, win.profile.goldenEggs)
  assert.equal(emptyWin.profile.winsCount, win.profile.winsCount + 1)
})

test('victory separates remaining basket eggs from additional collected historical points', () => {
  const initial = normalizePlayerProfile(null, 100)
  const win = applyCityVictory(initial, 'recife', 200, 4, 9)
  assert.equal(win.earnedEggs, 4)
  assert.equal(win.earnedPoints, 13)
  assert.equal(win.profile.goldenEggs, initial.goldenEggs + 4)
  assert.equal(win.profile.points, initial.points + 13)
  const empty = applyCityVictory(initial, 'recife', 200, 0, 9)
  assert.equal(empty.profile.goldenEggs, initial.goldenEggs)
  assert.equal(empty.profile.points, initial.points + 9)
  assert.equal(empty.isFirstTime, true)
  const invalid = applyCityVictory(initial, 'recife', 200, -4, -9)
  assert.equal(invalid.earnedPoints, 0)
})

test('spending eggs preserves historical points and refuses invalid balances', () => {
  const earned = applyCityVictory(normalizePlayerProfile(null, 100), 'berlin', 200, GOLDEN_EGGS_PER_CITY_WIN).profile
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

const { matchEggPayout, matchEggSources, basketVisualEggCount } = loadTs('lib/match-eggs.ts')
const { applyCityDraw } = loadTs('lib/game-progression.ts')

test('winner takes both balances and draws split all eggs, including odd totals', () => {
  assert.deepEqual(matchEggPayout({ w: 3, b: 8 }, 'w'), { w: 11, b: 0 })
  assert.deepEqual(matchEggPayout({ w: 3, b: 8 }, 'b'), { w: 0, b: 11 })
  assert.deepEqual(matchEggPayout({ w: 3, b: 8 }, null), { w: 5, b: 6 })
  for (let w = 0; w <= 12; w++) for (let b = 0; b <= 12; b++) {
    const eggs = { w, b }
    for (const winner of ['w', 'b', null]) {
      const payout = matchEggPayout(eggs, winner)
      const white = matchEggSources(eggs, winner, 'w')
      const black = matchEggSources(eggs, winner, 'b')
      assert.equal(white.w + white.b, payout.w)
      assert.equal(black.w + black.b, payout.b)
      assert.equal(white.w + black.w, w)
      assert.equal(white.b + black.b, b)
      assert.ok(Object.values(white).concat(Object.values(black)).every(value => value >= 0 && Number.isInteger(value)))
    }
  }
})

test('campaign draw credits its share and own collected points without conquest or victory', () => {
  const initial = normalizePlayerProfile(null, 100)
  const draw = applyCityDraw(initial, 'recife', 200, 4, 9)
  assert.equal(draw.profile.goldenEggs, initial.goldenEggs + 4)
  assert.equal(draw.profile.points, initial.points + 13)
  assert.equal(draw.profile.winsCount, initial.winsCount)
  assert.deepEqual(draw.profile.conqueredCityIds, initial.conqueredCityIds)
  assert.equal(draw.isFirstTime, false)
  assert.equal(draw.earnedEggs, 4)
})

test('basket shows exact small balances and one extra egg per hundred up to twenty', () => {
  for (let eggs = 0; eggs <= 10; eggs++) assert.equal(basketVisualEggCount(eggs), eggs)
  for (const [balance, count] of [[11,10], [99,10], [100,11], [199,11], [200,12], [999,19], [1000,20], [10000,20]]) {
    assert.equal(basketVisualEggCount(balance), count)
  }
})
