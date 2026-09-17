import type { StyleProfile } from './types'
import { four } from './rhythms'

export const profile: StyleProfile = {
  name:'Loft · disco de cordas',
  bpm:116,
  root:'A',
  scale:'Dórica',
  bass:['0 . 7 0 . 4 5 4','0 0 . 2 4 . 6 7','0 . 4 . 6 4 2 .','0 7 6 4 . 2 3 4'],
  lead:['4 . 6 7 . 6 4 2','7 6 . 4 2 . 0 .','4 . . 2 0 . 2 .','4 6 7 9 7 . 6 4'],
  drums:four,
  bassBars:2,
  leadBars:4,
  accentBars:1,
  swing:.08,
  colors:['brass','strings','guitar'],
  sections:[16,16,8,16],
  reference:'Chic — Dance, Dance, Dance (1977)',
  url:'https://jameshamiltonsdiscopage.com/chart-archive/a-full-list-of-all-record-mirror-uk-disco-chart-entries-1975-1979/',
}
