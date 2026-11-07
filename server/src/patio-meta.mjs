// The few facts about a Pátio the lobby rules need: its name, creator and godparent. Read once when a room opens
// (public.patio_lobby_meta, migration 202611070003: a tiny row, never the layout). The automatic public lobby is
// the default Pátio, which has no creator. Without SUPABASE_URL (local development) the room trusts what the
// first browser sent, and a Pátio the server cannot read counts as having no creator.
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '')
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const DEFAULT_PATIO = 'default'
export const cleanPatioId = id => (typeof id === 'string' && UUID.test(id) ? id.toLowerCase() : DEFAULT_PATIO)

const empty = { name: null, creatorId: null, godparentId: null }
const str = v => (typeof v === 'string' ? v : null)

export async function loadPatioMeta(patioId, claimed = {}) {
  if (patioId === DEFAULT_PATIO) return { ...empty }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { name: str(claimed.name)?.slice(0, 60) ?? null, creatorId: str(claimed.creatorId), godparentId: str(claimed.godparentId) }
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/patio_lobby_meta`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p_id: patioId }),
    })
    const row = res.ok ? await res.json() : null
    return row ? { name: str(row.name), creatorId: str(row.creator_id), godparentId: str(row.godparent_id) } : { ...empty }
  } catch {
    return { ...empty }
  }
}
