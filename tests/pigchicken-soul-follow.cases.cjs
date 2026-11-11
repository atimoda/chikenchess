const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const F = loadTs('lib/pigchicken/soul-follow.ts')

// a random that repeats: the same flight every run
function seeded(seed = 7) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 } }
const params = (over = {}) => ({ ...F.SOUL_FOLLOW_DEFAULTS, restless: 0, loopEvery: 0, ...over })
const DT = 1 / 60
// flies a soul for `secs`; her: where the owner is at each moment (t in s)
function fly(p, secs, her = () => ({ x: 0, y: 0, face: 1 }), from = { x: 600, y: -700 }, beatAt = t => Math.floor(t * 2)) {
  const rand = seeded(), b = F.createSoulBrain(from.x, from.y, p, rand), me = { x: from.x, y: from.y, face: 1 }
  const path = []
  for (let t = 0; t < secs; t += DT) { F.soulFollowStep(b, me, her(t), p, { beat: beatAt(t) }, DT, rand); path.push({ t, x: me.x, y: me.y, face: me.face, mode: b.mode }) }
  return { b, me, path }
}

test('a class for each family of instrument, and the chick has its own', () => {
  for (const [shot, id] of [['wind', 'sentinel'], ['strings', 'patrol'], ['keys', 'escort'], ['percussion', 'rhythm'], ['rebate', 'lazy'], [null, 'sentinel']])
    assert.equal(F.soulClassOf({ species: 'jelly', shot }), id, String(shot))
  assert.equal(F.soulClassOf({ species: 'chick', shot: null }), 'chick')
  const escort = F.soulFollowParams({ species: 'horde', shot: 'keys' }), lazy = F.soulFollowParams({ species: 'horde', shot: 'rebate' })
  assert.ok(escort.dist < lazy.dist && escort.leash < lazy.leash && escort.speed > lazy.speed, 'the escort keeps close, the lazy one far')
  for (const id of Object.keys(F.SOUL_CLASSES)) {
    const p = { ...F.SOUL_FOLLOW_DEFAULTS, ...F.SOUL_CLASSES[id].params }
    for (const [key, r] of Object.entries(F.SOUL_FOLLOW_RANGES)) assert.ok(p[key] >= r.min && p[key] <= r.max, `${id}.${key} inside its range`)
    assert.ok(p.side in F.SOUL_SIDES && p.pattern in F.SOUL_PATTERNS, id)
  }
})

test('let out, it flies to its spot beside and above her and rests there', () => {
  const p = params({ dist: 200, height: 0.5 })
  const { b, me } = fly(p, 8)
  assert.equal(b.mode, 'rest')
  const side = Math.abs(me.x), up = -me.y
  assert.ok(side > 200 * F.SOUL_FLIGHT.own.dist[0] - 30 && side < 200 * F.SOUL_FLIGHT.own.dist[1] + 30, `beside her (${side})`)
  const mid = F.SOUL_FLIGHT.head + 0.5 * F.SOUL_FLIGHT.sky, own = F.SOUL_FLIGHT.own.height * F.SOUL_FLIGHT.sky
  assert.ok(up > mid - own - 30 && up < mid + own + 30, `at its height (${up})`)
  assert.equal(me.face, me.x > 0 ? -1 : 1, 'quiet, it watches her')
})

test('two souls of the same class do not share a spot', () => {
  const p = params(), rand = seeded(3)
  const spots = [0, 1, 2, 3].map(() => F.soulSpot(F.createSoulBrain(0, 0, p, rand), { x: 0, y: 0, face: 1 }, p))
  for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++)
    assert.ok(Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y) > 6, `${i} and ${j}`)
})

test('it lets her move inside the leash and follows, after a moment, when she goes farther', () => {
  const p = params({ dist: 200, height: 0.5, leash: 300, react: 0.5 })
  // she steps 200 px aside at 8 s (inside the leash), then 600 px more at 12 s
  const her = t => ({ x: t < 8 ? 0 : t < 12 ? 200 : 800, y: 0, face: 1 })
  const { path } = fly(p, 20, her)
  const at = s => path[Math.round(s / DT)]
  assert.equal(at(7.9).mode, 'rest')
  assert.ok(Math.hypot(at(11.9).x - at(7.9).x, at(11.9).y - at(7.9).y) < 12, 'a short step: it stays')
  assert.equal(at(12.3).mode, 'rest', 'it takes a moment to notice')
  assert.equal(at(12.8).mode, 'follow')
  assert.equal(at(19.9).mode, 'rest', 'and rests again beside her')
  assert.ok(Math.abs(at(19.9).x - 800) < 200 * F.SOUL_FLIGHT.own.dist[1] + 30)
})

test('behind her or in front of her: the spot changes side when she turns', () => {
  for (const [side, sign] of [['behind', -1], ['front', 1]]) {
    const p = params({ dist: 200, leash: 100, side })
    const { me } = fly(p, 8, () => ({ x: 0, y: 0, face: 1 }))
    assert.equal(Math.sign(me.x), sign, `${side}, she faces right`)
    const { me: other } = fly(p, 8, () => ({ x: 0, y: 0, face: -1 }))
    assert.equal(Math.sign(other.x), -sign, `${side}, she faces left`)
  }
})

test('left behind it hurries, and lost it comes in from beside the screen', () => {
  const p = params({ dist: 150, leash: 300, speed: 240 })
  // she runs at 510 px/s, faster than it flies
  const { path } = fly(p, 20, t => ({ x: t < 6 ? 0 : (t - 6) * 510, y: 0, face: 1 }))
  const gap = s => { const q = path[Math.round(s / DT)]; return Math.abs((s < 6 ? 0 : (s - 6) * 510) - q.x) }
  const limit = 150 * F.SOUL_FLIGHT.own.dist[1] + 300 + (F.SOUL_FLIGHT.hurryMax - 1) * F.SOUL_FLIGHT.hurryOver
  assert.ok(gap(19.9) < limit, `it keeps up from behind (${gap(19.9)})`)
  assert.ok(Math.abs(gap(19.9) - gap(17)) < 20, 'at a steady distance')

  const far = fly(p, 7, t => ({ x: t < 6 ? 0 : 20000, y: 0, face: 1 }))
  // after the moment it takes to notice
  const first = far.path[Math.round(6.6 / DT)]
  assert.ok(Math.abs(first.x - 20000) < F.SOUL_FLIGHT.enter.x + 150 * F.SOUL_FLIGHT.own.dist[1] + 60, 'no long trip across the world')
})

test('the patterns: an orbit goes round her, an eight crosses its spot, a still one only bobs', () => {
  const xs = (pattern, over = {}) => {
    const p = params({ pattern, dist: 120, height: 0.4, patternSize: 100, patternTime: 2, ...over })
    const { path, b } = fly(p, 16)
    return { late: path.filter(q => q.t > 10), b }
  }
  const orbit = xs('orbit')
  assert.ok(Math.min(...orbit.late.map(q => q.x)) < -80 && Math.max(...orbit.late.map(q => q.x)) > 80, 'both sides of her')
  const eight = xs('eight')
  const spanX = Math.max(...eight.late.map(q => q.x)) - Math.min(...eight.late.map(q => q.x))
  const spanY = Math.max(...eight.late.map(q => q.y)) - Math.min(...eight.late.map(q => q.y))
  assert.ok(spanX > 180 && spanX < 210 && spanY > 60 && spanY < 90, `an eight (${spanX} x ${spanY})`)
  const still = xs('still')
  assert.ok(Math.max(...still.late.map(q => q.x)) - Math.min(...still.late.map(q => q.x)) < 2, 'still')
  assert.ok(Math.max(...still.late.map(q => q.y)) - Math.min(...still.late.map(q => q.y)) > 4, 'bobbing')
  for (const pattern of ['circle', 'sway', 'zigzag']) {
    const { late, b } = xs(pattern)
    const span = Math.max(...late.map(q => q.x)) - Math.min(...late.map(q => q.x))
    assert.ok(span > 150 && span < 210, `${pattern} (${span})`)
    assert.equal(b.mode, 'rest', `${pattern}: the pattern is not a reason to follow`)
  }
})

test('a rhythmic one hops to the other side of its spot on every beat', () => {
  const p = params({ pattern: 'hop', patternSize: 80 })
  const { path, b } = fly(p, 14, undefined, undefined, t => Math.floor(t)) // a beat a second
  // just before each beat (settled from the last hop): the side of the spot it is on
  const sides = [10, 11, 12, 13].map(s => Math.sign(path[Math.round((s + 0.9) / DT)].x - b.ax))
  assert.deepEqual(sides.map(s => s * sides[0]), [1, -1, 1, -1])
})

test('now and then a little loop, and it wanders when restless', () => {
  const p = params({ loopEvery: 3 })
  const { path, b } = fly(p, 20)
  const settled = path.filter(q => q.t > 8)
  const high = Math.min(...settled.map(q => q.y)), base = b.y
  assert.ok(base - high > F.SOUL_FLIGHT.loop.r * 1.6, `a loop over its spot (${base - high})`)
  const quiet = fly(params(), 20), restless = fly(params({ restless: 1 }), 20)
  const spread = f => { const l = f.path.filter(q => q.t > 8); return Math.max(...l.map(q => q.x)) - Math.min(...l.map(q => q.x)) }
  assert.ok(spread(quiet) < 2 && spread(restless) > 20, `restless wanders (${spread(restless)})`)
})

test('with walls and a sky: height 1 is the top she sees, and a spot past a wall takes her other side', () => {
  const air = { l: 0, r: 2000, top: -900 }
  const settle = (p, her, seed) => {
    const rand = seeded(seed), b = F.createSoulBrain(600, -700, p, rand), me = { x: 600, y: -700, face: 1 }
    for (let t = 0; t < 8; t += DT) F.soulFollowStep(b, me, her, p, { beat: 0, air }, DT, rand)
    return me
  }
  const sky = -F.SOUL_FLIGHT.head + 900 - F.SOUL_FLIGHT.skyMargin
  for (let seed = 1; seed <= 6; seed++) {
    const high = settle(params({ dist: 200, height: 1 }), { x: 1000, y: 0, face: 1 }, seed)
    // (a still one bobs 4 px)
    assert.ok(high.y >= -900 + F.SOUL_FLIGHT.skyMargin - 6 && high.y <= -F.SOUL_FLIGHT.head - (1 - F.SOUL_FLIGHT.own.height) * sky + 6, `at the top of the sky (${high.y})`)
    // she stands by the left wall: whatever side it would pick, behind her or not, its spot is to her right
    for (const side of ['any', 'behind', 'front']) {
      const me = settle(params({ dist: 200, side }), { x: 60, y: 0, face: 1 }, seed)
      assert.ok(me.x > 60 + 200 * F.SOUL_FLIGHT.own.dist[0] - 30, `${side} (${me.x})`)
    }
    const right = settle(params({ dist: 200 }), { x: 1950, y: 0, face: -1 }, seed)
    assert.ok(right.x < 1950 - 200 * F.SOUL_FLIGHT.own.dist[0] + 30, `by the right wall (${right.x})`)
  }
  // an orbit stays over her, inside the walls
  const orbit = settle(params({ pattern: 'orbit', dist: 100 }), { x: 10, y: 0, face: 1 }, 1)
  assert.ok(orbit.x > -100, 'not past the wall by more than its turn')
})

test('souls with the very same spot drift apart, and stay apart when they follow', () => {
  const p = params({ dist: 150, height: 0.5, leash: 200 }), rand = seeded(11)
  const souls = [0, 1, 2].map(() => ({ brain: F.createSoulBrain(300, -400, p, rand), x: 300, y: -400, face: 1 }))
  for (const s of souls) Object.assign(s.brain, { kd: 1, kh: 0, side: 1 })
  let her = { x: 0, y: 0, face: 1 }
  const run = secs => { for (let t = 0; t < secs; t += DT) { for (const s of souls) F.soulFollowStep(s.brain, s, her, p, { beat: 0 }, DT, rand); F.spreadSouls(souls, DT) } }
  const nearest = () => Math.min(...[[0, 1], [0, 2], [1, 2]].map(([i, j]) => Math.hypot(souls[i].x - souls[j].x, souls[i].y - souls[j].y)))
  run(10)
  assert.ok(nearest() > F.SOUL_FLIGHT.apart * 0.85, `apart (${nearest()})`)
  for (const s of souls) assert.ok(Math.hypot(s.brain.sx, s.brain.sy) <= F.SOUL_FLIGHT.drift.max * 1.2, 'not far from where the class puts it')
  her = { x: 1200, y: 0, face: 1 }
  run(10)
  assert.ok(souls.every(s => s.brain.mode === 'rest' && Math.abs(s.x - 1200) < 150 + F.SOUL_FLIGHT.drift.max + 10), 'beside her again')
  assert.ok(nearest() > F.SOUL_FLIGHT.apart * 0.85, `still apart beside her (${nearest()})`)
})
