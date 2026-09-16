import type { StyleProfile } from './types'
import { four } from './rhythms'

export const profile: StyleProfile = {
  name:'Hacienda · ácido em espiral',
  bpm:125,
  root:'G',
  scale:'Menor natural',
  bass:['0 0 7 . 0 3 4 0','0 7 0 6 . 4 3 0','0 . . 7 0 . 3 .','0 3 0 4 7 6 4 3'],
  lead:['0 . . 3 4 . 6 .','7 . 6 4 . 3 . 0','4 . . . . 3 . .','0 3 4 6 7 . 4 .'],
  drums:four,
  bassBars:1,
  leadBars:2,
  accentBars:.75,
  swing:.09,
  colors:['formant','keys','marimba'],
  sections:[16,16,8,4,16],
  reference:'808 State — Newbuild (1988)',
  url:'https://808state.com/discogs/808pages/albpages/albnewbu/albnewbu2.htm',
}
