// The soul collection in the player's account: supabase/migrations/202611110001_pigchicken_souls.sql. The copy in
// this browser stays the one the game writes (lib/pigchicken/soul-library.ts); signed in with an account, it is
// merged with the account's. A collection only grows, so there is no conflict to settle: each side takes what the
// other found (mergeCollections here, the same merge on the server), and nothing found is ever lost.
import { t as tr } from '../i18n'
import { getOnlineClient, onlineConfigured, onlineRpc } from '@/lib/online/client'
import { collectionKey, loadCollection, mergeCollections, normalizeCollection, saveCollection, subscribeCollection, type SoulCollection } from './soul-library'

export const soulsOnlineAvailable = () => onlineConfigured && !!getOnlineClient()

// merge: this browser's collection goes into the account's, and the account's (with it in) comes back
export type SoulsApi = { merge(found: SoulCollection): Promise<unknown> }
export const soulsApi: SoulsApi = { merge: found => onlineRpc<unknown>('pigchicken_souls_merge', { p_found: found }) }

// got: the entries the account brought or added to; again: something was caught here while the pass was away (it
// goes in the next one); known: what the account holds now (collectionKey)
export type SoulSync = { got: number; again: boolean; known: string }
/** One pass: sends this browser's collection, takes the account's. */
export async function syncSouls(api: SoulsApi = soulsApi): Promise<SoulSync> {
  const sent = loadCollection()
  const theirs = normalizeCollection(await api.merge(sent))
  const here = loadCollection() // what was caught meanwhile stays
  const merged = mergeCollections(here, theirs)
  let got = 0
  for (const id of Object.keys(merged)) if (!here[id] || collectionKey({ [id]: here[id] }) !== collectionKey({ [id]: merged[id] })) got++
  if (got) saveCollection(merged)
  return { got, again: collectionKey(here) !== collectionKey(sent), known: collectionKey(theirs) }
}

// ---------- the sync's state, for the library's panel ----------
export type SoulSyncState = { status: 'local' | 'syncing' | 'synced' | 'error'; message: string }
let state: SoulSyncState = { status: 'local', message: '' }
const listeners = new Set<(s: SoulSyncState) => void>()
export const soulSyncState = () => state
function setState(s: SoulSyncState) { state = s; listeners.forEach(fn => fn(s)) }
export function subscribeSoulSyncState(fn: (s: SoulSyncState) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

const message = (e: unknown) => (typeof e === 'object' && e && 'message' in e && typeof e.message === 'string' ? e.message : '')
const code = (e: unknown) => (typeof e === 'object' && e && 'code' in e && typeof e.code === 'string' ? e.code : '')
export const isSoulServerMissing = (e: unknown) => code(e) === 'PGRST202' || code(e) === '42883' || /could not find the function|does not exist/i.test(message(e))
export function soulErrorMessage(e: unknown): string {
  const m = message(e)
  if (isSoulServerMissing(e)) return tr("O servidor ainda não guarda as almas (falta aplicar a migração). Ficam neste navegador.")
  if (/failed to fetch|network|load failed|fetch failed|timeout/i.test(m) || e instanceof TypeError) return tr("Sem conexão com o servidor. Ficam neste navegador.")
  if (m.includes("ACCOUNT_REQUIRED")) return tr("Entre com sua conta para guardar as almas nela.")
  if (m.includes("TOO_MANY_SOULS")) return tr("A coleção ficou grande demais para guardar na conta.")
  if (m.includes("INVALID_SOULS")) return tr("Não foi possível ler a coleção.")
  return m || tr("Não foi possível sincronizar a coleção.")
}

// Keeps the collection in step with the account while this player is signed in (null: it stays in this browser):
// once now, a few seconds after a capture (several in a row go together, and no more than a pass every 30 s: what
// waits is safe in this browser), and when the tab comes back (at most every 5 minutes, to bring what another
// browser caught). A server without the migration is not asked again.
const SOON_MS = 4000, GAP_MS = 30_000, BACK_CHECK_MS = 5 * 60_000
export function startSoulSync(user: string | null, api: SoulsApi = soulsApi): () => void {
  if (!user) { setState({ status: 'local', message: '' }); return () => {} }
  let running = false, stopped = false, off = false, last = 0, known: string | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  const later = () => { if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = null; void run() }, Math.max(SOON_MS, GAP_MS - (Date.now() - last))) }
  const run = async () => {
    if (stopped || off || running) return
    running = true; last = Date.now()
    setState({ status: 'syncing', message: '' })
    try {
      const r = await syncSouls(api)
      known = r.known
      if (stopped) return
      setState({ status: 'synced', message: '' })
      if (r.again) later()
    } catch (e) {
      if (isSoulServerMissing(e)) off = true
      if (!stopped) setState({ status: 'error', message: soulErrorMessage(e) })
    } finally { running = false }
  }
  // a change here (a capture; not what a pass itself brought): send it soon
  const unsub = subscribeCollection(col => { if (!running && collectionKey(col) !== known) later() })
  const back = () => { if (document.visibilityState === 'visible' && Date.now() - last > BACK_CHECK_MS) void run() }
  document.addEventListener('visibilitychange', back)
  void run()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
    unsub()
    document.removeEventListener('visibilitychange', back)
  }
}
