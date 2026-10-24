'use client'
import { useState, useSyncExternalStore } from 'react'
import type { CreativeSession } from '@/lib/music/creative'
import type { MusicMonitor } from '@/lib/music/monitor'
import { beatsPerBar } from '@/lib/music/meter'
import { arrangementPosition, pieceSection, pieceStep, type Arrangement, type PieceArrangement } from '@/lib/music/arrangement'
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
  const current = pieceStep(instrument, currentStep, override)
  const patch = (update: Partial<PieceArrangement['sections'][string]>, restart = instrument.arrangement?.restart ?? true) => {
    const sections = Object.fromEntries(arrangement.sections.map((item, sectionIndex) => [item.id, pieceSection(instrument, arrangement, sectionIndex)]))
    onChange({ arrangement: { restart, sections: { ...sections, [section.id]: { ...step, ...update } } } })
  }
  return <details open className={styles.pieceArrangement}>
    <summary>This piece’s arrangement<InfoTip label="This piece’s arrangement">Names, lengths and order come from the global Arrangement above the board. Here you only pick this piece’s MIDI variation and transposition in each section; with no variation the piece rests in that section. A pinned tab plays in every section, even one with no variation. Rules replace only the variation, so a section with no variation stays silent. Transposition and the global clock still apply.</InfoTip></summary>
    <div className={styles.arrangementStatus} aria-label="Piece arrangement status">{frame.running ? 'Playing' : 'Stopped'} · {position.section.label} · {current.active ? `Variation ${String.fromCharCode(65 + current.variation)}` : 'Piece rest'} · {Math.round(position.progress * 100)}%</div>
    {fixed !== undefined && <p className={styles.hint}>Variation {String.fromCharCode(65 + current.variation)} {override !== undefined ? 'forced by a rule; only the variation changes, and sections with no variation stay silent' : 'pinned on the tab; it plays in every section, even one with no variation'}. Transposition and length follow the global section.</p>}
    <label>Global section for this piece<select aria-label="Global section for this piece" value={section.id} onChange={event => setSelectedId(event.target.value)}>{arrangement.sections.map((item, itemIndex) => <option key={item.id} value={item.id}>{itemIndex + 1}. {item.label} · {item.beats} beats</option>)}</select></label>
    <div className={styles.pieceSectionIdentity} aria-label="Global section name and length"><span>{section.label}</span><span>{section.beats} beats · edited in the global Arrangement</span></div>
    <label>Piece MIDI variation<select aria-label="Piece MIDI variation in this section" value={step.variation === null ? '' : step.variation % count} onChange={event => patch({ variation: event.target.value === '' ? null : Number(event.target.value) })}><option value="">— none (piece rests)</option>{instrument.pianoRolls.map((_, bank) => <option key={bank} value={bank}>{String.fromCharCode(65 + bank)}</option>)}</select></label>
    <label><HelpLabel label="Piece transposition in this section">Chromatic shift from −24 to +24 semitones, on pitched voices only. Zero keeps the base scale; the transposition can leave the scale and still applies with a pinned or forced variation.</HelpLabel><CompactNumberInput ariaLabel="Piece transposition in this section" min={-24} max={24} value={step.transpose} onChange={transpose => { if (Number.isInteger(transpose)) patch({ transpose }) }} /></label>
    <label><input type="checkbox" checked={instrument.arrangement?.restart ?? true} onChange={event => patch({}, event.target.checked)} />Restart MIDI when the global section starts<InfoTip label="MIDI restart">Checked, this piece’s loop starts at the entry of the global section. Unchecked, it keeps its global phase. Section length and presence/transposition still share the same clock, including with pins and rules.</InfoTip></label>
  </details>
}
