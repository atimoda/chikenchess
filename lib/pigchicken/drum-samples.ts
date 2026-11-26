// The Bateria's recorded kit (public/samples/chicken-drumkit-v1, from the CC0 Virtuosity Drums: see
// scripts/prepare-drumkit-recordings.py): which recording a hit plays. Pure choice, no sound: lib/pigchicken/
// drum-synth.ts loads the files and plays them, and falls back to its synthesized kit until they are ready.
//   layers: every piece has up to three strokes recorded at different strengths (0 soft, 1 medium, 2 hard), each
//     a little louder and brighter than the one before. A hit plays the layer nearest its strength, a touch louder
//     or softer by how far it is from it; two takes of each are played in turn so a repeated hit never sounds the same.
//   chimbal: closed, its own short strokes; with the pedal open, the half, three-quarter or wide open stroke by how
//     far it is open (the Chimbal aberto alone is the wide one).
import type { DrumPiece } from './drum-kit'

export const DRUM_BANK = 'chicken-drumkit-v1'
// the layers each recording has (by stem); every layer has TAKES takes, named `${stem}-${layer}-${take}`
const ALL = [0, 1, 2], CYM = [1, 2], ONE = [2]
export const DRUM_STEMS: Record<string, number[]> = {
  kick: ALL, snare: ALL, tom1: ALL, tom2: ALL, floor: ALL, hat: ALL,
  'hat-half': ONE, 'hat-34': ONE, 'hat-open': ONE,
  ride: CYM, bell: CYM, crash: CYM, splash: ONE, china: ONE,
}
export const TAKES = 2
// the strength each layer was recorded at (the hit's own `vel`, 0..1)
const LAYER_VEL = [0.3, 0.6, 0.92]
// the pedal from which the Chimbal sounds three-quarters and wide open
const HAT_34 = 0.45, HAT_WIDE = 0.8

/** Every file of the recorded kit, without its extension (what to load). */
export const drumFiles = () => Object.entries(DRUM_STEMS).flatMap(([stem, layers]) => layers.flatMap(l => Array.from({ length: TAKES }, (_, k) => `${DRUM_BANK}/${stem}-${l}-${k}`)))

/** The recording a piece plays: by the Chimbal's pedal (`open`, 0..1; the Chimbal aberto is wide open). */
export function drumStem(piece: DrumPiece, open = 0): string {
  if (piece === 'hatOpen') return 'hat-open'
  if (piece === 'hat' && open > 0.06) return open < HAT_34 ? 'hat-half' : open < HAT_WIDE ? 'hat-34' : 'hat-open'
  return piece
}

/**
 * Which file one hit plays and how: `file` (bank/stem-layer-take), `gain` (around 1: a touch louder or softer than
 * its layer, by how far the hit's strength is from it) and `dull` (0..1: how much a soft hit on a skin is darkened).
 * `turn`: the hit's number among the hits of that recording (the takes are played in turn); `light`: a stroke of the
 * Caixa's roll (the soft layer, whatever its strength).
 */
export function drumSampleOf(piece: DrumPiece, vel: number, open = 0, light = false, turn = 0): { file: string; gain: number; dull: number } {
  const stem = drumStem(piece, open), layers = DRUM_STEMS[stem] ?? ALL
  const v = Math.max(0.03, Math.min(1, vel))
  let layer = light ? layers[0] : layers[layers.length - 1]
  if (!light) for (const l of layers) if (Math.abs(LAYER_VEL[l] - v) < Math.abs(LAYER_VEL[layer] - v)) layer = l
  const gain = Math.max(0.35, Math.min(1.15, Math.pow(v / LAYER_VEL[layer], 0.8)))
  const cymbal = piece !== 'kick' && piece !== 'snare' && piece !== 'tom1' && piece !== 'tom2' && piece !== 'floor'
  return { file: `${DRUM_BANK}/${stem}-${layer}-${((turn % TAKES) + TAKES) % TAKES}`, gain, dull: cymbal ? 0 : Math.max(0, Math.min(1, (0.6 - v) / 0.5)) }
}
