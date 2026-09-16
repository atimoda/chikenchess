import type { StyleProfile } from './types'

export const profile: StyleProfile = {
  name:'Tokyo · mosaico de circuitos',
  bpm:112,
  root:'F#',
  scale:'Pentatônica maior',
  bass:['0 . . 2 . 3 . 4','0 . 3 . 4 . 2 .','0 . . . 2 . . .','0 2 . 4 . 3 2 .'],
  lead:['0 2 . 3 4 . 2 .','4 . 3 2 . 0 . 2','2 . . 4 . . 0 .','0 . 2 4 3 2 . 0'],
  drums:[[0,7,10],[4,13],[0,3,6,8,11,14],[5],[14],[3,9],[2,10],[1,4,7,12]],
  bassBars:2,
  leadBars:1.75,
  accentBars:1.25,
  swing:.04,
  colors:['marimba','keys','flute'],
  sections:[12,16,8,20],
  reference:'YMO — BGM (1981), antecedente da eletrônica japonesa experimental; não um hit de 1991',
  url:'https://www.sonymusic.co.jp/artist/YMO/discography/MHCL-10111',
}
