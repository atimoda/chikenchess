const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('./helpers/music.cjs')
const { INSTRUMENT_SCALES, fieldHouses, fieldTurn, houseAt, sectorAt, ringAt, cleanScales, scaleAt, regionNotes, romanOf, spiralAt, spiralRadius, SPIRAL_HOLE } = loadTs('lib/pigchicken/instrument-scales.ts')
const { scaleStep, arrivalScale } = loadTs('lib/pigchicken/inventory.ts')
const { DEFAULT_ITEMS, INSTRUMENT_IDS, INSTRUMENT_WEAPON, ARPS, ARP_GLYPHS, nextArp, bowed, pizzicato } = loadTs('lib/pigchicken/items.ts')
const { createConductor } = loadTs('lib/pigchicken/music.ts')

const UP = -Math.PI / 2, RIGHT = 0
const pc = m => ((m % 12) + 12) % 12

test('sectors start straight up and go clockwise; half a stick is the inner ring, all the way the outer', () => {
  assert.equal(sectorAt(UP), 0)
  assert.equal(sectorAt(UP + Math.PI / 6), 1)
  assert.equal(sectorAt(RIGHT), 3)
  assert.equal(sectorAt(Math.PI / 2), 6)
  assert.equal(ringAt(0.5), 0)
  assert.equal(ringAt(1), 1)
})

test('Ciclo de quintas: C on top outside, Am inside; G one sector clockwise', () => {
  const s = INSTRUMENT_SCALES.fifths, music = createConductor()
  assert.equal(s.regionAt(UP, 1).label, 'C')
  assert.equal(s.regionAt(UP, 0.5).label, 'Am')
  assert.equal(s.regionAt(UP + Math.PI / 6, 1).label, 'G')
  // degrees over the chords, in the zone's key (the first zone is in C)
  assert.equal(music.zone.root % 12, 0)
  assert.equal(s.degreeLabel(s.regionAt(UP, 1), music), 'I')
  assert.equal(s.degreeLabel(s.regionAt(UP, 0.5), music), 'vi')
  assert.equal(s.degreeLabel(s.regionAt(UP + Math.PI / 6, 1), music), 'V')
  assert.equal(s.regions().length, 24)
  const q = { angle: UP + Math.PI / 6, reach: 1, set: 'chord', octave: 0, span: 2 }
  const base = s.noteFor(music, q)
  assert.equal(pc(base), 7)
  assert.ok(Math.abs(base - 60) <= 6)
  assert.deepEqual(new Set(s.pool(music, q).map(pc)), new Set([7, 11, 2]))
  assert.equal(pc(s.walk(music, base, 1, 'chord', q.angle, q.reach)), 11)
})

test('Tensão e resolução: dissonant chords in the middle, their resolution in the balls around', () => {
  const s = INSTRUMENT_SCALES.tension
  for (let k = 0; k < 12; k++) {
    const a = UP + k * Math.PI / 6
    const t = s.regionAt(a, 0.3), r = s.regionAt(a, 0.9)
    assert.equal(t.kind, 'tension'); assert.equal(r.kind, 'resolution')
    // every tension has a tritone; every resolution is a plain triad
    const iv = new Set(t.chord.map(c => pc(c)))
    assert.ok([...iv].some(x => iv.has(pc(x + 6))), t.label)
    assert.equal(r.chord.length, 3)
    // the tension leans into the resolution's root: a semitone or a fifth above it
    assert.ok(regionNotes(t, 48, 72).some(m => pc(m - r.root) === 11 || pc(m - r.root) === 7), t.label)
  }
  assert.equal(s.regionAt(UP, 0.3).label, 'B°7')
  assert.equal(s.degreeLabel(s.regionAt(UP, 0.3), createConductor()), 'vii°7')
  assert.equal(romanOf(7, 0, false, '7♭9'), 'V7♭9')
  assert.equal(romanOf(3, 0, false, ''), '♭III')
  assert.equal(romanOf(2, 0, true, 'ø7'), 'iiø7')
})

test('the primary scale is the conductor, untouched', () => {
  const music = createConductor(), s = INSTRUMENT_SCALES.primary
  const q = { angle: -1, reach: 0.2, set: 'scale', octave: 0, span: 2 }
  assert.equal(s.noteFor(music, q), music.noteFor(-1, 'scale', 0, 2))
  assert.deepEqual(s.pool(music, q), music.aimPool('scale', 0, 2))
})

test('the wheel goes through an instrument’s scales before the next item', () => {
  assert.equal(scaleStep(3, 0, 1), 1)
  assert.equal(scaleStep(3, 2, 1), null)
  assert.equal(scaleStep(3, 0, -1), null)
  assert.equal(scaleStep(3, 2, -1), 1)
  assert.equal(scaleStep(1, 0, 1), null)
  assert.equal(arrivalScale(3, 1), 0)
  assert.equal(arrivalScale(3, -1), 2)
})

test('Espiral: the zone’s scale from the outer edge (low) inward (high), one turn per octave', () => {
  const s = INSTRUMENT_SCALES.spiral, music = createConductor()
  const q = { octave: 0, span: 2 }
  const lay = s.layout(music, q)
  const pool = s.pool(music, { angle: 0, reach: 1, set: 'scale', ...q })
  assert.deepEqual(lay.pieces.map(p => p.midi), pool)
  for (let i = 1; i < pool.length; i++) assert.ok(pool[i] > pool[i - 1])
  // every note is in the zone's scale, and a turn holds an octave
  const steps = new Set(pool.map(m => pc(m - music.zone.root)))
  assert.ok(steps.size <= 7)
  assert.equal(lay.turns, pool.length / steps.size)
  // the outer edge straight up is the lowest note; the middle the highest
  assert.equal(s.noteFor(music, { angle: UP, reach: 1, set: 'chord', ...q }), pool[0])
  assert.equal(s.noteFor(music, { angle: UP - 0.01, reach: SPIRAL_HOLE, set: 'chord', ...q }), pool[pool.length - 1])
  // descending: turned around
  const down = s.layout(music, { ...q, descending: true })
  assert.deepEqual(down.pieces.map(p => p.midi), [...pool].reverse())
  assert.equal(s.noteFor(music, { angle: UP, reach: 1, set: 'chord', ...q, descending: true }), pool[pool.length - 1])
  // labels: the note in letters and its degree in the zone's scale
  assert.equal(lay.pieces[0].degree, music.degreeOf(pool[0]) + 1)
  assert.match(lay.pieces[0].letter, /^[A-G][♯♭]?$/)
})

test('Espiral: the aim finds the nearest turn; walking stays in the zone’s chord or scale', () => {
  // two turns: pointing up, full reach is the outer turn's start, half way in the next turn
  assert.equal(spiralAt(UP, 1, 2), 0)
  assert.ok(Math.abs(spiralAt(UP, spiralRadius(0.5, 2), 2) - 0.5) < 1e-9)
  // pointing right (a quarter turn clockwise) at full reach: a quarter of the first turn
  assert.ok(Math.abs(spiralAt(RIGHT, 1, 2) - 0.125) < 1e-9)
  const s = INSTRUMENT_SCALES.spiral, music = createConductor()
  assert.equal(s.walk(music, 60, 1, 'scale'), music.walk(60, 1, 'scale'))
  assert.equal(s.degreeOf(music, 64), music.degreeOf(64))
})

test('the arpeggiator: a glyph per option tracing its pattern; a click goes round them; the violin bows with it off and plucks with it on', () => {
  assert.deepEqual(ARPS.map(a => nextArp(a.value)), [...ARPS.slice(1), ARPS[0]].map(a => a.value))
  for (const a of ARPS) {
    const g = ARP_GLYPHS[a.value]
    assert.ok(g.length >= 4 && g.every(h => h === null || (h >= 0 && h <= 3)), a.value)
  }
  const dots = a => ARP_GLYPHS[a].filter(h => h !== null)
  const rising = g => g.every((h, i) => !i || h > g[i - 1])
  assert.ok(rising(dots('up')))
  assert.ok(rising([...dots('down')].reverse()))
  assert.equal(new Set(dots('off')).size, 1)
  const ud = dots('updown'), top = ud.indexOf(Math.max(...ud))
  assert.ok(top > 0 && top < ud.length - 1 && rising(ud.slice(0, top + 1)) && rising(ud.slice(top).reverse()))
  assert.ok(!rising(dots('random')) && !rising([...dots('random')].reverse()))
  assert.ok(ARP_GLYPHS.phrase.includes(null))
  const v = DEFAULT_ITEMS.violin
  assert.equal(v.arp, 'off')
  assert.ok(bowed(v) && !pizzicato(v))
  assert.ok(pizzicato({ ...v, arp: 'up' }) && !bowed({ ...v, arp: 'up' }))
  assert.ok(!pizzicato(DEFAULT_ITEMS.flute))
})

test('instruments start with every scale and a weapon for the reload sound; lists are cleaned', () => {
  for (const id of INSTRUMENT_IDS) {
    // the Hangdrum plays on its own scale (the hang's ding and rows)
    assert.deepEqual(DEFAULT_ITEMS[id].scales, id === 'hangdrum' ? ['hang'] : ['primary', 'fifths', 'tension', 'spiral', 'harmonic'])
    assert.equal(DEFAULT_ITEMS[id].spiralDescending, false)
    assert.ok(INSTRUMENT_WEAPON[id] && !DEFAULT_ITEMS[INSTRUMENT_WEAPON[id]].instrument)
  }
  assert.deepEqual(DEFAULT_ITEMS.pistol.scales, ['primary'])
  assert.deepEqual(cleanScales(['tension', 'x', 'primary', 'tension']), ['primary', 'tension'])
  assert.equal(cleanScales([]), null)
  assert.equal(scaleAt(['primary', 'fifths'], 9).id, 'fifths')
  assert.equal(scaleAt(undefined, 2).id, 'primary')
})

test('items saved before the Espiral (v6) with every scale on get it; a trimmed list stays as it was', () => {
  const { loadItems } = loadTs('lib/pigchicken/items.ts')
  const previous = globalThis.window
  const saved = { _v: 6, flute: { scales: ['primary', 'fifths', 'tension'] }, sax: { scales: ['primary', 'tension'] }, harp: { scales: ['primary', 'fifths', 'tension'], spiralDescending: true } }
  globalThis.window = { localStorage: { getItem: () => JSON.stringify(saved), setItem() {} }, dispatchEvent() {} }
  try {
    const items = loadItems()
    assert.deepEqual(items.flute.scales, ['primary', 'fifths', 'tension', 'spiral', 'harmonic'])
    assert.deepEqual(items.sax.scales, ['primary', 'tension'])
    assert.equal(items.harp.spiralDescending, true)
  } finally { globalThis.window = previous }
})

test('the violin bows a held note with the arpeggiator off and plucks short notes with it on', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const run = arp => {
    const items = structuredClone(DEFAULT_ITEMS); items.violin.arp = arp
    const c = createCombat(); c.setItems(items)
    const played = { notes: [], holds: 0 }
    c.setMusicOut({ note: (voice, midi, at, dur) => played.notes.push({ voice, dur }), hold: () => { played.holds++; return { stop() {}, setPitch() {}, setVolume() {} } }, drum() {} })
    c.give('violin')
    const ctl = { fire: true, firePressed: true, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
    for (let i = 0; i < 40; i++) { c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, ctl, [], 1000, () => {}); ctl.firePressed = false }
    return { played, c }
  }
  const bow = run('off')
  assert.equal(bow.played.holds, 1)
  assert.ok(bow.played.notes.every(n => n.voice !== 'pizz'))
  const pz = run('up')
  assert.equal(pz.played.holds, 0)
  assert.ok(pz.played.notes.filter(n => n.voice === 'pizz').length >= 3)
  assert.ok(pz.played.notes.filter(n => n.voice === 'pizz').every(n => n.dur <= 0.15))
  // the bow's seconds go note by note: about as much as bowing the same time
  assert.ok(pz.c.held.ammo > 0 && pz.c.held.ammo < DEFAULT_ITEMS.violin.mag)
})

test('Campo harmônico: 7 houses of the key, the I where its tonic is on the circle of fifths', () => {
  const s = INSTRUMENT_SCALES.harmonic, music = createConductor()
  const zone = { id: 'c', name: 'C', root: 60, scale: 'major', chordScale: 'major', bpm: 100, feel: 'straight', progression: [0], color: '#fff' }
  const houses = fieldHouses(zone)
  assert.deepEqual(houses.map(h => h.label), ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'B°'])
  assert.deepEqual(houses.map(h => h.numeral), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'])
  // C: the I straight up, then clockwise
  assert.equal(houseAt(UP, fieldTurn(60)), 0)
  assert.equal(houseAt(UP + (2 * Math.PI) / 7, fieldTurn(60)), 1)
  // the default zone (Campo, C): aiming up plays C, the house's chord
  assert.equal(pc(s.noteFor(music, { angle: UP, reach: 1, set: 'chord', octave: 0, span: 2 })), 0)
  // A minor: the wheel turns 90° (A is three fifths from C) and the houses follow the minor key
  const am = { ...zone, root: 57, chordScale: 'minor' }
  assert.equal(fieldTurn(57), Math.PI / 2)
  assert.deepEqual(fieldHouses(am).map(h => h.numeral), ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'])
  assert.equal(houseAt(RIGHT, fieldTurn(57)), 0)
  assert.equal(houseAt(UP, fieldTurn(57)), houseAt(UP - Math.PI / 2, 0))
})

test('Dano só no tom: off by default; the key or the bar’s chord when the zone asks', () => {
  const music = createConductor()
  assert.equal(music.fits(61), true)
  const base = { ...music.zone }
  music.setZone({ ...base, id: 'k', inKey: 'key' }); music.step(60 / base.bpm * 4)
  assert.equal(music.fits(62), true) // D in C major
  assert.equal(music.fits(61), false) // C♯
  music.setZone({ ...base, id: 'h', inKey: 'chord' }); music.step(60 / base.bpm * 4)
  const chord = music.chord(true).map(pc)
  for (let m = 60; m < 72; m++) assert.equal(music.fits(m), chord.includes(pc(m)))
})

test('Hangdrum: the ding (tonic) in the middle, 8 notes from the fifth up in a zig-zag, the top note straight up', () => {
  const s = INSTRUMENT_SCALES.hang, music = createConductor()
  const lay = s.layout(music, { octave: 0, hang: { rows: 1, notes: 8, notes2: 7 } })
  assert.equal(lay.fields.length, 9)
  // the first zone (Campo) is C major pentatonic: the ding C3, then G3 A3 C4 D4 E4 G4 A4 C5
  assert.equal(lay.fields[0].midi, 48)
  assert.deepEqual(lay.fields.slice(1).map(f => f.midi), [55, 57, 60, 62, 64, 67, 69, 72])
  // the lowest at the bottom, the highest at the top, the others alternating sides
  assert.ok(lay.fields[1].y > 0.6 && Math.abs(lay.fields[1].x) < 1e-9)
  assert.ok(lay.fields[8].y < -0.6 && Math.abs(lay.fields[8].x) < 1e-9)
  for (let i = 2; i < 8; i++) assert.ok(Math.sign(lay.fields[i].x) !== Math.sign(lay.fields[i + 1].x) || i === 7)
  // on a note: the clean note; in the middle: the ding; between notes: a slap that rings the nearest one
  const q = (angle, reach) => ({ angle, reach, set: 'scale', octave: 0, span: 2, hang: { rows: 1, notes: 8, notes2: 7 } })
  assert.equal(s.noteFor(music, q(UP, 1)), 72)
  assert.equal(s.isSlap(music, q(UP, 1)), false)
  assert.equal(s.noteFor(music, q(UP, 0)), 48)
  assert.equal(s.isSlap(music, q(UP, 0.1)), false)
  assert.equal(s.isSlap(music, q(UP, 0.37)), true)
  const gap = Math.PI / 2 + Math.PI / 8
  assert.equal(s.isSlap(music, q(gap, 1)), true)
  assert.ok([55, 57].includes(s.noteFor(music, q(gap, 1))))
  // walking goes over the hang's own notes
  assert.equal(s.walk(music, 60, 1, 'scale', UP, 1, q(UP, 1)), 62)
  assert.equal(s.walk(music, 48, 1, 'chord', UP, 1, q(UP, 1)), 55)
})

test('Hangdrum: a second row continues up the scale between the first one\'s notes; counts are clamped', () => {
  const { cleanHang, hangZigzag } = loadTs('lib/pigchicken/instrument-scales.ts')
  const s = INSTRUMENT_SCALES.hang, music = createConductor()
  const lay = s.layout(music, { octave: 0, hang: { rows: 2, notes: 8, notes2: 9 } })
  assert.equal(lay.fields.length, 18)
  const row2 = lay.fields.filter(f => f.row === 2)
  assert.equal(row2.length, 9)
  assert.ok(row2[0].midi > lay.fields[8].midi)
  assert.ok(row2.every(f => Math.hypot(f.x, f.y) > 0.7))
  assert.deepEqual(cleanHang({ rows: 5, notes: 2, notes2: 40 }), { rows: 2, notes: 5, notes2: 9 })
  assert.deepEqual(hangZigzag(8), [0, 1, 7, 2, 6, 3, 5, 4])
  assert.deepEqual(hangZigzag(5), [0, 1, 4, 2, 3])
})

test('Hangdrum in the hands: a shot on a note sounds its kind of hang; between the notes, the slap', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const shoot = (angle, voice) => {
    const items = structuredClone(DEFAULT_ITEMS); if (voice) items.hangdrum.voice = voice
    const c = createCombat(); c.setItems(items)
    const played = []
    c.setMusicOut({ note: (v, midi) => played.push({ v, midi }), hold: () => null, drum() {} })
    c.give('hangdrum'); c.setAimReach(1)
    const ctl = { fire: true, firePressed: true, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }
    for (let i = 0; i < 3; i++) { c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, angle, ctl, [], 1000, () => {}); ctl.fire = false; ctl.firePressed = false }
    // the shot's note (the equip sound comes before it)
    return played[played.length - 1]
  }
  assert.deepEqual(shoot(UP), { v: 'hang', midi: 72 })
  assert.deepEqual(shoot(UP, 'hangSteel'), { v: 'hangSteel', midi: 72 })
  const slap = shoot(Math.PI / 2 + Math.PI / 8)
  assert.equal(slap.v, 'hangSlap')
  assert.ok([55, 57].includes(slap.midi))
  assert.equal(DEFAULT_ITEMS.hangdrum.instrument, true)
  assert.equal(INSTRUMENT_WEAPON.hangdrum, 'pistol')
})

test('Escalas editor: the standby fades the layer after the wait, keeps the aimed cell, wakes on playing and never fades with "Prevenir fadeout"', () => {
  const S = loadTs('lib/pigchicken/scale-params.ts')
  const p = { ...S.DEFAULT_SCALES.primary }
  assert.deepEqual([p.standbyAfter, p.fadeTime, p.standbyVis, p.aimedVis], [0.5, 1.5, 0, 33])
  const st = S.newStandby(), run = (secs, playing = false, key = 'flute:primary', keep = false) => {
    let r; for (let t = 0; t < secs - 1e-9; t += 0.05) r = S.standbyStep(st, p, 0.05, playing, key, keep); return r
  }
  assert.deepEqual(run(0.45), { all: 1, aimed: 1 })
  // half way through the fade, then all the way: the scale at its standby, the aimed cell 33% over it
  const mid = run(0.8)
  assert.ok(mid.all > 0.2 && mid.all < 0.8, `mid fade ${mid.all}`)
  assert.deepEqual(run(2), { all: 0, aimed: 0.33 })
  // playing wakes it quickly (not in a single frame)
  const woke = run(0.05, true)
  assert.ok(woke.all > 0 && woke.all < 1)
  assert.equal(run(0.2, true).all, 1)
  // another scale (or item) wakes it too
  run(3)
  assert.equal(run(0.2, false, 'flute:fifths').all, 1)
  // aimed cell 0: it fades with the rest; standby 40%: the scale stays there
  p.aimedVis = 0; p.standbyVis = 40
  assert.deepEqual(run(3), { all: 0.4, aimed: 0.4 })
  // Camadas → Prevenir fadeout das escalas
  assert.equal(run(3, false, 'flute:fifths', true).all, 1)
})

test('Escalas editor: the charts\' ring split decides the ring; the defaults file round-trips', () => {
  const S = loadTs('lib/pigchicken/scale-params.ts')
  const fifths = S.DEFAULT_SCALES.fifths
  assert.equal(fifths.ringSplit, 0.6)
  const file = require('../data/pigchicken/default-scales.json')
  assert.deepEqual(S.scalesDefaultsFile(S.DEFAULT_SCALES), file)
  assert.equal(S.scalesFileProblem(file), null)
  assert.match(S.scalesFileProblem({ ...file, fifths: { ...file.fifths, ringSplit: 2 } }), /fora dos limites/)
  assert.match(S.scalesFileProblem({ ...file, primary: { ...file.primary, ringSplit: 0.5 } }), /desconhecido/)
  assert.match(S.scalesFileProblem({ ...file, nope: {} }), /desconhecida/)
  // the scale reads its shape: half a stick (0.5) is inside at 0.6, outside at 0.4
  const scale = INSTRUMENT_SCALES.fifths
  assert.equal(scale.regionAt(UP, 0.5).label, 'Am')
  scale.shape = { ringSplit: 0.4, hole: 0.2 }
  assert.equal(scale.regionAt(UP, 0.5).label, 'C')
  scale.shape = { ringSplit: 0.6, hole: 0.2 }
})

// ---------- Cordas soltas ----------
const DOWN = Math.PI / 2
test('Cordas soltas: one string per letter from a C, the lowest straight down and going up clockwise', () => {
  const { STRINGS_SCALE, STRINGS_MIN, STRINGS_MAX } = loadTs('lib/pigchicken/instrument-scales.ts')
  const s = STRINGS_SCALE, music = createConductor()
  assert.equal(s.label, 'Cordas soltas')
  assert.equal(s.count, 22)
  const lay = s.layout(music, { octave: 0 })
  // the first zone is in C major: the naturals, three octaves and a C around the item's octave
  assert.deepEqual(lay.slice(0, 8).map(x => x.midi), [48, 50, 52, 53, 55, 57, 59, 60])
  assert.equal(lay[21].midi, 84)
  assert.deepEqual(lay.slice(0, 7).map(x => x.name), ['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  assert.ok(lay.every((x, i) => !i || x.midi > lay[i - 1].midi))
  // the seam is at the ground: just clockwise of straight down the lowest, just before it the highest
  assert.equal(s.stringAt(DOWN + 0.01), 0)
  assert.equal(s.stringAt(DOWN - 0.01), 21)
  assert.equal(s.stringAt(UP + 0.01), 11)
  assert.equal(s.stringAt(lay[5].angle), 5)
  assert.equal(s.stringAt(lay[5].angle + Math.PI * 2), 5)
  // 16 to 48 strings (a Celtic harp to a concert one)
  const shape = s.shape
  try {
    s.shape = { ...shape, strings: 5 }; assert.equal(s.count, STRINGS_MIN)
    s.shape = { ...shape, strings: 99 }; assert.equal(s.count, STRINGS_MAX)
    assert.equal(s.layout(music, { octave: 0 }).length, 48)
    assert.equal(s.layout(music, { octave: 0 })[0].midi % 12, 0)
  } finally { s.shape = shape }
})

test('Cordas soltas: under the start the flat, past the end the sharp, in the middle the harmonic', () => {
  const { STRINGS_SCALE, stringShift } = loadTs('lib/pigchicken/instrument-scales.ts')
  const s = STRINGS_SCALE, music = createConductor(), a = s.angleOf(7) // the C in the middle (60)
  const q = reach => ({ angle: a, reach, set: 'scale', octave: 0, span: 2 })
  assert.equal(s.touch(a, 0.1).zone, 'flat')
  assert.equal(s.touch(a, 0.4).zone, 'string')
  assert.equal(s.touch(a, 0.55).zone, 'harmonic')
  assert.equal(s.touch(a, 0.58).zone, 'harmonic')
  assert.equal(s.touch(a, 0.62).zone, 'string')
  assert.equal(s.touch(a, 0.95).zone, 'sharp')
  assert.equal(s.noteFor(music, q(0.4)), 60)
  assert.equal(s.noteFor(music, q(0.1)), 59)
  assert.equal(s.noteFor(music, q(0.95)), 61)
  assert.equal(s.noteFor(music, q(0.55)), 72)
  assert.deepEqual(['flat', 'string', 'harmonic', 'sharp'].map(stringShift), [-1, 0, 12, 1])
})

test('Cordas soltas: the zone\'s key tunes the strings like a harp\'s pedals', () => {
  const { stringTuning } = loadTs('lib/pigchicken/instrument-scales.ts')
  // letters C D E F G A B; semitones over the natural note
  assert.deepEqual(stringTuning({ root: 0, chordScale: 'major' }), [0, 0, 0, 0, 0, 0, 0])
  assert.deepEqual(stringTuning({ root: 7, chordScale: 'major' }), [0, 0, 0, 1, 0, 0, 0]) // G: F♯
  assert.deepEqual(stringTuning({ root: 5, chordScale: 'major' }), [0, 0, 0, 0, 0, 0, -1]) // F: B♭
  assert.deepEqual(stringTuning({ root: 9, chordScale: 'minor' }), [0, 0, 0, 0, 0, 0, 0]) // A minor
  assert.deepEqual(stringTuning({ root: 2, chordScale: 'major' }), [1, 0, 0, 1, 0, 0, 0]) // D: F♯ C♯
  assert.deepEqual(stringTuning({ root: 3, chordScale: 'major' }), [0, 0, -1, 0, 0, -1, -1]) // E♭: B♭ E♭ A♭
})

test('Cordas soltas, a hand: the press plucks, the drag plucks every string it enters, the slide lands on the semitone', () => {
  const { newStringHand, stepStringHand, stringSlide, stringAlong, SWEEP_MAX } = loadTs('lib/pigchicken/strings-play.ts')
  const hand = newStringHand()
  assert.deepEqual(stepStringHand(hand, 4, false, false, 22), [])
  assert.deepEqual(stepStringHand(hand, 4, true, true, 22), [4])
  assert.deepEqual(stepStringHand(hand, 4, true, false, 22), [])
  // a fast aim: the strings in between too, in the order it crossed them
  assert.deepEqual(stepStringHand(hand, 7, true, false, 22), [5, 6, 7])
  assert.deepEqual(stepStringHand(hand, 5, true, false, 22), [6, 5])
  // over the seam, the shorter way around
  hand.on = 1
  assert.deepEqual(stepStringHand(hand, 20, true, false, 22), [0, 21, 20])
  // pressing again on the same string plucks it again; letting go lifts the hand
  assert.deepEqual(stepStringHand(hand, 20, true, true, 22), [20])
  assert.deepEqual(stepStringHand(hand, 20, false, false, 22), [])
  assert.equal(hand.on, -1)
  // a jump of the aim: only the last strings before where it lands
  hand.on = 0
  const jump = stepStringHand(hand, 23, true, false, 48)
  assert.equal(jump.length, SWEEP_MAX)
  assert.equal(jump[jump.length - 1], 23)
  // the glissando: from the place of the pluck, exactly a semitone at each end of the string, never a jump
  const slide = (from, r0, r) => stringSlide(from, r0, r, 0.25, 0.85)
  assert.equal(slide(0, 0.4, 0.4), 0)
  assert.equal(slide(0, 0.4, 0.85), 1)
  assert.equal(slide(0, 0.4, 1), 1)
  assert.equal(slide(0, 0.4, 0.25), -1)
  assert.equal(slide(0, 0.4, 0), -1)
  assert.ok(Math.abs(slide(0, 0.4, 0.625) - 0.5) < 1e-9)
  // plucked under the start (the flat) or past the end (the sharp): it starts there and goes to the other end
  assert.equal(slide(-1, 0.1, 0.1), -1)
  assert.equal(slide(-1, 0.1, 0.85), 1)
  assert.equal(slide(1, 0.95, 0.95), 1)
  assert.equal(slide(1, 0.95, 0.25), -1)
  assert.equal(stringAlong(0.25, 0.25, 0.85), 0)
  assert.equal(stringAlong(0.85, 0.25, 0.85), 1)
})

test('Cordas soltas in the hands: each string its own note, the same string twice cuts the first, the drag slides it', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const { STRINGS_SCALE } = loadTs('lib/pigchicken/instrument-scales.ts')
  const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const items = structuredClone(DEFAULT_ITEMS); items.harp.scales = ['strings']; items.harp.quantize = false; items.harp.volMin = 0.5; items.harp.volMax = 1
  const c = createCombat(); c.setItems(items)
  const plucked = []
  c.setMusicOut({ note() {}, hold: () => null, drum() {}, pluck: (voice, midi, at, dur, vel) => { const n = { voice, midi, at, vel, stopped: null, pitch: null }; n.held = { setPitch: m => { n.pitch = m }, stop: f => { n.stopped = f } }; plucked.push(n); return n.held } })
  c.give('harp')
  const s = STRINGS_SCALE
  const step = (index, reach, fire, pressed) => { c.setAimReach(reach, 'point'); c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, s.angleOf(index), { fire, firePressed: pressed, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }, [], 1000, () => {}) }
  step(7, 0.4, false, false)
  assert.equal(plucked.length, 0)
  // toque: the string under the aim, no magazine spent, its note flying off along the string
  step(7, 0.4, true, true)
  assert.equal(plucked.length, 1)
  assert.deepEqual([plucked[0].voice, plucked[0].midi], ['harp', 60])
  assert.equal(c.bullets.length, 1)
  assert.equal(c.held.ammo, DEFAULT_ITEMS.harp.mag)
  assert.ok(c.stringAge(7) < 0.1 && c.stringAge(8) === Infinity)
  // glissando: Atirar still held, the aim going to the string's end: exactly a semitone up
  step(7, 0.85, true, false)
  assert.equal(plucked[0].pitch, 61)
  step(7, 0.25, true, false)
  assert.equal(plucked[0].pitch, 59)
  // arpejo: the aim dragged over the next strings plucks each one
  step(9, 0.4, true, false)
  assert.deepEqual(plucked.slice(1).map(n => n.midi), [62, 64])
  assert.ok(plucked[2].at > plucked[1].at)
  assert.equal(c.bullets.length, 3)
  step(9, 0.4, false, false)
  // the same string again: the first note stops and its note in flight goes away
  step(7, 0.4, true, true)
  assert.equal(plucked.length, 4)
  assert.ok(plucked[0].stopped > 0 && plucked[0].stopped < 0.1)
  assert.equal(plucked[1].stopped, null)
  assert.equal(c.bullets.length, 3)
  step(7, 0.4, false, false)
  // the harmonic (its own voice, an octave up), the flat under the start and the sharp past the end
  step(7, 0.55, true, true); step(7, 0.55, false, false)
  assert.deepEqual([plucked[4].voice, plucked[4].midi], ['harpHarmonic', 72])
  step(7, 0.1, true, true); step(7, 0.1, false, false)
  assert.equal(plucked[5].midi, 59)
  step(7, 0.95, true, true); step(7, 0.95, false, false)
  assert.equal(plucked[6].midi, 61)
  // the loudness follows the place along the string: softer near her, full at the tip
  assert.ok(plucked[5].vel < plucked[0].vel && plucked[0].vel < plucked[6].vel)
  assert.ok(Math.abs(plucked[5].vel / plucked[6].vel - 0.5) < 1e-9)
  // the keys (no distance) always play the plain note; a stick pushed all the way too
  c.setAimReach(1, 'none'); assert.equal(s.touch(0, c.stringReach).zone, 'string')
  c.setAimReach(1, 'stick'); assert.equal(s.touch(0, c.stringReach).zone, 'string')
  c.setAimReach(1, 'point'); assert.equal(s.touch(0, c.stringReach).zone, 'sharp')
})

test('Tremolo: reage a "movimento ao longo da corda" bends the note with the aim\'s distance, not its turn', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const body = { x: 0, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }
  const items = structuredClone(DEFAULT_ITEMS); items.violin.tremoloAxis = 'along'; items.violin.tremolo = 1; items.violin.tremoloRange = 2; items.violin.arp = 'off'
  const c = createCombat(); c.setItems(items)
  const pitches = []
  c.setMusicOut({ note() {}, hold: (v, midi) => { pitches.push(midi); return { stop() {}, setPitch: m => pitches.push(m), setVolume() {} } }, drum() {} })
  c.give('violin')
  const step = (reach, pressed) => { c.setAimReach(reach, 'point'); c.step(0.016, body, { x: 0, y: 0 }, { x: 0, y: 0 }, 0, { fire: true, firePressed: pressed, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0 }, [], 1000, () => {}) }
  step(0.5, true); step(0.5, false)
  const base = pitches[0]
  step(0.75, false); step(0.75, false)
  assert.ok(Math.abs(pitches[pitches.length - 1] - (base + 1)) < 1e-9)
  step(0.25, false); step(0.25, false)
  assert.ok(Math.abs(pitches[pitches.length - 1] - (base - 1)) < 1e-9)
  assert.equal(DEFAULT_ITEMS.violin.tremoloAxis, 'turn')
})

// ---------- Harpa (instrumento fixo) ----------
test('Harpa fixa: Pegar next to it sits, only the aim and Atirar count, Pegar again gets up; one player at a time', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const { STRINGS_SCALE } = loadTs('lib/pigchicken/instrument-scales.ts')
  const F = loadTs('lib/pigchicken/fixed-instruments.ts')
  const c = createCombat(); c.setItems(structuredClone(DEFAULT_ITEMS))
  const plucked = []
  c.setMusicOut({ note() {}, hold: () => null, drum() {}, pluck: (voice, midi) => { plucked.push({ voice, midi }); return { setPitch() {}, stop() {} } } })
  c.give('flute')
  const seat = c.addSeat('h1', 'pedalharp', 500, 0, 1)
  const spot = F.seatSpot(seat)
  assert.deepEqual(spot, { x: 500 - F.FIXED_INSTRUMENTS.pedalharp.stool, y: 0 })
  const ctl = o => ({ fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...o })
  const step = (x, o = {}, state = 'idle') => c.step(0.016, { x, y: 0, face: 1, scale: 1, grounded: true, state, vx: 0 }, { x, y: -60 }, { x, y: -60 }, STRINGS_SCALE.angleOf(7), ctl(o), [], 0, () => {})
  // far away: nothing to sit at
  step(0)
  assert.equal(c.seatNear, null)
  step(0, { grab: true })
  assert.equal(c.seated, null)
  // next to the stool: it is offered; Correr's own key does not sit, Pegar does
  step(spot.x + 10)
  assert.equal(c.seatNear, seat)
  step(spot.x + 10, { grab: true, grabRun: true })
  assert.equal(c.seated, null)
  step(spot.x + 10, { grab: true })
  assert.equal(c.seated, seat)
  assert.equal(seat.by, 'p1')
  // she holds the Harpa (never in the inventory), on the Cordas soltas
  assert.equal(c.held.item, 'pedalharp')
  assert.equal(c.scale.id, 'strings')
  assert.deepEqual(c.inventory.filter(Boolean).map(o => o.item), ['flute'])
  assert.equal(DEFAULT_ITEMS.pedalharp.voice, 'pedalHarp')
  assert.equal(F.isFixedItem('pedalharp'), true)
  assert.equal(F.isFixedItem('harp'), false)
  // Atirar plucks; switching items, Golpe, Arremesso and Recarregar do nothing
  c.setAimReach(0.4, 'point')
  step(spot.x, { fire: true, firePressed: true })
  assert.deepEqual(plucked, [{ voice: 'pedalHarp', midi: 60 }])
  step(spot.x, { pick: 1, slot: 1, melee: true, throwHeld: true, reload: true })
  assert.equal(c.held.item, 'pedalharp')
  assert.equal(c.swing, null)
  assert.equal(c.throwCharge, 0)
  // another player cannot take the same seat
  c.use('p2')
  step(spot.x + 5)
  assert.equal(c.seatNear, null)
  step(spot.x + 5, { grab: true })
  assert.equal(c.seated, null)
  c.use('p1')
  // Pegar again gets her up, with her own item back; the same press does not sit again
  step(spot.x, { grab: true })
  assert.equal(c.seated, null)
  assert.equal(seat.by, null)
  assert.equal(c.held.item, 'flute')
  // the screen gets her up too (Pular, a blast, being dragged), and so does the Harpa leaving the Pátio
  step(spot.x, { grab: true })
  assert.equal(c.seated, seat)
  c.standUp()
  assert.equal(c.seated, null)
  step(spot.x, { grab: true })
  c.seats.splice(0, 1)
  step(spot.x)
  assert.equal(c.seated, null)
  // nobody carries it: it is on no rack and in no shelf
  const items = loadTs('lib/pigchicken/items.ts')
  assert.ok(!items.RACK_ITEM_IDS.includes('pedalharp') && !items.INSTRUMENT_IDS.includes('pedalharp') && items.ITEM_IDS.includes('pedalharp'))
})

test('Harpa fixa, two hands: the back hand first and the front one after the hands\' delay; each drags on its own; Correr is the sharp; a finger is its own pluck', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const { STRINGS_SCALE: S } = loadTs('lib/pigchicken/instrument-scales.ts')
  const F = loadTs('lib/pigchicken/fixed-instruments.ts')
  const { HAND_DELAYS } = loadTs('lib/pigchicken/items.ts')
  const items = structuredClone(DEFAULT_ITEMS)
  const c = createCombat(); c.setItems(items)
  const plucked = []
  let t = 0
  c.setMusicOut({ note() {}, hold: () => null, drum() {}, pluck: (voice, midi, at) => { plucked.push({ midi, t: t + at }); return { setPitch() {}, stop() {} } } })
  const seat = c.addSeat('h1', 'pedalharp', 500, 0, 1), spot = F.seatSpot(seat)
  const ctl = o => ({ fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...o })
  const step = (o = {}) => { c.step(0.016, { x: spot.x, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }, { x: spot.x, y: -60 }, { x: spot.x, y: -60 }, 0, ctl(o), [], 0, () => {}); t += 0.016 }
  step(); step({ grab: true })
  assert.equal(c.seated, seat)
  const midi = i => S.layout(c.music, { octave: items.pedalharp.octave })[i].midi
  const stick = (i, o = {}) => ({ angle: S.angleOf(i), reach: 1, kind: 'stick', ...o })
  const hold = n => { for (let k = 0; k < n; k++) step({ fire: true }) }
  const lift = () => { step(); plucked.length = 0 }
  assert.deepEqual(HAND_DELAYS.map(h => h.value), [0, 0.125, 0.25, 0.5, 1])
  assert.equal(items.pedalharp.handDelay, 0.125)
  const delay = 0.125 * c.music.secondsPerBeat()
  // pressed together: the back hand's string now, the front hand's a fusa later
  c.setStringHands([stick(7), stick(3)])
  assert.deepEqual(c.stringHands.map(h => S.stringAt(h.angle)), [7, 3])
  const t0 = t
  step({ fire: true, firePressed: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(3)])
  hold(Math.ceil(delay / 0.016) + 2)
  assert.deepEqual(plucked.map(p => p.midi), [midi(3), midi(7)])
  assert.ok(Math.abs(plucked[1].t - t0 - delay) < 1e-6)
  // dragging: each hand plucks at once the string it goes into, the other one stays
  plucked.length = 0
  c.setStringHands([stick(7), stick(4)]); step({ fire: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(4)])
  c.setStringHands([stick(8), stick(4)]); step({ fire: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(4), midi(8)])
  // the two hands on the same string pluck it once
  lift()
  c.setStringHands([stick(5), stick(5)]); step({ fire: true, firePressed: true }); hold(12)
  assert.deepEqual(plucked.map(p => p.midi), [midi(5)])
  // a stick at rest is a hand off the strings: one hand alone has no delay
  lift()
  c.setStringHands([stick(6), null]); step({ fire: true, firePressed: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(6)])
  lift()
  c.setStringHands([null, null]); step({ fire: true, firePressed: true })
  assert.equal(plucked.length, 0)
  // "Juntas": both in the same frame, the back hand's still first
  lift()
  items.pedalharp.handDelay = 0; c.setItems(items)
  c.setStringHands([stick(9), stick(2)]); step({ fire: true, firePressed: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(2), midi(9)])
  // Correr held: a stick or the keys pluck past the strings' end (the sharp); without it, the plain note
  lift()
  c.setStringHands([stick(6, { sharp: true }), null]); step({ fire: true, firePressed: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(6) + 1])
  lift()
  c.setStringHands([{ angle: S.angleOf(6), reach: 1, kind: 'none', sharp: true }, null]); step({ fire: true, firePressed: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(6) + 1])
  lift()
  c.setStringHands([{ angle: S.angleOf(6), reach: 1, kind: 'none' }, null]); step({ fire: true, firePressed: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(6)])
  // a finger on the screen is a hand with its own pluck (the second finger lands while the first is held)
  lift()
  const finger = (i, pressed) => ({ angle: S.angleOf(i), reach: 0.5, kind: 'point', fire: true, pressed })
  c.setStringHands([finger(10, true), null]); step({ fire: true })
  c.setStringHands([finger(10, false), finger(12, true)]); step({ fire: true })
  assert.deepEqual(plucked.map(p => p.midi), [midi(10), midi(12)])
  // getting up gives the aim back to the one hand
  step({ grab: true })
  assert.equal(c.seated, null)
  assert.equal(c.stringHands[1], null)
})

test('Harpa fixa online: another browser\'s seated chicken holds the seat here; two that sat at once, the first browser keeps it', () => {
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const F = loadTs('lib/pigchicken/fixed-instruments.ts')
  const P = loadTs('lib/chicken/net-protocol.ts')
  // the seated pose travels with the chicken's state (an older browser shows her standing still)
  assert.equal(P.stateName(P.stateByte('seat')), 'seat')
  assert.equal(P.NET_STATES[P.NET_STATES.length - 1], 'seat')
  const c = createCombat(); c.setItems(structuredClone(DEFAULT_ITEMS))
  c.setMusicOut({ note() {}, hold: () => null, drum() {} })
  const seat = c.addSeat('h1', 'pedalharp', 500, 0, 1), spot = F.seatSpot(seat)
  const ctl = o => ({ fire: false, firePressed: false, melee: false, throwHeld: false, throwReleased: false, reload: false, pick: 0, slot: 0, ...o })
  const step = (o = {}) => c.step(0.016, { x: spot.x, y: 0, face: 1, scale: 1, grounded: true, state: 'idle', vx: 0 }, { x: spot.x, y: -60 }, { x: spot.x, y: -60 }, 0, ctl(o), [], 0, () => {})
  // someone from another browser sits there: no seat offered, Pegar does not sit
  c.setNetSeated([{ x: spot.x + 4, y: spot.y - 2, first: false }])
  assert.equal(seat.net, true)
  step(); assert.equal(c.seatNear, null)
  step({ grab: true }); assert.equal(c.seated, null)
  // a seated chicken somewhere else does not hold this seat
  c.setNetSeated([{ x: spot.x + 300, y: spot.y, first: true }])
  assert.equal(seat.net, false)
  step(); step({ grab: true })
  assert.equal(c.seated, seat)
  // both sat at the same time: the browser that comes after keeps sitting only if the other one is not first
  c.setNetSeated([{ x: spot.x, y: spot.y, first: false }])
  step(); assert.equal(c.seated, seat)
  c.setNetSeated([{ x: spot.x, y: spot.y, first: true }])
  step(); assert.equal(c.seated, null)
  assert.equal(seat.by, null)
  // offline again: the seat is free
  c.setNetSeated([])
  assert.equal(seat.net, false); assert.equal(seat.yield, false)
})

test('Harpa fixa in the layout: an element of fixed size in Música; the sync puts its seat in the world and takes it away', () => {
  const L = loadTs('lib/pigchicken/layout.ts')
  const F = loadTs('lib/pigchicken/fixed-instruments.ts')
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  const { createLayoutSync } = loadTs('lib/pigchicken/layout-sync.ts')
  const el = L.createElement('pedalharp', 400, 300)
  assert.deepEqual({ w: el.w, h: el.h }, F.HARP_BOX)
  assert.equal(L.ELEMENT_DEFS.pedalharp.group, 'Música')
  assert.equal(L.ELEMENT_DEFS.pedalharp.resizable, false)
  assert.equal(el.params.flip, false)
  const c = createCombat(), sync = createLayoutSync(c)
  const put = L.normalizeElement({ kind: 'pedalharp', id: 'harp-1', x: 300, y: 930 - F.HARP_BOX.h, params: { flip: true } })
  assert.equal(put.params.flip, true)
  sync.sync([put], 8)
  assert.equal(c.seats.length, 1)
  assert.deepEqual({ x: c.seats[0].x, y: c.seats[0].y, face: c.seats[0].face, by: c.seats[0].by }, { x: 300 + F.HARP_BOX.w / 2, y: 930, face: -1, by: null })
  // turned the other way, its player sits on its right
  assert.equal(F.seatSpot(c.seats[0]).x, c.seats[0].x + F.FIXED_INSTRUMENTS.pedalharp.stool)
  // moved in the editor: the same seat, there
  sync.sync([{ ...put, x: 500, params: { flip: false } }], 8)
  assert.equal(c.seats.length, 1)
  assert.equal(c.seats[0].x, 500 + F.HARP_BOX.w / 2)
  assert.equal(c.seats[0].face, 1)
  sync.sync([], 8)
  assert.equal(c.seats.length, 0)
})

test('Harpa fixa in the example Pátios: the default Pátio has it on a floating island (an older one gets it once); the Training room has one on the floor', () => {
  const L = loadTs('lib/pigchicken/layout.ts')
  const F = loadTs('lib/pigchicken/fixed-instruments.ts')
  const { WORLD_GROUND_Y: G, SCENE_PLATFORMS } = loadTs('lib/pigchicken/world.ts')
  const def = L.defaultLayout()
  const island = def.elements.find(e => e.id === 'harp-island'), harp = def.elements.find(e => e.kind === 'pedalharp')
  assert.equal(L.LAYOUT_VERSION, 11)
  assert.equal(island.kind, 'ground'); assert.equal(island.hard, true); assert.equal(island.params.surface.style, 'meadow')
  // it floats between the two high platforms of the portals, a step under them, and the Harpa stands on its flat top
  const [shelf, , a, b] = SCENE_PLATFORMS[0]
  assert.ok(island.x > a.x + a.w && island.x + island.w < b.x)
  assert.ok(island.y > G - a.bottom - a.h && island.y - (G - a.bottom - a.h) <= 80)
  // the whole Harpa shows from the floor on a desktop screen (some 840 px over the floor), and there is room to
  // walk on the instruments' shelf under the island
  assert.ok(G - harp.y <= 810)
  assert.ok((G - shelf.bottom - shelf.h) - (island.y + island.h) >= 150)
  assert.equal(harp.y + harp.h, island.y)
  assert.deepEqual([harp.w, harp.h], [F.HARP_BOX.w, F.HARP_BOX.h])
  const spot = F.seatSpot({ kind: 'pedalharp', x: harp.x + harp.w / 2, y: harp.y + harp.h, face: 1 })
  assert.ok(spot.x > island.x + island.w * 0.07 + 40 && spot.x < island.x + island.w * 0.93)
  assert.equal(L.layoutFloorBelow(def.elements, spot.x, island.y - 50), island.y)
  // a default Pátio saved before it gets the island and the Harpa once; another Pátio does not; taken off since, it stays off
  const old = { v: 8, elements: def.elements.filter(e => !e.id.startsWith('harp')) }
  const harps = n => n.elements.filter(e => e.kind === 'pedalharp' || e.id === 'harp-island').length
  assert.equal(harps(L.normalizeLayout(JSON.parse(JSON.stringify(old)), true)), 2)
  assert.equal(harps(L.normalizeLayout(JSON.parse(JSON.stringify(old)), false)), 0)
  assert.equal(harps(L.normalizeLayout({ ...JSON.parse(JSON.stringify(old)), v: 10 }, true)), 0)
  // one saved with the island where v9 had it (800 over the floor, the Harpa cut by the top of the view): untouched,
  // the island and the Harpa come down; moved by hand, or in another Pátio, they stay
  const high = { ...island, y: G - 800, h: 120 }, highHarp = { ...harp, y: G - 800 - F.HARP_BOX.h }
  const v9 = extra => ({ v: 9, elements: [...old.elements, high, { ...highHarp, ...extra }] })
  const place = n => [n.elements.find(e => e.id === 'harp-island').y, n.elements.find(e => e.id === 'harp').y]
  assert.deepEqual(place(L.normalizeLayout(JSON.parse(JSON.stringify(v9())), true)), [island.y, harp.y])
  assert.deepEqual(place(L.normalizeLayout(JSON.parse(JSON.stringify(v9())), false)), [high.y, highHarp.y])
  assert.deepEqual(place(L.normalizeLayout(JSON.parse(JSON.stringify(v9({ x: harp.x + 40 }))), true)), [high.y, highHarp.y])
  // one that already has a Harpa somewhere keeps only that one
  const own = { v: 8, elements: [...old.elements, { id: 'mine', kind: 'pedalharp', x: 3000, y: G - F.HARP_BOX.h }] }
  assert.equal(harps(L.normalizeLayout(JSON.parse(JSON.stringify(own)), true)), 1)
  // the Training room: one on the floor at the end
  const training = loadTs('lib/pigchicken/example-training.ts').trainingLayout()
  const th = training.elements.filter(e => e.kind === 'pedalharp')
  assert.equal(th.length, 1)
  assert.equal(th[0].y + th[0].h, G)
})

test('Escalas panel preview: the held instrument when it plays the scale, else the first one that lists it; the Pátio\'s conductor while one runs', () => {
  const { previewInstrument, scaleStage, setScaleStage, dropScaleStage } = loadTs('lib/pigchicken/scale-preview.ts')
  assert.equal(previewInstrument(DEFAULT_ITEMS, 'primary', null).id, INSTRUMENT_IDS[0])
  // a held instrument on that scale wins; one that does not play it (or a weapon) does not
  assert.equal(previewInstrument(DEFAULT_ITEMS, 'spiral', 'guitar').id, 'guitar')
  assert.equal(previewInstrument(DEFAULT_ITEMS, 'hang', 'guitar').id, 'hangdrum')
  assert.equal(previewInstrument(DEFAULT_ITEMS, 'primary', 'pistol').id, INSTRUMENT_IDS[0])
  assert.equal(previewInstrument(DEFAULT_ITEMS, 'strings', null).scales.includes('strings'), true)
  // no Pátio: a conductor of its own; a Pátio's while it runs, and gone only when that same Pátio closes
  const own = scaleStage(), a = createConductor(), b = createConductor()
  assert.equal(scaleStage(), own)
  setScaleStage(a); assert.equal(scaleStage(), a)
  setScaleStage(b); dropScaleStage(a); assert.equal(scaleStage(), b)
  dropScaleStage(b); assert.equal(scaleStage(), own)
})

test('Escalas layer and the panel\'s preview share one drawing: every scale draws its labels, lit cell or not, and the layer still draws an instrument on each', () => {
  const { drawScaleFan, drawScaleShape } = loadTs('components/pigchicken/draw/scale-fan.ts')
  const { createCombat } = loadTs('lib/pigchicken/combat.ts')
  // a canvas that only counts what is drawn
  const canvas = () => {
    const seen = { text: [], fills: 0, strokes: 0 }
    const ctx = new Proxy({}, { get: (_, k) => k === 'fillText' ? (t => { seen.text.push(t) }) : k === 'fill' ? (() => { seen.fills++ }) : k === 'stroke' ? (() => { seen.strokes++ }) : k === 'createRadialGradient' ? (() => ({ addColorStop() {} })) : () => {}, set: () => true })
    return { ctx, seen }
  }
  const music = createConductor(), d = DEFAULT_ITEMS.flute
  const q = aim => ({ set: d.pitchSet, octave: d.octave, span: d.span, descending: false, hang: { rows: 1, notes: 8, notes2: 7 }, aim, reach: 1, fade: 0, still: true })
  for (const id of ['primary', 'fifths', 'tension', 'spiral', 'harmonic', 'hang']) {
    for (const aim of [null, UP]) {
      const c = canvas()
      drawScaleShape(c.ctx, INSTRUMENT_SCALES[id], music, q(aim), 100, 100, 90)
      assert.ok(c.seen.text.length >= 5 && c.seen.fills >= 5, `${id} draws its cells and labels`)
    }
  }
  // the Cordas soltas: every string a line; only an aim writes a note (the aimed string's)
  const idle = canvas(), aimed = canvas(), n = INSTRUMENT_SCALES.strings.count
  drawScaleShape(idle.ctx, INSTRUMENT_SCALES.strings, music, q(null), 100, 100, 90)
  drawScaleShape(aimed.ctx, INSTRUMENT_SCALES.strings, music, q(UP), 100, 100, 90)
  assert.ok(idle.seen.strokes >= n)
  assert.deepEqual(idle.seen.text, [])
  assert.equal(aimed.seen.text.length, 1)
  // the Pátio's layer: an instrument in hand draws its scale; empty-handed, nothing
  const combat = createCombat(), layer = canvas(), none = canvas()
  drawScaleFan(none.ctx, combat, 0, 0, UP)
  assert.equal(none.seen.fills + none.seen.text.length, 0)
  combat.give('flute'); combat.setAimReach(1)
  drawScaleFan(layer.ctx, combat, 0, 0, UP)
  assert.ok(layer.seen.text.length >= 3 && layer.seen.fills >= 3)
  combat.give('hangdrum')
  const hang = canvas()
  drawScaleFan(hang.ctx, combat, 0, 0, UP)
  assert.ok(hang.seen.text.length >= 9)
})
