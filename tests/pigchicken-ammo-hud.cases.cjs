const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const { DEFAULT_ITEMS, WEAPON_IDS, INSTRUMENT_IDS } = loadTs('lib/pigchicken/items.ts')
const { ammoLook, ammoTurns, hudSlot, nextSlot, litRounds, newAmmoView, stepAmmoView, aroundVisibility, AMMO_HUD_R } = loadTs('lib/pigchicken/ammo-hud.ts')

const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
const step = (c, over = {}, dt = 0.016) => c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...over }, [], 1000, () => {})
const wait = (c, s, over = {}) => { for (let t = 0; t < s - 1e-9; t += 0.01) step(c, over, 0.01) }
// a charged throw: hold Atirar, then let go
const throwOne = c => { step(c, { fire: true, firePressed: true }, 0.01); wait(c, 0.9, { fire: true }); step(c, {}, 0.01) }
const R = AMMO_HUD_R
const frame = (look, owned, ammo, over = {}) => ({ owned, look, ammo, reload: 0, draw: 0, wake: false, hud: { x: 0, y: 0, R, alpha: 1 }, around: { x: 0, y: 0, scale: 1, alpha: 1, after: 0.5, fade: 1.5 }, ...over })

test('each weapon has its tambor / pente; instruments, the Taco and the Granada have none', () => {
  const styles = Object.fromEntries(['pistol', 'smg', 'rifle', 'pump', 'sniper', 'launcher', 'bow'].map(id => [id, ammoLook(id, DEFAULT_ITEMS[id]).style]))
  assert.deepEqual(styles, { pistol: 'revolver', smg: 'trios', rifle: 'arcs', pump: 'shotgun', sniper: 'column', launcher: 'flanks', bow: 'fan' })
  assert.equal(ammoLook('grenade', DEFAULT_ITEMS.grenade), null)
  assert.equal(ammoLook('bat', DEFAULT_ITEMS.bat), null)
  for (const id of INSTRUMENT_IDS) assert.equal(ammoLook(id, DEFAULT_ITEMS[id]), null, id)
  for (const id of WEAPON_IDS) if (id !== 'grenade') assert.equal(ammoLook(id, DEFAULT_ITEMS[id]).n, DEFAULT_ITEMS[id].mag, id)
  assert.equal(ammoTurns('revolver'), true); assert.equal(ammoTurns('shotgun'), true); assert.equal(ammoTurns('trios'), false)
})

test('the cylinders fire from the top chamber; the bow\'s arrows go from right to left, the next one pulled back', () => {
  const pistol = ammoLook('pistol', DEFAULT_ITEMS.pistol)
  assert.equal(nextSlot(pistol, 7), 0)
  const top = hudSlot(pistol, R, 0, 0, 12, 0)
  assert.ok(Math.abs(top.x) < 1e-9 && top.y < 0)
  // just after a shot (rot 1) each chamber is still one place on: chamber 0 sits where chamber 1 goes
  const turned = hudSlot(pistol, R, 0, 1, 11, 0), one = hudSlot(pistol, R, 1, 0, 11, 0)
  assert.ok(Math.abs(turned.x - one.x) < 1e-9 && Math.abs(turned.y - one.y) < 1e-9)
  const bow = ammoLook('bow', DEFAULT_ITEMS.bow)
  assert.equal(nextSlot(bow, 12), 11)
  const first = hudSlot(bow, R, 0, 0, 12, 0), last = hudSlot(bow, R, 11, 0, 12, 0)
  assert.ok(first.x < 0 && last.x > 0, 'slot 0 on the left, the last (used first) on the right')
  assert.ok(first.y > 0 && last.y > 0, 'under the reticle')
  // pointing at the centre
  assert.ok(Math.abs(Math.cos(last.a) + last.x / Math.hypot(last.x, last.y)) < 1e-9)
  const pulled = hudSlot(bow, R, 11, 0, 12, 1)
  assert.ok(Math.hypot(pulled.x, pulled.y) > Math.hypot(last.x, last.y) + R * 0.29)
  assert.equal(Math.hypot(hudSlot(bow, R, 10, 0, 12, 1).x, hudSlot(bow, R, 10, 0, 12, 1).y).toFixed(6), Math.hypot(hudSlot(bow, R, 10, 0, 12, 0).x, hudSlot(bow, R, 10, 0, 12, 0).y).toFixed(6))
})

test('a reload lights the rounds up as it goes; the Escopeta\'s come in one at a time', () => {
  const smg = ammoLook('smg', DEFAULT_ITEMS.smg)
  assert.equal(litRounds(smg, 5, 0, false), 5)
  assert.equal(litRounds(smg, 5, 0.5, false), 17)
  assert.equal(litRounds(smg, 30, 0.5, false), 30)
  assert.equal(litRounds(ammoLook('pump', DEFAULT_ITEMS.pump), 2, 0.9, true), 2)
})

test('the view: taking the weapon shows the ring, a shot turns it and drops the round, a reload or Próxima variação shows it again', () => {
  const look = ammoLook('pistol', DEFAULT_ITEMS.pistol), gun = {}, v = newAmmoView(), rand = () => 0.5
  stepAmmoView(v, frame(look, gun, 12), 0.016, rand)
  assert.ok(v.shown < 0.1)
  for (let i = 0; i < 300; i++) stepAmmoView(v, frame(look, gun, 12), 0.01, rand)
  assert.equal(aroundVisibility(v, 0.5, 1.5), 0, 'gone after the standby')
  stepAmmoView(v, frame(look, gun, 11), 0.01, rand)
  assert.ok(v.rot > 0.9, 'the cylinder turns')
  assert.equal(v.drops.filter(d => d.hud).length, 1, 'the HUD drops the round')
  assert.equal(v.drops.filter(d => !d.hud).length, 0, 'the ring round her is asleep: firing does not wake it')
  const y0 = v.drops[0].y
  for (let i = 0; i < 40; i++) stepAmmoView(v, frame(look, gun, 11), 0.01, rand)
  assert.ok(v.drops[0].y > y0, 'it falls')
  assert.equal(v.rot, 0)
  stepAmmoView(v, frame(look, gun, 11, { reload: 0.1 }), 0.01, rand)
  assert.ok(aroundVisibility(v, 0.5, 1.5) > 0, 'a reload shows it')
  for (let i = 0; i < 300; i++) stepAmmoView(v, frame(look, gun, 11, { reload: 0 }), 0.01, rand)
  stepAmmoView(v, frame(look, gun, 11, { wake: true }), 0.01, rand)
  assert.ok(aroundVisibility(v, 0.5, 1.5) > 0, 'Próxima variação shows it')
  // another copy of the weapon is a new one
  stepAmmoView(v, frame(look, {}, 12), 0.2, rand)
  assert.equal(v.drops.filter(d => d.hud && d.t === 0).length, 0)
})

test('with both views off nothing falls; the arrow flies back up along its line', () => {
  const look = ammoLook('bow', DEFAULT_ITEMS.bow), bow = {}, v = newAmmoView()
  stepAmmoView(v, frame(look, bow, 12, { hud: null, around: null }), 0.01)
  stepAmmoView(v, frame(look, bow, 11, { hud: null, around: null }), 0.01)
  assert.equal(v.drops.length, 0)
  const w = newAmmoView()
  stepAmmoView(w, frame(look, bow, 12, { draw: 1 }), 0.01)
  stepAmmoView(w, frame(look, bow, 11), 0.01)
  const arrow = w.drops.find(d => d.hud)
  assert.ok(arrow.vy < 0, 'up')
})

test('the Granada never runs out nor reloads; the Pandeiro still has its magazine', () => {
  assert.equal(DEFAULT_ITEMS.grenade.infiniteAmmo, true)
  assert.equal(DEFAULT_ITEMS.tambourine.infiniteAmmo, false)
  const c = createCombat(); c.give('grenade')
  const mag = DEFAULT_ITEMS.grenade.mag
  for (let k = 0; k < mag + 2; k++) {
    throwOne(c); wait(c, 1)
  }
  assert.equal(c.held.ammo, mag)
  step(c, { reload: true })
  assert.equal(c.reloading, 0)
  // the same throws spend the Pandeiro's
  const t = createCombat(); t.give('tambourine')
  throwOne(t)
  assert.equal(t.held.ammo, DEFAULT_ITEMS.tambourine.mag - 1)
})
