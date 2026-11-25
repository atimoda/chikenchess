const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, memoryStorage } = require('./helpers/music.cjs')

const memory = new Map()
globalThis.window = { localStorage: memoryStorage(memory), location: { href: 'http://x.test/patio', search: '' }, history: { state: null, replaceState() {} } }
const visits = loadTs('lib/pigchicken/patio-visits.ts')

const A = '3f1d2c4b-1111-4222-8333-444455556666'
const B = 'c6bd934e-6b41-40d9-9afc-92a233ee56a3'

test('an entry counts once per 30 minutes per Pátio; a reload in between does not count again', () => {
  memory.clear()
  const t = 1_800_000_000_000
  assert.deepEqual(visits.visitDue(A, t), { due: true, newAnon: true })
  visits.noteVisit(A, false, t)
  assert.equal(visits.visitDue(A, t + 60_000).due, false)
  assert.equal(visits.visitDue(A, t + visits.VISIT_GAP_MS - 1).due, false)
  assert.equal(visits.visitDue(A, t + visits.VISIT_GAP_MS).due, true)
  // another Pátio is its own visit
  assert.equal(visits.visitDue(B, t + 60_000).due, true)
  // a clock moved back does not block counting forever
  assert.equal(visits.visitDue(A, t - 1).due, true)
})

test('the browser is a new anonymous player of a Pátio until the server counted it there', () => {
  memory.clear()
  const t = 1_800_000_000_000
  visits.noteVisit(A, false, t)
  assert.equal(visits.visitDue(A, t + visits.VISIT_GAP_MS).newAnon, true)
  visits.noteVisit(A, true, t + visits.VISIT_GAP_MS)
  // later entries keep the mark, also when they are not counted as anonymous again
  visits.noteVisit(A, false, t + 3 * visits.VISIT_GAP_MS)
  assert.equal(visits.visitDue(A, t + 10 * visits.VISIT_GAP_MS).newAnon, false)
  assert.equal(visits.visitDue(B, t).newAnon, true)
})

test('old entries without the anonymous mark are dropped; the marks stay', () => {
  memory.clear()
  const t = 1_800_000_000_000
  visits.noteVisit(A, true, t)
  visits.noteVisit(B, false, t)
  visits.noteVisit('another', false, t + 2 * visits.VISIT_GAP_MS)
  const kept = JSON.parse(memory.get('chickenchess:patio-visits:v1'))
  assert.deepEqual(Object.keys(kept).sort(), [A, 'another'].sort())
})

test('without a server the visit is not counted and nothing breaks', async () => {
  memory.clear()
  assert.equal(await visits.visitPatioLobby(A), null)
})
