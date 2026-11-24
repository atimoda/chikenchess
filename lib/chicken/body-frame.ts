// The body frame of each character class (docs/mechanics/chicken/characters.md, "Hit-area"): the box that explosions,
// notes, cards, poops and the Filhote's notes hit, and where the health bar floats. In the rig's own units (the art's,
// feet at 0, x forward), multiplied by the engine's scale in the game. Saved with the central chicken configuration
// (config.ts, `frames`) and edited by the admin in the Vestiário. Pure.
import type { BirdSpecies } from './species'

export type FrameClass = 'chi' | 'pig' | 'ken' | 'baby'
export const FRAME_CLASSES: FrameClass[] = ['chi', 'pig', 'ken', 'baby']
export const FRAME_LABEL: Record<FrameClass, string> = { chi: 'Chi', pig: 'Pig', ken: 'Ken', baby: 'Kids' }
/** w: width; h: height (up from the feet); x: forward shift of the box's middle; y: lift of its bottom; bar: height of the health bar over the feet. */
export type BodyFrame = { w: number; h: number; x: number; y: number; bar: number }
// the poses that change the body's shape; a class's frame is its standing one, and each other pose may have its own
// (without one, it is the standing frame)
export type FramePose = 'stand' | 'crouch' | 'brood' | 'air' | 'seat' | 'cling'
export const FRAME_POSES: FramePose[] = ['stand', 'crouch', 'brood', 'air', 'seat', 'cling']
export const POSE_LABEL: Record<FramePose, string> = { stand: 'Em pé', crouch: 'Agachado', brood: 'Chocando', air: 'No ar', seat: 'Sentado', cling: 'Agarrado' }
export type ClassFrame = BodyFrame & { poses?: Partial<Record<Exclude<FramePose, 'stand'>, BodyFrame>> }
export type BodyFrames = Record<FrameClass, ClassFrame>

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

const obj = (v: unknown) => (v && typeof v === 'object' ? v as Record<string, unknown> : {})
function readFrame(into: BodyFrame, raw: Record<string, unknown>) {
  for (const { key, min, max } of FRAME_KEYS) {
    const v = raw[key]
    if (typeof v === 'number' && Number.isFinite(v)) into[key] = Math.round(Math.max(min, Math.min(max, v)))
  }
  return into
}
export function normalizeFrames(raw: unknown): BodyFrames {
  const out = defaultFrames()
  const src = obj(raw)
  for (const c of FRAME_CLASSES) {
    const f = obj(src[c])
    readFrame(out[c], f)
    const poses = obj(f.poses)
    for (const pose of FRAME_POSES) {
      if (pose === 'stand' || !poses[pose] || typeof poses[pose] !== 'object') continue
      ;(out[c].poses ??= {})[pose] = readFrame({ w: out[c].w, h: out[c].h, x: out[c].x, y: out[c].y, bar: out[c].bar }, obj(poses[pose]))
    }
  }
  return out
}

/** A class's frame in a pose: its own, or the standing one. */
export function frameFor(frames: BodyFrames, cls: FrameClass, pose: FramePose): BodyFrame {
  const c = frames[cls], own = pose === 'stand' ? undefined : c.poses?.[pose]
  return own ? { ...own } : { w: c.w, h: c.h, x: c.x, y: c.y, bar: c.bar }
}
/** Every class with every pose spelled out (a pose without its own frame shows the standing one): what changes, as the game sees it. */
export function effectiveFrames(frames: BodyFrames) {
  return Object.fromEntries(FRAME_CLASSES.map(c => [c, { ...frameFor(frames, c, 'stand'), poses: Object.fromEntries(FRAME_POSES.filter(p => p !== 'stand').map(p => [p, frameFor(frames, c, p)])) }]))
}
/** The same frames with `cls`'s `pose` set to `f` (or, null, back to the standing one). */
export function withFrame(frames: BodyFrames, cls: FrameClass, pose: FramePose, f: BodyFrame | null): BodyFrames {
  const c = frames[cls]
  if (pose === 'stand') return { ...frames, [cls]: { ...c, ...(f ?? defaultFrames()[cls]), poses: c.poses } }
  const poses = { ...c.poses }
  if (f) poses[pose] = f; else delete poses[pose]
  return { ...frames, [cls]: { ...c, poses: Object.keys(poses).length ? poses : undefined } }
}
/** The pose of an engine's state (getMotionState): on a wall or a ceiling she is clinging, whatever she does there. */
export function poseOf(state: string, grounded: boolean, angle = 0): FramePose {
  if (state === 'cling' || Math.abs(angle) > 0.05) return 'cling'
  if (state === 'seat') return 'seat'
  if (!grounded) return 'air'
  if (state === 'crouch' || state === 'slide') return 'crouch'
  if (state === 'brood' || state === 'shockingPrepare') return 'brood'
  return 'stand'
}

export const frameClassOf = (species: BirdSpecies | undefined): FrameClass => species === 'pig' ? 'pig' : species === 'fox' ? 'ken' : species === 'chick' ? 'baby' : 'chi'

/** The box of a body with its feet at (x, y) (screen units, y down), facing `face` (1 right, -1 left), in `pose`; on a
 * surface turned `angle` (radians, a wall or the ceiling) the frame turns with her and the box holds it. */
export function bodyBox(frames: BodyFrames, species: BirdSpecies | undefined, x: number, y: number, scale: number, face: number, pose: FramePose = 'stand', angle = 0) {
  const f = frameFor(frames, frameClassOf(species), pose)
  const s = scale, dir = face < 0 ? -1 : 1
  if (Math.abs(angle) <= 0.05) {
    const cx = x + f.x * s * dir, b = y - f.y * s
    return { l: cx - f.w / 2 * s, r: cx + f.w / 2 * s, t: b - f.h * s, b }
  }
  // along the surface (t) and away from it (n, "up" for her)
  const tx = Math.cos(angle), ty = Math.sin(angle), nx = Math.sin(angle), ny = -Math.cos(angle)
  const xs = [], ys = []
  for (const a of [f.x * dir - f.w / 2, f.x * dir + f.w / 2]) for (const u of [f.y, f.y + f.h]) { xs.push(x + (tx * a + nx * u) * s); ys.push(y + (ty * a + ny * u) * s) }
  return { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) }
}
/** Where the health bar floats: `bar` away from her feet, along her "up" (which turns on a wall). */
export function barPoint(frames: BodyFrames, species: BirdSpecies | undefined, x: number, y: number, scale: number, pose: FramePose, angle = 0) {
  const bar = frameFor(frames, frameClassOf(species), pose).bar * scale
  return { x: x + Math.sin(angle) * bar, y: y - Math.cos(angle) * bar }
}
/** How tall her body is, in rig units, in the pose of an engine's state: the top of that pose's box. The engine
 * measures her by it against the hard walls and ceilings and in the narrow passages (`data-chicken-fit`), so a
 * smaller box crouching or brooding lets her through where standing does not. */
export function bodyHeight(frames: BodyFrames, species: BirdSpecies | undefined, state: string, grounded: boolean, angle = 0) {
  const f = frameFor(frames, frameClassOf(species), poseOf(state, grounded, angle))
  return Math.max(1, f.y + f.h)
}
