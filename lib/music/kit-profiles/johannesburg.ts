import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const groove = { active: [true, true, true, true] }
const street = { active: [false, true, false, true] }
const chant = { active: [false, false, true, true], transpose: [0, 0, 2, 0] }

export const profile: StyleProfile = {
  name: 'Jozi · kwaito desacelerado', bpm: 108, root: 'F#', scale: 'Pentatônica menor', harmony: 'cadence', swing: .1, sections: [16, 24, 8, 24],
  parts: [
    voice('bass', 'Baixo elástico de Jozi', synth('square'), ['0 . . 0 . 3 . 0','0 . 0 . 4 3 . 0','0 . . . 3 . . .','0 . 3 4 . 3 0 .'], { bars: 2, gain: .32, lpf: 720, distortion: .65, distortionMix: .1, arrangement: groove, lpfRange: { first: 420, second: 1050, frequency: 'note' } }),
    rhythm('Bumbo kwaito', electro('kick', 1), ['0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .','0 . . . 0 . . . . . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .'], { gain: .49, arrangement: groove }),
    voice('harmony', 'Piano township', jazz('keys'), ['0,2,4 . . . 3,5,7 . . .','0,2,4 . 3,5,7 . 4,6,8 . 3,5,7 .','4,6,8 . . . . . . .','0,2,4 . 4,6,8 . 3,5,7 . 0,2,4 .'], { bars: 2, octave: 3, gain: .13, attack: .006, release: .2, arrangement: groove }),
    rhythm('Caixa township', electro('snare'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . 0 . 0 . . .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .25, arrangement: groove }),
    voice('response', 'Guitarra mbaqanga', world('guitar'), ['. 4 . . . 3 . .','. 6 . 4 . 3 . 0','. . . . 7 . . .','. 3 . 4 . 6 . 4'], { bars: 2, octave: 4, gain: .105, gate: .36, arrangement: street, effects: { pan: -.28, delay: .1 } }),
    rhythm('Shaker de rua', electro('shaker'), ['. 0 . 0 . . 0 . . 0 . 0 . . 0 .','. 0 . 0 . 0 0 . . 0 . 0 . 0 0 .','. . . . . . . . . 0 . 0 . 0 . 0','. 0 0 . . 0 . 0 . 0 0 . . 0 . 0'], { gain: .09, arrangement: groove }),
    voice('melody', 'Marimba de Soweto', world('marimba'), ['0 . 3 . 4 . 3 .','4 . 6 . 4 . 3 .','7 . . . 4 . . .','0 3 4 . 6 4 3 .'], { bars: 2, octave: 4, gain: .11, arrangement: chant, effects: { delay: .14, reverb: .18 } }),
    rhythm('Conga em contratempo', world('conga', 0, false), ['. . . 0 . . 0 . . . 0 . . . 0 .','. 0 . . . 0 . 0 . . 0 . . 0 . 0','. . . . . . 0 . . . . . . . 0 .','. . 0 . . 0 . 0 . . . 0 . 0 . .'], { gain: .16, arrangement: street }),
    voice('texture', 'Coro de bairro', jazz('formant'), ['0 . . . . . . .','3 . . . . . . .','4 . . . . . . .','0 . . . 6 . . .'], { bars: 4, octave: 4, gain: .055, attack: .24, release: .55, lpf: 3400, arrangement: chant, effects: { reverb: .3 } }),
    rhythm('Chimbal aberto relaxado', electro('open-hat'), ['. . 0 . . . 0 . . . 0 . . . 0 .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . 0 . . . 0 . . . 0 . . . 0 .'], { gain: .09, release: .17, arrangement: street }),
    voice('melody', 'Voz de chamada', jazz('reed'), ['. . 4 . . . 3 .','. 6 . . 4 . 3 .','. . . . 0 . . .','. 3 . 4 . 6 . 4'], { bars: 2, octave: 4, gain: .08, arrangement: chant, effects: { delay: .2, reverb: .23 } }),
    rhythm('Palma comunitária', electro('clap'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . 0 . . . . 0 . . 0','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .13, arrangement: street }),
    voice('harmony', 'Cordas bubblegum', world('strings'), ['0 . . . 3 . . .','4 . . . 6 . . .','2 . . . 4 . . .','0 . 4 . 6 . 3 .'], { bars: 4, octave: 4, gain: .055, attack: .38, release: .68, lpf: 2500, arrangement: { active: [true, true, true, true] }, effects: { reverb: .28 } }),
    rhythm('Pandeiro township', world('tambourine', 0, false), ['. . 0 . . 0 . . . 0 . . 0 . . .','. 0 . 0 . . 0 . . 0 . 0 . . 0 .','. . . . . . . . . 0 . 0 . 0 . 0','. 0 . . 0 . 0 . . 0 . . 0 . 0 .'], { gain: .085, arrangement: street }),
    voice('response', 'Sintetizador de táxi', synth('triangle'), ['. 0 . . . 3 . .','. 4 . . 3 . 0 .','. . . . 6 . . .','. 3 . 4 . 6 . 3'], { bars: 1.5, octave: 4, gain: .085, lpf: 2800, arrangement: { active: [true, false, true, false] }, effects: { delay: .12 } }),
    rhythm('Sino de encontro', electro('bell', 0, true), ['. . . . . . . . 0 . . . . . . .','. . 0 . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . . . . .','. . . . . . 0 . . . . . . . 0 .'], { octave: 5, gain: .06, arrangement: chant, effects: { reverb: .2 } }),
  ],
  reference: 'Kwaito de Johannesburg/Soweto no início da democracia sul-africana: house desacelerado, piano, percussão e melodias locais',
  url: 'https://sahistory.org.za/article/history-kwaito-music',
}
