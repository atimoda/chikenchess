// Three new scenes for the official Psytrance kit. Keep all six original banks.
// G/H are per-instrument banks: the Bridge and Turnaround deliberately use
// different instruments from G, so nine global scenes fit the eight-bank limit.
const { loadTs } = require('../../tests/helpers/music.cjs')
const { phraseRoll } = loadTs('lib/music/styled-kits.ts')
const rest = '. '.repeat(64).trim()
const line = (...bars) => {
  for (const bar of bars) if (bar.split(/\s+/).length !== 16) throw new Error(`Expected 16 cells: ${bar}`)
  return bars.join(' ')
}
const repeat = bar => line(bar, bar, bar, bar)
const empty = '. . . . . . . . . . . . . . . .'
// G: spacious pitched voices for Bridge; drum crescendo/acid pickup for Turnaround.
// H: original offbeat Hook with a broken kick/bass conversation.
const phrases = {
  a1: [repeat('0,2,4_ . . . . . . . . . . . 0?0 . . .'), rest],
  a2: [line('0 . . . . . . . . . 0\' . . . . .', empty, '0 . . . . . . . . . . . 0\' . . .', empty), repeat('. . 0 . . . . . . . . 0\' . . 0 .')],
  b1: [rest, line('0! . . 7~-7 . . 0 . . . 2 . 0 . . .', '. . 0 . 4! . . . 0 . . 7~-7 . . . .', '0! . . 7~-7 . . 0 . . . 2 . 0 . . .', '. . 0 . 4! . . . 2 . 0 . 0?0 . . .')],
  b2: [line(empty, '. . . . 0 . . . . . . . 0 . . .', '. . . . 0 . . . 0 . . . 0 . . .', '0 . 0 . 0 . 0 . 0*2 0*2 0*2 0*2 . . . .'), repeat('. . . . 0 . . . . . . . 0 . . .')],
  c1: [line('0_ . . . 2 . . . 4_ . . . 0?0 . . .', empty, '4_ . . . 2 . . . 0_ . . . 0?0 . . .', empty), rest],
  c2: [line('0 . . . 0 . . . 0 . . . 0 . . .', '0 . 0\' . 0 . 0\' . 0 . 0\' . 0 . 0\' .', '0 0\' . . 0 0\' . . 0 0\' . . 0 0\' . .', '0 0\' 0 0\' 0 0\' 0 0\' 0 0\' 0 0\' . . . .'), repeat('0 . . 0\' . . 0 . 0 . . 0\' . . 0 .')],
  d1: [line('4_ . . . . . . . 2 . 0 . 0?0 . . .', empty, '2_ . . . . . . . 4 . 2 . 0?0 . . .', empty), line('7! . . 4 . . 2 . 4_ . . . 0?0 . . .', empty, '7! . . 9 . . 7 . 4_ . . . 0?0 . . .', '. . . . . . . . 2 . 1 . 0_ . 0?0 .')],
  d2: [repeat('0_ . . . . . . . 0?0 . . . . . . .'), line('. . 0 . . . 0 . . . 0 . . 0 . .', '. . 0 . . 0 . . . . 0 . . . 0 .', '. . 0 . . . 0 . . . 0 . . 0 . .', '. . 0 . . . 0 . . . 0 . 0?0 . . .')],
  e1: [line('0 . . . . . . . . . . . . . . .', empty, empty, empty), rest],
  e2: [line('0! . . . 0 . . . 0! . . . 0 . . .', '0! . . . 0 . . . 0! . . . 0 . . .', '0! . . . 0 . . . 0! . . . 0 . . .', '0! . . . 0 . . . 0! . . . . . . .'), line('0! . . . . . 0 . 0! . . . . . . 0', '0! . . . 0 . . . . . . 0 . . . .', '0! . . . . . 0 . 0! . . . . . . 0', '0! . . . 0 . . . 0! . . . . . . .')],
  f1: [line(empty, '0 . . . 2 . . . 4 . . . 7 . . .', '0 . 2 . 4 . 7 . 4 . 2 . 0 . 2 .', '0 . 2 . 4 . 7 . 9 . 7 . . . . .'), line(empty, '. . . . . . . . 4 . 2 . 0 . . .', empty, '. . . . . . . . 7 . 4 . 2 . . .')],
  f2: [line(empty, '. . 0 . . . 0 . . . 0 . . . 0 .', '. . 0 . . . 0 . . . 0 . . . 0 .', '. . 0 . . . 0 . . . 0 . . . . .'), repeat('. . . . . . 0 . . . . . . . 0 .')],
  g1: [line('0! . . . 0 . . . 2 . . . 4 . . .', '0! . 2 . 4 . 7~-7 . 4 . 2 . 0 . . .', '0! . 2 . 4 . 7~-7 . 4 . 2 . 0 . . .', '0! . 2 . 4 . 7~-7 . 4 . 2 . . . . .'), line(empty, '0! . . 2 . . 4 . 7~-7 . 4 . 2 . . .', empty, '0! . . 1 . . 2 . 4 . 2 . 0 . . .')],
  g2: [line('. . . . . . 0 . . . . . . . 0\' .', empty, '. . . . . . 0 . . . . . 0\' . . .', empty), repeat('. . . 0 . . 0 . . . . 0 . . 0 .')],
  h1: [line(empty, empty, empty, '0_ . . . . . . . 0?0 . . . . . . .'), rest],
  h2: [rest, line(empty, empty, empty, '. . . . . . . . 0~-12 . . . . . . .')],
}

function addGoaContrasts(kit) {
  const bridge = { id: 'section-h', label: 'Bridge', beats: 32, harmony: [1, 1, 0, 0] }
  const hook = { id: 'section-g', label: 'Hook', beats: 16, harmony: [0] }
  const turnaround = { id: 'section-i', label: 'Turnaround', beats: 16, harmony: [0, 1, 0, 0] }
  const original = kit.arrangement.sections
  kit.arrangement.sections = [original[0], original[1], hook, original[3], original[2], bridge, original[4], turnaround, original[5]]
  const bridgeSlots = new Set(['a1', 'a2', 'c1', 'd1', 'd2', 'e1', 'g2'])
  const turnSlots = new Set(['b2', 'c2', 'e2', 'f1', 'f2', 'g1', 'h1'])
  for (const piece of kit.pieces) {
    const slot = piece.color === 'w' ? piece.origin : `${piece.origin[0]}${9 - Number(piece.origin[1])}`
    const instrument = kit.instruments[piece.id]
    instrument.pianoRolls.push(...phrases[slot].map(text => phraseRoll(text, 4, 0, .6)))
    const assignment = variation => ({ variation, transpose: 0 })
    instrument.arrangement.sections[hook.id] = assignment(phrases[slot][1] === rest ? null : 7)
    instrument.arrangement.sections[bridge.id] = assignment(bridgeSlots.has(slot) ? 6 : null)
    instrument.arrangement.sections[turnaround.id] = assignment(turnSlots.has(slot) ? 6 : slot === 'd2' || slot === 'g2' ? 7 : null)
    // Micro changes only to the original palette; lead/acid/bass settings stay intact.
    if (slot === 'c2') { instrument.gain *= .95; instrument.lpf = 10500 }
    if (slot === 'f2') instrument.lpf = 11000
    if (slot === 'h2') { instrument.gain *= .95; instrument.lpf = 7800 }
  }
  return kit
}
module.exports = { addGoaContrasts }
