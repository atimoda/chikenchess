"use client"
import type { Instrument, MovementMapping, ParameterRange } from '@/lib/music/model'
import { pieceSection, type Arrangement } from '@/lib/music/arrangement'
import type { SquareEffects } from '@/lib/types'
import { sectionPatch, sectionView, withSectionParams, type SectionParamKey, type SectionParams } from '@/lib/music/section-params'
import { InfoTip } from '../info-tip'
import { ParameterHelpContext, ParameterKnob, ParameterRangeKnob, type ParameterScope } from './parameter-range'
import styles from '../creative-studio.module.css'
import { SoundDesignKnobs, type DuckSource } from '../music-sound-design'
import { NoteParamsKnobs, type NoteParamsSelection } from '../music-note-params'

type Effects = Pick<SquareEffects, 'gain' | 'pitch' | 'pan' | 'delay' | 'reverb' | 'decay'> & Partial<Pick<SquareEffects, 'lpf' | 'hpf'>>
/** The section the Section scope edits, and the piece's assignment used when it has none saved yet. */
export interface ParamsSection { id: string; label: string; fallback: { variation: number | null; transpose: number } }
/** The arrangement section the Section scope edits for this instrument, or null. */
export function paramsSection(arrangement: Arrangement | undefined, instrument: Instrument, id: string | null | undefined): ParamsSection | null {
  const index = arrangement && id ? arrangement.sections.findIndex(section => section.id === id) : -1
  if (!arrangement || index < 0) return null
  const step = pieceSection(instrument, arrangement, index)
  return { id: id!, label: `${index + 1}. ${arrangement.sections[index].label}`, fallback: { variation: step.variation, transpose: step.transpose } }
}
interface Props {
  instrument: Instrument
  effects: Effects
  /** Creative only: the Movement tab edits how the board moves the piece. */
  mapping?: MovementMapping
  updateInstrument: (patch: Partial<Instrument>) => void
  updateEffects: (patch: Partial<Effects>) => void
  updateMapping?: (patch: Partial<MovementMapping>) => void
  /** Teammates offered as sidechain sources. */
  duckSources?: readonly DuckSource[]
  tab: InstrumentParamsTab
  onTab: (tab: InstrumentParamsTab) => void
  scope: ParamsScope
  onScope: (scope: ParamsScope) => void
  /** Section selected in the arrangement strip; without one the Section scope is unavailable. */
  section: ParamsSection | null
  /** Note selected in the MIDI editor; the Note scope edits it. */
  noteSelection: NoteParamsSelection | null
  /** In a match the instrument gain, distortion level and Movement stay out (the match doesn't edit them) and HPF lives in the effects. */
  variant?: 'creative' | 'match'
  /** Live values drawn on the match's knobs. */
  monitorValues?: { gain?: number; pan?: number; delay?: number; lpf?: number; room?: number }
  /** Applies knob changes when the pointer is released (match) or while turning (Creative). */
  updateMode?: 'immediate' | 'on-release'
}

export type InstrumentParamsTab = 'filters' | 'modulation' | 'movement'
export type ParamsScope = 'all' | 'section' | 'note'
const TABS: [InstrumentParamsTab, string][] = [['filters', 'Filters & Tuning'], ['modulation', 'Modulation'], ['movement', 'Movement']]
const SCOPES: [ParamsScope, string][] = [['all', 'All'], ['section', 'Section'], ['note', 'Note']]
// Fields a section can't change: bus-level, identity or board movement.
const NOT_IN_SECTION = new Set(['octaveRange', 'pitch', 'distortionMix', 'swingRange', 'delayTime', 'delayFeedback', 'duckSource', 'duckDepth', 'duckRelease', 'role'])
const midpoint = (range: { first: number; second: number } | undefined) => range ? (range.first + range.second) / 2 : undefined

/** The instrument's knobs in mini-tabs, with All / Section / Note scopes. Used by Creative and by the match's Piece params. */
export function InstrumentParameters({instrument: all, effects: allEffects, mapping, updateInstrument, updateEffects, updateMapping, duckSources, tab, onTab, scope, onScope, section, noteSelection, variant = 'creative', monitorValues = {}, updateMode = 'immediate'}: Props) {
  const match = variant === 'match'
  const inSection = scope === 'section' && !!section
  const params: SectionParams = (section && all.arrangement?.sections[section.id]?.params) || {}
  const view = inSection ? sectionView(all, allEffects, params) : { instrument: all, effects: allEffects }
  const instrument = view.instrument, effects = view.effects
  const writeSection = (change: SectionParams, before: SectionParams) => {
    if (!section) return
    // Turning an inherited knob back to the value it already shows doesn't personalize it.
    const own = Object.fromEntries(Object.entries(change).filter(([key, value]) => params[key as SectionParamKey] !== undefined || JSON.stringify(value) !== JSON.stringify(before[key as SectionParamKey])))
    if (Object.keys(own).length) updateInstrument({ arrangement: withSectionParams(all, section.id, own, section.fallback) })
  }
  const pick = <T extends object>(source: T, keys: string[]) => Object.fromEntries(keys.map(key => [key, (source as Record<string, unknown>)[key]])) as Partial<T>
  const setInstrument = (patch: Partial<Instrument>) => inSection ? writeSection(sectionPatch(patch), sectionPatch(pick(instrument, Object.keys(patch)))) : updateInstrument(patch)
  const setEffects = (patch: Partial<Effects>) => inSection ? writeSection(sectionPatch({}, patch), sectionPatch({}, pick(effects, Object.keys(patch)))) : updateEffects(patch)
  const setHpf = (hpf: number) => match ? setEffects({ hpf }) : setInstrument({ hpf })
  const scoped = (field: string): ParameterScope | undefined => {
    if (!inSection) return undefined
    const key = (({ gain: 'gain', decay: 'decay', extraGain: 'fxGain', extraPan: 'fxPan', delay: 'delay' }) as Record<string, string>)[field] ?? field
    return { inherited: params[key as SectionParamKey] === undefined, onReset: () => updateInstrument({ arrangement: withSectionParams(all, section!.id, { [key]: undefined }, section!.fallback) }) }
  }
  const hidden = (field: string) => inSection && NOT_IN_SECTION.has(field)
  const setRange = (key: 'lpfRange' | 'driveRange' | 'reverbRange' | 'swingRange', range: ParameterRange) => setInstrument({ [key]: range })
  const percent = (range: { first: number; second: number }) => `${Math.round(range.first * 100)}–${Math.round(range.second * 100)}%`
  const tip = tab === 'modulation' ? <InfoTip label="Modulation and synthesis">RESO and F.ENV shape the low-pass; a custom delay time or feedback and a sidechain source move the piece to its own effect bus. LFO sweeps the low-pass, gain, pan or pitch over bars or in hertz. FM and unison apply to synths, LOOP to samples. ROLE tells States &amp; Events rules which instruments a rule can target.</InfoTip> : tab === 'movement' ? <InfoTip label="Movement and music">{instrument.behavior === 'pulse' ? 'Percussion keeps its degrees when moving; pan and filter still react.' : 'Offsets start from the original square. Advancing follows the piece’s color. The result is rounded to whole degrees and limited to ±12 degrees.'}</InfoTip> : null
  const scopeTip = <InfoTip label="All, Section and Note">All edits the whole instrument. Section edits only the section selected in the arrangement strip, and Note only the note selected in the MIDI editor: faded knobs follow All; changing one makes it the section’s or note’s own, and a double click returns it to All. Delay time and feedback, sidechain, role, octaves, swing, pitch multiplier and Movement belong to the whole instrument.</InfoTip>
  const tabs = TABS.filter(([id]) => id !== 'movement' || (mapping && updateMapping && scope === 'all'))
  const page = tabs.some(([id]) => id === tab) ? tab : 'filters'
  const knob = (field: string, props: Omit<Parameters<typeof ParameterKnob>[0], 'scope' | 'updateMode'>) => hidden(field) ? null : <ParameterKnob key={field} {...props} updateMode={updateMode} scope={scoped(field)} />
  const ranged = (field: string, props: Omit<Parameters<typeof ParameterRangeKnob>[0], 'scope' | 'updateMode' | 'showFrequency'>) => hidden(field) ? null : <ParameterRangeKnob key={field} {...props} updateMode={updateMode} showFrequency={!inSection} scope={scoped(field)} />
  const reverbBase = midpoint(all.reverbRange) ?? allEffects.reverb, driveBase = midpoint(all.driveRange) ?? all.distortion ?? 0
  // Help tips stay in Creative; the match shows only the controls.
  return <ParameterHelpContext.Provider value={!match}><section className={styles.paramTabs} aria-label="Instrument parameters">
    <div className={styles.paramScopeStrip}>
      <span role="tablist" aria-label="Parameter scope">
        {SCOPES.map(([id, label]) => {
          const unavailable = id === 'section' ? !section : id === 'note' ? !noteSelection : false
          return <button key={id} type="button" role="tab" aria-selected={scope === id} disabled={unavailable} title={id === 'section' && section ? section.label : undefined} onClick={() => onScope(id)}>{label}</button>
        })}
      </span>
      {!match && scopeTip}
    </div>
    {scope !== 'note' && <div className={styles.paramTabStrip}>
      <span role="tablist" aria-label="Parameter page">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={page === id} onClick={() => onTab(id)}>{label}</button>)}
      </span>
      {!match && tip}
    </div>}
    {scope !== 'note' && page === 'filters' && <div className={styles.controls}>
      {ranged('lpfRange', { label: 'Low-pass', value: { ...instrument.lpfRange, first: instrument.lpfRange?.first ?? effects.lpf ?? instrument.lpf, second: instrument.lpfRange?.second ?? effects.lpf ?? instrument.lpf, frequency: instrument.lpfRange?.frequency ?? 'note' }, min: 20, max: 20000, step: 10, monitorValue: monitorValues.lpf, formatValue: range => `${Number(range.first.toFixed(0))}–${Number(range.second.toFixed(0))}Hz`, formatSingleValue: value => `${Math.round(value)}Hz`, onChange: range => setRange('lpfRange', range) })}
      {knob('hpf', { label: 'High-pass', value: inSection && params.hpf !== undefined ? params.hpf : effects.hpf ?? instrument.hpf, min: 0, max: 20000, step: 10, unit: ' Hz', logarithmic: true, onChange: setHpf })}
      {knob('extraGain', { label: 'Extra gain', value: effects.gain, min: 0, max: 2, monitorValue: monitorValues.gain, onChange: gain => setEffects({ gain }) })}
      {knob('pitch', { label: 'Pitch (multiplier)', value: effects.pitch, min: 0.5, max: 2, onChange: pitch => setEffects({ pitch }) })}
      {knob('extraPan', { label: 'Extra pan', value: effects.pan, min: -1, max: 1, monitorValue: monitorValues.pan === undefined ? undefined : monitorValues.pan * 2 - 1, onChange: pan => setEffects({ pan }) })}
      {ranged('reverbRange', { label: 'Reverb', value: instrument.reverbRange ?? { first: effects.reverb, second: effects.reverb }, min: 0, max: 1, step: .01, monitorValue: monitorValues.room, formatValue: percent, formatSingleValue: value => `${Math.round(value * 100)}%`, onChange: range => setRange('reverbRange', range) })}
      {knob('playChance', { label: 'Play chance', value: instrument.playChance ?? 1, min: 0, max: 1, step: .01, formatValue: value => `${Math.round(value * 100)}%`, onChange: playChance => setInstrument({ playChance }) })}
      {knob('delay', { label: 'Dotted delay', value: effects.delay, min: 0, max: 1, monitorValue: monitorValues.delay, onChange: delay => setEffects({ delay }) })}
      {ranged('driveRange', { label: 'Drive', value: instrument.driveRange ?? { first: instrument.distortion ?? 0, second: instrument.distortion ?? 0 }, min: 0, max: 10, step: .1, formatValue: range => `${Number(range.first.toFixed(1))}–${Number(range.second.toFixed(1))}`, formatSingleValue: value => Number(value.toFixed(1)).toString(), onChange: range => setRange('driveRange', range) })}
      {!match && knob('distortionMix', { label: 'Distortion level', value: instrument.distortionMix ?? 0.25, min: 0, max: 1, onChange: distortionMix => setInstrument({ distortionMix }) })}
      {ranged('swingRange', { label: 'Swing', value: instrument.swingRange ?? { first: instrument.extraSwing ?? 0, second: instrument.extraSwing ?? 0 }, min: 0, max: .5, step: .01, formatValue: percent, formatSingleValue: value => `${Math.round(value * 100)}%`, onChange: range => setRange('swingRange', range) })}
      {ranged('octaveRange', { label: 'Octaves', value: instrument.octaveRange ?? { first: instrument.octave, second: instrument.octave, frequency: 'note' }, min: 0, max: 7, formatSingleValue: value => String(value), onChange: octaveRange => setInstrument({ octaveRange }) })}
      {!match && knob('gain', { label: 'Instrument gain', value: instrument.gain, min: 0, max: 1, onChange: gain => setInstrument({ gain }) })}
      {knob('attack', { label: 'Attack', value: instrument.attack, min: 0.001, max: 2, step: 0.001, unit: ' s', logarithmic: true, onChange: attack => setInstrument({ attack }) })}
      {knob('decay', { label: 'Decay', value: effects.decay, min: 0.01, max: 2, unit: ' s', logarithmic: true, onChange: decay => setEffects({ decay }) })}
      {knob('sustain', { label: 'Sustain', value: instrument.sustain ?? (instrument.behavior === 'pulse' ? 0 : 0.55), min: 0, max: 1, onChange: sustain => setInstrument({ sustain }) })}
      {knob('release', { label: 'Release', value: instrument.release, min: 0.01, max: 2, unit: ' s', logarithmic: true, onChange: release => setInstrument({ release }) })}
      {knob('clip', { label: 'Note length (fraction)', value: instrument.clip ?? (instrument.behavior === 'pulse' ? 0.12 : instrument.behavior === 'sustain' ? 0.95 : 0.7), min: 0.01, max: 1, onChange: clip => setInstrument({ clip }) })}
      {knob('pitchEnvelope', { label: 'Pitch slide', value: instrument.pitchEnvelope ?? 0, min: -24, max: 24, step: 1, unit: ' st', onChange: pitchEnvelope => setInstrument({ pitchEnvelope }) })}
      {knob('pitchAttack', { label: 'Slide time', value: instrument.pitchAttack ?? 0.15, min: 0.001, max: 2, step: 0.01, unit: ' s', onChange: pitchAttack => setInstrument({ pitchAttack }) })}
    </div>}
    {scope !== 'note' && page === 'modulation' && <div className={styles.controls}>
      <SoundDesignKnobs variant="creative" instrument={instrument} onChange={setInstrument} duckSources={duckSources} scope={scoped} hidden={hidden} />
    </div>}
    {scope === 'all' && page === 'movement' && mapping && updateMapping && <div className={styles.controls}>
      <ParameterKnob label="Degrees per file" value={mapping.fileDegrees} min={-4} max={4} step={0.5} onChange={fileDegrees => updateMapping({ fileDegrees })} />
      <ParameterKnob label="Degrees per rank" value={mapping.rankDegrees} min={-4} max={4} step={0.5} onChange={rankDegrees => updateMapping({ rankDegrees })} />
      <ParameterKnob label="Board stereo width" value={mapping.panWidth} min={0} max={1} onChange={panWidth => updateMapping({ panWidth })} />
      <label className={styles.check}><input type="checkbox" checked={mapping.previewFilter} onChange={e => updateMapping({ previewFilter: e.target.checked })} />Square rank shapes the single-note filter<InfoTip label="Single-note filter">The single note is the sound you hear when pressing a piece or crossing squares while dragging it. With this on, the square’s rank number caps the low-pass cutoff: higher ranks allow a brighter sound. The cap combines with the instrument’s effective filter; it never opens a filter that is already darker. It doesn’t change the loops’ filter, doesn’t activate the piece and doesn’t move the music clock. Unchecking removes only this rank influence.</InfoTip></label>
    </div>}
    {scope === 'note' && noteSelection && <div className={styles.noteKnobs} data-match-ui>
      <NoteParamsKnobs note={noteSelection.note} onChange={noteSelection.onChange} updateMode={noteSelection.updateMode} base={{ release: all.release, reverb: reverbBase, delay: allEffects.delay, drive: driveBase }} />
    </div>}
  </section></ParameterHelpContext.Provider>
}
