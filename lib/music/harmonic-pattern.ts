import type { StrudelPattern } from './runtime-types'

export interface HarmonicConfig {
  pulses: number
  sections: {beats:number;transpose:number;notes:Record<string,number[]>[]}[]
}

/** Apply global harmony at the original attack, independently of a MIDI bank's
 * length/phase. Self-contained so exported Strudel uses exactly the same lookup.
 * Generated sustained chords share one attack; all articulations remain intact.
 */
export function harmonicPattern(pattern: StrudelPattern, config: HarmonicConfig): StrudelPattern {
  const total = config.sections.reduce((sum, section) => sum + section.beats, 0)
  const Pattern = pattern.constructor as new (query:(state:any)=>any[])=>StrudelPattern
  return new Pattern(state => pattern.query(state).flatMap((hap:any) => {
    const time = Number(hap.whole?.begin ?? hap.part.begin) * config.pulses
    let local = ((time % total) + total) % total
    let section = config.sections[config.sections.length-1]
    for (const candidate of config.sections) {
      if (local < candidate.beats) {section=candidate;break}
      local -= candidate.beats
    }
    const map = section.notes[Math.floor(local/config.pulses) % section.notes.length]
    const key = String(Math.round((Number(hap.value.note) - section.transpose)*1e6))
    const notes = map[key]
    return notes ? notes.map(note => hap.withValue((value:any) => ({...value,note:note+section.transpose}))) : [hap]
  }))
}
