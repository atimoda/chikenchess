// Friend invites: call an accepted friend into your lobby, the Pátio's live room or a 1v1 chess lobby.
// The server keeps one invite per friend for 10 minutes (supabase/migrations/202611180004_friend_invites.sql); the
// friend's page hears it through the social updates it already watches and shows a notice with a link to enter.
import { onlineRpc } from './client'

export type InviteKind = 'patio' | 'room'
export interface OnlineInvite {
  sender_id: string
  name: string
  kind: InviteKind
  // the Pátio (null: the default one) and the live room of the game server, or the chess lobby's code
  patio_id: string | null
  patio_name: string | null
  room: string | null
  created_at: string
}

export const INVITE_TTL_MS = 10 * 60_000
// a notice for an invite stays longer than the other ones, so it is not missed
export const INVITE_NOTICE_MS = 20_000
const SEEN_MAX = 50
const ROOM = /^[A-Za-z0-9_-]{1,64}$/

export const inviteKey = (invite: Pick<OnlineInvite, 'sender_id' | 'created_at'>) => `${invite.sender_id}:${invite.created_at}`

/** Where the invite leads: the Pátio (and its room, online) or the chess lobby. */
export function inviteHref(invite: Pick<OnlineInvite, 'kind' | 'patio_id' | 'room'>, origin = ''): string {
  if (invite.kind === 'room') return `${origin}/?room=${encodeURIComponent(invite.room ?? '')}`
  return patioInviteLink(invite.patio_id, invite.room, origin)
}

/** The link to a Pátio (null: the default one) and, when there is one, its live room. */
export function patioInviteLink(patioId: string | null, roomId: string | null, origin = ''): string {
  const query = new URLSearchParams()
  if (patioId) query.set('lobby', patioId)
  if (roomId && ROOM.test(roomId)) query.set('room', roomId)
  const search = query.toString()
  return `${origin}/patio${search ? `?${search}` : ''}`
}

export function inviteMessage(invite: Pick<OnlineInvite, 'name' | 'kind' | 'patio_name'>): string {
  const who = invite.name?.trim() || 'Um amigo'
  if (invite.kind === 'room') return `${who} chamou você para um lobby 1v1.`
  return invite.patio_name ? `${who} chamou você para o Pátio “${invite.patio_name}”.` : `${who} chamou você para o Pátio.`
}

/** The invites to announce: the ones not seen yet on this browser, from the last 10 minutes. */
export function freshInvites(list: readonly OnlineInvite[], seen: ReadonlySet<string>, now = Date.now()): OnlineInvite[] {
  return list.filter(invite => {
    const at = Date.parse(invite.created_at)
    return !seen.has(inviteKey(invite)) && Number.isFinite(at) && now - at < INVITE_TTL_MS
  })
}

const seenStorageKey = (userId: string) => `chickenchess:online:seen-invites:${userId}`
export function loadSeenInvites(userId: string): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(seenStorageKey(userId)) || '[]')
    return new Set(Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === 'string') : [])
  } catch { return new Set() }
}
export function saveSeenInvites(userId: string, seen: ReadonlySet<string>) {
  try { localStorage.setItem(seenStorageKey(userId), JSON.stringify([...seen].slice(-SEEN_MAX))) } catch { /* private mode: announced again on reload */ }
}

const errorCode = (cause: unknown) => (typeof cause === 'object' && cause ? String((cause as { code?: unknown }).code ?? '') : '')
const errorText = (cause: unknown) => (typeof cause === 'object' && cause && 'message' in cause ? String((cause as { message?: unknown }).message ?? '') : '')

/** A server without the invites migration: the function is not there. */
export function inviteMissing(cause: unknown): boolean {
  const code = errorCode(cause)
  return code === 'PGRST202' || code === '42883' || (/online_invite/.test(errorText(cause)) && /not find|does not exist/i.test(errorText(cause)))
}

export function inviteErrorMessage(cause: unknown): string {
  const text = errorText(cause)
  if (inviteMissing(cause)) return 'O convite ainda não chegou a este servidor.'
  if (/FRIEND_NOT_FOUND/.test(text)) return 'Só dá para chamar amigos aceitos.'
  if (/INVITE_TOO_SOON/.test(text)) return 'Convite já enviado. Espere alguns segundos para chamar de novo.'
  if (/UNAUTHORIZED|TRANSFERRED/.test(text)) return 'Entre na sua conta para chamar amigos.'
  return text || 'Não deu para enviar o convite. Tente de novo.'
}

export async function sendInvite(friendId: string, target: { kind: 'patio'; patioId: string | null; roomId: string | null } | { kind: 'room'; code: string }) {
  try {
    await onlineRpc('online_invite', target.kind === 'room'
      ? { p_action: 'send', p_friend: friendId, p_kind: 'room', p_room: target.code }
      : { p_action: 'send', p_friend: friendId, p_kind: 'patio', p_patio: target.patioId, p_room: target.roomId && ROOM.test(target.roomId) ? target.roomId : null })
  } catch (cause) {
    throw new Error(inviteErrorMessage(cause))
  }
}

export const listInvites = () => onlineRpc<OnlineInvite[] | null>('online_invite', { p_action: 'list' }).then(list => list ?? [])
