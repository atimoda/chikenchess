import { rhythm, voice, type ProfileSource, type StyleProfile } from './types'

const drum = (asset: string): ProfileSource => ({ kind: 'sample', bank: 'sambaReggae', asset, pitched: false })
const horn = (asset: 'trompete' | 'trombone'): ProfileSource => ({ kind: 'sample', bank: 'sambaReggae', asset, pitched: true })
const hits = (...positions: number[]) => Array.from({ length: 16 }, (_, index) => positions.includes(index) ? '0' : '.').join(' ')
const notes = (...events: [number, number][]) => Array.from({ length: 16 }, (_, index) => {
  const event = events.find(([position]) => position === index)
  return event ? String(event[1]) : '.'
}).join(' ')
const all = { active: [true, true, true, true] }
const full = { active: [false, true, false, true] }
const ornaments = { active: [false, true, true, true] }

// Slot order follows WHITE_SLOTS in styled-kits.ts: a1,a2,b1,b2,...,h1,h2.
// The two rooks carry trombones; the two knights carry trumpets.
export const profile: StyleProfile = {
  name: 'Salvador 1992 · Samba-reggae',
  meter: '4/4', bpm: 104, root: 'G', scale: 'Mixolídia', harmony: 'cadence', swing: 0,
  sections: [16, 32, 16, 32],
  reference: 'Estudo original de samba-reggae inspirado na energia coletiva e nas respostas percussivas de Nossa Gente (Avisa Lá), do Olodum. Não transcreve melodia, letra nem gravação.',
  url: 'https://olodum.com.br/banda-olodum/',
  parts: [
    voice('response', 'Trombone · chamada grave', horn('trombone'), [
      notes([0, 0], [7, 4], [12, 2]), notes([0, 0], [6, 4], [12, 2], [14, 0]),
      notes([0, 0], [12, 2]), notes([0, 0], [4, 2], [8, 4], [12, 2], [14, 0]),
    ], { octave: 3, gain: .09, gate: .62, attack: .018, release: .12, arrangement: full, effects: { pan: -.25, reverb: .1 } }),
    rhythm('Surdo fundo · primeiro pulso', drum('surdo-fundo'), [
      hits(0, 8), hits(0, 8), hits(0, 8), hits(0, 8, 15),
    ], { gain: .22, lpf: 560, arrangement: all, effects: { pan: -.08 } }),
    voice('melody', 'Trompete · chamada', horn('trompete'), [
      notes([2, 4], [6, 5], [10, 4]), notes([2, 4], [5, 5], [8, 6], [10, 4]),
      notes([2, 4], [10, 2]), notes([1, 4], [4, 5], [7, 6], [10, 4], [14, 2]),
    ], { octave: 4, gain: .075, gate: .55, attack: .012, release: .11, arrangement: full, effects: { pan: -.2, reverb: .12 } }),
    rhythm('Surdo meio · pulso alternado', drum('surdo-meio'), [
      hits(4, 12), hits(4, 12), hits(4, 12), hits(4, 12, 14),
    ], { gain: .17, lpf: 850, arrangement: all, effects: { pan: .12 } }),
    rhythm('Caixa · contratempo', drum('caixa'), [
      hits(4, 12), hits(4, 7, 12, 15), hits(4, 12), hits(4, 7, 12, 15),
    ], { gain: .095, hpf: 350, arrangement: all, effects: { pan: -.13 } }),
    rhythm('Pandeiro · resposta de platinelas', drum('pandeiro'), [
      hits(2, 10), hits(2, 6, 10, 14), hits(6, 14), hits(2, 6, 10, 14),
    ], { gain: .04, hpf: 1000, arrangement: ornaments, effects: { pan: .34 } }),
    rhythm('Repenique · comando e virada', drum('repinique'), [
      hits(7, 15), hits(3, 7, 11, 14, 15), hits(6, 7, 15), hits(3, 6, 7, 11, 13, 14, 15),
    ], { gain: .095, hpf: 250, arrangement: ornaments, effects: { pan: -.22 } }),
    rhythm('Agogô agudo · guia', drum('agogo-agudo'), [
      hits(2, 6, 10, 14), hits(2, 6, 10, 14), hits(2, 10, 14), hits(2, 5, 10, 14),
    ], { gain: .04, hpf: 1300, arrangement: all, effects: { pan: .24 } }),
    rhythm('Surdo viradeira · resposta', drum('surdo-viradeira'), [
      hits(15), hits(6, 7, 14, 15), hits(7, 15), hits(3, 6, 7, 11, 14, 15),
    ], { gain: .115, lpf: 1600, arrangement: ornaments, effects: { pan: .17 } }),
    rhythm('Chocalho · passagem', drum('chocalho'), [
      hits(0, 2, 4, 6, 8, 10, 12, 14), hits(0, 2, 4, 6, 8, 10, 12, 14),
      hits(2, 6, 10, 14), hits(0, 2, 4, 6, 8, 10, 12, 14),
    ], { gain: .025, hpf: 2500, arrangement: all, effects: { pan: -.38 } }),
    rhythm('Tarol · resposta seca', drum('tarol'), [
      hits(3, 11), hits(3, 6, 11, 14), hits(3, 11), hits(3, 6, 11, 13, 14),
    ], { gain: .055, hpf: 600, arrangement: full, effects: { pan: .2 } }),
    rhythm('Timbau · frase aberta', drum('timbau'), [
      hits(5, 13), hits(5, 9, 13), hits(5, 13, 15), hits(1, 5, 9, 13, 15),
    ], { gain: .065, hpf: 180, arrangement: ornaments, effects: { pan: -.32 } }),
    voice('response', 'Trompete · resposta', horn('trompete'), [
      notes([11, 2], [14, 0]), notes([9, 2], [12, 4], [14, 2]),
      notes([10, 2], [14, 0]), notes([8, 2], [11, 4], [13, 5], [15, 4]),
    ], { octave: 4, gain: .065, gate: .5, attack: .012, release: .1, arrangement: full, effects: { pan: .24, reverb: .12 } }),
    rhythm('Agogô grave · contraponto', drum('agogo-grave'), [
      hits(0, 8), hits(0, 7, 8), hits(0, 8), hits(0, 7, 8, 15),
    ], { gain: .043, hpf: 650, arrangement: all, effects: { pan: -.18 } }),
    voice('harmony', 'Trombone · fecho', horn('trombone'), [
      notes([12, 0]), notes([8, 4], [12, 2]), notes([12, 0]),
      notes([7, 4], [10, 2], [12, 0]),
    ], { bars: 1, octave: 3, gain: .07, gate: .52, attack: .018, release: .12, arrangement: full, effects: { pan: .26, reverb: .09 } }),
    rhythm('Surdo fundo · antecipação', drum('surdo-fundo'), [
      hits(11), hits(3, 11), hits(11), hits(3, 11, 14),
    ], { gain: .08, lpf: 600, arrangement: full, effects: { pan: .1 } }),
  ],
}
