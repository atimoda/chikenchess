const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, memoryStorage } = require('./helpers/music.cjs')
const L = loadTs('lib/pigchicken/soul-library.ts')
const F = loadTs('lib/pigchicken/soul-follow.ts')

const soul = (species, state, shot = null, note = null, weapon = null) => ({ species, state, shot, note, weapon: state === 'dead' ? weapon ?? 'impact' : null })
// every soul the game can make (the dragon leaves no undead; a chick is only a chick)
function* everySoul() {
  for (const species of L.SOUL_SPECIES_ORDER) for (const state of ['alive', 'dead']) {
    if (species === 'chick') { if (state === 'alive') yield soul('chick', 'alive'); continue }
    if (species === 'dragon' && state === 'dead') continue
    for (const shot of L.SOUL_SHOT_ORDER) for (const note of L.SOUL_NOTE_ORDER) for (const weapon of state === 'dead' ? L.SOUL_WEAPON_ORDER : [null]) yield soul(species, state, shot, note, weapon)
  }
}

test('the catalogue is fixed: a soul for each species, state and family, the chick and the rare ones', () => {
  const E = L.SOUL_ENTRIES, base = E.filter(e => !e.recipe)
  assert.equal(base.filter(e => e.state === 'alive' && e.species !== 'chick').length, 40, '8 species x 5 families alive')
  assert.equal(base.filter(e => e.state === 'dead').length, 35, '7 x 5 dead')
  assert.ok(!base.some(e => e.species === 'dragon' && e.state === 'dead'), 'the dragon leaves no undead')
  assert.equal(base.filter(e => e.species === 'chick').length, 1)
  assert.equal(L.RARE_SOULS.length, 12)
  assert.equal(E.length, 88)
  assert.equal(new Set(E.map(e => e.id)).size, E.length, 'no id twice')
  assert.equal(new Set(E.map(e => e.name)).size, E.length, 'no name twice')
  for (const e of E) {
    assert.ok(e.cls in F.SOUL_CLASSES, `${e.id}: a class that exists`)
    assert.ok(e.look.shape in L.SOUL_SHAPES && e.look.pixel >= 2 && Number.isInteger(e.look.pixel), `${e.id}: a drawing`)
    for (const k of ['body', 'wing', 'belly', 'beak', 'eye']) assert.match(e.look[k], /^#[0-9a-f]{6}$/i, `${e.id}.${k}`)
    assert.ok(e.rarity in L.SOUL_RARITIES, e.id)
  }
  const by = id => E.find(e => e.id === id)
  assert.equal(by('lantern.alive.wind').name, 'Assobio de Lanterna')
  assert.equal(by('horde.alive.rebate').name, 'Eco da Horda')
  assert.equal(by('jelly.dead.keys').name, 'Réquiem de Água-viva')
  assert.equal(by('chick').name, 'Pintinho')
})

test('a living soul wears its species, a dead one is grey with a glowing eye in that colour', () => {
  const alive = L.entryOf(soul('jelly', 'alive', 'keys', 'consonant')), dead = L.entryOf(soul('jelly', 'dead', 'keys', 'consonant'))
  assert.equal(alive.look.body, L.SOUL_SPECIES.jelly.color)
  assert.equal(alive.look.halo, false)
  assert.notEqual(dead.look.body, L.SOUL_SPECIES.jelly.color)
  assert.equal(dead.look.eye, L.SOUL_SPECIES.jelly.color)
  assert.equal(dead.look.halo, true)
  assert.equal(L.entryColor(alive), L.SOUL_SPECIES.jelly.color)
  assert.equal(L.entryColor(dead), L.SOUL_SPECIES.jelly.color, 'both glow in the colour of the species')
  assert.equal(alive.look.shape, 'keys', 'the family gives the shape')
  assert.deepEqual(new Set(L.SOUL_SHOT_ORDER.map(shot => L.entryOf(soul('mini', 'alive', shot, 'consonant')).look.shape)).size, 5, 'a shape for each family')
})

test('a soul is one entry: a rare recipe first, else the one of its species, state and family', () => {
  const id = (...a) => L.entryOf(soul(...a)).id
  assert.equal(id('lantern', 'alive', 'wind', 'consonant'), 'lantern.alive.wind')
  assert.equal(id('lantern', 'alive', 'wind', 'tension'), 'rare.vaga-lume')
  assert.equal(id('lantern', 'alive', 'keys', 'tension'), 'lantern.alive.keys', 'the recipe asks for the family too')
  assert.equal(id('dragon', 'alive', 'strings', 'tonic'), 'rare.fenix', 'any family')
  assert.equal(id('dragon', 'alive', 'strings', 'outside'), 'rare.dragao-desafinado', 'the first recipe that fits: before Alma Blue')
  assert.equal(id('horde', 'alive', 'strings', 'outside'), 'rare.alma-blue', 'any species')
  assert.equal(id('shell', 'dead', 'strings', 'tonic', 'arrow'), 'rare.flechada')
  assert.equal(id('shell', 'dead', 'strings', 'tonic', 'bullet'), 'shell.dead.strings')
  assert.equal(id('twin', 'dead', 'wind', 'outside', 'impact'), 'rare.gemea-ma')
  assert.equal(id('twin', 'alive', 'wind', 'outside'), 'rare.desafinada')
  assert.equal(id('horde', 'alive', null, null), 'horde.alive.wind', 'nobody saw the instrument: a wind one')
  assert.equal(id('horde', 'alive', 'strings', null), 'horde.alive.strings', 'no note fits no recipe that asks for one')
  assert.equal(id('chick', 'alive'), 'chick')
  assert.equal(L.entryOf({ species: 'chick', state: 'alive', shot: 'strings', note: 'outside', weapon: null }).id, 'chick', 'a chick is only a chick')
  assert.equal(L.entryOf({ species: 'dragon', state: 'dead', shot: 'keys', note: 'consonant', weapon: 'impact' }).id, 'dragon.alive.keys', 'a dead dragon (there is none) is the living one')
})

test('every entry can be found, and every star of it can be earned', () => {
  const seen = new Map()
  for (const s of everySoul()) {
    const e = L.entryOf(s), at = seen.get(e.id) ?? { notes: new Set(), weapons: new Set() }
    if (s.note) at.notes.add(s.note)
    if (s.weapon) at.weapons.add(s.weapon)
    seen.set(e.id, at)
  }
  for (const e of L.SOUL_ENTRIES) {
    assert.ok(seen.has(e.id), `${e.name} (${e.id}) can be caught`)
    const t = L.entryTraits(e), was = seen.get(e.id)
    assert.deepEqual(t.notes, L.SOUL_NOTE_ORDER.filter(n => was.notes.has(n)), `${e.id}: its notes`)
    assert.deepEqual(t.weapons, L.SOUL_WEAPON_ORDER.filter(w => was.weapons.has(w)), `${e.id}: its weapons`)
    if (e.id === 'chick') { assert.deepEqual(t, { notes: [], weapons: [] }); continue }
    assert.ok(t.notes.length >= 1, `${e.id}: at least a note`)
    assert.equal(t.weapons.length > 0, e.state === 'dead', `${e.id}: only the dead ones remember a weapon`)
  }
  const traits = id => L.entryTraits(L.SOUL_ENTRIES.find(e => e.id === id))
  assert.deepEqual(traits('horde.alive.strings').notes, ['tonic', 'consonant', 'tension', 'leading'], 'the note outside is Alma Blue')
  assert.deepEqual(traits('horde.alive.percussion').notes, L.SOUL_NOTE_ORDER)
  assert.deepEqual(traits('shell.dead.keys').weapons, L.SOUL_WEAPON_ORDER, 'a dead one can come from any weapon')
  assert.deepEqual(traits('rare.fenix').notes, ['tonic'])
})

test('how a soul flies comes from its entry: the numbers of its class, with its own over them', () => {
  const keys = L.entryOf(soul('horde', 'alive', 'keys', 'tonic'))
  assert.equal(keys.cls, 'escort')
  assert.deepEqual(L.entryFollowParams(keys), F.soulFollowParams({ species: 'horde', shot: 'keys' }))
  assert.equal(L.entryClassName(keys), 'Escolta')
  assert.equal(L.entryOf(soul('horde', 'dead', 'keys', 'tonic', 'arrow')).cls, 'patrol', 'a rare one may fly its own way')
  const own = { ...keys, follow: { dist: 33 } }
  assert.equal(L.entryFollowParams(own).dist, 33)
  assert.equal(L.entryFollowParams(own).pattern, 'orbit')
})

test('the collection only grows: first capture, how many, the notes and the weapons seen', () => {
  const empty = {}
  let r = L.recordSoul(empty, soul('jelly', 'dead', 'wind', 'tonic', 'bullet'), 1000)
  assert.deepEqual(empty, {}, 'never changed in place')
  assert.equal(r.entry.id, 'jelly.dead.wind')
  assert.equal(r.first, true); assert.equal(r.trait, false)
  assert.deepEqual(r.col['jelly.dead.wind'], { n: 1, at: 1000, notes: ['tonic'], weapons: ['bullet'] })
  r = L.recordSoul(r.col, soul('jelly', 'dead', 'wind', 'tonic', 'bullet'), 2000)
  assert.equal(r.first, false); assert.equal(r.trait, false, 'the same again: nothing new')
  assert.deepEqual(r.col['jelly.dead.wind'], { n: 2, at: 1000, notes: ['tonic'], weapons: ['bullet'] })
  r = L.recordSoul(r.col, soul('jelly', 'dead', 'wind', 'tension', 'bullet'), 3000)
  assert.equal(r.first, false); assert.equal(r.trait, true, 'a note it did not have')
  r = L.recordSoul(r.col, soul('jelly', 'dead', 'wind', 'tension', 'impact'), 4000)
  assert.equal(r.trait, true, 'a weapon it did not have')
  assert.deepEqual(r.col['jelly.dead.wind'], { n: 4, at: 1000, notes: ['tonic', 'tension'], weapons: ['bullet', 'impact'] })
  r = L.recordSoul(r.col, soul('jelly', 'dead', null, null), 5000)
  assert.equal(r.trait, false, 'one nobody saw the note of adds none')
  assert.equal(r.col['jelly.dead.wind'].n, 5)
  const p = L.collectionProgress(r.col)
  assert.equal(p.found, 1); assert.equal(p.total, 88); assert.equal(p.stars, 4)
  assert.ok(p.allStars > 300, `the stars of the whole catalogue (${p.allStars})`)
  assert.deepEqual(L.collectionProgress({}), { found: 0, total: 88, stars: 0, allStars: p.allStars })
})

test('two copies of a collection become one, and nothing found is lost', () => {
  const a = { x: { n: 3, at: 500, notes: ['tonic'], weapons: [] }, y: { n: 1, at: 900, notes: [], weapons: ['arrow'] } }
  const b = { x: { n: 2, at: 300, notes: ['outside'], weapons: ['blast'] }, z: { n: 7, at: 100, notes: ['leading'], weapons: [] } }
  const m = L.mergeCollections(a, b)
  assert.deepEqual(m.x, { n: 3, at: 300, notes: ['tonic', 'outside'], weapons: ['blast'] })
  assert.deepEqual(m.y, a.y); assert.deepEqual(m.z, b.z)
  assert.notEqual(m.y.weapons, a.y.weapons, 'copies, not the same lists')
  assert.deepEqual(L.mergeCollections(m, {}), m)
})

test('whatever was stored reads as a collection', () => {
  assert.deepEqual(L.normalizeCollection(null), {})
  assert.deepEqual(L.normalizeCollection([1, 2]), {})
  assert.deepEqual(L.normalizeCollection('x'), {})
  const c = L.normalizeCollection({
    'horde.alive.wind': { n: 2.9, at: 10, notes: ['outside', 'nope', 'tonic'], weapons: 'x' },
    gone: { n: 1, at: 'x', notes: [], weapons: ['arrow', 'laser'] },
    zero: { n: 0, at: 5, notes: [], weapons: [] }, junk: 7,
  })
  assert.deepEqual(c['horde.alive.wind'], { n: 2, at: 10, notes: ['tonic', 'outside'], weapons: [] }, 'in the catalogue order, the unknown dropped')
  assert.deepEqual(c.gone, { n: 1, at: 0, notes: [], weapons: ['arrow'] }, "an entry the catalogue does not have is kept: it may come back")
  assert.ok(!('zero' in c) && !('junk' in c))
})

test("this browser's copy: a caught soul is saved, and whoever listens hears of it", () => {
  const memory = new Map()
  let listeners = []
  const before = global.window, hadEvent = global.CustomEvent
  global.window = {
    localStorage: memoryStorage(memory),
    addEventListener: (type, fn) => { listeners.push({ type, fn }) }, removeEventListener: (type, fn) => { listeners = listeners.filter(l => l.type !== type || l.fn !== fn) },
    dispatchEvent: e => { for (const l of listeners) if (l.type === e.type) l.fn(e) },
  }
  if (!hadEvent) global.CustomEvent = class { constructor(type) { this.type = type } }
  try {
    assert.deepEqual(L.loadCollection(), {})
    const heard = []
    const off = L.subscribeCollection(col => heard.push(Object.keys(col)))
    let r = L.collectSoul(soul('dragon', 'alive', 'keys', 'tonic'), 42)
    assert.equal(r.entry.name, 'Fênix'); assert.equal(r.first, true)
    assert.deepEqual(heard, [['rare.fenix']])
    r = L.collectSoul(soul('dragon', 'alive', 'wind', 'tonic'), 43)
    assert.equal(r.first, false)
    assert.deepEqual(L.loadCollection()['rare.fenix'], { n: 2, at: 42, notes: ['tonic'], weapons: [] })
    off()
    L.collectSoul(soul('chick', 'alive'), 44)
    assert.equal(heard.length, 2, 'not after it stops listening')
    memory.set('pigchicken-souls-v1', '{broken')
    assert.deepEqual(L.loadCollection(), {}, 'a broken copy is an empty one')
  } finally {
    if (before === undefined) delete global.window; else global.window = before
    if (!hadEvent) delete global.CustomEvent
  }
})

test('the drawing: two flaps for each shape, and a soul in the world keeps the colour it had', () => {
  const A = loadTs('components/pigchicken/draw/soul-art.ts')
  assert.deepEqual(Object.keys(A.SOUL_FRAMES).sort(), Object.keys(L.SOUL_SHAPES).sort(), 'every shape has its drawing')
  for (const [shape, frames] of Object.entries(A.SOUL_FRAMES)) {
    assert.equal(frames.length, 2, shape)
    frames.forEach((rows, i) => {
      assert.equal(rows.length, A.SOUL_ROWS, `${shape}: rows`)
      for (const r of rows) { assert.equal(r.length, A.SOUL_COLS, `${shape}: ${r}`); assert.match(r, /^[.#wbko>]+$/) }
      assert.equal(rows[i === 0 ? 4 : 3][9], 'o', `${shape}: the eye where its glow is drawn`)
    })
    assert.notDeepEqual(frames[0], frames[1], `${shape}: the wings move`)
  }
  assert.equal(new Set(Object.values(A.SOUL_FRAMES).map(f => f[0].join('\n'))).size, Object.keys(A.SOUL_FRAMES).length, 'no two shapes alike')
  const mk = (o, color) => ({ ...o, id: 1, rarity: 'common', color, bird: 'pardal' })
  const alive = mk(soul('horde', 'alive', 'keys', 'consonant'), '#ff00aa'), look = A.soulLook(alive)
  assert.equal(look.body, '#ff00aa', "the alien's colour, whatever its species' is")
  assert.equal(look.shape, 'keys')
  assert.equal(A.soulLook(alive), look, 'worked out once')
  const dead = A.soulLook(mk(soul('horde', 'dead', 'keys', 'consonant'), '#00ffcc'))
  assert.equal(dead.eye, '#00ffcc', 'the note that brought it back, in its eye'); assert.equal(dead.halo, true)
  assert.notEqual(dead.body, '#00ffcc')
  const fenix = L.SOUL_ENTRIES.find(e => e.id === 'rare.fenix')
  assert.equal(A.soulLook(mk(soul('dragon', 'alive', 'wind', 'tonic'), '#123456')), fenix.look, 'a rare one in its own colours')
})
