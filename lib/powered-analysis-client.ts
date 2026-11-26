/* global MessageEvent */
import type { Chess } from 'chess.js'
import type { ChessMoveAnalysis } from './chess-evaluation'
import type { MatchPower } from './chess-powers'
import { poweredChessSnapshot } from './powered-chess'
import { msg, t } from './i18n'

// Error texts the worker (which cannot import the language module) posts as plain source text.
export const POWERED_ANALYSIS_ERRORS = [msg('Não foi possível avaliar a posição com poderes.')] as const

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
      if (event.data.error) finish(null, new Error(t(event.data.error)))
      else finish(event.data.analysis ?? null)
    }
    worker.onerror = () => finish(null, new Error(t('Não foi possível iniciar a avaliação dos poderes.')))
    worker.postMessage({ snapshot: poweredChessSnapshot(game), powers })
  })
}
