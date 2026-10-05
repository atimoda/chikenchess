import type { OnlineFriend, OnlineRoom } from './types'

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
  if (isAlreadyInRoom(cause)) return 'Você já tem uma sala. Volte a ela ou entre em outra sala para trocar automaticamente.'
  if (raw.includes('ACTIVE_MATCH')) return 'Você tem uma partida em andamento. Conclua ou desista dela antes de entrar em outra sala.'
  if (raw.includes('ROOM_FULL')) return 'Esta sala já tem dois participantes. Escolha outra sala ou aguarde uma vaga.'
  if (raw.includes('ROOM_CLOSED')) return 'Esta sala já começou uma partida ou foi encerrada.'
  if (raw.includes('ROOM_NOT_FOUND')) return 'Sala não encontrada. Confira o código ou o convite.'
  return null
}
