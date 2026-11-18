// The body frame of each character class (docs/mechanics/chicken/characters.md, "Hit-area"): the box that explosions,
// notes, cards, poops and the Filhote's notes hit, and where the health bar floats. In the rig's own units (the art's,
// feet at 0, x forward), multiplied by the engine's scale in the game. Saved with the central chicken configuration
// (config.ts, `frames`) and edited by the admin in the Vestiário. Pure.
import type { BirdSpecies } from './species'

export type FrameClass = 'chi' | 'pig' | 'ken' | 'baby'
export const FRAME_CLASSES: FrameClass[] = ['chi', 'pig', 'ken', 'baby']
export const FRAME_LABEL: Record<FrameClass, string> = { chi: 'Chi', pig: 'Pig', ken: 'Ken', baby: 'Filhote' }
/** w: width; h: height (up from the feet); x: forward shift of the box's middle; y: lift of its bottom; bar: height of the health bar over the feet. */
export type BodyFrame = { w: number; h: number; x: number; y: number; bar: number }
export type BodyFrames = Record<FrameClass, BodyFrame>

// the boxes the game always used (90 × 200, the bar 240 over the feet); the Filhote's notes used 80 wide
const BASE: BodyFrame = { w: 90, h: 200, x: 0, y: 0, bar: 240 }
export const defaultFrames = (): BodyFrames => ({ chi: { ...BASE }, pig: { ...BASE }, ken: { ...BASE }, baby: { ...BASE, w: 80 } })

export const FRAME_KEYS: { key: keyof BodyFrame; label: string; min: number; max: number }[] = [
  { key: 'w', label: 'Largura', min: 10, max: 400 },
  { key: 'h', label: 'Altura', min: 10, max: 500 },
  { key: 'x', label: 'Deslocamento para a frente', min: -200, max: 200 },
  { key: 'y', label: 'Deslocamento para cima', min: -200, max: 200 },
  { key: 'bar', label: 'Altura da barra de vida', min: 0, max: 600 },
]

export function normalizeFrames(raw: unknown): BodyFrames {
  const out = defaultFrames()
  const src = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  for (const c of FRAME_CLASSES) {
    const f = src[c] && typeof src[c] === 'object' ? src[c] as Record<string, unknown> : {}
    for (const { key, min, max } of FRAME_KEYS) {
      const v = f[key]
      if (typeof v === 'number' && Number.isFinite(v)) out[c][key] = Math.round(Math.max(min, Math.min(max, v)))
    }
  }
  return out
}

export const frameClassOf = (species: BirdSpecies | undefined): FrameClass => species === 'pig' ? 'pig' : species === 'fox' ? 'ken' : species === 'chick' ? 'baby' : 'chi'

/** The box of a body standing with its feet at (x, y) (screen units, y down), facing `face` (1 right, -1 left). */
export function bodyBox(frames: BodyFrames, species: BirdSpecies | undefined, x: number, y: number, scale: number, face: number) {
  const f = frames[frameClassOf(species)]
  const cx = x + f.x * scale * (face < 0 ? -1 : 1), b = y - f.y * scale
  return { l: cx - f.w / 2 * scale, r: cx + f.w / 2 * scale, t: b - f.h * scale, b }
}
