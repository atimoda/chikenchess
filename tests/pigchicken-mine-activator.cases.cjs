// The Ativador de grid de campo minado (lib/pigchicken/mine-activator.ts, mine-activator-store.ts): its params, what
// meets it, its bars, how it turns the grid on, when it waits, and the online owner's word on it.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { loadTs } = require('./helpers/music.cjs')
const A = loadTs('lib/pigchicken/mine-activator.ts')
const M = loadTs('lib/pigchicken/mine-grid.ts')
const L = loadTs('lib/pigchicken/layout.ts')
const wire = v => JSON.parse(JSON.stringify(v))

// one browser: its own stores, apart from every other browser's
function browser(pid) {
  const cache = new Map()
  const load = file => {
    if (cache.has(file)) return cache.get(file).exports
    const mod = new Module(file, module)
    cache.set(file, mod)
    mod.filename = file; mod.paths = module.paths
    const original = mod.require.bind(mod)
    mod.require = name => (name.startsWith('./') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : original(name))
    mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file)
    return mod.exports
  }
  const lib = name => load(path.resolve(__dirname, '..', 'lib', 'pigchicken', `${name}.ts`))
  const act = lib('mine-activator-store'), grid = lib('mine-grid-store'), out = []
  const sync = lib('net-mine-sync').createNetMineSync({ locals: () => ['p1'], send: m => out.push(wire(m)) })
  return { pid, act, grid, sync, out }
}
const box = (id, x = 1000, params = { notes: 4, damage: 100 }) => ({ id, x, y: 600, w: 240, h: 200, params })

test('its params are kept in their limits, and the element is in the editor’s Grade de blocos', () => {
  assert.deepEqual(A.normalizeMineActivator(undefined), A.defaultMineActivator())
  assert.deepEqual(A.normalizeMineActivator({ notes: 1, damage: 99999 }), { notes: A.MINE_ACTIVATOR_NOTES.min, damage: A.MINE_ACTIVATOR_DAMAGE.max })
  assert.deepEqual(A.normalizeMineActivator({ notes: 30.4, damage: 1220 }), { notes: 30, damage: 1200 })
  const el = L.createElement('mineactivator', 500, 500)
  assert.equal(L.ELEMENT_DEFS.mineactivator.group, 'Grade de blocos')
  assert.deepEqual(el.params.mineActivator, A.defaultMineActivator())
  assert.deepEqual([el.w, el.h], [A.MINE_ACTIVATOR_BOX.w, A.MINE_ACTIVATOR_BOX.h])
  const back = L.normalizeElement(wire({ ...el, params: { mineActivator: { notes: 12, damage: 300 } } }))
  assert.deepEqual(back.params.mineActivator, { notes: 12, damage: 300 })
})

test('music turns the grid on with the Zonas sonoras, damage without them', () => {
  const saved = { ...M.defaultMineGrid(), cell: 400, on: false }
  assert.equal(A.activatedMineGrid(saved, 'music').on, true)
  assert.equal(A.activatedMineGrid(saved, 'music').zones.on, true)
  assert.equal(A.activatedMineGrid(saved, 'damage').zones.on, false)
  assert.equal(A.activatedMineGrid(saved, 'damage').cell, 400)
  assert.equal(A.activatedMineGrid(undefined, 'damage').cell, M.defaultMineGrid().cell)
  assert.equal(saved.zones.on, true, 'the saved settings stay as they are')
})

test('it can be filled only with no grid shown, or once the round of the grid shown is over', () => {
  assert.equal(A.mineActivatorArmed({ savedOn: false, via: null, over: false }), true)
  assert.equal(A.mineActivatorArmed({ savedOn: false, via: 'music', over: false }), false)
  assert.equal(A.mineActivatorArmed({ savedOn: true, via: null, over: false }), false)
  assert.equal(A.mineActivatorArmed({ savedOn: true, via: null, over: true }), true)
  assert.equal(A.mineActivatorArmed({ savedOn: false, via: 'damage', over: true }), true)
})

test('a note counts once on its way out, a shot stops in it, blasts and blows reach it', () => {
  const b = box('a')
  assert.equal(A.mineActivatorNoteHit([b], 900, 700, 1010, 700), null, 'coming in: not yet')
  assert.equal(A.mineActivatorNoteHit([b], 1100, 700, 1110, 700), null, 'inside')
  assert.equal(A.mineActivatorNoteHit([b], 1235, 700, 1245, 700), b, 'on its way out')
  assert.deepEqual(A.mineActivatorShotHit([b], 990, 700, 1004, 700), { box: b, flipX: true })
  assert.deepEqual(A.mineActivatorShotHit([b], 1100, 700, 1110, 700), { box: b, flipX: false }, 'fired from inside')
  assert.equal(A.mineActivatorShotHit([b], 900, 700, 950, 700), null)
  const blast = A.mineActivatorBlast([b], 950, 700, 100)
  assert.equal(blast.length, 1); assert.ok(Math.abs(blast[0].part - 0.5) < 1e-9)
  assert.deepEqual(A.mineActivatorBlast([b], 800, 700, 100), [])
  assert.deepEqual(A.mineActivatorBlow([b], 960, 700, 0, Math.PI / 2, 80), [b])
  assert.deepEqual(A.mineActivatorBlow([b], 960, 700, Math.PI, Math.PI / 2, 80), [])
  assert.equal(A.mineActivatorBlowNotes({ notes: 40, damage: 1000 }, 100), 4)
  assert.equal(A.mineActivatorBlowNotes({ notes: 40, damage: 1000 }, 1), 1)
})

test('the bar that fills turns the grid on; then it waits until the round is over or the grid hides', () => {
  const me = browser(1)
  me.act.setMineActivators([box('a'), box('b', 3000)])
  for (let i = 0; i < 3; i++) me.act.mineActivatorNote(1235, 700, 1245, 700, 'p1', '#00f')
  me.act.mineActivatorShot(990, 700, 1004, 700, 60, 'p1')
  assert.deepEqual(me.act.mineActivatorStore.bars('a'), { notes: 3, damage: 60 })
  assert.equal(me.act.mineActivatorStore.via, null)
  // another browser's note only goes on
  assert.ok(me.act.mineActivatorNote(1235, 700, 1245, 700, null, '#00f'))
  assert.equal(me.act.mineActivatorStore.bars('a').notes, 3)
  me.act.mineActivatorNote(1235, 700, 1245, 700, 'p1', '#00f')
  assert.equal(me.act.mineActivatorStore.via, 'music')
  assert.deepEqual(me.act.takeMineActivatorFlashes(), ['a'])
  assert.deepEqual(me.act.mineActivatorStore.bars('a'), { notes: 0, damage: 0 }, 'the bars start again')
  // waiting: notes and shots go through it and count nothing
  assert.equal(me.act.mineActivatorStore.armed(), false)
  assert.equal(me.act.mineActivatorShot(990, 700, 1004, 700, 500, 'p1'), null)
  // the round of the grid it shows is over: it can be filled again, and by damage it turns the grid on without zones
  me.grid.setMineParams({ ...M.defaultMineGrid(), on: true })
  me.grid.startMineRound(M.createMineGrid(M.mineGeometry({ cell: 100, gap: 20 }, { width: 580, top: 540, ground: 1000 }), { bombs: 0, seed: 1, free: [], turn: 0 }))
  me.grid.mineStore.round.over = true
  assert.equal(me.act.mineActivatorStore.armed(), true)
  me.act.mineActivatorBlastHit(3100, 700, 50, 200)
  assert.equal(me.act.mineActivatorStore.via, 'damage')
  assert.equal(me.act.mineActivatorStore.activations, 2)
  // hidden from the grid's panel: none shown, and they can be filled again
  me.grid.startMineRound(null)
  me.act.hideActivatedMineGrid()
  assert.equal(me.act.mineActivatorStore.via, null)
  assert.equal(me.act.mineActivatorStore.armed(), true)
  // the Pátio's own grid on: it waits
  me.act.setMineActivatorSaved(true)
  assert.equal(me.act.mineActivatorStore.armed(), false)
})

test('online: the lobby’s owner fills them and turns the grid on for everyone, and a hide comes from anyone', () => {
  const owner = browser(1), guest = browser(2)
  let now = 1000
  const all = [owner, guest]
  const frame = () => {
    now += 200
    for (const b of all) { b.sync.become(b === owner ? 'owner' : 'follower', b.pid); b.sync.frame(now, all.filter(x => x !== b).map(x => x.pid)) }
    for (const b of all) for (const m of b.out.splice(0)) for (const to of b === owner ? [guest] : [owner]) to.sync.receive(b.pid, m, owner.pid)
  }
  for (const b of all) b.act.setMineActivators([box('a')])
  frame()
  // the guest's notes go to the owner, who fills the bar and tells the guest
  for (let i = 0; i < 2; i++) guest.act.mineActivatorNote(1235, 700, 1245, 700, 'p1', '#00f')
  assert.deepEqual(guest.act.mineActivatorStore.bars('a'), { notes: 0, damage: 0 }, 'not by itself')
  frame(); frame()
  assert.deepEqual(owner.act.mineActivatorStore.bars('a'), { notes: 2, damage: 0 })
  assert.deepEqual(guest.act.mineActivatorStore.bars('a'), { notes: 2, damage: 0 })
  guest.act.mineActivatorShot(990, 700, 1004, 700, 100, 'p1')
  frame(); frame()
  assert.equal(owner.act.mineActivatorStore.via, 'damage')
  assert.equal(guest.act.mineActivatorStore.via, 'damage')
  assert.deepEqual(guest.act.takeMineActivatorFlashes(), ['a'], 'the burst shows there too')
  // the guest's admin hides the grid: the owner hides it for everyone
  guest.act.hideActivatedMineGrid()
  frame(); frame()
  assert.equal(owner.act.mineActivatorStore.via, null)
  assert.equal(guest.act.mineActivatorStore.via, null)
  // what arrives is cleaned
  assert.equal(A.cleanNetMineActivator({ v: 5, a: 1, b: [] }), null)
  assert.deepEqual(A.cleanNetMineActivator({ v: 1, a: 2, i: 'x', b: [['x', 3, -1], [7, 0, 0]] }), { v: 1, a: 2, i: 'x', b: [['x', 1, 0]] })
  assert.deepEqual(A.cleanNetMineActivatorHits([['x', 2, 5], ['y', -1, 0], 'z']), [['x', 2, 5]])
})
