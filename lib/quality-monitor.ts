// "Ajustar automaticamente": while it is on, the game watches itself on any device and steps a quality
// level down when it keeps stalling. Low frame rate lowers the graphics; a late music scheduler or audio
// output glitches lower the sound; when that one is already at Baixa, the other goes down instead. It never
// raises a level. The decision is a pure function (tested in tests/quality.cases.cjs); the browser part
// below only feeds it samples.
import { getQuality, lowerQuality, subscribeQuality, type QualityKind } from './quality'

export const QUALITY_WATCH = {
  /** Frames are judged in windows this long (ms). */
  window: 4000,
  /** A window is slow under this frame rate, or with this share of its time inside stalls. */
  minFps: 24,
  stallFrame: 100,
  stallShare: .25,
  /** Slow windows in a row before the graphics go down. */
  slowWindows: 2,
  /** Late scheduler ticks or output glitches inside this span (ms) before the sound goes down. */
  troubleSpan: 15000,
  troubleCount: 3,
  /** Nothing is judged this long after the page opens or comes back, and after any level change (ms). */
  grace: 10000,
  cooldown: 15000,
}

export type QualityWatch = { slowWindows: number; trouble: number[]; quietUntil: number }
export const createQualityWatch = (now = 0): QualityWatch => ({ slowWindows: 0, trouble: [], quietUntil: now + QUALITY_WATCH.grace })

/** A finished window of frames: how many, over how long, and how much of it was spent in frames over stallFrame. */
export type FrameWindow = { frames: number; elapsed: number; stalled: number }
export const slowWindow = (w: FrameWindow) => w.elapsed > 0
  && (w.frames * 1000 / w.elapsed < QUALITY_WATCH.minFps || w.stalled / w.elapsed > QUALITY_WATCH.stallShare)

/** Feeds one frame window; 'graphics' when the frame rate stayed low for slowWindows windows in a row. */
export function judgeFrames(watch: QualityWatch, window: FrameWindow, now: number): QualityKind | null {
  if (now < watch.quietUntil) { watch.slowWindows = 0; return null }
  watch.slowWindows = slowWindow(window) ? watch.slowWindows + 1 : 0
  if (watch.slowWindows < QUALITY_WATCH.slowWindows) return null
  watch.slowWindows = 0
  return 'graphics'
}

/** Feeds one sound trouble (a late scheduler tick, an output glitch); 'sound' once they pile up. */
export function judgeTrouble(watch: QualityWatch, now: number): QualityKind | null {
  if (now < watch.quietUntil) { watch.trouble = []; return null }
  watch.trouble = [...watch.trouble.filter(at => now - at < QUALITY_WATCH.troubleSpan), now]
  if (watch.trouble.length < QUALITY_WATCH.troubleCount) return null
  watch.trouble = []
  return 'sound'
}

/** After a level changed (by the monitor or by hand) or the page came back: start judging afresh. */
export function quietWatch(watch: QualityWatch, now: number, span = QUALITY_WATCH.cooldown) {
  watch.slowWindows = 0
  watch.trouble = []
  watch.quietUntil = Math.max(watch.quietUntil, now + span)
}

/** The level that goes down for a problem: its own kind, or the other one when it is already at the lowest. */
export function lowerFor(kind: QualityKind, lower: (kind: QualityKind) => boolean = lowerQuality) {
  if (lower(kind)) return kind
  const other: QualityKind = kind === 'graphics' ? 'sound' : 'graphics'
  return lower(other) ? other : null
}

// ---------- the browser part ----------

let watch: QualityWatch | undefined
let lowered: ((kind: QualityKind) => void) | undefined
const clock = () => performance.now()
function act(kind: QualityKind | null) {
  if (!kind || !watch || !getQuality().auto) return
  const changed = lowerFor(kind)
  quietWatch(watch, clock())
  if (changed) lowered?.(changed)
}

// What the FPS counter shows next to the frame rate, counted since the page opened whether or not
// "Ajustar automaticamente" is on: late scheduler ticks and output glitches of every watched context.
const health = { late: 0, glitches: 0, musicGlitches: 0, measured: false }

/** The music transport reports a tick that came later than its look-ahead (attacks start late or are skipped). */
export function reportSchedulerLate() {
  if (typeof document === 'undefined' || document.hidden) return
  health.late++
  if (!watch || !getQuality().auto) return
  act(judgeTrouble(watch, clock()))
}

type PlaybackStats = { underrunEvents?: number; fallbackFramesEvents?: number }
const contexts = new Set<AudioContext>()
// The contexts whose glitches lower the sound level: the music engine's, the one that level changes.
const music = new WeakSet<AudioContext>()
const glitches = new WeakMap<AudioContext, number>()
/** Adds the output glitches the browser counted (AudioContext.playbackStats, where it exists) since the last look. */
function countGlitches() {
  for (const context of contexts) {
    if (context.state === 'closed') { contexts.delete(context); continue }
    const stats = (context as AudioContext & { playbackStats?: PlaybackStats }).playbackStats
    const count = stats?.underrunEvents ?? stats?.fallbackFramesEvents
    if (typeof count !== 'number') continue
    health.measured = true
    const before = glitches.get(context)
    glitches.set(context, count)
    if (before === undefined || count <= before || context.state !== 'running') continue
    health.glitches += count - before
    if (music.has(context)) health.musicGlitches += count - before
  }
}
/** Sound trouble since the page opened. `playing`: some watched context is running; `measured`: the browser counts glitches. */
export function audioHealth() {
  countGlitches()
  return { late: health.late, glitches: health.glitches, measured: health.measured, playing: [...contexts].some(context => context.state === 'running') }
}
/** Audio contexts whose output is watched for glitches: audio-focus.ts registers every context the game creates, for the counter; the music runtime marks its own, for the automatic adjustment. */
export function watchAudioOutput(context: AudioContext, isMusic = false) { contexts.add(context); if (isMusic) music.add(context) }

/** Mounted once (components/quality-monitor.tsx); onLowered hears each automatic step down. Returns its cleanup. */
export function installQualityMonitor(onLowered?: (kind: QualityKind) => void) {
  if (typeof window === 'undefined' || watch) return () => {}
  const current = watch = createQualityWatch(clock())
  lowered = onLowered
  getQuality()
  let frame = 0, start: number | undefined, last = 0, frames = 0, stalled = 0, seenGlitches = health.musicGlitches
  const reset = () => { start = undefined; frames = 0; stalled = 0 }
  const sample = (now: number) => {
    frame = requestAnimationFrame(sample)
    if (start === undefined) { start = last = now; return }
    const gap = now - last
    last = now
    frames++
    if (gap > QUALITY_WATCH.stallFrame) stalled += gap
    const elapsed = now - start
    if (elapsed < QUALITY_WATCH.window) return
    const finished = { frames, elapsed, stalled }
    reset()
    countGlitches()
    const glitched = health.musicGlitches > seenGlitches
    seenGlitches = health.musicGlitches
    if (!getQuality().auto) return
    act(judgeFrames(current, finished, now))
    if (glitched) act(judgeTrouble(current, now))
  }
  const run = () => {
    cancelAnimationFrame(frame)
    reset()
    quietWatch(current, clock(), QUALITY_WATCH.grace)
    if (!document.hidden && getQuality().auto) frame = requestAnimationFrame(sample)
  }
  // A level picked by hand or the box switched on: wait before judging again.
  const unsubscribe = subscribeQuality(run)
  document.addEventListener('visibilitychange', run)
  run()
  return () => {
    cancelAnimationFrame(frame)
    unsubscribe()
    document.removeEventListener('visibilitychange', run)
    if (watch === current) { watch = undefined; lowered = undefined }
  }
}
