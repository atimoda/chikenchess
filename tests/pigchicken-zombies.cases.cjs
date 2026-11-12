const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const en = loadTs('lib/pigchicken/enemies.ts')

const GROUND = 500
const zombieAt = (targets, x) => { en.spawnZombieAt(targets, x, GROUND); const z = targets[targets.length - 1]; z.data.speed = 70; return z }
// a seeded random, so a run is repeatable
const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
const envFor = (her, o = {}) => ({ playerX: her.x, playerY: her.y, groundY: GROUND, viewL: -2000, viewR: 2000, onBite: () => { o.bites = (o.bites ?? 0) + 1 }, rand: seeded(), ...o.env })
const run = (targets, e, secs, each) => { for (let t = 0; t < secs; t += 1 / 60) { targets.forEach(z => en.stepEnemy(z, 1 / 60, e)); each?.(t) } }

test('with her up on a platform, the zombies prowl around her instead of piling up under her', () => {
  const her = { x: 0, y: GROUND - 220 }
  const targets = [], o = {}
  ;[-700, -500, -300, 300, 500, 700].forEach(x => zombieAt(targets, x))
  const e = envFor(her, o)
  const seen = targets.map(() => new Set())
  let idle = 0
  run(targets, e, 30, t => {
    if (t < 15) return
    targets.forEach((z, i) => { seen[i].add(Math.round(z.x / 40)); if (z.state === 'idle') idle++ })
  })
  const xs = targets.map(z => z.x)
  assert.ok(xs.every(x => Math.abs(x - her.x) <= en.ZOMBIE_ROAM.far + 1), `they stay near her: ${xs.map(Math.round)}`)
  const sorted = [...xs].sort((a, b) => a - b)
  assert.ok(sorted[sorted.length - 1] - sorted[0] > 200, 'spread out to both sides')
  assert.ok(new Set(xs.map(x => Math.round(x / 10))).size >= 5, `not on one spot: ${xs.map(Math.round)}`)
  assert.ok(seen.every(s => s.size >= 3), 'each one keeps walking about')
  assert.ok(idle > 0, 'they stop now and then, looking at her')
  assert.ok(targets.every(z => z.state !== 'attack') && !o.bites, 'no bites while she is out of reach')
  assert.ok(targets.every(z => z.state !== 'idle' || Math.sign(her.x - z.x) === z.face || Math.abs(her.x - z.x) < 1), 'standing ones face her')
})

test('when she comes down they go for her again and bite', () => {
  const her = { x: 0, y: GROUND - 220 }
  const targets = [], o = {}
  zombieAt(targets, -400); zombieAt(targets, 400)
  const e = envFor(her, o)
  run(targets, e, 8)
  e.playerY = GROUND
  run(targets, e, 8)
  assert.ok(o.bites > 0, 'bitten')
  assert.ok(targets.every(z => Math.abs(z.x - her.x) < 90), 'both next to her')
})

test('a short jump does not make them give up the chase', () => {
  const her = { x: 0, y: GROUND }
  const targets = []
  const z = zombieAt(targets, -600)
  const e = envFor(her)
  run(targets, e, 1)
  const before = z.x
  e.playerY = GROUND - 200
  run(targets, e, en.ZOMBIE_ROAM.lost * 0.8)
  assert.ok(z.x > before + 20 && z.state === 'walk', 'still walking at her')
  assert.equal(en.zombieRoamSpot(z), null)
  run(targets, e, 1)
  assert.notEqual(en.zombieRoamSpot(z), null, 'after a while out of reach it prowls')
})
