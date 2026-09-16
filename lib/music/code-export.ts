// Text export of the same voice specifications consumed by the pattern compiler.
import { performancePattern } from './performance'
import { sampleRegistration } from './sample-banks'
import { voiceSpecs } from './voice-spec'
import type { Automation } from './automation'
import type { MusicSnapshot, Preview, VoiceSpec } from './runtime-types'

export function renderMusicCode(state: MusicSnapshot, preview: Preview | null): string {
  const voices = voiceSpecs(state, preview).filter(voice => !voice.manual)
  const samples = [...new Map(voices.flatMap(v => v.instrument.source?.kind === 'sample' ? [[sampleRegistration(v.instrument.source).sound, sampleRegistration(v.instrument.source)]] : [])).values()]
  return [
    `// ${(state.title ?? 'Düsseldorf').replace(/[\r\n]/g, ' ')} · Strudel`,
    '// Degrees follow the shared scale; each piece keeps its instrument.',
    ...(state.teamMixes ? [`// Post-mix Web Audio buses (gain; bass/mids/highs dB): ${JSON.stringify(state.teamMixes)}`] : []),
    ...(preview?.mode === 'manual' ? [`// ${preview.id}: manual note at ${preview.square}; its loop is suspended during the gesture.`] : []),
    `setcps(${state.bpm} / 60 / 4)`,
    ...samples.map(sample => `samples(${JSON.stringify(sample.map)})`),
    'stack(',
    ...voices.map(v => {
      const mix = state.volume * Math.min(1, Math.sqrt(10 / Math.max(1, voices.filter(voice => !voice.preview).length)))
      return `  // ${v.piece.id} · ${v.instrument.name.replace(/[\r\n]/g, ' ')}${v.preview ? ' · audition' : ''}\n  ${voiceCode(v)}.postgain(${mix}).orbit(${v.orbit}),`
    }),
    voices.length ? ')' : '  silence\n)',
  ].join('\n')
}

function voiceCode(voice: VoiceSpec): string {
  if (voice.performance) {
    const plan = voice.performance
    const variations = [...new Set(plan.steps.filter(step=>step.active).map(step=>step.variation))]
    const declarations = variations.map(index=>`const part${index} = ${voiceCode({...voice,performance:undefined,sectionPattern:String(index)})};`).join('\n    ')
    const banks = plan.steps.map(step=>step.active?`part${step.variation}${!voice.unpitched&&step.transpose?`.transpose(${step.transpose})`:''}`:'silence')
    const selector = JSON.stringify(performancePattern(plan, true))
    const form = plan.restart ? `pickRestart([${banks.join(', ')}], mini(${selector}))` : `stack(${banks.map((bank, i) => `${bank}.mask(mini(${selector}).withValue(v => Number(v) === ${i}))`).join(', ')})`
    return `(() => {\n    ${declarations}\n    return ${form};\n  })()`
  }
  const event = voice.unpitched ? 'n' : 'note'
  const fixed = /^\d+$/.test(voice.sectionPattern) ? Number(voice.sectionPattern) : undefined
  const banks = voice.phrases.map((phrase, i) => {
    const roll = voice.pianoRolls?.[i]
    let source = roll ? (roll.notes.length ? `stack(${roll.notes.map(n => {
      const chunks: string[] = []
      if (n.start) chunks.push(`[${n.start}, silence]`)
      const overrides = {...(n.slide && !voice.unpitched ? {penv:n.slide,pattack:n.slideSeconds??.15} : {}), ...(n.pan !== undefined ? {pan:n.pan} : {})}
      chunks.push(`[${n.duration}, ${event}(${n.degree}).velocity(${n.velocity}).withValue(v => ({...v, ccOverrides: ${JSON.stringify(overrides)}}))]`)
      if (n.start+n.duration<roll.bars) chunks.push(`[${roll.bars-n.start-n.duration}, silence]`)
      return `timeCat(${chunks.join(', ')}).slow(${roll.bars})`
    }).join(', ')})` : 'silence') : `${event}(${JSON.stringify(phrase)})`
    if (!roll && voice.groove) source += `.struct(${JSON.stringify(voice.groove.rhythms[(fixed??i)%voice.groove.rhythms.length])}).velocity(${JSON.stringify(voice.groove.accents[(fixed??i)%voice.groove.accents.length])})`
    return source
  })
  let source = fixed !== undefined ? banks[fixed % banks.length] : voice.pianoRolls?.some(Boolean)
    ? `stack(${banks.map((bank,i)=>`${bank}.mask(mini(${JSON.stringify(voice.sectionPattern)}).withValue(v => Number(v) % ${banks.length} === ${i}))`).join(', ')})`
    : voice.phrases.length > 1 ? `pickRestart([${voice.phrases.map(p=>`${event}(${JSON.stringify(p)})`).join(', ')}], mini(${JSON.stringify(voice.sectionPattern)}))` : `${event}(${JSON.stringify(voice.notes)})`
  if (voice.groove && fixed === undefined && !voice.pianoRolls?.some(Boolean)) source += `.struct(${patternBankCode(voice.groove.rhythms,voice.sectionPattern)}).velocity(${patternBankCode(voice.groove.accents,voice.sectionPattern)})`
  if (voice.mask) source += `.mask(${JSON.stringify(voice.mask)})`
  source += Object.entries(voice.controls).map(([key,value])=>`.${key}(${JSON.stringify(value)})`).join('')
  source += Object.entries(voice.automations??{}).map(([key,value])=>`.${key}(${automationCode(value,voice.sectionPattern)}${key==='gain'?`.mul(${Number(voice.controls.gain)})`:key==='lpf'&&voice.preview?`.withValue(x => Math.min(x, ${voice.controls.lpf}))`:''})`).join('')
  return `${source}.withValue(({ccOverrides, ...v}) => ({...v, ...ccOverrides}))`
}

function patternBankCode(patterns: string[], section: string) {
  if(/^\d+$/.test(section))return `mini(${JSON.stringify(patterns[Number(section)%patterns.length])})`
  return patterns.length === 1 ? `mini(${JSON.stringify(patterns[0])})` : `pickRestart([${patterns.map(p => `mini(${JSON.stringify(p)})`).join(', ')}], mini(${JSON.stringify(section)}))`
}
function automationCode(value: Automation, section: string) {
  return value.kind === 'pattern' ? patternBankCode(value.patterns, section) : `${value.kind === 'sine' ? 'sine' : 'saw'}.range(${value.min}, ${value.max}).slow(${value.cycles})`
}
