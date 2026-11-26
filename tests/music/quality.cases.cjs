const { test } = require('node:test')
const assert = require('node:assert/strict')
const { loadTs, strudel, memoryStorage } = require('../helpers/music.cjs')
const quality = loadTs('lib/quality.ts')
const monitor = loadTs('lib/quality-monitor.ts')
const { soundProfile } = loadTs('lib/music/sound-profile.ts')
const { MusicTransport } = loadTs('lib/music/transport.ts')
const { MusicRuntime } = loadTs('lib/music/runtime.ts')
const { createFrameGate, LOW_GRAPHICS_FPS } = loadTs('lib/game-frame.ts')
const model = loadTs('lib/music/model.ts')

// A browser-like window for the store; the levels return to the device's own before it is removed.
async function withBrowser(run) {
  const memory = new Map(), previous = globalThis.window
  globalThis.window = { localStorage: memoryStorage(memory), addEventListener() {}, removeEventListener() {} }
  quality.setQualityAuto(true)
  try { await run(memory) } finally {
    quality.setQualityAuto(true)
    if (previous === undefined) delete globalThis.window; else globalThis.window = previous
  }
}

test('quality starts from the device and keeps only the levels someone changed', () => {
  assert.deepEqual(quality.detectQuality(false), { graphics: 'high', sound: 'high' })
  assert.deepEqual(quality.detectQuality(true), { graphics: 'medium', sound: 'medium' })
  const phone = quality.detectQuality(true)
  assert.deepEqual(quality.resolveQuality(null, phone), { graphics: 'medium', sound: 'medium', auto: true })
  assert.deepEqual(quality.resolveQuality({ sound: 'high', auto: false }, phone), { graphics: 'medium', sound: 'high', auto: false })
  assert.deepEqual(quality.resolveQuality({ graphics: 'ultra', sound: 3 }, phone), { graphics: 'medium', sound: 'medium', auto: true })
  assert.deepEqual(['high', 'medium', 'low', 'lowest'].map(quality.lowerLevel), ['medium', 'low', 'low', 'lowest'])
  // Baixíssima exists only for the graphics, and only when chosen
  assert.deepEqual(quality.resolveQuality({ graphics: 'lowest', sound: 'lowest' }, phone), { graphics: 'lowest', sound: 'medium', auto: true })
  assert.deepEqual(quality.qualityLevels('graphics'), ['high', 'medium', 'low', 'lowest'])
  assert.deepEqual(quality.qualityLevels('sound'), ['high', 'medium', 'low'])
  assert.equal(quality.QUALITY_LABELS.lowest, 'Baixíssima')
  assert.deepEqual(['high', 'medium', 'low', 'lowest'].map(quality.isLowGraphics), [false, false, true, true])
})

test('Baixíssima is kept, the monitor never steps into it and it lowers the sound instead', async () => {
  await withBrowser(memory => {
    quality.setQualityLevel('graphics', 'lowest')
    assert.equal(quality.graphicsQuality(), 'lowest')
    assert.deepEqual(JSON.parse(memory.get('chickenchess:quality:v2')), { auto: true, graphics: 'lowest' })
    assert.equal(quality.lowerQuality('graphics'), false)
    assert.equal(monitor.lowerFor('graphics'), 'sound')
    assert.equal(quality.soundQuality(), 'medium')
    assert.equal(quality.graphicsQuality(), 'lowest')
    quality.setQualityLevel('sound', 'lowest')
    assert.equal(quality.soundQuality(), 'low', 'the sound has no Baixíssima')
    quality.setQualityLevel('graphics', 'low')
    assert.equal(quality.lowerQuality('graphics'), false, 'automatic steps stop at Baixa')
  })
})

test('manual levels persist, automatic steps stop at the lowest and turning auto on returns to the device', async () => {
  await withBrowser(memory => {
    let changes = 0
    const stop = quality.subscribeQuality(() => changes++)
    assert.deepEqual(quality.getQuality(), { graphics: 'high', sound: 'high', auto: true })
    quality.setQualityLevel('graphics', 'low')
    assert.equal(quality.getQuality().graphics, 'low')
    assert.equal(quality.getQuality().auto, true, 'a manual level leaves the automatic adjustment on')
    assert.deepEqual(JSON.parse(memory.get('chickenchess:quality:v2')), { auto: true, graphics: 'low' })
    assert.equal(quality.lowerQuality('graphics'), false)
    assert.equal(quality.lowerQuality('sound'), true)
    assert.equal(quality.soundQuality(), 'medium')
    quality.setQualityAuto(false)
    assert.deepEqual(quality.getQuality(), { graphics: 'low', sound: 'medium', auto: false })
    quality.setQualityAuto(true)
    assert.deepEqual(quality.getQuality(), { graphics: 'high', sound: 'high', auto: true })
    assert.equal(changes, 4)
    stop()
  })
})

test('the monitor steps down only for this visit and v1 keeps only what was surely chosen by hand', async () => {
  await withBrowser(memory => {
    assert.equal(quality.lowerQuality('graphics'), true)
    assert.equal(quality.lowerQuality('graphics'), true)
    assert.equal(quality.graphicsQuality(), 'low')
    assert.deepEqual(JSON.parse(memory.get('chickenchess:quality:v2')), { auto: true }, 'nothing of the steps down is saved')
    quality.setQualityLevel('graphics', 'high')
    assert.equal(quality.graphicsQuality(), 'high', 'a level by hand replaces the step down')
    assert.equal(quality.lowerQuality('sound'), true)
    quality.setQualityAuto(false)
    assert.deepEqual(JSON.parse(memory.get('chickenchess:quality:v2')), { auto: false, graphics: 'high', sound: 'medium' }, 'turning auto off keeps the levels in use')
  })
  assert.deepEqual(quality.fromLegacy({ auto: true, graphics: 'low', sound: 'medium' }), {})
  assert.deepEqual(quality.fromLegacy({ graphics: 'lowest', sound: 'low' }), { graphics: 'lowest' })
  assert.deepEqual(quality.fromLegacy({ auto: false, graphics: 'low', sound: 'medium' }), { auto: false, graphics: 'low', sound: 'medium' })
  assert.deepEqual(quality.fromLegacy(null), {})
})

test('the monitor lowers graphics after sustained slow frames and sound after repeated late audio', () => {
  const W = monitor.QUALITY_WATCH
  const slow = { frames: 60, elapsed: 4000, stalled: 0 }, fine = { frames: 230, elapsed: 4000, stalled: 0 }
  const stalls = { frames: 200, elapsed: 4000, stalled: 1400 }
  assert.equal(monitor.slowWindow(slow), true)
  assert.equal(monitor.slowWindow(fine), false)
  assert.equal(monitor.slowWindow(stalls), true, 'long stalls count even with a good average')
  assert.equal(monitor.slowWindow({ frames: 120, elapsed: 4000, stalled: 0 }), false, '30 fps is not slow')
  const watch = monitor.createQualityWatch(0)
  assert.equal(monitor.judgeFrames(watch, slow, 4000), null, 'nothing is judged right after opening')
  assert.equal(monitor.judgeFrames(watch, slow, 8000), null)
  let now = W.grace
  assert.equal(monitor.judgeFrames(watch, slow, now += 4000), null)
  assert.equal(monitor.judgeFrames(watch, fine, now += 4000), null, 'a good window starts the count again')
  assert.equal(monitor.judgeFrames(watch, slow, now += 4000), null)
  assert.equal(monitor.judgeFrames(watch, stalls, now += 4000), 'graphics')
  monitor.quietWatch(watch, now)
  assert.equal(monitor.judgeFrames(watch, slow, now + 4000), null, 'after a change it waits before judging again')
  assert.equal(monitor.judgeFrames(watch, slow, now + 8000), null)
  now += W.cooldown
  assert.equal(monitor.judgeTrouble(watch, now), null)
  assert.equal(monitor.judgeTrouble(watch, now + 1000), null)
  assert.equal(monitor.judgeTrouble(watch, now + W.troubleSpan + 500), null, 'old trouble expires')
  assert.equal(monitor.judgeTrouble(watch, now + W.troubleSpan + 900), 'sound')
  const levels = { graphics: 'low', sound: 'medium' }
  const lower = kind => levels[kind] === 'low' ? false : (levels[kind] = quality.lowerLevel(levels[kind]), true)
  assert.equal(monitor.lowerFor('graphics', lower), 'sound', 'graphics already at the lowest: the sound goes down')
  assert.equal(monitor.lowerFor('sound', lower), null)
})

test('each sound level keeps its buses, reverb, polyphony and look-ahead', () => {
  assert.deepEqual(soundProfile('high'), { effectBuses: 4, sharedReverb: false, reverb: true, lite: false, polyphony: 64, latency: .1, interval: 50, visualRate: 15, monitorInterval: 100 })
  assert.deepEqual(soundProfile('medium'), { effectBuses: 2, sharedReverb: true, reverb: true, lite: true, polyphony: 32, latency: .3, interval: 100, visualRate: 8, monitorInterval: 150 })
  const low = soundProfile('low')
  assert.deepEqual([low.effectBuses, low.sharedReverb, low.reverb, low.lite, low.polyphony], [2, false, false, true, 24])
})

test('the transport reports a tick that came later than its look-ahead and accepts new timing', async () => {
  const api = await strudel()
  let now = 0
  const late = []
  const transport = new MusicTransport({ getTime: () => now, latency: .1, interval: 50, onBoundary() {}, onError(error) { throw error }, onTrigger() {}, onLate: seconds => late.push(seconds) })
  await transport.setPattern(api.note('c e g b'))
  await transport.start()
  now = .05; transport.tick()
  now = .12; transport.tick()
  assert.deepEqual(late, [], 'ticks inside the look-ahead are on time')
  now = .5; transport.tick()
  assert.equal(late.length, 1)
  assert.ok(Math.abs(late[0] - .28) < 1e-6)
  transport.setTiming(.3, 100)
  assert.equal(transport.latency, .3)
  now = .55; transport.tick()
  now = .8; transport.tick()
  assert.equal(late.length, 1, 'a 250 ms gap fits the longer look-ahead')
  transport.stop()
})

test('the low graphics level paces the shared game frames at 30 FPS', () => {
  assert.equal(LOW_GRAPHICS_FPS, 30)
  for (const hz of [60, 120]) {
    const gate = createFrameGate()
    let delivered = 0
    for (let i = 0; i < hz * 5; i++) if (gate(Math.round(i * 10000 / hz) / 10, true, 1000 / LOW_GRAPHICS_FPS)) delivered++
    assert.equal(delivered / 5, 30)
  }
})

test('a running match follows the sound level: buses regroup and Baixa sends loops out dry', async () => {
  const api = await strudel()
  await withBrowser(async () => {
    const nodes = {}, sent = [], timing = []
    const controller = { nodes, getOrbit(id) { return nodes[id] ??= { disconnect() {}, output: { gain: { setTargetAtTime() {} } } } } }
    const runtime = new MusicRuntime(() => {}, error => { throw error })
    runtime.scheduler = { started: true, lastBegin: 0, lastTick: 0, latency: 0, cps: .5, setCps(v) { this.cps = v }, setPattern() {}, stop() {}, setTiming(latency, interval) { timing.push([latency, interval]) } }
    let polyphony
    runtime.api = { ...api, getAudioContext: () => ({ currentTime: 0 }), getSuperdoughAudioController: () => controller,
      setMaxPolyphony: value => { polyphony = value }, webaudioOutput: async hap => { sent.push(hap.value.room) } }
    runtime.publishFrame = () => {}
    const full = { pieces: model.piecesFromHistory([]).map(piece => ({ ...piece, active: true })), scale: ['C4', 'Eb4', 'F4', 'G4', 'Bb4'], bpm: 118, volume: .8, playing: true, effects: {} }
    runtime.update(full)
    const orbits = () => [...new Set([...runtime.voices.values()].map(voice => voice.orbit))].sort()
    assert.deepEqual(orbits(), [0, 1, 2, 3])
    const voice = [...runtime.voices.values()][0]
    const wet = runtime.patternFor(voice).queryArc(0, 8).find(hap => hap.hasOnset() && Number(hap.value.room) > 0)
    assert.ok(wet, 'the fixture has a note with reverb')
    runtime.triggerLoop(wet, 0, .1, .5, 0)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(sent.at(-1), wet.value.room)

    quality.setQualityLevel('sound', 'low')
    assert.deepEqual(orbits(), [0, 1])
    assert.equal(polyphony, 24)
    assert.deepEqual(timing.at(-1), [.3, 100])
    assert.equal(runtime.voices.size, 32, 'no voice is dropped')
    const lowVoice = runtime.voices.get(voice.key)
    const again = runtime.patternFor(lowVoice).queryArc(0, 8).find(hap => hap.hasOnset() && Number(hap.value.room) > 0)
    runtime.triggerLoop(again, 0, .1, .5, 0)
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(sent.at(-1), 0)
    assert.equal(Number(again.value.room) > 0, true, 'the compiled note keeps its reverb amount')

    quality.setQualityLevel('sound', 'high')
    assert.deepEqual(orbits(), [0, 1, 2, 3])
    assert.equal(polyphony, 64)
    runtime.dispose()
  })
})

test('the FPS counter reads late scheduler ticks and output glitches since the page opened', () => {
  const before = monitor.audioHealth()
  assert.deepEqual([before.playing, before.measured], [false, false], 'nothing is shown before any sound runs')
  const sfx = { state: 'running', playbackStats: { underrunEvents: 4 } }
  const music = { state: 'suspended', playbackStats: { underrunEvents: 0 } }
  const old = { state: 'running' }
  monitor.watchAudioOutput(sfx); monitor.watchAudioOutput(music, true); monitor.watchAudioOutput(old)
  let health = monitor.audioHealth()
  assert.deepEqual([health.playing, health.measured, health.glitches - before.glitches], [true, true, 0], 'glitches from before the first look are not counted')
  sfx.playbackStats.underrunEvents = 7
  music.playbackStats.underrunEvents = 2
  health = monitor.audioHealth()
  assert.equal(health.glitches - before.glitches, 3, 'a suspended context does not count')
  music.state = 'running'
  music.playbackStats.underrunEvents = 5
  assert.equal(monitor.audioHealth().glitches - before.glitches, 6)
  const previous = globalThis.document
  try {
    globalThis.document = { hidden: false }
    monitor.reportSchedulerLate(); monitor.reportSchedulerLate()
    globalThis.document = { hidden: true }
    monitor.reportSchedulerLate()
  } finally { if (previous === undefined) delete globalThis.document; else globalThis.document = previous }
  assert.equal(monitor.audioHealth().late - before.late, 2, 'a hidden tab throttles its timers: those ticks are not counted')
  sfx.state = music.state = old.state = 'closed'
  assert.equal(monitor.audioHealth().playing, false)
})
