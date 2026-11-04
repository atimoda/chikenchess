// The Pátios (lobbies) in the database: supabase/migrations/202611030001_patio_lobbies.sql. Every call goes through
// a security definer function that checks who may do what; this file only names them, turns their rows into the
// game's shapes and their errors into Portuguese.
import { getOnlineClient, onlineConfigured, onlineRpc } from '@/lib/online/client'
import { normalizeLayout, type PatioLayout } from './layout'

export const patioOnlineAvailable = () => onlineConfigured && !!getOnlineClient()

export type PatioPerson = {
  userId: string
  name: string
  points: number
  goldenEggs: number
  wins: number
  editedAt: string | null
  playedAt: string | null
}

export type PatioLobbyInfo = {
  id: string
  name: string | null
  revision: number
  creatorId: string | null
  creatorName: string | null
  godparentId: string | null
  savedBy: string | null
  isDefault: boolean
  editors: string[]
  createdAt: string | null
  updatedAt: string | null
  lastEditedAt: string | null
  lastPlayedAt: string | null
  favorite: boolean
  canEdit: boolean
  // how many players favourited it; mine: I created, saved, named or edited it
  favorites: number
  // how many signed-in players ever played it
  plays: number
  mine: boolean
}
export type PatioLobby = PatioLobbyInfo & { layout: PatioLayout | null; people: PatioPerson[] }

type Row = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' ? v : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0)

function info(r: Row): PatioLobbyInfo {
  return {
    id: String(r.id), name: str(r.name), revision: num(r.revision),
    creatorId: str(r.creator_id), creatorName: str(r.creator_name), godparentId: str(r.godparent_id), savedBy: str(r.saved_by),
    isDefault: r.is_default === true, editors: Array.isArray(r.editors) ? r.editors.filter((x): x is string => typeof x === 'string') : [],
    createdAt: str(r.created_at), updatedAt: str(r.updated_at), lastEditedAt: str(r.last_edited_at), lastPlayedAt: str(r.last_played_at),
    favorite: r.favorite === true, canEdit: r.can_edit === true, favorites: num(r.favorites), plays: num(r.plays), mine: r.mine === true,
  }
}
function lobby(r: Row | null): PatioLobby | null {
  if (!r || typeof r !== 'object') return null
  const people = Array.isArray(r.people) ? (r.people as Row[]).map(p => ({
    userId: String(p.user_id), name: str(p.display_name) ?? 'Jogador', points: num(p.points), goldenEggs: num(p.golden_eggs), wins: num(p.wins),
    editedAt: str(p.edited_at), playedAt: str(p.played_at),
  })) : []
  return { ...info(r), layout: normalizeLayout(r.layout), people }
}

// Egress: with the revision this browser already holds, the server leaves the layout out (layout: null here) and
// sends only the rest (names, people, favourites, plays). A server without migration 202611040001 does not know
// the extra argument: the call is repeated without it, once, and the full row is read from then on.
let knownRevisionUnsupported = false
async function withKnownRevision(name: string, args: Record<string, unknown>, known: Record<string, unknown> | null) {
  if (!known || knownRevisionUnsupported) return onlineRpc<Row | null>(name, args)
  try { return await onlineRpc<Row | null>(name, { ...args, ...known }) } catch (e) {
    if (!isPatioServerMissing(e)) throw e
    knownRevisionUnsupported = true
    return onlineRpc<Row | null>(name, args)
  }
}
const knownRevision = (revision?: number | null) => (typeof revision === 'number' && revision > 0 ? revision : null)
/** knownRevision: the revision whose layout this browser has (then `layout` is null when it is still current). */
export const fetchPatioLobby = async (id: string, known?: number | null) => {
  const rev = knownRevision(known)
  return lobby(await withKnownRevision('patio_lobby_get', { p_id: id }, rev ? { p_known_revision: rev } : null))
}
/** known: the default lobby this browser keeps (then `layout` is null when it is still that lobby at that revision). */
export const fetchDefaultPatio = async (known?: { id: string | null; revision: number } | null) => {
  const rev = knownRevision(known?.revision)
  return lobby(await withKnownRevision('patio_default', {}, known?.id && rev ? { p_known_id: known.id, p_known_revision: rev } : null))
}
export async function savePatioLobby(id: string, layout: PatioLayout, revision: number) {
  const r = await onlineRpc<Row>('patio_lobby_save', { p_id: id, p_layout: layout, p_revision: revision })
  return { revision: num(r.revision), updatedAt: str(r.updated_at) }
}
export const renamePatioLobby = async (id: string, name: string) => info(await onlineRpc<Row>('patio_lobby_rename', { p_id: id, p_name: name }))
export const favoritePatioLobby = (id: string, on: boolean) => onlineRpc<boolean>('patio_lobby_favorite', { p_id: id, p_on: on })
export const playedPatioLobby = (id: string) => onlineRpc<null>('patio_lobby_played', { p_id: id })
export const listPatioLobbies = async (all: boolean) => ((await onlineRpc<Row[] | null>('patio_lobby_list', { p_all: all })) ?? []).map(info)
export const deletePatioLobby = (id: string) => onlineRpc<null>('patio_lobby_delete', { p_id: id })
export const setDefaultPatioLobby = (id: string) => onlineRpc<null>('patio_lobby_set_default', { p_id: id })
// the lobby panel's "Edit mode" column (the creator or an admin): who besides the creator may edit
export const setPatioLobbyEditors = async (id: string, editors: string[]) => info(await onlineRpc<Row>('patio_lobby_set_editors', { p_lobby_id: id, p_editors: editors }))
export const duplicatePatioLobby = async (id: string, name: string) => info(await onlineRpc<Row>('patio_lobby_duplicate', { p_id: id, p_name: name }))

// an unnamed lobby is deleted 30 days after it was last edited or played
export const UNSAVED_DAYS = 30
export function unsavedDaysLeft(l: Pick<PatioLobbyInfo, 'lastEditedAt' | 'lastPlayedAt' | 'createdAt'>, now = Date.now()) {
  const last = Math.max(...[l.lastEditedAt, l.lastPlayedAt, l.createdAt].map(t => (t ? Date.parse(t) : 0)))
  return Math.max(0, Math.ceil(UNSAVED_DAYS - (now - last) / 86400000))
}

const message = (e: unknown) => (typeof e === 'object' && e && 'message' in e && typeof e.message === 'string' ? e.message : e instanceof Error ? e.message : '')
const code = (e: unknown) => (typeof e === 'object' && e && 'code' in e && typeof e.code === 'string' ? e.code : '')
export const isPatioConflict = (e: unknown) => message(e).includes('PATIO_CONFLICT')
// the server has no Pátios yet (migration not applied) or cannot be reached: work stays in this browser
export const isPatioServerMissing = (e: unknown) => code(e) === 'PGRST202' || code(e) === '42883' || /could not find the function|does not exist/i.test(message(e))
export const isPatioOffline = (e: unknown) => /failed to fetch|network|load failed|fetch failed|timeout/i.test(message(e)) || (e instanceof TypeError)

export function patioErrorMessage(e: unknown): string {
  const m = message(e)
  if (isPatioServerMissing(e)) return 'O servidor ainda não tem os Pátios (falta aplicar a migração). Ficou salvo neste navegador.'
  if (isPatioOffline(e)) return 'Sem conexão com o servidor. Ficou salvo neste navegador.'
  if (m.includes('PATIO_CONFLICT')) return 'Alguém salvou outra versão deste Pátio enquanto você editava.'
  if (m.includes('ACCOUNT_REQUIRED')) return 'Entre com sua conta para isso.'
  if (m.includes('UNAUTHORIZED')) return 'Entre para salvar no servidor. Ficou salvo neste navegador.'
  if (m.includes('ADMIN_REQUIRED')) return 'Só o admin pode fazer isso.'
  if (m.includes('PATIO_EDIT_FORBIDDEN')) return 'Você não tem permissão para editar este Pátio.'
  if (m.includes('PATIO_RENAME_FORBIDDEN')) return 'Só o criador ou o padrinho deste Pátio podem renomeá-lo.'
  if (m.includes('PATIO_DELETE_FORBIDDEN')) return 'Só quem criou ou salvou este Pátio pode apagá-lo.'
  if (m.includes('PATIO_IS_DEFAULT')) return 'Este é o Pátio padrão: escolha outro padrão antes de apagá-lo.'
  if (m.includes('PATIO_NOT_FOUND')) return 'Este Pátio não existe mais no servidor.'
  if (m.includes('PATIO_EDITORS_FORBIDDEN')) return 'Só o criador deste Pátio (ou o admin) escolhe quem edita.'
  if (m.includes('TOO_MANY_EDITORS')) return 'No máximo 100 pessoas podem editar um Pátio.'
  if (m.includes('INVALID_NAME')) return 'O nome precisa ter de 1 a 60 letras.'
  if (m.includes('LAYOUT_TOO_LARGE')) return 'Este Pátio ficou grande demais para salvar. Tire alguns elementos.'
  if (m.includes('INVALID_LAYOUT')) return 'Não foi possível ler este Pátio.'
  return m || 'Não foi possível completar a ação. Tente novamente.'
}
