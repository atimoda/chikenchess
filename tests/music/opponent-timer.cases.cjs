const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')
const { OpponentMoveTimer } = loadTs('lib/opponent-move-timer.ts')

function clock() {
  let now = 0, id = 0
  const jobs = new Map()
  return {
    now: () => now,
    setTimeout: (run, delay) => { jobs.set(++id, { due: now + delay, run }); return id },
    clearTimeout: id => jobs.delete(id),
    advance(ms) {
      const until = now + ms
      while (true) {
        const next = [...jobs].filter(([, job]) => job.due <= until).sort((a, b) => a[1].due - b[1].due)[0]
        if (!next) break
        jobs.delete(next[0]); now = next[1].due; next[1].run()
      }
      now = until
    },
    get count() { return jobs.size },
  }
}

test('Pause freezes the five-second opponent delay and repeated resumes use only the remaining time', () => {
  const time = clock(), timer = new OpponentMoveTimer(false, time)
  let replies = 0
  timer.schedule('open position', 5000, () => replies++)
  time.advance(2000); timer.setPaused(true)
  time.advance(20000)
  assert.equal(replies, 0)
  assert.equal(time.count, 0)
  timer.setPaused(false); time.advance(1000); timer.setPaused(true)
  time.advance(20000); timer.setPaused(false); time.advance(1999)
  assert.equal(replies, 0)
  time.advance(1)
  assert.equal(replies, 1)
  assert.equal(timer.hasPending, false)
})

test('Redo while paused waits for Play; another open position gets its own full delay', () => {
  const time = clock(), timer = new OpponentMoveTimer(true, time)
  const replies = []
  timer.schedule('old position', 5000, () => replies.push('old'))
  time.advance(9000)
  timer.schedule('new position', 5000, () => replies.push('new'))
  timer.setPaused(false); time.advance(4999)
  assert.deepEqual(replies, [])
  time.advance(1)
  assert.deepEqual(replies, ['new'])
})

test('Reanalysis and difficulty changes preserve the frozen delay and use the latest reply', () => {
  const time = clock(), timer = new OpponentMoveTimer(false, time)
  const replies = []
  timer.schedule('same position', 5000, () => replies.push('old'))
  time.advance(2000); timer.setPaused(true)
  timer.schedule('same position', 1000, () => replies.push('new'))
  time.advance(10000); timer.setPaused(false); time.advance(2999)
  assert.deepEqual(replies, [])
  time.advance(1)
  assert.deepEqual(replies, ['new'])
})

test('Undo, restart or teardown discard the paused reply even when returning to the same position', () => {
  const time = clock(), timer = new OpponentMoveTimer(false, time)
  const replies = []
  timer.schedule('position', 5000, () => replies.push('stale'))
  time.advance(4000); timer.setPaused(true); timer.cancel()
  assert.equal(timer.hasPending, false)
  timer.setPaused(false); time.advance(10000)
  assert.deepEqual(replies, [])
  timer.schedule('position', 5000, () => replies.push('fresh'))
  time.advance(4999); assert.deepEqual(replies, [])
  time.advance(1); assert.deepEqual(replies, ['fresh'])
  timer.schedule('next', 5000, () => replies.push('unmounted'))
  timer.cancel(); time.advance(10000)
  assert.deepEqual(replies, ['fresh'])
})

const { Chess } = require('chess.js')
const {
  ChessBot,
  DEFAULT_BOT_PROFILES,
  botChancePercentFromWhiteScore,
  botCentipawnsFromChancePercent,
} = loadTs('lib/chess-bots.ts')
const { makePoweredChess } = loadTs('lib/powered-chess.ts')
const { rankedMoveReward } = loadTs('lib/chess-evaluation.ts')

function findBotProfile(id) {
  return DEFAULT_BOT_PROFILES.find(profile => profile.id === id)
}

test('Bot catalog defines the 5 PureChess bots and 3 ChickenBots with expected parameters', () => {
  assert.equal(DEFAULT_BOT_PROFILES.length, 8)
  assert.deepEqual(
    DEFAULT_BOT_PROFILES.map(b => [b.name, b.kind, b.skill, b.alwaysBestMove, b.delaySeconds]),
    [
      ['Easy Pure Chess', 'pure', 0, false, 5],
      ['Medium Pure Chess', 'pure', 5, false, 5],
      ['Hard Pure Chess', 'pure', 12, false, 5],
      ['Expert Pure Chess', 'pure', 20, false, 5],
      ['Jedi Pure Chess', 'pure', 20, true, 3],
      ['Easy ChickenBot', 'chicken', 0, false, 5],
      ['Expert ChickenBot', 'chicken', 20, false, 4],
      ['Jedi ChickenBot', 'chicken', 20, true, 3],
    ],
  )
  const easyChicken = findBotProfile('easy-chickenbot')
  assert.equal(easyChicken.powerUsePercent, 60)
  assert.equal(easyChicken.freezeMinThreatPawns, 3)
  assert.equal(easyChicken.freezeCooldownMoves, 6)
  assert.equal(easyChicken.shieldMinPiecePawns, 3)
  assert.equal(easyChicken.shieldCooldownMoves, 6)
  assert.equal(easyChicken.powerMinGainPawns, 0)
  assert.equal(easyChicken.worstFloorPawns, 0.5)
  assert.equal(easyChicken.worstMaxLossPawns, 2)
  assert.equal(easyChicken.eggTarget, 6)
  assert.equal(easyChicken.worstCooldownMoves, 2)
})

test('Bot chance percentage maps 0 score to 50% and rounds-trip with centipawn score', () => {
  assert.equal(botChancePercentFromWhiteScore(0), 50)
  assert.equal(botChancePercentFromWhiteScore(300), 25)
  assert.equal(botChancePercentFromWhiteScore(-300), 75)
  for (const pct of [10, 20, 30, 50, 60, 70]) {
    const botCp = botCentipawnsFromChancePercent(pct)
    assert.ok(Math.abs(botChancePercentFromWhiteScore(-botCp) - pct) < 0.25)
  }
})

test('PureChess and Jedi Pure Chess never trigger powers and Jedi picks the top MultiPV move in 3s', () => {
  const game = makePoweredChess(new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'))
  const analysis = {
    fen: game.fen(),
    side: 'b',
    legalMoves: 20,
    depth: 12,
    complete: true,
    final: true,
    best: [
      { uci: 'c7c5', san: 'c5', score: 25, mate: null, change: 0 },
      { uci: 'e7e5', san: 'e5', score: 10, mate: null, change: -15 },
    ],
    worst: [{ uci: 'g7g5', san: 'g5', score: -210, mate: null, change: -235 }],
  }
  const easyPure = new ChessBot(findBotProfile('easy-pure-chess'))
  const easyDecision = easyPure.decideTurn({
    game,
    stockfishSuggestedUci: 'a7a6',
    bestAvailableUci: 'c7c5',
    blackAnalysis: analysis,
    whiteScore: 2000,
    botTurnNumber: 8,
    botEggs: 10,
  })
  assert.equal(easyDecision.powerAction, null)
  assert.equal(easyDecision.insufficientEggs, false)
  assert.equal(easyDecision.moveUci, 'a7a6')
  assert.equal(easyPure.delayMs, 5000)

  const jediPure = new ChessBot(findBotProfile('jedi-pure-chess'))
  const jediDecision = jediPure.decideTurn({
    game,
    stockfishSuggestedUci: 'a7a6',
    bestAvailableUci: 'e7e5',
    blackAnalysis: analysis,
    whiteScore: 2000,
    botTurnNumber: 4,
    botEggs: 10,
  })
  assert.equal(jediDecision.powerAction, null)
  assert.equal(jediDecision.moveUci, 'c7c5')
  assert.equal(jediPure.delayMs, 3000)
})

// After 1.e4 e5 2.Bc4 Nc6 3.Qh5, White threatens Qxf7#.
const SCHOLAR_THREAT = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3'
// The d4 pawn forks the knights on c5 and e5.
const PAWN_FORK = '4k3/8/8/2n1n3/3P4/8/8/4K3 b - - 0 1'

function quietTurn(bot, fen, planned, extra = {}) {
  const game = makePoweredChess(new Chess(fen))
  return bot.decideTurn({
    game,
    stockfishSuggestedUci: planned,
    bestAvailableUci: planned,
    blackAnalysis: null,
    whiteScore: 0,
    botTurnNumber: 6,
    botEggs: 9,
    random: () => 0,
    ...extra,
  })
}

test('ChickenBot spends no power in a quiet position, whatever the turn number', () => {
  for (const id of ['easy-chickenbot', 'expert-chickenbot', 'jedi-chickenbot']) {
    for (const botTurnNumber of [3, 4, 6, 8, 9, 12]) {
      const decision = quietTurn(new ChessBot(findBotProfile(id)), 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'e7e5', { botTurnNumber })
      assert.equal(decision.powerAction, null, `${id} on turn ${botTurnNumber}`)
      assert.equal(decision.insufficientEggs, false)
      assert.equal(decision.moveUci, 'e7e5')
    }
  }
})

test('ChickenBot stops a mate in one left by its planned move, ignoring cooldowns', () => {
  const bot = new ChessBot(findBotProfile('expert-chickenbot'))
  const decision = quietTurn(bot, SCHOLAR_THREAT, 'a7a6', { lastFreezeTurn: 5, lastShieldTurn: 5, botEggs: 3 })
  assert.ok(decision.powerAction)
  assert.equal(decision.powerReason, 'mate')
  assert.equal(decision.moveUci, 'a7a6')
  const game = makePoweredChess(new Chess(SCHOLAR_THREAT))
  if (decision.powerAction.kind === 'freeze') assert.equal(game.get(decision.powerAction.square)?.color, 'w')

  const broke = quietTurn(bot, SCHOLAR_THREAT, 'a7a6', { botEggs: 2 })
  assert.equal(broke.powerAction, null)
  assert.equal(broke.insufficientEggs, true, 'A mate it cannot pay for shows the egg warning')
})

test('ChickenBot shields a forked piece and still plays its planned move', () => {
  const bot = new ChessBot(findBotProfile('expert-chickenbot'))
  const decision = quietTurn(bot, PAWN_FORK, 'c5e6')
  assert.deepEqual(decision.powerAction, { kind: 'shield', square: 'e5' })
  assert.equal(decision.powerReason, 'rescue')
  assert.equal(decision.moveUci, 'c5e6')
  assert.equal(decision.usedShieldAdvance, false)
})

test('ChickenBot Freeze and Shield follow their cooldowns, thresholds and egg reserve', () => {
  const bot = new ChessBot(findBotProfile('expert-chickenbot'))
  const freeze = quietTurn(bot, PAWN_FORK, 'c5e6', { lastShieldTurn: 5 })
  assert.deepEqual(freeze.powerAction, { kind: 'freeze', square: 'd4' }, 'Shield on cooldown: freeze the forking pawn')
  assert.equal(freeze.powerReason, 'threat')
  assert.equal(quietTurn(bot, PAWN_FORK, 'c5e6', { lastShieldTurn: 5, lastFreezeTurn: 2 }).powerAction, null)
  assert.equal(quietTurn(bot, PAWN_FORK, 'c5e6', { lastShieldTurn: 5, lastFreezeTurn: 1 }).powerAction?.kind, 'freeze')

  // A Freeze for a threat keeps Q = 3 eggs in reserve and is no emergency.
  const reserve = quietTurn(bot, PAWN_FORK, 'c5e6', { lastShieldTurn: 5, botEggs: 5 })
  assert.equal(reserve.powerAction, null)
  assert.equal(reserve.insufficientEggs, false)
  // Saving a piece may spend the last eggs.
  assert.equal(quietTurn(bot, PAWN_FORK, 'c5e6', { botEggs: 3 }).powerAction?.kind, 'shield')

  // Easy's thresholds are 3 pawns, so it also saves the forked knight.
  assert.deepEqual(quietTurn(new ChessBot(findBotProfile('easy-chickenbot')), PAWN_FORK, 'c5e6').powerAction, { kind: 'shield', square: 'e5' })
})

test('Easy ChickenBot only looks for powers on about half of its turns', () => {
  const bot = new ChessBot(findBotProfile('easy-chickenbot'))
  assert.ok(quietTurn(bot, SCHOLAR_THREAT, 'a7a6', { random: () => 0.2 }).powerAction)
  assert.equal(quietTurn(bot, SCHOLAR_THREAT, 'a7a6', { random: () => 0.7 }).powerAction, null)
})

test('ChickenBot uses each power at most once per turn', () => {
  const { createMatchPower, hasUsedPowerThisTurn } = loadTs('lib/chess-powers.ts')
  const game = makePoweredChess(new Chess(PAWN_FORK))
  const shield = { ...createMatchPower('shield', 'c5', game, 1) }
  assert.equal(hasUsedPowerThisTurn([shield], 'shield', game, 'b'), true)
  assert.equal(hasUsedPowerThisTurn([shield], 'freeze', game, 'b'), false)
  assert.equal(hasUsedPowerThisTurn([shield], 'shield', game, 'w'), false)
  const bot = new ChessBot(findBotProfile('expert-chickenbot'))
  const decision = bot.decideTurn({
    game, powers: [shield], stockfishSuggestedUci: 'c5e6', bestAvailableUci: 'c5e6', blackAnalysis: null,
    whiteScore: 0, botTurnNumber: 6, botEggs: 9, random: () => 0,
  })
  assert.notEqual(decision.powerAction?.kind, 'shield')
})

function worstFarmAnalysis(game) {
  return {
    fen: game.fen(),
    side: 'b',
    legalMoves: 20,
    depth: 12,
    complete: true,
    final: true,
    best: [{ uci: 'c7c5', san: 'c5', score: 250, mate: null, change: 0 }],
    worst: [
      { uci: 'a7a6', san: 'a6', score: 180, mate: null, change: -70 },
      { uci: 'h7h5', san: 'h5', score: 90, mate: null, change: -160 },
      { uci: 'g7g5', san: 'g5', score: -150, mate: null, change: -400 },
    ],
  }
}

test('ChickenBot farms 3 golden eggs with the Worst move that loses least, within V pawns and above W pawns', () => {
  const game = makePoweredChess(new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'))
  const bot = new ChessBot(findBotProfile('expert-chickenbot'))
  const analysis = worstFarmAnalysis(game)
  // Expert: V = 1.0 pawn of loss, W = +0.75 after the move. a7a6 (+1.8, loses 0.7) qualifies;
  // h7h5 (+0.9) loses 1.6 and g7g5 (-1.5) drops below the floor.
  const base = {
    game,
    stockfishSuggestedUci: 'c7c5',
    bestAvailableUci: 'c7c5',
    blackAnalysis: analysis,
    whiteScore: -250,
    botTurnNumber: 1,
    botEggs: 0,
    random: () => 0.99,
  }
  const decision = bot.decideTurn(base)
  assert.equal(decision.powerAction, null)
  assert.equal(decision.usedWorstMoveForEggs, true)
  assert.equal(decision.moveUci, 'a7a6')
  assert.equal(rankedMoveReward(analysis, game.fen(), decision.moveUci, 'b'), 'worst')

  const looseBot = bot.withParams({ worstMaxLossPawns: 2 })
  assert.equal(looseBot.decideTurn(base).moveUci, 'a7a6', 'Picks the smallest loss, not a random eligible move')
  assert.equal(bot.withParams({ worstMaxLossPawns: 0.5 }).decideTurn(base).usedWorstMoveForEggs, false)
  assert.equal(bot.withParams({ worstFloorPawns: 2 }).decideTurn(base).usedWorstMoveForEggs, false)
})

test('ChickenBot skips Worst moves with enough eggs, during the cooldown or when the best move wins material', () => {
  const game = makePoweredChess(new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'))
  const bot = new ChessBot(findBotProfile('expert-chickenbot'))
  const base = {
    game,
    stockfishSuggestedUci: 'c7c5',
    bestAvailableUci: 'c7c5',
    blackAnalysis: worstFarmAnalysis(game),
    whiteScore: -250,
    botTurnNumber: 5,
    botEggs: 0,
  }
  assert.equal(bot.decideTurn({ ...base, botEggs: 6 }).usedWorstMoveForEggs, false, 'Holds eggTarget eggs already')
  assert.equal(bot.decideTurn({ ...base, lastWorstMoveTurn: 3 }).usedWorstMoveForEggs, false, 'Cooldown of 3 turns')
  assert.equal(bot.decideTurn({ ...base, lastWorstMoveTurn: 2 }).usedWorstMoveForEggs, true)
  const conversion = bot.decideTurn({ ...base, whiteScore: -50 })
  assert.equal(conversion.usedWorstMoveForEggs, false, 'Best move gains 2 pawns over the current evaluation')
  assert.equal(conversion.moveUci, 'c7c5')
})

test('ChickenBot never plays a Worst move on the same turn it pays for a power', () => {
  const game = makePoweredChess(new Chess(PAWN_FORK))
  const bot = new ChessBot(findBotProfile('expert-chickenbot'))
  const decision = bot.decideTurn({
    game,
    stockfishSuggestedUci: 'c5e6',
    bestAvailableUci: 'c5e6',
    blackAnalysis: {
      fen: game.fen(), side: 'b', legalMoves: 20, depth: 12, complete: true, final: true,
      best: [{ uci: 'c5e6', san: 'Ne6', score: 250, mate: null, change: 0 }],
      worst: [{ uci: 'c5a4', san: 'Na4', score: 200, mate: null, change: -50 }],
    },
    whiteScore: -250,
    botTurnNumber: 6,
    botEggs: 3,
    random: () => 0,
  })
  assert.ok(decision.powerAction)
  assert.equal(decision.usedWorstMoveForEggs, false)
  assert.equal(decision.moveUci, 'c5e6')
})
