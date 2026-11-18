const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const cat = loadTs('lib/pigchicken/alien-catalog.ts')
const stageLib = loadTs('lib/pigchicken/note-stage.ts')
const music = loadTs('lib/pigchicken/music.ts')
const ud = loadTs('lib/pigchicken/undead.ts')
const swing = loadTs('lib/pigchicken/swing.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')

test('the code brings a base per species and a first batch of variations, each clean as it is', () => {
  const ids = cat.BUILTIN_VARIANTS.map(v => v.id)
  assert.equal(new Set(ids).size, ids.length, 'unique ids')
  for (const sp of cat.CATALOG_SPECIES) {
    assert.ok(ids.includes(sp), `a base ${sp}`)
    assert.ok(cat.BUILTIN_VARIANTS.filter(v => v.species === sp).length >= 3, `variations of ${sp}`)
  }
  for (const v of cat.BUILTIN_VARIANTS) assert.deepEqual(cat.normalizeVariant(v), v, v.id)
  // the bases are the species as they were
  const jelly = cat.BUILTIN_BY_ID.jelly
  assert.equal(jelly.hp, 30); assert.equal(jelly.move, 'straight'); assert.deepEqual(jelly.death, ud.DEATH_SOUNDS.jelly)
})

test('saved: an edited one takes its place, new ones come after, anything wrong is cleaned', () => {
  const sino = { ...structuredClone(cat.BUILTIN_BY_ID['jelly-sino']), hp: 9999, move: 'teleport', name: 'Sininho' }
  const mine = { id: 'minha', name: 'Minha', species: 'lantern', color: 'red', shot: { echo: 2, color: 'blue' }, rule: 'travada', drum: 'nope' }
  const c = cat.mergeCatalog([sino, mine, { id: '' }, 42])
  assert.equal(c.length, cat.BUILTIN_VARIANTS.length + 1)
  const s = c.find(v => v.id === 'jelly-sino')
  assert.equal(s.name, 'Sininho'); assert.equal(s.hp, 400, 'clamped'); assert.equal(s.move, 'straight', 'kept its own')
  const m = c[c.length - 1]
  assert.equal(m.id, 'minha'); assert.equal(m.builtin, false); assert.equal(m.species, 'lantern')
  assert.equal(m.color, cat.BUILTIN_BY_ID.lantern.color, 'a bad colour takes the base'); assert.equal(m.shot.color, 'degree')
  assert.equal(m.shot.echo, 2); assert.equal(m.rule, 'travada'); assert.equal(m.drum, null)
})

test('duplicating makes a new one to change; a song names it, or its species gets the base', () => {
  const c = cat.mergeCatalog(null)
  const d = cat.duplicateVariant(c, cat.BUILTIN_BY_ID['twin-tercas'])
  assert.equal(d.id, 'twin-tercas-2'); assert.equal(d.name, 'Terças 2'); assert.equal(d.builtin, false)
  assert.equal(cat.variantFor([...c, d], 'twin-tercas-2', 'twin'), d)
  assert.equal(cat.variantFor(c, 'gone', 'shell').id, 'shell')
  assert.equal(cat.variantFor(c, undefined, 'dragonHead').id, 'dragon')
})

test('its notes: a second one at its interval and each again after its echo', () => {
  const scale = { root: 60, steps: [0, 2, 4, 5, 7, 9, 11] }
  const a = { notes: [{ beat: 0, midi: 60 }, { beat: 1, midi: 62 }] }
  assert.deepEqual(stageLib.alienNotes(a, { shot: { harmony: 2, echo: 0 } }, scale).map(n => [n.beat, n.midi]), [[0, 60], [0, 64], [1, 62], [1, 65]], 'thirds')
  assert.deepEqual(stageLib.alienNotes(a, { shot: { harmony: 0, echo: 0.5 } }, scale).map(n => [n.beat, n.midi]), [[0, 60], [0.5, 60], [1, 62], [1.5, 62]], 'an echo')
})

// ---------- in the stage ----------
function stageWith(alien) {
  const song = { ...stageLib.TEST_SONG, id: 'cat-test', aliens: [alien] }
  const st = stageLib.createNoteStage()
  const conductor = music.createConductor()
  const targets = [], fired = []
  const io = (extra = {}) => ({
    targets, music: conductor, sceneL: 1920, sceneW: 1920, groundY: 930, inside: true, center: { x: 2900, y: 860 },
    resetHit: false, events: [], fire: n => fired.push(n), clearShots() {},
    incoming: 0, fx: { burst() {}, text() {} }, push() {}, sound() {}, ...extra,
  })
  const tick = (extra = {}) => { conductor.step(1 / 60); st.step(1 / 60, io(extra)) }
  st.start(io(), { song: song, owner: 'p1', zone: 'z', zoneName: 'Z', by: 'jukebox', goal: stageLib.GOAL_DEFAULT, record: true, again: '' })
  tick()
  const done = () => {}
  return { st, targets, fired, tick, done }
}
const notes = [{ beat: 0, midi: 62 }, { beat: 1, midi: 64 }, { beat: 2, midi: 66 }]

test('a song\'s alien takes its variation: body, shots, rebate and what it carries for its deaths and undead', () => {
  const r = stageWith({ species: 'twin', variant: 'twin-tercas', notes })
  for (let i = 0; i < 60 * 30 && r.fired.length < 6; i++) r.tick()
  assert.equal(r.fired.length, 6, 'two notes each time')
  const t = r.targets.find(x => x.data?.note)
  assert.equal(t.data.variant, 'twin-tercas'); assert.equal(t.data.color, '#4cc9f0')
  assert.deepEqual(t.data.death, cat.BUILTIN_BY_ID['twin-tercas'].death)
  r.done()
  const drum = stageWith({ species: 'drum', variant: 'drum-caixa', move: 'still', notes })
  while (!drum.fired.length) drum.tick()
  assert.equal(drum.fired[0].drum, 'snare', 'its notes carry the beat a rebate plays')
  const big = drum.targets.find(x => x.data?.note)
  assert.equal(big.w, 48, 'its size'); assert.equal(drum.st.state.aliens[0].path.mode, 'still', "the song's movement wins")
  drum.done()
  const fogo = stageWith({ species: 'dragon', variant: 'dragon-fogo', notes })
  while (!fogo.fired.length) fogo.tick()
  const shot = { ...fogo.fired[0], id: 1, state: 'incoming', t: 0, x: 2900, y: 700 }
  assert.equal(shot.scale, 'harmonicMinor')
  assert.deepEqual(fogo.st.noteEnv(shot).fit.steps, music.SCALES.harmonicMinor.steps, 'its rebates fit its scale')
  assert.ok(shot.trail > 0.5)
  fogo.done()
})

test('a percussion note rebated plays its drum; a variation\'s deaths and undead come from its data', () => {
  const c = createCombat(), drums = [], played = []
  c.setMusicOut({ note: (v, m) => played.push(m), hold: () => null, drum: k => drums.push(k) })
  const d = DEFAULT_ITEMS.wing
  const hit = c.music.time + 0.016 + d.meleeTime * swing.SWING_PHASES.prep
  c.fireNoteShot({ x: 60, y: 0, vx: 0, vy: 0, midi: 62, color: '#fff', size: 8, glow: 0.5, arriveAt: hit, source: 'test', drum: 'clap' })
  const step = (input = {}) => c.step(0.016, { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, 0,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input }, [], 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
  step({ melee: true }); for (let i = 0; i < 12; i++) step()
  assert.ok(drums.includes('clap'), 'a clap'); assert.equal(played.length, 0, 'no note')
  // deaths
  const data = cat.variantData(cat.BUILTIN_BY_ID['jelly-baixo'])
  assert.equal(ud.deathSoundsFor(data).physical.drum, 'kick')
  assert.equal(ud.deathSoundsFor({ kind: 'temple', species: 'jelly' }).physical.drum, 'wood', 'without one, by species')
  // its undead: lies the time it says
  c.setView(-1000, 1000)
  const v = { ...structuredClone(cat.BUILTIN_BY_ID.jelly), undead: { riseMin: 7, riseMax: 7, walkSpeed: 12, bird: 'coruja' } }
  c.targets.push({ id: 77, kind: 'alien', home: 0, x: 40, y: 0, w: 40, h: 30, hp: 0.0001, maxHp: 1000, flash: 0, wobble: 0, vx: 0, deadT: 0, face: 1, state: 'hold', animT: 0, data: cat.variantData(v) })
  step({ melee: true }); for (let i = 0; i < 30; i++) step()
  const u = c.undead[0]
  assert.ok(u, 'it left an undead')
  assert.equal(u.data.params.riseMin, 7); assert.equal(u.data.params.walkSpeed, 12); assert.equal(u.data.params.bird, 'coruja')
})
