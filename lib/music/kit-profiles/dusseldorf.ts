import { electro, rhythm, synth, voice, world, type StyleProfile } from './types'

const always = { active: [true, true, true, true] }
const late = { active: [false, true, false, true] }
const feature = { active: [false, false, true, true], transpose: [0, 0, 2, 0] }

export const profile: StyleProfile = {
  name: 'Rhein · laboratório motorik', bpm: 118, root: 'E', scale: 'Dórica', harmony: 'ascent', swing: 0, sections: [16, 16, 8, 16],
  parts: [
    rhythm('Pulso motorik', electro('kick'), ['0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . 0 . 0 . . .','0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .'], { gain: .48, arrangement: always }),
    rhythm('Relógio metálico', electro('rim'), ['. . 0 . . . 0 . . . 0 . . . 0 .','. 0 . . . 0 . . . 0 . . . 0 . .','. . . . 0 . . . . . . . 0 . . .','. . 0 . . . 0 . . 0 . . . 0 . .'], { octave: 5, gain: .12, arrangement: late }),
    voice('bass', 'Baixo de laboratório', synth('sawtooth'), ['0 . 0 0 4 . 0 3','0 0 . 4 0 . 6 4','0 . . . 4 . . .','0 0 4 0 3 2 0 .'], { lpf: 1050, distortion: .8, distortionMix: .12, arrangement: always, automations: { lpf: { kind: 'pattern', patterns: ['900 1200','1100 1600','650 900','900 1400'] } } }),
    rhythm('Caixa seca', electro('snare'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . 0 . 0 . . .','. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .25, arrangement: always }),
    voice('harmony', 'Órgão de transistores', synth('triangle'), ['0 . . . 4 . . .','0 . 3 . 4 . 6 .','2 . . . 6 . . .','0 . 4 . 3 . 2 .'], { octave: 3, gain: .11, attack: .08, release: .22, lpf: 2700, arrangement: always }),
    rhythm('Chimbal mecânico', electro('hat'), ['0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .','0 0 0 . 0 0 0 . 0 0 0 . 0 0 0 .','0 . . . 0 . . . 0 . . . 0 . . .','0 . 0 0 0 . 0 . 0 . 0 0 0 . 0 .'], { gain: .11, hpf: 7600, arrangement: always }),
    voice('melody', 'Flauta processada', world('flute'), ['0 2 3 4 6 4 3 2','0 3 4 . 6 7 6 4','7 . 6 . 4 . 2 .','0 2 0 3 4 6 4 .'], { octave: 4, bars: 2, gain: .14, arrangement: feature, effects: { delay: .11, reverb: .2 } }),
    rhythm('Tom de bancada', electro('tom'), ['. . . . . . 0 . . . . . . . 0 .','. . 0 . . . . . . . 0 . . . . .','. . . . 0 . . . . . . . 0 . . .','. . . 0 . . 0 . . . . 0 . . 0 .'], { gain: .18, lpf: 1800, arrangement: late }),
    voice('texture', 'Faixa magnética', synth('brown'), ['0 . . . . . . .','2 . . . . . . .','4 . . . . . . .','0 . . . 6 . . .'], { octave: 2, gain: .055, attack: .5, release: .8, lpf: 1300, arrangement: { active: [true, false, true, true], restart: false }, effects: { reverb: .28 } }),
    rhythm('Chimbal aberto', electro('open-hat'), ['. . . . . . 0 . . . . . . 0 .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . . . . . 0 . . . . . . 0 .'], { gain: .09, release: .16, arrangement: late }),
    voice('response', 'Guitarra tratada', world('guitar'), ['. . 4 . . . 2 .','6 . . . 4 . . .','. . . . 7 . 6 .','. 2 . 4 . . 3 .'], { octave: 3, bars: 2, gain: .11, arrangement: late, effects: { delay: .18 } }),
    rhythm('Ruído chaveado', synth('white'), ['. 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0','. . 0 . . 0 . . . . 0 . . 0 . .','. . . 0 . . . 0 . . . 0 . . . 0','. 0 . . . 0 . . . 0 . . . 0 . .'], { octave: 6, gain: .035, attack: .001, release: .018, hpf: 9500, arrangement: feature }),
    voice('melody', 'Sequência de diodos', synth('square'), ['0 . 2 . 3 . 4 .','4 . 6 . 4 . 3 .','7 . . . 4 . . .','0 2 0 3 4 6 4 .'], { octave: 4, bars: 1.5, gain: .1, lpf: 1900, arrangement: { active: [true, false, true, false] } }),
    rhythm('Sinal de teste', electro('bell', 0, true), ['. . . . . . . . 0 . . . . . . .','. . 0 . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . . . . .','. . . . . . 0 . . . . . . . 0 .'], { octave: 5, gain: .08, arrangement: feature, effects: { reverb: .18 } }),
    voice('harmony', 'Cordas óticas', world('strings'), ['0 . . . 3 . . .','4 . . . 6 . . .','2 . . . 4 . . .','0 . 4 . 6 . 3 .'], { octave: 3, bars: 4, gain: .07, attack: .45, release: .7, lpf: 2100, arrangement: { active: [false, true, true, true] }, effects: { reverb: .26 } }),
    rhythm('Palma eletrônica', electro('clap'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . . 0','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .1, arrangement: feature }),
  ],
  reference: 'Kraftwerk — Ruckzuck (1970); fase inicial experimental, anterior ao electro-pop',
  url: 'https://en.wikipedia.org/wiki/Kraftwerk_(album)',
}
