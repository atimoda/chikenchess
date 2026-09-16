// Strudel pattern construction only. No AudioContext, React or playback lifecycle.
import { performancePattern } from './performance'
import type { Automation } from './automation'
import type { Strudel, StrudelPattern, StrudelWithPick, VoiceSpec } from './runtime-types'

function patternBank(api: Strudel, patterns: string[], section: string) {
  return patterns.length === 1 ? api.mini(patterns[0]) : (api as StrudelWithPick).pickRestart(patterns.map(p => api.mini(p)), section)
}
function automationPattern(api: Strudel, value: Automation, section: string) {
  return value.kind === 'pattern' ? patternBank(api, value.patterns, section) : (value.kind === 'sine' ? api.sine : api.saw).range(value.min, value.max).slow(value.cycles)
}

export function compileVoice(api: Strudel, voice: VoiceSpec):StrudelPattern {
  if(voice.performance){
    const plan=voice.performance
    const compiled=new Map<string,StrudelPattern>()
    const banks=plan.steps.map(step=>{
      if(!step.active)return api.silence
      const key=`${step.variation}:${voice.unpitched?0:step.transpose}`
      let pattern=compiled.get(key)
      if(!pattern){pattern=compileVoice(api,{...voice,performance:undefined,sectionPattern:String(step.variation)});if(!voice.unpitched&&step.transpose)pattern=pattern.transpose(step.transpose);compiled.set(key,pattern)}
      return pattern
    })
    const selector=performancePattern(plan,true)
    return plan.restart?(api as StrudelWithPick).pickRestart(banks,selector):api.stack(...banks.map((p,i)=>p.mask(api.mini(selector).withValue((v:number)=>Number(v)===i))))
  }
  const events = voice.unpitched ? api.n : api.note
  const fixed=/^\d+$/.test(voice.sectionPattern)?Number(voice.sectionPattern):undefined
  const banks=voice.phrases.map((phrase,index)=>{
    const roll=voice.pianoRolls?.[index]
    let pattern=roll ? (roll.notes.length ? api.stack(...roll.notes.map(n=>{
      const chunks: [number,any][]=[]
      if(n.start>0)chunks.push([n.start,api.silence])
      let event=events(n.degree).velocity(n.velocity)
      if(n.slide&&!voice.unpitched)event=event.withValue((v:object)=>({...v,ccSlide:n.slide,ccSlideTime:n.slideSeconds??.15}))
      if(n.pan!==undefined)event=event.withValue((v:object)=>({...v,ccPan:n.pan}))
      chunks.push([n.duration,event])
      if(n.start+n.duration<roll.bars)chunks.push([roll.bars-n.start-n.duration,api.silence])
      return (api as Strudel & {timeCat:(...chunks:[number,any][])=>StrudelPattern}).timeCat(...chunks).slow(roll.bars)
    })) : api.silence) : events(phrase)
    if(voice.groove&&!roll)pattern=pattern.struct(api.mini(voice.groove.rhythms[(fixed??index)%voice.groove.rhythms.length])).velocity(api.mini(voice.groove.accents[(fixed??index)%voice.groove.accents.length]))
    return pattern
  })
  // Legacy banks retain their original independent groove selection. Piano banks
  // own note timing; global-phase selection lets different loop lengths coexist.
  let pattern = fixed!==undefined ? banks[fixed%banks.length] : voice.pianoRolls?.some(Boolean)
    ? api.stack(...banks.map((bank,index)=>bank.mask(api.mini(voice.sectionPattern).withValue((v:number)=>Number(v)%banks.length===index))))
    : voice.phrases.length > 1
      ? (api as StrudelWithPick).pickRestart(voice.phrases.map(phrase=>events(phrase)),voice.sectionPattern)
      : events(voice.notes)
  if(voice.groove&&fixed===undefined&&!voice.pianoRolls?.some(Boolean))pattern=pattern.struct(patternBank(api,voice.groove.rhythms,voice.sectionPattern)).velocity(patternBank(api,voice.groove.accents,voice.sectionPattern))
  if (voice.mask) pattern = pattern.mask(voice.mask)
  for (const [key, value] of Object.entries(voice.controls)) pattern = pattern[key](value)
  for (const [key, original] of Object.entries(voice.automations ?? {})) {
    const value=fixed!==undefined&&original.kind==='pattern'?{...original,patterns:[original.patterns[fixed%original.patterns.length]]}:original
    let control = automationPattern(api, value, voice.sectionPattern)
    if (key === 'gain') control = control.mul(Number(voice.controls.gain))
    if (key === 'lpf' && voice.preview) control = control.withValue((x: number) => Math.min(x, Number(voice.controls.lpf)))
    pattern = pattern[key](control)
  }
  return pattern.orbit(voice.orbit).withValue((value: any) => {
    const {ccSlide,ccSlideTime,ccPan,...rest}=value
    return {...rest,...(ccSlide!==undefined?{penv:ccSlide,pattack:ccSlideTime}:{}),...(ccPan!==undefined?{pan:ccPan}:{}),ccVoice:voice.key}
  })
}
