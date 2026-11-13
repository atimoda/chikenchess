const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const world = loadTs('lib/pigchicken/world.ts')
const L = loadTs('lib/pigchicken/layout.ts')
const C = loadTs('lib/pigchicken/chalkboard.ts')
const PS = loadTs('lib/pigchicken/patio-settings.ts')
const T = loadTs('lib/pigchicken/example-training.ts')
const SEED = loadTs('lib/pigchicken/example-seed.ts')

test('a Quadro de lousa keeps its text, its move and the ghost\'s place through saving, within limits', () => {
  const el = L.createElement('chalkboard', 500, 400)
  assert.equal(el.layer, 'back')
  assert.equal(el.solid, false)
  assert.deepEqual(el.params.chalkboard, C.defaultChalkboard())
  const raw = { ...el, params: { chalkboard: { text: 'x'.repeat(900), demo: 'wall', ghostX: -9999, ghostY: 30.4, reach: 5 } } }
  const back = L.normalizeElement(JSON.parse(JSON.stringify(raw)))
  assert.equal(back.params.chalkboard.text.length, C.CHALK_TEXT_MAX)
  assert.equal(back.params.chalkboard.demo, 'wall')
  assert.equal(back.params.chalkboard.ghostX, C.GHOST_OFFSET.min)
  assert.equal(back.params.chalkboard.ghostY, 30)
  assert.equal(back.params.chalkboard.reach, C.GHOST_REACH.min)
  // an unknown move is no move
  assert.equal(L.normalizeElement({ ...raw, params: { chalkboard: { demo: 'teleport' } } }).params.chalkboard.demo, '')
})

test('picking a move writes its buttons on a board that has no text of its own', () => {
  const fresh = C.chalkboardForDemo(C.defaultChalkboard(), 'jump')
  assert.equal(fresh.text, C.TRAINING_DEMOS.jump.text)
  assert.equal(C.chalkboardForDemo(fresh, 'fly').text, C.TRAINING_DEMOS.fly.text)
  const own = C.chalkboardForDemo({ ...C.defaultChalkboard(), text: 'Meu texto' }, 'fly')
  assert.equal(own.text, 'Meu texto')
  assert.equal(own.demo, 'fly')
})

test('a move\'s script holds its actions for each stretch and nothing past its end', () => {
  const demo = { steps: [[0.5, ''], [0.2, 'right+jump'], [0.3, 'down+bogus']] }
  assert.equal(C.demoLength(demo), 1)
  assert.deepEqual(C.demoActionsAt(demo, 0.1), {})
  assert.deepEqual(C.demoActionsAt(demo, 0.6), { right: true, jump: true })
  assert.deepEqual(C.demoActionsAt(demo, 0.8), { down: true })
  assert.deepEqual(C.demoActionsAt(demo, 2), {})
  // every move only uses the chicken's movement actions and ends with nothing held (the next round starts clean)
  for (const id of C.DEMO_IDS) {
    const d = C.TRAINING_DEMOS[id]
    for (const [s, keys] of d.steps) {
      assert.ok(s > 0, id)
      for (const k of keys.split('+').filter(Boolean)) assert.ok(C.DEMO_ACTIONS.includes(k), `${id}: ${k}`)
    }
    assert.equal(d.steps[d.steps.length - 1][1], '', id)
    assert.ok(d.text.split('\n').length >= 3, id)
  }
})

test('the chalk text fits the board and the ghost shows only near it', () => {
  const small = C.chalkFit('A\nB', 420, 260), long = C.chalkFit('uma linha bem comprida '.repeat(4), 420, 260)
  assert.ok(small.size > long.size)
  assert.ok(long.size * 0.5 * 92 <= 420)
  const board = { x: 1000, y: 400, w: 400, h: 200 }
  const params = { reach: 300, ghostY: 250 }
  assert.equal(C.nearBoard(board, params, 1200, 930), true)
  assert.equal(C.nearBoard(board, params, 1600, 930), false)
  assert.equal(C.nearBoard(board, params, 1200, 1300), false)
  assert.equal(C.nearBoard(board, params, 1200, 0), false)
})

test('the Training room survives saving, goes from the basic moves to the advanced ones and is an example Pátio', () => {
  const layout = T.trainingLayout()
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(layout))), layout)
  assert.deepEqual(T.trainingLayout(), layout)
  assert.ok(JSON.stringify(layout).length < 400000)
  const screens = layout.settings.screens
  const els = L.elementsInWorld(layout, screens)
  assert.equal(els.length, layout.elements.length)
  assert.equal(els.filter(e => e.kind === 'entry').length, 1)
  els.filter(e => e.kind === 'portal').forEach(p => assert.ok(L.portalPartner(p, els)))
  const worldW = world.worldScenes(screens) * world.SCENE_W
  assert.ok(els.every(e => e.x >= 0 && e.x + e.w <= worldW && e.y >= PS.patioWorldTop(layout.settings)))
  // one board per move, every move once, in the stations' order, each ghost starting on a floor next to it
  const boards = els.filter(e => e.kind === 'chalkboard' && e.params.chalkboard.demo)
  assert.deepEqual(boards.map(b => b.params.chalkboard.demo), T.TRAINING_STATIONS.map(s => s.demo))
  assert.deepEqual([...new Set(boards.map(b => b.params.chalkboard.demo))].sort(), [...C.DEMO_IDS].sort())
  boards.forEach((b, i) => {
    const s = T.TRAINING_START + i * T.STATION_W
    assert.ok(b.x + b.w / 2 > s && b.x + b.w / 2 < s + T.STATION_W, `board ${i}`)
    const x = b.x + b.w / 2 + b.params.chalkboard.ghostX
    const floor = L.layoutFloorBelow(els, x, b.y + b.h + b.params.chalkboard.ghostY)
    assert.equal(Math.round(world.WORLD_GROUND_Y - floor), T.TRAINING_STATIONS[i].start[1], `ghost ${i}`)
    assert.ok(C.nearBoard(b, b.params.chalkboard, x, floor), `near ${i}`)
  })
  const ex = SEED.EXAMPLE_PATIOS.find(e => e.name === 'Training room')
  assert.ok(ex)
  assert.deepEqual(ex.layout(), layout)
  assert.equal(new Set(SEED.EXAMPLE_PATIOS.map(e => e.id)).size, SEED.EXAMPLE_PATIOS.length)
})
