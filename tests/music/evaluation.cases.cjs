const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const { loadTs } = require('../helpers/music.cjs')
const { ChessEvaluationQueue } = loadTs('lib/chess-evaluation.ts')

function setup() {
  const commands = [], scores = [], busy = []
  const queue = new ChessEvaluationQueue(
    { postMessage: command => commands.push(command) },
    { onScore: score => scores.push(score), onBusy: value => busy.push(value) },
    10,
  )
  return { queue, commands, scores, busy }
}

test('evaluation queue never assigns an interrupted result to a newer FEN', () => {
  const { queue, commands, scores, busy } = setup()
  queue.request('fen-a', 'w')
  assert.deepEqual(commands, ['position fen fen-a', 'go depth 10'])
  queue.handleMessage('info depth 3 score cp 35')

  queue.request('fen-b', 'b')
  queue.request('fen-c', 'w')
  assert.deepEqual(commands.slice(-2), ['stop', 'stop'])
  assert.equal(commands.includes('position fen fen-b'), false)

  queue.handleMessage('info depth 4 score cp 50')
  queue.handleMessage('bestmove a2a3')
  assert.deepEqual(scores, [])
  assert.deepEqual(commands.slice(-2), ['position fen fen-c', 'go depth 10'])

  queue.handleMessage('info depth 5 score cp -28')
  queue.handleMessage('bestmove c2c3')
  assert.deepEqual(scores, [-28])
  assert.equal(busy.at(-1), false)
})

test('evaluation queue restores exact cached positions without stale overwrite', () => {
  const { queue, commands, scores, busy } = setup()
  queue.request('fen-a', 'b')
  queue.handleMessage('info score cp 40')
  queue.handleMessage('bestmove a7a6')
  assert.deepEqual(scores, [-40], 'UCI score is converted from side-to-move to White')

  queue.request('fen-b', 'w')
  queue.request('fen-a', 'b')
  assert.equal(scores.at(-1), -40)
  assert.equal(commands.at(-1), 'stop')
  assert.equal(busy.at(-1), false)

  queue.handleMessage('info score cp 90')
  queue.handleMessage('bestmove b2b3')
  assert.equal(scores.at(-1), -40, 'late fen-b result cannot replace restored fen-a')
})

test('ChiKenChess worker cancels a pending search before it can inspect another FEN', () => {
  const messages = [], timers = new Map()
  let timerId = 0
  const self = { postMessage: message => messages.push(message) }
  vm.runInNewContext(fs.readFileSync('public/stockfish.js', 'utf8'), {
    self,
    Math,
    setTimeout: callback => { const id = ++timerId; timers.set(id, callback); return id },
    clearTimeout: id => timers.delete(id),
  })
  self.onmessage({ data: 'position fen first-position' })
  self.onmessage({ data: 'go depth 5' })
  assert.equal(timers.size, 1)
  self.onmessage({ data: 'stop' })
  assert.equal(timers.size, 0)
  assert.equal(messages.at(-1), 'bestmove (none)')
})
