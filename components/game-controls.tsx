"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RotateCcw, Play, Pause, Undo2 } from "lucide-react"

interface GameControlsProps {
  onReset: () => void
  onUndo: () => void
  canUndo: boolean
  isPlaying: boolean
  onTogglePlay: () => void
}

export function GameControls({ onReset, onUndo, canUndo, isPlaying, onTogglePlay }: GameControlsProps) {
  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <Button variant="outline" size="sm" onClick={onReset} className="gap-2 bg-transparent">
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">New Game</span>
          </Button>

          <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} className="gap-2 bg-transparent">
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Undo</span>
          </Button>

          <div className="w-px h-6 bg-border hidden sm:block" />

          <Button variant={isPlaying ? "default" : "outline"} size="sm" onClick={onTogglePlay} className="gap-2">
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span className="hidden sm:inline">Pause Audio</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">Play Audio</span>
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
