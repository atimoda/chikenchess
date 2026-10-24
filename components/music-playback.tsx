'use client'

import { createContext, memo, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { isLoopRunning, VOICE_STATUS_LABELS, type MusicMonitor, type VoiceStatus } from '@/lib/music/monitor'
import type { MusicSnapshot } from '@/lib/music/runtime'
import { useMonitorSelector } from '@/hooks/use-monitor-selector'
import { MUSIC_GRID_DIVISIONS, MusicPianoEditor, defaultGridDivision, gridDivisionLabel } from './music-piano-editor'
import type { Instrument, InstrumentPerformanceEdit } from '@/lib/music/model'
import { instrumentFor } from '@/lib/music/model'
import { addVariation, removeLastVariation, reverseVariation, randomizeVariation } from '@/lib/music/variation-edit'
import { resizeRoll } from '@/lib/music/piano-roll'
import { beatsPerBar, meterLabel } from '@/lib/music/meter'
import { InfoTip } from './info-tip'
import { variationPosition } from '@/lib/music/performance'
import { arrangementPosition, pieceSection, type Arrangement } from '@/lib/music/arrangement'
import { ArrowLeftRight, Dice5, Minus, Pin, Plus } from 'lucide-react'
import styles from './music-playback.module.css'
import type { KnobUpdateMode } from './knob'

interface MusicPlaybackViewportState {
  visualUpdatesEnabled: boolean
  pieceParamsLayout: boolean
}

const defaultPlaybackViewport: MusicPlaybackViewportState = { visualUpdatesEnabled: true, pieceParamsLayout: false }
const MusicPlaybackViewportContext = createContext(defaultPlaybackViewport)

export function MusicPlaybackViewport({ children, visualUpdatesEnabled, pieceParamsLayout = false }: { children: ReactNode; visualUpdatesEnabled: boolean; pieceParamsLayout?: boolean }) {
  const value = useMemo(() => ({ visualUpdatesEnabled, pieceParamsLayout }), [visualUpdatesEnabled, pieceParamsLayout])
  return <MusicPlaybackViewportContext.Provider value={value}>{children}</MusicPlaybackViewportContext.Provider>
}

function noteLabel(note: number | null) {
  if (note == null || !Number.isFinite(note)) return 'ataque'
  const n = Math.round(note)
  return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][((n % 12) + 12) % 12]}${Math.floor(n / 12) - 1}`
}
function DivisionPicker({ value, onChange, meter }: { value:number; onChange:(value:number)=>void; meter:import('@/lib/music/meter').Meter }) {
  const label=gridDivisionLabel(value,meter)
  return <label className={styles.divisionPicker} title={`Grid subdivision: ${label}. Click to pick another division.`}>
    <span className={styles.divisionGrid} style={{gridTemplateColumns:`repeat(${value}, 1fr)`}} aria-hidden="true">{Array.from({length:value},(_,index)=><i key={index}/>)}</span>
    <select aria-label="Grid subdivision" value={value} onChange={event=>onChange(Number(event.target.value))}>{MUSIC_GRID_DIVISIONS.map(option=><option key={option.value} value={option.value}>{gridDivisionLabel(option.value,meter)}</option>)}</select>
  </label>
}
export function MusicTransportReadout({ monitor, arrangement, activeCount, solo = false, showBeatUnit = false, showStatus = true }: { monitor: MusicMonitor; arrangement?: Arrangement; activeCount?: number; solo?: boolean; showBeatUnit?: boolean; showStatus?: boolean }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const position = arrangement ? arrangementPosition(arrangement, frame.cycle, beatsPerBar(frame.transport?.meter)) : undefined
  return <div className={styles.transport} aria-label="Music clock">
    {showStatus&&<span>{frame.running ? 'Playing' : 'Stopped'} · Section <b>{position?.section.label ?? frame.transport?.sectionLabel ?? String.fromCharCode(65 + Math.max(0, frame.section))}</b></span>}
    <span>Bar {Math.floor(frame.cycle) + 1}</span>
    {showBeatUnit&&<span aria-label="BPM unit">{meterLabel(frame.transport?.meter).split(' · ').slice(1).join(' · ')}<InfoTip label="Beat unit">BPM counts beats per minute, not grid cells. A dotted quarter is a quarter plus half of it: three eighths. In 6/8, 9/8 and 12/8 each beat has three eighths; that is 2, 3 and 4 beats per bar. In the MIDI editor, “1 part” is a whole beat; “3 parts” splits that beat into three eighths. The menu picks the beat subdivision, not the BPM unit.</InfoTip></span>}
    {frame.transport&&<span aria-label="Current BPM">{frame.transport.bpm.toFixed(1)} → {frame.transport.targetBpm.toFixed(1)} BPM {frame.transport.ramp&&frame.transport.ramp.progress<1&&<progress aria-label="Ramp progress" max={1} value={frame.transport.ramp.progress} style={{width:60}}/>}{frame.transport.pending.length>0&&` · ${frame.transport.pending.length} change(s) at the bar line`}</span>}
    <div className={styles.beats} aria-label={`Beat ${frame.beat} of ${beatsPerBar(frame.transport?.meter)}`}>{Array.from({length:beatsPerBar(frame.transport?.meter)},(_,index)=>index+1).map(beat => <i key={beat} data-on={frame.running && frame.beat === beat} />)}</div>
    {activeCount!==undefined&&<span className={styles.scale}>{activeCount}/32 active{solo?' · solo':''}</span>}
  </div>
}
export function MusicVoiceBadge({ monitor, id }: { monitor: MusicMonitor; id: string }) {
  const status = useSyncExternalStore<VoiceStatus>(monitor.subscribe, () => monitor.getSnapshot().tracks[id]?.status ?? 'inactive', () => 'inactive')
  return <span className={styles.badge} data-status={status}>{VOICE_STATUS_LABELS[status]}</span>
}
export const MusicVoiceReadout = memo(function MusicVoiceReadout({ monitor, id, snapshot, manual = false, expanded = false, showStatus = true, instrument, onInstrumentChange, variationTabs = false, manageVariations = variationTabs, knobUpdateMode = 'immediate' }: { instrument?:Instrument; onInstrumentChange?:(patch:InstrumentPerformanceEdit)=>void; monitor: MusicMonitor; id: string; snapshot: MusicSnapshot; manual?: boolean; expanded?: boolean; showStatus?: boolean; variationTabs?: boolean; manageVariations?: boolean; knobUpdateMode?:KnobUpdateMode }) {
  const viewport = useContext(MusicPlaybackViewportContext)
  const [division,setDivision]=useState(defaultGridDivision(snapshot.meter))
  useEffect(() => setDivision(defaultGridDivision(snapshot.meter)), [snapshot.meter])
  const editable=!!instrument&&!!onInstrumentChange
  const pianoEditor=editable&&!variationTabs
  const piece = snapshot.pieces.find(piece => piece.id === id)
  const sourceInstrument = instrument ?? snapshot.instruments?.[id] ?? (piece ? instrumentFor(piece) : undefined)
  // Only the values shown here are selected from the monitor: tabs/status change
  // a few times per bar, so clock ticks no longer rebuild the whole panel.
  const playback = useMonitorSelector(monitor, frame => {
    const globalPosition = snapshot.arrangement ? arrangementPosition(snapshot.arrangement,frame.cycle,beatsPerBar(snapshot.meter)) : undefined
    const position = sourceInstrument ? variationPosition(sourceInstrument,globalPosition?.index ?? frame.section,frame.cycle,beatsPerBar(snapshot.meter),snapshot.sectionOverrides?.[id],snapshot.arrangement) : undefined
    return {
      notes: showStatus ? frame.tracks[id]?.notes.map(noteLabel).join(' + ') : undefined,
      running: !manual && isLoopRunning(frame,id,sourceInstrument?.loopEnabled!==false),
      sectionIndex: globalPosition?.index,
      variation: position?.variation ?? 0,
      present: position?.present,
      // The compact tab view draws its playhead in the piano editor; only the
      // stacked variation list needs the continuous phase here.
      phase: pianoEditor || variationTabs ? 0 : position?.phase ?? 0,
    }
  }, viewport.visualUpdatesEnabled)
  const running = playback.running
  const sourceVariationCount = sourceInstrument?.pianoRolls.length ?? 0
  const activeTab = playback.variation
  const activeRoll=instrument?.pianoRolls[activeTab]
  const currentSection=sourceInstrument&&snapshot.arrangement&&playback.sectionIndex!==undefined ? pieceSection(sourceInstrument,snapshot.arrangement,playback.sectionIndex) : undefined
  const absentVariation=currentSection&&!currentSection.active?activeTab:null
  const resizeActiveVariation=(delta:number)=>{
    if(!instrument||!onInstrumentChange||!activeRoll)return
    const bars=Math.max(1/beatsPerBar(snapshot.meter),Math.min(8,activeRoll.bars+delta/beatsPerBar(snapshot.meter)*4))
    onInstrumentChange({pianoRolls:instrument.pianoRolls.map((roll,index)=>index===activeTab?resizeRoll(activeRoll,bars):roll)})
  }
  // The piano editor passes Delete note (only while a note is selected) as the first action.
  const variationActions = instrument && onInstrumentChange ? (leading: ReactNode) => <div className={styles.variationActions} aria-label="Variation actions">
    {leading}
    <DivisionPicker value={division} onChange={setDivision} meter={snapshot.meter??'4/4'}/>
    <button type="button" aria-label="Reverse variation notes" title="Mirror the variation in time" onClick={() => onInstrumentChange(reverseVariation(instrument,activeTab))}><ArrowLeftRight size={14}/></button>
    <button type="button" aria-label="Randomize variation notes" title="Randomize notes" onClick={() => onInstrumentChange(randomizeVariation(instrument,activeTab))}><Dice5 size={14}/></button>
    <span className={styles.buttonPair}><button type="button" aria-label={`Shorten variation ${activeTab+1}`} title="Remove one beat" disabled={!activeRoll||activeRoll.bars<=1/beatsPerBar(snapshot.meter)} onClick={()=>resizeActiveVariation(-.25)}><Minus size={14}/></button>
    <button type="button" aria-label={`Lengthen variation ${activeTab+1}`} title="Add one beat" disabled={!activeRoll||activeRoll.bars>=8} onClick={()=>resizeActiveVariation(.25)}><Plus size={14}/></button></span>
  </div> : null
  const notes = sourceInstrument?.pianoRolls.flatMap(roll => roll.notes.map(note => note.degree)) ?? []
  const bottom = notes.length ? Math.min(...notes) : 0
  const top = notes.length ? Math.max(...notes) : 0
  return <div className={`${styles.voice}${viewport.pieceParamsLayout ? ` ${styles.pieceParamsVoice}` : ''}`} aria-label="Instrument playback">
    {showStatus&&<div className={styles.line}><MusicVoiceBadge monitor={monitor} id={id} /><span>{playback.notes}</span></div>}
    {pianoEditor ? <MusicPianoEditor snapshot={snapshot} id={id} monitor={monitor} instrument={instrument} onChange={onInstrumentChange} knobUpdateMode={knobUpdateMode}/> : <div className={`${styles.variationViewer}${viewport.pieceParamsLayout ? ` ${styles.pieceParamsVariationViewer}` : ''}`} data-loop-enabled={instrument?.loopEnabled!==false}>
      {variationTabs && instrument && onInstrumentChange && <>
      <div className={styles.variationTabs} data-manage-variations={manageVariations||undefined}>
        <div className={styles.variationTabList} role="tablist" aria-label="Instrument variations">{Array.from({ length: sourceVariationCount }, (_, index) => {
          const fixed = instrument.selectedVariation === index
          return <button key={index} type="button" role="tab" aria-selected={activeTab === index} aria-pressed={fixed} title="Pin only the MIDI variation; presence, transposition and timing keep following the global arrangement." data-active={activeTab === index} data-fixed={fixed} data-absent={absentVariation===index||undefined} onClick={() => onInstrumentChange({ selectedVariation: fixed ? undefined : index })}>{fixed&&<Pin className={styles.pinnedVariation} aria-hidden="true"/>}{String.fromCharCode(65 + index)}</button>
        })}
        {manageVariations&&<>
          <button type="button" aria-label="Add variation" title="Add variation" disabled={sourceVariationCount>=8} onClick={()=>onInstrumentChange(addVariation(instrument))}>+</button>
          <button type="button" aria-label="Remove last variation" title="Remove last variation" disabled={sourceVariationCount<=1} onClick={()=>onInstrumentChange(removeLastVariation(instrument))}>−</button>
        </>}
        </div>
      </div>
      <MusicPianoEditor compact actions={variationActions} onlyVariation={activeTab} division={division} onDivisionChange={setDivision} snapshot={snapshot} id={id} monitor={monitor} instrument={instrument} onChange={onInstrumentChange} knobUpdateMode={knobUpdateMode} visualUpdatesEnabled={viewport.visualUpdatesEnabled}/>
      </>}
      {!variationTabs&&<>
      <div className={styles.variations} data-tabbed={variationTabs || undefined} style={expanded ? { height:'auto', maxHeight:'none', overflow:'visible' } : undefined} tabIndex={0} aria-label="Saved piece variations">
      {sourceInstrument?.pianoRolls.map((roll, index) => {
        const active = activeTab === index
        const sounding = running && active && playback.present
        const cursor = playback.phase % roll.bars
        return <div key={index} className={styles.variation} data-active={running && active}>
        <div className={styles.variationLabel}><b>Variation {String.fromCharCode(65 + index)}</b><span>{running && active ? sounding ? 'Playing' : 'Section rest' : `${roll.bars} bars`}</span></div>
        <svg viewBox="0 0 300 66" role="img" aria-label={`Notes and rests of variation ${String.fromCharCode(65 + index)}`}>
          {Array.from({ length: 17 }, (_, i) => <line key={i} x1={i * 18.75} x2={i * 18.75} y1="0" y2="66" stroke={i % 4 ? '#26362b' : '#415246'} />)}
          {roll.notes.map((note, noteIndex) => <rect key={noteIndex} x={note.start / roll.bars * 300} y={48 - (note.degree - bottom) / Math.max(1, top - bottom) * 38}
            width={Math.max(1, note.duration / roll.bars * 300 - 1)} height="12" rx="2" opacity={Math.max(.15, note.velocity)}
            fill={sounding && cursor >= note.start && cursor < note.start + note.duration ? '#edff9f' : '#76a58b'}><title>{`Degree ${note.degree}`}</title></rect>)}
          {sounding && <line data-playhead="true" x1={cursor / roll.bars * 300} x2={cursor / roll.bars * 300} y1="0" y2="66" stroke="#f8edce" strokeWidth="2" />}
        </svg>
      </div>})}
      </div>
      </>}
    </div>
    }
  </div>
})
