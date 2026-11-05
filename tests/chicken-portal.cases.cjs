const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createPortalGate, takePortalArrival, markPortalArrival, overlapsPortal } = loadTs('lib/chicken/portal.ts')
const circle = { x: 100, y: 100, r: 75 }
const body = { x: 100, y: 144, scale: .55, vx: 255, state: 'walk' }
const none = { run: false, grab: false }

test('releasing Run before walking onto a portal never confirms entry', () => {
  const gate = createPortalGate()
  gate.update({ ...body, x: 350 }, circle, { run: true, grab: false })
  gate.update({ ...body, x: 220 }, circle, none)
  assert.deepEqual(gate.update(body, circle, none), { touching: true, enter: false, blocked: false })
})

test('Run held when crossing the portal confirms even when pressed outside it', () => {
  const gate = createPortalGate(), held = { run: true, grab: false }
  assert.equal(gate.update({ ...body, x: 350 }, circle, held).enter, false)
  assert.equal(gate.update(body, circle, held).enter, true)
})

test('Grab requires a new press while touching; an old held Grab is not automatic entry', () => {
  const gate = createPortalGate(), held = { run: false, grab: true }
  gate.update({ ...body, x: 350 }, circle, held)
  assert.equal(gate.update(body, circle, held).enter, false)
  gate.update(body, circle, none)
  assert.equal(gate.update(body, circle, held).enter, true)
})

test('arrival suppresses instructions and Run/Grab until the entire bird leaves', () => {
  const gate = createPortalGate(), held = { run: true, grab: true }
  gate.block()
  assert.equal(gate.update({ ...body, state: 'portalArrival' }, circle, held).blocked, true)
  assert.deepEqual(gate.update(body, circle, held), { touching: false, enter: false, blocked: true })
  assert.equal(overlapsPortal({ ...body, x: 180 }, circle), true)
  assert.equal(gate.update({ ...body, x: 180 }, circle, held).blocked, true)
  assert.equal(gate.update({ ...body, x: 350 }, circle, held).blocked, false)
  assert.equal(gate.update(body, circle, held).enter, true)
})

test('crossing another portal while appearing also blocks that entrance until full exit', () => {
  const gate = createPortalGate()
  gate.update({ ...body, state: 'portalArrival' }, circle, none)
  assert.equal(gate.update(body, circle, { run: true, grab: false }).enter, false)
})

test('portal arrival markers are destination-specific and consumed once, including on the globe', () => {
  const previous = globalThis.window, store = new Map()
  globalThis.window = { sessionStorage: { setItem: (k,v) => store.set(k,v), getItem: k => store.get(k), removeItem: k => store.delete(k) } }
  try {
    markPortalArrival('globe')
    assert.equal(takePortalArrival('patio'), false)
    assert.equal(takePortalArrival('globe'), true)
    assert.equal(takePortalArrival('globe'), false)
    store.set('chickenchess:portal-arrival', JSON.stringify({ destination: 'patio', at: Date.now() - 9000 }))
    assert.equal(takePortalArrival('patio'), false)
  } finally { globalThis.window = previous }
})
