import type { StyleProfile } from './types'

export const profile: StyleProfile = {
  name:'Subsolo · pulsação paulistana',
  bpm:138,
  root:'E',
  scale:'Menor natural',
  bass:['0 . 0 . 4 0 . 6','0 0 . 4 0 . 3 .','0 . . . 4 . . .','0 . 3 4 . 6 4 0'],
  lead:['0 . 3 . 4 . . 6','7 . 6 . 4 3 . 0','4 . . . 3 . . .','0 3 . 4 6 . 4 3'],
  drums:[[0,4,8,12],[4,12],[0,2,4,6,8,10,12,14],[7,15],[6,14],[1,6,11,14],[3,10],[0,3,6,8,11,14]],
  bassBars:1,
  leadBars:2,
  accentBars:1.5,
  swing:.04,
  colors:['brass','marimba','guitar'],
  sections:[16,16,8,4,16],
  reference:'Cena paulistana pré-Hell’s: Krawitz (1991), Mau Mau e techno importado. Hell’s abriu em 1994.',
  url:'https://www.ruidonametropole.com.br/',
}
