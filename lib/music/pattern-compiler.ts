// Strudel pattern construction only. No AudioContext, React or playback lifecycle.
import { optimizeRoll } from './roll-optimizer'
import { performancePattern } from './performance'
import { harmonicPattern } from './harmonic-pattern'
import { loopOrdinal, loopRange } from './loop-ranges'
import { eventRangeConfig, eventRangePattern, sectionBounds } from './range-frequency'
import type { ParameterRange } from './model'
import type { SectionVoice, Strudel, StrudelPattern, StrudelWithPick, VoiceSpec } from './runtime-types'
import { LFO_SIGNALS, noteVibrato } from './sound-design'

function rangePattern(api: Strudel, voice: VoiceSpec, range: ParameterRange, target: 'drive' | 'reverb' | 'swing') {
  const recipe = loopRange(voice, range, target)
  const bounds = target === 'swing' ? undefined : sectionBounds(voice, target)
  if (recipe.min === recipe.max && !(bounds && recipe.clock)) return api.mini(String(recipe.min))
  const random = (api as Strudel & { rand: StrudelPattern }).rand.seed(recipe.seed).range(recipe.min, recipe.max)
  if (recipe.clock) {
    const clock = recipe.clock
    const unit = bounds && (api as Strudel & { rand: StrudelPattern }).rand.seed(recipe.seed)
    return (api as Strudel & { signal: (fn: (time: number) => number) => StrudelPattern }).signal(time => {
      const index = loopOrdinal(Number(time), clock)
      if (!bounds) return random.queryArc(index, index + .0001)[0].value
      const local = ((Number(time) % clock.total) + clock.total) % clock.total, step = clock.steps.findIndex(step => local < step.end)
      const [low, high] = bounds[step < 0 ? clock.steps.length - 1 : step] ?? [recipe.min, recipe.max]
      return low + unit!.queryArc(index, index + .0001)[0].value * (high - low)
    })
  }
  if (recipe.selection) {
    const selector = api.mini(recipe.selection.pattern), selection = recipe.selection
    return (api as Strudel & { signal: (fn: (time: number) => number) => StrudelPattern }).signal(time => {
      const t = Number(time), section = selector.queryArc(t, t + .0001)[0]
      const variation = Number(section?.value ?? 0) % selection.bars.length
      const start = Number(section?.whole?.begin ?? 0)
      const index = selection.restart ? Math.floor(start * 4096) + Math.floor((t - start) / selection.bars[variation]) * 8 + variation
        : Math.floor(t / selection.bars[variation]) * selection.bars.length + variation
      return random.queryArc(index, index + .0001)[0].value
    })
  }
  return random.segment(1).slow(recipe.bars)
}

function applyRanges(api: Strudel, voice: VoiceSpec, pattern: StrudelPattern) {
  if (!voice.manual && voice.instrument.swingRange && voice.instrument.swingRange.frequency === 'loop') pattern = pattern.swingBy(rangePattern(api, voice, voice.instrument.swingRange, 'swing'), voice.beatsPerBar ?? 4)
  if (voice.instrument.driveRange && voice.instrument.driveRange.frequency === 'loop') {
    const drive = rangePattern(api, voice, voice.instrument.driveRange, 'drive')
    pattern = pattern.distort(drive).distortvol(voice.instrument.distortionMix ?? .25)
      .withValue(({ distort, distortvol, ...value }: any) => Number(distort) === 0 ? value : { ...value, distort, distortvol })
  }
  if (voice.instrument.reverbRange && voice.instrument.reverbRange.frequency === 'loop') pattern = pattern.room(rangePattern(api, voice, voice.instrument.reverbRange, 'reverb'))
  const config = eventRangeConfig(voice)
  if (config.ranges.length) pattern = eventRangePattern(pattern, config,
    !voice.manual && !voice.performance && !/^\d+$/.test(voice.sectionPattern) ? api.mini(voice.sectionPattern) : undefined)
  if (!voice.manual && voice.instrument.playChance !== undefined && voice.instrument.playChance < 1) {
    pattern = pattern.degradeBy(1 - voice.instrument.playChance)
  }
  return pattern
}

/** One MIDI bank of a section: ranges and play chance are drawn after the section pick, on
 * the global clock, unless some section changes the chance (then each bank applies its own). */
export function sectionBankVoice(voice: VoiceSpec, own: SectionVoice | undefined, variation: number): VoiceSpec {
  const sound = own?.instrument ?? voice.instrument
  return { ...voice, performance: undefined, harmonic: undefined, sections: undefined, sectionChance: undefined, sectionPattern: String(variation),
    ...(own ? { controls: own.controls, panLfo: own.panLfo } : {}),
    instrument: { ...sound, driveRange: undefined, reverbRange: undefined, swingRange: undefined, lpfRange: undefined,
      playChance: voice.sectionChance ? sound.playChance : undefined,
      ...(sound.octaveRange ? { octaveRange: undefined } : {}),
      ...(sound.swingRange ? { extraSwing: undefined } : {}) } }
}

/** A note's own release, reverb, delay and drive win over section values and ranges drawn after the pick. */
/** Controls of a lane's own release, reverb, delay and drive (drive 0 removes the piece's). */
export function noteSound(lane: { release?: number; reverb?: number; delay?: number; drive?: number }, instrument: { distortionMix?: number }) {
  if (lane.release === undefined && lane.reverb === undefined && lane.delay === undefined && lane.drive === undefined) return undefined
  return { ...(lane.release !== undefined ? { release: lane.release } : {}), ...(lane.reverb !== undefined ? { room: lane.reverb } : {}),
    ...(lane.delay !== undefined ? { delay: lane.delay } : {}),
    ...(lane.drive !== undefined ? { distort: lane.drive, distortvol: instrument.distortionMix ?? .25 } : {}) } as Record<string, number>
}

/** Drive 0 means a clean note: Superdough adds the distortion node whenever `distort` is set. */
export const cleanDrive = (value: any) => { if (value.distort === 0) { const { distort: _d, distortvol: _v, ...rest } = value; return rest } return value }
const withNoteSound = (pattern: StrudelPattern) => pattern.withValue(({ ccNote, ...value }: any) => ccNote ? cleanDrive({ ...value, ...ccNote }) : value)

// A ratcheted note repeats evenly inside its own timeCat chunk.
const ratchet = (pattern: StrudelPattern, times?: number) => times && times > 1 ? pattern.fast(times) : pattern

export function compileVoice(api: Strudel, voice: VoiceSpec):StrudelPattern {
  if (!voice.manual && voice.instrument.loopEnabled === false) return api.silence
  if(voice.performance){
    const plan=voice.performance
    const compiled=new Map<string,StrudelPattern>()
    const bank=(step:{active:boolean;variation:number;transpose:number},index:number)=>{
      if(!step.active)return api.silence
      const own=voice.sections?.[index]
      const key=`${step.variation}:${voice.unpitched?0:step.transpose}:${own?index:''}`
      let pattern=compiled.get(key)
      if(!pattern){pattern=compileVoice(api,sectionBankVoice(voice,own,step.variation));if(!voice.unpitched&&step.transpose)pattern=pattern.transpose(step.transpose);compiled.set(key,pattern)}
      return pattern
    }
    // Section banks by index, then one bank per fill (see performancePattern).
    const banks=[...plan.steps.map(bank),...plan.steps.flatMap((step,index)=>step.fill?[bank({...step,variation:step.fill.variation},index)]:[])]
    const selector=performancePattern(plan,true,voice.beatsPerBar)
    const picker=api as StrudelWithPick
    const pattern = plan.restart?picker.pickRestart(banks,selector):picker.pick(banks,selector)
    const outer = voice.sectionChance ? { ...voice, instrument: { ...voice.instrument, playChance: undefined } } : voice
    return withNoteSound(applyRanges(api, outer, voice.harmonic ? harmonicPattern(pattern,voice.harmonic) : pattern))
  }
  const events = voice.unpitched ? api.n : api.note
  const fixed=/^\d+$/.test(voice.sectionPattern)?Number(voice.sectionPattern):undefined
  const banks=voice.pianoRolls.map((roll,index)=>{
    if (fixed !== undefined && index !== fixed % voice.pianoRolls.length) return api.silence
    const lanes = optimizeRoll(roll).map(lane => {
      const chunks: [number, StrudelPattern][] = lane.segments.map(segment => [segment.duration,
        !segment.notes ? api.silence : ratchet(segment.notes.length === 1 ? events(segment.notes[0]) : api.stack(...segment.notes.map(note => events(note))), lane.ratchet)])
      let pattern = (api as Strudel & {timeCat:(...chunks:[number,StrudelPattern][])=>StrudelPattern}).timeCat(...chunks).velocity(lane.velocity).slow(roll.bars)
      if (lane.slide && !voice.unpitched) pattern = pattern.withValue((v: object) => ({ ...v, ccSlide: lane.slide, ccSlideTime: lane.slideSeconds ?? .5 }))
      if (lane.pan !== undefined) pattern = pattern.withValue((v: object) => ({ ...v, ccPan: lane.pan }))
      if (lane.cutoff || lane.vibrato) pattern = pattern.withValue((v: object) => ({ ...v, ...(lane.cutoff ? { ccCutoff: lane.cutoff } : {}), ...(lane.vibrato && !voice.unpitched ? { ccVib: true } : {}) }))
      const own = noteSound(lane, voice.instrument)
      if (own) pattern = pattern.withValue((v: object) => ({ ...v, ccNote: own }))
      if (lane.chance !== undefined && !voice.manual) pattern = pattern.degradeBy(1 - lane.chance)
      return pattern
    })
    return lanes.length === 0 ? api.silence : lanes.length === 1 ? lanes[0] : api.stack(...lanes)
  })
  let pattern = fixed!==undefined ? banks[fixed%banks.length]
    : api.stack(...banks.map((bank,index)=>bank.mask(api.mini(voice.sectionPattern).withValue((v:number)=>Number(v)%banks.length===index))))
  // This is an additional live swing; catalog rolls already contain their authored timing.
  if (!voice.manual && !voice.instrument.swingRange && voice.instrument.extraSwing) pattern = pattern.swingBy(voice.instrument.extraSwing, voice.beatsPerBar ?? 4)
  for (const [key, value] of Object.entries(voice.controls)) pattern = pattern[key](value)
  if (voice.panLfo) {
    const { period, depth, shape, center } = voice.panLfo
    const signal = (api as unknown as Record<string, StrudelPattern>)[LFO_SIGNALS[shape]]
    pattern = pattern.pan(signal.range(Math.max(0, center - depth / 2), Math.min(1, center + depth / 2)).slow(period))
  }
  pattern = applyRanges(api, voice, pattern)
  const duck = voice.duck ? { duckorbit: voice.duck.orbits, duckdepth: voice.duck.depth, duckattack: voice.duck.release, duckonset: .004 } : {}
  return pattern.orbit(voice.orbit).withValue((value: any) => {
    const {ccSlide,ccSlideTime,ccPan,ccCutoff,ccVib,...rest}=value
    return cleanDrive({...rest,...rest.ccNote,...(ccSlide!==undefined?{penv:ccSlide,pattack:ccSlideTime}:{}),...(ccPan!==undefined?{pan:ccPan}:{}),
      ...(ccCutoff&&rest.cutoff!==undefined?{cutoff:Math.max(20,Math.min(20000,rest.cutoff*(1+ccCutoff)))}:{}),...(ccVib?noteVibrato(voice.instrument,rest):{}),...duck,ccVoice:voice.key})
  })
}
