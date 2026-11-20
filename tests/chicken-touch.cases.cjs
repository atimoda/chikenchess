const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { resolveAim, keysAimFor, keysAimAfterMouse, createMouseOwner } = loadTs('lib/pigchicken/aim.ts')
const controls = loadTs('lib/chicken/controls.ts')
const layout = loadTs('lib/chicken/touch-layout.ts')

const base = { rightStick: null, mouse: null, touch: null, leftStick: null, keys: { x: 0, y: 0 }, origin: { x: 0, y: 0 }, face: 1, aimMagnetDeg: 0 }

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
  const snapped = resolveAim({ ...base, leftStick: { x: Math.cos(.1), y: -Math.sin(.1), mag: 1 }, aimMagnetDeg: 12 })
  assert.ok(Math.abs(snapped.angle) < 1e-12)
})

test('the left stick aims in all 8 directions, down included, on the ground too', () => {
  const s = Math.SQRT1_2
  const dirs = [[1, 0], [s, s], [0, 1], [-s, s], [-1, 0], [-s, -s], [0, -1], [s, -s]]
  for (const [x, y] of dirs) {
    const aim = resolveAim({ ...base, leftStick: { x, y, mag: 1 } })
    assert.equal(aim.source, 'leftStick')
    assert.ok(Math.abs(aim.angle - Math.atan2(y, x)) < 1e-9, `${x},${y} got ${aim.angle}`)
  }
})

test('the movement keys aim in the 8 directions, after the sticks and the mouse', () => {
  for (const [x, y] of [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]]) {
    const aim = resolveAim({ ...base, keys: { x, y } })
    assert.equal(aim.source, 'keys')
    assert.ok(Math.abs(aim.angle - Math.atan2(y, x)) < 1e-9)
  }
  assert.equal(resolveAim({ ...base, keys: { x: 0, y: -1 }, leftStick: { x: 1, y: 0, mag: 1 } }).source, 'leftStick')
  assert.equal(resolveAim({ ...base, keys: { x: 0, y: -1 }, mouse: { x: 50, y: 0 } }).source, 'mouse')
  assert.equal(resolveAim({ ...base }).source, 'facing')
})

test('the movement keys aim only for a player without the mouse', () => {
  assert.equal(keysAimFor(['kb1', 'kb2', 'mouse']), false)
  assert.equal(keysAimFor(['kb1', 'mouse', 'pad0']), false)
  assert.equal(keysAimFor(['kb2']), true)
  assert.equal(keysAimFor(['kb1', 'kb2', 'pad0']), true)
  assert.equal(keysAimFor(null), false)
})

test('with the mouse, the movement keys take the aim back after the mouse is still for the set time (0 = never)', () => {
  assert.equal(keysAimAfterMouse(['kb1', 'mouse'], 5), true)
  assert.equal(keysAimAfterMouse(['kb1', 'mouse'], 0), false)
  assert.equal(keysAimAfterMouse(['kb2'], 5), false)
  assert.equal(keysAimAfterMouse(null, 5), false)
  const owner = createMouseOwner()
  owner.moved(20, 1000)
  assert.equal(owner.owns, true)
  owner.otherAim(5999, 5)
  assert.equal(owner.owns, true)
  owner.otherAim(6000, 5)
  assert.equal(owner.owns, false)
  // moving the mouse takes it back
  owner.moved(20, 7000)
  assert.equal(owner.owns, true)
})

test('a PlayStation gamepad is told by its id and its buttons get PlayStation names', () => {
  for (const id of ['DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', '054c-09cc-Wireless Controller', 'PS4 Controller (Vendor: 054c Product: 09cc)', 'Sony DualShock 4', 'PlayStation(R)3 Controller']) {
    assert.equal(controls.padStyleOfId(id), 'playstation', id)
  }
  for (const id of ['Xbox 360 Controller (XInput STANDARD GAMEPAD)', '045e-02fd-Xbox Wireless Controller', 'Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)', '', null, undefined]) {
    assert.equal(controls.padStyleOfId(id), 'xbox', String(id))
  }
  assert.deepEqual(['Pad:b0', 'Pad:b1', 'Pad:b2', 'Pad:b3', 'Pad:b4', 'Pad:b7', 'Pad:b9', 'Pad:b11'].map(t => controls.chickenBindName(t, 'playstation')), ['✕', '○', '□', '△', 'L1', 'R2', 'Options', 'R3'])
  assert.deepEqual(['Pad:b0', 'Pad:b3', 'Pad:b4', 'Pad:b7', 'Pad:b9'].map(t => controls.chickenBindName(t, 'xbox')), ['A', 'Y', 'LB', 'RT', 'Start'])
  // sticks and keys do not change with the pad
  assert.equal(controls.chickenBindName('Pad:a1-', 'playstation'), 'LS ↑')
  assert.equal(controls.chickenBindName('Key:KeyW', 'playstation'), 'W')
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

test('gamepad defaults use X Run, R3 Throw, Y Melee, LT Brood, X Grab and LB/RB/B for the inventory groups', () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual(d.pad.run, ['Pad:b2', null, null])
  assert.deepEqual(d.pad.prevItem, [null, null, null])
  assert.deepEqual(d.pad.nextItem, [null, null, null])
  assert.deepEqual([d.pad.nextInstrument[0], d.pad.nextWeapon[0], d.pad.nextUtility[0]], ['Pad:b4', 'Pad:b5', 'Pad:b1'])
  assert.equal(d.pad.throw[0], 'Pad:b11')
  assert.equal(d.pad.melee[0], 'Pad:b3')
  assert.deepEqual(d.pad.down.filter(Boolean), ['Pad:b6'])
  assert.equal(d.pad.grab[0], 'Pad:b2')
  assert.deepEqual(d.pad.jump, ['Pad:b0', null, null])
  // one action per button
  const used = Object.values(d.pad).flat().filter(t => t && t !== 'Pad:b2')
  assert.equal(new Set(used).size, used.length)
  // L3 lets a soul out of the Gaiola (held: the next cage); the Roda do inventário has no button (15/11)
  assert.deepEqual(d.pad.itemWheel, [null, null, null])
  assert.deepEqual([d.pad.cageRelease[0], d.pad.cageSwap[0]], ['Pad:b10', null])
  assert.equal(d.pad.reload[0], 'Pad:b9')
  assert.ok(!Object.values(d.pad).flat().includes('Pad:b8'))
})

test('old default gamepad trio migrates without changing custom bindings', () => {
  const previous = globalThis.window
  try {
    const saved = { ...controls.defaultChickenControls(), padXRun: true, itemsV1: true, broodLTB: true }
    for (const a of ['nextInstrument', 'nextWeapon', 'nextUtility']) { delete saved.keys[a]; delete saved.pad[a] }
    saved.pad.run = ['Pad:b2', null, null]; saved.pad.throw = ['Pad:b5', null, null]; saved.pad.melee = ['Pad:b3', null, null]
    saved.pad.itemWheel = ['Pad:b8', null, null]; saved.pad.jump = ['Pad:b0', null, null]; saved.pad.reload = ['Pad:b11', null, null]
    for (const a of ['cageRelease', 'cageSwap']) { delete saved.keys[a]; delete saved.keys2[a]; delete saved.pad[a] }
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    assert.equal(controls.loadChickenControls().pad.run[0], 'Pad:b5')
    // Y first, then (09/11) R3, which leaves Jump
    assert.equal(controls.loadChickenControls().pad.throw[0], 'Pad:b11')
    assert.deepEqual(controls.loadChickenControls().pad.jump, ['Pad:b0', null, null])
    // Melee went to B, then (09/11) to Y, swapping with Próximo utilitário
    assert.equal(controls.loadChickenControls().pad.melee[0], 'Pad:b3')
    assert.equal(controls.loadChickenControls().pad.nextUtility[0], 'Pad:b1')
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
    saved.pad.melee = ['Pad:b10', null, null]; saved.pad.down = ['Pad:b6', 'Pad:b1', null]; saved.pad.run = ['Pad:b5', 'Pad:b2', null]; saved.pad.throw = ['Pad:b3', null, null]
    for (const a of ['nextInstrument', 'nextWeapon', 'nextUtility']) { delete saved.keys[a]; delete saved.pad[a] }
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const next = controls.loadChickenControls()
    // B first, Y since 09/11
    assert.equal(next.pad.melee[0], 'Pad:b3')
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
    saved.pad.jump = ['Pad:b0', null, null]; saved.pad.itemWheel = ['Pad:b8', null, null]; saved.pad.reload = ['Pad:b11', null, null]; saved.pad.throw = ['Pad:b3', null, null]
    for (const a of ['cageRelease', 'cageSwap']) { delete saved.keys[a]; delete saved.keys2[a]; delete saved.pad[a] }
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const next = controls.loadChickenControls()
    // R3 joined Jump then; since 09/11 it is Throw's
    assert.deepEqual(next.pad.jump, ['Pad:b0', null, null]); assert.equal(next.pad.throw[0], 'Pad:b11')
    // the wheel went from Select to L3 then; since 15/11 L3 lets a soul out of the Gaiola and the wheel has no button
    assert.deepEqual([next.pad.itemWheel[0], next.pad.cageRelease[0]], [null, 'Pad:b10']); assert.equal(next.pad.reload[0], 'Pad:b9')
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
  const previous = globalThis.window
  try {
    const saved = { ...controls.defaultChickenControls(), padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, itemsV1: true, broodLTB: true, shiftGrabLBRB: true }
    saved.pad.run = ['Pad:b5', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    assert.deepEqual(controls.loadChickenControls().pad.run, ['Pad:b5', 'Pad:b2', null])
    saved.pad.run = ['Pad:b4', null, null]
    assert.deepEqual(controls.loadChickenControls().pad.run, saved.pad.run)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('keyboard defaults and legacy bindings migrate to G Throw, Tab next instrument and T wheel', () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual(d.keys.throw.filter(Boolean), ['Key:KeyG'])
  assert.equal(d.keys.nextItem[0], null)
  assert.equal(d.keys.nextInstrument[0], 'Key:Tab')
  assert.equal(d.keys.itemWheel[0], 'Key:KeyT')
  const previous = globalThis.window
  try {
    const saved = { ...d, itemsV1: true, grabE: true, throwF: true, keys2: true }
    saved.keys.throw = ['Key:KeyF', 'Key:KeyG', null]
    saved.keys.nextItem = ['Key:KeyQ', null, null]
    saved.keys.itemWheel = ['Key:Tab', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    for (const a of ['nextInstrument', 'nextWeapon', 'nextUtility']) { delete saved.keys[a]; delete saved.pad[a] }
    const migrated = controls.loadChickenControls()
    assert.deepEqual(migrated.keys.throw.filter(Boolean), ['Key:KeyG'])
    // Tab next / Q wheel first, then (09/11) Tab next instrument, Q next weapon and T wheel, then (18/11) Q to
    // Próxima variação
    assert.equal(migrated.keys.nextItem[0], null)
    assert.equal(migrated.keys.nextInstrument[0], 'Key:Tab')
    assert.equal(migrated.keys.nextWeapon[0], null)
    assert.equal(migrated.keys.nextVariation[0], 'Key:KeyQ')
    assert.equal(migrated.keys.itemWheel[0], 'Key:KeyT')
    saved.keys.throw = ['Key:KeyT', null, null]
    saved.keys.nextItem = ['Key:KeyN', null, null]
    saved.keys.itemWheel = ['Key:KeyI', null, null]
    const custom = controls.loadChickenControls()
    assert.equal(custom.keys.throw[0], 'Key:KeyT')
    assert.equal(custom.keys.nextItem[0], 'Key:KeyN')
    assert.equal(custom.keys.itemWheel[0], 'Key:KeyI')
    // T is taken by the custom Throw: the wheel's new key never steals it
    assert.equal(custom.keys.nextInstrument[0], 'Key:Tab')
  } finally { globalThis.window = previous }
})

test('PigChicken movement defaults match the live tuning and migrate old custom backpedal values', () => {
  const { defaultChickenConfig, normalizeChickenConfig, migrateLegacyBackpedal } = loadTs('lib/chicken/config.ts')
  const { loadParquinho, saveParquinho } = loadTs('lib/pigchicken/settings.ts')
  const previous=globalThis.window,store=new Map()
  globalThis.window={localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}}
  try {
    assert.equal(defaultChickenConfig().params.acceleration,4500)
    assert.equal(defaultChickenConfig().params.backpedal,50)
    assert.equal(defaultChickenConfig().params.flyUpFallAtten,40)
    assert.equal(defaultChickenConfig().params.flyDownFallAtten,69)
    store.set('pigchicken-parquinho-v1',JSON.stringify({backpedal:.7}))
    assert.equal(normalizeChickenConfig({params:{}}).params.backpedal,50)
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

test('secondary keyboard defaults use right-hand punctuation and migrate once, preserving custom binds', () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual(d.keys2.down, ['Key:Slash', 'Key:ControlRight'])
  assert.deepEqual(d.keys2.grab, ['Key:KeyP', 'Key:ShiftRight'])
  assert.deepEqual(d.keys2.prevItem, ['Key:Quote', null])
  assert.deepEqual(d.keys2.fire, ['Key:Insert', 'Key:BracketRight'])
  // Home and End went to the Gaiolas (15/11): Golpe and Arremessar keep [ and \\
  assert.deepEqual(d.keys2.melee, ['Key:BracketLeft', null])
  assert.deepEqual([d.keys2.cageRelease, d.keys2.cageSwap], [['Key:End', null], ['Key:Home', null]])
  assert.deepEqual(d.keys2.jump, ['Key:PageUp', 'Key:Semicolon'])
  assert.deepEqual(d.keys2.throw, ['Key:Backslash', null])
  assert.deepEqual(d.keys2.crouch, ['Key:PageDown', 'Key:ArrowDown'])
  // no key repeats across both keyboards (the Shifts run and grab, as X on the gamepad)
  const all = controls.CHICKEN_ACTIONS.filter(a => a.key !== 'grab').flatMap(a => [...d.keys[a.key], ...d.keys2[a.key]]).filter(Boolean)
  assert.equal(new Set(all).size, all.length)
  assert.equal(controls.chickenBindName('Key:BracketRight'), ']')
  assert.equal(controls.chickenBindName('Key:Quote'), "'")
  const previous = globalThis.window
  try {
    const old = () => {
      const saved = { ...controls.defaultChickenControls(), itemsV1: true, grabE: true, throwF: true, keyboardThrowG: true, keyboardInventoryQ: true, keyboardVCXZ: true, keyboardJumpZ: true, grabKeys2: true, noCmdBrood: true }
      Object.assign(saved.keys2, { down: ['Key:ArrowDown', 'Key:ControlRight'], grab: ['Key:Slash', null], prevItem: ['Key:Backslash', null], fire: ['Key:Insert', null], melee: ['Key:Home', null], jump: ['Key:PageUp', null], throw: ['Key:End', null], crouch: ['Key:PageDown', null] })
      return saved
    }
    let saved = old()
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    assert.deepEqual(controls.loadChickenControls().keys2, d.keys2)
    // custom binds stay; a key taken elsewhere is not added
    saved = old()
    saved.keys2.grab = ['Key:Slash', 'Key:KeyK']
    saved.keys.reload = ['Key:KeyR', 'Key:BracketRight', null]
    const c = controls.loadChickenControls()
    assert.deepEqual(c.keys2.grab, ['Key:Slash', 'Key:KeyK'])
    assert.deepEqual(c.keys2.down, ['Key:ArrowDown', 'Key:ControlRight'])
    assert.deepEqual(c.keys2.fire, ['Key:Insert', null])
    assert.deepEqual(c.keys2.melee, ['Key:BracketLeft', null], 'it got [ and then (15/11) gave Home to the Gaiolas')
    assert.deepEqual(c.keys2.crouch, ['Key:PageDown', null], 'the down arrow stays on brood, so crouch does not get it')
    // once saved with the marker, a removed key does not come back
    saved = { ...old(), keys2Punctuation: true }
    assert.deepEqual(controls.loadChickenControls().keys2.jump, ['Key:PageUp', null])
  } finally { globalThis.window = previous }
})

test("the Gaiolas' binds: H / End / L3 let a soul out, Y / Home turn the cages, and saved controls get them once", () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual([d.keys.cageRelease[0], d.keys.cageSwap[0], d.keys2.cageRelease[0], d.keys2.cageSwap[0], d.pad.cageRelease[0], d.pad.cageSwap[0]], ['Key:KeyH', 'Key:KeyY', 'Key:End', 'Key:Home', 'Pad:b10', null])
  const previous = globalThis.window
  try {
    const FLAGS = ['padX', 'padXRun', 'padRunRBThrowY', 'padMeleeB', 'padStickShortcuts', 'padRunRBX', 'itemsV1', 'broodLTB', 'grabE', 'throwF', 'keyboardThrowG', 'keyboardInventoryQ', 'keyboardVCXZ', 'keyboardJumpZ', 'grabKeys2', 'keys2Punctuation', 'noCmdBrood', 'shiftGrabLBRB', 'inventoryGroupBinds', 'padMeleeY', 'keys2NoDelBksp']
    // controls saved on the day before: End and Home on Arremessar and Golpe, L3 on the Roda do inventário
    const old = () => {
      const saved = { ...JSON.parse(JSON.stringify(controls.defaultChickenControls())), ...Object.fromEntries(FLAGS.map(f => [f, true])) }
      for (const a of ['cageRelease', 'cageSwap']) { delete saved.keys[a]; delete saved.keys2[a]; delete saved.pad[a] }
      saved.keys2.throw = ['Key:End', 'Key:Backslash']; saved.keys2.melee = ['Key:Home', 'Key:BracketLeft']; saved.pad.itemWheel = ['Pad:b10', null, null]
      return saved
    }
    let saved = old()
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const next = controls.loadChickenControls()
    assert.deepEqual(next.keys, d.keys); assert.deepEqual(next.keys2, d.keys2); assert.deepEqual(next.pad, d.pad)
    // custom binds stay, and a key or button something else holds does not go to the cages
    saved = old()
    saved.keys.reload = ['Key:KeyR', 'Key:KeyH', null]; saved.keys2.throw = ['Key:End', null]; saved.pad.itemWheel = ['Pad:b10', 'Pad:b13', null]
    const c = controls.loadChickenControls()
    assert.deepEqual([c.keys.cageRelease[0], c.keys.cageSwap[0]], [null, 'Key:KeyY'])
    assert.deepEqual([c.keys2.throw, c.keys2.cageRelease, c.keys2.melee, c.keys2.cageSwap], [['Key:End', null], [null, null], ['Key:BracketLeft', null], ['Key:Home', null]])
    assert.deepEqual([c.pad.itemWheel, c.pad.cageRelease], [['Pad:b10', 'Pad:b13', null], [null, null, null]])
    // once saved with the marker, a bind taken off does not come back
    saved = { ...old(), cageBinds: true }
    saved.keys.cageRelease = [null, null, null]; saved.keys.cageSwap = ['Key:KeyU', null, null]; saved.keys2.cageRelease = [null, null]; saved.keys2.cageSwap = [null, null]; saved.pad.cageRelease = [null, null, null]; saved.pad.cageSwap = ['Pad:b10', null, null]
    const kept = controls.loadChickenControls()
    assert.deepEqual([kept.keys.cageRelease[0], kept.keys.cageSwap[0], kept.keys2.cageRelease[0], kept.pad.cageRelease[0], kept.pad.cageSwap[0]], [null, 'Key:KeyU', null, null, 'Pad:b10'])
    assert.deepEqual(kept.keys2.throw, ['Key:End', 'Key:Backslash'], 'and nothing else moves')
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('Del and Backspace leave the secondary keyboard, once, also on saved controls', () => {
  const d = controls.defaultChickenControls()
  const all2 = controls.CHICKEN_ACTIONS.flatMap(a => d.keys2[a.key])
  assert.ok(!all2.includes('Key:Delete') && !all2.includes('Key:Backspace'))
  const previous = globalThis.window
  try {
    let saved = { ...controls.defaultChickenControls(), keys2Punctuation: true, grabKeys2: true }
    Object.assign(saved.keys2, { nextItem: ['Key:Delete', null], reload: ['Key:Backspace', null] })
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    const c = controls.loadChickenControls()
    assert.deepEqual(c.keys2.nextItem, [null, null])
    assert.deepEqual(c.keys2.reload, [null, null])
    // after the migration the player may bind them again
    saved = { ...saved, keys2NoDelBksp: true }
    assert.deepEqual(controls.loadChickenControls().keys2.nextItem, ['Key:Delete', null])
  } finally { globalThis.window = previous }
})

test('Deselect item defaults to B (F until 09/11) and migrates only when free, preserving custom and unbound controls', () => {
  assert.deepEqual(controls.defaultChickenControls().keys.deselectItem, ['Key:KeyB', null, null])
  const previous = globalThis.window
  try {
    const saved = { ...controls.defaultChickenControls(), itemsV1: true, keyboardInventoryQ: true, throwF: true }
    delete saved.keys.deselectItem
    for (const a of ['nextInstrument', 'nextWeapon', 'nextUtility']) { delete saved.keys[a]; delete saved.pad[a] }
    saved.keys.throw = ['Key:KeyF', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let c = controls.loadChickenControls()
    assert.equal(c.keys.throw[0], 'Key:KeyG')
    // F first, then B, leaving F to Próximo utilitário
    assert.equal(c.keys.deselectItem[0], 'Key:KeyB')
    assert.equal(c.keys.nextUtility[0], 'Key:KeyF')
    saved.keyboardThrowG = true
    saved.keys.throw = ['Key:KeyT', null, null]
    saved.keys2.reload = ['Key:KeyF', null]
    c = controls.loadChickenControls()
    assert.deepEqual(c.keys.deselectItem, [null, null, null])
    assert.equal(c.keys2.reload[0], 'Key:KeyF')
    assert.equal(c.keys.nextUtility[0], null)
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

test('primary keyboard: V fires, C strikes, X broods and G throws; previous defaults migrate, custom binds stay', () => {
  const d = controls.defaultChickenControls().keys
  assert.deepEqual([d.fire, d.melee, d.down, d.throw, d.crouch], [['Key:KeyV', null, null], ['Key:KeyC', null, null], ['Key:ControlLeft', 'Key:KeyX', null], ['Key:KeyG', null, null], ['Key:KeyS', null, null]])
  const previous = globalThis.window
  try {
    const flags = { padX: true, padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, padRunRBX: true, itemsV1: true, broodLTB: true, grabE: true, throwF: true, keyboardThrowG: true, keyboardInventoryQ: true, grabKeys2: true, noCmdBrood: true }
    const saved = { ...controls.defaultChickenControls(), ...flags }
    Object.assign(saved.keys, { fire: ['Key:KeyX', 'Key:KeyV', null], melee: ['Key:KeyZ', 'Key:KeyB', null], crouch: ['Key:KeyS', 'Key:KeyC', null], down: ['Key:ControlLeft', null, null], throw: ['Key:KeyG', null, null] })
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let k = controls.loadChickenControls().keys
    assert.deepEqual([k.fire, k.melee, k.crouch, k.down, k.throw], [['Key:KeyV', null, null], ['Key:KeyC', null, null], ['Key:KeyS', null, null], ['Key:ControlLeft', 'Key:KeyX', null], ['Key:KeyG', null, null]])
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

test('the bottom inventory bar keeps its own position, apart from the phone stack', () => {
  const store = {}
  const previous = globalThis.window
  globalThis.window = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v } } }
  try {
    layout.resetTouchLayout()
    layout.setTouchOffset('inventory', { x: -40, y: 10 })
    layout.setTouchOffset('inventoryBar', { x: 30, y: -12 })
    layout.finishTouchLayoutEdit()
    const persisted = JSON.parse(store['chickenchess-chicken-touch-layout-v1'])
    assert.deepEqual(persisted.inventoryBar, { x: 30, y: -12 })
    assert.deepEqual(persisted.inventory, { x: -40, y: 10 })
    layout.resetTouchLayout(); layout.finishTouchLayoutEdit()
  } finally { globalThis.window = previous }
})

test('air shocking jump charges from 2× to the chosen limit and applies the timeout once', () => {
  const {shockingAirMultiplier,advanceShockingAirCharge}=loadTs('lib/chicken/jump-impulse.ts')
  assert.equal(shockingAirMultiplier(0,2,4),2)
  assert.equal(shockingAirMultiplier(1,2,4),3)
  assert.equal(shockingAirMultiplier(2,2,4),4)
  assert.equal(shockingAirMultiplier(20,2,4),4)
  assert.equal(shockingAirMultiplier(1,2,1),1.5)
  let c=advanceShockingAirCharge(1.5,false,.4,2,2)
  assert.equal(c.applied,false);assert.equal(c.velocityMultiplier,1)
  c=advanceShockingAirCharge(c.elapsed,c.applied,.1,2,2)
  assert.equal(c.applied,true);assert.equal(c.velocityMultiplier,2)
  c=advanceShockingAirCharge(c.elapsed,c.applied,1,2,2)
  assert.equal(c.velocityMultiplier,1,'do not multiply again on later frames')
  assert.equal(advanceShockingAirCharge(1.9,false,.2,2,-2).velocityMultiplier,-2,'negative values reverse the vertical velocity')
  assert.equal(advanceShockingAirCharge(1.9,false,.2,2,0).velocityMultiplier,0)
  const {normalizeChickenConfig}=loadTs('lib/chicken/config.ts')
  const old=normalizeChickenConfig({params:{shockingAirStop:65}}).params
  assert.equal(old.shockingAirStop,65);assert.equal(old.shockingAirMaxMultiplier,4)
  assert.equal(old.shockingAirChargeTime,2);assert.equal(old.shockingAirAfterTimeMultiplier,2)
})


test('Z moves from the old Throw default to secondary Jump without replacing custom bindings', () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual(d.keys.jump, ['Key:Space','Key:KeyZ',null])
  assert.deepEqual(d.keys.throw, ['Key:KeyG',null,null])
  const previous=globalThis.window
  try {
    const saved={...d,keyboardVCXZ:true,keyboardThrowG:true,keyboardInventoryQ:true,grabKeys2:true,noCmdBrood:true}
    saved.keys.jump=['Key:Space',null,null];saved.keys.throw=['Key:KeyG','Key:KeyZ',null]
    globalThis.window={localStorage:{getItem:()=>JSON.stringify(saved),setItem:()=>{}},dispatchEvent:()=>{}}
    let next=controls.loadChickenControls()
    assert.deepEqual(next.keys.jump,['Key:Space','Key:KeyZ',null]);assert.deepEqual(next.keys.throw,['Key:KeyG',null,null])
    saved.keys.jump=['Key:KeyJ',null,null];next=controls.loadChickenControls()
    assert.deepEqual(next.keys.jump,saved.keys.jump);assert.deepEqual(next.keys.throw,saved.keys.throw)
    saved.keys.jump=['Key:Space',null,null];saved.keys.throw=['Key:KeyT','Key:KeyZ',null];next=controls.loadChickenControls()
    assert.deepEqual(next.keys.jump,saved.keys.jump);assert.deepEqual(next.keys.throw,saved.keys.throw)
    saved.keys.throw=['Key:KeyG',null,null];saved.keys.melee=['Key:KeyZ',null,null];next=controls.loadChickenControls()
    assert.deepEqual(next.keys.jump,saved.keys.jump);assert.deepEqual(next.keys.melee,saved.keys.melee)
    saved.keys.melee=['Key:KeyC',null,null];saved.keyboardJumpZ=true;next=controls.loadChickenControls()
    assert.deepEqual(next.keys.jump,saved.keys.jump,'explicitly saved removal remains removed')
  } finally { if(previous===undefined)delete globalThis.window;else globalThis.window=previous }
})

test('air shocking pose folds from half to full and opens straight on release', () => {
  const {shockingAirLegPose}=loadTs('lib/chicken/shocking-pose.ts')
  const early=shockingAirLegPose(0,2,90,false),middle=shockingAirLegPose(1,2,90,false),late=shockingAirLegPose(2,2,90,false),release=shockingAirLegPose(2,2,90,true)
  assert.equal(early.front.tib,45);assert.equal(middle.front.tib,67.5);assert.equal(late.front.tib,90)
  assert.ok(early.front.leg > middle.front.leg && middle.front.leg > late.front.leg, 'legs open gradually with the charge')
  assert.equal(late.back.tib,-90);assert.deepEqual(shockingAirLegPose(8,2,90,false),late)
  assert.ok(release.front.leg < early.front.leg && release.back.leg > early.back.leg)
  assert.equal(release.front.tib,0);assert.equal(release.front.shin,0);assert.equal(release.back.tib,0);assert.equal(release.back.shin,0)
  assert.equal(shockingAirLegPose(0,2,60,false).front.tib,30)
})


test('movement and aim magnets are independent, including touch, right stick and mouse', () => {
  const {magnetVector}=loadTs('lib/chicken/analog-magnet.ts')
  const stick={x:Math.cos(.1),y:Math.sin(.1),mag:.7}
  assert.strictEqual(magnetVector(stick,0),stick)
  const snapped=magnetVector(stick,10)
  assert.ok(Math.abs(snapped.y)<1e-10);assert.equal(snapped.mag,.7)
  assert.ok(Math.abs(magnetVector(stick,1).y-stick.y)<1e-10)
  assert.equal(magnetVector({x:-1,y:.01},10).y,0,'no phantom axis with a zero dead zone')
  for(const key of ['leftStick','rightStick','touch']) {
    const raw=resolveAim({...base,[key]:stick,aimMagnetDeg:0})
    const magnetic=resolveAim({...base,[key]:stick,aimMagnetDeg:10})
    assert.ok(Math.abs(raw.angle-.1)<1e-9,key);assert.ok(Math.abs(magnetic.angle)<1e-9,key)
  }
  const mouse=resolveAim({...base,mouse:{x:100,y:10},aimMagnetDeg:22.5})
  assert.ok(mouse.angle>0,'mouse stays exact')
})

test('legacy magnet settings migrate without losing their remembered movement strength', () => {
 const previous=globalThis.window
 try {
  let raw=JSON.stringify({analog:{magnet:true,magnetDeg:6}})
  globalThis.window={localStorage:{getItem:()=>raw,setItem:(_,v)=>{raw=v}},dispatchEvent:()=>{}}
  let a=controls.loadChickenControls().analog
  assert.equal(a.magnetDeg,6);assert.equal(a.magnet,true);assert.equal(a.aimMagnetDeg,0)
  raw=JSON.stringify({analog:{magnet:false,magnetDeg:7}});a=controls.loadChickenControls().analog
  assert.equal(a.magnetDeg,0);assert.equal(a.magnet,false);assert.equal(a.magnetRestoreDeg,7)
  raw=JSON.stringify({analog:{magnet:true,magnetDeg:0,aimMagnetDeg:4}});a=controls.loadChickenControls().analog
  assert.equal(a.magnet,false);assert.equal(a.aimMagnetDeg,4)
  raw=JSON.stringify({});a=controls.loadChickenControls().analog
  assert.equal(a.magnetDeg,0);assert.equal(a.aimMagnetDeg,0)
 } finally {if(previous===undefined)delete globalThis.window;else globalThis.window=previous}
})

test('movement magnet snaps only the movement stick before mapped gamepad actions', () => {
 const D=loadTs('lib/chicken/input-devices.ts'),old=globalThis.navigator
 try {
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[{connected:true,buttons:[],axes:[.9,.48,.9,.48]}]}})
  const raw=D.padTokensFor(null,.5,0),snapped=D.padTokensFor(null,.5,20)
  assert.equal(raw.has('Pad:a1+'),false);assert.equal(snapped.has('Pad:a1+'),true)
  assert.equal(raw.has('Pad:a3+'),false);assert.equal(snapped.has('Pad:a3+'),false,'right stick untouched')
 } finally {if(old===undefined)delete globalThis.navigator;else Object.defineProperty(globalThis,'navigator',{configurable:true,value:old})}
})

test('Shift dir. also grabs (Shift esq. no longer) and LB/RB go back/forward an item, migrating only the previous defaults', () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual(d.keys.grab, ['Key:KeyE', null, null])
  assert.deepEqual(d.keys2.grab, ['Key:KeyP', 'Key:ShiftRight'])
  assert.deepEqual(d.keys.run[0], 'Key:ShiftLeft')
  assert.deepEqual(d.keys2.run[0], 'Key:ShiftRight')
  const previous = globalThis.window
  try {
    const marks = { padX: true, padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, padRunRBX: true, itemsV1: true, broodLTB: true, grabE: true, throwF: true, keyboardThrowG: true, keyboardInventoryQ: true, keyboardVCXZ: true, keyboardJumpZ: true, grabKeys2: true, keys2Punctuation: true, noCmdBrood: true, keys2: true }
    const old = () => {
      const saved = { ...controls.defaultChickenControls(), ...marks }
      saved.keys.grab = ['Key:KeyE', null, null]; saved.keys2.grab = ['Key:KeyP', null]
      saved.pad.run = ['Pad:b5', 'Pad:b2', null]; saved.pad.nextItem = ['Pad:b4', null, null]; saved.pad.prevItem = [null, null, null]
      saved.keys.nextItem = ['Key:Tab', null, null]; saved.keys.itemWheel = ['Key:KeyQ', null, null]; saved.keys.deselectItem = ['Key:KeyF', null, null]
      saved.pad.throw = ['Pad:b3', null, null]; saved.pad.jump = ['Pad:b0', 'Pad:b11', null]; saved.pad.melee = ['Pad:b1', null, null]
      for (const a of ['nextInstrument', 'nextWeapon', 'nextUtility']) { delete saved.keys[a]; delete saved.pad[a] }
      return saved
    }
    let saved = old()
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let c = controls.loadChickenControls()
    assert.deepEqual(c.keys.grab, d.keys.grab)
    assert.deepEqual(c.keys2.grab, d.keys2.grab)
    assert.deepEqual([c.pad.run, c.pad.prevItem, c.pad.nextItem], [d.pad.run, d.pad.prevItem, d.pad.nextItem])
    // and on to the 09/11 defaults: every action ends where a fresh profile starts
    assert.deepEqual(c.pad, d.pad)
    assert.deepEqual(c.keys, d.keys)
    // custom binds stay
    saved = old(); saved.keys.grab = ['Key:KeyE', 'Key:KeyK', null]; saved.pad.nextItem = ['Pad:b12', null, null]
    c = controls.loadChickenControls()
    assert.deepEqual(c.keys.grab, ['Key:KeyE', 'Key:KeyK', null])
    assert.deepEqual([c.pad.run, c.pad.nextItem], [['Pad:b5', 'Pad:b2', null], ['Pad:b12', null, null]])
    // once saved with the marker, nothing changes
    saved = { ...old(), shiftGrabLBRB: true }
    c = controls.loadChickenControls()
    assert.deepEqual(c.keys.grab, ['Key:KeyE', null, null])
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('the inventory group binds (09/11) take Tab / Q / F and LB / RB / B (Y to Melee), moving only the previous defaults', () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual([d.keys.nextInstrument[0], d.keys.nextWeapon[0], d.keys.nextVariation[0], d.keys.nextUtility[0], d.keys.itemWheel[0], d.keys.deselectItem[0]], ['Key:Tab', null, 'Key:KeyQ', 'Key:KeyF', 'Key:KeyT', 'Key:KeyB'])
  const keys = Object.values(d.keys).flat().filter(t => t && t !== 'Key:ShiftLeft')
  assert.equal(new Set(keys).size, keys.length, 'one action per primary key')
  const previous = globalThis.window
  try {
    const marks = { padX: true, padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, padRunRBX: true, itemsV1: true, broodLTB: true, grabE: true, throwF: true, keyboardThrowG: true, keyboardInventoryQ: true, keyboardVCXZ: true, keyboardJumpZ: true, grabKeys2: true, keys2Punctuation: true, noCmdBrood: true, shiftGrabLBRB: true }
    // the 08/11 defaults, saved before the group binds existed
    const old = () => {
      const saved = { ...controls.defaultChickenControls(), ...marks }
      saved.keys.nextItem = ['Key:Tab', null, null]; saved.keys.itemWheel = ['Key:KeyQ', null, null]; saved.keys.deselectItem = ['Key:KeyF', null, null]
      saved.pad.nextItem = ['Pad:b5', null, null]; saved.pad.prevItem = ['Pad:b4', null, null]; saved.pad.throw = ['Pad:b3', null, null]; saved.pad.jump = ['Pad:b0', 'Pad:b11', null]; saved.pad.melee = ['Pad:b1', null, null]
      for (const a of ['nextInstrument', 'nextWeapon', 'nextUtility']) { delete saved.keys[a]; delete saved.pad[a] }
      return saved
    }
    let saved = old()
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let c = controls.loadChickenControls()
    assert.deepEqual(c.keys, d.keys); assert.deepEqual(c.pad, d.pad); assert.deepEqual(c.keys2, d.keys2)
    // custom binds stay, and a new bind never takes a key or button something else holds
    saved = old()
    saved.keys.nextItem = ['Key:KeyN', null, null]; saved.keys.reload = ['Key:Tab', null, null]; saved.keys.itemWheel = ['Key:KeyI', null, null]
    saved.pad.nextItem = ['Pad:b12', null, null]; saved.pad.throw = ['Pad:b7', null, null]; saved.pad.fire = ['Pad:b3', null, null]
    c = controls.loadChickenControls()
    assert.deepEqual([c.keys.nextItem[0], c.keys.reload[0], c.keys.itemWheel[0], c.keys.nextInstrument[0], c.keys.nextWeapon[0], c.keys.nextVariation[0]], ['Key:KeyN', 'Key:Tab', 'Key:KeyI', null, null, 'Key:KeyQ'])
    assert.deepEqual([c.pad.nextItem[0], c.pad.prevItem[0], c.pad.throw[0], c.pad.jump[1], c.pad.nextUtility[0]], ['Pad:b12', 'Pad:b4', 'Pad:b7', 'Pad:b11', null])
    // LB is still Item anterior there, so Próximo instrumento waits for it to be freed
    assert.equal(c.pad.nextInstrument[0], null)
    // once saved with the marker, a cleared group bind stays cleared
    saved = { ...controls.defaultChickenControls(), ...marks, inventoryGroupBinds: true }
    saved.keys.nextWeapon = [null, null, null]
    c = controls.loadChickenControls()
    assert.deepEqual(c.keys.nextWeapon, [null, null, null])
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('Y is Melee and B Próximo utilitário on the gamepad; the first group-bind defaults swap once, custom ones stay', () => {
  const previous = globalThis.window
  try {
    const d = controls.defaultChickenControls()
    const saved = { ...d, padX: true, padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, padRunRBX: true, itemsV1: true, broodLTB: true, shiftGrabLBRB: true, inventoryGroupBinds: true }
    saved.pad.melee = ['Pad:b1', null, null]; saved.pad.nextUtility = ['Pad:b3', null, null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let c = controls.loadChickenControls()
    const fresh = controls.defaultChickenControls()
    assert.deepEqual([c.pad.melee, c.pad.nextUtility], [fresh.pad.melee, fresh.pad.nextUtility])
    assert.deepEqual([fresh.pad.melee[0], fresh.pad.nextUtility[0]], ['Pad:b3', 'Pad:b1'])
    saved.pad.nextUtility = ['Pad:b12', null, null]
    c = controls.loadChickenControls()
    assert.deepEqual([c.pad.melee[0], c.pad.nextUtility[0]], ['Pad:b1', 'Pad:b12'])
    saved.pad.nextUtility = ['Pad:b3', null, null]; saved.padMeleeY = true
    c = controls.loadChickenControls()
    assert.deepEqual([c.pad.melee[0], c.pad.nextUtility[0]], ['Pad:b1', 'Pad:b3'])
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('the mouse wheel: up is Próximo item and down Item anterior by default; each direction can be any action, and is saved', () => {
  let raw = null
  globalThis.window = { localStorage: { getItem: () => raw, setItem: (_, v) => { raw = v } }, dispatchEvent() {} }
  assert.deepEqual(controls.loadChickenControls().wheel, { up: 'nextItem', down: 'prevItem' })
  const c = controls.loadChickenControls()
  c.wheel.up = 'fire'; c.wheel.down = 'jump'
  controls.saveChickenControls(c)
  assert.deepEqual(controls.loadChickenControls().wheel, { up: 'fire', down: 'jump' })
  assert.deepEqual(controls.chickenControlsDefaultsFile(controls.loadChickenControls()).wheel, { up: 'fire', down: 'jump' })
  // an unknown action falls back to the default; null (no action) stays
  raw = JSON.stringify({ wheel: { up: 'nope', down: null } })
  assert.deepEqual(controls.loadChickenControls().wheel, { up: 'nextItem', down: null })
})

test('the Harpa\'s own binds: Sustenido is Shift (each keyboard) and L3 by default, saved apart from the actions; a Pegar that is one of the seated instrument\'s binds keeps her seated', () => {
  let raw = null
  globalThis.window = { localStorage: { getItem: () => raw, setItem: (_, v) => { raw = v } }, dispatchEvent() {} }
  const IB = loadTs('lib/pigchicken/instrument-binds.ts')
  const { DEFAULT_KIT } = loadTs('lib/pigchicken/drum-kit.ts')
  const c = controls.loadChickenControls()
  assert.deepEqual(c.harp, { keys: { sharp: ['Key:ShiftLeft', null, null] }, keys2: { sharp: ['Key:ShiftRight', null] }, pad: { sharp: ['Pad:b10', null, null] } })
  // a key of the Harpa never leaves the action that also has it
  assert.ok(c.keys.run.includes('Key:ShiftLeft'))
  assert.deepEqual(IB.harpTokens(c, 'sharp', ['kb2']), ['Key:ShiftRight'])
  assert.deepEqual(IB.harpTokens(c, 'sharp', ['pad0']), ['Pad:b10'])
  const pad = []; pad[10] = 1
  assert.equal(IB.harpHeld(c, 'sharp', ['pad0'], new Set(), pad), true)
  assert.equal(IB.harpHeld(c, 'sharp', ['pad0'], new Set(), []), false)
  // Pegar by Shift dir. (also the sustenido) keeps her at the Harpa; by E, or the gamepad's X, it gets her up
  const harp = IB.seatTokens('harp', c, null, DEFAULT_KIT)
  assert.equal(IB.grabIsSeatBind(c, ['kb2'], new Set(['Key:ShiftRight']), [], harp), true)
  // Shift esq. is not Pegar any more (20/11): held alone it does nothing to the seat
  assert.equal(IB.grabIsSeatBind(c, ['kb1'], new Set(['Key:ShiftLeft']), [], harp), false)
  assert.equal(IB.grabIsSeatBind(c, ['kb1'], new Set(['Key:KeyE']), [], harp), false)
  const x = []; x[2] = 1
  assert.equal(IB.grabIsSeatBind(c, ['pad0'], new Set(), x, harp), false)
  // nothing held (the on-screen Pegar): it gets her up
  assert.equal(IB.grabIsSeatBind(c, null, new Set(), [], harp), false)
  // saved, and in the defaults file
  c.harp.pad.sharp = ['Pad:b2', null, null]
  controls.saveChickenControls(c)
  assert.deepEqual(controls.loadChickenControls().harp.pad.sharp, ['Pad:b2', null, null])
  assert.deepEqual(controls.chickenControlsDefaultsFile(controls.loadChickenControls()).harp.pad.sharp, ['Pad:b2', null, null])
})

test('Próxima variação (18/11) takes Q from Próxima arma once; custom binds and the switches’ checkboxes stay', () => {
  const d = controls.defaultChickenControls()
  assert.deepEqual([d.keys.nextVariation, d.keys2.nextVariation, d.pad.nextVariation], [['Key:KeyQ', null, null], [null, null], [null, null, null]])
  assert.deepEqual(d.keys.nextWeapon, [null, null, null])
  assert.deepEqual(d.variations, { nextItem: false, prevItem: false, nextInstrument: false, nextWeapon: false, nextUtility: false })
  const previous = globalThis.window
  try {
    // the 17/11 defaults, saved before Próxima variação existed
    const old = () => {
      const saved = JSON.parse(JSON.stringify({ ...controls.defaultChickenControls(), cageBinds: true, padX: true, padXRun: true, padRunRBThrowY: true, padMeleeB: true, padStickShortcuts: true, padRunRBX: true, itemsV1: true, broodLTB: true, grabE: true, throwF: true, keyboardThrowG: true, keyboardInventoryQ: true, keyboardVCXZ: true, keyboardJumpZ: true, grabKeys2: true, keys2Punctuation: true, noCmdBrood: true, shiftGrabLBRB: true, inventoryGroupBinds: true, padMeleeY: true, keys2NoDelBksp: true }))
      saved.keys.nextWeapon = ['Key:KeyQ', null, null]
      delete saved.keys.nextVariation; delete saved.keys2.nextVariation; delete saved.pad.nextVariation; delete saved.variations
      return saved
    }
    let saved = old()
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    let c = controls.loadChickenControls()
    assert.deepEqual(c.keys, d.keys); assert.deepEqual(c.variations, d.variations)
    // Próxima arma moved off Q: it stays there, and Q is not taken by Próxima variação
    saved = old(); saved.keys.nextWeapon = ['Key:KeyN', null, null]; saved.keys.reload = ['Key:KeyQ', null, null]
    c = controls.loadChickenControls()
    assert.deepEqual([c.keys.nextWeapon[0], c.keys.reload[0], c.keys.nextVariation[0]], ['Key:KeyN', 'Key:KeyQ', null])
    // once saved with the marker, a cleared bind stays cleared and the checkboxes load as saved
    saved = { ...controls.defaultChickenControls(), variationBind: true, inventoryGroupBinds: true, cageBinds: true }
    saved.keys.nextVariation = [null, null, null]; saved.variations = { ...d.variations, nextInstrument: true }
    c = controls.loadChickenControls()
    assert.deepEqual(c.keys.nextVariation, [null, null, null])
    assert.equal(c.variations.nextInstrument, true)
    assert.equal(c.variations.nextItem, false)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('the inventory alignment (18/11) defaults to split, survives a save and falls back on an unknown value', () => {
  const was = globalThis.window
  try {
    assert.equal(controls.defaultChickenControls().inventory.align, 'split')
    assert.deepEqual(controls.INVENTORY_ALIGNS.map(a => a.value), ['center', 'split', 'left', 'right'])
    // controls saved before the option: the new default
    globalThis.window = { localStorage: { getItem: () => JSON.stringify({ inventory: { repeatDelay: 2, repeatInterval: 0.5 } }) } }
    assert.deepEqual(controls.loadChickenControls().inventory, { repeatDelay: 2, repeatInterval: 0.5, align: 'split' })
    globalThis.window = { localStorage: { getItem: () => JSON.stringify({ inventory: { align: 'left' } }) } }
    assert.equal(controls.loadChickenControls().inventory.align, 'left')
    globalThis.window = { localStorage: { getItem: () => JSON.stringify({ inventory: { align: 'middle' } }) } }
    assert.equal(controls.loadChickenControls().inventory.align, 'split')
    assert.equal(controls.chickenControlsDefaultsFile({ ...controls.defaultChickenControls(), inventory: { repeatDelay: 1.5, repeatInterval: 0.3, align: 'right' } }).inventory.align, 'right')
  } finally { globalThis.window = was }
})

test('Shift esq. leaves Pegar (20/11): only the previous default E + Shift esq. loses it, once', () => {
  const previous = globalThis.window
  try {
    const d = controls.defaultChickenControls()
    assert.deepEqual(d.keys.grab, ['Key:KeyE', null, null])
    assert.equal(d.keys.run[0], 'Key:ShiftLeft', 'Shift esq. stays on Correr')
    let saved = { ...JSON.parse(JSON.stringify(d)), keys2: d.keys2, shiftGrabLBRB: true, inventoryGroupBinds: true, padMeleeY: true, keys2NoDelBksp: true, cageBinds: true, variationBind: true }
    saved.keys.grab = ['Key:KeyE', 'Key:ShiftLeft', null]
    globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved) } }
    assert.deepEqual(controls.loadChickenControls().keys.grab, ['Key:KeyE', null, null])
    // a custom Pegar keeps Shift esq.
    saved.keys.grab = ['Key:KeyK', 'Key:ShiftLeft', null]
    assert.deepEqual(controls.loadChickenControls().keys.grab, ['Key:KeyK', 'Key:ShiftLeft', null])
    // saved after the change (the marker), the player's own E + Shift esq. stays
    saved = { ...saved, grabNoShiftLeft: true }; saved.keys.grab = ['Key:KeyE', 'Key:ShiftLeft', null]
    assert.deepEqual(controls.loadChickenControls().keys.grab, ['Key:KeyE', 'Key:ShiftLeft', null])
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('Tela serve como mira starts on and the aim stick hidden; both are saved and in the defaults file', () => {
  const previous = globalThis.window
  try {
    const d = controls.defaultChickenControls()
    assert.equal(d.touchScreenAim, true)
    assert.equal(d.touchAimStick, false)
    const file = controls.chickenControlsDefaultsFile(d)
    assert.equal(file.touchScreenAim, true); assert.equal(file.touchAimStick, false)
    let raw = JSON.stringify({ touchScreenAim: false, touchAimStick: true })
    globalThis.window = { localStorage: { getItem: () => raw } }
    const c = controls.loadChickenControls()
    assert.equal(c.touchScreenAim, false); assert.equal(c.touchAimStick, true)
    // a save from before them: the defaults
    raw = JSON.stringify({ touch: 'on' })
    const old = controls.loadChickenControls()
    assert.equal(old.touchScreenAim, true); assert.equal(old.touchAimStick, false)
  } finally { if (previous === undefined) delete globalThis.window; else globalThis.window = previous }
})

test('the touch controls default to the 20/11 layout; a moved control keeps its own offset and Padrão goes back to the default', () => {
  const d = layout.DEFAULT_TOUCH_OFFSETS
  for (const id of ['move', 'run', 'down', 'jump', 'aim', 'melee', 'throw', 'itemWheel', 'grab']) assert.ok(d[id], id)
  assert.equal(d.inventory, undefined, 'the inventory keeps its corner')
  assert.deepEqual(layout.touchOffset({}, 'jump'), d.jump)
  assert.deepEqual(layout.touchOffset({ jump: { x: 5, y: 6 } }, 'jump'), { x: 5, y: 6 })
  assert.equal(layout.touchOffset({}, 'inventory'), undefined)
})
