import { z } from 'zod'
/** Longest variation in bars and the most notes it may hold. */
export const MAX_ROLL_BARS=16, MAX_ROLL_NOTES=256
export const pianoNoteSchema=z.object({start:z.number().finite().min(0).max(MAX_ROLL_BARS),duration:z.number().finite().min(1/64).max(MAX_ROLL_BARS),degree:z.number().int().min(-48).max(48),slide:z.number().finite().min(-24).max(24).optional(),slideSeconds:z.number().finite().min(.001).max(2).optional(),pan:z.number().finite().min(0).max(1).optional(),ratchet:z.number().int().min(1).max(4).optional(),chance:z.number().finite().min(0).max(1).optional(),cutoff:z.number().finite().min(-.5).max(.5).optional(),vibrato:z.boolean().optional(),release:z.number().finite().min(.01).max(2).optional(),reverb:z.number().finite().min(0).max(1).optional(),delay:z.number().finite().min(0).max(1).optional(),drive:z.number().finite().min(0).max(10).optional(),velocity:z.number().finite().min(0).max(1)})
export const pianoRollSchema=z.object({bars:z.number().finite().min(1/12).max(MAX_ROLL_BARS).refine(value=>Math.abs(value*420-Math.round(value*420))<1e-7,'Length must follow the 1/420-bar music grid.'),notes:z.array(pianoNoteSchema).max(MAX_ROLL_NOTES)}).superRefine((roll,ctx)=>{if(roll.notes.some(n=>n.start+n.duration>roll.bars+1e-8))ctx.addIssue({code:'custom',message:'Nota fora da duração da variação.'})})
export type PianoNote=z.infer<typeof pianoNoteSchema>
export type PianoRoll=z.infer<typeof pianoRollSchema>
/** Explicit seed cells: null is a rest, arrays are simultaneous chord notes. */
export function noteRoll(cells: readonly (number | readonly number[] | null)[], bars = 1, gate = .8): PianoRoll {
 const duration = bars / Math.max(1, cells.length)
 return {bars,notes:cells.flatMap((cell,index)=>cell===null?[]:(typeof cell==='number'?[cell]:cell).map(degree=>({start:index*duration,duration:Math.max(1/64,duration*gate),degree,velocity:index%2?.7:1})))}
}
export function resizeRoll(roll:PianoRoll,bars:number):PianoRoll {return {bars,notes:roll.notes.filter(n=>n.start<bars).map(n=>({...n,duration:Math.min(n.duration,bars-n.start)})).filter(n=>n.duration>=1/64)}}

/** Degrees the MIDI editor shows: −7…14 (three octaves of a 7-note scale), widened to fit the notes. */
export function visibleDegreeRange(notes: readonly { degree: number }[]) {
  return { low: Math.min(-7, ...notes.map(n => n.degree)), high: Math.max(14, ...notes.map(n => n.degree)) }
}
