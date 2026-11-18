'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { bindLobbyAudioUnlock, playLobbyJoinSound } from '@/components/online/lobby-audio'
import { getOnlineClient, onlineRpc } from '@/lib/online/client'
import { acceptedFriendNames } from '@/lib/online/lobby-updates'
import type { OnlineFriend } from '@/lib/online/types'
import { INVITE_NOTICE_MS, freshInvites, inviteHref, inviteKey, inviteMessage, inviteMissing, listInvites, loadSeenInvites, saveSeenInvites } from '@/lib/online/invites'

// a notice may carry a link (an invite's Entrar) and stay longer than the usual 6 seconds
export type OnlineNotice = { id: number; message: string; action?: { label: string; href: string } }
export type NotifyOptions = { action?: OnlineNotice['action']; ms?: number }
// a server without the invites migration is not asked again on this page
let invitesMissing = false

let notificationChannelSequence = 0

export function useOnlineNotifications(userId: string | null) {
  const [notices, setNotices] = useState<OnlineNotice[]>([])
  const sequence = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setNotices((current) => current.filter((notice) => notice.id !== id))
  }, [])
  const notify = useCallback((message: string, options?: NotifyOptions) => {
    const id = ++sequence.current
    setNotices((current) => [...current, { id, message, action: options?.action }].slice(-3))
    timers.current.set(id, setTimeout(() => dismiss(id), options?.ms ?? 6000))
  }, [dismiss])

  useEffect(() => {
    bindLobbyAudioUnlock()
  }, [])

  useEffect(() => {
    setNotices([])
    const pendingTimers = timers.current
    for (const timer of pendingTimers.values()) clearTimeout(timer)
    pendingTimers.clear()
    return () => { for (const timer of pendingTimers.values()) clearTimeout(timer); pendingTimers.clear() }
  }, [userId])

  useEffect(() => {
    const online = getOnlineClient()
    if (!userId || !online) return
    let active = true
    let revision = 0
    let hasSubscribedOnce = false
    let isSubscribed = false
    let previous: OnlineFriend[] | null = null
    const refresh = async () => {
      const request = ++revision
      const { data } = await online.auth.getSession()
      if (!active || data.session?.user.id !== userId) return
      const next = await onlineRpc<OnlineFriend[]>('online_friends', { p_action: 'list' })
      if (!active || request !== revision) return
      const accepted = acceptedFriendNames(previous, next || [], userId)
      if (accepted.length) playLobbyJoinSound()
      for (const name of accepted) notify(`${name} aceitou seu pedido de amizade.`)
      previous = next || []
    }
    // invites from friends: each one announced once on this browser, with a link to their lobby
    const seen = loadSeenInvites(userId)
    const refreshInvites = async () => {
      if (invitesMissing) return
      const { data } = await online.auth.getSession()
      if (!active || data.session?.user.id !== userId) return
      let list
      try { list = await listInvites() } catch (cause) { if (inviteMissing(cause)) invitesMissing = true; return }
      if (!active) return
      const fresh = freshInvites(list, seen)
      if (!fresh.length) return
      for (const invite of fresh) seen.add(inviteKey(invite))
      saveSeenInvites(userId, seen)
      playLobbyJoinSound()
      for (const invite of fresh.slice(0, 3)) notify(inviteMessage(invite), { action: { label: 'Entrar', href: inviteHref(invite, window.location.origin) }, ms: INVITE_NOTICE_MS })
    }
    // Reconnects compare the same baseline; an initial list never announces old friends.
    const update = () => { void refresh().catch(() => {}); void refreshInvites().catch(() => {}) }
    update()
    const channel = online.channel(`social-notices:${userId}:${++notificationChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_social_updates', filter: `user_id=eq.${userId}` }, update)
      .subscribe((status) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          isSubscribed = true
          if (hasSubscribedOnce) update()
          hasSubscribedOnce = true
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          isSubscribed = false
        }
      })
    const onVisible = () => { if (document.visibilityState === 'visible' && !isSubscribed) update() }
    window.addEventListener('online', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      revision += 1
      window.removeEventListener('online', update)
      document.removeEventListener('visibilitychange', onVisible)
      void online.removeChannel(channel)
    }
  }, [userId, notify])
  return { notices, notify, dismiss }
}
