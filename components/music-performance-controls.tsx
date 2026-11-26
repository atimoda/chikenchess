'use client'
import { useState, useSyncExternalStore } from 'react'
import type { CreativeSession } from '@/lib/music/creative'
import type { MusicMonitor } from '@/lib/music/monitor'
import { beatsPerBar } from '@/lib/music/meter'
import { arrangementPosition, pieceSection, pieceStep, type Arrangement, type PieceArrangement } from '@/lib/music/arrangement'
import { HelpLabel, InfoTip } from './info-tip'
import { useT } from '@/lib/i18n'
import { CompactNumberInput } from './compact-number-input'
import styles from './creative-studio.module.css'

type CreativeInstrument = CreativeSession['instruments'][string]

export function MusicPerformanceControls({ instrument, arrangement, onChange, monitor, override }: {
  instrument: CreativeInstrument; arrangement: Arrangement; onChange: (patch: Partial<CreativeInstrument>) => void; monitor: MusicMonitor; override?: number
}) {
  const t = useT()
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
  const patch = (update: Partial<PieceArrangement['sections'][string]>) => {
    const restart = instrument.arrangement?.restart ?? true
    const sections = Object.fromEntries(arrangement.sections.map((item, sectionIndex) => [item.id, pieceSection(instrument, arrangement, sectionIndex)]))
    onChange({ arrangement: { restart, sections: { ...sections, [section.id]: { ...step, ...update } } } })
  }
  return <details open className={styles.pieceArrangement}>
    <summary>{t('This piece’s arrangement')}<InfoTip label={t('This piece’s arrangement')}>{t('Names, lengths and order come from the global Arrangement above the board. Here you only pick this piece’s MIDI variation and transposition in each section; with no variation the piece rests in that section. A pinned tab plays in every section, even one with no variation. Rules replace only the variation, so a section with no variation stays silent. Transposition and the global clock still apply.')}</InfoTip></summary>
    <div className={styles.arrangementStatus} aria-label={t('Piece arrangement status')}>{frame.running ? t('Playing') : t('Stopped')} · {t(position.section.label)} · {current.active ? t('Variation {letter}', { letter: String.fromCharCode(65 + current.variation) }) : t('Piece rest')} · {Math.round(position.progress * 100)}%</div>
    {fixed !== undefined && <p className={styles.hint}>{t('Variation {letter} {state}. Transposition and length follow the global section.', { letter: String.fromCharCode(65 + current.variation), state: override !== undefined ? t('forced by a rule; only the variation changes, and sections with no variation stay silent') : t('pinned on the tab; it plays in every section, even one with no variation') })}</p>}
    <label>{t('Global section for this piece')}<select aria-label={t('Global section for this piece')} value={section.id} onChange={event => setSelectedId(event.target.value)}>{arrangement.sections.map((item, itemIndex) => <option key={item.id} value={item.id}>{t('{n}. {name} · {beats} beats', { n: itemIndex + 1, name: t(item.label), beats: item.beats })}</option>)}</select></label>
    <div className={styles.pieceSectionIdentity} aria-label={t('Global section name and length')}><span>{t(section.label)}</span><span>{t('{beats} beats · edited in the global Arrangement', { beats: section.beats })}</span></div>
    <label>{t('Piece MIDI variation')}<select aria-label={t('Piece MIDI variation in this section')} value={step.variation === null ? '' : step.variation % count} onChange={event => patch({ variation: event.target.value === '' ? null : Number(event.target.value) })}><option value="">{t('— none (piece rests)')}</option>{instrument.pianoRolls.map((_, bank) => <option key={bank} value={bank}>{String.fromCharCode(65 + bank)}</option>)}</select></label>
    <label><HelpLabel label={t('Fill into the next section')}>{t('Variation played in the last bar of this section, leading into the next one, like a drum fill. It needs a section longer than one bar and plays only when the piece is present there; a pinned tab or a rule override plays straight through.')}</HelpLabel><select aria-label={t("Fill variation in this section's last bar")} value={step.fill === undefined ? '' : step.fill % count} onChange={event => patch({ fill: event.target.value === '' ? undefined : Number(event.target.value) })}><option value="">{t('— no fill')}</option>{instrument.pianoRolls.map((_, bank) => <option key={bank} value={bank}>{String.fromCharCode(65 + bank)}</option>)}</select></label>
    <label><HelpLabel label={t('Piece transposition in this section')}>{t('Chromatic shift from −24 to +24 semitones, on pitched voices only. Zero keeps the base scale; the transposition can leave the scale and still applies with a pinned or forced variation.')}</HelpLabel><CompactNumberInput ariaLabel={t('Piece transposition in this section')} min={-24} max={24} value={step.transpose} onChange={transpose => { if (Number.isInteger(transpose)) patch({ transpose }) }} /></label>
  </details>
}
