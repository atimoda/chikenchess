import type { Behavior, Instrument } from './model'

export type PatternFamily = 'groove' | 'bass' | 'sequence' | 'harmony' | 'lead'
export type RecipeSound = 'sbd' | 'sine' | 'triangle' | 'square' | 'sawtooth' | 'supersaw' | 'white' | 'pink' | 'brown'
type RecipeInstrument = Partial<Omit<Pick<Instrument, 'sound' | 'octave' | 'gain' | 'attack' | 'release' | 'lpf' | 'hpf' | 'sustain' | 'clip'>, 'sound'>> & { sound?: RecipeSound }

export interface PatternRecipe {
  id: string
  name: string
  family: PatternFamily
  behavior: Behavior
  notes: string
  description: string
  study: string
  credit: string
  instrument?: RecipeInstrument
}

// These are compact adaptations for ChickenChess' scale-degree notation. The
// original Strudel studies and their authors stay documented in the catalog.
export const PATTERN_RECIPES: readonly PatternRecipe[] = [
  {
    id: 'elliptical-kick',
    name: 'Bumbo elíptico',
    family: 'groove',
    behavior: 'pulse',
    notes: '<[0 ~ 0 0] [0 ~ [0 0] 0]>',
    description: 'Pulso firme com uma variação curta no segundo ciclo.',
    study: 'Death By Elliptical Eye',
    credit: 'composição pilotredsun · script eefano',
    instrument: { sound: 'sbd', octave: 2, gain: 0.68, attack: 0.002, release: 0.045, lpf: 1100, hpf: 0, clip: 0.14 },
  },
  {
    id: 'elliptical-backbeat',
    name: 'Caixa elíptica',
    family: 'groove',
    behavior: 'pulse',
    notes: '<[~ 0 ~ 0] [~ 0 [~ 0] 0]>',
    description: 'Backbeat estável com resposta sincopada.',
    study: 'Death By Elliptical Eye',
    credit: 'composição pilotredsun · script eefano',
    instrument: { sound: 'white', octave: 3, gain: 0.34, attack: 0.002, release: 0.055, lpf: 6500, hpf: 1300, clip: 0.1 },
  },
  {
    id: 'elliptical-hats',
    name: 'Chimbal elíptico',
    family: 'groove',
    behavior: 'pulse',
    notes: '<[0 0 [0 0] 0] [0 [0 0] 0 [0 0]]>*2',
    description: 'Subdivisões alternadas que fazem o groove respirar.',
    study: 'Death By Elliptical Eye',
    credit: 'composição pilotredsun · script eefano',
    instrument: { sound: 'white', octave: 5, gain: 0.22, attack: 0.001, release: 0.025, lpf: 15000, hpf: 7000, clip: 0.05 },
  },
  {
    id: 'elliptical-bass',
    name: 'Baixo elíptico',
    family: 'bass',
    behavior: 'phrase',
    notes: '<[0 ~ ~ -1 2 ~ ~ -1] [0 0 3 ~ ~ 0 4 ~]>*2',
    description: 'Duas frases complementares com pausas antes das respostas.',
    study: 'Death By Elliptical Eye',
    credit: 'composição pilotredsun · script eefano',
    instrument: { sound: 'supersaw', octave: 2, gain: 0.46, attack: 0.04, release: 0.18, lpf: 1800, hpf: 25, sustain: 0.5, clip: 0.82 },
  },
  {
    id: 'bonespurs-harmony',
    name: 'Tríade móvel',
    family: 'harmony',
    behavior: 'sustain',
    notes: '<[-3,0] [-4,0] [-2,0]>/4',
    description: 'Intervalos longos que mudam devagar e sustentam outras vozes.',
    study: 'Bonespurs',
    credit: 'eefano',
    instrument: { sound: 'supersaw', octave: 3, gain: 0.25, attack: 0.35, release: 0.65, lpf: 1200, hpf: 60, sustain: 0.8, clip: 0.95 },
  },
  {
    id: 'bonespurs-sequence',
    name: 'Sequência ascendente',
    family: 'sequence',
    behavior: 'phrase',
    notes: '<0 2 5 0 3 -1 2 3 -1 -2 3 2>',
    description: 'Linha longa que contorna a tônica antes de recomeçar.',
    study: 'Bonespurs',
    credit: 'eefano',
    instrument: { sound: 'sine', octave: 4, gain: 0.3, attack: 0.02, release: 0.12, lpf: 4200, hpf: 100, clip: 0.72 },
  },
  {
    id: 'bennington-bass',
    name: 'Baixo oitenta',
    family: 'bass',
    behavior: 'phrase',
    notes: '<[7 7 [4 6] 7] [9 9 [6 7] 11] [~ 9 12 12]>*2',
    description: 'Frases por seção com pequenas antecipações e saltos.',
    study: 'Bennington',
    credit: 'composição John Maus · script eefano',
    instrument: { sound: 'sawtooth', octave: 1, gain: 0.5, attack: 0.008, release: 0.08, lpf: 650, hpf: 25, sustain: 0.25, clip: 0.9 },
  },
  {
    id: 'bennington-pad',
    name: 'Pad quente',
    family: 'harmony',
    behavior: 'sustain',
    notes: '<[2,4,6] [-3,-1,1] [5,7,9] [4,7,8]>/2',
    description: 'Acordes largos em quatro cores harmônicas.',
    study: 'Bennington',
    credit: 'composição John Maus · script eefano',
    instrument: { sound: 'supersaw', octave: 3, gain: 0.22, attack: 0.45, release: 0.7, lpf: 1500, hpf: 100, sustain: 0.75, clip: 0.95 },
  },
  {
    id: 'bennington-lead',
    name: 'Resposta melódica',
    family: 'lead',
    behavior: 'phrase',
    notes: '<[~ ~ 2 2] [3 4 [5 6] 7] [~ 4 3 4] [5 6 [7 8] ~]>*2',
    description: 'Melodia em pergunta e resposta, com espaço entre frases.',
    study: 'Bennington',
    credit: 'composição John Maus · script eefano',
    instrument: { sound: 'triangle', octave: 5, gain: 0.3, attack: 0.025, release: 0.16, lpf: 6000, hpf: 250, sustain: 0.2, clip: 0.78 },
  },
] as const

export function patternRecipe(id: string) {
  return PATTERN_RECIPES.find(recipe => recipe.id === id)
}
