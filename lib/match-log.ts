import type { ChessMoveAnalysis, EvaluatedMove } from './chess-evaluation'
import { limitRankedLists } from './egg-rewards'

// Copy-paste diagnostic log of a match, shared by the campaign and the online match.
// It lists everything that happened in order, including what the move list does not show:
// powers, Undo/Redo, Best/Worst views and the egg reward state of every move.

/** One thing that happened in the match; `t` names it and the other fields depend on it. */
export type MatchLogEvent = { t: string } & Record<string, unknown>

export interface MatchLogHeader {
  version: string
  mode: 'campaign' | 'online'
  [key: string]: unknown
}

/** A long match keeps its most recent events. */
export const MATCH_LOG_LIMIT = 2000

export function appendMatchLog(log: MatchLogEvent[], event: MatchLogEvent): void {
  log.push(event)
  if (log.length > MATCH_LOG_LIMIT) log.splice(0, log.length - MATCH_LOG_LIMIT)
}

function formatLogScore(move: Pick<EvaluatedMove, 'score' | 'mate'>): string {
  if (move.mate !== null && move.mate !== undefined) return `${move.mate < 0 ? '-' : '+'}M${Math.abs(move.mate)}`
  return `${move.score >= 0 ? '+' : '-'}${(Math.abs(move.score) / 100).toFixed(2)}`
}

/** The rewarded head of both lists with each move's own score, as the reward rules read them. */
export function analysisLogSummary(analysis: ChessMoveAnalysis | null | undefined) {
  if (!analysis) return null
  const ranked = limitRankedLists(analysis)
  const list = (moves: EvaluatedMove[]) => moves.map(move => `${move.uci} ${formatLogScore(move)}`).join(', ')
  return {
    legal: analysis.legalMoves,
    depth: analysis.depth,
    complete: analysis.complete,
    final: analysis.final,
    ...(analysis.source ? { source: analysis.source } : {}),
    best: list(ranked.best),
    worst: list(ranked.worst),
  }
}

/** A header line and one JSON object per event: compact to paste, exact to read back. */
export function formatMatchLog(header: MatchLogHeader, events: readonly MatchLogEvent[]): string {
  return [
    `ChickenChess match log ${JSON.stringify({ ...header, events: events.length })}`,
    ...events.map((event, index) => `${index + 1} ${JSON.stringify(event)}`),
  ].join('\n')
}

/** Copies text even where the async clipboard is unavailable (older WebViews, insecure origins). */
export async function copyMatchLog(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* Fall back to the selection copy below. */ }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch {
    return false
  }
}
