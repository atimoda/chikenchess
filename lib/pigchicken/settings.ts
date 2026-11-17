// Parquinho (PigChicKen's creative mode) settings, saved in this browser.
import type { CameraMode } from './camera'
import { migrateLegacyBackpedal } from '../chicken/config'
import DEFAULTS_FILE from '../../data/pigchicken/default-patio.json'

export type ParquinhoSettings = {
  camera: CameraMode
  screens: number // world width in screens
  deadband: number // px the chicken moves from the centre before the follow camera moves
  lag: number // follow camera speed (1/s)
  lookAhead: number // px the follow camera shifts toward the side she faces (0 = centred on her)
  lookAheadSpeed: number // how fast that shift moves to the other side when she turns (1/s)
  aimRelease: number // seconds of a still mouse / aim stick before the arrows / left stick get the aim back (Infinity = never)
  keysAimRelease: number // a player with the mouse: seconds of a still mouse before the movement keys aim again (0 = never: the mouse keeps the aim)
  reticleDist: number // px from her shoulder to the reticle when aiming with a stick or the keys
  jumpShake: number // degrees the aim shakes on a jump (air jumps and wall jumps too), fading out
  superJumpShake: number // degrees the aim shakes on a super jump (crouch + jump)
  quantize: boolean // instruments land on the sixteenth grid
  debug: boolean // the debug readouts: the HUD line, the scenes' labels and the shaped floors' lines
}

// the settings as written in the code; the game's defaults are these with data/pigchicken/default-patio.json over
// them (its `camera`, which the Câmera de Mira panel writes with "Salvar no game")
const CODE_PARQUINHO: ParquinhoSettings = { camera: 'follow', screens: 4, deadband: 80, lag: 6, lookAhead: 140, lookAheadSpeed: 2.5, aimRelease: 0, keysAimRelease: 5, reticleDist: 200, jumpShake: 3, superJumpShake: 8, quantize: true, debug: false }

// the aim-release slider: 0..AIM_RELEASE_MAX seconds, and one step past it is "never" (Infinity)
export const AIM_RELEASE_MAX = 5
// the keys-aim slider for a player with the mouse: 0 (never) .. KEYS_AIM_RELEASE_MAX seconds
export const KEYS_AIM_RELEASE_MAX = 30

const STORE = 'pigchicken-parquinho-v1'

// `base` with what is valid in `saved` over it. file: the defaults file, which has neither the width nor Debug
function readParquinho(base: ParquinhoSettings, saved: unknown, file = false): ParquinhoSettings {
  const out = { ...base }
  if (!saved || typeof saved !== 'object') return out
  const r = saved as Record<string, unknown>
  if (r.camera === 'follow' || r.camera === 'scenes' || r.camera === 'fixed') out.camera = r.camera
  const num = (k: keyof ParquinhoSettings, lo: number, hi: number) => {
    const v = r[k]
    if (typeof v === 'number' && Number.isFinite(v)) (out as Record<string, unknown>)[k] = Math.min(hi, Math.max(lo, v))
  }
  if (!file) num('screens', 1, 8)
  num('deadband', 0, 400); num('lag', 1, 20); num('lookAhead', 0, 500); num('lookAheadSpeed', 0.5, 12); num('jumpShake', 0, 30); num('superJumpShake', 0, 30); num('reticleDist', 60, 500)
  // saved as null when infinite (JSON has no Infinity). Saves before aimV2 (03/11) had ∞ as the default, which kept
  // the left stick from ever aiming again: those fall back to the new default (0 s), and only an ∞ chosen since stays
  if (typeof r.aimRelease === 'number' && Number.isFinite(r.aimRelease)) out.aimRelease = Math.min(AIM_RELEASE_MAX, Math.max(0, r.aimRelease))
  else if (r.aimRelease === null && (file || r.aimV2)) out.aimRelease = Infinity
  num('keysAimRelease', 0, KEYS_AIM_RELEASE_MAX)
  if (typeof r.quantize === 'boolean') out.quantize = r.quantize
  if (!file && typeof r.debug === 'boolean') out.debug = r.debug
  return out
}

/** The code's settings with a defaults file's `camera` over them. */
export const parquinhoOver = (camera: unknown) => readParquinho(CODE_PARQUINHO, camera, true)
export const DEFAULT_PARQUINHO: ParquinhoSettings = parquinhoOver(DEFAULTS_FILE.camera)

/** The defaults file's `camera` for these settings (what "Salvar no game" writes): no width (the Pátio's own) nor Debug. */
export function parquinhoDefaultsFile(s: ParquinhoSettings) {
  return {
    camera: s.camera, deadband: s.deadband, lag: s.lag, lookAhead: s.lookAhead, lookAheadSpeed: s.lookAheadSpeed,
    aimRelease: Number.isFinite(s.aimRelease) ? s.aimRelease : null, keysAimRelease: s.keysAimRelease,
    reticleDist: s.reticleDist, jumpShake: s.jumpShake, superJumpShake: s.superJumpShake, quantize: s.quantize,
  }
}

export function loadParquinho(): ParquinhoSettings {
  migrateLegacyBackpedal()
  try {
    return readParquinho(DEFAULT_PARQUINHO, JSON.parse(window.localStorage.getItem(STORE) || 'null'))
  } catch { /* storage unavailable */ }
  return { ...DEFAULT_PARQUINHO }
}

export function saveParquinho(next: ParquinhoSettings) {
  try { window.localStorage.setItem(STORE, JSON.stringify({ ...next, aimV2: true })) } catch { /* ignore */ }
}
