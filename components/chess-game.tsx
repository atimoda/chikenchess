"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Chess, type Move, type Square } from "chess.js"
import { cn } from "@/lib/utils"
import type { CityData } from "@/lib/cities-data"
import { ChessgroundBoard, PiecesSVG } from "./chessground-board"
import { LiveCodeOverlay } from "./live-code-overlay"
import { AudioVisualizer } from "./audio-visualizer"
import { GameControls } from "./game-controls"
import { GameInfo } from "./game-info"
import { SynthControlPanel } from "./synth-control-panel"
import { generateStrudelPattern } from "@/lib/strudel-engine"
import { useAudio } from "@/hooks/use-audio"
import { Button } from "@/components/ui/button"
import type { SquareEffectMap } from "@/lib/types"
import { DEFAULT_EFFECTS } from "@/lib/types"
import { ArrowLeft, Volume2, VolumeX, Settings2, Undo2, Redo2, ThumbsUp, ThumbsDown } from "lucide-react"
import { toast } from "sonner"
import { unlockNextCity } from "@/lib/game-progression"
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
  const [aiDepth, setAiDepth] = useState(10)
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({
    white: [],
    black: [],
  })
  const [activeSquares, setActiveSquares] = useState<Set<string>>(new Set())
  const [synthSelectedSquare, setSynthSelectedSquare] = useState<string | null>(null)
  const [squareEffects, setSquareEffects] = useState<SquareEffectMap>({})
  const [lastEvalScore, setLastEvalScore] = useState<number | null>(null)
  const [lastEvalQuality, setLastEvalQuality] = useState<"good" | "bad" | null>(null)
  const [lastEvalDelta, setLastEvalDelta] = useState<number | null>(null)
 
  const stockfishRef = useRef<Worker | null>(null)
  const gameRef = useRef(game)
  const evalStockfishRef = useRef<Worker | null>(null)
  const evalSideToMoveRef = useRef<"w" | "b">("w")
  const evalLastScoreRef = useRef<number | null>(null)
  const evalPendingRef = useRef(false)
  const lastEvalScoreRef = useRef<number | null>(null)

  const { togglePlayback, playCheckmate, playDrawKalimba, playSquareSample, playIllegalMoveGlitch } = useAudio(game, city, isPlaying, activeSquares, squareEffects)

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
      if (message.startsWith("bestmove")) {
        const moveStr = message.split(" ")[1]
        if (moveStr && moveStr !== "(none)") {
          makeAIMove(moveStr)
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
          const previous = lastEvalScoreRef.current
          setLastEvalScore(finalScore)
          lastEvalScoreRef.current = finalScore
          if (previous == null) {
            setLastEvalDelta(null)
            const quality = finalScore >= 0 ? "good" : "bad"
            setLastEvalQuality(quality)
          } else {
            const delta = finalScore - previous
            setLastEvalDelta(delta)
            const threshold = 30
            let quality: "good" | "bad"
            if (delta >= threshold) {
              quality = "good"
            } else if (delta <= -threshold) {
              quality = "bad"
            } else {
              quality = delta >= 0 ? "good" : "bad"
            }
            setLastEvalQuality(quality)
          }
        }
        evalPendingRef.current = false
      }
    }

    return () => {
      stockfishRef.current?.terminate()
      evalStockfishRef.current?.terminate()
    }
  }, [])

  // Update pattern when board changes
  useEffect(() => {
    const pattern = generateStrudelPattern(game, city, activeSquares, squareEffects)
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
  }, [game, city, activeSquares])

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
      const currentGame = gameRef.current
      
      // Prevent stale moves (e.g. from previous game after reset)
      // If it's White's turn, AI (Black) shouldn't be moving
      if (currentGame.turn() === 'w') {
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
      updateCapturedPieces(move)
      setSynthSelectedSquare(null) // Clear selection on player move

      // Auto-start music on first move
      if (!isPlaying) {
        setIsPlaying(true)
        togglePlayback()
      }

      // Undo to get the clean state, then redo
      const gameCopy = new Chess(game.fen())
      setGame(gameCopy)

      // Trigger AI move
      if (!gameCopy.isGameOver()) {
        setIsThinking(true)
        setTimeout(() => {
          stockfishRef.current?.postMessage(`position fen ${gameCopy.fen()}`)
          stockfishRef.current?.postMessage(`go depth ${aiDepth}`)
        }, 300)
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
      evalSideToMoveRef.current = gameCopy.turn()
      evalLastScoreRef.current = null
      evalPendingRef.current = true
      if (evalStockfishRef.current) {
        evalStockfishRef.current.postMessage("stop")
        evalStockfishRef.current.postMessage(`position fen ${gameCopy.fen()}`)
        evalStockfishRef.current.postMessage("go depth 10")
      }
    },
    [game, aiDepth, updateCapturedPieces, isPlaying, togglePlayback],
  )

  const resetGame = useCallback(() => {
    stockfishRef.current?.postMessage("stop")
    setGame(new Chess())
    setMoveHistory([])
    setRedoStack([])
    setIsThinking(false)
    setCapturedPieces({ white: [], black: [] })
    setActiveSquares(new Set())
    setSynthSelectedSquare(null)
    setSquareEffects({})
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
  }, [moveHistory])

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
    }
  }, [redoStack, game, activeSquares, capturedPieces])

  const handleTogglePlay = useCallback(async () => {
    await togglePlayback()
    setIsPlaying((prev) => !prev)
  }, [togglePlayback])

  const hasStarted = moveHistory.length > 0
  const visualizerClass = "w-full h-16 md:h-24"

  const evalIntensity =
    lastEvalDelta === null ? 0.6 : 0.4 + Math.min(Math.abs(lastEvalDelta) / 100, 1) * 0.6
  const evalIconColor =
    lastEvalQuality === "good"
      ? `rgba(22, 163, 74, ${evalIntensity})`
      : `rgba(220, 38, 38, ${evalIntensity})`
  const evalNumberMagnitude =
    lastEvalDelta === null ? null : Math.min(5, Math.abs(lastEvalDelta) / 100)
  const evalNumberText =
    evalNumberMagnitude === null
      ? ""
      : `${lastEvalDelta! >= 0 ? "+" : "-"}${
          evalNumberMagnitude < 1 ? evalNumberMagnitude.toFixed(1) : Math.round(evalNumberMagnitude).toString()
        }`

  const whiteAdvantage =
    lastEvalScore === null ? 0.5 : 1 / (1 + Math.pow(10, lastEvalScore / 400))
  const whitePercent = Math.round(whiteAdvantage * 100)
  const blackPercent = 100 - whitePercent

  return (
    <div
      className="relative w-full min-h-screen bg-background overflow-hidden"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 20%, ${city.color}08 0%, transparent 40%),
          radial-gradient(circle at 80% 80%, ${city.color}05 0%, transparent 40%)
        `,
      }}
    >
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

      {/* Header */}
      <header 
        className="relative z-20 flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm"
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
              <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground opacity-50">v0.2.1</span>
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
              <DropdownMenuLabel>AI Difficulty</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAiDepth(5)}>Easy (Depth 5)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAiDepth(10)}>Medium (Depth 10)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAiDepth(15)}>Hard (Depth 15)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setAiDepth(20)}>Expert (Depth 20)</DropdownMenuItem>
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

      <div className="flex flex-col lg:flex-row justify-center gap-4 lg:gap-4 px-0 py-4 lg:px-6 lg:py-6 mx-auto">
        {/* Left Panel - Game Info & Controls */}
        <div className="lg:w-64 order-2 lg:order-1 flex flex-col gap-4">
          <div>
            <GameInfo
              moveHistory={moveHistory}
              city={city}
              turn={game.turn()}
              aiDepth={aiDepth}
            />
          </div>
          <GameControls 
            onReset={resetGame}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            cityColor={city.color}
            hasStarted={hasStarted}
            onUndo={undoMove}
            canUndo={moveHistory.length > 0}
            onRedo={redoMove}
            canRedo={redoStack.length > 0}
          />
        </div>

        {/* Main Game Area */}
        <div className="flex flex-col gap-4 order-1 lg:order-2 items-center w-full">
          <div className="w-full max-w-full lg:max-w-[512px] flex flex-col gap-4">
            {/* Synth Control Panel */}
            <SynthControlPanel 
                selectedSquare={synthSelectedSquare as Square | null}
                selectedPieceInfo={(() => {
                  if (!synthSelectedSquare) return null
                  // @ts-ignore
                    const piece = game.get(synthSelectedSquare as Square)
                  if (!piece) return "Empty"
                  
                  const instrumentMap: Record<string, string> = {
                      p: "Drums",
                      n: "Bass",
                      b: "Piano",
                      r: "Pad",
                      q: "Lead",
                      k: "Lead"
                  }
                  
                  const pieceNameMap: Record<string, string> = {
                      p: "Pawn",
                      n: "Knight",
                      b: "Bishop",
                      r: "Rook",
                      q: "Queen",
                      k: "King"
                  }

                  return `${piece.color === "w" ? "White" : "Black"} ${pieceNameMap[piece.type]} - ${instrumentMap[piece.type]}`
                })()}
                effects={synthSelectedSquare ? (squareEffects[synthSelectedSquare] || DEFAULT_EFFECTS) : DEFAULT_EFFECTS}
                onEffectChange={(key, value) => {
                  if (!synthSelectedSquare) return
                  setSquareEffects(prev => ({
                    ...prev,
                    [synthSelectedSquare]: {
                      ...(prev[synthSelectedSquare] || DEFAULT_EFFECTS),
                      [key]: value
                    }
                  }))
                }}
                cityColor={city.color}
              />

            <div className="flex justify-between gap-0.5 min-h-[1rem] w-full">
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

            {/* Chess Board */}
            <div className="flex-1 flex flex-col items-center justify-start min-h-[400px] w-full">
              <div className="w-full aspect-square relative">
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
            </div>

            {lastEvalScore !== null && (
              <div className="flex flex-col items-center w-full mt-2 gap-1">
                <div
                  className="w-full max-w-xs h-2 rounded-full overflow-hidden border"
                  style={{ backgroundColor: "#000000", borderColor: "rgba(255,255,255,0.1)" }}
                >
                  <div
                    className="h-full bg-white/90"
                    style={{ width: `${whitePercent}%` }}
                  />
                </div>
                <div className="flex justify-between w-full max-w-xs text-[10px] font-mono text-muted-foreground">
                  <span>White {whitePercent}%</span>
                  <span>Black {blackPercent}%</span>
                </div>
              </div>
            )}

            <div className="flex w-full items-center mt-2 gap-2 justify-center relative z-50">
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
                  onClick={redoMove}
                  disabled={redoStack.length === 0}
                  className="w-16 h-16 rounded-md transition-all border border-transparent hover:bg-[var(--city-neon)] hover:text-white hover:border-[var(--city-neon)] hover:shadow-[0_0_10px_var(--city-neon)] pointer-events-auto cursor-pointer"
                  style={{ "--city-neon": city.color } as React.CSSProperties}
                >
                  <Redo2 className="w-10 h-10" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Live Code */}
        <div className="lg:w-96 order-3 flex flex-col gap-4 lg:h-[calc(100vh-6rem)]">
           <div className={cn("transition-opacity duration-1000", hasStarted ? "opacity-30 hover:opacity-100" : "")}>
             <div className="w-full h-16 md:h-24">
               <AudioVisualizer isPlaying={isPlaying} color={city.color} pattern={currentPattern} hasStarted={hasStarted} />
             </div>
           </div>
           <div className={cn("flex-1 transition-opacity duration-1000", hasStarted ? "opacity-30 hover:opacity-100" : "")}>
             <LiveCodeOverlay pattern={currentPattern} city={city} isPlaying={isPlaying} />
           </div>
        </div>
      </div>
    </div>
  )
}
