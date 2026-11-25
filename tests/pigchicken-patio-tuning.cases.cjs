// The panels' three levels (lib/pigchicken/patio-tuning.ts): the game's default, the open Pátio's own values
// ("Salvar no Pátio", only what differs) and this browser's changes; the Pátio's Lock; the game's defaults kept
// current in place (lib/game-defaults.ts); Camadas and Grade de blocos kept only with what differs.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')

const T = loadTs('lib/pigchicken/patio-tuning.ts')
const G = loadTs('lib/game-defaults.ts')
const S = loadTs('lib/pigchicken/patio-settings.ts')
const L = loadTs('lib/pigchicken/patio-layers.ts')
const M = loadTs('lib/pigchicken/mine-grid.ts')
const I = loadTs('lib/pigchicken/items.ts')

function withStorage(run) {
  const previous = globalThis.window
  const store = new Map()
  globalThis.window = { localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => { store.set(k, v) }, removeItem: k => { store.delete(k) } }, dispatchEvent() {} }
  globalThis.CustomEvent ??= class { constructor(type) { this.type = type } }
  T.forgetLocalTuning()
  try { return run(store) } finally { T.setPatioTuning(undefined, null); globalThis.window = previous; T.forgetLocalTuning() }
}

test('a diff keeps only what changed, at any depth, and goes back over its base', () => {
  const base = { a: 1, b: { c: 2, d: [1, 2] }, e: 'x' }
  const value = { a: 1, b: { c: 3, d: [1, 2] }, e: 'y' }
  const diff = T.deepDiff(base, value)
  assert.deepEqual(diff, { b: { c: 3 }, e: 'y' })
  assert.deepEqual(T.deepOver(base, diff), value)
  assert.equal(T.deepDiff(base, structuredClone(base)), undefined)
  // a key the base does not know is left out; a list counts whole
  assert.deepEqual(T.deepOver(base, { z: 1, b: { d: [9] } }), { a: 1, b: { c: 2, d: [9] }, e: 'x' })
  assert.deepEqual(T.dropDiffPath({ b: { c: 3 }, e: 'y' }, ['b', 'c']), { e: 'y' })
})

test('the value is the game\'s, the Pátio\'s over it and this browser\'s over that; a value nobody changed follows the game', () => withStorage(() => {
  T.setPatioTuning({ volume: { music: 0.2 } }, null)
  const game = { music: 0.8, notes: 0.5 }
  T.keepLocalTuning('volume', T.effectiveTuning('volume', game).base, { music: 0.2, notes: 0.9 })
  assert.deepEqual(T.localTuning('volume'), { notes: 0.9 })
  assert.deepEqual(T.effectiveTuning('volume', game).value, { music: 0.2, notes: 0.9 })
  // a new game default for a value nobody changed reaches it; the Pátio's stays
  assert.deepEqual(T.effectiveTuning('volume', { music: 0.1, notes: 0.5 }).value, { music: 0.2, notes: 0.9 })
  T.setLocalTuning('volume', undefined)
  assert.deepEqual(T.effectiveTuning('volume', { music: 0.1, notes: 0.3 }).value, { music: 0.2, notes: 0.3 })
}))

test('Salvar no Pátio keeps only what differs from the game, only for whoever may edit, and empties this browser\'s', () => withStorage(() => {
  const saved = []
  const game = { music: 0.8, notes: 0.5 }
  T.setPatioTuning(undefined, null)
  assert.equal(T.patioSaveOf('volume', game, { music: 0.8, notes: 0.1 }).canSave, false)
  T.setPatioTuning(undefined, (part, diff) => saved.push([part, diff]))
  T.setLocalTuning('volume', { notes: 0.1 })
  const s = T.patioSaveOf('volume', game, { music: 0.8, notes: 0.1 })
  assert.equal(s.canSave, true)
  assert.equal(s.changed, true)
  s.save()
  assert.deepEqual(saved, [['volume', { notes: 0.1 }]])
  assert.equal(T.localTuning('volume'), undefined)
  assert.equal(T.patioSaveOf('volume', game, { music: 0.8, notes: 0.1 }).changed, false)
  // back at the game's: the Pátio's values go
  T.patioSaveOf('volume', game, game).save()
  assert.deepEqual(saved[1], ['volume', undefined])
}))

test('Lock: whoever may not edit plays with the Pátio\'s values and changes nothing; its editors are not locked', () => withStorage(() => {
  const game = { music: 0.8 }
  T.setLocalTuning('volume', { music: 0.4 })
  T.setPatioTuning({ volume: { music: 0.6 } }, null, true)
  assert.equal(T.tuningLocked(), true)
  assert.deepEqual(T.effectiveTuning('volume', game).value, { music: 0.6 })
  T.setLocalTuning('volume', { music: 0.1 })
  // the browser's own change is kept for another Pátio
  T.setPatioTuning(undefined, null, false)
  assert.deepEqual(T.localTuning('volume'), { music: 0.4 })
  T.setPatioTuning({ volume: { music: 0.6 } }, () => {}, true)
  assert.equal(T.tuningLocked(), false)
  assert.deepEqual(T.effectiveTuning('volume', game).value, { music: 0.4 })
}))

test('a Pátio\'s tuning and Lock are read from its settings; anything unknown is dropped', () => {
  const s = S.normalizePatioSettings({ tuning: { camera: { lag: 3 }, nope: { a: 1 }, items: 'x' }, locked: true })
  assert.deepEqual(s.tuning, { camera: { lag: 3 } })
  assert.equal(s.locked, true)
  assert.equal(S.normalizePatioSettings({ locked: 'yes' }), undefined)
})

test('Camadas and Grade de blocos are kept only with what differs from the game, and read back whole', () => {
  const layers = { ...L.LAYERS_DEFAULT, zones: L.LAYERS_DEFAULT.zones === 50 ? 51 : 50 }
  const grid = { ...M.defaultMineGrid(), on: true, bombs: M.defaultMineGrid().bombs + 1 }
  const kept = S.compactPatioSettings({ layers, mineGrid: grid, screens: 3 })
  assert.deepEqual(kept.layers, { zones: layers.zones })
  assert.deepEqual(kept.mineGrid, { bombs: grid.bombs, on: true })
  assert.equal(kept.screens, 3)
  const back = S.normalizePatioSettings(kept)
  assert.deepEqual(back.layers, layers)
  assert.deepEqual(back.mineGrid, grid)
  // the same as the game: no layers of its own
  assert.equal(S.compactPatioSettings({ layers: { ...L.LAYERS_DEFAULT } }).layers, undefined)
})

test('a default saved in the game changes the module\'s default object in place and tells who listens', () => {
  let heard = null
  const off = G.onGameDefaults(parts => { heard = parts })
  const before = I.DEFAULT_ITEMS
  const file = I.itemsDefaultsFile(I.DEFAULT_ITEMS)
  const was = file.pistol.damage
  file.pistol.damage = was + 1
  G.adoptGameDefault('items', { value: file, revision: 7, updatedAt: null })
  assert.equal(I.DEFAULT_ITEMS, before)
  assert.equal(I.DEFAULT_ITEMS.pistol.damage, was + 1)
  assert.deepEqual(heard, ['items'])
  assert.equal(G.gameDefaultHeld('items').revision, 7)
  // the same revision again changes nothing
  heard = null
  G.adoptGameDefault('items', { value: file, revision: 7, updatedAt: null })
  assert.equal(heard, null)
  file.pistol.damage = was
  G.adoptGameDefault('items', { value: file, revision: 8, updatedAt: null })
  assert.equal(I.DEFAULT_ITEMS.pistol.damage, was)
  off()
})
