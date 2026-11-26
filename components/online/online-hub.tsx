'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ArrowLeft, Bot, Check, ChevronRight, Copy, DoorOpen, Dice5, EyeOff, Gamepad2, Globe2, Loader2, LogIn, MoreVertical, Music2, Plus, RefreshCw, Shuffle, Shirt, Trash2, UserPlus, Users, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { cities, getCityById, type CityData } from '@/lib/cities-data'
import { isCityUnlocked, type PlayerProfile } from '@/lib/game-progression'
import { getOnlineClient, ONLINE_CONFIGURATION_MESSAGE, onlineErrorMessage, onlineRpc, requireOnlineClient } from '@/lib/online/client'
import type { GameAction, OnlineFriend, OnlineMatch, OnlineRoom, PublicRoom, RoomMember, RunningGame } from '@/lib/online/types'
import type { MatchPower } from '@/lib/chess-powers'
import type { CreativeSession } from '@/lib/music/creative'
import { replayMatch } from '@/lib/online/domain'
import { isHiddenFriend, migrateHiddenFriendKeys, profileCodeMatches } from '@/lib/online/profile-code'
import { sendInvite } from '@/lib/online/invites'
import { Chess } from 'chess.js'
import { cn, stableHtml } from '@/lib/utils'
import { PiecesSVG } from '@/lib/chess-piece-svg'
import { useOnline } from './online-provider'
import { disposeLobbyAudio, playLobbyJoinSound, prepareLobbyAudio } from './lobby-audio'
import styles from './online-hub.module.css'
import { applyDirectoryChange, isAlreadyInRoom, mapLobbyRooms, roomArrivalNames, roomErrorMessage, startedRoomMatch, type DirectoryChange } from '@/lib/online/lobby-updates'
import { ProfilePane } from './profile-pane'
import { useRunningGames } from '@/hooks/use-running-games'
import { useOnlineAvailability } from '@/hooks/use-online-availability'
import { useLobbyKitAudition } from '@/hooks/use-lobby-kit-audition'
import { useT } from '@/lib/i18n'

const LIGHT_SQUARES = Array.from({ length: 8 }, (_, r) =>
  Array.from({ length: 8 }, (_, c) => ((r + c) % 2 === 0 ? [c, r] : null)).filter(Boolean) as [number, number][]
).flat()

/** Older backends omit actions from the running list; read the match itself then. */
function useRunningGameActions(game: RunningGame) {
  const [fetched, setFetched] = useState<{ key: string; actions: GameAction[] } | null>(null)
  const key = `${game.id}:${game.updated_at}`
  useEffect(() => {
    if (game.actions) return
    let active = true
    void onlineRpc<OnlineMatch>('get_online_match', { p_match_id: game.id })
      .then((match) => { if (active && match?.state?.actions) setFetched({ key, actions: match.state.actions }) })
      .catch(() => {})
    return () => { active = false }
  }, [game.actions, game.id, key])
  return game.actions ?? fetched?.actions ?? []
}

function RunningGameMiniature({ game }: { game: RunningGame }) {
  const actions = useRunningGameActions(game)
  const { board, powers } = useMemo(() => {
    try {
      const replay = replayMatch({ actions })
      return { board: replay.game.board(), powers: replay.powers }
    } catch {
      return { board: new Chess().board(), powers: [] as MatchPower[] }
    }
  }, [actions])

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

      {powers.map((power) => {
        const file = power.square.charCodeAt(0) - 97
        const rank = Number(power.square[1])
        const x = (isFlipped ? 7 - file : file) * 8
        const y = (isFlipped ? rank - 1 : 8 - rank) * 8
        return power.kind === 'freeze'
          ? <rect key={`power-${power.id}`} data-mini-power="freeze" x={x} y={y} width={8} height={8} fill="#7fd6ff" fillOpacity="0.55" stroke="#bfeaff" strokeWidth="0.8" />
          : <rect key={`power-${power.id}`} data-mini-power="shield" x={x + 0.5} y={y + 0.5} width={7} height={7} rx={1} fill="#ffbd24" fillOpacity="0.25" stroke="#ffcf48" strokeWidth="1" />
      })}

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

export type OnlineHubTab = 'rooms' | 'friends' | 'profile' | 'wardrobe' | 'room'
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
  /** The map header hosts these controls while the hub retains their state. */
  launcherContainer?: HTMLElement | null
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
  const t = useT()
  const { user, profile, configured } = useOnline()
  const { friends, loading, act } = useFriendList(configured)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const relation = friends.find((friend) => friend.profile.code.toUpperCase() === targetCode.toUpperCase())
  const incoming = relation?.status === 'pending' && relation.sender_id !== user?.id
  const isSelf = profile?.code.toUpperCase() === targetCode.toUpperCase()
  const label = isSelf ? t('Your profile') : relation?.status === 'accepted' ? t('Friends') : incoming ? t('Accept request') : relation ? t('Request sent') : t('Add friend')
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

/** Each replacement is clipped independently, including its delayed outgoing copy. */
function KitSlide({ children, previous, delay = 0, className }: {
  children: ReactNode; previous?: ReactNode; delay?: number; className?: string
}) {
  return <span className={cn(styles.kitSlide, className)}>
    {previous && <span aria-hidden="true" className={styles.kitSlideOutgoing} style={{ animationDelay: `${delay}ms` }}>{previous}</span>}
    <span className={previous ? styles.kitSlideIncoming : styles.kitSlideContent} style={{ animationDelay: `${delay}ms` }}>{children}</span>
  </span>
}

type KitPreviewData = { cityId: string; kit: CreativeSession }

function KitPreview({ member, identity, randomCities, unlockedCities, onChooseKit, disabled, play, stop, cancelHover, confirmHover }: {
  member: RoomMember
  identity: ReactNode
  unlockedCities?: CityData[]
  randomCities: CityData[]
  onChooseKit?: (cityId: string) => void
  disabled?: boolean
} & ReturnType<typeof useLobbyKitAudition>) {
  const t = useT()
  const [expanded, setExpanded] = useState(true)
  const [randomExpanded, setRandomExpanded] = useState(false)
  const [preview, setPreview] = useState<(KitPreviewData & { previous?: KitPreviewData; delays: number[] }) | null>(null)
  const kit = preview?.kit
  const city = getCityById(preview?.cityId ?? member.city_id)
  const previousCity = preview?.previous && getCityById(preview.previous.cityId)
  const changing = Boolean(preview?.previous) || preview?.cityId !== member.city_id
  const lastHover = useRef<{ id: string; time: number } | null>(null)
  const previewOwner = `${member.user_id}:${member.city_id}`
  useEffect(() => () => stop(previewOwner), [previewOwner, stop])
  useEffect(() => {
    let mounted = true
    setExpanded(true)
    setRandomExpanded(false)
    if (member.city_id === DEFAULT_CITY_ID) {
      setPreview(null)
      return () => { mounted = false }
    }
    void import('@/lib/music/city-kits').then(({ defaultCityKit }) => {
      if (!mounted) return
      const nextKit = defaultCityKit(member.city_id)
      if (!nextKit) return
      const next = { cityId: member.city_id, kit: nextKit }
      const delays = Array.from({ length: 19 }, () => Math.floor(Math.random() * 141))
      setPreview(current => ({ ...next, delays, previous: current && current.cityId !== next.cityId
        ? { cityId: current.cityId, kit: current.kit } : undefined }))
    }).catch(() => {})
    return () => { mounted = false }
  }, [member.city_id, member.color])
  useEffect(() => {
    if (!preview?.previous) return
    const timer = window.setTimeout(() => setPreview(current => current === preview ? { ...current, previous: undefined } : current), 520)
    return () => window.clearTimeout(timer)
  }, [preview])
  const rollKit = () => {
    if (disabled || changing || !onChooseKit) return
    const choices = randomCities.filter(candidate => candidate.id !== member.city_id)
    if (choices.length) onChooseKit(choices[Math.floor(Math.random() * choices.length)].id)
  }
  const rollRandomKit = () => {
    if (disabled || !onChooseKit || !randomCities.length) return
    onChooseKit(randomCities[Math.floor(Math.random() * randomCities.length)].id)
  }
  if (member.city_id === DEFAULT_CITY_ID) return <div className={styles.kitPreviewContainer}>
    <div className={styles.kitPreviewTop}>
      {identity}
      <div className="ml-auto flex min-w-0 items-center gap-3">
        <div className="flex min-h-14 min-w-0 flex-col justify-center text-right">
          <p className="text-sm text-primary">{t('Random')}</p>
          {unlockedCities && <button type="button" aria-expanded={randomExpanded} onClick={() => setRandomExpanded(value => !value)} className="mt-1 inline-flex items-center justify-end gap-1 text-xs text-white/55 hover:text-white"><ChevronRight aria-hidden="true" className={cn('size-3 transition-transform motion-reduce:transition-none', randomExpanded && 'rotate-90')} />{t('Select a kit')}</button>}
        </div>
        <button type="button" aria-label={t('Select a random kit')} title={t('Select a random kit')} disabled={disabled || !onChooseKit || !randomCities.length} onClick={rollRandomKit} className="group flex h-14 w-20 shrink-0 cursor-pointer items-center justify-center rounded border border-primary/30 bg-primary/10 text-primary transition-all hover:border-primary hover:bg-primary/20 hover:text-white hover:shadow-[0_0_10px_var(--primary)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary disabled:cursor-default disabled:opacity-50"><Shuffle aria-hidden="true" className="size-6 transition-transform group-hover:rotate-90 motion-reduce:transition-none" /></button>
      </div>
    </div>
    {randomExpanded && unlockedCities && <div className="mt-3 min-w-0 text-xs text-white/55">{unlockedCities.length ? <p className="leading-relaxed">{unlockedCities.map((unlockedCity, index) => <span key={unlockedCity.id}><button type="button" disabled={disabled} className="cursor-pointer text-left underline decoration-white/25 underline-offset-2 hover:text-primary focus-visible:text-primary disabled:cursor-default disabled:no-underline disabled:opacity-60" onClick={() => onChooseKit?.(unlockedCity.id)}>{unlockedCity.year} {unlockedCity.name}{index < unlockedCities.length - 1 ? ',' : ''}</button>{' '}</span>)}</p> : <p>{t('No campaign kits available.')}</p>}</div>}
  </div>
  if (!city) return <div className={styles.kitPreviewTop}>{identity}<p className="text-xs text-white/50">{t('Kit {id}', { id: member.city_id })}</p></div>
  return <div className={styles.kitPreviewContainer}>
   <div className={styles.kitPreviewGrid} data-expanded={expanded}>
    <div className={styles.kitPreviewTop}>
      {identity}
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <button type="button" aria-expanded={expanded} onClick={() => { if (expanded) stop(previewOwner); setExpanded(value => !value) }} className={cn(styles.kitPreviewHeading, 'group cursor-pointer text-right')}>
          <span className="flex min-h-14 min-w-0 flex-col justify-center">
            <KitSlide key={`title:${city.id}`} delay={preview?.delays[0]} previous={previousCity && <span style={{ color: previousCity.color }}>{previousCity.year} {previousCity.name}</span>} className="text-sm">
              <span style={{ color: city.color }}>{city.year} {city.name}</span>
            </KitSlide>
            <span className="mt-1 inline-flex min-w-0 items-center justify-end gap-1 text-xs text-white/55 group-hover:text-white"><ChevronRight aria-hidden="true" className={cn('size-3 shrink-0 transition-transform motion-reduce:transition-none', expanded && 'rotate-90')} /><KitSlide key={`genre:${city.id}`} delay={preview?.delays[1]} previous={previousCity?.genre}>{city.genre}</KitSlide></span>
          </span>
          <KitSlide key={`image:${city.id}`} delay={preview?.delays[2]} className="h-14 w-20 rounded" previous={previousCity && <img src={previousCity.image} alt="" className="h-14 w-20 object-cover" />}>
            <img src={city.image} alt="" className="h-14 w-20 object-cover" />
          </KitSlide>
        </button>
        {onChooseKit && <button type="button" aria-label={t('Select Random kit')} title={t('Roll another kit')} disabled={disabled || changing || !randomCities.some(candidate => candidate.id !== member.city_id)} onClick={rollKit} className="flex h-14 w-8 shrink-0 items-center justify-center rounded border border-white/20 text-white/65 hover:border-primary hover:text-primary disabled:opacity-50"><Dice5 aria-hidden="true" className="size-4" /></button>}
      </div>
    </div>
    <div className={styles.kitInstrumentReveal} data-expanded={expanded} aria-hidden={!expanded} inert={!expanded}>
      <div className={styles.kitInstrumentList}>
        {kit?.pieces.filter(piece => piece.color === member.color).map((piece, index) => <button
          key={piece.origin}
          disabled={changing}
          type="button"
          className="group flex min-w-0 items-start gap-1 text-left hover:text-primary focus-visible:text-primary focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary"
          aria-label={t('Play {name} at {origin}', { name: kit.instruments[piece.id]?.name || piece.type, origin: piece.origin })}
          onPointerEnter={event => {
            if (changing || event.pointerType !== 'mouse') return
            lastHover.current = { id: piece.id, time: Date.now() }
            play(kit, piece, previewOwner, 'hover')
          }}
          onPointerLeave={() => cancelHover(previewOwner)}
          onClick={event => {
            if (event.detail && lastHover.current?.id === piece.id && Date.now() - lastHover.current.time < 250) {
              confirmHover(previewOwner)
              return
            }
            play(kit, piece, previewOwner, 'press')
          }}
        >
          <KitSlide key={`${city.id}:${piece.origin}`} className="flex-1" delay={preview?.delays[index + 3]} previous={preview?.previous && <span className="flex min-w-0 items-start gap-1">
            <span className="shrink-0 font-mono text-white/35">{piece.origin}</span>
            <span aria-hidden="true" className={styles.kitPieceIcon} dangerouslySetInnerHTML={stableHtml(PiecesSVG[`${member.color}${piece.type.toUpperCase()}` as keyof typeof PiecesSVG] || '')} />
            <span className="min-w-0 break-words">{preview.previous?.kit.instruments[piece.id]?.name || piece.type}</span>
          </span>}>
          <span className="flex min-w-0 items-start gap-1">
          <span className="shrink-0 font-mono text-white/35">{piece.origin}</span>
          <span aria-hidden="true" className={styles.kitPieceIcon} dangerouslySetInnerHTML={stableHtml(PiecesSVG[`${member.color}${piece.type.toUpperCase()}` as keyof typeof PiecesSVG] || '')} />
          <span className="min-w-0 break-words">{kit.instruments[piece.id]?.name || piece.type}</span>
          </span>
          </KitSlide>
        </button>)}
      </div>
    </div>
   </div>
  </div>
}

function RoomVisibility({ value, code, disabled, onChoose }: { value: boolean; code: string; disabled: boolean; onChoose: (isPublic: boolean) => void }) {
  const t = useT()
  return <div className="flex flex-wrap items-center gap-2">{[
    { isPublic: true, label: t('Public'), description: t('Visible in the room list.') },
    { isPublic: false, label: t('Private'), description: t('Join by ID or invitation.') },
  ].map((choice) => {
    const selected = value === choice.isPublic
    return <button key={choice.label} type="button" disabled={disabled} aria-pressed={selected} title={choice.description} className={cn(
      'cursor-pointer rounded-md border px-3 py-2 text-sm transition-colors disabled:cursor-default',
      selected
        ? 'border-primary bg-transparent font-medium text-primary'
        : 'border-white/20 bg-transparent text-white/65 enabled:hover:border-primary/70 enabled:hover:text-primary',
    )} onClick={() => { if (value !== choice.isPublic) onChoose(choice.isPublic) }}>
      {choice.label}{selected && <> <span className="text-primary">{t('Lobby')}</span> <span className="font-mono tracking-wider text-white">{shortRoomCode(code)}</span></>}
    </button>
  })}</div>
}

function ExitRoomIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M15 20.5H10M15 20.5V3H2.5v16l7.8 3.5V7L2.5 3" /><path d="M7.9 13v2" /><path d="M22 10h-6.7l2-3.3h-2.1L12.5 11l2.7 4.4h2.1l-2-3.4H22z" /></svg>
}

// Hidden friends are stored by account id (older lists stored profile codes and migrate on the next friends list).
const HIDDEN_FRIENDS_PREFIX = 'chickenchess:hidden_friends:'
function getHiddenFriends(userId: string | undefined): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(`${HIDDEN_FRIENDS_PREFIX}${userId || 'guest'}`)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}
function saveHiddenFriends(userId: string | undefined, hidden: Set<string>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${HIDDEN_FRIENDS_PREFIX}${userId || 'guest'}`, JSON.stringify(Array.from(hidden)))
  } catch {
    // Ignore storage errors
  }
}

/** Wardrobe tab: placeholder until its contents are defined. */
function WardrobePane() {
  const t = useT()
  return <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-white/15 px-4 py-10 text-center">
    <Shirt aria-hidden="true" className="size-8 text-primary/70" />
    <p className="text-sm font-medium text-white/80">{t('Vestiário')}</p>
    <p className="text-xs text-white/50">{t('Em breve: roupas e acessórios para a sua galinha.')}</p>
  </div>
}

/** The button on each accepted friend: Create game on the globe, Invite inside the Pátio. The text it resolves to is
 * shown under the list; an error's message too. */
export type FriendPaneAction = { label: string; icon?: ReactNode; run: (friend: OnlineFriend) => Promise<string | void> | string | void }

export function FriendsPane({ onCreateGame, friendAction }: { onCreateGame?: (friend: OnlineFriend) => void; friendAction?: FriendPaneAction }) {
  const t = useT()
  const { user } = useOnline()
  const { friends, loading, error, act, refresh } = useFriendList(true)
  const [targetCode, setTargetCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(() => getHiddenFriends(user?.id))

  useEffect(() => {
    setHidden(getHiddenFriends(user?.id))
  }, [user?.id])

  useEffect(() => {
    setHidden(prev => {
      const next = migrateHiddenFriendKeys(prev, friends.map((friend) => friend.profile))
      if (next !== prev) saveHiddenFriends(user?.id, next)
      return next
    })
  }, [friends, user?.id])

  const hideFriend = (friend: OnlineFriend) => {
    setHidden(prev => {
      const next = new Set(prev)
      next.add(friend.profile.id)
      saveHiddenFriends(user?.id, next)
      return next
    })
    setNotice(t('{name} is now hidden from your friends list.', { name: friend.profile.display_name }))
  }

  const unhideFriend = (friend: OnlineFriend) => {
    const code = friend.profile.code.toUpperCase()
    setHidden(prev => {
      if (!prev.has(friend.profile.id) && !prev.has(code)) return prev
      const next = new Set(prev)
      next.delete(friend.profile.id)
      next.delete(code)
      saveHiddenFriends(user?.id, next)
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
            isHiddenFriend(hidden, entry.profile) ||
            profileCodeMatches(entry.profile.code, query)
          )
        )
        if (unhidden && isHiddenFriend(hidden, unhidden.profile)) {
          unhideFriend(unhidden)
          setNotice(t('{name} is visible again in your friends list.', { name: unhidden.profile.display_name }))
        } else {
          const relation = next?.find((entry) => profileCodeMatches(entry.profile.code, query))
          setNotice(
            relation?.status === 'accepted'
              ? t('Friend request accepted.')
              : relation?.sender_id !== user?.id
                ? t('Request received. Accept it in the list below.')
                : t('Friend request sent.')
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
      (f) => f.status === 'accepted' && isHiddenFriend(hidden, f.profile) && profileCodeMatches(f.profile.code, query)
    )
    if (existingHidden) {
      unhideFriend(existingHidden)
      setNotice(t('{name} is visible again in your friends list.', { name: existingHidden.profile.display_name }))
      setTargetCode('')
      return
    }
    void action('request')
  }

  const visibleAccepted = friends.filter(
    (friend) => friend.status === 'accepted' && !isHiddenFriend(hidden, friend.profile)
  )

  const groups = [
    { title: t('Friends'), entries: visibleAccepted, isAccepted: true },
    { title: t('Received requests'), entries: friends.filter((friend) => friend.status === 'pending' && friend.sender_id !== user?.id), isAccepted: false },
    { title: t('Sent requests'), entries: friends.filter((friend) => friend.status === 'pending' && friend.sender_id === user?.id), isAccepted: false },
  ]

  return (
    <div className="space-y-5">
      <form className="flex flex-wrap gap-2" onSubmit={submitAdd}>
        <label className="sr-only" htmlFor="friend-code">{t('Profile code or email')}</label>
        <input
          id="friend-code"
          className={`${inputClass} flex-1 font-mono`}
          value={targetCode}
          onChange={(event) => setTargetCode(event.target.value)}
          placeholder={t('Profile code or email')}
          maxLength={120}
          required
        />
        <Button type="submit" disabled={Boolean(busy) || !targetCode.trim()}><UserPlus />{t('Add')}</Button>
      </form>
      <div className="flex justify-start text-white/45">
        <button
          type="button"
          aria-label={t('Refresh friends')}
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
                        onClick={() => {
                          if (!friendAction) { onCreateGame?.(friend); return }
                          setBusy(friend.id)
                          setActionError(null)
                          setNotice(null)
                          void Promise.resolve()
                            .then(() => friendAction.run(friend))
                            .then((text) => { if (text) setNotice(text) })
                            .catch((cause) => setActionError(onlineErrorMessage(cause)))
                            .finally(() => setBusy(null))
                        }}
                      >
                        {friendAction ? friendAction.icon ?? <UserPlus className="size-3.5" /> : <Gamepad2 className="size-3.5" />}
                        {friendAction ? t(friendAction.label) : t('Create game')}
                      </Button>
                    </div>
                    <div className="absolute right-2 top-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={t('Friend options')}
                            className="inline-flex size-6 items-center justify-center rounded text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                          >
                            <MoreVertical className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" data-chicken-ignore className="z-[400] border-white/20 bg-[#101713] text-[#dfe8df]">
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={() => hideFriend(friend)}
                          >
                            <EyeOff className="size-3.5" />
                            {t('Hide')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer gap-2 text-xs text-rose-300 hover:bg-rose-500/20 hover:text-rose-200"
                            disabled={Boolean(busy)}
                            onClick={() => void action('remove', friend)}
                          >
                            <Trash2 className="size-3.5" />
                            {t('Remove')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {friend.sender_id === user?.id ? (
                      <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('cancel', friend)}>
                        {t('Cancel')}
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" disabled={Boolean(busy)} onClick={() => void action('accept', friend)}>
                          {t('Accept')}
                        </Button>
                        <Button size="sm" variant="ghost" disabled={Boolean(busy)} onClick={() => void action('reject', friend)}>
                          {t('Decline')}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : loading ? (
            <p role="status" className="text-xs text-white/40">{t('Loading…')}</p>
          ) : null}
        </section>
      ))}
      {(error || actionError) && <p role="alert" className="text-sm text-rose-200">{actionError || error}</p>}
      {notice && <p role="status" className="text-xs text-primary">{t(notice)}</p>}
    </div>
  )
}

export function OnlineHub({ playerProfile, onMatch, onCampaignCity, inviteCode, open, onOpenChange, initialTab, showLaunchers = true, launcherContainer, showMapRooms = false, createRequest, onCreateRequestHandled }: OnlineHubProps) {
  const t = useT()
  const { configured, user, ensureGuest, refreshProfile, openLogin, notify } = useOnline()
  const documentVisible = useDocumentVisible()
  const runningGames = useRunningGames()
  const [internalOpen, setInternalOpen] = useState(Boolean(inviteCode))
  const isOpen = open ?? internalOpen
  const [lobbyOpen, setLobbyOpen] = useState(false)
  const [tab, setTab] = useState<OnlineHubTab>(initialTab === 'profile' || initialTab === 'friends' || initialTab === 'wardrobe' ? initialTab : 'rooms')
  const [_showDirectory, setShowDirectory] = useState(false)
  const [directoryError, setDirectoryError] = useState<string | null>(null)
  const roomsRefreshRevision = useRef(0)
  const [rooms, setRooms] = useState<PublicRoom[]>([])
  const [refreshingRooms, setRefreshingRooms] = useState(false)
  const [room, setRoom] = useState<OnlineRoom | null>(null)
  const [botInserted, setBotInserted] = useState(false)
  const [botReady, setBotReady] = useState(false)
  const [serverKitCatalog, setServerKitCatalog] = useState<string[] | null>(null)

  useEffect(() => {
    if (!configured || (!isOpen && !lobbyOpen) || serverKitCatalog) return
    let active = true
    void onlineRpc<string[]>('online_kit_catalog')
      .then((catalog) => {
        if (active && Array.isArray(catalog) && catalog.length > 0) {
          setServerKitCatalog(catalog)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [configured, isOpen, lobbyOpen, serverKitCatalog])

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
  const randomCities = useMemo(() => serverKitCatalog ? cities.filter(city => serverKitCatalog.includes(city.id)) : [], [serverKitCatalog])
  const unlockedCities = useMemo(() => availableCities.filter((city) => getCityById(city.id) && isCityUnlocked(city.id)), [availableCities])
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { play: playKitInstrument, stop: stopKitInstrument, cancelHover: cancelKitHover, confirmHover: confirmKitHover } = useLobbyKitAudition(lobbyOpen && Boolean(room), setError)
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
  const autoJoinedInvite = useRef<string | null>(null)
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
      for (const name of arrivals) notify(t('{name} joined your lobby.', { name }))
      if (flashTimer.current) clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(false), 1400)
    }
    roomRef.current = next
    setRoom(next)
  }, [notify, t])

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

  // Realtime changes that arrive while a full read is in flight are replayed
  // on top of its snapshot so none is lost.
  const directoryChanges = useRef<DirectoryChange[] | null>(null)
  const legacyDirectory = useRef(false)
  const refreshRooms = useCallback(async (isCurrent: () => boolean = () => true) => {
    const revision = ++roomsRefreshRevision.current
    directoryChanges.current = []
    try {
      const next = await onlineRpc<PublicRoom[]>('online_rooms')
      if (isCurrent() && revision === roomsRefreshRevision.current) {
        legacyDirectory.current = (next || []).some(room => !room.room_id)
        setRooms((directoryChanges.current ?? []).reduce(applyDirectoryChange, next || []))
        setDirectoryError(null)
      }
    } finally {
      if (revision === roomsRefreshRevision.current) directoryChanges.current = null
    }
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

  // With Supabase unreachable or restricted, the globe hides online entry
  // points and stops watching the directory, keeping the campaign in focus.
  const onlineAvailable = useOnlineAvailability() === 'available'
  const watchDirectory = documentVisible && onlineAvailable && (showMapRooms || isOpen)
  useEffect(() => {
    if (!configured || !watchDirectory) return
    let active = true
    let hasSubscribedOnce = false
    setLoading(true)
    void refreshRooms(() => active).catch((cause) => { if (active) setDirectoryError(onlineErrorMessage(cause)) }).finally(() => { if (active) setLoading(false) })
    const online = requireOnlineClient()
    const update = () => { if (active) void refreshRooms(() => active).catch((cause) => { if (active) setDirectoryError(onlineErrorMessage(cause)) }) }
    // Each change carries the row itself; with many viewers on the globe a
    // re-read per change would multiply every lobby update by every viewer.
    const change = (payload: { eventType: string; new?: Partial<PublicRoom>; old?: Partial<PublicRoom> }) => {
      if (!active) return
      const entry: DirectoryChange = payload.eventType === 'DELETE'
        ? { kind: 'delete', room_id: payload.old?.room_id }
        : { kind: 'upsert', room: payload.new as PublicRoom }
      if (legacyDirectory.current || (entry.kind === 'delete' ? !entry.room_id : !entry.room?.room_id)) { update(); return }
      if (directoryChanges.current) directoryChanges.current.push(entry)
      setRooms(current => applyDirectoryChange(current, entry))
    }
    const channel = online.channel(`public-room-directory:${++roomChannelSequence}`, { config: { postgres_changes_options: { wait: true } } })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_public_rooms' }, change)
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
      const inviteRoomCode = inviteCode.trim().toUpperCase()
      let next = await onlineRpc<OnlineRoom>('online_room', { p_action: 'get', p_code: inviteRoomCode })
      if (!active || identityRef.current !== current.id || generation !== roomGeneration.current) return
      // The invitation link admits the visitor at once; a full, started or closed
      // lobby stays as a preview with the server's reason.
      let joinError: unknown = null
      const isMember = next.members.some((member) => member.user_id === current.id)
      if (isMember) autoJoinedInvite.current = inviteRoomCode
      else if (autoJoinedInvite.current !== inviteRoomCode && next.status === 'open' && next.members.length < 2) {
        try {
          await refreshProfile()
          if (!active || identityRef.current !== current.id || generation !== roomGeneration.current) return
          const joined = await onlineRpc<OnlineRoom | null>('online_room', { p_action: 'join', p_code: inviteRoomCode, p_public: true, p_city_id: DEFAULT_CITY_ID })
          if (joined) next = joined
          autoJoinedInvite.current = inviteRoomCode
        } catch (cause) {
          joinError = cause
          next = await onlineRpc<OnlineRoom>('online_room', { p_action: 'get', p_code: inviteRoomCode }).catch(() => next)
        }
        if (!active || identityRef.current !== current.id || generation !== roomGeneration.current) return
      }
      roomGeneration.current += 1
      applyRoom(next)
      setShowDirectory(false)
      setOpen(false)
      setLobbyOpen(true)
      if (joinError && !next.members.some((member) => member.user_id === current.id)) setError(roomErrorMessage(joinError) || onlineErrorMessage(joinError))
      else if (!isMember && autoJoinedInvite.current !== inviteRoomCode && next.status === 'open' && next.members.length >= 2) setError(roomErrorMessage(new Error('ROOM_FULL')))
    })().catch((cause) => { if (active) setError(roomErrorMessage(cause) || onlineErrorMessage(cause)) }).finally(() => { if (active) setBusy(null) })
    return () => { active = false }
  }, [inviteCode, configured, user?.id, ensureGuest, refreshProfile, applyRoom])

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
    setShowDirectory(false)
    const reuseOpenLobby = async () => {
      try {
        const currentUser = await ensureGuest()
        let current = roomRef.current
        if (!current) {
          current = await onlineRpc<OnlineRoom | null>('online_room', { p_action: 'get', p_code: null })
        }
        const member = current?.members.find(candidate => candidate.user_id === currentUser.id)
        if (current?.status === 'open' && member) return roomAction('kit', current.code, request.cityId)
      } catch {
        // Fall through to the normal create action so it can report the auth/network error.
      }
      return roomAction('create', undefined, request.cityId, true)
    }
    void reuseOpenLobby().then((ok) => {
      if (ok) {
        setOpen(false)
        setLobbyOpen(true)
      }
    }).finally(() => onCreateRequestHandled?.(request.id))
  }, [createRequest, busy, ensureGuest, roomAction, onCreateRequestHandled])

  /** Lobbies open straight away with the Random kit; the lobby itself changes kit or visibility. */
  const createLobby = async (isPublic: boolean) => {
    setShowDirectory(false)
    const success = await roomAction('create', undefined, DEFAULT_CITY_ID, isPublic)
    if (success) {
      setOpen(false)
      setLobbyOpen(true)
    }
    return success
  }
  // Create game with a friend: a private lobby, and the friend is called into it once the lobby is there
  const friendToInvite = useRef<OnlineFriend | null>(null)
  const handleCreateGameWithFriend = (friend: OnlineFriend) => {
    friendToInvite.current = friend
    void createLobby(false).then((ok) => { if (!ok) friendToInvite.current = null })
  }
  useEffect(() => {
    const friend = friendToInvite.current
    if (!friend || !room || room.status !== 'open' || room.host_id !== user?.id) return
    friendToInvite.current = null
    sendInvite(friend.profile.id, { kind: 'room', code: room.code })
      .then(() => setNotice(t('Convite enviado para {name}.', { name: friend.profile.display_name })))
      .catch((cause) => setNotice(t(cause instanceof Error ? cause.message : String(cause))))
  }, [room, user?.id])
  const actionError = error && <p role="alert" className="rounded-md border border-rose-400/25 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>
  const ownMember = room?.members.find((member) => member.user_id === user?.id)
  const mapLobbies = mapLobbyRooms(rooms, room, user?.id ?? null)
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
    try { await navigator.clipboard.writeText(inviteLink); setNotice(t('Invitation link copied.')) }
    catch { setNotice(t('Could not copy the invitation link in this browser.')) }
  }
  const insertBot = () => {
    if (!canInsertBot) {
      setError(t('A campaign bot can only be added to an empty room that you host.'))
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
      setError(t('A city kit is required to start the campaign with the bot.'))
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
    { id: 'rooms', label: t('Lobbies'), icon: Globe2 },
    { id: 'friends', label: t('Friends'), icon: Users },
    { id: 'profile', label: t('Profile'), icon: UserRound },
    { id: 'wardrobe', label: t('Vestiário'), icon: Shirt },
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
    } else {
      setShowDirectory(false)
    }
  }

  return <>
    {showLaunchers && launcherContainer && createPortal(
      <div className="flex gap-1.5 md:gap-3">
        {ownMember && room && (
          <Button variant="ghost" size="icon" aria-label={t('Lobby')} title={t('Lobby')} className={styles.headerButton} onClick={() => { setOpen(false); setLobbyOpen(true) }}>
            <DoorOpen aria-hidden="true" className="size-4" />
          </Button>
        )}
        <Button variant="ghost" size="icon" aria-label={t('Friends')} title={t('Friends')} className={styles.headerButton} onClick={() => launch('friends')}>
          <Users aria-hidden="true" className="size-4" />
        </Button>
      </div>, launcherContainer
    )}
    {showMapRooms && <aside aria-label={t('Games, public lobbies and Creative')} className={styles.mapRooms}>
      {onlineAvailable && <>
      {runningGames.games.length > 0 && <section aria-labelledby="running-games-heading" className={styles.mapRoomList}>
        <h2 id="running-games-heading" className={styles.mapRoomHeading}>{t('Games in progress')}</h2>
        {runningGames.games.map(game => {
          const city = getCityById(game.context_city_id)
          const isWaiting = game.turn !== game.color
          return <button key={game.id} type="button" aria-label={t('Return to game against {name}', { name: game.opponent.display_name })} className={cn(styles.mapButton, styles.mapRoom, styles.mapRunningGame, isWaiting && styles.mapRoomWaiting)} onClick={() => { setOpen(false); onMatch(game.id) }}>
            <span className="flex min-w-0 items-center justify-between gap-2">
              <span className="min-w-0 flex-1 py-1">
                <span className="block break-words text-xs">{game.opponent.display_name}</span>
                {city && <span className="mt-0.5 block text-[10px] text-white/50">{city.year} {city.name}</span>}
                <span className={cn('mt-0.5 block text-[10px]', game.turn === game.color ? 'text-primary' : 'text-white/50')}>
                  {game.turn === game.color ? t('Your turn') : t('Waiting for opponent')}
                </span>
              </span>
              <RunningGameMiniature game={game} />
            </span>
          </button>
        })}
      </section>}
      {runningGames.error && <div className="space-y-1 text-xs"><p role="alert" className="text-rose-200">{t('Não foi possível carregar suas partidas.')}</p><p className="break-words text-white/50">{runningGames.error}</p><button type="button" className={styles.mapButton} aria-busy={runningGames.retrying} disabled={runningGames.retrying} onClick={() => void runningGames.refresh()}>{runningGames.retrying ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-3.5" />}{runningGames.retrying ? t('Atualizando…') : t('Tentar novamente')}</button></div>}
      <section aria-labelledby="public-rooms-heading" className={styles.mapRoomList}>
        <h2 id="public-rooms-heading" className={styles.mapRoomHeading}>
          <button type="button" className={styles.mapRoomHeadingButton} onClick={() => launch('rooms')}>
              {t('Public lobbies')}
          </button>
        </h2>
        {mapLobbies.entries.length > 0 && <div className={styles.mapRoomList}>{mapLobbies.entries.slice(0, 5).map(entry => <button key={entry.code} type="button" aria-label={entry.code === mapLobbies.ownCode ? t('Abrir seu lobby') : t('Entrar na sala de {name}', { name: entry.creator_name })} className={cn(styles.mapButton, styles.mapRoom, styles.mapPublicRoom, entry.code === mapLobbies.ownCode && styles.mapOwnRoom)} disabled={entry.code !== mapLobbies.ownCode && (Boolean(busy) || entry.players >= 2)} onClick={() => { if (entry.code === mapLobbies.ownCode) { setOpen(false); setLobbyOpen(true) } else { setTab('rooms'); setOpen(true); setShowDirectory(false); void roomAction('join', entry.code) } }}>
          <span className="flex min-w-0 items-center justify-between gap-2"><span className="min-w-0 flex-1"><span className="block break-words">{entry.creator_name}</span><span className={entry.code === mapLobbies.ownCode ? 'block opacity-70' : 'block text-white/50'}>{t('1v1 casual')} · {entry.players}/2</span></span><LogIn aria-hidden="true" className="size-4 shrink-0" /></span>
        </button>)}</div>}
        {mapLobbies.entries.length > 5 && <button type="button" className={styles.mapButton} onClick={() => launch('rooms')}>{t('Ver todas')}</button>}
        {!mapLobbies.ownCode && <button
          type="button"
          className={cn(styles.mapButton, styles.mapCreateLobby)}
          disabled={Boolean(busy)}
          aria-busy={busy === 'create'}
          onClick={() => void createLobby(true)}
        >
          {busy === 'create' ? <Loader2 aria-hidden="true" className="size-3.5 animate-spin" /> : <Plus aria-hidden="true" className="size-3.5" />}{t('Create lobby')}
        </button>}
        {showMapRooms && !isOpen && !lobbyOpen && error && <p role="alert" className="text-xs text-rose-200">{error}</p>}
      </section>
      </>}
      <Link href="/creative" className={cn(styles.mapButton, styles.mapCreative)}><Music2 aria-hidden="true" className="size-3.5" />{t('Creative Mode')}</Link>
    </aside>}
    <Dialog modal={false} open={isOpen} onOpenChange={setOpen}>
      {isOpen && <DialogContent floating closeOnInteractOutside className={cn('max-w-xl border-primary/30 bg-[#101713] text-[#dfe8df]', styles.responsiveContent)} closeLabel={t('Close online panel')}>
        <DialogHeader className="sr-only">
          <DialogTitle>{tab === 'rooms' ? t('Lobbies') : tab === 'friends' ? t('Friends') : tab === 'wardrobe' ? t('Vestiário') : t('Your profile')}</DialogTitle>
          <DialogDescription>{tab === 'rooms' ? t('Play ChickenChess online with another player, powers, and each team’s kits.') : tab === 'friends' ? t('Add friends with their profile code or email and manage received requests.') : tab === 'wardrobe' ? t('Your chicken’s outfits.') : t('Your name, progress, and online account.')}</DialogDescription>
        </DialogHeader>
        <nav aria-label={t('Online area')} className="grid grid-cols-4 gap-1 border-b border-white/10 pb-3 pr-6 sm:flex sm:gap-2">
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
          : tab === 'wardrobe' ? <WardrobePane />
          : !configured ? <p className="rounded-md border border-white/15 p-4 text-sm leading-relaxed text-white/65">{t(ONLINE_CONFIGURATION_MESSAGE)}</p>
          : tab === 'friends' ? <FriendsPane onCreateGame={handleCreateGameWithFriend} />
          : <div className="space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button variant="outline" className="h-11 w-full border-2 border-primary bg-black/35 text-primary hover:border-primary hover:bg-black/80 hover:text-white dark:!border-primary dark:!bg-black/35 dark:hover:!border-primary dark:hover:!bg-black/80 dark:hover:!text-white" disabled={Boolean(busy)} onClick={() => void createLobby(true)}><Plus />{t('Create Public Lobby')}</Button>
                <Button variant="outline" className="h-11 w-full border-2 border-primary bg-black/35 text-primary hover:border-primary hover:bg-black/80 hover:text-white dark:!border-primary dark:!bg-black/35 dark:hover:!border-primary dark:hover:!bg-black/80 dark:hover:!text-white" disabled={Boolean(busy)} onClick={() => void createLobby(false)}><Plus />{t('Create Private Lobby')}</Button>
              </div>
              {room && <Button variant="ghost" className="h-11 w-full border border-white/20 bg-transparent text-white/65 hover:border-primary hover:!bg-transparent hover:text-primary dark:hover:!bg-transparent" onClick={() => { setOpen(false); setLobbyOpen(true) }}>{t('My lobby')}</Button>}
            </div>
            <div className="flex items-center justify-between text-xs text-white/45"><span>{connected ? t('Live public lobbies') : loading ? t('Loading lobbies…') : t('Reconnecting…')}</span><button type="button" aria-label={t('Refresh lobbies')} aria-busy={refreshingRooms} disabled={refreshingRooms} onClick={refreshRoomsManually}><RefreshCw className={cn('size-3.5', refreshingRooms && 'animate-spin')} /></button></div>
            <div className="space-y-2 ">{loading && !rooms.length ? <p role="status" className="py-6 text-center text-sm text-white/45">{t('Loading lobbies…')}</p> : rooms.length ? rooms.map((entry) => <div key={entry.code} className="flex items-center justify-between gap-3 rounded-md border border-white/15 bg-black/20 p-3"><div><p className="break-words text-sm">{entry.creator_name}</p><p className="text-xs text-white/45">{t('1v1 casual')} · {entry.players}/2 · <span className="font-mono">{shortRoomCode(entry.code)}</span></p></div><Button size="sm" disabled={Boolean(busy) || entry.players >= 2} onClick={() => void roomAction('join', entry.code)}>{t('Join')}<LogIn aria-hidden="true" className="size-4" /></Button></div>) : <p className="rounded-md border border-dashed border-white/15 py-6 text-center text-sm text-white/45">{t('No public lobbies are open. Create the first one.')}</p>}</div>
            {directoryError && <p role="alert" className="text-sm text-rose-200">{directoryError}</p>}
            {actionError}<form className="space-y-2 pt-4" onSubmit={(event) => { event.preventDefault(); void roomAction('join', code) }}><label htmlFor="online-room-code" className="sr-only">{t('Lobby ID')}</label><div className="flex flex-wrap gap-2"><input id="online-room-code" className={`${inputClass} flex-1 font-mono uppercase`} value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder={t('Lobby ID')} maxLength={32} required /><Button type="submit" variant="outline" className="border-white/20 bg-transparent" disabled={Boolean(busy) || !code.trim()}>{t('Join by ID')}</Button></div></form>
          </div>}
        {!configured && actionError}
        {busy === 'invite' && <p role="status" className="text-sm text-white/55">{t('Opening invitation…')}</p>}
      </DialogContent>}
    </Dialog>
    <Dialog modal={false} open={lobbyOpen && Boolean(room)} onOpenChange={setLobbyOpen}>
      {lobbyOpen && room && <DialogContent floating closeOnInteractOutside style={{ maxWidth: room.status === 'closed' ? 'calc(100% - 2rem)' : '52rem', width: room.status === 'closed' ? 'fit-content' : undefined }} className={cn('border-primary/30 bg-[#101713] text-[#dfe8df]', styles.responsiveContent, flash && styles.joinFlash, room.status === 'closed' && 'p-0')} closeLabel={t('Close lobby')}>
        <DialogHeader className={cn(room.status === 'closed' ? 'sr-only' : cn('flex-row items-center gap-2', ownMember ? 'pr-[4.25rem]' : 'pr-10'))}>
          <DialogTitle className="sr-only">{t('Lobby {code}', { code: shortRoomCode(room.code) })}</DialogTitle>
          {room.status !== 'closed' && <>
            <RoomVisibility value={room.is_public} code={room.code} disabled={Boolean(busy) || room.status !== 'open' || room.host_id !== user?.id} onChoose={(isPublic) => void roomAction('visibility', room.code, DEFAULT_CITY_ID, isPublic)} />
            <button type="button" className="absolute right-10 top-3 rounded p-1 text-white/45 hover:text-white focus-visible:outline-2" aria-label={t('Refresh lobby from server')} title={t('Load the latest lobby details')} onClick={() => void refreshRoom().catch((cause) => setError(onlineErrorMessage(cause)))}><RefreshCw className="size-4" /></button>
          </>}
          <DialogDescription className="sr-only">{t('Choose a kit, invite another player, and get ready to play.')}</DialogDescription>
        </DialogHeader>
        {room.status === 'closed' ? <div className="flex flex-col items-center gap-3 p-[30px] text-center">
          <p className="text-sm text-white/60">{t('This lobby has been closed.')}</p>
          <Button size="sm" variant="link" className="text-white/55" onClick={() => { roomGeneration.current += 1; applyRoom(null); setLobbyOpen(false); setTab('rooms'); setOpen(true) }}><ArrowLeft />{t('Back to lobbies')}</Button>
        </div> : <div className="space-y-4">
          <div className="space-y-3">
            {room.members.map((member) => <div key={member.user_id} className="space-y-3 border-b border-white/10 py-3 last:border-b-0">
              <KitPreview key={member.user_id} randomCities={randomCities} member={member} identity={<div className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><div className="flex min-w-0 flex-1 items-start gap-2">{member.user_id !== user?.id && ownMember && <AddFriendButton iconOnly targetCode={member.profile.code} />}<span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-xl leading-none">🐔</span><div className="min-w-0 flex-1"><p className="min-w-0 break-words text-sm font-medium">{member.profile.display_name}{member.user_id === user?.id ? ` ${t('(you)')}` : ''}</p><p className="text-[11px] text-white/45">{member.color === 'w' ? t('White') : t('Black')} · {member.profile.code}</p></div></div>{member.ready && <span className="inline-flex items-center gap-1 text-xs text-primary"><Check aria-hidden="true" className="size-3.5 text-[#39ff14]" />{t('Ready')}</span>}</div>} unlockedCities={member.user_id === user?.id ? unlockedCities : undefined} disabled={Boolean(busy) || room.status !== 'open'} onChooseKit={member.user_id === user?.id && room.status === 'open' ? (cityId) => void roomAction('kit', room.code, cityId) : undefined} play={playKitInstrument} stop={stopKitInstrument} cancelHover={cancelKitHover} confirmHover={confirmKitHover} />
            </div>)}
            {activeBot && <div className={cn('space-y-3 rounded-md border p-3', botReady ? 'border-primary/35 bg-primary/15' : 'border-white/15 bg-black/20')}>
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex min-w-0 flex-1 items-start gap-2"><Bot aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="min-w-0 break-words text-sm font-medium">{t('Campaign bot')}</p><p className="text-[11px] text-white/45">{t('Uses your kit in the campaign')}</p></div></div><div className="flex items-center gap-2"><button type="button" className="cursor-pointer text-xs text-white/55 underline decoration-white/25 underline-offset-2 hover:text-white disabled:cursor-default disabled:opacity-50" disabled={Boolean(busy)} onClick={removeBot}>{t('Remove')}</button><span role="status" aria-live="polite" className={cn('inline-flex items-center gap-1 text-xs', botReady ? 'text-primary' : 'text-white/40')}>{botReady && <Check aria-hidden="true" className="size-3.5 text-[#39ff14]" />}{botReady ? t('Ready') : t('Choosing a kit')}</span></div></div>
            </div>}
            <div className="space-y-2 rounded-md border border-dashed border-white/15 p-4 text-center">
              {!activeBot && room.members.length < 2 && <p className="text-sm text-white/40">{t('Waiting for another player')} · {room.members.length}/2</p>}
              <div className="flex flex-wrap items-start justify-center gap-2">
                <div className="flex flex-col items-center gap-1"><Button size="sm" variant="ghost" className="text-white hover:!bg-blue-950/80 hover:!text-white focus-visible:!bg-blue-950/80 focus-visible:!text-white" onClick={() => void copyInvite()}><Copy aria-hidden="true" />{t('Invite a friend')}</Button>{notice && <p role="status" className="text-xs text-primary">{notice}{notice === t('Invitation link copied.') && <span className="mt-1 block text-primary">{t('Send to your friend')}</span>}</p>}</div>
                <Button size="sm" variant="ghost" disabled={!canInsertBot} className="text-white hover:!bg-blue-950/80 hover:!text-white focus-visible:!bg-blue-950/80 focus-visible:!text-white" onClick={insertBot}><Bot aria-hidden="true" />{activeBot ? t('Bot inserted') : t('Insert Bot')}</Button>
              </div>
              {activeBot && ownMember?.city_id === DEFAULT_CITY_ID && <p className="text-xs text-white/40">{t('Random selects the same kit for you and the bot when the campaign starts.')}</p>}
            </div>
          </div>
          {actionError}
          {room.status === 'playing' && <p className="text-sm text-white/60">{t('This lobby is already in a game.')}</p>}
          {ownMember && room.status === 'playing' && room.match_id && <Button className="w-full" onClick={() => { setLobbyOpen(false); onMatch(room.match_id!) }}><LogIn />{t('Return to game')}</Button>}
          {ownMember ? room.status === 'open' && <div className="flex items-center justify-between gap-3"><Button size="sm" variant="ghost" disabled={Boolean(busy)} className="text-white/55 hover:text-white" onClick={() => void roomAction('leave')}><ExitRoomIcon />{t('Exit')}</Button><Button variant={ownMember.ready ? 'outline' : 'default'} className={cn('h-11 w-40 shrink-0 justify-center px-2', ownMember.ready && 'border-primary/45 bg-transparent text-primary/75 hover:bg-transparent hover:text-primary')} disabled={Boolean(busy) || (activeBot ? !botReady : room.members.length !== 2)} onClick={() => void readyAction()}>{busy === 'ready' || busy === 'cancel-ready' || busy === 'leave' ? <Loader2 className="animate-spin" /> : <Check />}{ownMember.ready ? t('Cancel ready') : t('I’m ready!')}</Button></div> : <div className="flex items-center justify-between gap-3">{room.status === 'open' && <Button className="h-11 flex-1" disabled={Boolean(busy) || room.members.length >= 2} onClick={() => void roomAction('join', room.code)}><DoorOpen />{t('Join lobby')}</Button>}<Button size="sm" variant="ghost" className="text-white/55" onClick={() => { roomGeneration.current += 1; applyRoom(null); setLobbyOpen(false); setTab('rooms'); setOpen(true) }}><ArrowLeft />{t('Back to lobbies')}</Button></div>}
        </div>}
      </DialogContent>}
    </Dialog>
  </>
}
