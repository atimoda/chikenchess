import { electro, jazz, rhythm, synth, voice, type StyleProfile } from './types'

const foundation = { active: [true, true, true, true] }
const lift = { active: [false, true, false, true] }
const breakOnly = { active: [false, false, true, true], transpose: [0, 0, -2, 0] }

export const profile: StyleProfile = {
  name: 'Warehouse · primeiras máquinas', bpm: 122, root: 'C', scale: 'Pentatônica menor', harmony: 'cadence', swing: .07, sections: [16, 24, 8, 24],
  parts: [
    rhythm('Bumbo 909', electro('kick', 1), ['0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . . . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .'], { gain: .5, arrangement: foundation }),
    voice('bass', 'Baixo ácido', synth('square'), ['0 . 0 2 . 3 0 .','0 0 . 3 4 . 3 2','0 . . 0 . . 3 .','0 . 2 3 0 4 . 3'], { gain: .32, lpf: 760, distortion: 1.4, distortionMix: .17, arrangement: foundation, lpfRange: { first: 400, second: 1500, frequency: 'note' }, pitchAttack: .1 }),
    voice('harmony', 'Piano Warehouse', jazz('keys'), ['0,2,4 . . . 3,5,7 . . .','0,2,4 . 3,5,7 . 4,6,8 . 3,5,7 .','4,6,8 . . . . . . .','0,2,4 . 3,5,7 . 4,6,8 . 6,8,10 .'], { bars: 2, octave: 3, gain: .14, attack: .005, release: .16, arrangement: { active: [true, true, false, true] } }),
    rhythm('Caixa 909', electro('snare', 1), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . 0 . 0 . . .','. . . . 0 . . . . . . . . . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .29, arrangement: foundation }),
    voice('melody', 'Voz recortada', jazz('formant'), ['. . 3 . . . 2 .','. 4 . 3 . . 0 .','. . . . 4 . . .','. 3 . 4 . 3 2 .'], { bars: 2, octave: 4, gain: .1, gate: .4, arrangement: lift, effects: { delay: .16, reverb: .18 } }),
    rhythm('Chimbal fechado', electro('hat', 1), ['. 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0','. 0 . 0 0 0 . 0 . 0 . 0 0 0 . 0','. . . . . . . . . 0 . 0 . 0 . 0','. 0 0 0 . 0 . 0 . 0 0 0 . 0 . 0'], { gain: .1, hpf: 7800, arrangement: foundation }),
    voice('response', 'Órgão triangular', synth('triangle'), ['. 2 . . . 3 . .','. . 4 . . 3 . .','. . . . 2 . . .','. 4 . 3 . 2 . 0'], { bars: 2, octave: 4, gain: .11, lpf: 3300, arrangement: lift, effects: { delay: .12 } }),
    rhythm('Palma de concreto', electro('clap'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . 0 . . . . 0 . . 0','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .14, arrangement: lift }),
    voice('texture', 'Pad de néon', synth('supersaw'), ['0 . . . . . . .','3 . . . . . . .','4 . . . . . . .','0 . . . 4 . . .'], { bars: 4, octave: 3, gain: .055, attack: .35, release: .7, lpf: 1500, arrangement: breakOnly, effects: { reverb: .27 } }),
    rhythm('Chimbal aberto', electro('open-hat'), ['. . 0 . . . 0 . . . 0 . . . 0 .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . 0 . . . 0 . . . 0 . . . 0 .'], { gain: .1, release: .17, arrangement: lift }),
    voice('bass', 'Sub grave redondo', synth('sine'), ['0 . . . . . 0 .','0 . . 3 . . 0 .','0 . . . . . . .','0 . 4 . 3 . 0 .'], { bars: 2, gain: .2, lpf: 420, arrangement: { active: [false, true, true, true] } }),
    rhythm('Rim sincopado', electro('rim'), ['. . . 0 . . . . . . 0 . . . . .','. . 0 . . . . 0 . . 0 . . . . 0','. . . . . . . . . . . . . . 0 .','. . . 0 . . 0 . . . 0 . . . 0 .'], { gain: .1, arrangement: breakOnly }),
    voice('melody', 'Lead de armazém', synth('sawtooth'), ['0 . 2 . 3 . . .','3 2 . 0 . 2 . 4','0 . . . . . 2 .','0 2 3 . 4 3 2 .'], { bars: 2, octave: 4, gain: .09, lpf: 1800, arrangement: breakOnly, effects: { delay: .2 } }),
    rhythm('Tom eletrônico', electro('tom'), ['. . . . . . . . . . . . . . 0 .','. . . . . . 0 . . . . . . . 0 .','. . . 0 . . . 0 . . . . . . . .','. . . . . 0 . . . . . 0 . . 0 .'], { gain: .13, lpf: 1700, arrangement: breakOnly }),
    voice('harmony', 'Acorde de fita', jazz('brass'), ['0 . . . 3 . . .','3 . . . 4 . . .','4 . . . . . . .','0 . 3 . 4 . 3 .'], { bars: 4, octave: 3, gain: .055, attack: .12, release: .45, lpf: 1900, arrangement: { active: [false, true, true, true] } }),
    rhythm('Shaker humano', electro('shaker'), ['. . 0 . . 0 . . . . 0 . . 0 . .','. 0 . 0 . . 0 . . 0 . 0 . . 0 .','. . . . . . . . . 0 . 0 . 0 . 0','. 0 . . 0 . 0 . . 0 . . 0 . 0 .'], { gain: .08, arrangement: lift }),
  ],
  reference: 'Jesse Saunders — On and On (1984)',
  url: 'https://iumag.co.uk/chicagos-jesse-saunders-released-the-first-house-record-in-1984-exclusive-interview/',
}
