import { msg } from '@/lib/i18n'
import type { MusicPulse } from './runtime-types'
import { getSimultaneousPulses } from './pulse-preference'

export type VoiceStatus = 'inactive' | 'paused' | 'solo-muted' | 'loading' | 'error' | 'masked' | 'rest' | 'note'
export interface NoteEvent { start: number; end: number; note: number | null; gain: number }
export interface TrackFrame {
  manual?: boolean
  status: VoiceStatus
  notes: (number | null)[]
  events: NoteEvent[]
  values: Partial<Record<'gain' | 'lpf' | 'pan' | 'room' | 'delay', number>>
}
export interface TransportFrame { bpm:number; targetBpm:number; meter:import('./meter').Meter; scale:string[]; harmony:HarmonyPlanId; harmonicRoot?:number; authoredHarmony?:boolean; sectionLabel?:string; nextSectionId?:string; ramp?:{from:number;target:number;start:number;end:number;progress:number}; pending:{id:string;cycle:number;trigger:string}[] }
export interface MusicFrame { transport?:TransportFrame; running: boolean; cycle: number; beat: number; section: number; tracks: Record<string, TrackFrame> }
export const EMPTY_MUSIC_FRAME: MusicFrame = { running: false, cycle: 0, beat: 1, section: 0, tracks: {} }

/** A transport clock or a tactile note is not evidence that this piece is looping. */
export function isLoopRunning(frame: MusicFrame, id: string, loopEnabled = true) {
  const track = frame.tracks[id]
  return loopEnabled && frame.running && !track?.manual && ['note', 'rest', 'masked'].includes(track?.status ?? '')
}

// Subscribers are tiny playback views. Clock ticks never rebuild the editor,
// chess analysis or the audio patterns.
export function createMusicMonitor() {
  let frame = EMPTY_MUSIC_FRAME
  let deferred: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  const notify = () => { if (deferred) clearTimeout(deferred); deferred = undefined; listeners.forEach(listener => listener()) }
  return {
    hasSubscribers: () => listeners.size > 0,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => frame,
    getServerSnapshot: () => EMPTY_MUSIC_FRAME,
    /** `later` keeps the frame current but renders subscribers in the next task,
     * after an audio gesture has finished handing its attack to Superdough. */
    publish: (next: MusicFrame, later = false) => {
      frame = next
      if (!later) notify()
      else deferred ??= setTimeout(notify, 0)
    },
  }
}
export type MusicMonitor = ReturnType<typeof createMusicMonitor>

// Musical flashes are intentionally kept outside React page state. A pulse may
// arrive several times per second; only the tiny board overlay should subscribe.
export function createMusicPulseMonitor() {
  const empty: readonly MusicPulse[] = []
  let snapshot = empty
  const active = new Map<MusicPulse['square'], { pulse: MusicPulse; expires: number }>()
  let timer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach(listener => listener())
  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    active.clear()
    if (snapshot === empty) return
    snapshot = empty
    notify()
  }
  const update = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    const now = performance.now()
    let earliest = Infinity
    for (const [square, entry] of active) {
      if (entry.expires <= now) active.delete(square)
      else earliest = Math.min(earliest, entry.expires)
    }
    if (Number.isFinite(earliest)) timer = setTimeout(update, Math.ceil(earliest - now))
    snapshot = active.size ? Array.from(active.values(), entry => entry.pulse) : empty
    notify()
  }
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => empty,
    publish: (events: readonly MusicPulse[]) => {
      if (!events.length) return clear()
      if (!getSimultaneousPulses()) active.clear()
      const now = performance.now()
      for (const pulse of events) {
        const expires = now + Math.max(80, Math.min(350, pulse.duration * 1000))
        const previous = active.get(pulse.square)
        active.set(pulse.square, { pulse, expires: Math.max(expires, previous?.expires ?? 0) })
      }
      update()
    },
    clear,
  }
}
export type MusicPulseMonitor = ReturnType<typeof createMusicPulseMonitor>
export const VOICE_STATUS_LABELS: Record<VoiceStatus, string> = {
  inactive: msg('Inactive'), paused: msg('Transport paused'), 'solo-muted': msg('Outside solo'), loading: msg('Loading sample'),
  error: msg('Sample error'), masked: msg('Section rest'), rest: msg('Phrase rest'), note: msg('Playing'),
}
import type { HarmonyPlanId } from './harmony'
