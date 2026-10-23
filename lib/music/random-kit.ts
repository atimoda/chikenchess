import type { CityData } from '../cities-data'
import { createCreativeSession, creativeSchema, ROOTS, SCALES, type CreativeSession } from './creative'
import { noteRoll } from './piano-roll'
import { beatsPerBar } from './meter'
import type { SectionType } from './arrangement'
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
  kit.meter = city.meter ?? '4/4'
  kit.name = `${city.name} · Experimento ${variation}`.slice(0, 80)
  kit.bpm = Math.max(60, Math.min(175, city.bpm + pick([-20, -12, -6, 0, 6, 12, 20])))
  kit.volume = between(.65, .8)
  kit.root = pick(ROOTS)
  // Preserve existing factory seeds; newly generated variations explore the full catalog.
  kit.scale = pick(variation === '01'
    ? ['Pentatônica menor', 'Pentatônica maior', 'Maior', 'Menor natural', 'Dórica', 'Mixolídia'] as const
    : Object.keys(SCALES) as Array<keyof typeof SCALES>)
  const sectionBars = pick([[4, 4, 4, 4], [2, 2, 4], [4, 4, 4, 4]])
  const sectionTypes: SectionType[] = sectionBars.length === 3 ? ['Intro', 'Verse', 'Chorus'] : ['Verse', 'Chorus', 'Bridge', 'Chorus']
  kit.arrangement = { sections: sectionBars.map((bars, index) => ({
    id: `section-${String.fromCharCode(97 + index)}`, label: sectionTypes[index], beats: bars * beatsPerBar(kit.meter),
  })) }

  // Seed data becomes explicit notes immediately; no runtime groove interpreter.
  const rhythmSets = [
    { kick: [0, 0, 0, 0], snare: [null, 0, null, 0], hat: Array(8).fill(0) },
    { kick: [0, null, null, 0, null, null, 0, null], snare: [null, null, 0, null, null, null, 0, 0], hat: [0, null, 0, null, 0, null, 0, 0] },
    { kick: [0, null, null, 0], snare: [null, null, 0, null], hat: [0, null, null, 0, 0, null, null, 0] },
    { kick: [0, 0, null, 0], snare: [null, 0, null, 0], hat: [null, 0, null, 0, null, 0, null, 0] },
  ]
  const feel = pick(rhythmSets)

  const assets = ['kick', 'snare', 'hat', 'clap', 'tom', 'open-hat', 'rim', 'shaker']
  const families = ['bass', 'bass', 'harmony', 'harmony', 'sequence', 'sequence', 'lead', 'lead'] as const
  const roles = shuffle(Array.from({ length: 16 }, (_, i) => i))
  const origins = kit.pieces.filter(p => p.color === 'w').map(p => p.origin).sort()
  const chords = pick([[0, 2, 4], [0, 3, 4], [-2, 0, 2]])

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
      const bank = SAMPLE_BANKS.find(b=>b.id==='chicken-electro-v1')!
      const asset = bank.assets.find(a => a.id === assets[role])!
      Object.assign(instrument, {
        name: `${asset.name} · ${piece.origin}`, behavior: 'pulse', sound: 'sine',
        source: { kind: 'sample', bank: bank.id, asset: asset.id, variant: Math.floor(random() * asset.variants.length), pitched: false },
        pianoRolls: Array.from({ length: 3 }, (_, bankIndex) => {
          const cells = role === 0 ? feel.kick : role === 1 ? feel.snare : role === 2 ? feel.hat : [null, 0, null, null, null, null, 0, null]
          const roll = noteRoll(cells, 1, .25)
          return { ...roll, notes: roll.notes.map(note => ({ ...note, velocity: between(.55, 1), ...(bankIndex === 2 ? { pan: between(.35, .65) } : {}) })) }
        }),
        octave: 2, gain: between(role === 0 ? .45 : .2, role === 0 ? .62 : .35),
        attack: between(.001, .008), release: between(.03, .09), sustain: 1, clip: between(.8, 1),
        lpf: between(11000, 18000), hpf: role === 0 ? 0 : between(0, 100),
      })
      effects.pitch = between(.9, 1.1)
    } else {
      const family = families[role - 8]
      const banks = harmony ? [[chords, null, chords, null], [chords, [0, 2, 4]], [chords]]
        : [[0, null, 2, 4, null, 0, 3, null], [0, 2, null, 4, 4, null, 2, 0], [null, 4, 3, 2, 0, null, 2, 0]]
      Object.assign(instrument, {
        name: `${family === 'bass' ? 'Baixo' : family === 'harmony' ? 'Acordes' : family === 'lead' ? 'Melodia' : 'Sequência'} · ${piece.origin}`, behavior: harmony ? 'sustain' : 'phrase',
        source: { kind: 'synth' },
        sound: pick(bass ? ['sine', 'triangle', 'sawtooth'] as const : ['sine', 'triangle', 'square', 'sawtooth'] as const),
        pianoRolls: banks.map(cells => { const roll = noteRoll(cells, harmony ? 2 : 1, harmony ? .95 : .7); return { ...roll, notes: roll.notes.map(note => ({ ...note, velocity: between(.55, 1) })) } }),
        octave: bass ? 2 : harmony ? 3 : pick([4, 5]),
        gain: bass ? between(.3, .44) : harmony ? between(.12, .2) : between(.2, .3),
        attack: harmony ? between(.15, .55) : between(.005, .08),
        release: harmony ? between(.2, .65) : between(.04, .22),
        sustain: harmony ? between(.55, .8) : between(.2, .6),
        clip: harmony ? between(.8, .95) : between(.45, .85),
        lpf: bass ? between(700, 2000) : between(2000, 6500), hpf: bass ? 20 : between(60, 160),
      })
      // Occasionally use the tuned sample as a melodic voice, on any chess role.
      if (!bass && !harmony && random() > .6) {
        instrument.source = { kind: 'sample', bank: 'chicken-electro-v1', asset: 'bell', variant: pick([0, 1]), pitched: true }
        instrument.name = `Sino sequenciado · ${piece.origin}`
      }
    }
    instrument.lpfRange = { first: Math.round(instrument.lpf * .65), second: instrument.lpf, frequency: 'note' }
    instrument.reverbRange = { first: effects.reverb * .5, second: effects.reverb, frequency: 'loop' }
    instrument.arrangement = { restart: false, sections: Object.fromEntries(kit.arrangement.sections.map((section, index) => [section.id, {
      variation: index % instrument.pianoRolls.length, transpose: 0, active: true,
    }])) }
  }
  return creativeSchema.parse(kit)
}
