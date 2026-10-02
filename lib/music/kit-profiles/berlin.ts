import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const pressure = { active: [true, true, true, true] }
const layer = { active: [false, true, false, true] }
const voidSection = { active: [false, false, true, true], transpose: [0, 0, -1, 0] }

export const profile: StyleProfile = {
  name: 'Tresor · concreto e aço', bpm: 136, root: 'C', scale: 'Phrygian', harmony: 'descent', swing: 0, sections: [16, 16, 8, 16],
  parts: [
    rhythm('Bumbo industrial', electro('kick', 1), ['0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .','0 . . . 0 . . . . . . . 0 . . .','0 . . . 0 . . . 0 . 0 . 0 . 0 .'], { gain: .54, clip: .72, distortion: 2.4, distortionMix: .2, arrangement: pressure }),
    voice('texture', 'Ventilação do bunker', synth('brown'), ['0 . . . . . . .','1 . . . . . . .','4 . . . . . . .','0 . . . 1 . . .'], { bars: 4, octave: 2, gain: .045, attack: .8, release: 1.1, lpf: 900, arrangement: { active: [true, false, true, true], restart: false }, effects: { reverb: .25 } }),
    voice('bass', 'Baixo de aço', synth('square'), ['0 . 0 . 1 . 0 .','0 0 . 1 0 . 4 .','0 . . . 1 . . .','0 1 0 . 4 1 0 .'], { gain: .33, lpf: 690, distortion: 3, distortionMix: .25, arrangement: pressure, lpfRange: { first: 320, second: 980, frequency: 'note' }, driveRange: { first: 1.5, second: 4, frequency: 'note' } }),
    rhythm('Caixa de chapa', electro('snare', 1), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . 0 . 0 . . .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . 0 . . 0 . . 0'], { gain: .3, hpf: 900, arrangement: pressure }),
    voice('harmony', 'Drone de concreto', synth('supersaw'), ['0 . . . 1 . . .','1 . . . 4 . . .','4 . . . 0 . . .','0 . 1 . 4 . 1 .'], { bars: 4, octave: 2, gain: .055, attack: .6, release: .8, lpf: 1050, distortion: 1.2, distortionMix: .15, arrangement: pressure, effects: { reverb: .2 } }),
    rhythm('Chimbal serrilhado', electro('hat', 1), ['0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .','0 0 0 . 0 0 0 . 0 0 0 . 0 0 0 .','0 . . . 0 . . . 0 . . . 0 . . .','0 . 0 0 0 . 0 . 0 . 0 0 0 . 0 .'], { gain: .105, hpf: 8200, arrangement: pressure }),
    voice('melody', 'Sirene do porão', jazz('brass'), ['0 . 1 . 4 . . .','4 1 . 0 . 1 4 .','1 . . . . . 0 .','0 1 4 . 1 0 . 4'], { bars: 1.75, octave: 4, gain: .1, gate: .42, arrangement: voidSection, effects: { delay: .2, reverb: .14 } }),
    rhythm('Tom de túnel', electro('tom'), ['. . . . . . 0 . . . . . . . 0 .','. . 0 . . . . . . . 0 . . . . .','. . . . 0 . . . . . . . . . . .','. . . 0 . . 0 . . . 0 . . . 0 .'], { gain: .18, lpf: 1300, distortion: 1, distortionMix: .12, arrangement: layer }),
    voice('response', 'Metal percussivo', electro('bell', 1, true), ['. . 4 . . . 1 .','. 6 . . 4 . . 1','. . . . 0 . . .','. 4 . 6 . 1 . 0'], { bars: 1.25, octave: 4, gain: .09, arrangement: layer, effects: { delay: .16, reverb: .19 } }),
    rhythm('Chimbal aberto agressivo', electro('open-hat'), ['. . 0 . . . 0 . . . 0 . . . 0 .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . 0 . . . 0 . . . 0 . . 0 0 .'], { gain: .1, release: .14, arrangement: layer }),
    voice('melody', 'Sequenciador Phrygian', synth('sawtooth'), ['0 . 1 . 4 . . .','4 . 1 . 0 . 1 .','1 . . . 4 . . .','0 1 4 1 0 . 4 .'], { bars: 1, octave: 4, gain: .08, lpf: 1500, distortion: .8, distortionMix: .12, arrangement: { active: [true, false, true, false] } }),
    rhythm('Rim de ferro', electro('rim'), ['. . 0 . . . . . . 0 . . . . 0 .','. . . 0 . . 0 . . . 0 . . . 0 .','. . . . . . . . . . . . . . 0 .','. . 0 . . 0 . . . . 0 . . 0 . .'], { gain: .11, arrangement: voidSection }),
    voice('texture', 'Cordas subterrâneas', world('strings'), ['0 . . . . . . .','1 . . . . . . .','4 . . . . . . .','0 . . . 4 . . .'], { bars: 4, octave: 3, gain: .045, attack: .5, release: .9, lpf: 1500, arrangement: voidSection, effects: { reverb: .31 } }),
    rhythm('Ruído de corrente', synth('white'), ['. 0 . . . 0 . . . 0 . . . 0 . .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . . . . 0 . 0 . 0 . 0','. 0 . 0 . . 0 . . 0 . 0 . . 0 .'], { octave: 6, gain: .032, attack: .001, release: .018, hpf: 9800, arrangement: layer }),
    voice('harmony', 'Órgão do bunker', synth('triangle'), ['0 . . . 1 . . .','4 . . . 1 . . .','1 . . . 0 . . .','0 . 4 . 1 . 0 .'], { bars: 2, octave: 3, gain: .055, lpf: 1800, arrangement: { active: [false, true, true, true] } }),
    rhythm('Crash metálico', world('crash', 0, false), ['0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .'], { gain: .07, release: .5, arrangement: layer, effects: { reverb: .17 } }),
  ],
  reference: 'X-101 — Sonic Destroyer (1991)',
  url: 'https://tresorberlin.com/release/tresor-001/',
}
