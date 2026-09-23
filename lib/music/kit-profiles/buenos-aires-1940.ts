import { jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const full = { active: [true, true, true, true] }
const answer = { active: [false, true, false, true] }
const final = { active: [false, false, true, true] }

/** Original vals criollo sketch: bass on one, two chordal steps, reed call/answer. */
export const profile: StyleProfile = {
  name: 'Buenos Aires · vals de la tarde', bpm: 132, meter: '3/4', root: 'A', scale: 'Menor natural', harmony: 'cadence', swing: 0,
  sections: [12, 18, 12, 18],
  parts: [
    voice('bass', 'Contrabaixo do vals', world('guitar'), ['0 . . 4 . .','0 . . 3 . .','4 . . 2 . .','0 . . 4 . .'], { bars: 2, octave: 2, gain: .2, arrangement: full }),
    rhythm('Pulso de um', world('timpani'), ['0 . . . . .','0 . . . . .','0 . . . . .','0 . . . . .'], { gain: .1, release: .13, arrangement: full }),
    voice('harmony', 'Acorde no dois', jazz('keys'), ['. . 0,2,4 . . .','. . 2,4,6 . . .','. . 4,6,8 . . .','. . 0,2,4 . . .'], { bars: 1, octave: 3, gain: .12, attack: .015, release: .16, arrangement: full }),
    voice('harmony', 'Acorde no três', world('guitar'), ['. . . . 0,2,4 .','. . . . 2,4,6 .','. . . . 4,6,8 .','. . . . 0,2,4 .'], { bars: 1, octave: 3, gain: .11, release: .2, arrangement: full }),
    voice('melody', 'Palheta principal', jazz('reed'), ['0 . 2 3 4 .','4 . 5 4 2 .','6 . 5 4 3 .','2 3 4 . 0 .'], { bars: 2, octave: 4, gain: .105, gate: .8, arrangement: full, effects: { reverb: .24 } }),
    voice('response', 'Guitarra de resposta', world('guitar'), ['. . . . 4 .','. 5 . 4 . 2','. . . . 6 .','. 4 . 2 . 0'], { bars: 2, octave: 4, gain: .09, arrangement: answer, effects: { pan: .25 } }),
    voice('harmony', 'Cordas de fundo', world('strings'), ['0 . . . . .','2 . . . . .','4 . . . . .','0 . . . . .'], { bars: 2, octave: 4, gain: .065, attack: .2, release: .5, arrangement: full, effects: { reverb: .3 } }),
    rhythm('Escova leve', jazz('ride', 0, false), ['. 0 . 0 . 0','. 0 . 0 . 0','. . . 0 . 0','. 0 . 0 . 0'], { gain: .05, arrangement: answer }),
    voice('melody', 'Segunda palheta', jazz('reed', 1), ['. . 6 . 5 .','. 4 . 3 . 2','. . 7 . 6 .','. 5 . 4 . 2'], { bars: 2, octave: 4, gain: .065, arrangement: answer, effects: { pan: -.26 } }),
    voice('bass', 'Baixo de ligação', synth('triangle'), ['. . . . 4 5','. . . . 3 4','. . . . 2 3','. . . . 4 0'], { bars: 2, octave: 2, gain: .065, arrangement: answer }),
    voice('response', 'Frase de violino', world('strings'), ['. . . 4 5 6','. . 5 4 3 .','. . . 6 7 8','. . 4 3 2 0'], { bars: 2, octave: 5, gain: .07, arrangement: answer }),
    rhythm('Madeira no terceiro', world('conga', 0, false), ['. . . . 0 .','. . . . 0 .','. . . . 0 .','. . . . 0 .'], { gain: .055, arrangement: answer }),
    voice('texture', 'Ar de salão', synth('sine'), ['0 . . . . .','2 . . . . .','4 . . . . .','0 . . . . .'], { bars: 4, octave: 5, gain: .025, attack: .6, release: .8, arrangement: final }),
    voice('melody', 'Flauta sobre o vals', world('flute'), ['. . 7 . 6 .','. 8 . 7 . 5','. . 9 . 8 .','. 7 . 5 . 4'], { bars: 2, octave: 5, gain: .05, arrangement: final }),
    voice('response', 'Pizzicato', world('strings'), ['. . 0 . 2 .','. . 2 . 4 .','. . 4 . 6 .','. . 2 . 0 .'], { bars: 2, octave: 4, gain: .05, gate: .25, arrangement: final }),
    rhythm('Prato de chegada', world('crash', 0, false), ['0 . . . . .','0 . . . . .','0 . . . . .','0 . . . . .'], { gain: .04, arrangement: final }),
  ],
  reference: 'Vals criollo / tango-canción em Buenos Aires na década de 1940; composição original em três tempos.',
  url: 'https://www.argentina.gob.ar/node/431575',
}
