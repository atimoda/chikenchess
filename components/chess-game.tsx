"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { createPortal } from "react-dom"
import { Chess, type Move, type Square } from "chess.js"
import { cn } from "@/lib/utils"
import type { CityData } from "@/lib/cities-data"
import { ChessgroundBoard, PiecesSVG, type AnalysisArrow } from "./chessground-board"
import { LiveCodeOverlay } from "./live-code-overlay"
import { LiveCodeWidget } from "./live-code-widget"
import { StockfishDebugOverlay } from "./stockfish-debug-overlay"
import { AudioVisualizer } from "./audio-visualizer"
import { GameControls } from "./game-controls"
import { GameInfo } from "./game-info"
import { SynthControlPanel } from "./synth-control-panel"
import { generateStrudelPattern } from "@/lib/strudel-engine"
import { useMusic } from "@/hooks/use-music"
import { MusicTransportReadout, MusicVoiceBadge, MusicVoiceReadout } from './music-playback'
import { MusicHarmonyReadout } from './music-transition-view'
import { VersionChangelog } from './version-changelog'
import { VictoryBasket } from './victory-basket'
import { useAudio } from "@/hooks/use-audio"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { SquareEffectMap } from "@/lib/types"
import { DEFAULT_EFFECTS, DEFAULT_GLOBAL_EFFECTS, type GlobalEffects } from "@/lib/types"
import { ArrowLeft, Code2, Music2, Undo2, Redo2, Pause, Power, Play, Check, RotateCcw, Loader2, Maximize, Minimize, Plus, Minus, Search, Snowflake, Shield } from "lucide-react"
import { toast } from "sonner"
import { conquerCity, markGameplayTipSeen, markRankedMoveNotice, rankedMoveEggReward, STARTING_MATCH_GOLDEN_EGGS, unlockNextCity, type RankedMoveReward } from "@/lib/game-progression"
import { GlobalControlPanel } from "./global-control-panel"
import { MixerWidget } from "./mixer-widget"
import { BoardMusicSelectors, type BoardDropdownId } from "./board-music-selectors"
import { SpectrogramWidget } from "./spectrogram-widget"
import { isConstrainedDevice } from "@/lib/performance"
import { ChessEvaluationQueue, STOCKFISH_WORKER_URL, formatEvaluation, rankedMoveLabelTone, rankedMoveReward, type ChessMoveAnalysis, type StockfishTrace } from "@/lib/chess-evaluation"
import { WidgetToggleLayer } from "./widget-toggle-layer"
import { advanceMatchPowers, createMatchPower, permittedPowerMoves, permitsPowerMove, type MatchPower, type MatchPowerKind } from "@/lib/chess-powers"
import { clonePoweredChess, makePoweredChess, setPoweredChessPowers, syncPoweredMoveSan } from "@/lib/powered-chess"
import { analyzePoweredMoves } from "@/lib/powered-analysis"

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
}

interface EggFlight {
  id: number
  amount: number
  direction: 'earn' | 'spend'
  sourceSquare?: Square
  from?: { left: number; top: number; width: number; height: number }
  to?: { left: number; top: number; width: number; height: number }
}

const BEST_MOVE_MESSAGES = [
  "Brilliant!", "Eggcellent!", "Masterful!", "Sharp!", "Clever!", "Inspired!", "Cluck yeah!", "Genius!", "Flawless!", "Checkmate-worthy!",
]
const WORST_MOVE_MESSAGES = [
  "Oops!", "Eggward!", "Scrambled!", "Yikes!", "Risky!", "Uh-oh, chicken!", "Wobbly!", "Questionable!", "Fowl play!", "Oh cluck!", "Terrible!", 'Your "lucky" day',
]
const BEST_STREAK_MESSAGES = [
  "Unstoppable!", "On fire!", "Unbeakable!", "Winning streak!", "Cluckin’ brilliant!",
]
const WORST_STREAK_MESSAGES = [
  "Eggspiraling!", "Cluckstorm!", "Scramble mode!", "Coop’s concerned!", "Henough already!",
]
const BEST_STREAK_6_PLUS_MESSAGES = [
  "You’re on a roll!", "Unbeakable streak!", "The coop is cooking!", "Cluck, you’re good!", "Can’t stop this chicken!", "Chickens make mistakes, but you?", "Cooking!",
]
const WORST_STREAK_6_PLUS_MESSAGES = [
  "The eggs are scrambling.", "A streak of… choices.", "The coop is concerned.", "Maybe trust the chicken?", "This is getting eggward.", "We’ll pretend that worked.", "Uh-oh, chicken.", "That’s a bold cluck.", "The plot thickens…", "Oopsie-daisy!", "A little scrambled.", "The board noticed.", "Risky business!", "That’s one way to play.",
]
const SINGLE_LEGAL_MOVE_MESSAGES = ["Ok", "Yep"]

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

function rebuildChessEffects(history: Move[]) {
  const captured: { white: string[]; black: string[] } = { white: [], black: [] }
  const active = new Set<string>()
  for (const move of history) {
    if (move.captured) captured[move.color === 'w' ? 'white' : 'black'].push(move.captured)
    active.delete(move.from)
    active.add(move.to)
    if (move.flags.includes('k') || move.flags.includes('q')) {
      if (move.to === 'g1') { active.delete('h1'); active.add('f1') }
      if (move.to === 'c1') { active.delete('a1'); active.add('d1') }
      if (move.to === 'g8') { active.delete('h8'); active.add('f8') }
      if (move.to === 'c8') { active.delete('a8'); active.add('d8') }
    }
  }
  return { captured, active }
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
  if (status) return <div className="text-white/40">{status}</div>
  if (!analysis) return <div className="text-white/40">Analisando movimentos…</div>
  if (analysis.source === 'powers') return <div aria-label="Desempenho da análise" className="border-t border-white/15 pt-2 text-white/40">Análise com poderes · {analysis.legalMoves} lances · {analysis.nodes.toLocaleString()} respostas · {analysis.elapsedMs} ms</div>
  return <div aria-label="Desempenho da análise" className="border-t border-white/15 pt-2">
    <div className="text-white/40">{analysis.final ? 'Estimativa final' : 'Prévia em atualização'} · {analysis.side === 'w' ? 'brancas' : 'pretas'} a jogar · avaliação {analysis.quickMs} ms / prof. {analysis.quickDepth} · ranking {analysis.engineMs} ms / prof. {analysis.depth} · {(analysis.quickNodes + analysis.nodes).toLocaleString()} nós</div>
    {!analysis.complete&&<div className="text-white/40">Orçamento esgotado antes de comparar todas as jogadas.</div>}
  </div>
}

function arrowsForAnalysis(analysis: ChessMoveAnalysis, kind: 'best' | 'worst'): AnalysisArrow[] {
  return analysis[kind].map(move => ({
    from: move.uci.slice(0, 2) as Square,
    to: move.uci.slice(2, 4) as Square,
    label: formatEvaluation(move.score, move.mate),
    tone: kind,
    labelTone: rankedMoveLabelTone(move.score, move.mate),
  }))
}

export function ChessGame({ city, onBack, panelsFollowPlayerTurn }: ChessGameProps) {
  // The board starts with White at the bottom; keep mixer rows tied to that orientation.
  const boardOrientation: "white" | "black" = "white"
  const [game, setGame] = useState(() => makePoweredChess(new Chess()))
  const [currentPattern, setCurrentPattern] = useState("")
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
  const [gameStatus, setGameStatus] = useState<string>("Your move")
  const [aiDepth, setAiDepth] = useState(5)
  const [openDropdown, setOpenDropdown] = useState<BoardDropdownId>(null)
  const aiDifficultyLabel = aiDepth === 5 ? "Easy" : aiDepth === 10 ? "Medium" : aiDepth === 15 ? "Hard" : "Expert"
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({
    white: [],
    black: [],
  })
  const capturedPiecesViewportRef = useRef<HTMLDivElement | null>(null)
  const capturedPiecesContentRef = useRef<HTMLDivElement | null>(null)
  const [capturedPiecesScale, setCapturedPiecesScale] = useState(1)
  
  // Every city starts on Easy; the menu can override it for this match.
  useEffect(() => {
    setAiDepth(5)
  }, [city.id])

  useEffect(() => {
    const updateVisibility = () => setTabVisible(document.visibilityState === 'visible')
    updateVisibility()
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  const [activeSquares, setActiveSquares] = useState<Set<string>>(new Set())
  const [synthSelectedSquare, setSynthSelectedSquare] = useState<string | null>(null)
  const [squareEffects, setSquareEffects] = useState<SquareEffectMap>({})
  const [globalEffects, setGlobalEffects] = useState<GlobalEffects>({ ...DEFAULT_GLOBAL_EFFECTS, bpm: city.bpm })
  const [lastEvalScore, setLastEvalScore] = useState<number | null>(null)
  const [lastEvalMate, setLastEvalMate] = useState<number | null>(null)
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
  const aiMoveTimerRef = useRef<number | null>(null)
  const aiMoveDeadlineRef = useRef<{ fen: string; due: number } | null>(null)
  const aiMoveCandidateRef = useRef<{ fen: string; uci: string } | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [moveAnalysis, setMoveAnalysis] = useState<ChessMoveAnalysis | null>(null)
  const [liveMoveAnalysis, setLiveMoveAnalysis] = useState<ChessMoveAnalysis | null>(null)
  const currentCompleteAnalysisRef = useRef<ChessMoveAnalysis | null>(null)
  const analysisArrowKindRef = useRef<'best' | 'worst' | null>(null)
  const [visibleEggs, setVisibleEggs] = useState(STARTING_MATCH_GOLDEN_EGGS)
  const playerEggBalanceRef = useRef(STARTING_MATCH_GOLDEN_EGGS)
  const collectedMatchEggsRef = useRef(0)
  const victoryToastRef = useRef<string | number | null>(null)
  useEffect(() => () => { if (victoryToastRef.current !== null) toast.dismiss(victoryToastRef.current) }, [])
  const victorySettledRef = useRef(false)
  const [rankedMoveMark, setRankedMoveMark] = useState<{ square: Square; kind: RankedMoveReward; id: number } | null>(null)
  const [rankedMoveAnnouncement, setRankedMoveAnnouncement] = useState<{ square: Square; kind: RankedMoveReward | 'neutral'; id: number; headline: string; earnedEggs: number; streak: boolean } | null>(null)
  const [eggFlight, setEggFlight] = useState<EggFlight | null>(null)
  const [gameplayTipOpen, setGameplayTipOpen] = useState(false)
  const [hoveredCostAction, setHoveredCostAction] = useState<'best' | 'undo' | 'redo' | 'worst' | 'freeze' | 'shield' | null>(null)
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false)
  const costHintTimerRef = useRef<number | null>(null)
  const costHintHideTimerRef = useRef<number | null>(null)
  const eggCounterRef = useRef<HTMLDivElement | null>(null)
  const [armedPower, setArmedPower] = useState<MatchPowerKind | null>(null)
  const powerCursorRef = useRef<HTMLDivElement | null>(null)
  const powerCursorOriginRef = useRef<{ x: number; y: number } | null>(null)
  const [matchPowers, setMatchPowers] = useState<MatchPower[]>([])
  const matchPowersRef = useRef<MatchPower[]>([])
  const powerButtonRefs = useRef<Record<MatchPowerKind, HTMLButtonElement | null>>({ freeze: null, shield: null })
  const powerSerialRef = useRef(0)
  const rewardedMovesRef = useRef(new Set<string>())
  const rankedMoveKindsRef = useRef(new Map<string, RankedMoveReward | null>())
  const rankedMoveStreakRef = useRef<{ kind: RankedMoveReward | null; count: number }>({ kind: null, count: 0 })
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
  const globalPanelRef = useRef<HTMLDivElement | null>(null)
  const globalPanelHandleRef = useRef<HTMLDivElement | null>(null)
  const globalPanelToggleRef = useRef<HTMLButtonElement | null>(null)
  const mixerRef = useRef<HTMLDivElement | null>(null)
  const mixerHandleRef = useRef<HTMLDivElement | null>(null)
  const mixerToggleRef = useRef<HTMLButtonElement | null>(null)
  const liveCodeRef = useRef<HTMLDivElement | null>(null)
  const liveCodeHandleRef = useRef<HTMLDivElement | null>(null)
  const liveCodeToggleRef = useRef<HTMLButtonElement | null>(null)
  const boardAreaRef = useRef<HTMLDivElement | null>(null)
  const movesTickerRef = useRef<HTMLDivElement>(null)
  const [knobsPosition, setKnobsPosition] = useState<{ x: number; y: number } | null>(null)
  const [globalPanelPosition, setGlobalPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [mixerPosition, setMixerPosition] = useState<{ x: number; y: number } | null>(null)
  const [spectrogramPosition, setSpectrogramPosition] = useState<{ x: number; y: number } | null>(null)
  const [liveCodePosition, setLiveCodePosition] = useState<{ x: number; y: number } | null>(null)
  
  // Intro State
  // 0 = Intro Text, 1 = City Title, 2 = Board Descend, 3 = Game Active
  const [introPhase, setIntroPhase] = useState(0)
  const [currentIntroLine, setCurrentIntroLine] = useState(0)
  const [showIntroButton, setShowIntroButton] = useState(false)
  const [showIntroBoxes, setShowIntroBoxes] = useState(false)
  const [showIntroGlow, setShowIntroGlow] = useState(true)
  const [introExitStarted, setIntroExitStarted] = useState(false)
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

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true)
      }).catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullscreen(false)
      }
    }
  }, [])

  const [isFullscreen, setIsFullscreen] = useState(false)
  const [boardScale, setBoardScale] = useState(1)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const handleZoom = (direction: 'in' | 'out' | 'reset') => {
      setBoardScale(prev => {
          if (direction === 'reset') return 1
          if (direction === 'in') return Math.min(prev + 0.1, 2)
          return Math.max(prev - 0.1, 0.5)
      })
  }

  
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

  const [isMobile, setIsMobile] = useState(false)

  const widgetLayoutRef = useRef<Record<string, number> | null>(null)
  const widgetJitterRef = useRef<Record<string, number>>({})

  useEffect(() => {
    const checkMobile = () => {
      const { innerWidth: width, innerHeight: height } = window
      const boardWidth = Math.min(Math.max(0, height - 270), 512) * boardScale
      setIsMobile(width <= boardWidth + 16 || (width <= 528 && height > width))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [boardScale])

  const [knobsOn, setKnobsOn] = useState(false)
  const knobsManuallyClosedRef = useRef(false)
  const mixerManuallyClosedRef = useRef(false)
  const firstMovePanelsActivatedRef = useRef(false)
  const [globalPanelOn, setGlobalPanelOn] = useState(false)
  const [mixerOn, setMixerOn] = useState(false)
  const [spectrogramOn, setSpectrogramOn] = useState(false)
  const [liveCodeOn, setLiveCodeOn] = useState(false)
  const [codeBackdropOn, setCodeBackdropOn] = useState(false)
  const toggleCodeBackdrop = () => {
    const next = !codeBackdropOn
    setCodeBackdropOn(next)
    if (!next) {
      setLiveCodeOn(false)
      setActiveWidgetOrder(current => current.filter(id => id !== "liveCode"))
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

  useEffect(() => {
    const viewport = capturedPiecesViewportRef.current
    const content = capturedPiecesContentRef.current
    if (!viewport || !content) return

    const updateScale = () => {
      const availableWidth = viewport.clientWidth
      const contentWidth = content.scrollWidth
      const nextScale = availableWidth > 0 && contentWidth > availableWidth
        ? availableWidth / contentWidth
        : 1
      setCapturedPiecesScale(current => Math.abs(current - nextScale) < 0.001 ? current : nextScale)
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    observer.observe(content)
    return () => observer.disconnect()
  }, [capturedPieces.black.length, capturedPieces.white.length])

  const deactivatePlaybackWidgets = useCallback(() => {
    setGlobalPanelOn(false)
    setMixerOn(false)
    setKnobsOn(false)
    setActiveWidgetOrder(current => current.filter(id => id !== 'globalPanel' && id !== 'mixer' && id !== 'knobs'))
  }, [])
  
  const spectrogramHandleRef = useRef<HTMLDivElement | null>(null)
  const spectrogramToggleRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (isMobile) {
      widgetLayoutRef.current = null
      return
    }
    if (introPhase < 3) return
    if (rootRef.current) rootRef.current.scrollTop = 0
    let frame = 0
    const layout = () => {
      const board = boardAreaRef.current?.getBoundingClientRect()
      const root = rootRef.current?.getBoundingClientRect()
      if (!board || !root) return
      const firstLayout = !widgetLayoutRef.current
      const previous = widgetLayoutRef.current ?? {}
      const next: Record<string, number> = {}
      const top = Math.max(80, board.top - root.top - 60)
      const mixerHeight = mixerRef.current?.offsetHeight ?? 450
      const spectrumHeight = spectrogramHandleRef.current?.offsetHeight ?? 100
      const panels = [
        { id: 'mixer', ref: mixerRef, set: setMixerPosition, side: 'left', y: top, width: 180 },
        { id: 'spectrogram', ref: spectrogramHandleRef, set: setSpectrogramPosition, side: 'left', y: top + mixerHeight + 20, width: 180 },
        { id: 'liveCode', ref: liveCodeRef, set: setLiveCodePosition, side: 'left', y: top + mixerHeight + spectrumHeight + 40, width: 180 },
        { id: 'knobs', ref: knobsRef, set: setKnobsPosition, side: 'right', y: top, width: 340 },
        { id: 'globalPanel', ref: globalPanelRef, set: setGlobalPanelPosition, side: 'left', y: 80, width: 340 },
      ]
      for (const panel of panels) {
        const width = panel.ref.current?.offsetWidth || panel.width
        const jitter = widgetJitterRef.current[panel.id] ??= Math.round(Math.random() * 20 - 10)
        const left = board.left - root.left
        const right = board.right - root.left
        // Center in the available side area; allow clipping at the screen edge.
        const limit = panel.side === 'left' ? left - width - 20 : right + 20
        const centered = panel.side === 'left'
          ? (left - width) / 2 + jitter
          : (right + root.width - width) / 2 + jitter
        const anchor = panel.side === 'left' ? Math.min(centered, limit) : Math.max(centered, limit)
        next[panel.id] = anchor
        next[`${panel.id}:y`] = panel.y
        panel.set(current => {
          const desired = firstLayout || !current ? anchor : current.x + anchor - (previous[panel.id] ?? anchor)
          const x = panel.side === 'left' ? Math.min(desired, limit) : Math.max(desired, limit)
          const y = firstLayout || !current ? panel.y : current.y + panel.y - (previous[`${panel.id}:y`] ?? panel.y)
          return current?.x === x && current.y === y ? current : { x, y }
        })
      }
      widgetLayoutRef.current = next
    }
    const scheduleLayout = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(layout)
    }
    const onTransitionEnd = (event: globalThis.TransitionEvent) => {
      if (event.propertyName === 'margin-top' || event.propertyName === 'transform') scheduleLayout()
    }
    const observer = new window.ResizeObserver(scheduleLayout)
    for (const ref of [boardAreaRef, rootRef, mixerRef, spectrogramHandleRef, liveCodeRef, knobsRef, globalPanelRef]) {
      if (ref.current) observer.observe(ref.current)
    }
    scheduleLayout()
    window.addEventListener('resize', scheduleLayout)
    rootRef.current?.addEventListener('transitionend', onTransitionEnd)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', scheduleLayout)
      rootRef.current?.removeEventListener('transitionend', onTransitionEnd)
    }
  }, [isMobile, introPhase, boardScale, codeBackdropOn])

  const [knobsConnection, setKnobsConnection] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
    anchorX1: number
    anchorY1: number
    anchorX2: number
    anchorY2: number
    sourceSide?: 'left' | 'right'
    targetSide?: 'left' | 'right' | 'bottom'
  } | null>(null)

  const [chainConnections, setChainConnections] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
    anchorX1: number
    anchorY1: number
    anchorX2: number
    anchorY2: number
    sourceSide?: 'left' | 'right' | 'top' | 'bottom'
    targetSide?: 'left' | 'right' | 'top' | 'bottom'
  }[]>([])

  const music = useMusic(moveHistory, city, isPlaying && tabVisible, globalEffects.bpm, globalEffects.volume, codeBackdropOn || liveCodeOn, musicEngineOn)
  useEffect(() => { if (!tabVisible) music.endAudition() }, [tabVisible, music.endAudition])

  const { togglePlayback, playCheckmate, playVictoryFanfare, playDrawKalimba, playSquareSample, playIllegalMoveGlitch, playDrum, engineRef } = useAudio(game, city, isPlaying && tabVisible, activeSquares, squareEffects, !music.enabled)

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
        
        if (engineRef.current) {
            switch(effect) {
                case "volume":
                    engineRef.current.setGlobalVolume(value)
                    break
                case "bpm":
                    engineRef.current.setGlobalBpm(value)
                    break
                case "ambiencePitch":
                    engineRef.current.setAmbiencePitch(value)
                    break
                case "ambienceLpf":
                    engineRef.current.setAmbienceFilter(value)
                    break
                case "ambienceLfoSpeed":
                    engineRef.current.setAmbienceLFO(value)
                    break
            }
        }
        
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
    const source = eggFlight.direction === 'earn' && eggFlight.sourceSquare
      ? boardAreaRef.current?.querySelector<HTMLButtonElement>(`[data-square="${eggFlight.sourceSquare}"]`)
      : eggCounterRef.current
    const target = eggFlight.direction === 'earn' ? eggCounterRef.current : null
    const rectPoint = (rect: { left: number; top: number; width: number; height: number }) => ({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })
    const fromRect = eggFlight.direction === 'spend' ? eggFlight.from : source?.getBoundingClientRect()
    const toRect = eggFlight.direction === 'spend' ? eggFlight.to : target?.getBoundingClientRect()
    const finishEgg = () => {
      eggCounterRef.current?.animate([
        { transform: 'scale(1)', boxShadow: '0 0 0 rgba(251,191,36,0)' },
        { transform: `scale(${eggFlight.direction === 'earn' ? 1.24 : .88})`, boxShadow: `0 0 22px rgba(${eggFlight.direction === 'earn' ? '251,191,36' : '248,113,113'},.8)` },
        { transform: 'scale(1)', boxShadow: '0 0 0 rgba(251,191,36,0)' },
      ], { duration: 370, easing: 'ease-out' })
    }
    if ((!source && eggFlight.direction === 'earn') || !fromRect || !toRect || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i < eggFlight.amount; i++) finishEgg()
      return
    }
    const { x: x0, y: y0 } = rectPoint(fromRect)
    const { x: x1, y: y1 } = rectPoint(toRect)
    const arc = Math.max(70, Math.abs(x1 - x0) * .18)

    for (let index = 0; index < eggFlight.amount; index++) {
      const egg = document.createElement('span')
      egg.setAttribute('aria-hidden', 'true')
      egg.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:28px;border-radius:50% 50% 45% 45% / 60% 60% 40% 40%;background:radial-gradient(circle at 32% 25%,#fff8c4 0%,#facc15 43%,#b45309 100%);box-shadow:0 0 14px #fbbf24;pointer-events:none;z-index:100;will-change:transform;'
      document.body.appendChild(egg)
      let frame = 0
      let timer = 0
      let startTime = 0
      let done = false
      const rotation = Math.random() * 720
      const cleanup = () => {
        if (done) return
        done = true
        window.clearTimeout(timer)
        window.cancelAnimationFrame(frame)
        egg.remove()
        flightCleanupsRef.current.delete(cleanup)
      }
      flightCleanupsRef.current.add(cleanup)
      const tick = (time: number) => {
        if (!startTime) startTime = time
        const progress = Math.min(1, (time - startTime) / 780)
        const eased = eggFlight.direction === 'spend'
          ? Math.pow(progress, 3)
          : 1 - Math.pow(1 - progress, 3)
        const x = x0 + (x1 - x0) * eased
        const y = y0 + (y1 - y0) * eased - arc * 4 * eased * (1 - eased)
        egg.style.transform = `translate3d(${x - 11}px,${y - 14}px,0) scale(${1 - .3 * eased}) rotate(-${rotation * eased}deg)`
        if (progress < 1) frame = window.requestAnimationFrame(tick)
        else { cleanup(); finishEgg() }
      }
      egg.style.transform = `translate3d(${x0 - 11}px,${y0 - 14}px,0)`
      timer = window.setTimeout(() => { frame = window.requestAnimationFrame(tick) }, index * 110)
    }
  }, [eggFlight])

  // One single-thread engine, shared by evaluation and opponent play.
  useEffect(() => {
    const worker = new Worker(STOCKFISH_WORKER_URL)
    const queue = new ChessEvaluationQueue(worker, {
      onBusy: setIsEvaluating,
      onScore: (score, mate) => { setLastEvalScore(score); setLastEvalMate(mate); setEvaluationError(null) },
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

  useEffect(() => () => {
    if (aiMoveTimerRef.current !== null) window.clearTimeout(aiMoveTimerRef.current)
    aiMoveTimerRef.current = null
    aiMoveDeadlineRef.current = null
  }, [])

  const requestEvaluation = useCallback((gameInstance: Chess, opponentSkill?: number, opponentDelayMs?: number) => {
    const analysisSequence = ++poweredAnalysisSequenceRef.current
    // Applying a power can change legal moves without changing the FEN. Clear
    // the previous ranking so a quick move cannot earn an outdated reward.
    currentCompleteAnalysisRef.current = null
    setMoveAnalysis(null)
    setLiveMoveAnalysis(null)
    setPoweredChessPowers(gameInstance, matchPowersRef.current)
    if (aiMoveTimerRef.current !== null) window.clearTimeout(aiMoveTimerRef.current)
    aiMoveTimerRef.current = null
    aiMoveCandidateRef.current = null
    if (analysisArrowTimeoutRef.current !== null) window.clearTimeout(analysisArrowTimeoutRef.current)
    analysisArrowTimeoutRef.current = null
    setAnalysisArrows([])
    analysisArrowKindRef.current = null
    gameRef.current = gameInstance
    if (matchPowersRef.current.length && !gameInstance.moves({ verbose: true }).length && clonePoweredChess(gameInstance, []).moves({ verbose: true }).length) {
      matchPowersRef.current = []
      setMatchPowers([])
      setPoweredChessPowers(gameInstance, [])
      powerTimelineRef.current[gameInstance.history().length] = { game: clonePoweredChess(gameInstance, []), powers: [] }
      toast.info('Powers faded because no reply was available')
    }
    if (gameInstance.isGameOver()) {
      aiMoveDeadlineRef.current = null
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
    if (matchPowersRef.current.length) {
      evaluationQueueRef.current?.reset()
      setIsEvaluating(true)
      const currentPowers = matchPowersRef.current.map(power => ({ ...power }))
      void analyzePoweredMoves(gameInstance, currentPowers, () => poweredAnalysisSequenceRef.current !== analysisSequence).then(analysis => {
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
      })
    } else evaluationQueueRef.current?.request(gameInstance.fen(), gameInstance.turn(), candidates, { position, skill: opponentSkill, searchMoves: permittedMoves.length < allMoves.length ? opponentCandidates : undefined })
    if (gameInstance.turn() === 'b' && opponentSkill !== undefined) {
      const fen = gameInstance.fen()
      const due = aiMoveDeadlineRef.current?.fen === fen
        ? aiMoveDeadlineRef.current.due
        : globalThis.performance.now() + (opponentDelayMs ?? (1000 + Math.random() * 4000))
      aiMoveDeadlineRef.current = { fen, due }
      aiMoveTimerRef.current = window.setTimeout(() => {
        aiMoveTimerRef.current = null
        aiMoveDeadlineRef.current = null
        if (gameRef.current.fen() !== fen || gameRef.current.turn() !== 'b') return
        const suggested = aiMoveCandidateRef.current?.fen === fen ? aiMoveCandidateRef.current.uci
          : evaluationQueueRef.current?.bestAvailableMove(fen)
        const uci = suggested && opponentCandidates.includes(suggested) ? suggested : opponentCandidates[0]
        if (uci) aiMoveCallbackRef.current(uci)
        setIsThinking(false)
      }, Math.max(0, due - globalThis.performance.now()))
    } else aiMoveDeadlineRef.current = null
  }, [])

  const handleAIDifficultyChange = useCallback((level: number) => {
    setAiDepth(level)
    const skill = level === 5 ? 0 : level === 10 ? 5 : level === 15 ? 12 : 20
    if (aiMoveTimerRef.current !== null && gameRef.current.turn() === 'b') {
      setIsThinking(true)
      requestEvaluation(gameRef.current, skill)
    } else {
      evaluationQueueRef.current?.setSkill(skill)
    }
  }, [requestEvaluation])

  useEffect(() => () => {
    if (analysisArrowTimeoutRef.current !== null) window.clearTimeout(analysisArrowTimeoutRef.current)
  }, [])

  const displayedAnalysis = moveAnalysis?.fen === game.fen() ? moveAnalysis : liveMoveAnalysis?.fen === game.fen() ? liveMoveAnalysis : null
  const showAnalysisArrows = useCallback((kind: "best" | "worst") => {
    if (!displayedAnalysis?.complete || displayedAnalysis.fen !== gameRef.current.fen()) return
    if (analysisArrowTimeoutRef.current !== null) window.clearTimeout(analysisArrowTimeoutRef.current)
    void engineRef.current?.playAnalysisWhistle(kind === 'best' ? 'up' : 'down')
    analysisArrowKindRef.current = kind
    setAnalysisArrows(arrowsForAnalysis(displayedAnalysis, kind))
    analysisArrowTimeoutRef.current = window.setTimeout(() => {
      setAnalysisArrows([])
      analysisArrowKindRef.current = null
      analysisArrowTimeoutRef.current = null
    }, 3000)
  }, [displayedAnalysis])

  useEffect(() => {
    const kind = analysisArrowKindRef.current
    if (!kind || !displayedAnalysis?.complete || displayedAnalysis.fen !== gameRef.current.fen()) return
    setAnalysisArrows(arrowsForAnalysis(displayedAnalysis, kind))
  }, [displayedAnalysis])

  const hideCostHint = () => {
    if (costHintTimerRef.current !== null) window.clearTimeout(costHintTimerRef.current)
    if (costHintHideTimerRef.current !== null) window.clearTimeout(costHintHideTimerRef.current)
    costHintTimerRef.current = null
    costHintHideTimerRef.current = null
    setHoveredCostAction(null)
  }

  const hasEggsForAction = (amount: number) => {
    if (playerEggBalanceRef.current < amount) {
      if (playerEggBalanceRef.current === 0) {
        void engineRef.current?.playBlockedCue()
        eggCounterRef.current?.animate([
          { transform: 'translateX(0)', boxShadow: '0 0 0 rgba(248,113,113,0)' },
          { transform: 'translateX(-4px)', boxShadow: '0 0 14px rgba(248,113,113,.55)' },
          { transform: 'translateX(4px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(3px)' },
          { transform: 'translateX(0)', boxShadow: '0 0 0 rgba(248,113,113,0)' },
        ], { duration: 360, easing: 'ease-in-out' })
      }
      const shortfall = amount - playerEggBalanceRef.current
      toast.error(`You need ${shortfall} more golden egg${shortfall === 1 ? '' : 's'} to use this`)
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

  const targetPower = (square: Square) => {
    if (!armedPower || introPhase !== 3 || gameRef.current.turn() !== 'w' || gameRef.current.isGameOver()) return
    if (matchPowersRef.current.some(power => power.kind === armedPower && power.square === square)) {
      toast.info('This square already has that power')
      return
    }
    const button = powerButtonRefs.current[armedPower]
    if (!button) return
    const power = createMatchPower(armedPower, square, gameRef.current, ++powerSerialRef.current)
    if (armedPower === 'freeze' && !clonePoweredChess(gameRef.current, [...matchPowersRef.current, power]).moves({ verbose: true }).length) {
      toast.error('Freeze would leave no legal move')
      return
    }
    spendEggForAction(button, 3, () => {
      matchPowersRef.current = [...matchPowersRef.current, power]
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

  const togglePowerTargeting = (kind: MatchPowerKind, event: React.MouseEvent<HTMLButtonElement>) => {
    hideCostHint()
    if (armedPower === kind) { setArmedPower(null); return }
    if (!hasEggsForAction(3)) { setArmedPower(null); return }
    const pointerType = 'pointerType' in event.nativeEvent ? (event.nativeEvent as globalThis.PointerEvent).pointerType : ''
    const hasCursor = pointerType === 'mouse' || pointerType === 'pen' || (!pointerType && !window.matchMedia('(pointer: coarse)').matches)
    powerCursorOriginRef.current = event.detail > 0 && hasCursor ? { x: event.clientX, y: event.clientY } : null
    setArmedPower(kind)
  }

  useEffect(() => {
    if (!armedPower) return
    const cancel = (event: KeyboardEvent) => { if (event.key === 'Escape') setArmedPower(null) }
    window.addEventListener('keydown', cancel)
    return () => window.removeEventListener('keydown', cancel)
  }, [armedPower])

  useEffect(() => {
    if (!armedPower) return
    const origin = powerCursorOriginRef.current
    if (origin && powerCursorRef.current) {
      powerCursorRef.current.style.transform = `translate3d(${origin.x + 12}px, ${origin.y + 16}px, 0)`
      powerCursorRef.current.style.opacity = '1'
    }
    const moveIcon = (event: globalThis.PointerEvent) => {
      const icon = powerCursorRef.current
      if (!icon) return
      if (event.pointerType === 'touch') { icon.style.opacity = '0'; return }
      icon.style.transform = `translate3d(${event.clientX + 12}px, ${event.clientY + 16}px, 0)`
      icon.style.opacity = '1'
    }
    const hideIcon = (event: globalThis.PointerEvent) => {
      if (!event.relatedTarget && powerCursorRef.current) powerCursorRef.current.style.opacity = '0'
    }
    const blurIcon = () => { if (powerCursorRef.current) powerCursorRef.current.style.opacity = '0' }
    window.addEventListener('pointermove', moveIcon)
    document.addEventListener('pointerout', hideIcon)
    window.addEventListener('blur', blurIcon)
    return () => {
      window.removeEventListener('pointermove', moveIcon)
      document.removeEventListener('pointerout', hideIcon)
      window.removeEventListener('blur', blurIcon)
    }
  }, [armedPower])

  const settleCityVictory = useCallback(() => {
    if (victorySettledRef.current) return
    victorySettledRef.current = true
    flightCleanupsRef.current.forEach(cleanup => cleanup())
    flightCleanupsRef.current.clear()
    setEggFlight(null)

    const earnedEggs = playerEggBalanceRef.current
    setVisibleEggs(earnedEggs)
    const collected = collectedMatchEggsRef.current
    const result = conquerCity(city.id, earnedEggs, collected)
    playerEggBalanceRef.current = 0
    victoryToastRef.current = toast.custom(id => <VictoryBasket result={result} collected={collected}
      onLand={amount => { setVisibleEggs(current => Math.max(0, current - amount)); if (!document.hidden && amount > 0) engineRef.current?.playEggLanding() }}
      onReturn={() => { toast.dismiss(id); onBack() }} />, { duration: Infinity })
  }, [city.id, onBack])

  const forceWin = useCallback(() => {
    setGameStatus("CHECKMATE - White wins!")
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
    <span
      aria-hidden="true"
      className={cn(
      "pointer-events-none absolute -right-2.5 z-10 flex items-center gap-1 whitespace-nowrap rounded border border-zinc-500 bg-white px-1.5 py-0.5 text-[10px] leading-none font-bold text-red-900 opacity-0",
        hoveredCostAction === action && "opacity-100",
      )}
      style={{ bottom: "calc(100% - 5px)" }}
    >
      <span>-{amount}</span>
      <span className="inline-block h-3 w-[9px] rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_32%_25%,#fff8c4_0%,#facc15_43%,#b45309_100%)] shadow-[0_0_5px_#fbbf24]" />
    </span>
  )

  const playControlHoverKick = (volume = 1) => playDrum('bd', (0.52 + Math.random() * 0.16) * volume, 0.92 + Math.random() * 0.16)
  const playClosedAnalysisHat = () => playDrum('ch', 0.648 + Math.random() * 0.048, 0.96 + Math.random() * 0.08)

  useEffect(() => {
    if (introPhase === 3) {
      const skill = gameRef.current.turn() === 'b' ? (aiDepth === 5 ? 0 : aiDepth === 10 ? 5 : aiDepth === 15 ? 12 : 20) : undefined
      if (skill !== undefined) setIsThinking(true)
      requestEvaluation(gameRef.current, skill)
    }
  }, [introPhase, requestEvaluation, workerEpoch])

  useEffect(() => {
    if (introPhase === 3 && markGameplayTipSeen()) setGameplayTipOpen(true)
  }, [introPhase])

  // Update pattern when board changes
  useEffect(() => {
    const pattern = generateStrudelPattern(game, city, activeSquares, squareEffects, globalEffects)
    setCurrentPattern(pattern)

    // Update game status
    if (game.isCheckmate()) {
      const winner = game.turn() === "w" ? "Black" : "White"
      setGameStatus(`CHECKMATE - ${winner} wins!`)
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
        playCheckmate()
        toast.error("DEFEAT!", {
          description: "Try again to conquer this city and keep your match eggs."
        })
      }
    } else if (game.isDraw() || game.isStalemate()) {
      setGameStatus("DRAW!")
      setIsPlaying(false)
      deactivatePlaybackWidgets()
      playDrawKalimba()
      toast("DRAW", {
        description: "The game ended in a draw.",
      })
    } else if (game.isCheck() && game.turn() === "w") {
      setGameStatus("CHECK!")
    } else {
      setGameStatus(game.turn() === "w" ? "Your move" : "Thinking...")
    }
  }, [game, city, activeSquares, squareEffects, globalEffects, deactivatePlaybackWidgets, settleCityVictory])

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
  }, [game, introPhase, panelsFollowPlayerTurn])

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
          setGame(gameCopy)
          requestEvaluation(gameCopy)
          setMoveHistory((prev) => [...prev, move.san])
          updateCapturedPieces(move)
          setSynthSelectedSquare(null) // Clear selection on AI move

          // Update active squares for AI
          setActiveSquares(prev => {
            const next = new Set(prev)
            next.delete(move.from)
            next.add(move.to)
            // Handle castling
            if (move.flags.includes('k') || move.flags.includes('q')) {
              if (move.to === "g8") { next.delete("h8"); next.add("f8"); } // Black Kingside
              if (move.to === "c8") { next.delete("a8"); next.add("d8"); } // Black Queenside
            }
            return next
          })
        }
      } catch (e) {
        console.warn("Failed to apply AI move:", moveStr, e)
      }
    },
    [updateCapturedPieces, requestEvaluation],
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
      const rewardKind = rankedMoveReward(currentAnalysis, move.before, uci)
      const rewardKey = `${move.before}|${uci}`
      const seenMove = rankedMoveKindsRef.current.has(rewardKey)
      const streakKind = rewardKind ?? (seenMove ? rankedMoveKindsRef.current.get(rewardKey) ?? null : null)
      rankedMoveKindsRef.current.set(rewardKey, streakKind)
      const previousStreak = rankedMoveStreakRef.current
      const streakCount = streakKind ? (previousStreak.kind === streakKind ? previousStreak.count + 1 : 1) : 0
      rankedMoveStreakRef.current = { kind: streakKind, count: streakCount }
      if (rewardKind && !rewardedMovesRef.current.has(rewardKey)) {
        rewardedMovesRef.current.add(rewardKey)
        const streak = streakKind === rewardKind && streakCount >= 3
        const reward = {
          earnedEggs: rankedMoveEggReward(rewardKind, streak ? 2 : 1),
          firstNotice: markRankedMoveNotice(rewardKind),
        }
        playerEggBalanceRef.current += reward.earnedEggs
        collectedMatchEggsRef.current += reward.earnedEggs
        setVisibleEggs(playerEggBalanceRef.current)
        const id = ++rewardSerialRef.current
        setRankedMoveMark({ square: move.to, kind: rewardKind, id })
        const legalMoveCount = currentAnalysis?.legalMoves ?? 0
        const headline = legalMoveCount === 1
          ? randomMessage(SINGLE_LEGAL_MOVE_MESSAGES)
          : streak
            ? randomMessage(streakCount >= 6
              ? rewardKind === 'best' ? BEST_STREAK_6_PLUS_MESSAGES : WORST_STREAK_6_PLUS_MESSAGES
              : rewardKind === 'best' ? BEST_STREAK_MESSAGES : WORST_STREAK_MESSAGES)
            : randomMessage(rewardKind === 'best' ? BEST_MOVE_MESSAGES : WORST_MOVE_MESSAGES)
        setRankedMoveAnnouncement({ square: move.to, kind: rewardKind, id, headline, earnedEggs: reward.earnedEggs, streak })
        setEggFlight({ sourceSquare: move.to, amount: reward.earnedEggs, direction: 'earn', id })
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
        void engineRef.current?.playRankedMoveWhistle(rewardKind)
        if (reward.firstNotice) {
          toast.success(rewardKind === 'worst'
            ? `You made one of the 3 worst available moves! Here are ${reward.earnedEggs} golden eggs as a reward :)`
            : `You made one of the 3 best available moves! Here ${reward.earnedEggs === 1 ? 'is' : 'are'} ${reward.earnedEggs} golden ${reward.earnedEggs === 1 ? 'egg' : 'eggs'} as a reward.`,
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
      setSquareEffects((prev) => {
        const next = { ...prev }
        if (next[move.from]) {
          next[move.to] = next[move.from]
          delete next[move.from]
        }
        return next
      })
      setSynthSelectedSquare((prev) => {
        if (!prev) return prev
        if (prev === (move.from as string)) return move.to as string
        return prev
      })

      // Auto-start music on first move
      if (!isPlaying) {
        setHasPlaybackStarted(true)
        setIsPlaying(true)
        togglePlayback()
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
      setGame(gameCopy)
      gameRef.current = gameCopy // Ensure ref is updated immediately to prevent race conditions with AI

      if (!gameCopy.isGameOver()) setIsThinking(true)

      setActiveSquares(prev => {
        const next = new Set(prev)
        next.delete(move.from)
        next.add(move.to)
        if (move.flags.includes('k') || move.flags.includes('q')) {
          if (move.to === "g1") { next.delete("h1"); next.add("f1"); }
          if (move.to === "c1") { next.delete("a1"); next.add("d1"); }
        }
        return next
      })
      requestEvaluation(gameCopy, aiDepth === 5 ? 0 : aiDepth === 10 ? 5 : aiDepth === 15 ? 12 : 20)
    },
    [game, aiDepth, updateCapturedPieces, isPlaying, togglePlayback, requestEvaluation, engineRef],
  )

  const resetGame = useCallback(() => {
    matchPowersRef.current = []
    setMatchPowers([])
    setArmedPower(null)
    flightCleanupsRef.current.forEach(cleanup => cleanup())
    flightCleanupsRef.current.clear()
    setEggFlight(null)
    playerEggBalanceRef.current = STARTING_MATCH_GOLDEN_EGGS
    collectedMatchEggsRef.current = 0
    if (victoryToastRef.current !== null) { toast.dismiss(victoryToastRef.current); victoryToastRef.current = null }
    setVisibleEggs(STARTING_MATCH_GOLDEN_EGGS)
    victorySettledRef.current = false
    firstMovePanelsActivatedRef.current = false
    rewardedMovesRef.current.clear()
    rankedMoveKindsRef.current.clear()
    rankedMoveStreakRef.current = { kind: null, count: 0 }
    setRankedMoveMark(null)
    setRankedMoveAnnouncement(null)
    if (rewardMarkTimerRef.current !== null) window.clearTimeout(rewardMarkTimerRef.current)
    if (rewardAnnouncementTimerRef.current !== null) window.clearTimeout(rewardAnnouncementTimerRef.current)
    evaluationQueueRef.current?.reset()
    const freshGame = makePoweredChess(new Chess())
    gameRef.current = freshGame
    powerTimelineRef.current = [{ game: clonePoweredChess(freshGame, []), powers: [] }]
    redoTimelineRef.current = []
    setGame(freshGame)
    setIsPlaying(false)
    setHasPlaybackStarted(false)
    setMoveHistory([])
    redoStackRef.current = []
    setRedoStack([])
    setIsThinking(false)
    setCapturedPieces({ white: [], black: [] })
    setActiveSquares(new Set())
    setSynthSelectedSquare(null)
    setSquareEffects({})
    music.reset()
    knobsManuallyClosedRef.current = false
    mixerManuallyClosedRef.current = false
    if (!panelsFollowPlayerTurn) {
      setMixerOn(true)
      setKnobsOn(true)
      setActiveWidgetOrder(current => [
        ...current.filter(id => id !== "mixer" && id !== "knobs"),
        "mixer",
        "knobs",
      ])
    }
    setLastEvalScore(null)
    setLastEvalMate(null)
    setIsEvaluating(false)
    if (evaluationError) restartStockfish()
    else requestEvaluation(freshGame)
    setIsBackgroundDark(false)
    rewardedCheckmateFenRef.current = null
  }, [evaluationError, panelsFollowPlayerTurn, requestEvaluation, restartStockfish])

  const undoMove = useCallback(() => {
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
    redoTimelineRef.current = [...redoTimelineRef.current, ...removedSnapshots]
    powerTimelineRef.current = powerTimelineRef.current.slice(0, targetPly + 1)
    const newGame = clonePoweredChess(restoredSnapshot.game, restoredSnapshot.powers)
    matchPowersRef.current = restoredSnapshot.powers.map(power => ({ ...power }))
    setMatchPowers(matchPowersRef.current)
    const newHistory = newGame.history()
    rankedMoveStreakRef.current = rankedStreakFromHistory(newGame.history({ verbose: true }), rankedMoveKindsRef.current)
    setRankedMoveAnnouncement(null)
    if (rewardAnnouncementTimerRef.current !== null) window.clearTimeout(rewardAnnouncementTimerRef.current)
    
    const { captured: newCapturedPieces, active: newActiveSquares } = rebuildChessEffects(newGame.history({ verbose: true }))

    // requestEvaluation cancels any pending opponent result before switching position.
    setIsThinking(false)

    // Save undone moves to stack in reverse order (LIFO for redo)
    const movesToUndo = currentHistory.slice(-stepsToUndo).reverse()
    redoStackRef.current = [...redoStackRef.current, ...movesToUndo]
    setRedoStack(redoStackRef.current)

    setUndoAnimationKey(key => key + 1)
    setGame(newGame)
    setMoveHistory(newHistory)
    setCapturedPieces(newCapturedPieces as { white: string[], black: string[] })
    setActiveSquares(newActiveSquares)
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
      void togglePlayback()
    }

    // Re-evaluate the reconstructed position with its repetition history.
    console.log("Undo to FEN:", newGame.fen())
    requestEvaluation(newGame)
  }, [panelsFollowPlayerTurn, requestEvaluation, togglePlayback])

  const redoMove = useCallback(() => {
    const pendingRedo = redoStackRef.current
    if (pendingRedo.length === 0) return

    setArmedPower(null)

    const restoredSnapshot = redoTimelineRef.current.at(-1)
    if (!restoredSnapshot) return
    const newRedoStack = pendingRedo.slice(0, -1)
    const gameCopy = clonePoweredChess(restoredSnapshot.game, restoredSnapshot.powers)
    if (gameCopy.history().length === gameRef.current.history().length + 1) {
        redoTimelineRef.current = redoTimelineRef.current.slice(0, -1)
        powerTimelineRef.current.push({ game: clonePoweredChess(gameCopy, restoredSnapshot.powers), powers: restoredSnapshot.powers.map(power => ({ ...power })) })
        matchPowersRef.current = restoredSnapshot.powers.map(power => ({ ...power }))
        setMatchPowers(matchPowersRef.current)
        const nextHistory = gameCopy.history()
        const { captured: nextCaptured, active: nextActiveSquares } = rebuildChessEffects(gameCopy.history({ verbose: true }))
        redoStackRef.current = newRedoStack
        setGame(gameCopy)
        setMoveHistory(nextHistory)
        rankedMoveStreakRef.current = rankedStreakFromHistory(gameCopy.history({ verbose: true }), rankedMoveKindsRef.current)
        setRankedMoveAnnouncement(null)
        if (rewardAnnouncementTimerRef.current !== null) window.clearTimeout(rewardAnnouncementTimerRef.current)
        setRedoStack(newRedoStack)
        setCapturedPieces(nextCaptured)
        setActiveSquares(nextActiveSquares)
        const skill = gameCopy.turn() === 'b' && !gameCopy.isGameOver()
          ? (aiDepth === 5 ? 0 : aiDepth === 10 ? 5 : aiDepth === 15 ? 12 : 20) : undefined
        if (skill !== undefined) setIsThinking(true)
        requestEvaluation(gameCopy, skill, skill !== undefined ? 5000 : undefined)
    }
  }, [aiDepth, requestEvaluation])

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

  const handleTogglePlay = useCallback(async () => {
    if (gameRef.current.isGameOver() || gameStatus === "DRAW!" || gameStatus.startsWith("CHECKMATE")) {
        deactivatePlaybackWidgets()
        setIsPlaying(false)
        return
    }
    if (!isPlaying) {
      // Auto-activate Board Params (Global Control Panel) when play starts
      setHasPlaybackStarted(true)
      setGlobalPanelOn(true)
      setActiveWidgetOrder(prev => [...prev.filter(id => id !== 'globalPanel'), 'globalPanel'])
    } else {
        setGlobalPanelOn(false)
        setActiveWidgetOrder(current => current.filter(id => id !== "globalPanel"))
    }
    await togglePlayback()
    setIsPlaying((prev) => !prev)
  }, [togglePlayback, isPlaying, gameStatus, deactivatePlaybackWidgets])

  const handleToggleMusicEngine = useCallback(() => setMusicEngineOn(current => !current), [])

  const hasStarted = moveHistory.length > 0

  // Force update for resize events
  const [resizeTick, forceUpdate] = useState(0)
  useEffect(() => {
      const observer = new ResizeObserver(() => {
          forceUpdate(n => n + 1)
      })
      
      if (globalPanelRef.current) observer.observe(globalPanelRef.current)
      if (mixerRef.current) observer.observe(mixerRef.current)
      if (spectrogramHandleRef.current) observer.observe(spectrogramHandleRef.current)
      if (liveCodeRef.current) observer.observe(liveCodeRef.current)
      if (knobsRef.current) observer.observe(knobsRef.current)
      
      return () => observer.disconnect()
  }, [globalPanelOn, mixerOn, spectrogramOn, liveCodeOn, knobsOn, introPhase])

  // Visual balance only, not a probability model. Keep large non-mate scores distinguishable.
  const whitePercent = lastEvalScore === null ? 50 : lastEvalMate !== null
    ? (lastEvalScore < 0 ? 0 : 100)
    : 50 + 50 * lastEvalScore / (Math.abs(lastEvalScore) + 300)
  const thermometerDimmed = (hasPlaybackStarted && !isPlaying)
    || game.isGameOver()
    || gameStatus === "DRAW!"
    || gameStatus.startsWith("CHECKMATE")

  useEffect(() => {
    if (!rootRef.current || !boardAreaRef.current) {
      setKnobsConnection(null)
      return
    }

    const containerRect = rootRef.current.getBoundingClientRect()
    const boardRect = boardAreaRef.current.getBoundingClientRect()
    const squareWidth = boardRect.width / 8
    const squareHeight = boardRect.height / 8

    // --- CHAIN CONNECTIONS (MST) ---
    const widgets = {
        'globalPanel': { ref: globalPanelRef, on: globalPanelOn },
        'mixer': { ref: mixerRef, on: mixerOn },
        'spectrogram': { ref: spectrogramHandleRef, on: spectrogramOn },
        'liveCode': { ref: liveCodeRef, on: liveCodeOn }
    }

    const activeWidgetIds = Object.keys(widgets).filter(id => widgets[id as keyof typeof widgets]?.on)
    
    // Nodes: 'board' is always index 0. Other widgets follow.
    const nodes = [{ id: 'board', rect: boardRect }]
    activeWidgetIds.forEach(id => {
        const widget = widgets[id as keyof typeof widgets]
        if (widget && widget.ref.current) {
            nodes.push({ id, rect: widget.ref.current.getBoundingClientRect() })
        }
    })

    const newConnections: {
        x1: number, y1: number, x2: number, y2: number, 
        anchorX1: number, anchorY1: number, anchorX2: number, anchorY2: number,
        sourceSide?: 'left'|'right'|'top'|'bottom', 
        targetSide?: 'left'|'right'|'top'|'bottom'
    }[] = []

    const occupiedSides: Record<string, Set<string>> = {}
    const occupy = (id: string, side: string) => {
        if (!occupiedSides[id]) occupiedSides[id] = new Set()
        occupiedSides[id].add(side)
    }
    const isOccupied = (id: string, side: string) => occupiedSides[id]?.has(side)

    // Prim's Algorithm to build MST
    // We want to connect all active widgets to the tree rooted at 'board'
    const connectedIndices = new Set([0]) // Start with board
    const unconnectedIndices = new Set(nodes.map((_, i) => i).filter(i => i !== 0))

    while (unconnectedIndices.size > 0) {
        let bestDist = Infinity
        let bestU = -1 // From connected
        let bestV = -1 // From unconnected

        // Find closest pair (u, v)
        for (const uIdx of connectedIndices) {
            const uNode = nodes[uIdx]
            const uCenter = { 
                x: uNode.rect.left + uNode.rect.width/2, 
                y: uNode.rect.top + uNode.rect.height/2 
            }

            for (const vIdx of unconnectedIndices) {
                const vNode = nodes[vIdx]
                const vCenter = { 
                    x: vNode.rect.left + vNode.rect.width/2, 
                    y: vNode.rect.top + vNode.rect.height/2 
                }
                
                const dist = Math.hypot(uCenter.x - vCenter.x, uCenter.y - vCenter.y)
                if (dist < bestDist) {
                    bestDist = dist
                    bestU = uIdx
                    bestV = vIdx
                }
            }
        }

        if (bestU !== -1 && bestV !== -1) {
            // Create connection U -> V
            const uNode = nodes[bestU]
            const vNode = nodes[bestV]
            
            const uCenter = { x: uNode.rect.left + uNode.rect.width/2, y: uNode.rect.top + uNode.rect.height/2 }
            const vCenter = { x: vNode.rect.left + vNode.rect.width/2, y: vNode.rect.top + vNode.rect.height/2 }

            // Determine sides
             const getBestSide = (rect: DOMRect, otherCenter: {x:number, y:number}, id: string): 'left'|'right'|'bottom'|'top' => {
                const dx = rect.left + rect.width/2 - otherCenter.x
                const dy = rect.top + rect.height/2 - otherCenter.y
                
                // Allow top, bottom, left, right
                const sides: ('left'|'right'|'bottom'|'top')[] = []
                
                if (Math.abs(dx) > Math.abs(dy)) {
                    // Horizontal preference
                    sides.push(dx > 0 ? 'left' : 'right') // Face the other object
                    sides.push(dy > 0 ? 'top' : 'bottom')
                    sides.push(dy > 0 ? 'bottom' : 'top')
                    sides.push(dx > 0 ? 'right' : 'left') // Back side
                } else {
                    // Vertical preference
                    sides.push(dy > 0 ? 'top' : 'bottom')
                    sides.push(dx > 0 ? 'left' : 'right')
                    sides.push(dx > 0 ? 'right' : 'left')
                    sides.push(dy > 0 ? 'bottom' : 'top')
                }

                for (const side of sides) {
                    if (!isOccupied(id, side)) return side
                }
                return sides[0] // Fallback
            }

            // Source (U)
            let sourceSide: 'left'|'right'|'bottom'|'top'
            if (uNode.id === 'board') {
                 // Board logic (simple)
                 const dx = uCenter.x - vCenter.x
                 const dy = uCenter.y - vCenter.y
                 if (Math.abs(dx) > Math.abs(dy)) {
                     sourceSide = dx > 0 ? 'left' : 'right'
                 } else {
                     sourceSide = dy > 0 ? 'top' : 'bottom'
                 }
            } else {
                sourceSide = getBestSide(uNode.rect, vCenter, uNode.id)
                occupy(uNode.id, sourceSide)
            }

            // Target (V)
            let targetSide: 'left'|'right'|'bottom'|'top'
            if (vNode.id === 'board') {
                 // Board logic (simple)
                 const dx = vCenter.x - uCenter.x
                 const dy = vCenter.y - uCenter.y
                 if (Math.abs(dx) > Math.abs(dy)) {
                     targetSide = dx > 0 ? 'left' : 'right'
                 } else {
                     targetSide = dy > 0 ? 'top' : 'bottom'
                 }
            } else {
                targetSide = getBestSide(vNode.rect, uCenter, vNode.id)
                occupy(vNode.id, targetSide)
            }

            // Calculate Coordinates with 5px offset for line, original for anchor
            const getPoint = (rect: DOMRect, side: string) => {
                const offset = 5
                let anchor = { x: rect.left, y: rect.top }
                let line = { x: rect.left, y: rect.top }
                
                switch(side) {
                    case 'left': 
                        anchor = { x: rect.left, y: rect.top + rect.height/2 }
                        line = { x: rect.left - offset, y: rect.top + rect.height/2 }
                        break
                    case 'right': 
                        anchor = { x: rect.right, y: rect.top + rect.height/2 }
                        line = { x: rect.right + offset, y: rect.top + rect.height/2 }
                        break
                    case 'top': 
                        anchor = { x: rect.left + rect.width/2, y: rect.top }
                        line = { x: rect.left + rect.width/2, y: rect.top - offset }
                        break
                    case 'bottom': 
                        anchor = { x: rect.left + rect.width/2, y: rect.bottom }
                        line = { x: rect.left + rect.width/2, y: rect.bottom + offset }
                        break
                    default: 
                        anchor = { x: rect.left, y: rect.top }
                        line = { x: rect.left, y: rect.top }
                }
                return { anchor, line }
            }

            const p1 = getPoint(uNode.rect, sourceSide)
            const p2 = getPoint(vNode.rect, targetSide)

            newConnections.push({
                x1: p1.line.x - containerRect.left,
                y1: p1.line.y - containerRect.top,
                x2: p2.line.x - containerRect.left,
                y2: p2.line.y - containerRect.top,
                anchorX1: p1.anchor.x - containerRect.left,
                anchorY1: p1.anchor.y - containerRect.top,
                anchorX2: p2.anchor.x - containerRect.left,
                anchorY2: p2.anchor.y - containerRect.top,
                sourceSide,
                targetSide
            })

            // Update MST sets
            connectedIndices.add(bestV)
            unconnectedIndices.delete(bestV)
        } else {
            // Should not happen if graph is connected, but break to avoid infinite loop
            break
        }
    }

    setChainConnections(newConnections)

    // --- KNOBS CONNECTION ---
    if (synthSelectedSquare && knobsOn && knobsRef.current) {
        const fileChar = synthSelectedSquare[0]
        const rankChar = synthSelectedSquare[1]
        const files = "abcdefgh"
        const fileIndex = files.indexOf(fileChar)
        const rank = parseInt(rankChar, 10)

        if (fileIndex >= 0 && Number.isFinite(rank)) {
             const toggleRect = knobsRef.current.getBoundingClientRect()
             
             // Widget Point (Source) - Center Vertical
             const knobY = toggleRect.top + toggleRect.height / 2 - containerRect.top
             const knobCenterX = toggleRect.left + toggleRect.width / 2
             
             const rankIndexFromBottom = rank - 1
             const rowFromTop = 7 - rankIndexFromBottom
             
             // Target is square center
             const squareCenterX = boardRect.left + (fileIndex + 0.5) * squareWidth - containerRect.left
             const squareCenterY = boardRect.top + (rowFromTop + 0.5) * squareHeight - containerRect.top
             
             // Determine Source Side
             let x1, sourceSide: 'left' | 'right'
             if (squareCenterX > knobCenterX) {
                 x1 = toggleRect.right - containerRect.left
                 sourceSide = 'right'
             } else {
                 x1 = toggleRect.left - containerRect.left
                 sourceSide = 'left'
             }
             
             const dx = x1 - squareCenterX
             const dy = knobY - squareCenterY
             
             let x2 = squareCenterX
             let y2 = squareCenterY
             let targetSide: 'left' | 'right' | 'bottom'

             // Simple proximity check to attach to the closest side of the square
             // Avoid attaching to the top side (dy < 0 and |dy| > |dx|)
             // If widget is above, force attachment to left or right side
             if (dy < 0 && Math.abs(dy) > Math.abs(dx)) {
                 // Widget is above, attach to side
                 x2 = squareCenterX + (dx > 0 ? squareWidth/2 : -squareWidth/2)
                 targetSide = dx > 0 ? 'right' : 'left'
             } else if (Math.abs(dx) > Math.abs(dy)) {
                 // Widget is to the side
                 x2 = squareCenterX + (dx > 0 ? squareWidth/2 : -squareWidth/2)
                 targetSide = dx > 0 ? 'right' : 'left'
             } else {
                 // Widget is below, attach to bottom
                 y2 = squareCenterY + (dy > 0 ? squareHeight/2 : -squareHeight/2)
                 targetSide = 'bottom'
             }

             // Offset Logic for Knobs
             const offset = 5
             
             // Source (Widget) - Left or Right
             let anchorX1 = x1
             let anchorY1 = knobY
             if (sourceSide === 'left') {
                 x1 = toggleRect.left - containerRect.left - offset
             } else {
                 x1 = toggleRect.right - containerRect.left + offset
             }

             // Target (Square)
             let anchorX2 = x2
             let anchorY2 = y2
             if (targetSide === 'left') x2 -= offset
             if (targetSide === 'right') x2 += offset
             if (targetSide === 'bottom') y2 += offset
             
             setKnobsConnection({ x1, y1: knobY, x2, y2, anchorX1, anchorY1: knobY, anchorX2, anchorY2, sourceSide, targetSide })
        } else {
            setKnobsConnection(null)
        }
    } else {
      setKnobsConnection(null)
    }

  }, [synthSelectedSquare, knobsPosition, globalPanelPosition, mixerPosition, spectrogramPosition, liveCodePosition, knobsOn, globalPanelOn, mixerOn, spectrogramOn, liveCodeOn, activeWidgetOrder, resizeTick])

  const handleWidgetHeaderClick = useCallback((id: string) => {
    setActiveWidgetOrder(prev => {
        const filtered = prev.filter(wId => wId !== id)
        return [...filtered, id]
    })
  }, [])

  const markWidgetToggleLayerReady = useCallback(() => setWidgetTogglesReady(true), [])
  const widgetToggleItems = useMemo(() => [
    { id: 'spectrogram', label: 'Spectrogram', ref: spectrogramToggleRef, isOn: spectrogramOn, cityColor: city.color, onToggle: () => toggleWidget('spectrogram', setSpectrogramOn), position: spectrogramPosition ?? { x: 0, y: 0 }, onPositionChange: setSpectrogramPosition, onDragStart: () => handleWidgetHeaderClick('spectrogram') },
    { id: 'knobs', label: 'Piece Params', ref: knobsToggleRef, isOn: knobsOn, cityColor: city.color, onToggle: () => togglePlayerTurnPanel('knobs', knobsOn, setKnobsOn, knobsManuallyClosedRef), position: knobsPosition ?? { x: 0, y: 0 }, onPositionChange: setKnobsPosition, onDragStart: () => handleWidgetHeaderClick('knobs') },
    { id: 'globalPanel', label: 'Board Params', ref: globalPanelToggleRef, isOn: globalPanelOn, cityColor: city.color, onToggle: () => toggleWidget('globalPanel', setGlobalPanelOn), position: globalPanelPosition ?? { x: 0, y: 0 }, onPositionChange: setGlobalPanelPosition, onDragStart: () => handleWidgetHeaderClick('globalPanel') },
    { id: 'mixer', label: 'Mixer', ref: mixerToggleRef, isOn: mixerOn, cityColor: city.color, onToggle: () => togglePlayerTurnPanel('mixer', mixerOn, setMixerOn, mixerManuallyClosedRef), position: mixerPosition ?? { x: 0, y: 0 }, onPositionChange: setMixerPosition, onDragStart: () => handleWidgetHeaderClick('mixer') },
    { id: 'liveCode', label: 'Debug', ref: liveCodeToggleRef, isOn: liveCodeOn, cityColor: city.color, onToggle: () => toggleWidget('liveCode', setLiveCodeOn), position: liveCodePosition ?? { x: 0, y: 0 }, onPositionChange: setLiveCodePosition, onDragStart: () => handleWidgetHeaderClick('liveCode') },
  ], [city.color, codeBackdropOn, globalPanelOn, globalPanelPosition, handleWidgetHeaderClick, knobsOn, knobsPosition, liveCodePosition, liveCodeOn, mixerOn, mixerPosition, music.enabled, spectrogramOn, spectrogramPosition, resizeTick, togglePlayerTurnPanel, toggleWidget])

  const widgetsContent = (mobileMode: boolean) => {
      const commonStyle = mobileMode ? { position: 'static' as const, width: '100%', zIndex: 10 } : undefined
      const togglePortalized = !mobileMode && widgetTogglesReady
      return (
          <>
            <SpectrogramWidget
                getFrequencyData={music.enabled && music.engineActive ? music.getFrequencyData : undefined}
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
            />

            <SynthControlPanel
                instrument={music.enabled ? music.instrument : undefined}
                onInstrumentChange={music.updateInstrument}
                playback={knobsOn && music.enabled && music.selected ? <>
                  {music.selected.activation === 'check' && <p className="text-[10px] text-amber-200">Ativa temporariamente pelo cheque da sua equipe.</p>}
                  <MusicVoiceReadout variationTabs showStatus={false} instrument={music.instrument ?? undefined} onInstrumentChange={music.updateInstrument} monitor={music.monitor} id={music.selected.id} snapshot={music.snapshot} manual={music.preview?.id === music.selected.id && music.preview.mode === 'manual'} />
                </> : undefined}
                ref={knobsRef}
                toggleRef={knobsToggleRef}
                togglePortalized={togglePortalized}
                monitor={knobsOn && music.enabled ? music.monitor : undefined}
                monitorId={knobsOn && music.enabled ? music.selected?.id : undefined}
                selectedSquare={music.enabled ? music.selected?.square ?? null : synthSelectedSquare as Square | null}
                selectedStatus={music.enabled && music.selected ? <MusicVoiceBadge monitor={music.monitor} id={music.selected.id} /> : undefined}
                selectedPieceInfo={(() => {
                    if (music.enabled) return music.instrument?.name ?? null
                    if (!synthSelectedSquare) return null
                    // @ts-ignore
                    const piece = game.get(synthSelectedSquare as Square)
                    if (!piece) return "Empty"
                    const instrumentMap: Record<string, string> = {
                        p: "Drums", n: "Bass", b: "Piano", r: "Pad", q: "Lead", k: "Lead",
                    }
                    const pieceNameMap: Record<string, string> = {
                        p: "Pawn", n: "Knight", b: "Bishop", r: "Rook", q: "Queen", k: "King",
                    }
                    return `${piece.color === "w" ? "White" : "Black"} ${pieceNameMap[piece.type]} - ${instrumentMap[piece.type]}`
                })()}
                pieceSvg={(() => {
                    if (music.enabled && music.selected) return PiecesSVG[`${music.selected.color}${music.selected.type.toUpperCase()}` as keyof typeof PiecesSVG]
                    if (!synthSelectedSquare) return null
                    const piece = game.get(synthSelectedSquare as Square)
                    return piece ? PiecesSVG[`${piece.color}${piece.type.toUpperCase()}` as keyof typeof PiecesSVG] : null
                })()}
                effects={music.enabled ? (music.selected ? music.effects[music.selected.id] ?? { ...DEFAULT_EFFECTS, lpf: music.instrument?.lpf, hpf: music.instrument?.hpf, reverb: 0.12, decay: 0.15 } : DEFAULT_EFFECTS) : synthSelectedSquare ? squareEffects[synthSelectedSquare] || DEFAULT_EFFECTS : DEFAULT_EFFECTS}
                onEffectChange={(key, value) => {
                    if (music.enabled) {
                      if (!music.selected) return
                      music.setPieceEffect(key, value)
                      return
                    }
                    if (!synthSelectedSquare) return
                    setSquareEffects((prev) => ({
                        ...prev,
                        [synthSelectedSquare]: { ...(prev[synthSelectedSquare] || DEFAULT_EFFECTS), [key]: value },
                    }))
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

            {!music.enabled && <GlobalControlPanel
                showAmbience={!music.enabled}
                ref={globalPanelRef}
                toggleRef={globalPanelToggleRef}
                togglePortalized={togglePortalized}
                effects={globalEffects}
                onEffectChange={handleGlobalEffectChange}
                cityColor={city.color}
                position={mobileMode ? undefined : (globalPanelPosition || undefined)}
                onPositionChange={(pos) => setGlobalPanelPosition(pos)}
                handleRef={globalPanelHandleRef}
                isOn={globalPanelOn}
                onToggle={() => toggleWidget('globalPanel', setGlobalPanelOn)}
                style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('globalPanel') + 10 }}
                onClickCapture={() => handleWidgetHeaderClick('globalPanel')}
            />}

            <MixerWidget
              teamMixes={music.teamMixes}
              sessionId={city.id}
              effects={{ ...globalEffects, bpm: music.snapshot.bpm, volume: music.snapshot.volume }}
              monitor={music.monitor}
                onEffectChange={handleGlobalEffectChange}
                topColor={boardOrientation === "white" ? "b" : "w"}
                onTeamMixChange={music.updateTeamMix}
                ref={mixerRef}
                handleRef={mixerHandleRef}
                toggleRef={mixerToggleRef}
                togglePortalized={togglePortalized}
                cityColor={city.color}
                position={mobileMode ? undefined : (mixerPosition || undefined)}
                onPositionChange={setMixerPosition}
                isOn={mixerOn}
                onToggle={() => togglePlayerTurnPanel("mixer", mixerOn, setMixerOn, mixerManuallyClosedRef)}
                style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('mixer') + 10 }}
                onClickCapture={() => handleWidgetHeaderClick('mixer')}
            />

            {codeBackdropOn && <LiveCodeWidget
                stockfishDebugOn={stockfishDebugOn}
                onToggleStockfishDebug={toggleStockfishDebug}
                onForceWin={forceWin}
                playback={liveCodeOn && music.enabled && music.engineActive ? <>
                  <div role="status">{music.error ? <span className="text-red-400">Áudio: {music.error}</span> : music.preview ? <span className="text-orange-300">TOCANDO · {music.instrument?.name} · {music.preview.square}</span> : <span className="text-white/60">{music.activeSquares.size} vozes ativas</span>}</div>
                  {music.attackingColor && <div className="text-amber-200">CHEQUE · lado atacante {music.attackingColor === 'w' ? 'branca' : 'preta'}</div>}
                  {music.reactionDescriptions.map((description, i) => <div key={i}>{description}</div>)}
                  <MusicTransportReadout monitor={music.monitor} />
                  <MusicHarmonyReadout monitor={music.monitor} />
                  <MoveAnalysisReadout analysis={displayedAnalysis} status={evaluationError ?? (game.isGameOver() ? "Partida encerrada." : undefined)} />
                </> : undefined}
                ref={liveCodeRef}
                toggleRef={liveCodeToggleRef}
                togglePortalized={togglePortalized}
                handleRef={liveCodeHandleRef}
                pattern={music.enabled ? music.code : currentPattern}
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
          </>
      )
  }

  return (
    <div
      ref={rootRef}
      className={cn("relative w-full h-[100dvh] max-h-[100dvh] max-w-[100vw] bg-background select-none flex flex-col", isMobile ? "overflow-x-hidden overflow-y-auto" : "overflow-hidden")}
      onClick={() => {
        setSynthSelectedSquare(null)
      }}
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
      <style jsx global>{`
        .continue-btn:hover {
            border-color: var(--city-neon) !important;
            box-shadow: 0 0 15px var(--city-neon) !important;
        }
      `}</style>
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-[3000ms]"
        style={{
            backgroundImage: `url(${city.image})`,
            filter: (!isBackgroundDark && introPhase < 3) 
                ? "grayscale(0%) contrast(100%) brightness(100%) blur(0px)"
                : "grayscale(100%) contrast(120%) brightness(30%) blur(0px)", // Darken for game
            opacity: (!isBackgroundDark && introPhase < 3) ? 0.8 : 0.4
        }}
      />
      
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(${city.color}20 1px, transparent 1px),
            linear-gradient(90deg, ${city.color}20 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {codeBackdropOn && introPhase === 3 && (
        <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden opacity-75" aria-hidden="true">
          <pre className="h-full w-full overflow-hidden whitespace-pre-wrap break-all px-6 pb-6 pt-14 font-mono text-[10px] leading-4 text-[#78ff93] [text-shadow:0_0_6px_rgba(57,255,20,0.55)]">
            {music.enabled ? music.code : currentPattern}
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
                              {phrase}
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
                                {city.introPhrases?.[city.introPhrases.length - 1] || "CONTINUE"}
                              </span>
                          </Button>
                      </div>
                  </div>
              )}

              {/* Intro Phase 1 & 2: City title before the board enters */}
              {(introPhase === 1 || introPhase === 2) && (
                  <div className="flex flex-col items-center gap-3 md:gap-4 w-full px-4 text-center">
                      <h2
                          onTransitionEnd={event => {
                            if (introExitStarted && event.propertyName === 'text-shadow') setShowIntroBoxes(false)
                          }}
                          className={cn(
                              "text-5xl md:text-7xl lg:text-8xl font-black transition-[opacity,text-shadow]",
                              showIntroBoxes ? "opacity-100" : "opacity-0"
                          )}
                          style={{
                            color: 'black',
                            textShadow: showIntroGlow ? `0 0 15px ${city.color}, 0 0 30px ${city.color}` : '0 0 0 transparent, 0 0 0 transparent',
                            transitionProperty: 'opacity, text-shadow',
                            transitionDuration: introExitStarted ? (showIntroBoxes ? '0ms, 1500ms' : '1000ms, 0ms') : '700ms, 0ms',
                          }}
                      >
                          {city.name.toUpperCase()}
                      </h2>
                      <p
                          className={cn(
                              "text-3xl md:text-4xl font-normal transition-[opacity,text-shadow]",
                              showIntroBoxes ? "opacity-100" : "opacity-0"
                          )}
                          style={{
                            color: 'black',
                            textShadow: showIntroGlow ? `0 0 15px ${city.color}, 0 0 30px ${city.color}` : '0 0 0 transparent, 0 0 0 transparent',
                            transitionProperty: 'opacity, text-shadow',
                            transitionDuration: introExitStarted ? (showIntroBoxes ? '0ms, 1500ms' : '1000ms, 0ms') : '700ms, 0ms',
                          }}
                      >
                          {city.genre} ({city.year})
                      </p>
                  </div>
              )}
          </div>
          </div>
      )}

      {/* Header */}
      <header 
        className={cn(
          "absolute top-0 left-0 w-full flex items-center justify-between px-4 md:px-6 py-3 border-b border-transparent bg-transparent transition-opacity duration-1000 pointer-events-none",
          introPhase < 3 ? "z-[110] opacity-100" : "z-20 opacity-100"
        )}
        style={{ "--city-neon": city.color } as React.CSSProperties}
      >
        <div className={cn("flex min-w-0 items-center gap-3 pointer-events-auto", introPhase < 3 && "relative z-[111]")}>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="shrink-0 hover:text-white hover:bg-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black transition-all"
            style={{ 
                "--city-neon": city.color,
                backgroundColor: "var(--city-neon)20"
            } as React.CSSProperties}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className={cn("transition-opacity duration-500", introPhase < 3 ? "opacity-0" : "opacity-100")}>
            <h1 className="font-mono font-bold text-base md:text-lg flex min-w-0 items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: city.color }} />
              <span className="hidden truncate sm:inline" style={{ color: city.color }}>{city.name.toUpperCase()}</span>
            </h1>
          </div>
        </div>

        <div className={cn("flex shrink-0 items-center gap-2 md:gap-3 transition-opacity duration-500 pointer-events-auto", introPhase < 3 ? "opacity-0 pointer-events-none" : "opacity-100")}>
          {/* Settings */}
          <DropdownMenu open={openDropdown === "difficulty"} onOpenChange={open => setOpenDropdown(current => open ? "difficulty" : current === "difficulty" ? null : current)}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                aria-label={`Dificulty: ${aiDifficultyLabel}`}
                className="hidden md:flex min-w-16 justify-center bg-transparent transition-all border-border hover:border-[var(--hover-color)] hover:shadow-[0_0_10px_var(--hover-color)] hover:text-white active:bg-[var(--hover-color)] active:text-black"
                style={{
                    "--hover-color": city.color
                } as React.CSSProperties}
              >
                <span className="px-1 text-xs font-mono">{aiDifficultyLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{ "--difficulty-hover": `color-mix(in srgb, ${city.color} 50%, black)` } as React.CSSProperties}
            >
              <DropdownMenuLabel>Dificulty:</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleAIDifficultyChange(5)} style={aiDepth === 5 ? { backgroundColor: city.color, color: "#000" } : undefined} className={cn("justify-between text-white hover:bg-[var(--difficulty-hover)] focus:bg-[var(--difficulty-hover)] data-[highlighted]:bg-[var(--difficulty-hover)]", aiDepth === 5 && "font-bold")}>
                Easy (Skill 0)
                {aiDepth === 5 && <Check className="w-4 h-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIDifficultyChange(10)} style={aiDepth === 10 ? { backgroundColor: city.color, color: "#000" } : undefined} className={cn("justify-between text-white hover:bg-[var(--difficulty-hover)] focus:bg-[var(--difficulty-hover)] data-[highlighted]:bg-[var(--difficulty-hover)]", aiDepth === 10 && "font-bold")}>
                Medium (Skill 5)
                {aiDepth === 10 && <Check className="w-4 h-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIDifficultyChange(15)} style={aiDepth === 15 ? { backgroundColor: city.color, color: "#000" } : undefined} className={cn("justify-between text-white hover:bg-[var(--difficulty-hover)] focus:bg-[var(--difficulty-hover)] data-[highlighted]:bg-[var(--difficulty-hover)]", aiDepth === 15 && "font-bold")}>
                Hard (Skill 12)
                {aiDepth === 15 && <Check className="w-4 h-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIDifficultyChange(20)} style={aiDepth === 20 ? { backgroundColor: city.color, color: "#000" } : undefined} className={cn("justify-between text-white hover:bg-[var(--difficulty-hover)] focus:bg-[var(--difficulty-hover)] data-[highlighted]:bg-[var(--difficulty-hover)]", aiDepth === 20 && "font-bold")}>
                Expert (Skill 20)
                {aiDepth === 20 && <Check className="w-4 h-4 ml-2" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Audio toggle */}
          <div className="flex gap-3">

            <Button
                variant="outline"
                size="icon"
                onClick={toggleCodeBackdrop}
                title="View code / Debug"
                aria-label={codeBackdropOn ? "Ocultar código Strudel e widget Debug" : "Mostrar código Strudel e widget Debug"}
                aria-pressed={codeBackdropOn}
                className="hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black transition-all"
                style={{ "--city-neon": city.color } as React.CSSProperties}
            >
                <Code2 className={cn("w-4 h-4", !codeBackdropOn && "opacity-60")} />
            </Button>
            <Button
                variant="outline"
                size="icon"
                onClick={() => setRestartConfirmOpen(true)}
                title="Restart game"
                aria-label="Restart game"
                className="hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black transition-all"
                style={{ "--city-neon": city.color } as React.CSSProperties}
            >
                <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
                variant="outline" 
                size="icon" 
                onClick={handleToggleMusicEngine}
                title={musicEngineOn ? "Desligar música" : "Ligar música"}
                aria-label={musicEngineOn ? "Desligar música generativa" : "Ligar música generativa"}
                aria-pressed={musicEngineOn}
                className="hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black transition-all"
                style={{ "--city-neon": city.color } as React.CSSProperties}
            >
                <Music2 className={`w-4 h-4 ${musicEngineOn ? '' : 'opacity-35'}`} />
            </Button>
            <Button 
                variant="outline" 
                size="icon" 
                onClick={toggleFullscreen} 
                title={isFullscreen ? "Restaurar" : "Maximizar"}
                aria-label={isFullscreen ? "Restaurar janela" : "Maximizar janela"}
                className="hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black transition-all"
                style={{ "--city-neon": city.color } as React.CSSProperties}
            >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className={cn("relative z-10 w-full flex flex-col lg:block justify-start pointer-events-none", isMobile ? "shrink-0 min-h-full pb-16 pt-4" : "h-full pt-4 lg:pt-0")}
        style={{ "--game-board-width": isMobile ? "min(calc(100vw - 16px),512px)" : "min(90vw,calc(100dvh - 270px),512px)" } as React.CSSProperties}>
        
        {/* Main Game Area (Board Container) */}
        {/* Animated Descent for Phase 2 -> 3 */}
        <div 
            className={cn(
            "flex flex-col items-center justify-start w-full lg:max-w-[512px] mx-auto relative z-10 transition-all duration-[2000ms] ease-out px-2 pointer-events-none",
                introPhase < 2 ? "-translate-y-[150vh]" : introPhase === 2 ? "translate-y-[25vh]" : "lg:pt-6"
            )}
            style={{
                // If introPhase is 3 (Game Active), we reset transform to allow normal layout flow
                transform: introPhase === 3 ? "none" : undefined,
                marginTop: introPhase === 3 ? (!isMobile ? 'calc(50vh - 350px)' : '48px') : undefined
            }}
        >
          <div
            className="w-full max-w-full flex flex-col items-center relative pointer-events-none"
            ref={centerContainerRef}
          >

            {music.tonality && music.baseTonality && music.harmony && <div className="mb-[30px] grid w-[var(--game-board-width)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 pointer-events-none">
              <div role="img" aria-label={`${STARTING_MATCH_GOLDEN_EGGS} golden egg for the opponent`} className={cn("flex w-fit items-center gap-1.5 rounded-md border border-zinc-500/20 bg-black/45 px-2 py-1 font-mono text-xs font-bold text-zinc-400/50 transition-opacity duration-1000", introPhase < 3 ? "opacity-0" : "opacity-100")}>
                <span>{STARTING_MATCH_GOLDEN_EGGS}</span>
                <span aria-hidden="true" className="inline-block h-[19px] w-[15px] rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_32%_25%,#fff8c4_0%,#facc15_43%,#b45309_100%)] opacity-40 grayscale" />
              </div>
              <div className="min-w-0 pointer-events-auto">
                <BoardMusicSelectors cityColor={city.color} tonality={music.tonality} baseTonality={music.baseTonality} currentScaleLabel={music.currentScaleLabel} onTonalityChange={music.setTonality} harmony={music.harmony} onHarmonyChange={music.setHarmony} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} />
              </div>
              <div ref={eggCounterRef} role="img" aria-label={`${visibleEggs} golden egg${visibleEggs === 1 ? "" : "s"} for you`} title={`${visibleEggs} golden egg${visibleEggs === 1 ? "" : "s"}`} className={cn("ml-auto flex h-8 w-full max-w-14 min-w-0 items-center justify-center gap-1.5 rounded-md border bg-black/45 px-2 font-mono text-xs font-bold transition-opacity duration-1000", visibleEggs === 0 ? "border-red-500/80 text-red-400" : "border-amber-400/50 text-amber-200", introPhase < 3 ? "opacity-0" : "opacity-100")}>
                <span>{visibleEggs.toLocaleString()}</span>
                <span aria-hidden="true" className="inline-block h-[19px] w-[15px] rounded-[50%_50%_45%_45%/60%_60%_40%_40%] bg-[radial-gradient(circle_at_32%_25%,#fff8c4_0%,#facc15_43%,#b45309_100%)] shadow-[0_0_8px_#fbbf24]" />
              </div>
            </div>}

            <div className="min-h-[2rem] h-8 w-[var(--game-board-width)] pointer-events-none">
              <div ref={capturedPiecesViewportRef} className="h-full w-full overflow-hidden">
                <div
                  ref={capturedPiecesContentRef}
                  className="flex h-full w-max min-w-full items-center justify-between gap-0.5"
                  style={{ transform: `scale(${capturedPiecesScale})`, transformOrigin: "left center" }}
                >
                  <div className="flex shrink-0 justify-start gap-0.5">
                    {capturedPieces.black.map((p, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 shrink-0 opacity-90 p-0.5"
                        dangerouslySetInnerHTML={{
                          __html: PiecesSVG[`w${p.toUpperCase()}` as keyof typeof PiecesSVG],
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex shrink-0 justify-end gap-0.5">
                    {capturedPieces.white.map((p, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 shrink-0 opacity-90 p-0.5"
                        style={{
                          "--city-neon": city.color,
                          filter:
                            "drop-shadow(1px 0 0 var(--city-neon)) drop-shadow(-1px 0 0 var(--city-neon)) drop-shadow(0 1px 0 var(--city-neon)) drop-shadow(0 -1px 0 var(--city-neon))",
                        } as React.CSSProperties}
                        dangerouslySetInnerHTML={{
                          __html: PiecesSVG[`b${p.toUpperCase()}` as keyof typeof PiecesSVG],
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-20 pointer-events-none">
              {/* Board Area - Moved to Top */}
              <div
                className="w-[var(--game-board-width)] aspect-square relative z-20 mb-2 sm:mb-4 pointer-events-auto"
                ref={boardAreaRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    transform: `scale(${boardScale})`,
                    transition: 'transform 0.3s ease-out'
                }}
              >
                  <ChessgroundBoard 
                  game={game} 
                  undoAnimationKey={undoAnimationKey}
                  orientation={boardOrientation}
                  onMove={handlePlayerMove} 
                  armedPower={armedPower}
                  onPowerTarget={targetPower}
                  matchPowers={matchPowers}
                  isMoveAllowed={move => permitsPowerMove(move, matchPowersRef.current, game.history().length + 1)}
                  cityColor={city.color} 
                  isThinking={isThinking} 
                  synthSelectedSquare={music.enabled ? music.selected?.square ?? null : synthSelectedSquare as Square | null}
                  activeSquares={music.enabled ? music.activeSquares : activeSquares}
                  onPieceHold={music.enabled && music.engineActive ? music.audition : undefined}
                  onPieceRelease={music.enabled && music.engineActive ? music.releaseAudition : undefined}
                  onPieceCancel={music.enabled && music.engineActive ? music.endAudition : undefined}
                  musicPulseMonitor={music.enabled && music.engineActive ? music.pulseMonitor : undefined}
                  analysisArrows={analysisArrows}
                  rankedMoveMark={rankedMoveMark}
                  rankedMoveAnnouncement={rankedMoveAnnouncement}
                  onBoardClick={(square) => {
                    if (music.enabled) { music.select(square); return }
                    setSynthSelectedSquare(square)
                    const piece = game.get(square as Square)
                    if (piece) {
                      playSquareSample(square, piece.type, piece.color)
                    } else {
                      playSquareSample(square)
                    }
                  }}
                  onPieceDoubleTap={(square) => {
                    if (introPhase !== 3 || game.turn() !== "w" || game.isGameOver()) return
                    const piece = game.get(square)
                    if (!piece) return
                    let turnedOn = false
                    if (music.enabled) {
                      turnedOn = music.togglePiece(square)
                    } else {
                      turnedOn = !activeSquares.has(square)
                      setActiveSquares(current => {
                        const next = new Set(current)
                        if (turnedOn) next.add(square)
                        else next.delete(square)
                        return next
                      })
                    }
                    if (turnedOn && !isPlaying && (!music.enabled || music.engineActive)) {
                      setHasPlaybackStarted(true)
                      setIsPlaying(true)
                      void togglePlayback()
                    }
                    if (panelsFollowPlayerTurn && !knobsOn && !knobsManuallyClosedRef.current) {
                      setKnobsOn(true)
                      setActiveWidgetOrder(current => [...current.filter(id => id !== 'knobs'), 'knobs'])
                                  }
                  }}
                  onDragOverSquare={(from, to) => {
                    if (music.enabled) {
                      if (music.engineActive) music.audition(from, to)
                      return
                    }
                    if (from === to) return
                    const piece = game.get(from as Square)
                    if (!piece) return
                    const legalTargets = game.moves({ square: from as Square, verbose: true }).map(m => m.to)
                    const isLegal = legalTargets.includes(to)
                    if (isLegal) {
                      playSquareSample(to, piece.type, piece.color)
                    } else {
                      playIllegalMoveGlitch(piece.type, to)
                    }
                  }}
                />
                {stockfishDebugOn && codeBackdropOn && introPhase === 3 && <StockfishDebugOverlay
                  trace={stockfishTrace}
                  analysis={displayedAnalysis}
                  onClose={toggleStockfishDebug}
                  onRetry={restartStockfish}
                  boardRef={boardAreaRef}
                  position={stockfishDebugPosition}
                  onPositionChange={setStockfishDebugPosition}
                />}
              </div>

              <div className={cn(
                  "relative z-50 mb-1 grid w-[var(--game-board-width)] grid-cols-[1fr_auto_1fr] items-center gap-2 transition-opacity duration-1000 pointer-events-none",
                  introPhase < 3 ? "opacity-0" : "opacity-100"
                )}
              >
                <button ref={element => { powerButtonRefs.current.freeze = element }} type="button" disabled={game.turn() !== 'w' || game.isGameOver()} aria-label="Freeze: escolher uma casa, custa 3 ovos" aria-pressed={armedPower === 'freeze'} title="Freeze · 3 ovos · escolha uma casa" onClick={event => togglePowerTargeting('freeze', event)} onMouseEnter={() => showCostHint('freeze')} onPointerLeave={hideCostHint} onFocus={() => showCostHint('freeze')} onBlur={hideCostHint} className={cn("pointer-events-auto relative flex h-8 w-fit items-center gap-1 rounded-md border bg-black/55 px-2 font-mono text-[10px] uppercase tracking-wide text-cyan-100 transition-colors disabled:opacity-40", armedPower === 'freeze' ? 'border-cyan-300 bg-cyan-900/70 shadow-[0_0_12px_#bcecff88]' : 'border-cyan-300/35 hover:bg-cyan-950/70')}><Snowflake className="h-4 w-4" />Freeze{costHint('freeze', 3)}</button>

                <div
                  className={cn(
                    "text-center text-xs font-mono",
                    (gameStatus.includes("CHECK") || gameStatus.includes("MATE")) && "animate-pulse"
                  )}
                  style={{ color: gameStatus.includes("CHECK") || gameStatus.includes("MATE") ? "#ef4444" : city.color }}
                >{armedPower ? 'Choose a square' : gameStatus}</div>

                <button ref={element => { powerButtonRefs.current.shield = element }} type="button" disabled={game.turn() !== 'w' || game.isGameOver()} aria-label="Shield: escolher uma casa, custa 3 ovos" aria-pressed={armedPower === 'shield'} title="Shield · 3 ovos · escolha uma casa" onClick={event => togglePowerTargeting('shield', event)} onMouseEnter={() => showCostHint('shield')} onPointerLeave={hideCostHint} onFocus={() => showCostHint('shield')} onBlur={hideCostHint} className={cn("pointer-events-auto relative ml-auto flex h-8 w-fit items-center gap-1 rounded-md border bg-black/55 px-2 font-mono text-[10px] uppercase tracking-wide text-sky-100 transition-colors disabled:opacity-40", armedPower === 'shield' ? 'border-sky-300 bg-sky-900/70 shadow-[0_0_12px_#bcecff88]' : 'border-sky-300/35 hover:bg-sky-950/70')}><Shield className="h-4 w-4" />Shield{costHint('shield', 3)}</button>
              </div>

              {/* Time Control Buttons - Moved Below Board */}
              <div className={cn(
                  "grid w-[var(--game-board-width)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center mb-2 sm:mb-4 gap-1 relative z-50 transition-opacity duration-1000 pointer-events-none",
                  introPhase < 3 ? "opacity-0" : "opacity-100"
              )}>
                <Button
                  data-ranked-move-action="best"
                  variant="ghost"
                  size="default"
                  disabled={!displayedAnalysis?.complete || !!evaluationError || analysisArrows.some(arrow => arrow.tone === 'best')}
                  onClick={event => spendEggForAction(event.currentTarget, 1, () => showAnalysisArrows("best"))}
                  onMouseEnter={() => { showCostHint('best'); playClosedAnalysisHat() }}
                  onPointerLeave={() => { hideCostHint(); playClosedAnalysisHat() }}
                  onFocus={() => showCostHint('best')}
                  onBlur={hideCostHint}
                  className="relative w-full max-w-28 h-12 sm:h-16 justify-self-start overflow-visible rounded-md border border-transparent px-1 text-xs font-mono leading-tight text-white/55 whitespace-normal no-underline transition-all hover:bg-[var(--city-neon)] hover:text-white/80 hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ "--city-neon": city.color, backgroundColor: "var(--city-neon)20" } as React.CSSProperties}
                >
                  {costHint('best', 1)}
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center">Best moves</span>
                </Button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={event => spendEggForAction(event.currentTarget, 1, undoMove)}
                    aria-label="Undo · costs 1 golden egg"
                    onMouseEnter={() => { showCostHint('undo'); playControlHoverKick(0.67) }}
                    onPointerLeave={hideCostHint}
                    onFocus={() => showCostHint('undo')}
                    onBlur={hideCostHint}
                    onMouseDown={() => playDrum("oh", 1.5)}
                    disabled={moveHistory.length === 0}
                    className="relative w-12 h-12 sm:w-16 sm:h-16 overflow-visible rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer"
                    style={{ 
                        "--city-neon": city.color,
                        backgroundColor: "var(--city-neon)20" // Default low opacity background
                    } as React.CSSProperties}
                  >
                    {costHint('undo', 1)}
                    <Undo2 className="pointer-events-none absolute inset-0 m-auto h-7 w-7 sm:h-10 sm:w-10" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={handleTogglePlay}
                    onMouseEnter={() => playControlHoverKick()}
                    onMouseDown={() => playDrum("sd", 0.36 + Math.random() * 0.24, 0.94 + Math.random() * 0.12)}
                    onMouseUp={() => playDrum("hh")}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer"
                    style={{ 
                        "--city-neon": city.color,
                        backgroundColor: "var(--city-neon)20"
                    } as React.CSSProperties}
                  >
                    {isPlaying ? <Pause className="w-7 h-7 sm:w-10 sm:h-10" /> : <Play className="w-7 h-7 sm:w-10 sm:h-10" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={redoMove}
                    aria-label="Redo"
                    onMouseEnter={() => playControlHoverKick(0.67)}
                    onMouseDown={() => playDrum("hh", 1.5)}
                    disabled={redoStack.length === 0}
                    className="relative w-12 h-12 sm:w-16 sm:h-16 overflow-visible rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer"
                    style={{ 
                        "--city-neon": city.color,
                        backgroundColor: "var(--city-neon)20"
                    } as React.CSSProperties}
                  >
                    <Redo2 className="pointer-events-none absolute inset-0 m-auto h-7 w-7 sm:h-10 sm:w-10" />
                  </Button>
                </div>
                <Button
                  data-ranked-move-action="worst"
                  variant="ghost"
                  size="default"
                  disabled={!displayedAnalysis?.complete || !!evaluationError || analysisArrows.some(arrow => arrow.tone === 'worst')}
                  onClick={event => spendEggForAction(event.currentTarget, 1, () => showAnalysisArrows("worst"))}
                  onMouseEnter={() => { showCostHint('worst'); playDrum('oh', 0.696) }}
                  onPointerLeave={() => { hideCostHint(); playClosedAnalysisHat() }}
                  onFocus={() => showCostHint('worst')}
                  onBlur={hideCostHint}
                  className="relative w-full max-w-28 h-12 sm:h-16 justify-self-end overflow-visible rounded-md border border-transparent px-1 text-xs font-mono leading-tight text-white/55 whitespace-normal no-underline transition-all hover:bg-[var(--city-neon)] hover:text-white/80 hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ "--city-neon": city.color, backgroundColor: "var(--city-neon)20" } as React.CSSProperties}
                >
                  {costHint('worst', 1)}
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-1 text-center">Worst moves</span>
                </Button>
              </div>

              {isMobile && introPhase >= 3 && <div
                data-mobile-widgets
                className="flex w-[var(--game-board-width)] flex-col gap-5 pt-5 pointer-events-auto [&>[data-widget=piece]]:order-1 [&>[data-widget=mixer]]:order-2 [&>[data-widget=spectrum]]:order-3 [&>[data-widget=strudel]]:order-4 [&>[data-widget=board]]:order-5"
              >{widgetsContent(true)}</div>}
            </div>
          </div>

        </div>
      </div>
      
      {/* Connection Lines Layer - Moved BEHIND widgets and board (z-0 to z-10 range, but above BG) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
        {[knobsConnection, ...chainConnections].map((conn, i) => {
          if (!conn) return null
          
          const startX = conn.x1
          const startY = conn.y1
          const endX = conn.x2
          const endY = conn.y2
          
          // Standard S-curve (Cubic Bezier)
          // Adjust control points based on exit/entry direction
          const dist = Math.hypot(endX - startX, endY - startY)
          const handleLen = dist * 0.5

          let cp1x = startX, cp1y = startY
          let cp2x = endX, cp2y = endY

          switch(conn.sourceSide) {
              case 'left': cp1x -= handleLen; break;
              case 'right': cp1x += handleLen; break;
              case 'top': cp1y -= handleLen; break;
              case 'bottom': cp1y += handleLen; break;
          }

          switch(conn.targetSide) {
              case 'left': cp2x -= handleLen; break;
              case 'right': cp2x += handleLen; break;
              case 'top': cp2y -= handleLen; break;
              case 'bottom': cp2y += handleLen; break;
          }

          const r = 4 // Handle radius

          // Source Handle (Widget) - Anchored to widget edge, bulging OUTWARDS
          let sourceHandlePath = ""
          const ax1 = (conn as any).anchorX1 ?? startX // Fallback if type issue, though we added it
          const ay1 = (conn as any).anchorY1 ?? startY

          if (conn.sourceSide === 'left') {
              // Bulge Left (CCW, sweep 0)
              sourceHandlePath = `M ${ax1} ${ay1 - r} A ${r} ${r} 0 0 0 ${ax1} ${ay1 + r}`
          } else if (conn.sourceSide === 'right') {
              // Bulge Right (CW, sweep 1)
              sourceHandlePath = `M ${ax1} ${ay1 - r} A ${r} ${r} 0 0 1 ${ax1} ${ay1 + r}`
          } else if (conn.sourceSide === 'top') {
              // Bulge Up (CW, sweep 1 - FLIPPED) 
              // Start (-4, 0). End (4, 0). Vector Right. 
              sourceHandlePath = `M ${ax1 - r} ${ay1} A ${r} ${r} 0 0 1 ${ax1 + r} ${ay1}`
          } else if (conn.sourceSide === 'bottom') {
              // Bulge Down (CCW, sweep 0 - FLIPPED)
              sourceHandlePath = `M ${ax1 - r} ${ay1} A ${r} ${r} 0 0 0 ${ax1 + r} ${ay1}`
          }

          // Target Handle - Anchored to widget edge, bulging OUTWARDS
          let targetHandlePath = ""
          const ax2 = (conn as any).anchorX2 ?? endX
          const ay2 = (conn as any).anchorY2 ?? endY

          if (conn.targetSide === 'bottom') {
              // Bulge Down (CCW, sweep 0 - FLIPPED)
              targetHandlePath = `M ${ax2 - r} ${ay2} A ${r} ${r} 0 0 0 ${ax2 + r} ${ay2}`
          } else if (conn.targetSide === 'left') {
              targetHandlePath = `M ${ax2} ${ay2 - r} A ${r} ${r} 0 0 0 ${ax2} ${ay2 + r}`
          } else if (conn.targetSide === 'right') {
              targetHandlePath = `M ${ax2} ${ay2 - r} A ${r} ${r} 0 0 1 ${ax2} ${ay2 + r}`
          } else if (conn.targetSide === 'top') {
              // Bulge Up (CW, sweep 1 - FLIPPED)
              targetHandlePath = `M ${ax2 - r} ${ay2} A ${r} ${r} 0 0 1 ${ax2 + r} ${ay2}`
          }

          return (
             <React.Fragment key={i}>
               <path
                 d={`M ${startX} ${startY} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${endX} ${endY}`}
                 stroke="white"
                 strokeWidth={1.5}
                 fill="none"
                 className="opacity-20"
               />
               {sourceHandlePath && (
                   <path
                       d={sourceHandlePath}
                       fill="white"
                       className="opacity-20"
                   />
               )}
               {targetHandlePath && (
                   <path
                       d={targetHandlePath}
                       fill="white"
                       className="opacity-20"
                   />
               )}
             </React.Fragment>
          )
        })}
      </svg>

      <div className={cn("transition-opacity duration-1000", introPhase < 2 ? "opacity-0 pointer-events-none" : "opacity-100")}>
      {!isMobile && widgetsContent(false)}
      </div>
      {!isMobile && introPhase >= 2 && <WidgetToggleLayer items={widgetToggleItems} onReady={markWidgetToggleLayerReady} />}

      <div className={cn("fixed inset-x-0 bottom-0 z-[40] w-full pointer-events-none transition-opacity duration-1000", introPhase < 3 ? "opacity-0" : "opacity-100")}>
        <div aria-label="Histórico de jogadas" className="flex h-6 w-full items-center overflow-hidden bg-black/65 px-3 pointer-events-auto">
          <div ref={movesTickerRef} className="flex w-full items-center justify-start gap-3 overflow-x-auto whitespace-nowrap font-mono text-xs scrollbar-hide" style={{ textShadow: "1px 1px 1px black" }}>
            {moveHistory.map((move, i) => <span key={i} className={i % 2 === 0 ? "text-white" : "text-muted-foreground"}>
              {i % 2 === 0 ? `${Math.floor(i / 2) + 1}.` : ""} {move}
            </span>)}
          </div>
        </div>
        <div className="relative h-2 w-full overflow-hidden border-t border-white/10 bg-black/40 select-none" role="img" aria-label={`Avaliação da posição: ${evaluationError ? 'indisponível' : lastEvalScore === null ? 'em análise' : formatEvaluation(lastEvalScore, lastEvalMate)}`}>
          <div className={cn("absolute inset-y-0 left-0 bg-white ease-in-out", lastEvalScore === null ? "transition-none" : "transition-[width] duration-1000", thermometerDimmed ? "opacity-25" : "opacity-100")} style={{ width: `${whitePercent}%` }} />
          {isEvaluating && <div className="absolute right-2 top-1/2 z-30 -translate-y-1/2"><Loader2 className="h-2 w-2 animate-spin text-white" /></div>}
        </div>
      </div>

      <Dialog open={gameplayTipOpen} onOpenChange={setGameplayTipOpen}>
        <DialogContent className="z-[140] max-w-md border-amber-300/40 bg-[#101713] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="font-mono text-amber-200">Tip</DialogTitle>
            <DialogDescription className="whitespace-pre-line pt-2 text-base leading-relaxed text-white/80">
              Chickens likes to do shit.{"\n"}Make one of the worst plays for any moment, and earn 3 golden eggs to play with.
            </DialogDescription>
          </DialogHeader>
          <Button autoFocus onClick={() => setGameplayTipOpen(false)} className="mt-2 w-full bg-amber-400 text-black hover:bg-amber-300">Ok!</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={restartConfirmOpen} onOpenChange={setRestartConfirmOpen}>
        <DialogContent className="z-[140] max-w-md border-white/20 bg-[#101713] p-6 text-white">
          <DialogHeader>
            <DialogTitle className="font-mono text-white">Deseja reiniciar a partida?</DialogTitle>
            <DialogDescription className="pt-2 text-white/70">
              O progresso atual da partida será perdido.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRestartConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setRestartConfirmOpen(false); resetGame() }} className="bg-[var(--city-neon)] text-black hover:opacity-90" style={{ "--city-neon": city.color } as React.CSSProperties}>Confirmar</Button>
          </div>
        </DialogContent>
      </Dialog>



      {/* Bottom Right Info & Version */}
      <div 
        className="hidden sm:flex absolute bottom-9 right-3 z-30 pointer-events-auto items-center gap-2 bg-background/80 backdrop-blur-sm p-1.5 px-2.5 rounded-lg border border-border shadow-sm"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <VersionChangelog />
      </div>
      <div 
        className="flex sm:hidden absolute bottom-9 right-2 z-30 pointer-events-auto items-center gap-1.5 bg-background/80 backdrop-blur-sm py-0.5 px-2 rounded border border-border/60 shadow-sm"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <VersionChangelog />
      </div>

      {armedPower && createPortal(
        <div ref={powerCursorRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[9999] flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/60 bg-black/75 text-cyan-100 opacity-0 shadow-[0_0_12px_rgba(165,243,252,.55)]" style={{ transform: 'translate3d(-100px, -100px, 0)' }}>
          {armedPower === 'freeze' ? <Snowflake className="h-[18px] w-[18px]" /> : <Shield className="h-[18px] w-[18px]" />}
        </div>, document.body,
      )}

    </div>
  )
}
