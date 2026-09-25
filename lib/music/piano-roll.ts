import { z } from 'zod'
export const pianoNoteSchema=z.object({start:z.number().finite().min(0).max(8),duration:z.number().finite().min(1/48).max(8),degree:z.number().int().min(-48).max(48),slide:z.number().finite().min(-24).max(24).optional(),slideSeconds:z.number().finite().min(.001).max(2).optional(),pan:z.number().finite().min(0).max(1).optional(),velocity:z.number().finite().min(0).max(1)})
export const pianoRollSchema=z.object({bars:z.number().finite().min(1/12).max(8).refine(value=>Math.abs(value*12-Math.round(value*12))<1e-7,'Duração precisa ser múltipla de 1/12 de compasso.'),notes:z.array(pianoNoteSchema).max(128)}).superRefine((roll,ctx)=>{if(roll.notes.some(n=>n.start+n.duration>roll.bars+1e-8))ctx.addIssue({code:'custom',message:'Nota fora da duração da variação.'})})
export type PianoNote=z.infer<typeof pianoNoteSchema>
export type PianoRoll=z.infer<typeof pianoRollSchema>
export function resizeRoll(roll:PianoRoll,bars:number):PianoRoll {return {bars,notes:roll.notes.filter(n=>n.start<bars).map(n=>({...n,duration:Math.min(n.duration,bars-n.start)}))}}
