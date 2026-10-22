// Shared bundle/sample caches. Keep lazy loading here so importing data stays inert.
import { sampleRegistration, sampleUrl, type SampleSource } from './sample-banks'
import type { Strudel } from './runtime-types'
import { isConstrainedDevice } from '../performance'

let library: Promise<Strudel> | undefined
export function loadLibrary() {
  return library ??= import('@strudel/web').then(s => {
    // Phones render audio in small blocks with 'interactive' latency; under load
    // a late block is heard as a crackle. 'playback' asks for a larger output
    // buffer before Strudel lazily creates its own context.
    if (isConstrainedDevice() && typeof AudioContext !== 'undefined') {
      try { s.setAudioContext(new AudioContext({ latencyHint: 'playback' })) } catch { /* Strudel creates its default context. */ }
    }
    s.miniAllStrings()
    s.registerSynthSounds()
    return s
  }).catch(error => { library = undefined; throw error })
}

const sampleLoads = new Map<string, Promise<void>>()
export const loadedSamples = new Set<string>()
export function ensureSample(api: Strudel, source: SampleSource) {
  const sample = sampleRegistration(source)
  let pending = sampleLoads.get(sample.sound)
  if (!pending) {
    pending = (async () => {
      await api.samples(sample.map)
      await Promise.all(sample.files.map(file => api.loadBuffer(sampleUrl(file), api.getAudioContext(), sample.sound)))
      loadedSamples.add(sample.sound)
    })()
    sampleLoads.set(sample.sound, pending)
  }
  return pending
}
