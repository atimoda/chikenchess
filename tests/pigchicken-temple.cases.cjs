const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const temple = loadTs('lib/pigchicken/temple.ts')
const music = loadTs('lib/pigchicken/music.ts')
const { STAGE_MUSIC } = loadTs('lib/pigchicken/temple-music.ts')

// a frame of the temple without the browser: a conductor on the stage's zone, no platforms
function rig(seed = 7) {
  const t = temple.createTemple(seed)
  const conductor = music.createConductor()
  const targets = []
  const sounds = []
  const io = (over = {}) => {
    const evs = conductor.events.splice(0)
    return {
      targets, music: conductor, sceneL: 1920, groundY: 930, inside: true, body: { x: 1920 + 300, y: 930, scale: 1 }, boxes: [],
      gongHit: false, firePressed: false, beats: evs.filter(e => e.kind === 'beat').map(e => e.n),
      fx: { burst() {}, text() {} }, hurt() {}, sound: s => sounds.push(s), ...over,
    }
  }
  const frame = (dt = 1 / 60, over) => { conductor.step(dt); t.step(dt, io(over)) }
  const gong = n => { for (let i = 0; i < n; i++) frame(1 / 60, { gongHit: true }) }
  // everyone down (twice: the twins leave two minis behind)
  const killAll = () => { for (let k = 0; k < 3; k++) { targets.forEach(x => { if (x.kind === 'alien' && x.deadT <= 0) { x.hp = 0; x.deadT = 0.3 } }); frame() } }
  return { t, conductor, targets, sounds, frame, gong, io, killAll }
}

test('the gong starts the first stage after five strikes', () => {
  const r = rig()
  r.frame()
  assert.equal(r.t.state.phase, 'idle')
  r.gong(4)
  assert.equal(r.t.state.phase, 'idle')
  assert.equal(r.t.state.gongHits, 4)
  r.gong(1)
  assert.equal(r.t.state.phase, 'intro')
  assert.equal(r.t.state.aliens.length, 21)
  assert.equal(r.targets.filter(x => x.kind === 'alien').length, 21)
  assert.ok(r.sounds.some(s => s.kind === 'stageStart'))
})

test('the formation steps on the beat and bombs drop on the drop beats', () => {
  const r = rig()
  r.gong(5)
  for (let i = 0; i < 60 * 4; i++) r.frame()
  assert.equal(r.t.state.phase, 'playing')
  const x0 = r.t.state.f.goalX
  let bombs = 0
  for (let i = 0; i < 60 * 6; i++) { r.frame(); bombs = Math.max(bombs, r.t.state.bombs.length) }
  assert.notEqual(r.t.state.f.goalX, x0)
  assert.ok(bombs > 0)
  assert.ok(r.t.isDropBeat(4) && !r.t.isDropBeat(5))
})

test('clearing a stage shows the result and three strikes start the next one', () => {
  const r = rig()
  r.gong(5)
  for (let i = 0; i < 60 * 4; i++) r.frame()
  r.targets.forEach(x => { if (x.kind === 'alien') { x.hp = 0; x.deadT = 0.3 } })
  r.frame()
  assert.equal(r.t.state.phase, 'cleared')
  assert.ok(r.t.state.score >= 18 * 100)
  assert.equal(r.t.state.gongNeed, temple.GONG_NEXT)
  r.gong(3)
  assert.equal(r.t.state.phase, 'intro')
  assert.equal(r.t.state.stage, 1)
  assert.ok(r.t.state.aliens.some(a => a.sp === 'lantern'))
})

test('each stage brings its new alien, and the twins split in two', () => {
  const r = rig()
  const seen = []
  r.gong(5)
  for (let st = 0; st < temple.STAGES.length; st++) {
    seen.push(new Set(r.t.state.aliens.map(a => a.sp)))
    if (st === 3) {
      for (let i = 0; i < 60 * 4; i++) r.frame()
      const twin = r.targets.find(x => x.data?.species === 'twin')
      twin.hp = 0; twin.deadT = 0.3
      r.frame()
      assert.equal(r.t.state.aliens.filter(a => a.sp === 'mini').length, 2)
    }
    for (let i = 0; i < 60 * 4; i++) r.frame()
    r.killAll()
    if (st < temple.STAGES.length - 1) { assert.equal(r.t.state.phase, 'cleared'); r.gong(3) }
  }
  assert.ok(seen[1].has('lantern') && seen[2].has('shell') && seen[3].has('twin') && seen[4].has('drum') && seen[5].has('dragonHead'))
  assert.equal(r.t.state.phase, 'victory')
  assert.equal(STAGE_MUSIC.length, temple.STAGES.length)
  // the music grows: every stage keeps the layers of the one before
  STAGE_MUSIC.slice(1).forEach((m, i) => STAGE_MUSIC[i].layers.forEach(l => assert.ok(m.layers.includes(l) || l === 'wood' || l === 'hat', `${m.zone.name} ${l}`)))
})

test('the drums only open on the beat, and the dragon head while its body is there is shielded', () => {
  assert.ok(temple.drumOpen(0.05) && temple.drumOpen(0.95) && !temple.drumOpen(0.5))
  const r = rig()
  r.gong(5)
  // go straight to the dragon stage through the cleared ones
  for (let st = 0; st < 5; st++) { for (let i = 0; i < 60 * 4; i++) r.frame(); r.killAll(); r.gong(3) }
  for (let i = 0; i < 60; i++) r.frame()
  const head = r.targets.find(x => x.data?.species === 'dragonHead')
  assert.equal(head.shield, 1)
  r.targets.forEach(x => { if (x.data?.species === 'dragon') { x.hp = 0; x.deadT = 0.3 } })
  r.frame(); r.frame()
  assert.equal(head.shield, 0)
})

test('losing every heart fails the stage; the same seed plays the same game', () => {
  const r = rig()
  r.gong(5)
  for (let i = 0; i < 60 * 4; i++) r.frame()
  for (let k = 0; k < 3; k++) { r.t.state.invuln = 0; r.t.state.bombs.push({ x: 2220, y: 900, vx: 0, vy: 0, kind: 'orb', t: 0 }); r.frame() }
  assert.equal(r.t.state.phase, 'failed')
  assert.equal(r.t.state.aliens.length, 0)
  assert.equal(r.targets.filter(x => x.kind === 'alien').length, 0)
  r.gong(3)
  assert.equal(r.t.state.phase, 'intro'); assert.equal(r.t.state.stage, 0)
  const a = rig(42), b = rig(42)
  ;[a, b].forEach(x => { x.gong(5); for (let i = 0; i < 60 * 10; i++) x.frame() })
  assert.deepEqual(a.t.state.aliens.map(q => [q.x, q.y, q.charge]), b.t.state.aliens.map(q => [q.x, q.y, q.charge]))
  assert.equal(a.t.state.rng, b.t.state.rng)
})

test('the reset stone ends the game and clears the panels after a few strikes', () => {
  const r = rig()
  r.gong(5)
  for (let i = 0; i < 60 * 5; i++) r.frame()
  r.t.state.score = 1234
  r.frame(1 / 60, { resetHit: true }); r.frame(1 / 60, { resetHit: true })
  assert.equal(r.t.state.phase, 'playing')
  r.frame(1 / 60, { resetHit: true })
  assert.equal(r.t.state.phase, 'idle')
  assert.equal(r.t.state.score, 0)
  assert.equal(r.t.state.aliens.length, 0)
  assert.equal(r.targets.filter(x => x.kind === 'alien').length, 0)
  assert.ok(r.sounds.some(s => s.kind === 'reset' && s.hit === 3))
  // strikes too far apart do not add up
  r.t.state.score = 10
  r.frame(1 / 60, { resetHit: true }); for (let i = 0; i < 60 * 5; i++) r.frame(); r.frame(1 / 60, { resetHit: true })
  assert.equal(r.t.state.resetHits, 1)
})

test('the music has sections: groove, call and answer, riff, breakdown and build', () => {
  const tm = loadTs('lib/pigchicken/temple-music.ts')
  assert.deepEqual([0, 4, 8, 12, 14, 16].map(tm.sectionOf), ['A', 'A2', 'B', 'break', 'build', 'A'])
  STAGE_MUSIC.forEach((m, i) => assert.equal(m.groove, i))
})

test('the temple is one more scene after the Parquinho, with no loose platforms (its roofs are the floors)', () => {
  const world = loadTs('lib/pigchicken/world.ts')
  assert.equal(world.templeScene(4), 4)
  assert.equal(world.worldScenes(4), 6)
  assert.equal(world.worldPlatforms(4).length, 18)
  const all = world.worldPlatforms(4, true)
  assert.equal(all.length, 18)
  assert.equal(world.TEMPLE_PLATFORMS.length, 0)
  all.filter(p => p.id.startsWith('tp-')).forEach(p => assert.ok(p.x >= 4 * 1920 && p.x + p.w <= 5 * 1920))
})
