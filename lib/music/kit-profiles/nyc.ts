import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const full = { active: [true, true, false, true] }
const chorus = { active: [false, true, false, true] }
const bridge = { active: [false, false, true, true], transpose: [0, 0, 2, 0] }

export const profile: StyleProfile = {
  name: 'Loft · disco de cordas', bpm: 116, root: 'A', scale: 'Dórica', harmony: 'cadence', swing: .08, sections: [16, 24, 8, 24],
  parts: [
    voice('bass', 'Baixo elétrico sincopado', jazz('pluck'), ['0 . 7 0 . 4 5 4','0 0 . 2 4 . 6 7','0 . 4 . 6 4 2 .','0 7 6 4 . 2 3 4'], { bars: 2, gain: .34, lpf: 2400, arrangement: full }),
    rhythm('Bumbo do Loft', electro('kick', 1), ['0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . . . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . . .'], { gain: .43, arrangement: full }),
    voice('harmony', 'Cordas Philadelphia', world('strings'), ['0 . . . 4 . . .','3 . . . 6 . . .','5 . . . 2 . . .','0 . 4 . 6 . 3 .'], { bars: 4, octave: 4, gain: .1, attack: .32, release: .65, arrangement: { active: [true, true, true, true] }, effects: { reverb: .24 } }),
    rhythm('Caixa aveludada', electro('snare', 1), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . 0 . 0 . . .','. . . . 0 . . . . . . . . . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .27, arrangement: full }),
    voice('response', 'Guitarra wah', world('guitar'), ['. 4 . . . 4 . 6 . . 4 . . 2 . .','. 4 . 6 . . 7 . 6 . . 4 . 2 . .','. . 2 . . . 4 . . . . . . . . .','. 6 . 7 . . 6 . 4 . . 2 . 4 . .'], { bars: 2, octave: 4, gain: .13, gate: .35, arrangement: chorus, effects: { pan: .32, delay: .06 } }),
    rhythm('Chimbal de dezesseis', electro('hat'), ['0 . 0 . 0 . 0 . 0 . 0 . 0 . 0 .','0 0 0 . 0 0 0 . 0 0 0 . 0 0 0 .','0 . 0 . 0 . 0 . . . . . . . . .','0 . 0 0 0 . 0 . 0 . 0 0 0 . 0 .'], { gain: .1, hpf: 7200, arrangement: full }),
    voice('melody', 'Metais de pista', jazz('brass'), ['4 . 6 7 . 6 4 2','7 6 . 4 2 . 0 .','4 . . 2 0 . 2 .','4 6 7 9 7 . 6 4'], { bars: 2, octave: 4, gain: .14, arrangement: chorus, effects: { reverb: .14 } }),
    rhythm('Conga de salão', world('conga', 0, false), ['. . . 0 . . 0 . . . 0 . . . 0 .','. 0 . . . 0 . 0 . . 0 . . 0 . 0','. . . 0 . . . . . . . . . . 0 .','. . 0 . . 0 . 0 . . . 0 . 0 . .'], { gain: .16, arrangement: { active: [true, true, false, true] } }),
    voice('harmony', 'Piano de salão', jazz('keys'), ['0,2,4 . . . 4,6,8 . . .','3,5,7 . . . 6,8,10 . . .','5,7,9 . . . 2,4,6 . . .','0,2,4 . 4,6,8 . 6,8,10 . 3,5,7 .'], { bars: 2, octave: 3, gain: .12, attack: .01, release: .2, arrangement: full }),
    rhythm('Chimbal aberto', electro('open-hat'), ['. . 0 . . . 0 . . . 0 . . . 0 .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . 0 . . . 0 . . . 0 . . . 0 .'], { gain: .09, release: .16, arrangement: chorus }),
    voice('melody', 'Flauta do terraço', world('flute'), ['. . 4 . 6 . . . 7','. 7 . 6 . 4 . 2','4 . . . 2 . . .','4 6 7 . 9 . 7 6'], { bars: 4, octave: 5, gain: .09, arrangement: bridge, effects: { delay: .15, reverb: .3 } }),
    rhythm('Palmas da pista', electro('clap'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . 0 . . . . 0 . . 0','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .13, arrangement: chorus }),
    voice('texture', 'Coro de madrugada', jazz('formant'), ['0 . . . . . . .','3 . . . . . . .','5 . . . . . . .','0 . . . 6 . . .'], { bars: 4, octave: 4, gain: .055, attack: .24, release: .5, lpf: 3600, arrangement: bridge, effects: { reverb: .34 } }),
    rhythm('Pandeiro disco', world('tambourine', 0, false), ['. 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0','. 0 . 0 . 0 0 0 . . 0 . 0 . 0 0 0','. . . . . . . . . 0 . 0 . 0 . 0','. 0 . 0 0 0 . 0 . 0 . 0 0 0 . 0'], { gain: .09, arrangement: chorus }),
    voice('response', 'Sintetizador luminoso', synth('triangle'), ['. . 7 . . . 6 .','. 9 . . 7 . . 6','. . . . 4 . . .','. 7 . 9 . 11 9 .'], { bars: 2, octave: 4, gain: .1, lpf: 4200, arrangement: bridge, effects: { delay: .2 } }),
    rhythm('Sino de virada', electro('bell', 1, true), ['. . . . . . . . . . . . . . . 0','. . . . . . . 0 . . . . . . . 0','. . . . 0 . . . . . . . . . . .','. . . . . . . 0 . . . . . . . 0'], { octave: 5, gain: .07, arrangement: bridge, effects: { reverb: .22 } }),
  ],
  reference: 'Chic — Dance, Dance, Dance (1977)',
  url: 'https://jameshamiltonsdiscopage.com/chart-archive/a-full-list-of-all-record-mirror-uk-disco-chart-entries-1975-1979/',
}
