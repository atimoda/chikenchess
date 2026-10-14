import type { OnlineFriend, OnlineRoom } from './types'

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

export function isAlreadyInRoom(cause: unknown): boolean {
  return Boolean(cause && typeof cause === 'object' && 'message' in cause && String(cause.message).includes('ALREADY_IN_ROOM'))
}

export function roomErrorMessage(cause: unknown): string | null {
  const raw = cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : ''
  if (isAlreadyInRoom(cause)) return 'You already have a room. Return to it or join another room to switch automatically.'
  if (raw.includes('ACTIVE_MATCH')) return 'You have a game in progress. Finish or resign before joining another room.'
  if (raw.includes('ROOM_FULL')) return 'This room already has two players. Choose another room or wait for a spot to open.'
  if (raw.includes('ROOM_CLOSED')) return 'This room has started a game or has been closed.'
  if (raw.includes('ROOM_NOT_FOUND')) return 'Room not found. Check the code or invitation.'
  if (raw.includes('INVALID_KIT')) return 'Selected kit is not available online. Please choose another kit.'
  return null
}
