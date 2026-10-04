/* global self, MessageEvent */
import { analyzePoweredMoves } from './powered-analysis'
import { restorePoweredChess, type poweredChessSnapshot } from './powered-chess'
import type { MatchPower } from './chess-powers'

export interface PoweredAnalysisRequest {
  snapshot: ReturnType<typeof poweredChessSnapshot>
  powers: MatchPower[]
}

self.onmessage = async (event: MessageEvent<PoweredAnalysisRequest>) => {
  const { snapshot, powers } = event.data
  try {
    const analysis = await analyzePoweredMoves(restorePoweredChess(snapshot, powers), powers)
    self.postMessage({ analysis })
  } catch {
    self.postMessage({ error: 'Não foi possível avaliar a posição com poderes.' })
  }
}
