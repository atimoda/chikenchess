"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RotateCcw, Play, Pause, Undo2, Redo2 } from "lucide-react"

interface GameControlsProps {
  onReset: () => void
  onUndo: () => void
  canUndo: boolean
  onRedo: () => void
  canRedo: boolean
  isPlaying: boolean
  onTogglePlay: () => void
  cityColor: string
}

export function GameControls({ onReset, onUndo, canUndo, onRedo, canRedo, isPlaying, onTogglePlay, cityColor }: GameControlsProps) {
  const buttonStyle = {
    "--city-neon": cityColor,
  } as React.CSSProperties

  return (
    <Card className="border-border bg-card/80 backdrop-blur-sm fade-transparency">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center justify-center gap-2 md:gap-3" style={buttonStyle}>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onReset} 
            className="gap-2 bg-transparent hover:bg-transparent hover:text-[var(--city-neon)] hover:border-[var(--city-neon)] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">New Game</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={onUndo} 
            disabled={!canUndo} 
            className="gap-2 bg-transparent hover:bg-transparent hover:text-[var(--city-neon)] hover:border-[var(--city-neon)] transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Undo</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRedo} 
            disabled={!canRedo} 
            className="gap-2 bg-transparent hover:bg-transparent hover:text-[var(--city-neon)] hover:border-[var(--city-neon)] transition-colors"
          >
            <Redo2 className="w-4 h-4" />
            <span className="hidden sm:inline">Redo</span>
          </Button>

          <div className="w-px h-6 bg-border hidden sm:block" />

          <Button 
            variant={isPlaying ? "default" : "outline"} 
            size="sm" 
            onClick={onTogglePlay} 
            className="gap-2 hover:bg-transparent hover:text-[var(--city-neon)] hover:border-[var(--city-neon)] transition-colors"
            style={isPlaying ? { backgroundColor: cityColor, color: 'black', borderColor: cityColor } : {}}
          >
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
