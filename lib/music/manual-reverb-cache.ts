/** Superdough 1.3 adapter: reuse immutable impulse buffers, never live effect nodes.
 * Manual notes still get fresh convolvers, so cancelling a square cannot revive
 * its tail. Cache is owned by one runtime/AudioContext and bounded to 8 settings. */
type Reverb = ConvolverNode & { duration?: number; fade?: number; lp?: number; dim?: number; ir?: AudioBuffer; irspeed?: number; irbegin?: number }
type Orbit = { reverbNode?: Reverb; summingNode: AudioNode; getReverb: (...args: any[]) => Reverb }
export class ManualReverbCache {
  private buffers = new Map<string, Reverb>()
  attach(orbit: Orbit, context: AudioContext) {
    const original = orbit.getReverb.bind(orbit)
    let currentKey: string | undefined
    orbit.getReverb = (...args: any[]) => {
      // Custom IRs are owned by Superdough's sample loader; don't duplicate them.
      if (args[4] !== undefined) {
        if (currentKey !== undefined) { orbit.reverbNode?.disconnect(); orbit.reverbNode = undefined; currentKey = undefined }
        return original(...args)
      }
      const key = JSON.stringify(args)
      if (currentKey === key && orbit.reverbNode) return orbit.reverbNode
      const cached = this.buffers.get(key)
      // A prior impulse may still be rendering asynchronously: fall back until ready.
      if (cached?.buffer) {
        orbit.reverbNode?.disconnect()
        const node = context.createConvolver() as Reverb
        node.buffer = cached.buffer
        for (const field of ['duration', 'fade', 'lp', 'dim', 'irspeed', 'irbegin'] as const) node[field] = cached[field]
        node.connect(orbit.summingNode)
        orbit.reverbNode = node
        currentKey = key
        return node
      }
      // The cached clone has no generator; changing settings must use the factory.
      orbit.reverbNode?.disconnect()
      orbit.reverbNode = undefined
      const node = original(...args)
      this.buffers.delete(key)
      this.buffers.set(key, node)
      while (this.buffers.size > 8) this.buffers.delete(this.buffers.keys().next().value!)
      currentKey = key
      return node
    }
  }
  clear() { this.buffers.clear() }
}
