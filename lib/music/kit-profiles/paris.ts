import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const loop = { active: [true, true, false, true] }
const filter = { active: [false, true, false, true] }
const breakSection = { active: [false, false, true, true], transpose: [0, 0, 2, 0] }

export const profile: StyleProfile = {
  name: 'Da Seine · funk filtrado', bpm: 111, root: 'C', scale: 'Blues menor', harmony: 'cadence', swing: .08, sections: [16, 24, 8, 24],
  parts: [
    voice('bass', 'Baixo French touch', jazz('pluck'), ['0 . 0 3 . 4 3 .','0 0 . 3 5 . 4 3','0 . . 3 . . 0 .','0 3 4 . 5 4 3 0'], { gain: .32, lpf: 1700, arrangement: loop, automations: { lpf: { kind: 'pattern', patterns: ['1200 1800','1500 3200','650 900','1100 2800'] } } }),
    rhythm('Bumbo comprimido', electro('kick', 1), ['0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . . .','0 . . . 0 . . . . . . . 0 . . .','0 . . . 0 . . . 0 . . . 0 . 0 .'], { gain: .48, clip: .75, arrangement: loop }),
    voice('harmony', 'Guitarra filtrada', world('guitar'), ['0 . 3 . . 4 . .','3 . 4 . . 5 . .','4 . . . 1 . . .','0 . 3 . 5 . 4 .'], { bars: 2, octave: 4, gain: .105, gate: .35, arrangement: loop, automations: { lpf: { kind: 'pattern', patterns: ['1400 2600','1800 5200','800 1200','1600 4800'] } }, effects: { pan: -.25 } }),
    rhythm('Caixa seca francesa', electro('snare'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . . . . 0 . 0 . . .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .25, arrangement: loop }),
    voice('harmony', 'Cordas sampleadas', world('strings'), ['0 . . . 3 . . .','4 . . . 5 . . .','1 . . . 4 . . .','0 . 3 . 5 . 4 .'], { bars: 4, octave: 4, gain: .07, attack: .3, release: .65, lpf: 3000, arrangement: { active: [true, true, true, true] }, effects: { reverb: .24 } }),
    rhythm('Chimbal filtrado', electro('hat', 1), ['. 0 . 0 . 0 . 0 . 0 . 0 . 0 . 0','. 0 . 0 0 0 . 0 . 0 . 0 0 0 . 0','. . . . . . . . . 0 . 0 . 0 . 0','. 0 0 0 . 0 . 0 . 0 0 0 . 0 . 0'], { gain: .09, arrangement: loop }),
    voice('melody', 'Lead Da Seine', synth('sawtooth'), ['0 . 3 4 . 3 1 .','5 4 3 . 1 0 . 3','3 . . . 1 . 0 .','0 1 3 4 5 . 4 3'], { bars: 2, octave: 4, gain: .1, lpf: 2200, arrangement: breakSection, effects: { delay: .18 } }),
    rhythm('Palma brilhante', electro('clap'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . 0 . . . . 0 . . 0','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .13, arrangement: filter }),
    voice('texture', 'Vocoder parisiense', jazz('formant'), ['0 . . . . . . .','3 . . . . . . .','5 . . . . . . .','0 . . . 4 . . .'], { bars: 4, octave: 4, gain: .045, attack: .28, release: .55, lpf: 2800, arrangement: breakSection, effects: { reverb: .28 } }),
    rhythm('Chimbal aberto', electro('open-hat'), ['. . 0 . . . 0 . . . 0 . . . 0 .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . 0 . . . . . . . . .','. . 0 . . . 0 . . . 0 . . . 0 .'], { gain: .09, release: .16, arrangement: filter }),
    voice('response', 'Teclas cromadas', jazz('keys'), ['. . 4 . . 3 . .','. 5 . . 4 . 3 .','. . . . 1 . . .','. 3 . 5 . 4 . 3'], { bars: 2, octave: 4, gain: .095, arrangement: filter, effects: { delay: .12 } }),
    rhythm('Rim funk', electro('rim'), ['. . . 0 . . . . . 0 . . . . 0 .','. 0 . . . . 0 . . . 0 . . 0 . .','. . . . . . . . . . 0 . . . . .','. . 0 . . . . 0 . . . 0 . . 0 .'], { gain: .09, arrangement: breakSection }),
    voice('melody', 'Marimba filtrada', world('marimba'), ['0 . 3 . 4 . . .','5 . 4 . 3 . 1 .','3 . . . 1 . . .','0 1 3 5 4 . 3 .'], { bars: 1.5, octave: 4, gain: .08, arrangement: { active: [true, false, true, false] } }),
    rhythm('Shaker de estúdio', electro('shaker'), ['. . 0 . . 0 . . . . 0 . . 0 . .','. 0 . 0 . . 0 . . 0 . 0 . . 0 .','. . . . . . . . . 0 . 0 . 0 . 0','. 0 . . 0 . 0 . . 0 . . 0 . 0 .'], { gain: .075, arrangement: filter }),
    voice('harmony', 'Pad analógico', synth('triangle'), ['0 . . . 3 . . .','4 . . . 5 . . .','1 . . . 4 . . .','0 . 3 . 5 . 4 .'], { bars: 4, octave: 3, gain: .05, attack: .4, release: .7, lpf: 1900, arrangement: breakSection, effects: { reverb: .3 } }),
    rhythm('Sino de transição', electro('bell', 1, true), ['. . . . . . . . . . . . . . . 0','. . . . . . . 0 . . . . . . . 0','. . . . 0 . . . . . . . . . . .','. . . . . . . 0 . . . . . . . 0'], { octave: 5, gain: .06, arrangement: breakSection, effects: { reverb: .18 } }),
  ],
  reference: 'Daft Punk — Da Funk (1995)',
  url: 'https://www.daftpunk.com/',
}
