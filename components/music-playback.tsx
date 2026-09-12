'use client'

import { useSyncExternalStore } from 'react'
import { VOICE_STATUS_LABELS, type MusicMonitor, type VoiceStatus } from '@/lib/music/monitor'
import styles from './music-playback.module.css'

function noteLabel(note: number | null) {
  if (note == null || !Number.isFinite(note)) return 'ataque'
  const n = Math.round(note)
  return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`
}
export function MusicTransportReadout({ monitor }: { monitor: MusicMonitor }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  return <div className={styles.transport} aria-label="Relógio musical">
    <span>{frame.running ? 'Em execução' : 'Parado'} · Seção <b>{String.fromCharCode(65 + Math.max(0, frame.section % 4))}</b></span>
    <span>Compasso {Math.floor(frame.cycle) + 1}</span>
    <div className={styles.beats} aria-label={`Tempo ${frame.beat} de 4`}>{[1, 2, 3, 4].map(beat => <i key={beat} data-on={frame.running && frame.beat === beat} />)}</div>
  </div>
}
export function MusicVoiceBadge({ monitor, id }: { monitor: MusicMonitor; id: string }) {
  const status = useSyncExternalStore<VoiceStatus>(monitor.subscribe, () => monitor.getSnapshot().tracks[id]?.status ?? 'inactive', () => 'inactive')
  return <span className={styles.badge} data-status={status}>{VOICE_STATUS_LABELS[status]}</span>
}
export function MusicVoiceReadout({ monitor, id }: { monitor: MusicMonitor; id: string }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const track = frame.tracks[id]
  const cycle = Math.floor(frame.cycle)
  const notes = track?.events.flatMap(event => event.note == null ? [] : [event.note]) ?? []
  const bottom = notes.length ? Math.min(...notes) : 0
  const top = notes.length ? Math.max(...notes) : 0
  return <div className={styles.voice} aria-label="Execução do instrumento">
    <div className={styles.line}><MusicVoiceBadge monitor={monitor} id={id} /><span>{track?.notes.map(noteLabel).join(' + ')}</span></div>
    <svg viewBox="0 0 300 66" role="img" aria-label="Notas e pausas do compasso atual">
      {[0, 1, 2, 3, 4].map(i => <line key={i} x1={i * 75} x2={i * 75} y1="0" y2="66" stroke="#415246" />)}
      {track?.events.map((event, index) => <rect key={index} x={(event.start - cycle) * 300} y={event.note == null ? 24 : 48 - (event.note - bottom) / Math.max(1, top - bottom) * 38}
        width={Math.max(2, (event.end - event.start) * 300 - 1)} height="12" rx="2" opacity={Math.max(.15, Math.min(1, event.gain * 2))}
        fill={frame.cycle >= event.start && frame.cycle < event.end ? '#edff9f' : '#76a58b'}><title>{noteLabel(event.note)}</title></rect>)}
      <line x1={(frame.cycle % 1) * 300} x2={(frame.cycle % 1) * 300} y1="0" y2="66" stroke="#f8edce" strokeWidth="2" />
    </svg>
    <div className={styles.values}>{Object.entries(track?.values ?? {}).filter(([, value]) => Number.isFinite(value)).map(([key, value]) => <span key={key}>{key}: {key === 'lpf' ? `${Math.round(value!)} Hz` : value!.toFixed(2)}</span>)}</div>
  </div>
}
