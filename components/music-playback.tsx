'use client'

import { memo, useEffect, useState, useSyncExternalStore } from 'react'
import { isLoopRunning, VOICE_STATUS_LABELS, type MusicMonitor, type VoiceStatus } from '@/lib/music/monitor'
import type { MusicSnapshot } from '@/lib/music/runtime'
import { MUSIC_GRID_DIVISIONS, MusicPianoEditor, defaultGridDivision, gridDivisionLabel } from './music-piano-editor'
import type { Instrument, InstrumentPerformanceEdit } from '@/lib/music/model'
import { instrumentFor } from '@/lib/music/model'
import { addVariation, removeLastVariation, reverseVariation, randomizeVariation } from '@/lib/music/variation-edit'
import { resizeRoll } from '@/lib/music/piano-roll'
import { beatsPerBar, meterLabel } from '@/lib/music/meter'
import { InfoTip } from './info-tip'
import { variationPosition } from '@/lib/music/performance'
import { arrangementPosition, pieceSection, type Arrangement } from '@/lib/music/arrangement'
import { ArrowLeftRight, Dices, Minus, Pin, Plus } from 'lucide-react'
import styles from './music-playback.module.css'
import type { KnobUpdateMode } from './knob'

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
export function MusicTransportReadout({ monitor, arrangement, activeCount, solo = false, showBeatUnit = false }: { monitor: MusicMonitor; arrangement?: Arrangement; activeCount?: number; solo?: boolean; showBeatUnit?: boolean }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const position = arrangement ? arrangementPosition(arrangement, frame.cycle, beatsPerBar(frame.transport?.meter)) : undefined
  return <div className={styles.transport} aria-label="Relógio musical">
    <span>{frame.running ? 'Em execução' : 'Parado'} · Seção <b>{position?.section.label ?? frame.transport?.sectionLabel ?? String.fromCharCode(65 + Math.max(0, frame.section))}</b></span>
    <span>Compasso {Math.floor(frame.cycle) + 1}</span>
    {showBeatUnit&&<span aria-label="Unidade do BPM">{meterLabel(frame.transport?.meter).split(' · ').slice(1).join(' · ')}<InfoTip label="Unidade do pulso">O BPM conta pulsos por minuto, não células da grade. Semínima pontuada vale uma semínima mais metade dela: três colcheias. Em 6/8, 9/8 e 12/8, cada pulso tem três colcheias; são 2, 3 e 4 pulsos por compasso. No editor MIDI, “1 parte” é um pulso inteiro; “3 partes” divide esse pulso em três colcheias. O menu escolhe a subdivisão do pulso, não a unidade do BPM.</InfoTip></span>}
    {frame.transport&&<span aria-label="BPM em execução">{frame.transport.bpm.toFixed(1)} → {frame.transport.targetBpm.toFixed(1)} BPM {frame.transport.ramp&&frame.transport.ramp.progress<1&&<progress aria-label="Avanço da rampa" max={1} value={frame.transport.ramp.progress} style={{width:60}}/>}{frame.transport.pending.length>0&&` · ${frame.transport.pending.length} mudança(s) na virada`}</span>}
    <div className={styles.beats} aria-label={`Tempo ${frame.beat} de ${beatsPerBar(frame.transport?.meter)}`}>{Array.from({length:beatsPerBar(frame.transport?.meter)},(_,index)=>index+1).map(beat => <i key={beat} data-on={frame.running && frame.beat === beat} />)}</div>
    {activeCount!==undefined&&<span className={styles.scale}>{activeCount}/32 ativas{solo?' · solo':''}</span>}
  </div>
}
export function MusicVoiceBadge({ monitor, id }: { monitor: MusicMonitor; id: string }) {
  const status = useSyncExternalStore<VoiceStatus>(monitor.subscribe, () => monitor.getSnapshot().tracks[id]?.status ?? 'inactive', () => 'inactive')
  return <span className={styles.badge} data-status={status}>{VOICE_STATUS_LABELS[status]}</span>
}
export const MusicVoiceReadout = memo(function MusicVoiceReadout({ monitor, id, snapshot, manual = false, expanded = false, showStatus = true, instrument, onInstrumentChange, variationTabs = false, manageVariations = variationTabs, knobUpdateMode = 'immediate' }: { instrument?:Instrument; onInstrumentChange?:(patch:InstrumentPerformanceEdit)=>void; monitor: MusicMonitor; id: string; snapshot: MusicSnapshot; manual?: boolean; expanded?: boolean; showStatus?: boolean; variationTabs?: boolean; manageVariations?: boolean; knobUpdateMode?:KnobUpdateMode }) {
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const track = frame.tracks[id]
  const [division,setDivision]=useState(defaultGridDivision(snapshot.meter))
  useEffect(() => setDivision(defaultGridDivision(snapshot.meter)), [snapshot.meter])
  const editable=!!instrument&&!!onInstrumentChange
  const pianoEditor=editable&&!variationTabs
  const piece = snapshot.pieces.find(piece => piece.id === id)
  const sourceInstrument = instrument ?? snapshot.instruments?.[id] ?? (piece ? instrumentFor(piece) : undefined)
  const running = !manual && isLoopRunning(frame,id,sourceInstrument?.loopEnabled!==false)
  const sourceVariationCount = sourceInstrument?.pianoRolls.length ?? 0
  const globalPosition = snapshot.arrangement ? arrangementPosition(snapshot.arrangement,frame.cycle,beatsPerBar(snapshot.meter)) : undefined
  const playbackPosition = sourceInstrument ? variationPosition(sourceInstrument,globalPosition?.index ?? frame.section,frame.cycle,beatsPerBar(snapshot.meter),snapshot.sectionOverrides?.[id],snapshot.arrangement) : undefined
  const activeTab = playbackPosition?.variation ?? 0
  const activeRoll=instrument?.pianoRolls[activeTab]
  const currentSection=sourceInstrument&&snapshot.arrangement&&globalPosition ? pieceSection(sourceInstrument,snapshot.arrangement,globalPosition.index) : undefined
  const absentVariation=currentSection&&!currentSection.active?activeTab:null
  const resizeActiveVariation=(delta:number)=>{
    if(!instrument||!onInstrumentChange||!activeRoll)return
    const bars=Math.max(1/beatsPerBar(snapshot.meter),Math.min(8,activeRoll.bars+delta/beatsPerBar(snapshot.meter)*4))
    onInstrumentChange({pianoRolls:instrument.pianoRolls.map((roll,index)=>index===activeTab?resizeRoll(activeRoll,bars):roll)})
  }
  const variationActions = instrument && onInstrumentChange ? <div className={styles.variationActions} aria-label="Ações da variação">
    <DivisionPicker value={division} onChange={setDivision} meter={snapshot.meter??'4/4'}/>
    <button type="button" aria-label="Inverter notas da variação" title="Espelhar variação no tempo" onClick={() => onInstrumentChange(reverseVariation(instrument,activeTab))}><ArrowLeftRight size={14}/></button>
    <button type="button" aria-label="Randomizar notas da variação" title="Sortear notas" onClick={() => onInstrumentChange(randomizeVariation(instrument,activeTab))}><Dices size={14}/></button>
    <button type="button" aria-label={`Diminuir duração da variação ${activeTab+1}`} title="Diminuir um tempo" disabled={!activeRoll||activeRoll.bars<=1/beatsPerBar(snapshot.meter)} onClick={()=>resizeActiveVariation(-.25)}><Minus size={14}/></button>
    <button type="button" aria-label={`Aumentar duração da variação ${activeTab+1}`} title="Aumentar um tempo" disabled={!activeRoll||activeRoll.bars>=8} onClick={()=>resizeActiveVariation(.25)}><Plus size={14}/></button>
  </div> : null
  const notes = sourceInstrument?.pianoRolls.flatMap(roll => roll.notes.map(note => note.degree)) ?? []
  const bottom = notes.length ? Math.min(...notes) : 0
  const top = notes.length ? Math.max(...notes) : 0
  return <div className={styles.voice} aria-label="Execução do instrumento">
    {showStatus&&<div className={styles.line}><MusicVoiceBadge monitor={monitor} id={id} /><span>{track?.notes.map(noteLabel).join(' + ')}</span></div>}
    {pianoEditor ? <MusicPianoEditor snapshot={snapshot} id={id} monitor={monitor} instrument={instrument} onChange={onInstrumentChange} knobUpdateMode={knobUpdateMode}/> : <div className={styles.variationViewer} data-loop-enabled={instrument?.loopEnabled!==false}>
      {variationTabs && instrument && onInstrumentChange && <>
      <div className={styles.variationTabs} data-manage-variations={manageVariations||undefined}>
        <div className={styles.variationTabList} role="tablist" aria-label="Variações do instrumento">{Array.from({ length: sourceVariationCount }, (_, index) => {
          const fixed = instrument.selectedVariation === index
          return <button key={index} type="button" role="tab" aria-selected={activeTab === index} aria-pressed={fixed} title="Fixar somente a variação MIDI; presença, transposição e tempo continuam seguindo o arranjo global." data-active={activeTab === index} data-fixed={fixed} data-absent={absentVariation===index||undefined} onClick={() => onInstrumentChange({ selectedVariation: fixed ? undefined : index })}>{fixed&&<Pin className={styles.pinnedVariation} aria-hidden="true"/>}{String.fromCharCode(65 + index)}</button>
        })}
        {manageVariations&&<>
          <button type="button" aria-label="Adicionar variação" title="Adicionar variação" disabled={sourceVariationCount>=8} onClick={()=>onInstrumentChange(addVariation(instrument))}>+</button>
          <button type="button" aria-label="Remover última variação" title="Remover última variação" disabled={sourceVariationCount<=1} onClick={()=>onInstrumentChange(removeLastVariation(instrument))}>−</button>
        </>}
        </div>
      </div>
      <MusicPianoEditor compact actions={variationActions} onlyVariation={activeTab} division={division} onDivisionChange={setDivision} snapshot={snapshot} id={id} monitor={monitor} instrument={instrument} onChange={onInstrumentChange} knobUpdateMode={knobUpdateMode}/>
      </>}
      {!variationTabs&&<>
      <div className={styles.variations} data-tabbed={variationTabs || undefined} style={expanded ? { height:'auto', maxHeight:'none', overflow:'visible' } : undefined} tabIndex={0} aria-label="Variações salvas da peça">
      {sourceInstrument?.pianoRolls.map((roll, index) => {
        const active = activeTab === index
        const sounding = running && active && playbackPosition?.present
        const cursor = (playbackPosition?.phase ?? 0) % roll.bars
        return <div key={index} className={styles.variation} data-active={running && active}>
        <div className={styles.variationLabel}><b>Variação {String.fromCharCode(65 + index)}</b><span>{running && active ? sounding ? 'Em execução' : 'Pausa da seção' : `${roll.bars} compassos`}</span></div>
        <svg viewBox="0 0 300 66" role="img" aria-label={`Notas e pausas da variação ${String.fromCharCode(65 + index)}`}>
          {Array.from({ length: 17 }, (_, i) => <line key={i} x1={i * 18.75} x2={i * 18.75} y1="0" y2="66" stroke={i % 4 ? '#26362b' : '#415246'} />)}
          {roll.notes.map((note, noteIndex) => <rect key={noteIndex} x={note.start / roll.bars * 300} y={48 - (note.degree - bottom) / Math.max(1, top - bottom) * 38}
            width={Math.max(1, note.duration / roll.bars * 300 - 1)} height="12" rx="2" opacity={Math.max(.15, note.velocity)}
            fill={sounding && cursor >= note.start && cursor < note.start + note.duration ? '#edff9f' : '#76a58b'}><title>{`Grau ${note.degree}`}</title></rect>)}
          {sounding && <line data-playhead="true" x1={cursor / roll.bars * 300} x2={cursor / roll.bars * 300} y1="0" y2="66" stroke="#f8edce" strokeWidth="2" />}
        </svg>
      </div>})}
      </div>
      </>}
    </div>
    }
  </div>
})
