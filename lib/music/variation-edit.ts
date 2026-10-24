import type { Instrument, InstrumentPerformanceEdit } from './model'
import type { PianoRoll } from './piano-roll'

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
    const min=Math.min(...roll.notes.map(n=>n.degree)),max=Math.max(...roll.notes.map(n=>n.degree))
    const high=max===min?Math.min(48,min+6):max,low=high===min?Math.max(-48,min-6):min
    return {...roll,notes:roll.notes.map(n=>({...n,degree:low+Math.floor(random()*(high-low+1))}))}
  })
}
