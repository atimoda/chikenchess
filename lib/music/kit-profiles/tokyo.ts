import { electro, jazz, rhythm, synth, voice, world, type StyleProfile } from './types'

const grid = { active: [true, true, true, true] }
const mosaic = { active: [false, true, false, true] }
const silence = { active: [false, false, true, true], transpose: [0, 0, 2, 0] }

export const profile: StyleProfile = {
  name: 'Tokyo · mosaico de circuitos', bpm: 112, root: 'F#', scale: 'Pentatônica maior', harmony: 'ascent', swing: .035, sections: [12, 16, 8, 20],
  parts: [
    voice('melody', 'Marimba digital', world('marimba'), ['0 2 . 3 4 . 2 .','4 . 3 2 . 0 . 2','2 . . 4 . . 0 .','0 . 2 4 3 2 . 0'], { bars: 1.75, octave: 4, gain: .11, arrangement: { active: [true, false, true, true] }, effects: { delay: .11 } }),
    rhythm('Bumbo assimétrico', electro('kick'), ['0 . . . . . . 0 . . 0 . . . . .','0 . . . 0 . . . . . 0 . . . . .','0 . . . . . . . 0 . . . . . . .','0 . . . . 0 . . 0 . . . 0 . . .'], { gain: .4, arrangement: grid }),
    voice('texture', 'Seno de vidro', synth('sine'), ['0 . . . . . . .','2 . . . . . . .','4 . . . . . . .','0 . . . 3 . . .'], { bars: 4, octave: 5, gain: .04, attack: .5, release: .8, lpf: 5400, arrangement: silence, effects: { reverb: .35 } }),
    rhythm('Caixa deslocada', electro('snare'), ['. . . . 0 . . . . . . . . 0 . .','. . . . 0 . . . . . . . 0 . . .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . 0 . . . . 0 .'], { gain: .22, arrangement: grid }),
    voice('harmony', 'Teclas FM', jazz('keys'), ['0 . . . 2 . . .','3 . . . 4 . . .','2 . . . 0 . . .','0 . 2 . 4 . 3 .'], { bars: 2, octave: 4, gain: .095, attack: .01, release: .28, arrangement: grid }),
    rhythm('Chimbal pontilhado', electro('hat', 1), ['0 . . 0 . . 0 . 0 . . 0 . . 0 .','0 . 0 . . 0 . 0 0 . . 0 . 0 . 0','0 . . . 0 . . . 0 . . . . . . .','0 0 . 0 . . 0 . 0 . 0 . . 0 . 0'], { gain: .085, arrangement: grid }),
    voice('response', 'Flauta granular', world('flute'), ['. . 4 . . 2 . .','. 4 . . 3 . 2 .','. . . . 0 . . .','. 2 . 4 . 3 . 0'], { bars: 2, octave: 5, gain: .08, arrangement: mosaic, effects: { delay: .23, reverb: .28 } }),
    rhythm('Bloco de madeira', electro('rim'), ['. . . 0 . . . . . 0 . . . . . .','. 0 . . . . 0 . . . 0 . . 0 . .','. . . . . . . . . . 0 . . . . .','. . 0 . . . . 0 . . . 0 . . 0 .'], { gain: .09, arrangement: mosaic }),
    voice('bass', 'Baixo compacto', synth('triangle'), ['0 . . 2 . 3 . 4','0 . 3 . 4 . 2 .','0 . . . 2 . . .','0 2 . 4 . 3 2 .'], { bars: 2, gain: .27, lpf: 1100, arrangement: grid }),
    rhythm('Tom sintético', electro('tom'), ['. . . . . . 0 . . . . . . 0 . .','. . 0 . . . . . . . 0 . . . . .','. . . . 0 . . . . . . . . . . .','. . . 0 . . . 0 . . . 0 . . . .'], { gain: .13, lpf: 1900, arrangement: mosaic }),
    voice('melody', 'Sino de circuito', electro('bell', 1, true), ['0 . 2 . 3 . . .','4 . 3 . 2 . 0 .','2 . . . 4 . . .','0 2 4 3 2 . 0 .'], { bars: 1.25, octave: 5, gain: .075, arrangement: silence, effects: { delay: .15, reverb: .22 } }),
    rhythm('Ruído picotado', synth('white'), ['. 0 . . . 0 . . . 0 . . . 0 . .','. . 0 . . . 0 . . . 0 . . . 0 .','. . . . . . . . . 0 . . . 0 . .','. 0 . 0 . . 0 . . 0 . 0 . . 0 .'], { octave: 6, gain: .026, attack: .001, release: .015, hpf: 10500, arrangement: mosaic }),
    voice('harmony', 'Cordas pixeladas', world('strings'), ['0 . . . 3 . . .','2 . . . 4 . . .','4 . . . 0 . . .','0 . 2 . 4 . 3 .'], { bars: 4, octave: 4, gain: .055, attack: .38, release: .7, lpf: 2400, arrangement: silence, effects: { reverb: .32 } }),
    rhythm('Palma mínima', electro('clap'), ['. . . . 0 . . . . . . . . . . .','. . . . 0 . . . . . . . 0 . . .','. . . . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . 0 . 0 .'], { gain: .08, arrangement: silence }),
    voice('response', 'Formante robótico', jazz('formant'), ['. . 2 . . . . .','. 4 . . 2 . . .','. . . . 4 . . .','. 2 . 4 . 3 . 2'], { bars: 2, octave: 4, gain: .06, gate: .32, arrangement: mosaic, effects: { delay: .19 } }),
    rhythm('Pulso de sincronismo', electro('bell', 0, true), ['. . . . . . . . 0 . . . . . . .','. . 0 . . . . . . . . . 0 . . .','. . . . 0 . . . . . . . . . . .','. . . . . . 0 . . . . . . . 0 .'], { octave: 6, gain: .05, arrangement: silence }),
  ],
  reference: 'YMO — BGM (1981), antecedente da eletrônica japonesa experimental; não um hit de 1991',
  url: 'https://www.sonymusic.co.jp/artist/YMO/discography/MHCL-10111',
}
