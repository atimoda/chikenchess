export interface SquareEffects {
  delay: number // 0 to 1
  reverb: number // 0 to 1
  gain: number // 0 to 2
  pan: number // -1 to 1
  pitch: number // 0.5 to 2 (multiplier)
  decay: number // 0.1 to 2 (seconds)
  lpf?: number // 20 to 20000 (Hz)
  hpf?: number // 0 to 20000 (Hz)
  sample?: string // Custom sample override
  sequence?: number[] // Custom rhythm sequence (1 = play, 0 = rest)
  division?: number // Subdivision (e.g. 4, 8, 16)
}

export const DEFAULT_EFFECTS: SquareEffects = {
  delay: 0,
  reverb: 0,
  gain: 1,
  pan: 0,
  pitch: 1,
  decay: 0.5,
  lpf: 20000,
  hpf: 0,
  sample: undefined,
  sequence: [1, 0, 0, 0], // Default: play once at start
  division: 4,
}

export interface GlobalEffects {
  volume: number // 0 to 2
  bpm: number // 3 to 333
}

export const DEFAULT_GLOBAL_EFFECTS: GlobalEffects = {
  volume: 0.8,
  bpm: 120,
}
