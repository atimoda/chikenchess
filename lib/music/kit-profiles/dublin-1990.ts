import { jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const full = { active: [true, true, true, true] }
const answer = { active: [false, true, false, true] }
const lift = { active: [false, false, true, true] }

/** Original 6/8 tune: two dotted-quarter beats, six eighth-note cells per bar. */
export const profile: StyleProfile = {
  name: 'Dublin · rain on the quay', bpm: 96, meter: '6/8', root: 'D', scale: 'Maior', harmony: 'cadence', swing: 0,
  sections: [8, 12, 8, 12],
  parts: [
    voice('melody', 'Flauta do cais', world('flute'), ['0 1 2 4 3 1','2 3 4 6 4 2','4 5 6 8 6 4','2 1 0 4 2 0'], { bars: 1, octave: 5, gain: .13, gate: .75, arrangement: full, effects: { reverb: .23 } }),
    voice('bass', 'Baixo de dois pulsos', world('guitar'), ['0 . . 4 . .','0 . . 3 . .','4 . . 2 . .','0 . . 4 . .'], { bars: 1, octave: 2, gain: .17, arrangement: full }),
    rhythm('Batida no um', world('timpani'), ['0 . . . . .','0 . . . . .','0 . . . . .','0 . . . . .'], { gain: .075, release: .12, arrangement: full }),
    rhythm('Batida no quatro', world('conga', 0, false), ['. . . 0 . .','. . . 0 . .','. . . 0 . .','. . . 0 . .'], { gain: .12, arrangement: full }),
    voice('harmony', 'Guitarra arpejada', world('guitar'), ['0 . 2 4 . 2','2 . 4 6 . 4','4 . 6 8 . 6','0 . 2 4 . 2'], { bars: 1, octave: 3, gain: .095, gate: .45, arrangement: full, effects: { pan: -.2 } }),
    voice('response', 'Violino que responde', world('strings'), ['. . . . 4 .','. 4 5 6 5 4','. . . . 6 .','. 6 5 4 2 0'], { bars: 2, octave: 4, gain: .08, arrangement: answer }),
    rhythm('Shaker em seis', world('tambourine', 0, false), ['0 0 0 0 0 0','0 . 0 0 . 0','0 0 0 0 0 0','0 . 0 0 . 0'], { gain: .05, arrangement: full }),
    voice('harmony', 'Cordas abertas', world('strings'), ['0 . . 4 . .','2 . . 6 . .','4 . . 2 . .','0 . . 4 . .'], { bars: 2, octave: 4, gain: .06, attack: .3, release: .55, arrangement: answer }),
    voice('melody', 'Flauta baixa', world('flute'), ['. 4 . . 2 .','. 6 . . 4 .','. 8 . . 6 .','. 4 . . 0 .'], { bars: 2, octave: 4, gain: .055, arrangement: answer }),
    voice('response', 'Cordas de bordão', synth('triangle'), ['0 . . . . .','2 . . . . .','4 . . . . .','0 . . . . .'], { bars: 2, octave: 3, gain: .045, attack: .15, release: .45, arrangement: full }),
    voice('melody', 'Guitarra de volta', world('guitar'), ['. . 4 3 2 .','. . 6 5 4 .','. . 8 6 4 .','. . 4 2 0 .'], { bars: 2, octave: 4, gain: .07, arrangement: lift, effects: { pan: .2 } }),
    rhythm('Palma leve', jazz('snare', 0, false), ['. . . 0 . .','. . . 0 . .','. . . 0 . .','. . . 0 . .'], { gain: .035, arrangement: answer }),
    voice('texture', 'Vento do porto', synth('sine'), ['0 . . . . .','2 . . . . .','4 . . . . .','0 . . . . .'], { bars: 4, octave: 5, gain: .022, attack: .7, release: 1, arrangement: lift }),
    voice('response', 'Contracanto de palheta', jazz('reed'), ['. . . 4 . 2','. . . 6 . 4','. . . 8 . 6','. . . 4 . 0'], { bars: 2, octave: 4, gain: .055, arrangement: lift }),
    rhythm('Pandeiro de fecho', world('tambourine', 0, false), ['. . . . . 0','. . . . . 0','. . . . . 0','. . . . . 0'], { gain: .04, arrangement: answer }),
    voice('harmony', 'Piano discreto', jazz('keys'), ['0,2,4 . . . . .','2,4,6 . . . . .','4,6,8 . . . . .','0,2,4 . . . . .'], { bars: 2, octave: 3, gain: .045, arrangement: lift }),
  ],
  reference: 'Double jig irlandesa em 6/8; Dublin 1990 é uma ambientação para um arranjo original, não uma data de origem do gênero.',
  url: 'https://archive.comhaltas.ie/compositions/596',
}
