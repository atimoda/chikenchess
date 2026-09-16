import type { StyleProfile } from './types'
import { four } from './rhythms'

export const profile: StyleProfile = {
  name:'Rhein · laboratório motorik',
  bpm:118,
  root:'E',
  scale:'Dórica',
  bass:['0 . 0 0 4 . 0 3','0 0 . 4 0 . 6 4','0 . . . 4 . . .','0 0 4 0 3 2 0 .'],
  lead:['0 2 3 4 6 4 3 2','0 3 4 . 6 7 6 4','7 . 6 . 4 . 2 .','0 2 0 3 4 6 4 .'],
  drums:four,
  bassBars:1,
  leadBars:2,
  accentBars:1.5,
  swing:0,
  colors:['flute','strings','guitar'],
  sections:[16,16,8,16],
  reference:'Kraftwerk — Ruckzuck (1970); fase inicial experimental, anterior ao electro-pop',
  url:'https://en.wikipedia.org/wiki/Kraftwerk_(album)',
}
