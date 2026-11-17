// Plays the recorded instruments of a zone's percussion (beat-kits.ts) on the ambience's bus. The files of a kit
// are fetched and decoded the first time it is asked for; until a file is ready (or when it cannot be loaded) the
// row falls back to the synthesized drum, so the beat never goes silent. Browser only.
import { sampleUrl } from '@/lib/music/sample-format'
import { kitFiles, type DrumRow, type Kit } from './beat-kits'
import { ambienceBus, playDrum, type Drum } from './synth'

// the synthesized drum of each row, for a row with no recording loaded
const SYNTH: Record<DrumRow, Drum> = { kick: 'kick', snare: 'snare', clap: 'clap', hat: 'hat', openHat: 'openHat', shaker: 'shaker', tom: 'taiko', perc: 'wood' }

const buffers = new Map<string, AudioBuffer | 'loading' | 'failed'>()
const turn = new Map<string, number>()

function load(a: AudioContext, file: string) {
  if (buffers.has(file)) return
  buffers.set(file, 'loading')
  fetch(sampleUrl(`/samples/${file}.ogg`))
    .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then(data => a.decodeAudioData(data))
    .then(buffer => { buffers.set(file, buffer) }, () => { buffers.set(file, 'failed') })
}

// fetches every file of a kit that is not loaded yet (a no-op once they are, or with the sound off)
export function preloadKit(kit: Kit) {
  const bus = ambienceBus()
  if (bus) for (const file of kitFiles(kit)) load(bus.a, file)
}

// one hit of a row of the kit, `at` seconds from now: its takes in turn, the level and the brightness following
// how hard it is hit (a soft hit is duller, as on the instrument), a touch of chance in the level so two hits are
// never the same
export function playKitHit(kit: Kit, row: DrumRow, at = 0, vel = 1) {
  const bus = ambienceBus()
  if (!bus) return
  const voice = kit[row]
  if (!voice) { playDrum(SYNTH[row], at, vel); return }
  const takes = voice.takes ?? 1, n = turn.get(voice.file) ?? 0
  turn.set(voice.file, (n + 1) % takes)
  const file = `${voice.file}-${n % takes}`, buffer = buffers.get(file)
  if (!buffer || typeof buffer === 'string') { if (!buffer) load(bus.a, file); playDrum(SYNTH[row], at, vel); return }
  const { a, amb } = bus, t = a.currentTime + Math.max(0, at)
  const src = a.createBufferSource(); src.buffer = buffer; src.playbackRate.value = voice.rate ?? 1
  const g = a.createGain(); g.gain.value = (voice.gain ?? 1) * 0.8 * Math.pow(Math.min(1, vel), 1.4) * (0.94 + Math.random() * 0.12)
  if (vel < 0.75) {
    const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2500 + 9500 * Math.max(0, vel) / 0.75
    src.connect(lp); lp.connect(g)
  } else src.connect(g)
  g.connect(amb)
  src.start(t)
}
