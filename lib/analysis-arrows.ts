import type { Square } from "chess.js"
import type { AnalysisArrow } from "@/components/chessground-board"
import { formatEvaluation, rankedMoveLabelTone, type ChessMoveAnalysis } from "@/lib/chess-evaluation"
import { limitRankedLists } from "@/lib/egg-rewards"

/** `top` is the Debug Moves shortcut: the ten best moves drawn like Best. */
export type AnalysisArrowKind = 'best' | 'worst' | 'top'

/** Board arrows for the Best/Worst lists, shared by the campaign and the Creative. */
export function arrowsForAnalysis(analysis: ChessMoveAnalysis, kind: AnalysisArrowKind): AnalysisArrow[] {
  const moves = kind === 'top' ? analysis.top ?? analysis.best : limitRankedLists(analysis)[kind]
  return moves.map(move => ({
    from: move.uci.slice(0, 2) as Square,
    to: move.uci.slice(2, 4) as Square,
    label: formatEvaluation(move.score, move.mate),
    tone: kind === 'worst' ? 'worst' : 'best',
    labelTone: rankedMoveLabelTone(move.score, move.mate),
  }))
}
