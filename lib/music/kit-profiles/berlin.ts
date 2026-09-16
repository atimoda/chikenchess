import type { StyleProfile } from './types'

export const profile: StyleProfile = {
  name:'Tresor · concreto e aço',
  bpm:136,
  root:'C',
  scale:'Phrygian',
  bass:['0 . 0 . 1 . 0 .','0 0 . 1 0 . 4 .','0 . . . 1 . . .','0 1 0 . 4 1 0 .'],
  lead:['0 . 1 . 4 . . .','4 1 . 0 . 1 4 .','1 . . . . . 0 .','0 1 4 . 1 0 . 4'],
  drums:[[0,4,8,12],[4,12],[0,2,4,6,8,10,12,14],[3,15],[6,14],[7,11,15],[2,9],[0,3,6,9,12,15]],
  bassBars:1,
  leadBars:1.75,
  accentBars:1.25,
  swing:0,
  colors:['brass','strings','marimba'],
  sections:[16,16,8,4,16],
  reference:'X-101 — Sonic Destroyer (1991)',
  url:'https://tresorberlin.com/release/tresor-001/',
}
