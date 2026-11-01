const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { resolveAim } = loadTs('lib/pigchicken/aim.ts')
const controls = loadTs('lib/chicken/controls.ts')
const layout = loadTs('lib/chicken/touch-layout.ts')

const base = { rightStick: null, mouse: null, touch: null, leftStick: null, keys: { x: 0, y: 0 }, origin: { x: 0, y: 0 }, face: 1, grounded: false, aimLock: false, magnet: false, magnetDeg: 12 }

test('the on-screen left stick aims at any angle, not only the 8 directions', () => {
  globalThis.window = { dispatchEvent() {} }
  const angle = 20 * Math.PI / 180
  controls.setTouchMoveStick({ x: Math.cos(angle), y: -Math.sin(angle), len: 0.9 })
  const stick = controls.readTouchMoveStick(0.25)
  assert.ok(stick && stick.mag > 0 && stick.mag <= 1)
  const aim = resolveAim({ ...base, leftStick: stick })
  assert.ok(Math.abs(aim.angle - -angle) < 1e-9, `got ${aim.angle}`)
  assert.equal(aim.source, 'leftStick')
  // inside the dead zone or released: nothing
  controls.setTouchMoveStick({ x: 1, y: 0, len: 0.2 }); assert.equal(controls.readTouchMoveStick(0.25), null)
  controls.setTouchMoveStick(null); assert.equal(controls.readTouchMoveStick(0.25), null)
  // the magnet still snaps when it is on
  const snapped = resolveAim({ ...base, leftStick: { x: Math.cos(.1), y: -Math.sin(.1), mag: 1 }, magnet: true })
  assert.ok(Math.abs(snapped.angle) < 1e-12)
})

test('dragging a touch control stays inside the screen', () => {
  const rect = { left: 100, right: 200, top: 500, bottom: 600 }
  assert.deepEqual(layout.clampDelta(rect, -500, 900, 400, 700), { x: -96, y: 96 })
  assert.deepEqual(layout.clampDelta(rect, 50, -20, 400, 700), { x: 50, y: -20 })
  assert.deepEqual(layout.clampDelta(rect, 900, -900, 400, 700), { x: 196, y: -496 })
})

test('the layout is kept on Ok and edit mode shows until then', () => {
  const store = {}
  globalThis.window = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v } }, dispatchEvent() {} }
  let calls = 0
  const off = layout.subscribeTouchLayout(() => calls++)
  assert.equal(layout.getTouchLayout().editing, false)
  layout.startTouchLayoutEdit()
  layout.setTouchOffset('aim', { x: -30, y: 12 })
  layout.setTouchOffset('inventory', { x: 5, y: 40 })
  assert.equal(layout.getTouchLayout().editing, true)
  assert.equal(Object.keys(store).length, 0, 'nothing saved before Ok')
  layout.finishTouchLayoutEdit()
  assert.equal(layout.getTouchLayout().editing, false)
  assert.deepEqual(JSON.parse(Object.values(store)[0]), { aim: { x: -30, y: 12 }, inventory: { x: 5, y: 40 } })
  layout.startTouchLayoutEdit(); layout.resetTouchLayout(); layout.finishTouchLayoutEdit()
  assert.deepEqual(JSON.parse(Object.values(store)[0]), {})
  assert.ok(calls >= 6); off()
})

test('audio focus: contexts running when the tab is hidden are suspended and resumed on return', () => {
  const listeners = {}
  class Ctx { constructor() { this.state = 'running'; this.log = [] } suspend() { this.state = 'suspended'; this.log.push('s'); return Promise.resolve() } resume() { this.state = 'running'; this.log.push('r'); return Promise.resolve() } }
  globalThis.window = { AudioContext: Ctx, addEventListener: (n, f) => { listeners[n] = f } }
  globalThis.document = { visibilityState: 'visible', addEventListener: (n, f) => { listeners[n] = f } }
  const { installAudioFocus } = loadTs('lib/audio-focus.ts')
  installAudioFocus(); installAudioFocus()
  const a = new window.AudioContext(), b = new window.AudioContext()
  b.state = 'suspended'
  document.visibilityState = 'hidden'; listeners.visibilitychange()
  assert.deepEqual([a.log, b.log], [['s'], []])
  const late = new window.AudioContext()
  assert.equal(late.state, 'suspended', 'created while away: starts quiet')
  document.visibilityState = 'visible'; listeners.visibilitychange()
  assert.deepEqual([a.log, b.log, late.log], [['s', 'r'], [], ['s', 'r']])
})
