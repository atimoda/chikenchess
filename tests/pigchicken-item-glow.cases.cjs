const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const G = loadTs('lib/pigchicken/item-glow.ts')
const PS = loadTs('lib/pigchicken/patio-settings.ts')

test('Brilho dos itens: off without the setting, cleaned and kept with the Pátio', () => {
  const C = G.ITEM_GLOW_COLORS
  assert.equal(PS.patioItemGlow(undefined).amount, 0)
  assert.deepEqual(PS.patioItemGlow({ screens: 3 }).colors, C)
  assert.equal(PS.normalizePatioSettings({ screens: 3 }).itemGlow, undefined)
  assert.deepEqual(G.normalizeItemGlow({ amount: 140.4, colors: { weapon: '#ABCDEF' } }), { amount: 100, colors: { ...C, weapon: '#abcdef' } })
  assert.deepEqual(G.normalizeItemGlow({ amount: -3, colors: { utility: 'red' } }), { amount: 0, colors: C })
  assert.equal(G.normalizeItemGlow({ colors: C }), undefined)
  // a Pátio saved with one color for every item keeps it for the instruments; the other groups get their own
  assert.deepEqual(G.normalizeItemGlow({ amount: 40, color: '#4cc9f0' }).colors, { ...C, instrument: '#4cc9f0' })
  assert.deepEqual(PS.normalizePatioSettings({ itemGlow: { amount: 40, colors: { ...C, consumable: '#123456' } } }).itemGlow, { amount: 40, colors: { ...C, consumable: '#123456' } })
  // Salvar no game keeps it for a new empty Pátio
  assert.equal(PS.patioSettingsDefaultsFile({ itemGlow: { amount: 70, colors: C } }, 3).itemGlow.amount, 70)
  assert.equal(PS.patioSettingsOver({ itemGlow: { amount: 70, colors: C } }).itemGlow.amount, 70)
  assert.ok(PS.PATIO_DEFAULT_KEYS.includes('itemGlow'))
})

test('Brilho dos itens: each group of items has its color (weapons purple, utilities blue, consumables green)', () => {
  const C = G.ITEM_GLOW_COLORS
  assert.equal(C.weapon, '#b05cff'); assert.equal(C.utility, '#3d8bff'); assert.equal(C.consumable, '#3ddc84')
  for (const [id, group] of [['pistol', 'weapon'], ['bow', 'weapon'], ['grenade', 'weapon'], ['flute', 'instrument'], ['harp', 'instrument'],
    ['maryjane', 'consumable'], ['cok', 'consumable'], ['bat', 'utility'], ['passagua', 'utility'], ['mjolnir', 'utility'], ['key', 'utility'],
    ['goldkey', 'utility'], ['minebomb', 'utility'], ['cage', 'utility']]) assert.equal(G.itemGlowGroup(id), group, id)
  const glow = { amount: 50, colors: { ...C, weapon: '#000001' } }
  assert.equal(G.itemGlowColor(glow, 'smg'), '#000001')
  assert.equal(G.itemGlowColor(glow, 'cok'), C.consumable)
  assert.ok(G.sameItemGlowColors(C) && !G.sameItemGlowColors(glow.colors))
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
