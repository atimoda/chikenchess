import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const drive = { active: [true, true, false, true] }
const rave = { active: [false, true, false, true] }
const breakdown = { active: [false, false, true, true], transpose: [0, 0, 2, 0] }

export const profile: StyleProfile = {
  name: 'Hacienda · ácido em espiral', bpm: 125, root: 'G', scale: 'Menor natural', harmony: 'circle', swing: .09, sections: [16, 24, 8, 24],
  parts: [
    rhythm('Bumbo Hacienda', electro('kick', 1), ['0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .','0 . . . 0 . . . . . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .'], { gain: .5, arrangement: drive }),
    voice('response', 'Amostra vocal Madchester', jazz('formant'), ['. . 4 . . . . .','. 7 . . 6 . . .','. . . . 3 . . .','. 4 . 7 . 6 4 .'], { bars: 2, octave: 4, gain: .1, gate: .35, arrangement: rave, effects: { delay: .17, reverb: .17 } }),
    voice('bass', 'Linha acid 303', synth('sawtooth'), ['0 0 7 . 0 3 4 0','0 7 0 6 . 4 3 0','0 . . 7 0 . 3 .','0 3 0 4 7 6 4 3'], { gain: .3, lpf: 760, distortion: 2.2, distortionMix: .23, arrangement: drive, automations: { lpf: { kind: 'pattern', patterns: ['420 780 1100 650','650 1200 1800 900','320 520','560 1000 1600 720'] }, patt: { kind: 'pattern', patterns: ['.12','.18','.08','.22'] } } }),
    rhythm('Caixa rave', electro('snare', 1), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . 0 . . . . 0 . . 0','. . . . 0 . . . . . . . . . . .','. . . . 0 . . . . . 0 . 0 . . 0'], { gain: .28, arrangement: drive }),
    voice('harmony', 'Piano da Haçienda', jazz('keys'), ['0,2,4 . . . 3,5,7 . . .','0,2,4 . 3,5,7 . 4,6,8 . 3,5,7 .','4,6,8 . . . . . . .','0,2,4 . 4,6,8 . 7,9,11 . 3,5,7 .'], { bars: 2, octave: 3, gain: .13, attack: .005, release: .17, arrangement: { active: [true, true, false, true] } }),
    rhythm('Chimbal baggy', electro('hat'), ['. 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0','. 0 . 0 0 . . 0 . 0 . 0 0 . . 0','. . . . . . . . . 0 . 0 . 0 . 0','. 0 0 . . 0 . 0 . 0 0 . . 0 . 0'], { gain: .1, arrangement: drive }),
    voice('melody', 'Lead de armazém', synth('square'), ['0 . . 3 4 . 6 .','7 . 6 4 . 3 . 0','4 . . . . 3 . .','0 3 4 6 7 . 4 .'], { bars: 2, octave: 4, gain: .11, lpf: 2100, arrangement: breakdown, effects: { delay: .21 } }),
    rhythm('Tom de virada', electro('tom'), ['. . . . . . 0 . . . . . . . 0 .','. . . . . . 0 . . . 0 . . . 0 .','. . . 0 . . . 0 . . . . . . . .','. . 0 . . 0 . . . . 0 . . 0 . .'], { gain: .15, lpf: 1900, arrangement: rave }),
    voice('texture', 'Névoa industrial', synth('supersaw'), ['0 . . . . . . .','3 . . . . . . .','4 . . . . . . .','0 . . . 7 . . .'], { bars: 4, octave: 3, gain: .045, attack: .5, release: .8, lpf: 1200, arrangement: breakdown, effects: { reverb: .32 } }),
    rhythm('Chimbal aberto rave', electro('open-hat'), ['. . 0 . . . 0 . . . 0 . . . 0 .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . 0 . . . 0 . . . 0 . . 0 0 .'], { gain: .1, release: .16, arrangement: rave }),
    voice('melody', 'Marimba fluorescente', world('marimba'), ['. . 4 . . 3 . .','. 6 . 7 . 4 . 3','. . . . 2 . . .','. 4 . 6 . 7 . 4'], { bars: 1.5, octave: 4, gain: .095, arrangement: rave, effects: { delay: .15 } }),
    rhythm('Palma de galpão', electro('clap'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . 0 . . . . 0 . . 0','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .13, arrangement: rave }),
    voice('harmony', 'Cordas ácidas', world('strings'), ['0 . . . 3 . . .','4 . . . 6 . . .','2 . . . 5 . . .','0 . 4 . 7 . 3 .'], { bars: 4, octave: 4, gain: .06, attack: .4, release: .7, lpf: 2200, arrangement: breakdown, effects: { reverb: .3 } }),
    rhythm('Rim sincopado', electro('rim'), ['. . . 0 . . . . . . 0 . . . . .','. . 0 . . . . 0 . . 0 . . . . 0','. . . . . . . . . . . . . . 0 .','. . . 0 . . 0 . . . 0 . . . 0 .'], { gain: .1, arrangement: breakdown }),
    voice('response', 'Guitarra baggy', world('guitar'), ['. 4 . . . . 3 .','. 6 . 4 . . 3 .','. . . . 7 . . .','. 3 . 4 . 6 . 4'], { bars: 2, octave: 3, gain: .1, arrangement: rave, effects: { delay: .12 } }),
    rhythm('Crash da virada', world('crash', 0, false), ['0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .','0 . . . . . . . . . . . . . . .'], { gain: .08, release: .45, arrangement: rave, effects: { reverb: .2 } }),
  ],
  reference: '808 State — Newbuild (1988)',
  url: 'https://808state.com/discogs/808pages/albpages/albnewbu/albnewbu2.htm',
}
