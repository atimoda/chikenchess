import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const bed = { active: [true, true, true, true] }
const sunset = { active: [false, true, true, true] }
const peak = { active: [false, true, false, true] }

export const profile: StyleProfile = {
  name: 'Amnesia · horizonte balearic', bpm: 104, root: 'D', scale: 'Mixolídia', harmony: 'descent', swing: .12, sections: [24, 24, 12, 24],
  parts: [
    voice('texture', 'Maré de fita', synth('pink'), ['0 . . . . . . .','4 . . . . . . .','2 . . . . . . .','0 . . . 6 . . .'], { bars: 4, octave: 3, gain: .03, attack: .8, release: 1.1, lpf: 1800, arrangement: bed, effects: { reverb: .38 } }),
    rhythm('Bumbo balearic', electro('kick'), ['0 . . . . . . . 0 . . . . . . .','0 . . . 0 . . . 0 . . . 0 . . .','0 . . . . . . . 0 . . . . . . .','0 . . . 0 . . . 0 . . . 0 . . .'], { gain: .38, arrangement: bed }),
    voice('bass', 'Baixo morno', jazz('pluck'), ['0 . . 4 . . 6 .','0 . 2 . 4 . 2 .','0 . . . 4 . . .','0 . 4 6 . 4 2 .'], { bars: 2, gain: .27, lpf: 1900, arrangement: bed }),
    rhythm('Caixa com eco', electro('snare'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . . 0','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .2, arrangement: sunset, effects: { delay: .08, reverb: .12 } }),
    voice('harmony', 'Violão de enseada', world('guitar'), ['0 . . . 4 . . .','2 . . . 6 . . .','4 . . . 2 . . .','0 . 4 . 6 . 2 .'], { bars: 4, octave: 3, gain: .11, attack: .02, release: .35, lpf: 5200, arrangement: bed, effects: { pan: -.24, reverb: .2 } }),
    rhythm('Shaker de praia', electro('shaker'), ['. 0 . 0 . . 0 . . 0 . 0 . . 0 .','. 0 . 0 . 0 0 . . 0 . 0 . 0 0 .','. . 0 . . . . . . . 0 . . . . .','. 0 . 0 0 . 0 . . 0 . 0 0 . 0 .'], { gain: .09, arrangement: bed }),
    voice('melody', 'Flauta ao pôr do sol', world('flute'), ['0 . 2 4 . 6 4 .','7 . 6 . 4 2 . 0','4 . . . 2 . 0 .','0 2 . 4 6 . 7 .'], { bars: 4, octave: 5, gain: .11, arrangement: sunset, effects: { delay: .2, reverb: .32 } }),
    rhythm('Conga relaxada', world('conga', 0, false), ['. . . 0 . . . . . . 0 . . . 0 .','. 0 . . . . 0 . . 0 . . . 0 . .','. . . 0 . . . . . . . . . . . .','. . 0 . . . 0 . . . 0 . . 0 . .'], { gain: .15, arrangement: sunset }),
    voice('harmony', 'Cordas do horizonte', world('strings'), ['0 . . . . . 4 .','2 . . . . . 6 .','4 . . . . . 2 .','0 . . . 6 . 4 .'], { bars: 4, octave: 4, gain: .075, attack: .55, release: .9, lpf: 2600, arrangement: bed, effects: { reverb: .4 } }),
    rhythm('Chimbal aberto suave', electro('open-hat'), ['. . . . . . 0 . . . . . . . 0 .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . 0 . . . 0 . . . 0 . . . 0 .'], { gain: .075, release: .2, arrangement: peak }),
    voice('response', 'Marimba de água', world('marimba'), ['. . 4 . . 2 . .','. 6 . . 4 . 2 .','. . . . 7 . . .','. 4 . 6 . 7 . 4'], { bars: 2, octave: 4, gain: .1, arrangement: sunset, effects: { delay: .18, reverb: .22 } }),
    rhythm('Pandeiro solar', world('tambourine', 0, false), ['. . . 0 . . . 0 . . . 0 . . . 0','. . 0 . . 0 . 0 . . 0 . . 0 . 0','. . . . . . . . . . . 0 . . . .','. . 0 . 0 . . 0 . . 0 . 0 . . 0'], { gain: .085, arrangement: peak }),
    voice('melody', 'Teclas do terraço', jazz('keys'), ['. 2 . 4 . . 6 .','7 . . 6 . 4 . .','4 . . . 2 . . .','0 . 4 . 6 . 7 .'], { bars: 4, octave: 4, gain: .085, arrangement: peak, effects: { reverb: .18 } }),
    rhythm('Rim de madeira', electro('rim'), ['. . . . . . . 0 . . . . . . . 0','. . . 0 . . . . . . 0 . . . . .','. . . . . . . . . . . . . . 0 .','. . . 0 . . . 0 . . . 0 . . . .'], { gain: .075, arrangement: sunset }),
    voice('texture', 'Sopro distante', jazz('reed'), ['0 . . . . . . .','2 . . . . . . .','4 . . . . . . .','6 . . . . . . .'], { bars: 4, octave: 4, gain: .04, attack: .45, release: .8, lpf: 1900, arrangement: { active: [true, false, true, true], restart: false }, effects: { reverb: .42 } }),
    rhythm('Crash de chegada', world('crash', 0, false), ['0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .'], { gain: .07, release: .5, arrangement: { active: [false, true, true, true] }, effects: { reverb: .28 } }),
  ],
  reference: 'Art of Noise — Moments in Love (1983), repertório balearic de Alfredo',
  url: 'https://banbantonton.com/2023/07/14/looking-for-the-balearic-beat-soundtracking-paradise/',
}
