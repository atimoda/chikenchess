"use client"
import type { CreativeSession } from '@/lib/music/creative'
import type { ParameterRange } from '@/lib/music/model'
import { InfoTip } from '../info-tip'
import { ParameterKnob, ParameterRangeKnob } from './parameter-range'
import styles from '../creative-studio.module.css'

type Instrument = CreativeSession['instruments'][string]
type Effects = CreativeSession['effects'][string]
type Mapping = CreativeSession['mappings'][string]
interface Props {
  instrument: Instrument
  effects: Effects
  mapping: Mapping
  updateInstrument: (patch: Partial<Instrument>) => void
  updateEffects: (patch: Partial<Effects>) => void
  updateMapping: (patch: Partial<Mapping>) => void
}

/** Presentation and callbacks only; CreativeStudio retains session ownership. */
export function InstrumentParameters({instrument, effects, mapping, updateInstrument, updateEffects, updateMapping}: Props) {
  const setRange = (key: 'lpfRange' | 'driveRange' | 'reverbRange' | 'swingRange', range: ParameterRange) => updateInstrument({ [key]: range })
  const percent = (range: { first: number; second: number }) => `${Math.round(range.first * 100)}–${Math.round(range.second * 100)}%`
  return (
        <aside className={styles.inspector} aria-label="Parâmetros do instrumento">
          <section className={styles.panel}>
            <span className={styles.eyebrow}>03 / PARÂMETROS</span>
            <div className={styles.instrumentTitle}><h2>Som e movimento</h2><span>{instrument.name}</span></div>
            <details open><summary>Afinação e envelope</summary><div className={styles.controls}>
              <ParameterRangeKnob label="Range" value={instrument.octaveRange ?? { first: instrument.octave, second: instrument.octave, frequency: 'note' }} min={0} max={7} formatSingleValue={value => String(value)} onChange={octaveRange => updateInstrument({ octaveRange })} />
              <ParameterKnob label="Ganho do instrumento" value={instrument.gain} min={0} max={1} onChange={gain => updateInstrument({ gain })} />
              <ParameterKnob label="Ataque" value={instrument.attack} min={0.001} max={2} step={0.001} unit=" s" logarithmic onChange={attack => updateInstrument({ attack })} />
              <ParameterKnob label="Decaimento" value={effects.decay} min={0.01} max={2} unit=" s" logarithmic onChange={decay => updateEffects({ decay })} />
              <ParameterKnob label="Sustentação" value={instrument.sustain ?? (instrument.behavior === 'pulse' ? 0 : 0.55)} min={0} max={1} onChange={sustain => updateInstrument({ sustain })} />
              <ParameterKnob label="Liberação" value={instrument.release} min={0.01} max={2} unit=" s" logarithmic onChange={release => updateInstrument({ release })} />
              <ParameterKnob label="Duração da nota (fração)" value={instrument.clip ?? (instrument.behavior === 'pulse' ? 0.12 : instrument.behavior === 'sustain' ? 0.95 : 0.7)} min={0.01} max={1} onChange={clip => updateInstrument({ clip })} />
              <ParameterKnob label="Slide de afinação" value={instrument.pitchEnvelope ?? 0} min={-24} max={24} step={1} unit=" st" onChange={pitchEnvelope => updateInstrument({ pitchEnvelope })} />
              <ParameterKnob label="Tempo do slide" value={instrument.pitchAttack ?? 0.15} min={0.001} max={2} step={0.01} unit=" s" onChange={pitchAttack => updateInstrument({ pitchAttack })} />
            </div></details>
            <details open><summary>Filtros e efeitos</summary><div className={styles.controls}>
              <ParameterRangeKnob label="Passa-baixas" value={{ ...instrument.lpfRange, first: instrument.lpfRange?.first ?? instrument.lpf, second: instrument.lpfRange?.second ?? instrument.lpf, frequency: instrument.lpfRange?.frequency ?? 'note' }} min={20} max={20000} step={10} formatValue={range => `${Number(range.first.toFixed(0))}–${Number(range.second.toFixed(0))}Hz`} formatSingleValue={value => `${Math.round(value)}Hz`} onChange={range => setRange('lpfRange', range)} />
              <ParameterKnob label="Passa-altas" value={instrument.hpf} min={0} max={20000} step={10} unit=" Hz" logarithmic onChange={hpf => updateInstrument({ hpf })} />
              <ParameterKnob label="Ganho adicional" value={effects.gain} min={0} max={2} onChange={gain => updateEffects({ gain })} />
              <ParameterKnob label="Pitch (multiplicador)" value={effects.pitch} min={0.5} max={2} onChange={pitch => updateEffects({ pitch })} />
              <ParameterKnob label="Pan adicional" value={effects.pan} min={-1} max={1} onChange={pan => updateEffects({ pan })} />
              <ParameterRangeKnob label="Reverb" value={instrument.reverbRange ?? { first: effects.reverb, second: effects.reverb }} min={0} max={1} step={.01} formatValue={percent} formatSingleValue={value => `${Math.round(value * 100)}%`} onChange={range => setRange('reverbRange', range)} />
              <ParameterKnob label="Chance de tocar" value={instrument.playChance ?? 1} min={0} max={1} step={.01} formatValue={value => `${Math.round(value * 100)}%`} onChange={playChance => updateInstrument({ playChance })} />
              <ParameterKnob label="Delay pontuado" value={effects.delay} min={0} max={1} onChange={delay => updateEffects({ delay })} />
              <ParameterRangeKnob label="Drive" value={instrument.driveRange ?? { first: instrument.distortion ?? 0, second: instrument.distortion ?? 0 }} min={0} max={10} step={.1} formatValue={range => `${Number(range.first.toFixed(1))}–${Number(range.second.toFixed(1))}`} formatSingleValue={value => Number(value.toFixed(1)).toString()} onChange={range => setRange('driveRange', range)} />
              <ParameterKnob label="Nível da distorção" value={instrument.distortionMix ?? 0.25} min={0} max={1} onChange={distortionMix => updateInstrument({ distortionMix })} />
              <ParameterRangeKnob label="Swing" value={instrument.swingRange ?? { first: instrument.extraSwing ?? 0, second: instrument.extraSwing ?? 0 }} min={0} max={.5} step={.01} formatValue={percent} formatSingleValue={value => `${Math.round(value * 100)}%`} onChange={range => setRange('swingRange', range)} />
            </div></details>
            <details open><summary>Movimento → música<InfoTip label="Movimento e música">{instrument.behavior === 'pulse' ? 'Percussão mantém os graus ao mover; pan e filtro continuam reagindo.' : 'Deslocamentos partem da casa original. Avanço segue a cor da peça. O resultado é arredondado para graus inteiros e limitado a ±12 graus.'}</InfoTip></summary><div className={styles.controls}>
              <ParameterKnob label="Graus por coluna" value={mapping.fileDegrees} min={-4} max={4} step={0.5} onChange={fileDegrees => updateMapping({ fileDegrees })} />
              <ParameterKnob label="Graus por avanço" value={mapping.rankDegrees} min={-4} max={4} step={0.5} onChange={rankDegrees => updateMapping({ rankDegrees })} />
              <ParameterKnob label="Abertura estéreo do tabuleiro" value={mapping.panWidth} min={0} max={1} onChange={panWidth => updateMapping({ panWidth })} />
              <label className={styles.check}><input type="checkbox" checked={mapping.previewFilter} onChange={e => updateMapping({ previewFilter: e.target.checked })} />Altura da casa modula o filtro na nota avulsa<InfoTip label="Filtro da nota avulsa">A nota avulsa é o som que você ouve ao pressionar uma peça ou atravessar casas enquanto a arrasta. Com esta opção ligada, o número da linha da casa limita o corte do passa-baixas: linhas mais altas permitem um som mais aberto. O limite se combina com o filtro efetivo do instrumento; não abre um filtro que já está mais fechado. Não altera o filtro dos loops, não ativa a peça e não muda o relógio da música. Desmarcar remove somente essa influência da altura.</InfoTip></label>
            </div></details>
          </section>
        </aside>
  )
}
