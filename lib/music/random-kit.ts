import type { CityData } from '../cities-data'
import { createCreativeSession, creativeSchema, ROOTS, SCALES, type CreativeSession } from './creative'
import { PATTERN_RECIPES, type PatternFamily } from './pattern-library'
import { SAMPLE_BANKS } from './sample-banks'

// Versioned seed keeps a city's factory arrangement identical in the game and
// editor, across reloads and devices. Explicit rerolls supply a different seed.
function seededRandom(seed: string) {
  let state = 2166136261
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619)
  return () => {
    state |= 0
    state = state + 0x6D2B79F5 | 0
    let n = Math.imul(state ^ state >>> 15, 1 | state)
    n ^= n + Math.imul(n ^ n >>> 7, 61 | n)
    return ((n ^ n >>> 14) >>> 0) / 4294967296
  }
}

export function createRandomCityKit(city: CityData, variation = '01'): CreativeSession {
  const random = seededRandom(`city-kit-v1:${city.id}:${variation}`)
  const pick = <T,>(items: readonly T[]): T => items[Math.floor(random() * items.length)]
  const between = (min: number, max: number) => Math.round((min + random() * (max - min)) * 1000) / 1000
  const shuffle = <T,>(items: readonly T[]) => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
    }
    return copy
  }
  const kit = createCreativeSession()
  kit.cityId = city.id
  kit.name = `${city.name} · Experimento ${variation}`.slice(0, 80)
  kit.bpm = Math.max(60, Math.min(175, city.bpm + pick([-20, -12, -6, 0, 6, 12, 20])))
  kit.volume = between(.65, .8)
  kit.root = pick(ROOTS)
  kit.scale = pick(Object.keys(SCALES) as Array<keyof typeof SCALES>)
  kit.sectionPattern = pick(['[0@4 1@4 2@4 1@4]/16', '[0@2 1@2 2@4]/8', '[0@4 2@4 1@4 2@4]/16'])

  // Shared rhythmic lanes: choose an ensemble feel, then vary its sections.
  // Keep at least one attack in each lane/section so every active piece speaks.
  const rhythmSets = [
    { kick: 'x x x x', snare: '~ x ~ x', hat: 'x*8' },
    { kick: 'x ~ [~ x] ~', snare: '~ x ~ [x ~]', hat: '[x ~ x] [~ x ~] [x ~ x] [~ x ~]' },
    { kick: 'x ~ ~ [x ~]', snare: '~ ~ x ~', hat: '[x ~] [~ x] [x ~] [~ x]' },
    { kick: 'x [~ x] ~ x', snare: '~ [x ~] ~ [~ x]', hat: '[~ x]*4' },
  ]
  const feel = pick(rhythmSets)
  const groove = kit.grooves.motorik
  groove.name = `Groove experimental · ${city.name}`
  for (const [laneId, lane] of Object.entries(groove.lanes)) {
    const rhythm = feel[laneId as keyof typeof feel] ?? pick(['~ ~ ~ x', '~ [~ x] ~ ~', '~ ~ [x x] ~', '[~ x] ~ [~ x] ~'])
    lane.rhythms = [rhythm, rhythm, pick([rhythm, '~ x [~ x] [x x]'])]
    lane.accents = Array.from({ length: 3 }, () => `1 ${between(.4, .65)} ${between(.65, .95)} ${between(.4, .75)}`)
  }

  const assets = ['kick', 'snare', 'hat', 'clap', 'tom', 'open-hat', 'rim', 'shaker']
  const lanes = ['kick', 'snare', 'hat', 'clap', 'tom', 'open', 'rim', 'shaker']
  const families: PatternFamily[] = ['bass', 'bass', 'harmony', 'harmony', 'sequence', 'sequence', 'lead', 'lead']
  const roles = shuffle(Array.from({ length: 16 }, (_, i) => i))
  const origins = kit.pieces.filter(p => p.color === 'w').map(p => p.origin).sort()
  const chords = pick(['[0,2,4]', '[0,3,4]', '[-2,0,2]'])

  for (const piece of kit.pieces) {
    // Both sides keep corresponding band roles, with individual interpretations.
    const whiteOrigin = piece.color === 'w' ? piece.origin : `${piece.origin[0]}${9 - Number(piece.origin[1])}`
    const role = roles[origins.indexOf(whiteOrigin as typeof origins[number])]
    const instrument = kit.instruments[piece.id]
    const effects = kit.effects[piece.id]
    const percussion = role < 8
    const bass = !percussion && families[role - 8] === 'bass'
    const harmony = !percussion && families[role - 8] === 'harmony'
    piece.active = piece.color === 'w'
    instrument.mask = undefined
    effects.gain = between(.85, 1.1)
    effects.pitch = 1 // Tuned voices must remain in the shared scale.
    effects.pan = between(-.18, .18)
    effects.delay = percussion || bass ? between(0, .08) : between(.05, .25)
    effects.reverb = bass ? between(.02, .08) : percussion ? between(.03, .14) : between(.12, .32)
    effects.decay = between(.08, .3)
    kit.mappings[piece.id] = {
      fileDegrees: pick([-1, -.5, .5, 1]), rankDegrees: pick([-.5, 0, .5, 1]),
      panWidth: between(.15, .6), previewFilter: random() > .25,
    }
    if (percussion) {
      const bank = SAMPLE_BANKS[0]
      const asset = bank.assets.find(a => a.id === assets[role])!
      Object.assign(instrument, {
        name: `${asset.name} · ${piece.origin}`, behavior: 'pulse', sound: 'sine',
        source: { kind: 'sample', bank: bank.id, asset: asset.id, variant: Math.floor(random() * asset.variants.length), pitched: false },
        notes: '0', phrases: undefined, groove: { groove: 'motorik', lane: lanes[role] },
        octave: 2, gain: between(role === 0 ? .45 : .2, role === 0 ? .62 : .35),
        attack: between(.001, .008), release: between(.03, .09), sustain: 1, clip: between(.8, 1),
        lpf: between(11000, 18000), hpf: role === 0 ? 0 : between(0, 100),
      })
      effects.pitch = between(.9, 1.1)
    } else {
      const family = families[role - 8]
      const recipe = pick(PATTERN_RECIPES.filter(r => r.family === family))
      const phrases = harmony ? [`${chords}/2`, `<${chords} [0,2,4]>/2`, `${chords}/4`]
        : [recipe.notes, pick(['0 ~ [2 4] ~', '~ 0 [4 2] [~ 3]', '<[0 2 ~ 4] [4 ~ 2 0]>']), pick(['~ [4 3] 2 ~', '[0 ~] [2 0] ~ 4', '<[0 0 ~ 2] [4 ~ 3 2]>'])]
      Object.assign(instrument, recipe.instrument, {
        name: `${recipe.name} · ${piece.origin}`, behavior: harmony ? 'sustain' : 'phrase',
        source: { kind: 'synth' }, groove: undefined,
        sound: pick(bass ? ['sine', 'triangle', 'sawtooth'] as const : ['sine', 'triangle', 'square', 'sawtooth'] as const),
        notes: phrases[0], phrases, octave: bass ? 2 : harmony ? 3 : pick([4, 5]),
        gain: bass ? between(.3, .44) : harmony ? between(.12, .2) : between(.2, .3),
        attack: harmony ? between(.15, .55) : between(.005, .08),
        release: harmony ? between(.2, .65) : between(.04, .22),
        sustain: harmony ? between(.55, .8) : between(.2, .6),
        clip: harmony ? between(.8, .95) : between(.45, .85),
        lpf: bass ? between(700, 2000) : between(2000, 6500), hpf: bass ? 20 : between(60, 160),
      })
      // Occasionally use the tuned sample as a melodic voice, on any chess role.
      if (!bass && !harmony && random() > .6) {
        instrument.source = { kind: 'sample', bank: SAMPLE_BANKS[0].id, asset: 'bell', variant: pick([0, 1]), pitched: true }
        instrument.name = `Sino sequenciado · ${piece.origin}`
      }
    }
    instrument.automations = {
      gain: { kind: 'pattern', patterns: [`1 ${between(.5, .85)} ${between(.7, 1)} ${between(.5, .85)}`] },
      lpf: { kind: 'sine', min: Math.round(instrument.lpf * .65), max: instrument.lpf, cycles: pick([4, 8, 16]) },
      room: { kind: 'sine', min: effects.reverb * .5, max: effects.reverb, cycles: pick([8, 16, 32]) },
      delay: { kind: 'pattern', patterns: [`0 ${effects.delay} 0 ${effects.delay}`] },
    }
  }
  return creativeSchema.parse(kit)
}
