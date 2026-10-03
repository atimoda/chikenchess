/** The opponent's reply delay belongs to one open position, independently of analysis. */
interface TimerClock {
  now: () => number
  setTimeout: (run: () => void, delay: number) => ReturnType<typeof globalThis.setTimeout>
  clearTimeout: (timer: ReturnType<typeof globalThis.setTimeout>) => void
}

const systemClock: TimerClock = {
  now: () => globalThis.performance.now(),
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeout: timer => globalThis.clearTimeout(timer),
}

export class OpponentMoveTimer {
  private timer: ReturnType<typeof globalThis.setTimeout> | null = null
  private pending: { position: string; remaining: number; run: () => void } | null = null
  private due = 0
  private generation = 0

  constructor(private paused = true, private clock: TimerClock = systemClock) {}

  get hasPending() { return this.pending !== null }

  schedule(position: string, delay: number, run: () => void) {
    this.freeze()
    if (this.pending?.position === position) this.pending.run = run
    else this.pending = { position, remaining: delay, run }
    this.arm()
  }

  setPaused(paused: boolean) {
    if (paused === this.paused) return
    this.freeze()
    this.paused = paused
    this.arm()
  }

  cancel() {
    this.freeze()
    this.pending = null
  }

  private freeze() {
    this.generation++
    if (this.timer === null) return
    this.clock.clearTimeout(this.timer)
    this.timer = null
    if (this.pending) this.pending.remaining = Math.max(0, this.due - this.clock.now())
  }

  private arm() {
    const pending = this.pending
    if (this.paused || !pending) return
    this.due = this.clock.now() + pending.remaining
    const generation = this.generation
    this.timer = this.clock.setTimeout(() => {
      if (generation !== this.generation || this.paused || this.pending !== pending) return
      this.timer = null
      this.pending = null
      pending.run()
    }, pending.remaining)
  }
}
