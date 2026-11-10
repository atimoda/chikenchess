'use client'
import { InfoTip } from '../info-tip'
import { Knob, LARGE_KNOB_SIZE, type KnobUpdateMode } from '../knob'
import { RangeKnob, type IntegerRange } from '../range-knob'
import styles from '../creative-studio.module.css'

const RANGE_HELP: Record<string,string> = {
 'Master volume':'Controls the volume of the whole band.',
 'Octaves':'With no L, S or N selected, sets one fixed octave. Picking a dot makes the knob control two inclusive limits: L draws per loop repeat, S per entry into section A–H and N per attack, keeping the same octave across simultaneous notes. N is the default. Unpitched samples don’t change pitch.',
 'Instrument gain':'Base volume of the timbre (0 to 1). It multiplies the Extra gain: base 0.3 × extra 0.5 gives 0.15 before note accents/velocities and the mixer. Changing it here keeps the piece’s multiplier and its rules.',
 'Extra gain':'Multiplier of the piece’s base gain (0 to 2): 1 leaves it unchanged, 0.5 halves it, 2 doubles it and 0 silences it. States/Events can override this gain and restore it when they end; the instrument’s base gain stays separate. It is not a sum of volumes.',
 'Attack':'Time for the note to reach its volume. Short gives a defined attack; long gives a soft entry.',
 'Decay':'Time the note takes to fall from its peak to the sustain level.',
 'Sustain':'Level held after the decay, while the note lasts.',
 'Release':'Fade-out time of the note after its length ends.',
 'Note length (fraction)':'Fraction of the rhythmic duration taken by the sound. Lower values leave more space between attacks.',
 'Low-pass':'With no L, S or N selected, sets a fixed cutoff from 20 Hz to 20 kHz. Picking a dot makes the knob control two limits; N draws per attack and is the default. Cuts frequencies above the cutoff; lowering it makes the timbre darker. An active filter rule takes priority and restores the values when it ends.',
 'High-pass':'Cuts frequencies below the cutoff. Raising it removes low end.',
 'Pitch (multiplier)':'Multiplies the playback pitch: 0.5 is an octave down, 2 an octave up.',
 'Pan':'Stereo position: negative values move left, positive values move right.',
 'Extra pan':'Saved offset added to the file position, according to the board’s Stereo width. Moving the piece changes the final audio pan, not this base value. Zero width removes the file’s influence. A note’s own Pan can replace the result.',
 'Reverb':'With no L, S or N selected, sets a fixed ambience (0 to 100%). Picking a dot makes the knob control two limits: L draws per loop, S per section entry and N per attack (default). It is a send to shared buses, not a separate reverb per note.',
 'Dotted delay':'Amount of echoes of the sound.',
 'Drive':'With no L, S or N selected, sets a fixed saturation from 0 to 10. Picking a dot makes the knob control two limits: L draws per loop, S per section entry and N per attack (default). Zero bypasses the distortion.',
 'Distortion level':'Controls the effect volume in Strudel (distortvol). It is not a dry/wet percentage; adjust the gain when comparing timbres.',
 'Swing':'With no L, S or N selected, sets a fixed swing from 0 to 50%. Picking a dot makes the knob control two limits: L draws per loop, S per section entry and N per attack (default). It delays the off-beats without pulling notes early; simultaneous notes share the same delay. It adds to the kit’s written timing; the manual gesture stays immediate.',
 'Play chance':'Probability that each piano roll event plays. 0% removes every event; 100% plays them all. Uses Strudel’s native degradeBy modifier. Applies to automatic loops, not to the manual note on the board. In Creative the value is saved in the kit; in a match it only lasts for the current session.',
 'Pitch slide':'Applies the same envelope to every pitched note of this instrument, in all variations. For occasional slides, edit a note in the piano roll.',
 'Slide time':'Time of this instrument’s global envelope in all variations. It only acts when Pitch slide is not zero; a note with its own slide uses its own time. Range 0.001 to 2 seconds.',
 'Degrees per file':'Scale degrees added for each file the piece moves from its original square.',
 'Degrees per rank':'Scale degrees added for each rank the piece advances, following its color.',
 'Board stereo width':'How much the file spreads pieces across the stereo field. Zero keeps every piece centered.',
 'Filter resonance':'Emphasis around the low-pass cutoff (0 to 30). Higher values ring at the cutoff; zero turns it off.',
 'Filter envelope depth':'How far each attack opens (+) or closes (−) the low-pass, in octaves, before it settles back on the cutoff. Zero turns the envelope off.',
 'Filter envelope attack':'Time for the filter envelope to reach its depth. Only acts when Filter envelope depth is not zero.',
 'Filter envelope decay':'Time for the filter envelope to settle back on the cutoff. Only acts when Filter envelope depth is not zero.',
 'Delay time':'Echo spacing in notes. Shared uses the loop’s common delay (3/16); a custom time gives the piece its own effect bus. The echo amount is Dotted delay, in Filters.',
 'Delay feedback':'How long the echoes keep repeating (0 to 90%). A custom feedback gives the piece its own effect bus.',
 'LFO target':'What the LFO sweeps: the low-pass, gain, pan or pitch. Off turns it off.',
 'LFO period in bars':'Length of one LFO cycle in bars, locked to the tempo.',
 'LFO rate in hertz':'LFO cycles per second, free from the tempo.',
 'LFO rate unit':'Bars locks the LFO to the tempo; Hz runs it freely. Switching resets the rate to 1.',
 'LFO depth':'How much of the target’s range the LFO sweeps.',
 'LFO shape':'Waveform of the LFO: sine and triangle glide, saw ramps and square jumps between two values.',
 'Vibrato rate':'Speed of the pitch vibrato in hertz. Zero turns it off.',
 'Vibrato depth':'Width of the vibrato in semitones. Only acts when Vibrato rate is not zero.',
 'FM index':'Frequency modulation of the synth: higher values add metallic, bell-like harmonics. Zero turns it off.',
 'FM ratio':'Modulator frequency relative to the note. Whole numbers sound harmonic; fractions sound inharmonic.',
 'Supersaw voices':'Number of stacked saw voices.',
 'Supersaw detune':'How far the stacked voices drift apart in pitch.',
 'Supersaw stereo spread':'How wide the stacked voices spread in stereo.',
 'Loop the sample':'Repeats the region between Loop start and Loop end while the note lasts.',
 'Loop start':'Start of the repeated region, as a fraction of the sample. Only acts with Loop the sample on.',
 'Loop end':'End of the repeated region, as a fraction of the sample. Only acts with Loop the sample on.',
 'Sidechain source':'Each hit of this teammate ducks this piece (sidechain); the piece gets its own effect bus.',
 'Sidechain depth':'How much the volume dips on each hit of the source.',
 'Sidechain release':'Time for the volume to recover after each hit.',
 'Instrument role':'Used by States & Events rules that target instruments by role. Auto infers it from the sound.',
}
export function Range({ label, value, min, max, step = 0.01, unit = '', help = true, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; help?: boolean; onChange: (value: number) => void
}) {
  return <label className={styles.range}>
    <span>{label}{help&&<InfoTip label={label}>{RANGE_HELP[label] ?? `Adjusts ${label.toLowerCase()} for this setup. Range: ${min} to ${max}${unit}.`}</InfoTip>}<output>{Number(value.toFixed(3))}{unit}</output></span>
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>
}

export function ParameterKnob({ label, value, min, max, step = 0.01, unit = '', logarithmic = false, formatValue, updateMode = 'immediate', disabled = false, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; logarithmic?: boolean; formatValue?: (value: number) => string; updateMode?: KnobUpdateMode; disabled?: boolean; onChange: (value: number) => void
}) {
  const defaultFormat = (current: number) => {
    if (unit === ' Hz') return current >= 1000 ? `${Number((current / 1000).toFixed(1))}kHz` : `${Number(current.toFixed(3))}Hz`
    return `${Number(current.toFixed(3))}${unit.trim()}`
  }
  return <div className={styles.parameterKnob}>
    <InfoTip label={label}>{RANGE_HELP[label] ?? `Adjusts ${label.toLowerCase()} for this setup. Range: ${min} to ${max}${unit}.`}</InfoTip>
    <Knob label={label} labelContent={<div className={styles.parameterKnobLabel}>{label}</div>} labelPosition="bottom" size={LARGE_KNOB_SIZE} value={value} min={min} max={max} step={step} logarithmic={logarithmic} formatValue={formatValue ?? defaultFormat} updateMode={updateMode} neon={!disabled} onChange={onChange} />
  </div>
}

const help = (label: string) => RANGE_HELP[label] ?? `Chooses the ${label.toLowerCase()} for this setup.`

/** A choice in a knob cell: the same help, label and green face as ParameterKnob. */
export function ParameterSelect<T extends string>({ label, value, options, disabled = false, onChange }: {
  label: string; value: T; options: readonly (readonly [T, string])[]; disabled?: boolean; onChange: (value: T) => void
}) {
  return <div className={styles.parameterKnob} data-disabled={disabled || undefined}>
    <InfoTip label={label}>{help(label)}</InfoTip>
    <span className={styles.parameterCellFace}>
      <select aria-label={label} className={styles.parameterSelect} value={value} disabled={disabled} onChange={event => onChange(event.target.value as T)}>
        {options.map(([id, text]) => <option key={id} value={id}>{text}</option>)}
      </select>
    </span>
    <div className={styles.parameterKnobLabel}>{label}</div>
  </div>
}

/** An on/off switch in a knob cell, round like the knob face. */
export function ParameterToggle({ label, checked, disabled = false, onChange }: {
  label: string; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void
}) {
  return <div className={styles.parameterKnob} data-disabled={disabled || undefined}>
    <InfoTip label={label}>{help(label)}</InfoTip>
    <span className={styles.parameterCellFace}>
      <button type="button" role="switch" aria-label={label} aria-checked={checked} disabled={disabled} className={styles.parameterToggle} onClick={() => onChange(!checked)}>{checked ? 'ON' : 'OFF'}</button>
    </span>
    <div className={styles.parameterKnobLabel}>{label}</div>
  </div>
}

export function ParameterRangeKnob({ label, value, min, max, step = 1, formatValue, formatSingleValue, updateMode = 'immediate', onChange }: {
  label: string; value: IntegerRange; min: number; max: number; step?: number; formatValue?: (value: IntegerRange) => string; formatSingleValue?: (value: number) => string; updateMode?: KnobUpdateMode; onChange: (value: IntegerRange) => void
}) {
  return <div className={styles.parameterKnob}>
    <InfoTip label={label}>{RANGE_HELP[label] ?? `Adjusts the limits of ${label.toLowerCase()} between ${min} and ${max}.`}</InfoTip>
    <RangeKnob label={label} labelContent={<div className={styles.parameterKnobLabel}>{label}</div>} labelPosition="bottom" size={LARGE_KNOB_SIZE} value={value} min={min} max={max} step={step} showFrequency updateMode={updateMode} formatValue={formatValue ?? (range => `${range.first}–${range.second}`)} formatSingleValue={formatSingleValue} onChange={onChange} />
  </div>
}
