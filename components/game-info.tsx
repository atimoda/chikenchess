"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface GameInfoProps {
  moveHistory: string[]
  capturedPieces: { white: string[]; black: string[] }
  cityColor: string
  turn: "w" | "b"
}

const pieceValues: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
}

const pieceDisplay: Record<string, string> = {
  p: "♟",
  n: "♞",
  b: "♝",
  r: "♜",
  q: "♛",
}

export function GameInfo({ moveHistory, capturedPieces, cityColor, turn }: GameInfoProps) {
  const whiteMaterial = capturedPieces.white.reduce((sum, p) => sum + (pieceValues[p] || 0), 0)
  const blackMaterial = capturedPieces.black.reduce((sum, p) => sum + (pieceValues[p] || 0), 0)
  const materialDiff = whiteMaterial - blackMaterial

  return (
    <div className="space-y-4">
      {/* Material */}
      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs font-mono text-muted-foreground">CAPTURED</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0 space-y-2">
          {/* White captured (black pieces) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">White:</span>
              <span className="text-lg">
                {capturedPieces.white.map((p, i) => (
                  <span key={i} className="text-foreground/80">
                    {pieceDisplay[p]}
                  </span>
                ))}
              </span>
            </div>
            {materialDiff > 0 && (
              <span className="text-xs font-mono" style={{ color: cityColor }}>
                +{materialDiff}
              </span>
            )}
          </div>
          {/* Black captured (white pieces) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Black:</span>
              <span className="text-lg">
                {capturedPieces.black.map((p, i) => (
                  <span key={i} className="text-foreground/40">
                    {pieceDisplay[p]}
                  </span>
                ))}
              </span>
            </div>
            {materialDiff < 0 && <span className="text-xs font-mono text-destructive">+{Math.abs(materialDiff)}</span>}
          </div>
        </CardContent>
      </Card>

      {/* Move History */}
      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-mono text-muted-foreground">MOVES</CardTitle>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${turn === "w" ? "animate-pulse" : ""}`}
                style={{ backgroundColor: turn === "w" ? cityColor : "#666" }}
              />
              <span className="text-xs font-mono text-muted-foreground">{turn === "w" ? "WHITE" : "BLACK"}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <ScrollArea className="h-48">
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
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-border bg-card/80 backdrop-blur-sm">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-xs font-mono text-muted-foreground">PIECE → SOUND</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
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
        </CardContent>
      </Card>
    </div>
  )
}
