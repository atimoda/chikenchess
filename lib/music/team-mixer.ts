export interface TeamMix { gain: number; bass: number; mids: number; highs: number; filter: number }
export type TeamMixes = Record<'w' | 'b', TeamMix>
export const TEAM_GAIN_MAX = 1.5
/** Gain range the score-driven crossfader stays within, so the trailing team stays audible. */
export const AUTO_CROSSFADER_GAIN_MIN = 0.25
export const AUTO_CROSSFADER_GAIN_MAX = 1.25
const AUTO_CROSSFADER_REACH = Math.min(
  1 - 2 * AUTO_CROSSFADER_GAIN_MIN / TEAM_GAIN_MAX,
  2 * AUTO_CROSSFADER_GAIN_MAX / TEAM_GAIN_MAX - 1,
)
export const createTeamMixes = (gain = 1): TeamMixes => ({ w: { gain, bass: 0, mids: 0, highs: 0, filter: 0 }, b: { gain, bass: 0, mids: 0, highs: 0, filter: 0 } })

/** Crossfader position -1..1 maps to the team's left/right gain knobs. */
export function teamGainsForCrossfader(position: number) {
  const crossfader = Math.max(-1, Math.min(1, position))
  return {
    left: TEAM_GAIN_MAX * (1 - crossfader) / 2,
    right: TEAM_GAIN_MAX * (1 + crossfader) / 2,
  }
}

/**
 * Resolves the dynamic crossfader position (-1..1) based on chance evaluation and turn.
 * - Negative (-1..0): favors top team ("time de cima").
 * - Positive (0..1): favors bottom team ("time de baixo").
 * Depth is proportional to the player's current chance on their turn:
 * - On top team's turn: -topChance (from -1 when 100% chance, to 0 when 0% chance).
 * - On bottom team's turn: +bottomChance (from +1 when 100% chance, to 0 when 0% chance).
 * The result is scaled so the gains stay within AUTO_CROSSFADER_GAIN_MIN..AUTO_CROSSFADER_GAIN_MAX.
 */
export function calculateCrossfaderPosition({
  score,
  mate,
  turn,
  topColor = 'b',
}: {
  score: number | null
  mate: number | null
  turn: 'w' | 'b'
  topColor?: 'w' | 'b'
}): number {
  const whitePercent = score === null ? 50 : mate !== null
    ? (score < 0 ? 0 : 100)
    : 50 + 50 * score / (Math.abs(score) + 300)

  const whiteChance = Math.max(0, Math.min(100, whitePercent)) / 100
  const topChance = topColor === 'w' ? whiteChance : 1 - whiteChance
  const bottomChance = 1 - topChance

  const isTopTurn = turn === topColor
  const pos = (isTopTurn ? -topChance : bottomChance) * AUTO_CROSSFADER_REACH
  return Math.max(-1, Math.min(1, Math.trunc(pos * 1e4) / 1e4 || 0))
}

const FILTER_RANGE = Math.log(1000)
export const filterDialValue = (lpf = 20000, hpf = 0) => {
  const low = lpf < 20000 ? -Math.log(20000 / Math.max(20, lpf)) / FILTER_RANGE : 0
  const high = hpf > 0 ? .01 + .99 * Math.log(Math.max(20, hpf) / 20) / FILTER_RANGE : 0
  return Math.abs(low) >= high ? low : high
}
export const filterDialHertz = (value: number) => value < 0
  ? Math.round(20000 / Math.pow(1000, -value))
  : Math.round(20 * Math.pow(1000, Math.max(0, value - .01) / .99))
export const filterDialLabel = (value: number) => {
  if (value === 0) return 'OFF'
  const hz = filterDialHertz(value)
  return `${value < 0 ? 'LPF' : 'HPF'} ${hz >= 1000 ? `${(hz / 1000).toFixed(1)}k` : `${hz}Hz`}`
}

export function resolveDeckClock(baseBpm: number, originalBpm: number, finePitch: number, locked: boolean) {
  const tuning = locked ? 1 : 1 + Math.max(-8, Math.min(8, finePitch)) / 100
  return { tuning, bpm: locked ? originalBpm : baseBpm * tuning }
}

/** Two post-effects buses: team gain, EQ and filter include the ensemble's effect tails. */
export class TeamMixer {
  readonly sides: Record<'w' | 'b', { bass: BiquadFilterNode; mids: BiquadFilterNode; highs: BiquadFilterNode; filter: BiquadFilterNode; output: GainNode }>
  readonly analysers: Partial<Record<'w' | 'b', AnalyserNode>>
  constructor(private context: AudioContext, analyser?: AnalyserNode) {
    const side = () => {
      const bass = context.createBiquadFilter(), mids = context.createBiquadFilter(), highs = context.createBiquadFilter(), filter = context.createBiquadFilter(), output = context.createGain()
      bass.type = 'lowshelf'; bass.frequency.value = 200
      mids.type = 'peaking'; mids.frequency.value = 1000; mids.Q.value = .7
      highs.type = 'highshelf'; highs.frequency.value = 4000
      filter.type = 'allpass'
      bass.connect(mids); mids.connect(highs); highs.connect(filter); filter.connect(output); output.connect(context.destination)
      if (analyser) output.connect(analyser)
      let teamAnalyser: AnalyserNode | undefined
      if (typeof context.createAnalyser === 'function') {
        teamAnalyser = context.createAnalyser()
        teamAnalyser.fftSize = 256
        output.connect(teamAnalyser)
      }
      return { bass, mids, highs, filter, output, analyser: teamAnalyser }
    }
    const w = side()
    const b = side()
    this.sides = { w, b }
    this.analysers = { w: w.analyser, b: b.analyser }
  }
  getTeamFrequencyData(color: 'w' | 'b', data: Uint8Array<ArrayBuffer>) {
    const a = this.analysers[color]
    if (a) a.getByteFrequencyData(data)
    else data.fill(0)
  }
  connect(output: AudioNode, color: 'w' | 'b') {
    output.disconnect()
    output.connect(this.sides[color].bass)
  }
  update(mixes: TeamMixes) {
    for (const color of ['w', 'b'] as const) {
      const nodes = this.sides[color], values = mixes[color]
      nodes.output.gain.setTargetAtTime(Math.max(0, Math.min(TEAM_GAIN_MAX, values.gain)), this.context.currentTime, .02)
      for (const band of ['bass', 'mids', 'highs'] as const) nodes[band].gain.setTargetAtTime(Math.max(-12, Math.min(12, values[band])), this.context.currentTime, .02)
      const dial = Math.max(-1, Math.min(1, values.filter ?? 0))
      nodes.filter.type = Math.abs(dial) < .01 ? 'allpass' : dial < 0 ? 'lowpass' : 'highpass'
      if (Math.abs(dial) >= .01) nodes.filter.frequency.setTargetAtTime(filterDialHertz(dial), this.context.currentTime, .02)
    }
  }
  dispose() {
    for (const side of Object.values(this.sides)) for (const node of Object.values(side)) if (node && typeof node.disconnect === 'function') node.disconnect()
    for (const a of Object.values(this.analysers)) if (a && typeof a.disconnect === 'function') a.disconnect()
  }
}
