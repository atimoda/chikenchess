const { test } = require('node:test')
/* global structuredClone */
const assert = require('node:assert/strict')
const { Chess } = require('chess.js')
const { loadTs } = require('./helpers/music.cjs')
const { createMatchState, applyMatchCommand, replayMatch } = loadTs('lib/online/domain.ts')
const { poweredChessSnapshot } = loadTs('lib/powered-chess.ts')
const { pendingMovePreview } = loadTs('lib/online/pending-move.ts')

function stateAfter(sans) {
  let state = createMatchState()
  for (const san of sans) {
    const game = replayMatch(state).game
    const move = game.move(san)
    state = applyMatchCommand(state, move.color, {
      kind: 'move', from: move.from, to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}),
    })
  }
  return state
}
function matchFor(state = createMatchState()) {
  return {
    id: 'match-one', room_id: 'room-one', version: 7, state,
    members: [{ user_id: 'white', color: 'w' }, { user_id: 'black', color: 'b' }],
    rematch_id: null,
  }
}
function pendingFor(match, from = 'e2', to = 'e4', promotion) {
  return {
    matchId: match.id, commandId: 'command-one', expectedVersion: match.version,
    command: { kind: 'move', from, to, ...(promotion ? { promotion } : {}) },
  }
}
function powerOn(state, square, power) {
  state.eggs[replayMatch(state).game.turn()] = 10
  return applyMatchCommand(state, replayMatch(state).game.turn(), { kind: 'power', power, square })
}

test('pending move projects onto a separate game without changing confirmed state, powers or rewards', () => {
  const match = matchFor(powerOn(createMatchState(), 'e2', 'shield'))
  const pending = pendingFor(match)
  const before = structuredClone(match)
  const requestBefore = structuredClone(pending)
  const confirmed = replayMatch(match.state)
  const snapshotBefore = structuredClone(poweredChessSnapshot(confirmed.game))
  const preview = pendingMovePreview(match, pending, 'white')
  assert.ok(preview)
  assert.deepEqual(preview.squares, ['e4'])
  assert.equal(preview.powers[0].square, 'e4')
  assert.equal(confirmed.powers[0].square, 'e2')
  assert.equal(preview.game.get('e2'), undefined)
  assert.equal(preview.game.get('e4').type, 'p')
  assert.equal(preview.game.turn(), 'b')
  assert.equal(preview.game.history().length, 1)
  assert.deepEqual(match, before)
  assert.deepEqual(pending, requestBefore)
  assert.deepEqual(poweredChessSnapshot(confirmed.game), snapshotBefore)
  assert.deepEqual(confirmed.powers, replayMatch(match.state).powers)
  preview.game.move('a6')
  assert.equal(replayMatch(match.state).game.history().length, 0)
  assert.deepEqual(match.state.eggs, before.state.eggs)
  assert.deepEqual(match.state.collected, before.state.collected)
})

test('preview requires exact match, confirmed version, participant identity, own turn and active match', () => {
  const match = matchFor()
  const pending = pendingFor(match)
  for (const changed of [
    { ...pending, matchId: 'another-match' },
    { ...pending, expectedVersion: 6 },
    { ...pending, expectedVersion: 8 },
    { ...pending, expectedVersion: '7' },
    { ...pending, commandId: '' },
    { ...pending, command: { kind: 'undo' } },
  ]) assert.equal(pendingMovePreview(match, changed, 'white'), null)
  assert.equal(pendingMovePreview(match, pending, 'visitor'), null)
  assert.equal(pendingMovePreview(match, pending, 'black'), null)
  const ended = structuredClone(match)
  ended.state.result = { winner: 'w', reason: 'resign' }
  assert.equal(pendingMovePreview(ended, pending, 'white'), null)
  const blackMatch = matchFor(stateAfter(['e4']))
  assert.ok(pendingMovePreview(blackMatch, pendingFor(blackMatch, 'e7', 'e5'), 'black'))
})

test('confirmed move and later versions stop the preview instead of duplicating the move', () => {
  const match = matchFor()
  const pending = pendingFor(match)
  const accepted = {
    ...match, version: match.version + 1,
    state: applyMatchCommand(match.state, 'w', pending.command),
  }
  assert.equal(pendingMovePreview(accepted, pending, 'white'), null)
  // Even a malformed saved request updated to the new revision cannot replay an old move.
  assert.equal(pendingMovePreview(accepted, { ...pending, expectedVersion: accepted.version }, 'white'), null)
  assert.equal(replayMatch(accepted.state).game.history().length, 1)
})

test('illegal moves and damaged stored commands return no preview without throwing', () => {
  const match = matchFor()
  for (const pending of [
    null, {}, { ...pendingFor(match), command: null },
    pendingFor(match, 'e2', 'e5'), pendingFor(match, 'e7', 'e5'),
    pendingFor(match, 'z9', 'e4'), pendingFor(match, 'e2', 'e4', 'king'),
    { ...pendingFor(match), command: { kind: 'move', from: 'e2', to: 'e4', extra: true } },
  ]) assert.equal(pendingMovePreview(match, pending, 'white'), null)
  const overBudget = structuredClone(match)
  overBudget.state.actions = Array(768).fill({ kind: 'invalid' })
  assert.equal(pendingMovePreview(overBudget, pendingFor(overBudget), 'white'), null)
})

test('Freeze blocks the frozen player move at the real powered deadline', () => {
  let state = powerOn(createMatchState(), 'e2', 'freeze')
  state = applyMatchCommand(state, 'w', { kind: 'move', from: 'e2', to: 'e4' })
  state = applyMatchCommand(state, 'b', { kind: 'move', from: 'a7', to: 'a6' })
  const match = matchFor(state)
  const before = structuredClone(match)
  assert.equal(pendingMovePreview(match, pendingFor(match, 'e4', 'e5'), 'white'), null)
  assert.ok(pendingMovePreview(match, pendingFor(match, 'd2', 'd4'), 'white'))
  assert.deepEqual(match, before)
})

test('Shield rejects capture by protected attacker and capture of protected target', () => {
  for (const square of ['e4', 'd5']) {
    const match = matchFor(powerOn(stateAfter(['e4', 'd5']), square, 'shield'))
    assert.equal(pendingMovePreview(match, pendingFor(match, 'e4', 'd5'), 'white'), null)
    assert.equal(replayMatch(match.state).game.get('d5').color, 'b')
  }
})

test('preview preserves powered legality for an own shielded king entering an attacked square', () => {
  const match = matchFor(powerOn(stateAfter(['e4', 'e5', 'f3', 'Qh4+']), 'e1', 'shield'))
  const confirmed = replayMatch(match.state).game
  assert.throws(() => new Chess(confirmed.fen()).move({ from: 'e1', to: 'f2' }))
  const preview = pendingMovePreview(match, pendingFor(match, 'e1', 'f2'), 'white')
  assert.ok(preview)
  assert.equal(preview.game.get('f2').type, 'k')
  assert.deepEqual(preview.squares, ['f2'])
  assert.equal(confirmed.get('e1').type, 'k')
})

test('capture and en passant remove the correct victim only in the preview', () => {
  for (const [sans, from, to, victim] of [
    [['e4', 'd5'], 'e4', 'd5', 'd5'],
    [['e4', 'a6', 'e5', 'd5'], 'e5', 'd6', 'd5'],
  ]) {
    const match = matchFor(stateAfter(sans))
    const preview = pendingMovePreview(match, pendingFor(match, from, to), 'white')
    assert.ok(preview)
    assert.deepEqual(preview.squares, [to])
    assert.equal(preview.game.get(to).color, 'w')
    assert.equal(preview.game.get(from), undefined)
    if (victim !== to) assert.equal(preview.game.get(victim), undefined)
    assert.equal(replayMatch(match.state).game.get(victim).color, 'b')
  }
  const shielded = matchFor(powerOn(stateAfter(['e4', 'a6', 'e5', 'd5']), 'd5', 'shield'))
  assert.equal(pendingMovePreview(shielded, pendingFor(shielded, 'e5', 'd6'), 'white'), null)
})

test('promotion preview uses the chosen piece and preserves the confirmed pawn and captured rook', () => {
  const match = matchFor(stateAfter(['a4', 'h5', 'a5', 'h4', 'a6', 'h3', 'axb7', 'hxg2']))
  for (const promotion of ['q', 'r', 'b', 'n']) {
    const preview = pendingMovePreview(match, pendingFor(match, 'b7', 'a8', promotion), 'white')
    assert.ok(preview)
    assert.equal(preview.game.get('a8').type, promotion)
    assert.equal(preview.game.get('a8').color, 'w')
    assert.equal(preview.game.get('b7'), undefined)
    assert.deepEqual(preview.squares, ['a8'])
  }
  assert.equal(pendingMovePreview(match, pendingFor(match, 'b7', 'a8'), 'white'), null)
  assert.equal(replayMatch(match.state).game.get('b7').type, 'p')
  assert.equal(replayMatch(match.state).game.get('a8').color, 'b')
})

test('both castling sides for either color preview and mark the king and rook destinations', () => {
  for (const [sans, actor, from, to, rookFrom, rookTo] of [
    [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], 'white', 'e1', 'g1', 'h1', 'f1'],
    [['d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7'], 'white', 'e1', 'c1', 'a1', 'd1'],
    [['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'd3', 'Bc5', 'Nc3'], 'black', 'e8', 'g8', 'h8', 'f8'],
    [['d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7', 'e3'], 'black', 'e8', 'c8', 'a8', 'd8'],
  ]) {
    const match = matchFor(stateAfter(sans))
    const preview = pendingMovePreview(match, pendingFor(match, from, to), actor)
    assert.ok(preview)
    assert.deepEqual(preview.squares, [to, rookTo])
    assert.equal(preview.game.get(to).type, 'k')
    assert.equal(preview.game.get(rookTo).type, 'r')
    assert.equal(preview.game.get(rookFrom), undefined)
    assert.equal(replayMatch(match.state).game.get(rookFrom).type, 'r')
    assert.equal(replayMatch(match.state).game.get(from).type, 'k')
  }
})
