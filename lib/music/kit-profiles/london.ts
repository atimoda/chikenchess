import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const breakbeat = { active: [true, true, false, true] }
const pressure = { active: [false, true, true, true] }
const drop = { active: [false, false, true, true], transpose: [0, 0, -2, 0] }

export const profile: StyleProfile = {
  name: 'Breaks · fragmentos da madrugada', bpm: 156, root: 'D', scale: 'Menor natural', harmony: 'descent', swing: .13, sections: [16, 24, 8, 24],
  parts: [
    rhythm('Bumbo breakbeat', electro('kick', 1), ['0 . . . . . 0 . 0 . 0 . . . . .','0 . . 0 . . 0 . 0 . . . 0 . . .','0 . . . . . . . 0 . . . . . . .','0 . . 0 . . 0 . 0 . . 0 . . 0 .'], { gain: .48, arrangement: breakbeat }),
    rhythm('Fantasma de caixa', electro('snare'), ['. . . . . . . . . . 0 . . . . 0','. . . . . 0 . . . . 0 . . . . 0','. . . . . . . . . . . . 0 . . .','. . . . . 0 . . . . 0 . . 0 . 0'], { gain: .12, arrangement: pressure }),
    voice('bass', 'Subgrave jungle', synth('sine'), ['0 . . 0 . 4 . .','0 . 7 . . 6 4 .','0 . . . 4 . . .','0 . 4 3 . 2 . 0'], { bars: 2, gain: .33, lpf: 380, release: .2, arrangement: { active: [true, true, true, true] }, effects: { gain: 1.1 } }),
    rhythm('Caixa principal cortada', electro('snare', 1), ['. . . . 0 . . . . . . . 0 . . 0','. . . . 0 . . 0 . . . . 0 . 0 .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . 0 . . 0 . 0 . . 0'], { gain: .29, arrangement: breakbeat }),
    voice('texture', 'Névoa dub', synth('brown'), ['0 . . . . . . .','4 . . . . . . .','6 . . . . . . .','0 . . . 7 . . .'], { bars: 4, octave: 2, gain: .04, attack: .7, release: 1, lpf: 1100, arrangement: drop, effects: { delay: .18, reverb: .28 } }),
    rhythm('Chimbal recortado', electro('hat', 1), ['0 . 0 . . 0 0 . 0 . 0 . . 0 0 .','0 0 . 0 0 . 0 . 0 . 0 0 . 0 0 .','0 . . . 0 . . . 0 . . . . . . .','0 . 0 0 . 0 . 0 0 . 0 . . 0 0 .'], { gain: .09, arrangement: breakbeat }),
    voice('melody', 'Rave stab', jazz('brass'), ['0 2 3 . 4 . 6 4','7 . 6 4 3 2 . 0','4 . . . 2 . . .','0 2 4 . 6 7 4 .'], { bars: 2, octave: 4, gain: .1, gate: .33, arrangement: drop, effects: { delay: .16, reverb: .12 } }),
    rhythm('Rim fantasma', electro('rim'), ['. . . 0 . . . . . 0 . . . . 0 .','. 0 . . . . 0 . . . 0 . . 0 . .','. . . . . . . . . . 0 . . . . .','. . 0 . . . . 0 . . . 0 . . 0 .'], { gain: .095, arrangement: pressure }),
    voice('harmony', 'Pad de warehouse', synth('supersaw'), ['0 . . . 4 . . .','3 . . . 6 . . .','5 . . . 2 . . .','0 . 4 . 7 . 3 .'], { bars: 4, octave: 3, gain: .055, attack: .45, release: .75, lpf: 1450, arrangement: pressure, effects: { reverb: .26 } }),
    rhythm('Chimbal aberto quebrado', electro('open-hat'), ['. . . . . . 0 . . . . . . . 0 .','. . 0 . . . . . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . 0 . . . 0 . . . . . . 0 . .'], { gain: .1, release: .14, arrangement: pressure }),
    voice('response', 'Vocal de pirata', jazz('formant'), ['. . 4 . . . 6 .','. 7 . . 6 . . 4','. . . . 3 . . .','. 4 . 7 . 6 . 3'], { bars: 2, octave: 4, gain: .085, gate: .3, arrangement: pressure, effects: { delay: .24 } }),
    rhythm('Tom de break', electro('tom'), ['. . . . . . 0 . . . . . . 0 . .','. . 0 . . . . . . . 0 . . . . .','. . . . 0 . . . . . . . . . . .','. . . 0 . . 0 . . . 0 . . . 0 .'], { gain: .15, lpf: 1700, arrangement: pressure }),
    voice('melody', 'Reed noturno', jazz('reed'), ['. . 3 . 4 . . 6 .','. 7 . 6 . 4 . 3','. . . . 2 . . .','. 3 . 4 . 6 . 4'], { bars: 2, octave: 4, gain: .075, arrangement: drop, effects: { delay: .21, reverb: .2 } }),
    rhythm('Shaker acelerado', electro('shaker'), ['. 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0','. 0 0 . 0 . 0 0 . 0 . 0 0 . 0 . 0','. . . . . . . . . 0 . 0 . 0 . 0','. 0 . 0 0 . 0 . . 0 . 0 0 . 0 .'], { gain: .075, arrangement: pressure }),
    voice('harmony', 'Cordas de amanhecer', world('strings'), ['0 . . . . . 4 .','3 . . . . . 6 .','5 . . . . . 2 .','0 . . . 7 . 4 .'], { bars: 4, octave: 4, gain: .05, attack: .4, release: .7, arrangement: drop, effects: { reverb: .32 } }),
    rhythm('Crash do drop', world('crash', 0, false), ['0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .'], { gain: .08, release: .45, arrangement: drop, effects: { reverb: .2 } }),
  ],
  reference: 'The Prodigy — Experience (1992), rave/breakbeat na transição para jungle',
  url: 'https://shop.xlrecordings.com/release/346455-the-prodigy-experience',
}
