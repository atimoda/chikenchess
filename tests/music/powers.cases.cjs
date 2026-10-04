const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Chess } = require('chess.js')
const { loadTs } = require('../helpers/music.cjs')
const { canUseMatchPower, createMatchPower, permitsPowerMove, permittedPowerMoves, advanceMatchPowers, shieldCaptureBlock } = loadTs('lib/chess-powers.ts')
const { makePoweredChess, clonePoweredChess, freezeApplicationError, setPoweredChessPowers, syncPoweredMoveSan, poweredChessSnapshot, restorePoweredChess } = loadTs('lib/powered-chess.ts')
const { analyzePoweredMoves } = loadTs('lib/powered-analysis.ts')

test('shipped powered Worker is bundled JavaScript and preserves the analysis protocol', async () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const { execFileSync } = require('node:child_process')
  const { Worker } = require('node:worker_threads')
  const root = path.resolve(__dirname, '../..')
  execFileSync(process.execPath, [path.join(root, 'scripts/build-powered-analysis.mjs')], { stdio: 'pipe' })
  const source = fs.readFileSync(path.join(root, 'public/engine/powered-analysis.js'), 'utf8')
  const game = makePoweredChess(new Chess('k3r3/p7/8/8/8/8/8/4K3 w - - 0 1'))
  const powers = [createMatchPower('shield', 'e1', game, 1)]
  setPoweredChessPowers(game, powers)
  const expected = await analyzePoweredMoves(game, powers)
  // Execute the actual browser bundle in a separate JS worker. Only the
  // self/postMessage transport is adapted; search and chess rules are real.
  const worker = new Worker(`
    const { parentPort } = require('node:worker_threads');
    globalThis.self = { postMessage: value => parentPort.postMessage(value) };
    ${source}
    parentPort.on('message', data => self.onmessage({ data }));
  `, { eval: true })
  try {
    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Powered worker did not respond')), 10000)
      worker.once('message', value => { clearTimeout(timer); resolve(value) })
      worker.once('error', error => { clearTimeout(timer); reject(error) })
      worker.postMessage({ snapshot: poweredChessSnapshot(game), powers })
    })
    assert.equal(result.error, undefined)
    assert.equal(result.analysis.fen, game.fen())
    assert.deepEqual(result.analysis.best, expected.best)
    assert.deepEqual(result.analysis.worst, expected.worst)
  } finally { await worker.terminate() }
})

test('Freeze rejects immobilizing either opponent without changing the live position or powers', () => {
  for (const [fen, target] of [
    ['7k/8/8/8/8/8/8/KR6 w - - 0 1', 'h8'],
    ['kr6/8/8/8/8/8/8/7K b - - 0 1', 'h1'],
  ]) {
    const game = makePoweredChess(new Chess(fen))
    const before = structuredClone(poweredChessSnapshot(game))
    const moves = game.moves()
    const powers = []
    const power = createMatchPower('freeze', target, game, 1)
    assert.ok(clonePoweredChess(game, [power]).moves().length, 'applying player still has moves')
    assert.equal(freezeApplicationError(game, powers, power), 'Você não pode deixar seu oponente sem jogadas.')
    assert.deepEqual(poweredChessSnapshot(game), before)
    assert.deepEqual(game.moves(), moves)
    assert.deepEqual(powers, [])
  }
})

test('Freeze accepts exactly one remaining opponent move for either applying team', () => {
  for (const [fen, target] of [
    ['7k/8/p7/8/8/8/8/KR6 w - - 0 1', 'h8'],
    ['kr6/8/8/8/8/P7/8/7K b - - 0 1', 'h1'],
  ]) {
    const game = makePoweredChess(new Chess(fen))
    let powers = [createMatchPower('freeze', target, game, 1)]
    assert.equal(freezeApplicationError(game, [], powers[0]), null)
    setPoweredChessPowers(game, powers)
    const move = game.move(game.turn() === 'w' ? 'Rb2' : 'Rb7')
    powers = advanceMatchPowers(powers, move, game, game.history().length)
    setPoweredChessPowers(game, powers)
    assert.equal(game.moves().length, 1)
  }
})

test('Freeze counts legal replies in check rather than unrestricted piece movements', () => {
  const game = makePoweredChess(new Chess('4r2k/8/8/8/8/8/8/K6R w - - 0 1'))
  const power = createMatchPower('freeze', 'h8', game, 1)
  assert.equal(freezeApplicationError(game, [], power), 'Você não pode deixar seu oponente sem jogadas.')
})

test('Freeze opponent probe excludes effects expiring before the opponent turn', () => {
  const game = makePoweredChess(new Chess('7k/8/p7/8/8/8/8/KR6 w - - 0 1'))
  const expiring = { ...createMatchPower('freeze', 'a6', game, 1), blocksOnPly: 1 }
  setPoweredChessPowers(game, [expiring])
  assert.equal(freezeApplicationError(game, [expiring], createMatchPower('freeze', 'h8', game, 2)), null)
  assert.equal(freezeApplicationError(game, [expiring], createMatchPower('shield', 'h8', game, 2)), null)
})

test('Worker snapshots preserve powered history, legal moves, repetition and ranking', async () => {
  const game = makePoweredChess(new Chess())
  for (const move of ['Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']) game.move(move)
  const powers = [createMatchPower('freeze', 'e7', game, 1)]
  setPoweredChessPowers(game, powers)
  const restored = restorePoweredChess(structuredClone(poweredChessSnapshot(game)), powers)
  assert.equal(restored.fen(), game.fen())
  assert.deepEqual(restored.history({ verbose: true }).map(move => ({ ...move })), game.history({ verbose: true }).map(move => ({ ...move })))
  assert.equal(restored.isThreefoldRepetition(), true)
  assert.deepEqual(restored.moves({ verbose: true }), game.moves({ verbose: true }))
  const direct = await analyzePoweredMoves(game, powers)
  const transferred = await analyzePoweredMoves(restored, powers)
  assert.deepEqual(transferred.best, direct.best)
  assert.deepEqual(transferred.worst, direct.worst)
  assert.equal(transferred.nodes, direct.nodes)
})

test('Power permission follows the acting player turn and stops at game over', () => {
  const game = makePoweredChess()
  assert.equal(canUseMatchPower(game, 'w'), true)
  assert.equal(canUseMatchPower(game, 'b'), false)
  game.move('e4')
  assert.equal(canUseMatchPower(game, 'w'), false)
  assert.equal(canUseMatchPower(game, 'b'), true)
  const mate = makePoweredChess(new Chess('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1'))
  assert.equal(mate.isCheckmate(), true)
  assert.equal(canUseMatchPower(mate, 'w'), false)
  assert.equal(canUseMatchPower(mate, 'b'), false)
})

test('Either player can protect its own king through an attacked square until the opponent replies', () => {
  for (const [color, fen, from, to, reply] of [
    ['w', 'k3r3/8/8/8/8/8/8/4K3 w - - 0 1', 'e1', 'e2', 'Kb8'],
    ['b', '4k3/8/8/8/8/8/8/K3R3 b - - 0 1', 'e8', 'e7', 'Kb1'],
  ]) {
    const game = makePoweredChess(new Chess(fen))
    assert.equal(game.moves({ square: from, verbose: true }).some(move => move.to === to), false)
    let powers = [createMatchPower('shield', from, game, 1)]
    assert.equal(powers[0].appliedBy, color)
    setPoweredChessPowers(game, powers)
    assert.equal(game.isCheck(), false)
    const move = game.move({ from, to })
    powers = advanceMatchPowers(powers, move, game, 1)
    setPoweredChessPowers(game, powers)
    const restored = restorePoweredChess(structuredClone(poweredChessSnapshot(game)), powers)
    assert.equal(restored.isCheck(), false)
    assert.deepEqual(restored.moves({ verbose: true }), game.moves({ verbose: true }))
    const response = game.move(reply)
    powers = advanceMatchPowers(powers, response, game, 2)
    setPoweredChessPowers(game, powers)
    assert.deepEqual(powers, [])
    assert.equal(game.turn(), color)
    assert.equal(game.isCheck(), true)
  }
})

test('Shield on the other player king preserves its normal king safety for either applying team', () => {
  for (const [color, fen, square, firstMove, attackedDestination] of [
    ['w', '3k4/8/8/8/8/8/8/1K2R3 w - - 0 1', 'd8', 'Kb2', 'e8'],
    ['b', '1k2r3/8/8/8/8/8/8/3K4 b - - 0 1', 'd1', 'Kb7', 'e1'],
  ]) {
    const game = makePoweredChess(new Chess(fen))
    let powers = [createMatchPower('shield', square, game, 1)]
    assert.equal(powers[0].appliedBy, color)
    setPoweredChessPowers(game, powers)
    const move = game.move(firstMove)
    powers = advanceMatchPowers(powers, move, game, 1)
    setPoweredChessPowers(game, powers)
    assert.equal(game.moves({ square, verbose: true }).some(move => move.to === attackedDestination), false)
    assert.throws(() => game.move({ from: square, to: attackedDestination }))
  }
})

test('An empty Shield square blocks the opposite player landing for either applying team', () => {
  for (const [color, square, firstMove, blockedMove, response] of [
    ['w', 'e5', 'd4', 'e5', 'd5'],
    ['b', 'e4', 'd5', 'e4', 'd4'],
  ]) {
    const game = makePoweredChess(new Chess(`rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR ${color} KQkq - 0 1`))
    let powers = [createMatchPower('shield', square, game, 1)]
    setPoweredChessPowers(game, powers)
    const ownMove = game.move(firstMove)
    powers = advanceMatchPowers(powers, ownMove, game, 1)
    setPoweredChessPowers(game, powers)
    assert.equal(game.moves().includes(blockedMove), false)
    assert.throws(() => game.move(blockedMove))
    const opponentMove = game.move(response)
    powers = advanceMatchPowers(powers, opponentMove, game, 2)
    assert.deepEqual(powers, [])
  }
})

test('A Freeze applied by black follows its own pawn and blocks its next turn just like white', () => {
  const game = makePoweredChess(new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1'))
  let powers = [createMatchPower('freeze', 'e7', game, 1)]
  assert.equal(powers[0].appliedBy, 'b')
  assert.equal(powers[0].blocksOnPly, 3)
  setPoweredChessPowers(game, powers)
  for (const san of ['e5', 'a3']) {
    const move = game.move(san)
    powers = advanceMatchPowers(powers, move, game, game.history().length)
    setPoweredChessPowers(game, powers)
  }
  assert.equal(powers[0].square, 'e5')
  assert.equal(game.moves({ square: 'e5' }).length, 0)
  const otherPawn = game.move('d5')
  powers = advanceMatchPowers(powers, otherPawn, game, 3)
  assert.deepEqual(powers, [])
})

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
  assert.equal(permitsPowerMove({ from: 'e5', to: 'd6', color: 'w', flags: 'e', captured: 'p' }, [{ id: 1, kind: 'shield', square: 'd5', blocksOnPly: 3 }], 3), false)
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

test('Shield prevents captures by protected pieces of either team while preserving quiet moves', () => {
  for (const color of ['w', 'b']) {
    const game = makePoweredChess(new Chess(`k3r3/8/8/8/8/8/8/4R2K ${color} - - 0 1`))
    const from = color === 'w' ? 'e1' : 'e8'
    const to = color === 'w' ? 'e8' : 'e1'
    const powers = [createMatchPower('shield', from, game, 1)]
    setPoweredChessPowers(game, powers)
    assert.equal(game.moves({ square: from, verbose: true }).some(move => move.to === to), false)
    assert.equal(game.moves({ square: from, verbose: true }).some(move => !move.captured), true)
    assert.throws(() => game.move({ from, to }))
    assert.equal(shieldCaptureBlock({ from, to, color, flags: 'c', captured: 'r' }, powers), 'protected-attacker')
    setPoweredChessPowers(game, [])
    assert.equal(game.moves({ square: from, verbose: true }).some(move => move.to === to), true)
  }
})

test('Shield prevents either team from capturing a protected enemy and prioritizes the target notice', () => {
  for (const color of ['w', 'b']) {
    const game = makePoweredChess(new Chess(`k3r3/8/8/8/8/8/8/4R2K ${color} - - 0 1`))
    const from = color === 'w' ? 'e1' : 'e8'
    const to = color === 'w' ? 'e8' : 'e1'
    const powers = [createMatchPower('shield', to, game, 1)]
    setPoweredChessPowers(game, powers)
    assert.equal(game.moves({ square: from, verbose: true }).some(move => move.to === to), false)
    assert.throws(() => game.move({ from, to }))
    assert.equal(shieldCaptureBlock({ from, to, color, flags: 'c', captured: 'r' }, [...powers, createMatchPower('shield', from, game, 2)]), 'protected-target')
  }
})

test('Shield prevents en passant from a protected pawn or against a protected pawn', () => {
  for (const protectedSquare of ['e5', 'd5']) {
    const game = makePoweredChess(new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2'))
    setPoweredChessPowers(game, [createMatchPower('shield', protectedSquare, game, 1)])
    assert.equal(game.moves({ square: 'e5', verbose: true }).some(move => move.flags.includes('e')), false)
    assert.throws(() => game.move({ from: 'e5', to: 'd6' }))
    setPoweredChessPowers(game, [])
    assert.equal(game.moves({ square: 'e5', verbose: true }).some(move => move.flags.includes('e')), true)
  }
})

test('A shielded attacker stops threatening the enemy king until protection ends', () => {
  const game = makePoweredChess(new Chess('k3r3/8/8/8/8/8/8/4K3 w - - 0 1'))
  setPoweredChessPowers(game, [createMatchPower('shield', 'e8', game, 1)])
  assert.equal(game.isCheck(), false)
  assert.equal(game.moves({ square: 'e1', verbose: true }).some(move => move.to === 'e2'), true)
  setPoweredChessPowers(game, [])
  assert.equal(game.isCheck(), true)
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

const { gameMusicStateFromGame, gameMusicStateFromHistory, piecesFromMoves } = loadTs('lib/music/model.ts')
const { reactionContextFromGame, reactionContext } = loadTs('lib/music/reactions.ts')

function frozenKnightCheck() {
  const game = makePoweredChess()
  const positions = []
  for (const san of ['f4', 'Nc6', 'd3', 'Nd4', 'Qd2', 'a6', 'e3', 'Nf3+']) {
    positions.push(clonePoweredChess(game, []))
    game.move(san)
  }
  return { game, positions }
}

test('Freeze permits Qf2 while music reads recorded moves and the effective check', () => {
  const { game, positions } = frozenKnightCheck()
  assert.equal(gameMusicStateFromGame(game).attackingColor, 'b')
  const powers = [createMatchPower('freeze', 'f3', game, 1)]
  setPoweredChessPowers(game, powers)
  const before = clonePoweredChess(game, powers)
  positions.push(before)
  assert.equal(gameMusicStateFromGame(before).attackingColor, null)
  assert.ok(!reactionContextFromGame(before, 4, positions).states.some(s => s.trigger === 'check'))
  game.move('Qf2')
  assert.throws(() => gameMusicStateFromHistory(game.history()), /Invalid move: Qf2/)
  assert.throws(() => reactionContext(game.history()), /Invalid move: Qf2/)
  const state = gameMusicStateFromGame(game)
  const queen = state.pieces.find(piece => piece.id === 'w:d1')
  assert.equal(queen.square, 'f2')
  assert.equal(queen.activation, 'move')
  assert.equal(state.pieces.find(piece => piece.id === 'b:b8').square, 'f3')
  assert.equal(state.attackingColor, null)
  const context = reactionContextFromGame(game, 4, positions)
  assert.ok(!context.events.some(event => event.trigger === 'checkEscape' && event.ply === 9))
  const after = clonePoweredChess(game, powers)
  assert.equal(gameMusicStateFromGame(before).pieces.find(piece => piece.id === 'w:d1').square, 'd2')
  assert.deepEqual(gameMusicStateFromGame(after), state)
  assert.deepEqual(reactionContextFromGame(after, 4, positions), context)
  positions.push(after)
  const reply = game.move('a5')
  const expired = advanceMatchPowers(powers, reply, game, game.history().length)
  setPoweredChessPowers(game, expired)
  syncPoweredMoveSan(game, reply)
  assert.deepEqual(expired, [])
  assert.equal(gameMusicStateFromGame(game).attackingColor, 'b')
  assert.ok(reactionContextFromGame(game, 4, positions).states.some(s => s.trigger === 'check' && s.color === 'b'))
  positions.push(clonePoweredChess(game, []))
  game.move('Ke2')
  assert.ok(reactionContextFromGame(game, 4, positions).events.some(e => e.trigger === 'checkEscape' && e.ply === 11))
})

test('Shield king moves remain readable by music after the power expires', () => {
  const game = makePoweredChess(new Chess('k3r3/p7/8/8/8/8/8/4K3 w - - 0 1'))
  const powers = [createMatchPower('shield', 'e1', game, 1)]
  setPoweredChessPowers(game, powers)
  const positions = [clonePoweredChess(game, powers)]
  const move = game.move({ from: 'e1', to: 'e2' })
  const active = advanceMatchPowers(powers, move, game, 1)
  setPoweredChessPowers(game, active)
  assert.equal(gameMusicStateFromGame(game).pieces.find(p => p.id === 'w:e1').square, 'e2')
  assert.ok(!reactionContextFromGame(game, 4, positions).events.some(e => e.trigger === 'checkEscape'))
  positions.push(clonePoweredChess(game, active))
  const reply = game.move('a6')
  setPoweredChessPowers(game, advanceMatchPowers(active, reply, game, 2))
  syncPoweredMoveSan(game, reply)
  assert.equal(gameMusicStateFromGame(game).attackingColor, 'b')
  assert.ok(reactionContextFromGame(game, 4, positions).states.some(s => s.trigger === 'check'))
  assert.equal(gameMusicStateFromGame(game).pieces.length, 4)
})

test('Recorded music history preserves ordinary captures, en passant, castling and promotion', () => {
  for (const history of [
    ['e4', 'd5', 'exd5'],
    ['e4', 'a6', 'e5', 'd5', 'exd6'],
    ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O'],
    ['a4', 'h5', 'a5', 'h4', 'a6', 'h3', 'axb7', 'hxg2', 'bxa8=Q'],
  ]) {
    const game = makePoweredChess()
    const positions = []
    for (const san of history) {
      positions.push(clonePoweredChess(game, []))
      game.move(san)
    }
    assert.deepEqual(gameMusicStateFromGame(game), gameMusicStateFromHistory(history))
    assert.deepEqual(reactionContextFromGame(game, 4, positions), reactionContext(history))
    assert.equal(piecesFromMoves(game.history({ verbose: true })).length, game.board().flat().filter(Boolean).length)
  }
})
