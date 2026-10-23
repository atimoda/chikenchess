const { test } = require('node:test')
const assert = require('node:assert/strict')
const { setImmediate } = require('node:timers')
const { loadTs, strudel } = require('../helpers/music.cjs')
const model = loadTs('lib/music/model.ts')
const { voiceSpecs, MusicRuntime } = loadTs('lib/music/runtime.ts')
const { createMusicPulseMonitor } = loadTs('lib/music/monitor.ts')
const creative = loadTs('lib/music/creative.ts')
const { noteRoll } = loadTs('lib/music/piano-roll.ts')
const state = (history = []) => ({ pieces: model.piecesFromHistory(history), scale: ['C4','Eb4','F4','G4','Bb4'], bpm: 118, volume: 0.8, playing: true, effects: {} })

test('Creative sample preparation leaves the live audio graph for the first gesture', async () => {
  const loader = loadTs('lib/music/strudel-loader.ts')
  const originalLoad = loader.loadLibrary, originalSample = loader.ensureSample
  const prepared = []
  let initializations = 0
  const context = { state: 'suspended', resume() { this.state = 'running'; return Promise.resolve() } }
  const api = { getAudioContext: () => context }
  loader.loadLibrary = async () => api
  loader.ensureSample = async (_api, source) => { prepared.push(source) }
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.initialize = async () => { initializations++; runtime.api = api }
  runtime.refresh = () => {}
  try {
    const sample = { kind: 'sample', bank: 'chicken-world-v1', asset: 'guitar', variant: 0, pitched: true }
    await runtime.prepareSamples([sample, sample])
    assert.deepEqual(prepared, [sample], 'assets remain preloaded and deduplicated')
    assert.equal(initializations, 0, 'preloading must not build a live graph before user activation')
    assert.equal(context.state, 'suspended')
    await runtime.unlock()
    assert.equal(initializations, 1)
    assert.equal(context.state, 'running')
  } finally {
    runtime.dispose()
    loader.loadLibrary = originalLoad
    loader.ensureSample = originalSample
  }
})

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

test('distorted playback waits for processor registration and cancels stale notes while dry notes stay immediate', async () => {
  const output = [], runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.api = { getAudioContext: () => ({ currentTime: 0 }), webaudioOutput: async hap => { output.push(hap.value.distort ?? 'dry') } }
  let ready
  runtime.workletsReady = new Promise(resolve => { ready = resolve })
  await runtime.output({ value: {} }, 0, 1, 1, .1)
  assert.deepEqual(output, ['dry'])
  const delayed = runtime.output({ value: { distort: 1 } }, 0, 1, 1, .1)
  await Promise.resolve(); assert.deepEqual(output, ['dry'])
  ready(); await delayed; assert.deepEqual(output, ['dry', 1])
  runtime.workletsReady = new Promise(resolve => { ready = resolve })
  const cancelled = runtime.output({ value: { distort: 2 } }, 0, 1, 1, .1)
  runtime.generation++; ready(); await cancelled
  assert.deepEqual(output, ['dry', 1], 'a cancelled gesture/old pattern must not appear after initialization')
  runtime.dispose()
})

test('supersaw waits for worklets at unlock and output, cancels stale attacks and keeps dry notes immediate', { timeout: 5000 }, async () => {
  const kit = creative.createCreativeSession(), id = 'w:b1'
  kit.pieces.forEach(piece => { piece.active = piece.id === id })
  Object.assign(kit.instruments[id], { source: { kind: 'synth' }, sound: 'supersaw', distortion: undefined, driveRange: undefined })
  const output = [], runtime = new MusicRuntime(() => {}, error => { throw error })
  let refreshes = 0, ready
  runtime.api = { getAudioContext: () => ({ currentTime: 0, state: 'running' }), webaudioOutput: async hap => { output.push(hap.value.s) } }
  runtime.ready = Promise.resolve()
  runtime.refresh = () => { refreshes++ }
  runtime.state = creative.creativeSnapshot(kit, true)
  runtime.workletsReady = new Promise(resolve => { ready = resolve })
  try {
    const unlock = runtime.unlock()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(refreshes, 0, 'the first Supersaw transport must wait for processor registration')
    const delayed = runtime.output({ value: { s: 'supersaw' } }, 0, 1, 1, .1)
    await runtime.output({ value: { s: 'sine' } }, 0, 1, 1, .1)
    assert.deepEqual(output, ['sine'], 'dry attacks are immediate while Supersaw is waiting')
    ready(); await Promise.all([unlock, delayed])
    assert.equal(refreshes, 1)
    assert.deepEqual(output, ['sine', 'supersaw'])
    runtime.workletsReady = new Promise(resolve => { ready = resolve })
    const cancelled = runtime.output({ value: { s: 'supersaw' } }, 0, 1, 1, .1)
    runtime.generation++; ready(); await cancelled
    assert.deepEqual(output, ['sine', 'supersaw'], 'old Supersaw attacks cannot play after cancellation')
    kit.instruments[id].sound = 'triangle'
    runtime.state = creative.creativeSnapshot(kit, true)
    runtime.workletsReady = new Promise(resolve => { ready = resolve })
    await runtime.unlock()
    assert.equal(refreshes, 2, 'a dry transport does not await worklets')
  } finally { ready(); runtime.dispose() }
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

test('a later Creative gesture resumes audio before awaiting an earlier suspended initialization', async () => {
  let finishInitialization
  let resumes = 0
  const context = {
    state: 'suspended',
    resume() { resumes++; this.state = 'running'; finishInitialization(); return Promise.resolve() },
  }
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.api = { getAudioContext: () => context }
  runtime.ready = new Promise(resolve => { finishInitialization = resolve })
  runtime.refresh = () => {}
  await runtime.unlock()
  assert.equal(resumes, 1)
  runtime.dispose()
})

test('playback monitor distinguishes inactive, rhythmic rest and globally masked section', async () => {
  const api = await strudel()
  const lab = creative.updateCreativeArrangement(creative.createCreativeSession(),{sections:[{id:'a',label:'Intro',beats:4},{id:'b',label:'Verse',beats:4}]})
  lab.pieces.find(p => p.id === 'w:b1').active = true
  lab.instruments['w:b1'] = { ...lab.instruments['w:b1'], pianoRolls: [noteRoll([0, null])], arrangement: { restart: true, sections: {
    a:{variation:0,transpose:0,active:true},b:{variation:0,transpose:0,active:false},
  } } }
  let seconds = .2
  const runtime = new MusicRuntime(() => {}, error => { throw error })
  runtime.api = { ...api, getAudioContext: () => ({ currentTime: seconds }), getSuperdoughAudioController: () => ({ nodes: {} }) }
  runtime.scheduler = { started: true, lastBegin: 0, lastTick: 0, latency: 0, cps: 1 }
  runtime.state = creative.creativeSnapshot(lab, true)
  runtime.voices = new Map(voiceSpecs(runtime.state, null).map(v => [v.key, v]))
  runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'note')
  assert.equal(runtime.monitor.getSnapshot().tracks['w:e1'].status, 'inactive')
  seconds = .75; runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'rest')
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].events.length, 1, 'a rhythmic rest keeps the earlier onset in the displayed bar')
  seconds = 1.2; runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'masked')
  assert.deepEqual(runtime.monitor.getSnapshot().tracks['w:b1'].events, [], 'a muted performance section contains no events')
  seconds = 2.2; runtime.publishFrame()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].status, 'note')
  runtime.scheduler = null; runtime.dispose()
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
  assert.equal(patternUpdates(), 1) // output gating, not a new accompaniment pattern
  let fullRefreshes = 0
  const refresh = runtime.refresh.bind(runtime)
  runtime.refresh = () => { fullRefreshes++; return refresh() }
  for (const square of ['f4', 'g4', 'h4', 'h5', 'g5']) {
    runtime.audition('w:g1', square); await Promise.resolve()
  }
  assert.equal(attacks.length, 6)
  assert.equal(fullRefreshes, 0, 'crossing squares must not rebuild accompaniment')
  assert.equal(patternUpdates(), 1)
  assert.equal(manualDisconnects(), 0, 'crossing squares must reuse the manual audio graph')
  runtime.endAudition()
  assert.equal(manualDisconnects(), 1, 'releasing the piece removes its isolated manual graph')
  assert.equal(patternUpdates(), 1)
  runtime.dispose()
})

test('drag suspends that voice, triggers once per entered square and restores its loop', async () => {
  const { runtime, attacks, pattern, advance } = await manualRuntime()
  runtime.update(state(['Nf3', 'Nc6']))
  runtime.audition('w:g1', 'f3')
  await Promise.resolve()
  assert.equal(attacks.length, 1)
  const held = pattern().queryArc(0, 16).find(h => h.value.ccVoice === 'w:g1:loop')
  assert.ok(held, 'the original loop stays compiled at the same musical phase')
  runtime.triggerLoop(held, 0, .1, .5, 0)
  assert.equal(attacks.length, 1, 'new loop attacks from the held piece are suppressed')
  runtime.audition('w:g1', 'f3'); await Promise.resolve()
  assert.equal(attacks.length, 1)
  runtime.audition('w:g1', 'g4'); await Promise.resolve()
  assert.equal(attacks.length, 2)
  assert.notEqual(attacks[0].note, attacks[1].note)
  advance(10)
  assert.equal(attacks.length, 2)
  assert.equal(runtime.monitor.getSnapshot().tracks['w:g1'].status, 'rest')
  assert.equal(runtime.monitor.getSnapshot().tracks['w:g1'].manual, true)
  runtime.releaseAudition()
  runtime.triggerLoop(held, 0, .1, .5, 10)
  assert.equal(attacks.length, 3, 'release restores future loop attacks without waiting for the manual tail')
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

test('releasing a Creative tap lets its first manual attack start before ending the voice', async () => {
  const { runtime, attacks, manualDisconnects } = await manualRuntime()
  runtime.update(state())
  runtime.audition('w:e1', 'e1')
  runtime.releaseAudition()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(attacks.length, 1, 'a quick tap must submit its note after release')
  assert.equal(manualDisconnects(), 0, 'release preserves the short note tail')
  runtime.endAudition()
  assert.equal(manualDisconnects(), 1, 'explicit cancellation removes that tail')
  runtime.dispose()
})

test('ready manual clicks are synchronous and never refresh or start/change the transport', async () => {
  const {runtime, attacks, patternUpdates} = await manualRuntime()
  runtime.scheduler.started = false
  runtime.update({...state(), playing:false})
  const updates = patternUpdates()
  runtime.api.getAudioContext = () => ({state:'running', currentTime:0})
  runtime.refresh = () => assert.fail('manual gestures must not refresh accompaniment')
  runtime.scheduler.start = () => assert.fail('manual gestures must not start the clock')
  runtime.scheduler.setCps = () => assert.fail('manual gestures must not change tempo')
  runtime.audition('w:b1','b1')
  assert.equal(attacks.length,1, 'ready sound is submitted inside the gesture, not a later promise')
  assert.equal(runtime.scheduler.started,false)
  assert.equal(runtime.monitor.getSnapshot().tracks['w:b1'].manual,true)
  runtime.releaseAudition();runtime.endAudition()
  assert.equal(patternUpdates(),updates)
  runtime.dispose()
})

test('manual audio unlock prepares the graph without refreshing the musical transport', async () => {
  const runtime = new MusicRuntime(()=>{},error=>{throw error})
  runtime.initialize = async () => { runtime.api = {getAudioContext:()=>({state:'running'})} }
  runtime.refresh = () => assert.fail('manual unlock must not start/reconfigure the clock')
  await runtime.unlock(false)
  runtime.dispose()
})

test('a disabled piece stays inactive in the monitor even while the global clock runs', async () => {
  const {runtime, pattern, advance} = await manualRuntime()
  const input=state(['Nf3'])
  input.instruments={'w:g1':{...model.instrumentFor(input.pieces.find(p=>p.id==='w:g1')),loopEnabled:false}}
  runtime.update(input);advance(1)
  assert.equal(pattern().queryArc(0,4).length,0)
  assert.equal(runtime.monitor.getSnapshot().running,true)
  assert.equal(runtime.monitor.getSnapshot().tracks['w:g1'].status,'inactive')
  runtime.audition('w:g1','f3');await Promise.resolve()
  runtime.releaseAudition()
  assert.equal(runtime.monitor.getSnapshot().tracks['w:g1'].status,'inactive')
  runtime.dispose()
})

test('a released first-use sample can finish its tap but explicit cancellation discards it', async () => {
  const loader=loadTs('lib/music/strudel-loader.ts'),original=loader.ensureSample
  let finish
  loader.ensureSample=()=>new Promise(resolve=>{finish=resolve})
  const {runtime,attacks}=await manualRuntime()
  const input=state()
  input.instruments={'w:b1':{...model.instrumentFor(input.pieces.find(p=>p.id==='w:b1')),source:{kind:'sample',bank:'chicken-guitars-v1',asset:'bass',variant:0,pitched:true}}}
  try {
    runtime.update(input);runtime.audition('w:b1','b1');await Promise.resolve()
    runtime.releaseAudition();finish();await new Promise(resolve=>setImmediate(resolve))
    assert.equal(attacks.length,1)
    runtime.endAudition()
    runtime.audition('w:b1','b1');await Promise.resolve();runtime.endAudition()
    finish();await new Promise(resolve=>setImmediate(resolve))
    assert.equal(attacks.length,1,'cancelled notes must not appear later')
  } finally { runtime.dispose();loader.ensureSample=original }
})

test('a manual note cancelled during Drive setup cannot recreate its output later', async () => {
  const {runtime,attacks}=await manualRuntime()
  const input=state();input.instruments={'w:b1':{...model.instrumentFor(input.pieces.find(p=>p.id==='w:b1')),distortion:1}}
  runtime.update(input)
  let ready;runtime.workletsReady=new Promise(resolve=>{ready=resolve})
  runtime.audition('w:b1','b1');await Promise.resolve();runtime.endAudition()
  ready();await new Promise(resolve=>setImmediate(resolve))
  assert.equal(attacks.length,0)
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
