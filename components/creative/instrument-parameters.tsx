"use client"
import type { CreativeSession } from '@/lib/music/creative'
import type { ParameterRange } from '@/lib/music/model'
import { InfoTip } from '../info-tip'
import { ParameterKnob, ParameterRangeKnob } from './parameter-range'
import styles from '../creative-studio.module.css'
import { SoundDesignKnobs, type DuckSource } from '../music-sound-design'
import { NoteParamsKnobs, type NoteParamsSelection } from '../music-note-params'

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
  /** Teammates offered as sidechain sources. */
  duckSources?: readonly DuckSource[]
  tab: InstrumentParamsTab
  onTab: (tab: InstrumentParamsTab) => void
  /** Note selected in the MIDI editor; the Note tab edits it. */
  noteSelection: NoteParamsSelection | null
}

export type InstrumentParamsTab = 'tuning' | 'filters' | 'modulation' | 'movement' | 'note'
const TABS: [InstrumentParamsTab, string][] = [['tuning', 'Tuning'], ['filters', 'Filters'], ['modulation', 'Modulation'], ['movement', 'Movement'], ['note', 'Note']]

/** The instrument's knobs in mini-tabs, like the match's Piece params. CreativeStudio keeps the session. */
export function InstrumentParameters({instrument, effects, mapping, updateInstrument, updateEffects, updateMapping, duckSources, tab, onTab, noteSelection}: Props) {
  const setRange = (key: 'lpfRange' | 'driveRange' | 'reverbRange' | 'swingRange', range: ParameterRange) => updateInstrument({ [key]: range })
  const percent = (range: { first: number; second: number }) => `${Math.round(range.first * 100)}–${Math.round(range.second * 100)}%`
  const tip = tab === 'modulation' ? <InfoTip label="Modulation and synthesis">The same controls as the FX/MOD page of Piece Params. RESO and F.ENV shape the low-pass; a custom delay time or feedback and a sidechain source move the piece to its own effect bus. LFO sweeps the low-pass, gain, pan or pitch over bars or in hertz. FM and unison apply to synths, LOOP to samples. ROLE tells States &amp; Events rules which instruments a rule can target.</InfoTip> : tab === 'movement' ? <InfoTip label="Movement and music">{instrument.behavior === 'pulse' ? 'Percussion keeps its degrees when moving; pan and filter still react.' : 'Offsets start from the original square. Advancing follows the piece’s color. The result is rounded to whole degrees and limited to ±12 degrees.'}</InfoTip> : null
  return <section className={styles.paramTabs} aria-label="Instrument parameters">
    <div className={styles.paramTabStrip}>
      <span role="tablist" aria-label="Parameter page">
        {TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} data-has-note={id === 'note' && noteSelection ? 'true' : undefined} onClick={() => onTab(id)}>{label}</button>)}
      </span>
      {tip}
    </div>
    {tab === 'tuning' && <div className={styles.controls}>
              <ParameterRangeKnob label="Octaves" value={instrument.octaveRange ?? { first: instrument.octave, second: instrument.octave, frequency: 'note' }} min={0} max={7} formatSingleValue={value => String(value)} onChange={octaveRange => updateInstrument({ octaveRange })} />
              <ParameterKnob label="Instrument gain" value={instrument.gain} min={0} max={1} onChange={gain => updateInstrument({ gain })} />
              <ParameterKnob label="Attack" value={instrument.attack} min={0.001} max={2} step={0.001} unit=" s" logarithmic onChange={attack => updateInstrument({ attack })} />
              <ParameterKnob label="Decay" value={effects.decay} min={0.01} max={2} unit=" s" logarithmic onChange={decay => updateEffects({ decay })} />
              <ParameterKnob label="Sustain" value={instrument.sustain ?? (instrument.behavior === 'pulse' ? 0 : 0.55)} min={0} max={1} onChange={sustain => updateInstrument({ sustain })} />
              <ParameterKnob label="Release" value={instrument.release} min={0.01} max={2} unit=" s" logarithmic onChange={release => updateInstrument({ release })} />
              <ParameterKnob label="Note length (fraction)" value={instrument.clip ?? (instrument.behavior === 'pulse' ? 0.12 : instrument.behavior === 'sustain' ? 0.95 : 0.7)} min={0.01} max={1} onChange={clip => updateInstrument({ clip })} />
              <ParameterKnob label="Pitch slide" value={instrument.pitchEnvelope ?? 0} min={-24} max={24} step={1} unit=" st" onChange={pitchEnvelope => updateInstrument({ pitchEnvelope })} />
              <ParameterKnob label="Slide time" value={instrument.pitchAttack ?? 0.15} min={0.001} max={2} step={0.01} unit=" s" onChange={pitchAttack => updateInstrument({ pitchAttack })} />
            </div>}
    {tab === 'filters' && <div className={styles.controls}>
              <ParameterRangeKnob label="Low-pass" value={{ ...instrument.lpfRange, first: instrument.lpfRange?.first ?? instrument.lpf, second: instrument.lpfRange?.second ?? instrument.lpf, frequency: instrument.lpfRange?.frequency ?? 'note' }} min={20} max={20000} step={10} formatValue={range => `${Number(range.first.toFixed(0))}–${Number(range.second.toFixed(0))}Hz`} formatSingleValue={value => `${Math.round(value)}Hz`} onChange={range => setRange('lpfRange', range)} />
              <ParameterKnob label="High-pass" value={instrument.hpf} min={0} max={20000} step={10} unit=" Hz" logarithmic onChange={hpf => updateInstrument({ hpf })} />
              <ParameterKnob label="Extra gain" value={effects.gain} min={0} max={2} onChange={gain => updateEffects({ gain })} />
              <ParameterKnob label="Pitch (multiplier)" value={effects.pitch} min={0.5} max={2} onChange={pitch => updateEffects({ pitch })} />
              <ParameterKnob label="Extra pan" value={effects.pan} min={-1} max={1} onChange={pan => updateEffects({ pan })} />
              <ParameterRangeKnob label="Reverb" value={instrument.reverbRange ?? { first: effects.reverb, second: effects.reverb }} min={0} max={1} step={.01} formatValue={percent} formatSingleValue={value => `${Math.round(value * 100)}%`} onChange={range => setRange('reverbRange', range)} />
              <ParameterKnob label="Play chance" value={instrument.playChance ?? 1} min={0} max={1} step={.01} formatValue={value => `${Math.round(value * 100)}%`} onChange={playChance => updateInstrument({ playChance })} />
              <ParameterKnob label="Dotted delay" value={effects.delay} min={0} max={1} onChange={delay => updateEffects({ delay })} />
              <ParameterRangeKnob label="Drive" value={instrument.driveRange ?? { first: instrument.distortion ?? 0, second: instrument.distortion ?? 0 }} min={0} max={10} step={.1} formatValue={range => `${Number(range.first.toFixed(1))}–${Number(range.second.toFixed(1))}`} formatSingleValue={value => Number(value.toFixed(1)).toString()} onChange={range => setRange('driveRange', range)} />
              <ParameterKnob label="Distortion level" value={instrument.distortionMix ?? 0.25} min={0} max={1} onChange={distortionMix => updateInstrument({ distortionMix })} />
              <ParameterRangeKnob label="Swing" value={instrument.swingRange ?? { first: instrument.extraSwing ?? 0, second: instrument.extraSwing ?? 0 }} min={0} max={.5} step={.01} formatValue={percent} formatSingleValue={value => `${Math.round(value * 100)}%`} onChange={range => setRange('swingRange', range)} />
            </div>}
    {tab === 'modulation' && <div className={styles.controls}>
              <SoundDesignKnobs variant="creative" instrument={instrument} onChange={updateInstrument} duckSources={duckSources} />
            </div>}
    {tab === 'movement' && <div className={styles.controls}>
              <ParameterKnob label="Degrees per file" value={mapping.fileDegrees} min={-4} max={4} step={0.5} onChange={fileDegrees => updateMapping({ fileDegrees })} />
              <ParameterKnob label="Degrees per rank" value={mapping.rankDegrees} min={-4} max={4} step={0.5} onChange={rankDegrees => updateMapping({ rankDegrees })} />
              <ParameterKnob label="Board stereo width" value={mapping.panWidth} min={0} max={1} onChange={panWidth => updateMapping({ panWidth })} />
              <label className={styles.check}><input type="checkbox" checked={mapping.previewFilter} onChange={e => updateMapping({ previewFilter: e.target.checked })} />Square rank shapes the single-note filter<InfoTip label="Single-note filter">The single note is the sound you hear when pressing a piece or crossing squares while dragging it. With this on, the square’s rank number caps the low-pass cutoff: higher ranks allow a brighter sound. The cap combines with the instrument’s effective filter; it never opens a filter that is already darker. It doesn’t change the loops’ filter, doesn’t activate the piece and doesn’t move the music clock. Unchecking removes only this rank influence.</InfoTip></label>
            </div>}
    {tab === 'note' && (noteSelection
      ? <div className={styles.noteKnobs} data-match-ui><NoteParamsKnobs note={noteSelection.note} onChange={noteSelection.onChange} updateMode={noteSelection.updateMode} /></div>
      : <p className={styles.paramHint}>Select a note in the MIDI editor above to edit its accent, pan, chance, ratchet, cutoff, slide and vibrato.</p>)}
  </section>
}
