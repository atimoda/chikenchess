const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createPortalGate, takePortalArrival, markPortalArrival, overlapsPortal, createPortalShut, stepPortalShut, portalOpenness, PORTAL_CLOSE_MS, PORTAL_OPEN_MS } = loadTs('lib/chicken/portal.ts')
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

test('an explicit walk to this portal enters on contact, without a second Use press', () => {
  const gate = createPortalGate()
  assert.equal(gate.update(outside, circle, false, true, true).enter, false)
  assert.equal(gate.update(body, circle, false, true, true).enter, true)
  gate.block()
  assert.equal(gate.update(body, circle, false, true, true).enter, false)
})

test('cancelled walks and walks to a different portal never auto-enter', () => {
  const gate = createPortalGate()
  gate.update(outside, circle, false, true, true)
  assert.equal(gate.update(body, circle, false, true, false).enter, false)
  gate.update(body, circle, false)
  assert.equal(gate.update(body, circle, true).enter, true, 'manual Use still works after cancellation')
})

test('walking cannot override disabled portals, arrival or the full-exit block', () => {
  const gate = createPortalGate()
  assert.equal(gate.update(body, circle, false, false, true).enter, false)
  gate.block()
  assert.equal(gate.update({ ...body, state: 'portalArrival' }, circle, false, true, true).enter, false)
  assert.equal(gate.update(body, circle, false, true, true).enter, false)
  gate.update(outside, circle, false)
  assert.equal(gate.update(body, circle, false, true, true).enter, true)
})

test('a Pátio ring closes after the spawn, only once there is a chicken', () => {
  const shut = createPortalShut()
  stepPortalShut(shut, 0, false, false)
  stepPortalShut(shut, 5000, false, false)
  assert.equal(shut.phase, 'open')
  stepPortalShut(shut, 5000, false, true)
  stepPortalShut(shut, 5600, false, true)
  assert.equal(shut.phase, 'open')
  stepPortalShut(shut, 5700, false, true)
  assert.equal(shut.phase, 'closing')
  assert.ok(portalOpenness(shut, 5700 + 100) > 1)
  assert.ok(portalOpenness(shut, 5700 + PORTAL_CLOSE_MS * .8) < .5)
  stepPortalShut(shut, 5700 + PORTAL_CLOSE_MS, false, true)
  assert.equal(shut.phase, 'closed')
  assert.equal(portalOpenness(shut, 9000), 0)
})

test('the ring stays open while someone comes out of it and until a moment after', () => {
  const shut = createPortalShut()
  stepPortalShut(shut, 0, false, true)
  for (let t = 0; t <= 950; t += 50) stepPortalShut(shut, t, true, true)
  stepPortalShut(shut, 1100, false, true)
  assert.equal(shut.phase, 'open')
  stepPortalShut(shut, 1240, false, true)
  assert.equal(shut.phase, 'closing')
})

test('a shut ring opens again for a chicken coming out (or held by the editor) and closes after', () => {
  const shut = createPortalShut(true)
  stepPortalShut(shut, 0, false, true)
  stepPortalShut(shut, 2000, false, true)
  assert.equal(shut.phase, 'closed')
  stepPortalShut(shut, 3000, true, true)
  assert.equal(shut.phase, 'opening')
  assert.ok(portalOpenness(shut, 3000) < 1e-9)
  stepPortalShut(shut, 3000 + PORTAL_OPEN_MS, true, true)
  assert.equal(shut.phase, 'open')
  assert.equal(portalOpenness(shut, 3500), 1)
  stepPortalShut(shut, 3600, false, true)
  stepPortalShut(shut, 3700, false, true)
  assert.equal(shut.phase, 'closing')
  // needed again halfway through closing: it reopens from its current size
  const mid = 3700 + PORTAL_CLOSE_MS / 2, size = portalOpenness(shut, mid)
  stepPortalShut(shut, mid, true, true)
  assert.equal(shut.phase, 'opening')
  assert.ok(Math.abs(portalOpenness(shut, mid) - size) < 1e-9)
})
