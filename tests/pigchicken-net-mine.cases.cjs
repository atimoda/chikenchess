const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const { loadTs } = require('./helpers/music.cjs')
const M = loadTs('lib/pigchicken/mine-grid.ts')
const R = loadTs('lib/pigchicken/mine-round.ts')
const N = loadTs('lib/pigchicken/net-mine.ts')

// 5 x 4 blocks of 100 with a gap of 20; (0, 0) is the portal's free block
const geo = () => M.mineGeometry({ cell: 100, gap: 20 }, { width: 5 * 100 + 4 * 20, top: 1000 - (4 * 100 + 3 * 20), ground: 1000 })
const grid = (seed, bombs = 30) => M.createMineGrid(geo(), { bombs, seed, free: [{ c: 0, r: 0 }], turn: 0 })
const params = { ...M.defaultMineGrid(), on: true, toFlag: 4, toOpen: 100, toDoubt: 4, fuse: 10, turn: 0 }
const same = id => id
const wire = v => JSON.parse(JSON.stringify(v))

// one browser: its own round's store and its part in the lobby, apart from every other browser's (each call loads
// the modules again)
function browser(pid, locals = ['p1']) {
  const cache = new Map()
  const load = file => {
    if (cache.has(file)) return cache.get(file).exports
    const mod = new Module(file, module)
    cache.set(file, mod)
    mod.filename = file; mod.paths = module.paths
    const original = mod.require.bind(mod)
    mod.require = name => (name.startsWith('.') && !name.endsWith('.json') ? load(path.resolve(path.dirname(file), `${name}.ts`)) : original(name))
    mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, file)
    return mod.exports
  }
  const lib = name => load(path.resolve(__dirname, '..', 'lib', 'pigchicken', `${name}.ts`))
  const store = lib('mine-grid-store'), out = []
  const sync = lib('net-mine-sync').createNetMineSync({ locals: () => locals, send: m => out.push(wire(m)) })
  const events = []
  store.watchMine(ev => events.push(...ev))
  return { pid, store, sync, out, events, grids: lib('mine-grid') }
}
// a lobby of browsers (the first one owns it): what the owner sends goes to everyone else, the rest to the owner
let now = 1000
function lobby(...all) {
  let owner = all[0]
  const frame = (ms = 200) => {
    now += ms
    for (const b of all) { b.sync.become(b === owner ? 'owner' : 'follower', b.pid); b.sync.frame(now, all.filter(x => x !== b).map(x => x.pid)) }
    for (const b of all) for (const m of b.out.splice(0)) for (const to of b === owner ? all.filter(x => x !== b) : [owner]) to.sync.receive(b.pid, m, owner.pid)
  }
  return { frame, own(b) { owner = b } }
}
const start = (b, seed) => { b.store.setMineParams(params); b.store.startMineRound(grid(seed)) }
const bombs = b => b.store.mineStore.round.grid.cells.map(k => (k.bomb ? 'b' : '.')).join('')
const at = (b, c, r) => M.mineCell(b.store.mineStore.round.grid, c, r)

test('a block travels whole, and only the blocks that changed travel again', () => {
  const rd = R.mineRound(grid(3, 0)), sent = new Map()
  Object.assign(M.mineCell(rd.grid, 1, 0), { gauge: -0.4567, turn: 90, by: { shot: 'p1', bomb: '4:1' }, bomb: true, armed: true, fuse: 3.25 })
  Object.assign(M.mineCell(rd.grid, 2, 1), { flag: true, gauge: 1, yellow: 0.25, hold: 1.5, turn: null, by: { note: 'p2' } })
  const out = id => N.mineIdOut(id, ['p1', 'p2'], 7), back = id => N.mineIdIn(id, ['p1'], 7)
  const l = N.exportMineCells(rd, sent, out)
  assert.equal(l.length, 20)
  assert.deepEqual(l[1], [1, 2 + 32, -0.457, 0, 0, 3.25, 90, '', '7:0', '4:1'])
  assert.deepEqual(l[7], [7, 8, 1, 0.25, 1.5, -1, -1, '7:1'])
  const state = N.cleanMineState(wire({ n: 5, c: 5, r: 4, f: 1, l, st: N.exportMineStats({ p1: { ...rd.stats.x, music: 3, damage: 0, opened: 1, flags: 0, flagsOnBomb: 0, doubts: 0, solved: 0, disarmed: 0, installed: 0, kills: 0, deaths: 2 }, ghost: {} }, out), o: 1 }))
  const copy = R.mineRound(grid(99, 0))
  assert.ok(N.mineSameShape(copy, state))
  N.importMineCells(copy, state.l, back)
  // the names come back as this browser knows them: its own player by name, the others as the lobby names them
  assert.deepEqual(M.mineCell(copy.grid, 1, 0).by, { shot: 'p1', bomb: '4:1' })
  assert.deepEqual(M.mineCell(copy.grid, 2, 1).by, { note: '7:1' })
  assert.equal(M.mineCell(copy.grid, 2, 1).turn, null); assert.equal(M.mineCell(copy.grid, 1, 0).fuse, 3.25)
  assert.deepEqual(copy.grid.cells.map(k => [k.open, k.bomb, k.free, k.flag, k.armed]), rd.grid.cells.map(k => [k.open, k.bomb, k.free, k.flag, k.armed]))
  assert.deepEqual(N.importMineStats(state.st, back), { p1: { music: 3, damage: 0, opened: 1, flags: 0, flagsOnBomb: 0, doubts: 0, solved: 0, disarmed: 0, installed: 0, kills: 0, deaths: 2 } })
  assert.equal(state.o, 1)
  // nothing changed: nothing to send; one block changed: that one
  assert.deepEqual(N.exportMineCells(rd, sent, out), [])
  M.mineCell(rd.grid, 3, 3).gauge = 0.5
  assert.deepEqual(N.exportMineCells(rd, sent, out).map(e => e[0]), [18])
})

test('what arrives is checked: a browser speaks only for its own players, and a round of another shape is not taken', () => {
  const acts = N.cleanMineActs({ a: [
    { k: 'note', c: 1, r: 0, side: 'open', by: '3:0', face: 'left', n: 5 },
    { k: 'note', c: 1, r: 0, side: 'open', by: '4:0' }, // someone else's player
    { k: 'note', c: 1, r: 0, side: 'up', by: '3:0' },
    { k: 'shot', c: 2, r: 1, d: 40, by: '3:1', face: 'nowhere' },
    { k: 'shot', c: 2, r: 1, d: -4, by: '3:1' },
    { k: 'shot', c: 2, r: 1, d: 5, by: '3:1', face: 'tl' }, // a cut corner's slanted wall
    { k: 'shot', c: 2, r: 1, d: 6, by: '3:1', side: 'closed' }, { k: 'shot', c: 2, r: 1, d: 7, by: '3:1', side: 'inside' }, // whose side shot
    { k: 'shock', c: 0, r: 2 },
    { k: 'use', c: 1, r: 1, use: 'disarm', by: '3:0' }, { k: 'use', c: 1, r: 1, use: 'eat', by: '3:0' },
    { k: 'install', c: 1, r: 1, by: '3:0', turn: 'x' },
    { k: 'dead', who: '3:0', owner: '9:2' }, { k: 'dead', who: '9:2' },
    { k: 'note', c: -1, r: 0, side: 'open', by: '3:0' }, 'x', null,
  ], k: [0, 0, 2, 'x', 44] }, 3)
  assert.deepEqual(acts, { a: [
    { k: 'note', c: 1, r: 0, side: 'open', by: '3:0', face: 'left', n: 5 },
    { k: 'shot', c: 2, r: 1, d: 40, by: '3:1' },
    { k: 'shot', c: 2, r: 1, d: 5, by: '3:1', face: 'tl' },
    { k: 'shot', c: 2, r: 1, d: 6, by: '3:1', side: 'closed' }, { k: 'shot', c: 2, r: 1, d: 7, by: '3:1' },
    { k: 'shock', c: 0, r: 2 },
    { k: 'use', c: 1, r: 1, use: 'disarm', by: '3:0' },
    { k: 'install', c: 1, r: 1, by: '3:0', turn: null },
    { k: 'dead', who: '3:0', owner: '9:2' },
  ], k: [0, 2] })
  assert.equal(N.cleanMineActs('x', 3), null); assert.equal(N.cleanMineActs({}, 3), null)
  assert.equal(N.cleanMineState({ n: 1, c: 5, r: 4, l: 'x' }), null)
  const state = N.cleanMineState({ n: 1, c: 5, r: 4, l: [[0, 1, 0, 0, 0, -1, 0], [99, 1, 0, 0, 0, -1, 0], [1, 1, 'x', 0, 0, -1, 0], [2, 2, -7, 3, 0, -1, 400]], e: [{ kind: 'boom', c: 1, r: 1, contained: false, cells: [{ c: 1, r: 1 }, { c: 'x' }], owner: '2:0' }, { kind: 'nope', c: 1, r: 1 }, { kind: 'end' }], k: ['2:0', 'p1', 7] })
  assert.deepEqual(state.l, [[0, 1, 0, 0, 0, -1, 0], [2, 2, -1, 1, 0, -1, -1]])
  assert.deepEqual(state.e, [{ kind: 'boom', c: 1, r: 1, owner: '2:0', contained: false, cells: [{ c: 1, r: 1 }] }, { kind: 'end' }])
  assert.deepEqual(state.k, ['2:0'])
  assert.deepEqual(N.cleanMineState({ n: 1, c: 5, r: 4, l: [], e: [{ kind: 'clear', c: 2, r: 1, by: '2:0' }] }).e, [{ kind: 'clear', c: 2, r: 1, by: '2:0' }])
  assert.equal(N.mineSameShape(R.mineRound(grid(1)), { n: 1, c: 6, r: 4, l: [] }), false)
})

test('a burst on one wall is one message', () => {
  const note = { k: 'note', c: 1, r: 0, side: 'open', by: 'p1', face: 'left' }, shot = { k: 'shot', c: 1, r: 0, d: 10, by: 'p1' }
  assert.deepEqual(N.batchMineActs([note, note, { ...note, n: 2 }, shot, shot, { ...shot, by: 'p2' }, note]), [{ ...note, n: 4 }, { ...shot, d: 20 }, { ...shot, by: 'p2' }, note])
  // a shot from the closed side is not added to one from the open side
  assert.deepEqual(N.batchMineActs([{ ...shot, side: 'open' }, { ...shot, side: 'open' }, { ...shot, side: 'closed' }]), [{ ...shot, side: 'open', d: 20 }, { ...shot, side: 'closed' }])
  assert.deepEqual(N.mapActIds({ k: 'dead', who: 'p1', owner: '5:0' }, id => N.mineIdOut(id, ['p1'], 2)), { k: 'dead', who: '2:0', owner: '5:0' })
  assert.deepEqual(N.mapEventIds({ kind: 'boom', c: 0, r: 0, owner: '2:1', contained: true, cells: [] }, id => N.mineIdIn(id, ['p1', 'p2'], 2)), { kind: 'boom', c: 0, r: 0, owner: 'p2', contained: true, cells: [] })
  assert.equal(same('x'), 'x')
})

test("the lobby's owner has the round: the others mirror it, and what their players do goes through the owner", () => {
  const a = browser(1), b = browser(2, ['p1', 'p2']), net = lobby(a, b)
  start(a, 11); start(b, 22)
  assert.notEqual(bombs(a), bombs(b), 'each browser drew its own bombs')
  net.frame()
  assert.equal(bombs(b), bombs(a), "the follower has the owner's round now")
  assert.equal(b.store.mineStore.mirrored, true); assert.equal(a.store.mineStore.mirrored, false)
  assert.equal(b.store.mineStore.roundNo, a.store.mineStore.roundNo)

  // the follower's second player plays four notes on (1,0): nothing changes there until the owner says so
  Object.assign(at(a, 1, 0), { bomb: true, armed: true })
  for (let i = 0; i < 4; i++) b.store.mineAct({ k: 'note', c: 1, r: 0, side: 'open', by: 'p2', face: 'left' })
  assert.equal(at(b, 1, 0).gauge, 0)
  net.frame(); net.frame()
  assert.equal(at(a, 1, 0).flag, true); assert.equal(at(b, 1, 0).flag, true)
  // each browser knows the player by its own name for them
  assert.deepEqual(a.events.filter(e => e.kind === 'flag'), [{ kind: 'flag', c: 1, r: 0, by: '2:1', bomb: true }])
  assert.deepEqual(b.events.filter(e => e.kind === 'flag'), [{ kind: 'flag', c: 1, r: 0, by: 'p2', bomb: true }])
  assert.equal(a.store.mineStore.round.stats['2:1'].flagsOnBomb, 1); assert.equal(b.store.mineStore.round.stats.p2.flagsOnBomb, 1)

  // the owner's own player shoots (2,0) open, and its detonator's time passes only at the owner
  Object.assign(at(a, 2, 0), { bomb: false, armed: false })
  a.store.mineAct({ k: 'shot', c: 2, r: 0, d: 100, by: 'p1' })
  net.frame()
  assert.equal(at(b, 2, 0).open, true)
  assert.equal(b.store.mineStore.round.stats['1:0'].opened, 1)
  Object.assign(at(a, 3, 0), { bomb: true, armed: true, doubt: true, fuse: 5 })
  a.store.stepMine(1); b.store.stepMine(1)
  net.frame()
  assert.equal(at(a, 3, 0).fuse, 4); assert.equal(at(b, 3, 0).fuse, 4)

  // a death and a Filhote at the follower: the owner counts it and tells everyone who is small
  b.store.mineAct({ k: 'dead', who: 'p1', owner: '1:0' })
  b.store.setMineChick('p1', true)
  a.store.setMineChick('p1', true)
  net.frame(); net.frame()
  assert.equal(a.store.mineStore.round.stats['2:0'].deaths, 1); assert.equal(a.store.mineStore.round.stats.p1.kills, 1)
  assert.equal(b.store.mineStore.round.stats.p1.deaths, 1)
  assert.equal(a.store.mineStore.netChick(2, 0), true); assert.equal(a.store.mineStore.netChick(2, 1), false)
  assert.equal(b.store.mineStore.netChick(1, 0), true)
  assert.equal(b.store.mineStore.isChick('p1'), true)

  // "Resetar grade" at the owner: another round for everyone, and everyone is an adult again
  start(a, 33)
  net.frame()
  assert.equal(bombs(b), bombs(a)); assert.equal(at(b, 1, 0).flag, false)
  assert.equal(b.store.mineStore.isChick('p1'), false)
  assert.deepEqual(b.store.mineStore.round.stats, {})

  // the owner leaves: the follower goes on with the round as it mirrored it, and decides it from now on
  a.store.mineAct({ k: 'shot', c: 4, r: 3, d: 30, by: 'p1' })
  net.frame()
  const before = bombs(b), no = b.store.mineStore.roundNo
  const alone = lobby(b)
  alone.frame()
  assert.equal(b.store.mineStore.mirrored, false)
  b.store.mineAct({ k: 'shot', c: 4, r: 3, d: 20, by: 'p2' })
  assert.equal(at(b, 4, 3).gauge, -0.5)
  assert.equal(bombs(b), before); assert.equal(b.store.mineStore.roundNo, no)
})

test('a third browser hears of the round from the owner only, and joins in the middle of it', () => {
  const a = browser(1), b = browser(2), net = lobby(a, b)
  start(a, 5); start(b, 6)
  net.frame()
  b.store.mineAct({ k: 'shot', c: 1, r: 1, d: 50, by: 'p1' })
  net.frame(); net.frame()
  const c = browser(3), all = lobby(a, b, c)
  start(c, 7)
  all.frame()
  assert.equal(bombs(c), bombs(a)); assert.equal(at(c, 1, 1).gauge, -0.5)
  // what a follower says is not a round: the others ignore it
  c.sync.receive(2, { n: 1, c: 5, r: 4, f: 1, l: [[6, 1, 0, 0, 0, -1, 0]] }, 1)
  assert.equal(at(c, 1, 1).open, false)
  // a round of another shape (the Pátio's settings on their way) is not taken either
  c.store.startMineRound(M.createMineGrid(M.mineGeometry({ cell: 100, gap: 20 }, { width: 6 * 100 + 5 * 20, top: 1000 - (4 * 100 + 3 * 20), ground: 1000 }), { bombs: 0, seed: 1 }))
  a.store.mineAct({ k: 'shot', c: 1, r: 1, d: 10, by: 'p1' })
  all.frame(6000)
  assert.equal(M.mineCell(c.store.mineStore.round.grid, 1, 1).gauge, 0)
})
