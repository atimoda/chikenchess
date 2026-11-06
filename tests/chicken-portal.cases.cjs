const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createPortalGate, takePortalArrival, markPortalArrival, overlapsPortal } = loadTs('lib/chicken/portal.ts')
const circle = { x: 100, y: 100, r: 75 }
const body = { x: 100, y: 144, scale: .55, state: 'walk' }
const outside = { ...body, x: 350 }

test('running through without Use never confirms entry', () => {
  const gate = createPortalGate()
  gate.update(outside, circle, false)
  assert.deepEqual(gate.update({ ...body, vx: 400, state: 'run' }, circle, false), { touching: true, enter: false, blocked: false })
})

test('a shared Run/Use binding held before or on the crossing needs a new press inside', () => {
  for (const pressedOutside of [false, true]) {
    const gate = createPortalGate()
    gate.update(outside, circle, pressedOutside)
    assert.equal(gate.update(body, circle, true).enter, false)
    assert.equal(gate.update(body, circle, true).enter, false)
    gate.update(body, circle, false)
    assert.equal(gate.update(body, circle, true).enter, true)
    assert.equal(gate.update(body, circle, true).enter, false)
  }
})

test('Use held while editing or while the portal is hidden cannot confirm upon enabling it', () => {
  const gate = createPortalGate()
  gate.update(body, circle, false)
  assert.equal(gate.update(body, circle, true, false).touching, false)
  assert.equal(gate.update(body, circle, true).enter, false)
  gate.update(body, circle, false)
  assert.equal(gate.update(body, circle, true).enter, true)
})

test('arrival suppresses instructions and Use until the entire bird leaves and Use is pressed anew', () => {
  const gate = createPortalGate()
  gate.block()
  assert.equal(gate.update({ ...body, state: 'portalArrival' }, circle, true).blocked, true)
  assert.deepEqual(gate.update(body, circle, true), { touching: false, enter: false, blocked: true })
  assert.equal(overlapsPortal({ ...body, x: 180 }, circle), true)
  assert.equal(gate.update({ ...body, x: 180 }, circle, true).blocked, true)
  assert.equal(gate.update(outside, circle, true).blocked, false)
  assert.equal(gate.update(body, circle, true).enter, false)
  gate.update(body, circle, false)
  assert.equal(gate.update(body, circle, true).enter, true)
})

test('crossing another portal while appearing also blocks that entrance until full exit', () => {
  const gate = createPortalGate()
  gate.update({ ...body, state: 'portalArrival' }, circle, false)
  assert.equal(gate.update(body, circle, true).enter, false)
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
