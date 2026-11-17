const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const P = loadTs('lib/pigchicken/mine-zone-params.ts')
const Z = loadTs('lib/pigchicken/mine-zones.ts')
const G = loadTs('lib/pigchicken/mine-grid.ts')
const { BEATS } = loadTs('lib/pigchicken/beats.ts')

const ALL = BEATS.map(b => b.id)

test('the blocks are sound zones by default, with 3% of rhythm drawn from every rhythm', () => {
  assert.deepEqual(P.normalizeMineZones(undefined), { on: true, rhythm: 3, all: true, pool: [], seed: 1 })
  assert.deepEqual(P.normalizeMineZones({ on: false, rhythm: 250, all: false, pool: ['samba', 'nope', 'rock', 'samba'], seed: -7.2 }), { on: false, rhythm: 100, all: false, pool: ['rock', 'samba'], seed: 7 })
  // every rhythm chosen one by one is "Todos"
  assert.equal(P.normalizeMineZones({ all: false, pool: ALL }).all, true)
  assert.deepEqual(P.mineZonePool({ all: true, pool: [] }), ALL)
})

test('"Todos" marks and clears every rhythm; clearing one clears "Todos"; marking the last one missing is "Todos" again', () => {
  const d = P.defaultMineZones()
  const none = P.toggleMineZoneBeat(d, 'all', false)
  assert.deepEqual([none.all, none.pool], [false, []])
  assert.equal(P.mineZonePoolLabel(none), 'Nenhum')
  const one = P.toggleMineZoneBeat(none, 'samba', true)
  assert.deepEqual([one.all, one.pool], [false, ['samba']])
  assert.equal(P.mineZonePoolLabel(one), 'Samba')
  const back = P.toggleMineZoneBeat(d, 'all', true)
  assert.deepEqual([back.all, back.pool], [true, []])
  const minus = P.toggleMineZoneBeat(d, 'rock', false)
  assert.equal(minus.all, false)
  assert.deepEqual(minus.pool, ALL.filter(id => id !== 'rock'))
  assert.equal(P.mineZoneHas(minus, 'rock'), false)
  assert.equal(P.mineZonePoolLabel(minus), `${ALL.length - 1} ritmos`)
  const full = P.toggleMineZoneBeat(minus, 'rock', true)
  assert.deepEqual([full.all, full.pool], [true, []])
})

test('the draw gives a rhythm to exactly the share asked, from the chosen ones, the same for the same seed', () => {
  const z = { ...P.defaultMineZones(), rhythm: 10 }
  const beats = Z.mineZoneBeats(200, z)
  assert.equal(beats.filter(b => b !== 'none').length, 20)
  assert.deepEqual(Z.mineZoneBeats(200, z), beats)
  assert.notDeepEqual(Z.mineZoneBeats(200, { ...z, seed: 99 }), beats)
  assert.ok(Z.mineZoneBeats(100, { ...z, rhythm: 0 }).every(b => b === 'none'))
  assert.ok(Z.mineZoneBeats(100, { ...z, rhythm: 100 }).every(b => b !== 'none'))
  // only the chosen rhythms; none chosen: all silent
  const two = { ...z, rhythm: 100, all: false, pool: ['samba', 'rock'] }
  assert.ok(Z.mineZoneBeats(50, two).every(b => b === 'samba' || b === 'rock'))
  assert.ok(Z.mineZoneBeats(50, { ...two, pool: [] }).every(b => b === 'none'))
})

test('each block is a zone of its scene with its own percussion, touching its neighbours, under the map\'s zones', () => {
  const geo = G.mineGeometry({ cell: 288, gap: 32 }, { width: 1920 * 2, top: -2000, ground: 930 })
  assert.deepEqual(Z.mineZoneBoxes(geo, { ...P.defaultMineZones(), on: false }, { screens: 2 }), [])
  const boxes = Z.mineZoneBoxes(geo, { ...P.defaultMineZones(), rhythm: 50 }, { screens: 2 })
  assert.equal(boxes.length, geo.cols * geo.rows)
  const [a, b] = boxes
  assert.equal(a.x + a.w, b.x)
  assert.ok(boxes.every(x => x.zone.priority > 0 && x.zone.priority < 1 && x.zone.life === 0 && x.zone.ambience.beat === x.beat))
  // the same scene and rhythm: one zone, shared
  const silent = boxes.filter(x => x.beat === 'none' && x.id === boxes.find(y => y.beat === 'none').id)
  assert.ok(silent.length > 1 && silent.every(x => x.zone === silent[0].zone))
  // the scene's key and bass stay
  const scene = loadTs('lib/pigchicken/sound-zones.ts').sceneZoneParams(undefined, 0)
  assert.equal(a.zone.root, scene.root)
  assert.equal(a.zone.ambience.bass, scene.ambience.bass)
})
