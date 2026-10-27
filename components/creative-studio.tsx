'use client'
import { stableHtml } from '@/lib/utils'
import { METER_IDS, meterLabel } from '@/lib/music/meter'
import { Knob } from './knob'
import { PiecePalette, type PalettePiece } from './creative/piece-palette'
import { InstrumentParameters, type InstrumentParamsTab } from './creative/instrument-parameters'
import { NoteParamsHostContext, type NoteParamsSelection } from './music-note-params'
import { MusicPerformanceControls } from './music-performance-controls'
import { InfoTip, HelpLabel } from './info-tip'
import { MusicBpmRamp, MusicHarmonyReadout, MusicPendingTransitions } from './music-transition-view'

import Link from 'next/link'
import { MusicReactionEditor, ReactionScopeSwitch, type ReactionScope } from './music-reaction-editor'
import type { ReactionContext } from '@/lib/music/reactions'
import { createRef, startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Chess, type Square } from 'chess.js'
import { toast } from 'sonner'
import { ArrowLeft, Database, Dice5, Download, Pause, Pencil, Play, Power, Save, Upload } from 'lucide-react'
import { ChessgroundBoard, PiecesSVG, type AnalysisArrow } from './chessground-board'
import { BoardResizeHandles } from './board-resize-handles'
import { BOARD_CARDS_RESIZE_RATIO, powerCardsResizeLimits, useBoardResize } from '@/hooks/use-board-resize'
import { useBoardPan } from '@/hooks/use-board-pan'
import { useCreativeAnalysis } from '@/hooks/use-creative-analysis'
import { connectRects, squareRect, type WidgetConnection } from '@/hooks/use-game-widget-layout'
import { arrowsForAnalysis } from '@/lib/analysis-arrows'
import { PowerCardHand, type PowerCardAction, type PowerCardKind } from './power-card-hand'
import { EggCounter } from './match/egg-counter'
import { GameWidgetConnections } from './game-presentation'
import { CreativeWidget, type CreativeWidgetSize } from './creative/creative-widget'
import { useCreativeMusic } from '@/hooks/use-creative-music'
import { identifyPitchCollection } from '@/lib/music/scales'
import { CREATIVE_STORAGE, ROOTS, SCALES, SCALE_LABELS, SOUNDS, createCreativeSession, createDusseldorfSession, creativeBoardPieces, creativeSnapshot, mapCreativeBoardPieces, moveCreativePiece, parseCreativeSession, placeCreativePiece, removeCreativePiece, resetCreativePositions, updateCreativeArrangement, type CreativeSession } from '@/lib/music/creative'
import { validateMusicSnapshot } from '@/lib/music/runtime'
import { DEFAULT_KIT_GROUPS, EDITABLE_CITY_KITS, KIT_LIBRARY_STORAGE, cityKitStorageKey, defaultCityKit, loadCityKit, prepareCityKitForCreative, prepareOfficialCityKit, resetLegacyMusicStorage, updateKitLibrary } from '@/lib/music/city-kits'
import { cities, getCityById } from '@/lib/cities-data'
import { STYLE_REVISION } from '@/lib/music/styled-kits'
import { HARMONY_PLANS, type HarmonyPlanId } from '@/lib/music/harmony'
import { createRandomCityKit } from '@/lib/music/random-kit'
import { listRemoteKits, loadRemoteKit, remoteKitError, saveRemoteKit, watchCreativeAccount, type CreativeAccount, type RemoteKitEntry } from '@/lib/online/creative-kits'
import { saveOfficialCityKit } from '@/lib/admin/official-kit-client'
import { SampleSourceControls } from './music-lab-controls'
import { MusicTransportReadout, MusicVoiceReadout, MusicVoiceBadge } from './music-playback'
import { MusicSongPanel, type SongPanelHover } from './music-song-panel'
import { VersionChangelog } from './version-changelog'
import styles from './creative-studio.module.css'
import { duckSourceOptions } from '@/lib/music/sound-design'
import LEGACY_KITS from '@/data/music/legacy-kits.json'

const pieceNames = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' }
const MOUTH_BREATHER_KIT = 'builtin:mouth-breather'
const DUSSELDORF_ORIGINAL_KIT = 'builtin:dusseldorf-original'
const DEFAULT_KIT_PREFIX = 'default:'
// Electronic World kits as they were before the 26/10 revision, for history; no city link.
const LEGACY_KIT_PREFIX = 'legacy:'
const USER_KIT_PREFIX = 'user:'
type Instrument = CreativeSession['instruments'][string]
type Effects = CreativeSession['effects'][string]
type Mapping = CreativeSession['mappings'][string]

function messageOf(error: unknown) {
  if (error && typeof error === 'object' && 'issues' in error && Array.isArray(error.issues)) {
    return error.issues.slice(0, 2).map((issue: { message: string; path: string[] }) => `${issue.path.join('.')}: ${issue.message}`).join(' ')
  }
  return error instanceof Error ? error.message : 'Could not load the configuration.'
}


// Creative messages share the match's toast and stay until dismissed; one id keeps a single popup.
function setNotice(message: string) {
  toast(message, { id: 'creative-notice', duration: Infinity, closeButton: true })
}

// What "unsaved changes" compares: which pieces are switched on is a listening choice, not a kit edit.
function kitFingerprint(kit: CreativeSession) {
  return JSON.stringify({ ...kit, pieces: kit.pieces.map(({ active: _active, ...piece }) => piece), extras: kit.extras?.map(({ active: _active, ...piece }) => piece) })
}

type CreativeWidgetId = 'kit' | 'transport' | 'reactions' | 'code' | 'instrument' | 'source' | 'band'
// Left column works on the kit and the session; right column on the selected piece.
// `piece` widgets draw their line to the selected piece, the others to the board.
const CREATIVE_WIDGETS: { id: CreativeWidgetId; title: string; side: 'left' | 'right'; width: number; on: boolean; link: 'board' | 'piece'; autoHeight?: number }[] = [
  { id: 'kit', title: 'Creative kit', side: 'left', width: 380, on: true, link: 'board', autoHeight: 280 },
  { id: 'transport', title: 'Transport', side: 'left', width: 420, on: true, link: 'board' },
  { id: 'reactions', title: 'States & Events', side: 'left', width: 420, on: false, link: 'board' },
  { id: 'code', title: 'Strudel code', side: 'left', width: 420, on: false, link: 'board' },
  { id: 'instrument', title: 'Instrument', side: 'right', width: 380, on: true, link: 'piece' },
  { id: 'source', title: 'Sample source', side: 'right', width: 380, on: false, link: 'piece' },
  { id: 'band', title: '32 voices', side: 'right', width: 380, on: false, link: 'board' },
]
const WIDGET_TOP = 76
const WIDGET_GAP = 10
const WIDGET_HEADER = 34
const CREATIVE_BOARD_WIDTH = 'min(90vw, calc(100dvh - 390px), 512px)'
type WidgetLayout = { positions: Record<CreativeWidgetId, { x: number; y: number }>; sizes: Record<CreativeWidgetId, CreativeWidgetSize> }

/** Columns at both sides of the centered board; open widgets share the height left by the others. */
function initialWidgetLayout(width: number, height: number): WidgetLayout {
  const positions = {} as WidgetLayout['positions'], sizes = {} as WidgetLayout['sizes']
  for (const side of ['left', 'right'] as const) {
    const column = CREATIVE_WIDGETS.filter(widget => widget.side === side)
    const flexible = column.filter(widget => widget.on && !widget.autoHeight)
    const fixed = column.reduce((total, widget) => total + WIDGET_HEADER + WIDGET_GAP + (widget.on ? widget.autoHeight ?? 0 : 0), 0)
    const share = Math.max(140, Math.floor((height - WIDGET_TOP - 16 - fixed) / Math.max(1, flexible.length)))
    let y = WIDGET_TOP
    for (const widget of column) {
      const widgetWidth = Math.min(widget.width, Math.max(260, width - 32))
      positions[widget.id] = { x: side === 'left' ? 16 : Math.max(16, width - widgetWidth - 16), y }
      sizes[widget.id] = { width: widgetWidth, height: widget.on && !widget.autoHeight ? share : undefined }
      y += WIDGET_HEADER + WIDGET_GAP + (widget.on ? widget.autoHeight ?? share : 0)
    }
  }
  return { positions, sizes }
}

const PALETTE_ORDER = ['p', 'r', 'n', 'b', 'q', 'k']
const RULED = { borderColor: '#c9a85a', color: '#f0d48e', boxShadow: 'inset 0 0 0 1px #c9a85a55' } as const
const RULED_TEXT = { color: '#f0d48e' } as const
export function CreativeStudio() {
  const rootRef = useRef<HTMLElement | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const powerCardsRef = useRef<HTMLDivElement | null>(null)
  const [portraitPhone, setPortraitPhone] = useState(false)
  const boardResize = useBoardResize({ boardRef, enabled: true, reservedHeight: () => (powerCardsRef.current?.offsetWidth ?? 0) * BOARD_CARDS_RESIZE_RATIO })
  const cardsResize = useBoardResize({ boardRef: powerCardsRef, enabled: true, customLimits: powerCardsResizeLimits })
  const boardPan = useBoardPan({ boardRef, enabled: !portraitPhone })
  const cardsPan = useBoardPan({ boardRef: powerCardsRef, enabled: !portraitPhone })
  const [widgetOn, setWidgetOn] = useState(() => Object.fromEntries(CREATIVE_WIDGETS.map(widget => [widget.id, widget.on])) as Record<CreativeWidgetId, boolean>)
  const [widgetLayout, setWidgetLayout] = useState<WidgetLayout>(() => initialWidgetLayout(1440, 900))
  const [widgetOrder, setWidgetOrder] = useState<CreativeWidgetId[]>(() => CREATIVE_WIDGETS.map(widget => widget.id))
  const [widgetRefs] = useState(() => Object.fromEntries(CREATIVE_WIDGETS.map(widget => [widget.id, createRef<HTMLDivElement>()])) as Record<CreativeWidgetId, RefObject<HTMLDivElement | null>>)
  const [connections, setConnections] = useState<WidgetConnection[]>([])
  const [hoverConnections, setHoverConnections] = useState<WidgetConnection[]>([])
  const [layoutTick, setLayoutTick] = useState(0)
  const analysis = useCreativeAnalysis()
  const [analysisArrows, setAnalysisArrows] = useState<AnalysisArrow[]>([])
  const arrowTimerRef = useRef<number | null>(null)
  // Piece positions before each move, for the Mulligan card.
  const positionHistoryRef = useRef<Pick<CreativeSession, 'pieces' | 'extras'>[]>([])
  const [historyLength, setHistoryLength] = useState(0)
  const [undoAnimationKey, setUndoAnimationKey] = useState(0)
  const [reactionScope, setReactionScope] = useState<ReactionScope>('kit')
  const [songHover, setSongHover] = useState<SongPanelHover | null>(null)
  const [session, setSession] = useState(createCreativeSession)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [selectedId, setSelectedId] = useState('w:b1')
  const [soloIds, setSoloIds] = useState<Set<string>>(() => new Set())
  const soloMemoryRef = useRef<string[] | null>(null)
  // A note picked in the Instrument's MIDI editor opens the Note tab; deselecting it goes back.
  const [paramsTab, setParamsTab] = useState<InstrumentParamsTab>('tuning')
  const [noteSelection, setNoteSelection] = useState<NoteParamsSelection | null>(null)
  const pieceParamsTabRef = useRef<InstrumentParamsTab>('tuning')
  const hadNoteRef = useRef(false)
  useEffect(() => {
    const hasNote = !!noteSelection
    if (hasNote === hadNoteRef.current) return
    hadNoteRef.current = hasNote
    if (hasNote) setParamsTab(tab => { if (tab !== 'note') pieceParamsTabRef.current = tab; return 'note' })
    else setParamsTab(tab => tab === 'note' ? pieceParamsTabRef.current : tab)
  }, [noteSelection])
  const soloCycleIdsRef = useRef<Set<string>>(new Set())
  const [boardSelected, setBoardSelected] = useState(true)
  const [account, setAccount] = useState<CreativeAccount | null>(null)
  const [remoteKits, setRemoteKits] = useState<RemoteKitEntry[]>([])
  // Bumped on every kit load: the runtime restarts its clock only for a new kit, never for a rename.
  const [kitIdentity, setKitIdentity] = useState(0)
  const savedFingerprint = useRef<string | null>(null)
  const [kits, setKits] = useState<CreativeSession[]>([])
  const [selectedKit, setSelectedKit] = useState('')
  const [simulation, setSimulation] = useState<ReactionContext>({ ply:0, states:[{ trigger:'opening',color:'w',ply:0 }], events:[] })
  const showCode = widgetOn.code
  const [editingInstrumentName, setEditingInstrumentName] = useState(false)
  const music = useCreativeMusic(session, playing, soloIds, simulation, showCode, `kit-${kitIdentity}`)
  // Controls show what is sounding now; a change still edits the kit's base value.
  const liveCollection = identifyPitchCollection(music.snapshot.scale, session.scale)
  const live = { root: liveCollection.root as CreativeSession['root'], scale: liveCollection.scale ?? session.scale, harmony: music.snapshot.harmony ?? session.harmony }
  const ruled = { bpm: Math.abs(music.snapshot.bpm - session.bpm) > .05, root: live.root !== session.root, scale: live.scale !== session.scale, harmony: live.harmony !== session.harmony }
  const boardPieces = useMemo(() => creativeBoardPieces(session), [session])
  // A piece taken off the board stays selectable through its instrument (kit pieces keep their data).
  const selected = boardPieces.find(p => p.id === selectedId) ?? { ...session.pieces.find(p => p.id === selectedId) ?? session.pieces[0], instrumentId: session.pieces.find(p => p.id === selectedId)?.id ?? session.pieces[0].id }
  const selectedOnBoard = boardPieces.some(p => p.id === selected.id)
  const instrumentId = selected.instrumentId
  const boardGame = useMemo(() => {
    const board = new Chess()
    board.clear()
    for (const piece of boardPieces) board.put({ type: piece.type, color: piece.color }, piece.square as Square)
    return board
  }, [boardPieces])
  const boardColor = getCityById(session.cityId ?? '')?.color ?? '#00ffaa'
  const boardActiveSquares = useMemo(() => new Set(boardPieces.filter(piece => piece.active).map(piece => piece.square)), [boardPieces])
  const selectedInstrument = session.instruments[instrumentId]
  const instrument = soloIds.has(selectedId) && selectedInstrument.loopEnabled === false
    ? { ...selectedInstrument, loopEnabled: true }
    : selectedInstrument
  const effects = session.effects[instrumentId]
  const mapping = session.mappings[instrumentId]
  const activeCount = boardPieces.filter(p => p.active).length
  const activeIds = useMemo(() => new Set(boardPieces.filter(piece => piece.active).map(piece => piece.id)), [boardPieces])
  const cityName = (cityId?: string) => EDITABLE_CITY_KITS.find(city => city.id === cityId)?.name
  const kitLabel = (kit: CreativeSession) => `${kit.name}${cityName(kit.cityId) ? ` (${cityName(kit.cityId)})` : ''}`
  const admin = account?.admin === true
  // Account kits come first; browser-only kits with another name stay listed beside them.
  const libraryNames = [...new Set([...remoteKits.map(kit => kit.name), ...kits.map(kit => kit.name)])]

  useEffect(() => {
    let cancelled = false
    async function restore() {
      resetLegacyMusicStorage()
      let restored: CreativeSession | undefined
      let baseline: CreativeSession | undefined
      try {
        const query = new window.URLSearchParams(window.location.search)
        const requestedCity = query.get('city')
        const requestedPreset = query.get('preset')
        const requestedKit = requestedCity ? (query.get('official') === '1' ? defaultCityKit(requestedCity) : loadCityKit(requestedCity)) : null
        let saved = requestedKit ? JSON.stringify(prepareCityKitForCreative(requestedKit, requestedCity!)) : localStorage.getItem(CREATIVE_STORAGE)
        if (requestedPreset && ['manchester-1999', 'dusseldorf-original', 'mouth-breather'].includes(requestedPreset)) {
          const response = await window.fetch(`/presets/${requestedPreset}.json`)
          if (!response.ok) throw new Error('Official preset unavailable.')
          saved = await response.text()
        }
        if (saved) {
          const parsed = parseCreativeSession(saved)
          await validateMusicSnapshot(creativeSnapshot(parsed, false))
          if (!cancelled) {
            restored = parsed
            setSession(parsed)
          }
        }
      } catch (error) {
        if (!cancelled) setNotice(`Could not restore the draft: ${messageOf(error)}`)
      }
      try {
        const activeCustom = new Map<string, CreativeSession>()
        for (const city of EDITABLE_CITY_KITS) {
          const active = loadCityKit(city.id), standard = defaultCityKit(city.id)
          if (active && standard && JSON.stringify(active) !== JSON.stringify(standard)) activeCustom.set(city.id, active)
        }
        const savedKits: unknown = JSON.parse(localStorage.getItem(KIT_LIBRARY_STORAGE) ?? '[]')
        if (Array.isArray(savedKits) && !cancelled) {
          const parsed = savedKits.slice(0, 30).flatMap(kit => {
            try { return [parseCreativeSession(JSON.stringify(kit))] } catch { return [] }
          })
          const byName = new Map(parsed.map(kit => [kit.name, kit]))
          for (const kit of activeCustom.values()) byName.set(kit.name, kit)
          const candidates = [...byName.values()].map(kit => kit.cityId && activeCustom.get(kit.cityId)?.name !== kit.name ? { ...kit, cityId: undefined } : kit)
          const savedNames = new Set(parsed.map(kit => kit.name))
          const normalized = candidates.filter(kit => savedNames.has(kit.name))
          for (const kit of candidates) if (!savedNames.has(kit.name) && normalized.length < 30) normalized.push(kit)
          setKits(normalized)
          localStorage.setItem(KIT_LIBRARY_STORAGE, JSON.stringify(normalized))
          if (restored) {
            const user = normalized.find(kit => kit.name === restored!.name)
            baseline = user
            const standard = restored.cityId && defaultCityKit(restored.cityId)?.name === restored.name
            setSelectedKit(user ? `${USER_KIT_PREFIX}${user.name}` : standard ? `${DEFAULT_KIT_PREFIX}${restored.cityId}` : restored.name === 'Mouth Breather · estudo eefano' ? MOUTH_BREATHER_KIT : restored.name === 'Düsseldorf · Electro 01' ? DUSSELDORF_ORIGINAL_KIT : LEGACY_KITS.some(kit => kit.name === restored!.name) ? `${LEGACY_KIT_PREFIX}${LEGACY_KITS.find(kit => kit.name === restored!.name)!.id}` : '')
          }
        }
      } catch (error) {
        if (!cancelled) setNotice(`Could not load the kit library: ${messageOf(error)}`)
      } finally {
        if (!cancelled) {
          savedFingerprint.current = baseline ?? restored ? kitFingerprint((baseline ?? restored)!) : null
          setReady(true)
        }
      }
    }
    void restore()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready) return
    const timer = setTimeout(() => {
      try { localStorage.setItem(CREATIVE_STORAGE, JSON.stringify(session)) }
      catch { setNotice('Local storage unavailable. Export the kit to keep your changes.') }
    }, 300)
    return () => clearTimeout(timer)
  }, [session, ready])

  useEffect(() => setEditingInstrumentName(false), [selectedId])
  useEffect(() => watchCreativeAccount(setAccount), [])
  useEffect(() => {
    if (!account) { setRemoteKits([]); return }
    let current = true
    listRemoteKits().then(list => { if (current) setRemoteKits(list) }, error => { if (current) setNotice(`Could not list your account’s kits: ${remoteKitError(error)}`) })
    return () => { current = false }
  }, [account])
  useEffect(() => { if (music.error) setNotice(`Audio: ${music.error}`) }, [music.error])
  useEffect(() => () => { toast.dismiss('creative-notice') }, [])

  const updateInstrument = useCallback((update: Partial<Instrument>) => {
    setSession(s => ({ ...s, instruments: { ...s.instruments, [instrumentId]: { ...s.instruments[instrumentId], ...update } } }))
  }, [instrumentId])
  function updateEffects(update: Partial<Effects>) {
    setSession(s => ({ ...s, effects: { ...s.effects, [instrumentId]: { ...s.effects[instrumentId], ...update } } }))
  }
  function updateMapping(update: Partial<Mapping>) {
    setSession(s => ({ ...s, mappings: { ...s.mappings, [instrumentId]: { ...s.mappings[instrumentId], ...update } } }))
  }
  function setBoardActive(active: (piece: { id: string; color: string; active: boolean }) => boolean) {
    setSession(s => mapCreativeBoardPieces(s, p => ({ active: active(p) })))
  }
  function toggleActive(id: string) {
    const piece = boardPieces.find(p => p.id === id)
    if (!piece) return
    if (!piece.active) setPlaying(true)
    else if (activeCount === 1) setPlaying(false)
    setBoardActive(p => p.id === id ? !p.active : p.active)
  }
  function toggleSolo(id: string) {
    music.endAudition()
    if (soloIds.has(id)) {
      const nextSoloIds = new Set(soloIds)
      nextSoloIds.delete(id)
      setSoloIds(nextSoloIds)
      if (nextSoloIds.size) {
        setBoardActive(p => nextSoloIds.has(p.id))
      } else {
        const restore = new Set([...(soloMemoryRef.current ?? []), ...soloCycleIdsRef.current, ...boardPieces.filter(p => p.active).map(p => p.id)])
        setBoardActive(p => restore.has(p.id))
        soloMemoryRef.current = null
        soloCycleIdsRef.current = new Set()
      }
      return
    }
    if (!soloIds.size) {
      soloMemoryRef.current = boardPieces
        .filter(p => p.active && session.instruments[p.instrumentId]?.loopEnabled !== false)
        .map(p => p.id)
      soloCycleIdsRef.current = new Set()
    }
    const nextSoloIds = new Set([...soloIds, id])
    soloCycleIdsRef.current.add(id)
    setSoloIds(nextSoloIds)
    setPlaying(true)
    setBoardActive(p => nextSoloIds.has(p.id))
  }
  function stop() { setPlaying(false); music.endAudition() }
  function select(id: string) { music.endAudition(); setSelectedId(id); setBoardSelected(true) }
  function confirmDiscard() {
    const base = createCreativeSession()
    const fingerprint = kitFingerprint(session)
    const unsaved = savedFingerprint.current === null ? fingerprint !== kitFingerprint({ ...base, name: session.name }) : fingerprint !== savedFingerprint.current
    return !unsaved || window.confirm('The current kit has unsaved changes. Change it anyway?')
  }

  async function loadSession(next: CreativeSession, autoplay = false) {
    setBusy(true)
    try {
      await validateMusicSnapshot(creativeSnapshot(next, false))
      music.endAudition(); setSoloIds(new Set()); soloMemoryRef.current = null; soloCycleIdsRef.current = new Set(); setSimulation({ply:0,states:[{trigger:'opening',color:'w',ply:0}],events:[]}); setSession(next); setPlaying(autoplay)
      setKitIdentity(identity => identity + 1)
      positionHistoryRef.current = []; setHistoryLength(0)
      savedFingerprint.current = kitFingerprint(next)
      setNotice(`Kit “${next.name}” loaded${autoplay ? ' and playing' : ' and paused'}.`)
    } catch (error) { setNotice(`Kit not loaded: ${messageOf(error)}`) }
    finally { setBusy(false) }
  }
  async function loadSelectedKit() {
    if (!selectedKit || !confirmDiscard()) return
    if (selectedKit.startsWith(USER_KIT_PREFIX)) {
      const name = selectedKit.slice(USER_KIT_PREFIX.length)
      if (account && remoteKits.some(kit => kit.name === name)) {
        try { await loadSession(parseCreativeSession(JSON.stringify(await loadRemoteKit(name))), true) }
        catch (error) { setNotice(`Kit not loaded: ${remoteKitError(error)}`) }
        return
      }
      const kit = kits.find(item => item.name === name)
      if (kit) await loadSession(kit, true)
      return
    }
    if (selectedKit.startsWith(DEFAULT_KIT_PREFIX)) {
      const cityId = selectedKit.slice(DEFAULT_KIT_PREFIX.length), kit = defaultCityKit(cityId)
      if (kit) await loadSession(kit, true)
      return
    }
    if (selectedKit.startsWith(LEGACY_KIT_PREFIX)) {
      try {
        const response = await window.fetch(`/presets/legacy/${selectedKit.slice(LEGACY_KIT_PREFIX.length)}.json`)
        if (!response.ok) throw new Error('Legacy kit unavailable')
        await loadSession(parseCreativeSession(await response.text()), true)
      } catch (error) { setNotice(messageOf(error)) }
      return
    }
    if (selectedKit === DUSSELDORF_ORIGINAL_KIT) {
      await loadSession({ ...createDusseldorfSession(), cityId: undefined }, true)
      return
    }
    if (selectedKit === MOUTH_BREATHER_KIT) {
      try {
        const response = await window.fetch('/presets/mouth-breather.json')
        if (!response.ok) throw new Error('Preset unavailable')
        await loadSession(parseCreativeSession(await response.text()), true)
      } catch (error) { setNotice(messageOf(error)) }
    }
  }
  async function saveKit() {
    if (!session.name.trim()) { setNotice('Name the kit before saving.'); return }
    const revision = session.cityId ? defaultCityKit(session.cityId)?.catalogRevision ?? STYLE_REVISION : STYLE_REVISION
    const clean = parseCreativeSession(JSON.stringify({...session, catalogRevision: revision}))
    // Only admins link kits to a stage; everyone else's kits stay in their library.
    const linked = admin && clean.cityId ? clean : { ...clean, cityId: undefined }
    let replacedLink = false
    if (linked.cityId) {
      const customConflict = kits.find(kit => kit.cityId === linked.cityId && kit.name !== linked.name)
      const standard = defaultCityKit(linked.cityId)
      const standardConflict = !kits.some(kit => kit.cityId === linked.cityId) && standard?.name !== linked.name ? standard : undefined
      const conflict = customConflict ?? standardConflict
      const city = cityName(linked.cityId)
      if (conflict && !window.confirm(`${city ?? 'This city'} already has the kit “${conflict.name}” linked. Link “${linked.name}” to the city instead? The previous link will be removed.`)) return
      replacedLink = Boolean(conflict)
    }
    let remoteError = ''
    if (account) {
      setBusy(true)
      try {
        const saved = await saveRemoteKit(linked)
        setRemoteKits(list => [...list.filter(kit => kit.name !== saved.name), saved])
      } catch (error) { remoteError = remoteKitError(error) }
      finally { setBusy(false) }
    }
    const updated = updateKitLibrary(kits, linked)
    try {
      for (const cityId of updated.releasedCityIds) {
        const current = localStorage.getItem(cityKitStorageKey(cityId))
        if (current) {
          try { if (parseCreativeSession(current).name === linked.name) localStorage.removeItem(cityKitStorageKey(cityId)) } catch { /* corrupt slots already fall back to the default */ }
        }
      }
      localStorage.setItem(KIT_LIBRARY_STORAGE, JSON.stringify(updated.kits))
      if (linked.cityId) localStorage.setItem(cityKitStorageKey(linked.cityId), JSON.stringify(linked))
    } catch { if (!account || remoteError) { setNotice('Could not save locally. Use Export.'); return } }
    setKits(updated.kits); setSession(clean); setSelectedKit(`${USER_KIT_PREFIX}${clean.name}`)
    savedFingerprint.current = kitFingerprint(clean)
    const city = EDITABLE_CITY_KITS.find(item => item.id === linked.cityId)
    if (remoteError) { setNotice(`Kit “${clean.name}” saved only in this browser: ${remoteError}`); return }
    const where = account ? 'saved to your account' : 'saved in this browser'
    setNotice(city
      ? `Kit “${clean.name}” ${where} and linked to the ${city.name} stage.${replacedLink ? ' The city’s previous link was removed.' : ''}`
      : `Kit “${clean.name}” ${where}. Saving with the same name updates it.`)
  }
  async function saveToGame() {
    const cityId = session.cityId
    if (!cityId) { setNotice('Pick a Linked stage before using Save DB.'); return }
    if (!session.name.trim()) { setNotice('Name the kit before saving.'); return }
    setBusy(true)
    try {
      const saved = await saveOfficialCityKit(cityId, session)
      // The admin's own matches use the new official kit right away, before the deploy.
      localStorage.setItem(cityKitStorageKey(cityId), JSON.stringify(prepareOfficialCityKit(session, cityId, saved.revision)))
      setNotice(`Kit “${session.name}” saved as the official ${cityName(cityId) ?? cityId} kit in ${saved.path}. Deploy to publish it.`)
    } catch (error) { setNotice(`Save DB failed: ${messageOf(error)}`) }
    finally { setBusy(false) }
  }
  function newRandomKit() {
    if (!confirmDiscard()) return
    // A linked stage keeps its style; otherwise each click also draws the style.
    const city = (session.cityId ? getCityById(session.cityId) : undefined) ?? cities[Math.floor(Math.random() * cities.length)]
    setSelectedKit('')
    void loadSession(createRandomCityKit(city, Math.random().toString(36).slice(2, 8)), true)
  }
  function exportKit() {
    if (!session.name.trim()) { setNotice('Name the kit before exporting.'); return }
    const url = window.URL.createObjectURL(new window.Blob([JSON.stringify(session, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = `${session.name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 60) || 'kit'}.chickenchess.json`
    link.click()
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    setNotice('Kit exported with instruments, patterns, positions and settings.')
  }

  function rememberPositions() {
    positionHistoryRef.current = [...positionHistoryRef.current.slice(-49), { pieces: session.pieces, extras: session.extras }]
    setHistoryLength(positionHistoryRef.current.length)
  }
  function undoPositions() {
    const previous = positionHistoryRef.current.pop()
    setHistoryLength(positionHistoryRef.current.length)
    if (!previous) return
    music.endAudition()
    setUndoAnimationKey(key => key + 1)
    // Positions, removals and extras come back; loops keep their current on/off state where they still exist.
    setSession(s => {
      const active = new Map(creativeBoardPieces(s).map(piece => [piece.id, piece.active]))
      return {
        ...s,
        pieces: previous.pieces.map(piece => ({ ...piece, active: active.get(piece.id) ?? piece.active })),
        extras: previous.extras?.map(piece => ({ ...piece, active: active.get(piece.id) ?? piece.active })),
      }
    })
  }

  // Best/Worst read the board from the selected piece's side. In Creative they stay silent and
  // only draw the arrows: no whistle, no eggs on the squares.
  const analysisGame = useMemo(() => {
    const fen = boardGame.fen().split(' ')
    fen[1] = selected.color; fen[2] = '-'; fen[3] = '-'
    return new Chess(fen.join(' '), { skipValidation: true })
  }, [boardGame, selected.color])
  const analysisFenRef = useRef(analysisGame.fen())
  analysisFenRef.current = analysisGame.fen()
  const clearArrows = useCallback(() => {
    if (arrowTimerRef.current !== null) window.clearTimeout(arrowTimerRef.current)
    arrowTimerRef.current = null
    setAnalysisArrows([])
  }, [])
  useEffect(() => clearArrows, [analysisGame, clearArrows])
  function showRankedMoves(kind: 'best' | 'worst') {
    analysis.analyze(analysisGame, (result, error) => {
      if (!result) { setNotice(`${kind === 'best' ? 'Best' : 'Worst'} moves unavailable: ${error ?? 'this position could not be analyzed.'}`); return }
      if (result.fen !== analysisFenRef.current) return
      const arrows = arrowsForAnalysis(result, kind)
      if (!arrows.length) { setNotice(`No ${kind} moves for ${selected.color === 'w' ? 'White' : 'Black'} in this position.`); return }
      if (arrowTimerRef.current !== null) window.clearTimeout(arrowTimerRef.current)
      setAnalysisArrows(arrows)
      arrowTimerRef.current = window.setTimeout(() => { arrowTimerRef.current = null; setAnalysisArrows([]) }, 3000)
    })
  }

  function toggleWidget(id: CreativeWidgetId) {
    const opening = !widgetOn[id]
    setWidgetOn(current => ({ ...current, [id]: opening }))
    bringToFront(id)
    // A widget opened near the bottom moves up so its body has room to unfold.
    if (opening && !portraitPhone) setWidgetLayout(layout => {
      const position = layout.positions[id], height = layout.sizes[id].height ?? 320
      const top = Math.max(WIDGET_TOP, Math.min(position.y, window.innerHeight - height - WIDGET_HEADER - 16))
      return top === position.y ? layout : { ...layout, positions: { ...layout.positions, [id]: { ...position, y: top } } }
    })
  }
  function bringToFront(id: CreativeWidgetId) {
    setWidgetOrder(order => order[order.length - 1] === id ? order : [...order.filter(item => item !== id), id])
  }

  // First layout uses the real viewport; later viewport changes only keep every title bar reachable.
  useLayoutEffect(() => {
    setWidgetLayout(initialWidgetLayout(window.innerWidth, window.innerHeight))
    const media = window.matchMedia('(max-width: 528px) and (orientation: portrait)')
    const update = () => setPortraitPhone(media.matches)
    update()
    const resize = () => {
      setWidgetLayout(layout => {
        const positions = { ...layout.positions }
        for (const widget of CREATIVE_WIDGETS) {
          const position = positions[widget.id]
          positions[widget.id] = { x: Math.max(-200, Math.min(position.x, window.innerWidth - 80)), y: Math.max(0, Math.min(position.y, window.innerHeight - WIDGET_HEADER)) }
        }
        return { ...layout, positions }
      })
    }
    media.addEventListener('change', update)
    window.addEventListener('resize', resize)
    return () => { media.removeEventListener('change', update); window.removeEventListener('resize', resize) }
  }, [])

  useEffect(() => {
    if (portraitPhone) return
    const observer = new window.ResizeObserver(() => setLayoutTick(tick => tick + 1))
    if (boardRef.current) observer.observe(boardRef.current)
    for (const widget of CREATIVE_WIDGETS) if (widgetRefs[widget.id].current) observer.observe(widgetRefs[widget.id].current!)
    return () => observer.disconnect()
  }, [portraitPhone, widgetOn, widgetRefs])

  // Lines from each open widget to the board, or to the selected piece for the instrument widgets.
  const selectedSquareForLines = boardSelected ? selected.square : null
  useLayoutEffect(() => {
    const root = rootRef.current, board = boardRef.current
    if (portraitPhone || !root || !board) { setConnections(current => current.length ? [] : current); return }
    const rootRect = root.getBoundingClientRect(), boardRect = board.getBoundingClientRect()
    const pieceRect = selectedSquareForLines ? squareRect(selectedSquareForLines as Square, boardRect, 'white') : null
    const next: WidgetConnection[] = []
    for (const widget of CREATIVE_WIDGETS) {
      const element = widgetRefs[widget.id].current
      if (!widgetOn[widget.id] || !element) continue
      next.push(connectRects(element.getBoundingClientRect(), widget.link === 'piece' && pieceRect ? pieceRect : boardRect, rootRect))
    }
    setConnections(next)
    // Hovering a row of 32 voices links its on/off dot to the piece, as in the match.
    const hoverRect = songHover?.anchor.isConnected && widgetOn.band ? squareRect(songHover.square, boardRect, 'white') : null
    setHoverConnections(hoverRect && songHover ? [connectRects(songHover.anchor.getBoundingClientRect(), hoverRect, rootRect)] : [])
  }, [portraitPhone, widgetOn, widgetLayout, widgetRefs, boardPan.offset, boardResize.width, cardsResize.width, selectedSquareForLines, layoutTick, songHover])

  const kitWidget = <fieldset disabled={!ready || busy} className={styles.kitHeader} aria-label="Current kit and library">
    <div className={styles.kitPick}>
      <label><span className={styles.helpCaption}>Kit<InfoTip label="Load and try kits">My kits lists the kits saved {account ? 'in your account and in this browser' : 'in this browser'} and the standalone studies. The cities’ default kits are below, grouped by campaign and named by year, city and style, followed by Legacy kits: earlier versions of the Electronic World and Brazilian kits, kept for history and not linked to any city. Load asks first when the current kit has unsaved changes.</InfoTip></span><select aria-label="Current Creative kit" value={selectedKit} onChange={e => setSelectedKit(e.target.value)}>
        <option value="">Current draft</option>
        <optgroup label="My kits">
          {libraryNames.map(name => { const kit = kits.find(item => item.name === name); return <option key={name} value={`${USER_KIT_PREFIX}${name}`}>{kit ? kitLabel(kit) : name}</option> })}
          <option value={MOUTH_BREATHER_KIT}>Mouth Breather · eefano study</option>
          <option value={DUSSELDORF_ORIGINAL_KIT}>Düsseldorf · Electro 01</option>
        </optgroup>
        {DEFAULT_KIT_GROUPS.map(group=><optgroup key={group.id} label={`Default kits · ${group.name}`}>{group.kits.map(kit=><option key={kit.id} value={`${DEFAULT_KIT_PREFIX}${kit.id}`}>{kit.label}</option>)}</optgroup>)}
        <optgroup label="Legacy kits">{LEGACY_KITS.map(kit=><option key={kit.id} value={`${LEGACY_KIT_PREFIX}${kit.id}`}>{kit.name} ({kit.city})</option>)}</optgroup>
      </select></label>
      <button className={styles.primary} disabled={!selectedKit} onClick={() => void loadSelectedKit()}>Load</button>
    </div>
    <div className={styles.kitFields} data-single={!admin || undefined}>
      <label>Kit name<input maxLength={80} value={session.name} onChange={e => setSession(s => ({ ...s, name: e.target.value }))} /></label>
      {admin && <label><span className={styles.helpCaption}>Linked stage<InfoTip label="Link kit to stage">A city uses only one saved kit at a time. Replacing an existing link keeps the previous kit in the library without a city. Save DB writes the kit as the stage’s official kit for every player after the deploy.</InfoTip></span><select value={session.cityId ?? ''} onChange={e => setSession(s => ({ ...s, cityId: e.target.value || undefined }))}><option value="">No city</option>{EDITABLE_CITY_KITS.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>}
    </div>
    <div className={styles.actions}>
      <button className={styles.primary} onClick={() => void saveKit()} title={account ? 'Save to your account' : 'Save in this browser'}><Save size={15} />Save kit</button>
      {admin && <button onClick={() => void saveToGame()} disabled={!session.cityId} title="Write this kit as the linked stage’s official kit (local Admin only)"><Database size={15} />Save DB</button>}
      <button onClick={exportKit}><Download size={15} />Export</button>
      <label className={styles.upload}><Upload size={15} />Import<input type="file" accept=".json,application/json" aria-label="Import kit JSON" onChange={async e => {
        const file = e.target.files?.[0]; e.target.value = ''
        if (!file) return
        if (file.size > 150000) { setNotice('Kit file too large. Limit: 150 KB.'); return }
        try { const kit = parseCreativeSession(await file.text()); if (!confirmDiscard()) return; setSelectedKit(''); await loadSession(kit) } catch (error) { setNotice(`Kit not imported: ${messageOf(error)}`) }
      }} /></label>
      <button onClick={newRandomKit}><Dice5 size={15} />New random kit</button>
    </div>
  </fieldset>

  const transportWidget = <fieldset disabled={!ready || busy} className={styles.widgetFieldset}>
    <section className={styles.transport} aria-label="Session controls">
      <button className={styles.primary} onClick={() => { if (playing) stop(); else setPlaying(true) }} aria-pressed={playing}>
        {playing ? <Pause size={17} /> : <Play size={17} />}{playing ? 'Pause' : 'Play'}
      </button>
      <div className={styles.transportKnob}><span>Volume</span><Knob label="Volume" hideLabel value={session.volume} min={0} max={1} step={0.01} onChange={volume => setSession(s => ({ ...s, volume }))} /></div>
      <div className={styles.transportKnob} title={ruled.bpm ? `A rule is changing the tempo to ${music.snapshot.bpm.toFixed(1)} BPM; the knob sets the kit's base tempo.` : undefined}><span style={ruled.bpm ? RULED_TEXT : undefined}>{ruled.bpm ? `BPM · ${Math.round(music.snapshot.bpm)}` : 'BPM'}</span><Knob label="BPM" hideLabel value={session.bpm} min={30} max={240} step={1} formatValue={value => String(value)} onChange={bpm => setSession(s => ({ ...s, bpm }))} /></div>
      <label><HelpLabel label="Time signature">{meterLabel(session.meter)}. In compound meters each beat splits into three; in odd eighth-note meters the clock counts equal eighths and the accents form groups. Changing the time signature restarts the session clock.</HelpLabel><select aria-label="Time signature" value={session.meter} onChange={e => setSession(s => ({ ...s, meter: e.target.value as CreativeSession['meter'] }))}>{METER_IDS.map(meter=><option key={meter} value={meter}>{meter}</option>)}</select></label>
      <label><HelpLabel label="Root">Reference note shared by the pitched pieces. Melody degrees follow this note.</HelpLabel><select aria-label="Root" value={live.root} style={ruled.root ? RULED : undefined} title={ruled.root ? `Changed by a rule; the kit uses ${session.root}` : undefined} onChange={e => setSession(s => ({ ...s, root: e.target.value as CreativeSession['root'] }))}>{ROOTS.map(root => <option key={root}>{root}</option>)}</select></label>
      <label><HelpLabel label={`Scale (${music.snapshot.scale.join(' ')})`}>Set of notes allowed for pitched voices. Unpitched samples keep their original pitch.</HelpLabel><select aria-label="Scale" value={live.scale} style={ruled.scale ? RULED : undefined} title={ruled.scale ? `Changed by a rule; the kit uses ${session.scale}` : undefined} onChange={e => setSession(s => ({ ...s, scale: e.target.value as CreativeSession['scale'] }))}>{(Object.keys(SCALES) as (keyof typeof SCALES)[]).map(scale => <option key={scale} value={scale}>{SCALE_LABELS[scale]}</option>)}</select></label>
      <div className={styles.harmonyControl}><label><span className={styles.helpCaption}><span>Harmony <MusicHarmonyReadout monitor={music.monitor} compact /></span><InfoTip label="Harmony">Kit Harmony uses the harmonic degrees saved in each section of the global Arrangement. The other plans use their own progression and disable editing those degrees. The kit’s degrees are kept for when you return to Kit Harmony. Pitched basses, chords and melodies share this harmony.</InfoTip></span><select aria-label="Harmony" value={live.harmony} style={ruled.harmony ? RULED : undefined} title={ruled.harmony ? `Changed by a rule; the kit uses ${HARMONY_PLANS[session.harmony].label}` : undefined} onChange={e => {
        const harmony = e.target.value as HarmonyPlanId
        setSession(s => ({ ...s, harmony }))
      }}>{Object.entries(HARMONY_PLANS).map(([id,plan]) => <option key={id} value={id}>{plan.label}</option>)}</select></label></div>
      <div className={styles.rampSlot}><MusicBpmRamp monitor={music.monitor}/><MusicTransportReadout arrangement={session.arrangement} monitor={music.monitor} showStatus={false} showBeatUnit /><MusicPendingTransitions monitor={music.monitor}/></div>
    </section>
  </fieldset>

  const clearSolo = () => { setSoloIds(new Set()); soloMemoryRef.current = null; soloCycleIdsRef.current = new Set() }
  const activateSide = (color: 'w' | 'b') => { clearSolo(); setBoardActive(p => p.color === color); setPlaying(true) }
  const muteAll = () => { stop(); setBoardActive(() => false); clearSolo() }
  const bandLinks = <span className={styles.bandLinks}>Activate <button type="button" onClick={() => activateSide('w')} disabled={!ready || busy}>White</button> / <button type="button" onClick={() => activateSide('b')} disabled={!ready || busy}>Black</button> / <button type="button" onClick={muteAll} disabled={!ready || busy}>Mute</button> all</span>

  // The match's Song & Instruments list, with White and Black side by side.
  const bandWidget = <fieldset disabled={!ready || busy} className={styles.widgetFieldset}>
    <div data-match-ui><MusicSongPanel
      columns
      pieces={music.snapshot.pieces}
      names={Object.fromEntries(boardPieces.map(piece => [piece.id, session.instruments[piece.instrumentId]?.name]))}
      activeIds={activeIds}
      soloIds={soloIds}
      monitor={music.monitor}
      arrangement={session.arrangement}
      harmony={session.harmony}
      onArrangementChange={arrangement => setSession(s => updateCreativeArrangement(s, arrangement))}
      onSeek={music.seekSection}
      onSelect={square => {
        const piece = square && boardPieces.find(item => item.square === square)
        if (piece) select(piece.id)
        else { music.endAudition(); setBoardSelected(false) }
      }}
      onToggle={square => { const piece = boardPieces.find(item => item.square === square); if (piece) toggleActive(piece.id) }}
      onSolo={toggleSolo}
      snapshot={music.snapshot}
      selectedId={boardSelected ? selectedId : null}
      selectedView={<MusicVoiceReadout instrument={instrument} onInstrumentChange={updateInstrument} variationTabs showStatus={false} monitor={music.monitor} id={selectedId} snapshot={music.snapshot} manual={music.preview?.id === selectedId && music.preview.mode === 'manual'} />}
      onAudition={square => { const piece = boardPieces.find(item => item.square === square); if (piece) { music.audition(piece.id, square); music.releaseAudition() } }}
      onHover={setSongHover}
    /></div>
    <div className={styles.actions}>
      <button onClick={() => { music.endAudition(); rememberPositions(); setSession(resetCreativePositions) }}>Reset positions</button>
    </div>
  </fieldset>

  const instrumentWidget = <fieldset disabled={!ready || busy} className={styles.widgetFieldset}>
    <aside className={styles.inspector} aria-label="Instrument editor">
      <section className={styles.panel}>
        <div className={styles.instrumentIdentity}>
          <span className={styles.instrumentAvatar} aria-hidden="true" dangerouslySetInnerHTML={stableHtml(PiecesSVG[`${selected.color}${selected.type.toUpperCase()}` as keyof typeof PiecesSVG])} />
          <div className={styles.instrumentHeading}>
            <div className={styles.instrumentTitle}>
              {editingInstrumentName ? <input autoFocus aria-label="Instrument name" maxLength={60} value={instrument.name} onChange={e => updateInstrument({ name: e.target.value || 'Instrument' })} onBlur={() => setEditingInstrumentName(false)} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }} /> : <h2>{instrument.name}</h2>}
              <button type="button" className={styles.editName} aria-label="Edit instrument name" title="Edit name" onClick={() => setEditingInstrumentName(true)}><Pencil size={14} /></button>
            </div>
            <span className={styles.instrumentMeta}>{pieceNames[selected.type]} - {selected.origin} - {selectedOnBoard ? `on ${selected.square}` : 'off the board'} - <MusicVoiceBadge monitor={music.monitor} id={selectedId} /></span>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={!selected.active && music.preview?.id === selectedId ? styles.partialPower : undefined} aria-label={selected.active ? 'Turn loop off' : 'Turn loop on'} title={selected.active ? 'Loop on' : music.preview?.id === selectedId ? 'Temporary preview' : 'Loop off'} aria-pressed={selected.active} onClick={() => toggleActive(selectedId)}><Power size={16} /></button>
          <button aria-pressed={soloIds.has(selectedId)} onClick={() => toggleSolo(selectedId)}>Solo</button>
        </div>
        <NoteParamsHostContext.Provider value={setNoteSelection}>
          <MusicVoiceReadout instrument={instrument} onInstrumentChange={updateInstrument} variationTabs manageVariations expanded showStatus={false} monitor={music.monitor} id={selectedId} snapshot={music.snapshot} manual={music.preview?.id === selectedId && music.preview.mode === 'manual'} />
        </NoteParamsHostContext.Provider>
        <InstrumentParameters instrument={instrument} effects={effects} mapping={mapping}
          updateInstrument={updateInstrument} updateEffects={updateEffects} updateMapping={updateMapping}
          duckSources={duckSourceOptions(session.pieces, session.instruments, selected)}
          tab={paramsTab} onTab={setParamsTab} noteSelection={noteSelection} />
        <MusicPerformanceControls key={selectedId} arrangement={session.arrangement} override={music.snapshot.sectionOverrides?.[selectedId]} instrument={instrument} onChange={updateInstrument} monitor={music.monitor} />
      </section>
    </aside>
  </fieldset>

  // Where the selected instrument's sound comes from: sample bank or synth, plus how it plays.
  const sourceWidget = <fieldset disabled={!ready || busy} className={styles.widgetFieldset}>
    <section className={styles.panel} aria-label="Sample source">
        <SampleSourceControls instrument={instrument} onChange={updateInstrument} />
      <div className={styles.pair}><label><span className={styles.helpCaption}>Behavior<InfoTip label="Instrument behavior">
        <p><b>Pulse / percussion:</b> plays the written rhythm and notes without following the harmonic progression or the rank/file transposition. Without explicit settings, it uses short notes (0.12 fraction) and zero sustain.</p>
        <p><b>Phrase / sequencer:</b> plays the written melody; pitched voices follow the harmony and the position’s degree map. Without an explicit length, it uses a 0.7 fraction.</p>
        <p><b>Sustained / chords:</b> on pitched voices, a non-static harmony turns each attack into a chord with voice leading. With static harmony, it keeps the written notes/chords. Without an explicit length, it uses a 0.95 fraction; it never holds sound indefinitely.</p>
        <p>All of them allow MIDI variations, per-piece arrangement, ADSR and effects. Pitch slides need a pitched voice; unpitched samples don’t follow degrees/chords. Changing the behavior doesn’t change the source/timbre or reset the saved parameters. The manual gesture plays one note per square, without running the sequence. The piece type doesn’t restrict the choice.</p>
      </InfoTip></span><select value={instrument.behavior} onChange={e => updateInstrument({ behavior: e.target.value as Instrument['behavior'] })}><option value="pulse">Pulse / percussion</option><option value="phrase">Phrase / sequencer</option><option value="sustain">Sustained / chords</option></select></label>
        <label><HelpLabel label="Synth timbre">Waveform used by the Synthesis source. If the current source is a sample, picking a timbre switches the source to Synthesis. To go back to samples, choose Sample bank under Sound source.</HelpLabel><select value={instrument.sound} onChange={e => updateInstrument({ sound: e.target.value as Instrument['sound'], source: { kind: 'synth' } })}>{SOUNDS.map(sound => <option key={sound}>{sound}</option>)}</select></label></div>
    </section>
  </fieldset>

  const reactionsWidget = <fieldset disabled={!ready || busy} className={styles.widgetFieldset}>
    <MusicReactionEditor kit={session.reactions} onKitChange={reactions=>setSession(s=>({...s,reactions}))} kitName={session.name} context={simulation} onContext={setSimulation} descriptions={music.reactionDescriptions} bpm={music.snapshot.bpm} scale={music.snapshot.scale} embedded scope={reactionScope} onScopeChange={setReactionScope} />
  </fieldset>

  const codeWidget = <div className={styles.code}>
    {music.codeStats && <p>Export: {(music.codeStats.bytes / 1024).toFixed(1)} KB · {music.codeStats.stacks} stacks · {music.codeStats.timeCats} timeCat · {music.codeStats.orbits} orbits · {music.codeStats.filters} declared filters<InfoTip label="Export metrics">Counts of the generated code, not of active audio nodes. The effects and voices actually running vary during the music.</InfoTip></p>}
    <pre>{music.code}</pre>
  </div>

  const widgetContent: Record<CreativeWidgetId, React.ReactNode> = { kit: kitWidget, transport: transportWidget, reactions: reactionsWidget, code: codeWidget, instrument: instrumentWidget, source: sourceWidget, band: bandWidget }
  const widgetInfo: Partial<Record<CreativeWidgetId, React.ReactNode>> = {
    reactions: <ReactionScopeSwitch scope={reactionScope} onChange={setReactionScope} />,
    code: <InfoTip label="Running code">Generated from the active voices and the preview. To edit it, use the instrument controls.</InfoTip>,
    instrument: <InfoTip label="Selected instrument">The instrument of the selected piece, with its knobs in tabs like the match’s Piece params. Selecting a note in the MIDI editor opens the Note tab. Its line goes to that piece on the board.</InfoTip>,
    band: bandLinks,
  }
  // Palette: one piece per kit instrument, pawns first, as listed under a match board.
  const paletteFor = (color: 'w' | 'b'): PalettePiece[] => session.pieces
    .filter(piece => piece.color === color)
    .sort((a, b) => PALETTE_ORDER.indexOf(a.type) - PALETTE_ORDER.indexOf(b.type) || a.origin.localeCompare(b.origin))
    .map(piece => ({ id: piece.id, type: piece.type, name: session.instruments[piece.id]?.name ?? pieceNames[piece.type] }))
  const squareAt = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return null
    const file = Math.floor((clientX - rect.left) / (rect.width / 8)), row = Math.floor((clientY - rect.top) / (rect.height / 8))
    return file >= 0 && file < 8 && row >= 0 && row < 8 ? `${'abcdefgh'[file]}${8 - row}` as Square : null
  }
  // The palette sounds through a copy already on the board; an instrument with no piece placed stays silent.
  const paletteVoice = (sourceId: string) => boardPieces.find(piece => piece.id === sourceId) ?? boardPieces.find(piece => piece.instrumentId === sourceId)
  const paletteAudition = useRef<string | null>(null)
  const palette = (color: 'w' | 'b', justify: 'start' | 'end') => <PiecePalette
    color={color}
    justify={justify}
    pieces={paletteFor(color)}
    disabled={!ready || busy}
    onPress={id => { const voice = paletteVoice(id); paletteAudition.current = null; if (voice) { music.audition(voice.id, voice.square); music.releaseAudition() } }}
    onDragOver={(id, x, y) => {
      const square = squareAt(x, y), voice = paletteVoice(id)
      if (!voice || !square || paletteAudition.current === square) return
      paletteAudition.current = square
      music.audition(voice.id, square)
    }}
    onDrop={(id, x, y) => {
      paletteAudition.current = null
      music.endAudition()
      const square = squareAt(x, y)
      if (!square) return
      rememberPositions()
      const placed = placeCreativePiece(session, id, square)
      setSession(placed.session)
      select(placed.id)
      setPlaying(true)
    }}
    onCancel={() => { paletteAudition.current = null; music.releaseAudition() }}
  />
  function dropOffBoard(square: Square) {
    const piece = boardPieces.find(item => item.square === square)
    if (!piece) return
    music.endAudition()
    rememberPositions()
    setSession(current => removeCreativePiece(current, piece.id))
    if (soloIds.has(piece.id)) { const next = new Set(soloIds); next.delete(piece.id); setSoloIds(next) }
    if (selectedId === piece.id && piece.id !== piece.instrumentId) setSelectedId(piece.instrumentId)
  }

  const cardActions: Record<PowerCardKind, PowerCardAction> = {
    best: { disabled: analysis.busy, onClick: () => showRankedMoves('best'), title: `Best moves for ${selected.color === 'w' ? 'White' : 'Black'} (the selected piece’s side)` },
    worst: { disabled: analysis.busy, onClick: () => showRankedMoves('worst'), title: `Worst moves for ${selected.color === 'w' ? 'White' : 'Black'} (the selected piece’s side)` },
    undo: { disabled: historyLength === 0, onClick: undoPositions, title: 'Undo the last piece move' },
    freeze: { disabled: true, title: 'Freeze only works in matches' },
    shield: { disabled: true, title: 'Shield only works in matches' },
  }

  const widgets = CREATIVE_WIDGETS.map(widget => <CreativeWidget
    key={widget.id}
    id={widget.id}
    title={widget.id === 'band' ? `${boardPieces.length} voices` : widget.title}
    titleNote={widget.id === 'band' ? `(${activeCount} active)` : undefined}
    on={widgetOn[widget.id]}
    onToggle={() => toggleWidget(widget.id)}
    position={widgetLayout.positions[widget.id]}
    onPositionChange={position => setWidgetLayout(layout => ({ ...layout, positions: { ...layout.positions, [widget.id]: position } }))}
    size={widgetLayout.sizes[widget.id]}
    onSizeChange={size => setWidgetLayout(layout => ({ ...layout, sizes: { ...layout.sizes, [widget.id]: size } }))}
    zIndex={30 + widgetOrder.indexOf(widget.id)}
    onFront={() => bringToFront(widget.id)}
    cityColor={boardColor}
    stacked={portraitPhone}
    widgetRef={widgetRefs[widget.id]}
    info={widgetInfo[widget.id]}
  >{widgetContent[widget.id]}</CreativeWidget>)

  return <main className={styles.lab} data-stacked={portraitPhone || undefined} ref={rootRef} style={{ '--game-board-width': boardResize.width === null ? CREATIVE_BOARD_WIDTH : `${boardResize.width}px`, '--power-cards-width': cardsResize.width === null ? CREATIVE_BOARD_WIDTH : `${cardsResize.width}px` } as React.CSSProperties}>
    <header className={`${styles.studio} ${styles.labHeader}`}>
      <Link href="/" aria-label="Back to the world" className={styles.back}><ArrowLeft size={18} /></Link>
      <h1 className={styles.labTitle}>Chickenchess Lab<VersionChangelog /></h1>
    </header>

    {!portraitPhone && <GameWidgetConnections visible pieceConnections={connections} />}
    {!portraitPhone && <GameWidgetConnections overlay visible pieceConnections={hoverConnections} />}

    <div className={styles.stage}>
      <div className={styles.boardGroup} style={{ translate: boardPan.translate }}>
        <div className={styles.boardRow}>{palette('b', 'end')}</div>
        <div ref={boardRef} className={styles.board} role="group" aria-label="Creative board" aria-busy={!music.auditionReady}>
          <BoardResizeHandles enabled={boardResize.enabled} onStart={boardResize.startResize} onResizeBy={boardResize.resizeBy} onCancel={boardResize.cancelResize} />
          <fieldset className={styles.boardReadyGate} disabled={!music.auditionReady} onMouseDownCapture={music.unlock}>
          <ChessgroundBoard
            game={boardGame}
            onMove={() => {}}
            cityColor={boardColor}
            isThinking={false}
            synthSelectedSquare={boardSelected ? selected.square as Square : null}
            activeSquares={boardActiveSquares}
            musicPulseMonitor={music.pulseMonitor}
            analysisArrows={analysisArrows}
            onEmptySquarePointerDown={boardPan.startPan}
            onBoardClick={square => {
              const piece = boardPieces.find(item => item.square === square)
              // Updating the instrument editors can compile every variation.
              // Let the gesture submit its sample before that lower-priority render.
              if (piece) startTransition(() => { setSelectedId(piece.id); setBoardSelected(true) })
              else { music.endAudition(); setBoardSelected(false) }
            }}
            onPieceHold={square => {
              const id = boardPieces.find(item => item.square === square)?.id
              if (id) music.audition(id, square)
            }}
            onDragOverSquare={(from, to) => {
              const id = boardPieces.find(item => item.square === from)?.id
              if (id) music.audition(id, to)
            }}
            onPieceRelease={music.releaseAudition}
            onPieceCancel={music.endAudition}
            freeMode={{
              mode: 'move',
              auditionPiece: { color: selected.color, type: selected.type },
              onMove: (from, to) => {
                const piece = boardPieces.find(item => item.square === from)
                if (!piece) return
                setPlaying(true)
                select(piece.id)
                rememberPositions()
                setSession(current => moveCreativePiece(current, piece.id, to))
              },
              onDropOutside: dropOffBoard,
              onTogglePiece: square => {
                const piece = boardPieces.find(item => item.square === square)
                if (piece) { select(piece.id); toggleActive(piece.id) }
              },
              squareLabel: square => {
                const piece = boardPieces.find(item => item.square === square)
                return `${square}${piece ? ` · ${pieceNames[piece.type]} ${piece.color === 'w' ? 'white' : 'black'} · ${session.instruments[piece.instrumentId].name} · ${piece.active ? 'active' : 'inactive'}` : ' · empty'}`
              },
            }}
          />
          </fieldset>
          {!music.auditionReady && <div className={styles.boardLoading} role="status">Preparing kit sounds…</div>}
        </div>
        <div className={styles.boardRow}>
          {palette('w', 'start')}
          <EggCounter tone="player" value={0} display={<span className={styles.infinity}>∞</span>} widthFor={[0]} role="img" aria-label="Endless golden eggs in Creative" title="Creative has endless golden eggs" />
        </div>
      </div>
      <PowerCardHand hideCost visible={ready} undoAnimationKey={undoAnimationKey} rowRef={powerCardsRef} resize={{ enabled: cardsResize.enabled, onStart: cardsResize.startResize, onResizeBy: cardsResize.resizeBy, onCancel: cardsResize.cancelResize }} move={cardsPan.enabled ? { translate: cardsPan.translate, moving: cardsPan.panning, onPointerDown: cardsPan.startPan } : undefined} actions={cardActions} />
    </div>

    {portraitPhone ? <div className={styles.widgetStack}>{widgets}</div> : widgets}
  </main>
}
