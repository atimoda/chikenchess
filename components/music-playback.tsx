'use client'

import { memo, useEffect, useState, useSyncExternalStore } from 'react'
import { VOICE_STATUS_LABELS, type MusicMonitor, type VoiceStatus } from '@/lib/music/monitor'
import { prepareVoiceVariations, type MusicSnapshot } from '@/lib/music/runtime'
import { MusicPianoEditor } from './music-piano-editor'
import type { Instrument } from '@/lib/music/model'
import styles from './music-playback.module.css'

function noteLabel(note: number | null) {
  if (note == null || !Number.isFinite(note)) return 'ataque'
  const n = Math.round(note)
  return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`
}
export function MusicTransportReadout({ monitor, showScale = false }: { monitor: MusicMonitor; showScale?: boolean }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  return <div className={styles.transport} aria-label="Relógio musical">
    <span>{frame.running ? 'Em execução' : 'Parado'} · Seção <b>{String.fromCharCode(65 + Math.max(0, frame.section % 8))}</b></span>
    <span>Compasso {Math.floor(frame.cycle) + 1}</span>
    {frame.transport&&<span aria-label="BPM em execução">{frame.transport.bpm.toFixed(1)} → {frame.transport.targetBpm.toFixed(1)} BPM {frame.transport.ramp&&frame.transport.ramp.progress<1&&<progress aria-label="Avanço da rampa" max={1} value={frame.transport.ramp.progress} style={{width:60}}/>}{frame.transport.pending.length>0&&` · ${frame.transport.pending.length} mudança(s) na virada`}</span>}
    <div className={styles.beats} aria-label={`Tempo ${frame.beat} de 4`}>{[1, 2, 3, 4].map(beat => <i key={beat} data-on={frame.running && frame.beat === beat} />)}</div>
    {showScale&&frame.transport&&<span className={styles.scale}>Notas disponíveis: {frame.transport.scale.join(' · ')}</span>}
  </div>
}
export function MusicVoiceBadge({ monitor, id }: { monitor: MusicMonitor; id: string }) {
  const status = useSyncExternalStore<VoiceStatus>(monitor.subscribe, () => monitor.getSnapshot().tracks[id]?.status ?? 'inactive', () => 'inactive')
  return <span className={styles.badge} data-status={status}>{VOICE_STATUS_LABELS[status]}</span>
}
export const MusicVoiceReadout = memo(function MusicVoiceReadout({ monitor, id, snapshot, manual = false, expanded = false, instrument, onInstrumentChange }: { instrument?:Instrument; onInstrumentChange?:(patch:Partial<Pick<Instrument,'phrases'|'pianoRolls'|'selectedVariation'>>)=>void; monitor: MusicMonitor; id: string; snapshot: MusicSnapshot; manual?: boolean; expanded?: boolean }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const track = frame.tracks[id]
  const [preview, setPreview] = useState<{ read: Awaited<ReturnType<typeof prepareVoiceVariations>>; snapshot: MusicSnapshot; id: string } | null>(null)
  const [error, setError] = useState('')
  const editable=!!instrument&&!!onInstrumentChange
  useEffect(() => {
    if(editable)return
    let cancelled = false
    setError('')
    void prepareVoiceVariations(snapshot, id).then(read => {
      if (!cancelled) setPreview({ read, snapshot, id })
    }).catch(() => { if (!cancelled) setError('Não foi possível desenhar as variações.') })
    return () => { cancelled = true }
  }, [snapshot, id, editable])
  const rows = preview?.snapshot === snapshot && preview.id === id ? preview.read?.(frame.cycle) ?? [] : []
  const running = frame.running && !manual && ['note', 'rest', 'masked'].includes(track?.status ?? '')
  const notes = rows.flatMap(row => row.events.flatMap(event => event.note == null ? [] : [event.note]))
  const bottom = notes.length ? Math.min(...notes) : 0
  const top = notes.length ? Math.max(...notes) : 0
  return <div className={styles.voice} aria-label="Execução do instrumento">
    <div className={styles.line}><MusicVoiceBadge monitor={monitor} id={id} /><span>{track?.notes.map(noteLabel).join(' + ')}</span></div>
    {instrument && onInstrumentChange ? <MusicPianoEditor snapshot={snapshot} id={id} monitor={monitor} instrument={instrument} onChange={onInstrumentChange}/> : <div className={styles.variations} style={expanded ? { height:'auto', maxHeight:'none', overflow:'visible' } : undefined} tabIndex={0} aria-label="Variações salvas da peça">
      {!rows.length && <p>{error || 'Preparando variações…'}</p>}
      {rows.map(row => <div key={row.index} className={styles.variation} data-active={running && row.active}>
        <div className={styles.variationLabel}><b>Variação {String.fromCharCode(65 + row.index)}</b><span>{running && row.active ? 'Em execução' : `Compassos ${row.start + 1}–${row.start + 4}`}</span></div>
        <svg viewBox="0 0 300 66" role="img" aria-label={`Notas e pausas da variação ${String.fromCharCode(65 + row.index)}`}>
          {Array.from({ length: 17 }, (_, i) => <line key={i} x1={i * 18.75} x2={i * 18.75} y1="0" y2="66" stroke={i % 4 ? '#26362b' : '#415246'} />)}
          {row.events.map((event, index) => <rect key={index} x={event.start * 75} y={event.note == null ? 24 : 48 - (event.note - bottom) / Math.max(1, top - bottom) * 38}
            width={Math.max(1, (event.end - event.start) * 75 - 1)} height="12" rx="2" opacity={Math.max(.15, Math.min(1, event.gain * 2))}
            fill={running && row.active && row.cursor >= event.start && row.cursor < event.end ? '#edff9f' : '#76a58b'}><title>{noteLabel(event.note)}</title></rect>)}
          {running && row.active && <line data-playhead="true" x1={row.cursor * 75} x2={row.cursor * 75} y1="0" y2="66" stroke="#f8edce" strokeWidth="2" />}
        </svg>
        <div className={styles.notation} title={row.rhythm ?? row.phrase}>{row.rhythm ?? row.phrase}</div>
      </div>)}
    </div>
    }
    <div className={styles.values}>{Object.entries(track?.values ?? {}).filter(([, value]) => Number.isFinite(value)).map(([key, value]) => <span key={key}>{key}: {key === 'lpf' ? `${Math.round(value!)} Hz` : value!.toFixed(2)}</span>)}</div>
  </div>
})
