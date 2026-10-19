'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { calculateRank, normalizePlayerProfile, savePlayerProfile, type PlayerProfile } from '@/lib/game-progression'
import type { OnlineProfile } from '@/lib/online/types'
import { cacheLocalProfile, cacheOnlineProfile, getOnlineClient, onlineConfigured, onlineErrorMessage, onlineRpc, preserveProfileBackup, readCachedLocalProfile, readCachedOnlineProfile, readLocalProfile, readLocalProfileOwner, requireOnlineClient, samePlayerProfileContent, setLocalProfileOwner } from '@/lib/online/client'
import { AUTH_CALLBACK_CHANNEL, authCallbackMessage, completeAuthCallback, readAuthCallback } from '@/lib/online/auth-callback'
import { LoginDialog } from './login-dialog'
import { useOnlineNotifications } from '@/hooks/use-online-notifications'
import { X } from 'lucide-react'

/* global Response, CustomEvent, Event, BroadcastChannel */

export interface MigrationSummary {
  eggs: number
  points: number
  friends: number
}

export interface PendingTransferData {
  sourceProfile: PlayerProfile
  sourceFriendsCount: number
}

interface GuestTransfer {
  sourceUserId: string
  sourceAccessToken: string
  sourceProfile: PlayerProfile
  sourceFriendsCount: number
}

interface OwnedProfile { userId: string; profile: PlayerProfile }

export interface OnlineContextValue {
  user: User | null
  profile: OnlineProfile | null
  configured: boolean
  loading: boolean
  error: string | null
  ensureGuest: () => Promise<User>
  refreshProfile: (displayName?: string) => Promise<OnlineProfile | null>
  signOut: () => Promise<void>
  openLogin: () => void
  notify: (message: string) => void
  /** Capture the source session only in memory before any identity change. */
  prepareSignIn: () => Promise<void>
  pendingTransfer: PendingTransferData | null
  resolveProfileTransfer: (choice?: 'source' | 'target' | 'merge') => Promise<MigrationSummary | null>
}

const OnlineContext = createContext<OnlineContextValue | null>(null)

export function useOnline(): OnlineContextValue {
  const value = useContext(OnlineContext)
  if (!value) throw new Error('useOnline precisa de OnlineProvider.')
  return value
}

export function OnlineProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const { notices, notify, dismiss } = useOnlineNotifications(user?.id || null)
  const [profile, setProfile] = useState<OnlineProfile | null>(null)
  const [loading, setLoading] = useState(onlineConfigured)
  const [error, setError] = useState<string | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [pendingTransfer, setPendingTransfer] = useState<PendingTransferData | null>(null)
  const userRef = useRef<User | null>(null)
  const guestRequest = useRef<Promise<User> | null>(null)
  const transferRef = useRef<GuestTransfer | null>(null)
  const profileRequest = useRef(0)
  const profileRef = useRef<OnlineProfile | null>(null)
  const ownerRef = useRef<string | null>(null)
  const ownerInitialized = useRef(false)
  const mirroring = useRef(false)
  const syncRequest = useRef<Promise<void> | null>(null)
  const pendingSync = useRef<OwnedProfile | null>(null)

  const mirrorProfile = useCallback((next: PlayerProfile, owner: string | null) => {
    const current = readLocalProfile()
    if (!samePlayerProfileContent(current, next)) preserveProfileBackup(ownerRef.current, current)
    ownerRef.current = owner
    setLocalProfileOwner(owner)
    cacheLocalProfile(owner, next)
    mirroring.current = true
    try { savePlayerProfile(next) } catch { /* The confirmed identity cache still holds the profile. */ }
    finally { mirroring.current = false }
  }, [])

  const applyProfile = useCallback((next: OnlineProfile) => {
    if (userRef.current?.id !== next.id) return
    profileRef.current = next
    cacheOnlineProfile(next)
    setProfile(next)
    const transferring = transferRef.current && transferRef.current.sourceUserId !== next.id
    if (!transferring) {
      mirrorProfile(next.profile, next.id)
      if (userRef.current.is_anonymous) cacheLocalProfile(null, next.profile)
    }
  }, [mirrorProfile])

  const adoptUser = useCallback((next: User | null) => {
    if (!ownerInitialized.current) {
      ownerRef.current = readLocalProfileOwner()
      ownerInitialized.current = true
    }
    if (userRef.current?.id !== next?.id) {
      const local = readLocalProfile()
      preserveProfileBackup(ownerRef.current, local)
      cacheLocalProfile(ownerRef.current, local)
      if (!ownerRef.current || userRef.current?.is_anonymous) cacheLocalProfile(null, local)
      profileRequest.current += 1
      pendingSync.current = null
      profileRef.current = next ? readCachedOnlineProfile(next.id) : null
      setProfile(null)
    }
    if (!next && ownerRef.current) mirrorProfile(readCachedLocalProfile(null) || normalizePlayerProfile(null), null)
    const prev = userRef.current
    userRef.current = next
    if (
      prev !== next &&
      (prev?.id !== next?.id ||
        prev?.is_anonymous !== next?.is_anonymous ||
        prev?.email !== next?.email ||
        prev?.app_metadata?.access_level !== next?.app_metadata?.access_level ||
        prev?.user_metadata?.full_name !== next?.user_metadata?.full_name ||
        prev?.user_metadata?.name !== next?.user_metadata?.name)
    ) {
      setUser(next)
    }
    const source = transferRef.current
    if (source && next && !next.is_anonymous) {
      if (source.sourceUserId === next.id) {
        transferRef.current = null
        setPendingTransfer(null)
      } else {
        setPendingTransfer({
          sourceProfile: source.sourceProfile,
          sourceFriendsCount: source.sourceFriendsCount ?? 0,
        })
      }
    }
  }, [mirrorProfile])

  const flushLocalProfile = useCallback(async () => {
    // An older identity may still have a request in flight. Drain its promise
    // before starting this account's queue, without consuming that queue.
    while (syncRequest.current) {
      const waitingFor = syncRequest.current
      const waitingUser = userRef.current?.id
      try { await waitingFor } catch (cause) {
        if (userRef.current?.id === waitingUser) throw cause
      }
    }
    const current = userRef.current
    if (!current || ownerRef.current !== current.id || !profileRef.current || transferRef.current?.sourceUserId && transferRef.current.sourceUserId !== current.id) return
    if (!pendingSync.current) pendingSync.current = { userId: current.id, profile: readLocalProfile() }
    const operation = (async () => {
      while (pendingSync.current?.userId === current.id && userRef.current?.id === current.id) {
        const proposal = pendingSync.current.profile
        pendingSync.current = null
        const confirmed = profileRef.current
        if (!confirmed || confirmed.id !== current.id || samePlayerProfileContent(proposal, confirmed.profile)) continue
        cacheLocalProfile(current.id, proposal)
        try {
          const next = await onlineRpc<OnlineProfile>('online_sync_profile', { p_expected_updated_at: confirmed.profile.updatedAt, p_profile: proposal, p_expected_user_id: current.id })
          if (userRef.current?.id !== current.id) return
          profileRef.current = next
          cacheOnlineProfile(next)
          setProfile(next)
          // Keep any later campaign save intact until its own CAS completes.
          if (!pendingSync.current) applyProfile(next)
        } catch (cause) {
          // Saves can replace this ref while the RPC is awaiting a response.
          const queued = pendingSync.current as OwnedProfile | null
          const unsaved = queued?.userId === current.id ? queued.profile : proposal
          preserveProfileBackup(current.id, unsaved)
          cacheLocalProfile(current.id, unsaved)
          if (userRef.current?.id !== current.id) return
          if (queued?.userId === current.id) pendingSync.current = null
          const message = onlineErrorMessage(cause)
          if (message.includes('PROFILE_CONFLICT')) {
            const remote = await onlineRpc<OnlineProfile>('online_profile', { p_local_profile: null, p_display_name: null, p_expected_user_id: current.id })
            applyProfile(remote)
            throw new Error('O perfil mudou em outro aparelho ou partida. Recarregamos a cópia do servidor e guardamos o progresso local em um backup.')
          }
          throw cause
        }
      }
    })()
    syncRequest.current = operation
    try { await operation } finally { if (syncRequest.current === operation) syncRequest.current = null }
  }, [applyProfile])

  const refreshProfile = useCallback(async (displayName?: string) => {
    const online = requireOnlineClient()
    const { data, error: sessionError } = await online.auth.getSession()
    if (sessionError) throw sessionError
    const current = data.session?.user
    if (!current) return null
    adoptUser(current)
    await flushLocalProfile()
    const request = ++profileRequest.current
    const local = ownerRef.current === current.id || !ownerRef.current && current.is_anonymous
      ? readLocalProfile()
      : readCachedLocalProfile(current.id) || (current.is_anonymous ? readCachedLocalProfile(null) : null) || normalizePlayerProfile(null)
    const localOwned = ownerRef.current === current.id || !ownerRef.current && current.is_anonymous
    const priorConfirmed = profileRef.current
    const next = await onlineRpc<OnlineProfile>('online_profile', {
      p_local_profile: local,
      p_display_name: displayName?.trim() || null,
      p_expected_user_id: current.id,
    })
    if (userRef.current?.id !== current.id) throw new Error('A conta mudou durante a ação. Tente novamente com a conta atual.')
    if (request === profileRequest.current && userRef.current?.id === current.id) {
      const latest = readLocalProfile()
      if (localOwned && !samePlayerProfileContent(latest, local)) {
        // A campaign save made while the initial cloud query was in flight
        // must complete against its original CAS version before mirroring.
        profileRef.current = priorConfirmed || next
        ownerRef.current = current.id
        setLocalProfileOwner(current.id)
        cacheLocalProfile(current.id, latest)
        pendingSync.current = { userId: current.id, profile: latest }
        await flushLocalProfile()
      } else applyProfile(next)
      setError(null)
    }
    return next
  }, [adoptUser, applyProfile, flushLocalProfile])

  useEffect(() => {
    const onSave = (event: Event) => {
      if (mirroring.current) return
      const local = (event as CustomEvent<PlayerProfile>).detail
      if (!local || typeof local !== 'object') return
      if (!ownerInitialized.current) {
        ownerRef.current = readLocalProfileOwner()
        ownerInitialized.current = true
      }
      const previous = readCachedLocalProfile(ownerRef.current)
      if (previous && samePlayerProfileContent(previous, local)) return
      cacheLocalProfile(ownerRef.current, local)
      if (!ownerRef.current || userRef.current?.is_anonymous) cacheLocalProfile(null, local)
      if (userRef.current?.id !== ownerRef.current || transferRef.current && transferRef.current.sourceUserId !== userRef.current?.id) return
      pendingSync.current = { userId: userRef.current.id, profile: local }
      void flushLocalProfile().catch((cause) => setError(onlineErrorMessage(cause)))
    }
    window.addEventListener('chickenchess:profile-saved', onSave)
    const onReconnect = () => { if (userRef.current) void refreshProfile().catch((cause) => setError(onlineErrorMessage(cause))) }
    window.addEventListener('online', onReconnect)
    return () => { window.removeEventListener('chickenchess:profile-saved', onSave); window.removeEventListener('online', onReconnect) }
  }, [flushLocalProfile, refreshProfile])

  useEffect(() => {
    const online = getOnlineClient()
    if (!online) return
    let active = true
    let authRevision = 0
    const { data: subscription } = online.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      authRevision += 1
      adoptUser(session?.user || null)
      setLoading(false)
    })
    const revision = authRevision
    void online.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || revision !== authRevision) return
      if (sessionError) setError(onlineErrorMessage(sessionError))
      adoptUser(data.session?.user || null)
      setLoading(false)
    }).catch((cause) => { if (active) { setError(onlineErrorMessage(cause)); setLoading(false) } })
    return () => { active = false; subscription.subscription.unsubscribe() }
  }, [adoptUser])

  // Refresh server-owned application permissions without changing profile ownership.
  useEffect(() => {
    const online = getOnlineClient()
    if (!online || !user?.id || user.is_anonymous) return
    const id = user.id
    let active = true
    let revision = 0
    let lastCheckedAt = 0
    const refreshIdentity = () => {
      const now = Date.now()
      if (now - lastCheckedAt < 120_000) return
      lastCheckedAt = now
      const request = ++revision
      void online.auth.getUser().then(({ data, error: identityError }) => {
        if (!active || request !== revision || identityError || !data.user || data.user.id !== id || userRef.current?.id !== id) return
        const prev = userRef.current
        userRef.current = data.user
        if (
          prev?.is_anonymous !== data.user.is_anonymous ||
          prev?.email !== data.user.email ||
          prev?.app_metadata?.access_level !== data.user.app_metadata?.access_level ||
          prev?.user_metadata?.full_name !== data.user.user_metadata?.full_name ||
          prev?.user_metadata?.name !== data.user.user_metadata?.name
        ) {
          setUser(data.user)
        }
      }).catch(() => { /* Offline sessions retain ordinary profile access; admin writes are rechecked remotely. */ })
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refreshIdentity() }
    refreshIdentity()
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; document.removeEventListener('visibilitychange', onVisible) }
  }, [user?.id, user?.is_anonymous])

  useEffect(() => {
    if (!user?.id) return
    let active = true
    setLoading(true)
    void refreshProfile().catch((cause) => {
      if (active) setError(onlineErrorMessage(cause))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user?.id, user?.is_anonymous, refreshProfile])

  // An OAuth popup writes the ordinary Supabase session; the opener rechecks it.
  useEffect(() => {
    const callback = readAuthCallback(window.location.search, window.location.hash)
    if (!onlineConfigured || (!callback.requested && !(window.opener && callback.error))) return
    let active = true
    void completeAuthCallback(requireOnlineClient().auth, callback).then((message) => {
      if (!active) return
      window.opener?.postMessage(message, window.location.origin)
      const channel = new BroadcastChannel(AUTH_CALLBACK_CHANNEL)
      channel.postMessage(message)
      channel.close()
      window.close()
    }).catch((cause) => {
      if (!active) return
      const message = authCallbackMessage(callback, { message: onlineErrorMessage(cause) }, false)
      window.opener?.postMessage(message, window.location.origin)
      const channel = new BroadcastChannel(AUTH_CALLBACK_CHANNEL)
      channel.postMessage(message)
      channel.close()
      window.close()
    })
    return () => { active = false }
  }, [])

  const ensureGuest = useCallback(async () => {
    if (guestRequest.current) return guestRequest.current
    const request = (async () => {
      const online = requireOnlineClient()
      const { data, error: sessionError } = await online.auth.getSession()
      if (sessionError) throw sessionError
      if (data.session?.user) { adoptUser(data.session.user); return data.session.user }
      const { data: guest, error: guestError } = await online.auth.signInAnonymously()
      if (guestError) throw guestError
      if (!guest.user) throw new Error('Não foi possível criar seu perfil visitante.')
      adoptUser(guest.user)
      return guest.user
    })()
    guestRequest.current = request
    try { return await request } finally { guestRequest.current = null }
  }, [adoptUser])

  const prepareSignIn = useCallback(async () => {
    const current = await ensureGuest()
    preserveProfileBackup(current.id)
    if (!current.is_anonymous) return
    await flushLocalProfile()
    const source = await refreshProfile()
    const { data, error: sessionError } = await requireOnlineClient().auth.getSession()
    if (sessionError) throw sessionError
    if (!data.session || data.session.user.id !== current.id) return
    const sourceProfile = source?.profile || readLocalProfile()
    preserveProfileBackup(current.id, sourceProfile)
    let sourceFriendsCount = 0
    try {
      const friends = await onlineRpc<unknown[]>('online_friends', { p_action: 'list' })
      if (Array.isArray(friends)) sourceFriendsCount = friends.length
    } catch {
      /* offline or no friends */
    }
    transferRef.current = { sourceUserId: current.id, sourceAccessToken: data.session.access_token, sourceProfile, sourceFriendsCount }
  }, [ensureGuest, refreshProfile, flushLocalProfile])

  const resolveProfileTransfer = useCallback(async (_choice?: 'source' | 'target' | 'merge'): Promise<MigrationSummary | null> => {
    const source = transferRef.current
    if (!source) {
      await refreshProfile()
      return null
    }
    const { data, error: transferError } = await requireOnlineClient().functions.invoke<OnlineProfile>('profile-transfer', {
      timeout: 20000,
      body: { sourceAccessToken: source.sourceAccessToken, choice: 'target' },
    })
    if (transferError) {
      let message = 'Não foi possível transferir o perfil. Sua cópia de visitante continua guardada.'
      if ('context' in transferError && transferError.context instanceof Response) {
        const body = await transferError.context.json().catch(() => null)
        if (body?.code === 'ACTIVE_MATCH') message = 'Termine ou saia da partida ativa antes de transferir o perfil.'
        else if (body?.code === 'ACTIVE_ROOM') message = 'Saia da sala aberta antes de transferir o perfil. As cópias continuam guardadas.'
        else if (body?.code === 'HISTORY_CONFLICT') message = 'Essas contas já participaram da mesma partida e precisam permanecer separadas. As cópias dos dois perfis continuam guardadas.'
        else if (typeof body?.error === 'string') message = body.error
      }
      throw new Error(message)
    }

    const migratedEggs = source.sourceProfile.goldenEggs || 0
    const migratedPoints = source.sourceProfile.points || 0
    const migratedFriends = source.sourceFriendsCount || 0
    const addedHistorical = migratedEggs + migratedPoints

    const baseProfile = data?.profile || profileRef.current?.profile || readLocalProfile()
    const targetUserId = userRef.current?.id

    if (targetUserId) {
      const mergedPoints = (baseProfile.points || 0) + addedHistorical
      const mergedProfile: PlayerProfile = {
        ...baseProfile,
        points: mergedPoints,
        rank: calculateRank(mergedPoints),
        conqueredCityIds: Array.from(new Set([...(baseProfile.conqueredCityIds || []), ...(source.sourceProfile.conqueredCityIds || [])])),
        winsCount: (baseProfile.winsCount || 0) + (source.sourceProfile.winsCount || 0),
        updatedAt: Math.max(Date.now(), (baseProfile.updatedAt || 0) + 1),
      }

      try {
        const updated = await onlineRpc<OnlineProfile>('online_sync_profile', {
          p_expected_updated_at: baseProfile.updatedAt,
          p_profile: mergedProfile,
          p_expected_user_id: targetUserId,
        })
        applyProfile(updated)
      } catch {
        mirrorProfile(mergedProfile, targetUserId)
        if (data) applyProfile({ ...data, profile: mergedProfile })
        void flushLocalProfile().catch(() => {})
      }
    } else if (data) {
      applyProfile(data)
    }

    transferRef.current = null
    setPendingTransfer(null)
    return {
      eggs: migratedEggs,
      points: migratedPoints,
      friends: migratedFriends,
    }
  }, [refreshProfile, applyProfile, mirrorProfile, flushLocalProfile])

  const signOut = useCallback(async () => {
    preserveProfileBackup(ownerRef.current)
    await flushLocalProfile().catch((cause) => setError(onlineErrorMessage(cause)))
    const { error: signOutError } = await requireOnlineClient().auth.signOut()
    if (signOutError) throw signOutError
    transferRef.current = null
    setPendingTransfer(null)
    adoptUser(null)
    setError(null)
  }, [adoptUser, flushLocalProfile])

  const value: OnlineContextValue = {
    user, profile, configured: onlineConfigured, loading, error, ensureGuest, refreshProfile, signOut,
    openLogin: () => setLoginOpen(true), notify, prepareSignIn, pendingTransfer, resolveProfileTransfer,
  }

  return <OnlineContext.Provider value={value}>
    {children}
    <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-[160] mx-auto flex max-w-md flex-col gap-2">
      {notices.map((notice) => <div key={notice.id} className="pointer-events-auto flex items-start gap-3 rounded-lg border border-primary/50 bg-[#101713] p-4 text-sm text-white shadow-lg">
        <p className="min-w-0 flex-1 break-words">{notice.message}</p>
        <button type="button" aria-label="Fechar aviso" className="shrink-0 text-white/60 hover:text-white" onClick={() => dismiss(notice.id)}><X className="size-4" /></button>
      </div>)}
    </div>
    <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
  </OnlineContext.Provider>
}
