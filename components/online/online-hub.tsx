'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Bot, Check, ChevronRight, Copy, DoorOpen, EyeOff, Gamepad2, Globe2, Loader2, LogIn, MoreVertical, Plus, RefreshCw, Trash2, UserPlus, Users, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cities, getCityById, type CityData } from '@/lib/cities-data'
import type { PlayerProfile } from '@/lib/game-progression'
import { getOnlineClient, ONLINE_CONFIGURATION_MESSAGE, onlineErrorMessage, onlineRpc, requireOnlineClient } from '@/lib/online/client'
import type { OnlineFriend, OnlineRoom, PublicRoom, RoomMember, RunningGame } from '@/lib/online/types'
import { replayMatch } from '@/lib/online/domain'
import { Chess } from 'chess.js'
import { cn } from '@/lib/utils'
import { useOnline } from './online-provider'
import { disposeLobbyAudio, playLobbyJoinSound, prepareLobbyAudio } from './lobby-audio'
import styles from './online-hub.module.css'
import { isAlreadyInRoom, roomArrivalNames, roomErrorMessage, startedRoomMatch } from '@/lib/online/lobby-updates'
import { ProfilePane } from './profile-pane'
import { useRunningGames } from '@/hooks/use-running-games'

const LIGHT_SQUARES = Array.from({ length: 8 }, (_, r) =>
  Array.from({ length: 8 }, (_, c) => ((r + c) % 2 === 0 ? [c, r] : null)).filter(Boolean) as [number, number][]
).flat()

function RunningGameMiniature({ game }: { game: RunningGame }) {
  const board = useMemo(() => {
    try {
      return replayMatch({ actions: game.actions || [] }).game.board()
    } catch {
      return new Chess().board()
    }
  }, [game.actions])

  const isFlipped = game.color === 'b'

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="size-12 shrink-0 rounded-[3px] overflow-hidden select-none"
    >
      <defs>
        <symbol id="cc-mini-wp" viewBox="0 0 8 8">
          <circle cx="4" cy="2.6" r="1.2" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" />
          <path d="M2.6 6.6 h2.8 L4.5 4.1 H3.5 Z" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" strokeLinejoin="round" />
          <line x1="2.2" y1="6.8" x2="5.8" y2="6.8" stroke="#121813" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>
        <symbol id="cc-mini-bp" viewBox="0 0 8 8">
          <circle cx="4" cy="2.6" r="1.2" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" />
          <path d="M2.6 6.6 h2.8 L4.5 4.1 H3.5 Z" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" strokeLinejoin="round" />
          <line x1="2.2" y1="6.8" x2="5.8" y2="6.8" stroke="#9cb5a0" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>

        <symbol id="cc-mini-wn" viewBox="0 0 8 8">
          <path d="M2.3 6.8 h3.4 l-.3-2.2 c.7-.3 1.3-1 1.1-1.8 -.6-.1-1.1.2-1.4.5 l-.2-.7 -1 .3 c-.4.6-.7 1.5-.7 2.1 z" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" strokeLinejoin="round" />
          <circle cx="3.3" cy="3.6" r="0.3" fill="#121813" />
        </symbol>
        <symbol id="cc-mini-bn" viewBox="0 0 8 8">
          <path d="M2.3 6.8 h3.4 l-.3-2.2 c.7-.3 1.3-1 1.1-1.8 -.6-.1-1.1.2-1.4.5 l-.2-.7 -1 .3 c-.4.6-.7 1.5-.7 2.1 z" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" strokeLinejoin="round" />
          <circle cx="3.3" cy="3.6" r="0.3" fill="#9cb5a0" />
        </symbol>

        <symbol id="cc-mini-wb" viewBox="0 0 8 8">
          <circle cx="4" cy="1.7" r="0.5" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" />
          <path d="M4 2.4 c-1.2 0-1.8 1.4-1.4 3.2 h2.8 c.4-1.8-.2-3.2-1.4-3.2 z" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" strokeLinejoin="round" />
          <line x1="3.4" y1="3.7" x2="4.6" y2="4.7" stroke="#121813" strokeWidth="0.6" />
          <path d="M2.3 6.8 h3.4" stroke="#121813" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>
        <symbol id="cc-mini-bb" viewBox="0 0 8 8">
          <circle cx="4" cy="1.7" r="0.5" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" />
          <path d="M4 2.4 c-1.2 0-1.8 1.4-1.4 3.2 h2.8 c.4-1.8-.2-3.2-1.4-3.2 z" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" strokeLinejoin="round" />
          <line x1="3.4" y1="3.7" x2="4.6" y2="4.7" stroke="#9cb5a0" strokeWidth="0.6" />
          <path d="M2.3 6.8 h3.4" stroke="#9cb5a0" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>

        <symbol id="cc-mini-wr" viewBox="0 0 8 8">
          <path d="M2.3 2.5 h3.4 v1.1 h-.5 v-.5 h-.7 v.5 h-.6 v-.5 h-.7 v.5 h-.5 v-1.1 z" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M2.7 3.6 h2.6 l.2 2.2 H2.5 Z" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M2.2 6.8 h3.6" stroke="#121813" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>
        <symbol id="cc-mini-br" viewBox="0 0 8 8">
          <path d="M2.3 2.5 h3.4 v1.1 h-.5 v-.5 h-.7 v.5 h-.6 v-.5 h-.7 v.5 h-.5 v-1.1 z" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M2.7 3.6 h2.6 l.2 2.2 H2.5 Z" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M2.2 6.8 h3.6" stroke="#9cb5a0" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>

        <symbol id="cc-mini-wq" viewBox="0 0 8 8">
          <circle cx="2.4" cy="2.5" r="0.4" fill="#f5f8f5" stroke="#121813" strokeWidth="0.5" />
          <circle cx="4.0" cy="2.1" r="0.4" fill="#f5f8f5" stroke="#121813" strokeWidth="0.5" />
          <circle cx="5.6" cy="2.5" r="0.4" fill="#f5f8f5" stroke="#121813" strokeWidth="0.5" />
          <path d="M2.4 3.1 L2.8 5.8 H5.2 L5.6 3.1 L4.7 4.2 L4 2.9 L3.3 4.2 Z" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M2.2 6.8 h3.6" stroke="#121813" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>
        <symbol id="cc-mini-bq" viewBox="0 0 8 8">
          <circle cx="2.4" cy="2.5" r="0.4" fill="#121813" stroke="#9cb5a0" strokeWidth="0.5" />
          <circle cx="4.0" cy="2.1" r="0.4" fill="#121813" stroke="#9cb5a0" strokeWidth="0.5" />
          <circle cx="5.6" cy="2.5" r="0.4" fill="#121813" stroke="#9cb5a0" strokeWidth="0.5" />
          <path d="M2.4 3.1 L2.8 5.8 H5.2 L5.6 3.1 L4.7 4.2 L4 2.9 L3.3 4.2 Z" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M2.2 6.8 h3.6" stroke="#9cb5a0" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>

        <symbol id="cc-mini-wk" viewBox="0 0 8 8">
          <line x1="4" y1="1.3" x2="4" y2="2.9" stroke="#121813" strokeWidth="0.6" strokeLinecap="round" />
          <line x1="3.2" y1="1.9" x2="4.8" y2="1.9" stroke="#121813" strokeWidth="0.6" strokeLinecap="round" />
          <path d="M2.4 5.8 h3.2 c.5-1.1 0-2.2-1.6-2.2 -1.6 0-2.1 1.1-1.6 2.2 z" fill="#f5f8f5" stroke="#121813" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M2.2 6.8 h3.6" stroke="#121813" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>
        <symbol id="cc-mini-bk" viewBox="0 0 8 8">
          <line x1="4" y1="1.3" x2="4" y2="2.9" stroke="#9cb5a0" strokeWidth="0.6" strokeLinecap="round" />
          <line x1="3.2" y1="1.9" x2="4.8" y2="1.9" stroke="#9cb5a0" strokeWidth="0.6" strokeLinecap="round" />
          <path d="M2.4 5.8 h3.2 c.5-1.1 0-2.2-1.6-2.2 -1.6 0-2.1 1.1-1.6 2.2 z" fill="#121813" stroke="#9cb5a0" strokeWidth="0.6" strokeLinejoin="round" />
          <path d="M2.2 6.8 h3.6" stroke="#9cb5a0" strokeWidth="0.6" strokeLinecap="round" />
        </symbol>
      </defs>

      <rect width="64" height="64" fill="#18231a" />

      {LIGHT_SQUARES.map(([c, r]) => (
        <rect key={`sq-${c}-${r}`} x={c * 8} y={r * 8} width={8} height={8} fill="#394b3d" />
      ))}

      {board.map((row, r) =>
        row.map((piece, c) => {
          if (!piece) return null
          const displayR = isFlipped ? 7 - r : r
          const displayC = isFlipped ? 7 - c : c
          return (
            <use
              key={`p-${r}-${c}`}
              href={`#cc-mini-${piece.color}${piece.type}`}
              x={displayC * 8}
              y={displayR * 8}
              width={8}
              height={8}
            />
          )
        })
      )}
    </svg>
  )
}

export type OnlineHubTab = 'rooms' | 'friends' | 'profile' | 'room'
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
  /** Route the solo bot lobby into the selected campaign city. */
  onCampaignCity?: (city: CityData) => void
}

const inputClass = 'h-10 min-w-0 rounded-md border border-white/20 bg-black/30 px-3 text-sm text-white outline-none focus:border-primary focus:ring-1 focus:ring-primary'
const DEFAULT_CITY_ID = 'random'
const shortRoomCode = (code: string) => code.replace(/\D/g, '').slice(0, 5).padEnd(5, '0')
type FriendAction = 'request' | 'accept' | 'reject' | 'cancel' | 'remove' | 'hide'
let friendChannelSequence = 0
let roomChannelSequence = 0

function useDocumentVisible() {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible')
  useEffect(() => {
    const onVisible = () => setVisible(document.visibilityState === 'visible')
    onVisible()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])
  return visible
}

function useFriendList(active: boolean) {
  const { user, configured, ensureGuest } = useOnline()
  const documentVisible = useDocumentVisible()
  const watchFriends = active && documentVisible
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
    if (!watchFriends || !configured) return
    let mounted = true
    setLoading(true)
    void refresh().catch((cause) => { if (mounted) setError(onlineErrorMessage(cause)) }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false; revision.current += 1 }
  }, [watchFriends, configured, refresh, user?.id])

  useEffect(() => {
    const online = getOnlineClient()
    if (!watchFriends || !user || !online) return
    let mounted = true
    let hasSubscribedOnce = false
    const update = () => { void refresh().catch((cause) => { if (mounted) setError(onlineErrorMessage(cause)) }) }
    const channel = online.channel(`friends:${user.id}:${++friendChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_social_updates', filter: `user_id=eq.${user.id}` }, update)
      .subscribe((status) => {
        if (!mounted) return
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          if (hasSubscribedOnce) update()
          hasSubscribedOnce = true
        }
      })
    window.addEventListener('online', update)
    return () => {
      mounted = false
      setConnected(false)
      window.removeEventListener('online', update)
      void online.removeChannel(channel)
    }
  }, [watchFriends, user?.id, refresh])

  const act = useCallback(async (action: FriendAction, targetCode?: string, friendId?: string) => {
    await ensureGuest()
    const next = await onlineRpc<OnlineFriend[]>('online_friends', { p_action: action, p_target_code: targetCode?.trim() || null, p_friend_id: friendId || null })
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
  const label = isSelf ? 'Your profile' : relation?.status === 'accepted' ? 'Friends' : incoming ? 'Accept request' : relation ? 'Request sent' : 'Add friend'
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
    { isPublic: true, label: 'Public', description: 'Visible in the room list.' },
    { isPublic: false, label: 'Private', description: 'Join by ID or invitation.' },
  ].map((choice) => {
    const selected = value === choice.isPublic
    return <button key={choice.label} type="button" disabled={disabled} aria-pressed={inRoom ? selected : undefined} className={cn(
      'cursor-pointer rounded-md border p-4 text-left text-sm transition-colors disabled:cursor-default disabled:opacity-60',
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

const HIDDEN_FRIENDS_PREFIX = 'chickenchess:hidden_friends:'
function getHiddenFriendCodes(userId: string | undefined): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`${HIDDEN_FRIENDS_PREFIX}${userId || 'guest'}`)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}
function saveHiddenFriendCodes(userId: string | undefined, hidden: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${HIDDEN_FRIENDS_PREFIX}${userId || 'guest'}`, JSON.stringify(Array.from(hidden)))
  } catch {
    // Ignore storage errors
  }
}

function FriendsPane({ onCreateGame }: { onCreateGame?: (friend: OnlineFriend) => void }) {
  const { user } = useOnline()
  const { friends, loading, error, act, refresh } = useFriendList(true)
  const [targetCode, setTargetCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [hiddenCodes, setHiddenCodes] = useState<Set<string>>(() => getHiddenFriendCodes(user?.id))

  useEffect(() => {
    setHiddenCodes(getHiddenFriendCodes(user?.id))
  }, [user?.id])

  const hideFriend = (friend: OnlineFriend) => {
    const code = friend.profile.code.toUpperCase()
    setHiddenCodes(prev => {
      const next = new Set(prev)
      next.add(code)
      saveHiddenFriendCodes(user?.id, next)
      return next
    })
    setNotice(`${friend.profile.display_name} is now hidden from your friends list.`)
  }

  const unhideCode = (code: string) => {
    const upper = code.toUpperCase()
    setHiddenCodes(prev => {
      if (!prev.has(upper)) return prev
      const next = new Set(prev)
      next.delete(upper)
      saveHiddenFriendCodes(user?.id, next)
      return next
    })
  }

  const action = async (kind: FriendAction, friend?: OnlineFriend) => {
    setBusy(friend?.id || 'request')
    setActionError(null)
    setNotice(null)
    try {
      const next = await act(kind, targetCode, friend?.id)
      if (kind === 'request') {
        const query = targetCode.trim()
        const unhidden = next?.find((entry) =>
          entry.status === 'accepted' && (
            hiddenCodes.has(entry.profile.code.toUpperCase()) ||
            entry.profile.code.toUpperCase() === query.toUpperCase()
          )
        )
        if (unhidden && hiddenCodes.has(unhidden.profile.code.toUpperCase())) {
          unhideCode(unhidden.profile.code)
          setNotice(`${unhidden.profile.display_name} is visible again in your friends list.`)
        } else {
          const relation = next?.find((entry) => entry.profile.code.toUpperCase() === query.toUpperCase())
          setNotice(
            relation?.status === 'accepted'
              ? 'Friend request accepted.'
              : relation?.sender_id !== user?.id
                ? 'Request received. Accept it in the list below.'
                : 'Friend request sent.'
          )
        }
        setTargetCode('')
      }
    } catch (cause) {
      setActionError(onlineErrorMessage(cause))
    } finally {
      setBusy(null)
    }
  }

  const submitAdd = (event: React.FormEvent) => {
    event.preventDefault()
    const query = targetCode.trim()
    if (!query) return
    const existingHidden = friends.find(
      (f) => f.status === 'accepted' && hiddenCodes.has(f.profile.code.toUpperCase()) && f.profile.code.toUpperCase() === query.toUpperCase()
    )
    if (existingHidden) {
      unhideCode(existingHidden.profile.code)
      setNotice(`${existingHidden.profile.display_name} is visible again in your friends list.`)
      setTargetCode('')
      return
    }
    void action('request')
  }

  const visibleAccepted = friends.filter(
    (friend) => friend.status === 'accepted' && !hiddenCodes.has(friend.profile.code.toUpperCase())
  )

  const groups = [
    { title: 'Friends', entries: visibleAccepted, isAccepted: true },
    { title: 'Received requests', entries: friends.filter((friend) => friend.status === 'pending' && friend.sender_id !== user?.id), isAccepted: false },
    { title: 'Sent requests', entries: friends.filter((friend) => friend.status === 'pending' && friend.sender_id === user?.id), isAccepted: false },
  ]

  return (
    <div className="space-y-5">
      <form className="flex flex-wrap gap-2" onSubmit={submitAdd}>
        <label className="sr-only" htmlFor="friend-code">Profile code or email</label>
        <input
          id="friend-code"
          className={`${inputClass} flex-1 font-mono`}
          value={targetCode}
          onChange={(event) => setTargetCode(event.target.value)}
          placeholder="Profile code or email"
          maxLength={120}
          required
        />
        <Button type="submit" disabled={Boolean(busy) || !targetCode.trim()}><UserPlus />Add</Button>
      </form>
      <div className="flex justify-start text-white/45">
        <button
          type="button"
          aria-label="Refresh friends"
          aria-busy={refreshing}
          disabled={refreshing}
          onClick={() => {
            setRefreshing(true)
            void refresh().catch((cause) => setActionError(onlineErrorMessage(cause))).finally(() => setRefreshing(false))
          }}
        >
          <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} style={refreshing ? { animationDuration: '2.5s' } : undefined} />
        </button>
      </div>
      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="text-sm font-medium text-white/80">
            {group.title} <span className="text-white/40">{group.entries.length}</span>
          </h3>
          {group.entries.length ? (
            group.entries.map((friend) => (
              <div
                key={friend.id}
                className="relative flex flex-wrap items-center justify-between gap-3 rounded-md border border-white/15 bg-black/20 p-3 pr-10"
              >
                <div>
                  <p className="break-words text-sm font-medium">{friend.profile.display_name}</p>
                  <p className="font-mono text-[11px] text-white/45">{friend.profile.code}</p>
                </div>
                {group.isAccepted ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary/40 bg-transparent text-primary hover:border-primary hover:bg-black/80 hover:text-white"
                        disabled={Boolean(busy)}
                        onClick={() => onCreateGame?.(friend)}
                      >
                        <Gamepad2 className="size-3.5" />
                        Create game
                      </Button>
                    </div>
                    <div className="absolute right-2 top-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label="Friend options"
                            className="inline-flex size-6 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          >
                            <MoreVertical className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="border-white/20 bg-[#101713] text-[#dfe8df]">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={() => hideFriend(friend)}
                          >
                            <EyeOff className="size-3.5" />
                            Hide
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-xs text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
                            disabled={Boolean(busy)}
                            onClick={() => void action('remove', friend)}
                          >
                            <Trash2 className="size-3.5" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {friend.sender_id === user?.id ? (
                      <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('cancel', friend)}>
                        Cancel
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" disabled={Boolean(busy)} onClick={() => void action('accept', friend)}>
                          Accept
                        </Button>
                        <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('reject', friend)}>
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : loading ? (
            <p role="status" className="text-xs text-white/40">Loading…</p>
          ) : null}
        </section>
      ))}
      {(error || actionError) && <p role="alert" className="text-sm text-rose-200">{actionError || error}</p>}
      {notice && <p role="status" className="text-xs text-primary">{notice}</p>}
    </div>
  )
}

export function OnlineHub({ playerProfile, onMatch, onCampaignCity, inviteCode, open, onOpenChange, initialTab, showLaunchers = true, showMapRooms = false, createRequest, onCreateRequestHandled }: OnlineHubProps) {
  const { configured, user, ensureGuest, refreshProfile, openLogin, notify } = useOnline()
  const documentVisible = useDocumentVisible()
  const runningGames = useRunningGames()
  const [internalOpen, setInternalOpen] = useState(Boolean(inviteCode))
  const isOpen = open ?? internalOpen
  const [lobbyOpen, setLobbyOpen] = useState(false)
  const [tab, setTab] = useState<OnlineHubTab>(initialTab === 'profile' ? 'profile' : initialTab === 'friends' ? 'friends' : 'rooms')
  const [_showDirectory, setShowDirectory] = useState(false)
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const roomsRefreshRevision = useRef(0)
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [refreshingRooms, setRefreshingRooms] = useState(false)
  const [room, setRoom] = useState<OnlineRoom | null>(null)
  const [botInserted, setBotInserted] = useState(false)
  const [botReady, setBotReady] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createKitId, setCreateKitId] = useState<string>(DEFAULT_CITY_ID)
  const [serverKitCatalog, setServerKitCatalog] = useState<string[] | null>(null)

  useEffect(() => {
    if (!configured || !isOpen || serverKitCatalog) return
    let active = true
    void onlineRpc<string[]>('online_kit_catalog')
      .then((catalog) => {
        if (active && Array.isArray(catalog) && catalog.length > 0) {
          setServerKitCatalog(catalog)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [configured, isOpen, serverKitCatalog])

  const availableCities = useMemo(() => {
    if (!serverKitCatalog || !serverKitCatalog.length) return cities
    const catalogSet = new Set(serverKitCatalog)
    const matched = cities.filter((city) => catalogSet.has(city.id))
    const knownIds = new Set(cities.map((city) => city.id))
    const extraIds = serverKitCatalog.filter((id) => !knownIds.has(id))
    if (extraIds.length > 0) {
      const extraCities = extraIds.map((id) => ({
        id,
        name: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        year: '',
        genre: 'Custom',
        country: '',
        description: '',
        photo: '',
        photoCredit: '',
        photoSource: '',
        lat: 0,
        lng: 0,
      } as unknown as CityData))
      return [...matched, ...extraCities]
    }
    return matched.length > 0 ? matched : cities
  }, [serverKitCatalog])
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
  const launch = (nextTab: OnlineHubTab) => {
    if (nextTab === 'room') {
      setOpen(false)
      setLobbyOpen(true)
      return
    }
    setLobbyOpen(false)
    setTab(nextTab)
    if (nextTab === 'rooms') {
      setShowDirectory(true)
      setCreateOpen(false)
    }
    setOpen(true)
  }
  useEffect(() => {
    if (initialTab && isOpen) {
      if (initialTab === 'room') {
        setOpen(false)
        setLobbyOpen(true)
      } else {
        setTab(initialTab)
        if (initialTab === 'rooms') {
          setShowDirectory(true)
          setCreateOpen(false)
        }
      }
    }
  }, [initialTab, isOpen])

  const applyRoom = useCallback((next: OnlineRoom | null) => {
    const newMatch = startedRoomMatch(roomRef.current, next, identityRef.current)
    if (newMatch) setStartedMatch(newMatch)
    const arrivals = roomArrivalNames(roomRef.current, next, identityRef.current)
    if (arrivals.length) {
      playLobbyJoinSound()
      setFlash(true)
      for (const name of arrivals) notify(`${name} joined your lobby.`)
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
      setBotInserted(false)
      setBotReady(false)
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
  }, [configured, user?.id, inviteCode, applyRoom])

  useEffect(() => {
    if (!isOpen || !configured) return
    let active = true
    void ensureGuest().then(() => refreshProfile()).catch((cause) => { if (active) setError(onlineErrorMessage(cause)) })
    return () => { active = false }
  }, [isOpen, configured, ensureGuest, refreshProfile])

  const watchDirectory = documentVisible && (showMapRooms || isOpen)
  useEffect(() => {
    if (!configured || !watchDirectory) return
    let active = true
    let hasSubscribedOnce = false
    setLoading(true)
    void refreshRooms(() => active).catch((cause) => { if (active) setDirectoryError(onlineErrorMessage(cause)) }).finally(() => { if (active) setLoading(false) })
    const online = requireOnlineClient()
    const update = () => { if (active) void refreshRooms(() => active).catch((cause) => { if (active) setDirectoryError(onlineErrorMessage(cause)) }) }
    const channel = online.channel(`public-room-directory:${++roomChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_public_rooms' }, update)
      .subscribe((status) => {
        if (!active) return
        setConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          if (hasSubscribedOnce) update()
          hasSubscribedOnce = true
        }
      })
    window.addEventListener('online', update)
    return () => {
      active = false
      setConnected(false)
      window.removeEventListener('online', update)
      void online.removeChannel(channel)
    }
  }, [watchDirectory, configured, user?.id, refreshRooms])

  useEffect(() => {
    const online = getOnlineClient()
    if (!room?.id || !online || !isRoomMember) return
    let active = true
    let isSubscribed = false
    const update = () => { if (active) void refreshRoom(() => active).catch((cause) => { if (active) setError(onlineErrorMessage(cause)) }) }
    const channel = online.channel(`lobby:${room.id}:${user?.id}:${++roomChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_rooms', filter: `id=eq.${room.id}` }, update)
      .subscribe((status) => {
        if (!active) return
        if (status === 'SUBSCRIBED') {
          isSubscribed = true
          update()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          isSubscribed = false
        }
      })
    const onVisible = () => { if (document.visibilityState === 'visible' && !isSubscribed) update() }
    window.addEventListener('online', update)
    document.addEventListener('visibilitychange', onVisible)
    return () => { active = false; window.removeEventListener('online', update); document.removeEventListener('visibilitychange', onVisible); void online.removeChannel(channel) }
  }, [room?.id, isRoomMember, user?.id, refreshRoom])

  useEffect(() => {
    if (!startedMatch || matched.current === startedMatch) return
    matched.current = startedMatch
    setOpen(false)
    setLobbyOpen(false)
    onMatch(startedMatch)
  }, [startedMatch, onMatch, setOpen])

  useEffect(() => {
    if (!inviteCode) return
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
        setOpen(false)
        setLobbyOpen(true)
      }
    })().catch((cause) => { if (active) setError(roomErrorMessage(cause) || onlineErrorMessage(cause)) }).finally(() => { if (active) setBusy(null) })
    return () => { active = false }
  }, [inviteCode, configured, user?.id, ensureGuest, applyRoom])

  const roomAction = useCallback(async (action: 'create' | 'join' | 'leave' | 'kit' | 'ready' | 'cancel-ready' | 'visibility', roomCode?: string, cityId = DEFAULT_CITY_ID, isPublic = true) => {
    if (roomActionPending.current || busy) return false
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
      if (generation !== roomGeneration.current && identityRef.current !== current.id) return false
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
      if (identityRef.current !== actor) return false
      generation = roomGeneration.current
      await refreshProfile()
      if (identityRef.current !== actor || generation !== roomGeneration.current) return false
      const code = (roomCode ?? roomRef.current?.code)?.trim().toUpperCase() || null
      const next = action === 'cancel-ready'
        ? await onlineRpc<OnlineRoom | null>('online_room_cancel_ready', { p_code: code })
        : await onlineRpc<OnlineRoom | null>('online_room', { p_action: action, p_code: code, p_public: isPublic, p_city_id: cityId })
      if (identityRef.current !== actor || generation !== roomGeneration.current) return false
      roomGeneration.current += 1
      applyRoom(action === 'leave' ? null : next)
      setCreateOpen(false)
      if (action === 'leave') {
        setLobbyOpen(false)
        setTab('rooms')
        setShowDirectory(true)
        setOpen(true)
      } else if (next?.members.some((member) => member.user_id === actor)) {
        setOpen(false)
        setLobbyOpen(true)
        setShowDirectory(false)
      }
      return true
    } catch (cause) {
      if (identityRef.current !== actor || generation !== roomGeneration.current) return false
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
      return false
    } finally {
      roomActionPending.current = false
      setBusy(null)
    }
  }, [busy, configured, ensureGuest, refreshProfile, applyRoom, refreshRoom])

  useEffect(() => {
    if (!createRequest || consumedCreateRequests.current.has(createRequest.id) || busy || roomActionPending.current) return
    const request = createRequest
    consumedCreateRequests.current.add(request.id)
    setCreateOpen(false)
    setShowDirectory(false)
    void roomAction('create', undefined, request.cityId, true).then((ok) => {
      if (ok) {
        setOpen(false)
        setLobbyOpen(true)
      }
    }).finally(() => onCreateRequestHandled?.(request.id))
  }, [createRequest, busy, roomAction, onCreateRequestHandled])

  const handleCreateGameWithFriend = async (_friend: OnlineFriend) => {
    const success = await roomAction('create', undefined, DEFAULT_CITY_ID, false)
    if (success) {
      setOpen(false)
      setLobbyOpen(true)
    }
  }
  const actionError = error && <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
  const ownMember = room?.members.find((member) => member.user_id === user?.id)
  const activeBot = Boolean(botInserted && room?.status === 'open' && room.members.length === 1 && ownMember && ownMember.user_id === room.host_id)
  const canInsertBot = Boolean(onCampaignCity && room?.status === 'open' && room.members.length === 1 && ownMember && ownMember.user_id === room.host_id && !activeBot)
  useEffect(() => {
    if (botInserted && (!room || room.status !== 'open' || room.members.length !== 1 || !ownMember || ownMember.user_id !== room.host_id)) setBotInserted(false)
  }, [botInserted, room, ownMember])
  useEffect(() => {
    if (!activeBot) { setBotReady(false); return }
    setBotReady(false)
    const timer = window.setTimeout(() => setBotReady(true), 2000)
    return () => window.clearTimeout(timer)
  }, [activeBot, room?.id])

  const inviteLink = room && typeof window !== 'undefined' ? `${window.location.origin}/?room=${encodeURIComponent(room.code)}` : ''
  const copyInvite = async () => {
    try { await navigator.clipboard.writeText(inviteLink); setNotice('Invitation link copied.') }
    catch { setNotice('Could not copy the invitation link in this browser.') }
  }
  const insertBot = () => {
    if (!canInsertBot) {
      setError('A campaign bot can only be added to an empty room that you host.')
      return
    }
    setError(null)
    setNotice(null)
    setBotReady(false)
    setBotInserted(true)
  }
  const removeBot = () => {
    setBotInserted(false)
    setBotReady(false)
    setError(null)
  }
  const readyAction = async () => {
    if (!ownMember || !room) return
    if (!activeBot) { void roomAction(ownMember.ready ? 'cancel-ready' : 'ready'); return }
    if (!botReady) return
    const city = ownMember.city_id === DEFAULT_CITY_ID
      ? cities[Math.floor(Math.random() * cities.length)]
      : getCityById(ownMember.city_id)
    if (!city || !onCampaignCity) {
      setError('A city kit is required to start the campaign with the bot.')
      return
    }
    if (await roomAction('leave')) {
      setBotInserted(false)
      setBotReady(false)
      setLobbyOpen(false)
      setOpen(false)
      onCampaignCity(city)
    }
  }
  const tabs: Array<{ id: OnlineHubTab; label: string; icon: typeof Globe2 }> = [
    { id: 'rooms', label: 'Rooms', icon: Globe2 },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'profile', label: 'Profile', icon: UserRound },
  ]
  const selectTab = (id: OnlineHubTab) => {
    if (id === 'room') {
      setOpen(false)
      setLobbyOpen(true)
      return
    }
    setTab(id)
    if (id === 'rooms') {
      setShowDirectory(true)
      setCreateOpen(false)
    } else {
      setShowDirectory(false)
      setCreateOpen(false)
    }
  }

  return <>
    {showLaunchers && (
      <div className="flex gap-2">
        {ownMember && room && (
          <Button variant="outline" className={styles.mapButton} onClick={() => { setOpen(false); setLobbyOpen(true) }}>
            <DoorOpen className="size-3.5" />Lobby
          </Button>
        )}
        <Button variant="outline" className={styles.mapButton} onClick={() => launch('friends')}>
          <Users className="size-3.5" />Friends
        </Button>
      </div>
    )}
    {showMapRooms && <aside aria-label="Games and public rooms" className={styles.mapRooms}>
      {runningGames.games.length > 0 && <section aria-labelledby="running-games-heading" className={styles.mapRoomList}>
        <h2 id="running-games-heading" className={styles.mapRoomHeading}>Games in progress</h2>
        {runningGames.games.map(game => {
          const city = getCityById(game.context_city_id)
          const isWaiting = game.turn !== game.color
          return <button key={game.id} type="button" aria-label={`Return to game against ${game.opponent.display_name}`} className={cn(styles.mapButton, styles.mapRoom, styles.mapRunningGame, isWaiting && styles.mapRoomWaiting)} onClick={() => { setOpen(false); onMatch(game.id) }}>
            <span className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 flex-1 py-1">
                <span className="block break-words text-xs">{game.opponent.display_name}</span>
                {city && <span className="mt-0.5 block text-[10px] text-white/50">{city.year} {city.name}</span>}
                <span className={cn('mt-0.5 block text-[10px]', game.turn === game.color ? 'text-primary' : 'text-white/50')}>
                  {game.turn === game.color ? 'Your turn' : 'Waiting for opponent'}
                </span>
              </span>
              <RunningGameMiniature game={game} />
            </span>
          </button>
        })}
        <button
          type="button"
          aria-label="Create lobby"
          className={cn(styles.mapButton, 'w-full cursor-pointer')}
          disabled={Boolean(busy)}
          onClick={() => {
            setTab('rooms')
            setShowDirectory(false)
            setCreateKitId(DEFAULT_CITY_ID)
            setError(null)
            setCreateOpen(true)
            setLobbyOpen(false)
            setOpen(true)
          }}
        >
          <Plus aria-hidden="true" className="size-3.5" />Create lobby
        </button>
      </section>}
      {runningGames.error && <div className="space-y-1 text-xs"><p role="alert" className="text-rose-200">Não foi possível carregar suas partidas.</p><p className="break-words text-white/50">{runningGames.error}</p><button type="button" className={styles.mapButton} aria-busy={runningGames.retrying} disabled={runningGames.retrying} onClick={() => void runningGames.refresh()}>{runningGames.retrying ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-3.5" />}{runningGames.retrying ? 'Atualizando…' : 'Tentar novamente'}</button></div>}
      <section aria-labelledby="public-rooms-heading" className={styles.mapRoomList}>
        <h2 id="public-rooms-heading" className={styles.mapRoomHeading}>
          <button type="button" className={styles.mapRoomHeadingButton} onClick={() => launch('rooms')}>
            Public rooms
          </button>
        </h2>
        {rooms.length > 0 && <div className={styles.mapRoomList}>{rooms.slice(0, 5).map(entry => <button key={entry.code} type="button" aria-label={`Entrar na sala de ${entry.creator_name}`} className={cn(styles.mapButton, styles.mapRoom, styles.mapPublicRoom)} disabled={Boolean(busy) || entry.players >= 2} onClick={() => { setTab('rooms'); setOpen(true); setCreateOpen(false); setShowDirectory(false); void roomAction('join', entry.code) }}>
          <span className="flex min-w-0 items-center justify-between gap-2"><span className="min-w-0 flex-1"><span className="block break-words">{entry.creator_name}</span><span className="block text-white/50">1v1 casual · {entry.players}/2</span></span><LogIn aria-hidden="true" className="size-4 shrink-0" /></span>
        </button>)}</div>}
        {rooms.length > 5 && <button type="button" className={styles.mapButton} onClick={() => launch('rooms')}>Ver todas</button>}
      </section>
    </aside>}
    <Dialog modal={false} open={isOpen} onOpenChange={setOpen}>
      {isOpen && <DialogContent floating closeOnInteractOutside className={cn('max-w-xl border-primary/30 bg-[#101713] text-[#dfe8df]', styles.responsiveContent)} closeLabel="Close online panel">
        <DialogHeader className="sr-only">
          <DialogTitle>{tab === 'rooms' ? '1v1 casual online' : tab === 'friends' ? 'Friends' : 'Your profile'}</DialogTitle>
          <DialogDescription>{tab === 'rooms' ? 'Play ChickenChess online with another player, powers, and each team’s kits.' : tab === 'friends' ? 'Add friends with their profile code or email and manage received requests.' : 'Your name, progress, and online account.'}</DialogDescription>
        </DialogHeader>
        <nav aria-label="Online area" className="grid grid-cols-3 gap-1 border-b border-white/10 pb-3 pr-6 sm:flex sm:gap-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <div key={id} className="min-w-0">
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={tab === id}
                className={cn(
                  'w-full min-w-0 gap-1 border border-transparent px-1 text-xs hover:border-primary hover:text-white focus-visible:border-primary focus-visible:text-white sm:gap-2 sm:px-3 sm:text-sm',
                  tab === id
                    ? 'bg-primary/15 text-primary hover:!bg-primary/15 focus-visible:!bg-primary/15 dark:hover:!bg-primary/15 dark:focus-visible:!bg-primary/15'
                    : 'text-white/60 hover:!bg-transparent focus-visible:!bg-transparent dark:hover:!bg-transparent dark:focus-visible:!bg-transparent',
                )}
                onClick={() => selectTab(id)}
              >
                <Icon className="size-3.5 shrink-0 sm:size-4" />{label}
              </Button>
            </div>
          ))}
        </nav>
        {tab === 'profile' ? <ProfilePane playerProfile={playerProfile} onSignIn={() => { setOpen(false); openLogin() }} />
          : !configured ? <p className="rounded-md border border-white/15 p-4 text-sm leading-relaxed text-white/65">{ONLINE_CONFIGURATION_MESSAGE}</p>
          : tab === 'friends' ? <FriendsPane onCreateGame={handleCreateGameWithFriend} />
          : createOpen ? <div className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="online-create-kit" className="text-xs text-white/55">Your team kit</label>
              <select
                id="online-create-kit"
                aria-label="Your team kit"
                className={`${inputClass} w-full`}
                value={createKitId}
                disabled={Boolean(busy)}
                onChange={(event) => setCreateKitId(event.target.value)}
              >
                <option className="bg-[#101713]" value={DEFAULT_CITY_ID}>Random</option>
                {availableCities.map((city) => <option className="bg-[#101713]" key={city.id} value={city.id}>{city.year} {city.name} · {city.genre}</option>)}
              </select>
            </div>
            <p className="text-sm text-white/65">Choose who can find your room.</p>
            <RoomVisibility disabled={Boolean(busy)} onChoose={(isPublic) => void roomAction('create', undefined, createKitId, isPublic)} />
            {actionError}
            <Button size="sm" variant="ghost" className="text-white/50" disabled={Boolean(busy)} onClick={() => setCreateOpen(false)}><ArrowLeft />Back to rooms</Button>
          </div> : <div className="space-y-4">
            <div className="space-y-2">
              <Button className="h-11 w-full" disabled={Boolean(busy)} onClick={() => { setCreateOpen(true); setCreateKitId(DEFAULT_CITY_ID); setError(null) }}><Plus />Create room</Button>
              {room && <Button variant="ghost" className="h-11 w-full border border-white/20 bg-transparent text-white/65 hover:border-primary hover:!bg-transparent hover:text-primary dark:hover:!bg-transparent" onClick={() => { setOpen(false); setLobbyOpen(true) }}>Return to lobby</Button>}
            </div>
            <div className="flex items-center justify-between text-xs text-white/45"><span>{connected ? 'Live public rooms' : loading ? 'Loading rooms…' : 'Reconnecting…'}</span><button type="button" aria-label="Refresh rooms" aria-busy={refreshingRooms} disabled={refreshingRooms} onClick={refreshRoomsManually}><RefreshCw className={cn('size-3.5', refreshingRooms && 'animate-spin')} /></button></div>
            <div className="space-y-2 ">{loading && !rooms.length ? <p role="status" className="py-6 text-center text-sm text-white/45">Loading rooms…</p> : rooms.length ? rooms.map((entry) => <div key={entry.code} className="flex items-center justify-between gap-3 rounded-md border border-white/15 bg-black/20 p-3"><div><p className="break-words text-sm">{entry.creator_name}</p><p className="text-xs text-white/45">1v1 casual · {entry.players}/2 · <span className="font-mono">{shortRoomCode(entry.code)}</span></p></div><Button size="sm" disabled={Boolean(busy) || entry.players >= 2} onClick={() => void roomAction('join', entry.code)}>Join<LogIn aria-hidden="true" className="size-4" /></Button></div>) : <p className="rounded-md border border-dashed border-white/15 py-6 text-center text-sm text-white/45">No public rooms are open. Create the first one.</p>}</div>
            {directoryError && <p role="alert" className="text-sm text-rose-200">{directoryError}</p>}
            {actionError}<form className="space-y-2 pt-4" onSubmit={(event) => { event.preventDefault(); void roomAction('join', code) }}><label htmlFor="online-room-code" className="text-xs text-white/55">Have a room ID?</label><div className="flex flex-wrap gap-2"><input id="online-room-code" className={`${inputClass} flex-1 font-mono uppercase`} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Room ID" maxLength={32} required /><Button type="submit" variant="outline" className="border-white/20 bg-transparent" disabled={Boolean(busy) || !code.trim()}>Join by ID</Button></div></form>
          </div>}
        {(!configured || (tab === 'rooms' && createOpen && !room)) && actionError}
        {busy === 'invite' && <p role="status" className="text-sm text-white/55">Opening invitation…</p>}
      </DialogContent>}
    </Dialog>
    <Dialog modal={false} open={lobbyOpen && Boolean(room)} onOpenChange={setLobbyOpen}>
      {lobbyOpen && room && <DialogContent floating closeOnInteractOutside className={cn('max-w-xl border-primary/30 bg-[#101713] text-[#dfe8df]', styles.responsiveContent, flash && styles.joinFlash)} closeLabel="Close lobby">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <DoorOpen className="size-4 text-primary" />
            Lobby <span className="font-mono tracking-wider text-primary">{shortRoomCode(room.code)}</span>
          </DialogTitle>
          <DialogDescription className="sr-only">Choose a kit, invite another player, and get ready to play.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex min-w-0 items-center justify-between">
            <p className="min-w-0 truncate text-sm text-white/70">{room.is_public ? 'Public lobby' : 'Private lobby'}</p>
            <button type="button" className="text-white/45 hover:text-white" aria-label="Refresh lobby from server" title="Load the latest lobby details" onClick={() => void refreshRoom().catch((cause) => setError(onlineErrorMessage(cause)))}><RefreshCw className="size-4" /></button>
          </div>
          {room.status === 'open' && room.host_id === user?.id && <div className="space-y-2"><RoomVisibility value={room.is_public} disabled={Boolean(busy)} onChoose={(isPublic) => void roomAction('visibility', room.code, DEFAULT_CITY_ID, isPublic)} /></div>}
          <div className="space-y-3">
            {room.members.map((member) => <div key={member.user_id} className={cn('space-y-3 rounded-md border p-3', member.ready ? 'border-primary/35 bg-primary/15' : 'border-white/15 bg-black/20')}>
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 flex-1 items-start gap-2">{member.user_id !== user?.id && ownMember && <AddFriendButton iconOnly targetCode={member.profile.code} />}<div className="min-w-0 flex-1"><p className="min-w-0 break-words text-sm font-medium">{member.profile.display_name}{member.user_id === user?.id ? ' (you)' : ''}</p><p className="text-[11px] text-white/45">{member.color === 'w' ? 'White' : 'Black'} · {member.profile.code}</p></div></div><span className={cn('inline-flex items-center gap-1 text-xs', member.ready ? 'text-primary' : 'text-white/40')}>{member.ready && <Check aria-hidden="true" className="size-3.5 text-[#39ff14]" />}{member.ready ? 'Ready' : 'Choosing a kit'}</span></div>
              {member.user_id === user?.id && room.status === 'open' && <select aria-label="Your team kit" className={`${inputClass} w-full`} value={member.city_id} disabled={Boolean(busy)} onChange={(event) => void roomAction('kit', room.code, event.target.value)}><option className="bg-[#101713]" value={DEFAULT_CITY_ID}>Random</option>{availableCities.map((city) => <option className="bg-[#101713]" key={city.id} value={city.id}>{city.year} {city.name} · {city.genre}</option>)}</select>}
              <KitPreview member={member} />
            </div>)}
            {activeBot && <div className={cn('space-y-3 rounded-md border p-3', botReady ? 'border-primary/35 bg-primary/15' : 'border-white/15 bg-black/20')}>
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 flex-1 items-start gap-2"><Bot aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="min-w-0 break-words text-sm font-medium">Campaign bot</p><p className="text-[11px] text-white/45">Uses your kit in the campaign</p></div></div><div className="flex items-center gap-2"><button type="button" className="cursor-pointer text-xs text-white/55 underline decoration-white/25 underline-offset-2 hover:text-white disabled:cursor-default disabled:opacity-50" disabled={Boolean(busy)} onClick={removeBot}>Remove</button><span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1 text-xs', botReady ? 'text-primary' : 'text-white/40')}>{botReady && <Check aria-hidden="true" className="size-3.5 text-[#39ff14]" />}{botReady ? 'Ready' : 'Choosing a kit'}</span></div></div>
            </div>}
            <div className="space-y-2 rounded-md border border-dashed border-white/15 p-4 text-center">
              {!activeBot && room.members.length < 2 && <p className="text-sm text-white/40">Waiting for another player · {room.members.length}/2</p>}
              <div className="flex flex-wrap items-start justify-center gap-2">
                <div className="flex flex-col items-center gap-1"><Button size="sm" variant="ghost" className="text-white hover:!bg-blue-950/80 hover:!text-white focus-visible:!bg-blue-950/80 focus-visible:!text-white" onClick={() => void copyInvite()}><Copy aria-hidden="true" />Invite a friend</Button>{notice && <p role="status" className="text-xs text-primary">{notice}</p>}</div>
                <Button size="sm" variant="ghost" disabled={!canInsertBot} className="text-white hover:!bg-blue-950/80 hover:!text-white focus-visible:!bg-blue-950/80 focus-visible:!text-white" onClick={insertBot}><Bot aria-hidden="true" />{activeBot ? 'Bot inserted' : 'Insert Bot'}</Button>
              </div>
              {activeBot && ownMember?.city_id === DEFAULT_CITY_ID && <p className="text-xs text-white/40">Random selects the same kit for you and the bot when the campaign starts.</p>}
            </div>
          </div>
          {actionError}
          {room.status !== 'open' && <p className="text-sm text-white/60">{room.status === 'playing' ? 'This lobby is already in a game.' : 'This lobby has been closed.'}</p>}
          {ownMember && room.status === 'playing' && room.match_id && <Button className="w-full" onClick={() => { setLobbyOpen(false); onMatch(room.match_id!) }}><LogIn />Return to game</Button>}
          {ownMember ? <div className="flex items-center justify-between gap-3"><Button size="sm" variant="ghost" className="shrink-0 text-white hover:bg-transparent hover:text-white focus-visible:bg-transparent focus-visible:text-white" disabled={Boolean(busy)} onClick={() => void roomAction('leave')}><ExitRoomIcon />Leave lobby</Button>{room.status === 'open' && <Button variant={ownMember.ready ? 'outline' : 'default'} className={cn('h-11 w-40 shrink-0 justify-center px-2', ownMember.ready && 'border-primary/45 bg-transparent text-primary/75 hover:bg-transparent hover:text-primary')} disabled={Boolean(busy) || (activeBot ? !botReady : room.members.length !== 2)} onClick={() => void readyAction()}>{busy === 'ready' || busy === 'cancel-ready' || busy === 'leave' ? <Loader2 className="animate-spin" /> : <Check />}{ownMember.ready ? 'Cancel ready' : 'I’m ready!'}</Button>}</div> : <div className="flex items-center justify-between gap-3">{room.status === 'open' && <Button className="h-11 flex-1" disabled={Boolean(busy) || room.members.length >= 2} onClick={() => void roomAction('join', room.code)}><DoorOpen />Join lobby</Button>}<Button size="sm" variant="ghost" className="text-white/55" onClick={() => { roomGeneration.current += 1; applyRoom(null); setLobbyOpen(false); setTab('rooms'); setOpen(true) }}><ArrowLeft />Back to rooms</Button></div>}
        </div>
      </DialogContent>}
    </Dialog>
  </>
}
