const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const sz = loadTs('lib/pigchicken/sound-zones.ts')
const zp = loadTs('lib/pigchicken/zone-physics.ts')
const poop = loadTs('lib/pigchicken/poop.ts')

test("a Zona keeps its gravity and its x-ray only when they differ from the Earth's and off", () => {
  const d = sz.normalizeSoundZone({})
  assert.equal('gravity' in d, false); assert.equal('xray' in d, false)
  const z = sz.normalizeSoundZone({ gravity: 'moon', xray: true })
  assert.equal(z.gravity, 'moon'); assert.equal(z.xray, true)
  const e = sz.normalizeSoundZone({ gravity: 'earth', xray: 'yes' })
  assert.equal('gravity' in e, false, 'the Earth is the default'); assert.equal('xray' in e, false)
  assert.equal('gravity' in sz.normalizeSoundZone({ gravity: 'pluto' }), false, 'an unknown place is the Earth')
})

test('the gravity tag goes from the Earth through every planet, the Moon and the Sun, back to the Earth', () => {
  assert.equal(zp.gravityLabel(undefined), 'Terra · 100%')
  assert.equal(zp.gravityLabel('moon'), 'Lua · 17%')
  assert.equal(zp.gravityLabel('sun'), 'Sol · 2794%')
  const seen = []
  let id = 'earth'
  do { seen.push(id); id = zp.nextGravity(id) } while (id !== 'earth' && seen.length < 20)
  assert.equal(seen.length, zp.GRAVITIES.length)
  assert.deepEqual(new Set(seen), new Set(['earth', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']))
  assert.equal(zp.nextGravity(undefined), 'moon', 'from the Earth the next is the Moon')
})

test('the zone that wins at a point says what it does to the bodies there, music or not', () => {
  const box = (id, x, priority, p) => ({ id, x, y: 0, w: 100, h: 100, zone: { ...sz.normalizeSoundZone(p), priority } })
  const scene = box('cena0', 0, 0, { gravity: 'moon' })
  const map = box('z1', 50, 1, { xray: true, music: false })
  const zones = [scene, map]
  assert.deepEqual(zp.zoneEffectsAt(zones, 10, 50), { gravity: zp.GRAVITIES.find(g => g.id === 'moon').g, time: 1, xray: false })
  assert.deepEqual(zp.zoneEffectsAt(zones, 80, 50), { gravity: 1, time: 1, xray: true }, 'the map zone wins, with the Earth by default')
  assert.equal(zp.zoneEffectsAt(zones, 500, 50), zp.NO_EFFECTS)
  zp.setLiveZones(zones)
  assert.equal(zp.liveZoneEffectsAt(80, 50).xray, true)
  zp.setLiveZones([])
})

test("a bird's dropping falls slower on the Moon", () => {
  const a = poop.newPoop(0, 0, 0, 1, null, false, false), b = poop.newPoop(0, 0, 0, 1, null, false, false)
  for (let i = 0; i < 20; i++) { poop.poopFall(a, 1 / 60); poop.poopFall(b, 1 / 60, 0.165) }
  assert.ok(b.y < a.y && b.vy < a.vy)
})

test("a Zona's time keeps whole percents from 10 to 200; 100 (normal) is not saved", () => {
  assert.equal('time' in sz.normalizeSoundZone({ time: 100 }), false)
  assert.equal(sz.normalizeSoundZone({ time: 37.4 }).time, 37)
  assert.equal(sz.normalizeSoundZone({ time: 1 }).time, zp.ZONE_TIME.min)
  assert.equal(sz.normalizeSoundZone({ time: 999 }).time, zp.ZONE_TIME.max)
  assert.equal('time' in sz.normalizeSoundZone({ time: 'slow' }), false)
})

test('the time tag goes 100 → 50 → 25 → 10 → 100; a time of its own goes to the next step below', () => {
  assert.equal(zp.zoneTimeLabel(undefined), 'tempo 100%')
  const seen = []
  let t
  for (let i = 0; i < 5; i++) { t = zp.nextZoneTime(t); seen.push(t) }
  assert.deepEqual(seen, [50, 25, 10, 100, 50])
  assert.equal(zp.nextZoneTime(70), 50)
  assert.equal(zp.nextZoneTime(150), 100)
})

test('the time of the zone at a point is its share of the frame', () => {
  const z = { id: 'z', x: 0, y: 0, w: 100, h: 100, zone: { ...sz.normalizeSoundZone({ time: 25 }), priority: 1 } }
  assert.deepEqual(zp.zoneEffectsAt([z], 50, 50), { gravity: 1, time: 0.25, xray: false })
})
