'use client'
import { createContext, useContext } from 'react'
import { InfoTip } from '../info-tip'
import { msg, t, useT } from '@/lib/i18n'
import { Knob, LARGE_KNOB_SIZE, type KnobUpdateMode } from '../knob'
import { RangeKnob, type IntegerRange } from '../range-knob'
import styles from '../creative-studio.module.css'

const RANGE_HELP: Record<string,string> = {
 'Master volume':msg('Controls the volume of the whole band.'),
 'Octaves':msg('With no L, S or N selected, sets one fixed octave. Picking a dot makes the knob control two inclusive limits: L draws per loop repeat, S per entry into section A–H and N per attack, keeping the same octave across simultaneous notes. N is the default. Unpitched samples don’t change pitch.'),
 'Instrument gain':msg('Base volume of the timbre (0 to 1). It multiplies the Extra gain: base 0.3 × extra 0.5 gives 0.15 before note accents/velocities and the mixer. Changing it here keeps the piece’s multiplier and its rules.'),
 'Extra gain':msg('Multiplier of the piece’s base gain (0 to 2): 1 leaves it unchanged, 0.5 halves it, 2 doubles it and 0 silences it. States/Events can override this gain and restore it when they end; the instrument’s base gain stays separate. It is not a sum of volumes.'),
 'Attack':msg('Time for the note to reach its volume. Short gives a defined attack; long gives a soft entry.'),
 'Decay':msg('Time the note takes to fall from its peak to the sustain level.'),
 'Sustain':msg('Level held after the decay, while the note lasts.'),
 'Release':msg('Fade-out time of the note after its length ends.'),
 'Note length (fraction)':msg('Fraction of the rhythmic duration taken by the sound. Lower values leave more space between attacks.'),
 'Low-pass':msg('With no L, S or N selected, sets a fixed cutoff from 20 Hz to 20 kHz. Picking a dot makes the knob control two limits; N draws per attack and is the default. Cuts frequencies above the cutoff; lowering it makes the timbre darker. An active filter rule takes priority and restores the values when it ends.'),
 'High-pass':msg('Cuts frequencies below the cutoff. Raising it removes low end.'),
 'Pitch (multiplier)':msg('Multiplies the playback pitch: 0.5 is an octave down, 2 an octave up.'),
 'Pan':msg('Stereo position: negative values move left, positive values move right.'),
 'Extra pan':msg('Saved offset added to the file position, according to the board’s Stereo width. Moving the piece changes the final audio pan, not this base value. Zero width removes the file’s influence. A note’s own Pan can replace the result.'),
 'Reverb':msg('With no L, S or N selected, sets a fixed ambience (0 to 100%). Picking a dot makes the knob control two limits: L draws per loop, S per section entry and N per attack (default). It is a send to shared buses, not a separate reverb per note.'),
 'Dotted delay':msg('Amount of echoes of the sound.'),
 'Drive':msg('With no L, S or N selected, sets a fixed saturation from 0 to 10. Picking a dot makes the knob control two limits: L draws per loop, S per section entry and N per attack (default). Zero bypasses the distortion.'),
 'Distortion level':msg('Controls the effect volume in Strudel (distortvol). It is not a dry/wet percentage; adjust the gain when comparing timbres.'),
 'Swing':msg('With no L, S or N selected, sets a fixed swing from 0 to 50%. Picking a dot makes the knob control two limits: L draws per loop, S per section entry and N per attack (default). It delays the off-beats without pulling notes early; simultaneous notes share the same delay. It adds to the kit’s written timing; the manual gesture stays immediate.'),
 'Play chance':msg('Probability that each piano roll event plays. 0% removes every event; 100% plays them all. Uses Strudel’s native degradeBy modifier. Applies to automatic loops, not to the manual note on the board. In Creative the value is saved in the kit; in a match it only lasts for the current session.'),
 'Pitch slide':msg('Applies the same envelope to every pitched note of this instrument, in all variations. For occasional slides, edit a note in the piano roll.'),
 'Slide time':msg('Time of this instrument’s global envelope in all variations. It only acts when Pitch slide is not zero; a note with its own slide uses its own time. Range 0.001 to 2 seconds.'),
 'Degrees per file':msg('Scale degrees added for each file the piece moves from its original square.'),
 'Degrees per rank':msg('Scale degrees added for each rank the piece advances, following its color.'),
 'Board stereo width':msg('How much the file spreads pieces across the stereo field. Zero keeps every piece centered.'),
 'Filter resonance':msg('Emphasis around the low-pass cutoff (0 to 30). Higher values ring at the cutoff; zero turns it off.'),
 'Filter envelope depth':msg('How far each attack opens (+) or closes (−) the low-pass, in octaves, before it settles back on the cutoff. Zero turns the envelope off.'),
 'Filter envelope attack':msg('Time for the filter envelope to reach its depth. Only acts when Filter envelope depth is not zero.'),
 'Filter envelope decay':msg('Time for the filter envelope to settle back on the cutoff. Only acts when Filter envelope depth is not zero.'),
 'Delay time':msg('Echo spacing in notes. Shared uses the loop’s common delay (3/16); a custom time gives the piece its own effect bus. The echo amount is Dotted delay, in Filters.'),
 'Delay feedback':msg('How long the echoes keep repeating (0 to 90%). A custom feedback gives the piece its own effect bus.'),
 'LFO target':msg('What the LFO sweeps: the low-pass, gain, pan or pitch. Off turns it off.'),
 'LFO period in bars':msg('Length of one LFO cycle in bars, locked to the tempo.'),
 'LFO rate in hertz':msg('LFO cycles per second, free from the tempo.'),
 'LFO rate unit':msg('Bars locks the LFO to the tempo; Hz runs it freely. Switching resets the rate to 1.'),
 'LFO depth':msg('How much of the target’s range the LFO sweeps.'),
 'LFO shape':msg('Waveform of the LFO: sine and triangle glide, saw ramps and square jumps between two values.'),
 'Vibrato rate':msg('Speed of the pitch vibrato in hertz. Zero turns it off.'),
 'Vibrato depth':msg('Width of the vibrato in semitones. Only acts when Vibrato rate is not zero.'),
 'FM index':msg('Frequency modulation of the synth: higher values add metallic, bell-like harmonics. Zero turns it off.'),
 'FM ratio':msg('Modulator frequency relative to the note. Whole numbers sound harmonic; fractions sound inharmonic.'),
 'Supersaw voices':msg('Number of stacked saw voices.'),
 'Supersaw detune':msg('How far the stacked voices drift apart in pitch.'),
 'Supersaw stereo spread':msg('How wide the stacked voices spread in stereo.'),
 'Loop the sample':msg('Repeats the region between Loop start and Loop end while the note lasts.'),
 'Loop start':msg('Start of the repeated region, as a fraction of the sample. Only acts with Loop the sample on.'),
 'Loop end':msg('End of the repeated region, as a fraction of the sample. Only acts with Loop the sample on.'),
 'Sidechain source':msg('Each hit of this teammate ducks this piece (sidechain); the piece gets its own effect bus.'),
 'Sidechain depth':msg('How much the volume dips on each hit of the source.'),
 'Sidechain release':msg('Time for the volume to recover after each hit.'),
 'Instrument role':msg('Used by States & Events rules that target instruments by role. Auto infers it from the sound.'),
}
export function Range({ label, value, min, max, step = 0.01, unit = '', help = true, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; help?: boolean; onChange: (value: number) => void
}) {
  const t = useT()
  return <label className={styles.range}>
    <span>{t(label)}{help&&<InfoTip label={t(label)}>{RANGE_HELP[label] ? t(RANGE_HELP[label]) : t('Adjusts {label} for this setup. Range: {min} to {max}{unit}.', { label: t(label).toLowerCase(), min, max, unit })}</InfoTip>}<output>{Number(value.toFixed(3))}{unit}</output></span>
    <input type="range" aria-label={t(label)} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>
}

/** The "?" help above each cell. Creative shows it; the match's Piece Params turns it off. */
export const ParameterHelpContext = createContext(true)

/** Section/Note scope of a cell: an inherited value is drawn faded and a double click on an own value returns it to the inherited one. */
export interface ParameterScope { inherited: boolean; onReset: () => void }
const scopeProps = (scope?: ParameterScope) => scope ? { 'data-inherited': scope.inherited || undefined, onDoubleClick: scope.inherited ? undefined : scope.onReset } : {}

export function ParameterKnob({ label, value, min, max, step = 0.01, unit = '', logarithmic = false, formatValue, updateMode = 'immediate', disabled = false, scope, monitorValue, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; logarithmic?: boolean; formatValue?: (value: number) => string; updateMode?: KnobUpdateMode; disabled?: boolean; scope?: ParameterScope; monitorValue?: number; onChange: (value: number) => void
}) {
  const t = useT()
  const showHelp = useContext(ParameterHelpContext)
  const defaultFormat = (current: number) => {
    if (unit === ' Hz') return current >= 1000 ? `${Number((current / 1000).toFixed(1))}kHz` : `${Number(current.toFixed(3))}Hz`
    return `${Number(current.toFixed(3))}${unit.trim()}`
  }
  return <div className={styles.parameterKnob} {...scopeProps(scope)}>
    {showHelp && <InfoTip label={t(label)}>{RANGE_HELP[label] ? t(RANGE_HELP[label]) : t('Adjusts {label} for this setup. Range: {min} to {max}{unit}.', { label: t(label).toLowerCase(), min, max, unit })}</InfoTip>}
    <Knob label={t(label)} labelContent={<div className={styles.parameterKnobLabel}>{t(label)}</div>} labelPosition="bottom" size={LARGE_KNOB_SIZE} value={value} min={min} max={max} step={step} logarithmic={logarithmic} formatValue={formatValue ?? defaultFormat} updateMode={updateMode} neon={!disabled} monitorValue={monitorValue} onChange={onChange} />
  </div>
}

const choiceHelp = (label: string) => RANGE_HELP[label] ? t(RANGE_HELP[label]) : t('Chooses the {label} for this setup.', { label: t(label).toLowerCase() })

/** A choice in a knob cell: the same help, label and green face as ParameterKnob. */
export function ParameterSelect<T extends string>({ label, value, options, disabled = false, scope, onChange }: {
  label: string; value: T; options: readonly (readonly [T, string])[]; disabled?: boolean; scope?: ParameterScope; onChange: (value: T) => void
}) {
  const t = useT()
  const showHelp = useContext(ParameterHelpContext)
  return <div className={styles.parameterKnob} data-disabled={disabled || undefined} {...scopeProps(scope)}>
    {showHelp && <InfoTip label={t(label)}>{choiceHelp(label)}</InfoTip>}
    <span className={styles.parameterCellFace}>
      <select aria-label={t(label)} className={styles.parameterSelect} value={value} disabled={disabled} onChange={event => onChange(event.target.value as T)}>
        {options.map(([id, text]) => <option key={id} value={id}>{t(text)}</option>)}
      </select>
    </span>
    <div className={styles.parameterKnobLabel}>{t(label)}</div>
  </div>
}

/** An on/off switch in a knob cell, round like the knob face. */
export function ParameterToggle({ label, checked, disabled = false, scope, onChange }: {
  label: string; checked: boolean; disabled?: boolean; scope?: ParameterScope; onChange: (checked: boolean) => void
}) {
  const t = useT()
  const showHelp = useContext(ParameterHelpContext)
  return <div className={styles.parameterKnob} data-disabled={disabled || undefined} {...scopeProps(scope)}>
    {showHelp && <InfoTip label={t(label)}>{choiceHelp(label)}</InfoTip>}
    <span className={styles.parameterCellFace}>
      <button type="button" role="switch" aria-label={t(label)} aria-checked={checked} disabled={disabled} className={styles.parameterToggle} onClick={() => onChange(!checked)}>{checked ? t('ON') : t('OFF')}</button>
    </span>
    <div className={styles.parameterKnobLabel}>{t(label)}</div>
  </div>
}

export function ParameterRangeKnob({ label, value, min, max, step = 1, formatValue, formatSingleValue, updateMode = 'immediate', showFrequency = true, scope, monitorValue, onChange }: {
  label: string; value: IntegerRange; min: number; max: number; step?: number; formatValue?: (value: IntegerRange) => string; formatSingleValue?: (value: number) => string; updateMode?: KnobUpdateMode; showFrequency?: boolean; scope?: ParameterScope; monitorValue?: number; onChange: (value: IntegerRange) => void
}) {
  const t = useT()
  const showHelp = useContext(ParameterHelpContext)
  return <div className={styles.parameterKnob} {...scopeProps(scope)}>
    {showHelp && <InfoTip label={t(label)}>{RANGE_HELP[label] ? t(RANGE_HELP[label]) : t('Adjusts the limits of {label} between {min} and {max}.', { label: t(label).toLowerCase(), min, max })}</InfoTip>}
    <RangeKnob label={t(label)} labelContent={<div className={styles.parameterKnobLabel}>{t(label)}</div>} labelPosition="bottom" size={LARGE_KNOB_SIZE} value={value} min={min} max={max} step={step} showFrequency={showFrequency} monitorValue={monitorValue} updateMode={updateMode} formatValue={formatValue ?? (range => `${range.first}–${range.second}`)} formatSingleValue={formatSingleValue} onChange={onChange} />
  </div>
}
