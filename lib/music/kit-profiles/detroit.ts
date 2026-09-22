import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const core = { active: [true, true, true, true] }
const expansion = { active: [false, true, false, true] }
const space = { active: [false, false, true, true], transpose: [0, 0, 3, 0] }

export const profile: StyleProfile = {
  name: 'Metro · circuitos sincopados', bpm: 126, root: 'F', scale: 'Menor natural', harmony: 'circle', swing: 0, sections: [16, 20, 12, 20],
  parts: [
    rhythm('Bumbo sincopado', electro('kick'), ['0 . . . . . 0 . 0 . . 0 . . . .','0 . . . 0 . 0 . . . . 0 0 . . .','0 . . . . . . . 0 . . . . . . .','0 . . . 0 . 0 . 0 . . 0 . . 0 .'], { gain: .48, arrangement: core }),
    voice('texture', 'Atmosfera de fábrica', synth('brown'), ['0 . . . . . . .','4 . . . . . . .','6 . . . . . . .','0 . . . 7 . . .'], { bars: 4, octave: 2, gain: .045, attack: .7, release: .9, lpf: 980, arrangement: { active: [true, false, true, true], restart: false }, effects: { reverb: .28 } }),
    voice('bass', 'Baixo Model 500', synth('square'), ['0 . . 0 . 4 0 6','0 7 . 0 3 . 4 .','0 . 0 . . . 4 .','0 . 6 4 3 2 . 0'], { gain: .31, lpf: 820, distortion: .9, distortionMix: .12, arrangement: core, automations: { lpf: { kind: 'pattern', patterns: ['700 920','850 1300','460 700','760 1100'] } } }),
    rhythm('Caixa quebrada', electro('snare', 1), ['. . . . 0 . . . . . . . 0 . . 0','. . . . 0 . . . . 0 . . 0 . . .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . 0 . 0 . . 0'], { gain: .25, arrangement: core }),
    voice('harmony', 'Cordas futuristas', world('strings'), ['0 . . . 4 . . .','3 . . . 6 . . .','5 . . . 2 . . .','0 . 4 . 7 . 3 .'], { bars: 4, octave: 4, gain: .075, attack: .42, release: .7, lpf: 2500, arrangement: { active: [true, true, true, true] }, effects: { reverb: .32 } }),
    rhythm('Chimbal de circuito', electro('hat', 1), ['0 . 0 . . 0 0 . 0 . 0 . . 0 0 .','0 0 . 0 0 . 0 . 0 . 0 0 . 0 0 .','0 . . . 0 . . . 0 . . . 0 . . .','0 . 0 0 . 0 . 0 0 . 0 . . 0 0 .'], { gain: .09, hpf: 7800, arrangement: core }),
    voice('melody', 'Marimba cósmica', world('marimba'), ['0 4 . 6 7 . 4 .','7 . 6 4 . 3 2 .','4 . . 3 . . 0 .','0 2 4 . 7 6 . 4'], { bars: 2, octave: 4, gain: .12, arrangement: space, effects: { delay: .18, reverb: .2 } }),
    rhythm('Clap distante', electro('clap'), ['. . . . 0 . . . . . . . 0 . . .','. . . . 0 . . 0 . . . . 0 . . .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .1, arrangement: expansion, effects: { reverb: .18 } }),
    voice('response', 'Sinal de rádio', jazz('formant'), ['. . 4 . . . 6 .','. 7 . . 6 . . 4','. . . . 3 . . .','. 4 . 7 . 6 . 3'], { bars: 2, octave: 4, gain: .075, gate: .4, arrangement: space, effects: { delay: .22 } }),
    rhythm('Tom orbital', electro('tom'), ['. . . . . . 0 . . . . . 0 . . .','. . 0 . . . . . . . 0 . . . . .','. . . . 0 . . . . . . . . . . .','. . . 0 . . 0 . . . 0 . . . 0 .'], { gain: .15, lpf: 1600, arrangement: expansion }),
    voice('melody', 'Sequência cromada', synth('triangle'), ['0 . 2 . 4 . 6 .','7 . 6 . 4 . 3 .','4 . . . 2 . . .','0 2 4 7 6 4 3 .'], { bars: 1.5, octave: 4, gain: .09, lpf: 3400, arrangement: { active: [true, false, true, false] } }),
    rhythm('Rim assimétrico', electro('rim'), ['. . . 0 . . . . . 0 . . . . 0 .','. 0 . . . . 0 . . . 0 . . 0 . .','. . . . . . . . . . 0 . . . . .','. . 0 . . . . 0 . . . 0 . . 0 .'], { gain: .1, arrangement: space }),
    voice('harmony', 'Acorde de rádio', jazz('brass'), ['0 . . . 3 . . .','4 . . . 6 . . .','2 . . . 5 . . .','0 . 3 . 7 . 4 .'], { bars: 4, octave: 3, gain: .06, attack: .16, release: .5, lpf: 1700, arrangement: expansion }),
    rhythm('Pulso de dados', electro('bell', 0, true), ['. . . . . . . . 0 . . . . . . .','. . 0 . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . . . . .','. . . . . . 0 . . . . . . . 0 .'], { octave: 5, gain: .065, arrangement: space, effects: { reverb: .25 } }),
    voice('bass', 'Sub grave do túnel', synth('sine'), ['0 . . . . . . .','0 . . . 4 . . .','0 . . . . . . .','0 . 6 . 4 . 0 .'], { bars: 2, gain: .17, lpf: 360, arrangement: expansion }),
    rhythm('Ruído de válvula', synth('pink'), ['. 0 . . . 0 . . . 0 . . . 0 . .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . . . . 0 . 0 . 0 . 0','. 0 . 0 . . 0 . . 0 . 0 . . 0 .'], { octave: 6, gain: .028, attack: .001, release: .02, hpf: 9200, arrangement: expansion }),
  ],
  reference: "Model 500 — No UFO’s (1985)",
  url: 'https://bleep.com/release/90436-model-500-no-ufos-remixes',
}
