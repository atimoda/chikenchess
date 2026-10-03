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
