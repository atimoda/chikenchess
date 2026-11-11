const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const sz = loadTs('lib/pigchicken/sound-zones.ts')
const layout = loadTs('lib/pigchicken/layout.ts')
const tf = loadTs('lib/pigchicken/transforms.ts')
const { DEFAULT_ITEMS } = loadTs('lib/pigchicken/items.ts')
const { createCombat } = loadTs('lib/pigchicken/combat.ts')
const swing = loadTs('lib/pigchicken/swing.ts')
const { ZONES } = loadTs('lib/pigchicken/music.ts')

const T = (kind, mode, n) => ({ ...tf.newTransform(kind), ...(mode !== undefined ? { mode } : {}), ...(n !== undefined ? { n } : {}) })

// ---------- data ----------

test('a Zona sonora is cleaned like everything stored: a scene by default, numbers in range, chain checked', () => {
  const d = sz.normalizeSoundZone(null)
  assert.equal(d.name, 'Noite'); assert.equal(d.music, true); assert.equal(d.priority, 1); assert.deepEqual(d.chain, [])
  const z = sz.normalizeSoundZone({ name: '  Gruta ', root: 200, scale: 'nope', chordScale: 'majorPenta', bpm: 999, feel: 'x', progression: [9, -1, 'a'], color: 'red', priority: 40, music: false, chain: [{ kind: 'transpose', chance: 1, n: 2, mode: 'degree' }, { kind: 'bogus' }] })
  assert.equal(z.name, 'Gruta'); assert.equal(z.root, 84); assert.equal(z.scale, d.scale)
  assert.equal(z.chordScale, d.chordScale, 'chords need a 7-note scale')
  assert.equal(z.bpm, sz.ZONE_BPM.max); assert.deepEqual(z.progression, [6, 0]); assert.equal(z.color, d.color)
  assert.equal(z.priority, sz.ZONE_PRIORITY.max); assert.equal(z.music, false); assert.equal(z.chain.length, 1)
})

test("a zone's label reads like the plan: name, key and scale, tempo, its chain", () => {
  const noite = sz.defaultSoundZone(ZONES[1])
  assert.equal(sz.soundZoneLabel({ ...noite, chain: [T('transpose', 'degree', 2)] }), 'Noite · Lá pentatônica menor · 88 bpm · +3ª')
  assert.equal(sz.soundZoneLabel(noite), 'Noite · Lá pentatônica menor · 88 bpm')
  // the conductor's id changes with what the zone sounds like, so an edited zone takes over on the next bar
  assert.notEqual(sz.soundZoneOf('z1', noite).id, sz.soundZoneOf('z1', { ...noite, bpm: 120 }).id)
  assert.equal(sz.soundZoneOf('z1', noite).id, sz.soundZoneOf('z1', { ...noite, chain: [T('octave')] }).id)
})

test('the fixed lanes force the note of the lane a point falls in: a fan from the bottom, or columns', () => {
  const box = { x: 0, y: 0, w: 400, h: 200 }
  const fan = sz.defaultLanes() // C major pentatonic, 2 octaves, the upper half circle, low on the left
  assert.deepEqual(sz.lanesNotes(fan), [60, 62, 64, 67, 69, 72, 74, 76, 79, 81])
  assert.equal(sz.lanesNoteAt(box, fan, 10, 195), 60)
  assert.equal(sz.lanesNoteAt(box, fan, 390, 195), 81)
  assert.equal(sz.lanesNoteAt(box, fan, 190, 10), 69)
  assert.equal(sz.lanesNoteAt(box, fan, 500, 100), undefined, 'outside the box')
  const cols = { ...fan, layout: 'columns', content: { kind: 'notes', notes: [60, null, 64] } }
  assert.equal(sz.lanesNoteAt(box, cols, 10, 100), 60)
  assert.equal(sz.lanesNoteAt(box, cols, 200, 100), null, 'a silent lane')
  assert.equal(sz.lanesNoteAt(box, { ...cols, dir: -1 }, 10, 100), 64, 'reversed: low on the right')
  const clean = sz.normalizeLanes({ layout: 'columns', open: 999, start: -90, content: { kind: 'notes', notes: [10, 'x', 61] }, glow: 4 })
  assert.equal(clean.open, 360); assert.equal(clean.start, 270); assert.deepEqual(clean.content.notes, [24, null, 61]); assert.equal(clean.glow, 1)
})

test('where zones overlap the higher priority wins (the later one among equals); lanes and zones together', () => {
  const zone = (id, x, priority, music = true) => ({ id, x, y: 0, w: 100, h: 100, zone: { ...sz.defaultSoundZone(), priority, music } })
  const zones = [zone('a', 0, 2), zone('b', 50, 1), zone('c', 50, 2, false)]
  assert.equal(sz.zoneAt(zones, 75, 50).id, 'c')
  assert.equal(sz.zoneAt(zones, 75, 50, true).id, 'a', 'only the ones that change the music')
  assert.equal(sz.zoneAt(zones, 140, 50).id, 'c')
  assert.equal(sz.zoneAt(zones, 300, 50), null)
  const lanes = [{ id: "l", x: 0, y: -100, w: 400, h: 200, lanes: sz.defaultLanes() }]
  const env = sz.placeEnvAt(zones, lanes, 1, 99)
  assert.equal(env.lane, 60); assert.equal(env.zone.zone.name, 'Noite')
  assert.equal(sz.placeEnvAt([], [], 10, 10), null)
})

test('the layout: a zone is invisible with no collisions, the lanes too; any surface can rebate notes', () => {
  const z = layout.createElement('zone', 500, 500)
  assert.equal(z.hidden, true); assert.equal(z.solid, false); assert.equal(z.shots, false); assert.equal(z.notes, false)
  assert.ok(z.params.zone)
  const zr = layout.normalizeElement({ ...z, hidden: false, solid: true, rebate: { mode: 'chain', chain: [] } })
  assert.equal(zr.hidden, true); assert.equal(zr.solid, false); assert.equal(zr.rebate, undefined)
  const lanes = layout.createElement('lanes', 300, 300)
  assert.equal(lanes.hidden, false); assert.equal(lanes.params.lanes.layout, 'fan')
  const p = layout.normalizeElement({ ...layout.createElement('platform', 0, 0), solid: false, shots: false, rebate: { mode: 'weird', chain: [{ kind: 'octave', chance: 1, n: 1, mode: 'fixed' }] } })
  assert.equal(p.rebate.mode, 'delegate'); assert.equal(p.rebate.chain.length, 1)
  const boxes = layout.layoutBoxes([p, z, lanes])
  assert.equal(boxes.length, 1, 'only the rebating surface is a box')
  assert.ok(boxes[0].rebate && !boxes[0].solid)
  const music = layout.layoutMusic([p, z, lanes])
  assert.equal(music.zones.length, 1); assert.equal(music.lanes.length, 1)
  // a layout saved before stays the same (no rebate appears)
  assert.equal(layout.normalizeElement(layout.createElement('platform', 0, 0)).rebate, undefined)
})

test("the ambience: the base note, the zone's chain, then its scale", () => {
  const am = { root: 57, steps: [0, 3, 5, 7, 10] }
  const c = { ...am, chord: [57, 60, 64], spb: 0.5, combo: 0, angle: 0, byAngle: () => 60, rand: () => 0.99 }
  const seq = { midi: 64, at: 0, dur: 0.4, vel: 0.8, voice: 'bells' }
  const env = { base: null, fit: am, chain: [T('transpose', 'degree', 2)] }
  assert.deepEqual(tf.rebateSound(seq, 'ambiente', [], env, c).map(o => o.midi), [69], 'E is the 4th degree of A minor pentatonic: two up is A')
  assert.deepEqual(tf.rebateSound(seq, 'taco', [], env, c).map(o => o.midi), [64], 'only the taco: the zone does nothing')
  assert.deepEqual(tf.rebateSound(seq, 'ambiente-taco', [T('octave', 'fixed', 1)], env, c).map(o => o.midi), [81])
})

// ---------- in the combat ----------
const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
function step(c, input = {}, angle = 0, boxes = [], dt = 0.016) {
  c.step(dt, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle,
    { fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...input },
    boxes, 1000, () => {}, { peckOrigin: { x: 0, y: 0 } })
}
const wait = (c, s, boxes = [], angle = 0) => { for (let t = 0; t < s; t += 0.016) step(c, {}, angle, boxes) }
function holding(item) {
  const c = createCombat(), played = [], drums = []
  c.setMusicOut({ note: (voice, midi, at, dur, vel) => played.push({ voice, midi, at, dur, vel }), hold: () => null, drum: (kind, at, vel) => drums.push({ kind, at, vel }) })
  if (item) { c.give(item); step(c, { slot: 1 }) }
  return { c, played, drums }
}
function rebate(c, item, { midi = 64, boxes = [], after = 0.15 } = {}) {
  const d = item ? DEFAULT_ITEMS[item] : DEFAULT_ITEMS.wing
  const hit = c.music.time + 0.016 + d.meleeTime * swing.SWING_PHASES.prep
  const n = c.fireNoteShot({ x: 60, y: 0, vx: 0, vy: 0, midi, color: '#fff', size: 8, glow: 0.5, arriveAt: hit, source: 'test' })
  step(c, { melee: true }, 0, boxes)
  wait(c, after, boxes)
  return { n, ev: c.noteEvents.find(e => e.kind === 'rebate') }
}

test('a note rebated inside fixed lanes plays the lane, the item ornaments it; a silent lane plays nothing', () => {
  const w = holding(null)
  w.c.setPlaceEnv(() => ({ zone: null, lane: 72 }))
  assert.equal(rebate(w.c, null).ev.midi, 72)
  const f = holding('flute')
  f.c.setPlaceEnv(() => ({ zone: null, lane: 72 }))
  assert.equal(rebate(f.c, 'flute').ev.midi, 84, 'the flute an octave up')
  const s = holding(null)
  s.c.setPlaceEnv(() => ({ zone: null, lane: null }))
  const { ev } = rebate(s.c, null)
  assert.deepEqual(ev.notes, []); assert.equal(s.played.length, 0)
})

test("a note rebated inside a zone fits its scale through its chain; the stage's ambience wins over the map's", () => {
  const w = holding(null)
  const noite = sz.soundZoneOf('z', sz.defaultSoundZone(ZONES[1]))
  w.c.setPlaceEnv(() => ({ zone: { zone: noite, chain: [T('transpose', 'degree', 2)] }, lane: undefined }))
  assert.equal(rebate(w.c, null, { midi: 64 }).ev.midi, 69)
  const st = holding(null)
  st.c.setPlaceEnv(() => ({ zone: null, lane: 72 }))
  st.c.setNoteEnv(() => ({ base: 62, rule: 'ambiente-taco' }))
  assert.equal(rebate(st.c, null).ev.midi, 62)
})

const wall = (rebate, l = 150) => [{ l, r: l + 200, t: -100, b: 100, solid: false, shots: false, rebate }]
test('a "Rebate notas" surface bounces a rebated note back and plays it: its own chain, the taco\'s or as it is', () => {
  const own = holding(null)
  const boxes = wall({ mode: 'chain', chain: [T('octave', 'fixed', 1)] })
  const { n } = rebate(own.c, null, { midi: 64, boxes, after: 0.3 })
  const bounce = own.c.noteEvents.find(e => e.kind === 'bounce')
  assert.ok(bounce, 'it bounced'); assert.ok(n.vx < 0, 'and flies back')
  assert.equal(bounce.midi, 76); assert.equal(n.midi, 76)
  assert.ok(own.played.some(p => p.midi === 76))

  const del = holding('flute')
  rebate(del.c, 'flute', { midi: 62, boxes: wall({ mode: 'delegate', chain: [] }), after: 0.3 })
  assert.equal(del.c.noteEvents.find(e => e.kind === 'bounce').midi, 86, "the flute's octave again")

  const none = holding('flute')
  rebate(none.c, 'flute', { midi: 62, boxes: wall({ mode: 'none', chain: [] }), after: 0.3 })
  const b = none.c.noteEvents.find(e => e.kind === 'bounce')
  assert.equal(b.midi, 74, 'as it came'); assert.equal(b.notes[0].voice, 'flute')
})

test('a note bounces a few times at most, and incoming notes are not bounced', () => {
  const c = holding(null)
  // two walls facing each other: it goes back and forth until it runs out of bounces
  const boxes = [...wall({ mode: 'none', chain: [] }, 150), ...wall({ mode: 'none', chain: [] }, -400)]
  rebate(c.c, null, { boxes, after: 6 })
  assert.equal(c.c.noteEvents.filter(e => e.kind === 'bounce').length, sz.SURFACE_BOUNCES)
  const inc = holding(null)
  inc.c.fireNoteShot({ x: 400, y: 0, vx: -600, vy: 0, midi: 60, color: '#fff', size: 8, glow: 0.5, arriveAt: inc.c.music.time + 5, source: 'test' })
  wait(inc.c, 0.3, wall({ mode: 'none', chain: [] }))
  assert.equal(inc.c.noteEvents.filter(e => e.kind === 'bounce').length, 0)
})

test("the instruments' notes bounce off the surfaces too, playing through the item's chain", () => {
  const f = holding('flute')
  const boxes = wall({ mode: 'delegate', chain: [] })
  step(f.c, { fire: true, firePressed: true }, 0, boxes)
  const shot = f.c.bullets.find(b => b.note)
  assert.ok(shot)
  const first = shot.note.midi
  for (let i = 0; i < 30 && !(shot.bounces > 0); i++) step(f.c, {}, 0, boxes)
  assert.equal(shot.bounces, 1); assert.ok(shot.vx < 0)
  assert.equal(shot.note.midi, first + 12, "the flute's chain: an octave up")
})

// ---------- the tags, the change patterns, the walls' life and the scenes' zones ----------

const zc = loadTs('lib/pigchicken/zone-changes.ts')
const amb = loadTs('lib/pigchicken/zone-ambience.ts')
const life = loadTs('lib/pigchicken/zone-life.ts')
const settings = loadTs('lib/pigchicken/patio-settings.ts')

test("each tag steps its parameter; the progression counts down and wraps to the last", () => {
  const z = sz.defaultSoundZone(ZONES[0]) // Dó, Pentatônica maior, I V vi IV
  assert.equal(zc.ZONE_STEP.root({ ...z, root: 59 }).root % 12, 0, 'Si → Dó')
  assert.equal(zc.ZONE_STEP.scale(z).scale, 'minorPenta')
  const i = zc.progressionIndex(z.progression)
  assert.ok(i > 0)
  assert.deepEqual(zc.ZONE_STEP.progression(z).progression, zc.PROGRESSIONS[i - 1].degrees)
  assert.deepEqual(zc.ZONE_STEP.progression({ ...z, progression: zc.PROGRESSIONS[0].degrees }).progression, zc.PROGRESSIONS.at(-1).degrees)
  assert.deepEqual(zc.ZONE_STEP.progression({ ...z, progression: [2, 2, 1] }).progression, zc.PROGRESSIONS.at(-1).degrees, 'a custom one goes to the last')
  assert.equal(zc.ZONE_STEP.chain(z).chain.length, 1)
  assert.equal(zc.ZONE_STEP.birds(z).birds.length, 1)
  assert.equal(zc.ZONE_STEP.change(z).change, zc.ZONE_CHANGES[1].id)
})

test('the change patterns: random shuffles, the harmonic ones move the key, every result is a clean zone', () => {
  const z = sz.normalizeSoundZone({ ...sz.defaultSoundZone(ZONES[0]), life: 5 })
  assert.equal(z.life, 5); assert.equal(z.change, 'random')
  let seed = 1
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  const r = sz.applyZoneChange(z, 'random', rnd)
  assert.notDeepEqual({ ...r, life: 0 }, { ...z, life: 0 }); assert.equal(r.life, 5, 'the walls stay')
  assert.equal(sz.applyZoneChange(z, 'relative').root % 12, 9, 'Dó maior → Lá menor')
  assert.equal(sz.applyZoneChange(z, 'relative').scale, 'minorPenta')
  assert.equal(sz.applyZoneChange(z, 'parallel').root, z.root)
  assert.equal(sz.applyZoneChange(z, 'doubleTime').bpm, 200)
  assert.deepEqual(sz.applyZoneChange(z, 'retrograde').progression, z.progression.slice().reverse())
  const m = sz.applyZoneChange(z, 'mirror')
  assert.equal(m.chain[0].kind, 'mirror'); assert.equal(sz.applyZoneChange(m, 'mirror').chain.length, 0, 'toggles')
  for (const c of zc.ZONE_CHANGES) { const out = sz.applyZoneChange(z, c.id, rnd); assert.deepEqual(sz.normalizeSoundZone(out), out, c.id) }
})

test("a zone with life: notes crossing its walls bounce and count; at 0 it changes and fills again", () => {
  const zone = sz.normalizeSoundZone({ ...sz.defaultSoundZone(ZONES[0]), life: 2, change: 'fifths' })
  const boxes = life.liveZones([{ id: 'w', x: 0, y: 0, w: 100, h: 100, zone }])
  assert.equal(life.zoneWallHit(boxes, 50, 50, 60, 50), null, 'inside, no wall')
  assert.equal(life.zoneWallHit(boxes, 95, 50, 105, 50).flipX, true, 'leaving by the right side')
  assert.equal(life.zoneWallHit(boxes, 50, -5, 50, 5).flipX, false, 'coming in from the top')
  assert.equal(life.zoneWallHit(life.liveZones([{ id: 'w', x: 0, y: 0, w: 100, h: 100, zone: { ...zone, life: 0 } }]), 95, 50, 105, 50), null, 'no life, no walls')
  life.liveZones([{ id: 'w', x: 0, y: 0, w: 100, h: 100, zone }])
  assert.equal(life.hitZone('w'), null)
  const died = life.hitZone('w')
  assert.equal(died.root, zone.root + 7 > 72 ? zone.root - 5 : zone.root + 7)
  assert.equal(life.zoneLiveStore.get('w').hp, 2)
  assert.equal(life.liveZones([{ id: 'w', x: 0, y: 0, w: 100, h: 100, zone }])[0].zone.root, died.root, 'it plays changed')
  assert.equal(life.liveZones([{ id: 'w', x: 0, y: 0, w: 100, h: 100, zone: { ...zone } }])[0].zone.root, zone.root, 'an edited zone starts over')
})

test("the scenes' own zones are Zonas sonoras stuck to the ground: silent until the Pátio changes one, under the map's", () => {
  const base = sz.sceneZoneParams(undefined, 6)
  assert.equal(base.name, ZONES[1].name); assert.equal(base.root, ZONES[1].root, 'the key of its scene')
  assert.deepEqual(base.ambience, { beat: 'none', bass: 'none' }, 'in silence')
  const own = { ...sz.defaultSoundZone(ZONES[0]), bpm: 140, life: 9, music: false, birds: ['sparrow'] }
  const s = settings.normalizePatioSettings({ sceneZones: { 0: own, 99: own, x: own } })
  assert.deepEqual(Object.keys(s.sceneZones), ['0'])
  assert.equal(s.sceneZones[0].life, 0, 'a scene has no walls')
  assert.equal(s.sceneZones[0].music, false, 'the rest of a Zona sonora is kept')
  assert.equal(sz.sceneZoneParams(s.sceneZones, 0).bpm, 140)
  assert.equal(settings.normalizePatioSettings({ sceneZones: {} }), undefined)
  // as boxes of the world: every scene but the Templo, the whole column, under any zone of the map
  const ground = sz.groundZones(s.sceneZones, undefined, 2)
  assert.deepEqual(ground.map(g => g.id), ['cena0', 'cena1', 'cena3'], 'no zone for the Templo (scene 2)')
  assert.deepEqual([ground[1].x, ground[1].w], [1920, 1920])
  assert.equal(sz.zoneAt(ground, 2000, -5000).id, 'cena1', 'far above its floor')
  const map = { id: 'm', x: 1900, y: 0, w: 300, h: 300, zone: sz.defaultSoundZone() }
  assert.equal(sz.zoneAt([map, ...ground], 2000, 100).id, 'm', 'a zone of the map wins, whatever the order')
  assert.equal(sz.zoneAt([...ground, map], 100, 100, true), null, 'a scene that does not change the music')
})

test("the limit between two scenes' zones moves: kept apart, never the Templo's, back on its line it is not saved", () => {
  assert.deepEqual(sz.sceneEdgeList(undefined, 3), [0, 1920, 3840, 5760, 7680, 9600])
  let edges = sz.moveSceneEdge(undefined, 3, 1, 1000)
  assert.deepEqual(edges, { 1: 1000 })
  assert.deepEqual(sz.sceneEdgeList(edges, 3).slice(0, 4), [0, 1000, 3840, 5760])
  assert.deepEqual(sz.groundZones(undefined, edges, 3).slice(0, 2).map(g => [g.x, g.w]), [[0, 1000], [1000, 2840]])
  assert.equal(sz.moveSceneEdge(edges, 3, 1, -50)[1], sz.SCENE_ZONE_MIN_W, 'not past the wall')
  assert.equal(sz.moveSceneEdge(edges, 3, 1, 9999)[1], 3840 - sz.SCENE_ZONE_MIN_W, 'not past the next limit')
  assert.equal(sz.moveSceneEdge(edges, 3, 3, 5000), edges, "the Templo's limit stays")
  assert.equal(sz.moveSceneEdge(edges, 3, 1, 1920), undefined, 'back on its line')
  // a narrower Pátio: a limit saved for a scene that is now the Templo's is ignored
  assert.deepEqual(sz.sceneEdgeList({ 1: 1000, 2: 3000 }, 2), [0, 1000, 3840, 5760, 7680])
  assert.deepEqual(settings.normalizePatioSettings({ screens: 2, sceneEdges: { 1: 900.4, 2: 3000, x: 5, 0: 3 } }).sceneEdges, { 1: 900 })
})

test('the ambience of a zone: silence by default, the old sound for zones saved before it, cleaned like the rest', () => {
  assert.deepEqual(sz.defaultSoundZone().ambience, { beat: 'none', bass: 'none' })
  assert.deepEqual(sz.normalizeSoundZone(null).ambience, { beat: 'none', bass: 'none' })
  // saved before: the percussion of its feel over the drone
  assert.deepEqual(sz.normalizeSoundZone({ name: 'Velha', feel: 'swing' }).ambience, { beat: 'swing', bass: 'drone' })
  assert.deepEqual(sz.normalizeSoundZone({ name: 'Velha' }).ambience, { beat: 'half', bass: 'drone' })
  const z = sz.normalizeSoundZone({ ambience: { beat: 'samba', bass: 'nope', beatVol: 250, bassVol: 40, bassOct: 7, drums: { kick: 'X..?', bogus: 'xxxx', hat: '................' } } })
  assert.deepEqual(z.ambience, { beat: 'samba', drums: { kick: 'X...............' }, bass: 'none', bassVol: 40, bassOct: 1 })
  // the conductor takes a zone whose ambience changed
  const a = sz.defaultSoundZone()
  assert.notEqual(sz.soundZoneOf('z', a).id, sz.soundZoneOf('z', { ...a, ambience: { beat: 'rock', bass: 'none' } }).id)
  assert.deepEqual(sz.soundZoneOf('z', a).ambience, a.ambience)
  for (const zone of ZONES) assert.ok(amb.isBeat(zone.ambience.beat) && amb.isBass(zone.ambience.bass), zone.id)
})

test('beats and basses: every pattern has 16 steps; hits, lines over the chord of the bar and the sustained voice', () => {
  for (const b of amb.BEATS) for (const [row, steps] of Object.entries(b.grid)) { assert.equal(steps.length, 16, `${b.id} ${row}`); assert.match(steps, /^[oxX.]+$/, `${b.id} ${row}`) }
  for (const b of amb.BASSES) { assert.ok(b.drone || b.lines?.length, b.id); for (const l of b.lines ?? []) { assert.equal(l.length, 16, b.id); assert.match(l, /^[13578c.]+$/, b.id) } }
  assert.deepEqual(amb.beatHits({ beat: 'none', bass: 'none' }, 0), [])
  assert.deepEqual(amb.beatHits({ beat: 'straight', bass: 'none' }, 4).map(h => h.drum), ['snare', 'hat'])
  assert.equal(amb.beatHits({ beat: 'straight', bass: 'none', beatVol: 50 }, 0)[0].vel, 0.5)
  assert.deepEqual(amb.beatHits({ beat: 'straight', bass: 'none', beatVol: 0 }, 0), [])
  // a grid of its own plays in place of the beat's
  const own = amb.toggleDrumStep({}, 'clap', 3)
  assert.deepEqual(own, { clap: '...x............' })
  assert.deepEqual(amb.beatHits({ beat: 'straight', bass: 'none', drums: own }, 0), [])
  assert.deepEqual(amb.toggleDrumStep(amb.toggleDrumStep(own, 'clap', 3), 'clap', 3), {}, 'normal → accent → rest')
  // C major in the bass register (root 36): the walking line goes up the chord, then down from the octave
  const chord = [60, 64, 67, 71], walk = { beat: 'none', bass: 'walking' }
  assert.deepEqual([0, 4, 8, 12].map(st => amb.bassNotes(walk, chord, 36, st, 0)[0].midi), [36, 40, 43, 47])
  assert.equal(amb.bassNotes(walk, chord, 36, 0, 1)[0].midi, 48)
  assert.deepEqual(amb.bassNotes(walk, chord, 36, 1, 0), [])
  assert.equal(amb.bassNotes({ ...walk, bassOct: -1, bassVol: 50 }, chord, 36, 0, 0)[0].midi, 24)
  assert.equal(amb.bassNotes({ ...walk, bassVol: 50 }, chord, 36, 0, 0)[0].vel, 0.5)
  assert.equal(amb.bassNotes({ beat: 'none', bass: 'stabs' }, chord, 36, 2, 0).length, 3, 'the whole chord')
  assert.deepEqual(amb.bassNotes({ beat: 'none', bass: 'drone' }, chord, 36, 0, 0), [], 'a drone has no line')
  assert.deepEqual(amb.ambienceDrone({ beat: 'none', bass: 'pad', bassOct: 1 }), { tone: 'pad', vol: 1, oct: 1 })
  assert.equal(amb.ambienceDrone(walk), null); assert.equal(amb.ambienceDrone({ beat: 'none', bass: 'none' }), null)
  // the tags step through the lists from silence; "Troca de levada" keeps the beat with the feel while it follows it
  const z = sz.defaultSoundZone()
  assert.equal(zc.ZONE_STEP.beat(z).ambience.beat, 'straight'); assert.equal(zc.ZONE_STEP.bass(z).ambience.bass, 'drone')
  const feel = zc.zoneChange('feel')
  assert.equal(feel.apply({ ...z, feel: 'straight', ambience: { beat: 'straight', bass: 'drone' } }).ambience.beat, 'swing')
  assert.equal(feel.apply({ ...z, feel: 'straight', ambience: { beat: 'samba', bass: 'drone' } }).ambience.beat, 'samba')
})

test('a Pátio keeps its own Camadas: cleaned, in range, Escalas up to 3x', () => {
  const settings = loadTs('lib/pigchicken/patio-settings.ts')
  const s = settings.normalizePatioSettings({ layers: { backdrop: 140, zones: -3, scale: 42.6, scaleSize: 9, scaleFade: 'x', scaleLines: 30, hitboxes: true } })
  assert.deepEqual(s.layers, { backdrop: 100, zones: 0, scale: 43, scaleSize: 3, scaleFade: 50, scaleLines: 30, hitboxes: true })
  assert.equal(settings.normalizePatioSettings({ layers: 'nope' }), undefined)
})

test('zone chords always fit the melody scale, and the drone stays near the key with the chord\'s own fifth', () => {
  const zc = loadTs('lib/pigchicken/zone-changes.ts')
  const music = loadTs('lib/pigchicken/music.ts')
  const fits = (scale, chords) => music.SCALES[scale].steps.every(s => music.SCALES[chords].steps.includes(s)) || scale === 'blues'
  assert.deepEqual(zc.chordScalesFor('minorPenta').slice().sort(), ['dorian', 'minor'])
  let z = sz.normalizeSoundZone({ scale: 'majorPenta', chordScale: 'major' })
  for (let i = 0; i < 30; i++) { z = { ...z, ...zc.ZONE_STEP.scale(z) }; assert.ok(fits(z.scale, z.chordScale), `${z.scale}/${z.chordScale}`) }
  for (let i = 0; i < 10; i++) { z = { ...z, ...zc.ZONE_STEP.chordScale(z) }; assert.ok(fits(z.scale, z.chordScale), `${z.scale}/${z.chordScale}`) }
  let seed = 1; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 40; i++) for (const id of ['random', 'modal', 'penta', 'relative', 'parallel']) { z = sz.applyZoneChange(z, id, rnd); assert.ok(fits(z.scale, z.chordScale), `${id}: ${z.scale}/${z.chordScale}`) }
  // C major, I bVII IV: B° on degree 7 has a tritone, and the bass never leaps more than a tritone from C
  const zone = { ...music.ZONES[0], root: 60, chordScale: 'major' }
  const vii = music.droneOf(zone, music.chordOn(zone, 6))
  assert.equal(vii.fifth, 6); assert.equal(vii.third, 3); assert.equal(vii.root, 59)
  assert.equal(music.droneOf(zone, music.chordOn(zone, 5)).third, 3); assert.equal(music.droneOf(zone, music.chordOn(zone, 3)).third, 4)
  for (let d = 0; d < 7; d++) { const r = music.droneOf(zone, music.chordOn(zone, d)).root; assert.ok(r >= 55 && r <= 66, `${d}: ${r}`) }
})
