const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')
const { createCreativeSession } = loadTs('lib/music/creative.ts')
const { combineOnlineKits } = loadTs('lib/music/online-kit.ts')

function kit(name, sound, degree) {
  const value = createCreativeSession()
  value.name = name
  for (const piece of value.pieces) {
    const instrument = value.instruments[piece.id]
    instrument.name = `${name} ${piece.id}`
    instrument.sound = sound
    instrument.pianoRolls = [
      { bars: 1, notes: [{ start: 0, duration: .25, degree, velocity: .7 }] },
      { bars: 2, notes: [{ start: .5, duration: .5, degree: degree + 1, velocity: .8 }] },
    ]
    instrument.arrangement = {
      restart: piece.color === 'b',
      sections: {
        [`${name}-a`]: { variation: 1, transpose: degree },
        [`${name}-b`]: { variation: null, transpose: -degree },
      },
    }
    value.effects[piece.id] = { gain: piece.color === 'w' ? .4 : .6, pitch: 1, pan: degree / 10, delay: .1, reverb: .2, decay: .3 }
    value.mappings[piece.id] = { fileDegrees: degree, rankDegrees: 0, panWidth: .2, previewFilter: true }
  }
  value.arrangement = { sections: [
    { id: `${name}-a`, label: 'Verse', beats: 3 },
    { id: `${name}-b`, label: 'Chorus', beats: 5 },
  ] }
  return value
}

test('online kit keeps the host context and maps both team voices onto its section ids', () => {
  const white = kit('white-city', 'triangle', 2)
  const black = kit('black-city', 'square', -2)
  const host = kit('host-city', 'sine', 0)
  host.root = 'F#'
  host.scale = 'Dórica'
  host.harmony = 'circle'
  host.meter = '7/8'
  host.arrangement = { sections: [
    { id: 'host-intro', label: 'Intro', beats: 7, harmony: [0, 3] },
    { id: 'host-main', label: 'Chorus', beats: 14, harmony: [4] },
    { id: 'host-return', label: 'Outro', beats: 7, harmony: [-2] },
  ] }
  white.instruments['w:b1'].pianoRolls = white.instruments['w:b1'].pianoRolls.slice(0, 1)

  const combined = combineOnlineKits(white, black, host)
  assert.deepEqual(combined.arrangement, host.arrangement)
  assert.equal(combined.harmony, host.harmony)
  assert.equal(combined.meter, host.meter)
  assert.deepEqual(combined.reactions, host.reactions)
  assert.equal(combined.instruments['w:a2'].name, 'white-city w:a2')
  assert.equal(combined.instruments['b:a7'].name, 'black-city b:a7')
  assert.deepEqual(combined.instruments['w:a2'].pianoRolls, white.instruments['w:a2'].pianoRolls)
  assert.deepEqual(combined.instruments['b:a7'].pianoRolls, black.instruments['b:a7'].pianoRolls)
  assert.deepEqual(combined.instruments['w:a2'].arrangement.sections, {
    'host-intro': { variation: 1, transpose: 2 },
    'host-main': { variation: null, transpose: -2 },
    'host-return': { variation: 1, transpose: 2 },
  })
  assert.deepEqual(combined.instruments['b:a7'].arrangement.sections, {
    'host-intro': { variation: 1, transpose: -2 },
    'host-main': { variation: null, transpose: 2 },
    'host-return': { variation: 1, transpose: -2 },
  })
  assert.deepEqual(Object.values(combined.instruments['w:b1'].arrangement.sections).map(step => step.variation), [0, null, 0])
})

test('online city choices stay isolated and composition does not mutate any input', () => {
  const white = kit('white-city', 'triangle', 2)
  const black = kit('black-city', 'square', -2)
  const host = kit('host-city', 'sine', 0)
  const before = [structuredClone(white), structuredClone(black), structuredClone(host)]
  const combined = combineOnlineKits(white, black, host)

  assert.deepEqual([white, black, host], before)
  assert.deepEqual(combined.effects['w:b1'], white.effects['w:b1'])
  assert.deepEqual(combined.effects['b:b8'], black.effects['b:b8'])
  assert.deepEqual(combined.mappings['w:b1'], white.mappings['w:b1'])
  assert.deepEqual(combined.mappings['b:b8'], black.mappings['b:b8'])
  combined.instruments['w:b1'].pianoRolls[0].notes[0].degree = 12
  combined.effects['b:b8'].gain = 1
  assert.deepEqual([white, black, host], before)
})
