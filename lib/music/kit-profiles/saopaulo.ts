import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const floor = { active: [true, true, true, true] }
const percussion = { active: [false, true, false, true] }
const tunnel = { active: [false, false, true, true], transpose: [0, 0, 3, 0] }

export const profile: StyleProfile = {
  name: 'Subsolo · pulsação paulistana', bpm: 138, root: 'E', scale: 'Menor natural', harmony: 'circle', swing: .045, sections: [16, 20, 8, 20],
  parts: [
    rhythm('Bumbo de subsolo', electro('kick', 1), ['0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .','0 . . . 0 . . . . . . . 0 . . .','0 . . . 0 . . . 0 . 0 . 0 . 0 .'], { gain: .53, distortion: 1.2, distortionMix: .12, arrangement: floor }),
    rhythm('Conga paulistana', world('conga', 0, false), ['. . . 0 . . 0 . . . 0 . . . 0 .','. 0 . . . 0 . 0 . . 0 . . 0 . 0','. . . . . . 0 . . . . . . . 0 .','. . 0 . . 0 . 0 . . . 0 . 0 . .'], { gain: .15, arrangement: percussion }),
    voice('bass', 'Baixo de porão', synth('square'), ['0 . 0 . 4 0 . 6','0 0 . 4 0 . 3 .','0 . . . 4 . . .','0 . 3 4 . 6 4 0'], { gain: .32, lpf: 720, distortion: 1.8, distortionMix: .2, arrangement: floor, automations: { lpf: { kind: 'pattern', patterns: ['520 780','650 1100','360 580','580 920'] } } }),
    rhythm('Caixa subterrânea', electro('snare', 1), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . 0 . 0 . . .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . 0 . . 0 . . 0'], { gain: .28, arrangement: floor }),
    voice('harmony', 'Acordes de galpão', jazz('brass'), ['0 . . . 3 . . .','4 . . . 6 . . .','2 . . . 5 . . .','0 . 3 . 6 . 4 .'], { bars: 4, octave: 3, gain: .065, attack: .16, release: .45, lpf: 1700, arrangement: { active: [true, true, true, true] } }),
    rhythm('Chimbal veloz', electro('hat', 1), ['0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .','0 0 0 . 0 0 0 . 0 0 0 . 0 0 0 .','0 . . . 0 . . . 0 . . . 0 . . .','0 . 0 0 0 . 0 . 0 . 0 0 0 . 0 .'], { gain: .1, hpf: 7900, arrangement: floor }),
    voice('melody', 'Metais da madrugada', jazz('baritone'), ['0 . 3 . 4 . . 6','7 . 6 . 4 3 . 0','4 . . . 3 . . .','0 3 . 4 6 . 4 3'], { bars: 2, octave: 3, gain: .11, arrangement: tunnel, effects: { delay: .14, reverb: .16 } }),
    rhythm('Rim quebrado', electro('rim'), ['. . . 0 . . . . . 0 . . . . 0 .','. 0 . . . . 0 . . . 0 . . 0 . .','. . . . . . . . . . 0 . . . . .','. . 0 . . . . 0 . . . 0 . . 0 .'], { gain: .1, arrangement: tunnel }),
    voice('texture', 'Drone de concreto', synth('brown'), ['0 . . . . . . .','3 . . . . . . .','4 . . . . . . .','0 . . . 6 . . .'], { bars: 4, octave: 2, gain: .04, attack: .7, release: 1, lpf: 950, arrangement: tunnel, effects: { reverb: .23 } }),
    rhythm('Pandeiro sincopado', world('tambourine', 0, false), ['. . 0 . . 0 . . . 0 . . 0 . . .','. 0 . 0 . . 0 . . 0 . 0 . . 0 .','. . . . . . . . . 0 . 0 . 0 . 0','. 0 . . 0 . 0 . . 0 . . 0 . 0 .'], { gain: .085, arrangement: percussion }),
    voice('response', 'Guitarra processada', world('guitar'), ['. . 4 . . . 3 .','. 6 . . 4 . 3 .','. . . . 7 . . .','. 3 . 4 . 6 . 4'], { bars: 2, octave: 3, gain: .09, arrangement: percussion, effects: { delay: .18 } }),
    rhythm('Tom de virada', electro('tom'), ['. . . . . . 0 . . . . . . . 0 .','. . 0 . . . . . . . 0 . . . . .','. . . . 0 . . . . . . . . . . .','. . . 0 . . 0 . . . 0 . . . 0 .'], { gain: .16, lpf: 1600, arrangement: percussion }),
    voice('melody', 'Marimba de aço', world('marimba'), ['0 . 3 . 4 . . .','4 . 6 . 4 . 3 .','7 . . . 4 . . .','0 3 4 6 4 . 3 .'], { bars: 1.5, octave: 4, gain: .09, arrangement: { active: [true, false, true, false] } }),
    rhythm('Palma de pista', electro('clap'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . 0 . . . . 0 . . 0','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .12, arrangement: percussion }),
    voice('harmony', 'Cordas de fumaça', world('strings'), ['0 . . . 4 . . .','3 . . . 6 . . .','5 . . . 2 . . .','0 . 4 . 6 . 3 .'], { bars: 4, octave: 4, gain: .05, attack: .45, release: .75, lpf: 2100, arrangement: tunnel, effects: { reverb: .3 } }),
    rhythm('Crash da saída', world('crash', 0, false), ['0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .'], { gain: .075, release: .45, arrangement: tunnel }),
  ],
  reference: 'Cena paulistana pré-Hell’s: Krawitz (1991), Mau Mau e techno importado. Hell’s abriu em 1994.',
  url: 'https://www.ruidonametropole.com.br/',
}
