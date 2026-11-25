// The Pátio's visit counters (supabase/migrations/202611250001_patio_visits.sql): only two numbers per Pátio, nothing
// about the person. This browser remembers when it last entered each Pátio, so a reload within VISIT_GAP_MS does not
// count again, and whether it was already counted there as an anonymous player (the server counts that one only for a
// caller without an account). The database row is updated by one call per counted entry.
import { onlineRpc } from '@/lib/online/client'

export const VISIT_GAP_MS = 30 * 60_000
const KEY = 'chickenchess:patio-visits:v1'
const MAX_ENTRIES = 500

type Entry = { at: number; anon?: 1 }
type Visits = Record<string, Entry>

function read(): Visits {
  try {
    const raw = window.localStorage.getItem(KEY)
    const v = raw ? JSON.parse(raw) : null
    return v && typeof v === 'object' && !Array.isArray(v) ? v as Visits : {}
  } catch { return {} }
}
function write(v: Visits, now: number) {
  // entries that only hold an old entry time are of no use any more; the anonymous marks stay (up to MAX_ENTRIES)
  const kept = Object.entries(v).filter(([, e]) => e && (e.anon || now - e.at < VISIT_GAP_MS))
  kept.sort((a, b) => (b[1].anon ?? 0) - (a[1].anon ?? 0) || b[1].at - a[1].at)
  try { window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(kept.slice(0, MAX_ENTRIES)))) } catch { /* private mode: count anyway */ }
}

/** whether entering this Pátio now counts as a visit, and whether this browser may still count as a new anonymous player */
export function visitDue(id: string, now = Date.now()) {
  const e = read()[id]
  return { due: !e || !(now - e.at < VISIT_GAP_MS) || now < e.at, newAnon: !e?.anon }
}

/** notes the entry (before the call, so a quick second load does not count it twice) */
export function noteVisit(id: string, anonCounted = false, now = Date.now()) {
  const v = read()
  const e = v[id]
  v[id] = { at: now, ...(anonCounted || e?.anon ? { anon: 1 as const } : {}) }
  write(v, now)
}

export type PatioVisitCounts = { visits: number; anonPlayers: number }

/** counts the entry when due; resolves the new numbers, or null when it did not count (or the server lacks the counters) */
export async function visitPatioLobby(id: string, now = Date.now()): Promise<PatioVisitCounts | null> {
  const { due, newAnon } = visitDue(id, now)
  if (!due) return null
  noteVisit(id, false, now)
  try {
    const r = await onlineRpc<{ visits?: unknown; anon_players?: unknown; anon_counted?: unknown } | null>('patio_lobby_visit', { p_id: id, p_new_anon: newAnon })
    if (!r) return null
    if (r.anon_counted === true) noteVisit(id, true, now)
    return { visits: Number(r.visits) || 0, anonPlayers: Number(r.anon_players) || 0 }
  } catch { return null }
}
