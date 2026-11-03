'use client'

import { createContext, memo, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import { isLoopRunning, VOICE_STATUS_LABELS, type MusicMonitor, type VoiceStatus } from '@/lib/music/monitor'
import type { MusicSnapshot } from '@/lib/music/runtime'
import { useMonitorSelector } from '@/hooks/use-monitor-selector'
import { MUSIC_GRID_DIVISIONS, MusicPianoEditor, defaultGridDivision, gridDivisionLabel } from './music-piano-editor'
import type { Instrument, InstrumentPerformanceEdit } from '@/lib/music/model'
import { instrumentFor } from '@/lib/music/model'
import { addVariation, removeLastVariation, reverseVariation, randomizeVariation, euclidPattern, euclidSteps, euclidVariation, type EuclidMode } from '@/lib/music/variation-edit'
import { resizeRoll, type PianoRoll } from '@/lib/music/piano-roll'
import { beatsPerBar, meterLabel } from '@/lib/music/meter'
import { variationPosition } from '@/lib/music/performance'
import { arrangementPosition, pieceSection, type Arrangement } from '@/lib/music/arrangement'
import { ArrowLeftRight, CircleDotDashed, Dice5, Minus, Pin, Plus, RotateCw } from 'lucide-react'
import styles from './music-playback.module.css'
import { ArpeggiatorButton, ArpeggiatorPanel, useArpConfig } from './music-arpeggiator'
import { arpeggiate, type ArpConfig } from '@/lib/music/arpeggiator'
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
const EUCLID_MODES: { mode: EuclidMode; label: string; title: string }[] = [
  { mode: 'notes', label: 'Notes', title: 'Rewrite the rhythm: one note per pulse, keeping the melody in order' },
  { mode: 'accent', label: 'Accent', title: 'Full accent on the notes that land on a pulse, half on the others' },
  { mode: 'ratchet', label: 'Ratchet', title: 'Notes that land on a pulse repeat ×2' },
  { mode: 'chance', label: 'Chance', title: 'Notes off the pattern play 50% of the time' },
]

/** `source` is the roll Euclid edits from; `last` is what it produced. A roll that
 * matches neither was edited by hand and becomes the new source. */
interface EuclidState { tab: number; source: PianoRoll; sourceJson: string; last: string; mode: EuclidMode; pulses: number; rotate: number }

/** Inline Euclid row under the variation actions: mode, Pulses and Rotate over
 * the grid's steps, with the pattern drawn as dots. */
function EuclidPanel({ state, steps, onChange }: { state: EuclidState; steps: number; onChange: (patch: Partial<Pick<EuclidState, 'mode' | 'pulses' | 'rotate'>>) => void }) {
  const pattern = euclidPattern(state.pulses, steps, state.rotate)
  const stepper = (label: string, value: number, min: number, max: number, key: 'pulses' | 'rotate', text: string) => <span className={styles.euclidField}>
    <span>{label}</span>
    <span className={styles.buttonPair}>
      <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange({ [key]: value - 1 })}><Minus size={12}/></button>
      <output aria-label={label}>{text}</output>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange({ [key]: value + 1 })}><Plus size={12}/></button>
    </span>
  </span>
  return <div className={styles.euclidPanel} role="group" aria-label="Euclidean pattern">
    <div className={styles.euclidModes} role="radiogroup" aria-label="Euclidean mode">
      {EUCLID_MODES.map(({ mode, label, title }) => <button key={mode} type="button" role="radio" aria-checked={state.mode === mode} data-on={state.mode === mode} title={title} onClick={() => onChange({ mode })}>{label}</button>)}
    </div>
    {stepper('Pulses', state.pulses, 0, steps, 'pulses', `${state.pulses}/${steps}`)}
    {stepper('Rotate', state.rotate, 0, steps - 1, 'rotate', String(state.rotate))}
    <span className={styles.euclidDots} aria-hidden="true">{pattern.map((hit, index) => <i key={index} data-on={hit} />)}</span>
  </div>
}

export function MusicTransportReadout({ monitor, arrangement, activeCount, solo = false, showBeatUnit = false, showStatus = true }: { monitor: MusicMonitor; arrangement?: Arrangement; activeCount?: number; solo?: boolean; showBeatUnit?: boolean; showStatus?: boolean }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const position = arrangement ? arrangementPosition(arrangement, frame.cycle, beatsPerBar(frame.transport?.meter)) : undefined
  return <div className={styles.transport} aria-label="Music clock">
    {showStatus&&<span>{frame.running ? 'Playing' : 'Stopped'} · Section <b>{position?.section.label ?? frame.transport?.sectionLabel ?? String.fromCharCode(65 + Math.max(0, frame.section))}</b></span>}
    <span>Bar {Math.floor(frame.cycle) + 1}</span>
    {showBeatUnit&&<span aria-label="BPM unit">{meterLabel(frame.transport?.meter).split(' · ').slice(1).join(' · ')}</span>}
    {frame.transport&&<span aria-label="Current BPM">{frame.transport.bpm.toFixed(1)} → {frame.transport.targetBpm.toFixed(1)} BPM {frame.transport.ramp&&frame.transport.ramp.progress<1&&<progress aria-label="Ramp progress" max={1} value={frame.transport.ramp.progress} style={{width:60}}/>}{frame.transport.pending.length>0&&` · ${frame.transport.pending.length} change(s) at the bar line`}</span>}
    <div className={styles.beats} aria-label={`Beat ${frame.beat} of ${beatsPerBar(frame.transport?.meter)}`}>{Array.from({length:beatsPerBar(frame.transport?.meter)},(_,index)=>index+1).map(beat => <i key={beat} data-on={frame.running && frame.beat === beat} />)}</div>
    {activeCount!==undefined&&<span className={styles.scale}>{activeCount}/32 active{solo?' · solo':''}</span>}
  </div>
}
export function MusicVoiceBadge({ monitor, id }: { monitor: MusicMonitor; id: string }) {
  const status = useSyncExternalStore<VoiceStatus>(monitor.subscribe, () => monitor.getSnapshot().tracks[id]?.status ?? 'inactive', () => 'inactive')
  return <span className={styles.badge} data-status={status}>{VOICE_STATUS_LABELS[status]}</span>
}
export const MusicVoiceReadout = memo(function MusicVoiceReadout({ monitor, id, snapshot, manual = false, expanded = false, showStatus = true, instrument, onInstrumentChange, variationTabs = false, manageVariations = variationTabs, knobUpdateMode = 'immediate', loopOn = false, onLoopToggle, soloOn = false, onSoloToggle }: { loopOn?: boolean; onLoopToggle?: () => void; soloOn?: boolean; onSoloToggle?: () => void; instrument?:Instrument; onInstrumentChange?:(patch:InstrumentPerformanceEdit)=>void; monitor: MusicMonitor; id: string; snapshot: MusicSnapshot; manual?: boolean; expanded?: boolean; showStatus?: boolean; variationTabs?: boolean; manageVariations?: boolean; knobUpdateMode?:KnobUpdateMode }) {
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
  // Present already counts the pin: a pinned tab plays even in an empty section.
  const absentVariation=playback.present===false?activeTab:null
  const resizeActiveVariation=(delta:number)=>{
    if(!instrument||!onInstrumentChange||!activeRoll)return
    const bars=Math.max(1/beatsPerBar(snapshot.meter),Math.min(8,activeRoll.bars+delta/beatsPerBar(snapshot.meter)*4))
    onInstrumentChange({pianoRolls:instrument.pianoRolls.map((roll,index)=>index===activeTab?resizeRoll(activeRoll,bars):roll)})
  }
  // Same default as playback (piecePerformance): an instrument without arrangement keeps its phase.
  const restart=instrument?.arrangement?.restart ?? false
  const toggleRestart=()=>{
    const plan=snapshot.arrangement
    if(!instrument||!onInstrumentChange||!plan)return
    onInstrumentChange({arrangement:{restart:!restart,sections:Object.fromEntries(plan.sections.map((section,index)=>[section.id,pieceSection(instrument,plan,index)]))}})
  }
  // Euclid works from the roll as it was when opened (or last edited by hand),
  // so changing Pulses, Rotate or the mode never compounds earlier results.
  const [euclid, setEuclid] = useState<EuclidState | null>(null)
  // It acts on the variation on screen: when the arrangement moves to another tab,
  // that roll becomes the source and the settings carry over.
  if (euclid && !activeRoll) setEuclid(null)
  else if (euclid && activeRoll) {
    const json = JSON.stringify(activeRoll)
    if (euclid.tab !== activeTab || (json !== euclid.last && json !== euclid.sourceJson)) setEuclid({ ...euclid, tab: activeTab, source: activeRoll, sourceJson: json, last: json })
  }
  const euclidStepCount = activeRoll ? euclidSteps(activeRoll, beatsPerBar(snapshot.meter), division) : 1
  const toggleEuclid = () => { setArpOpen(false); setEuclid(current => current || !activeRoll ? null : { tab: activeTab, source: activeRoll, sourceJson: JSON.stringify(activeRoll), last: JSON.stringify(activeRoll), mode: 'notes', pulses: Math.max(1, Math.min(euclidStepCount, activeRoll.notes.length)), rotate: 0 }) }
  const changeEuclid = (patch: Partial<Pick<EuclidState, 'mode' | 'pulses' | 'rotate'>>) => {
    if (!euclid || !instrument || !onInstrumentChange) return
    const next = { ...euclid, ...patch }
    next.pulses = Math.max(0, Math.min(euclidStepCount, next.pulses))
    next.rotate = Math.max(0, Math.min(euclidStepCount - 1, next.rotate))
    const edit = euclidVariation(instrument, next.tab, next.source, { mode: next.mode, pulses: next.pulses, rotate: next.rotate, beatsPerBar: beatsPerBar(snapshot.meter), division })
    setEuclid({ ...next, last: JSON.stringify(edit.pianoRolls?.[next.tab]) })
    onInstrumentChange(edit)
  }
  // Arpeggiator: like Euclid, it always rewrites from the MIDI as it was before
  // the arp (or as last edited by hand), so re-applying never arpeggiates an arpeggio.
  const [arpConfig, setArpConfig] = useArpConfig()
  const [arpOpen, setArpOpen] = useState(false)
  const [arpMemory, setArpMemory] = useState<{ tab: number; source: PianoRoll; last: string } | null>(null)
  if (arpOpen && !activeRoll) setArpOpen(false)
  const applyArp = (config: ArpConfig) => {
    if (!instrument || !onInstrumentChange || !activeRoll) return
    const json = JSON.stringify(activeRoll)
    const source = arpMemory && arpMemory.tab === activeTab && arpMemory.last === json ? arpMemory.source : activeRoll
    const roll = arpeggiate(source, config, { beatsPerBar: beatsPerBar(snapshot.meter), degreesPerOctave: snapshot.scale.length || 7 })
    setArpMemory({ tab: activeTab, source, last: JSON.stringify(roll) })
    onInstrumentChange({ pianoRolls: instrument.pianoRolls.map((r, index) => index === activeTab ? roll : r) })
  }
  const toggleArpPanel = () => { setEuclid(null); setArpOpen(open => !open) }
  // The piano editor passes Delete note (only while a note is selected) as the first action.
  const variationActions = instrument && onInstrumentChange ? (leading: ReactNode) => <div className={styles.variationActions} aria-label="Variation actions">
    {leading}
    <DivisionPicker value={division} onChange={setDivision} meter={snapshot.meter??'4/4'}/>
    {snapshot.arrangement&&<button type="button" className={styles.restartToggle} aria-label="Restart MIDI when the global section starts" aria-pressed={restart} data-on={restart} title={restart ? 'Restart MIDI at each global section: on. The loop starts again when a section starts.' : 'Restart MIDI at each global section: off. The loop keeps its global phase across sections.'} onClick={toggleRestart}><RotateCw size={14}/></button>}
    <button type="button" aria-label="Reverse variation notes" title="Mirror the variation in time" onClick={() => onInstrumentChange(reverseVariation(instrument,activeTab))}><ArrowLeftRight size={14}/></button>
    <button type="button" aria-label="Randomize variation notes" title="Randomize notes" onClick={() => onInstrumentChange(randomizeVariation(instrument,activeTab))}><Dice5 size={14}/></button>
    <button type="button" className={styles.euclidToggle} aria-label="Euclidean pattern" aria-pressed={!!euclid} data-on={!!euclid} title="Euclidean pattern: spread pulses evenly over the grid to rewrite the rhythm, accents, ratchets or chance" onClick={toggleEuclid}><CircleDotDashed size={14}/></button>
    <ArpeggiatorButton open={arpOpen} disabled={!activeRoll} onApply={() => applyArp(arpConfig)} onToggleOpen={toggleArpPanel}/>
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
        {onLoopToggle&&<button type="button" className={styles.loopDot} aria-label={loopOn ? 'Turn off the piece' : 'Turn on the piece'} title={loopOn ? 'On: click to turn it off' : 'Off: click to turn it on'} aria-pressed={loopOn} data-on={loopOn} onClick={onLoopToggle}><span aria-hidden="true">{loopOn ? '●' : '○'}</span></button>}
        <div className={styles.variationTabList} role="tablist" aria-label="Instrument variations">{Array.from({ length: sourceVariationCount }, (_, index) => {
          const fixed = instrument.selectedVariation === index
          return <button key={index} type="button" role="tab" aria-selected={activeTab === index} aria-pressed={fixed} title="Pin only the MIDI variation; presence, transposition and timing keep following the global arrangement." data-active={activeTab === index} data-fixed={fixed} data-absent={absentVariation===index||undefined} onClick={() => onInstrumentChange({ selectedVariation: fixed ? undefined : index })}>{fixed&&<Pin className={styles.pinnedVariation} aria-hidden="true"/>}{String.fromCharCode(65 + index)}</button>
        })}
        {manageVariations&&<>
          <button type="button" aria-label="Add variation" title="Add variation" disabled={sourceVariationCount>=8} onClick={()=>onInstrumentChange(addVariation(instrument))}>+</button>
          <button type="button" aria-label="Remove last variation" title="Remove last variation" disabled={sourceVariationCount<=1} onClick={()=>onInstrumentChange(removeLastVariation(instrument))}>−</button>
        </>}
        </div>
        {onSoloToggle&&<button type="button" className={styles.soloText} aria-label={soloOn ? 'Disable solo' : 'Enable solo'} title="Solo" aria-pressed={soloOn} data-on={soloOn} onClick={onSoloToggle}>S</button>}
      </div>
      <MusicPianoEditor compact actions={variationActions} onlyVariation={activeTab} division={division} onDivisionChange={setDivision} snapshot={snapshot} id={id} monitor={monitor} instrument={instrument} onChange={onInstrumentChange} knobUpdateMode={knobUpdateMode} visualUpdatesEnabled={viewport.visualUpdatesEnabled}/>
      {euclid && <EuclidPanel state={euclid} steps={euclidStepCount} onChange={changeEuclid} />}
      {arpOpen && <ArpeggiatorPanel config={arpConfig} onChange={patch => applyArp(setArpConfig(patch))} />}
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
