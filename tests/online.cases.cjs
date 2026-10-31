const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createMatchState, applyMatchCommand: command, replayMatch, matchPosition, parseMatchCommand } = loadTs('lib/online/domain.ts')
const move = (s, c, from, to, reward) => command(s, c, { kind: 'move', from, to, ...(reward ? { analysis: { position: matchPosition(s), best: [{ uci: from + to, score: reward === 'worst' ? -101 : 0 }], worst: [{ uci: from + to, score: -101 }] } } : {}) })

test('Either player can change shared root, scale and harmony on either turn without changing the board or economy', () => {
  for (const turn of ['w', 'b']) {
    for (const actor of ['w', 'b']) {
      const original = turn === 'w' ? createMatchState() : move(createMatchState(), 'w', 'e2', 'e4')
      const before = globalThis.structuredClone(original)
      const pitch = command(original, actor, { kind: 'board-music', patch: { root: 'F#', scale: 'Dórica' } })
      assert.deepEqual(pitch.boardMusic, { root: 'F#', scale: 'Dórica' }, 'root and scale commit together')
      const harmony = command(pitch, actor, { kind: 'board-music', patch: { harmony: 'jazz-251' } })
      assert.deepEqual(harmony.boardMusic, { root: 'F#', scale: 'Dórica', harmony: 'jazz-251' })
      const changedRoot = command(harmony, actor, { kind: 'board-music', patch: { root: 'G' } })
      assert.deepEqual(changedRoot.boardMusic, { root: 'G', scale: 'Dórica', harmony: 'jazz-251' })
      const unchanged = { ...changedRoot }; delete unchanged.boardMusic
      assert.deepEqual(unchanged, before)
      assert.equal(matchPosition(changedRoot), matchPosition(before))
      assert.equal(replayMatch(changedRoot).game.turn(), turn)
      assert.deepEqual(original, before, 'accepted commands do not mutate their input')
      assert.equal(Object.hasOwn(original, 'boardMusic'), false, 'legacy states need no override or migration')
    }
  }
})
test('Shared board music preserves active suggestions, powers, draw offers and Undo/Redo continuation', () => {
  let suggestions = createMatchState()
  suggestions.eggs.w = 5
  suggestions = command(suggestions, 'w', { kind: 'suggest', group: 'best', position: matchPosition(suggestions), moves: [{ uci: 'e2e4', score: 0 }] }, 1000)
  suggestions = command(suggestions, 'b', { kind: 'offer-draw' })
  let powered = move(createMatchState(), 'w', 'e2', 'e4', 'worst')
  powered = move(powered, 'b', 'e7', 'e5', 'worst')
  powered = command(powered, 'w', { kind: 'power', power: 'shield', square: 'e4' })
  let undone = move(createMatchState(), 'w', 'e2', 'e4', 'best')
  undone = move(undone, 'b', 'e7', 'e5')
  undone.eggs.w = 4
  undone = command(undone, 'w', { kind: 'undo' })
  for (const original of [suggestions, powered, undone]) {
    const before = globalThis.structuredClone(original)
    const updated = command(original, 'b', { kind: 'board-music', patch: { harmony: 'blues-145' } }, 1500)
    const unchanged = { ...updated }; delete unchanged.boardMusic
    assert.deepEqual(unchanged, before, 'musical controls neither spend eggs nor invalidate game controls')
    assert.deepEqual(replayMatch(updated).powers, replayMatch(before).powers)
    assert.deepEqual(original, before)
  }
  const musicalUndo = command(undone, 'b', { kind: 'board-music', patch: { root: 'D', scale: 'Maior', harmony: 'circle' } })
  const restored = command(musicalUndo, 'w', { kind: 'redo' })
  assert.deepEqual(restored.actions, undone.redo.actions)
  assert.deepEqual(restored.boardMusic, musicalUndo.boardMusic, 'Redo preserves global musical settings')
  const nextUndo = command(restored, 'w', { kind: 'undo' })
  assert.deepEqual(nextUndo.boardMusic, musicalUndo.boardMusic, 'Undo preserves global musical settings')
  const laterMove = move(restored, 'w', 'g1', 'f3')
  assert.deepEqual(laterMove.boardMusic, musicalUndo.boardMusic, 'future moves retain shared settings')
})
test('Shared board music rejects ended matches and a fresh match inherits the host context', () => {
  const musical = command(createMatchState(), 'w', { kind: 'board-music', patch: { root: 'A', harmony: 'cadence' } })
  const ended = command(musical, 'b', { kind: 'resign' })
  const before = globalThis.structuredClone(ended)
  for (const actor of ['w', 'b']) {
    assert.throws(() => command(ended, actor, { kind: 'board-music', patch: { root: 'B' } }), /ended/)
    assert.deepEqual(ended, before)
  }
  assert.equal(Object.hasOwn(createMatchState(), 'boardMusic'), false)
})
test('Shared board music accepts only nonempty patches from the authoritative musical catalogs', () => {
  const { ROOTS } = loadTs('lib/music/creative.ts')
  const { SCALE_NAMES } = loadTs('lib/music/scales.ts')
  const { HARMONY_PLAN_IDS } = loadTs('lib/music/harmony.ts')
  for (const [field, values] of [['root', ROOTS], ['scale', SCALE_NAMES], ['harmony', HARMONY_PLAN_IDS]]) {
    for (const value of values) {
      const input = { kind: 'board-music', patch: { [field]: value } }
      assert.deepEqual(parseMatchCommand(input), input)
    }
  }
  for (const patch of [{}, null, [], { root: 'H' }, { root: 'Db' }, { scale: 'unknown' }, { harmony: 'unknown' }, { bpm: 120 }, { volume: 0.5 }, { root: 'D', instrument: {} }, { root: null }, { root: undefined }, { root: undefined, harmony: 'kit' }]) {
    const original = createMatchState()
    assert.throws(() => command(original, 'w', { kind: 'board-music', patch }))
    assert.deepEqual(original, createMatchState())
  }
  assert.throws(() => parseMatchCommand({ kind: 'board-music', patch: { root: 'D' }, actor: 'w' }))
})

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
  s.eggs.w = 2
  s.eggs.b = 2
  const collected = globalThis.structuredClone(s.collected)
  s = command(s, 'w', { kind: 'undo' })
  assert.equal(s.actions.length, 0)
  assert.equal(s.eggs.w, 0)
  assert.throws(() => command(s, 'b', { kind: 'redo' }))
  s = command(s, 'w', { kind: 'redo' })
  assert.equal(s.actions.length, 2)
  assert.deepEqual(s.collected, collected)
  s = command(s, 'b', { kind: 'undo' })
  assert.equal(replayMatch(s).game.turn(), 'b')
  assert.equal(s.eggs.b, 0)
  s = move(s, 'b', 'e7', 'e5', 'worst')
  assert.deepEqual(s.collected, collected)
  assert.equal(s.redo, null)
})
test('Undo refuses with fewer than two eggs and preserves the match state', () => {
  let s = move(createMatchState(), 'w', 'e2', 'e4')
  const before = globalThis.structuredClone(s)
  assert.throws(() => command(s, 'w', { kind: 'undo' }), /1 more golden egg/)
  assert.deepEqual(s, before)
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
test('Visible suggestions block only their own group, preserve eggs on rejection and unlock at expiry', () => {
  for (const first of ['best', 'worst']) {
    const other = first === 'best' ? 'worst' : 'best'
    let s = createMatchState()
    s.eggs = { w: 5, b: 5 }
    const position = matchPosition(s)
    const suggest = group => ({ kind: 'suggest', group, position, moves: [{ uci: 'e2e4', score: 0 }] })
    s = command(s, 'b', suggest(first), 1000)
    const before = globalThis.structuredClone(s)
    for (const actor of ['w', 'b']) {
      assert.throws(() => command(s, actor, suggest(first), 3999), /visible suggestions/)
      assert.deepEqual(s, before, 'same-group rejection preserves eggs, arrows and memory')
      const replaced = command(s, actor, suggest(other), 2000)
      assert.equal(replaced.eggs[actor], s.eggs[actor] - 1)
      assert.equal(replaced.suggestions.kind, other)
      assert.equal(replaced.suggestions.expiresAt, 5000)
      assert.equal(replaced.seen.length, 2)
      assert.throws(() => command(replaced, actor, suggest(other), 4999), /visible suggestions/)
      const switchedBack = command(replaced, actor, suggest(first), 2001)
      assert.equal(switchedBack.suggestions.kind, first, 'the replaced group immediately becomes available again')
    }
    const expired = command(s, 'b', suggest(first), 4000)
    assert.equal(expired.eggs.b, 3)
    assert.equal(expired.suggestions.expiresAt, 7000)

    const moved = move(s, 'w', 'e2', 'e4')
    const next = command(moved, 'w', { kind: 'suggest', group: first, position: matchPosition(moved), moves: [{ uci: 'e7e5', score: 0 }] }, 2000)
    assert.equal(next.suggestions.kind, first, 'a move clears visible arrows and unlocks without waiting on old expiry')
    assert.equal(replayMatch(next).game.turn(), 'b')
  }
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
  s = move(s, 'b', 'd7', 'd5')
  assert.equal(replayMatch(s).powers.length, 1)
  assert.equal(replayMatch(s).powers[0].appliedBy, 'b')
  s.eggs.w = 5
  assert.doesNotThrow(() => command(s, 'w', { kind: 'suggest', group: 'best', position: matchPosition(s), moves: [{ uci: 'c1g5', score: 0 }] }))
})
test('Match feature counters separate both powers and keep cumulative usage across Undo/Redo', () => {
  let s = createMatchState()
  s.eggs = { w: 30, b: 30 }
  const suggestions = group => ({ kind: 'suggest', group, position: matchPosition(s), moves: [{ uci: 'e2e4', score: 0 }] })
  s = command(s, 'w', suggestions('best'), 1000)
  s = command(s, 'b', suggestions('worst'), 1000)
  s = move(s, 'w', 'e2', 'e4')
  s = move(s, 'b', 'e7', 'e5')
  s = command(s, 'w', { kind: 'power', power: 'shield', square: 'e4' })
  s = move(s, 'w', 'd2', 'd4')
  s = command(s, 'b', { kind: 'power', power: 'freeze', square: 'd4' })
  assert.deepEqual(s.usage, { freeze: 1, shield: 1, undo: 0, redo: 0, best: 1, worst: 1 })
  s = command(s, 'b', { kind: 'undo' })
  assert.equal(s.usage.undo, 1)
  s = command(s, 'b', { kind: 'redo' })
  assert.equal(s.usage.redo, 1)
  assert.deepEqual(s.usage, { freeze: 1, shield: 1, undo: 1, redo: 1, best: 1, worst: 1 })
})
test('Each team applies Freeze and Shield at most once per turn, rejected before charging', () => {
  // Leaving the opponent without moves is covered by freezeApplicationError in powers.cases.cjs:
  // with one Freeze per turn, the whole army can no longer be frozen at once.
  for (const actor of ['w', 'b']) {
    let s = actor === 'w' ? createMatchState() : move(createMatchState(), 'w', 'e2', 'e4')
    s.eggs[actor] = 100
    const opponentRank = actor === 'w' ? '7' : '2'
    s = command(s, actor, { kind: 'power', power: 'freeze', square: `a${opponentRank}` })
    s = command(s, actor, { kind: 'power', power: 'shield', square: actor === 'w' ? 'a2' : 'a7' })
    assert.equal(s.eggs[actor], 94)
    for (const power of ['freeze', 'shield']) {
      const before = globalThis.structuredClone(s)
      assert.throws(() => command(s, actor, { kind: 'power', power, square: `h${opponentRank}` }), /once per turn/)
      assert.deepEqual(s, before, 'rejected power preserves eggs, actions, turn and continuation')
    }
    const next = actor === 'w' ? ['b2', 'b3'] : ['b7', 'b6']
    s = move(s, actor, ...next)
    const opponent = actor === 'w' ? 'b' : 'w'
    s.eggs[opponent] = 10
    s = command(s, opponent, { kind: 'power', power: 'freeze', square: actor === 'w' ? 'b3' : 'b6' })
    assert.equal(s.eggs[opponent], 7, 'the other team keeps its own allowance')
  }
})
test('Suggested destination squares pay any own piece until the eggs fade, and match eggs stop at 12', () => {
  let s = createMatchState()
  s.eggs.w = 5
  const best = [{ uci: 'g1f3', score: 30 }, { uci: 'e2e4', score: 20 }, { uci: 'd2d4', score: 10 }]
  s = command(s, 'w', { kind: 'suggest', group: 'best', position: matchPosition(s), moves: best }, 1000)
  assert.equal(s.suggestions.moves.length, 3, 'the opening has 20 moves: three rewarded suggestions')
  assert.equal(s.eggs.w, 4)
  // Arrows last until 4000; the eggs stay solid 3 seconds more, then fade for 3 seconds.
  const late = command(s, 'w', { kind: 'move', from: 'g2', to: 'g3' }, 8500)
  assert.equal(late.eggs.w, 4, 'g3 was never suggested')
  const anyPiece = command(s, 'w', { kind: 'move', from: 'f2', to: 'f3' }, 9900)
  assert.equal(anyPiece.eggs.w, 5, 'the f-pawn lands on the still fading f3 eggs and earns the Best egg')
  assert.equal(anyPiece.actions.at(-1).reward, 'best')
  const expired = command(s, 'w', { kind: 'move', from: 'f2', to: 'f3' }, 10100)
  assert.equal(expired.eggs.w, 4, 'after the eggs fade only the exact seen move pays')

  let capped = move(createMatchState(), 'w', 'e2', 'e4', 'worst')
  capped.eggs.w = 11
  capped = move(capped, 'b', 'e7', 'e5')
  capped = move(capped, 'w', 'g1', 'f3', 'worst')
  assert.equal(capped.eggs.w, 12, 'a 3-egg reward fills the balance only up to 12')
  assert.equal(capped.collected.w, 2, 'only the 2 eggs past the full counter become historic points')

  // With a full counter the whole reward becomes historic points, and the move is spent.
  let full = createMatchState()
  full.eggs.w = 12
  full = move(full, 'w', 'e2', 'e4', 'worst')
  assert.equal(full.eggs.w, 12, 'a full balance earns no match eggs')
  assert.equal(full.collected.w, 3, 'the eggs past the full counter count as historic points')
  full = move(full, 'b', 'e7', 'e5')
  full = command(full, 'w', { kind: 'undo' })
  assert.equal(full.eggs.w, 10)
  full = move(full, 'w', 'e2', 'e4', 'worst')
  assert.equal(full.eggs.w, 10, 'a move that already paid never pays again')
  assert.equal(full.collected.w, 3)
})
test('streaks double from the third eligible own move, opponent does not interrupt', () => {
  let s = move(createMatchState(), 'w', 'e2', 'e4', 'best')
  s = move(s, 'b', 'e7', 'e5')
  s = move(s, 'w', 'g1', 'f3', 'best')
  s = move(s, 'b', 'b8', 'c6')
  s = move(s, 'w', 'f1', 'c4', 'best')
  assert.equal(s.eggs.w, 5, '1 + 1 + 2 eggs over the starting egg')
  assert.equal(s.collected.w, 0, 'eggs that fit in the counter add no historic points')
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
test('A ranked streak pays at most 3 eggs when only one Best/Worst move is on offer', () => {
  const { rankedRewardEggs } = loadTs('lib/online/domain.ts')
  const state = { eggs: { w: 1, b: 1 }, actions: [
    { kind: 'move', color: 'w', reward: 'worst' }, { kind: 'move', color: 'b', reward: null },
    { kind: 'move', color: 'w', reward: 'worst' }, { kind: 'move', color: 'b', reward: null },
  ] }
  assert.equal(rankedRewardEggs(state, 'w', 'worst', 20), 6, 'the third Worst in a row doubles with several moves per list')
  assert.equal(rankedRewardEggs(state, 'w', 'worst', 7), 3, 'one Worst move on offer caps the streak at 3')
  assert.equal(rankedRewardEggs(state, 'w', 'worst'), 6, 'without a move count the streak is unchanged')
  assert.equal(rankedRewardEggs({ ...state, actions: state.actions.map(a => a.color === 'w' ? { ...a, reward: 'best' } : a) }, 'w', 'best', 7), 2)
})
