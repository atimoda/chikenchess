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
import { useAudio } from "@/hooks/use-audio"
import { Button } from "@/components/ui/button"
import type { SquareEffectMap } from "@/lib/types"
import { DEFAULT_EFFECTS, DEFAULT_GLOBAL_EFFECTS, type GlobalEffects } from "@/lib/types"
import { ArrowLeft, Volume2, VolumeX, Settings2, Undo2, Redo2, Pause, Power, Play, Check, RotateCcw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { unlockNextCity } from "@/lib/game-progression"
import { GlobalControlPanel } from "./global-control-panel"
import { SpectrogramWidget } from "./spectrogram-widget"

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
  const [globalEffects, setGlobalEffects] = useState<GlobalEffects>(DEFAULT_GLOBAL_EFFECTS)
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
            
            // Turn off widgets on mobile
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

            // Top Left (Global Control Panel - originally Top Right)
            // Closer to bottom of quadrant -> centerY - widgetHeight - centerPadding
            setGlobalPanelPosition({ 
                x: Math.max(padding, centerX - boardHalfWidth - getBoardPadding() - widgetW),
                y: centerY - 300 - getCenterPadding() // Approx widget height (taller)
            })

            // Bottom Left (Spectrogram - originally Top Left)
            // Closer to top of quadrant -> centerY + centerPadding
            setSpectrogramPosition({ 
                x: Math.max(padding, centerX - boardHalfWidth - getBoardPadding() - widgetW), 
                y: centerY + getCenterPadding()
            })

            // Top Right (Piece Params / Knobs - stays Top Right)
            // Closer to bottom of quadrant -> centerY - widgetHeight - centerPadding
            setKnobsPosition({ 
                x: Math.min(width - widgetW - padding, centerX + boardHalfWidth + getBoardPadding()), 
                y: centerY - 300 - getCenterPadding() // Approx widget height (taller)
            })

            // Bottom Right (Live Code - originally Bottom Left)
            // Closer to top of quadrant -> centerY + centerPadding
            setLiveCodePosition({
                x: Math.min(width - widgetW - padding, centerX + boardHalfWidth + getBoardPadding()),
                y: centerY + getCenterPadding()
            })
            
            // Default states
            setSpectrogramOn(false)
            setGlobalPanelOn(false)
            setKnobsOn(false)
            setLiveCodeOn(false)
        }
    }
  }, [])
  
    // Auto-scroll to start (left) when history changes (since we reversed the list)
    useEffect(() => {
        if (movesTickerRef.current) {
            // Scroll to 0 because we want to see the newest items which are on the left
            movesTickerRef.current.scrollTo({
                left: 0,
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
      const clickAudio = new Audio('/sounds/click.mp3') // Placeholder
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
      }, 500)
  }

  const handleStartGame = () => {
      setIntroPhase(2) // Board Descend
      setShowIntroBoxes(false)
      setShowStartButton(false)
      
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
              setIntroPhase(3) // Game Active
          }
          handleGlobalEffectChange("volume", vol)
      }, 3000 / (0.8 / 0.05)) 
  }

  // --- MOBILE SCROLL LOCK ---
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth < 768) {
            document.body.style.overflow = 'hidden'
            document.body.style.position = 'fixed'
            document.body.style.width = '100%'
            document.body.style.height = '100%'
        }
        return () => {
            document.body.style.overflow = ''
            document.body.style.position = ''
            document.body.style.width = ''
            document.body.style.height = ''
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
    sourceSide?: 'left' | 'right'
    targetSide?: 'left' | 'right' | 'bottom'
  } | null>(null)

  const [spectrogramConnection, setSpectrogramConnection] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
    sourceSide?: 'left' | 'right'
    targetSide?: 'left' | 'right' | 'bottom'
  } | null>(null)

  const { togglePlayback, playCheckmate, playDrawKalimba, playSquareSample, playIllegalMoveGlitch, engineRef } = useAudio(game, city, isPlaying, activeSquares, squareEffects)

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

    evalStockfishRef.current = new Worker("/stockfish.js")
    evalStockfishRef.current.postMessage("uci")
    evalStockfishRef.current.postMessage("isready")

    evalStockfishRef.current.onmessage = (event) => {
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

    return () => {
      stockfishRef.current?.terminate()
      evalStockfishRef.current?.terminate()
    }
  }, [])

  const requestEvaluation = useCallback((gameInstance: Chess) => {
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
        unlockNextCity(city.id)
        toast.success("CITY CONQUERED! 🎵", {
          description: "Next arena unlocked. Ready for the next era?",
          duration: Infinity,
          action: {
            label: "RETURN TO MAP",
            onClick: onBack
          }
        })
      } else {
        toast.error("DEFEAT!", {
          description: "Try again to unlock the next city."
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
      if (moveHistory.length === 0) {
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
          stockfishRef.current?.postMessage(`go depth ${aiDepth}`)
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
    setLastEvalScore(null)
    setIsEvaluating(false)
    evalPendingRef.current = false
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

  const handleTogglePlay = useCallback(async () => {
    await togglePlayback()
    setIsPlaying((prev) => !prev)
  }, [togglePlayback])

  const hasStarted = moveHistory.length > 0

  const whiteAdvantage =
    lastEvalScore === null ? 0.5 : 1 / (1 + Math.pow(10, -lastEvalScore / 400))
  const whitePercent = Math.round(whiteAdvantage * 100)
  const blackPercent = 100 - whitePercent

  useEffect(() => {
    if (!rootRef.current || !boardAreaRef.current) {
      setKnobsConnection(null)
      setSpectrogramConnection(null)
      return
    }

    const containerRect = rootRef.current.getBoundingClientRect()
    const boardRect = boardAreaRef.current.getBoundingClientRect()
    const squareWidth = boardRect.width / 8
    const squareHeight = boardRect.height / 8

    // --- SPECTROGRAM CONNECTION (Board -> Spectrogram) ---
    // Removed connection line to Spectrogram as per request
    // if (spectrogramOn && spectrogramHandleRef.current) { ... } logic removed

    // --- KNOBS CONNECTION ---
    if (synthSelectedSquare && knobsOn && knobsRef.current) {
        const fileChar = synthSelectedSquare[0]
        const rankChar = synthSelectedSquare[1]
        const files = "abcdefgh"
        const fileIndex = files.indexOf(fileChar)
        const rank = parseInt(rankChar, 10)

        if (fileIndex >= 0 && Number.isFinite(rank)) {
             const toggleRect = knobsRef.current.getBoundingClientRect()
             
             // Widget Point (Source) - ~37px below top
             const knobY = toggleRect.top + 37 - containerRect.top
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
             
             setKnobsConnection({ x1, y1: knobY, x2, y2, sourceSide, targetSide })
        } else {
            setKnobsConnection(null)
        }
    } else {
      setKnobsConnection(null)
    }

  }, [synthSelectedSquare, knobsPosition, globalPanelPosition, spectrogramPosition, knobsOn, globalPanelOn, spectrogramOn])

  return (
    <div
      ref={rootRef}
      className="relative w-full min-h-screen bg-background overflow-hidden"
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
        .mask-fade-right {
            mask-image: linear-gradient(to right, black 80%, transparent);
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
            filter: (introPhase === 1 || introPhase === 2) 
                ? "grayscale(0%) contrast(100%) brightness(100%) blur(0px)"
                : "grayscale(100%) contrast(120%) brightness(30%) blur(0px)",
            opacity: (introPhase === 1 || introPhase === 2) ? 0.8 : 0.4
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
              "absolute inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-all duration-1000",
              introPhase === 0 ? "bg-background" : "bg-transparent pointer-events-none"
          )} onClick={skipIntro}>
              {/* Pointer Events Wrapper for Interactive Elements */}
              <div className="contents pointer-events-auto">
              
              {/* Intro Phase 0: Text Lines */}
              {introPhase === 0 && (
                  <div className="flex flex-col gap-4 text-center px-6 max-w-2xl">
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
                                  const audio = new Audio('/sounds/kick.mp3') // Assuming kick is bass/bumbo
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
                                    "text-3xl md:text-4xl font-black flex items-center gap-3 transition-all duration-1000",
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
                            <div 
                                className={cn(
                                    "bg-black/80 border border-white/10 backdrop-blur-md p-6 rounded-xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] transition-all duration-1000 w-full",
                                    showIntroBoxes && !isStartPressed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
                                    isStartPressed && "duration-100 opacity-0"
                                )}
                                style={{ borderColor: `${city.color}40` }}
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
                            </div>
                        </div>

                        {/* Sound Kit Box HIDDEN for now */}
                        {false && (
                            <div className="hidden">
                                {/* Original Sound Kit Code was here */}
                            </div>
                        )}

                        <div className={cn(
                            "mt-8 transition-all duration-1000 delay-400",
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
                                    }
                                }}
                                onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const x = e.clientX - rect.left
                                    const y = e.clientY - rect.top
                                    const width = rect.width
                                    e.currentTarget.style.setProperty("--mouse-x", `${x}px`)
                                    e.currentTarget.style.setProperty("--mouse-y", `${y}px`)

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
                                            ? `radial-gradient(circle 150px at var(--mouse-x, 30%) var(--mouse-y, 30%), white 0%, var(--city-neon) 40%, transparent 70%)`
                                            : `radial-gradient(circle 150px at var(--mouse-x, 50%) var(--mouse-y, 50%), white 0%, var(--city-neon) 40%, transparent 80%)`,
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
          introPhase < 3 ? "opacity-0 pointer-events-none" : "opacity-100"
        )}
        style={{ "--city-neon": city.color } as React.CSSProperties}
      >
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBack} 
            className="shrink-0 hover:text-[var(--city-neon)] hover:bg-transparent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-mono font-bold text-base md:text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: city.color }} />
              <span style={{ color: city.color }}>{city.name.toUpperCase()}</span>
              <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground opacity-50">v0.2.5 "The Editor"</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
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
                className="hidden md:flex bg-transparent transition-all border-border hover:border-[var(--hover-color)] hover:shadow-[0_0_10px_var(--hover-color)] hover:text-white"
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
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleTogglePlay} 
            className="hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] transition-all"
            style={{ "--city-neon": city.color } as React.CSSProperties}
          >
            {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* DEBUG: Force Win Button */}
          <Button
            variant="destructive"
            size="sm"
            className="hidden md:flex text-[10px] h-7 px-2"
            onClick={() => {
              setGameStatus("CHECKMATE - White wins!")
              setIsPlaying(false)
              unlockNextCity(city.id)
              if (engineRef.current) {
                 engineRef.current.playSeatbelt()
              }
              toast.success("CITY CONQUERED! 🎵", {
                description: "Next arena unlocked. Ready for the next era?",
                duration: Infinity,
                action: {
                  label: "RETURN TO MAP",
                  onClick: onBack
                }
              })
            }}
          >
            WIN
          </Button>
        </div>
      </header>

      <div className="relative w-full h-full flex flex-col lg:block justify-start pt-4 lg:pt-0">
        
        {/* Footer - Fixed Bottom */}
        <div className={cn(
            "fixed bottom-0 left-0 right-0 h-[60px] z-40 flex items-center justify-end px-6 border-t border-transparent bg-transparent transition-all duration-1000 pointer-events-none",
            introPhase < 3 ? "opacity-0 translate-y-full" : "opacity-100 translate-y-0"
        )}>
             {/* Center: Restart Button */}
             <div className="flex items-center pointer-events-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={resetGame}
                    className="gap-2 bg-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] hover:cursor-pointer transition-all"
                    style={{ "--city-neon": city.color } as React.CSSProperties}
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="hidden sm:inline">Restart</span>
                </Button>
             </div>
        </div>

        {/* Main Game Area (Board Container) */}
        {/* Animated Descent for Phase 2 -> 3 */}
        <div 
            className={cn(
                "flex flex-col gap-4 items-center justify-start w-full lg:max-w-[512px] mx-auto relative z-10 transition-all duration-[5000ms] ease-out",
                introPhase < 2 ? "-translate-y-[150vh]" : introPhase === 2 ? "translate-y-[25vh]" : "lg:pt-6" // 25vh approx center vertical
            )}
            style={{
                // If introPhase is 3 (Game Active), we reset transform to allow normal layout flow
                transform: introPhase === 3 ? "none" : undefined,
                marginTop: introPhase === 3 ? (typeof window !== 'undefined' && window.innerWidth > 768 ? 'calc(50vh - 350px)' : '100px') : undefined // Centering hack
            }}
        >
          <div
            className="w-full max-w-full flex flex-col gap-4 relative"
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
                className="w-[90vw] max-w-[512px] aspect-square relative z-20 mb-4"
                ref={boardAreaRef}
                onClick={(e) => e.stopPropagation()}
              >
                  <ChessgroundBoard 
                  game={game} 
                  onMove={handlePlayerMove} 
                  cityColor={city.color} 
                  isThinking={isThinking} 
                  synthSelectedSquare={synthSelectedSquare as Square | null}
                  activeSquares={activeSquares}
                  onBoardClick={(square) => {
                    setSynthSelectedSquare(square)
                    const piece = game.get(square as Square)
                    if (piece) {
                      playSquareSample(square, piece.type, piece.color)
                    } else {
                      playSquareSample(square)
                    }
                  }}
                  onDragOverSquare={(from, to) => {
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
              <div className="flex w-full items-center mb-6 gap-2 justify-center relative z-50">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={undoMove}
                    disabled={moveHistory.length === 0}
                    className="w-16 h-16 rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] pointer-events-auto cursor-pointer"
                    style={{ "--city-neon": city.color } as React.CSSProperties}
                  >
                    <Undo2 className="w-10 h-10" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={handleTogglePlay}
                    className="w-16 h-16 rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] pointer-events-auto cursor-pointer"
                    style={{ "--city-neon": city.color } as React.CSSProperties}
                  >
                    {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={redoMove}
                    disabled={redoStack.length === 0}
                    className="w-16 h-16 rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] pointer-events-auto cursor-pointer"
                    style={{ "--city-neon": city.color } as React.CSSProperties}
                  >
                    <Redo2 className="w-10 h-10" />
                  </Button>
                </div>
              </div>

              {/* Eval Bar - Moved Below Controls */}
              <div className="w-[90vw] max-w-[512px] h-2 bg-black/40 rounded-[12px] overflow-hidden flex flex-col relative mb-7 border border-white/10 relative">
                <div className="w-full h-2 relative overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-white transition-all duration-1000 ease-in-out"
                      style={{ width: `${blackPercent}%` }}
                    />
                    {isEvaluating && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 z-30">
                            <Loader2 className="w-2 h-2 text-white animate-spin" />
                        </div>
                    )}
                </div>
              </div>

              {/* Moves Ticker - Moved Below Eval */}
              <div 
                  className="w-[90vw] max-w-[512px] h-6 flex items-center justify-normal mb-7 px-1 relative z-20 overflow-hidden"
               >
                   <div
                      ref={movesTickerRef}
                      className="flex items-center justify-start gap-3 text-xs font-mono whitespace-nowrap overflow-x-auto scrollbar-hide mask-fade-right w-full"
                      style={{ textShadow: "1px 1px 1px black" }}
                   >
                       {[...moveHistory].reverse().map((move, i) => {
                           const originalIndex = moveHistory.length - 1 - i
                           return (
                               <span key={originalIndex} className={cn(
                                   originalIndex % 2 === 0 ? "text-white" : "text-muted-foreground",
                                   "animate-slide-in"
                               )}>
                                   {originalIndex % 2 === 0 ? `${Math.floor(originalIndex/2) + 1}.` : ""} {move}
                               </span>
                           )
                       })}
                   </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Connection Lines Layer - z-60 (Between Widget Box and Widget Button) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 60 }}>
        {[knobsConnection, spectrogramConnection].map((conn, i) => {
          if (!conn) return null
          
          const startX = conn.x1
          const startY = conn.y1
          const endX = conn.x2
          const endY = conn.y2
          
          // Calculate curve to dip below the lowest point
          const lowestY = Math.max(startY, endY)
          const targetLowPoint = lowestY + 15 // Fixed 15px dip below lowest point
          
          const cpX = (startX + endX) / 2
          const cpY = 2 * targetLowPoint - 0.5 * startY - 0.5 * endY

          const r = 4 // Handle radius

          // Source Handle (Widget)
          let sourceHandlePath = ""
          if (conn.sourceSide === 'left') {
              sourceHandlePath = `M ${startX} ${startY - r} A ${r} ${r} 0 0 0 ${startX} ${startY + r}`
          } else if (conn.sourceSide === 'right') {
              sourceHandlePath = `M ${startX} ${startY - r} A ${r} ${r} 0 0 1 ${startX} ${startY + r}`
          }

          // Target Handle
          let targetHandlePath = ""
          if (conn.targetSide === 'bottom') {
              // U shape (Flat top)
              targetHandlePath = `M ${endX - r} ${endY} A ${r} ${r} 0 0 0 ${endX + r} ${endY}`
          } else if (conn.targetSide === 'left') {
              targetHandlePath = `M ${endX} ${endY - r} A ${r} ${r} 0 0 0 ${endX} ${endY + r}`
          } else if (conn.targetSide === 'right') {
              targetHandlePath = `M ${endX} ${endY - r} A ${r} ${r} 0 0 1 ${endX} ${endY + r}`
          }

          return (
             <React.Fragment key={i}>
               <path
                 d={`M ${startX} ${startY} Q ${cpX} ${cpY} ${endX} ${endY}`}
                 stroke="white"
                 strokeWidth={1.5}
                 fill="none"
                 className="opacity-50"
               />
               {sourceHandlePath && (
                   <path
                       d={sourceHandlePath}
                       fill="white"
                       className="opacity-100"
                   />
               )}
               {targetHandlePath && (
                   <path
                       d={targetHandlePath}
                       fill="white"
                       className="opacity-100"
                   />
               )}
             </React.Fragment>
          )
        })}
      </svg>

      <div className={cn("transition-opacity duration-1000", introPhase < 2 ? "opacity-0 pointer-events-none" : "opacity-100")}>
      <SpectrogramWidget
        ref={spectrogramHandleRef}
        toggleRef={spectrogramToggleRef}
        isOn={spectrogramOn}
        onToggle={() => setSpectrogramOn(prev => !prev)}
        isPlaying={isPlaying}
        cityColor={city.color}
        position={spectrogramPosition || undefined}
        onPositionChange={(pos) => setSpectrogramPosition(pos)}
      />

      <SynthControlPanel
        ref={knobsRef}
        toggleRef={knobsToggleRef}
        selectedSquare={synthSelectedSquare as Square | null}
        selectedPieceInfo={(() => {
          if (!synthSelectedSquare) return null
          // @ts-expect-error - chess.js get typing is not recognized here
          const piece = game.get(synthSelectedSquare as Square)
          if (!piece) return "Empty"
          const instrumentMap: Record<string, string> = {
            p: "Drums",
            n: "Bass",
            b: "Piano",
            r: "Pad",
            q: "Lead",
            k: "Lead",
          }
          const pieceNameMap: Record<string, string> = {
            p: "Pawn",
            n: "Knight",
            b: "Bishop",
            r: "Rook",
            q: "Queen",
            k: "King",
          }
          return `${piece.color === "w" ? "White" : "Black"} ${
            pieceNameMap[piece.type]
          } - ${instrumentMap[piece.type]}`
        })()}
        effects={
          synthSelectedSquare
            ? squareEffects[synthSelectedSquare] || DEFAULT_EFFECTS
            : DEFAULT_EFFECTS
        }
        onEffectChange={(key, value) => {
          if (!synthSelectedSquare) return
          setSquareEffects((prev) => ({
            ...prev,
            [synthSelectedSquare]: {
              ...(prev[synthSelectedSquare] || DEFAULT_EFFECTS),
              [key]: value,
            },
          }))
        }}
        cityColor={city.color}
        position={knobsPosition ?? { x: 0, y: 0 }}
        onPositionChange={setKnobsPosition}
        handleRef={knobsHandleRef}
        isOn={knobsOn}
        onToggle={() => setKnobsOn(!knobsOn)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Global Control Panel */}
      <GlobalControlPanel
        ref={globalPanelRef}
        toggleRef={globalPanelToggleRef}
        effects={globalEffects}
        onEffectChange={handleGlobalEffectChange}
        cityColor={city.color}
        position={globalPanelPosition || undefined}
        onPositionChange={(pos) => setGlobalPanelPosition(pos)}
        handleRef={globalPanelHandleRef}
        isOn={globalPanelOn}
        onToggle={() => setGlobalPanelOn(!globalPanelOn)}
      />

      {/* Live Code Widget */}
      <LiveCodeWidget
        ref={liveCodeRef}
        toggleRef={liveCodeToggleRef}
        handleRef={liveCodeHandleRef}
        pattern={currentPattern}
        city={city}
        cityColor={city.color}
        isPlaying={isPlaying}
        position={liveCodePosition || undefined}
        onPositionChange={(pos) => setLiveCodePosition(pos)}
        isOn={liveCodeOn}
        onToggle={() => setLiveCodeOn(!liveCodeOn)}
      />
      </div>

    </div>
  )
}
