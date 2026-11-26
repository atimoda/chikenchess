'use client'

import { useEffect, useRef, useState } from 'react'
import { playLobbyJoinSound } from '@/components/online/lobby-audio'
import { useOnline } from '@/components/online/online-provider'
import { getOnlineClient, onlineErrorMessage, onlineRpc } from '@/lib/online/client'
import { yourTurnGameOpponents } from '@/lib/online/lobby-updates'
import type { RunningGame } from '@/lib/online/types'
import { t } from '@/lib/i18n'

let channelSequence = 0
// Set once the database rejects the delta call (not yet migrated).
let fullListOnly = false

/** The server omits actions for games whose updated_at the client already holds. */
async function loadRunningGames(cache: Map<string, RunningGame>): Promise<RunningGame[]> {
  let games: RunningGame[] | null = null
  if (!fullListOnly) {
    const known = Object.fromEntries([...cache.values()].filter(game => game.actions).map(game => [game.id, game.updated_at]))
    try {
      games = await onlineRpc<RunningGame[]>('online_running_games', { p_known: known })
    } catch (cause) {
      if ((cause as { code?: string })?.code !== 'PGRST202') throw cause
      fullListOnly = true
    }
  }
  if (fullListOnly) games = await onlineRpc<RunningGame[]>('online_running_games')
  return (games ?? []).map(game => {
    if (game.actions) return game
    const held = cache.get(game.id)
    return held?.updated_at === game.updated_at && held.actions ? { ...game, actions: held.actions } : game
  })
}

/** Match membership survives lobby changes; recovering this list never navigates. */
export function useRunningGames() {
  const { user, configured, notify } = useOnline()
  const userId = user?.id ?? null
  const [snapshot, setSnapshot] = useState<{ userId: string; games: RunningGame[]; error: string | null } | null>(null)
  const [retrying, setRetrying] = useState(false)
  const retry = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    const client = getOnlineClient()
    if (!configured || !userId || !client) return
    let active = true
    let revision = 0
    let hasSubscribedOnce = false
    let isSubscribed = false
    let previous: RunningGame[] | null = null
    const cache = new Map<string, RunningGame>()
    const refresh = async () => {
      const request = ++revision
      try {
        const { data, error } = await client.auth.getSession()
        if (error) throw error
        if (!active) return
        if (data.session?.user.id !== userId) throw new Error(t('A sessão online mudou. Entre novamente e tente carregar suas partidas.'))
        const list = await loadRunningGames(cache)
        if (active && request === revision) {
          cache.clear()
          for (const game of list) cache.set(game.id, game)
          const opponents = yourTurnGameOpponents(previous, list)
          if (opponents.length) {
            playLobbyJoinSound()
            for (const name of opponents) notify(t('Your turn against {name}.', { name }))
          }
          previous = list
          setSnapshot({ userId, games: list, error: null })
        }
      } catch (cause) {
        if (active && request === revision) setSnapshot(prev => ({
          userId, games: prev?.userId === userId ? prev.games : [], error: onlineErrorMessage(cause),
        }))
      }
    }
    const update = () => refresh()
    retry.current = update
    void update()
    const channel = client.channel(`running-games:${userId}:${++channelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_running_game_updates', filter: `user_id=eq.${userId}` }, update)
      .subscribe(status => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          isSubscribed = true
          if (hasSubscribedOnce) void update()
          hasSubscribedOnce = true
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          isSubscribed = false
        }
      })
    const onVisible = () => { if (document.visibilityState === 'visible' && !isSubscribed) void update() }
    window.addEventListener('online', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      revision += 1
      retry.current = async () => {}
      window.removeEventListener('online', update)
      document.removeEventListener('visibilitychange', onVisible)
      void client.removeChannel(channel)
    }
  }, [configured, userId, notify])

  const retryGames = async () => {
    setRetrying(true)
    try { await retry.current() } finally { setRetrying(false) }
  }

  return {
    games: snapshot?.userId === userId ? snapshot.games : [],
    error: snapshot?.userId === userId ? snapshot.error : null,
    refresh: retryGames,
    retrying,
  }
}
