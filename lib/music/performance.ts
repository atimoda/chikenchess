import { z } from 'zod'

/** Musical time stays in pulses; one transport cycle is one bar. */
export const performanceSchema = z.object({
  restart: z.boolean().default(true),
  steps: z.array(z.object({
    beats: z.number().finite().min(.25).max(64),
    variation: z.number().int().min(0).max(7),
    transpose: z.number().int().min(-24).max(24).default(0),
    active: z.boolean().default(true),
  })).min(1).max(24),
}).superRefine((performance, context) => {
  if (performance.steps.reduce((sum, step) => sum + step.beats, 0) > 512) {
    context.addIssue({code: 'custom', message: 'Arranjo limitado a 512 tempos.'})
  }
})

export type Performance = z.infer<typeof performanceSchema>

/** Square brackets preserve the intended total length, unlike slow angle groups. */
export function performancePattern(performance: Performance, indices = false, beatsPerBar = 4) {
  const beats = performance.steps.reduce((sum, step) => sum + step.beats, 0)
  const steps = performance.steps.map((step, index) => `${indices ? index : step.variation}@${step.beats}`)
  return `[${steps.join(' ')}]/${beats / beatsPerBar}`
}

export function performancePosition(performance: Performance, cycle: number, beatsPerBar = 4) {
  const total = performance.steps.reduce((sum, step) => sum + step.beats, 0)
  const time = ((cycle * beatsPerBar) % total + total) % total
  let start = 0
  for (let index = 0; index < performance.steps.length; index++) {
    const step = performance.steps[index]
    if (time < start + step.beats) return {index, step, progress: (time - start) / step.beats}
    start += step.beats
  }
  return {index: 0, step: performance.steps[0], progress: 0}
}
