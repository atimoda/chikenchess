export interface TeamMix { gain: number; bass: number; mids: number; highs: number }
export type TeamMixes = Record<'w' | 'b', TeamMix>
export const createTeamMixes = (): TeamMixes => ({ w: { gain: 1, bass: 0, mids: 0, highs: 0 }, b: { gain: 1, bass: 0, mids: 0, highs: 0 } })
export function resolveDeckClock(baseBpm: number, originalBpm: number, finePitch: number, locked: boolean) {
  const tuning = locked ? 1 : 1 + Math.max(-8, Math.min(8, finePitch)) / 100
  return { tuning, bpm: locked ? originalBpm : baseBpm * tuning }
}

/** Two post-effects buses: EQ the actual ensemble, including its effect tails. */
export class TeamMixer {
  readonly sides: Record<'w' | 'b', { bass: BiquadFilterNode; mids: BiquadFilterNode; highs: BiquadFilterNode; output: GainNode }>
  constructor(private context: AudioContext, analyser?: AnalyserNode) {
    const side = () => {
      const bass = context.createBiquadFilter(), mids = context.createBiquadFilter(), highs = context.createBiquadFilter(), output = context.createGain()
      bass.type = 'lowshelf'; bass.frequency.value = 200
      mids.type = 'peaking'; mids.frequency.value = 1000; mids.Q.value = .7
      highs.type = 'highshelf'; highs.frequency.value = 4000
      bass.connect(mids); mids.connect(highs); highs.connect(output); output.connect(context.destination)
      if (analyser) output.connect(analyser)
      return { bass, mids, highs, output }
    }
    this.sides = { w: side(), b: side() }
  }
  connect(output: AudioNode, color: 'w' | 'b') {
    output.disconnect()
    output.connect(this.sides[color].bass)
  }
  update(mixes: TeamMixes) {
    for (const color of ['w', 'b'] as const) {
      const nodes = this.sides[color], values = mixes[color]
      nodes.output.gain.setTargetAtTime(Math.max(0, Math.min(1.5, values.gain)), this.context.currentTime, .02)
      for (const band of ['bass', 'mids', 'highs'] as const) nodes[band].gain.setTargetAtTime(Math.max(-12, Math.min(12, values[band])), this.context.currentTime, .02)
    }
  }
  dispose() { for (const side of Object.values(this.sides)) for (const node of Object.values(side)) node.disconnect() }
}
