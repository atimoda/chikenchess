// The jukebox's songs in the player's account: supabase/migrations/202611070001_pigchicken_songs.sql. The library
// in this browser stays the one the game plays and the editor changes; signed in with an account, each change is
// sent and what was saved on another browser comes back (the sync below). Nothing is ever lost: when the same song
// changed here and elsewhere, the account's version wins and this browser's stays as a copy ("… (este aparelho)").
// The admin also sees everyone's songs and can hear one or copy it into their own library.
import { getOnlineClient, onlineConfigured, onlineRpc } from '@/lib/online/client'
import { LIBRARY_EVENT, loadLibrary, loadPending, normalizeSong, songId, writeMine, writePending, type LibrarySong } from './song-library'

export const songsOnlineAvailable = () => onlineConfigured && !!getOnlineClient()

export type SongInfo = { ownerId: string; ownerName: string | null; id: string; name: string; revision: number; createdAt: string | null; updatedAt: string | null }
type Row = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)
const info = (r: Row): SongInfo => ({
  ownerId: String(r.owner_id), ownerName: str(r.owner_name), id: String(r.id), name: str(r.name) ?? 'Música', revision: num(r.revision),
  createdAt: str(r.created_at), updatedAt: str(r.updated_at),
})

// what goes to the server: the song as the library keeps it, without the browser's own marks
const body = (s: LibrarySong) => { const { builtin: _b, ...rest } = s; void _b; return rest }

export type SongApi = {
  list(): Promise<SongInfo[]>
  get(id: string, owner?: string): Promise<{ info: SongInfo; song: LibrarySong | null } | null>
  save(id: string, song: LibrarySong, revision: number): Promise<{ revision: number }>
  remove(id: string): Promise<void>
}
export const songApi: SongApi = {
  list: async () => ((await onlineRpc<Row[] | null>('pigchicken_song_list')) ?? []).map(info),
  async get(id, owner) {
    const r = await onlineRpc<Row | null>('pigchicken_song_get', { p_id: id, p_owner: owner ?? null })
    return r ? { info: info(r), song: normalizeSong({ ...(r.song as object), id }) } : null
  },
  save: async (id, song, revision) => ({ revision: num((await onlineRpc<Row>('pigchicken_song_save', { p_id: id, p_song: body(song), p_revision: revision })).revision) }),
  remove: async id => { await onlineRpc<null>('pigchicken_song_delete', { p_id: id }) },
}
export const listAllSongs = async () => ((await onlineRpc<Row[] | null>('pigchicken_song_list_all')) ?? []).map(info)

// ---------- the sync ----------

// the revision of each song this browser last had from (or sent to) the account, per account
const KNOWN = 'pigchicken-songs-known-v1'
type Known = Record<string, number>
function loadKnown(user: string): Known {
  try { const all = JSON.parse(window.localStorage.getItem(KNOWN) || '{}'); const k = all?.[user]; return k && typeof k === 'object' ? k : {} } catch { return {} }
}
function writeKnown(user: string, k: Known) {
  try { const all = JSON.parse(window.localStorage.getItem(KNOWN) || '{}') || {}; all[user] = k; window.localStorage.setItem(KNOWN, JSON.stringify(all)) } catch { /* ignore */ }
}

export type SyncResult = { sent: number; got: number; removed: number; copies: string[] }
const isConflict = (e: unknown) => /SONG_CONFLICT/.test(message(e))

// one pass: deletions go first, then each song is sent or brought back by its revision
export async function syncSongs(user: string, api: SongApi = songApi): Promise<SyncResult> {
  const res: SyncResult = { sent: 0, got: 0, removed: 0, copies: [] }
  const known = loadKnown(user)
  const pending = loadPending()
  const remote = await api.list()
  const byId = new Map(remote.map(r => [r.id, r]))
  // deleted here: deleted there too (only the ones this account had)
  for (const id of pending.deleted) {
    if (known[id] !== undefined && byId.has(id)) { await api.remove(id); byId.delete(id); res.removed++ }
    delete known[id]
  }
  const dirty = new Set(pending.saved)
  const mine = loadLibrary().songs.filter(s => !s.builtin)
  const out = new Map(mine.map(s => [s.id, s]))
  const taken = () => [...out.keys(), ...byId.keys()]
  // what the account has
  for (const r of byId.values()) {
    const here = out.get(r.id)
    if (here && r.revision <= (known[r.id] ?? 0)) continue // nothing new there (it may go up below)
    const got = await api.get(r.id)
    if (!got?.song) continue
    if (here && dirty.has(r.id)) {
      // changed here and there: theirs takes the id, ours stays as a copy (sent below)
      const id = songId(`${here.name} este aparelho`, taken())
      const copy: LibrarySong = { ...here, id, name: `${here.name} (este aparelho)`.slice(0, 60), music: { ...here.music, zone: { ...here.music.zone, id: `templo-${id}` } } }
      out.set(id, copy); dirty.add(id); res.copies.push(copy.name)
    }
    out.set(r.id, { ...got.song, builtin: false }); dirty.delete(r.id)
    known[r.id] = got.info.revision; res.got++
  }
  // what is only here: deleted on another browser (it had been sent) or still to be sent
  for (const s of [...out.values()]) {
    if (byId.has(s.id) || dirty.has(s.id)) continue
    if (known[s.id] !== undefined) { out.delete(s.id); delete known[s.id]; res.removed++ } else dirty.add(s.id)
  }
  // send what changed here
  const failed: string[] = []
  for (const id of dirty) {
    const s = out.get(id)
    if (!s) continue
    try { known[id] = (await api.save(id, s, byId.has(id) ? known[id] ?? 0 : 0)).revision; res.sent++ } catch (e) {
      if (!isConflict(e)) throw e
      failed.push(id) // saved elsewhere in between: the next pass brings it
    }
  }
  writeKnown(user, known)
  writePending({ saved: failed, deleted: [] })
  const before = JSON.stringify(mine)
  const after = [...out.values()]
  if (JSON.stringify(after) !== before) writeMine(after)
  return res
}

// ---------- the sync's state, for the jukebox's panel ----------
export type SyncState = { status: 'local' | 'syncing' | 'synced' | 'error'; message: string }
let state: SyncState = { status: 'local', message: '' }
const listeners = new Set<(s: SyncState) => void>()
export const syncState = () => state
export function setSyncState(s: SyncState) { state = s; listeners.forEach(fn => fn(s)) }
export function subscribeSyncState(fn: (s: SyncState) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

const message = (e: unknown) => (typeof e === 'object' && e && 'message' in e && typeof e.message === 'string' ? e.message : e instanceof Error ? e.message : '')
const code = (e: unknown) => (typeof e === 'object' && e && 'code' in e && typeof e.code === 'string' ? e.code : '')
export const isSongServerMissing = (e: unknown) => code(e) === 'PGRST202' || code(e) === '42883' || /could not find the function|does not exist/i.test(message(e))
export function songErrorMessage(e: unknown): string {
  const m = message(e)
  if (isSongServerMissing(e)) return 'O servidor ainda não guarda músicas (falta aplicar a migração). Ficam neste navegador.'
  if (/failed to fetch|network|load failed|fetch failed|timeout/i.test(m) || e instanceof TypeError) return 'Sem conexão com o servidor. Ficam neste navegador.'
  if (m.includes('ACCOUNT_REQUIRED')) return 'Entre com sua conta para guardar as músicas nela.'
  if (m.includes('ADMIN_REQUIRED')) return 'Só o admin vê as músicas de todos.'
  if (m.includes('TOO_MANY_SONGS')) return 'A sua conta já tem 200 músicas: apague alguma para guardar outra.'
  if (m.includes('SONG_TOO_LARGE')) return 'Uma música ficou grande demais para guardar na conta.'
  if (m.includes('INVALID_SONG')) return 'Não foi possível ler uma das músicas.'
  return m || 'Não foi possível sincronizar as músicas.'
}

// keeps the library in step with the account while this player is signed in (null: songs stay in this browser):
// once now, a moment after each change here, and when the tab comes back (at most every 30 s)
export function startSongSync(user: string | null, api: SongApi = songApi): () => void {
  if (!user) { setSyncState({ status: 'local', message: '' }); return () => {} }
  let running = false, again = false, stopped = false, last = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  const run = async () => {
    if (stopped) return
    if (running) { again = true; return }
    running = true; last = Date.now()
    setSyncState({ status: 'syncing', message: '' })
    try {
      const r = await syncSongs(user, api)
      if (!stopped) setSyncState({ status: 'synced', message: r.copies.length ? `Mudou aqui e em outro aparelho: a versão daqui ficou como “${r.copies.join('”, “')}”.` : '' })
    } catch (e) {
      if (!stopped) setSyncState({ status: 'error', message: songErrorMessage(e) })
    } finally {
      running = false
      if (again && !stopped) { again = false; void run() }
    }
  }
  const soon = () => {
    const p = loadPending()
    if (!p.saved.length && !p.deleted.length) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timer = null; void run() }, 1500)
  }
  const back = () => { if (document.visibilityState === 'visible' && Date.now() - last > 30_000) void run() }
  window.addEventListener(LIBRARY_EVENT, soon)
  document.addEventListener('visibilitychange', back)
  void run()
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
    window.removeEventListener(LIBRARY_EVENT, soon)
    document.removeEventListener('visibilitychange', back)
  }
}
