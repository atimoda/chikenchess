const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createMatchState, applyMatchCommand: command, replayMatch, matchPosition, parseMatchCommand } = loadTs('lib/online/domain.ts')
const move = (s, c, from, to, reward) => command(s, c, { kind: 'move', from, to, ...(reward ? { analysis: { position: matchPosition(s), best: [{ uci: from + to, score: reward === 'worst' ? -101 : 0 }], worst: [{ uci: from + to, score: -101 }] } } : {}) })

test('server validates both turns and preserves the original state on rejection', () => {
  const initial = createMatchState()
  assert.throws(() => move(initial, 'b', 'e7', 'e5'), /turn/)
  assert.throws(() => move(initial, 'w', 'e2', 'e5'), /Invalid move/)
  assert.deepEqual(initial, createMatchState())
  const white = move(initial, 'w', 'e2', 'e4')
  const black = move(white, 'b', 'e7', 'e5')
  assert.equal(replayMatch(black).game.history().length, 2)
  assert.equal(replayMatch(black).game.turn(), 'w')
})
test('Undo returns to either actor, costs once, Redo belongs to its actor and cannot repeat reward', () => {
  let s = move(createMatchState(), 'w', 'e2', 'e4', 'best')
  s = move(s, 'b', 'e7', 'e5', 'worst')
  const collected = structuredClone(s.collected)
  s = command(s, 'w', { kind: 'undo' })
  assert.equal(s.actions.length, 0)
  assert.equal(s.eggs.w, 1)
  assert.throws(() => command(s, 'b', { kind: 'redo' }))
  s = command(s, 'w', { kind: 'redo' })
  assert.equal(s.actions.length, 2)
  assert.deepEqual(s.collected, collected)
  s = command(s, 'b', { kind: 'undo' })
  assert.equal(replayMatch(s).game.turn(), 'b')
  s = move(s, 'b', 'e7', 'e5', 'worst')
  assert.deepEqual(s.collected, collected)
  assert.equal(s.redo, null)
})
test('Best/Worst share legal suggestions, charge only caller and remember last displayed score', () => {
  let s = createMatchState()
  const position = matchPosition(s)
  s = command(s, 'b', { kind: 'suggest', group: 'best', position, moves: [{ uci: 'e2e4', score: 0 }] }, 1000)
  assert.equal(s.eggs.w, 1)
  assert.equal(s.eggs.b, 0)
  assert.equal(s.suggestions.expiresAt, 4000)
  s = move(s, 'w', 'e2', 'e4', 'worst')
  assert.equal(s.actions[0].reward, 'best')
  assert.equal(s.eggs.w, 2)
  assert.equal(s.suggestions, null)
  assert.equal(s.seen.length, 0)
  assert.throws(() => command(createMatchState(), 'w', { kind: 'suggest', group: 'best', position, moves: [{ uci: 'e2e5', score: 0 }] }), /Invalid move suggestions/)
})
test('Either player can request Best or Worst on either turn while Freeze/Shield remain own-turn only', () => {
  for (const turn of ['w', 'b']) {
    for (const actor of ['w', 'b']) {
      for (const group of ['best', 'worst']) {
        const initial = turn === 'w' ? createMatchState() : move(createMatchState(), 'w', 'e2', 'e4')
        const uci = turn === 'w' ? 'e2e4' : 'e7e5'
        const position = matchPosition(initial)
        const shown = command(initial, actor, { kind: 'suggest', group, position, moves: [{ uci, score: 0 }] }, 1000)
        assert.equal(shown.suggestions.actor, actor)
        assert.equal(shown.suggestions.kind, group)
        assert.equal(shown.eggs[actor], 0)
        assert.equal(shown.eggs[actor === 'w' ? 'b' : 'w'], 1)
        assert.equal(replayMatch(shown).game.turn(), turn)
        assert.equal(matchPosition(shown), position)
        assert.deepEqual(shown.actions, initial.actions)
      }
    }
    const initial = turn === 'w' ? createMatchState() : move(createMatchState(), 'w', 'e2', 'e4')
    const other = turn === 'w' ? 'b' : 'w'
    initial.eggs[other] = 10
    for (const power of ['freeze', 'shield']) {
      assert.throws(() => command(initial, other, { kind: 'power', power, square: 'e4' }), /turn/)
      assert.equal(initial.eggs[other], 10)
    }
  }
})
test('Visible suggestions enforce a shared cooldown, preserve eggs on rejection and unlock exactly at expiry', () => {
  let s = createMatchState()
  s.eggs = { w: 5, b: 5 }
  const position = matchPosition(s)
  const suggest = group => ({ kind: 'suggest', group, position, moves: [{ uci: 'e2e4', score: 0 }] })
  s = command(s, 'b', suggest('best'), 1000)
  const before = structuredClone(s)
  for (const actor of ['w', 'b']) {
    for (const group of ['best', 'worst']) {
      assert.throws(() => command(s, actor, suggest(group), 3999), /visible suggestions/)
      assert.deepEqual(s, before, 'cooldown rejects without charge or replacement of visible suggestions and memory')
    }
  }
  const expired = command(s, 'b', suggest('worst'), 4000)
  assert.equal(expired.eggs.b, 3)
  assert.equal(expired.eggs.w, 5)
  assert.equal(expired.suggestions.kind, 'worst')
  assert.equal(expired.suggestions.expiresAt, 7000)
  assert.equal(expired.seen.length, 2)

  const moved = move(s, 'w', 'e2', 'e4')
  const next = command(moved, 'w', { kind: 'suggest', group: 'worst', position: matchPosition(moved), moves: [{ uci: 'e7e5', score: 0 }] }, 2000)
  assert.equal(next.suggestions.kind, 'worst', 'a move clears visible arrows and unlocks without waiting on old expiry')
  assert.equal(replayMatch(next).game.turn(), 'b')
})
test('Freeze/Shield are guarded by own turn, paid symmetrically, replayed and invalidate arrows', () => {
  let s = move(createMatchState(), 'w', 'e2', 'e4', 'worst')
  assert.throws(() => command(s, 'w', { kind: 'power', power: 'freeze', square: 'e7' }), /turn/)
  s = move(s, 'b', 'e7', 'e5', 'worst')
  s = command(s, 'w', { kind: 'power', power: 'shield', square: 'e4' })
  assert.equal(s.eggs.w, 1)
  assert.equal(replayMatch(s).powers[0].appliedBy, 'w')
  assert.throws(() => command(s, 'w', { kind: 'suggest', group: 'best', position: matchPosition(s), moves: [{ uci: 'd2d4', score: 0 }] }), /powers are active/)
  s = move(s, 'w', 'd2', 'd4')
  s = command(s, 'b', { kind: 'power', power: 'freeze', square: 'd4' })
  assert.equal(s.eggs.b, 1)
  assert.equal(replayMatch(s).powers.at(-1).appliedBy, 'b')
})
test('Freeze rejects the last opponent move before charging either actor, including accumulated powers and history', () => {
  for (const actor of ['w', 'b']) {
    let s = actor === 'w' ? createMatchState() : move(createMatchState(), 'w', 'e2', 'e4')
    s.eggs[actor] = 100
    const opponent = actor === 'w' ? 'b' : 'w'
    const last = actor === 'w' ? 'g8' : 'g1'
    const squares = replayMatch(s).game.board().flat()
      .filter(piece => piece?.color === opponent && piece.square !== last)
      .map(piece => piece.square)
    for (const square of squares) s = command(s, actor, { kind: 'power', power: 'freeze', square })
    assert.equal(replayMatch(s).powers.length, 15)
    assert.equal(s.eggs[actor], 55)
    const before = structuredClone(s)
    assert.throws(() => command(s, actor, { kind: 'power', power: 'freeze', square: last }), {
      message: 'Você não pode deixar seu oponente sem jogadas.',
    })
    assert.deepEqual(s, before, 'rejected Freeze preserves eggs, actions, turn and continuation')
    assert.equal(replayMatch(s).game.turn(), actor)
  }
})
test('streaks double from the third eligible own move, opponent does not interrupt', () => {
  let s = move(createMatchState(), 'w', 'e2', 'e4', 'best')
  s = move(s, 'b', 'e7', 'e5')
  s = move(s, 'w', 'g1', 'f3', 'best')
  s = move(s, 'b', 'b8', 'c6')
  s = move(s, 'w', 'f1', 'c4', 'best')
  assert.equal(s.collected.w, 4)
})
test('draw requires opponent acceptance, results are final, rematch requires acceptance', () => {
  let s = command(createMatchState(), 'w', { kind: 'offer-draw' })
  assert.throws(() => command(s, 'w', { kind: 'accept-draw' }), /No draw offer/)
  s = command(s, 'b', { kind: 'accept-draw' })
  assert.deepEqual(s.result, { winner: null, reason: 'draw' })
  assert.throws(() => command(s, 'w', { kind: 'undo' }), /ended/)
  s = command(s, 'w', { kind: 'offer-rematch' })
  assert.throws(() => command(s, 'w', { kind: 'accept-rematch' }), /invitation/)
  s = command(s, 'b', { kind: 'accept-rematch' })
  assert.equal(s.rematchOffer, null)
})
test('checkmate and resignation resolve the right winner without creating rewards from Redo', () => {
  let s = move(createMatchState(), 'w', 'f2', 'f3')
  s = move(s, 'b', 'e7', 'e5')
  s = move(s, 'w', 'g2', 'g4')
  s = move(s, 'b', 'd8', 'h4')
  assert.deepEqual(s.result, { winner: 'b', reason: 'checkmate' })
  assert.deepEqual(command(createMatchState(), 'b', { kind: 'resign' }).result, { winner: 'w', reason: 'resign' })
})
test('untrusted command shape, nonfinite scores and unbounded suggestions are rejected', () => {
  assert.throws(() => parseMatchCommand({ kind: 'move', from: 'e2', to: 'e4', actor: 'w' }))
  assert.throws(() => parseMatchCommand({ kind: 'power', power: 'freeze', square: 'a9' }))
  assert.throws(() => parseMatchCommand({ kind: 'suggest', group: 'best', position: '', moves: [{ uci: 'e2e4', score: Infinity }] }))
  assert.throws(() => command(createMatchState(), 'w', { kind: 'undo' }))
  assert.throws(() => command(createMatchState(), 'w', { kind: 'power', power: 'shield', square: 'e1' }), /more golden/)
})
