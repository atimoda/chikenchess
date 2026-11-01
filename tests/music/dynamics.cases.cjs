const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs } = require('../helpers/music.cjs')
const reactions = loadTs('lib/music/reactions.ts')
const { ReactionQueue } = loadTs('lib/music/reaction-queue.ts')
const creative = loadTs('lib/music/creative.ts')
const cityKits = loadTs('lib/music/city-kits.ts')
const { instrumentRole } = loadTs('lib/music/sound-design.ts')
const { reactionContext } = reactions
const events = context => context.events.map(event => event.trigger)
const states = context => context.states.map(state => state.trigger)

test('pawn advances and newly undefended pieces are board events', () => {
  const pawn = reactionContext(['e4', 'd5', 'exd5', 'e6', 'dxe6'])
  assert.deepEqual(pawn.events.filter(e => e.trigger === 'advancedPawn').map(e => [e.color, e.ply]), [['w', 5]])
  const fen = '4k3/8/8/1b6/8/8/8/6NK w - - 0 1'
  const hanging = reactionContext(['Ne2'], 4, fen)
  assert.deepEqual(hanging.events.filter(e => e.trigger === 'hangingPiece').map(e => e.color), ['w'])
  const defended = reactionContext(['Nf3'], 4, fen)
  assert.ok(!events(defended).includes('hangingPiece'))
})

test('castling on opposite wings is a state; a capture drought starts after the last capture', () => {
  const fen = 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1'
  assert.ok(states(reactionContext(['O-O', 'O-O-O'], 4, fen)).includes('oppositeCastling'))
  assert.ok(!states(reactionContext(['O-O', 'O-O'], 4, fen)).includes('oppositeCastling'))
  const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8']
  const opening = ['e4', 'd5', 'exd5', 'Qxd5']
  const drought = [...opening, ...shuffle, ...shuffle, ...shuffle, ...shuffle]
  assert.ok(states(reactionContext(drought)).includes('captureDrought'))
  assert.ok(!states(reactionContext(drought.slice(0, -1))).includes('captureDrought'))
  assert.ok(!states(reactionContext([...shuffle, ...shuffle, ...shuffle, ...shuffle, ...shuffle])).includes('captureDrought'))
  assert.ok(states(reactionContext(drought.slice(0, -4), 4, undefined, { thresholds: { drought: 12 } })).includes('captureDrought'))
})

test('engine evaluations drive tension and swings; material is the fallback', () => {
  const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8']
  const long = Array.from({ length: 8 }, () => shuffle).flat()
  assert.ok(states(reactionContext(long)).includes('tension'))
  assert.ok(!states(reactionContext(long.slice(0, 28))).includes('tension'))
  const tilted = Object.fromEntries(long.map((_, i) => [i + 1, 120]))
  assert.ok(!states(reactionContext(long, 4, undefined, { evaluations: tilted })).includes('tension'))
  const swing = reactionContext(['e4', 'e5', 'Nf3'], 4, undefined, { evaluations: { 1: 30, 2: 20, 3: -260 } })
  assert.deepEqual(swing.events.filter(e => e.trigger === 'evalSwing').map(e => [e.ply, e.color]), [[3, 'b']])
  assert.equal(swing.evaluation, -260)
  // A material blunder swings without an engine; mixing an engine score with material never does.
  const blunder = ['e4', 'e5', 'Qh5', 'Nc6', 'Qxf7+', 'Kxf7']
  assert.ok(events(reactionContext(blunder, 4, undefined, { thresholds: { swing: 300 } })).includes('evalSwing'))
  assert.ok(!events(reactionContext(blunder, 4, undefined, { evaluations: { 5: 0 }, thresholds: { swing: 900 } })).includes('evalSwing'))
})

test('global defaults cover every new trigger and older kits do not silence them', () => {
  const rules = reactions.defaultReactions()
  for (const trigger of reactions.DYNAMICS_TRIGGERS) assert.ok(rules.some(rule => rule.trigger === trigger), trigger)
  const old = reactions.migrateKitReactions({ minimumPieces: 4, rules: reactions.legacyFactoryReactions().slice(1) }, 'reactions-2026-09-20-v3')
  for (const trigger of reactions.DYNAMICS_TRIGGERS) assert.ok(!old.overrides.includes(trigger), trigger)
  const resolved = reactions.resolveReactions({ ...reactions.defaultGlobalReactions(), thresholds: { swing: 300 } }, { overrides: [], rules: [], thresholds: { drought: 20 } })
  assert.deepEqual(resolved.thresholds, { swing: 300, drought: 20 })
})

test('rules can target instruments by role and use the new influences', () => {
  const kit = cityKits.defaultCityKit('detroit')
  const snapshot = creative.creativeSnapshot(kit, true)
  const rule = { id: 'drums-dry', trigger: 'check', enabled: true, quantize: false, target: 'both', instruments: 'drums', duration: 1,
    actions: [{ type: 'reverb', value: .6 }, { type: 'hpf', value: 400 }, { type: 'pan', value: -.5 }, { type: 'drive', value: 3 }, { type: 'resonance', value: 9 }, { type: 'delay', value: .3 }] }
  const config = reactions.reactionsSchema.parse({ rules: [rule] })
  const context = { ply: 1, states: [{ trigger: 'check', color: 'w', ply: 1 }], events: [] }
  const { snapshot: result, descriptions } = reactions.applyReactions(snapshot, config, context)
  const drums = Object.keys(snapshot.instruments).filter(id => instrumentRole(snapshot.instruments[id]) === 'drums')
  const others = Object.keys(snapshot.instruments).filter(id => !drums.includes(id))
  assert.ok(drums.length > 0 && others.length > 0)
  for (const id of drums) {
    assert.deepEqual([result.effects[id].reverb, result.effects[id].hpf, result.effects[id].pan, result.effects[id].delay], [.6, 400, -.5, .3])
    assert.deepEqual([result.instruments[id].distortion, result.instruments[id].resonance], [3, 9])
  }
  for (const id of others) assert.deepEqual(result.effects[id], snapshot.effects[id])
  assert.ok(descriptions.some(text => /Reverb 0\.6/.test(text)))
})

test('gain and filter influences glide bar by bar on the way in and on the way back', () => {
  const kit = cityKits.defaultCityKit('detroit')
  const snapshot = creative.creativeSnapshot(kit, true)
  const id = Object.keys(snapshot.instruments)[0]
  const base = snapshot.instruments[id].lpf
  const config = reactions.reactionsSchema.parse({ rules: [{ id: 'sweep', trigger: 'check', enabled: true, quantize: false, target: 'both', duration: 1, actions: [{ type: 'lpf', value: 400, rampBars: 4 }, { type: 'gain', value: 50 }] }] })
  const idle = { ply: 0, states: [], events: [] }, active = { ply: 1, states: [{ trigger: 'check', color: 'w', ply: 1 }], events: [] }
  const queue = new ReactionQueue()
  queue.update(config, idle, true, 0, 'game')
  queue.update(config, active, true, 0, 'game')
  const lpfAt = cycle => { if (cycle) queue.advance(cycle); return reactions.applyReactions(snapshot, config, active, queue.entries, queue.rampStates()).snapshot.instruments[id].lpf }
  const sweep = [0, 1, 2, 3, 4].map(lpfAt)
  assert.equal(sweep[0], base); assert.equal(sweep[4], 400)
  for (let i = 1; i < 5; i++) assert.ok(sweep[i] < sweep[i - 1])
  assert.ok(Math.abs(sweep[2] - Math.sqrt(base * 400)) < 1e-6, 'halfway is the geometric mean')
  // Leaving: the non-gliding gain drops at once while the filter returns over four bars.
  queue.update(config, idle, true, 4, 'game')
  const back = reactions.applyReactions(snapshot, config, active, queue.entries, queue.rampStates()).snapshot
  assert.equal(back.effects[id].gain, snapshot.effects[id].gain)
  assert.equal(back.instruments[id].lpf, 400)
  for (const cycle of [5, 6, 7]) queue.advance(cycle)
  assert.ok(reactions.applyReactions(snapshot, config, active, queue.entries, queue.rampStates()).snapshot.instruments[id].lpf > 400)
  queue.advance(8)
  assert.equal(queue.entries.get('sweep').hit, undefined)
  assert.equal(queue.rampStates().size, 0)
})

test('lite profile (phones): gain and filter influences land at once, without per-bar steps', () => {
  const kit = cityKits.defaultCityKit('detroit')
  const snapshot = creative.creativeSnapshot(kit, true)
  const id = Object.keys(snapshot.instruments)[0]
  const config = reactions.reactionsSchema.parse({ rules: [{ id: 'sweep', trigger: 'check', enabled: true, quantize: false, target: 'both', duration: 1, actions: [{ type: 'lpf', value: 400, rampBars: 4 }] }] })
  const idle = { ply: 0, states: [], events: [] }, active = { ply: 1, states: [{ trigger: 'check', color: 'w', ply: 1 }], events: [] }
  const queue = new ReactionQueue(true)
  queue.update(config, idle, true, 0, 'game')
  queue.update(config, active, true, 0, 'game')
  assert.equal(queue.rampStates().size, 0)
  assert.equal(reactions.applyReactions(snapshot, config, active, queue.entries, queue.rampStates()).snapshot.instruments[id].lpf, 400)
  assert.equal(queue.advance(1).changed, false)
  queue.update(config, idle, true, 1, 'game')
  assert.equal(queue.entries.get('sweep').hit, undefined)
  assert.equal(queue.rampStates().size, 0)
})

test('a personal global set saved before the new triggers gains their defaults', () => {
  const { parseGlobalReactions } = loadTs('lib/music/global-reactions.ts')
  const known = Object.keys(reactions.TRIGGERS).filter(id => !reactions.DYNAMICS_TRIGGERS.includes(id))
  const saved = { ...reactions.defaultGlobalReactions(), rules: reactions.defaultReactions().filter(rule => known.includes(rule.trigger)) }
  const parsed = parseGlobalReactions(JSON.stringify({ revision: reactions.REACTION_PRESET_REVISION, knownTriggers: known, ...saved }))
  for (const trigger of reactions.DYNAMICS_TRIGGERS) assert.ok(parsed.rules.some(rule => rule.trigger === trigger), trigger)
  // A trigger the save knew and deleted stays deleted.
  const withoutCapture = parseGlobalReactions(JSON.stringify({ revision: reactions.REACTION_PRESET_REVISION, knownTriggers: Object.keys(reactions.TRIGGERS), ...saved, rules: saved.rules.filter(rule => rule.trigger !== 'capture') }))
  assert.ok(!withoutCapture.rules.some(rule => rule.trigger === 'capture'))
})
