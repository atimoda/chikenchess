const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const { voiceSpecs, renderMusicCode, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const cityKits = loadTs('lib/music/city-kits.ts')
const { applyReactions } = loadTs('lib/music/reactions.ts')

const allActive = kit => { const snapshot = creative.creativeSnapshot(kit, true); snapshot.pieces = snapshot.pieces.map(piece => ({ ...piece, active: true })); return snapshot }
// Two sections of 8 beats; the piece plays its first bank in both.
function twoSections(patch = {}, notePatch) {
  const kit = creative.updateCreativeArrangement(cityKits.defaultCityKit('detroit'), { sections: [{ id: 'verse', label: 'Verse', beats: 8 }, { id: 'chorus', label: 'Chorus', beats: 8 }] })
  const density = key => kit.instruments[key].pianoRolls[0].notes.length / kit.instruments[key].pianoRolls[0].bars
  const id = Object.keys(kit.instruments).filter(key => kit.instruments[key].source?.kind !== 'sample').sort((a, b) => density(b) - density(a))[0]
  const instrument = kit.instruments[id]
  const roll = notePatch ? { ...instrument.pianoRolls[0], notes: instrument.pianoRolls[0].notes.map(note => ({ ...note, ...notePatch })) } : instrument.pianoRolls[0]
  const session = creative.creativeSchema.parse({ ...kit,
    instruments: { ...kit.instruments, [id]: { ...instrument, lpfRange: undefined, reverbRange: undefined, driveRange: undefined, playChance: undefined, pianoRolls: [roll],
      arrangement: { restart: true, sections: { verse: { variation: 0, transpose: 0 }, chorus: { variation: 0, transpose: 0, params: patch } } } } } })
  return { session, id, snapshot: allActive(session) }
}
const onsets = (pattern, from, to) => pattern.queryArc(from, to).filter(hap => hap.hasOnset())
const exported = (api, snapshot, id) => {
  const code = renderMusicCode(snapshot, null)
  const start = code.indexOf(`// ${id} ·`), body = code.slice(code.indexOf('\n', start) + 1)
  const expression = body.slice(0, body.lastIndexOf('.postgain(', body.indexOf('\n  //') > 0 ? body.indexOf('\n  //') : undefined))
  return new Function(...Object.keys(api), `return ${expression.trim()}`)(...Object.values(api))
}

test('section params survive the schema and change only their own section', async () => {
  const api = await strudel()
  const { session, id, snapshot } = twoSections({ gain: .9, attack: .2, fxGain: 1.5, resonance: 22, hpf: 300 })
  assert.deepEqual(session.instruments[id].arrangement.sections.chorus.params, { gain: .9, attack: .2, fxGain: 1.5, resonance: 22, hpf: 300 })
  const voice = voiceSpecs(snapshot, null).find(v => v.piece.id === id)
  assert.equal(voice.sections[0], undefined)
  assert.ok(Math.abs(voice.sections[1].controls.gain - .9 * 1.5) < 1e-9)
  const pattern = compileVoice(api, voice)
  for (const hap of onsets(pattern, 0, 2)) { assert.equal(hap.value.attack, session.instruments[id].attack); assert.equal(hap.value.resonance, session.instruments[id].resonance) }
  for (const hap of onsets(pattern, 2, 4)) { assert.equal(hap.value.attack, .2); assert.equal(hap.value.resonance, 22); assert.equal(hap.value.hcutoff, 300) }
  assert.ok(onsets(pattern, 2, 4).length > 0)
  assert.throws(() => creative.creativeSchema.parse({ ...session, instruments: { ...session.instruments, [id]: { ...session.instruments[id],
    arrangement: { restart: true, sections: { chorus: { variation: 0, transpose: 0, params: { resonance: 99 } } } } } } }))
})

test('section limits replace ranged values only inside the section, and export matches', async () => {
  const api = await strudel()
  const { id, snapshot } = twoSections({ lpfRange: { first: 300, second: 300 }, reverbRange: { first: .8, second: .9 }, driveRange: { first: 4, second: 4 } })
  const voice = voiceSpecs(snapshot, null).find(v => v.piece.id === id)
  const pattern = compileVoice(api, voice)
  for (const hap of onsets(pattern, 2, 4)) {
    assert.equal(hap.value.cutoff, 300); assert.ok(hap.value.room >= .8 && hap.value.room <= .9); assert.equal(hap.value.distort, 4)
  }
  for (const hap of onsets(pattern, 0, 2)) { assert.equal(hap.value.cutoff, voice.controls.lpf); assert.equal(hap.value.distort, undefined) }
  const code = exported(api, snapshot, id)
  const normalize = haps => haps.map(hap => JSON.stringify([Number(hap.whole.begin), hap.value.note ?? null, hap.value.cutoff, hap.value.room, hap.value.distort ?? null, hap.value.gain])).sort()
  for (let bar = 0; bar < 8; bar++) assert.deepEqual(normalize(onsets(code, bar, bar + 1)), normalize(onsets(pattern, bar, bar + 1)), `bar ${bar}`)
})

test('a section can change the play chance on its own and turn the LFO off', async () => {
  const api = await strudel()
  const { id, snapshot } = twoSections({ playChance: 0, lfoTarget: 'none' })
  const voice = voiceSpecs(snapshot, null).find(v => v.piece.id === id)
  assert.equal(voice.sectionChance, true)
  const pattern = compileVoice(api, voice)
  assert.ok(onsets(pattern, 0, 2).length > 0)
  assert.equal(onsets(pattern, 2, 4).length, 0)
  assert.equal(onsets(exported(api, snapshot, id), 2, 4).length, 0)
})

test('rules win over sections: a filter rule drops the section limits, gain scales them', () => {
  const { id, snapshot } = twoSections({ lpfRange: { first: 300, second: 300 }, fxGain: 1, hpf: 200 })
  const rule = (type, value) => ({ rules: [{ id: 'r', enabled: true, trigger: 'check', target: 'both', duration: 0, actions: [{ type, value }] }] })
  const context = { states: [{ trigger: 'check', color: 'w', ply: 1 }], events: [], ply: 1 }
  const filtered = applyReactions(snapshot, rule('lpf', 900), context).snapshot
  assert.deepEqual(filtered.instruments[id].arrangement.sections.chorus.params, { fxGain: 1, hpf: 200 })
  const louder = applyReactions(snapshot, rule('gain', 50), context).snapshot
  assert.ok(Math.abs(louder.instruments[id].arrangement.sections.chorus.params.fxGain - 1.5) < 1e-9)
})

test('a note keeps its own release, reverb, delay and drive over the section and ranges', async () => {
  const api = await strudel()
  const { session, id, snapshot } = twoSections({ reverbRange: { first: .1, second: .1 }, delay: .2 }, { release: 1.2, reverb: .7, delay: .5, drive: 0 })
  const note = session.instruments[id].pianoRolls[0].notes[0]
  assert.deepEqual([note.release, note.reverb, note.delay, note.drive], [1.2, .7, .5, 0])
  const withDrive = twoSections({ driveRange: { first: 5, second: 5 } }, { drive: 0 })
  const voice = voiceSpecs(snapshot, null).find(v => v.piece.id === id)
  for (const hap of onsets(compileVoice(api, voice), 0, 4)) {
    assert.deepEqual([hap.value.release, hap.value.room, hap.value.delay], [1.2, .7, .5]); assert.equal(hap.value.ccNote, undefined)
  }
  const driven = voiceSpecs(withDrive.snapshot, null).find(v => v.piece.id === withDrive.id)
  for (const hap of onsets(compileVoice(api, driven), 2, 4)) assert.equal(hap.value.distort, undefined)
  for (const hap of onsets(exported(api, withDrive.snapshot, withDrive.id), 2, 4)) assert.equal(hap.value.distort, undefined)
  assert.throws(() => creative.creativeSchema.parse({ ...session, instruments: { ...session.instruments, [id]: { ...session.instruments[id],
    pianoRolls: [{ ...session.instruments[id].pianoRolls[0], notes: [{ ...note, drive: 11 }] }] } } }))
})
