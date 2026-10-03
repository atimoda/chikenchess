// Structural load and pattern-query timing, never a physical-device/DSP benchmark.
const { performance } = require('node:perf_hooks')
const { loadTs, strudel } = require('../tests/helpers/music.cjs')
const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
const { creativeSnapshot } = loadTs('lib/music/creative.ts')
const { voiceSpecs } = loadTs('lib/music/voice-spec.ts')
const { compileVoice } = loadTs('lib/music/pattern-compiler.ts')
const { beatsPerBar } = loadTs('lib/music/meter.ts')
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
;(async () => {
  const api = await strudel()
  const results = []
  for (const city of process.argv.slice(2).length ? process.argv.slice(2) : ['memphis-1967', 'manchester-1999', 'detroit', 'vienna']) {
    const kit = defaultCityKit(city)
    const snapshot = creativeSnapshot(kit, true)
    const full = { ...snapshot, pieces: snapshot.pieces.map(piece => ({ ...piece, active: true })) }
    const allVoices = voiceSpecs(full, null, 2)
    const cycles = kit.arrangement.sections.reduce((sum, section) => sum + section.beats, 0) / beatsPerBar(kit.meter)
    const cps = kit.bpm / (60 * beatsPerBar(kit.meter))
    for (const count of [4, 8, 16, 32]) {
      // Stable piece order is a fixture, not a replay of an actual match.
      const voices = allVoices.slice(0, count)
      const before = performance.now()
      const patterns = voices.map(voice => compileVoice(api, voice))
      const compileMs = performance.now() - before
      let events = []
      const timings = []
      for (let repeat = 0; repeat < 4; repeat++) {
        const start = performance.now()
        const queried = patterns.flatMap(pattern => Array.from({ length: Math.ceil(cycles) }, (_, cycle) =>
          pattern.queryArc(cycle, Math.min(cycle + 1, cycles), { _cps: cps }).filter(hap => hap.hasOnset())).flat())
        if (repeat) timings.push(performance.now() - start)
        events = queried
      }
      const notes = events.flatMap(hap => (Array.isArray(hap.value.note) ? hap.value.note : [hap.value.note]).map(() => hap))
      const onsetCounts = new Map()
      for (const hap of notes) {
        const key = Number(hap.whole?.begin ?? hap.part.begin).toFixed(8)
        onsetCounts.set(key, (onsetCounts.get(key) ?? 0) + 1)
      }
      results.push({ city, voices: voices.length, effectBuses: 2, seconds: +(cycles / cps).toFixed(2),
        notes: notes.length, notesPerSecond: +(notes.length * cps / cycles).toFixed(2),
        maxNotesAtSameOnset: Math.max(0, ...onsetCounts.values()),
        notesWithDrive: notes.filter(hap => Number(String(hap.value.distort ?? 0).split(':')[0]) > 0).length,
        notesWithReverb: notes.filter(hap => Number(hap.value.room ?? 0) > 0).length,
        notesWithDelay: notes.filter(hap => Number(hap.value.delay ?? 0) > 0).length,
        sampleVoices: voices.filter(voice => voice.instrument.source?.kind === 'sample').length,
        compileMs: +compileMs.toFixed(2), queryMsPerCycle: +(median(timings) / cycles).toFixed(2) })
    }
  }
  console.log(JSON.stringify({ limitations: 'Node + real Strudel queries; no audio rendering, phone timings, clipping, memory or thermal measurements. Stable slot subset; saved kits and moves can produce different loads.', results }, null, 2))
})().catch(error => { console.error(error); process.exitCode = 1 })
