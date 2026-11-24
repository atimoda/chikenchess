// The real songs of the Guia de pássaros, played: a clip is fetched and decoded the first time it is asked for
// (public/samples/birds-v1, Opus with an AAC twin) and kept. They play on the shared audio context, on the mixer's
// "Efeitos do cenário" layer. The guide's panel plays one at a time (a new one cuts the last short); the souls flying
// free and the birds whistling (lib/pigchicken/birds.ts) sing over each other, a few at most.
import { sampleUrl } from '@/lib/music/sample-format'
import { BIRD_SONGS_FOLDER, pickBirdClip, type BirdClip } from './bird-guide'
import { mixGain } from './mixer'
import { audio } from './sfx'

const buffers = new Map<string, Promise<AudioBuffer | null>>()
function load(a: AudioContext, file: string) {
  let got = buffers.get(file)
  if (!got) {
    got = fetch(sampleUrl(`/${BIRD_SONGS_FOLDER}/${file}.ogg`)).then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))))).then(data => a.decodeAudioData(data)).catch(() => { buffers.delete(file); return null })
    buffers.set(file, got)
  }
  return got
}

type Playing = { src: AudioBufferSourceNode; gain: GainNode }
const BASE = 0.9 // a clip at full volume, before the mixer
const MAX_FREE = 3 // songs at once out of the guide (the souls' and the birds' whistles)
let solo: Playing | null = null, asked = 0
const free = new Set<Playing>()

function start(a: AudioContext, buf: AudioBuffer, volume: number): Playing | null {
  const level = BASE * Math.max(0, Math.min(1, volume)) * mixGain('effects')
  if (level <= 0) return null
  const src = a.createBufferSource(), gain = a.createGain()
  src.buffer = buf; gain.gain.value = level
  src.connect(gain); gain.connect(a.destination)
  src.start()
  return { src, gain }
}
function fade(a: AudioContext, p: Playing) {
  const t = a.currentTime
  p.gain.gain.cancelScheduledValues(t); p.gain.gain.setValueAtTime(p.gain.gain.value, t); p.gain.gain.linearRampToValueAtTime(0, t + 0.08)
  try { p.src.stop(t + 0.1) } catch { /* already over */ }
}

/** The guide's player: this clip now, alone (the one playing before is cut short). onEnd: it played to its end or was cut. */
export function playBirdClip(clip: BirdClip, onEnd?: () => void) {
  const a = audio(), mine = ++asked
  if (!a) { onEnd?.(); return }
  if (solo) { fade(a, solo); solo = null }
  void load(a, clip.file).then(buf => {
    // (another clip was asked for while this one loaded)
    if (mine !== asked || !buf) { onEnd?.(); return }
    const p = start(a, buf, 1)
    if (!p) { onEnd?.(); return }
    solo = p
    p.src.onended = () => { if (solo === p) solo = null; onEnd?.() }
  })
}
export function stopBirdClip() {
  asked++
  const a = audio()
  if (a && solo) fade(a, solo)
  solo = null
}

/** A soul flying free (or a bird whistling) sings like its real bird: one of its clips at random, at `volume` (0 to 1: how near it is). */
export function playBirdSong(bird: string, volume: number) {
  const a = audio(), clip = pickBirdClip(bird)
  if (!a || !clip || volume <= 0.02 || free.size >= MAX_FREE) return
  void load(a, clip.file).then(buf => {
    if (!buf || free.size >= MAX_FREE) return
    const p = start(a, buf, volume)
    if (!p) return
    free.add(p)
    p.src.onended = () => { free.delete(p) }
  })
}
