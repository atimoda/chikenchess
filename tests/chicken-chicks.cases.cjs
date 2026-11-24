const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { CHICKEN_PARAMS } = loadTs('lib/chicken/params.ts')
const { speciesParams, CHICK_FACTORS } = loadTs('lib/chicken/species.ts')
const Art = loadTs('lib/chicken/chick-art.ts')
const F = loadTs('lib/chicken/chick-follow.ts')

// a fixed sequence of "random" numbers
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length] }
const body = (x, y = 500, extra = {}) => ({ x, y, vx: 0, grounded: true, scale: 0.2, ...extra })

test('the chicken species keeps the configured tuning; the chick is smaller with much weaker jumps and flight', () => {
  const base = { ...CHICKEN_PARAMS, volume: 0.6 }
  assert.deepEqual(speciesParams('chicken', base), base)
  const c = speciesParams('chick', base)
  assert.ok(c.scale < base.scale * 0.5)
  assert.ok(c.jumpHeight <= base.jumpHeight * 0.35)
  for (const k of ['broodJumpBoost', 'airBroodJumpBoost', 'runBroodJumpBoost', 'airRunBroodJumpBoost', 'broodJumpVerticalBoost']) assert.ok(c[k] <= base[k] * 0.3, k)
  assert.ok(c.flyFallDivisor < base.flyFallDivisor && c.flyFallDivisor > 1)
  assert.ok(c.jumpFlaps >= 1 && c.jumpFlaps <= base.jumpFlaps)
  // the same mechanics: every key is still there, walking stays close enough to keep up
  assert.deepEqual(Object.keys(c).sort(), Object.keys(base).sort())
  assert.ok(c.walkSpeed >= base.walkSpeed * 0.75 && c.runMultiplier === base.runMultiplier)
  assert.equal(c.volume, 0)
  // the head (as the Kids were tuned in the game on 18/11): it shoots forward far and quick; it tilts much less running
  assert.ok(c.headLead > base.headLead && c.headSnapTime < base.headSnapTime && c.runHeadTilt <= base.runHeadTilt * 0.4)
  assert.ok(Object.keys(CHICK_FACTORS).every(k => k in base))
})

test('chick styles: realistic ones for the flock, strong colors kept for zones and events', () => {
  const real = Art.chickStyles('realista'), dyed = Art.chickStyles('colorido')
  assert.ok(real.length >= 8)
  assert.deepEqual(dyed.map(s => s.id), ['rosa', 'verde', 'laranja', 'roxo', 'amarelo-forte'])
  assert.equal(new Set(Art.CHICK_STYLES.map(s => s.id)).size, Art.CHICK_STYLES.length)
  for (let i = 0; i < 20; i++) assert.equal(Art.randomChickStyle('realista').kind, 'realista')
  assert.equal(Art.randomChickStyle('colorido', () => 0.99).id, 'amarelo-forte')
  for (const s of Art.CHICK_STYLES) {
    const a = Art.chickArt(s)
    assert.equal(a.comb.svg, '')
    assert.equal(a.wattle.svg, '')
    assert.ok(a.torso.svg.includes(s.down) && a.torso.svg.includes(s.belly))
    assert.ok(a.wing.backPath && a.face.eye && a.beak.mouth)
    assert.equal(a.legs.front.shank, s.legs)
  }
})

test('follow: rests within its gap, reacts after its own delay, then walks and runs toward her', () => {
  const b = F.createFollowBrain(seq(0.5))
  assert.equal(b.mode, 'rest')
  const me = body(0)
  // she is close: it stays
  let r = F.followStep(b, me, body(b.gap * 0.5), 0.1, seq(0.9))
  assert.deepEqual(r.actions, {})
  // she goes away: it waits its reaction delay first
  const far = body(600)
  r = F.followStep(b, me, far, 0.01, seq(0.9))
  assert.equal(b.mode, 'rest')
  for (let i = 0; i < 200 && b.mode === 'rest'; i++) r = F.followStep(b, me, far, 0.02, seq(0.9))
  assert.equal(b.mode, 'follow')
  r = F.followStep(b, me, far, 0.02, seq(0.9))
  assert.equal(r.actions.right, true)
  assert.equal(r.actions.run, true)
  // left side, close to its spot: walking, no running
  r = F.followStep(b, body(1000), body(1000 - b.gap - 120 - b.offset), 0.02, seq(0.9))
  assert.equal(r.actions.left, true)
  assert.ok(!r.actions.run)
})

test('follow: arriving inside the gap picks a new gap and spot, so the chicks do not move as one', () => {
  const b = F.createFollowBrain(seq(0.5))
  b.mode = 'follow'
  const before = { gap: b.gap, offset: b.offset }
  F.followStep(b, body(0), body(0 - b.offset), 0.02, seq(0.1, 0.9, 0.3))
  assert.equal(b.mode, 'rest')
  assert.notDeepEqual({ gap: b.gap, offset: b.offset }, before)
})

test('follow: hops in short presses to reach her when she is higher, then pauses before trying again', () => {
  const b = F.createFollowBrain(seq(0.5))
  const me = body(0, 500), up = body(80, 380)
  let presses = 0, wasJump = false
  for (let i = 0; i < 150; i++) {
    const r = F.followStep(b, me, up, 0.02, seq(0.5))
    if (r.actions.jump && !wasJump) presses++
    wasJump = !!r.actions.jump
  }
  assert.ok(presses >= 2 && presses <= 4, `presses ${presses}`)
  assert.ok(b.hop.cool > 0)
})

test('follow: a wall in the way makes it hop; far away for a while it is lost (dropped beside her)', () => {
  const b = F.createFollowBrain(seq(0.5))
  b.mode = 'follow'
  let jumped = false
  for (let i = 0; i < 40; i++) jumped = F.followStep(b, body(0), body(600), 0.02, seq(0.5)).actions.jump || jumped
  assert.ok(jumped)
  const c = F.createFollowBrain(seq(0.5))
  let lost = false
  for (let i = 0; i < 200 && !lost; i++) lost = F.followStep(c, body(0), body(F.FOLLOW.lostDist + 100), 0.02, seq(0.5)).lost
  assert.ok(lost)
})

test('follow: she is lower: it holds Crouch falling and drops through the floor it stands on (Crouch + Jump, no direction)', () => {
  const b = F.createFollowBrain(seq(0.5))
  const air = F.followStep(b, body(0, 300, { grounded: false }), body(100, 600), 0.02, seq(0.5))
  assert.equal(air.actions.crouch, true)
  let dropped = false
  for (let i = 0; i < 100 && !dropped; i++) {
    const a = F.followStep(b, body(0, 300), body(100, 600), 0.02, seq(0.5)).actions
    if (a.jump) { dropped = true; assert.equal(a.crouch, true); assert.ok(!a.left && !a.right) }
  }
  assert.ok(dropped)
  for (let i = 0; i < 5; i++) F.followStep(b, body(0, 300), body(100, 600), 0.02, seq(0.5))
  assert.ok(b.drop.cool > 0)
})
