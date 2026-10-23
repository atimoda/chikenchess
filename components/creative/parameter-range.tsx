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
}
export function Range({ label, value, min, max, step = 0.01, unit = '', help = true, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; help?: boolean; onChange: (value: number) => void
}) {
  return <label className={styles.range}>
    <span>{label}{help&&<InfoTip label={label}>{RANGE_HELP[label] ?? `Adjusts ${label.toLowerCase()} for this setup. Range: ${min} to ${max}${unit}.`}</InfoTip>}<output>{Number(value.toFixed(3))}{unit}</output></span>
    <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
  </label>
}

export function ParameterKnob({ label, value, min, max, step = 0.01, unit = '', logarithmic = false, formatValue, updateMode = 'immediate', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; logarithmic?: boolean; formatValue?: (value: number) => string; updateMode?: KnobUpdateMode; onChange: (value: number) => void
}) {
  const defaultFormat = (current: number) => {
    if (unit === ' Hz') return current >= 1000 ? `${Number((current / 1000).toFixed(1))}kHz` : `${Number(current.toFixed(3))}Hz`
    return `${Number(current.toFixed(3))}${unit.trim()}`
  }
  return <div className={styles.parameterKnob}>
    <InfoTip label={label}>{RANGE_HELP[label] ?? `Adjusts ${label.toLowerCase()} for this setup. Range: ${min} to ${max}${unit}.`}</InfoTip>
    <Knob label={label} labelContent={<div className={styles.parameterKnobLabel}>{label}</div>} labelPosition="bottom" size={LARGE_KNOB_SIZE} value={value} min={min} max={max} step={step} logarithmic={logarithmic} formatValue={formatValue ?? defaultFormat} updateMode={updateMode} onChange={onChange} />
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
