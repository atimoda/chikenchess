/** One cycle is one notated bar. Odd eighth-note meters count equal eighths;
 * their unequal dance groups are accents, not equal-duration metronome beats. */
export const METER_IDS = ['4/4', '2/4', '3/4', '6/8', '9/8', '12/8', '2/2', '5/4', '5/8', '7/4', '7/8'] as const
export const METERS = {
  '4/4': { beatsPerBar: 4, subdivisions: 2, unit: 'quarter', groups: [1, 1, 1, 1] },
  '2/4': { beatsPerBar: 2, subdivisions: 2, unit: 'quarter', groups: [1, 1] },
  '3/4': { beatsPerBar: 3, subdivisions: 2, unit: 'quarter', groups: [1, 1, 1] },
  '6/8': { beatsPerBar: 2, subdivisions: 3, unit: 'dotted-quarter', groups: [1, 1] },
  '9/8': { beatsPerBar: 3, subdivisions: 3, unit: 'dotted-quarter', groups: [1, 1, 1] },
  '12/8': { beatsPerBar: 4, subdivisions: 3, unit: 'dotted-quarter', groups: [1, 1, 1, 1] },
  '2/2': { beatsPerBar: 2, subdivisions: 2, unit: 'half', groups: [1, 1] },
  '5/4': { beatsPerBar: 5, subdivisions: 2, unit: 'quarter', groups: [3, 2] },
  '5/8': { beatsPerBar: 5, subdivisions: 2, unit: 'eighth', groups: [3, 2] },
  '7/4': { beatsPerBar: 7, subdivisions: 2, unit: 'quarter', groups: [4, 3] },
  '7/8': { beatsPerBar: 7, subdivisions: 2, unit: 'eighth', groups: [3, 2, 2] },
} as const
export type Meter = typeof METER_IDS[number]
export const beatsPerBar = (meter: Meter = '4/4') => METERS[meter].beatsPerBar
export const subdivisionsPerBeat = (meter: Meter = '4/4') => METERS[meter].subdivisions
export const beatUnit = (meter: Meter = '4/4') => METERS[meter].unit
export function groupStarts(meter: Meter = '4/4'): number[] {
  let offset = 0
  return METERS[meter].groups.map(length => { const start = offset; offset += length; return start })
}
export function meterLabel(meter: Meter = '4/4') {
  const unit = { quarter: 'quarter note', 'dotted-quarter': 'dotted quarter', half: 'half note', eighth: 'eighth note' }[beatUnit(meter)]
  const groups = METERS[meter].groups
  return `${meter} · BPM = ${unit}${groups.some(n => n > 1) ? ` · ${groups.join('+')}` : ''}`
}
