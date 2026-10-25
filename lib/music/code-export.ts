// Text export of the same voice specifications consumed by the pattern compiler.
import { optimizeRoll, rollLaneNotation } from './roll-optimizer'
import { performancePattern } from './performance'
import { harmonicPattern } from './harmonic-pattern'
import { beatsPerBar, beatUnit } from './meter'
import { sampleRegistration } from './sample-banks'
import { voiceSpecs } from './voice-spec'
import { LFO_SIGNALS } from './sound-design'
import { loopClockCode, loopRange } from './loop-ranges'
import { eventRangeConfig, eventRangePattern } from './range-frequency'
import type { ParameterRange } from './model'
import type { MusicSnapshot, Preview, VoiceSpec } from './runtime-types'

export function renderMusicCode(state: MusicSnapshot, preview: Preview | null): string {
  const voices = voiceSpecs(state, preview).filter(voice => !voice.manual)
  const samples = [...new Map(voices.flatMap(v => v.instrument.source?.kind === 'sample' ? [[sampleRegistration(v.instrument.source).sound, sampleRegistration(v.instrument.source)]] : [])).values()]
  const header = [
    `// ${(state.title ?? 'Düsseldorf').replace(/[\r\n]/g, ' ')} · Strudel`,
    '// Degrees follow the shared scale; each piece keeps its instrument.',
    ...(state.teamMixes ? [`// Post-mix Web Audio buses (gain; bass/mids/highs dB; LPF/HPF dial -1..1): ${JSON.stringify(state.teamMixes)}`] : []),
    ...(preview?.mode === 'manual' ? [`// ${preview.id}: manual note at ${preview.square}; its loop is suspended during the gesture.`] : []),
    `// Meter ${state.meter ?? '4/4'}; BPM counts ${beatUnit(state.meter)} pulses.`,
    `setcps(${state.bpm} / 60 / ${beatsPerBar(state.meter)})`,
    ...samples.map(sample => `samples(${JSON.stringify(sample.map)})`),
  ].join('\n')
  const parts = voices.map(v => {
      const mix = state.volume * Math.min(1, Math.sqrt(10 / Math.max(1, voices.filter(voice => !voice.preview).length)))
      return `  // ${v.piece.id} · ${v.instrument.name.replace(/[\r\n]/g, ' ')}${v.preview ? ' · audition' : ''}\n  ${voiceCode(v)}.postgain(${mix}).orbit(${v.orbit})`
  })

  return `${header}\n${stackCode(parts)}`
}

function voiceCode(voice: VoiceSpec): string {
  if (voice.performance) {
    const plan = voice.performance
    const baseVoice = { ...voice, instrument: { ...voice.instrument, driveRange: undefined, reverbRange: undefined, swingRange: undefined, lpfRange: undefined, playChance: undefined,
      ...(voice.instrument.octaveRange ? { octaveRange: undefined } : {}),
      ...(voice.instrument.swingRange ? { extraSwing: undefined } : {}) } }
    const variations = [...new Set(plan.steps.filter(step=>step.active).map(step=>step.variation))]
    const declarations = variations.map(index=>`const part${index} = ${voiceCode({...baseVoice,performance:undefined,harmonic:undefined,sectionPattern:String(index)})};`).join('\n    ')
    const banks = plan.steps.map(step=>step.active?`part${step.variation}${!voice.unpitched&&step.transpose?`.transpose(${step.transpose})`:''}`:'silence')
    const selector = JSON.stringify(performancePattern(plan, true, voice.beatsPerBar))
    const form = `${plan.restart ? 'pickRestart' : 'pick'}([${banks.join(', ')}], mini(${selector}))`
    const source = `(() => {\n    ${declarations}\n    return ${form};\n  })()`
    return rangesCode(voice, voice.harmonic ? `(${harmonicPattern.toString()})(${source},${JSON.stringify(voice.harmonic)})` : source)
  }
  const event = voice.unpitched ? 'n' : 'note'
  const fixed = /^\d+$/.test(voice.sectionPattern) ? Number(voice.sectionPattern) : undefined
  const banks = voice.pianoRolls.map((roll, i) => {
    if (fixed !== undefined && i !== fixed % voice.pianoRolls.length) return 'silence'
    return stackCode(optimizeRoll(roll).map(lane => {
      const overrides = { ...(lane.slide && !voice.unpitched ? { penv: lane.slide, pattack: lane.slideSeconds ?? .5 } : {}), ...(lane.pan !== undefined ? { pan: lane.pan } : {}) }
      const chance = lane.chance !== undefined && !voice.manual ? `.degradeBy(${Number((1 - lane.chance).toFixed(12))})` : ''
      return `${event}(${JSON.stringify(rollLaneNotation(lane))}).velocity(${lane.velocity}).slow(${roll.bars})${chance}.withValue(v => ({...v, ccOverrides: ${JSON.stringify(overrides)}}))`
    }))
  })
  let source = fixed !== undefined ? banks[fixed % banks.length]
    : stackCode(banks.map((bank,i)=>`${bank}.mask(mini(${JSON.stringify(voice.sectionPattern)}).withValue(v => Number(v) % ${banks.length} === ${i}))`))
  if (!voice.manual && !voice.instrument.swingRange && voice.instrument.extraSwing) source += `.swingBy(${voice.instrument.extraSwing},${voice.beatsPerBar ?? 4})`
  source += Object.entries(voice.controls).map(([key,value])=>`.${key}(${JSON.stringify(value)})`).join('')
  if (voice.panLfo) {
    const { period, depth, shape, center } = voice.panLfo
    source += `.pan(${LFO_SIGNALS[shape]}.range(${Math.max(0, center - depth / 2)},${Math.min(1, center + depth / 2)}).slow(${period}))`
  }
  source = rangesCode(voice, source)
  const duck = voice.duck ? `, duckorbit: ${JSON.stringify(voice.duck.orbits)}, duckdepth: ${JSON.stringify(voice.duck.depth)}, duckattack: ${JSON.stringify(voice.duck.release)}, duckonset: 0.004` : ''
  return `${source}.withValue(({ccOverrides, ...v}) => ({...v, ...ccOverrides${duck}}))`
}

function rangeCode(voice: VoiceSpec, range: ParameterRange, target: 'drive' | 'reverb' | 'swing') {
  const recipe = loopRange(voice, range, target)
  if (recipe.min === recipe.max) return `mini(${JSON.stringify(String(recipe.min))})`
  if (recipe.clock) return `(() => {const r=rand.seed(${recipe.seed}).range(${recipe.min},${recipe.max});return signal(time=>{${loopClockCode(recipe.clock)}return r.queryArc(index,index+.0001)[0].value;});})()`
  if (recipe.selection) return `(() => {const r=rand.seed(${recipe.seed}).range(${recipe.min},${recipe.max}),c=${JSON.stringify(recipe.selection)},selector=mini(c.pattern);return signal(time=>{const t=Number(time),section=selector.queryArc(t,t+.0001)[0],variation=Number(section?.value??0)%c.bars.length,start=Number(section?.whole?.begin??0);const index=c.restart?Math.floor(start*4096)+Math.floor((t-start)/c.bars[variation])*8+variation:Math.floor(t/c.bars[variation])*c.bars.length+variation;return r.queryArc(index,index+.0001)[0].value;});})()`
  return `rand.seed(${recipe.seed}).range(${recipe.min},${recipe.max}).segment(1).slow(${recipe.bars})`
}

function rangesCode(voice: VoiceSpec, source: string) {
  if (!voice.manual && voice.instrument.swingRange && voice.instrument.swingRange.frequency === 'loop') source += `.swingBy(${rangeCode(voice, voice.instrument.swingRange, 'swing')},${voice.beatsPerBar ?? 4})`
  if (voice.instrument.driveRange && voice.instrument.driveRange.frequency === 'loop') {
    const drive = rangeCode(voice, voice.instrument.driveRange, 'drive')
    source += `.distort(${drive}).distortvol(${voice.instrument.distortionMix ?? .25}).withValue(({distort,distortvol,...value})=>Number(distort)===0?value:{...value,distort,distortvol})`
  }
  if (voice.instrument.reverbRange && voice.instrument.reverbRange.frequency === 'loop') source += `.room(${rangeCode(voice, voice.instrument.reverbRange, 'reverb')})`
  const config = eventRangeConfig(voice)
  if (config.ranges.length) source = `(${eventRangePattern.toString()})(${source},${JSON.stringify(config)}${!voice.manual && !voice.performance && !/^\d+$/.test(voice.sectionPattern) ? `,mini(${JSON.stringify(voice.sectionPattern)})` : ''})`
  if (!voice.manual && voice.instrument.playChance !== undefined && voice.instrument.playChance < 1) source += `.degradeBy(${1 - voice.instrument.playChance})`
  return source
}

function stackCode(parts: string[]) {
  return parts.length === 0 ? 'silence' : parts.length === 1 ? parts[0] : `stack(
${parts.join(',\n')}
)`
}

/** Syntax counts, not live DSP node counts (which depend on currently sounding notes). */
export function strudelCodeStats(code: string) {
  return { bytes: new TextEncoder().encode(code).length,
    stacks: (code.match(/\bstack\(/g) ?? []).length,
    timeCats: (code.match(/\btimeCat\(/g) ?? []).length,
    orbits: new Set([...code.matchAll(/\.orbit\((\d+)\)/g)].map(match => match[1])).size,
    filters: (code.match(/\.(?:lpf|hpf)\(/g) ?? []).length }
}
