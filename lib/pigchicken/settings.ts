// Parquinho (PigChicKen's creative mode) settings, saved in this browser.
import type { CameraMode } from './camera'

export type ParquinhoSettings = {
  camera: CameraMode
  screens: number // world width in screens
  deadband: number // px the chicken moves from the centre before the follow camera moves
  lag: number // follow camera speed (1/s)
  backpedal: number // walking speed while aiming behind her (0..1)
  aimRelease: number // seconds of a still mouse / aim stick before the arrows / left stick get the aim back (Infinity = never)
  reticleDist: number // px from her shoulder to the reticle when aiming with a stick or the keys
  weaponVolume: number // 0..1
  noteVolume: number // instruments and the enemies' answers, 0..1
  ambienceVolume: number // the zone's percussion and drone, 0..1 (0 = off)
  quantize: boolean // instruments land on the sixteenth grid
  debug: boolean // the debug readouts: the HUD line, the scenes' labels and the shaped floors' lines
}

export const DEFAULT_PARQUINHO: ParquinhoSettings = { camera: 'follow', screens: 4, deadband: 80, lag: 6, backpedal: 0.7, aimRelease: Infinity, reticleDist: 200, weaponVolume: 0.6, noteVolume: 0.7, ambienceVolume: 0.35, quantize: true, debug: false }

// the aim-release slider: 0..AIM_RELEASE_MAX seconds, and one step past it is "never" (Infinity)
export const AIM_RELEASE_MAX = 5

const STORE = 'pigchicken-parquinho-v1'

export function loadParquinho(): ParquinhoSettings {
  const base = { ...DEFAULT_PARQUINHO }
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE) || 'null')
    if (!saved) return base
    if (saved.camera === 'follow' || saved.camera === 'scenes' || saved.camera === 'fixed') base.camera = saved.camera
    const num = (k: keyof ParquinhoSettings, lo: number, hi: number) => {
      const v = saved[k]
      if (typeof v === 'number' && Number.isFinite(v)) (base as Record<string, unknown>)[k] = Math.min(hi, Math.max(lo, v))
    }
    num('screens', 1, 8); num('deadband', 0, 400); num('lag', 1, 20); num('backpedal', 0.2, 1); num('reticleDist', 60, 500); num('weaponVolume', 0, 1); num('noteVolume', 0, 1); num('ambienceVolume', 0, 1)
    // saved as null when infinite (JSON has no Infinity); the old `mouseIdle` key is ignored so the new default applies
    if (typeof saved.aimRelease === 'number' && Number.isFinite(saved.aimRelease)) base.aimRelease = Math.min(AIM_RELEASE_MAX, Math.max(0, saved.aimRelease))
    if (typeof saved.quantize === 'boolean') base.quantize = saved.quantize
    if (typeof saved.debug === 'boolean') base.debug = saved.debug
  } catch { /* storage unavailable */ }
  return base
}

export function saveParquinho(next: ParquinhoSettings) {
  try { window.localStorage.setItem(STORE, JSON.stringify(next)) } catch { /* ignore */ }
}
