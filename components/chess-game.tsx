"use client"

import { GamePreferences } from "./game-preferences"
import { PowerCardHand } from "./power-card-hand"
import { animateInsufficientEggs, getOfflineMulliganPreviewMoves } from "@/lib/power-presentation"
import { usePowerDisplay } from "@/hooks/use-power-display"
import { useChancePosition } from "@/hooks/use-chance-position"
import { useSpectrogramMode } from "@/hooks/use-spectrogram-mode"
import { useCrossfaderSync } from "@/hooks/use-crossfader-sync"
import { useAwardAnimations } from "@/hooks/use-award-animations"

import moveMessages from "@/data/ui/move-messages.json"

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { Chess, type Move, type Square } from "chess.js"
import { cn } from "@/lib/utils"
import type { CityData } from "@/lib/cities-data"
import { ChessgroundBoard, PiecesSVG, type AnalysisArrow } from "./chessground-board"
import { usePowerTargetingGesture } from '@/hooks/use-power-targeting-gesture'
import { LiveCodeWidget } from "./live-code-widget"
import { StockfishDebugOverlay } from "./stockfish-debug-overlay"
import { SynthControlPanel } from "./synth-control-panel"
import { MusicSongPanel, MusicSongSections, type SongPanelHover } from "./music-song-panel"
import { PieceDebugWidget } from "./piece-debug-widget"
import { useMusic } from "@/hooks/use-music"
import { MusicTransportReadout, MusicVoiceBadge, MusicVoiceReadout } from './music-playback'
import { MusicHarmonyReadout } from './music-transition-view'
import { VersionChangelog } from './version-changelog'
import { VictoryBasket } from './victory-basket'
import { matchEggPayout, matchEggSources } from '@/lib/match-eggs'
import { trackMatchCompleted, trackMatchStarted } from '@/lib/game-analytics'
import { useSfx } from "@/hooks/use-sfx"
import { Button } from "@/components/ui/button"
import { DEFAULT_EFFECTS, DEFAULT_GLOBAL_EFFECTS, type GlobalEffects } from "@/lib/types"
import { Undo2, Redo2, Check, Snowflake, Shield, Eye } from "lucide-react"
import { toast } from "sonner"
import { conquerCity, settleCityDraw, markRankedMoveNotice, rankedMoveEggReward, STARTING_MATCH_GOLDEN_EGGS, type RankedMoveReward } from "@/lib/game-progression"
import { RELEASE_LABEL } from "@/lib/release"
import { analysisLogSummary, appendMatchLog, copyMatchLog, formatMatchLog, type MatchLogEvent } from "@/lib/match-log"
import { EGG_REWARDS, cappedMatchEggs, rankedMoveEggsForPosition, rankedMoveStreakKind, rankedStreakDoubles, squareEggsExtraMs } from "@/lib/egg-rewards"
import { MixerWidget } from "./mixer-widget"
import { BoardMusicSelectors, type BoardDropdownId } from "./board-music-selectors"
import { SpectrogramWidget } from "./spectrogram-widget"
import { isConstrainedDevice } from "@/lib/performance"
import { ChessEvaluationQueue, STOCKFISH_WORKER_URL, rankedMoveRewardDetails, rememberMoveSuggestions, squareEggTargets, squareMoveRewardDetails, type ShownMoveSuggestions, type ChessMoveAnalysis, type StockfishTrace } from "@/lib/chess-evaluation"
import { WidgetToggleLayer } from "./widget-toggle-layer"
import { OpponentMoveTimer } from "@/lib/opponent-move-timer"
import { advanceMatchPowers, canUseMatchPower, createMatchPower, hasUsedPowerThisTurn, permittedPowerMoves, permitsPowerMove, shieldCaptureBlockMessage, type MatchPower, type MatchPowerKind } from "@/lib/chess-powers"
import { clonePoweredChess, freezeApplicationError, makePoweredChess, setPoweredChessPowers, stockfishSupportsPosition, syncPoweredMoveSan } from "@/lib/powered-chess"
import { analyzePoweredMovesInWorker } from "@/lib/powered-analysis-client"
import { useGameWidgetLayout } from "@/hooks/use-game-widget-layout"
import { launchEggFlight, type EggFlight } from "@/lib/egg-flight"
import { useCapturedPiecesScale, useMatchViewport } from "@/hooks/use-match-layout"
import { CapturedPieces } from "./match/captured-pieces"
import { EggCounter, MatchStatus } from "./match/egg-counter"
import { GameplayTipDialog, useGameplayTip } from "./match/gameplay-tip"
import { MATCH_HEADER_BUTTON_CLASS, MatchViewControls } from "./match/match-view-controls"
import { BOARD_CARDS_RESIZE_RATIO, powerCardsResizeLimits, useBoardResize } from "@/hooks/use-board-resize"
import { useBoardPan } from "@/hooks/use-board-pan"
import { arrowsForAnalysis, type AnalysisArrowKind } from "@/lib/analysis-arrows"
import { BoardResizeHandles } from "./board-resize-handles"
import { GameActionCostHint, GameActionRow, GameBoardChanceBar, GameCityBackground, GameCityTitleIntro, GameFooter, GameWidgetConnections, GameWidgetEntranceStyles, GlobeGridIcon } from "./game-presentation"
import { BotControlWidget } from "./bot-control-widget"
import { ChessBot, DEFAULT_BOT_ID, DEFAULT_BOT_PROFILES, getBotConfigParams, type BotConfigParams, type BotProfile } from "@/lib/chess-bots"
import { loadEditableBotProfiles, saveBotProfile } from "@/lib/admin/bot-profiles-client"
import { isAdminUser } from "@/lib/admin/access"
import { msg, t as tr, useT } from "@/lib/i18n"
import { useOnline } from "./online/online-provider"
import type { Occurrence, Trigger } from "@/lib/music/reactions"
import { duckSourceOptions } from "@/lib/music/sound-design"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ChessGameProps {
  city: CityData
  onBack: () => void
  panelsFollowPlayerTurn: boolean
  /** Other game modes can show the Best/Worst glyph behind the destination piece. */
  showRankedMoveMarks?: boolean
}

const { BEST_MOVE_MESSAGES, BEST_MOVES_WITH_WORST_SCORES_MESSAGES, OTHER_PIECE_BEST_MESSAGES, OTHER_PIECE_WORST_MESSAGES, WORST_MOVE_MESSAGES, BEST_STREAK_MESSAGES, WORST_STREAK_MESSAGES, BEST_STREAK_6_PLUS_MESSAGES, WORST_STREAK_6_PLUS_MESSAGES, SINGLE_LEGAL_MOVE_MESSAGES } = moveMessages

function randomMessage(messages: string[]) {
  return messages[Math.floor(Math.random() * messages.length)]
}

function rankedStreakFromHistory(history: Move[], classifications: Map<string, RankedMoveReward | null>) {
  let kind: RankedMoveReward | null = null
  let count = 0
  for (const move of history) {
    if (move.color !== 'w') continue
    const key = `${move.before}|${move.from}${move.to}${move.promotion ?? ''}`
    const next = classifications.get(key) ?? null
    if (next) {
      count = next === kind ? count + 1 : 1
      kind = next
    } else {
      count = 0
      kind = null
    }
  }
  return { kind, count }
}

function capturedPiecesFromHistory(history: Move[]) {
  const captured: { white: string[]; black: string[] } = { white: [], black: [] }
  for (const move of history) {
    if (move.captured) captured[move.color === 'w' ? 'white' : 'black'].push(move.captured)
  }
  return captured
}

function stockfishPosition(game: Chess): string {
  const history = game.history({ verbose: true })
  if (!history.length) return `position fen ${game.fen()}`
  const replay = new Chess(history[0].before)
  try {
    for (const move of history) replay.move({ from: move.from, to: move.to, promotion: move.promotion })
    if (replay.fen() === game.fen()) return `position fen ${history[0].before} moves ${history.map(move => `${move.from}${move.to}${move.promotion ?? ''}`).join(' ')}`
  } catch { /* A protected king may have made a move chess.js normally rejects. */ }
  return `position fen ${game.fen()}`
}

function MoveAnalysisReadout({ analysis, status }: { analysis: ChessMoveAnalysis | null; status?: string }) {
  const t = useT()
  if (status) return <div className="text-white/40">{t(status)}</div>
  if (!analysis) return <div className="text-white/40">{t("Analisando movimentos…")}</div>
  if (analysis.source === 'powers') return <div aria-label={t("Desempenho da análise")} className="border-t border-white/15 pt-2 text-white/40">{t("Análise com poderes · {moves} lances · {nodes} respostas · {ms} ms", { moves: analysis.legalMoves, nodes: analysis.nodes.toLocaleString(), ms: analysis.elapsedMs })}</div>
  return <div aria-label={t("Desempenho da análise")} className="border-t border-white/15 pt-2">
    <div className="text-white/40">{t(analysis.final ? 'Estimativa final' : 'Prévia em atualização')} · {t(analysis.side === 'w' ? 'brancas a jogar' : 'pretas a jogar')} · {t("avaliação {quickMs} ms / prof. {quickDepth} · ranking {engineMs} ms / prof. {depth} · {nodes} nós", { quickMs: analysis.quickMs, quickDepth: analysis.quickDepth, engineMs: analysis.engineMs, depth: analysis.depth, nodes: (analysis.quickNodes + analysis.nodes).toLocaleString() })}</div>
    {!analysis.complete&&<div className="text-white/40">{t("Orçamento esgotado antes de comparar todas as jogadas.")}</div>}
  </div>
}

export function ChessGame({ city, onBack, panelsFollowPlayerTurn, showRankedMoveMarks = false }: ChessGameProps) {
  // The board starts with White at the bottom; keep mixer rows tied to that orientation.
  const t = useT()
  const boardOrientation: "white" | "black" = "white"
  const [game, setGame] = useState(() => makePoweredChess(new Chess()))
  const [powerDisplay, setPowerDisplay] = usePowerDisplay()
  const online = useOnline()
  const isAdmin = isAdminUser(online.user)
  const [chancePosition, setChancePosition] = useChancePosition()
  const [spectrogramMode, setSpectrogramMode] = useSpectrogramMode()
  const [crossfaderSync, setCrossfaderSync] = useCrossfaderSync()
  // Off: rewarded moves keep their phrases and egg totals, without flying eggs or the Best/Worst whistle.
  const [awardAnimations, setAwardAnimations] = useAwardAnimations()
  const awardAnimationsRef = useRef(awardAnimations)
  awardAnimationsRef.current = awardAnimations
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false)
  const [tabVisible, setTabVisible] = useState(true)
  const [isThinking, setIsThinking] = useState(false)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([]) // Stack of SAN moves to redo
  const redoStackRef = useRef<string[]>([])
  const powerTimelineRef = useRef<Array<{ game: Chess; powers: MatchPower[] }>>([{ game: clonePoweredChess(game, []), powers: [] }])
  const redoTimelineRef = useRef<Array<{ game: Chess; powers: MatchPower[] }>>([])
  const [undoAnimationKey, setUndoAnimationKey] = useState(0)
  const [gameStatus, setGameStatus] = useState<string>(msg("Your move"))
  const [botProfiles, setBotProfiles] = useState<BotProfile[]>(() => DEFAULT_BOT_PROFILES)
  const [selectedBotId, setSelectedBotId] = useState<string>(DEFAULT_BOT_ID)
  const selectedBotProfile = useMemo(
    () => botProfiles.find(profile => profile.id === selectedBotId) ?? botProfiles[0] ?? DEFAULT_BOT_PROFILES[0],
    [botProfiles, selectedBotId],
  )
  const [botParams, setBotParams] = useState<BotConfigParams>(() => getBotConfigParams(DEFAULT_BOT_PROFILES[0]))
  const activeBot = useMemo(() => new ChessBot(selectedBotProfile, botParams), [selectedBotProfile, botParams])
  const activeBotRef = useRef<ChessBot>(activeBot)
  activeBotRef.current = activeBot
  const [openDropdown, setOpenDropdown] = useState<BoardDropdownId>(null)
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({
    white: [],
    black: [],
  })
  const capturedScale = useCapturedPiecesScale(capturedPieces.white.length, capturedPieces.black.length)
  
  // Every city starts on Easy Pure Chess; the menu can override it for this match.
  useEffect(() => {
    const initialBot = botProfiles.find(profile => profile.id === DEFAULT_BOT_ID) ?? botProfiles[0] ?? DEFAULT_BOT_PROFILES[0]
    setSelectedBotId(initialBot.id)
    setBotParams(getBotConfigParams(initialBot))
  }, [city.id])

  useEffect(() => {
    const updateVisibility = () => setTabVisible(document.visibilityState === 'visible')
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  const [globalEffects, setGlobalEffects] = useState<GlobalEffects>({ ...DEFAULT_GLOBAL_EFFECTS, bpm: city.bpm })
  const [lastEvalScore, setLastEvalScore] = useState<number | null>(null)
  const lastEvalScoreRef = useRef<number | null>(null)
  lastEvalScoreRef.current = lastEvalScore
  const [lastEvalMate, setLastEvalMate] = useState<number | null>(null)
  const lastEvalMateRef = useRef<number | null>(null)
  lastEvalMateRef.current = lastEvalMate
  const [evaluationError, setEvaluationError] = useState<string | null>(null)
  const [stockfishDebugOn, setStockfishDebugOn] = useState(false)
  const [stockfishDebugPosition, setStockfishDebugPosition] = useState<{ x: number; y: number } | null>(null)
  const stockfishDebugOnRef = useRef(false)
  const [stockfishTrace, setStockfishTrace] = useState<StockfishTrace | null>(null)
  const stockfishTraceRef = useRef<StockfishTrace | null>(null)
  const stockfishTraceTimerRef = useRef<number | null>(null)
  const [workerEpoch, setWorkerEpoch] = useState(0)
  const workerRetriesRef = useRef(0)
  const workerRetryTimerRef = useRef<number | null>(null)
  const aiMoveCallbackRef = useRef<(uci: string) => void>(() => {})
  const aiMoveTimerRef = useRef<OpponentMoveTimer | null>(null)
  if (!aiMoveTimerRef.current) aiMoveTimerRef.current = new OpponentMoveTimer()
  const aiMoveCandidateRef = useRef<{ fen: string; uci: string } | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [moveAnalysis, setMoveAnalysis] = useState<ChessMoveAnalysis | null>(null)
  const [liveMoveAnalysis, setLiveMoveAnalysis] = useState<ChessMoveAnalysis | null>(null)
  const currentCompleteAnalysisRef = useRef<ChessMoveAnalysis | null>(null)
  const botPrePowerAnalysisRef = useRef<ChessMoveAnalysis | null>(null)
  const analysisArrowKindRef = useRef<AnalysisArrowKind | null>(null)
  const pendingShownSuggestionsRef = useRef<ShownMoveSuggestions | null>(null)
  const shownSuggestionsRef = useRef<ShownMoveSuggestions[]>([])
  // The group whose eggs sit on its destination squares; any piece landing there earns them.
  const [squareEggGroup, setSquareEggGroup] = useState<ShownMoveSuggestions | null>(null)
  const squareEggGroupRef = useRef<ShownMoveSuggestions | null>(null)
  // When the square eggs start fading (epoch ms); they are gone, and no longer pay any piece, after the fade.
  const [squareEggFadeAt, setSquareEggFadeAt] = useState<number | null>(null)
  const squareEggTimeoutRef = useRef<number | null>(null)
  const suggestionPositionKeyRef = useRef<string | null>(null)

  const [visibleEggs, setVisibleEggs] = useState(STARTING_MATCH_GOLDEN_EGGS)
  const playerEggBalanceRef = useRef(STARTING_MATCH_GOLDEN_EGGS)
  const opponentEggBalanceRef = useRef(STARTING_MATCH_GOLDEN_EGGS)
  const botTurnCountRef = useRef(0)
  const botLastWorstTurnRef = useRef<number | null>(null)
  const botLastPowerTurnRef = useRef<Record<MatchPowerKind, number | null>>({ freeze: null, shield: null })
  const debugEggClicksRef = useRef(0)
  const collectedMatchEggsRef = useRef(0)
  /** Eggs earned while the player's counter was full: the only match eggs that add historic points. */
  const historicMatchPointsRef = useRef(0)
  const victoryToastRef = useRef<string | number | null>(null)
  // Bot checkmate keeps the match open for a Mulligan; this notice offers the way back to the globe.
  const defeatToastRef = useRef<string | number | null>(null)
  const dismissDefeatToast = useCallback(() => {
    if (defeatToastRef.current !== null) toast.dismiss(defeatToastRef.current)
    defeatToastRef.current = null
  }, [])
  useEffect(() => () => {
    if (victoryToastRef.current !== null) toast.dismiss(victoryToastRef.current)
    if (defeatToastRef.current !== null) toast.dismiss(defeatToastRef.current)
  }, [])
  const victorySettledRef = useRef(false)
  const reportedMatchResultRef = useRef<string | null>(null)
  const reportedMatchStartRef = useRef(false)
  const matchStartedAtRef = useRef<number | null>(null)
  const matchUsageRef = useRef({ freeze: 0, shield: 0, undo: 0, redo: 0, best: 0, worst: 0 })
  const [rankedMoveMark, setRankedMoveMark] = useState<{ square: Square; kind: RankedMoveReward; id: number } | null>(null)
  const [rankedMoveAnnouncement, setRankedMoveAnnouncement] = useState<{ square: Square; kind: RankedMoveReward | 'neutral'; id: number; headline: string; earnedEggs: number; streak: boolean; comeback?: boolean } | null>(null)
  const [eggFlight, setEggFlight] = useState<EggFlight | null>(null)
  const [hoveredCostAction, setHoveredCostAction] = useState<'best' | 'undo' | 'redo' | 'worst' | 'freeze' | 'shield' | null>(null)
  const costHintTimerRef = useRef<number | null>(null)
  const costHintHideTimerRef = useRef<number | null>(null)
  const [mulliganPreviewActive, setMulliganPreviewActive] = useState(false)
  const mulliganPreviewMoves = useMemo(() => {
    if (!mulliganPreviewActive) return null
    return getOfflineMulliganPreviewMoves(game)
  }, [mulliganPreviewActive, game])
  const opponentEggCounterRef = useRef<HTMLDivElement | null>(null)
  const [visibleOpponentEggs, setVisibleOpponentEggs] = useState(STARTING_MATCH_GOLDEN_EGGS)
  const eggCounterRef = useRef<HTMLDivElement | null>(null)
  const [armedPower, setArmedPower] = useState<MatchPowerKind | null>(null)
  const [matchPowers, setMatchPowers] = useState<MatchPower[]>([])
  // Powers, Mulligan and Best/Worst have no trace in the move list, so the music keeps its own log.
  const [reactionLog, setReactionLog] = useState<Occurrence[]>([])
  const recordReaction = useCallback((trigger: Trigger, color: 'w' | 'b', ply: number) => setReactionLog(log => [...log, { trigger, color, ply }].slice(-128)), [])
  // Diagnostic log copied from Preferences: every move with its egg reward state, powers, Undo/Redo and views.
  const matchLogRef = useRef<MatchLogEvent[]>([])
  const loggedGameOverFenRef = useRef<string | null>(null)
  const logMatch = useCallback((event: MatchLogEvent) => appendMatchLog(matchLogRef.current, {
    ...event,
    eggsAfter: { w: playerEggBalanceRef.current, b: opponentEggBalanceRef.current },
    ...(matchPowersRef.current.length ? { powers: matchPowersRef.current.map(power => `${power.kind} ${power.square} ${power.appliedBy ?? 'w'}`) } : {}),
  }), [])
  const matchPowersRef = useRef<MatchPower[]>([])
  const playerHasActivePower = matchPowers.some(p => (p.appliedBy ?? 'w') === 'w')
  const powerButtonRefs = useRef<Record<MatchPowerKind, HTMLButtonElement | null>>({ freeze: null, shield: null })
  const powerSerialRef = useRef(0)
  const rewardedMovesRef = useRef(new Set<string>())
  const rankedMoveKindsRef = useRef(new Map<string, RankedMoveReward | null>())
  const rankedMoveStreakRef = useRef<{ kind: RankedMoveReward | null; count: number }>({ kind: null, count: 0 })
  const botRewardedMovesRef = useRef(new Set<string>())
  const botRankedMoveStreakRef = useRef<{ kind: RankedMoveReward | null; count: number }>({ kind: null, count: 0 })
  const rewardSerialRef = useRef(0)
  const rewardMarkTimerRef = useRef<number | null>(null)
  const rewardAnnouncementTimerRef = useRef<number | null>(null)
  const flightCleanupsRef = useRef(new Set<() => void>())
  const [analysisArrows, setAnalysisArrows] = useState<AnalysisArrow[]>([])
  const analysisArrowTimeoutRef = useRef<number | null>(null)
 
  const gameRef = useRef(game)
  const rewardedCheckmateFenRef = useRef<string | null>(null)
  const evaluationQueueRef = useRef<ChessEvaluationQueue | null>(null)
  const poweredAnalysisSequenceRef = useRef(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const centerContainerRef = useRef<HTMLDivElement | null>(null)
  const knobsRef = useRef<HTMLDivElement | null>(null)
  const knobsHandleRef = useRef<HTMLDivElement | null>(null)
  const knobsToggleRef = useRef<HTMLButtonElement | null>(null)
  const pieceDebugRef = useRef<HTMLDivElement | null>(null)
  const pieceDebugHandleRef = useRef<HTMLDivElement | null>(null)
  const pieceDebugToggleRef = useRef<HTMLButtonElement | null>(null)
  const globalPanelRef = useRef<HTMLDivElement | null>(null)
  const globalPanelToggleRef = useRef<HTMLButtonElement | null>(null)
  const mixerRef = useRef<HTMLDivElement | null>(null)
  const mixerHandleRef = useRef<HTMLDivElement | null>(null)
  const mixerToggleRef = useRef<HTMLButtonElement | null>(null)
  const liveCodeRef = useRef<HTMLDivElement | null>(null)
  const liveCodeHandleRef = useRef<HTMLDivElement | null>(null)
  const liveCodeToggleRef = useRef<HTMLButtonElement | null>(null)
  const botControlRef = useRef<HTMLDivElement | null>(null)
  const botControlHandleRef = useRef<HTMLDivElement | null>(null)
  const botControlToggleRef = useRef<HTMLButtonElement | null>(null)
  const boardAreaRef = useRef<HTMLDivElement | null>(null)
  const movesTickerRef = useRef<HTMLDivElement>(null)
  const [knobsPosition, setKnobsPosition] = useState<{ x: number; y: number } | null>(null)
  const [pieceDebugPosition, setPieceDebugPosition] = useState<{ x: number; y: number } | null>(null)
  const [globalPanelPosition, setGlobalPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [mixerPosition, setMixerPosition] = useState<{ x: number; y: number } | null>(null)
  const [spectrogramPosition, setSpectrogramPosition] = useState<{ x: number; y: number } | null>(null)
  const [liveCodePosition, setLiveCodePosition] = useState<{ x: number; y: number } | null>(null)
  const [botControlPosition, setBotControlPosition] = useState<{ x: number; y: number } | null>(null)
  const [botControlOn, setBotControlOn] = useState(false)
  const [canSaveBot, setCanSaveBot] = useState(false)
  const [savingBot, setSavingBot] = useState(false)
  
  // Intro State
  // 0 = Intro Text, 1 = City Title, 2 = Board Descend, 3 = Game Active
  const [introPhase, setIntroPhase] = useState(0)
  const [currentIntroLine, setCurrentIntroLine] = useState(0)
  const [showIntroButton, setShowIntroButton] = useState(false)
  const [showIntroBoxes, setShowIntroBoxes] = useState(false)
  const [showIntroGlow, setShowIntroGlow] = useState(true)
  const [introExitStarted, setIntroExitStarted] = useState(false)
  const gameplayTip = useGameplayTip(introPhase === 3)
  const introStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const introVolumeFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const introStartRequestedRef = useRef(false)
  const introContinueRequestedRef = useRef(false)

  useEffect(() => () => {
    if (introStartTimerRef.current) clearTimeout(introStartTimerRef.current)
    if (introVolumeFadeTimerRef.current) clearTimeout(introVolumeFadeTimerRef.current)
  }, [])

  const [activeWidgetOrder, setActiveWidgetOrder] = useState<string[]>([])
  const [widgetTogglesReady, setWidgetTogglesReady] = useState(false)
  const [musicEngineOn, setMusicEngineOn] = useState(true)

  const [isBackgroundDark, setIsBackgroundDark] = useState(false)

  const boardScale = 1

  
    // Auto-scroll to end (right) when history changes
    useEffect(() => {
        if (movesTickerRef.current) {
            movesTickerRef.current.scrollTo({
                left: movesTickerRef.current.scrollWidth,
                behavior: "smooth"
            })
        }
    }, [moveHistory])
  
  // Intro Animation Logic
  useEffect(() => {
      if (introPhase === 0) {
          const timer = setInterval(() => {
              setCurrentIntroLine(prev => {
                  if (prev < (city.introPhrases?.length || 0)) {
                      return prev + 1
                  }
                  clearInterval(timer)
                  setShowIntroButton(true)
                  return prev
              })
          }, 1500) // Increased by 50% from 1000ms
          return () => clearInterval(timer)
      }
  }, [introPhase, city.introPhrases])

  const skipIntro = () => {
      if (introPhase === 0) {
          setCurrentIntroLine(city.introPhrases?.length || 5)
          setShowIntroButton(true)
      }
  }

  const handleContinue = () => {
      if (introContinueRequestedRef.current) return
      introContinueRequestedRef.current = true
      void engineRef.current?.resume()
      playDrum('bd', 0.7, 0.6)

      // Show the city title for five seconds, with an optional click to advance.
      setIntroPhase(1)
      setShowIntroBoxes(true)
      introStartRequestedRef.current = false
      if (introStartTimerRef.current) clearTimeout(introStartTimerRef.current)
      introStartTimerRef.current = setTimeout(() => handleStartGame(), 5000)
  }

  const beginGameTransition = () => {
      // Fade the city glow first, then fade the title itself over one second.
      engineRef.current?.playSeatbelt()
      setIntroExitStarted(true)
      setShowIntroGlow(false)
      setIsBackgroundDark(true)
      
      // Let the title chime ring through before starting the gameplay volume fade.
      introVolumeFadeTimerRef.current = setTimeout(() => {
          introVolumeFadeTimerRef.current = null
          if (engineRef.current) {
              engineRef.current.setGlobalVolume(0)
              if (engineRef.current.context && engineRef.current.context.state === 'suspended') {
                  engineRef.current.context.resume()
              }
          }
          handleGlobalEffectChange("volume", 0)

          let vol = 0
          const fadeInterval = setInterval(() => {
              vol += 0.05
              if (vol >= 0.8) {
                  vol = 0.8
                  clearInterval(fadeInterval)
              }
              handleGlobalEffectChange("volume", vol)
          }, 3000 / (0.8 / 0.05))
      }, 1500)

      // Wait for background darken (1s) before board descend
      setTimeout(() => {
          setIntroPhase(2) // Board Descend
          setTimeout(() => {
              setIntroPhase(3) // Game Active (Controls appear)
          }, 3500) // Finish descent and leave time for the 1.5 s title fade
      }, 1000)
  }

  const handleStartGame = () => {
      if (introStartRequestedRef.current) return
      introStartRequestedRef.current = true
      if (introStartTimerRef.current) clearTimeout(introStartTimerRef.current)
      introStartTimerRef.current = null
      beginGameTransition()
  }

  const { isMobile, isPortraitMobile } = useMatchViewport(boardScale)
  const powerCardsRef = useRef<HTMLDivElement | null>(null)
  const boardResize = useBoardResize({ boardRef: boardAreaRef, enabled: !isPortraitMobile, scale: boardScale, reservedHeight: powerDisplay === "cards" ? () => (powerCardsRef.current?.offsetWidth ?? 0) * BOARD_CARDS_RESIZE_RATIO : undefined })
  const cardsResize = useBoardResize({ boardRef: powerCardsRef, enabled: !isPortraitMobile && powerDisplay === "cards", customLimits: powerCardsResizeLimits })
  const boardPan = useBoardPan({ boardRef: boardAreaRef, enabled: !isMobile && introPhase >= 3 })
  const cardsPan = useBoardPan({ boardRef: powerCardsRef, enabled: !isMobile && introPhase >= 3 && powerDisplay === "cards" })

  const [knobsOn, setKnobsOn] = useState(false)
  const knobsManuallyClosedRef = useRef(false)
  const [songHover, setSongHover] = useState<SongPanelHover | null>(null)
  // Piece Params shows the Song & Instruments list until the full params are opened.
  const [paramsOpen, setParamsOpen] = useState(false)
  // Section picked in the Sections bar: the Section scope of Piece params edits it.
  const [paramsSectionId, setParamsSectionId] = useState<string | null>(null)
  const [songMidiOn, setSongMidiOn] = useState(true)
  const mixerManuallyClosedRef = useRef(false)
  const musicWidgetsBeforeMuteRef = useRef<{
    mixer: boolean
    spectrogram: boolean
    knobs: boolean
    pieceDebug: boolean
    order: string[]
  } | null>(null)
  const restoreMusicWidgetsOnNextEffectRef = useRef(false)
  const firstMovePanelsActivatedRef = useRef(false)
  const [globalPanelOn, setGlobalPanelOn] = useState(false)
  const [mixerOn, setMixerOn] = useState(false)
  const [spectrogramOn, setSpectrogramOn] = useState(false)
  const [pieceDebugOn, setPieceDebugOn] = useState(false)
  const [liveCodeOn, setLiveCodeOn] = useState(false)
  const [codeBackdropOn, setCodeBackdropOn] = useState(false)
  const [codeTextOn, setCodeTextOn] = useState(true)
  const toggleCodeBackdrop = () => {
    const next = !codeBackdropOn
    setCodeBackdropOn(next)
    if (!next) {
      setLiveCodeOn(false)
      setPieceDebugOn(false)
      setBotControlOn(false)
      setActiveWidgetOrder(current => current.filter(id => id !== "liveCode" && id !== "pieceDebug" && id !== "botControl"))
      stockfishDebugOnRef.current = false
      setStockfishDebugOn(false)
    }
  }
  const toggleStockfishDebug = () => {
    const next = !stockfishDebugOnRef.current
    stockfishDebugOnRef.current = next
    setStockfishDebugOn(next)
    if (next) setStockfishTrace(stockfishTraceRef.current)
  }
  const restartStockfish = useCallback(() => {
    if (workerRetryTimerRef.current !== null) window.clearTimeout(workerRetryTimerRef.current)
    workerRetryTimerRef.current = null
    workerRetriesRef.current = 0
    setWorkerEpoch(epoch => epoch + 1)
  }, [])

  const deactivatePlaybackWidgets = useCallback(() => {
    setGlobalPanelOn(false)
    setMixerOn(false)
    setKnobsOn(false)
    setActiveWidgetOrder(current => current.filter(id => id !== 'globalPanel' && id !== 'mixer' && id !== 'knobs'))
  }, [])
  
  const spectrogramHandleRef = useRef<HTMLDivElement | null>(null)
  const spectrogramToggleRef = useRef<HTMLButtonElement | null>(null)

  // Engine scores by ply feed the music's tension and swing triggers; 10 cp steps avoid a re-render per search depth.
  const [evaluationLog, setEvaluationLog] = useState<Record<number, number>>({})
  useEffect(() => {
    // Scores arrive for the position on the board; a new move resets the engine before the next one.
    if (lastEvalScore === null) return
    const ply = gameRef.current.history().length
    const score = Math.round(Math.max(-1000, Math.min(1000, lastEvalScore)) / 10) * 10
    setEvaluationLog(log => log[ply] === score ? log : { ...Object.fromEntries(Object.entries(log).filter(([at]) => Number(at) < ply)), [ply]: score })
  }, [lastEvalScore])
  const musicOptions = useMemo(() => ({ actionEvents: reactionLog, evaluations: evaluationLog }), [reactionLog, evaluationLog])
  const musicPositions = useMemo(() => powerTimelineRef.current.map(entry => entry.game), [game, matchPowers])
  const music = useMusic(game, city, isPlaying && tabVisible, globalEffects.bpm, globalEffects.volume, codeBackdropOn || liveCodeOn, musicEngineOn, musicPositions, musicOptions)
  if (paramsOpen && !music.selected) setParamsOpen(false)
  useEffect(() => { if (!tabVisible) music.endAudition() }, [tabVisible, music.endAudition])

  const { resumeAudio, playCheckmate, playVictoryFanfare, playDrawKalimba, playSquareSample, playDrum, engineRef } = useSfx()

  // A city kit owns its initial tempo. The global control can still change it
  // freely after the kit has been loaded for this match.
  useEffect(() => {
    const kitBpm = music.kitBpm
    const kitVolume = music.kitVolume
    if (kitBpm == null) return
    setGlobalEffects(current => current.bpm === kitBpm && current.volume === kitVolume ? current : { ...current, bpm: kitBpm, volume: kitVolume ?? current.volume })
  }, [city.id, music.kitBpm, music.kitVolume])

  // Global Effects Handlers
  const handleGlobalEffectChange = useCallback((effect: keyof GlobalEffects, value: number) => {
    setGlobalEffects(prev => {
        const next = { ...prev, [effect]: value }
        
        if (effect === "volume") engineRef.current?.setGlobalVolume(value)
        
        return next
    })
  }, [engineRef])

  // Keep ref in sync
  useEffect(() => {
    gameRef.current = game
  }, [game])

  useEffect(() => {
    return () => {
      if (rewardMarkTimerRef.current !== null) window.clearTimeout(rewardMarkTimerRef.current)
      if (costHintTimerRef.current !== null) window.clearTimeout(costHintTimerRef.current)
      if (costHintHideTimerRef.current !== null) window.clearTimeout(costHintHideTimerRef.current)
      flightCleanupsRef.current.forEach(cleanup => cleanup())
      flightCleanupsRef.current.clear()
    }
  }, [])

  useEffect(() => {
    if (!eggFlight) return
    const counterEl = eggFlight.owner === 'b' ? opponentEggCounterRef.current : eggCounterRef.current
    launchEggFlight(eggFlight, counterEl, boardAreaRef.current, flightCleanupsRef.current, { still: eggFlight.direction === 'earn' && !awardAnimationsRef.current })
  }, [eggFlight])

  // One single-thread engine, shared by evaluation and opponent play.
  useEffect(() => {
    const worker = new Worker(STOCKFISH_WORKER_URL)
    const queue = new ChessEvaluationQueue(worker, {
      onBusy: setIsEvaluating,
      onScore: (score, mate) => { workerRetriesRef.current = 0; setLastEvalScore(score); setLastEvalMate(mate); setEvaluationError(null) },
      onAnalysis: analysis => {
        setMoveAnalysis(analysis)
        if (!analysis || analysis.complete) currentCompleteAnalysisRef.current = analysis
      },
      onProgress: analysis => {
        setLiveMoveAnalysis(analysis)
        if (!analysis || analysis.complete) currentCompleteAnalysisRef.current = analysis
      },
      onTrace: trace => {
        stockfishTraceRef.current = trace
        if (!stockfishDebugOnRef.current || stockfishTraceTimerRef.current !== null) return
        stockfishTraceTimerRef.current = window.setTimeout(() => {
          stockfishTraceTimerRef.current = null
          setStockfishTrace(stockfishTraceRef.current)
        }, 80)
      },
      onMove: (uci, fen) => {
        if (gameRef.current.fen() === fen && gameRef.current.turn() === 'b') aiMoveCandidateRef.current = { fen, uci }
      },
      onError: message => {
        worker.terminate(); setEvaluationError(message); setLastEvalScore(null)
        if (workerRetriesRef.current < 2) {
          workerRetriesRef.current += 1
          workerRetryTimerRef.current = window.setTimeout(() => {
            workerRetryTimerRef.current = null
            setWorkerEpoch(epoch => epoch + 1)
          }, 300)
        }
      },
    }, isConstrainedDevice())
    evaluationQueueRef.current = queue
    worker.onmessage = event => queue.handleMessage(String(event.data))
    worker.onerror = () => queue.fail()
    worker.onmessageerror = () => queue.fail()
    queue.initialize()
    return () => {
      if (stockfishTraceTimerRef.current !== null) window.clearTimeout(stockfishTraceTimerRef.current)
      stockfishTraceTimerRef.current = null
      if (workerRetryTimerRef.current !== null) window.clearTimeout(workerRetryTimerRef.current)
      workerRetryTimerRef.current = null
      queue.reset(); worker.terminate(); evaluationQueueRef.current = null
    }
  }, [workerEpoch])

  useEffect(() => {
    aiMoveTimerRef.current?.setPaused(!isPlaying)
  }, [isPlaying])

  useEffect(() => () => { aiMoveTimerRef.current?.cancel() }, [])

  useEffect(() => () => { poweredAnalysisSequenceRef.current++ }, [])

  const clearSquareEggs = useCallback(() => {
    if (squareEggTimeoutRef.current !== null) window.clearTimeout(squareEggTimeoutRef.current)
    squareEggTimeoutRef.current = null
    squareEggGroupRef.current = null
    setSquareEggGroup(null)
  }, [])

  const requestEvaluation = useCallback((gameInstance: Chess, opponentSkill?: number, opponentDelayMs?: number) => {
    const analysisSequence = ++poweredAnalysisSequenceRef.current
    // Applying a power can change legal moves without changing the FEN. Clear
    // the previous ranking so a quick move cannot earn an outdated reward.
    currentCompleteAnalysisRef.current = null
    setMoveAnalysis(null)
    setLiveMoveAnalysis(null)
    setPoweredChessPowers(gameInstance, matchPowersRef.current)
    aiMoveCandidateRef.current = null
    if (analysisArrowTimeoutRef.current !== null) window.clearTimeout(analysisArrowTimeoutRef.current)
    analysisArrowTimeoutRef.current = null
    setAnalysisArrows([])
    analysisArrowKindRef.current = null
    pendingShownSuggestionsRef.current = null
    clearSquareEggs()
    gameRef.current = gameInstance
    if (matchPowersRef.current.length && !gameInstance.moves({ verbose: true }).length && clonePoweredChess(gameInstance, []).moves({ verbose: true }).length) {
      matchPowersRef.current = []
      setMatchPowers([])
      setPoweredChessPowers(gameInstance, [])
      powerTimelineRef.current[gameInstance.history().length] = { game: clonePoweredChess(gameInstance, []), powers: [] }
      toast.info(tr('Powers faded because no reply was available'))
    }
    // Powers can change the available moves without changing the FEN.
    const suggestionKey = `${gameInstance.fen()}|${JSON.stringify(matchPowersRef.current)}`
    if (suggestionPositionKeyRef.current !== suggestionKey) shownSuggestionsRef.current = []
    suggestionPositionKeyRef.current = suggestionKey
    if (gameInstance.isGameOver()) {
      aiMoveTimerRef.current?.cancel()
      evaluationQueueRef.current?.reset()
      setLastEvalScore(gameInstance.isCheckmate() ? (gameInstance.turn() === 'w' ? -100000 : 100000) : 0)
      setLastEvalMate(gameInstance.isCheckmate() ? 0 : null)
      setIsThinking(false)
      return
    }
    const allMoves = clonePoweredChess(gameInstance, []).moves({ verbose: true })
    let permittedMoves = permittedPowerMoves(allMoves, matchPowersRef.current, gameInstance.history().length + 1)
    if (matchPowersRef.current.length) permittedMoves = gameInstance.moves({ verbose: true })
    const candidates = permittedMoves.map(move => ({
      uci: `${move.from}${move.to}${move.promotion ?? ''}`, san: move.san,
    }))
    const opponentCandidates = permittedMoves.map(move => `${move.from}${move.to}${move.promotion ?? ''}`)
    const position = stockfishPosition(gameInstance)
    if (matchPowersRef.current.length || !stockfishSupportsPosition(gameInstance)) {
      evaluationQueueRef.current?.reset()
      setIsEvaluating(true)
      const currentPowers = matchPowersRef.current.map(power => ({ ...power }))
      void analyzePoweredMovesInWorker(gameInstance, currentPowers, () => poweredAnalysisSequenceRef.current !== analysisSequence).then(analysis => {
        if (!analysis || poweredAnalysisSequenceRef.current !== analysisSequence) return
        setMoveAnalysis(analysis)
        setLiveMoveAnalysis(analysis)
        currentCompleteAnalysisRef.current = analysis
        setIsEvaluating(false)
        setEvaluationError(null)
        const whiteScore = (analysis.best[0]?.score ?? 0) * (analysis.side === 'w' ? 1 : -1)
        setLastEvalScore(whiteScore)
        setLastEvalMate(null)
        if (analysis.side === 'b' && analysis.best[0]) aiMoveCandidateRef.current = { fen: analysis.fen, uci: analysis.best[0].uci }
      }).catch(error => {
        if (poweredAnalysisSequenceRef.current !== analysisSequence) return
        setIsEvaluating(false)
        setEvaluationError(error instanceof Error ? error.message : tr('Não foi possível avaliar os poderes.'))
      })
    } else if (evaluationQueueRef.current?.hasFailed && workerRetryTimerRef.current === null) {
      // The retries for an earlier position ran out: a new position gets a fresh
      // engine, and the restart evaluates the current position again.
      workerRetriesRef.current = 0
      setWorkerEpoch(epoch => epoch + 1)
    } else evaluationQueueRef.current?.request(gameInstance.fen(), gameInstance.turn(), candidates, { position, skill: opponentSkill, searchMoves: permittedMoves.length < allMoves.length ? opponentCandidates : undefined })
    if (gameInstance.turn() === 'b' && opponentSkill !== undefined) {
      const fen = gameInstance.fen()
      const delayMs = opponentDelayMs ?? activeBotRef.current.delayMs
      aiMoveTimerRef.current?.schedule(fen, delayMs, () => {
        if (gameRef.current.fen() !== fen || gameRef.current.turn() !== 'b') return
        const currentBot = activeBotRef.current
        const nextBotTurnCount = botTurnCountRef.current + 1
        botTurnCountRef.current = nextBotTurnCount
        const suggested = aiMoveCandidateRef.current?.fen === fen ? aiMoveCandidateRef.current.uci
          : evaluationQueueRef.current?.bestAvailableMove(fen) ?? null
        const bestAvailable = evaluationQueueRef.current?.bestAvailableMove(fen) ?? null
        const decision = currentBot.decideTurn({
          game: gameRef.current,
          powers: matchPowersRef.current,
          botTurnNumber: nextBotTurnCount,
          lastWorstMoveTurn: botLastWorstTurnRef.current,
          lastFreezeTurn: botLastPowerTurnRef.current.freeze,
          lastShieldTurn: botLastPowerTurnRef.current.shield,
          botEggs: opponentEggBalanceRef.current,
          whiteScore: lastEvalScoreRef.current,
          whiteMate: lastEvalMateRef.current,
          blackAnalysis: currentCompleteAnalysisRef.current,
          stockfishSuggestedUci: suggested,
          bestAvailableUci: bestAvailable,
          permittedMoves,
        })

        if (decision.usedWorstMoveForEggs) botLastWorstTurnRef.current = nextBotTurnCount

        if (decision.insufficientEggs && currentBot.isChickenBot) {
          void engineRef.current?.playBlockedCue()
          animateInsufficientEggs(opponentEggCounterRef.current)
        }

        if (
          decision.powerAction &&
          currentBot.isChickenBot &&
          canUseMatchPower(gameRef.current, 'b') &&
          (decision.powerAction.kind !== 'freeze' || gameRef.current.get(decision.powerAction.square)?.color !== 'b')
        ) {
          const power = createMatchPower(
            decision.powerAction.kind,
            decision.powerAction.square,
            gameRef.current,
            ++powerSerialRef.current,
          )
          const freezeErr = freezeApplicationError(gameRef.current, matchPowersRef.current, power)
          if (!freezeErr && opponentEggBalanceRef.current >= 3) {
            botPrePowerAnalysisRef.current = currentCompleteAnalysisRef.current
            botLastPowerTurnRef.current = { ...botLastPowerTurnRef.current, [decision.powerAction.kind]: nextBotTurnCount }
            opponentEggBalanceRef.current = Math.max(0, opponentEggBalanceRef.current - 3)
            setVisibleOpponentEggs(opponentEggBalanceRef.current)
            const targetSquareEl = boardAreaRef.current?.querySelector<HTMLElement>(`[data-square="${decision.powerAction.square}"]`)
            const bounds = (rect: DOMRect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
            setEggFlight({
              id: ++rewardSerialRef.current,
              amount: 3,
              direction: 'spend',
              owner: 'b',
              from: opponentEggCounterRef.current ? bounds(opponentEggCounterRef.current.getBoundingClientRect()) : undefined,
              to: targetSquareEl ? bounds(targetSquareEl.getBoundingClientRect()) : undefined,
            })
            if (decision.powerAction.kind === 'freeze') playDrum('ch', 0.648, 1)
            else playDrum('oh', 0.696)
            recordReaction(decision.powerAction.kind, 'b', gameRef.current.history().length)
            matchPowersRef.current = [...matchPowersRef.current, power]
            logMatch({ t: 'power', by: 'b', kind: decision.powerAction.kind, square: decision.powerAction.square, cost: 3, ply: gameRef.current.history().length, fen: gameRef.current.fen() })
            setMatchPowers(matchPowersRef.current)
            setPoweredChessPowers(gameRef.current, matchPowersRef.current)
            powerTimelineRef.current[gameRef.current.history().length] = {
              game: clonePoweredChess(gameRef.current, matchPowersRef.current),
              powers: matchPowersRef.current.map(item => ({ ...item })),
            }
            const nextGame = clonePoweredChess(gameRef.current, matchPowersRef.current)
            setGame(nextGame)
            gameRef.current = nextGame
            requestEvaluation(nextGame)
            const nextFen = nextGame.fen()
            aiMoveTimerRef.current?.schedule(nextFen, 1000, () => {
              if (gameRef.current.fen() !== nextFen || gameRef.current.turn() !== 'b') return
              // After a Freeze, prefer the best move of the analysis that already counts the new power.
              // A Shield keeps its planned advance, which is the reason it was applied.
              const reanalyzedUci = decision.powerAction?.kind === 'freeze' && aiMoveCandidateRef.current?.fen === nextFen
                ? aiMoveCandidateRef.current.uci
                : null
              const moveUci = reanalyzedUci ?? decision.moveUci
              if (moveUci) aiMoveCallbackRef.current(moveUci)
              setIsThinking(false)
            })
            return
          }
        }

        if (decision.moveUci) aiMoveCallbackRef.current(decision.moveUci)
        setIsThinking(false)
      })
    } else aiMoveTimerRef.current?.cancel()
  }, [engineRef, playDrum, clearSquareEggs])

  const handleBotLevelChange = useCallback((botId: string) => {
    const nextProfile = botProfiles.find(profile => profile.id === botId) ?? botProfiles[0] ?? DEFAULT_BOT_PROFILES[0]
    const nextParams = getBotConfigParams(nextProfile)
    const nextBot = new ChessBot(nextProfile, nextParams)
    activeBotRef.current = nextBot
    logMatch({ t: 'bot', name: nextBot.name, ply: gameRef.current.history().length })
    setSelectedBotId(nextProfile.id)
    setBotParams(nextParams)
    if (aiMoveTimerRef.current?.hasPending && gameRef.current.turn() === 'b') {
      setIsThinking(true)
      requestEvaluation(gameRef.current, nextBot.skill, nextBot.delayMs)
    } else {
      evaluationQueueRef.current?.setSkill(nextBot.skill)
    }
  }, [botProfiles, requestEvaluation, logMatch])

  const handleBotParamsChange = useCallback((patch: Partial<BotConfigParams>) => {
    setBotParams(current => {
      const next = { ...current, ...patch }
      activeBotRef.current = new ChessBot(selectedBotProfile, next)
      return next
    })
  }, [selectedBotProfile])

  useEffect(() => {
    if (!codeBackdropOn || !botControlOn) return
    let active = true
    void loadEditableBotProfiles().then(profiles => {
      if (!active) return
      if (profiles) setBotProfiles(profiles)
      setCanSaveBot(!!profiles)
    })
    return () => { active = false }
  }, [codeBackdropOn, botControlOn])

  const handleSaveBot = useCallback(async () => {
    if (savingBot || !canSaveBot) return
    setSavingBot(true)
    try {
      const updatedBot = activeBotRef.current.toUpdatedProfile()
      setBotProfiles(await saveBotProfile(updatedBot))
      toast.success(tr('Configurações de "{name}" salvas no jogo', { name: updatedBot.name }))
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : tr('Falha ao salvar bot.'))
    } finally {
      setSavingBot(false)
    }
  }, [canSaveBot, savingBot])

  useEffect(() => () => {
    if (analysisArrowTimeoutRef.current !== null) window.clearTimeout(analysisArrowTimeoutRef.current)
  }, [])

  const squareEggs = useMemo(() => squareEggTargets(squareEggGroup).map(({ square, kind, comeback }) => {
    const streak = rankedMoveStreakRef.current
    const count = streak.kind === rankedMoveStreakKind(kind, comeback) ? streak.count + 1 : 1
    const eggs = rankedMoveEggsForPosition(rankedMoveEggReward(kind, rankedStreakDoubles(count, comeback) ? 2 : 1), squareEggGroup?.analysis.legalMoves ?? Infinity)
    return { square: square as Square, kind, eggs }
  }).filter(target => target.eggs > 0), [squareEggGroup])

  const displayedAnalysis = moveAnalysis?.fen === game.fen() ? moveAnalysis : liveMoveAnalysis?.fen === game.fen() ? liveMoveAnalysis : null
  const showAnalysisArrows = useCallback((kind: AnalysisArrowKind) => {
    if (matchPowersRef.current.some(p => (p.appliedBy ?? 'w') === 'w') || !displayedAnalysis?.complete || displayedAnalysis.fen !== gameRef.current.fen()) return
    // The Debug top-ten view is a testing aid: it does not count as a Best use or a shown suggestion.
    if (kind !== 'top') {
      matchUsageRef.current[kind]++
      recordReaction(kind === 'best' ? 'seeBest' : 'seeWorst', 'w', gameRef.current.history().length)
    }
    if (analysisArrowTimeoutRef.current !== null) window.clearTimeout(analysisArrowTimeoutRef.current)
    if (awardAnimationsRef.current) void engineRef.current?.playAnalysisWhistle(kind === 'worst' ? 'down' : 'up')
    analysisArrowKindRef.current = kind
    pendingShownSuggestionsRef.current = kind === 'top' ? null : { kind, analysis: displayedAnalysis }
    logMatch({ t: 'view', kind, ply: gameRef.current.history().length, cost: kind === 'top' ? 2 : 1, fen: displayedAnalysis.fen, analysis: analysisLogSummary(displayedAnalysis) })
    setAnalysisArrows(arrowsForAnalysis(displayedAnalysis, kind))
    analysisArrowTimeoutRef.current = window.setTimeout(() => {
      setAnalysisArrows([])
      analysisArrowKindRef.current = null
      pendingShownSuggestionsRef.current = null
      analysisArrowTimeoutRef.current = null
    }, 3000)
    if (squareEggTimeoutRef.current !== null) window.clearTimeout(squareEggTimeoutRef.current)
    squareEggTimeoutRef.current = kind === 'top' ? null : window.setTimeout(clearSquareEggs, 3000 + squareEggsExtraMs())
    if (kind !== 'top') setSquareEggFadeAt(Date.now() + 3000 + EGG_REWARDS.squareEggsHoldSeconds * 1000)
    if (kind === 'top') clearSquareEggs()
  }, [displayedAnalysis, clearSquareEggs, logMatch])

  useEffect(() => {
    const kind = analysisArrowKindRef.current
    if (matchPowersRef.current.some(p => (p.appliedBy ?? 'w') === 'w') || !kind || !displayedAnalysis?.complete || displayedAnalysis.fen !== gameRef.current.fen()) return
    pendingShownSuggestionsRef.current = kind === 'top' ? null : { kind, analysis: displayedAnalysis }
    setAnalysisArrows(arrowsForAnalysis(displayedAnalysis, kind))
  }, [displayedAnalysis])

  useLayoutEffect(() => {
    const shown = pendingShownSuggestionsRef.current
    if (analysisArrows.length && shown?.analysis.fen === gameRef.current.fen()) {
      shownSuggestionsRef.current = rememberMoveSuggestions(shownSuggestionsRef.current, shown)
      squareEggGroupRef.current = shown
      setSquareEggGroup(shown)
    }
  }, [analysisArrows])

  const hideCostHint = () => {
    if (costHintTimerRef.current !== null) window.clearTimeout(costHintTimerRef.current)
    if (costHintHideTimerRef.current !== null) window.clearTimeout(costHintHideTimerRef.current)
    costHintTimerRef.current = null
    costHintHideTimerRef.current = null
    setHoveredCostAction(null)
  }

  const hasEggsForAction = (amount: number) => {
    if (playerEggBalanceRef.current < amount) {
      void engineRef.current?.playBlockedCue()
      animateInsufficientEggs(eggCounterRef.current)
      const shortfall = amount - playerEggBalanceRef.current
      toast.error(shortfall === 1 ? tr('You need 1 more golden egg to use this') : tr('You need {n} more golden eggs to use this', { n: shortfall }))
      return false
    }
    return true
  }

  const spendEggForAction = (button: HTMLButtonElement, amount: number, action: () => void) => {
    hideCostHint()
    if (!hasEggsForAction(amount)) return
    const bounds = (rect: DOMRect) => ({ left: rect.left, top: rect.top, width: rect.width, height: rect.height })
    playerEggBalanceRef.current -= amount
    setVisibleEggs(playerEggBalanceRef.current)
    setEggFlight({
      id: ++rewardSerialRef.current,
      amount,
      direction: 'spend',
      from: eggCounterRef.current ? bounds(eggCounterRef.current.getBoundingClientRect()) : undefined,
      to: bounds(button.getBoundingClientRect()),
    })
    action()
  }

  const targetPower = (square: Square, kind = armedPower) => {
    if (!kind || introPhase !== 3 || !canUseMatchPower(gameRef.current, 'w')) return
    if (hasUsedPowerThisTurn(matchPowersRef.current, kind, gameRef.current, 'w')) {
      setArmedPower(null)
      toast.info(kind === 'freeze' ? tr('Freeze can be used once per turn') : tr('Shield can be used once per turn'))
      return
    }
    if (matchPowersRef.current.some(power => power.kind === kind && power.square === square)) {
      toast.info(tr('This square already has that power'))
      return
    }
    const button = powerButtonRefs.current[kind]
    if (!button) return
    const power = createMatchPower(kind, square, gameRef.current, ++powerSerialRef.current)
    const freezeError = freezeApplicationError(gameRef.current, matchPowersRef.current, power)
    if (freezeError) {
      setArmedPower(null)
      toast.error(freezeError)
      return
    }
    spendEggForAction(button, 3, () => {
      matchUsageRef.current[kind]++
      recordReaction(kind, 'w', gameRef.current.history().length)
      matchPowersRef.current = [...matchPowersRef.current, power]
      logMatch({ t: 'power', by: 'w', kind, square, cost: 3, ply: gameRef.current.history().length, fen: gameRef.current.fen() })
      setMatchPowers(matchPowersRef.current)
      setPoweredChessPowers(gameRef.current, matchPowersRef.current)
      powerTimelineRef.current[gameRef.current.history().length] = {
        game: clonePoweredChess(gameRef.current, matchPowersRef.current), powers: matchPowersRef.current.map(item => ({ ...item })),
      }
      redoTimelineRef.current = []
      redoStackRef.current = []
      setRedoStack([])
      setArmedPower(null)
      const nextGame = clonePoweredChess(gameRef.current, matchPowersRef.current)
      setGame(nextGame)
      requestEvaluation(nextGame)
    })
  }

  const powerTargeting = usePowerTargetingGesture({
    armedPower,
    enabled: introPhase === 3 && canUseMatchPower(game, 'w'),
    boardRef: boardAreaRef,
    onArm: kind => { if (kind) hideCostHint(); setArmedPower(kind) },
    canArm: () => hasEggsForAction(3),
    onBegin: () => { void engineRef.current?.resume() },
    onTarget: targetPower,
    onHover: kind => engineRef.current?.playPowerHover(kind),
  })

  // Temporary testing easter egg: each ten clicks grants ten match eggs.
  const getDebugEggs = useCallback(() => {
    debugEggClicksRef.current += 1
    if (debugEggClicksRef.current < 10) return
    debugEggClicksRef.current = 0
    playerEggBalanceRef.current += 10
    setVisibleEggs(playerEggBalanceRef.current)
    logMatch({ t: 'debugEggs', amount: 10 })
  }, [logMatch])

  const settleCityVictory = useCallback((draw = false) => {
    if (victorySettledRef.current) return
    victorySettledRef.current = true
    flightCleanupsRef.current.forEach(cleanup => cleanup())
    flightCleanupsRef.current.clear()
    setEggFlight(null)

    const opponentEggs = activeBotRef.current.isPureChess ? 0 : opponentEggBalanceRef.current
    const eggs = { w: playerEggBalanceRef.current, b: opponentEggs }
    const winner = draw ? null : 'w'
    const earnedEggs = matchEggPayout(eggs, winner).w
    const shares = matchEggSources(eggs, winner, 'w')
    const sources = [
      { amount: shares.w, element: () => eggCounterRef.current },
      { amount: shares.b, element: () => opponentEggCounterRef.current },
    ]
    setVisibleEggs(eggs.w)
    setVisibleOpponentEggs(eggs.b)
    const collected = historicMatchPointsRef.current
    const result = draw ? settleCityDraw(city.id, earnedEggs, collected) : conquerCity(city.id, earnedEggs, collected)
    logMatch({ t: 'settle', result: draw ? 'draw' : 'win', ply: gameRef.current.history().length, fen: gameRef.current.fen(), toProfile: earnedEggs, historicPoints: collected })
    playerEggBalanceRef.current = 0
    opponentEggBalanceRef.current = 0
    victoryToastRef.current = toast.custom(id => <VictoryBasket result={result} collected={collected} sources={sources} draw={draw}
      onLaunch={(amount, source) => {
        if (source === 0) setVisibleEggs(current => Math.max(0, current - amount))
        else setVisibleOpponentEggs(current => Math.max(0, current - amount))
      }}
      onLand={amount => { if (!document.hidden && amount > 0) engineRef.current?.playEggLanding() }}
      onComplete={() => { setVisibleEggs(0); setVisibleOpponentEggs(0) }}
      onReturn={() => { toast.dismiss(id); onBack() }} />, { duration: Infinity })
  }, [city.id, onBack, logMatch])

  const copyMatchLogText = useCallback(() => copyMatchLog(formatMatchLog({
    version: RELEASE_LABEL,
    mode: 'campaign',
    city: `${city.year} ${city.name}`,
    bot: activeBotRef.current.name,
    exportedAt: new Date().toISOString(),
    ply: gameRef.current.history().length,
    fen: gameRef.current.fen(),
    moves: gameRef.current.history().join(' '),
    eggs: { w: playerEggBalanceRef.current, b: opponentEggBalanceRef.current },
    historicPoints: historicMatchPointsRef.current,
    streak: rankedMoveStreakRef.current,
    botStreak: botRankedMoveStreakRef.current,
    usage: matchUsageRef.current,
    rewards: EGG_REWARDS,
    device: navigator.userAgent,
  }, matchLogRef.current)), [city.name, city.year])

  const forceWin = useCallback(() => {
    setGameStatus(msg("CHECKMATE - White wins!"))
    setIsPlaying(false)
    setHasPlaybackStarted(true)
    deactivatePlaybackWidgets()
    engineRef.current?.playSeatbelt()
    settleCityVictory()
  }, [deactivatePlaybackWidgets, settleCityVictory])

  const showCostHint = (action: 'best' | 'undo' | 'redo' | 'worst' | 'freeze' | 'shield') => {
    if (costHintTimerRef.current !== null) window.clearTimeout(costHintTimerRef.current)
    if (costHintHideTimerRef.current !== null) window.clearTimeout(costHintHideTimerRef.current)
    setHoveredCostAction(null)
    const reveal = () => {
      setHoveredCostAction(action)
      costHintTimerRef.current = null
      costHintHideTimerRef.current = window.setTimeout(() => {
        setHoveredCostAction(current => current === action ? null : current)
        costHintHideTimerRef.current = null
      }, 1500)
    }
    reveal()
  }
  const costHint = (action: 'best' | 'undo' | 'redo' | 'worst' | 'freeze' | 'shield', amount: number) => (
    <GameActionCostHint visible={hoveredCostAction === action} amount={amount} />
  )

  const playControlHoverKick = (volume = 1) => playDrum('bd', (0.52 + Math.random() * 0.16) * volume, 0.92 + Math.random() * 0.16)
  const playClosedAnalysisHat = (volume = 1) => playDrum('ch', (0.648 + Math.random() * 0.048) * volume, 0.96 + Math.random() * 0.08)

  useEffect(() => {
    if (introPhase !== 3 || reportedMatchStartRef.current || gameRef.current.isGameOver()) return
    reportedMatchStartRef.current = true
    matchStartedAtRef.current = Date.now()
    trackMatchStarted({
      game_mode: 'campaign',
      city_name: city.name,
      white_kit_city: city.name,
      black_kit_city: city.name,
    })
  }, [introPhase, city.name])

  useEffect(() => {
    if (introPhase === 3) {
      const isBotTurn = gameRef.current.turn() === 'b'
      const skill = isBotTurn ? activeBotRef.current.skill : undefined
      if (skill !== undefined) setIsThinking(true)
      requestEvaluation(gameRef.current, skill, isBotTurn ? activeBotRef.current.delayMs : undefined)
    }
  }, [introPhase, requestEvaluation, workerEpoch])


  // Report the result and update the status line when the board changes.
  useEffect(() => {
    if (game.isGameOver() && introPhase === 3) {
      const result = game.isCheckmate()
        ? game.turn() === 'w' ? 'black' : 'white'
        : 'draw'
      const resultKey = `${city.id}:${game.fen()}`
      if (reportedMatchResultRef.current !== resultKey) {
        reportedMatchResultRef.current = resultKey
        const opponentEggs = activeBotRef.current.isPureChess ? 0 : opponentEggBalanceRef.current
        const eggs = { w: playerEggBalanceRef.current, b: opponentEggs }
        const savedEggs = matchEggPayout(eggs, result === 'white' ? 'w' : result === 'black' ? 'b' : null).w
        trackMatchCompleted({
          game_mode: 'campaign',
          result,
          result_reason: game.isCheckmate() ? 'checkmate' : 'draw',
          move_count: game.history().length,
          golden_eggs_saved: savedEggs,
          golden_eggs_collected: collectedMatchEggsRef.current,
          freeze_uses: matchUsageRef.current.freeze,
          shield_uses: matchUsageRef.current.shield,
          undo_uses: matchUsageRef.current.undo,
          redo_uses: matchUsageRef.current.redo,
          best_uses: matchUsageRef.current.best,
          worst_uses: matchUsageRef.current.worst,
          ...(matchStartedAtRef.current !== null ? { observed_duration_seconds: Math.max(0, Math.round((Date.now() - matchStartedAtRef.current) / 1000)) } : {}),
          city_name: city.name,
          white_kit_city: city.name,
          black_kit_city: city.name,
        })
      }
    }

    // The same final position reached again (Undo and replay) is one more ending in the log.
    if (!game.isGameOver()) loggedGameOverFenRef.current = null
    else if (loggedGameOverFenRef.current !== game.fen()) {
      loggedGameOverFenRef.current = game.fen()
      logMatch({ t: 'gameOver', result: game.isCheckmate() ? `checkmate by ${game.turn() === 'w' ? 'b' : 'w'}` : 'draw', ply: game.history().length, fen: game.fen() })
    }

    // Update game status
    if (game.isCheckmate()) {
      const winner = game.turn() === "w" ? "Black" : "White"
      setGameStatus(winner === "White" ? msg("CHECKMATE - White wins!") : msg("CHECKMATE - Black wins!"))
      setIsPlaying(false)
      deactivatePlaybackWidgets()
      // If White (Player) won
      if (winner === "White") {
        if (rewardedCheckmateFenRef.current !== game.fen()) {
          playVictoryFanfare()
          rewardedCheckmateFenRef.current = game.fen()
          settleCityVictory()
        }
      } else {
        if (defeatToastRef.current === null) {
          playCheckmate()
          // Against a bot the match eggs stay in play: the player may Mulligan the mate away.
          const canMulligan = playerEggBalanceRef.current >= 2
          defeatToastRef.current = toast.error(tr("CHECKMATE!"), {
            id: 'bot-checkmate',
            duration: Infinity,
            description: canMulligan
              ? tr("Use a Mulligan (2 golden eggs) to keep playing, or return to the lobby.")
              : tr("You need 2 golden eggs to use a Mulligan. Return to the lobby."),
            action: { label: tr("Return to lobby"), onClick: () => { defeatToastRef.current = null; onBack() } },
          })
        }
      }
    } else if (game.isDraw() || game.isStalemate()) {
      setGameStatus(msg("DRAW!"))
      setIsPlaying(false)
      deactivatePlaybackWidgets()
      playDrawKalimba()
      settleCityVictory(true)
    } else if (game.isCheck() && game.turn() === "w") {
      setGameStatus(msg("CHECK!"))
    } else {
      setGameStatus(game.turn() === "w" ? msg("Your move") : msg("Bot thinking..."))
    }
  }, [game, city, deactivatePlaybackWidgets, settleCityVictory, introPhase, onBack, logMatch])

  useEffect(() => {
    if (introPhase !== 3 || panelsFollowPlayerTurn) return

    setMixerOn(true)
    setKnobsOn(true)
    setActiveWidgetOrder(current => [
      ...current.filter(id => id !== "mixer" && id !== "knobs"),
      "mixer",
      "knobs",
    ])
  }, [introPhase, panelsFollowPlayerTurn])

  useEffect(() => {
    if (introPhase !== 3 || !panelsFollowPlayerTurn) return

    if (restoreMusicWidgetsOnNextEffectRef.current) {
      restoreMusicWidgetsOnNextEffectRef.current = false
      return
    }

    if (!musicEngineOn) {
      setMixerOn(false)
      setKnobsOn(false)
      setSpectrogramOn(false)
      setPieceDebugOn(false)
      setActiveWidgetOrder(current => current.filter(id => !['mixer', 'knobs', 'spectrogram', 'pieceDebug'].includes(id)))
      return
    }

    const playerCanEdit = game.turn() === "w" && !game.isGameOver()
    if (!playerCanEdit) {
      setMixerOn(false)
      setKnobsOn(false)
      setActiveWidgetOrder(current => current.filter(id => id !== "mixer" && id !== "knobs"))
      return
    }

    const shouldOpenMixer = !mixerManuallyClosedRef.current
    const shouldOpenPieceParams = !knobsManuallyClosedRef.current
    setMixerOn(shouldOpenMixer)
    setKnobsOn(shouldOpenPieceParams)
    setActiveWidgetOrder(current => {
      const next = current.filter(id => id !== "mixer" && id !== "knobs")
      if (shouldOpenMixer) next.push("mixer")
      if (shouldOpenPieceParams) next.push("knobs")
      return next
    })
  }, [game, introPhase, panelsFollowPlayerTurn, musicEngineOn])

  // Track captured pieces
  const updateCapturedPieces = useCallback((move: Move) => {
    if (move.captured) {
      setCapturedPieces((prev) => {
        if (move.color === "w") {
          return { ...prev, white: [...prev.white, move.captured!] }
        } else {
          return { ...prev, black: [...prev.black, move.captured!] }
        }
      })
    }
  }, [])

  const makeAIMove = useCallback(
    (moveStr: string) => {
      console.log("makeAIMove called with:", moveStr)
      const currentGame = gameRef.current
      
      // Prevent stale moves (e.g. from previous game after reset)
      // If it's White's turn, AI (Black) shouldn't be moving
      if (currentGame.turn() === 'w') {
        console.warn("Ignored AI move because it is White's turn")
        return
      }

      const gameCopy = clonePoweredChess(currentGame, matchPowersRef.current)
      try {
        const from = moveStr.slice(0, 2)
        const to = moveStr.slice(2, 4)
        const promotion = moveStr.length > 4 ? moveStr[4] : undefined

        // Validate move legality to prevent errors
        const legalMoves = gameCopy.moves({ verbose: true })
        const matchingMove = legalMoves.find(m => m.from === from && m.to === to && (promotion ? m.promotion === promotion : true))
        const isLegal = !!matchingMove && permitsPowerMove(matchingMove, matchPowersRef.current, gameCopy.history().length + 1)

        if (!isLegal) {
          console.warn("Ignored illegal AI move:", moveStr)
          return
        }

        const move = gameCopy.move({
          from,
          to,
          promotion,
        })

        if (move) {
          const uci = `${move.from}${move.to}${move.promotion ?? ''}`
          const botAnalysis = currentCompleteAnalysisRef.current?.complete && currentCompleteAnalysisRef.current.fen === move.before
            ? currentCompleteAnalysisRef.current
            : botPrePowerAnalysisRef.current?.complete && botPrePowerAnalysisRef.current.fen === move.before
              ? botPrePowerAnalysisRef.current
              : null
          botPrePowerAnalysisRef.current = null
          let botRewardLog: Record<string, unknown> = {}
          if (activeBotRef.current.isChickenBot && botAnalysis) {
            const rewardDetails = rankedMoveRewardDetails(botAnalysis, move.before, uci, [], 'b')
            const rewardKind = rewardDetails?.kind ?? null
            const rewardKey = `${move.before}|${uci}`
            // A Best move paid as Worst (bad score) stays in the Best streak and is never doubled.
            const comeback = rewardDetails?.comeback ?? false
            const streakKind = rewardKind ? rankedMoveStreakKind(rewardKind, comeback) : null
            const previousStreak = botRankedMoveStreakRef.current
            const streakCount = streakKind ? (previousStreak.kind === streakKind ? previousStreak.count + 1 : 1) : 0
            botRankedMoveStreakRef.current = { kind: streakKind, count: streakCount }
            if (rewardKind) recordReaction(rewardKind === 'best' ? 'playBest' : 'playWorst', 'b', gameCopy.history().length)
            if (rewardKind && !botRewardedMovesRef.current.has(rewardKey)) {
              const streak = rankedStreakDoubles(streakCount, comeback)
              const fullReward = rankedMoveEggsForPosition(rankedMoveEggReward(rewardKind, streak ? 2 : 1), botAnalysis.legalMoves)
              const earnedEggs = cappedMatchEggs(opponentEggBalanceRef.current, fullReward)
              botRewardLog = { x2: streak, eggs: fullReward, earned: earnedEggs }
              // Only a move that actually paid is spent; one blocked by the cap can pay after an Undo.
              if (earnedEggs > 0) botRewardedMovesRef.current.add(rewardKey)
              opponentEggBalanceRef.current += earnedEggs
              setVisibleOpponentEggs(opponentEggBalanceRef.current)
              const id = ++rewardSerialRef.current
              if (earnedEggs > 0) setEggFlight({
                id,
                amount: earnedEggs,
                direction: 'earn',
                owner: 'b',
                sourceSquare: move.to,
              })
              if (awardAnimationsRef.current) void engineRef.current?.playRankedMoveWhistle(rewardKind)
            } else if (rewardKind) botRewardLog = { repeat: true }
            if (rewardKind) botRewardLog = { reward: rewardKind, comeback, streak: `${streakKind}x${streakCount}`, ...botRewardLog }
          }

          // A freshly chosen bot reply replaces any remaining historical redo branch.
          redoStackRef.current = []
          setRedoStack([])
          matchPowersRef.current = advanceMatchPowers(matchPowersRef.current, move, gameCopy, gameCopy.history().length)
          setMatchPowers(matchPowersRef.current)
          setPoweredChessPowers(gameCopy, matchPowersRef.current)
          syncPoweredMoveSan(gameCopy, move)
          powerTimelineRef.current = [
            ...powerTimelineRef.current.slice(0, gameCopy.history().length),
            { game: clonePoweredChess(gameCopy, matchPowersRef.current), powers: matchPowersRef.current.map(power => ({ ...power })) },
          ]
          redoTimelineRef.current = []
          logMatch({
            t: 'move', ply: gameCopy.history().length, by: 'b', san: move.san, uci, fen: move.before, bot: activeBotRef.current.name,
            ...botRewardLog,
            ...(botAnalysis ? { analysis: analysisLogSummary(botAnalysis) } : {}),
          })
          setGame(gameCopy)
          requestEvaluation(gameCopy)
          setMoveHistory((prev) => [...prev, move.san])
          updateCapturedPieces(move)
          // A short touch-device cue only after a real, legal opponent reply.
          if (navigator.maxTouchPoints > 0 && typeof navigator.vibrate === 'function') {
            try { navigator.vibrate(50) } catch { /* Device restrictions must not interrupt the move. */ }
          }

        }
      } catch (e) {
        console.warn("Failed to apply AI move:", moveStr, e)
      }
    },
    [updateCapturedPieces, requestEvaluation, engineRef, logMatch],
  )

  useEffect(() => { aiMoveCallbackRef.current = makeAIMove }, [makeAIMove])

  const handlePlayerMove = useCallback(
    (move: Move) => {
      if (!firstMovePanelsActivatedRef.current) {
        firstMovePanelsActivatedRef.current = true
        setGlobalPanelOn(true)
        setActiveWidgetOrder(current => [...current.filter(id => id !== 'globalPanel'), 'globalPanel'])
      }
      const uci = `${move.from}${move.to}${move.promotion ?? ''}`
      const currentAnalysis = currentCompleteAnalysisRef.current
      // Eggs still drawn on the destination square pay that square's reward to any piece.
      const rewardDetails = squareMoveRewardDetails(squareEggGroupRef.current, move.before, uci)
        ?? rankedMoveRewardDetails(currentAnalysis, move.before, uci, shownSuggestionsRef.current)
      const rewardKind = rewardDetails?.kind ?? null
      const rewardKey = `${move.before}|${uci}`
      const seenMove = rankedMoveKindsRef.current.has(rewardKey)
      // A Best move paid as Worst (bad score) stays in the Best streak and is never doubled.
      const comeback = rewardDetails?.comeback ?? false
      const streakKind = rewardKind ? rankedMoveStreakKind(rewardKind, comeback) : (seenMove ? rankedMoveKindsRef.current.get(rewardKey) ?? null : null)
      rankedMoveKindsRef.current.set(rewardKey, streakKind)
      const previousStreak = rankedMoveStreakRef.current
      const streakCount = streakKind ? (previousStreak.kind === streakKind ? previousStreak.count + 1 : 1) : 0
      rankedMoveStreakRef.current = { kind: streakKind, count: streakCount }
      const squareEggShown = squareEggGroupRef.current
      const rewardLog: Record<string, unknown> = {
        reward: rewardKind,
        ...(streakKind ? { streak: `${streakKind}x${streakCount}` } : {}),
        ...(rewardDetails ? {
          comeback,
          // Where the classification came from: eggs on the square, a suggestion seen, or the current ranking.
          via: 'otherPiece' in rewardDetails ? 'square' : rankedMoveRewardDetails(null, move.before, uci, shownSuggestionsRef.current) ? 'seen' : 'ranking',
          ...('otherPiece' in rewardDetails && rewardDetails.otherPiece ? { otherPiece: rewardDetails.otherPiece } : {}),
        } : {}),
        ...(rewardKind && rewardedMovesRef.current.has(rewardKey) ? { repeat: true } : {}),
        ...(currentAnalysis?.fen === move.before ? { analysis: analysisLogSummary(currentAnalysis) } : {}),
        ...(squareEggShown?.analysis.fen === move.before ? { squareEggs: { kind: squareEggShown.kind, analysis: analysisLogSummary(squareEggShown.analysis) } } : {}),
        ...(shownSuggestionsRef.current.some(entry => entry.analysis.fen === move.before)
          ? { seen: shownSuggestionsRef.current.filter(entry => entry.analysis.fen === move.before).map(entry => ({ kind: entry.kind, analysis: analysisLogSummary(entry.analysis) })) }
          : {}),
      }
      if (rewardKind && !rewardedMovesRef.current.has(rewardKey)) {
        const streak = rankedStreakDoubles(streakCount, comeback)
        // With a single Best/Worst move on offer, the streak's x2 pays at most 3 eggs.
        const rewardLegalMoves = [currentAnalysis, squareEggGroupRef.current?.analysis, ...shownSuggestionsRef.current.map(entry => entry.analysis)]
          .find(analysis => analysis?.complete && analysis.fen === move.before)?.legalMoves ?? Infinity
        const fullReward = rankedMoveEggsForPosition(rankedMoveEggReward(rewardKind, streak ? 2 : 1), rewardLegalMoves)
        const earnedEggs = cappedMatchEggs(playerEggBalanceRef.current, fullReward)
        // Eggs past the full counter (12) do not enter the match balance: they become historic points.
        const overflowEggs = fullReward - earnedEggs
        Object.assign(rewardLog, { x2: streak, legal: rewardLegalMoves, eggs: fullReward, earned: earnedEggs, historic: overflowEggs })
        rewardedMovesRef.current.add(rewardKey)
        const reward = {
          earnedEggs,
          firstNotice: earnedEggs > 0 && markRankedMoveNotice(rewardKind),
        }
        playerEggBalanceRef.current += reward.earnedEggs
        collectedMatchEggsRef.current += reward.earnedEggs
        historicMatchPointsRef.current += overflowEggs
        setVisibleEggs(playerEggBalanceRef.current)
        const id = ++rewardSerialRef.current
        setRankedMoveMark({ square: move.to, kind: rewardKind, id })
        const legalMoveCount = currentAnalysis?.legalMoves ?? 0
        const otherPiece = rewardDetails && 'otherPiece' in rewardDetails ? rewardDetails.otherPiece : null
        const headline = legalMoveCount === 1
          ? randomMessage(SINGLE_LEGAL_MOVE_MESSAGES)
          : otherPiece
            ? randomMessage(otherPiece === 'worst' ? OTHER_PIECE_WORST_MESSAGES : OTHER_PIECE_BEST_MESSAGES)
          : comeback
            ? randomMessage(BEST_MOVES_WITH_WORST_SCORES_MESSAGES)
          : streak
            ? randomMessage(streakCount >= 6
              ? rewardKind === 'best' ? BEST_STREAK_6_PLUS_MESSAGES : WORST_STREAK_6_PLUS_MESSAGES
              : rewardKind === 'best' ? BEST_STREAK_MESSAGES : WORST_STREAK_MESSAGES)
            : randomMessage(rewardKind === 'best' ? BEST_MOVE_MESSAGES : WORST_MOVE_MESSAGES)
        setRankedMoveAnnouncement({ square: move.to, kind: rewardKind, id, headline, earnedEggs: fullReward, streak, comeback })
        setEggFlight({ sourceSquare: move.to, amount: fullReward, overflow: overflowEggs, direction: 'earn', id })
        if (rewardMarkTimerRef.current !== null) window.clearTimeout(rewardMarkTimerRef.current)
        rewardMarkTimerRef.current = window.setTimeout(() => {
          setRankedMoveMark(null)
          rewardMarkTimerRef.current = null
        }, 700)
        if (rewardAnnouncementTimerRef.current !== null) window.clearTimeout(rewardAnnouncementTimerRef.current)
        rewardAnnouncementTimerRef.current = window.setTimeout(() => {
          setRankedMoveAnnouncement(null)
          rewardAnnouncementTimerRef.current = null
        }, 5500)
        if (awardAnimationsRef.current) void engineRef.current?.playRankedMoveWhistle(rewardKind)
        if (reward.firstNotice && reward.earnedEggs > 0) {
          toast.success(rewardKind === 'worst'
            ? tr('You made one of the worst available moves! Here are {n} golden eggs as a reward :)', { n: reward.earnedEggs })
            : reward.earnedEggs === 1
              ? tr('You made one of the best available moves! Here is 1 golden egg as a reward.')
              : tr('You made one of the best available moves! Here are {n} golden eggs as a reward.', { n: reward.earnedEggs }),
            { duration: 6000 })
        }
      }
      if (!rewardKind && currentAnalysis?.complete && currentAnalysis.fen === move.before && currentAnalysis.legalMoves === 1) {
        const id = ++rewardSerialRef.current
        setRankedMoveAnnouncement({ square: move.to, kind: 'neutral', id, headline: randomMessage(SINGLE_LEGAL_MOVE_MESSAGES), earnedEggs: 0, streak: false })
        if (rewardAnnouncementTimerRef.current !== null) window.clearTimeout(rewardAnnouncementTimerRef.current)
        rewardAnnouncementTimerRef.current = window.setTimeout(() => {
          setRankedMoveAnnouncement(null)
          rewardAnnouncementTimerRef.current = null
        }, 2400)
      }
      redoStackRef.current = []
      setRedoStack([]) // Clear redo stack on new move
      
      updateCapturedPieces(move)

      // Auto-start music on first move
      if (!isPlaying) {
        setHasPlaybackStarted(true)
        setIsPlaying(true)
        void resumeAudio()
      }

      // Preserve repetition history when copying the updated game.
      const gameCopy = clonePoweredChess(game, matchPowersRef.current)
      matchPowersRef.current = advanceMatchPowers(matchPowersRef.current, move, gameCopy, gameCopy.history().length)
      setMatchPowers(matchPowersRef.current)
      setPoweredChessPowers(gameCopy, matchPowersRef.current)
      syncPoweredMoveSan(gameCopy, move)
      setMoveHistory((prev) => [...prev, move.san])
      powerTimelineRef.current = [
        ...powerTimelineRef.current.slice(0, gameCopy.history().length),
        { game: clonePoweredChess(gameCopy, matchPowersRef.current), powers: matchPowersRef.current.map(power => ({ ...power })) },
      ]
      redoTimelineRef.current = []
      logMatch({ t: 'move', ply: gameCopy.history().length, by: 'w', san: move.san, uci, fen: move.before, ...rewardLog })
      if (rewardKind) recordReaction(rewardKind === 'best' ? 'playBest' : 'playWorst', 'w', gameCopy.history().length)
      setGame(gameCopy)
      gameRef.current = gameCopy // Ensure ref is updated immediately to prevent race conditions with AI

      if (!gameCopy.isGameOver()) setIsThinking(true)

      requestEvaluation(gameCopy, activeBotRef.current.skill, activeBotRef.current.delayMs)
    },
    [game, updateCapturedPieces, isPlaying, resumeAudio, requestEvaluation, engineRef, logMatch],
  )

  const undoMove = useCallback(() => {
    setMulliganPreviewActive(false)
    const currentHistory = gameRef.current.history()
    if (currentHistory.length === 0) return
    const undoingCheckmate = gameRef.current.isCheckmate()

    // Determine how many steps to undo
    // If AI is thinking (odd moves), undo 1 (player's move) to cancel.
    // If player's turn (even moves), undo 2 (AI + Player) to go back to previous turn.
    const isAiThinking = currentHistory.length % 2 !== 0
    const stepsToUndo = isAiThinking ? 1 : 2
    
    if (currentHistory.length < stepsToUndo) return

    setArmedPower(null)

    const targetPly = currentHistory.length - stepsToUndo
    const removedSnapshots = powerTimelineRef.current.slice(targetPly + 1).reverse()
    const restoredSnapshot = powerTimelineRef.current[targetPly]
    if (!restoredSnapshot) return
    if (undoingCheckmate) dismissDefeatToast()
    matchUsageRef.current.undo++
    setReactionLog(log => [...log.filter(entry => entry.ply <= targetPly), { trigger: 'mulligan' as const, color: 'w' as const, ply: targetPly }].slice(-128))
    redoTimelineRef.current = [...redoTimelineRef.current, ...removedSnapshots]
    powerTimelineRef.current = powerTimelineRef.current.slice(0, targetPly + 1)
    const newGame = clonePoweredChess(restoredSnapshot.game, restoredSnapshot.powers)
    matchPowersRef.current = restoredSnapshot.powers.map(power => ({ ...power }))
    setMatchPowers(matchPowersRef.current)
    const newHistory = newGame.history()
    rankedMoveStreakRef.current = rankedStreakFromHistory(newGame.history({ verbose: true }), rankedMoveKindsRef.current)
    logMatch({
      t: 'undo', fromPly: currentHistory.length, ply: targetPly, fen: newGame.fen(), ...(undoingCheckmate ? { mulligan: true } : {}),
      streak: rankedMoveStreakRef.current.kind ? `${rankedMoveStreakRef.current.kind}x${rankedMoveStreakRef.current.count}` : null,
    })
    setRankedMoveAnnouncement(null)
    if (rewardAnnouncementTimerRef.current !== null) window.clearTimeout(rewardAnnouncementTimerRef.current)
    
    const newCapturedPieces = capturedPiecesFromHistory(newGame.history({ verbose: true }))

    // requestEvaluation cancels any pending opponent result before switching position.
    setIsThinking(false)

    // Save undone moves to stack in reverse order (LIFO for redo)
    const movesToUndo = currentHistory.slice(-stepsToUndo).reverse()
    redoStackRef.current = [...redoStackRef.current, ...movesToUndo]
    setRedoStack(redoStackRef.current)

    setUndoAnimationKey(key => key + 1)
    setGame(newGame)
    setMoveHistory(newHistory)
    setCapturedPieces(newCapturedPieces)
    if (undoingCheckmate && !newGame.isGameOver()) {
      setHasPlaybackStarted(true)
      setIsPlaying(true)
      setGlobalPanelOn(true)
      if (!panelsFollowPlayerTurn) {
        const shouldOpenMixer = !mixerManuallyClosedRef.current
        const shouldOpenPieceParams = !knobsManuallyClosedRef.current
        setMixerOn(shouldOpenMixer)
        setKnobsOn(shouldOpenPieceParams)
        setActiveWidgetOrder(current => {
          const next = current.filter(id => id !== "mixer" && id !== "knobs")
          if (shouldOpenMixer) next.push("mixer")
          if (shouldOpenPieceParams) next.push("knobs")
          return next
        })
      }
      setActiveWidgetOrder(current => [...current.filter(id => id !== 'globalPanel'), 'globalPanel'])
      void resumeAudio()
    }

    // Re-evaluate the reconstructed position with its repetition history.
    console.log("Undo to FEN:", newGame.fen())
    requestEvaluation(newGame)
  }, [dismissDefeatToast, panelsFollowPlayerTurn, requestEvaluation, resumeAudio, logMatch])

  const redoMove = useCallback(() => {
    const pendingRedo = redoStackRef.current
    if (pendingRedo.length === 0) return

    setArmedPower(null)

    const restoredSnapshot = redoTimelineRef.current.at(-1)
    if (!restoredSnapshot) return
    const newRedoStack = pendingRedo.slice(0, -1)
    const gameCopy = clonePoweredChess(restoredSnapshot.game, restoredSnapshot.powers)
    if (gameCopy.history().length === gameRef.current.history().length + 1) {
        matchUsageRef.current.redo++
        redoTimelineRef.current = redoTimelineRef.current.slice(0, -1)
        powerTimelineRef.current.push({ game: clonePoweredChess(gameCopy, restoredSnapshot.powers), powers: restoredSnapshot.powers.map(power => ({ ...power })) })
        matchPowersRef.current = restoredSnapshot.powers.map(power => ({ ...power }))
        setMatchPowers(matchPowersRef.current)
        const nextHistory = gameCopy.history()
        const nextCaptured = capturedPiecesFromHistory(gameCopy.history({ verbose: true }))
        redoStackRef.current = newRedoStack
        setGame(gameCopy)
        setMoveHistory(nextHistory)
        rankedMoveStreakRef.current = rankedStreakFromHistory(gameCopy.history({ verbose: true }), rankedMoveKindsRef.current)
        logMatch({
          t: 'redo', ply: nextHistory.length, san: nextHistory.at(-1), fen: gameCopy.fen(),
          streak: rankedMoveStreakRef.current.kind ? `${rankedMoveStreakRef.current.kind}x${rankedMoveStreakRef.current.count}` : null,
        })
        setRankedMoveAnnouncement(null)
        if (rewardAnnouncementTimerRef.current !== null) window.clearTimeout(rewardAnnouncementTimerRef.current)
        setRedoStack(newRedoStack)
        setCapturedPieces(nextCaptured)
        const isBotTurn = gameCopy.turn() === 'b' && !gameCopy.isGameOver()
        const skill = isBotTurn ? activeBotRef.current.skill : undefined
        if (skill !== undefined) setIsThinking(true)
        requestEvaluation(gameCopy, skill, skill !== undefined ? activeBotRef.current.delayMs : undefined)
    }
  }, [requestEvaluation, logMatch])

  const toggleWidget = useCallback((id: string, setIsOn: React.Dispatch<React.SetStateAction<boolean>>) => {
    setIsOn(prev => {
        const newState = !prev
        setActiveWidgetOrder(currentOrder => {
            if (newState) {
                // Turning ON: Add to end if not present
                return currentOrder.includes(id) ? currentOrder : [...currentOrder, id]
            } else {
                // Turning OFF: Remove
                return currentOrder.filter(widgetId => widgetId !== id)
            }
        })
        return newState
    })
  }, [])

  const togglePlayerTurnPanel = useCallback((
    id: "mixer" | "knobs",
    isOn: boolean,
    setIsOn: React.Dispatch<React.SetStateAction<boolean>>,
    manuallyClosedRef: React.MutableRefObject<boolean>,
  ) => {
    manuallyClosedRef.current = isOn
    toggleWidget(id, setIsOn)
  }, [toggleWidget])

  const togglePieceDebug = useCallback(() => {
    const next = !pieceDebugOn
    if (next && !isMobile && pieceDebugPosition === null) {
      const root = rootRef.current?.getBoundingClientRect()
      const params = knobsRef.current?.getBoundingClientRect()
      if (root && params) {
        const x = params.left - root.left
        const currentY = params.top - root.top
        const height = Math.min(300, root.height * .34)
        const desiredTop = params.bottom - root.top + 12
        const overflow = Math.max(0, desiredTop + height + 12 - root.height)
        const shiftUp = Math.min(overflow, Math.max(0, currentY - 8))
        if (shiftUp > 0) setKnobsPosition(position => ({ x: position?.x ?? x, y: Math.max(8, (position?.y ?? currentY) - shiftUp) }))
        setPieceDebugPosition({ x, y: desiredTop - shiftUp })
      } else {
        setPieceDebugPosition({ x: knobsPosition?.x ?? 0, y: (knobsPosition?.y ?? 0) + (knobsRef.current?.offsetHeight ?? 520) + 12 })
      }
    }
    setPieceDebugOn(next)
    setActiveWidgetOrder(order => next
      ? [...order.filter(id => id !== 'pieceDebug'), 'pieceDebug']
      : order.filter(id => id !== 'pieceDebug'))
  }, [isMobile, knobsPosition, pieceDebugOn, pieceDebugPosition])

  const toggleBotControl = useCallback(() => {
    const next = !botControlOn
    if (next && !isMobile && botControlPosition === null) {
      const root = rootRef.current?.getBoundingClientRect()
      const debugRect = liveCodeRef.current?.getBoundingClientRect()
      if (root && debugRect) {
        const x = Math.max(8, debugRect.left - root.left)
        const desiredTop = Math.min(Math.max(8, root.height - 340), debugRect.bottom - root.top + 12)
        setBotControlPosition({ x, y: desiredTop })
      } else {
        setBotControlPosition({ x: liveCodePosition?.x ?? 24, y: (liveCodePosition?.y ?? 80) + (liveCodeRef.current?.offsetHeight ?? 360) + 12 })
      }
    }
    setBotControlOn(next)
    setActiveWidgetOrder(order => next
      ? [...order.filter(id => id !== 'botControl'), 'botControl']
      : order.filter(id => id !== 'botControl'))
  }, [botControlOn, botControlPosition, isMobile, liveCodePosition])

  const handleTogglePlay = useCallback(async () => {
    if (gameRef.current.isGameOver() || gameStatus === "DRAW!" || gameStatus.startsWith("CHECKMATE")) {
        deactivatePlaybackWidgets()
        aiMoveTimerRef.current?.cancel()
        setIsPlaying(false)
        return
    }
    // Freeze immediately, before awaiting audio, so a near-expired reply cannot slip through.
    aiMoveTimerRef.current?.setPaused(isPlaying)
    if (!isPlaying) {
      playDrum("bd", 0.60)
      // Auto-activate Board Params (Global Control Panel) when play starts
      setHasPlaybackStarted(true)
      setGlobalPanelOn(true)
      setActiveWidgetOrder(prev => [...prev.filter(id => id !== 'globalPanel'), 'globalPanel'])
    } else {
        setGlobalPanelOn(false)
        setActiveWidgetOrder(current => current.filter(id => id !== "globalPanel"))
    }
    await resumeAudio()
    setIsPlaying((prev) => !prev)
  }, [resumeAudio, isPlaying, gameStatus, deactivatePlaybackWidgets, playDrum])

  const handleToggleMusicEngine = useCallback(() => {
    const next = !musicEngineOn
    setMusicEngineOn(next)
    if (!next) {
      musicWidgetsBeforeMuteRef.current = {
        mixer: mixerOn,
        spectrogram: spectrogramOn,
        knobs: knobsOn,
        pieceDebug: pieceDebugOn,
        order: activeWidgetOrder.filter(id => ['mixer', 'spectrogram', 'knobs', 'pieceDebug'].includes(id)),
      }
      setMixerOn(false)
      setSpectrogramOn(false)
      setKnobsOn(false)
      setPieceDebugOn(false)
      setActiveWidgetOrder(order => order.filter(id => !['mixer', 'spectrogram', 'knobs', 'pieceDebug'].includes(id)))
    } else {
      const previous = musicWidgetsBeforeMuteRef.current
      if (!previous) return

      const restoredIds: string[] = []
      if (previous.mixer) restoredIds.push('mixer')
      if (previous.spectrogram) restoredIds.push('spectrogram')
      if (previous.knobs) restoredIds.push('knobs')
      if (previous.pieceDebug) restoredIds.push('pieceDebug')
      const restoredOrder = [
        ...previous.order.filter(id => restoredIds.includes(id)),
        ...restoredIds.filter(id => !previous.order.includes(id)),
      ]
      restoreMusicWidgetsOnNextEffectRef.current = panelsFollowPlayerTurn
      setMixerOn(previous.mixer)
      setSpectrogramOn(previous.spectrogram)
      setKnobsOn(previous.knobs)
      setPieceDebugOn(previous.pieceDebug)
      setActiveWidgetOrder(order => [
        ...order.filter(id => !['mixer', 'spectrogram', 'knobs', 'pieceDebug'].includes(id)),
        ...restoredOrder,
      ])
      musicWidgetsBeforeMuteRef.current = null
    }
  }, [activeWidgetOrder, knobsOn, mixerOn, musicEngineOn, panelsFollowPlayerTurn, pieceDebugOn, spectrogramOn])

  const { pieceConnections, chainConnections, hoverConnections, resizeTick } = useGameWidgetLayout({
    // Connections are hidden on portrait phones; skip measuring them after every move.
    rootRef, boardAreaRef, boardScale, musicEngineOn: musicEngineOn && !isPortraitMobile,
    selectedSquare: music.selected?.square ?? null,
    hoveredPiece: knobsOn && (!music.selected || !paramsOpen) ? songHover : null,
    introPhase, activeWidgetOrder, boardOffset: boardPan.offset,
    widgets: {
      knobs: { ref: knobsRef, on: knobsOn, position: knobsPosition, setPosition: setKnobsPosition },
      pieceDebug: { ref: pieceDebugRef, on: pieceDebugOn, position: pieceDebugPosition, setPosition: setPieceDebugPosition },
      globalPanel: { ref: globalPanelRef, on: globalPanelOn, position: globalPanelPosition, setPosition: setGlobalPanelPosition },
      mixer: { ref: mixerRef, on: mixerOn, position: mixerPosition, setPosition: setMixerPosition },
      spectrogram: spectrogramMode === 'widget' ? { ref: spectrogramHandleRef, on: spectrogramOn, position: spectrogramPosition, setPosition: setSpectrogramPosition } : undefined,
      liveCode: { ref: liveCodeRef, on: liveCodeOn, position: liveCodePosition, setPosition: setLiveCodePosition },
      botControl: { ref: botControlRef, on: botControlOn && codeBackdropOn, position: botControlPosition, setPosition: setBotControlPosition },
    },
  })
  const thermometerDimmed = (hasPlaybackStarted && !isPlaying)
    || game.isGameOver()
    || gameStatus === "DRAW!"
    || gameStatus.startsWith("CHECKMATE")
  const statusText = armedPower ? msg('Choose a square') : gameStatus
  const statusAlert = gameStatus.includes("CHECK") || gameStatus.includes("MATE")
  const statusColor = statusAlert ? "#ef4444" : city.color
  const statusPlacement = !armedPower && gameStatus === "Bot thinking..." ? "top" : "bottom"

  const handleWidgetHeaderClick = useCallback((id: string) => {
    setActiveWidgetOrder(prev => {
        const filtered = prev.filter(wId => wId !== id)
        return [...filtered, id]
    })
  }, [])

  const markWidgetToggleLayerReady = useCallback(() => setWidgetTogglesReady(true), [])
  const widgetToggleItems = useMemo(() => [
    ...(spectrogramMode === 'widget' ? [{ id: 'spectrogram', label: msg('Spectrogram'), ref: spectrogramToggleRef, isOn: spectrogramOn, cityColor: city.color, onToggle: () => toggleWidget('spectrogram', setSpectrogramOn), position: spectrogramPosition ?? { x: 0, y: 0 }, onPositionChange: setSpectrogramPosition, onDragStart: () => handleWidgetHeaderClick('spectrogram') }] : []),
    { id: 'knobs', label: msg('Piece Params'), ref: knobsToggleRef, isOn: knobsOn, cityColor: city.color, onToggle: () => togglePlayerTurnPanel('knobs', knobsOn, setKnobsOn, knobsManuallyClosedRef), position: knobsPosition ?? { x: 0, y: 0 }, onPositionChange: setKnobsPosition, onDragStart: () => handleWidgetHeaderClick('knobs') },
    { id: 'pieceDebug', label: msg('Piece Debug'), ref: pieceDebugToggleRef, isOn: pieceDebugOn, cityColor: city.color, onToggle: () => toggleWidget('pieceDebug', setPieceDebugOn), position: pieceDebugPosition ?? { x: 0, y: 0 }, onPositionChange: setPieceDebugPosition, onDragStart: () => handleWidgetHeaderClick('pieceDebug') },
    { id: 'globalPanel', label: msg('Board Params'), ref: globalPanelToggleRef, isOn: globalPanelOn, cityColor: city.color, onToggle: () => toggleWidget('globalPanel', setGlobalPanelOn), position: globalPanelPosition ?? { x: 0, y: 0 }, onPositionChange: setGlobalPanelPosition, onDragStart: () => handleWidgetHeaderClick('globalPanel') },
    { id: 'mixer', label: 'Mixer', ref: mixerToggleRef, isOn: mixerOn, cityColor: city.color, onToggle: () => togglePlayerTurnPanel('mixer', mixerOn, setMixerOn, mixerManuallyClosedRef), position: mixerPosition ?? { x: 0, y: 0 }, onPositionChange: setMixerPosition, onDragStart: () => handleWidgetHeaderClick('mixer') },
    { id: 'liveCode', label: msg('Debug'), ref: liveCodeToggleRef, isOn: liveCodeOn, cityColor: city.color, onToggle: () => toggleWidget('liveCode', setLiveCodeOn), position: liveCodePosition ?? { x: 0, y: 0 }, onPositionChange: setLiveCodePosition, onDragStart: () => handleWidgetHeaderClick('liveCode') },
    { id: 'botControl', label: msg('Bot Control'), ref: botControlToggleRef, isOn: botControlOn && codeBackdropOn, cityColor: city.color, onToggle: toggleBotControl, position: botControlPosition ?? { x: 0, y: 0 }, onPositionChange: setBotControlPosition, onDragStart: () => handleWidgetHeaderClick('botControl') },
  ], [botControlOn, botControlPosition, city.color, codeBackdropOn, globalPanelOn, globalPanelPosition, handleWidgetHeaderClick, knobsOn, knobsPosition, pieceDebugOn, pieceDebugPosition, liveCodePosition, liveCodeOn, mixerOn, mixerPosition, spectrogramMode, spectrogramOn, spectrogramPosition, resizeTick, toggleBotControl, togglePlayerTurnPanel, toggleWidget])

  // The on/off dot of the Song & Instruments list and of Piece Params.
  const toggleSongPiece = (square: Square) => {
    const turnedOn = music.togglePiece(square, false)
    if (turnedOn && !isPlaying && music.engineActive) {
      setHasPlaybackStarted(true)
      setIsPlaying(true)
      void resumeAudio()
    }
  }
  const soloSongPiece = (id: string) => {
    const turnedOn = music.toggleSolo(id, false)
    if (turnedOn && !isPlaying && music.engineActive) {
      setHasPlaybackStarted(true)
      setIsPlaying(true)
      void resumeAudio()
    }
  }
  const widgetsContent = (mobileMode: boolean) => {
      const commonStyle = mobileMode ? { position: 'static' as const, width: '100%', zIndex: 10 } : undefined
      const togglePortalized = !mobileMode && widgetTogglesReady
      return (
          <>
            {spectrogramMode === 'widget' && <SpectrogramWidget
                topColor={boardOrientation === "white" ? "b" : "w"}
                getTeamFrequencyData={music.engineActive ? music.getTeamFrequencyData : undefined}
                getFrequencyData={music.engineActive ? music.getFrequencyData : undefined}
                ref={spectrogramHandleRef}
                toggleRef={spectrogramToggleRef}
                togglePortalized={togglePortalized}
                isOn={spectrogramOn}
                onToggle={() => toggleWidget('spectrogram', setSpectrogramOn)}
                isPlaying={music.engineActive && (isPlaying || !!music.preview)}
                cityColor={city.color}
                position={mobileMode ? undefined : (spectrogramPosition || undefined)}
                onPositionChange={(pos) => setSpectrogramPosition(pos)}
                style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('spectrogram') + 10 }}
                onClickCapture={() => handleWidgetHeaderClick('spectrogram')}
            />}

            <SynthControlPanel
                duckSources={duckSourceOptions(music.snapshot.pieces, music.snapshot.instruments, music.selected)}
                instrument={music.instrument}
                selectedPiece={music.selected}
                onInstrumentChange={music.updateInstrument}
                onDeselect={() => { setParamsOpen(false); music.select(null) }}
                showSong={!paramsOpen}
                songMidi={{ on: songMidiOn, onToggle: () => setSongMidiOn(on => !on) }}
                playback={knobsOn && music.selected ? <>
                  {music.selected.activation === 'check' && <p className="text-[10px] text-amber-200">{t("Ativa temporariamente pelo cheque da sua equipe.")}</p>}
                  <MusicVoiceReadout variationTabs showStatus={false} loopOn={music.activeIds.has(music.selected.id)} onLoopToggle={() => { if (music.selected) toggleSongPiece(music.selected.square) }} soloOn={music.soloIds.has(music.selected.id)} onSoloToggle={() => { if (music.selected) soloSongPiece(music.selected.id) }} instrument={music.instrument ?? undefined} onInstrumentChange={music.updateInstrument} monitor={music.monitor} id={music.selected.id} snapshot={music.snapshot} manual={music.preview?.id === music.selected.id && music.preview.mode === 'manual'} knobUpdateMode="on-release" />
                </> : undefined}
                arrangement={music.kit?.arrangement}
                selectedSectionId={paramsSectionId}
                sections={music.kit ? <MusicSongSections arrangement={music.kit.arrangement} harmony={music.kit.harmony} monitor={music.monitor} onChange={music.updateArrangement} onSeek={music.seekSection} selectedSectionId={paramsSectionId} onSelectSection={setParamsSectionId} /> : undefined}
                song={music.kit ? <MusicSongPanel
                  pieces={music.snapshot.pieces}
                  names={Object.fromEntries(music.snapshot.pieces.map(piece => [piece.id, music.snapshot.instruments?.[piece.id]?.name]))}
                  activeIds={music.activeIds}
                  soloIds={music.soloIds}
                  monitor={music.monitor}
                  arrangement={music.kit.arrangement}
                  harmony={music.kit.harmony}
                  onArrangementChange={music.updateArrangement}
                  onSeek={music.seekSection}
                  selectedSectionId={paramsSectionId}
                  onSelectSection={setParamsSectionId}
                  onSelect={square => music.select(square)}
                  onOpenParams={square => { setSongHover(null); music.select(square); setParamsOpen(true) }}
                  snapshot={music.snapshot}
                  selectedId={music.selected?.id ?? null}
                  selectedView={knobsOn && music.selected ? <MusicVoiceReadout variationTabs showStatus={false} instrument={music.instrument ?? undefined} onInstrumentChange={music.updateInstrument} monitor={music.monitor} id={music.selected.id} snapshot={music.snapshot} manual={music.preview?.id === music.selected.id && music.preview.mode === 'manual'} knobUpdateMode="on-release" /> : undefined}
                  showMidi={songMidiOn}
                  onToggle={toggleSongPiece}
                  ownColor="w"
                  onAudition={music.tapAudition}
                  onSolo={soloSongPiece}
                  onHover={setSongHover}
                /> : undefined}
                ref={knobsRef}
                toggleRef={knobsToggleRef}
                togglePortalized={togglePortalized}
                monitor={knobsOn ? music.monitor : undefined}
                monitorId={knobsOn ? music.selected?.id : undefined}
                selectedSquare={music.selected?.square ?? null}
                selectedStatus={music.selected ? <MusicVoiceBadge monitor={music.monitor} id={music.selected.id} /> : undefined}
                selectedPieceInfo={music.instrument?.name ?? null}
                pieceSvg={music.selected ? PiecesSVG[`${music.selected.color}${music.selected.type.toUpperCase()}` as keyof typeof PiecesSVG] : null}
                effects={music.selected ? music.baseEffects[music.selected.id] ?? { ...DEFAULT_EFFECTS, lpf: music.instrument?.lpf, hpf: music.instrument?.hpf, reverb: 0.12, decay: 0.15 } : DEFAULT_EFFECTS}
                onEffectChange={(key, value) => {
                    if (!music.selected) return
                    music.setPieceEffect(key, value)
                }}
                cityColor={city.color}
                position={mobileMode ? undefined : (knobsPosition ?? { x: 0, y: 0 })}
                onPositionChange={setKnobsPosition}
                handleRef={knobsHandleRef}
                isOn={knobsOn}
                onToggle={() => togglePlayerTurnPanel("knobs", knobsOn, setKnobsOn, knobsManuallyClosedRef)}
                onClick={(e) => { e.stopPropagation(); handleWidgetHeaderClick('knobs') }}
                onMouseDown={(e) => e.stopPropagation()}
                style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('knobs') + 10 }}
            />

            {pieceDebugOn && <PieceDebugWidget
              ref={pieceDebugRef}
              toggleRef={pieceDebugToggleRef}
              handleRef={pieceDebugHandleRef}
              togglePortalized={togglePortalized}
              isStatic={mobileMode}
              selectedSquare={music.selected?.square ?? null}
              instrument={music.instrument ?? null}
              selectedPiece={music.selected ?? null}
              movementMapping={music.selected ? music.snapshot.mappings?.[music.selected.id] : undefined}
              arrangement={music.snapshot.arrangement}
              sectionOverride={music.selected ? music.snapshot.sectionOverrides?.[music.selected.id] : undefined}
              cityColor={city.color}
              position={mobileMode ? undefined : pieceDebugPosition ?? { x: knobsPosition?.x ?? 0, y: (knobsPosition?.y ?? 0) + (knobsRef.current?.offsetHeight ?? 520) + 12 }}
              onPositionChange={setPieceDebugPosition}
              onToggle={() => toggleWidget('pieceDebug', setPieceDebugOn)}
              className={mobileMode ? 'w-full' : undefined}
              style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('pieceDebug') + 10 }}
              onClickCapture={() => handleWidgetHeaderClick('pieceDebug')}
            />}

            <MixerWidget
              teamMixes={music.teamMixes}
              sessionId={city.id}
              effects={{ ...globalEffects, bpm: music.snapshot.bpm, volume: music.snapshot.volume }}
              monitor={music.monitor}
                onEffectChange={handleGlobalEffectChange}
                topColor={boardOrientation === "white" ? "b" : "w"}
                onTeamMixChange={music.updateTeamMix}
                evalScore={lastEvalScore}
                evalMate={lastEvalMate}
                turn={game.turn()}
                ref={mixerRef}
                handleRef={mixerHandleRef}
                toggleRef={mixerToggleRef}
                togglePortalized={togglePortalized}
                cityColor={city.color}
                position={mobileMode ? undefined : (mixerPosition || undefined)}
                onPositionChange={setMixerPosition}
                isOn={mixerOn}
                onToggle={() => togglePlayerTurnPanel("mixer", mixerOn, setMixerOn, mixerManuallyClosedRef)}
                crossfaderSync={crossfaderSync}
                isPlaying={music.engineActive && (isPlaying || !!music.preview)}
                onTogglePlay={handleTogglePlay}
                spectrogramMode={spectrogramMode}
                getTeamFrequencyData={music.engineActive ? music.getTeamFrequencyData : undefined}
                getFrequencyData={music.engineActive ? music.getFrequencyData : undefined}
                style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('mixer') + 10 }}
                onClickCapture={() => handleWidgetHeaderClick('mixer')}
            />

            {codeBackdropOn && <LiveCodeWidget
                stockfishDebugOn={stockfishDebugOn}
                onToggleStockfishDebug={toggleStockfishDebug}
                pieceDebugOn={pieceDebugOn}
                onTogglePieceDebug={togglePieceDebug}
                botControlOn={botControlOn}
                onToggleBotControl={toggleBotControl}
                onForceWin={isAdmin ? forceWin : undefined}
                onGetEggs={getDebugEggs}
                onShowTopMoves={button => {
                  if (matchPowersRef.current.some(p => (p.appliedBy ?? 'w') === 'w')) return
                  spendEggForAction(button, 2, () => showAnalysisArrows("top"))
                }}
                topMovesDisabled={introPhase !== 3 || playerHasActivePower || !displayedAnalysis?.complete || !!evaluationError || analysisArrows.length > 0}
                codeVisible={codeTextOn}
                onToggleCodeVisible={() => setCodeTextOn(on => !on)}
                playback={liveCodeOn && music.engineActive ? <>
                  <div role="status">{music.error ? <span className="text-red-400">{t("Áudio: {error}", { error: music.error })}</span> : music.preview ? <span className="text-orange-300">{t("TOCANDO")} · {music.instrument?.name} · {music.preview.square}</span> : <span className="text-white/60">{t("{n} vozes ativas", { n: music.activeSquares.size })}</span>}</div>
                  {music.attackingColor && <div className="text-amber-200">{t("CHEQUE · lado atacante {side}", { side: t(music.attackingColor === 'w' ? 'branca' : 'preta') })}</div>}
                  {music.reactionDescriptions.map((description, i) => <div key={i}>{description}</div>)}
                  <MusicTransportReadout monitor={music.monitor} />
                  <MusicHarmonyReadout monitor={music.monitor} />
                  <MoveAnalysisReadout analysis={displayedAnalysis} status={evaluationError ?? (game.isGameOver() ? msg("Partida encerrada.") : undefined)} />
                </> : undefined}
                ref={liveCodeRef}
                toggleRef={liveCodeToggleRef}
                togglePortalized={togglePortalized}
                handleRef={liveCodeHandleRef}
                pattern={music.code}
                city={city}
                cityColor={city.color}
                isPlaying={music.engineActive && isPlaying}
                position={mobileMode ? undefined : (liveCodePosition || undefined)}
                onPositionChange={(pos) => setLiveCodePosition(pos)}
                isOn={liveCodeOn}
                onToggle={() => toggleWidget('liveCode', setLiveCodeOn)}
                style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('liveCode') + 10 }}
                onClickCapture={() => handleWidgetHeaderClick('liveCode')}
            />}

            {codeBackdropOn && botControlOn && <BotControlWidget
              ref={botControlRef}
              toggleRef={botControlToggleRef}
              handleRef={botControlHandleRef}
              togglePortalized={togglePortalized}
              isStatic={mobileMode}
              bot={selectedBotProfile}
              params={botParams}
              onParamsChange={handleBotParamsChange}
              canSaveBot={canSaveBot}
              savingBot={savingBot}
              onSaveBot={handleSaveBot}
              cityColor={city.color}
              position={mobileMode ? undefined : botControlPosition ?? { x: liveCodePosition?.x ?? 24, y: (liveCodePosition?.y ?? 80) + (liveCodeRef.current?.offsetHeight ?? 360) + 12 }}
              onPositionChange={setBotControlPosition}
              onToggle={toggleBotControl}
              className={mobileMode ? 'w-full' : undefined}
              style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('botControl') + 10 }}
              onClickCapture={() => handleWidgetHeaderClick('botControl')}
            />}
          </>
      )
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full h-[100dvh] max-h-[100dvh] max-w-[100vw] bg-background select-none flex flex-col", isMobile ? "overflow-x-hidden overflow-y-auto [scrollbar-width:none]" : "overflow-hidden")}
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, ${city.color}08 0%, transparent 40%),
          radial-gradient(circle at 80% 80%, ${city.color}05 0%, transparent 40%)
        `,
      }}
    >
      <style jsx>{`
        @keyframes border-blink {
            0%, 100% { border-color: rgba(255, 255, 255, 0.2); }
            50% { border-color: white; }
        }
        .animate-border-blink {
            animation: border-blink 0.2s ease-in-out;
        }
        .mask-fade-left {
            mask-image: linear-gradient(to right, transparent, black 20%);
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        @keyframes slide-in {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
            animation: slide-in 0.3s ease-out;
        }
      `}</style>
      <GameWidgetEntranceStyles />
      <GameCityBackground city={city} isBackgroundDark={isBackgroundDark} introPhase={introPhase} />

      {codeBackdropOn && codeTextOn && introPhase === 3 && (
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden opacity-75" aria-hidden="true">
          <pre className="h-full w-full overflow-hidden whitespace-pre-wrap break-all px-6 pb-6 pt-14 font-mono text-[10px] leading-4 text-[#78ff93] [text-shadow:0_0_6px_rgba(57,255,20,0.55)]">
            {music.code}
          </pre>
        </div>
      )}

      {/* Intro Overlay */}
      {introPhase < 3 && (
          <div className={cn(
              "absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-all duration-[3000ms]",
              introPhase === 0 ? "bg-background" : introPhase === 1 ? "bg-transparent" : "bg-transparent pointer-events-none"
          )} onClick={() => {
              if (introPhase === 0) skipIntro()
              if (introPhase === 1) handleStartGame()
          }}>
              {/* Pointer Events Wrapper for Interactive Elements */}
              <div className={cn("contents", introPhase < 2 ? "pointer-events-auto" : "pointer-events-none")}>
              
              {/* Intro Phase 0: Text Lines */}
              {introPhase === 0 && (
                  <div className="flex flex-col gap-4 text-center px-6 w-full max-w-2xl items-center justify-center h-full">
                      <div className="flex flex-col gap-4">
                      {city.introPhrases?.slice(0, -1).map((phrase, i) => (
                          <p 
                            key={i} 
                            className={cn(
                                "text-2xl md:text-4xl font-light tracking-wide transition-all duration-[1500ms]",
                                i <= currentIntroLine ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                            )}
                            style={{ 
                                color: "white",
                                textShadow: "none"
                            }}
                          >
                              {t(phrase)}
                          </p>
                      ))}
                      </div>
                      
                      <div className={cn(
                            "mt-12 transition-all duration-1000 hover:opacity-100",
                            showIntroButton ? "opacity-100" : "opacity-0"
                        )}>
                            <Button
                                  variant="outline"
                                  size="lg"
                                  className={cn(
                                    "continue-btn border-white/20 hover:bg-white/10 text-xl px-12 py-6 tracking-widest uppercase hover:scale-105 transition-all duration-300 cursor-pointer group",
                                    showIntroButton ? "animate-border-blink" : ""
                                  )}
                                  onClick={(e) => {
                                      e.stopPropagation()
                                      handleContinue()
                                  }}
                              onMouseEnter={() => playSquareSample('e4')}
                              style={{
                                  "--city-neon": city.color,
                                  color: city.color
                              } as React.CSSProperties}
                          >
                              <span className="group-hover:text-[var(--city-neon)] transition-colors duration-300 group-hover:drop-shadow-[0_0_8px_var(--city-neon)]">
                                {t(city.introPhrases?.[city.introPhrases.length - 1] || "CONTINUE")}
                              </span>
                          </Button>
                      </div>
                  </div>
              )}

              {/* Intro Phase 1 & 2: City title before the board enters */}
              {(introPhase === 1 || introPhase === 2) && (
                  <GameCityTitleIntro city={city} showIntroBoxes={showIntroBoxes} showIntroGlow={showIntroGlow} introExitStarted={introExitStarted} onTitleTransitionEnd={event => {
                    if (introExitStarted && event.propertyName === 'text-shadow') setShowIntroBoxes(false)
                  }} />
              )}
          </div>
          </div>
      )}

      {/* Header */}
      <header
        className={cn(
          "top-0 left-0 w-full flex flex-col border-b border-transparent bg-transparent transition-opacity duration-1000 pointer-events-none",
          introPhase < 3 ? "z-[110] opacity-100" : "z-[130] opacity-100",
          isMobile ? "relative shrink-0" : "absolute"
        )}
        style={{ "--city-neon": city.color } as React.CSSProperties}
      >
        <div className="w-full grid grid-cols-[auto_1fr] md:flex md:flex-wrap items-center md:justify-between gap-x-3 gap-y-1.5 px-4 md:px-6 py-2.5 md:py-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            aria-label={t("Voltar ao mapa")}
            title={t("Voltar ao mapa")}
            className={cn(
              "col-start-1 row-start-1 md:col-auto md:row-auto shrink-0 pointer-events-auto text-[var(--city-neon)] hover:text-white hover:bg-[var(--city-neon)] hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-black/70 active:text-[var(--city-neon)] active:border-[var(--city-neon)] focus-visible:text-[var(--city-neon)] transition-all",
              introPhase < 3 && "relative z-[111]"
            )}
          >
            <GlobeGridIcon maskId="campaign" />
          </Button>

          <div
            className={cn(
              "col-span-2 row-start-2 md:col-auto md:row-auto flex min-w-0 flex-wrap items-center gap-x-2 md:gap-x-3 gap-y-1 text-[11px] font-semibold leading-none tracking-[0.025em] sm:text-xs md:text-sm pointer-events-auto transition-opacity duration-500",
              introPhase < 3 ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
            style={{ color: city.color, fontFamily: '"Bitcount Prop Single", sans-serif', fontVariantNumeric: 'tabular-nums' }}
          >
            <h1 aria-label={`${city.year} ${city.name.toUpperCase()}`} className="max-w-full">
              {city.year} {city.name.toUpperCase()}
            </h1>
            {music.tonality && music.baseTonality && music.harmony ? <BoardMusicSelectors cityColor={city.color} tonality={music.tonality} baseTonality={music.baseTonality} currentScaleLabel={music.currentScaleLabel} onTonalityChange={music.setTonality} harmony={music.harmony} onHarmonyChange={music.setHarmony} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} /> : null}
          </div>

          <div className="col-start-2 row-start-1 justify-self-end md:col-auto md:row-auto md:ml-auto flex shrink-0 items-center gap-2 md:gap-3 pointer-events-auto">

            <div className={cn("flex items-center gap-2 md:gap-3 transition-opacity duration-500", introPhase < 3 ? "opacity-0 pointer-events-none" : "opacity-100")}>
              {/* Settings */}
              <DropdownMenu open={openDropdown === "difficulty"} onOpenChange={open => setOpenDropdown(current => open ? "difficulty" : current === "difficulty" ? null : current)}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t("Bot level")}
                    title={t("Bot level")}
                    className="hidden md:flex min-w-16 justify-center bg-transparent transition-all border-border hover:border-[var(--hover-color)] hover:shadow-[0_0_10px_var(--hover-color)] hover:text-white active:bg-black/70 active:border-[var(--hover-color)] active:text-[var(--hover-color)] focus-visible:border-[var(--hover-color)] focus-visible:text-[var(--hover-color)]"
                    style={{
                        "--hover-color": city.color
                    } as React.CSSProperties}
                  >
                    <span className="px-1 text-xs font-mono">{t(activeBot.name)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="z-[135]"
                  align="end"
                  style={{ "--difficulty-hover": `color-mix(in srgb, ${city.color} 50%, black)` } as React.CSSProperties}
                >
                  <DropdownMenuLabel>{t("Bot level:")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {botProfiles.map(bot => {
                    const selected = bot.id === activeBot.id
                    return (
                      <DropdownMenuItem
                        key={bot.id}
                        onClick={() => handleBotLevelChange(bot.id)}
                        style={selected ? { backgroundColor: city.color, color: "#000" } : undefined}
                        className={cn(
                          "justify-between text-white hover:bg-[var(--difficulty-hover)] focus:bg-[var(--difficulty-hover)] data-[highlighted]:bg-[var(--difficulty-hover)]",
                          selected && "font-bold",
                        )}
                      >
                        {t(bot.name)}
                        {selected && <Check className="w-4 h-4 ml-2" />}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Audio toggle */}
              <div className="flex gap-3">

                <MatchViewControls
                  codeOn={codeBackdropOn}
                  onToggleCode={toggleCodeBackdrop}
                  musicOn={musicEngineOn}
                  onToggleMusic={handleToggleMusicEngine}
                  preferences={<GamePreferences display={powerDisplay} onDisplayChange={value => { powerTargeting.cancel(); setPowerDisplay(value) }} chancePosition={chancePosition} onChancePositionChange={setChancePosition} spectrogramMode={spectrogramMode} onSpectrogramModeChange={setSpectrogramMode} crossfaderSync={crossfaderSync} onCrossfaderSyncChange={setCrossfaderSync} awardAnimations={awardAnimations} onAwardAnimationsChange={setAwardAnimations} onCopyMatchLog={copyMatchLogText} className={MATCH_HEADER_BUTTON_CLASS} />}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={cn("relative z-10 w-full flex flex-col lg:block justify-start pointer-events-none", isMobile ? "shrink-0 min-h-full pb-16 pt-4" : "h-full pt-4 lg:pt-0")}
        style={{
          "--game-board-width": boardResize.width !== null ? `${boardResize.width}px` : isMobile ? "min(calc(100vw - 16px),512px)" : powerDisplay === "cards" ? "min(90vw,calc(100dvh - 350px),512px)" : "min(90vw,calc(100dvh - 270px),512px)",
          // The cards keep their own size: resizing the board never resizes them.
          "--power-cards-width": cardsResize.width !== null ? `${cardsResize.width}px` : isMobile ? "min(calc(100vw - 16px),512px)" : "min(90vw,calc(100dvh - 350px),512px)",
        } as React.CSSProperties}>
        
        {/* Main Game Area (Board Container) stays in place while its squares fade in. */}
        <div 
            className={cn(
            "flex flex-col items-center justify-start w-full mx-auto relative z-10 px-2 pointer-events-none lg:pt-6"
            )}
            style={{
                marginTop: !isMobile ? 'max(90px, calc(50vh - 350px))' : '0px'
            }}
        >
          <div
            className="w-full max-w-full flex flex-col items-center relative pointer-events-none"
            ref={centerContainerRef}
          >

            <div className="relative min-h-[2rem] h-8 w-[var(--game-board-width)] pointer-events-none mb-2 sm:mb-3 flex items-center justify-between gap-1.5" style={{ translate: boardPan.translate }}>
              {statusPlacement === "top" && <MatchStatus placement="top" text={statusText} color={statusColor} pulse={statusAlert} className={cn("transition-opacity duration-1000", introPhase < 3 ? "opacity-0" : "opacity-100")} />}
              <EggCounter
                ref={opponentEggCounterRef}
                tone="opponent"
                value={visibleOpponentEggs}
                widthFor={[visibleEggs, visibleOpponentEggs]}
                role={activeBot.isPureChess ? undefined : "img"}
                aria-hidden={activeBot.isPureChess ? "true" : undefined}
                aria-label={activeBot.isPureChess ? undefined : visibleOpponentEggs === 1 ? t("1 golden egg for the opponent") : t("{n} golden eggs for the opponent", { n: visibleOpponentEggs })}
                className={cn(
                  "transition-opacity duration-1000",
                  activeBot.isPureChess && "invisible pointer-events-none",
                  introPhase < 3 ? "opacity-0" : "opacity-100",
                )}
              />

              <CapturedPieces pieces={capturedPieces.black} color="w" align="center" justify="end" {...capturedScale.opponent} />
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-20 pointer-events-none">
              {/* Board Area - Moved to Top */}
              <div
                className="w-[var(--game-board-width)] aspect-square relative z-20 mb-2 sm:mb-3 pointer-events-auto"
                ref={boardAreaRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    transform: `scale(${boardScale})`,
                    translate: boardPan.translate,
                    transition: 'transform 0.3s ease-out',
                    visibility: introPhase < 2 ? 'hidden' : 'visible',
                }}
              >
                  {chancePosition === "board" && (
                    <GameBoardChanceBar
                      visible={introPhase >= 3}
                      score={lastEvalScore}
                      mate={lastEvalMate}
                      evaluationError={evaluationError}
                      evaluating={isEvaluating}
                      dimmed={thermometerDimmed}
                      orientation={boardOrientation}
                    />
                  )}
                  <BoardResizeHandles enabled={boardResize.enabled && introPhase >= 3} onStart={boardResize.startResize} onResizeBy={boardResize.resizeBy} onCancel={boardResize.cancelResize} />
                  <ChessgroundBoard 
                  game={game} 
                  entranceActive={introPhase === 2}
                  undoAnimationKey={undoAnimationKey}
                  mulliganPreviewMoves={mulliganPreviewMoves}
                  orientation={boardOrientation}
                  onMove={handlePlayerMove} 
                  armedPower={armedPower}
                  onPowerTarget={targetPower}
                  matchPowers={matchPowers}
                  onFrozenCaptureBlocked={() => toast(tr('Não é possível capturar uma peça congelada.'), { id: 'frozen-capture-blocked', duration: 3000 })}
                  onShieldCaptureBlocked={reason => toast(shieldCaptureBlockMessage(reason), { id: 'shield-capture-blocked', duration: 3000 })}
                  onKingExposed={() => toast(tr('Você não pode deixar seu rei sob ataque.'), { id: 'king-exposed', duration: 3000 })}
                  isMoveAllowed={move => permitsPowerMove(move, matchPowersRef.current, game.history().length + 1)}
                  cityColor={city.color} 
                  isThinking={isThinking} 
                  synthSelectedSquare={music.selected?.square ?? null}
                  musicEffectsEnabled={musicEngineOn}
                  activeSquares={music.activeSquares}
                  teamMixes={music.teamMixes}
                  onPieceHold={music.engineActive ? music.audition : undefined}
                  onPieceRelease={music.engineActive ? music.releaseAudition : undefined}
                  onPieceCancel={music.engineActive ? music.endAudition : undefined}
                  musicPulseMonitor={music.engineActive ? music.pulseMonitor : undefined}
                  analysisArrows={analysisArrows}
                  squareEggs={squareEggs}
                  squareEggsFadeAt={squareEggFadeAt}
                  rankedMoveMark={rankedMoveMark}
                  showRankedMoveMarks={showRankedMoveMarks}
                  rankedMoveAnnouncement={rankedMoveAnnouncement}
                  onBoardClick={square => music.select(square)}
                  onPieceDoubleTap={(square) => {
                    if (introPhase !== 3 || game.turn() !== "w" || game.isGameOver()) return
                    const piece = game.get(square)
                    if (!piece) return
                    const turnedOn = music.togglePiece(square)
                    // Only the double tap that turns a piece on opens the full Piece Params.
                    if (turnedOn) setParamsOpen(true)
                    if (turnedOn && !isPlaying && music.engineActive) {
                      setHasPlaybackStarted(true)
                      setIsPlaying(true)
                      void resumeAudio()
                    }
                    if (panelsFollowPlayerTurn && !knobsOn && !knobsManuallyClosedRef.current) {
                      setKnobsOn(true)
                      setActiveWidgetOrder(current => [...current.filter(id => id !== 'knobs'), 'knobs'])
                                  }
                  }}
                  onDragOverSquare={(from, to) => {
                    if (music.engineActive) music.audition(from, to)
                  }}
                  onEmptySquarePointerDown={boardPan.enabled ? boardPan.startPan : undefined}
                />
                {stockfishDebugOn && codeBackdropOn && introPhase === 3 && <StockfishDebugOverlay
                  cityColor={city.color}
                  trace={stockfishTrace}
                  analysis={displayedAnalysis}
                  onClose={toggleStockfishDebug}
                  onRetry={restartStockfish}
                  boardRef={boardAreaRef}
                  position={stockfishDebugPosition}
                  onPositionChange={setStockfishDebugPosition}
                />}
              </div>

              <div className="flex w-[var(--game-board-width)] items-start justify-between gap-1.5 pointer-events-none" style={{ translate: boardPan.translate }}>
                <CapturedPieces
                  pieces={capturedPieces.white}
                  color="b"
                  align="top"
                  outlineColor={city.color}
                  className={cn("transition-opacity duration-1000", introPhase < 3 ? "opacity-0" : "opacity-100")}
                  {...capturedScale.player}
                />

                <EggCounter
                  ref={eggCounterRef}
                  tone="player"
                  value={visibleEggs}
                  widthFor={[visibleEggs, visibleOpponentEggs]}
                  empty={visibleEggs === 0}
                  role="img"
                  aria-label={visibleEggs === 1 ? t("1 golden egg for you") : t("{n} golden eggs for you", { n: visibleEggs })}
                  title={visibleEggs === 1 ? t("1 golden egg") : t("{n} golden eggs", { n: visibleEggs })}
                  className={cn("self-center transition-opacity duration-1000", introPhase < 3 ? "opacity-0" : "opacity-100")}
                />
              </div>

              <MatchStatus placement="bottom" text={statusPlacement === "bottom" ? statusText : ""} color={statusColor} pulse={statusAlert} style={{ translate: boardPan.translate }} className={cn("mb-1 sm:mb-2 transition-opacity duration-1000", introPhase < 3 ? "opacity-0" : "opacity-100")} />

              {powerDisplay === "cards" ? <PowerCardHand visible={introPhase === 3} undoAnimationKey={undoAnimationKey} rowRef={powerCardsRef} resize={{ enabled: cardsResize.enabled, onStart: cardsResize.startResize, onResizeBy: cardsResize.resizeBy, onCancel: cardsResize.cancelResize }} move={cardsPan.enabled ? { translate: cardsPan.translate, moving: cardsPan.panning, onPointerDown: cardsPan.startPan } : undefined} actions={{
                best: {
                  disabled: playerHasActivePower || !displayedAnalysis?.complete || !!evaluationError || analysisArrows.some(arrow => arrow.tone === 'best'),
                  onClick: event => { if (!matchPowersRef.current.some(p => (p.appliedBy ?? 'w') === 'w')) spendEggForAction(event.currentTarget, 1, () => showAnalysisArrows("best")) },
                  onMouseEnter: () => playClosedAnalysisHat(), onMouseLeave: () => playDrum('oh', 0.63, 1, 0.9),
                },
                worst: {
                  disabled: playerHasActivePower || !displayedAnalysis?.complete || !!evaluationError || analysisArrows.some(arrow => arrow.tone === 'worst'),
                  onClick: event => { if (!matchPowersRef.current.some(p => (p.appliedBy ?? 'w') === 'w')) spendEggForAction(event.currentTarget, 1, () => showAnalysisArrows("worst")) },
                  onMouseEnter: () => playClosedAnalysisHat(0.85), onMouseLeave: () => playClosedAnalysisHat(0.6),
                },
                undo: {
                  disabled: moveHistory.length === 0,
                  onClick: event => {
                    setMulliganPreviewActive(false)
                    playDrum("sd", 0.48)
                    spendEggForAction(event.currentTarget, 2, undoMove)
                  },
                  onMouseEnter: () => {
                    setMulliganPreviewActive(true)
                    playControlHoverKick(0.536)
                  },
                  onMouseLeave: () => setMulliganPreviewActive(false),
                  onPointerLeave: () => setMulliganPreviewActive(false),
                  onBlur: () => setMulliganPreviewActive(false),
                  title: t("Volta 1 jogada · 2 golden eggs"),
                },
                freeze: {
                  ref: element => { powerButtonRefs.current.freeze = element },
                  disabled: !canUseMatchPower(game, 'w') || hasUsedPowerThisTurn(matchPowers, 'freeze', game, 'w'), 'aria-pressed': armedPower === 'freeze',
                  onPointerDown: event => powerTargeting.onButtonPointerDown('freeze', event),
                  onLostPointerCapture: powerTargeting.onLostPointerCapture,
                  onClick: event => powerTargeting.onButtonClick('freeze', event),
                  onMouseEnter: () => playClosedAnalysisHat(), onMouseLeave: () => playClosedAnalysisHat(0.6),
                },
                shield: {
                  ref: element => { powerButtonRefs.current.shield = element },
                  disabled: !canUseMatchPower(game, 'w') || hasUsedPowerThisTurn(matchPowers, 'shield', game, 'w'), 'aria-pressed': armedPower === 'shield',
                  onPointerDown: event => powerTargeting.onButtonPointerDown('shield', event),
                  onLostPointerCapture: powerTargeting.onLostPointerCapture,
                  onClick: event => powerTargeting.onButtonClick('shield', event),
                  onMouseEnter: () => playDrum('oh', 0.696),
                },
              }} /> : <GameActionRow visible={introPhase === 3}>
                <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                  <button
                    data-ranked-move-action="best"
                    type="button"
                    aria-label={t("Veja as 3 melhores jogadas")}
                    title={playerHasActivePower ? t("Indisponível enquanto Freeze ou Shield estiver ativo") : t("Veja as 3 melhores jogadas")}
                    disabled={playerHasActivePower || !displayedAnalysis?.complete || !!evaluationError || analysisArrows.some(arrow => arrow.tone === 'best')}
                    onClick={event => {
                      if (matchPowersRef.current.some(p => (p.appliedBy ?? 'w') === 'w')) return
                      spendEggForAction(event.currentTarget, 1, () => showAnalysisArrows("best"))
                    }}
                    onMouseEnter={() => { showCostHint('best'); playClosedAnalysisHat() }}
                    onMouseLeave={() => playDrum('oh', 0.63, 1, 0.9)}
                    onPointerLeave={hideCostHint}
                    onFocus={() => showCostHint('best')}
                    onBlur={hideCostHint}
                    className="pointer-events-auto cursor-pointer relative flex h-8 w-fit shrink-0 items-center gap-0.5 sm:gap-1 rounded-md border border-green-300/35 bg-black/55 px-1 sm:px-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-green-100 transition-colors hover:bg-green-950/70 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {costHint('best', 1)}
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />Best
                  </button>
                  <button
                    data-ranked-move-action="worst"
                    type="button"
                    aria-label={t("Veja as 3 piores jogadas")}
                    title={playerHasActivePower ? t("Indisponível enquanto Freeze ou Shield estiver ativo") : t("Veja as 3 piores jogadas")}
                    disabled={playerHasActivePower || !displayedAnalysis?.complete || !!evaluationError || analysisArrows.some(arrow => arrow.tone === 'worst')}
                    onClick={event => {
                      if (matchPowersRef.current.some(p => (p.appliedBy ?? 'w') === 'w')) return
                      spendEggForAction(event.currentTarget, 1, () => showAnalysisArrows("worst"))
                    }}
                    onMouseEnter={() => { showCostHint('worst'); playClosedAnalysisHat(0.85) }}
                    onMouseLeave={() => playClosedAnalysisHat(0.6)}
                    onPointerLeave={hideCostHint}
                    onFocus={() => showCostHint('worst')}
                    onBlur={hideCostHint}
                    className="pointer-events-auto cursor-pointer relative flex h-8 w-fit shrink-0 items-center gap-0.5 sm:gap-1 rounded-md border border-red-300/35 bg-black/55 px-1 sm:px-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-red-100 transition-colors hover:bg-red-950/70 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {costHint('worst', 1)}
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />Worst
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={event => {
                      setMulliganPreviewActive(false)
                      playDrum("sd", 0.48)
                      spendEggForAction(event.currentTarget, 2, undoMove)
                    }}
                    aria-label={t("Undo · costs 2 golden eggs")}
                    onMouseEnter={() => {
                      setMulliganPreviewActive(true)
                      showCostHint('undo')
                      playControlHoverKick(0.536)
                    }}
                    onMouseLeave={() => setMulliganPreviewActive(false)}
                    onPointerLeave={() => {
                      setMulliganPreviewActive(false)
                      hideCostHint()
                    }}
                    onFocus={() => showCostHint('undo')}
                    onBlur={() => {
                      setMulliganPreviewActive(false)
                      hideCostHint()
                    }}
                    disabled={moveHistory.length === 0}
                    className="relative size-[38px] p-0 sm:size-[51px] overflow-visible rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer"
                    style={{
                        "--city-neon": city.color,
                        backgroundColor: "var(--city-neon)20"
                    } as React.CSSProperties}
                  >
                    {costHint('undo', 2)}
                    <Undo2 className="pointer-events-none absolute inset-0 m-auto h-7 w-7 sm:h-10 sm:w-10" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={redoMove}
                    aria-label={t("Redo")}
                    onMouseEnter={() => playControlHoverKick(0.536)}
                    onMouseDown={() => playDrum("hh", 1.5)}
                    onPointerLeave={hideCostHint}
                    disabled={redoStack.length === 0}
                    className="relative size-[38px] p-0 sm:size-[51px] overflow-visible rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer"
                    style={{
                        "--city-neon": city.color,
                        backgroundColor: "var(--city-neon)20"
                    } as React.CSSProperties}
                  >
                    <Redo2 className="pointer-events-none absolute inset-0 m-auto h-7 w-7 sm:h-10 sm:w-10" />
                  </Button>
                </div>

                <div className="flex min-w-0 items-center justify-self-end gap-1 sm:gap-2">
                  <button
                    ref={element => { powerButtonRefs.current.freeze = element }}
                    data-match-power-action="freeze"
                    type="button"
                    disabled={!canUseMatchPower(game, 'w') || hasUsedPowerThisTurn(matchPowers, 'freeze', game, 'w')}
                    aria-label={t("Congele uma casa por uma rodada")}
                    aria-pressed={armedPower === 'freeze'}
                    title={t("Congele uma casa por uma rodada")}
                    onPointerDown={event => powerTargeting.onButtonPointerDown('freeze', event)}
                    onLostPointerCapture={powerTargeting.onLostPointerCapture}
                    onClick={event => { hideCostHint(); powerTargeting.onButtonClick('freeze', event) }}
                    onMouseEnter={() => { showCostHint('freeze'); playClosedAnalysisHat() }}
                    onMouseLeave={() => playClosedAnalysisHat(0.6)}
                    onPointerLeave={hideCostHint}
                    onFocus={() => showCostHint('freeze')}
                    onBlur={hideCostHint}
                    className={cn("pointer-events-auto touch-manipulation cursor-grab active:cursor-grabbing relative flex h-8 w-fit items-center gap-0.5 sm:gap-1 rounded-md border bg-black/55 px-1 sm:px-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-cyan-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed", armedPower === 'freeze' ? 'border-cyan-300 bg-cyan-900/70 shadow-[0_0_12px_#bcecff88]' : 'border-cyan-300/35 hover:bg-cyan-950/70')}
                  ><Snowflake className="h-3 w-3 sm:h-4 sm:w-4" />Freeze{costHint('freeze', 3)}</button>
                  <button
                    ref={element => { powerButtonRefs.current.shield = element }}
                    data-match-power-action="shield"
                    type="button"
                    disabled={!canUseMatchPower(game, 'w') || hasUsedPowerThisTurn(matchPowers, 'shield', game, 'w')}
                    aria-label={t("Proteja uma casa por uma rodada")}
                    aria-pressed={armedPower === 'shield'}
                    title={t("Proteja uma casa por uma rodada")}
                    onPointerDown={event => powerTargeting.onButtonPointerDown('shield', event)}
                    onLostPointerCapture={powerTargeting.onLostPointerCapture}
                    onClick={event => { hideCostHint(); powerTargeting.onButtonClick('shield', event) }}
                    onMouseEnter={() => { showCostHint('shield'); playDrum('oh', 0.696) }}
                    onPointerLeave={hideCostHint}
                    onFocus={() => showCostHint('shield')}
                    onBlur={hideCostHint}
                    className={cn("pointer-events-auto touch-manipulation cursor-grab active:cursor-grabbing relative flex h-8 w-fit items-center gap-0.5 sm:gap-1 rounded-md border bg-black/55 px-1 sm:px-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-wide text-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed", armedPower === 'shield' ? 'border-amber-300 bg-amber-900/70 shadow-[0_0_12px_#bcecff88]' : 'border-amber-300/35 hover:bg-amber-950/70')}
                  ><Shield className="h-3 w-3 sm:h-4 sm:w-4" />Shield{costHint('shield', 3)}</button>
                </div>
              </GameActionRow>}

              {isMobile && introPhase >= 3 && <div
                data-mobile-widgets
                className="flex w-[var(--game-board-width)] flex-col gap-5 pt-5 pointer-events-auto [&>[data-widget=piece]]:order-1 [&>[data-widget=piece-debug]]:order-2 [&>[data-widget=mixer]]:order-3 [&>[data-widget=spectrum]]:order-4 [&>[data-widget=strudel]]:order-5 [&>[data-widget=board]]:order-6"
              >{widgetsContent(true)}</div>}
            </div>
          </div>

        </div>
      </div>
      
      {/* Connection Lines Layer - Moved BEHIND widgets and board (z-0 to z-10 range, but above BG) */}
      <GameWidgetConnections visible={musicEngineOn && !isPortraitMobile} pieceConnections={pieceConnections} chainConnections={chainConnections} />
      <GameWidgetConnections overlay visible={musicEngineOn && !isPortraitMobile} pieceConnections={hoverConnections} />

      <div
        data-widget-entrance={introPhase === 2 ? "true" : undefined}
        className={cn("transition-opacity duration-1000", introPhase < 2 ? "opacity-0 pointer-events-none" : "opacity-100")}
      >
      {!isMobile && widgetsContent(false)}
      </div>
      {!isMobile && introPhase >= 2 && <WidgetToggleLayer items={widgetToggleItems} onReady={markWidgetToggleLayerReady} />}

      <GameFooter
        visible={introPhase >= 3}
        moves={moveHistory}
        tickerRef={movesTickerRef}
        score={lastEvalScore}
        mate={lastEvalMate}
        evaluationError={evaluationError}
        evaluating={isEvaluating}
        dimmed={thermometerDimmed}
        chancePosition={chancePosition}
      />


      <GameplayTipDialog tip={gameplayTip.tip} open={gameplayTip.open} onOpenChange={gameplayTip.setOpen} />





      {/* Bottom Right Info & Version */}
      {codeBackdropOn && (
        <>
          <div 
            className="hidden sm:flex fixed bottom-3 right-3 z-[50] pointer-events-auto items-center gap-2 bg-background/80 backdrop-blur-sm p-1.5 px-2.5 rounded-lg border border-border shadow-sm"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <VersionChangelog />
          </div>
          <div 
            className="flex sm:hidden fixed bottom-3 right-3 z-[50] pointer-events-auto items-center gap-1.5 bg-background/80 backdrop-blur-sm py-0.5 px-2 rounded border border-border/60 shadow-sm"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <VersionChangelog />
          </div>
        </>
      )}

      {armedPower && createPortal(
        <div ref={powerTargeting.cursorRef} data-power-cursor={armedPower} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[9999] flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/60 bg-black/75 text-cyan-100 opacity-0 shadow-[0_0_12px_rgba(165,243,252,.55)]" style={{ transform: 'translate3d(-100px, -100px, 0)' }}>
          {armedPower === 'freeze' ? <Snowflake className="h-[18px] w-[18px]" /> : <Shield className="h-[18px] w-[18px]" />}
        </div>, document.body,
      )}

    </div>
  )
}
