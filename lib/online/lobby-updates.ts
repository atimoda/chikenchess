import type { OnlineFriend, OnlineRoom, PublicRoom, RunningGame } from './types'
import { t } from '@/lib/i18n'

/** Keep the occupied lobby accessible even if private, full or absent from the directory. */
export function mapLobbyRooms(rooms: readonly PublicRoom[], room: OnlineRoom | null, userId: string | null) {
  const member = room?.status !== 'closed' && room?.members.some(item => item.user_id === userId)
  if (!room || !member) return { ownCode: null, entries: [...rooms] }
  const own: PublicRoom = { room_id: room.id, code: room.code, creator_name: room.members.find(item => item.user_id === room.host_id)?.profile.display_name ?? room.members[0]?.profile.display_name ?? 'Lobby', players: room.members.length }
  return { ownCode: room.code, entries: [own, ...rooms.filter(item => item.code !== room.code)] }
}

/** Only a lobby observed before its start can open a new game automatically. */
export function startedRoomMatch(previous: OnlineRoom | null, next: OnlineRoom | null, userId: string | null): string | null {
  if (!previous || !next || !userId || previous.id !== next.id || previous.status !== 'open' || previous.match_id || next.status !== 'playing' || !next.match_id) return null
  return previous.members.some(member => member.user_id === userId) && next.members.some(member => member.user_id === userId) ? next.match_id : null
}

/** Initial snapshots establish a baseline; only later transitions announce activity. */
export function roomArrivalNames(previous: OnlineRoom | null, next: OnlineRoom | null, userId: string | null): string[] {
  if (!previous || !next || previous.id !== next.id || next.host_id !== userId) return []
  const known = new Set(previous.members.map((member) => member.user_id))
  return next.members.filter((member) => member.user_id !== userId && !known.has(member.user_id)).map((member) => member.profile.display_name)
}

export function acceptedFriendNames(previous: OnlineFriend[] | null, next: OnlineFriend[], userId: string): string[] {
  if (!previous) return []
  const pending = new Set(previous.filter((friend) => friend.sender_id === userId && friend.status === 'pending').map((friend) => friend.id))
  return next.filter((friend) => friend.status === 'accepted' && pending.has(friend.id)).map((friend) => friend.profile.display_name)
}

export function yourTurnGameOpponents(previous: RunningGame[] | null, next: RunningGame[], visibleMatchId?: string | null): string[] {
  if (!previous) return []
  const prevById = new Map(previous.map((game) => [game.id, game]))
  return next
    .filter((game) => {
      if (game.turn !== game.color) return false
      if (visibleMatchId && game.id === visibleMatchId) return false
      const before = prevById.get(game.id)
      return !before || before.turn !== before.color
    })
    .map((game) => game.opponent.display_name)
}

export function isAlreadyInRoom(cause: unknown): boolean {
  return Boolean(cause && typeof cause === 'object' && 'message' in cause && String(cause.message).includes('ALREADY_IN_ROOM'))
}

export function roomErrorMessage(cause: unknown): string | null {
  const raw = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : ''
  if (isAlreadyInRoom(cause)) return t('You already have a room. Return to it or join another room to switch automatically.')
  if (raw.includes('ACTIVE_MATCH')) return t('You have a game in progress. Finish or resign before joining another room.')
  if (raw.includes('ROOM_FULL')) return t('This room already has two players. Choose another room or wait for a spot to open.')
  if (raw.includes('ROOM_CLOSED')) return t('This room has started a game or has been closed.')
  if (raw.includes('ROOM_NOT_FOUND')) return t('Room not found. Check the code or invitation.')
  if (raw.includes('INVALID_KIT')) return t('Selected kit is not available online. Please choose another kit.')
  return null
}

export type DirectoryChange = { kind: 'upsert'; room: PublicRoom } | { kind: 'delete'; room_id?: string }
const DIRECTORY_LIMIT = 50

/** New rooms go on top (newest first); updates keep their place. */
export function applyDirectoryChange(rooms: PublicRoom[], change: DirectoryChange): PublicRoom[] {
  if (change.kind === 'delete') return rooms.filter(room => room.room_id !== change.room_id)
  const { room_id, code, creator_name, players } = change.room
  const index = rooms.findIndex(room => room.room_id === room_id)
  if (index >= 0) return rooms.map((room, i) => i === index ? { ...room, code, creator_name, players } : room)
  return [{ room_id, code, creator_name, players, created_at: new Date().toISOString() }, ...rooms].slice(0, DIRECTORY_LIMIT)
}
