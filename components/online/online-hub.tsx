'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Copy, DoorOpen, Globe2, Loader2, LogIn, Plus, RefreshCw, UserPlus, Users, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cities, getCityById } from '@/lib/cities-data'
import type { PlayerProfile } from '@/lib/game-progression'
import { getOnlineClient, ONLINE_CONFIGURATION_MESSAGE, onlineErrorMessage, onlineRpc, requireOnlineClient } from '@/lib/online/client'
import type { OnlineFriend, OnlineRoom, PublicRoom, RoomMember } from '@/lib/online/types'
import { cn } from '@/lib/utils'
import { useOnline } from './online-provider'
import { disposeLobbyAudio, playLobbyJoinSound, prepareLobbyAudio } from './lobby-audio'
import styles from './online-hub.module.css'
import { isAlreadyInRoom, roomArrivalNames, roomErrorMessage, startedRoomMatch } from '@/lib/online/lobby-updates'
import { ProfilePane } from './profile-pane'
import { useRunningGames } from '@/hooks/use-running-games'

export type OnlineHubTab = 'room' | 'rooms' | 'friends' | 'profile'
export interface OnlineHubProps {
  onMatch: (matchId: string) => void
  playerProfile: PlayerProfile | null
  inviteCode?: string | null
  /** Optional controlled popup; map buttons can open a specific initialTab. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialTab?: OnlineHubTab
  showMapRooms?: boolean
  showLaunchers?: boolean
  /** One-shot public room creation requested from a city on the map. */
  createRequest?: { id: number; cityId: string } | null
  onCreateRequestHandled?: (id: number) => void
}

const inputClass = 'h-10 min-w-0 rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary'
const DEFAULT_CITY_ID = 'random'
const shortRoomCode = (code: string) => code.replace(/\D/g, '').slice(0, 5).padEnd(5, '0')
type FriendAction = 'request' | 'accept' | 'reject' | 'cancel' | 'remove'
let friendChannelSequence = 0
let roomChannelSequence = 0

function useFriendList(active: boolean) {
  const { user, configured, ensureGuest } = useOnline()
  const [friends, setFriends] = useState<OnlineFriend[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const revision = useRef(0)
  const refresh = useCallback(async () => {
    const request = ++revision.current
    await ensureGuest()
    const next = await onlineRpc<OnlineFriend[]>('online_friends', { p_action: 'list' })
    if (request === revision.current) { setFriends(next || []); setError(null) }
    return next
  }, [ensureGuest])

  useEffect(() => {
    revision.current += 1
    setFriends([])
    setError(null)
  }, [user?.id])

  useEffect(() => {
    if (!active || !configured) return
    let mounted = true
    setLoading(true)
    void refresh().catch((cause) => { if (mounted) setError(onlineErrorMessage(cause)) }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false; revision.current += 1 }
  }, [active, configured, refresh, user?.id])

  useEffect(() => {
    const online = getOnlineClient()
    if (!active || !user || !online) return
    let mounted = true
    const update = () => { void refresh().catch((cause) => { if (mounted) setError(onlineErrorMessage(cause)) }) }
    const channel = online.channel(`friends:${user.id}:${++friendChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_social_updates', filter: `user_id=eq.${user.id}` }, update)
      .subscribe((status) => {
        if (!mounted) return
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') update()
      })
    const onVisible = () => { if (document.visibilityState === 'visible') update() }
    window.addEventListener('online', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted = false
      setConnected(false)
      window.removeEventListener('online', update)
      document.removeEventListener('visibilitychange', onVisible)
      void online.removeChannel(channel)
    }
  }, [active, user?.id, refresh])

  const act = useCallback(async (action: FriendAction, targetCode?: string, friendId?: string) => {
    await ensureGuest()
    const next = await onlineRpc<OnlineFriend[]>('online_friends', { p_action: action, p_target_code: targetCode?.trim().toUpperCase() || null, p_friend_id: friendId || null })
    revision.current += 1
    setFriends(next || [])
    setError(null)
    return next
  }, [ensureGuest])
  return { friends, loading, error, connected, refresh, act }
}

/** Reusable in an opponent profile popup; resolves crossed requests as acceptance. */
export function AddFriendButton({ targetCode, className, iconOnly = false }: { targetCode: string; className?: string; iconOnly?: boolean }) {
  const { user, profile, configured } = useOnline()
  const { friends, loading, act } = useFriendList(configured)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const relation = friends.find((friend) => friend.profile.code.toUpperCase() === targetCode.toUpperCase())
  const incoming = relation?.status === 'pending' && relation.sender_id !== user?.id
  const isSelf = profile?.code.toUpperCase() === targetCode.toUpperCase()
  const label = isSelf ? 'Seu perfil' : relation?.status === 'accepted' ? 'Amigos' : incoming ? 'Aceitar pedido' : relation ? 'Pedido enviado' : 'Adicionar amigo'
  const add = async () => {
    setBusy(true)
    setError(null)
    try { await act(incoming ? 'accept' : 'request', targetCode, incoming ? relation?.id : undefined) }
    catch (cause) { setError(onlineErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  return <div className={iconOnly ? 'inline-flex flex-col items-start gap-2' : 'space-y-2'}>
    <Button size="sm" variant="outline" aria-label={iconOnly ? label : undefined} title={iconOnly ? label : undefined} className={cn('border-primary/30 bg-transparent text-primary hover:border-primary hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)] focus-visible:border-primary focus-visible:bg-black/80 focus-visible:text-white', iconOnly && 'size-8 shrink-0 !border-primary p-2', className)} disabled={!configured || isSelf || busy || loading || Boolean(relation && !incoming)} onClick={() => void add()}>{busy ? <Loader2 aria-hidden="true" className="animate-spin" /> : relation?.status === 'accepted' ? <Check aria-hidden="true" /> : <UserPlus aria-hidden="true" />}{!iconOnly && label}</Button>
    {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
  </div>
}

function KitPreview({ member }: { member: RoomMember }) {
  const city = getCityById(member.city_id)
  const [instruments, setInstruments] = useState<Array<{ square: string; name: string }>>([])
  useEffect(() => {
    let mounted = true
    setInstruments([])
    if (member.city_id === DEFAULT_CITY_ID) return () => { mounted = false }
    void import('@/lib/music/city-kits').then(({ defaultCityKit }) => {
      const kit = defaultCityKit(member.city_id)
      if (mounted) setInstruments(kit?.pieces.filter((piece) => piece.color === member.color).map((piece) => ({ square: piece.origin, name: kit.instruments[piece.id]?.name || piece.type })) || [])
    }).catch(() => {})
    return () => { mounted = false }
  }, [member.city_id, member.color])
  if (member.city_id === DEFAULT_CITY_ID) return null
  if (!city) return <p className="text-xs text-white/50">Kit {member.city_id}</p>
  return <details className="group block w-full min-w-0">
    <summary className="grid cursor-pointer list-none grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 [&::-webkit-details-marker]:hidden">
      <img src={city.image} alt="" className="h-14 w-20 rounded object-cover" loading="lazy" />
      <span className="flex h-14 min-w-0 flex-col justify-center">
        <span className="text-sm" style={{ color: city.color }}>{city.year} {city.name}</span>
        <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/55 group-hover:text-white"><ChevronRight aria-hidden="true" className="size-3 transition-transform group-open:rotate-90" />{city.genre}</span>
      </span>
    </summary>
    <div className="mt-2 grid w-full min-w-0 grid-cols-2 gap-x-3 gap-y-1 text-xs text-white/55">{instruments.map((instrument) => <p className="min-w-0 break-words" key={instrument.square}><span className="font-mono text-white/35">{instrument.square}</span> {instrument.name}</p>)}</div>
  </details>
}

function RoomVisibility({ value, disabled, onChoose }: { value?: boolean; disabled: boolean; onChoose: (isPublic: boolean) => void }) {
  const inRoom = value !== undefined
  return <div className="grid grid-cols-2 gap-3">{[
    { isPublic: true, label: 'Public', description: 'Aparece na lista de salas.' },
    { isPublic: false, label: 'Private', description: 'Entrada por ID ou convite.' },
  ].map((choice) => {
    const selected = value === choice.isPublic
    return <button key={choice.label} type="button" disabled={disabled} aria-pressed={inRoom ? selected : undefined} className={cn(
      '!cursor-default rounded-md border p-4 text-left text-sm transition-colors disabled:!cursor-default disabled:opacity-60',
      inRoom
        ? selected
          ? 'border-primary bg-transparent font-medium text-primary'
          : 'border-white/20 bg-transparent text-white/65 enabled:hover:border-primary/70 enabled:hover:text-primary'
        : 'border-primary bg-primary text-primary-foreground enabled:hover:bg-primary/90',
    )} onClick={() => { if (value !== choice.isPublic) onChoose(choice.isPublic) }}>
      {choice.label}<span className={cn('mt-1 block text-xs', inRoom ? selected ? 'text-primary/80' : 'text-white/50' : 'text-primary-foreground/80')}>{choice.description}</span>
    </button>
  })}</div>
}

function ExitRoomIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M15 20.5H10M15 20.5V3H2.5v16l7.8 3.5V7L2.5 3" /><path d="M7.9 13v2" /><path d="M22 10h-6.7l2-3.3h-2.1L12.5 11l2.7 4.4h2.1l-2-3.4H22z" /></svg>
}

function FriendsPane() {
  const { user } = useOnline()
  const { friends, loading, error, act, refresh } = useFriendList(true)
  const [targetCode, setTargetCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const action = async (kind: FriendAction, friend?: OnlineFriend) => {
    setBusy(friend?.id || 'request')
    setActionError(null)
    setNotice(null)
    try {
      const next = await act(kind, targetCode, friend?.id)
      if (kind === 'request') {
        const relation = next?.find((entry) => entry.profile.code.toUpperCase() === targetCode.trim().toUpperCase())
        setNotice(relation?.status === 'accepted' ? 'Amizade aceita.' : relation?.sender_id !== user?.id ? 'Pedido recebido: aceite na lista abaixo.' : 'Pedido enviado.')
        setTargetCode('')
      }
    } catch (cause) { setActionError(onlineErrorMessage(cause)) } finally { setBusy(null) }
  }
  const groups = [
    { title: 'Amigos', entries: friends.filter((friend) => friend.status === 'accepted') },
    { title: 'Pedidos recebidos', entries: friends.filter((friend) => friend.status === 'pending' && friend.sender_id !== user?.id) },
    { title: 'Pedidos enviados', entries: friends.filter((friend) => friend.status === 'pending' && friend.sender_id === user?.id) },
  ]
  return <div className="space-y-5">
    <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void action('request') }}><label className="sr-only" htmlFor="friend-code">Código público do perfil</label><input id="friend-code" className={`${inputClass} flex-1 font-mono uppercase`} value={targetCode} onChange={(event) => setTargetCode(event.target.value.toUpperCase())} placeholder="Código de perfil" maxLength={20} required /><Button type="submit" disabled={Boolean(busy) || !targetCode.trim()}><UserPlus />Adicionar</Button></form>
    <div className="flex justify-end text-white/45"><button type="button" aria-label="Atualizar amigos" onClick={() => void refresh().catch((cause) => setActionError(onlineErrorMessage(cause)))}><RefreshCw className="size-3.5" /></button></div>
    {groups.map((group) => <section key={group.title} className="space-y-2"><h3 className="text-sm font-medium text-white/80">{group.title} <span className="text-white/40">{group.entries.length}</span></h3>{group.entries.length ? group.entries.map((friend) => <div key={friend.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/15 bg-black/20 p-3"><div><p className="break-words text-sm">{friend.profile.display_name}</p><p className="font-mono text-[11px] text-white/45">{friend.profile.code}</p></div><div className="flex flex-wrap gap-2">{friend.status === 'accepted' ? <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('remove', friend)}>Remover</Button> : friend.sender_id === user?.id ? <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('cancel', friend)}>Cancelar</Button> : <><Button size="sm" disabled={Boolean(busy)} onClick={() => void action('accept', friend)}>Aceitar</Button><Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('reject', friend)}>Recusar</Button></>}</div></div>) : loading ? <p role="status" className="text-xs text-white/40">Carregando…</p> : null}</section>)}
    {(error || actionError) && <p role="alert" className="text-sm text-rose-200">{actionError || error}</p>}
    {notice && <p role="status" className="text-xs text-primary">{notice}</p>}
  </div>
}

export function OnlineHub({ playerProfile, onMatch, inviteCode, open, onOpenChange, initialTab, showLaunchers = true, showMapRooms = false, createRequest, onCreateRequestHandled }: OnlineHubProps) {
  const { configured, user, ensureGuest, refreshProfile, openLogin, notify } = useOnline()
  const runningGames = useRunningGames()
  const [internalOpen, setInternalOpen] = useState(Boolean(inviteCode))
  const isOpen = open ?? internalOpen
  const [tab, setTab] = useState<OnlineHubTab>(initialTab || 'rooms')
  const [showDirectory, setShowDirectory] = useState(false)
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const roomsRefreshRevision = useRef(0)
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [refreshingRooms, setRefreshingRooms] = useState(false)
  const [room, setRoom] = useState<OnlineRoom | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const matched = useRef<string | null>(null)
  const [startedMatch, setStartedMatch] = useState<string | null>(null)
  const roomRef = useRef<OnlineRoom | null>(null)
  const identityRef = useRef<string | null>(null)
  const roomGeneration = useRef(0)
  const roomRefreshRevision = useRef(0)
  const roomActionPending = useRef(false)
  const consumedCreateRequests = useRef(new Set<number>())
  const isRoomMember = Boolean(room?.members.some((member) => member.user_id === user?.id))

  const setOpen = useCallback((next: boolean) => { setInternalOpen(next); onOpenChange?.(next) }, [onOpenChange])
  const launch = (nextTab: OnlineHubTab) => { setTab(nextTab); if (nextTab === 'rooms') { setShowDirectory(true); setCreateOpen(false) }; setOpen(true) }
  useEffect(() => { if (initialTab && isOpen) { setTab(initialTab); if (initialTab === 'rooms') { setShowDirectory(true); setCreateOpen(false) } } }, [initialTab, isOpen])

  const applyRoom = useCallback((next: OnlineRoom | null) => {
    const newMatch = startedRoomMatch(roomRef.current, next, identityRef.current)
    if (newMatch) setStartedMatch(newMatch)
    const arrivals = roomArrivalNames(roomRef.current, next, identityRef.current)
    if (arrivals.length) {
      playLobbyJoinSound()
      setFlash(true)
      for (const name of arrivals) notify(`${name} entrou na sua sala.`)
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(false), 1400)
    }
    roomRef.current = next
    setRoom(next)
  }, [notify])

  useEffect(() => {
    if (identityRef.current !== user?.id) {
      roomGeneration.current += 1
      applyRoom(null)
      setRooms([])
      setError(null)
      if (!roomActionPending.current) setBusy(null)
      matched.current = null
      setStartedMatch(null)
    }
    identityRef.current = user?.id || null
  }, [user?.id, applyRoom])

  useEffect(() => () => {
    roomGeneration.current += 1
    if (flashTimer.current) clearTimeout(flashTimer.current)
    disposeLobbyAudio()
  }, [])

  const refreshRooms = useCallback(async (isCurrent: () => boolean = () => true) => {
    const revision = ++roomsRefreshRevision.current
    const next = await onlineRpc<PublicRoom[]>('online_rooms')
    if (isCurrent() && revision === roomsRefreshRevision.current) { setRooms(next || []); setDirectoryError(null) }
  }, [])

  const refreshRoomsManually = () => {
    setRefreshingRooms(true)
    void refreshRooms().catch((cause) => setDirectoryError(onlineErrorMessage(cause))).finally(() => setRefreshingRooms(false))
  }

  const refreshRoom = useCallback(async (isCurrent: () => boolean = () => true) => {
    const current = roomRef.current
    if (!current) return
    const generation = roomGeneration.current
    const revision = ++roomRefreshRevision.current
    const next = await onlineRpc<OnlineRoom>('online_room', { p_action: 'get', p_code: current.code })
    if (isCurrent() && revision === roomRefreshRevision.current && generation === roomGeneration.current && roomRef.current?.id === current.id) applyRoom(next)
  }, [applyRoom])

  useEffect(() => {
    if (!configured || !user?.id || inviteCode || roomRef.current) return
    let active = true
    const generation = roomGeneration.current
    void onlineRpc<OnlineRoom | null>('online_room', { p_action: 'get', p_code: null }).then((next) => {
      if (active && generation === roomGeneration.current && !roomRef.current && next?.status === 'open') applyRoom(next)
    }).catch((cause) => { if (active) setError(onlineErrorMessage(cause)) })
    return () => { active = false }
  }, [configured, user?.id, inviteCode, isOpen, applyRoom])

  useEffect(() => {
    if (!isOpen || !configured) return
    let active = true
    void ensureGuest().then(() => refreshProfile()).catch((cause) => { if (active) setError(onlineErrorMessage(cause)) })
    return () => { active = false }
  }, [isOpen, configured, ensureGuest, refreshProfile])

  const watchDirectory = showMapRooms || (isOpen && tab === 'rooms' && (!room || showDirectory) && !createOpen)
  useEffect(() => {
    if (!configured || !watchDirectory) return
    let active = true
    setLoading(true)
    void refreshRooms(() => active).catch((cause) => { if (active) setDirectoryError(onlineErrorMessage(cause)) }).finally(() => { if (active) setLoading(false) })
    const online = requireOnlineClient()
    const update = () => { if (active) void refreshRooms(() => active).catch((cause) => { if (active) setDirectoryError(onlineErrorMessage(cause)) }) }
    const channel = online.channel(`public-room-directory:${++roomChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_public_rooms' }, update)
      .subscribe((status) => {
        if (!active) return
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') update()
      })
    const onVisible = () => { if (document.visibilityState === 'visible') update() }
    window.addEventListener('online', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      setConnected(false)
      window.removeEventListener('online', update)
      document.removeEventListener('visibilitychange', onVisible)
      void online.removeChannel(channel)
    }
  }, [watchDirectory, configured, user?.id, refreshRooms])

  useEffect(() => {
    const online = getOnlineClient()
    if (!room?.id || !online || !isRoomMember) return
    let active = true
    const update = () => { if (active) void refreshRoom(() => active).catch((cause) => { if (active) setError(onlineErrorMessage(cause)) }) }
    const channel = online.channel(`lobby:${room.id}:${user?.id}:${++roomChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_rooms', filter: `id=eq.${room.id}` }, update)
      .subscribe((status) => { if (active && status === 'SUBSCRIBED') update() })
    const onVisible = () => { if (document.visibilityState === 'visible') update() }
    window.addEventListener('online', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; window.removeEventListener('online', update); document.removeEventListener('visibilitychange', onVisible); void online.removeChannel(channel) }
  }, [room?.id, isRoomMember, user?.id, refreshRoom])

  useEffect(() => {
    if (!startedMatch || matched.current === startedMatch) return
    matched.current = startedMatch
    setOpen(false)
    onMatch(startedMatch)
  }, [startedMatch, onMatch, setOpen])

  useEffect(() => {
    if (!inviteCode) return
    setOpen(true)
    setTab('rooms')
    setCode(inviteCode.trim().toUpperCase())
    if (!configured) return
    let active = true
    const generation = roomGeneration.current
    setBusy('invite')
    setError(null)
    void (async () => {
      const current = await ensureGuest()
      const next = await onlineRpc<OnlineRoom>('online_room', { p_action: 'get', p_code: inviteCode.trim().toUpperCase() })
      if (active && identityRef.current === current.id && generation === roomGeneration.current) {
        roomGeneration.current += 1
        applyRoom(next)
      }
    })().catch((cause) => { if (active) setError(roomErrorMessage(cause) || onlineErrorMessage(cause)) }).finally(() => { if (active) setBusy(null) })
    return () => { active = false }
  }, [inviteCode, configured, user?.id, ensureGuest, applyRoom, setOpen])

  const roomAction = useCallback(async (action: 'create' | 'join' | 'leave' | 'kit' | 'ready' | 'cancel-ready' | 'visibility', roomCode?: string, cityId = DEFAULT_CITY_ID, isPublic = true) => {
    if (roomActionPending.current || busy) return
    roomActionPending.current = true
    if (action === 'create' || action === 'join') prepareLobbyAudio()
    setBusy(action)
    setError(null)
    setNotice(null)
    let actor = identityRef.current
    let generation = roomGeneration.current
    try {
      if (!configured) throw new Error(ONLINE_CONFIGURATION_MESSAGE)
      const current = await ensureGuest()
      if (generation !== roomGeneration.current && identityRef.current !== current.id) return
      actor = current.id
      // Auth can create the guest before the provider's identity effect commits.
      // Adopt that first identity here so the new request survives the update.
      if (!identityRef.current) {
        identityRef.current = actor
        roomGeneration.current += 1
        applyRoom(null)
        setRooms([])
        matched.current = null
      }
      if (identityRef.current !== actor) return
      generation = roomGeneration.current
      await refreshProfile()
      if (identityRef.current !== actor || generation !== roomGeneration.current) return
      const code = (roomCode ?? roomRef.current?.code)?.trim().toUpperCase() || null
      const next = action === 'cancel-ready'
        ? await onlineRpc<OnlineRoom | null>('online_room_cancel_ready', { p_code: code })
        : await onlineRpc<OnlineRoom | null>('online_room', { p_action: action, p_code: code, p_public: isPublic, p_city_id: cityId })
      if (identityRef.current !== actor || generation !== roomGeneration.current) return
      roomGeneration.current += 1
      applyRoom(action === 'leave' ? null : next)
      setCreateOpen(false)
      if (action === 'leave') {
        setTab('rooms')
        setShowDirectory(true)
      } else if (next?.members.some((member) => member.user_id === actor)) {
        setTab('room')
        setShowDirectory(false)
      }
    } catch (cause) {
      if (identityRef.current !== actor || generation !== roomGeneration.current) return
      if ((action === 'join' || action === 'create') && roomRef.current) {
        await refreshRoom().catch(() => {})
      } else if (action === 'create' && isAlreadyInRoom(cause) && configured && actor) {
        // A map request can arrive before the membership recovery effect.
        // Show the occupied room as well as the server's creation conflict.
        await onlineRpc<OnlineRoom | null>('online_room', { p_action: 'get', p_code: null }).then((existing) => {
          if (existing && identityRef.current === actor && generation === roomGeneration.current) applyRoom(existing)
        }).catch(() => {})
      }
      if (identityRef.current === actor && generation === roomGeneration.current) setError(roomErrorMessage(cause) || onlineErrorMessage(cause))
    } finally {
      roomActionPending.current = false
      setBusy(null)
    }
  }, [busy, configured, ensureGuest, refreshProfile, applyRoom, refreshRoom])

  useEffect(() => {
    if (!createRequest || consumedCreateRequests.current.has(createRequest.id) || busy || roomActionPending.current) return
    const request = createRequest
    consumedCreateRequests.current.add(request.id)
    setOpen(true)
    setTab('rooms')
    setCreateOpen(false)
    setShowDirectory(false)
    void roomAction('create', undefined, request.cityId, true).finally(() => onCreateRequestHandled?.(request.id))
  }, [createRequest, busy, roomAction, setOpen, onCreateRequestHandled])

  const actionError = error && <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>

  const ownMember = room?.members.find((member) => member.user_id === user?.id)
  useEffect(() => {
    if (isRoomMember && !showDirectory && !createOpen && tab === 'rooms') setTab('room')
    else if (!isRoomMember && tab === 'room') { setTab('rooms'); setShowDirectory(true) }
  }, [isRoomMember, showDirectory, createOpen, tab])
  const inviteLink = room && typeof window !== 'undefined' ? `${window.location.origin}/?room=${encodeURIComponent(room.code)}` : ''
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteLink); setNotice('Link de convite copiado.') }
    catch { setNotice('Não foi possível copiar o link de convite neste navegador.') }
  }
  const tabs: Array<{ id: OnlineHubTab; label: string; icon: typeof DoorOpen }> = [
    ...(ownMember && room ? [{ id: 'room' as const, label: `Room ${shortRoomCode(room.code)}`, icon: DoorOpen }] : []),
    { id: 'rooms', label: 'Salas', icon: DoorOpen },
    { id: 'friends', label: 'Amigos', icon: Users },
    { id: 'profile', label: 'Perfil', icon: UserRound },
  ]

  return <>
    {showLaunchers && <div className="flex gap-2"><Button variant="outline" className={styles.mapButton} onClick={() => launch('rooms')}><Globe2 className="size-3.5" />Rooms</Button><Button variant="outline" className={styles.mapButton} onClick={() => launch('friends')}><Users className="size-3.5" />Friends</Button></div>}
    {showMapRooms && (runningGames.games.length > 0 || rooms.length > 0 || runningGames.error) && <aside aria-label="Games and public rooms" className={styles.mapRooms}>
      {runningGames.games.length > 0 && <section aria-labelledby="running-games-heading" className={styles.mapRoomList}>
        <h2 id="running-games-heading" className="text-right font-mono text-[10px] text-white/50">Games in progress</h2>
        {runningGames.games.map(game => {
          const city = getCityById(game.context_city_id)
          return <button key={game.id} type="button" aria-label={`Return to game against ${game.opponent.display_name}`} className={cn(styles.mapButton, styles.mapRoom)} onClick={() => { setOpen(false); onMatch(game.id) }}>
            <span className="flex min-w-0 items-center justify-between gap-2"><span className="min-w-0 flex-1"><span className="block break-words text-xs">{game.opponent.display_name}</span>{city && <span className="mt-1 block text-[10px] text-white/50">{city.year} {city.name}</span>}<span className={cn('mt-1 block text-[10px]', game.turn === game.color ? 'text-primary' : 'text-white/50')}>{game.turn === game.color ? 'Your turn' : 'Waiting for opponent'}</span></span><LogIn aria-hidden="true" className="size-4 shrink-0" /></span>
          </button>
        })}
      </section>}
      {runningGames.error && <div className="space-y-1 text-xs"><p role="alert" className="text-rose-200">Não foi possível carregar suas partidas.</p><button type="button" className={styles.mapButton} onClick={runningGames.refresh}>Tentar novamente</button></div>}
      {rooms.length > 0 && <section aria-labelledby="public-rooms-heading" className={styles.mapRoomList}>
      <h2 id="public-rooms-heading" className="text-right font-mono text-[10px] text-white/50">Public rooms</h2>
      <div className={styles.mapRoomList}>{rooms.slice(0, 5).map(entry => <button key={entry.code} type="button" aria-label={`Entrar na sala de ${entry.creator_name}`} className={cn(styles.mapButton, styles.mapRoom)} disabled={Boolean(busy) || entry.players >= 2} onClick={() => { setTab('rooms'); setOpen(true); setCreateOpen(false); setShowDirectory(false); void roomAction('join', entry.code) }}>
        <span className="flex min-w-0 items-center justify-between gap-2"><span className="min-w-0 flex-1"><span className="block break-words text-xs">{entry.creator_name}</span><span className="mt-1 block text-[10px] text-white/50">1v1 casual · {entry.players}/2</span></span><LogIn aria-hidden="true" className="size-4 shrink-0" /></span>
      </button>)}</div>
      {rooms.length > 5 && <button type="button" className={styles.mapButton} onClick={() => launch('rooms')}>Ver todas</button>}
      </section>}
    </aside>}
    <Dialog modal={false} open={isOpen} onOpenChange={setOpen}>
      {isOpen && <DialogContent floating className={cn('max-w-xl border-primary/30 bg-[#101713] text-[#dfe8df]', styles.responsiveContent, flash && styles.joinFlash)} closeLabel="Fechar área online">
        <DialogHeader className="sr-only"><DialogTitle>{tab === 'rooms' ? '1v1 casual online' : tab === 'friends' ? 'Amigos' : 'Seu perfil'}</DialogTitle><DialogDescription>{tab === 'rooms' ? 'ChickenChess para duas pessoas, com poderes e os kits de cada equipe.' : tab === 'friends' ? 'Adicione pelo código de perfil e aceite os pedidos recebidos.' : 'Seu nome, progresso e conta online.'}</DialogDescription></DialogHeader>
        <nav aria-label="Área online" className={cn('grid gap-1 border-b border-white/10 pb-3 pr-6 sm:flex sm:gap-2', ownMember ? 'grid-cols-2' : 'grid-cols-3')}>{tabs.map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" size="sm" aria-pressed={tab === id} className={cn(
          'min-w-0 gap-1 border border-transparent px-1 text-xs hover:border-primary hover:text-white focus-visible:border-primary focus-visible:text-white sm:gap-2 sm:px-3 sm:text-sm',
          tab === id
            ? 'bg-primary/15 text-primary hover:!bg-primary/15 focus-visible:!bg-primary/15 dark:hover:!bg-primary/15 dark:focus-visible:!bg-primary/15'
            : 'text-white/60 hover:!bg-transparent focus-visible:!bg-transparent dark:hover:!bg-transparent dark:focus-visible:!bg-transparent',
        )} onClick={() => {
          if (id === 'profile') { setTab(id); setShowDirectory(false); setCreateOpen(false) }
          else if (id === 'room') { setTab(id); setShowDirectory(false); setCreateOpen(false) }
          else { setTab(id); if (id === 'rooms') { setShowDirectory(true); setCreateOpen(false) } }
        }}><Icon className="size-3.5 shrink-0 sm:size-4" />{label}</Button>)}</nav>
        {tab === 'profile' ? <ProfilePane playerProfile={playerProfile} onSignIn={() => { setOpen(false); openLogin() }} />
          : !configured ? <p className="rounded-md border border-white/15 p-4 text-sm leading-relaxed text-white/65">{ONLINE_CONFIGURATION_MESSAGE}</p>
          : tab === 'friends' ? <FriendsPane /> : room && !showDirectory && (tab === 'room' || !ownMember) ? <div className="space-y-4">
            <div className="flex min-w-0 items-center gap-3"><p className="min-w-0 truncate text-sm text-white/70">{room.is_public ? 'Sala pública' : 'Sala privada'}: <span className="font-mono tracking-wider text-primary">{shortRoomCode(room.code)}</span></p><Button size="sm" variant="ghost" className="ml-auto h-auto shrink-0 gap-1 p-0 text-sm text-white hover:bg-transparent hover:text-primary focus-visible:text-primary" onClick={() => void copyInvite()}><Copy aria-hidden="true" className="size-4" />Copiar convite</Button></div>
            {room.status === 'open' && room.host_id === user?.id && <div className="space-y-2"><RoomVisibility value={room.is_public} disabled={Boolean(busy)} onChoose={(isPublic) => void roomAction('visibility', room.code, DEFAULT_CITY_ID, isPublic)} /></div>}
            <div className="space-y-3">{room.members.map((member) => <div key={member.user_id} className={cn('space-y-3 rounded-md border p-3', member.ready ? 'border-primary/35 bg-primary/15' : 'border-white/15 bg-black/20')}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 flex-1 items-start gap-2">{member.user_id !== user?.id && ownMember && <AddFriendButton iconOnly targetCode={member.profile.code} />}<div className="min-w-0 flex-1"><p className="min-w-0 break-words text-sm font-medium">{member.profile.display_name}{member.user_id === user?.id ? ' (você)' : ''}</p><p className="text-[11px] text-white/45">{member.color === 'w' ? 'Brancas' : 'Pretas'} · {member.profile.code}</p></div></div><span className={cn('inline-flex items-center gap-1 text-xs', member.ready ? 'text-primary' : 'text-white/40')}>{member.ready && <Check aria-hidden="true" className="size-3.5 text-[#39ff14]" />}{member.ready ? 'Pronto' : 'Escolhendo kit'}</span></div>{member.user_id === user?.id && room.status === 'open' && <select aria-label="Kit da sua equipe" className={`${inputClass} w-full`} value={member.city_id} disabled={Boolean(busy)} onChange={(event) => void roomAction('kit', room.code, event.target.value)}><option className="bg-[#101713]" value={DEFAULT_CITY_ID}>Random</option>{cities.map((city) => <option className="bg-[#101713]" key={city.id} value={city.id}>{city.year} {city.name} · {city.genre}</option>)}</select>}<KitPreview member={member} /></div>)}{room.members.length < 2 && <div className="rounded-md border border-dashed border-white/15 p-4 text-center text-sm text-white/40">Aguardando outro participante · {room.members.length}/2</div>}</div>
            {actionError}
            {room.status !== 'open' && <p className="text-sm text-white/60">{room.status === 'playing' ? 'Esta sala já está em uma partida.' : 'Esta sala foi encerrada.'}</p>}
            {ownMember && room.status === 'playing' && room.match_id && <Button className="w-full" onClick={() => { setOpen(false); onMatch(room.match_id!) }}><LogIn />Voltar à partida</Button>}
            {ownMember ? <div className="flex items-center justify-between gap-3"><Button size="sm" variant="ghost" className="shrink-0 text-white hover:bg-transparent hover:text-white focus-visible:bg-transparent focus-visible:text-white" disabled={Boolean(busy)} onClick={() => void roomAction('leave')}><ExitRoomIcon />Sair da sala</Button>{room.status === 'open' && <Button variant={ownMember.ready ? 'outline' : 'default'} className={cn('h-11 min-w-0 flex-1 px-2', ownMember.ready && 'border-primary/45 bg-transparent text-primary/75 hover:bg-transparent hover:text-primary')} disabled={Boolean(busy) || room.members.length !== 2} onClick={() => void roomAction(ownMember.ready ? 'cancel-ready' : 'ready')}>{busy === 'ready' || busy === 'cancel-ready' ? <Loader2 className="animate-spin" /> : <Check />}{ownMember.ready ? 'Cancelar pronto' : 'Estou pronto!'}</Button>}</div> : <div className="flex items-center justify-between gap-3">{room.status === 'open' && <Button className="h-11 flex-1" disabled={Boolean(busy) || room.members.length >= 2} onClick={() => void roomAction('join', room.code)}><DoorOpen />Entrar na sala</Button>}<Button size="sm" variant="ghost" className="text-white/55" onClick={() => { roomGeneration.current += 1; applyRoom(null) }}><ArrowLeft />Voltar às salas</Button></div>}
            <div className="flex justify-end"><button type="button" className="text-white/45" aria-label="Atualizar sala do servidor" title="Buscar os dados atuais desta sala" onClick={() => void refreshRoom().catch((cause) => setError(onlineErrorMessage(cause)))}><RefreshCw className="size-4" /></button></div>
          </div> : createOpen ? <div className="space-y-5"><p className="text-sm text-white/65">Escolha quem pode encontrar sua sala.</p><RoomVisibility disabled={Boolean(busy)} onChoose={(isPublic) => void roomAction('create', undefined, DEFAULT_CITY_ID, isPublic)} />{actionError}<Button size="sm" variant="ghost" className="text-white/50" disabled={Boolean(busy)} onClick={() => setCreateOpen(false)}><ArrowLeft />Voltar às salas</Button></div> : <div className="space-y-4">
            <div className="space-y-2">
              <Button className="h-11 w-full" disabled={Boolean(busy)} onClick={() => { setCreateOpen(true); setError(null) }}><Plus />Criar sala</Button>
              {room && <Button variant="ghost" className="h-11 w-full border border-white/20 bg-transparent text-white/65 hover:border-primary hover:!bg-transparent hover:text-primary dark:hover:!bg-transparent" onClick={() => setShowDirectory(false)}>Voltar à sua sala</Button>}
            </div>
            <div className="flex items-center justify-between text-xs text-white/45"><span>{connected ? 'Salas públicas ao vivo' : loading ? 'Carregando salas…' : 'Reconectando atualizações…'}</span><button type="button" aria-label="Atualizar salas" aria-busy={refreshingRooms} disabled={refreshingRooms} onClick={refreshRoomsManually}><RefreshCw className={cn('size-3.5', refreshingRooms && 'animate-spin')} /></button></div>
            <div className="space-y-2 ">{loading && !rooms.length ? <p role="status" className="py-6 text-center text-sm text-white/45">Carregando salas…</p> : rooms.length ? rooms.map((entry) => <div key={entry.code} className="flex items-center justify-between gap-3 rounded-md border border-white/15 bg-black/20 p-3"><div><p className="break-words text-sm">{entry.creator_name}</p><p className="text-xs text-white/45">1v1 casual · {entry.players}/2 · <span className="font-mono">{shortRoomCode(entry.code)}</span></p></div><Button size="sm" disabled={Boolean(busy) || entry.players >= 2} onClick={() => void roomAction('join', entry.code)}>Join<LogIn aria-hidden="true" className="size-4" /></Button></div>) : <p className="rounded-md border border-dashed border-white/15 py-6 text-center text-sm text-white/45">Nenhuma sala pública aberta. Crie a primeira.</p>}</div>
            {directoryError && <p role="alert" className="text-sm text-rose-200">{directoryError}</p>}
            {actionError}<form className="space-y-2 border-t border-white/10 pt-4" onSubmit={(event) => { event.preventDefault(); void roomAction('join', code) }}><label htmlFor="online-room-code" className="text-xs text-white/55">Já tem um ID de sala?</label><div className="flex flex-wrap gap-2"><input id="online-room-code" className={`${inputClass} flex-1 font-mono uppercase`} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ID da sala" maxLength={32} required /><Button type="submit" variant="outline" className="border-white/20 bg-transparent" disabled={Boolean(busy) || !code.trim()}>Join room by ID</Button></div></form>
          </div>}
        {(!configured || (tab === 'rooms' && createOpen && !room)) && actionError}
        {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
        {busy === 'invite' && <p role="status" className="text-sm text-white/55">Abrindo convite…</p>}
      </DialogContent>}
    </Dialog>
  </>
}
