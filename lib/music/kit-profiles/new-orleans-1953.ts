import { jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const full = { active: [true, true, true, true] }
const answer = { active: [false, true, false, true] }
const solo = { active: [false, false, true, true] }

/** Original slow blues: four dotted-quarter beats, grouped as 3+3+3+3 eighths. */
export const profile: StyleProfile = {
  name: 'New Orleans · midnight river', bpm: 76, meter: '12/8', root: 'C', scale: 'Pentatônica menor', harmony: 'cadence', swing: 0,
  sections: [16, 24, 16, 24],
  parts: [
    rhythm('Bumbo do rio', jazz('kick', 0, false), ['0 . . . . . 0 . . . . .','0 . . . . . 0 . . . . .','0 . . . . . . . . 0 . .','0 . . . . . 0 . . . . .'], { gain: .3, arrangement: full }),
    rhythm('Caixa em dois e quatro', jazz('snare', 0, false), ['. . . 0 . . . . . 0 . .','. . . 0 . . . . . 0 . .','. . . 0 . . . . . 0 . .','. . . 0 . . . . . 0 . .'], { gain: .16, arrangement: full }),
    rhythm('Ride ternário', jazz('ride', 0, false), ['0 . 0 0 . 0 0 . 0 0 . 0','0 . 0 0 . 0 0 . 0 0 . 0','0 . 0 0 . 0 0 . 0 0 . 0','0 . 0 0 . 0 0 . 0 0 . 0'], { gain: .08, arrangement: full }),
    voice('bass', 'Baixo lento', jazz('baritone'), ['0 . . . . . 4 . . . . .','0 . . 2 . . 4 . . 3 . .','4 . . . . . 2 . . . . .','0 . . 4 . . 3 . . 0 . .'], { bars: 2, octave: 2, gain: .18, arrangement: full }),
    voice('harmony', 'Piano que rola', jazz('keys'), ['0,2,4 . . 2,4,6 . . 0,2,4 . . 2,4,6 . .','0,2,4 . 4 2,4,6 . . 0,2,4 . 4 2,4,6 . .','4,6,8 . . 2,4,6 . . 4,6,8 . . 2,4,6 . .','0,2,4 . . 2,4,6 . . 0,2,4 . . 2,4,6 . .'], { bars: 1, octave: 3, gain: .11, release: .2, arrangement: full }),
    voice('melody', 'Guitarra da meia-noite', world('guitar'), ['0 . . 2 . . 3 . 4 3 . .','4 . . 3 . . 2 . . 0 . .','6 . . 5 . . 4 . 3 2 . .','0 . 2 3 . . 4 . 3 0 . .'], { bars: 1, octave: 4, gain: .11, gate: .8, arrangement: full, effects: { reverb: .24 } }),
    voice('response', 'Metal que responde', jazz('brass'), ['. . . . . . 4 . . . . .','. . . . . . 4 . . 3 . .','. . . . . . 6 . . 5 . .','. . . . . . 4 . 3 2 . .'], { bars: 2, octave: 4, gain: .075, arrangement: answer }),
    voice('harmony', 'Órgão de igreja', synth('triangle'), ['0 . . . . . . . . . . .','2 . . . . . . . . . . .','4 . . . . . . . . . . .','0 . . . . . . . . . . .'], { bars: 4, octave: 3, gain: .04, attack: .35, release: .7, arrangement: full }),
    voice('melody', 'Palheta do cais', jazz('reed'), ['. . . . . . 4 . 5 6 . .','. . . . . . 6 . 5 4 . .','. . . . . . 8 . 7 6 . .','. . . . . . 4 . 3 2 . .'], { bars: 2, octave: 4, gain: .075, arrangement: answer }),
    rhythm('Pandeiro fantasma', world('tambourine', 0, false), ['. . 0 . . 0 . . 0 . . 0','. . 0 . . 0 . . 0 . . 0','. . . . . 0 . . . . . 0','. . 0 . . 0 . . 0 . . 0'], { gain: .04, arrangement: answer }),
    voice('response', 'Guitarra de chamada', world('guitar'), ['. 0 . . 2 . . 3 . . . .','. 4 . . 3 . . 2 . . . .','. 6 . . 5 . . 4 . . . .','. 0 . . 4 . . 3 . . . .'], { bars: 2, octave: 4, gain: .07, arrangement: answer, effects: { pan: -.28 } }),
    voice('bass', 'Contrabaixo acústico', jazz('pluck'), ['0 . . . . . . . . . . .','2 . . . . . . . . . . .','4 . . . . . . . . . . .','0 . . . . . . . . . . .'], { bars: 2, octave: 2, gain: .07, arrangement: solo }),
    voice('texture', 'Ar quente', synth('sine'), ['0 . . . . . . . . . . .','2 . . . . . . . . . . .','4 . . . . . . . . . . .','0 . . . . . . . . . . .'], { bars: 4, octave: 5, gain: .02, attack: .8, release: 1, arrangement: solo }),
    voice('melody', 'Solo de trompete', jazz('brass'), ['. . . . . . 4 . . . . .','. . . . . . 6 . 5 4 . .','0 . . 2 . 3 4 . . 3 . .','4 . . 5 . 6 5 . . 3 . .'], { bars: 2, octave: 5, gain: .075, arrangement: solo }),
    rhythm('Virada de caixa', jazz('snare', 1, false), ['. . . . . . . . . . 0 .','. . . . . . . . . . 0 0','. . . . . . . . 0 . 0 0','. . . . . . . . . . 0 0'], { gain: .08, arrangement: solo }),
    voice('harmony', 'Cordas do amanhecer', world('strings'), ['0 . . . . . 4 . . . . .','2 . . . . . 6 . . . . .','4 . . . . . 2 . . . . .','0 . . . . . 4 . . . . .'], { bars: 4, octave: 4, gain: .04, attack: .4, release: .8, arrangement: solo }),
  ],
  reference: 'New Orleans rhythm-and-blues e slow blues em 12/8; 1953 ambienta a fase, com música original.',
  url: 'https://folkways-media.si.edu/docs/folkways/artwork/SFW40165.pdf',
}
