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
  const listeners = new Set<() => void>()
  return {
    hasSubscribers: () => listeners.size > 0,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => frame,
    getServerSnapshot: () => EMPTY_MUSIC_FRAME,
    publish: (next: MusicFrame) => { frame = next; listeners.forEach(listener => listener()) },
  }
}
export type MusicMonitor = ReturnType<typeof createMusicMonitor>

// Musical flashes are intentionally kept outside React page state. A pulse may
// arrive several times per second; only the tiny board overlay should subscribe.
export function createMusicPulseMonitor() {
  let pulse: import('./runtime-types').MusicPulse | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach(listener => listener())
  const clear = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
    if (pulse === null) return
    pulse = null
    notify()
  }
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => pulse,
    getServerSnapshot: () => null,
    publish: (next: import('./runtime-types').MusicPulse) => {
      if (timer) clearTimeout(timer)
      pulse = next
      notify()
      timer = setTimeout(clear, Math.max(80, Math.min(350, next.duration * 1000)))
    },
    clear,
  }
}
export type MusicPulseMonitor = ReturnType<typeof createMusicPulseMonitor>
export const VOICE_STATUS_LABELS: Record<VoiceStatus, string> = {
  inactive: 'Inactive', paused: 'Transport paused', 'solo-muted': 'Outside solo', loading: 'Loading sample',
  error: 'Sample error', masked: 'Section rest', rest: 'Phrase rest', note: 'Playing',
}
import type { HarmonyPlanId } from './harmony'
