const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Chess } = require('chess.js')
const { loadTs } = require('../helpers/music.cjs')
const { createMatchPower, permitsPowerMove, permittedPowerMoves, advanceMatchPowers } = loadTs('lib/chess-powers.ts')
const { makePoweredChess, clonePoweredChess, setPoweredChessPowers } = loadTs('lib/powered-chess.ts')
const { analyzePoweredMoves } = loadTs('lib/powered-analysis.ts')

test('Freeze on an occupied piece blocks its next turn, regardless of team', () => {
  const game = new Chess()
  let powers = [createMatchPower('freeze', 'e2', game, 1), createMatchPower('freeze', 'e7', game, 2)]
  assert.equal(permittedPowerMoves(game.moves({ verbose: true }), powers, 1).some(move => move.from === 'e2'), true)
  let move = game.move('d4')
  powers = advanceMatchPowers(powers, move, game, 1)
  assert.equal(powers.some(power => power.square === 'e2'), true)
  assert.equal(permittedPowerMoves(game.moves({ verbose: true }), powers, 2).some(candidate => candidate.from === 'e7'), false)
  move = game.move('d5')
  powers = advanceMatchPowers(powers, move, game, 2)
  assert.equal(permittedPowerMoves(game.moves({ verbose: true }), powers, 3).some(candidate => candidate.from === 'e2'), false)
  move = game.move('Nf3')
  powers = advanceMatchPowers(powers, move, game, 3)
  assert.deepEqual(powers, [])
})

test('An already selected white piece carries Freeze through its current move', () => {
  const game = new Chess()
  let powers = [createMatchPower('freeze', 'e2', game, 1)]
  let move = game.move('e4')
  powers = advanceMatchPowers(powers, move, game, 1)
  assert.equal(powers[0].square, 'e4')
  move = game.move('a5')
  powers = advanceMatchPowers(powers, move, game, 2)
  assert.equal(permittedPowerMoves(game.moves({ verbose: true }), powers, 3).some(candidate => candidate.from === 'e4'), false)
})

test('Freeze on an empty square traps its first entrant for that piece’s next turn', () => {
  const game = new Chess()
  let powers = [createMatchPower('freeze', 'e4', game, 1)]
  let move = game.move('e4')
  powers = advanceMatchPowers(powers, move, game, 1)
  assert.equal(powers[0].frozenColor, 'w')
  assert.equal(powers[0].blocksOnPly, 3)
  move = game.move('d5')
  powers = advanceMatchPowers(powers, move, game, 2)
  assert.equal(permittedPowerMoves(game.moves({ verbose: true }), powers, 3).some(candidate => candidate.from === 'e4'), false)
  move = game.move('Nf3')
  powers = advanceMatchPowers(powers, move, game, 3)
  assert.deepEqual(powers, [])
})

test('An unentered frozen tile thaws after the opponent response', () => {
  const game = new Chess()
  let powers = [createMatchPower('freeze', 'e5', game, 1)]
  let move = game.move('d4')
  powers = advanceMatchPowers(powers, move, game, 1)
  assert.equal(powers.length, 1)
  move = game.move('d5')
  powers = advanceMatchPowers(powers, move, game, 2)
  assert.deepEqual(powers, [])
})

test('Shield protects the chosen square from any opponent landing, including an empty tile', () => {
  const game = new Chess()
  let powers = [createMatchPower('shield', 'e5', game, 1)]
  let move = game.move('d4')
  powers = advanceMatchPowers(powers, move, game, 1)
  assert.equal(permittedPowerMoves(game.moves({ verbose: true }), powers, 2).some(candidate => candidate.to === 'e5'), false)
  move = game.move('d5')
  powers = advanceMatchPowers(powers, move, game, 2)
  assert.deepEqual(powers, [])
  assert.equal(permitsPowerMove({ from: 'e5', to: 'd6', color: 'w', flags: 'e', captured: 'p' }, [{ id: 1, kind: 'shield', square: 'd5', blocksOnPly: 3 }], 3), true)
  assert.equal(permitsPowerMove({ from: 'e5', to: 'd6', color: 'b', flags: 'e', captured: 'p' }, [{ id: 1, kind: 'shield', square: 'd5', blocksOnPly: 3 }], 3), false)
})

test('Shield follows its chosen piece if it moves before the opponent response', () => {
  const game = new Chess()
  let powers = [createMatchPower('shield', 'e2', game, 1)]
  const move = game.move('e4')
  powers = advanceMatchPowers(powers, move, game, 1)
  assert.equal(powers[0].square, 'e4')
  assert.equal(permitsPowerMove({ from: 'd5', to: 'e4', color: 'b', flags: 'c', captured: 'p' }, powers, 2), false)
})

test('A frozen rook also stops its king from castling that side', () => {
  assert.equal(permitsPowerMove({ from: 'e8', to: 'g8', color: 'b', flags: 'k' }, [{ id: 1, kind: 'freeze', square: 'h8', frozenColor: 'b', blocksOnPly: 2 }], 2), false)
})

test('A frozen attacker cannot check the king or be captured', () => {
  const game = makePoweredChess(new Chess('k3r3/8/8/8/8/8/8/4R2K w - - 0 1'))
  const powers = [createMatchPower('freeze', 'e8', game, 1)]
  setPoweredChessPowers(game, powers)
  assert.equal(game.moves({ square: 'e1', verbose: true }).some(move => move.to === 'e8'), false)
  const exposedKing = makePoweredChess(new Chess('k3r3/8/8/8/8/8/8/4K3 w - - 0 1'), powers)
  assert.equal(exposedKing.isCheck(), false)
  assert.equal(exposedKing.moves({ square: 'e1', verbose: true }).some(move => move.to === 'e2'), true)
})

test('Freeze also blocks en passant capture of its piece', () => {
  const powers = [{ id: 1, kind: 'freeze', square: 'e5', frozenColor: 'b', blocksOnPly: 3 }]
  assert.equal(permitsPowerMove({ from: 'd5', to: 'e6', color: 'w', flags: 'e', captured: 'p' }, powers, 3), false)
  assert.equal(permitsPowerMove({ from: 'd5', to: 'c6', color: 'w', flags: 'e', captured: 'p' }, powers, 3), true)
})

test('Shield lets the player king cross an attacked square and snapshots retain that move', () => {
  const game = makePoweredChess(new Chess('k3r3/8/8/8/8/8/8/4K3 w - - 0 1'))
  let powers = [createMatchPower('shield', 'e1', game, 1)]
  setPoweredChessPowers(game, powers)
  assert.equal(game.moves({ square: 'e1', verbose: true }).some(move => move.to === 'e2'), true)
  const before = clonePoweredChess(game, powers)
  const move = game.move({ from: 'e1', to: 'e2' })
  powers = advanceMatchPowers(powers, move, game, game.history().length)
  const after = clonePoweredChess(game, powers)
  assert.equal(after.history()[0], 'Ke2')
  assert.equal(after.fen(), move.after)
  assert.equal(powers[0].square, 'e2')
  assert.equal(before.fen(), move.before)
  assert.equal(before.history().length, 0)
})

test('The bot can answer a shielded king without capturing it', async () => {
  const game = makePoweredChess(new Chess('k3r3/8/8/8/8/8/8/4K3 w - - 0 1'))
  let powers = [createMatchPower('shield', 'e1', game, 1)]
  setPoweredChessPowers(game, powers)
  const move = game.move({ from: 'e1', to: 'e2' })
  powers = advanceMatchPowers(powers, move, game, game.history().length)
  setPoweredChessPowers(game, powers)
  const analysis = await analyzePoweredMoves(game, powers)
  assert.equal(analysis.side, 'b')
  assert.equal(analysis.complete, true)
  assert.equal(game.moves({ verbose: true }).some(candidate => candidate.captured === 'k'), false)
  const bot = clonePoweredChess(game, powers)
  const reply = analysis.best[0]
  assert.doesNotThrow(() => bot.move({ from: reply.uci.slice(0, 2), to: reply.uci.slice(2, 4) }))
})

test('Powered Best/Worst candidates include a protected king step and exclude frozen captures', async () => {
  const game = makePoweredChess(new Chess('k3r3/8/8/8/8/8/8/4K3 w - - 0 1'))
  const analysis = await analyzePoweredMoves(game, [createMatchPower('shield', 'e1', game, 1)])
  assert.equal(analysis.complete, true)
  assert.equal(analysis.source, 'powers')
  assert.equal([...analysis.best, ...analysis.worst].some(move => move.uci === 'e1e2'), true)
  const captureGame = makePoweredChess(new Chess('k3r3/8/8/8/8/8/8/4R2K w - - 0 1'))
  const captureAnalysis = await analyzePoweredMoves(captureGame, [createMatchPower('freeze', 'e8', captureGame, 2)])
  assert.equal([...captureAnalysis.best, ...captureAnalysis.worst].some(move => move.uci === 'e1e8'), false)
})
