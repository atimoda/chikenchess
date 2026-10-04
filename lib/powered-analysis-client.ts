/* global MessageEvent */
import type { Chess } from 'chess.js'
import type { ChessMoveAnalysis } from './chess-evaluation'
import type { MatchPower } from './chess-powers'
import { poweredChessSnapshot } from './powered-chess'

/** Each search owns its worker; cancelling terminates all pending calculation. */
export function analyzePoweredMovesInWorker(
  game: Chess,
  powers: MatchPower[],
  cancelled: () => boolean,
): Promise<ChessMoveAnalysis | null> {
  if (cancelled()) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const worker = new Worker('/engine/powered-analysis.js', { type: 'module' })
    const finish = (analysis: ChessMoveAnalysis | null, error?: Error) => {
      clearInterval(cancelTimer)
      worker.terminate()
      if (error) reject(error)
      else resolve(cancelled() ? null : analysis)
    }
    const cancelTimer = setInterval(() => { if (cancelled()) finish(null) }, 50)
    worker.onmessage = (event: MessageEvent<{ analysis?: ChessMoveAnalysis; error?: string }>) => {
      if (event.data.error) finish(null, new Error(event.data.error))
      else finish(event.data.analysis ?? null)
    }
    worker.onerror = () => finish(null, new Error('Não foi possível iniciar a avaliação dos poderes.'))
    worker.postMessage({ snapshot: poweredChessSnapshot(game), powers })
  })
}
