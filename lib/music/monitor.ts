export type VoiceStatus = 'inactive' | 'paused' | 'solo-muted' | 'loading' | 'error' | 'masked' | 'rest' | 'note'
export interface NoteEvent { start: number; end: number; note: number | null; gain: number }
export interface TrackFrame {
  status: VoiceStatus
  notes: (number | null)[]
  events: NoteEvent[]
  values: Partial<Record<'gain' | 'lpf' | 'pan' | 'room' | 'delay', number>>
}
export interface MusicFrame { running: boolean; cycle: number; beat: number; section: number; tracks: Record<string, TrackFrame> }
export const EMPTY_MUSIC_FRAME: MusicFrame = { running: false, cycle: 0, beat: 1, section: 0, tracks: {} }

// Subscribers are tiny playback views. Clock ticks never rebuild the editor,
// chess analysis or the audio patterns.
export function createMusicMonitor() {
  let frame = EMPTY_MUSIC_FRAME
  const listeners = new Set<() => void>()
  return {
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    getSnapshot: () => frame,
    getServerSnapshot: () => EMPTY_MUSIC_FRAME,
    publish: (next: MusicFrame) => { frame = next; listeners.forEach(listener => listener()) },
  }
}
export type MusicMonitor = ReturnType<typeof createMusicMonitor>
export const VOICE_STATUS_LABELS: Record<VoiceStatus, string> = {
  inactive: 'Inativa', paused: 'Transporte pausado', 'solo-muted': 'Fora do solo', loading: 'Carregando sample',
  error: 'Erro no sample', masked: 'Pausa de seção', rest: 'Pausa da frase', note: 'Tocando',
}
