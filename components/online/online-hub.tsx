'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Copy, DoorOpen, Globe2, Loader2, Plus, RefreshCw, UserPlus, Users, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cities, getCityById } from '@/lib/cities-data'
import { getOnlineClient, ONLINE_CONFIGURATION_MESSAGE, onlineErrorMessage, onlineRpc, readProfileBackups, requireOnlineClient } from '@/lib/online/client'
import type { OnlineFriend, OnlineRoom, PublicRoom, RoomMember } from '@/lib/online/types'
import { cn } from '@/lib/utils'
import { useOnline } from './online-provider'
import { disposeLobbyAudio, playLobbyJoinSound, prepareLobbyAudio } from './lobby-audio'
import styles from './online-hub.module.css'

/* global URL, Blob */
export type OnlineHubTab = 'rooms' | 'friends' | 'profile'
export interface OnlineHubProps {
  onMatch: (matchId: string) => void
  inviteCode?: string | null
  /** Optional controlled popup; map buttons can open a specific initialTab. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialTab?: OnlineHubTab
  showLaunchers?: boolean
}

const inputClass = 'h-10 min-w-0 rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary'
const DEFAULT_CITY_ID = cities[0]?.id || 'dusseldorf'
type FriendAction = 'request' | 'accept' | 'reject' | 'cancel' | 'remove'
let friendChannelSequence = 0

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
export function AddFriendButton({ targetCode, className }: { targetCode: string; className?: string }) {
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
  return <div className="space-y-2">
    <Button size="sm" variant="outline" className={cn('border-primary/30 bg-transparent text-primary', className)} disabled={!configured || isSelf || busy || loading || Boolean(relation && !incoming)} onClick={() => void add()}>{busy ? <Loader2 className="animate-spin" /> : relation?.status === 'accepted' ? <Check /> : <UserPlus />}{label}</Button>
    {error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
  </div>
}

function KitPreview({ member }: { member: RoomMember }) {
  const city = getCityById(member.city_id)
  const [instruments, setInstruments] = useState<Array<{ square: string; name: string }>>([])
  useEffect(() => {
    let mounted = true
    setInstruments([])
    void import('@/lib/music/city-kits').then(({ defaultCityKit }) => {
      const kit = defaultCityKit(member.city_id)
      if (mounted) setInstruments(kit?.pieces.filter((piece) => piece.color === member.color).map((piece) => ({ square: piece.origin, name: kit.instruments[piece.id]?.name || piece.type })) || [])
    }).catch(() => {})
    return () => { mounted = false }
  }, [member.city_id, member.color])
  if (!city) return <p className="text-xs text-white/50">Kit {member.city_id}</p>
  return <div className="space-y-2">
    <div className="flex items-center gap-3">
      <img src={city.image} alt="" className="h-14 w-20 rounded object-cover" loading="lazy" />
      <div><p className="text-sm" style={{ color: city.color }}>{city.year} {city.name}</p><p className="text-xs text-white/55">{city.genre}</p></div>
    </div>
    <details className="text-xs text-white/55"><summary className="cursor-pointer hover:text-white">Instrumentos da equipe ({instruments.length || 16})</summary><div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">{instruments.map((instrument) => <p key={instrument.square}><span className="font-mono text-white/35">{instrument.square}</span> {instrument.name}</p>)}</div></details>
  </div>
}

function ProfilePane() {
  const { user, profile, loading, error: providerError, ensureGuest, refreshProfile, openLogin, signOut, pendingTransfer } = useOnline()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const googleIdentity = user?.identities?.find((identity) => identity.provider === 'google')
  const googleNameValue = googleIdentity?.identity_data?.full_name || googleIdentity?.identity_data?.name || (googleIdentity ? user?.user_metadata?.full_name || user?.user_metadata?.name : null)
  const googleName = typeof googleNameValue === 'string' ? Array.from(googleNameValue).filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).join('').trim().slice(0, 40) : ''
  useEffect(() => { setName(profile?.display_name || '') }, [profile?.display_name, profile?.id])
  const saveName = async (displayName: string) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try { await ensureGuest(); await refreshProfile(displayName); setMessage('Nome público salvo.') }
    catch (cause) { setError(onlineErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  const save = (event: FormEvent) => { event.preventDefault(); void saveName(name) }
  const logOut = async () => {
    setBusy(true)
    setError(null)
    try { await signOut(); setMessage('Conta desconectada. O progresso da campanha continua neste aparelho.') }
    catch (cause) { setError(onlineErrorMessage(cause)) }
    finally { setBusy(false) }
  }
  const downloadBackup = () => {
    const backups = readProfileBackups()
    const blob = new Blob([JSON.stringify({ backups }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'chickenchess-profile-backups.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <div className="space-y-5">
    <div className="flex items-center gap-3"><span aria-hidden="true" className="text-4xl">🐔</span><div className="min-w-0"><p className="break-words font-medium">{profile?.display_name || 'Perfil visitante'}</p><p className="text-xs text-white/55">{user && !user.is_anonymous ? 'Conta permanente' : 'Visitante neste aparelho'}</p></div></div>
    {loading && !profile && <p role="status" className="text-sm text-white/55">Carregando perfil…</p>}
    {profile?.baptismal_name && <div className="rounded border border-white/15 p-3"><p className="text-xs text-white/55">Baptismal name</p><p className="mt-1 break-words font-mono text-sm">{profile.baptismal_name}</p><p className="mt-2 text-xs leading-relaxed text-white/45">Nome de batismo permanente. Acompanha sua conta e não muda ao editar seu nome público.</p></div>}
    <form className="space-y-2" onSubmit={save}><label htmlFor="online-display-name" className="text-sm">Nome público</label><div className="flex gap-2"><input id="online-display-name" className={`${inputClass} flex-1`} value={name} onChange={(event) => setName(event.target.value)} maxLength={40} minLength={1} placeholder="Seu apelido" required /><Button type="submit" disabled={busy || !name.trim()}>{busy ? <Loader2 className="animate-spin" /> : 'Salvar'}</Button></div>{googleName && <button type="button" className="text-xs text-white/55 underline underline-offset-4 hover:text-white disabled:opacity-50" disabled={busy} onClick={() => void saveName(googleName)}>Usar nome do Google</button>}</form>
    {profile && <><div className="rounded border border-white/15 p-3 text-sm"><span className="text-white/55">Código de perfil</span><p className="mt-1 select-all font-mono text-lg tracking-wider text-primary">{profile.code}</p></div><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-white/50">Golden eggs</dt><dd className="mt-1 text-amber-300">{profile.profile.goldenEggs}</dd></div><div><dt className="text-xs text-white/50">Pontos históricos</dt><dd className="mt-1">{profile.profile.points}</dd></div><div><dt className="text-xs text-white/50">Rank</dt><dd className="mt-1">{profile.profile.rank}</dd></div><div><dt className="text-xs text-white/50">Cidades</dt><dd className="mt-1">{profile.profile.conqueredCityIds.length} / {cities.length}</dd></div></dl></>}
    {!user || user.is_anonymous ? <Button className="w-full" onClick={openLogin}>Sign in to save your profile</Button> : pendingTransfer ? <Button className="w-full" onClick={openLogin}>Escolher perfil para a conta</Button> : <div className="flex flex-wrap items-center justify-between gap-2"><span className="break-all text-xs text-white/55">{user.email || 'Google conectado'}</span><Button size="sm" variant="outline" className="border-white/20 bg-transparent" disabled={busy} onClick={() => void logOut()}>Sair da conta</Button></div>}
    {readProfileBackups().length > 0 && <button className="text-xs text-white/50 underline underline-offset-4 hover:text-white" type="button" onClick={downloadBackup}>Baixar cópias do perfil visitante</button>}
    {(error || providerError) && <p role="alert" className="text-sm text-rose-200">{error || providerError}</p>}
    {message && <p role="status" className="text-xs text-primary">{message}</p>}
  </div>
}

function FriendsPane() {
  const { user } = useOnline()
  const { friends, loading, error, connected, act, refresh } = useFriendList(true)
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
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void action('request') }}><label className="sr-only" htmlFor="friend-code">Código público do perfil</label><input id="friend-code" className={`${inputClass} flex-1 font-mono uppercase`} value={targetCode} onChange={(event) => setTargetCode(event.target.value.toUpperCase())} placeholder="Código de perfil" maxLength={20} required /><Button type="submit" disabled={Boolean(busy) || !targetCode.trim()}><UserPlus />Adicionar</Button></form>
    <div className="flex items-center justify-between text-xs text-white/45"><span>{connected ? 'Lista ao vivo' : loading ? 'Carregando…' : 'Reconectando atualizações…'}</span><button type="button" aria-label="Atualizar amigos" onClick={() => void refresh().catch((cause) => setActionError(onlineErrorMessage(cause)))}><RefreshCw className="size-3.5" /></button></div>
    {groups.map((group) => <section key={group.title} className="space-y-2"><h3 className="text-sm font-medium text-white/80">{group.title} <span className="text-white/40">{group.entries.length}</span></h3>{group.entries.length ? group.entries.map((friend) => <div key={friend.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/15 bg-black/20 p-3"><div><p className="text-sm">{friend.profile.display_name}</p><p className="font-mono text-[11px] text-white/45">{friend.profile.code}</p></div><div className="flex gap-2">{friend.status === 'accepted' ? <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('remove', friend)}>Remover</Button> : friend.sender_id === user?.id ? <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('cancel', friend)}>Cancelar</Button> : <><Button size="sm" disabled={Boolean(busy)} onClick={() => void action('accept', friend)}>Aceitar</Button><Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('reject', friend)}>Recusar</Button></>}</div></div>) : <p className="text-xs text-white/40">{loading ? 'Carregando…' : 'Nenhum perfil aqui ainda.'}</p>}</section>)}
    {(error || actionError) && <p role="alert" className="text-sm text-rose-200">{actionError || error}</p>}
    {notice && <p role="status" className="text-xs text-primary">{notice}</p>}
  </div>
}

export function OnlineHub({ onMatch, inviteCode, open, onOpenChange, initialTab, showLaunchers = true }: OnlineHubProps) {
  const { configured, user, profile, ensureGuest, refreshProfile, openLogin } = useOnline()
  const [internalOpen, setInternalOpen] = useState(Boolean(inviteCode))
  const isOpen = open ?? internalOpen
  const [tab, setTab] = useState<OnlineHubTab>(initialTab || 'rooms')
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [room, setRoom] = useState<OnlineRoom | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [isPublic, setIsPublic] = useState(true)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const seenMembers = useRef<{ roomId: string; ids: Set<string> } | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const matched = useRef<string | null>(null)
  const roomRef = useRef<OnlineRoom | null>(null)
  const identityRef = useRef<string | null>(null)
  const roomGeneration = useRef(0)

  const setOpen = useCallback((next: boolean) => { setInternalOpen(next); onOpenChange?.(next) }, [onOpenChange])
  const launch = (nextTab: OnlineHubTab) => { setTab(nextTab); setOpen(true) }
  useEffect(() => { if (initialTab && isOpen) setTab(initialTab) }, [initialTab, isOpen])

  const applyRoom = useCallback((next: OnlineRoom | null) => {
    if (!next) {
      seenMembers.current = null
    } else if (seenMembers.current?.roomId !== next.id) {
      seenMembers.current = { roomId: next.id, ids: new Set(next.members.map((member) => member.user_id)) }
    } else {
      const newcomers = next.members.filter((member) => !seenMembers.current!.ids.has(member.user_id))
      for (const member of newcomers) seenMembers.current.ids.add(member.user_id)
      if (newcomers.some((member) => member.user_id !== identityRef.current)) {
        playLobbyJoinSound()
        setFlash(true)
        setNotice('Um participante entrou na sala.')
        if (flashTimer.current) clearTimeout(flashTimer.current)
        flashTimer.current = setTimeout(() => setFlash(false), 1400)
      }
    }
    roomRef.current = next
    setRoom(next)
  }, [])

  useEffect(() => {
    if (identityRef.current !== user?.id) {
      roomGeneration.current += 1
      applyRoom(null)
      setRooms([])
      setError(null)
      matched.current = null
    }
    identityRef.current = user?.id || null
  }, [user?.id, applyRoom])

  useEffect(() => () => {
    if (flashTimer.current) clearTimeout(flashTimer.current)
    disposeLobbyAudio()
  }, [])

  const refreshRooms = useCallback(async () => {
    const generation = roomGeneration.current
    await ensureGuest()
    const next = await onlineRpc<PublicRoom[]>('online_rooms')
    if (generation === roomGeneration.current) { setRooms(next || []); setError(null) }
  }, [ensureGuest])

  const refreshRoom = useCallback(async () => {
    const current = roomRef.current
    if (!current) return
    const generation = roomGeneration.current
    const next = await onlineRpc<OnlineRoom>('online_room', { p_action: 'get', p_code: current.code })
    if (generation === roomGeneration.current && roomRef.current?.id === current.id) applyRoom(next)
  }, [applyRoom])

  useEffect(() => {
    if (!configured || !user?.id || inviteCode || roomRef.current) return
    let active = true
    const generation = roomGeneration.current
    void onlineRpc<OnlineRoom | null>('online_room', { p_action: 'get', p_code: null }).then((next) => {
      if (active && generation === roomGeneration.current && !roomRef.current && next) applyRoom(next)
    }).catch((cause) => { if (active) setError(onlineErrorMessage(cause)) })
    return () => { active = false }
  }, [configured, user?.id, inviteCode, isOpen, applyRoom])

  useEffect(() => {
    if (!isOpen || !configured) return
    let active = true
    void ensureGuest().then(() => refreshProfile()).catch((cause) => { if (active) setError(onlineErrorMessage(cause)) })
    return () => { active = false }
  }, [isOpen, configured, ensureGuest, refreshProfile])

  useEffect(() => {
    if (!isOpen || tab !== 'rooms' || room || createOpen || !configured) return
    let active = true
    setLoading(true)
    void refreshRooms().catch((cause) => { if (active) setError(onlineErrorMessage(cause)) }).finally(() => { if (active) setLoading(false) })
    const online = requireOnlineClient()
    const update = () => { void refreshRooms().catch((cause) => { if (active) setError(onlineErrorMessage(cause)) }) }
    const channel = online.channel('public-room-directory', { config: { postgres_changes_options: { wait: true } } })
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
  }, [isOpen, tab, Boolean(room), createOpen, configured, user?.id, refreshRooms])

  useEffect(() => {
    const online = getOnlineClient()
    if (!room?.id || !online || !room.members.some((member) => member.user_id === user?.id)) return
    let active = true
    const update = () => { void refreshRoom().catch((cause) => { if (active) setError(onlineErrorMessage(cause)) }) }
    const channel = online.channel(`lobby:${room.id}:${user?.id}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_rooms', filter: `id=eq.${room.id}` }, update)
      .subscribe((status) => { if (active) { setConnected(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') update() } })
    const onVisible = () => { if (document.visibilityState === 'visible') update() }
    window.addEventListener('online', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; window.removeEventListener('online', update); document.removeEventListener('visibilitychange', onVisible); void online.removeChannel(channel) }
  }, [room?.id, user?.id, refreshRoom])

  useEffect(() => {
    if (!room?.match_id || !room.members.some((member) => member.user_id === user?.id) || matched.current === room.match_id) return
    matched.current = room.match_id
    setOpen(false)
    onMatch(room.match_id)
  }, [room?.match_id, room?.members, user?.id, onMatch, setOpen])

  useEffect(() => {
    if (!inviteCode) return
    setOpen(true)
    setTab('rooms')
    setCode(inviteCode.trim().toUpperCase())
    if (!configured) return
    let active = true
    setBusy('invite')
    setError(null)
    void ensureGuest().then(() => onlineRpc<OnlineRoom>('online_room', { p_action: 'get', p_code: inviteCode.trim().toUpperCase() })).then((next) => { if (active) { roomGeneration.current += 1; applyRoom(next) } }).catch((cause) => { if (active) setError(onlineErrorMessage(cause)) }).finally(() => { if (active) setBusy(null) })
    return () => { active = false }
  }, [inviteCode, configured, ensureGuest, applyRoom, setOpen])

  const roomAction = async (action: 'create' | 'join' | 'leave' | 'kit' | 'ready', roomCode = room?.code, cityId = DEFAULT_CITY_ID) => {
    if (action === 'create' || action === 'join') prepareLobbyAudio()
    setBusy(action)
    setError(null)
    setNotice(null)
    try {
      await ensureGuest()
      await refreshProfile()
      const next = await onlineRpc<OnlineRoom | null>('online_room', { p_action: action, p_code: roomCode?.trim().toUpperCase() || null, p_public: isPublic, p_city_id: cityId })
      roomGeneration.current += 1
      applyRoom(action === 'leave' ? null : next)
      setCreateOpen(false)
    } catch (cause) { setError(onlineErrorMessage(cause)) } finally { setBusy(null) }
  }

  const ownMember = room?.members.find((member) => member.user_id === user?.id)
  const inviteLink = room && typeof window !== 'undefined' ? `${window.location.origin}/?room=${encodeURIComponent(room.code)}` : ''
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteLink); setNotice('Link de convite copiado.') }
    catch { setNotice('Copie o link no campo abaixo.') }
  }

  return <>
    {showLaunchers && <div className="flex flex-wrap gap-2"><Button variant="outline" className="border-primary/60 bg-[#101713]/90 text-primary transition-all hover:border-primary dark:hover:border-primary hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)]" onClick={() => launch('rooms')}><Globe2 />1v1 casual online</Button><Button variant="outline" className="border-white/25 bg-[#101713]/90 text-white/80 transition-all hover:border-primary dark:hover:border-primary hover:bg-black/80 dark:hover:bg-black/80 hover:text-white hover:shadow-[0_0_10px_var(--primary)]" onClick={() => launch('friends')}><Users />Amigos</Button></div>}
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className={cn('max-h-[90dvh] max-w-xl overflow-y-auto border-primary/30 bg-[#101713] text-[#dfe8df]', flash && styles.joinFlash)} closeLabel="Fechar área online">
        <DialogHeader><DialogTitle className="text-xl">{tab === 'rooms' ? '1v1 casual online' : tab === 'friends' ? 'Amigos' : 'Seu perfil'}</DialogTitle><DialogDescription className="text-sm text-white/55">{tab === 'rooms' ? 'ChickenChess para duas pessoas, com poderes e os kits de cada equipe.' : tab === 'friends' ? 'Adicione pelo código de perfil e aceite os pedidos recebidos.' : 'Seu nome, progresso e conta online.'}</DialogDescription></DialogHeader>
        <nav aria-label="Área online" className="flex gap-2 border-b border-white/10 pb-3">{([{ id: 'rooms', label: 'Salas', icon: DoorOpen }, { id: 'friends', label: 'Amigos', icon: Users }, { id: 'profile', label: 'Perfil', icon: UserRound }] as const).map(({ id, label, icon: Icon }) => <Button key={id} variant="ghost" size="sm" aria-pressed={tab === id} className={tab === id ? 'bg-primary/15 text-primary' : 'text-white/60'} onClick={() => setTab(id)}><Icon />{label}</Button>)}</nav>
        {!configured ? <p className="rounded-md border border-white/15 p-4 text-sm leading-relaxed text-white/65">{ONLINE_CONFIGURATION_MESSAGE}</p>
          : tab === 'profile' ? <ProfilePane /> : tab === 'friends' ? <FriendsPane /> : room ? <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs text-white/50">{room.is_public ? 'Sala pública' : 'Sala privada'}</p><p className="font-mono text-xl tracking-widest text-primary">{room.code}</p></div><Button size="sm" variant="outline" className="border-white/20 bg-transparent" onClick={() => void copyInvite()}><Copy />Copiar convite</Button></div>
            <input readOnly aria-label="Link de convite" className={`${inputClass} w-full text-xs text-white/50`} value={inviteLink} onFocus={(event) => event.currentTarget.select()} />
            <div className="space-y-3">{room.members.map((member) => <div key={member.user_id} className="space-y-3 rounded-md border border-white/15 bg-black/20 p-3"><div className="flex items-center justify-between gap-2"><div><p className="text-sm font-medium">{member.profile.display_name}{member.user_id === user?.id ? ' (você)' : ''}</p><p className="text-[11px] text-white/45">{member.color === 'w' ? 'Brancas' : 'Pretas'} · {member.profile.code}</p></div><span className={cn('text-xs', member.ready ? 'text-primary' : 'text-white/40')}>{member.ready ? 'Pronto' : 'Escolhendo kit'}</span></div>{member.user_id === user?.id && room.status === 'open' && <label className="block space-y-1 text-xs text-white/60"><span>Kit da sua equipe</span><select aria-label="Kit da sua equipe" className={`${inputClass} w-full`} value={member.city_id} disabled={Boolean(busy)} onChange={(event) => void roomAction('kit', room.code, event.target.value)}>{cities.map((city) => <option className="bg-[#101713]" key={city.id} value={city.id}>{city.year} {city.name} · {city.genre}</option>)}</select></label>}<KitPreview member={member} />{member.user_id !== user?.id && ownMember && <AddFriendButton targetCode={member.profile.code} />}</div>)}{room.members.length < 2 && <div className="rounded-md border border-dashed border-white/15 p-4 text-center text-sm text-white/40">Aguardando outro participante · {room.members.length}/2</div>}</div>
            {room.status !== 'open' ? <p className="text-sm text-white/60">{room.status === 'playing' ? 'Esta sala já está em uma partida.' : 'Esta sala foi encerrada.'}</p> : ownMember ? <><Button className="h-11 w-full" disabled={Boolean(busy) || room.members.length !== 2 || ownMember.ready} onClick={() => void roomAction('ready')}>{busy === 'ready' ? <Loader2 className="animate-spin" /> : <Check />}{ownMember.ready ? 'Aguardando o outro participante…' : 'Começar'}</Button><p className="text-center text-xs text-white/45">Os dois participantes precisam clicar em Começar. Trocar o kit limpa sua confirmação.</p></> : <Button className="h-11 w-full" disabled={Boolean(busy) || room.members.length >= 2} onClick={() => void roomAction('join', room.code)}><DoorOpen />Entrar na sala</Button>}
            <div className="flex items-center justify-between gap-3"><Button size="sm" variant="ghost" className="text-white/55" disabled={Boolean(busy)} onClick={() => { if (ownMember) void roomAction('leave'); else { roomGeneration.current += 1; applyRoom(null) } }}><ArrowLeft />{ownMember ? 'Sair da sala' : 'Voltar às salas'}</Button><button type="button" className="text-white/45" aria-label="Atualizar sala" onClick={() => void refreshRoom().catch((cause) => setError(onlineErrorMessage(cause)))}><RefreshCw className="size-4" /></button></div>
          </div> : createOpen ? <div className="space-y-5"><p className="text-sm text-white/65">Escolha quem pode encontrar sua sala.</p><div className="grid grid-cols-2 gap-3"><button type="button" className={cn('rounded-md border p-4 text-sm', isPublic ? 'border-primary bg-primary/10 text-primary' : 'border-white/20 text-white/55')} aria-pressed={isPublic} onClick={() => setIsPublic(true)}>Public<p className="mt-1 text-xs text-white/50">Aparece na lista de salas.</p></button><button type="button" className={cn('rounded-md border p-4 text-sm', !isPublic ? 'border-primary bg-primary/10 text-primary' : 'border-white/20 text-white/55')} aria-pressed={!isPublic} onClick={() => setIsPublic(false)}>Private<p className="mt-1 text-xs text-white/50">Entrada por ID ou convite.</p></button></div><Button className="w-full" disabled={Boolean(busy)} onClick={() => void roomAction('create')}>{busy ? <Loader2 className="animate-spin" /> : <Plus />}Create</Button><Button size="sm" variant="ghost" className="text-white/50" disabled={Boolean(busy)} onClick={() => setCreateOpen(false)}><ArrowLeft />Voltar às salas</Button></div> : <div className="space-y-4">
            <Button className="h-11 w-full" disabled={Boolean(busy)} onClick={() => { setIsPublic(true); setCreateOpen(true); setError(null) }}><Plus />Criar sala</Button>
            <div className="flex items-center justify-between text-xs text-white/45"><span>{connected ? 'Salas públicas ao vivo' : loading ? 'Carregando salas…' : 'Reconectando atualizações…'}</span><button type="button" aria-label="Atualizar salas" onClick={() => void refreshRooms().catch((cause) => setError(onlineErrorMessage(cause)))}><RefreshCw className="size-3.5" /></button></div>
            <div className="max-h-64 space-y-2 overflow-y-auto">{loading && !rooms.length ? <p role="status" className="py-6 text-center text-sm text-white/45">Carregando salas…</p> : rooms.length ? rooms.map((entry) => <div key={entry.code} className="flex items-center justify-between gap-3 rounded-md border border-white/15 bg-black/20 p-3"><div><p className="text-sm">{entry.creator_name}</p><p className="text-xs text-white/45">1v1 casual · {entry.players}/2 · <span className="font-mono">{entry.code}</span></p></div><Button size="sm" disabled={Boolean(busy) || entry.players >= 2} onClick={() => void roomAction('join', entry.code)}>Join</Button></div>) : <p className="rounded-md border border-dashed border-white/15 py-6 text-center text-sm text-white/45">Nenhuma sala pública aberta. Crie a primeira.</p>}</div>
            <form className="space-y-2 border-t border-white/10 pt-4" onSubmit={(event) => { event.preventDefault(); void roomAction('join', code) }}><label htmlFor="online-room-code" className="text-xs text-white/55">Já tem um ID de sala?</label><div className="flex flex-wrap gap-2"><input id="online-room-code" className={`${inputClass} flex-1 font-mono uppercase`} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="ID da sala" maxLength={20} required /><Button type="submit" variant="outline" className="border-white/20 bg-transparent" disabled={Boolean(busy) || !code.trim()}>Join room by ID</Button></div></form>
          </div>}
        {configured && tab === 'rooms' && (!user || user.is_anonymous) && <button type="button" className="text-center text-xs text-primary underline underline-offset-4" onClick={openLogin}>Sign in to save your profile</button>}
        {configured && tab === 'rooms' && profile && <p className="text-center text-[11px] text-white/35">{profile.display_name} · {profile.code}</p>}
        {error && <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
        {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
        {busy === 'invite' && <p role="status" className="text-sm text-white/55">Abrindo convite…</p>}
      </DialogContent>
    </Dialog>
  </>
}
