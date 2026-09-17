import type { StyleProfile } from './types'
import { broken } from './rhythms'

export const profile: StyleProfile = {
  name:'Metro · circuitos sincopados',
  bpm:126,
  root:'F',
  scale:'Menor natural',
  bass:['0 . . 0 . 4 0 6','0 7 . 0 3 . 4 .','0 . 0 . . . 4 .','0 . 6 4 3 2 . 0'],
  lead:['0 4 . 6 7 . 4 .','7 . 6 4 . 3 2 .','4 . . 3 . . 0 .','0 2 4 . 7 6 . 4'],
  drums:broken,
  bassBars:1,
  leadBars:2,
  accentBars:1.75,
  swing:0,
  colors:['marimba','strings','keys'],
  sections:[16,16,12,4,16],
  reference:"Model 500 — No UFO’s (1985)",
  url:'https://bleep.com/release/90436-model-500-no-ufos-remixes',
}
