'use client'
import { useState, useSyncExternalStore } from 'react'
import type { CreativeSession } from '@/lib/music/creative'
import type { MusicMonitor } from '@/lib/music/monitor'
import { beatsPerBar } from '@/lib/music/meter'
import { arrangementPosition, pieceSection, type Arrangement, type PieceArrangement } from '@/lib/music/arrangement'
import { HelpLabel, InfoTip } from './info-tip'
import { CompactNumberInput } from './compact-number-input'
import styles from './creative-studio.module.css'

type CreativeInstrument = CreativeSession['instruments'][string]

export function MusicPerformanceControls({ instrument, arrangement, onChange, monitor, override }: {
  instrument: CreativeInstrument; arrangement: Arrangement; onChange: (patch: Partial<CreativeInstrument>) => void; monitor: MusicMonitor; override?: number
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const frame = useSyncExternalStore(monitor.subscribe, monitor.getSnapshot, monitor.getServerSnapshot)
  const position = arrangementPosition(arrangement, frame.cycle, beatsPerBar(frame.transport?.meter))
  const index = Math.max(0, arrangement.sections.findIndex(section => section.id === selectedId))
  const section = arrangement.sections[index]
  const step = pieceSection(instrument, arrangement, index)
  const currentStep = pieceSection(instrument, arrangement, position.index)
  const count = instrument.pianoRolls.length
  const fixed = override ?? instrument.selectedVariation
  const variation = (fixed ?? currentStep.variation) % count
  const patch = (update: Partial<PieceArrangement['sections'][string]>, restart = instrument.arrangement?.restart ?? true) => {
    const sections = Object.fromEntries(arrangement.sections.map((item, sectionIndex) => [item.id, pieceSection(instrument, arrangement, sectionIndex)]))
    onChange({ arrangement: { restart, sections: { ...sections, [section.id]: { ...step, ...update } } } })
  }
  return <details open className={styles.pieceArrangement}>
    <summary>This piece’s arrangement<InfoTip label="This piece’s arrangement">Names, lengths and order come from the global Arrangement above the board. Here you only pick this piece’s MIDI variation, transposition and presence in each section. Pins and rules replace only the variation: presence, transposition and the global clock still apply.</InfoTip></summary>
    <div className={styles.arrangementStatus} aria-label="Piece arrangement status">{frame.running ? 'Playing' : 'Stopped'} · {position.section.label} · {currentStep.active ? `Variation ${String.fromCharCode(65 + variation)}` : 'Piece rest'} · {Math.round(position.progress * 100)}%</div>
    {fixed !== undefined && <p className={styles.hint}>Variation {String.fromCharCode(65 + variation)} {override !== undefined ? 'forced by a rule' : 'pinned on the tab'}; only the variation changes. Presence, transposition and length follow the global section.</p>}
    <label>Global section for this piece<select aria-label="Global section for this piece" value={section.id} onChange={event => setSelectedId(event.target.value)}>{arrangement.sections.map(item => <option key={item.id} value={item.id}>{item.label} · {item.beats} beats</option>)}</select></label>
    <div className={styles.pieceSectionIdentity} aria-label="Global section name and length"><span>{section.label}</span><span>{section.beats} beats · edited in the global Arrangement</span></div>
    <label>Piece MIDI variation<select aria-label="Piece MIDI variation in this section" value={step.variation % count} onChange={event => patch({ variation: Number(event.target.value) })}>{instrument.pianoRolls.map((_, bank) => <option key={bank} value={bank}>{String.fromCharCode(65 + bank)}</option>)}</select></label>
    <label><HelpLabel label="Piece transposition in this section">Chromatic shift from −24 to +24 semitones, on pitched voices only. Zero keeps the base scale; the transposition can leave the scale and still applies with a pinned or forced variation.</HelpLabel><CompactNumberInput ariaLabel="Piece transposition in this section" min={-24} max={24} value={step.transpose} onChange={transpose => { if (Number.isInteger(transpose)) patch({ transpose }) }} /></label>
    <label><input type="checkbox" checked={step.active} onChange={event => patch({ active: event.target.checked })} />Piece present in this global section</label>
    <label><input type="checkbox" checked={instrument.arrangement?.restart ?? true} onChange={event => patch({}, event.target.checked)} />Restart MIDI when the global section starts<InfoTip label="MIDI restart">Checked, this piece’s loop starts at the entry of the global section. Unchecked, it keeps its global phase. Section length and presence/transposition still share the same clock, including with pins and rules.</InfoTip></label>
  </details>
}
