"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CityData } from "@/lib/cities-data"
import { cn } from "@/lib/utils"

interface GameInfoProps {
  moveHistory: string[]
  city: CityData
  turn: "w" | "b"
  aiDepth: number
}

export function GameInfo({ moveHistory, city, turn, aiDepth }: GameInfoProps) {
  const cityColor = city.color
  const hasStarted = moveHistory.length > 0
  
  // Create a box class that handles the fade out
  const boxClass = cn(
    "border border-border rounded-lg transition-all duration-[3000ms]",
    hasStarted ? "bg-transparent border-transparent opacity-30 hover:opacity-100 hover:duration-300" : "bg-card/80 backdrop-blur-sm"
  )
  
  // Box for Genre/BPM/Scale - moved out of Piece > Sound
  const infoBoxClass = boxClass

  return (
    <div className="flex flex-col gap-4">
      {/* Info Box */}
      <div className={infoBoxClass}>
        <div className="px-4 pb-2 pt-4 space-y-4">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">GENRE</span>
              <span style={{ color: cityColor }}>{city.genre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">BPM</span>
              <span style={{ color: cityColor }}>{city.bpm}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SCALE</span>
              <span style={{ color: cityColor }}>{city.scale}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IA Level</span>
              <span style={{ color: cityColor }}>{aiDepth / 5}</span>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-2 border-t border-border/50 pt-2">
            {city.description}
          </div>
        </div>
      </div>

      {/* Legend (Piece -> Sound) */}
      <div className={boxClass}>
        <div className="py-2 px-4 border-b border-border/50">
          <span className="text-xs font-mono text-muted-foreground font-bold">PIECE → SOUND</span>
        </div>
        <div className="px-4 pb-2 pt-2 space-y-4">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">♟ Pawns</span>
              <span style={{ color: cityColor }}>Drums</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">♞ Knights</span>
              <span style={{ color: cityColor }}>Bass</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">♝ Bishops</span>
              <span style={{ color: cityColor }}>Arpeggios</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">♜ Rooks</span>
              <span style={{ color: cityColor }}>Pads</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">♛ Queen</span>
              <span style={{ color: cityColor }}>Lead</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">♚ King (Check)</span>
              <span className="text-destructive">Distortion</span>
            </div>
          </div>
        </div>
      </div>

      {/* Moves box */}
      <div className={boxClass}>
        <div className="py-2 px-4 border-b border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground font-bold">MOVES</span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${turn === "w" ? "animate-pulse" : ""}`}
                style={{ backgroundColor: turn === "w" ? cityColor : "#666" }}
              />
              <span className="text-xs font-mono text-muted-foreground">{turn === "w" ? "WHITE" : "BLACK"}</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-2 pt-2">
          <div className="h-32 overflow-y-auto scrollbar-hide">
            <style jsx global>{`
              .scrollbar-hide::-webkit-scrollbar {
                  display: none;
              }
              .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
              }
            `}</style>
            {moveHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No moves yet. You play white.</p>
            ) : (
              <div className="space-y-1 font-mono text-xs">
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-6">{i + 1}.</span>
                    <span className="w-12" style={{ color: cityColor }}>
                      {moveHistory[i * 2]}
                    </span>
                    <span className="w-12 text-foreground/70">{moveHistory[i * 2 + 1] || ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
