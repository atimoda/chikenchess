import { HARMONY_PLANS } from '../harmony'
import { beatsPerBar } from '../meter'
import { band, classical, guitars, percussion, type PartProfile, type ProfileSource, type StyleProfile } from './types'

const samba = (asset: string, pitched = false): ProfileSource => ({ kind: 'sample', bank: 'sambaReggae', asset, pitched })

/** Recorded substitutions are acoustic instruments, not copies of a reference song. */
export function recordedPart(city: string, part: PartProfile, slot: number): PartProfile {
  const source = part.source
  if (source.kind !== 'sample' || ['classical', 'sambaReggae'].includes(source.bank)) return part
  const take = slot % 2
  let replacement: ProfileSource | undefined
  let name = part.name
  let driveRange = part.driveRange
  if (source.bank === 'keys' && ['grand', 'upright'].includes(source.asset)) {
    replacement = band('piano', part.role === 'melody' ? 1 : 0)
    name = name.replace(/vertical|upright/gi, 'de cauda')
  }
  if (source.bank === 'jazz') {
    if (['reed', 'baritone'].includes(source.asset)) replacement = band('tenor-sax', take)
    if (source.asset === 'brass') replacement = samba('trompete', true)
    if (source.asset === 'pluck') { replacement = guitars('bass', take); name = name.replace(/Contrabaixo acústico/i, 'Baixo hollowbody') }
    if (source.asset === 'kick') replacement = percussion('kick', take)
    if (source.asset === 'snare') replacement = percussion(source.variant === 1 ? 'ghost-snare' : 'snare', take)
    if (source.asset === 'ride') replacement = percussion('ride', take)
  }
  if (source.bank === 'strings') {
    if (['bass-round', 'bass-pick'].includes(source.asset)) { replacement = guitars('bass', take); name = name.replace(/de palheta|Contrabaixo/gi, 'hollowbody') }
    if (source.asset === 'muted-electric') replacement = guitars('muted', take)
    if (['crunch-electric', 'slide-electric'].includes(source.asset)) {
      replacement = guitars('clean', take)
      if (source.asset === 'crunch-electric') driveRange = { first: part.distortion ?? 1.2, second: (part.distortion ?? 1.2) + .5 }
    }
    if (source.asset === 'nylon') replacement = guitars('nylon')
    if (source.asset === 'violin') replacement = classical('violin-sustain', take)
    if (source.asset === 'cello') replacement = classical('cello-sustain', take)
    if (source.asset === 'pizzicato') replacement = classical('violin-pizzicato', take)
  }
  if (source.bank === 'drums') {
    const drums: Record<string, string> = { 'rock-kick': 'kick', 'rock-snare': 'snare', ride: 'ride', tambourine: 'tambourine' }
    if (drums[source.asset]) replacement = percussion(drums[source.asset], take)
  }
  if (source.bank === 'world') {
    if (source.asset === 'conga') replacement = percussion('conga', take)
    if (source.asset === 'marimba') replacement = band('marimba', take)
    if (source.asset === 'flute') replacement = classical('flute-sustain', take)
    if (source.asset === 'strings') replacement = classical('violin-sustain', take)
    if (source.asset === 'guitar') replacement = guitars('nylon')
    if (source.asset === 'tambourine') replacement = /pandeiro/i.test(part.name) ? samba('pandeiro') : percussion('tambourine', take)
    if (source.asset === 'crash') replacement = percussion('crash', take)
    if (source.asset === 'timpani') {
      replacement = city === 'rio-1930' ? samba('surdo-fundo') : ['rio-1910', 'rio-1960', 'piracicaba-1940'].includes(city) ? samba('pandeiro')
        : /t[ií]mpano/i.test(part.name) ? classical('timpani-low', take, false) : undefined
    }
  }
  return replacement ? { ...part, source: replacement, name, driveRange,
    ...(source.asset === 'slide-electric' ? { pitchEnvelope: part.pitchEnvelope ?? -1, pitchAttack: part.pitchAttack ?? .12 } : {}),
  } : part
}

const cells = (pattern: string) => pattern.trim().split(/\s+/)
const quiet = (pattern: string) => {
  let attack = 0
  return cells(pattern).map(cell => cell === '.' ? cell : attack++ % 2 === 0 ? cell : '.').join(' ')
}
function pickup(pattern: string, pitched: boolean) {
  const result = cells(pattern)
  const count = result.length
  // Keep the downbeat and existing accents. Only the end of the phrase changes.
  for (let index = Math.max(1, count - 3); index < count; index++) {
    if (result[index] === '.') result[index] = pitched ? String([4, 2, 0][index - Math.max(1, count - 3)]) : '0'
  }
  return result.join(' ')
}
function alternate(part: PartProfile, ending: boolean) {
  const base = part.patterns[ending ? 0 : 2] ?? part.patterns[0]
  if (part.role === 'harmony' || part.role === 'texture') {
    // Four bar chord attacks; sustain and release keep the texture connected.
    return ending ? '0 . . . 0 . . . 0 . . . 0 . . .' : '0 . . . . 0 . . 0 . . . . 0 . .'
  }
  if (part.role === 'rhythm') {
    const anchor = /bumbo|kick|surdo|fundação|caixa principal|one.?drop/i.test(part.name)
    return ending ? (anchor ? base : pickup(base, false)) : anchor ? base : quiet(base)
  }
  const first = ending ? base : quiet(base)
  const answer = ending ? pickup(part.patterns[3] ?? base, true) : cells(part.patterns[1] ?? base).map((cell, index) => index < 2 ? '.' : cell).join(' ')
  return `${first} ${answer}`
}

function harmonySequences(profile: StyleProfile) {
  const roots = HARMONY_PLANS[profile.harmony].degrees
  const first = Array.from({ length: 4 }, (_, index) => [roots[index % roots.length]])
  const alternative = profile.harmony.startsWith('jazz') ? [1, 4, 0, 0]
    : profile.harmony === 'static' ? [0, 0, 0, 0]
    : profile.harmony === 'blues-145' || profile.harmony === 'southern-rock-415' ? [3, 3, 0, 4]
    : profile.harmony === 'descent' ? [-2, 3, -1, 0]
    : [5, 3, 1, 4]
  const returnHome = profile.harmony.startsWith('jazz') ? [2, 5, 1, 4]
    : profile.harmony === 'static' ? [0, 0, 0, 0]
    : [0, 3, 4, 0]
  return [...first, alternative, returnHome]
}

/** Six composed scenes, with preserved meter and a harmonically different E/F. */
export function curateArrangement(city: string, original: StyleProfile): StyleProfile {
  const pulse = beatsPerBar(original.meter)
  const sections = Array.from({ length: 4 }, (_, index) => original.sections[index] ?? original.sections[0])
  const profile = { ...original, sections: [...sections, pulse * 4, pulse * 8], harmonicSequences: harmonySequences(original) }
  return { ...profile, parts: original.parts.map((authored, index) => {
    const part = recordedPart(city, authored, index)
    const patterns = Array.from({ length: 4 }, (_, variation) => part.patterns[variation] ?? part.patterns.at(-1) ?? '0')
    // Some study layers repeated one cell in all four banks. Keep their identity
    // but add an end response and a sparser bridge before authoring E and F.
    if (new Set(patterns).size === 1 && part.role !== 'rhythm') {
      patterns[1] = pickup(patterns[0], true)
      patterns[2] = quiet(patterns[0])
    }
    const baseBars = Array.from({ length: 4 }, (_, variation) => Array.isArray(part.bars) ? part.bars[variation] ?? part.bars[0] : part.bars ?? 1)
    const active = Array.from({ length: 4 }, (_, variation) => part.arrangement?.active?.[variation] ?? true)
    const room = part.effects?.reverb ?? (part.role === 'rhythm' ? .025 : part.role === 'texture' ? .22 : .1)
    return { ...part, patterns: [...patterns, alternate(part, false), alternate(part, true)],
      bars: [...baseBars, part.role === 'rhythm' ? baseBars[0] : 4, part.role === 'rhythm' ? baseBars[0] : 4],
      reverbRange: part.reverbRange ?? { first: Math.max(0, room - .02), second: Math.min(.4, room + (part.role === 'bass' ? .005 : .025)) },
      ...(part.role === 'bass' ? { effects: { ...part.effects, reverb: .02 }, reverbRange: { first: .01, second: .025 } } : {}),
      arrangement: { ...part.arrangement, restart: true,
        variations: [0, 1, 2, 3, 4, 5],
        active: [...active, !['texture', 'response'].includes(part.role), part.role !== 'texture' || index % 2 === 0],
        transpose: [...Array.from({ length: 4 }, (_, variation) => part.arrangement?.transpose?.[variation] ?? 0), 0, 0],
      },
    }
  }) }
}
