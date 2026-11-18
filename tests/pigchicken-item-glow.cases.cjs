const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const G = loadTs('lib/pigchicken/item-glow.ts')
const PS = loadTs('lib/pigchicken/patio-settings.ts')

test('Brilho dos itens: off without the setting, cleaned and kept with the Pátio', () => {
  assert.equal(PS.patioItemGlow(undefined).amount, 0)
  assert.equal(PS.patioItemGlow({ screens: 3 }).color, G.ITEM_GLOW_COLOR)
  assert.equal(PS.normalizePatioSettings({ screens: 3 }).itemGlow, undefined)
  assert.deepEqual(G.normalizeItemGlow({ amount: 140.4, color: '#ABCDEF' }), { amount: 100, color: '#abcdef' })
  assert.deepEqual(G.normalizeItemGlow({ amount: -3, color: 'red' }), { amount: 0, color: G.ITEM_GLOW_COLOR })
  assert.equal(G.normalizeItemGlow({ color: '#ffffff' }), undefined)
  assert.deepEqual(PS.normalizePatioSettings({ itemGlow: { amount: 40, color: '#4cc9f0' } }).itemGlow, { amount: 40, color: '#4cc9f0' })
  // Salvar no game keeps it for a new empty Pátio
  assert.equal(PS.patioSettingsDefaultsFile({ itemGlow: { amount: 70, color: '#ffc93c' } }, 3).itemGlow.amount, 70)
  assert.equal(PS.patioSettingsOver({ itemGlow: { amount: 70, color: '#ffc93c' } }).itemGlow.amount, 70)
  assert.ok(PS.PATIO_DEFAULT_KEYS.includes('itemGlow'))
})

test('Brilho dos itens: 0 is off, low values much softer than the top', () => {
  assert.equal(G.itemGlowLook(0), null)
  const low = G.itemGlowLook(1), mid = G.itemGlowLook(50), top = G.itemGlowLook(100)
  for (const k of ['beam', 'beamH', 'beamW', 'halo', 'haloR', 'rim', 'rimW', 'pool']) {
    assert.ok(low[k] < mid[k] && mid[k] < top[k], k)
  }
  assert.ok(low.beam < top.beam / 8)
  assert.ok(top.beam <= 1 && top.halo <= 1 && top.rim <= 1)
  assert.deepEqual(G.itemGlowLook(500), top)
})
