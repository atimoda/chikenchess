/** Superdough 1.3 adapter for constrained devices: every loop bus sends into one
 * convolver instead of owning its own. Convolution is the largest cost of the
 * audio thread on phones; sends, levels and per-note controls stay per bus.
 * The shared tail returns to both team buses in equal parts, so it follows the
 * master volume and both crossfader sides. Custom IRs keep Superdough's path. */
type Reverb = ConvolverNode & { duration?: number; fade?: number; lp?: number; dim?: number; ir?: AudioBuffer; irspeed?: number; irbegin?: number; generate?: (...args: any[]) => void }
type Orbit = { reverbNode?: AudioNode; getReverb: (...args: any[]) => AudioNode }
type ReverbContext = AudioContext & { createReverb: (...args: any[]) => Reverb }

export class SharedLoopReverb {
  private convolver?: Reverb
  private readonly returnGain: GainNode
  private readonly sends = new Set<GainNode>()
  constructor(private context: AudioContext, returns: AudioNode[]) {
    this.returnGain = context.createGain()
    for (const destination of returns) {
      const share = context.createGain()
      share.gain.value = 1 / returns.length
      this.returnGain.connect(share).connect(destination)
    }
  }
  attach(orbit: Orbit) {
    const original = orbit.getReverb.bind(orbit)
    let send: GainNode | undefined
    orbit.getReverb = (...args: any[]) => {
      if (args[4] !== undefined) return original(...args)
      const reverb = this.reverb(args)
      if (!send) {
        send = this.context.createGain()
        send.connect(reverb)
        this.sends.add(send)
      }
      orbit.reverbNode = send
      return send
    }
  }
  setLevel(level: number) {
    this.returnGain.gain.setTargetAtTime(level, this.context.currentTime, .015)
  }
  private reverb(args: any[]) {
    const [duration, fade, lp, dim, , irspeed, irbegin] = args
    if (!this.convolver) {
      this.convolver = (this.context as ReverbContext).createReverb(...args)
      this.convolver.connect(this.returnGain)
    } else {
      const changed = (value: unknown, current: unknown) => value !== undefined && value !== current
      const node = this.convolver
      if (changed(duration, node.duration) || changed(fade, node.fade) || changed(lp, node.lp) || changed(dim, node.dim) || changed(irspeed, node.irspeed) || changed(irbegin, node.irbegin)) node.generate?.(...args)
    }
    return this.convolver
  }
  dispose() {
    for (const send of this.sends) send.disconnect()
    this.sends.clear()
    this.convolver?.disconnect()
    this.convolver = undefined
    this.returnGain.disconnect()
  }
}
