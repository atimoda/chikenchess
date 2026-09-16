import type { StyleProfile } from './types'
import { broken } from './rhythms'

export const profile: StyleProfile = {
  name:'Da Seine · funk filtrado',
  bpm:111,
  root:'C',
  scale:'Blues menor',
  bass:['0 . 0 3 . 4 3 .','0 0 . 3 5 . 4 3','0 . . 3 . . 0 .','0 3 4 . 5 4 3 0'],
  lead:['0 . 3 4 . 3 1 .','5 4 3 . 1 0 . 3','3 . . . 1 . 0 .','0 1 3 4 5 . 4 3'],
  drums:broken,
  bassBars:1,
  leadBars:2,
  accentBars:1,
  swing:.08,
  colors:['guitar','keys','strings'],
  sections:[16,16,8,16],
  reference:'Daft Punk — Da Funk (1995)',
  url:'https://www.daftpunk.com/',
}
