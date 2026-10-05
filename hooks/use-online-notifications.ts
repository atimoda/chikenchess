'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getOnlineClient, onlineRpc } from '@/lib/online/client'
import { acceptedFriendNames } from '@/lib/online/lobby-updates'
import type { OnlineFriend } from '@/lib/online/types'

let notificationChannelSequence = 0

export function useOnlineNotifications(userId: string | null) {
  const [notices, setNotices] = useState<Array<{ id: number; message: string }>>([])
  const sequence = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())
  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setNotices((current) => current.filter((notice) => notice.id !== id))
  }, [])
  const notify = useCallback((message: string) => {
    const id = ++sequence.current
    setNotices((current) => [...current, { id, message }].slice(-3))
    timers.current.set(id, setTimeout(() => dismiss(id), 6000))
  }, [dismiss])

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
    let previous: OnlineFriend[] | null = null
    const refresh = async () => {
      const request = ++revision
      const { data } = await online.auth.getSession()
      if (!active || data.session?.user.id !== userId) return
      const next = await onlineRpc<OnlineFriend[]>('online_friends', { p_action: 'list' })
      if (!active || request !== revision) return
      for (const name of acceptedFriendNames(previous, next || [], userId)) notify(`${name} aceitou seu pedido de amizade.`)
      previous = next || []
    }
    // Reconnects compare the same baseline; an initial list never announces old friends.
    const update = () => { void refresh().catch(() => {}) }
    update()
    const channel = online.channel(`social-notices:${userId}:${++notificationChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_social_updates', filter: `user_id=eq.${userId}` }, update)
      .subscribe((status) => { if (active && status === 'SUBSCRIBED') update() })
    const onVisible = () => { if (document.visibilityState === 'visible') update() }
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
