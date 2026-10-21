const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { calculateCrossfaderPosition, teamGainsForCrossfader } = loadTs('lib/music/team-mixer.ts')
const { voiceSpecs, renderMusicCode, compileVoice } = loadTs('lib/music/runtime.ts')
const state = (history = []) => ({ pieces: model.piecesFromHistory(history), scale: ['C4','Eb4','F4','G4','Bb4'], bpm: 118, volume: 0.8, playing: true, effects: {} })

test('all 32 instruments start inactive, no hidden accompaniment', () => {
  const s = state()
  assert.equal(s.pieces.length, 32)
  assert.equal(voiceSpecs(s, null).length, 0)
})

test('audition of inactive piece does not activate it or change the board', () => {
  const s = state()
  const voices = voiceSpecs(s, { id: 'w:b1', square: 'e4' })
  assert.equal(voices.length, 1)
  assert.equal(voices[0].preview, true)
  assert.equal(s.pieces.find(p => p.id === 'w:b1').square, 'b1')
  assert.equal(voiceSpecs(s, null).length, 0)
})

test('an active audition replaces its loop, then restores it', () => {
  const s = state(['Nf3'])
  const before = voiceSpecs(s, null)
  assert.equal(voiceSpecs(s, { id: 'w:b1', square: 'c3' }).length, 2)
  const preview = voiceSpecs(s, { id: 'w:g1', square: 'g5' })
  assert.equal(preview.length, 1)
  assert.equal(preview[0].preview, true)
  assert.deepEqual(voiceSpecs(s, null), before)
})

test('capture preserves attacker identity and instrument across files', () => {
  const s = state(['e4', 'd5', 'exd5'])
  assert.equal(s.pieces.length, 31)
  assert.equal(s.pieces.some(p => p.id === 'b:d7'), false)
  const pawn = s.pieces.find(p => p.id === 'w:e2')
  assert.equal(pawn.square, 'd5')
  assert.equal(model.instrumentFor(pawn).name, 'Tom')
  assert.equal(voiceSpecs(s, null).length, 1)
})

test('en passant removes the captured voice on its actual square', () => {
  const s = state(['e4','a6','e5','d5','exd6'])
  assert.equal(s.pieces.some(p => p.id === 'b:d7'), false)
  assert.equal(s.pieces.find(p => p.id === 'w:e2').square, 'd6')
})

test('castling activates and relocates both identities', () => {
  const s = state(['e4','e5','Nf3','Nc6','Bc4','Bc5','O-O'])
  assert.equal(s.pieces.find(p => p.id === 'w:e1').square, 'g1')
  const rook = s.pieces.find(p => p.id === 'w:h1')
  assert.equal(rook.square, 'f1')
  assert.equal(rook.active, true)
})

test('promotion keeps the pawn identity and switches its instrument role', () => {
  const s = state(['a4', 'h5', 'a5', 'h4', 'a6', 'h3', 'axb7', 'hxg2', 'bxa8=Q'])
  const promoted = s.pieces.find(p => p.id === 'w:a2')
  assert.equal(promoted.square, 'a8')
  assert.equal(promoted.type, 'q')
  assert.equal(promoted.active, true)
  assert.equal(model.instrumentFor(promoted).name, 'Melodia principal')
  assert.equal(s.pieces.some(p => p.id === 'b:a8'), false)
})

test('history rebuild restores captured voice and activation on undo/redo', () => {
  const history = ['e4','d5','exd5']
  assert.equal(state(history.slice(0, 2)).pieces.find(p => p.id === 'b:d7').active, true)
  assert.deepEqual(state(history), state([...history]))
})

test('degrees wrap through the shared scale, including negative degrees and roots crossing C', () => {
  assert.equal(model.degreeToMidi(-1, ['C4','D4','E4','F4','G4','A4','B4'], 4), 59)
  assert.equal(model.degreeToMidi(3, ['G4','A4','B4','C5','D5'], 4), 72)
})

test('explicit pulse timing survives MIDI conversion; identity effects survive moves', async () => {
  const s = state(['c4'])
  s.effects['w:c2'] = { gain: 0.5, pitch: 1, pan: 0, delay: 0, reverb: 0, decay: 0.1 }
  const voice = voiceSpecs(s, null)[0]
  assert.deepEqual(voice.pianoRolls[0].notes.map(note => note.start), [0,.125,.25,.375,.5,.625,.75,.875])
  assert.ok(voice.pianoRolls[0].notes.every(note => note.degree === 36))
  assert.equal(voice.controls.gain, 0.125)
  const api = await strudel()
  const events = compileVoice(api, voice).queryArc(0, 1).filter(h => h.hasOnset())
  assert.equal(events.length, 8)
  assert.ok(events.every(h => h.value.note === 36 && h.value.gain === .125))
  assert.match(renderMusicCode(s, null), /\.velocity\(/)
})

test('pause silences accompaniment but still allows temporary audition', () => {
  const s = { ...state(['e4']), playing: false }
  assert.equal(voiceSpecs(s, null).length, 0)
  assert.equal(voiceSpecs(s, {id:'w:e2', square:'e4'}).length, 1)
})

test('crossfader position alternates per turn and reflects player chance depth', () => {
  // 50% chance: top turn is -0.5, bottom turn is +0.5
  assert.equal(calculateCrossfaderPosition({ score: 0, mate: null, turn: 'b', topColor: 'b' }), -0.5)
  assert.equal(calculateCrossfaderPosition({ score: 0, mate: null, turn: 'w', topColor: 'b' }), 0.5)
  assert.equal(calculateCrossfaderPosition({ score: null, mate: null, turn: 'b', topColor: 'b' }), -0.5)
  assert.equal(calculateCrossfaderPosition({ score: null, mate: null, turn: 'w', topColor: 'b' }), 0.5)

  // 100% chance for top team (mate for black, topColor 'b'): top turn is -1.0, bottom turn is 0.0
  assert.equal(calculateCrossfaderPosition({ score: -1000, mate: -1, turn: 'b', topColor: 'b' }), -1.0)
  assert.equal(calculateCrossfaderPosition({ score: -1000, mate: -1, turn: 'w', topColor: 'b' }), 0.0)

  // 100% chance for bottom team (mate for white, topColor 'b'): bottom turn is +1.0, top turn is 0.0
  assert.equal(calculateCrossfaderPosition({ score: 1000, mate: 1, turn: 'w', topColor: 'b' }), 1.0)
  assert.equal(calculateCrossfaderPosition({ score: 1000, mate: 1, turn: 'b', topColor: 'b' }), 0.0)

  // Inverted orientation (topColor 'w'): white is top, black is bottom
  assert.equal(calculateCrossfaderPosition({ score: 1000, mate: 1, turn: 'w', topColor: 'w' }), -1.0)
  assert.equal(calculateCrossfaderPosition({ score: 1000, mate: 1, turn: 'b', topColor: 'w' }), 0.0)

  // teamGainsForCrossfader matches end gains
  const centerGains = teamGainsForCrossfader(0)
  assert.equal(centerGains.left, 0.75)
  assert.equal(centerGains.right, 0.75)

  const topGains = teamGainsForCrossfader(-1)
  assert.equal(topGains.left, 1.5)
  assert.equal(topGains.right, 0)

  const bottomGains = teamGainsForCrossfader(1)
  assert.equal(bottomGains.left, 0)
  assert.equal(bottomGains.right, 1.5)
})

