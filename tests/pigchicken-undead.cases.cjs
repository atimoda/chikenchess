const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const ud = loadTs('lib/pigchicken/undead.ts')
const birds = loadTs('lib/pigchicken/birds.ts')
const sz = loadTs('lib/pigchicken/sound-zones.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

const seq = vals => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)] }

test('two deaths per alien: a drum for the physical one, notes for the musical one', () => {
  assert.deepEqual(ud.deathSoundsFor({ kind: 'temple', species: 'jelly' }).physical, { kind: 'drum', drum: 'wood', vel: 0.9 })
  assert.equal(ud.deathSoundsFor({ kind: 'temple', species: 'shell' }).physical.drum, 'taiko')
  assert.equal(ud.deathSoundsFor({ kind: 'alien' }).physical.drum, 'snare', 'the horde')
  const chord = [60, 64, 67]
  assert.deepEqual(ud.deathNotes(ud.DEATH_SOUNDS.horde.musical, chord, 0.5).map(o => o.midi), [72, 76, 79])
  assert.equal(ud.deathNotes(ud.DEATH_SOUNDS.horde.physical, chord, 0.5)[0].drum, 'snare')
  const arp = ud.deathNotes(ud.DEATH_SOUNDS.jelly.musical, chord, 0.5)
  assert.deepEqual(arp.map(o => o.at), [0, 0.125, 0.25], 'an arpeggio in sixteenths')
})

const body = (x = 0, y = 0) => ({ x, y, w: 40, h: 30, hp: 30, deadT: 0, flash: 0, face: 1 })
const env = (o = {}) => ({ boxes: [], groundY: 100, viewL: -1000, viewR: 1000, playing: true, rand: () => 0.5, ...o })
const run = (b, u, s, e) => { for (let t = 0; t < s; t += 1 / 60) if (!ud.stepUndead(b, u, 1 / 60, e)) return false; return true }

test('an undead falls stiff, bounces less each time and lies where it fell; later it gets up and wanders', () => {
  const b = body()
  const u = ud.newUndead({ kind: 'alien' }, 0, -200, { ...ud.UNDEAD_DEFAULTS, riseMin: 2, riseMax: 2 }, 0, seq([0.5, 0.9, 0.2]))
  let bounced = false, top = 0
  for (let t = 0; t < 3 && u.phase === 'fall'; t += 1 / 60) {
    const vy = u.vy
    ud.stepUndead(b, u, 1 / 60, env())
    if (vy > 0 && u.vy < 0) bounced = true
    top = Math.min(top, b.y)
  }
  assert.ok(bounced, 'it bounced')
  assert.equal(u.phase, 'down'); assert.equal(b.y, 100, 'on the ground')
  assert.ok(Math.abs(Math.round(u.angle / (Math.PI / 2)) * (Math.PI / 2) - u.angle) < 1e-9, 'settled on a side or its back')
  run(b, u, 1.9, env())
  assert.equal(u.phase, 'down')
  run(b, u, 1, env())
  assert.equal(u.phase, 'walk'); assert.equal(u.angle, 0)
  const x0 = b.x
  run(b, u, 1, env())
  assert.ok(Math.abs(b.x - x0) > 20, 'walking')
})

test('walking it turns at the edges of a platform and at walls; on a platform it stays on it', () => {
  const plat = { l: 0, r: 300, t: 50, b: 70, solid: true }
  const b = body(150, 50)
  const u = ud.newUndead({}, 0, 0, ud.UNDEAD_DEFAULTS, 0, () => 0.5)
  u.phase = 'walk'; u.angle = 0; u.dir = 1
  run(b, u, 20, env({ boxes: [plat], rand: () => 0.99 }))
  assert.ok(b.x > 0 && b.x < 300, 'still on the platform'); assert.equal(b.y, 50)
  const wall = { l: 200, r: 240, t: -100, b: 100, solid: true }
  const w = body(150, 100), v = ud.newUndead({}, 0, 0, ud.UNDEAD_DEFAULTS, 0, () => 0.5)
  v.phase = 'walk'; v.dir = 1
  run(w, v, 10, env({ boxes: [wall], rand: () => 0.99 }))
  assert.ok(w.x < 200, 'the wall turned it')
})

test('once the music ends each one leaves after its own time and is gone off the view (or stays for good)', () => {
  const b = body(0, 100)
  const u = ud.newUndead({}, 0, 0, { ...ud.UNDEAD_DEFAULTS, leaveMin: 1, leaveMax: 1 }, 0, () => 0.5)
  u.phase = 'walk'
  assert.equal(run(b, u, 3, env({ playing: true })), true)
  assert.equal(u.leaveIn, null, 'waits while the music plays')
  assert.equal(run(b, u, 30, env({ playing: false, viewL: -300, viewR: 300 })), false, 'gone')
  const s = body(0, 100), stay = ud.newUndead({}, 0, 0, { ...ud.UNDEAD_DEFAULTS, leaveMin: 0, leaveMax: Infinity }, 0, () => 0.5)
  stay.phase = 'walk'
  assert.equal(run(s, stay, 30, env({ playing: false, viewL: -300, viewR: 300 })), true, 'stays for good')
})

test('birds: types for each place, their phrase on the scale, darkened when undead', () => {
  assert.deepEqual(birds.birdsFor('noite'), ['coruja'])
  assert.deepEqual(birds.birdsFor('templo-teste'), ['canario', 'sabia'])
  assert.deepEqual(birds.birdsFor('campo', ['sabia']), ['sabia'])
  const C = { root: 60, steps: [0, 2, 4, 5, 7, 9, 11], chord: [60, 64, 67], spb: 0.5 }
  const t = { ...birds.BIRDS.bemtevi, phrase: { steps: [0, 2, 4], beats: [0.5, 0.5, 1] } }
  const live = birds.birdPhrase(t, 60, C)
  assert.deepEqual(live.map(o => o.midi), [60, 64, 67]); assert.deepEqual(live.map(o => o.at), [0, 0.25, 0.5])
  assert.deepEqual(birds.birdPhrase(t, 60, C, 'parallel').map(o => o.midi), [60, 63, 67], 'C major → C minor')
  assert.deepEqual(sz.normalizeSoundZone({ birds: ['sabia', 'nope', 'sabia'] }).birds, ['sabia'])
})

// ---------- in the combat ----------
const me = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, groundY = 40, dt = 0.016) {
  c.step(dt, me, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    [], groundY, () => {}, { peckOrigin: { x: 0, y: 0 } })
}
const wait = (c, s, angle = 0) => { for (let t = 0; t < s; t += 0.016) step(c, {}, angle) }
function world(item) {
  const c = createCombat(), played = [], drums = []
  c.setMusicOut({ note: (voice, midi, at, dur, vel) => played.push({ voice, midi, at, dur, vel }), hold: () => null, drum: (kind, at, vel) => drums.push({ kind, at, vel }) })
  c.setView(-1000, 1000)
  if (item) { c.give(item); step(c, { slot: 1 }) }
  return { c, played, drums }
}
const alien = (c, hp = 1, x = 200) => c.targets.push({ id: 900, kind: 'alien', home: 0, x, y: 15, w: 40, h: 30, hp, maxHp: hp, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'hold', animT: 0, data: { kind: 'temple', species: 'jelly', color: '#c77dff' } })

test('an alien shot down plays its physical death on the grid and leaves an undead that falls to the floor', () => {
  const w = world('pistol')
  alien(w.c)
  step(w.c, { fire: true, firePressed: true })
  wait(w.c, 0.5)
  assert.ok(w.drums.some(d => d.kind === 'wood'), "the jelly's woodblock")
  const u = w.c.undead
  assert.equal(u.length, 1)
  assert.equal(u[0].data.look.species, 'jelly')
  wait(w.c, 3)
  assert.equal(u[0].y, 40, 'it lies on the floor')
  assert.equal(w.c.enemies, 0, 'harmless: not an enemy')
})

test('notes bring an undead back as an undead bird, eyes in the note\'s colour, singing in minor; weapons destroy it for good', () => {
  const random = Math.random
  Math.random = () => 0.5 // it lies down for a while (its rise time is random)
  const w = world('flute')
  alien(w.c, 1)
  // kill it with the pistol first
  w.c.targets[0].hp = 0.0001
  w.c.give('pistol'); step(w.c, { slot: 2 })
  step(w.c, { fire: true, firePressed: true }); wait(w.c, 3)
  const u = w.c.undead[0]
  Math.random = random
  assert.equal(u.data.phase, 'down')
  // the flute: notes fill its bar
  step(w.c, { slot: 1 })
  for (let i = 0; i < 40 && !u.data.bird; i++) { step(w.c, { fire: true, firePressed: i % 2 === 0 }, Math.atan2(30, 200)) }
  assert.ok(u.data.bird, 'it became a bird')
  assert.notEqual(u.data.eye, '#ff3b3b', 'eyes in the note\'s colour')
  assert.equal(w.c.converted.undeadBirds, 1)
  // the pistol destroys it
  step(w.c, { slot: 2 })
  for (let i = 0; i < 60 && w.c.undead.length; i++) step(w.c, { fire: true, firePressed: i % 8 === 0 }, Math.atan2(u.y - u.h / 2, u.x))
  wait(w.c, 0.5)
  assert.equal(w.c.targets.filter(t => t.kind === 'undead').length, 0, 'gone from memory')
})

test('a converted alien becomes a bird of the place that whistles notes she can rebate', () => {
  const w = world('flute')
  alien(w.c, 1, 200)
  for (let i = 0; i < 20 && !w.c.critters.length; i++) step(w.c, { fire: true, firePressed: i % 2 === 0 })
  const bird = w.c.critters[0]
  assert.ok(bird && bird.bird, 'a typed bird')
  assert.ok(birds.ZONE_BIRDS.campo.includes(bird.bird), "the Campo's birds")
  bird.whistleIn = 0
  wait(w.c, 0.05)
  const shot = w.c.noteShots.find(n => n.source === 'bird')
  assert.ok(shot, 'it whistled a note at her')
  assert.equal(shot.state, 'incoming')
  const beatTime = shot.arriveAt / w.c.music.secondsPerBeat()
  assert.ok(Math.abs(beatTime - Math.round(beatTime)) < 0.05, 'it arrives on a beat')
})

test('at most a few dozen undead at once: the oldest leaves', () => {
  const w = world(null)
  w.c.setPlaying(true)
  let made = 0
  for (let i = 0; i < ud.UNDEAD_MAX + 3; i++) {
    w.c.targets.push({ id: 2000 + i, kind: 'alien', home: 0, x: 50, y: 15, w: 40, h: 30, hp: 0.001, maxHp: 1000, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'hold', animT: 0, data: { kind: 'temple', species: 'mini', color: '#fff' } })
    step(w.c, { melee: true }); wait(w.c, 0.4)
    made = w.c.targets.filter(t => t.kind === 'undead').length
  }
  assert.ok(made > ud.UNDEAD_MAX, 'they kept coming')
  const staying = w.c.undead.filter(t => t.data.phase !== 'leave')
  assert.ok(staying.length <= ud.UNDEAD_MAX)
})
