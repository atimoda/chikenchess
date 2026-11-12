// Structural check of the World ballads kits: compile time per piece, registers, scale and density.
// It does not judge how the music sounds. Run: node scripts/ballads/check.cjs [city ...]
const { loadTs, strudel } = require('../../tests/helpers/music.cjs')
const { voiceSpecs, compileVoice } = loadTs('lib/music/runtime.ts')
const creative = loadTs('lib/music/creative.ts')
const { defaultCityKit } = loadTs('lib/music/city-kits.ts')
const { SCALE_INTERVALS } = loadTs('lib/music/scales.ts')
const NOTE = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 }
const name = midi => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1)
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['manchester-1999', 'dublin-1990', 'new-orleans-1953', 'memphis-1967', 'london-1977']

async function main() {
  const api = await strudel()
  for (const id of IDS) {
    const kit = defaultCityKit(id)
    const total = kit.arrangement.sections.reduce((n, s) => n + s.beats, 0) / ({ '6/8': 2, '12/8': 4, '3/4': 3, '5/4': 5, '7/4': 7 }[kit.meter] ?? 4)
    const pcs = new Set(SCALE_INTERVALS[kit.scale].map(i => (i + (NOTE[kit.root] ?? 0)) % 12))
    console.log(`\n${id} · ${kit.name} · ${kit.meter} ${kit.bpm} BPM · ${kit.root} ${kit.scale} · ${total} bars`)
    let slowest = 0, sum = 0, all = 0, compileMs = 0
    for (const voice of voiceSpecs(creative.creativeSnapshot(kit, true), null)) {
      if (voice.piece.color !== 'w') continue
      const t0 = performance.now()
      const pattern = compileVoice(api, voice)
      compileMs += performance.now() - t0
      const events = pattern.queryArc(0, total).filter(h => h.hasOnset())
      const ms = performance.now() - t0
      slowest = Math.max(slowest, ms); sum += ms; all += events.length
      const notes = events.map(h => Number(h.value.note)).filter(Number.isFinite)
      const bad = voice.unpitched ? 0 : notes.filter(n => !pcs.has(((Math.round(n) % 12) + 12) % 12)).length
      const range = notes.length ? `${name(Math.round(Math.min(...notes)))}–${name(Math.round(Math.max(...notes)))}` : '—'
      console.log(`  ${voice.piece.origin} ${kit.instruments[voice.piece.id].name.padEnd(20)} ${String(events.length).padStart(5)} ev  ${range.padEnd(10)} ${bad ? `${bad} out of scale ` : ''}${ms.toFixed(0)} ms`)
    }
    console.log(`  total ${all} events (${(all / total).toFixed(1)} per bar), compile ${compileMs.toFixed(0)} ms, compile+query of the whole form ${sum.toFixed(0)} ms, slowest piece ${slowest.toFixed(0)} ms`)
  }
}
main().catch(error => { console.error(error); process.exit(1) })
