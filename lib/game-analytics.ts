export type MatchAnalyticsResult = 'white' | 'black' | 'draw'
export type MatchAnalyticsMode = 'campaign' | 'online'
export type MatchAnalyticsReason = 'checkmate' | 'draw' | 'resign'

export interface MatchCompletedAnalytics {
  game_mode: MatchAnalyticsMode
  result: MatchAnalyticsResult
  result_reason: MatchAnalyticsReason
  move_count: number
  golden_eggs_saved: number
  golden_eggs_collected: number
  freeze_uses: number
  shield_uses: number
  undo_uses: number
  redo_uses: number
  best_uses: number
  worst_uses: number
  city_name: string
  white_kit_city: string
  black_kit_city: string
  /** Time from this client observing the start to completion; omitted after a resumed match. */
  observed_duration_seconds?: number
}

export interface MatchStartedAnalytics {
  game_mode: MatchAnalyticsMode
  city_name: string
  white_kit_city: string
  black_kit_city: string
}

/** Send only match outcomes; never include account or match identifiers. */
export function trackMatchCompleted(params: MatchCompletedAnalytics) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'match_completed', params)
}

export function trackMatchStarted(params: MatchStartedAnalytics) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  window.gtag('event', 'match_started', params)
}
