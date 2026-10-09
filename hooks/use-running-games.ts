'use client'

import { useEffect, useRef, useState } from 'react'
import { useOnline } from '@/components/online/online-provider'
import { getOnlineClient, onlineErrorMessage, onlineRpc } from '@/lib/online/client'
import type { RunningGame } from '@/lib/online/types'

let channelSequence = 0

/** Match membership survives lobby changes; recovering this list never navigates. */
export function useRunningGames() {
  const { user, configured } = useOnline()
  const userId = user?.id ?? null
  const [snapshot, setSnapshot] = useState<{ userId: string; games: RunningGame[]; error: string | null } | null>(null)
  const retry = useRef<() => void>(() => {})

  useEffect(() => {
    const client = getOnlineClient()
    if (!configured || !userId || !client) return
    let active = true
    let revision = 0
    const refresh = async () => {
      const request = ++revision
      try {
        const { data, error } = await client.auth.getSession()
        if (!active || data.session?.user.id !== userId) return
        if (error) throw error
        const games = await onlineRpc<RunningGame[]>('online_running_games')
        if (active && request === revision) setSnapshot({ userId, games: games ?? [], error: null })
      } catch (cause) {
        if (active && request === revision) setSnapshot(previous => ({
          userId, games: previous?.userId === userId ? previous.games : [], error: onlineErrorMessage(cause),
        }))
      }
    }
    const update = () => { void refresh() }
    retry.current = update
    update()
    const channel = client.channel(`running-games:${userId}:${++channelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_running_game_updates', filter: `user_id=eq.${userId}` }, update)
      .subscribe(status => { if (active && status === 'SUBSCRIBED') update() })
    const onVisible = () => { if (document.visibilityState === 'visible') update() }
    window.addEventListener('online', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      revision += 1
      retry.current = () => {}
      window.removeEventListener('online', update)
      document.removeEventListener('visibilitychange', onVisible)
      void client.removeChannel(channel)
    }
  }, [configured, userId])

  return {
    games: snapshot?.userId === userId ? snapshot.games : [],
    error: snapshot?.userId === userId ? snapshot.error : null,
    refresh: () => retry.current(),
  }
}
