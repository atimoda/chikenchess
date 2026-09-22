import { rhythm, voice, world, jazz, synth, type StyleProfile } from './types'

const ensemble = { active: [true, true, true, true] }
const answer = { active: [false, true, false, true] }
const trio = { active: [false, false, true, true], transpose: [0, 0, 2, 0] }

export const profile: StyleProfile = {
  name: 'Salão · diálogo clássico', bpm: 108, root: 'C', scale: 'Maior', harmony: 'cadence', swing: 0, sections: [16, 20, 12, 20],
  parts: [
    voice('bass', 'Contrabaixos', world('strings'), ['0 . 4 . 0 . 4 .','0 . 4 . 2 . 4 .','0 . 2 . 4 . 2 .','0 2 4 2 0 . 4 .'], { bars: 2, octave: 2, gain: .11, attack: .12, release: .45, lpf: 1800, arrangement: ensemble }),
    voice('melody', 'Primeiros violinos', world('strings'), ['0 2 4 7 6 5 4 3','4 5 6 7 6 4 2 1','2 3 4 2 0 . 1 2','4 6 7 6 5 3 2 0'], { bars: 2, octave: 5, gain: .09, attack: .07, release: .3, lpf: 5200, arrangement: ensemble, effects: { pan: -.26, reverb: .28 } }),
    voice('harmony', 'Violas', world('strings'), ['0 . 2 . 4 . 2 .','2 . 4 . 6 . 4 .','4 . 2 . 0 . 2 .','0 . 4 . 6 . 3 .'], { bars: 2, octave: 3, gain: .075, attack: .18, release: .5, arrangement: ensemble, effects: { pan: -.12, reverb: .3 } }),
    voice('response', 'Oboé imaginário', jazz('reed'), ['. 2 . 4 . 3 . 2','. 4 . 6 . 5 . 4','. . 2 . . 3 . 4','. 6 . 5 . 4 . 2'], { bars: 2, octave: 4, gain: .075, arrangement: answer, effects: { reverb: .26 } }),
    voice('harmony', 'Violoncelos', world('strings'), ['0 . . . 4 . . .','2 . . . 4 . . .','4 . . . 2 . . .','0 . 4 . 2 . 0 .'], { bars: 2, octave: 3, gain: .09, attack: .15, release: .5, lpf: 2400, arrangement: ensemble, effects: { pan: .08, reverb: .29 } }),
    voice('melody', 'Flauta', world('flute'), ['0 . 4 . 7 . 6 .','4 . 6 . 8 . 7 .','2 . 4 . 6 . 4 .','4 6 7 . 6 4 2 .'], { bars: 2, octave: 5, gain: .07, arrangement: trio, effects: { pan: .22, reverb: .32 } }),
    voice('melody', 'Clarinetes', jazz('reed', 1), ['. 0 2 . 4 . 3 .','. 2 4 . 6 . 5 .','. 4 . 2 . 0 . 2','. 4 6 . 7 . 6 .'], { bars: 2, octave: 4, gain: .07, arrangement: answer, effects: { pan: -.18, reverb: .27 } }),
    voice('response', 'Fagote', jazz('baritone'), ['0 . . 2 . . 4 .','2 . . 4 . . 2 .','4 . . 2 . . 0 .','0 . 4 . 2 . 0 .'], { bars: 2, octave: 3, gain: .07, arrangement: trio, effects: { pan: .2, reverb: .24 } }),
    voice('harmony', 'Segundos violinos', world('strings'), ['4 . 2 . 0 . 2 .','6 . 4 . 2 . 4 .','2 . 0 . 4 . 2 .','4 . 6 . 5 . 3 .'], { bars: 2, octave: 4, gain: .075, attack: .12, release: .42, arrangement: ensemble, effects: { pan: .27, reverb: .28 } }),
    rhythm('Tímpanos', world('timpani', 0, true), ['0 . . . . . . . 4 . . . . . . .','0 . . . 4 . . . 0 . . . 4 . . .','0 . . . . . . . . . . . 4 . . .','0 . . . 4 . . . 0 . 4 . . . . .'], { octave: 2, gain: .12, release: .28, arrangement: { active: [true, true, false, true] }, effects: { reverb: .24 } }),
    voice('melody', 'Trompas', jazz('brass'), ['0 . 2 . 4 . . .','4 . 6 . 7 . . .','2 . . . 4 . . .','0 . 4 . 6 . 4 .'], { bars: 2, octave: 3, gain: .075, attack: .08, release: .35, arrangement: answer, effects: { reverb: .27 } }),
    voice('response', 'Pizzicato', world('strings'), ['0 . 2 . 4 . 2 .','2 . 4 . 6 . 4 .','4 . . 2 . . 0 .','0 2 4 . 2 0 . 4'], { bars: 1, octave: 4, gain: .065, attack: .004, release: .08, arrangement: trio, effects: { pan: -.3 } }),
    voice('texture', 'Órgão de salão', synth('triangle'), ['0 . . . . . . .','4 . . . . . . .','2 . . . . . . .','0 . . . 6 . . .'], { bars: 4, octave: 3, gain: .03, attack: .6, release: .9, lpf: 1800, arrangement: trio, effects: { reverb: .36 } }),
    voice('melody', 'Flautim', world('flute'), ['. . 7 . . 6 . 4','. 8 . 7 . 6 . 4','. . . . 9 . . .','. 7 9 . 8 7 6 .'], { bars: 2, octave: 6, gain: .04, arrangement: trio, effects: { reverb: .3 } }),
    voice('harmony', 'Metais graves', jazz('brass'), ['0 . . . 4 . . .','2 . . . 6 . . .','4 . . . 2 . . .','0 . 4 . 6 . 3 .'], { bars: 4, octave: 2, gain: .055, attack: .2, release: .55, lpf: 1600, arrangement: answer, effects: { reverb: .25 } }),
    rhythm('Pratos de cadência', world('crash', 0, false), ['0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .'], { gain: .06, release: .55, arrangement: answer, effects: { reverb: .35 } }),
  ],
  reference: 'Mozart — Sinfonia K.338 (1780, composta em Salzburg): referência austríaca, não alegação de estreia em Viena',
  url: 'https://kv.mozarteum.at/en/work/symphony-in-c-4426',
}
