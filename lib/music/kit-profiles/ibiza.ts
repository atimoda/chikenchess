import type { StyleProfile } from './types'

export const profile: StyleProfile = {
  name:'Amnesia · horizonte balearic',
  bpm:104,
  root:'D',
  scale:'Mixolídia',
  bass:['0 . . 4 . . 6 .','0 . 2 . 4 . 2 .','0 . . . 4 . . .','0 . 4 6 . 4 2 .'],
  lead:['0 . 2 4 . 6 4 .','7 . 6 . 4 2 . 0','4 . . . 2 . 0 .','0 2 . 4 6 . 7 .'],
  drums:[[0,8],[4,12],[2,6,10,14],[7],[14],[3,7,10,15],[1,9],[0,3,6,10,13]],
  bassBars:2,
  leadBars:4,
  accentBars:1.5,
  swing:.12,
  colors:['flute','strings','guitar'],
  sections:[16,16,12,16],
  reference:'Art of Noise — Moments in Love (1983), repertório balearic de Alfredo',
  url:'https://banbantonton.com/2023/07/14/looking-for-the-balearic-beat-soundtracking-paradise/',
}
