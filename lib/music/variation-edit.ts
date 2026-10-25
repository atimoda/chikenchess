import type { Instrument, InstrumentPerformanceEdit } from './model'
import { visibleDegreeRange, type PianoRoll } from './piano-roll'

/** New banks are explicit empty MIDI, never text placeholders. */
export function addVariation(instrument: Instrument): InstrumentPerformanceEdit {
  if (instrument.pianoRolls.length >= 8) return {}
  return { pianoRolls: [...instrument.pianoRolls, { bars: instrument.pianoRolls.at(-1)!.bars, notes: [] }] }
}

export function removeLastVariation(instrument: Instrument): InstrumentPerformanceEdit {
  const count = instrument.pianoRolls.length
  if (count <= 1) return {}
  return { pianoRolls: instrument.pianoRolls.slice(0,-1),
    ...(instrument.arrangement ? {arrangement:{...instrument.arrangement,sections:Object.fromEntries(Object.entries(instrument.arrangement.sections).map(([id,step]) => [id,{...step,variation:step.variation === null ? null : Math.min(step.variation,count-2)}]))}} : {}),
    selectedVariation: instrument.selectedVariation === undefined ? undefined : Math.min(instrument.selectedVariation,count-2) }
}

function edit(instrument: Instrument, variation: number, transform: (roll: PianoRoll) => PianoRoll): InstrumentPerformanceEdit {
  const index = Math.max(0,Math.min(instrument.pianoRolls.length-1,variation))
  return { pianoRolls: instrument.pianoRolls.map((roll,i)=>i===index?transform(roll):roll) }
}

export function reverseVariation(instrument: Instrument, variation: number): InstrumentPerformanceEdit {
  return edit(instrument,variation,roll=>({...roll,notes:roll.notes.map(note=>({...note,
    start:Math.max(0,roll.bars-note.start-note.duration),...(note.slide===undefined?{}:{slide:-note.slide}),
  })).sort((a,b)=>a.start-b.start||a.duration-b.duration)}))
}

export function randomizeVariation(instrument: Instrument, variation: number, random: () => number = Math.random): InstrumentPerformanceEdit {
  return edit(instrument,variation,roll=>{
    if(!roll.notes.length)return roll
    // Draw from the whole range the editor shows, not the notes' own span:
    // shrinking to that span made repeated clicks cluster and then drift upward.
    const {low,high}=visibleDegreeRange(roll.notes)
    return {...roll,notes:roll.notes.map(n=>({...n,degree:low+Math.floor(random()*(high-low+1))}))}
  })
}

export type EuclidMode = 'notes' | 'accent' | 'ratchet' | 'chance'

/** E(pulses, steps): `pulses` onsets spread as evenly as possible over `steps`
 * (Bresenham form, a rotation of Bjorklund's when they differ),
 * the first on step 0, then rotated right by `rotate` steps. */
export function euclidPattern(pulses: number, steps: number, rotate = 0): boolean[] {
  const n = Math.max(1, Math.floor(steps)), k = Math.max(0, Math.min(n, Math.floor(pulses)))
  const shift = ((Math.floor(rotate) % n) + n) % n
  return Array.from({ length: n }, (_, i) => ((i - shift + n) % n) * k % n < k)
}

/** Grid cells of a roll at a beat division: the steps the euclidean pattern spans. */
export function euclidSteps(roll: PianoRoll, beatsPerBar: number, division: number) {
  return Math.max(1, Math.round(roll.bars * beatsPerBar * division))
}

/** Applies E(pulses, steps) to a variation, always from `source` so repeated
 * tweaks do not compound:
 * - notes: rewrites the rhythm, one step-long note per onset, cycling the
 *   source notes in time order so the melody and articulation survive;
 * - accent: onsets play at full accent, the other notes at half;
 * - ratchet: notes starting on an onset repeat ×2, the others play once;
 * - chance: notes off the pattern play 50% of the time, the onsets always. */
export function euclidVariation(instrument: Instrument, variation: number, source: PianoRoll, { mode, pulses, rotate, beatsPerBar, division }: { mode: EuclidMode; pulses: number; rotate: number; beatsPerBar: number; division: number }): InstrumentPerformanceEdit {
  const steps = euclidSteps(source, beatsPerBar, division), quantum = source.bars / steps
  const pattern = euclidPattern(pulses, steps, rotate)
  const onset = (start: number) => pattern[Math.min(steps - 1, Math.floor(start / quantum + 1e-6))]
  return edit(instrument, variation, () => {
    if (mode === 'notes') {
      const melody = [...source.notes].sort((a, b) => a.start - b.start || a.degree - b.degree)
      let next = 0
      const notes = pattern.flatMap((hit, step) => {
        if (!hit) return []
        const model = melody.length ? melody[next++ % melody.length] : { degree: 0, velocity: .8 }
        return [{ ...model, start: step * quantum, duration: quantum }]
      })
      return { ...source, notes }
    }
    return { ...source, notes: source.notes.map(note => {
      const hit = onset(note.start)
      if (mode === 'accent') return { ...note, velocity: hit ? 1 : .5 }
      if (mode === 'ratchet') return { ...note, ratchet: hit ? 2 : undefined }
      return { ...note, chance: hit ? undefined : .5 }
    }) }
  })
}
