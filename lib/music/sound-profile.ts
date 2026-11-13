// What each "Qualidade e efeitos sonoros" level changes in the music runtime. Notes, arrangement, rules and
// saved kits are the same at every level; only how the output is built differs.
import type { QualityLevel } from '../quality'

export type SoundProfile = {
  /** Loop effect buses: two per team, or one per team. */
  effectBuses: 2 | 4
  /** One convolver for every loop bus (shared-reverb.ts) instead of one per bus. */
  sharedReverb: boolean
  /** false: loop notes carry no reverb send, so no convolver runs for them. */
  reverb: boolean
  /** Lite sound design (sound-design.ts) and rule glides that land at once. */
  lite: boolean
  /** Superdough's cap on simultaneous sources. */
  polyphony: number
  /** Scheduler look-ahead (s) and tick (ms). */
  latency: number
  interval: number
  /** Single-pulse cadence (Hz) and monitor period (ms). */
  visualRate: number
  monitorInterval: number
}

const PROFILES: Record<QualityLevel, SoundProfile> = {
  high: { effectBuses: 4, sharedReverb: false, reverb: true, lite: false, polyphony: 64, latency: .1, interval: 50, visualRate: 15, monitorInterval: 100 },
  medium: { effectBuses: 2, sharedReverb: true, reverb: true, lite: true, polyphony: 32, latency: .3, interval: 100, visualRate: 8, monitorInterval: 150 },
  low: { effectBuses: 2, sharedReverb: false, reverb: false, lite: true, polyphony: 24, latency: .3, interval: 100, visualRate: 8, monitorInterval: 150 },
}

export const soundProfile = (level: QualityLevel): SoundProfile => PROFILES[level]
