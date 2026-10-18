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
  assert.equal(easyChicken.freezeTopMoves, 3)
  assert.equal(easyChicken.freezeChanceBelowPercent, 10)
  assert.equal(easyChicken.freezeEveryMoves, 8)
  assert.equal(easyChicken.worstChanceAbovePercent, 70)
  assert.equal(easyChicken.worstMinScorePawns, -4)
  assert.equal(easyChicken.shieldEveryMoves, 9)
  assert.equal(easyChicken.shieldChanceAbovePercent, 50)
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

test('ChickenBot triggers Freeze below Y% or every Z moves on one of the top X moves, and flags insufficient eggs', () => {
  const game = makePoweredChess(new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'))
  const bot = new ChessBot(findBotProfile('jedi-chickenbot'))
  // whiteScore = 1000 => botPercent ~ 11.5% < Y (30%)
  const firstCandidateDecision = bot.decideTurn({
    game,
    stockfishSuggestedUci: 'e7e5',
    bestAvailableUci: 'e7e5',
    blackAnalysis: null,
    whiteScore: 1000,
    botTurnNumber: 1,
    botEggs: 3,
    random: () => 0.1, // selects first among shuffled top X moves
  })
  assert.equal(firstCandidateDecision.powerAction?.kind, 'freeze')
  assert.equal(firstCandidateDecision.insufficientEggs, false)
  assert.ok(game.get(firstCandidateDecision.powerAction.square), 'Freezes the opponent piece to block the move')

  const secondCandidateDecision = bot.decideTurn({
    game,
    stockfishSuggestedUci: 'e7e5',
    bestAvailableUci: 'e7e5',
    blackAnalysis: null,
    whiteScore: 1000,
    botTurnNumber: 1,
    botEggs: 3,
    random: () => 0.8, // selects other top X move candidate
  })
  assert.equal(secondCandidateDecision.powerAction?.kind, 'freeze')
  assert.notEqual(firstCandidateDecision.powerAction?.square, secondCandidateDecision.powerAction?.square)

  const noEggsDecision = bot.decideTurn({
    game,
    stockfishSuggestedUci: 'e7e5',
    bestAvailableUci: 'e7e5',
    blackAnalysis: null,
    whiteScore: 1000,
    botTurnNumber: 1,
    botEggs: 2,
    random: () => 0.2,
  })
  assert.equal(noEggsDecision.powerAction, null)
  assert.equal(noEggsDecision.insufficientEggs, true)
})

test('ChickenBot triggers Shield on an own piece and advances to a square under opponent attack every R moves above T%', () => {
  const game = makePoweredChess(new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'))
  const bot = new ChessBot(findBotProfile('jedi-chickenbot'))
  // botTurnNumber = 3 (multiple of R=3, not multiple of Z=4), whiteScore = 0 => botPercent = 50% > T (20%)
  const decision = bot.decideTurn({
    game,
    stockfishSuggestedUci: 'e7e5',
    bestAvailableUci: 'e7e5',
    blackAnalysis: null,
    whiteScore: 0,
    botTurnNumber: 3,
    botEggs: 3,
    random: () => 0,
  })
  assert.equal(decision.powerAction?.kind, 'shield')
  assert.equal(decision.usedShieldAdvance, true)
  assert.equal(decision.powerAction?.square, decision.moveUci.slice(0, 2))
  assert.equal(game.isAttacked(decision.moveUci.slice(2, 4), 'w'), true)
  assert.ok(Number(decision.moveUci[3]) <= Number(decision.moveUci[1]))
})

test('ChickenBot farms 3 golden eggs with a Worst move above V when chance is above W%', () => {
  const game = makePoweredChess(new Chess('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'))
  const bot = new ChessBot(findBotProfile('expert-chickenbot'))
  const analysis = {
    fen: game.fen(),
    side: 'b',
    legalMoves: 20,
    depth: 12,
    complete: true,
    final: true,
    best: [{ uci: 'c7c5', san: 'c5', score: 25, mate: null, change: 0 }],
    worst: [
      { uci: 'a7a6', san: 'a6', score: -150, mate: null, change: -175 },
      { uci: 'h7h5', san: 'h5', score: -250, mate: null, change: -275 },
      { uci: 'g7g5', san: 'g5', score: -450, mate: null, change: -475 },
    ],
  }
  // whiteScore = -500 => botPercent = 81.25% > W (60%); Expert V = -3 (-300 cp), so a7a6 (-150) and h7h5 (-250) qualify, g7g5 (-450) does not
  const decision = bot.decideTurn({
    game,
    stockfishSuggestedUci: 'c7c5',
    bestAvailableUci: 'c7c5',
    blackAnalysis: analysis,
    whiteScore: -500,
    botTurnNumber: 1,
    botEggs: 0,
    random: () => 0.99, // picks second qualifying worst move ('h7h5')
  })
  assert.equal(decision.powerAction, null)
  assert.equal(decision.usedWorstMoveForEggs, true)
  assert.equal(decision.moveUci, 'h7h5')
  assert.equal(rankedMoveReward(analysis, game.fen(), decision.moveUci, 'b'), 'worst')
})

test('ChickenBot never freezes its own pieces, even when the opponent top move is a capture', () => {
  const game = makePoweredChess(new Chess('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'))
  const bot = new ChessBot(findBotProfile('jedi-chickenbot'))
  const decision = bot.decideTurn({
    game,
    stockfishSuggestedUci: 'c8g4',
    bestAvailableUci: 'c8g4',
    blackAnalysis: null,
    whiteScore: 1000,
    botTurnNumber: 1,
    botEggs: 3,
    random: () => 0.8, // pickOrigin >= 0.5 tries move.to first
  })
  assert.equal(decision.powerAction?.kind, 'freeze')
  assert.notEqual(game.get(decision.powerAction.square)?.color, 'b', 'Bot must never freeze its own piece')
})

