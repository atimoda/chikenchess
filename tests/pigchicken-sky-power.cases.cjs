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
const VALE = loadTs('lib/pigchicken/example-valley.ts')

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

test('the valley example survives saving, fills its six scenes and wires every pole and tower by links', () => {
  const layout = VALE.valleyLayout()
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(layout))), layout)
  assert.deepEqual(VALE.valleyLayout(), layout)
  assert.ok(layout.elements.length < L.LAYOUT_MAX_ELEMENTS)
  assert.equal(layout.settings.screens, 4)
  assert.equal(layout.settings.temple, false)
  const els = L.elementsInWorld(layout, 4)
  assert.equal(els.length, layout.elements.length)
  assert.equal(els.filter(e => e.kind === 'entry').length, 1)
  // something of the ground in every scene, the two after the Parquinho included
  for (let s = 0; s < 6; s++) assert.ok(els.some(e => e.kind === 'house' && !e.depth && Math.floor((e.x + e.w / 2) / world.SCENE_W) === s), `scene ${s}`)
  // every pole and tower is wired by hand and reaches another one
  const power = els.filter(e => L.isPowerElement(e.kind))
  assert.ok(power.every(e => Array.isArray(e.params.power.links)))
  assert.ok(power.every(e => P.linkedTo(els, e.id).size > 0))
  assert.ok(P.powerSpans(els).length > 150)
  // every portal has its partner and every rack item exists
  els.filter(e => e.kind === 'portal').forEach(p => assert.ok(L.portalPartner(p, els)))
  const items = new Set(els.filter(e => e.kind === 'rack').map(e => e.params.item))
  assert.ok(items.size >= 20)
  // nothing above the ceiling
  assert.ok(els.every(e => e.depth || e.y >= PS.patioWorldTop(layout.settings)))
})

test('changing one pole\'s model or wire floor changes its whole line', () => {
  const a = pole(200), b = pole(700), c = pole(1200), other = pole(900, {}, { line: 2 })
  const els = [a, b, c, other]
  const changed = { ...b, params: { power: { ...b.params.power, model: 'rua' } } }
  const out = P.spreadPower(els, b, changed)
  assert.deepEqual(out.map(e => e.params.power.model), ['rua', 'rua', 'rua', 'madeira'])
  // same height and base centre, in the new proportions
  const m = P.POWER_MODELS.rua
  assert.equal(out[0].w, Math.round(a.h * m.w / m.h))
  assert.equal(out[0].x + out[0].w / 2, a.x + a.w / 2)
  const off = P.spreadPower(els, a, { ...a, params: { power: { ...a.params.power, floor: false } } })
  assert.deepEqual(off.map(e => e.params.power.floor), [false, false, false, true])
  // only those two spread: the sag stays each one's own
  const sag = P.spreadPower(els, a, { ...a, params: { power: { ...a.params.power, sag: 90 } } })
  assert.deepEqual(sag.map(e => e.params.power.sag), [90, 40, 40, 40])
})

test('wires on the ground\'s depth are floors unless their line turns it off', () => {
  assert.equal(P.normalizePower('pole', {}).floor, true)
  assert.equal(P.normalizePower('pole', { floor: false }).floor, false)
  const [s] = P.powerSpans([pole(200), pole(700)])
  const pts = P.spanFloor(s)
  assert.equal(pts.length, 13)
  assert.ok(pts[6].y > pts[0].y)
  assert.equal(P.spanFloor(P.powerSpans([pole(200), pole(700, { depth: 0.3 })])[0]), null)
  assert.equal(P.spanFloor(P.powerSpans([pole(200, {}, { floor: false }), pole(700, {}, { floor: false })])[0]), null)
})

test('the sky can curve its bands round the sun', () => {
  const flat = S.skyLook(S.SKY_DEFAULT)
  assert.equal(S.skyRadial(flat, 0, 0, 100, 50), null)
  const sky = S.normalizeSky({ ...S.SKY_DEFAULT, radial: 60, radialX: 300, radialY: 20 })
  assert.equal(sky.radialX, 100)
  const css = S.skyRadial(S.skyLook(sky), 0, 0, 100, 50)
  assert.match(css, /^radial-gradient\(\d+px \d+px at 190px 124px, /)
  // the horizon's colour at the centre, the top's further out, then the space above
  const look = S.skyLook(sky)
  assert.ok(css.indexOf(look.stops[look.stops.length - 1].color) < css.indexOf(look.stops[0].color))
  assert.ok(css.endsWith(`${look.space} ${(2524 / 124 * 100).toFixed(2)}%)`))
})

test('mountains: normalized, and the sky\'s old on/off moves to them', () => {
  const M = loadTs('lib/pigchicken/mountains.ts')
  assert.deepEqual(M.normalizeMountains({ ranges: 9, height: 1, snow: 50, tint: '#ABCDEF', shape: 5.4 }),
    { ...M.MOUNTAINS_DEFAULT, ranges: 6, height: 20, snow: 50, tint: '#abcdef', shape: 5 })
  assert.equal(M.normalizeMountains({ lift: 500, snowEdge: -3 }).lift, 100)
  assert.equal(M.normalizeMountains({ lift: 500, snowEdge: -3 }).snowEdge, 0)
  assert.equal(PS.normalizePatioSettings({ sky: { ...S.SKY_DEFAULT, mountains: false } }).mountains.show, false)
  assert.equal(PS.normalizePatioSettings({ sky: S.SKY_DEFAULT }).mountains, undefined)
})

test('clouds: their own settings, or the sky\'s old amount', () => {
  const C = loadTs('lib/pigchicken/clouds.ts')
  assert.equal(C.normalizeClouds({ size: 900, wind: -1, tint: 'nope' }).size, 600)
  assert.equal(C.normalizeClouds({ size: 900, wind: -1, tint: 'nope' }).wind, 0)
  assert.equal(C.normalizeClouds({ tint: 'nope' }).tint, C.CLOUDS_DEFAULT.tint)
  assert.equal(C.patioClouds(undefined, 30).amount, 30)
  assert.equal(C.patioClouds(undefined, undefined).amount, 100)
  assert.equal(PS.normalizePatioSettings({ clouds: { amount: 10 } }).clouds.amount, 10)
})

test('the sun\'s colour and glow, and the stars, can be set', () => {
  const sky = S.normalizeSky({ ...S.SKY_DEFAULT, hour: 2, sunColor: '#FF0000', glowSize: 999, starCount: 200, starSize: 10, starGlow: 200 })
  assert.equal(sky.sunColor, '#ff0000'); assert.equal(sky.glowSize, 300); assert.equal(sky.starSize, 30)
  const look = S.skyLook(sky)
  assert.equal(look.sun.color, '#ff0000'); assert.equal(look.sun.glowSize, 3); assert.equal(look.starCount, 2)
  assert.ok(look.stars <= 1 && look.stars > S.skyLook({ ...sky, starGlow: 50 }).stars)
  assert.equal(S.normalizeSky({ sunColor: 'red' }).sunColor, '')
})

test('the empty and the example Pátios have no Templo nor Vila', () => {
  assert.equal(L.emptyLayout().settings.temple, false)
  assert.equal(EX.sunsetPowerLayout().settings.temple, false)
  assert.equal(PS.patioTemple(undefined), true)
  assert.equal(PS.patioTemple(PS.normalizePatioSettings({ temple: false })), false)
  assert.deepEqual(L.normalizeLayout(JSON.parse(JSON.stringify(L.emptyLayout()))).settings, L.emptyLayout().settings)
})

test('the sky\'s texture: size, streaks, grain and blend', () => {
  const sky = S.normalizeSky({ ...S.SKY_DEFAULT, texScale: 9999, texStreak: 80, texGrain: -4, texBlend: 'multiply' })
  assert.equal(sky.texScale, 400); assert.equal(sky.texGrain, 0); assert.equal(sky.texBlend, 'multiply')
  assert.deepEqual(S.skyLook(sky).textureLook, { scale: 4, streak: 0.8, grain: 0, blend: 'multiply' })
  assert.equal(S.normalizeSky({ texBlend: 'difference' }).texBlend, 'soft')
  assert.equal(S.skyLook(S.SKY_DEFAULT).textureLook.blend, 'soft-light')
})

test('links: any pole to any other of its kind, whatever the model, line or order', () => {
  const a = pole(200, {}, { links: [] }), b = pole(700, {}, { links: [], line: 3 }), c = pole(1200, {}, { links: [], model: 'rua' })
  let els = [a, b, c]
  assert.equal(P.powerSpans(els).length, 0)
  const r = P.toggleLink(els, a.id, c.id)
  assert.equal(r.linked, true)
  els = r.elements
  assert.deepEqual(P.powerPairs(els).map(([x, y]) => [x.id, y.id]), [[a.id, c.id]])
  assert.deepEqual([...P.linkedTo(els, c.id)], [a.id])
  // the same click again takes the wire away, from either end
  assert.equal(P.toggleLink(els, c.id, a.id).linked, false)
  assert.equal(P.powerSpans(P.toggleLink(els, c.id, a.id).elements).length, 0)
  // a tower never joins a pole
  const t = L.normalizeElement({ ...L.createElement('tower', 900, 500), params: { power: { ...P.defaultPower('tower'), links: [] } } })
  assert.equal(P.toggleLink([...els, t], a.id, t.id), null)
  // a removed pole leaves no link behind
  assert.deepEqual(P.dropLinks(els, c.id).find(e => e.id === a.id).params.power.links, [])
})

test('links: a Pátio saved before them keeps its wires, and turning them into links keeps the same ones', () => {
  const els = [pole(1200), pole(200), pole(700)]
  const before = P.powerPairs(els).map(([x, y]) => `${x.id}|${y.id}`).sort()
  const made = P.materializeLinks(els)
  assert.ok(made.every(e => Array.isArray(e.params.power.links)))
  assert.deepEqual(P.powerPairs(made).map(([x, y]) => `${x.id}|${y.id}`).sort(), before)
  // a new model goes to every pole reached through the wires, not to an unwired one of the same line
  const lone = pole(2000, {}, { links: [] })
  const all = [...made, lone]
  const after = { ...made[1], params: { ...made[1].params, power: { ...made[1].params.power, model: 'rua' } } }
  const next = P.spreadPower(all, made[1], after)
  assert.deepEqual(next.map(e => e.params.power.model), ['rua', 'rua', 'rua', 'madeira'])
})

test('links survive normalizing, deduplicated and capped', () => {
  const ids = Array.from({ length: 20 }, (_, i) => `p${i % 15}`)
  const p = P.normalizePower('pole', { links: [...ids, 3, ''] })
  assert.equal(p.links.length, P.POWER_LINKS_MAX)
  assert.equal(P.normalizePower('pole', {}).links, undefined)
})

const MD = loadTs('lib/pigchicken/mountain-draw.ts')
const MT = loadTs('lib/pigchicken/mountains.ts')
const SF = loadTs('lib/pigchicken/snowfall.ts')

test('mountains: every peak type draws peaks the snow and the shading can find', () => {
  for (const type of ['wave', 'sharp', 'geo']) {
    const rg = MD.ridge(4000, 3, 720, 190, 1.3, type === 'wave' ? 24 : 16, type, 5000)
    assert.ok(rg.peaks.length >= 3, type)
    assert.ok(rg.peaks.every(p => p.lo <= p.i && p.i <= p.hi && p.y >= rg.top), type)
    for (const style of ['slopes', 'split', 'creases']) assert.ok(MD.shadeFaces(rg, style, 5000, 1).length > 0, `${type} ${style}`)
    for (const style of ['tongues', 'waves', 'soft', 'streaks', 'ridge']) assert.ok(MD.snowRegion(rg, { amount: 0.6, perPeak: true, style, edge: 0.5, side: 0.5 }, 7), `${type} ${style}`)
    assert.equal(MD.snowRegion(rg, { amount: 0, perPeak: true, style: 'tongues', edge: 0.5, side: 0 }, 7), null)
  }
})

test('mountains: snow on every peak gives each peak its own cap; one line leaves the low ones bare', () => {
  const rg = MD.ridge(4000, 7, 790, 160, 1.7, 16, 'geo', 5000)
  const caps = s => (s.match(/M /g) || []).length
  const each = MD.snowRegion(rg, { amount: 0.3, perPeak: true, style: 'soft', edge: 0.3, side: 0 }, 1)
  const line = MD.snowRegion(rg, { amount: 0.3, perPeak: false, style: 'soft', edge: 0.3, side: 0 }, 1)
  assert.equal(caps(each), rg.peaks.length)
  assert.ok(!line || caps(line) < caps(each))
})

test('mountains and snowfall: the new settings are cleaned and kept with the Pátio', () => {
  const m = MT.normalizeMountains({ peak: 'geo', shadeStyle: 'split', snowStyle: 'ridge', snowSide: 140, opacity: 5, outline: 30, outlineColor: '#ABCDEF', snowPeaks: false })
  assert.equal(m.peak, 'geo'); assert.equal(m.shadeStyle, 'split'); assert.equal(m.snowStyle, 'ridge')
  assert.equal(m.snowSide, 100); assert.equal(m.opacity, MT.MOUNTAIN_OPACITY.min); assert.equal(m.outlineColor, '#abcdef'); assert.equal(m.snowPeaks, false)
  const old = MT.normalizeMountains({ snow: 40 })
  assert.equal(old.peak, 'wave'); assert.equal(old.snowStyle, 'tongues'); assert.equal(old.snowPeaks, true); assert.equal(old.opacity, 100)
  assert.equal(MT.normalizeMountains({ peak: 'blob' }).peak, 'wave')
  const f = SF.normalizeSnowfall({ amount: 150, wind: -500, size: 1 })
  assert.deepEqual([f.amount, f.wind, f.size], [100, -100, SF.SNOWFALL_SIZE.min])
  assert.equal(PS.normalizePatioSettings({ snowfall: { amount: 30 } }).snowfall.amount, 30)
  assert.equal(SF.flakeCount(100, 1600, 900), 450)
})

const CD = loadTs('lib/pigchicken/cloud-draw.ts')
const CL = loadTs('lib/pigchicken/clouds.ts')

test('sun: softness, glow colour and position are cleaned and reach the look; old skies stay as they were', () => {
  const old = S.normalizeSky({ hour: 18.2 })
  assert.deepEqual([old.sunSoft, old.glowColor, old.sunX, old.sunLift, old.radialSun, old.radialSize], [0, '', 0, 0, false, 100])
  const base = S.skyLook(old)
  assert.equal(base.sun.x, 0); assert.equal(base.sun.soft, 0); assert.equal(base.sun.glowColor, base.sun.color)
  const sky = S.normalizeSky({ hour: 18.2, sunSoft: 150, glowColor: '#FF80D0', sunX: -400, sunLift: 50, glow: 500, radialSun: true, radialSize: 5 })
  assert.deepEqual([sky.sunSoft, sky.glowColor, sky.sunX, sky.sunLift, sky.glow, sky.radialSun, sky.radialSize], [100, '#ff80d0', -100, 50, S.SKY_GLOW.max, true, S.SKY_RADIAL_SIZE.min])
  const look = S.skyLook(sky)
  assert.equal(look.sun.x, -100 * S.SKY_SUN_MOVE.x)
  assert.equal(look.sun.y, base.sun.y - 50 * S.SKY_SUN_MOVE.y)
  assert.equal(look.sun.glowColor, '#ff80d0')
  assert.ok(look.horizonGlow <= 1)
})

test('sky rings round the sun: centred on it, the horizon colour inside and the top colour outside', () => {
  const sky = { ...S.SKY_DEFAULT, follow: false, stops: [{ at: 0, color: '#112233' }, { at: 1, color: '#ffeedd' }], radial: 96, radialSun: true, sunX: 10 }
  const look = S.skyLook(sky)
  const css = S.skyRadial(look, -4200, -200, 870, 1350)
  const m = /radial-gradient\((\d+)px (\d+)px at (\d+)px (\d+)px, #ffeedd 0\.00%, #112233 100\.00%/.exec(css)
  assert.ok(m, css)
  assert.equal(Number(m[3]), 1350 + 10 * S.SKY_SUN_MOVE.x)
  assert.equal(Number(m[4]), Math.round(look.sun.y + 4200))
  assert.equal(Number(m[2]), Math.round(1070 * 0.75))
  // the size scales the rings; without the sun as the centre the rings are the ones of before
  const big = /radial-gradient\(\d+px (\d+)px/.exec(S.skyRadial(S.skyLook({ ...sky, radialSize: 200 }), -4200, -200, 870, 1350))
  assert.equal(Number(big[1]), Math.round(1070 * 0.75 * 2))
  const under = S.skyRadial(S.skyLook({ ...sky, radialSun: false, sunX: 0 }), -4200, -200, 870, 1350)
  assert.ok(under.startsWith(`radial-gradient(${Math.round(1070 * (14 + (0.7 - 14) * Math.pow(0.96, 0.6)))}px 1070px at 1350px ${870 + 4200}px, #ffeedd 0.00%, #112233 100.00%`), under)
})

test('clouds: cumulus heaps of puffs, more of them with Gomos and Desfiado; old clouds stay soft', () => {
  const old = CL.normalizeClouds({ amount: 40 })
  assert.deepEqual([old.kind, old.puffs, old.detail, old.shadeTintAmount], ['soft', 50, 40, 0])
  assert.equal(CL.normalizeClouds({ kind: 'fog', size: 900 }).kind, 'soft')
  assert.equal(CL.normalizeClouds({ size: 900 }).size, CL.CLOUD_SCALE.max)
  const soft = CD.softClouds(6000, 11, 1, 0.5, 0.5)
  assert.ok(soft.length > 3 && soft.every(c => c.puffs.length === 0 && c.lobes[c.lobes.length - 1].shade))
  const few = CD.cumulusClouds(6000, 11, 1, 0.5, 0.5, 0, 0), many = CD.cumulusClouds(6000, 11, 1, 0.5, 0.5, 1, 1)
  assert.ok(few.length > 3 && few.every(c => c.puffs.length === 5))
  assert.ok(many.every(c => c.puffs.length >= 14 * 4))
  for (const c of many) {
    const reach = CD.cloudReach(c)
    assert.ok(reach.l < 0 && reach.r > 0 && c.top > 0 && c.bottom > 0)
    assert.ok(c.puffs.every(p => p.r - p.dy <= c.top), 'every puff is inside the cloud\'s box')
  }
})
