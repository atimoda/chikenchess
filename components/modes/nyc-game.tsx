"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Chess, type Move } from "chess.js"
import type { CityData } from "@/lib/cities-data"
import { ChessgroundBoard } from "@/components/chessground-board"
import { ArrowLeft } from "lucide-react"

interface NycGameProps {
  city: CityData
  onBack: () => void
}

export function NycGame({ city, onBack }: NycGameProps) {
  const [game, setGame] = useState(new Chess())
  const [isThinking, setIsThinking] = useState(false)
  const stockfishRef = useRef<Worker | null>(null)
  const gameRef = useRef(game)

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

  const makeAIMove = useCallback((moveStr: string) => {
    const currentGame = gameRef.current
    if (currentGame.turn() === "w") return

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
      }
    } catch (e) {
      console.warn("Failed to apply AI move:", moveStr, e)
    }
  }, [])

  const handleMove = (move: Move) => {
    const newGame = new Chess(game.fen())
    setGame(newGame)
    
    // Trigger AI if game is not over
    if (!newGame.isGameOver()) {
      setIsThinking(true)
      // Small delay to let UI update
      setTimeout(() => {
        stockfishRef.current?.postMessage(`position fen ${newGame.fen()}`)
        stockfishRef.current?.postMessage(`go depth 10`)
      }, 200)
    }
  }

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{
        backgroundColor: "#050015",
        backgroundImage: `
          radial-gradient(circle at 0% 0%, rgba(255,0,128,0.6) 0, transparent 45%),
          radial-gradient(circle at 100% 0%, rgba(0,240,255,0.5) 0, transparent 45%),
          radial-gradient(circle at 50% 100%, rgba(255,207,0,0.6) 0, transparent 55%),
          linear-gradient(135deg, #050015 0%, #12003b 30%, #220044 60%, #050015 100%)
        `,
      }}
    >
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-20">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono text-white/80 hover:text-white px-3 py-1.5 rounded border border-white/20 bg-black/40 hover:bg-black/70 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO MAP
        </button>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/70 uppercase">
            New York City
          </span>
          <span className="text-[9px] font-mono text-white/60">
            Disco / Garage – {city.year}
          </span>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div
          className="w-[140%] h-[40%] absolute bottom-[-10%] left-1/2 -translate-x-1/2"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0 4px, transparent 4px 12px)",
            transform: "perspective(800px) rotateX(65deg)",
            boxShadow: "0 -20px 80px rgba(0,0,0,0.9)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="text-center mb-2">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-white/25 bg-black/50 backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
            <span className="text-[10px] font-mono text-white/80 tracking-[0.2em] uppercase">Pure Chess Mode</span>
          </div>
        </div>

        <div className="w-[min(90vw,512px)] aspect-square rounded-2xl p-[2px] bg-gradient-to-br from-pink-500 via-yellow-300 to-cyan-400 shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          <div className="w-full h-full rounded-2xl bg-black/70 backdrop-blur-sm p-3">
            <ChessgroundBoard game={game} onMove={handleMove} cityColor={city.color} isThinking={isThinking} />
          </div>
        </div>

        <div className="text-[10px] font-mono text-white/70 text-center max-w-xs">No synths – just you, the board and the mirror ball.</div>
      </div>
    </div>
  )
}
