const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { loadTs } = require('./helpers/music.cjs')
const amb = loadTs('lib/pigchicken/zone-ambience.ts')
const kits = loadTs('lib/pigchicken/beat-kits.ts')
const sz = loadTs('lib/pigchicken/sound-zones.ts')
const { createConductor, chordOn } = loadTs('lib/pigchicken/music.ts')

const SAMPLES = path.resolve(__dirname, '..', 'public', 'samples')
const ROWS = kits.DRUM_ROWS.map(r => r.id)
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg ?? ''} ${a} ≠ ${b}`)

// ---------- the rhythms as written ----------

test('every rhythm: a kit, a microtiming profile of 4 or 16, 3 to 7 patterns of 16 steps on rows that exist', () => {
  assert.ok(amb.BEATS.length >= 19)
  assert.equal(new Set(amb.BEATS.map(b => b.id)).size, amb.BEATS.length, 'no id twice')
  for (const b of amb.BEATS) {
    assert.ok(kits.KITS[b.kit], `${b.id}: kit`)
    assert.ok([4, 16].includes(b.micro.length), `${b.id}: micro`)
    for (const m of b.micro) assert.ok(Number.isInteger(m) && Math.abs(m) <= 67, `${b.id}: micro ${m}`)
    assert.equal(b.micro[0], 0, `${b.id}: the beat itself stays on the grid`)
    const patterns = amb.beatPatterns(b)
    assert.ok(patterns.length >= 3 && patterns.length <= 7, `${b.id}: ${patterns.length} patterns`)
    assert.equal(new Set(patterns.map(p => p.label)).size, patterns.length, `${b.id}: labels`)
    for (const p of patterns) {
      assert.ok(p.label, `${b.id}: label`)
      assert.ok(Object.keys(p.grid).length, `${b.id} ${p.label}: plays something`)
      for (const [row, steps] of Object.entries(p.grid)) {
        assert.ok(ROWS.includes(row), `${b.id} ${p.label}: row ${row}`)
        assert.equal(steps.length, 16, `${b.id} ${p.label} ${row}`); assert.match(steps, /^[oxX.]+$/, `${b.id} ${p.label} ${row}`)
        assert.ok(kits.KITS[b.kit][row], `${b.id} ${p.label}: the kit has no ${row}`)
      }
      for (const [row, t] of Object.entries(amb.patternTime(b, p))) for (const s of t) assert.ok(Number.isInteger(s) && Math.abs(s) <= amb.SHIFT_MAX, `${b.id} ${p.label} ${row}: ${s}`)
      if (p.beats !== undefined) assert.ok(p.beats >= sz.ZONE_BLOCK_BEATS.min && p.beats <= sz.ZONE_BLOCK_BEATS.max, `${b.id} ${p.label}: beats`)
      if (p.reps !== undefined) assert.ok(p.reps >= sz.ZONE_BLOCK_REPS.min && p.reps <= sz.ZONE_BLOCK_REPS.max, `${b.id} ${p.label}: reps`)
    }
  }
  for (const g of amb.BEAT_GROUPS) assert.ok(amb.BEATS.some(b => b.group === g), g)
})

test('every kit plays recordings that are in the game: each take as .ogg and .m4a, a label on every row', () => {
  for (const [id, kit] of Object.entries(kits.KITS)) {
    for (const [row, voice] of Object.entries(kit)) {
      assert.ok(ROWS.includes(row), `${id}: row ${row}`); assert.ok(voice.label, `${id} ${row}: label`)
      assert.ok((voice.gain ?? 1) > 0 && (voice.gain ?? 1) <= 1.2, `${id} ${row}: gain`)
    }
    for (const file of kits.kitFiles(kit)) for (const ext of ['ogg', 'm4a']) assert.ok(fs.existsSync(path.join(SAMPLES, `${file}.${ext}`)), `${id}: ${file}.${ext}`)
  }
  assert.equal(kits.kitOf(undefined), kits.KITS.acoustic); assert.equal(kits.kitOf('nope'), kits.KITS.acoustic)
  assert.equal(kits.rowLabel(kits.KITS.samba, 'kick'), 'Surdo'); assert.equal(kits.rowLabel({}, 'kick'), 'Bumbo')
  assert.deepEqual(kits.kitFiles({ kick: { label: 'a', file: 'b/c', takes: 2 }, hat: { label: 'd', file: 'b/e' } }), ['b/c-0', 'b/c-1', 'b/e-0'])
})

// ---------- microtiming ----------

test("the samba's sixteenths: the 2nd late, the 3rd and the 4th early (not a dotted figure, not a triplet); bossa half of it", () => {
  const samba = amb.beatOf('samba'), a = { beat: 'samba', bass: 'none' }
  assert.deepEqual(samba.micro, [0, 10, -16, -16])
  // at a 500 ms beat (125 ms sixteenth): +12 ms, −20 ms, −20 ms, as measured on the tamborim
  assert.deepEqual(samba.micro.map(m => Math.round(m / 100 * 125)), [0, 13, -20, -20])
  assert.deepEqual(amb.grooveOf(a, 'straight').slice(0, 8), [0, 0.1, -0.16, -0.16, 0, 0.1, -0.16, -0.16])
  // where each sixteenth falls in the beat: between the rigid grid (25/50/75%) and the triplet (33/67%)
  const at = [1, 2, 3].map(i => (i + samba.micro[i] / 100) / 4)
  assert.ok(at[0] > 0.25 && at[0] < 0.29 && at[1] > 0.42 && at[1] < 0.5 && at[2] > 0.67 && at[2] < 0.75, String(at))
  assert.deepEqual(amb.beatOf('bossa').micro, [0, 5, -8, -8])
  // every hit of the pattern sits where the profile says, plus what its row lags
  const hits = amb.beatHits(a, 1)
  assert.ok(hits.length); for (const h of hits) near(h.shift, 0.1 + (samba.lag?.[h.drum] ?? 0) / 100, h.drum)
  for (const h of amb.beatHits(a, 0)) near(h.shift, (samba.lag?.[h.drum] ?? 0) / 100, h.drum)
})

test('the swing of each style: a triplet in the jazz, a lilt on the sixteenths of funk and boom bap, a late snare in rock', () => {
  assert.deepEqual(amb.beatOf('swing').micro, [0, 33, 67, -33])
  // the off-beat eighth of the jazz lands on the last triplet of the beat
  assert.ok(Math.abs((2 + amb.grooveOf({ beat: 'swing', bass: 'none' }, 'straight')[2]) / 4 - 2 / 3) < 0.002)
  for (const id of ['funk', 'boombap', 'house', 'reggae']) { const m = amb.beatOf(id).micro; assert.ok(m[1] > 0 && m[3] > 0 && m[2] === 0, `${id}: ${m}`) }
  assert.ok(amb.beatOf('boombap').micro[1] > amb.beatOf('funk').micro[1], 'the MPC swings more than the funk drummer')
  assert.ok(amb.beatOf('techno').micro[1] < amb.beatOf('house').micro[1], 'techno is the most rigid of the two')
  const rock = amb.beatOf('rock'), t = amb.patternTime(rock)
  assert.ok(rock.lag.snare > 0, 'laid-back snare'); assert.equal(t.snare[4], rock.lag.snare); assert.equal(t.snare[0], 0, 'no note, no time')
  // a pattern's own time for a note wins over the profile
  const own = amb.patternTime({ ...rock, time: { snare: Object.assign(Array(16).fill(0), { 4: -9 }) } })
  assert.equal(own.snare[4], -9)
})

test('the Balanço Swing delays the off-beat eighth only where the rhythm has no lilt of its own there', () => {
  const flat = { beat: 'straight', bass: 'none' }, samba = { beat: 'samba', bass: 'none' }
  assert.equal(amb.grooveOf(flat, 'straight')[2], 0); assert.equal(amb.grooveOf(flat, 'swing')[2], 0.33)
  assert.equal(amb.grooveOf(flat, 'swing')[1], 0); assert.equal(amb.grooveOf(samba, 'swing')[2], -0.16)
  assert.deepEqual(amb.grooveOf(undefined, 'half'), Array(16).fill(0))
  const lagged = h => h.shift - (amb.beatOf('straight').lag?.[h.drum] ?? 0) / 100
  for (const h of amb.beatHits(flat, 2, 'swing')) assert.ok(h.shift >= 0.33 - 1e-9 || lagged(h) === 0, h.drum)
  assert.ok(amb.beatHits(flat, 2, 'swing').some(h => h.shift === 0.33))
  assert.ok(amb.beatHits(flat, 2, 'straight').every(h => h.shift < 0.33))
})

// ---------- a grid with notes that can be dragged ----------

test('a note of the grid: a click makes it at the place of the rhythm, a drag takes it anywhere, even to another step', () => {
  let p = amb.toggleDrumNote({ grid: {}, time: {} }, 'hat', 1, 10)
  assert.deepEqual(p, { grid: { hat: '.x..............' }, time: { hat: Object.assign(Array(16).fill(0), { 1: 10 }) } })
  p = amb.toggleDrumNote(p, 'hat', 1, 99) // an accent now: it keeps its place
  assert.equal(p.grid.hat[1], 'X'); assert.equal(p.time.hat[1], 10)
  // dragged within its sixteenth
  let m = amb.moveDrumNote(p, 'hat', 1, 1.36)
  assert.equal(m.step, 1); assert.equal(m.pattern.time.hat[1], 36); assert.equal(m.pattern.grid.hat[1], 'X')
  // dragged past the half: it is a note of the next step, early
  m = amb.moveDrumNote(p, 'hat', 1, 1.7)
  assert.equal(m.step, 2); assert.equal(m.pattern.grid.hat, '..X.............'); assert.equal(m.pattern.time.hat[2], -30); assert.equal(m.pattern.time.hat[1], 0)
  // back on the grid: no time left to store
  m = amb.moveDrumNote(m.pattern, 'hat', 2, 2)
  assert.deepEqual(m.pattern.time, {})
  // a taken neighbour stops it half a sixteenth away
  const two = amb.toggleDrumNote(p, 'hat', 2)
  m = amb.moveDrumNote(two, 'hat', 1, 1.9)
  assert.equal(m.step, 1); assert.equal(m.pattern.time.hat[1], amb.SHIFT_MAX); assert.equal(m.pattern.grid.hat.slice(0, 3), '.Xx')
  // the ends of the bar
  assert.equal(amb.moveDrumNote(p, 'hat', 1, -5).step, 0); assert.equal(amb.moveDrumNote(p, 'hat', 1, -5).pattern.time.hat[0], -amb.SHIFT_MAX)
  assert.equal(amb.moveDrumNote(p, 'hat', 1, 99).step, 15)
  assert.deepEqual(amb.moveDrumNote(p, 'hat', 5, 6), { pattern: p, step: 5 }, 'nothing to move')
  // the third click takes the note and its time away
  assert.deepEqual(amb.toggleDrumNote(p, 'hat', 1), { grid: {}, time: {} })
})

test("a zone's own grid keeps the time of each note: cleaned, played, part of what tells two ambiences apart", () => {
  const raw = { beat: 'samba', variant: 2, bass: 'none', drums: { kick: 'x...x...........' }, drumTime: { kick: [0, 40, 0, 0, 999, 'a'], hat: [5], bogus: [1] } }
  const a = amb.cleanAmbience(raw)
  assert.deepEqual(a, { beat: 'samba', drums: { kick: 'x...x...........' }, drumTime: { kick: Object.assign(Array(16).fill(0), { 4: 50 }) }, bass: 'none' }, 'no variant under a grid of its own, no time without a note')
  assert.equal(amb.beatHits(a, 4)[0].shift, 0.5); assert.equal(amb.beatHits(a, 0)[0].shift, 0)
  assert.notEqual(amb.ambienceKey(a), amb.ambienceKey({ ...a, drumTime: undefined }))
  assert.equal(amb.beatName(a), 'Batida própria'); assert.equal(amb.ambienceKit(a), kits.KITS.samba, 'the grid keeps the timbres of the rhythm it came from')
  // a variation of the rhythm
  const samba = amb.beatOf('samba'), v = amb.cleanAmbience({ beat: 'samba', variant: 1, bass: 'none' })
  assert.equal(v.variant, 1); assert.equal(amb.ambienceBeatPattern(v), samba.variations[0])
  assert.equal(amb.beatName(v), `Samba: ${samba.variations[0].label}`)
  assert.notEqual(amb.ambienceKey(v), amb.ambienceKey({ beat: 'samba', bass: 'none' }))
  assert.equal(amb.cleanAmbience({ beat: 'samba', variant: 99, bass: 'none' }).variant, undefined)
  assert.equal(amb.cleanAmbience({ beat: 'none', variant: 1, bass: 'none' }).variant, undefined)
  // another rhythm drops the grid and the variation
  assert.deepEqual(amb.withBeat(a, 'rock'), { beat: 'rock', bass: 'none' })
  assert.deepEqual(amb.withBeat({ ...v, beatVol: 50 }, 'samba', 2), { beat: 'samba', variant: 2, beatVol: 50, bass: 'none' })
  // the rows of the panel: the kit's
  assert.deepEqual(amb.ambienceRows({ beat: 'bossa', bass: 'none' }).map(r => r.id), ROWS.filter(r => kits.KITS.bossa[r]))
})

// ---------- variation blocks ----------

test('variation blocks: the zone is the first one, up to 10, each with its beats and how many times it repeats', () => {
  const z = sz.defaultSoundZone()
  assert.equal(z.blocks, undefined); assert.equal(sz.zoneBlockCount(z), 1)
  assert.deepEqual(sz.zoneBlocks(z).map(b => [b.beats, b.reps]), [[16, 1]])
  let two = sz.addZoneBlock(z, 0, { bpm: 120, beats: 4, reps: 3 })
  assert.equal(sz.zoneBlockCount(two), 2); assert.equal(two.bpm, z.bpm); assert.equal(two.beats, 16); assert.equal(two.reps, 1)
  assert.deepEqual([two.blocks[0].bpm, two.blocks[0].beats, two.blocks[0].reps, two.blocks[0].root], [120, 4, 3, z.root])
  // a block changed in place; out of range is brought back
  two = sz.setZoneBlock(two, 1, { beats: 999, reps: 0, ambience: { beat: 'samba', bass: 'none' } })
  assert.deepEqual([two.blocks[0].beats, two.blocks[0].reps, two.blocks[0].ambience.beat], [sz.ZONE_BLOCK_BEATS.max, sz.ZONE_BLOCK_REPS.min, 'samba'])
  two = sz.setZoneBlock(two, 0, { beats: 8, bpm: 100 })
  assert.equal(two.beats, 8); assert.equal(two.bpm, 100); assert.equal(two.blocks[0].bpm, 120)
  // a new one goes right after the block it copies
  const three = sz.addZoneBlock(two, 0)
  assert.deepEqual(sz.zoneBlocks(three).map(b => b.bpm), [100, 100, 120])
  // the first one out: the second becomes the zone's own sequence
  const back = sz.removeZoneBlock(sz.removeZoneBlock(three, 0), 0)
  assert.equal(back.blocks, undefined); assert.equal(back.beats, undefined); assert.equal(back.bpm, 120); assert.equal(back.ambience.beat, 'samba')
  assert.equal(sz.removeZoneBlock(back, 0), back, 'the last one stays')
  let full = z
  for (let i = 0; i < 20; i++) full = sz.addZoneBlock(full, 0) ?? full
  assert.equal(sz.zoneBlockCount(full), sz.ZONE_BLOCKS_MAX); assert.equal(sz.addZoneBlock(full, 0), null)
  // as stored: cleaned, cut at 10, a block that says nothing of its ambience is in silence
  const raw = sz.normalizeSoundZone({ name: 'B', beats: 3.4, blocks: [{ bpm: 9999, scale: 'nope' }, 7, ...Array(20).fill({})] })
  assert.equal(sz.zoneBlockCount(raw), sz.ZONE_BLOCKS_MAX); assert.equal(raw.beats, 3); assert.equal(raw.reps, 1)
  assert.equal(raw.blocks[0].bpm, sz.ZONE_BPM.max); assert.equal(raw.blocks[0].scale, raw.scale); assert.deepEqual(raw.blocks[0].ambience, { beat: 'none', bass: 'none' })
  assert.deepEqual(sz.normalizeSoundZone(JSON.parse(JSON.stringify(three))), three, 'what is saved comes back the same')
})

test("the conductor's zone of a zone with blocks: a cycle of zones, one alone in Solo, a new id when a block changes", () => {
  const z = sz.addZoneBlock(sz.defaultSoundZone(), 0, { bpm: 120, beats: 8, reps: 2 })
  const fam = sz.soundZoneOf('e1', z)
  assert.equal(fam.blocks.length, 2); assert.deepEqual(fam.blocks.map(b => [b.zone.bpm, b.beats, b.reps]), [[z.bpm, 16, 1], [120, 8, 2]])
  assert.equal(new Set([fam.id, ...fam.blocks.map(b => b.zone.id)]).size, 3)
  assert.equal(sz.soundZoneOf('e1', z), fam, 'the same zone while the element is the same')
  assert.notEqual(sz.soundZoneOf('e1', sz.setZoneBlock(z, 1, { reps: 3 })).id, fam.id)
  assert.notEqual(sz.soundZoneOf('e1', sz.setZoneBlock(z, 1, { ambience: { beat: 'samba', variant: 1, bass: 'none' } })).id, fam.id)
  const solo = sz.soundZoneOf('e1', z, 1)
  assert.equal(solo.blocks, undefined); assert.equal(solo.bpm, 120); assert.notEqual(solo.id, fam.id)
  assert.equal(sz.soundZoneOf('e1', sz.defaultSoundZone(), 3).blocks, undefined, 'no blocks, no Solo')
})

// runs the conductor in small steps and says what played on each sixteenth
function run(c, seconds, dt = 0.005) {
  const out = []
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    c.step(dt)
    for (const e of c.events.splice(0)) if (e.kind === 'step') out.push({ zone: c.zone.id, block: c.block, step: e.n % 16, degree: c.degree })
  }
  return out
}
const blockZone = (blocks, base = {}) => {
  let z = { ...sz.defaultSoundZone(), bpm: 120, progression: [0, 3, 4, 5], ...base, beats: blocks[0].beats, reps: blocks[0].reps }
  blocks.slice(1).forEach((b, i) => { z = sz.addZoneBlock(z, i, b) })
  return z
}

test('the conductor plays the blocks in turn: each one its beats, as many times as it repeats, the progression from the start', () => {
  const z = blockZone([{ beats: 8, reps: 2 }, { beats: 4, reps: 1, progression: [2] }])
  const fam = sz.soundZoneOf('c', z), c = createConductor()
  c.setZone(fam); c.step(1e-6); c.events.length = 0 // the zone takes over on the first bar line
  assert.equal(c.family, fam); assert.equal(c.zone, fam.blocks[0].zone)
  c.setZone(fam); assert.equal(c.pending, null, 'the same cycle is not asked for again')
  const played = run(c, 0.5 * 28) // 28 beats at 120 bpm: 8 + 8 + 4, and 8 again
  const bars = []
  for (let i = 0; i < played.length; i += 16) bars.push(`${played[i].block}:${played[i].degree}`)
  // two bars twice (the progression starts again on each pass), one bar of the second block, back to the first
  assert.deepEqual(bars.slice(0, 7), ['0:0', '0:3', '0:0', '0:3', '1:2', '0:0', '0:3'])
  for (const p of played) assert.equal(p.zone, fam.blocks[p.block].zone.id)
  assert.deepEqual(played.slice(0, 17).map(p => p.step), [...Array(16).keys(), 0, 1].slice(1), 'the first sixteenth sounded as the zone took over')
})

test('a block that ends off the bar line: what is left of the bar is skipped, the next one starts on its first beat', () => {
  const z = blockZone([{ beats: 6, reps: 1 }, { beats: 4, reps: 1, bpm: 60 }])
  const fam = sz.soundZoneOf('c', z), c = createConductor()
  c.setZone(fam); c.step(1e-6); c.events.length = 0
  const played = run(c, 0.5 * 6 + 1 * 4 + 0.5 * 3)
  const seq = played.map(p => `${p.block}:${p.step}`)
  // 6 beats = 24 sixteenths of block 0 (the first one already sounded when the zone took over), then block 1 from 0
  const turn = seq.indexOf('1:0')
  assert.equal(turn, 23); assert.equal(seq[turn - 1], '0:7')
  assert.deepEqual(seq.slice(turn, turn + 16), [...Array(16).keys()].map(s => `1:${s}`))
  assert.equal(seq[turn + 16], '0:0'); assert.equal(c.zone.bpm, 120)
})

test('what comes next is known a sixteenth ahead: the step, its chord, the wait and the block that takes over', () => {
  const z = blockZone([{ beats: 4, reps: 1 }, { beats: 4, reps: 1, bpm: 60, progression: [4] }])
  const fam = sz.soundZoneOf('c', z), c = createConductor()
  c.setZone(fam); c.step(1e-6)
  let up = c.ahead()
  assert.equal(up.zone, fam.blocks[0].zone); assert.equal(up.step, 1); near(up.wait, 0.125, 'a sixteenth at 120 bpm'); assert.equal(up.spb, 0.5)
  c.step(0.5 * 4 - 0.125) // on the last sixteenth of the block
  up = c.ahead()
  assert.equal(up.zone, fam.blocks[1].zone, 'the next block'); assert.equal(up.step, 0); assert.equal(up.bar, 0); assert.equal(up.spb, 1)
  near(up.wait, 0.125 - 1e-6); assert.deepEqual(up.chord, chordOn(fam.blocks[1].zone, 4, true), 'the chord of its own progression')
  // a zone waiting for the bar line is what plays on it
  const solo = createConductor(), a = sz.soundZoneOf('a', sz.defaultSoundZone()), b = sz.soundZoneOf('b', { ...sz.defaultSoundZone(), bpm: 150 })
  solo.setZone(a); solo.step(1e-6); solo.setZone(b)
  solo.step(60 / a.bpm * 4 - 60 / a.bpm / 4)
  assert.equal(solo.zone, a); assert.equal(solo.ahead().zone, b); assert.equal(solo.ahead().step, 0)
  assert.equal(solo.ahead().spb, 60 / 150)
})

test("the grid the players' notes are pulled to follows the groove of the zone", () => {
  const zone = beat => sz.soundZoneOf(beat, { ...sz.defaultSoundZone(), bpm: 120, feel: 'straight', ambience: { beat, bass: 'none' } })
  const at = (beat, sixteenths) => { const c = createConductor(); c.setZone(zone(beat)); c.step(1e-7); c.step(0.125 * sixteenths); return c.toGrid() }
  near(at('straight', 0.5), 0.0625, 'the next sixteenth')
  near(at('samba', 0.5), 0.125 * 0.6, 'the 2nd sixteenth of the samba is late')
  near(at('samba', 1.5), 0.125 * 0.34, 'the 3rd is early')
  near(at('samba', 1.9), 0.125 * 0.94, 'past the early 3rd: the 4th')
  near(at('swing', 0.5), 0.125 * 0.83, 'the jazz: the next point is a triplet')
  const half = createConductor(); half.setZone(sz.soundZoneOf('h', { ...sz.defaultSoundZone(), bpm: 120, feel: 'half', ambience: { beat: 'samba', bass: 'none' } })); half.step(1e-7); half.step(0.0625)
  near(half.toGrid(), 0.1875, 'Meio tempo: the next eighth')
})
