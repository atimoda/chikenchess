import type { StyleProfile } from './types'
import { four } from './rhythms'

export const profile: StyleProfile = {
  name:'Warehouse · primeiras máquinas',
  bpm:122,
  root:'C',
  scale:'Pentatônica menor',
  bass:['0 . 0 2 . 3 0 .','0 0 . 3 4 . 3 2','0 . . 0 . . 3 .','0 . 2 3 0 4 . 3'],
  lead:['0 . 2 . 3 . . .','3 2 . 0 . 2 . 4','0 . . . . . 2 .','0 2 3 . 4 3 2 .'],
  drums:four,
  bassBars:1,
  leadBars:2,
  accentBars:1.75,
  swing:.06,
  colors:['keys','formant','guitar'],
  sections:[16,16,8,8],
  reference:'Jesse Saunders — On and On (1984)',
  url:'https://iumag.co.uk/chicagos-jesse-saunders-released-the-first-house-record-in-1984-exclusive-interview/',
}
