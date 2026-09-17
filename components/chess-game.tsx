"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { Chess, type Move, type Square } from "chess.js"
import { cn } from "@/lib/utils"
import type { CityData } from "@/lib/cities-data"
import { ChessgroundBoard, PiecesSVG } from "./chessground-board"
import { LiveCodeOverlay } from "./live-code-overlay"
import { LiveCodeWidget } from "./live-code-widget"
import { AudioVisualizer } from "./audio-visualizer"
import { GameControls } from "./game-controls"
import { GameInfo } from "./game-info"
import { SynthControlPanel } from "./synth-control-panel"
import { generateStrudelPattern } from "@/lib/strudel-engine"
import { useMusic } from "@/hooks/use-music"
import { MusicTransportReadout, MusicVoiceReadout } from './music-playback'
import { VersionChangelog } from './version-changelog'
import { Draggable } from './ui/draggable'
import { useAudio } from "@/hooks/use-audio"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import type { SquareEffectMap } from "@/lib/types"
import { DEFAULT_EFFECTS, DEFAULT_GLOBAL_EFFECTS, type GlobalEffects } from "@/lib/types"
import { ArrowLeft, Music2, Settings2, Undo2, Redo2, Pause, Power, Play, Check, RotateCcw, Loader2, Maximize, Minimize, Plus, Minus, Search } from "lucide-react"
import { toast } from "sonner"
import { conquerCity, unlockNextCity } from "@/lib/game-progression"
import { GlobalControlPanel } from "./global-control-panel"
import { SpectrogramWidget } from "./spectrogram-widget"
import { isConstrainedDevice } from "@/lib/performance"

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
}

export function ChessGame({ city, onBack }: ChessGameProps) {
  const [game, setGame] = useState(new Chess())
  const [currentPattern, setCurrentPattern] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [moveHistory, setMoveHistory] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([]) // Stack of SAN moves to redo
  const [gameStatus, setGameStatus] = useState<string>("Your move")
  const [aiDepth, setAiDepth] = useState(10) // Initialize with default, update in useEffect
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({
    white: [],
    black: [],
  })
  
  // Sync aiDepth when city changes
  useEffect(() => {
    console.log("City changed to:", city.name, "Default Depth:", city.aiDepth)
    setAiDepth(city.aiDepth || 10)
  }, [city])

  const [activeSquares, setActiveSquares] = useState<Set<string>>(new Set())
  const [synthSelectedSquare, setSynthSelectedSquare] = useState<string | null>(null)
  const [squareEffects, setSquareEffects] = useState<SquareEffectMap>({})
  const [globalEffects, setGlobalEffects] = useState<GlobalEffects>({ ...DEFAULT_GLOBAL_EFFECTS, bpm: city.bpm })
  const [lastEvalScore, setLastEvalScore] = useState<number | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
 
  const stockfishRef = useRef<Worker | null>(null)
  const gameRef = useRef(game)
  const evalStockfishRef = useRef<Worker | null>(null)
  const evalSideToMoveRef = useRef<"w" | "b">("w")
  const evalLastScoreRef = useRef<number | null>(null)
  const evalPendingRef = useRef(false)
  const evalPendingFenRef = useRef<string | null>(null)
  const evalCacheRef = useRef<Map<string, number>>(new Map())
  const lastEvalScoreRef = useRef<number | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const centerContainerRef = useRef<HTMLDivElement | null>(null)
  const knobsRef = useRef<HTMLDivElement | null>(null)
  const knobsHandleRef = useRef<HTMLDivElement | null>(null)
  const knobsToggleRef = useRef<HTMLButtonElement | null>(null)
  const globalPanelRef = useRef<HTMLDivElement | null>(null)
  const globalPanelHandleRef = useRef<HTMLDivElement | null>(null)
  const globalPanelToggleRef = useRef<HTMLButtonElement | null>(null)
  const liveCodeRef = useRef<HTMLDivElement | null>(null)
  const liveCodeHandleRef = useRef<HTMLDivElement | null>(null)
  const liveCodeToggleRef = useRef<HTMLButtonElement | null>(null)
  const boardAreaRef = useRef<HTMLDivElement | null>(null)
  const movesTickerRef = useRef<HTMLDivElement>(null)
  const [knobsPosition, setKnobsPosition] = useState<{ x: number; y: number } | null>(null)
  const [globalPanelPosition, setGlobalPanelPosition] = useState<{ x: number; y: number } | null>(null)
  const [spectrogramPosition, setSpectrogramPosition] = useState<{ x: number; y: number } | null>(null)
  const [liveCodePosition, setLiveCodePosition] = useState<{ x: number; y: number } | null>(null)
  
  // Intro State
  // 0 = Intro Text, 1 = Intro Boxes, 2 = Board Descend, 3 = Game Active
  const [introPhase, setIntroPhase] = useState(0)
  const [currentIntroLine, setCurrentIntroLine] = useState(0)
  const [showIntroButton, setShowIntroButton] = useState(false)
  const [showStartButton, setShowStartButton] = useState(false)
  const [showIntroBoxes, setShowIntroBoxes] = useState(false)
  const [isStartPressed, setIsStartPressed] = useState(false)

  const [activeWidgetOrder, setActiveWidgetOrder] = useState<string[]>([])
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const width = window.innerWidth
        const height = window.innerHeight
        const isMobile = width < 768
        
        // Initial Positions
        if (isMobile) {
            // Hide widgets on mobile by default or position off-screen/managed via CSS visibility
            setKnobsPosition({ x: 0, y: 0 })
            setGlobalPanelPosition({ x: 0, y: 0 })
            setSpectrogramPosition({ x: 0, y: 0 })
            setLiveCodePosition({ x: 0, y: 0 })
            
            // Turn off widgets on mobile to maintain clean zero-scroll view
            setKnobsOn(false)
            setGlobalPanelOn(false)
            setSpectrogramOn(false)
            setLiveCodeOn(false)
        } else {
            // Desktop Layout: Random Quadrants
            // Widget dimensions (approx)
            const widgetW = 340
            const padding = 20
            const headerH = 80
            const footerH = 80
            
            // Board dimensions (approx 512px width + some margin)
            const boardHalfWidth = 256
            const centerX = width / 2
            const centerY = height / 2
            
            // Random padding from board (30 to 70px)
            const getBoardPadding = () => 30 + Math.random() * (70 - 30)
            // Random distance from center line (20 to 40px)
            const getCenterPadding = () => 20 + Math.random() * (40 - 20)

            // Leave room for the taller DJ mixer and keep the code below it.
            setGlobalPanelPosition({ 
                x: Math.max(padding, centerX - boardHalfWidth - getBoardPadding() - widgetW),
                y: headerH
            })

            // Compact spectrum below the taller piece inspector.
            setSpectrogramPosition({
                x: Math.min(width - widgetW - padding, centerX + boardHalfWidth + getBoardPadding()),
                y: Math.max(headerH + 560, centerY + getCenterPadding())
            })

            // Top Right (Piece Params / Knobs - stays Top Right)
            // Closer to bottom of quadrant -> centerY - widgetHeight - centerPadding
            setKnobsPosition({ 
                x: Math.min(width - widgetW - padding, centerX + boardHalfWidth + getBoardPadding()), 
                y: Math.max(headerH, centerY - 550 - getCenterPadding())
            })

            // Transport and code below Board Params, clear of Piece Params.
            setLiveCodePosition({
                x: Math.max(padding, centerX - boardHalfWidth - getBoardPadding() - widgetW),
                y: headerH + 600
            })
            
            // Default states
            setSpectrogramOn(false)
            setGlobalPanelOn(false)
            setKnobsOn(false)
            setLiveCodeOn(false)
        }
    }
  }, [])
  
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

  // Seatbelt Sound removed from here (moved below useAudio)
  
  const skipIntro = () => {
      if (introPhase === 0) {
          setCurrentIntroLine(city.introPhrases?.length || 5)
          setShowIntroButton(true)
      }
  }

  const handleContinue = () => {
      // Click sound
      // const clickAudio = new Audio('/sounds/click.mp3') // Placeholder
      playSquareSample('e4') // Reusing for now as requested for click

      // Fade out text, move to Phase 1 (Boxes)
      setIntroPhase(1)
      setTimeout(() => {
          setShowIntroBoxes(true)
          // Play box appear sound
          playSquareSample('e4') // Example sound
          setTimeout(() => {
             setShowStartButton(true)
          }, 1000)
      }, 2000) // Increased to 2000ms as requested
  }

  const handleStartGame = () => {
      // Phase 1.5: Hide button, Darken Background
      setShowStartButton(false)
      setShowIntroBoxes(false)
      setIsBackgroundDark(true)
      
      // Start Volume Fade In - Unmute immediately
      if (engineRef.current) {
          engineRef.current.setGlobalVolume(0)
          // Ensure audio context is running (browsers require user interaction)
          // Safety check: check if context exists before accessing state
          if (engineRef.current.context && engineRef.current.context.state === 'suspended') {
              engineRef.current.context.resume()
          }
      }
      handleGlobalEffectChange("volume", 0)
      
      // Animate volume to 0.8 over 3 seconds
      let vol = 0
      const fadeInterval = setInterval(() => {
          vol += 0.05
          if (vol >= 0.8) {
              vol = 0.8
              clearInterval(fadeInterval)
          }
          handleGlobalEffectChange("volume", vol)
      }, 3000 / (0.8 / 0.05))

      // Wait for background darken (1s) before board descend
      setTimeout(() => {
          setIntroPhase(2) // Board Descend
          setTimeout(() => {
              setIntroPhase(3) // Game Active (Controls appear)
          }, 2000) // Wait for descend animation (matched to 2s duration)
      }, 1000)
  }

  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const checkMobile = () => {
            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
            
            if (mobile) {
                document.body.style.overflow = '' // Allow scroll on mobile for widgets
                document.body.style.position = ''
                document.body.style.width = ''
                document.body.style.height = ''
            } else {
                // Reset styles for desktop if needed, or leave as is
            }
        }
        
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }
  }, [])

    const [knobsOn, setKnobsOn] = useState(false)
  const [globalPanelOn, setGlobalPanelOn] = useState(false)
  const [spectrogramOn, setSpectrogramOn] = useState(false)
  const [liveCodeOn, setLiveCodeOn] = useState(false)
  
  const spectrogramHandleRef = useRef<HTMLDivElement | null>(null)
  const spectrogramToggleRef = useRef<HTMLButtonElement | null>(null)

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

  const music = useMusic(moveHistory, city, isPlaying, globalEffects.bpm, globalEffects.volume, liveCodeOn && (!isMobile || mobileControlsOpen), musicEngineOn)

  const { togglePlayback, playCheckmate, playDrawKalimba, playSquareSample, playIllegalMoveGlitch, playDrum, engineRef } = useAudio(game, city, isPlaying, activeSquares, squareEffects, !music.enabled)

  // A city kit owns its initial tempo. The global control can still change it
  // freely after the kit has been loaded for this match.
  useEffect(() => {
    const kitBpm = music.kitBpm
    const kitVolume = music.kitVolume
    if (kitBpm == null) return
    setGlobalEffects(current => current.bpm === kitBpm && current.volume === kitVolume ? current : { ...current, bpm: kitBpm, volume: kitVolume ?? current.volume })
  }, [city.id, music.kitBpm, music.kitVolume])

  // Seatbelt Sound
  useEffect(() => {
      if (showIntroButton && engineRef.current) {
          engineRef.current.playSeatbelt()
      }
  }, [showIntroButton, engineRef])

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

  // Initialize Stockfish
  useEffect(() => {
    stockfishRef.current = new Worker("/stockfish.js")
    stockfishRef.current.postMessage("uci")
    stockfishRef.current.postMessage("isready")

    stockfishRef.current.onmessage = (event) => {
      const message = event.data as string
      // console.log("Stockfish says:", message)
      if (message.startsWith("bestmove")) {
        console.log("Stockfish returned bestmove:", message)
        const moveStr = message.split(" ")[1]
        if (moveStr && moveStr !== "(none)") {
          makeAIMove(moveStr)
        } else {
            console.warn("Stockfish returned no move:", message)
        }
        setIsThinking(false)
      }
    }

    if (!isConstrainedDevice()) {
      const evalWorker = new Worker("/stockfish.js")
      evalStockfishRef.current = evalWorker
      evalWorker.postMessage("uci")
      evalWorker.postMessage("isready")
      evalWorker.onmessage = (event) => {
        const message = event.data as string
        if (message.startsWith("info")) {
          const mateMatch = message.match(/score mate (-?\d+)/)
          const cpMatch = message.match(/score cp (-?\d+)/)
          if (mateMatch) {
            const mate = parseInt(mateMatch[1], 10)
            const baseScore = mate > 0 ? 10000 : -10000
            const side = evalSideToMoveRef.current
            evalLastScoreRef.current = side === "w" ? baseScore : -baseScore
          } else if (cpMatch) {
            const cp = parseInt(cpMatch[1], 10)
            const side = evalSideToMoveRef.current
            evalLastScoreRef.current = side === "w" ? cp : -cp
          }
        } else if (message.startsWith("bestmove")) {
          const finalScore = evalLastScoreRef.current
          if (finalScore != null && evalPendingRef.current) {
            setLastEvalScore(finalScore)
            lastEvalScoreRef.current = finalScore
            if (evalPendingFenRef.current) {
              evalCacheRef.current.set(evalPendingFenRef.current, finalScore)
            }
          }
          evalPendingRef.current = false
          setIsEvaluating(false)
        }
      }
    }

    return () => {
      stockfishRef.current?.terminate()
      evalStockfishRef.current?.terminate()
    }
  }, [])

  const requestEvaluation = useCallback((gameInstance: Chess) => {
    if (!evalStockfishRef.current) {
      setIsEvaluating(false)
      return
    }
    const fen = gameInstance.fen()
    
    // Check cache first
    if (evalCacheRef.current.has(fen)) {
      console.log("Evaluation Cache Hit for FEN:", fen)
      const cachedScore = evalCacheRef.current.get(fen)!
      setLastEvalScore(cachedScore)
      lastEvalScoreRef.current = cachedScore
      evalPendingRef.current = false
      setIsEvaluating(false)
      return
    }
    
    // Try to find a cache entry without move counters if direct match fails
    const fenParts = fen.split(' ')
    const fenPosition = fenParts.slice(0, 4).join(' ') // Position + Turn + Castling + EnPassant
    
    // Check if any key in cache starts with this position
    // This is O(N) but N (moves in game) is small.
    for (const [key, value] of evalCacheRef.current.entries()) {
        if (key.startsWith(fenPosition)) {
            console.log("Evaluation Cache Soft Hit for FEN:", fen, "Matches:", key)
            setLastEvalScore(value)
            lastEvalScoreRef.current = value
            evalPendingRef.current = false
            setIsEvaluating(false)
            return
        }
    }

    console.log("Evaluation Cache Miss for FEN:", fen)

    evalSideToMoveRef.current = gameInstance.turn()
    evalLastScoreRef.current = null
    evalPendingRef.current = true
    lastEvalScoreRef.current = null
    evalPendingFenRef.current = fen
    setIsEvaluating(true)
    
    if (evalStockfishRef.current) {
      evalStockfishRef.current.postMessage("stop")
      evalStockfishRef.current.postMessage(`position fen ${fen}`)
      evalStockfishRef.current.postMessage("go depth 10")
    }
  }, [])

  // Update pattern when board changes
  useEffect(() => {
    const pattern = generateStrudelPattern(game, city, activeSquares, squareEffects, globalEffects)
    setCurrentPattern(pattern)

    // Update game status
    if (game.isCheckmate()) {
      const winner = game.turn() === "w" ? "Black" : "White"
      setGameStatus(`CHECKMATE - ${winner} wins!`)
      setIsPlaying(false)
      playCheckmate() // Play checkmate sound

      // If White (Player) won
      if (winner === "White") {
        const result = conquerCity(city.id)
        const rankMsg = result.rankedUp ? ` 🎖️ PROMOTED TO ${result.newRank.toUpperCase()}!` : ` Rank: ${result.newRank}`
        toast.success(`CITY CONQUERED! +${result.earnedPoints.toLocaleString()} PTS 🎵`, {
          description: `${result.isFirstTime ? "First conquest reward claimed!" : "Conquest bonus earned!"}${rankMsg} (Total: ${result.profile.points.toLocaleString()} PTS)`,
          duration: Infinity,
          action: {
            label: "RETURN TO MAP",
            onClick: onBack
          }
        })
      } else {
        toast.error("DEFEAT!", {
          description: "Try again to conquer this city and claim the points."
        })
      }
    } else if (game.isDraw() || game.isStalemate()) {
      setGameStatus("DRAW!")
      setIsPlaying(false)
      playDrawKalimba()
      toast("DRAW", {
        description: "The game ended in a draw.",
      })
    } else if (game.isCheck()) {
      setGameStatus("CHECK!")
    } else {
      setGameStatus(game.turn() === "w" ? "Your move" : "AI analyzing...")
    }
  }, [game, city, activeSquares, squareEffects, globalEffects])

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

      const gameCopy = new Chess(currentGame.fen())
      try {
        const from = moveStr.slice(0, 2)
        const to = moveStr.slice(2, 4)
        const promotion = moveStr.length > 4 ? moveStr[4] : undefined

        // Validate move legality to prevent errors
        const legalMoves = gameCopy.moves({ verbose: true })
        const isLegal = legalMoves.some(m => m.from === from && m.to === to && (promotion ? m.promotion === promotion : true))

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
          setGame(gameCopy)
          setMoveHistory((prev) => [...prev, move.san])
          updateCapturedPieces(move)
          setSynthSelectedSquare(null) // Clear selection on AI move

          // Update active squares for AI
          setActiveSquares(prev => {
            const next = new Set(prev)
            next.delete(move.from)
            next.add(move.to)
            // Handle castling
            if (move.san === "O-O" || move.san === "O-O-O") {
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
    [updateCapturedPieces],
  )

  const handlePlayerMove = useCallback(
    (move: Move) => {
      setMoveHistory((prev) => [...prev, move.san])
      setRedoStack([]) // Clear redo stack on new move
      
      // Auto-enable spectrogram on first move
      if (moveHistory.length === 0 && !isConstrainedDevice()) {
          setSpectrogramOn(true)
          setLiveCodeOn(true)
      }

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
        setIsPlaying(true)
        togglePlayback()
      }

      // Undo to get the clean state, then redo
      const gameCopy = new Chess(game.fen())
      setGame(gameCopy)
      gameRef.current = gameCopy // Ensure ref is updated immediately to prevent race conditions with AI

      // Trigger AI move
      console.log("Player moved. Checking game over:", gameCopy.isGameOver())
      if (!gameCopy.isGameOver()) {
        setIsThinking(true)
        console.log("Triggering AI for FEN:", gameCopy.fen())
        setTimeout(() => {
          stockfishRef.current?.postMessage(`position fen ${gameCopy.fen()}`)
          const effectiveDepth = isConstrainedDevice() ? Math.min(aiDepth, 6) : aiDepth
          stockfishRef.current?.postMessage(`go depth ${effectiveDepth}`)
        }, 300)
      } else {
        console.log("Game over detected, AI not triggered.")
      }

      // Update active squares for Player
      setActiveSquares(prev => {
        const next = new Set(prev)
        next.delete(move.from)
        next.add(move.to)
        if (move.san === "O-O" || move.san === "O-O-O") {
          if (move.to === "g1") { next.delete("h1"); next.add("f1"); }
          if (move.to === "c1") { next.delete("a1"); next.add("d1"); }
        }
        return next
      })
      requestEvaluation(gameCopy)
    },
    [game, aiDepth, updateCapturedPieces, isPlaying, togglePlayback, requestEvaluation],
  )

  const resetGame = useCallback(() => {
    stockfishRef.current?.postMessage("stop")
    evalStockfishRef.current?.postMessage("stop")
    setGame(new Chess())
    setMoveHistory([])
    setRedoStack([])
    setIsThinking(false)
    setCapturedPieces({ white: [], black: [] })
    setActiveSquares(new Set())
    setSynthSelectedSquare(null)
    setSquareEffects({})
    music.reset()
    setLastEvalScore(null)
    setIsEvaluating(false)
    evalPendingRef.current = false
    setIsBackgroundDark(false)
  }, [])

  const undoMove = useCallback(() => {
    if (moveHistory.length === 0) return

    // Determine how many steps to undo
    // If AI is thinking (odd moves), undo 1 (player's move) to cancel.
    // If player's turn (even moves), undo 2 (AI + Player) to go back to previous turn.
    const isAiThinking = moveHistory.length % 2 !== 0
    const stepsToUndo = isAiThinking ? 1 : 2
    
    if (moveHistory.length < stepsToUndo) return

    const newHistory = moveHistory.slice(0, -stepsToUndo)
    
    // Rebuild state from scratch for safety
    const newGame = new Chess()
    const newCapturedPieces: { white: string[], black: string[] } = { white: [], black: [] }
    const newActiveSquares = new Set<string>()

    newHistory.forEach(san => {
      const move = newGame.move(san)
      if (move) {
        if (move.captured) {
          if (move.color === "w") newCapturedPieces.white.push(move.captured)
          else newCapturedPieces.black.push(move.captured)
        }
        newActiveSquares.delete(move.from)
        newActiveSquares.add(move.to)
        if (move.san === "O-O" || move.san === "O-O-O") {
          if (move.color === 'w') {
            if (move.to === "g1") { newActiveSquares.delete("h1"); newActiveSquares.add("f1"); }
            if (move.to === "c1") { newActiveSquares.delete("a1"); newActiveSquares.add("d1"); }
          } else {
            if (move.to === "g8") { newActiveSquares.delete("h8"); newActiveSquares.add("f8"); }
            if (move.to === "c8") { newActiveSquares.delete("a8"); newActiveSquares.add("d8"); }
          }
        }
      }
    })

    // Stop AI if thinking
    if (isAiThinking) {
        setIsThinking(false)
        stockfishRef.current?.postMessage("stop")
    }

    // Save undone moves to stack in reverse order (LIFO for redo)
    const movesToUndo = moveHistory.slice(-stepsToUndo).reverse()
    setRedoStack(prev => [...prev, ...movesToUndo])

    setGame(newGame)
    setMoveHistory(newHistory)
    setCapturedPieces(newCapturedPieces as { white: string[], black: string[] })
    setActiveSquares(newActiveSquares)

    // Force FEN update and request evaluation with slight delay to ensure state consistency
    // Also log to debug FEN mismatch
    console.log("Undo to FEN:", newGame.fen())
    requestEvaluation(newGame)
  }, [moveHistory, requestEvaluation])

  const redoMove = useCallback(() => {
    if (redoStack.length === 0) return

    // Pop one move from the stack
    const moveSan = redoStack[redoStack.length - 1]
    const newRedoStack = redoStack.slice(0, -1)

    const gameCopy = new Chess(game.fen())
    const nextCaptured = { white: [...capturedPieces.white], black: [...capturedPieces.black] }
    const nextActiveSquares = new Set(activeSquares)

    const move = gameCopy.move(moveSan)
    if (move) {
        if (move.captured) {
          if (move.color === "w") nextCaptured.white.push(move.captured)
          else nextCaptured.black.push(move.captured)
        }
        nextActiveSquares.delete(move.from)
        nextActiveSquares.add(move.to)
        if (move.san === "O-O" || move.san === "O-O-O") {
          if (move.color === 'w') {
            if (move.to === "g1") { nextActiveSquares.delete("h1"); nextActiveSquares.add("f1"); }
            if (move.to === "c1") { nextActiveSquares.delete("a1"); nextActiveSquares.add("d1"); }
          } else {
            if (move.to === "g8") { nextActiveSquares.delete("h8"); nextActiveSquares.add("f8"); }
            if (move.to === "c8") { nextActiveSquares.delete("a8"); nextActiveSquares.add("d8"); }
          }
        }
        
        setGame(gameCopy)
        setMoveHistory(prev => [...prev, moveSan])
        setRedoStack(newRedoStack)
        setCapturedPieces(nextCaptured)
        setActiveSquares(nextActiveSquares)
        requestEvaluation(gameCopy)
    }
  }, [redoStack, game, activeSquares, capturedPieces, requestEvaluation])

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

  const handleTogglePlay = useCallback(async () => {
    if (!isPlaying) {
        // Auto-activate Board Params (Global Control Panel) when play starts
        setGlobalPanelOn(true)
        setActiveWidgetOrder(prev => prev.includes('globalPanel') ? prev : [...prev, 'globalPanel'])
    }
    await togglePlayback()
    setIsPlaying((prev) => !prev)
  }, [togglePlayback, isPlaying])

  const handleToggleMusicEngine = useCallback(() => setMusicEngineOn(current => !current), [])

  const hasStarted = moveHistory.length > 0

  // Force update for resize events
  const [resizeTick, forceUpdate] = useState(0)
  useEffect(() => {
      const observer = new ResizeObserver(() => {
          forceUpdate(n => n + 1)
      })
      
      if (globalPanelRef.current) observer.observe(globalPanelRef.current)
      if (spectrogramHandleRef.current) observer.observe(spectrogramHandleRef.current)
      if (liveCodeRef.current) observer.observe(liveCodeRef.current)
      if (knobsRef.current) observer.observe(knobsRef.current)
      
      return () => observer.disconnect()
  }, [globalPanelOn, spectrogramOn, liveCodeOn, knobsOn, introPhase])

  const whiteAdvantage =
    lastEvalScore === null ? 0.5 : 1 / (1 + Math.pow(10, -lastEvalScore / 400))
  // Invert percent as requested: "se estiver mostrando 35%, mostre 65%"
  const whitePercent = 100 - Math.round(whiteAdvantage * 100)
  const blackPercent = 100 - whitePercent

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

  }, [synthSelectedSquare, knobsPosition, globalPanelPosition, spectrogramPosition, liveCodePosition, knobsOn, globalPanelOn, spectrogramOn, liveCodeOn, activeWidgetOrder, resizeTick])

  const handleWidgetHeaderClick = (id: string) => {
    setActiveWidgetOrder(prev => {
        const filtered = prev.filter(wId => wId !== id)
        return [...filtered, id]
    })
  }

  const widgetsContent = (mobileMode: boolean) => {
      const commonStyle = mobileMode ? { position: 'static' as const, width: '100%', marginBottom: '1rem', zIndex: 10 } : undefined
      return (
          <>
            <SpectrogramWidget
                getFrequencyData={music.enabled && music.engineActive ? music.getFrequencyData : undefined}
                ref={spectrogramHandleRef}
                toggleRef={spectrogramToggleRef}
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
                  <MusicVoiceReadout monitor={music.monitor} id={music.selected.id} snapshot={music.snapshot} manual={music.preview?.id === music.selected.id && music.preview.mode === 'manual'} />
                </> : undefined}
                ref={knobsRef}
                toggleRef={knobsToggleRef}
                selectedSquare={music.enabled ? music.selected?.square ?? null : synthSelectedSquare as Square | null}
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
                onToggle={() => setKnobsOn(!knobsOn)}
                onClick={(e) => { e.stopPropagation(); handleWidgetHeaderClick('knobs') }}
                onMouseDown={(e) => e.stopPropagation()}
                style={mobileMode ? commonStyle : { zIndex: activeWidgetOrder.indexOf('knobs') + 10 }}
            />

            <GlobalControlPanel
                teamMixes={music.enabled ? music.teamMixes : undefined}
                onTeamMixChange={music.updateTeamMix}
                deckClock={music.enabled ? music.deckClock : undefined}
                tonality={music.tonality}
                onTonalityChange={music.setTonality}
                showAmbience={!music.enabled}
                ref={globalPanelRef}
                toggleRef={globalPanelToggleRef}
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
            />

            <LiveCodeWidget
                playback={liveCodeOn && music.enabled && music.engineActive ? <>
                  <div role="status">{music.error ? <span className="text-red-400">Áudio: {music.error}</span> : music.preview ? <span className="text-orange-300">TOCANDO · {music.instrument?.name} · {music.preview.square}</span> : <span className="text-white/60">Arraste uma peça para tocar · {music.activeSquares.size} vozes ativas</span>}</div>
                  {music.attackingColor && <div className="text-amber-200">CHEQUE · lado atacante {music.attackingColor === 'w' ? 'branca' : 'preta'}</div>}
                  {music.reactionDescriptions.map((description, i) => <div key={i}>{description}</div>)}
                  <MusicTransportReadout monitor={music.monitor} />
                </> : undefined}
                ref={liveCodeRef}
                toggleRef={liveCodeToggleRef}
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
            />
          </>
      )
  }

  return (
    <div
      ref={rootRef}
      className="relative w-full h-[100dvh] max-h-[100dvh] max-w-[100vw] bg-background overflow-hidden select-none flex flex-col"
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
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-1000"
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

      {/* Intro Overlay */}
      {introPhase < 3 && (
          <div className={cn(
              "absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-all duration-[3000ms]",
              introPhase === 0 ? "bg-background" : "bg-transparent pointer-events-none"
          )} onClick={skipIntro}>
              {/* Pointer Events Wrapper for Interactive Elements */}
              <div className="contents pointer-events-auto">
              
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
                              onMouseEnter={() => {
                                  // Hover sound
                                  // const audio = new Audio('/sounds/kick.mp3') // Assuming kick is bass/bumbo
                                  // Or reuse playSquareSample('a1') for bassy sound if available
                                  playSquareSample('a1') 
                              }}
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

              {/* Intro Phase 1 & 2: Info Boxes & Start */}
                      {(introPhase === 1 || introPhase === 2) && (
                          <div className={cn(
                              "flex flex-col items-center gap-8 w-full max-w-4xl px-4 pointer-events-auto",
                          )}>
                        <div className="flex flex-col items-center gap-6 w-full max-w-md">
                            {/* Title Outside Box */}
                            <h2 
                                className={cn(
                                    "text-3xl md:text-4xl font-black flex items-center gap-3 transition-all duration-1000 delay-500", // Added 500ms delay
                                    showIntroBoxes && !isStartPressed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                                    isStartPressed && "duration-100 opacity-0"
                                )}
                                style={{ 
                                    color: 'black',
                                    textShadow: `0 0 15px ${city.color}, 0 0 30px ${city.color}`
                                }}
                            >
                                {city.name.toUpperCase()}
                            </h2>

                            {/* Box 1: City Stats */}
                            <Draggable
                                dragFromBackground
                                className={cn(
                                    "bg-black/80 border border-white/10 backdrop-blur-md p-6 rounded-xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transition-[opacity,transform] duration-1000 w-full cursor-grab active:cursor-grabbing select-none",
                                    showIntroBoxes && !isStartPressed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                                    isStartPressed && "duration-100 opacity-0"
                                )}
                                style={{ position: 'relative', borderColor: `${city.color}40`, touchAction: 'none' }}
                                aria-label="Informações da cidade"
                            >
                                {/* Description Moved to Top & Resized */}
                                <div className="mb-6 text-base md:text-lg text-white/90 italic leading-relaxed font-light border-b border-white/10 pb-4">
                                    "{city.description}"
                                </div>

                                <div className="space-y-3 font-mono text-sm">
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-muted-foreground">GENRE</span>
                                        <span className="text-white font-bold">{city.genre}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-muted-foreground">BPM</span>
                                        <span>{city.bpm}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-muted-foreground">SCALE</span>
                                        <span className="truncate max-w-[200px] text-right">{city.scale.join(" ")}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-muted-foreground">AI LEVEL</span>
                                        <span className="text-yellow-400">
                                            {city.aiDepth === 5 ? "EASY (Depth 5)" :
                                             city.aiDepth === 10 ? "MEDIUM (Depth 10)" :
                                             city.aiDepth === 15 ? "HARD (Depth 15)" :
                                             "EXPERT (Depth 20)"}
                                        </span>
                                    </div>
                                </div>
                            </Draggable>
                        </div>

                        {/* Sound Kit Box HIDDEN for now */}
                        {false && (
                            <div className="hidden">
                                {/* Original Sound Kit Code was here */}
                            </div>
                        )}

                        <div className={cn(
                            "relative z-30 mt-8 transition-all duration-1000 delay-400",
                            showStartButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-0"
                        )}>
                            <Button
                                className="cursor-pointer relative overflow-hidden bg-black hover:bg-black/80 text-black font-bold text-xl px-16 py-8 tracking-widest uppercase shadow-[0_0_30px_var(--city-neon)] hover:shadow-[0_0_50px_var(--city-neon)] hover:scale-105 transition-all duration-300 group"
                                style={{ "--city-neon": city.color } as React.CSSProperties}
                                onMouseDown={(e) => {
                                    e.stopPropagation()
                                    setIsStartPressed(true)
                                    if (engineRef.current) {
                                        // Pitch shift -1 tone (-2 semitones)
                                        engineRef.current.setAmbiencePitch(Math.pow(2, -2 / 12))
                                    }
                                }}
                                onMouseUp={(e) => {
                                    e.stopPropagation()
                                    handleStartGame()
                                }}
                                onMouseLeave={() => {
                                    if (isStartPressed && introPhase < 3) {
                                        setIsStartPressed(false)
                                        if (engineRef.current) {
                                            engineRef.current.setAmbiencePitch(1)
                                        }
                                    }
                                    engineRef.current?.stopAmbience()
                                }}
                                onMouseEnter={() => {
                                    if (engineRef.current) {
                                        if (engineRef.current.context?.state === 'suspended') {
                                            engineRef.current.context.resume()
                                        }
                                        engineRef.current.startAmbience(city.scale, city.id)
                                        engineRef.current.setGlobalVolume(0.5)

                                        // Play default hover sound (BD)
                                        const ctx = engineRef.current.context
                                        if (ctx) {
                                             const t = ctx.currentTime
                                             const pitchVar = 0.9 + Math.random() * 0.2
                                             const osc = ctx.createOscillator()
                                             const gain = ctx.createGain()
                                             osc.frequency.setValueAtTime(150 * pitchVar, t)
                                             osc.frequency.exponentialRampToValueAtTime(40 * pitchVar, t + 0.1)
                                             gain.gain.setValueAtTime(0.15, t)
                                             gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1)
                                             osc.connect(gain)
                                             gain.connect(ctx.destination)
                                             osc.start(t)
                                             osc.stop(t + 0.1)
                                        }
                                    }
                                }}
                                onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const x = e.clientX - rect.left
                                    const y = e.clientY - rect.top
                                    const width = rect.width
                                    e.currentTarget.style.setProperty("--mouse-x", `${x}px`)
                                    e.currentTarget.style.setProperty("--mouse-y", `${y}px`)
                                    
                                    // Calculate proximity to center for radial size
                                    // 0 = center, 0.5 = edge (normalized)
                                    const centerX = width / 2
                                    const distFromCenter = Math.abs(x - centerX) / width // 0 to 0.5
                                    // Map 0 -> 150px, 0.5 -> 50px
                                    const maxRadius = 150
                                    const minRadius = 50
                                    const radius = maxRadius - (distFromCenter * 2 * (maxRadius - minRadius))
                                    e.currentTarget.style.setProperty("--radial-radius", `${radius}px`)

                                    if (engineRef.current) {
                                        // Pitch shift: -2 to +2 semitones (4 semitones range)
                                        const normalizedX = x / width
                                        const semitones = (normalizedX * 4) - 2
                                        const pitch = Math.pow(2, semitones / 12)
                                        engineRef.current.setAmbiencePitch(pitch)
                                    }
                                }}
                            >
                                {/* Radial Gradient Background */}
                                <div 
                                    className={cn(
                                        "absolute inset-0 transition-opacity duration-300 pointer-events-none",
                                        isStartPressed ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    )}
                                    style={{
                                        background: isStartPressed 
                                            ? `radial-gradient(circle var(--radial-radius, 150px) at var(--mouse-x, 30%) var(--mouse-y, 30%), white 0%, var(--city-neon) 40%, transparent 70%)`
                                            : `radial-gradient(circle var(--radial-radius, 150px) at var(--mouse-x, 50%) var(--mouse-y, 50%), white 0%, var(--city-neon) 40%, transparent 80%)`,
                                        mixBlendMode: 'screen'
                                    }}
                                />
                                {/* Button Text */}
                                <span className="relative z-10 text-[var(--city-neon)] group-hover:text-black transition-colors duration-300">START MATCH</span>
                            </Button>
                        </div>
                  </div>
              )}
          </div>
          </div>
      )}

      {/* Header */}
      <header 
        className={cn(
          "absolute top-0 left-0 w-full z-20 flex items-center justify-between px-4 md:px-6 py-3 border-b border-transparent bg-transparent transition-opacity duration-1000",
          introPhase === 0 ? "opacity-100" : (introPhase < 3 ? "opacity-0 pointer-events-none" : "opacity-100")
        )}
        style={{ "--city-neon": city.color } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
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
          <div className={cn("transition-opacity duration-500", introPhase === 0 ? "opacity-0" : "opacity-100")}>
            <h1 className="font-mono font-bold text-base md:text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: city.color }} />
              <span style={{ color: city.color }}>{city.name.toUpperCase()}</span>
            </h1>
          </div>
        </div>

        <div className={cn("flex items-center gap-2 md:gap-4 transition-opacity duration-500", introPhase === 0 ? "opacity-0" : "opacity-100")}>
          {/* Status */}
          <div
            className={`text-xs md:text-sm font-mono px-3 py-1 rounded-full ${gameStatus.includes("CHECK") || gameStatus.includes("MATE") ? "animate-pulse" : ""
              }`}
            style={{
              backgroundColor:
                gameStatus.includes("CHECK") || gameStatus.includes("MATE")
                  ? "rgba(239, 68, 68, 0.2)"
                  : `${city.color}20`,
              color: gameStatus.includes("CHECK") || gameStatus.includes("MATE") ? "#ef4444" : city.color,
              border: `1px solid ${gameStatus.includes("CHECK") || gameStatus.includes("MATE") ? "#ef4444" : city.color}40`,
            }}
          >
            {gameStatus}
          </div>

          {/* Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="icon" 
                className="hidden md:flex bg-transparent transition-all border-border hover:border-[var(--hover-color)] hover:shadow-[0_0_10px_var(--hover-color)] hover:text-white active:bg-[var(--hover-color)] active:text-black"
                style={{
                    "--hover-color": city.color
                } as React.CSSProperties}
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                AI Difficulty: <span className="text-[var(--city-neon)] font-bold">
                  {aiDepth === 5 ? "Easy" : aiDepth === 10 ? "Medium" : aiDepth === 15 ? "Hard" : "Expert"}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAiDepth(5)} className={cn("justify-between", aiDepth === 5 && "bg-accent text-accent-foreground font-bold")}>
                Easy (Depth 5)
                {aiDepth === 5 && <Check className="w-4 h-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAiDepth(10)} className={cn("justify-between", aiDepth === 10 && "bg-accent text-accent-foreground font-bold")}>
                Medium (Depth 10)
                {aiDepth === 10 && <Check className="w-4 h-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAiDepth(15)} className={cn("justify-between", aiDepth === 15 && "bg-accent text-accent-foreground font-bold")}>
                Hard (Depth 15)
                {aiDepth === 15 && <Check className="w-4 h-4 ml-2" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAiDepth(20)} className={cn("justify-between", aiDepth === 20 && "bg-accent text-accent-foreground font-bold")}>
                Expert (Depth 20)
                {aiDepth === 20 && <Check className="w-4 h-4 ml-2" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Audio toggle */}
          <div className="flex gap-2">
            {isMobile && <Button variant="outline" size="icon" aria-label="Parâmetros musicais" onClick={() => { setKnobsOn(true); setGlobalPanelOn(true); setLiveCodeOn(true); setMobileControlsOpen(true) }}><Settings2 className="w-4 h-4" /></Button>}
            <Button 
                variant="outline" 
                size="icon" 
                onClick={handleToggleMusicEngine}
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
                className="hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black transition-all"
                style={{ "--city-neon": city.color } as React.CSSProperties}
            >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      <div className="relative w-full h-full flex flex-col lg:block justify-start pt-4 lg:pt-0">
        
        {/* Footer - Fixed Bottom */}
        <div className={cn(
            "fixed bottom-0 left-0 right-0 h-[60px] z-40 flex items-center justify-start px-6 border-t border-transparent bg-transparent transition-all duration-1000 pointer-events-none",
            introPhase < 3 ? "opacity-0 translate-y-full" : "opacity-100 translate-y-0"
        )}>
             {/* Center: Restart & Win Buttons */}
             <div className="flex items-center gap-4 pointer-events-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={resetGame}
                    className="gap-2 bg-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black hover:cursor-pointer transition-all"
                    style={{ "--city-neon": city.color } as React.CSSProperties}
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Restart</span>
                </Button>
                
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setGameStatus("CHECKMATE - White wins!")
                        setIsPlaying(false)
                        const result = conquerCity(city.id)
                        if (engineRef.current) {
                            engineRef.current.playSeatbelt()
                        }
                        const rankMsg = result.rankedUp ? ` 🎖️ PROMOTED TO ${result.newRank.toUpperCase()}!` : ` Rank: ${result.newRank}`
                        toast.success(`CITY CONQUERED! +${result.earnedPoints.toLocaleString()} PTS 🎵`, {
                            description: `${result.isFirstTime ? "First conquest reward claimed!" : "Conquest bonus earned!"}${rankMsg} (Total: ${result.profile.points.toLocaleString()} PTS)`,
                            duration: Infinity,
                            action: {
                                label: "RETURN TO MAP",
                                onClick: onBack
                            }
                        })
                    }}
                    className="gap-2 bg-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black hover:cursor-pointer transition-all"
                    style={{ "--city-neon": city.color } as React.CSSProperties}
                >
                    <span className="hidden sm:inline">Win</span>
                </Button>
             </div>
        </div>

        {/* Main Game Area (Board Container) */}
        {/* Animated Descent for Phase 2 -> 3 */}
        <div 
            className={cn(
                "flex flex-col items-center justify-start w-full lg:max-w-[512px] mx-auto relative z-10 transition-all duration-[2000ms] ease-out px-2",
                introPhase < 2 ? "-translate-y-[150vh]" : introPhase === 2 ? "translate-y-[25vh]" : "lg:pt-6"
            )}
            style={{
                // If introPhase is 3 (Game Active), we reset transform to allow normal layout flow
                transform: introPhase === 3 ? "none" : undefined,
                marginTop: introPhase === 3 ? (typeof window !== 'undefined' && window.innerWidth > 768 ? 'calc(50vh - 350px)' : '48px') : undefined
            }}
        >
          <div
            className="w-full max-w-full flex flex-col items-center relative"
            ref={centerContainerRef}
          >




            <div className="flex justify-between gap-0.5 min-h-[2rem] h-8 w-full px-4 lg:px-0">
              <div className="flex justify-start gap-0.5">
                {capturedPieces.black.map((p, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 sm:w-6 sm:h-6 opacity-90 p-0.5"
                    dangerouslySetInnerHTML={{
                      __html: PiecesSVG[`w${p.toUpperCase()}` as keyof typeof PiecesSVG],
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-end gap-0.5">
                {capturedPieces.white.map((p, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 sm:w-6 sm:h-6 opacity-90 p-0.5"
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

            <div className="flex-1 flex flex-col items-center justify-center w-full relative z-20">
              {/* Board Area - Moved to Top */}
              <div
                className="w-[min(90vw,calc(100dvh-270px),512px)] aspect-square relative z-20 mb-2 sm:mb-4"
                ref={boardAreaRef}
                onClick={(e) => e.stopPropagation()}
                style={{
                    transform: `scale(${boardScale})`,
                    transition: 'transform 0.3s ease-out'
                }}
              >
                  <ChessgroundBoard 
                  game={game} 
                  onMove={handlePlayerMove} 
                  cityColor={city.color} 
                  isThinking={isThinking} 
                  synthSelectedSquare={music.enabled ? music.selected?.square ?? null : synthSelectedSquare as Square | null}
                  activeSquares={music.enabled ? music.activeSquares : activeSquares}
                  onPieceHold={music.enabled && music.engineActive ? music.audition : undefined}
                  onPieceRelease={music.enabled && music.engineActive ? music.endAudition : undefined}
                  musicPulse={music.enabled && music.engineActive ? music.pulse : null}
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
              </div>

              {/* Time Control Buttons - Moved Below Board */}
              <div className={cn(
                  "flex w-full items-center mb-2 sm:mb-4 gap-2 justify-center relative z-50 transition-opacity duration-1000",
                  introPhase < 3 ? "opacity-0" : "opacity-100"
              )}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={undoMove}
                    onMouseEnter={() => playDrum("bd")}
                    onMouseDown={() => playDrum("oh", 1.5)}
                    disabled={moveHistory.length === 0}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer"
                    style={{ 
                        "--city-neon": city.color,
                        backgroundColor: "var(--city-neon)20" // Default low opacity background
                    } as React.CSSProperties}
                  >
                    <Undo2 className="w-7 h-7 sm:w-10 sm:h-10" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={handleTogglePlay}
                    onMouseEnter={() => playDrum("bd")}
                    onMouseDown={() => playDrum("sd")}
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
                    onMouseEnter={() => playDrum("bd")}
                    onMouseDown={() => playDrum("hh", 1.5)}
                    disabled={redoStack.length === 0}
                    className="w-12 h-12 sm:w-16 sm:h-16 rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] active:bg-[var(--city-neon)] active:text-black pointer-events-auto cursor-pointer"
                    style={{ 
                        "--city-neon": city.color,
                        backgroundColor: "var(--city-neon)20"
                    } as React.CSSProperties}
                  >
                    <Redo2 className="w-7 h-7 sm:w-10 sm:h-10" />
                  </Button>
                </div>
              </div>

              {/* Moves Ticker - Moved ABOVE Eval */}
              <div 
                  className="w-[90vw] max-w-[512px] h-6 flex items-center justify-normal mb-1.5 px-1 relative z-20 overflow-hidden"
               >
                   <div
                      ref={movesTickerRef}
                      className="flex items-center justify-start gap-3 text-xs font-mono whitespace-nowrap overflow-x-auto scrollbar-hide mask-fade-left w-full"
                      style={{ textShadow: "1px 1px 1px black" }}
                   >
                       {moveHistory.map((move, i) => {
                           // Use regular index
                           return (
                               <span key={i} className={cn(
                                   i % 2 === 0 ? "text-white" : "text-muted-foreground"
                               )}>
                                   {i % 2 === 0 ? `${Math.floor(i/2) + 1}.` : ""} {move}
                               </span>
                           )
                       })}
                   </div>
              </div>

              {/* Eval Bar */}
              <div className={cn(
                  "w-[90vw] max-w-[512px] h-2 bg-black/40 rounded-[12px] overflow-hidden flex flex-col relative mb-1 border border-white/10 relative transition-opacity duration-1000 pointer-events-none select-none",
                  introPhase < 3 ? "opacity-0" : "opacity-100"
              )}>
                <div className="w-full h-2 relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-white transition-all duration-1000 ease-in-out"
                      style={{ width: `${whitePercent}%` }} // Show White%
                    />
                    {isEvaluating && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30">
                            <Loader2 className="w-2 h-2 text-white animate-spin" />
                        </div>
                    )}
                </div>
              </div>

              <div className={cn(
                  "w-[90vw] max-w-[512px] flex justify-start mb-2 sm:mb-6 transition-opacity duration-1000",
                  introPhase < 3 ? "opacity-0" : "opacity-100"
              )}>
                  <span className="text-[10px] text-white/80 font-mono tracking-wide">
                      Chance ({whitePercent}%)
                  </span>
              </div>
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

      {isMobile && <Dialog open={mobileControlsOpen} onOpenChange={setMobileControlsOpen}>
        <DialogContent className="z-[130] max-h-[88dvh] overflow-y-auto bg-black border-white/20 p-5 text-white">
          <DialogHeader><DialogTitle>Parâmetros musicais</DialogTitle><DialogDescription>Selecione uma peça no tabuleiro para ajustar seu instrumento. Tom e escala afetam toda a banda.</DialogDescription></DialogHeader>
          <div className="flex flex-col gap-3 [&>[data-widget=piece]]:order-first [&>[data-widget=spectrum]]:order-last">{widgetsContent(true)}</div>
        </DialogContent>
      </Dialog>}

      {/* Bottom Right Info & Version */}
      <div 
        className="hidden sm:flex absolute bottom-3 right-3 z-30 pointer-events-auto items-center gap-2 bg-background/80 backdrop-blur-sm p-1.5 px-2.5 rounded-lg border border-border shadow-sm"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <VersionChangelog />
      </div>
      <div 
        className="flex sm:hidden absolute bottom-1.5 right-2 z-30 pointer-events-auto items-center gap-1.5 bg-background/80 backdrop-blur-sm py-0.5 px-2 rounded border border-border/60 shadow-sm"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        <VersionChangelog />
      </div>

    </div>
  )
}
