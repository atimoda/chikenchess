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
  const [gameStatus, setGameStatus] = useState<string>("Your move")
  const [aiDepth, setAiDepth] = useState(10)
  const [capturedPieces, setCapturedPieces] = useState<{ white: string[]; black: string[] }>({
    white: [],
    black: [],
  })
  const stockfishRef = useRef<Worker | null>(null)
  const gameRef = useRef(game)

  const { togglePlayback } = useAudio(game, city, isPlaying)

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
    const pattern = generateStrudelPattern(game, city)
    setCurrentPattern(pattern)

    // Update game status
    if (game.isCheckmate()) {
      setGameStatus(game.turn() === "w" ? "CHECKMATE - Black wins!" : "CHECKMATE - White wins!")
      setIsPlaying(false)
    } else if (game.isCheck()) {
      setGameStatus("CHECK!")
    } else if (game.isDraw()) {
      setGameStatus("DRAW!")
    } else if (game.isStalemate()) {
      setGameStatus("STALEMATE!")
    } else {
      setGameStatus(game.turn() === "w" ? "Your move" : "AI analyzing...")
    }
  }, [game, city])

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
      const gameCopy = new Chess(currentGame.fen())
      try {
        const from = moveStr.slice(0, 2)
        const to = moveStr.slice(2, 4)
        const promotion = moveStr.length > 4 ? moveStr[4] : undefined

        const move = gameCopy.move({
          from,
          to,
          promotion,
        })

        if (move) {
          setGame(gameCopy)
          setMoveHistory((prev) => [...prev, move.san])
          updateCapturedPieces(move)
        }
      } catch (e) {
        console.error("Invalid AI move:", moveStr, e)
      }
    },
    [updateCapturedPieces],
  )

  const handlePlayerMove = useCallback(
    (move: Move) => {
      setMoveHistory((prev) => [...prev, move.san])
      updateCapturedPieces(move)

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
    },
    [game, aiDepth, updateCapturedPieces],
  )

  const resetGame = useCallback(() => {
    setGame(new Chess())
    setMoveHistory([])
    setIsThinking(false)
    setCapturedPieces({ white: [], black: [] })
  }, [])

  const undoMove = useCallback(() => {
    if (moveHistory.length < 2) return
    const gameCopy = new Chess(game.fen())
    gameCopy.undo() // Undo AI move
    gameCopy.undo() // Undo player move
    setGame(gameCopy)
    setMoveHistory((prev) => prev.slice(0, -2))
  }, [game, moveHistory])

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
      <header className="relative z-20 flex items-center justify-between px-4 md:px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-mono font-bold text-base md:text-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: city.color }} />
              <span style={{ color: city.color }}>{city.name.toUpperCase()}</span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              {city.genre} • {city.bpm} BPM • {city.year}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Status */}
          <div
            className={`text-xs md:text-sm font-mono px-3 py-1 rounded-full ${
              gameStatus.includes("CHECK") || gameStatus.includes("MATE") ? "animate-pulse" : ""
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
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 p-4 lg:p-6 max-w-[1600px] mx-auto">
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
        <div className="flex-1 flex flex-col gap-4 order-1 lg:order-2">
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
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
          />
        </div>

        {/* Right Panel - Live Code */}
        <div className="lg:w-96 order-3">
          <LiveCodeOverlay pattern={currentPattern} city={city} isPlaying={isPlaying} />
        </div>
      </div>
    </div>
  )
}
