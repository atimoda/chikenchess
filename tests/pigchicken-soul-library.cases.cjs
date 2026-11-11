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

// ---------- the sheets (an admin's editor) ----------
const withWindow = run => {
  const memory = new Map()
  let listeners = []
  const before = global.window, hadEvent = global.CustomEvent
  global.window = {
    localStorage: memoryStorage(memory),
    addEventListener: (type, fn) => { listeners.push({ type, fn }) }, removeEventListener: (type, fn) => { listeners = listeners.filter(l => l.type !== type || l.fn !== fn) },
    dispatchEvent: e => { for (const l of listeners) if (l.type === e.type) l.fn(e) },
  }
  if (!hadEvent) global.CustomEvent = class { constructor(type) { this.type = type } }
  try { run(memory) } finally {
    if (before === undefined) delete global.window; else global.window = before
    if (!hadEvent) delete global.CustomEvent
  }
}
const ids = list => list.map(e => e.id)
const rareIds = list => ids(list.filter(e => e.recipe))

test('the sheets file holds only what an admin changed over the code, and reads back the same', () => {
  assert.deepEqual(L.soulsFile(L.CODE_SOUL_ENTRIES), {}, 'nothing changed, nothing written')
  const plain = L.soulEntriesOver(null)
  assert.equal(plain.length, 88)
  assert.equal(plain[0], L.CODE_SOUL_ENTRIES[0], 'an untouched soul is the very one of the code')
  const kept = L.RARE_SOULS.slice(0, 2).map(e => ({ id: e.id, name: e.name, rarity: e.rarity, cls: e.cls, look: e.look, recipe: e.recipe }))
  const file = {
    sheets: { 'horde.alive.wind': { name: 'Apito', rarity: 'rare', cls: 'lazy', look: { pixel: 6, body: '#112233', halo: true }, follow: { speed: 500, side: 'behind', pattern: 'zigzag' } } },
    rares: [{ id: 'rare.nova', name: 'Cometa', rarity: 'legendary', cls: 'patrol', look: { shape: 'rebate', pixel: 5, body: '#ff0000', wing: '#aa0000', belly: '#ffffff', beak: '#ffff00', eye: '#000000', halo: false }, recipe: { species: ['jelly'], state: 'alive', note: ['tonic'] } }, ...kept],
  }
  const E = L.soulEntriesOver(file)
  assert.equal(E.length, 76 + 3, 'the rare ones are the list of the file')
  const apito = E.find(e => e.id === 'horde.alive.wind')
  assert.equal(apito.name, 'Apito'); assert.equal(apito.rarity, 'rare'); assert.equal(apito.cls, 'lazy')
  assert.equal(apito.look.shape, 'wind', "what the sheet leaves out stays the code's")
  assert.equal(apito.look.pixel, 6); assert.equal(apito.look.halo, true)
  const p = L.entryFollowParams(apito)
  assert.equal(p.speed, 500); assert.equal(p.side, 'behind'); assert.equal(p.pattern, 'zigzag'); assert.equal(p.leash, 1100, 'the rest from its class')
  assert.equal(L.entryOf(soul('jelly', 'alive', 'keys', 'tonic'), E).id, 'rare.nova')
  assert.equal(L.entryOf(soul('horde', 'alive', 'rebate', 'tonic'), E).id, 'horde.alive.rebate', 'a rare one the file left out is gone')
  assert.deepEqual(L.soulsFile(E), file)
  assert.equal(L.soulsFileProblem(file), null)
  assert.equal(L.soulsFileProblem({}), null)
  assert.equal(L.soulsFileProblem({ rares: L.soulsFile(E).rares.slice(1) }), null)
})

test('whatever a sheets file holds, the catalogue is clean: the unknown dropped, the rest inside its limits', () => {
  const code = L.CODE_SOUL_ENTRIES.find(e => e.id === 'horde.alive.wind')
  const E = L.soulEntriesOver({
    nope: 1,
    sheets: { 'horde.alive.wind': { name: '   ', rarity: 'epic', cls: 'nope', look: { shape: 'cube', pixel: 99, body: 'red', eye: '#ABCDEF' }, follow: { speed: 9999, side: 'up', junk: 1 } }, 'not.a.soul': { name: 'x' } },
    rares: [{ id: 'rare.a', name: 'A', recipe: { weapon: ['arrow'], state: 'alive', species: ['chick', 'jelly'], shot: 'keys' } }, { id: 'rare.a', name: 'twice' }, { id: 'Bad Id', name: 'x' }, { id: 'rare.b' }, 'junk'],
  })
  const m = E.find(e => e.id === 'horde.alive.wind')
  assert.equal(m.name, code.name); assert.equal(m.rarity, code.rarity); assert.equal(m.cls, code.cls)
  assert.equal(m.look.shape, 'wind'); assert.equal(m.look.pixel, L.SOUL_PIXEL.max); assert.equal(m.look.body, code.look.body); assert.equal(m.look.eye, '#abcdef')
  assert.deepEqual(m.follow, { speed: 600 })
  assert.equal(E.length, 77)
  const a = E[76]
  assert.equal(a.id, 'rare.a', 'an id twice, a bad id, no name: dropped')
  assert.deepEqual(a.recipe, { species: ['jelly'], state: 'dead', weapon: ['arrow'] }, 'a weapon asks for a dead soul; no chick in a recipe')
  assert.equal(a.species, 'jelly'); assert.equal(a.state, 'dead'); assert.equal(a.shot, null)
  assert.equal(a.rarity, 'rare'); assert.ok(a.cls in F.SOUL_CLASSES)
  for (const k of L.SOUL_LOOK_COLOURS) assert.match(a.look[k], /^#[0-9a-f]{6}$/)
  assert.equal(L.soulEntriesOver({ rares: Array.from({ length: 60 }, (_, i) => ({ id: `rare.n${i}`, name: `N${i}` })) }).length, 76 + L.SOUL_RARES_MAX)
  assert.equal(L.soulEntriesOver({ sheets: { chick: { name: 'x'.repeat(90) } } }).find(e => e.id === 'chick').name.length, L.SOUL_NAME_MAX)

  // the file the admin panel accepts is exactly one the game would not change
  const look = { shape: 'wind', pixel: 3, body: '#111111', wing: '#222222', belly: '#333333', beak: '#444444', eye: '#555555', halo: false }
  const one = { id: 'rare.a', name: 'A', rarity: 'rare', cls: 'sentinel', look, recipe: { state: 'alive' } }
  assert.equal(L.soulsFileProblem({ rares: [one] }), null)
  for (const bad of [
    null, [], 'x', { other: {} }, { sheets: [] }, { rares: {} },
    { sheets: { 'not.a.soul': { name: 'x' } } },
    { sheets: { 'horde.alive.wind': {} } },
    { sheets: { 'horde.alive.wind': { name: code.name } } },
    { sheets: { 'horde.alive.wind': { nope: 1 } } },
    { sheets: { 'horde.alive.wind': { look: { pixel: 99 } } } },
    { sheets: { 'horde.alive.wind': { look: { body: 'red' } } } },
    { sheets: { 'horde.alive.wind': { follow: { speed: 9999 } } } },
    { sheets: { 'rare.fenix': { name: 'x' } } },
    { rares: [one, one] },
    { rares: [{ ...one, id: 'nova' }] },
    { rares: [{ ...one, name: '' }] },
    { rares: [{ ...one, look: { ...look, pixel: 1 } }] },
    { rares: [{ ...one, look: { shape: 'wind' } }] },
    { rares: [{ ...one, recipe: { state: 'alive', weapon: ['arrow'] } }] },
    { rares: [{ ...one, extra: 1 }] },
  ]) assert.equal(typeof L.soulsFileProblem(bad), 'string', JSON.stringify(bad))
})

test("editing the sheets: each change gives a whole new catalogue, and the game's is never touched", () => {
  const G = L.SOUL_ENTRIES
  let E = L.changeEntry(G, 'chick', e => ({ ...e, name: 'Piu', look: { ...e.look, pixel: 5 }, follow: { ...e.follow, dist: 100 } }))
  assert.notEqual(E, G); assert.equal(G.find(e => e.id === 'chick').name, 'Pintinho')
  assert.deepEqual(L.soulsFile(E), { sheets: { chick: { name: 'Piu', look: { pixel: 5 }, follow: { dist: 100 } } } })
  assert.equal(L.entryFollowParams(E.find(e => e.id === 'chick')).dist, 100)
  assert.deepEqual(L.soulsFile(L.resetEntry(E, 'chick')), {}, "back to the game's")

  // a new rare one comes first: the first recipe that fits wins
  const a = L.addRare(G)
  assert.equal(a.id, 'rare.nova'); assert.equal(a.entries.length, 89); assert.equal(rareIds(a.entries)[0], 'rare.nova')
  assert.equal(L.entryOf(soul('horde', 'alive', 'wind', 'outside'), a.entries).id, 'rare.nova')
  assert.equal(L.entryOf(soul('horde', 'alive', 'wind', 'outside'), G).id, 'rare.desafinada')
  // a copy of a soul of the rule asks for what that one is
  const from = a.entries.find(e => e.id === 'lantern.dead.keys')
  const b = L.addRare(a.entries, from)
  assert.equal(b.id, 'rare.nova-2')
  const copy = b.entries.find(e => e.id === b.id)
  assert.deepEqual(copy.recipe, { species: ['lantern'], state: 'dead', shot: ['keys'] })
  assert.deepEqual(copy.look, from.look); assert.equal(copy.cls, from.cls); assert.notEqual(copy.name, from.name)
  assert.equal(L.entryOf(soul('lantern', 'dead', 'keys', 'consonant'), b.entries).id, 'rare.nova-2')

  // up and down among the rare ones, never out of them
  const M = L.moveRare(b.entries, 'rare.nova-2', 1)
  assert.deepEqual(rareIds(M).slice(0, 3), ['rare.nova', 'rare.nova-2', 'rare.fenix'])
  assert.deepEqual(ids(L.moveRare(M, 'rare.nova', -1)), ids(M), 'the first stays the first')
  assert.deepEqual(ids(L.moveRare(M, M[M.length - 1].id, 1)), ids(M), 'the last stays the last')
  assert.deepEqual(ids(L.moveRare(M, 'chick', 1)), ids(M), 'a soul of the rule has no place to change')

  const R = L.removeRare(M, 'rare.nova')
  assert.ok(!R.some(e => e.id === 'rare.nova')); assert.equal(R.length, M.length - 1)
  assert.equal(L.removeRare(M, 'chick').length, M.length, 'a soul of the rule is never removed')
  assert.ok(!L.removeRare(G, 'rare.fenix').some(e => e.id === 'rare.fenix'), "one of the game's can go too")
  assert.equal(L.resetEntry(R, 'rare.nova-2').find(e => e.id === 'rare.nova-2').name, copy.name, 'one the game does not have stays as it is')

  let full = G
  for (let n = L.addRare(full); n; n = L.addRare(full)) full = n.entries
  assert.equal(rareIds(full).length, L.SOUL_RARES_MAX, 'no room for more')
  assert.equal(new Set(ids(full)).size, full.length)

  // a recipe that asks for nothing is nobody's (the editor warns); back to the game's and it is the Fênix again
  E = L.changeEntry(G, 'rare.fenix', e => ({ ...e, name: 'Fogo', recipe: {} }))
  assert.equal(L.entryOf(soul('dragon', 'alive', 'keys', 'tonic'), E).id, 'dragon.alive.keys')
  assert.deepEqual(L.entryTraits(E.find(e => e.id === 'rare.fenix'), E), { notes: [], weapons: [] })
  assert.deepEqual(L.soulsFile(L.resetEntry(E, 'rare.fenix')), {})

  for (const c of [a.entries, b.entries, M, R, full, E]) assert.equal(L.soulsFileProblem(L.soulsFile(c)), null, 'whatever the editor makes is a file the game takes')
})

test("an admin's draft of the sheets lives in this browser; one that is the game's again is no draft", () => withWindow(memory => {
  const KEY = 'pigchicken-soul-sheets-v1', chick = list => list.find(e => e.id === 'chick')
  assert.equal(L.loadSoulEntries(), L.SOUL_ENTRIES, "no draft: the game's")
  const heard = []
  const off = L.subscribeSoulEntries(list => heard.push(list))
  const E = L.changeEntry(L.SOUL_ENTRIES, 'chick', e => ({ ...e, name: 'Piu' }))
  L.saveSoulEntries(E)
  assert.deepEqual(JSON.parse(memory.get(KEY)), { sheets: { chick: { name: 'Piu' } } })
  assert.equal(heard.length, 1); assert.equal(chick(heard[0]).name, 'Piu')
  assert.equal(chick(L.loadSoulEntries()).name, 'Piu')
  L.saveSoulEntries(L.resetEntry(E, 'chick'))
  assert.ok(!memory.has(KEY), "the game's later changes reach this browser")
  assert.equal(heard[1], L.SOUL_ENTRIES)
  off()
  L.saveSoulEntries(E)
  assert.equal(heard.length, 2, 'not after it stops listening')
  memory.set(KEY, '{broken')
  assert.equal(L.loadSoulEntries(), L.SOUL_ENTRIES, "a broken draft is the game's")
}))

test('the catalogue in use: what a soul is follows it, and its drawing is worked out again', () => {
  const A = loadTs('components/pigchicken/draw/soul-art.ts')
  const mk = (o, color) => ({ ...o, id: 1, rarity: 'common', color, bird: 'pardal' })
  const alive = mk(soul('horde', 'alive', 'keys', 'consonant'), '#ff00aa'), dead = mk(soul('horde', 'dead', 'keys', 'consonant'), '#00ffcc')
  const before = A.soulLook(alive), v = L.soulCatalogVersion()
  let E = L.changeEntry(L.SOUL_ENTRIES, 'horde.alive.keys', e => ({ ...e, look: { ...e.look, shape: 'rebate', body: '#010203' } }))
  E = L.changeEntry(E, 'horde.dead.keys', e => ({ ...e, look: { ...e.look, eye: '#0a0b0c', belly: '#0d0e0f' } }))
  try {
    L.setSoulEntries(E)
    assert.equal(L.soulCatalogVersion(), v + 1); assert.equal(L.soulEntries(), E)
    L.setSoulEntries(E)
    assert.equal(L.soulCatalogVersion(), v + 1, 'the same list is no change')
    assert.equal(L.entryOf(alive).look.shape, 'rebate')
    const now = A.soulLook(alive)
    assert.notEqual(now, before); assert.equal(now.shape, 'rebate')
    assert.equal(now.body, '#010203', 'a colour its sheet painted stays')
    assert.equal(now.wing, L.soulPalette('#ff00aa').wing, 'the rest still follows the alien it was')
    const d = A.soulLook(dead)
    assert.equal(d.eye, '#0a0b0c', 'an eye its sheet painted no longer takes the colour of the note'); assert.equal(d.belly, '#0d0e0f')
  } finally { L.setSoulEntries(L.SOUL_ENTRIES) }
  assert.equal(A.soulLook(alive).shape, 'keys'); assert.equal(A.soulLook(alive).body, '#ff00aa')
  assert.equal(A.soulLook(dead).eye, '#00ffcc')
})
