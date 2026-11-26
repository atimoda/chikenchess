const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const K = loadTs('lib/pigchicken/drum-kit.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')

const kit = () => structuredClone(K.DEFAULT_KIT)
const padOf = (k, piece) => k.pads.find(p => p.piece === piece)
const idle = () => ({ sticks: [null, null], taps: [], binds: {} })
const DT = 1 / 60

test('Bateria: the default kit is the sketch (11 places, Ataque and China behind) with the shortcuts asked for', () => {
  const k = K.DEFAULT_KIT
  assert.deepEqual(k.pads.map(p => p.piece).sort(), [...K.PAD_PIECES].sort())
  assert.equal(k.pads.length, 11)
  assert.deepEqual(k.pads.filter(p => p.back).map(p => p.piece).sort(), ['china', 'crash'])
  // Ataque on the left and China on the right, over the toms; Splash over the Chimbal on the left; the Condução on
  // the right with its Sino in the middle; Caixa, Bumbo and Surdo below
  const at = p => padOf(k, p)
  assert.ok(at('crash').x < 0 && at('china').x > 0 && at('crash').y < at('tom1').y && at('china').y < at('tom2').y)
  assert.ok(at('tom1').x < at('tom2').x)
  assert.ok(at('splash').y < at('hat').y && at('hat').x < at('tom1').x && at('splash').r < at('hat').r)
  assert.ok(at('ride').x > at('tom2').x && at('bell').x === at('ride').x && at('bell').y === at('ride').y && at('bell').r < at('ride').r)
  assert.ok(at('snare').y > at('hat').y && at('kick').y > 0 && at('floor').y > 0 && at('kick').x < at('floor').x)
  // nothing over her shoulder: a stick leaving its rest starts on no piece
  assert.equal(K.padAt(k, 0, 0, true), null)
  k.pads.forEach(p => assert.ok(Math.hypot(p.x, p.y) + p.r <= 1.001, `${p.piece} inside the chart`))
  assert.deepEqual(k.binds.kick, ['Move:right', 'Pad:b5'])
  assert.deepEqual(k.binds.snare, ['Move:up', 'Pad:b7', 'Pad:b6'])
  assert.deepEqual(k.binds.hat, ['Move:left', 'Pad:b4'])
  assert.deepEqual(k.binds.hatOpen, ['Move:down', 'Pad:b6'])
  assert.deepEqual(k.binds.crash, ['Pad:b10'])
  assert.deepEqual(k.binds.china, ['Pad:b11'])
  assert.equal(k.rolls, true)
})

test('Bateria: a saved kit is checked piece by piece; junk falls back to the default', () => {
  assert.deepEqual(K.cleanKit(null), K.DEFAULT_KIT)
  assert.deepEqual(K.cleanKit(K.DEFAULT_KIT), K.DEFAULT_KIT)
  const k = K.cleanKit({ pads: [{ piece: 'kick', x: 0.5, y: 9, r: 3, back: true }, { piece: 'nope', x: 0, y: 0, r: 0.1 }], binds: { kick: ['Key:KeyJ', 'Key:KeyJ', 'rm -rf', 'Pad:b3', 'Move:left', 'Key:KeyK', 'Key:KeyL'], tom1: 'x' }, rolls: false })
  const kick = padOf(k, 'kick')
  assert.deepEqual([kick.x, kick.y, kick.r, kick.back], [0.5, 1, K.PAD_R_MAX, true])
  assert.equal(k.pads.length, 11)
  assert.deepEqual(k.binds.kick, ['Key:KeyJ', 'Pad:b3', 'Move:left', 'Key:KeyK'])
  assert.deepEqual(k.binds.tom1, [])
  assert.deepEqual(k.binds.snare, K.DEFAULT_KIT.binds.snare)
  assert.equal(k.rolls, false)
})

test('Bateria, framing: the chart has its own size and shift; with "fit" it slides back into the screen and shrinks when it is bigger than it', () => {
  const k = kit(), box = K.kitBounds(k), screen = { l: 8, t: 60, r: 1492, b: 952 }
  assert.deepEqual(k.view, { size: 1.3, dx: 0, dy: 0, fit: true })
  assert.ok(box.l < -0.8 && box.r > 0.9 && box.t < -0.85 && box.b > 0.65)
  // plenty of room: on her shoulder, at its own size (unit × size)
  assert.deepEqual(K.drumChartFrame(k, 750, 500, 200, screen), { x: 750, y: 500, r: 260 })
  // near the floor it lifts just enough for the lowest piece to show
  let f = K.drumChartFrame(k, 750, 900, 200, screen)
  assert.equal(f.r, 260)
  assert.ok(Math.abs(f.y + box.b * f.r - screen.b) < 1e-6 && f.x === 750)
  // near the top it comes down under the header; by a side, it slides in
  f = K.drumChartFrame(k, 750, 100, 200, screen)
  assert.ok(Math.abs(f.y + box.t * f.r - screen.t) < 1e-6)
  f = K.drumChartFrame(k, 20, 500, 200, screen)
  assert.ok(Math.abs(f.x + box.l * f.r - screen.l) < 1e-6)
  // bigger than the screen (the size of the report: 640 px of radius on a 960 px screen): it shrinks until every
  // piece fits, top and bottom on the screen
  k.view.size = 3.2
  f = K.drumChartFrame(k, 750, 370, 200, screen)
  assert.ok(f.r < 640 && Math.abs(f.r * (box.b - box.t) - (screen.b - screen.t)) < 1e-6)
  assert.ok(f.y + box.t * f.r >= screen.t - 1e-6 && f.y + box.b * f.r <= screen.b + 1e-6)
  // the shift moves its middle off her shoulder, in radii
  k.view = { size: 1, dx: 0.5, dy: -0.25, fit: true }
  assert.deepEqual(K.drumChartFrame(k, 750, 500, 200, screen), { x: 850, y: 450, r: 200 })
  // without "fit" it stays where the numbers put it, whatever the screen
  k.view = { size: 3.2, dx: 0, dy: 0, fit: false }
  assert.deepEqual(K.drumChartFrame(k, 750, 370, 200, screen), { x: 750, y: 370, r: 640 })
  // a saved framing is checked like the rest
  const c = K.cleanKit({ view: { size: 99, dx: -9, dy: 'x', fit: false } })
  assert.deepEqual(c.view, { size: K.VIEW_SIZE_MAX, dx: -K.VIEW_SHIFT_MAX, dy: 0, fit: false })
  assert.deepEqual(K.cleanKit({}).view, K.DEFAULT_VIEW)
})

test('Bateria: the Sino sits on the Condução; a click reaches the pieces behind where they show, a stick never does', () => {
  const k = kit(), ride = padOf(k, 'ride'), crash = padOf(k, 'crash'), tom1 = padOf(k, 'tom1')
  assert.equal(K.padAt(k, ride.x, ride.y, false).piece, 'bell')
  assert.equal(K.padAt(k, ride.x + ride.r * 0.8, ride.y, false).piece, 'ride')
  // the top of the Ataque sticks out over the Tom 1
  assert.equal(K.padAt(k, crash.x, crash.y - crash.r * 0.6, true).piece, 'crash')
  assert.equal(K.padAt(k, crash.x, crash.y - crash.r * 0.6, false), null)
  // where both are, the tom in front wins
  const mid = { x: (crash.x + tom1.x) / 2, y: tom1.y - tom1.r * 0.9 }
  assert.ok(Math.hypot(mid.x - crash.x, mid.y - crash.y) < crash.r && Math.hypot(mid.x - tom1.x, mid.y - tom1.y) < tom1.r)
  assert.equal(K.padAt(k, mid.x, mid.y, true).piece, 'tom1')
  assert.equal(K.pieceOfMidi(36), 'kick')
  assert.equal(K.pieceOfMidi(38), 'snare')
  assert.equal(K.pieceOfMidi(46), 'hatOpen')
  assert.equal(K.drumPiece('kick').label, 'Bumbo')
})

test('Bateria, drumsticks: leaving its rest a stick hits the first piece it finds and every one it goes into; the two are independent', () => {
  const k = kit(), st = K.newDrumState()
  const play = sticks => K.stepDrums(st, k, { sticks, taps: [], binds: {} }, DT).hits.map(h => h.piece)
  const snare = padOf(k, 'snare'), floor = padOf(k, 'floor'), kick = padOf(k, 'kick'), ride = padOf(k, 'ride')
  // one flick from rest onto the Caixa
  assert.deepEqual(play([{ x: snare.x, y: snare.y }, null]), ['snare'])
  // resting on it is no new hit
  assert.deepEqual(play([{ x: snare.x + 0.02, y: snare.y }, null]), [])
  // the other stick hits on its own meanwhile
  assert.deepEqual(play([{ x: snare.x, y: snare.y }, { x: floor.x, y: floor.y }]), ['floor'])
  // back at rest and out again: the same piece again
  assert.deepEqual(play([null, null]), [])
  assert.deepEqual(play([{ x: kick.x, y: kick.y }, null]), ['kick'])
  // sweeping from the Tom 1 to the Condução crosses the Tom 2: both sound, in order
  play([null, null])
  const tom1 = padOf(k, 'tom1')
  assert.deepEqual(play([{ x: tom1.x, y: tom1.y }, null]), ['tom1'])
  assert.deepEqual(play([{ x: ride.x - ride.r * 0.6, y: ride.y }, null]), ['tom2', 'ride'])
  // across the Condução through its Sino: the Condução, the Sino, and no second Condução coming off it
  play([null, null])
  assert.deepEqual(play([{ x: ride.x - ride.r * 0.8, y: ride.y }, null]), ['ride'])
  assert.deepEqual(play([{ x: ride.x + ride.r * 0.8, y: ride.y }, null]), ['bell'])
  // the pieces behind are out of reach: a flick straight at the Ataque's top plays nothing
  play([null, null])
  const crash = padOf(k, 'crash')
  assert.deepEqual(play([{ x: crash.x * 1.25, y: crash.y * 1.25 }, null]).filter(p => p === 'crash'), [])
  // a faster stick hits harder
  assert.ok(K.stickVel(20) > K.stickVel(2))
  assert.equal(K.stickVel(1000), 1)
})

test('Bateria, clicks: one hit per click on the piece under it, softer toward its edge; outside the chart, nothing', () => {
  const k = kit(), st = K.newDrumState(), tom = padOf(k, 'tom2')
  const r = K.stepDrums(st, k, { sticks: [], taps: [{ x: tom.x, y: tom.y }, { x: tom.x + tom.r * 0.9, y: tom.y }, { x: 1.2, y: 0.9 }], binds: {} }, DT)
  assert.deepEqual(r.hits.map(h => h.piece), ['tom2', 'tom2'])
  assert.equal(r.hits[0].vel, K.PLAIN_VEL)
  assert.ok(r.hits[1].vel < r.hits[0].vel)
  assert.deepEqual(K.stepDrums(st, k, idle(), DT).hits, [])
})

test('Bateria, dragging a held click or finger: every piece it goes into hits at once, in order; the landing is the tap\'s; staying, nothing', () => {
  const k = kit(), st = K.newDrumState()
  const at = p => padOf(k, p)
  const frame = (drags, taps = []) => K.stepDrums(st, k, { sticks: [null, null], taps, binds: {}, drags }, DT).hits
  // the press on the Caixa: the tap hits it once, the drag's landing does not hit it again
  const sn = at('snare'), hat = at('hat'), tom1 = at('tom1'), tom2 = at('tom2'), ride = at('ride'), bell = at('bell')
  assert.deepEqual(frame([{ id: 1, x: sn.x, y: sn.y, from: { x: sn.x, y: sn.y } }], [{ x: sn.x, y: sn.y }]).map(h => h.piece), ['snare'])
  // held still: nothing
  assert.deepEqual(frame([{ id: 1, x: sn.x, y: sn.y }]), [])
  // one fast sweep in a single frame up through the Chimbal to the Splash: both, in order, right now
  const splash = at('splash')
  assert.deepEqual(frame([{ id: 1, x: splash.x, y: splash.y }]).map(h => h.piece), ['hat', 'splash'])
  // across to the Tom 1, on to the Tom 2 and the Condução, then onto its Sino (a hit) and back to the Condução (no new hit)
  assert.deepEqual(frame([{ id: 1, x: tom1.x, y: tom1.y }]).map(h => h.piece), ['tom1'])
  assert.deepEqual(frame([{ id: 1, x: tom2.x, y: tom2.y }]).map(h => h.piece), ['tom2'])
  assert.deepEqual(frame([{ id: 1, x: ride.x, y: ride.y + ride.r * 0.6 }]).map(h => h.piece), ['ride'])
  assert.deepEqual(frame([{ id: 1, x: bell.x, y: bell.y }]).map(h => h.piece), ['bell'])
  assert.deepEqual(frame([{ id: 1, x: ride.x - ride.r * 0.6, y: ride.y }]).map(h => h.piece), [])
  // a held click reaches the pieces behind where they show (the Ataque above the Tom 1)
  const crash = at('crash')
  frame([{ id: 1, x: tom1.x, y: tom1.y }])
  assert.deepEqual(frame([{ id: 1, x: crash.x - crash.r * 0.5, y: crash.y - crash.r * 0.5 }]).map(h => h.piece), ['crash'])
  // let go and pressed again elsewhere: a new drag, from where it landed
  frame([])
  assert.deepEqual(frame([{ id: 2, x: hat.x, y: hat.y, from: { x: hat.x, y: hat.y } }]), [])
  // a fast drag is about as hard as a click, a slow one softer; never harder
  const slow = K.dragVel(0.5), fast = K.dragVel(50)
  assert.ok(slow < fast && fast <= K.PLAIN_VEL + 1e-9 && slow >= 0.5)
  // two fingers at once are independent
  frame([])
  frame([{ id: 3, x: sn.x, y: sn.y, from: { x: sn.x, y: sn.y } }, { id: 4, x: tom2.x, y: tom2.y, from: { x: tom2.x, y: tom2.y } }])
  assert.deepEqual(frame([{ id: 3, x: at('kick').x, y: at('kick').y }, { id: 4, x: at('floor').x, y: at('floor').y }]).map(h => h.piece).sort(), ['floor', 'kick'])
})

test('Bateria, clicks between the pieces: a knock on the hardware, drawn at random and never the same twice in a row; the sticks never knock', () => {
  const k = kit(), st = K.newDrumState()
  assert.equal(K.padAt(k, 0, 0.1, true), null)
  // a fixed draw: always the first noise, so the second click moves on to the next one
  const tap = rand => K.stepDrums(st, k, { sticks: [], taps: [{ x: 0, y: 0.1 }], binds: {} }, DT, rand).hits
  const a = tap(() => 0), b = tap(() => 0), c = tap(() => 0.999)
  assert.deepEqual([a.length, b.length, c.length], [1, 1, 1])
  assert.deepEqual([a[0].knock, b[0].knock, c[0].knock], [K.DRUM_KNOCKS[0], K.DRUM_KNOCKS[1], K.DRUM_KNOCKS[K.DRUM_KNOCKS.length - 1]])
  assert.ok(a[0].vel > 0.5 && a[0].vel <= K.PLAIN_VEL && c[0].vel > a[0].vel)
  assert.deepEqual([a[0].x, a[0].y], [0, 0.1])
  // every noise comes up with a real draw
  const seen = new Set()
  for (let i = 0; i < 300; i++) seen.add(K.stepDrums(st, k, { sticks: [], taps: [{ x: 0, y: 0.1 }], binds: {} }, DT).hits[0].knock)
  assert.deepEqual([...seen].sort(), [...K.DRUM_KNOCKS].sort())
  // a stick resting between the pieces is silent
  assert.deepEqual(K.stepDrums(K.newDrumState(), k, { sticks: [{ x: 0, y: 0.1 }, null], taps: [], binds: {} }, DT).hits, [])
})

test('Bateria, plain shortcuts: a key or button hits once on the press', () => {
  const k = kit(), st = K.newDrumState()
  const on = { kick: { digital: true, depth: 0 } }
  assert.deepEqual(K.stepDrums(st, k, { ...idle(), binds: on }, DT).hits.map(h => [h.piece, h.vel]), [['kick', K.PLAIN_VEL]])
  assert.deepEqual(K.stepDrums(st, k, { ...idle(), binds: on }, DT).hits, [])
  K.stepDrums(st, k, idle(), DT)
  assert.equal(K.stepDrums(st, k, { ...idle(), binds: on }, DT).hits.length, 1)
})

test('Bateria, analog trigger on the Caixa: a sudden pull is one hit, harder the faster; a slow move rolls, louder the deeper; still, nothing', () => {
  const run = (depths, rolls = true) => {
    const k = kit(); k.rolls = rolls
    const st = K.newDrumState(), out = []
    depths.forEach(d => out.push(...K.stepDrums(st, k, { ...idle(), binds: { snare: { digital: false, depth: d } } }, DT).hits))
    return out
  }
  // pulled to the end in three frames, then held
  const fast = run([0.3, 0.7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])
  assert.equal(fast.length, 1)
  assert.equal(fast[0].roll, undefined)
  // in one frame (a plain button): at once, as hard as it gets
  const snap = run([1, 1, 1])
  assert.equal(snap.length, 1)
  assert.equal(snap[0].vel, 1)
  // a slower pull hits softer
  const soft = run([0.1, 0.2, 0.3, 0.4, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
  assert.equal(soft.filter(h => !h.roll).length, 1)
  assert.ok(soft.find(h => !h.roll).vel < fast[0].vel)
  // squeezed slowly over a second: no hit, a roll that grows
  const slow = run(Array.from({ length: 60 }, (_, i) => (i + 1) / 60))
  assert.ok(slow.length >= 8 && slow.every(h => h.roll && h.piece === 'snare'))
  assert.ok(slow[slow.length - 1].vel > slow[0].vel)
  assert.ok(slow.every(h => h.vel <= 0.7))
  // held still halfway: the roll stops
  const held = run([...Array.from({ length: 30 }, (_, i) => (i + 1) / 60), ...Array(40).fill(0.5)])
  const tail = run([...Array.from({ length: 30 }, (_, i) => (i + 1) / 60), ...Array(80).fill(0.5)])
  assert.equal(tail.length, held.length)
  // with the roll off, a slow move is silent and the sudden pull still hits
  assert.deepEqual(run(Array.from({ length: 60 }, (_, i) => (i + 1) / 60), false), [])
  assert.equal(run([0.3, 0.7, 1, 1, 1], false).length, 1)
  // pumping the trigger from halfway hits again each time
  assert.equal(run([0.4, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 0.9, 0.7, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.8, 1, 1, 1], false).length, 2)
})

test('Bateria, the Chimbal\'s pedal: it opens as far as the trigger is pulled, every hit sounds that open, closing it stops the ring', () => {
  const k = kit(), st = K.newDrumState()
  const step = (depth, extra = {}) => K.stepDrums(st, k, { ...idle(), binds: { hatOpen: { digital: false, depth }, ...extra } }, DT)
  // opening: one open hit, as open as the pedal
  let r = step(0.5)
  assert.deepEqual(r.hits.map(h => [h.piece, h.open]), [['hat', 0.5]])
  assert.equal(r.open, 0.5)
  assert.equal(r.choke, false)
  // deeper: more open, no new hit by itself
  r = step(1)
  assert.deepEqual(r.hits, [])
  assert.equal(r.open, 1)
  // the Chimbal's own shortcut while the pedal is open: an open hit
  r = step(1, { hat: { digital: true, depth: 0 } })
  assert.deepEqual(r.hits.map(h => [h.piece, h.open]), [['hat', 1]])
  // letting go: closed at once
  r = step(0)
  assert.equal(r.choke, true)
  assert.equal(r.open, 0)
  assert.deepEqual(r.hits, [])
  // closed: the Chimbal's shortcut is a closed hit
  K.stepDrums(st, k, idle(), DT)
  r = step(0, { hat: { digital: true, depth: 0 } })
  assert.deepEqual(r.hits.map(h => [h.piece, h.open]), [['hat', undefined]])
  // a plain key on the pedal: wide open while held
  K.stepDrums(st, k, idle(), DT)
  r = K.stepDrums(st, k, { ...idle(), binds: { hatOpen: { digital: true, depth: 0 } } }, DT)
  assert.deepEqual(r.hits.map(h => [h.piece, h.open]), [['hat', 1]])
  assert.equal(K.stepDrums(st, k, idle(), DT).choke, true)
  // the ring follows the pedal: silent closed, whole wide open, in between halfway
  assert.equal(K.hatRing(0), 0)
  assert.equal(K.hatRing(1), 1)
  assert.ok(K.hatRing(0.5) > 0.5 && K.hatRing(0.5) < 1)
})

test('Bateria, LT on two pieces: one sudden pull hits the Caixa and opens the Chimbal; a slow one rolls under an opening Chimbal', () => {
  const k = kit(), st = K.newDrumState()
  const lt = d => ({ snare: { digital: false, depth: d }, hatOpen: { digital: false, depth: d } })
  const all = []
  for (const d of [0.4, 0.9, 1, 1]) all.push(...K.stepDrums(st, k, { ...idle(), binds: lt(d) }, DT).hits)
  assert.deepEqual(all.map(h => h.piece).sort(), ['hat', 'snare'])
  assert.equal(K.stepDrums(st, k, idle(), DT).choke, true)
  for (let i = 0; i < 30; i++) K.stepDrums(st, k, idle(), DT)
  const slow = []
  for (let i = 1; i <= 60; i++) slow.push(...K.stepDrums(st, k, { ...idle(), binds: lt(i / 60) }, DT).hits)
  assert.equal(slow.filter(h => h.piece === 'hat').length, 1)
  assert.ok(slow.filter(h => h.piece === 'snare' && h.roll).length >= 8)
  assert.equal(slow.filter(h => h.piece === 'snare' && !h.roll).length, 0)
})

test('Bateria, shortcuts: a movement direction is the player\'s own keys and buttons (never the sticks); LT says how deep it is', () => {
  const I = loadTs('lib/pigchicken/drum-input.ts')
  const { defaultChickenControls } = loadTs('lib/chicken/controls.ts')
  const c = defaultChickenControls(), k = kit()
  const right = I.bindTokens('Move:right', c, null)
  assert.ok(right.includes('Key:KeyD') && right.includes('Key:ArrowRight') && right.includes('Pad:b15'))
  assert.ok(!right.some(t => t.startsWith('Pad:a')))
  assert.deepEqual(I.bindTokens('Pad:b5', c, null), ['Pad:b5'])
  const pad = []; pad[6] = 0.4; pad[5] = 1
  let lv = I.drumBindLevels(k, c, null, new Set(['Key:KeyW']), pad)
  assert.deepEqual(lv.kick, { digital: true, depth: 0 })
  assert.deepEqual(lv.snare, { digital: true, depth: 0.4 })
  assert.deepEqual(lv.hatOpen, { digital: false, depth: 0.4 })
  assert.deepEqual(lv.hat, { digital: false, depth: 0 })
  // a player with only a gamepad never plays with the keyboard
  lv = I.drumBindLevels(k, c, ['pad0'], new Set(['Key:KeyW', 'Key:KeyD']), [])
  assert.deepEqual(lv.snare, { digital: false, depth: 0 })
  assert.deepEqual(lv.kick, { digital: false, depth: 0 })
  // S (down) opens the Chimbal; the keys the kit uses are known to the page
  lv = I.drumBindLevels(k, c, null, new Set(['Key:KeyS']), [])
  assert.equal(lv.hatOpen.digital, true)
  const keys = I.drumKeyTokens(k, c, null)
  assert.ok(keys.has('Key:KeyD') && keys.has('Key:ArrowLeft') && !keys.has('Key:Space'))
  assert.equal(I.drumBindName('Move:left'), '←')
})

test('Bateria fixa: Pegar sits at the kit; clicks, sticks and shortcuts hit without Atirar; each hit flies as a batida; the open Chimbal follows the pedal', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const F = loadTs('lib/pigchicken/fixed-instruments.ts')
  const c = createCombat(); c.setItems(structuredClone(DEFAULT_ITEMS))
  const played = [], hat = { vol: [], stopped: 0 }, knocked = []
  c.setMusicOut({
    note() {}, hold: () => null, drum() {},
    knock: (kind, vel) => { knocked.push(kind) },
    kit: (piece, at, vel, open, light) => { played.push({ piece, open, light }); return { setPitch() {}, setVolume(v) { if (piece === 'hatOpen') hat.vol.push(v) }, stop() { if (piece === 'hatOpen') hat.stopped++ } } },
  })
  c.give('flute')
  const seat = c.addSeat('d1', 'drumkit', 500, 0, 1), spot = F.seatSpot(seat)
  assert.deepEqual(spot, { x: 500 - F.FIXED_INSTRUMENTS.drumkit.stool, y: 0 })
  const ctl = o => ({ fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...o })
  const step = (o = {}) => c.step(DT, { x: spot.x, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }, { x: spot.x, y: -60 }, { x: spot.x, y: -60 }, 0, ctl(o), [], 0, () => {})
  step()
  assert.equal(c.seatNear, seat)
  step({ grab: true })
  assert.equal(c.seated, seat)
  assert.equal(c.held.item, 'drumkit')
  assert.equal(c.scale.id, 'drums')
  assert.equal(DEFAULT_ITEMS.drumkit.voice, 'kit')
  assert.equal(F.isFixedItem('drumkit'), true)
  const k = K.DEFAULT_KIT, kick = padOf(k, 'kick'), snare = padOf(k, 'snare')
  // a click on the Bumbo: one hit, one batida in flight with the piece's General MIDI number, off toward the piece
  const before = c.bullets.length
  c.setDrumInput({ sticks: [null, null], taps: [{ x: kick.x, y: kick.y }], binds: {} })
  step()
  assert.deepEqual(played, [{ piece: 'kick', open: undefined, light: undefined }])
  assert.equal(c.bullets.length, before + 1)
  const b = c.bullets[c.bullets.length - 1]
  assert.deepEqual([b.note.voice, b.note.midi], ['kit', 36])
  assert.ok(Math.sign(b.vx) === Math.sign(kick.x) && Math.sign(b.vy) === Math.sign(kick.y))
  assert.ok(c.drumPulse('kick').age < 0.1)
  assert.ok(c.seatPulse(seat, 'kick'))
  assert.equal(c.seatPulse(seat, 'snare'), null)
  // the click is not played again on the next frame; Atirar plays nothing by itself
  step({ fire: true, firePressed: true })
  assert.equal(played.length, 1)
  // a click between the pieces: a knock, no piece lit and no batida
  { const nb = c.bullets.length
    c.setDrumInput({ sticks: [null, null], taps: [{ x: 0, y: 0.1 }], binds: {} })
    step()
    assert.equal(knocked.length, 1)
    assert.ok(K.DRUM_KNOCKS.includes(knocked[0]))
    assert.equal(played.length, 1)
    assert.ok(c.bullets.length <= nb)
    assert.deepEqual(c.drumKnocks.map(k => [k.x, k.y]), [[0, 0.1]]) }
  // a click held on the Bumbo and dragged onto the Caixa: the Caixa plays right away, once, even with the input
  // kept for the next frames
  { const n = played.length
    c.setDrumInput({ sticks: [null, null], taps: [{ x: kick.x, y: kick.y }], binds: {}, drags: [{ id: -1, x: kick.x, y: kick.y, from: { x: kick.x, y: kick.y } }] })
    step()
    c.setDrumInput({ sticks: [null, null], taps: [], binds: {}, drags: [{ id: -1, x: snare.x, y: snare.y }] })
    step(); step()
    assert.deepEqual(played.slice(n).map(p => p.piece), ['kick', 'snare'])
    played.splice(n) }
  // a stick onto the Caixa
  c.setDrumInput({ sticks: [{ x: snare.x, y: snare.y }, null], taps: [], binds: {} })
  step()
  assert.equal(played[1].piece, 'snare')
  assert.deepEqual(c.drumSticks, [{ x: snare.x, y: snare.y }, null])
  // LT halfway: the Chimbal opens (a sound that can be damped), then wide open, then shut: it stops
  played.length = 0
  c.setDrumInput({ sticks: [null, null], taps: [], binds: { hatOpen: { digital: false, depth: 0.5 } } })
  step()
  assert.deepEqual(played, [{ piece: 'hatOpen', open: 0.5, light: undefined }])
  assert.equal(c.hatOpen, 0.5)
  c.setDrumInput({ sticks: [null, null], taps: [], binds: { hatOpen: { digital: false, depth: 1 } } })
  step()
  assert.equal(hat.vol[hat.vol.length - 1], 1)
  assert.ok(hat.vol[0] < 1)
  c.setDrumInput({ sticks: [null, null], taps: [], binds: {} })
  step()
  assert.equal(hat.stopped, 1)
  // a roll's strokes sound light and send no batida
  played.length = 0
  const n = c.bullets.length
  for (let i = 1; i <= 30; i++) { c.setDrumInput({ sticks: [null, null], taps: [], binds: { snare: { digital: false, depth: i / 60 } } }); step() }
  assert.ok(played.length >= 3 && played.every(p => p.piece === 'snare' && p.light === true))
  assert.ok(c.bullets.length <= n)
  // Pegar again gets her up, with her own item back
  c.setDrumInput(null)
  step({ grab: true })
  assert.equal(c.seated, null)
  assert.equal(c.held.item, 'flute')
  const items = loadTs('lib/pigchicken/items.ts')
  assert.ok(!items.RACK_ITEM_IDS.includes('drumkit') && !items.INSTRUMENT_IDS.includes('drumkit') && items.FIXED_IDS.includes('drumkit'))
})

test('Bateria no Pátio: a Música element of fixed size that can be turned around; the layout seats a player at it', () => {
  const L = loadTs('lib/pigchicken/layout.ts')
  const F = loadTs('lib/pigchicken/fixed-instruments.ts')
  const el = L.createElement('drumkit', 400, 300)
  assert.deepEqual([el.w, el.h], [F.DRUMKIT_BOX.w, F.DRUMKIT_BOX.h])
  assert.equal(L.ELEMENT_DEFS.drumkit.group, 'Música')
  assert.equal(L.ELEMENT_DEFS.drumkit.resizable, false)
  assert.equal(el.params.flip, false)
  const put = L.normalizeElement({ kind: 'drumkit', id: 'kit-1', x: 300, y: 500, w: 999, h: 999, params: { flip: true } })
  assert.deepEqual([put.w, put.h, put.params.flip], [F.DRUMKIT_BOX.w, F.DRUMKIT_BOX.h, true])
  assert.ok(F.isFixedKind('drumkit') && F.isFixedKind('pedalharp') && !F.isFixedKind('chest'))
  // the scale Bateria: no pitch follows the aim, its note is the piece's number
  const { INSTRUMENT_SCALES } = loadTs('lib/pigchicken/instrument-scales.ts')
  const { createConductor } = loadTs('lib/pigchicken/music.ts')
  const s = INSTRUMENT_SCALES.drums, kick = padOf(K.DEFAULT_KIT, 'kick')
  assert.equal(s.label, 'Bateria')
  assert.equal(s.noteFor(createConductor(), { angle: Math.atan2(kick.y, kick.x), reach: Math.hypot(kick.x, kick.y), set: 'scale', octave: 0, span: 2 }), 36)
})

test('Bateria, recorded kit: every piece has its recordings (Ogg Opus and the AAC twin), soft to hard, two takes in turn; the pedal picks how open the Chimbal sounds', () => {
  const fs = require('node:fs')
  const path = require('node:path')
  const S = loadTs('lib/pigchicken/drum-samples.ts')
  const files = S.drumFiles()
  assert.equal(new Set(files).size, files.length)
  let bytes = 0
  for (const f of files) {
    const ogg = fs.readFileSync(path.resolve(__dirname, '../public/samples', f + '.ogg')), m4a = fs.readFileSync(path.resolve(__dirname, '../public/samples', f + '.m4a'))
    assert.equal(ogg.toString('ascii', 28, 36), 'OpusHead', f)
    assert.equal(m4a.toString('ascii', 4, 8), 'ftyp', f)
    bytes += Math.max(ogg.length, m4a.length)
  }
  assert.ok(bytes < 1_100_000, `the recorded kit stays small (${bytes} bytes)`)
  // the manifest names the CC0 source of every file
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../public/samples', S.DRUM_BANK, 'manifest.json'), 'utf8'))
  assert.equal(manifest.license, 'CC0-1.0')
  assert.deepEqual(manifest.recordings.map(r => `${S.DRUM_BANK}/${r.file.replace(/\.wav$/, '')}`).sort(), [...files].sort())
  // every piece of the kit plays a recording of its own
  K.DRUM_IDS.forEach(id => assert.ok(files.includes(S.drumSampleOf(id, 0.8).file), id))
  // soft, medium, hard: the layer nearest the strength; a touch louder above it
  const layer = (piece, vel, light) => S.drumSampleOf(piece, vel, 0, light).file.split('-').slice(-2)[0]
  assert.deepEqual([layer('snare', 0.2), layer('snare', 0.6), layer('snare', 0.95)], ['0', '1', '2'])
  assert.ok(S.drumSampleOf('snare', 1).gain > S.drumSampleOf('snare', 0.9).gain)
  // the roll's light strokes are the soft ones; a crash has no soft layer, so its softest is the medium
  assert.equal(layer('snare', 0.7, true), '0')
  assert.equal(layer('crash', 0.1), '1')
  // a soft hit on a skin is darker; on bronze it stays bright
  assert.ok(S.drumSampleOf('tom1', 0.2).dull > 0 && S.drumSampleOf('tom1', 0.9).dull === 0 && S.drumSampleOf('ride', 0.2).dull === 0)
  // two takes, in turn
  assert.notEqual(S.drumSampleOf('kick', 0.9, 0, false, 0).file, S.drumSampleOf('kick', 0.9, 0, false, 1).file)
  assert.equal(S.drumSampleOf('kick', 0.9, 0, false, 0).file, S.drumSampleOf('kick', 0.9, 0, false, 2).file)
  // the Chimbal: closed; the pedal a little, halfway or wide open; the Chimbal aberto wide
  assert.deepEqual([S.drumStem('hat', 0), S.drumStem('hat', 0.3), S.drumStem('hat', 0.6), S.drumStem('hat', 1), S.drumStem('hatOpen')], ['hat', 'hat-half', 'hat-34', 'hat-open', 'hat-open'])
})
