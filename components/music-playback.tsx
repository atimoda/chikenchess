'use client'

import { memo, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { VOICE_STATUS_LABELS, type MusicMonitor, type VoiceStatus } from '@/lib/music/monitor'
import { prepareVoiceVariations, type MusicSnapshot } from '@/lib/music/runtime'
import { MUSIC_GRID_DIVISIONS, MusicPianoEditor, defaultGridDivision, gridDivisionLabel } from './music-piano-editor'
import type { Instrument, InstrumentPerformanceEdit } from '@/lib/music/model'
import { reverseVariation, randomizeVariation } from '@/lib/music/variation-edit'
import { resizeRoll } from '@/lib/music/piano-roll'
import { beatsPerBar } from '@/lib/music/meter'
import { performancePosition } from '@/lib/music/performance'
import { ArrowLeftRight, Dices, Minus, Pin, Plus } from 'lucide-react'
import styles from './music-playback.module.css'

const VOICE_VALUE_KEYS = ['gain', 'lpf', 'pan', 'room', 'delay'] as const

function noteLabel(note: number | null) {
  if (note == null || !Number.isFinite(note)) return 'ataque'
  const n = Math.round(note)
  return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`
}
function DivisionPicker({ value, onChange, meter }: { value:number; onChange:(value:number)=>void; meter:import('@/lib/music/meter').Meter }) {
  const label=gridDivisionLabel(value,meter)
  return <label className={styles.divisionPicker} title={`Subdivisão da grade: ${label}. Clique para escolher outra divisão.`}>
    <span className={styles.divisionGrid} style={{gridTemplateColumns:`repeat(${value}, 1fr)`}} aria-hidden="true">{Array.from({length:value},(_,index)=><i key={index}/>)}</span>
    <select aria-label="Subdivisão da grade" value={value} onChange={event=>onChange(Number(event.target.value))}>{MUSIC_GRID_DIVISIONS.map(option=><option key={option.value} value={option.value}>{gridDivisionLabel(option.value,meter)}</option>)}</select>
  </label>
}
export function MusicTransportReadout({ monitor, activeCount, solo = false }: { monitor: MusicMonitor; activeCount?: number; solo?: boolean }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  return <div className={styles.transport} aria-label="Relógio musical">
    <span>{frame.running ? 'Em execução' : 'Parado'} · Seção <b>{String.fromCharCode(65 + Math.max(0, frame.section % 8))}</b></span>
    <span>Compasso {Math.floor(frame.cycle) + 1}</span>
    {frame.transport&&<span aria-label="BPM em execução">{frame.transport.bpm.toFixed(1)} → {frame.transport.targetBpm.toFixed(1)} BPM {frame.transport.ramp&&frame.transport.ramp.progress<1&&<progress aria-label="Avanço da rampa" max={1} value={frame.transport.ramp.progress} style={{width:60}}/>}{frame.transport.pending.length>0&&` · ${frame.transport.pending.length} mudança(s) na virada`}</span>}
    <div className={styles.beats} aria-label={`Tempo ${frame.beat} de ${beatsPerBar(frame.transport?.meter)}`}>{Array.from({length:beatsPerBar(frame.transport?.meter)},(_,index)=>index+1).map(beat => <i key={beat} data-on={frame.running && frame.beat === beat} />)}</div>
    {activeCount!==undefined&&<span className={styles.scale}>{activeCount}/32 ativas{solo?' · solo':''}</span>}
  </div>
}
export function MusicVoiceBadge({ monitor, id }: { monitor: MusicMonitor; id: string }) {
  const status = useSyncExternalStore<VoiceStatus>(monitor.subscribe, () => monitor.getSnapshot().tracks[id]?.status ?? 'inactive', () => 'inactive')
  return <span className={styles.badge} data-status={status}>{VOICE_STATUS_LABELS[status]}</span>
}
export const MusicVoiceReadout = memo(function MusicVoiceReadout({ monitor, id, snapshot, manual = false, expanded = false, showStatus = true, instrument, onInstrumentChange, variationTabs = false }: { instrument?:Instrument; onInstrumentChange?:(patch:InstrumentPerformanceEdit)=>void; monitor: MusicMonitor; id: string; snapshot: MusicSnapshot; manual?: boolean; expanded?: boolean; showStatus?: boolean; variationTabs?: boolean }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const track = frame.tracks[id]
  const stableValues = useRef<{id:string;values:Partial<Record<(typeof VOICE_VALUE_KEYS)[number],number>>}>({id,values:{}})
  if(stableValues.current.id!==id)stableValues.current={id,values:{}}
  for(const key of VOICE_VALUE_KEYS){const value=track?.values[key];if(Number.isFinite(value))stableValues.current.values[key]=value}
  const [preview, setPreview] = useState<{ read: Awaited<ReturnType<typeof prepareVoiceVariations>>; snapshot: MusicSnapshot; id: string } | null>(null)
  const [error, setError] = useState('')
  const [division,setDivision]=useState(defaultGridDivision(snapshot.meter))
  useEffect(() => setDivision(defaultGridDivision(snapshot.meter)), [snapshot.meter])
  const editable=!!instrument&&!!onInstrumentChange
  const pianoEditor=editable&&!variationTabs
  useEffect(() => {
    if(pianoEditor)return
    let cancelled = false
    setError('')
    void prepareVoiceVariations(snapshot, id).then(read => {
      if (!cancelled) setPreview({ read, snapshot, id })
    }).catch(() => { if (!cancelled) setError('Não foi possível desenhar as variações.') })
    return () => { cancelled = true }
  }, [snapshot, id, pianoEditor])
  const rows = preview?.snapshot === snapshot && preview.id === id ? preview.read?.(frame.cycle) ?? [] : []
  const running = frame.running && !manual && ['note', 'rest', 'masked'].includes(track?.status ?? '')
  const activeRow = rows.find(row => row.active) ?? rows[0]
  const visibleRows = variationTabs ? activeRow ? [activeRow] : [] : rows
  const sourceVariationCount = Math.max(1, instrument?.phrases?.length ?? 0, instrument?.pianoRolls?.length ?? 0, instrument ? 0 : rows.length)
  const activeTab = instrument?.selectedVariation ?? (activeRow ? activeRow.index % sourceVariationCount : 0)
  const activeRoll=instrument?.pianoRolls?.[activeTab]
  const followingPerformance=instrument?.selectedVariation===undefined&&snapshot.sectionOverrides?.[id]===undefined
  const currentPerformance=followingPerformance&&instrument?.performance
    ? performancePosition(instrument.performance,frame.cycle,beatsPerBar(snapshot.meter))
    : null
  const absentVariation=currentPerformance&&!currentPerformance.step.active?currentPerformance.step.variation%sourceVariationCount:null
  const resizeActiveVariation=(delta:number)=>{
    if(!instrument||!onInstrumentChange||!activeRoll)return
    const bars=Math.max(1/beatsPerBar(snapshot.meter),Math.min(8,activeRoll.bars+delta/beatsPerBar(snapshot.meter)*4))
    onInstrumentChange({pianoRolls:Array.from({length:sourceVariationCount},(_,index)=>index===activeTab?resizeRoll(activeRoll,bars):instrument.pianoRolls?.[index]??null)})
  }
  const notes = visibleRows.flatMap(row => row.events.flatMap(event => event.note == null ? [] : [event.note]))
  const bottom = notes.length ? Math.min(...notes) : 0
  const top = notes.length ? Math.max(...notes) : 0
  return <div className={styles.voice} aria-label="Execução do instrumento">
    {showStatus&&<div className={styles.line}><MusicVoiceBadge monitor={monitor} id={id} /><span>{track?.notes.map(noteLabel).join(' + ')}</span></div>}
    {pianoEditor ? <MusicPianoEditor snapshot={snapshot} id={id} monitor={monitor} instrument={instrument} onChange={onInstrumentChange}/> : <div className={styles.variationViewer} data-loop-enabled={instrument?.loopEnabled!==false}>
      {variationTabs && instrument && onInstrumentChange && <>
      <div className={styles.variationTabs} role="tablist" aria-label="Variações do instrumento">
        <div className={styles.variationTabList}>{Array.from({ length: sourceVariationCount }, (_, index) => {
          const fixed = instrument.selectedVariation === index
          return <button key={index} type="button" role="tab" aria-selected={activeTab === index} aria-pressed={fixed} data-active={activeTab === index} data-fixed={fixed} data-absent={absentVariation===index||undefined} onClick={() => onInstrumentChange({ selectedVariation: fixed ? undefined : index })}>{fixed&&<Pin className={styles.pinnedVariation} aria-hidden="true"/>}{String.fromCharCode(65 + index)}</button>
        })}</div>
        <div className={styles.variationActions} aria-label="Ações da variação">
          <DivisionPicker value={division} onChange={setDivision} meter={snapshot.meter??'4/4'}/>
          <button type="button" aria-label="Inverter notas da variação" title="Espelhar variação no tempo" onClick={() => onInstrumentChange(reverseVariation(instrument,activeTab))}><ArrowLeftRight size={14}/></button>
          <button type="button" aria-label="Randomizar notas da variação" title="Randomizar notas" onClick={() => onInstrumentChange(randomizeVariation(instrument,activeTab))}><Dices size={14}/></button>
          <button type="button" aria-label={`Diminuir duração da variação ${activeTab+1}`} title="Diminuir um tempo" disabled={!activeRoll||activeRoll.bars<=1/beatsPerBar(snapshot.meter)} onClick={()=>resizeActiveVariation(-.25)}><Minus size={14}/></button>
          <button type="button" aria-label={`Aumentar duração da variação ${activeTab+1}`} title="Aumentar um tempo" disabled={!activeRoll||activeRoll.bars>=8} onClick={()=>resizeActiveVariation(.25)}><Plus size={14}/></button>
        </div>
      </div>
      <MusicPianoEditor compact onlyVariation={activeTab} division={division} onDivisionChange={setDivision} snapshot={snapshot} id={id} monitor={monitor} instrument={instrument} onChange={onInstrumentChange}/>
      </>}
      {!variationTabs&&<>
      <div className={styles.variations} data-tabbed={variationTabs || undefined} style={expanded ? { height:'auto', maxHeight:'none', overflow:'visible' } : undefined} tabIndex={0} aria-label="Variações salvas da peça">
      {!rows.length && <p>{error || 'Preparando variações…'}</p>}
      {visibleRows.map(row => <div key={row.index} className={styles.variation} data-active={running && row.active}>
        <div className={styles.variationLabel}><b>Variação {String.fromCharCode(65 + row.index % sourceVariationCount)}</b><span>{running && row.active ? 'Em execução' : `Compassos ${row.start + 1}–${row.start + 4}`}</span></div>
        <svg viewBox="0 0 300 66" role="img" aria-label={`Notas e pausas da variação ${String.fromCharCode(65 + row.index % sourceVariationCount)}`}>
          {Array.from({ length: 17 }, (_, i) => <line key={i} x1={i * 18.75} x2={i * 18.75} y1="0" y2="66" stroke={i % 4 ? '#26362b' : '#415246'} />)}
          {row.events.map((event, index) => <rect key={index} x={event.start * 75} y={event.note == null ? 24 : 48 - (event.note - bottom) / Math.max(1, top - bottom) * 38}
            width={Math.max(1, (event.end - event.start) * 75 - 1)} height="12" rx="2" opacity={Math.max(.15, Math.min(1, event.gain * 2))}
            fill={running && row.active && row.cursor >= event.start && row.cursor < event.end ? '#edff9f' : '#76a58b'}><title>{noteLabel(event.note)}</title></rect>)}
          {running && row.active && <line data-playhead="true" x1={row.cursor * 75} x2={row.cursor * 75} y1="0" y2="66" stroke="#f8edce" strokeWidth="2" />}
        </svg>
        <div className={styles.notation} title={row.rhythm ?? row.phrase}>{row.rhythm ?? row.phrase}</div>
      </div>)}
      </div>
      </>}
    </div>
    }
    <div className={styles.values}>{VOICE_VALUE_KEYS.map(key=>{const value=stableValues.current.values[key];return <span key={key}>{key}: {value===undefined?'—':key==='lpf'?`${Math.round(value)} Hz`:value.toFixed(2)}</span>})}</div>
  </div>
})
