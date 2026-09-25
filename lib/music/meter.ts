/** One Strudel cycle is one bar. BPM counts the audible pulse: quarter in simple
 * meter and dotted quarter in compound meter. Each compound pulse has 3 eighths. */
export const METERS = {
  '4/4': { beatsPerBar: 4, subdivisions: 2 },
  '3/4': { beatsPerBar: 3, subdivisions: 2 },
  '6/8': { beatsPerBar: 2, subdivisions: 3 },
  '12/8': { beatsPerBar: 4, subdivisions: 3 },
} as const

export type Meter = keyof typeof METERS
export const beatsPerBar = (meter: Meter = '4/4') => METERS[meter].beatsPerBar
export const subdivisionsPerBeat = (meter: Meter = '4/4') => METERS[meter].subdivisions
