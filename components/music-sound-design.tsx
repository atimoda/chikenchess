'use client'

import { DELAY_TIMES, INSTRUMENT_ROLES, LFO_SHAPES, type Instrument, type InstrumentPerformanceEdit } from '@/lib/music/model'
import { instrumentRole } from '@/lib/music/sound-design'
import { Knob, LARGE_KNOB_SIZE } from './knob'
import { ToggleCell } from './music-note-params'

export interface DuckSource { slot: string; name: string }
const LFO_LABELS = { none: 'Off', lpf: 'LPF', gain: 'Gain', pan: 'Pan', pitch: 'Pitch' } as const
const ROLE_LABELS = { drums: 'Drums', bass: 'Bass', lead: 'Lead', pad: 'Pad', fx: 'FX' } as const
const SHAPE_LABELS = { sine: 'Sine', triangle: 'Tri', saw: 'Saw', square: 'Square' } as const

/** Compact select sized like a knob cell, label underneath. */
export function SelectCell<T extends string>({ label, ariaLabel, value, options, onChange, neon = true, title }: { label: string; ariaLabel?: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void; neon?: boolean; title?: string }) {
  return <div className="flex min-w-0 flex-col items-center gap-1" style={{ opacity: neon ? 1 : .4 }} title={title}>
    <select aria-label={ariaLabel ?? label} value={value} onChange={event => onChange(event.target.value as T)}
      className="w-full min-w-0 rounded border border-[#425544] bg-black/60 px-0.5 font-mono text-[9px] text-white" style={{ height: LARGE_KNOB_SIZE * .6, marginTop: LARGE_KNOB_SIZE * .2, marginBottom: LARGE_KNOB_SIZE * .2 }}>
      {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
    </select>
    <span className="font-mono text-[9px] leading-none text-[#9eafa2]">{label}</span>
  </div>
}

/** The FX/MOD page of Piece Params: filter, delay, LFO, pitch, synthesis, sample loop, sidechain and role.
 * Cells follow the five-column knob grid; synthesis appears only for synths and the loop only for samples. */
export function SoundDesignKnobs({ instrument, onChange, neon = true, duckSources = [] }: { instrument: Instrument; onChange: (patch: InstrumentPerformanceEdit) => void; neon?: boolean; duckSources?: readonly DuckSource[] }) {
  const sample = instrument.source?.kind === 'sample', unpitched = sample && instrument.source?.kind === 'sample' && !instrument.source.pitched
  const knob = (label: string, ariaLabel: string, value: number, min: number, max: number, onValue: (value: number) => void, options: { step?: number; logarithmic?: boolean; format?: (value: number) => string; enabled?: boolean } = {}) =>
    <Knob labelPosition="bottom" size={LARGE_KNOB_SIZE} label={label} ariaLabel={ariaLabel} value={value} min={min} max={max} step={options.step ?? .01} logarithmic={options.logarithmic} updateMode="on-release" formatValue={options.format} onChange={onValue} neon={neon && options.enabled !== false} />
  const lfo = instrument.lfoTarget ?? 'none', bars = instrument.lfoUnit !== 'hz', ducking = !!instrument.duckSource
  const seconds = (value: number) => `${value < .1 ? value.toFixed(3) : value.toFixed(2)} s`
  return <>
    {knob('RESO', 'Filter resonance', instrument.resonance ?? 0, 0, 30, resonance => onChange({ resonance: resonance || undefined }), { step: .1, format: value => value.toFixed(1) })}
    {knob('F.ENV', 'Filter envelope depth', instrument.filterEnv ?? 0, -8, 8, filterEnv => onChange({ filterEnv: filterEnv || undefined }), { step: .1, format: value => `${value > 0 ? '+' : ''}${value.toFixed(1)} oct` })}
    {knob('F.ATK', 'Filter envelope attack', instrument.filterAttack ?? .005, .001, 2, filterAttack => onChange({ filterAttack }), { step: .001, logarithmic: true, format: seconds, enabled: !!instrument.filterEnv })}
    {knob('F.DEC', 'Filter envelope decay', instrument.filterDecay ?? .14, .01, 2, filterDecay => onChange({ filterDecay }), { logarithmic: true, format: seconds, enabled: !!instrument.filterEnv })}
    <SelectCell label="D.TIME" ariaLabel="Delay time" title="Echo spacing in notes; a custom delay gives the piece its own effect bus" value={instrument.delayTime ?? 'default'} options={[['default', '3/16 ·'], ...Object.keys(DELAY_TIMES).map(id => [id, id] as const)]} onChange={value => onChange({ delayTime: value === 'default' ? undefined : value as Instrument['delayTime'] })} neon={neon} />
    {knob('D.FDBK', 'Delay feedback', instrument.delayFeedback ?? .5, 0, .9, delayFeedback => onChange({ delayFeedback }), { format: value => `${Math.round(value * 100)}%` })}
    <SelectCell label="LFO" ariaLabel="LFO target" value={lfo} options={(Object.keys(LFO_LABELS) as (keyof typeof LFO_LABELS)[]).filter(id => !(unpitched && id === 'pitch')).map(id => [id, LFO_LABELS[id]] as const)} onChange={value => onChange({ lfoTarget: value === 'none' ? undefined : value, lfoDepth: value === 'none' ? instrument.lfoDepth : instrument.lfoDepth ?? .5 })} neon={neon} />
    {bars
      ? knob('RATE', 'LFO period in bars', instrument.lfoRate ?? 1, 1 / 16, 16, lfoRate => onChange({ lfoRate }), { step: 1 / 16, logarithmic: true, format: value => `${value < 1 ? `1/${Math.round(1 / value)}` : Number(value.toFixed(2))} bar`, enabled: lfo !== 'none' })
      : knob('RATE', 'LFO rate in hertz', instrument.lfoRate ?? 1, .05, 20, lfoRate => onChange({ lfoRate }), { logarithmic: true, format: value => `${Number(value.toFixed(2))} Hz`, enabled: lfo !== 'none' })}
    <SelectCell label="UNIT" ariaLabel="LFO rate unit" value={bars ? 'bars' : 'hz'} options={[['bars', 'Bars'], ['hz', 'Hz']]} onChange={lfoUnit => onChange({ lfoUnit, lfoRate: 1 })} neon={neon && lfo !== 'none'} />
    {knob('DEPTH', 'LFO depth', instrument.lfoDepth ?? 0, 0, 1, lfoDepth => onChange({ lfoDepth }), { format: value => `${Math.round(value * 100)}%`, enabled: lfo !== 'none' })}
    <SelectCell label="SHAPE" ariaLabel="LFO shape" value={instrument.lfoShape ?? 'sine'} options={LFO_SHAPES.map(id => [id, SHAPE_LABELS[id]] as const)} onChange={lfoShape => onChange({ lfoShape })} neon={neon && lfo !== 'none'} />
    {!unpitched && <>
      {knob('VIB', 'Vibrato rate', instrument.vibrato ?? 0, 0, 12, vibrato => onChange({ vibrato: vibrato || undefined, vibratoDepth: instrument.vibratoDepth ?? (vibrato ? .3 : undefined) }), { step: .1, format: value => value ? `${value.toFixed(1)} Hz` : 'off' })}
      {knob('VIB AMT', 'Vibrato depth', instrument.vibratoDepth ?? 0, 0, 2, vibratoDepth => onChange({ vibratoDepth }), { format: value => `${value.toFixed(2)} st`, enabled: !!instrument.vibrato })}
    </>}
    {!sample && <>
      {knob('FM', 'FM index', instrument.fmIndex ?? 0, 0, 10, fmIndex => onChange({ fmIndex: fmIndex || undefined }), { step: .1, format: value => value ? value.toFixed(1) : 'off' })}
      {knob('FM RATIO', 'FM ratio', instrument.fmRatio ?? 2, .5, 8, fmRatio => onChange({ fmRatio }), { step: .25, format: value => `×${value}`, enabled: !!instrument.fmIndex })}
    </>}
    {!sample && instrument.sound === 'supersaw' && <>
      {knob('UNISON', 'Supersaw voices', instrument.unison ?? 5, 1, 7, unison => onChange({ unison }), { step: 1, format: value => `${value} v` })}
      {knob('DETUNE', 'Supersaw detune', instrument.detune ?? .18, 0, 1, detune => onChange({ detune }))}
      {knob('SPREAD', 'Supersaw stereo spread', instrument.spread ?? .6, 0, 1, spread => onChange({ spread }))}
    </>}
    {sample && <>
      <ToggleCell label="LOOP" ariaLabel="Loop the sample" title="Repeat the region between IN and OUT while the note lasts" checked={!!instrument.sampleLoop} onChange={sampleLoop => onChange({ sampleLoop: sampleLoop || undefined })} neon={neon} />
      {knob('IN', 'Loop start', instrument.loopStart ?? 0, 0, 1, loopStart => onChange({ loopStart: Math.min(loopStart, (instrument.loopEnd ?? 1) - .01) }), { format: value => `${Math.round(value * 100)}%`, enabled: !!instrument.sampleLoop })}
      {knob('OUT', 'Loop end', instrument.loopEnd ?? 1, 0, 1, loopEnd => onChange({ loopEnd: Math.max(loopEnd, (instrument.loopStart ?? 0) + .01) }), { format: value => `${Math.round(value * 100)}%`, enabled: !!instrument.sampleLoop })}
    </>}
    <SelectCell label="DUCK" ariaLabel="Sidechain source" title="Each hit of this teammate ducks this piece (sidechain); it gets its own effect bus" value={instrument.duckSource ?? 'none'} options={[['none', 'Off'], ...duckSources.map(source => [source.slot, source.name] as const)]} onChange={value => onChange({ duckSource: value === 'none' ? undefined : value })} neon={neon} />
    {knob('DUCK AMT', 'Sidechain depth', instrument.duckDepth ?? .7, 0, 1, duckDepth => onChange({ duckDepth }), { format: value => `${Math.round(value * 100)}%`, enabled: ducking })}
    {knob('DUCK REL', 'Sidechain release', instrument.duckRelease ?? .18, .02, .6, duckRelease => onChange({ duckRelease }), { logarithmic: true, format: seconds, enabled: ducking })}
    <SelectCell label="ROLE" ariaLabel="Instrument role" title="Used by States & Events rules that target instruments by role" value={instrument.role ?? 'auto'} options={[['auto', `Auto · ${ROLE_LABELS[instrumentRole({ ...instrument, role: undefined })]}`], ...INSTRUMENT_ROLES.map(id => [id, ROLE_LABELS[id]] as const)]} onChange={value => onChange({ role: value === 'auto' ? undefined : value as Instrument['role'] })} neon={neon} />
  </>
}
