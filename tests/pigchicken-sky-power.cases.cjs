const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const world = loadTs('lib/pigchicken/world.ts')
const L = loadTs('lib/pigchicken/layout.ts')
const P = loadTs('lib/pigchicken/power-lines.ts')
const S = loadTs('lib/pigchicken/sky.ts')
const B = loadTs('lib/pigchicken/bird-perch.ts')
const PS = loadTs('lib/pigchicken/patio-settings.ts')
const EX = loadTs('lib/pigchicken/example-patios.ts')

const pole = (x, extra = {}, power = {}) => L.normalizeElement({ ...L.createElement('pole', x, 500), ...extra, params: { power: { ...P.defaultPower('pole'), ...power } } })

test('poles of the same model and line join their neighbours along x, one wire per attachment', () => {
  const els = [pole(1200), pole(200), pole(700), pole(900, {}, { line: 2 }), pole(1500, {}, { model: 'rua' })]
  const spans = P.powerSpans(els)
  const n = P.POWER_MODELS.madeira.attach.length
  assert.equal(spans.length, 2 * n)
  // sorted by x: 200 → 700 → 1200
  const firsts = spans.filter(s => s.id.endsWith(':0')).map(s => Math.round(s.a.x))
  assert.deepEqual(firsts, [Math.round(els[1].x + els[1].w * 0.06), Math.round(els[2].x + els[2].w * 0.06)])
})

test('a wire between poles of different depths follows each end with the camera', () => {
  const a = pole(200), b = pole(800, { depth: 0.5 })
  assert.equal(b.depth, 0.5)
  assert.equal(b.solid, false)
  const [s] = P.powerSpans([a, b])
  const c0 = P.spanCurve(s, 0, 0), c1 = P.spanCurve(s, 1000, 0)
  assert.equal(c1.a.x, c0.a.x)
  assert.equal(c1.b.x, c0.b.x + 500)
  assert.equal(P.fixedDepth([s]), false)
  // the curve sags below the straight line in the middle
  const mid = P.spanPoint(s, 0.5, 0, 0)
  assert.ok(mid.y > (c0.a.y + c0.b.y) / 2)
})

test('scenery in a depth never collides and keeps no region', () => {
  const tree = L.normalizeElement({ ...L.createElement('platform', 500, 500), depth: 0.4, solid: true, shots: true, region: 'village' })
  assert.equal(tree.solid, false); assert.equal(tree.shots, false); assert.equal(tree.region, undefined)
  assert.deepEqual(L.layoutBoxes([tree]), [])
  assert.equal(L.normalizeElement({ ...L.createElement('rack', 500, 500), depth: 0.4 }).depth, undefined)
  assert.equal(L.normalizeElement({ ...tree, depth: 2 }).depth, 0.95)
})

test('the sky: normalized, by the hour, random and classic', () => {
  assert.equal(S.normalizeSky(null), undefined)
  const sky = S.normalizeSky({ hour: 30, stops: [{ at: 0.5, color: '#FF0000' }, { at: 0, color: '#000000' }], silhouette: 300 })
  assert.equal(sky.hour, 24); assert.equal(sky.silhouette, 100)
  assert.deepEqual(sky.stops.map(s => s.at), [0, 0.5])
  assert.equal(sky.stops[1].color, '#ff0000')
  const noon = S.skyLook({ ...S.SKY_DEFAULT, hour: 12, silhouette: 0 }), dusk = S.skyLook({ ...S.SKY_DEFAULT, hour: 18.6, silhouette: 90 })
  assert.ok(noon.sun.y < dusk.sun.y)
  const bright = l => l.scenery === 'none' ? 1 : Number(/brightness\(([\d.]+)/.exec(l.scenery)[1])
  assert.ok(bright(noon) > 0.95)
  assert.ok(bright(dusk) < 0.3)
  let seed = 1
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 30; i++) {
    const r = S.randomSky(rand)
    assert.deepEqual(S.normalizeSky(JSON.parse(JSON.stringify(r))), r)
    assert.ok(r.stops.length >= 3 && r.stops.length <= 7)
  }
  assert.equal(S.skyLook(undefined).scenery, 'none')
  const settings = PS.normalizePatioSettings({ sky: S.SKY_DEFAULT, sceneMusic: false })
  assert.equal(settings.sceneMusic, false)
  assert.equal(PS.patioSceneMusic(settings), false)
  assert.equal(PS.patioSceneMusic(undefined), true)
})

test('birds perch on free spots, slide away from a player and sometimes fly to another spot', () => {
  const w = B.createPerchWorld()
  B.setPerchSpans(w, P.powerSpans([pole(200), pole(900)]))
  const p = B.birdPerchParams({ flee: 1, cooldown: 0 })
  let seed = 3
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const a = B.perchStart(w, 500, 300, p, rand), b = B.perchStart(w, 500, 300, p, rand)
  assert.ok(a && b)
  assert.ok(a.span !== b.span || Math.abs(a.t - b.t) * 700 >= p.spacing - 1)
  const pos = { x: 500, y: 300, face: 1 }
  for (let i = 0; i < 200 && a.phase === 'fly'; i++) { w.time += 1 / 60; B.perchStep(w, a, pos, 1 / 60, p, rand) }
  assert.equal(a.phase, 'sit')
  const spot = { span: a.span, t: a.t }
  // a player right under it: it notices, then flies off to a spot away from the player
  w.players = [{ x: pos.x, y: pos.y + 40 }]
  let flew = false
  for (let i = 0; i < 120; i++) { w.time += 1 / 60; if (B.perchStep(w, a, pos, 1 / 60, p, rand) === 'fly') flew = true }
  assert.ok(flew)
  assert.ok(a.span !== spot.span || a.t !== spot.t)
  // with no flee at all it only slides along the wire, slower than the chicken runs
  const c = B.perchStart(w, 300, 300, B.birdPerchParams({ flee: 0 }), rand)
  const cp = { x: 300, y: 300, face: 1 }
  for (let i = 0; i < 300 && c.phase === 'fly'; i++) { w.time += 1 / 60; B.perchStep(w, c, cp, 1 / 60, B.birdPerchParams({ flee: 0 }), rand) }
  w.players = [{ x: cp.x - 30, y: cp.y + 30 }]
  const x0 = cp.x
  for (let i = 0; i < 60; i++) { w.time += 1 / 60; assert.notEqual(B.perchStep(w, c, cp, 1 / 60, B.birdPerchParams({ flee: 0 }), rand), 'fly') }
  assert.ok(cp.x > x0 && cp.x - x0 < B.CHICKEN_RUN)
  const v = B.fleeFrom(0, 0, { x: 50, y: 0 }, p)
  assert.ok(v.vx < 0 && Math.hypot(v.vx, v.vy) < B.CHICKEN_RUN)
})

test('the example Pátio survives saving and has wires, a sky and the Passaguá', () => {
  const layout = EX.sunsetPowerLayout()
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(layout))), layout)
  assert.ok(P.powerSpans(layout.elements).length > 40)
  assert.ok(layout.elements.some(e => e.kind === 'rack' && e.params.item === 'passagua'))
  assert.equal(layout.elements.filter(e => e.kind === 'entry').length, 1)
  assert.ok(layout.settings.sky)
  if (process.env.DUMP_EXAMPLE) require('fs').writeFileSync(process.env.DUMP_EXAMPLE, JSON.stringify(layout))
})
