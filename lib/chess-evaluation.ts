export type EvaluationSide = 'w' | 'b'

interface EvaluationWorker {
  postMessage(message: string): void
}

interface EvaluationCallbacks {
  onBusy(busy: boolean): void
  onScore(score: number): void
}

interface EvaluationRequest {
  fen: string
  side: EvaluationSide
}

interface ActiveEvaluation extends EvaluationRequest {
  score: number | null
}

/**
 * Serializes UCI-style searches on one worker. UCI responses do not identify the
 * FEN that produced them, so changing `position` before the previous `bestmove`
 * arrives can associate an old result with a new board. New requests replace the
 * queued request, but only start after the active search has closed.
 */
export class ChessEvaluationQueue {
  private active: ActiveEvaluation | null = null
  private queued: EvaluationRequest | null = null
  private requestedFen: string | null = null
  private readonly cache = new Map<string, number>()

  constructor(
    private readonly worker: EvaluationWorker,
    private readonly callbacks: EvaluationCallbacks,
    private readonly depth = 10,
  ) {}

  request(fen: string, side: EvaluationSide) {
    this.requestedFen = fen
    const cached = this.cache.get(fen)
    if (cached !== undefined) {
      this.queued = null
      this.callbacks.onScore(cached)
      this.callbacks.onBusy(false)
      if (this.active) this.worker.postMessage('stop')
      return
    }

    this.queued = { fen, side }
    this.callbacks.onBusy(true)
    if (this.active) {
      this.worker.postMessage('stop')
      return
    }
    this.startQueued()
  }

  handleMessage(message: string) {
    if (message.startsWith('info') && this.active) {
      const mateMatch = message.match(/score mate (-?\d+)/)
      const cpMatch = message.match(/score cp (-?\d+)/)
      if (mateMatch) {
        const sideScore = Number.parseInt(mateMatch[1], 10) > 0 ? 10000 : -10000
        this.active.score = this.active.side === 'w' ? sideScore : -sideScore
      } else if (cpMatch) {
        const sideScore = Number.parseInt(cpMatch[1], 10)
        this.active.score = this.active.side === 'w' ? sideScore : -sideScore
      }
      return
    }

    if (!message.startsWith('bestmove') || !this.active) return
    const finished = this.active
    this.active = null
    if (finished.score !== null) {
      this.cache.set(finished.fen, finished.score)
      if (finished.fen === this.requestedFen) this.callbacks.onScore(finished.score)
    }
    if (this.queued) this.startQueued()
    else this.callbacks.onBusy(false)
  }

  reset() {
    this.requestedFen = null
    this.queued = null
    this.callbacks.onBusy(false)
    if (this.active) this.worker.postMessage('stop')
  }

  private startQueued() {
    if (!this.queued) return
    const next = this.queued
    this.queued = null
    this.active = { ...next, score: null }
    this.worker.postMessage(`position fen ${next.fen}`)
    this.worker.postMessage(`go depth ${this.depth}`)
  }
}
