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

test('legacy groups split into independent offsets and individual positions take priority', () => {
  const saved = { actions: { x: -80, y: 15 }, items: { x: 21, y: -35 }, throw: { x: 7, y: 9 } }
  const store = { 'chickenchess-chicken-touch-layout-v1': JSON.stringify(saved) }
  globalThis.window = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v } } }
  const offsets = layout.getTouchLayout().offsets
  for (const id of ['run', 'down', 'jump']) assert.deepEqual(offsets[id], saved.actions)
  for (const id of ['melee', 'itemWheel']) assert.deepEqual(offsets[id], saved.items)
  assert.deepEqual(offsets.throw, saved.throw)
  layout.setTouchOffset('run', { x: 1, y: 2 })
  assert.deepEqual(layout.getTouchLayout().offsets.down, saved.actions)
  layout.finishTouchLayoutEdit()
  const persisted = JSON.parse(store['chickenchess-chicken-touch-layout-v1'])
  assert.deepEqual(persisted.run, { x: 1, y: 2 })
  assert.deepEqual(persisted.jump, saved.actions)
  assert.equal(persisted.actions, undefined)
  assert.equal(persisted.items, undefined)
  layout.resetTouchLayout(); layout.finishTouchLayoutEdit()
})

test('touch Run grabs by default, old preferences inherit it and disabling persists', () => {
  let raw = JSON.stringify({ touch: 'on' })
  globalThis.window = { localStorage: { getItem: () => raw, setItem: (_, v) => { raw = v } }, dispatchEvent() {} }
  assert.equal(controls.defaultChickenControls().touchRunGrab, true)
  assert.equal(controls.loadChickenControls().touchRunGrab, true)
  const custom = controls.loadChickenControls()
  custom.touchRunGrab = false
  controls.saveChickenControls(custom)
  assert.equal(controls.loadChickenControls().touchRunGrab, false)
  const held = controls.virtualActionHeld
  assert.equal(held({ run: true }, 'grab', true), true)
  assert.equal(held({ run: true }, 'grab', false), false)
  assert.equal(held({ run: true }, 'run', false), true)
  assert.equal(held({ run: false }, 'grab', true), false)
  assert.equal(held({ grab: true, run: false }, 'grab', false), true)
  assert.equal(held({}, 'grab', true), false, 'physical Run never creates a virtual grab')
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

test('gamepad defaults use RB Run, Y Throw, B Melee, LT Brood and X Grab', () => {
  const d = controls.defaultChickenControls()
  assert.equal(d.pad.run[0], 'Pad:b5')
  assert.equal(d.pad.throw[0], 'Pad:b3')
  assert.equal(d.pad.melee[0], 'Pad:b1')
  assert.deepEqual(d.pad.down.filter(Boolean), ['Pad:b6'])
  assert.equal(d.pad.grab[0], 'Pad:b2')
  assert.deepEqual(d.pad.jump, ['Pad:b0', 'Pad:b11', null])
  assert.equal(d.pad.itemWheel[0], 'Pad:b10')
  assert.equal(d.pad.reload[0], 'Pad:b9')
  assert.ok(!Object.values(d.pad).flat().includes('Pad:b8'))
})

test('old default gamepad trio migrates without changing custom bindings', () => {
  const previous = globalThis.window
  try {
    const saved = { ...controls.defaultChickenControls(), padXRun: true, itemsV1: true, broodLTB: true }
    saved.pad.run = ['Pad:b2', null, null]; saved.pad.throw = ['Pad:b5', null, null]; saved.pad.melee = ['Pad:b3', null, null]
    saved.pad.itemWheel = ['Pad:b8', null, null]; saved.pad.jump = ['Pad:b0', null, null]; saved.pad.reload = ['Pad:b11', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    assert.equal(controls.loadChickenControls().pad.run[0], 'Pad:b5')
    assert.equal(controls.loadChickenControls().pad.throw[0], 'Pad:b3')
    assert.equal(controls.loadChickenControls().pad.melee[0], 'Pad:b1')
    assert.ok(!controls.loadChickenControls().pad.down.includes('Pad:b1'))
    saved.pad.run = ['Pad:b9', null, null]
    assert.equal(controls.loadChickenControls().pad.run[0], 'Pad:b9')
    assert.equal(controls.loadChickenControls().pad.throw[0], 'Pad:b5')
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('interim L3 Melee defaults migrate to B and release B from Brood', () => {
  const previous = globalThis.window
  try {
    const saved = { ...controls.defaultChickenControls(), padXRun: true, padRunRBThrowY: true, itemsV1: true, broodLTB: true }
    saved.pad.melee = ['Pad:b10', null, null]; saved.pad.down = ['Pad:b6', 'Pad:b1', null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const next = controls.loadChickenControls()
    assert.equal(next.pad.melee[0], 'Pad:b1')
    assert.deepEqual(next.pad.down.filter(Boolean), ['Pad:b6'])
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('reversing the mouse before the barrel turns does not inflate the reticle radius', () => {
  const { reticleAtAngle } = loadTs('lib/pigchicken/aim.ts')
  const grip = { x: 0, y: 0 }, target = { x: -200, y: 0 }
  const turning = reticleAtAngle(target, grip, { x: 100, y: 0 }, 0)
  assert.equal(turning.x, 200) // old cursor-to-muzzle reuse drew it at x=400
  const settled = reticleAtAngle(target, grip, { x: -100, y: 0 }, Math.PI)
  assert.ok(Math.abs(settled.x - target.x) < 1e-8)
  assert.ok(Math.abs(settled.y - target.y) < 1e-8)
})

test('reticle range stays stable through repeated reversals while the launcher still turns slowly', () => {
  const { reticleAtAngle } = loadTs('lib/pigchicken/aim.ts')
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const c = createCombat(); c.give('launcher')
  const grip = { x: 720, y: 550 }, d = c.def()
  const body = { x: 720, y: 662, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const input = { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
  let previous = c.aimAngle
  for (let frame = 0; frame < 160; frame++) {
    const face = Math.floor(frame / 4) % 2 ? -1 : 1
    const target = { x: grip.x + face * 240, y: grip.y - 80 }
    c.step(.016, body, grip, grip, Math.atan2(target.y - grip.y, target.x - grip.x), input, [], 1000, () => {}, { world: false })
    const angle = c.aimAngle, cs = Math.cos(angle), sn = Math.sin(angle)
    const muzzle = { x: grip.x + d.muzzleX * cs - d.muzzleY * face * sn, y: grip.y + d.muzzleX * sn + d.muzzleY * face * cs }
    const r = reticleAtAngle(target, grip, muzzle, angle)
    assert.ok(Math.abs(Math.hypot(r.x - grip.x, r.y - grip.y) - Math.hypot(240, 80)) < 1e-7)
    const delta = Math.atan2(Math.sin(angle - previous), Math.cos(angle - previous))
    assert.ok(Math.abs(delta) <= d.turnRate * Math.PI / 180 * .016 + 1e-8)
    previous = angle
  }
})

test('reticle geometry remains finite when the mouse is inside the weapon or on the grip', () => {
  const { reticleAtAngle } = loadTs('lib/pigchicken/aim.ts')
  for (const target of [{ x: 0, y: 0 }, { x: 3, y: 1 }]) {
    const r = reticleAtAngle(target, { x: 0, y: 0 }, { x: 100, y: -20 }, 0)
    assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && r.distance >= 0)
  }
})

test('stick shortcut migration frees R3 from reload and Select from the wheel', () => {
  const previous = globalThis.window
  try {
    const saved = { ...controls.defaultChickenControls(), padXRun: true, padRunRBThrowY: true, padMeleeB: true, itemsV1: true, broodLTB: true }
    saved.pad.jump = ['Pad:b0', null, null]; saved.pad.itemWheel = ['Pad:b8', null, null]; saved.pad.reload = ['Pad:b11', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const next = controls.loadChickenControls()
    assert.deepEqual(next.pad.jump, ['Pad:b0', 'Pad:b11', null])
    assert.equal(next.pad.itemWheel[0], 'Pad:b10'); assert.equal(next.pad.reload[0], 'Pad:b9')
    assert.ok(!Object.values(next.pad).flat().includes('Pad:b8'))
    saved.pad.jump = ['Pad:b12', null, null]; saved.pad.reload = ['Pad:b4', null, null]; saved.pad.itemWheel = ['Pad:b13', null, null]
    const custom = controls.loadChickenControls()
    assert.equal(custom.pad.jump[0], 'Pad:b12'); assert.equal(custom.pad.reload[0], 'Pad:b4'); assert.equal(custom.pad.itemWheel[0], 'Pad:b13')
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('brood directional impulse respects axis limits and has no vertical impulse when horizontal', () => {
  const { directionalJumpImpulse } = loadTs('lib/chicken/jump-impulse.ts')
  assert.deepEqual(directionalJumpImpulse({ x: 1, y: 0 }, 675, 500), { x: 675, y: 0 })
  assert.deepEqual(directionalJumpImpulse({ x: -1, y: 0 }, 675, 500), { x: -675, y: 0 })
  assert.deepEqual(directionalJumpImpulse({ x: 0, y: -1 }, 675, 500), { x: 0, y: -500 })
  assert.deepEqual(directionalJumpImpulse({ x: 0, y: 1 }, 675, 500), { x: 0, y: 500 })
  const d = directionalJumpImpulse({ x: 1, y: -1 }, 675, 500)
  assert.ok(Math.abs(d.x + d.y) < 1e-8) // the joystick's 45-degree angle is preserved
  assert.ok(Math.abs((d.x / 675) ** 2 + (d.y / 500) ** 2 - 1) < 1e-8)
  const partial = directionalJumpImpulse({ x: .4, y: -.3 }, 1000, 500)
  assert.ok(Math.abs(partial.x / -partial.y - 4 / 3) < 1e-8)
  assert.ok(Math.abs((partial.x / 1000) ** 2 + (partial.y / 500) ** 2 - .25) < 1e-8)
  assert.deepEqual(directionalJumpImpulse({ x: 0, y: 0 }, 675, 500), { x: 0, y: 0 })
})

test('X stays secondary Run, and the RB-only default migrates without replacing custom run binds', () => {
  assert.deepEqual(controls.defaultChickenControls().pad.run, ['Pad:b5', 'Pad:b2', null])
  const previous = globalThis.window
  try {
    const saved = { ...controls.defaultChickenControls(), padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, itemsV1: true, broodLTB: true }
    saved.pad.run = ['Pad:b5', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    assert.deepEqual(controls.loadChickenControls().pad.run, ['Pad:b5', 'Pad:b2', null])
    saved.pad.run = ['Pad:b4', null, null]
    assert.deepEqual(controls.loadChickenControls().pad.run, saved.pad.run)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('keyboard defaults and legacy bindings migrate to G Throw, Tab next and Q wheel', () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual(d.keys.throw.filter(Boolean), ['Key:KeyG', 'Key:KeyZ'])
  assert.equal(d.keys.nextItem[0], 'Key:Tab')
  assert.equal(d.keys.itemWheel[0], 'Key:KeyQ')
  const previous = globalThis.window
  try {
    const saved = { ...d, itemsV1: true, grabE: true, throwF: true, keys2: true }
    saved.keys.throw = ['Key:KeyF', 'Key:KeyG', null]
    saved.keys.nextItem = ['Key:KeyQ', null, null]
    saved.keys.itemWheel = ['Key:Tab', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const migrated = controls.loadChickenControls()
    assert.deepEqual(migrated.keys.throw.filter(Boolean), ['Key:KeyG', 'Key:KeyZ'])
    assert.equal(migrated.keys.nextItem[0], 'Key:Tab')
    assert.equal(migrated.keys.itemWheel[0], 'Key:KeyQ')
    saved.keys.throw = ['Key:KeyT', null, null]
    saved.keys.nextItem = ['Key:KeyN', null, null]
    saved.keys.itemWheel = ['Key:KeyI', null, null]
    const custom = controls.loadChickenControls()
    assert.equal(custom.keys.throw[0], 'Key:KeyT')
    assert.equal(custom.keys.nextItem[0], 'Key:KeyN')
    assert.equal(custom.keys.itemWheel[0], 'Key:KeyI')
  } finally { globalThis.window = previous }
})

test('Backpedal defaults to 55% and migrates old custom values into central movement tuning', () => {
  const { defaultChickenConfig, normalizeChickenConfig, migrateLegacyBackpedal } = loadTs('lib/chicken/config.ts')
  const { loadParquinho, saveParquinho } = loadTs('lib/pigchicken/settings.ts')
  const previous=globalThis.window,store=new Map()
  globalThis.window={localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}}
  try {
    assert.equal(defaultChickenConfig().params.backpedal,55)
    store.set('pigchicken-parquinho-v1',JSON.stringify({backpedal:.7}))
    assert.equal(normalizeChickenConfig({params:{}}).params.backpedal,55)
    store.set('pigchicken-parquinho-v1',JSON.stringify({backpedal:.45}))
    const old=normalizeChickenConfig({params:{}})
    assert.equal(old.params.backpedal,45)
    migrateLegacyBackpedal()
    const settings=loadParquinho()
    assert.equal('backpedal' in settings,false)
    saveParquinho(settings)
    assert.equal(normalizeChickenConfig({params:{}}).params.backpedal,45,'old server payload must not erase migrated browser tuning')
    assert.equal(normalizeChickenConfig({params:{backpedal:80}}).params.backpedal,80)
  } finally {globalThis.window=previous}
})

test('Throw settings live together in Arremesso and old profiles gain 90% ground stop without resetting air tuning', () => {
  const {defaultChickenConfig,normalizeChickenConfig}=loadTs('lib/chicken/config.ts')
  const {CHICKEN_PARAM_META}=loadTs('lib/chicken/param-meta.ts')
  const fields=CHICKEN_PARAM_META.filter(p=>p.group==='Arremesso')
  assert.deepEqual(fields.map(p=>p.key),['throwAirStop','throwGroundStop','throwPoseAngle','throwPoseSpeed'])
  const defaults=defaultChickenConfig()
  assert.equal(defaults.params.throwGroundStop,90)
  const old=structuredClone(defaults);delete old.params.throwGroundStop;old.params.throwAirStop=35
  const migrated=normalizeChickenConfig(old)
  assert.equal(migrated.params.throwGroundStop,90)
  assert.equal(migrated.params.throwAirStop,35)
  migrated.params.throwGroundStop=0
  assert.equal(normalizeChickenConfig(migrated).params.throwGroundStop,0)
})

test('Deselect item defaults to F and migrates only when free, preserving custom and unbound controls', () => {
  assert.deepEqual(controls.defaultChickenControls().keys.deselectItem, ['Key:KeyF', null, null])
  const previous = globalThis.window
  try {
    const saved = { ...controls.defaultChickenControls(), itemsV1: true, keyboardInventoryQ: true, throwF: true }
    delete saved.keys.deselectItem
    saved.keys.throw = ['Key:KeyF', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let c = controls.loadChickenControls()
    assert.equal(c.keys.throw[0], 'Key:KeyG')
    assert.equal(c.keys.deselectItem[0], 'Key:KeyF')
    saved.keyboardThrowG = true
    saved.keys.throw = ['Key:KeyT', null, null]
    saved.keys2.reload = ['Key:KeyF', null]
    c = controls.loadChickenControls()
    assert.deepEqual(c.keys.deselectItem, [null, null, null])
    assert.equal(c.keys2.reload[0], 'Key:KeyF')
    saved.keys2.reload = [null, null]
    saved.keys.fire = ['Key:KeyF', null, null]
    assert.equal(controls.loadChickenControls().keys.deselectItem[0], null)
    saved.keys.deselectItem = [null, null, null]
    saved.keys.fire = ['Key:KeyX', null, null]
    assert.deepEqual(controls.loadChickenControls().keys.deselectItem, [null, null, null])
    saved.keys.deselectItem = ['Key:KeyH', null, null]
    assert.equal(controls.loadChickenControls().keys.deselectItem[0], 'Key:KeyH')
  } finally { globalThis.window = previous }
})

test('primary keyboard: V fires, C strikes, X broods and Z throws; the previous defaults migrate, custom binds stay', () => {
  const d = controls.defaultChickenControls().keys
  assert.deepEqual([d.fire, d.melee, d.down, d.throw, d.crouch], [['Key:KeyV', null, null], ['Key:KeyC', null, null], ['Key:ControlLeft', 'Key:KeyX', null], ['Key:KeyG', 'Key:KeyZ', null], ['Key:KeyS', null, null]])
  const previous = globalThis.window
  try {
    const flags = { padX: true, padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, padRunRBX: true, itemsV1: true, broodLTB: true, grabE: true, throwF: true, keyboardThrowG: true, keyboardInventoryQ: true, grabKeys2: true, noCmdBrood: true }
    const saved = { ...controls.defaultChickenControls(), ...flags }
    Object.assign(saved.keys, { fire: ['Key:KeyX', 'Key:KeyV', null], melee: ['Key:KeyZ', 'Key:KeyB', null], crouch: ['Key:KeyS', 'Key:KeyC', null], down: ['Key:ControlLeft', null, null], throw: ['Key:KeyG', null, null] })
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let k = controls.loadChickenControls().keys
    assert.deepEqual([k.fire, k.melee, k.crouch, k.down, k.throw], [['Key:KeyV', null, null], ['Key:KeyC', null, null], ['Key:KeyS', null, null], ['Key:ControlLeft', 'Key:KeyX', null], ['Key:KeyG', 'Key:KeyZ', null]])
    // custom: fire on X only and crouch keeping C stay; melee cannot take C and keeps its keys
    saved.keys.fire = ['Key:KeyX', null, null]
    saved.keys.crouch = ['Key:KeyC', null, null]
    k = controls.loadChickenControls().keys
    assert.deepEqual(k.fire, ['Key:KeyX', null, null]); assert.deepEqual(k.crouch, ['Key:KeyC', null, null])
    assert.deepEqual(k.melee, ['Key:KeyZ', 'Key:KeyB', null])
    assert.deepEqual(k.down, ['Key:ControlLeft', null, null])
    // once saved with the flag, nothing moves again
    saved.keyboardVCXZ = true
    saved.keys.fire = ['Key:KeyX', 'Key:KeyV', null]
    assert.deepEqual(controls.loadChickenControls().keys.fire, ['Key:KeyX', 'Key:KeyV', null])
  } finally { globalThis.window = previous }
})
