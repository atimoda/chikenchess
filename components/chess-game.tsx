"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Chess, type Move } from "chess.js"
import type { CityData } from "@/lib/cities-data"
import { ChessgroundBoard } from "./chessground-board"
import { LiveCodeOverlay } from "./live-code-overlay"
import { AudioVisualizer } from "./audio-visualizer"
import { GameControls } from "./game-controls"
import { GameInfo } from "./game-info"
import { generateStrudelPattern } from "@/lib/strudel-engine"
import { useAudio } from "@/hooks/use-audio"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Volume2, VolumeX, Settings2 } from "lucide-react"
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
  const stockfishRef = useRef<Worker | null>(null)
  const gameRef = useRef(game)

  const { togglePlayback, playCheckmate } = useAudio(game, city, isPlaying, activeSquares)

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
      const message = event.data
      if (message.startsWith("bestmove")) {
        const moveStr = message.split(" ")[1]
        if (moveStr && moveStr !== "(none)") {
          makeAIMove(moveStr)
        }
        setIsThinking(false)
      }
    }

    return () => {
      stockfishRef.current?.terminate()
    }
  }, [])

  // Update pattern when board changes
  useEffect(() => {
    const pattern = generateStrudelPattern(game, city, activeSquares)
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
    } else if (game.isCheck()) {
      setGameStatus("CHECK!")
    } else if (game.isDraw()) {
      setGameStatus("DRAW!")
    } else if (game.isStalemate()) {
      setGameStatus("STALEMATE!")
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
        // Handle castling
        if (move.san === "O-O" || move.san === "O-O-O") {
          if (move.to === "g1") { next.delete("h1"); next.add("f1"); } // White Kingside
          if (move.to === "c1") { next.delete("a1"); next.add("d1"); } // White Queenside
        }
        return next
      })
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
  }, [])

  const undoMove = useCallback(() => {
    if (moveHistory.length < 2) return

    // Replay game from start to get correct state
    const newGame = new Chess()
    const newHistory = moveHistory.slice(0, -2) // Remove last 2 moves (Player + AI)
    const newCapturedPieces: { white: string[], black: string[] } = { white: [], black: [] }
    const newActiveSquares = new Set<string>()

    // Replay all moves to rebuild state
    newHistory.forEach(san => {
      const move = newGame.move(san)
      if (move) {
        // Update captured
        if (move.captured) {
          if (move.color === "w") newCapturedPieces.white.push(move.captured)
          else newCapturedPieces.black.push(move.captured)
        }

        // Update active squares
        newActiveSquares.delete(move.from)
        newActiveSquares.add(move.to)
        // Handle castling
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

    // Save undone moves to stack
    const movesToUndo = moveHistory.slice(-2)
    setRedoStack(prev => [...prev, ...movesToUndo])

    setGame(newGame)
    setMoveHistory(newHistory)
    setCapturedPieces(newCapturedPieces as { white: string[], black: string[] })
    setActiveSquares(newActiveSquares)
  }, [moveHistory])

  const redoMove = useCallback(() => {
    if (redoStack.length < 2) return

    // Redo last 2 moves
    const movesToRedo = redoStack.slice(-2)
    const newRedoStack = redoStack.slice(0, -2)

    // Apply moves to current game state (which is 'game')
    // We need to mutate a copy to set state
    const gameCopy = new Chess(game.fen())

    // We need to track captured pieces and active squares incrementally
    const nextCaptured = { white: [...capturedPieces.white], black: [...capturedPieces.black] }
    const nextActiveSquares = new Set(activeSquares)

    movesToRedo.forEach(san => {
      const move = gameCopy.move(san)
      if (move) {
        // Update captured
        if (move.captured) {
          if (move.color === "w") nextCaptured.white.push(move.captured)
          else nextCaptured.black.push(move.captured)
        }
        // Update active squares
        nextActiveSquares.delete(move.from)
        nextActiveSquares.add(move.to)
        // Handle castling
        if (move.san === "O-O" || move.san === "O-O-O") {
          if (move.color === 'w') {
            if (move.to === "g1") { nextActiveSquares.delete("h1"); nextActiveSquares.add("f1"); }
            if (move.to === "c1") { nextActiveSquares.delete("a1"); nextActiveSquares.add("d1"); }
          } else {
            if (move.to === "g8") { nextActiveSquares.delete("h8"); nextActiveSquares.add("f8"); }
            if (move.to === "c8") { nextActiveSquares.delete("a8"); nextActiveSquares.add("d8"); }
          }
        }
      }
    })

    setGame(gameCopy)
    setMoveHistory(prev => [...prev, ...movesToRedo])
    setRedoStack(newRedoStack)
    setCapturedPieces(nextCaptured)
    setActiveSquares(nextActiveSquares)
  }, [redoStack, game, activeSquares, capturedPieces])

  const handleTogglePlay = useCallback(async () => {
    await togglePlayback()
    setIsPlaying((prev) => !prev)
  }, [togglePlayback])

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
              <span className="text-[10px] text-muted-foreground opacity-50">Audio Engine: Strudel.cc</span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {city.genre} • {city.bpm} BPM • Lvl {aiDepth / 5}
            </p>
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
              <Button variant="outline" size="icon" className="hidden md:flex bg-transparent">
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
          <Button variant="outline" size="icon" onClick={handleTogglePlay}>
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

      <div className="flex flex-col lg:flex-row justify-center gap-4 lg:gap-8 p-4 lg:p-6 mx-auto">
        {/* Left Panel - Game Info */}
        <div className="lg:w-64 order-2 lg:order-1">
          <GameInfo
            moveHistory={moveHistory}
            capturedPieces={capturedPieces}
            cityColor={city.color}
            turn={game.turn()}
          />
        </div>

        {/* Main Game Area */}
        <div className="flex flex-col gap-4 order-1 lg:order-2 items-center shrink-0">
          <div className="w-full max-w-[calc(8*3rem)] sm:max-w-[calc(8*3.5rem)] md:max-w-[calc(8*4rem)] flex flex-col gap-4">
            {/* Audio Visualizer */}
            <AudioVisualizer isPlaying={isPlaying} color={city.color} pattern={currentPattern} />

            {/* Chess Board */}
            <div className="flex justify-center">
              <ChessgroundBoard game={game} onMove={handlePlayerMove} cityColor={city.color} isThinking={isThinking} />
            </div>

            {/* Game Controls */}
            <GameControls
              onReset={resetGame}
              onUndo={undoMove}
              canUndo={moveHistory.length >= 2 && !isThinking}
              onRedo={redoMove}
              canRedo={redoStack.length >= 2 && !isThinking}
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              cityColor={city.color}
            />
          </div>
        </div>

        {/* Right Panel - Live Code */}
        <div className="lg:w-96 order-3">
          <LiveCodeOverlay pattern={currentPattern} city={city} isPlaying={isPlaying} />
        </div>
      </div>
    </div>
  )
}
