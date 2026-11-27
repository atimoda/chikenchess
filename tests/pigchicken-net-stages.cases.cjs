// The fases de notas played in another browser, online (lib/pigchicken/net-stages.ts): what a stage looks like to the
// others, cleaned as it arrives, kept while it is said again, its zone busy and the notes her rebates let out.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const N = loadTs('lib/pigchicken/net-stages.ts')
const stageLib = loadTs('lib/pigchicken/note-stage.ts')
const music = loadTs('lib/pigchicken/music.ts')

function playing() {
  const song = { ...stageLib.TEST_SONG, id: 'net-test', aliens: [{ species: 'twin', variant: 'twin-tercas', notes: [{ beat: 0, midi: 62 }, { beat: 1, midi: 64 }] }] }
  const st = stageLib.createNoteStage()
  const conductor = music.createConductor()
  const targets = [], fired = []
  const io = () => ({
    targets, music: conductor, sceneL: 1920, sceneW: 1920, groundY: 930, inside: true, center: { x: 2900, y: 860 },
    resetHit: false, events: [], fire: n => fired.push({ ...n, id: fired.length + 1, state: 'incoming', t: 0 }), clearShots() {},
    incoming: 0, fx: { burst() {}, text() {} }, push() {}, sound() {},
  })
  st.start(io(), { song, owner: 'p1', zone: 'zone-a', zoneName: 'A', by: 'jukebox', goal: stageLib.GOAL_DEFAULT, record: true, again: '' })
  for (let i = 0; i < 60 * 30 && !fired.length; i++) { conductor.step(1 / 60); st.step(1 / 60, io()) }
  return { st, targets, fired }
}
const wire = v => JSON.parse(JSON.stringify(v))

test('a stage playing here goes out with its song, score, hearts, aliens and its own note shots', () => {
  const { st, targets, fired } = playing()
  const other = { id: 99, x: 0, y: 0, vx: 0, vy: 0, color: '#fff', size: 5, state: 'incoming', midi: 60, source: 'someone-else' }
  const act = N.stageAct(st, 1, targets, [...fired, other])
  assert.equal(act.k, 'ns'); assert.equal(act.s, 1); assert.equal(act.z, 'zone-a')
  assert.equal(act.hm, stageLib.GOAL_DEFAULT.hearts); assert.equal(act.h, st.state.hearts)
  assert.equal(act.a.length, st.state.aliens.length); assert.equal(act.a[0][4], 'twin'); assert.equal(act.a[0][5], '#4cc9f0')
  assert.equal(act.q.length, fired.length, "only this stage's shots")
  const back = N.cleanStageAct(wire(act))
  assert.deepEqual(back, act, 'it comes back the same')
})

test('cleaning: wrong shapes and unknown species are left out, numbers are kept in range', () => {
  assert.equal(N.cleanStageAct({ k: 'ns', s: 9, z: 'a', n: 'x', sc: 0, cb: 0, h: 1, hm: 1, af: 1, x: 0, y: 0, a: [], q: [] }), null)
  assert.equal(N.cleanStageAct({ k: 'pk' }), null)
  const c = N.cleanStageAct({ k: 'ns', s: 0, z: 'a', n: 'x', c: 'x;y', sc: -5, cb: 3, h: 20, hm: 3, af: 7, x: 0, y: 0, a: [[0, 0, 10, 10, 'nope', '#fff', 1, 0], [0, 0, 10, 10, 'jelly', 'bad;', 1, 0]], q: [[1, 0, 0, 9e9, 0, '#fff', 5, 1, 60], 'x'], cp: 1 })
  assert.equal(c.c, '#ffd166'); assert.equal(c.sc, 0); assert.equal(c.h, 9); assert.equal(c.af, 1); assert.equal(c.cp, 1)
  assert.deepEqual(c.a.map(a => [a[4], a[5]]), [['jelly', loadTs('lib/pigchicken/temple.ts').SPECIES.jelly.color]])
  assert.equal(c.q.length, 1); assert.equal(c.q[0][3], 5000)
})

test("another browser's stage: kept while it is said again, its zone busy, and each rebated note heard once", () => {
  const store = N.createNetStageStore()
  const act = { k: 'ns', s: 0, z: 'zone-a', n: 'x', c: '#fff', sc: 0, cb: 0, h: 3, hm: 3, af: 1, x: 0, y: 0, a: [], q: [[1, 10, 20, 0, 0, '#fff', 5, 0, 64]] }
  store.receive(4, act, 0)
  assert.equal(store.busy('zone-a', 100), true); assert.equal(store.busy('zone-b', 100), false)
  assert.deepEqual(store.takeHeard(), [])
  store.receive(4, { ...act, q: [[1, 10, 20, 0, 0, '#fff', 5, 1, 64]] }, 100)
  store.receive(4, { ...act, q: [[1, 10, 20, 0, 0, '#fff', 5, 1, 64]] }, 200)
  assert.deepEqual(store.takeHeard(), [{ midi: 64, x: 10, y: 20 }], 'once, when it turned')
  assert.equal(store.list(200 + N.STAGE_HOLD_MS - 1).length, 1)
  assert.equal(store.busy('zone-a', 200 + N.STAGE_HOLD_MS + 1), false, 'nobody says it any more: over')
  store.receive(4, act, 1000)
  store.keep(new Set([5]))
  assert.equal(store.size, 0, 'its browser left')
})

test("the Templo do Gongo's campaign goes as a stage of its zone, its bombs as the shots", () => {
  const camp = { phase: 'playing', score: 1200, combo: 4, hearts: 2, aliens: [{ id: 7 }], bombs: [{ x: 5, y: 6, vx: 1, vy: 200, kind: 'fire' }] }
  const act = N.campaignAct(camp, 0, 'temple', 'Primeira onda', 3, { x: 100, y: 800 }, [{ id: 7, x: 30, y: 40, w: 50, h: 40, deadT: 0, data: { kind: 'temple', species: 'jelly', color: '#abc' } }])
  assert.equal(act.cp, 1); assert.equal(act.z, 'temple'); assert.equal(act.sc, 1200); assert.equal(act.h, 2); assert.equal(act.hm, 3)
  assert.deepEqual(act.a, [[30, 40, 50, 40, 'jelly', '#abc', 1, 0]])
  assert.deepEqual(act.q.map(q => [q[1], q[2], q[4], q[5]]), [[5, 6, 200, '#ff8c1a']])
  const store = N.createNetStageStore()
  store.receive(2, N.cleanStageAct(wire({ ...act, q: act.q.map(q => { q[7] = 1; return q }) })), 0)
  assert.deepEqual(store.takeHeard(), [], 'bombs play no notes')
})
