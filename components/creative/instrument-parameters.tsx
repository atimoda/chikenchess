"use client"
import type { CreativeSession } from '@/lib/music/creative'
import type { Automations } from '@/lib/music/automation'
import { AutomationControls } from '../music-lab-controls'
import { HelpLabel, InfoTip } from '../info-tip'
import { CompactNumberInput } from '../compact-number-input'
import { ParameterKnob } from './parameter-range'
import styles from '../creative-studio.module.css'

type Instrument = CreativeSession['instruments'][string]
type Effects = CreativeSession['effects'][string]
type Mapping = CreativeSession['mappings'][string]
interface Props {
  selectedId: string
  instrument: Instrument
  effects: Effects
  mapping: Mapping
  updateInstrument: (patch: Partial<Instrument>) => void
  updateEffects: (patch: Partial<Effects>) => void
  updateMapping: (patch: Partial<Mapping>) => void
  onApplyAutomations: (automations: Automations) => Promise<void>
}

/** Presentation and callbacks only; CreativeStudio retains session ownership. */
export function InstrumentParameters({selectedId, instrument, effects, mapping, updateInstrument, updateEffects, updateMapping, onApplyAutomations}: Props) {
  return (
        <aside className={styles.inspector} aria-label="Parâmetros do instrumento">
          <section className={styles.panel}>
            <span className={styles.eyebrow}>03 / PARÂMETROS</span>
            <div className={styles.instrumentTitle}><h2>Som e movimento</h2><span>{instrument.name}</span></div>
            <details open><summary>Afinação e envelope</summary><div className={styles.controls}>
              <ParameterKnob label="Oitava" value={instrument.octave} min={0} max={7} step={1} onChange={octave => updateInstrument({ octave })} />
              <ParameterKnob label="Ganho do instrumento" value={instrument.gain} min={0} max={1} onChange={gain => updateInstrument({ gain })} />
              <ParameterKnob label="Ataque" value={instrument.attack} min={0.001} max={2} step={0.001} unit=" s" logarithmic onChange={attack => updateInstrument({ attack })} />
              <ParameterKnob label="Decaimento" value={effects.decay} min={0.01} max={2} unit=" s" logarithmic onChange={decay => updateEffects({ decay })} />
              <ParameterKnob label="Sustentação" value={instrument.sustain ?? (instrument.behavior === 'pulse' ? 0 : 0.55)} min={0} max={1} onChange={sustain => updateInstrument({ sustain })} />
              <ParameterKnob label="Liberação" value={instrument.release} min={0.01} max={2} unit=" s" logarithmic onChange={release => updateInstrument({ release })} />
              <ParameterKnob label="Duração da nota (fração)" value={instrument.clip ?? (instrument.behavior === 'pulse' ? 0.12 : instrument.behavior === 'sustain' ? 0.95 : 0.7)} min={0.01} max={1} onChange={clip => updateInstrument({ clip })} />
              <ParameterKnob label="Slide de afinação" value={instrument.pitchEnvelope ?? 0} min={-24} max={24} step={1} unit=" st" onChange={pitchEnvelope => updateInstrument({ pitchEnvelope })} />
              <label className={styles.wideControl}><HelpLabel label="Tempo do slide (s)">Tempo do envelope global deste instrumento em todas as variações. Só atua quando Slide de afinação é diferente de zero; uma nota com slide próprio usa seu próprio tempo.</HelpLabel><CompactNumberInput ariaLabel="Tempo do slide" min={0.001} max={2} step={0.01} value={instrument.pitchAttack ?? 0.15} onChange={pitchAttack => updateInstrument({ pitchAttack })} /></label>
            </div></details>
            <details open><summary>Filtros e efeitos</summary><div className={styles.controls}>
              <ParameterKnob label="Passa-baixas" value={instrument.lpf} min={20} max={20000} step={10} unit=" Hz" logarithmic onChange={lpf => updateInstrument({ lpf })} />
              <ParameterKnob label="Passa-altas" value={instrument.hpf} min={0} max={20000} step={10} unit=" Hz" logarithmic onChange={hpf => updateInstrument({ hpf })} />
              <ParameterKnob label="Ganho adicional" value={effects.gain} min={0} max={2} onChange={gain => updateEffects({ gain })} />
              <ParameterKnob label="Pitch (multiplicador)" value={effects.pitch} min={0.5} max={2} onChange={pitch => updateEffects({ pitch })} />
              <ParameterKnob label="Pan adicional" value={effects.pan} min={-1} max={1} onChange={pan => updateEffects({ pan })} />
              <ParameterKnob label="Reverb" value={effects.reverb} min={0} max={1} onChange={reverb => updateEffects({ reverb })} />
              <ParameterKnob label="Delay pontuado" value={effects.delay} min={0} max={1} onChange={delay => updateEffects({ delay })} />
              <ParameterKnob label="Distorção" value={instrument.distortion ?? 0} min={0} max={10} step={0.1} onChange={distortion => updateInstrument({ distortion })} />
              <ParameterKnob label="Nível da distorção" value={instrument.distortionMix ?? 0.25} min={0} max={1} onChange={distortionMix => updateInstrument({ distortionMix })} />
            </div></details>
            <details open><summary>Movimento → música<InfoTip label="Movimento e música">{instrument.behavior === 'pulse' ? 'Percussão mantém os graus ao mover; pan e filtro continuam reagindo.' : 'Deslocamentos partem da casa original. Avanço segue a cor da peça. O resultado é arredondado para graus inteiros e limitado a ±12 graus.'}</InfoTip></summary><div className={styles.controls}>
              <ParameterKnob label="Graus por coluna" value={mapping.fileDegrees} min={-4} max={4} step={0.5} onChange={fileDegrees => updateMapping({ fileDegrees })} />
              <ParameterKnob label="Graus por avanço" value={mapping.rankDegrees} min={-4} max={4} step={0.5} onChange={rankDegrees => updateMapping({ rankDegrees })} />
              <ParameterKnob label="Abertura estéreo do tabuleiro" value={mapping.panWidth} min={0} max={1} onChange={panWidth => updateMapping({ panWidth })} />
              <label className={styles.check}><input type="checkbox" checked={mapping.previewFilter} onChange={e => updateMapping({ previewFilter: e.target.checked })} />Altura da casa modula o filtro na prévia</label>
            </div></details>
            <AutomationControls id={selectedId} instrument={instrument} onApply={onApplyAutomations} />
          </section>
        </aside>
  )
}
