"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { Chess } from "chess.js"
import { ChessEvaluationQueue, STOCKFISH_WORKER_URL, type ChessMoveAnalysis } from "@/lib/chess-evaluation"
import { analyzePoweredMovesInWorker } from "@/lib/powered-analysis-client"
import { stockfishSupportsPosition } from "@/lib/powered-chess"
import { isConstrainedDevice } from "@/lib/performance"

type Done = (analysis: ChessMoveAnalysis | null, error?: string) => void

/**
 * On-demand Best/Worst analysis for the Creative board. Unlike a match, nothing is analysed while
 * composing: Stockfish starts with the first request, and each request answers once, for the
 * position it was asked about. A newer request replaces the pending one.
 */
export function useCreativeAnalysis() {
  const [busy, setBusy] = useState(false)
  const queueRef = useRef<ChessEvaluationQueue | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<{ fen: string; done: Done; id: number } | null>(null)
  const serialRef = useRef(0)
  const cacheRef = useRef(new Map<string, ChessMoveAnalysis>())

  const settle = useCallback((id: number, analysis: ChessMoveAnalysis | null, error?: string) => {
    const pending = pendingRef.current
    if (!pending || pending.id !== id) return
    pendingRef.current = null
    setBusy(false)
    if (analysis) cacheRef.current.set(analysis.fen, analysis)
    pending.done(analysis, error)
  }, [])

  const engine = useCallback(() => {
    if (queueRef.current && !queueRef.current.hasFailed) return queueRef.current
    workerRef.current?.terminate()
    const worker = new Worker(STOCKFISH_WORKER_URL)
    const receive = (value: ChessMoveAnalysis | null) => {
      const pending = pendingRef.current
      if (pending && value?.complete && value.fen === pending.fen) settle(pending.id, value)
    }
    const queue = new ChessEvaluationQueue(worker, {
      onBusy: () => {},
      onScore: () => {},
      onAnalysis: receive,
      onProgress: receive,
      onError: message => { const pending = pendingRef.current; if (pending) settle(pending.id, null, message) },
    }, isConstrainedDevice())
    worker.onmessage = event => queue.handleMessage(String(event.data))
    worker.onerror = () => queue.fail()
    queue.initialize()
    workerRef.current = worker
    queueRef.current = queue
    return queue
  }, [settle])

  useEffect(() => () => {
    pendingRef.current = null
    queueRef.current?.reset()
    workerRef.current?.terminate()
  }, [])

  const analyze = useCallback((game: Chess, done: Done) => {
    const fen = game.fen()
    const cached = cacheRef.current.get(fen)
    if (cached) { done(cached); return }
    const id = ++serialRef.current
    pendingRef.current = { fen, done, id }
    setBusy(true)
    if (game.moves().length === 0) { settle(id, null, 'No legal moves in this position.'); return }
    // Free Creative positions may break Stockfish (pawns on a back rank, the waiting side in check):
    // those go to the JavaScript analysis used for powered positions.
    const ranks = fen.split(' ')[0].split('/')
    if (!stockfishSupportsPosition(game) || /p/i.test(ranks[0] + ranks[7])) {
      queueRef.current?.reset()
      void analyzePoweredMovesInWorker(game, [], () => pendingRef.current?.id !== id)
        .then(result => settle(id, result?.complete && result.fen === fen ? result : null, result ? undefined : 'Analysis unavailable for this position.'))
        .catch(error => settle(id, null, error instanceof Error ? error.message : String(error)))
      return
    }
    const moves = game.moves({ verbose: true }).map(move => ({ uci: `${move.from}${move.to}${move.promotion ?? ''}`, san: move.san }))
    engine().request(fen, game.turn(), moves)
  }, [engine, settle])

  return { analyze, busy }
}
