import type { StyleProfile } from './types'
import { four } from './rhythms'

export const profile: StyleProfile = {
  name:'Salão · diálogo clássico',
  bpm:108,
  root:'C',
  scale:'Maior',
  bass:['0 . 4 . 0 . 4 .','0 . 4 . 2 . 4 .','0 . 2 . 4 . 2 .','0 2 4 2 0 . 4 .'],
  lead:['0 2 4 7 6 5 4 3','4 5 6 7 6 4 2 1','2 3 4 2 0 . 1 2','4 6 7 6 5 3 2 0'],
  drums:four,
  bassBars:2,
  leadBars:2,
  accentBars:3,
  swing:0,
  colors:['flute','strings','strings'],
  sections:[16,16,12,16],
  reference:'Mozart — Sinfonia K.338 (1780, composta em Salzburg): referência austríaca, não alegação de estreia em Viena',
  url:'https://kv.mozarteum.at/en/work/symphony-in-c-4426',
}
