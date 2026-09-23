const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, MusicRuntime } = loadTs('lib/music/runtime.ts')
const { createMusicPulseMonitor } = loadTs('lib/music/monitor.ts')
const creative = loadTs('lib/music/creative.ts')
const state = (history = []) => ({ pieces: model.piecesFromHistory(history), scale: ['C4','Eb4','F4','G4','Bb4'], bpm: 118, volume: 0.8, playing: true, effects: {} })

test('hiding the match stops its scheduler and suspends the audio context', async () => {
  let stops = 0, suspends = 0
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.scheduler = { stop: () => { stops++ } }
  runtime.api = { getAudioContext: () => ({ suspend: async () => { suspends++ } }) }
  runtime.setPageVisible(false)
  await Promise.resolve()
  assert.equal(stops, 1)
  assert.equal(suspends, 1)
  runtime.dispose()
})

test('returning to the Creative tab unlocks only an intended playing session', () => {
  let unlocks = 0
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.unlock = async () => { unlocks++ }
  runtime.state = state()
  runtime.setPageVisible(false)
  runtime.setPageVisible(true)
  assert.equal(unlocks, 1)
  runtime.state = { ...state(), playing: false }
  runtime.setPageVisible(false)
  runtime.setPageVisible(true)
  assert.equal(unlocks, 1)
  runtime.dispose()
})

test('visibility waits for audio initialization before suspending or resuming', async () => {
  let finishInitialization, suspends = 0, resumes = 0
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.ready = new Promise(resolve => { finishInitialization = resolve })
  runtime.api = { getAudioContext: () => ({ suspend: async () => { suspends++ }, resume: async () => { resumes++ } }) }
  runtime.state = state()
  runtime.refresh = () => {}
  runtime.setPageVisible(false)
  runtime.setPageVisible(true)
  finishInitialization()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(suspends, 0)
  assert.equal(resumes, 1)
  runtime.dispose()
})

test('playback monitor distinguishes inactive, rhythmic rest and section rest', async () => {
  const api = await strudel()
  const lab = creative.createCreativeSession()
  lab.pieces.find(p => p.id === 'w:b1').active = true
  lab.instruments['w:b1'] = { ...lab.instruments['w:b1'], notes: '0 ~', mask: '[x ~]/2' }
  let seconds = .2
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: seconds }) }
  runtime.scheduler = { started: true, lastBegin: 0, lastTick: 0, latency: 0, cps: 1 }
  runtime.state = creative.creativeSnapshot(lab, true)
  runtime.voices = new Map(voiceSpecs(runtime.state, null).map(v => [v.key, v]))
  runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'note')
  assert.equal(runtime.monitor.getSnapshot().tracks['w:e1'].status, 'inactive')
  seconds = .75; runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'rest')
  seconds = 1.2; runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'masked')
})

test('before audio unlock the monitor preserves active versus inactive state', () => {
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.update(creative.creativeSnapshot(creative.createDusseldorfSession(), false))
  assert.equal(runtime.monitor.getSnapshot().tracks['w:d1'].status, 'paused')
  assert.equal(runtime.monitor.getSnapshot().tracks['b:d8'].status, 'inactive')
  runtime.dispose()
})

test('pattern edits and an empty active band preserve the running transport', async () => {
  const api = await strudel()
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  const scheduler = { started: true, lastBegin: 8, lastTick: 16, latency: 0, cps: .5, setCps(value) { this.cps = value }, setPattern() {}, start() { assert.fail('must not restart') }, stop() { assert.fail('must not stop while playing') } }
  runtime.scheduler = scheduler
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: 17 }), getSuperdoughAudioController: () => ({ nodes: {}, getOrbit: () => ({ output: { gain: { setTargetAtTime() {} } } }) }) }
  runtime.update(state(['Nf3']))
  const cycle = runtime.monitor.getSnapshot().cycle
  runtime.update({ ...state(['Nf3']), effects: { 'w:g1': { gain: .5 } } })
  assert.equal(runtime.monitor.getSnapshot().cycle, cycle)
  runtime.update(state())
  assert.equal(runtime.monitor.getSnapshot().running, true)
  assert.equal(runtime.monitor.getSnapshot().cycle, cycle)
})

test('a shared loop bus stays connected until its final voice leaves', async () => {
  const api = await strudel()
  const nodes = {}, disconnects = new Map()
  const controller = { nodes, getOrbit(id) { return nodes[id] ??= {
    disconnect() { disconnects.set(id, (disconnects.get(id) ?? 0) + 1) },
    output: { gain: { setTargetAtTime() {} } },
  } } }
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.scheduler = { started: true, lastBegin: 0, lastTick: 0, latency: 0, cps: .5, setCps(v) { this.cps = v }, setPattern() {}, stop() {} }
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: 0 }), getSuperdoughAudioController: () => controller }
  runtime.publishFrame = () => {}
  const full = { ...state(), pieces: model.piecesFromHistory([]).map(piece => ({ ...piece, active: true })) }
  runtime.update(full)
  const bus = 0
  const members = voiceSpecs(full, null).filter(voice => voice.orbit === bus).map(voice => voice.piece.id)
  assert.ok(members.length > 1)
  runtime.update({ ...full, pieces: full.pieces.map(piece => piece.id === members[0] ? { ...piece, active: false } : piece) })
  assert.equal(disconnects.get(bus), undefined)
  assert.ok(nodes[bus])
  runtime.update({ ...full, pieces: full.pieces.map(piece => members.includes(piece.id) ? { ...piece, active: false } : piece) })
  assert.equal(disconnects.get(bus), 1)
  assert.equal(nodes[bus], undefined)
  runtime.dispose()
})

test('constrained playback uses one effect bus per team without merging their voices', () => {
  const full = { ...state(), pieces: model.piecesFromHistory([]).map(piece => ({ ...piece, active: true })) }
  const desktop = voiceSpecs(full, null)
  const constrained = voiceSpecs(full, null, 2)
  assert.deepEqual([...new Set(desktop.map(voice => voice.orbit))].sort(), [0, 1, 2, 3])
  assert.deepEqual([...new Set(constrained.filter(voice => voice.piece.color === 'w').map(voice => voice.orbit))], [0])
  assert.deepEqual([...new Set(constrained.filter(voice => voice.piece.color === 'b').map(voice => voice.orbit))], [1])
  assert.equal(constrained.length, desktop.length)
})

test('visual pulse monitor updates and clears without owning page state', () => {
  const monitor = createMusicPulseMonitor()
  let notifications = 0
  const unsubscribe = monitor.subscribe(() => { notifications++ })
  const pulse = { id: 'w:b1', square: 'c3', preview: false, duration: 1 }
  monitor.publish(pulse)
  assert.equal(monitor.getSnapshot(), pulse)
  assert.equal(notifications, 1)
  monitor.clear()
  assert.equal(monitor.getSnapshot(), null)
  assert.equal(notifications, 2)
  unsubscribe()
})

test('pausing while the audio clock starts leaves playback and its monitor stopped', async () => {
  const api = await strudel()
  let finishStart
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.scheduler = {
    started: false, lastBegin: 0, lastTick: 0, latency: 0, cps: .5,
    setCps(value) { this.cps = value }, setPattern() {},
    start() { this.started = true; return new Promise(resolve => { finishStart = resolve }) },
    stop() { this.started = false },
  }
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: 0 }), getSuperdoughAudioController: () => ({ nodes: {} }) }
  runtime.update(state())
  assert.equal(runtime.monitor.getSnapshot().running, true)
  runtime.update({ ...state(), playing: false })
  // Completion may race with the pause. The completion path must recheck state.
  runtime.scheduler.started = true
  finishStart()
  await Promise.resolve()
  assert.equal(runtime.scheduler.started, false)
  assert.equal(runtime.monitor.getSnapshot().running, false)
  runtime.dispose()
})

test('crossing squares during manual play does not resubmit unchanged accompaniment', async () => {
  const { runtime, attacks, patternUpdates, manualDisconnects } = await manualRuntime()
  runtime.update(state(['Nf3', 'Nc6']))
  assert.equal(patternUpdates(), 1)
  runtime.audition('w:g1', 'f3'); await Promise.resolve()
  assert.equal(patternUpdates(), 2) // suspend the held piece's loop
  let fullRefreshes = 0
  const refresh = runtime.refresh.bind(runtime)
  runtime.refresh = () => { fullRefreshes++; return refresh() }
  for (const square of ['f4', 'g4', 'h4', 'h5', 'g5']) {
    runtime.audition('w:g1', square); await Promise.resolve()
  }
  assert.equal(attacks.length, 6)
  assert.equal(fullRefreshes, 0, 'crossing squares must not rebuild accompaniment')
  assert.equal(patternUpdates(), 2)
  assert.equal(manualDisconnects(), 0, 'crossing squares must reuse the manual audio graph')
  runtime.endAudition()
  assert.equal(manualDisconnects(), 1, 'releasing the piece removes its isolated manual graph')
  assert.equal(patternUpdates(), 3)
  runtime.dispose()
})

test('drag suspends that voice, triggers once per entered square and restores its loop', async () => {
  const { runtime, attacks, pattern, advance } = await manualRuntime()
  runtime.update(state(['Nf3', 'Nc6']))
  runtime.audition('w:g1', 'f3')
  await Promise.resolve()
  assert.equal(attacks.length, 1)
  assert.ok(pattern().queryArc(0, 16).every(h => h.value.ccVoice === 'b:b8:loop'))
  runtime.audition('w:g1', 'f3'); await Promise.resolve()
  assert.equal(attacks.length, 1)
  runtime.audition('w:g1', 'g4'); await Promise.resolve()
  assert.equal(attacks.length, 2)
  assert.notEqual(attacks[0].note, attacks[1].note)
  advance(10)
  assert.equal(attacks.length, 2)
  assert.equal(runtime.monitor.getSnapshot().tracks['w:g1'].status, 'rest')
  runtime.endAudition()
  assert.ok(pattern().queryArc(0, 4).some(h => h.value.ccVoice === 'w:g1:loop'))
  runtime.dispose()
})

test('cancelled loading gestures stay silent; the dedicated audition button still plays the phrase', async () => {
  const { runtime, attacks, pattern } = await manualRuntime()
  runtime.update(state())
  runtime.audition('w:e1', 'e1')
  runtime.endAudition()
  await Promise.resolve()
  assert.equal(attacks.length, 0)
  assert.equal(pattern().queryArc(0, 8).length, 0)
  runtime.audition('w:e1', 'e1', 'pattern')
  await Promise.resolve()
  assert.ok(pattern().queryArc(0, 4).length > 0)
  runtime.endAudition()
  assert.equal(pattern().queryArc(0, 8).length, 0)
  runtime.dispose()
})

async function manualRuntime() {
  const api = await strudel()
  let pattern, time = 0, patternUpdates = 0
  const attacks = []
  const nodes = {}
  let disconnects = 0
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.scheduler = { started: true, lastBegin: 0, lastTick: 0, latency: 0, cps: .5, setCps(v) { this.cps = v }, setPattern(v) { pattern = v; patternUpdates++ }, stop() { this.started = false } }
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: time }), getSuperdoughAudioController: () => ({ nodes, getOrbit: id => nodes[id] ??= { disconnect() { if (id >= 64) disconnects++ }, output: { gain: { setTargetAtTime() {} } } } }), webaudioOutput: async hap => { attacks.push(hap.value) } }
  runtime.unlock = async () => {}
  return { runtime, attacks, pattern: () => pattern, patternUpdates: () => patternUpdates, manualDisconnects: () => disconnects, advance: seconds => { time = seconds; runtime.publishFrame() } }
}
