// Strudel pattern construction only. No AudioContext, React or playback lifecycle.
import { optimizeRoll } from './roll-optimizer'
import { performancePattern } from './performance'
import { harmonicPattern } from './harmonic-pattern'
import { loopOrdinal, loopRange } from './loop-ranges'
import { eventRangeConfig, eventRangePattern } from './range-frequency'
import type { ParameterRange } from './model'
import type { Strudel, StrudelPattern, StrudelWithPick, VoiceSpec } from './runtime-types'

function rangePattern(api: Strudel, voice: VoiceSpec, range: ParameterRange, target: 'drive' | 'reverb' | 'swing') {
  const recipe = loopRange(voice, range, target)
  if (recipe.min === recipe.max) return api.mini(String(recipe.min))
  const random = (api as Strudel & { rand: StrudelPattern }).rand.seed(recipe.seed).range(recipe.min, recipe.max)
  if (recipe.clock) return (api as Strudel & { signal: (fn: (time: number) => number) => StrudelPattern }).signal(time => {
    const index = loopOrdinal(Number(time), recipe.clock!)
    return random.queryArc(index, index + .0001)[0].value
  })
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

// A ratcheted note repeats evenly inside its own timeCat chunk.
const ratchet = (pattern: StrudelPattern, times?: number) => times && times > 1 ? pattern.fast(times) : pattern

export function compileVoice(api: Strudel, voice: VoiceSpec):StrudelPattern {
  if (!voice.manual && voice.instrument.loopEnabled === false) return api.silence
  if(voice.performance){
    const plan=voice.performance
    const baseVoice = { ...voice, instrument: { ...voice.instrument, driveRange: undefined, reverbRange: undefined, swingRange: undefined, lpfRange: undefined, playChance: undefined,
      ...(voice.instrument.octaveRange ? { octaveRange: undefined } : {}),
      ...(voice.instrument.swingRange ? { extraSwing: undefined } : {}) } }
    const compiled=new Map<string,StrudelPattern>()
    const banks=plan.steps.map(step=>{
      if(!step.active)return api.silence
      const key=`${step.variation}:${voice.unpitched?0:step.transpose}`
      let pattern=compiled.get(key)
      if(!pattern){pattern=compileVoice(api,{...baseVoice,performance:undefined,harmonic:undefined,sectionPattern:String(step.variation)});if(!voice.unpitched&&step.transpose)pattern=pattern.transpose(step.transpose);compiled.set(key,pattern)}
      return pattern
    })
    const selector=performancePattern(plan,true,voice.beatsPerBar)
    const picker=api as StrudelWithPick
    const pattern = plan.restart?picker.pickRestart(banks,selector):picker.pick(banks,selector)
    return applyRanges(api, voice, voice.harmonic ? harmonicPattern(pattern,voice.harmonic) : pattern)
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
  pattern = applyRanges(api, voice, pattern)
  return pattern.orbit(voice.orbit).withValue((value: any) => {
    const {ccSlide,ccSlideTime,ccPan,...rest}=value
    return {...rest,...(ccSlide!==undefined?{penv:ccSlide,pattack:ccSlideTime}:{}),...(ccPan!==undefined?{pan:ccPan}:{}),ccVoice:voice.key}
  })
}
