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
    assert.deepEqual(DEFAULT_ITEMS[id].scales, ['primary', 'fifths', 'tension', 'spiral', 'harmonic'])
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
