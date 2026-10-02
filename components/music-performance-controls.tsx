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
    <summary>Arranjo desta peça<InfoTip label="Arranjo desta peça">Os nomes, durações e a ordem vêm do Arranjo global acima do tabuleiro. Aqui você escolhe somente a variação MIDI, a transposição e a presença desta peça em cada seção. Pins e regras substituem somente a variação: presença, transposição e relógio global continuam valendo.</InfoTip></summary>
    <div className={styles.arrangementStatus} aria-label="Estado do arranjo da peça">{frame.running ? 'Em execução' : 'Parado'} · {position.section.label} · {currentStep.active ? `Variação ${String.fromCharCode(65 + variation)}` : 'Pausa da peça'} · {Math.round(position.progress * 100)}%</div>
    {fixed !== undefined && <p className={styles.hint}>Variação {String.fromCharCode(65 + variation)} {override !== undefined ? 'forçada pela regra' : 'fixada na aba'}; somente a variação muda. Presença, transposição e duração seguem a seção global.</p>}
    <label>Seção global para esta peça<select aria-label="Seção global para esta peça" value={section.id} onChange={event => setSelectedId(event.target.value)}>{arrangement.sections.map(item => <option key={item.id} value={item.id}>{item.label} · {item.beats} tempos</option>)}</select></label>
    <div className={styles.pieceSectionIdentity} aria-label="Nome e duração da seção global"><span>{section.label}</span><span>{section.beats} tempos · editados no Arranjo global</span></div>
    <label>Variação MIDI da peça<select aria-label="Variação MIDI da peça nesta seção" value={step.variation % count} onChange={event => patch({ variation: Number(event.target.value) })}>{instrument.pianoRolls.map((_, bank) => <option key={bank} value={bank}>{String.fromCharCode(65 + bank)}</option>)}</select></label>
    <label><HelpLabel label="Transposição da peça nesta seção">Deslocamento cromático de −24 a +24 semitons, somente nas vozes afinadas. Zero conserva a escala base; a transposição pode sair da escala e continua valendo com uma variação fixada ou forçada.</HelpLabel><CompactNumberInput ariaLabel="Transposição da peça nesta seção" min={-24} max={24} value={step.transpose} onChange={transpose => { if (Number.isInteger(transpose)) patch({ transpose }) }} /></label>
    <label><input type="checkbox" checked={step.active} onChange={event => patch({ active: event.target.checked })} />Peça presente nesta seção global</label>
    <label><input type="checkbox" checked={instrument.arrangement?.restart ?? true} onChange={event => patch({}, event.target.checked)} />Reiniciar MIDI na entrada da seção global<InfoTip label="Reinício do MIDI">Marcado, o loop desta peça começa na entrada da seção global. Desmarcado, conserva sua fase global. A duração da seção e a presença/transposição continuam compartilhando o mesmo relógio, inclusive com pins e regras.</InfoTip></label>
  </details>
}
