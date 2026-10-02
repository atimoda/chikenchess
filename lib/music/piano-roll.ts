import { z } from 'zod'
export const pianoNoteSchema=z.object({start:z.number().finite().min(0).max(8),duration:z.number().finite().min(1/64).max(8),degree:z.number().int().min(-48).max(48),slide:z.number().finite().min(-24).max(24).optional(),slideSeconds:z.number().finite().min(.001).max(2).optional(),pan:z.number().finite().min(0).max(1).optional(),velocity:z.number().finite().min(0).max(1)})
export const pianoRollSchema=z.object({bars:z.number().finite().min(1/12).max(8).refine(value=>Math.abs(value*420-Math.round(value*420))<1e-7,'Duração precisa seguir a grade musical de 1/420 de compasso.'),notes:z.array(pianoNoteSchema).max(128)}).superRefine((roll,ctx)=>{if(roll.notes.some(n=>n.start+n.duration>roll.bars+1e-8))ctx.addIssue({code:'custom',message:'Nota fora da duração da variação.'})})
export type PianoNote=z.infer<typeof pianoNoteSchema>
export type PianoRoll=z.infer<typeof pianoRollSchema>
/** Explicit seed cells: null is a rest, arrays are simultaneous chord notes. */
export function noteRoll(cells: readonly (number | readonly number[] | null)[], bars = 1, gate = .8): PianoRoll {
 const duration = bars / Math.max(1, cells.length)
 return {bars,notes:cells.flatMap((cell,index)=>cell===null?[]:(typeof cell==='number'?[cell]:cell).map(degree=>({start:index*duration,duration:Math.max(1/64,duration*gate),degree,velocity:index%2?.7:1})))}
}
export function resizeRoll(roll:PianoRoll,bars:number):PianoRoll {return {bars,notes:roll.notes.filter(n=>n.start<bars).map(n=>({...n,duration:Math.min(n.duration,bars-n.start)})).filter(n=>n.duration>=1/64)}}
